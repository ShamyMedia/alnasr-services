/**
 * 🏛️ AL-NASR DIRECTORY APP
 * Optimized & Secured
 */

const CONFIG = {
  // تأكد من صحة رابط الـ Script الخاص بك
  API: "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec",
  CACHE_KEY: "alnasr_data_v2",
  TTL: 3600000, // 1 Hour
  TIMEOUT: 12000, 
  FALLBACK_IMG: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dy='.3em' font-size='30' fill='%23cbd5e1' text-anchor='middle'%3E🏢%3C/text%3E%3C/svg%3E"
};

const I18N = {
  ar: { 
    call: "اتصال", wa: "واتساب", map: "الموقع", empty: "عذراً، لم نجد نتائج مطابقة.", 
    search: "بحث (طبيب، مطعم...)", all: "جميع التخصصات", netErr: "تأكد من الاتصال بالإنترنت"
  },
  en: { 
    call: "Call", wa: "WhatsApp", map: "Location", empty: "No results found.", 
    search: "Search...", all: "All Categories", netErr: "Check internet connection"
  }
};

const CAT_MAP = {
  "Clinic": "عيادة", "Pharmacy": "صيدلية", "Center": "مركز طبي", "Lab": "معمل", 
  "Store": "متجر", "Office": "مكتب", "Restaurant": "مطعم", "Cafe": "كافيه", "Gym": "جيم", "Other": "خدمات أخرى"
};

let state = { data: [], lang: localStorage.getItem("lang") || "ar" };

// --- Utilities ---
const safeUrl = u => /^(https?|tel|mailto):/i.test(String(u).trim()) ? String(u).trim() : "";
const norm = t => String(t||"").toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/[ىي]/g,"ي");
const formatWa = n => { let p=String(n).replace(/\D/g,''); if(p.startsWith('01')) return '2'+p; return p; };
const getCatDisplay = c => (state.lang==='ar' && CAT_MAP[c]) ? CAT_MAP[c] : c;

function renderTextWithBr(element, text) {
  element.innerHTML = "";
  if (!text) return;
  String(text).split(/\n|<br\s*\/?>/i).forEach((part, i) => {
    if (i > 0) element.appendChild(document.createElement('br'));
    element.appendChild(document.createTextNode(part.trim()));
  });
}

// --- Data Processing ---
const processData = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map(i => {
    const lat = typeof i.lat === 'string' ? parseFloat(i.lat.replace(',','.')) : parseFloat(i.lat);
    const lng = typeof i.lng === 'string' ? parseFloat(i.lng.replace(',','.')) : parseFloat(i.lng);
    const searchStr = norm(`${i.name} ${i.category} ${CAT_MAP[i.category]||''} ${i.description||''} ${i.phone||''}`);
    
    return { 
      name: i.name, category: i.category, description: i.description,
      phone: i.phone, whatsapp: i.whatsapp, image: i.image,
      lat: (isFinite(lat) && Math.abs(lat) <= 90) ? lat : null,
      lng: (isFinite(lng) && Math.abs(lng) <= 180) ? lng : null,
      _s: searchStr
    };
  });
};

// --- DOM & Rendering ---
const DOM = {
  list: document.getElementById("list"),
  search: document.getElementById("search"),
  filter: document.getElementById("categoryFilter"),
  langBtn: document.getElementById("langBtn")
};

