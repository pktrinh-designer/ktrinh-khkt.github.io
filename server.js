const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const callGemini = require("./gemini");
const {
  initializeFirebaseAdmin,
  verifyIdToken,
  getFirestore,
} = require("./firebase-admin");

const {
  startQuiz,
  gradeQuiz,
  markQuizSubmitted,
  releaseQuizSubmission,
} = require("./quiz-service");

const { FieldValue } = require("firebase-admin/firestore");

// Cấu hình máy chủ, giới hạn yêu cầu, giới hạn tốc độ và kiểu MIME.
const PROJECT_ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_MESSAGE_LENGTH = 1200;
const requestsByAddress = new Map();
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60 * 1000;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

// Đọc khóa Gemini từ biến môi trường hoặc tệp .env cục bộ.
function loadApiKey() {
  if (process.env.GEMINI_API_KEY) {
    return;
  }

  const envPath = path.join(PROJECT_ROOT, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const entry = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((line) => /^\s*(?:export\s+)?GEMINI_API_KEY\s*=/.test(line));

  if (!entry) {
    return;
  }

  let value = entry
    .replace(/^\s*(?:export\s+)?GEMINI_API_KEY\s*=\s*/, "")
    .trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  if (value) {
    process.env.GEMINI_API_KEY = value;
  }
}

// Gửi phản hồi JSON với các header bảo mật cơ bản.
function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}
// Xác thực người dùng bằng Firebase ID Token.
async function authenticateUser(request) {
  const authorization = request.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    const error = new Error("Bạn cần đăng nhập để làm bài.");
    error.statusCode = 401;
    throw error;
  }

  const idToken = authorization.slice(7).trim();

  if (!idToken) {
    const error = new Error("Firebase ID Token không hợp lệ.");
    error.statusCode = 401;
    throw error;
  }

  return await verifyIdToken(idToken);
}
// API bắt đầu bài kiểm tra.
async function handleQuizStart(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, {
      error: "Phương thức gửi không được hỗ trợ.",
    });
    return;
  }

  let user;
  let payload;

  try {
    user = await authenticateUser(request);
    payload = await readJsonBody(request);

    const quiz = startQuiz({
      uid: user.uid,
      type: payload.type,
      id: payload.id,
    });

    sendJson(response, 200, quiz);
  } catch (error) {
    console.error("Quiz start failed:", error.message);

    sendJson(response, error.statusCode || 400, {
      error: error.message || "Không thể bắt đầu bài kiểm tra.",
    });
  }
}
// Xác định chương tương ứng với bài học.
function getChapterIdFromLesson(lessonId) {
  const id = Number(lessonId);

  if (id >= 1 && id <= 5) return "chuong-1";
  if (id >= 6 && id <= 10) return "chuong-2";
  if (id >= 11 && id <= 13) return "chuong-3";
  if (id >= 14 && id <= 17) return "chuong-4";
  if (id >= 18 && id <= 20) return "chuong-5";

  throw new Error("Mã bài học không hợp lệ.");
}
// API nhận bài, chấm điểm và lưu tiến độ học tập.
// API nhận bài, chấm điểm và lưu tiến độ học tập.
async function handleQuizSubmit(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, {
      error: "Phương thức gửi không được hỗ trợ.",
    });
    return;
  }

  let submissionUid = null;
  let submissionQuizId = null;
  let submissionLocked = false;

  try {
    // 1. Xác thực người dùng.
    const user = await authenticateUser(request);

    // 2. Nhận dữ liệu bài làm.
    const payload = await readJsonBody(request);

    if (
      !payload ||
      typeof payload.quizId !== "string" ||
      !Array.isArray(payload.answers)
    ) {
      sendJson(response, 400, {
        error: "Dữ liệu bài làm không hợp lệ.",
      });
      return;
    }

    // 3. Chấm điểm bằng Backend.
    const result = gradeQuiz({
      uid: user.uid,
      quizId: payload.quizId,
      answers: payload.answers,
    });

    submissionUid = user.uid;
    submissionQuizId = payload.quizId;
    submissionLocked = true;

    // 4. Lưu tiến độ nếu đạt yêu cầu bài học.
    if (result.type === "lesson") {
      const requiredScore = Math.ceil(result.totalQuestions * 0.8);

      if (result.score >= requiredScore) {
        const db = getFirestore();

        const lessonId = String(result.lessonId);
        const chapterId = getChapterIdFromLesson(lessonId);

        await db
          .collection("users")
          .doc(user.uid)
          .collection("learningProgress")
          .doc(lessonId)
          .set(
            {
              lessonId,
              chapterId,
              status: "completed",
              score: result.score,
              totalQuestions: result.totalQuestions,
              completedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      }
    }

    // 5. Xác nhận đã nộp sau khi xử lý thành công.
    markQuizSubmitted({
      uid: user.uid,
      quizId: payload.quizId,
    });

    submissionLocked = false;

    sendJson(response, 200, {
      success: true,
      ...result,
    });
  } catch (error) {
    // Nếu xử lý thất bại, mở khóa để người dùng thử lại.
    if (submissionLocked) {
      releaseQuizSubmission({
        uid: submissionUid,
        quizId: submissionQuizId,
      });
    }

    console.error("Quiz submit failed:", error.message);

    sendJson(response, error.statusCode || 400, {
      error: error.message || "Không thể nộp bài kiểm tra.",
    });
  }
}

// Đọc phần thân yêu cầu, giới hạn dung lượng và phân tích JSON.
async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;

    if (size > MAX_REQUEST_BYTES) {
      const error = new Error("Yêu cầu quá lớn.");
      error.statusCode = 413;
      throw error;
    }

    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Dữ liệu gửi lên không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }
}

