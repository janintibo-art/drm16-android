/* v288 : copies indépendantes des montages v285, un seul STUTTER par rack.
   Traitement placé AVANT le VCA de batterie : les breaks des scènes restent
   respectés. Basse, mélodie et effets ne passent pas dans la capture. */
(function montagesStutter(){
  "use strict";
  function faire(breakcore){
    var source=EUR_MONTAGES.find(function(p){return p.id===(breakcore?"var-breakcore":"var-jungle");});if(!source)return;
    var p=JSON.parse(JSON.stringify(source)),r=p.reperes;
    p.id=breakcore?"stutter-breakcore":"stutter-jungle";p.nom=breakcore?"BREAKCORE · ARRÊTS SUR FRAGMENT":"JUNGLE · RÉPÉTITIONS LIVE";p.fam="capture";
    p.res="Capture de la batterie en fin de quatre mesures, retour au rythme courant, basse et mélodie indépendantes. Dose et FOCUS déjà accessibles.";
    r.stutter=p.mods.length;p.mods.push(["stutterlive",{div:breakcore?3:2,span:breakcore?8:4,mix:breakcore?.85:.75,auto:2,edge:1}]);p.rangees.push(0);
    p.cables=p.cables.filter(function(c){return !(c[0]===r.mixBatterie&&c[2]===r.groupeAB&&c[3]==="in1");});
    p.cables.push([r.mixBatterie,"out",r.stutter,"in"],[r.stutter,"out",r.groupeAB,"in1"],[r.scenes,"clk",r.stutter,"clk"]);
    /* Une seule cible commune à la main et dans PERFORMANCE : aucun clone
       audio ni changement de phrase de basse pendant les répétitions. */
    p.performance.commandes[7]={nom:"DOSE STUTTER",valeur:p.mods[r.stutter][1].mix,cibles:[{index:r.stutter,type:"stutterlive",param:"mix",min:0,max:1}]};
    return p;
  }
  EUR_MONT_FAM.push(["capture","CAPTURE LIVE"]);
  [faire(false),faire(true)].forEach(function(p){if(p)EUR_MONTAGES.push(p);});
})();
