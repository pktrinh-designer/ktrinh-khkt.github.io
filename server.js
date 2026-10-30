const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const callGemini = require("./gemini");

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
  ".svg": "image/svg+xml"
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

  const entry = fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((line) => /^\s*(?:export\s+)?GEMINI_API_KEY\s*=/.test(line));

  if (!entry) {
    return;
  }

  let value = entry.replace(/^\s*(?:export\s+)?GEMINI_API_KEY\s*=\s*/, "").trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
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
  const recentTimes = (requestsByAddress.get(address) || [])
    .filter((timestamp) => now - timestamp < RATE_WINDOW_MS);

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
  const host = request.headers.host;

  // Cho phép request từ chính tên miền của server (hỗ trợ cả Render và chạy cục bộ)
  if (origin) {
    const originUrl = new URL(origin);
    const expectedHost = host;
    if (originUrl.host !== expectedHost) {
      if (!originUrl.hostname.endsWith(".onrender.com") && originUrl.host !== expectedHost) {
        sendJson(response, 403, { error: "Nguồn gửi yêu cầu không được phép." });
        return;
      }
    }
  }

  if (!allowRequest(request.socket.remoteAddress || "local")) {
    sendJson(response, 429, { error: "Bạn gửi câu hỏi quá nhanh. Hãy chờ một phút rồi thử lại." });
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
    sendJson(response, 400, { error: "Lịch sử hội thoại không hợp lệ. Hãy gửi một câu hỏi rồi thử lại." });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    sendJson(response, 503, { error: "Máy chủ chưa được cấu hình GEMINI_API_KEY trong tệp .env." });
    return;
  }

  try {
    const reply = await callGemini(history.map(({ role, text }) => ({
      role,
      parts: [{ text }]
    })));
    sendJson(response, 200, { reply });
  } catch (error) {
    console.error("Gemini chat request failed:", error.message);
    sendJson(response, 502, { error: "Gemini chưa trả lời được. Hãy kiểm tra API key hoặc thử lại sau." });
  }
}

// Phục vụ tệp HTML, CSS và JavaScript từ các thư mục cho phép.
function serveStatic(request, response, pathname) {
  const requestedPath = pathname === "/" ? "/html/trangtieude.html" : pathname;
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
      "X-Content-Type-Options": "nosniff"
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
    pathname = decodeURIComponent(new URL(request.url, `http://${HOST}:${PORT}`).pathname);
  } catch {
    response.writeHead(400);
    response.end("Invalid request path");
    return;
  }

  if (pathname === "/api/chat") {
    handleChat(request, response).catch((error) => {
      console.error("Chat request failed:", error.message);
      sendJson(response, 500, { error: "Đã xảy ra lỗi khi xử lí câu hỏi. Hãy thử lại." });
    });
    return;
  }

  if (/^\/[^/]+\.html$/i.test(pathname)) {
    response.writeHead(302, { Location: `/html${pathname}` });
    response.end();
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  serveStatic(request, response, pathname);
});

// Nạp khóa trước khi máy chủ bắt đầu nhận kết nối.
loadApiKey();

if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  throw new Error("PORT must be an integer between 1024 and 65535.");
}

// Khởi động máy chủ tại địa chỉ và cổng đã cấu hình.
server.listen(PORT, HOST, () => {
  console.log(`Server is running on port ${PORT}`);
});
