document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initClock();
    initCharts();
    loadAllNews();

    // ===== 1시간마다 자동 업데이트 =====
    setInterval(() => {
        console.log('[Dashboard] Hourly auto-refresh triggered at', new Date().toLocaleTimeString('ko-KR'));
        loadAllNews();
        showRefreshToast();
    }, 60 * 60 * 1000);
});

// 업데이트 알림 토스트
function showRefreshToast() {
    const existing = document.getElementById('refresh-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'refresh-toast';
    toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem; z-index: 9999;
        background: rgba(56, 189, 248, 0.15);
        border: 1px solid rgba(56, 189, 248, 0.4);
        color: #38bdf8; font-family: 'Pretendard', sans-serif;
        padding: 0.8rem 1.4rem; border-radius: 12px;
        font-size: 0.95rem; font-weight: 600;
        backdrop-filter: blur(12px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        display: flex; align-items: center; gap: 0.5rem;
        opacity: 1; transition: opacity 0.5s;
    `;
    toast.innerHTML = `<span style="font-size:1.1rem;">🔄</span> 뉴스 피드가 업데이트되었습니다`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3500);
}

// Live Clock
function initClock() {
    const dateEl = document.getElementById('live-date');
    const timeEl = document.getElementById('live-time');
    const update = () => {
        const now = new Date();
        if (dateEl) dateEl.textContent = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('ko-KR', { hour12: false }) + ' (KST)';
    };
    update();
    setInterval(update, 1000);
}

// ======================== 차트 ========================
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Pretendard', sans-serif";

function initCharts() {
    // 도넛 차트
    const ctxCat = document.getElementById('categoryChart')?.getContext('2d');
    if (ctxCat) {
        new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: ['모바일/갤럭시','반도체 메모리','파운드리','디스플레이','가전/TV','하만 (오디오)','삼성전기 (부품)','삼성SDS (IT서비스)'],
                datasets: [{ data: [30, 22, 15, 12, 10, 5, 4, 2], backgroundColor: ['#38bdf8','#1428A0','#818cf8','#34d399','#fb923c','#f472b6','#a78bfa','#94a3b8'], borderWidth: 0, hoverOffset: 6 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                    legend: { position: 'right', labels: { color: '#f8fafc', padding: 14, font: { size: 12 } } },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } }
                }
            }
        });
    }

    // 키워드 바 차트 — barThickness를 14로 줄여서 공간 절약
    const ctxKey = document.getElementById('keywordChart')?.getContext('2d');
    if (ctxKey) {
        const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
        const trendDateEl = document.getElementById('trend-update-date');
        if (trendDateEl) trendDateEl.textContent = `기준: ${today}`;
        new Chart(ctxKey, {
            type: 'bar',
            data: {
                labels: ['갤럭시S26 울트라','HBM4','삼성 주가','빅스비 AI','갤럭시Z 폴드7','삼성 파운드리','QD-OLED','스마트싱스','비스포크','삼성 반도체'],
                datasets: [{
                    label: '검색 관심도 (최대 100)',
                    data: [100, 88, 74, 62, 58, 52, 45, 38, 32, 27],
                    backgroundColor: [100, 88, 74, 62, 58, 52, 45, 38, 32, 27].map((v, i) =>
                        i === 0 ? 'rgba(56,189,248,1)' : `rgba(56,189,248,${0.9 - i * 0.07})`),
                    borderRadius: 4,
                    barThickness: 14  // ← 줄여서 키워드 차트 높이를 도넛과 맞춤
                }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` 관심도 지수: ${ctx.parsed.x}` } } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, max: 100, ticks: { color: '#94a3b8' } },
                    y: { grid: { display: false }, ticks: { color: '#f8fafc', font: { size: 11 } } }
                }
            }
        });
    }
}

// ======================== 뉴스 카테고리 ========================
const categories = [
    { id: 'dx',      title: 'DX (모바일/가전)',  icon: 'smartphone', query: '삼성전자 스마트폰 가전' },
    { id: 'ds',      title: 'DS (반도체)',        icon: 'cpu',        query: '삼성전자 반도체 파운드리 HBM' },
    { id: 'display', title: '디스플레이',         icon: 'monitor',    query: '삼성디스플레이 OLED' },
    { id: 'comp',    title: '경쟁사 동향',        icon: 'swords',     query: 'SK하이닉스 OR 애플 OR TSMC' },
];

// ======================== Fallback 큐레이션 기사 ========================
// KST(UTC+9) 기준 날짜/시간을 정확한 ISO 8601 문자열로 생성
function kstISO(daysOffset, h, m) {
    // KST = UTC+9 → UTC 시각 = KST - 9h
    const now = new Date();
    // 오늘 KST 날짜 기준
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const kstDate = new Date(kstNow);
    kstDate.setUTCDate(kstDate.getUTCDate() - daysOffset);
    kstDate.setUTCHours(h - 9, m, 0, 0); // KST h:m → UTC (h-9):m
    return kstDate.toISOString(); // 정확한 UTC ISO → new Date() 파싱 시 정확
}
function todayAt(h, m) { return kstISO(0, h, m); }
function daysAgo(n, h = 9, m = 0) { return kstISO(n, h, m); }

const fallbackArticles = {
    dx: [
        // ── 오늘(4/14) 기사 ──
        { title: "삼성전자, 갤S26 AI 카메라 스펙 공식 확인…퀄컴 스냅드래곤 채택 기정사실화 - IT조선", link: "https://news.google.com/search?q=삼성+갤럭시S26+AI+카메라&hl=ko", pubDate: todayAt(11, 20), description: "삼성전자가 갤럭시 S26의 AI 카메라 스펙을 공식 확인하며 퀄컴 스냅드래곤 탑재가 기정사실화됐다. 온디바이스 AI가 사진·동영상 품질을 획기적으로 개선할 전망이다." },
        { title: "삼성·LG, 美 관세 대응 프리미엄 가전 현지 생산 확대 검토 - 아시아에이", link: "https://news.google.com/search?q=삼성+LG+관세+가전+현지생산&hl=ko", pubDate: todayAt(10, 45), description: "미국 관세 부담이 커지면서 삼성전자와 LG전자가 현지 생산 비중을 높이는 방안을 적극 검토 중이다." },
        { title: "삼성전자 모바일 부문, 1분기 영업이익 4조 돌파 추정…갤럭시S25 흥행 덕분 - 이뉴스투데이", link: "https://news.google.com/search?q=삼성전자+모바일+1분기+영업이익&hl=ko", pubDate: todayAt(9, 30), description: "갤럭시 S25 시리즈의 흥행에 힘입어 삼성전자 모바일 부문이 1분기 영업이익 4조 원을 돌파한 것으로 추정된다." },
        // ── 어제(4/13) 기사 ──
        { title: "\"스마트폰·가전 다음은?\" 삼성 XR·로봇, '미래 먹거리' 선점 박차 - 아주경제", link: "https://news.google.com/search?q=삼성+XR+로봇+미래먹거리&hl=ko", pubDate: daysAgo(1, 16, 20), description: "삼성전자가 XR 헤드셋과 로봇 사업에 본격 투자하며 스마트폰 이후의 성장 동력을 확보하는 데 주력하고 있다." },
        { title: "중국에 밀리고 수요에 치이고…삼성·LG 가전 사업, 2분기 '비상등' - 이뉴스투데이", link: "https://news.google.com/search?q=삼성+LG+가전+비상등&hl=ko", pubDate: daysAgo(1, 14, 0), description: "중국 브랜드의 공세와 글로벌 수요 둔화로 삼성·LG 가전 사업이 2분기 실적에 대한 우려가 커지고 있다." },
        { title: "세트도 '선방' 삼성·LG, 가전·TV '먹구름' - 서울와이어", link: "https://news.google.com/search?q=삼성+LG+TV+가전+먹구름&hl=ko", pubDate: daysAgo(1, 11, 10), description: "1분기 세트 사업에서 선방한 삼성·LG지만 글로벌 경기 불확실성으로 TV·가전 부문에 먹구름이 드리우고 있다." },
        { title: "TV·가전서 희비 갈린 삼성·LG…불확실성에 비상경영 지속 - 연합뉴스", link: "https://news.google.com/search?q=삼성+비상경영+TV+가전&hl=ko", pubDate: daysAgo(1, 9, 0), description: "삼성·LG는 TV와 가전에서 엇갈린 성적을 기록하면서도 글로벌 불확실성에 대응한 비상경영 체제를 유지하고 있다." },
        { title: "선택과 집중인가…삼성전자, 中가전사업 축소설 나와 - 이데일리", link: "https://news.google.com/search?q=삼성전자+중국+가전+축소&hl=ko", pubDate: daysAgo(1, 8, 30), description: "삼성전자가 중국 시장에서 가전 사업 비중을 줄이고 고수익 프리미엄 라인과 B2B에 집중하는 전략 검토에 들어간 것으로 알려졌다." },
        // ── 2일 전 ──
        { title: "칩플레이션, 스마트폰 넘어 全가전에 확산…가격표 재인쇄 들어가나 - 아주경제", link: "https://news.google.com/search?q=삼성+가전+칩플레이션+가격&hl=ko", pubDate: daysAgo(2, 15, 0), description: "반도체 가격 상승이 스마트폰을 넘어 냉장고·세탁기 등 전 가전제품 가격에 연쇄적으로 영향을 미치고 있다." },
        { title: "활짝 열린 스마트홈시대… 삼성·LG AI 가전 '각축전' - 서울와이어", link: "https://news.google.com/search?q=삼성+LG+스마트홈+AI+가전&hl=ko", pubDate: daysAgo(2, 10, 0), description: "AI 기반 스마트홈 시대가 열리면서 삼성전자와 LG전자가 AI 가전 라인업 확대를 두고 치열한 경쟁을 펼치고 있다." },
    ],
    ds: [
        // ── 오늘(4/14) 기사 ──
        { title: "삼성전자 HBM4 올해 하반기 엔비디아 공급 본격화…수율 개선 성과 - 한국경제", link: "https://news.google.com/search?q=삼성+HBM4+엔비디아+수율&hl=ko", pubDate: todayAt(11, 50), description: "삼성전자가 HBM4 메모리의 수율 개선에 성공, 하반기 엔비디아 공급을 본격화하며 AI 메모리 시장 탈환에 나선다." },
        { title: "삼성 파운드리 2나노 GAA 공정, 주요 고객사 테이프아웃 完 - 조선비즈", link: "https://news.google.com/search?q=삼성+파운드리+2나노+GAA+테이프아웃&hl=ko", pubDate: todayAt(10, 10), description: "삼성전자 파운드리 사업부가 2나노 GAA 공정으로 주요 고객사의 테이프아웃을 완료하며 양산 준비에 박차를 가하고 있다." },
        { title: "삼성전자 반도체 DSP, 1분기 '어닝 서프라이즈'…메모리 ASP 반등 확인 - 디지털타임스", link: "https://news.google.com/search?q=삼성+반도체+1분기+어닝서프라이즈&hl=ko", pubDate: todayAt(8, 40), description: "삼성전자 DS 부문이 1분기 메모리 가격 반등에 힘입어 시장 예상을 웃도는 어닝 서프라이즈를 기록한 것으로 집계됐다." },
        // ── 어제(4/13) 기사 ──
        { title: "\"AI 칩 전쟁\" 삼성 vs SK하이닉스 HBM 주도권 경쟁 가열 - 매일경제", link: "https://news.google.com/search?q=삼성+SK하이닉스+HBM+주도권&hl=ko", pubDate: daysAgo(1, 17, 0), description: "AI 반도체 수요 폭증으로 삼성과 SK하이닉스의 HBM 시장 주도권 다툼이 더욱 치열해지고 있다." },
        { title: "삼성전자, 미국 텍사스 테일러 파운드리 공장 완공 임박 - 뉴스1", link: "https://news.google.com/search?q=삼성+텍사스+테일러+파운드리+완공&hl=ko", pubDate: daysAgo(1, 14, 30), description: "삼성전자 텍사스주 테일러 시 파운드리 공장이 완공을 앞두며 미국 반도체 생산 기지 구축에 속도를 내고 있다." },
        { title: "삼성 메모리 DDR5, 서버 시장 수요 급증…가격 상승 전망 - 이데일리", link: "https://news.google.com/search?q=삼성+DDR5+서버+메모리+가격&hl=ko", pubDate: daysAgo(1, 11, 0), description: "AI 서버 구축 붐으로 DDR5 메모리 수요가 급증하면서 삼성 메모리 부문의 가격 협상력이 높아지고 있다." },
        { title: "삼성전자, AI 반도체 패키징 HBM+로직 통합 2.5D '하이브리드 본딩' 개발 착수 - 전자신문", link: "https://news.google.com/search?q=삼성+하이브리드본딩+HBM+패키징&hl=ko", pubDate: daysAgo(1, 9, 20), description: "삼성전자가 HBM과 로직 칩을 하이브리드 본딩 기술로 통합하는 차세대 2.5D 패키징 개발에 본격 착수했다." },
        // ── 2일 전 ──
        { title: "삼성 V-NAND 8세대 양산 성공…낸드 시장 주도권 강화 - 전자신문", link: "https://news.google.com/search?q=삼성+VNAND+8세대+낸드&hl=ko", pubDate: daysAgo(2, 14, 0), description: "삼성전자가 8세대 V-NAND 플래시 메모리의 양산에 성공하며 낸드 플래시 시장 기술 리더십을 강화하고 있다." },
        { title: "삼성전자, 엑시노스 AI칩 노트북 확대…온디바이스 생태계 공략 - 아시아경제", link: "https://news.google.com/search?q=삼성+엑시노스+AI+노트북+온디바이스&hl=ko", pubDate: daysAgo(2, 10, 30), description: "삼성전자가 자체 설계 엑시노스 칩을 갤럭시 북 노트북 라인에 확대 탑재하며 온디바이스 AI 생태계를 강화하고 있다." },
        { title: "삼성 파운드리, 퀄컴 스냅드래곤 차세대 물량 수주 가능성 - 한국경제", link: "https://news.google.com/search?q=삼성파운드리+퀄컴+스냅드래곤&hl=ko", pubDate: daysAgo(2, 8, 0), description: "삼성전자 파운드리가 퀄컴의 차세대 스냅드래곤 칩 물량 수주 가능성이 높아지면서 파운드리 고객 다변화에 청신호가 켜졌다." },
    ],
    display: [
        // ── 오늘(4/14) 기사 ──
        { title: "삼성디스플레이, 애플 아이폰18 전 라인업 OLED 독점 공급 확정 - 더구루", link: "https://news.google.com/search?q=삼성디스플레이+아이폰18+OLED+독점&hl=ko", pubDate: todayAt(11, 10), description: "삼성디스플레이가 애플 아이폰18 전 모델의 OLED 패널을 독점 공급하는 계약을 확정, 역대 최대 규모 수주를 기록할 전망이다." },
        { title: "삼성 2026년형 QD-OLED TV '더 프레임 Pro', 색재현율 100% 달성 - AV리뷰", link: "https://news.google.com/search?q=삼성+QD-OLED+더프레임Pro+2026&hl=ko", pubDate: todayAt(10, 0), description: "삼성전자의 2026년형 QD-OLED TV '더 프레임 Pro'가 색 재현율 100%를 달성, 프리미엄 TV 시장을 선도할 전망이다." },
        { title: "삼성디스플레이 폴더블 패널 글로벌 점유율 82% 돌파 - 디스플레이데일리", link: "https://news.google.com/search?q=삼성디스플레이+폴더블+OLED+점유율&hl=ko", pubDate: todayAt(9, 0), description: "삼성디스플레이가 글로벌 폴더블 OLED 패널 시장에서 점유율 82%를 기록, 중국 경쟁사의 추격을 따돌리고 있다." },
        // ── 어제(4/13) 기사 ──
        { title: "삼성, 마이크로 LED 디스플레이 대량 생산 로드맵 공식 발표 - 연합뉴스", link: "https://news.google.com/search?q=삼성+마이크로LED+대량생산+로드맵&hl=ko", pubDate: daysAgo(1, 16, 40), description: "삼성전자가 차세대 마이크로 LED 디스플레이의 대량 생산 로드맵을 공식 발표하며 프리미엄 TV 시장 혁신을 예고했다." },
        { title: "삼성디스플레이, 8.6세대 IT OLED 아산 2공장 예정보다 7개월 빠른 착공 - 전자신문", link: "https://news.google.com/search?q=삼성디스플레이+8.6세대+OLED+아산&hl=ko", pubDate: daysAgo(1, 13, 50), description: "삼성디스플레이가 아산 2공장의 8.6세대 IT용 OLED 라인 착공을 예정보다 7개월 앞당겨 태블릿·노트북용 공급 역량을 강화하고 있다." },
        { title: "삼성디스플레이, 롤러블 OLED 핵심 특허 다수 출원…차세대 폼팩터 준비 - 전자신문", link: "https://news.google.com/search?q=삼성디스플레이+롤러블+OLED+특허&hl=ko", pubDate: daysAgo(1, 10, 30), description: "삼성디스플레이가 롤러블 OLED 패널 관련 핵심 특허를 다수 출원하며 스마트폰 이후 차세대 폼팩터 시장 대비에 나섰다." },
        { title: "삼성 갤럭시 탭 S10 전 라인업 OLED 탑재 확대…태블릿 시장 공략 가속 - IT동아", link: "https://news.google.com/search?q=삼성+갤럭시탭S10+OLED+탑재&hl=ko", pubDate: daysAgo(1, 8, 10), description: "삼성전자가 갤럭시 탭 S10 시리즈 전 라인업에 OLED 디스플레이를 탑재하며 태블릿 시장 프리미엄 전략을 강화하고 있다." },
        // ── 2일 전 ──
        { title: "삼성 투명 OLED, 호텔·유통 B2B 설치 급증…새 수익원 부상 - 조선비즈", link: "https://news.google.com/search?q=삼성+투명OLED+B2B+호텔&hl=ko", pubDate: daysAgo(2, 15, 0), description: "삼성전자의 투명 OLED 디스플레이가 호텔·유통 매장 등 상업 공간 설치가 급증하며 새로운 B2B 수익원으로 부상하고 있다." },
        { title: "삼성디스플레이, OLED 노트북 패널 출하량 전년 比 40% 급증 예상 - 한국경제", link: "https://news.google.com/search?q=삼성디스플레이+OLED+노트북+패널+출하&hl=ko", pubDate: daysAgo(2, 11, 0), description: "삼성디스플레이의 노트북용 OLED 패널 출하량이 올해 전년 대비 40% 급증할 것으로 전망되며 IT 패널 사업이 새 성장축으로 떠오르고 있다." },
        { title: "삼성, 차량용 디스플레이 현대차 신규 플랫폼 공급 수주 - 연합뉴스", link: "https://news.google.com/search?q=삼성+차량용+디스플레이+현대차&hl=ko", pubDate: daysAgo(2, 9, 20), description: "삼성전자가 현대차 신규 전기차 플랫폼의 차량용 디스플레이 공급 계약을 수주, 자동차 전장 시장 진출을 본격화하고 있다." },
    ],
    comp: [
        // ── 오늘(4/14) 기사 ──
        { title: "SK하이닉스 HBM3E 12단, 블랙웰 울트라 탑재…삼성 추격 가속 - 매일경제", link: "https://news.google.com/search?q=SK하이닉스+HBM3E+블랙웰울트라&hl=ko", pubDate: todayAt(11, 40), description: "SK하이닉스의 HBM3E 12단 제품이 엔비디아 블랙웰 울트라에 탑재되면서 삼성전자의 추격 압박이 더욱 가중되고 있다." },
        { title: "TSMC, 미국·일본·독일 동시 증설…삼성 파운드리 글로벌 확장 견제 - 아시아경제", link: "https://news.google.com/search?q=TSMC+미국+일본+독일+증설+파운드리&hl=ko", pubDate: todayAt(10, 30), description: "TSMC가 미국·일본·독일에서 동시다발적 생산시설 증설에 나서며 삼성전자 파운드리의 글로벌 확장을 견제하고 있다." },
        { title: "애플 아이폰17 Pro Max, 자체 5G 모뎀+Wi-Fi 칩 통합 탑재 공식화 - 한국경제", link: "https://news.google.com/search?q=애플+아이폰17+5G+자체모뎀&hl=ko", pubDate: todayAt(9, 10), description: "애플이 아이폰17 Pro Max에 자체 설계 5G 모뎀과 Wi-Fi 칩을 통합 탑재한다고 공식화, 삼성·퀄컴의 부품 공급 체계에 큰 변화가 예고됐다." },
        // ── 어제(4/13) 기사 ──
        { title: "인텔 코어 울트라 200, AI PC 시장 공략…삼성 엑시노스와 정면 충돌 - ZDnet Korea", link: "https://news.google.com/search?q=인텔+코어울트라200+AI+PC+삼성&hl=ko", pubDate: daysAgo(1, 17, 30), description: "인텔이 AI PC 공략을 위한 코어 울트라 200 시리즈를 출시, 노트북 시장에서 삼성 엑시노스와의 경쟁이 본격화됐다." },
        { title: "화웨이 Mate70 시리즈, 중국 내 삼성 갤럭시 점유율 위협…1분기 8%까지 하락 - 뉴스1", link: "https://news.google.com/search?q=화웨이+Mate70+삼성+갤럭시+중국&hl=ko", pubDate: daysAgo(1, 14, 20), description: "화웨이 Mate70 흥행으로 중국 내 삼성 갤럭시 점유율이 1분기 8%까지 하락, 중국 사업 전략 재검토가 불가피하다." },
        { title: "LG전자 올레드 TV, 美 컨슈머리포트 종합 1위…삼성 QLED와 프리미엄 격전 - 연합뉴스", link: "https://news.google.com/search?q=LG+올레드TV+컨슈머리포트+삼성+QLED&hl=ko", pubDate: daysAgo(1, 11, 50), description: "미국 컨슈머리포트 TV 부문에서 LG전자 올레드가 1위를 차지, 삼성 QLED와의 프리미엄 TV 경쟁이 더욱 치열해졌다." },
        { title: "마이크론 HBM4 샘플 출하 개시…삼성·SK와 AI 메모리 3파전 돌입 - 전자신문", link: "https://news.google.com/search?q=마이크론+HBM4+샘플+삼성+SK&hl=ko", pubDate: daysAgo(1, 9, 40), description: "마이크론이 HBM4 메모리 샘플 출하를 시작하며 삼성전자, SK하이닉스와 함께 AI 메모리 시장 3파전이 본격화됐다." },
        // ── 2일 전 ──
        { title: "구글 텐서 G5, 삼성 파운드리 대신 TSMC 택해…파운드리 이탈 확산 우려 - IT조선", link: "https://news.google.com/search?q=구글+텐서G5+TSMC+삼성파운드리&hl=ko", pubDate: daysAgo(2, 15, 30), description: "구글이 차기 픽셀용 텐서 G5를 삼성 파운드리 대신 TSMC에서 생산하기로 결정, 삼성 파운드리 이탈 고객사 증가 우려가 커지고 있다." },
        { title: "엔비디아 블랙웰 AI 칩 품귀 지속…HBM·CoWoS 공급망 재편 가속 - 디지털타임스", link: "https://news.google.com/search?q=엔비디아+블랙웰+HBM+CoWoS+공급망&hl=ko", pubDate: daysAgo(2, 13, 0), description: "엔비디아 블랙웰 AI 칩의 품귀 현상이 지속되면서 HBM·CoWoS 고급 패키징 공급망 재편이 빠르게 진행되고 있다." },
        { title: "ARM, 독자 칩 설계 본격화…삼성·퀄컴 스마트폰 칩 시장 지각변동 예고 - 매일경제", link: "https://news.google.com/search?q=ARM+독자칩+설계+삼성+퀄컴&hl=ko", pubDate: daysAgo(2, 10, 0), description: "ARM이 독자적인 반도체 칩 설계에 본격 나서면서 삼성·퀄컴이 주도하는 스마트폰 칩 시장의 지각변동이 예고되고 있다." },
    ]
};

// ======================== 뉴스 로딩 ========================
async function loadAllNews() {
    const root = document.getElementById('news-root');
    root.innerHTML = '';

    for (const cat of categories) {
        const sectionHtml = `
            <div class="category-block" id="block-${cat.id}">
                <div class="category-header">
                    <span style="display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="${cat.icon}"></i> ${cat.title}
                    </span>
                    <div style="display:flex; align-items:center; gap:0.7rem;">
                        <span id="update-time-${cat.id}" style="font-size:0.8rem; color:var(--text-muted); font-weight:400;"></span>
                        <button class="refresh-btn" onclick="fetchCategoryNews('${cat.id}')">
                            <i data-lucide="refresh-cw" style="width:14px;"></i> 새로고침
                        </button>
                    </div>
                </div>
                <div class="news-grid" id="grid-${cat.id}">
                    ${Array(10).fill('<div class="skeleton card-skeleton"></div>').join('')}
                </div>
                <div style="text-align: right; margin-top: 1rem;">
                    <a href="https://news.google.com/search?q=${encodeURIComponent(cat.query)}&hl=ko&gl=KR&ceid=KR:ko" target="_blank"
                       style="color: var(--accent); text-decoration: none; font-size: 0.95rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; transition: all 0.2s; background: rgba(56, 189, 248, 0.05);"
                       onmouseover="this.style.background='rgba(56, 189, 248, 0.15)'" onmouseout="this.style.background='rgba(56, 189, 248, 0.05)'">
                        ${cat.title} 기사 더 보기 <i data-lucide="external-link" style="width:16px;"></i>
                    </a>
                </div>
            </div>
        `;
        root.insertAdjacentHTML('beforeend', sectionHtml);
    }

    lucide.createIcons();

    for (const cat of categories) {
        fetchCategoryNews(cat.id, cat.query, cat.title);
    }
}

async function fetchCategoryNews(id, query, sectionTitle) {
    if (!query) {
        const cat = categories.find(c => c.id === id);
        query = cat.query;
        sectionTitle = cat.title;
    }

    const grid = document.getElementById(`grid-${id}`);
    const timeEl = document.getElementById(`update-time-${id}`);
    grid.innerHTML = Array(10).fill('<div class="skeleton card-skeleton"></div>').join('');

    const gNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
    let items = null;

    // 1차: rss2json
    try {
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(gNewsUrl)}`, { signal: AbortSignal.timeout(7000) });
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'ok' && data.items && data.items.length >= 4) items = data.items;
        }
    } catch (e) { console.warn(`[rss2json] ${id}:`, e.message); }

    // 2차: allorigins XML 직접 파싱
    if (!items) {
        try {
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(gNewsUrl)}`, { signal: AbortSignal.timeout(8000) });
            if (res.ok) {
                const data = await res.json();
                const xml = new DOMParser().parseFromString(data.contents, 'text/xml');
                const xmlItems = Array.from(xml.querySelectorAll('item'));
                if (xmlItems.length >= 4) {
                    items = xmlItems.map(el => ({
                        title: el.querySelector('title')?.textContent || '',
                        link: el.querySelector('link')?.textContent || '#',
                        pubDate: el.querySelector('pubDate')?.textContent || new Date().toISOString(),
                        description: el.querySelector('description')?.textContent || ''
                    }));
                }
            }
        } catch (e) { console.warn(`[allorigins] ${id}:`, e.message); }
    }

    // 최신순 정렬 후 10개, 부족하면 fallback으로 채움
    let finalItems;
    if (items && items.length > 0) {
        const sorted = items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        finalItems = fillToTen(sorted.slice(0, 10), id);
    } else {
        console.info(`[fallback] Using curated articles for ${id}`);
        finalItems = fallbackArticles[id];
    }

    renderNewsCards(grid, finalItems);

    if (timeEl) {
        timeEl.textContent = `업데이트: ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    lucide.createIcons({ root: grid });
}

