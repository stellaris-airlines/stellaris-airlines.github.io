import { auth, db } from './firebase-config.js';
import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { bookingSeatInventoryKey, checkInWindow, escapeHtml, operationDocumentId } from './travel-service-core.js?v=20260817-digital-v1';

if(!document.querySelector('link[data-digital-services-style]')){const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./service-pages.css?v=20260817-digital-v1',import.meta.url).href;style.dataset.digitalServicesStyle='true';document.head.appendChild(style);}
const page=document.body.dataset.page||'';
function root(path=''){return new URL(path,import.meta.url).href;}
function addNavLink(host,path,label,marker){
  if(!host||[...host.querySelectorAll('a')].some(a=>a.dataset[marker]))return;
  const a=document.createElement('a');a.href=root(path);a.textContent=label;a.dataset[marker]='true';host.appendChild(a);
}
function installServiceNavigation(){
  const mobile=document.getElementById('mobileNav');
  addNavLink(mobile,'check-in/','온라인 체크인','checkinNav');
  addNavLink(mobile,'my-page/','My Page','mypageNav');
  document.querySelectorAll('.footer-columns>div').forEach(col=>{if(col.querySelector('strong')?.textContent.trim()==='서비스')addNavLink(col,'check-in/','온라인 체크인','checkinFooter');});
  const userTools=document.querySelector('.header-tools');
  if(userTools&&!userTools.querySelector('[data-mypage-tool]')){
    const login=userTools.querySelector('[data-auth-user]');
    if(login){const a=document.createElement('a');a.href=root('my-page/');a.textContent='My Page';a.dataset.mypageTool='true';a.hidden=login.hidden;login.insertAdjacentElement('afterend',a);}
  }
}
installServiceNavigation();
const navObserver=new MutationObserver(()=>queueMicrotask(installServiceNavigation));navObserver.observe(document.body,{childList:true,subtree:true});

async function ownedBooking(reference){
  const user=auth.currentUser;if(!user)return null;
  const snap=await getDocs(query(collection(db,'bookings'),where('userId','==',user.uid),where('bookingRef','==',reference)));
  const d=snap.docs[0];return d?{id:d.id,...d.data()}:null;
}
async function liveOperation(segment){
  if(!segment)return null;
  try{const snap=await getDoc(doc(db,'flightOperations',operationDocumentId(segment)));return snap.exists()?snap.data():null;}catch(error){return null;}
}
async function cancelBooking(reference,button){
  const booking=await ownedBooking(reference);if(!booking)throw new Error('booking-not-found');
  if(booking.status==='cancelled')return;
  if(!confirm(`예약 ${reference}을(를) 취소하고 가상 환불 처리할까요?`))return;
  button.disabled=true;button.textContent='취소 처리 중…';
  const batch=writeBatch(db),bookingRef=doc(db,'bookings',booking.id);
  batch.update(bookingRef,{status:'cancelled',cancellationStatus:'cancelled-demo',paymentStatus:'refunded-demo',refundAmount:Number(booking.totalFare||0),cancelledAt:serverTimestamp(),checkInStatus:'cancelled'});
  for(const segment of booking.segments||[]){const key=bookingSeatInventoryKey(segment);for(const seatId of segment.seats||[])batch.delete(doc(db,'flightInventories',key,'seats',seatId));}
  await batch.commit();location.reload();
}
async function requestChange(reference,button){
  const booking=await ownedBooking(reference);if(!booking)throw new Error('booking-not-found');
  if(booking.status!=='ticketed')throw new Error('not-ticketed');
  const current=booking.segments?.[0]?.date||'';
  const requested=prompt('변경을 원하는 출발일을 YYYY-MM-DD 형식으로 입력하세요.',current);
  if(!requested)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(requested)){alert('날짜 형식을 확인해 주세요.');return;}
  button.disabled=true;button.textContent='요청 저장 중…';
  await updateDoc(doc(db,'bookings',booking.id),{changeStatus:'requested-demo',requestedDepartureDate:requested,changeRequestedAt:serverTimestamp()});
  alert('가상 변경 요청을 저장했습니다. 실제 운항편 변경은 관리자 확인 후 처리하는 구조입니다.');button.disabled=false;button.textContent='예약 변경 요청';
}
async function decorateReservationCard(card){
  if(card.dataset.manageReady)return;card.dataset.manageReady='true';
  const reference=card.querySelector('.reservation-card-head h3')?.textContent.trim().toUpperCase();if(!reference)return;
  const booking=await ownedBooking(reference).catch(()=>null);if(!booking)return;
  const segment=booking.segments?.[0]||null,windowState=checkInWindow(booking),operation=await liveOperation(segment);
  const operationState=card.querySelector('.operation-state');
  if(operationState&&operation?.status)operationState.textContent='● '+operation.status+(operation.delayMinutes?` +${operation.delayMinutes}분`:'');
  const ops=card.querySelector('.reservation-operations');
  if(ops&&operation&&(operation.gate||operation.terminal)&&!ops.querySelector('[data-live-gate]')){const div=document.createElement('div');div.dataset.liveGate='true';div.innerHTML=`<span>Gate / Terminal</span><b>${escapeHtml(operation.gate||'TBD')} · ${escapeHtml(operation.terminal||'TBD')}</b>`;ops.appendChild(div);}
  const actions=document.createElement('div');actions.className='manage-booking-actions';
  actions.innerHTML=`<a class="btn btn-dark" href="${root(`booking-confirmation/?booking=${encodeURIComponent(reference)}`)}">예약 확인서</a>${windowState.state==='open'&&booking.status==='ticketed'?`<a class="btn btn-olive" href="${root('check-in/')}">온라인 체크인</a>`:''}${booking.checkInStatus==='checked-in'?`<a class="btn btn-olive" href="${root(`boarding-pass/?booking=${encodeURIComponent(reference)}`)}">탑승권</a>`:''}${booking.status==='ticketed'?'<button class="btn btn-dark" type="button" data-change-booking>예약 변경 요청</button><button class="btn btn-dark" type="button" data-cancel-booking>예약 취소 · 가상 환불</button>':''}`;
  actions.querySelector('[data-change-booking]')?.addEventListener('click',e=>requestChange(reference,e.currentTarget).catch(()=>alert('변경 요청을 저장하지 못했습니다. Firestore Rules를 확인해 주세요.')));
  actions.querySelector('[data-cancel-booking]')?.addEventListener('click',e=>cancelBooking(reference,e.currentTarget).catch(()=>{e.currentTarget.disabled=false;e.currentTarget.textContent='예약 취소 · 가상 환불';alert('취소 처리에 실패했습니다. Firestore Rules를 확인해 주세요.');}));
  card.appendChild(actions);
}
function installReservationManagement(){document.querySelectorAll('.reservation-card').forEach(card=>void decorateReservationCard(card));}
if(page==='find-your-reservations'){installReservationManagement();new MutationObserver(()=>queueMicrotask(installReservationManagement)).observe(document.body,{childList:true,subtree:true});}

