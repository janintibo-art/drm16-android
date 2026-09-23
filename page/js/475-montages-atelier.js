/* v286 : copies indépendantes, les 50 anciens montages restent inchangés.
   Le duck n'agit que sur la basse avant son VCA de scène. */
(function montagesAtelier(){
  "use strict";
  function faire(source,id,nom,psy){
    var p=JSON.parse(JSON.stringify(EUR_MONTAGES.find(function(p){return p.id===source;})));
    p.id=id;p.nom=nom;p.fam="performance";
    p.res=psy?"Atelier kick/basse : kick court, trois notes de basse entre les kicks et baisse de gain synchronisée. FOCUS dessine les deux courbes.":
      "Atelier hardcore : kick accordé par un MÉLO 32 dédié, basse en contretemps, duck et fills. FOND 55 Hz fait correspondre V/OCT aux notes MIDI.";
    var r=p.reperes,k=r.kick,du=p.mods.length;
    p.mods[k]=["kicklab",psy?{tune:55,dec:105,sweep:29,knee:0,fall:12,settle:22,drive:.04,tone:.4,click:.2,clickdec:4,niv:.70}:
      {tune:55,dec:205,sweep:26,knee:4,fall:12,settle:75,drive:.73,tone:.5,click:.3,clickdec:6,niv:.69}];
    r.duck=du;p.mods.push(["ducktrig",psy?{depth:22,attack:2,hold:15,release:95,shape:1.8}:{depth:18,attack:3,hold:20,release:150,shape:1.5}]);p.rangees.push(1);
    var ancien=p.cables.find(function(c){return c[0]===r.basse && c[1]==="out";});
    var vers=[ancien[2],ancien[3]];ancien[2]=du;ancien[3]="in";
    p.cables.push([du,"out",vers[0],vers[1]],[k,"hit",du,"trig"]);
    if(!psy){
      /* Un troisième séquenceur joue les notes ET le rythme du kick. Sa sortie
         HIT déclenche le duck, donc même un silence de note reste cohérent. */
      var seq=p.mods.length,notes={len:32,dir:0,root:9,scale:1,trans:0,glide:0,mute:0};
      for(var i=1;i<=32;i++){notes["n"+i]=i<=16?33:i<=24?36:31;notes["on"+i]=i%4===1?1:0;notes["a"+i]=0;notes["s"+i]=0;notes["p"+i]=100;}
      r.seqKick=seq;p.mods.push(["melo32",notes]);p.rangees.push(0);
      p.cables=p.cables.filter(function(c){return !(c[2]===k&&c[3]==="trig");});
      p.cables.push([r.scenes,"clk",seq,"clk"],[seq,"cv",k,"voct"],[seq,"gate",k,"trig"]);
    }
    var d=EUR_PERFORMANCE.vide();
    function macro(i,nom,liens){d.commandes[i]={nom:nom,valeur:0,cibles:liens.map(function(l){
      var idx=r[l[0]],mod=p.mods[idx],def=EUR_CAT[mod[0]].kns.find(function(k){return k[0]===l[1];});
      return {index:idx,type:mod[0],param:l[1],min:mod[1][l[1]]===undefined?def[4]:mod[1][l[1]],max:l[2]};
    })};}
    ["BATTERIE","BASSE","MÉLODIE","EFFETS"].forEach(function(n,i){var param="abcd"[i];d.commandes[i]={nom:n,valeur:1,cibles:[{index:r.mixGeneral,type:"mix4",param:param,min:0,max:p.mods[r.mixGeneral][1][param]}]};});
    macro(4,"CORPS DU KICK",[["kick","drive",psy?.4:.92],["kick","tone",.72]]);
    macro(5,"QUEUE DU KICK",[["kick","dec",psy?185:320],["kick","settle",psy?40:120]]);
    macro(6,"PLACE POUR LE KICK",[["duck","depth",32],["duck","release",psy?155:230]]);
    macro(7,"COULEUR BASSE",[["basse","cut",.48],["basse","drive",.4]]);p.performance=d;
    p.variations={};p.mods.forEach(function(x,i){
      if(x[0]!=="drum32")return;var m={type:x[0],p:EUR_CAT[x[0]].kns.reduce(function(a,k){a[k[0]]=x[1][k[0]]===undefined?k[4]:x[1][k[0]];return a;},{})};
      EUR_VARIATIONS.preparerB(m);m.variation.graine=286;EUR_VARIATIONS.generer(m);m.variation.periode=4;p.variations[i]=EUR_VARIATIONS.copier(m,m.variation);
    });
    return p;
  }
  EUR_MONTAGES.push(faire("rave-psy","atelier-psy","PSY · KICK ET BASSE",true));
  EUR_MONTAGES.push(faire("rave-gabber","atelier-gabber","GABBER · KICK ACCORDÉ",false));
})();
