// Peta tertanam (Leaflet + OpenStreetMap/Esri). Lokasi tetap disimpan di Firestore: sessions/lokasi
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const box = document.getElementById("sessionMap");
if (box && window.L) {
  const latIn = document.getElementById("sessionLat"), lngIn = document.getElementById("sessionLng");
  const rad = document.getElementById("sessionRadius"), radOut = document.getElementById("radiusOut");
  const note = document.getElementById("lokasiNote");
  const say = t => { if (note) note.textContent = t; };
  const LS = "absenin_lokasi";

  const map = L.map(box).setView([-6.2349, 106.9896], 15);
  const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
  const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Esri World Imagery" });
  osm.addTo(map);
  L.control.layers({ Peta: osm, Satelit: sat }).addTo(map);

  let marker = null, circle = null;
  const R = () => Number(rad.value) || 100;

  function setPoint(lat, lng, pan) {
    latIn.value = lat.toFixed(6); lngIn.value = lng.toFixed(6);
    if (!marker) {
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on("dragend", () => { const p = marker.getLatLng(); setPoint(p.lat, p.lng, false); });
      circle = L.circle([lat, lng], { radius: R(), color: "#f59b22", fillOpacity: 0.15 }).addTo(map);
    } else { marker.setLatLng([lat, lng]); circle.setLatLng([lat, lng]); }
    if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 17));
  }
  function setRadius(v) { rad.value = v; radOut.textContent = v; circle?.setRadius(Number(v)); }

  function apply(d, pan) {
    if (!d || !isFinite(d.lat) || !isFinite(d.lng)) return false;
    if (isFinite(d.radius)) setRadius(d.radius);
    setPoint(d.lat, d.lng, pan);
    return true;
  }

  async function saveFixed() {
    const lat = parseFloat(latIn.value), lng = parseFloat(lngIn.value), radius = R();
    if (!isFinite(lat) || !isFinite(lng)) return say("Pilih titik di peta dulu.");
    const d = { lat, lng, radius };
    try { localStorage.setItem(LS, JSON.stringify(d)); } catch {}
    try {
      await setDoc(doc(db, "sessions", "lokasi"), { ...d, updatedAt: serverTimestamp() });
      say("Lokasi tetap tersimpan. Akan terbuka otomatis di dashboard.");
    } catch (e) { say("Tersimpan di perangkat ini saja: " + (e.message || e)); }
  }

  map.on("click", e => setPoint(e.latlng.lat, e.latlng.lng, false));
  rad.addEventListener("input", () => { radOut.textContent = R(); circle?.setRadius(R()); });
  const fromInputs = () => { const a = parseFloat(latIn.value), b = parseFloat(lngIn.value); if (isFinite(a) && isFinite(b)) setPoint(a, b, true); };
  latIn.addEventListener("change", fromInputs); lngIn.addEventListener("change", fromInputs);

  document.getElementById("saveLokasi")?.addEventListener("click", saveFixed);
  document.getElementById("openSession")?.addEventListener("click", saveFixed, true);
  document.getElementById("useMyLocation")?.addEventListener("click", () => {
    if (!navigator.geolocation) return alert("Browser tidak mendukung lokasi.");
    navigator.geolocation.getCurrentPosition(
      p => setPoint(p.coords.latitude, p.coords.longitude, true),
      () => alert("Lokasi ditolak atau belum aktif. Aktifkan GPS dan izinkan lokasi."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });

  // Pulihkan lokasi: cepat dari perangkat, lalu dari Firestore (berlaku di semua perangkat)
  try { apply(JSON.parse(localStorage.getItem(LS) || "null"), true); } catch {}
  onAuthStateChanged(auth, async u => {
    if (!u) return;
    try {
      const s = await getDoc(doc(db, "sessions", "lokasi"));
      if (s.exists() && apply(s.data(), true)) say("Memakai lokasi tetap yang tersimpan.");
    } catch (e) { console.warn(e); }
  });
  setTimeout(() => map.invalidateSize(), 300);
}
