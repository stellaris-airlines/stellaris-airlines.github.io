import { auth, db } from '../firebase-config.js';
import { collection, getDocs, query, serverTimestamp, updateDoc, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const issueButton=document.querySelector('[data-issue-ticket]');
const modal=document.querySelector('[data-payment-sim-modal]');
const summary=document.querySelector('[data-payment-sim-summary]');
const method=document.querySelector('[data-payment-sim-method]');
const errorBox=document.querySelector('[data-payment-sim-error]');
const ticketModal=document.querySelector('[data-ticket-modal]');
const note=document.querySelector('[data-demo-payment-note]');
const approveButton=document.querySelector('[data-payment-sim-approve]');
const declineButton=document.querySelector('[data-payment-sim-decline]');
const bookingMessage=document.querySelector('[data-booking-message]');
const closeButtons=[...document.querySelectorAll('[data-payment-sim-close]')];

const I18N={
  ko:{title:'가상 결제',eyebrow:'DEMO PAYMENT',warning:'이 결제 단계는 시뮬레이션입니다. 실제 결제가 발생하지 않으며 실제 카드·계좌 정보를 입력하지 않습니다.',note:'발권 전 가상 결제 승인이 필요합니다. 실제 금전 거래는 발생하지 않습니다.',method:'가상 결제 수단',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'가상 결제 승인',processing:'승인 완료 · 발권 처리 중…',decline:'승인 거절 테스트',declined:'가상 결제가 거절되었습니다. 다시 승인하면 발권을 계속할 수 있습니다.',login:'발권하려면 먼저 로그인해 주세요.',timeout:'발권 응답이 지연되고 있습니다. 로그인 상태와 Firestore Rules를 확인한 뒤 다시 시도해 주세요.',failed:'발권에 실패했습니다. 아래 오류를 확인한 뒤 다시 시도해 주세요.',secure:'저장되는 정보는 paid-demo 상태와 가상 결제 수단뿐이며 카드번호·CVC·계좌번호 등 민감정보는 수집하지 않습니다.',summary:'결제 예정 예약',close:'닫기'},
  'en-US':{title:'Demo payment',eyebrow:'DEMO PAYMENT',warning:'This is a payment simulation. No real charge is made and no real card or bank details are requested.',note:'A demo payment approval is required before ticketing. No real money is charged.',method:'Demo payment method',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'Approve demo payment',processing:'Approved · issuing ticket…',decline:'Test decline',declined:'The demo payment was declined. Approve it to continue ticketing.',login:'Sign in before issuing the ticket.',timeout:'Ticketing is taking longer than expected. Check your sign-in state and Firestore Rules, then try again.',failed:'Ticketing failed. Review the error below and try again.',secure:'Only the paid-demo status and demo payment method are stored. Card numbers, CVCs and bank account details are never collected.',summary:'Booking to be paid',close:'Close'},
  'en-GB':null,
  'zh-CN':{title:'模拟支付',eyebrow:'DEMO PAYMENT',warning:'这是模拟支付，不会产生真实扣款，也不会要求真实银行卡或账户信息。',note:'出票前需要完成模拟支付授权，不会发生真实资金交易。',method:'模拟支付方式',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'批准模拟支付',processing:'已批准 · 正在出票…',decline:'测试拒绝',declined:'模拟支付已被拒绝。批准后可继续出票。',login:'请先登录后再出票。',timeout:'出票响应延迟。请检查登录状态和 Firestore Rules 后重试。',failed:'出票失败。请查看下方错误后重试。',secure:'仅保存 paid-demo 状态和模拟支付方式，不收集卡号、CVC 或银行账户等敏感信息。',summary:'待支付预订',close:'关闭'},
  ja:{title:'デモ決済',eyebrow:'DEMO PAYMENT',warning:'これは決済シミュレーションです。実際の請求は行われず、実在するカード・口座情報も入力しません。',note:'発券前にデモ決済の承認が必要です。実際の金銭取引は発生しません。',method:'デモ決済方法',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'デモ決済を承認',processing:'承認済み · 発券処理中…',decline:'拒否をテスト',declined:'デモ決済が拒否されました。承認すると発券を続行できます。',login:'発券するには先にログインしてください。',timeout:'発券処理が遅延しています。ログイン状態と Firestore Rules を確認して再試行してください。',failed:'発券に失敗しました。下のエラーを確認して再試行してください。',secure:'保存されるのは paid-demo 状態とデモ決済方法のみです。カード番号、CVC、口座番号などの機密情報は収集しません。',summary:'決済予定の予約',close:'閉じる'},
  es:{title:'Pago de demostración',eyebrow:'DEMO PAYMENT',warning:'Este pago es una simulación. No se realiza ningún cargo real ni se solicitan datos reales de tarjeta o cuenta.',note:'Se requiere una aprobación de pago de demostración antes de emitir el billete. No se cobra dinero real.',method:'Método de pago de demostración',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'Aprobar pago demo',processing:'Aprobado · emitiendo billete…',decline:'Probar rechazo',declined:'El pago de demostración fue rechazado. Apruébalo para continuar con la emisión.',login:'Inicia sesión antes de emitir el billete.',timeout:'La emisión está tardando más de lo esperado. Comprueba la sesión y las reglas de Firestore e inténtalo de nuevo.',failed:'La emisión ha fallado. Revisa el error de abajo e inténtalo de nuevo.',secure:'Solo se guardan el estado paid-demo y el método de demostración. Nunca se recopilan números de tarjeta, CVC ni cuentas bancarias.',summary:'Reserva pendiente de pago',close:'Cerrar'},
  fr:{title:'Paiement de démonstration',eyebrow:'DEMO PAYMENT',warning:'Ce paiement est une simulation. Aucun débit réel n’est effectué et aucune donnée bancaire réelle n’est demandée.',note:'Une validation de paiement démo est requise avant l’émission. Aucun argent réel n’est débité.',method:'Mode de paiement démo',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'Valider le paiement démo',processing:'Validé · émission en cours…',decline:'Tester un refus',declined:'Le paiement de démonstration a été refusé. Validez-le pour poursuivre l’émission.',login:'Connectez-vous avant d’émettre le billet.',timeout:'L’émission prend plus de temps que prévu. Vérifiez la connexion et les règles Firestore puis réessayez.',failed:'L’émission a échoué. Consultez l’erreur ci-dessous puis réessayez.',secure:'Seuls le statut paid-demo et le mode de paiement démo sont enregistrés. Aucun numéro de carte, CVC ou compte bancaire n’est collecté.',summary:'Réservation à payer',close:'Fermer'}
};
I18N['en-GB']=I18N['en-US'];
const lang=()=>{const code=localStorage.getItem('stellaris-language')||'ko';return I18N[code]?code:'ko';};
const t=key=>I18N[lang()][key];

let currentPayment=null;
let attachedReference='';
let processing=false;
let processingTimer=null;

function syncLanguage(){
  document.querySelector('[data-payment-sim-eyebrow]')?.replaceChildren(document.createTextNode(t('eyebrow')));
  document.querySelector('[data-payment-sim-title]')?.replaceChildren(document.createTextNode(t('title')));
  document.querySelector('[data-payment-sim-warning]')?.replaceChildren(document.createTextNode(t('warning')));
  document.querySelector('[data-payment-sim-method-label]')?.replaceChildren(document.createTextNode(t('method')));
  if(approveButton&&!processing)approveButton.textContent=t('approve');
  if(declineButton)declineButton.textContent=t('decline');
  document.querySelector('[data-payment-sim-secure]')?.replaceChildren(document.createTextNode(t('secure')));
  document.querySelector('[data-payment-sim-summary-label]')?.replaceChildren(document.createTextNode(t('summary')));
  closeButtons.forEach(el=>el.setAttribute('aria-label',t('close')));
  if(note)note.textContent=t('note');
  if(method){
    [...method.options].forEach(option=>{
      if(option.value==='demo-card')option.textContent=t('card');
      if(option.value==='demo-bank')option.textContent=t('bank');
      if(option.value==='demo-wallet')option.textContent=t('wallet');
    });
  }
}

function setProcessing(value){
  processing=value;
  if(approveButton){
    approveButton.disabled=value;
    approveButton.textContent=value?t('processing'):t('approve');
  }
  if(declineButton)declineButton.disabled=value;
  if(method)method.disabled=value;
  closeButtons.forEach(button=>{button.disabled=value;});
}

function clearProcessingTimer(){
  if(processingTimer){
    clearTimeout(processingTimer);
    processingTimer=null;
  }
}

function showPaymentError(text){
  if(!errorBox)return;
  errorBox.textContent=text;
  errorBox.hidden=false;
}

function resetIssueFlags(){
  if(!issueButton)return;
  delete issueButton.dataset.demoPaymentReady;
  delete issueButton.dataset.passengerManifestReady;
}

function finishFailure(detail=''){
  clearProcessingTimer();
  setProcessing(false);
  resetIssueFlags();
  const clean=String(detail||'').trim();
  showPaymentError(clean?`${t('failed')} ${clean}`:t('failed'));
  if(modal?.hidden){
    modal.hidden=false;
    document.body.classList.add('payment-sim-open');
  }
}

function finishSuccess(){
  clearProcessingTimer();
  setProcessing(false);
  resetIssueFlags();
  closePayment(true);
}

function openPayment(){
  syncLanguage();
  if(summary){
    const bookingSummary=document.querySelector('[data-booking-summary]')?.innerText?.trim()||'';
    summary.textContent=bookingSummary;
  }
  if(errorBox){errorBox.hidden=true;errorBox.textContent='';}
  setProcessing(false);
  modal.hidden=false;
  document.body.classList.add('payment-sim-open');
}

function closePayment(force=false){
  if(processing&&!force)return;
  modal.hidden=true;
  document.body.classList.remove('payment-sim-open');
}

function makeDemoReference(){
  const bytes=new Uint8Array(5);crypto.getRandomValues(bytes);
  return 'DEMO-'+[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
}

function saveLocalPayment(reference,payload){
  try{
    const list=JSON.parse(localStorage.getItem('stellaris-bookings-v1')||'[]');
    const index=list.findIndex(item=>item.bookingRef===reference);
    if(index<0)return;
    list[index]={...list[index],...payload,paymentUpdatedAt:new Date().toISOString()};
    localStorage.setItem('stellaris-bookings-v1',JSON.stringify(list));
  }catch(error){}
}

async function attachPayment(reference){
  const user=auth.currentUser;
  if(!user||!reference||!currentPayment||attachedReference===reference)return;
  const payload={
    paymentStatus:'paid-demo',
    paymentMethod:currentPayment.method,
    paymentMode:'simulation',
    paymentReference:currentPayment.reference,
    paymentUpdatedAt:serverTimestamp()
  };
  try{
    const snapshot=await getDocs(query(collection(db,'bookings'),where('userId','==',user.uid),where('bookingRef','==',reference)));
    const booking=snapshot.docs[0];
    if(!booking)return;
    await updateDoc(booking.ref,payload);
    attachedReference=reference;
    saveLocalPayment(reference,{paymentStatus:'paid-demo',paymentMethod:currentPayment.method,paymentMode:'simulation',paymentReference:currentPayment.reference});
  }catch(error){
    console.warn('Demo payment status could not be attached to booking.',error);
  }
}

function syncIssuedBooking(){
  if(!ticketModal||ticketModal.hidden)return;
  const reference=document.querySelector('[data-ticket-ref]')?.textContent?.trim()||'';
  if(reference)void attachPayment(reference);
  if(processing)finishSuccess();
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-issue-ticket]');
  if(!button||button.dataset.demoPaymentReady==='true')return;
  const confirm=document.querySelector('[data-booking-confirm]');
  if(confirm?.hidden)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(!auth.currentUser){
    openPayment();
    showPaymentError(t('login'));
    return;
  }
  openPayment();
},true);

