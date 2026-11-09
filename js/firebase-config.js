
// ==========================================
// FIREBASE CONFIGURATION - CONGNGHE8
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyAY5JWOSg7UZ4DOdhfofO2tL0KYPYM9ilo",
    authDomain: "cong-nghe-8.firebaseapp.com",
    projectId: "cong-nghe-8",
    appId: "1:821570708488:web:e1837a9525276b75a25dbd"
};

// Khởi tạo Firebase App
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Khởi tạo Authentication và Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// Cấu hình Long Polling để xử lý vấn đề WebChannel
db.settings(
    {
        experimentalAutoDetectLongPolling: false,
        experimentalForceLongPolling: true
    },
    { merge: true }
);

// Chia sẻ Firebase cho các file JavaScript khác
window.firebaseAuth = auth;
window.firebaseDB = db;

console.log("Firebase đã được khởi tạo!");
