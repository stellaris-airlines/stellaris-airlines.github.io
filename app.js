(()=>{
'use strict';
const scriptEl=document.currentScript;
const rootURL=new URL('.',scriptEl?.src||location.href);
const A=path=>new URL(path,rootURL).href;
const pageId=document.body.dataset.page||location.pathname.split('/').filter(Boolean).pop()||'home';
document.body.classList.add(`page-${String(pageId).replace(/[^a-z0-9-]/gi,'-')}`);
document.title='Stellaris Airlines';

if(!document.querySelector('link[data-stellaris-fixes]')){
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=A('fixes.css');
  link.dataset.stellarisFixes='true';
  document.head.appendChild(link);
}

const languageNames={
  ko:'한국어',
  'en-US':'English (US)',
  'en-GB':'English (UK)',
  'zh-CN':'中文',
  ja:'日本語',
  es:'Español',
  fr:'Français'
};
const languageCodes=Object.keys(languageNames);

const languageControl=()=>`<div class="language-switcher" data-language-switcher data-i18n-skip>
  <button class="language-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Language">
    <span class="language-label">LANG</span><span class="language-current">한국어</span><span class="language-chevron" aria-hidden="true"></span>
  </button>
  <div class="language-menu" role="listbox" aria-label="Language" hidden>
    ${languageCodes.map(code=>`<button class="language-option" type="button" role="option" data-lang="${code}" aria-selected="false"><span>${languageNames[code]}</span></button>`).join('')}
  </div>
</div>`;

const headerHTML=()=>`<header class="site-header"><div class="header-inner shell-wide">
  <a class="brand" href="${A('')}" aria-label="Stellaris Airlines 홈"><img class="brand-symbol-image" src="${A('assets/stellaris-symbol.png')}" alt=""><img class="brand-wordmark-image" src="${A('assets/stellaris-wordmark.png')}" alt="STELLARIS AIRLINES"></a>
  <nav class="main-nav">
    <div class="nav-item"><a href="${A('about-us/')}">항공사 정보</a><div class="mega-menu"><div class="mega-inner shell-wide"><div class="mega-title"><span>STELLARIS AIRLINES</span><strong>항공사 정보</strong></div><div class="mega-links"><a href="${A('about-us/')}">항공사 소개</a><a href="${A('about-us/#promises')}">5가지 약속</a><a href="${A('group/')}">STELLARIS GROUP</a><a href="${A('our-fleets/')}">보유 항공기</a><a href="${A('fleets-cargo/')}">화물 항공기</a></div></div></div></div>
    <div class="nav-item"><a href="${A('flight-information/')}">운항 정보</a><div class="mega-menu"><div class="mega-inner shell-wide"><div class="mega-title"><span>STELLARIS AIRLINES</span><strong>운항 정보</strong></div><div class="mega-links"><a href="${A('flight-information/')}">운항 정보</a><a href="${A('destinations/')}">노선 안내</a><a href="${A('flight-information/#domestic')}">국내선 네트워크</a><a href="${A('flight-information/#international')}">국제선 네트워크</a></div></div></div></div>
    <div class="nav-item"><a href="${A('travel-info/')}">여행 준비</a><div class="mega-menu"><div class="mega-inner shell-wide"><div class="mega-title"><span>STELLARIS AIRLINES</span><strong>여행 준비</strong></div><div class="mega-links"><a href="${A('travel-info/')}">여행 준비</a><a href="${A('travel-info/#checkin')}">온라인 체크인</a><a href="${A('travel-info/#baggage')}">수하물</a><a href="${A('travel-info/#safety')}">탑승 전 안전수칙</a><a href="${A('wifi/')}">기내 Wi-Fi</a><a href="${A('inflight-entertainment/')}">엔터테인먼트</a></div></div></div></div>
    <div class="nav-item"><a href="${A('support/')}">지원 센터</a><div class="mega-menu"><div class="mega-inner shell-wide"><div class="mega-title"><span>STELLARIS AIRLINES</span><strong>지원 센터</strong></div><div class="mega-links"><a href="${A('support/')}">고객 지원 & Q&A</a><a href="${A('find-your-reservations/')}">예약 조회</a><a href="${A('support/#booking')}">예약/항공권</a><a href="${A('support/#baggage')}">수하물 문의</a></div></div></div></div>
    <div class="nav-item"><a href="${A('membership/')}">Star Miles</a><div class="mega-menu"><div class="mega-inner shell-wide"><div class="mega-title"><span>STELLARIS AIRLINES</span><strong>Star Miles</strong></div><div class="mega-links"><a href="${A('membership/')}">Star Miles 안내</a><a href="${A('view-my-starmiles/')}">내 Star Miles 보기</a></div></div></div></div>
  </nav>
  <div class="header-tools">${languageControl()}<a class="book-link" href="${A('book-your-journey/')}">항공권 예약하기</a><a href="${A('find-your-reservations/')}">예약 조회</a><span class="tool-divider"></span><a data-auth-guest href="${A('login/')}">로그인</a><a data-auth-guest class="signup-link" href="${A('signup/')}">회원가입</a><a data-auth-user href="${A('view-my-starmiles/')}" hidden>내 계정</a><a data-auth-logout href="#" hidden>로그아웃</a><button class="mobile-menu-button" id="mobileMenuButton" type="button" aria-label="메뉴 열기" aria-expanded="false"><span></span><span></span><span></span></button></div>
</div><div class="mobile-nav" id="mobileNav" hidden><a href="${A('book-your-journey/')}">항공권 예약하기</a><a href="${A('find-your-reservations/')}">예약 조회</a><a href="${A('about-us/')}">항공사 정보</a><a href="${A('flight-information/')}">운항 정보</a><a href="${A('destinations/')}">노선 안내</a><a href="${A('travel-info/')}">여행 준비</a><a href="${A('our-fleets/')}">보유 항공기</a><a href="${A('membership/')}">Star Miles</a><a href="${A('view-my-starmiles/')}">내 Star Miles 보기</a><a href="${A('support/')}">지원 센터</a><a data-auth-guest href="${A('login/')}">로그인</a><a data-auth-guest href="${A('signup/')}">회원가입</a><a data-auth-user href="${A('view-my-starmiles/')}" hidden>내 계정</a><a data-auth-logout href="#" hidden>로그아웃</a></div></header>`;

const footerHTML=()=>`<footer class="site-footer"><div class="shell footer-main"><a class="brand footer-brand" href="${A('')}"><img class="brand-symbol-image" src="${A('assets/stellaris-symbol.png')}" alt=""><img class="brand-wordmark-image" src="${A('assets/stellaris-wordmark.png')}" alt="STELLARIS AIRLINES"></a><div class="footer-columns"><div><strong>항공사</strong><a href="${A('about-us/')}">항공사 소개</a><a href="${A('group/')}">STELLARIS GROUP</a><a href="${A('our-fleets/')}">항공기</a></div><div><strong>여행</strong><a href="${A('book-your-journey/')}">항공권 예약하기</a><a href="${A('find-your-reservations/')}">예약 조회</a><a href="${A('destinations/')}">노선 안내</a></div><div><strong>서비스</strong><a href="${A('travel-info/')}">여행 준비</a><a href="${A('wifi/')}">기내 Wi-Fi</a><a href="${A('inflight-entertainment/')}">기내 엔터테인먼트</a></div><div><strong>지원</strong><a href="${A('support/')}">지원 센터</a><a href="${A('membership/')}">Star Miles</a><a href="${A('view-my-starmiles/')}">내 Star Miles 보기</a></div></div></div><div class="shell footer-bottom"><span>© 2026 STELLARIS AIRLINES</span><div><a href="${A('terms/')}">이용약관</a><a href="${A('privacy/')}">개인정보처리방침</a></div></div></footer>`;

function installCommonChrome(){
  const host=document.getElementById('siteHeader');
  if(host){host.innerHTML=headerHTML();}
  else{
    const current=document.querySelector('header.site-header');
    if(current)current.outerHTML=headerHTML();
    else document.body.insertAdjacentHTML('afterbegin',headerHTML());
  }
  const footerHost=document.getElementById('siteFooter');
  if(footerHost){footerHost.innerHTML=footerHTML();}
  else{
    const currentFooter=document.querySelector('footer.site-footer');
    if(currentFooter)currentFooter.outerHTML=footerHTML();
    else document.body.insertAdjacentHTML('beforeend',footerHTML());
  }
}
installCommonChrome();

const authSessionScript=document.createElement('script');
authSessionScript.type='module';
authSessionScript.src=A('auth-session.js?v=20260816-auth');
document.head.appendChild(authSessionScript);

document.querySelectorAll('.book-link').forEach(el=>el.textContent='항공권 예약하기');

const originalText=new WeakMap();
const originalAttrs=new WeakMap();
let currentLanguage='ko';
let dictionaries={};
let i18nReady=false;

function normaliseDict(data){
  const result={};
  languageCodes.forEach(code=>result[code]={});
  (data?.rows||[]).forEach(row=>{
    if(!Array.isArray(row)||!row[0])return;
    const source=row[0];
    result['en-US'][source]=row[1]??source;
    result['en-GB'][source]=row[2]??row[1]??source;
    result['zh-CN'][source]=row[3]??source;
    result.ja[source]=row[4]??source;
    result.es[source]=row[5]??source;
    result.fr[source]=row[6]??source;
  });
  return result;
}

function translateText(raw,lang){
  if(lang==='ko')return raw;
  const dict=dictionaries[lang]||{};
  if(Object.prototype.hasOwnProperty.call(dict,raw))return dict[raw];
  let out=raw;
  const matches=Object.keys(dict).filter(key=>key&&out.includes(key)).sort((a,b)=>b.length-a.length);
  for(const key of matches)out=out.split(key).join(dict[key]);
  return out;
}

function rememberAttrs(el){
  if(originalAttrs.has(el))return originalAttrs.get(el);
  const saved={};
  ['placeholder','aria-label','title','value'].forEach(attr=>{
    if(el.hasAttribute(attr))saved[attr]=el.getAttribute(attr);
  });
  originalAttrs.set(el,saved);
  return saved;
}

function translateDOM(lang){
  if(!i18nReady)return;
  currentLanguage=lang;
  document.documentElement.lang=lang==='ko'?'ko':lang;
  document.title='Stellaris Airlines';
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode(node){
    const p=node.parentElement;
    if(!p||['SCRIPT','STYLE'].includes(p.tagName)||p.closest('[data-i18n-skip]')||p.closest('[data-i18n-dynamic]'))return NodeFilter.FILTER_REJECT;
    return node.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
  }});
  let node;
  while((node=walker.nextNode())){
    if(!originalText.has(node))originalText.set(node,node.nodeValue);
    const original=originalText.get(node);
    const trimmed=original.trim();
    const translated=translateText(trimmed,lang);
    node.nodeValue=original.replace(trimmed,translated);
  }
  document.querySelectorAll('[data-i18n-dynamic]').forEach(el=>{el.textContent=translateText(el.dataset.i18nDynamic||'',lang);});
  document.querySelectorAll('[placeholder],[aria-label],[title],input[value]').forEach(el=>{
    if(el.closest('[data-i18n-skip]'))return;
    const saved=rememberAttrs(el);
    Object.entries(saved).forEach(([attr,value])=>{
      if(attr==='value'&&el.type&&['date','hidden','submit','button'].includes(el.type))return;
      const translated=translateText(value,lang);
      el.setAttribute(attr,translated);
      if(attr==='value'&&'value' in el)el.value=translated;
    });
  });
  updateLanguageUI(lang);
}

