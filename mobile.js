/* ===== 상수 & 유틸리티 ===== */
const UNITS = {
  trillion: {label:"조 달러", short:"조",   factor:1000000000},
  billion:  {label:"십억 달러",short:"십억", factor:1000000},
  million:  {label:"백만 달러",short:"백만", factor:1000},
  thousand: {label:"천 달러",  short:"천",   factor:1},
};
const PERIODS = ["flow_1w","flow_1m","flow_3m","flow_6m","flow_ytd","flow_1y"];
const AP_PERIOD_DAYS  = {flow_1w:7,flow_1m:30,flow_3m:91,flow_6m:182,flow_ytd:175,flow_1y:365};
const AP_PERIOD_BDAYS = {flow_1w:5,flow_1m:22,flow_3m:66,flow_6m:130,flow_ytd:125,flow_1y:252};
const ASSET_ORDER = ["주식","채권","자산배분","상품","부동산","대체투자/기타","크립토"];
const ZERO_ROW = {netasset:0,flow_1w:0,flow_1m:0,flow_3m:0,flow_6m:0,flow_ytd:0,flow_1y:0};

let unit = "million";
let mPeriod = "flow_3m";
let mDetailAxis = "asset";
let mDetailCat = "주식";
let mDetailRegion = "주요 지역";
let mPanelPeriod = "flow_1m";
let mLastPanelData = null;

const uScale = v => v / UNITS[unit].factor;
const uLabel = () => UNITS[unit].label;
const uShort = () => UNITS[unit].short;
const fmt = n => {
  const v = uScale(n), a = Math.abs(v);
  let d = 0;
  if(a < 1 && a > 0) d = 2; else if(a < 10) d = 2; else if(a < 100) d = 1;
  return v.toLocaleString("en-US", {minimumFractionDigits:d, maximumFractionDigits:d});
};

