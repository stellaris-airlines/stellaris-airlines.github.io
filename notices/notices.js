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
function render(items){
  if(!host)return;
  if(!items.length){host.innerHTML='<p class="notice-empty">등록된 공지사항이 없습니다.</p>';return;}
  const sorted=[...items].sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned)));
  host.innerHTML='';
  sorted.forEach(item=>{
    const article=document.createElement('article');article.className='notice-item'+(item.pinned?' is-pinned':'');
    const meta=document.createElement('div');meta.className='notice-meta';
    const category=document.createElement('span');category.textContent=item.category||'안내';
    const date=document.createElement('time');date.textContent=formatDate(item.publishedAt||item.updatedAt);
    meta.append(category,date);
    const title=document.createElement('h3');title.textContent=item.title||'제목 없음';
    const body=document.createElement('p');body.textContent=item.body||'';
    if(item.pinned){const pin=document.createElement('b');pin.className='notice-pin';pin.textContent='중요';article.append(pin);}
    article.append(meta,title,body);host.append(article);
  });
}
try{
  onSnapshot(query(collection(db,'notices'),orderBy('publishedAt','desc')),snapshot=>render(snapshot.docs.map(doc=>({id:doc.id,...doc.data()}))),error=>{
    console.warn(error);host.innerHTML='<p class="notice-empty">공지사항을 불러오지 못했습니다.</p>';
  });
}catch(error){host.innerHTML='<p class="notice-empty">공지사항을 불러오지 못했습니다.</p>';}