// Giới hạn số lần gửi câu hỏi theo địa chỉ trong một khoảng thời gian.
function allowRequest(address) {
  const now = Date.now();
  const recentTimes = (requestsByAddress.get(address) || []).filter(
    (timestamp) => now - timestamp < RATE_WINDOW_MS,
  );

  if (recentTimes.length >= RATE_LIMIT) {
    return false;
  }

  recentTimes.push(now);
  requestsByAddress.set(address, recentTimes);
  return true;
}

// Kiểm tra cấu trúc, thứ tự vai trò và độ dài lịch sử chat.
function validateHistory(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) {
    return null;
  }

  const history = [];

  for (let index = 0; index < value.length; index += 1) {
    const message = value[index];
    const expectedRole = index % 2 === 0 ? "user" : "model";

    if (
      !message ||
      message.role !== expectedRole ||
      typeof message.text !== "string" ||
      !message.text.trim() ||
      message.text.length > MAX_MESSAGE_LENGTH
    ) {
      return null;
    }

    history.push({ role: message.role, text: message.text.trim() });
  }

  return history[history.length - 1].role === "user" ? history : null;
}

// Xác thực yêu cầu chat rồi chuyển tiếp nội dung tới Gemini.
async function handleChat(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Phương thức gửi không được hỗ trợ." });
    return;
  }

  const origin = request.headers.origin;

  if (origin) {
    try {
      const originUrl = new URL(origin);
      const forwardedProto = (request.headers["x-forwarded-proto"] || "http")
        .split(",")[0]
        .trim();

      const validProtocol =
        forwardedProto === "https" || forwardedProto === "http";

      if (
        !validProtocol ||
        originUrl.host !== request.headers.host ||
        originUrl.protocol !== `${forwardedProto}:`
      ) {
        sendJson(response, 403, {
          error: "Nguồn gửi yêu cầu không được phép.",
        });
        return;
      }
    } catch (error) {
      sendJson(response, 403, {
        error: "Nguồn gửi yêu cầu không hợp lệ.",
      });
      return;
    }
  }

  if (!allowRequest(request.socket.remoteAddress || "local")) {
    sendJson(response, 429, {
      error: "Bạn gửi câu hỏi quá nhanh. Hãy chờ một phút rồi thử lại.",
    });
    return;
  }

  let payload;

  try {
    payload = await readJsonBody(request);
  } catch (error) {
    sendJson(response, error.statusCode || 400, { error: error.message });
    return;
  }

  const history = validateHistory(payload && payload.history);

  if (!history) {
    sendJson(response, 400, {
      error: "Lịch sử hội thoại không hợp lệ. Hãy gửi một câu hỏi rồi thử lại.",
    });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    sendJson(response, 503, {
      error: "Máy chủ chưa được cấu hình GEMINI_API_KEY trong tệp .env.",
    });
    return;
  }

  try {
    const reply = await callGemini(
      history.map(({ role, text }) => ({
        role,
        parts: [{ text }],
      })),
    );
    sendJson(response, 200, { reply });
  } catch (error) {
    console.error("Gemini chat request failed:", error.message);
    sendJson(response, 502, {
      error: "Gemini chưa trả lời được. Hãy kiểm tra API key hoặc thử lại sau.",
    });
  }
}

// Phục vụ tệp HTML, CSS và JavaScript từ các thư mục cho phép.

function serveStatic(request, response, pathname) {
  let requestedPath;

  if (pathname === "/") {
    requestedPath = "/html/trangtieude.html";
  } else if (
    pathname.startsWith("/css/") ||
    pathname.startsWith("/js/") ||
    pathname.startsWith("/html/")
  ) {
    requestedPath = pathname;
  } else {
    requestedPath = `/html${pathname}`;
  }

  const filePath = path.resolve(PROJECT_ROOT, `.${requestedPath}`);
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  const topLevelDirectory = relativePath.split(path.sep)[0];

  if (
    path.isAbsolute(relativePath) ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    !["html", "css", "js"].includes(topLevelDirectory)
  ) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()];

    if (!contentType) {
      response.writeHead(415);
      response.end("Unsupported media type");
      return;
    }

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Length": stats.size,
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    const stream = fs.createReadStream(filePath);

    stream.on("error", (error) => {
      console.error("Static file read failed:", error.message);

      if (!response.headersSent) {
        response.writeHead(500);
      }

      response.end("Unable to read file");
    });

    stream.pipe(response);
  });
}

