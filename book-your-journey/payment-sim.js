import { auth, db } from '../firebase-config.js';
import { collection, doc, serverTimestamp, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const issueButton=document.querySelector('[data-issue-ticket]');
const modal=document.querySelector('[data-payment-sim-modal]');
const summary=document.querySelector('[data-payment-sim-summary]');
const method=document.querySelector('[data-payment-sim-method]');
const errorBox=document.querySelector('[data-payment-sim-error]');
const ticketModal=document.querySelector('[data-ticket-modal]');
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
  closeButtons.forEach(button=>{button.disabled=value;});
}
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
function showError(text){if(errorBox){errorBox.textContent=text;errorBox.hidden=false;}}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
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
function segmentFromCard(card,part,index){
  const bits=String(part||'').split('·').map(x=>x.trim()).filter(Boolean);
  const routeMatch=String(part||'').match(/([A-Z]{3})\s*→\s*([A-Z]{3})/);
  const flightMatch=String(part||'').match(/^([A-Z0-9-]+)/);
  const times=[...card?.querySelectorAll('.flight-route-time b')||[]].map(node=>(node.textContent.match(/\d{1,2}:\d{2}/)||[''])[0]);
  const chip=card?.querySelector('.aircraft-chip')?.textContent||'';
  const chipBits=chip.split('·').map(x=>x.trim());
  const fareButton=card?.querySelector('.fare-choice.is-selected');
  const seats=(bits.at(-1)||'').split(',').map(x=>x.trim()).filter(x=>/^\d+[A-Z]$/i.test(x));
  const from=document.getElementById('fromInput')?.value||'';
  const to=document.getElementById('toInput')?.value||'';
  const round=!document.getElementById('returnField')?.hidden;
  const origin=routeMatch?.[1]||(index===0?from:to);
  const destination=routeMatch?.[2]||(index===0?to:from);
  return {
    direction:index===0?'outbound':'inbound',
    flightNumber:flightMatch?.[1]||card?.querySelector('.flight-option-top strong')?.textContent?.trim()||'XS000',
    origin,destination,
    date:index===0?(document.getElementById('departureDate')?.value||''):(round?(document.getElementById('returnDate')?.value||''):(document.getElementById('departureDate')?.value||'')),
    departure:times[0]||'00:00',arrival:times[1]||'00:00',
    aircraft:chipBits[1]||'',
    cabin:document.getElementById('cabinClass')?.value||'economy',
    fareFamily:fareButton?.dataset.family||'',fareName:bits[1]||'',fare:0,
    seats,seatDetails:seats.map(id=>({id,type:'standard',fee:0})),
    passengerName:'',passengerCounts:passengerCounts()
  };
}
function segments(){
  const cards=[...document.querySelectorAll('.flight-option.is-selected')];
  const parts=itineraryParts();
  const count=Math.max(cards.length,parts.length,1);
  return Array.from({length:count},(_,index)=>segmentFromCard(cards[index]||null,parts[index]||'',index));
}
function bookingSnapshot(reference){
  const user=auth.currentUser;
  const passengerList=manifest();
  const lead=passengerList.find(item=>item.type==='adult')||passengerList[0]||{};
  const segs=segments().map(segment=>({...segment,passengerName:passengerName(lead)}));
  const totalFare=integerFromText(document.querySelector('[data-booking-summary] p:nth-of-type(2) b')?.textContent||document.querySelector('[data-booking-summary] p:nth-of-type(2)')?.textContent||'');
  const milesEarned=integerFromText(document.querySelector('.booking-miles-summary b')?.textContent||'');
  const selectedCabin=document.getElementById('cabinClass')?.value||'economy';
  return {
    bookingRef:reference,userId:user.uid,email:user.email||'',
    origin:segs[0]?.origin||document.getElementById('fromInput')?.value||'',
    destination:segs.at(-1)?.destination||document.getElementById('toInput')?.value||'',
    flightNumber:segs[0]?.flightNumber||'XS000',segments:segs,
    passengers:Math.max(1,passengerList.length||Number(document.getElementById('passengerCount')?.value||1)),
    cabin:selectedCabin==='economy'?'economy':'premium',totalFare,currency:'KRW',milesEarned,status:'ticketed',
    _manifest:passengerList,_lead:lead
  };
}
function saveLocal(data,payment){
  try{
    const list=JSON.parse(localStorage.getItem('stellaris-bookings-v1')||'[]');
    list.unshift({...data,passengerManifest:data._manifest,passengerCount:data.passengers,leadPassengerName:passengerName(data._lead),contactEmail:data._lead?.email||data.email,contactPhone:data._lead?.phone||'',paymentStatus:'paid-demo',paymentMethod:payment.method,paymentMode:'simulation',paymentReference:payment.reference,createdAt:new Date().toISOString()});
    localStorage.setItem('stellaris-bookings-v1',JSON.stringify(list.slice(0,50)));
  }catch(error){}
}
function publicBookingData(data){
  const clone={...data};delete clone._manifest;delete clone._lead;return clone;
}
async function syncServer(data,payment){
  const bookingRef=doc(collection(db,'bookings'));
  await setDoc(bookingRef,{...publicBookingData(data),createdAt:serverTimestamp()});
  const lead=data._lead||{};
  const payload={
    paymentStatus:'paid-demo',paymentMethod:payment.method,paymentMode:'simulation',paymentReference:payment.reference,paymentUpdatedAt:serverTimestamp(),
    passengerManifest:data._manifest||[],passengerCount:data.passengers,leadPassengerName:passengerName(lead),contactEmail:lead.email||data.email,contactPhone:lead.phone||'',passengerManifestUpdatedAt:serverTimestamp()
  };
  await updateDoc(bookingRef,payload);
  return bookingRef.id;
}
function showTicket(data){
  if(!ticketModal)return;
  const lead=data._lead||{};
  document.querySelector('[data-ticket-ref]').textContent=data.bookingRef;
  document.querySelector('[data-ticket-passenger]').textContent=passengerName(lead)||auth.currentUser?.displayName||auth.currentUser?.email||'';
  document.querySelector('[data-ticket-flight]').textContent=data.segments.map(segment=>segment.flightNumber).join(' / ');
  document.querySelector('[data-ticket-seat]').textContent=data.segments.map(segment=>segment.flightNumber+' · '+(segment.seats.join(', ')||'-')).join(' / ');
  ticketModal.hidden=false;
  document.body.classList.add('ticket-modal-open');
}

