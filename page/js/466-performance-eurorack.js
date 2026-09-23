/* ================= PERFORMANCE EURORACK — v284, MOUVANTE v292 =================
   Huit macros par rack, quatre cibles au plus par macro. Les cibles désignent
   un ID ET un type de module, jamais sa position à l'écran. Aucun graphe audio,
   horloge ou câble supplémentaire. Le moteur écrit les vrais paramètres par
   les mêmes m.maj/enLissant que les potards ; pas d'animation d'automation
   dans le graphe audio lui-même. L'affectation, le chargement et la
   mémorisation ne modifient jamais le son.

   v292 — PERFORMANCE MOUVANTE : deux points de retour A/B (au lieu d'un
   seul) et une TRANSITION qui glisse les huit commandes de l'un vers
   l'autre en douceur, plus un GESTE : un enregistrement des mouvements de
   macro (jusqu'à 16 s), rejoué en boucle. Ces deux ajouts utilisent chacun
   une petite boucle temps réel (requestAnimationFrame, horloge murale,
   PAS l'horloge audio) : c'est la seule dérogation du fichier à la règle
   « aucune boucle » affichée dans 467-performance-interface.js — dérogation
   volontaire et bornée aux deux seuls cas où quelque chose doit vraiment
   bouger tout seul dans le temps. Le geste et la transition ne sont PAS
   capturés par un export hors ligne (figer, WAV) : comme un geste humain sur
   les potards, ils n'existent que pendant une vraie lecture. */
