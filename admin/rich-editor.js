const ALLOWED_TAGS=new Set(['P','BR','STRONG','B','EM','I','U','UL','OL','LI','DIV','SPAN','TABLE','THEAD','TBODY','TR','TH','TD','IMG','A','H2','H3','H4','BLOCKQUOTE']);
const ALLOWED_STYLE=new Set(['font-size','font-family','font-weight','font-style','text-align','color']);

function safeUrl(value){const raw=String(value||'').trim();if(!raw)return '';try{const url=new URL(raw,location.href);return ['http:','https:','mailto:'].includes(url.protocol)?url.href:'';}catch(error){return '';}}
function safeImageUrl(value){const raw=String(value||'').trim();if(!raw)return '';try{const url=new URL(raw,location.href);return ['http:','https:'].includes(url.protocol)?url.href:'';}catch(error){return '';}}

export function sanitizeRichHTML(html=''){
  const doc=new DOMParser().parseFromString(`<div>${String(html||'')}</div>`,'text/html');
  const root=doc.body.firstElementChild;
  [...root.querySelectorAll('*')].forEach(el=>{
    if(!ALLOWED_TAGS.has(el.tagName)){el.replaceWith(...el.childNodes);return;}
    [...el.attributes].forEach(attr=>{
      const name=attr.name.toLowerCase();
      if(name==='style'){
        const next=[];String(attr.value||'').split(';').forEach(rule=>{const at=rule.indexOf(':');if(at<0)return;const key=rule.slice(0,at).trim().toLowerCase(),value=rule.slice(at+1).trim();if(ALLOWED_STYLE.has(key)&&value&&!/[{}<>]/.test(value))next.push(`${key}:${value}`);});
        if(next.length)el.setAttribute('style',next.join(';'));else el.removeAttribute('style');return;
      }
      if(el.tagName==='IMG'&&['src','alt'].includes(name))return;
      if(el.tagName==='A'&&['href','target','rel'].includes(name))return;
      el.removeAttribute(attr.name);
    });
    if(el.tagName==='IMG'){
      const src=safeImageUrl(el.getAttribute('src'));if(!src){el.remove();return;}el.setAttribute('src',src);el.setAttribute('loading','lazy');
    }
    if(el.tagName==='A'){
      const href=safeUrl(el.getAttribute('href'));if(!href){el.replaceWith(...el.childNodes);return;}el.setAttribute('href',href);if(/^https?:/i.test(href)){el.setAttribute('target','_blank');el.setAttribute('rel','noopener noreferrer');}
    }
  });
  return root.innerHTML;
}

export function setSafeRichHTML(host,html){if(host)host.innerHTML=sanitizeRichHTML(html);}

function exec(command,value=null){document.execCommand(command,false,value);}
function selectionInside(host){const selection=getSelection();if(!selection||!selection.rangeCount)return false;return host.contains(selection.anchorNode)&&host.contains(selection.focusNode);}
function insertHTML(host,html){host.focus();if(!selectionInside(host)){const range=document.createRange();range.selectNodeContents(host);range.collapse(false);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);}exec('insertHTML',html);}
function normalizeFontTags(host){host.querySelectorAll('font').forEach(font=>{const span=document.createElement('span'),face=font.getAttribute('face'),size=font.style.fontSize;if(face)span.style.fontFamily=face;if(size)span.style.fontSize=size;while(font.firstChild)span.appendChild(font.firstChild);font.replaceWith(span);});}

