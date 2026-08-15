import { auth, db } from '../firebase-config.js';
import { AIRPORTS, ROUTES, addMonths, availableDestinations, dateISO, forecastOperation, getRoute, occupiedSeats, scheduledFlights, seatLayout } from '../operations-model.js';
import { addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const TEXT={
ko:{round:'왕복',oneway:'편도',origin:'출발지',destination:'도착지',departure:'출발일',return:'귀국일',passengers:'탑승객',cabin:'좌석 등급',adult:n=>'성인 '+n+'명',economy:'일반석',premium:'프리미엄',search:'항공권 검색',window:(a,b)=>a+'부터 '+b+'까지 예약할 수 있습니다.',choose:'항공편 선택',outbound:'가는 편',inbound:'오는 편',predicted:'예상 탑승률',remaining:'남은 좌석',select:'좌석 선택',selected:'선택됨',seatTitle:'좌석 선택',available:'선택 가능',occupied:'선택 불가',selectedSeat:'선택 좌석',seatHelp:n=>n+'개의 좌석을 선택하세요.',issue:'선택한 여정 발권',summary:'선택한 여정',login:'발권하려면 먼저 로그인해야 합니다.',loginLink:'로그인하기',invalidDate:'예약 가능한 날짜 범위를 확인해 주세요.',returnDate:'귀국일은 출발일보다 늦어야 합니다.',noFlights:'선택한 노선의 운항편이 없습니다.',chooseAll:'각 여정의 항공편과 좌석을 모두 선택해 주세요.',issuing:'발권 정보를 저장하고 있습니다…',issued:ref=>'발권이 완료되었습니다. 예약번호: '+ref,local:'발권은 완료되었으며 이 기기에 저장되었습니다.',fare:'총 운임',miles:'적립 예정',aircraft:'기종',current:'현재 탑승률'},
'en-US':{round:'Round trip',oneway:'One way',origin:'From',destination:'To',departure:'Departure',return:'Return',passengers:'Passengers',cabin:'Cabin',adult:n=>n+' adult'+(n>1?'s':''),economy:'Economy',premium:'Premium',search:'Search flights',window:(a,b)=>'Booking is open from '+a+' through '+b+'.',choose:'Choose flights',outbound:'Outbound',inbound:'Return',predicted:'Predicted load',remaining:'Seats left',select:'Select seats',selected:'Selected',seatTitle:'Select seats',available:'Available',occupied:'Unavailable',selectedSeat:'Selected',seatHelp:n=>'Select '+n+' seat'+(n>1?'s':'')+'.',issue:'Issue selected itinerary',summary:'Selected itinerary',login:'Sign in before issuing a ticket.',loginLink:'Sign in',invalidDate:'Check the available booking dates.',returnDate:'The return date must be after departure.',noFlights:'No flights operate on this route.',chooseAll:'Select every flight and the required seats.',issuing:'Saving your ticket…',issued:ref=>'Ticket issued. Booking reference: '+ref,local:'The ticket was issued and saved on this device.',fare:'Total fare',miles:'Miles to earn',aircraft:'Aircraft',current:'Current load'}};
TEXT['en-GB']=TEXT['en-US'];TEXT['zh-CN']=TEXT['en-US'];TEXT.ja=TEXT['en-US'];TEXT.es=TEXT['en-US'];TEXT.fr=TEXT['en-US'];
const $=selector=>document.querySelector(selector);
const lang=()=>{const value=localStorage.getItem('stellaris-language')||'ko';return TEXT[value]?value:'ko'};
const t=(key,...args)=>{const value=TEXT[lang()][key]||TEXT.ko[key];return typeof value==='function'?value(...args):value};
const form=$('#bookingSearchForm'),from=$('#fromInput'),to=$('#toInput'),depart=$('#departureDate'),returnDate=$('#returnDate');
const passengers=$('#passengerCount'),cabin=$('#cabinClass'),returnField=$('#returnField'),message=$('[data-booking-message]');
const results=$('[data-flight-results]'),outboundHost=$('[data-outbound-results]'),returnHost=$('[data-return-results]');
const seatSection=$('[data-seat-selection]'),seatMap=$('[data-seat-map]'),confirmPanel=$('[data-booking-confirm]');
const state={mode:'round',options:{outbound:[],inbound:[]},chosen:{outbound:null,inbound:null},seats:{outbound:[],inbound:[]},activeDirection:null};

function airportName(code){const item=AIRPORTS[code];return lang()==='ko'?item.nameKo:item.nameEn}
function money(value){return new Intl.NumberFormat(lang()==='ko'?'ko-KR':'en-US',{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(value)}
function showMessage(content,type=''){message.hidden=!content;message.className='booking-message'+(type?' '+type:'');message.innerHTML=content}
function translateStatic(){
  const tabRound=$('[data-booking-tab="round"]'),tabOne=$('[data-booking-tab="oneway"]');
  tabRound.textContent=t('round');tabOne.textContent=t('oneway');
  $('[data-label-origin]').textContent=t('origin');$('[data-label-destination]').textContent=t('destination');
  $('[data-label-departure]').textContent=t('departure');$('[data-label-return]').textContent=t('return');
  $('[data-label-passengers]').textContent=t('passengers');$('[data-label-cabin]').textContent=t('cabin');
  [...passengers.options].forEach(option=>option.textContent=t('adult',Number(option.value)));
  cabin.options[0].textContent=t('economy');cabin.options[1].textContent=t('premium');
  $('#searchFlightsButton').textContent=t('search');$('[data-results-title]').textContent=t('choose');
  $('[data-seat-title]').textContent=t('seatTitle');$('[data-seat-available]').textContent=t('available');
  $('[data-seat-occupied]').textContent=t('occupied');$('[data-seat-selected]').textContent=t('selectedSeat');
  $('[data-issue-ticket]').textContent=t('issue');
}
function populateOrigins(selected='ICN'){
  const codes=[...new Set(ROUTES.flatMap(route=>[route.origin,route.destination]))];
  from.innerHTML=codes.map(code=>'<option value="'+code+'">'+code+' · '+airportName(code)+'</option>').join('');
  from.value=codes.includes(selected)?selected:codes[0];
  populateDestinations(to.value||'SFO');
}
function populateDestinations(selected){
  const codes=availableDestinations(from.value);
  to.innerHTML=codes.map(code=>'<option value="'+code+'">'+code+' · '+airportName(code)+'</option>').join('');
  to.value=codes.includes(selected)?selected:codes[0];
}
function setDates(){
  const today=new Date(),max=addMonths(today,6),tomorrow=new Date(today.getTime()+86400000),week=new Date(today.getTime()+8*86400000);
  const min=dateISO(today),maximum=dateISO(max);
  [depart,returnDate].forEach(input=>{input.min=min;input.max=maximum});
  if(!depart.value)depart.value=dateISO(tomorrow);
  if(!returnDate.value)returnDate.value=dateISO(week);
  $('[data-booking-window]').textContent=t('window',min,maximum);
}
function setMode(mode){
  state.mode=mode;document.querySelectorAll('[data-booking-tab]').forEach(button=>button.classList.toggle('active',button.dataset.bookingTab===mode));
  returnField.hidden=mode==='oneway';returnDate.required=mode==='round';
}
function validDates(){
  if(!depart.value||depart.value<depart.min||depart.value>depart.max){showMessage(t('invalidDate'),'error');return false}
  if(state.mode==='round'&&(!returnDate.value||returnDate.value<=depart.value||returnDate.value>returnDate.max)){showMessage(t('returnDate'),'error');return false}
  return true;
}
function fareFor(operation){return Math.round(operation.fare*(cabin.value==='premium'?1.65:1)*Number(passengers.value))}
function enrich(flight){return {...flight,operation:forecastOperation(flight)}}
function flightCard(flight,direction,index){
  const selected=state.chosen[direction]?.number===flight.number;
  return '<article class="flight-option'+(selected?' is-selected':'')+'"><div class="flight-option-top"><strong>'+flight.number+'</strong><span class="load-chip">'+t('predicted')+' '+flight.operation.predictedLoad+'%</span></div><div class="flight-route-time"><div><b>'+flight.departure+'</b><small>'+flight.origin+'</small></div><span>→</span><div><b>'+flight.arrival+(flight.arrivalDayOffset>0?' <small>(+'+flight.arrivalDayOffset+')</small>':'')+'</b><small>'+flight.destination+'</small></div></div><div class="flight-aircraft"><span>'+t('aircraft')+' · <b>'+flight.operation.aircraft.code+'</b></span><span>'+t('remaining')+' · <b>'+flight.operation.remaining+'</b></span><span>'+t('current')+' · <b>'+flight.operation.currentLoad+'%</b></span></div><div class="flight-price"><strong>'+money(fareFor(flight.operation))+'</strong><button type="button" data-choose-flight="'+direction+'" data-index="'+index+'">'+(selected?t('selected'):t('select'))+'</button></div></article>';
}
function renderResults(){
  outboundHost.innerHTML='<h3 class="result-direction">'+t('outbound')+'</h3><div class="flight-option-grid">'+state.options.outbound.map((flight,index)=>flightCard(flight,'outbound',index)).join('')+'</div>';
  returnHost.innerHTML=state.mode==='round'?'<h3 class="result-direction">'+t('inbound')+'</h3><div class="flight-option-grid">'+state.options.inbound.map((flight,index)=>flightCard(flight,'inbound',index)).join('')+'</div>':'';
  results.hidden=false;
}
function openSeatMap(direction){
  const flight=state.chosen[direction];if(!flight)return;
  state.activeDirection=direction;
  const count=Number(passengers.value),layout=seatLayout(flight.operation.aircraft.code);
  const occupied=occupiedSeats(flight.operation.aircraft.code,flight.operation.booked,flight.number+flight.dateISO);
  $('[data-seat-subtitle]').textContent=flight.number+' · '+flight.origin+' → '+flight.destination+' · '+t('seatHelp',count);
  const aircraft=flight.operation.aircraft;
  const rows=new Map();layout.forEach(seat=>{if(!rows.has(seat.row))rows.set(seat.row,[]);rows.get(seat.row).push(seat)});
  seatMap.innerHTML=[...rows.entries()].map(([row,seats])=>{
    let previous=0;
    const buttons=seats.map((seat,index)=>{
      let aisle='';if(aircraft.aisles.includes(index)&&index!==previous){aisle='<span class="seat-aisle" aria-hidden="true"></span>';previous=index}
      const selected=state.seats[direction].includes(seat.id),blocked=occupied.has(seat.id);
      return aisle+'<button class="seat-button'+(blocked?' is-occupied':'')+(selected?' is-selected':'')+'" type="button" data-seat="'+seat.id+'" '+(blocked?'disabled':'')+'>'+seat.id+'</button>';
    }).join('');
    return '<div class="seat-row"><span class="seat-row-number">'+row+'</span>'+buttons+'</div>';
  }).join('');
  seatSection.hidden=false;seatSection.scrollIntoView({behavior:'smooth',block:'start'});renderConfirm();
}
function renderConfirm(){
  const required=['outbound',...(state.mode==='round'?['inbound']:[])];
  const ready=required.every(direction=>state.chosen[direction]&&state.seats[direction].length===Number(passengers.value));
  confirmPanel.hidden=!required.some(direction=>state.chosen[direction]);
  const summary=$('[data-booking-summary]');
  const parts=required.filter(direction=>state.chosen[direction]).map(direction=>{
    const f=state.chosen[direction];return f.number+' '+f.origin+'→'+f.destination+' · '+(state.seats[direction].join(', ')||t('seatHelp',Number(passengers.value)));
  });
  const total=required.reduce((sum,direction)=>sum+(state.chosen[direction]?fareFor(state.chosen[direction].operation):0),0);
  summary.innerHTML='<strong>'+t('summary')+'</strong><p>'+parts.join(' / ')+'</p><p>'+t('fare')+' · '+money(total)+'</p>';
  $('[data-issue-ticket]').disabled=!ready;
}
function chooseFlight(direction,index){
  state.chosen[direction]=state.options[direction][index];state.seats[direction]=[];renderResults();openSeatMap(direction);
}
function selectSeat(id){
  const direction=state.activeDirection;if(!direction)return;
  const list=state.seats[direction],count=Number(passengers.value),index=list.indexOf(id);
  if(index>=0)list.splice(index,1);else if(list.length<count)list.push(id);else{list.shift();list.push(id)}
  openSeatMap(direction);
}
function bookingReference(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=new Uint8Array(6);crypto.getRandomValues(bytes);
  return 'XS'+[...bytes].map(value=>chars[value%chars.length]).join('');
}
function saveLocal(data){
  let list=[];try{list=JSON.parse(localStorage.getItem('stellaris-bookings-v1')||'[]')}catch(error){}
  list.unshift({...data,createdAt:new Date().toISOString()});localStorage.setItem('stellaris-bookings-v1',JSON.stringify(list.slice(0,50)));
}
async function issueTicket(){
  const user=auth.currentUser;if(!user){showMessage(t('login')+' <a href="../login/">'+t('loginLink')+'</a>','error');return}
  const required=['outbound',...(state.mode==='round'?['inbound']:[])];
  if(!required.every(direction=>state.chosen[direction]&&state.seats[direction].length===Number(passengers.value))){showMessage(t('chooseAll'),'error');return}
  const segments=required.map(direction=>{const f=state.chosen[direction];return {direction,flightNumber:f.number,origin:f.origin,destination:f.destination,date:f.dateISO,departure:f.departure,arrival:f.arrival,aircraft:f.operation.aircraft.code,seats:[...state.seats[direction]]}});
  const totalFare=required.reduce((sum,direction)=>sum+fareFor(state.chosen[direction].operation),0);
  const rate=getRoute(from.value,to.value)?.kind==='domestic'?10:15;
  const milesEarned=Math.floor(totalFare/1000*rate);
  const reference=bookingReference();
  const data={bookingRef:reference,userId:user.uid,email:user.email||'',origin:from.value,destination:to.value,flightNumber:segments[0].flightNumber,segments,passengers:Number(passengers.value),cabin:cabin.value,totalFare,currency:'KRW',milesEarned,status:'ticketed'};
  $('[data-issue-ticket]').disabled=true;showMessage(t('issuing'));
  let cloudSaved=false;
  try{await addDoc(collection(db,'bookings'),{...data,createdAt:serverTimestamp()});cloudSaved=true}catch(error){}
  saveLocal(data);showMessage(t('issued',reference)+(cloudSaved?'':' '+t('local')),'success');
}
translateStatic();populateOrigins('ICN');setDates();setMode('round');
document.querySelectorAll('[data-booking-tab]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.bookingTab)));
from.addEventListener('change',()=>populateDestinations());$('#swapButton').addEventListener('click',()=>{const a=from.value,b=to.value;populateOrigins(b);populateDestinations(a)});
depart.addEventListener('change',()=>{returnDate.min=depart.value;if(returnDate.value<=depart.value){const d=new Date(depart.value+'T12:00:00');d.setDate(d.getDate()+7);returnDate.value=Math.min(dateISO(d),returnDate.max)}});
form.addEventListener('submit',event=>{event.preventDefault();showMessage('');if(!validDates())return;state.options.outbound=scheduledFlights(from.value,to.value,depart.value).map(enrich);state.options.inbound=state.mode==='round'?scheduledFlights(to.value,from.value,returnDate.value).map(enrich):[];state.chosen={outbound:null,inbound:null};state.seats={outbound:[],inbound:[]};if(!state.options.outbound.length){showMessage(t('noFlights'),'error');return}renderResults();seatSection.hidden=true;confirmPanel.hidden=true;results.scrollIntoView({behavior:'smooth',block:'start'})});
results.addEventListener('click',event=>{const button=event.target.closest('[data-choose-flight]');if(button)chooseFlight(button.dataset.chooseFlight,Number(button.dataset.index))});
seatMap.addEventListener('click',event=>{const button=event.target.closest('[data-seat]');if(button&&!button.disabled)selectSeat(button.dataset.seat)});
$('[data-issue-ticket]').addEventListener('click',issueTicket);
