(function() {
  // Ngân hàng câu hỏi theo chương, gồm đáp án, giải thích và trang ôn tập.
  const CHAPTER_TESTS = {
    I: {
      title: "Chương I · Vẽ kĩ thuật",
      studyPage: "lop-8/chuong-i.html",
      questions: [
        {
          prompt: "Hình chiếu vuông góc được tạo ra khi các tia chiếu như thế nào với mặt phẳng chiếu?",
          choices: ["Vuông góc với mặt phẳng chiếu.", "Song song với mặt phẳng chiếu.", "Tạo góc bất kì với mặt phẳng chiếu."],
          answer: 0,
          explanation: "Các tia chiếu vuông góc với mặt phẳng chiếu tạo nên hình chiếu vuông góc."
        },
        {
          prompt: "Đường nét đứt mảnh trên bản vẽ thường biểu diễn phần nào của vật thể?",
          choices: ["Cạnh thấy.", "Cạnh khuất.", "Đường kích thước."],
          answer: 1,
          explanation: "Nét đứt mảnh được dùng để biểu diễn cạnh khuất trong bản vẽ."
        },
        {
          prompt: "Kích thước ghi trên bản vẽ kĩ thuật thường cho biết điều gì?",
          choices: ["Màu sắc của vật thể.", "Khối lượng chính xác của vật thể.", "Kích thước thực của vật thể theo đơn vị quy định."],
          answer: 2,
          explanation: "Kích thước bản vẽ cho biết kích thước thực của chi tiết theo quy ước ghi kích thước."
        },
        {
          prompt: "Bản vẽ lắp chủ yếu giúp người đọc hiểu thông tin nào?",
          choices: ["Chỉ màu sắc của sản phẩm.", "Quan hệ vị trí và cách lắp các chi tiết.", "Chỉ quy trình quảng cáo sản phẩm."],
          answer: 1,
          explanation: "Bản vẽ lắp thể hiện hình dạng chung và quan hệ lắp ghép giữa các chi tiết."
        },
        {
          prompt: "Khi bắt đầu đọc một bản vẽ, thông tin nào nên được xem để nhận biết tên gọi và tỉ lệ?",
          choices: ["Khung tên.", "Đường gạch mặt cắt.", "Nét đứt."],
          answer: 0,
          explanation: "Khung tên chứa những thông tin nhận dạng cơ bản của bản vẽ."
        }
      ]
    },
    II: {
      title: "Chương II · Cơ khí",
      studyPage: "lop-8/chuong-ii.html",
      questions: [
        {
          prompt: "Vật liệu nào sau đây thuộc nhóm kim loại đen?",
          choices: ["Cao su.", "Thép.", "Đồng."],
          answer: 1,
          explanation: "Gang và thép là các vật liệu thuộc nhóm kim loại đen."
        },
        {
          prompt: "Trong bộ truyền đai, bộ phận nào truyền chuyển động giữa hai bánh đai?",
          choices: ["Ổ trục.", "Vỏ máy.", "Dây đai."],
          answer: 2,
          explanation: "Dây đai ôm quanh bánh dẫn và bánh bị dẫn để truyền chuyển động."
        },
        {
          prompt: "Hai bánh răng ăn khớp ngoài trực tiếp thường quay theo chiều nào?",
          choices: ["Ngược chiều nhau.", "Cùng chiều nhau.", "Không thể truyền chuyển động."],
          answer: 0,
          explanation: "Khi hai bánh răng ăn khớp ngoài, chiều quay của chúng ngược nhau."
        },
        {
          prompt: "Khi cưa kim loại bằng tay, cách làm nào giúp giữ phôi ổn định?",
          choices: ["Giữ phôi bằng tay sát đường cưa.", "Đặt phôi tự do trên mép bàn.", "Kẹp chặt phôi vào ê tô phù hợp."],
          answer: 2,
          explanation: "Kẹp chặt phôi giúp thao tác ổn định và giảm nguy cơ trượt gây chấn thương."
        },
        {
          prompt: "Trước khi dùng dụng cụ gia công cơ khí, việc nào cần làm?",
          choices: ["Tháo bỏ bộ phận bảo vệ.", "Kiểm tra dụng cụ và thực hiện đúng quy tắc an toàn.", "Đứng trong hướng chuyển động của phôi."],
          answer: 1,
          explanation: "Kiểm tra tình trạng dụng cụ và tuân thủ hướng dẫn giúp hạn chế tai nạn."
        }
      ]
    },
    III: {
      title: "Chương III · An toàn điện",
      studyPage: "lop-8/chuong-iii.html",
      questions: [
        {
          prompt: "Hành động nào có nguy cơ gây tai nạn điện?",
          choices: ["Dùng thiết bị đúng hướng dẫn.", "Báo người lớn khi thấy dây điện hỏng.", "Chạm vào dây dẫn bị hở khi dây đang mang điện."],
          answer: 2,
          explanation: "Chạm vào phần dẫn điện đang mang điện có thể làm dòng điện đi qua cơ thể."
        },
        {
          prompt: "Vì sao không nên sử dụng thiết bị điện khi tay ướt?",
          choices: ["Nước và độ ẩm có thể làm tăng nguy cơ dòng điện truyền qua cơ thể.", "Tay ướt luôn làm thiết bị hết điện.", "Nước làm dây dẫn không thể nóng lên."],
          answer: 0,
          explanation: "Độ ẩm làm giảm khả năng cách điện của da và tăng nguy cơ điện giật."
        },
        {
          prompt: "Khi phát hiện dây điện bị hỏng, em nên làm gì?",
          choices: ["Tự nối dây khi nguồn chưa ngắt.", "Không chạm vào và báo ngay cho người lớn hoặc giáo viên.", "Dùng tay kiểm tra chỗ hở."],
          answer: 1,
          explanation: "Cần tránh xa khu vực nguy hiểm và nhờ người có trách nhiệm xử lí an toàn."
        },
        {
          prompt: "Găng tay cách điện phù hợp được dùng nhằm mục đích nào?",
          choices: ["Thay thế mọi quy tắc an toàn.", "Cho phép làm việc với bất kì điện áp nào.", "Hạn chế tiếp xúc trực tiếp với phần có nguy cơ dẫn điện khi sử dụng đúng cách."],
          answer: 2,
          explanation: "Dụng cụ bảo vệ hỗ trợ cách điện nhưng phải đúng loại, còn tốt và dùng đúng hướng dẫn."
        },
        {
          prompt: "Nếu có người gặp sự cố điện, việc đầu tiên cần ưu tiên là gì?",
          choices: ["Báo người lớn/cấp cứu và không chạm trực tiếp khi nguồn điện chưa được ngắt an toàn.", "Nắm tay kéo người đó ra ngay.", "Dội nước lên khu vực có điện."],
          answer: 0,
          explanation: "Không chạm trực tiếp khi nguồn điện còn nguy hiểm; cần gọi người có chuyên môn và ngắt điện an toàn."
        }
      ]
    },
    IV: {
      title: "Chương IV · Kĩ thuật điện",
      studyPage: "lop-8/chuong-iv.html",
      questions: [
        {
          prompt: "Bộ phận nào cung cấp điện năng cho mạch điện?",
          choices: ["Công tắc.", "Nguồn điện.", "Phụ tải."],
          answer: 1,
          explanation: "Nguồn điện cung cấp điện năng để các phần tử trong mạch hoạt động."
        },
        {
          prompt: "Công tắc trong mạch điện có chức năng chính nào?",
          choices: ["Đóng hoặc ngắt mạch điện.", "Cung cấp điện năng.", "Thay thế dây dẫn."],
          answer: 0,
          explanation: "Công tắc điều khiển trạng thái đóng, ngắt của mạch."
        },
        {
          prompt: "Vật liệu nào thường được dùng làm lõi dây dẫn điện?",
          choices: ["Cao su.", "Sứ.", "Đồng."],
          answer: 2,
          explanation: "Đồng là vật liệu dẫn điện thường dùng làm lõi dây dẫn."
        },
        {
          prompt: "Điều kiện cơ bản để bóng đèn trong mạch đơn giản sáng là gì?",
          choices: ["Công tắc luôn mở.", "Mạch kín và nối đúng với nguồn điện.", "Không cần dây dẫn."],
          answer: 1,
          explanation: "Mạch phải kín, các phần tử được nối phù hợp và có nguồn điện."
        },
        {
          prompt: "Khi lắp mạch điện học tập, nguồn nào phải được sử dụng?",
          choices: ["Ổ điện gia đình cắm trực tiếp.", "Nguồn bất kì không rõ thông số.", "Bộ nguồn điện áp thấp theo hướng dẫn của giáo viên."],
          answer: 2,
          explanation: "Chỉ thực hành với bộ nguồn điện áp thấp phù hợp; tuyệt đối không tự đấu vào điện lưới."
        }
      ]
    },
    V: {
      title: "Chương V · Thiết kế kĩ thuật",
      studyPage: "lop-8/chuong-v.html",
      questions: [
        {
          prompt: "Thiết kế kĩ thuật thường bắt đầu từ đâu?",
          choices: ["Trang trí sản phẩm cuối cùng.", "Chọn ngẫu nhiên vật liệu.", "Nhận biết và xác định vấn đề hoặc nhu cầu cần giải quyết."],
          answer: 2,
          explanation: "Cần xác định đúng vấn đề và nhu cầu trước khi đề xuất giải pháp."
        },
        {
          prompt: "Tiêu chí thiết kế giúp ích gì?",
          choices: ["Thay thế việc xác định vấn đề.", "Làm rõ yêu cầu để so sánh và đánh giá các phương án.", "Đảm bảo không cần thử nghiệm."],
          answer: 1,
          explanation: "Tiêu chí cho biết giải pháp cần đáp ứng những yêu cầu nào."
        },
        {
          prompt: "Sau khi đề xuất nhiều ý tưởng, bước hợp lí tiếp theo là gì?",
          choices: ["So sánh các ý tưởng theo yêu cầu rồi chọn phương án phù hợp.", "Bỏ qua mọi tiêu chí.", "Kết thúc thiết kế ngay."],
          answer: 0,
          explanation: "Cần đánh giá ý tưởng theo tiêu chí để lựa chọn giải pháp có căn cứ."
        },
        {
          prompt: "Vì sao cần thử nghiệm hoặc đánh giá sản phẩm thiết kế?",
          choices: ["Để tránh phải xác định yêu cầu.", "Chỉ để làm sản phẩm trông đẹp hơn.", "Kiểm tra mức độ đáp ứng yêu cầu và tìm điểm cần cải tiến."],
          answer: 2,
          explanation: "Đánh giá cho biết giải pháp hoạt động ra sao và cần điều chỉnh điểm nào."
        },
        {
          prompt: "Nếu sản phẩm chưa đạt một tiêu chí quan trọng, nên làm gì?",
          choices: ["Bỏ qua kết quả kiểm tra.", "Điều chỉnh phương án rồi thử nghiệm, đánh giá lại.", "Khẳng định sản phẩm đã hoàn hảo."],
          answer: 1,
          explanation: "Thiết kế là quá trình có thể lặp lại để cải tiến giải pháp theo tiêu chí."
        }
      ]
    }
  };

  // Gợi ý bài học ôn tập cho câu hỏi theo thứ tự trong từng bài kiểm tra chương.
  const QUESTION_LESSON_INDEX = {
    I: [0, 0, 1, 2, 1],
    II: [0, 1, 1, 2, 2],
    III: [0, 1, 0, 1, 2],
    IV: [0, 0, 0, 0, 2],
    V: [0, 0, 1, 1, 2]
  };

  // Các trang và tên bài học dùng cho liên kết ôn tập sau khi trả lời sai.
  const CHAPTER_LESSONS = {
    I: [
      { title: "Bài 2: Hình chiếu vuông góc", href: "lop-8/chuong-i.html" },
      { title: "Bài 3: Bản vẽ chi tiết", href: "lop-8/chuong-i.html" },
      { title: "Bài 4: Bản vẽ lắp", href: "lop-8/chuong-i.html" },
      { title: "Bài 5: Bản vẽ nhà", href: "lop-8/chuong-i.html" }
    ],
    II: [
      { title: "Bài 6: Vật liệu cơ khí", href: "lop-8/chuong-ii.html" },
      { title: "Bài 7: Truyền và biến đổi chuyển động", href: "lop-8/chuong-ii.html" },
      { title: "Bài 8: Gia công cơ khí bằng tay", href: "lop-8/chuong-ii.html" },
      { title: "Bài 9: Ngành nghề trong lĩnh vực cơ khí", href: "lop-8/chuong-ii.html" }
    ],
    III: [
      { title: "Bài 11: Tai nạn điện", href: "lop-8/chuong-iii.html" },
      { title: "Bài 12: Biện pháp an toàn điện", href: "lop-8/chuong-iii.html" },
      { title: "Bài 13: Sơ cứu người bị tai nạn điện", href: "lop-8/chuong-iii.html" }
    ],
    IV: [
      { title: "Bài 14: Giới thiệu về mạch điện", href: "lop-8/chuong-iv.html" },
      { title: "Bài 15: Cảm biến và mô đun cảm biến", href: "lop-8/chuong-iv.html" },
      { title: "Bài 16: Mạch điện điều khiển sử dụng mô đun cảm biến", href: "lop-8/chuong-iv.html" },
      { title: "Bài 17: Ngành nghề trong lĩnh vực kĩ thuật điện", href: "lop-8/chuong-iv.html" }
    ],
    V: [
      { title: "Bài 18: Giới thiệu về thiết kế kĩ thuật", href: "lop-8/chuong-v.html" },
      { title: "Bài 19: Các bước thiết kế kĩ thuật", href: "lop-8/chuong-v.html" },
      { title: "Bài 20: Dự án thiết kế hệ thống tưới cây tự động", href: "lop-8/chuong-v.html" }
    ]
  };

  // Số chủ đề đầu tiên được gắn với mỗi bài trong bài kiểm tra tổng hợp.
  const OVERALL_LESSON_BREAKS = {
    I: [5, 10, 14, 19],
    II: [5, 10, 15, 19],
    III: [7, 13, 19],
    IV: [6, 11, 16, 19],
    V: [6, 12, 16, 19]
  };

  // Ghép câu hỏi từ các chương thành bài kiểm tra tổng hợp.
  function buildOverallTest() {
    const chapterInfo = {
      I: "Chương I · Vẽ kĩ thuật",
      II: "Chương II · Cơ khí",
      III: "Chương III · An toàn điện",
      IV: "Chương IV · Kĩ thuật điện",
      V: "Chương V · Thiết kế kĩ thuật"
    };
    const questions = [];

    // Tạo cặp câu ghi nhớ/vận dụng cho từng chủ đề trong từng chương.
    Object.keys(chapterInfo).forEach(function(chapterKey) {
      const topics = window.COMPREHENSIVE_QUESTION_BANK?.[chapterKey] || [];

      topics.forEach(function(topic, topicIndex) {
        const [knowledgePrompt, applicationPrompt, sourceChoices, sourceAnswer, explanation] = topic;
        const lessonGroup = OVERALL_LESSON_BREAKS[chapterKey].findIndex(function(lastTopicIndex) {
          return topicIndex < lastTopicIndex;
        });
        const lesson = CHAPTER_LESSONS[chapterKey][Math.max(lessonGroup, 0)];

        [knowledgePrompt, applicationPrompt].forEach(function(prompt) {
          const answer = questions.length % sourceChoices.length;
          const distractors = sourceChoices.filter(function(_, index) {
            return index !== sourceAnswer;
          });
          const choices = distractors.slice();
          choices.splice(answer, 0, sourceChoices[sourceAnswer]);

          questions.push({
            prompt,
            choices,
            answer,
            explanation: `${chapterInfo[chapterKey]}: ${explanation}`,
            lesson
          });
        });
      });
    });

    return {
      title: "Kiểm tra tổng hợp · 5 chương",
      studyPage: "lop-8/index.html",
      questions
    };
  }

  // Tạo thẻ câu hỏi, lựa chọn và vùng hiển thị phản hồi.
  function createQuestion(question, index, lesson) {
    const card = document.createElement("article");
    card.className = "question-card";
    card.dataset.answer = String(question.answer);
    card.dataset.correctLabel = question.choices[question.answer];
    card.dataset.explanation = question.explanation;

    const tag = document.createElement("span");
    tag.className = "question-tag";
    tag.textContent = `Câu ${index + 1}`;
    card.appendChild(tag);

    const heading = document.createElement("h2");
    heading.textContent = question.prompt;
    card.appendChild(heading);

    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = "Chọn một đáp án.";
    fieldset.appendChild(legend);

    question.choices.forEach(function(choice, choiceIndex) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `question-${index + 1}`;
      input.value = String(choiceIndex);
      label.append(input, document.createTextNode(` ${choice}`));
      fieldset.appendChild(label);
    });

    card.appendChild(fieldset);
    const feedback = document.createElement("p");
    feedback.className = "answer-feedback";
    feedback.setAttribute("aria-live", "polite");
    card.appendChild(feedback);

    // Nút quay về trang bài học, chỉ hiện khi câu trả lời sai.
    const reviewLink = document.createElement("a");
    reviewLink.className = "site-secondary-link lesson-review-link";
    reviewLink.href = lesson.href;
    reviewLink.textContent = `Quay lại ${lesson.title}`;
    reviewLink.hidden = true;
    card.appendChild(reviewLink);

    return card;
  }

  // Hiển thị bài kiểm tra được chọn và xử lý nộp/làm lại bài.
  function renderChapterTest(chapterKey) {
    const chapter = chapterKey === "TONG" ? buildOverallTest() : CHAPTER_TESTS[chapterKey];
    const isOverallTest = chapterKey === "TONG";
    const title = document.getElementById("test-title");
    const description = document.getElementById("test-description");
    const selection = document.getElementById("chapter-test-list");
    const error = document.getElementById("test-error");
    const panel = document.getElementById("test-panel");
    const studyLink = document.getElementById("chapter-study-link");
    const form = document.getElementById("chapter-quiz");
    const result = document.getElementById("quiz-result");

    if (!chapter) {
      error.hidden = false;
      error.textContent = "Không tìm thấy chương cần kiểm tra. Hãy chọn một chương trong danh sách.";
      return;
    }

    title.textContent = isOverallTest ? chapter.title : `Bài kiểm tra ${chapter.title}`;
    description.textContent = isOverallTest
      ? `Bài kiểm tra có ${chapter.questions.length} câu: 38 câu cho mỗi chương. Nộp bài để xem điểm và giải thích từng câu.`
      : `Trả lời ${chapter.questions.length} câu trắc nghiệm rồi nộp bài để xem điểm và lời giải cho từng câu.`;
    studyLink.href = chapter.studyPage;
    studyLink.hidden = false;
    selection.hidden = true;
    panel.hidden = false;

    chapter.questions.forEach(function(question, index) {
      const lesson = question.lesson || CHAPTER_LESSONS[chapterKey][QUESTION_LESSON_INDEX[chapterKey][index]];
      form.appendChild(createQuestion(question, index, lesson));
    });

    // Chấm từng câu, đánh dấu lựa chọn và hiển thị lời giải.
    form.addEventListener("submit", function(event) {
      event.preventDefault();
      const questions = Array.from(form.querySelectorAll(".question-card"));
      let score = 0;
      let answered = 0;
      let hasWrongAnswer = false;

      questions.forEach(function(card) {
        const selected = card.querySelector('input[type="radio"]:checked');
        const feedback = card.querySelector(".answer-feedback");
        const reviewLink = card.querySelector(".lesson-review-link");
        const isCorrect = selected && selected.value === card.dataset.answer;
        reviewLink.hidden = true;

        if (selected) {
          answered += 1;
        }

        if (isCorrect) {
          score += 1;
          card.classList.add("is-correct");
          card.classList.remove("is-incorrect");
          feedback.textContent = `Đúng. ${card.dataset.explanation}`;
        } else {
          card.classList.add("is-incorrect");
          card.classList.remove("is-correct");
          if (selected) {
            hasWrongAnswer = true;
            reviewLink.hidden = false;
          }
          feedback.textContent = selected
            ? `Chưa đúng. Đáp án: ${card.dataset.correctLabel}. ${card.dataset.explanation}`
            : `Chưa trả lời. Đáp án: ${card.dataset.correctLabel}. ${card.dataset.explanation}`;
        }
      });

      // Thông báo chatbot và tự mở khung chat nếu có câu đã chọn sai.
      if (hasWrongAnswer) {
        document.dispatchEvent(new CustomEvent("quiz:wrong-answer"));
      }
      result.textContent = `Kết quả ${chapter.title}: đúng ${score}/${questions.length}; đã trả lời ${answered}/${questions.length} câu. Xem lời giải ngay dưới từng câu.`;
    });

    // Xóa lựa chọn và phản hồi để người học làm lại bài.
    document.getElementById("quiz-reset").addEventListener("click", function() {
      form.reset();
      form.querySelectorAll(".question-card").forEach(function(card) {
        card.classList.remove("is-correct", "is-incorrect");
        card.querySelector(".answer-feedback").textContent = "";
        card.querySelector(".lesson-review-link").hidden = true;
      });
      result.textContent = `Bài làm đã được xóa. Chọn đáp án cho cả ${chapter.questions.length} câu rồi nộp bài.`;
    });
  }

  // Đọc mã chương trên URL và khởi tạo bài kiểm tra tương ứng.
  document.addEventListener("DOMContentLoaded", function() {
    const chapterKey = new URLSearchParams(window.location.search).get("chuong");

    if (chapterKey) {
      const normalizedKey = chapterKey.toUpperCase();

      if (CHAPTER_TESTS[normalizedKey]) {
        document.body.dataset.chapter = normalizedKey;
      }

      renderChapterTest(normalizedKey);
    }
  });
})();
