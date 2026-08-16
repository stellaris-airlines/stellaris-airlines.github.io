import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const section=document.querySelector('[data-passenger-information]');
const host=document.querySelector('[data-passenger-manifest]');
const errorBox=document.querySelector('[data-passenger-info-error]');
const confirmPanel=document.querySelector('[data-booking-confirm]');
const ticketModal=document.querySelector('[data-ticket-modal]');
const passengerCountInput=document.getElementById('passengerCount');
const departureInput=document.getElementById('departureDate');
const counts=()=>({
  adults:Number(document.querySelector('[data-passenger-count="adults"]')?.textContent||1),
  children:Number(document.querySelector('[data-passenger-count="children"]')?.textContent||0),
  infants:Number(document.querySelector('[data-passenger-count="infants"]')?.textContent||0)
});

const I18N={
  ko:{title:'승객 정보',intro:'예약에 포함되는 모든 승객의 정보를 입력하세요. 저장된 기본 탑승객 정보가 있으면 첫 번째 성인에 자동 입력되며, 실제 탑승객 정보와 다르면 이 예약에서 직접 수정할 수 있습니다.',adult:'성인',child:'소아·아동',infant:'유아',surname:'성',given:'이름',dob:'생년월일',gender:'성별',male:'남성',female:'여성',unspecified:'선택 안 함',email:'대표 연락처 이메일',phone:'대표 연락처 전화번호',required:'모든 필수 승객 정보를 입력해 주세요.',invalidEmail:'올바른 이메일 주소를 입력해 주세요.',invalidPhone:'연락 가능한 전화번호를 입력해 주세요.',adultAgeInvalid:'성인은 출발일 기준 만 12세 이상이어야 합니다.',childAgeInvalid:'소아·아동은 출발일 기준 만 2세 이상 만 12세 미만이어야 합니다.',infantAgeInvalid:'유아는 출발일 기준 생후 7일 이상 만 2세 미만이어야 합니다.',birthFuture:'생년월일은 출발일보다 이전이어야 합니다.',note:'첫 번째 성인 승객의 정보는 회원 기본정보가 있으면 자동 입력됩니다. 예약별로 자유롭게 수정할 수 있습니다.'},
  'en-US':{title:'Passenger information',intro:'Enter the details for every passenger. Saved traveler details are filled into the first adult automatically and can be changed for this booking.',adult:'Adult',child:'Child',infant:'Infant',surname:'Family name',given:'Given name',dob:'Date of birth',gender:'Gender',male:'Male',female:'Female',unspecified:'Prefer not to say',email:'Lead contact email',phone:'Lead contact phone',required:'Complete all required passenger information.',invalidEmail:'Enter a valid email address.',invalidPhone:'Enter a reachable phone number.',adultAgeInvalid:'Adults must be age 12 or older on the departure date.',childAgeInvalid:'Children must be at least 2 and under 12 on the departure date.',infantAgeInvalid:'Infants must be at least 7 days old and under age 2 on the departure date.',birthFuture:'Date of birth must be before the departure date.',note:'Saved account details are used for the first adult when available. You can edit them for each booking.'},
  'en-GB':null,
  'zh-CN':{title:'乘客信息',intro:'请填写本次预订中所有乘客的信息。已保存的常用乘客资料会自动填入第一位成人，并可在本次预订中修改。',adult:'成人',child:'儿童',infant:'婴儿',surname:'姓',given:'名',dob:'出生日期',gender:'性别',male:'男',female:'女',unspecified:'不选择',email:'主要联系邮箱',phone:'主要联系电话',required:'请填写所有必填乘客信息。',invalidEmail:'请输入有效的电子邮箱。',invalidPhone:'请输入可联系的电话号码。',adultAgeInvalid:'成人在出发日必须年满12周岁。',childAgeInvalid:'儿童在出发日必须年满2周岁且未满12周岁。',infantAgeInvalid:'婴儿在出发日必须出生满7天且未满2周岁。',birthFuture:'出生日期必须早于出发日期。',note:'如已保存账户常用乘客资料，将自动用于第一位成人，并可按本次预订修改。'},
  ja:{title:'搭乗者情報',intro:'予約に含まれるすべての搭乗者情報を入力してください。保存済みの基本搭乗者情報は最初の大人に自動入力され、この予約では自由に修正できます。',adult:'大人',child:'小児',infant:'幼児',surname:'姓',given:'名',dob:'生年月日',gender:'性別',male:'男性',female:'女性',unspecified:'回答しない',email:'代表連絡先メール',phone:'代表連絡先電話番号',required:'必須の搭乗者情報をすべて入力してください。',invalidEmail:'有効なメールアドレスを入力してください。',invalidPhone:'連絡可能な電話番号を入力してください。',adultAgeInvalid:'大人は出発日時点で12歳以上である必要があります。',childAgeInvalid:'小児は出発日時点で2歳以上12歳未満である必要があります。',infantAgeInvalid:'幼児は出発日時点で生後7日以上2歳未満である必要があります。',birthFuture:'生年月日は出発日より前である必要があります。',note:'保存済みの基本情報がある場合は最初の大人に自動入力され、予約ごとに修正できます。'},
  es:{title:'Información de pasajeros',intro:'Introduce los datos de todos los pasajeros. Los datos guardados se completan automáticamente para el primer adulto y pueden modificarse en esta reserva.',adult:'Adulto',child:'Niño',infant:'Bebé',surname:'Apellidos',given:'Nombre',dob:'Fecha de nacimiento',gender:'Sexo',male:'Hombre',female:'Mujer',unspecified:'Prefiero no indicarlo',email:'Correo de contacto',phone:'Teléfono de contacto',required:'Completa todos los datos obligatorios de los pasajeros.',invalidEmail:'Introduce un correo electrónico válido.',invalidPhone:'Introduce un número de teléfono válido.',adultAgeInvalid:'Los adultos deben tener 12 años o más en la fecha de salida.',childAgeInvalid:'Los niños deben tener al menos 2 años y menos de 12 en la fecha de salida.',infantAgeInvalid:'Los bebés deben tener al menos 7 días y menos de 2 años en la fecha de salida.',birthFuture:'La fecha de nacimiento debe ser anterior a la fecha de salida.',note:'Los datos guardados de la cuenta se usan para el primer adulto y pueden editarse para cada reserva.'},
  fr:{title:'Informations passagers',intro:'Saisissez les informations de tous les passagers. Les informations enregistrées sont préremplies pour le premier adulte et restent modifiables pour cette réservation.',adult:'Adulte',child:'Enfant',infant:'Bébé',surname:'Nom',given:'Prénom',dob:'Date de naissance',gender:'Sexe',male:'Homme',female:'Femme',unspecified:'Ne pas préciser',email:'E-mail de contact',phone:'Téléphone de contact',required:'Renseignez toutes les informations passager obligatoires.',invalidEmail:'Saisissez une adresse e-mail valide.',invalidPhone:'Saisissez un numéro de téléphone joignable.',adultAgeInvalid:'Les adultes doivent avoir au moins 12 ans à la date de départ.',childAgeInvalid:'Les enfants doivent avoir au moins 2 ans et moins de 12 ans à la date de départ.',infantAgeInvalid:'Les bébés doivent avoir au moins 7 jours et moins de 2 ans à la date de départ.',birthFuture:'La date de naissance doit être antérieure à la date de départ.',note:'Les informations enregistrées du compte sont utilisées pour le premier adulte et peuvent être modifiées pour chaque réservation.'}
};
I18N['en-GB']=I18N['en-US'];
const lang=()=>{const code=localStorage.getItem('stellaris-language')||'ko';return I18N[code]?code:'ko'};
const t=key=>I18N[lang()][key];

