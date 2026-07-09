/* ===== COMPARE PAGE ===== */
const CMP_COLORS=["#3a36c9","#15b8b0","#f59e0b","#8b5cf6"];
let cmpState={tickers:[null,null,null,null],period:"flow_3m"};

/* collect every ticker from TICKER_DATA for search */
function cmpAllTickers(){
  const list=[];
  Object.values(TICKER_DATA).forEach(arr=>arr.forEach(r=>{
    if(!list.find(x=>x.ticker===r.ticker))list.push({ticker:r.ticker,name:r.name});
  }));
  return list.sort((a,b)=>a.ticker.localeCompare(b.ticker));
}

/* get flow row for a ticker */
function cmpFindFlow(ticker){
  for(const arr of Object.values(TICKER_DATA)){
    const r=arr.find(x=>x.ticker===ticker);
    if(r)return r;
  }
  return null;
}

/* ---- synthetic daily NAV series (seeded walk, ~1 year of trading days) ---- */
function cmpNavSeries(ticker,numDays){
  const meta=TICKER_META[ticker];
  const price=meta?meta.nav:100;
  const seed=ticker.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  let x=(seed%997+1)/998;
  function rng(){x=(x*9301+49297)%233280;return x/233280;}
  const volatility=price>200?0.012:price>50?0.010:0.009;
  const pts=[];
  let p=price;
  for(let i=numDays;i>=0;i--){
    const drift=(rng()-0.499)*volatility*p;
    p=Math.max(p*0.5,p+drift);
    pts.unshift(+p.toFixed(2));
  }
  const adj=price/pts[pts.length-1];
  return pts.map(v=>+(v*adj).toFixed(2));
}

/* ---- draw flow bar chart (grouped bars per period) ---- */
function drawCmpFlowChart(){
  const box=document.getElementById("cmpFlowBox");
  if(!box)return;
  const W=box.clientWidth||600, H=box.clientHeight||220;
  const active=cmpState.tickers.map((t,i)=>t?{ticker:t,color:CMP_COLORS[i],flow:cmpFindFlow(t)}:null).filter(Boolean);
  if(!active.length){
    box.innerHTML=`<div class="cmp-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M3 17l5-5 3 3 7-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>티커를 선택하면 차트가 표시됩니다</span></div>`;
    return;
  }
  const PERIODS=["flow_1w","flow_1m","flow_3m","flow_6m","flow_ytd","flow_1y"];
  const PLABELS=["1W","1M","3M","6M","YTD","1Y"];
  const n=active.length, pn=PERIODS.length;
  const m={t:10,r:14,b:32,l:0};
  let maxAbsVal=0;
  active.forEach(a=>PERIODS.forEach(p=>{if(a.flow)maxAbsVal=Math.max(maxAbsVal,Math.abs(uScale(a.flow[p]||0)));}));
  const tickStr=maxAbsVal.toFixed(0);
  m.l=Math.max(44,tickStr.length*6+14);
  const iW=W-m.l-m.r, iH=H-m.t-m.b;
  const groupW=iW/pn;
  const barW=Math.min(18,groupW/(n+1));
  const gap=2;
  let allVals=[];
  active.forEach(a=>PERIODS.forEach(p=>{if(a.flow)allVals.push(uScale(a.flow[p]||0));}));
  const vMax=Math.max(...allVals.map(Math.abs),1)*1.15;
  const yZero=m.t+iH/2;
  const yScale=v=>(iH/2)*(v/vMax);
  const tickVals=[vMax*0.75,0,-vMax*0.75];
  const gridLines=tickVals.map(v=>{
    const y=yZero-yScale(v);
    const label=axisFmt(v*UNITS[unit].factor);
    return `<line x1="${m.l}" x2="${W-m.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--grid)" stroke-width="1"/>
    <text x="${m.l-6}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="var(--ink-3)" font-family="Manrope">${label}</text>`;
  }).join("");
  let bars="", labels="";
  PERIODS.forEach((p,pi)=>{
    const cx=m.l+groupW*(pi+0.5);
    const totalBarW=n*barW+(n-1)*gap;
    active.forEach((a,ai)=>{
      const val=uScale(a.flow?a.flow[p]||0:0);
      const bx=cx-totalBarW/2+ai*(barW+gap);
      const bh=Math.abs(yScale(val));
      const by=val>=0?yZero-bh:yZero;
      bars+=`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW}" height="${Math.max(1,bh).toFixed(1)}" fill="${a.color}" rx="2" opacity="0.9"/>`;
    });
    const selClass=p===cmpState.period?" font-weight='700' fill='var(--ink)'":"";
    labels+=`<text x="${cx.toFixed(1)}" y="${H-m.b+14}" text-anchor="middle" font-size="10.5" fill="var(--ink-3)" font-family="Manrope"${selClass}>${PLABELS[pi]}</text>`;
  });
  const selIdx=PERIODS.indexOf(cmpState.period);
  let highlight="";
  if(selIdx>=0){
    const hx=m.l+groupW*selIdx;
    highlight=`<rect x="${hx.toFixed(1)}" y="${m.t}" width="${groupW.toFixed(1)}" height="${iH}" fill="var(--accent)" opacity="0.05" rx="3"/>`;
  }
  box.innerHTML=`<svg width="${W}" height="${H}">
    ${highlight}${gridLines}${bars}${labels}
    <line x1="${m.l}" x2="${W-m.r}" y1="${yZero.toFixed(1)}" y2="${yZero.toFixed(1)}" stroke="var(--ink-3)" stroke-width="1"/>
    <text x="${m.l-6}" y="${m.t+8}" text-anchor="end" font-size="9.5" fill="var(--ink-3)" font-family="Manrope">${uShort()}</text>
  </svg>`;
}

