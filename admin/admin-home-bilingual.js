import { auth, db } from '../firebase-config.js';
import { doc, getDoc, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const ADMIN_EMAILS=new Set(['stellarisairlines@gmail.com','stellaris.web.dev@gmail.com']);
const SEP='[[EN]]';
const bannerForm=document.querySelector('[data-banner-form]');
const homeForm=document.querySelector('[data-home-form]');
const statusBox=document.querySelector('[data-admin-status]');
const HOME_LIMITS={popupTitle:80,popupBody:300};

function status(message,type=''){if(!statusBox)return;statusBox.textContent=message;statusBox.className='admin-status'+(type?' '+type:'');}
function admin(user=auth.currentUser){return Boolean(user&&ADMIN_EMAILS.has(String(user.email||'').toLowerCase()));}
function pack(ko,en){const a=String(ko||'').trim(),b=String(en||'').trim();return b?`${a}${SEP}${b}`:a;}
function unpack(value){const raw=String(value||''),at=raw.indexOf(SEP);return at<0?{ko:raw,en:''}:{ko:raw.slice(0,at),en:raw.slice(at+SEP.length)};}
function within(value,limit,label){if(String(value||'').length<=limit)return true;alert(`${label} 한국어/영어 합산 길이가 저장 한도를 초과합니다.`);return false;}
function addEnglishField(form,afterName,newName,label,textarea=false,rows=3){if(!form||form.elements[newName])return;const base=form.elements[afterName]?.closest('label');if(!base)return;const field=document.createElement('label');field.className='admin-bilingual-field';field.textContent=label;const input=document.createElement(textarea?'textarea':'input');input.name=newName;if(textarea)input.rows=rows;field.append(input);base.insertAdjacentElement('afterend',field);}
function removeFixedHomeFields(){
  if(!homeForm)return;
  ['heroTitle','heroBody','promotionTitle','promotionBody','routeTitle','routeBody'].forEach(name=>homeForm.elements[name]?.closest('label')?.remove());
  homeForm.querySelectorAll('.admin-grid').forEach(grid=>{if(!grid.querySelector('label'))grid.remove();});
  if(!homeForm.querySelector('[data-home-fixed-note]')){
    const note=document.createElement('p');note.dataset.homeFixedNote='true';note.className='admin-status';note.textContent='홈 Hero와 중간 안내 영역은 기본 디자인으로 고정되어 관리자 페이지에서 수정하지 않습니다.';homeForm.prepend(note);
  }
}
function install(){
  removeFixedHomeFields();
  addEnglishField(bannerForm,'text','textEn','Banner text — English');
  addEnglishField(bannerForm,'linkLabel','linkLabelEn','Banner link label — English');
  addEnglishField(homeForm,'popupTitle','popupTitleEn','Popup title — English');
  addEnglishField(homeForm,'popupBody','popupBodyEn','Popup body — English',true);
}
async function load(){
  if(!admin())return;
  try{const snap=await getDoc(doc(db,'siteContent','homeBanner'));if(snap.exists()){const d=snap.data(),text=unpack(d.text),label=unpack(d.linkLabel);bannerForm.elements.text.value=text.ko;bannerForm.elements.textEn.value=text.en;bannerForm.elements.linkLabel.value=label.ko;bannerForm.elements.linkLabelEn.value=label.en;}}catch(error){}
  try{const snap=await getDoc(doc(db,'siteContent','homeExperience'));if(snap.exists()){const d=snap.data();Object.keys(HOME_LIMITS).forEach(name=>{const value=unpack(d[name]);if(homeForm.elements[name])homeForm.elements[name].value=value.ko;if(homeForm.elements[`${name}En`])homeForm.elements[`${name}En`].value=value.en;});}}catch(error){}
}

install();
bannerForm?.addEventListener('submit',async event=>{
  event.preventDefault();event.stopImmediatePropagation();if(!admin()){alert('관리자 로그인을 확인해 주세요.');return;}
  const text=pack(bannerForm.elements.text.value,bannerForm.elements.textEn.value),label=pack(bannerForm.elements.linkLabel.value,bannerForm.elements.linkLabelEn.value);
  if(!within(text,180,'배너 문구')||!within(label,40,'배너 링크 문구'))return;
  try{await setDoc(doc(db,'siteContent','homeBanner'),{active:bannerForm.elements.active.checked,text,linkLabel:label,linkUrl:bannerForm.elements.linkUrl.value.trim(),updatedAt:serverTimestamp()},{merge:true});status('한국어/영어 홈 배너를 저장했습니다.','success');}catch(error){status(`배너 저장 실패: ${String(error?.message||error)}`,'error');}
},true);
homeForm?.addEventListener('submit',async event=>{
  event.preventDefault();event.stopImmediatePropagation();if(!admin()){alert('관리자 로그인을 확인해 주세요.');return;}
  const payload={popupActive:homeForm.elements.popupActive.checked,updatedAt:serverTimestamp()};
  for(const [name,limit] of Object.entries(HOME_LIMITS)){const value=pack(homeForm.elements[name]?.value,homeForm.elements[`${name}En`]?.value);if(!within(value,limit,name))return;payload[name]=value;}
  try{await setDoc(doc(db,'siteContent','homeExperience'),payload,{merge:true});status('한국어/영어 홈 팝업 콘텐츠를 저장했습니다.','success');}catch(error){status(`홈 콘텐츠 저장 실패: ${String(error?.message||error)}`,'error');}
},true);
onAuthStateChanged(auth,user=>{if(admin(user))setTimeout(()=>void load(),350);});
