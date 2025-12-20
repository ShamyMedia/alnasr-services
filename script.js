"use strict";

const API = "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec";
const CACHE_KEY = "alnasr_vfinal_secure";
const TTL = 60 * 60 * 1000;

const state = { lang: localStorage.getItem("lang") || "ar", data: [] };

const normalize = t => String(t || "").toLowerCase()
  .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/[ىي]/g, "ي");

const safePhone = p => {
  const v = String(p || "").replace(/[^0-9+]/g, "");
  return v.length >= 8 ? v : null;
};

const list = document.getElementById("list");
const search = document.getElementById("search");
const filter = document.getElementById("categoryFilter");
const langBtn = document.getElementById("langBtn");

// أيقونات احترافية ثابتة المظهر
const ICONS = {
  phone: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.81 12.81 0 0 0 .63 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.63A2 2 0 0 1 22 16.92z"></path></svg>`,
  wa: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  map: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`
};

const I18N = {
  ar: { call: "اتصال", wa: "واتساب", map: "الموقع", empty: "لا توجد نتائج", all: "الكل" },
  en: { call: "Call", wa: "WhatsApp", map: "Map", empty: "No results", all: "All" }
};

function btn(ok, cls, html, href) {
  const el = document.createElement(ok ? "a" : "span");
  el.className = ok ? `action-btn ${cls}` : "btn-disabled";
  el.innerHTML = html;
  if (ok) {
    el.href = href;
    if (cls !== "btn-call") { el.target = "_blank"; el.rel = "noopener noreferrer"; }
  }
  return el;
}

function createCard(i) {
  const card = document.createElement("article");
  card.className = "shop-card";
  
  const imgWrap = document.createElement("div");
  imgWrap.className = "card-img";
  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = i.name;
  img.onerror = () => { img.src = "https://placehold.co/400x250/f1f5f9/64748b?text=" + encodeURIComponent(i.name); };
  img.src = i.image || "";
  imgWrap.appendChild(img);

  const body = document.createElement("div");
  body.className = "card-body";
  body.innerHTML = `<div class="card-title">${i.name}</div><div class="card-desc">${i.description || ""}</div>`;

  const actions = document.createElement("div");
  actions.className = "actions";
  const phone = safePhone(i.phone);
  const waNum = i.whatsapp ? String(i.whatsapp).replace(/\D/g, "") : null;
  const waUrl = waNum ? `https://wa.me/2${waNum}` : null;
  const mapUrl = i.lat && i.lng ? `https://www.google.com/maps?q=${i.lat},${i.lng}` : null;

  actions.append(
    btn(phone, "btn-call", `${ICONS.phone} <span>${I18N[state.lang].call}</span>`, `tel:${phone}`),
    btn(waUrl, "btn-wa", `${ICONS.wa} <span>${I18N[state.lang].wa}</span>`, waUrl),
    btn(mapUrl, "btn-map", `${ICONS.map} <span>${I18N[state.lang].map}</span>`, mapUrl)
  );

  body.appendChild(actions);
  card.append(imgWrap, body);
  return card;
}

function updateFilters() {
  const cats = [...new Set(state.data.map(i => i.category).filter(Boolean))].sort();
  filter.innerHTML = `<option value="">${I18N[state.lang].all}</option>`;
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = c;
    filter.appendChild(opt);
  });
}

function render() {
  const q = normalize(search.value);
  const c = filter.value;
  list.innerHTML = "";
  const res = state.data.filter(i => (!c || i.category === c) && (!q || i._s.includes(q)));
  if (!res.length) {
    list.innerHTML = `<div class="empty">${I18N[state.lang].empty}</div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  res.forEach(i => frag.appendChild(createCard(i)));
  list.appendChild(frag);
}

async function boot() {
  const cache = localStorage.getItem(CACHE_KEY);
  if (cache) {
    try {
      const j = JSON.parse(cache);
      if (Date.now() - j.t < TTL) { state.data = j.d; updateFilters(); render(); }
    } catch {}
  }
  try {
    const r = await fetch(API);
    const j = await r.json();
    state.data = (j.shops || []).map(i => ({
      ...i,
      _s: normalize(`${i.name} ${i.description || ""} ${i.category || ""}`)
    }));
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: state.data }));
    updateFilters(); render();
  } catch {
    if (!state.data.length) list.innerHTML = "<div class='empty'>فشل تحميل البيانات</div>";
  }
}

search.oninput = render;
filter.onchange = render;
langBtn.onclick = () => {
  state.lang = state.lang === "ar" ? "en" : "ar";
  localStorage.setItem("lang", state.lang);
  location.reload();
};
boot();
