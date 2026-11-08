const crypto = require("node:crypto");

const {
  COMPREHENSIVE_QUESTION_BANK,
  LESSON_QUESTION_BANK,
  CHAPTER_KEYS,
  CHAPTER_EXTRA_QUESTIONS,
} = require("./quiz-bank");
const { getFirestore } = require("./firebase-admin");
// ========================================
// CẤU HÌNH BÀI KIỂM TRA
// ========================================

const CHAPTER_INFO = {
  I: {
    title: "Chương I · Vẽ kĩ thuật",
    studyPage: "lop-8/chuong-i.html",
  },
  II: {
    title: "Chương II · Cơ khí",
    studyPage: "lop-8/chuong-ii.html",
  },
  III: {
    title: "Chương III · An toàn điện",
    studyPage: "lop-8/chuong-iii.html",
  },
  IV: {
    title: "Chương IV · Kĩ thuật điện",
    studyPage: "lop-8/chuong-iv.html",
  },
  V: {
    title: "Chương V · Thiết kế kĩ thuật",
    studyPage: "lop-8/chuong-v.html",
  },
};

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
    { title: "Bài 8: Gia công cơ khí bằng tay", href: "lop-8/chuong-ii.html" },
    {
      title: "Bài 9: Ngành nghề trong lĩnh vực cơ khí",
      href: "lop-8/chuong-ii.html",
    },
  ],
  III: [
    { title: "Bài 11: Tai nạn điện", href: "lop-8/chuong-iii.html" },
    { title: "Bài 12: Biện pháp an toàn điện", href: "lop-8/chuong-iii.html" },
    {
      title: "Bài 13: Sơ cứu người bị tai nạn điện",
      href: "lop-8/chuong-iii.html",
    },
  ],
  IV: [
    { title: "Bài 14: Giới thiệu về mạch điện", href: "lop-8/chuong-iv.html" },
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

const OVERALL_LESSON_BREAKS = {
  I: [5, 10, 14, 19],
  II: [5, 10, 15, 19],
  III: [7, 13, 19],
  IV: [6, 11, 16, 19],
  V: [6, 12, 16, 19],
};

const QUESTION_LESSON_INDEX = {
  I: [0, 0, 1, 2, 1],
  II: [0, 1, 1, 2, 2],
  III: [0, 1, 0, 1, 2],
  IV: [0, 0, 0, 0, 2],
  V: [0, 0, 1, 1, 2],
};

// ========================================
// HÀM HỖ TRỢ
// ========================================

function getLessonForTopic(chapterKey, topicIndex) {
  const breaks = OVERALL_LESSON_BREAKS[chapterKey];

  const lessonGroup = breaks.findIndex(
    (lastTopicIndex) => topicIndex < lastTopicIndex,
  );

  return CHAPTER_LESSONS[chapterKey][Math.max(lessonGroup, 0)];
}

// Đưa đáp án đúng vào vị trí xác định,
// nhưng không làm thay đổi nội dung lựa chọn.
function createQuestionFromTopic(
  topic,
  prompt,
  answerPosition,
  lesson,
  prefix = "",
) {
  const [
    knowledgePrompt,
    applicationPrompt,
    sourceChoices,
    sourceAnswer,
    explanation,
  ] = topic;

  if (
    !Array.isArray(sourceChoices) ||
    !Number.isInteger(sourceAnswer) ||
    sourceAnswer < 0 ||
    sourceAnswer >= sourceChoices.length
  ) {
    throw new Error("Dữ liệu câu hỏi không hợp lệ.");
  }

  const choices = sourceChoices.filter((_, index) => index !== sourceAnswer);

  const answer = answerPosition % sourceChoices.length;

  choices.splice(answer, 0, sourceChoices[sourceAnswer]);

  return {
    prompt,
    choices,
    answer,
    explanation: `${prefix}${explanation}`,
    lesson,
  };
}

// ========================================
// TẠO ĐỀ KIỂM TRA BÀI HỌC
// ========================================

function buildLessonQuiz(lessonId) {
  const sourceQuestions = LESSON_QUESTION_BANK[lessonId];

  if (!Array.isArray(sourceQuestions) || sourceQuestions.length < 5) {
    throw new Error("Không tìm thấy đủ câu hỏi cho bài học này.");
  }

  // Xáo trộn câu hỏi và lấy đúng 5 câu.
  const selectedQuestions = [...sourceQuestions];

  for (let i = selectedQuestions.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);

    [selectedQuestions[i], selectedQuestions[j]] = [
      selectedQuestions[j],
      selectedQuestions[i],
    ];
  }

  return {
    title: `Kiểm tra bài học ${lessonId}`,
    type: "lesson",
    lessonId: String(lessonId),

    questions: selectedQuestions.slice(0, 5).map((question) => {
      // Xáo trộn lựa chọn nhưng vẫn giữ đúng đáp án.
      const choices = question.choices.map((text, index) => ({
        text,
        isCorrect: index === question.answer,
      }));

      for (let i = choices.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);

        [choices[i], choices[j]] = [choices[j], choices[i]];
      }

      return {
        prompt: question.question,
        choices: choices.map((choice) => choice.text),
        answer: choices.findIndex((choice) => choice.isCorrect),
        explanation: question.explanation,
        lesson: null,
      };
    }),
  };
}

