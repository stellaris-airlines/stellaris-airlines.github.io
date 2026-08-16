import { db } from '../firebase-config.js';
import { collection, onSnapshot, orderBy, query } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const host=document.querySelector('[data-notice-list]');
const formatDate=value=>{
  try{
    const date=value?.toDate?value.toDate():new Date(value);
    if(Number.isNaN(date.getTime()))return '';
    return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  }catch(error){return '';}
};
function noticeType(item){
  return item.category==='중요'||item.pinned?'중요':'일반';
}
function render(items){
  if(!host)return;
  if(!items.length){host.innerHTML='<p class="notice-empty">등록된 공지사항이 없습니다.</p>';return;}
  const sorted=[...items].sort((a,b)=>Number(noticeType(b)==='중요')-Number(noticeType(a)==='중요'));
  host.innerHTML='';
  sorted.forEach(item=>{
    const type=noticeType(item);
    const wrapper=document.createElement('article');wrapper.className='notice-entry'+(type==='중요'?' is-important':'');
    const row=document.createElement('div');row.className='notice-row';row.setAttribute('role','row');
    const typeCell=document.createElement('div');typeCell.className='notice-cell notice-type-cell';typeCell.dataset.label='구분';
    const badge=document.createElement('span');badge.className='notice-type '+(type==='중요'?'important':'normal');badge.textContent=type;typeCell.append(badge);
    const titleCell=document.createElement('div');titleCell.className='notice-cell notice-title-cell';titleCell.dataset.label='제목';
    const titleButton=document.createElement('button');titleButton.type='button';titleButton.className='notice-title-button';titleButton.textContent=item.title||'제목 없음';titleButton.setAttribute('aria-expanded','false');titleCell.append(titleButton);
    const author=document.createElement('div');author.className='notice-cell notice-author';author.dataset.label='작성자';author.textContent=item.author||'STELLARIS AIRLINES';
    const date=document.createElement('time');date.className='notice-cell notice-date';date.dataset.label='날짜';date.textContent=formatDate(item.publishedAt||item.updatedAt);
    row.append(typeCell,titleCell,author,date);
    const detail=document.createElement('div');detail.className='notice-detail';detail.hidden=true;
    const body=document.createElement('p');body.textContent=item.body||'';detail.append(body);
    titleButton.addEventListener('click',()=>{
      const willOpen=detail.hidden;
      detail.hidden=!willOpen;
      titleButton.setAttribute('aria-expanded',String(willOpen));
      wrapper.classList.toggle('is-open',willOpen);
    });
    wrapper.append(row,detail);host.append(wrapper);
  });
}
try{
  onSnapshot(query(collection(db,'notices'),orderBy('publishedAt','desc')),snapshot=>render(snapshot.docs.map(doc=>({id:doc.id,...doc.data()}))),error=>{
    console.warn(error);host.innerHTML='<p class="notice-empty">공지사항을 불러오지 못했습니다.</p>';
  });
}catch(error){host.innerHTML='<p class="notice-empty">공지사항을 불러오지 못했습니다.</p>';}
