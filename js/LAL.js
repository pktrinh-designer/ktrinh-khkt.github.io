document.addEventListener("DOMContentLoaded", () => {
  // ===== CHUYỂN ĐỔI 3 MODULE =====

  const tabButtons = document.querySelectorAll(".lal-nav-item");
  const panels = document.querySelectorAll(".lal-panel");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tab;

      tabButtons.forEach((item) => {
        item.classList.toggle("active", item === button);
      });

      panels.forEach((panel) => {
        const isActive = panel.dataset.panel === target;

        panel.hidden = !isActive;
        panel.classList.toggle("active", isActive);
      });
    });
  });

  const searchInput = document.getElementById("lessonSearch");
  const clearButton = document.getElementById("clearSearch");
  const resultText = document.getElementById("searchResult");

  const chapters = document.querySelectorAll(".chapter-section");

  const searchAvailable = !!(searchInput && clearButton && resultText);

  if (!searchAvailable) {
    console.error("Không tìm thấy các thành phần tìm kiếm bài học.");
  }

  // Chuẩn hóa văn bản: bỏ dấu tiếng Việt, chuyển thành chữ thường.
  function normalizeText(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .trim();
  }

  // Thực hiện tìm kiếm bài học.
  function searchLessons() {
    const keyword = normalizeText(searchInput.value);
    let visibleLessons = 0;

    const allLessons = [...document.querySelectorAll(".lesson-card")];

    // Ưu tiên tìm theo tên bài và số bài.
    const titleMatches = allLessons.filter((lesson) => {
      const title = normalizeText(
        lesson.querySelector("h3")?.textContent || "",
      );

      const number = normalizeText(
        lesson.querySelector(".lesson-number")?.textContent || "",
      );

      return title.includes(keyword) || number.includes(keyword);
    });

    // Nếu không có kết quả theo tên, tìm trong nội dung.
    const matchedLessons = !keyword
      ? allLessons
      : titleMatches.length > 0
        ? titleMatches
        : allLessons.filter((lesson) =>
            normalizeText(lesson.textContent).includes(keyword),
          );

    const matchedSet = new Set(matchedLessons);

    chapters.forEach((chapter) => {
      const lessons = chapter.querySelectorAll(".lesson-card");
      let chapterHasResult = false;

      lessons.forEach((lesson) => {
        const isMatch = matchedSet.has(lesson);

        lesson.hidden = !isMatch;

        if (isMatch) {
          visibleLessons++;
          chapterHasResult = true;
        }
      });

      chapter.hidden = !chapterHasResult;
    });

    resultText.textContent = keyword
      ? `Tìm thấy ${visibleLessons} bài học`
      : `Hiển thị ${visibleLessons} bài học`;

    clearButton.style.display = searchInput.value ? "block" : "none";
  }

  if (searchAvailable) {
    searchInput.addEventListener("input", searchLessons);

    clearButton.addEventListener("click", () => {
      searchInput.value = "";
      searchLessons();
      searchInput.focus();
    });
  }

  // ===== THEO DÕI TIẾN ĐỘ HỌC TẬP BẰNG FIRESTORE =====

  const lessonCards = [...document.querySelectorAll(".lesson-card")];
  const completedCount = document.getElementById("completedCount");
  const progressPercent = document.getElementById("progressPercent");
  const progressFill = document.getElementById("progressFill");
  const progressTrack = document.getElementById("progressTrack");
  // Các thành phần giao diện Learning Analytics.
  const analyticsCompleted = document.getElementById("analyticsCompleted");

  const analyticsPercent = document.getElementById("analyticsPercent");

  const analyticsRemaining = document.getElementById("analyticsRemaining");

  const analyticsProgressLabel = document.getElementById(
    "analyticsProgressLabel",
  );

  const analyticsProgressFill = document.getElementById(
    "analyticsProgressFill",
  );

  const analyticsProgressTrack = document.getElementById(
    "analyticsProgressTrack",
  );

  const analyticsChapterList = document.getElementById("analyticsChapterList");
  // Các thành phần giao diện lịch sử làm bài.
  const analyticsQuizResults = document.getElementById("analyticsQuizResults");
  const analyticsQuizFilter = document.getElementById("analyticsQuizFilter");

  const quizTotalAttempts = document.getElementById("quizTotalAttempts");
  const quizSubmittedCount = document.getElementById("quizSubmittedCount");
  const quizInProgressCount = document.getElementById("quizInProgressCount");

  let quizHistory = [];

  // Lấy Firebase Authentication và Firestore đã khởi tạo.
  const auth = window.firebaseAuth;
  const db = window.firebaseDB;

  let currentUser = null;
  let completedLessons = [];

  // Xác định chương dựa trên số bài học.
  function getChapterId(lessonId) {
    if (lessonId >= 1 && lessonId <= 5) return "chuong-1";
    if (lessonId >= 6 && lessonId <= 10) return "chuong-2";
    if (lessonId >= 11 && lessonId <= 13) return "chuong-3";
    if (lessonId >= 14 && lessonId <= 17) return "chuong-4";
    if (lessonId >= 18 && lessonId <= 20) return "chuong-5";

    return null;
  }

  // Cập nhật tiến độ Learning Hub và Learning Analytics.
  function updateProgress() {
    const total = lessonCards.length;
    const completedSet = new Set(completedLessons);

    const completed = lessonCards.filter((card) => {
      const id = Number(
        card.querySelector(".lesson-number")?.textContent.match(/\d+/)?.[0],
      );

      return completedSet.has(id);
    }).length;

    const remaining = Math.max(0, total - completed);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Cập nhật Learning Hub.
    if (completedCount) {
      completedCount.textContent = `${completed}/${total}`;
    }

    if (progressPercent) {
      progressPercent.textContent = `${percent}% hoàn thành`;
    }

    if (progressFill) {
      progressFill.style.width = `${percent}%`;
    }

    if (progressTrack) {
      progressTrack.setAttribute("aria-valuemax", String(total));
      progressTrack.setAttribute("aria-valuenow", String(completed));
    }

    // Cập nhật Learning Analytics.
    if (analyticsCompleted) {
      analyticsCompleted.textContent = `${completed}/${total}`;
    }

    if (analyticsPercent) {
      analyticsPercent.textContent = `${percent}%`;
    }

    if (analyticsRemaining) {
      analyticsRemaining.textContent = String(remaining);
    }

    if (analyticsProgressLabel) {
      analyticsProgressLabel.textContent = `${completed}/${total} bài học`;
    }

    if (analyticsProgressFill) {
      analyticsProgressFill.style.width = `${percent}%`;
    }

    if (analyticsProgressTrack) {
      analyticsProgressTrack.setAttribute("aria-valuemax", String(total));
      analyticsProgressTrack.setAttribute("aria-valuenow", String(completed));
    }

    // Thống kê tiến độ theo 5 chương.
    if (analyticsChapterList) {
      const chapters = [
        { name: "Chương I · Vẽ kĩ thuật", start: 1, end: 5 },
        { name: "Chương II · Cơ khí", start: 6, end: 10 },
        { name: "Chương III · An toàn điện", start: 11, end: 13 },
        { name: "Chương IV · Kĩ thuật điện", start: 14, end: 17 },
        { name: "Chương V · Thiết kế kĩ thuật", start: 18, end: 20 },
      ];

      analyticsChapterList.replaceChildren();

      chapters.forEach((chapter) => {
        const chapterTotal = chapter.end - chapter.start + 1;

        const chapterCompleted = completedLessons.filter(
          (id) => id >= chapter.start && id <= chapter.end,
        ).length;

        const chapterPercent = Math.round(
          (chapterCompleted / chapterTotal) * 100,
        );

        const row = document.createElement("div");
        row.className = "analytics-chapter-row";

        const heading = document.createElement("div");
        heading.className = "analytics-chapter-heading";

        const name = document.createElement("span");
        name.textContent = chapter.name;

        const count = document.createElement("span");
        count.textContent = `${chapterCompleted}/${chapterTotal} bài · ${chapterPercent}%`;

        heading.append(name, count);

        const track = document.createElement("div");
        track.className = "analytics-chapter-track";
        track.setAttribute("role", "progressbar");
        track.setAttribute("aria-label", chapter.name);
        track.setAttribute("aria-valuemin", "0");
        track.setAttribute("aria-valuemax", String(chapterTotal));
        track.setAttribute("aria-valuenow", String(chapterCompleted));

        const fill = document.createElement("div");
        fill.className = "analytics-chapter-fill";
        fill.style.width = `${chapterPercent}%`;

        track.appendChild(fill);
        row.append(heading, track);
        analyticsChapterList.appendChild(row);
      });
    }
  }

  // Tải tiến độ của tài khoản hiện đang đăng nhập.
  async function loadLearningProgress(user) {
    completedLessons = [];

    // Khách không tải hoặc lưu tiến độ học tập.
    if (!user || user.isAnonymous) {
      completedLessons = [];
      updateProgress();
      return;
    }

    try {
      const snapshot = await db
        .collection("users")
        .doc(user.uid)
        .collection("learningProgress")
        .where("status", "==", "completed")
        .get();

      completedLessons = snapshot.docs
        .map((doc) => Number(doc.id))
        .filter((id) => Number.isInteger(id) && id > 0);

      updateProgress();

      console.log("Đã tải tiến độ học tập từ Firestore:", completedLessons);
    } catch (error) {
      console.error("Không thể tải tiến độ học tập:", error);
    }
  }
  // ===== LỊCH SỬ LÀM BÀI - LEARNING ANALYTICS =====

  // Chuyển thời gian Firestore thành milliseconds.
  function getTimestampMillis(value) {
    if (!value) return 0;

    if (typeof value.toDate === "function") {
      return value.toDate().getTime();
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    if (typeof value.seconds === "number") {
      return value.seconds * 1000;
    }

    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // Định dạng ngày giờ.
  function formatQuizDate(value) {
    const millis = getTimestampMillis(value);

    if (!millis) return "Không xác định";

    return new Date(millis).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Tạo một dòng thông tin trong thẻ lịch sử.
  function createQuizDetail(label, value) {
    const item = document.createElement("div");

    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;

    const span = document.createElement("span");
    span.textContent = value;

    item.append(strong, span);
    return item;
  }

  // Hiển thị danh sách lịch sử.
  function renderQuizHistory() {
    if (!analyticsQuizResults) return;

    const submitted = quizHistory.filter((item) => item.status === "submitted");

    const inProgress = quizHistory.filter(
      (item) => item.status !== "submitted",
    );

    if (quizTotalAttempts) {
      quizTotalAttempts.textContent = String(quizHistory.length);
    }

    if (quizSubmittedCount) {
      quizSubmittedCount.textContent = String(submitted.length);
    }

    if (quizInProgressCount) {
      quizInProgressCount.textContent = String(inProgress.length);
    }

    const filterValue = analyticsQuizFilter?.value || "all";

    const filteredHistory =
      filterValue === "all"
        ? quizHistory
        : quizHistory.filter((item) => item.status === filterValue);

    analyticsQuizResults.replaceChildren();

    if (filteredHistory.length === 0) {
      const empty = document.createElement("div");
      empty.className = "analytics-quiz-empty";

      empty.textContent =
        quizHistory.length === 0
          ? "Bạn chưa có lượt làm bài nào được lưu."
          : "Không có lượt làm bài phù hợp với bộ lọc.";

      analyticsQuizResults.appendChild(empty);
      return;
    }

    filteredHistory.forEach((item) => {
      const card = document.createElement("article");
      card.className = "analytics-quiz-card";

      const header = document.createElement("div");
      header.className = "analytics-quiz-card-header";

      const title = document.createElement("h3");
      title.textContent = item.examTitle || "Bài kiểm tra";

      const status = document.createElement("span");

      if (item.status === "submitted") {
        status.className = "analytics-quiz-status is-submitted";
        status.textContent = "Đã hoàn thành";
      } else {
        status.className = "analytics-quiz-status is-progress";
        status.textContent = "Chưa hoàn thành";
      }

      header.append(title, status);

      const details = document.createElement("div");
      details.className = "analytics-quiz-details";

      const totalQuestions = Number(item.totalQuestions) || 0;
      const answered = Number(item.answered) || 0;

      details.appendChild(
        createQuizDetail(
          "Loại bài",
          item.examType === "overall" ? "Kiểm tra tổng hợp" : "Kiểm tra chương",
        ),
      );

      details.appendChild(
        createQuizDetail(
          "Số câu",
          `${answered}/${totalQuestions} câu đã trả lời`,
        ),
      );

      if (item.status === "submitted" && item.score != null) {
        details.appendChild(
          createQuizDetail("Điểm", `${item.score}/${totalQuestions}`),
        );

        if (item.percentage != null) {
          details.appendChild(createQuizDetail("Tỉ lệ", `${item.percentage}%`));
        }
      }

      // Hiển thị số lần hệ thống ghi nhận rời bài kiểm tra.
      const violationCount = Number(item.violationCount) || 0;

      details.appendChild(
        createQuizDetail("Số lần vi phạm", `${violationCount} lần`),
      );

      details.appendChild(
        createQuizDetail(
          "Thời gian",
          formatQuizDate(item.submittedAt || item.startedAt),
        ),
      );

      card.append(header, details);
      analyticsQuizResults.appendChild(card);
    });
  }

  // Tải lịch sử làm bài từ Firestore.
  async function loadQuizHistory(user) {
    console.log("[QUIZ HISTORY] Bắt đầu tải:", user?.uid);
    if (!analyticsQuizResults) return;

    quizHistory = [];

    if (!user || user.isAnonymous) {
      quizHistory = [];
      renderQuizHistory();

      const empty = analyticsQuizResults.querySelector(".analytics-quiz-empty");

      if (empty) {
        empty.textContent = user?.isAnonymous
          ? "Chế độ khách không lưu lịch sử làm bài."
          : "Vui lòng đăng nhập để xem lịch sử làm bài.";
      }

      return;
    }

    if (!db) {
      analyticsQuizResults.textContent =
        "Không thể kết nối Firestore để tải lịch sử.";
      return;
    }

    analyticsQuizResults.textContent = "Đang tải lịch sử làm bài...";

    try {
      const snapshot = await db
        .collection("users")
        .doc(user.uid)
        .collection("examResults")
        .get();
      console.log("[QUIZ HISTORY] Firestore trả về:", snapshot.size, "bản ghi");
      quizHistory = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => {
          const timeA = getTimestampMillis(a.submittedAt || a.startedAt);
          const timeB = getTimestampMillis(b.submittedAt || b.startedAt);

          return timeB - timeA;
        });

      renderQuizHistory();
    } catch (error) {
      console.error("Không thể tải lịch sử làm bài:", error);

      analyticsQuizResults.textContent =
        "Không thể tải lịch sử. Vui lòng kiểm tra kết nối hoặc quyền truy cập Firestore.";
    }
    // Tự động cập nhật lịch sử khi bắt đầu hoặc nộp bài kiểm tra.
    ["exam:started", "quiz:submitted"].forEach((eventName) => {
      document.addEventListener(eventName, () => {
        if (currentUser) {
          loadQuizHistory(currentUser);
        }
      });
    });
    // Tự động đồng bộ lịch sử khi có thay đổi trong bài kiểm tra.
    ["exam:started", "quiz:submitted", "quiz:violation"].forEach(
      (eventName) => {
        document.addEventListener(eventName, () => {
          if (currentUser) {
            loadQuizHistory(currentUser);
          }
        });
      },
    );
  }

  // Lọc lịch sử khi người dùng thay đổi lựa chọn.
  if (analyticsQuizFilter) {
    analyticsQuizFilter.addEventListener("change", renderQuizHistory);
  }
  // Theo dõi trạng thái đăng nhập.
  if (auth && db) {
    auth.onAuthStateChanged(async (user) => {
      currentUser = user;

      await loadLearningProgress(user);
      await loadQuizHistory(user);
    });
  } else {
    console.error("Firebase Auth hoặc Firestore chưa được khởi tạo.");
    updateProgress();
    loadQuizHistory(null);
  }

  // ===== HỆ THỐNG QUIZ CHO TỪNG BÀI HỌC =====

  // Trộn ngẫu nhiên một mảng.
  function shuffleArray(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  // Tạo 5 câu hỏi ngẫu nhiên, chỉ lấy trong ngân hàng của đúng bài học.
  function generateLessonQuiz(lessonId) {
    const lessonQuestions = window.LESSON_QUESTION_BANK?.[lessonId];

    if (!lessonQuestions || lessonQuestions.length < 5) {
      console.error("Ngân hàng câu hỏi chưa đủ cho bài:", lessonId);
      return [];
    }

    return shuffleArray(lessonQuestions)
      .slice(0, 5)
      .map((item) => {
        const options = shuffleArray(
          item.choices.map((text, index) => ({
            text,
            isCorrect: index === item.answer,
          })),
        );

        return {
          question: item.question,
          options,
          explanation: item.explanation,
        };
      });
  }

  // Thêm nút mở quiz vào từng bài học.
  lessonCards.forEach((card) => {
    const lessonNumberText =
      card.querySelector(".lesson-number")?.textContent || "";

    const lessonId = Number(lessonNumberText.match(/\d+/)?.[0]);

    if (!Number.isInteger(lessonId) || !window.LESSON_QUESTION_BANK?.[lessonId])
      return;

    if (card.querySelector(".lesson-quiz-btn")) return;

    const quizButton = document.createElement("button");
    quizButton.type = "button";
    quizButton.className = "lesson-quiz-btn";
    quizButton.textContent = "📝 Làm bài kiểm tra";

    const quizContainer = document.createElement("div");
    quizContainer.className = "lesson-quiz-container";
    quizContainer.hidden = true;

    card.appendChild(quizButton);
    card.appendChild(quizContainer);

    quizButton.addEventListener("click", () => {
      quizContainer.hidden = false;

      const questions = generateLessonQuiz(lessonId);

      if (questions.length !== 5) {
        quizContainer.textContent =
          "Không thể tải đủ 5 câu hỏi. Vui lòng thử lại.";
        return;
      }

      renderLessonQuiz(questions, quizContainer, card);
    });
  });

  // Hiển thị bài kiểm tra.
  function renderLessonQuiz(questions, container, card) {
    container.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent = "Bài kiểm tra 5 câu";
    container.appendChild(heading);

    const form = document.createElement("form");

    questions.forEach((question, index) => {
      const questionBlock = document.createElement("fieldset");

      const legend = document.createElement("legend");
      legend.textContent = `${index + 1}. ${question.question}`;
      questionBlock.appendChild(legend);

      question.options.forEach((option, optionIndex) => {
        const label = document.createElement("label");
        const radio = document.createElement("input");

        radio.type = "radio";
        radio.name = `question-${index}`;
        radio.value = optionIndex;
        radio.required = true;

        label.appendChild(radio);
        label.appendChild(document.createTextNode(` ${option.text}`));

        questionBlock.appendChild(label);
        questionBlock.appendChild(document.createElement("br"));
      });

      form.appendChild(questionBlock);
    });

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "Nộp bài";

    form.appendChild(submitButton);
    container.appendChild(form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      let score = 0;

      // Chấm điểm 5 câu hỏi.
      questions.forEach((question, index) => {
        const selected = form.querySelector(
          `input[name="question-${index}"]:checked`,
        );

        if (selected && question.options[Number(selected.value)].isCorrect) {
          score++;
        }
      });

      const result = document.createElement("p");
      result.textContent = `Kết quả: ${score}/5 câu đúng.`;

      // Chỉ hoàn thành khi đạt từ 4/5.
      if (score >= 4) {
        result.textContent += " Chúc mừng! Bạn đã đạt yêu cầu bài kiểm tra.";

        // Lấy mã bài học.
        const numberText =
          card.querySelector(".lesson-number")?.textContent || "";

        const lessonId = Number(numberText.match(/\d+/)?.[0]);
        const chapterId = getChapterId(lessonId);

        // Phân biệt khách và tài khoản học sinh.
        if (currentUser?.isAnonymous) {
          result.textContent +=
            " Bạn đang sử dụng chế độ khách nên tiến độ học tập không được lưu.";
        } else if (!currentUser) {
          result.textContent += " Vui lòng đăng nhập để lưu tiến độ học tập.";
        } else if (!db || !Number.isInteger(lessonId) || !chapterId) {
          result.textContent +=
            " Không thể xác định bài học hoặc kết nối Firestore.";

          console.error("Thiếu dữ liệu lưu tiến độ:", {
            lessonId,
            chapterId,
            dbAvailable: !!db,
          });
        } else {
          try {
            // Xác định document của bài học.
            const progressRef = db
              .collection("users")
              .doc(currentUser.uid)
              .collection("learningProgress")
              .doc(String(lessonId));

            // Ghi kết quả lên Firestore.
            await progressRef.set(
              {
                lessonId: String(lessonId),
                chapterId: chapterId,
                status: "completed",
                score: score,
                totalQuestions: questions.length,
                completedAt: firebase.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );

            // Cập nhật danh sách bài đã hoàn thành.
            if (!completedLessons.includes(lessonId)) {
              completedLessons.push(lessonId);
            }

            // Cập nhật trạng thái bài học nếu có nút.
            const completeButton = card.querySelector(".lesson-complete-btn");

            if (completeButton) {
              completeButton.textContent = "✓ Đã học";
              completeButton.classList.add("is-completed");
              completeButton.setAttribute("aria-pressed", "true");
            }

            // Cập nhật thanh tiến độ.
            updateProgress();

            result.textContent += " Tiến độ đã được lưu lên Firestore.";

            console.log(
              `Đã lưu tiến độ bài ${lessonId} lên Firestore. Điểm: ${score}/5`,
            );
          } catch (error) {
            console.error("Không thể lưu tiến độ lên Firestore:", error);

            result.textContent +=
              " Nhưng chưa lưu được tiến độ. Vui lòng thử lại.";
          }
        }
      } else {
        result.textContent +=
          " Bạn chưa đạt yêu cầu. Hãy ôn tập và thử lại nhé.";
      }

      container.appendChild(result);
      submitButton.disabled = true;
    });
  }

  searchLessons();
});
