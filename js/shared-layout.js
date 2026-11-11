(function () {
  // Lấy tiền tố đường dẫn của trang.
  const rawPrefix = (document.body.dataset.rootPrefix || "")
    .trim()
    .replace(/\/+$/, "");
  const sharedLayoutScript = document.currentScript;
  const sharedLayoutUrl = sharedLayoutScript
    ? sharedLayoutScript.src
    : new URL("../js/shared-layout.js", window.location.href).href;

  // Chỉ cho phép truy cập công khai vào trang đăng nhập và đăng ký.
  const currentFile = window.location.pathname.split("/").pop().toLowerCase();
  const isLoginPage = currentFile === "dangnhap.html";
  const isRegisterPage = currentFile === "dangky.html";
  const isPublicAuthPage = isLoginPage || isRegisterPage;

  // Ẩn nội dung trang riêng tư trong lúc Firebase khôi phục phiên đăng nhập.
  if (!isPublicAuthPage) {
    document.documentElement.style.visibility = "hidden";
  }

  // Đường dẫn các trang chính.
  const SITE_ROUTES = Object.freeze({
    home: "trangtieude.html",
    curriculum: "lop-8/index.html",
    theory: "LAL.html",
    tests: "LAL.html",
    about: "gioithieu.html",
    guide: "huong-dan.html",
  });

  // Menu điều hướng.
  const PRIMARY_NAV = [
    { key: "home", label: "Trang chủ" },
    { key: "curriculum", label: "Mục lục" },
    { key: "theory", label: "Lý thuyết" },
    { key: "about", label: "Giới thiệu" },
    { key: "guide", label: "Cách học & an toàn" },
  ];

  // Video theo từng chương.
  const CHAPTER_VIDEOS = Object.freeze({
    I: [
      { title: "Bài 2: Hình chiếu vuông góc", id: "PmYqS5I08wg" },
      { title: "Bài 3: Bản vẽ chi tiết", id: "jobTJ-3okKs" },
      { title: "Bài 4: Bản vẽ lắp", id: "8NREvrWaXsc" },
      { title: "Bài 5: Bản vẽ nhà", id: "EoQHqUOvuhQ" },
    ],
    II: [
      { title: "Bài 6: Vật liệu cơ khí", id: "CeD_vo9UUZ8" },
      { title: "Bài 7: Truyền và biến đổi chuyển động", id: "2WWCflXI4jo" },
      { title: "Bài 8: Gia công cơ khí bằng tay", id: "iXa-lqAgVrg" },
      { title: "Bài 9: Ngành nghề trong lĩnh vực cơ khí", id: "oz-KrcBZ7mM" },
    ],
    III: [
      { title: "Bài 11: Tai nạn điện", id: "cNf3NAq1Adk" },
      { title: "Bài 12: Biện pháp an toàn điện", id: "2Ev8NNEMw6Y" },
    ],
    IV: [
      { title: "Bài 14: Giới thiệu về mạch điện", id: "2WhVUM_izQA" },
      { title: "Bài 15: Cảm biến và mô đun cảm biến", id: "8akNWvuQN80" },
      {
        title: "Bài 16: Mạch điện điều khiển sử dụng mô đun cảm biến",
        id: "-CXyxjQ3-Uk",
      },
      {
        title: "Bài 17: Ngành nghề trong lĩnh vực kĩ thuật điện",
        id: "yD9ky1akRFg",
      },
    ],
    V: [
      { title: "Bài 18: Giới thiệu về thiết kế kĩ thuật", id: "2ZVTbfEwRsg" },
      { title: "Bài 19: Các bước thiết kế kĩ thuật", id: "X7X-FWxDwh8" },
      {
        title: "Bài 20: Dự án thiết kế hệ thống tưới cây tự động",
        id: "ZN9v8OpUJRw",
      },
    ],
  });

  // Xử lý đường dẫn giữa các thư mục.
  function resolveRoute(path) {
    if (!path) return "#";
    if (!rawPrefix) return path;
    return `${rawPrefix}/${path}`;
  }

  // Tạo header.
  function renderHeader(activeKey) {
    const links = PRIMARY_NAV.map(({ key, label }) => {
      const activeClass = key === activeKey ? " is-active" : "";
      const currentPage = key === activeKey ? ' aria-current="page"' : "";

      return `
        <li>
          <a class="site-nav-link${activeClass}"
             href="${resolveRoute(SITE_ROUTES[key])}"
             ${currentPage}>
            ${label}
          </a>
        </li>
      `;
    }).join("");

    return `
      <div id="school-admin-toolbar" class="school-admin-toolbar" hidden>
        <div class="site-shell school-admin-toolbar-inner">
          <div class="school-admin-info">
            <span class="school-admin-label">SCHOOL ADMIN</span>
            <span class="school-admin-description">
              Quản trị hệ thống Công nghệ 8
            </span>
          </div>

          <a class="school-admin-dashboard" href="${resolveRoute("quantri.html")}">
            Truy cập trang quản trị →
          </a>
        </div>
      </div>

      <header class="site-header">
        <div class="site-shell site-header-inner">

          <a class="site-brand"
             href="${resolveRoute(SITE_ROUTES.home)}">
            Học <span>Công nghệ 8</span>
          </a>

          <nav class="site-nav" aria-label="Điều hướng chính">

            <button class="site-menu-toggle"
                    type="button"
                    aria-expanded="false"
                    aria-label="Mở menu">
              <span></span>
              <span></span>
              <span></span>
            </button>

            <ul class="site-nav-links">
              ${links}

              <!-- Khu vực tài khoản -->
              <li id="site-account-item"
                  class="site-account-item"
                  aria-live="polite">
                <span class="site-account-loading">
                  Đang kiểm tra tài khoản...
                </span>
              </li>

            </ul>
          </nav>
        </div>
      </header>
    `;
  }

  // Nạp JavaScript theo thứ tự.
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const absoluteSrc = new URL(src, window.location.href).href;

      const existing = Array.from(document.scripts).find(
        (script) => script.src === absoluteSrc,
      );

      if (existing && existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      if (existing && existing.dataset.loading === "true") {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = existing || document.createElement("script");

      if (!existing) {
        script.src = absoluteSrc;
        script.async = true;
        document.head.appendChild(script);
      }

      script.dataset.loading = "true";

      script.addEventListener(
        "load",
        () => {
          script.dataset.loading = "false";
          script.dataset.loaded = "true";
          resolve();
        },
        { once: true },
      );

      script.addEventListener(
        "error",
        () => {
          reject(new Error(`Không thể tải script: ${absoluteSrc}`));
        },
        { once: true },
      );
    });
  }

  // Đảm bảo Firebase đã sẵn sàng.
  async function ensureFirebaseReady() {
    if (window.firebaseAuth) {
      return window.firebaseAuth;
    }

    if (!window.firebase || !window.firebase.apps) {
      await loadScript(
        "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
      );
    }

    if (!window.firebase || typeof window.firebase.auth !== "function") {
      await loadScript(
        "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
      );
    }

    if (!window.firebase || typeof window.firebase.firestore !== "function") {
      await loadScript(
        "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js",
      );
    }

    const configUrl = new URL("firebase-config.js", sharedLayoutUrl).href;

    await loadScript(configUrl);

    if (!window.firebaseAuth) {
      throw new Error("Firebase Config chưa tạo window.firebaseAuth.");
    }

    return window.firebaseAuth;
  }

  // Hiển thị trạng thái tài khoản.
  function renderAccountState(user) {
    const accountItem = document.getElementById("site-account-item");

    if (!accountItem) return;

    accountItem.replaceChildren();

    // Chưa đăng nhập.
    if (!user) {
      const loginLink = document.createElement("a");

      loginLink.className = "site-account-login";
      loginLink.href = resolveRoute("dangnhap.html");
      loginLink.textContent = "Đăng nhập";

      accountItem.appendChild(loginLink);
      return;
    }

    // Hiển thị tên tài khoản theo loại đăng nhập.
    const email = document.createElement("span");

    email.className = "site-account-email";

    if (user.isAnonymous) {
      email.textContent = "Khách";
      email.title = "Tài khoản khách";
    } else {
      email.textContent = user.email || "Tài khoản đã đăng nhập";
      email.title = user.email || "";
    }

    accountItem.appendChild(email);

    // Tạo nút đăng xuất.
    const logoutButton = document.createElement("button");

    logoutButton.className = "site-account-logout";
    logoutButton.type = "button";
    logoutButton.textContent = "Đăng xuất";

    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = "Đang đăng xuất...";

      try {
        await window.firebaseAuth.signOut();
      } catch (error) {
        console.error("Lỗi đăng xuất:", error);

        logoutButton.disabled = false;
        logoutButton.textContent = "Đăng xuất";

        alert("Không thể đăng xuất. Vui lòng thử lại.");
      }
    });

    accountItem.appendChild(logoutButton);
  }
  // Chỉ hiển thị thanh quản trị khi server xác nhận School Admin.
  async function updateSchoolAdminToolbar(user) {
    const toolbar = document.getElementById("school-admin-toolbar");

    if (!toolbar) return;

    toolbar.hidden = true;

    if (!user) return;

    try {
      const token = await user.getIdToken();

      const response = await fetch("/api/admin/session", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toolbar.hidden = response.status !== 200;
    } catch (error) {
      console.error("Không thể xác minh quyền School Admin:", error);
      toolbar.hidden = true;
    }
  }
  // Theo dõi trạng thái đăng nhập và bảo vệ các trang riêng tư.
  async function wireAuthState() {
    try {
      const auth = await ensureFirebaseReady();

      auth.onAuthStateChanged(async (user) => {
        renderAccountState(user);
        await updateSchoolAdminToolbar(user);

        // Trang đăng nhập/đăng ký được phép truy cập khi chưa đăng nhập.
        if (isPublicAuthPage) {
          // Nếu đã đăng nhập mà vẫn mở trang đăng nhập, chuyển về trang chủ.
          if (user && isLoginPage) {
            window.location.replace(resolveRoute(SITE_ROUTES.home));
            return;
          }

          document.documentElement.style.visibility = "";
          return;
        }

        // Mọi trang còn lại đều yêu cầu người dùng đã xác thực.
        if (!user) {
          window.location.replace(resolveRoute("dangnhap.html"));
          return;
        }

        document.documentElement.style.visibility = "";
      });
    } catch (error) {
      console.error("Không thể khởi tạo trạng thái tài khoản:", error);

      renderAccountState(null);

      // Không cho hiển thị trang riêng tư nếu không xác minh được phiên.
      if (!isPublicAuthPage) {
        window.location.replace(resolveRoute("dangnhap.html"));
      } else {
        document.documentElement.style.visibility = "";
      }
    }
  }

  // Tạo footer.
  function renderFooter() {
    const primaryLinks = PRIMARY_NAV.map(({ key, label }) => {
      return `
        <a class="site-footer-link"
           href="${resolveRoute(SITE_ROUTES[key])}">
          ${label}
        </a>
      `;
    }).join("");

    return `
      <footer class="site-footer">
        <div class="site-shell">

          <div class="site-footer-grid">
            <div>
              <a class="site-brand"
                 href="${resolveRoute(SITE_ROUTES.home)}">
                Học <span>Công nghệ 8</span>
              </a>

              <p class="site-footer-text">
                Ôn tập Công nghệ 8 theo sách Kết nối tri thức
                với cuộc sống: đặc điểm, cách học và bài kiểm tra
                cho cả năm chương.
              </p>
            </div>

            <div>
              <h2 class="site-footer-title">
                Điều hướng chính
              </h2>

              <div class="site-footer-links">
                ${primaryLinks}
              </div>
            </div>
          </div>

          <p class="site-footer-note">
            © 2026 Học Công nghệ 8 · Kết nối tri thức với cuộc sống
          </p>

        </div>
      </footer>
    `;
  }

  // Xử lý menu điện thoại.
  function wireMenuToggle() {
    const menuButton = document.querySelector(".site-menu-toggle");

    const menuList = document.querySelector(".site-nav-links");

    if (!menuButton || !menuList) return;

    menuButton.addEventListener("click", function () {
      const isOpen = menuList.classList.toggle("is-open");

      menuButton.setAttribute("aria-expanded", String(isOpen));

      menuButton.setAttribute("aria-label", isOpen ? "Đóng menu" : "Mở menu");
    });

    menuList.addEventListener("click", function (event) {
      if (!event.target.closest("a, button")) return;

      menuList.classList.remove("is-open");

      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Mở menu");
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        menuList.classList.remove("is-open");

        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Mở menu");
      }
    });
  }

  // Hiển thị video theo chương.
  function renderChapterVideos() {
    const videos = CHAPTER_VIDEOS[document.body.dataset.chapter];

    const grid = document.querySelector(".site-grid");

    if (!videos || !grid) return;

    const chapterCards = Array.from(
      grid.querySelectorAll(":scope > .site-card"),
    ).slice(0, 2);

    if (chapterCards.length !== 2) return;

    chapterCards[0].classList.add("chapter-feature-card");
    chapterCards[1].classList.add("chapter-study-card");

    videos
      .slice()
      .reverse()
      .forEach(function (video) {
        const card = document.createElement("article");

        card.className = "site-card chapter-video-card";

        const badge = document.createElement("span");

        badge.className = "site-badge";
        badge.textContent = "Video bài học";

        card.appendChild(badge);

        const heading = document.createElement("h2");

        heading.textContent = video.title;

        card.appendChild(heading);

        const frame = document.createElement("iframe");

        frame.src = `https://www.youtube-nocookie.com/embed/${video.id}?rel=0`;

        frame.title = video.title;
        frame.loading = "lazy";
        frame.referrerPolicy = "strict-origin-when-cross-origin";

        frame.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

        frame.allowFullscreen = true;

        card.appendChild(frame);

        const source = document.createElement("a");

        source.className = "chapter-video-source";
        source.href = `https://www.youtube.com/watch?v=${video.id}`;

        source.target = "_blank";
        source.rel = "noopener noreferrer";
        source.textContent = "Mở video trên YouTube";

        card.appendChild(source);

        grid.insertBefore(card, chapterCards[1].nextSibling);
      });
  }

  // Khởi chạy các thành phần dùng chung.
  document.addEventListener("DOMContentLoaded", function () {
    const activeKey = document.body.dataset.navActive || "home";

    const headerHost = document.getElementById("site-header");

    const footerHost = document.getElementById("site-footer");

    if (headerHost) {
      headerHost.innerHTML = renderHeader(activeKey);
    }

    if (footerHost) {
      footerHost.innerHTML = renderFooter();
    }

    wireMenuToggle();
    wireAuthState();
    renderChapterVideos();
  });
})();
