import { auth, db } from '../firebase-config.js';
import { collection, getDocs, query, serverTimestamp, updateDoc, where } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const issueButton=document.querySelector('[data-issue-ticket]');
const modal=document.querySelector('[data-payment-sim-modal]');
const summary=document.querySelector('[data-payment-sim-summary]');
const method=document.querySelector('[data-payment-sim-method]');
const errorBox=document.querySelector('[data-payment-sim-error]');
const ticketModal=document.querySelector('[data-ticket-modal]');
const note=document.querySelector('[data-demo-payment-note]');

const I18N={
  ko:{title:'가상 결제',eyebrow:'DEMO PAYMENT',warning:'이 결제 단계는 시뮬레이션입니다. 실제 결제가 발생하지 않으며 실제 카드·계좌 정보를 입력하지 않습니다.',note:'발권 전 가상 결제 승인이 필요합니다. 실제 금전 거래는 발생하지 않습니다.',method:'가상 결제 수단',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'가상 결제 승인',decline:'승인 거절 테스트',declined:'가상 결제가 거절되었습니다. 다시 승인하면 발권을 계속할 수 있습니다.',secure:'저장되는 정보는 paid-demo 상태와 가상 결제 수단뿐이며 카드번호·CVC·계좌번호 등 민감정보는 수집하지 않습니다.',summary:'결제 예정 예약',close:'닫기'},
  'en-US':{title:'Demo payment',eyebrow:'DEMO PAYMENT',warning:'This is a payment simulation. No real charge is made and no real card or bank details are requested.',note:'A demo payment approval is required before ticketing. No real money is charged.',method:'Demo payment method',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'Approve demo payment',decline:'Test decline',declined:'The demo payment was declined. Approve it to continue ticketing.',secure:'Only the paid-demo status and demo payment method are stored. Card numbers, CVCs and bank account details are never collected.',summary:'Booking to be paid',close:'Close'},
  'en-GB':null,
  'zh-CN':{title:'模拟支付',eyebrow:'DEMO PAYMENT',warning:'这是模拟支付，不会产生真实扣款，也不会要求真实银行卡或账户信息。',note:'出票前需要完成模拟支付授权，不会发生真实资金交易。',method:'模拟支付方式',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'批准模拟支付',decline:'测试拒绝',declined:'模拟支付已被拒绝。批准后可继续出票。',secure:'仅保存 paid-demo 状态和模拟支付方式，不收集卡号、CVC 或银行账户等敏感信息。',summary:'待支付预订',close:'关闭'},
  ja:{title:'デモ決済',eyebrow:'DEMO PAYMENT',warning:'これは決済シミュレーションです。実際の請求は行われず、実在するカード・口座情報も入力しません。',note:'発券前にデモ決済の承認が必要です。実際の金銭取引は発生しません。',method:'デモ決済方法',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'デモ決済を承認',decline:'拒否をテスト',declined:'デモ決済が拒否されました。承認すると発券を続行できます。',secure:'保存されるのは paid-demo 状態とデモ決済方法のみです。カード番号、CVC、口座番号などの機密情報は収集しません。',summary:'決済予定の予約',close:'閉じる'},
  es:{title:'Pago de demostración',eyebrow:'DEMO PAYMENT',warning:'Este pago es una simulación. No se realiza ningún cargo real ni se solicitan datos reales de tarjeta o cuenta.',note:'Se requiere una aprobación de pago de demostración antes de emitir el billete. No se cobra dinero real.',method:'Método de pago de demostración',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'Aprobar pago demo',decline:'Probar rechazo',declined:'El pago de demostración fue rechazado. Apruébalo para continuar con la emisión.',secure:'Solo se guardan el estado paid-demo y el método de demostración. Nunca se recopilan números de tarjeta, CVC ni cuentas bancarias.',summary:'Reserva pendiente de pago',close:'Cerrar'},
  fr:{title:'Paiement de démonstration',eyebrow:'DEMO PAYMENT',warning:'Ce paiement est une simulation. Aucun débit réel n’est effectué et aucune donnée bancaire réelle n’est demandée.',note:'Une validation de paiement démo est requise avant l’émission. Aucun argent réel n’est débité.',method:'Mode de paiement démo',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'Valider le paiement démo',decline:'Tester un refus',declined:'Le paiement de démonstration a été refusé. Validez-le pour poursuivre l’émission.',secure:'Seuls le statut paid-demo et le mode de paiement démo sont enregistrés. Aucun numéro de carte, CVC ou compte bancaire n’est collecté.',summary:'Réservation à payer',close:'Fermer'}
};
I18N['en-GB']=I18N['en-US'];
const lang=()=>{const code=localStorage.getItem('stellaris-language')||'ko';return I18N[code]?code:'ko';};
const t=key=>I18N[lang()][key];