// ========================================
// TẠO ĐỀ KIỂM TRA CHƯƠNG
// ========================================

function buildChapterQuiz(chapterKey) {
  const chapter = CHAPTER_INFO[chapterKey];
  const topics = COMPREHENSIVE_QUESTION_BANK[chapterKey];

  if (!chapter || !Array.isArray(topics)) {
    throw new Error("Chương kiểm tra không hợp lệ.");
  }

  const questions = [];

  const topicIndexes =
    chapterKey === "V"
      ? Array.from({ length: 15 }, (_, index) =>
          Math.floor((index * topics.length) / 15),
        )
      : topics.map((_, index) => index);

  topicIndexes.forEach((topicIndex) => {
    const topic = topics[topicIndex];
    const lesson = getLessonForTopic(chapterKey, topicIndex);

    const [knowledgePrompt, applicationPrompt] = topic;

    [knowledgePrompt, applicationPrompt].forEach((prompt) => {
      questions.push(
        createQuestionFromTopic(
          topic,
          prompt,
          questions.length,
          lesson,
          `${chapter.title}: `,
        ),
      );
    });
  });

  // Giữ nguyên hành vi cũ:
  // Chương I–IV thêm 2 câu bổ sung đầu tiên.
  if (chapterKey !== "V") {
    CHAPTER_EXTRA_QUESTIONS[chapterKey]
      .slice(0, 2)
      .forEach((question, index) => {
        const lessonIndex = QUESTION_LESSON_INDEX[chapterKey][index];

        questions.push({
          prompt: question.prompt,
          choices: [...question.choices],
          answer: question.answer,
          explanation: `${chapter.title}: ${question.explanation}`,
          lesson: CHAPTER_LESSONS[chapterKey][lessonIndex],
        });
      });
  }

  return {
    title: chapter.title,
    type: "chapter",
    chapterId: chapterKey,
    studyPage: chapter.studyPage,
    questions,
  };
}

// ========================================
// TẠO ĐỀ KIỂM TRA TỔNG HỢP
// ========================================

function buildOverallQuiz() {
  const questions = [];

  CHAPTER_KEYS.forEach((chapterKey) => {
    const topics = COMPREHENSIVE_QUESTION_BANK[chapterKey];
    const chapter = CHAPTER_INFO[chapterKey];

    topics.forEach((topic, topicIndex) => {
      const lesson = getLessonForTopic(chapterKey, topicIndex);

      const [knowledgePrompt, applicationPrompt] = topic;

      [knowledgePrompt, applicationPrompt].forEach((prompt) => {
        questions.push(
          createQuestionFromTopic(
            topic,
            prompt,
            questions.length,
            lesson,
            `${chapter.title}: `,
          ),
        );
      });
    });
  });

  return {
    title: "Kiểm tra tổng hợp · 5 chương",
    type: "overall",
    studyPage: "lop-8/index.html",
    questions,
  };
}

// ========================================
// QUẢN LÝ PHIÊN KIỂM TRA// ========================================
// QUẢN LÝ PHIÊN KIỂM TRA BẰNG FIRESTORE
// ========================================

const SESSION_DURATION = 30 * 60 * 1000;
const PROCESSING_LOCK_DURATION = 2 * 60 * 1000;

const QUIZ_SESSION_COLLECTION = "quizSessions";

// Tạo phiên kiểm tra và lưu toàn bộ đáp án ở Backend.
async function startQuiz({ uid, type, id }) {
  if (!uid) {
    throw new Error("Bạn cần đăng nhập để làm bài.");
  }

  let quiz;

  if (type === "lesson") {
    quiz = buildLessonQuiz(id);
  } else if (type === "chapter") {
    quiz = buildChapterQuiz(String(id).toUpperCase());
  } else if (type === "overall") {
    quiz = buildOverallQuiz();
  } else {
    throw new Error("Loại bài kiểm tra không hợp lệ.");
  }

  const quizId = crypto.randomUUID();
  const now = Date.now();

  const session = {
    uid,
    type: quiz.type,
    lessonId: quiz.lessonId || null,
    chapterId: quiz.chapterId || null,
    questions: quiz.questions,
    createdAt: now,
    expiresAt: now + SESSION_DURATION,
    processing: false,
    processingAt: null,
    submitted: false
  };

  const db = getFirestore();

  await db
    .collection(QUIZ_SESSION_COLLECTION)
    .doc(quizId)
    .set(session);

  // Không gửi đáp án và lời giải xuống Frontend.
  return {
    quizId,
    title: quiz.title,
    type: quiz.type,
    lessonId: quiz.lessonId || null,
    chapterId: quiz.chapterId || null,
    studyPage: quiz.studyPage || null,
    questions: quiz.questions.map((question, index) => ({
      questionId: String(index),
      prompt: question.prompt,
      choices: question.choices,
      lesson: question.lesson || null
    }))
  };
}

