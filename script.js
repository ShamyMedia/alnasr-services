const CONFIG = {
  API: "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec",
  CACHE_KEY: "alnasr_data_v2",
  TTL: 3600000,
  TIMEOUT: 12000,
  RETRY_DELAY: 1800,
  FALLBACK_IMG:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dy='.3em' font-size='30' fill='%23cbd5e1' text-anchor='middle'%3E🏢%3C/text%3E%3C/svg%3E"
};

let state = {
  data: [],
  lang: localStorage.getItem("lang") || "ar"
};

const DOM = {
  list: document.getElementById("list"),
  search: document.getElementById("search"),
  filter: document.getElementById("categoryFilter"),
  langBtn: document.getElementById("langBtn")
};

if (!DOM.list || !DOM.search || !DOM.filter || !DOM.langBtn) {
  throw new Error("DOM elements missing");
}

const norm = t =>
  String(t || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىي]/g, "ي");

function showSkeleton() {
  DOM.list.innerHTML = Array(6)
    .fill(`<div class="shop-card"><div class="skeleton"></div></div>`)
    .join("");
}

function updateUI() {
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  DOM.langBtn.textContent = state.lang === "ar" ? "EN" : "AR";
}

function processData(raw) {
  return Array.isArray(raw)
    ? raw.map(i => ({
        ...i,
        image: i.image || CONFIG.FALLBACK_IMG,
        _s: norm(`${i.name || ""} ${i.category || ""} ${i.description || ""} ${i.phone || ""}`)
      }))
    : [];
}

function render() {
  DOM.list.innerHTML = "";
  state.data.forEach(i => {
    const d = document.createElement("div");
    d.className = "shop-card";
    d.textContent = i.name;
    DOM.list.appendChild(d);
  });
}

async function loadData() {
  showSkeleton();
  try {
    const r = await fetch(CONFIG.API);
    const j = await r.json();
    state.data = processData(j.shops);
    render();
  } catch {
    DOM.list.innerHTML = "<div class='empty-state'>فشل تحميل البيانات</div>";
  }
}

document.addEventListener("DOMContentLoaded", loadData);
