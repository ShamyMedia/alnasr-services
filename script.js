const API = "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec";
const CACHE_KEY = "alnasr_secure_v4";
const TTL = 60 * 60 * 1000;

const list = document.getElementById("list");
const searchInput = document.getElementById("search");
const langBtn = document.getElementById("langBtn");

let services = [];
let userPos = null;
let lang = localStorage.getItem("lang") || "ar";

const i18n = {
  ar: { call: "اتصال", wa: "واتساب", map: "الموقع", empty: "عفواً، لا توجد نتائج مطابقة", search: "ابحث عن طبيب أو تخصص أو خدمة..." },
  en: { call: "Call", wa: "WhatsApp", map: "Map", empty: "No results found", search: "Search doctor or service..." }
};

// 1. تحسين الأمان: دالة لتعقيم النصوص ومنع الأكواد الخبيثة
function safeHTML(str) {
  if (!str) return "";
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function normalize(text="") {
  return text.toLowerCase()
    .replace(/[أإآ]/g,"ا").replace(/ة/g,"ه")
    .replace(/[ىي]/g,"ي").replace(/[\u064B-\u0652]/g,"");
}

function getWaLink(num) {
  if(!num) return "";
  let n = num.toString().replace(/\D/g,'');
  if(n.startsWith("01")) return "2" + n.substring(1);
  if(n.startsWith("1")) return "20" + n;
  return n.startsWith("2") ? n : "2" + n;
}

function applyLang(){
  document.documentElement.dir = lang==="ar"?"rtl":"ltr";
  document.documentElement.lang = lang;
  langBtn.textContent = lang==="ar"?"EN":"AR";
  searchInput.placeholder = i18n[lang].search;
  document.querySelectorAll("[data-ar]").forEach(el=>{
    el.textContent = el.dataset[lang];
  });
}

langBtn.onclick = ()=>{
  lang = lang==="ar"?"en":"ar";
  localStorage.setItem("lang",lang);
  applyLang();
  render(services);
};

function skeleton(){
  list.innerHTML = "";
  // رسم 6 كروت وهمية
  for(let i=0;i<6;i++){
    const div = document.createElement("div");
    div.className = "shop-card skeleton";
    list.appendChild(div);
  }
}

function distance(lat1,lng1,lat2,lng2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
    Math.sin(dLng/2)**2;
  return (R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))).toFixed(1);
}

function render(data){
  list.innerHTML="";
  
  if(!data.length){
    list.innerHTML=`<div class="empty-state"><span class="empty-icon">🔍</span>${i18n[lang].empty}</div>`;
    return;
  }

  // استخدام Fragment لتحسين الأداء (Reflow مرة واحدة)
  const fragment = document.createDocumentFragment();
  const ph = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='170'%3E%3Crect width='300' height='170' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-size='30' fill='%23cbd5e1'%3E🏥%3C/text%3E%3C/svg%3E`;

  data.forEach(s=>{
    let distHtml = "";
    if(userPos && s.lat && s.lng){
      distHtml = `<div class="distance-badge">📍 ${distance(userPos.lat,userPos.lng,s.lat,s.lng)} km</div>`;
    }

    const card = document.createElement("article");
    card.className = "shop-card";
    
    // استخدام safeHTML للحماية
    card.innerHTML = `
      <div class="card-image-wrapper">
        <img class="shop-image" loading="lazy" src="${s.image||ph}" onerror="this.src='${ph}'" alt="${safeHTML(s.name)}">
      </div>
      <div class="card-content">
        <div class="shop-header">
          <div>
            <h3 class="shop-name">${safeHTML(s.name)}</h3>
            ${distHtml}
          </div>
          <span class="category-badge">${safeHTML(s.category)}</span>
        </div>
        <p class="shop-description">${safeHTML(s.description||"")}</p>
        <div class="card-actions">
          <a href="tel:${s.phone}" class="action-btn btn-call">📞 ${i18n[lang].call}</a>
          <a href="https://wa.me/${getWaLink(s.whatsapp)}" target="_blank" class="action-btn btn-wa">💬 ${i18n[lang].wa}</a>
          <a href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}" target="_blank" class="action-btn btn-map">🗺️ ${i18n[lang].map}</a>
        </div>
      </div>
    `;
    fragment.appendChild(card);
  });
  
  list.appendChild(fragment);
}

// 2. تحسين البحث: إضافة تأخير بسيط (Debounce) لمنع اللاق
let timeout = null;
searchInput.oninput = e => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    const q = normalize(e.target.value);
    render(services.filter(s =>
      normalize(s.name + s.category + (s.description || "")).includes(q)
    ));
  }, 150); // انتظار 150 ملي ثانية
};

async function load(){
  applyLang();
  skeleton();
  
  const cached = localStorage.getItem(CACHE_KEY);
  let loadedFromCache = false;

  if(cached){
    const c = JSON.parse(cached);
    if(Date.now() - c.time < TTL){
      services = c.data;
      render(services);
      loadedFromCache = true;
    }
  }

  try {
    const res = await fetch(API);
    const json = await res.json();
    services = json.shops || [];
    localStorage.setItem(CACHE_KEY, JSON.stringify({time: Date.now(), data: services}));
    // إعادة الرسم فقط إذا كانت البيانات مختلفة أو لم يتم التحميل من الكاش
    if(!loadedFromCache || JSON.stringify(services) !== JSON.stringify(JSON.parse(cached).data)) {
        render(services);
    }
  } catch(e) {
    if(!loadedFromCache && services.length === 0) {
        list.innerHTML = `<div class="empty-state">⚠️ تأكد من الاتصال بالإنترنت</div>`;
    }
  }
}

if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(p=>{
    userPos = {lat: p.coords.latitude, lng: p.coords.longitude};
    if(services.length) render(services);
  });
}

load();
