// Peta tertanam (Leaflet + OpenStreetMap/Esri). Tanpa API key, tanpa aplikasi Google Maps.
document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("sessionMap");
  if (!box || !window.L) return;
  const latIn = document.getElementById("sessionLat"), lngIn = document.getElementById("sessionLng");
  const rad = document.getElementById("sessionRadius"), radOut = document.getElementById("radiusOut");
  const start = [-6.2349, 106.9896]; // Kota Bekasi (tengah), digeser otomatis ke lokasi pilihan
  const map = L.map(box).setView(start, 15);
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
  map.on("click", e => setPoint(e.latlng.lat, e.latlng.lng, false));
  rad.addEventListener("input", () => { radOut.textContent = R(); circle?.setRadius(R()); });
  const fromInputs = () => { const a = parseFloat(latIn.value), b = parseFloat(lngIn.value); if (isFinite(a) && isFinite(b)) setPoint(a, b, true); };
  latIn.addEventListener("change", fromInputs); lngIn.addEventListener("change", fromInputs);
  document.getElementById("useMyLocation")?.addEventListener("click", () => {
    if (!navigator.geolocation) return alert("Browser tidak mendukung lokasi.");
    navigator.geolocation.getCurrentPosition(
      p => setPoint(p.coords.latitude, p.coords.longitude, true),
      () => alert("Lokasi ditolak atau belum aktif. Aktifkan GPS dan izinkan lokasi."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
  setTimeout(() => map.invalidateSize(), 300);
});
