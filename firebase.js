import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDZXThWUpfiO9wktCf4dRfDSrWnaUJ7mIQ",
  authDomain: "absenin-dfdc8.firebaseapp.com",
  projectId: "absenin-dfdc8",
  storageBucket: "absenin-dfdc8.firebasestorage.app",
  messagingSenderId: "49470146671",
  appId: "1:49470146671:web:25b9da42462f3a3898259a"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Member creation is performed by the trusted Vercel API, never by browser Admin SDK.
export async function createMemberAccount({ userId, name, kelas, password }) {
  const current = auth.currentUser;
  if (!current) throw new Error("Sesi pengurus tidak ditemukan. Silakan login ulang.");
  const idToken = await current.getIdToken();
  const response = await fetch("https://absenin-one.vercel.app/api/admin/create-member", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
    body: JSON.stringify({ userId, name, kelas, password })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || `Backend gagal (${response.status}).`);
    error.code = result.code || "backend/error";
    throw error;
  }
  return result;
}
