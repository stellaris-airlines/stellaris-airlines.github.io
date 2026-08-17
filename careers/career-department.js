import { db } from '../firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { careerDocId,currentCareerLanguage,getCareerView,parseCareerNotice } from './career-data.js?v=20260817-careers-v2';

const slug=document.body.dataset.careerDepartment;
let managed=null;

function render(){
  const data=getCareerView(slug,currentCareerLanguage(),managed);
  if(!data)return;
  document.querySelector('[data-career-title]').textContent=data.title;
  document.querySelector('[data-career-korean]').textContent=data.koreanTitle;
  document.querySelector('[data-career-summary]').textContent=data.summary;
  const duties=document.querySelector('[data-career-duties]');
  duties.innerHTML='';
  data.duties.forEach(item=>{const li=document.createElement('li');li.textContent=item;duties.appendChild(li);});
  document.querySelector('[data-career-hiring-status]').textContent=data.hiringStatus;
  document.querySelector('[data-career-period]').textContent=data.recruitmentPeriod;
  document.querySelector('[data-career-roles]').textContent=data.plannedRoles;
  document.querySelector('[data-career-plan]').textContent=data.recruitmentPlan;
}

render();
window.addEventListener('stellaris:languagechange',render);

try{
  const snap=await getDoc(doc(db,'notices',careerDocId(slug)));
  if(snap.exists())managed=parseCareerNotice(slug,snap.data());
}catch(error){
  console.warn('Career department data unavailable',error);
}
render();