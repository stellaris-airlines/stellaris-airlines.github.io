const AIRPORT_LIST=[
  ['ICN','인천','Incheon','KR'],['GMP','김포','Gimpo','KR'],['CJU','제주','Jeju','KR'],['PUS','김해','Busan/Gimhae','KR'],
  ['CJJ','청주','Cheongju','KR'],['TAE','대구','Daegu','KR'],['MWX','무안','Muan','KR'],['YNY','양양','Yangyang','KR'],
  ['USN','울산','Ulsan','KR'],['RSU','여수','Yeosu','KR'],['HIN','사천','Sacheon','KR'],['KPO','포항경주','Pohang/Gyeongju','KR'],
  ['KWJ','광주','Gwangju','KR'],['KUV','군산','Gunsan','KR'],['WJU','원주','Wonju','KR'],
  ['SFO','샌프란시스코','San Francisco','US'],['NYC','뉴욕','New York','US'],['SEA','시애틀','Seattle','US'],
  ['LAX','로스앤젤레스','Los Angeles','US'],['HNL','호놀룰루','Honolulu','US'],['LHR','런던','London','GB'],
  ['CDG','파리','Paris','FR'],['STR','산토리니','Santorini','GR'],['DXB','두바이','Dubai','AE'],
  ['THT','타히티','Tahiti','PF'],['SYD','시드니','Sydney','AU']
];

export const AIRPORTS=Object.fromEntries(AIRPORT_LIST.map(([code,nameKo,nameEn,country])=>[
  code,{code,nameKo,nameEn,country}
]));

const DOMESTIC_DESTINATIONS=[
  ['GMP',65,8001,72000,104],['CJU',80,8021,79000,172],['PUS',70,8041,76000,156],['CJJ',55,8061,68000,86],
  ['TAE',65,8081,73000,126],['MWX',65,8101,71000,92],['YNY',60,8121,69000,74],['USN',70,8141,74000,108],
  ['RSU',70,8161,74000,98],['HIN',70,8181,72000,82],['KPO',65,8201,72000,88],['KWJ',65,8221,71000,118],
  ['KUV',60,8241,69000,76],['WJU',55,8261,68000,68]
];
const DOMESTIC_TIMES=['06:00','08:40','11:20','14:00','16:40','19:20','22:00'];

const INTERNATIONAL_ROUTES=[
  {destination:'SFO',baseFare:620000,demand:338,outbound:[['XS191','09:30','04:30',0],['XS193','14:30','09:30',0],['XS195','20:30','15:30',0]],inbound:[['XS190','10:30','15:30',1],['XS192','15:30','20:30',1],['XS194','21:30','02:30',2]]},
  {destination:'NYC',baseFare:780000,demand:390,outbound:[['XS201','07:30','08:30',0],['XS203','12:30','13:30',0],['XS205','18:30','19:30',0]],inbound:[['XS200','12:30','17:30',1],['XS202','17:30','22:30',1],['XS204','23:30','04:30',2]]},
  {destination:'SEA',baseFare:590000,demand:294,outbound:[['XS211','07:30','08:00',0],['XS213','12:30','13:00',0],['XS215','18:30','19:00',0]],inbound:[['XS210','11:30','15:30',1],['XS212','16:30','20:30',1],['XS214','22:30','02:30',2]]},
  {destination:'LAX',baseFare:610000,demand:356,outbound:[['XS221','07:30','07:30',0],['XS223','12:30','12:30',0],['XS225','18:30','18:30',0]],inbound:[['XS220','11:30','16:00',1],['XS222','16:30','21:00',1],['XS224','22:30','03:00',2]]},
  {destination:'HNL',baseFare:470000,demand:265,outbound:[['XS231','07:30','20:30',-1],['XS233','12:30','01:30',0],['XS235','18:30','07:30',0]],inbound:[['XS230','13:00','19:00',1],['XS232','18:00','00:00',2],['XS234','00:00','06:00',1]]},
  {destination:'THT',baseFare:720000,demand:214,outbound:[['XS301','18:30','23:30',-1],['XS303','22:30','03:30',0],['XS305','01:30','06:30',0]],inbound:[['XS300','08:00','15:00',1],['XS302','12:00','19:00',1],['XS304','16:00','23:00',1]]},
  {destination:'SYD',baseFare:650000,demand:302,outbound:[['XS311','18:30','05:30',1],['XS313','22:30','09:30',1],['XS315','01:30','12:30',0]],inbound:[['XS310','09:00','18:00',0],['XS312','13:00','22:00',0],['XS314','17:00','02:00',1]]},
  {destination:'LHR',baseFare:740000,demand:326,outbound:[['XS401','12:30','18:30',0],['XS403','16:30','22:30',0],['XS405','21:30','03:30',1]],inbound:[['XS400','09:30','06:30',1],['XS402','13:30','10:30',1],['XS404','18:30','15:30',1]]},
  {destination:'CDG',baseFare:720000,demand:344,outbound:[['XS411','12:30','19:30',0],['XS413','16:30','23:30',0],['XS415','21:30','04:30',1]],inbound:[['XS410','10:00','06:30',1],['XS412','14:00','10:30',1],['XS414','19:00','15:30',1]]},
  {destination:'STR',baseFare:690000,demand:224,outbound:[['XS421','12:30','20:30',0],['XS423','16:30','00:30',1],['XS425','21:30','05:30',1]],inbound:[['XS420','09:00','07:00',1],['XS422','13:00','11:00',1],['XS424','18:00','16:00',1]]},
  {destination:'DXB',baseFare:510000,demand:278,outbound:[['XS501','12:30','18:00',0],['XS503','16:30','22:00',0],['XS505','21:30','03:00',1]],inbound:[['XS500','10:30','21:00',0],['XS502','14:30','01:00',1],['XS504','19:30','06:00',1]]}
];

