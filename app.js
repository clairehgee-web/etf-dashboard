let detailAxis="asset";        // "asset" | "region"
let detailCat="주식";
let detailRegion="주요 지역";
let openGroups={};   // groupName -> bool
let selectedLeaf=null;
let lastAssetCat=null;   // for unit re-render
let lastLeaf=null;       // {leaf, group}

let state={country:"US",view:"flow",period:"flow_3m",enabled:{}};
const PERIOD_SCALE={flow_1w:60,flow_1m:14,flow_3m:8,flow_6m:5,flow_ytd:6,flow_1y:2.2};
const PERIOD_LABEL={flow_1w:"최근 1주",flow_1m:"최근 1개월",flow_3m:"최근 3개월",flow_6m:"최근 6개월",flow_ytd:"연초 이후",flow_1y:"최근 1년"};
const PERIOD_SHORT={flow_1w:"1W",flow_1m:"1M",flow_3m:"3M",flow_6m:"6M",flow_ytd:"YTD",flow_1y:"1Y"};
const C_LABEL={US:"미국",HK:"홍콩",JP:"일본"};

/* ---- currency unit system (base data is in THOUSANDS of USD) ---- */
/* factor = how many base-thousands per 1 display-unit */
const UNITS={
  trillion:{label:"조 달러",short:"조",factor:1000000000},
  billion :{label:"십억 달러",short:"십억",factor:1000000},
  million :{label:"백만 달러",short:"백만",factor:1000},
  thousand:{label:"천 달러",short:"천",factor:1},
};
let unit="million";
const uScale=v=>v/UNITS[unit].factor;
const uLabel=()=>UNITS[unit].label;
const uShort=()=>UNITS[unit].short;
/* KPI 전용 고정 단위 (국가별, unit selector 무관) */
const KPI_UNIT={US:"trillion",HK:"billion",JP:"billion"};
const kpiScale=v=>v/UNITS[KPI_UNIT[state.country]||"trillion"].factor;
const kpiShort=()=>UNITS[KPI_UNIT[state.country]||"trillion"].label;
const kpiFmt=n=>{const v=kpiScale(n),a=Math.abs(v);let d=0;if(a<1&&a>0)d=2;else if(a<10)d=2;else if(a<100)d=1;return v.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});};
/* axis tick formatter: scale + decimals that keep ticks distinct */
const axisFmt=v=>{
  const s=uScale(v),a=Math.abs(s);
  let d=0;
  if(a>0&&a<1)d=2; else if(a<10)d=1; else d=0;
  return s.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
};

/* canonical asset-category order shown in overview regardless of country */
const ASSET_ORDER=["주식","채권","자산배분","상품","부동산","대체투자/기타","크립토"];
const ZERO_ROW={netasset:0,flow_1w:0,flow_1m:0,flow_3m:0,flow_6m:0,flow_ytd:0,flow_1y:0};
const curRows=()=>{
  const arr=data[state.country]||[];
  const byCat={};arr.forEach(r=>byCat[r.category]=r);
  // include any categories present in data but not in canonical list, appended at end
  const extras=arr.map(r=>r.category).filter(c=>!ASSET_ORDER.includes(c));
  return [...ASSET_ORDER,...extras].map(c=>byCat[c]||{category:c,...ZERO_ROW});
};
/* fmt: scale to current unit, choose decimals by magnitude */
const fmt=n=>{
  const v=uScale(n);
  const a=Math.abs(v);
  let d=0;
  if(a<1&&a>0)d=2; else if(a<10)d=2; else if(a<100)d=1; else d=0;
  return v.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
};
/* compact: same scaling, used for KPI/cat headline */
const fmtCompact=n=>fmt(n);
function ensureEnabled(rows){rows.forEach(r=>{if(!(r.category in state.enabled))state.enabled[r.category]=(r.category==="주식"||r.category==="채권");});}

