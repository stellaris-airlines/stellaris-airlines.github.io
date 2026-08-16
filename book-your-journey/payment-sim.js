import { auth } from '../firebase-config.js';

const issueButton=document.querySelector('[data-issue-ticket]');
const modal=document.querySelector('[data-payment-sim-modal]');
const summary=document.querySelector('[data-payment-sim-summary]');
const method=document.querySelector('[data-payment-sim-method]');
const errorBox=document.querySelector('[data-payment-sim-error]');
const note=document.querySelector('[data-demo-payment-note]');
const approveButton=document.querySelector('[data-payment-sim-approve]');
const declineButton=document.querySelector('[data-payment-sim-decline]');
const closeButtons=[...document.querySelectorAll('[data-payment-sim-close]')];

const COPY={
  ko:{title:'결제 확인',eyebrow:'DEMO CHECKOUT',warning:'테스트용 결제 확인 단계입니다. 실제 결제는 발생하지 않습니다.',note:'결제 확인 버튼을 누르면 약 1초 후 예약 완료 화면으로 이동합니다.',method:'확인 방식',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'결제 확인',processing:'결제 처리중…',decline:'취소',login:'발권하려면 먼저 로그인해 주세요.',summary:'예약 확인',secure:'실제 카드번호·CVC·계좌번호는 입력하거나 저장하지 않습니다.',close:'닫기'},
  'en-US':{title:'Confirm payment',eyebrow:'DEMO CHECKOUT',warning:'This is a demo confirmation step. No real payment is made.',note:'Confirm and the booking-complete screen will open automatically after about one second.',method:'Confirmation method',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'Confirm',processing:'Processing…',decline:'Cancel',login:'Sign in before ticketing.',summary:'Booking summary',secure:'No real card, CVC or bank-account details are entered or stored.',close:'Close'}
};
COPY['en-GB']=COPY['en-US'];COPY['zh-CN']=COPY['en-US'];COPY.ja=COPY['en-US'];COPY.es=COPY['en-US'];COPY.fr=COPY['en-US'];
const lang=()=>{const value=localStorage.getItem('stellaris-language')||'ko';return COPY[value]?value:'ko';};
const t=key=>COPY[lang()][key];
let processing=false;

