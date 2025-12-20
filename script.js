"use strict";

const API = "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec";
const state = { lang: localStorage.getItem("lang") || "ar", data: [] };

const normalize = t => String(t || "").toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/[ىي]/g, "ي");

function render() {
  const list = document.getElementById("list");
  const q = normalize(document.getElementById("search").value);
  const c = document.getElementById("categoryFilter").value;
  
  list.innerHTML = "";
  const filtered = state.data.filter(i => (!c || i.category === c) && (!q || i._s.includes(q)));
  
  if(!filtered.length) {
    list.innerHTML = "<div style='grid-column: 1/-1; text-align: center; padding: 50px; color: #94a3b8;'>لا توجد نتائج تطابق بحثك</div>";
    return;
  }

  const frag = document.createDocumentFragment();
  filtered.forEach(i => {
    const card = document.createElement("article");
    card.className = "shop-card";
    card.innerHTML = `
      <div class="card-img"><img src="${i.image || ''}" loading="lazy" onerror="this.src='https://placehold.co/400x200/f1f5f9/64748b?text=Image'"></div>
      <div class="card-body">
        <div class="card-title">${i.name}</div>
        <div class="card-desc">${i.description || ''}</div>
        <div class="actions">
          <a href="tel:${i.phone}" class="action-btn btn-call">اتصال</a>
          <a href="https://wa.me/2${String(i.whatsapp).replace(/\D/g,'')}" target="_blank" class="action-btn btn-wa">واتساب</a>
        </div>
      </div>
    `;
    frag.appendChild(card);
  });
  list.appendChild(frag);
}

async function boot() {
  try {
    const r = await fetch(API);
    const j = await r.json();
    state.data = (j.shops || []).map(i => ({
      ...i,
      _s: normalize(`${i.name} ${i.description || ""} ${i.category || ""}`)
    }));
    
    // تحديث قائمة التصنيفات
    const filter = document.getElementById("categoryFilter");
    const cats = [...new Set(state.data.map(i => i.category).filter(Boolean))].sort();
    filter.innerHTML = '<option value="">الكل</option>';
    cats.forEach(c => {
      const opt = document.createElement("option");
      opt.value = opt.textContent = c;
      filter.appendChild(opt);
    });
    
    render();
  } catch (e) {
    document.getElementById("list").innerHTML = "فشل تحميل البيانات. يرجى المحاولة لاحقاً.";
  }
}

document.getElementById("search").oninput = render;
document.getElementById("categoryFilter").onchange = render;
document.getElementById("langBtn").onclick = () => {
  state.lang = state.lang === "ar" ? "en" : "ar";
  localStorage.setItem("lang", state.lang);
  location.reload();
};

boot();
