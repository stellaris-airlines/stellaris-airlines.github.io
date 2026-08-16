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

const COPY={
  ko:{title:'결제 확인',eyebrow:'DEMO CHECKOUT',warning:'테스트용 결제 확인 단계입니다. 실제 결제는 발생하지 않습니다.',note:'결제 확인 후 자동으로 발권을 진행합니다. 실제 금전 거래는 발생하지 않습니다.',method:'확인 방식',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'결제 확인',processing:'결제 처리중…',decline:'취소',login:'발권하려면 먼저 로그인해 주세요.',summary:'예약 확인',secure:'실제 카드번호·CVC·계좌번호는 입력하거나 저장하지 않습니다.',close:'닫기'},
  'en-US':{title:'Confirm payment',eyebrow:'DEMO CHECKOUT',warning:'This is a demo confirmation step. No real payment is made.',note:'Confirm to continue automatically to ticketing. No real money is charged.',method:'Confirmation method',card:'Demo Card',bank:'Demo Bank Transfer',wallet:'Demo Wallet',approve:'Confirm',processing:'Processing…',decline:'Cancel',login:'Sign in before ticketing.',summary:'Booking summary',secure:'No real card, CVC or bank-account details are entered or stored.',close:'Close'}
};
COPY['en-GB']=COPY['en-US'];COPY['zh-CN']=COPY['en-US'];COPY.ja=COPY['en-US'];COPY.es=COPY['en-US'];COPY.fr=COPY['en-US'];
const lang=()=>{const value=localStorage.getItem('stellaris-language')||'ko';return COPY[value]?value:'ko';};
const t=key=>COPY[lang()][key];

let processing=false;
let currentPayment=null;
let attachedReference='';

function syncLanguage(){
  document.querySelector('[data-payment-sim-eyebrow]')?.replaceChildren(document.createTextNode(t('eyebrow')));
  document.querySelector('[data-payment-sim-title]')?.replaceChildren(document.createTextNode(t('title')));
  document.querySelector('[data-payment-sim-warning]')?.replaceChildren(document.createTextNode(t('warning')));
  document.querySelector('[data-payment-sim-method-label]')?.replaceChildren(document.createTextNode(t('method')));
  document.querySelector('[data-payment-sim-summary-label]')?.replaceChildren(document.createTextNode(t('summary')));
  document.querySelector('[data-payment-sim-secure]')?.replaceChildren(document.createTextNode(t('secure')));
  if(note)note.textContent=t('note');
  if(approveButton&&!processing)approveButton.textContent=t('approve');
  if(declineButton)declineButton.textContent=t('decline');
  closeButtons.forEach(button=>button.setAttribute('aria-label',t('close')));
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
  if(approveButton){approveButton.disabled=value;approveButton.textContent=value?t('processing'):t('approve');}
  if(declineButton)declineButton.disabled=value;
  if(method)method.disabled=value;
  closeButtons.forEach(button=>{button.disabled=value;});
}

function showError(text){
  if(!errorBox)return;
  errorBox.textContent=text;
  errorBox.hidden=false;
}

