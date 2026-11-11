const admin = require("firebase-admin");
const crypto = require("node:crypto");

let firebaseApp;

function initializeFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;

  const serviceAccountValue = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountValue) {
    throw new Error("Thiếu biến môi trường FIREBASE_SERVICE_ACCOUNT.");
  }

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(serviceAccountValue);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT không phải JSON hợp lệ.");
  }

  if (
    !serviceAccount.project_id ||
    !serviceAccount.client_email ||
    !serviceAccount.private_key
  ) {
    throw new Error("Thông tin Firebase Service Account chưa đầy đủ.");
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return firebaseApp;
}

// Xác minh Firebase ID Token.
async function verifyIdToken(idToken) {
  if (typeof idToken !== "string" || !idToken.trim()) {
    const error = new Error("Bạn cần đăng nhập để làm bài.");
    error.statusCode = 401;
    throw error;
  }

  initializeFirebaseAdmin();

  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch {
    const error = new Error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
    error.statusCode = 401;
    throw error;
  }
}

// Xác minh tài khoản School Admin.
async function verifyAdminToken(idToken) {
  const decodedToken = await verifyIdToken(idToken);

  if (decodedToken.roleId !== 1) {
    const error = new Error("Bạn không có quyền quản trị nhà trường.");
    error.statusCode = 403;
    throw error;
  }

  return decodedToken;
}

// Xác minh tài khoản Teacher Admin.
async function verifyTeacherAdminToken(idToken) {
  const decodedToken = await verifyIdToken(idToken);

  if (decodedToken.roleId !== 3) {
    const error = new Error("Bạn không có quyền quản lý lớp học.");
    error.statusCode = 403;
    throw error;
  }

  return decodedToken;
}

// Cấp quyền Teacher Admin.
async function setTeacherAdminRole(uid) {
  if (typeof uid !== "string" || !uid.trim()) {
    throw new Error("UID tài khoản không hợp lệ.");
  }

  initializeFirebaseAdmin();

  const auth = admin.auth();
  const user = await auth.getUser(uid);
  const existingClaims = user.customClaims || {};

  await auth.setCustomUserClaims(uid, {
    ...existingClaims,
    roleId: 3,
    role: "teacher_admin",
  });

  return {
    uid,
    roleId: 3,
    role: "teacher_admin",
  };
}

// Cấp quyền School Admin.
async function setSchoolAdminRole(uid) {
  if (typeof uid !== "string" || !uid.trim()) {
    throw new Error("UID tài khoản không hợp lệ.");
  }

  initializeFirebaseAdmin();

  const auth = admin.auth();
  const user = await auth.getUser(uid);
  const existingClaims = user.customClaims || {};

  await auth.setCustomUserClaims(uid, {
    ...existingClaims,
    roleId: 1,
    role: "school_admin",
  });

  return {
    uid,
    roleId: 1,
    role: "school_admin",
  };
}

