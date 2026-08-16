import { auth, db } from '../firebase-config.js';
import {
  AIRPORTS, ROUTES, addMonths, availableDestinations, dateISO, fareFamilies,
  forecastOperation, getRoute, progressiveUnavailableSeats, quoteFare, scheduledFlights,
  seatLayout, seatSelectionFee
} from '../operations-model.js?v=20260816-live-ticketing-v2';
import {
  collection, doc, getDoc, onSnapshot, runTransaction, serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const TEXT={
  ko:{
    round:'왕복',oneway:'편도',origin:'출발지',destination:'도착지',departure:'출발일',return:'귀국일',passengers:'탑승객',cabin:'여행 클래스',adult:n=>'성인 '+n+'명',child:n=>'소아·아동 '+n+'명',infant:n=>'유아 '+n+'명',adultLabel:'성인',childLabel:'소아·아동',infantLabel:'유아',passengerTitle:'승객 선택',adultAge:'만 12세 이상',childAge:'만 2세~만 12세 미만',infantAge:'생후 7일~만 2세 미만',ageHelpLabel:name=>name+' 연령 기준',passengerDone:'선택 완료',partyFare:summary=>summary+' · 편도 전체',farePolicy:kind=>kind==='domestic'?'소아·아동 25% 할인 · 유아 무료':'소아·아동 25% 할인 · 유아 성인 정상 운임의 10%',passengerPolicy:'유아는 좌석을 사용하지 않으며 국내선은 무료, 국제선은 성인 정상 운임의 10%입니다. 소아·아동 운임은 성인 운임에서 25% 할인됩니다.',passengerLimit:'전체 승객은 최대 9명까지 선택할 수 있습니다.',infantLimit:'유아는 성인 1명당 1명까지 선택할 수 있습니다.',economy:'Economy (Y)',business:'Business (C)',first:'First (F)',search:'항공권 검색',
    window:(a,b)=>a+'부터 '+b+'까지 예약할 수 있습니다.',fareNote:'표시 운임은 선택한 전체 일행의 편도 합계이며 세금과 유류할증료를 포함합니다.',choose:'항공편과 운임 선택',resultsNote:'편명과 시각은 공개된 스텔라리스 정기 운항 스케줄을 사용합니다.',outbound:'가는 편',inbound:'오는 편',
    aircraft:'운항 기종',perAdult:'성인 1인 · 편도',selectFare:'이 운임 선택',selected:'선택됨',seatTitle:'좌석 선택',standard:'일반 좌석',front:'앞쪽 좌석',extra:'넓은 좌석',occupied:'발권·선택 중',systemBlocked:'운영 제한',selectedSeat:'내 선택',seatHelp:n=>n+'개의 좌석을 선택하세요.',
    seatIncluded:'운임에 포함',seatFee:'좌석 선택 요금',seatNone:'선택한 좌석이 없습니다.',issue:'선택한 여정 발권',summary:'선택한 여정',login:'발권하려면 먼저 로그인해야 합니다.',loginLink:'로그인하기',invalidDate:'예약 가능한 날짜 범위를 확인해 주세요.',returnDate:'귀국일은 출발일보다 늦어야 합니다.',noFlights:'선택한 노선의 운항편이 없습니다.',noCabin:'선택한 여행 클래스가 제공되는 항공편이 없습니다.',seatCount:n=>n+'석',chooseAll:'각 여정의 운임과 좌석을 모두 선택해 주세요.',seatUnavailable:'다른 승객이 먼저 선택했거나 현재 선택할 수 없는 좌석입니다.',seatLimit:n=>'좌석은 '+n+'개까지 선택할 수 있습니다.',seatSyncError:'좌석 현황을 불러오지 못했습니다. 로그인 상태와 네트워크를 확인해 주세요.',holdNotice:'선택한 좌석은 15분 동안 임시로 확보됩니다.',guestSeatNotice:'로그인 전 좌석 선택은 임시 상태이며 발권할 때 실시간 좌석 현황을 확인해 확정합니다.',guestSeatSelected:'좌석을 임시 선택했습니다. 로그인 후 발권하면 실시간으로 좌석이 확정됩니다.',seatPending:'좌석을 화면에서 임시 선택했습니다. 발권할 때 서버에서 최종 확인합니다.',issuing:'Firestore에 발권 정보를 저장하고 있습니다…',issued:ref=>'발권이 완료되었습니다. 예약번호: '+ref,ticketFailed:'발권에 실패했습니다. 선택한 좌석을 다시 확인해 주세요.',ticketComplete:'발권이 완료되었습니다!',bookingNumber:'예약번호',passengerName:'승객 이름',flightNumber:'편명',seatLabel:'좌석',close:'확인',passengerGroup:(name,count)=>count>1?name+' 외 '+(count-1)+'명':name,fare:'항공 운임',seatTotal:'좌석 요금',total:'총 결제 예정 금액',miles:'적립 예정',estimatedMiles:'예상 적립 Star Miles',schedule:'정기 운항편',dayAfter:n=>'+'+n+'일'
  },
  'en-US':{
    round:'Round trip',oneway:'One way',origin:'From',destination:'To',departure:'Departure',return:'Return',passengers:'Passengers',cabin:'Travel class',adult:n=>n+' adult'+(n>1?'s':''),child:n=>n+' child'+(n>1?'ren':''),infant:n=>n+' infant'+(n>1?'s':''),adultLabel:'Adult',childLabel:'Child',infantLabel:'Infant',passengerTitle:'Select passengers',adultAge:'Age 12 and over',childAge:'Age 2 to under 12',infantAge:'7 days to under age 2',ageHelpLabel:name=>name+' age criteria',passengerDone:'Done',partyFare:summary=>summary+' · party total · one way',farePolicy:kind=>kind==='domestic'?'Children 25% off · infants free':'Children 25% off · infants 10% of the normal adult fare',passengerPolicy:'Infants do not occupy a seat and travel free on domestic flights; international infant fares are 10% of the normal adult fare. Children receive 25% off the adult fare.',passengerLimit:'You can select up to 9 passengers.',infantLimit:'Each adult may accompany one infant.',economy:'Economy (Y)',business:'Business (C)',first:'First (F)',search:'Search flights',
    window:(a,b)=>'Booking is open from '+a+' through '+b+'.',fareNote:'Displayed prices are the one-way total for the selected party and include taxes and fuel surcharge.',choose:'Choose flights and fares',resultsNote:'Flight numbers and times follow the published Stellaris timetable.',outbound:'Outbound',inbound:'Return',
    aircraft:'Aircraft',perAdult:'Per adult · one way',selectFare:'Select this fare',selected:'Selected',seatTitle:'Select seats',standard:'Standard seat',front:'Front zone',extra:'Extra legroom',occupied:'Held or ticketed',systemBlocked:'Operationally restricted',selectedSeat:'Your selection',seatHelp:n=>'Select '+n+' seat'+(n>1?'s':'')+'.',
    seatIncluded:'Included in fare',seatFee:'Seat selection fee',seatNone:'No seats selected.',issue:'Issue selected itinerary',summary:'Selected itinerary',login:'Sign in before issuing a ticket.',loginLink:'Sign in',invalidDate:'Check the available booking dates.',returnDate:'The return date must be after departure.',noFlights:'No flights operate on this route.',noCabin:'No flights offer the selected travel class.',seatCount:n=>n+' seats',chooseAll:'Select a fare and all required seats for each flight.',seatUnavailable:'Another passenger selected this seat or it is no longer available.',seatLimit:n=>'You can select up to '+n+' seat'+(n>1?'s':'')+'.',seatSyncError:'Could not load live seat availability. Check your sign-in and network connection.',holdNotice:'Selected seats are held for 15 minutes.',guestSeatNotice:'Seat choices made before sign-in are provisional and are checked against live availability when you issue the ticket.',guestSeatSelected:'Seat selected provisionally. Sign in and issue the ticket to confirm it against live availability.',seatPending:'The seat is selected provisionally and will be checked with the server when you issue the ticket.',issuing:'Saving your ticket to Firestore…',issued:ref=>'Ticket issued. Booking reference: '+ref,ticketFailed:'Ticketing failed. Check your selected seats and try again.',ticketComplete:'Ticketing complete!',bookingNumber:'Booking reference',passengerName:'Passenger name',flightNumber:'Flight',seatLabel:'Seat',close:'OK',passengerGroup:(name,count)=>count>1?name+' and '+(count-1)+' more':name,fare:'Air fare',seatTotal:'Seat fees',total:'Estimated total',miles:'Miles to earn',estimatedMiles:'Estimated Star Miles',schedule:'Scheduled service',dayAfter:n=>'+'+n+' day'+(n>1?'s':'')
  }
};
TEXT['en-GB']=TEXT['en-US'];TEXT['zh-CN']=TEXT['en-US'];TEXT.ja=TEXT['en-US'];TEXT.es=TEXT['en-US'];TEXT.fr=TEXT['en-US'];

const FARE_COPY={
  ko:{
    'economy-saver':['위탁 수하물 포함','일반 좌석 유료 선택','변경·환불 수수료 적용'],
    'economy-standard':['위탁 수하물 포함','일반 좌석 무료 선택','변경·환불 조건 완화'],
    'economy-flex':['Star Miles 120% 기준','앞쪽 좌석 무료 선택','가장 유연한 변경 조건'],
    'business-standard':['Business 좌석','우선 탑승·추가 수하물','좌석 선택 무료'],
    'business-flex':['Star Miles 150% 기준','모든 좌석 선택 무료','유연한 변경·환불 조건'],
    'first-standard':['First Class 전용 좌석','전용 체크인·최우선 서비스','좌석 선택 무료'],
    'first-flex':['Star Miles 250% 기준','최우선 공항 서비스','가장 유연한 변경·환불 조건']
  },
  'en-US':{
    'economy-saver':['Checked baggage included','Paid standard-seat selection','Change and refund fees apply'],
    'economy-standard':['Checked baggage included','Standard seat included','Reduced change and refund fees'],
    'economy-flex':['120% Star Miles basis','Front-zone seat included','Most flexible change terms'],
    'business-standard':['Business Class seating','Priority boarding and extra baggage','Seat selection included'],
    'business-flex':['150% Star Miles basis','All seats included','Flexible change and refund terms'],
    'first-standard':['First Class suite','Dedicated check-in and priority service','Seat selection included'],
    'first-flex':['250% Star Miles basis','Highest-priority airport service','Most flexible change and refund terms']
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
const HOLD_MS=15*60*1000;
const state={
  mode:'round',options:{outbound:[],inbound:[]},chosen:{outbound:null,inbound:null},
  passengerCounts:{adults:1,children:0,infants:0},
  seats:{outbound:[],inbound:[]},activeDirection:null,seatBusy:false,
  inventory:{outbound:new Map(),inbound:new Map()},
  inventoryKeys:{outbound:null,inbound:null},
  inventoryUnsubscribe:{outbound:null,inbound:null}
};

function airportName(code){const item=AIRPORTS[code];return lang()==='ko'?item.nameKo:item.nameEn;}
function money(value){return new Intl.NumberFormat(lang()==='ko'?'ko-KR':'en-US',{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(value);}
function points(value){return new Intl.NumberFormat(lang()==='ko'?'ko-KR':'en-US').format(value);}
function mileageRate(flight){return getRoute(flight.origin,flight.destination)?.kind==='domestic'?10:15;}
function estimatedMiles(flight,quote){const eligible=quote.mileageEligibleTotal??quote.total;return Math.floor(eligible/1000*mileageRate(flight)*quote.family.mileageFactor);}
function showMessage(content,type=''){message.hidden=!content;message.className='booking-message'+(type?' '+type:'');message.innerHTML=content;}
function loginPrompt(){return t('login')+' <a href="../login/" target="_blank" rel="noopener">'+t('loginLink')+'</a>';}
function familyBenefits(id){return (FARE_COPY[lang()]||FARE_COPY['en-US'])[id]||[];}
function seatTypeLabel(type){return type==='front'?t('front'):type==='extraLegroom'?t('extra'):t('standard');}
function cabinCode(value){return value==='first'?'F':value==='business'?'C':'Y';}
function passengerMix(){return {...state.passengerCounts};}
function seatedPassengerCount(){return state.passengerCounts.adults+state.passengerCounts.children;}
function totalPassengerCount(){return seatedPassengerCount()+state.passengerCounts.infants;}
function passengerSummaryText(){
  const counts=state.passengerCounts,parts=[t('adult',counts.adults)];
  if(counts.children)parts.push(t('child',counts.children));
  if(counts.infants)parts.push(t('infant',counts.infants));
  return parts.join(' · ');
}
function syncPassengerUI(){
  passengers.value=String(seatedPassengerCount());
  const summary=$('[data-passenger-summary]');if(summary)summary.textContent=passengerSummaryText();
  ['adults','children','infants'].forEach(type=>{
    const count=$('[data-passenger-count="'+type+'"]');if(count)count.textContent=String(state.passengerCounts[type]);
  });
  document.querySelectorAll('[data-passenger-action]').forEach(button=>{
    const type=button.dataset.passengerType,delta=Number(button.dataset.passengerAction),counts=state.passengerCounts;
    const minimumBlocked=delta<0&&(type==='adults'?counts.adults<=Math.max(1,counts.infants):counts[type]<=0);
    const maximumBlocked=delta>0&&(totalPassengerCount()>=9||(type==='infants'&&counts.infants>=counts.adults));
    button.disabled=minimumBlocked||maximumBlocked;
  });
}
function changePassengerCount(type,delta){
  if(!['adults','children','infants'].includes(type))return;
  if(delta>0&&totalPassengerCount()>=9){showMessage(t('passengerLimit'),'error');return;}
  if(type==='infants'&&delta>0&&state.passengerCounts.infants>=state.passengerCounts.adults){showMessage(t('infantLimit'),'error');return;}
  if(delta<0&&type==='adults'&&state.passengerCounts.adults<=Math.max(1,state.passengerCounts.infants))return;
  if(delta<0&&type!=='adults'&&state.passengerCounts[type]<=0)return;
  state.passengerCounts[type]+=delta;syncPassengerUI();resetSelection(true);
}

function translateStatic(){
  const tabRound=$('[data-booking-tab="round"]'),tabOne=$('[data-booking-tab="oneway"]');
  tabRound.textContent=t('round');tabOne.textContent=t('oneway');
  $('[data-label-origin]').textContent=t('origin');$('[data-label-destination]').textContent=t('destination');
  $('[data-label-departure]').textContent=t('departure');$('[data-label-return]').textContent=t('return');
  $('[data-label-passengers]').textContent=t('passengers');$('[data-label-cabin]').textContent=t('cabin');
  [...cabin.options].forEach(option=>{option.textContent=t(option.value);});
  $('#searchFlightsButton').textContent=t('search');$('[data-fare-note]').textContent=t('fareNote');
  $('[data-results-title]').textContent=t('choose');$('[data-results-note]').textContent=t('resultsNote');
  $('[data-seat-title]').textContent=t('seatTitle');$('[data-seat-standard]').textContent=t('standard');
  $('[data-seat-front]').textContent=t('front');$('[data-seat-extra]').textContent=t('extra');
  $('[data-seat-occupied]').textContent=t('occupied');$('[data-seat-selected]').textContent=t('selectedSeat');
  const translatedElements=[
    ['[data-seat-system]','systemBlocked'],['[data-seat-hold-note]','holdNotice'],
    ['[data-ticket-complete]','ticketComplete'],['[data-ticket-label-ref]','bookingNumber'],
    ['[data-ticket-label-passenger]','passengerName'],['[data-ticket-label-flight]','flightNumber'],
    ['[data-ticket-label-seat]','seatLabel'],['[data-ticket-close]','close'],
    ['[data-passenger-title]','passengerTitle'],['[data-passenger-adult]','adultLabel'],
    ['[data-passenger-child]','childLabel'],['[data-passenger-infant]','infantLabel'],
    ['[data-passenger-adult-age]','adultAge'],['[data-passenger-child-age]','childAge'],
    ['[data-passenger-infant-age]','infantAge'],['[data-passenger-policy]','passengerPolicy'],['[data-passenger-done]','passengerDone']
  ];
  translatedElements.forEach(([selector,key])=>{const element=$(selector);if(element)element.textContent=t(key);});
  document.querySelectorAll('[data-age-help]').forEach(button=>button.setAttribute('aria-label',t('ageHelpLabel',t(button.dataset.ageLabel))));
  syncPassengerUI();$('[data-issue-ticket]').textContent=t('issue');
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

function selectedCabin(flight){return flight?.selectedCabin||cabin.value;}

function inventoryKey(flight){
  return [flight.dateISO,flight.number,flight.origin,flight.destination,selectedCabin(flight)]
    .join('_').replace(/[^A-Za-z0-9_-]/g,'');
}

function seatReference(flight,seatId){
  return doc(db,'flightInventories',inventoryKey(flight),'seats',seatId);
}

function timestampMillis(value){
  return value&&typeof value.toMillis==='function'?value.toMillis():0;
}

function isActiveInventorySeat(data){
  return data?.status==='ticketed'||(data?.status==='held'&&timestampMillis(data.holdExpiresAt)>Date.now());
}

function stopInventory(direction){
  if(typeof state.inventoryUnsubscribe[direction]==='function')state.inventoryUnsubscribe[direction]();
  state.inventoryUnsubscribe[direction]=null;state.inventoryKeys[direction]=null;
  state.inventory[direction]=new Map();
}

async function releaseSeatHold(flight,seatId){
  const user=auth.currentUser;if(!user||!flight)return;
  const reference=seatReference(flight,seatId);
  try{
    await runTransaction(db,async transaction=>{
      const snapshot=await transaction.get(reference);
      if(!snapshot.exists())return;
      const data=snapshot.data();
      if(data.status==='held'&&data.ownerId===user.uid)transaction.delete(reference);
    });
  }catch(error){}
}

async function releaseDirectionHolds(direction){
  const flight=state.chosen[direction],seatIds=[...state.seats[direction]];
  await Promise.all(seatIds.map(seatId=>releaseSeatHold(flight,seatId)));
  state.seats[direction]=[];
}

async function releaseAllHolds(){
  await Promise.all(['outbound','inbound'].map(direction=>releaseDirectionHolds(direction)));
}

function resetSelection(clearResults=false,releaseHolds=true){
  if(releaseHolds)void releaseAllHolds();
  ['outbound','inbound'].forEach(stopInventory);
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
  const quote=quoteFare(flight,family.id,passengerMix()),miles=estimatedMiles(flight,quote);
  const selected=state.chosen[direction]?.number===flight.number&&state.chosen[direction]?.selectedFare.family.id===family.id;
  return '<button class="fare-choice'+(selected?' is-selected':'')+'" type="button" data-choose-fare="'+direction+'" data-index="'+index+'" data-family="'+family.id+'">'+
    '<span class="fare-choice-name">'+family.name+'</span>'+
    '<span class="fare-choice-price">'+money(quote.total)+'<small>'+t('partyFare',passengerSummaryText())+'</small><small class="fare-choice-policy">'+t('farePolicy',getRoute(flight.origin,flight.destination)?.kind)+'</small><small class="fare-choice-miles">'+t('estimatedMiles')+' : '+points(miles)+'</small></span>'+
    '<span class="fare-benefits">'+familyBenefits(family.id).map(item=>'<span>'+item+'</span>').join('')+'</span>'+
    '<span class="fare-choice-action">'+(selected?t('selected'):t('selectFare'))+' →</span></button>';
}

function flightCard(flight,direction,index){
  const selected=state.chosen[direction]?.number===flight.number;
  const families=fareFamilies(cabin.value);
  const capacity=seatLayout(flight.operation.aircraft.code,cabin.value).length;
  return '<article class="flight-option'+(selected?' is-selected':'')+'"><div class="flight-summary">'+
    '<div class="flight-option-top"><strong>'+flight.number+'</strong><span class="aircraft-chip">'+t('aircraft')+' · '+flight.operation.aircraft.code+' · '+cabinCode(cabin.value)+' '+t('seatCount',capacity)+'</span></div>'+
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
  const layout=seatLayout(flight.operation.aircraft.code,selectedCabin(flight));
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

function subscribeSeatInventory(direction,flight){
  const key=inventoryKey(flight);
  if(state.inventoryKeys[direction]===key)return;
  stopInventory(direction);state.inventoryKeys[direction]=key;
  const user=auth.currentUser;if(!user)return;
  const seatCollection=collection(db,'flightInventories',key,'seats');
  state.inventoryUnsubscribe[direction]=onSnapshot(seatCollection,snapshot=>{
    const next=new Map();
    snapshot.forEach(item=>{const data=item.data();if(isActiveInventorySeat(data))next.set(item.id,data);});
    state.inventory[direction]=next;
    const count=Number(passengers.value);
    const retained=state.seats[direction].filter(id=>{
      const data=next.get(id);
      return !data||(data.status==='held'&&data.ownerId===user.uid);
    });
    const mine=[...next.entries()]
      .filter(([,data])=>data.status==='held'&&data.ownerId===user.uid)
      .map(([id])=>id);
    state.seats[direction]=[...new Set([...retained,...mine])].slice(0,count);
    if(state.activeDirection===direction)renderSeatMap(direction);
  },()=>showMessage(t('seatSyncError'),'error'));
}

function renderSeatMap(direction,shouldScroll=false){
  const flight=state.chosen[direction];if(!flight)return;
  const selectedClass=selectedCabin(flight);
  const count=Number(passengers.value),layout=seatLayout(flight.operation.aircraft.code,selectedClass);
  const seatSeed=[flight.number,flight.dateISO,flight.origin,flight.destination,flight.departure,selectedClass].join(':');
  const systemUnavailable=progressiveUnavailableSeats(
    flight.operation.aircraft.code,selectedClass,flight.dateISO,seatSeed
  );
  const inventory=state.inventory[direction],user=auth.currentUser;
  state.seats[direction]=state.seats[direction].filter(id=>{
    const data=inventory.get(id);
    return !data||(data.status==='held'&&data.ownerId===user?.uid&&isActiveInventorySeat(data));
  });
  $('[data-seat-subtitle]').textContent=flight.number+' · '+flight.origin+' → '+flight.destination+' · '+flight.operation.aircraft.code+' · '+cabinCode(selectedClass)+' '+t('seatCount',layout.length)+' · '+t('seatHelp',count);
  const holdNote=$('[data-seat-hold-note]');if(holdNote)holdNote.textContent=auth.currentUser?t('holdNotice'):t('guestSeatNotice');
  const rows=new Map();layout.forEach(seat=>{if(!rows.has(seat.row))rows.set(seat.row,[]);rows.get(seat.row).push(seat);});
  seatMap.innerHTML=[...rows.entries()].map(([row,seats])=>{
    const buttons=seats.map(seat=>{
      const aisle=seat.aisleBefore?'<span class="seat-aisle" aria-hidden="true"></span>':'';
      const selected=state.seats[direction].includes(seat.id),remote=inventory.get(seat.id);
      const mine=remote?.status==='held'&&remote.ownerId===user?.uid;
      const inventoryBlocked=Boolean(remote)&&!(selected&&mine);
      const systemBlocked=systemUnavailable.has(seat.id)&&!selected;
      const blocked=inventoryBlocked||systemBlocked;
      const fee=seatSelectionFee(flight.kind,flight.selectedFare.family.id,seat.type);
      const availability=inventoryBlocked?t('occupied'):systemBlocked?t('systemBlocked'):'';
      const title=seat.id+' · '+seatTypeLabel(seat.type)+' · '+(fee?'+'+money(fee):t('seatIncluded'))+(availability?' · '+availability:'');
      return aisle+'<button class="seat-button type-'+seat.type+(inventoryBlocked?' is-occupied':'')+(systemBlocked?' is-system-blocked':'')+(selected?' is-selected':'')+'" type="button" data-seat="'+seat.id+'" title="'+title+'" '+(blocked||state.seatBusy?'disabled':'')+'>'+seat.id+'</button>';
    }).join('');
    return '<div class="seat-row"><span class="seat-row-number">'+row+'</span>'+buttons+'</div>';
  }).join('');
  seatSection.hidden=false;renderSeatFeeSummary();renderConfirm();
  if(shouldScroll)seatSection.scrollIntoView({behavior:'smooth',block:'start'});
}

function openSeatMap(direction){
  const flight=state.chosen[direction];if(!flight)return;
  state.activeDirection=direction;subscribeSeatInventory(direction,flight);renderSeatMap(direction,true);
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

async function chooseFare(direction,index,familyId){
  await releaseDirectionHolds(direction);stopInventory(direction);
  const flight=state.options[direction][index];
  state.chosen[direction]={...flight,selectedCabin:cabin.value,selectedFare:quoteFare(flight,familyId,passengerMix())};
  state.seats[direction]=[];renderResults();openSeatMap(direction);
}

function seatSelectionError(code){
  const error=new Error(code);error.code=code;return error;
}

async function claimSeatHold(flight,seatId){
  const user=auth.currentUser;if(!user)throw seatSelectionError('login-required');
  const reference=seatReference(flight,seatId),expiresAt=Timestamp.fromMillis(Date.now()+HOLD_MS);
  await runTransaction(db,async transaction=>{
    const snapshot=await transaction.get(reference);
    if(snapshot.exists()){
      const data=snapshot.data();
      if(data.status==='ticketed')throw seatSelectionError('seat-unavailable');
      if(data.status==='held'&&data.ownerId!==user.uid&&timestampMillis(data.holdExpiresAt)>Date.now()){
        throw seatSelectionError('seat-unavailable');
      }
    }
    const flightKey=inventoryKey(flight);
    transaction.set(reference,{
      flightKey,flightNumber:flight.number,date:flight.dateISO,origin:flight.origin,destination:flight.destination,
      aircraft:flight.operation.aircraft.code,cabin:selectedCabin(flight),seatId,status:'held',ownerId:user.uid,
      holdExpiresAt:expiresAt,updatedAt:serverTimestamp()
    });
  });
}

async function selectSeat(id){
  const direction=state.activeDirection,flight=state.chosen[direction];if(!direction||!flight||state.seatBusy)return;
  const user=auth.currentUser,list=state.seats[direction],index=list.indexOf(id);
  state.seatBusy=true;
  try{
    if(index>=0){
      if(user)await releaseSeatHold(flight,id);
      list.splice(index,1);
    }else{
      if(list.length>=Number(passengers.value)){showMessage(t('seatLimit',Number(passengers.value)),'error');return;}
      const selectedClass=selectedCabin(flight);
      const seed=[flight.number,flight.dateISO,flight.origin,flight.destination,flight.departure,selectedClass].join(':');
      if(progressiveUnavailableSeats(flight.operation.aircraft.code,selectedClass,flight.dateISO,seed).has(id)){
        throw seatSelectionError('seat-unavailable');
      }
      if(user){
        await claimSeatHold(flight,id);
        if(!list.includes(id))list.push(id);
        showMessage(t('holdNotice'),'success');
      }else{
        if(!list.includes(id))list.push(id);
        showMessage(t('guestSeatSelected')+' <a href="../login/" target="_blank" rel="noopener">'+t('loginLink')+'</a>','success');
      }
    }
  }catch(error){
    if(!list.includes(id)&&['permission-denied','unavailable','failed-precondition'].includes(error.code)){
      list.push(id);showMessage(t('seatPending'),'error');
    }else{
      showMessage(error.code==='login-required'?loginPrompt():error.code==='seat-unavailable'?t('seatUnavailable'):t('seatSyncError'),'error');
    }
  }finally{
    state.seatBusy=false;renderSeatMap(direction);renderResults();
  }
}
async function ensureSeatHolds(entries){
  for(const entry of entries)await claimSeatHold(entry.flight,entry.seatId);
}

function bookingReference(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=new Uint8Array(6);crypto.getRandomValues(bytes);
  return 'XS'+[...bytes].map(value=>chars[value%chars.length]).join('');
}

function saveLocal(data){
  let list=[];try{list=JSON.parse(localStorage.getItem('stellaris-bookings-v1')||'[]');}catch(error){}
  list.unshift({...data,createdAt:new Date().toISOString()});localStorage.setItem('stellaris-bookings-v1',JSON.stringify(list.slice(0,50)));
}

async function passengerDisplayName(user){
  if(user.displayName?.trim())return user.displayName.trim();
  try{
    const snapshot=await getDoc(doc(db,'users',user.uid));
    const name=snapshot.data()?.displayName;if(name?.trim())return name.trim();
  }catch(error){}
  return (user.email?.split('@')[0]||'Stellaris Member').trim();
}

function showTicketModal(reference,name,segments,passengerCount){
  const modal=$('[data-ticket-modal]');if(!modal)return;
  $('[data-ticket-ref]').textContent=reference;
  $('[data-ticket-passenger]').textContent=t('passengerGroup',name,passengerCount);
  $('[data-ticket-flight]').textContent=segments.map(segment=>segment.flightNumber).join(' / ');
  $('[data-ticket-seat]').textContent=segments.map(segment=>segment.flightNumber+' · '+segment.seats.join(', ')).join(' / ');
  modal.hidden=false;document.body.classList.add('ticket-modal-open');
}

async function issueTicket(){
  const required=['outbound',...(state.mode==='round'?['inbound']:[])];
  if(!required.every(direction=>state.chosen[direction]&&state.seats[direction].length===Number(passengers.value))){showMessage(t('chooseAll'),'error');return;}
  const user=auth.currentUser;if(!user){showMessage(loginPrompt(),'error');return;}
  const name=await passengerDisplayName(user);
  const segments=required.map(direction=>{
    const flight=state.chosen[direction],seatDetails=chosenSeatDetails(direction);
    return {
      direction,flightNumber:flight.number,origin:flight.origin,destination:flight.destination,date:flight.dateISO,
      departure:flight.departure,arrival:flight.arrival,aircraft:flight.operation.aircraft.code,
      cabin:selectedCabin(flight),fareFamily:flight.selectedFare.family.id,fareName:flight.selectedFare.family.name,
      fare:flight.selectedFare.total,seats:seatDetails.map(seat=>seat.id),seatDetails,passengerName:name,passengerCounts:passengerMix()
    };
  });
  const fareTotal=required.reduce((sum,direction)=>sum+state.chosen[direction].selectedFare.total,0);
  const seatTotal=required.reduce((sum,direction)=>sum+directionSeatFees(direction),0);
  const totalFare=fareTotal+seatTotal;
  const milesEarned=required.reduce((sum,direction)=>{
    const flight=state.chosen[direction];return sum+estimatedMiles(flight,flight.selectedFare);
  },0);
  const reference=bookingReference(),bookingDocument=doc(collection(db,'bookings'));
  const firestoreCabin=cabin.value==='economy'?'economy':'premium';
  const data={bookingRef:reference,userId:user.uid,email:user.email||'',origin:from.value,destination:to.value,flightNumber:segments[0].flightNumber,segments,passengers:totalPassengerCount(),cabin:firestoreCabin,totalFare,currency:'KRW',milesEarned,status:'ticketed'};
  const seatEntries=required.flatMap(direction=>{
    const flight=state.chosen[direction];
    return state.seats[direction].map(seatId=>({direction,flight,seatId,reference:seatReference(flight,seatId)}));
  });
  $('[data-issue-ticket]').disabled=true;showMessage(t('issuing'));
  try{
    await ensureSeatHolds(seatEntries);
    await runTransaction(db,async transaction=>{
      const snapshots=[];
      for(const entry of seatEntries)snapshots.push(await transaction.get(entry.reference));
      snapshots.forEach((snapshot,index)=>{
        const seat=snapshot.data(),entry=seatEntries[index];
        if(!snapshot.exists()||seat.status!=='held'||seat.ownerId!==user.uid||timestampMillis(seat.holdExpiresAt)<=Date.now()){
          throw seatSelectionError('seat-unavailable');
        }
        const selectedClass=selectedCabin(entry.flight);
        const seed=[entry.flight.number,entry.flight.dateISO,entry.flight.origin,entry.flight.destination,entry.flight.departure,selectedClass].join(':');
        if(progressiveUnavailableSeats(entry.flight.operation.aircraft.code,selectedClass,entry.flight.dateISO,seed).has(entry.seatId)){
          throw seatSelectionError('seat-unavailable');
        }
      });
      transaction.set(bookingDocument,{...data,createdAt:serverTimestamp()});
      seatEntries.forEach(entry=>transaction.update(entry.reference,{
        status:'ticketed',bookingId:bookingDocument.id,bookingRef:reference,updatedAt:serverTimestamp()
      }));
    });
    saveLocal(data);showMessage(t('issued',reference),'success');
    showTicketModal(reference,name,segments,totalPassengerCount());
    state.seats={outbound:[],inbound:[]};resetSelection(true,false);
  }catch(error){
    showMessage(error.code==='seat-unavailable'?t('seatUnavailable'):t('ticketFailed'),'error');
    renderConfirm();
  }
}
function closeAgeHelp(except=null){
  document.querySelectorAll('[data-age-help][aria-expanded="true"]').forEach(button=>{
    if(button!==except)button.setAttribute('aria-expanded','false');
  });
}
translateStatic();populateOrigins('ICN');setDates();setMode('round');
document.querySelectorAll('[data-booking-tab]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.bookingTab)));
from.addEventListener('change',()=>{populateDestinations();resetSelection(true);});
to.addEventListener('change',()=>resetSelection(true));
cabin.addEventListener('change',()=>resetSelection(true));
const passengerModal=$('[data-passenger-modal]');
document.querySelectorAll('[data-age-help]').forEach(button=>button.addEventListener('click',event=>{
  event.stopPropagation();
  const willOpen=button.getAttribute('aria-expanded')!=='true';
  closeAgeHelp(button);button.setAttribute('aria-expanded',String(willOpen));
}));
document.addEventListener('click',()=>closeAgeHelp());
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeAgeHelp();});
$('#passengerPickerButton').addEventListener('click',()=>{passengerModal.hidden=false;});
document.querySelectorAll('[data-passenger-action]').forEach(button=>button.addEventListener('click',()=>changePassengerCount(button.dataset.passengerType,Number(button.dataset.passengerAction))));
document.querySelectorAll('[data-passenger-close]').forEach(button=>button.addEventListener('click',()=>{passengerModal.hidden=true;}));
passengerModal.addEventListener('click',event=>{if(event.target===passengerModal)passengerModal.hidden=true;});
$('#swapButton').addEventListener('click',()=>{const a=from.value,b=to.value;populateOrigins(b);populateDestinations(a);resetSelection(true);});
depart.addEventListener('change',()=>{returnDate.min=depart.value;if(returnDate.value<=depart.value){const d=new Date(depart.value+'T12:00:00');d.setDate(d.getDate()+7);const suggested=dateISO(d);returnDate.value=suggested>returnDate.max?returnDate.max:suggested;}resetSelection(true);});
returnDate.addEventListener('change',()=>resetSelection(true));
form.addEventListener('submit',event=>{
  event.preventDefault();showMessage('');if(!validDates())return;
  const outboundFlights=scheduledFlights(from.value,to.value,depart.value);
  const inboundFlights=state.mode==='round'?scheduledFlights(to.value,from.value,returnDate.value):[];
  state.options.outbound=outboundFlights.map(enrich).filter(flight=>seatLayout(flight.operation.aircraft.code,cabin.value).length>=Number(passengers.value));
  state.options.inbound=inboundFlights.map(enrich).filter(flight=>seatLayout(flight.operation.aircraft.code,cabin.value).length>=Number(passengers.value));
  resetSelection(true);
  if(!outboundFlights.length){showMessage(t('noFlights'),'error');return;}
  if(!state.options.outbound.length||(state.mode==='round'&&!state.options.inbound.length)){showMessage(t('noCabin'),'error');return;}
  renderResults();results.scrollIntoView({behavior:'smooth',block:'start'});
});
results.addEventListener('click',async event=>{const button=event.target.closest('[data-choose-fare]');if(button)await chooseFare(button.dataset.chooseFare,Number(button.dataset.index),button.dataset.family);});
seatMap.addEventListener('click',async event=>{const button=event.target.closest('[data-seat]');if(button&&!button.disabled)await selectSeat(button.dataset.seat);});
$('[data-issue-ticket]').addEventListener('click',issueTicket);
onAuthStateChanged(auth,user=>{
  if(!user){if(state.activeDirection)renderSeatMap(state.activeDirection);return;}
  ['outbound','inbound'].forEach(direction=>{
    const flight=state.chosen[direction];if(flight)subscribeSeatInventory(direction,flight);
  });
  const pending=['outbound','inbound'].flatMap(direction=>{
    const flight=state.chosen[direction];
    return flight?state.seats[direction].map(seatId=>({flight,seatId})):[];
  });
  if(pending.length)void ensureSeatHolds(pending)
    .then(()=>{showMessage(t('holdNotice'),'success');if(state.activeDirection)renderSeatMap(state.activeDirection);})
    .catch(error=>showMessage(error.code==='seat-unavailable'?t('seatUnavailable'):t('seatPending'),'error'));
});
document.querySelectorAll('[data-ticket-close]').forEach(button=>button.addEventListener('click',()=>{const modal=$('[data-ticket-modal]');if(modal)modal.hidden=true;document.body.classList.remove('ticket-modal-open');}));
window.setInterval(()=>{if(state.activeDirection)renderSeatMap(state.activeDirection);},30000);
window.addEventListener('stellaris:languagechange',()=>{void releaseAllHolds().finally(()=>location.reload());});
