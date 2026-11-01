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

// Secondary Auth instance: create member accounts without signing out the current admin.
import { initializeApp as initSecondaryApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth as getSecondaryAuth, createUserWithEmailAndPassword, deleteUser, signOut as secondarySignOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
const memberApp = initSecondaryApp(firebaseConfig, "AbsenInMemberCreator");
const memberAuth = getSecondaryAuth(memberApp);
export async function createMemberAccount({ userId, name, kelas, password }) {
  const email = `${userId.toLowerCase()}@absenin.local`;
  let credential;
  try {
    credential = await createUserWithEmailAndPassword(memberAuth, email, password);
    return { uid: credential.user.uid, email };
  } catch (error) { throw error; }
}
export async function cleanupMemberAccount() {
  if (memberAuth.currentUser) { try { await deleteUser(memberAuth.currentUser); } catch {} }
}
export async function signOutMemberCreator() {
  try { await secondarySignOut(memberAuth); } catch {}
}