/* ---------- KPI cards ---------- */
function renderKpis(){
  const rows=curRows();
  const totalAsset=rows.reduce((a,r)=>a+r.netasset,0);
  const netIn=rows.reduce((a,r)=>a+r[state.period],0);
  const inflows=rows.filter(r=>r[state.period]>0).reduce((a,r)=>a+r[state.period],0);
  const outflows=rows.filter(r=>r[state.period]<0).reduce((a,r)=>a+r[state.period],0);
  const top=[...rows].sort((a,b)=>b[state.period]-a[state.period])[0];
  // 자금흐름 집중도: 최다 유입 자산군이 전체 유입에서 차지하는 비중
  const topInflow=Math.max(0,top?top[state.period]:0);
  const concentration=inflows>0?(topInflow/inflows*100):0;
  const assetAccent=getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  const inAccent=getComputedStyle(document.documentElement).getPropertyValue("--inflow").trim();
  const outAccent=getComputedStyle(document.documentElement).getPropertyValue("--outflow").trim();

  const cards=[
    {label:"총 순자산",icon:'<path d="M3 13h4l3 6 4-14 3 8h4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
     value:kpiFmt(totalAsset),suf:kpiShort(),delta:"전월 대비 +1.8%",dir:"up",sub:"",
     spark:miniSpark(buildSeries(totalAsset).slice(-12),assetAccent)},
    {label:`순유입 (${PERIOD_SHORT[state.period]})`,icon:'<path d="M12 19V5m0 0l-6 6m6-6l6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
     value:kpiFmt(netIn),suf:kpiShort(),delta:netIn>=0?"순유입 우위":"순유출 우위",dir:netIn>=0?"up":"down",sub:"",
     spark:miniSpark(buildSeries(Math.abs(netIn)).slice(-12),netIn>=0?inAccent:outAccent)},
    {label:`자금흐름 집중도 (${PERIOD_SHORT[state.period]})`,icon:'<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 12V5a7 7 0 016 3.5z" fill="currentColor"/>',
     value:concentration.toFixed(1),suf:"%",delta:top?`${top.category} 비중`:"-",dir:"up",sub:"전체 유입 중",subFirst:true,
     spark:miniSpark(buildSeries(concentration).slice(-12),assetAccent)},
    {label:`최다 유입 자산 (${PERIOD_SHORT[state.period]})`,icon:'<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M5 21c0-4 3-6 7-6s7 2 7 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
     value:top?top.category:"-",suf:"",delta:top?`+${kpiFmt(top[state.period])} ${kpiShort()}`:"",dir:"up",sub:"",
     spark:top?miniSpark(buildSeries(top[state.period]).slice(-12),COLORS[top.category]||assetAccent):""},
  ];

  document.getElementById("kpis").innerHTML=cards.map(c=>`
    <div class="kpi reveal">
      <div class="label"><span class="ic">${svg(c.icon)}</span>${c.label}</div>
      <div class="value num">${c.value}${c.suf?`<span class="suf">${c.suf}</span>`:""}</div>
      <div class="delta ${c.dir}">${arrow(c.dir)}${c.subFirst&&c.sub?`<span class="sub">${c.sub}</span>`:""}<span>${c.delta}</span>${!c.subFirst&&c.sub?`<span class="sub">${c.sub}</span>`:""}</div>
      ${c.spark}
    </div>`).join("");
}
function svg(inner){return `<svg viewBox="0 0 24 24" fill="none">${inner}</svg>`;}
function arrow(dir){
  return dir==="up"
    ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M7 14l5-5 5 5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

/* ---------- table ---------- */
function renderTable(){
  const rows=curRows();ensureEnabled(rows);
  const total=rows.reduce((a,r)=>a+r.netasset,0);
  const maxAsset=Math.max(...rows.map(r=>r.netasset));
  const periods=["flow_1w","flow_1m","flow_3m","flow_6m","flow_ytd","flow_1y"];
  const tbody=document.getElementById("tbody");tbody.innerHTML="";

  rows.forEach(r=>{
    const on=state.enabled[r.category];
    const pct=total?(r.netasset/total*100):0;
    const tr=document.createElement("tr");if(!on)tr.className="off";
    tr.dataset.cat=r.category;
    let cells=`
      <td class="chk"><span class="check ${on?"on":""}"><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span></td>
      <td class="cat"><span class="dot-cat cat-link"><i style="background:${COLORS[r.category]||"#888"}"></i>${r.category}<svg class="cat-arrow" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></td>
      <td><div class="asset-inner"><span class="netbar"><i style="width:${(r.netasset/maxAsset*100).toFixed(0)}%"></i></span><span class="asset-val"><span class="num">${fmt(r.netasset)}</span> <span class="pct" style="color:var(--ink-3)">${pct.toFixed(1)}%</span></span></div></td>`;
    periods.forEach(p=>{
      if(state.view==="return"){
        const v=pseudoReturn(r.category,p);
        cells+=`<td class="num ${v>=0?"flow-pos":"flow-neg"}">${v>=0?"+":""}${v.toFixed(2)}%</td>`;
      }else{
        const v=r[p];
        cells+=`<td class="num ${v>=0?"flow-pos":"flow-neg"}">${v>=0?"+":""}${fmt(v)}</td>`;
      }
    });
    tr.innerHTML=cells;tbody.appendChild(tr);
  });

  const tr=document.createElement("tr");tr.className="total-row";
  let t=`<td class="chk"></td><td class="cat">합계</td><td><div class="asset-inner"><span class="netbar" style="visibility:hidden"></span><span class="asset-val"><span class="num">${fmt(total)}</span> <span class="pct" style="color:var(--ink-3)">100%</span></span></div></td>`;
  periods.forEach(p=>{
    if(state.view==="return"){
      // asset-weighted average return
      const wsum=rows.reduce((a,r)=>a+pseudoReturn(r.category,p)*r.netasset,0);
      const v=total?wsum/total:0;
      t+=`<td class="num ${v>=0?"flow-pos":"flow-neg"}">${v>=0?"+":""}${v.toFixed(2)}%</td>`;
    }else{
      const s=rows.reduce((a,r)=>a+r[p],0);
      t+=`<td class="num ${s>=0?"flow-pos":"flow-neg"}">${s>=0?"+":""}${fmt(s)}</td>`;
    }
  });
  tr.innerHTML=t;tbody.appendChild(tr);

  tbody.querySelectorAll("tr[data-cat]").forEach(row=>{
    const c=row.dataset.cat;
    // checkbox cell → toggle chart series
    row.querySelector(".chk").addEventListener("click",e=>{
      e.stopPropagation();
      state.enabled[c]=!state.enabled[c];
      renderTable();renderChart();renderKpis();
    });
    // category name → open asset panel
    row.querySelector(".cat-link").addEventListener("click",e=>{
      e.stopPropagation();
      openAssetPanel(c);
    });
  });

  // header "select all" checkbox state
  const checkAll=document.getElementById("checkAll");
  if(checkAll){
    const total=rows.length;
    const onCount=rows.filter(r=>state.enabled[r.category]).length;
    checkAll.classList.toggle("on",onCount===total&&total>0);
    checkAll.classList.toggle("indet",onCount>0&&onCount<total);
    // dash icon for indeterminate, check icon otherwise
    checkAll.querySelector("svg path").setAttribute("d",
      (onCount>0&&onCount<total)?"M6 12h12":"M5 13l4 4L19 7");
  }

  document.getElementById("rowNote").textContent="자산명을 클릭하면 자산별 상세 내용을 확인 할 수 있습니다.";
}

/* ---------- chart (SVG area + line) ---------- */
let chartData=null;
function renderChart(){
  const rows=curRows().filter(r=>state.enabled[r.category]);
  const isReturn=state.view==="return";
  if(isReturn){
    // grouped bar: per-category return across periods (1W..1Y)
    const pLabels=["1W","1M","3M","6M","YTD","1Y"];
    const datasets=rows.map(r=>({
      name:r.category,color:COLORS[r.category]||"#888",
      data:PERIODS.map(p=>pseudoReturn(r.category,p))
    }));
    chartData={datasets,labels:pLabels,isReturn:true,bar:true};
    document.getElementById("chartSub").textContent=`선택 자산군 · 기간별 수익률`;
    document.getElementById("legend").innerHTML=datasets.map(d=>{
      const v=d.data[PERIODS.indexOf(state.period)];
      return `<span><i style="background:${d.color}"></i>${d.name} <b class="num">${v>=0?"+":""}${v.toFixed(2)}%</b></span>`;
    }).join("")||`<span style="color:var(--ink-3)">표시할 자산군을 선택하세요</span>`;
    drawBarChart();
    return;
  }
  // real daily data branch (US flow view only)
  if(state.country==="US" && typeof CUMUL_US!=="undefined"){
    const latest=new Date(CUMUL_US[CUMUL_US.length-1].date);
    let cutDate;
    if(state.period==="flow_ytd"){
      cutDate=new Date(latest.getFullYear(),0,1);
    }else{
      const days={flow_1w:7,flow_1m:30,flow_3m:91,flow_6m:182,flow_1y:365}[state.period]||365;
      cutDate=new Date(latest.getTime()-days*86400000);
    }
    const filtered=CUMUL_US.filter(d=>new Date(d.date)>=cutDate);
    const rlabels=filtered.map(d=>{const dt=new Date(d.date);return `${dt.getMonth()+1}/${dt.getDate()}`;});
    const rdatasets=rows.map(r=>({
      name:r.category,color:COLORS[r.category]||"#888",
      data:filtered.map(d=>d[r.category]||0)
    }));
    chartData={datasets:rdatasets,labels:rlabels,isReturn:false,bar:false};
    document.getElementById("chartSub").textContent=`미국 자산군 · ${PERIOD_LABEL[state.period]} 기준 · 누적 자금유출입`;
    document.getElementById("legend").innerHTML=rdatasets.map(d=>{
      const last=d.data[d.data.length-1];
      return `<span><i style="background:${d.color}"></i>${d.name} <b class="num">${fmt(last)} ${uShort()}</b></span>`;
    }).join("")||`<span style="color:var(--ink-3)">표시할 자산군을 선택하세요</span>`;
    drawChart();
    return;
  }
  const labels=periodLabels(state.period);
  const n=labels.length;
  const scale=PERIOD_SCALE[state.period]||8;
  const datasets=rows.map(r=>({
    name:r.category,color:COLORS[r.category]||"#888",
    data:buildSeries(Math.max(0,r[state.period]*scale),n)
  }));
  chartData={datasets,labels,isReturn:false,bar:false};
  document.getElementById("chartSub").textContent=`선택 자산군 · ${PERIOD_LABEL[state.period]} 기준 · 누적 자금흐름`;
  document.getElementById("legend").innerHTML=datasets.map(d=>{
    const last=d.data[d.data.length-1];
    return `<span><i style="background:${d.color}"></i>${d.name} <b class="num">${fmt(last)} ${uShort()}</b></span>`;
  }).join("")||`<span style="color:var(--ink-3)">표시할 자산군을 선택하세요</span>`;
  drawChart();
}

/* ---------- theme ---------- */
document.getElementById("themeBtn").addEventListener("click",()=>{
  const root=document.documentElement;
  const next=root.getAttribute("data-theme")==="dark"?"light":"dark";
  root.setAttribute("data-theme",next);
  document.getElementById("sun").outerHTML = next==="dark"
    ? '<svg id="sun" viewBox="0 0 24 24" fill="none"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" fill="currentColor"/></svg>'
    : '<svg id="sun" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></g></svg>';
  renderKpis();renderChart();
});

/* ---------- controls (shared across overview & detail) ---------- */
function syncSegs(){
  // view
  document.querySelectorAll("#viewSeg button,#viewSegD button").forEach(x=>x.classList.toggle("on",x.dataset.view===state.view));
  // period
  document.querySelectorAll("#periodSeg button,#periodSegD button").forEach(x=>x.classList.toggle("on",x.dataset.p===state.period));
  // unit selects
  document.getElementById("unitSel").value=unit;
  document.getElementById("unitSelD").value=unit;
}
function rerenderActive(){
  const detailOn=document.getElementById("page-detail").classList.contains("on");
  if(detailOn){renderCatTabs();renderTree();}
  else{renderKpis();renderTable();renderChart();}
}
function applyUnit(u){
  unit=u;syncSegs();rerenderActive();
  if(document.getElementById("apanel").classList.contains("on")&&lastAssetCat)openAssetPanel(lastAssetCat);
  if(document.getElementById("panel").classList.contains("on")&&lastLeaf)openPanel(lastLeaf.leaf,lastLeaf.group);
  document.getElementById("unitNote").textContent="단위 "+uLabel();
  document.getElementById("treeUnitNote").textContent="단위 "+uLabel();
}
function applyView(v){state.view=v;syncSegs();rerenderActive();}
function applyPeriod(p){state.period=p;syncSegs();rerenderActive();}

document.getElementById("country").addEventListener("change",e=>{state.country=e.target.value;renderAll();});
document.getElementById("checkAll").addEventListener("click",()=>{
  const rows=curRows();
  const allOn=rows.every(r=>state.enabled[r.category]);
  rows.forEach(r=>state.enabled[r.category]=!allOn);
  renderTable();renderChart();renderKpis();
});
document.getElementById("unitSel").addEventListener("change",e=>applyUnit(e.target.value));
document.getElementById("unitSelD").addEventListener("change",e=>applyUnit(e.target.value));
document.querySelectorAll("#viewSeg button,#viewSegD button").forEach(b=>b.addEventListener("click",()=>applyView(b.dataset.view)));
document.querySelectorAll("#periodSeg button,#periodSegD button").forEach(b=>b.addEventListener("click",()=>applyPeriod(b.dataset.p)));

/* analysis axis toggle (자산별 / 지역·국가별) */
document.querySelectorAll("#axisSeg button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll("#axisSeg button").forEach(x=>x.classList.remove("on"));b.classList.add("on");
  detailAxis=b.dataset.axis;openGroups={};selectedLeaf=null;
  document.getElementById("treeHeadCol").textContent=detailAxis==="region"?"지역 · 국가":"분류 · 세부항목";
  renderCatTabs();renderTree();
}));
window.addEventListener("resize",()=>{if(chartData&&chartData.bar)drawBarChart();else drawChart();});

