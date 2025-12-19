const CONFIG = {
  API: "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec",
  CACHE: "alnasr_prod_v5",
  TTL: 3600000,
  FALLBACK: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 170'%3E%3Crect width='300' height='170' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dy='.3em' font-size='30' fill='%23cbd5e1'%3E📷%3C/text%3E%3C/svg%3E"
};

const I18N = {
  ar:{call:"اتصال",wa:"واتساب",map:"الموقع",empty:"لا توجد نتائج",search:"ابحث...",all:"الكل",title:"دليل خدمات برج النصر",desc:"كل الخدمات في مكان واحد"},
  en:{call:"Call",wa:"WhatsApp",map:"Location",empty:"No results",search:"Search...",all:"All",title:"Al Nasr Services",desc:"All services in one place"}
};

const state = { data:[], lang:localStorage.getItem("lang")||"ar" };

const esc = t=>String(t||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const norm = t=>String(t||"").toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/[ىي]/g,"ي");
const safeUrl = u=>/^(https?|tel|mailto):/i.test(String(u||"").trim())?u:"";
const safePhone = p=>String(p||"").replace(/[^\d+]/g,"");

const list = document.getElementById("list");
const search = document.getElementById("search");
const filter = document.getElementById("categoryFilter");
const langBtn = document.getElementById("langBtn");

function updateUI(){
  document.documentElement.dir = state.lang==="ar"?"rtl":"ltr";
  document.documentElement.lang = state.lang;
  langBtn.textContent = state.lang==="ar"?"EN":"AR";
  search.placeholder = I18N[state.lang].search;
  document.querySelectorAll("[data-key]").forEach(e=>e.textContent=I18N[state.lang][e.dataset.key]);
  if(filter.options.length) filter.options[0].text = I18N[state.lang].all;
}

function populateFilter(){
  const cats=[...new Set(state.data.map(i=>i.category).filter(Boolean))];
  filter.innerHTML=`<option value="">${I18N[state.lang].all}</option>`+
    cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
}

function render(){
  list.innerHTML="";
  const q=norm(search.value),cat=filter.value;
  const res=state.data.filter(i=>(!q||i._s.includes(q))&&(!cat||i.category===cat));
  if(!res.length){list.innerHTML=`<div class="empty-state">${I18N[state.lang].empty}</div>`;return;}
  const f=document.createDocumentFragment();
  res.forEach(s=>{
    const img=safeUrl(s.image)||CONFIG.FALLBACK;
    const card=document.createElement("article");
    card.className="shop-card";
    card.innerHTML=`
      <div class="card-image-wrapper">
        <img class="shop-image" src="${img}" onerror="this.src='${CONFIG.FALLBACK}'">
      </div>
      <div class="card-content">
        <div class="shop-header">
          <h3 class="shop-name">${esc(s.name)}</h3>
          <span class="category-badge">${esc(s.category)}</span>
        </div>
        <div class="shop-description">${esc(s.description)}</div>
        <div class="card-actions">
          ${s.phone?`<a class="action-btn btn-call" href="tel:${safePhone(s.phone)}">📞 ${I18N[state.lang].call}</a>`:""}
          ${s.whatsapp?`<a class="action-btn btn-wa" target="_blank" href="https://wa.me/${safePhone(s.whatsapp)}">💬 ${I18N[state.lang].wa}</a>`:""}
          ${s.lat&&s.lng?`<a class="action-btn btn-map" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}">🗺️ ${I18N[state.lang].map}</a>`:""}
        </div>
      </div>`;
    f.appendChild(card);
  });
  list.appendChild(f);
}

async function boot(){
  updateUI();
  const cache=localStorage.getItem(CONFIG.CACHE);
  if(cache){
    try{
      const j=JSON.parse(cache);
      if(Date.now()-j.t<CONFIG.TTL){
        state.data=j.d;
        populateFilter();render();return;
      }
    }catch{}
  }
  const res=await fetch(CONFIG.API).then(r=>r.json());
  const raw=res.shops||res.data||[];
  state.data=raw.map(i=>({...i,_s:norm(`${i.name} ${i.category} ${i.description||""}`)}));
  localStorage.setItem(CONFIG.CACHE,JSON.stringify({t:Date.now(),d:state.data}));
  populateFilter();render();
}

search.oninput=render;
filter.onchange=render;
langBtn.onclick=()=>{state.lang=state.lang==="ar"?"en":"ar";localStorage.setItem("lang",state.lang);updateUI();populateFilter();render();};

boot();