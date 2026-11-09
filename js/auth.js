
/* ========================================
   CONGNGHE8 - AUTHENTICATION
======================================== */

const authService = window.firebaseAuth;
const dbService = window.firebaseDB;

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");

// Nếu người dùng đã có phiên đăng nhập từ trước,
// không cần mở lại trang đăng nhập.
let loginSubmissionInProgress = false;

if (loginForm && authService) {
    authService.onAuthStateChanged((user) => {
        if (user && !loginSubmissionInProgress) {
            window.location.replace("trangtieude.html");
        }
    });
}

// Hiển thị thông báo.
function showAuthMessage(message, isError = false) {
    if (!authMessage) return;

    authMessage.textContent = message;
    authMessage.style.color = isError ? "#fecaca" : "#bbf7d0";
}

// Kiểm tra Firebase.
if (!authService || !dbService) {
    showAuthMessage(
        "Không thể kết nối Firebase. Vui lòng tải lại trang.",
        true
    );
}

// ========================================
// ĐĂNG KÝ TÀI KHOẢN
// ========================================

if (registerForm && authService && dbService) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            showAuthMessage("Mật khẩu xác nhận không khớp!", true);
            return;
        }

        const submitButton = registerForm.querySelector(
            'button[type="submit"]'
        );

        submitButton.disabled = true;
        submitButton.textContent = "Đang tạo tài khoản...";

        try {
            // Tạo tài khoản Firebase Authentication.
            const userCredential =
                await authService.createUserWithEmailAndPassword(
                    email,
                    password
                );

            const user = userCredential.user;

            // Lưu hồ sơ vào Firestore.
            await dbService.collection("users").doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                roleId: 2,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Đăng xuất sau khi đăng ký thành công.
            await authService.signOut();

            showAuthMessage(
                "Đăng ký thành công! Đang chuyển đến trang đăng nhập..."
            );

            // Chuyển sang trang đăng nhập.
            setTimeout(() => {
                window.location.href = "dangnhap.html";
            }, 1500);

        } catch (error) {
            console.error("Lỗi đăng ký:", error);

            let message = "Đăng ký thất bại. Vui lòng thử lại.";

            if (error.code === "auth/email-already-in-use") {
                message = "Email này đã được sử dụng!";
            } else if (error.code === "auth/invalid-email") {
                message = "Địa chỉ email không hợp lệ!";
            } else if (error.code === "auth/weak-password") {
                message = "Mật khẩu quá yếu!";
            } else if (
                error.code === "permission-denied" ||
                error.code === "firestore/permission-denied"
            ) {
                message = "Firestore từ chối quyền tạo hồ sơ người dùng.";
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

        const submitButton = loginForm.querySelector(
            'button[type="submit"]'
        );

        submitButton.disabled = true;
        submitButton.textContent = "Đang đăng nhập...";
        loginSubmissionInProgress = true;

        let loginSucceeded = false;

        try {
            // Đăng nhập Firebase Authentication.
            await authService.signInWithEmailAndPassword(
                email,
                password
            );

            loginSucceeded = true;

            showAuthMessage(
                "Đăng nhập thành công! Đang chuyển đến trang chủ..."
            );

            // Chuyển đến trang chủ, giữ trạng thái đăng nhập.
            setTimeout(() => {
                window.location.href = "trangtieude.html";
            }, 1200);

        } catch (error) {
            console.error("Lỗi đăng nhập:", error);

            let message = "Đăng nhập thất bại. Vui lòng thử lại.";

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
            }

            showAuthMessage(message, true);

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Đăng nhập";

            if (!loginSucceeded) {
                loginSubmissionInProgress = false;
            }
        }
    });
}