/* ---------- Excel 내보내기 ---------- */
function svgToPng(svgEl){
  return new Promise(resolve=>{
    const box=document.getElementById("chartBox");
    const W=box.clientWidth||980, H=box.clientHeight||320;
    const bg=getComputedStyle(document.documentElement).getPropertyValue("--surface").trim()||"#ffffff";
    const clone=svgEl.cloneNode(true);
    clone.setAttribute("width",W);clone.setAttribute("height",H);
    if(!clone.getAttribute("xmlns"))clone.setAttribute("xmlns","http://www.w3.org/2000/svg");
    // inline background
    const bgRect=document.createElementNS("http://www.w3.org/2000/svg","rect");
    bgRect.setAttribute("width",W);bgRect.setAttribute("height",H);bgRect.setAttribute("fill",bg);
    clone.insertBefore(bgRect,clone.firstChild);
    // replace external fonts to avoid canvas taint
    clone.querySelectorAll("[font-family]").forEach(el=>el.setAttribute("font-family","Arial,sans-serif"));
    const svgStr=new XMLSerializer().serializeToString(clone);
    const blob=new Blob([svgStr],{type:"image/svg+xml;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const img=new Image();
    const scale=2,canvas=document.createElement("canvas");
    canvas.width=W*scale;canvas.height=H*scale;
    const ctx=canvas.getContext("2d");ctx.scale(scale,scale);
    img.onload=()=>{ctx.drawImage(img,0,0,W,H);URL.revokeObjectURL(url);resolve(canvas.toDataURL("image/png").split(",")[1]);};
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(null);};
    img.src=url;
  });
}

async function exportExcel(){
  const btn=document.getElementById("xlsxBtn");
  btn.disabled=true;btn.textContent="저장 중…";
  try{
    const rows=curRows();
    const total=rows.reduce((a,r)=>a+r.netasset,0);
    const periods=["flow_1w","flow_1m","flow_3m","flow_6m","flow_ytd","flow_1y"];
    const pLabels=["1W","1M","3M","6M","YTD","1Y"];
    const su=uShort();
    const isReturn=state.view==="return";
    const country=C_LABEL[state.country]||state.country;

    // chart image
    const svgEl=document.getElementById("chartBox").querySelector("svg");
    const chartBase64=svgEl?await svgToPng(svgEl):null;

    const wb=new ExcelJS.Workbook();
    const ws=wb.addWorksheet(`${country} 개요`);
    ws.columns=[
      {header:"자산군",width:14},{header:`순자산 (${su})`,width:14},{header:"비중 (%)",width:10},
      ...pLabels.map(l=>({header:isReturn?`${l} 수익률 (%)`: `${l} (${su})`,width:12}))
    ];

    rows.forEach(r=>{
      const pct=total?r.netasset/total*100:0;
      const row=[r.category,+uScale(r.netasset).toFixed(2),+pct.toFixed(1)];
      periods.forEach((p,i)=>row.push(isReturn?+pseudoReturn(r.category,p).toFixed(2):+uScale(r[p]).toFixed(2)));
      ws.addRow(row);
    });
    if(!isReturn){
      const trow=["합계",+uScale(total).toFixed(2),100];
      periods.forEach(p=>trow.push(+uScale(rows.reduce((a,r)=>a+r[p],0)).toFixed(2)));
      ws.addRow(trow);
    }

    // chart image below table
    if(chartBase64){
      ws.addRow([]);ws.addRow(["▼ 누적 자금흐름 차트"]);
      const imgRow=ws.rowCount+1;
      const imgId=wb.addImage({base64:chartBase64,extension:"png"});
      const chartW=document.getElementById("chartBox").clientWidth||980;
      const chartH=document.getElementById("chartBox").clientHeight||320;
      ws.addImage(imgId,{tl:{col:0,row:imgRow-1},ext:{width:chartW,height:chartH}});
      for(let i=0;i<18;i++)ws.addRow([]);
    }

    const buf=await wb.xlsx.writeBuffer();
    const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`ETF_자금유출입_${country}.xlsx`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }finally{
    btn.disabled=false;
    btn.innerHTML=`<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M3 9h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 9v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 3v12m0 0l-3.5-3.5M12 15l3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Excel 다운로드`;
  }
}
document.getElementById("xlsxBtn").addEventListener("click",exportExcel);

/* ========== DETAIL PAGE ========== */
function sumFlows(children,key){return children.reduce((a,c)=>a+c[key],0);}
const PERIODS=["flow_1w","flow_1m","flow_3m","flow_6m","flow_ytd","flow_1y"];

/* ---------- Excel 내보내기 (세부 분석) ---------- */
const XLSX_BTN_ICON=`<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M3 9h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 9v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 3v12m0 0l-3.5-3.5M12 15l3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Excel 다운로드`;
async function exportDetailExcel(){
  const btn=document.getElementById("xlsxBtnD");
  btn.disabled=true;btn.textContent="저장 중…";
  try{
    const h=curNode();
    const activeKey=curCatKey();
    const su=uShort();
    const isReturn=state.view==="return";
    const periods=["flow_1w","flow_1m","flow_3m","flow_6m","flow_ytd","flow_1y"];
    const pLabels=["1W","1M","3M","6M","YTD","1Y"];
    const total=allLeaves(h).reduce((a,c)=>a+c.netasset,0);
    const nameCol=detailAxis==="region"?"지역":"분류";

    const wb=new ExcelJS.Workbook();
    const ws=wb.addWorksheet(`${activeKey} 세부`);
    ws.columns=[
      {header:nameCol,width:18},{header:"세부항목",width:20},
      {header:`순자산 (${su})`,width:14},{header:"비중 (%)",width:10},
      ...pLabels.map(l=>({header:isReturn?`${l} 수익률 (%)`:`${l} (${su})`,width:12}))
    ];

    const addLeafRow=(groupName,leaf)=>{
      const pct=total?leaf.netasset/total*100:0;
      const row=[groupName,leaf.name,+uScale(leaf.netasset).toFixed(2),+pct.toFixed(1)];
      periods.forEach(p=>row.push(isReturn?+pseudoReturn(leaf.name,p).toFixed(2):+uScale(leaf[p]).toFixed(2)));
      ws.addRow(row);
    };

    if(h.flat){
      h.leaves.forEach(leaf=>addLeafRow(activeKey,leaf));
    }else{
      h.groups.forEach(g=>{
        const agg={name:g.name,netasset:g.children.reduce((a,c)=>a+c.netasset,0)};
        periods.forEach(p=>agg[p]=sumFlows(g.children,p));
        const gpct=total?agg.netasset/total*100:0;
        const grow=[g.name,"(소계)",+uScale(agg.netasset).toFixed(2),+gpct.toFixed(1)];
        periods.forEach(p=>grow.push(isReturn?"":+uScale(agg[p]).toFixed(2)));
        const gr=ws.addRow(grow);gr.font={bold:true};
        g.children.forEach(leaf=>addLeafRow(g.name,leaf));
      });
    }

    const buf=await wb.xlsx.writeBuffer();
    const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`ETF_세부분석_${activeKey}.xlsx`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }finally{
    btn.disabled=false;btn.innerHTML=XLSX_BTN_ICON;
  }
}
document.getElementById("xlsxBtnD").addEventListener("click",exportDetailExcel);
/* return all leaf items whether category is grouped or flat */
function allLeaves(h){return h.flat?h.leaves:h.groups.flatMap(g=>g.children);}
/* axis-aware accessors */
function curDataset(){return detailAxis==="region"?REGION:HIER;}
function curCats(){return detailAxis==="region"?REGION_CATS:DETAIL_CATS;}
function curCatKey(){return detailAxis==="region"?detailRegion:detailCat;}
function setCatKey(k){if(detailAxis==="region")detailRegion=k;else detailCat=k;}
function curNode(){return curDataset()[curCatKey()];}

/* page switch */
document.querySelectorAll("#viewSwitch button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll("#viewSwitch button").forEach(x=>x.classList.remove("on"));
  b.classList.add("on");
  const pg=b.dataset.page;
  document.getElementById("page-overview").classList.toggle("on",pg==="overview");
  document.getElementById("page-detail").classList.toggle("on",pg==="detail");
  if(pg==="detail"){renderCatTabs();renderTree();}
  if(pg==="overview"){if(chartData&&chartData.bar)drawBarChart();else drawChart();}
}));

