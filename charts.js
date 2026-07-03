/* synthetic cumulative series */
function buildSeries(target,n=24){
  const arr=[];
  for(let i=0;i<n;i++){
    const base=target*(i/(n-1));
    const noise=target*0.035*Math.sin(i*1.25)+(i===14?target*0.05:0);
    arr.push(Math.max(0,Math.round(base+noise)));
  }
  arr[n-1]=target;return arr;
}
function monthLabels(n=24){
  const out=[];const now=new Date(2026,5,24);
  for(let i=n-1;i>=0;i--){const d=new Date(now);d.setMonth(d.getMonth()-i);out.push(`${d.getMonth()+1}월`);}
  return out;
}
function periodLabels(period){
  const now=new Date(2026,5,24);
  const dn=['일','월','화','수','목','금','토'];
  const fmtD=d=>`${d.getMonth()+1}/${d.getDate()}`;

  // 1W: 요일 레이블 (7일)
  if(period==='flow_1w'){
    return Array.from({length:7},(_,i)=>{
      const d=new Date(now);d.setDate(d.getDate()-(6-i));return dn[d.getDay()];
    });
  }
  // 6M: 12월~6월 월별 (7포인트)
  if(period==='flow_6m') return monthLabels(7);
  // YTD: 1월~현재월
  if(period==='flow_ytd') return monthLabels(now.getMonth()+1);
  // 1Y: 최근 12개월
  if(period==='flow_1y') return monthLabels(12);

  // 1M·3M: 최종업데이트일 기준 시작일부터 M/D 날짜 레이블
  const monthsBack=period==='flow_1m'?-1:-3;
  const n=period==='flow_1m'?5:7;
  const start=new Date(now);start.setMonth(start.getMonth()+monthsBack);
  const totalDays=Math.round((now-start)/864e5);
  return Array.from({length:n},(_,i)=>{
    const d=new Date(start);d.setDate(d.getDate()+Math.round(totalDays*i/(n-1)));
    return fmtD(d);
  });
}