function syncLanguage(){
  document.querySelector('[data-payment-sim-eyebrow]')?.replaceChildren(document.createTextNode(t('eyebrow')));
  document.querySelector('[data-payment-sim-title]')?.replaceChildren(document.createTextNode(t('title')));
  document.querySelector('[data-payment-sim-warning]')?.replaceChildren(document.createTextNode(t('warning')));
  document.querySelector('[data-payment-sim-method-label]')?.replaceChildren(document.createTextNode(t('method')));
  document.querySelector('[data-payment-sim-summary-label]')?.replaceChildren(document.createTextNode(t('summary')));
  document.querySelector('[data-payment-sim-secure]')?.replaceChildren(document.createTextNode(t('secure')));
  if(note)note.textContent=t('note');
  if(approveButton&&!processing)approveButton.textContent=t('approve');
  if(declineButton)declineButton.textContent=t('decline');
  closeButtons.forEach(button=>button.setAttribute('aria-label',t('close')));
  if(method){
    [...method.options].forEach(option=>{
      if(option.value==='demo-card')option.textContent=t('card');
      if(option.value==='demo-bank')option.textContent=t('bank');
      if(option.value==='demo-wallet')option.textContent=t('wallet');
    });
  }
}
function setProcessing(value){
  processing=value;
  if(approveButton){approveButton.disabled=value;approveButton.textContent=value?t('processing'):t('approve');}
  if(declineButton)declineButton.disabled=value;
  if(method)method.disabled=value;
}
function showError(text){if(errorBox){errorBox.textContent=text;errorBox.hidden=false;}}
function openPayment(){
  syncLanguage();
  if(summary)summary.textContent=document.querySelector('[data-booking-summary]')?.innerText?.trim()||'';
  if(errorBox){errorBox.hidden=true;errorBox.textContent='';}
  setProcessing(false);
  modal.hidden=false;
  document.body.classList.add('payment-sim-open');
}
function closePayment(force=false){
  if(processing&&!force)return;
  modal.hidden=true;
  document.body.classList.remove('payment-sim-open');
}
function bookingReference(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=new Uint8Array(6);crypto.getRandomValues(bytes);
  return 'XS'+[...bytes].map(value=>chars[value%chars.length]).join('');
}
function demoReference(){
  const bytes=new Uint8Array(5);crypto.getRandomValues(bytes);
  return 'DEMO-'+[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('').toUpperCase();
}
function integerFromText(text){
  const matches=String(text||'').match(/[0-9][0-9,]*/g)||[];
  if(!matches.length)return 0;
  return Number(matches[matches.length-1].replace(/,/g,''))||0;
}
function passengerCounts(){
  return {
    adults:Number(document.querySelector('[data-passenger-count="adults"]')?.textContent||1),
    children:Number(document.querySelector('[data-passenger-count="children"]')?.textContent||0),
    infants:Number(document.querySelector('[data-passenger-count="infants"]')?.textContent||0)
  };
}
function manifest(){
  return [...document.querySelectorAll('.passenger-info-card')].map((card,index)=>({
    key:card.dataset.passengerKey||String(index+1),
    type:card.dataset.passengerType||'adult',
    surname:card.querySelector('[name="surname"]')?.value?.trim()||'',
    givenName:card.querySelector('[name="givenName"]')?.value?.trim()||'',
    birthDate:card.querySelector('[name="birthDate"]')?.value||'',
    gender:card.querySelector('[name="gender"]')?.value||'',
    email:card.querySelector('[name="email"]')?.value?.trim()||'',
    phone:card.querySelector('[name="phone"]')?.value?.trim()||''
  }));
}
function passengerName(item){return [item?.surname,item?.givenName].filter(Boolean).join(' ').trim();}
function itineraryParts(){
  const text=document.querySelector('[data-booking-summary] p')?.textContent?.trim()||'';
  return text?text.split(/\s+\/\s+/):[];
}
function segmentFromPart(part,index){
  const routeMatch=String(part||'').match(/([A-Z]{3})\s*→\s*([A-Z]{3})/);
  const flightMatch=String(part||'').match(/^([A-Z0-9-]+)/);
  const bits=String(part||'').split('·').map(value=>value.trim()).filter(Boolean);
  const seats=(bits.at(-1)||'').split(',').map(value=>value.trim()).filter(value=>/^\d+[A-Z]$/i.test(value));
  const from=document.getElementById('fromInput')?.value||'';
  const to=document.getElementById('toInput')?.value||'';
  const round=!document.getElementById('returnField')?.hidden;
  const origin=routeMatch?.[1]||(index===0?from:to);
  const destination=routeMatch?.[2]||(index===0?to:from);
  return {
    direction:index===0?'outbound':'inbound',
    flightNumber:flightMatch?.[1]||'XS000',
    origin,destination,
    date:index===0?(document.getElementById('departureDate')?.value||''):(round?(document.getElementById('returnDate')?.value||''):(document.getElementById('departureDate')?.value||'')),
    departure:'00:00',arrival:'00:00',aircraft:'',
    cabin:document.getElementById('cabinClass')?.value||'economy',
    fareFamily:'',fareName:bits[1]||'',fare:0,
    seats,seatDetails:seats.map(id=>({id,type:'standard',fee:0})),
    passengerName:'',passengerCounts:passengerCounts()
  };
}
function bookingSnapshot(reference,payment){
  const user=auth.currentUser;
  const passengerList=manifest();
  const lead=passengerList.find(item=>item.type==='adult')||passengerList[0]||{};
  const parts=itineraryParts();
  const segmentList=(parts.length?parts:['']).map((part,index)=>segmentFromPart(part,index)).map(segment=>({...segment,passengerName:passengerName(lead)}));
  const selectedCabin=document.getElementById('cabinClass')?.value||'economy';
  return {
    bookingRef:reference,userId:user.uid,email:user.email||'',
    origin:segmentList[0]?.origin||document.getElementById('fromInput')?.value||'',
    destination:segmentList.at(-1)?.destination||document.getElementById('toInput')?.value||'',
    flightNumber:segmentList[0]?.flightNumber||'XS000',segments:segmentList,
    passengers:Math.max(1,passengerList.length||Number(document.getElementById('passengerCount')?.value||1)),
    cabin:selectedCabin==='economy'?'economy':'premium',
    totalFare:integerFromText(document.querySelector('[data-booking-summary] p:nth-of-type(2)')?.textContent||''),
    currency:'KRW',
    milesEarned:integerFromText(document.querySelector('.booking-miles-summary')?.textContent||''),
    status:'ticketed',
    passengerManifest:passengerList,
    passengerCount:Math.max(1,passengerList.length||Number(document.getElementById('passengerCount')?.value||1)),
    leadPassengerName:passengerName(lead),
    contactEmail:lead.email||user.email||'',
    contactPhone:lead.phone||'',
    paymentStatus:'paid-demo',paymentMethod:payment.method,paymentMode:'simulation',paymentReference:payment.reference,
    createdAt:new Date().toISOString()
  };
}
function saveBooking(data){
  try{
    const list=JSON.parse(localStorage.getItem('stellaris-bookings-v1')||'[]');
    const filtered=Array.isArray(list)?list.filter(item=>item.bookingRef!==data.bookingRef):[];
    filtered.unshift(data);
    localStorage.setItem('stellaris-bookings-v1',JSON.stringify(filtered.slice(0,50)));
  }catch(error){console.warn('Local booking save failed.',error);}
  try{sessionStorage.setItem('stellaris-pending-booking',JSON.stringify(data));}catch(error){}
}

// Passenger-info.js validates the first click, marks passengerManifestReady, then re-clicks.
// This capture handler owns only that validated second click and opens the simple checkout.
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-issue-ticket]');
  if(!button)return;
  const passengerSection=document.querySelector('[data-passenger-information]');
  if(passengerSection&&!passengerSection.hidden&&button.dataset.passengerManifestReady!=='true')return;
  const confirm=document.querySelector('[data-booking-confirm]');
  if(confirm?.hidden)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if(!auth.currentUser){openPayment();showError(t('login'));return;}
  openPayment();
},true);

