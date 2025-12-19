const API = "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec";
const CACHE_KEY = "alnasr_final_cache";
const TTL = 60 * 60 * 1000;

const list = document.getElementById("list");
const searchInput = document.getElementById("search");
const langBtn = document.getElementById("langBtn");

let services = [];
let userPos = null;
let lang = localStorage.getItem("lang") || "ar";

const i18n = {
  ar: { call:"اتصال", wa:"واتساب", map:"الموقع", empty:"لا توجد نتائج", search:"ابحث عن طبيب أو تخصص أو خدمة" },
  en: { call:"Call", wa:"WhatsApp", map:"Map", empty:"No results", search:"Search services" }
};

// دالة تنظيف النصوص للبحث
function normalize(text="") {
  return text.toLowerCase()
    .replace(/[أإآ]/g,"ا")
    .replace(/ة/g,"ه")
    .replace(/[ىي]/g,"ي")
    .replace(/[\u064B-\u0652]/g,"");
}

// دالة إصلاح رقم الواتساب (المنطق الوحيد المضاف)
function getWaLink(num) {
  if(!num) return "";
  let n = num.toString().replace(/\D/g,''); // حذف أي رموز
  // لو الرقم يبدأ بـ 010 نحوله لـ 2010
  if(n.startsWith("01")) return "2" + n.substring(1);
  // لو الرقم يبدأ بـ 10 مباشرة نحوله لـ 2010
  if(n.startsWith("1")) return "20" + n;
  // لو الرقم مكتوب بصيغة دولية نتركه، غير ذلك نضيف 2 (كود مصر)
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
  for(let i=0;i<5;i++){
    const s = document.createElement("div");
    s.className = "skeleton";
    list.appendChild(s);
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
    list.innerHTML=`<div class="empty">${i18n[lang].empty}</div>`;
    return;
  }

  data.forEach(s=>{
    let dist="";
    if(userPos && s.lat && s.lng){
      dist=`<span class="category-badge distance-badge">${distance(userPos.lat,userPos.lng,s.lat,s.lng)} كم</span>`;
    }

    // هنا عدنا للهيكل الأصلي 100% لضمان عمل التصميم
    const card=document.createElement("div");
    card.className="card";
    
    // التغيير الوحيد هنا هو استدعاء getWaLink بدلاً من كتابة 2 يدوياً
    card.innerHTML=`
      <div class="card-header">
        <img class="thumb" loading="lazy" src="${s.image||''}">
        <div class="info">
          <h2>${s.name}</h2>
          <span class="category-badge">${s.category}</span>
          ${dist}
        </div>
      </div>
      <p class="desc">${s.description||""}</p>
      <div class="actions">
        <a class="btn btn-call" href="tel:${s.phone}" target="_blank">📞 ${i18n[lang].call}</a>
        <a class="btn btn-wa" href="https://wa.me/${getWaLink(s.whatsapp)}" target="_blank">💬 ${i18n[lang].wa}</a>
        <a class="btn btn-map" href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}" target="_blank">📍 ${i18n[lang].map}</a>
      </div>
    `;
    list.appendChild(card);
  });
}

searchInput.oninput=e=>{
  const q=normalize(e.target.value);
  render(services.filter(s=>
    normalize(s.name+s.category+(s.description||"")).includes(q)
  ));
};

async function load(){
  applyLang();
  const cached=localStorage.getItem(CACHE_KEY);
  
  // التحقق من الكاش
  if(cached){
    const c=JSON.parse(cached);
    if(Date.now()-c.time<TTL){
      services=c.data;
      render(services);
      // إذا وجدنا كاش، لا داعي للانتظار، لكن سنطلب التحديث في الخلفية إذا أردت، 
      // أو نكتفي بالكاش. هنا سنكمل للكود الأصلي للتحميل.
    }
  }

  // إذا لم تكن البيانات موجودة في الكاش أو انتهى وقتها، نعرض الهيكل العظمي
  if(services.length === 0) skeleton();

  try {
    const res=await fetch(API);
    const json=await res.json();
    services=json.shops||[];
    localStorage.setItem(CACHE_KEY,JSON.stringify({time:Date.now(),data:services}));
    render(services);
  } catch(e) {
    console.error("Error loading data");
    // في حالة الخطأ نحافظ على البيانات القديمة إذا وجدت
  }
}

// تشغيل التحميل أولاً
load();

// طلب الموقع الجغرافي بشكل منفصل حتى لا يعطل عرض البيانات
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    p=>{ 
        userPos={lat:p.coords.latitude,lng:p.coords.longitude}; 
        // إعادة الرسم فقط لإظهار المسافة، بدون إعادة تحميل البيانات
        if(services.length > 0) render(services); 
    },
    err => console.log("GPS permission denied")
  );
}