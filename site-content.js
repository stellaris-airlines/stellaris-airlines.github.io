import { db } from './firebase-config.js';
import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

if(!document.querySelector('link[data-site-content-style]')){
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./site-content.css?v=20260816-banner-v1',import.meta.url).href;link.dataset.siteContentStyle='true';document.head.appendChild(link);
}

const DEFAULT_BANNER={
  active:true,
  text:'새로운 좌석 브랜드를 만나보세요 — CELESTIA · ASTRELIS · LUMINA · NOVA',
  linkLabel:'좌석 안내',
  linkUrl:'seats/'
};

function safeHref(value){
  const raw=String(value||'').trim();
  if(!raw)return '';
  if(/^javascript:/i.test(raw)||/^data:/i.test(raw))return '';
  try{return new URL(raw,new URL('./',import.meta.url)).href;}catch(error){return '';}
}

function ensureBanner(){
  if(document.body.dataset.page!=='home'&&!document.body.classList.contains('page-home'))return null;
  let banner=document.querySelector('[data-home-announcement-banner]');
  if(banner)return banner;
  banner=document.createElement('aside');
  banner.className='home-announcement-banner';
  banner.dataset.homeAnnouncementBanner='true';
  banner.setAttribute('aria-label','Stellaris announcement');
  banner.innerHTML='<div class="shell-wide home-announcement-inner"><span data-home-banner-text></span><a data-home-banner-link hidden></a></div>';
  const header=document.querySelector('.site-header');
  if(header)header.before(banner);else document.body.prepend(banner);
  return banner;
}

function renderBanner(data={}){
  const banner=ensureBanner();if(!banner)return;
  const config={...DEFAULT_BANNER,...data};
  banner.hidden=config.active===false;
  const text=banner.querySelector('[data-home-banner-text]');if(text)text.textContent=String(config.text||DEFAULT_BANNER.text);
  const link=banner.querySelector('[data-home-banner-link]');
  const href=safeHref(config.linkUrl);
  if(link&&href&&config.linkLabel){link.hidden=false;link.href=href;link.textContent=String(config.linkLabel)+' →';}
  else if(link){link.hidden=true;link.removeAttribute('href');link.textContent='';}
}

renderBanner(DEFAULT_BANNER);
try{
  onSnapshot(doc(db,'siteContent','homeBanner'),snapshot=>{
    if(snapshot.exists())renderBanner(snapshot.data());
    else renderBanner(DEFAULT_BANNER);
  },()=>renderBanner(DEFAULT_BANNER));
}catch(error){renderBanner(DEFAULT_BANNER);}
