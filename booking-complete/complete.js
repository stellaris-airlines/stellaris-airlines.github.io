import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc, runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const $=selector=>document.querySelector(selector);
const params=new URLSearchParams(location.search);
const reference=(params.get('booking')||'').trim().toUpperCase();
const refNode=$('[data-complete-ref]');
const passengerNode=$('[data-complete-passenger]');
const flightNode=$('[data-complete-flight]');
const routeNode=$('[data-complete-route]');
const seatNode=$('[data-complete-seat]');
const statusNode=$('[data-sync-status]');
const retryButton=$('[data-sync-retry]');
let syncRunning=false;
const HOLD_MS=15*60*1000;

function readLocalBookings(){try{return JSON.parse(localStorage.getItem('stellaris-bookings-v1')||'[]');}catch(error){return [];}}
function readPending(){try{return JSON.parse(sessionStorage.getItem('stellaris-pending-booking')||'null');}catch(error){return null;}}
function findBooking(){const pending=readPending();if(pending?.bookingRef===reference)return pending;return readLocalBookings().find(item=>item.bookingRef===reference)||null;}
function passengerName(booking){const lead=booking?.passengerManifest?.find(item=>item.type==='adult')||booking?.passengerManifest?.[0];return [lead?.surname,lead?.givenName].filter(Boolean).join(' ').trim()||booking?.leadPassengerName||booking?.email||'-';}
function render(booking){
  refNode.textContent=reference||'-';
  if(!booking){
    passengerNode.textContent='-';flightNode.textContent='-';routeNode.textContent='-';seatNode.textContent='-';
    statusNode.className='sync-status error';statusNode.textContent='이 브라우저에서 예약 정보를 찾지 못했습니다. 예약을 다시 진행해 주세요.';retryButton.hidden=true;return;
  }
  passengerNode.textContent=passengerName(booking);
  flightNode.textContent=(booking.segments||[]).map(segment=>segment.flightNumber).filter(Boolean).join(' / ')||booking.flightNumber||'-';
  routeNode.textContent=(booking.segments||[]).map(segment=>`${segment.origin||''} → ${segment.destination||''}`).filter(Boolean).join(' / ')||`${booking.origin||''} → ${booking.destination||''}`;
  seatNode.textContent=(booking.segments||[]).map(segment=>(segment.seats||[]).join(', ')).filter(Boolean).join(' / ')||'-';
  queueMicrotask(()=>window.STELLARIS_AUTO_TRANSLATE?.translate?.());
}
function safeCabin(value){return ['economy','premium','business','first'].includes(value)?value:'economy';}
function safeSegments(booking){
  const list=Array.isArray(booking.segments)?booking.segments.filter(segment=>segment&&segment.origin&&segment.destination):[];
  if(list.length)return list.slice(0,2).map(segment=>({...segment,cabin:safeCabin(segment.cabin||booking.cabin)}));
  return [{direction:'outbound',flightNumber:booking.flightNumber||'XS000',origin:booking.origin||'',destination:booking.destination||'',date:booking.date||'',departure:booking.departure||'00:00',arrival:booking.arrival||'00:00',aircraft:booking.aircraft||'',cabin:safeCabin(booking.cabin),fareFamily:'',fareName:'',fare:0,seats:[],seatDetails:[],passengerName:passengerName(booking)}];
}
function createPayload(booking,user){
  const segments=safeSegments(booking);
  return {bookingRef:booking.bookingRef,userId:user.uid,email:user.email||booking.email||'',origin:booking.origin||segments[0]?.origin||'',destination:booking.destination||segments.at(-1)?.destination||'',flightNumber:booking.flightNumber||segments[0]?.flightNumber||'XS000',segments,passengers:Math.max(1,Math.min(9,Number(booking.passengers||booking.passengerCount||1))),cabin:safeCabin(booking.cabin),totalFare:Math.max(0,Math.trunc(Number(booking.totalFare||0))),currency:'KRW',milesEarned:Math.max(0,Math.trunc(Number(booking.milesEarned||0))),status:'ticketed'};
}
function updateLocal(referenceValue,patch){
  try{const list=readLocalBookings();const index=list.findIndex(item=>item.bookingRef===referenceValue);if(index>=0){list[index]={...list[index],...patch};localStorage.setItem('stellaris-bookings-v1',JSON.stringify(list));}}catch(error){}
}
function flightKey(segment){return [segment.date,segment.flightNumber,segment.origin,segment.destination,safeCabin(segment.cabin)].join('_').replace(/[^A-Za-z0-9_-]/g,'');}
function seatEntries(booking){
  return safeSegments(booking).flatMap(segment=>(Array.isArray(segment.seats)?segment.seats:[]).map(seatId=>({segment,seatId:String(seatId),key:flightKey(segment)})));
}
function millis(value){return value&&typeof value.toMillis==='function'?value.toMillis():0;}
async function ensureSeatHolds(user,booking){
  for(const entry of seatEntries(booking)){
    const seatRef=doc(db,'flightInventories',entry.key,'seats',entry.seatId);
    await runTransaction(db,async transaction=>{
      const snap=await transaction.get(seatRef);
      const now=Date.now(),expiresAt=Timestamp.fromMillis(now+HOLD_MS);
      if(snap.exists()){
        const data=snap.data();
        if(data.status==='ticketed'){
          if(data.ownerId===user.uid&&data.bookingRef===booking.bookingRef)return;
          throw new Error('seat-unavailable');
        }
        if(data.status==='held'&&data.ownerId!==user.uid&&millis(data.holdExpiresAt)>now)throw new Error('seat-unavailable');
        if(data.status==='held'&&data.ownerId===user.uid&&millis(data.holdExpiresAt)>now)return;
      }
      const segment=entry.segment;
      transaction.set(seatRef,{flightKey:entry.key,flightNumber:String(segment.flightNumber||''),date:String(segment.date||''),origin:String(segment.origin||''),destination:String(segment.destination||''),aircraft:String(segment.aircraft||''),cabin:safeCabin(segment.cabin),seatId:entry.seatId,status:'held',ownerId:user.uid,holdExpiresAt:expiresAt,updatedAt:serverTimestamp()});
    });
  }
}
async function finalizeSeats(user,booking){
  for(const entry of seatEntries(booking)){
    const seatRef=doc(db,'flightInventories',entry.key,'seats',entry.seatId);
    const snap=await getDoc(seatRef);
    if(!snap.exists())throw new Error('seat-unavailable');
    const data=snap.data();
    if(data.status==='ticketed'&&data.ownerId===user.uid&&data.bookingRef===booking.bookingRef)continue;
    if(data.status!=='held'||data.ownerId!==user.uid||millis(data.holdExpiresAt)<=Date.now())throw new Error('seat-unavailable');
    await updateDoc(seatRef,{status:'ticketed',bookingId:booking.bookingRef,bookingRef:booking.bookingRef,updatedAt:serverTimestamp()});
  }
}
async function withTimeout(promise,ms=15000){
  let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('sync-timeout')),ms);});
  try{return await Promise.race([promise,timeout]);}finally{clearTimeout(timer);}
}
async function syncBooking(user,booking){
  if(!user)throw new Error('login-required');
  if(booking.userId&&booking.userId!==user.uid)throw new Error('account-mismatch');
  await ensureSeatHolds(user,booking);
  const serverRef=doc(db,'bookings',booking.bookingRef);
  const snapshot=await getDoc(serverRef);
  if(snapshot.exists()){
    if(snapshot.data()?.userId!==user.uid)throw new Error('account-mismatch');
  }else{
    await setDoc(serverRef,{...createPayload(booking,user),createdAt:serverTimestamp()});
  }
  const manifest=Array.isArray(booking.passengerManifest)?booking.passengerManifest:[];
  const lead=manifest.find(item=>item.type==='adult')||manifest[0]||{};
  const patch={paymentStatus:'paid-demo',paymentMethod:booking.paymentMethod||'demo-card',paymentMode:'simulation',paymentReference:booking.paymentReference||'',paymentUpdatedAt:serverTimestamp()};
  if(manifest.length){
    patch.passengerManifest=manifest;patch.passengerCount=Math.max(1,Math.min(9,Number(booking.passengers||booking.passengerCount||manifest.length||1)));
    patch.leadPassengerName=passengerName(booking);patch.contactEmail=lead.email||booking.email||user.email||'';patch.contactPhone=lead.phone||booking.contactPhone||'';patch.passengerManifestUpdatedAt=serverTimestamp();
  }
  await updateDoc(serverRef,patch);
  await finalizeSeats(user,booking);
  updateLocal(booking.bookingRef,{serverSynced:true,serverBookingId:serverRef.id});
  try{sessionStorage.removeItem('stellaris-pending-booking');}catch(error){}
}
async function runSync(user,booking){
  if(syncRunning)return;syncRunning=true;retryButton.hidden=true;statusNode.className='sync-status';statusNode.textContent='서버 예약과 좌석을 확인하고 있습니다…';
  queueMicrotask(()=>window.STELLARIS_AUTO_TRANSLATE?.translate?.());
  try{
    await withTimeout(syncBooking(user,booking));
    statusNode.className='sync-status success';statusNode.textContent='서버 예약과 좌석 확정이 완료되었습니다. 예약 조회와 온라인 체크인에서 사용할 수 있습니다.';retryButton.hidden=true;
  }catch(error){
    console.warn('Booking server sync failed.',error);
    statusNode.className='sync-status error';
    if(error?.message==='account-mismatch')statusNode.textContent='현재 로그인 계정과 예약 계정이 일치하지 않습니다.';
    else if(error?.message==='seat-unavailable')statusNode.textContent='선택한 좌석을 서버에서 확정할 수 없습니다. 다른 좌석으로 예약을 다시 진행해 주세요.';
    else if(error?.message==='sync-timeout')statusNode.textContent='예약 화면은 완료되었습니다. 서버 연결이 지연되고 있어 잠시 후 다시 저장할 수 있습니다.';
    else statusNode.textContent='예약 화면은 완료되었습니다. 서버 저장만 완료되지 않아 다시 시도할 수 있습니다.';
    retryButton.hidden=false;
  }finally{
    syncRunning=false;queueMicrotask(()=>window.STELLARIS_AUTO_TRANSLATE?.translate?.());
  }
}

const booking=findBooking();
render(booking);
retryButton?.addEventListener('click',()=>{if(auth.currentUser&&booking)void runSync(auth.currentUser,booking);});
onAuthStateChanged(auth,user=>{
  if(!booking)return;
  if(!user){statusNode.className='sync-status error';statusNode.textContent='서버 예약 저장을 위해 로그인 상태를 확인해 주세요.';retryButton.hidden=false;queueMicrotask(()=>window.STELLARIS_AUTO_TRANSLATE?.translate?.());return;}
  void runSync(user,booking);
});
