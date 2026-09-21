/* v271 — Témoins de départ des voix internes, pas de mesure sonore.
   Appel après la programmation native, jamais pendant le rendu hors ligne.
   On ne relit PAS le motif : FX/SCATTER, silence, MIDI et notes superposées
   ont déjà été traités par la machine. Aucun nœud audio n'entre ici.
   Le point clair est indépendant du pas courant et de la sélection. */
function temoinFrappe(machine, contexte, temps, partie, note){
  if(typeof RETOURS_FRAPPE === "object" && RETOURS_FRAPPE)
    RETOURS_FRAPPE.programmer(machine, contexte, temps, partie, note);
}
function effacerFrappes(machine){
  if(typeof RETOURS_FRAPPE === "object" && RETOURS_FRAPPE) RETOURS_FRAPPE.effacer(machine);
}
var RETOURS_FRAPPE=(function(){
  "use strict";
  var MAX=128,DUREE=.16,PERIME=.18;
  var file=[],impacts=new Map(),appuis=new Map(),contexte=null;
  var raf=null,minuterie=null,dernier=-Infinity,frames=0,signaux=0,ignores=0;
  var horsPage=false,masque=true,mode="",signature="";
  var reduire=window.matchMedia("(prefers-reduced-motion: reduce)");
  var racines={ko:document.getElementById("unit-ko"),mc:document.getElementById("unit-mc"),stk:document.getElementById("unit-stk")};
  var groupes={ko:document.getElementById("ko-pads"),mc:document.getElementById("mc-trks"),stk:document.getElementById("stk-trks")};
  var panneaux=["menu","note","bib","enr","pr","table","syro","studio","nexus","audio-diagnostic"]
    .map(function(id){return document.getElementById(id);}).filter(Boolean);
  function arreterBoucle(){
    if(raf!==null)cancelAnimationFrame(raf);raf=null;
    if(minuterie!==null)clearTimeout(minuterie);minuterie=null;
  }
  function relacher(id){
    var a=appuis.get(id);if(!a)return;appuis.delete(id);
    var encore=false;appuis.forEach(function(b){if(b===a)encore=true;});
    if(!encore)a.removeAttribute("data-rf-appui");
  }
  function relacherTout(){appuis.forEach(function(a){a.removeAttribute("data-rf-appui");});appuis.clear();}
  function effacer(m){
    file=m?file.filter(function(e){return e.m!==m;}):[];
    impacts.forEach(function(e,b){if(!m || e.m===m){e.point.style.opacity="0";impacts.delete(b);}});
    if(!file.length && !impacts.size)arreterBoucle();
  }
  function vueMasquee(){
    return horsPage || document.hidden || document.body.inert || document.body.classList.contains("ensemble") ||
      document.body.classList.contains("menu-ouvert") || document.body.classList.contains("chargement-projet") ||
      (typeof PROJET_EN_COURS!=="undefined" && !!PROJET_EN_COURS) ||
      panneaux.some(function(e){return !e.hidden && !e.classList.contains("hide") && getComputedStyle(e).display!=="none";});
  }
  function sens(m){return m==="ko"?KO_MODE+":"+!!KO.chroma+":"+KO.chromaSource:m;}
  function synchroniser(sansReveil){
    var nouveau=S.modele,ancien=mode;mode=nouveau;
    var cache=vueMasquee() || !racines[mode] || !racines[mode].offsetWidth;
    var sig=sens(mode);
    if(cache){effacer();relacherTout();}
    else if(masque!==cache || ancien!==mode || sig!==signature){
      impacts.forEach(function(e){e.point.style.opacity="0";});impacts.clear();relacherTout();
      /* Garder une première note reçue dans la même tâche que l'ouverture. */
      file=file.filter(function(e){return e.m===mode && e.sig===sig;});
      if(!file.length)arreterBoucle();
    }
    masque=cache;signature=sig;
    if(sansReveil!==true)prochain();
  }
  function visible(b,m){
    if(!b || !b.isConnected || !racines[m])return false;
    var r=b.getBoundingClientRect(),u=racines[m].getBoundingClientRect();
    return r.width>0 && r.height>0 && r.bottom>Math.max(0,u.top) && r.top<Math.min(innerHeight,u.bottom) &&
      r.right>Math.max(0,u.left) && r.left<Math.min(innerWidth,u.right);
  }
  function suivre(c){
    if(contexte===c)return;
    effacer();
    if(contexte)contexte.removeEventListener("statechange",etatAudio);
    contexte=c;if(contexte)contexte.addEventListener("statechange",etatAudio);
  }
  function etatAudio(){if(!contexte || contexte.state!=="running")effacer();}
  function cible(e){
    var k=e.k;
    if(e.m==="ko"){
      if(KO_MODE!=="son")return null;
      if(KO.chroma){
        if(k!==KO.chromaSource || !Number.isInteger(e.note) || e.note < -7 || e.note > 8)return null;
        k=e.note+7;
      }
    }
    return groupes[e.m] && groupes[e.m].children[k];
  }
  function prochain(){
    if(raf!==null || minuterie!==null || masque || (!file.length && !impacts.size))return;
    var delai=!impacts.size && file.length && contexte ? file[0].t-contexte.currentTime:0;
    if(delai>.05){
      /* Une seule attente pour le prochain départ, pas un minuteur par note. */
      minuterie=setTimeout(function(){minuterie=null;prochain();},Math.min(1000,Math.max(1,(delai-.012)*1000)));
    }else raf=requestAnimationFrame(tour);
  }
  function programmer(m,c,t,k,note){
    if(!racines[m] || !c || c.startRendering || c!==ctx || c.state!=="running" ||
      !Number.isFinite(t) || !Number.isInteger(k) || k<0 || k>=(m==="ko"?16:m==="mc"?4:10))return;
    /* Aucun calcul de style/géométrie dans le rappel du moteur audio. */
    if(S.modele!==m || document.hidden || horsPage || document.body.inert ||
      document.body.classList.contains("menu-ouvert") || document.body.classList.contains("note-ouverte"))return;
    suivre(c);
    var maintenant=c.currentTime;
    if(t<maintenant-PERIME || t>maintenant+60){ignores++;return;}
    var e={m:m,t:Math.max(maintenant,t),dateSource:t,k:k,note:note,sig:sens(m)};
    /* v271 : reconnaître l'unisson par sa date audio d'origine, pas par
       l'heure de réception : currentTime peut avancer entre ses deux voix.
       Deux vrais départs proches restent distincts, même reçus en retard. */
    if(file.some(function(a){return a.m===m && a.k===k && a.note===note && a.sig===e.sig && Math.abs(a.dateSource-e.dateSource)<.0001;}))return;
    file.push(e);file.sort(function(a,b){return a.t-b.t;});
    if(file.length>MAX){file.pop();ignores++;}
    if(minuterie!==null){clearTimeout(minuterie);minuterie=null;}
    if(raf===null && masque)raf=requestAnimationFrame(tour);else prochain();
  }
  function allumer(e,maintenant){
    if(e.sig!==signature)return;
    var b=cible(e);if(!visible(b,e.m))return;
    var point=b.querySelector(".rf-impact");
    if(!point){
      point=document.createElement("span");point.className="rf-impact";
      point.setAttribute("aria-hidden","true");b.appendChild(point);
    }
    var actif=impacts.get(b);
    /* Une rafale prolonge un point déjà allumé plutôt que de clignoter. */
    if(actif && maintenant-actif.debut<.06){actif.fin=maintenant+DUREE;}
    else impacts.set(b,{m:e.m,point:point,debut:maintenant,fin:maintenant+DUREE});
    signaux++;
  }
  function tour(t){
    raf=null;synchroniser(true);
    if(masque || !contexte || contexte!==ctx || contexte.state!=="running" || contexte.startRendering){effacer();return;}
    if(t-dernier<30){prochain();return;}dernier=t;frames++;
    var maintenant=contexte.currentTime;
    while(file.length && file[0].t<=maintenant){
      var e=file.shift();if(maintenant-e.t<=PERIME)allumer(e,maintenant);else ignores++;
    }
    impacts.forEach(function(e,b){
      if(!b.isConnected || !e.point.isConnected || maintenant>=e.fin){e.point.style.opacity="0";impacts.delete(b);return;}
      var v=reduire.matches?1:Math.min(1,(e.fin-maintenant)/DUREE);
      var s=v.toFixed(3);if(e.point.style.opacity!==s)e.point.style.opacity=s;
    });
    prochain();
  }
  function bouton(t){
    return t && t.closest?t.closest("#unit-ko button,#unit-mc button,#unit-stk button"):null;
  }
  function prendre(id,b){
    synchroniser();if(masque || !b || b.disabled || b.getAttribute("aria-disabled")==="true" || !visible(b,mode))return;
    appuis.set(id,b);b.setAttribute("data-rf-appui","1");
  }
  document.addEventListener("pointerdown",function(e){
    if(e.button!==0)return;
    /* Le pincement natif est prioritaire : on n'en capture aucun événement. */
    if(typeof PINCE!=="undefined" && PINCE){relacherTout();return;}
    prendre(e.pointerId,bouton(e.target));
  },{capture:true,passive:true});
  ["pointerup","pointercancel","lostpointercapture"].forEach(function(n){
    document.addEventListener(n,function(e){relacher(e.pointerId);},{capture:true,passive:true});
  });
  document.addEventListener("pointermove",function(e){
    var b=appuis.get(e.pointerId);if(!b)return;
    var r=b.getBoundingClientRect();
    if((typeof PINCE!=="undefined" && PINCE) || e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom)relacher(e.pointerId);
  },{capture:true,passive:true});
  document.addEventListener("keydown",function(e){
    if((e.key===" " || e.key==="Enter") && !e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey)prendre("clavier",bouton(e.target));
  },{capture:true,passive:true});
  document.addEventListener("keyup",function(e){if(e.key===" " || e.key==="Enter")relacher("clavier");},{capture:true,passive:true});
  document.addEventListener("focusout",function(){relacher("clavier");},{passive:true});
  var observer=new MutationObserver(synchroniser);
  observer.observe(document.body,{attributes:true,attributeFilter:["class","inert"]});
  panneaux.forEach(function(e){observer.observe(e,{attributes:true,attributeFilter:["class","hidden","style"]});});
  Object.keys(racines).forEach(function(m){if(racines[m])observer.observe(racines[m],{attributes:true,attributeFilter:["class","style"]});});
  ["click","change","pointerup","keyup"].forEach(function(n){document.addEventListener(n,synchroniser,{passive:true});});
  document.addEventListener("scroll",function(){effacer();relacherTout();},{capture:true,passive:true});
  document.addEventListener("visibilitychange",function(){effacer();relacherTout();synchroniser();});
  window.addEventListener("blur",function(){effacer();relacherTout();});
  window.addEventListener("resize",function(){effacer();relacherTout();synchroniser();},{passive:true});
  window.addEventListener("pagehide",function(){horsPage=true;synchroniser();});
  window.addEventListener("pageshow",function(){horsPage=false;synchroniser();});
  if(reduire.addEventListener)reduire.addEventListener("change",function(){effacer();});
  synchroniser();
  return {programmer:programmer,effacer:effacer,synchroniser:synchroniser,
    inspecter:function(){return {version:271,mode:mode,masque:masque,file:file.length,impacts:impacts.size,appuis:appuis.size,
      enAttente:raf!==null || minuterie!==null,frames:frames,signaux:signaux,ignores:ignores,reduction:reduire.matches};}};
})();