let signature='';
let lastManifest=[];
let lastAttachedReference='';
let accountDefaults=null;
let profileUserEdited=false;

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
function completePrimary(primary){
  return Boolean(primary?.surname&&primary?.givenName&&primary?.birthDate);
}
async function loadAccountDefaults(user){
  if(!user){accountDefaults=null;return;}
  try{
    const snap=await getDoc(doc(db,'travelProfiles',user.uid));
    const data=snap.exists()?snap.data():{};
    const saved=parseSavedProfile(data.savedPassengers);
    const primary=saved.primaryPassenger||{};
    accountDefaults={
      surname:primary.surname||'',
      givenName:primary.givenName||'',
      birthDate:primary.birthDate||'',
      gender:primary.gender||'',
      email:primary.email||user.email||'',
      phone:data.phone||primary.phone||''
    };
  }catch(error){
    accountDefaults={surname:'',givenName:'',birthDate:'',gender:'',email:user.email||'',phone:''};
  }
  signature='';
  profileUserEdited=false;
  if(section&&!section.hidden)render();
}
async function savePrimaryProfileIfEmpty(user,data){
  const lead=data.find(item=>item.type==='adult')||data[0];
  if(!user||!lead)return;
  try{
    const ref=doc(db,'travelProfiles',user.uid);
    const snap=await getDoc(ref);
    const existing=snap.exists()?snap.data():{};
    const saved=parseSavedProfile(existing.savedPassengers);
    if(completePrimary(saved.primaryPassenger))return;
    const primaryPassenger={
      surname:lead.surname||'',
      givenName:lead.givenName||'',
      birthDate:lead.birthDate||'',
      gender:lead.gender||'',
      email:lead.email||user.email||'',
      phone:lead.phone||existing.phone||''
    };
    if(!completePrimary(primaryPassenger))return;
    await setDoc(ref,{
      userId:user.uid,
      email:user.email||'',
      phone:primaryPassenger.phone,
      savedPassengers:packedProfile(primaryPassenger,saved.notes),
      updatedAt:serverTimestamp()
    },{merge:true});
    accountDefaults=primaryPassenger;
  }catch(error){/* booking can continue even when the profile cannot be initialized */}
}
function passengerPlan(){
  const c=counts(),list=[];
  for(let i=0;i<c.adults;i++)list.push({type:'adult',index:i+1});
  for(let i=0;i<c.children;i++)list.push({type:'child',index:i+1});
  for(let i=0;i<c.infants;i++)list.push({type:'infant',index:i+1});
  return list;
}
function currentValues(){
  return [...host.querySelectorAll('.passenger-info-card')].map(card=>({
    key:card.dataset.passengerKey,
    surname:card.querySelector('[name="surname"]')?.value||'',
    givenName:card.querySelector('[name="givenName"]')?.value||'',
    birthDate:card.querySelector('[name="birthDate"]')?.value||'',
    gender:card.querySelector('[name="gender"]')?.value||'',
    email:card.querySelector('[name="email"]')?.value||'',
    phone:card.querySelector('[name="phone"]')?.value||''
  }));
}
function initialValues(passenger,existing){
  const values=existing?{...existing}:{};
  if(passenger.type==='adult'&&passenger.index===1&&!profileUserEdited&&accountDefaults){
    ['surname','givenName','birthDate','gender','email','phone'].forEach(key=>{
      if(!values[key]&&accountDefaults[key])values[key]=accountDefaults[key];
    });
  }
  return values;
}
function render(){
  if(!host)return;
  const saved=new Map(currentValues().map(x=>[x.key,x]));
  const plan=passengerPlan();
  const newSignature=JSON.stringify(plan);
  if(newSignature===signature&&host.children.length)return;
  signature=newSignature;
  const departureMax=departureInput?.value||'';
  host.innerHTML=plan.map((p,idx)=>{
    const key=p.type+'-'+p.index,old=initialValues(p,saved.get(key));
    const label=t(p.type);
    const contact=p.type==='adult'&&p.index===1;
    return `<article class="passenger-info-card" data-passenger-key="${key}" data-passenger-type="${p.type}">
      <div class="passenger-info-card-head"><strong>${label} ${p.index}</strong><span>PASSENGER ${idx+1}</span></div>
      <div class="passenger-info-grid">
        <label>${t('surname')}<input name="surname" autocomplete="family-name" maxlength="50" required value="${escapeHtml(old.surname||'')}"></label>
        <label>${t('given')}<input name="givenName" autocomplete="given-name" maxlength="50" required value="${escapeHtml(old.givenName||'')}"></label>
        <label>${t('dob')}<input name="birthDate" type="date"${departureMax?` max="${escapeHtml(departureMax)}"`:''} required value="${escapeHtml(old.birthDate||'')}"></label>
        <label>${t('gender')}<select name="gender"><option value="">${t('unspecified')}</option><option value="male"${old.gender==='male'?' selected':''}>${t('male')}</option><option value="female"${old.gender==='female'?' selected':''}>${t('female')}</option></select></label>
        ${contact?`<label class="contact-wide">${t('email')}<input name="email" type="email" autocomplete="email" required value="${escapeHtml(old.email||auth.currentUser?.email||'')}"></label><label class="contact-wide">${t('phone')}<input name="phone" type="tel" autocomplete="tel" required value="${escapeHtml(old.phone||'')}"></label>`:''}
      </div>
    </article>`;
  }).join('');
  const heading=section.querySelector('[data-passenger-info-title]');if(heading)heading.textContent=t('title');
  const intro=section.querySelector('[data-passenger-info-intro]');if(intro)intro.textContent=t('intro');
  const note=section.querySelector('[data-passenger-info-note]');if(note)note.textContent=t('note');
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function parseISODate(value){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
  if(!match)return null;
  return new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
}
function ageOnDate(birth,travel){
  let age=travel.getUTCFullYear()-birth.getUTCFullYear();
  const beforeBirthday=travel.getUTCMonth()<birth.getUTCMonth()||(travel.getUTCMonth()===birth.getUTCMonth()&&travel.getUTCDate()<birth.getUTCDate());
  if(beforeBirthday)age-=1;
  return age;
}
function daysOldOnDate(birth,travel){return Math.floor((travel.getTime()-birth.getTime())/86400000);}
function manifest(){
  return [...host.querySelectorAll('.passenger-info-card')].map((card,index)=>({
    sequence:index+1,type:card.dataset.passengerType,
    surname:card.querySelector('[name="surname"]').value.trim(),
    givenName:card.querySelector('[name="givenName"]').value.trim(),
    birthDate:card.querySelector('[name="birthDate"]').value,
    gender:card.querySelector('[name="gender"]').value||'',
    email:card.querySelector('[name="email"]')?.value.trim()||'',
    phone:card.querySelector('[name="phone"]')?.value.trim()||''
  }));
}
function passengerFullName(passenger){
  return [passenger?.givenName,passenger?.surname].filter(Boolean).join(' ').trim();
}
function showError(text,input){
  errorBox.textContent=text;errorBox.hidden=false;
  if(input){input.focus();input.scrollIntoView({behavior:'smooth',block:'center'});}else section.scrollIntoView({behavior:'smooth',block:'center'});
}
function validatePassengerAges(){
  const travel=parseISODate(departureInput?.value);
  if(!travel)return true;
  for(const card of host.querySelectorAll('.passenger-info-card')){
    const input=card.querySelector('[name="birthDate"]');
    const birth=parseISODate(input?.value);
    if(!birth)continue;
    if(birth.getTime()>=travel.getTime()){showError(t('birthFuture'),input);return false;}
    const age=ageOnDate(birth,travel),daysOld=daysOldOnDate(birth,travel),type=card.dataset.passengerType;
    if(type==='adult'&&age<12){showError(t('adultAgeInvalid'),input);return false;}
    if(type==='child'&&(age<2||age>=12)){showError(t('childAgeInvalid'),input);return false;}
    if(type==='infant'&&(daysOld<7||age>=2)){showError(t('infantAgeInvalid'),input);return false;}
  }
  return true;
}
function validate(){
  errorBox.hidden=true;errorBox.textContent='';
  for(const card of host.querySelectorAll('.passenger-info-card')){
    for(const input of card.querySelectorAll('input[required]')){
      if(!input.value.trim()){showError(t('required'),input);return false;}
    }
  }
  if(!validatePassengerAges())return false;
  const email=host.querySelector('input[name="email"]');
  if(email&&!/^\S+@\S+\.\S+$/.test(email.value.trim())){showError(t('invalidEmail'),email);return false;}
  const phone=host.querySelector('input[name="phone"]');
  if(phone&&phone.value.replace(/\D/g,'').length<7){showError(t('invalidPhone'),phone);return false;}
  return true;
}
async function persistDraft(data){
  lastManifest=data;
  localStorage.setItem('stellaris-passenger-manifest-v1',JSON.stringify(data));
  window.STELLARIS_PASSENGER_MANIFEST=data;
  const user=auth.currentUser;
  if(!user)return;
  try{
    await setDoc(doc(db,'bookingPassengerDrafts',user.uid),{userId:user.uid,passengers:data,updatedAt:serverTimestamp()},{merge:true});
  }catch(error){/* local copy remains available if draft rules are not enabled */}
  await savePrimaryProfileIfEmpty(user,data);
}
function updateLocalBooking(reference,data){
  try{
    const bookings=JSON.parse(localStorage.getItem('stellaris-bookings-v1')||'[]');
    const index=bookings.findIndex(item=>item.bookingRef===reference);
    if(index<0)return;
    bookings[index]={...bookings[index],...data};
    localStorage.setItem('stellaris-bookings-v1',JSON.stringify(bookings));
  }catch(error){}
}
async function attachManifestToIssuedBooking(reference){
  const user=auth.currentUser;
  const data=lastManifest.length?lastManifest:(window.STELLARIS_PASSENGER_MANIFEST||[]);
  if(!user||!reference||!data.length||lastAttachedReference===reference)return;
  const lead=data.find(item=>item.type==='adult')||data[0];
  const payload={
    passengerManifest:data,
    passengerCount:data.length,
    leadPassengerName:passengerFullName(lead),
    contactEmail:lead?.email||user.email||'',
    contactPhone:lead?.phone||'',
    passengerManifestUpdatedAt:serverTimestamp()
  };
  try{
    const snapshot=await getDocs(query(
      collection(db,'bookings'),
      where('userId','==',user.uid),
      where('bookingRef','==',reference)
    ));
    const booking=snapshot.docs[0];
    if(!booking)return;
    await updateDoc(booking.ref,payload);
    lastAttachedReference=reference;
    updateLocalBooking(reference,{
      passengerManifest:data,
      passengerCount:data.length,
      leadPassengerName:payload.leadPassengerName,
      contactEmail:payload.contactEmail,
      contactPhone:payload.contactPhone
    });
    const ticketPassenger=document.querySelector('[data-ticket-passenger]');
    if(ticketPassenger){
      const names=data.map(passengerFullName).filter(Boolean);
      ticketPassenger.textContent=names.join(' / ');
    }
  }catch(error){
    console.warn('Passenger manifest could not be attached to booking.',error);
  }
}
function syncIssuedBooking(){
  if(!ticketModal||ticketModal.hidden)return;
  const reference=document.querySelector('[data-ticket-ref]')?.textContent?.trim()||'';
  if(reference)void attachManifestToIssuedBooking(reference);
}
function syncVisibility(){
  if(!section||!confirmPanel)return;
  const visible=!confirmPanel.hidden;
  section.hidden=!visible;
  if(visible)render();
}

host?.addEventListener('input',()=>{profileUserEdited=true;});
new MutationObserver(syncVisibility).observe(confirmPanel,{attributes:true,attributeFilter:['hidden']});
new MutationObserver(()=>{if(!section.hidden)render();}).observe(document.querySelector('.passenger-type-grid')||document.body,{subtree:true,childList:true,characterData:true});
if(ticketModal)new MutationObserver(syncIssuedBooking).observe(ticketModal,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('stellaris:languagechange',()=>{signature='';render();});
departureInput?.addEventListener('change',()=>{signature='';if(!section?.hidden)render();});
onAuthStateChanged(auth,user=>{if(user)void loadAccountDefaults(user);else accountDefaults=null;});
syncVisibility();

document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-issue-ticket]');
  if(!button||button.dataset.passengerManifestReady==='true')return;
  if(section.hidden)return;
  event.preventDefault();event.stopImmediatePropagation();
  render();
  if(!validate())return;
  const data=manifest();
  await persistDraft(data);
  button.dataset.passengerManifestReady='true';
  button.click();
  queueMicrotask(()=>delete button.dataset.passengerManifestReady);
},true);
