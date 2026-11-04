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
