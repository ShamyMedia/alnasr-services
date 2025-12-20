/**
 * 🏛️ AL-NASR DIRECTORY APP
 * Security + Performance Hardened
 */

const CONFIG = {
  API: "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec",
  CACHE_KEY: "alnasr_data_v2",
  TTL: 3600000,
  TIMEOUT: 12000,
  FALLBACK_IMG:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dy='.3em' font-size='30' fill='%23cbd5e1' text-anchor='middle'%3E🏢%3C/text%3E%3C/svg%3E"
};

const I18N = {
  ar: {
    call: "اتصال",
    wa: "واتساب",
    map: "الموقع",
    empty: "عذراً، لم نجد نتائج مطابقة.",
    search: "ابحث عن طبيب، تخصص، رقم…",
    all: "جميع التخصصات",
    netErr: "تأكد من الاتصال بالإنترنت"
  },
  en: {
    call: "Call",
    wa: "WhatsApp",
    map: "Location",
    empty: "No results found.",
    search: "Search...",
    all: "All Categories",
    netErr: "Check internet connection"
  }
};

const CAT_MAP = {
  Clinic: "عيادة",
  Pharmacy: "صيدلية",
  Center: "مركز طبي",
  Lab: "معمل",
  Store: "متجر",
  Office: "مكتب",
  Restaurant: "مطعم",
  Cafe: "كافيه",
  Gym: "جيم",
  Other: "خدمات أخرى"
};

let state = {
  data: [],
  lang: localStorage.getItem("lang") || "ar"
};

/* ================= Utilities ================= */

const safeText = v => String(v ?? "").trim();
const norm = t =>
  safeText(t)
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىي]/g, "ي");

const safeUrl = url => {
  const u = safeText(url);
  return /^(https?:|tel:)/i.test(u) ? u : "";
};

const formatWa = n => {
  const p = safeText(n).replace(/\D/g, "");
  return p.startsWith("01") ? "2" + p : p;
};

const getCatDisplay = c =>
  state.lang === "ar" && CAT_MAP[c] ? CAT_MAP[c] : c;

/* ================= DOM ================= */

const DOM = {
  list: document.getElementById("list"),
  search: document.getElementById("search"),
  filter: document.getElementById("categoryFilter"),
  langBtn: document.getElementById("langBtn")
};

/* ================= Data ================= */

const processData = raw =>
  Array.isArray(raw)
    ? raw.map(i => ({
        name: safeText(i.name),
        category: safeText(i.category),
        description: safeText(i.description),
        phone: safeText(i.phone),
        whatsapp: safeText(i.whatsapp),
        image: safeText(i.image),
        lat: Number(i.lat),
        lng: Number(i.lng),
        _s: norm(
          `${i.name} ${i.category} ${CAT_MAP[i.category] || ""} ${i.description} ${i.phone}`
        )
      }))
    : [];

/* ================= Render ================= */

function render() {
  const q = norm(DOM.search.value).split(" ").filter(Boolean);
  const cat = DOM.filter.value;

  DOM.list.innerHTML = "";

  const results = state.data.filter(i => {
    if (cat && i.category !== cat) return false;
    return q.every(t => i._s.includes(t));
  });

  if (!results.length) {
    DOM.list.innerHTML = `<div class="empty-state">${I18N[state.lang].empty}</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  results.forEach(i => frag.appendChild(createCard(i)));
  DOM.list.appendChild(frag);
}

/* ================= UI ================= */

function updateUI() {
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  DOM.langBtn.textContent = state.lang === "ar" ? "EN" : "AR";
  DOM.search.placeholder = I18N[state.lang].search;

  const cats = [...new Set(state.data.map(i => i.category).filter(Boolean))];
  DOM.filter.innerHTML = `<option value="">${I18N[state.lang].all}</option>`;
  cats.forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = getCatDisplay(c);
    DOM.filter.appendChild(o);
  });
}

/* ================= Fetch ================= */

async function fetchData() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.TIMEOUT);

  const res = await fetch(CONFIG.API, { signal: ctrl.signal });
  clearTimeout(timer);

  if (!res.ok) throw new Error("API");
  return res.json();
}

/* ================= Boot ================= */

async function boot() {
  updateUI();

  try {
    const cache = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY) || "{}");
    if (cache.t && Date.now() - cache.t < CONFIG.TTL) {
      state.data = processData(cache.d);
      render();
      return;
    }
  } catch {
    localStorage.removeItem(CONFIG.CACHE_KEY);
  }

  try {
    const json = await fetchData();
    const raw = json.shops || [];
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ t: Date.now(), d: raw }));
    state.data = processData(raw);
    updateUI();
    render();
  } catch {
    DOM.list.innerHTML = `<div class="empty-state">${I18N[state.lang].netErr}</div>`;
  }
}

/* ================= Events ================= */

let searchTimer;
DOM.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(render, 150);
});

DOM.filter.addEventListener("change", render);

DOM.langBtn.onclick = () => {
  state.lang = state.lang === "ar" ? "en" : "ar";
  localStorage.setItem("lang", state.lang);
  updateUI();
  render();
};

boot();
