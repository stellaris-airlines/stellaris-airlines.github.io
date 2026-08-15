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
  {code:'Q400',range:'domestic',planningSize:1,layout:'regional'},
  {code:'E175',range:'domestic',planningSize:2,layout:'regional'},
  {code:'A220-300',range:'domestic',planningSize:3,layout:'single'},
  {code:'A320neo',range:'domestic',planningSize:4,layout:'single'},
  {code:'A321neo',range:'domestic',planningSize:5,layout:'single-long'},
  {code:'A330-900',range:'international',planningSize:1,layout:'wide-eight'},
  {code:'B787-9',range:'international',planningSize:2,layout:'wide-nine'},
  {code:'A350-900',range:'international',planningSize:3,layout:'wide-nine'},
  {code:'B777-300ER',range:'international',planningSize:4,layout:'wide-ten'},
  {code:'A380-800',range:'international',planningSize:5,layout:'wide-ten-long'}
];

export const FARE_FAMILIES={
  economy:[
    {id:'economy-saver',cabin:'economy',name:'Economy Saver',multiplier:.88,mileageFactor:.7,seatRule:'paid'},
    {id:'economy-standard',cabin:'economy',name:'Economy Standard',multiplier:1,mileageFactor:1,seatRule:'standard-included'},
    {id:'economy-flex',cabin:'economy',name:'Economy Flex',multiplier:1.24,mileageFactor:1.2,seatRule:'front-included'}
  ],
  premium:[
    {id:'premium-standard',cabin:'premium',name:'Premium Standard',multiplier:1.58,mileageFactor:1.2,seatRule:'standard-included'},
    {id:'premium-flex',cabin:'premium',name:'Premium Flex',multiplier:1.88,mileageFactor:1.5,seatRule:'all-included'}
  ]
};

/* Temporary visual layouts. Replace only this block when official class layouts arrive. */
const TEMPORARY_LAYOUTS={
  regional:{
    economy:{firstRow:5,lastRow:22,letters:['A','B','C','D'],aisles:[2],frontRows:[5,6],extraRows:[12]},
    premium:{firstRow:1,lastRow:3,letters:['A','C','D','F'],aisles:[2],frontRows:[1],extraRows:[]}
  },
  single:{
    economy:{firstRow:7,lastRow:30,letters:['A','B','C','D','E','F'],aisles:[3],frontRows:[7,8,9],extraRows:[12,13]},
    premium:{firstRow:1,lastRow:4,letters:['A','C','D','F'],aisles:[2],frontRows:[1],extraRows:[]}
  },
  'single-long':{
    economy:{firstRow:7,lastRow:36,letters:['A','B','C','D','E','F'],aisles:[3],frontRows:[7,8,9],extraRows:[12,13,27]},
    premium:{firstRow:1,lastRow:5,letters:['A','C','D','F'],aisles:[2],frontRows:[1],extraRows:[]}
  },
  'wide-eight':{
    economy:{firstRow:15,lastRow:43,letters:['A','B','C','D','E','F','G','H'],aisles:[2,6],frontRows:[15,16,17],extraRows:[20,30]},
    premium:{firstRow:1,lastRow:7,letters:['A','C','D','F'],aisles:[2],frontRows:[1],extraRows:[]}
  },
  'wide-nine':{
    economy:{firstRow:16,lastRow:48,letters:['A','B','C','D','E','F','G','H','J'],aisles:[3,6],frontRows:[16,17,18],extraRows:[20,31]},
    premium:{firstRow:1,lastRow:8,letters:['A','C','D','F'],aisles:[2],frontRows:[1],extraRows:[]}
  },
  'wide-ten':{
    economy:{firstRow:18,lastRow:52,letters:['A','B','C','D','E','F','G','H','J','K'],aisles:[3,7],frontRows:[18,19,20],extraRows:[23,36]},
    premium:{firstRow:1,lastRow:9,letters:['A','C','D','F'],aisles:[2],frontRows:[1],extraRows:[]}
  },
  'wide-ten-long':{
    economy:{firstRow:20,lastRow:65,letters:['A','B','C','D','E','F','G','H','J','K'],aisles:[3,7],frontRows:[20,21,22],extraRows:[25,40,55]},
    premium:{firstRow:1,lastRow:12,letters:['A','C','D','F'],aisles:[2],frontRows:[1,2],extraRows:[]}
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
  return eligible.find(aircraft=>aircraft.planningSize>=tier)||eligible.at(-1);
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

export function seatLayout(aircraftCode,cabin='economy'){
  const aircraft=PASSENGER_FLEET.find(item=>item.code===aircraftCode);
  const config=aircraft&&TEMPORARY_LAYOUTS[aircraft.layout]?.[cabin];
  if(!config)return [];
  const result=[];
  for(let row=config.firstRow;row<=config.lastRow;row++){
    const type=config.extraRows.includes(row)?'extraLegroom':config.frontRows.includes(row)?'front':'standard';
    config.letters.forEach((letter,index)=>result.push({
      id:String(row)+letter,row,letter,type,aisleBefore:config.aisles.includes(index)
    }));
  }
  return result;
}

export function occupiedSeats(aircraftCode,cabin,seed){
  const seats=seatLayout(aircraftCode,cabin);
  const occupiedRate=.28+(stableNumber(seed+':rate')%43)/100;
  const count=Math.min(Math.max(0,seats.length-8),Math.round(seats.length*occupiedRate));
  return new Set(seats
    .map(seat=>({id:seat.id,score:stableNumber(seed+':'+seat.id)}))
    .sort((a,b)=>a.score-b.score)
    .slice(0,count)
    .map(item=>item.id));
}

export function seatSelectionFee(kind,familyId,seatType){
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
