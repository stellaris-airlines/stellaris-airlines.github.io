const ROOT=new URL('./',import.meta.url);
const H=path=>new URL(path,ROOT).href;

function addLink(host,path,label,attrs={}){
  if(!host)return null;
  const href=path.startsWith('http')?path:H(path);
  const existing=[...host.querySelectorAll('a')].find(a=>a.href===href);
  if(existing)return existing;
  const a=document.createElement('a');
  a.href=href;a.textContent=label;
  Object.entries(attrs).forEach(([key,value])=>a.setAttribute(key,value));
  host.appendChild(a);
  return a;
}
function installServicesNav(){
  const main=document.querySelector('.main-nav');
  if(main&&!main.querySelector('[data-services-nav]')){
    const item=document.createElement('div');
    item.className='nav-item';item.dataset.servicesNav='true';
    item.innerHTML=`<a href="${H('services/')}">서비스</a><div class="mega-menu"><div class="mega-inner shell-wide"><div class="mega-title"><span>STELLARIS AIRLINES</span><strong>서비스</strong></div><div class="mega-links"><a href="${H('services/')}">전체 서비스</a><a href="${H('baggage/')}">수하물 서비스</a><a href="${H('inflight-service/')}">기내 서비스</a><a href="${H('payments-refunds/')}">결제 · 환불</a><a href="${H('special-assistance/')}">특별지원</a><a href="${H('travel-alerts/')}">여행알림</a><a href="${H('seats/')}">객실 · 좌석 소개</a><a href="${H('hotel-car/')}">호텔 · 렌터카</a><a href="${H('special-liveries/')}">특별도장 소개</a><a href="${H('livery-gallery/')}">도장갤러리</a></div></div></div>`;
    const support=[...main.children].find(el=>el.querySelector(':scope > a')?.href===H('support/'));
    support?main.insertBefore(item,support):main.appendChild(item);
  }
  const about=[...document.querySelectorAll('.main-nav .nav-item')].find(el=>el.querySelector(':scope > a')?.href===H('about-us/'))?.querySelector('.mega-links');
  addLink(about,'news/','뉴스');addLink(about,'careers/','채용');
}
function installMobileNav(){
  const mobile=document.getElementById('mobileNav');
  [['services/','전체 서비스'],['baggage/','수하물 서비스'],['inflight-service/','기내 서비스'],['payments-refunds/','결제 · 환불'],['special-assistance/','특별지원'],['travel-alerts/','여행알림'],['seats/','객실 · 좌석 소개'],['hotel-car/','호텔 · 렌터카'],['special-liveries/','특별도장 소개'],['livery-gallery/','도장갤러리'],['news/','뉴스'],['careers/','채용']].forEach(([p,l])=>addLink(mobile,p,l));
}
function instagramLink(){
  const link=document.createElement('a');
  link.href='https://www.instagram.com/flystellaris/';
  link.target='_blank';link.rel='noopener noreferrer';
  link.dataset.instagramLink='true';link.dataset.autoTranslateSkip='true';
  link.setAttribute('aria-label','Stellaris Airlines Instagram');link.setAttribute('title','Stellaris Airlines Instagram');
  link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" width="17" height="17"><rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="17.4" cy="6.8" r="1.1" fill="currentColor"/></svg>';
  Object.assign(link.style,{display:'inline-flex',alignItems:'center',justifyContent:'center',flex:'0 0 24px',width:'24px',height:'24px',padding:'0',margin:'0',color:'inherit',opacity:'.72',verticalAlign:'middle'});
  return link;
}
function installFooterLinks(){
  const columns=[...document.querySelectorAll('.footer-columns>div')];
  const airline=columns[0],travel=columns[1],services=columns[2],support=columns[3];
  addLink(airline,'news/','뉴스');addLink(airline,'careers/','채용');addLink(airline,'special-liveries/','특별도장 소개');addLink(airline,'livery-gallery/','도장갤러리');
  addLink(travel,'hotel-car/','호텔 · 렌터카');
  addLink(services,'services/','전체 서비스');addLink(services,'baggage/','수하물 서비스');addLink(services,'inflight-service/','기내 서비스');addLink(services,'payments-refunds/','결제 · 환불');addLink(services,'special-assistance/','특별지원');addLink(services,'travel-alerts/','여행알림');addLink(services,'seats/','객실 · 좌석 소개');
  addLink(support,'notices/','공지사항');
  const legal=document.querySelector('.footer-bottom>div');
  if(!legal)return;
  if(!legal.dataset.extendedLegal){
    legal.dataset.extendedLegal='true';legal.innerHTML='';
    const termsGroup=document.createElement('span');
    termsGroup.className='footer-terms-social';termsGroup.dataset.footerTermsSocial='true';
    Object.assign(termsGroup.style,{display:'inline-flex',alignItems:'center',gap:'8px',whiteSpace:'nowrap',flex:'0 0 auto'});
    const terms=document.createElement('a');terms.href=H('terms/');terms.textContent='웹사이트 이용약관';
    termsGroup.append(terms,instagramLink());
    legal.appendChild(termsGroup);
    [['international-passenger-conditions/','국제여객 운송약관'],['international-cargo-conditions/','국제화물 운송약관'],['legal-notices/','기타 법률 고지'],['privacy/','개인정보처리방침']].forEach(([p,l])=>addLink(legal,p,l));
  }
  Object.assign(legal.style,{display:'flex',alignItems:'center',justifyContent:'flex-end',flexWrap:'wrap',columnGap:'28px',rowGap:'10px'});
}
function removeLegacyInstagram(){
  document.querySelectorAll('[data-instagram-link]').forEach(link=>{
    if(!link.closest('[data-footer-terms-social]'))link.remove();
  });
}
function dedupeLinks(){
  document.querySelectorAll('.mega-links,.mobile-nav,.footer-columns>div').forEach(host=>{
    const seen=new Set();
    [...host.querySelectorAll(':scope > a')].forEach(link=>{const key=link.href;if(seen.has(key))link.remove();else seen.add(key);});
  });
}
function retranslate(){queueMicrotask(()=>window.STELLARIS_AUTO_TRANSLATE?.translate?.());}
function install(){installServicesNav();installMobileNav();installFooterLinks();removeLegacyInstagram();dedupeLinks();retranslate();}
install();
setTimeout(install,250);
setTimeout(install,1000);
window.addEventListener('stellaris:languagechange',()=>setTimeout(install,0));
