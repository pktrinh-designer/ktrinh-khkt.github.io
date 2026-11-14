(function () {
  // Backend API dùng chung cho GitHub Pages và Render.
  const API_BASE_URL = (
    window.CONGNGHE8_API_BASE_URL ||
    "https://ktrinh-khkt-github-io-1.onrender.com"
  ).replace(/\/$/, "");

  // Gửi yêu cầu đến Quiz API của Backend Render.
  async function quizApi(endpoint, payload) {
    const auth = window.firebaseAuth;
    const user = auth?.currentUser;

    if (!user) {
      throw new Error("Bạn cần đăng nhập để làm bài kiểm tra.");
    }

    const idToken = await user.getIdToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Không thể kết nối hệ thống kiểm tra.");
    }

    return data;
  }
  // Ngân hàng câu hỏi theo chương, gồm đáp án, giải thích và trang ôn tập.
  const CHAPTER_TESTS = {
    I: {
      title: "Chương I · Vẽ kĩ thuật",
      studyPage: "lop-8/chuong-i.html",
      questions: [
        {
          prompt:
            "Hình chiếu vuông góc được tạo ra khi các tia chiếu như thế nào với mặt phẳng chiếu?",
          choices: [
            "Vuông góc với mặt phẳng chiếu.",
            "Song song với mặt phẳng chiếu.",
            "Tạo góc bất kì với mặt phẳng chiếu.",
          ],
          answer: 0,
          explanation:
            "Các tia chiếu vuông góc với mặt phẳng chiếu tạo nên hình chiếu vuông góc.",
        },
        {
          prompt:
            "Đường nét đứt mảnh trên bản vẽ thường biểu diễn phần nào của vật thể?",
          choices: ["Cạnh thấy.", "Cạnh khuất.", "Đường kích thước."],
          answer: 1,
          explanation:
            "Nét đứt mảnh được dùng để biểu diễn cạnh khuất trong bản vẽ.",
        },
        {
          prompt:
            "Kích thước ghi trên bản vẽ kĩ thuật thường cho biết điều gì?",
          choices: [
            "Màu sắc của vật thể.",
            "Khối lượng chính xác của vật thể.",
            "Kích thước thực của vật thể theo đơn vị quy định.",
          ],
          answer: 2,
          explanation:
            "Kích thước bản vẽ cho biết kích thước thực của chi tiết theo quy ước ghi kích thước.",
        },
        {
          prompt: "Bản vẽ lắp chủ yếu giúp người đọc hiểu thông tin nào?",
          choices: [
            "Chỉ màu sắc của sản phẩm.",
            "Quan hệ vị trí và cách lắp các chi tiết.",
            "Chỉ quy trình quảng cáo sản phẩm.",
          ],
          answer: 1,
          explanation:
            "Bản vẽ lắp thể hiện hình dạng chung và quan hệ lắp ghép giữa các chi tiết.",
        },
        {
          prompt:
            "Khi bắt đầu đọc một bản vẽ, thông tin nào nên được xem để nhận biết tên gọi và tỉ lệ?",
          choices: ["Khung tên.", "Đường gạch mặt cắt.", "Nét đứt."],
          answer: 0,
          explanation:
            "Khung tên chứa những thông tin nhận dạng cơ bản của bản vẽ.",
        },
      ],
    },
    II: {
      title: "Chương II · Cơ khí",
      studyPage: "lop-8/chuong-ii.html",
      questions: [
        {
          prompt: "Vật liệu nào sau đây thuộc nhóm kim loại đen?",
          choices: ["Cao su.", "Thép.", "Đồng."],
          answer: 1,
          explanation: "Gang và thép là các vật liệu thuộc nhóm kim loại đen.",
        },
        {
          prompt:
            "Trong bộ truyền đai, bộ phận nào truyền chuyển động giữa hai bánh đai?",
          choices: ["Ổ trục.", "Vỏ máy.", "Dây đai."],
          answer: 2,
          explanation:
            "Dây đai ôm quanh bánh dẫn và bánh bị dẫn để truyền chuyển động.",
        },
        {
          prompt:
            "Hai bánh răng ăn khớp ngoài trực tiếp thường quay theo chiều nào?",
          choices: [
            "Ngược chiều nhau.",
            "Cùng chiều nhau.",
            "Không thể truyền chuyển động.",
          ],
          answer: 0,
          explanation:
            "Khi hai bánh răng ăn khớp ngoài, chiều quay của chúng ngược nhau.",
        },
        {
          prompt:
            "Khi cưa kim loại bằng tay, cách làm nào giúp giữ phôi ổn định?",
          choices: [
            "Giữ phôi bằng tay sát đường cưa.",
            "Đặt phôi tự do trên mép bàn.",
            "Kẹp chặt phôi vào ê tô phù hợp.",
          ],
          answer: 2,
          explanation:
            "Kẹp chặt phôi giúp thao tác ổn định và giảm nguy cơ trượt gây chấn thương.",
        },
        {
          prompt: "Trước khi dùng dụng cụ gia công cơ khí, việc nào cần làm?",
          choices: [
            "Tháo bỏ bộ phận bảo vệ.",
            "Kiểm tra dụng cụ và thực hiện đúng quy tắc an toàn.",
            "Đứng trong hướng chuyển động của phôi.",
          ],
          answer: 1,
          explanation:
            "Kiểm tra tình trạng dụng cụ và tuân thủ hướng dẫn giúp hạn chế tai nạn.",
        },
      ],
    },
    III: {
      title: "Chương III · An toàn điện",
      studyPage: "lop-8/chuong-iii.html",
      questions: [
        {
          prompt: "Hành động nào có nguy cơ gây tai nạn điện?",
          choices: [
            "Dùng thiết bị đúng hướng dẫn.",
            "Báo người lớn khi thấy dây điện hỏng.",
            "Chạm vào dây dẫn bị hở khi dây đang mang điện.",
          ],
          answer: 2,
          explanation:
            "Chạm vào phần dẫn điện đang mang điện có thể làm dòng điện đi qua cơ thể.",
        },
        {
          prompt: "Vì sao không nên sử dụng thiết bị điện khi tay ướt?",
          choices: [
            "Nước và độ ẩm có thể làm tăng nguy cơ dòng điện truyền qua cơ thể.",
            "Tay ướt luôn làm thiết bị hết điện.",
            "Nước làm dây dẫn không thể nóng lên.",
          ],
          answer: 0,
          explanation:
            "Độ ẩm làm giảm khả năng cách điện của da và tăng nguy cơ điện giật.",
        },
        {
          prompt: "Khi phát hiện dây điện bị hỏng, em nên làm gì?",
          choices: [
            "Tự nối dây khi nguồn chưa ngắt.",
            "Không chạm vào và báo ngay cho người lớn hoặc giáo viên.",
            "Dùng tay kiểm tra chỗ hở.",
          ],
          answer: 1,
          explanation:
            "Cần tránh xa khu vực nguy hiểm và nhờ người có trách nhiệm xử lí an toàn.",
        },
        {
          prompt: "Găng tay cách điện phù hợp được dùng nhằm mục đích nào?",
          choices: [
            "Thay thế mọi quy tắc an toàn.",
            "Cho phép làm việc với bất kì điện áp nào.",
            "Hạn chế tiếp xúc trực tiếp với phần có nguy cơ dẫn điện khi sử dụng đúng cách.",
          ],
          answer: 2,
          explanation:
            "Dụng cụ bảo vệ hỗ trợ cách điện nhưng phải đúng loại, còn tốt và dùng đúng hướng dẫn.",
        },
        {
          prompt:
            "Nếu có người gặp sự cố điện, việc đầu tiên cần ưu tiên là gì?",
          choices: [
            "Báo người lớn/cấp cứu và không chạm trực tiếp khi nguồn điện chưa được ngắt an toàn.",
            "Nắm tay kéo người đó ra ngay.",
            "Dội nước lên khu vực có điện.",
          ],
          answer: 0,
          explanation:
            "Không chạm trực tiếp khi nguồn điện còn nguy hiểm; cần gọi người có chuyên môn và ngắt điện an toàn.",
        },
      ],
    },
    IV: {
      title: "Chương IV · Kĩ thuật điện",
      studyPage: "lop-8/chuong-iv.html",
      questions: [
        {
          prompt: "Bộ phận nào cung cấp điện năng cho mạch điện?",
          choices: ["Công tắc.", "Nguồn điện.", "Phụ tải."],
          answer: 1,
          explanation:
            "Nguồn điện cung cấp điện năng để các phần tử trong mạch hoạt động.",
        },
        {
          prompt: "Công tắc trong mạch điện có chức năng chính nào?",
          choices: [
            "Đóng hoặc ngắt mạch điện.",
            "Cung cấp điện năng.",
            "Thay thế dây dẫn.",
          ],
          answer: 0,
          explanation: "Công tắc điều khiển trạng thái đóng, ngắt của mạch.",
        },
        {
          prompt: "Vật liệu nào thường được dùng làm lõi dây dẫn điện?",
          choices: ["Cao su.", "Sứ.", "Đồng."],
          answer: 2,
          explanation: "Đồng là vật liệu dẫn điện thường dùng làm lõi dây dẫn.",
        },
        {
          prompt:
            "Điều kiện cơ bản để bóng đèn trong mạch đơn giản sáng là gì?",
          choices: [
            "Công tắc luôn mở.",
            "Mạch kín và nối đúng với nguồn điện.",
            "Không cần dây dẫn.",
          ],
          answer: 1,
          explanation:
            "Mạch phải kín, các phần tử được nối phù hợp và có nguồn điện.",
        },
        {
          prompt: "Khi lắp mạch điện học tập, nguồn nào phải được sử dụng?",
          choices: [
            "Ổ điện gia đình cắm trực tiếp.",
            "Nguồn bất kì không rõ thông số.",
            "Bộ nguồn điện áp thấp theo hướng dẫn của giáo viên.",
          ],
          answer: 2,
          explanation:
            "Chỉ thực hành với bộ nguồn điện áp thấp phù hợp; tuyệt đối không tự đấu vào điện lưới.",
        },
      ],
    },
    V: {
      title: "Chương V · Thiết kế kĩ thuật",
      studyPage: "lop-8/chuong-v.html",
      questions: [
        {
          prompt: "Thiết kế kĩ thuật thường bắt đầu từ đâu?",
          choices: [
            "Trang trí sản phẩm cuối cùng.",
            "Chọn ngẫu nhiên vật liệu.",
            "Nhận biết và xác định vấn đề hoặc nhu cầu cần giải quyết.",
          ],
          answer: 2,
          explanation:
            "Cần xác định đúng vấn đề và nhu cầu trước khi đề xuất giải pháp.",
        },
        {
          prompt: "Tiêu chí thiết kế giúp ích gì?",
          choices: [
            "Thay thế việc xác định vấn đề.",
            "Làm rõ yêu cầu để so sánh và đánh giá các phương án.",
            "Đảm bảo không cần thử nghiệm.",
          ],
          answer: 1,
          explanation:
            "Tiêu chí cho biết giải pháp cần đáp ứng những yêu cầu nào.",
        },
        {
          prompt: "Sau khi đề xuất nhiều ý tưởng, bước hợp lí tiếp theo là gì?",
          choices: [
            "So sánh các ý tưởng theo yêu cầu rồi chọn phương án phù hợp.",
            "Bỏ qua mọi tiêu chí.",
            "Kết thúc thiết kế ngay.",
          ],
          answer: 0,
          explanation:
            "Cần đánh giá ý tưởng theo tiêu chí để lựa chọn giải pháp có căn cứ.",
        },
        {
          prompt: "Vì sao cần thử nghiệm hoặc đánh giá sản phẩm thiết kế?",
          choices: [
            "Để tránh phải xác định yêu cầu.",
            "Chỉ để làm sản phẩm trông đẹp hơn.",
            "Kiểm tra mức độ đáp ứng yêu cầu và tìm điểm cần cải tiến.",
          ],
          answer: 2,
          explanation:
            "Đánh giá cho biết giải pháp hoạt động ra sao và cần điều chỉnh điểm nào.",
        },
        {
          prompt: "Nếu sản phẩm chưa đạt một tiêu chí quan trọng, nên làm gì?",
          choices: [
            "Bỏ qua kết quả kiểm tra.",
            "Điều chỉnh phương án rồi thử nghiệm, đánh giá lại.",
            "Khẳng định sản phẩm đã hoàn hảo.",
          ],
          answer: 1,
          explanation:
            "Thiết kế là quá trình có thể lặp lại để cải tiến giải pháp theo tiêu chí.",
        },
      ],
    },
  };

  // Gợi ý bài học ôn tập cho câu hỏi theo thứ tự trong từng bài kiểm tra chương.
  const QUESTION_LESSON_INDEX = {
    I: [0, 0, 1, 2, 1],
    II: [0, 1, 1, 2, 2],
    III: [0, 1, 0, 1, 2],
    IV: [0, 0, 0, 0, 2],
    V: [0, 0, 1, 1, 2],
  };

  // Các trang và tên bài học dùng cho liên kết ôn tập sau khi trả lời sai.
  const CHAPTER_LESSONS = {
    I: [
      { title: "Bài 2: Hình chiếu vuông góc", href: "lop-8/chuong-i.html" },
      { title: "Bài 3: Bản vẽ chi tiết", href: "lop-8/chuong-i.html" },
      { title: "Bài 4: Bản vẽ lắp", href: "lop-8/chuong-i.html" },
      { title: "Bài 5: Bản vẽ nhà", href: "lop-8/chuong-i.html" },
    ],
    II: [
      { title: "Bài 6: Vật liệu cơ khí", href: "lop-8/chuong-ii.html" },
      {
        title: "Bài 7: Truyền và biến đổi chuyển động",
        href: "lop-8/chuong-ii.html",
      },
      {
        title: "Bài 8: Gia công cơ khí bằng tay",
        href: "lop-8/chuong-ii.html",
      },
      {
        title: "Bài 9: Ngành nghề trong lĩnh vực cơ khí",
        href: "lop-8/chuong-ii.html",
      },
    ],
    III: [
      { title: "Bài 11: Tai nạn điện", href: "lop-8/chuong-iii.html" },
      {
        title: "Bài 12: Biện pháp an toàn điện",
        href: "lop-8/chuong-iii.html",
      },
      {
        title: "Bài 13: Sơ cứu người bị tai nạn điện",
        href: "lop-8/chuong-iii.html",
      },
    ],
    IV: [
      {
        title: "Bài 14: Giới thiệu về mạch điện",
        href: "lop-8/chuong-iv.html",
      },
      {
        title: "Bài 15: Cảm biến và mô đun cảm biến",
        href: "lop-8/chuong-iv.html",
      },
      {
        title: "Bài 16: Mạch điện điều khiển sử dụng mô đun cảm biến",
        href: "lop-8/chuong-iv.html",
      },
      {
        title: "Bài 17: Ngành nghề trong lĩnh vực kĩ thuật điện",
        href: "lop-8/chuong-iv.html",
      },
    ],
    V: [
      {
        title: "Bài 18: Giới thiệu về thiết kế kĩ thuật",
        href: "lop-8/chuong-v.html",
      },
      {
        title: "Bài 19: Các bước thiết kế kĩ thuật",
        href: "lop-8/chuong-v.html",
      },
      {
        title: "Bài 20: Dự án thiết kế hệ thống tưới cây tự động",
        href: "lop-8/chuong-v.html",
      },
    ],
  };

  // Số chủ đề đầu tiên được gắn với mỗi bài trong bài kiểm tra tổng hợp.
  const OVERALL_LESSON_BREAKS = {
    I: [5, 10, 14, 19],
    II: [5, 10, 15, 19],
    III: [7, 13, 19],
    IV: [6, 11, 16, 19],
    V: [6, 12, 16, 19],
  };

  // Ghép câu hỏi từ các chương thành bài kiểm tra tổng hợp.
  function buildOverallTest() {
    const chapterInfo = {
      I: "Chương I · Vẽ kĩ thuật",
      II: "Chương II · Cơ khí",
      III: "Chương III · An toàn điện",
      IV: "Chương IV · Kĩ thuật điện",
      V: "Chương V · Thiết kế kĩ thuật",
    };
    const questions = [];

    // Tạo cặp câu ghi nhớ/vận dụng cho từng chủ đề trong từng chương.
    Object.keys(chapterInfo).forEach(function (chapterKey) {
      const allTopics = window.COMPREHENSIVE_QUESTION_BANK?.[chapterKey] || [];
      const topics = allTopics.slice(0, 19);

      topics.forEach(function (topic, topicIndex) {
        const [
          knowledgePrompt,
          applicationPrompt,
          sourceChoices,
          sourceAnswer,
          explanation,
        ] = topic;
        const lessonGroup = OVERALL_LESSON_BREAKS[chapterKey].findIndex(
          function (lastTopicIndex) {
            return topicIndex < lastTopicIndex;
          },
        );
        const lesson =
          CHAPTER_LESSONS[chapterKey][
            Math.min(
              Math.max(lessonGroup, 0),
              CHAPTER_LESSONS[chapterKey].length - 1,
            )
          ];

        [knowledgePrompt, applicationPrompt].forEach(function (prompt) {
          const answer = questions.length % sourceChoices.length;
          const distractors = sourceChoices.filter(function (_, index) {
            return index !== sourceAnswer;
          });
          const choices = distractors.slice();
          choices.splice(answer, 0, sourceChoices[sourceAnswer]);

          questions.push({
            prompt,
            choices,
            answer,
            explanation: `${chapterInfo[chapterKey]}: ${explanation}`,
            lesson,
          });
        });
      });
    });

    return {
      title: "Kiểm tra tổng hợp · 5 chương",
      studyPage: "lop-8/index.html",
      questions,
    };
  }

  // Mỗi chương có 19 chủ đề, mỗi chủ đề gồm câu ghi nhớ và câu vận dụng.
  function buildChapterTest(chapterKey) {
    const chapter = CHAPTER_TESTS[chapterKey];
    const topics = window.COMPREHENSIVE_QUESTION_BANK?.[chapterKey] || [];
    const questions = [];
    const topicIndexes =
      chapterKey === "V"
        ? Array.from({ length: 15 }, function (_, index) {
            return Math.floor((index * topics.length) / 15);
          })
        : topics.map(function (_, index) {
            return index;
          });

    topicIndexes.forEach(function (topicIndex) {
      const topic = topics[topicIndex];
      const [
        knowledgePrompt,
        applicationPrompt,
        sourceChoices,
        sourceAnswer,
        explanation,
      ] = topic;
      const lessonGroup = OVERALL_LESSON_BREAKS[chapterKey].findIndex(
        function (lastTopicIndex) {
          return topicIndex < lastTopicIndex;
        },
      );
      const lesson =
        CHAPTER_LESSONS[chapterKey][
          Math.min(
            Math.max(lessonGroup, 0),
            CHAPTER_LESSONS[chapterKey].length - 1,
          )
        ];

      [knowledgePrompt, applicationPrompt].forEach(function (prompt) {
        const answer = questions.length % sourceChoices.length;
        const choices = sourceChoices.filter(function (_, index) {
          return index !== sourceAnswer;
        });
        choices.splice(answer, 0, sourceChoices[sourceAnswer]);
        questions.push({
          prompt,
          choices,
          answer,
          lesson,
          explanation: `${chapter.title}: ${explanation}`,
        });
      });
    });

    if (chapterKey !== "V") {
      CHAPTER_TESTS[chapterKey].questions
        .slice(0, 2)
        .forEach(function (question, index) {
          const lesson =
            CHAPTER_LESSONS[chapterKey][
              QUESTION_LESSON_INDEX[chapterKey][index]
            ];
          questions.push({
            ...question,
            lesson,
            explanation: `${chapter.title}: ${question.explanation}`,
          });
        });
    }

    return { title: chapter.title, studyPage: chapter.studyPage, questions };
  }

  // Tạo thẻ câu hỏi, lựa chọn và vùng hiển thị phản hồi.

  function createQuestion(question, index) {
    const card = document.createElement("article");
    card.className = "question-card";

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

    question.choices.forEach(function (choice, choiceIndex) {
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

    // Nút quay về bài học, chỉ hiện khi câu trả lời sai.
    const reviewLink = document.createElement("a");
    reviewLink.className = "site-secondary-link lesson-review-link";
    reviewLink.hidden = true;

    const lesson = question.lesson;

    if (lesson && lesson.href) {
      reviewLink.href = lesson.href;
      reviewLink.textContent = `Quay lại ${lesson.title}`;
    } else {
      reviewLink.hidden = true;
    }

    card.appendChild(reviewLink);

    return card;
  }

  // Xáo trộn mảng bằng Fisher-Yates.
  function shuffleArray(items) {
    const result = items.slice();

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  // Xáo trộn câu hỏi và đáp án nhưng giữ nguyên đáp án đúng.
  const lastQuestionOrders = new Map();

  function randomizeTest(test) {
    const randomizedQuestions = test.questions.map(function (question) {
      const options = question.choices.map(function (choice, index) {
        return {
          text: choice,
          correct: index === question.answer,
        };
      });

      const shuffledOptions = shuffleArray(options);

      return {
        ...question,
        choices: shuffledOptions.map((option) => option.text),
        answer: shuffledOptions.findIndex((option) => option.correct),
      };
    });

    let shuffledQuestions = shuffleArray(randomizedQuestions);

    // Tránh trường hợp ngẫu nhiên tạo lại đúng thứ tự câu hỏi của lượt trước.
    const testKey = test.title;
    const currentOrder = shuffledQuestions.map((q) => q.prompt).join("|");
    const previousOrder = lastQuestionOrders.get(testKey);

    if (
      previousOrder &&
      shuffledQuestions.length > 1 &&
      currentOrder === previousOrder
    ) {
      shuffledQuestions.push(shuffledQuestions.shift());
    }

    lastQuestionOrders.set(
      testKey,
      shuffledQuestions.map((q) => q.prompt).join("|"),
    );

    return {
      ...test,
      questions: shuffledQuestions,
    };
  }

  // Khởi tạo Assessment Center bên trong LAL.html.
  document.addEventListener("DOMContentLoaded", function () {
    const picker = document.getElementById("lal-assessment-picker");
    const testView = document.getElementById("lal-assessment-test-view");
    const form = document.getElementById("lal-assessment-form");
    const title = document.getElementById("lal-assessment-test-title");
    const description = document.getElementById(
      "lal-assessment-test-description",
    );
    const result = document.getElementById("lal-assessment-result");
    const submitButton = document.getElementById("lal-assessment-submit");
    const resetButton = document.getElementById("lal-assessment-reset");
    const backButton = document.getElementById("lal-assessment-back");

    if (!picker || !testView || !form) return;
    // Đọc chương được truyền từ trang Mục lục.
    const params = new URLSearchParams(window.location.search);
    const requestedChapter = params.get("chuong")?.toUpperCase();

    if (
      requestedChapter &&
      ["I", "II", "III", "IV", "V"].includes(requestedChapter)
    ) {
      // Chờ giao diện LAL khởi tạo xong rồi mở bài kiểm tra.
      requestAnimationFrame(() => {
        openTest(requestedChapter);

        // Chuyển sang tab Assessment Center.
        const assessmentTab = document.querySelector('[data-tab="assessment"]');

        if (assessmentTab) {
          assessmentTab.click();
        }
      });
    }

    let currentChapterKey = null;
    let currentTest = null;
    let currentQuizId = null;
    let submitted = false;

    // ===== CHẾ ĐỘ THI =====

    let examActive = false;
    let examResultId = null;
    let lastExitRecordedAt = 0;

    // Tạo màn hình bắt đầu kiểm tra.
    const startPanel = document.createElement("section");

    startPanel.className = "lal-exam-start-panel";
    startPanel.innerHTML = `
  <h2>Sẵn sàng kiểm tra?</h2>

  <p>
    Khi bắt đầu, bài kiểm tra sẽ chuyển sang chế độ toàn màn hình
    và Trợ lý AI sẽ tạm ẩn.
  </p>

<p>
  Với tài khoản học sinh, hệ thống ghi nhận số lần rời bài thi
  để giáo viên xem xét. Chế độ khách không lưu dữ liệu này.
  Số lần rời bài không tự động trừ điểm.
</p>

  <button type="button" id="lal-exam-begin">
    Bắt đầu kiểm tra
  </button>

  <p id="lal-exam-start-status" role="status"></p>
`;

    form.before(startPanel);

    // Trạng thái ban đầu.
    startPanel.hidden = true;
    form.hidden = true;
    submitButton.hidden = true;
    resetButton.hidden = true;

    const startButton = startPanel.querySelector("#lal-exam-begin");
    const startStatus = startPanel.querySelector("#lal-exam-start-status");

    // Trạng thái tạm dừng khi thoát toàn màn hình
    let examPaused = false;

    // Tạo màn hình cảnh báo
    const pauseOverlay = document.createElement("div");
    pauseOverlay.id = "lal-exam-pause-overlay";
    pauseOverlay.hidden = true;

    pauseOverlay.innerHTML = `
  <div class="lal-exam-warning">
    <div class="lal-exam-warning-icon">⚠️</div>
    <h2>Cảnh báo rời bài kiểm tra</h2>
    <p>
      Bạn đã thoát khỏi chế độ toàn màn hình trong khi
      đang làm bài kiểm tra.
    </p>
<p>
  Sự kiện được ghi vào lịch sử kiểm tra đối với tài khoản học sinh.
  Chế độ khách không lưu lịch sử hoặc số lần rời bài.
</p>
    <p id="lal-exam-resume-status" role="status">
      Vui lòng quay lại toàn màn hình để tiếp tục.
    </p>
    <button type="button" id="lal-exam-resume">
      Quay lại toàn màn hình
    </button>
  </div>
`;

    document.body.appendChild(pauseOverlay);

    const resumeButton = pauseOverlay.querySelector("#lal-exam-resume");
    const resumeStatus = pauseOverlay.querySelector("#lal-exam-resume-status");

    // Tạo bản ghi kiểm tra thông qua Backend.

    async function createExamRecord() {
      const user = window.firebaseAuth?.currentUser;

      if (!user) {
        throw new Error("Bạn cần đăng nhập để làm bài kiểm tra.");
      }

      // Guest không tạo lịch sử kiểm tra.
      if (user.isAnonymous) {
        examResultId = null;
        return;
      }

      const data = await quizApi("/api/quiz/history", {
        action: "start",
        quizId: currentQuizId,
        chapter: currentChapterKey,
        examTitle: currentTest.title,
      });

      if (!data.examResultId) {
        throw new Error("Backend chưa trả về mã lịch sử kiểm tra.");
      }

      examResultId = data.examResultId;
    }

    // Đánh dấu lượt kiểm tra đã rời bài khi chưa nộp.
    async function abandonExamRecord() {
      if (!examResultId) return;

      const examResultIdToClose = examResultId;
      examResultId = null;

      try {
        await quizApi("/api/quiz/history", {
          action: "abandon",
          examResultId: examResultIdToClose,
        });
      } catch (error) {
        console.error("Không thể cập nhật trạng thái rời bài:", error);
      }
    }

    // Ghi nhận một lần rời bài thông qua Backend.
    async function recordExamExit(type) {
      if (!examActive || !examResultId) return;

      const now = Date.now();

      // Tránh đếm trùng fullscreenchange và visibilitychange.
      if (now - lastExitRecordedAt < 1500) return;

      lastExitRecordedAt = now;

      try {
        await quizApi("/api/quiz/history", {
          action: "violation",
          examResultId,
          type,
        });

        // Thông báo cho Learning Analytics sau khi Backend ghi thành công.
        document.dispatchEvent(
          new CustomEvent("quiz:violation", {
            detail: {
              examResultId,
              type,
            },
          }),
        );

        console.log("Đã ghi nhận rời bài:", type);
      } catch (error) {
        console.error("Không thể lưu lượt rời bài:", error);
      }
    }

    // Phát hiện thoát toàn màn hình.

    document.addEventListener("fullscreenchange", () => {
      if (examActive && !document.fullscreenElement) {
        // Tạm dừng thao tác làm bài
        if (!examPaused) {
          examPaused = true;

          // Hiện cảnh báo
          pauseOverlay.hidden = false;

          // Ghi nhận vi phạm
          recordExamExit("fullscreen_exit");
        }
      }
    });

    resumeButton.addEventListener("click", async () => {
      if (!examActive || !examPaused) return;

      resumeButton.disabled = true;
      resumeStatus.textContent = "Đang khôi phục toàn màn hình...";

      try {
        await document.documentElement.requestFullscreen();

        if (!document.fullscreenElement) {
          throw new Error("Trình duyệt chưa cho phép toàn màn hình.");
        }

        // Tiếp tục bài thi
        examPaused = false;
        pauseOverlay.hidden = true;
      } catch (error) {
        resumeStatus.textContent =
          "Không thể bật toàn màn hình. Vui lòng thử lại.";

        console.error("Lỗi khôi phục fullscreen:", error);
      } finally {
        resumeButton.disabled = false;
      }
    });

    // Phát hiện chuyển tab hoặc ẩn trang.
    document.addEventListener("visibilitychange", () => {
      if (examActive && document.hidden && !examPaused) {
        examPaused = true;

        // Hiện cảnh báo khi học sinh quay lại trang thi.
        pauseOverlay.hidden = false;

        resumeStatus.textContent =
          "Sự kiện được xử lý theo chế độ tài khoản của bạn. " +
          "Vui lòng quay lại toàn màn hình để tiếp tục.";

        recordExamExit("tab_hidden");
      }
    });
    // Phát hiện khi cửa sổ trình duyệt mất tiêu điểm.
    window.addEventListener("blur", () => {
      if (examActive && !examPaused) {
        examPaused = true;

        pauseOverlay.hidden = false;

        resumeStatus.textContent =
          "Sự kiện được xử lý theo chế độ tài khoản của bạn. " +
          "Vui lòng quay lại toàn màn hình để tiếp tục.";

        // Dùng loại sự kiện đã được Backend cho phép.
        recordExamExit("tab_hidden");
      }
    });
    async function beginExam() {
      if (!currentTest || !currentQuizId || examActive) return;

      startButton.disabled = true;
      startStatus.textContent = "Đang chuẩn bị bài kiểm tra...";

      try {
        // Yêu cầu toàn màn hình từ thao tác bấm của học sinh.
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (error) {
        console.warn("Không thể bật toàn màn hình:", error);
      }

      try {
        // Tạo lượt kiểm tra trước khi cho làm bài.
        await createExamRecord();

        lastExitRecordedAt = 0;
        examActive = true;
        examPaused = false;
        pauseOverlay.hidden = true;
        startPanel.hidden = true;
        form.hidden = false;
        submitButton.hidden = false;
        resetButton.hidden = false;

        document.body.classList.add("lal-exam-active");

        document.dispatchEvent(new CustomEvent("exam:started"));

        startStatus.textContent = "Bài kiểm tra đã bắt đầu.";
      } catch (error) {
        startButton.disabled = false;

        startStatus.textContent =
          error.message || "Không thể bắt đầu bài kiểm tra.";

        console.error(error);

        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    }

    startButton.addEventListener("click", beginExam);

    function getTest(chapterKey) {
      if (chapterKey === "TONG") {
        return buildOverallTest();
      }

      if (CHAPTER_TESTS[chapterKey]) {
        return buildChapterTest(chapterKey);
      }

      return null;
    }

    async function openTest(chapterKey) {
      // Nếu lượt thi trước chưa nộp, đánh dấu là đã rời bài.
      if (examResultId && !submitted) {
        abandonExamRecord();
      }

      // Kết thúc trạng thái thi cũ.
      examActive = false;
      examResultId = null;
      lastExitRecordedAt = 0;

      document.body.classList.remove("lal-exam-active");
      document.dispatchEvent(new CustomEvent("exam:ended"));

      // Khôi phục trạng thái nút bắt đầu.
      startButton.disabled = false;
      startButton.textContent = "Bắt đầu kiểm tra";
      startStatus.textContent = "";
      examPaused = false;
      pauseOverlay.hidden = true;

      // Xác định loại bài kiểm tra.
      const type = chapterKey === "TONG" ? "overall" : "chapter";
      const id = type === "chapter" ? chapterKey : null;

      // Yêu cầu Backend tạo đề mới.
      try {
        const backendTest = await quizApi("/api/quiz/start", {
          type: type,
          id: id,
        });

        // Lưu thông tin lượt thi do Backend cấp.
        currentQuizId = backendTest.quizId;
        currentChapterKey = chapterKey;
        currentTest = backendTest;
        submitted = false;

        form.replaceChildren();
        submitButton.disabled = false;

        title.textContent = currentTest.title;

        description.textContent =
          `Bài kiểm tra gồm ${currentTest.questions.length} câu. ` +
          "Đề thi được tạo và quản lý bởi hệ thống.";

        currentTest.questions.forEach(function (question, index) {
          form.appendChild(createQuestion(question, index));
        });

        result.textContent =
          `Bài kiểm tra có ${currentTest.questions.length} câu. ` +
          "Nhấn “Bắt đầu kiểm tra” để vào bài.";

        // Hiển thị màn hình chuẩn bị.
        picker.hidden = true;
        testView.hidden = false;

        startPanel.hidden = false;
        form.hidden = true;
        submitButton.hidden = true;
        resetButton.hidden = true;

        // Đảm bảo đã thoát toàn màn hình trước khi chuẩn bị lượt mới.
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(console.error);
        }

        testView.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } catch (error) {
        console.error("Lỗi tải bài kiểm tra:", error);
        alert(error.message || "Không thể tải bài kiểm tra.");

        picker.hidden = false;
        testView.hidden = true;
      }
    }

    function returnToPicker() {
      // Nếu chưa nộp bài, lưu trạng thái rời bài.
      if (examResultId && !submitted) {
        abandonExamRecord();
      }

      examActive = false;
      examResultId = null;
      lastExitRecordedAt = 0;
      // Đặt lại trạng thái tạm dừng
      examPaused = false;
      pauseOverlay.hidden = true;

      document.body.classList.remove("lal-exam-active");
      document.dispatchEvent(new CustomEvent("exam:ended"));

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }

      startButton.disabled = false;
      startStatus.textContent = "";

      currentChapterKey = null;
      currentTest = null;
      submitted = false;

      form.replaceChildren();

      picker.hidden = false;
      testView.hidden = true;

      testView.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    // Chọn bài kiểm tra.
    picker.addEventListener("click", function (event) {
      const button = event.target.closest("[data-assessment-start]");
      if (!button) return;

      openTest(button.dataset.assessmentStart);
    });

    // Nộp bài và nhận kết quả chấm điểm từ Backend.
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (
        !currentTest ||
        !currentQuizId ||
        submitted ||
        !examActive ||
        examPaused
      ) {
        return;
      }

      const cards = Array.from(form.querySelectorAll(".question-card"));

      // Thu thập câu trả lời theo đúng thứ tự câu hỏi.
      const answers = [];
      let answered = 0;

      cards.forEach(function (card) {
        const selected = card.querySelector('input[type="radio"]:checked');

        if (selected) {
          answers.push(Number(selected.value));
          answered++;
        }
      });

      // Backend yêu cầu câu trả lời hợp lệ cho tất cả câu hỏi.
      if (answered !== cards.length) {
        result.textContent =
          `Bạn mới trả lời ${answered}/${cards.length} câu. ` +
          "Vui lòng hoàn thành tất cả câu hỏi trước khi nộp bài.";

        return;
      }

      submitButton.disabled = true;
      result.textContent = "Đang gửi bài và chấm điểm...";

      try {
        // Gửi bài làm lên Backend.
        const data = await quizApi("/api/quiz/submit", {
          quizId: currentQuizId,
          examResultId: examResultId,
          answers: answers,
        });

        // Backend đã chấm điểm thành công.
        submitted = true;
        // Thông báo cho Learning Analytics cập nhật lịch sử.
        document.dispatchEvent(new CustomEvent("quiz:submitted"));

        const score = data.score;
        const totalQuestions = data.totalQuestions;
        const percentage = Math.round((score / totalQuestions) * 100);

        let hasWrongAnswer = false;

        const isGuest = window.firebaseAuth?.currentUser?.isAnonymous === true;

        // Hiển thị kết quả theo chế độ tài khoản.
        data.results.forEach(function (item, index) {
          const card = cards[index];

          const feedback = card.querySelector(".answer-feedback");
          const reviewLink = card.querySelector(".lesson-review-link");

          // Khách không được xem lời giải hoặc liên kết ôn tập.
          if (isGuest) {
            if (reviewLink) {
              reviewLink.hidden = true;
            }

            if (item.isCorrect) {
              card.classList.add("is-correct");
              card.classList.remove("is-incorrect");

              feedback.textContent = "Chính xác!";
            } else {
              hasWrongAnswer = true;

              card.classList.add("is-incorrect");
              card.classList.remove("is-correct");

              feedback.textContent = `Sai. Đáp án đúng: ${item.correctLabel}.`;
            }

            return;
          }

          // Tài khoản học sinh giữ nguyên lời giải và liên kết ôn tập.
          if (item.isCorrect) {
            card.classList.add("is-correct");
            card.classList.remove("is-incorrect");

            feedback.textContent = `Chính xác. ${item.explanation}`;
          } else {
            hasWrongAnswer = true;

            card.classList.add("is-incorrect");
            card.classList.remove("is-correct");

            feedback.textContent =
              `Chưa chính xác. Đáp án đúng: ` +
              `${item.correctLabel}. ${item.explanation}`;

            if (reviewLink && reviewLink.href) {
              reviewLink.hidden = false;
            }
          }
        });

        // Khóa các lựa chọn sau khi nộp bài.
        form.querySelectorAll('input[type="radio"]').forEach(function (input) {
          input.disabled = true;
        });

        // Chỉ tài khoản học sinh mới được kích hoạt điều hướng ôn tập.
        if (hasWrongAnswer && !isGuest) {
          document.dispatchEvent(new CustomEvent("quiz:wrong-answer"));
        }
        result.textContent = isGuest
          ? `Kết quả: ${score}/${totalQuestions} câu đúng (${percentage}%).`
          : `Kết quả: ${score}/${totalQuestions} câu đúng (${percentage}%). Xem lời giải bên dưới từng câu.`;

        // Dừng ghi nhận sự kiện rời bài.
        examActive = false;
        examPaused = false;
        pauseOverlay.hidden = true;

        // Backend đã lưu kết quả vào examResults.
        if (isGuest) {
          result.textContent +=
            " Bạn đang sử dụng chế độ khách, kết quả không được lưu.";
        } else if (data.historySaved) {
          result.textContent += " Kết quả đã được lưu.";
        } else {
          result.textContent += " Chưa xác nhận được việc lưu lịch sử.";
        }

        // Khôi phục giao diện sau khi nộp.
        document.body.classList.remove("lal-exam-active");

        document.dispatchEvent(new CustomEvent("exam:ended"));

        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        result.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } catch (error) {
        console.error("Lỗi nộp bài:", error);

        result.textContent =
          error.message || "Không thể nộp bài. Vui lòng thử lại.";

        submitButton.disabled = false;
      }
    });

    // Làm lại: tạo lượt mới và xáo trộn lại cả câu hỏi lẫn đáp án.
    resetButton.addEventListener("click", function () {
      if (!currentChapterKey) return;
      openTest(currentChapterKey);
    });

    // Thoát bài kiểm tra để chọn đề khác.
    backButton.addEventListener("click", returnToPicker);

    // Tự động mở bài kiểm tra khi truy cập từ trang Mục lục.
    requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedChapter = params.get("chuong")?.toUpperCase();

      const validChapters = ["I", "II", "III", "IV", "V"];

      if (!validChapters.includes(requestedChapter)) return;

      // Chuyển sang tab Assessment Center.
      const assessmentTab = document.querySelector(
        '.lal-nav-item[data-tab="assessment"]',
      );

      if (assessmentTab) {
        assessmentTab.click();
      }

      // Mở bài kiểm tra tương ứng.
      openTest(requestedChapter);
    });
  });
})();
