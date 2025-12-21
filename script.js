const CONFIG = {
  API: "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec",
  CACHE_KEY: "alnasr_prod_secure_v4",
  TTL: 3600000, // 1 Hour
  FALLBACK_IMG: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dy='.3em' font-size='30' fill='%23cbd5e1' text-anchor='middle'%3E🏢%3C/text%3E%3C/svg%3E"
};

const state = {
  data: [],
  categories: new Set(),
  lang: localStorage.getItem("lang") || "ar",
  search: "",
  filter: ""
};

const DOM = {
  list: document.getElementById("list"),
  search: document.getElementById("search"),
  filter: document.getElementById("categoryFilter"),
  langBtn: document.getElementById("langBtn")
};

// Security: Prevent XSS attacks from Google Sheet data
const escapeHTML = s => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");

// Normalize text for better searching
const norm = s => String(s || "").toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/[ىي]/g,"ي").trim();

// Convert <br> to newline for display
const cleanText = s => String(s || "").replace(/<br\s*\/?>/gi, '\n');

function showSkeleton() {
  DOM.list.innerHTML = Array(6).fill(`<div class="shop-card skeleton-card"><div class="skeleton-box"></div></div>`).join("");
}

function updateUI() {
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  DOM.langBtn.textContent = state.lang === "ar" ? "EN" : "AR";
  DOM.search.placeholder = state.lang === "ar" ? "ابحث عن طبيب أو نشاط..." : "Search services...";
  
  // Populate Categories
  const currentVal = DOM.filter.value;
  DOM.filter.innerHTML = `<option value="">${state.lang === 'ar' ? 'الكل' : 'All'}</option>`;
  Array.from(state.categories).sort().forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    DOM.filter.appendChild(opt);
  });
  DOM.filter.value = currentVal;
}

function render() {
  DOM.list.innerHTML = "";

  const items = state.data.filter(i => 
    i._search.includes(state.search) && 
    (!state.filter || i.category === state.filter)
  );

  if (!items.length) {
    DOM.list.innerHTML = `<div class='empty-state'>${state.lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}</div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  items.forEach(i => {
    const el = document.createElement("div");
    el.className = "shop-card";

    // Fix Map Link
    const mapLink = (i.lat && i.lng) 
      ? `https://www.google.com/maps/search/?api=1&query=${i.lat},${i.lng}`
      : "javascript:void(0)";

    // Secure Data
    const safeName = escapeHTML(cleanText(i.name));
    const safeDesc = escapeHTML(cleanText(i.description));
    const safeCat = escapeHTML(cleanText(i.category));

    el.innerHTML = `
      <div class="card-image-wrapper">
        <img class="shop-image" src="${i.image}" alt="${safeName}" loading="lazy">
      </div>
      <div class="card-content">
        <div class="shop-header">
          <span class="shop-name">${safeName}</span>
          <span class="category-badge">${safeCat}</span>
        </div>
        <div class="shop-description">${safeDesc}</div>
        <div class="card-actions">
          <a class="action-btn btn-call ${!i.phone?"btn-disabled":""}" href="tel:${i.phone}">📞 ${state.lang === 'ar' ? 'اتصال' : 'Call'}</a>
          <a class="action-btn btn-wa ${!i.whatsapp?"btn-disabled":""}" href="https://wa.me/${i.whatsapp}" target="_blank" rel="noopener noreferrer">💬 ${state.lang === 'ar' ? 'واتساب' : 'WhatsApp'}</a>
          <a class="action-btn btn-map ${(!i.lat || !i.lng)?"btn-disabled":""}" href="${mapLink}" target="_blank" rel="noopener noreferrer">📍 ${state.lang === 'ar' ? 'الموقع' : 'Map'}</a>
        </div>
      </div>
    `;
    
    const img = el.querySelector("img");
    img.onload = () => img.classList.add("loaded");
    img.onerror = () => { img.src = CONFIG.FALLBACK_IMG; img.classList.add("loaded"); };

    frag.appendChild(el);
  });

  DOM.list.appendChild(frag);
}

async function load() {
  showSkeleton();
  const cached = localStorage.getItem(CONFIG.CACHE_KEY);
  
  if (cached) {
    try {
      state.data = JSON.parse(cached);
      state.data.forEach(i => state.categories.add(i.category));
      updateUI();
      render();
    } catch { localStorage.removeItem(CONFIG.CACHE_KEY); }
  }

  try {
    const res = await fetch(CONFIG.API);
    if (!res.ok) throw new Error("Network Error");
    const json = await res.json();
    
    state.categories.clear();
    state.data = (json.shops || []).map(i => {
      if(i.category) state.categories.add(i.category);
      // Force HTTPS
      let secureImg = i.image;
      if(secureImg && secureImg.startsWith("http://")) secureImg = secureImg.replace("http://","https://");
      
      return {
        ...i,
        image: secureImg || CONFIG.FALLBACK_IMG,
        _search: norm(`${i.name} ${i.category} ${i.description}`)
      };
    });

    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(state.data));
    updateUI();
    render();
  } catch (e) {
    if(!state.data.length) DOM.list.innerHTML = `<div class='empty-state'>خطأ في الاتصال</div>`;
  }
}

DOM.langBtn.addEventListener("click", () => {
  state.lang = state.lang === "ar" ? "en" : "ar";
  localStorage.setItem("lang", state.lang);
  updateUI();
  render();
});

DOM.search.addEventListener("input", e => {
  state.search = norm(e.target.value);
  render();
});

DOM.filter.addEventListener("change", e => {
  state.filter = e.target.value;
  render();
});

// Start
updateUI();
load();
