import './site-v3.js?v=20260821-site-v3-3';
import './hero-reset.js?v=20260820-hero-reset-v2';
import './gmail-inquiry-fix.js?v=20260820-gmail-v1';
import './legacy-popup-kill.js?v=20260820-legacy-popup-v1';
import './home-popup.js?v=20260821-home-popup-v3';

if(!document.querySelector('link[data-site-v3-v2]')){
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL('./site-v3.css?v=20260821-v3',import.meta.url).href;
  link.dataset.siteV3V2='true';
  document.head.appendChild(link);
}
