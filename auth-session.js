import { auth } from './firebase-config.js';
import './site-content.js?v=20260816-banner-v1';
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
  ko: { starMiles: '내 Star Miles 보기', logout: '로그아웃' },
  'en-US': { starMiles: 'View my Star Miles', logout: 'Log out' },
  'en-GB': { starMiles: 'View my Star Miles', logout: 'Log out' },
  'zh-CN': { starMiles: '查看我的 Star Miles', logout: '退出登录' },
  ja: { starMiles: 'Star Milesを確認', logout: 'ログアウト' },
  es: { starMiles: 'Ver mis Star Miles', logout: 'Cerrar sesión' },
  fr: { starMiles: 'Voir mes Star Miles', logout: 'Se déconnecter' }
};

function currentLanguage() {
  const htmlLang = document.documentElement.lang;
  if (accountLabels[htmlLang]) return htmlLang;
  try {
    const stored = localStorage.getItem('stellaris-language');
    if (accountLabels[stored]) return stored;
  } catch (error) {}
  return 'ko';
}

function translateAccountNavigation(lang = currentLanguage()) {
  const labels = accountLabels[lang] || accountLabels.ko;
  document.querySelectorAll('a[href*="view-my-starmiles/"]').forEach((element) => {
    if (element.hasAttribute('data-auth-user')) return;
    element.textContent = labels.starMiles;
  });
  logoutElements().forEach((element) => { element.textContent = labels.logout; });
}

function rootHref(path='') { return new URL(path, import.meta.url).href; }
function addLinkOnce(host, href, text) {
  if (!host || [...host.querySelectorAll('a')].some(a => a.href === href)) return;
  const link=document.createElement('a');link.href=href;link.textContent=text;host.appendChild(link);
}
function installExtendedNavigation() {
  const seatsHref=rootHref('seats/'),noticesHref=rootHref('notices/');
  const travelMenu=[...document.querySelectorAll('.mega-title strong')].find(el=>el.textContent.trim()==='여행 준비')?.closest('.mega-inner')?.querySelector('.mega-links');
  const supportMenu=[...document.querySelectorAll('.mega-title strong')].find(el=>el.textContent.trim()==='지원 센터')?.closest('.mega-inner')?.querySelector('.mega-links');
  addLinkOnce(travelMenu,seatsHref,'좌석 안내');
  addLinkOnce(supportMenu,noticesHref,'공지사항');
  const mobile=document.getElementById('mobileNav');
  addLinkOnce(mobile,seatsHref,'좌석 안내');
  addLinkOnce(mobile,noticesHref,'공지사항');
  const footerColumns=document.querySelectorAll('.footer-columns>div');
  footerColumns.forEach(column=>{
    const title=column.querySelector('strong')?.textContent.trim();
    if(title==='서비스')addLinkOnce(column,seatsHref,'좌석 안내');
    if(title==='지원')addLinkOnce(column,noticesHref,'공지사항');
  });
  const copyright=document.querySelector('.footer-bottom>span');
  if(copyright)copyright.textContent='ⓒ 2026 STELLARIS AIRLINES. All rights reserved.';
}
function installAdminLink(user){
  document.querySelectorAll('[data-admin-session-link]').forEach(el=>el.remove());
  if(!user||!ADMIN_EMAILS.has(String(user.email||'').toLowerCase()))return;
  const logout=[...logoutElements()][0];
  if(!logout)return;
  const link=document.createElement('a');link.href=rootHref('admin/');link.textContent='관리자';link.dataset.adminSessionLink='true';
  logout.before(link);
}

function renderGuest() {
  guestElements().forEach((element) => { element.hidden = false; });
  userElements().forEach((element) => { element.hidden = true; });
  logoutElements().forEach((element) => { element.hidden = true; });
  installAdminLink(null);translateAccountNavigation();installExtendedNavigation();
}

function renderUser(user) {
  guestElements().forEach((element) => { element.hidden = true; });
  userElements().forEach((element) => {
    element.hidden = false;
    element.textContent = user.displayName || user.email || 'Stellaris Member';
  });
  logoutElements().forEach((element) => { element.hidden = false; });
  installAdminLink(user);translateAccountNavigation();installExtendedNavigation();
}

translateAccountNavigation();
installExtendedNavigation();
window.addEventListener('stellaris:languagechange', (event) => {
  translateAccountNavigation(event.detail?.language || currentLanguage());
  queueMicrotask(installExtendedNavigation);
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
