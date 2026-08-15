import { auth, db } from '../firebase-config.js';
import { browserLocalPersistence, onAuthStateChanged, setPersistence } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const M={
ko:{loading:'Star Miles 계정을 확인하고 있습니다…',signIn:'로그인 후 Star Miles를 확인하세요.',signInBody:'회원 계정으로 로그인하면 보유 마일과 등급, 예약을 통해 적립된 내역이 표시됩니다.',login:'로그인',book:'마일 적립 여행 예약',balance:'사용 가능 마일',tier:'회원 등급',earned:'총 적립 마일',bookings:'적립 예약',progress:'다음 등급까지',history:'최근 적립 내역',none:'아직 마일 적립 내역이 없습니다.',member:'회원번호',mile:'마일',max:'최고 등급입니다.'},
'en-US':{loading:'Checking your Star Miles account…',signIn:'Sign in to view your Star Miles.',signInBody:'Your balance, tier and mileage earned from bookings will appear here.',login:'Sign in',book:'Book and earn miles',balance:'Available miles',tier:'Member tier',earned:'Total miles earned',bookings:'Eligible bookings',progress:'To the next tier',history:'Recent mileage activity',none:'There is no mileage activity yet.',member:'Member number',mile:'miles',max:'You have reached the highest tier.'},
'en-GB':{loading:'Checking your Star Miles account…',signIn:'Sign in to view your Star Miles.',signInBody:'Your balance, tier and mileage earned from bookings will appear here.',login:'Sign in',book:'Book and earn miles',balance:'Available miles',tier:'Member tier',earned:'Total miles earned',bookings:'Eligible bookings',progress:'To the next tier',history:'Recent mileage activity',none:'There is no mileage activity yet.',member:'Member number',mile:'miles',max:'You have reached the highest tier.'},
'zh-CN':{loading:'正在查看您的 Star Miles 账户…',signIn:'登录后查看 Star Miles。',signInBody:'这里将显示余额、等级以及预订所获里程。',login:'登录',book:'预订并赚取里程',balance:'可用里程',tier:'会员等级',earned:'累计里程',bookings:'里程预订',progress:'距离下一等级',history:'最近里程记录',none:'暂无里程记录。',member:'会员编号',mile:'里程',max:'您已达到最高等级。'},
ja:{loading:'Star Miles アカウントを確認しています…',signIn:'ログインして Star Miles を確認してください。',signInBody:'保有マイル、会員ランク、予約で獲得した履歴を表示します。',login:'ログイン',book:'マイルが貯まる旅を予約',balance:'利用可能マイル',tier:'会員ランク',earned:'累計獲得マイル',bookings:'積算対象予約',progress:'次のランクまで',history:'最近のマイル履歴',none:'マイル履歴はまだありません。',member:'会員番号',mile:'マイル',max:'最高ランクです。'},
es:{loading:'Comprobando tu cuenta Star Miles…',signIn:'Inicia sesión para ver tus Star Miles.',signInBody:'Aquí aparecerán tu saldo, nivel y millas obtenidas con reservas.',login:'Iniciar sesión',book:'Reservar y ganar millas',balance:'Millas disponibles',tier:'Nivel',earned:'Millas acumuladas',bookings:'Reservas elegibles',progress:'Para el siguiente nivel',history:'Actividad reciente',none:'Todavía no hay actividad de millas.',member:'Número de socio',mile:'millas',max:'Has alcanzado el nivel más alto.'},
fr:{loading:'Vérification de votre compte Star Miles…',signIn:'Connectez-vous pour consulter vos Star Miles.',signInBody:'Votre solde, votre statut et les miles gagnés apparaîtront ici.',login:'Se connecter',book:'Réserver et gagner des miles',balance:'Miles disponibles',tier:'Statut',earned:'Total des miles',bookings:'Réservations éligibles',progress:'Avant le statut suivant',history:'Activité récente',none:'Aucune activité de miles pour le moment.',member:'Numéro de membre',mile:'miles',max:'Vous avez atteint le statut le plus élevé.'}
};
const lang=()=>{const value=localStorage.getItem('stellaris-language')||'ko';return M[value]?value:'ko'};
const t=key=>M[lang()][key]||M.ko[key];
const loading=document.querySelector('[data-miles-loading]');
const guest=document.querySelector('[data-miles-guest]');
const account=document.querySelector('[data-miles-account]');

