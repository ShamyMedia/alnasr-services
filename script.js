/**
 * 🛡️ Enterprise Security & Logic
 */

const CONFIG = {
  API: "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec",
  CACHE_KEY: "alnasr_v_final_secure_2",
  TTL: 3600000, 
  TIMEOUT: 15000,
  FALLBACK_IMG: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 170'%3E%3Crect width='300' height='170' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dy='.3em' font-size='30' fill='%23cbd5e1'%3E🏥%3C/text%3E%3C/svg%3E"
};

const I18N = {
  ar: { 
    call: "اتصال", wa: "واتساب", map: "افتح الخريطة", // تم التعديل هنا
    empty: "لا توجد نتائج", search: "ابحث عن اسم، تخصص، رقم...", all: "الكل", 
    title: "دليل خدمات برج النصر", desc: "كل الخدمات في مكان واحد",
    netErr: "تأكد من الاتصال بالإنترنت"
  },
  en: { 
    call: "Call", wa: "WhatsApp", map: "Open Map", 
    empty: "No results found", search: "Search...", all: "All", 
    title: "Al Nasr Directory", desc: "All services in one place",
    netErr: "Check internet connection"
  }
};

const CAT_MAP = {
  "Clinic": "عيادة", "Pharmacy": "صيدلية", "Center": "مركز", "Lab": "معمل", 
  "Store": "متجر", "Office": "مكتب", "Restaurant": "مطعم", "Cafe": "كافيه", "Gym": "جيم"
};

const state = { 
  data: [], 
  lang: localStorage.getItem("lang") || "ar"
};

// --- Security & Utils ---

// تنظيف الروابط ومنع XSS في href
const safeUrl = u => {
  const s = String(u || "").trim();
  return /^(https?|tel|mailto):/i.test(s) ? s : "";
};

const norm = t => String(t || "").toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/[ىي]/g, "ي").replace(/[\u064B-\u0652]/g, "");

// التحقق من رقم الهاتف (يسمح فقط بالأرقام وعلامة +)
const safePhone = p => {
  const s = String(p || "").trim();
  return /^[+]?[0-9]{8,15}$/.test(s) ? s : null; // يرجع null لو الرقم غير صالح
};

const safeWa = p => {
  const s = String(p || "").replace(/\D/g, ''); // أرقام فقط
  // تحقق بسيط: يجب أن يكون الرقم طويلاً بما يكفي
  return s.length >= 10 ? `https://wa.me/2${s.startsWith('0') ? s.substring(1) : s}` : null;
};

const getCatDisplay = (cat) => (state.lang === 'ar' && CAT_MAP[cat]) ? CAT_MAP[cat] : cat;

// دالة عرض النصوص بأمان مع دعم <br>
function renderTextWithBr(element, text) {
  if (!text) return;
  const parts = String(text).split(/<br\s*\/?>/i);
  parts.forEach((part, index) => {
    if (index > 0) element.appendChild(document.createElement('br'));
    element.appendChild(document.createTextNode(part));
  });
}

// --- Data Processing ---
const processData = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map(i => {
    const lat = parseFloat(i.lat);
    const lng = parseFloat(i.lng);
    const catAr = CAT_MAP[i.category] || "";
    const searchStr = norm(`${i.name} ${i.category} ${catAr} ${i.description||""} ${i.phone||""}`);
    
    return { 
      name: i.name,
      category: i.category,
      description: i.description,
      phone: i.phone,
      whatsapp: i.whatsapp,
      image: i.image,
      // التحقق الصارم من الإحداثيات
      _lat: (isFinite(lat) && Math.abs(lat) <= 90) ? lat : null,
      _lng: (isFinite(lng) && Math.abs(lng) <= 180) ? lng : null,
      _s: searchStr
    };
  });
};