function miniSpark(values,color){
  const w=88,h=34,max=Math.max(...values),min=Math.min(...values);
  const rng=(max-min)||1;
  const pts=values.map((v,i)=>`${(i/(values.length-1)*w).toFixed(1)},${(h-((v-min)/rng)*(h-4)-2).toFixed(1)}`);
  const area=`0,${h} ${pts.join(" ")} ${w},${h}`;
  const id="g"+Math.random().toString(36).slice(2,7);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <polygon points="${area}" fill="url(#${id})"/>
    <polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/* grouped bar chart for 기간별 수익률 (X축: 1W..1Y) */
function drawBarChart(){
  if(!chartData||!chartData.bar)return;
  const {datasets,labels}=chartData;
  const box=document.getElementById("chartBox");
  const W=box.clientWidth||980,H=box.clientHeight||320;
  const m={t:16,r:14,b:30,l:50},iw=W-m.l-m.r,ih=H-m.t-m.b;
  const nP=labels.length, nS=Math.max(datasets.length,1);
  const grid=getComputedStyle(document.documentElement).getPropertyValue("--grid").trim();
  const ink3=getComputedStyle(document.documentElement).getPropertyValue("--ink-3").trim();

  let maxAbs=0;datasets.forEach(d=>d.data.forEach(v=>{if(Math.abs(v)>maxAbs)maxAbs=v>0?Math.max(maxAbs,v):Math.max(maxAbs,-v);}));
  maxAbs=Math.max(maxAbs,1);
  const niceMax=Math.ceil(maxAbs);
  const hi=niceMax, lo=-niceMax, range=hi-lo;
  const y=v=>m.t+ih-((v-lo)/range)*ih;
  const groupW=iw/nP, barGap=4, barW=Math.max(4,(groupW*0.62-barGap*(nS-1))/nS);

  let g="";for(let k=0;k<=4;k++){const val=lo+range*k/4,yy=y(val);
    g+=`<line x1="${m.l}" y1="${yy}" x2="${m.l+iw}" y2="${yy}" stroke="${grid}"/>`;
    g+=`<text x="${m.l-8}" y="${yy+3}" text-anchor="end" font-size="10" fill="${ink3}" font-family="Manrope">${val>0?"+":""}${val.toFixed(0)}%</text>`;}
  const yz=y(0);g+=`<line x1="${m.l}" y1="${yz}" x2="${m.l+iw}" y2="${yz}" stroke="${ink3}" stroke-width="1" opacity="0.45"/>`;

  let bars="",xl="";
  for(let pi=0;pi<nP;pi++){
    const gx=m.l+groupW*pi+groupW/2;
    const totalW=nS*barW+(nS-1)*barGap;
    let startX=gx-totalW/2;
    datasets.forEach(d=>{
      const v=d.data[pi],y0=y(0),y1=y(v);
      const top=Math.min(y0,y1),h=Math.abs(y1-y0);
      bars+=`<rect x="${startX.toFixed(1)}" y="${top.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1,h).toFixed(1)}" rx="2" fill="${d.color}" opacity="${v>=0?0.92:0.62}"/>`;
      startX+=barW+barGap;
    });
    xl+=`<text x="${gx.toFixed(1)}" y="${H-9}" text-anchor="middle" font-size="11" font-weight="600" fill="${ink3}">${labels[pi]}</text>`;
  }

  box.querySelectorAll("svg").forEach(s=>s.remove());
  const ns="http://www.w3.org/2000/svg";
  const svgEl=document.createElementNS(ns,"svg");
  svgEl.setAttribute("viewBox",`0 0 ${W} ${H}`);svgEl.setAttribute("width","100%");svgEl.setAttribute("height","100%");
  svgEl.innerHTML=`${g}${bars}${xl}`;
  box.insertBefore(svgEl,box.firstChild);

  // hover tooltip per period group
  const tip=document.getElementById("tip");
  svgEl.addEventListener("mousemove",e=>{
    const rect=box.getBoundingClientRect();
    const px=(e.clientX-rect.left)/rect.width*W;
    let pi=Math.floor((px-m.l)/groupW);pi=Math.max(0,Math.min(nP-1,pi));
    tip.style.opacity="1";
    tip.style.left=((m.l+groupW*pi+groupW/2)/W*rect.width)+"px";
    tip.style.top=(H-m.b-4)+"px";
    tip.innerHTML=`<div style="font-size:10px;color:var(--ink-3);margin-bottom:3px">${labels[pi]}</div>`+
      datasets.map(d=>`<div class="row"><i style="background:${d.color}"></i>${d.name} <b class="num" style="margin-left:auto;padding-left:8px">${d.data[pi]>=0?"+":""}${d.data[pi].toFixed(2)}%</b></div>`).join("");
  });
  svgEl.addEventListener("mouseleave",()=>{tip.style.opacity="0";});
}

function drawChart(){
  if(!chartData)return;
  const {datasets,labels,isReturn}=chartData;
  const box=document.getElementById("chartBox");
  const W=box.clientWidth||980,H=box.clientHeight||320;

  // value range (return mode can go negative)
  let maxV=-Infinity,minV=Infinity;
  datasets.forEach(d=>d.data.forEach(v=>{if(v>maxV)maxV=v;if(v<minV)minV=v;}));
  if(!isFinite(maxV)){maxV=1;minV=0;}
  let lo,hi;
  if(isReturn){
    const span=Math.max(Math.abs(maxV),Math.abs(minV),1);
    hi=Math.ceil(span);lo=Math.min(0,Math.floor(minV));
    if(lo===hi)hi=lo+1;
  }else{
    maxV=maxV||1;
    const pow=Math.pow(10,Math.floor(Math.log10(maxV)));hi=Math.ceil(maxV/pow)*pow||1;lo=0;
  }
  const range=(hi-lo)||1;
  const tickFmt=v=>isReturn?`${v>=0?"+":""}${v.toFixed(v%1?1:0)}%`:axisFmt(v);
  // dynamic left margin: estimate 6px per char at font-size 10 + 14px gap/buffer
  const longestTick=Math.max(...[0,1,2,3,4].map(k=>tickFmt(lo+range*k/4).length));
  const m={t:12,r:14,b:28,l:Math.max(44,longestTick*6+14)},iw=W-m.l-m.r,ih=H-m.t-m.b,n=labels.length;
  const x=i=>m.l+(n<=1?0:(i/(n-1))*iw);
  const y=v=>m.t+ih-((v-lo)/range)*ih;
  const grid=getComputedStyle(document.documentElement).getPropertyValue("--grid").trim();
  const ink3=getComputedStyle(document.documentElement).getPropertyValue("--ink-3").trim();

  let g="";for(let k=0;k<=4;k++){const val=lo+range*k/4,yy=y(val);
    g+=`<line x1="${m.l}" y1="${yy}" x2="${m.l+iw}" y2="${yy}" stroke="${grid}" stroke-width="1"/>`;
    g+=`<text x="${m.l-9}" y="${yy+4}" text-anchor="end" font-size="10" fill="${ink3}" font-family="Manrope">${tickFmt(val)}</text>`;}
  // zero baseline emphasis in return mode
  if(isReturn&&lo<0){const yz=y(0);g+=`<line x1="${m.l}" y1="${yz}" x2="${m.l+iw}" y2="${yz}" stroke="${ink3}" stroke-width="1" opacity="0.4"/>`;}
  let xl="";for(let i=0;i<n;i+=Math.ceil(n/8)){xl+=`<text x="${x(i)}" y="${H-8}" text-anchor="middle" font-size="10" fill="${ink3}">${labels[i]}</text>`;}

  let defs="",areas="",lines="",dots="";
  const baseY=isReturn?y(Math.max(lo,0)):m.t+ih;
  datasets.forEach((d,di)=>{
    const id="cg"+di;
    defs+=`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${d.color}" stop-opacity=".22"/><stop offset="1" stop-color="${d.color}" stop-opacity="0"/></linearGradient>`;
    const pts=d.data.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    areas+=`<polygon points="${m.l},${baseY} ${pts.join(" ")} ${m.l+iw},${baseY}" fill="url(#${id})"/>`;
    lines+=`<polyline points="${pts.join(" ")}" fill="none" stroke="${d.color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    dots+=`<circle cx="${x(n-1)}" cy="${y(d.data[n-1])}" r="4" fill="${d.color}" stroke="var(--surface)" stroke-width="2"/>`;
  });

  box.querySelectorAll("svg").forEach(s=>s.remove());
  const ns="http://www.w3.org/2000/svg";
  const svgEl=document.createElementNS(ns,"svg");
  svgEl.setAttribute("viewBox",`0 0 ${W} ${H}`);svgEl.setAttribute("width","100%");svgEl.setAttribute("height","100%");
  svgEl.innerHTML=`<defs>${defs}</defs>${g}${xl}${areas}${lines}${dots}`;
  box.insertBefore(svgEl,box.firstChild);

  // hover
  const tip=document.getElementById("tip");
  svgEl.addEventListener("mousemove",e=>{
    const rect=box.getBoundingClientRect();
    const px=(e.clientX-rect.left)/rect.width*W;
    let i=Math.round((px-m.l)/iw*(n-1));i=Math.max(0,Math.min(n-1,i));
    tip.style.opacity="1";
    tip.style.left=(x(i)/W*rect.width)+"px";
    tip.style.top=(H-m.b-4)+"px";
    tip.innerHTML=`<div style="font-size:10px;color:var(--ink-3);margin-bottom:3px">${labels[i]}</div>`+
      datasets.map(d=>{const val=isReturn?`${d.data[i]>=0?"+":""}${d.data[i].toFixed(2)}%`:fmt(d.data[i]);
        return `<div class="row"><i style="background:${d.color}"></i>${d.name} <b class="num" style="margin-left:auto;padding-left:8px">${val}</b></div>`;}).join("");
  });
  svgEl.addEventListener("mouseleave",()=>{tip.style.opacity="0";});
}

/* 기간별 수익률 — 양/음 막대 차트 */
function drawReturnChart(returns,labels,containerId="pReturnChart"){
  const box=document.getElementById(containerId);
  if(!box)return;
  const W=box.clientWidth||390,H=box.clientHeight||150;
  const m={t:14,r:8,b:30,l:34},iw=W-m.l-m.r,ih=H-m.t-m.b,n=returns.length;
  const inAccent=getComputedStyle(document.documentElement).getPropertyValue("--inflow").trim();
  const outAccent=getComputedStyle(document.documentElement).getPropertyValue("--outflow").trim();
  const grid=getComputedStyle(document.documentElement).getPropertyValue("--grid").trim();
  const ink3=getComputedStyle(document.documentElement).getPropertyValue("--ink-3").trim();
  const maxAbs=Math.max(...returns.map(Math.abs),1);
  const niceMax=Math.ceil(maxAbs);
  const x=i=>m.l+(i+0.5)/n*iw;
  const y=v=>m.t+ih/2-(v/niceMax)*(ih/2);
  const bw=Math.max(8,iw/n*0.5);
  // zero line + top/bottom gridlines
  let g=`<line x1="${m.l}" y1="${y(0)}" x2="${m.l+iw}" y2="${y(0)}" stroke="${ink3}" stroke-width="1" opacity="0.4"/>`;
  [niceMax,-niceMax].forEach(val=>{const yy=y(val);
    g+=`<line x1="${m.l}" y1="${yy}" x2="${m.l+iw}" y2="${yy}" stroke="${grid}"/>`;
    g+=`<text x="${m.l-6}" y="${yy+3}" text-anchor="end" font-size="8.5" fill="${ink3}" font-family="Manrope">${val>0?"+":""}${val}%</text>`;});
  let bars="",lab="",vals="";
  returns.forEach((v,i)=>{
    const pos=v>=0,y0=y(0),y1=y(v);
    const top=Math.min(y0,y1),h=Math.abs(y1-y0);
    bars+=`<rect x="${(x(i)-bw/2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1,h).toFixed(1)}" rx="2" fill="${pos?inAccent:outAccent}"/>`;
    lab+=`<text x="${x(i)}" y="${H-6}" text-anchor="middle" font-size="9" fill="${ink3}">${labels[i]}</text>`;
    vals+=`<text x="${x(i)}" y="${(pos?y1-4:y1+11).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="700" fill="${pos?inAccent:outAccent}" font-family="Manrope">${pos?"+":""}${v.toFixed(1)}</text>`;
  });
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${g}${bars}${vals}${lab}</svg>`;
}

function drawPanelChart(series,color){
  const box=document.getElementById("pChart");
  const W=box.clientWidth||390,H=box.clientHeight||170;
  const maxV=Math.max(...series)||1;
  const pow=Math.pow(10,Math.floor(Math.log10(maxV)));const niceMax=Math.ceil(maxV/pow)*pow||1;
  // dynamic left margin: 5.5px per char at font-size 9 + 12px buffer
  const longestTick=Math.max(...[0,1,2,3].map(k=>axisFmt(niceMax*k/3).length));
  const m={t:8,r:6,b:18,l:Math.max(38,longestTick*5.5+12)},iw=W-m.l-m.r,ih=H-m.t-m.b,n=series.length;
  const x=i=>m.l+(i/(n-1))*iw,y=v=>m.t+ih-(v/niceMax)*ih;
  const grid=getComputedStyle(document.documentElement).getPropertyValue("--grid").trim();
  const ink3=getComputedStyle(document.documentElement).getPropertyValue("--ink-3").trim();
  let g="";for(let k=0;k<=3;k++){const val=niceMax*k/3,yy=y(val);
    g+=`<line x1="${m.l}" y1="${yy}" x2="${m.l+iw}" y2="${yy}" stroke="${grid}"/>`;
    g+=`<text x="${m.l-7}" y="${yy+4}" text-anchor="end" font-size="9" fill="${ink3}" font-family="Manrope">${axisFmt(val)}</text>`;}
  const pts=series.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">
    <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".25"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${g}<polygon points="${m.l},${m.t+ih} ${pts.join(" ")} ${m.l+iw},${m.t+ih}" fill="url(#pg)"/>
    <polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${x(n-1)}" cy="${y(series[n-1])}" r="4" fill="${color}" stroke="var(--surface)" stroke-width="2"/>
  </svg>`;
}

/* combo chart: 누적 bars (left axis) + 당일 line (right axis) */
function drawComboChart(series,color,containerId="apChart"){
  const box=document.getElementById(containerId);
  const W=box.clientWidth||540,H=box.clientHeight||200;
  const n=series.length;
  const accent=getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  const accent2=getComputedStyle(document.documentElement).getPropertyValue("--accent-2").trim();
  const grid=getComputedStyle(document.documentElement).getPropertyValue("--grid").trim();
  const ink3=getComputedStyle(document.documentElement).getPropertyValue("--ink-3").trim();

  const cumVals=series.map(d=>d.cum),assetVals=series.map(d=>d.asset);
  const cumMax=Math.max(...cumVals,0),cumMin=Math.min(...cumVals,0);
  const cumRange=(cumMax-cumMin)||1;
  // right axis: 순자산 — tight range so the line shows variation
  const aMax=Math.max(...assetVals),aMin=Math.min(...assetVals);
  const aPad=(aMax-aMin)*0.15||1;
  const aLo=aMin-aPad,aHi=aMax+aPad,aRange=(aHi-aLo)||1;
  // dynamic left margin: 5px per char at font-size 8.5 + 10px buffer
  const longestCumTick=Math.max(...[0,1,2,3].map(k=>axisFmt(cumMin+cumRange*k/3).length));
  const m={t:10,r:46,b:24,l:Math.max(40,longestCumTick*5+10)},iw=W-m.l-m.r,ih=H-m.t-m.b;

  const x=i=>m.l+(n<=1?iw/2:(i/(n-1))*iw);
  const yCum=v=>m.t+ih-((v-cumMin)/cumRange)*ih;
  const yA=v=>m.t+ih-((v-aLo)/aRange)*ih;
  const bw=Math.max(3,iw/n*0.55);

  let g="";for(let k=0;k<=3;k++){const val=cumMin+cumRange*k/3,yy=yCum(val);
    g+=`<line x1="${m.l}" y1="${yy}" x2="${m.l+iw}" y2="${yy}" stroke="${grid}"/>`;
    g+=`<text x="${m.l-6}" y="${yy+3}" text-anchor="end" font-size="8.5" fill="${ink3}" font-family="Manrope">${axisFmt(val)}</text>`;}
  // right axis ticks (순자산)
  let gr2="";for(let k=0;k<=3;k++){const val=aLo+aRange*k/3,yy=yA(val);
    gr2+=`<text x="${m.l+iw+6}" y="${yy+3}" text-anchor="start" font-size="8.5" fill="${ink3}" font-family="Manrope">${axisFmt(val)}</text>`;}
  // x labels
  let xl="";for(let i=0;i<n;i+=Math.ceil(n/6)){xl+=`<text x="${x(i)}" y="${H-7}" text-anchor="middle" font-size="8.5" fill="${ink3}">${series[i].date}</text>`;}

  let bars="";series.forEach((d,i)=>{
    const y0=yCum(0),y1=yCum(d.cum);
    const top=Math.min(y0,y1),h=Math.abs(y1-y0);
    bars+=`<rect x="${(x(i)-bw/2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1,h).toFixed(1)}" rx="1.5" fill="${accent}" opacity="${d.cum>=0?0.85:0.5}"/>`;
  });
  const linePts=series.map((d,i)=>`${x(i).toFixed(1)},${yA(d.asset).toFixed(1)}`);
  let line=`<polyline points="${linePts.join(" ")}" fill="none" stroke="${accent2}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  series.forEach((d,i)=>{line+=`<circle cx="${x(i).toFixed(1)}" cy="${yA(d.asset).toFixed(1)}" r="2" fill="${accent2}"/>`;});

  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${g}${gr2}${xl}${bars}${line}</svg>`;
}
