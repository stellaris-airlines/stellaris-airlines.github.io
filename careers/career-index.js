import { db } from '../firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { CAREER_DEPARTMENTS,careerDocId,currentCareerLanguage,getCareerView,parseCareerNotice } from './career-data.js?v=20260817-careers-v2';

const managedBySlug={};

function renderCard(slug){
  const card=document.querySelector(`[data-career-card="${slug}"]`);
  if(!card)return;
  const data=getCareerView(slug,currentCareerLanguage(),managedBySlug[slug]||null);
  if(!data)return;
  card.querySelector('[data-career-summary]').textContent=data.summary;
  card.querySelector('[data-career-status]').textContent=data.hiringStatus;
  card.querySelector('[data-career-period]').textContent=data.recruitmentPeriod;
}

function renderAll(){Object.keys(CAREER_DEPARTMENTS).forEach(renderCard);}
renderAll();
window.addEventListener('stellaris:languagechange',renderAll);

for(const slug of Object.keys(CAREER_DEPARTMENTS)){
  try{
    const snap=await getDoc(doc(db,'notices',careerDocId(slug)));
    if(snap.exists())managedBySlug[slug]=parseCareerNotice(slug,snap.data());
  }catch(error){console.warn('Career card data unavailable',slug,error);}
  renderCard(slug);
}