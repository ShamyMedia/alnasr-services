/**
 * 🏛️ AL-NASR DIRECTORY APP
 * Security + UX + Stability – FINAL
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

/* Utilities */
const safeText = v => String(v ?? "").trim();
const norm = t =>
  safeText(t)
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىي]/g, "ي");

const safeUrl = u => /^(https?:|tel:)/i.test(u) ? u : "";

const formatWa = n => {
  const p = safeText(n).replace(/\D/g, "");
  return p.startsWith("01") ? "2" + p : p;
};

const getCatDisplay = c =>
  state.lang === "ar" && CAT_MAP[c] ? CAT_MAP[c] : c;

/* DOM */
const DOM = {
  list: document.getElementById("list"),
  search: document.getElementById("search"),
  filter: document.getElementById("categoryFilter"),
  langBtn: document.getElementById("langBtn")
};

/* Data */
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

/* 🔴 الدالة الناقصة (السبب في المشكلة) */
function createCard(s) {
  const card = document.createElement("article");
  card.className = "shop-card";

  const imgWrap = document.createElement("div");
  imgWrap.className = "card-image-wrapper";

  const img = document.createElement("img");
  img.className = "shop-image";
  img.loading = "lazy";
  img.src = safeUrl(s.image) || CONFIG.FALLBACK_IMG;
  img.onload = () => img.classList.add("loaded");
  img.onerror = () => {
    img.src = CONFIG.FALLBACK_IMG;
    img.classList.add("loaded");
  };

  imgWrap.appendChild(img);

  const content = document.createElement("div");
  content.className = "card-content";

  const header = document.createElement("div");
  header.className = "shop-header";

  const name = document.createElement("h3");
  name.className = "shop-name";
  name.textContent = s.name;

  const badge = document.createElement("span");
  badge.className = "category-badge";
  badge.textContent = getCatDisplay(s.category);

  header.append(name, badge);

  const desc = document.createElement("div");
  desc.className = "shop-description";
  desc.textContent = s.description;

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const btn = (cls, label, href) => {
    const a = document.createElement("a");
    a.className = `action-btn ${cls}`;
    a.textContent = label;
    if (href) {
      a.href = href;
      if (!href.startsWith("tel:")) {
        a.target = "_blank";
        a.rel = "noopener";
      }
    } else {
      a.classList.add("btn-disabled");
    }
    return a;
  };

  actions.append(
    btn("btn-call", I18N[state.lang].call, s.phone ? `tel:${s.phone}` : null),
    btn("btn-wa", I18N[state.lang].wa, s.whatsapp ? `https://wa.me/${formatWa(s.whatsapp)}` : null),
    btn(
      "btn-map",
      I18N[state.lang].map,
      s.lat && s.lng
        ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`
        : null
    )
  );

  content.append(header, desc, actions);
  card.append(imgWrap, content);
  return card;
}

/* Render */
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

/* UI */
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

/* Fetch */
async function fetchData() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CONFIG.TIMEOUT);
  const res = await fetch(CONFIG.API, { signal: ctrl.signal });
  clearTimeout(t);
  if (!res.ok) throw new Error("API");
  return res.json();
}

/* Boot */
async function boot() {
  updateUI();
  try {
    const cache = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY) || "{}");
    if (cache.t && Date.now() - cache.t < CONFIG.TTL) {
      state.data = processData(cache.d);
      render();
      return;
    }
  } catch {}

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

/* Events */
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
