const COLORS={
  "주식":"#3a36c9","채권":"#15b8b0","자산배분":"#e0973c","상품":"#9b6fc0",
  "부동산":"#3d8fb5","대체투자/기타":"#7d8a99","크립토":"#d4a32f"
};
/* base unit: 천 달러 (thousands USD) */
const DEMO={
  US:[
    {category:"주식",     netasset:12346673070,flow_1w:1022370513, flow_1m:1222422036,  flow_3m:1560291051,  flow_6m:1808993617,  flow_ytd:1805381011,  flow_1y:2553950767},
    {category:"채권",     netasset:2490235879, flow_1w:9042811,    flow_1m:43049914,    flow_3m:127227183,   flow_6m:290935603,   flow_ytd:293951275,   flow_1y:537857622},
    {category:"자산배분", netasset:47227048,   flow_1w:-34595,     flow_1m:1970065,     flow_3m:7598120,     flow_6m:11782051,    flow_ytd:11826723,    flow_1y:18468366},
    {category:"상품",     netasset:305925816,  flow_1w:-1136554,   flow_1m:-6124458,    flow_3m:16875794,    flow_6m:20407304,    flow_ytd:18808977,    flow_1y:52756881},
    {category:"부동산",   netasset:95951692,   flow_1w:136900,     flow_1m:2199466,     flow_3m:3722652,     flow_6m:4716992,     flow_ytd:4693773,     flow_1y:8444255},
    {category:"대체투자/기타",netasset:31453872,flow_1w:-599382,   flow_1m:1905566,     flow_3m:2989046,     flow_6m:3851961,     flow_ytd:3259586,     flow_1y:-19267687},
    {category:"크립토",   netasset:91669578,   flow_1w:-1691095,   flow_1m:-4196042,    flow_3m:-5279523,    flow_6m:-6142437,    flow_ytd:-5550063,    flow_1y:16977210},
  ],
  HK:[
    {category:"주식",     netasset:37510127,   flow_1w:-915247,    flow_1m:2272498,     flow_3m:598218,      flow_6m:2749064,     flow_ytd:2749064,     flow_1y:7177486},
    {category:"채권",     netasset:3274472,    flow_1w:-990,       flow_1m:7362,        flow_3m:-290354,     flow_6m:-9078,       flow_ytd:-9078,       flow_1y:-261452},
    {category:"자산배분", netasset:0,          flow_1w:0,          flow_1m:0,           flow_3m:0,           flow_6m:0,           flow_ytd:0,           flow_1y:0},
    {category:"상품",     netasset:17776874,   flow_1w:-32776,     flow_1m:-383107,     flow_3m:-808203,     flow_6m:-1242706,    flow_ytd:-1242706,    flow_1y:517859},
    {category:"부동산",   netasset:40028,      flow_1w:-1741,      flow_1m:-1220,       flow_3m:-5637,       flow_6m:-12217,      flow_ytd:-12217,      flow_1y:-12217},
    {category:"대체투자/기타",netasset:0,      flow_1w:0,          flow_1m:0,           flow_3m:0,           flow_6m:0,           flow_ytd:0,           flow_1y:0},
    {category:"크립토",   netasset:23941,      flow_1w:0,          flow_1m:-155,        flow_3m:-1097,       flow_6m:-671,        flow_ytd:-671,        flow_1y:6350},
  ],
  JP:[
    {category:"주식",     netasset:799848973,  flow_1w:1040202,    flow_1m:6742971,     flow_3m:134897425,   flow_6m:1912675497,  flow_ytd:1912675497,  flow_1y:2038754819},
    {category:"채권",     netasset:8356900,    flow_1w:1910,       flow_1m:-97429,      flow_3m:232552,      flow_6m:-16480,      flow_ytd:-16480,      flow_1y:200965},
    {category:"자산배분", netasset:0,          flow_1w:0,          flow_1m:0,           flow_3m:0,           flow_6m:0,           flow_ytd:0,           flow_1y:0},
    {category:"상품",     netasset:11746393,   flow_1w:-1295,      flow_1m:-48852,      flow_3m:-235780,     flow_6m:-57750,      flow_ytd:-57750,      flow_1y:398094},
    {category:"부동산",   netasset:15187621,   flow_1w:-329,       flow_1m:213394,      flow_3m:784223,      flow_6m:329250,      flow_ytd:329250,      flow_1y:-77477},
    {category:"대체투자/기타",netasset:27815,  flow_1w:-705,       flow_1m:27024,       flow_3m:25214,       flow_6m:0,           flow_ytd:0,           flow_1y:0},
    {category:"크립토",   netasset:0,          flow_1w:0,          flow_1m:0,           flow_3m:0,           flow_6m:0,           flow_ytd:0,           flow_1y:0},
  ],
};

