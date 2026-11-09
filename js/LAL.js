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

  // Cập nhật thanh tiến độ trên giao diện.
  function updateProgress() {
    const total = lessonCards.length;

    const completed = lessonCards.filter((card) => {
      const id = Number(
        card.querySelector(".lesson-number")?.textContent.match(/\d+/)?.[0]
      );

      return completedLessons.includes(id);
    }).length;

    const percent = total > 0
      ? Math.round((completed / total) * 100)
      : 0;

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
  }

  // Tải tiến độ của tài khoản hiện đang đăng nhập.
  async function loadLearningProgress(user) {
    completedLessons = [];

    if (!user) {
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

  // Theo dõi trạng thái đăng nhập.
  if (auth && db) {
    auth.onAuthStateChanged(async (user) => {
      currentUser = user;
      await loadLearningProgress(user);
    });
  } else {
    console.error("Firebase Auth hoặc Firestore chưa được khởi tạo.");
    updateProgress();
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
          }))
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

    if (
      !Number.isInteger(lessonId) ||
      !window.LESSON_QUESTION_BANK?.[lessonId]
    ) return;

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
      `input[name="question-${index}"]:checked`
    );

    if (
      selected &&
      question.options[Number(selected.value)].isCorrect
    ) {
      score++;
    }
  });

  const result = document.createElement("p");
  result.textContent = `Kết quả: ${score}/5 câu đúng.`;

  // Chỉ hoàn thành khi đạt từ 4/5.
  if (score >= 4) {
    result.textContent +=
      " Chúc mừng! Bạn đã đạt yêu cầu bài kiểm tra.";

    // Lấy mã bài học.
    const numberText =
      card.querySelector(".lesson-number")?.textContent || "";

    const lessonId = Number(numberText.match(/\d+/)?.[0]);
    const chapterId = getChapterId(lessonId);

    // Kiểm tra đăng nhập.
    if (!currentUser) {
      result.textContent +=
        " Vui lòng đăng nhập để lưu tiến độ học tập.";
    } else if (!db || !Number.isInteger(lessonId) || !chapterId) {
      result.textContent +=
        " Không thể xác định bài học hoặc kết nối Firestore.";

      console.error("Thiếu dữ liệu lưu tiến độ:", {
        lessonId,
        chapterId,
        dbAvailable: !!db
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
            completedAt:
              firebase.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );

        // Cập nhật danh sách bài đã hoàn thành.
        if (!completedLessons.includes(lessonId)) {
          completedLessons.push(lessonId);
        }

        // Cập nhật trạng thái bài học nếu có nút.
        const completeButton =
          card.querySelector(".lesson-complete-btn");

        if (completeButton) {
          completeButton.textContent = "✓ Đã học";
          completeButton.classList.add("is-completed");
          completeButton.setAttribute("aria-pressed", "true");
        }

        // Cập nhật thanh tiến độ.
        updateProgress();

        result.textContent +=
          " Tiến độ đã được lưu lên Firestore.";

        console.log(
          `Đã lưu tiến độ bài ${lessonId} lên Firestore. Điểm: ${score}/5`
        );

      } catch (error) {
        console.error(
          "Không thể lưu tiến độ lên Firestore:",
          error
        );

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