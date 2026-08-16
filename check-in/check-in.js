import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { boardingTime, checkInWindow, escapeHtml, operationDocumentId, passengerLabel } from '../travel-service-core.js?v=20260817-digital-v2';

const message=document.querySelector('[data-checkin-message]');
const list=document.querySelector('[data-checkin-list]');
const lookupForm=document.querySelector('[data-checkin-lookup-form]');
let currentUser=null;
let currentBookings=[];

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

function localBookings(user){
  try{
    const data=JSON.parse(localStorage.getItem('stellaris-bookings-v1')||'[]');
    if(!Array.isArray(data))return [];
    return data
      .filter(item=>!item.userId||item.userId===user.uid)
      .map(item=>({...item,_localOnly:true}));
  }catch(error){
    return [];
  }
}

function mergeBookings(remote,local){
  const map=new Map();
  local.forEach(item=>{
    const key=String(item.bookingRef||item.id||'').toUpperCase();
    if(key)map.set(key,item);
  });
  remote.forEach(item=>{
    const key=String(item.bookingRef||item.id||'').toUpperCase();
    if(key)map.set(key,{...item,_localOnly:false});
  });
  return [...map.values()];
}

async function operationFor(segment){
  try{
    const snap=await getDoc(doc(db,'flightOperations',operationDocumentId(segment)));
    return snap.exists()?snap.data():{};
  }catch(error){
    return {};
  }
}

function renderBooking(booking){
  const segment=Array.isArray(booking.segments)?booking.segments[0]:null;
  const windowState=checkInWindow(booking);
  const [label,kind]=stateCopy(windowState);
  const already=booking.checkInStatus==='checked-in';
  const canCheck=booking.status==='ticketed'&&windowState.state==='open'&&!already;
  const route=segment?`${escapeHtml(segment.origin)} → ${escapeHtml(segment.destination)}`:'—';
  const reference=String(booking.bookingRef||'').toUpperCase();
  const action=already
    ?`<a class="btn btn-olive" href="../boarding-pass/?booking=${encodeURIComponent(reference)}">모바일 탑승권 보기</a>`
    :canCheck
      ?`<button class="btn btn-olive" type="button" data-checkin-ref="${escapeHtml(reference)}">온라인 체크인</button>`
      :'';
  const sourceNote=booking._localOnly?'<p class="service-muted">이 브라우저에 저장된 예약입니다. 체크인 시 서버 예약을 다시 확인합니다.</p>':'';
  return `<article class="service-card" data-booking-card="${escapeHtml(reference||booking.id||'')}"><div class="service-card-head"><div><p class="eyebrow">${escapeHtml(reference||'BOOKING')}</p><h2>${route}</h2><p class="service-muted">${escapeHtml(segment?.flightNumber||booking.flightNumber||'')} · ${escapeHtml(segment?.date||'')} ${escapeHtml(segment?.departure||'')} · ${escapeHtml(segment?.aircraft||'')}</p></div><span class="service-status ${already?'ok':kind}">${already?'체크인 완료':label}</span></div><div class="service-meta"><div><span>예약번호</span><b>${escapeHtml(reference||'—')}</b></div><div><span>좌석</span><b>${escapeHtml((segment?.seats||[]).join(', ')||'—')}</b></div><div><span>승객</span><b>${escapeHtml(booking.passengerCount??booking.passengers??manifests(booking).length)}</b></div><div><span>체크인 오픈</span><b>${fmt(windowState.openAt)}</b></div></div>${sourceNote}<div class="service-actions">${action}<a class="btn btn-dark" href="../booking-confirmation/?booking=${encodeURIComponent(reference)}">예약 확인서</a></div></article>`;
}

function sortBookings(bookings){
  return [...bookings]
    .filter(item=>item.status!=='cancelled')
    .sort((a,b)=>(checkInWindow(a).departure||Infinity)-(checkInWindow(b).departure||Infinity));
}

function showBookings(bookings){
  const sorted=sortBookings(bookings);
  currentBookings=sorted;
  if(!sorted.length){
    list.hidden=true;
    message.hidden=false;
    message.className='service-message';
    message.innerHTML='이 계정에 연결된 발권 예약을 찾지 못했습니다. 위 예약번호 입력란에서 직접 찾아보거나 <a href="../find-your-reservations/">예약 조회</a>에서 예약을 확인해 주세요.';
    return;
  }
  list.innerHTML=sorted.map(renderBooking).join('');
  list.hidden=false;
  message.hidden=true;
}

async function remoteBookings(user){
  const snap=await getDocs(query(collection(db,'bookings'),where('userId','==',user.uid)));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}

async function ownedBookingByRef(reference){
  if(!currentUser)return null;
  const ref=String(reference||'').trim().toUpperCase();
  const cached=currentBookings.find(item=>String(item.bookingRef||'').toUpperCase()===ref&&!item._localOnly&&item.id);
  if(cached)return cached;
  const remote=await remoteBookings(currentUser);
  return remote.find(item=>String(item.bookingRef||'').toUpperCase()===ref)||null;
}

