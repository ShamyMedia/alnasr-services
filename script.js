"use strict";

const API = "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec";

const state = { data: [] };

const list = document.getElementById("list");
const search = document.getElementById("search");
const filter = document.getElementById("categoryFilter");

const normalize = t =>
  String(t || "")
    .toLowerCase()
    .replace(/[أإآ]/g,"ا")
    .replace(/ة/g,"ه")
    .replace(/[ىي]/g,"ي");

function createCard(i){
  const card = document.createElement("article");
  card.className = "shop-card";

  const imgWrap = document.createElement("div");
  imgWrap.className = "card-img";

  const img = document.createElement("img");
  img.loading = "lazy";
  img.src = i.image || "https://placehold.co/600x338?text=No+Image";
  img.onerror = () => img.src = "https://placehold.co/600x338?text=No+Image";
  imgWrap.appendChild(img);

  const body = document.createElement("div");
  body.className = "card-body";

  const h3 = document.createElement("h3");
  h3.textContent = i.name;

  const p = document.createElement("p");
  p.textContent = i.description || "";

  const actions = document.createElement("div");
  actions.className = "actions";

  if(i.phone){
    const a = document.createElement("a");
    a.href = `tel:${i.phone}`;
    a.className = "action-btn btn-call";
    a.textContent = "اتصال";
    actions.appendChild(a);
  } else {
    const s = document.createElement("span");
    s.className = "action-btn btn-disabled";
    s.textContent = "غير متوفر";
    actions.appendChild(s);
  }

  if(i.whatsapp){
    const w = document.createElement("a");
    w.href = `https://wa.me/${i.whatsapp}`;
    w.target = "_blank";
    w.rel = "noopener noreferrer";
    w.className = "action-btn btn-wa";
    w.textContent = "واتساب";
    actions.appendChild(w);
  } else {
    const s = document.createElement("span");
    s.className = "action-btn btn-disabled";
    s.textContent = "غير متوفر";
    actions.appendChild(s);
  }

  body.append(h3,p,actions);
  card.append(imgWrap,body);
  return card;
}

function render(){
  const q = normalize(search.value);
  const c = filter.value;
  list.innerHTML = "";

  const items = state.data.filter(i =>
    (!c || i.category === c) &&
    (!q || i._s.includes(q))
  );

  if(!items.length){
    list.innerHTML = `<div class="loading">لا توجد نتائج — جرّب كلمة مختلفة</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach(i => frag.appendChild(createCard(i)));
  list.appendChild(frag);
}

function debounce(fn,delay){
  let t;
  return (...args)=>{
    clearTimeout(t);
    t = setTimeout(()=>fn(...args),delay);
  };
}

async function boot(){
  const r = await fetch(API);
  const j = await r.json();

  state.data = (j.shops || []).map(i => ({
    ...i,
    phone: i.phone?.replace(/\D/g,""),
    whatsapp: i.whatsapp?.replace(/\D/g,""),
    _s: normalize(`${i.name} ${i.description} ${i.category}`)
  }));

  const cats = [...new Set(state.data.map(i=>i.category).filter(Boolean))];
  filter.innerHTML = `<option value="">الكل</option>`;
  cats.forEach(c=>{
    const o=document.createElement("option");
    o.value=c;o.textContent=c;
    filter.appendChild(o);
  });

  render();
}

search.addEventListener("input",debounce(render,200));
filter.addEventListener("change",render);
boot();
