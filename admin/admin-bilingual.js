import { auth, db } from '../firebase-config.js';
import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const ADMIN_EMAILS=new Set(['stellarisairlines@gmail.com','stellaris.web.dev@gmail.com']);
const MARK='[[STELLARIS_BILINGUAL_V1]]';
const form=document.querySelector('[data-notice-form]');
const list=document.querySelector('[data-admin-notice-list]');
const statusBox=document.querySelector('[data-admin-status]');

function isAdmin(){return Boolean(auth.currentUser&&ADMIN_EMAILS.has(String(auth.currentUser.email||'').toLowerCase()));}
function status(message,type=''){if(!statusBox)return;statusBox.textContent=message;statusBox.className='admin-status'+(type?' '+type:'');}
function fromLocalInput(value){if(!value)return null;const date=new Date(value);return Number.isNaN(date.getTime())?null:Timestamp.fromDate(date);}
function packBody(bodyKo,titleEn,bodyEn){return MARK+JSON.stringify({v:1,ko:String(bodyKo||''),enTitle:String(titleEn||''),en:String(bodyEn||'')});}
function unpackBody(value){const raw=String(value||'');if(!raw.startsWith(MARK))return {ko:raw,enTitle:'',en:''};try{const data=JSON.parse(raw.slice(MARK.length));return {ko:String(data.ko||''),enTitle:String(data.enTitle||''),en:String(data.en||'')};}catch(error){return {ko:raw,enTitle:'',en:''};}}
function installFields(){
  if(!form||form.querySelector('[data-bilingual-notice-fields]'))return;
  const actions=form.querySelector('.admin-actions');
  const block=document.createElement('div');block.className='admin-i18n-block-v3';block.dataset.bilingualNoticeFields='true';
  block.innerHTML='<strong>English notice</strong><label>English title<input type="text" name="titleEn" maxlength="120" autocomplete="off"></label><label>English body<textarea name="bodyEn" rows="7" maxlength="4500"></textarea></label>';
  actions?.before(block);
  const title=form.elements.title?.closest('label'),body=form.elements.body?.closest('label');if(title&&title.firstChild)title.firstChild.textContent='한국어 제목';if(body&&body.firstChild)body.firstChild.textContent='한국어 본문';
}
function cleanAdminList(){
  if(!list)return;list.querySelectorAll('.admin-notice-meta').forEach(meta=>{meta.textContent=meta.textContent.replace(/\s*·\s*조회\s*\d+/g,'');});
  list.querySelectorAll('.admin-notice-item p').forEach(p=>{const data=unpackBody(p.textContent);if(String(p.textContent||'').startsWith(MARK))p.textContent=data.ko;});
}
async function fillEnglishForEdit(){
  const id=form?.elements.noticeId?.value?.trim();if(!id)return;try{const snap=await getDoc(doc(db,'notices',id));if(!snap.exists())return;const data=snap.data(),packed=unpackBody(data.body);form.elements.title.value=data.title||'';form.elements.body.value=packed.ko;form.elements.titleEn.value=packed.enTitle;form.elements.bodyEn.value=packed.en;}catch(error){}
}

installFields();
if(list){list.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||button.textContent.trim()!=='수정')return;setTimeout(()=>void fillEnglishForEdit(),0);},true);new MutationObserver(cleanAdminList).observe(list,{childList:true,subtree:true,characterData:true});}
setTimeout(cleanAdminList,500);

form?.addEventListener('submit',async event=>{
  event.preventDefault();event.stopImmediatePropagation();
  if(!isAdmin()){alert('관리자 로그인을 확인해 주세요.');return;}
  const titleKo=form.elements.title.value.trim(),bodyKo=form.elements.body.value.trim(),titleEn=form.elements.titleEn.value.trim(),bodyEn=form.elements.bodyEn.value.trim();
  if(!titleKo||!bodyKo){alert('한국어 글을 입력해 주세요.');return;}
  if(!titleEn||!bodyEn){alert('영어 글을 입력해 주세요.');return;}
  const packedBody=packBody(bodyKo,titleEn,bodyEn);
  if(packedBody.length>5000){alert('한국어와 영어 공지 본문을 합쳐 5,000자 이내로 입력해 주세요.');return;}
  const id=form.elements.noticeId.value.trim(),category=form.elements.category.value==='중요'?'중요':'일반',publishStart=fromLocalInput(form.elements.publishStart.value)||Timestamp.now(),publishEnd=fromLocalInput(form.elements.publishEnd.value);
  const payload={category,author:form.elements.author.value.trim()||'STELLARIS AIRLINES',status:form.elements.status.value==='draft'?'draft':'published',publishStart,publishEnd:publishEnd||null,title:titleKo,body:packedBody,pinned:category==='중요',updatedAt:serverTimestamp()};
  try{
    if(id)await updateDoc(doc(db,'notices',id),payload);else await addDoc(collection(db,'notices'),{...payload,views:0,publishedAt:serverTimestamp()});
    status(id?'공지사항을 수정했습니다.':'한국어/영어 공지사항을 등록했습니다.','success');
    form.reset();form.elements.category.value='일반';form.elements.status.value='published';form.elements.noticeId.value='';form.elements.author.value='STELLARIS AIRLINES';form.querySelector('[data-notice-submit]').textContent='공지 등록';const cancel=form.querySelector('[data-notice-cancel]');if(cancel)cancel.hidden=true;
  }catch(error){status(`공지 저장 실패: ${String(error?.message||error)}`,'error');}
},true);

window.STELLARIS_NOTICE_BILINGUAL={unpackBody,marker:MARK};
