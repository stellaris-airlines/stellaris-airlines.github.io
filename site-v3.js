import { AIRPORTS, availableDestinations, addMonths, dateISO } from './operations-model.js?v=20260816-live-ticketing-v2';
import './service-careers-i18n.js?v=20260820-en-only-v1';
import './legal-i18n.js?v=20260820-en-only-v1';

const ROOT=new URL('./',import.meta.url);
const H=path=>new URL(path,ROOT).href;
const lang=()=>{try{return localStorage.getItem('stellaris-language')==='en-US'?'en-US':'ko';}catch(error){return 'ko';}};
const isEnglish=()=>lang()==='en-US';
const L=(ko,en)=>isEnglish()?en:ko;

function ensureStyle(){
  if(document.querySelector('link[data-site-v3]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href=H('site-v3.css?v=20260820-v1');link.dataset.siteV3='true';document.head.appendChild(link);
}

function normalizeLanguage(){
  try{const saved=localStorage.getItem('stellaris-language');if(saved!=='ko'&&saved!=='en-US')localStorage.setItem('stellaris-language','ko');}catch(error){}
}

function globeIcon(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21M12 3C9.5 5.7 8.2 8.7 8.2 12S9.5 18.3 12 21"/></svg>';}
function installLanguageToggle(){
  document.querySelectorAll('.language-single-toggle').forEach(button=>button.remove());
  document.querySelectorAll('[data-language-switcher]').forEach(switcher=>{
    const tools=switcher.parentElement;if(!tools)return;
    const button=document.createElement('button');button.type='button';button.className='language-single-toggle';button.dataset.simpleLanguageToggle='true';
    const sync=()=>{button.innerHTML=globeIcon()+`<span>${isEnglish()?'한국어':'Eng'}</span>`;button.setAttribute('aria-label',isEnglish()?'한국어로 보기':'View in English');};
    button.addEventListener('click',()=>{
      const target=isEnglish()?'ko':'en-US';
      const option=switcher.querySelector(`.language-option[data-lang="${target}"]`);
      if(option){option.click();}
      else{try{localStorage.setItem('stellaris-language',target);}catch(error){}window.dispatchEvent(new CustomEvent('stellaris:languagechange',{detail:{language:target}}));location.reload();}
    });
    switcher.insertAdjacentElement('afterend',button);sync();
  });
}

const MEGA_COLUMNS=[
  {ko:'항공권 예약',en:'Book',links:[['book-your-journey/','항공권 예약','Book a flight'],['payments-refunds/','운임 · 결제 · 환불','Fares, payment & refunds'],['find-your-reservations/','예약 조회','Manage booking'],['terms/','웹사이트 이용약관','Website terms']]},
  {ko:'서비스 안내',en:'Services',links:[['baggage/','수하물','Baggage'],['check-in/','온라인 체크인','Online check-in'],['seats/','좌석 안내','Seats & cabins'],['inflight-service/','기내 서비스','Inflight services'],['special-assistance/','특별지원','Special assistance'],['membership/','Star Miles','Star Miles'],['hotel-car/','호텔 · 렌터카','Hotels & car rental']]},
  {ko:'운항정보',en:'Flight information',links:[['flight-information/','출도착 조회','Flight status'],['destinations/','노선 안내','Destinations'],['travel-alerts/','여행알림','Travel alerts'],['boarding-pass/','모바일 탑승권','Mobile boarding pass']]},
  {ko:'스텔라리스 소개',en:'About Stellaris',links:[['about-us/','항공사 소개','About us'],['our-fleets/','항공기 소개','Our fleet'],['news/','뉴스','News'],['careers/','채용 안내','Careers'],['special-liveries/','특별도장','Special liveries'],['livery-gallery/','도장갤러리','Livery gallery']]}
];
function megaHTML(){return `<div class="stellaris-mega-v3-inner shell-wide">${MEGA_COLUMNS.map(col=>`<section class="stellaris-mega-v3-col"><strong>${L(col.ko,col.en)}</strong>${col.links.map(([p,ko,en])=>`<a href="${H(p)}">${L(ko,en)}</a>`).join('')}</section>`).join('')}</div>`;}
function installMegaMenu(){
  const header=document.querySelector('.site-header'),main=document.querySelector('.main-nav');if(!header||!main)return;
  let mega=header.querySelector('.stellaris-mega-v3');
  if(!mega){mega=document.createElement('div');mega.className='stellaris-mega-v3';header.appendChild(mega);}
  mega.innerHTML=megaHTML();
  if(header.dataset.megaV3Bound)return;header.dataset.megaV3Bound='true';
  let timer=null;const open=()=>{clearTimeout(timer);header.classList.add('mega-v3-open');};const close=()=>{clearTimeout(timer);timer=setTimeout(()=>header.classList.remove('mega-v3-open'),180);};
  main.addEventListener('mouseenter',open);main.addEventListener('mouseleave',close);mega.addEventListener('mouseenter',open);mega.addEventListener('mouseleave',close);
  main.addEventListener('focusin',open);header.addEventListener('focusout',event=>{if(!header.contains(event.relatedTarget))close();});
}

function instagram(){
  const a=document.createElement('a');a.className='footer-instagram-v3';a.href='https://www.instagram.com/flystellaris/';a.target='_blank';a.rel='noopener noreferrer';a.dataset.autoTranslateSkip='true';a.setAttribute('aria-label','Stellaris Airlines Instagram');a.title='Instagram';
  a.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="17.4" cy="6.8" r="1.1" fill="currentColor"/></svg>';return a;
}
function installFooter(){
  const footer=document.querySelector('.site-footer'),bottom=footer?.querySelector('.footer-bottom');if(!footer||!bottom)return;
  if(bottom.dataset.footerV3==='true'){
    bottom.querySelectorAll('[data-footer-v3-ko]').forEach(el=>el.textContent=L(el.dataset.footerV3Ko,el.dataset.footerV3En||el.dataset.footerV3Ko));return;
  }
  bottom.dataset.footerV3='true';bottom.innerHTML='';
  const wrap=document.createElement('div');wrap.className='footer-bottom-v3';
  const legal=document.createElement('div');legal.className='footer-legal-v3';
  const group=document.createElement('span');group.className='footer-terms-social-v3';group.append(instagram());
  const terms=document.createElement('a');terms.href=H('terms/');terms.dataset.footerV3Ko='웹사이트 이용약관';terms.dataset.footerV3En='Website Terms of Use';terms.textContent=L('웹사이트 이용약관','Website Terms of Use');group.append(terms);legal.append(group);
  [['international-passenger-conditions/','국제여객 운송약관','International Conditions of Carriage — Passengers'],['international-cargo-conditions/','국제화물 운송약관','International Conditions of Carriage — Cargo'],['legal-notices/','기타 법률 고지','Legal notices'],['privacy/','개인정보처리방침','Privacy Policy']].forEach(([p,ko,en])=>{const a=document.createElement('a');a.href=H(p);a.dataset.footerV3Ko=ko;a.dataset.footerV3En=en;a.textContent=L(ko,en);legal.append(a);});
  const company=document.createElement('div');company.className='footer-company-v3';
  const copy=document.createElement('div');copy.className='company-copy';copy.dataset.footerV3Ko='STELLARIS AIRLINES · 대한민국 기반 Hybrid Service Carrier · 고객 문의는 홈페이지의 이메일 문의 서비스를 이용해 주세요.';copy.dataset.footerV3En='STELLARIS AIRLINES · Korea-based Hybrid Service Carrier · Please use the website email inquiry service for customer support.';copy.textContent=L(copy.dataset.footerV3Ko,copy.dataset.footerV3En);
  const cr=document.createElement('div');cr.className='copyright';cr.textContent='ⓒ 2026 STELLARIS AIRLINES. All rights reserved.';company.append(copy,cr);wrap.append(legal,company);bottom.append(wrap);
}

const COORDS={
ICN:[37.4602,126.4407],GMP:[37.5583,126.7906],CJU:[33.5113,126.4930],PUS:[35.1796,128.9382],CJJ:[36.7166,127.4991],TAE:[35.8941,128.6589],MWX:[34.9914,126.3828],YNY:[38.0613,128.6692],USN:[35.5935,129.3517],RSU:[34.8423,127.6169],HIN:[35.0886,128.0704],KPO:[35.9879,129.4205],KWJ:[35.1264,126.8089],KUV:[35.9038,126.6159],WJU:[37.4381,127.9604],NYC:[40.6413,-73.7781],SEA:[47.4502,-122.3088],LAX:[33.9416,-118.4085],HNL:[21.3187,-157.9225],THT:[-17.5537,-149.6063],SYD:[-33.9399,151.1753],LHR:[51.47,-.4543],CDG:[49.0097,2.5479],STR:[36.3992,25.4793],DXB:[25.2532,55.3657]};
function weatherText(code){const map={0:['맑음','Clear'],1:['대체로 맑음','Mainly clear'],2:['구름 조금','Partly cloudy'],3:['흐림','Overcast'],45:['안개','Fog'],48:['착빙 안개','Rime fog'],51:['약한 이슬비','Light drizzle'],53:['이슬비','Drizzle'],55:['강한 이슬비','Heavy drizzle'],61:['약한 비','Light rain'],63:['비','Rain'],65:['강한 비','Heavy rain'],71:['약한 눈','Light snow'],73:['눈','Snow'],75:['강한 눈','Heavy snow'],80:['소나기','Rain showers'],81:['소나기','Rain showers'],82:['강한 소나기','Heavy showers'],95:['뇌우','Thunderstorm'],96:['우박성 뇌우','Thunderstorm with hail'],99:['강한 우박성 뇌우','Severe thunderstorm with hail']};const pair=map[code]||['현재 기상','Current weather'];return L(pair[0],pair[1]);}
function airportLabel(code){const a=AIRPORTS[code];return a?`${isEnglish()?a.nameEn:a.nameKo} (${code})`:code;}
async function loadWeather(code,host){
  const pos=COORDS[code];if(!pos||!host)return;
  host.classList.add('loading');host.innerHTML=`<div><div class="weather-place">${airportLabel(code)}</div><strong>…</strong><div class="weather-desc">${L('실시간 날씨 확인 중','Loading live weather')}</div></div>`;
  try{
    const [latitude,longitude]=pos;const url=new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude',latitude);url.searchParams.set('longitude',longitude);url.searchParams.set('current','temperature_2m,apparent_temperature,weather_code');url.searchParams.set('daily','temperature_2m_max,temperature_2m_min');url.searchParams.set('forecast_days','1');url.searchParams.set('timezone','auto');
    const response=await fetch(url);if(!response.ok)throw new Error('weather-http');const data=await response.json();
    const now=Math.round(Number(data.current?.temperature_2m));const apparent=Math.round(Number(data.current?.apparent_temperature));const max=Math.round(Number(data.daily?.temperature_2m_max?.[0]));const min=Math.round(Number(data.daily?.temperature_2m_min?.[0]));
    host.innerHTML=`<div><div class="weather-place">${airportLabel(code)}</div><strong>${Number.isFinite(now)?now:'–'}°</strong><div class="weather-desc">${weatherText(Number(data.current?.weather_code))}</div></div><div class="weather-range">${L('체감','Feels')} ${Number.isFinite(apparent)?apparent:'–'}°<br>${L('최고','High')} ${Number.isFinite(max)?max:'–'}° · ${L('최저','Low')} ${Number.isFinite(min)?min:'–'}°</div>`;
  }catch(error){host.innerHTML=`<div><div class="weather-place">${airportLabel(code)}</div><strong>–</strong><div class="weather-desc">${L('날씨 정보를 불러오지 못했습니다.','Weather is temporarily unavailable.')}</div></div>`;}
  finally{host.classList.remove('loading');}
}
function buildAirportOptions(select,codes){select.innerHTML='';codes.forEach(code=>{const a=AIRPORTS[code];if(!a)return;const option=document.createElement('option');option.value=code;option.textContent=airportLabel(code);select.append(option);});}
function homeSearchHTML(){return `<section class="home-route-search-v3"><div class="shell"><div class="home-route-card-v3"><div class="home-route-tabs-v3"><button type="button" class="active" data-home-trip="round">${L('왕복','Round trip')}</button><button type="button" data-home-trip="oneway">${L('편도','One way')}</button></div><form class="home-route-form-v3" data-home-route-form><div class="home-route-main-v3"><label class="home-route-field-v3"><span>${L('출발','From')}</span><select data-home-from></select></label><button class="home-route-swap-v3" type="button" data-home-swap aria-label="${L('출발지와 도착지 바꾸기','Swap origin and destination')}">⇄</button><label class="home-route-field-v3"><span>${L('도착','To')}</span><select data-home-to></select></label></div><div class="home-route-detail-v3"><label>${L('출발일','Departure')}<input type="date" data-home-depart required></label><label data-home-return-wrap>${L('귀국일','Return')}<input type="date" data-home-return required></label><label>${L('탑승객','Passengers')}<input type="number" min="1" max="9" value="1" data-home-passengers></label><button class="home-route-search-button-v3" type="submit">${L('항공권 검색','Search flights')}</button></div><div class="weather-row-v3"><article class="weather-card-v3" data-weather-from></article><article class="weather-card-v3" data-weather-to></article></div><div class="weather-source-v3">Weather: Open-Meteo</div><div class="home-route-tools-v3"><a href="${H('find-your-reservations/')}">${L('예약 조회','Manage booking')}</a><a href="${H('check-in/')}">${L('체크인 / 탑승권','Check-in / Boarding pass')}</a></div></form></div></div></section>`;}
function installHomeSearch(){
  if(document.body.dataset.page!=='home'||document.querySelector('.home-route-search-v3'))return;
  const hero=document.querySelector('.home-hero');if(!hero)return;hero.insertAdjacentHTML('afterend',homeSearchHTML());
  const form=document.querySelector('[data-home-route-form]'),from=form.querySelector('[data-home-from]'),to=form.querySelector('[data-home-to]'),depart=form.querySelector('[data-home-depart]'),ret=form.querySelector('[data-home-return]'),retWrap=form.querySelector('[data-home-return-wrap]');let trip='round';
  const origins=Object.keys(AIRPORTS).filter(code=>availableDestinations(code).length);buildAirportOptions(from,origins);if(origins.includes('ICN'))from.value='ICN';
  const syncTo=()=>{const choices=availableDestinations(from.value);buildAirportOptions(to,choices);if(!choices.includes(to.value))to.value=choices[0]||'';void loadWeather(from.value,form.querySelector('[data-weather-from]'));void loadWeather(to.value,form.querySelector('[data-weather-to]'));};syncTo();
  const today=new Date(),max=addMonths(today,6),defaultReturn=new Date(today);defaultReturn.setDate(defaultReturn.getDate()+7);depart.min=dateISO(today);depart.max=dateISO(max);depart.value=dateISO(today);ret.min=dateISO(today);ret.max=dateISO(max);ret.value=dateISO(defaultReturn>max?max:defaultReturn);
  from.addEventListener('change',syncTo);to.addEventListener('change',()=>loadWeather(to.value,form.querySelector('[data-weather-to]')));
  form.querySelector('[data-home-swap]').addEventListener('click',()=>{const a=from.value,b=to.value;if(origins.includes(b)){from.value=b;syncTo();if([...to.options].some(o=>o.value===a))to.value=a;}void loadWeather(from.value,form.querySelector('[data-weather-from]'));void loadWeather(to.value,form.querySelector('[data-weather-to]'));});
  document.querySelectorAll('[data-home-trip]').forEach(button=>button.addEventListener('click',()=>{trip=button.dataset.homeTrip;document.querySelectorAll('[data-home-trip]').forEach(x=>x.classList.toggle('active',x===button));retWrap.hidden=trip==='oneway';ret.required=trip==='round';}));
  form.addEventListener('submit',event=>{event.preventDefault();const url=new URL(H('book-your-journey/'));url.searchParams.set('from',from.value);url.searchParams.set('to',to.value);url.searchParams.set('departure',depart.value);url.searchParams.set('trip',trip);url.searchParams.set('passengers',form.querySelector('[data-home-passengers]').value||'1');if(trip==='round')url.searchParams.set('return',ret.value);location.href=url.href;});
}

function removeAllServicesSection(){
  if(document.body.dataset.page!=='home')return;document.querySelectorAll('.service-directory').forEach(directory=>directory.closest('.content-section')?.remove());
}
function emailModalHTML(){return `<div class="email-modal-v3" data-email-modal hidden><section class="email-dialog-v3" role="dialog" aria-modal="true" aria-labelledby="emailDialogV3"><button class="close" type="button" data-email-close aria-label="${L('닫기','Close')}">×</button><h2 id="emailDialogV3">${L('이메일 문의 전 안내사항','Before emailing us')}</h2><div class="email-guide-v3"><article><strong>${L('이메일은 순차적으로 확인합니다.','Email inquiries are reviewed in order.')}</strong><span>${L('답변에는 영업일 기준 3~7일이 소요될 수 있습니다.','A response may take 3–7 business days.')}</span></article><article><strong>${L('예약 변경 및 취소','Booking changes and cancellations')}</strong><span>${L('웹사이트에서 직접 처리 가능한 예약은 예약 조회 메뉴를 먼저 이용해 주세요.','Please use Manage Booking first when your reservation can be changed online.')}</span></article><article><strong>${L('운항 관련 문의','Flight-related questions')}</strong><span>${L('지연·결항·운항 변경은 운항 정보와 공지사항의 최신 내용을 먼저 확인해 주세요.','For delays, cancellations and schedule changes, check Flight Information and Notices first.')}</span></article><article><strong>${L('문의 내용에 포함해 주세요.','Please include')}</strong><span>${L('예약번호가 있다면 예약번호, 탑승자명, 편명과 문의 내용을 함께 적어 주세요.','If available, include your booking reference, passenger name, flight number and question.')}</span></article></div><div class="email-dialog-actions-v3"><button type="button" data-email-close>${L('닫기','Close')}</button><a href="mailto:stellarisairlines@gmail.com?subject=Stellaris%20Airlines%20Inquiry">${L('이메일 문의하기','Send email')}</a></div></section></div>`;}
function installEmailInquiry(){
  if(document.body.dataset.page!=='home'||document.querySelector('[data-email-modal]'))return;
  const footer=document.querySelector('.site-footer');if(!footer)return;
  const section=document.createElement('section');section.className='home-email-section-v3';section.innerHTML=`<div class="shell home-email-card-v3"><div><p class="eyebrow">CUSTOMER SUPPORT</p><h2>${L('이메일 문의','Email inquiry')}</h2><p>${L('예약·서비스 관련 문의 전 안내사항을 확인한 뒤 이메일을 보내실 수 있습니다.','Review the guidance before sending a booking or service inquiry.')}</p></div><button class="btn btn-dark" type="button" data-email-open>${L('이메일 문의하기','Email us')}</button></div>`;footer.before(section);document.body.insertAdjacentHTML('beforeend',emailModalHTML());
  const modal=document.querySelector('[data-email-modal]');document.querySelector('[data-email-open]').addEventListener('click',()=>{modal.hidden=false;document.body.style.overflow='hidden';});modal.querySelectorAll('[data-email-close]').forEach(btn=>btn.addEventListener('click',()=>{modal.hidden=true;document.body.style.overflow='';}));modal.addEventListener('click',event=>{if(event.target===modal){modal.hidden=true;document.body.style.overflow='';}});
}

function stripVisibleContactEmail(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())){if(node.parentElement?.closest('.email-modal-v3'))continue;const value=node.nodeValue||'';if(/contact\.?\s*stellarisairlines@gmail\.com/i.test(value)||/contect\.?\s*stellarisairlines@gmail\.com/i.test(value))node.nodeValue=value.replace(/con?tact\.?\s*stellarisairlines@gmail\.com/ig,'').trim();}
}

function prefillBookingFromHome(){
  if(document.body.dataset.page!=='book-your-journey')return;const params=new URLSearchParams(location.search);if(!params.has('from')||!params.has('to'))return;
  let tries=0;const run=()=>{const from=document.getElementById('fromInput'),to=document.getElementById('toInput'),depart=document.getElementById('departureDate'),ret=document.getElementById('returnDate'),form=document.getElementById('bookingSearchForm');if(!from||!to||!form||!from.options.length){if(++tries<30)setTimeout(run,120);return;}
    from.value=params.get('from')||from.value;from.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>{to.value=params.get('to')||to.value;if(depart&&params.get('departure'))depart.value=params.get('departure');if(ret&&params.get('return'))ret.value=params.get('return');const trip=params.get('trip')==='oneway'?'oneway':'round';const tab=document.querySelector(`[data-booking-tab="${trip}"]`);tab?.click();form.requestSubmit?.();},100);
  };run();
}

function refresh(){installLanguageToggle();installMegaMenu();installFooter();if(document.body.dataset.page==='home'){removeAllServicesSection();installHomeSearch();installEmailInquiry();}stripVisibleContactEmail();}

ensureStyle();normalizeLanguage();refresh();prefillBookingFromHome();
setTimeout(refresh,250);setTimeout(refresh,1000);
window.addEventListener('stellaris:languagechange',()=>setTimeout(()=>{refresh();if(document.body.dataset.page==='home')location.reload();},0));
