import { CARGO_ROUTES, cargoAssignment, dateISO } from '../operations-model.js';
const host=document.querySelector('[data-cargo-schedule]');
const TEXT={
ko:{outbound:'OUTBOUND',return:'RETURN',load:'예상 적재율',tonnes:'예상 화물',aircraft:'배정 기종'},
'en-US':{outbound:'OUTBOUND',return:'RETURN',load:'Predicted load',tonnes:'Forecast cargo',aircraft:'Assigned aircraft'},
'en-GB':{outbound:'OUTBOUND',return:'RETURN',load:'Predicted load',tonnes:'Forecast cargo',aircraft:'Assigned aircraft'},
'zh-CN':{outbound:'去程',return:'返程',load:'预计装载率',tonnes:'预计货量',aircraft:'分配机型'},
ja:{outbound:'往路',return:'復路',load:'予想搭載率',tonnes:'予想貨物量',aircraft:'割当機材'},
es:{outbound:'IDA',return:'REGRESO',load:'Carga prevista',tonnes:'Carga estimada',aircraft:'Avión asignado'},
fr:{outbound:'ALLER',return:'RETOUR',load:'Charge prévue',tonnes:'Fret prévu',aircraft:'Appareil affecté'}
};
const lang=()=>{const value=localStorage.getItem('stellaris-language')||'ko';return TEXT[value]?value:'ko'};
const t=key=>TEXT[lang()][key]||TEXT.ko[key];
function render(){
  if(!host)return;
  const today=dateISO(new Date());
  host.innerHTML=CARGO_ROUTES.map(route=>{
    const assignment=cargoAssignment(route,today);
    const pairs=route.flights.map((flight,index)=>{
      const back=route.returns[index]||route.returns[0];
      return '<div class="timetable-pair"><div><b>'+flight[0]+'</b><span>'+route.origin+' '+flight[1]+' → '+route.destination+' '+flight[2]+'</span></div><div><b>'+back[0]+'</b><span>'+route.destination+' '+back[1]+' → '+route.origin+' '+back[2]+'</span></div></div>';
    }).join('');
    return '<article class="timetable-card cargo-timetable-card"><header><span class="flag">'+route.flag+'</span><div><p>'+route.country+'</p><h3>'+route.name+' <small>'+route.origin+' ↔ '+route.destination+'</small></h3></div></header><div class="cargo-assignment"><span>'+t('aircraft')+' <b>'+assignment.aircraft.code+'</b></span><span>'+t('tonnes')+' <b>'+assignment.expectedTonnes+' t</b></span><span>'+t('load')+' <b>'+assignment.load+'%</b></span></div><div class="timetable-head"><span>'+t('outbound')+'</span><span>'+t('return')+'</span></div>'+pairs+'</article>';
  }).join('');
  window.dispatchEvent(new CustomEvent('stellaris:cargo-ready'));
}
render();
window.addEventListener('stellaris:languagechange',render);
