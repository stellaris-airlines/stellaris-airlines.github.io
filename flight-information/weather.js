(()=>{
'use strict';

const I18N={
  ko:{windowNote:'예정 출발 3시간 이내 항공편만 표시됩니다.',flight:'편명',departure:'출발 예정',arrival:'도착 예정',status:'운항 상태',normal:'정상 운항',changed:'운항 시간 변경',delay:'지연',cancel:'운항 취소',boarding:'탑승 준비',loading:'운항 상태를 계산하는 중입니다…',none:'현재 출발 3시간 이내에 예정된 항공편이 없습니다.',refresh:'새로고침',updated:'마지막 업데이트',minute:'분'},
  'en-US':{windowNote:'Only flights scheduled to depart within the next 3 hours are shown.',flight:'Flight',departure:'Scheduled departure',arrival:'Scheduled arrival',status:'Status',normal:'On time',changed:'Time changed',delay:'Delayed',cancel:'Cancelled',boarding:'Boarding soon',loading:'Calculating flight status…',none:'There are no flights scheduled to depart within the next 3 hours.',refresh:'Refresh',updated:'Last updated',minute:'min'},
  'en-GB':{windowNote:'Only flights scheduled to depart within the next 3 hours are shown.',flight:'Flight',departure:'Scheduled departure',arrival:'Scheduled arrival',status:'Status',normal:'On time',changed:'Time changed',delay:'Delayed',cancel:'Cancelled',boarding:'Boarding soon',loading:'Calculating flight status…',none:'There are no flights scheduled to depart within the next 3 hours.',refresh:'Refresh',updated:'Last updated',minute:'min'},
  'zh-CN':{windowNote:'仅显示未来3小时内计划起飞的航班。',flight:'航班号',departure:'预计出发',arrival:'预计到达',status:'航班状态',normal:'正常运行',changed:'时间变更',delay:'延误',cancel:'取消',boarding:'准备登机',loading:'正在计算航班状态…',none:'未来3小时内没有计划起飞的航班。',refresh:'刷新',updated:'最后更新',minute:'分钟'},
  ja:{windowNote:'出発予定時刻の3時間前から表示します。',flight:'便名',departure:'出発予定',arrival:'到着予定',status:'運航状況',normal:'通常運航',changed:'時刻変更',delay:'遅延',cancel:'欠航',boarding:'搭乗準備',loading:'運航状況を計算しています…',none:'3時間以内に出発予定の便はありません。',refresh:'更新',updated:'最終更新',minute:'分'},
  es:{windowNote:'Solo se muestran los vuelos con salida prevista en las próximas 3 horas.',flight:'Vuelo',departure:'Salida prevista',arrival:'Llegada prevista',status:'Estado',normal:'Operación normal',changed:'Horario modificado',delay:'Retrasado',cancel:'Cancelado',boarding:'Embarque próximo',loading:'Calculando el estado del vuelo…',none:'No hay vuelos previstos en las próximas 3 horas.',refresh:'Actualizar',updated:'Última actualización',minute:'min'},
  fr:{windowNote:'Seuls les vols dont le départ est prévu dans les 3 prochaines heures sont affichés.',flight:'Vol',departure:'Départ prévu',arrival:'Arrivée prévue',status:'Statut',normal:'À l’heure',changed:'Horaire modifié',delay:'Retardé',cancel:'Annulé',boarding:'Embarquement prochain',loading:'Calcul du statut du vol…',none:'Aucun vol ne doit partir dans les 3 prochaines heures.',refresh:'Actualiser',updated:'Dernière mise à jour',minute:'min'}
};

const AIRPORTS={
  ICN:{lat:37.4602,lon:126.4407,tz:'Asia/Seoul'},
  SFO:{lat:37.6213,lon:-122.379,tz:'America/Los_Angeles'},
  GMP:{lat:37.5583,lon:126.7906,tz:'Asia/Seoul'},
  CJU:{lat:33.5104,lon:126.4914,tz:'Asia/Seoul'},
  PUS:{lat:35.1795,lon:128.9382,tz:'Asia/Seoul'},
  NYC:{lat:40.6413,lon:-73.7781,tz:'America/New_York'},
  SEA:{lat:47.4502,lon:-122.3088,tz:'America/Los_Angeles'},
  LAX:{lat:33.9416,lon:-118.4085,tz:'America/Los_Angeles'},
  HNL:{lat:21.3187,lon:-157.9225,tz:'Pacific/Honolulu'},
  THT:{lat:-17.5537,lon:-149.607,tz:'Pacific/Tahiti'},
  SYD:{lat:-33.9399,lon:151.1753,tz:'Australia/Sydney'},
  LHR:{lat:51.47,lon:-0.4543,tz:'Europe/London'},
  CDG:{lat:49.0097,lon:2.5479,tz:'Europe/Paris'},
  STR:{lat:36.3992,lon:25.4793,tz:'Europe/Athens'},
  DXB:{lat:25.2532,lon:55.3657,tz:'Asia/Dubai'}
};

const board=document.querySelector('[data-flight-status-board]');
if(!board)return;
const note=document.querySelector('[data-status-window-note]');
const updated=document.querySelector('[data-status-updated]');
const refresh=document.querySelector('[data-status-refresh]');
const weatherCache=new Map();

const getLang=()=>{
  const value=localStorage.getItem('stellaris-language')||document.documentElement.lang||'ko';
  return I18N[value]?value:'ko';
};
const t=key=>I18N[getLang()][key]||I18N['en-US'][key]||key;
const locale=()=>({ko:'ko-KR','en-US':'en-US','en-GB':'en-GB','zh-CN':'zh-CN',ja:'ja-JP',es:'es-ES',fr:'fr-FR'})[getLang()]||'ko-KR';

function zoneParts(date,timeZone){
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));
}