// Passenger-info.js validates and marks the first click, then re-clicks the issue button.
// This handler owns only that second click so the old Firestore ticketing transaction is bypassed.
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-issue-ticket]');
  if(!button)return;
  const passengerSection=document.querySelector('[data-passenger-information]');
  if(passengerSection&&!passengerSection.hidden&&button.dataset.passengerManifestReady!=='true')return;
  const confirm=document.querySelector('[data-booking-confirm]');
  if(confirm?.hidden)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(!auth.currentUser){openPayment();showError(t('login'));return;}
  openPayment();
},true);

closeButtons.forEach(button=>button.addEventListener('click',()=>closePayment()));
modal?.addEventListener('click',event=>{if(event.target===modal)closePayment();});
declineButton?.addEventListener('click',()=>closePayment());

approveButton?.addEventListener('click',async()=>{
  if(processing)return;
  if(!auth.currentUser){showError(t('login'));return;}
  setProcessing(true);
  if(errorBox){errorBox.hidden=true;errorBox.textContent='';}

  const payment={status:'paid-demo',method:method?.value||'demo-card',reference:demoReference()};
  const reference=bookingReference();
  const data=bookingSnapshot(reference);
  window.STELLARIS_DEMO_PAYMENT=payment;
  localStorage.setItem('stellaris-demo-payment-v1',JSON.stringify(payment));
  saveLocal(data,payment);

  // Start server synchronization immediately, but never make the user wait on it.
  const serverSync=syncServer(data,payment).catch(error=>{
    console.warn('Background booking sync failed; local confirmation remains available.',error);
    return null;
  });

  await sleep(1000);
  setProcessing(false);
  closePayment(true);
  showTicket(data);
  void serverSync;
});

window.addEventListener('stellaris:languagechange',syncLanguage);
syncLanguage();
