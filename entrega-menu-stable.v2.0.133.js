
/* ELTA v2.0.133 - Fix visual estable menu Entregas sin envolver window.tab */
(function(){
  const VERSION='2.0.133';
  const ICON='🏁';
  function setVersion(){
    window.ELTA_APP_VERSION=VERSION;
    window.APP_VERSION_V2=VERSION;
    document.querySelectorAll('span,small,p,div').forEach(el=>{
      if(el.childElementCount===0 && /Versi[oó]n\s+\d+\.\d+\.\d+/i.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(/Versi[oó]n\s+\d+\.\d+\.\d+/gi,'Versión '+VERSION);
      }
    });
  }
  function stabilizeEntregaMenu(){
    const nav=document.querySelector('.sideNav');
    if(!nav) return;
    const buttons=[...nav.querySelectorAll('button')];
    const entregaButtons=buttons.filter(b=>{
      const oc=b.getAttribute('onclick')||'';
      const tx=(b.textContent||'').toLowerCase();
      return oc.includes('entrega') || b.dataset.menuId==='entrega' || tx.includes('entregas');
    });
    const keep=entregaButtons[0];
    if(!keep) return;
    keep.dataset.menuId='entrega';
    keep.setAttribute('onclick',"tab('entrega')");
    keep.innerHTML='<span class="menuIcon">'+ICON+'</span><span class="menuText">Entregas</span>';
    entregaButtons.slice(1).forEach(b=>b.remove());
    const emb=buttons.find(b=>(b.getAttribute('onclick')||'').includes('embarques'));
    if(emb && emb.nextSibling!==keep) emb.parentNode.insertBefore(keep, emb.nextSibling);
  }
  function run(){ setVersion(); stabilizeEntregaMenu(); }
  document.addEventListener('DOMContentLoaded',()=>{run(); setTimeout(run,200); setTimeout(run,800);});
  window.addEventListener('load',()=>{run(); setTimeout(run,500);});
  const obs=new MutationObserver(()=>{ clearTimeout(window.__eltaEntregaMenuT); window.__eltaEntregaMenuT=setTimeout(run,30); });
  document.addEventListener('DOMContentLoaded',()=>{ if(document.body) obs.observe(document.body,{childList:true,subtree:true}); });
})();
