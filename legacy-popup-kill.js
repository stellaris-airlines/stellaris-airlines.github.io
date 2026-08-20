function removeLegacy(){document.querySelectorAll('[data-home-experience-popup]').forEach(node=>node.remove());}
removeLegacy();new MutationObserver(removeLegacy).observe(document.body,{childList:true,subtree:true});
