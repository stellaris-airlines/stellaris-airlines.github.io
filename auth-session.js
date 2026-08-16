import { auth } from './firebase-config.js';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const guestElements = () => document.querySelectorAll('[data-auth-guest]');
const userElements = () => document.querySelectorAll('[data-auth-user]');
const logoutElements = () => document.querySelectorAll('[data-auth-logout]');

const accountLabels = {
  ko: {
    starMiles: '내 Star Miles 보기',
    logout: '로그아웃'
  },
  'en-US': {
    starMiles: 'View my Star Miles',
    logout: 'Log out'
  },
  'en-GB': {
    starMiles: 'View my Star Miles',
    logout: 'Log out'
  },
  'zh-CN': {
    starMiles: '查看我的 Star Miles',
    logout: '退出登录'
  },
  ja: {
    starMiles: 'Star Milesを確認',
    logout: 'ログアウト'
  },
  es: {
    starMiles: 'Ver mis Star Miles',
    logout: 'Cerrar sesión'
  },
  fr: {
    starMiles: 'Voir mes Star Miles',
    logout: 'Se déconnecter'
  }
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

  logoutElements().forEach((element) => {
    element.textContent = labels.logout;
  });
}

function renderGuest() {
  guestElements().forEach((element) => { element.hidden = false; });
  userElements().forEach((element) => { element.hidden = true; });
  logoutElements().forEach((element) => { element.hidden = true; });
  translateAccountNavigation();
}

function renderUser(user) {
  guestElements().forEach((element) => { element.hidden = true; });
  userElements().forEach((element) => {
    element.hidden = false;
    element.textContent = user.displayName || user.email || 'Stellaris Member';
  });
  logoutElements().forEach((element) => { element.hidden = false; });
  translateAccountNavigation();
}

translateAccountNavigation();
window.addEventListener('stellaris:languagechange', (event) => {
  translateAccountNavigation(event.detail?.language || currentLanguage());
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
