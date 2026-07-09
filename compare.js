/* compare.js – ETF 종목 비교 페이지 */
const CMP_COLORS=["#3a36c9","#15b8b0","#f59e0b","#8b5cf6"];
let _cmpInited=false;
const cmpState={tickers:[null,null,null,null],period:"flow_1y"};

/* ---- data helpers ---- */
function cmpAllTickers(){
  const map=new Map();
  Object.values(TICKER_DATA).forEach(arr=>arr.forEach(r=>map.set(r.ticker,r.name)));
  if(typeof TICKER_META!=="undefined")
    Object.entries(TICKER_META).forEach(([t,m])=>{if(!map.has(t))map.set(t,m.name);});
  return Array.from(map.entries()).map(([ticker,name])=>({ticker,name})).sort((a,b)=>a.ticker.localeCompare(b.ticker));
}

function cmpFindFlow(ticker){
  for(const arr of Object.values(TICKER_DATA)){
    const r=arr.find(x=>x.ticker===ticker);
    if(r)return r;
  }
  return null;
}

/* ---- synthetic NAV series (seeded walk, normalised to 100) ---- */
function cmpNavSeries(ticker,numDays){
  const meta=(typeof TICKER_META!=="undefined")?TICKER_META[ticker]:null;
  const price=meta?meta.nav:100;
  const seed=ticker.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  let x=(seed%997+1)/998;
  function rng(){x=(x*9301+49297)%233280;return x/233280;}
  const vol=price>200?0.012:price>50?0.010:0.009;
  const pts=[];
  let p=price;
  for(let i=numDays;i>=0;i--){
    p=Math.max(p*0.5,p+(rng()-0.499)*vol*p);
    pts.unshift(+p.toFixed(2));
  }
  const adj=price/pts[pts.length-1];
  return pts.map(v=>+(v*adj).toFixed(2));
}