let data=JSON.parse(JSON.stringify(DEMO));

/* ---- hierarchical detail data: 대분류 > 중분류 > 세부항목 ---- */
/* flows are 1y; other periods derived by ratio for demo brevity */
function leaf(name,netasset,f1y){
  const r={flow_1w:0.009,flow_1m:0.15,flow_3m:0.26,flow_6m:0.56,flow_ytd:0.38};
  return {name,netasset,flow_1w:Math.round(f1y*r.flow_1w),flow_1m:Math.round(f1y*r.flow_1m),
    flow_3m:Math.round(f1y*r.flow_3m),flow_6m:Math.round(f1y*r.flow_6m),flow_ytd:Math.round(f1y*r.flow_ytd),flow_1y:f1y};
}
const HIER={
  "주식":{color:"#3a36c9",groups:[
    {name:"종합",children:[
      {name:"종합",netasset:7636328,flow_1w:28373,flow_1m:383245,flow_3m:524761,flow_6m:832707,flow_ytd:650369,flow_1y:1231339},
    ]},
    {name:"스타일",children:[
      leaf("성장",946375,142000),leaf("가치",825173,118000),leaf("배당",560008,86000),
      leaf("옵션인컴(주식)",136901,38000),leaf("퀄리티",116504,24700),leaf("ESG(주식)",108005,8500),
      leaf("목표성과(주식)",86004,6200),leaf("모멘텀",76265,9859),leaf("배당성장",71200,15300),
      leaf("저변동성",51678,12870),leaf("개별종목",45188,3200),leaf("우선주",40275,2800),
      leaf("베타전략",13026,920),leaf("고배당/저변동성",12702,1850),leaf("리스크컨트롤",12286,-450),
      leaf("VIX",2953,-820),leaf("인플레이션헤지",2064,340),
    ]},
    {name:"테마",children:[
      leaf("AI/로봇",43127,15800),leaf("기술혁신",19402,2870),leaf("신재생에너지",19954,-1200),
      leaf("인터넷",15916,1450),leaf("사이버보안",14424,2100),leaf("원자력",14228,6400),
      leaf("빅테크+",13430,5800),leaf("소프트웨어",13916,2100),leaf("양자컴퓨팅",5042,3200),
      leaf("클라우드컴퓨팅",5057,820),leaf("물(Water)",5038,480),leaf("크립토",1845,1637),
      leaf("희토류",3025,680),leaf("4차산업",3560,520),leaf("2차전지",2377,2870),
      leaf("게놈연구",1565,210),leaf("의료용대마",1078,-280),leaf("핀테크",1005,95),
      leaf("블록체인",575,380),leaf("메타버스",294,-120),leaf("e스포츠/게임",374,-180),
      leaf("IPO",1733,290),leaf("신기술자동차",794,-350),leaf("e-커머스",232,-90),
      leaf("농산물",174,-45),
    ]},
    {name:"섹터/산업",children:[
      leaf("IT",342840,35000),leaf("반도체",129312,28000),leaf("에너지",114416,8200),
      leaf("금융",84091,-5496),leaf("은행",11855,980),leaf("헬스케어",72686,6500),
      leaf("바이오",19490,2800),leaf("소재",13631,450),leaf("귀금속",49911,3200),
      leaf("산업용금속",8901,620),leaf("건설/건축소재",4640,480),leaf("통신",36633,1800),
      leaf("미디어",134,-85),leaf("컬쳐/엔터",22,-18),leaf("경기소비재",32604,2870),
      leaf("소비/서비스",1241,180),leaf("여행/레저",237,45),leaf("필수소비재",27805,3100),
      leaf("음식료",1094,190),leaf("산업재",15757,1840),leaf("운송/물류",4213,580),
      leaf("우주항공/방산",44209,12500),leaf("인프라",37594,2800),leaf("유틸리티",39125,3600),
      leaf("천연자원",16083,1200),leaf("기타",35187,2400),
    ]},
  ]},
  "채권":{color:"#15b8b0",flat:true,leaves:[
    leaf("종합",910121,142000),leaf("국채",558723,86000),leaf("회사채",212583,42000),
    leaf("지방채",159499,24700),leaf("투자적격",140763,18027),leaf("하이일드",120423,15400),
    leaf("MBS",80291,9859),leaf("물가연동",75842,8400),leaf("ABS",50278,5718),
    leaf("변동금리",41534,4600),leaf("시니어론",17249,2100),leaf("머니마켓",28617,3470),
    leaf("ESG(채권)",13930,1637),leaf("전환사채",12692,1463),leaf("RFR/지표금리",4406,520),
    leaf("금리헤지",2841,333),leaf("올인컴(채권)",2364,290),leaf("목표성과(채권)",103,12),
    leaf("기타",953,110),
  ]},
  /* ▼ 임시 구성 — 세부항목 추후 수정 예정 */
  "자산배분":{color:"#e0973c",flat:true,leaves:[
    leaf("타깃데이트",18000,4200),leaf("리스크패리티",9800,1800),leaf("멀티에셋",8200,1600),
    leaf("인컴배분",5855,1100),leaf("기타",2000,463),
  ]},
  "상품":{color:"#9b6fc0",flat:true,leaves:[
    leaf("금",142000,28448),leaf("원유",68000,9800),leaf("천연가스",32000,4600),
    leaf("광범위 원자재",54000,12870),leaf("귀금속",24000,5718),leaf("농산물",11603,2100),
  ]},
  "부동산":{color:"#3d8fb5",flat:true,leaves:[
    leaf("리츠",52000,3800),leaf("주거용",18000,1200),leaf("상업용",14084,980),
    leaf("인프라/물류",8000,478),
  ]},
  "대체투자/기타":{color:"#7d8a99",flat:true,leaves:[
    leaf("헤지펀드 전략",12000,2100),leaf("인프라",10080,1637),leaf("천연자원",5000,820),
    leaf("프라이빗에셋",3000,400),
  ]},
  "크립토":{color:"#d4a32f",flat:true,leaves:[
    leaf("비트코인 현물",98000,48000),leaf("이더리움 현물",27000,13363),
    leaf("멀티코인",4000,1200),leaf("스테이킹",2050,800),
  ]},
};
const DETAIL_CATS=Object.keys(HIER);