/* ---- draw NAV multi-line chart ---- */
function drawCmpNavChart(){
  const box=document.getElementById("cmpNavBox");
  if(!box)return;
  const W=box.clientWidth||600, H=box.clientHeight||220;
  const active=cmpState.tickers.map((t,i)=>t?{ticker:t,color:CMP_COLORS[i]}:null).filter(Boolean);
  if(!active.length){
    box.innerHTML=`<div class="cmp-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M3 17l5-5 3 3 7-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>티커를 선택하면 차트가 표시됩니다</span></div>`;
    return;
  }
  const numDays=250;
  const series=active.map(a=>({...a,pts:cmpNavSeries(a.ticker,numDays)}));
  const norm=series.map(s=>{const b=s.pts[0];return{...s,pts:s.pts.map(v=>+(v/b*100).toFixed(2))};});
  const m={t:10,r:14,b:28,l:0};
  let allVals=norm.flatMap(s=>s.pts);
  const vMin=Math.min(...allVals)*0.99, vMax=Math.max(...allVals)*1.01;
  const maxLabel=vMax.toFixed(1);
  m.l=Math.max(44,maxLabel.length*6+14);
  const iW=W-m.l-m.r, iH=H-m.t-m.b;
  const xScale=i=>m.l+i/numDays*iW;
  const yScale=v=>m.t+iH-(v-vMin)/(vMax-vMin)*iH;
  const nTicks=4;
  let grid="";
  for(let i=0;i<=nTicks;i++){
    const v=vMin+(vMax-vMin)*i/nTicks;
    const y=yScale(v);
    grid+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--grid)" stroke-width="1"/>
    <text x="${m.l-5}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="var(--ink-3)" font-family="Manrope">${v.toFixed(1)}</text>`;
  }
  let paths="";
  norm.forEach(s=>{
    const d=s.pts.map((v,i)=>`${i===0?"M":"L"}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(" ");
    paths+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`;
  });
  let xlabels="";
  [0,50,100,150,200,250].forEach(i=>{
    xlabels+=`<text x="${xScale(i).toFixed(1)}" y="${H-m.b+14}" text-anchor="middle" font-size="10" fill="var(--ink-3)" font-family="Manrope">-${numDays-i}d</text>`;
  });
  box.innerHTML=`<svg width="${W}" height="${H}">${grid}${paths}${xlabels}
    <text x="${m.l-5}" y="${m.t+8}" text-anchor="end" font-size="9.5" fill="var(--ink-3)" font-family="Manrope">기준100</text>
  </svg>`;
}

