import { auth, db } from '../firebase-config.js';
import { doc, getDoc, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const passengerSection=document.querySelector('[data-passenger-information]');
const passengerHost=document.querySelector('[data-passenger-manifest]');
const errorBox=document.querySelector('[data-passenger-info-error]');
const departureInput=document.getElementById('departureDate');

function manifest(){
  return [...document.querySelectorAll('.passenger-info-card')].map((card,index)=>({
    key:card.dataset.passengerKey||String(index+1),
    type:card.dataset.passengerType||'adult',
    surname:card.querySelector('[name="surname"]')?.value?.trim()||'',
    givenName:card.querySelector('[name="givenName"]')?.value?.trim()||'',
    birthDate:card.querySelector('[name="birthDate"]')?.value||'',
    gender:card.querySelector('[name="gender"]')?.value||'',
    email:card.querySelector('[name="email"]')?.value?.trim()||'',
    phone:card.querySelector('[name="phone"]')?.value?.trim()||''
  }));
}
function showError(message,input){
  if(errorBox){errorBox.textContent=message;errorBox.hidden=false;}
  input?.focus?.();
  input?.scrollIntoView?.({behavior:'smooth',block:'center'});
}
function parseDate(value){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
  if(!match)return null;
  const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
  return Number.isNaN(date.getTime())?null:date;
}
function ageOnDate(birth,onDate){
  let age=onDate.getFullYear()-birth.getFullYear();
  const beforeBirthday=onDate.getMonth()<birth.getMonth()||(onDate.getMonth()===birth.getMonth()&&onDate.getDate()<birth.getDate());
  if(beforeBirthday)age-=1;
  return age;
}
function validatePassengers(){
  if(!passengerSection||passengerSection.hidden)return true;
  if(errorBox){errorBox.hidden=true;errorBox.textContent='';}
  const cards=[...passengerHost?.querySelectorAll('.passenger-info-card')||[]];
  if(!cards.length)return false;
  for(const card of cards){
    for(const input of card.querySelectorAll('input[required]')){
      if(!input.value.trim()){
        showError('모든 필수 승객 정보를 입력해 주세요.',input);
        return false;
      }
      if(!input.checkValidity()){
        input.reportValidity?.();
        return false;
      }
    }
    const email=card.querySelector('input[type="email"]');
    if(email&&email.value&&!/^\S+@\S+\.\S+$/.test(email.value.trim())){
      showError('올바른 이메일 주소를 입력해 주세요.',email);return false;
    }
    const phone=card.querySelector('input[name="phone"]');
    if(phone&&phone.value.replace(/\D/g,'').length<7){
      showError('연락 가능한 전화번호를 입력해 주세요.',phone);return false;
    }
  }
  const travel=parseDate(departureInput?.value);
  if(!travel)return true;
  for(const card of cards){
    const input=card.querySelector('[name="birthDate"]');
    const birth=parseDate(input?.value);
    if(!birth)continue;
    if(birth.getTime()>=travel.getTime()){
      showError('생년월일은 출발일보다 이전이어야 합니다.',input);return false;
    }
    const age=ageOnDate(birth,travel);
    const days=Math.floor((travel-birth)/86400000);
    const type=card.dataset.passengerType;
    if(type==='adult'&&age<12){showError('성인은 출발일 기준 만 12세 이상이어야 합니다.',input);return false;}
    if(type==='child'&&(age<2||age>=12)){showError('소아·아동은 출발일 기준 만 2세 이상 만 12세 미만이어야 합니다.',input);return false;}
    if(type==='infant'&&(days<7||age>=2)){showError('유아는 출발일 기준 생후 7일 이상 만 2세 미만이어야 합니다.',input);return false;}
  }
  return true;
}
function saveLocal(data){
  try{localStorage.setItem('stellaris-passenger-manifest-v1',JSON.stringify(data));}catch(error){}
  window.STELLARIS_PASSENGER_MANIFEST=data;
}
function parseProfile(raw){
  try{
    const parsed=JSON.parse(String(raw||''));
    if(parsed?.version===2&&parsed.primaryPassenger)return parsed;
  }catch(error){}
  return {version:2,primaryPassenger:{},notes:String(raw||'')};
}
async function persistInBackground(data){
  const user=auth.currentUser;
  if(!user)return;
  try{
    await setDoc(doc(db,'bookingPassengerDrafts',user.uid),{userId:user.uid,passengers:data,updatedAt:serverTimestamp()},{merge:true});
  }catch(error){}
  try{
    const ref=doc(db,'travelProfiles',user.uid);
    const snapshot=await getDoc(ref);
    const existing=snapshot.exists()?snapshot.data():{};
    const packed=parseProfile(existing.savedPassengers);
    const primary=packed.primaryPassenger||{};
    if(primary.surname&&primary.givenName&&primary.birthDate)return;
    const lead=data.find(item=>item.type==='adult')||data[0];
    if(!lead?.surname||!lead?.givenName||!lead?.birthDate)return;
    const next={surname:lead.surname,givenName:lead.givenName,birthDate:lead.birthDate,gender:lead.gender||'',email:lead.email||user.email||'',phone:lead.phone||existing.phone||''};
    await setDoc(ref,{userId:user.uid,email:user.email||'',phone:next.phone,savedPassengers:JSON.stringify({version:2,primaryPassenger:next,notes:packed.notes||''}),updatedAt:serverTimestamp()},{merge:true});
  }catch(error){}
}

// This listener is intentionally loaded before passenger-info.js and payment-sim.js.
// It completes validation and local persistence synchronously so Firestore latency can never
// block the transition to the checkout modal. Server writes continue in the background.
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-issue-ticket]');
  if(!button)return;
  if(!validatePassengers()){
    event.preventDefault();event.stopImmediatePropagation();
    return;
  }
  const data=manifest();
  saveLocal(data);
  void persistInBackground(data);
  button.dataset.passengerManifestReady='true';
  queueMicrotask(()=>delete button.dataset.passengerManifestReady);
},true);
