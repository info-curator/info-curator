document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initClock();
    initCharts();
    loadAllNews();
});

// Live Clock & Auto Refresh at Midnight
function initClock() {
    const clockSpan = document.querySelector('#live-clock span');
    
    const updateTime = () => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ko-KR', { hour12: false });
        clockSpan.textContent = timeString + ' (KST)';
        
        // Auto refresh exactly at midnight
        if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
            console.log("Midnight Refresh Triggered");
            loadAllNews();
        }
    };
    
    updateTime();
    setInterval(updateTime, 1000);
}

// Chart.js Theme setup
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Pretendard', sans-serif";

function initCharts() {
    // 1. Category Doughnut Chart
    const ctxCat = document.getElementById('categoryChart')?.getContext('2d');
    if (ctxCat) {
        new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: ['DX (모바일/가전)', 'DS (반도체)', '디스플레이', '경쟁사 동향'],
                datasets: [{
                    data: [35, 45, 10, 10], // Mock percentage
                    backgroundColor: ['#38bdf8', '#1428A0', '#818cf8', '#cbd5e1'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { position: 'right', labels: { color: '#f8fafc', padding: 20 } }
                }
            }
        });
    }

    // 2. Keyword Bar Chart
    const ctxKey = document.getElementById('keywordChart')?.getContext('2d');
    if (ctxKey) {
        new Chart(ctxKey, {
            type: 'bar',
            data: {
                labels: ['HBM', '갤럭시S26', '파운드리', '온디바이스AI', '폴더블', 'OLED'],
                datasets: [{
                    label: '언급량',
                    data: [95, 82, 78, 65, 54, 45],
                    backgroundColor: 'rgba(56, 189, 248, 0.8)',
                    borderRadius: 4,
                    barThickness: 24
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#cbd5e1' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
                }
            }
        });
    }
}

// RSS Integration via rss2json API
const RSS_API = "https://api.rss2json.com/v1/api.json?rss_url=";

const categories = [
    { id: 'dx', title: 'DX (모바일/가전)', icon: 'smartphone', query: '삼성전자 스마트폰 가전' },
    { id: 'ds', title: 'DS (반도체)', icon: 'cpu', query: '삼성전자 반도체 파운드리 HBM' },
    { id: 'display', title: '디스플레이', icon: 'monitor', query: '삼성디스플레이 OLED' },
    { id: 'comp', title: '경쟁사 동향', icon: 'swords', query: 'SK하이닉스 OR 애플 OR TSMC' }
];

async function loadAllNews() {
    const root = document.getElementById('news-root');
    root.innerHTML = ''; // clear

    for (const cat of categories) {
        // UI Skeleton
        const sectionHtml = `
            <div class="category-block" id="block-${cat.id}">
                <div class="category-header">
                    <span style="display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="${cat.icon}"></i> ${cat.title}
                    </span>
                    <button class="refresh-btn" onclick="fetchCategoryNews('${cat.id}')">
                        <i data-lucide="refresh-cw" style="width:14px;"></i> 새로고침
                    </button>
                </div>
                <div class="news-grid" id="grid-${cat.id}">
                    ${Array(3).fill('<div class="skeleton card-skeleton"></div>').join('')}
                </div>
                <div style="text-align: right; margin-top: 1rem;">
                    <a href="https://news.google.com/search?q=${encodeURIComponent(cat.query)}&hl=ko&gl=KR&ceid=KR:ko" target="_blank" style="color: var(--accent); text-decoration: none; font-size: 0.95rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; transition: all 0.2s; background: rgba(56, 189, 248, 0.05);" onmouseover="this.style.background='rgba(56, 189, 248, 0.15)'" onmouseout="this.style.background='rgba(56, 189, 248, 0.05)'">
                        ${cat.title} 기사 더 보기 <i data-lucide="external-link" style="width:16px;"></i>
                    </a>
                </div>
            </div>
        `;
        root.insertAdjacentHTML('beforeend', sectionHtml);
    }
    
    // Re-init newly injected icons
    lucide.createIcons();

    // Fetch data asynchronously for all categories
    for (const cat of categories) {
        fetchCategoryNews(cat.id, cat.query, cat.title);
    }
}

async function fetchCategoryNews(id, query, sectionTitle) {
    // If called from refresh button without args, find them
    if (!query) {
        const cat = categories.find(c => c.id === id);
        query = cat.query;
        sectionTitle = cat.title;
    }

    const grid = document.getElementById(`grid-${id}`);
    grid.innerHTML = Array(3).fill('<div class="skeleton card-skeleton"></div>').join(''); // loading state

    // Google News RSS link encoded
    const gNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
    const apiUrl = RSS_API + encodeURIComponent(gNewsUrl) + "&api_key="; // free tier

    try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("API Limit or Network Error");
        
        const data = await res.json();
        
        if (data.status === 'ok' && data.items.length > 0) {
            // 기사를 최신순으로 정렬
            const sortedItems = data.items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
            renderNewsCards(grid, sortedItems.slice(0, 6)); // top 6 items
        } else {
            grid.innerHTML = `<p style="color:var(--text-muted); padding:1rem;">최신 뉴스를 가져올 수 없습니다.</p>`;
        }
    } catch (e) {
        console.error(e);
        grid.innerHTML = `<p style="color:var(--danger); padding:1rem;">네트워크 오류 또는 API 한도 초과입니다.</p>`;
    }
    
    lucide.createIcons({ root: grid });
}

function renderNewsCards(container, items) {
    let html = '';
    
    items.forEach(item => {
        // Extract publisher if appended in title "Title - Publisher"
        let titleParts = item.title.split(' - ');
        let source = titleParts.length > 1 ? titleParts.pop() : "뉴스 기사";
        let titleStr = titleParts.join(' - ');
        
        // Use regex to strip HTML tags from description
        let desc = item.description.replace(/<[^>]+>/g, '').substring(0, 100) + '...';
        
        // Format pubDate
        const pDate = new Date(item.pubDate);
        const dayAgo = (new Date() - pDate) / (1000 * 60 * 60 * 24);
        let dateStr = pDate.toLocaleDateString('ko-KR');
        if (dayAgo < 1) {
            const hrs = Math.floor((new Date() - pDate) / (1000 * 60 * 60));
            dateStr = hrs <= 0 ? "방금 전" : `${hrs}시간 전`;
        }

        html += `
            <div class="news-card">
                <div class="news-content">
                    <div class="news-meta">
                        <span class="source-badge">${source}</span>
                    </div>
                    <div class="news-title">${titleStr}</div>
                    <div class="news-summary">${desc}</div>
                    
                    <div class="news-footer">
                        <div class="pub-date"><i data-lucide="clock" style="width:14px; color:var(--text-muted);"></i> ${dateStr}</div>
                        <a href="${item.link}" target="_blank" class="read-more">본문보기 <i data-lucide="arrow-right" style="width:16px;"></i></a>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}
