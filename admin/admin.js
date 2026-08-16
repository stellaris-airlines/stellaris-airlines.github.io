import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const ADMIN_EMAILS=new Set(['stellarisairlines@gmail.com','stellaris.web.dev@gmail.com']);
const gate=document.querySelector('[data-admin-gate]');
const consoleHost=document.querySelector('[data-admin-console]');
const statusBox=document.querySelector('[data-admin-status]');
const bannerForm=document.querySelector('[data-banner-form]');
const noticeForm=document.querySelector('[data-notice-form]');
const noticeList=document.querySelector('[data-admin-notice-list]');
const cancelButton=document.querySelector('[data-notice-cancel]');
let unsubscribeNotices=null;

function status(message,type=''){
  if(!statusBox)return;statusBox.textContent=message;statusBox.className='admin-status'+(type?' '+type:'');
}
function isAdmin(user){
  return Boolean(user&&ADMIN_EMAILS.has(String(user.email||'').toLowerCase()));
}
async function loadBanner(){
  try{
    const snapshot=await getDoc(doc(db,'siteContent','homeBanner'));
    const data=snapshot.exists()?snapshot.data():{
      active:true,
      text:'새로운 좌석 브랜드를 만나보세요 — CELESTIA · ASTRELIS · LUMINA · NOVA',
      linkLabel:'좌석 안내',
      linkUrl:'seats/'
    };
    bannerForm.elements.active.checked=data.active!==false;
    bannerForm.elements.text.value=data.text||'';
    bannerForm.elements.linkLabel.value=data.linkLabel||'';
    bannerForm.elements.linkUrl.value=data.linkUrl||'';
  }catch(error){status('배너 설정을 불러오지 못했습니다. Firestore 권한을 확인해 주세요.','error');}
}
function resetNoticeForm(){
  noticeForm.reset();
  noticeForm.elements.category.value='안내';
  noticeForm.elements.noticeId.value='';
  noticeForm.querySelector('[data-notice-submit]').textContent='공지 등록';
  cancelButton.hidden=true;
}
function renderNotices(items){
  noticeList.innerHTML='';
  if(!items.length){noticeList.innerHTML='<p>등록된 공지사항이 없습니다.</p>';return;}
  items.forEach(item=>{
    const article=document.createElement('article');article.className='admin-notice-item';
    const content=document.createElement('div');
    const meta=document.createElement('div');meta.className='admin-notice-meta';meta.textContent=(item.pinned?'중요 · ':'')+(item.category||'안내');
    const title=document.createElement('h3');title.textContent=item.title||'제목 없음';
    const body=document.createElement('p');body.textContent=item.body||'';
    content.append(meta,title,body);
    const actions=document.createElement('div');actions.className='admin-notice-actions';
    const edit=document.createElement('button');edit.type='button';edit.className='admin-mini-btn';edit.textContent='수정';
    edit.addEventListener('click',()=>{
      noticeForm.elements.noticeId.value=item.id;
      noticeForm.elements.category.value=item.category||'안내';
      noticeForm.elements.title.value=item.title||'';
      noticeForm.elements.body.value=item.body||'';
      noticeForm.elements.pinned.checked=Boolean(item.pinned);
      noticeForm.querySelector('[data-notice-submit]').textContent='수정 저장';
      cancelButton.hidden=false;
      noticeForm.scrollIntoView({behavior:'smooth',block:'start'});
    });
    const remove=document.createElement('button');remove.type='button';remove.className='admin-mini-btn danger';remove.textContent='삭제';
    remove.addEventListener('click',async()=>{
      if(!window.confirm('이 공지사항을 삭제할까요?'))return;
      try{await deleteDoc(doc(db,'notices',item.id));status('공지사항을 삭제했습니다.','success');}
      catch(error){status('공지사항 삭제에 실패했습니다.','error');}
    });
    actions.append(edit,remove);article.append(content,actions);noticeList.append(article);
  });
}
function watchNotices(){
  if(unsubscribeNotices)unsubscribeNotices();
  unsubscribeNotices=onSnapshot(query(collection(db,'notices'),orderBy('publishedAt','desc')),snapshot=>{
    renderNotices(snapshot.docs.map(item=>({id:item.id,...item.data()})));
  },()=>status('공지사항 목록을 불러오지 못했습니다. Firestore 권한을 확인해 주세요.','error'));
}

bannerForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  const data={
    active:bannerForm.elements.active.checked,
    text:bannerForm.elements.text.value.trim(),
    linkLabel:bannerForm.elements.linkLabel.value.trim(),
    linkUrl:bannerForm.elements.linkUrl.value.trim(),
    updatedAt:serverTimestamp()
  };
  try{await setDoc(doc(db,'siteContent','homeBanner'),data,{merge:true});status('홈페이지 상단 배너를 저장했습니다.','success');}
  catch(error){status('배너 저장에 실패했습니다. Firestore 쓰기 권한을 확인해 주세요.','error');}
});

noticeForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  const id=noticeForm.elements.noticeId.value.trim();
  const payload={
    category:noticeForm.elements.category.value.trim()||'안내',
    title:noticeForm.elements.title.value.trim(),
    body:noticeForm.elements.body.value.trim(),
    pinned:noticeForm.elements.pinned.checked,
    updatedAt:serverTimestamp()
  };
  if(!payload.title||!payload.body)return;
  try{
    if(id){await updateDoc(doc(db,'notices',id),payload);status('공지사항을 수정했습니다.','success');}
    else{await addDoc(collection(db,'notices'),{...payload,publishedAt:serverTimestamp()});status('공지사항을 등록했습니다.','success');}
    resetNoticeForm();
  }catch(error){status('공지사항 저장에 실패했습니다. Firestore 쓰기 권한을 확인해 주세요.','error');}
});
cancelButton?.addEventListener('click',resetNoticeForm);

onAuthStateChanged(auth,async user=>{
  const allowed=isAdmin(user);
  if(!allowed){
    consoleHost.hidden=true;gate.hidden=false;
    gate.innerHTML=user
      ?'<strong>관리자 권한이 없습니다.</strong><p>승인된 관리자 계정으로 로그인해 주세요.</p>'
      :'<strong>로그인이 필요합니다.</strong><p><a href="../login/?next=../admin/">로그인</a> 후 관리자 페이지를 다시 열어 주세요.</p>';
    return;
  }
  gate.hidden=true;consoleHost.hidden=false;
  status(`관리자 계정으로 접속했습니다: ${user.email||user.uid}`,'success');
  await loadBanner();watchNotices();
});