function renderCatTabs(){
  const wrap=document.getElementById("cattabs");
  const ds=curDataset(),cats=curCats(),activeKey=curCatKey();
  const isReturn=state.view==="return";
  const pShort={flow_1w:"1W",flow_1m:"1M",flow_3m:"3M",flow_6m:"6M",flow_ytd:"YTD",flow_1y:"1Y"}[state.period];
  wrap.innerHTML=cats.map(cat=>{
    const h=ds[cat];
    const leaves=allLeaves(h);
    const asset=leaves.reduce((a,c)=>a+c.netasset,0);
    let lineVal,positive;
    if(isReturn){
      // asset-weighted period return across leaves
      const wsum=leaves.reduce((a,c)=>a+pseudoReturn(c.name,state.period)*c.netasset,0);
      const ret=asset?wsum/asset:0;
      positive=ret>=0;
      lineVal=`${positive?"+":""}${ret.toFixed(2)}% (${pShort})`;
    }else{
      const flow=leaves.reduce((a,c)=>a+c[state.period],0);
      positive=flow>=0;
      lineVal=`${positive?"+":""}${fmt(flow)} (${pShort})`;
    }
    return `<button class="cattab ${cat===activeKey?"on":""}" data-cat="${cat}">
      <div class="ct-name"><i style="background:${h.color}"></i>${cat}</div>
      <div class="ct-val num">${fmtCompact(asset)}<span style="font-size:11px;font-weight:600;opacity:.7"> ${uShort()}</span></div>
      <div class="ct-flow" style="color:${cat===activeKey?'':(positive?'var(--inflow)':'var(--outflow)')}">${lineVal}</div>
    </button>`;
  }).join("");
  wrap.querySelectorAll(".cattab").forEach(t=>t.addEventListener("click",()=>{
    setCatKey(t.dataset.cat);openGroups={};renderCatTabs();renderTree();
  }));
}

