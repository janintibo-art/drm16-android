/* v284 : deux variantes prêtes à jouer, copies indépendantes des racks v282.
   Seules ces variantes reçoivent les macros ; les 46 anciens montages et les
   recettes audio ne sont pas modifiés. Les bornes limitent les exemples. */
(function montagesPerformance(){
  "use strict";
  function fabriquer(source,id,nom,psy){
    var p=JSON.parse(JSON.stringify(EUR_MONTAGES.find(function(p){return p.id===source;})));
    p.id=id;p.nom=nom;p.fam="performance";
    p.res=psy?"Psytrance : quatre parties, filtre de basse, brillance, échos et montée à portée de main.":
      "Jungle : break recomposé, basse profonde et huit commandes pour les niveaux, les couleurs et les échos.";
    var d=EUR_PERFORMANCE.vide();
    function macro(i,nom,v,liaisons){
      d.commandes[i]={nom:nom,valeur:v,cibles:liaisons.map(function(l){
        var index=p.reperes[l[0]],m=p.mods[index],k=EUR_CAT[m[0]].kns.find(function(k){return k[0]===l[1];}),actuel=m[1][k[0]];
        if(typeof actuel!=="number")actuel=k[4];
        return {index:index,type:m[0],param:k[0],min:v===1?l[2]:actuel,max:v===1?actuel:l[2]};
      })};
    }
    macro(0,"BATTERIE",1,[["mixGeneral","a",0]]);
    macro(1,"BASSE",1,[["mixGeneral","b",0]]);
    macro(2,"MÉLODIE",1,[["mixGeneral","c",0]]);
    macro(3,"EFFETS",1,[["mixGeneral","d",0]]);
    macro(4,"COULEUR BASSE",0,[["basse","cut",psy?.48:.58],["basse","drive",.43],["basse","det",.78]]);
    macro(5,"BRILLANCE",0,[["filtreMelodie","cut",.68],["filtreMelodie","mod",.32]]);
    macro(6,"ÉCHOS",0,[["echoMelodie","mix",.52],["echoMelodie","fb",.48],["echoFX","mix",.58],["echoFX","fb",.48]]);
    if(psy)macro(7,"MONTÉE",0,[["modulation","amt",.34],["fx","fm",.88],["fx","dec",.28],["envMelodie","d",.08]]);
    else macro(7,"BREAK SOMBRE",0,[["break","tone",.35],["break","pitch",-5],["caisse","dec",.08],["hat","dec",.12]]);
    p.performance=d;return p;
  }
  EUR_MONT_FAM.push(["performance","PERFORMANCE"]);
  EUR_MONTAGES.push(fabriquer("rave-jungle","perf-jungle","JUNGLE · AUX COMMANDES",false));
  EUR_MONTAGES.push(fabriquer("rave-psy","perf-psy","PSY · AUX COMMANDES",true));
})();
