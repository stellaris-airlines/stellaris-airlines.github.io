import { auth } from '../firebase-config.js';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('loginEmail');
const passwordInput = document.getElementById('loginPassword');
const submitButton = document.getElementById('loginSubmit');
const message = document.getElementById('loginMessage');
const signedInPanel = document.getElementById('signedInPanel');
const signedInEmail = document.getElementById('signedInEmail');
const logoutButton = document.getElementById('logoutButton');

const messages = {
  ko: {
    signingIn: '로그인 중입니다…',
    success: '로그인되었습니다. 홈페이지로 이동합니다.',
    missing: '이메일과 비밀번호를 입력해 주세요.',
    invalid: '이메일 또는 비밀번호를 확인해 주세요.',
    disabled: '사용이 중지된 계정입니다.',
    tooMany: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    unavailable: '현재 로그인 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    notEnabled: 'Firebase에서 이메일/비밀번호 로그인을 먼저 활성화해야 합니다.',
    signedIn: '현재 로그인된 계정',
    logout: '로그아웃'
  },
  'en-US': {
    signingIn: 'Signing in…', success: 'Signed in. Redirecting to the homepage.', missing: 'Enter your email and password.', invalid: 'Check your email or password.', disabled: 'This account has been disabled.', tooMany: 'Too many sign-in attempts. Try again later.', unavailable: 'Sign-in is temporarily unavailable. Try again later.', notEnabled: 'Enable Email/Password sign-in in Firebase first.', signedIn: 'Signed-in account', logout: 'Sign out'
  },
  'en-GB': {
    signingIn: 'Signing in…', success: 'Signed in. Redirecting to the homepage.', missing: 'Enter your email and password.', invalid: 'Check your email or password.', disabled: 'This account has been disabled.', tooMany: 'Too many sign-in attempts. Try again later.', unavailable: 'Sign-in is temporarily unavailable. Try again later.', notEnabled: 'Enable Email/Password sign-in in Firebase first.', signedIn: 'Signed-in account', logout: 'Sign out'
  },
  'zh-CN': {
    signingIn: '正在登录…', success: '登录成功，正在返回首页。', missing: '请输入电子邮箱和密码。', invalid: '请检查电子邮箱或密码。', disabled: '此账户已被停用。', tooMany: '登录尝试次数过多，请稍后再试。', unavailable: '登录服务暂时不可用，请稍后再试。', notEnabled: '请先在 Firebase 中启用“电子邮件/密码”登录。', signedIn: '当前登录账户', logout: '退出登录'
  },
  ja: {
    signingIn: 'ログインしています…', success: 'ログインしました。ホームへ移動します。', missing: 'メールアドレスとパスワードを入力してください。', invalid: 'メールアドレスまたはパスワードを確認してください。', disabled: 'このアカウントは無効化されています。', tooMany: 'ログイン試行回数が多すぎます。しばらくしてから再試行してください。', unavailable: '現在ログインサービスを利用できません。しばらくしてから再試行してください。', notEnabled: 'Firebase でメール/パスワード認証を有効にしてください。', signedIn: 'ログイン中のアカウント', logout: 'ログアウト'
  },
  es: {
    signingIn: 'Iniciando sesión…', success: 'Sesión iniciada. Redirigiendo al inicio.', missing: 'Introduce tu correo electrónico y contraseña.', invalid: 'Comprueba tu correo electrónico o contraseña.', disabled: 'Esta cuenta está deshabilitada.', tooMany: 'Demasiados intentos de inicio de sesión. Inténtalo más tarde.', unavailable: 'El inicio de sesión no está disponible temporalmente.', notEnabled: 'Activa el acceso con correo electrónico y contraseña en Firebase.', signedIn: 'Cuenta conectada', logout: 'Cerrar sesión'
  },
  fr: {
    signingIn: 'Connexion…', success: 'Connexion réussie. Redirection vers l’accueil.', missing: 'Saisissez votre adresse e-mail et votre mot de passe.', invalid: 'Vérifiez votre adresse e-mail ou votre mot de passe.', disabled: 'Ce compte est désactivé.', tooMany: 'Trop de tentatives de connexion. Réessayez plus tard.', unavailable: 'La connexion est momentanément indisponible.', notEnabled: 'Activez la connexion E-mail/Mot de passe dans Firebase.', signedIn: 'Compte connecté', logout: 'Se déconnecter'
  }
};

function lang() {
  const value = document.documentElement.lang || 'ko';
  if (value.startsWith('en-GB')) return 'en-GB';
  if (value.startsWith('en')) return 'en-US';
  if (value.startsWith('zh')) return 'zh-CN';
  if (value.startsWith('ja')) return 'ja';
  if (value.startsWith('es')) return 'es';
  if (value.startsWith('fr')) return 'fr';
  return 'ko';
}

function t(key) {
  return (messages[lang()] || messages.ko)[key] || messages.ko[key];
}

function showMessage(text, type = '') {
  if (!message) return;
  message.textContent = text;
  message.className = `auth-message${type ? ` ${type}` : ''}`;
  message.hidden = !text;
}

function setBusy(busy) {
  if (!submitButton) return;
  submitButton.disabled = busy;
  submitButton.setAttribute('aria-busy', String(busy));
}

function mapError(error) {
  switch (error?.code) {
    case 'auth/operation-not-allowed': return t('notEnabled');
    case 'auth/user-disabled': return t('disabled');
    case 'auth/too-many-requests': return t('tooMany');
    case 'auth/network-request-failed': return t('unavailable');
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password': return t('invalid');
    default: return t('unavailable');
  }
}

await setPersistence(auth, browserLocalPersistence);

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value || '';
    if (!email || !password) {
      showMessage(t('missing'), 'error');
      return;
    }
    setBusy(true);
    showMessage(t('signingIn'), 'working');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showMessage(t('success'), 'success');
      window.setTimeout(() => window.location.assign('../'), 650);
    } catch (error) {
      showMessage(mapError(error), 'error');
      setBusy(false);
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (!signedInPanel || !form) return;
  if (user) {
    form.hidden = true;
    signedInPanel.hidden = false;
    if (signedInEmail) signedInEmail.textContent = user.email || user.uid;
    const label = signedInPanel.querySelector('[data-auth-label]');
    if (label) label.textContent = t('signedIn');
    if (logoutButton) logoutButton.textContent = t('logout');
  } else {
    form.hidden = false;
    signedInPanel.hidden = true;
  }
});

logoutButton?.addEventListener('click', async () => {
  await signOut(auth);
  showMessage('', '');
  emailInput?.focus();
});
