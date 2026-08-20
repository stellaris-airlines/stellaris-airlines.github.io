import './site-v3.js?v=20260820-site-v3-2';
import './hero-reset.js?v=20260820-hero-reset-v2';
import './gmail-inquiry-fix.js?v=20260820-gmail-v1';
import './home-popup.js?v=20260820-home-popup-v1';

if(!document.querySelector('link[data-site-v3-v2]')){
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL('./site-v3.css?v=20260820-v2',import.meta.url).href;
  link.dataset.siteV3V2='true';
  document.head.appendChild(link);
}
