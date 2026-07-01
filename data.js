const COLORS={
  "주식":"#3a36c9","채권":"#15b8b0","자산배분":"#e0973c","상품":"#9b6fc0",
  "부동산":"#3d8fb5","대체투자/기타":"#7d8a99","크립토":"#d4a32f"
};
const DEMO={
  ALL:[
    {category:"주식",netasset:12064535,flow_1w:12381,flow_1m:200936,flow_3m:353111,flow_6m:757261,flow_ytd:511687,flow_1y:1345697},
    {category:"채권",netasset:2433215,flow_1w:8442,flow_1m:45412,flow_3m:122118,flow_6m:284296,flow_ytd:226364,flow_1y:515936},
    {category:"자산배분",netasset:41855,flow_1w:192,flow_1m:967,flow_3m:3863,flow_6m:7344,flow_ytd:6013,flow_1y:13363},
    {category:"상품",netasset:331603,flow_1w:26762,flow_1m:25729,flow_3m:43655,flow_6m:38841,flow_ytd:28448,flow_1y:70399},
    {category:"부동산",netasset:92084,flow_1w:109,flow_1m:971,flow_3m:1298,flow_6m:4339,flow_ytd:1574,flow_1y:6458},
    {category:"대체투자/기타",netasset:30080,flow_1w:302,flow_1m:1397,flow_3m:4519,flow_6m:6885,flow_ytd:6164,flow_1y:10658},
    {category:"크립토",netasset:125050,flow_1w:-908,flow_1m:-349,flow_3m:4566,flow_6m:2417,flow_ytd:2199,flow_1y:61339},
  ],
  US:[
    {category:"주식",netasset:12064535,flow_1w:12381,flow_1m:200936,flow_3m:353111,flow_6m:757261,flow_ytd:511687,flow_1y:1345697},
    {category:"채권",netasset:2433215,flow_1w:8442,flow_1m:45412,flow_3m:122118,flow_6m:284296,flow_ytd:226364,flow_1y:515936},
    {category:"자산배분",netasset:41855,flow_1w:192,flow_1m:967,flow_3m:3863,flow_6m:7344,flow_ytd:6013,flow_1y:13363},
    {category:"상품",netasset:331603,flow_1w:26762,flow_1m:25729,flow_3m:43655,flow_6m:38841,flow_ytd:28448,flow_1y:70399},
    {category:"부동산",netasset:92084,flow_1w:109,flow_1m:971,flow_3m:1298,flow_6m:4339,flow_ytd:1574,flow_1y:6458},
    {category:"대체투자/기타",netasset:30080,flow_1w:302,flow_1m:1397,flow_3m:4519,flow_6m:6885,flow_ytd:6164,flow_1y:10658},
    {category:"크립토",netasset:125050,flow_1w:-908,flow_1m:-349,flow_3m:4566,flow_6m:2417,flow_ytd:2199,flow_1y:61339},
  ],
  HK:[
    {category:"주식",netasset:1900000,flow_1w:1500,flow_1m:28000,flow_3m:52000,flow_6m:110000,flow_ytd:78000,flow_1y:210000},
    {category:"채권",netasset:520000,flow_1w:1400,flow_1m:7800,flow_3m:21000,flow_6m:48000,flow_ytd:39000,flow_1y:88000},
    {category:"상품",netasset:72000,flow_1w:5200,flow_1m:5000,flow_3m:8500,flow_6m:7600,flow_ytd:5600,flow_1y:14000},
    {category:"크립토",netasset:34000,flow_1w:-180,flow_1m:-90,flow_3m:1800,flow_6m:900,flow_ytd:820,flow_1y:18000},
    {category:"자산배분",netasset:18000,flow_1w:80,flow_1m:400,flow_3m:1600,flow_6m:3000,flow_ytd:2500,flow_1y:5500},
  ],
  JP:[
    {category:"주식",netasset:940000,flow_1w:600,flow_1m:9800,flow_3m:18000,flow_6m:38000,flow_ytd:26000,flow_1y:68000},
    {category:"채권",netasset:230000,flow_1w:430,flow_1m:2200,flow_3m:6100,flow_6m:14000,flow_ytd:11000,flow_1y:25000},
    {category:"상품",netasset:32000,flow_1w:2800,flow_1m:2700,flow_3m:4600,flow_6m:4100,flow_ytd:3000,flow_1y:7400},
    {category:"부동산",netasset:21000,flow_1w:30,flow_1m:260,flow_3m:420,flow_6m:1200,flow_ytd:560,flow_1y:2100},
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