/* ---- region/country hierarchy: 지역(대륙) > 국가 ---- */
/* 임시 구성 — 데이터 추후 채움. 이미지 기반 지역·국가 구성 */
const REGION={
  "주요 지역":{color:"#3a36c9",groups:[
    {name:"주요 지역",children:[
      leaf("전세계",1536101,286340),leaf("전세계(미국 제외)",337069,63433),
      leaf("이머징",138272,24132),leaf("이머징(중국 제외)",24130,4252),
      leaf("선진국",7042,3138),leaf("EAFE",278755,16331),
    ]},
  ]},
  "아메리카":{color:"#15b8b0",groups:[
    {name:"북미",children:[
      leaf("미국",11746503,2849713),leaf("캐나다",16661,2401),
    ]},
    {name:"중남미",children:[
      leaf("브라질",11706,1800),leaf("멕시코",2268,420),leaf("기타 중남미국가",2420,380),
    ]},
  ]},
  "아시아":{color:"#9b6fc0",groups:[
    {name:"아시아",children:[
      leaf("한국",24823,3800),leaf("중국",30947,4600),leaf("홍콩",1094,210),
      leaf("일본",60872,9800),leaf("인도",13389,2100),leaf("대만",12193,1900),
      leaf("인도네시아",317,48),leaf("베트남",637,90),leaf("기타 아시아국가",1556,240),
    ]},
  ]},
  "유럽":{color:"#3d8fb5",groups:[
    {name:"유럽",children:[
      leaf("영국",9056,1400),leaf("독일",1833,280),leaf("스위스",2277,340),
      leaf("이스라엘",1384,210),leaf("프랑스",377,56),leaf("기타 유럽국가",5109,780),
    ]},
  ]},
  "오세아니아":{color:"#15b8b0",groups:[
    {name:"오세아니아",children:[
      leaf("호주",1531,230),leaf("기타 오세아니아국가",70,10),
    ]},
  ]},
  "중동":{color:"#7d8a99",groups:[
    {name:"중동",children:[
      leaf("사우디아라비아",704,105),leaf("기타 중동국가",418,62),
    ]},
  ]},
  "기타 지역":{color:"#d4a32f",groups:[
    {name:"기타 지역",children:[
      leaf("기타 지역",457777,68000),leaf("기타 아프리카 국가",12000,1800),
    ]},
  ]},
};
const REGION_CATS=Object.keys(REGION);

