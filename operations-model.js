const AIRPORT_LIST=[
  ['ICN','인천','Incheon','KR'],['GMP','김포','Gimpo','KR'],['CJU','제주','Jeju','KR'],['PUS','김해','Busan/Gimhae','KR'],
  ['CJJ','청주','Cheongju','KR'],['TAE','대구','Daegu','KR'],['MWX','무안','Muan','KR'],['YNY','양양','Yangyang','KR'],
  ['USN','울산','Ulsan','KR'],['RSU','여수','Yeosu','KR'],['HIN','사천','Sacheon','KR'],['KPO','포항경주','Pohang/Gyeongju','KR'],
  ['KWJ','광주','Gwangju','KR'],['KUV','군산','Gunsan','KR'],['WJU','원주','Wonju','KR'],
  ['NYC','뉴욕','New York','US'],['SEA','시애틀','Seattle','US'],['LAX','로스앤젤레스','Los Angeles','US'],
  ['HNL','호놀룰루','Honolulu','US'],['THT','타히티','Tahiti','PF'],['SYD','시드니','Sydney','AU'],
  ['LHR','런던','London','GB'],['CDG','파리','Paris','FR'],['STR','산토리니','Santorini','GR'],['DXB','두바이','Dubai','AE']
];

export const AIRPORTS=Object.fromEntries(AIRPORT_LIST.map(([code,nameKo,nameEn,country])=>[
  code,{code,nameKo,nameEn,country}
]));

const DOMESTIC_TIMES=['06:00','08:40','11:20','14:00','16:40','19:20','22:00'];

/*
 * Passenger timetable source of truth
 * - Domestic: the supplied seven-departure daily pattern and XS8XXX numbering.
 * - International: the supplied published flight numbers and local times.
 * Fare inputs are one-way planning bands. Market-reference routes follow comparable
 * nonstop Korean carrier pricing; routes without a nonstop reference use a distance
 * proxy plus a route-specific fuel component. They are not advertised live fares.
 */
const DOMESTIC_DESTINATIONS=[
  {destination:'GMP',duration:65,flightBase:8001,baseFare:43000,fuel:7700,taxes:4000,demandBand:2},
  {destination:'CJU',duration:80,flightBase:8021,baseFare:65000,fuel:9900,taxes:4000,demandBand:5},
  {destination:'PUS',duration:70,flightBase:8041,baseFare:59000,fuel:8800,taxes:4000,demandBand:4},
  {destination:'CJJ',duration:55,flightBase:8061,baseFare:47000,fuel:7700,taxes:4000,demandBand:2},
  {destination:'TAE',duration:65,flightBase:8081,baseFare:55000,fuel:8800,taxes:4000,demandBand:3},
  {destination:'MWX',duration:65,flightBase:8101,baseFare:52000,fuel:8800,taxes:4000,demandBand:2},
  {destination:'YNY',duration:60,flightBase:8121,baseFare:49000,fuel:7700,taxes:4000,demandBand:1},
  {destination:'USN',duration:70,flightBase:8141,baseFare:56000,fuel:8800,taxes:4000,demandBand:3},
  {destination:'RSU',duration:70,flightBase:8161,baseFare:55000,fuel:8800,taxes:4000,demandBand:2},
  {destination:'HIN',duration:70,flightBase:8181,baseFare:52000,fuel:8800,taxes:4000,demandBand:2},
  {destination:'KPO',duration:65,flightBase:8201,baseFare:52000,fuel:8800,taxes:4000,demandBand:2},
  {destination:'KWJ',duration:65,flightBase:8221,baseFare:54000,fuel:8800,taxes:4000,demandBand:3},
  {destination:'KUV',duration:60,flightBase:8241,baseFare:49000,fuel:7700,taxes:4000,demandBand:1},
  {destination:'WJU',duration:55,flightBase:8261,baseFare:47000,fuel:7700,taxes:4000,demandBand:1}
];

