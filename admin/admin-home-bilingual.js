import { auth, db } from '../firebase-config.js';
import { doc, getDoc, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const ADMIN_EMAILS=new Set(['stellarisairlines@gmail.com','stellaris.web.dev@gmail.com']);
const SEP='[[EN]]';
const bannerForm=document.querySelector('[data-banner-form]');
const statusBox=document.querySelector('[data-admin-status]');

function status(message,type=''){if(!statusBox)return;statusBox.textContent=message;statusBox.className='admin-status'+(type?' '+type:'');}
function admin(user=auth.currentUser){return Boolean(user&&ADMIN_EMAILS.has(String(user.email||'').toLowerCase()));}
function pack(ko,en){const a=String(ko||'').trim(),b=String(en||'').trim();return b?`${a}${SEP}${b}`:a;}
function unpack(value){const raw=String(value||''),at=raw.indexOf(SEP);return at<0?{ko:raw,en:''}:{ko:raw.slice(0,at),en:raw.slice(at+SEP.length)};}
function within(value,limit,label){if(String(value||'').length<=limit)return true;alert(`${label} 한국어/영어 합산 길이가 저장 한도를 초과합니다.`);return false;}
function addEnglishField(form,afterName,newName,label){if(!form||form.elements[newName])return;const base=form.elements[afterName]?.closest('label');if(!base)return;const field=document.createElement('label');field.className='admin-bilingual-field';field.textContent=label;const input=document.createElement('input');input.name=newName;field.append(input);base.insertAdjacentElement('afterend',field);}
function install(){
  addEnglishField(bannerForm,'text','textEn','Banner text — English');
  addEnglishField(bannerForm,'linkLabel','linkLabelEn','Banner link label — English');
}
async function load(){
  if(!admin()||!bannerForm)return;
  try{
    const snap=await getDoc(doc(db,'siteContent','homeBanner'));
    if(!snap.exists())return;
    const d=snap.data(),text=unpack(d.text),label=unpack(d.linkLabel);
    bannerForm.elements.text.value=text.ko;
    bannerForm.elements.textEn.value=text.en;
    bannerForm.elements.linkLabel.value=label.ko;
    bannerForm.elements.linkLabelEn.value=label.en;
  }catch(error){status(`배너 설정을 불러오지 못했습니다: ${String(error?.message||error)}`,'error');}
}

install();
bannerForm?.addEventListener('submit',async event=>{
  event.preventDefault();event.stopImmediatePropagation();
  if(!admin()){alert('관리자 로그인을 확인해 주세요.');return;}
  const text=pack(bannerForm.elements.text.value,bannerForm.elements.textEn.value),label=pack(bannerForm.elements.linkLabel.value,bannerForm.elements.linkLabelEn.value);
  if(!within(text,180,'배너 문구')||!within(label,40,'배너 링크 문구'))return;
  try{
    await setDoc(doc(db,'siteContent','homeBanner'),{active:bannerForm.elements.active.checked,text,linkLabel:label,linkUrl:bannerForm.elements.linkUrl.value.trim(),updatedAt:serverTimestamp()},{merge:true});
    status('한국어/영어 홈 배너를 저장했습니다.','success');
  }catch(error){status(`배너 저장 실패: ${String(error?.message||error)}`,'error');}
},true);
onAuthStateChanged(auth,user=>{if(admin(user))setTimeout(()=>void load(),150);});
