/* v285 — Variations A/B de DRUM 32 et BREAK 32.
   A reste dans m.p ; seule la phrase B est un champ optionnel du module.
   Longueur, rotation, mute et timbre sont communs. Aucun échange temporaire
   de m.p, aucun redémarrage audio, aucun tirage dans Math.random.
   Une mesure = 16 CLK reçus : les câbles définissent la synchronisation.
   Les commandes sont consommées au prochain début de mesure non programmé. */
var EUR_VARIATIONS=(function(){
  "use strict";
  var owns=Object.prototype.hasOwnProperty,cache={};
  function compatible(m){return !!m&&(m.type==="drum32"||m.type==="break32");}
  function entier(v,a,b,d){return Number.isFinite(v)?Math.max(a,Math.min(b,Math.round(v))):d;}
  function definitions(type){
    if(cache[type])return cache[type];
    var d=EUR_CAT[type],exp=type==="drum32"?/^[abcd]([1-9]|[12][0-9]|3[0-2])$/:/^[nrvp]([1-9]|[12][0-9]|3[0-2])$/;
    return cache[type]=d?d.kns.filter(function(k){return exp.test(k[0]);}):[];
  }
  function phrase(m,source){
    var p={};definitions(m.type).forEach(function(k){p[k[0]]=entier(source&&source[k[0]],k[2],k[3],entier(m.p&&m.p[k[0]],k[2],k[3],k[4]));});return p;
  }
  function copier(m,d){
    if(!compatible(m)||!d||d.version!==1||!d.b||typeof d.b!=="object"||Array.isArray(d.b))return null;
    return {version:1,b:phrase(m,d.b),initial:d.initial===1?1:0,
      periode:[2,4,8].indexOf(d.periode)>=0?d.periode:0,
      verrous:[0,1,2,3].map(function(i){return Array.isArray(d.verrous)?(d.verrous[i]===1?1:0):(i<2?1:0);}),
      forts:d.forts===0?0:1,graine:entier(d.graine,1,2147483646,285)};
  }
  function sauver(){if(typeof memEur==="function")memEur();}
  function reveiller(){if(typeof EUR_VAR_UI!=="undefined")EUR_VAR_UI.reveiller();}
  function initialiser(m){
    if(!compatible(m))return;
    var v=copier(m,m.variation);if(v)m.variation=v;else delete m.variation;
    var base=v?v.initial:0;
    m._rv={pas:-1,base:base,lecture:base,fill:false,attente:null,demandeFill:false,dates:[],entendu:null,dernier:null};
    if(!v)m._rvEdition=0;
  }
  function etat(m){if(!m._rv)initialiser(m);return m._rv;}
  function reset(m,t,stop){
    if(!compatible(m))return;
    var s=etat(m),gardes=stop?[]:s.dates.filter(function(e){return e.t<t;});
    var base=m.variation?m.variation.initial:0;
    m._rv={pas:-1,base:base,lecture:base,fill:false,attente:null,demandeFill:false,
      dates:gardes,entendu:stop?null:s.entendu,dernier:null};
    if(!stop && !(ctx&&typeof ctx.startRendering==="function"))m._rv.dates.push({t:t,mesure:0,banque:base,fill:false});
    reveiller();
  }
  function debut(m,t){
    var s=etat(m),v=m.variation;
    if(!Number.isFinite(t)||t<0||(s.dernier!==null&&t<=s.dernier+.0000001))return s.lecture&&v?v.b:m.p;
    s.dernier=t;s.pas++;
    if(s.pas%16===0){
      if(s.attente!==null){s.base=s.attente;s.attente=null;}
      var mesure=Math.floor(s.pas/16)+1;
      s.fill=!!v&&(s.demandeFill||(v.periode>0&&mesure%v.periode===0));s.demandeFill=false;
      s.lecture=v&&(s.fill||s.base===1)?1:0;
      if(!(ctx&&typeof ctx.startRendering==="function")){
        s.dates.push({t:t,mesure:mesure,banque:s.lecture,fill:s.fill});
        if(s.dates.length>64)s.dates.splice(0,s.dates.length-64);
        reveiller();
      }
    }
    return s.lecture&&v?v.b:m.p;
  }
  function lire(m,k){var v=m.variation;return m._rvEdition===1&&v&&owns.call(v.b,k)?v.b[k]:m.p[k];}
  function ecrire(m,k,x){
    var v=m.variation;if(m._rvEdition===1&&v&&owns.call(v.b,k)){
      var d=definitions(m.type).find(function(d){return d[0]===k;});v.b[k]=entier(x,d[2],d[3],d[4]);
    }else m.p[k]=x;
  }
  function preparerB(m){
    if(!compatible(m))return false;
    var ancien=copier(m,m.variation),v=ancien||{version:1,b:{},initial:0,periode:0,verrous:[1,1,0,0],forts:1,graine:285};
    v.b=phrase(m,m.p);m.variation=v;return true;
  }
  function editer(m,n){if(!compatible(m)||(n===1&&!m.variation))return false;m._rvEdition=n===1?1:0;reveiller();return true;}
  function choisir(m,n){
    if(!compatible(m)||(n===1&&!m.variation))return false;
    n=n===1?1:0;var s=etat(m);
    if(m.variation)m.variation.initial=n;
    if(S.run)s.attente=n;
    else{s.base=n;s.lecture=n;s.attente=null;s.demandeFill=false;s.fill=false;s.entendu=null;s.dates=[];}
    sauver();reveiller();return true;
  }
  function fill(m){if(!compatible(m)||!m.variation||!S.run)return false;etat(m).demandeFill=true;reveiller();return true;}
  function annuler(m){
    if(!compatible(m))return;var s=etat(m);s.attente=null;s.demandeFill=false;
    if(m.variation)m.variation.initial=s.base;sauver();reveiller();
  }
  function periode(m,n){if(!m.variation)return false;m.variation.periode=[2,4,8].indexOf(n)>=0?n:0;sauver();reveiller();return true;}
  function generer(m){
    if(!compatible(m))return false;
    if(!m.variation)preparerB(m);
    var v=m.variation,b=phrase(m,m.p),seed=v.graine;
    function hasard(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    if(m.type==="drum32"){
      ["a","b","c","d"].forEach(function(c,voie){
        if(v.verrous[voie])return;
        for(var i=1;i<=32;i++){
          /* Un complément en fin de chaque mesure ; jamais plus de quatre coups. */
          if((i-1)%16>=12)b[c+i]=hasard()<.22?0:2+Math.floor(hasard()*3);
          else if(i%2===0&&hasard()<.24)b[c+i]=b[c+i]?2:1;
        }
      });
    }else{
      var nb=m.breakSample?entier(m.breakSample.nb,1,32,16):16;
      for(var i=1;i<=32;i++){
        if(v.forts&&(i-1)%4===0)continue;
        if((i-1)%16>=12||hasard()<.28){
          b["n"+i]=1+Math.floor(hasard()*nb);b["r"+i]=2+Math.floor(hasard()*3);
          b["v"+i]=hasard()<.35?1:0;
        }
      }
    }
    v.b=b;v.graine=(seed%2147483646)+1;return true;
  }
  /* Le témoin suit les dates audio, et non la programmation en avance. */
  function lireEtat(m,now){
    var s=etat(m);while(s.dates.length&&s.dates[0].t<=now)s.entendu=s.dates.shift();
    return {entendu:S.run?s.entendu:null,base:s.base,initial:m.variation?m.variation.initial:0,
      attente:s.attente,fillAttente:s.demandeFill,futur:S.run&&s.dates.length?s.dates[0]:null};
  }
  return {compatible:compatible,copier:copier,phrase:phrase,initialiser:initialiser,reset:reset,debut:debut,
    lire:lire,ecrire:ecrire,preparerB:preparerB,editer:editer,choisir:choisir,fill:fill,annuler:annuler,
    periode:periode,generer:generer,lireEtat:lireEtat};
})();
