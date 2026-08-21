const isAdminPage=document.body?.dataset?.page==='admin';

if(!isAdminPage){
  await import('./site-v3.js?v=20260821-site-v3-6');
  await import('./hero-reset.js?v=20260820-hero-reset-v2');
  await import('./gmail-inquiry-fix.js?v=20260820-gmail-v1');
  await import('./legacy-popup-kill.js?v=20260820-legacy-popup-v1');
  await import('./home-popup.js?v=20260821-home-popup-v4');
}
