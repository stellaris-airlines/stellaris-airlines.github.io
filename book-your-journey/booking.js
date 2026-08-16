import { auth, db } from '../firebase-config.js';
import {
  AIRPORTS, ROUTES, addMonths, availableDestinations, dateISO, fareFamilies,
  forecastOperation, getRoute, occupiedSeats, quoteFare, scheduledFlights,
  seatLayout, seatSelectionFee
} from '../operations-model.js';
import { addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const TEXT={
  ko:{
    round:'왕복',oneway:'편도',origin:'출발지',destination:'도착지',departure:'출발일',return:'귀국일',passengers:'탑승객',cabin:'여행 클래스',adult:n=>'성인 '+n+'명',economy:'Economy',premium:'Premium',search:'항공권 검색',
    window:(a,b)=>a+'부터 '+b+'까지 예약할 수 있습니다.',fareNote:'표시 운임은 성인 1인 편도 기준이며 세금과 유류할증료를 포함합니다.',choose:'항공편과 운임 선택',resultsNote:'편명과 시각은 공개된 스텔라리스 정기 운항 스케줄을 사용합니다.',outbound:'가는 편',inbound:'오는 편',
    aircraft:'운항 기종',perAdult:'성인 1인 · 편도',selectFare:'이 운임 선택',selected:'선택됨',seatTitle:'좌석 선택',standard:'일반 좌석',front:'앞쪽 좌석',extra:'넓은 좌석',occupied:'선택 불가',selectedSeat:'선택 좌석',seatHelp:n=>n+'개의 좌석을 선택하세요.',
    seatIncluded:'운임에 포함',seatFee:'좌석 선택 요금',seatNone:'선택한 좌석이 없습니다.',issue:'선택한 여정 발권',summary:'선택한 여정',login:'발권하려면 먼저 로그인해야 합니다.',loginLink:'로그인하기',invalidDate:'예약 가능한 날짜 범위를 확인해 주세요.',returnDate:'귀국일은 출발일보다 늦어야 합니다.',noFlights:'선택한 노선의 운항편이 없습니다.',chooseAll:'각 여정의 운임과 좌석을 모두 선택해 주세요.',issuing:'발권 정보를 저장하고 있습니다…',issued:ref=>'발권이 완료되었습니다. 예약번호: '+ref,local:'발권은 완료되었으며 이 기기에 저장되었습니다.',fare:'항공 운임',seatTotal:'좌석 요금',total:'총 결제 예정 금액',miles:'적립 예정',estimatedMiles:'예상 적립 Star Miles',schedule:'정기 운항편',dayAfter:n=>'+'+n+'일'
  },
  'en-US':{
    round:'Round trip',oneway:'One way',origin:'From',destination:'To',departure:'Departure',return:'Return',passengers:'Passengers',cabin:'Travel class',adult:n=>n+' adult'+(n>1?'s':''),economy:'Economy',premium:'Premium',search:'Search flights',
    window:(a,b)=>'Booking is open from '+a+' through '+b+'.',fareNote:'Displayed prices are one-way per adult and include taxes and fuel surcharge.',choose:'Choose flights and fares',resultsNote:'Flight numbers and times follow the published Stellaris timetable.',outbound:'Outbound',inbound:'Return',
    aircraft:'Aircraft',perAdult:'Per adult · one way',selectFare:'Select this fare',selected:'Selected',seatTitle:'Select seats',standard:'Standard seat',front:'Front zone',extra:'Extra legroom',occupied:'Unavailable',selectedSeat:'Selected',seatHelp:n=>'Select '+n+' seat'+(n>1?'s':'')+'.',
    seatIncluded:'Included in fare',seatFee:'Seat selection fee',seatNone:'No seats selected.',issue:'Issue selected itinerary',summary:'Selected itinerary',login:'Sign in before issuing a ticket.',loginLink:'Sign in',invalidDate:'Check the available booking dates.',returnDate:'The return date must be after departure.',noFlights:'No flights operate on this route.',chooseAll:'Select a fare and all required seats for each flight.',issuing:'Saving your ticket…',issued:ref=>'Ticket issued. Booking reference: '+ref,local:'The ticket was issued and saved on this device.',fare:'Air fare',seatTotal:'Seat fees',total:'Estimated total',miles:'Miles to earn',estimatedMiles:'Estimated Star Miles',schedule:'Scheduled service',dayAfter:n=>'+'+n+' day'+(n>1?'s':'')
  }
};
TEXT['en-GB']=TEXT['en-US'];TEXT['zh-CN']=TEXT['en-US'];TEXT.ja=TEXT['en-US'];TEXT.es=TEXT['en-US'];TEXT.fr=TEXT['en-US'];

const FARE_COPY={
  ko:{
    'economy-saver':['위탁 수하물 포함','일반 좌석 유료 선택','변경·환불 수수료 적용'],
    'economy-standard':['위탁 수하물 포함','일반 좌석 무료 선택','변경·환불 조건 완화'],
    'economy-flex':['Star Miles 120% 기준','앞쪽 좌석 무료 선택','가장 유연한 변경 조건'],
    'premium-standard':['Premium 좌석','우선 탑승·추가 수하물','일반 좌석 무료 선택'],
    'premium-flex':['Star Miles 150% 기준','모든 좌석 유형 무료','유연한 변경·환불 조건']
  },
  'en-US':{
    'economy-saver':['Checked baggage included','Paid standard-seat selection','Change and refund fees apply'],
    'economy-standard':['Checked baggage included','Standard seat included','Reduced change and refund fees'],
    'economy-flex':['120% Star Miles basis','Front-zone seat included','Most flexible change terms'],
    'premium-standard':['Premium seating','Priority boarding and extra baggage','Standard seat included'],
    'premium-flex':['150% Star Miles basis','All seat types included','Flexible change and refund terms']
  }
};
FARE_COPY['en-GB']=FARE_COPY['en-US'];FARE_COPY['zh-CN']=FARE_COPY['en-US'];FARE_COPY.ja=FARE_COPY['en-US'];FARE_COPY.es=FARE_COPY['en-US'];FARE_COPY.fr=FARE_COPY['en-US'];

const $=selector=>document.querySelector(selector);
const lang=()=>{const value=localStorage.getItem('stellaris-language')||'ko';return TEXT[value]?value:'ko';};
const t=(key,...args)=>{const value=TEXT[lang()][key]||TEXT.ko[key];return typeof value==='function'?value(...args):value;};
const form=$('#bookingSearchForm'),from=$('#fromInput'),to=$('#toInput'),depart=$('#departureDate'),returnDate=$('#returnDate');
const passengers=$('#passengerCount'),cabin=$('#cabinClass'),returnField=$('#returnField'),message=$('[data-booking-message]');
const results=$('[data-flight-results]'),outboundHost=$('[data-outbound-results]'),returnHost=$('[data-return-results]');
const seatSection=$('[data-seat-selection]'),seatMap=$('[data-seat-map]'),seatFeeSummary=$('[data-seat-fee-summary]'),confirmPanel=$('[data-booking-confirm]');
const state={mode:'round',options:{outbound:[],inbound:[]},chosen:{outbound:null,inbound:null},seats:{outbound:[],inbound:[]},activeDirection:null};

function airportName(code){const item=AIRPORTS[code];return lang()==='ko'?item.nameKo:item.nameEn;}
function money(value){return new Intl.NumberFormat(lang()==='ko'?'ko-KR':'en-US',{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(value);}
function points(value){return new Intl.NumberFormat(lang()==='ko'?'ko-KR':'en-US').format(value);}
function mileageRate(flight){return getRoute(flight.origin,flight.destination)?.kind==='domestic'?10:15;}
function estimatedMiles(flight,quote){return Math.floor(quote.total/1000*mileageRate(flight)*quote.family.mileageFactor);}
function showMessage(content,type=''){message.hidden=!content;message.className='booking-message'+(type?' '+type:'');message.innerHTML=content;}
function familyBenefits(id){return (FARE_COPY[lang()]||FARE_COPY['en-US'])[id]||[];}
function seatTypeLabel(type){return type==='front'?t('front'):type==='extraLegroom'?t('extra'):t('standard');}

function translateStatic(){
  const tabRound=$('[data-booking-tab="round"]'),tabOne=$('[data-booking-tab="oneway"]');
  tabRound.textContent=t('round');tabOne.textContent=t('oneway');
  $('[data-label-origin]').textContent=t('origin');$('[data-label-destination]').textContent=t('destination');
  $('[data-label-departure]').textContent=t('departure');$('[data-label-return]').textContent=t('return');
  $('[data-label-passengers]').textContent=t('passengers');$('[data-label-cabin]').textContent=t('cabin');
  [...passengers.options].forEach(option=>option.textContent=t('adult',Number(option.value)));
  cabin.options[0].textContent=t('economy');cabin.options[1].textContent=t('premium');
  $('#searchFlightsButton').textContent=t('search');$('[data-fare-note]').textContent=t('fareNote');
  $('[data-results-title]').textContent=t('choose');$('[data-results-note]').textContent=t('resultsNote');
  $('[data-seat-title]').textContent=t('seatTitle');$('[data-seat-standard]').textContent=t('standard');
  $('[data-seat-front]').textContent=t('front');$('[data-seat-extra]').textContent=t('extra');
  $('[data-seat-occupied]').textContent=t('occupied');$('[data-seat-selected]').textContent=t('selectedSeat');
  $('[data-issue-ticket]').textContent=t('issue');
}

function populateOrigins(selected='ICN'){
  const codes=[...new Set(ROUTES.flatMap(route=>[route.origin,route.destination]))];
  from.innerHTML=codes.map(code=>'<option value="'+code+'">'+code+' · '+airportName(code)+'</option>').join('');
  from.value=codes.includes(selected)?selected:codes[0];
  populateDestinations(to.value||'NYC');
}

function populateDestinations(selected){
  const codes=availableDestinations(from.value);
  to.innerHTML=codes.map(code=>'<option value="'+code+'">'+code+' · '+airportName(code)+'</option>').join('');
  to.value=codes.includes(selected)?selected:codes[0];
}

function setDates(){
  const today=new Date(),max=addMonths(today,6),tomorrow=new Date(today.getTime()+86400000),week=new Date(today.getTime()+8*86400000);
  const min=dateISO(today),maximum=dateISO(max);
  [depart,returnDate].forEach(input=>{input.min=min;input.max=maximum;});
  if(!depart.value)depart.value=dateISO(tomorrow);
  if(!returnDate.value)returnDate.value=dateISO(week);
  $('[data-booking-window]').textContent=t('window',min,maximum);
}

function resetSelection(clearResults=false){
  state.chosen={outbound:null,inbound:null};state.seats={outbound:[],inbound:[]};state.activeDirection=null;
  seatSection.hidden=true;confirmPanel.hidden=true;
  if(clearResults)results.hidden=true;
}

function setMode(mode){
  state.mode=mode;
  document.querySelectorAll('[data-booking-tab]').forEach(button=>{
    const active=button.dataset.bookingTab===mode;
    button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));
  });
  returnField.hidden=mode==='oneway';returnDate.required=mode==='round';resetSelection(true);
}

function validDates(){
  if(!depart.value||depart.value<depart.min||depart.value>depart.max){showMessage(t('invalidDate'),'error');return false;}
  if(state.mode==='round'&&(!returnDate.value||returnDate.value<=depart.value||returnDate.value>returnDate.max)){showMessage(t('returnDate'),'error');return false;}
  return true;
}

function enrich(flight){return {...flight,operation:forecastOperation(flight)};}

function fareChoice(flight,direction,index,family){
  const quote=quoteFare(flight,family.id,1),miles=estimatedMiles(flight,quote);
  const selected=state.chosen[direction]?.number===flight.number&&state.chosen[direction]?.selectedFare.family.id===family.id;
  return '<button class="fare-choice'+(selected?' is-selected':'')+'" type="button" data-choose-fare="'+direction+'" data-index="'+index+'" data-family="'+family.id+'">'+
    '<span class="fare-choice-name">'+family.name+'</span>'+
    '<span class="fare-choice-price">'+money(quote.pricePerPassenger)+'<small>'+t('perAdult')+'</small><small class="fare-choice-miles">'+t('estimatedMiles')+' : '+points(miles)+'</small></span>'+
    '<span class="fare-benefits">'+familyBenefits(family.id).map(item=>'<span>'+item+'</span>').join('')+'</span>'+
    '<span class="fare-choice-action">'+(selected?t('selected'):t('selectFare'))+' →</span></button>';
}

function flightCard(flight,direction,index){
  const selected=state.chosen[direction]?.number===flight.number;
  const families=fareFamilies(cabin.value);
  return '<article class="flight-option'+(selected?' is-selected':'')+'"><div class="flight-summary">'+
    '<div class="flight-option-top"><strong>'+flight.number+'</strong><span class="aircraft-chip">'+t('aircraft')+' · '+flight.operation.aircraft.code+'</span></div>'+
    '<div class="flight-route-time"><div><b>'+flight.departure+'</b><small>'+flight.origin+'</small></div><span>→</span><div><b>'+flight.arrival+(flight.arrivalDayOffset>0?' <small>('+t('dayAfter',flight.arrivalDayOffset)+')</small>':'')+'</b><small>'+flight.destination+'</small></div></div>'+
    '<p class="flight-summary-note">'+t('schedule')+' · '+flight.dateISO+'</p></div>'+
    '<div class="fare-choice-grid">'+families.map(family=>fareChoice(flight,direction,index,family)).join('')+'</div></article>';
}

function renderResults(){
  outboundHost.innerHTML='<h3 class="result-direction">'+t('outbound')+'</h3><div class="flight-option-grid">'+state.options.outbound.map((flight,index)=>flightCard(flight,'outbound',index)).join('')+'</div>';
  returnHost.innerHTML=state.mode==='round'?'<h3 class="result-direction">'+t('inbound')+'</h3><div class="flight-option-grid">'+state.options.inbound.map((flight,index)=>flightCard(flight,'inbound',index)).join('')+'</div>':'';
  results.hidden=false;
}

function chosenSeatDetails(direction){
  const flight=state.chosen[direction];if(!flight)return [];
  const layout=seatLayout(flight.operation.aircraft.code,cabin.value);
  return state.seats[direction].map(id=>{
    const seat=layout.find(item=>item.id===id);
    const type=seat?.type||'standard';
    const fee=seatSelectionFee(flight.kind,flight.selectedFare.family.id,type);
    return {id,type,fee};
  });
}

function directionSeatFees(direction){return chosenSeatDetails(direction).reduce((sum,seat)=>sum+seat.fee,0);}

function renderSeatFeeSummary(){
  const direction=state.activeDirection,details=chosenSeatDetails(direction);
  if(!details.length){seatFeeSummary.innerHTML='<span>'+t('seatNone')+'</span><strong>'+t('seatFee')+' · '+money(0)+'</strong>';return;}
  const list=details.map(seat=>seat.id+' · '+seatTypeLabel(seat.type)+(seat.fee?' · +'+money(seat.fee):' · '+t('seatIncluded'))).join(' / ');
  seatFeeSummary.innerHTML='<span>'+list+'</span><strong>'+t('seatFee')+' · '+money(directionSeatFees(direction))+'</strong>';
}

function openSeatMap(direction){
  const flight=state.chosen[direction];if(!flight)return;
  state.activeDirection=direction;
  const count=Number(passengers.value),layout=seatLayout(flight.operation.aircraft.code,cabin.value);
  const occupied=occupiedSeats(flight.operation.aircraft.code,cabin.value,flight.number+flight.dateISO+':'+cabin.value);
  $('[data-seat-subtitle]').textContent=flight.number+' · '+flight.origin+' → '+flight.destination+' · '+flight.selectedFare.family.name+' · '+t('seatHelp',count);
  const rows=new Map();layout.forEach(seat=>{if(!rows.has(seat.row))rows.set(seat.row,[]);rows.get(seat.row).push(seat);});
  seatMap.innerHTML=[...rows.entries()].map(([row,seats])=>{
    const buttons=seats.map(seat=>{
      const aisle=seat.aisleBefore?'<span class="seat-aisle" aria-hidden="true"></span>':'';
      const selected=state.seats[direction].includes(seat.id),blocked=occupied.has(seat.id);
      const fee=seatSelectionFee(flight.kind,flight.selectedFare.family.id,seat.type);
      const title=seat.id+' · '+seatTypeLabel(seat.type)+' · '+(fee?'+'+money(fee):t('seatIncluded'));
      return aisle+'<button class="seat-button type-'+seat.type+(blocked?' is-occupied':'')+(selected?' is-selected':'')+'" type="button" data-seat="'+seat.id+'" title="'+title+'" '+(blocked?'disabled':'')+'>'+seat.id+'</button>';
    }).join('');
    return '<div class="seat-row"><span class="seat-row-number">'+row+'</span>'+buttons+'</div>';
  }).join('');
  seatSection.hidden=false;renderSeatFeeSummary();renderConfirm();seatSection.scrollIntoView({behavior:'smooth',block:'start'});
}

function renderConfirm(){
  const required=['outbound',...(state.mode==='round'?['inbound']:[])];
  const ready=required.every(direction=>state.chosen[direction]&&state.seats[direction].length===Number(passengers.value));
  confirmPanel.hidden=!required.some(direction=>state.chosen[direction]);
  const parts=required.filter(direction=>state.chosen[direction]).map(direction=>{
    const flight=state.chosen[direction];
    return flight.number+' '+flight.origin+'→'+flight.destination+' · '+flight.selectedFare.family.name+' · '+(state.seats[direction].join(', ')||t('seatHelp',Number(passengers.value)));
  });
  const fareTotal=required.reduce((sum,direction)=>sum+(state.chosen[direction]?.selectedFare.total||0),0);
  const seatTotal=required.reduce((sum,direction)=>sum+directionSeatFees(direction),0);
  const milesTotal=required.reduce((sum,direction)=>sum+(state.chosen[direction]?estimatedMiles(state.chosen[direction],state.chosen[direction].selectedFare):0),0);
  $('[data-booking-summary]').innerHTML='<strong>'+t('summary')+'</strong><p>'+parts.join(' / ')+'</p><p>'+t('fare')+' · '+money(fareTotal)+' &nbsp; '+t('seatTotal')+' · '+money(seatTotal)+' &nbsp; <b>'+t('total')+' · '+money(fareTotal+seatTotal)+'</b></p><p class="booking-miles-summary">'+t('estimatedMiles')+' : <b>'+points(milesTotal)+'</b></p>';
  const issueButton=$('[data-issue-ticket]');issueButton.disabled=false;issueButton.dataset.ready=String(ready);
}

function chooseFare(direction,index,familyId){
  const flight=state.options[direction][index];
  state.chosen[direction]={...flight,selectedFare:quoteFare(flight,familyId,Number(passengers.value))};
  state.seats[direction]=[];renderResults();openSeatMap(direction);
}

function selectSeat(id){
  const direction=state.activeDirection;if(!direction)return;
  const list=state.seats[direction],count=Number(passengers.value),index=list.indexOf(id);
  if(index>=0)list.splice(index,1);else if(list.length<count)list.push(id);else{list.shift();list.push(id);}
  openSeatMap(direction);
}

function bookingReference(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=new Uint8Array(6);crypto.getRandomValues(bytes);
  return 'XS'+[...bytes].map(value=>chars[value%chars.length]).join('');
}

function saveLocal(data){
  let list=[];try{list=JSON.parse(localStorage.getItem('stellaris-bookings-v1')||'[]');}catch(error){}
  list.unshift({...data,createdAt:new Date().toISOString()});localStorage.setItem('stellaris-bookings-v1',JSON.stringify(list.slice(0,50)));
}

async function issueTicket(){
  const required=['outbound',...(state.mode==='round'?['inbound']:[])];
  if(!required.every(direction=>state.chosen[direction]&&state.seats[direction].length===Number(passengers.value))){showMessage(t('chooseAll'),'error');return;}
  const user=auth.currentUser;if(!user){showMessage(t('login')+' <a href="../login/">'+t('loginLink')+'</a>','error');return;}
  const segments=required.map(direction=>{
    const flight=state.chosen[direction],seatDetails=chosenSeatDetails(direction);
    return {
      direction,flightNumber:flight.number,origin:flight.origin,destination:flight.destination,date:flight.dateISO,
      departure:flight.departure,arrival:flight.arrival,aircraft:flight.operation.aircraft.code,
      cabin:cabin.value,fareFamily:flight.selectedFare.family.id,fareName:flight.selectedFare.family.name,
      fare:flight.selectedFare.total,seats:seatDetails.map(seat=>seat.id),seatDetails
    };
  });
  const fareTotal=required.reduce((sum,direction)=>sum+state.chosen[direction].selectedFare.total,0);
  const seatTotal=required.reduce((sum,direction)=>sum+directionSeatFees(direction),0);
  const totalFare=fareTotal+seatTotal;
  const milesEarned=required.reduce((sum,direction)=>{
    const flight=state.chosen[direction];return sum+estimatedMiles(flight,flight.selectedFare);
  },0);
  const reference=bookingReference();
  const data={bookingRef:reference,userId:user.uid,email:user.email||'',origin:from.value,destination:to.value,flightNumber:segments[0].flightNumber,segments,passengers:Number(passengers.value),cabin:cabin.value,totalFare,currency:'KRW',milesEarned,status:'ticketed'};
  $('[data-issue-ticket]').disabled=true;showMessage(t('issuing'));
  let cloudSaved=false;
  try{await addDoc(collection(db,'bookings'),{...data,createdAt:serverTimestamp()});cloudSaved=true;}catch(error){}
  saveLocal(data);showMessage(t('issued',reference)+(cloudSaved?'':' '+t('local')),'success');
}

translateStatic();populateOrigins('ICN');setDates();setMode('round');
document.querySelectorAll('[data-booking-tab]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.bookingTab)));
from.addEventListener('change',()=>{populateDestinations();resetSelection(true);});
to.addEventListener('change',()=>resetSelection(true));
passengers.addEventListener('change',()=>resetSelection(true));cabin.addEventListener('change',()=>resetSelection(true));
$('#swapButton').addEventListener('click',()=>{const a=from.value,b=to.value;populateOrigins(b);populateDestinations(a);resetSelection(true);});
depart.addEventListener('change',()=>{returnDate.min=depart.value;if(returnDate.value<=depart.value){const d=new Date(depart.value+'T12:00:00');d.setDate(d.getDate()+7);const suggested=dateISO(d);returnDate.value=suggested>returnDate.max?returnDate.max:suggested;}resetSelection(true);});
returnDate.addEventListener('change',()=>resetSelection(true));
form.addEventListener('submit',event=>{
  event.preventDefault();showMessage('');if(!validDates())return;
  state.options.outbound=scheduledFlights(from.value,to.value,depart.value).map(enrich);
  state.options.inbound=state.mode==='round'?scheduledFlights(to.value,from.value,returnDate.value).map(enrich):[];
  resetSelection(false);
  if(!state.options.outbound.length){showMessage(t('noFlights'),'error');return;}
  renderResults();results.scrollIntoView({behavior:'smooth',block:'start'});
});
results.addEventListener('click',event=>{const button=event.target.closest('[data-choose-fare]');if(button)chooseFare(button.dataset.chooseFare,Number(button.dataset.index),button.dataset.family);});
seatMap.addEventListener('click',event=>{const button=event.target.closest('[data-seat]');if(button&&!button.disabled)selectSeat(button.dataset.seat);});
$('[data-issue-ticket]').addEventListener('click',issueTicket);
window.addEventListener('stellaris:languagechange',()=>location.reload());
