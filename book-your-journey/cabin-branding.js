import { FARE_FAMILIES } from '../operations-model.js?v=20260816-live-ticketing-v2';

const select=document.getElementById('cabinClass');
if(select){
  const labels={
    ko:{first:'셀레스티아 퍼스트',business:'아스렐리스 비즈니스',premium:'루미나 프리미엄 이코노미',economy:'노바 이코노미'},
    'en-US':{first:'Celestia First',business:'Astrelis Business',premium:'Lumina Premium Economy',economy:'Nova Economy'},
    'en-GB':{first:'Celestia First',business:'Astrelis Business',premium:'Lumina Premium Economy',economy:'Nova Economy'},
    'zh-CN':{first:'Celestia 头等舱',business:'Astrelis 商务舱',premium:'Lumina 高端经济舱',economy:'Nova 经济舱'},
    ja:{first:'Celestia ファースト',business:'Astrelis ビジネス',premium:'Lumina プレミアムエコノミー',economy:'Nova エコノミー'},
    es:{first:'Celestia First',business:'Astrelis Business',premium:'Lumina Premium Economy',economy:'Nova Economy'},
    fr:{first:'Celestia First',business:'Astrelis Business',premium:'Lumina Premium Economy',economy:'Nova Economy'}
  };
  const language=()=>{const code=localStorage.getItem('stellaris-language')||'ko';return labels[code]?code:'ko'};
  const copyFamilies=list=>list.map(item=>({...item}));
  const originalEconomy=copyFamilies(FARE_FAMILIES.economy);
  const originalBusiness=copyFamilies(FARE_FAMILIES.business);
  const originalFirst=copyFamilies(FARE_FAMILIES.first);
  const novaFamilies=originalEconomy.map(item=>({...item,name:item.id==='economy-saver'?'Nova Economy Saver':item.id==='economy-standard'?'Nova Economy Standard':'Nova Economy Flex'}));
  const astrelisFamilies=originalBusiness.map(item=>({...item,name:item.id==='business-standard'?'Astrelis Business Standard':'Astrelis Business Flex'}));
  const celestiaFamilies=originalFirst.map(item=>({...item,name:item.id==='first-standard'?'Celestia First Standard':'Celestia First Flex'}));
  const luminaFamilies=[
    {id:'premium-standard',cabin:'economy',name:'Lumina Premium Standard',multiplier:1.28,mileageFactor:1.1,seatRule:'standard-included'},
    {id:'premium-flex',cabin:'economy',name:'Lumina Premium Flex',multiplier:1.48,mileageFactor:1.25,seatRule:'all-included'}
  ];

  const first=select.querySelector('option[value="first"]');
  const business=select.querySelector('option[value="business"]');
  let nova=[...select.options].find(option=>option.value==='economy'&&option.dataset.cabinBrand!=='premium');
  if(!nova){nova=document.createElement('option');nova.value='economy';select.appendChild(nova);}
  nova.dataset.cabinBrand='economy';
  let premium=[...select.options].find(option=>option.dataset.cabinBrand==='premium'||option.value==='premium');
  if(!premium){premium=document.createElement('option');select.appendChild(premium);}
  premium.value='economy';premium.dataset.cabinBrand='premium';
  if(first)first.dataset.cabinBrand='first';if(business)business.dataset.cabinBrand='business';
  [first,business,premium,nova].filter(Boolean).forEach(option=>select.appendChild(option));
  if(![...select.options].some(option=>option.selected))nova.selected=true;

  const selectedBrand=()=>select.options[select.selectedIndex]?.dataset.cabinBrand||select.value||'economy';
  function applyFamilies(){
    const brand=selectedBrand();
    FARE_FAMILIES.economy=brand==='premium'?copyFamilies(luminaFamilies):copyFamilies(novaFamilies);
    FARE_FAMILIES.business=copyFamilies(astrelisFamilies);
    FARE_FAMILIES.first=copyFamilies(celestiaFamilies);
    window.STELLARIS_CABIN_BRAND=brand;
  }
  function applyLabels(){
    const map=labels[language()]||labels.ko;
    [...select.options].forEach(option=>{
      const brand=option.dataset.cabinBrand||option.value;
      const next=map[brand];
      if(next&&option.textContent!==next)option.textContent=next;
    });
  }
  function patchDynamic(){
    const brandName={first:'CELESTIA',business:'ASTRELIS',premium:'LUMINA',economy:'NOVA'}[selectedBrand()]||'NOVA';
    document.querySelectorAll('.aircraft-chip,[data-seat-subtitle]').forEach(el=>{
      const current=el.textContent;
      const next=current.replace(/ · (?:[FCY]|CELESTIA|ASTRELIS|LUMINA|NOVA) (?=\d)/,` · ${brandName} `);
      if(next!==current)el.textContent=next;
    });
    document.querySelectorAll('[data-family="premium-standard"] .fare-benefits').forEach(el=>{
      if(el.children.length)return;
      const items=language()==='ko'?['넓은 좌석 서비스','위탁 수하물 포함','우선 탑승']:['Enhanced seat service','Checked baggage included','Priority boarding'];
      el.innerHTML=items.map(item=>`<span>${item}</span>`).join('');
    });
    document.querySelectorAll('[data-family="premium-flex"] .fare-benefits').forEach(el=>{
      if(el.children.length)return;
      const items=language()==='ko'?['Star Miles 125% 기준','좌석 선택 포함','유연한 변경·환불 조건']:['125% Star Miles basis','Seat selection included','Flexible change and refund terms'];
      el.innerHTML=items.map(item=>`<span>${item}</span>`).join('');
    });
  }
  applyFamilies();applyLabels();
  let scheduled=false;
  const schedulePatch=()=>{
    if(scheduled)return;scheduled=true;
    queueMicrotask(()=>{scheduled=false;applyLabels();patchDynamic();});
  };
  const observer=new MutationObserver(schedulePatch);
  observer.observe(document.querySelector('.booking-engine')||document.body,{subtree:true,childList:true,characterData:true});
  select.addEventListener('change',()=>{applyFamilies();schedulePatch();});
  window.addEventListener('stellaris:languagechange',()=>{applyLabels();patchDynamic();});
  schedulePatch();
}