export function createRichEditor(textarea,{uploadImage,placeholder='내용을 입력하세요.'}={}){
  if(!textarea||textarea.dataset.richEditorReady==='true')return textarea?textarea._richEditor:null;
  textarea.dataset.richEditorReady='true';textarea.hidden=true;
  const wrap=document.createElement('div');wrap.className='admin-rich-editor';
  wrap.innerHTML=`<div class="admin-rich-toolbar">
    <select data-rich-size aria-label="글자 크기"><option value="">크기</option><option value="12">12px</option><option value="14">14px</option><option value="16">16px</option><option value="18">18px</option><option value="24">24px</option><option value="32">32px</option><option value="48">48px</option></select>
    <select data-rich-font aria-label="글꼴"><option value="">글꼴</option><option value="Noto Sans KR">Noto Sans KR</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option></select>
    <button type="button" data-rich-cmd="bold" aria-label="굵게"><b>B</b></button>
    <button type="button" data-rich-cmd="italic" aria-label="기울임"><i>I</i></button>
    <button type="button" data-rich-table>표</button>
    <button type="button" data-rich-image>이미지</button>
    <button type="button" data-rich-image-url>이미지 URL</button>
  </div><div class="admin-rich-canvas" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="${placeholder.replace(/"/g,'&quot;')}"></div><input type="file" accept="image/*" data-rich-file hidden>`;
  textarea.insertAdjacentElement('afterend',wrap);
  const canvas=wrap.querySelector('[contenteditable]'),file=wrap.querySelector('[data-rich-file]');
  const sync=()=>{normalizeFontTags(canvas);textarea.value=sanitizeRichHTML(canvas.innerHTML);textarea.dispatchEvent(new Event('input',{bubbles:true}));};
  const setHTML=html=>{canvas.innerHTML=sanitizeRichHTML(html||'');textarea.value=sanitizeRichHTML(canvas.innerHTML);};
  const getHTML=()=>sanitizeRichHTML(canvas.innerHTML);
  setHTML(textarea.value);
  canvas.addEventListener('input',sync);canvas.addEventListener('blur',sync);
  wrap.querySelectorAll('[data-rich-cmd]').forEach(button=>button.addEventListener('click',()=>{canvas.focus();exec(button.dataset.richCmd);sync();}));
  wrap.querySelector('[data-rich-size]').addEventListener('change',event=>{const value=event.target.value;if(!value)return;canvas.focus();exec('fontSize','7');canvas.querySelectorAll('font[size="7"]').forEach(el=>{el.removeAttribute('size');el.style.fontSize=`${value}px`;});normalizeFontTags(canvas);sync();event.target.value='';});
  wrap.querySelector('[data-rich-font]').addEventListener('change',event=>{const value=event.target.value;if(!value)return;canvas.focus();exec('fontName',value);normalizeFontTags(canvas);sync();event.target.value='';});
  wrap.querySelector('[data-rich-table]').addEventListener('click',()=>{const rawRows=prompt('표 행 수를 입력하세요.','2');if(rawRows===null)return;const rawCols=prompt('표 열 수를 입력하세요.','2');if(rawCols===null)return;const rows=Math.max(1,Math.min(20,Number(rawRows)||1)),cols=Math.max(1,Math.min(10,Number(rawCols)||1));let html='<table><tbody>';for(let r=0;r<rows;r++){html+='<tr>';for(let c=0;c<cols;c++)html+='<td>&nbsp;</td>';html+='</tr>';}html+='</tbody></table><p><br></p>';insertHTML(canvas,html);sync();});
  wrap.querySelector('[data-rich-image-url]').addEventListener('click',()=>{const url=prompt('이미지 URL을 입력하세요.','https://');const safe=safeImageUrl(url);if(!safe)return;insertHTML(canvas,`<p><img src="${safe.replace(/"/g,'&quot;')}" alt=""></p>`);sync();});
  wrap.querySelector('[data-rich-image]').addEventListener('click',()=>file.click());
  file.addEventListener('change',async()=>{const selected=file.files?.[0];file.value='';if(!selected)return;if(!uploadImage){alert('이미지 업로드 기능이 준비되지 않았습니다. 이미지 URL 기능을 사용해 주세요.');return;}const button=wrap.querySelector('[data-rich-image]'),before=button.textContent;button.disabled=true;button.textContent='업로드 중…';try{const url=await uploadImage(selected);insertHTML(canvas,`<p><img src="${String(url).replace(/"/g,'&quot;')}" alt=""></p>`);sync();}catch(error){alert(String(error?.message||error));}finally{button.disabled=false;button.textContent=before;}});
  const api={wrap,canvas,getHTML,setHTML,sync,clear:()=>setHTML('')};textarea._richEditor=api;return api;
}
