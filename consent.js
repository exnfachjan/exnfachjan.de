
(function(){
  const STORAGE_KEY='siteConsentV1';
  const defaultConsent={necessary:true,media:false,ts:null,ver:1};
  const qs=(s,c=document)=>c.querySelector(s);
  const qsa=(s,c=document)=>Array.from(c.querySelectorAll(s));
  function load(){try{return {...defaultConsent,...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}}catch(e){return {...defaultConsent}}}
  function save(c){const out={...c,ts:Date.now()};localStorage.setItem(STORAGE_KEY,JSON.stringify(out));window.myConsent=out;}
  function ok(cat){const c=window.myConsent||load();return !!c[cat]}
  function show(el){if(el) el.style.display=(el.id==='consent-modal'?'flex':'block');}
  function hide(el){if(el) el.style.display='none';}
  function openSettings(){const m=qs('#consent-modal');if(!m) return; qs('#consent-toggle-media').checked=ok('media'); show(m);}
  function closeSettings(){hide(qs('#consent-modal'));}

  function isYT(src){return /youtube|youtu\.be/.test(src)}
  function isTW(src){return /twitch\.tv/.test(src)}
  function isMediaSrc(src){ try{ const s=(src||'').toLowerCase(); return s.includes('youtube')||s.includes('youtu.be')||s.includes('twitch.tv')||s.includes('player.twitch.tv'); }catch(e){ return false; }}
  function isMediaIframe(ifr){const s=(ifr.getAttribute('src')||'').toLowerCase();return isYT(s)||isTW(s)}

  function phFor(ifr){
    const tpl=qs('#media-placeholder-template');
    const ph=document.createElement('div');
    ph.className='media-placeholder';
    ph.innerHTML=tpl?tpl.innerHTML:'<div class="media-placeholder__text">Externe Medien sind blockiert.</div><div class="media-placeholder__actions"><button class="consent-btn consent-btn--primary" data-consent-accept-media>Akzeptieren</button><button class="consent-btn consent-btn--secondary" data-consent-open>Einstellungen</button></div>';
    ph.style.minHeight=Math.max(ifr.clientHeight,200)+'px';
    ph.dataset.embedSrc=ifr.getAttribute('src'); ph.dataset.allow=ifr.getAttribute('allow')||''; ph.dataset.title=ifr.getAttribute('title')||'';
    ifr.replaceWith(ph);
  }
  function blockAll(){
    qsa('iframe').forEach(ifr=>{ if(isMediaIframe(ifr)) phFor(ifr); });
  }
  function mountAll(){
    qsa('.media-placeholder').forEach(ph=>{
      const src=ph.dataset.embedSrc||ph.dataset.embed||ph.getAttribute('data-embed-src');
      if(!src) return;
      const ifr=document.createElement('iframe');
      ifr.src=src;
      ifr.title=ph.dataset.title||'Embedded media';
      ifr.allow=ph.dataset.allow||"accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share";
      ifr.loading="lazy"; ifr.referrerPolicy="strict-origin-when-cross-origin";
      ifr.className='consent-lazy'; ph.replaceWith(ifr);
      requestAnimationFrame(()=>ifr.classList.add('consent-mounted'));
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    window.myConsent=load();
    const banner=qs('#consent-banner');
    const saveBtn=qs('#consent-save');
    const acceptAll=qs('#consent-accept');
    const rejectAll=qs('#consent-reject');
    const mediaToggle=qs('#consent-toggle-media');

    // Static hooks
    (qs('#consent-settings')||document).addEventListener('click', e=>{ if(e.target.closest('#consent-settings')) openSettings(); });
    qsa('[data-consent-open]').forEach(btn=>btn.addEventListener('click', openSettings));
    qsa('[data-consent-close]').forEach(btn=>btn.addEventListener('click', closeSettings));
    // Initial state: if no prior consent, show banner and block media immediately
    if(!window.myConsent.ts){
      if(banner) show(banner);
      blockAll();
    } else {
      ok('media') ? mountAll() : blockAll();
    }


    if(acceptAll) acceptAll.addEventListener('click', ()=>{ save({necessary:true,media:true}); hide(banner); closeSettings(); mountAll(); });
    if(rejectAll) rejectAll.addEventListener('click', ()=>{ save({necessary:true,media:false}); hide(banner); closeSettings(); blockAll(); });
    if(saveBtn)   saveBtn.addEventListener('click', ()=>{ const m=!!(mediaToggle&&mediaToggle.checked); save({necessary:true,media:m}); hide(banner); closeSettings(); m?mountAll():blockAll(); });

    // Delegated clicks (dynamic placeholders): accept + open
    document.addEventListener('click', (e)=>{
      const acc=e.target.closest('[data-consent-accept-media]'); if(acc){ save({necessary:true,media:true}); hide(banner); closeSettings(); mountAll(); return; }
      const opn=e.target.closest('[data-consent-open]'); if(opn){ openSettings(); }
    });

    // Show banner if no consent yet
    if(!window.myConsent.ts){ if(banner) show(banner); } else { ok('media')?mountAll():blockAll(); }

    // Auto-convert any YT embeds to nocookie
    document.querySelectorAll('iframe[src*="youtube.com/embed/"]').forEach(ifr=>{
      const src=ifr.getAttribute('src'); if(src && !/youtube-nocookie\.com/.test(src)){ ifr.setAttribute('src', src.replace('youtube.com','youtube-nocookie.com')); }
    });

    // MutationObserver: block dynamically added media if no consent
    const mo=new MutationObserver((list)=>{
      if(ok('media')) return;
      list.forEach(m=>{
        // Block if an existing iframe gets a media 'src' later
        if(m.type==='attributes' && m.target && m.target.tagName==='IFRAME'){
          const src = m.target.getAttribute('src') || '';
          if(src && isMediaIframe(m.target)) { phFor(m.target); return; }
        }
        // Block newly added iframes
        m.addedNodes.forEach(node=>{
          if(node.nodeType!==1) return;
          if(node.tagName==='IFRAME' && isMediaIframe(node)) { phFor(node); return; }
          node.querySelectorAll && node.querySelectorAll('iframe').forEach(ifr=>{ if(isMediaIframe(ifr)) phFor(ifr); });
        });
      });
    });
    mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  });
})();