function localBookings(uid){
  try{return JSON.parse(localStorage.getItem('stellaris-bookings-v1')||'[]').filter(item=>item.userId===uid);}
  catch(error){return [];}
}
function asDate(value){
  if(value?.toDate)return value.toDate();
  const date=new Date(value||0);
  return Number.isNaN(date.getTime())?new Date(0):date;
}
function memberNumber(uid){
  let value=0;for(const c of uid)value=(value*31+c.charCodeAt(0))>>>0;
  return 'XS '+String(value).padStart(10,'0').slice(-10);
}
function tierFor(miles){
  const tiers=[['STAR',0],['SILVER',20000],['GOLD',50000],['PLATINUM',100000],['STELLAR',200000]];
  let index=0;for(let i=0;i<tiers.length;i++)if(miles>=tiers[i][1])index=i;
  const current=tiers[index],next=tiers[index+1]||null;
  const progress=next?Math.max(0,Math.min(100,(miles-current[1])/(next[1]-current[1])*100)):100;
  return {name:current[0],next,progress};
}
async function allBookings(uid){
  const combined=[...localBookings(uid)];
  try{
    const snap=await getDocs(query(collection(db,'bookings'),where('userId','==',uid)));
    snap.forEach(doc=>combined.push({id:doc.id,...doc.data()}));
  }catch(error){}
  const unique=new Map();
  combined.forEach(item=>unique.set(item.bookingRef||item.id||JSON.stringify(item),item));
  return [...unique.values()].sort((a,b)=>asDate(b.createdAt)-asDate(a.createdAt));
}
function setText(selector,value){const node=document.querySelector(selector);if(node)node.textContent=value;}
function translateStatic(){
  if(loading)loading.textContent=t('loading');
  const title=guest?.querySelector('h2');if(title)title.textContent=t('signIn');
  const body=guest?.querySelector('p:not(.eyebrow)');if(body)body.textContent=t('signInBody');
  const link=guest?.querySelector('.btn');if(link)link.textContent=t('login');
  const book=account?.querySelector('.miles-account-head .btn');if(book)book.textContent=t('book');
  setText('[data-label-balance]',t('balance'));setText('[data-label-tier]',t('tier'));
  setText('[data-label-earned]',t('earned'));setText('[data-label-bookings]',t('bookings'));
  setText('[data-progress-label]',t('progress'));setText('[data-history-title]',t('history'));
}
async function renderUser(user){
  const bookings=await allBookings(user.uid);
  const eligible=bookings.filter(item=>item.status==='ticketed');
  const miles=eligible.reduce((sum,item)=>sum+Number(item.milesEarned||0),0);
  const tier=tierFor(miles);
  setText('[data-member-name]',user.displayName||user.email||'Stellaris Member');
  setText('[data-member-number]',t('member')+' · '+memberNumber(user.uid));
  setText('[data-mile-balance]',miles.toLocaleString());
  setText('[data-total-earned]',miles.toLocaleString());
  setText('[data-booking-count]',String(eligible.length));
  setText('[data-tier]',tier.name);
  setText('[data-tier-note]',tier.next?tier.next[0]+' · '+tier.next[1].toLocaleString()+' '+t('mile'):t('max'));
  setText('[data-next-tier]',tier.next?tier.next[0]:'STELLAR');
  setText('[data-progress-value]',tier.next?(tier.next[1]-miles).toLocaleString()+' '+t('mile'):'100%');
  const bar=document.querySelector('[data-tier-progress]');if(bar)bar.style.width=tier.progress+'%';
  const history=document.querySelector('[data-mile-history]');
  if(history){
    history.innerHTML=eligible.length?eligible.slice(0,10).map(item=>{
      const date=asDate(item.createdAt);
      const route=item.origin&&item.destination?item.origin+' → '+item.destination:(item.route||'STELLARIS');
      return '<div class="miles-history-row"><time>'+new Intl.DateTimeFormat(lang(),{dateStyle:'medium'}).format(date)+'</time><div><strong>'+route+'</strong><small>'+String(item.flightNumber||item.flightNo||item.bookingRef||'')+'</small></div><b>+'+Number(item.milesEarned||0).toLocaleString()+' '+t('mile')+'</b></div>';
    }).join(''):'<div class="miles-empty">'+t('none')+'</div>';
  }
  loading.hidden=true;guest.hidden=true;account.hidden=false;
}
translateStatic();
await setPersistence(auth,browserLocalPersistence);
onAuthStateChanged(auth,user=>{
  if(user)renderUser(user);
  else{loading.hidden=true;account.hidden=true;guest.hidden=false;}
});