closeButtons.forEach(button=>button.addEventListener('click',()=>closePayment()));
modal?.addEventListener('click',event=>{if(event.target===modal)closePayment();});
declineButton?.addEventListener('click',()=>closePayment());

approveButton?.addEventListener('click',()=>{
  if(processing)return;
  if(!auth.currentUser){showError(t('login'));return;}
  setProcessing(true);
  if(errorBox){errorBox.hidden=true;errorBox.textContent='';}

  const payment={status:'paid-demo',method:method?.value||'demo-card',reference:demoReference()};
  const reference=bookingReference();
  let data;
  try{
    data=bookingSnapshot(reference,payment);
    saveBooking(data);
    localStorage.setItem('stellaris-demo-payment-v1',JSON.stringify(payment));
  }catch(error){
    console.error('Checkout snapshot failed.',error);
    data={bookingRef:reference,userId:auth.currentUser.uid,email:auth.currentUser.email||'',segments:[],passengers:1,cabin:'economy',totalFare:0,currency:'KRW',milesEarned:0,status:'ticketed',passengerManifest:[],paymentStatus:'paid-demo',paymentMethod:payment.method,paymentMode:'simulation',paymentReference:payment.reference,createdAt:new Date().toISOString()};
    saveBooking(data);
  }

  window.setTimeout(()=>{
    setProcessing(false);
    closePayment(true);
    window.location.assign(`../booking-complete/?booking=${encodeURIComponent(reference)}`);
  },1000);
});

window.addEventListener('stellaris:languagechange',syncLanguage);
syncLanguage();