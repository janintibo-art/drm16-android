/* v269 — Écran SmplTrek en lecture seule.
   L'onde représente le tampon ORIGINAL avant filtre/gain, pas un VU-mètre.
   Le curseur reçoit les départs effectivement programmés par voixStk : aucune
   seconde programmation, aucun tirage aléatoire, aucun changement des données.
   Horloge du moteur, hors latence de la sortie / Bluetooth. Une seule voix
   (la dernière encore active) est dessinée ; le nombre de superpositions est donné.
*/
var ONDE_STK=(function(){
  "use strict";
  var racine=document.getElementById("unit-stk"),cv=document.getElementById("stk-ecran");
  if(!racine || !cv)return null;
  var raf=null,frames=0,calculs=0,echantillons=0,dessins=0,dernier=0,sale=true,horsPage=false;
  var contexte=null,files=Array.from({length:10},function(){return [];}),cacheOndes=new WeakMap();
  var job=null,forme=null,cleFond="",resume=null;
  var reduire=window.matchMedia("(prefers-reduced-motion: reduce)");
  var panneaux=["menu","note","bib","enr","pr","table","syro","studio","nexus","audio-diagnostic"]
    .map(function(id){return document.getElementById(id);}).filter(Boolean);
  function creer(tag,classe,parent,txt){var e=document.createElement(tag);e.className=classe;if(txt!==undefined)e.textContent=txt;if(parent)parent.appendChild(e);return e;}
  function texte(e,t){t=String(t);if(e.textContent!==t)e.textContent=t;}
  function attribut(e,n,v){v=String(v);if(e.getAttribute(n)!==v)e.setAttribute(n,v);}
  function nombre(n){return typeof n==="number" && Number.isFinite(n);}
  function borne(n,a,b){return Math.max(a,Math.min(b,n));}
  function deux(n){return String(n).padStart(2,"0");}
  function secondes(n){return (nombre(n)?Math.max(0,n):0).toFixed(2).replace(".",",")+" s";}
  var ecran=creer("div","",null);ecran.id="stk-afficheur";
  ecran.setAttribute("role","group");ecran.setAttribute("aria-live","off");
  cv.parentNode.insertBefore(ecran,cv);
  var entete=creer("div","sw-entete",ecran),titre=creer("span","sw-titre",entete),transport=creer("span","sw-transport",entete);
  var source=creer("div","sw-source",ecran),zone=creer("div","sw-onde",ecran);
  zone.appendChild(cv);cv.setAttribute("role","img");cv.setAttribute("aria-label","Forme d'onde du son, avant filtre et niveau");
  var selection=creer("div","sw-zone",zone),jouee=creer("div","sw-zone-jouee",zone),curseur=creer("div","sw-curseur",zone),absence=creer("div","sw-attente",zone);
  [selection,jouee,curseur].forEach(function(e){e.hidden=true;e.setAttribute("aria-hidden","true");});
  var temps=creer("div","sw-temps",ecran),debut=creer("span","",temps),duree=creer("span","",temps);
  var grille=creer("div","sw-grille",ecran),cases=[];grille.setAttribute("aria-hidden","true");
  for(var z=0;z<16;z++)cases.push(creer("span","sw-pas",grille));
  var legende=creer("div","sw-legende",ecran),position=creer("span","",legende),statut=creer("span","sw-statut",legende);
  var info=creer("div","sw-info",ecran),suite=creer("div","sw-suite",ecran);
  function masque(){
    return horsPage || document.hidden || document.body.inert || document.body.classList.contains("ensemble") ||
      document.body.classList.contains("menu-ouvert") || document.body.classList.contains("chargement-projet") ||
      (typeof PROJET_EN_COURS!=="undefined" && !!PROJET_EN_COURS) || (ctx && !!ctx.startRendering) ||
      panneaux.some(function(e){return !e.hidden && !e.classList.contains("hide") && getComputedStyle(e).display!=="none";});
  }
  function visible(){
    if(S.modele!=="stk" || masque() || !racine.offsetWidth)return false;
    var r=ecran.getBoundingClientRect(),u=racine.getBoundingClientRect();
    return r.width>0 && r.height>0 && r.bottom>Math.max(0,u.top) && r.top<Math.min(innerHeight,u.bottom) && r.right>0 && r.left<innerWidth;
  }
  function suivreContexte(){
    if(contexte===ctx)return;
    if(contexte && contexte.removeEventListener)contexte.removeEventListener("statechange",reveiller);
    contexte=ctx;files.forEach(function(f){f.length=0;});
    if(contexte && !contexte.startRendering && contexte.addEventListener)contexte.addEventListener("statechange",reveiller);
  }
  function arreter(){if(raf!==null)cancelAnimationFrame(raf);raf=null;}
  function reveiller(){
    suivreContexte();sale=true;
    if(!visible()){arreter();job=null;return;}
    if(raf===null)raf=requestAnimationFrame(tour);
  }
  function effacer(){files.forEach(function(f){f.length=0;});reveiller();}
  function programmer(c,piste,id,buf,t,offset,vitesse,dureeVoix,tranche,note){
    if(c!==ctx || c.startRendering || !buf || !Number.isInteger(piste) || piste<0 || piste>=10 ||
      !nombre(t) || !nombre(offset) || !nombre(vitesse) || vitesse<=0 || !nombre(dureeVoix) || dureeVoix<=0)return;
    suivreContexte();var now=c.currentTime;
    /* start(t) dans le passé démarre immédiatement. Les dates futures restent
       futures : le look-ahead du séquenceur ne doit jamais avancer le curseur. */
    var finProgramme=t+dureeVoix;
    t=Math.max(now,t);var fin=Math.min(finProgramme,t+Math.max(0,(buf.duration-offset)/vitesse));
    if(fin<=t)return;
    var f=files[piste].filter(function(v){return v.fin>now;});
    f.push({id:id,buf:buf,t:t,fin:fin,offset:offset,vitesse:vitesse,tranche:tranche,note:note});
    /* Mémoire bornée, même pour un flux MIDI très dense. Pas de référence au
       BufferSource ni au graphe audio : le dessin ne peut les déconnecter. */
    if(f.length>64)f.splice(0,f.length-64);files[piste]=f;
    if(S.modele==="stk" && piste===STK.sel)reveiller();
  }
  function prendreForme(buf){
    if(!buf){forme=null;job=null;return;}
    var f=cacheOndes.get(buf);
    if(!f){
      var canaux=Math.min(2,buf.numberOfChannels),cols=Math.min(320,buf.length);
      f={buf:buf,cols:cols,canaux:canaux,min:[],max:[],canal:0,index:0,version:0,fini:false};
      for(var c=0;c<canaux;c++){f.min.push(new Float32Array(cols).fill(Infinity));f.max.push(new Float32Array(cols).fill(-Infinity));}
      cacheOndes.set(buf,f);calculs++;
    }
    if(forme!==f)cleFond="";forme=f;job=f.fini?null:f;
  }
  function avancerForme(){
    if(!job)return;
    var f=job,budget=65536,n=f.buf.length;
    /* Min ET max, canaux séparés : aucune annulation d'une stéréo en opposition
       de phase. Travail fractionné, jamais le fichier entier sur une frame. */
    while(budget>0 && f.canal<f.canaux){
      var d=f.buf.getChannelData(f.canal),fin=Math.min(n,f.index+budget),j=f.index;
      for(;j<fin;j++){
        var k=Math.min(f.cols-1,Math.floor(j*f.cols/n)),v=d[j];
        if(!Number.isFinite(v))v=0;
        if(v<f.min[f.canal][k])f.min[f.canal][k]=v;
        if(v>f.max[f.canal][k])f.max[f.canal][k]=v;
      }
      var lu=fin-f.index;echantillons+=lu;budget-=lu;f.index=fin;
      if(f.index===n){f.canal++;f.index=0;}
    }
    f.version++;f.fini=f.canal>=f.canaux;if(f.fini)job=null;
  }
  function peindreFond(){
    var w=Math.max(1,Math.round(zone.clientWidth)),h=Math.max(1,Math.round(zone.clientHeight));
    var dpr=borne(window.devicePixelRatio || 1,1,2),W=Math.round(w*dpr),H=Math.round(h*dpr);
    var cle=[w,h,dpr,forme?forme.version:0,forme?forme.canaux:0].join(":");
    if(cle===cleFond)return;cleFond=cle;dessins++;
    if(cv.width!==W)cv.width=W;if(cv.height!==H)cv.height=H;
    var g=cv.getContext("2d");g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
    var c,canaux=forme?forme.canaux:1;
    g.fillStyle="#273425";for(var a=1;a<8;a++)g.fillRect(Math.round(w*a/8),0,1,h);
    for(c=0;c<canaux;c++){
      var bande=h/canaux,mi=bande*(c+.5),demi=bande/2-6;
      g.fillStyle="#526442";g.fillRect(0,Math.round(mi),w,1);
      if(forme){
        g.fillStyle=c===0?"#d5d878":"#96c69e";
        for(var i=0;i<forme.cols;i++){
          var lo=forme.min[c][i],hi=forme.max[c][i];if(!Number.isFinite(lo)||!Number.isFinite(hi))continue;
          var x=i*w/forme.cols,y=mi-borne(hi,-1,1)*demi,bas=mi-borne(lo,-1,1)*demi;
          g.fillRect(x,y,Math.max(1,w/forme.cols),Math.max(1,bas-y));
        }
      }
      g.fillStyle="#0a130ccc";g.fillRect(2,c*bande+2,canaux===1?38:16,14);
      g.fillStyle="#d9e5c6";g.font="600 11px Arial";g.fillText(canaux===1?"MONO":c===0?"G":"D",5,c*bande+13);
    }
  }
  function jouer(){return !!(S.run && ctx && ctx.state==="running" && !ctx.startRendering &&
    (MACHINE===MACHINE_STK || (typeof SET!=="undefined" && SET.on && SET.actives.stk)));}
  function afficher(now){
    var P=pisteStkSel(),m=motifStkCur(),buf=ES.buf[P.ech] || null,last=borne(m.last || 16,1,16);
    var active=files[STK.sel].filter(function(v){return v.fin>now && v.buf===buf && v.id===P.ech;});
    files[STK.sel]=active;
    var enCours=active.filter(function(v){return v.t<=now;}),v=null;
    enCours.forEach(function(n){if(!v || n.t>=v.t)v=n;});
    var lecture=jouer(),pause=!!(ctx && ctx.state!=="running" && (S.run || active.length));
    var code=pause?"pause":lecture?"play":v?"ecoute":"stop";
    var pas=lecture && Number.isInteger(STK.pos) && STK.pos>=0 && STK.pos<last?STK.pos:-1;
    texte(titre,"PISTE "+deux(STK.sel+1)+" · "+(P.type==="instrument"?"INST":"SHOTS"));
    texte(transport,{play:"PLAY",ecoute:"ÉCOUTE",pause:"AUDIO PAUSE",stop:"STOP"}[code]);attribut(ecran,"data-sw-transport",code);
    var nom=nomBib(P.ech);texte(source,nom);attribut(source,"title",nom);
    var region=buf?bornesTrancheStk(buf,P.slice?P.tranche:-1):null;
    selection.hidden=!region;
    if(region){
      selection.style.left=(region.debut/buf.length*100)+"%";
      var vitesseChoix=Math.pow(2,(P.tune-.5)*2+(P.type==="instrument"?noteInstrumentStk(P.note)/12:0));
      var portionChoix=(region.fin-region.debut)/buf.sampleRate;
      var tempsChoix=P.slice?portionChoix/vitesseChoix*Math.max(.05,P.dec):Math.max(.03,buf.duration/vitesseChoix*Math.max(.05,P.dec));
      selection.style.width=(Math.min(portionChoix,tempsChoix*vitesseChoix)/buf.duration*100)+"%";
    }
    curseur.hidden=!v;jouee.hidden=!v;
    var fraction=null;
    if(v){
      fraction=borne((v.offset+(now-v.t)*v.vitesse)/buf.duration,0,1);
      curseur.style.transform="translateX("+Math.min(Math.max(0,zone.clientWidth-2),fraction*zone.clientWidth).toFixed(2)+"px)";
      jouee.style.left=(v.offset/buf.duration*100)+"%";
      jouee.style.width=((v.fin-v.t)*v.vitesse/buf.duration*100)+"%";
    }
    absence.hidden=!!(buf && forme && forme.fini);
    texte(absence,!buf?"SON INDISPONIBLE":forme && !forme.fini?"CALCUL DE L’APERÇU…":"");
    texte(debut,v?secondes(v.offset+(now-v.t)*v.vitesse):"0,00 s");
    texte(duree,buf?secondes(buf.duration)+" · "+(buf.numberOfChannels===1?"MONO":"STÉRÉO") : "—");
    for(var i=0;i<16;i++){
      cases[i].classList.toggle("sw-note",i<last && !!(m.pas[STK.sel] & (1<<i)));
      cases[i].classList.toggle("sw-inactif",i>=last);cases[i].classList.toggle("sw-courant",i===pas);
    }
    texte(position,"P"+deux(STK.cur+1)+" · PAS "+(pas<0?"—":deux(pas+1))+"/"+deux(last));
    var passe=passeStk(STK.sel),etat=STK.solo===STK.sel?"SOLO":passe?"PISTE ACTIVE":"MUTE";
    texte(statut,etat);attribut(ecran,"data-sw-muet",passe?"0":"1");
    var choix=P.slice?"TRANCHE "+(P.tranche+1)+"/8":"SON ENTIER";
    var jouant=v?(v.tranche>=0?"TR "+(v.tranche+1):"ENTIER")+(v.note?" · "+(v.note>0?"+":"")+v.note+" st":""):"";
    var message=v?"LECTURE "+jouant+(enCours.length>1?" · "+enCours.length+" VOIX":""):
      choix+" · DECAY "+Math.round(P.dec*100)+"%";
    texte(info,message);attribut(info,"title",message);
    var futur=STK.depart?STK.depart.motif:STK.attente;
    var suivant=Number.isInteger(futur) && futur>=0 && futur<STK_MOTIFS && futur!==STK.cur;
    var ch=suivant?(STK.depart?"DÉPART IMMINENT":"EN ATTENTE")+" → P"+deux(futur+1):
      STK.song && STK.chaine.length?"CHAÎNE "+(STK.chainePos+1)+"/"+STK.chaine.length+" · "+choix:
      "JAUNE : CHOIX · TRAIT CLAIR : LECTURE";
    texte(suite,ch);attribut(suite,"title",ch);
    attribut(ecran,"aria-label","Échantillon avant filtre et niveau. "+titre.textContent+". "+nom+". "+position.textContent+". "+etat+". "+message+". "+ch);
    resume={piste:STK.sel,motif:STK.cur,last:last,pas:pas,transport:code,muet:!passe,solo:STK.solo===STK.sel,
      son:P.ech,disponible:!!buf,canaux:buf?buf.numberOfChannels:0,duree:buf?buf.duration:0,
      tranche:P.slice?P.tranche:-1,voix:enCours.length,curseur:fraction,
      trancheJouee:v?v.tranche:null,noteJouee:v?v.note:null,vitesse:v?v.vitesse:null,
      futur:suivant?futur:null,formePrete:!!(forme && forme.fini)};
    return !!(active.length && ctx && ctx.state==="running");
  }
  function tour(t){
    raf=null;if(!visible()){job=null;return;}
    var intervalle=reduire.matches?120:32;
    if(!sale && t-dernier<intervalle){raf=requestAnimationFrame(tour);return;}
    dernier=t;sale=false;frames++;
    var P=pisteStkSel();prendreForme(ES.buf[P.ech] || null);avancerForme();peindreFond();
    var continuer=afficher(ctx?ctx.currentTime:0);
    if(job || continuer)raf=requestAnimationFrame(tour);
  }
  var observer=new MutationObserver(reveiller);
  ["stk-source","stk-etat","stk-lancement-etat","stk-chaine-etat"].forEach(function(id){
    var n=document.getElementById(id);if(n)observer.observe(n,{childList:true,characterData:true,subtree:true});
  });
  observer.observe(document.body,{attributes:true,attributeFilter:["class","inert"]});
  panneaux.forEach(function(n){observer.observe(n,{attributes:true,attributeFilter:["class","hidden"]});});
  var beatNatif=MACHINE_STK.beat;
  MACHINE_STK.beat=function(){var r=beatNatif.apply(this,arguments);reveiller();return r;};
  ["click","pointerup","pointercancel","input","change","keyup"].forEach(function(n){document.addEventListener(n,reveiller,{passive:true});});
  document.addEventListener("scroll",reveiller,{capture:true,passive:true});
  document.addEventListener("visibilitychange",reveiller);
  window.addEventListener("resize",function(){cleFond="";reveiller();},{passive:true});
  window.addEventListener("pagehide",function(){horsPage=true;arreter();job=null;});
  window.addEventListener("pageshow",function(){horsPage=false;reveiller();});
  if(reduire.addEventListener)reduire.addEventListener("change",reveiller);
  reveiller();
  return {programmer:programmer,effacer:effacer,reveiller:reveiller,
    inspecter:function(){return {version:269,frames:frames,calculs:calculs,echantillons:echantillons,dessins:dessins,
      enAttente:raf!==null,visible:visible(),stock:files.reduce(function(n,f){return n+f.length;},0),
      forme:forme && forme.fini?{canaux:forme.canaux,colonnes:forme.cols,
        minimum:forme.min.map(function(a){return Math.min.apply(null,a);}),
        maximum:forme.max.map(function(a){return Math.max.apply(null,a);})}:null,
      resume:resume?JSON.parse(JSON.stringify(resume)):null};}};
})();
