import { auth } from './firebase-config.js';
import './auto-translate.js?v=20260820-auto-i18n-v3';
import './site-content.js?v=20260820-site-content-v4';
import './digital-services.js?v=20260817-digital-v2';
import './site-navigation.js?v=20260820-nav-v3';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const guestElements = () => document.querySelectorAll('[data-auth-guest]');
const userElements = () => document.querySelectorAll('[data-auth-user]');
const logoutElements = () => document.querySelectorAll('[data-auth-logout]');
const ADMIN_EMAILS = new Set(['stellarisairlines@gmail.com','stellaris.web.dev@gmail.com']);

const accountLabels = {
  ko: { starMiles: '내 Star Miles 보기', logout: '로그아웃', notices:'공지사항' },
  'en-US': { starMiles: 'View my Star Miles', logout: 'Log out', notices:'Notices' }
};

function currentLanguage() {
  try {
    const stored = localStorage.getItem('stellaris-language');
    if (accountLabels[stored]) return stored;
  } catch (error) {}
  const htmlLang = document.documentElement.lang;
  if (accountLabels[htmlLang]) return htmlLang;
  return 'ko';
}

function translateAccountNavigation(lang = currentLanguage()) {
  const labels = accountLabels[lang] || accountLabels.ko;
  document.querySelectorAll('a[href*="view-my-starmiles/"]').forEach((element) => {
    if (element.hasAttribute('data-auth-user')) return;
    element.textContent = labels.starMiles;
  });
  logoutElements().forEach((element) => { element.textContent = labels.logout; });
  document.querySelectorAll('[data-notice-shortcut]').forEach(element=>{
    element.setAttribute('aria-label',labels.notices);
    element.setAttribute('title',labels.notices);
  });
}

function rootHref(path='') { return new URL(path, import.meta.url).href; }
function addLinkOnce(host, href, text) {
  if (!host || [...host.querySelectorAll('a')].some(a => a.href === href)) return;
  const link=document.createElement('a');link.href=href;link.textContent=text;host.appendChild(link);
}
function installNoticeShortcut(){
  const tools=document.querySelector('.header-tools');
  const language=tools?.querySelector('[data-language-switcher]');
  if(!tools||!language)return;
  let link=tools.querySelector('[data-notice-shortcut]');
  if(!link){
    link=document.createElement('a');
    link.href=rootHref('notices/');
    link.className='notice-shortcut';
    link.dataset.noticeShortcut='true';
    link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 13.5V10a1 1 0 0 1 1-1H8l7-3.5v12L8 14H5.5a1 1 0 0 1-1-1Zm3.5.5 1.2 4.1a1 1 0 0 0 1 .7h1.4l-1.5-4.8M17.5 8.5a4.5 4.5 0 0 1 0 6"/></svg><span class="sr-only">공지사항</span>';
    language.insertAdjacentElement('afterend',link);
  }
  Object.assign(link.style,{display:'inline-flex',alignItems:'center',justifyContent:'center',flex:'0 0 40px',width:'40px',height:'40px'});
  const label=(accountLabels[currentLanguage()]||accountLabels.ko).notices;
  link.setAttribute('aria-label',label);link.setAttribute('title',label);
}
function installExtendedNavigation() {
  const seatsHref=rootHref('seats/');
  const noticesHref=rootHref('notices/');
  const checkinHref=rootHref('check-in/');
  const boardingPassHref=rootHref('boarding-pass/');
  const myPageHref=rootHref('my-page/');
  const travelMenu=[...document.querySelectorAll('.main-nav .nav-item')].find(el=>el.querySelector(':scope > a')?.href===rootHref('travel-info/'))?.querySelector('.mega-links');
  const supportMenu=[...document.querySelectorAll('.main-nav .nav-item')].find(el=>el.querySelector(':scope > a')?.href===rootHref('support/'))?.querySelector('.mega-links');
  addLinkOnce(travelMenu,seatsHref,'좌석 안내');
  addLinkOnce(travelMenu,checkinHref,'온라인 체크인');
  addLinkOnce(travelMenu,boardingPassHref,'모바일 탑승권');
  addLinkOnce(travelMenu,myPageHref,'My Page');
  addLinkOnce(supportMenu,noticesHref,'공지사항');
  const mobile=document.getElementById('mobileNav');
  addLinkOnce(mobile,seatsHref,'좌석 안내');
  addLinkOnce(mobile,checkinHref,'온라인 체크인');
  addLinkOnce(mobile,boardingPassHref,'모바일 탑승권');
  addLinkOnce(mobile,myPageHref,'My Page');
  addLinkOnce(mobile,noticesHref,'공지사항');
  const footerColumns=document.querySelectorAll('.footer-columns>div');
  const services=footerColumns[2],support=footerColumns[3];
  addLinkOnce(services,seatsHref,'좌석 안내');
  addLinkOnce(services,checkinHref,'온라인 체크인');
  addLinkOnce(services,boardingPassHref,'모바일 탑승권');
  addLinkOnce(services,myPageHref,'My Page');
  addLinkOnce(support,noticesHref,'공지사항');
  installNoticeShortcut();
}
function installAdminLink(user){
  document.querySelectorAll('[data-admin-session-link]').forEach(el=>el.remove());
  if(!user||!ADMIN_EMAILS.has(String(user.email||'').toLowerCase()))return;
  const logout=[...logoutElements()][0];
  if(!logout)return;
  const link=document.createElement('a');link.href=rootHref('admin/');link.textContent=currentLanguage()==='en-US'?'Admin':'관리자';link.dataset.adminSessionLink='true';
  logout.before(link);
}

function renderGuest() {
  guestElements().forEach((element) => { element.hidden = false; });
  userElements().forEach((element) => { element.hidden = true; });
  logoutElements().forEach((element) => { element.hidden = true; });
  installAdminLink(null);translateAccountNavigation();installExtendedNavigation();
  queueMicrotask(()=>window.STELLARIS_AUTO_TRANSLATE?.translate?.());
}

function renderUser(user) {
  guestElements().forEach((element) => { element.hidden = true; });
  userElements().forEach((element) => {
    element.hidden = false;
    element.dataset.autoTranslateSkip='true';
    element.textContent = user.displayName || user.email || 'Stellaris Member';
  });
  logoutElements().forEach((element) => { element.hidden = false; });
  document.querySelectorAll('[data-mypage-tool]').forEach(element=>{element.hidden=false;});
  installAdminLink(user);translateAccountNavigation();installExtendedNavigation();
  queueMicrotask(()=>window.STELLARIS_AUTO_TRANSLATE?.translate?.());
}

installExtendedNavigation();
translateAccountNavigation();
const headerHost=document.getElementById('siteHeader')||document.querySelector('.site-header')?.parentElement;
if(headerHost){
  const headerObserver=new MutationObserver(()=>queueMicrotask(installNoticeShortcut));
  headerObserver.observe(headerHost,{childList:true,subtree:true});
}
window.addEventListener('stellaris:languagechange', (event) => {
  translateAccountNavigation(event.detail?.language || currentLanguage());
  queueMicrotask(installExtendedNavigation);
  queueMicrotask(()=>window.STELLARIS_AUTO_TRANSLATE?.translate?.());
});

await setPersistence(auth, browserLocalPersistence);
onAuthStateChanged(auth, (user) => {
  if (user) renderUser(user);
  else renderGuest();
});

logoutElements().forEach((element) => {
  element.addEventListener('click', async (event) => {
    event.preventDefault();
    await signOut(auth);
    window.location.assign(new URL('./', import.meta.url).href);
  });
});
