/* compare.js – ETF 종목 비교 페이지 */
const CMP_COLORS=["#3a36c9","#15b8b0","#f59e0b","#8b5cf6"];
let _cmpInited=false;
const cmpState={tickers:[null,null,null,null],period:"flow_3m",priceMode:"mktprice"};

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

/* ---- helper: real cumul series for flow chart ---- */
function cmpFlowSeries(ticker,period){
  if(typeof DAILY_FLOW==="undefined"||!DAILY_FLOW[ticker])return null;
  const allRows=DAILY_FLOW[ticker];
  const PCOUNT={flow_1w:7,flow_1m:21,flow_3m:63,flow_6m:126,flow_ytd:null,flow_1y:252};
  let subset;
  if(period==="flow_ytd"){
    subset=allRows.filter(r=>r.date>="2026/01/01");
  } else {
    const count=PCOUNT[period]||63;
    subset=allRows.slice(Math.max(0,allRows.length-count));
  }
  if(!subset.length)return null;
  const baseC=subset[0].cumul-subset[0].daily;
  return subset.map(r=>r.cumul-baseC);
}

/* ---- flow line chart (cumulative, period-synced X-axis like overview) ---- */
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
    box.querySelectorAll(".cmp-empty-msg").forEach(e=>e.remove());
    const msg=document.createElement("div");
    msg.className="cmp-empty-msg";
    msg.style.cssText="height:100%;display:flex;align-items:center;justify-content:center;color:var(--ink-3);font-size:13px;";
    msg.textContent="티커를 선택하면 차트가 표시됩니다";
    box.appendChild(msg);
    if(leg)leg.innerHTML=`<span style="color:var(--ink-3)">종목을 선택하세요</span>`;
    return;
  }
  box.querySelectorAll(".cmp-empty-msg").forEach(e=>e.remove());
  const labels=periodLabels(cmpState.period);
  const firstReal=active.map(t=>cmpFlowSeries(t.ticker,cmpState.period)).find(Boolean);
  const n=firstReal?firstReal.length:labels.length;
  const datasets=active.map(t=>{
    const real=cmpFlowSeries(t.ticker,cmpState.period);
    return{ticker:t.ticker,color:t.color,
      data:real||buildSeries(t.flow?t.flow[cmpState.period]||0:0,n)};
  });
  let minV=0,maxV=0;
  datasets.forEach(d=>d.data.forEach(v=>{if(v>maxV)maxV=v;if(v<minV)minV=v;}));
  const hiScaled=uScale(maxV);
  const loScaled=uScale(minV);
  const rangeScaled=Math.max(Math.abs(hiScaled),Math.abs(loScaled))||1;
  const pow=Math.pow(10,Math.floor(Math.log10(rangeScaled)));
  const hi=maxV>0?Math.ceil(hiScaled/pow)*pow:0;
  const lo=minV<0?-(Math.ceil(-loScaled/pow)*pow):0;
  const yMax=(hi>0?hi:lo<0?0:1)*UNITS[unit].factor;
  const yMin=lo*UNITS[unit].factor;
  const yRange=(yMax-yMin)||1;
  const sampleTicks=[0,1,2,3,4].map(k=>yMin+yRange*k/4);
  const longestTick=Math.max(...sampleTicks.map(v=>axisFmt(v).length));
  const m={t:18,r:12,b:24,l:Math.max(40,longestTick*6+14)};
  const iW=W-m.l-m.r,iH=H-m.t-m.b;
  const x=i=>m.l+(i/(n-1))*iW;
  const y=v=>m.t+iH-((v-yMin)/yRange)*iH;
  const cs=getComputedStyle(document.documentElement);
  const gridColor=cs.getPropertyValue("--grid").trim();
  const ink3=cs.getPropertyValue("--ink-3").trim();
  let g="";
  for(let k=0;k<=4;k++){
    const val=yMin+yRange*k/4,yy=y(val);
    g+=`<line x1="${m.l}" y1="${yy.toFixed(1)}" x2="${m.l+iW}" y2="${yy.toFixed(1)}" stroke="${gridColor}" stroke-width="1"/>`;
    g+=`<text x="${m.l-9}" y="${(yy+4).toFixed(1)}" text-anchor="end" font-size="10" fill="${ink3}" font-family="Manrope">${axisFmt(val)}</text>`;
  }
  if(yMin<0&&yMax>0){
    const yz=y(0).toFixed(1);
    g+=`<line x1="${m.l}" y1="${yz}" x2="${m.l+iW}" y2="${yz}" stroke="${gridColor}" stroke-width="1.5" stroke-dasharray="4,2"/>`;
  }
  let xl="";
  const step=Math.ceil(n/6);
  for(let i=0;i<n;i+=step){
    xl+=`<text x="${x(i).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="10" fill="${ink3}" font-family="Manrope">${labels[Math.min(i,labels.length-1)]}</text>`;
  }
  let areas="",lines="",endDots="";
  const baseY=y(0).toFixed(1);
  datasets.forEach((d)=>{
    const pts=d.data.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    areas+=`<polygon points="${m.l},${baseY} ${pts.join(" ")} ${m.l+iW},${baseY}" fill="${d.color}" fill-opacity="0.09"/>`;
    lines+=`<polyline points="${pts.join(" ")}" fill="none" stroke="${d.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    endDots+=`<circle cx="${x(n-1).toFixed(1)}" cy="${y(d.data[n-1]).toFixed(1)}" r="3.5" fill="${d.color}" stroke="var(--surface)" stroke-width="2"/>`;
  });
  box.querySelectorAll("svg").forEach(s=>s.remove());
  const ns="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox",`0 0 ${W} ${H}`);svg.setAttribute("width","100%");svg.setAttribute("height","100%");
  svg.setAttribute("overflow","hidden");
  svg.innerHTML=`${g}${xl}${areas}${lines}${endDots}`;
  box.insertBefore(svg,box.firstChild);
  if(leg)leg.innerHTML=datasets.map(d=>{
    const last=d.data[d.data.length-1];
    return `<span><i style="background:${d.color}"></i>${d.ticker} <b class="num">${fmt(last)} ${uShort()}</b></span>`;
  }).join("");

  const tip=document.getElementById("cmpFlowTip");
  if(tip){
    svg.addEventListener("mousemove",e=>{
      const rect=box.getBoundingClientRect();
      const px=(e.clientX-rect.left)/rect.width*W;
      let i=Math.round((px-m.l)/iW*(n-1));i=Math.max(0,Math.min(n-1,i));
      tip.style.opacity="1";
      tip.style.left=(x(i)/W*rect.width)+"px";
      tip.style.top=(H-m.b-4)+"px";
      tip.innerHTML=`<div style="font-size:10px;color:var(--ink-3);margin-bottom:3px">${labels[Math.min(i,labels.length-1)]}</div>`+
        datasets.map(d=>`<div class="row"><i style="background:${d.color}"></i>${d.ticker} <b class="num" style="margin-left:auto;padding-left:8px">${fmt(d.data[i])} ${uShort()}</b></div>`).join("");
    });
    svg.addEventListener("mouseleave",()=>{tip.style.opacity="0";});
  }
}

/* ---- NAV normalised line chart (period-synced) ---- */
function drawCmpNavChart(){
  const box=document.getElementById("cmpNavBox");
  if(!box)return;
  const W=box.clientWidth||600,H=box.clientHeight||200;
  const active=cmpState.tickers
    .map((t,i)=>t?{ticker:t,color:CMP_COLORS[i]}:null)
    .filter(Boolean);
  const leg=document.getElementById("cmpNavLeg");
  const sub=document.getElementById("cmpNavSub");
  if(sub)sub.innerHTML=`${PERIOD_LABEL[cmpState.period]||""} <span style="opacity:.6">· 기준 100</span>`;
  if(!active.length){
    box.querySelectorAll("svg").forEach(s=>s.remove());
    box.querySelectorAll(".cmp-empty-msg").forEach(e=>e.remove());
    const msg=document.createElement("div");
    msg.className="cmp-empty-msg";
    msg.style.cssText="height:100%;display:flex;align-items:center;justify-content:center;color:var(--ink-3);font-size:13px;";
    msg.textContent="티커를 선택하면 차트가 표시됩니다";
    box.appendChild(msg);
    if(leg)leg.innerHTML=`<span style="color:var(--ink-3)">종목을 선택하세요</span>`;
    return;
  }
  box.querySelectorAll(".cmp-empty-msg").forEach(e=>e.remove());
  const PDAYS={flow_1w:7,flow_1m:30,flow_3m:90,flow_6m:180,flow_ytd:182,flow_1y:252};
  const numPts=PDAYS[cmpState.period]||90;
  const xLabels=periodLabels(cmpState.period);
  const series=active.map(a=>{
    const raw=cmpNavSeries(a.ticker,numPts);
    const base=raw[0];
    return {...a,pts:raw.map(v=>+(v/base*100).toFixed(2))};
  });
  let allVals=series.flatMap(s=>s.pts);
  const vMin=Math.min(...allVals)*0.99,vMax=Math.max(...allVals)*1.01;
  const maxLabel=vMax.toFixed(1);
  const m={t:22,r:12,b:24,l:Math.max(40,maxLabel.length*6+14)};
  const iW=W-m.l-m.r,iH=H-m.t-m.b;
  const n=numPts+1;
  const xScl=i=>m.l+i/numPts*iW;
  const yScl=v=>m.t+iH-(v-vMin)/(vMax-vMin)*iH;
  const cs=getComputedStyle(document.documentElement);
  const gridColor=cs.getPropertyValue("--grid").trim();
  const ink3=cs.getPropertyValue("--ink-3").trim();
  let grid="";
  for(let k=0;k<=4;k++){
    const v=vMin+(vMax-vMin)*k/4,y=yScl(v);
    grid+=`<line x1="${m.l}" x2="${m.l+iW}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${gridColor}" stroke-width="1"/>
    <text x="${m.l-9}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="${ink3}" font-family="Manrope">${v.toFixed(1)}</text>`;
  }
  let defs="",areas="",paths="",endDots="";
  const baseY=m.t+iH;
  series.forEach((s,si)=>{
    const id=`cmpng${si}`;
    defs+=`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".15"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`;
    const pts=s.pts.map((v,i)=>`${xScl(i).toFixed(1)},${yScl(v).toFixed(1)}`);
    areas+=`<polygon points="${m.l},${baseY} ${pts.join(" ")} ${m.l+iW},${baseY}" fill="url(#${id})"/>`;
    paths+=`<polyline points="${pts.join(" ")}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    endDots+=`<circle cx="${xScl(numPts).toFixed(1)}" cy="${yScl(s.pts[numPts]).toFixed(1)}" r="3.5" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`;
  });
  let xl="";
  xLabels.forEach((lbl,li)=>{
    const i=Math.round(li/(xLabels.length-1)*numPts);
    xl+=`<text x="${xScl(i)}" y="${H-6}" text-anchor="middle" font-size="10" fill="${ink3}" font-family="Manrope">${lbl}</text>`;
  });
  box.querySelectorAll("svg").forEach(s=>s.remove());
  const ns="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox",`0 0 ${W} ${H}`);svg.setAttribute("width","100%");svg.setAttribute("height","100%");
  svg.innerHTML=`<defs>${defs}</defs>${grid}${xl}${areas}${paths}${endDots}
`;
  box.insertBefore(svg,box.firstChild);
  if(leg)leg.innerHTML=series.map(s=>{
    const chg=s.pts[s.pts.length-1]-100;
    return `<span><i style="background:${s.color}"></i>${s.ticker} <b class="num" style="color:${chg>=0?'var(--inflow)':'var(--outflow)'}">${chg>=0?"+":""}${chg.toFixed(1)}%</b></span>`;
  }).join("");

  const tip=document.getElementById("cmpNavTip");
  if(tip){
    svg.addEventListener("mousemove",e=>{
      const rect=box.getBoundingClientRect();
      const px=(e.clientX-rect.left)/rect.width*W;
      let i=Math.round((px-m.l)/iW*numPts);i=Math.max(0,Math.min(numPts,i));
      const li=Math.max(0,Math.min(xLabels.length-1,Math.round(i/numPts*(xLabels.length-1))));
      tip.style.opacity="1";
      tip.style.left=(xScl(i)/W*rect.width)+"px";
      tip.style.top=(H-m.b-4)+"px";
      tip.innerHTML=`<div style="font-size:10px;color:var(--ink-3);margin-bottom:3px">${xLabels[li]}</div>`+
        series.map(s=>`<div class="row"><i style="background:${s.color}"></i>${s.ticker} <b class="num" style="margin-left:auto;padding-left:8px">${s.pts[i].toFixed(2)}</b></div>`).join("");
    });
    svg.addEventListener("mouseleave",()=>{tip.style.opacity="0";});
  }
}

/* ---- comparison cards ---- */
function renderCmpTable(){
  const wrap=document.getElementById("cmpCards");
  if(!wrap)return;
  const active=cmpState.tickers
    .map((s,i)=>s?{sym:s,color:CMP_COLORS[i]}:null)
    .filter(Boolean);
  if(!active.length){
    wrap.innerHTML=`<div class="cmp-cards-empty">티커를 선택하면 종목 정보가 표시됩니다</div>`;
    return;
  }
  const PKEYS=["flow_1w","flow_1m","flow_3m","flow_6m","flow_ytd","flow_1y"];
  const PLBLS={flow_1w:"1W",flow_1m:"1M",flow_3m:"3M",flow_6m:"6M",flow_ytd:"YTD",flow_1y:"1Y"};
  const cards=active.map(({sym,color})=>{
    const meta=typeof TICKER_META!=="undefined"?TICKER_META[sym]:null;
    // latest price: DAILY_FLOW last row mktprice → nav → TICKER_META.nav
    const dfRows=(typeof DAILY_FLOW!=="undefined"&&DAILY_FLOW[sym])||null;
    const lastRow=dfRows?dfRows[dfRows.length-1]:null;
    const latestPrice=lastRow?(lastRow.mktprice??lastRow.nav??null):(meta?meta.nav:null);
    const latestDate=lastRow?lastRow.date:null;
    // flow aggregates: compute from DAILY_FLOW if available, else TICKER_DATA
    const flow=cmpFindFlow(sym);
    const flowVals=PKEYS.map(k=>{
      if(dfRows){
        const s=cmpFlowSeries(sym,k);
        if(s)return s[s.length-1];
      }
      return flow?(flow[k]||0):0;
    });
    const maxAbs=Math.max(...flowVals.map(Math.abs),1);
    const tags=meta?[meta.cat1,meta.cat2,meta.cat3].filter(Boolean):[];
    const tagsHtml=tags.map(t=>`<span class="cmp-card-tag">${t}</span>`).join("");
    const flowRows=PKEYS.map((k,i)=>{
      const v=flowVals[i];
      const halfPct=(Math.abs(v)/maxAbs*50).toFixed(1);
      const clr=v>=0?"var(--inflow)":"var(--outflow)";
      const barStyle=v>=0?`left:50%;width:${halfPct}%`:`right:50%;width:${halfPct}%`;
      return `<div class="cmp-card-flow-row">
        <span class="cmp-card-flow-lbl">${PLBLS[k]}</span>
        <div class="cmp-card-flow-track">
          <div class="cmp-card-flow-center"></div>
          <div class="cmp-card-flow-bar" style="${barStyle};background:${clr}"></div>
        </div>
        <span class="cmp-card-flow-val" style="color:${clr}">${fmt(v)}</span>
      </div>`;
    }).join("");
    const hasDev=meta&&meta.div12m>0;
    const divHtml=hasDev?`
      <div class="cmp-card-div">
        <span class="cmp-card-micro-lbl">배당</span>
        <span class="num">연 $${meta.div12m.toFixed(2)}</span>
        <span class="num" style="color:var(--inflow)">${meta.divYield.toFixed(2)}%</span>
        ${meta.divFreq?`<span class="cmp-card-tag">${meta.divFreq}</span>`:""}
      </div>`:"";
    return `<div class="cmp-card">
      <div class="cmp-card-topbar" style="background:${color}"></div>
      <div class="cmp-card-body">
        <div class="cmp-card-head">
          <span class="cmp-card-sym" style="color:${color}">${sym}</span>
          <div style="text-align:right">
            <div class="cmp-card-price num">${latestPrice!=null?"$"+latestPrice.toFixed(2):"—"}</div>
            ${latestDate?`<div style="font-size:10px;color:var(--ink-3);font-weight:400">${latestDate}</div>`:""}
          </div>
        </div>
        <div class="cmp-card-name">${meta?meta.name:""}</div>
        ${tagsHtml?`<div class="cmp-card-tags">${tagsHtml}</div>`:""}
        <div class="cmp-card-stats">
          <div><span class="cmp-card-micro-lbl">순자산</span><span class="cmp-card-stat-val num">${meta?fmt(meta.netasset)+" "+uShort():"—"}</span></div>
          <div><span class="cmp-card-micro-lbl">수수료</span><span class="cmp-card-stat-val num">${meta?meta.fee+"%":"—"}</span></div>
          <div><span class="cmp-card-micro-lbl">레버리지</span><span class="cmp-card-stat-val num">${meta?meta.leverage+"x":"—"}</span></div>
        </div>
        <div class="cmp-card-micro-lbl" style="margin-top:12px;margin-bottom:6px">자금유출입 <span style="font-weight:500;opacity:.7">${uShort()}</span></div>
        <div class="cmp-card-flows">${flowRows}</div>
        ${divHtml}
      </div>
    </div>`;
  }).join("");
  wrap.innerHTML=`<div class="cmp-cards-grid" style="--nc:${active.length}">${cards}</div>`;
}

/* ---- daily flow detail table ---- */
function cmpTradingDays(count){
  const days=[];
  const d=new Date(2026,6,9); // 2026-07-09 anchor
  while(days.length<count){
    if(d.getDay()!==0&&d.getDay()!==6)
      days.push(`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`);
    d.setDate(d.getDate()-1);
  }
  return days; // most-recent first
}

function cmpDailyRows(ticker,period){
  const PCOUNT={flow_1w:7,flow_1m:21,flow_3m:63,flow_6m:126,flow_ytd:null,flow_1y:252};
  if(typeof DAILY_FLOW!=="undefined"&&DAILY_FLOW[ticker]){
    const allRows=DAILY_FLOW[ticker]; // oldest-first
    let subset;
    if(period==="flow_ytd"){
      subset=allRows.filter(r=>r.date>="2026/01/01");
    } else {
      const count=PCOUNT[period]||63;
      subset=allRows.slice(Math.max(0,allRows.length-count));
    }
    if(!subset.length)subset=allRows;
    const baseC=subset[0].cumul-subset[0].daily;
    return subset.slice().reverse().map(r=>({
      date:r.date,
      nav:r.nav,
      mktprice:r.mktprice??null,
      daily:r.daily,
      cumul:r.cumul-baseC,
    }));
  }
  // fallback: synthetic
  const PDAYS={flow_1w:7,flow_1m:21,flow_3m:63,flow_6m:126,flow_ytd:126,flow_1y:252};
  const n=PDAYS[period]||63;
  const flow=cmpFindFlow(ticker);
  const totalFlow=flow?flow[period]||0:0;
  const cumArr=[];
  for(let k=0;k<n;k++){
    const base=totalFlow*(k/(n-1));
    const noise=totalFlow*0.04*Math.sin(k*1.3+(ticker.charCodeAt(0)%7));
    cumArr.push(Math.round(base+noise));
  }
  cumArr[n-1]=totalFlow;
  const navArr=cmpNavSeries(ticker,n-1);
  const dates=cmpTradingDays(n);
  return dates.map((date,i)=>{
    const cumVal=cumArr[n-1-i];
    const prevCum=i<n-1?cumArr[n-2-i]:0;
    return{date,nav:navArr[n-1-i],mktprice:null,daily:cumVal-prevCum,cumul:cumVal};
  });
}

function renderCmpDaily(){
  const wrap=document.getElementById("cmpDaily");
  if(!wrap)return;
  const active=cmpState.tickers
    .map((s,i)=>s?{sym:s,color:CMP_COLORS[i]}:null)
    .filter(Boolean);
  if(!active.length){wrap.innerHTML="";return;}
  const fmtFlow=v=>{
    const s=fmt(v);
    return v>0?`<span style="color:var(--inflow)">${s}</span>`:v<0?`<span style="color:var(--outflow)">${s}</span>`:`<span>${s}</span>`;
  };
  // one data array per ticker
  const allRows=active.map(t=>({...t,rows:cmpDailyRows(t.sym,cmpState.period)}));
  const numRows=allRows[0].rows.length;
  // header row: 일자 + per-ticker group
  const tickerThs=active.map(t=>
    `<th class="cmp-daily-th-group" colspan="3" style="--cc:${t.color}">${t.sym}</th>`
  ).join("");
  const pm=cmpState.priceMode;
  const priceLbl=pm==="nav"?"NAV":"시장가";
  const subThs=active.map(()=>
    `<th>${priceLbl}</th><th>당일</th><th>누적</th>`
  ).join("");
  let tbody="";
  for(let i=0;i<numRows;i++){
    const date=allRows[0].rows[i].date;
    const cells=allRows.map(t=>{
      const r=t.rows[i];
      const pv=pm==="nav"?r.nav:r.mktprice;
      return `<td class="num">${pv!=null?"$"+pv.toFixed(2):"—"}</td><td class="num">${fmtFlow(r.daily)}</td><td class="num">${fmtFlow(r.cumul)}</td>`;
    }).join("");
    tbody+=`<tr class="${i%2===0?"cmp-even":"cmp-odd"}"><td class="cmp-daily-date">${date}</td>${cells}</tr>`;
  }
  wrap.innerHTML=`
    <div class="cmp-daily-header">
      <span>일별 자금유출입 상세 <span style="color:var(--ink-3);font-weight:500;font-size:11px">단위 ${uShort()}</span></span>
      <div class="seg cmp-price-seg">
        <button data-pm="mktprice" class="${pm==="mktprice"?"on":""}">시장가</button>
        <button data-pm="nav" class="${pm==="nav"?"on":""}">NAV</button>
      </div>
    </div>
    <div class="cmp-daily-scroll">
      <table class="cmp-daily-table">
        <thead>
          <tr><th class="cmp-daily-th-lbl" rowspan="2">일자</th>${tickerThs}</tr>
          <tr>${subThs}</tr>
        </thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>`;
  requestAnimationFrame(()=>{
    const tbl=wrap.querySelector(".cmp-daily-table");
    if(tbl){
      const row1=tbl.querySelector("thead tr:first-child");
      if(row1){
        const h=Math.ceil(row1.getBoundingClientRect().height);
        tbl.querySelectorAll("thead tr:last-child th").forEach(th=>{th.style.top=h+"px";});
      }
    }
    wrap.querySelectorAll("[data-pm]").forEach(btn=>{
      btn.addEventListener("click",()=>{
        cmpState.priceMode=btn.dataset.pm;
        renderCmpDaily();
      });
    });
  });
}

/* ---- excel export ---- */
const CMP_XLSX_ICON=`<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M3 9h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 9v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 3v12m0 0l-3.5-3.5M12 15l3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Excel 다운로드`;

function cmpHexToArgb(hex){return "FF"+hex.replace("#","").toUpperCase();}

function cmpAddChartSection(ws,wb,title,boxId,active){
  ws.addRow([]);
  const titleRow=ws.addRow([title]);
  titleRow.font={bold:true,size:12};
  active.forEach(t=>{
    const r=ws.addRow(["",t.ticker||t.sym]);
    r.getCell(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:cmpHexToArgb(t.color)}};
    r.getCell(2).font={bold:true};
  });
  const box=document.getElementById(boxId);
  const svgEl=box?box.querySelector("svg"):null;
  if(!svgEl)return;
  return svgToPng(svgEl,boxId).then(base64=>{
    if(!base64)return;
    const imgId=wb.addImage({base64,extension:"png"});
    const w=box.clientWidth||600,h=box.clientHeight||200;
    ws.addImage(imgId,{tl:{col:0,row:ws.rowCount},ext:{width:w,height:h}});
    const imgRows=Math.ceil(h/20)+1;
    for(let i=0;i<imgRows;i++)ws.addRow([]);
  });
}

function cmpBuildDailyTable(ws,title,active,period,priceKey){
  const titleRow=ws.addRow([title]);
  titleRow.font={bold:true,size:12};
  const allRows=active.map(t=>({...t,rows:cmpDailyRows(t.ticker,period)}));
  const numRows=allRows.length?allRows[0].rows.length:0;
  const priceLbl=priceKey==="nav"?"NAV":"시장가";
  const header=["일자",...active.flatMap(t=>[`${t.ticker} ${priceLbl}`,`${t.ticker} 당일 (${uShort()})`,`${t.ticker} 누적 (${uShort()})`])];
  const headerRow=ws.addRow(header);
  headerRow.font={bold:true};
  for(let i=0;i<numRows;i++){
    const date=allRows[0].rows[i].date;
    const row=[date];
    allRows.forEach(t=>{
      const r=t.rows[i];
      const pv=priceKey==="nav"?r.nav:r.mktprice;
      row.push(pv!=null?+pv.toFixed(2):null,+uScale(r.daily).toFixed(2),+uScale(r.cumul).toFixed(2));
    });
    ws.addRow(row);
  }
  ws.addRow([]);
}

async function exportCompareExcel(){
  const btn=document.getElementById("xlsxBtnC");
  if(!btn)return;
  btn.disabled=true;btn.textContent="저장 중…";
  try{
    const active=cmpState.tickers
      .map((t,i)=>t?{ticker:t,color:CMP_COLORS[i]}:null)
      .filter(Boolean);
    if(!active.length)return;

    const wb=new ExcelJS.Workbook();

    const wsChart=wb.addWorksheet("차트");
    wsChart.columns=[{width:14},{width:14}];
    await cmpAddChartSection(wsChart,wb,"누적 자금유출입 추이","cmpFlowBox",active);
    await cmpAddChartSection(wsChart,wb,"NAV 추이","cmpNavBox",active);

    const wsDaily=wb.addWorksheet("일별상세");
    const colCount=1+active.length*3;
    wsDaily.columns=Array.from({length:colCount},(_,i)=>({width:i===0?12:14}));
    cmpBuildDailyTable(wsDaily,"일별 자금유출입 상세 (시장가 기준)",active,cmpState.period,"mktprice");
    cmpBuildDailyTable(wsDaily,"일별 자금유출입 상세 (NAV 기준)",active,cmpState.period,"nav");

    const buf=await wb.xlsx.writeBuffer();
    const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`ETF_종목비교_${active.map(t=>t.ticker).join("_")}.xlsx`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }finally{
    btn.disabled=false;btn.innerHTML=CMP_XLSX_ICON;
  }
}
const cmpXlsxBtn=document.getElementById("xlsxBtnC");
if(cmpXlsxBtn)cmpXlsxBtn.addEventListener("click",exportCompareExcel);

/* ---- master render ---- */
function renderCompare(){
  drawCmpFlowChart();
  drawCmpNavChart();
  renderCmpTable();
  renderCmpDaily();
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
      renderCompare();
    });
  });
  const uc=document.getElementById("unitSelC");
  if(uc)uc.addEventListener("change",e=>applyUnit(e.target.value));
  window.addEventListener("resize",()=>{
    if(document.getElementById("page-compare").classList.contains("on"))renderCompare();
  });
  // default tickers
  ["SPY","QQQ","AGG","GLD"].forEach((sym,i)=>cmpSelect(i,sym));
  renderCompare();
}
