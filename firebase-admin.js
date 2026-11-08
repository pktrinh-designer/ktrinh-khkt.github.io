
const admin = require("firebase-admin");

let firebaseApp;

function initializeFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const serviceAccountValue =
    process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountValue) {
    throw new Error(
      "Thiếu biến môi trường FIREBASE_SERVICE_ACCOUNT."
    );
  }

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(serviceAccountValue);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT không phải JSON hợp lệ."
    );
  }

  if (
    !serviceAccount.project_id ||
    !serviceAccount.client_email ||
    !serviceAccount.private_key
  ) {
    throw new Error(
      "Thông tin Firebase Service Account chưa đầy đủ."
    );
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  return firebaseApp;
}

// Xác minh Firebase ID Token.
async function verifyIdToken(idToken) {
  if (
    typeof idToken !== "string" ||
    !idToken.trim()
  ) {
    const error = new Error("Bạn cần đăng nhập để làm bài.");
    error.statusCode = 401;
    throw error;
  }

  initializeFirebaseAdmin();

  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch {
    const error = new Error(
      "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
    );
    error.statusCode = 401;
    throw error;
  }
}

// Lấy Firestore từ Firebase Admin.
function getFirestore() {
  initializeFirebaseAdmin();
  return admin.firestore();
}

module.exports = {
  initializeFirebaseAdmin,
  verifyIdToken,
  getFirestore
};
