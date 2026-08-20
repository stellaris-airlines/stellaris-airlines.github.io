const isHome=document.body.dataset.page==='home'||document.body.classList.contains('page-home');
if(isHome){
  const style=document.createElement('style');
  style.dataset.heroReset='true';
  style.textContent=`
    .page-home .home-hero{min-height:700px!important;padding:92px 0 160px!important}
    .page-home .home-hero-grid{min-height:470px!important}
    .page-home .hero-copy h1{font-size:clamp(54px,6vw,92px)!important;line-height:.98!important}
    .page-home .hero-copy>p{display:block!important;font-size:17px!important;line-height:1.85!important;margin:28px 0 0!important}
    .page-home .hero-actions{margin-top:34px!important}
    .page-home .quick-panel{display:none!important}
    .home-experience-strip,[data-home-experience-strip]{display:none!important}
    @media(max-width:900px){.page-home .home-hero{min-height:560px!important;padding:72px 0 120px!important}.page-home .home-hero-grid{min-height:390px!important}}
    @media(max-width:560px){.page-home .home-hero{min-height:500px!important;padding:62px 0 100px!important}.page-home .hero-copy h1{font-size:clamp(42px,12vw,58px)!important}.page-home .hero-copy>p{font-size:15px!important;line-height:1.75!important}}
  `;
  document.head.appendChild(style);

  const removeBrokenStrip=()=>{
    document.querySelectorAll('.home-experience-strip,[data-home-experience-strip]').forEach(element=>element.remove());
  };
  const resetCopy=()=>{
    let selected='ko';try{selected=localStorage.getItem('stellaris-language')==='en-US'?'en-US':'ko';}catch(error){}
    if(selected!=='ko')return;
    const title=document.querySelector('.home-hero .hero-copy h1');
    const body=document.querySelector('.home-hero .hero-copy > p:not(.eyebrow)');
    if(title&&title.textContent.replace(/\s+/g,' ').trim()!=='Connecting the Stars, Connecting the World.')title.innerHTML='Connecting the Stars,<br>Connecting the World.';
    const original='대한민국에서 시작해 세계를 연결합니다. 합리적인 운임과 편안한 서비스, 그리고 승객이 직접 선택하는 여행 경험을 제공합니다.';
    if(body&&body.textContent.trim()!==original)body.textContent=original;
  };
  const restore=()=>{removeBrokenStrip();resetCopy();};
  restore();setTimeout(restore,250);setTimeout(restore,1200);
  const observer=new MutationObserver(()=>removeBrokenStrip());
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('stellaris:languagechange',event=>{removeBrokenStrip();if(event.detail?.language==='ko')setTimeout(resetCopy,0);});
}
