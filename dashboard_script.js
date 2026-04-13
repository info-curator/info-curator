document.addEventListener('DOMContentLoaded', () => {
    // 1. Render News Grid
    const container = document.getElementById('news-container');
    if (container && typeof newsData !== 'undefined') {
        container.innerHTML = '';
        
        for (const [sectionTitle, cards] of Object.entries(newsData)) {
            // Some cards were mistakenly put under '📊 핵심 지표 시각화 (Overview)' if the HTML structure varied, let's fix title.
            // Wait, my parser extracted them under that title because it was the last seen `h2`.
            // Let's manually fix titles or just render whatever category it found.
            // For simplicity, we create section headers and grids for each key.
            
            // Filter out empty arrays
            if (cards.length === 0) continue;
            
            // To ensure correct rendering, map back the titles properly
            let formattedTitle = sectionTitle;
            if (formattedTitle === "핵심 지표 시각화 (Overview)") {
                formattedTitle = "전체 기사 (Overview)";
            }
            
            const sectionHtml = `
                <h2 class="section-title">🏢 ${formattedTitle}</h2>
                <div class="grid">
                    ${cards.map(card => `
                        <div class="card">
                            <div class="card-header">
                                <div class="source-tag">${card.source}</div>
                                <div class="safety-badge ${card.safetyClass}">${card.safetyText}</div>
                            </div>
                            <div class="title">${card.title}</div>
                            <div class="summary">${card.summary}</div>
                            <div class="monitor-pane">
                                <div class="monitor-header">
                                    <span>🛡 ${card.monitorTag}</span>
                                    <span>⏱ ${card.date}</span>
                                </div>
                            </div>
                            <a href="${card.link}" target="_blank" class="link">기사 본문보기 →</a>
                        </div>
                    `).join('')}
                </div>
            `;
            container.innerHTML += sectionHtml;
        }
    }

    // 2. Render Existing Charts (Category & Keyword)
    const ctxCategory = document.getElementById('categoryChart')?.getContext('2d');
    if (ctxCategory) {
        const categoryData = {"경쟁사 동향": 307, "DS (반도체)": 256, "DX (모바일/가전)": 349, "디스플레이": 146};
        new Chart(ctxCategory, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: ['#1428A0', '#00A9FF', '#74b9ff', '#b2bec3']
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    }

    const ctxKeyword = document.getElementById('keywordChart')?.getContext('2d');
    if (ctxKeyword) {
        const keywordData = {"애플": 102, "삼성전자 반도체": 82, "SK하이닉스": 108, "삼성 가전": 80, "삼성전자 스마트폰": 70, "QD-OLED": 92, "삼성 파운드리": 84, "삼성 갤럭시": 99, "삼성 HBM": 90, "TSMC": 97, "삼성디스플레이": 54, "삼성 녹스": 100};
        const words = Object.keys(keywordData).slice(0,10);
        const counts = Object.values(keywordData).slice(0,10);
        
        new Chart(ctxKeyword, {
            type: 'bar',
            data: {
                labels: words,
                datasets: [{
                    label: '검색 키워드 빈도',
                    data: counts,
                    backgroundColor: 'rgba(20, 40, 160, 0.7)',
                    borderColor: 'rgba(20, 40, 160, 1)',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    // 3. Render New Time-Series Chart
    const ctxTimeSeries = document.getElementById('timeSeriesChart')?.getContext('2d');
    if (ctxTimeSeries && typeof timeSeriesData !== 'undefined') {
        new Chart(ctxTimeSeries, {
            type: 'line',
            data: {
                labels: timeSeriesData.dates,
                datasets: [
                    {
                        label: '전체언급량 (이번주)',
                        data: timeSeriesData["전체언급량_이번주"],
                        borderColor: '#1428A0',
                        backgroundColor: 'rgba(20, 40, 160, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: '전체언급량 (지난주)',
                        data: timeSeriesData["전체언급량_지난주"],
                        borderColor: '#b2bec3',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: '긍정 기사 (이번주)',
                        data: timeSeriesData["긍정_이번주"],
                        borderColor: '#2ecc71',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: '부정 기사 (이번주)',
                        data: timeSeriesData["부정_이번주"],
                        borderColor: '#e74c3c',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    title: { display: false },
                    legend: { position: 'top' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
});
