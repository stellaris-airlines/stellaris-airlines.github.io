const LANGUAGE_TARGETS={ko:'ko','en-US':'en','en-GB':'en','zh-CN':'zh',ja:'ja',es:'es',fr:'fr'};
const LANGUAGE_COLUMNS={'en-US':1,'en-GB':2,'zh-CN':3,ja:4,es:5,fr:6};
const SUPPORTED_UI_LANGS=Object.keys(LANGUAGE_TARGETS);
const ATTRS=['placeholder','aria-label','title'];
const textSource=new WeakMap();
const textRendered=new WeakMap();
const attrSource=new WeakMap();
const attrRendered=new WeakMap();
const translationCache=new Map();
const translatorCache=new Map();
let detectorPromise=null;
let generation=0;
let retryBound=false;
const nativeSupported='Translator' in self;

function currentUiLanguage(){
  try{const stored=localStorage.getItem('stellaris-language');if(SUPPORTED_UI_LANGS.includes(stored))return stored;}catch(error){}
  const html=document.documentElement.lang;return SUPPORTED_UI_LANGS.includes(html)?html:'ko';
}
function targetLanguage(uiLanguage=currentUiLanguage()){return LANGUAGE_TARGETS[uiLanguage]||'ko';}
function shouldSkipElement(element){
  if(!element)return true;
  if(element.closest('script,style,noscript,code,pre,svg,canvas,[data-auto-translate-skip],.language-switcher'))return true;
  if(element.closest('[data-auth-user],[data-complete-ref],[data-ticket-ref],[data-complete-passenger],[data-complete-flight],[data-complete-route],[data-complete-seat]'))return true;
  return false;
}
function meaningful(text){
  const value=String(text||'').trim();
  if(!value||value.length<2)return false;
  if(/^(https?:\/\/|www\.|mailto:|tel:)/i.test(value))return false;
  if(/^[\d\s.,:;/%+\-₩$€£¥()\[\]{}·→←—–_=*!?#@]+$/.test(value))return false;
  if(/^[A-Z0-9]{2,6}\d{0,4}$/.test(value))return false;
  if(/^[A-Z]{3}\s*[→-]\s*[A-Z]{3}$/.test(value))return false;
  if(/^STELLARIS( AIRLINES)?$/i.test(value))return false;
  return true;
}
function allRows(){
  return [...(window.STELLARIS_I18N?.rows||[]),...(window.STELLARIS_EXTRA_I18N?.rows||[])].filter(Array.isArray);
}
function translatedCell(row,uiLanguage){
  const col=LANGUAGE_COLUMNS[uiLanguage];
  if(!col)return row?.[0]??'';
  if(uiLanguage==='en-GB')return row?.[2]??row?.[1]??row?.[0]??'';
  return row?.[col]??row?.[0]??'';
}
function knownTranslation(raw,uiLanguage){
  if(uiLanguage==='ko')return raw;
  const source=String(raw||''),trimmed=source.trim();
  if(!trimmed)return source;
  const rows=allRows();
  const exact=rows.find(row=>row?.[0]===trimmed);
  if(exact){const value=translatedCell(exact,uiLanguage);return source.replace(trimmed,value);}
  let out=trimmed;
  const matches=rows.filter(row=>row?.[0]&&out.includes(row[0])).sort((a,b)=>String(b[0]).length-String(a[0]).length);
  for(const row of matches){const value=translatedCell(row,uiLanguage);out=out.split(row[0]).join(value);}
  return source.replace(trimmed,out);
}
function recoverKnownSource(raw,uiLanguage){
  if(uiLanguage==='ko')return raw;
  const source=String(raw||''),trimmed=source.trim();
  if(!trimmed)return source;
  for(const row of allRows()){
    const translated=translatedCell(row,uiLanguage);
    if(translated&&translated===trimmed)return source.replace(trimmed,row[0]);
  }
  return source;
}
function fastLanguage(text){
  if(/[가-힣]/.test(text))return 'ko';
  if(/[ぁ-ゟ゠-ヿ]/.test(text))return 'ja';
  if(/[一-鿿]/.test(text))return 'zh';
  return null;
}
async function getDetector(){
  if(detectorPromise)return detectorPromise;
  detectorPromise=(async()=>{
    if(!('LanguageDetector' in self))return null;
    try{
      const availability=await LanguageDetector.availability();
      if(availability==='unavailable')return null;
      if(availability==='downloadable'&&!navigator.userActivation?.isActive){bindRetry();return null;}
      return await LanguageDetector.create();
    }catch(error){return null;}
  })();
  const detector=await detectorPromise;
  if(!detector)detectorPromise=null;
  return detector;
}
async function detectLanguage(text){
  const fast=fastLanguage(text);if(fast)return fast;
  const detector=await getDetector();
  if(detector&&text.trim().length>=12){
    try{const results=await detector.detect(text);const best=results?.[0];if(best?.detectedLanguage&&Number(best.confidence||0)>=0.45)return String(best.detectedLanguage).split('-')[0];}catch(error){}
  }
  return 'en';
}
async function getTranslator(source,target){
  if(source===target||!nativeSupported)return null;
  const key=`${source}>${target}`;
  if(translatorCache.has(key))return translatorCache.get(key);
  const pending=(async()=>{
    try{
      const availability=await Translator.availability({sourceLanguage:source,targetLanguage:target});
      if(availability==='unavailable')return null;
      if(availability==='downloadable'&&!navigator.userActivation?.isActive){bindRetry();return null;}
      return await Translator.create({sourceLanguage:source,targetLanguage:target});
    }catch(error){return null;}
  })();
  translatorCache.set(key,pending);
  const result=await pending;
  if(!result)translatorCache.delete(key);
  return result;
}
async function translateString(raw,uiLanguage){
  const source=String(raw||''),trimmed=source.trim();
  if(uiLanguage==='ko'||!meaningful(trimmed))return source;
  const known=knownTranslation(source,uiLanguage);
  if(known!==source)return known;
  if(!nativeSupported)return source;
  const target=targetLanguage(uiLanguage);
  const cacheKey=`${uiLanguage}\u0000${trimmed}`;
  if(translationCache.has(cacheKey))return source.replace(trimmed,translationCache.get(cacheKey));
  const detected=await detectLanguage(trimmed);
  if(detected===target){translationCache.set(cacheKey,trimmed);return source;}
  const translator=await getTranslator(detected,target);
  if(!translator)return source;
  try{
    const translated=String(await translator.translate(trimmed)||trimmed).trim();
    translationCache.set(cacheKey,translated);
    return source.replace(trimmed,translated);
  }catch(error){bindRetry();return source;}
}
function rememberText(node,uiLanguage=currentUiLanguage()){
  const rendered=textRendered.get(node);
  if(!textSource.has(node)){
    const recovered=uiLanguage==='ko'?node.nodeValue:recoverKnownSource(node.nodeValue,uiLanguage);
    textSource.set(node,recovered);
  }else if(node.nodeValue!==rendered){
    const current=String(node.nodeValue||'');
    if(uiLanguage==='ko'||/[가-힣]/.test(current))textSource.set(node,current);
    else textSource.set(node,recoverKnownSource(current,uiLanguage));
  }
  return textSource.get(node);
}
function rememberAttributes(element,uiLanguage=currentUiLanguage()){
  let source=attrSource.get(element);if(!source){source={};attrSource.set(element,source);}
  let rendered=attrRendered.get(element);if(!rendered){rendered={};attrRendered.set(element,rendered);}
  for(const attr of ATTRS){
    if(!element.hasAttribute(attr))continue;
    const current=element.getAttribute(attr)||'';
    if(source[attr]===undefined){source[attr]=uiLanguage==='ko'?current:recoverKnownSource(current,uiLanguage);continue;}
    if(current!==rendered[attr])source[attr]=uiLanguage==='ko'||/[가-힣]/.test(current)?current:recoverKnownSource(current,uiLanguage);
  }
  return source;
}
async function translateTextNode(node,uiLanguage,token){
  if(token!==generation||!node?.parentElement||shouldSkipElement(node.parentElement))return;
  const source=rememberText(node,uiLanguage);
  const next=uiLanguage==='ko'?source:await translateString(source,uiLanguage);
  if(token!==generation||!node.isConnected)return;
  if(node.nodeValue!==next)node.nodeValue=next;
  textRendered.set(node,next);
}
async function translateAttributes(element,uiLanguage,token){
  if(token!==generation||!element?.isConnected||shouldSkipElement(element))return;
  const saved=rememberAttributes(element,uiLanguage),rendered=attrRendered.get(element)||{};
  for(const [attr,source] of Object.entries(saved)){
    const next=uiLanguage==='ko'?source:await translateString(source,uiLanguage);
    if(token!==generation||!element.isConnected)return;
    if(element.getAttribute(attr)!==next)element.setAttribute(attr,next);
    rendered[attr]=next;
  }
  attrRendered.set(element,rendered);
}
async function runRoot(root,uiLanguage,token){
  if(!root||token!==generation)return;
  const textNodes=[];
  if(root.nodeType===Node.TEXT_NODE){if(root.nodeValue?.trim()&&!shouldSkipElement(root.parentElement))textNodes.push(root);}
  else if(root.nodeType===Node.ELEMENT_NODE||root.nodeType===Node.DOCUMENT_FRAGMENT_NODE){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){return node.nodeValue?.trim()&&!shouldSkipElement(node.parentElement)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
    let node;while((node=walker.nextNode()))textNodes.push(node);
  }
  const attrNodes=[];
  if(root.nodeType===Node.ELEMENT_NODE){
    if(ATTRS.some(attr=>root.hasAttribute?.(attr))&&!shouldSkipElement(root))attrNodes.push(root);
    root.querySelectorAll?.('[placeholder],[aria-label],[title]').forEach(element=>{if(!shouldSkipElement(element))attrNodes.push(element);});
  }
  for(let i=0;i<textNodes.length;i+=8){await Promise.all(textNodes.slice(i,i+8).map(item=>translateTextNode(item,uiLanguage,token)));if(token!==generation)return;}
  for(let i=0;i<attrNodes.length;i+=8){await Promise.all(attrNodes.slice(i,i+8).map(item=>translateAttributes(item,uiLanguage,token)));if(token!==generation)return;}
}
async function translatePage(uiLanguage=currentUiLanguage()){
  if(!SUPPORTED_UI_LANGS.includes(uiLanguage))uiLanguage='ko';
  const token=++generation;
  document.documentElement.lang=uiLanguage;
  await runRoot(document.body,uiLanguage,token);
  return token===generation;
}
function bindRetry(){
  if(retryBound||!nativeSupported)return;retryBound=true;
  const retry=()=>{
    retryBound=false;document.removeEventListener('click',retry,true);document.removeEventListener('keydown',retry,true);
    detectorPromise=null;translatorCache.clear();void translatePage(currentUiLanguage());
  };
  document.addEventListener('click',retry,true,{once:true});
  document.addEventListener('keydown',retry,true,{once:true});
}
const observer=new MutationObserver(records=>{
  const uiLanguage=currentUiLanguage(),token=generation;
  for(const record of records){
    if(record.type==='characterData'){
      const node=record.target;
      if(textRendered.get(node)!==node.nodeValue)rememberText(node,uiLanguage);
      void translateTextNode(node,uiLanguage,token);
      continue;
    }
    if(record.type==='attributes'){
      const element=record.target,rendered=attrRendered.get(element)||{};
      if(rendered[record.attributeName]!==element.getAttribute(record.attributeName))rememberAttributes(element,uiLanguage);
      void translateAttributes(element,uiLanguage,token);
      continue;
    }
    for(const added of record.addedNodes)void runRoot(added,uiLanguage,token);
  }
});
if(document.body)observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
window.addEventListener('stellaris:languagechange',event=>{
  const language=SUPPORTED_UI_LANGS.includes(event.detail?.language)?event.detail.language:currentUiLanguage();
  void translatePage(language);
});
window.STELLARIS_AUTO_TRANSLATE={
  translate:()=>translatePage(currentUiLanguage()),
  currentLanguage:currentUiLanguage,
  supported:true,
  nativeSupported
};
queueMicrotask(()=>void translatePage(currentUiLanguage()));