var EUR_PERFORMANCE=(function(){
  "use strict";
  var N=8, MAX=4, GESTE_MAX=16, GESTE_PAS=.05, GESTE_EVENEMENTS_MAX=400;
  function fini(x){return typeof x==="number" && Number.isFinite(x);}
  function borne(v,a,b){return Math.max(a,Math.min(b,v));}
  function copie(o){return JSON.parse(JSON.stringify(o));}
  function maintenant(){return (typeof performance!=="undefined" && performance.now ? performance.now() : Date.now())/1000;}
  function vide(){return {version:1,commandes:Array.from({length:N},function(_,i){return {nom:"COMMANDE "+(i+1),valeur:0,cibles:[]};}),memoireA:null,memoireB:null,geste:null};}
  function mod(id,mods){return (mods||EUR.mods).find(function(m){return m.id===id;})||null;}
  /* Les pas, les gammes, la longueur et le transport restent dans leurs
     éditeurs. On ne modifie pas 128 notes par mégarde en tournant une macro.
     Les anciens modules à potards gardent toutes leurs courses natives. */
  function parametres(m){
    var d=m && EUR_CAT[m.type];if(!d)return [];
    var permis={stutterlive:/^mix$/,drum32:/^[abcd]chance$/,melo32:/^(trans|glide)$/,scenes8:/^fade$/,break32:/^(tone|pitch|niv)$/,kicklab:/^(tune|dec|sweep|knee|fall|settle|drive|tone|click|clickdec|niv)$/,ducktrig:/^(depth|attack|hold|release|shape)$/};
    return d.kns.filter(function(k){
      return typeof k[0]==="string" && fini(k[2]) && fini(k[3]) && k[3]>k[2] &&
        (permis[m.type] ? permis[m.type].test(k[0]) : !d.interface && d.fam!=="seq");
    });
  }
  function descripteur(m,key){return parametres(m).find(function(k){return k[0]===key;})||null;}
  function cible(c,mods){
    if(!c || !Number.isSafeInteger(c.id) || typeof c.type!=="string" || typeof c.param!=="string" || !fini(c.min) || !fini(c.max))return null;
    var m=mod(c.id,mods),k=m && m.type===c.type && descripteur(m,c.param);if(!k)return null;
    return {id:m.id,type:m.type,param:k[0],min:borne(c.min,k[2],k[3]),max:borne(c.max,k[2],k[3])};
  }
  function cle(c){return c.id+":"+c.type+":"+c.param;}
  function signature(d){return JSON.stringify(d.commandes.map(function(c){return c.cibles;}));}
  function cibles(d){return d.commandes.reduce(function(a,c){return a.concat(c.cibles);},[]);}
  function validerMemoire(s,d,mods){
    var all=cibles(d);
    if(!s || !all.length || s.signature!==signature(d) || !Array.isArray(s.valeurs) || s.valeurs.length!==all.length ||
       !Array.isArray(s.positions) || s.positions.length!==N || !s.positions.every(function(v){return fini(v)&&v>=0&&v<=1;}))return null;
    var v=s.valeurs;
    if(!v.every(function(x,i){var t=all[i],m=mod(t.id,mods),k=m&&descripteur(m,t.param);
      return x && x.id===t.id && x.type===t.type && x.param===t.param && k && fini(x.valeur) && x.valeur>=k[2] && x.valeur<=k[3];
    }))return null;
    return {signature:s.signature,positions:s.positions.slice(),valeurs:v.map(function(x){return {id:x.id,type:x.type,param:x.param,valeur:x.valeur};})};
  }
  function validerGeste(g){
    if(!g || !fini(g.duree) || g.duree<=0 || g.duree>GESTE_MAX || !Array.isArray(g.evenements))return null;
    var ev=g.evenements.slice(0,GESTE_EVENEMENTS_MAX).filter(function(e){
      return e && fini(e.t) && e.t>=0 && e.t<=g.duree && Number.isInteger(e.i) && e.i>=0 && e.i<N && fini(e.v) && e.v>=0 && e.v<=1;
    }).map(function(e){return {t:e.t,i:e.i,v:e.v};});
    if(!ev.length)return null;
    ev.sort(function(a,b){return a.t-b.t;});
    return {duree:g.duree,evenements:ev};
  }
  function normaliser(raw,mods){
    var d=vide();if(!raw || raw.version!==1 || !Array.isArray(raw.commandes))return d;
    var vus=Object.create(null);
    d.commandes.forEach(function(c,i){
      var x=raw.commandes[i];if(!x || typeof x!=="object")return;
      if(typeof x.nom==="string")c.nom=x.nom.trim().slice(0,24)||c.nom;
      c.valeur=fini(x.valeur)?borne(x.valeur,0,1):0;
      if(Array.isArray(x.cibles))x.cibles.slice(0,MAX).forEach(function(t){
        var r=cible(t,mods);if(!r || vus[cle(r)])return;vus[cle(r)]=true;c.cibles.push(r);
      });
    });
    /* Les sauvegardes d'avant la v292 portent un seul « memoire » : repris
       comme point de retour A, sans rien perdre. */
    d.memoireA=validerMemoire(raw.memoireA||raw.memoire,d,mods);
    d.memoireB=validerMemoire(raw.memoireB,d,mods);
    d.geste=validerGeste(raw.geste);
    return d;
  }
  function courant(){return EUR.performance || vide();}
  function nettoyer(){
    if(EUR.performance)EUR.performance=normaliser(EUR.performance,EUR.mods);
  }
  function nombre(v,m,k){
    v=borne(v,k[2],k[3]);
    if(m.type==="melo32" || m.type==="scenes8" || m.type==="drum32" || (m.type==="break32"&&k[0]==="pitch"))v=Math.round(v);
    return v;
  }
  function ecrire(liste){
    var modifies=[],avant=[];
    enLissant(function(){
      liste.forEach(function(x){
        var m=mod(x.id),k=m && m.type===x.type && descripteur(m,x.param);
        if(!k || !fini(x.valeur))return;
        avant.push({m:m,param:x.param,valeur:m.p[x.param]});m.p[x.param]=nombre(x.valeur,m,k);
        if(modifies.indexOf(m)<0)modifies.push(m);
      });
      try{modifies.forEach(function(m){if(m.maj)m.maj();});}catch(e){
        avant.forEach(function(x){x.m.p[x.param]=x.valeur;});
        modifies.forEach(function(m){try{if(m.maj)m.maj();}catch(ignore){}});throw e;
      }
    });
    return modifies.length;
  }
  function sauvegarder(){memEur();}
  function regler(i,v){
    if(!Number.isInteger(i)||i<0||i>=N||!fini(v))return false;
    nettoyer();var d=courant(),c=d.commandes[i];if(!c.cibles.length)return false;
    v=borne(v,0,1);
    ecrire(c.cibles.map(function(t){return {id:t.id,type:t.type,param:t.param,valeur:t.min+(t.max-t.min)*v};}));
    c.valeur=v;EUR.performance=d;sauvegarder();
    if(ENR.actif)capturer(i,v);
    return true;
  }
  function nommer(i,nom){
    if(!Number.isInteger(i)||i<0||i>=N||typeof nom!=="string")return false;
    var d=courant();d.commandes[i].nom=nom.trim().slice(0,24)||("COMMANDE "+(i+1));EUR.performance=d;sauvegarder();return true;
  }
  /* position=-1 ajoute, sinon remplace l'affectation à cette position.
     Les deux bornes peuvent être inversées ; min=max donne une valeur fixe. */
  function affecter(i,t,position){
    if(!Number.isInteger(i)||i<0||i>=N)return "Commande inconnue.";
    nettoyer();var d=courant(),c=d.commandes[i],x=cible(t,EUR.mods);
    if(!x)return "Module ou réglage indisponible.";
    var p=position===undefined?-1:position;
    if(!Number.isInteger(p)||p< -1||p>=c.cibles.length)return "Cible inconnue.";
    if(p===-1&&c.cibles.length>=MAX)return "Quatre cibles maximum par commande.";
    for(var j=0;j<N;j++)for(var z=0;z<d.commandes[j].cibles.length;z++){
      if(j===i&&z===p)continue;
      if(cle(d.commandes[j].cibles[z])===cle(x))return "Ce réglage est déjà affecté à la commande "+(j+1)+".";
    }
    if(p===-1)c.cibles.push(x);else c.cibles[p]=x;
    /* Un ancien point de retour ne doit pas être appliqué à de nouvelles cibles.
       Le geste, lui, ne rejoue que des positions de commande : il reste valable. */
    if(d.memoireA&&d.memoireA.signature!==signature(d))d.memoireA=null;
    if(d.memoireB&&d.memoireB.signature!==signature(d))d.memoireB=null;
    EUR.performance=d;sauvegarder();return "";
  }
  function retirer(i,p){
    var d=courant(),c=d.commandes[i];if(!c||!Number.isInteger(p)||p<0||p>=c.cibles.length)return false;
    c.cibles.splice(p,1);d.memoireA=null;d.memoireB=null;EUR.performance=d;sauvegarder();return true;
  }
  function lettre(x){return x==="b"?"b":"a";}
  function memoriser(x){
    var l=lettre(x);nettoyer();var d=courant(),all=cibles(d);if(!all.length)return false;
    var v=all.map(function(t){var m=mod(t.id);return {id:t.id,type:t.type,param:t.param,valeur:m.p[t.param]};});
    if(v.some(function(x){return !fini(x.valeur);}))return false;
    var s={signature:signature(d),positions:d.commandes.map(function(c){return c.valeur;}),valeurs:v};
    if(l==="b")d.memoireB=s;else d.memoireA=s;
    EUR.performance=d;sauvegarder();return true;
  }
  function rappeler(x){
    var l=lettre(x);nettoyer();var d=courant(),s=l==="b"?d.memoireB:d.memoireA;if(!s)return false;
    arreterTransition();
    ecrire(s.valeurs);d.commandes.forEach(function(c,i){c.valeur=s.positions[i];});
    sauvegarder();return true;
  }
  function ecart(c){
    return c.cibles.some(function(t){var m=mod(t.id),k=m && descripteur(m,t.param);
      return !k || Math.abs(m.p[t.param]-nombre(t.min+(t.max-t.min)*c.valeur,m,k))>Math.max(.00001,(k[3]-k[2])*.0001);
    });
  }
  /* ---------- TRANSITION : glisser les huit commandes vers A ou B ---------- */
  var TRANS={actif:false,raf:0};
  function transitionEnCours(){return TRANS.actif;}
  function arreterTransition(){
    TRANS.actif=false;if(TRANS.raf&&typeof cancelAnimationFrame==="function")cancelAnimationFrame(TRANS.raf);TRANS.raf=0;
  }
  function transitionner(x,dureeMs){
    var l=lettre(x);nettoyer();var d=courant(),s=l==="b"?d.memoireB:d.memoireA;
    if(!s||ENR.actif)return false;
    arreterTransition();jouerGeste(false);
    var depart=d.commandes.map(function(c){return c.valeur;}),arrivee=s.positions,debut=maintenant();
    dureeMs=fini(dureeMs)?borne(dureeMs,50,15000):2000;
    TRANS.actif=true;
    function pas(){
      if(!TRANS.actif)return;
      var f=borne((maintenant()-debut)*1000/dureeMs,0,1);
      for(var i=0;i<N;i++){var v=depart[i]+(arrivee[i]-depart[i])*f;if(Math.abs(v-courant().commandes[i].valeur)>1e-9)regler(i,v);}
      if(f>=1){TRANS.actif=false;return;}
      if(typeof requestAnimationFrame==="function")TRANS.raf=requestAnimationFrame(pas);
    }
    pas();
    return true;
  }
  /* ---------- GESTE : enregistrer puis rejouer en boucle les mouvements
     des huit commandes (position 0–1), jusqu'à seize secondes. ---------- */
  var ENR={actif:false,debut:0,evenements:[],dernierT:-1};
  function enregistrementActif(){return ENR.actif;}
  function enregistrer(){
    if(ENR.actif||LECTURE.actif||TRANS.actif)return false;
    nettoyer();ENR.actif=true;ENR.debut=maintenant();ENR.evenements=[];ENR.dernierT=-1;return true;
  }
  function capturer(i,v){
    var t=maintenant()-ENR.debut;
    if(t>=GESTE_MAX){finEnregistrement();return;}
    if(ENR.evenements.length>=GESTE_EVENEMENTS_MAX)return;
    if(ENR.dernierT>=0 && t-ENR.dernierT<GESTE_PAS)return;
    ENR.dernierT=t;ENR.evenements.push({t:t,i:i,v:v});
  }
  function finEnregistrement(){
    if(!ENR.actif)return false;
    ENR.actif=false;var duree=borne(maintenant()-ENR.debut,.1,GESTE_MAX);
    var d=courant();
    d.geste=ENR.evenements.length?{duree:duree,evenements:ENR.evenements.slice()}:null;
    ENR.evenements=[];EUR.performance=d;sauvegarder();return true;
  }
  function annulerEnregistrement(){
    if(!ENR.actif)return false;ENR.actif=false;ENR.evenements=[];return true;
  }
  function effacerGeste(){var d=courant();if(!d.geste)return false;d.geste=null;EUR.performance=d;sauvegarder();return true;}
  var LECTURE={actif:false,raf:0,debut:0,dernier:0};
  function gesteEnLecture(){return LECTURE.actif;}
  function jouerGeste(on){
    nettoyer();var d=courant();
    if(on){
      if(ENR.actif||!d.geste||!d.geste.evenements.length)return false;
      if(LECTURE.actif)return true;
      arreterTransition();
      LECTURE.actif=true;LECTURE.debut=maintenant();LECTURE.dernier=0;boucleGeste();return true;
    }
    LECTURE.actif=false;if(LECTURE.raf&&typeof cancelAnimationFrame==="function")cancelAnimationFrame(LECTURE.raf);LECTURE.raf=0;return true;
  }
  function boucleGeste(){
    if(!LECTURE.actif)return;
    var d=courant();
    if(!d.geste||!d.geste.evenements.length){LECTURE.actif=false;return;}
    var duree=d.geste.duree,t=(maintenant()-LECTURE.debut)%duree,evs=d.geste.evenements;
    if(t<LECTURE.dernier){
      evs.forEach(function(e){if(e.t>LECTURE.dernier)regler(e.i,e.v);});
      evs.forEach(function(e){if(e.t<=t)regler(e.i,e.v);});
    }else evs.forEach(function(e){if(e.t>LECTURE.dernier&&e.t<=t)regler(e.i,e.v);});
    LECTURE.dernier=t;
    if(typeof requestAnimationFrame==="function")LECTURE.raf=requestAnimationFrame(boucleGeste);
  }
  function arreterMouvements(){arreterTransition();jouerGeste(false);annulerEnregistrement();}
  function charger(raw){arreterMouvements();EUR.performance=raw?normaliser(raw,EUR.mods):null;}
  function depuisMontage(raw,rangs){
    if(!raw){charger(null);return;}
    var d=copie(raw);d.memoireA=null;d.memoireB=null;d.geste=null;
    (d.commandes||[]).forEach(function(c){(c.cibles||[]).forEach(function(t){t.id=rangs[t.index];delete t.index;});});
    charger(d);
  }
  return {vide:vide,normaliser:normaliser,courant:courant,copie:copie,parametres:parametres,descripteur:descripteur,
    regler:regler,affecter:affecter,retirer:retirer,nommer:nommer,memoriser:memoriser,rappeler:rappeler,
    ecart:ecart,nettoyer:nettoyer,charger:charger,depuisMontage:depuisMontage,
    transitionner:transitionner,arreterTransition:arreterTransition,transitionEnCours:transitionEnCours,
    enregistrer:enregistrer,finEnregistrement:finEnregistrement,annulerEnregistrement:annulerEnregistrement,
    enregistrementActif:enregistrementActif,effacerGeste:effacerGeste,
    jouerGeste:jouerGeste,gesteEnLecture:gesteEnLecture,arreterMouvements:arreterMouvements,
    GESTE_MAX:GESTE_MAX};
})();