const INTERNATIONAL_ROUTES=[
  {destination:'NYC',baseFare:690000,fuel:128000,taxes:72000,demandBand:5,fareBasis:'market-reference',outbound:[['XS201','07:30','08:30',0],['XS203','12:30','13:30',0],['XS205','18:30','19:30',0]],inbound:[['XS200','12:30','17:30',1],['XS202','17:30','22:30',1],['XS204','23:30','04:30',2]]},
  {destination:'SEA',baseFare:480000,fuel:112000,taxes:68000,demandBand:3,fareBasis:'market-reference',outbound:[['XS211','07:30','08:00',0],['XS213','12:30','13:00',0],['XS215','18:30','19:00',0]],inbound:[['XS210','11:30','15:30',1],['XS212','16:30','20:30',1],['XS214','22:30','02:30',2]]},
  {destination:'LAX',baseFare:520000,fuel:112000,taxes:69000,demandBand:4,fareBasis:'market-reference',outbound:[['XS221','07:30','07:30',0],['XS223','12:30','12:30',0],['XS225','18:30','18:30',0]],inbound:[['XS220','11:30','16:00',1],['XS222','16:30','21:00',1],['XS224','22:30','03:00',2]]},
  {destination:'HNL',baseFare:390000,fuel:88000,taxes:65000,demandBand:2,fareBasis:'market-reference',outbound:[['XS231','07:30','20:30',-1],['XS233','12:30','01:30',0],['XS235','18:30','07:30',0]],inbound:[['XS230','13:00','19:00',1],['XS232','18:00','00:00',2],['XS234','00:00','06:00',1]]},
  {destination:'THT',baseFare:690000,fuel:120000,taxes:66000,demandBand:1,fareBasis:'distance-proxy',outbound:[['XS301','18:30','23:30',-1],['XS303','22:30','03:30',0],['XS305','01:30','06:30',0]],inbound:[['XS300','08:00','15:00',1],['XS302','12:00','19:00',1],['XS304','16:00','23:00',1]]},
  {destination:'SYD',baseFare:530000,fuel:92000,taxes:71000,demandBand:3,fareBasis:'market-reference',outbound:[['XS311','18:30','05:30',1],['XS313','22:30','09:30',1],['XS315','01:30','12:30',0]],inbound:[['XS310','09:00','18:00',0],['XS312','13:00','22:00',0],['XS314','17:00','02:00',1]]},
  {destination:'LHR',baseFare:650000,fuel:125000,taxes:91000,demandBand:4,fareBasis:'market-reference',outbound:[['XS401','12:30','18:30',0],['XS403','16:30','22:30',0],['XS405','21:30','03:30',1]],inbound:[['XS400','09:30','06:30',1],['XS402','13:30','10:30',1],['XS404','18:30','15:30',1]]},
  {destination:'CDG',baseFare:630000,fuel:125000,taxes:89000,demandBand:4,fareBasis:'market-reference',outbound:[['XS411','12:30','19:30',0],['XS413','16:30','23:30',0],['XS415','21:30','04:30',1]],inbound:[['XS410','10:00','06:30',1],['XS412','14:00','10:30',1],['XS414','19:00','15:30',1]]},
  {destination:'STR',baseFare:600000,fuel:120000,taxes:84000,demandBand:1,fareBasis:'distance-proxy',outbound:[['XS421','12:30','20:30',0],['XS423','16:30','00:30',1],['XS425','21:30','05:30',1]],inbound:[['XS420','09:00','07:00',1],['XS422','13:00','11:00',1],['XS424','18:00','16:00',1]]},
  {destination:'DXB',baseFare:440000,fuel:85000,taxes:70000,demandBand:3,fareBasis:'market-reference',outbound:[['XS501','12:30','18:00',0],['XS503','16:30','22:00',0],['XS505','21:30','03:00',1]],inbound:[['XS500','10:30','21:00',0],['XS502','14:30','01:00',1],['XS504','19:30','06:00',1]]}
];

