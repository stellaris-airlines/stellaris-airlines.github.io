import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { createRichEditor, sanitizeRichHTML } from './rich-editor.js?v=20260821-freeze-fix-v1';
import { uploadAdminImage } from './admin-media.js?v=20260820-media-v1';

const ADMIN_EMAILS=new Set(['stellarisairlines@gmail.com','stellaris.web.dev@gmail.com']);
const DOC_ID='home_popup_config',MARK='[[STELLARIS_HOME_POPUP_V1]]';
const statusBox=document.querySelector('[data-admin-status]');
let form=null,koEditor=null,enEditor=null,currentDoc=null;
const PAGES=[
  ['', '선택 안 함'],['book-your-journey/','항공권 예약'],['destinations/','노선 안내'],['notices/','공지사항'],['news/','뉴스'],['services/','전체 서비스'],['seats/','객실 · 좌석'],['special-liveries/','특별도장'],['livery-gallery/','도장 갤러리'],['careers/','채용'],['support/','지원 센터'],['custom','직접 입력']
];
function isAdmin(user=auth.currentUser){return Boolean(user&&ADMIN_EMAILS.has(String(user.email||'').toLowerCase()));}
function status(message,type=''){if(!statusBox)return;statusBox.textContent=message;statusBox.className='admin-status'+(type?' '+type:'');}
function pack(data){return MARK+JSON.stringify({...data,htmlKo:sanitizeRichHTML(data.htmlKo),htmlEn:sanitizeRichHTML(data.htmlEn)});}
function unpack(raw=''){const text=String(raw||'');if(!text.startsWith(MARK))return null;try{return JSON.parse(text.slice(MARK.length));}catch(error){return null;}}
function install(){
  const consoleHost=document.querySelector('[data-admin-console]');if(!consoleHost||document.querySelector('[data-popup-manager]'))return;
  const legacyHome=document.querySelector('[data-home-form]')?.closest('.admin-panel');if(legacyHome)legacyHome.hidden=true;
  const firstPanel=consoleHost.querySelector('.admin-panel:not([hidden])');const section=document.createElement('section');section.className='admin-panel';section.dataset.popupManager='true';
  section.innerHTML=`<div class="admin-panel-head"><div><p class="eyebrow">HOME POPUP</p><h2>홈 팝업 관리</h2></div><span>이미지형 또는 글형</span></div>
  <form class="admin-form" data-popup-form>
    <label class="check-row"><input type="checkbox" name="active"><span>팝업 표시</span></label>
    <div class="admin-grid"><label>팝업 형식<select name="mode"><option value="rich">글 작성형</option><option value="image">이미지형</option></select></label><label>자세히 보기 연결 페이지<select name="page">${PAGES.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label></div>
    <label data-custom-url hidden>직접 입력 URL<input type="text" name="customUrl" placeholder="https:// 또는 사이트 경로"></label>
    <div data-popup-rich>
      <div class="admin-grid"><label>한국어 제목<input type="text" name="titleKo" maxlength="120"></label><label>English title<input type="text" name="titleEn" maxlength="120"></label></div>
      <label>한국어 내용<textarea name="htmlKo" rows="6"></textarea></label>
      <label>English content<textarea name="htmlEn" rows="6"></textarea></label>
    </div>
    <div data-popup-image hidden>
      <label>팝업 이미지 URL<input type="url" name="imageUrl" placeholder="https://..."></label>
      <div class="admin-actions"><input type="file" accept="image/*" name="imageFile"><button class="btn btn-dark" type="button" data-popup-upload>이미지 업로드</button></div>
      <div class="admin-popup-preview" data-popup-image-preview></div>
    </div>
    <div class="admin-grid"><label>자세히 보기 버튼 — 한국어<input type="text" name="linkLabelKo" maxlength="40" value="자세히 보기"></label><label>Detail button — English<input type="text" name="linkLabelEn" maxlength="40" value="Learn more"></label></div>
    <button class="btn btn-olive" type="submit">팝업 저장</button>
  </form>`;
  if(firstPanel)firstPanel.insertAdjacentElement('afterend',section);else consoleHost.append(section);
  form=section.querySelector('[data-popup-form]');
  koEditor=createRichEditor(form.elements.htmlKo,{placeholder:'팝업 한국어 내용을 입력하세요.',uploadImage:file=>uploadAdminImage(file,'popup/rich-ko')});
  enEditor=createRichEditor(form.elements.htmlEn,{placeholder:'Enter the English popup content.',uploadImage:file=>uploadAdminImage(file,'popup/rich-en')});
  const syncMode=()=>{const image=form.elements.mode.value==='image';section.querySelector('[data-popup-rich]').hidden=image;section.querySelector('[data-popup-image]').hidden=!image;};
  const syncPage=()=>{section.querySelector('[data-custom-url]').hidden=form.elements.page.value!=='custom';};
  const preview=()=>{const host=section.querySelector('[data-popup-image-preview]'),url=form.elements.imageUrl.value.trim();host.replaceChildren();if(url){const img=document.createElement('img');img.src=url;img.alt='Popup preview';host.append(img);}};
  form.elements.mode.addEventListener('change',syncMode);form.elements.page.addEventListener('change',syncPage);form.elements.imageUrl.addEventListener('change',preview);form.elements.imageUrl.addEventListener('blur',preview);
  section.querySelector('[data-popup-upload]').addEventListener('click',async()=>{const file=form.elements.imageFile.files?.[0];if(!file){alert('이미지 파일을 선택해 주세요.');return;}const button=section.querySelector('[data-popup-upload]'),old=button.textContent;button.disabled=true;button.textContent='업로드 중…';try{form.elements.imageUrl.value=await uploadAdminImage(file,'popup/hero');preview();status('팝업 이미지를 업로드했습니다.','success');}catch(error){status(String(error?.message||error),'error');}finally{button.disabled=false;button.textContent=old;}});
  form.addEventListener('submit',save,true);syncMode();syncPage();
  if(isAdmin())void load();
}
async function load(){if(!form||!isAdmin())return;try{const snap=await getDoc(doc(db,'notices',DOC_ID));if(!snap.exists()){currentDoc=null;return;}currentDoc=snap.data();const data=unpack(currentDoc.body);if(!data)return;form.elements.active.checked=data.active===true;form.elements.mode.value=data.mode==='image'?'image':'rich';form.elements.titleKo.value=data.titleKo||'';form.elements.titleEn.value=data.titleEn||'';koEditor?.setHTML(data.htmlKo||'');enEditor?.setHTML(data.htmlEn||'');form.elements.imageUrl.value=data.imageUrl||'';form.elements.linkLabelKo.value=data.linkLabelKo||'자세히 보기';form.elements.linkLabelEn.value=data.linkLabelEn||'Learn more';const known=PAGES.some(([v])=>v===data.linkUrl&&v!=='custom');form.elements.page.value=known?data.linkUrl:(data.linkUrl?'custom':'');form.elements.customUrl.value=known?'':(data.linkUrl||'');syncMode();syncPage();preview();}catch(error){status(`팝업 설정을 불러오지 못했습니다: ${String(error?.message||error)}`,'error');}}
async function save(event){event.preventDefault();event.stopImmediatePropagation();if(!isAdmin()){alert('관리자 로그인을 확인해 주세요.');return;}koEditor?.sync();enEditor?.sync();const mode=form.elements.mode.value==='image'?'image':'rich',linkUrl=form.elements.page.value==='custom'?form.elements.customUrl.value.trim():form.elements.page.value;const data={active:form.elements.active.checked,mode,titleKo:form.elements.titleKo.value.trim(),titleEn:form.elements.titleEn.value.trim(),htmlKo:koEditor?.getHTML()||'',htmlEn:enEditor?.getHTML()||'',imageUrl:form.elements.imageUrl.value.trim(),linkLabelKo:form.elements.linkLabelKo.value.trim()||'자세히 보기',linkLabelEn:form.elements.linkLabelEn.value.trim()||'Learn more',linkUrl};if(mode==='image'&&!data.imageUrl){alert('이미지형 팝업은 이미지를 업로드하거나 이미지 URL을 입력해 주세요.');return;}if(mode==='rich'&&(!data.titleKo||!data.titleEn)){alert('글 작성형 팝업은 한국어/영어 제목을 모두 입력해 주세요.');return;}const body=pack(data);if(body.length>5000){alert('팝업 내용이 저장 한도(5,000자)를 초과합니다. 내용을 줄여 주세요.');return;}try{const ref=doc(db,'notices',DOC_ID);if(currentDoc){await updateDoc(ref,{body,title:'HOME_POPUP_CONFIG',category:'일반',author:'STELLARIS AIRLINES',status:'draft',pinned:false,publishStart:currentDoc.publishStart||currentDoc.publishedAt||Timestamp.now(),publishEnd:null,views:Number(currentDoc.views||0),updatedAt:serverTimestamp()});}else{await setDoc(ref,{body,title:'HOME_POPUP_CONFIG',category:'일반',author:'STELLARIS AIRLINES',status:'draft',pinned:false,publishStart:Timestamp.now(),publishEnd:null,views:0,publishedAt:serverTimestamp(),updatedAt:serverTimestamp()});currentDoc=(await getDoc(ref)).data();}status('홈 팝업을 저장했습니다.','success');}catch(error){status(`팝업 저장 실패: ${String(error?.message||error)}`,'error');}}

const wait=()=>{if(document.querySelector('[data-admin-console]'))install();else setTimeout(wait,120);};wait();
onAuthStateChanged(auth,user=>{if(isAdmin(user)){if(!form)install();setTimeout(()=>void load(),150);}});
