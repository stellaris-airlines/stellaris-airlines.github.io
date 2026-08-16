import { auth, db } from '../firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const $=s=>document.querySelector(s);
const guestForm=$('[data-guest-lookup-form]');
const guestResult=$('[data-guest-result]');
const memberHost=$('[data-member-bookings]');
const memberPrompt=$('[data-member-login-prompt]');

const I18N={
  ko:{lookup:'예약을 조회하고 있습니다…',notFound:'예약번호와 승객 성을 다시 확인해 주세요.',failed:'예약을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',myLoading:'내 예약을 불러오고 있습니다…',myNone:'현재 계정에 연결된 예약이 없습니다.',signIn:'로그인하면 발권된 예약을 자동으로 확인할 수 있습니다.',login:'로그인',status:'상태',ticketed:'발권 완료',fare:'총 결제 금액',miles:'Star Miles',passengers:'승객',cabin:'클래스',seat:'좌석',contact:'예약 연락처',booking:'예약번호'},
  'en-US':{lookup:'Looking up your reservation…',notFound:'Check the booking reference and passenger last name.',failed:'We could not load the reservation. Try again shortly.',myLoading:'Loading your bookings…',myNone:'No bookings are linked to this account.',signIn:'Sign in to view your ticketed bookings automatically.',login:'Sign in',status:'Status',ticketed:'Ticketed',fare:'Total fare',miles:'Star Miles',passengers:'Passengers',cabin:'Cabin',seat:'Seat',contact:'Booking contact',booking:'Booking reference'},
  'en-GB':null,
  'zh-CN':{lookup:'正在查询预订…',notFound:'请检查预订编号和乘客姓氏。',failed:'无法加载预订，请稍后再试。',myLoading:'正在加载您的预订…',myNone:'此账户暂无关联预订。',signIn:'登录后可自动查看已出票预订。',login:'登录',status:'状态',ticketed:'已出票',fare:'总金额',miles:'Star Miles',passengers:'乘客',cabin:'舱位',seat:'座位',contact:'预订联系人',booking:'预订编号'},
  ja:{lookup:'予約を検索しています…',notFound:'予約番号と搭乗者の姓を確認してください。',failed:'予約を読み込めませんでした。しばらくしてから再度お試しください。',myLoading:'予約を読み込んでいます…',myNone:'このアカウントに紐づく予約はありません。',signIn:'ログインすると発券済み予約を自動表示できます。',login:'ログイン',status:'状態',ticketed:'発券済み',fare:'合計金額',miles:'Star Miles',passengers:'搭乗者',cabin:'クラス',seat:'座席',contact:'予約連絡先',booking:'予約番号'},
  es:{lookup:'Buscando tu reserva…',notFound:'Comprueba el localizador y el apellido del pasajero.',failed:'No se pudo cargar la reserva. Inténtalo de nuevo.',myLoading:'Cargando tus reservas…',myNone:'No hay reservas vinculadas a esta cuenta.',signIn:'Inicia sesión para ver automáticamente tus reservas emitidas.',login:'Iniciar sesión',status:'Estado',ticketed:'Emitido',fare:'Importe total',miles:'Star Miles',passengers:'Pasajeros',cabin:'Clase',seat:'Asiento',contact:'Contacto de reserva',booking:'Localizador'},
  fr:{lookup:'Recherche de votre réservation…',notFound:'Vérifiez la référence et le nom de famille du passager.',failed:'Impossible de charger la réservation. Réessayez plus tard.',myLoading:'Chargement de vos réservations…',myNone:'Aucune réservation n’est liée à ce compte.',signIn:'Connectez-vous pour afficher automatiquement vos réservations émises.',login:'Se connecter',status:'Statut',ticketed:'Émis',fare:'Montant total',miles:'Star Miles',passengers:'Passagers',cabin:'Classe',seat:'Siège',contact:'Contact de réservation',booking:'Référence'}
};
I18N['en-GB']=I18N['en-US'];
const lang=()=>{const c=localStorage.getItem('stellaris-language')||'ko';return I18N[c]?c:'ko'};
const t=k=>I18N[lang()][k];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>new Intl.NumberFormat(lang()==='ko'?'ko-KR':lang(),{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(Number(v||0));
const num=v=>new Intl.NumberFormat(lang()==='ko'?'ko-KR':lang()).format(Number(v||0));

function localBookings(){try{return JSON.parse(localStorage.getItem('stellaris-bookings-v1')||'[]');}catch(e){return [];}}
function surnameMatch(booking,lastName){
  const target=lastName.trim().toLowerCase();
  if(!target)return false;
  const manifest=Array.isArray(booking.passengerManifest)?booking.passengerManifest:[];
  if(manifest.some(p=>String(p.surname||'').trim().toLowerCase()===target))return true;
  return String(booking.leadPassengerName||booking.passengerName||'').trim().toLowerCase().startsWith(target+' ')||String(booking.leadPassengerName||'').trim().toLowerCase()===target;
}
function bookingByRefLocal(ref){return localBookings().find(b=>String(b.bookingRef||'').toUpperCase()===ref.toUpperCase())||null;}
async function bookingByRefFirestore(ref){
  const snap=await getDocs(query(collection(db,'bookings'),where('bookingRef','==',ref.toUpperCase())));
  let out=null;snap.forEach(d=>{if(!out)out={id:d.id,...d.data()};});return out;
}
function passengerName(p){return [p.surname,p.givenName].filter(Boolean).join(' ').trim();}
function renderBooking(booking){
  const segments=Array.isArray(booking.segments)?booking.segments:[];
  const manifest=Array.isArray(booking.passengerManifest)?booking.passengerManifest:[];
  const passengerRows=manifest.length?`<div class="reservation-passengers"><h4>${t('passengers')}</h4>${manifest.map((p,i)=>`<div class="reservation-passenger-row"><span>${i+1}. ${esc(passengerName(p)||p.type||'Passenger')}</span><span>${esc(p.type||'')}</span></div>`).join('')}</div>`:'';
  const contact=[booking.contactEmail||booking.email,booking.contactPhone].filter(Boolean).join(' · ');
  return `<article class="reservation-card"><div class="reservation-card-head"><div><small>${t('booking')}</small><h3>${esc(booking.bookingRef||'—')}</h3></div><span class="reservation-status">${booking.status==='ticketed'?t('ticketed'):esc(booking.status||'')}</span></div><div class="reservation-segments">${segments.map(s=>`<div class="reservation-segment"><strong>${esc(s.flightNumber||'')}</strong><div class="reservation-route">${esc(s.origin||'')} → ${esc(s.destination||'')}<small>${esc(s.date||'')} · ${esc(s.departure||'')}–${esc(s.arrival||'')} · ${esc(s.aircraft||'')}</small></div><div class="reservation-seat">${t('seat')} · <b>${esc((s.seats||[]).join(', ')||'—')}</b></div></div>`).join('')}</div><div class="reservation-meta-grid"><div><span>${t('fare')}</span><b>${money(booking.totalFare)}</b></div><div><span>${t('miles')}</span><b>${num(booking.milesEarned)}</b></div><div><span>${t('passengers')}</span><b>${esc(booking.passengerCount??booking.passengers??manifest.length??'—')}</b></div><div><span>${t('cabin')}</span><b>${esc(booking.cabin||segments[0]?.cabin||'—')}</b></div></div>${passengerRows}${contact?`<div class="reservation-message"><b>${t('contact')}</b><br>${esc(contact)}</div>`:''}</article>`;
}
function message(host,text,error=false){host.innerHTML=`<div class="reservation-message${error?' error':''}">${esc(text)}</div>`;host.hidden=false;}

guestForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const ref=guestForm.elements.bookingRef.value.trim().toUpperCase();
  const last=guestForm.elements.lastName.value.trim();
  message(guestResult,t('lookup'));
  try{
    let booking=bookingByRefLocal(ref);
    if(!booking){try{booking=await bookingByRefFirestore(ref);}catch(err){/* Firestore guest access may be restricted */}}
    if(!booking||!surnameMatch(booking,last)){message(guestResult,t('notFound'),true);return;}
    guestResult.innerHTML=renderBooking(booking);guestResult.hidden=false;
  }catch(err){message(guestResult,t('failed'),true);}
});

async function loadMember(user){
  if(!memberHost)return;
  memberHost.innerHTML=`<div class="reservation-loading">${esc(t('myLoading'))}</div>`;
  const combined=[...localBookings().filter(b=>b.userId===user.uid)];
  try{
    const snap=await getDocs(query(collection(db,'bookings'),where('userId','==',user.uid)));
    snap.forEach(d=>combined.push({id:d.id,...d.data()}));
  }catch(err){}
  const unique=new Map();combined.forEach(b=>unique.set(b.bookingRef||b.id||JSON.stringify(b),b));
  const list=[...unique.values()];
  memberHost.innerHTML=list.length?list.map(renderBooking).join(''):`<div class="reservation-message">${esc(t('myNone'))}</div>`;
}

onAuthStateChanged(auth,user=>{
  if(memberPrompt)memberPrompt.hidden=Boolean(user);
  if(memberHost){memberHost.hidden=!user;if(user)void loadMember(user);else memberHost.innerHTML='';}
});
window.addEventListener('stellaris:languagechange',()=>location.reload());
