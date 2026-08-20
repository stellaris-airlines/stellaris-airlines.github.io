const LANGUAGE_TARGETS={ko:'ko','en-US':'en','en-GB':'en','zh-CN':'zh',ja:'ja',es:'es',fr:'fr'};
const SUPPORTED_UI_LANGS=Object.keys(LANGUAGE_TARGETS);
const ATTRS=['placeholder','aria-label','title'];
const textOriginal=new WeakMap();
const textRendered=new WeakMap();
const attrOriginal=new WeakMap();
const translationCache=new Map();
const translatorCache=new Map();
let detectorPromise=null;
let generation=0;
let translating=false;
let retryBound=false;

// Legacy dictionary translators honour this flag. The new automatic layer does not,
// so dynamic Firestore content and newly inserted DOM can be translated at runtime.
document.body?.setAttribute('data-i18n-skip','');

function currentUiLanguage(){
  try{
    const stored=localStorage.getItem('stellaris-language');
    if(SUPPORTED_UI_LANGS.includes(stored))return stored;
  }catch(error){}
  const html=document.documentElement.lang;
  return SUPPORTED_UI_LANGS.includes(html)?html:'ko';
}
function targetLanguage(uiLanguage=currentUiLanguage()){
  return LANGUAGE_TARGETS[uiLanguage]||'ko';
}
function shouldSkipElement(element){
  if(!element)return true;
  if(element.closest('script,style,noscript,code,pre,svg,canvas,[data-auto-translate-skip],.language-switcher'))return true;
  if(element.closest('[data-auth-user],[data-complete-ref],[data-ticket-ref]'))return true;
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
      return await LanguageDetector.create();
    }catch(error){return null;}
  })();
  return detectorPromise;
}
async function detectLanguage(text){
  const fast=fastLanguage(text);
  if(fast)return fast;
  const detector=await getDetector();
  if(detector&&text.trim().length>=12){
    try{
      const results=await detector.detect(text);
      const best=results?.[0];
      if(best?.detectedLanguage&&Number(best.confidence||0)>=0.45)return String(best.detectedLanguage).split('-')[0];
    }catch(error){}
  }
  return 'en';
}
async function getTranslator(source,target){
  if(source===target)return null;
  const key=`${source}>${target}`;
  if(translatorCache.has(key))return translatorCache.get(key);
  const pending=(async()=>{
    if(!('Translator' in self))return null;
    try{
      const availability=await Translator.availability({sourceLanguage:source,targetLanguage:target});
      if(availability==='unavailable')return null;
      return await Translator.create({sourceLanguage:source,targetLanguage:target});
    }catch(error){return null;}
  })();
  translatorCache.set(key,pending);
  return pending;
}
async function translateString(text,target){
  const raw=String(text||'');
  const trimmed=raw.trim();
  if(target==='ko'||!meaningful(trimmed))return raw;
  const cacheKey=`${target}\u0000${trimmed}`;
  if(translationCache.has(cacheKey))return raw.replace(trimmed,translationCache.get(cacheKey));
  const source=await detectLanguage(trimmed);
  if(source===target){translationCache.set(cacheKey,trimmed);return raw;}
  const translator=await getTranslator(source,target);
  if(!translator){bindRetry();return raw;}
  try{
    const translated=String(await translator.translate(trimmed)||trimmed).trim();
    translationCache.set(cacheKey,translated);
    return raw.replace(trimmed,translated);
  }catch(error){bindRetry();return raw;}
}
function rememberText(node){
  const lastRendered=textRendered.get(node);
  if(!textOriginal.has(node)||node.nodeValue!==lastRendered){
    textOriginal.set(node,node.nodeValue);
  }
  return textOriginal.get(node);
}
function rememberAttributes(element){
  let saved=attrOriginal.get(element);
  if(!saved){saved={};attrOriginal.set(element,saved);}
  for(const attr of ATTRS){
    if(!element.hasAttribute(attr))continue;
    const current=element.getAttribute(attr)||'';
    if(saved[attr]===undefined||current!==element.dataset[`autoTranslated${attr.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())}`])saved[attr]=current;
  }
  return saved;
}
async function translateTextNode(node,target,token){
  if(token!==generation||!node?.parentElement||shouldSkipElement(node.parentElement))return;
  const original=rememberText(node);
  if(target==='ko'){
    if(node.nodeValue!==original){translating=true;node.nodeValue=original;translating=false;}
    textRendered.set(node,original);
    return;
  }
  const translated=await translateString(original,target);
  if(token!==generation||!node.isConnected)return;
  translating=true;node.nodeValue=translated;translating=false;
  textRendered.set(node,translated);
}
async function translateAttributes(element,target,token){
  if(token!==generation||!element?.isConnected||shouldSkipElement(element))return;
  const saved=rememberAttributes(element);
  for(const [attr,original] of Object.entries(saved)){
    const next=target==='ko'?original:await translateString(original,target);
    if(token!==generation||!element.isConnected)return;
    translating=true;element.setAttribute(attr,next);translating=false;
    const key=`autoTranslated${attr.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())}`;
    element.dataset[key]=next;
  }
}
async function translateSubtree(root=document.body,uiLanguage=currentUiLanguage()){
  if(!root)return;
  const token=++generation;
  const target=targetLanguage(uiLanguage);
  document.documentElement.lang=uiLanguage;
  const textNodes=[];
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
    return node.nodeValue?.trim()&&!shouldSkipElement(node.parentElement)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
  }});
  let node;while((node=walker.nextNode()))textNodes.push(node);
  const attrNodes=[];
  if(root.nodeType===1&&ATTRS.some(attr=>root.hasAttribute?.(attr)))attrNodes.push(root);
  root.querySelectorAll?.('[placeholder],[aria-label],[title]').forEach(element=>{if(!shouldSkipElement(element))attrNodes.push(element);});
  for(let i=0;i<textNodes.length;i+=8){
    await Promise.all(textNodes.slice(i,i+8).map(item=>translateTextNode(item,target,token)));
    if(token!==generation)return;
  }
  for(let i=0;i<attrNodes.length;i+=8){
    await Promise.all(attrNodes.slice(i,i+8).map(item=>translateAttributes(item,target,token)));
    if(token!==generation)return;
  }
}
function bindRetry(){
  if(retryBound)return;
  retryBound=true;
  const retry=()=>{
    retryBound=false;
    document.removeEventListener('click',retry,true);
    document.removeEventListener('keydown',retry,true);
    void translateSubtree(document.body,currentUiLanguage());
  };
  document.addEventListener('click',retry,true,{once:true});
  document.addEventListener('keydown',retry,true,{once:true});
}
const observer=new MutationObserver(records=>{
  if(translating)return;
  const language=currentUiLanguage();
  for(const record of records){
    if(record.type==='characterData'){
      const node=record.target;
      if(textRendered.get(node)!==node.nodeValue)textOriginal.set(node,node.nodeValue);
      void translateTextNode(node,targetLanguage(language),generation);
      continue;
    }
    for(const added of record.addedNodes){
      if(added.nodeType===Node.TEXT_NODE){
        textOriginal.set(added,added.nodeValue);
        void translateTextNode(added,targetLanguage(language),generation);
      }else if(added.nodeType===Node.ELEMENT_NODE){
        void translateSubtree(added,language);
      }
    }
  }
});
if(document.body)observer.observe(document.body,{childList:true,subtree:true,characterData:true});

window.addEventListener('stellaris:languagechange',event=>{
  const language=SUPPORTED_UI_LANGS.includes(event.detail?.language)?event.detail.language:currentUiLanguage();
  void translateSubtree(document.body,language);
});
window.STELLARIS_AUTO_TRANSLATE={translate:()=>translateSubtree(document.body,currentUiLanguage()),currentLanguage:currentUiLanguage};
queueMicrotask(()=>void translateSubtree(document.body,currentUiLanguage()));