// --- DOM Creator ---
function createCard(s) {
  const article = document.createElement('article');
  article.className = 'shop-card';

  // Image
  const imgWrap = document.createElement('div');
  imgWrap.className = 'card-image-wrapper';
  const img = document.createElement('img');
  img.className = 'shop-image';
  img.alt = s.name;
  img.loading = 'lazy';
  img.onload = () => img.classList.add('loaded');
  img.onerror = () => { img.src = CONFIG.FALLBACK_IMG; img.classList.add('loaded'); };
  img.src = safeUrl(s.image) || CONFIG.FALLBACK_IMG;
  imgWrap.appendChild(img);

  // Content
  const content = document.createElement('div');
  content.className = 'card-content';

  // Header
  const header = document.createElement('div');
  header.className = 'shop-header';
  
  const title = document.createElement('h3');
  title.className = 'shop-name';
  renderTextWithBr(title, s.name);
  
  const badge = document.createElement('span');
  badge.className = 'category-badge';
  badge.textContent = getCatDisplay(s.category);

  header.append(title, badge);

  // Description
  const desc = document.createElement('div');
  desc.className = 'shop-description';
  renderTextWithBr(desc, s.description);

  // Actions Container
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  // Helper to create buttons (Enabled or Disabled)
  const createBtn = (typeClass, textKey, href, isActive) => {
    const a = document.createElement('a');
    a.textContent = I18N[state.lang][textKey]; // النص مترجم
    
    if (isActive && href) {
      a.className = `action-btn ${typeClass}`; // كلاس اللون النشط
      a.href = href;
      if (typeClass !== 'btn-call') {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
    } else {
      a.className = `action-btn btn-disabled`; // كلاس رمادي
      a.removeAttribute('href'); // إزالة الرابط لمنع النقر
      a.setAttribute('aria-disabled', 'true');
    }
    return a;
  };

  // Logic for buttons
  const validPhone = safePhone(s.phone);
  const validWa = safeWa(s.whatsapp); // نستخدم الواتس كما هو من البيانات
  const validMap = (s._lat !== null && s._lng !== null);
  const mapLink = validMap ? `https://www.google.com/maps/search/?api=1&query=${s._lat},${s._lng}` : null;

  // Add Buttons (Always added, style depends on validity)
  actions.appendChild(createBtn('btn-call', 'call', `tel:${validPhone}`, !!validPhone));
  actions.appendChild(createBtn('btn-wa', 'wa', validWa, !!validWa));
  actions.appendChild(createBtn('btn-map', 'map', mapLink, validMap));

  content.append(header, desc, actions);
  article.append(imgWrap, content);
  
  return article;
}

// --- View Logic ---
const DOM = {
  list: document.getElementById("list"),
  search: document.getElementById("search"),
  filter: document.getElementById("categoryFilter"),
  langBtn: document.getElementById("langBtn"),
  arrow: document.querySelector(".filter-arrow")
};

function updateUI() {
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = state.lang;
  
  DOM.langBtn.textContent = state.lang === "ar" ? "EN" : "AR";
  DOM.search.placeholder = I18N[state.lang].search;
  
  // ضبط اتجاه السهم
  DOM.arrow.style.left = state.lang === "ar" ? "12px" : "auto";
  DOM.arrow.style.right = state.lang === "ar" ? "auto" : "12px";

  document.querySelectorAll("[data-key]").forEach(e => {
    e.textContent = I18N[state.lang][e.dataset.key];
  });
  
  populateFilter();
}

function populateFilter() {
  const currentVal = DOM.filter.value;
  const cats = [...new Set(state.data.map(i => i.category).filter(Boolean))];
  
  DOM.filter.innerHTML = "";
  const allOpt = document.createElement('option');
  allOpt.value = "";
  allOpt.textContent = I18N[state.lang].all;
  DOM.filter.appendChild(allOpt);

  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = getCatDisplay(c);
    DOM.filter.appendChild(opt);
  });
    
  DOM.filter.value = currentVal;
}

function render() {
  const qTokens = norm(DOM.search.value).split(" ").filter(Boolean);
  const catFilter = DOM.filter.value;
  
  const filtered = state.data.filter(item => {
    if (catFilter && item.category !== catFilter) return false;
    if (qTokens.length > 0) {
      return qTokens.every(token => item._s.includes(token));
    }
    return true;
  });

  DOM.list.innerHTML = "";

  if (!filtered.length) { 
    DOM.list.textContent = I18N[state.lang].empty;
    DOM.list.className = 'empty-state';
    return; 
  }
  DOM.list.className = '';

  const fragment = document.createDocumentFragment();
  filtered.forEach(s => {
    fragment.appendChild(createCard(s));
  });
  DOM.list.appendChild(fragment);
}

// --- Boot & Events ---
let debounce;
DOM.search.oninput = () => { clearTimeout(debounce); debounce = setTimeout(render, 250); };
DOM.filter.onchange = render;
DOM.langBtn.onclick = () => {
  state.lang = state.lang === "ar" ? "en" : "ar";
  localStorage.setItem("lang", state.lang);
  updateUI(); render();
};

async function boot() {
  updateUI();
  const cache = localStorage.getItem(CONFIG.CACHE_KEY);
  let loaded = false;

  if (cache) {
    try {
      const j = JSON.parse(cache);
      if (Array.isArray(j.d) && j.d.length > 0) {
        state.data = processData(j.d);
        populateFilter(); render();
        loaded = true;
        if (Date.now() - j.t < CONFIG.TTL) return;
      }
    } catch (e) { try { localStorage.removeItem(CONFIG.CACHE_KEY); } catch(err){} }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

    const res = await fetch(CONFIG.API, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error("Server Error");
    
    const json = await res.json();
    const raw = json.shops || json.data || [];
    
    if (raw.length > 0) {
      try {
        localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ t: Date.now(), d: raw }));
      } catch(e) { console.warn("Quota exceeded"); }
      
      state.data = processData(raw);
      populateFilter(); render();
    }
  } catch (err) {
    if (!loaded) {
      DOM.list.textContent = I18N[state.lang].netErr;
      DOM.list.className = 'empty-state';
    }
  }
}

boot();