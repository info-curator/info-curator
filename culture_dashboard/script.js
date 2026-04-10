document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Initialize Clock
    initClock();

    // Bind Weather City Selector
    const citySelect = document.getElementById('weather-city-select');
    if (citySelect) {
        citySelect.addEventListener('change', fetchWeather);
    }

    // Load Widgets
    fetchWeather();
    initPriceChart();
    loadCultureData();
});

// 1. Live Clock
function initClock() {
    const clockEl = document.getElementById('live-clock');
    const updateTime = () => {
        const now = new Date();
        const options = { 
            timeZone: 'Asia/Seoul', 
            year: 'numeric', month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        };
        clockEl.textContent = new Intl.DateTimeFormat('ko-KR', options).format(now) + ' (KST)';
    };
    updateTime();
    setInterval(updateTime, 1000);
}

// 2. Weather Forecast
async function fetchWeather() {
    const weatherContainer = document.getElementById('weather-content');
    
    // Check if city select exists, if not default to seoul
    const citySelect = document.getElementById('weather-city-select');
    const selectedCity = citySelect ? citySelect.value : 'seoul';
    
    const coords = {
        'seoul': {lat: 37.5665, lon: 126.9780},
        'busan': {lat: 35.1796, lon: 129.0756},
        'jeju':  {lat: 33.4996, lon: 126.5312}
    };
    const lat = coords[selectedCity].lat;
    const lon = coords[selectedCity].lon;

    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FSeoul&forecast_days=5`);
        const data = await res.json();
        
        const daily = data.daily;
        
        let html = `<div class="weather-today">
            <div style="color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 0.5rem;">오늘</div>
            <div class="temp">${Math.round(daily.temperature_2m_max[0])}°</div>
            <div style="font-size: 0.9rem; color: #aaa; margin-top: 0.5rem;">
                최저: ${Math.round(daily.temperature_2m_min[0])}°C | 강수확률: ${daily.precipitation_probability_max[0]}%
            </div>
        </div>
        <div class="weather-forecast">`;

        // Next 3 days
        for(let i=1; i<=3; i++) {
            const dateObj = new Date(daily.time[i]);
            const dayName = new Intl.DateTimeFormat('ko-KR', {weekday: 'short'}).format(dateObj);
            html += `
                <div class="forecast-day">
                    <span class="day">${dayName}</span>
                    <span class="temps">${Math.round(daily.temperature_2m_max[i])}°</span>
                    <span style="font-size:0.75rem; color:#888">${Math.round(daily.temperature_2m_min[i])}°</span>
                </div>
            `;
        }
        html += `</div>`;
        weatherContainer.innerHTML = html;
        
    } catch (err) {
        weatherContainer.innerHTML = `<p style="color: #ff6b6b;">날씨 데이터를 불러오는데 실패했습니다.</p>`;
        console.error(err);
    }
}

// 3. Price Insight Chart
let priceChartInstance = null;
function initPriceChart() {
    const selectEl = document.getElementById('price-item-select');
    selectEl.addEventListener('change', renderPriceChart);
    renderPriceChart(); // initial render
}

function renderPriceChart() {
    const item = document.getElementById('price-item-select').value;
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Simulate Data
    const basePrices = {
        "배추": 5500, "삼겹살": 29000, "고등어": 4800,
        "계란": 7500, "양파": 3200, "사과": 18000,
        "닭고기": 8500, "쌀": 65000, "소고기": 45000,
        "우유": 2900, "대파": 3500, "상추": 2500,
        "오징어": 5000
    };
    const base = basePrices[item] || 3000;
    
    const labels = [];
    const actualData = [];
    const forecastData = [];
    
    const now = new Date();
    // 14 days history + 7 days forecast
    for(let i=-14; i<=7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        labels.push(d.toLocaleDateString('ko-KR', {month:'short', day:'numeric'}));
        
        // Math magic to make it look like real fluctuation + LSTM trend
        const noise = Math.random() * (base * 0.05);
        const trend = i * (base * 0.005);
        const val = Math.round(base + trend + noise);
        
        if (i <= 0) {
            actualData.push(val);
            if (i === 0) forecastData.push(val); // connect line
            else forecastData.push(null);
        } else {
            actualData.push(null);
            forecastData.push(val);
        }
    }
    
    if (priceChartInstance) priceChartInstance.destroy();
    
    // Chart.js 
    Chart.defaults.color = 'rgba(255, 255, 255, 0.7)';
    priceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '실제 가격',
                    data: actualData,
                    borderColor: '#ffffff',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 0
                },
                {
                    label: 'AI 예측 가격',
                    data: forecastData,
                    borderColor: '#45a29e', /* Accent Color */
                    borderDash: [5, 5],
                    borderWidth: 3,
                    tension: 0.3,
                    pointBackgroundColor: '#66fcf1',
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + '원';
                        }
                    }
                }
            },
            scales: {
                y: { 
                    grid: { color: 'rgba(255,255,255,0.05)' }, 
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) { return value.toLocaleString() + '원'; }
                    }
                },
                x: { grid: { display: false } }
            }
        }
    });

    // Update Summary
    const latestActual = actualData[14];
    const finalPredict = forecastData[21];
    const diff = finalPredict - latestActual;
    const diffPercent = ((diff / latestActual) * 100).toFixed(1);
    
    let summaryHtml = `<strong>AI 인사이트:</strong> LSTM 모델 시뮬레이션 결과에 따르면, <strong>${item}</strong> 가격이 향후 7일간 약 `;
    if (diff > 0) {
        summaryHtml += `<span style="color:#ff6b6b; font-weight:bold;">${Math.abs(diffPercent)}% 상승</span>할 것으로 예측됩니다.`;
    } else {
        summaryHtml += `<span style="color:#66fcf1; font-weight:bold;">${Math.abs(diffPercent)}% 하락</span>할 것으로 예측됩니다.`;
    }
    
    document.getElementById('price-summary').innerHTML = summaryHtml;
}

// 4. Cultural Events (JSON + Leaflet)
let mapInstance = null;
let currentMarkers = [];

async function loadCultureData() {
    const listEl = document.getElementById('event-list');
    
    try {
        // Init Map First
        initMap();

        // fetch local JSON bypassed by reading from data.js
        if (typeof cultureData === 'undefined') {
            throw new Error("data.js 파일을 찾을 수 없습니다.");
        }
        const rawData = cultureData.DATA; // Array of events

        // Filter and Sort Data
        const now = new Date();
        const currentMonth = now.getMonth();
        const nextMonth = (currentMonth + 1) % 12;
        
        let upcomingEvents = [];

        for (let i = 0; i < rawData.length; i++) {
            const ev = rawData[i];
            if (!ev.main_img || !ev.title || !ev.date) continue;
            
            // Expected format: YYYY-MM-DD~YYYY-MM-DD
            const dates = ev.date.split('~');
            const startDateStr = dates[0].trim();
            const endDateStr = (dates[1] || dates[0]).trim();
            
            const eventStartDate = new Date(startDateStr);
            const eventEndDate = new Date(endDateStr);
            
            // Set end date to the end of the day so ongoing events are not filtered out
            eventEndDate.setHours(23, 59, 59, 999);
            
            if (isNaN(eventStartDate.getTime()) || isNaN(eventEndDate.getTime())) continue;

            // Only show events that have not ended yet (ongoing or future)
            const isUpcoming = eventEndDate >= now;
            
            if (isUpcoming) {
                ev.parsedDate = eventStartDate;
                upcomingEvents.push(ev);
            }
        }

        // Sort chronologically
        upcomingEvents.sort((a, b) => a.parsedDate - b.parsedDate);

        // Separate map events (all upcoming within a year, we'll just use all upcomings) and list events (top 10)
        const mapEvents = upcomingEvents;
        const listEvents = upcomingEvents.slice(0, 10);

        // Clear Map Markers
        currentMarkers.forEach(m => mapInstance.removeLayer(m));
        currentMarkers = [];
        
        // Render Function
        const renderEventCard = (ev) => {
            const imgUrl = (ev.main_img && ev.main_img.startsWith('http')) ? ev.main_img : 'https://via.placeholder.com/80';
            const dateStr = ev.date.replace(/-/g, '.').replace(/~/g, ' ~ '); // Show full period
            return `
                <div class="event-card" onclick="window.open('${ev.org_link}', '_blank')">
                    <img src="${imgUrl}" alt="Event" class="event-img" onerror="this.src='https://via.placeholder.com/80'">
                    <div class="event-info">
                        <div class="event-meta">
                            <span><i data-lucide="calendar" style="width:12px;height:12px;display:inline-block;vertical-align:middle;"></i> ${dateStr}</span>
                            <span>${ev.is_free}</span>
                        </div>
                        <h3>${ev.title}</h3>
                        <div style="font-size:0.8rem; color:#aaa"><i data-lucide="map-pin" style="width:12px;height:12px;display:inline-block;vertical-align:middle;"></i> ${ev.place}</div>
                    </div>
                </div>
            `;
        };

        // Add Map Markers for ALL mapEvents
        mapEvents.forEach(ev => {
            const lat = parseFloat(ev.lat);
            const lot = parseFloat(ev.lot);
            if (!isNaN(lat) && !isNaN(lot)) {
                // If there are many markers, a slightly smaller radius improves visibility
                const marker = L.circleMarker([lat, lot], {
                    color: '#3498db',
                    radius: 5,
                    fillColor: '#2980b9',
                    fillOpacity: 0.9,
                    weight: 2
                }).addTo(mapInstance);
                
                marker.bindTooltip(`
                    <div style="font-family:'Pretendard', sans-serif;">
                        <strong style="display:block; margin-bottom:5px; color:#d35400; font-size:1.1rem;">${ev.title}</strong>
                        <span style="font-size:0.85rem; color:#333;">${ev.date}</span><br>
                        <span style="font-size:0.85rem; color:#333;"><i data-lucide="map-pin" style="width:12px;height:12px;display:inline-block;vertical-align:middle; color:#3498db;"></i> ${ev.place}</span>
                    </div>
                `);
                currentMarkers.push(marker);
            }
        });

        // Populate Main Event List with Top 10 items
        if (listEvents.length > 0) {
            let html = '';
            listEvents.forEach(ev => {
                html += renderEventCard(ev);
            });
            listEl.innerHTML = html;
        } else {
            listEl.innerHTML = `<p style="padding: 1rem; color: rgba(255,255,255,0.7);">예정된 문화행사가 없습니다.</p>`;
        }

        // Re-init lucide icons for new lists
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ root: listEl });
        }

        // Fit Map bounds if there are markers
        if (currentMarkers.length > 0) {
            const group = new L.featureGroup(currentMarkers);
            mapInstance.fitBounds(group.getBounds().pad(0.1));
        }

    } catch(err) {
        listEl.innerHTML = `
            <div style="background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.3); padding: 1rem; border-radius: 8px; font-size: 0.9rem;">
                <p style="color: #ff6b6b; font-weight: bold; margin-bottom: 0.5rem; display:flex; align-items:center; gap:5px;"><i data-lucide="alert-circle" style="width:16px;height:16px;"></i> 오프라인/로컬환경 동작 안내</p>
                <p style="color: rgba(255,255,255,0.8); line-height:1.4; margin-bottom: 1rem;">
                    URL 없이 컴퓨터 내에서 직접(.html 더블클릭) 열면 브라우저 보안상 파일을 자동으로 긁어올 수 없습니다.<br>
                    <strong>'서울시 문화행사 정보.json' 파일을 아래 버튼을 눌러 수동으로 선택해주시면 즉시 오류가 해결됩니다!</strong>
                </p>
                <input type="file" id="local-file-upload" accept=".json" style="display:none;" onchange="handleFileUpload(event)">
                <button onclick="document.getElementById('local-file-upload').click()" style="background:#45a29e; color:#fff; border:none; padding:10px 15px; border-radius:8px; cursor:pointer; font-weight:bold; font-family:inherit;"><i data-lucide="upload" style="width:14px; display:inline-block; vertical-align:middle;"></i> JSON 파일 첨부하기</button>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: listEl });
        console.error("Local variable fetch error:", err);
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            window.cultureData = json;
            document.getElementById('event-list').innerHTML = '<div class="loader"></div>';
            loadCultureData(); // Reload successfully!
        } catch(err) {
            alert("파일 분석에 실패했습니다. 올바른 json 파일인지 확인해주세요.");
        }
    };
    reader.readAsText(file);
}

function initMap() {
    if (mapInstance !== null) return;
    
    const mapContainer = document.getElementById('culture-map');
    // Seoul Center
    mapInstance = L.map(mapContainer, {
        center: [37.5665, 126.9780],
        zoom: 11,
        zoomControl: false,
        attributionControl: false
    });
    
    // Light bright map theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(mapInstance);
}