/* ---- flow grouped-bar chart (all periods side-by-side) ---- */
function drawCmpFlowChart(){
  const box=document.getElementById("cmpFlowBox");
  if(!box)return;
  const W=box.clientWidth||600,H=box.clientHeight||200;
  const active=cmpState.tickers
    .map((t,i)=>t?{ticker:t,color:CMP_COLORS[i],flow:cmpFindFlow(t)}:null)
    .filter(Boolean);
  const leg=document.getElementById("cmpFlowLeg");
  if(!active.length){
    box.querySelectorAll("svg").forEach(s=>s.remove());
    box.querySelector(".cmp-empty-msg")?.remove();
    const msg=document.createElement("div");
    msg.className="cmp-empty-msg";msg.style.cssText="height:100%;display:flex;align-items:center;justify-content:center;color:var(--ink-3);font-size:13px;";
    msg.textContent="티커를 선택하면 차트가 표시됩니다";
    box.appendChild(msg);
    if(leg)leg.innerHTML=`<span style="color:var(--ink-3)">종목을 선택하세요</span>`;
    return;
  }
  box.querySelectorAll(".cmp-empty-msg").forEach(e=>e.remove());
  const PERIODS=["flow_1w","flow_1m","flow_3m","flow_6m","flow_ytd","flow_1y"];
  const PLABELS=["1W","1M","3M","6M","YTD","1Y"];
  const n=active.length,pn=PERIODS.length;
  let maxAbsVal=0;
  active.forEach(a=>PERIODS.forEach(p=>{if(a.flow)maxAbsVal=Math.max(maxAbsVal,Math.abs(uScale(a.flow[p]||0)));}));
  const tickStr=axisFmt(maxAbsVal*UNITS[unit].factor);
  const m={t:10,r:14,b:32,l:Math.max(44,tickStr.length*6+14)};
  const iW=W-m.l-m.r,iH=H-m.t-m.b;
  const groupW=iW/pn;
  const barW=Math.min(18,groupW/(n+1));
  const gap=2;
  let allVals=[];
  active.forEach(a=>PERIODS.forEach(p=>{if(a.flow)allVals.push(uScale(a.flow[p]||0));}));
  const vMax=Math.max(...allVals.map(Math.abs),1)*1.15;
  const yZero=m.t+iH/2;
  const yScl=v=>(iH/2)*(v/vMax);
  const tickVals=[vMax*0.75,0,-vMax*0.75];
  const cs=getComputedStyle(document.documentElement);
  const gridColor=cs.getPropertyValue("--grid").trim();
  const ink3=cs.getPropertyValue("--ink-3").trim();
  const gridLines=tickVals.map(v=>{
    const y=yZero-yScl(v);
    const label=axisFmt(v*UNITS[unit].factor);
    return `<line x1="${m.l}" x2="${W-m.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${gridColor}" stroke-width="1"/>
    <text x="${m.l-6}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="${ink3}" font-family="Manrope">${label}</text>`;
  }).join("");
  let bars="",xlabels="";
  PERIODS.forEach((p,pi)=>{
    const cx=m.l+groupW*(pi+0.5);
    const totalBarW=n*barW+(n-1)*gap;
    active.forEach((a,ai)=>{
      const val=uScale(a.flow?a.flow[p]||0:0);
      const bx=cx-totalBarW/2+ai*(barW+gap);
      const bh=Math.abs(yScl(val));
      const by=val>=0?yZero-bh:yZero;
      bars+=`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW}" height="${Math.max(1,bh).toFixed(1)}" fill="${a.color}" rx="2" opacity="${p===cmpState.period?1:0.65}"/>`;
    });
    const bold=p===cmpState.period?" font-weight='700' fill='var(--ink)'":"";
    xlabels+=`<text x="${cx.toFixed(1)}" y="${H-m.b+14}" text-anchor="middle" font-size="10.5" fill="${ink3}" font-family="Manrope"${bold}>${PLABELS[pi]}</text>`;
  });
  const selIdx=PERIODS.indexOf(cmpState.period);
  const highlight=selIdx>=0?`<rect x="${(m.l+groupW*selIdx).toFixed(1)}" y="${m.t}" width="${groupW.toFixed(1)}" height="${iH}" fill="var(--accent)" opacity="0.05" rx="3"/>`:"";
  box.querySelectorAll("svg").forEach(s=>s.remove());
  const ns="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox",`0 0 ${W} ${H}`);svg.setAttribute("width","100%");svg.setAttribute("height","100%");
  svg.innerHTML=`${highlight}${gridLines}${bars}${xlabels}
    <line x1="${m.l}" x2="${W-m.r}" y1="${yZero.toFixed(1)}" y2="${yZero.toFixed(1)}" stroke="${ink3}" stroke-width="1"/>
    <text x="${m.l-5}" y="${m.t+9}" text-anchor="end" font-size="9.5" fill="${ink3}" font-family="Manrope">${uShort()}</text>`;
  box.insertBefore(svg,box.firstChild);
  if(leg)leg.innerHTML=active.map(a=>{
    const v=a.flow?a.flow[cmpState.period]||0:0;
    return `<span><i style="background:${a.color}"></i>${a.ticker} <b class="num">${fmt(v)} ${uShort()}</b></span>`;
  }).join("");
}