async function loadBookings(user){
  message.hidden=false;
  message.textContent='예약을 확인하고 있습니다…';
  message.className='service-message';
  list.hidden=true;
  const local=localBookings(user);
  try{
    const remote=await remoteBookings(user);
    showBookings(mergeBookings(remote,local));
  }catch(error){
    if(local.length){
      showBookings(local);
      message.hidden=false;
      message.className='service-message warn';
      message.textContent='서버 예약 조회에 실패해 이 브라우저에 저장된 예약을 표시하고 있습니다.';
    }else{
      message.innerHTML='예약을 불러오지 못했습니다. 로그인 상태와 Firestore Rules를 확인하거나 <a href="../find-your-reservations/">예약 조회</a>를 이용해 주세요.';
      message.className='service-message error';
    }
  }
}

async function checkIn(reference,button){
  if(!currentUser)return;
  button.disabled=true;
  const originalText=button.textContent;
  button.textContent='체크인 처리 중…';
  try{
    const booking=await ownedBookingByRef(reference);
    if(!booking||!booking.id)throw new Error('booking-not-found');
    const ref=doc(db,'bookings',booking.id);
    const snap=await getDoc(ref);
    if(!snap.exists())throw new Error('booking-not-found');
    const serverBooking={id:snap.id,...snap.data()};
    if(serverBooking.userId!==currentUser.uid)throw new Error('not-owner');
    if(serverBooking.status!=='ticketed')throw new Error('not-ticketed');
    const windowState=checkInWindow(serverBooking);
    if(windowState.state!=='open')throw new Error('checkin-window-closed');
    const segment=serverBooking.segments?.[0]||{};
    const operation=await operationFor(segment);
    const passengers=manifests(serverBooking);
    const seats=Array.isArray(segment.seats)?segment.seats:[];
    let seatIndex=0;
    const boardingPasses=passengers.map((p,index)=>{
      const infant=String(p.type||'').toLowerCase().includes('infant');
      const seat=infant?'INF':(seats[seatIndex++]||'TBD');
      return {
        passengerName:passengerLabel(p,index),
        passengerType:p.type||'',
        seat,
        flightNumber:segment.flightNumber||'',
        origin:segment.origin||'',
        destination:segment.destination||'',
        date:segment.date||'',
        departure:segment.departure||'',
        boardingTime:operation.boardingTime||boardingTime(segment),
        gate:operation.gate||'TBD',
        terminal:operation.terminal||'TBD'
      };
    });
    await updateDoc(ref,{
      checkInStatus:'checked-in',
      checkedInAt:serverTimestamp(),
      boardingPassIssuedAt:serverTimestamp(),
      boardingPasses
    });
    location.href=`../boarding-pass/?booking=${encodeURIComponent(serverBooking.bookingRef||reference)}`;
  }catch(error){
    button.disabled=false;
    button.textContent=originalText;
    message.hidden=false;
    message.className='service-message error';
    const code=String(error?.message||'');
    if(code==='checkin-window-closed'){
      message.textContent='온라인 체크인은 출발 24시간 전부터 출발 시각 전까지 가능합니다.';
    }else if(code==='booking-not-found'){
      message.textContent='이 예약번호가 현재 로그인한 계정의 서버 예약과 연결되어 있지 않습니다. 예약 조회에서 로그인 계정과 예약을 확인해 주세요.';
    }else if(code==='not-ticketed'){
      message.textContent='발권 완료 상태의 예약만 온라인 체크인이 가능합니다.';
    }else{
      message.textContent='체크인 처리에 실패했습니다. Firestore Rules가 최신인지 확인해 주세요.';
    }
  }
}

list?.addEventListener('click',event=>{
  const button=event.target.closest('[data-checkin-ref]');
  if(button)void checkIn(button.dataset.checkinRef,button);
});

lookupForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!currentUser){
    message.hidden=false;
    message.className='service-message error';
    message.innerHTML='예약번호로 체크인하려면 먼저 <a href="../login/?next=../check-in/">로그인</a>해 주세요.';
    return;
  }
  const reference=lookupForm.elements.bookingRef.value.trim().toUpperCase();
  if(reference.length!==8){
    message.hidden=false;
    message.className='service-message error';
    message.textContent='8자리 예약번호를 확인해 주세요.';
    return;
  }
  message.hidden=false;
  message.className='service-message';
  message.textContent='예약번호를 확인하고 있습니다…';
  try{
    const booking=await ownedBookingByRef(reference);
    if(!booking){
      const local=localBookings(currentUser).find(item=>String(item.bookingRef||'').toUpperCase()===reference);
      if(local){
        showBookings([local]);
        message.hidden=false;
        message.className='service-message warn';
        message.textContent='이 브라우저에는 예약 기록이 있지만 현재 로그인한 계정의 서버 예약에서는 찾지 못했습니다.';
      }else{
        list.hidden=true;
        message.className='service-message error';
        message.textContent='현재 로그인한 계정에서 해당 예약번호를 찾을 수 없습니다.';
      }
      return;
    }
    showBookings([booking]);
  }catch(error){
    message.className='service-message error';
    message.textContent='예약번호 조회에 실패했습니다. Firestore Rules와 로그인 상태를 확인해 주세요.';
  }
});

onAuthStateChanged(auth,user=>{
  currentUser=user;
  if(!user){
    message.hidden=false;
    message.innerHTML='온라인 체크인을 이용하려면 <a href="../login/?next=../check-in/">로그인</a>해 주세요.';
    message.className='service-message';
    list.hidden=true;
    return;
  }
  void loadBookings(user);
});
