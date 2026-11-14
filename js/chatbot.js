(function () {
  // Cấu hình API và chế độ offline.
  const apiUrl =
    window.CHATBOT_API_URL ||
    "https://ktrinh-khkt-github-io-1.onrender.com/api/chat";

  // Trả lời cơ bản khi không có backend.
  function offlineReply(question) {
    const value = question
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");

    if (/^(xin chao|chao|hello|hi|hey)\b/.test(value)) {
      return "Chào bạn! Mình là trợ lý Công nghệ 8. Bạn có thể hỏi về 5 chương, an toàn điện, bản vẽ kỹ thuật, cơ khí hoặc thiết kế kỹ thuật.";
    }

    if (
      value.includes("quy trinh") ||
      value.includes("8 buoc") ||
      value.includes("tu hoc")
    ) {
      return "Quy trình tự học gồm 8 bước: xác định mục tiêu; học nội dung tóm tắt; xem học liệu trực quan; tự ghi chép; làm bài kiểm tra; nhận diện lỗ hổng; ôn bù và hỏi AI; kiểm tra lại đến khi đạt chuẩn để mở khóa bài tiếp theo.";
    }

    if (
      value.includes("chuong i") ||
      value.includes("ve ky thuat") ||
      value.includes("ban ve")
    ) {
      return "Chương I là Vẽ kỹ thuật. Bạn nên ôn các loại nét, khổ giấy, tỉ lệ, hình chiếu vuông góc và cách đọc bản vẽ kỹ thuật.";
    }

    if (
      value.includes("chuong ii") ||
      value.includes("co khi") ||
      value.includes("banh rang")
    ) {
      return "Chương II là Cơ khí, gồm vật liệu cơ khí, truyền và biến đổi chuyển động, gia công cơ khí và một số nghề trong lĩnh vực cơ khí.";
    }

    if (
      value.includes("chuong iii") ||
      value.includes("an toan dien") ||
      value.includes("dien giat")
    ) {
      return "Chương III là An toàn điện. Không chạm vào phần đang mang điện, ngắt nguồn trước khi xử lý và báo ngay cho người lớn khi có sự cố. Không tự đấu nối điện lưới.";
    }

    if (
      value.includes("chuong iv") ||
      value.includes("ky thuat dien") ||
      value.includes("mach dien")
    ) {
      return "Chương IV là Kỹ thuật điện, tập trung vào vật liệu điện, cấu tạo mạch và lắp ráp mạch điều khiển đơn giản. Khi thực hành, luôn ngắt nguồn và làm theo hướng dẫn của giáo viên.";
    }

    if (
      value.includes("chuong v") ||
      value.includes("thiet ke") ||
      value.includes("y tuong")
    ) {
      return "Chương V là Thiết kế kỹ thuật: xác định vấn đề, đề xuất ý tưởng, lựa chọn giải pháp, chế tạo thử và đánh giá để cải tiến sản phẩm.";
    }

    return "Mình đang ở chế độ offline nên chỉ trả lời được các câu hỏi cơ bản về Công nghệ 8. Bạn hãy thử hỏi về Chương I–V, an toàn điện hoặc quy trình tự học.";
  }

  // Tạo giao diện chatbot.
  function renderChatbot() {
    if (document.getElementById("chatbot-widget")) {
      return;
    }

    const widget = document.createElement("section");
    widget.id = "chatbot-widget";
    widget.className = "chatbot-widget";

    widget.innerHTML = `
      <section class="chatbot-panel" id="chatbot-panel"
        role="dialog" aria-modal="false"
        aria-labelledby="chatbot-title" hidden>
        <header class="chatbot-header">
          <div>
            <h2 id="chatbot-title">Trợ lý AI Công nghệ 8</h2>
            <p>Hỏi về nội dung và cách học Chương I–V</p>
          </div>
          <button class="chatbot-close" type="button"
            aria-label="Đóng trợ lý">×</button>
        </header>

        <div class="chatbot-messages" id="chatbot-messages"
          aria-live="polite" aria-relevant="additions text"></div>

        <form class="chatbot-form">
          <label class="visually-hidden" for="chatbot-input">
            Nhập câu hỏi cho trợ lý AI
          </label>
          <textarea id="chatbot-input" rows="2" maxlength="1200"
            placeholder="Nhập câu hỏi của bạn..." required></textarea>
          <div class="chatbot-form-footer">
            <span>Không chia sẻ thông tin cá nhân.</span>
            <button class="chatbot-send" type="submit">Gửi</button>
          </div>
        </form>
      </section>

      <button class="chatbot-toggle" type="button"
        aria-expanded="false" aria-controls="chatbot-panel">
        <span aria-hidden="true">✦</span> Hỏi AI
      </button>
    `;

    document.body.appendChild(widget);

    const panel = widget.querySelector("#chatbot-panel");
    const toggle = widget.querySelector(".chatbot-toggle");
    const close = widget.querySelector(".chatbot-close");
    const messagesHost = widget.querySelector("#chatbot-messages");
    const form = widget.querySelector(".chatbot-form");
    const input = widget.querySelector("#chatbot-input");
    const sendButton = widget.querySelector(".chatbot-send");

    const history = [];

    // Ẩn AI Tutor trong thời gian làm bài kiểm tra.
    let examModeActive = false;

    document.addEventListener("exam:started", () => {
      examModeActive = true;

      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");

      widget.style.display = "none";
    });

    document.addEventListener("exam:ended", () => {
      examModeActive = false;
      widget.style.display = "";
    });

    // Hiển thị tin nhắn.
    function addMessage(role, text, isError) {
      const message = document.createElement("p");

      message.className =
        `chatbot-message chatbot-message-${role}` +
        (isError ? " chatbot-message-error" : "");

      message.textContent = text;
      messagesHost.appendChild(message);
      messagesHost.scrollTop = messagesHost.scrollHeight;

      return message;
    }

    // Đóng/mở chatbot.
    function setOpen(isOpen) {
      panel.hidden = !isOpen;
      toggle.setAttribute("aria-expanded", String(isOpen));

      if (isOpen) {
        input.focus();
      } else {
        toggle.focus();
      }
    }

    addMessage(
      "assistant",
      "Chào bạn! Mình có thể giúp giải thích kiến thức Công nghệ 8 và gợi ý cách ôn bài. Hãy luôn làm theo hướng dẫn của giáo viên khi thực hành điện.",
    );

    toggle.addEventListener("click", function () {
      setOpen(panel.hidden);
    });

    close.addEventListener("click", function () {
      setOpen(false);
    });

    // Enter gửi, Shift + Enter xuống dòng.
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    // Xử lý gửi câu hỏi.
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const text = input.value.trim();

      if (!text || sendButton.disabled) {
        return;
      }

      history.push({ role: "user", text });
      addMessage("user", text);

      input.value = "";
      input.disabled = true;
      sendButton.disabled = true;
      sendButton.textContent = "Đang trả lời...";
      form.setAttribute("aria-busy", "true");

      const conversation = history.slice(-12);

      if (conversation[0]?.role === "model") {
        conversation.shift();
      }

      try {

        // Gửi lịch sử hội thoại đến backend.
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            history: conversation,
          }),
        });

        const responseText = await response.text();
        let result;

        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(
            `Máy chủ trả về dữ liệu không hợp lệ (HTTP ${response.status}).`,
          );
        }

        if (!response.ok) {
          throw new Error(
            result.error || `Máy chủ trả về lỗi ${response.status}.`,
          );
        }

        if (typeof result.reply !== "string" || !result.reply.trim()) {
          throw new Error("Trợ lý chưa gửi được câu trả lời. Bạn hãy thử lại.");
        }

        history.push({
          role: "model",
          text: result.reply,
        });

        addMessage("assistant", result.reply);
      } catch (error) {
        // Chỉ dùng câu trả lời offline khi không kết nối được server.
        if (error instanceof TypeError) {
          const fallback = offlineReply(text);

          history.push({
            role: "model",
            text: fallback,
          });

          addMessage(
            "assistant",
            fallback + "\n\n(Mình đang sử dụng chế độ offline.)",
          );
        } else {
          // Không xóa câu hỏi người dùng khỏi lịch sử.
          addMessage(
            "assistant",
            error.message || "Đã xảy ra lỗi. Bạn hãy thử lại.",
            true,
          );
        }
      } finally {
        input.disabled = false;
        sendButton.disabled = false;
        sendButton.textContent = "Gửi";
        form.removeAttribute("aria-busy");
        input.focus();
      }
    });

    // Đóng chatbot bằng Escape.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) {
        setOpen(false);
      }
    });

    // Nhận sự kiện khi học sinh trả lời sai.
    document.addEventListener("quiz:wrong-answer", function () {
      if (examModeActive) return;

      setOpen(true);

      addMessage(
        "assistant",
        "Bạn có câu trả lời chưa chính xác. Hãy quay lại bài học để ôn tập nhé!",
      );
    });
  }

  // Khởi tạo chatbot sau khi trang tải xong.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderChatbot);
  } else {
    renderChatbot();
  }
})();