/* ---- render comparison table ---- */
function renderCmpTable(){
  const wrap=document.getElementById("cmpTableWrap");
  if(!wrap)return;
  const active=cmpState.tickers.map((t,i)=>t?{ticker:t,color:CMP_COLORS[i],meta:TICKER_META[t],flow:cmpFindFlow(t)}:null).filter(Boolean);
  if(!active.length){
    wrap.innerHTML=`<div class="cmp-empty" style="height:120px"><span>위에서 티커를 검색하여 종목을 추가하세요</span></div>`;
    return;
  }
  const ROWS=[
    {label:"종목명",     fn:(a)=>a.meta?a.meta.name:"—"},
    {label:"종가",       fn:(a)=>a.meta?a.meta.close.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}):"—"},
    {label:"NAV",        fn:(a)=>a.meta?a.meta.nav.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}):"—"},
    {label:"상장주식수", fn:(a)=>a.meta?a.meta.shares.toLocaleString("en-US"):"—"},
    {label:"순자산",     fn:(a)=>a.meta?a.meta.netasset.toLocaleString("en-US"):"—"},
    {label:"대분류",     fn:(a)=>a.meta?a.meta.cat1:"—"},
    {label:"중분류",     fn:(a)=>a.meta?a.meta.cat2:"—"},
    {label:"소분류",     fn:(a)=>a.meta?a.meta.cat3:"—"},
    {label:"수수료",     fn:(a)=>a.meta?a.meta.fee.toFixed(3):"—"},
    {label:"12M 배당금", fn:(a)=>a.meta?a.meta.div12m.toFixed(2):"—"},
    {label:"12M DV(%)",  fn:(a)=>a.meta?a.meta.divYield.toFixed(2):"—"},
    {label:"배당주기",   fn:(a)=>a.meta?a.meta.divFreq:"—"},
    {label:"설정일",     fn:(a)=>a.meta?a.meta.inception:"—"},
    {label:"레버리지",   fn:(a)=>a.meta?a.meta.leverage:"—"},
  ];
  const colHeaders=active.map(a=>`<th><span class="cmp-th-ticker" style="color:${a.color}">${a.ticker}</span><span class="cmp-th-name">${a.meta?a.meta.name:""}</span></th>`).join("");
  const bodyRows=ROWS.map(r=>{
    const cells=active.map(a=>`<td>${r.fn(a)}</td>`).join("");
    return `<tr><td>${r.label}</td>${cells}</tr>`;
  }).join("");
  wrap.innerHTML=`<div class="cmp-table-wrap"><table class="cmp-table"><thead><tr><th>항목</th>${colHeaders}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
}

/* ---- master render ---- */
function renderCompare(){
  drawCmpFlowChart();
  drawCmpNavChart();
  renderCmpTable();
}

/* ---- search / dropdown ---- */
function cmpSearch(query){
  if(!query||query.length<1)return[];
  const q=query.toUpperCase();
  const all=cmpAllTickers();
  return all.filter(t=>t.ticker.startsWith(q)||t.ticker.includes(q)||t.name.toLowerCase().includes(query.toLowerCase())).slice(0,10);
}

function cmpShowDrop(idx,results){
  const drop=document.getElementById("cmpDrop"+idx);
  if(!drop)return;
  if(!results.length){drop.classList.remove("open");drop.innerHTML="";return;}
  drop.innerHTML=results.map(r=>`<div class="cmp-drop-item" data-ticker="${r.ticker}" data-idx="${idx}"><span class="cmp-drop-ticker">${r.ticker}</span><span class="cmp-drop-name">${r.name}</span></div>`).join("");
  drop.classList.add("open");
}

function cmpSelect(idx,ticker){
  cmpState.tickers[idx]=ticker;
  const slot=document.querySelector(`.cmp-slot[data-idx="${idx}"]`);
  if(!slot)return;
  const input=slot.querySelector(".cmp-input");
  const clear=slot.querySelector(".cmp-clear");
  const drop=document.getElementById("cmpDrop"+idx);
  input.value=ticker;
  input.readOnly=true;
  clear.style.display="";
  drop.classList.remove("open");
  drop.innerHTML="";
  renderCompare();
}

function cmpClear(idx){
  cmpState.tickers[idx]=null;
  const slot=document.querySelector(`.cmp-slot[data-idx="${idx}"]`);
  if(!slot)return;
  const input=slot.querySelector(".cmp-input");
  const clear=slot.querySelector(".cmp-clear");
  input.value="";
  input.readOnly=false;
  clear.style.display="none";
  renderCompare();
}

function initComparePage(){
  document.querySelectorAll(".cmp-input").forEach(inp=>{
    inp.addEventListener("input",e=>{
      const idx=+e.target.dataset.idx;
      cmpShowDrop(idx,cmpSearch(e.target.value));
    });
    inp.addEventListener("focus",e=>{
      const idx=+e.target.dataset.idx;
      if(e.target.value&&!e.target.readOnly)cmpShowDrop(idx,cmpSearch(e.target.value));
    });
  });
  document.querySelectorAll(".cmp-clear").forEach(btn=>{
    btn.addEventListener("click",e=>{cmpClear(+e.target.dataset.idx);});
  });
  document.addEventListener("click",e=>{
    const item=e.target.closest(".cmp-drop-item");
    if(item){cmpSelect(+item.dataset.idx,item.dataset.ticker);return;}
    document.querySelectorAll(".cmp-drop").forEach(d=>{
      if(!d.contains(e.target)&&!e.target.closest(".cmp-input-wrap"))d.classList.remove("open");
    });
  });
  document.querySelectorAll("#cmpPeriodSeg button").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll("#cmpPeriodSeg button").forEach(x=>x.classList.remove("on"));
    b.classList.add("on");
    cmpState.period=b.dataset.p;
    drawCmpFlowChart();
  }));
  document.getElementById("unitSelC").addEventListener("change",e=>applyUnit(e.target.value));
  window.addEventListener("resize",()=>{
    if(document.getElementById("page-compare").classList.contains("on"))renderCompare();
  });
}
