export const AIRPORT_TIMEZONES={ICN:'Asia/Seoul',GMP:'Asia/Seoul',CJU:'Asia/Seoul',PUS:'Asia/Seoul',CJJ:'Asia/Seoul',TAE:'Asia/Seoul',MWX:'Asia/Seoul',YNY:'Asia/Seoul',USN:'Asia/Seoul',RSU:'Asia/Seoul',HIN:'Asia/Seoul',KPO:'Asia/Seoul',KWJ:'Asia/Seoul',KUV:'Asia/Seoul',WJU:'Asia/Seoul',NYC:'America/New_York',SEA:'America/Los_Angeles',LAX:'America/Los_Angeles',HNL:'Pacific/Honolulu',THT:'Pacific/Tahiti',SYD:'Australia/Sydney',LHR:'Europe/London',CDG:'Europe/Paris',STR:'Europe/Athens',DXB:'Asia/Dubai'};
export const CABIN_BRANDS={first:'셀레스티아 퍼스트',business:'아스렐리스 비즈니스',premium:'루미나 프리미엄 이코노미',economy:'노바 이코노미'};

function partsInZone(ms,timeZone){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date(ms));
  return Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
}
export function zonedDateTimeToMillis(date,time='00:00',timeZone='Asia/Seoul'){
  const [y,m,d]=String(date||'').split('-').map(Number),[hh,mm]=String(time||'00:00').split(':').map(Number);
  if(!y||!m||!d)return NaN;
  const guess=Date.UTC(y,m-1,d,hh||0,mm||0,0);
  let p=partsInZone(guess,timeZone);
  let shown=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour)%24,Number(p.minute),Number(p.second));
  let result=guess-(shown-guess);
  p=partsInZone(result,timeZone);
  shown=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour)%24,Number(p.minute),Number(p.second));
  result-=shown-Date.UTC(y,m-1,d,hh||0,mm||0,0);
  return result;
}
export function segmentDepartureMillis(segment){
  const tz=AIRPORT_TIMEZONES[String(segment?.origin||'').toUpperCase()]||'Asia/Seoul';
  return zonedDateTimeToMillis(segment?.date,segment?.departure,tz);
}
export function checkInWindow(booking,now=Date.now()){
  const first=Array.isArray(booking?.segments)?booking.segments[0]:null;
  const departure=segmentDepartureMillis(first);
  if(!Number.isFinite(departure))return {state:'unknown',departure,openAt:NaN};
  const openAt=departure-24*60*60*1000;
  if(now<openAt)return {state:'not-open',departure,openAt};
  if(now>=departure)return {state:'closed',departure,openAt};
  return {state:'open',departure,openAt};
}
export function bookingSeatInventoryKey(segment){
  return [segment?.date,segment?.flightNumber,segment?.origin,segment?.destination,segment?.cabin]
    .join('_').replace(/[^A-Za-z0-9_-]/g,'');
}
export function boardingTime(segment,minutesBefore=40){
  const [h,m]=String(segment?.departure||'00:00').split(':').map(Number);
  const total=((h||0)*60+(m||0)-minutesBefore+1440)%1440;
  return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}
export function passengerLabel(p,index=0){
  const surname=String(p?.surname||'').trim(),given=String(p?.givenName||'').trim();
  return [given,surname].filter(Boolean).join(' ')||String(p?.name||'').trim()||`Passenger ${index+1}`;
}
export function operationDocumentId(segment){return `${String(segment?.date||'')}_${String(segment?.flightNumber||'')}`.replace(/[^A-Za-z0-9_-]/g,'');}
export function fareChangePolicy(segment){
  const id=String(segment?.fareFamily||'');
  if(id==='economy-saver')return {change:true,refund:true,fee:'high'};
  if(id==='economy-standard'||id.includes('standard'))return {change:true,refund:true,fee:'standard'};
  if(id.includes('flex'))return {change:true,refund:true,fee:'low'};
  return {change:true,refund:true,fee:'standard'};
}
export function pseudoQrBits(text,size=17){
  let seed=2166136261;
  for(const ch of String(text||'')){seed^=ch.charCodeAt(0);seed=Math.imul(seed,16777619)>>>0;}
  const bits=[];let x=seed||1;
  for(let i=0;i<size*size;i++){x^=x<<13;x^=x>>>17;x^=x<<5;bits.push(Boolean(x&1));}
  const finder=(r,c)=>((r<5&&c<5)||(r<5&&c>=size-5)||(r>=size-5&&c<5));
  return bits.map((value,i)=>finder(Math.floor(i/size),i%size)?(((Math.floor(i/size)%4===0)||(i%size)%4===0)||(Math.floor(i/size)%4===2&&(i%size)%4===2)):value);
}
export function bookingStatusLabel(status){return ({ticketed:'발권 완료',cancelled:'취소 완료',completed:'운항 완료'}[status]||status||'—');}
export function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
