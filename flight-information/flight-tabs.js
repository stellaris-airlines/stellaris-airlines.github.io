(()=>{
'use strict';
const buttons=[...document.querySelectorAll('[data-flight-tab]')];
const panels=[...document.querySelectorAll('[data-flight-panel]')];
if(!buttons.length||!panels.length)return;
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
select(aliases[location.hash.slice(1)]||'status');
})();