/* pseudo period return (%) derived deterministically from a seed */
function pseudoReturn(name,p){
  const idx=PERIODS.indexOf(p);
  let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))%997;
  const base=((h%140)-45)/10;          // -4.5 ~ +9.5 baseline
  const horizon=[0.25,0.6,1.3,2.1,1.8,3.0][idx]; // scale by period
  return +(base*horizon).toFixed(2);
}
function rowCells(obj){
  const total=allLeaves(curNode()).reduce((a,c)=>a+c.netasset,0);
  const pct=total?(obj.netasset/total*100):0;
  let c=`<td><div class="cellpad"><span class="num">${fmt(obj.netasset)}</span> <span style="color:var(--ink-3);font-weight:700">${pct.toFixed(1)}%</span></div></td>`;
  if(state.view==="return"){
    PERIODS.forEach(p=>{const v=pseudoReturn(obj.name,p);c+=`<td><div class="cellpad num ${v>=0?'flow-pos':'flow-neg'}">${v>=0?"+":""}${v.toFixed(2)}%</div></td>`;});
  }else{
    PERIODS.forEach(p=>{const v=obj[p];c+=`<td><div class="cellpad num ${v>=0?'flow-pos':'flow-neg'}">${v>=0?"+":""}${fmt(v)}</div></td>`;});
  }
  return c;
}

