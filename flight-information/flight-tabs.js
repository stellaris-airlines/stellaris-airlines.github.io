(()=>{
'use strict';
const buttons=[...document.querySelectorAll('[data-flight-tab]')];
const panels=[...document.querySelectorAll('[data-flight-panel]')];
if(!buttons.length||!panels.length)return;

const labels={
  ko:{status:['운항 현황','출발 3시간 전부터 확인'],domestic:['국내선','매일 운항 스케줄'],international:['국제선','공개 정기 운항편']},
  'en-US':{status:['Flight status','From 3 hours before departure'],domestic:['Domestic','Daily timetable'],international:['International','Published scheduled flights']},
  'en-GB':{status:['Flight status','From 3 hours before departure'],domestic:['Domestic','Daily timetable'],international:['International','Published scheduled flights']},
  'zh-CN':{status:['航班状态','起飞前3小时起显示'],domestic:['国内航线','每日航班时刻'],international:['国际航线','已公布定期航班']},
  ja:{status:['運航状況','出発3時間前から表示'],domestic:['国内線','毎日の運航時刻'],international:['国際線','公開定期便']},
  es:{status:['Estado de vuelos','Desde 3 horas antes'],domestic:['Nacional','Horario diario'],international:['Internacional','Vuelos regulares publicados']},
  fr:{status:['Statut des vols','Dès 3 h avant le départ'],domestic:['Domestique','Horaires quotidiens'],international:['International','Vols réguliers publiés']}
};

function updateLabels(){
  const lang=localStorage.getItem('stellaris-language')||'ko';
  const dictionary=labels[lang]||labels.ko;
  buttons.forEach(button=>{
    const [title,subtitle]=dictionary[button.dataset.flightTab]||dictionary.status;
    const titleHost=button.querySelector('.tab-title');
    const subtitleHost=button.querySelector('.tab-subtitle');
    if(titleHost)titleHost.textContent=title;
    if(subtitleHost)subtitleHost.textContent=subtitle;
  });
}

const aliases={domestic:'domestic',international:'international','flight-status':'status',status:'status'};
function select(name,updateHash=false){
  if(!panels.some(panel=>panel.dataset.flightPanel===name))name='status';
  buttons.forEach(button=>{
    const active=button.dataset.flightTab===name;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
    button.tabIndex=active?0:-1;
  });
  panels.forEach(panel=>{panel.hidden=panel.dataset.flightPanel!==name;});
  if(updateHash){
    const hash=name==='status'?'flight-status':name;
    history.replaceState(null,'','#'+hash);
  }
}

buttons.forEach(button=>button.addEventListener('click',()=>select(button.dataset.flightTab,true)));
window.addEventListener('hashchange',()=>select(aliases[location.hash.slice(1)]||'status'));
window.addEventListener('stellaris:languagechange',updateLabels);
updateLabels();
select(aliases[location.hash.slice(1)]||'status');
})();
