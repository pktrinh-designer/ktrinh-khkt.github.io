const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");
const callGemini = require("./gemini");
const {
  setTeacherAdminRole,
  initializeFirebaseAdmin,
  verifyIdToken,
  verifyAdminToken,
  verifyTeacherAdminToken,
  verifyTeacherClassAccess,
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
const ALLOWED_FRONTEND_ORIGINS = new Set([
  "https://congnghe8.com",
  "https://www.congnghe8.com",
  "https://pktrinh-designer.github.io",
  "https://ktrinh-khkt-github-io-1.onrender.com",
  "http://localhost:3000",
]);
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

// Đọc khóa Gemini từ biến môi trường hoặc tệp .env cục bộ.
function loadEnvironment() {
  const envPath = path.join(PROJECT_ROOT, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    let value = trimmedLine.slice(separatorIndex + 1).trim();

    if (!["GEMINI_API_KEY", "FIREBASE_SERVICE_ACCOUNT"].includes(key)) {
      continue;
    }

    if (process.env[key]) {
      continue;
    }

    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
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

// Xác thực quyền School Admin hoặc Teacher Admin đối với một lớp.
async function authorizeClassManagement(request, classId) {
  const user = await authenticateUser(request);

  // School Admin được quản lý tất cả lớp.
  if (user.roleId === 1) {
    await verifyAdminToken(request.headers.authorization.slice(7).trim());

    return user;
  }

  // Teacher Admin chỉ quản lý lớp được phân công.
  if (user.roleId === 3) {
    await verifyTeacherAdminToken(
      request.headers.authorization.slice(7).trim(),
    );

    await verifyTeacherClassAccess(user.uid, classId);

    return user;
  }

  const error = new Error("Bạn không có quyền quản lý lớp học.");
  error.statusCode = 403;
  throw error;
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
    // 1. Xác thực người dùng bằng Firebase ID Token.
    const user = await authenticateUser(request);

    // Nhận diện Guest từ token đã được Firebase xác minh.
    const isGuest = user.firebase?.sign_in_provider === "anonymous";

    // 2. Nhận dữ liệu bài làm.
    const payload = await readJsonBody(request);

    if (
      !payload ||
      typeof payload.quizId !== "string" ||
      !Array.isArray(payload.answers) ||
      (!isGuest &&
        (typeof payload.examResultId !== "string" || !payload.examResultId))
    ) {
      sendJson(response, 400, {
        error: "Dữ liệu bài làm không hợp lệ.",
      });
      return;
    }

    const db = getFirestore();
    let examResultRef = null;

    // 3. Chỉ xác minh lịch sử đối với tài khoản học sinh.
    if (!isGuest) {
      examResultRef = db
        .collection("users")
        .doc(user.uid)
        .collection("examResults")
        .doc(payload.examResultId);

      const examSnapshot = await examResultRef.get();

      if (
        !examSnapshot.exists ||
        examSnapshot.data().quizId !== payload.quizId ||
        examSnapshot.data().status !== "in_progress"
      ) {
        sendJson(response, 403, {
          error: "Không tìm thấy lượt kiểm tra hợp lệ.",
        });
        return;
      }
    }

    // 4. Chấm điểm bằng Backend cho cả hai loại tài khoản.
    const result = await gradeQuiz({
      uid: user.uid,
      quizId: payload.quizId,
      answers: payload.answers,
    });

    submissionUid = user.uid;
    submissionQuizId = payload.quizId;
    submissionLocked = true;

    // 5. Chỉ lưu tiến độ bài học cho tài khoản không phải Guest.
    if (!isGuest && result.type === "lesson") {
      const requiredScore = Math.ceil(result.totalQuestions * 0.8);

      if (result.score >= requiredScore) {
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

    // 6. Xác nhận phiên kiểm tra đã nộp.
    await markQuizSubmitted({
      uid: user.uid,
      quizId: payload.quizId,
    });

    submissionLocked = false;

    // 7. Chỉ lưu lịch sử cho tài khoản học sinh.
    const percentage = Math.round((result.score / result.totalQuestions) * 100);

    if (!isGuest) {
      await examResultRef.update({
        score: result.score,
        answered: payload.answers.length,
        percentage,
        status: "submitted",
        submittedAt: FieldValue.serverTimestamp(),
        endedAt: FieldValue.serverTimestamp(),
      });
    }

    // 8. Guest chỉ nhận kết quả đúng/sai và đáp án đúng.
    if (isGuest) {
      const guestResults = result.results.map((item) => ({
        questionId: item.questionId,
        selectedAnswer: item.selectedAnswer,
        correctAnswer: item.correctAnswer,
        correctLabel: item.correctLabel,
        isCorrect: item.isCorrect,
      }));

      sendJson(response, 200, {
        success: true,
        historySaved: false,
        guestMode: true,
        quizId: result.quizId,
        type: result.type,
        score: result.score,
        totalQuestions: result.totalQuestions,
        results: guestResults,
      });

      return;
    }

    // Tài khoản học sinh tiếp tục nhận đầy đủ lời giải.
    sendJson(response, 200, {
      success: true,
      historySaved: true,
      ...result,
    });
  } catch (error) {
    // Nếu thất bại trước khi xác nhận nộp,
    // mở khóa phiên để người dùng có thể thử lại.
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

    history.push({
      role: message.role,
      text: message.text.trim(),
    });
  }

  return history;
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
    requestedPath = "/html/dangnhap.html";
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

// API xác minh phiên đăng nhập Admin.
async function handleAdminSession(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      error: "Phương thức gửi không được hỗ trợ.",
    });
    return;
  }

  try {
    const authorization = request.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      sendJson(response, 401, {
        error: "Bạn cần đăng nhập Admin.",
      });
      return;
    }

    const idToken = authorization.slice(7).trim();
    const adminUser = await verifyAdminToken(idToken);

    sendJson(response, 200, {
      success: true,
      roleId: 1,
      uid: adminUser.uid,
    });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "Không thể xác minh quyền Admin.",
    });
  }
}

