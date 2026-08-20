const LANGUAGE_TARGETS={ko:'ko','en-US':'en','en-GB':'en','zh-CN':'zh',ja:'ja',es:'es',fr:'fr'};
const SUPPORTED_UI_LANGS=Object.keys(LANGUAGE_TARGETS);
const ATTRS=['placeholder','aria-label','title'];
const textOriginal=new WeakMap();
const textRendered=new WeakMap();
const attrOriginal=new WeakMap();
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
async function translateString(text,target){
  const raw=String(text||''),trimmed=raw.trim();
  if(target==='ko'||!meaningful(trimmed)||!nativeSupported)return raw;
  const cacheKey=`${target}\u0000${trimmed}`;
  if(translationCache.has(cacheKey))return raw.replace(trimmed,translationCache.get(cacheKey));
  const source=await detectLanguage(trimmed);
  if(source===target){translationCache.set(cacheKey,trimmed);return raw;}
  const translator=await getTranslator(source,target);
  if(!translator)return raw;
  try{const translated=String(await translator.translate(trimmed)||trimmed).trim();translationCache.set(cacheKey,translated);return raw.replace(trimmed,translated);}catch(error){bindRetry();return raw;}
}
function rememberText(node){
  const rendered=textRendered.get(node);
  if(!textOriginal.has(node)||node.nodeValue!==rendered)textOriginal.set(node,node.nodeValue);
  return textOriginal.get(node);
}
function rememberAttributes(element){
  let original=attrOriginal.get(element);if(!original){original={};attrOriginal.set(element,original);}
  let rendered=attrRendered.get(element);if(!rendered){rendered={};attrRendered.set(element,rendered);}
  for(const attr of ATTRS){
    if(!element.hasAttribute(attr))continue;
    const current=element.getAttribute(attr)||'';
    if(original[attr]===undefined||current!==rendered[attr])original[attr]=current;
  }
  return original;
}
async function translateTextNode(node,target,token){
  if(token!==generation||!node?.parentElement||shouldSkipElement(node.parentElement))return;
  const original=rememberText(node);
  if(target==='ko'){
    if(node.nodeValue!==original)node.nodeValue=original;
    textRendered.set(node,original);return;
  }
  const translated=await translateString(original,target);
  if(token!==generation||!node.isConnected)return;
  if(node.nodeValue!==translated)node.nodeValue=translated;
  textRendered.set(node,translated);
}
async function translateAttributes(element,target,token){
  if(token!==generation||!element?.isConnected||shouldSkipElement(element))return;
  const saved=rememberAttributes(element),rendered=attrRendered.get(element)||{};
  for(const [attr,original] of Object.entries(saved)){
    const next=target==='ko'?original:await translateString(original,target);
    if(token!==generation||!element.isConnected)return;
    if(element.getAttribute(attr)!==next)element.setAttribute(attr,next);
    rendered[attr]=next;
  }
  attrRendered.set(element,rendered);
}
async function runRoot(root,uiLanguage,token){
  if(!root||!nativeSupported||token!==generation)return;
  const target=targetLanguage(uiLanguage);
  const textNodes=[];
  if(root.nodeType===Node.TEXT_NODE){if(root.nodeValue?.trim()&&!shouldSkipElement(root.parentElement))textNodes.push(root);}
  else{
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){return node.nodeValue?.trim()&&!shouldSkipElement(node.parentElement)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
    let node;while((node=walker.nextNode()))textNodes.push(node);
  }
  const attrNodes=[];
  if(root.nodeType===Node.ELEMENT_NODE){
    if(ATTRS.some(attr=>root.hasAttribute?.(attr))&&!shouldSkipElement(root))attrNodes.push(root);
    root.querySelectorAll?.('[placeholder],[aria-label],[title]').forEach(element=>{if(!shouldSkipElement(element))attrNodes.push(element);});
  }
  for(let i=0;i<textNodes.length;i+=8){await Promise.all(textNodes.slice(i,i+8).map(item=>translateTextNode(item,target,token)));if(token!==generation)return;}
  for(let i=0;i<attrNodes.length;i+=8){await Promise.all(attrNodes.slice(i,i+8).map(item=>translateAttributes(item,target,token)));if(token!==generation)return;}
}
async function translatePage(uiLanguage=currentUiLanguage()){
  if(!nativeSupported)return false;
  const token=++generation;document.documentElement.lang=uiLanguage;
  await runRoot(document.body,uiLanguage,token);return token===generation;
}
function bindRetry(){
  if(retryBound||!nativeSupported)return;retryBound=true;
  const retry=()=>{
    retryBound=false;document.removeEventListener('click',retry,true);document.removeEventListener('keydown',retry,true);
    detectorPromise=null;translatorCache.clear();void translatePage(currentUiLanguage());
  };
  document.addEventListener('click',retry,true,{once:true});document.addEventListener('keydown',retry,true,{once:true});
}
const observer=new MutationObserver(records=>{
  if(!nativeSupported)return;
  const language=currentUiLanguage(),token=generation;
  for(const record of records){
    if(record.type==='characterData'){
      const node=record.target;if(textRendered.get(node)!==node.nodeValue)textOriginal.set(node,node.nodeValue);
      void translateTextNode(node,targetLanguage(language),token);continue;
    }
    if(record.type==='attributes'){
      const element=record.target,rendered=attrRendered.get(element)||{};
      if(rendered[record.attributeName]!==element.getAttribute(record.attributeName)){
        const original=attrOriginal.get(element)||{};original[record.attributeName]=element.getAttribute(record.attributeName)||'';attrOriginal.set(element,original);
      }
      void translateAttributes(element,targetLanguage(language),token);continue;
    }
    for(const added of record.addedNodes)void runRoot(added,language,token);
  }
});
if(document.body&&nativeSupported)observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
window.addEventListener('stellaris:languagechange',event=>{
  if(!nativeSupported)return;
  const language=SUPPORTED_UI_LANGS.includes(event.detail?.language)?event.detail.language:currentUiLanguage();
  void translatePage(language);
});
if(nativeSupported){
  window.STELLARIS_AUTO_TRANSLATE={translate:()=>translatePage(currentUiLanguage()),currentLanguage:currentUiLanguage,supported:true};
  queueMicrotask(()=>void translatePage(currentUiLanguage()));
}
