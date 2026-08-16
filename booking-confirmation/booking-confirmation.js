import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { CABIN_BRANDS, bookingStatusLabel, escapeHtml, passengerLabel } from '../travel-service-core.js?v=20260817-digital-v1';

const params=new URLSearchParams(location.search),bookingRef=String(params.get('booking')||'').trim().toUpperCase();
const message=document.querySelector('[data-confirmation-message]'),host=document.querySelector('[data-confirmation]');
document.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
const money=v=>new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(Number(v||0));
function render(booking){
  const segments=Array.isArray(booking.segments)?booking.segments:[],manifest=Array.isArray(booking.passengerManifest)?booking.passengerManifest:[];
  const passengers=manifest.length?manifest.map((p,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(passengerLabel(p,i))}</td><td>${escapeHtml(p.type||'')}</td><td>${escapeHtml(p.dateOfBirth||p.dob||'')}</td></tr>`).join(''):`<tr><td>1</td><td>${escapeHtml(booking.leadPassengerName||booking.email||'Passenger')}</td><td>—</td><td>—</td></tr>`;
  const segmentRows=segments.map(s=>`<tr><td>${escapeHtml(s.flightNumber||'')}</td><td>${escapeHtml(s.origin||'')} → ${escapeHtml(s.destination||'')}</td><td>${escapeHtml(s.date||'')} ${escapeHtml(s.departure||'')}</td><td>${escapeHtml(s.arrival||'')}</td><td>${escapeHtml(s.aircraft||'')}</td><td>${escapeHtml((s.seats||[]).join(', ')||'—')}</td><td>${escapeHtml(CABIN_BRANDS[s.cabin]||s.fareName||s.cabin||'')}</td></tr>`).join('');
  host.innerHTML=`<article class="service-card"><div class="service-card-head"><div><p class="eyebrow">STELLARIS AIRLINES · E-TICKET RECEIPT</p><h2>${escapeHtml(booking.bookingRef||'')}</h2><p class="service-muted">${bookingStatusLabel(booking.status)}</p></div><span class="service-status ${booking.status==='cancelled'?'closed':'ok'}">${bookingStatusLabel(booking.status)}</span></div><div class="service-meta"><div><span>총 결제금액</span><b>${money(booking.totalFare)}</b></div><div><span>결제 상태</span><b>${escapeHtml(booking.paymentStatus||'paid-demo')}</b></div><div><span>결제 방식</span><b>${escapeHtml(booking.paymentMethod||'demo')}</b></div><div><span>Star Miles</span><b>${Number(booking.milesEarned||0).toLocaleString()}</b></div></div><h3 style="margin-top:28px">여정</h3><div style="overflow:auto"><table class="service-table"><thead><tr><th>편명</th><th>노선</th><th>출발</th><th>도착</th><th>기종</th><th>좌석</th><th>클래스</th></tr></thead><tbody>${segmentRows}</tbody></table></div><h3 style="margin-top:28px">승객</h3><div style="overflow:auto"><table class="service-table"><thead><tr><th>#</th><th>이름</th><th>유형</th><th>생년월일</th></tr></thead><tbody>${passengers}</tbody></table></div><div class="service-message" style="margin-top:24px"><b>예약 연락처</b><br>${escapeHtml([booking.contactEmail||booking.email,booking.contactPhone].filter(Boolean).join(' · ')||'—')}</div></article>`;
  host.hidden=false;message.hidden=true;
}
async function load(user){
  if(!bookingRef){message.textContent='예약번호가 지정되지 않았습니다.';message.className='service-message error';return;}
  try{const snap=await getDocs(query(collection(db,'bookings'),where('userId','==',user.uid),where('bookingRef','==',bookingRef)));const d=snap.docs[0];if(!d){message.textContent='예약을 찾을 수 없습니다.';message.className='service-message error';return;}render({id:d.id,...d.data()});}catch(error){message.textContent='예약 확인서를 불러오지 못했습니다.';message.className='service-message error';}
}
onAuthStateChanged(auth,user=>{if(!user){message.innerHTML='예약 확인서를 보려면 <a href="../login/?next=../booking-confirmation/">로그인</a>해 주세요.';return;}void load(user);});
