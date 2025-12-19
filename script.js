"use strict";

/* ================= CONFIG ================= */
const CONFIG = {
  API: "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec",
  CACHE_KEY: "alnasr_cache",
  CACHE_SCHEMA: 1,
  CACHE_TTL: 60 * 60 * 1000,
  FALLBACK_IMG: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE3MCI+PC9zdmc+"
};

/* ================= I18N ================= */
const I18N = {
  ar: {
    title: "دليل خدمات برج النصر",
    desc: "كل الخدمات في مكان واحد",
    search: "ابحث...",
    all: "الكل",
    call: "اتصال",
    wa: "واتساب",
    map: "الموقع",
    empty: "لا توجد نتائج"
  },
  en: {
    title: "Al Nasr Services",
    desc: "All services in one place",
    search: "Search...",
    all: "All",
    call: "Call",
    wa: "WhatsApp",
    map: "Location",
    empty: "No results"
  }
};

/* ================= HELPERS ================= */
const escapeText = s =>
  String(s ?? "").replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );

const normalize = s =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىي]/g, "ي");

const cleanPhone = p =>
  String(p ?? "").replace(/[^\d+]/g, "");

const safeURL = url => {
  if (!url) return "";
  try {
    const u = new URL(url, location.origin);
    return ["http:", "https:", "tel:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
};

const validCoords = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 && lat <= 90 &&
  lng >= -180 && lng <= 180;

/* ================= STATE ================= */
const state = {
  lang: localStorage.getItem("lang") || "ar",
  data: [],
  filtered: []
};

/* ================= DOM ================= */
const cardsEl = document.getElementById("cards");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const langBtn = document.getElementById("langBtn");

/* ================= DATA ================= */
function processData(raw) {
  state.data = raw.map(item => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lng);

    return {
      ...item,
      lat: validCoords(lat, lng) ? lat : null,
      lng: validCoords(lat, lng) ? lng : null,
      _search: normalize(
        `${item.name} ${item.category} ${item.description} ${item.address || ""} ${item.phone || ""}`
      )
    };
  });
}

/* ================= RENDER ================= */
function render() {
  cardsEl.innerHTML = "";

  if (!state.filtered.length) {
    cardsEl.innerHTML = `<div class="empty-state">${I18N[state.lang].empty}</div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  state.filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "shop-card";

    const img = document.createElement("img");
    img.className = "shop-image";
    img.src = safeURL(item.image) || CONFIG.FALLBACK_IMG;
    img.onerror = () => (img.src = CONFIG.FALLBACK_IMG);

    const callLink = item.phone
      ? `<a class="action-btn btn-call" href="tel:${cleanPhone(item.phone)}">${I18N[state.lang].call}</a>`
      : "";

    const waLink = item.whatsapp
      ? `<a class="action-btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/${cleanPhone(item.whatsapp)}">${I18N[state.lang].wa}</a>`
      : "";

    const mapLink =
      item.lat && item.lng
        ? `<a class="action-btn btn-map" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}">${I18N[state.lang].map}</a>`
        : "";

    card.innerHTML = `
      <div class="card-image-wrapper"></div>
      <div class="card-content">
        <div class="shop-header">
          <h3>${escapeText(item.name)}</h3>
          <span class="category-badge">${escapeText(item.category)}</span>
        </div>
        <p>${escapeText(item.description)}</p>
        <div class="card-actions">${callLink}${waLink}${mapLink}</div>
      </div>
    `;

    card.querySelector(".card-image-wrapper").appendChild(img);
    frag.appendChild(card);
  });

  cardsEl.appendChild(frag);
}

/* ================= FILTER ================= */
function applyFilter() {
  const q = normalize(searchInput.value);
  const cat = categoryFilter.value;

  state.filtered = state.data.filter(item =>
    (!q || item._search.includes(q)) &&
    (!cat || item.category === cat)
  );

  render();
}

/* ================= INIT ================= */
async function init() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach(el =>
    el.textContent = I18N[state.lang][el.dataset.i18n]
  );

  searchInput.placeholder = I18N[state.lang].search;

  try {
    const cached = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY));
    if (cached && cached.schema === CONFIG.CACHE_SCHEMA && Date.now() - cached.time < CONFIG.CACHE_TTL) {
      processData(cached.data);
    } else {
      throw 0;
    }
  } catch {
    const res = await fetch(CONFIG.API);
    if (!res.ok) throw new Error("API Error");
    const json = await res.json();
    processData(json.data || json.shops || []);
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
      schema: CONFIG.CACHE_SCHEMA,
      time: Date.now(),
      data: json.data || json.shops || []
    }));
  }

  const cats = [...new Set(state.data.map(i => i.category))];
  categoryFilter.innerHTML =
    `<option value="">${I18N[state.lang].all}</option>` +
    cats.map(c => `<option value="${escapeText(c)}">${escapeText(c)}</option>`).join("");

  state.filtered = state.data;
  render();
}

/* ================= EVENTS ================= */
searchInput.addEventListener("input", applyFilter);
categoryFilter.addEventListener("change", applyFilter);
langBtn.onclick = () => {
  state.lang = state.lang === "ar" ? "en" : "ar";
  localStorage.setItem("lang", state.lang);
  location.reload();
};

init();
