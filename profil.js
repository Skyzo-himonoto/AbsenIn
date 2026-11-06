import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const $ = s => document.querySelector(s);
const HEX = /^#[0-9a-f]{6}$/i;
const LEGACY = { orange: "#f59b22", robotik: "#2b7de9", neon: "#00bcd4", emas: "#d4a017" };
let uid = null, photo = "", frame = "none", name = "", display = "";

const say = t => { const el = $("#pfMsg"); if (el) el.textContent = t; };
const initials = n => (n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();

function paint() {
  const html = photo ? `<img src="${photo}" alt="Foto profil">` : initials(name);
  for (const [sel, small] of [["#pfPhoto", false], ["#heroAvatar", true]]) {
    const el = $(sel);
    if (!el) continue;
    el.className = "pfp" + (small ? " sm" : "");
    el.style.setProperty("--ring", frame === "none" ? "transparent" : frame);
    el.innerHTML = `<div class="pfp-in">${html}</div>`;
  }
  $("#pfDot")?.style.setProperty("--dot", frame === "none" ? "transparent" : frame);
  document.querySelectorAll("#pfPalette button").forEach(b => b.classList.toggle("on", b.dataset.c === frame));
}

// Palet 56 warna + tanpa + pilih sendiri
function buildPalette() {
  const box = $("#pfPalette");
  if (!box) return;
  const cols = [];
  for (const l of [28, 42, 56, 72]) for (let h = 0; h < 360; h += 30) cols.push(`hsl(${h} 75% ${l}%)`);
  const toHex = css => { const c = document.createElement("canvas").getContext("2d"); c.fillStyle = css; return c.fillStyle; };
  const hexes = cols.map(toHex);
  ["#111111", "#444444", "#777777", "#aaaaaa", "#dddddd", "#ffffff", "#8d6e63", "#ffd54f"].forEach(x => hexes.push(x));
  box.innerHTML =
    `<button type="button" class="none" data-c="none" aria-label="Tanpa bingkai">✕</button>` +
    hexes.map(x => `<button type="button" data-c="${x}" style="--c:${x}" aria-label="Warna ${x}"></button>`).join("") +
    `<label class="custom" title="Pilih sendiri"><input type="color" id="pfCustom" value="#f59b22"></label>`;
}

// Decode dengan ukuran kecil supaya hemat memori di HP kentang
async function shrink(file) {
  const S = 256, c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d");
  let src, w, h, close = () => {};
  if (window.createImageBitmap) {
    try {
      const probe = await createImageBitmap(file);
      w = probe.width; h = probe.height; probe.close();
      const k = Math.max(S / w, S / h, 0.05);
      src = await createImageBitmap(file, { resizeWidth: Math.max(1, Math.round(w * k)), resizeHeight: Math.max(1, Math.round(h * k)), resizeQuality: "medium" });
      close = () => src.close();
    } catch { src = null; }
  }
  if (!src) {
    const url = URL.createObjectURL(file);
    src = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("Gambar tidak bisa dibaca.")); i.src = url; });
    close = () => URL.revokeObjectURL(url);
  }
  const sw = src.width, sh = src.height, side = Math.min(sw, sh);
  ctx.drawImage(src, (sw - side) / 2, (sh - side) / 2, side, side, 0, 0, S, S);
  close();
  return c.toDataURL("image/jpeg", 0.72);
}

async function pick(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  say("Memproses foto...");
  try { photo = await shrink(f); paint(); say("Foto siap. Tekan Simpan profil."); }
  catch (err) { say("Foto gagal diproses: " + (err.message || err) + ". Tutup aplikasi lain lalu coba lagi."); }
  e.target.value = "";
}

onAuthStateChanged(auth, async u => {
  if (!u) return;
  uid = u.uid;
  try {
    const d = (await getDoc(doc(db, "users", uid))).data() || {};
    name = d.nama || d.nama_lengkap || d.name || "";
    photo = d.avatar_url || "";
    const f = d.active_frame_id;
    frame = HEX.test(f || "") ? f : (LEGACY[f] || "none");
    display = d.display_name || "";
    const role = String(d.role || "SISWA").toUpperCase() === "PENGURUS" ? "Pengurus" : "Siswa";
    $("#pfName").textContent = display || name || "Anggota";
    $("#pfDisplay").value = display || name;
    $("#pfId").textContent = d.user_id || "—";
    $("#pfId2").textContent = d.user_id || "—";
    $("#pfKelas").textContent = d.kelas || "Anggota Robotik";
    $("#pfRole").textContent = role;
    $("#pfRole2").textContent = role;
    if (display) { const g = $("#userName"); if (g) g.textContent = display.split(" ")[0] + "!"; }
  } catch (e) { say("Gagal memuat profil: " + (e.message || e)); }
  paint();
});

buildPalette();
$("#pfColorBtn")?.addEventListener("click", () => {
  const p = $("#pfPalette"), open = p.classList.toggle("hidden") === false;
  $("#pfColorBtn").setAttribute("aria-expanded", open);
});
$("#pfPalette")?.addEventListener("click", e => {
  const b = e.target.closest("button[data-c]");
  if (b) { frame = b.dataset.c; paint(); }
});
$("#pfPalette")?.addEventListener("input", e => {
  if (e.target.id === "pfCustom") { frame = e.target.value; paint(); }
});
$("#pfGallery")?.addEventListener("change", pick);
$("#pfSelfie")?.addEventListener("change", pick);
$("#pfRemove")?.addEventListener("click", () => { photo = ""; paint(); say("Foto dihapus. Tekan Simpan profil."); });
$("#pfSave")?.addEventListener("click", async () => {
  if (!uid) return;
  const btn = $("#pfSave");
  btn.disabled = true; say("Menyimpan...");
  try {
    const dn = $("#pfDisplay").value.trim().slice(0, 40);
    await updateDoc(doc(db, "users", uid), { avatar_url: photo, active_frame_id: frame, display_name: dn });
    display = dn;
    $("#pfName").textContent = dn || name || "Anggota";
    if (dn) { const g = $("#userName"); if (g) g.textContent = dn.split(" ")[0] + "!"; }
    say("Profil tersimpan.");
  } catch (e) {
    say(e.code === "permission-denied"
      ? "Ditolak Firestore. Rules terbaru belum di-publish di Firebase."
      : "Gagal menyimpan: " + (e.message || e));
  }
  btn.disabled = false;
});

const sheet = $("#pfSheet");
const openSheet = () => sheet.classList.remove("hidden");
const closeSheet = () => { sheet.classList.add("hidden"); $("#pfPalette")?.classList.add("hidden"); };
$("#heroAvatar")?.addEventListener("click", openSheet);
$("#pfClose")?.addEventListener("click", closeSheet);
sheet?.addEventListener("click", e => { if (e.target === sheet) closeSheet(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });
$("#pfLogout")?.addEventListener("click", () => document.querySelector("[data-logout-btn]")?.click());