/* ---- NAV normalised line chart ---- */
function drawCmpNavChart(){
  const box=document.getElementById("cmpNavBox");
  if(!box)return;
  const W=box.clientWidth||600,H=box.clientHeight||200;
  const active=cmpState.tickers
    .map((t,i)=>t?{ticker:t,color:CMP_COLORS[i]}:null)
    .filter(Boolean);
  const leg=document.getElementById("cmpNavLeg");
  if(!active.length){
    box.querySelectorAll("svg").forEach(s=>s.remove());
    box.querySelector(".cmp-empty-msg")?.remove();
    const msg=document.createElement("div");
    msg.className="cmp-empty-msg";msg.style.cssText="height:100%;display:flex;align-items:center;justify-content:center;color:var(--ink-3);font-size:13px;";
    msg.textContent="티커를 선택하면 차트가 표시됩니다";
    box.appendChild(msg);
    if(leg)leg.innerHTML=`<span style="color:var(--ink-3)">종목을 선택하세요</span>`;
    return;
  }
  box.querySelectorAll(".cmp-empty-msg").forEach(e=>e.remove());
  const numDays=250;
  const series=active.map(a=>{
    const raw=cmpNavSeries(a.ticker,numDays);
    const base=raw[0];
    return {...a,pts:raw.map(v=>+(v/base*100).toFixed(2))};
  });
  let allVals=series.flatMap(s=>s.pts);
  const vMin=Math.min(...allVals)*0.99,vMax=Math.max(...allVals)*1.01;
  const maxLabel=vMax.toFixed(1);
  const m={t:10,r:14,b:28,l:Math.max(44,maxLabel.length*6+14)};
  const iW=W-m.l-m.r,iH=H-m.t-m.b;
  const xScl=i=>m.l+i/numDays*iW;
  const yScl=v=>m.t+iH-(v-vMin)/(vMax-vMin)*iH;
  const cs=getComputedStyle(document.documentElement);
  const gridColor=cs.getPropertyValue("--grid").trim();
  const ink3=cs.getPropertyValue("--ink-3").trim();
  let grid="";
  for(let i=0;i<=4;i++){
    const v=vMin+(vMax-vMin)*i/4,y=yScl(v);
    grid+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${gridColor}" stroke-width="1"/>
    <text x="${m.l-5}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="${ink3}" font-family="Manrope">${v.toFixed(1)}</text>`;
  }
  let paths="";
  series.forEach(s=>{
    const d=s.pts.map((v,i)=>`${i===0?"M":"L"}${xScl(i).toFixed(1)},${yScl(v).toFixed(1)}`).join(" ");
    paths+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`;
  });
  let xlabels="";
  [0,50,100,150,200,250].forEach(i=>{
    xlabels+=`<text x="${xScl(i).toFixed(1)}" y="${H-m.b+14}" text-anchor="middle" font-size="10" fill="${ink3}" font-family="Manrope">-${numDays-i}d</text>`;
  });
  box.querySelectorAll("svg").forEach(s=>s.remove());
  const ns="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox",`0 0 ${W} ${H}`);svg.setAttribute("width","100%");svg.setAttribute("height","100%");
  svg.innerHTML=`${grid}${paths}${xlabels}
    <text x="${m.l-5}" y="${m.t+9}" text-anchor="end" font-size="9.5" fill="${ink3}" font-family="Manrope">기준100</text>`;
  box.insertBefore(svg,box.firstChild);
  if(leg)leg.innerHTML=series.map(s=>{
    const last=s.pts[s.pts.length-1];
    const chg=last-100;
    return `<span><i style="background:${s.color}"></i>${s.ticker} <b class="num" style="color:${chg>=0?'var(--inflow)':'var(--outflow)'}">${chg>=0?"+":""}${chg.toFixed(1)}%</b></span>`;
  }).join("");
}

/* ---- comparison table ---- */
function renderCmpTable(){
  const tbl=document.getElementById("cmpTable");
  if(!tbl)return;
  const syms=cmpState.tickers;
  const metas=syms.map(s=>(typeof TICKER_META!=="undefined"&&s?TICKER_META[s]:null));
  const fmtD=v=>v!=null?"$"+v.toFixed(2):"—";
  const fmtSh=v=>v!=null?v.toLocaleString("en-US"):"—";
  const fmtNA=v=>v!=null?fmt(v)+" "+uShort():"—";
  const fmtFee=v=>{if(v==null)return "—";const s=(+v).toString();return(s.includes(".")?s:s)+"%";};
  const fmtDiv=v=>(v!=null&&v>0)?"$"+v.toFixed(2):"—";
  const fmtPct=v=>(v!=null&&v>0)?v.toFixed(2)+"%":"—";
  const ROWS=[
    {l:"종목명",    f:m=>m?`<span style="font-size:11.5px;color:var(--ink-2)">${m.name}</span>`:"—",cls:"cmp-td-text"},
    {l:"종가",      f:m=>m?`<span class="num">${fmtD(m.close)}</span>`:"—"},
    {l:"NAV",       f:m=>m?`<span class="num">${fmtD(m.nav)}</span>`:"—"},
    {l:"상장주식수",f:m=>m?`<span class="num">${fmtSh(m.shares)}</span>`:"—"},
    {l:"순자산",    f:m=>m?`<span class="num">${fmtNA(m.netasset)}</span>`:"—"},
    {l:"대분류",    f:m=>m?m.cat1:"—"},
    {l:"중분류",    f:m=>m?m.cat2:"—"},
    {l:"소분류",    f:m=>m?m.cat3:"—"},
    {l:"수수료",    f:m=>m?`<span class="num">${fmtFee(m.fee)}</span>`:"—"},
    {l:"12M 배당금",f:m=>m?`<span class="num">${fmtDiv(m.div12m)}</span>`:"—"},
    {l:"12M DV(%)", f:m=>m?`<span class="num">${fmtPct(m.divYield)}</span>`:"—"},
    {l:"배당주기",  f:m=>m?(m.divFreq||"—"):"—"},
    {l:"설정일",    f:m=>m?(m.inception||"—"):"—"},
    {l:"레버리지",  f:m=>m?`<span class="num">${m.leverage}x</span>`:"—"},
  ];
  const ths=syms.map((s,i)=>s
    ?`<th class="cmp-th-tick" style="--cc:${CMP_COLORS[i]}">${s}</th>`
    :`<th class="cmp-th-empty">—</th>`
  ).join("");
  const trs=ROWS.map((row,ri)=>{
    const tds=syms.map((_,ci)=>`<td class="${row.cls||''}">${row.f(metas[ci])}</td>`).join("");
    return `<tr class="${ri%2===0?'cmp-even':'cmp-odd'}"><td class="cmp-td-lbl">${row.l}</td>${tds}</tr>`;
  }).join("");
  tbl.innerHTML=`<thead><tr><th class="cmp-th-lbl">항목</th>${ths}</tr></thead><tbody>${trs}</tbody>`;
}

/* ---- master render ---- */
function renderCompare(){
  drawCmpFlowChart();
  drawCmpNavChart();
  renderCmpTable();
  const uc=document.getElementById("unitSelC");
  if(uc)uc.value=typeof unit!=="undefined"?unit:"million";
}

/* ---- search ---- */
function cmpSearch(q,limit){
  limit=limit||10;
  const all=cmpAllTickers();
  if(!q||!q.trim())return all.slice(0,limit);
  const qu=q.trim().toUpperCase();
  const exact=all.filter(t=>t.ticker.startsWith(qu));
  const rest=all.filter(t=>!t.ticker.startsWith(qu)&&(t.ticker.includes(qu)||t.name.toUpperCase().includes(qu)));
  return [...exact,...rest].slice(0,limit);
}

function cmpShowDrop(idx,q){
  const slot=document.querySelectorAll(".cmp-slot")[idx];
  if(!slot)return;
  const drop=slot.querySelector(".cmp-drop");
  const res=cmpSearch(q,10);
  if(!res.length){drop.style.display="none";return;}
  drop.innerHTML=res.map(r=>
    `<div class="cmp-drop-item" data-sym="${r.ticker}">
      <span class="cmp-drop-tick">${r.ticker}</span>
      <span class="cmp-drop-name">${r.name}</span>
    </div>`
  ).join("");
  drop.style.display="block";
  drop.querySelectorAll(".cmp-drop-item").forEach(item=>{
    item.addEventListener("mousedown",e=>{e.preventDefault();cmpSelect(idx,item.dataset.sym);});
  });
}

function cmpSelect(idx,sym){
  sym=sym?sym.toUpperCase():null;
  cmpState.tickers[idx]=sym;
  const slot=document.querySelectorAll(".cmp-slot")[idx];
  if(!slot)return;
  const inp=slot.querySelector(".cmp-inp");
  const clr=slot.querySelector(".cmp-clr");
  const drop=slot.querySelector(".cmp-drop");
  inp.value=sym||"";
  clr.style.display=sym?"":"none";
  drop.style.display="none";
  slot.classList.toggle("cmp-slot-on",!!sym);
  renderCompare();
}

/* ---- init (called once on first page visit) ---- */
function initComparePage(){
  if(_cmpInited){renderCompare();return;}
  _cmpInited=true;
  document.querySelectorAll(".cmp-slot").forEach((slot,idx)=>{
    const inp=slot.querySelector(".cmp-inp");
    const drop=slot.querySelector(".cmp-drop");
    inp.addEventListener("input",()=>cmpShowDrop(idx,inp.value));
    inp.addEventListener("focus",()=>cmpShowDrop(idx,inp.value));
    inp.addEventListener("blur",()=>setTimeout(()=>{drop.style.display="none";},180));
    inp.addEventListener("keydown",e=>{
      if(e.key==="Escape"){drop.style.display="none";inp.blur();}
      if(e.key==="Enter"){const first=drop.querySelector(".cmp-drop-item");if(first)cmpSelect(idx,first.dataset.sym);}
    });
    slot.querySelector(".cmp-clr").addEventListener("click",()=>cmpSelect(idx,null));
  });
  document.querySelectorAll("#cmpPeriodSeg button").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll("#cmpPeriodSeg button").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      cmpState.period=btn.dataset.p;
      drawCmpFlowChart();
    });
  });
  const uc=document.getElementById("unitSelC");
  if(uc)uc.addEventListener("change",e=>applyUnit(e.target.value));
  window.addEventListener("resize",()=>{
    if(document.getElementById("page-compare").classList.contains("on"))renderCompare();
  });
  renderCompare();
}