function zonedDate(day,time,timeZone){
  const [hour,minute]=time.split(':').map(Number);
  const guess=Date.UTC(day.year,day.month-1,day.day,hour,minute,0);
  const first=zoneParts(new Date(guess),timeZone);
  let actual=guess-(Date.UTC(first.year,first.month-1,first.day,first.hour,first.minute,first.second)-guess);
  const second=zoneParts(new Date(actual),timeZone);
  actual=guess-(Date.UTC(second.year,second.month-1,second.day,second.hour,second.minute,second.second)-actual);
  return new Date(actual);
}

function shiftDay(day,amount){
  const date=new Date(Date.UTC(day.year,day.month-1,day.day+amount));
  return {year:date.getUTCFullYear(),month:date.getUTCMonth()+1,day:date.getUTCDate()};
}

function parseFlights(){
  return [...document.querySelectorAll('.timetable-pair > div')].map(item=>{
    const number=item.querySelector('b')?.textContent.trim();
    const schedule=item.querySelector('span')?.textContent.replace(/\s+/g,' ').trim()||'';
    const match=schedule.match(/^([A-Z]{3})\s+(\d{2}:\d{2})(?:\s+\([^)]*\))?\s+→\s+([A-Z]{3})\s+(\d{2}:\d{2})/);
    if(!number||!match||!AIRPORTS[match[1]]||!AIRPORTS[match[3]])return null;
    return {number,origin:match[1],departure:match[2],destination:match[3],arrival:match[4]};
  }).filter(Boolean);
}

function upcomingFlights(now=new Date()){
  const result=[];
  for(const flight of parseFlights()){
    const local=zoneParts(now,AIRPORTS[flight.origin].tz);
    const today={year:local.year,month:local.month,day:local.day};
    for(const offset of [0,1]){
      const day=shiftDay(today,offset);
      const departureDate=zonedDate(day,flight.departure,AIRPORTS[flight.origin].tz);
      const minutes=(departureDate-now)/60000;
      if(minutes>=0&&minutes<=180){
        result.push({...flight,departureDate,minutes,key:flight.number+'-'+day.year+'-'+day.month+'-'+day.day});
      }
    }
  }
  return result.sort((a,b)=>a.departureDate-b.departureDate||a.number.localeCompare(b.number));
}

async function airportWeather(code){
  const cached=weatherCache.get(code);
  if(cached&&Date.now()-cached.savedAt<10*60*1000)return cached.data;
  const airport=AIRPORTS[code];
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  url.search=new URLSearchParams({
    latitude:String(airport.lat),longitude:String(airport.lon),
    current:'temperature_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,visibility',
    wind_speed_unit:'kmh',forecast_days:'1',timezone:'auto'
  });
  const response=await fetch(url);
  if(!response.ok)throw new Error(String(response.status));
  const data=(await response.json()).current;
  weatherCache.set(code,{savedAt:Date.now(),data});
  return data;
}

