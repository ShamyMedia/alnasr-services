"use strict";

const API="https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec";
const CACHE_KEY="alnasr_cache";
const TTL=60*60*1000;

const state={
  lang:localStorage.getItem("lang")||"ar",
  data:[]
};

const normalize=t=>String(t||"")
.toLowerCase()
.replace(/[أإآ]/g,"ا")
.replace(/ة/g,"ه")
.replace(/[ىي]/g,"ي");

const safePhone=p=>{
  const v=String(p||"").replace(/[^0-9+]/g,"");
  return v.length>=8?v:null;
};

const list=document.getElementById("list");
const search=document.getElementById("search");
const filter=document.getElementById("categoryFilter");
const langBtn=document.getElementById("langBtn");

function btn(ok,cls,text,href){
  if(!ok){
    const s=document.createElement("span");
    s.className="btn-disabled";
    s.textContent=text;
    return s;
  }
  const a=document.createElement("a");
  a.className=`action-btn ${cls}`;
  a.textContent=text;
  a.href=href;
  if(cls!=="btn-call"){
    a.target="_blank";
    a.rel="noopener noreferrer";
  }
  return a;
}

function createCard(i){
  const card=document.createElement("article");
  card.className="shop-card";

  const imgWrap=document.createElement("div");
  imgWrap.className="card-img";

  const img=document.createElement("img");
  img.loading="lazy";
  img.alt=i.name;
  img.src=i.image||"";
  imgWrap.appendChild(img);

  const body=document.createElement("div");
  body.className="card-body";

  const title=document.createElement("div");
  title.className="card-title";
  title.textContent=i.name;

  const desc=document.createElement("div");
  desc.className="card-desc";
  desc.textContent=i.description||"";

  const actions=document.createElement("div");
  actions.className="actions";

  const phone=safePhone(i.phone);
  const wa=i.whatsapp?`https://wa.me/2${i.whatsapp.replace(/\D/g,"")}`:null;
  const map=i.lat&&i.lng?`https://www.google.com/maps?q=${i.lat},${i.lng}`:null;

  actions.append(
    btn(phone,"btn-call","📞 اتصال",`tel:${phone}`),
    btn(wa,"btn-wa","💬 واتساب",wa),
    btn(map,"btn-map","📍 الموقع",map)
  );

  body.append(title,desc,actions);
  card.append(imgWrap,body);
  return card;
}

function render(){
  list.innerHTML="";
  const q=normalize(search.value);
  const c=filter.value;

  const res=state.data.filter(i=>
    (!c||i.category===c)&&(!q||i._s.includes(q))
  );

  if(!res.length){
    list.innerHTML="<div class='btn-disabled'>لا توجد نتائج</div>";
    return;
  }

  const frag=document.createDocumentFragment();
  res.forEach(i=>frag.appendChild(createCard(i)));
  list.appendChild(frag);
}

async function boot(){
  const cache=localStorage.getItem(CACHE_KEY);
  if(cache){
    try{
      const j=JSON.parse(cache);
      if(Date.now()-j.t<TTL){
        state.data=j.d;
        render();
      }
    }catch{}
  }

  try{
    const r=await fetch(API);
    const j=await r.json();
    state.data=(j.shops||[]).map(i=>({
      ...i,
      _s:normalize(`${i.name} ${i.description||""}`)
    }));
    localStorage.setItem(CACHE_KEY,JSON.stringify({t:Date.now(),d:state.data}));
    render();
  }catch{}
}

search.oninput=render;
filter.onchange=render;
langBtn.onclick=()=>{
  state.lang=state.lang==="ar"?"en":"ar";
  localStorage.setItem("lang",state.lang);
  location.reload();
};

boot();