let currentPayment=null;
let attachedReference='';

function syncLanguage(){
  document.querySelector('[data-payment-sim-eyebrow]')?.replaceChildren(document.createTextNode(t('eyebrow')));
  document.querySelector('[data-payment-sim-title]')?.replaceChildren(document.createTextNode(t('title')));
  document.querySelector('[data-payment-sim-warning]')?.replaceChildren(document.createTextNode(t('warning')));
  document.querySelector('[data-payment-sim-method-label]')?.replaceChildren(document.createTextNode(t('method')));
  document.querySelector('[data-payment-sim-approve]')?.replaceChildren(document.createTextNode(t('approve')));
  document.querySelector('[data-payment-sim-decline]')?.replaceChildren(document.createTextNode(t('decline')));
  document.querySelector('[data-payment-sim-secure]')?.replaceChildren(document.createTextNode(t('secure')));
  document.querySelector('[data-payment-sim-summary-label]')?.replaceChildren(document.createTextNode(t('summary')));
  document.querySelectorAll('[data-payment-sim-close]').forEach(el=>el.setAttribute('aria-label',t('close')));
  if(note)note.textContent=t('note');
  if(method){
    [...method.options].forEach(option=>{
      if(option.value==='demo-card')option.textContent=t('card');
      if(option.value==='demo-bank')option.textContent=t('bank');
      if(option.value==='demo-wallet')option.textContent=t('wallet');
    });
  }
}

function openPayment(){
  syncLanguage();
  if(summary){
    const bookingSummary=document.querySelector('[data-booking-summary]')?.innerText?.trim()||'';
    summary.textContent=bookingSummary;
  }
  if(errorBox){errorBox.hidden=true;errorBox.textContent='';}
  modal.hidden=false;
  document.body.classList.add('payment-sim-open');
}
function closePayment(){
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
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-issue-ticket]');
  if(!button||button.dataset.demoPaymentReady==='true')return;
  const confirm=document.querySelector('[data-booking-confirm]');
  if(confirm?.hidden)return;
  event.preventDefault();event.stopImmediatePropagation();
  openPayment();
},true);

document.querySelectorAll('[data-payment-sim-close]').forEach(button=>button.addEventListener('click',closePayment));
modal?.addEventListener('click',event=>{if(event.target===modal)closePayment();});
document.querySelector('[data-payment-sim-decline]')?.addEventListener('click',()=>{
  if(errorBox){errorBox.textContent=t('declined');errorBox.hidden=false;}
});
document.querySelector('[data-payment-sim-approve]')?.addEventListener('click',()=>{
  currentPayment={status:'paid-demo',method:method?.value||'demo-card',reference:makeDemoReference()};
  window.STELLARIS_DEMO_PAYMENT=currentPayment;
  localStorage.setItem('stellaris-demo-payment-v1',JSON.stringify(currentPayment));
  closePayment();
  if(!issueButton)return;

  // Passenger information was already validated before this payment dialog opened.
  // Mark both interceptors ready for the synthetic click so ticketing reaches booking.js
  // instead of reopening this payment dialog after passenger-info.js finishes its async draft save.
  issueButton.dataset.demoPaymentReady='true';
  issueButton.dataset.passengerManifestReady='true';
  issueButton.click();
  queueMicrotask(()=>{
    delete issueButton.dataset.demoPaymentReady;
    delete issueButton.dataset.passengerManifestReady;
  });
});
if(ticketModal)new MutationObserver(syncIssuedBooking).observe(ticketModal,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('stellaris:languagechange',syncLanguage);
syncLanguage();