function updateLanguageUI(lang){
  document.querySelectorAll('[data-language-switcher]').forEach(switcher=>{
    const current=switcher.querySelector('.language-current');
    if(current)current.textContent=languageNames[lang]||languageNames.ko;
    switcher.querySelectorAll('.language-option').forEach(option=>{
      const selected=option.dataset.lang===lang;
      option.classList.toggle('is-selected',selected);
      option.setAttribute('aria-selected',String(selected));
    });
  });
}

function setLanguage(lang,persist=true){
  if(!languageCodes.includes(lang))lang='ko';
  if(persist){try{localStorage.setItem('stellaris-language',lang);}catch(e){}}
  translateDOM(lang);
  if(persist)window.dispatchEvent(new CustomEvent('stellaris:languagechange',{detail:{language:lang}}));
}

function bindLanguageControls(){
  document.querySelectorAll('[data-language-switcher]').forEach(switcher=>{
    const trigger=switcher.querySelector('.language-trigger');
    const menu=switcher.querySelector('.language-menu');
    if(!trigger||!menu)return;
    const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');switcher.classList.remove('is-open');};
    const open=()=>{menu.hidden=false;trigger.setAttribute('aria-expanded','true');switcher.classList.add('is-open');};
    trigger.addEventListener('click',e=>{e.stopPropagation();menu.hidden?open():close();});
    switcher.querySelectorAll('.language-option').forEach(option=>option.addEventListener('click',()=>{setLanguage(option.dataset.lang,true);close();}));
    document.addEventListener('click',e=>{if(!switcher.contains(e.target))close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  });
}

function bindSiteInteractions(){
  const mobileButton=document.getElementById('mobileMenuButton'),mobileNav=document.getElementById('mobileNav');
  if(mobileButton&&mobileNav){
    const closeMobileNav=()=>{mobileButton.setAttribute('aria-expanded','false');mobileNav.hidden=true;};
    mobileButton.addEventListener('click',()=>{const open=mobileButton.getAttribute('aria-expanded')==='true';mobileButton.setAttribute('aria-expanded',String(!open));mobileNav.hidden=open;});
    mobileNav.addEventListener('click',event=>{if(event.target.closest('a'))closeMobileNav();});
    window.addEventListener('hashchange',closeMobileNav);
    window.addEventListener('resize',()=>{if(window.innerWidth>900)closeMobileNav();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMobileNav();});
  }
  document.querySelectorAll('.demo-form').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();let p=form.querySelector('.demo-message');if(!p){p=document.createElement('p');p.className='demo-message';form.appendChild(p)}const source='현재는 웹사이트 UI 데모입니다. 실제 예약·회원 시스템은 추후 연동됩니다.';p.dataset.i18nDynamic=source;p.textContent=translateText(source,currentLanguage);}));
  const reservationTabs=document.querySelectorAll('[data-reservation-tab]');reservationTabs.forEach(btn=>btn.addEventListener('click',()=>{reservationTabs.forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('[data-reservation-panel]').forEach(p=>p.hidden=p.dataset.reservationPanel!==btn.dataset.reservationTab);}));
  const bookingTabs=document.querySelectorAll('[data-booking-tab]');bookingTabs.forEach(btn=>btn.addEventListener('click',()=>{bookingTabs.forEach(x=>x.classList.toggle('active',x===btn));const rf=document.getElementById('returnField');if(rf)rf.hidden=btn.dataset.bookingTab==='oneway';}));
  const swap=document.getElementById('swapButton'),from=document.getElementById('fromInput'),to=document.getElementById('toInput');if(swap&&from&&to&&!document.querySelector('.booking-engine')){swap.addEventListener('click',()=>{[from.value,to.value]=[to.value,from.value];});}
}