/* Planning size is an assignment tier, not a published seat count. */
export const PASSENGER_FLEET=[
  {code:'ERJ-145',range:'domestic',planningSize:1},
  {code:'CRJ200',range:'domestic',planningSize:1},
  {code:'Q400',range:'domestic',planningSize:2},
  {code:'E175',range:'domestic',planningSize:2},
  {code:'B717-200',range:'domestic',planningSize:2},
  {code:'BAe 146',range:'domestic',planningSize:3},
  {code:'A220-300',range:'domestic',planningSize:3},
  {code:'B737-800',range:'domestic',planningSize:4},
  {code:'A320neo',range:'domestic',planningSize:4},
  {code:'A321neo',range:'domestic',planningSize:5},
  {code:'B787-8',range:'international',planningSize:1},
  {code:'A330-300',range:'international',planningSize:1},
  {code:'Concorde',range:'international',planningSize:1},
  {code:'B787-9',range:'international',planningSize:2},
  {code:'A330-800',range:'international',planningSize:2},
  {code:'A350-900',range:'international',planningSize:2},
  {code:'DC-10',range:'international',planningSize:2},
  {code:'B787-10',range:'international',planningSize:3},
  {code:'A330-900',range:'international',planningSize:3},
  {code:'A340-500',range:'international',planningSize:3},
  {code:'A350-1000',range:'international',planningSize:3},
  {code:'B777-300ER',range:'international',planningSize:4},
  {code:'B747-400',range:'international',planningSize:4},
  {code:'B747-8i',range:'international',planningSize:5},
  {code:'A380-800',range:'international',planningSize:5}
];

export const FARE_FAMILIES={
  economy:[
    {id:'economy-saver',cabin:'economy',name:'Economy Saver',multiplier:.88,mileageFactor:.7,seatRule:'paid'},
    {id:'economy-standard',cabin:'economy',name:'Economy Standard',multiplier:1,mileageFactor:1,seatRule:'standard-included'},
    {id:'economy-flex',cabin:'economy',name:'Economy Flex',multiplier:1.24,mileageFactor:1.2,seatRule:'front-included'}
  ],
  business:[
    {id:'business-standard',cabin:'business',name:'Business Standard',multiplier:1.58,mileageFactor:1.2,seatRule:'all-included'},
    {id:'business-flex',cabin:'business',name:'Business Flex',multiplier:1.88,mileageFactor:1.5,seatRule:'all-included'}
  ],
  first:[
    {id:'first-standard',cabin:'first',name:'First Standard',multiplier:2.65,mileageFactor:2,seatRule:'all-included'},
    {id:'first-flex',cabin:'first',name:'First Flex',multiplier:3.05,mileageFactor:2.5,seatRule:'all-included'}
  ]
};

function cabinLayout(seatCount,firstRow,letters,aisles,options={}){
  return {
    seatCount,firstRow,letters,aisles,
    partialLetters:options.partialLetters||[],
    frontRows:options.frontRows||0,
    extraRows:options.extraRows||[]
  };
}

const LAYOUT_LETTERS={
  oneTwo:['A','C','D'],
  twoTwo:['A','B','C','D'],
  twoThree:['A','C','D','E','F'],
  threeThree:['A','B','C','D','E','F'],
  firstTwo:['A','K'],
  firstThree:['A','D','K'],
  firstFour:['A','D','G','K'],
  businessSix:['A','C','D','G','H','K'],
  economyEight:['A','C','D','E','F','G','H','K'],
  economyNine:['A','B','C','D','E','F','H','J','K'],
  economyTen:['A','B','C','D','E','F','G','H','J','K'],
  dcNine:['A','C','D','E','F','G','H','J','K']
};