function installTicketEnhancement(){
  const modal=document.querySelector('[data-ticket-modal]');if(!modal)return;
  const enhance=()=>{if(modal.hidden)return;const ref=modal.querySelector('[data-ticket-ref]')?.textContent.trim();if(!ref)return;let box=modal.querySelector('[data-ticket-service-actions]');if(!box){box=document.createElement('div');box.className='service-actions';box.dataset.ticketServiceActions='true';modal.querySelector('.ticket-dialog')?.appendChild(box);}box.innerHTML=`<a class="btn btn-dark" href="${root(`booking-confirmation/?booking=${encodeURIComponent(ref)}`)}">예약 확인서</a><a class="btn btn-dark" href="${root('my-page/')}">My Page</a>`;};
  new MutationObserver(enhance).observe(modal,{attributes:true,attributeFilter:['hidden'],subtree:true,childList:true});enhance();
}
if(page==='book-your-journey')installTicketEnhancement();

function renderLiveOps(items,panel){
  panel.innerHTML=`<div class="shell"><div class="section-head"><div><p class="eyebrow">LIVE OPERATIONS</p><h2>운항 현황</h2></div><p>관리자 운항 데이터와 연결된 현재 운영 정보입니다.</p></div><div class="live-ops-board">${items.length?items.map(item=>`<div class="live-op-row"><strong>${escapeHtml(item.flightNumber||'')}</strong><div><b>${escapeHtml(item.origin||'')} → ${escapeHtml(item.destination||'')}</b><br><small>${escapeHtml(item.date||'')} · ${escapeHtml(item.scheduledDeparture||'')}</small></div><span class="service-status">${escapeHtml(item.status||'정상 운항 예정')}</span><span>Gate ${escapeHtml(item.gate||'TBD')}</span><span>${item.delayMinutes?`+${Number(item.delayMinutes)}분`:'정시'}</span></div>`).join(''):'<div class="service-message">관리자가 등록한 운항 현황이 아직 없습니다. 공개 정기 운항 스케줄을 확인해 주세요.</div>'}</div></div>`;
}
function installLiveOperations(){
  const panel=document.querySelector('[data-flight-panel="status"]');if(!panel)return;
  onSnapshot(collection(db,'flightOperations'),snap=>{const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const items=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!x.date||x.date>=today).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.scheduledDeparture||'').localeCompare(String(b.scheduledDeparture||''))).slice(0,30);renderLiveOps(items,panel);},()=>renderLiveOps([],panel));
}
if(page==='flight-information')installLiveOperations();
