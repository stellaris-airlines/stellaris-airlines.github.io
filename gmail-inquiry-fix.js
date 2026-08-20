const TO='stellarisairlines@gmail.com';
function gmailUrl(){const url=new URL('https://mail.google.com/mail/');url.searchParams.set('view','cm');url.searchParams.set('fs','1');url.searchParams.set('to',TO);url.searchParams.set('su','Stellaris Airlines Inquiry');return url.href;}
function apply(){document.querySelectorAll('.email-dialog-v3 a, a[href^="mailto:stellarisairlines@gmail.com"]').forEach(link=>{if(!/이메일|email/i.test(link.textContent||'')&&!String(link.getAttribute('href')||'').startsWith('mailto:'))return;link.href=gmailUrl();link.target='_blank';link.rel='noopener noreferrer';});}
apply();new MutationObserver(apply).observe(document.body,{childList:true,subtree:true});