/* ---- ETF ticker data for asset panel top-flow ranking ---- */
/* flows in millions USD, matching base data unit */
const TICKER_DATA={
  "주식":[
    {ticker:"SPY",  name:"SPDR S&P 500 ETF Trust",            flow_1w:4820, flow_1m:28340, flow_3m:52100, flow_6m:98200,  flow_ytd:72400,  flow_1y:185000},
    {ticker:"IVV",  name:"iShares Core S&P 500 ETF",          flow_1w:3210, flow_1m:19800, flow_3m:38400, flow_6m:72100,  flow_ytd:54300,  flow_1y:142000},
    {ticker:"VOO",  name:"Vanguard S&P 500 ETF",               flow_1w:2980, flow_1m:22100, flow_3m:45200, flow_6m:89300,  flow_ytd:65800,  flow_1y:168000},
    {ticker:"QQQ",  name:"Invesco QQQ Trust",                  flow_1w:1840, flow_1m:12400, flow_3m:21800, flow_6m:38900,  flow_ytd:28400,  flow_1y:76000},
    {ticker:"VTI",  name:"Vanguard Total Stock Market ETF",    flow_1w:1620, flow_1m:11200, flow_3m:23400, flow_6m:45100,  flow_ytd:34200,  flow_1y:89000},
    {ticker:"SCHD", name:"Schwab US Dividend Equity ETF",      flow_1w:890,  flow_1m:6200,  flow_3m:14800, flow_6m:28400,  flow_ytd:21200,  flow_1y:54000},
    {ticker:"VGT",  name:"Vanguard Information Technology ETF",flow_1w:720,  flow_1m:5100,  flow_3m:11200, flow_6m:21800,  flow_ytd:16400,  flow_1y:42000},
    {ticker:"QQQM", name:"Invesco NASDAQ 100 ETF",             flow_1w:640,  flow_1m:4800,  flow_3m:9800,  flow_6m:18200,  flow_ytd:13600,  flow_1y:34000},
    {ticker:"JEPI", name:"JPMorgan Equity Premium Income ETF", flow_1w:520,  flow_1m:3800,  flow_3m:8200,  flow_6m:15800,  flow_ytd:11900,  flow_1y:29000},
    {ticker:"JEPQ", name:"JPMorgan Nasdaq Equity Prem Inc ETF",flow_1w:480,  flow_1m:3400,  flow_3m:7400,  flow_6m:14200,  flow_ytd:10700,  flow_1y:26000},
    {ticker:"VUG",  name:"Vanguard Growth ETF",                flow_1w:580,  flow_1m:4100,  flow_3m:8900,  flow_6m:17100,  flow_ytd:12800,  flow_1y:32000},
    {ticker:"RSP",  name:"Invesco S&P 500 Equal Weight ETF",   flow_1w:320,  flow_1m:2300,  flow_3m:4800,  flow_6m:9200,   flow_ytd:6900,   flow_1y:17000},
    {ticker:"SOXX", name:"iShares Semiconductor ETF",          flow_1w:240,  flow_1m:1700,  flow_3m:3600,  flow_6m:6900,   flow_ytd:5200,   flow_1y:13000},
    {ticker:"SMH",  name:"VanEck Semiconductor ETF",           flow_1w:210,  flow_1m:1500,  flow_3m:3200,  flow_6m:6100,   flow_ytd:4600,   flow_1y:11000},
    {ticker:"XLK",  name:"Technology Select Sector SPDR ETF",  flow_1w:280,  flow_1m:1900,  flow_3m:4200,  flow_6m:8100,   flow_ytd:6100,   flow_1y:15000},
    {ticker:"IWM",  name:"iShares Russell 2000 ETF",           flow_1w:-240, flow_1m:-1600, flow_3m:-3400, flow_6m:-6500,  flow_ytd:-4900,  flow_1y:-12000},
    {ticker:"EEM",  name:"iShares MSCI Emerging Markets ETF",  flow_1w:-290, flow_1m:-2000, flow_3m:-4200, flow_6m:-8100,  flow_ytd:-6100,  flow_1y:-15000},
    {ticker:"ARKK", name:"ARK Innovation ETF",                 flow_1w:-160, flow_1m:-1100, flow_3m:-2300, flow_6m:-4400,  flow_ytd:-3300,  flow_1y:-8200},
    {ticker:"XLE",  name:"Energy Select Sector SPDR ETF",      flow_1w:-210, flow_1m:-1400, flow_3m:-3000, flow_6m:-5800,  flow_ytd:-4300,  flow_1y:-11000},
    {ticker:"EFA",  name:"iShares MSCI EAFE ETF",              flow_1w:-180, flow_1m:-1200, flow_3m:-2600, flow_6m:-5000,  flow_ytd:-3700,  flow_1y:-9400},
  ],
  "채권":[
    {ticker:"AGG",  name:"iShares Core US Aggregate Bond ETF", flow_1w:920,  flow_1m:6400,  flow_3m:14200, flow_6m:27400,  flow_ytd:20600,  flow_1y:52000},
    {ticker:"BND",  name:"Vanguard Total Bond Market ETF",     flow_1w:780,  flow_1m:5400,  flow_3m:12100, flow_6m:23400,  flow_ytd:17600,  flow_1y:44000},
    {ticker:"SGOV", name:"iShares 0-3 Month Treasury Bond ETF",flow_1w:640,  flow_1m:4500,  flow_3m:9800,  flow_6m:18900,  flow_ytd:14200,  flow_1y:36000},
    {ticker:"SHV",  name:"iShares Short Treasury Bond ETF",    flow_1w:520,  flow_1m:3600,  flow_3m:8100,  flow_6m:15600,  flow_ytd:11700,  flow_1y:29000},
    {ticker:"BKLN", name:"Invesco Senior Loan ETF",            flow_1w:380,  flow_1m:2700,  flow_3m:5900,  flow_6m:11400,  flow_ytd:8600,   flow_1y:21000},
    {ticker:"VCIT", name:"Vanguard Intermediate-Term Corp Bd", flow_1w:310,  flow_1m:2200,  flow_3m:4800,  flow_6m:9200,   flow_ytd:6900,   flow_1y:17000},
    {ticker:"LQD",  name:"iShares iBoxx Investment Grade Corp",flow_1w:270,  flow_1m:1900,  flow_3m:4100,  flow_6m:7900,   flow_ytd:5900,   flow_1y:15000},
    {ticker:"MINT", name:"PIMCO Enhanced Short Maturity ETF",  flow_1w:240,  flow_1m:1700,  flow_3m:3700,  flow_6m:7100,   flow_ytd:5400,   flow_1y:13000},
    {ticker:"JAAA", name:"Janus Henderson AAA CLO ETF",        flow_1w:210,  flow_1m:1500,  flow_3m:3200,  flow_6m:6200,   flow_ytd:4700,   flow_1y:11000},
    {ticker:"VCSH", name:"Vanguard Short-Term Corp Bond ETF",  flow_1w:150,  flow_1m:1050,  flow_3m:2300,  flow_6m:4400,   flow_ytd:3300,   flow_1y:8200},
    {ticker:"TLT",  name:"iShares 20+ Year Treasury Bond ETF", flow_1w:-420, flow_1m:-2900, flow_3m:-6400, flow_6m:-12400, flow_ytd:-9300,  flow_1y:-23000},
    {ticker:"HYG",  name:"iShares iBoxx High Yield Corp Bond", flow_1w:-180, flow_1m:-1200, flow_3m:-2700, flow_6m:-5200,  flow_ytd:-3900,  flow_1y:-9800},
    {ticker:"JNK",  name:"SPDR Bloomberg High Yield Bond ETF", flow_1w:-150, flow_1m:-1000, flow_3m:-2300, flow_6m:-4400,  flow_ytd:-3300,  flow_1y:-8200},
    {ticker:"EMB",  name:"iShares JP Morgan USD EM Bond ETF",  flow_1w:-120, flow_1m:-820,  flow_3m:-1800, flow_6m:-3500,  flow_ytd:-2600,  flow_1y:-6500},
    {ticker:"MBB",  name:"iShares MBS ETF",                    flow_1w:-90,  flow_1m:-630,  flow_3m:-1400, flow_6m:-2700,  flow_ytd:-2000,  flow_1y:-5000},
    {ticker:"IEF",  name:"iShares 7-10 Year Treasury Bond ETF",flow_1w:-80,  flow_1m:-540,  flow_3m:-1200, flow_6m:-2300,  flow_ytd:-1700,  flow_1y:-4300},
    {ticker:"TIPS", name:"iShares TIPS Bond ETF",              flow_1w:-70,  flow_1m:-490,  flow_3m:-1100, flow_6m:-2100,  flow_ytd:-1600,  flow_1y:-3900},
    {ticker:"FLOT", name:"iShares Floating Rate Bond ETF",     flow_1w:180,  flow_1m:1300,  flow_3m:2800,  flow_6m:5400,   flow_ytd:4000,   flow_1y:10000},
    {ticker:"IGSB", name:"iShares 1-5 Yr Inv Grade Corp ETF",  flow_1w:130,  flow_1m:900,   flow_3m:2000,  flow_6m:3800,   flow_ytd:2900,   flow_1y:7100},
    {ticker:"IGIB", name:"iShares 5-10 Yr Inv Grade Corp ETF", flow_1w:110,  flow_1m:760,   flow_3m:1700,  flow_6m:3200,   flow_ytd:2400,   flow_1y:6000},
  ],
  "자산배분":[
    {ticker:"AOM",   name:"iShares Core Moderate Alloc ETF",    flow_1w:28,  flow_1m:192, flow_3m:420, flow_6m:810, flow_ytd:610, flow_1y:1500},
    {ticker:"AOA",   name:"iShares Core Aggr Growth Alloc ETF", flow_1w:24,  flow_1m:168, flow_3m:368, flow_6m:710, flow_ytd:534, flow_1y:1320},
    {ticker:"AOR",   name:"iShares Core Growth Alloc ETF",      flow_1w:20,  flow_1m:140, flow_3m:308, flow_6m:594, flow_ytd:446, flow_1y:1100},
    {ticker:"NTSX",  name:"WisdomTree US Efficient Core ETF",    flow_1w:10,  flow_1m:70,  flow_3m:154, flow_6m:297, flow_ytd:223, flow_1y:550},
    {ticker:"GAA",   name:"Cambria Global Asset Allocation ETF", flow_1w:8,   flow_1m:56,  flow_3m:123, flow_6m:238, flow_ytd:179, flow_1y:440},
    {ticker:"MDIV",  name:"First Trust Multi-Asset Div ETF",     flow_1w:16,  flow_1m:112, flow_3m:246, flow_6m:475, flow_ytd:357, flow_1y:880},
    {ticker:"AOK",   name:"iShares Core Conservative Alloc ETF", flow_1w:12,  flow_1m:84,  flow_3m:184, flow_6m:356, flow_ytd:267, flow_1y:660},
    {ticker:"RPAR",  name:"Risk Parity ETF",                     flow_1w:-8,  flow_1m:-56, flow_3m:-123,flow_6m:-238,flow_ytd:-179,flow_1y:-440},
    {ticker:"TRTY",  name:"Cambria Trinity ETF",                 flow_1w:-4,  flow_1m:-28, flow_3m:-61, flow_6m:-119,flow_ytd:-89, flow_1y:-220},
    {ticker:"ALTY",  name:"Global X SuperDividend Alts ETF",     flow_1w:-6,  flow_1m:-42, flow_3m:-92, flow_6m:-178,flow_ytd:-134,flow_1y:-330},
    {ticker:"GDE",   name:"WisdomTree Global Efficient Core ETF",flow_1w:7,   flow_1m:49,  flow_3m:108, flow_6m:208, flow_ytd:156, flow_1y:385},
    {ticker:"BLNDX", name:"Standpoint Multi-Asset ETF",          flow_1w:6,   flow_1m:42,  flow_3m:92,  flow_6m:178, flow_ytd:134, flow_1y:330},
  ],
  "상품":[
    {ticker:"GLD",  name:"SPDR Gold Shares",                      flow_1w:4200, flow_1m:7800,  flow_3m:14200, flow_6m:18900, flow_ytd:12800, flow_1y:28000},
    {ticker:"IAU",  name:"iShares Gold Trust",                    flow_1w:2800, flow_1m:5200,  flow_3m:9400,  flow_6m:12600, flow_ytd:8500,  flow_1y:18600},
    {ticker:"GLDM", name:"SPDR Gold MiniShares Trust",            flow_1w:1900, flow_1m:3500,  flow_3m:6400,  flow_6m:8600,  flow_ytd:5800,  flow_1y:12700},
    {ticker:"PDBC", name:"Invesco Optimum Yield Diversified Cmdty",flow_1w:820, flow_1m:1500,  flow_3m:2800,  flow_6m:3700,  flow_ytd:2500,  flow_1y:5500},
    {ticker:"SGOL", name:"Aberdeen Physical Gold Shares ETF",     flow_1w:640,  flow_1m:1200,  flow_3m:2200,  flow_6m:2900,  flow_ytd:1960,  flow_1y:4300},
    {ticker:"SLV",  name:"iShares Silver Trust",                  flow_1w:320,  flow_1m:590,   flow_3m:1080,  flow_6m:1440,  flow_ytd:970,   flow_1y:2100},
    {ticker:"SIVR", name:"Aberdeen Physical Silver Shares ETF",   flow_1w:380,  flow_1m:700,   flow_3m:1300,  flow_6m:1700,  flow_ytd:1150,  flow_1y:2500},
    {ticker:"DJP",  name:"iPath Bloomberg Commodity Index TR ETN",flow_1w:180,  flow_1m:330,   flow_3m:610,   flow_6m:810,   flow_ytd:550,   flow_1y:1200},
    {ticker:"GSG",  name:"iShares S&P GSCI Commodity ETF",        flow_1w:140,  flow_1m:260,   flow_3m:470,   flow_6m:630,   flow_ytd:430,   flow_1y:940},
    {ticker:"BCI",  name:"abrdn Bloomberg All Commodity ETF",     flow_1w:110,  flow_1m:200,   flow_3m:370,   flow_6m:490,   flow_ytd:330,   flow_1y:730},
    {ticker:"USO",  name:"United States Oil Fund",                flow_1w:-520, flow_1m:-960,  flow_3m:-1760, flow_6m:-2340, flow_ytd:-1580, flow_1y:-3460},
    {ticker:"UNG",  name:"United States Natural Gas Fund",        flow_1w:-380, flow_1m:-700,  flow_3m:-1290, flow_6m:-1710, flow_ytd:-1160, flow_1y:-2530},
    {ticker:"DBO",  name:"Invesco DB Oil Fund",                   flow_1w:-240, flow_1m:-440,  flow_3m:-810,  flow_6m:-1080, flow_ytd:-730,  flow_1y:-1590},
    {ticker:"CORN", name:"Teucrium Corn Fund",                    flow_1w:-90,  flow_1m:-170,  flow_3m:-310,  flow_6m:-410,  flow_ytd:-280,  flow_1y:-610},
    {ticker:"WEAT", name:"Teucrium Wheat Fund",                   flow_1w:-70,  flow_1m:-130,  flow_3m:-240,  flow_6m:-320,  flow_ytd:-220,  flow_1y:-470},
  ],
  "부동산":[
    {ticker:"VNQ",  name:"Vanguard Real Estate ETF",              flow_1w:48,  flow_1m:380, flow_3m:840, flow_6m:1620, flow_ytd:1220, flow_1y:3000},
    {ticker:"SCHH", name:"Schwab US REIT ETF",                    flow_1w:32,  flow_1m:253, flow_3m:558, flow_6m:1077, flow_ytd:811,  flow_1y:1995},
    {ticker:"IYR",  name:"iShares US Real Estate ETF",            flow_1w:24,  flow_1m:190, flow_3m:419, flow_6m:808,  flow_ytd:608,  flow_1y:1496},
    {ticker:"XLRE", name:"Real Estate Select Sector SPDR ETF",    flow_1w:18,  flow_1m:142, flow_3m:314, flow_6m:606,  flow_ytd:456,  flow_1y:1122},
    {ticker:"REET", name:"iShares Global REIT ETF",               flow_1w:12,  flow_1m:95,  flow_3m:210, flow_6m:404,  flow_ytd:304,  flow_1y:748},
    {ticker:"HOMZ", name:"Hoya Capital Housing ETF",              flow_1w:6,   flow_1m:47,  flow_3m:105, flow_6m:202,  flow_ytd:152,  flow_1y:374},
    {ticker:"REM",  name:"iShares Mortgage Real Estate ETF",      flow_1w:-10, flow_1m:-79, flow_3m:-174,flow_6m:-336, flow_ytd:-253, flow_1y:-622},
    {ticker:"ICF",  name:"iShares Cohen & Steers REIT ETF",       flow_1w:-6,  flow_1m:-47, flow_3m:-105,flow_6m:-202, flow_ytd:-152, flow_1y:-374},
    {ticker:"RWR",  name:"SPDR Dow Jones REIT ETF",               flow_1w:-8,  flow_1m:-63, flow_3m:-140,flow_6m:-270, flow_ytd:-203, flow_1y:-498},
    {ticker:"KBWY", name:"Invesco KBW Premium Yield Equity REIT", flow_1w:-4,  flow_1m:-32, flow_3m:-70, flow_6m:-135, flow_ytd:-102, flow_1y:-249},
  ],
  "대체투자/기타":[
    {ticker:"PAVE",  name:"Global X US Infrastructure Dev ETF",    flow_1w:20,  flow_1m:158, flow_3m:349, flow_6m:673, flow_ytd:507, flow_1y:1245},
    {ticker:"QAI",   name:"IQ Hedge Multi-Strategy Tracker ETF",   flow_1w:48,  flow_1m:380, flow_3m:840, flow_6m:1620,flow_ytd:1220,flow_1y:3000},
    {ticker:"MNA",   name:"IQ Merger Arbitrage ETF",               flow_1w:32,  flow_1m:253, flow_3m:558, flow_6m:1077,flow_ytd:811, flow_1y:1995},
    {ticker:"BTAL",  name:"AGF US Market Neutral Anti-Beta ETF",   flow_1w:24,  flow_1m:190, flow_3m:419, flow_6m:808, flow_ytd:608, flow_1y:1496},
    {ticker:"NYLI",  name:"New York Life Infrastructure ETF",      flow_1w:16,  flow_1m:126, flow_3m:279, flow_6m:538, flow_ytd:405, flow_1y:995},
    {ticker:"WTMF",  name:"WisdomTree Managed Futures ETF",        flow_1w:6,   flow_1m:47,  flow_3m:105, flow_6m:202, flow_ytd:152, flow_1y:374},
    {ticker:"DBMF",  name:"iMGP DBi Managed Futures Strategy ETF", flow_1w:-8,  flow_1m:-63, flow_3m:-140,flow_6m:-270,flow_ytd:-203,flow_1y:-498},
    {ticker:"CTA",   name:"Simplify Managed Futures ETF",          flow_1w:-6,  flow_1m:-47, flow_3m:-105,flow_6m:-202,flow_ytd:-152,flow_1y:-374},
    {ticker:"KMLM",  name:"KFA Mount Lucas Managed Futures ETF",   flow_1w:-10, flow_1m:-79, flow_3m:-174,flow_6m:-336,flow_ytd:-253,flow_1y:-622},
    {ticker:"FLSP",  name:"Franklin Systematic Style Premia ETF",  flow_1w:-4,  flow_1m:-32, flow_3m:-70, flow_6m:-135,flow_ytd:-102,flow_1y:-249},
  ],
  "크립토":[
    {ticker:"IBIT",  name:"iShares Bitcoin Trust ETF",             flow_1w:890,  flow_1m:6200,  flow_3m:14500, flow_6m:21800, flow_ytd:15200, flow_1y:42000},
    {ticker:"FBTC",  name:"Fidelity Wise Origin Bitcoin Fund",     flow_1w:620,  flow_1m:4300,  flow_3m:10100, flow_6m:15200, flow_ytd:10600, flow_1y:29000},
    {ticker:"BITB",  name:"Bitwise Bitcoin ETF",                   flow_1w:280,  flow_1m:1950,  flow_3m:4560,  flow_6m:6860,  flow_ytd:4780,  flow_1y:13100},
    {ticker:"ARKB",  name:"ARK 21Shares Bitcoin ETF",              flow_1w:180,  flow_1m:1260,  flow_3m:2940,  flow_6m:4430,  flow_ytd:3080,  flow_1y:8500},
    {ticker:"HODL",  name:"VanEck Bitcoin ETF",                    flow_1w:120,  flow_1m:840,   flow_3m:1960,  flow_6m:2950,  flow_ytd:2050,  flow_1y:5700},
    {ticker:"BTCO",  name:"Invesco Galaxy Bitcoin ETF",            flow_1w:80,   flow_1m:560,   flow_3m:1310,  flow_6m:1970,  flow_ytd:1370,  flow_1y:3800},
    {ticker:"GBTC",  name:"Grayscale Bitcoin Trust ETF",           flow_1w:-380, flow_1m:-2660, flow_3m:-6200, flow_6m:-9340, flow_ytd:-6500, flow_1y:-18000},
    {ticker:"ETHA",  name:"iShares Ethereum Trust ETF",            flow_1w:-150, flow_1m:-1050, flow_3m:-2450, flow_6m:-3690, flow_ytd:-2570, flow_1y:-7100},
    {ticker:"BITO",  name:"ProShares Bitcoin Strategy ETF",        flow_1w:-120, flow_1m:-840,  flow_3m:-1960, flow_6m:-2950, flow_ytd:-2060, flow_1y:-5600},
    {ticker:"FETH",  name:"Fidelity Ethereum Fund",                flow_1w:-90,  flow_1m:-630,  flow_3m:-1470, flow_6m:-2210, flow_ytd:-1540, flow_1y:-4200},
    {ticker:"ETHW",  name:"Bitwise Ethereum ETF",                  flow_1w:-60,  flow_1m:-420,  flow_3m:-980,  flow_6m:-1480, flow_ytd:-1030, flow_1y:-2800},
    {ticker:"BETE",  name:"ProShares Bitcoin & Ether Market Cap",  flow_1w:-40,  flow_1m:-280,  flow_3m:-650,  flow_6m:-980,  flow_ytd:-680,  flow_1y:-1900},
  ],
};

/* HIER / REGION / TICKER_DATA are authored in millions for readability;
   scale to thousands here to match DEMO base unit */
(function(){
  const FK=['flow_1w','flow_1m','flow_3m','flow_6m','flow_ytd','flow_1y'];
  function scaleRows(rows){
    rows.forEach(r=>{
      if(r.netasset!=null) r.netasset=Math.round(r.netasset*1000);
      FK.forEach(k=>{ if(r[k]!=null) r[k]=Math.round(r[k]*1000); });
    });
  }
  Object.values(HIER).forEach(cat=>{
    if(cat.leaves) scaleRows(cat.leaves);
    if(cat.groups) cat.groups.forEach(g=>scaleRows(g.children||[]));
  });
  Object.values(REGION).forEach(cat=>{
    if(cat.groups) cat.groups.forEach(g=>scaleRows(g.children||[]));
  });
  Object.values(TICKER_DATA).forEach(arr=>{
    arr.forEach(r=>FK.forEach(k=>{ if(r[k]!=null) r[k]=Math.round(r[k]*1000); }));
  });
})();
