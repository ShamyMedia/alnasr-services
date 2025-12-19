const API =
  "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec";

const CACHE_KEY = "alnasr_cache_v2";
const TTL = 60 * 60 * 1000;
const DEFAULT_IMG = "https://i.postimg.cc/fyqVj003/s001.webp";

const list = document.getElementById("list");
const search = document.getElementById("search");
const langBtn = document.getElementById("langBtn");

let shops = [];
let userPos = null;
let lang = localStorage.getItem("lang") || "ar";

const i18n = {
  ar: { call: "اتصال", wa: "واتساب", map: "الموقع", empty: "لا توجد نتائج", placeholder: "ابحث عن طبيب أو تخصص أو خدمة" },
  en: { call: "Call", wa: "WhatsApp", map: "Map", empty: "No results", placeholder: "Search for doctors or services" }
};

const esc = t =>
  t ? t.toString().replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
  ) : "";

const clean = t =>
  t ? t.toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىي]/g, "ي")
    .replace(/[\u064B-\u0652]/g, "") : "";

function fixWa(p) {
  if (!p) return "";
  let n = p.toString().replace(/\D/g, "");
  if (n.startsWith("20")) return n;
  if (n.startsWith("01")) return "2" + n;
  return "20" + n;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

function applyLang() {
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lang;
  langBtn.textContent = lang === "ar" ? "EN" : "AR";
  search.placeholder = i18n[lang].placeholder;
  document.querySelectorAll("[data-ar]").forEach(el => {
    el.textContent = el.dataset[lang];
  });
}

function skeleton() {
  list.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const s = document.createElement("div");
    s.className = "skeleton";
    list.appendChild(s);
  }
}

function render(data) {
  if (!data.length) {
    list.innerHTML = `<div class="empty">${i18n[lang].empty}</div>`;
    return;
  }

  list.innerHTML = data.map(s => {
    const img = s.image || DEFAULT_IMG;

    const dist = userPos && s.lat && s.lng
      ? `<span class="badge distance">${haversine(userPos.lat, userPos.lng, s.lat, s.lng)} ${lang === "ar" ? "كم" : "km"}</span>`
      : "";

    const mapUrl = (s.lat && s.lng)
      ? `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + " برج النصر")}`;

    const wa = fixWa(s.whatsapp || s.phone);

    return `
      <div class="card">
        <div class="card-top">
          <img class="thumb" loading="lazy" src="${esc(img)}" onerror="this.src='${DEFAULT_IMG}'">
          <div class="card-info">
            <div class="name">${esc(s.name)}</div>
            <div class="badges">
              <span class="badge">${esc(s.category)}</span>
              ${dist}
            </div>
          </div>
        </div>
        <div class="desc">${esc(s.description || "")}</div>
        <div class="hours">${esc(s.working_hours || "")}</div>
        <div class="actions">
          <a class="btn-call" href="tel:${s.phone}">📞 ${i18n[lang].call}</a>
          <a class="btn-wa" href="https://wa.me/${wa}" target="_blank">💬 ${i18n[lang].wa}</a>
          <a class="btn-map" href="${mapUrl}" target="_blank">📍 ${i18n[lang].map}</a>
        </div>
      </div>
    `;
  }).join("");
}

search.oninput = e => {
  const q = clean(e.target.value);
  render(shops.filter(s =>
    clean(s.name + s.category + (s.description || "")).includes(q)
  ));
};

langBtn.onclick = () => {
  lang = lang === "ar" ? "en" : "ar";
  localStorage.setItem("lang", lang);
  applyLang();
  render(shops);
};

async function load() {
  applyLang();

  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const c = JSON.parse(cached);
    if (Date.now() - c.time < TTL) {
      shops = c.data;
      render(shops);
    }
  }

  try {
    skeleton();
    const r = await fetch(API);
    const j = await r.json();
    shops = j.shops || [];
    localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data: shops }));
    render(shops);
  } catch {
    if (!shops.length) list.innerHTML = `<div class="empty">خطأ في الاتصال</div>`;
  }
}

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(p => {
    userPos = { lat: p.coords.latitude, lng: p.coords.longitude };
    if (shops.length) render(shops);
  });
}

load();
