const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbwGZjfCiI2x2Q2sBT3ZY8CKfKBqKCVF6NFVqYcjvyAR84CkDShrdx5_2onSU4SlVz6GDQ/exec",
    CACHE_KEY: "alnasr_v2_data",
    CACHE_TIME: 1000 * 60 * 60 * 24 // 24 ساعة
};

let allServices = [];
let userLocation = null;

// دالة تنظيف النصوص للبحث الاحترافي (Normalization)
function normalizeArabic(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/[ىي]/g, "ي")
        .replace(/[\u064B-\u0652]/g, ""); // حذف التشكيل
}

// محرك البحث الذكي
function searchServices(query) {
    const normalizedQuery = normalizeArabic(query);
    const filtered = allServices.filter(s => {
        return normalizeArabic(s.name).includes(normalizedQuery) ||
               normalizeArabic(s.category).includes(normalizedQuery) ||
               normalizeArabic(s.description).includes(normalizedQuery);
    });
    renderUI(filtered);
}

// عرض البيانات في الواجهة
function renderUI(data) {
    const container = document.getElementById('list-container');
    container.innerHTML = data.length ? "" : "<p class='empty'>لا توجد نتائج تطابق بحثك</p>";

    data.forEach(service => {
        const card = document.createElement('div');
        card.className = 'card';
        
        let distanceHTML = "";
        if(userLocation && service.lat && service.lng) {
            const dist = calculateDistance(userLocation.lat, userLocation.lng, service.lat, service.lng);
            distanceHTML = `<span class="category-badge distance-badge">${dist} كم بعيد عنك</span>`;
        }

        card.innerHTML = `
            <div class="card-header">
                <img src="${service.image || 'default.webp'}" class="thumb" alt="${service.name}" loading="lazy">
                <div class="info">
                    <h2>${service.name}</h2>
                    <span class="category-badge">${service.category}</span>
                    ${distanceHTML}
                </div>
            </div>
            <p class="desc">${service.description || ''}</p>
            <div class="actions">
                <a href="tel:${service.phone}" class="btn btn-call"><span>📞</span>اتصال</a>
                <a href="https://wa.me/2${service.whatsapp}" target="_blank" class="btn btn-wa"><span>💬</span>واتساب</a>
                <a href="https://www.google.com/maps/search/?api=1&query=${service.lat},${service.lng}" target="_blank" class="btn btn-map"><span>📍</span>الموقع</a>
            </div>
        `;
        container.appendChild(card);
    });
}

// حساب المسافة (Haversine Formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
}

// إدارة الكاش وجلب البيانات
async function init() {
    // 1. عرض الكاش فوراً إن وجد
    const cached = localStorage.getItem(CONFIG.CACHE_KEY);
    if (cached) {
        const parsed = JSON.parse(cached);
        allServices = parsed.data;
        renderUI(allServices);
    }

    // 2. طلب الموقع الجغرافي
    navigator.geolocation.getCurrentPosition(pos => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        renderUI(allServices);
    }, () => console.log("Geolocation access denied"));

    // 3. تحديث البيانات من السيرفر في الخلفية
    try {
        const response = await fetch(CONFIG.API_URL);
        const json = await response.json();
        allServices = json.shops;
        localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ data: allServices, time: Date.now() }));
        renderUI(allServices);
    } catch (e) {
        console.error("Fetch failed, using cache only.");
    }
}

init();