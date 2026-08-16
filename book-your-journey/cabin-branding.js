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
  const current=select.value||'economy';
  let premium=select.querySelector('option[value="premium"]');
  if(!premium){premium=document.createElement('option');premium.value='premium';select.appendChild(premium);}
  const order=['first','business','premium','economy'];
  order.forEach(value=>{const option=select.querySelector(`option[value="${value}"]`);if(option)select.appendChild(option);});
  select.value=current;
  function applyLabels(){
    const map=labels[language()]||labels.ko;
    order.forEach(value=>{const option=select.querySelector(`option[value="${value}"]`);if(option)option.textContent=map[value];});
  }
  function patchDynamic(){
    const brand={first:'CELESTIA',business:'ASTRELIS',premium:'LUMINA',economy:'NOVA'}[select.value]||'NOVA';
    document.querySelectorAll('.aircraft-chip,[data-seat-subtitle]').forEach(el=>{
      if(!el.dataset.cabinOriginal)el.dataset.cabinOriginal=el.textContent;
      const base=el.dataset.cabinOriginal;
      el.textContent=base.replace(/ · [FCY] (?=\d)/,` · ${brand} `);
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
  applyLabels();
  const observer=new MutationObserver(()=>{applyLabels();patchDynamic();});
  observer.observe(document.querySelector('.booking-engine')||document.body,{subtree:true,childList:true,characterData:true});
  select.addEventListener('change',()=>queueMicrotask(patchDynamic));
  window.addEventListener('stellaris:languagechange',()=>{applyLabels();patchDynamic();});
  queueMicrotask(patchDynamic);
}
