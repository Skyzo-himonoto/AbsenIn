const admin = require("firebase-admin");

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON belum diatur di Vercel Environment Variables.");
  const serviceAccount = JSON.parse(raw);
  return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method tidak diizinkan." });
  try {
    const app = getAdminApp();
    const auth = app.auth();
    const db = app.firestore();
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return res.status(401).json({ error: "Token login tidak ditemukan." });
    const decoded = await auth.verifyIdToken(header.slice(7));
    const adminDoc = await db.collection("users").doc(decoded.uid).get();
    if (!adminDoc.exists || String(adminDoc.data().role || "").toUpperCase() !== "PENGURUS") {
      return res.status(403).json({ error: "Hanya pengurus yang boleh membuat akun anggota." });
    }
    const body = req.body || {};
    const userId = String(body.userId || "").trim().toUpperCase();
    const name = String(body.name || "").trim();
    const kelas = String(body.kelas || "Anggota Robotik").trim();
    const password = String(body.password || "");
    if (!/^[A-Z0-9_-]{2,50}$/.test(userId) || !name || password.length < 6) {
      return res.status(400).json({ error: "ID tidak valid, nama wajib diisi, dan password minimal 6 karakter." });
    }
    const email = `${userId.toLowerCase()}@absenin.local`;
    const duplicate = await db.collection("users").where("user_id", "==", userId).limit(1).get();
    if (!duplicate.empty) return res.status(409).json({ error: "ID anggota sudah terdaftar." });
    let created;
    try {
      created = await auth.createUser({ email, password, displayName: name, disabled: false });
      await db.collection("users").doc(created.uid).set({
        user_id: userId, nama: name, role: "SISWA", kelas,
        created_at: admin.firestore.FieldValue.serverTimestamp(), status: "AKTIF"
      });
    } catch (error) {
      if (created) {
        try { await auth.deleteUser(created.uid); } catch (rollbackError) { console.error("Rollback Auth gagal:", rollbackError); }
      }
      throw error;
    }
    return res.status(201).json({ ok: true, uid: created.uid, userId, email, message: "Akun anggota berhasil dibuat." });
  } catch (error) {
    console.error("create-member:", error);
    const known = ["auth/email-already-exists", "auth/invalid-password", "auth/invalid-email"];
    const code = error.code || "backend/error";
    const message = known.includes(code) ? error.message : (error.message || "Terjadi kesalahan backend.");
    return res.status(code === "auth/email-already-exists" ? 409 : 500).json({ error: message, code });
  }
};
