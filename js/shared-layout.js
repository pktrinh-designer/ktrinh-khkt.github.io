(function() {
  // Lấy tiền tố đường dẫn của trang và bỏ dấu / thừa ở cuối.
  // Các trang trong thư mục con dùng tiền tố này để liên kết về đúng vị trí.
  const rawPrefix = (document.body.dataset.rootPrefix || "").trim().replace(/\/+$/, "");

  // Đường dẫn tương đối của các trang chính trong website.
  const SITE_ROUTES = Object.freeze({
    home: "trangtieude.html",
    curriculum: "lop-8/index.html",
    theory: "lythuyet.html",
    tests: "kiem-tra.html",
    about: "gioithieu.html",
    guide: "huong-dan.html"
  });

  // Dữ liệu dùng chung để tạo các liên kết trên thanh điều hướng và chân trang.
  const PRIMARY_NAV = [
    { key: "home", label: "Trang chủ" },
    { key: "curriculum", label: "Mục lục" },
    { key: "theory", label: "Lý thuyết" },
    { key: "tests", label: "Kiểm tra chương" },
    { key: "about", label: "Giới thiệu" },
    { key: "guide", label: "Cách học & an toàn" }
  ];
  // Danh sách video theo chương. Mỗi ID là phần mã video trong URL YouTube.
  // Chỉ các bài được liệt kê ở đây mới được hiển thị trên trang chương.
  const CHAPTER_VIDEOS = Object.freeze({
    I: [
      { title: "Bài 2: Hình chiếu vuông góc", id: "PmYqS5I08wg" },
      { title: "Bài 3: Bản vẽ chi tiết", id: "jobTJ-3okKs" },
      { title: "Bài 4: Bản vẽ lắp", id: "8NREvrWaXsc" },
      { title: "Bài 5: Bản vẽ nhà", id: "EoQHqUOvuhQ" }
    ],
    II: [
      { title: "Bài 6: Vật liệu cơ khí", id: "CeD_vo9UUZ8" },
      { title: "Bài 7: Truyền và biến đổi chuyển động", id: "2WWCflXI4jo" },
      { title: "Bài 8: Gia công cơ khí bằng tay", id: "iXa-lqAgVrg" },
      { title: "Bài 9: Ngành nghề trong lĩnh vực cơ khí", id: "oz-KrcBZ7mM" }
    ],
    III: [
      { title: "Bài 11: Tai nạn điện", id: "cNf3NAq1Adk" },
      { title: "Bài 12: Biện pháp an toàn điện", id: "2Ev8NNEMw6Y" }
    ],
    IV: [
      { title: "Bài 14: Giới thiệu về mạch điện", id: "2WhVUM_izQA" },
      { title: "Bài 15: Cảm biến và mô đun cảm biến", id: "8akNWvuQN80" },
      { title: "Bài 16: Mạch điện điều khiển sử dụng mô đun cảm biến", id: "-CXyxjQ3-Uk" },
      { title: "Bài 17: Ngành nghề trong lĩnh vực kĩ thuật điện", id: "yD9ky1akRFg" }
    ],
    V: [
      { title: "Bài 18: Giới thiệu về thiết kế kĩ thuật", id: "2ZVTbfEwRsg" },
      { title: "Bài 19: Các bước thiết kế kĩ thuật", id: "X7X-FWxDwh8" },
      { title: "Bài 20: Dự án thiết kế hệ thống tưới cây tự động", id: "ZN9v8OpUJRw" }
    ]
  });

  // Ghép tiền tố thư mục với đường dẫn trang; nếu không có tiền tố thì giữ nguyên.
  // Trả về dấu # khi nhận đường dẫn rỗng để tránh tạo liên kết không hợp lệ.
  function resolveRoute(path) {
    if (!path) {
      return "#";
    }

    if (!rawPrefix) {
      return path;
    }

    return `${rawPrefix}/${path}`;
  }

  // Tạo nội dung HTML cho phần đầu trang và đánh dấu trang đang được mở.
  function renderHeader(activeKey) {
    // Tạo từng liên kết điều hướng; thêm trạng thái hiện tại cho mục đang hoạt động.
    const links = PRIMARY_NAV.map(({ key, label }) => {
      const activeClass = key === activeKey ? " is-active" : "";
      const currentPage = key === activeKey ? ' aria-current="page"' : "";

      return `
        <li>
          <a class="site-nav-link${activeClass}" href="${resolveRoute(SITE_ROUTES[key])}"${currentPage}>
            ${label}
          </a>
        </li>
      `;
    }).join("");

    return `
      <header class="site-header">
        <div class="site-shell site-header-inner">
          <a class="site-brand" href="${resolveRoute(SITE_ROUTES.home)}">Học <span>Công nghệ 8</span></a>
          <nav class="site-nav" aria-label="Điều hướng chính">
            <button class="site-menu-toggle" type="button" aria-expanded="false" aria-label="Mở menu">
              <span></span>
              <span></span>
              <span></span>
            </button>
            <ul class="site-nav-links">
              ${links}
            </ul>
          </nav>
        </div>
      </header>
    `;
  }

  // Tạo phần chân trang và danh sách liên kết dùng chung.
  function renderFooter() {
    // Chuyển dữ liệu điều hướng thành các liên kết chân trang.
    const primaryLinks = PRIMARY_NAV.map(({ key, label }) => {
      return `<a class="site-footer-link" href="${resolveRoute(SITE_ROUTES[key])}">${label}</a>`;
    }).join("");

    return `
      <footer class="site-footer">
        <div class="site-shell">
          <div class="site-footer-grid">
            <div>
              <a class="site-brand" href="${resolveRoute(SITE_ROUTES.home)}">Học <span>Công nghệ 8</span></a>
              <p class="site-footer-text">
                Ôn tập Công nghệ 8 theo sách Kết nối tri thức với cuộc sống: đặc điểm, cách học và bài kiểm tra cho cả năm chương.
              </p>
            </div>
            <div>
              <h2 class="site-footer-title">Điều hướng chính</h2>
              <div class="site-footer-links">
                ${primaryLinks}
              </div>
            </div>
          </div>
          <p class="site-footer-note">© 2026 Học Công nghệ 8 · Kết nối tri thức với cuộc sống</p>
        </div>
      </footer>
    `;
  }

  // Gắn các thao tác mở/đóng menu cho thanh điều hướng trên màn hình nhỏ.
  function wireMenuToggle() {
    const menuButton = document.querySelector(".site-menu-toggle");
    const menuList = document.querySelector(".site-nav-links");

    // Không gắn sự kiện nếu trang hiện tại không có nút hoặc danh sách menu.
    if (!menuButton || !menuList) {
      return;
    }

    menuButton.addEventListener("click", function() {
      // Đổi trạng thái menu và đồng bộ thông tin hỗ trợ trình đọc màn hình.
      const isOpen = menuList.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Đóng menu" : "Mở menu");
    });

    menuList.addEventListener("click", function(event) {
      // Chỉ đóng menu khi người dùng chọn một liên kết bên trong menu.
      if (!event.target.closest("a")) {
        return;
      }

      menuList.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Mở menu");
    });

    document.addEventListener("keydown", function(event) {
      // Cho phép đóng menu bằng phím Escape.
      if (event.key === "Escape") {
        menuList.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Mở menu");
      }
    });
  }

  // Thêm thẻ video của chương vào lưới nội dung có sẵn trong trang HTML.
  function renderChapterVideos() {
    // Lấy mã chương từ thuộc tính data-chapter trên thẻ body.
    const videos = CHAPTER_VIDEOS[document.body.dataset.chapter];
    const grid = document.querySelector(".site-grid");

    // Dừng nếu chương chưa có danh sách video hoặc thiếu vùng lưới để chèn nội dung.
    if (!videos || !grid) {
      return;
    }

    // Hai thẻ đầu tiên của lưới là phần giới thiệu và cách học của chương.
    const chapterCards = Array.from(grid.querySelectorAll(":scope > .site-card")).slice(0, 2);

    // Không thêm video nếu trang không có đủ hai thẻ nội dung cơ bản.
    if (chapterCards.length !== 2) {
      return;
    }

    // Gắn kiểu riêng để CSS phân biệt hai thẻ mở đầu chương.
    chapterCards[0].classList.add("chapter-feature-card");
    chapterCards[1].classList.add("chapter-study-card");

    // Duyệt ngược rồi luôn chèn sau thẻ thứ hai để giữ thứ tự video như danh sách.
    videos.slice().reverse().forEach(function(video) {
      const card = document.createElement("article");
      card.className = "site-card chapter-video-card";

      // Nhãn cho biết đây là nội dung video bài học.
      const badge = document.createElement("span");
      badge.className = "site-badge";
      badge.textContent = "Video bài học";
      card.appendChild(badge);

      // Tiêu đề video lấy trực tiếp từ dữ liệu của chương.
      const heading = document.createElement("h2");
      heading.textContent = video.title;
      card.appendChild(heading);

      // Nhúng trình phát YouTube với chế độ riêng tư nâng cao và tải trễ.
      const frame = document.createElement("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${video.id}?rel=0`;
      frame.title = video.title;
      frame.loading = "lazy";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      card.appendChild(frame);

      // Thêm liên kết mở video trực tiếp trên YouTube bên dưới trình phát.
      const source = document.createElement("a");
      source.className = "chapter-video-source";
      source.href = `https://www.youtube.com/watch?v=${video.id}`;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = "Mở video trên YouTube";
      card.appendChild(source);

      // Chèn video ngay sau hai thẻ giới thiệu/cách học của chương.
      grid.insertBefore(card, chapterCards[1].nextSibling);
    });
  }

  // Chờ HTML được phân tích xong rồi mới dựng header, footer và video.
  document.addEventListener("DOMContentLoaded", function() {
    // Đọc mục điều hướng đang hoạt động; mặc định về trang chủ nếu chưa khai báo.
    const activeKey = document.body.dataset.navActive || "home";
    const headerHost = document.getElementById("site-header");
    const footerHost = document.getElementById("site-footer");

    // Chỉ kết xuất vào những vị trí được khai báo trong trang HTML.
    if (headerHost) {
      headerHost.innerHTML = renderHeader(activeKey);
    }

    if (footerHost) {
      footerHost.innerHTML = renderFooter();
    }

    // Hoàn tất các hành vi tương tác và nội dung video của trang hiện tại.
    wireMenuToggle();
    renderChapterVideos();
  });
})();
