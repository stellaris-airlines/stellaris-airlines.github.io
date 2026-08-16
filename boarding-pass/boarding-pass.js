import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { escapeHtml, pseudoQrBits } from '../travel-service-core.js?v=20260817-digital-v2';

const params=new URLSearchParams(location.search);
const bookingRef=String(params.get('booking')||'').trim().toUpperCase();
const message=document.querySelector('[data-pass-message]');
const list=document.querySelector('[data-pass-list]');
const printButton=document.querySelector('[data-print]');

printButton?.addEventListener('click',()=>window.print());

function qrMarkup(seed){
  return `<div class="pseudo-qr" aria-label="탑승권 확인용 코드">${pseudoQrBits(seed).map(on=>`<i${on?' class="on"':''}></i>`).join('')}</div>`;
}

function passMarkup(pass,booking,index){
  return `<article class="boarding-pass"><div class="boarding-pass-head"><div><small>STELLARIS AIRLINES · MOBILE BOARDING PASS</small><strong>${escapeHtml(pass.flightNumber||booking.flightNumber||'')}</strong></div><div><small>BOOKING</small><strong>${escapeHtml(booking.bookingRef||'')}</strong></div></div><div class="boarding-pass-body"><div><div class="boarding-route">${escapeHtml(pass.origin||'')} → ${escapeHtml(pass.destination||'')}</div><div class="boarding-fields"><div><span>Passenger</span><b>${escapeHtml(pass.passengerName||`Passenger ${index+1}`)}</b></div><div><span>Date</span><b>${escapeHtml(pass.date||'—')}</b></div><div><span>Departure</span><b>${escapeHtml(pass.departure||'—')}</b></div><div><span>Seat</span><b>${escapeHtml(pass.seat||'TBD')}</b></div><div><span>Gate</span><b>${escapeHtml(pass.gate||'TBD')}</b></div><div><span>Boarding</span><b>${escapeHtml(pass.boardingTime||'TBD')}</b></div><div><span>Terminal</span><b>${escapeHtml(pass.terminal||'TBD')}</b></div><div><span>Sequence</span><b>${String(index+1).padStart(3,'0')}</b></div><div><span>Status</span><b>CHECKED-IN</b></div></div></div>${qrMarkup(`${booking.bookingRef}|${pass.passengerName}|${pass.flightNumber}|${pass.seat}`)}</div></article>`;
}

function departureKey(booking){
  const segment=booking.segments?.[0]||{};
  return `${segment.date||'9999-99-99'}T${segment.departure||'99:99'}`;
}

function renderChooser(bookings){
  printButton.hidden=true;
  list.innerHTML=bookings.map(booking=>{
    const segment=booking.segments?.[0]||{};
    const passengers=Array.isArray(booking.boardingPasses)?booking.boardingPasses.length:0;
    return `<article class="service-card"><div class="service-card-head"><div><p class="eyebrow">${escapeHtml(booking.bookingRef||'BOOKING')}</p><h2>${escapeHtml(segment.origin||booking.origin||'')} → ${escapeHtml(segment.destination||booking.destination||'')}</h2><p class="service-muted">${escapeHtml(segment.flightNumber||booking.flightNumber||'')} · ${escapeHtml(segment.date||'')} ${escapeHtml(segment.departure||'')} · ${passengers}명</p></div><span class="service-status ok">체크인 완료</span></div><div class="service-actions"><a class="btn btn-olive" href="?booking=${encodeURIComponent(booking.bookingRef||'')}">탑승권 보기</a><a class="btn btn-dark" href="../booking-confirmation/?booking=${encodeURIComponent(booking.bookingRef||'')}">예약 확인서</a></div></article>`;
  }).join('');
  list.hidden=false;
  message.hidden=true;
}

async function ownedBookings(user){
  const snap=await getDocs(query(collection(db,'bookings'),where('userId','==',user.uid)));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}

async function load(user){
  message.hidden=false;
  message.className='service-message';
  message.textContent='탑승권을 불러오고 있습니다…';
  list.hidden=true;
  printButton.hidden=true;

  try{
    const bookings=await ownedBookings(user);

    if(bookingRef){
      const booking=bookings.find(item=>String(item.bookingRef||'').toUpperCase()===bookingRef);
      if(!booking){
        message.innerHTML='이 계정에 연결된 예약을 찾을 수 없습니다. <a href="../check-in/">온라인 체크인에서 예약 확인</a>';
        message.className='service-message error';
        return;
      }
      if(booking.checkInStatus!=='checked-in'||!Array.isArray(booking.boardingPasses)||!booking.boardingPasses.length){
        message.innerHTML='아직 온라인 체크인이 완료되지 않았습니다. <a href="../check-in/">체크인하기</a>';
        message.className='service-message';
        return;
      }
      list.innerHTML=booking.boardingPasses.map((pass,index)=>passMarkup(pass,booking,index)).join('');
      list.hidden=false;
      message.hidden=true;
      printButton.hidden=false;
      return;
    }

    const checkedIn=bookings
      .filter(item=>item.checkInStatus==='checked-in'&&Array.isArray(item.boardingPasses)&&item.boardingPasses.length)
      .sort((a,b)=>departureKey(a).localeCompare(departureKey(b)));

    if(!checkedIn.length){
      message.innerHTML='현재 발급된 모바일 탑승권이 없습니다. 출발 24시간 전부터 <a href="../check-in/">온라인 체크인</a>을 완료하면 이곳에서 탑승권을 확인할 수 있습니다.';
      return;
    }

    if(checkedIn.length===1){
      const booking=checkedIn[0];
      list.innerHTML=booking.boardingPasses.map((pass,index)=>passMarkup(pass,booking,index)).join('');
      list.hidden=false;
      message.hidden=true;
      printButton.hidden=false;
      return;
    }

    renderChooser(checkedIn);
  }catch(error){
    message.textContent='탑승권을 불러오지 못했습니다. 로그인 상태와 Firestore 권한을 확인해 주세요.';
    message.className='service-message error';
  }
}

onAuthStateChanged(auth,user=>{
  if(!user){
    message.innerHTML='탑승권을 보려면 <a href="../login/?next=../boarding-pass/">로그인</a>해 주세요.';
    printButton.hidden=true;
    return;
  }
  void load(user);
});