// API xác minh phiên đăng nhập Teacher Admin.
async function handleTeacherSession(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      error: "Phương thức gửi không được hỗ trợ.",
    });
    return;
  }

  try {
    const authorization = request.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      sendJson(response, 401, {
        error: "Bạn cần đăng nhập tài khoản giáo viên.",
      });
      return;
    }

    const idToken = authorization.slice(7).trim();

    const teacherUser = await verifyTeacherAdminToken(idToken);

    sendJson(response, 200, {
      success: true,
      roleId: 3,
      uid: teacherUser.uid,
    });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "Không thể xác minh quyền giáo viên.",
    });
  }
}

// Thống kê tổng quan dành riêng cho School Admin.
async function handleAdminStats(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      error: "Phương thức gửi không được hỗ trợ.",
    });
    return;
  }

  try {
    const authorization = request.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      sendJson(response, 401, {
        error: "Bạn cần đăng nhập Admin.",
      });
      return;
    }

    const idToken = authorization.slice(7).trim();
    await verifyAdminToken(idToken);

    const db = getFirestore();

    const [
      studentsSnapshot,
      teachersSnapshot,
      classesSnapshot,
      submittedSnapshot,
    ] = await Promise.all([
      db.collection("users").where("roleId", "==", 2).get(),
      db.collection("teachers").get(),
      db.collection("classes").get(),
      db.collection("quizSessions").where("submitted", "==", true).get(),
    ]);

    // Đếm số bài khác nhau mỗi học sinh đã hoàn thành.
    const completedQuizKeys = new Set();

    submittedSnapshot.forEach((doc) => {
      const quiz = doc.data();

      let quizKey;

      if (quiz.type === "lesson" && quiz.lessonId) {
        quizKey = `lesson:${quiz.lessonId}`;
      } else if (quiz.type === "chapter" && quiz.chapterId) {
        quizKey = `chapter:${quiz.chapterId}`;
      } else if (quiz.type === "overall") {
        quizKey = "overall";
      } else {
        return;
      }

      completedQuizKeys.add(`${quiz.uid}:${quizKey}`);
    });

    sendJson(response, 200, {
      success: true,
      stats: {
        students: studentsSnapshot.size,
        teachers: teachersSnapshot.size,
        classes: classesSnapshot.size,
        completedQuizzes: completedQuizKeys.size,
        quizAttempts: submittedSnapshot.size,
      },
    });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "Không thể tải thống kê.",
    });
  }
}