function renderTree(){
  const h=curNode();
  const tb=document.getElementById("treebody");tb.innerHTML="";
  const activeKey=curCatKey();

  // ----- flat categories: leaves directly, no group rows -----
  if(h.flat){
    h.leaves.forEach(leaf=>{
      const lr=document.createElement("tr");
      lr.className="trow lvl-leaf selectable flat"+(selectedLeaf===leaf.name?" sel":"");
      lr.innerHTML=`<td><div class="cellpad name">
          <span class="tdot" style="background:${h.color}"></span>${leaf.name}
          <svg class="leaf-arrow" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div></td>${rowCells(leaf)}`;
      lr.addEventListener("click",e=>{e.stopPropagation();openPanel(leaf,activeKey);});
      tb.appendChild(lr);
    });
    document.getElementById("treeNote").textContent=detailAxis==="region"?"지역·국가명을 클릭하면 상세 내용을 확인할 수 있습니다.":"세부항목을 클릭하면 항목별 상세 내용을 확인할 수 있습니다.";
    return;
  }

  // ----- grouped categories: 중분류 → 세부 -----
  let leafCount=0;
  h.groups.forEach(g=>{
    const agg={name:g.name,netasset:g.children.reduce((a,c)=>a+c.netasset,0)};
    PERIODS.forEach(p=>agg[p]=sumFlows(g.children,p));
    const open=openGroups[g.name]!==false; // default open
    leafCount+=g.children.length;

    const gr=document.createElement("tr");
    gr.className="trow lvl-mid"+(open?" open":"");
    gr.innerHTML=`<td><div class="cellpad name">
        <svg class="twist" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="tdot" style="background:${h.color}"></span>${g.name}
        <span style="color:var(--ink-3);font-weight:500;font-size:11px;margin-left:2px">${g.children.length}</span>
      </div></td>${rowCells(agg)}`;
    gr.addEventListener("click",()=>{openGroups[g.name]=!open;renderTree();});
    tb.appendChild(gr);

    g.children.forEach(leaf=>{
      const lr=document.createElement("tr");
      lr.className="trow lvl-leaf selectable"+(open?"":" row-hidden")+(selectedLeaf===leaf.name?" sel":"");
      lr.innerHTML=`<td><div class="cellpad name">
          <span class="tdot" style="background:${h.color};opacity:.5"></span>${leaf.name}
          <svg class="leaf-arrow" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div></td>${rowCells(leaf)}`;
      lr.addEventListener("click",e=>{e.stopPropagation();openPanel(leaf,g.name);});
      tb.appendChild(lr);
    });
  });
  const unitWord=detailAxis==="region"?"지역":"중분류";
  document.getElementById("treeNote").textContent=detailAxis==="region"?"지역·국가명을 클릭하면 상세 내용을 확인할 수 있습니다.":"세부항목을 클릭하면 항목별 상세 내용을 확인할 수 있습니다.";
}