const A330_LAYOUT={
  first:cabinLayout(6,1,LAYOUT_LETTERS.firstTwo,[1]),
  business:cabinLayout(60,5,LAYOUT_LETTERS.businessSix,[2,4]),
  economy:cabinLayout(60,20,LAYOUT_LETTERS.economyEight,[2,6],{
    partialLetters:['A','C','H','K'],frontRows:2,extraRows:[24]
  })
};

const AIRCRAFT_LAYOUTS={
  'ERJ-145':{
    economy:cabinLayout(9,1,LAYOUT_LETTERS.oneTwo,[1],{frontRows:1,extraRows:[2]})
  },
  CRJ200:{
    economy:cabinLayout(12,1,LAYOUT_LETTERS.twoTwo,[2],{frontRows:1,extraRows:[2]})
  },
  Q400:{
    economy:cabinLayout(26,1,LAYOUT_LETTERS.twoTwo,[2],{
      partialLetters:['A','D'],frontRows:1,extraRows:[4]
    })
  },
  E175:{
    economy:cabinLayout(22,1,LAYOUT_LETTERS.twoTwo,[2],{
      partialLetters:['A','D'],frontRows:1,extraRows:[3]
    })
  },
  'B717-200':{
    economy:cabinLayout(32,1,LAYOUT_LETTERS.twoThree,[2],{
      partialLetters:['A','F'],frontRows:1,extraRows:[4]
    })
  },
  'BAe 146':{
    economy:cabinLayout(48,1,LAYOUT_LETTERS.threeThree,[3],{frontRows:2,extraRows:[5]})
  },
  'A220-300':{
    economy:cabinLayout(76,1,LAYOUT_LETTERS.twoThree,[2],{
      partialLetters:['A'],frontRows:2,extraRows:[8]
    })
  },
  'B737-800':{
    economy:cabinLayout(76,1,LAYOUT_LETTERS.threeThree,[3],{
      partialLetters:['A','B','E','F'],frontRows:2,extraRows:[6]
    })
  },
  A320neo:{
    economy:cabinLayout(88,1,LAYOUT_LETTERS.threeThree,[3],{
      partialLetters:['A','B','E','F'],frontRows:2,extraRows:[7]
    })
  },
  A321neo:{
    economy:cabinLayout(96,1,LAYOUT_LETTERS.threeThree,[3],{frontRows:2,extraRows:[8,13]})
  },
  'B787-8':{
    first:cabinLayout(6,1,LAYOUT_LETTERS.firstTwo,[1]),
    business:cabinLayout(60,5,LAYOUT_LETTERS.businessSix,[2,4]),
    economy:cabinLayout(42,20,LAYOUT_LETTERS.economyNine,[3,6],{
      partialLetters:['A','B','C','H','J','K'],frontRows:2,extraRows:[23]
    })
  },
  'B787-9':{
    first:cabinLayout(9,1,LAYOUT_LETTERS.firstThree,[1,2]),
    business:cabinLayout(54,5,LAYOUT_LETTERS.businessSix,[2,4]),
    economy:cabinLayout(66,20,LAYOUT_LETTERS.economyNine,[3,6],{
      partialLetters:['A','E','K'],frontRows:2,extraRows:[24]
    })
  },
  'B787-10':{
    first:cabinLayout(15,1,LAYOUT_LETTERS.firstThree,[1,2]),
    business:cabinLayout(54,7,LAYOUT_LETTERS.businessSix,[2,4]),
    economy:cabinLayout(78,20,LAYOUT_LETTERS.economyNine,[3,6],{
      partialLetters:['A','B','C','H','J','K'],frontRows:2,extraRows:[25]
    })
  },
  'A330-300':A330_LAYOUT,
  'A330-800':A330_LAYOUT,
  'A330-900':A330_LAYOUT,
  'A340-500':{
    first:cabinLayout(9,1,LAYOUT_LETTERS.firstThree,[1,2]),
    business:cabinLayout(66,5,LAYOUT_LETTERS.businessSix,[2,4]),
    economy:cabinLayout(72,20,LAYOUT_LETTERS.economyNine,[3,6],{frontRows:2,extraRows:[25]})
  },
  'B777-300ER':{
    first:cabinLayout(6,1,LAYOUT_LETTERS.firstTwo,[1]),
    business:cabinLayout(54,5,LAYOUT_LETTERS.businessSix,[2,4]),
    economy:cabinLayout(119,20,LAYOUT_LETTERS.economyTen,[3,7],{
      partialLetters:['A','B','C','D','E','G','H','J','K'],frontRows:2,extraRows:[26,32]
    })
  },
  'A350-900':{
    first:cabinLayout(9,1,LAYOUT_LETTERS.firstThree,[1,2]),
    business:cabinLayout(60,5,LAYOUT_LETTERS.businessSix,[2,4]),
    economy:cabinLayout(60,20,LAYOUT_LETTERS.economyNine,[3,6],{
      partialLetters:['A','B','C','H','J','K'],frontRows:2,extraRows:[24]
    })
  },
  'A350-1000':{
    first:cabinLayout(15,1,LAYOUT_LETTERS.firstThree,[1,2]),
    business:cabinLayout(60,7,LAYOUT_LETTERS.businessSix,[2,4]),
    economy:cabinLayout(72,20,LAYOUT_LETTERS.economyNine,[3,6],{frontRows:2,extraRows:[25]})
  },
  'B747-400':{
    first:cabinLayout(6,1,LAYOUT_LETTERS.firstTwo,[1]),
    business:cabinLayout(40,5,LAYOUT_LETTERS.firstFour,[1,3]),
    economy:cabinLayout(175,20,LAYOUT_LETTERS.economyTen,[3,7],{
      partialLetters:['A','B','F','J','K'],frontRows:2,extraRows:[27,34]
    })
  },
  'B747-8i':{
    first:cabinLayout(15,1,LAYOUT_LETTERS.firstThree,[1,2]),
    business:cabinLayout(58,7,LAYOUT_LETTERS.firstFour,[1,3],{partialLetters:['A','K']}),
    economy:cabinLayout(168,25,LAYOUT_LETTERS.economyTen,[3,7],{
      partialLetters:['A','B','C','D','G','H','J','K'],frontRows:2,extraRows:[31,38]
    })
  },
  'A380-800':{
    first:cabinLayout(12,1,LAYOUT_LETTERS.firstFour,[1,3]),
    business:cabinLayout(60,5,LAYOUT_LETTERS.firstFour,[1,3]),
    economy:cabinLayout(224,25,LAYOUT_LETTERS.economyTen,[3,7],{
      partialLetters:['A','B','J','K'],frontRows:2,extraRows:[32,40]
    })
  },
  Concorde:{
    economy:cabinLayout(136,1,LAYOUT_LETTERS.twoTwo,[2],{frontRows:2,extraRows:[10,20]})
  },
  'DC-10':{
    business:cabinLayout(24,1,LAYOUT_LETTERS.businessSix,[2,4]),
    economy:cabinLayout(119,10,LAYOUT_LETTERS.dcNine,[2,7],{
      partialLetters:['A','K'],frontRows:2,extraRows:[16]
    })
  }
};