// School Admin lấy danh sách học sinh toàn trường.
async function handleAdminStudents(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      error: "Phương thức gửi không được hỗ trợ.",
    });
    return;
  }

  try {
    const authorization = request.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      sendJson(response, 401, {
        error: "Bạn cần đăng nhập Admin.",
      });
      return;
    }

    const idToken = authorization.slice(7).trim();

    // Chỉ School Admin được xem danh sách toàn trường.
    await verifyAdminToken(idToken);

    const db = getFirestore();

    const snapshot = await db
      .collection("users")
      .where("roleId", "==", 2)
      .get();

    const students = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        uid: doc.id,
        email: data.email || "",
        classId: data.classId || "",
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : null,
      };
    });

    sendJson(response, 200, {
      success: true,
      total: students.length,
      students,
    });
  } catch (error) {
    console.error("Admin students failed:", error.message);

    sendJson(response, error.statusCode || 500, {
      error: error.message || "Không thể tải danh sách học sinh.",
    });
  }
}

// Lấy danh sách lớp theo quyền quản trị.
async function handleAdminClasses(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      error: "Phương thức gửi không được hỗ trợ.",
    });
    return;
  }

  try {
    const authorization = request.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      sendJson(response, 401, {
        error: "Bạn cần đăng nhập.",
      });
      return;
    }

    const idToken = authorization.slice(7).trim();
    const user = await verifyIdToken(idToken);
    const db = getFirestore();

    let classes = [];

    // School Admin xem toàn bộ lớp.
    if (user.roleId === 1) {
      await verifyAdminToken(idToken);

      const snapshot = await db.collection("classes").get();

      classes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    // Teacher Admin chỉ xem lớp được phân công.
    else if (user.roleId === 3) {
      await verifyTeacherAdminToken(idToken);

      const snapshot = await db
        .collectionGroup("teachers")
        .where("teacherUid", "==", user.uid)
        .get();

      const classIds = [
        ...new Set(snapshot.docs.map((doc) => doc.ref.parent.parent.id)),
      ];

      const classDocs = await Promise.all(
        classIds.map((id) => db.collection("classes").doc(id).get()),
      );

      classes = classDocs
        .filter((doc) => doc.exists)
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
    } else {
      sendJson(response, 403, {
        error: "Bạn không có quyền xem danh sách lớp.",
      });
      return;
    }

    sendJson(response, 200, {
      success: true,
      classes,
    });
  } catch (error) {
    console.error("Admin classes failed:", error.message);

    sendJson(response, error.statusCode || 500, {
      error: error.message || "Không thể tải danh sách lớp.",
    });
  }
}
// School Admin phân công Teacher Admin vào lớp.
async function handleAdminAssignTeacher(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, {
      error: "Phương thức gửi không được hỗ trợ.",
    });
    return;
  }

  try {
    const authorization = request.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      sendJson(response, 401, {
        error: "Bạn cần đăng nhập.",
      });
      return;
    }

    const idToken = authorization.slice(7).trim();

    // Chỉ School Admin được phân công giáo viên.
    await verifyAdminToken(idToken);

    const payload = await readJsonBody(request);
    const { classId, teacherUid } = payload || {};

    if (
      typeof classId !== "string" ||
      !classId.trim() ||
      typeof teacherUid !== "string" ||
      !teacherUid.trim()
    ) {
      sendJson(response, 400, {
        error: "Thiếu classId hoặc teacherUid.",
      });
      return;
    }

    const db = getFirestore();

    // Kiểm tra lớp có tồn tại.
    const classRef = db.collection("classes").doc(classId);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      sendJson(response, 404, {
        error: "Không tìm thấy lớp học.",
      });
      return;
    }

    // Kiểm tra hồ sơ giáo viên có tồn tại.
    const teacherDoc = await db.collection("teachers").doc(teacherUid).get();

    if (!teacherDoc.exists) {
      sendJson(response, 404, {
        error: "Không tìm thấy hồ sơ giáo viên.",
      });
      return;
    }

    // Tạo quan hệ phân công giáo viên - lớp.
    await classRef.collection("teachers").doc(teacherUid).set({
      teacherUid,
      assignedAt: FieldValue.serverTimestamp(),
    });

    sendJson(response, 200, {
      success: true,
      message: "Đã phân công giáo viên vào lớp.",
      classId,
      teacherUid,
    });
  } catch (error) {
    console.error("Assign teacher failed:", error.message);

    sendJson(response, error.statusCode || 500, {
      error: error.message || "Không thể phân công giáo viên.",
    });
  }
}

