const API = "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec";
const CACHE_KEY = "alnasr_final_merged";
const TTL = 60 * 60 * 1000;

const list = document.getElementById("list");
const searchInput = document.getElementById("search");
const langBtn = document.getElementById("langBtn");

let services = [];
let userPos = null;
let lang = localStorage.getItem("lang") || "ar";

// النصوص
const i18n = {
  ar: { 
    call: "اتصال", wa: "واتساب", map: "الموقع", 
    empty: "لا توجد نتائج مطابقة لبحثك", 
    search: "ابحث عن طبيب أو تخصص...",
    loading: "جاري التحميل..."
  },
  en: { 
    call: "Call", wa: "WhatsApp", map: "Map", 
    empty: "No matching results found", 
    search: "Search for doctor or specialty...",
    loading: "Loading..."
  }
};

// دالة تنظيف النصوص للبحث
function normalize(text="") {
  return text.toLowerCase()
    .replace(/[أإآ]/g,"ا").replace(/ة/g,"ه")
    .replace(/[ىي]/g,"ي").replace(/[\u064B-\u0652]/g,"");
}

// معالجة رقم الواتساب
function getWaLink(num) {
  if(!num) return "";
  let n = num.toString().replace(/\D/g,'');
  if(n.startsWith("01")) return "2" + n.substring(1);
  if(n.startsWith("1")) return "20" + n;
  return n.startsWith("2") ? n : "2" + n;
}

// تطبيق اللغة
function applyLang(){
  document.documentElement.dir = lang==="ar"?"rtl":"ltr";
  document.documentElement.lang = lang;
  langBtn.textContent = lang==="ar"?"EN":"AR";
  searchInput.placeholder = i18n[lang].search;
  
  // تحديث النصوص الثابتة
  document.querySelectorAll("[data-ar]").forEach(el=>{
    el.textContent = el.dataset[lang];
  });
}

// زر تبديل اللغة
langBtn.onclick = ()=>{
  lang = lang==="ar"?"en":"ar";
  localStorage.setItem("lang",lang);
  applyLang();
  render(services);
};

// تأثير التحميل (Skeleton)
function skeleton(){
  list.innerHTML = "";
  for(let i=0;i<6;i++){
    const s = document.createElement("div");
    s.className = "skeleton";
    list.appendChild(s);
  }
}

// حساب المسافة
function distance(lat1,lng1,lat2,lng2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
    Math.sin(dLng/2)**2;
  return (R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))).toFixed(1);
}

// دالة العرض (Render) - تستخدم HTML التصميم القديم
function render(data){
  list.innerHTML="";
  if(!data.length){
    list.innerHTML=`<div class="empty-state">❌ ${i18n[lang].empty}</div>`;
    return;
  }

  // Placeholder Image
  const ph = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='180'%3E%3Crect width='400' height='180' fill='%23eee'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-size='40' fill='%23ccc'%3E🏥%3C/text%3E%3C/svg%3E`;

  data.forEach(s=>{
    let distBadge="";
    if(userPos && s.lat && s.lng){
      const km = distance(userPos.lat,userPos.lng,s.lat,s.lng);
      distBadge = `<span class="category-badge distance-badge">📍 ${km} km</span>`;
    }

    const card = document.createElement("article");
    card.className = "shop-card"; // نفس كلاس التصميم القديم
    
    // بناء الهيكل الداخلي للكارت كما كان في التصميم القديم
    card.innerHTML = `
      <div class="card-image-wrapper">
        <img src="${s.image || ph}" class="shop-image" loading="lazy">
      </div>
      <div class="card-content">
        <div class="shop-header">
          <h3 class="shop-name">${s.name}</h3>
          <div class="shop-meta">
            <span class="category-badge">${s.category}</span>
            ${distBadge}
          </div>
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

// البحث
searchInput.oninput = e => {
  const q = normalize(e.target.value);
  render(services.filter(s =>
    normalize(s.name + s.category + (s.description || "")).includes(q)
  ));
};

// التحميل الرئيسي
async function load(){
  applyLang();
  
  const cached = localStorage.getItem(CACHE_KEY);
  if(cached){
    const c = JSON.parse(cached);
    if(Date.now() - c.time < TTL){
      services = c.data;
      render(services);
    } else {
      skeleton(); // Cache expired
    }
  } else {
    skeleton(); // No cache
  }

  try {
    const res = await fetch(API);
    const json = await res.json();
    services = json.shops || [];
    localStorage.setItem(CACHE_KEY, JSON.stringify({time: Date.now(), data: services}));
    render(services);
  } catch(e) {
    console.error("Error:", e);
    if(services.length === 0) list.innerHTML = `<div class="empty-state">⚠️ حدث خطأ في الاتصال</div>`;
  }
}

// طلب الموقع الجغرافي
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    p => {
      userPos = { lat: p.coords.latitude, lng: p.coords.longitude };
      if(services.length > 0) render(services);
    },
    err => console.log("GPS Denied")
  );
}

load();