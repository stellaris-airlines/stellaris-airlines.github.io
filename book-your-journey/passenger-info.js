import { auth, db } from '../firebase-config.js';
import { doc, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const section=document.querySelector('[data-passenger-information]');
const host=document.querySelector('[data-passenger-manifest]');
const errorBox=document.querySelector('[data-passenger-info-error]');
const confirmPanel=document.querySelector('[data-booking-confirm]');
const passengerCountInput=document.getElementById('passengerCount');
const counts=()=>({
  adults:Number(document.querySelector('[data-passenger-count="adults"]')?.textContent||1),
  children:Number(document.querySelector('[data-passenger-count="children"]')?.textContent||0),
  infants:Number(document.querySelector('[data-passenger-count="infants"]')?.textContent||0)
});

const I18N={
  ko:{title:'승객 정보',intro:'예약에 포함되는 모든 승객의 정보를 입력하세요. 영문 이름은 여권 또는 신분증과 동일하게 입력하는 것을 권장합니다.',adult:'성인',child:'소아·아동',infant:'유아',surname:'성',given:'이름',dob:'생년월일',gender:'성별',male:'남성',female:'여성',unspecified:'선택 안 함',email:'대표 연락처 이메일',phone:'대표 연락처 전화번호',required:'모든 필수 승객 정보를 입력해 주세요.',invalidEmail:'올바른 이메일 주소를 입력해 주세요.',invalidPhone:'연락 가능한 전화번호를 입력해 주세요.',note:'첫 번째 성인 승객의 이메일과 전화번호는 예약 연락처로 사용됩니다.'},
  'en-US':{title:'Passenger information',intro:'Enter the details for every passenger in this booking. Use names that match the passenger’s travel document.',adult:'Adult',child:'Child',infant:'Infant',surname:'Family name',given:'Given name',dob:'Date of birth',gender:'Gender',male:'Male',female:'Female',unspecified:'Prefer not to say',email:'Lead contact email',phone:'Lead contact phone',required:'Complete all required passenger information.',invalidEmail:'Enter a valid email address.',invalidPhone:'Enter a reachable phone number.',note:'The first adult passenger’s email and phone number will be used as the booking contact.'},
  'en-GB':null,
  'zh-CN':{title:'乘客信息',intro:'请填写本次预订中所有乘客的信息，姓名应与旅行证件一致。',adult:'成人',child:'儿童',infant:'婴儿',surname:'姓',given:'名',dob:'出生日期',gender:'性别',male:'男',female:'女',unspecified:'不选择',email:'主要联系邮箱',phone:'主要联系电话',required:'请填写所有必填乘客信息。',invalidEmail:'请输入有效的电子邮箱。',invalidPhone:'请输入可联系的电话号码。',note:'第一位成人乘客的邮箱和电话将作为预订联系方式。'},
  ja:{title:'搭乗者情報',intro:'この予約に含まれるすべての搭乗者情報を入力してください。氏名は旅行書類と同じ表記を推奨します。',adult:'大人',child:'小児',infant:'幼児',surname:'姓',given:'名',dob:'生年月日',gender:'性別',male:'男性',female:'女性',unspecified:'回答しない',email:'代表連絡先メール',phone:'代表連絡先電話番号',required:'必須の搭乗者情報をすべて入力してください。',invalidEmail:'有効なメールアドレスを入力してください。',invalidPhone:'連絡可能な電話番号を入力してください。',note:'最初の大人のメールアドレスと電話番号を予約連絡先として使用します。'},
  es:{title:'Información de pasajeros',intro:'Introduce los datos de todos los pasajeros de la reserva. Usa los nombres tal como aparecen en el documento de viaje.',adult:'Adulto',child:'Niño',infant:'Bebé',surname:'Apellidos',given:'Nombre',dob:'Fecha de nacimiento',gender:'Sexo',male:'Hombre',female:'Mujer',unspecified:'Prefiero no indicarlo',email:'Correo de contacto',phone:'Teléfono de contacto',required:'Completa todos los datos obligatorios de los pasajeros.',invalidEmail:'Introduce un correo electrónico válido.',invalidPhone:'Introduce un número de teléfono válido.',note:'El correo y teléfono del primer adulto se utilizarán como contacto de la reserva.'},
  fr:{title:'Informations passagers',intro:'Saisissez les informations de tous les passagers de cette réservation. Utilisez les noms figurant sur le document de voyage.',adult:'Adulte',child:'Enfant',infant:'Bébé',surname:'Nom',given:'Prénom',dob:'Date de naissance',gender:'Sexe',male:'Homme',female:'Femme',unspecified:'Ne pas préciser',email:'E-mail de contact',phone:'Téléphone de contact',required:'Renseignez toutes les informations passager obligatoires.',invalidEmail:'Saisissez une adresse e-mail valide.',invalidPhone:'Saisissez un numéro de téléphone joignable.',note:'L’e-mail et le téléphone du premier adulte seront utilisés comme contact de réservation.'}
};
I18N['en-GB']=I18N['en-US'];
const lang=()=>{const code=localStorage.getItem('stellaris-language')||'ko';return I18N[code]?code:'ko'};
const t=key=>I18N[lang()][key];

let signature='';
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
function render(){
  if(!host)return;
  const saved=new Map(currentValues().map(x=>[x.key,x]));
  const plan=passengerPlan();
  const newSignature=JSON.stringify(plan);
  if(newSignature===signature&&host.children.length)return;
  signature=newSignature;
  host.innerHTML=plan.map((p,idx)=>{
    const key=p.type+'-'+p.index,old=saved.get(key)||{};
    const label=t(p.type);
    const contact=p.type==='adult'&&p.index===1;
    return `<article class="passenger-info-card" data-passenger-key="${key}" data-passenger-type="${p.type}">
      <div class="passenger-info-card-head"><strong>${label} ${p.index}</strong><span>PASSENGER ${idx+1}</span></div>
      <div class="passenger-info-grid">
        <label>${t('surname')}<input name="surname" autocomplete="family-name" maxlength="50" required value="${escapeHtml(old.surname||'')}"></label>
        <label>${t('given')}<input name="givenName" autocomplete="given-name" maxlength="50" required value="${escapeHtml(old.givenName||'')}"></label>
        <label>${t('dob')}<input name="birthDate" type="date" required value="${escapeHtml(old.birthDate||'')}"></label>
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
function showError(text,input){
  errorBox.textContent=text;errorBox.hidden=false;
  if(input){input.focus();input.scrollIntoView({behavior:'smooth',block:'center'});}else section.scrollIntoView({behavior:'smooth',block:'center'});
}
function validate(){
  errorBox.hidden=true;errorBox.textContent='';
  for(const card of host.querySelectorAll('.passenger-info-card')){
    for(const input of card.querySelectorAll('input[required]')){
      if(!input.value.trim()){showError(t('required'),input);return false;}
    }
  }
  const email=host.querySelector('input[name="email"]');
  if(email&&!/^\S+@\S+\.\S+$/.test(email.value.trim())){showError(t('invalidEmail'),email);return false;}
  const phone=host.querySelector('input[name="phone"]');
  if(phone&&phone.value.replace(/\D/g,'').length<7){showError(t('invalidPhone'),phone);return false;}
  return true;
}
async function persistDraft(data){
  localStorage.setItem('stellaris-passenger-manifest-v1',JSON.stringify(data));
  window.STELLARIS_PASSENGER_MANIFEST=data;
  const user=auth.currentUser;
  if(!user)return;
  try{
    await setDoc(doc(db,'bookingPassengerDrafts',user.uid),{userId:user.uid,passengers:data,updatedAt:serverTimestamp()},{merge:true});
  }catch(error){/* local copy remains available if draft rules are not enabled */}
}
function syncVisibility(){
  if(!section||!confirmPanel)return;
  const visible=!confirmPanel.hidden;
  section.hidden=!visible;
  if(visible)render();
}

new MutationObserver(syncVisibility).observe(confirmPanel,{attributes:true,attributeFilter:['hidden']});
new MutationObserver(()=>{if(!section.hidden)render();}).observe(document.querySelector('.passenger-type-grid')||document.body,{subtree:true,childList:true,characterData:true});
window.addEventListener('stellaris:languagechange',()=>{signature='';render();});
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