// Chuẩn hóa email.
function normalizeEmail(email) {
  if (typeof email !== "string" || !email.trim()) {
    const error = new Error("Email giáo viên không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  return email.trim().toLowerCase();
}

// Hash mã mời.
function hashTeacherInvitationCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// Tìm lời mời bằng mã.
async function findTeacherInvitationByCode(db, invitationCode) {
  if (typeof invitationCode !== "string" || !invitationCode.trim()) {
    const error = new Error("Vui lòng nhập mã mời giáo viên.");
    error.statusCode = 400;
    throw error;
  }

  const codeHash = hashTeacherInvitationCode(invitationCode.trim());

  const snapshot = await db
    .collection("teacherInvitations")
    .where("codeHash", "==", codeHash)
    .limit(1)
    .get();

  if (snapshot.empty) {
    const error = new Error("Mã mời không hợp lệ.");
    error.statusCode = 404;
    throw error;
  }

  return snapshot.docs[0];
}

// School Admin tạo lời mời giáo viên.
async function createTeacherInvitation({
  email,
  name,
  subject,
  assignedClassIds,
  expiresInDays = 7,
  createdBy,
}) {
  const normalizedEmail = normalizeEmail(email);

  if (typeof name !== "string" || !name.trim()) {
    const error = new Error("Vui lòng nhập họ tên giáo viên.");
    error.statusCode = 400;
    throw error;
  }

  if (typeof subject !== "string" || !subject.trim()) {
    const error = new Error("Vui lòng nhập môn phụ trách.");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(assignedClassIds) || assignedClassIds.length === 0) {
    const error = new Error("Vui lòng chọn ít nhất một lớp được phân công.");
    error.statusCode = 400;
    throw error;
  }

  const classIds = [...new Set(assignedClassIds)];

  if (classIds.some((id) => typeof id !== "string" || !id.trim())) {
    const error = new Error("Danh sách lớp được phân công không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  if (
    !Number.isInteger(expiresInDays) ||
    expiresInDays < 1 ||
    expiresInDays > 30
  ) {
    const error = new Error("Thời hạn lời mời phải từ 1 đến 30 ngày.");
    error.statusCode = 400;
    throw error;
  }

  if (typeof createdBy !== "string" || !createdBy.trim()) {
    const error = new Error("Không xác định được School Admin tạo lời mời.");
    error.statusCode = 400;
    throw error;
  }

  const db = getFirestore();
  const auth = admin.auth();

  // Kiểm tra email đã tồn tại trong Firebase Auth.
  try {
    await auth.getUserByEmail(normalizedEmail);

    const error = new Error("Email này đã có tài khoản Firebase.");
    error.statusCode = 409;
    throw error;
  } catch (error) {
    if (error.statusCode) throw error;
    if (error.code !== "auth/user-not-found") throw error;
  }

  // Kiểm tra các lớp được phân công.
  const classSnapshots = await Promise.all(
    classIds.map((id) => db.collection("classes").doc(id).get()),
  );

  if (classSnapshots.some((snapshot) => !snapshot.exists)) {
    const error = new Error("Có lớp học không tồn tại trong hệ thống.");
    error.statusCode = 404;
    throw error;
  }

  // Không cho tạo nhiều lời mời đang chờ cho cùng email.
  const pendingSnapshot = await db
    .collection("teacherInvitations")
    .where("emailNormalized", "==", normalizedEmail)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!pendingSnapshot.empty) {
    const error = new Error("Email này đã có lời mời đang chờ.");
    error.statusCode = 409;
    throw error;
  }

  const invitationCode = `CN8-${crypto.randomBytes(16).toString("hex").toUpperCase()}`;

  const codeHash = hashTeacherInvitationCode(invitationCode);
  const invitationRef = db.collection("teacherInvitations").doc();

  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  );

  await invitationRef.create({
    email: normalizedEmail,
    emailNormalized: normalizedEmail,
    name: name.trim().slice(0, 120),
    subject: subject.trim().slice(0, 100),
    codeHash,
    assignedClassIds: classIds,
    status: "pending",
    createdBy: createdBy.trim(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    usedAt: null,
    usedByUid: null,
  });

  // Chỉ trả mã gốc một lần cho School Admin.
  return {
    invitationId: invitationRef.id,
    invitationCode,
    email: normalizedEmail,
    expiresAt: expiresAt.toDate().toISOString(),
  };
}

// Kiểm tra mã mời.
async function verifyTeacherInvitation({ email, invitationCode }) {
  const normalizedEmail = normalizeEmail(email);
  const db = getFirestore();

  const invitationDoc = await findTeacherInvitationByCode(db, invitationCode);

  const invitation = invitationDoc.data();

  if (invitation.emailNormalized !== normalizedEmail) {
    const error = new Error("Email không khớp với email được mời.");
    error.statusCode = 403;
    throw error;
  }

  if (invitation.status !== "pending") {
    const error = new Error("Lời mời đã được sử dụng hoặc bị thu hồi.");
    error.statusCode = 409;
    throw error;
  }

  if (!invitation.expiresAt || invitation.expiresAt.toMillis() <= Date.now()) {
    const error = new Error("Mã mời đã hết hạn.");
    error.statusCode = 410;
    throw error;
  }

  return {
    valid: true,
    invitationId: invitationDoc.id,
    name: invitation.name,
    subject: invitation.subject,
    assignedClassIds: invitation.assignedClassIds,
    expiresAt: invitation.expiresAt.toDate().toISOString(),
  };
}

// Thu hồi lời mời chưa sử dụng.
async function revokeTeacherInvitation(invitationId, revokedBy) {
  if (typeof invitationId !== "string" || !invitationId.trim()) {
    const error = new Error("Mã định danh lời mời không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  const db = getFirestore();
  const invitationRef = db.collection("teacherInvitations").doc(invitationId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(invitationRef);

    if (!snapshot.exists) {
      const error = new Error("Không tìm thấy lời mời.");
      error.statusCode = 404;
      throw error;
    }

    if (snapshot.data().status !== "pending") {
      const error = new Error("Chỉ có thể thu hồi lời mời đang chờ.");
      error.statusCode = 409;
      throw error;
    }

    transaction.update(invitationRef, {
      status: "revoked",
      revokedBy: revokedBy || null,
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return {
    success: true,
    invitationId,
  };
}

// Kích hoạt tài khoản giáo viên.
async function activateTeacherAccount({ uid, email, invitationCode }) {
  if (typeof uid !== "string" || !uid.trim()) {
    const error = new Error("UID tài khoản giáo viên không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = normalizeEmail(email);
  const auth = admin.auth();
  const authUser = await auth.getUser(uid);

  if (!authUser.emailVerified) {
    const error = new Error(
      "Bạn cần xác minh email trước khi kích hoạt tài khoản.",
    );
    error.statusCode = 403;
    throw error;
  }

  if ((authUser.email || "").toLowerCase() !== normalizedEmail) {
    const error = new Error("Email tài khoản không khớp với email được mời.");
    error.statusCode = 403;
    throw error;
  }

  const db = getFirestore();

  const invitationDoc = await findTeacherInvitationByCode(db, invitationCode);

  const invitationRef = invitationDoc.ref;
  const userRef = db.collection("users").doc(uid);
  const teacherRef = db.collection("teachers").doc(uid);

  let teacherData;

  await db.runTransaction(async (transaction) => {
    const freshInvitation = await transaction.get(invitationRef);

    if (!freshInvitation.exists) {
      const error = new Error("Không tìm thấy lời mời giáo viên.");
      error.statusCode = 404;
      throw error;
    }

    const invitation = freshInvitation.data();

    const alreadyActivated =
      invitation.status === "used" && invitation.usedByUid === uid;

    const [existingUser, existingTeacher] = await Promise.all([
      transaction.get(userRef),
      transaction.get(teacherRef),
    ]);

    // Không ghi đè hồ sơ học sinh hoặc vai trò khác.
    if (existingUser.exists && existingUser.data().roleId !== 3) {
      const error = new Error("Tài khoản đã có hồ sơ với vai trò khác.");
      error.statusCode = 409;
      throw error;
    }

    if (existingTeacher.exists && existingTeacher.data().teacherUid !== uid) {
      const error = new Error("Hồ sơ giáo viên không khớp UID.");
      error.statusCode = 409;
      throw error;
    }

    if (invitation.emailNormalized !== normalizedEmail) {
      const error = new Error("Email không khớp với lời mời.");
      error.statusCode = 403;
      throw error;
    }

    if (!alreadyActivated) {
      if (invitation.status !== "pending") {
        const error = new Error("Lời mời không còn hiệu lực.");
        error.statusCode = 409;
        throw error;
      }

      if (
        !invitation.expiresAt ||
        invitation.expiresAt.toMillis() <= Date.now()
      ) {
        const error = new Error("Mã mời đã hết hạn.");
        error.statusCode = 410;
        throw error;
      }
    }

    const classIds = invitation.assignedClassIds || [];

    const classRefs = classIds.map((classId) =>
      db.collection("classes").doc(classId),
    );

    const classSnapshots = await Promise.all(
      classRefs.map((classRef) => transaction.get(classRef)),
    );

    if (classSnapshots.some((snapshot) => !snapshot.exists)) {
      const error = new Error(
        "Một hoặc nhiều lớp được phân công không còn tồn tại.",
      );
      error.statusCode = 409;
      throw error;
    }

    teacherData = {
      teacherUid: uid,
      name: invitation.name,
      subject: invitation.subject,
      email: normalizedEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      invitationId: invitationDoc.id,
      assignedClassIds: classIds,
    };

    transaction.set(
      userRef,
      {
        uid,
        email: normalizedEmail,
        roleId: 3,
        displayName: invitation.name,
        accountStatus: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(teacherRef, teacherData, { merge: true });

    for (const classId of classIds) {
      const assignmentRef = db
        .collection("classes")
        .doc(classId)
        .collection("teachers")
        .doc(uid);

      transaction.set(
        assignmentRef,
        {
          teacherUid: uid,
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
          assignedBy: invitation.createdBy,
        },
        { merge: true },
      );
    }

    if (!alreadyActivated) {
      transaction.update(invitationRef, {
        status: "used",
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
        usedByUid: uid,
      });
    }
  });

  // Có thể gọi lại hàm nếu lần cấp custom claim trước gặp lỗi.
  await setTeacherAdminRole(uid);

  return {
    success: true,
    uid,
    roleId: 3,
    invitationId: invitationDoc.id,
    assignedClassIds: teacherData.assignedClassIds,
  };
}

// Kiểm tra giáo viên có được phân công vào lớp không.
async function verifyTeacherClassAccess(teacherUid, classId) {
  if (
    typeof teacherUid !== "string" ||
    !teacherUid.trim() ||
    typeof classId !== "string" ||
    !classId.trim()
  ) {
    const error = new Error("Thông tin giáo viên hoặc lớp không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  const db = getFirestore();

  const assignment = await db
    .collection("classes")
    .doc(classId)
    .collection("teachers")
    .doc(teacherUid)
    .get();

  if (!assignment.exists) {
    const error = new Error("Bạn không được phân công quản lý lớp này.");
    error.statusCode = 403;
    throw error;
  }

  return true;
}

// Lấy Firestore từ Firebase Admin.
function getFirestore() {
  initializeFirebaseAdmin();
  return admin.firestore();
}

module.exports = {
  initializeFirebaseAdmin,
  verifyIdToken,
  verifyAdminToken,
  setSchoolAdminRole,
  getFirestore,
  verifyTeacherAdminToken,
  setTeacherAdminRole,
  verifyTeacherClassAccess,
  createTeacherInvitation,
  verifyTeacherInvitation,
  activateTeacherAccount,
  revokeTeacherInvitation,
};
