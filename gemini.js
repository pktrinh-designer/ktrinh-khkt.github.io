// Các model Gemini được thử lần lượt nếu model trước gặp lỗi.
const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
];

// Gửi lịch sử hội thoại tới Gemini và trả về nội dung phản hồi.
async function callGemini(contents) {
  const apiKey = process.env.GEMINI_API_KEY;
  let lastError = null;

    // Thử từng model để tăng khả năng nhận được phản hồi.
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "Bạn là trợ lý AI trò chuyện tự nhiên, thân thiện bằng tiếng Việt, hỗ trợ người dùng trước hết theo đúng điều họ đang hỏi. Hãy hiểu ngữ cảnh và mục đích của từng tin nhắn; trả lời trực tiếp, phù hợp với câu hỏi, cảm xúc và cách nói của người dùng. Người dùng có thể hỏi chuyện thường ngày, chào hỏi, đùa vui hoặc hỏi về Công nghệ 8; hãy phản hồi tự nhiên như một cuộc trò chuyện, không tự động biến mọi tin nhắn thành bài giảng môn học. Không dùng một mẫu cố định, không bắt buộc mở đầu bằng lời chào, lời dẫn, tiêu đề, danh sách hay kết luận. Chỉ dùng gạch đầu dòng hoặc chia mục khi điều đó giúp câu trả lời dễ hiểu hơn. Câu hỏi ngắn thì trả lời gọn; khi người dùng muốn giải thích sâu thì mới trình bày chi tiết. Chỉ hỏi lại khi thiếu thông tin quan trọng để trả lời đúng; không kết thúc mọi câu trả lời bằng câu mời hỏi thêm. Với kiến thức Công nghệ 8, dựa theo sách Kết nối tri thức với cuộc sống. Chỉ khẳng định điều bạn chắc chắn; nếu không chắc, hãy nói rõ. Với chủ đề điện, luôn nhấn mạnh an toàn và không hướng dẫn đấu nối điện lưới."
            }, {
              text: "Quy trình tự học khép kín của học sinh gồm đúng 8 bước theo thứ tự: 1) Tìm hiểu mục tiêu: đọc mục tiêu chuẩn năm và yêu cầu cần đạt; 2) Học nội dung tóm tắt: đọc lý thuyết chủ động, bảng tiêu chuẩn Việt Nam và sơ đồ; 3) Xem học liệu trực quan: quan sát mô phỏng 3D và video thao tác mẫu; 4) Tự ghi chép vào vở: ghi từ khóa, vẽ sơ đồ khối và ghi công thức tính toán; 5) Kiểm tra đánh giá: làm 10 câu trắc nghiệm ngẫu nhiên rồi tự chấm điểm; 6) Nhận diện lỗ hổng: phân tích mã câu sai để chỉ rõ phần hiểu nhầm; 7) Neo học bù và hỏi AI: quay về đúng mục lý thuyết và hỏi Chatbot để được gợi mở; 8) Hoàn thành và mở khóa: kiểm tra lại đến khi đạt chuẩn để mở khóa bài học tiếp theo. Khi được hỏi về quy trình này, hãy giải thích rõ từng bước, giữ đúng thứ tự và nhấn mạnh vòng lặp: làm sai thì quay lại ôn đúng phần kiến thức, hỏi AI khi cần, rồi kiểm tra lại trước khi học tiếp."
            }]
          },
          contents,
          generationConfig: {
            maxOutputTokens: 700,
            temperature: 0.5
          }
        }),
        signal: AbortSignal.timeout(20000)
      });
      // Đọc phản hồi dạng văn bản rồi phân tích JSON an toàn.
      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        data = {};
      }

      if (!response.ok) {
        const apiMessage = data.error?.message || response.statusText || "Unknown API error";
        lastError = `HTTP ${response.status}: ${apiMessage}`;
        console.error(`Gemini model ${model} returned HTTP ${response.status}: ${apiMessage}`);

        if ([400, 401, 403].includes(response.status)) {
          throw new Error(`Gemini API key or access rejected: ${lastError}`);
        }

        continue;
      }
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!reply) {
        lastError = "Model tra ve noi dung rong";
        continue;
      }

      return reply;
    } catch (err) {
      lastError = err.message;
      console.error(`Gemini model ${model} request failed: ${err.message}`);
    }
  }

  throw new Error(`All Gemini models failed: ${lastError || "unknown error"}`);
}

module.exports = callGemini;