// Bộ định tuyến HTTP: xử lý API chat, chuyển hướng và tệp tĩnh.
const server = http.createServer((request, response) => {
  let pathname;

  try {
    pathname = decodeURIComponent(
      new URL(request.url, `http://${HOST}:${PORT}`).pathname,
    );
  } catch {
    response.writeHead(400);
    response.end("Invalid request path");
    return;
  }

  if (pathname === "/api/chat") {
    handleChat(request, response).catch((error) => {
      console.error("Chat request failed:", error.message);
      sendJson(response, 500, {
        error: "Đã xảy ra lỗi khi xử lí câu hỏi. Hãy thử lại.",
      });
    });
    return;
  }
  // API bắt đầu bài kiểm tra.
  async function handleQuizStart(request, response) {
    if (request.method !== "POST") {
      sendJson(response, 405, {
        error: "Phương thức gửi không được hỗ trợ.",
      });
      return;
    }

    try {
      const user = await authenticateUser(request);
      const payload = await readJsonBody(request);

      // Chờ Firestore lưu phiên kiểm tra.
      const quiz = await startQuiz({
        uid: user.uid,
        type: payload.type,
        id: payload.id,
      });

      sendJson(response, 200, quiz);
    } catch (error) {
      console.error("Quiz start failed:", error.message);

      sendJson(response, error.statusCode || 400, {
        error: error.message || "Không thể bắt đầu bài kiểm tra.",
      });
    }
  }

  // API nhận bài, chấm điểm và lưu tiến độ học tập.
  async function handleQuizSubmit(request, response) {
    if (request.method !== "POST") {
      sendJson(response, 405, {
        error: "Phương thức gửi không được hỗ trợ.",
      });
      return;
    }

    let submissionUid = null;
    let submissionQuizId = null;
    let submissionLocked = false;

    try {
      // 1. Xác thực người dùng.
      const user = await authenticateUser(request);

      // 2. Nhận dữ liệu bài làm.
      const payload = await readJsonBody(request);

      if (
        !payload ||
        typeof payload.quizId !== "string" ||
        !Array.isArray(payload.answers)
      ) {
        sendJson(response, 400, {
          error: "Dữ liệu bài làm không hợp lệ.",
        });
        return;
      }

      // 3. Chấm điểm bằng Backend và khóa phiên trong Firestore.
      const result = await gradeQuiz({
        uid: user.uid,
        quizId: payload.quizId,
        answers: payload.answers,
      });

      submissionUid = user.uid;
      submissionQuizId = payload.quizId;
      submissionLocked = true;

      // 4. Lưu tiến độ nếu đạt yêu cầu bài học.
      if (result.type === "lesson") {
        const requiredScore = Math.ceil(result.totalQuestions * 0.8);

        if (result.score >= requiredScore) {
          const db = getFirestore();

          const lessonId = String(result.lessonId);
          const chapterId = getChapterIdFromLesson(lessonId);

          await db
            .collection("users")
            .doc(user.uid)
            .collection("learningProgress")
            .doc(lessonId)
            .set(
              {
                lessonId,
                chapterId,
                status: "completed",
                score: result.score,
                totalQuestions: result.totalQuestions,
                completedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
        }
      }

      // 5. Xác nhận đã nộp sau khi xử lý thành công.
      await markQuizSubmitted({
        uid: user.uid,
        quizId: payload.quizId,
      });

      submissionLocked = false;

      sendJson(response, 200, {
        success: true,
        ...result,
      });
    } catch (error) {
      // Nếu xử lý thất bại, thử mở khóa phiên trong Firestore.
      if (submissionLocked) {
        try {
          await releaseQuizSubmission({
            uid: submissionUid,
            quizId: submissionQuizId,
          });
        } catch (releaseError) {
          console.error("Quiz unlock failed:", releaseError.message);
        }
      }

      console.error("Quiz submit failed:", error.message);

      sendJson(response, error.statusCode || 400, {
        error: error.message || "Không thể nộp bài kiểm tra.",
      });
    }
  }
  if (/^\/[^/]+\.html$/i.test(pathname)) {
    response.writeHead(302, { Location: `/html${pathname}` });
    response.end();
    return;
  }

  serveStatic(request, response, pathname);
});

// Nạp khóa trước khi máy chủ bắt đầu nhận kết nối.
loadApiKey();

// Khởi tạo Firebase Admin nếu môi trường đã được cấu hình.
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  initializeFirebaseAdmin();
  console.log("Firebase Admin initialized successfully");
} else {
  console.warn(
    "FIREBASE_SERVICE_ACCOUNT is not set. Firebase Admin is disabled.",
  );
}

if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  throw new Error("PORT must be an integer between 1024 and 65535.");
}

// Khởi động máy chủ tại địa chỉ và cổng đã cấu hình.
server.listen(PORT, HOST, () => {
  console.log(`Server is running on port ${PORT}`);
});
