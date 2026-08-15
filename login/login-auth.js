import { auth, db } from '../firebase-config.js';
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const area = document.getElementById('loginArea');
const form = document.getElementById('loginForm');
const emailInput = document.getElementById('loginEmail');
const passwordInput = document.getElementById('loginPassword');
const submitButton = document.getElementById('loginSubmit');
const googleButton = document.getElementById('googleLoginButton');
const resetButton = document.getElementById('resetPasswordButton');
const message = document.getElementById('loginMessage');
const signedInPanel = document.getElementById('signedInPanel');
const signedInEmail = document.getElementById('signedInEmail');
const logoutButton = document.getElementById('logoutButton');

const messages = {
  ko: {
    signingIn: '로그인 중입니다…', google: 'Google 계정에 연결하고 있습니다…', success: '로그인되었습니다. 홈페이지로 이동합니다.', missing: '이메일과 비밀번호를 입력해 주세요.', emailRequired: '비밀번호 재설정 이메일을 받을 주소를 입력해 주세요.', resetSent: '비밀번호 재설정 이메일을 보냈습니다.', invalid: '이메일 또는 비밀번호를 확인해 주세요.', disabled: '사용이 중지된 계정입니다.', tooMany: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.', popupClosed: 'Google 로그인 창이 닫혔습니다.', popupBlocked: '브라우저에서 Google 로그인 팝업을 허용해 주세요.', unauthorized: 'Firebase 허용 도메인에 현재 사이트를 추가해야 합니다.', unavailable: '현재 로그인 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.', notEnabled: 'Firebase에서 해당 로그인 방식을 먼저 활성화해야 합니다.', profileFailed: '회원 프로필을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.', signedIn: '현재 로그인된 계정', logout: '로그아웃'
  },
  'en-US': {
    signingIn: 'Signing in…', google: 'Connecting to Google…', success: 'Signed in. Redirecting to the homepage.', missing: 'Enter your email and password.', emailRequired: 'Enter the email address for the password reset.', resetSent: 'A password reset email has been sent.', invalid: 'Check your email or password.', disabled: 'This account has been disabled.', tooMany: 'Too many sign-in attempts. Try again later.', popupClosed: 'The Google sign-in window was closed.', popupBlocked: 'Allow Google sign-in pop-ups in your browser.', unauthorized: 'Add this website to Firebase Authorized domains.', unavailable: 'Sign-in is temporarily unavailable. Try again later.', notEnabled: 'Enable this sign-in method in Firebase first.', profileFailed: 'We could not verify your member profile. Try again.', signedIn: 'Signed-in account', logout: 'Sign out'
  },
  'en-GB': {
    signingIn: 'Signing in…', google: 'Connecting to Google…', success: 'Signed in. Redirecting to the homepage.', missing: 'Enter your email and password.', emailRequired: 'Enter the email address for the password reset.', resetSent: 'A password reset email has been sent.', invalid: 'Check your email or password.', disabled: 'This account has been disabled.', tooMany: 'Too many sign-in attempts. Try again later.', popupClosed: 'The Google sign-in window was closed.', popupBlocked: 'Allow Google sign-in pop-ups in your browser.', unauthorized: 'Add this website to Firebase Authorised domains.', unavailable: 'Sign-in is temporarily unavailable. Try again later.', notEnabled: 'Enable this sign-in method in Firebase first.', profileFailed: 'We could not verify your member profile. Try again.', signedIn: 'Signed-in account', logout: 'Sign out'
  },
  'zh-CN': {
    signingIn: '正在登录…', google: '正在连接 Google…', success: '登录成功，正在返回首页。', missing: '请输入电子邮箱和密码。', emailRequired: '请输入接收密码重置邮件的邮箱。', resetSent: '密码重置邮件已发送。', invalid: '请检查电子邮箱或密码。', disabled: '此账户已被停用。', tooMany: '登录尝试次数过多，请稍后再试。', popupClosed: 'Google 登录窗口已关闭。', popupBlocked: '请允许浏览器显示 Google 登录弹窗。', unauthorized: '请将本站加入 Firebase 授权域名。', unavailable: '登录服务暂时不可用，请稍后再试。', notEnabled: '请先在 Firebase 中启用此登录方式。', profileFailed: '无法确认会员资料，请稍后重试。', signedIn: '当前登录账户', logout: '退出登录'
  },
  ja: {
    signingIn: 'ログインしています…', google: 'Google に接続しています…', success: 'ログインしました。ホームへ移動します。', missing: 'メールアドレスとパスワードを入力してください。', emailRequired: 'パスワード再設定メールを受け取るアドレスを入力してください。', resetSent: 'パスワード再設定メールを送信しました。', invalid: 'メールアドレスまたはパスワードを確認してください。', disabled: 'このアカウントは無効化されています。', tooMany: 'ログイン試行回数が多すぎます。', popupClosed: 'Google ログイン画面が閉じられました。', popupBlocked: 'Google ログインのポップアップを許可してください。', unauthorized: 'Firebase の承認済みドメインにこのサイトを追加してください。', unavailable: '現在ログインサービスを利用できません。', notEnabled: 'Firebase でこのログイン方法を有効にしてください。', profileFailed: '会員プロフィールを確認できませんでした。', signedIn: 'ログイン中のアカウント', logout: 'ログアウト'
  },
  es: {
    signingIn: 'Iniciando sesión…', google: 'Conectando con Google…', success: 'Sesión iniciada. Redirigiendo al inicio.', missing: 'Introduce tu correo y contraseña.', emailRequired: 'Introduce el correo para restablecer la contraseña.', resetSent: 'Se ha enviado el correo de restablecimiento.', invalid: 'Comprueba tu correo o contraseña.', disabled: 'Esta cuenta está deshabilitada.', tooMany: 'Demasiados intentos. Inténtalo más tarde.', popupClosed: 'Se cerró la ventana de Google.', popupBlocked: 'Permite las ventanas emergentes de Google.', unauthorized: 'Añade este sitio a los dominios autorizados de Firebase.', unavailable: 'El acceso no está disponible temporalmente.', notEnabled: 'Activa este método de acceso en Firebase.', profileFailed: 'No se pudo verificar el perfil.', signedIn: 'Cuenta conectada', logout: 'Cerrar sesión'
  },
  fr: {
    signingIn: 'Connexion…', google: 'Connexion à Google…', success: 'Connexion réussie. Redirection vers l’accueil.', missing: 'Saisissez votre adresse e-mail et votre mot de passe.', emailRequired: 'Saisissez l’adresse qui recevra l’e-mail de réinitialisation.', resetSent: 'L’e-mail de réinitialisation a été envoyé.', invalid: 'Vérifiez votre adresse e-mail ou votre mot de passe.', disabled: 'Ce compte est désactivé.', tooMany: 'Trop de tentatives. Réessayez plus tard.', popupClosed: 'La fenêtre Google a été fermée.', popupBlocked: 'Autorisez les fenêtres Google dans votre navigateur.', unauthorized: 'Ajoutez ce site aux domaines autorisés Firebase.', unavailable: 'La connexion est momentanément indisponible.', notEnabled: 'Activez cette méthode de connexion dans Firebase.', profileFailed: 'Impossible de vérifier le profil.', signedIn: 'Compte connecté', logout: 'Se déconnecter'
  }
};