export const ROUTES=[
  ...DOMESTIC_DESTINATIONS.map(route=>({origin:'ICN',kind:'domestic',fareBasis:'market-reference',...route})),
  ...INTERNATIONAL_ROUTES.map(route=>({origin:'ICN',kind:'international',...route}))
];

export function stableNumber(value){
  let result=0;
  for(const character of String(value))result=(result*31+character.charCodeAt(0))>>>0;
  return result;
}

function minutesOf(time){
  const [hour,minute]=time.split(':').map(Number);
  return hour*60+minute;
}

function timeOf(total){
  const value=((total%1440)+1440)%1440;
  return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
}

export function getRoute(origin,destination){
  return ROUTES.find(route=>
    (route.origin===origin&&route.destination===destination)||
    (route.origin===destination&&route.destination===origin)
  )||null;
}

export function availableDestinations(origin){
  return ROUTES.flatMap(route=>{
    if(route.origin===origin)return [route.destination];
    if(route.destination===origin)return [route.origin];
    return [];
  }).filter((code,index,list)=>list.indexOf(code)===index);
}

export function scheduledFlights(origin,destination,dateISO){
  const route=getRoute(origin,destination);
  if(!route)return [];
  if(route.kind==='domestic'){
    const outbound=origin==='ICN';
    return DOMESTIC_TIMES.map((time,index)=>{
      const departure=outbound?time:timeOf(minutesOf(time)+80);
      const arrival=timeOf(minutesOf(departure)+route.duration);
      const number='XS'+String(route.flightBase+index*2+(outbound?0:1));
      return {number,origin,destination,departure,arrival,arrivalDayOffset:minutesOf(arrival)<minutesOf(departure)?1:0,dateISO,kind:route.kind};
    });
  }
  const outbound=origin==='ICN';
  const source=outbound?route.outbound:route.inbound;
  return source.map(([number,departure,arrival,arrivalDayOffset])=>({
    number,origin,destination,departure,arrival,arrivalDayOffset,dateISO,kind:route.kind
  }));
}

