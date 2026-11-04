import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function adminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON belum diatur di Vercel.');
  let serviceAccount;
  try { serviceAccount = JSON.parse(raw); }
  catch { throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON bukan JSON yang valid.'); }
  return initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan.' });
  try {
    const app = adminApp();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Token login tidak ditemukan. Login ulang.' });
    const decoded = await getAuth(app).verifyIdToken(token);
    const db = getFirestore(app);
    const adminSnap = await db.collection('users').doc(decoded.uid).get();
    if (!adminSnap.exists || String(adminSnap.data().role || '').toUpperCase() !== 'PENGURUS') {
      return res.status(403).json({ error: 'Hanya akun PENGURUS yang boleh menambah anggota.' });
    }
    const body = req.body || {};
    const userId = String(body.userId || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    const kelas = String(body.kelas || 'Anggota Robotik').trim();
    const password = String(body.password || '');
    if (!/^[A-Z0-9_-]{2,50}$/.test(userId) || !name || password.length < 6) {
      return res.status(400).json({ error: 'ID, nama, atau password tidak valid. Password minimal 6 karakter.' });
    }
    const email = `${userId.toLowerCase()}@absenin.local`;
    const duplicate = await db.collection('users').where('user_id', '==', userId).limit(1).get();
    if (!duplicate.empty) return res.status(409).json({ error: 'ID anggota sudah terdaftar.' });
    let createdUser;
    try {
      createdUser = await getAuth(app).createUser({ email, password, displayName: name, disabled: false });
      await db.collection('users').doc(createdUser.uid).create({
        user_id: userId, nama: name, role: 'SISWA', kelas,
        created_at: FieldValue.serverTimestamp(), status: 'AKTIF'
      });
    } catch (error) {
      if (createdUser) { try { await getAuth(app).deleteUser(createdUser.uid); } catch (cleanupError) { console.error('Cleanup akun gagal:', cleanupError); } }
      if (error.code === 'auth/email-already-exists') return res.status(409).json({ error: 'Email/ID ini sudah digunakan di Firebase Authentication.' });
      if (error.code === 6 || error.code === 'already-exists') return res.status(409).json({ error: 'Profil dengan ID tersebut sudah ada.' });
      throw error;
    }
    return res.status(201).json({ ok: true, uid: createdUser.uid, userId, email });
  } catch (error) {
    console.error('POST /api/members:', error);
    const message = error?.message || 'Terjadi kesalahan server.';
    return res.status(500).json({ error: message });
  }
}