bindLanguageControls();
bindSiteInteractions();

let savedLanguage='ko';
try{savedLanguage=localStorage.getItem('stellaris-language')||'ko';}catch(e){}
if(!languageCodes.includes(savedLanguage))savedLanguage='ko';

const I18N_VERSION='20260816-privacy-phone';
const finishI18n=()=>{
  const baseRows=window.STELLARIS_I18N?.rows||[];
  const extraRows=window.STELLARIS_EXTRA_I18N?.rows||[];
  dictionaries=normaliseDict({rows:[...baseRows,...extraRows]});
  i18nReady=true;
  setLanguage(savedLanguage,false);
};
const loadExtraTranslations=()=>{
  const extraScript=document.createElement('script');
  extraScript.src=A(`translations-extra.js?v=${I18N_VERSION}`);
  extraScript.defer=true;
  extraScript.onload=finishI18n;
  extraScript.onerror=finishI18n;
  document.head.appendChild(extraScript);
};
const dataScript=document.createElement('script');
dataScript.src=A(`translations.js?v=${I18N_VERSION}`);
dataScript.defer=true;
dataScript.onload=loadExtraTranslations;
dataScript.onerror=()=>{window.STELLARIS_I18N={rows:[]};loadExtraTranslations();};
document.head.appendChild(dataScript);
})();