function language() {
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
  return (messages[language()] || messages.ko)[key] || messages.ko[key];
}

function showMessage(text, type = '') {
  if (!message) return;
  message.textContent = text;
  message.className = 'auth-message' + (type ? ' ' + type : '');
  message.hidden = !text;
}

function setBusy(busy) {
  [submitButton, googleButton, resetButton].forEach((button) => {
    if (!button) return;
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
  });
}

function safeName(user) {
  return (user.displayName || user.email?.split('@')[0] || 'Stellaris Member').trim().slice(0, 50);
}

async function createProfileIfMissing(user, fallbackProvider) {
  const reference = doc(db, 'users', user.uid);
  const snapshot = await getDoc(reference);
  if (snapshot.exists()) return;
  const profile = {
    email: user.email || '',
    displayName: safeName(user),
    provider: user.providerData?.[0]?.providerId || fallbackProvider,
    role: 'member',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  if (user.photoURL) profile.photoURL = user.photoURL;
  await setDoc(reference, profile);
}

function mapError(error) {
  switch (error?.code) {
    case 'auth/operation-not-allowed': return t('notEnabled');
    case 'auth/user-disabled': return t('disabled');
    case 'auth/too-many-requests': return t('tooMany');
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request': return t('popupClosed');
    case 'auth/popup-blocked': return t('popupBlocked');
    case 'auth/unauthorized-domain': return t('unauthorized');
    case 'auth/network-request-failed': return t('unavailable');
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password': return t('invalid');
    case 'firestoreProfile': return t('profileFailed');
    default: return t('unavailable');
  }
}

function finishSuccess() {
  showMessage(t('success'), 'success');
  window.setTimeout(() => window.location.assign('../'), 700);
}

await setPersistence(auth, browserLocalPersistence);

form?.addEventListener('submit', async (event) => {
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
    const credential = await signInWithEmailAndPassword(auth, email, password);
    try {
      await createProfileIfMissing(credential.user, 'password');
    } catch (profileError) {
      const error = new Error('Profile creation failed');
      error.code = 'firestoreProfile';
      throw error;
    }
    finishSuccess();
  } catch (error) {
    showMessage(mapError(error), 'error');
    setBusy(false);
  }
});

googleButton?.addEventListener('click', async () => {
  setBusy(true);
  showMessage(t('google'), 'working');
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    try {
      await createProfileIfMissing(result.user, 'google.com');
    } catch (profileError) {
      await signOut(auth).catch(() => {});
      const error = new Error('Profile creation failed');
      error.code = 'firestoreProfile';
      throw error;
    }
    finishSuccess();
  } catch (error) {
    showMessage(mapError(error), 'error');
    setBusy(false);
  }
});

resetButton?.addEventListener('click', async () => {
  const email = emailInput?.value.trim() || '';
  if (!email) {
    showMessage(t('emailRequired'), 'error');
    emailInput?.focus();
    return;
  }
  setBusy(true);
  showMessage(t('signingIn'), 'working');
  try {
    await sendPasswordResetEmail(auth, email);
    showMessage(t('resetSent'), 'success');
  } catch (error) {
    showMessage(mapError(error), 'error');
  } finally {
    setBusy(false);
  }
});

onAuthStateChanged(auth, (user) => {
  if (!area || !signedInPanel) return;
  if (user) {
    area.hidden = true;
    signedInPanel.hidden = false;
    if (signedInEmail) signedInEmail.textContent = user.displayName || user.email || user.uid;
    const label = signedInPanel.querySelector('[data-auth-label]');
    if (label) label.textContent = t('signedIn');
    if (logoutButton) logoutButton.textContent = t('logout');
  } else {
    area.hidden = false;
    signedInPanel.hidden = true;
  }
});

logoutButton?.addEventListener('click', async () => {
  await signOut(auth);
  showMessage('');
  emailInput?.focus();
});