/* ---- slide-over panel ---- */
function openPanel(leaf,groupName){
  lastLeaf={leaf,group:groupName};
  selectedLeaf=leaf.name;renderTree();
  const h=curNode(),color=h.color,catKey=curCatKey();
  document.getElementById("pEyebrow").innerHTML=`<i style="background:${color}"></i>${h.flat?catKey:catKey+" · "+groupName}`;
  document.getElementById("pName").textContent=leaf.name;
  document.getElementById("pUnitSel").value=unit;
  document.getElementById("pPeriodSel").value=pPeriod;

  const total=allLeaves(h).reduce((a,c)=>a+c.netasset,0);
  const pct=(leaf.netasset/total*100).toFixed(2);

  const daily=buildDaily(leaf,pPeriod);
  const latest=daily[0];

  document.getElementById("pStats").innerHTML=[
    {l:"순자산",v:fmt(leaf.netasset)+`<span style='font-size:11px;color:var(--ink-3)'> ${uShort()}</span>`},
    {l:"비중",v:pct+"<span style='font-size:11px;color:var(--ink-3)'> %</span>"},
    {l:"당일 자금유출입",v:`<span style="color:${latest.daily>=0?'var(--inflow)':'var(--outflow)'}">${latest.daily>=0?"+":""}${fmt(latest.daily)}</span>`},
    {l:"누적 자금유출입",v:`<span style="color:${latest.cum>=0?'var(--inflow)':'var(--outflow)'}">${latest.cum>=0?"+":""}${fmt(latest.cum)}</span>`},
  ].map(s=>`<div class="stat"><div class="l">${s.l}</div><div class="v num">${s.v}</div></div>`).join("");

  drawComboChart(daily.slice().reverse(),color,"pChart");

  document.getElementById("pRows").innerHTML=daily.map(d=>`
    <tr><td>${d.fulldate}</td>
      <td>${fmt(d.asset)}</td>
      <td style="color:${d.daily>=0?'var(--inflow)':'var(--outflow)'};font-weight:600">${d.daily>=0?"+":""}${fmt(d.daily)}</td>
      <td style="color:${d.cum>=0?'var(--inflow)':'var(--outflow)'};font-weight:600">${d.cum>=0?"+":""}${fmt(d.cum)}</td></tr>`).join("");

  const pLabels={flow_1w:"1W",flow_1m:"1M",flow_3m:"3M",flow_6m:"6M",flow_ytd:"YTD",flow_1y:"1Y"};
  const returns=PERIODS.map(p=>pseudoReturn(leaf.name,p));
  drawReturnChart(returns,PERIODS.map(p=>pLabels[p]),"pReturnChart");
  renderTopFlows(catKey,pPeriod,"pTopFlows");

  document.getElementById("scrim").classList.add("on");
  document.getElementById("panel").classList.add("on");
}
function closePanel(){
  document.getElementById("scrim").classList.remove("on");
  document.getElementById("panel").classList.remove("on");
  selectedLeaf=null;renderTree();
}
document.getElementById("panelClose").addEventListener("click",closePanel);
document.getElementById("scrim").addEventListener("click",()=>{closePanel();closeAssetPanel();});
document.getElementById("pPeriodSel").addEventListener("change",e=>{
  pPeriod=e.target.value;
  if(lastLeaf)openPanel(lastLeaf.leaf,lastLeaf.group);
});
document.getElementById("pUnitSel").addEventListener("change",e=>{
  unit=e.target.value;
  document.getElementById("unitSel").value=e.target.value;
  document.getElementById("unitNote").textContent="단위 "+uLabel();
  document.getElementById("treeUnitNote").textContent="단위 "+uLabel();
  rerenderActive();
  if(lastLeaf)openPanel(lastLeaf.leaf,lastLeaf.group);
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closePanel();closeAssetPanel();}});

/* ========== ASSET PANEL (overview) ========== */
/* generate daily series: 순자산, 당일(증감), 누적 */
const AP_PERIOD_DAYS={flow_1w:7,flow_1m:30,flow_3m:91,flow_6m:182,flow_ytd:175,flow_1y:365};
const AP_PERIOD_BDAYS={flow_1w:5,flow_1m:22,flow_3m:66,flow_6m:130,flow_ytd:125,flow_1y:252};
let apPeriod="flow_1m";
let pPeriod="flow_1m";

function buildDaily(row,period="flow_1m"){
  const days=AP_PERIOD_DAYS[period];
  const bdays=AP_PERIOD_BDAYS[period];
  const baseAsset=row.netasset;
  const dailyAvg=row[period]/bdays;
  const out=[];let cum=0;
  const end=new Date(2026,5,24);
  for(let i=0;i<days;i++){
    const d=new Date(end);d.setDate(d.getDate()-(days-1-i));
    const wobble=Math.sin(i*1.3)*dailyAvg*1.8 + Math.cos(i*0.5)*dailyAvg*0.9;
    const daily=Math.round(dailyAvg+wobble);
    cum+=daily;
    const asset=Math.round(baseAsset - row[period] + cum);
    out.push({
      date:`${String(d.getFullYear()).slice(-2)}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`,
      fulldate:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,
      asset, daily, cum
    });
  }
  return out.reverse();
}

