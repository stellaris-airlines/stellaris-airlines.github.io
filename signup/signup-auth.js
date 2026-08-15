import { auth, db } from '../firebase-config.js';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const area = document.getElementById('signupArea');
const form = document.getElementById('signupForm');
const nameInput = document.getElementById('signupName');
const emailInput = document.getElementById('signupEmail');
const passwordInput = document.getElementById('signupPassword');
const confirmInput = document.getElementById('signupPasswordConfirm');
const submitButton = document.getElementById('signupSubmit');
const googleButton = document.getElementById('googleSignupButton');
const message = document.getElementById('signupMessage');
const signedInPanel = document.getElementById('signupSignedInPanel');
const signedInEmail = document.getElementById('signupSignedInEmail');
const logoutButton = document.getElementById('signupLogoutButton');

const messages = {
  ko: {
    missing: '모든 항목을 입력해 주세요.', nameLength: '이름은 1자 이상 50자 이하로 입력해 주세요.', passwordLength: '비밀번호는 6자 이상 입력해 주세요.', mismatch: '비밀번호 확인이 일치하지 않습니다.', creating: '계정을 만들고 있습니다…', google: 'Google 계정에 연결하고 있습니다…', success: '가입이 완료되었습니다. 홈페이지로 이동합니다.', emailInUse: '이미 가입된 이메일입니다. 로그인해 주세요.', invalidEmail: '올바른 이메일 주소를 입력해 주세요.', weakPassword: '더 안전한 비밀번호를 입력해 주세요.', popupClosed: 'Google 로그인 창이 닫혔습니다.', popupBlocked: '브라우저에서 Google 로그인 팝업을 허용해 주세요.', unauthorized: 'Firebase 허용 도메인에 현재 사이트를 추가해야 합니다.', notEnabled: 'Firebase에서 해당 로그인 방식을 먼저 활성화해야 합니다.', profileFailed: '계정 프로필을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', unavailable: '현재 회원가입 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.', signedIn: '현재 로그인된 계정', logout: '로그아웃'
  },
  'en-US': {
    missing: 'Complete every field.', nameLength: 'Enter a name between 1 and 50 characters.', passwordLength: 'Use at least 6 characters for your password.', mismatch: 'The passwords do not match.', creating: 'Creating your account…', google: 'Connecting to Google…', success: 'Your account is ready. Redirecting to the homepage.', emailInUse: 'This email is already registered. Sign in instead.', invalidEmail: 'Enter a valid email address.', weakPassword: 'Choose a stronger password.', popupClosed: 'The Google sign-in window was closed.', popupBlocked: 'Allow Google sign-in pop-ups in your browser.', unauthorized: 'Add this website to Firebase Authorized domains.', notEnabled: 'Enable this sign-in method in Firebase first.', profileFailed: 'We could not save your account profile. Try again.', unavailable: 'Account creation is temporarily unavailable. Try again later.', signedIn: 'Signed-in account', logout: 'Sign out'
  },
  'en-GB': {
    missing: 'Complete every field.', nameLength: 'Enter a name between 1 and 50 characters.', passwordLength: 'Use at least 6 characters for your password.', mismatch: 'The passwords do not match.', creating: 'Creating your account…', google: 'Connecting to Google…', success: 'Your account is ready. Redirecting to the homepage.', emailInUse: 'This email is already registered. Sign in instead.', invalidEmail: 'Enter a valid email address.', weakPassword: 'Choose a stronger password.', popupClosed: 'The Google sign-in window was closed.', popupBlocked: 'Allow Google sign-in pop-ups in your browser.', unauthorized: 'Add this website to Firebase Authorised domains.', notEnabled: 'Enable this sign-in method in Firebase first.', profileFailed: 'We could not save your account profile. Try again.', unavailable: 'Account creation is temporarily unavailable. Try again later.', signedIn: 'Signed-in account', logout: 'Sign out'
  },
  'zh-CN': {
    missing: '请填写所有项目。', nameLength: '姓名长度应为1至50个字符。', passwordLength: '密码至少需要6个字符。', mismatch: '两次输入的密码不一致。', creating: '正在创建账户…', google: '正在连接 Google…', success: '注册完成，正在返回首页。', emailInUse: '此邮箱已注册，请直接登录。', invalidEmail: '请输入有效的电子邮箱地址。', weakPassword: '请输入更安全的密码。', popupClosed: 'Google 登录窗口已关闭。', popupBlocked: '请允许浏览器显示 Google 登录弹窗。', unauthorized: '请将本站加入 Firebase 授权域名。', notEnabled: '请先在 Firebase 中启用此登录方式。', profileFailed: '无法保存账户资料，请稍后重试。', unavailable: '注册服务暂时不可用，请稍后重试。', signedIn: '当前登录账户', logout: '退出登录'
  },
  ja: {
    missing: 'すべての項目を入力してください。', nameLength: '名前は1文字以上50文字以内で入力してください。', passwordLength: 'パスワードは6文字以上で入力してください。', mismatch: '確認用パスワードが一致しません。', creating: 'アカウントを作成しています…', google: 'Google に接続しています…', success: '登録が完了しました。ホームへ移動します。', emailInUse: 'このメールアドレスは登録済みです。ログインしてください。', invalidEmail: '有効なメールアドレスを入力してください。', weakPassword: 'より安全なパスワードを入力してください。', popupClosed: 'Google ログイン画面が閉じられました。', popupBlocked: 'Google ログインのポップアップを許可してください。', unauthorized: 'Firebase の承認済みドメインにこのサイトを追加してください。', notEnabled: 'Firebase でこのログイン方法を有効にしてください。', profileFailed: 'プロフィールを保存できませんでした。もう一度お試しください。', unavailable: '現在、登録サービスを利用できません。', signedIn: 'ログイン中のアカウント', logout: 'ログアウト'
  },
  es: {
    missing: 'Completa todos los campos.', nameLength: 'Introduce un nombre de entre 1 y 50 caracteres.', passwordLength: 'La contraseña debe tener al menos 6 caracteres.', mismatch: 'Las contraseñas no coinciden.', creating: 'Creando tu cuenta…', google: 'Conectando con Google…', success: 'La cuenta está lista. Redirigiendo al inicio.', emailInUse: 'Este correo ya está registrado. Inicia sesión.', invalidEmail: 'Introduce un correo electrónico válido.', weakPassword: 'Elige una contraseña más segura.', popupClosed: 'Se cerró la ventana de Google.', popupBlocked: 'Permite las ventanas emergentes de Google.', unauthorized: 'Añade este sitio a los dominios autorizados de Firebase.', notEnabled: 'Activa este método de acceso en Firebase.', profileFailed: 'No se pudo guardar el perfil. Inténtalo de nuevo.', unavailable: 'El registro no está disponible temporalmente.', signedIn: 'Cuenta conectada', logout: 'Cerrar sesión'
  },
  fr: {
    missing: 'Remplissez tous les champs.', nameLength: 'Saisissez un nom de 1 à 50 caractères.', passwordLength: 'Le mot de passe doit comporter au moins 6 caractères.', mismatch: 'Les mots de passe ne correspondent pas.', creating: 'Création du compte…', google: 'Connexion à Google…', success: 'Votre compte est prêt. Redirection vers l’accueil.', emailInUse: 'Cette adresse est déjà inscrite. Connectez-vous.', invalidEmail: 'Saisissez une adresse e-mail valide.', weakPassword: 'Choisissez un mot de passe plus sûr.', popupClosed: 'La fenêtre Google a été fermée.', popupBlocked: 'Autorisez les fenêtres Google dans votre navigateur.', unauthorized: 'Ajoutez ce site aux domaines autorisés Firebase.', notEnabled: 'Activez cette méthode de connexion dans Firebase.', profileFailed: 'Impossible d’enregistrer le profil. Réessayez.', unavailable: 'L’inscription est momentanément indisponible.', signedIn: 'Compte connecté', logout: 'Se déconnecter'
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
  [submitButton, googleButton].forEach((button) => {
    if (!button) return;
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
  });
}

function safeName(user, preferredName = '') {
  const fallback = (user.displayName || user.email?.split('@')[0] || 'Stellaris Member').trim();
  return (preferredName.trim() || fallback).slice(0, 50);
}

function providerId(user, fallback = 'password') {
  return user.providerData?.[0]?.providerId || fallback;
}

async function createProfileIfMissing(user, fallbackProvider, preferredName = '') {
  const reference = doc(db, 'users', user.uid);
  const snapshot = await getDoc(reference);
  if (snapshot.exists()) return;
  const profile = {
    email: user.email || '',
    displayName: safeName(user, preferredName),
    provider: providerId(user, fallbackProvider),
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
    case 'auth/email-already-in-use': return t('emailInUse');
    case 'auth/invalid-email': return t('invalidEmail');
    case 'auth/weak-password': return t('weakPassword');
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request': return t('popupClosed');
    case 'auth/popup-blocked': return t('popupBlocked');
    case 'auth/unauthorized-domain': return t('unauthorized');
    case 'auth/operation-not-allowed': return t('notEnabled');
    case 'auth/network-request-failed': return t('unavailable');
    case 'firestoreProfile': return t('profileFailed');
    default: return t('unavailable');
  }
}

function finishSuccess() {
  showMessage(t('success'), 'success');
  window.setTimeout(() => window.location.assign('../'), 800);
}

await setPersistence(auth, browserLocalPersistence);

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const displayName = nameInput?.value.trim() || '';
  const email = emailInput?.value.trim() || '';
  const password = passwordInput?.value || '';
  const confirmation = confirmInput?.value || '';

  if (!displayName || !email || !password || !confirmation) {
    showMessage(t('missing'), 'error');
    return;
  }
  if (displayName.length > 50) {
    showMessage(t('nameLength'), 'error');
    return;
  }
  if (password.length < 6) {
    showMessage(t('passwordLength'), 'error');
    return;
  }
  if (password !== confirmation) {
    showMessage(t('mismatch'), 'error');
    return;
  }

  setBusy(true);
  showMessage(t('creating'), 'working');
  let createdUser = null;
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    createdUser = credential.user;
    await updateProfile(createdUser, { displayName });
    try {
      await createProfileIfMissing(createdUser, 'password', displayName);
    } catch (profileError) {
      await deleteUser(createdUser).catch(() => {});
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
    const info = getAdditionalUserInfo(result);
    try {
      await createProfileIfMissing(result.user, 'google.com');
    } catch (profileError) {
      if (info?.isNewUser) await deleteUser(result.user).catch(() => {});
      else await signOut(auth).catch(() => {});
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
  nameInput?.focus();
});