function openPayment(){
  syncLanguage();
  if(summary)summary.textContent=document.querySelector('[data-booking-summary]')?.innerText?.trim()||'';
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

function demoReference(){
  const bytes=new Uint8Array(5);crypto.getRandomValues(bytes);
  return 'DEMO-'+[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('').toUpperCase();
}

function paymentPayload(){
  return {
    paymentStatus:'paid-demo',
    paymentMethod:currentPayment?.method||'demo-card',
    paymentMode:'simulation',
    paymentReference:currentPayment?.reference||'',
    paymentUpdatedAt:serverTimestamp()
  };
}

function saveLocalPayment(reference){
  try{
    const list=JSON.parse(localStorage.getItem('stellaris-bookings-v1')||'[]');
    const index=list.findIndex(item=>item.bookingRef===reference);
    if(index<0)return;
    list[index]={...list[index],paymentStatus:'paid-demo',paymentMethod:currentPayment?.method||'demo-card',paymentMode:'simulation',paymentReference:currentPayment?.reference||'',paymentUpdatedAt:new Date().toISOString()};
    localStorage.setItem('stellaris-bookings-v1',JSON.stringify(list));
  }catch(error){}
}

async function attachPayment(reference){
  const user=auth.currentUser;
  if(!user||!reference||!currentPayment||reference===attachedReference)return;
  try{
    const snapshot=await getDocs(query(collection(db,'bookings'),where('userId','==',user.uid),where('bookingRef','==',reference)));
    const booking=snapshot.docs[0];
    if(!booking)return;
    await updateDoc(booking.ref,paymentPayload());
    attachedReference=reference;
    saveLocalPayment(reference);
  }catch(error){
    console.warn('Demo payment status could not be attached to booking.',error);
  }
}

function issuedReference(){
  if(!ticketModal||ticketModal.hidden)return '';
  return document.querySelector('[data-ticket-ref]')?.textContent?.trim()||'';
}

function finishIssuedBooking(){
  const reference=issuedReference();
  if(reference)void attachPayment(reference);
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-issue-ticket]');
  if(!button||button.dataset.demoPaymentReady==='true')return;
  const confirm=document.querySelector('[data-booking-confirm]');
  if(confirm?.hidden)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if(!auth.currentUser){
    openPayment();
    showError(t('login'));
    return;
  }
  openPayment();
},true);

closeButtons.forEach(button=>button.addEventListener('click',()=>closePayment()));
modal?.addEventListener('click',event=>{if(event.target===modal)closePayment();});
declineButton?.addEventListener('click',()=>closePayment());

approveButton?.addEventListener('click',()=>{
  if(processing)return;
  if(!auth.currentUser){showError(t('login'));return;}
  if(!issueButton){closePayment(true);return;}

  currentPayment={status:'paid-demo',method:method?.value||'demo-card',reference:demoReference()};
  window.STELLARIS_DEMO_PAYMENT=currentPayment;
  localStorage.setItem('stellaris-demo-payment-v1',JSON.stringify(currentPayment));
  if(errorBox){errorBox.hidden=true;errorBox.textContent='';}
  setProcessing(true);

  issueButton.dataset.demoPaymentReady='true';
  issueButton.dataset.passengerManifestReady='true';
  issueButton.disabled=false;

  const issuer=window.STELLARIS_ISSUE_TICKET;
  let ticketingPromise;
  try{
    ticketingPromise=typeof issuer==='function'
      ?Promise.resolve(issuer.call(issueButton))
      :new Promise(resolve=>{issueButton.click();resolve();});
  }catch(error){
    ticketingPromise=Promise.reject(error);
  }

  window.setTimeout(()=>{
    setProcessing(false);
    closePayment(true);
  },1000);

  ticketingPromise.then(()=>{
    delete issueButton.dataset.demoPaymentReady;
    delete issueButton.dataset.passengerManifestReady;
    finishIssuedBooking();
    if(ticketModal&&!ticketModal.hidden)return;
    if(bookingMessage?.classList.contains('error'))bookingMessage.scrollIntoView({behavior:'smooth',block:'center'});
  }).catch(error=>{
    delete issueButton.dataset.demoPaymentReady;
    delete issueButton.dataset.passengerManifestReady;
    console.error('Ticketing failed after checkout confirmation.',error);
    if(bookingMessage){
      bookingMessage.hidden=false;
      bookingMessage.className='booking-message error';
      bookingMessage.textContent='발권 처리에 실패했습니다. 좌석과 로그인 상태를 확인한 뒤 다시 시도해 주세요.';
      bookingMessage.scrollIntoView({behavior:'smooth',block:'center'});
    }
  });
});

if(ticketModal)new MutationObserver(finishIssuedBooking).observe(ticketModal,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('stellaris:languagechange',syncLanguage);
syncLanguage();
