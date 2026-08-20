import { auth, db } from '../firebase-config.js';
import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { createRichEditor, sanitizeRichHTML } from './rich-editor.js?v=20260820-rich-v2';
import { uploadAdminImage } from './admin-media.js?v=20260820-media-v1';
import './admin-popup.js?v=20260821-popup-v4';

const ADMIN_EMAILS=new Set(['stellarisairlines@gmail.com','stellaris.web.dev@gmail.com']);
const MARK='[[STELLARIS_BILINGUAL_V1]]';
const form=document.querySelector('[data-notice-form]');
const list=document.querySelector('[data-admin-notice-list]');
const statusBox=document.querySelector('[data-admin-status]');
let koEditor=null,enEditor=null,cleanQueued=false;

function isAdmin(){return Boolean(auth.currentUser&&ADMIN_EMAILS.has(String(auth.currentUser.email||'').toLowerCase()));}
function status(message,type=''){if(!statusBox)return;statusBox.textContent=message;statusBox.className='admin-status'+(type?' '+type:'');}
function fromLocalInput(value){if(!value)return null;const date=new Date(value);return Number.isNaN(date.getTime())?null:Timestamp.fromDate(date);}
function packBody(bodyKo,titleEn,bodyEn){return MARK+JSON.stringify({v:2,ko:sanitizeRichHTML(bodyKo),enTitle:String(titleEn||''),en:sanitizeRichHTML(bodyEn)});}
function unpackBody(value){const raw=String(value||'');if(!raw.startsWith(MARK))return {ko:raw,enTitle:'',en:''};try{const data=JSON.parse(raw.slice(MARK.length));return {ko:String(data.ko||''),enTitle:String(data.enTitle||''),en:String(data.en||'')};}catch(error){return {ko:raw,enTitle:'',en:''};}}
function textOnly(html){const div=document.createElement('div');div.innerHTML=sanitizeRichHTML(html);return div.textContent||'';}
function installFields(){
  if(!form||form.querySelector('[data-bilingual-notice-fields]'))return;
  const actions=form.querySelector('.admin-actions');
  const block=document.createElement('div');block.className='admin-i18n-block-v3';block.dataset.bilingualNoticeFields='true';
  block.innerHTML='<strong>English notice</strong><label>English title<input type="text" name="titleEn" maxlength="120" autocomplete="off"></label><label>English body<textarea name="bodyEn" rows="7"></textarea></label>';
  actions?.before(block);
  const title=form.elements.title?.closest('label'),body=form.elements.body?.closest('label');if(title&&title.firstChild)title.firstChild.textContent='한국어 제목';if(body&&body.firstChild)body.firstChild.textContent='한국어 본문';
  form.elements.body.removeAttribute('maxlength');form.elements.body.removeAttribute('required');form.elements.bodyEn.removeAttribute('maxlength');form.elements.bodyEn.removeAttribute('required');
  koEditor=createRichEditor(form.elements.body,{placeholder:'한국어 본문을 입력하세요.',uploadImage:file=>uploadAdminImage(file,'notices/ko')});
  enEditor=createRichEditor(form.elements.bodyEn,{placeholder:'Enter the English notice body.',uploadImage:file=>uploadAdminImage(file,'notices/en')});
}
function cleanAdminList(){
  cleanQueued=false;
  if(!list)return;
  list.querySelectorAll('.admin-notice-item').forEach(article=>{if(article.querySelector('h3')?.textContent.trim()==='HOME_POPUP_CONFIG')article.remove();});
  list.querySelectorAll('.admin-notice-meta').forEach(meta=>{const current=meta.textContent||'',next=current.replace(/\s*·\s*조회\s*\d+/g,'');if(next!==current)meta.textContent=next;});
  list.querySelectorAll('.admin-notice-item p').forEach(p=>{const current=String(p.textContent||'');if(!current.startsWith(MARK))return;const next=textOnly(unpackBody(current).ko);if(next!==current)p.textContent=next;});
}
function scheduleClean(){if(cleanQueued)return;cleanQueued=true;requestAnimationFrame(cleanAdminList);}
async function fillEnglishForEdit(){
  const id=form?.elements.noticeId?.value?.trim();if(!id)return;try{const snap=await getDoc(doc(db,'notices',id));if(!snap.exists())return;const data=snap.data(),packed=unpackBody(data.body);form.elements.title.value=data.title||'';form.elements.titleEn.value=packed.enTitle;koEditor?.setHTML(packed.ko);enEditor?.setHTML(packed.en);}catch(error){}
}
function resetEditors(){koEditor?.clear();enEditor?.clear();}

installFields();
if(list){
  list.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||button.textContent.trim()!=='수정')return;setTimeout(()=>void fillEnglishForEdit(),0);},true);
  new MutationObserver(scheduleClean).observe(list,{childList:true,subtree:true});
}
setTimeout(scheduleClean,500);
form?.querySelector('[data-notice-cancel]')?.addEventListener('click',()=>setTimeout(resetEditors,0),true);

form?.addEventListener('submit',async event=>{
  event.preventDefault();event.stopImmediatePropagation();
  if(!isAdmin()){alert('관리자 로그인을 확인해 주세요.');return;}
  koEditor?.sync();enEditor?.sync();
  const titleKo=form.elements.title.value.trim(),bodyKo=koEditor?.getHTML()||form.elements.body.value.trim(),titleEn=form.elements.titleEn.value.trim(),bodyEn=enEditor?.getHTML()||form.elements.bodyEn.value.trim();
  if(!titleKo||!textOnly(bodyKo).trim()){alert('한국어 글을 입력해 주세요.');return;}
  if(!titleEn||!textOnly(bodyEn).trim()){alert('영어 글을 입력해 주세요.');return;}
  const packedBody=packBody(bodyKo,titleEn,bodyEn);
  if(packedBody.length>5000){alert('서식과 이미지를 포함한 한국어/영어 공지 본문이 저장 한도(5,000자)를 초과합니다. 내용을 줄이거나 이미지 수를 줄여 주세요.');return;}
  const id=form.elements.noticeId.value.trim(),category=form.elements.category.value==='중요'?'중요':'일반',publishStart=fromLocalInput(form.elements.publishStart.value)||Timestamp.now(),publishEnd=fromLocalInput(form.elements.publishEnd.value);
  const payload={category,author:form.elements.author.value.trim()||'STELLARIS AIRLINES',status:form.elements.status.value==='draft'?'draft':'published',publishStart,publishEnd:publishEnd||null,title:titleKo,body:packedBody,pinned:category==='중요',updatedAt:serverTimestamp()};
  try{
    if(id)await updateDoc(doc(db,'notices',id),payload);else await addDoc(collection(db,'notices'),{...payload,views:0,publishedAt:serverTimestamp()});
    status(id?'공지사항을 수정했습니다.':'한국어/영어 공지사항을 등록했습니다.','success');
    form.reset();resetEditors();form.elements.category.value='일반';form.elements.status.value='published';form.elements.noticeId.value='';form.elements.author.value='STELLARIS AIRLINES';form.querySelector('[data-notice-submit]').textContent='공지 등록';const cancel=form.querySelector('[data-notice-cancel]');if(cancel)cancel.hidden=true;
  }catch(error){status(`공지 저장 실패: ${String(error?.message||error)}`,'error');}
},true);

window.STELLARIS_NOTICE_BILINGUAL={unpackBody,marker:MARK};
