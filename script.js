const API = "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec";
const CACHE_KEY = "alnasr_fixed_grid_v2";
const TTL = 60 * 60 * 1000;

const list = document.getElementById("list");
const searchInput = document.getElementById("search");
const langBtn = document.getElementById("langBtn");

let services = [];
let userPos = null;
let lang = localStorage.getItem("lang") || "ar";

const i18n = {
  ar: { call: "اتصال", wa: "واتساب", map: "الموقع", empty: "لا توجد نتائج", search: "ابحث عن طبيب أو تخصص..." },
  en: { call: "Call", wa: "WhatsApp", map: "Map", empty: "No results", search: "Search doctor or service..." }
};

function normalize(text="") {
  return text.toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/[ىي]/g,"ي").replace(/[\u064B-\u0652]/g,"");
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
  
  // ضبط أيقونة البحث
  const icon = document.querySelector('.search-icon');
  if(icon) icon.style.right = lang==="ar" ? "15px" : "auto";
  if(icon) icon.style.left = lang==="ar" ? "auto" : "15px";

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
  // استخدام نفس الكلاس للشبكة
  list.className = "shops-grid";
  for(let i=0;i<4;i++){
    list.innerHTML += `<div class="skeleton"></div>`;
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
    list.className = ""; // إزالة الشبكة عند عدم وجود نتائج لعرض الرسالة في المنتصف
    list.innerHTML=`<div class="empty-state">❌ ${i18n[lang].empty}</div>`;
    return;
  }
  
  // إعادة تفعيل الشبكة
  list.className = "shops-grid";

  const ph = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect width='400' height='200' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-size='40' fill='%23cbd5e1'%3E🏥%3C/text%3E%3C/svg%3E`;

  data.forEach(s=>{
    let distText = "";
    if(userPos && s.lat && s.lng){
      distText = ` | 📍 ${distance(userPos.lat,userPos.lng,s.lat,s.lng)} km`;
    }

    const card = document.createElement("article");
    card.className = "shop-card"; // هذا الكلاس مطابق للـ CSS الآن
    
    card.innerHTML = `
      <div class="card-image-wrapper">
        <img class="shop-image" loading="lazy" src="${s.image||ph}" onerror="this.src='${ph}'">
      </div>
      <div class="card-content">
        <div class="shop-header">
          <div>
            <h3 class="shop-name">${s.name}</h3>
            <small style="color:#64748b; font-size:0.8rem">${distText}</small>
          </div>
          <span class="category-badge">${s.category}</span>
        </div>
        <p class="shop-description">${s.description||""}</p>
        <div class="card-actions">
          <a href="tel:${s.phone}" class="action-btn btn-call">📞 ${i18n[lang].call}</a>
          <a href="https://wa.me/${getWaLink(s.whatsapp)}" target="_blank" class="action-btn btn-wa">💬 ${i18n[lang].wa}</a>
          <a href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}" target="_blank" class="action-btn btn-map">🗺️ ${i18n[lang].map}</a>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

searchInput.oninput = e => {
  const q = normalize(e.target.value);
  render(services.filter(s =>
    normalize(s.name + s.category + (s.description || "")).includes(q)
  ));
};

async function load(){
  applyLang();
  skeleton();
  
  const cached = localStorage.getItem(CACHE_KEY);
  if(cached){
    const c = JSON.parse(cached);
    if(Date.now() - c.time < TTL){
      services = c.data;
      render(services);
    }
  }

  try {
    const res = await fetch(API);
    const json = await res.json();
    services = json.shops || [];
    localStorage.setItem(CACHE_KEY, JSON.stringify({time: Date.now(), data: services}));
    render(services);
  } catch(e) {
    if(!services.length) list.innerHTML = `<div class="empty-state">⚠️ خطأ في الاتصال</div>`;
  }
}

if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(p=>{
    userPos = {lat: p.coords.latitude, lng: p.coords.longitude};
    if(services.length) render(services);
  });
}

load();