function pseudoReturn(name, p) {
  const idx = PERIODS.indexOf(p);
  let h = 0; for(let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return +((((h % 140) - 45) / 10) * [0.25,0.6,1.3,2.1,1.8,3.0][idx]).toFixed(2);
}

function buildDaily(row, period = "flow_1m") {
  const days = AP_PERIOD_DAYS[period], bdays = AP_PERIOD_BDAYS[period];
  const dailyAvg = row[period] / bdays;
  const out = []; let cum = 0;
  const end = new Date(2026, 5, 24);
  for(let i = 0; i < days; i++) {
    const d = new Date(end); d.setDate(d.getDate() - (days - 1 - i));
    const daily = Math.round(dailyAvg + Math.sin(i*1.3)*dailyAvg*1.8 + Math.cos(i*0.5)*dailyAvg*0.9);
    cum += daily;
    out.push({
      fulldate:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,
      asset: Math.round(row.netasset - row[period] + cum), daily, cum
    });
  }
  return out.reverse();
}

function renderTopFlows(cat, period, containerId) {
  const el = document.getElementById(containerId); if(!el) return;
  const tickers = (TICKER_DATA && TICKER_DATA[cat]) || [];
  if(!tickers.length) { el.innerHTML = '<div style="color:var(--ink-3);font-size:12px;padding:8px 0">종목 데이터 없음</div>'; return; }
  const sorted = [...tickers].sort((a,b) => b[period] - a[period]);
  const inflows  = sorted.filter(t => t[period] > 0).slice(0, 5);
  const outflows = [...tickers].sort((a,b) => a[period] - b[period]).filter(t => t[period] < 0).slice(0, 5);
  const makeTable = (items, isIn) => {
    const col = isIn ? 'var(--inflow)' : 'var(--outflow)';
    const rows = items.map((t,i) => `<tr>
      <td>${i+1}</td><td>${t.ticker}</td><td>${t.name}</td>
      <td style="color:${col};font-weight:600">${t[period]>=0?'+':''}${fmt(t[period])}</td></tr>`).join('');
    return `<div class="top-flows-section">
      <div class="top-flows-label" style="color:${col}">
        <span style="width:8px;height:8px;border-radius:50%;background:${col};display:inline-block;flex-shrink:0"></span>
        ${isIn ? '자금유입 상위' : '자금유출 상위'}
      </div>
      <table class="ranktable">
        <thead><tr><th>#</th><th>티커</th><th>종목명</th><th>누적</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  };
  el.innerHTML = makeTable(inflows, true) + makeTable(outflows, false);
}

/* ===== 데이터 접근자 ===== */
const mCurRows = () => {
  const arr = data["US"] || [], byCat = {};
  arr.forEach(r => byCat[r.category] = r);
  const extras = arr.map(r => r.category).filter(c => !ASSET_ORDER.includes(c));
  return [...ASSET_ORDER, ...extras].map(c => byCat[c] || {category:c, ...ZERO_ROW});
};
const mCurDataset = () => mDetailAxis === "region" ? REGION : HIER;
const mCurCats    = () => mDetailAxis === "region" ? REGION_CATS : DETAIL_CATS;
const mCurCatKey  = () => mDetailAxis === "region" ? mDetailRegion : mDetailCat;
const mSetCatKey  = k  => { if(mDetailAxis === "region") mDetailRegion = k; else mDetailCat = k; };
const mCurNode    = () => mCurDataset()[mCurCatKey()];
const mAllLeaves  = h  => h.flat ? h.leaves : h.groups.flatMap(g => g.children);
const mSumFlows   = (ch, key) => ch.reduce((a,c) => a + c[key], 0);

/* ===== 개요 페이지 ===== */
function renderMKpis() {
  const rows  = mCurRows();
  const total = rows.reduce((a,r) => a + r.netasset, 0);
  const netIn = rows.reduce((a,r) => a + r[mPeriod], 0);
  const top   = [...rows].sort((a,b) => b[mPeriod] - a[mPeriod])[0];
  const pLbl  = {flow_1w:"1W",flow_1m:"1M",flow_3m:"3M",flow_6m:"6M",flow_ytd:"YTD",flow_1y:"1Y"}[mPeriod];
  const pos   = netIn >= 0;

  document.getElementById("mKpis").innerHTML = `
    <div class="mkpi-row">
      <div class="mkpi">
        <div class="mkpi-l">총 순자산</div>
        <div class="mkpi-v num">${fmt(total)}<span class="mkpi-u"> ${uShort()}</span></div>
        <div class="mkpi-sub">미국 ETF 기준</div>
      </div>
      <div class="mkpi">
        <div class="mkpi-l">순유입 (${pLbl})</div>
        <div class="mkpi-v num" style="color:${pos?'var(--inflow)':'var(--outflow)'}">${pos?'+':''}${fmt(netIn)}<span class="mkpi-u"> ${uShort()}</span></div>
        <div class="mkpi-sub">${pos?'순유입 우위':'순유출 우위'}</div>
      </div>
    </div>
    <div class="mkpi-row">
      <div class="mkpi">
        <div class="mkpi-l">최다 유입 자산 (${pLbl})</div>
        <div class="mkpi-v">${top ? top.category : '-'}</div>
        <div class="mkpi-sub">${top ? `+${fmt(top[mPeriod])} ${uShort()}` : ''}</div>
      </div>
      <div class="mkpi">
        <div class="mkpi-l">운용 자산군</div>
        <div class="mkpi-v">${rows.length}<span class="mkpi-u"> 개</span></div>
        <div class="mkpi-sub">전체 자산군</div>
      </div>
    </div>`;

  document.getElementById("mUnitNote").textContent = uLabel();
}

function renderMAssetList() {
  const rows   = mCurRows();
  const total  = rows.reduce((a,r) => a + r.netasset, 0);
  const maxAbs = Math.max(...rows.map(r => Math.abs(r[mPeriod]))) || 1;

  document.getElementById("mAssetList").innerHTML = rows.map(r => {
    const v = r[mPeriod], pos = v >= 0;
    const pct  = total ? (r.netasset / total * 100) : 0;
    const barW = (Math.abs(v) / maxAbs * 100).toFixed(1);
    return `<div class="masset-card" data-cat="${r.category}">
      <div class="masset-top">
        <div class="masset-name"><i style="background:${COLORS[r.category]||'#888'}"></i>${r.category}</div>
        <div class="masset-flow num" style="color:${pos?'var(--inflow)':'var(--outflow)'}">${pos?'+':''}${fmt(v)} <span style="font-size:10px;font-weight:600;opacity:.7">${uShort()}</span></div>
      </div>
      <div class="masset-bar-wrap"><div class="masset-bar" style="width:${barW}%;background:${pos?'var(--inflow)':'var(--outflow)'}"></div></div>
      <div class="masset-bot">
        <span class="num">${fmt(r.netasset)} ${uShort()}</span>
        <span>${pct.toFixed(1)}%</span>
      </div>
    </div>`;
  }).join("");

  document.querySelectorAll(".masset-card").forEach(card => {
    card.addEventListener("click", () => {
      const row = mCurRows().find(r => r.category === card.dataset.cat);
      if(row) openMPanel("asset", row);
    });
  });
}

/* ===== 세부분석 페이지 ===== */
function renderMCattabs() {
  const ds = mCurDataset(), cats = mCurCats(), activeKey = mCurCatKey();
  document.getElementById("mCattabs").innerHTML = cats.map(cat => {
    const h  = ds[cat];
    const flow = mAllLeaves(h).reduce((a,c) => a + c[mPeriod], 0);
    const pos  = flow >= 0;
    return `<button class="mcattab${cat === activeKey ? " on" : ""}" data-cat="${cat}">
      <i style="background:${h.color}"></i>${cat}
      <span class="mctflow" style="color:${pos?'var(--inflow)':'var(--outflow)'}">${pos?'+':''}${fmt(flow)}</span>
    </button>`;
  }).join("");
  document.querySelectorAll(".mcattab").forEach(t => t.addEventListener("click", () => {
    mSetCatKey(t.dataset.cat); renderMCattabs(); renderMLeafList();
  }));
}

function mLeafCardHTML(leaf, color, total, maxAbs, groupName) {
  const v = leaf[mPeriod], pos = v >= 0;
  const pct  = total ? (leaf.netasset / total * 100) : 0;
  const barW = (Math.abs(v) / maxAbs * 100).toFixed(1);
  return `<div class="mleaf-card" data-name="${leaf.name}" data-group="${groupName}">
    <div class="mleaf-top">
      <div class="mleaf-name"><span class="tdot" style="background:${color}"></span>${leaf.name}</div>
      <div class="mleaf-flow num" style="color:${pos?'var(--inflow)':'var(--outflow)'}">${pos?'+':''}${fmt(v)}</div>
    </div>
    <div class="mleaf-bar-wrap"><div class="mleaf-bar" style="width:${barW}%;background:${pos?'var(--inflow)':'var(--outflow)'}"></div></div>
    <div class="mleaf-bot">
      <span class="num">${fmt(leaf.netasset)} ${uShort()}</span>
      <span>${pct.toFixed(1)}%</span>
    </div>
  </div>`;
}

function renderMLeafList() {
  const h      = mCurNode();
  const leaves = mAllLeaves(h);
  const total  = leaves.reduce((a,c) => a + c.netasset, 0);
  const maxAbs = Math.max(...leaves.map(l => Math.abs(l[mPeriod]))) || 1;
  let html = "";

  if(h.flat) {
    html = leaves.map(leaf => mLeafCardHTML(leaf, h.color, total, maxAbs, mCurCatKey())).join("");
  } else {
    h.groups.forEach(g => {
      const agg = {netasset: g.children.reduce((a,c) => a + c.netasset, 0)};
      PERIODS.forEach(p => agg[p] = mSumFlows(g.children, p));
      const gv = agg[mPeriod], gpos = gv >= 0;
      html += `<div class="mgroup-header">
        <span>${g.name} <span style="color:var(--ink-3);font-size:11px;font-weight:500">${g.children.length}개</span></span>
        <span style="color:${gpos?'var(--inflow)':'var(--outflow)'};font-size:11.5px;font-weight:700">${gpos?'+':''}${fmt(gv)} ${uShort()}</span>
      </div>`;
      html += g.children.map(leaf => mLeafCardHTML(leaf, h.color, total, maxAbs, g.name)).join("");
    });
  }

  const container = document.getElementById("mLeafList");
  container.innerHTML = html;
  container.querySelectorAll(".mleaf-card").forEach(card => {
    card.addEventListener("click", () => {
      const leafName  = card.dataset.name;
      const groupName = card.dataset.group;
      let leaf;
      if(h.flat) leaf = h.leaves.find(l => l.name === leafName);
      else h.groups.forEach(g => { const f = g.children.find(c => c.name === leafName); if(f) leaf = f; });
      if(leaf) openMPanel("leaf", leaf, groupName);
    });
  });
}

/* ===== 패널 ===== */
function openMPanel(type, rowOrLeaf, groupName) {
  mLastPanelData = {type, data: rowOrLeaf, groupName};

  let color, catKey, pct, displayName;

  if(type === "asset") {
    const cat = rowOrLeaf.category;
    color = COLORS[cat] || "#3a36c9";
    catKey = cat;
    const total = mCurRows().reduce((a,r) => a + r.netasset, 0);
    pct = (rowOrLeaf.netasset / total * 100).toFixed(2);
    displayName = cat;
    document.getElementById("mpEyebrow").innerHTML = `<i style="background:${color}"></i>미국`;
  } else {
    const h = mCurNode();
    color = h.color;
    catKey = mCurCatKey();
    const total = mAllLeaves(h).reduce((a,c) => a + c.netasset, 0);
    pct = (rowOrLeaf.netasset / total * 100).toFixed(2);
    displayName = rowOrLeaf.name;
    const eyebrow = h.flat ? catKey : catKey + (groupName && groupName !== catKey ? " · " + groupName : "");
    document.getElementById("mpEyebrow").innerHTML = `<i style="background:${color}"></i>${eyebrow}`;
  }

  document.getElementById("mpName").textContent = displayName;
  document.getElementById("mpUnitSel").value = unit;
  document.getElementById("mpPeriodSel").value = mPanelPeriod;

  renderMPanelContent(rowOrLeaf, color, catKey, pct, displayName);

  const panel = document.getElementById("mpanel");
  panel.classList.add("on");
  panel.querySelector(".mpanel-body").scrollTop = 0;
}

function renderMPanelContent(row, color, catKey, pct, displayName) {
  const daily  = buildDaily(row, mPanelPeriod);
  const latest = daily[0];

  document.getElementById("mpStats").innerHTML = [
    {l:"순자산",       v: fmt(row.netasset) + `<span style='font-size:10px;color:var(--ink-3)'> ${uShort()}</span>`},
    {l:"비중",         v: pct + `<span style='font-size:10px;color:var(--ink-3)'> %</span>`},
    {l:"당일 자금유출입", v: `<span style="color:${latest.daily>=0?'var(--inflow)':'var(--outflow)'}">${latest.daily>=0?'+':''}${fmt(latest.daily)}</span>`},
    {l:"누적 자금유출입", v: `<span style="color:${latest.cum>=0?'var(--inflow)':'var(--outflow)'}">${latest.cum>=0?'+':''}${fmt(latest.cum)}</span>`},
  ].map(s => `<div class="mstat"><div class="mstat-l">${s.l}</div><div class="mstat-v num">${s.v}</div></div>`).join("");

  drawComboChart(daily.slice().reverse(), color, "mpChart");

  document.getElementById("mpRows").innerHTML = daily.map(d => `
    <tr><td>${d.fulldate}</td>
      <td>${fmt(d.asset)}</td>
      <td style="color:${d.daily>=0?'var(--inflow)':'var(--outflow)'};font-weight:600">${d.daily>=0?'+':''}${fmt(d.daily)}</td>
      <td style="color:${d.cum>=0?'var(--inflow)':'var(--outflow)'};font-weight:600">${d.cum>=0?'+':''}${fmt(d.cum)}</td></tr>`).join("");

  const pLabels = {flow_1w:"1W",flow_1m:"1M",flow_3m:"3M",flow_6m:"6M",flow_ytd:"YTD",flow_1y:"1Y"};
  drawReturnChart(PERIODS.map(p => pseudoReturn(displayName, p)), PERIODS.map(p => pLabels[p]), "mpReturnChart");
  renderTopFlows(catKey, mPanelPeriod, "mpTopFlows");
}

function closeMPanel() {
  document.getElementById("mpanel").classList.remove("on");
  mLastPanelData = null;
}

/* ===== 유닛 동기화 ===== */
function syncMUnit() {
  ["mUnitSel","mUnitSelD","mpUnitSel"].forEach(id => document.getElementById(id).value = unit);
}

/* ===== 이벤트 리스너 ===== */
document.getElementById("mpanelBack").addEventListener("click", closeMPanel);

document.getElementById("mpPeriodSel").addEventListener("change", e => {
  mPanelPeriod = e.target.value;
  if(mLastPanelData) openMPanel(mLastPanelData.type, mLastPanelData.data, mLastPanelData.groupName);
});
document.getElementById("mpUnitSel").addEventListener("change", e => {
  unit = e.target.value; syncMUnit();
  if(mLastPanelData) openMPanel(mLastPanelData.type, mLastPanelData.data, mLastPanelData.groupName);
});
document.getElementById("mUnitSel").addEventListener("change", e => {
  unit = e.target.value; syncMUnit(); renderMKpis(); renderMAssetList();
});
document.getElementById("mUnitSelD").addEventListener("change", e => {
  unit = e.target.value; syncMUnit(); renderMCattabs(); renderMLeafList();
});

document.querySelectorAll("#mPeriodSeg button").forEach(b => b.addEventListener("click", () => {
  mPeriod = b.dataset.p;
  document.querySelectorAll("#mPeriodSeg button").forEach(x => x.classList.toggle("on", x.dataset.p === mPeriod));
  renderMKpis(); renderMAssetList(); renderMCattabs(); renderMLeafList();
}));

document.querySelectorAll("#mAxisSeg button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("#mAxisSeg button").forEach(x => x.classList.remove("on"));
  b.classList.add("on");
  mDetailAxis = b.dataset.axis;
  renderMCattabs(); renderMLeafList();
}));

document.querySelectorAll(".mnav button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".mnav button").forEach(x => x.classList.remove("on"));
  b.classList.add("on");
  const pg = b.dataset.page;
  document.getElementById("mpage-overview").classList.toggle("on", pg === "overview");
  document.getElementById("mpage-detail").classList.toggle("on", pg === "detail");
  if(pg === "detail") { renderMCattabs(); renderMLeafList(); }
}));

document.getElementById("mThemeBtn").addEventListener("click", () => {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  const icon = document.getElementById("mThemeIcon");
  if(next === "dark") {
    icon.outerHTML = '<svg id="mThemeIcon" viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" fill="currentColor"/></svg>';
  } else {
    icon.outerHTML = '<svg id="mThemeIcon" viewBox="0 0 24 24" fill="none" width="18" height="18"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></g></svg>';
  }
});

/* ===== 초기화 ===== */
renderMKpis();
renderMAssetList();
