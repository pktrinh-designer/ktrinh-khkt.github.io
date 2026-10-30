(function() {
  // Tạo giao diện trợ lý AI và gắn các sự kiện tương tác.
  function renderChatbot() {
    if (document.getElementById("chatbot-widget")) {
      return;
    }

    const widget = document.createElement("section");
    widget.id = "chatbot-widget";
    widget.className = "chatbot-widget";
    widget.innerHTML = `
      <section class="chatbot-panel" id="chatbot-panel" role="dialog" aria-modal="false" aria-labelledby="chatbot-title" hidden>
        <header class="chatbot-header">
          <div>
            <h2 id="chatbot-title">Trợ lý AI Công nghệ 8</h2>
            <p>Hỏi về nội dung và cách học Chương I–V</p>
          </div>
          <button class="chatbot-close" type="button" aria-label="Đóng trợ lý">×</button>
        </header>
        <div class="chatbot-messages" id="chatbot-messages" aria-live="polite" aria-relevant="additions text"></div>
        <form class="chatbot-form">
          <label class="visually-hidden" for="chatbot-input">Nhập câu hỏi cho trợ lý AI</label>
          <textarea id="chatbot-input" rows="2" maxlength="1200" placeholder="Nhập câu hỏi của bạn..." required></textarea>
          <div class="chatbot-form-footer">
            <span>Không chia sẻ thông tin cá nhân.</span>
            <button class="chatbot-send" type="submit">Gửi</button>
          </div>
        </form>
      </section>
      <button class="chatbot-toggle" type="button" aria-expanded="false" aria-controls="chatbot-panel">
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

    // Thêm một tin nhắn vào khung hội thoại và cuộn tới tin mới.
    // Hiển thị tin nhắn của người dùng, trợ lý hoặc thông báo lỗi.
    function addMessage(role, text, isError) {
      const message = document.createElement("p");
      message.className = `chatbot-message chatbot-message-${role}${isError ? " chatbot-message-error" : ""}`;
      message.textContent = text;
      messagesHost.appendChild(message);
      messagesHost.scrollTop = messagesHost.scrollHeight;
      return message;
    }

    // Cập nhật trạng thái hiển thị của bảng chat và nút mở.
    // Đồng bộ trạng thái mở, thuộc tính truy cập và tiêu điểm bàn phím.
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
      "Chào bạn! Mình có thể giúp giải thích kiến thức Công nghệ 8 và gợi ý cách ôn bài. Hãy luôn làm theo hướng dẫn của giáo viên khi thực hành điện."
    );

    // Nút nổi mở hoặc thu gọn bảng hội thoại.
    toggle.addEventListener("click", function() {
      setOpen(panel.hidden);
    });

    // Nút đóng ẩn bảng hội thoại.
    close.addEventListener("click", function() {
      setOpen(false);
    });

    // Enter gửi câu hỏi; Shift+Enter cho phép xuống dòng.
    input.addEventListener("keydown", function(event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    // Gửi câu hỏi cùng lịch sử hội thoại tới API máy chủ.
    // Kiểm tra câu hỏi, cập nhật lịch sử và gọi API chat.
    form.addEventListener("submit", async function(event) {
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
        // Gửi toàn bộ lịch sử để trợ lý có thể theo dõi ngữ cảnh hội thoại.
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history: conversation })
        });
        const responseText = await response.text();
        let result;

        try {
          result = JSON.parse(responseText);
        } catch {
          const detail = responseText.trim()
            ? ` Máy chủ trả về: ${responseText.trim().slice(0, 160)}`
            : " Máy chủ không gửi nội dung phản hồi.";
          throw new Error(
            `Phản hồi từ máy chủ không phải JSON (HTTP ${response.status}). Hãy kiểm tra bạn đã chạy node server.js và mở website tại http://127.0.0.1:3000 chưa.${detail}`
          );
        }

        if (!response.ok) {
          throw new Error(result.error || `Máy chủ trả về lỗi ${response.status}.`);
        }

        if (typeof result.reply !== "string" || !result.reply.trim()) {
          throw new Error("Trợ lý chưa gửi được câu trả lời. Bạn hãy thử lại.");
        }

        history.push({ role: "model", text: result.reply });
        addMessage("assistant", result.reply);
      } catch (error) {
        history.pop();
        const message = error instanceof TypeError
          ? "Không kết nối được máy chủ. Hãy chạy node server.js rồi mở website tại http://127.0.0.1:3000."
          : error.message;
        addMessage("assistant", message, true);
      } finally {
        input.disabled = false;
        sendButton.disabled = false;
        sendButton.textContent = "Gửi";
        form.removeAttribute("aria-busy");
        input.focus();
      }
    });

    // Đóng cửa sổ chat bằng phím Escape.
    // Đóng bảng chat bằng Escape khi bảng đang mở.
    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape" && !panel.hidden) {
        setOpen(false);
      }
    });

    // Nhận cảnh báo từ bài kiểm tra, mở chatbot và hiện lời nhắc ôn tập.
    document.addEventListener("quiz:wrong-answer", function() {
      setOpen(true);
      addMessage(
        "assistant",
        "Ô có câu bạn đã làm sai, cùng quay lại bài học để ôn tập lại nhé"
      );
    });
  }

  if (document.readyState === "loading") {
    // Chỉ khởi tạo chatbot sau khi cấu trúc trang đã sẵn sàng.
    document.addEventListener("DOMContentLoaded", renderChatbot);
  } else {
    renderChatbot();
  }
})();