export function addMonths(date,months){
  const result=new Date(date);
  const originalDay=result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth()+months);
  const lastDay=new Date(result.getFullYear(),result.getMonth()+1,0).getDate();
  result.setDate(Math.min(originalDay,lastDay));
  return result;
}

export function dateISO(date){
  const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}

function assignmentShift(flight){
  const date=new Date(flight.dateISO+'T12:00:00');
  const peak=[7,8,12].includes(date.getMonth()+1)?1:0;
  const weekend=[0,5,6].includes(date.getDay())?1:0;
  const variation=(stableNumber(flight.number+flight.dateISO)%3)-1;
  return peak+weekend+variation>=2?1:peak+weekend+variation<=-1?-1:0;
}

function aircraftFor(flight,route){
  const range=route.kind==='domestic'?'domestic':'international';
  const eligible=PASSENGER_FLEET.filter(aircraft=>aircraft.range===range);
  const tier=Math.max(1,Math.min(5,route.demandBand+assignmentShift(flight)));
  const exactTier=eligible.filter(aircraft=>aircraft.planningSize===tier);
  const pool=exactTier.length?exactTier:eligible;
  const index=stableNumber(flight.number+flight.dateISO+route.destination)%pool.length;
  return pool[index];
}

export function forecastOperation(flight){
  const route=getRoute(flight.origin,flight.destination);
  if(!route)throw new Error('Unknown route');
  const travelDate=new Date(flight.dateISO+'T12:00:00');
  const today=new Date();
  today.setHours(0,0,0,0);
  const daysOut=Math.max(0,Math.round((travelDate-today)/86400000));
  const month=travelDate.getMonth()+1;
  const weekend=[0,5,6].includes(travelDate.getDay())?1.06:1;
  const season=[7,8,12].includes(month)?1.16:[1,2].includes(month)?1.06:1;
  const advance=daysOut<=3?1.42:daysOut<=14?1.27:daysOut<=30?1.15:daysOut<=90?1.04:.94;
  const inventory=.92+(stableNumber(flight.number+flight.dateISO)%23)/100;
  return {
    aircraft:aircraftFor(flight,route),
    daysOut,
    marketFactor:season*weekend*advance*inventory,
    fareBasis:route.fareBasis
  };
}

export function fareFamilies(cabin){
  return FARE_FAMILIES[cabin]||FARE_FAMILIES.economy;
}

