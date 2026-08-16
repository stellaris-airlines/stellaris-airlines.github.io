import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { bookingStatusLabel, checkInWindow, escapeHtml } from '../travel-service-core.js?v=20260817-digital-v1';

const ADMIN_EMAILS=new Set(['stellarisairlines@gmail.com','stellaris.web.dev@gmail.com']);
const message=document.querySelector('[data-my-message]'),content=document.querySelector('[data-my-content]'),trips=document.querySelector('[data-trip-list]'),ledgerHost=document.querySelector('[data-mile-ledger]'),profileForm=document.querySelector('[data-profile-form]');
let currentUser=null,currentBookings=[];
function asDate(value){if(value?.toDate)return value.toDate();const d=new Date(value||0);return Number.isNaN(d.getTime())?new Date(0):d;}
function parseSavedProfile(raw){
  const text=String(raw||'').trim();
  if(!text)return {primaryPassenger:{},notes:''};
  try{
    const data=JSON.parse(text);
    if(data&&data.version===2&&data.primaryPassenger&&typeof data.primaryPassenger==='object'){
      return {primaryPassenger:data.primaryPassenger,notes:String(data.notes||'')};
    }
  }catch(error){}
  return {primaryPassenger:{},notes:text};
}
function packedProfile(primaryPassenger,notes){
  return JSON.stringify({version:2,primaryPassenger,notes:String(notes||'').trim()});
}
async function bookingsFor(uid){const snap=await getDocs(query(collection(db,'bookings'),where('userId','==',uid)));return snap.docs.map(d=>({id:d.id,...d.data()}));}
async function syncLedger(user,bookings){
  for(const booking of bookings){
    const first=booking.segments?.[0],windowState=checkInWindow(booking),completed=Number.isFinite(windowState.departure)&&Date.now()>windowState.departure;
    const status=booking.status==='cancelled'?'cancelled':completed?'confirmed':'pending';
    const amount=status==='cancelled'?0:Number(booking.milesEarned||0);
    try{await setDoc(doc(db,'mileageLedger',user.uid,'entries',booking.bookingRef||booking.id),{userId:user.uid,sourceBookingId:booking.id,bookingRef:booking.bookingRef||'',flightNumber:first?.flightNumber||booking.flightNumber||'',route:[booking.origin,booking.destination].filter(Boolean).join(' → '),amount,status,updatedAt:serverTimestamp()},{merge:true});}catch(error){}
  }
}
async function ledgerFor(uid){const snap=await getDocs(collection(db,'mileageLedger',uid,'entries'));return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>asDate(b.updatedAt)-asDate(a.updatedAt));}
function renderTrips(bookings){
  const sorted=[...bookings].sort((a,b)=>(checkInWindow(a).departure||0)-(checkInWindow(b).departure||0));
  trips.innerHTML=sorted.length?sorted.map(b=>{const s=b.segments?.[0]||{},check=checkInWindow(b),checkLink=b.status==='ticketed'&&check.state==='open'?`<a class="btn btn-olive" href="../check-in/">체크인</a>`:'',passLink=b.checkInStatus==='checked-in'?`<a class="btn btn-dark" href="../boarding-pass/?booking=${encodeURIComponent(b.bookingRef||'')}">탑승권</a>`:'';return `<article class="trip-row"><div class="trip-row-top"><div><div class="trip-route">${escapeHtml(s.origin||b.origin||'')} → ${escapeHtml(s.destination||b.destination||'')}</div><small>${escapeHtml(s.flightNumber||b.flightNumber||'')} · ${escapeHtml(s.date||'')} ${escapeHtml(s.departure||'')}</small></div><span class="service-status ${b.status==='cancelled'?'closed':'ok'}">${bookingStatusLabel(b.status)}</span></div><div class="service-actions"><a class="btn btn-dark" href="../find-your-reservations/">예약 관리</a><a class="btn btn-dark" href="../booking-confirmation/?booking=${encodeURIComponent(b.bookingRef||'')}">예약 확인서</a>${checkLink}${passLink}</div></article>`;}).join(''):'<p class="service-muted">예약 내역이 없습니다.</p>';
}
function renderLedger(entries){
  const labels={pending:'적립 예정',confirmed:'적립 확정',cancelled:'적립 취소',used:'사용'};
  ledgerHost.innerHTML=entries.length
    ?entries.map(entry=>{
      const label=labels[entry.status]||entry.status||'';
      const sign=entry.status==='used'?'-':entry.status==='cancelled'?'':'+';
      return `<tr><td>${asDate(entry.updatedAt).toLocaleDateString('ko-KR')}</td><td>${escapeHtml(label)}</td><td>${escapeHtml(entry.bookingRef||'')}</td><td>${sign}${Number(entry.amount||0).toLocaleString()}</td></tr>`;
    }).join('')
    :'<tr><td colspan="4">마일리지 원장이 없습니다.</td></tr>';
}
async function loadProfile(user){
  profileForm.elements.email.value=user.email||'';
  profileForm.elements.surname.value='';
  profileForm.elements.givenName.value='';
  profileForm.elements.birthDate.value='';
  profileForm.elements.gender.value='';
  profileForm.elements.phone.value='';
  profileForm.elements.savedPassengers.value='';
  try{
    const snap=await getDoc(doc(db,'travelProfiles',user.uid));
    const data=snap.exists()?snap.data():{};
    const saved=parseSavedProfile(data.savedPassengers);
    const primary=saved.primaryPassenger||{};
    profileForm.elements.surname.value=primary.surname||'';
    profileForm.elements.givenName.value=primary.givenName||'';
    profileForm.elements.birthDate.value=primary.birthDate||'';
    profileForm.elements.gender.value=['male','female'].includes(primary.gender)?primary.gender:'';
    profileForm.elements.phone.value=data.phone||primary.phone||'';
    profileForm.elements.savedPassengers.value=saved.notes||'';
  }catch(error){}
}
async function render(user){
  try{
    currentBookings=await bookingsFor(user.uid);await syncLedger(user,currentBookings);const ledger=await ledgerFor(user.uid);
    const availableMiles=ledger.filter(e=>e.status==='confirmed').reduce((s,e)=>s+Number(e.amount||0),0)-ledger.filter(e=>e.status==='used').reduce((s,e)=>s+Number(e.amount||0),0);
    const active=currentBookings.filter(b=>b.status==='ticketed').length,flown=ledger.filter(e=>e.status==='confirmed').length;
    document.querySelector('[data-stat-bookings]').textContent=String(active);document.querySelector('[data-stat-miles]').textContent=availableMiles.toLocaleString();document.querySelector('[data-stat-flown]').textContent=String(flown);
    document.querySelector('[data-profile-name]').textContent=user.displayName||'Stellaris Member';document.querySelector('[data-profile-email]').textContent=user.email||'';
    if(ADMIN_EMAILS.has(String(user.email||'').toLowerCase()))document.querySelector('[data-admin-link]').hidden=false;
    await loadProfile(user);renderTrips(currentBookings);renderLedger(ledger);message.hidden=true;content.hidden=false;
  }catch(error){message.textContent='My Page를 불러오지 못했습니다. Firestore Rules를 확인해 주세요.';message.className='service-message error';}
}
profileForm?.addEventListener('submit',async e=>{
  e.preventDefault();if(!currentUser)return;
  const phone=profileForm.elements.phone.value.trim();
  if(phone.replace(/\D/g,'').length<7){message.hidden=false;message.textContent='연락 가능한 전화번호를 입력해 주세요.';message.className='service-message error';return;}
  const primaryPassenger={
    surname:profileForm.elements.surname.value.trim(),
    givenName:profileForm.elements.givenName.value.trim(),
    birthDate:profileForm.elements.birthDate.value,
    gender:profileForm.elements.gender.value||'',
    email:currentUser.email||'',
    phone
  };
  try{
    await setDoc(doc(db,'travelProfiles',currentUser.uid),{
      userId:currentUser.uid,
      email:currentUser.email||'',
      phone,
      savedPassengers:packedProfile(primaryPassenger,profileForm.elements.savedPassengers.value),
      updatedAt:serverTimestamp()
    },{merge:true});
    message.hidden=false;message.textContent='기본 탑승객 정보를 저장했습니다. 다음 예약부터 자동 입력됩니다.';message.className='service-message success';setTimeout(()=>{message.hidden=true;},3000);
  }catch(error){message.hidden=false;message.textContent='저장하지 못했습니다.';message.className='service-message error';}
});
onAuthStateChanged(auth,user=>{currentUser=user;if(!user){message.innerHTML='My Page를 이용하려면 <a href="../login/?next=../my-page/">로그인</a>해 주세요.';return;}void render(user);});
