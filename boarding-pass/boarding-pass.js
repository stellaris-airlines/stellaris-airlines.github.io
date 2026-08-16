import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { escapeHtml, pseudoQrBits } from '../travel-service-core.js?v=20260817-digital-v1';

const params=new URLSearchParams(location.search),bookingRef=String(params.get('booking')||'').trim().toUpperCase();
const message=document.querySelector('[data-pass-message]'),list=document.querySelector('[data-pass-list]');
document.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
function qrMarkup(seed){return `<div class="pseudo-qr" aria-label="탑승권 확인용 코드">${pseudoQrBits(seed).map(on=>`<i${on?' class="on"':''}></i>`).join('')}</div>`;}
function passMarkup(pass,booking,index){
  return `<article class="boarding-pass"><div class="boarding-pass-head"><div><small>STELLARIS AIRLINES · MOBILE BOARDING PASS</small><strong>${escapeHtml(pass.flightNumber||booking.flightNumber||'')}</strong></div><div><small>BOOKING</small><strong>${escapeHtml(booking.bookingRef||'')}</strong></div></div><div class="boarding-pass-body"><div><div class="boarding-route">${escapeHtml(pass.origin||'')} → ${escapeHtml(pass.destination||'')}</div><div class="boarding-fields"><div><span>Passenger</span><b>${escapeHtml(pass.passengerName||`Passenger ${index+1}`)}</b></div><div><span>Date</span><b>${escapeHtml(pass.date||'—')}</b></div><div><span>Departure</span><b>${escapeHtml(pass.departure||'—')}</b></div><div><span>Seat</span><b>${escapeHtml(pass.seat||'TBD')}</b></div><div><span>Gate</span><b>${escapeHtml(pass.gate||'TBD')}</b></div><div><span>Boarding</span><b>${escapeHtml(pass.boardingTime||'TBD')}</b></div><div><span>Terminal</span><b>${escapeHtml(pass.terminal||'TBD')}</b></div><div><span>Sequence</span><b>${String(index+1).padStart(3,'0')}</b></div><div><span>Status</span><b>CHECKED-IN</b></div></div></div>${qrMarkup(`${booking.bookingRef}|${pass.passengerName}|${pass.flightNumber}|${pass.seat}`)}</div></article>`;
}
async function load(user){
  if(!bookingRef){message.textContent='예약번호가 지정되지 않았습니다.';message.className='service-message error';return;}
  try{
    const snap=await getDocs(query(collection(db,'bookings'),where('userId','==',user.uid),where('bookingRef','==',bookingRef)));
    const docSnap=snap.docs[0];
    if(!docSnap){message.textContent='예약을 찾을 수 없습니다.';message.className='service-message error';return;}
    const booking={id:docSnap.id,...docSnap.data()};
    if(booking.checkInStatus!=='checked-in'||!Array.isArray(booking.boardingPasses)||!booking.boardingPasses.length){message.innerHTML='아직 온라인 체크인이 완료되지 않았습니다. <a href="../check-in/">체크인하기</a>';message.className='service-message';return;}
    list.innerHTML=booking.boardingPasses.map((pass,index)=>passMarkup(pass,booking,index)).join('');list.hidden=false;message.hidden=true;
  }catch(error){message.textContent='탑승권을 불러오지 못했습니다. Firestore 권한을 확인해 주세요.';message.className='service-message error';}
}
onAuthStateChanged(auth,user=>{
  if(!user){message.innerHTML='탑승권을 보려면 <a href="../login/?next=../boarding-pass/">로그인</a>해 주세요.';return;}
  void load(user);
});
