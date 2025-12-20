/**
 * 🏛️ AL-NASR DIRECTORY APP
 * Mobile UX + iOS Performance Hardened
 */

const CONFIG = {
  API: "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec",
  CACHE_KEY: "alnasr_data_v2",
  TTL: 3600000,
  TIMEOUT: 12000,
  RETRY_DELAY: 1800,
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
    netErr: "تعذر تحميل البيانات حالياً"
  },
  en: {
    call: "Call",
    wa: "WhatsApp",
    map: "Location",
    empty: "No results found.",
    search: "Search...",
    all: "All Categories",
    netErr: "Unable to load data"
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

/* ---------------- Utils ---------------- */

const norm = t =>
  String(t || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىي]/g, "ي");

const getCatDisplay = c =>
  state.lang === "ar" && CAT_MAP[c] ? CAT_MAP[c] : c;

/* ---------------- DOM ---------------- */

const DOM = {
  list: document.getElementById("list"),
  search: document.getElementById("search"),
  filter: document.getElementById("categoryFilter"),
  langBtn: document.getElementById("langBtn")
};

/* ---------------- UI ---------------- */

function showSkeleton() {
  DOM.list.innerHTML = Array(6)
    .fill(`<div class="shop-card"><div class="skeleton" style="height:350px"></div></div>`)
    .join("");
}

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

/* ---------------- Data ---------------- */

const processData = raw =>
  Array.isArray(raw)
    ? raw.map(i => ({
        name: i.name,
        category: i.category,
        description: i.description,
        phone: i.phone,
        whatsapp: i.whatsapp,
        image: i.image || CONFIG.FALLBACK_IMG,
        lat: i.lat,
        lng: i.lng,
        _s: norm(`${i.name} ${i.category} ${i.description} ${i.phone}`)
      }))
    : [];

/* ---------------- Render ---------------- */

function render() {
  const q = norm(DOM.search.value).split(" ").filter(Boolean);
  const cat = DOM.filter.value;

  const res = state.data.filter(i => {
    if (cat && i.category !== cat) return false;
    return q.every(t => i._s.includes(t));
  });

  if (!res.length) {
    DOM.list.innerHTML = `<div class="empty-state">${I18N[state.lang].empty}</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  res.forEach(i => frag.appendChild(createCard(i)));
  DOM.list.innerHTML = "";
  DOM.list.appendChild(frag);
}

/* ---------------- Fetch Logic ---------------- */

async function fetchWithTimeout() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CONFIG.TIMEOUT);
  const r = await fetch(CONFIG.API, { signal: ctrl.signal });
  clearTimeout(t);
  if (!r.ok) throw new Error("API");
  return r.json();
}

async function loadData(retry = true) {
  try {
    const json = await fetchWithTimeout();
    const raw = json.shops || [];
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ t: Date.now(), d: raw }));
    state.data = processData(raw);
    updateUI();
    render();
  } catch {
    if (retry) {
      setTimeout(() => loadData(false), CONFIG.RETRY_DELAY);
    } else if (!state.data.length) {
      DOM.list.innerHTML = `<div class="empty-state">${I18N[state.lang].netErr}</div>`;
    }
  }
}

/* ---------------- Boot ---------------- */

function boot() {
  showSkeleton();

  try {
    const cache = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY));
    if (cache?.d) {
      state.data = processData(cache.d);
      updateUI();
      render();
    }
  } catch {}

  loadData();
}

/* ---------------- Events ---------------- */

DOM.search.addEventListener("input", () => setTimeout(render, 120));
DOM.filter.addEventListener("change", render);
DOM.langBtn.onclick = () => {
  state.lang = state.lang === "ar" ? "en" : "ar";
  localStorage.setItem("lang", state.lang);
  updateUI();
  render();
};

boot();
