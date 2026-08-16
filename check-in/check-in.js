import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { boardingTime, checkInWindow, escapeHtml, operationDocumentId, passengerLabel } from '../travel-service-core.js?v=20260817-digital-v1';

const message=document.querySelector('[data-checkin-message]');
const list=document.querySelector('[data-checkin-list]');
let currentUser=null;

function fmt(ms){
  if(!Number.isFinite(ms))return '—';
  return new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(ms));
}
function stateCopy(windowState){
  if(windowState.state==='open')return ['체크인 가능','ok'];
  if(windowState.state==='closed')return ['체크인 종료','closed'];
  if(windowState.state==='not-open')return [`${fmt(windowState.openAt)}부터 가능`,'warn'];
  return ['시간 확인 필요','warn'];
}
function manifests(booking){
  const manifest=Array.isArray(booking.passengerManifest)?booking.passengerManifest:[];
  if(manifest.length)return manifest;
  return [{givenName:String(booking.leadPassengerName||booking.email||'Passenger'),surname:'',type:'adult'}];
}
async function operationFor(segment){
  try{const snap=await getDoc(doc(db,'flightOperations',operationDocumentId(segment)));return snap.exists()?snap.data():{};}catch(error){return {};}
}
function renderBooking(booking){
  const segment=Array.isArray(booking.segments)?booking.segments[0]:null;
  const windowState=checkInWindow(booking),[label,kind]=stateCopy(windowState);
  const already=booking.checkInStatus==='checked-in';
  const canCheck=booking.status==='ticketed'&&windowState.state==='open'&&!already;
  const route=segment?`${escapeHtml(segment.origin)} → ${escapeHtml(segment.destination)}`:'—';
  const action=already
    ?`<a class="btn btn-olive" href="../boarding-pass/?booking=${encodeURIComponent(booking.bookingRef||'')}">모바일 탑승권 보기</a>`
    :canCheck?`<button class="btn btn-olive" type="button" data-checkin-booking="${escapeHtml(booking.id)}">온라인 체크인</button>`:'';
  return `<article class="service-card" data-booking-card="${escapeHtml(booking.id)}"><div class="service-card-head"><div><p class="eyebrow">${escapeHtml(booking.bookingRef||'BOOKING')}</p><h2>${route}</h2><p class="service-muted">${escapeHtml(segment?.flightNumber||'')} · ${escapeHtml(segment?.date||'')} ${escapeHtml(segment?.departure||'')} · ${escapeHtml(segment?.aircraft||'')}</p></div><span class="service-status ${already?'ok':kind}">${already?'체크인 완료':label}</span></div><div class="service-meta"><div><span>예약번호</span><b>${escapeHtml(booking.bookingRef||'—')}</b></div><div><span>좌석</span><b>${escapeHtml((segment?.seats||[]).join(', ')||'—')}</b></div><div><span>승객</span><b>${escapeHtml(booking.passengerCount??booking.passengers??manifests(booking).length)}</b></div><div><span>체크인 오픈</span><b>${fmt(windowState.openAt)}</b></div></div><div class="service-actions">${action}<a class="btn btn-dark" href="../booking-confirmation/?booking=${encodeURIComponent(booking.bookingRef||'')}">예약 확인서</a></div></article>`;
}
async function loadBookings(user){
  message.textContent='예약을 확인하고 있습니다…';message.className='service-message';list.hidden=true;
  try{
    const snap=await getDocs(query(collection(db,'bookings'),where('userId','==',user.uid)));
    const bookings=snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.status!=='cancelled').sort((a,b)=>(checkInWindow(a).departure||Infinity)-(checkInWindow(b).departure||Infinity));
    if(!bookings.length){message.textContent='체크인 가능한 예약이 없습니다.';return;}
    list.innerHTML=bookings.map(renderBooking).join('');list.hidden=false;message.hidden=true;
  }catch(error){message.textContent='예약을 불러오지 못했습니다. 로그인 상태와 Firestore 권한을 확인해 주세요.';message.className='service-message error';}
}
async function checkIn(bookingId,button){
  if(!currentUser)return;
  button.disabled=true;button.textContent='체크인 처리 중…';
  try{
    const ref=doc(db,'bookings',bookingId),snap=await getDoc(ref);
    if(!snap.exists())throw new Error('booking-not-found');
    const booking={id:snap.id,...snap.data()};
    if(booking.userId!==currentUser.uid)throw new Error('not-owner');
    const windowState=checkInWindow(booking);
    if(windowState.state!=='open')throw new Error('checkin-window-closed');
    const segment=booking.segments?.[0]||{};
    const operation=await operationFor(segment);
    const passengers=manifests(booking),seats=Array.isArray(segment.seats)?segment.seats:[];
    let seatIndex=0;
    const boardingPasses=passengers.map((p,index)=>{
      const infant=String(p.type||'').toLowerCase().includes('infant');
      const seat=infant?'INF':(seats[seatIndex++]||'TBD');
      return {passengerName:passengerLabel(p,index),passengerType:p.type||'',seat,flightNumber:segment.flightNumber||'',origin:segment.origin||'',destination:segment.destination||'',date:segment.date||'',departure:segment.departure||'',boardingTime:operation.boardingTime||boardingTime(segment),gate:operation.gate||'TBD',terminal:operation.terminal||'TBD'};
    });
    await updateDoc(ref,{checkInStatus:'checked-in',checkedInAt:serverTimestamp(),boardingPassIssuedAt:serverTimestamp(),boardingPasses});
    location.href=`../boarding-pass/?booking=${encodeURIComponent(booking.bookingRef||'')}`;
  }catch(error){
    button.disabled=false;button.textContent='온라인 체크인';
    message.hidden=false;message.className='service-message error';
    message.textContent=String(error?.message||'')==='checkin-window-closed'?'온라인 체크인은 출발 24시간 전부터 출발 시각 전까지 가능합니다.':'체크인 처리에 실패했습니다. Firestore Rules가 최신인지 확인해 주세요.';
  }
}
list?.addEventListener('click',event=>{const button=event.target.closest('[data-checkin-booking]');if(button)void checkIn(button.dataset.checkinBooking,button);});
onAuthStateChanged(auth,user=>{
  currentUser=user;
  if(!user){message.innerHTML='온라인 체크인을 이용하려면 <a href="../login/?next=../check-in/">로그인</a>해 주세요.';message.className='service-message';list.hidden=true;return;}
  void loadBookings(user);
});