export const PASSENGER_FLEET=[
  {code:'Q400',capacity:78,range:'domestic',letters:['A','B','C','D'],aisles:[2]},
  {code:'E175',capacity:88,range:'domestic',letters:['A','B','C','D'],aisles:[2]},
  {code:'A220-300',capacity:140,range:'domestic',letters:['A','B','C','D','E'],aisles:[2]},
  {code:'A320neo',capacity:180,range:'domestic',letters:['A','B','C','D','E','F'],aisles:[3]},
  {code:'A321neo',capacity:220,range:'domestic',letters:['A','B','C','D','E','F'],aisles:[3]},
  {code:'A330-900',capacity:287,range:'international',letters:['A','B','C','D','E','F','G','H'],aisles:[2,6]},
  {code:'B787-9',capacity:290,range:'international',letters:['A','B','C','D','E','F','G','H','J'],aisles:[3,6]},
  {code:'A350-900',capacity:325,range:'international',letters:['A','B','C','D','E','F','G','H','J'],aisles:[3,6]},
  {code:'B777-300ER',capacity:396,range:'international',letters:['A','B','C','D','E','F','G','H','J','K'],aisles:[3,7]},
  {code:'A380-800',capacity:520,range:'international',letters:['A','B','C','D','E','F','G','H','J','K'],aisles:[3,7]}
];

export const CARGO_FLEET=[
  {code:'B757 Freighter',capacityTonnes:35},
  {code:'B767 Freighter',capacityTonnes:52},
  {code:'B777 Freighter',capacityTonnes:102},
  {code:'A350 Freighter',capacityTonnes:109},
  {code:'B747 Freighter',capacityTonnes:125}
];

export const CARGO_ROUTES=[
  {name:'Pacific Express',origin:'ICN',destination:'LAX',country:'UNITED STATES',flag:'🇺🇸',baseTonnes:88,flights:[['XC701','02:20','20:10'],['XC703','14:20','08:10']],returns:[['XC700','22:40','04:50'],['XC702','10:40','16:50']]},
  {name:'Atlantic Cargo',origin:'ICN',destination:'NYC',country:'UNITED STATES',flag:'🇺🇸',baseTonnes:111,flights:[['XC711','01:10','02:25'],['XC713','13:10','14:25']],returns:[['XC710','05:00','10:30'],['XC712','17:00','22:30']]},
  {name:'Emirates Link',origin:'ICN',destination:'DXB',country:'UNITED ARAB EMIRATES',flag:'🇦🇪',baseTonnes:72,flights:[['XC721','03:30','09:15'],['XC723','15:30','21:15']],returns:[['XC720','11:15','21:45'],['XC722','23:15','09:45']]},
  {name:'Euro Freight',origin:'ICN',destination:'LHR',country:'UNITED KINGDOM',flag:'🇬🇧',baseTonnes:96,flights:[['XC731','00:40','06:55'],['XC733','12:40','18:55']],returns:[['XC730','09:20','06:10'],['XC732','21:20','18:10']]},
  {name:'Oceania Cargo',origin:'ICN',destination:'SYD',country:'AUSTRALIA',flag:'🇦🇺',baseTonnes:83,flights:[['XC741','04:10','15:20'],['XC743','16:10','03:20']],returns:[['XC740','18:10','03:10'],['XC742','06:10','15:10']]},
  {name:'Island Logistics',origin:'ICN',destination:'HNL',country:'UNITED STATES',flag:'🇺🇸',baseTonnes:43,flights:[['XC751','05:20','18:25'],['XC753','17:20','06:25']],returns:[['XC750','21:10','03:20'],['XC752','09:10','15:20']]}
];

