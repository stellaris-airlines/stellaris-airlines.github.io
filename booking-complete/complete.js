import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

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

function readLocalBookings(){
  try{return JSON.parse(localStorage.getItem('stellaris-bookings-v1')||'[]');}catch(error){return [];}
}
function readPending(){
  try{return JSON.parse(sessionStorage.getItem('stellaris-pending-booking')||'null');}catch(error){return null;}
}
function findBooking(){
  const pending=readPending();
  if(pending?.bookingRef===reference)return pending;
  return readLocalBookings().find(item=>item.bookingRef===reference)||null;
}
function passengerName(booking){
  const lead=booking?.passengerManifest?.find(item=>item.type==='adult')||booking?.passengerManifest?.[0];
  return [lead?.surname,lead?.givenName].filter(Boolean).join(' ').trim()||booking?.leadPassengerName||booking?.email||'-';
}
function render(booking){
  refNode.textContent=reference||'-';
  if(!booking){
    passengerNode.textContent='-';flightNode.textContent='-';routeNode.textContent='-';seatNode.textContent='-';
    statusNode.className='sync-status error';
    statusNode.textContent='이 브라우저에서 예약 정보를 찾지 못했습니다. 예약을 다시 진행해 주세요.';
    retryButton.hidden=true;
    return;
  }
  passengerNode.textContent=passengerName(booking);
  flightNode.textContent=(booking.segments||[]).map(segment=>segment.flightNumber).filter(Boolean).join(' / ')||booking.flightNumber||'-';
  routeNode.textContent=(booking.segments||[]).map(segment=>`${segment.origin||''} → ${segment.destination||''}`).filter(Boolean).join(' / ')||`${booking.origin||''} → ${booking.destination||''}`;
  seatNode.textContent=(booking.segments||[]).map(segment=>(segment.seats||[]).join(', ')).filter(Boolean).join(' / ')||'-';
}
function createPayload(booking,user){
  return {
    bookingRef:booking.bookingRef,
    userId:user.uid,
    email:user.email||booking.email||'',
    origin:booking.origin||booking.segments?.[0]?.origin||'',
    destination:booking.destination||booking.segments?.at(-1)?.destination||'',
    flightNumber:booking.flightNumber||booking.segments?.[0]?.flightNumber||'XS000',
    segments:Array.isArray(booking.segments)?booking.segments:[],
    passengers:Number(booking.passengers||booking.passengerCount||1),
    cabin:booking.cabin==='economy'?'economy':'premium',
    totalFare:Number(booking.totalFare||0),
    currency:'KRW',
    milesEarned:Number(booking.milesEarned||0),
    status:'ticketed'
  };
}
function updateLocal(referenceValue,patch){
  try{
    const list=readLocalBookings();
    const index=list.findIndex(item=>item.bookingRef===referenceValue);
    if(index>=0){
      list[index]={...list[index],...patch};
      localStorage.setItem('stellaris-bookings-v1',JSON.stringify(list));
    }
  }catch(error){}
}
async function resolveServerRef(user,booking){
  const snapshot=await getDocs(query(collection(db,'bookings'),where('userId','==',user.uid),where('bookingRef','==',booking.bookingRef)));
  if(!snapshot.empty)return snapshot.docs[0].ref;
  return doc(db,'bookings',booking.bookingRef);
}
async function syncBooking(user,booking){
  if(!user)throw new Error('login-required');
  if(booking.userId&&booking.userId!==user.uid)throw new Error('account-mismatch');
  const serverRef=await resolveServerRef(user,booking);
  const existing=await getDocs(query(collection(db,'bookings'),where('userId','==',user.uid),where('bookingRef','==',booking.bookingRef)));
  if(existing.empty){
    await setDoc(serverRef,{...createPayload(booking,user),createdAt:serverTimestamp()});
  }
  const manifest=Array.isArray(booking.passengerManifest)?booking.passengerManifest:[];
  const lead=manifest.find(item=>item.type==='adult')||manifest[0]||{};
  await updateDoc(serverRef,{
    passengerManifest:manifest,
    passengerCount:Number(booking.passengers||booking.passengerCount||manifest.length||1),
    leadPassengerName:passengerName(booking),
    contactEmail:lead.email||booking.email||user.email||'',
    contactPhone:lead.phone||booking.contactPhone||'',
    passengerManifestUpdatedAt:serverTimestamp(),
    paymentStatus:'paid-demo',
    paymentMethod:booking.paymentMethod||'demo-card',
    paymentMode:'simulation',
    paymentReference:booking.paymentReference||'',
    paymentUpdatedAt:serverTimestamp()
  });
  updateLocal(booking.bookingRef,{serverSynced:true,serverBookingId:serverRef.id});
  try{sessionStorage.removeItem('stellaris-pending-booking');}catch(error){}
}
async function runSync(user,booking){
  retryButton.hidden=true;
  statusNode.className='sync-status';
  statusNode.textContent='서버 예약 저장을 확인하고 있습니다…';
  try{
    await syncBooking(user,booking);
    statusNode.className='sync-status success';
    statusNode.textContent='서버 예약 저장이 완료되었습니다. 예약 조회와 온라인 체크인에서 사용할 수 있습니다.';
  }catch(error){
    console.warn('Booking server sync failed.',error);
    statusNode.className='sync-status error';
    statusNode.textContent=error?.message==='account-mismatch'
      ?'현재 로그인 계정과 예약 계정이 일치하지 않습니다.'
      :'예약 화면은 정상 완료되었습니다. 서버 저장만 완료되지 않아 다시 시도할 수 있습니다.';
    retryButton.hidden=false;
  }
}

const booking=findBooking();
render(booking);
retryButton?.addEventListener('click',()=>{if(auth.currentUser&&booking)void runSync(auth.currentUser,booking);});
onAuthStateChanged(auth,user=>{
  if(!booking)return;
  if(!user){
    statusNode.className='sync-status error';
    statusNode.textContent='서버 예약 저장을 위해 로그인 상태를 확인해 주세요.';
    retryButton.hidden=false;
    return;
  }
  void runSync(user,booking);
});