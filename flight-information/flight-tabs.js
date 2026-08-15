(()=>{
'use strict';
const buttons=[...document.querySelectorAll('[data-flight-tab]')];
const panels=[...document.querySelectorAll('[data-flight-panel]')];
if(!buttons.length||!panels.length)return;
const labels={ko:['운항 현황','국내선','국제선','화물 항공기'],'en-US':['Flight status','Domestic','International','Cargo'],'en-GB':['Flight status','Domestic','International','Cargo'],'zh-CN':['航班状态','国内航线','国际航线','货运航班'],ja:['運航状況','国内線','国際線','貨物便'],es:['Estado','Nacional','Internacional','Carga'],fr:['Statut','Domestique','International','Fret']};
function updateLabels(){const lang=localStorage.getItem('stellaris-language')||'ko';const names=labels[lang]||labels.ko;buttons.forEach((button,index)=>button.textContent=names[index])}
const aliases={domestic:'domestic',international:'international',cargo:'cargo','flight-status':'status',status:'status'};
function select(name,updateHash=false){
  if(!panels.some(panel=>panel.dataset.flightPanel===name))name='status';
  buttons.forEach(button=>{
    const active=button.dataset.flightTab===name;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
  });
  panels.forEach(panel=>{panel.hidden=panel.dataset.flightPanel!==name});
  if(updateHash){
    const hash=name==='status'?'flight-status':name;
    history.replaceState(null,'','#'+hash);
  }
}
buttons.forEach(button=>button.addEventListener('click',()=>select(button.dataset.flightTab,true)));
window.addEventListener('hashchange',()=>select(aliases[location.hash.slice(1)]||'status'));
updateLabels();
window.addEventListener('stellaris:languagechange',updateLabels);
select(aliases[location.hash.slice(1)]||'status');
})();