function createCard(s) {
  const article = document.createElement("article");
  article.className = "shop-card";

  // Image
  const imgWrap = document.createElement("div");
  imgWrap.className = "card-image-wrapper";
  const img = document.createElement("img");
  img.className = "shop-image";
  img.loading = "lazy";
  img.src = safeUrl(s.image) || CONFIG.FALLBACK_IMG;
  img.onload = () => img.classList.add('loaded');
  img.onerror = () => { img.src = CONFIG.FALLBACK_IMG; img.classList.add('loaded'); };
  imgWrap.appendChild(img);

  // Content
  const content = document.createElement("div");
  content.className = "card-content";

  const header = document.createElement("div");
  header.className = "shop-header";
  const titleDiv = document.createElement("div");
  const h3 = document.createElement("h3");
  h3.className = "shop-name";
  renderTextWithBr(h3, s.name);
  titleDiv.appendChild(h3);
  
  const badge = document.createElement("span");
  badge.className = "category-badge";
  badge.textContent = getCatDisplay(s.category);
  header.append(titleDiv, badge);

  const desc = document.createElement("div");
  desc.className = "shop-description";
  renderTextWithBr(desc, s.description);

  // Actions
  const actions = document.createElement("div");
  actions.className = "card-actions";
  
  const createBtn = (cls, key, href, icon) => {
    const a = document.createElement("a");
    a.textContent = `${icon || ''} ${I18N[state.lang][key]}`;
    if (href) {
      a.className = `action-btn ${cls}`; a.href = href;
      if (cls !== 'btn-call') { a.target = "_blank"; a.rel = "noopener"; }
    } else {
      a.className = `action-btn btn-disabled`;
    }
    return a;
  };

  actions.appendChild(createBtn('btn-call', 'call', s.phone ? `tel:${s.phone}` : null, '📞'));
  actions.appendChild(createBtn('btn-wa', 'wa', s.whatsapp ? `https://wa.me/${formatWa(s.whatsapp)}` : null, '💬'));
  
  const mapUrl = (s.lat && s.lng) ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}` : null;
  actions.appendChild(createBtn('btn-map', 'map', mapUrl, '📍'));

  content.append(header, desc, actions);
  article.append(imgWrap, content);
  return article;
}

function render() {
  const qTokens = norm(DOM.search.value).split(" ").filter(Boolean);
  const cat = DOM.filter.value;
  DOM.list.innerHTML = "";

  const filtered = state.data.filter(item => {
    const matchesCat = !cat || item.category === cat;
    const matchesSearch = qTokens.length === 0 || qTokens.every(t => item._s.includes(t));
    return matchesCat && matchesSearch;
  });

  if (!filtered.length) { 
    DOM.list.innerHTML = `<div class="empty-state">${I18N[state.lang].empty}</div>`; return; 
  }
  const frag = document.createDocumentFragment();
  filtered.forEach(s => frag.appendChild(createCard(s)));
  DOM.list.appendChild(frag);
}

function updateUI() {
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  DOM.langBtn.textContent = state.lang === "ar" ? "EN" : "AR";
  DOM.search.placeholder = I18N[state.lang].search;
  
  const curr = DOM.filter.value;
  const cats = [...new Set(state.data.map(i => i.category).filter(Boolean))].sort();
  DOM.filter.innerHTML = `<option value="">${I18N[state.lang].all}</option>`;
  cats.forEach(c => {
    const o = document.createElement("option");
    o.value = c; o.textContent = getCatDisplay(c); DOM.filter.appendChild(o);
  });
  DOM.filter.value = curr;
}

// --- Boot ---
async function boot() {
  updateUI();
  DOM.list.innerHTML = Array(6).fill('<div class="shop-card" style="height:350px"><div class="skeleton" style="height:100%"></div></div>').join('');

  const cache = localStorage.getItem(CONFIG.CACHE_KEY);
  if (cache) {
    try {
      const j = JSON.parse(cache);
      if (Date.now() - j.t < CONFIG.TTL) { state.data = processData(j.d); updateUI(); render(); return; }
    } catch(e) { localStorage.removeItem(CONFIG.CACHE_KEY); }
  }

  try {
    const res = await fetch(CONFIG.API);
    if (!res.ok) throw new Error("API Error");
    const json = await res.json();
    const raw = json.shops || json.data || [];
    
    if (raw.length) {
      localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({t:Date.now(), d:raw}));
      state.data = processData(raw);
      updateUI(); render();
    } else { DOM.list.innerHTML = `<div class="empty-state">${I18N[state.lang].empty}</div>`; }
  } catch (e) {
    DOM.list.innerHTML = `<div class="empty-state">${I18N[state.lang].netErr}</div>`;
  }
}

DOM.search.addEventListener("input", () => { setTimeout(render, 150); });
DOM.filter.addEventListener("change", render);
DOM.langBtn.onclick = () => {
  state.lang = state.lang === "ar" ? "en" : "ar";
  localStorage.setItem("lang", state.lang);
  updateUI(); render();
};

boot();
