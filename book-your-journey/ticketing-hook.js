(()=>{
  const selector='[data-issue-ticket]';
  const originalAddEventListener=EventTarget.prototype.addEventListener;
  let restored=false;

  function restore(){
    if(restored)return;
    restored=true;
    EventTarget.prototype.addEventListener=originalAddEventListener;
  }

  EventTarget.prototype.addEventListener=function(type,listener,options){
    if(!restored&&type==='click'&&typeof listener==='function'){
      try{
        if(this instanceof Element&&this.matches(selector)){
          window.STELLARIS_ISSUE_TICKET=listener;
          restore();
        }
      }catch(error){}
    }
    return originalAddEventListener.call(this,type,listener,options);
  };

  window.setTimeout(restore,10000);
})();
