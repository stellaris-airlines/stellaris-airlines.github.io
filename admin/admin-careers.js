import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { CAREER_DEPARTMENTS,CAREER_PERIOD_OPTIONS,CAREER_STATUS_OPTIONS,careerDocId,careerNoticePayload,getCareerView,parseCareerNotice } from '../careers/career-data.js?v=20260817-careers-v2';

const ADMIN_EMAILS=new Set(['stellarisairlines@gmail.com','stellaris.web.dev@gmail.com']);
const isAdmin=user=>Boolean(user&&ADMIN_EMAILS.has(String(user.email||'').toLowerCase()));
let panel=null,form=null,statusEl=null;

function optionMarkup(items){return items.map(item=>`<option value="${item.value}">${item.label}</option>`).join('');}

function ensurePanel(){
  if(panel)return panel;
  const consoleHost=document.querySelector('[data-admin-console]');
  if(!consoleHost)return null;
  panel=document.createElement('section');
  panel.className='admin-panel';
  panel.id='career-manager';
  panel.innerHTML=`
    <div class="admin-panel-head"><div><p class="eyebrow">CAREER MANAGER</p><h2>채용 계획 관리</h2></div><a href="../careers/" target="_blank" rel="noopener">채용 페이지 보기 →</a></div>
    <form data-career-form class="admin-form">
      <label>부서<select name="department" required>
        <option value="flight-operations">Flight Operations</option>
        <option value="cabin-airport-service">Cabin &amp; Airport Service</option>
        <option value="engineering-maintenance">Engineering &amp; Maintenance</option>
        <option value="digital-corporate">Digital &amp; Corporate</option>
      </select></label>

      <div style="padding:18px;border:1px solid #ddd;background:#fafafa">
        <strong>시스템 관리 영역 · 직접 수정 불가</strong>
        <p style="margin:8px 0 0;color:#666">부서명, 부서 소개, 주요 업무, 예정 직무, 채용계획 설명은 다국어 일관성을 위해 사이트 코드에서 관리합니다.</p>
        <div style="margin-top:14px"><b data-career-static-title></b><p data-career-static-summary style="margin:6px 0;color:#555"></p><p data-career-static-roles style="margin:6px 0;color:#555"></p></div>
      </div>

      <div class="admin-grid">
        <label>채용 상태<select name="hiringStatusKey">${optionMarkup(CAREER_STATUS_OPTIONS)}</select></label>
        <label>예상 채용 시기<select name="recruitmentPeriodKey">${optionMarkup(CAREER_PERIOD_OPTIONS)}</select></label>
      </div>

      <p style="margin:0;color:#666">상태와 시기는 코드값으로 저장되며 한국어·영어·중국어·일본어·스페인어·프랑스어 화면에서 자동 번역됩니다.</p>
      <div class="admin-actions"><button class="btn btn-olive" type="submit">채용 상태/시기 저장</button><a class="btn btn-dark" data-career-preview href="../careers/flight-operations/" target="_blank" rel="noopener">현재 부서 미리보기</a></div>
      <p data-career-admin-status style="margin-top:12px;color:#666">부서를 선택하면 현재 저장된 채용 상태를 불러옵니다.</p>
    </form>`;
  const first=document.querySelector('.admin-panel');
  if(first)first.insertAdjacentElement('beforebegin',panel);else consoleHost.appendChild(panel);
  form=panel.querySelector('[data-career-form]');
  statusEl=panel.querySelector('[data-career-admin-status]');
  form.elements.department.addEventListener('change',()=>loadDepartment(form.elements.department.value));
  form.addEventListener('submit',saveDepartment);
  return panel;
}

function setStatus(text,error=false){if(!statusEl)return;statusEl.textContent=text;statusEl.style.color=error?'#b73333':'#2c7a45';}

function fillProtected(slug){
  const data=getCareerView(slug,'ko',null);
  if(!data)return;
  panel.querySelector('[data-career-static-title]').textContent=`${data.title} · ${data.koreanTitle}`;
  panel.querySelector('[data-career-static-summary]').textContent=data.summary;
  panel.querySelector('[data-career-static-roles]').textContent=`예정 직무: ${data.plannedRoles}`;
  form.querySelector('[data-career-preview]').href=`../careers/${slug}/`;
}

function fillManaged(slug,managed){
  const base=CAREER_DEPARTMENTS[slug];
  form.elements.hiringStatusKey.value=managed?.hiringStatusKey||base.defaultStatusKey;
  form.elements.recruitmentPeriodKey.value=managed?.recruitmentPeriodKey||base.defaultPeriodKey;
}

async function loadDepartment(slug){
  fillProtected(slug);
  fillManaged(slug,null);
  setStatus('저장된 채용 상태를 확인하는 중…');
  try{
    const snap=await getDoc(doc(db,'notices',careerDocId(slug)));
    if(snap.exists())fillManaged(slug,parseCareerNotice(slug,snap.data()));
    setStatus('현재 채용 상태와 시기를 불러왔습니다.');
  }catch(error){
    fillManaged(slug,null);
    setStatus('저장된 데이터가 없어 기본 채용 상태를 표시합니다.',true);
  }
}

async function saveDepartment(event){
  event.preventDefault();
  const user=auth.currentUser;
  if(!isAdmin(user)){setStatus('관리자 권한을 확인할 수 없습니다.',true);return;}
  const slug=form.elements.department.value;
  const data={hiringStatusKey:form.elements.hiringStatusKey.value,recruitmentPeriodKey:form.elements.recruitmentPeriodKey.value};
  const ref=doc(db,'notices',careerDocId(slug));
  const title=`CAREERS DATA · ${CAREER_DEPARTMENTS[slug].title}`;
  try{
    const snap=await getDoc(ref);
    const common={category:'일반',author:'STELLARIS CAREERS',status:'draft',publishStart:Timestamp.now(),publishEnd:null,title,body:careerNoticePayload(data),pinned:false,updatedAt:serverTimestamp()};
    if(snap.exists())await updateDoc(ref,common);else await setDoc(ref,{...common,views:0,publishedAt:serverTimestamp()});
    setStatus('채용 상태와 예상 시기를 저장했습니다. 다국어 화면에 자동 반영됩니다.');
  }catch(error){setStatus(`저장 실패: ${String(error?.code||error?.message||error)}`,true);}
}

function hideCareerDataFromNoticeManager(){
  document.querySelectorAll('[data-admin-notice-list] .admin-notice-item').forEach(item=>{
    const title=item.querySelector('h3')?.textContent||'';
    if(title.startsWith('CAREERS DATA ·'))item.hidden=true;
  });
}

onAuthStateChanged(auth,user=>{
  if(!isAdmin(user))return;
  ensurePanel();
  loadDepartment(form.elements.department.value);
  const noticeList=document.querySelector('[data-admin-notice-list]');
  if(noticeList){hideCareerDataFromNoticeManager();new MutationObserver(hideCareerDataFromNoticeManager).observe(noticeList,{childList:true,subtree:true});}
});