function openAssetPanel(cat){
  lastAssetCat=cat;
  const row=curRows().find(r=>r.category===cat);if(!row)return;
  const color=COLORS[cat]||"#3a36c9";
  const total=curRows().reduce((a,r)=>a+r.netasset,0);
  const pct=(row.netasset/total*100).toFixed(2);

  document.getElementById("apUnitSel").value=unit;
  document.getElementById("apEyebrow").innerHTML=`<i style="background:${color}"></i>${C_LABEL[state.country]||state.country}`;
  document.getElementById("apName").textContent=cat;

  const daily=buildDaily(row,apPeriod);
  const latest=daily[0];
  document.getElementById("apStats").innerHTML=[
    {l:"순자산",v:fmt(row.netasset)+`<span style='font-size:11px;color:var(--ink-3)'> ${uShort()}</span>`},
    {l:"비중",v:pct+"<span style='font-size:11px;color:var(--ink-3)'> %</span>"},
    {l:"당일 자금유출입",v:`<span style="color:${latest.daily>=0?'var(--inflow)':'var(--outflow)'}">${latest.daily>=0?"+":""}${fmt(latest.daily)}</span>`},
    {l:"누적 자금유출입",v:`<span style="color:${latest.cum>=0?'var(--inflow)':'var(--outflow)'}">${latest.cum>=0?"+":""}${fmt(latest.cum)}</span>`},
  ].map(s=>`<div class="stat"><div class="l">${s.l}</div><div class="v num">${s.v}</div></div>`).join("");

  drawComboChart(daily.slice().reverse(),color); // chronological for chart

  document.getElementById("apRows").innerHTML=daily.map(d=>`
    <tr><td>${d.fulldate}</td>
      <td>${fmt(d.asset)}</td>
      <td style="color:${d.daily>=0?'var(--inflow)':'var(--outflow)'};font-weight:600">${d.daily>=0?"+":""}${fmt(d.daily)}</td>
      <td style="color:${d.cum>=0?'var(--inflow)':'var(--outflow)'};font-weight:600">${d.cum>=0?"+":""}${fmt(d.cum)}</td></tr>`).join("");

  const apLabels={flow_1w:"1W",flow_1m:"1M",flow_3m:"3M",flow_6m:"6M",flow_ytd:"YTD",flow_1y:"1Y"};
  const apReturns=PERIODS.map(p=>pseudoReturn(cat,p));
  drawReturnChart(apReturns,PERIODS.map(p=>apLabels[p]),"apReturnChart");
  renderTopFlows(cat,apPeriod);

  document.getElementById("scrim").classList.add("on");
  document.getElementById("apanel").classList.add("on");
}
function renderTopFlows(cat,period,containerId="apTopFlows"){
  const el=document.getElementById(containerId);if(!el)return;
  const tickers=(TICKER_DATA&&TICKER_DATA[cat])||[];
  if(!tickers.length){el.innerHTML='<div style="color:var(--ink-3);font-size:12px;padding:8px 0">종목 데이터 없음</div>';return;}
  const byFlow=[...tickers].sort((a,b)=>b[period]-a[period]);
  const inflows=byFlow.filter(t=>t[period]>0).slice(0,5);
  const outflows=[...tickers].sort((a,b)=>a[period]-b[period]).filter(t=>t[period]<0).slice(0,5);
  const makeTable=(items,isIn)=>{
    const col=isIn?'var(--inflow)':'var(--outflow)';
    const lbl=isIn?'자금유입 상위':'자금유출 상위';
    const rows=items.map((t,i)=>`<tr>
      <td>${i+1}</td><td>${t.ticker}</td><td>${t.name}</td>
      <td style="color:${col};font-weight:600">${t[period]>=0?'+':''}${fmt(t[period])}</td></tr>`).join('');
    return `<div class="top-flows-section">
      <div class="top-flows-label" style="color:${col}">
        <span style="width:8px;height:8px;border-radius:50%;background:${col};display:inline-block;flex-shrink:0"></span>${lbl}
      </div>
      <table class="ranktable">
        <thead><tr><th>#</th><th>티커</th><th>종목명</th><th>누적</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  };
  el.innerHTML=makeTable(inflows,true)+makeTable(outflows,false);
}

function closeAssetPanel(){
  document.getElementById("scrim").classList.remove("on");
  document.getElementById("apanel").classList.remove("on");
}
document.getElementById("apanelClose").addEventListener("click",closeAssetPanel);
document.getElementById("apPeriodSel").addEventListener("change",e=>{
  apPeriod=e.target.value;
  if(lastAssetCat)openAssetPanel(lastAssetCat);
});
document.getElementById("apUnitSel").addEventListener("change",e=>{
  unit=e.target.value;
  document.getElementById("unitSel").value=e.target.value;
  document.getElementById("unitNote").textContent="단위 "+uLabel();
  renderTable();
  if(lastAssetCat)openAssetPanel(lastAssetCat);
});

/* ---------- init ---------- */
function renderAll(){renderKpis();renderTable();renderChart();}
document.getElementById("lastUpdate").textContent="최종 업데이트 · 2026-06-24";
document.getElementById("treeLastUpdate").textContent="최종 업데이트 · 2026-06-24";
document.getElementById("unitNote").textContent="단위 "+uLabel();
document.getElementById("treeUnitNote").textContent="단위 "+uLabel();
renderAll();