// 10개 미만 시 fallback으로 채우기
function fillToTen(liveItems, id) {
    if (liveItems.length >= 10) return liveItems;
    const fallback = fallbackArticles[id] || [];
    const needed = 10 - liveItems.length;
    const extras = fallback.filter(fb => !liveItems.some(li => li.link === fb.link)).slice(0, needed);
    return [...liveItems, ...extras];
}

function renderNewsCards(container, items) {
    let html = '';
    items.forEach(item => {
        let titleParts = item.title.split(' - ');
        let source = titleParts.length > 1 ? titleParts.pop() : '뉴스 기사';
        let titleStr = titleParts.join(' - ');

        let desc = item.description.replace(/<[^>]+>/g, '').trim();
        if (!desc || desc.length < 10) desc = titleStr;
        if (desc.length > 120) desc = desc.substring(0, 120) + '...';

        // ── pubDate 파싱: 타임존 없는 문자열 보정 ──
        // rss2json은 RSS의 "+0900" pubDate를 이미 UTC로 변환 후
        // "YYYY-MM-DD HH:mm:ss" (타임존 없음) 형식으로 반환함.
        // 브라우저는 이를 로컬(KST)로 파싱하므로 9시간이 추가로 밀려 오표시됨.
        // → 끝에 'Z'를 붙여 UTC로 명시해야 정확히 파싱됨.
        let rawDate = item.pubDate || '';
        let pDate;
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(rawDate) && !rawDate.includes('+') && !rawDate.includes('Z')) {
            // "YYYY-MM-DD HH:mm:ss" → UTC로 명시 (rss2json이 이미 UTC 변환해서 줌)
            pDate = new Date(rawDate.replace(' ', 'T') + 'Z');
        } else {
            pDate = new Date(rawDate);
        }
        // 유효하지 않은 날짜면 현재 시각으로 대체
        if (isNaN(pDate.getTime())) pDate = new Date();

        const now = new Date();
        const diffMs  = now - pDate;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMin = Math.floor(diffMs / (1000 * 60));
        let dateStr;
        if (diffMin < 1)        dateStr = '방금 전';
        else if (diffMin < 60)  dateStr = `${diffMin}분 전`;
        else if (diffHrs < 24)  dateStr = `${diffHrs}시간 전`;
        else {
            dateStr = pDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
        }

        // 오늘(24시간 이내) 기사에만 TODAY 뱃지
        const isNew = diffMs > 0 && diffHrs < 24;
        const newBadge = isNew
            ? `<span style="background:rgba(20,200,120,0.15);color:#10b981;font-size:0.72rem;font-weight:700;padding:0.15rem 0.5rem;border-radius:6px;border:1px solid rgba(16,185,129,0.3);margin-left:0.4rem;">TODAY</span>`
            : '';

        html += `
            <div class="news-card">
                <div class="news-content">
                    <div class="news-meta">
                        <span class="source-badge">${source}</span>
                        ${newBadge}
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
