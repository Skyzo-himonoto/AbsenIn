import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const $ = s => document.querySelector(s);
const FRAMES = { none: "Tanpa", orange: "Oranye", robotik: "Robotik", neon: "Neon", emas: "Emas" };
let uid = null, photo = "", frame = "none", name = "";

const say = t => { const el = $("#pfMsg"); if (el) el.textContent = t; };
const initials = n => (n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();

function paint() {
  const html = photo ? `<img src="${photo}" alt="Foto profil">` : initials(name);
  for (const [sel, small] of [["#pfPhoto", false], ["#heroAvatar", true]]) {
    const el = $(sel);
    if (!el) continue;
    el.className = "pfp" + (small ? " sm" : "") + (frame !== "none" ? " fr-" + frame : "");
    el.innerHTML = `<div class="pfp-in">${html}</div>`;
  }
  document.querySelectorAll(".frame-chip").forEach(b => b.classList.toggle("on", b.dataset.f === frame));
}

// Kecilkan foto jadi 256x256 JPEG (±20 KB) supaya muat di Firestore, tanpa Storage
function shrink(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const S = 256, c = document.createElement("canvas");
      c.width = c.height = S;
      const side = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gambar tidak bisa dibaca.")); };
    img.src = url;
  });
}

async function pick(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  try { photo = await shrink(f); paint(); say("Foto siap. Tekan Simpan profil."); }
  catch (err) { say(err.message); }
  e.target.value = "";
}

onAuthStateChanged(auth, async u => {
  if (!u) return;
  uid = u.uid;
  try {
    const d = (await getDoc(doc(db, "users", uid))).data() || {};
    name = d.nama || d.nama_lengkap || d.name || "";
    photo = d.avatar_url || "";
    frame = FRAMES[d.active_frame_id] ? d.active_frame_id : "none";
    $("#pfName").textContent = name || "Anggota";
    $("#pfId").textContent = d.user_id || "—";
    $("#pfKelas").textContent = d.kelas || "Anggota Robotik";
  } catch (e) { say("Gagal memuat profil: " + (e.message || e)); }
  paint();
});

$("#pfGallery")?.addEventListener("change", pick);
$("#pfSelfie")?.addEventListener("change", pick);
$("#pfFrames")?.addEventListener("click", e => {
  const b = e.target.closest(".frame-chip");
  if (b) { frame = b.dataset.f; paint(); }
});
$("#pfRemove")?.addEventListener("click", () => { photo = ""; paint(); say("Foto dihapus. Tekan Simpan profil."); });
$("#pfSave")?.addEventListener("click", async () => {
  if (!uid) return;
  const btn = $("#pfSave");
  btn.disabled = true; say("Menyimpan...");
  try {
    await updateDoc(doc(db, "users", uid), { avatar_url: photo, active_frame_id: frame });
    say("Profil tersimpan.");
  } catch (e) { say("Gagal menyimpan: " + (e.message || e)); }
  btn.disabled = false;
});
