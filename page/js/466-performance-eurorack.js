/* ================= PERFORMANCE EURORACK — v284 =================
   Huit macros par rack, quatre cibles au plus par macro. Les cibles désignent
   un ID ET un type de module, jamais sa position à l'écran. Aucun graphe audio,
   horloge ou câble supplémentaire. Le moteur écrit les vrais paramètres par
   les mêmes m.maj/enLissant que les potards ; pas d'animation d'automation.
   L'affectation, le chargement et la mémorisation ne modifient jamais le son. */
var EUR_PERFORMANCE=(function(){
  "use strict";
  var N=8, MAX=4;
  function fini(x){return typeof x==="number" && Number.isFinite(x);}
  function borne(v,a,b){return Math.max(a,Math.min(b,v));}
  function copie(o){return JSON.parse(JSON.stringify(o));}
  function vide(){return {version:1,commandes:Array.from({length:N},function(_,i){return {nom:"COMMANDE "+(i+1),valeur:0,cibles:[]};}),memoire:null};}
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
    var s=raw.memoire,all=cibles(d);
    if(s && all.length && s.signature===signature(d) && Array.isArray(s.valeurs) && s.valeurs.length===all.length &&
       Array.isArray(s.positions) && s.positions.length===N && s.positions.every(function(v){return fini(v)&&v>=0&&v<=1;})){
      var v=s.valeurs;
      if(v.every(function(x,i){var t=all[i],m=mod(t.id,mods),k=descripteur(m,t.param);
        return x && x.id===t.id && x.type===t.type && x.param===t.param && fini(x.valeur) && x.valeur>=k[2] && x.valeur<=k[3];
      }))d.memoire={signature:s.signature,positions:s.positions.slice(),valeurs:v.map(function(x){return {id:x.id,type:x.type,param:x.param,valeur:x.valeur};})};
    }
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
    c.valeur=v;EUR.performance=d;sauvegarder();return true;
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
    /* Un ancien point de retour ne doit pas être appliqué à de nouvelles cibles. */
    if(d.memoire&&d.memoire.signature!==signature(d))d.memoire=null;
    EUR.performance=d;sauvegarder();return "";
  }
  function retirer(i,p){
    var d=courant(),c=d.commandes[i];if(!c||!Number.isInteger(p)||p<0||p>=c.cibles.length)return false;
    c.cibles.splice(p,1);d.memoire=null;EUR.performance=d;sauvegarder();return true;
  }
  function memoriser(){
    nettoyer();var d=courant(),all=cibles(d);if(!all.length)return false;
    var v=all.map(function(t){var m=mod(t.id);return {id:t.id,type:t.type,param:t.param,valeur:m.p[t.param]};});
    if(v.some(function(x){return !fini(x.valeur);}))return false;
    d.memoire={signature:signature(d),positions:d.commandes.map(function(c){return c.valeur;}),valeurs:v};
    EUR.performance=d;sauvegarder();return true;
  }
  function rappeler(){
    nettoyer();var d=courant();if(!d.memoire)return false;
    ecrire(d.memoire.valeurs);d.commandes.forEach(function(c,i){c.valeur=d.memoire.positions[i];});
    sauvegarder();return true;
  }
  function ecart(c){
    return c.cibles.some(function(t){var m=mod(t.id),k=m && descripteur(m,t.param);
      return !k || Math.abs(m.p[t.param]-nombre(t.min+(t.max-t.min)*c.valeur,m,k))>Math.max(.00001,(k[3]-k[2])*.0001);
    });
  }
  function charger(raw){EUR.performance=raw?normaliser(raw,EUR.mods):null;}
  function depuisMontage(raw,rangs){
    if(!raw){charger(null);return;}
    var d=copie(raw);d.memoire=null;
    (d.commandes||[]).forEach(function(c){(c.cibles||[]).forEach(function(t){t.id=rangs[t.index];delete t.index;});});
    charger(d);
  }
  return {vide:vide,normaliser:normaliser,courant:courant,copie:copie,parametres:parametres,descripteur:descripteur,
    regler:regler,affecter:affecter,retirer:retirer,nommer:nommer,memoriser:memoriser,rappeler:rappeler,
    ecart:ecart,nettoyer:nettoyer,charger:charger,depuisMontage:depuisMontage};
})();
