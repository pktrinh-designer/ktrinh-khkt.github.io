/* ========================================
   CONGNGHE8 - AUTHENTICATION
======================================== */

const authService = window.firebaseAuth;
const dbService = window.firebaseDB;

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");
const guestLoginButton = document.getElementById("guestLoginButton");

let loginSubmissionInProgress = false;

// ========================================
// ĐIỀU HƯỚNG THEO VAI TRÒ
// ========================================

async function redirectUserByRole(user) {
  try {
    // Khách không cần hồ sơ học sinh trong Firestore.
    if (user.isAnonymous) {
      window.location.replace("trangtieude.html");
      return;
    }

    // Lấy ID Token mới nhất.
    const token = await user.getIdToken(true);

    // 1. Kiểm tra quyền School Admin.
    const adminResponse = await fetch("/api/admin/session", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (adminResponse.status === 200) {
      window.location.replace("trangtieude.html");
      return;
    }

    if (adminResponse.status !== 403) {
      throw new Error("Không thể xác thực quyền School Admin.");
    }

    // 2. Kiểm tra quyền Teacher Admin.
    const teacherResponse = await fetch("/api/teacher/session", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (teacherResponse.status === 200) {
      window.location.replace("quantrigiaovien.html");
      return;
    }

    if (teacherResponse.status !== 403) {
      throw new Error("Không thể xác thực quyền giáo viên.");
    }

    // 3. Nếu không thuộc hai vai trò trên, kiểm tra học sinh.
    const userDoc = await dbService.collection("users").doc(user.uid).get();

    if (!userDoc.exists) {
      throw new Error("Không tìm thấy hồ sơ người dùng.");
    }

    const userData = userDoc.data();

    if (userData.roleId === 2) {
      window.location.replace("trangtieude.html");
      return;
    }

    throw new Error("Tài khoản chưa được cấp quyền truy cập phù hợp.");
  } catch (error) {
    console.error("Lỗi điều hướng theo vai trò:", error);
    showAuthMessage(error.message, true);
  }
}

// ========================================
// THEO DÕI TRẠNG THÁI ĐĂNG NHẬP
// ========================================

if (loginForm && authService) {
  authService.onAuthStateChanged((user) => {
    if (user && !loginSubmissionInProgress) {
      redirectUserByRole(user);
    }
  });
}

// ========================================
// HIỂN THỊ THÔNG BÁO
// ========================================

function showAuthMessage(message, isError = false) {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.style.color = isError ? "#fecaca" : "#bbf7d0";
}

// ========================================
// KIỂM TRA FIREBASE
// ========================================

if (!authService || !dbService) {
  showAuthMessage("Không thể kết nối Firebase. Vui lòng tải lại trang.", true);
}

// ========================================
// ĐĂNG NHẬP KHÁCH
// ========================================

if (guestLoginButton && authService) {
  guestLoginButton.addEventListener("click", async () => {
    if (loginSubmissionInProgress) return;

    loginSubmissionInProgress = true;

    guestLoginButton.disabled = true;
    guestLoginButton.textContent = "Đang vào chế độ khách...";

    try {
      // Tạo phiên Firebase Anonymous Authentication.
      const userCredential = await authService.signInAnonymously();

      if (!userCredential.user) {
        throw new Error("Không thể tạo phiên khách.");
      }

      showAuthMessage("Đang vào website với tư cách khách...");

      // Chuyển khách vào trang chủ.
      await redirectUserByRole(userCredential.user);
    } catch (error) {
      console.error("Lỗi đăng nhập khách:", error);

      let message = "Không thể đăng nhập khách. Vui lòng thử lại.";

      if (error.code === "auth/operation-not-allowed") {
        message = "Chế độ đăng nhập ẩn danh chưa được bật trong Firebase.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Lỗi kết nối mạng. Vui lòng kiểm tra Internet.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Có quá nhiều yêu cầu. Vui lòng thử lại sau.";
      }

      showAuthMessage(message, true);

      loginSubmissionInProgress = false;
    } finally {
      guestLoginButton.disabled = false;
      guestLoginButton.textContent = "Tiếp tục với tư cách khách";
    }
  });
}

// ========================================
// ĐĂNG KÝ TÀI KHOẢN
// ========================================

if (registerForm && authService && dbService) {
  registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const invitationInput = document.getElementById("teacherInvitationCode");
    const invitationCode = invitationInput ? invitationInput.value.trim() : "";

    if (password !== confirmPassword) {
      showAuthMessage("Mật khẩu xác nhận không khớp!", true);
      return;
    }

    if (invitationCode && !/^[a-f0-9]{64}$/i.test(invitationCode)) {
      showAuthMessage("Mã lời mời không hợp lệ.", true);
      return;
    }

    const submitButton = registerForm.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = "Đang tạo tài khoản...";

    try {
      // Tạo tài khoản Firebase Authentication.
      const userCredential = await authService.createUserWithEmailAndPassword(
        email,
        password,
      );

      const user = userCredential.user;

      if (invitationCode) {
        // Luồng giáo viên: lưu mã tạm trong phiên hiện tại.
        sessionStorage.setItem("teacherInvitationCode", invitationCode);

        // Không yêu cầu xác minh email.
        // Lưu mã để hoàn tất nhận lời mời ngay sau khi giáo viên đăng nhập.
        await authService.signOut();

        showAuthMessage(
          "Đã tạo tài khoản. Vui lòng đăng nhập lại để hoàn tất nhận lời mời giáo viên.",
        );
      } else {
        // Luồng học sinh: giữ nguyên cách tạo hồ sơ hiện tại.
        await dbService.collection("users").doc(user.uid).set({
          uid: user.uid,
          email: user.email,
          roleId: 2,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        await authService.signOut();

        showAuthMessage(
          "Đăng ký thành công! Đang chuyển đến trang đăng nhập...",
        );

        setTimeout(() => {
          window.location.href = "dangnhap.html";
        }, 1500);
      }
    } catch (error) {
      console.error("Lỗi đăng ký:", error);

      let message = "Đăng ký thất bại. Vui lòng thử lại.";

      if (error.code === "auth/email-already-in-use") {
        message = "Email này đã được sử dụng!";
      } else if (error.code === "auth/invalid-email") {
        message = "Địa chỉ email không hợp lệ!";
      } else if (error.code === "auth/weak-password") {
        message = "Mật khẩu quá yếu!";
      } else if (error.code === "auth/too-many-requests") {
        message = "Có quá nhiều yêu cầu. Vui lòng thử lại sau.";
      } else if (
        error.code === "permission-denied" ||
        error.code === "firestore/permission-denied"
      ) {
        message = "Firestore từ chối quyền tạo hồ sơ người dùng.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Lỗi kết nối mạng. Vui lòng thử lại.";
      } else if (error.code === "auth/operation-not-allowed") {
        message = "Phương thức đăng ký này chưa được bật trong Firebase.";
      }

      showAuthMessage(message, true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Đăng ký";
    }
  });
}

// ========================================
// ĐĂNG NHẬP TÀI KHOẢN
// ========================================

if (loginForm && authService) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const submitButton = loginForm.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = "Đang đăng nhập...";

    loginSubmissionInProgress = true;

    let shouldRedirect = false;

    try {
      // Đăng nhập Firebase.
      const userCredential = await authService.signInWithEmailAndPassword(
        email,
        password,
      );

      const user = userCredential.user;

      // Kiểm tra mã mời giáo viên đang được lưu trong phiên.
      const invitationCode = sessionStorage.getItem("teacherInvitationCode");

      if (invitationCode) {
        // Làm mới ID Token rồi gửi mã mời lên Backend.
        // Backend kiểm tra mã, email được mời, thời hạn và trạng thái sử dụng.
        const token = await user.getIdToken(true);

        const response = await fetch("/api/teacher/accept-invitation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            code: invitationCode,
          }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error || "Không thể xác nhận lời mời giáo viên.",
          );
        }

        // Chỉ xóa mã khi backend xác nhận nhận lời mời thành công.
        sessionStorage.removeItem("teacherInvitationCode");

        showAuthMessage(
          "Xác nhận lời mời thành công! Đang chuyển đến trang giáo viên...",
        );
      } else {
        showAuthMessage(
          "Đăng nhập thành công! Đang kiểm tra quyền truy cập...",
        );
      }

      // Điều hướng theo vai trò tài khoản.
      shouldRedirect = true;
      await redirectUserByRole(user);
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);

      let message = error.message || "Đăng nhập thất bại. Vui lòng thử lại.";

      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        message = "Email hoặc mật khẩu không chính xác!";
      } else if (error.code === "auth/invalid-email") {
        message = "Địa chỉ email không hợp lệ!";
      } else if (error.code === "auth/too-many-requests") {
        message = "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Lỗi kết nối mạng. Vui lòng thử lại.";
      }

      showAuthMessage(message, true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Đăng nhập";

      loginSubmissionInProgress = false;

      // Nếu xử lý thất bại, không tự điều hướng lại bằng listener.
      if (!shouldRedirect && authService.currentUser) {
        await authService.signOut();
      }
    }
  });
}
