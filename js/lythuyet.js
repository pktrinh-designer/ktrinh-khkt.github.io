
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("lessonSearch");
  const clearButton = document.getElementById("clearSearch");
  const resultText = document.getElementById("searchResult");

  const chapters = document.querySelectorAll(".chapter-section");

  if (!searchInput || !clearButton || !resultText) {
    console.error("Không tìm thấy các thành phần tìm kiếm bài học.");
    return;
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
      lesson.querySelector("h3")?.textContent || ""
    );

    const number = normalizeText(
      lesson.querySelector(".lesson-number")?.textContent || ""
    );

    return title.includes(keyword) || number.includes(keyword);
  });

  // Nếu không có kết quả theo tên, tìm trong nội dung.
  const matchedLessons = !keyword
    ? allLessons
    : titleMatches.length > 0
      ? titleMatches
      : allLessons.filter((lesson) =>
          normalizeText(lesson.textContent).includes(keyword)
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


  // Tìm kiếm khi người dùng nhập.
  searchInput.addEventListener("input", searchLessons);

  // Xóa nội dung tìm kiếm.
  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    searchLessons();
    searchInput.focus();
  });

  // Khởi tạo trạng thái ban đầu.
  searchLessons();
});
