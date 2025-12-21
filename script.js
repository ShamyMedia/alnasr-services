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
  if (!state.data.length) {
    DOM.list.innerHTML = "<div class='empty-state'>لا توجد بيانات للعرض</div>";
    return;
  }

  state.data.forEach(i => {
    const d = document.createElement("div");
    d.className = "shop-card";

    d.innerHTML = `
      <div class="card-image-wrapper">
        <img class="shop-image" src="${i.image}" alt="${i.name}" loading="lazy" />
      </div>
      <div class="card-content">
        <div class="shop-header">
          <span class="shop-name">${i.name}</span>
          <span class="category-badge">${i.category}</span>
        </div>
        <div class="shop-description">${i.description || ""}</div>
        <div class="card-actions">
          <a href="tel:${i.phone}" class="action-btn btn-call ${!i.phone ? "btn-disabled" : ""}">اتصال</a>
          <a href="https://wa.me/${i.whatsapp}" class="action-btn btn-wa ${!i.whatsapp ? "btn-disabled" : ""}" target="_blank">واتساب</a>
          <a href="https://www.google.com/maps/search/?api=1&query=${i.lat},${i.lng}" class="action-btn btn-map">خريطة</a>
        </div>
      </div>
    `;

    const img = d.querySelector(".shop-image");
    img.onload = () => img.classList.add("loaded");
    DOM.list.appendChild(d);
  });
}

async function loadData() {
  showSkeleton();
  try {
    const cached = localStorage.getItem(CONFIG.CACHE_KEY);
    const cacheTime = localStorage.getItem(CONFIG.CACHE_KEY + "_ts");

    if (cached && cacheTime && Date.now() - cacheTime < CONFIG.TTL) {
      state.data = processData(JSON.parse(cached));
      render();
      return;
    }

    const r = await fetch(CONFIG.API);
    const j = await r.json();
    state.data = processData(j.shops);
    render();

    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(j.shops));
    localStorage.setItem(CONFIG.CACHE_KEY + "_ts", Date.now());
  } catch {
    DOM.list.innerHTML = "<div class='empty-state'>فشل تحميل البيانات</div>";
  }
}

DOM.langBtn.addEventListener("click", () => {
  state.lang = state.lang === "ar" ? "en" : "ar";
  localStorage.setItem("lang", state.lang);
  updateUI();
  render();
});

DOM.search.addEventListener("input", e => {
  const val = norm(e.target.value);
  state.data.forEach(i => i._visible = i._s.includes(val));
  renderFiltered();
});

function renderFiltered() {
  DOM.list.innerHTML = "";
  const filtered = state.data.filter(i => i._visible !== false);
  if (!filtered.length) {
    DOM.list.innerHTML = "<div class='empty-state'>لا توجد نتائج مطابقة</div>";
    return;
  }
  filtered.forEach(i => {
    const d = document.createElement("div");
    d.className = "shop-card";
    d.innerHTML = `
      <div class="card-image-wrapper">
        <img class="shop-image" src="${i.image}" alt="${i.name}" loading="lazy" />
      </div>
      <div class="card-content">
        <div class="shop-header">
          <span class="shop-name">${i.name}</span>
          <span class="category-badge">${i.category}</span>
        </div>
        <div class="shop-description">${i.description || ""}</div>
        <div class="card-actions">
          <a href="tel:${i.phone}" class="action-btn btn-call ${!i.phone ? "btn-disabled" :