// School Admin tạo hồ sơ và cấp quyền Teacher Admin.
async function handleAdminCreateTeacher(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, {
      error: "Phương thức gửi không được hỗ trợ.",
    });
    return;
  }

  try {
    const authorization = request.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      sendJson(response, 401, {
        error: "Bạn cần đăng nhập.",
      });
      return;
    }

    const idToken = authorization.slice(7).trim();

    // Chỉ School Admin được tạo hồ sơ giáo viên.
    await verifyAdminToken(idToken);

    const payload = await readJsonBody(request);
    const { teacherUid, name, subject } = payload || {};

    if (
      typeof teacherUid !== "string" ||
      !teacherUid.trim() ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof subject !== "string" ||
      !subject.trim()
    ) {
      sendJson(response, 400, {
        error: "Vui lòng cung cấp UID, tên và môn học.",
      });
      return;
    }

    const db = getFirestore();

    // Xác minh tài khoản Firebase Authentication và cấp roleId = 3.
    await setTeacherAdminRole(teacherUid);

    // Tạo hồ sơ giáo viên.
    const batch = db.batch();

    batch.set(db.collection("teachers").doc(teacherUid), {
      teacherUid,
      name: name.trim(),
      subject: subject.trim(),
      createdAt: FieldValue.serverTimestamp(),
    });

    // Lưu roleId trong hồ sơ người dùng.
    batch.set(
      db.collection("users").doc(teacherUid),
      {
        uid: teacherUid,
        roleId: 3,
      },
      { merge: true },
    );

    await batch.commit();

    sendJson(response, 201, {
      success: true,
      message: "Đã tạo hồ sơ và cấp quyền Teacher Admin.",
      teacherUid,
      roleId: 3,
    });
  } catch (error) {
    console.error("Create teacher failed:", error.message);

    sendJson(response, error.statusCode || 500, {
      error: error.message || "Không thể tạo hồ sơ giáo viên.",
    });
  }
}