export function quoteFare(flight,familyId,passengerCount=1){
  const route=getRoute(flight.origin,flight.destination);
  if(!route)throw new Error('Unknown route');
  const family=Object.values(FARE_FAMILIES).flat().find(item=>item.id===familyId);
  if(!family)throw new Error('Unknown fare family');
  const operation=flight.operation||forecastOperation(flight);
  const adjustedBase=Math.round(route.baseFare*operation.marketFactor*family.multiplier/1000)*1000;
  const pricePerPassenger=adjustedBase+route.fuel+route.taxes;
  return {
    family,
    adjustedBase,
    fuelSurcharge:route.fuel,
    taxes:route.taxes,
    pricePerPassenger,
    total:pricePerPassenger*Number(passengerCount),
    fareBasis:route.fareBasis
  };
}

export function aircraftCabins(aircraftCode){
  const layout=AIRCRAFT_LAYOUTS[aircraftCode];
  return ['economy','business','first'].filter(cabin=>layout?.[cabin]);
}

export function seatLayout(aircraftCode,cabin='economy'){
  const config=AIRCRAFT_LAYOUTS[aircraftCode]?.[cabin];
  if(!config)return [];
  const fullRows=Math.floor(config.seatCount/config.letters.length);
  const remainder=config.seatCount%config.letters.length;
  const rowCount=fullRows+(remainder?1:0);
  const result=[];
  for(let offset=0;offset<rowCount;offset++){
    const row=config.firstRow+offset;
    const isPartial=remainder>0&&offset===rowCount-1;
    const rowLetters=isPartial
      ?(config.partialLetters.length===remainder?config.partialLetters:config.letters.slice(0,remainder))
      :config.letters;
    const type=config.extraRows.includes(row)
      ?'extraLegroom'
      :offset<config.frontRows?'front':'standard';
    rowLetters.forEach((letter,index)=>{
      const fullIndex=config.letters.indexOf(letter);
      const previousIndex=index?config.letters.indexOf(rowLetters[index-1]):-1;
      const aisleBefore=index>0&&config.aisles.some(aisle=>aisle>previousIndex&&aisle<=fullIndex);
      result.push({id:String(row)+letter,row,letter,type,aisleBefore});
    });
  }
  return result;
}

function seededRandom(seed){
  let state=stableNumber(seed)||0x9e3779b9;
  return ()=>{
    state=(state+0x6d2b79f5)>>>0;
    let value=state;
    value=Math.imul(value^(value>>>15),value|1);
    value^=value+Math.imul(value^(value>>>7),value|61);
    return ((value^(value>>>14))>>>0)/4294967296;
  };
}

export function occupiedSeats(aircraftCode,cabin,seed){
  const seats=seatLayout(aircraftCode,cabin);
  const random=seededRandom(seed+':occupied');
  const occupiedRate=.24+random()*.44;
  const count=Math.min(Math.max(0,seats.length-8),Math.round(seats.length*occupiedRate));
  const shuffled=seats.map(seat=>seat.id);
  for(let index=shuffled.length-1;index>0;index--){
    const target=Math.floor(random()*(index+1));
    [shuffled[index],shuffled[target]]=[shuffled[target],shuffled[index]];
  }
  return new Set(shuffled.slice(0,count));
}

export function seatSelectionFee(kind,familyId,seatType){
  if(familyId.startsWith('business-')||familyId.startsWith('first-'))return 0;
  const international=kind==='international';
  const fees=international
    ?{standard:15000,front:45000,extraLegroom:90000}
    :{standard:5000,front:12000,extraLegroom:25000};
  if(familyId==='economy-standard')fees.standard=0;
  if(familyId==='economy-flex'){
    fees.standard=0;
    fees.front=0;
    fees.extraLegroom=international?50000:12000;
  }
  if(familyId==='premium-standard'){
    fees.standard=0;
    fees.front=international?20000:8000;
    fees.extraLegroom=0;
  }
  if(familyId==='premium-flex')return 0;
  return fees[seatType]||0;
}
