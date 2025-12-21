const CONFIG = {
  API: "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec",
  CACHE_KEY: "alnasr_data_original_v1",
  TTL: 3600000, 
  TIMEOUT: 12000,
  FALLBACK_IMG: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dy='.3em' font-size='30' fill='%23cbd5e1' text-anchor='middle'%3E🏢%3C/text%3E%3C/svg%3E"
};

const state = {
  data: [],
  categories: new Set(),
  lang: localStorage.getItem("lang") || "ar",
  searchTerm: "",
  categoryFilter: ""
};

const DOM = {
  list: document.getElementById("list"),
  search: document.getElementById("search"),
  filter: document.getElementById("categoryFilter"),
  langBtn: document.getElementById("langBtn"),
  jsonLd: document.getElementById("json-ld")
};

const escapeHTML = str => str ? String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;") : "";
const norm = t => String(t || "").toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/[ىي]/g, "ي").trim();

function showSkeleton() {
  DOM.list.innerHTML = Array(6).fill(`<div class="shop-card skeleton-card"><div class="skeleton-box"></div></div>`).join("");
}

function updateUI() {
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = state.lang;
  DOM.langBtn.textContent = state.lang === "ar" ? "EN" : "AR";
  DOM.search.placeholder = state.lang === "ar" ? "ابحث عن طبيب أو نشاط..." : "Search for services...";
}

function updateSchema() {
  if (!DOM.jsonLd) return;
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "دليل خدمات برج النصر",
    "itemListElement": state.data.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "LocalBusiness",
        "name": item.name,
        "image": item.image,
        "telephone": item.phone,
        "address": { "@type": "PostalAddress", "addressLocality": "برج النصر", "addressCountry": "EG" }
      }
    }))
  };
  DOM.jsonLd.textContent = JSON.stringify(schema);
}

function processData(raw) {
  if (!Array.isArray(raw)) return [];
  state.categories.clear();
  return raw.map(i => {
    if (i.category) state.categories.add(i.category);
    return {
      ...i,
      name: i.name || "بدون اسم",
      image: i.image && i.image.startsWith("http") ? i.image : CONFIG.FALLBACK_IMG,
      _searchStr: norm(`${i.name} ${i.category} ${i.description} ${i.phone}`)
    };
  });
}

function updateCategoryDropdown() {
  const currentVal = DOM.filter.value;
  DOM.filter.innerHTML = `<option value="">${state.lang === 'ar' ? 'الكل' : 'All'}</option>`;
  Array.from(state.categories).sort().forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    DOM.filter.appendChild(opt);
  });
  if (currentVal) DOM.filter.value = currentVal;
}

function render() {
  DOM.list.innerHTML = "";
  const filtered = state.data.filter(i => i._searchStr.includes(state.searchTerm) && (state.categoryFilter === "" || i.category === state.categoryFilter));

  if (!filtered.length) {
    DOM.list.innerHTML = `<div class='empty-state'>${state.lang === 'ar' ? 'لا توجد نتائج مطابقة' : 'No results found'}</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach(i => {
    const d = document.createElement("div");
    d.className = "shop-card";

    const safeName = escapeHTML(i.name);
    const safeCat = escapeHTML(i.category);
    const safeDesc = escapeHTML(i.description);

    const hasMap = (i.lat && i.lng);
    const mapLink = hasMap ? `https://www.google.com/maps/search/?api=1&query=${i.lat},${i.lng}` : "javascript:void(0)";
    
    // A11y
    const disableAttr = (cond) => cond ? 'aria-disabled="true" tabindex="-1"' : '';

    d.innerHTML = `
      <div class="card-image-wrapper">
        <img class="shop-image" src="${i.image}" alt="${safeName}" loading="lazy" />
      </div>
      <div class="card-content">
        <div class="shop-header">
          <span class="shop-name">${safeName}</span>
          <span class="category-badge">${safeCat}</span>
        </div>
        <div class="shop-description" title="${safeDesc}">${safeDesc}</div>
        <div class="card-actions">
          <a href="tel:${i.phone}" class="action-btn btn-call ${!i.phone ? "btn-disabled" : ""}" ${disableAttr(!i.phone)}>${state.lang === 'ar' ? 'اتصال' : 'Call'}</a>
          <a href="https://wa.me/${i.whatsapp}" class="action-btn btn-wa ${!i.whatsapp ? "btn-disabled" : ""}" target="_blank" rel="noopener noreferrer" ${disableAttr(!i.whatsapp)}>${state.lang === 'ar' ? 'واتساب' : 'WhatsApp'}</a>
          <a href="${mapLink}" class="action-btn btn-map ${!hasMap ? "btn-disabled" : ""}" target="_blank" rel="noopener noreferrer" ${disableAttr(!hasMap)}>${state.lang === 'ar' ? 'خريطة' : 'Map'}</a>
        </div>
      </div>
    `;

    const img = d.querySelector(".shop-image");
    img.onload = () => img.classList.add("loaded");
    img.onerror = () => { img.src = CONFIG.FALLBACK_IMG; img.classList.add("loaded"); };
    
    fragment.appendChild(d);
  });
  DOM.list.appendChild(fragment);
}

async function loadData(isRetry = false) {
  if(!isRetry) showSkeleton();
  
  try {
    if (!isRetry) {
        const cached = localStorage.getItem(CONFIG.CACHE_KEY);
        const cacheTime = localStorage.getItem(CONFIG.CACHE_KEY + "_ts");
        if (cached && cacheTime && Date.now() - cacheTime < CONFIG.TTL) {
            state.data = processData(JSON.parse(cached));
            updateCategoryDropdown();
            updateSchema();
            render();
            return;
        }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
    
    const r = await fetch(CONFIG.API, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!r.ok) throw new Error("Server Error");
    
    const j = await r.json();
    const rawData = j.shops || (Array.isArray(j) ? j : []);
    state.data = processData(rawData);
    
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(rawData));
    localStorage.setItem(CONFIG.CACHE_KEY + "_ts", Date.now());
    
    updateCategoryDropdown();
    updateSchema();
    render();
    
  } catch (err) {
    console.error(err);
    const txtErr = state.lang === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data';
    const txtRetry = state.lang === 'ar' ? 'إعادة المحاولة' : 'Retry';
    const txtLoading = state.lang === 'ar' ? 'جاري التحميل...' : 'Loading...';

    DOM.list.innerHTML = `
      <div class='empty-state'>
        <p>${txtErr}</p>
        <button id="retryBtn" class="action-btn btn-map btn-retry" aria-label="${txtRetry}">${txtRetry} ↻</button>
      </div>
    `;

    const retryBtn = document.getElementById("retryBtn");
    if(retryBtn) {
      retryBtn.addEventListener("click", () => {
        retryBtn.textContent = txtLoading;
        retryBtn.disabled = true;
        loadData(true).then(() => {}).catch(() => {
             retryBtn.textContent = txtRetry + " ↻";
             retryBtn.disabled = false;
        });
      });
    }
  }
}

// Event Listeners
DOM.langBtn.addEventListener("click", () => {
  state.lang = state.lang === "ar" ? "en" : "ar";
  localStorage.setItem("lang", state.lang);
  updateUI();
  updateCategoryDropdown();
  render();
});

DOM.search.addEventListener("input", (e) => {
  state.searchTerm = norm(e.target.value);
  render();
});

DOM.filter.addEventListener("change", (e) => {
  state.categoryFilter = e.target.value;
  render();
});

// Init
updateUI();
loadData();