closeButtons.forEach(button=>button.addEventListener('click',()=>closePayment()));
modal?.addEventListener('click',event=>{if(event.target===modal)closePayment();});
declineButton?.addEventListener('click',()=>{
  if(errorBox){errorBox.textContent=t('declined');errorBox.hidden=false;}
});

approveButton?.addEventListener('click',()=>{
  if(processing)return;
  if(!auth.currentUser){
    showPaymentError(t('login'));
    return;
  }
  if(!issueButton){
    showPaymentError(t('failed'));
    return;
  }

  currentPayment={status:'paid-demo',method:method?.value||'demo-card',reference:makeDemoReference()};
  window.STELLARIS_DEMO_PAYMENT=currentPayment;
  localStorage.setItem('stellaris-demo-payment-v1',JSON.stringify(currentPayment));
  if(errorBox){errorBox.hidden=true;errorBox.textContent='';}

  setProcessing(true);
  issueButton.dataset.demoPaymentReady='true';
  issueButton.dataset.passengerManifestReady='true';
  issueButton.disabled=false;

  // Keep the approval modal visible while the actual Firestore ticket transaction runs.
  // Using the next task avoids the payment-button event stack and prevents interceptor loops.
  setTimeout(()=>{
    try{
      issueButton.click();
    }catch(error){
      finishFailure(error?.message||'');
    }
  },0);

  processingTimer=setTimeout(()=>{
    if(!processing)return;
    const detail=!bookingMessage?.hidden?bookingMessage.textContent.trim():'';
    if(detail&&bookingMessage.classList.contains('error'))finishFailure(detail);
    else{
      setProcessing(false);
      resetIssueFlags();
      showPaymentError(t('timeout'));
    }
  },15000);
});

if(bookingMessage){
  new MutationObserver(()=>{
    if(!processing||bookingMessage.hidden)return;
    if(bookingMessage.classList.contains('error')){
      finishFailure(bookingMessage.textContent);
    }
  }).observe(bookingMessage,{attributes:true,childList:true,subtree:true,characterData:true});
}

if(ticketModal)new MutationObserver(syncIssuedBooking).observe(ticketModal,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('stellaris:languagechange',syncLanguage);
syncLanguage();
