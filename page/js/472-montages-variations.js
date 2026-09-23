/* v285 — Deux exemples indépendants. Seules les nouvelles copies reçoivent B
   et les fills automatiques : les 48 montages précédents restent inchangés. */
(function montagesVariations(){
  "use strict";
  function faire(source,id,nom,periode){
    var ancien=EUR_MONTAGES.find(function(p){return p.id===source;});
    var p=JSON.parse(JSON.stringify(ancien));p.id=id;p.nom=nom;p.fam="performance";p.variations={};
    p.res="Batterie A/B et fill automatique toutes les "+periode+" mesures. Les notes de basse et de mélodie, les effets et les scènes restent indépendants.";
    p.mods.forEach(function(x,index){
      var m={type:x[0],p:{}};if(!EUR_VARIATIONS.compatible(m))return;
      EUR_CAT[m.type].kns.forEach(function(k){m.p[k[0]]=x[1]&&Number.isFinite(x[1][k[0]])?x[1][k[0]]:k[4];});
      EUR_VARIATIONS.preparerB(m);m.variation.graine=285+index*71;
      EUR_VARIATIONS.generer(m);m.variation.periode=periode;
      p.variations[index]=EUR_VARIATIONS.copier(m,m.variation);
    });
    if(!p.performance){
      var d=EUR_PERFORMANCE.vide(),index=p.reperes.mixGeneral;
      ["BATTERIE","BASSE","MÉLODIE","EFFETS"].forEach(function(n,i){
        var param=["a","b","c","d"][i],val=p.mods[index][1][param];
        d.commandes[i]={nom:n,valeur:1,cibles:[{index:index,type:"mix4",param:param,min:0,max:val}]};
      });p.performance=d;
    }
    return p;
  }
  EUR_MONTAGES.push(faire("perf-jungle","var-jungle","JUNGLE · VARIATIONS A/B",4));
  EUR_MONTAGES.push(faire("rave-breakcore","var-breakcore","BREAKCORE · FILLS CADENCÉS",4));
})();