export const ROUTES=[
  ...DOMESTIC_DESTINATIONS.map(([destination,duration,flightBase,baseFare,demand])=>({
    origin:'ICN',destination,kind:'domestic',duration,flightBase,baseFare,demand
  })),
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

export function forecastOperation(flight){
  const route=getRoute(flight.origin,flight.destination);
  if(!route)throw new Error('Unknown route');
  const travelDate=new Date(flight.dateISO+'T12:00:00');
  const today=new Date();
  today.setHours(0,0,0,0);
  const daysOut=Math.max(0,Math.round((travelDate-today)/86400000));
  const month=travelDate.getMonth()+1;
  const day=travelDate.getDay();
  const season=[7,8,12].includes(month)?1.16:[1,2].includes(month)?1.06:1;
  const weekend=[0,5,6].includes(day)?1.08:1;
  const variation=.88+(stableNumber(flight.number+flight.dateISO)%25)/100;
  const expected=Math.max(24,Math.round(route.demand*season*weekend*variation));
  const range=route.kind==='domestic'?'domestic':'international';
  const eligible=PASSENGER_FLEET.filter(aircraft=>aircraft.range===range);
  const aircraft=eligible.find(candidate=>candidate.capacity>=expected/.9)||eligible.at(-1);
  const predictedPassengers=Math.min(expected,Math.floor(aircraft.capacity*.97));
  const bookingProgress=.14+(1-Math.min(daysOut,180)/180)*.72;
  const booked=Math.min(aircraft.capacity,Math.max(0,Math.floor(predictedPassengers*bookingProgress)));
  const remaining=Math.max(0,aircraft.capacity-booked);
  const predictedLoad=Math.round(predictedPassengers/aircraft.capacity*100);
  const currentLoad=Math.round(booked/aircraft.capacity*100);
  const demandFactor=.82+predictedLoad/100*.5;
  const fare=Math.round(route.baseFare*demandFactor/1000)*1000;
  return {aircraft,expectedPassengers:predictedPassengers,predictedLoad,booked,currentLoad,remaining,fare,daysOut};
}

export function seatLayout(aircraftCode){
  const aircraft=PASSENGER_FLEET.find(item=>item.code===aircraftCode);
  if(!aircraft)return [];
  const result=[];
  let created=0;
  for(let row=1;created<aircraft.capacity;row++){
    for(const letter of aircraft.letters){
      if(created>=aircraft.capacity)break;
      result.push({id:String(row)+letter,row,letter});
      created++;
    }
  }
  return result;
}

export function occupiedSeats(aircraftCode,booked,seed){
  const seats=seatLayout(aircraftCode);
  return new Set(seats
    .map(seat=>({id:seat.id,score:stableNumber(seed+':'+seat.id)}))
    .sort((a,b)=>a.score-b.score)
    .slice(0,Math.min(booked,seats.length))
    .map(item=>item.id));
}

export function cargoAssignment(route,dateKey){
  const multiplier=.86+(stableNumber(route.name+dateKey)%31)/100;
  const expectedTonnes=Math.round(route.baseTonnes*multiplier);
  const aircraft=CARGO_FLEET.find(item=>item.capacityTonnes>=expectedTonnes/.9)||CARGO_FLEET.at(-1);
  const load=Math.min(97,Math.round(expectedTonnes/aircraft.capacityTonnes*100));
  return {aircraft,expectedTonnes:Math.min(expectedTonnes,aircraft.capacityTonnes),load};
}
