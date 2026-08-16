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
let currentAdmin=null;

function status(message,type=''){
  if(!statusBox)return;
  statusBox.textContent=message;
  statusBox.className='admin-status'+(type?' '+type:'');
}
function errorText(error){
  const code=String(error?.code||'').replace(/^firestore\//,'');
  const message=String(error?.message||'').trim();
  return [code,message].filter(Boolean).join(' · ');
}
function isAdmin(user){
  return Boolean(user&&ADMIN_EMAILS.has(String(user.email||'').toLowerCase()));
}
function defaultAuthor(user=currentAdmin){
  const display=String(user?.displayName||'').trim();
  return display&&display.length<=50?display:'STELLARIS AIRLINES';
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
  }catch(error){
    console.error('Banner load failed',error);
    status(`배너 설정을 불러오지 못했습니다.${errorText(error)?' '+errorText(error):''}`,'error');
  }
}
function resetNoticeForm(){
  noticeForm.reset();
  noticeForm.elements.category.value='일반';
  noticeForm.elements.author.value=defaultAuthor();
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
    const meta=document.createElement('div');meta.className='admin-notice-meta';
    const category=item.category==='중요'||item.pinned?'중요':'일반';
    meta.textContent=`${category} · ${item.author||'작성자 미지정'}`;
    const title=document.createElement('h3');title.textContent=item.title||'제목 없음';
    const body=document.createElement('p');body.textContent=item.body||'';
    content.append(meta,title,body);
    const actions=document.createElement('div');actions.className='admin-notice-actions';
    const edit=document.createElement('button');edit.type='button';edit.className='admin-mini-btn';edit.textContent='수정';
    edit.addEventListener('click',()=>{
      noticeForm.elements.noticeId.value=item.id;
      noticeForm.elements.category.value=item.category==='중요'||item.pinned?'중요':'일반';
      noticeForm.elements.author.value=item.author||defaultAuthor();
      noticeForm.elements.title.value=item.title||'';
      noticeForm.elements.body.value=item.body||'';
      noticeForm.querySelector('[data-notice-submit]').textContent='수정 저장';
      cancelButton.hidden=false;
      noticeForm.scrollIntoView({behavior:'smooth',block:'start'});
    });
    const remove=document.createElement('button');remove.type='button';remove.className='admin-mini-btn danger';remove.textContent='삭제';
    remove.addEventListener('click',async()=>{
      if(!window.confirm('이 공지사항을 삭제할까요?'))return;
      try{
        await deleteDoc(doc(db,'notices',item.id));
        status('공지사항을 삭제했습니다.','success');
      }catch(error){
        console.error('Notice delete failed',error);
        status(`공지사항 삭제에 실패했습니다.${errorText(error)?' '+errorText(error):''}`,'error');
      }
    });
    actions.append(edit,remove);article.append(content,actions);noticeList.append(article);
  });
}
function watchNotices(){
  if(unsubscribeNotices)unsubscribeNotices();
  unsubscribeNotices=onSnapshot(query(collection(db,'notices'),orderBy('publishedAt','desc')),snapshot=>{
    renderNotices(snapshot.docs.map(item=>({id:item.id,...item.data()})));
  },error=>{
    console.error('Notice list failed',error);
    status(`공지사항 목록을 불러오지 못했습니다.${errorText(error)?' '+errorText(error):''}`,'error');
  });
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
  try{
    await setDoc(doc(db,'siteContent','homeBanner'),data,{merge:true});
    status('홈페이지 상단 배너를 저장했습니다.','success');
  }catch(error){
    console.error('Banner save failed',error);
    status(`배너 저장에 실패했습니다.${errorText(error)?' '+errorText(error):''}`,'error');
  }
});

noticeForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!currentAdmin||!isAdmin(currentAdmin)){
    status('관리자 인증이 만료되었습니다. 다시 로그인해 주세요.','error');
    return;
  }
  const id=noticeForm.elements.noticeId.value.trim();
  const category=noticeForm.elements.category.value==='중요'?'중요':'일반';
  const author=noticeForm.elements.author.value.trim()||defaultAuthor();
  const title=noticeForm.elements.title.value.trim();
  const body=noticeForm.elements.body.value.trim();
  noticeForm.elements.author.value=author;
  if(!title||!body){
    status('제목과 본문을 모두 입력해 주세요.','error');
    return;
  }
  const payload={
    category,
    author,
    title,
    body,
    pinned:category==='중요',
    updatedAt:serverTimestamp()
  };
  const submitButton=noticeForm.querySelector('[data-notice-submit]');
  const oldLabel=submitButton.textContent;
  submitButton.disabled=true;
  submitButton.textContent=id?'저장 중…':'등록 중…';
  status('공지사항을 저장하고 있습니다.');
  try{
    if(id){
      await updateDoc(doc(db,'notices',id),payload);
      status('공지사항을 수정했습니다.','success');
    }else{
      await addDoc(collection(db,'notices'),{...payload,publishedAt:serverTimestamp()});
      status('공지사항을 등록했습니다.','success');
    }
    resetNoticeForm();
  }catch(error){
    console.error('Notice save failed',error);
    const detail=errorText(error);
    if(String(error?.code||'').includes('permission-denied')){
      status(`공지사항 저장 권한이 거부되었습니다. Firebase Firestore Rules가 최신인지 확인해 주세요.${detail?' '+detail:''}`,'error');
    }else{
      status(`공지사항 저장에 실패했습니다.${detail?' '+detail:''}`,'error');
    }
  }finally{
    submitButton.disabled=false;
    if(noticeForm.elements.noticeId.value.trim())submitButton.textContent='수정 저장';
    else submitButton.textContent='공지 등록';
    if(oldLabel==='수정 저장'&&noticeForm.elements.noticeId.value.trim())submitButton.textContent=oldLabel;
  }
});
cancelButton?.addEventListener('click',resetNoticeForm);

onAuthStateChanged(auth,user=>{
  currentAdmin=isAdmin(user)?user:null;
  const allowed=Boolean(currentAdmin);
  if(!allowed){
    consoleHost.hidden=true;gate.hidden=false;
    gate.innerHTML=user
      ?'<strong>관리자 권한이 없습니다.</strong><p>승인된 관리자 계정으로 로그인해 주세요.</p>'
      :'<strong>로그인이 필요합니다.</strong><p><a href="../login/?next=../admin/">로그인</a> 후 관리자 페이지를 다시 열어 주세요.</p>';
    return;
  }
  gate.hidden=true;consoleHost.hidden=false;
  resetNoticeForm();
  status(`관리자 계정으로 접속했습니다: ${user.email||user.uid}`,'success');
  void loadBanner();watchNotices();
});
