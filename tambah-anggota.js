import { auth, db, createMemberAccount } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const $ = s => document.querySelector(s);
const ID_RE = /^[A-Z0-9_-]{2,50}$/;
const say = (el, t) => { el.textContent = t; };

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return Array.from(b, x => chars[x % chars.length]).join("");
}

// Hanya pengurus yang boleh membuka halaman ini
onAuthStateChanged(auth, async user => {
  if (!user) { location.href = "index.html"; return; }
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const role = String(snap.data()?.role || "").toUpperCase();
    if (role !== "PENGURUS") location.href = "dashboard-siswa.html";
  } catch (e) {
    say($("#msg"), "Gagal memeriksa akun: " + (e.message || e));
  }
});

function errText(e) {
  return e.code === "gate/wrong-password" ? "Kode akses salah."
    : (e.message || "Gagal") + (e.code ? ` (${e.code})` : "");
}

$("#addForm").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = $("#msg"), btn = $("#saveBtn");
  const userId = $("#uid").value.trim().toUpperCase();
  const name = $("#nama").value.trim();
  const kelas = $("#kelas").value.trim() || "Anggota Robotik";
  const password = $("#pw").value;
  if (!ID_RE.test(userId) || !name || password.length < 6) {
    say(msg, "ID hanya huruf/angka/_/-, nama wajib, password min. 6 karakter.");
    return;
  }
  btn.disabled = true;
  say(msg, "Membuat akun...");
  try {
    await createMemberAccount({ userId, name, kelas, password, gatePassword: $("#gate").value });
    say(msg, `Berhasil: ${name} (${userId}) sudah bisa login.`);
    $("#addForm").reset();
  } catch (err) {
    console.error(err);
    say(msg, "Gagal: " + errText(err));
  } finally {
    btn.disabled = false;
  }
});

$("#bulkBtn").addEventListener("click", async () => {
  const btn = $("#bulkBtn"), out = $("#bulkMsg");
  const rows = $("#bulk").value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (!rows.length) { say(out, "Tempel daftar dulu."); return; }
  btn.disabled = true;
  const results = [];
  for (let i = 0; i < rows.length; i++) {
    const [idRaw, name, kelas = "Anggota Robotik"] = rows[i].split(",").map(x => x.trim());
    const userId = (idRaw || "").toUpperCase();
    if (i === 0 && userId === "ID") continue;
    say(out, `Memproses ${i + 1}/${rows.length}...`);
    if (!ID_RE.test(userId) || !name) { results.push([idRaw, name, "", "FORMAT SALAH"]); continue; }
    const password = tempPassword();
    try {
      await createMemberAccount({ userId, name, kelas, password, gatePassword: $("#gate").value });
      results.push([userId, name, password, "BERHASIL"]);
    } catch (err) {
      results.push([userId, name, "", errText(err)]);
      if (err.code === "gate/wrong-password") break;
    }
  }
  const q = v => '"' + String(v ?? "").replaceAll('"', '""') + '"';
  const csv = ["ID,NAMA,PASSWORD_AWAL,STATUS", ...results.map(r => r.map(q).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = "absenin-akun-anggota.csv";
  a.click();
  say(out, `Selesai: ${results.filter(r => r[3] === "BERHASIL").length} dari ${results.length} berhasil. CSV password sudah diunduh, simpan pribadi.`);
  btn.disabled = false;
});