// School Admin tạo lời mời riêng cho từng giáo viên.
async function handleCreateTeacherInvitation(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, {
      error: "Phương thức gửi không được hỗ trợ.",
    });
    return;
  }

  try {
    const authorization = request.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      sendJson(response, 401, {
        error: "Bạn cần đăng nhập.",
      });
      return;
    }

    const idToken = authorization.slice(7).trim();

    // Chỉ School Admin được tạo lời mời.
    const adminUser = await verifyAdminToken(idToken);

    const payload = await readJsonBody(request);
    const { email, name, subject } = payload || {};

    if (
      typeof email !== "string" ||
      typeof name !== "string" ||
      typeof subject !== "string"
    ) {
      sendJson(response, 400, {
        error: "Vui lòng cung cấp email, họ tên và môn dạy.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const normalizedSubject = subject.trim();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(normalizedEmail) ||
      normalizedEmail.length > 254 ||
      !normalizedName ||
      normalizedName.length > 100 ||
      !normalizedSubject ||
      normalizedSubject.length > 100
    ) {
      sendJson(response, 400, {
        error: "Thông tin giáo viên không hợp lệ.",
      });
      return;
    }

    // Tạo mã mời ngẫu nhiên và chỉ lưu bản băm.
    const invitationCode = crypto.randomBytes(32).toString("hex");

    const codeHash = crypto
      .createHash("sha256")
      .update(invitationCode)
      .digest("hex");

    const db = getFirestore();
    const invitationRef = db.collection("teacherInvitations").doc(codeHash);

    const now = Date.now();
    const expiresAt = new Date(now + 72 * 60 * 60 * 1000);

    await invitationRef.create({
      email: normalizedEmail,
      name: normalizedName,
      subject: normalizedSubject,
      status: "pending",
      createdBy: adminUser.uid,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      usedAt: null,
      usedBy: null,
    });

    // Chỉ trả mã gốc một lần cho School Admin.
    sendJson(response, 201, {
      success: true,
      message: "Đã tạo lời mời giáo viên.",
      invitation: {
        email: normalizedEmail,
        name: normalizedName,
        subject: normalizedSubject,
        code: invitationCode,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create teacher invitation failed:", error.message);

    sendJson(response, error.statusCode || 500, {
      error: error.message || "Không thể tạo lời mời giáo viên.",
    });
  }
}

// Giáo viên dùng mã mời để nhận quyền Teacher Admin (không yêu cầu xác minh email).
async function handleAcceptTeacherInvitation(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, {
      error: "Phương thức gửi không được hỗ trợ.",
    });
    return;
  }

  try {
    const authorization = request.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      sendJson(response, 401, {
        error: "Bạn cần đăng nhập tài khoản giáo viên.",
      });
      return;
    }

    const idToken = authorization.slice(7).trim();

    // Xác minh Firebase ID Token.
    const teacherUser = await verifyIdToken(idToken);

    if (!teacherUser.email) {
      sendJson(response, 400, {
        error: "Tài khoản Firebase không có địa chỉ email hợp lệ.",
      });
      return;
    }

    // Nhận mã lời mời.
    const payload = await readJsonBody(request);
    const invitationCode =
      typeof payload?.code === "string" ? payload.code.trim() : "";

    if (!/^[a-f0-9]{64}$/i.test(invitationCode)) {
      sendJson(response, 400, {
        error: "Mã lời mời không hợp lệ.",
      });
      return;
    }

    const codeHash = crypto
      .createHash("sha256")
      .update(invitationCode)
      .digest("hex");

    const db = getFirestore();
    const invitationRef = db.collection("teacherInvitations").doc(codeHash);

    const normalizedEmail = teacherUser.email.trim().toLowerCase();

    // Khóa lời mời cho UID đầu tiên xác nhận.
    // Nếu quá trình cấp quyền gặp lỗi, chính UID đó có thể thử lại.
    const invitation = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(invitationRef);

      if (!snapshot.exists) {
        const error = new Error("Lời mời không tồn tại.");
        error.statusCode = 404;
        throw error;
      }

      const data = snapshot.data();

      if (data.email !== normalizedEmail) {
        const error = new Error(
          "Email đăng nhập không trùng với email được mời.",
        );
        error.statusCode = 403;
        throw error;
      }

      const expiresAt = data.expiresAt?.toDate
        ? data.expiresAt.toDate()
        : new Date(data.expiresAt);

      if (
        !Number.isFinite(expiresAt.getTime()) ||
        expiresAt.getTime() <= Date.now()
      ) {
        const error = new Error("Lời mời đã hết hạn.");
        error.statusCode = 410;
        throw error;
      }

      if (data.status === "accepted") {
        const error = new Error("Lời mời này đã được sử dụng.");
        error.statusCode = 409;
        throw error;
      }

      if (
        data.status === "processing" &&
        data.processingUid !== teacherUser.uid
      ) {
        const error = new Error("Lời mời đang được tài khoản khác xử lý.");
        error.statusCode = 409;
        throw error;
      }

      if (data.status !== "pending" && data.status !== "processing") {
        const error = new Error("Lời mời không còn hiệu lực.");
        error.statusCode = 410;
        throw error;
      }

      if (data.status === "pending") {
        transaction.update(invitationRef, {
          status: "processing",
          processingUid: teacherUser.uid,
          processingAt: FieldValue.serverTimestamp(),
        });
      }

      return data;
    });
    // Chỉ Backend mới được cấp custom claims roleId = 3.
    await setTeacherAdminRole(teacherUser.uid);

    // Tạo hồ sơ và cập nhật trạng thái lời mời.
    const batch = db.batch();

    batch.set(
      db.collection("users").doc(teacherUser.uid),
      {
        uid: teacherUser.uid,
        email: normalizedEmail,
        name: invitation.name,
        roleId: 3,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    batch.set(
      db.collection("teachers").doc(teacherUser.uid),
      {
        teacherUid: teacherUser.uid,
        email: normalizedEmail,
        name: invitation.name,
        subject: invitation.subject,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    batch.update(invitationRef, {
      status: "accepted",
      usedBy: teacherUser.uid,
      usedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    sendJson(response, 200, {
      success: true,
      message: "Mã mời hợp lệ. Bạn đã được cấp quyền Teacher Admin.",
      roleId: 3,
      uid: teacherUser.uid,
    });
  } catch (error) {
    console.error("Accept teacher invitation failed:", error.message);

    sendJson(response, error.statusCode || 500, {
      error: error.message || "Không thể xác nhận lời mời.",
    });
  }
}
// API đọc và lưu tiến độ học tập bằng Firebase Admin.
async function handleLearningProgress(request, response) {
  try {
    const user = await authenticateUser(request);

    if (user.firebase?.sign_in_provider === "anonymous") {
      sendJson(response, 200, {
        success: true,
        completedLessons: [],
      });
      return;
    }

    const db = getFirestore();

    const progressRef = db
      .collection("users")
      .doc(user.uid)
      .collection("learningProgress");

    // Tải danh sách bài học đã hoàn thành.
    if (request.method === "GET") {
      const snapshot = await progressRef
        .where("status", "==", "completed")
        .get();

      const completedLessons = snapshot.docs
        .map((doc) => Number(doc.id))
        .filter((id) => Number.isInteger(id) && id >= 1 && id <= 20);

      sendJson(response, 200, {
        success: true,
        completedLessons,
      });

      return;
    }

    // Lưu tiến độ bài học.
    if (request.method === "POST") {
      const payload = await readJsonBody(request);

      const lessonId = Number(payload?.lessonId);
      const score = Number(payload?.score);
      const totalQuestions = Number(payload?.totalQuestions);

      if (
        !Number.isInteger(lessonId) ||
        lessonId < 1 ||
        lessonId > 20 ||
        payload?.status !== "completed" ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > 5 ||
        totalQuestions !== 5
      ) {
        sendJson(response, 400, {
          error: "Dữ liệu tiến độ học tập không hợp lệ.",
        });
        return;
      }

      const chapterId = getChapterIdFromLesson(lessonId);

      await progressRef.doc(String(lessonId)).set(
        {
          lessonId: String(lessonId),
          chapterId,
          status: "completed",
          score,
          totalQuestions,
          completedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      sendJson(response, 200, {
        success: true,
        lessonId,
      });

      return;
    }

    sendJson(response, 405, {
      error: "Phương thức gửi không được hỗ trợ.",
    });
  } catch (error) {
    console.error("Learning progress failed:", error.message);

    sendJson(response, error.statusCode || 500, {
      error: error.message || "Không thể xử lý tiến độ học tập.",
    });
  }
}
// API quản lý lịch sử và vi phạm bài kiểm tra.

async function handleQuizHistory(request, response) {
  try {
    const user = await authenticateUser(request);

    // GET: Tải lịch sử làm bài.
    if (request.method === "GET") {
      if (user.firebase?.sign_in_provider === "anonymous") {
        sendJson(response, 200, {
          success: true,
          history: [],
        });
        return;
      }

      const db = getFirestore();

      const snapshot = await db
        .collection("users")
        .doc(user.uid)
        .collection("examResults")
        .get();

      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      sendJson(response, 200, {
        success: true,
        history,
      });

      return;
    }

    // Chỉ chấp nhận POST cho các thao tác ghi lịch sử.
    if (request.method !== "POST") {
      sendJson(response, 405, {
        error: "Phương thức gửi không được hỗ trợ.",
      });
      return;
    }

    const payload = await readJsonBody(request);

    // Guest không lưu lịch sử hoặc dữ liệu vi phạm.
    if (user.firebase?.sign_in_provider === "anonymous") {
      sendJson(response, 200, {
        success: true,
        guestMode: true,
        historySaved: false,
        examResultId: null,
      });
      return;
    }

    if (
      !payload ||
      !["start", "violation", "abandon"].includes(payload.action)
    ) {
      sendJson(response, 400, {
        error: "Thao tác lịch sử kiểm tra không hợp lệ.",
      });
      return;
    }

    const db = getFirestore();

    const userResultsRef = db
      .collection("users")
      .doc(user.uid)
      .collection("examResults");

    // 1. Tạo lịch sử khi bắt đầu làm bài.
    if (payload.action === "start") {
      if (
        typeof payload.quizId !== "string" ||
        typeof payload.examTitle !== "string" ||
        !["I", "II", "III", "IV", "V", "TONG"].includes(payload.chapter)
      ) {
        sendJson(response, 400, {
          error: "Thông tin bài kiểm tra không hợp lệ.",
        });
        return;
      }

      const sessionRef = db.collection("quizSessions").doc(payload.quizId);

      const sessionSnapshot = await sessionRef.get();

      if (
        !sessionSnapshot.exists ||
        sessionSnapshot.data().uid !== user.uid ||
        sessionSnapshot.data().submitted ||
        Date.now() > sessionSnapshot.data().expiresAt
      ) {
        sendJson(response, 403, {
          error: "Phiên kiểm tra không hợp lệ hoặc đã hết hạn.",
        });
        return;
      }

      const existing = await userResultsRef
        .where("quizId", "==", payload.quizId)
        .limit(1)
        .get();

      if (!existing.empty) {
        sendJson(response, 200, {
          success: true,
          examResultId: existing.docs[0].id,
        });
        return;
      }

      const session = sessionSnapshot.data();
      const examResultRef = userResultsRef.doc();

      await examResultRef.set({
        uid: user.uid,
        email: user.email || "",
        quizId: payload.quizId,
        examType: session.type,
        chapter: payload.chapter,
        examTitle: payload.examTitle.trim().slice(0, 200),
        totalQuestions: session.questions.length,
        score: null,
        answered: 0,
        violationCount: 0,
        violations: [],
        status: "in_progress",
        startedAt: FieldValue.serverTimestamp(),
        submittedAt: null,
      });

      sendJson(response, 201, {
        success: true,
        examResultId: examResultRef.id,
      });

      return;
    }

    // Các thao tác còn lại cần mã bản ghi hợp lệ.
    if (
      typeof payload.examResultId !== "string" ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(payload.examResultId)
    ) {
      sendJson(response, 400, {
        error: "Mã lịch sử kiểm tra không hợp lệ.",
      });
      return;
    }

    const examResultRef = userResultsRef.doc(payload.examResultId);
    const examSnapshot = await examResultRef.get();

    if (!examSnapshot.exists) {
      sendJson(response, 404, {
        error: "Không tìm thấy lịch sử kiểm tra.",
      });
      return;
    }

    if (examSnapshot.data().status !== "in_progress") {
      sendJson(response, 409, {
        error: "Lượt kiểm tra này đã kết thúc.",
      });
      return;
    }

    // 2. Ghi nhận vi phạm.
    if (payload.action === "violation") {
      const allowedTypes = ["fullscreen_exit", "tab_hidden"];

      if (!allowedTypes.includes(payload.type)) {
        sendJson(response, 400, {
          error: "Loại vi phạm không hợp lệ.",
        });
        return;
      }

      await examResultRef.update({
        violationCount: FieldValue.increment(1),
        violations: FieldValue.arrayUnion({
          type: payload.type,
          occurredAt: new Date().toISOString(),
        }),
        lastViolationAt: FieldValue.serverTimestamp(),
      });

      sendJson(response, 200, { success: true });
      return;
    }

    // 3. Đánh dấu rời bài chưa nộp.
    if (payload.action === "abandon") {
      await examResultRef.update({
        status: "abandoned",
        endedAt: FieldValue.serverTimestamp(),
      });

      sendJson(response, 200, { success: true });
      return;
    }
  } catch (error) {
    console.error("Quiz history failed:", error.message);

    sendJson(response, error.statusCode || 500, {
      error: error.message || "Không thể cập nhật lịch sử kiểm tra.",
    });
  }
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
  // Cho phép frontend GitHub Pages gọi API trên Render.
  if (pathname.startsWith("/api/")) {
    const origin = request.headers.origin;

    if (origin) {
      if (!ALLOWED_FRONTEND_ORIGINS.has(origin)) {
        sendJson(response, 403, {
          error: "Nguồn gửi yêu cầu không được phép.",
        });
        return;
      }

      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
      response.setHeader("Access-Control-Max-Age", "86400");
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
  }

  if (pathname === "/api/admin/session") {
    handleAdminSession(request, response);
    return;
  }

  if (pathname === "/api/teacher/session") {
    handleTeacherSession(request, response);
    return;
  }

  // API thống kê School Admin.
  if (pathname === "/api/admin/stats") {
    handleAdminStats(request, response);
    return;
  }

  if (pathname === "/api/admin/students") {
    handleAdminStudents(request, response);
    return;
  }

  if (pathname === "/api/admin/classes") {
    handleAdminClasses(request, response);
    return;
  }

  if (pathname === "/api/admin/assign-teacher") {
    handleAdminAssignTeacher(request, response);
    return;
  }

  if (pathname === "/api/admin/teachers") {
    handleAdminCreateTeacher(request, response);
    return;
  }

  if (pathname === "/api/admin/teacher-invitations") {
    handleCreateTeacherInvitation(request, response);
    return;
  }

  if (pathname === "/api/teacher/accept-invitation") {
    handleAcceptTeacherInvitation(request, response);
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

  // API quản lý lịch sử và vi phạm bài kiểm tra.
  if (pathname === "/api/quiz/history") {
    handleQuizHistory(request, response);
    return;
  }

  // API bắt đầu bài kiểm tra.
  if (pathname === "/api/quiz/start") {
    handleQuizStart(request, response);
    return;
  }

  // API nộp bài kiểm tra.
  if (pathname === "/api/quiz/submit") {
    handleQuizSubmit(request, response);
    return;
  }

  if (/^\/[^/]+\.html$/i.test(pathname)) {
    response.writeHead(302, { Location: `/html${pathname}` });
    response.end();
    return;
  }

  serveStatic(request, response, pathname);
});

// Nạp khóa trước khi máy chủ bắt đầu nhận kết nối.
loadEnvironment();

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