// ========================================
// CHẤM ĐIỂM BẰNG FIRESTORE TRANSACTION
// ========================================

async function gradeQuiz({ uid, quizId, answers }) {
  if (
    typeof uid !== "string" ||
    typeof quizId !== "string"
  ) {
    throw new Error("Thông tin phiên kiểm tra không hợp lệ.");
  }

  const db = getFirestore();
  const sessionRef = db
    .collection(QUIZ_SESSION_COLLECTION)
    .doc(quizId);

  return await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists) {
      throw new Error("Không tìm thấy phiên kiểm tra hợp lệ.");
    }

    const session = snapshot.data();
    const now = Date.now();

    if (session.uid !== uid) {
      throw new Error("Không tìm thấy phiên kiểm tra hợp lệ.");
    }

    if (now > session.expiresAt) {
      throw new Error("Phiên kiểm tra đã hết hạn. Hãy làm lại bài.");
    }

    if (session.submitted) {
      throw new Error("Bài kiểm tra này đã được nộp.");
    }

    // Nếu máy chủ trước đó bị gián đoạn,
    // cho phép thử lại sau khi khóa xử lý hết hạn.
    if (
      session.processing &&
      session.processingAt &&
      now - session.processingAt < PROCESSING_LOCK_DURATION
    ) {
      throw new Error("Bài kiểm tra đang được xử lý. Vui lòng chờ.");
    }

    if (
      !Array.isArray(session.questions) ||
      !Array.isArray(answers) ||
      answers.length !== session.questions.length
    ) {
      throw new Error("Số lượng câu trả lời không hợp lệ.");
    }

    for (const answer of answers) {
      if (!Number.isInteger(answer) || answer < 0) {
        throw new Error("Dữ liệu câu trả lời không hợp lệ.");
      }
    }

    let score = 0;

    const results = session.questions.map((question, index) => {
      const selectedAnswer = answers[index];

      if (
        !Array.isArray(question.choices) ||
        !Number.isInteger(question.answer) ||
        selectedAnswer >= question.choices.length
      ) {
        throw new Error("Lựa chọn câu trả lời không hợp lệ.");
      }

      const isCorrect = selectedAnswer === question.answer;

      if (isCorrect) {
        score += 1;
      }

      return {
        questionId: String(index),
        selectedAnswer,
        correctAnswer: question.answer,
        correctLabel: question.choices[question.answer],
        isCorrect,
        explanation: question.explanation,
        lesson: question.lesson || null
      };
    });

    // Khóa phiên ngay trong transaction.
    transaction.update(sessionRef, {
      processing: true,
      processingAt: now
    });

    return {
      quizId,
      type: session.type,
      lessonId: session.lessonId,
      chapterId: session.chapterId,
      score,
      totalQuestions: session.questions.length,
      results
    };
  });
}

// ========================================
// XÁC NHẬN ĐÃ NỘP BÀI
// ========================================

async function markQuizSubmitted({ uid, quizId }) {
  const db = getFirestore();

  const sessionRef = db
    .collection(QUIZ_SESSION_COLLECTION)
    .doc(quizId);

  return await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists) {
      throw new Error("Không tìm thấy phiên kiểm tra hợp lệ.");
    }

    const session = snapshot.data();
    const now = Date.now();

    if (session.uid !== uid) {
      throw new Error("Không tìm thấy phiên kiểm tra hợp lệ.");
    }

    if (now > session.expiresAt) {
      throw new Error("Phiên kiểm tra đã hết hạn.");
    }

    if (session.submitted || !session.processing) {
      throw new Error("Trạng thái nộp bài không hợp lệ.");
    }

    transaction.update(sessionRef, {
      submitted: true,
      processing: false,
      submittedAt: now
    });

    return true;
  });
}

// ========================================
// MỞ KHÓA KHI LƯU TIẾN ĐỘ THẤT BẠI
// ========================================

async function releaseQuizSubmission({ uid, quizId }) {
  const db = getFirestore();

  const sessionRef = db
    .collection(QUIZ_SESSION_COLLECTION)
    .doc(quizId);

  return await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists) {
      return false;
    }

    const session = snapshot.data();

    if (session.uid !== uid || session.submitted) {
      return false;
    }

    transaction.update(sessionRef, {
      processing: false,
      processingAt: null
    });

    return true;
  });
}

module.exports = {
  startQuiz,
  gradeQuiz,
  markQuizSubmitted,
  releaseQuizSubmission
};