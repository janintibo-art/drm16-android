/* v268 — Afficheurs de performance en lecture seule.
   Pas de schedule(), voix, RNG, AudioNode, mémoire ou normalisation musicale.
   Le SCATTER montre sa zone d'action : il n'effectue PAS un second tirage au sort.
   Les barres restent l'aperçu du clip/motif avant les effets. */
var ECRANS_PERFORMANCE=(function(){
  "use strict";
  var raf=null,frames=0,horsPage=false,contexte=null,actuel=null,resume=null;
  var panneaux=["menu","note","bib","enr","pr","table","syro","studio","nexus","audio-diagnostic"]
    .map(function(id){return document.getElementById(id);}).filter(Boolean);
  function el(id){return document.getElementById(id);}
  function texte(e,t){t=String(t);if(e.textContent!==t)e.textContent=t;}
  function attribut(e,k,v){v=String(v);if(e.getAttribute(k)!==v)e.setAttribute(k,v);}
  function entier(n,min,max){return Number.isInteger(n) && n>=min && n<=max;}
  function fini(n){return typeof n==="number" && Number.isFinite(n);}
  function deux(n){return String(n).padStart(2,"0");}
  function creer(tag,classe,parent,t){var e=document.createElement(tag);e.className=classe;if(t!==undefined)e.textContent=t;if(parent)parent.appendChild(e);return e;}
  function monter(modele){
    var racine=el("unit-"+modele),lcd=racine.querySelector("."+modele+"-lcd"),tete=lcd.parentNode;
    lcd.classList.add("ep-lcd");tete.classList.add("ep-tete");
    var bloc=creer("div","ep-ecran",lcd);bloc.id="ep-ecran-"+modele;
    bloc.setAttribute("role","group");bloc.setAttribute("aria-live","off");
    var bandeau=creer("div","ep-bandeau",bloc),mode=creer("span","ep-badge ep-mode",bandeau),transport=creer("span","ep-badge ep-transport",bandeau);
    var infos=creer("div","ep-contexte",bloc),selection=creer("span","ep-selection",infos),position=creer("span","ep-position",infos);
    var source=creer("div","ep-source",bloc),regle=creer("div","ep-regle",bloc);
    regle.setAttribute("aria-hidden","true");[1,5,9,13].forEach(function(n){creer("span","",regle,String(n));});
    var pas=creer("div","ep-pas",bloc),marques=creer("div","ep-marques",bloc),cases=[],traits=[];
    pas.setAttribute("aria-hidden","true");marques.setAttribute("aria-hidden","true");
    for(var i=0;i<16;i++){cases.push(creer("span","ep-case",pas));traits.push(creer("span","ep-marque",marques));}
    var info=creer("div","ep-info",bloc),suite=creer("div","ep-suite",bloc);
    return {modele:modele,racine:racine,lcd:lcd,tete:tete,bloc:bloc,mode:mode,transport:transport,
      selection:selection,position:position,source:source,pas:pas,marques:marques,cases:cases,traits:traits,info:info,suite:suite};
  }
  var ecrans={ko:monter("ko"),mc:monter("mc")};
  function masque(){
    return horsPage || document.hidden || document.body.inert || document.body.classList.contains("ensemble") ||
      document.body.classList.contains("menu-ouvert") || document.body.classList.contains("chargement-projet") ||
      (typeof PROJET_EN_COURS!=="undefined" && !!PROJET_EN_COURS) || (ctx && !!ctx.startRendering) ||
      panneaux.some(function(e){return !e.hidden && !e.classList.contains("hide") && getComputedStyle(e).display!=="none";});
  }
  function enVue(e){
    if(!e || !e.racine.offsetWidth)return false;
    var r=e.lcd.getBoundingClientRect(),u=e.racine.getBoundingClientRect();
    return r.width>0 && r.height>0 && r.bottom>Math.max(0,u.top) && r.top<Math.min(innerHeight,u.bottom) && r.right>0 && r.left<innerWidth;
  }
  function lecture(modele){
    var machine=modele==="ko"?MACHINE_KO:MACHINE_MC;
    return !!(S.run && ctx && ctx.state==="running" && !ctx.startRendering &&
      (MACHINE===machine || (typeof SET!=="undefined" && SET.on && SET.actives[modele])));
  }
  function suivreContexte(){
    if(contexte===ctx)return;
    if(contexte && contexte.removeEventListener)contexte.removeEventListener("statechange",reveiller);
    contexte=ctx;
    if(contexte && contexte.addEventListener && !contexte.startRendering)contexte.addEventListener("statechange",reveiller);
  }
  function transport(e,joue,rec,micro){
    var code=micro?"micro":rec?(joue?"rec":"arme"):joue?"play":S.run && ctx && ctx.state!=="running"?"pause":"stop";
    var noms={micro:"MIC REC",rec:"REC",arme:"REC ARMÉ",play:"PLAY",pause:"AUDIO PAUSE",stop:"STOP"};
    attribut(e.bloc,"data-ep-transport",code);texte(e.transport,noms[code]);return code;
  }
  function grille(e,notes,fx,locks,zone,pas,last){
    for(var i=0;i<16;i++){
      e.cases[i].classList.toggle("ep-note",i<last && !!notes[i]);
      e.cases[i].classList.toggle("ep-inactif",i>=last);
      e.cases[i].classList.toggle("ep-courant",i===pas);
      e.traits[i].classList.toggle("ep-fx-memo",i<last && !!fx[i]);
      e.traits[i].classList.toggle("ep-lock",i<last && !!locks[i]);
      e.traits[i].classList.toggle("ep-zone",!!zone[i]);
      e.traits[i].classList.toggle("ep-zone-active",!!zone[i] && i===pas);
    }
    texte(e.position,"PAS "+(pas>=0?deux(pas+1):"—")+"/"+deux(last));
  }
  function nomSon(id){
    /* nomBib ne fait qu'une lecture de BIB.noms/ES.noms. Aucun chargement ici. */
    return id?(typeof nomBib==="function"?nomBib(id):String(id)):"EMPLACEMENT VIDE";
  }
  function peindreKo(e){
    var joue=lecture("ko"),m=KO.motifs[KO.cur] || {},last=entier(m.last,1,16)?m.last:16;
    var pas=joue && entier(KO.pos,0,last-1)?KO.pos:-1;
    var sel=KO.chroma?KO.chromaSource:KO.sel;
    var notes=[],fx=[],locks=[],masques=m.pas || [],verrous=m.plocks || [],effets=m.fx || [];
    for(var i=0;i<16;i++){
      notes[i]=KO_MODE==="ptn"?masques.some(function(v){return !!(v & (1<<i));}):!!(masques[sel] & (1<<i));
      fx[i]=entier(effets[i],0,KO_FX.length-2);
      var v=verrous[i];locks[i]=!!v && KO_PLOCKS.some(function(p){return fini(v[p[0]]);});
    }
    var mode=KO_MODE==="ptn"?"PATTERN":KO_MODE==="fx"?"FX":KO.chroma?"CHROMA":"SOUND";
    var prise=typeof KO_ECH!=="undefined" && !!KO_ECH.prise;
    var etat=transport(e,joue,!!KO.rec,prise);
    texte(e.mode,mode);texte(e.selection,"P"+deux(KO.cur+1)+" · SON "+deux(sel+1));
    var source=(KO_MODE==="ptn"?"TOUS LES SONS":sel<8?"MÉLODIE":"PERCUSSION")+" · "+nomSon(KO.sons[sel]);
    texte(e.source,source);attribut(e.source,"title",source);
    grille(e,notes,fx,locks,[],pas,last);
    var nbFx=fx.slice(0,last).filter(Boolean).length,nbLocks=locks.slice(0,last).filter(Boolean).length;
    var live=!!KO.fxTenu,fxIndex=live?(entier(KO.fx,0,KO_FX.length-2)?KO.fx:-1):pas>=0 && fx[pas]?effets[pas]:-1;
    var fxTexte=live?(joue?"FX LIVE · ":"FX ARMÉ · ")+(fxIndex>=0?KO_FX[fxIndex][1]:"NEUTRE"):
      fxIndex>=0?"FX MÉM. · "+KO_FX[fxIndex][1]:"FX MÉM. "+nbFx+"/"+last+" · LOCKS "+nbLocks+"/"+last;
    texte(e.info,fxTexte);
    var chaine=KO.song && KO.chaine.length?"CHAÎNE "+(KO.chainePos+1)+"/"+KO.chaine.length+" · ":"";
    texte(e.suite,chaine+"■ notes · ● FX · | locks");
    attribut(e.bloc,"aria-label","Aperçu du motif avant les effets. "+mode+". "+e.selection.textContent+". "+e.position.textContent+". "+fxTexte);
    return {modele:"ko",mode:mode,transport:etat,pas:pas,last:last,selection:sel,motif:KO.cur,
      notes:notes,fx:fx,locks:locks,fxIndex:fxIndex,fxLive:live,chaine:chaine};
  }
  function peindreMc(e){
    var joue=lecture("mc"),P=MC.pistes[MC.sel],clip=P.clips[P.clip] || [];
    var pas=joue && entier(MC.pos,0,15)?MC.pos:-1;
    var prof=fini(MC.scatProf)?Math.max(0,Math.min(1,MC.scatProf)):0;
    var seuil=Math.round((1-prof)*16),zone=[],notes=[];
    for(var i=0;i<16;i++){
      notes[i]=!P.looper && entier(clip[i],0,127);
      zone[i]=!!(MC.scatOn && !P.looper && !P.muet && i>=seuil);
    }
    var z=P.looper?"looper":P.muet?"muet":!MC.scatOn?"off":seuil===16?"vide":pas<0?"arme":zone[pas]?"active":"hors-zone";
    var etat=transport(e,joue,false,false),type=P.looper?"LOOPER":P.type==="drum"?"RYTHME":P.ech?"SAMPLE":"SYNTHÉ";
    texte(e.mode,type);texte(e.selection,"PISTE "+deux(MC.sel+1)+" · CLIP "+deux(P.clip+1));
    var source=P.looper?(P.boucles[P.clip]?nomSon(P.boucles[P.clip]):"BOUCLE VIDE"):
      P.type==="drum"?"GC · CC · CH · CL":P.ech?nomSon(P.ech):String(P.onde || "SYNTHÉ").toUpperCase();
    texte(e.source,source);attribut(e.source,"title",source);
    grille(e,notes,[],[],zone,pas,16);
    var messages={looper:"LOOPER · SCATTER IGNORÉ",muet:"MUTE · SCATTER INACTIF",off:"SCATTER OFF",
      vide:"SCATTER · ZONE VIDE",arme:"SCATTER ARMÉ",active:"SCATTER · ZONE ACTIVE","hors-zone":"SCATTER · HORS ZONE"};
    texte(e.info,messages[z]+(!P.looper?" · PROF. "+Math.round(prof*100)+"%":""));
    attribut(e.bloc,"data-ep-zone",z);attribut(e.tete,"data-ep-zone",z);
    var futur=MC.depart && MC.depart.clips?MC.depart.clips[MC.sel]:MC.attente[MC.sel];
    var attente=entier(futur,0,MC_CLIPS-1) && futur!==P.clip;
    texte(e.suite,attente?(MC.depart?"DÉPART IMMINENT":"EN ATTENTE")+" → CLIP "+deux(futur+1):
      P.looper?"UNE MESURE · PAS DE CLIP DE NOTES":"■ notes · trait : zone SCATTER");
    attribut(e.bloc,"aria-label","Aperçu du clip avant SCATTER. "+e.selection.textContent+". "+e.position.textContent+". "+e.info.textContent+". "+e.suite.textContent);
    return {modele:"mc",mode:type,transport:etat,pas:pas,last:16,selection:MC.sel,clip:P.clip,
      notes:notes,zone:zone,etatZone:z,profondeur:prof,seuil:seuil,attente:attente?futur:null};
  }
  function arreter(){if(raf!==null)cancelAnimationFrame(raf);raf=null;}
  function tour(){
    raf=null;if(!actuel || masque() || !enVue(actuel))return;
    frames++;resume=actuel.modele==="ko"?peindreKo(actuel):peindreMc(actuel);
  }
  function reveiller(){
    suivreContexte();actuel=ecrans[S.modele] || null;
    if(!actuel || masque() || !enVue(actuel)){arreter();return;}
    if(raf===null)raf=requestAnimationFrame(tour);
  }
  var observer=new MutationObserver(reveiller);
  /* Seulement le DOM natif : nos propres libellés ne peuvent relancer le dessin. */
  ["ko-val","ko-lab","ko-bpm","mc-val","mc-lab","mc-lancement-etat","mc-source","mc-boucle-info"].forEach(function(id){
    var n=el(id);if(n)observer.observe(n,{childList:true,characterData:true,subtree:true});
  });
  ["ko-rec","ko-sampling","mc-scat"].forEach(function(id){observer.observe(el(id),{attributes:true,attributeFilter:["class","aria-pressed"]});});
  [MACHINE_KO,MACHINE_MC].forEach(function(machine){
    var natif=machine.beat;
    machine.beat=function(){var r=natif.apply(this,arguments);reveiller();return r;};
  });
  observer.observe(document.body,{attributes:true,attributeFilter:["class","inert"]});
  panneaux.forEach(function(n){observer.observe(n,{attributes:true,attributeFilter:["class","hidden"]});});
  ["click","pointerdown","pointerup","pointercancel","input","change","keyup"].forEach(function(n){document.addEventListener(n,reveiller,{passive:true});});
  document.addEventListener("scroll",reveiller,{passive:true,capture:true});
  document.addEventListener("visibilitychange",function(){arreter();reveiller();});
  window.addEventListener("resize",reveiller,{passive:true});
  window.addEventListener("pagehide",function(){horsPage=true;arreter();});
  window.addEventListener("pageshow",function(){horsPage=false;reveiller();});
  reveiller();
  return {reveiller:reveiller,inspecter:function(){return {version:268,frames:frames,enAttente:raf!==null,
    visible:!!(actuel && !masque() && enVue(actuel)),resume:resume?JSON.parse(JSON.stringify(resume)):null};}};
})();