function weatherRisk(current){
  if(!current)return 0;
  const gust=current.wind_gusts_10m||0;
  const rain=current.precipitation||0;
  const visibility=current.visibility??10000;
  const code=current.weather_code||0;
  if(gust>=55||rain>=15||visibility<1000||code>=95)return 3;
  if(gust>=45||rain>=8||visibility<2000||code>=80)return 2;
  if(gust>=35||rain>=3||visibility<4000||code>=51)return 1;
  return 0;
}

function stableNumber(value){
  let result=0;
  for(const char of value)result=(result*31+char.charCodeAt(0))>>>0;
  return result;
}

function assess(flight,originWeather,destinationWeather){
  const level=Math.max(weatherRisk(originWeather),weatherRisk(destinationWeather));
  if(level===3)return {state:'cancel',delta:0};
  if(level===2)return {state:'delay',delta:30};
  if(level===1)return {state:'changed',delta:15};
  const favourable=[originWeather,destinationWeather].every(current=>
    current&&current.precipitation===0&&(current.weather_code||0)<=1&&
    (current.wind_gusts_10m||0)<20&&(current.visibility??10000)>=10000
  );
  const delta=favourable?(stableNumber(flight.key)%2===0?-5:-10):0;
  return {state:flight.minutes<=45?'boarding':'normal',delta};
}

function deltaMarkup(delta){
  if(!delta)return '';
  const sign=delta>0?'+':'-';
  return '<span class="time-delta">('+sign+String(Math.abs(delta)).padStart(2,'0')+t('minute')+')</span>';
}

function statusMarkup(state){
  return '<span class="flight-state state-'+state+'"><i aria-hidden="true"></i><b>'+t(state)+'</b></span>';
}

function renderRows(flights,weather){
  if(!flights.length){
    board.innerHTML='<div class="flight-status-empty">'+t('none')+'</div>';
    return;
  }
  const head='<div class="flight-status-row flight-status-head" role="row">'+
    '<span role="columnheader">'+t('flight')+'</span>'+
    '<span role="columnheader">'+t('departure')+'</span>'+
    '<span role="columnheader">'+t('arrival')+'</span>'+
    '<span role="columnheader">'+t('status')+'</span></div>';
  const rows=flights.map(flight=>{
    const result=assess(flight,weather.get(flight.origin),weather.get(flight.destination));
    return '<article class="flight-status-row" role="row">'+
      '<div class="flight-identity" role="cell" data-label="'+t('flight')+'"><strong>'+flight.number+'</strong><small>'+flight.origin+' → '+flight.destination+'</small></div>'+
      '<div class="flight-time" role="cell" data-label="'+t('departure')+'"><b>'+flight.departure+'</b><small>'+flight.origin+'</small></div>'+
      '<div class="flight-time" role="cell" data-label="'+t('arrival')+'"><b>'+flight.arrival+'</b>'+deltaMarkup(result.delta)+'<small>'+flight.destination+'</small></div>'+
      '<div class="flight-status-cell" role="cell" data-label="'+t('status')+'">'+statusMarkup(result.state)+'</div>'+
      '</article>';
  }).join('');
  board.innerHTML='<div class="flight-status-table" role="table">'+head+rows+'</div>';
}

async function load(force=false){
  if(force)weatherCache.clear();
  note.textContent=t('windowNote');
  refresh.textContent=t('refresh');
  refresh.disabled=true;
  board.innerHTML='<div class="flight-status-loading">'+t('loading')+'</div>';
  const flights=upcomingFlights();
  const codes=[...new Set(flights.flatMap(flight=>[flight.origin,flight.destination]))];
  const weather=new Map();
  await Promise.all(codes.map(async code=>{
    try{weather.set(code,await airportWeather(code));}
    catch(error){weather.set(code,null);}
  }));
  renderRows(flights,weather);
  updated.textContent=t('updated')+' · '+new Intl.DateTimeFormat(locale(),{dateStyle:'medium',timeStyle:'short'}).format(new Date());
  refresh.disabled=false;
}

refresh.addEventListener('click',()=>load(true));
window.addEventListener('stellaris:languagechange',()=>load(false));
window.addEventListener('stellaris:cargo-ready',()=>load(false));
load(false);
setInterval(()=>load(false),5*60*1000);
})();