/* v287 : deux copies indépendantes. Les huit impulsions SCÈNE pilotent les
   accords avant les CLK mélodiques. Les MIX 4 CV à gain un font une addition
   exacte, pas une quantification. Les exemples écrivent des fondamentales,
   quintes et octaves compatibles avec leurs accords majeurs et mineurs. */
(function montagesHarmonie(){
  "use strict";
  function fabriquer(psy){
    var origine=EUR_MONTAGES.find(function(p){return p.id===(psy?"atelier-psy":"rave-dnb");});if(!origine)return;
    var p=JSON.parse(JSON.stringify(origine)),r=p.reperes;
    p.id=psy?"harmonie-psy":"harmonie-dnb";p.nom=psy?"PSY · HARMONIE EN MOUVEMENT":"DnB · ACCORDS NOCTURNES";
    p.fam="harmonie";p.tonalite="LA m7 · FA maj7 · DO · SOL7";
    p.res=psy?"Kick/basse, arpège et nappe de quatre notes : huit accords suivent les huit scènes, macros et fills déjà préparés.":
      "Breaks, basse Reese et mélodie transposés, nappe à quatre voix et huit accords calés sur les scènes.";
    function mod(k,type,ps,rangee){r[k]=p.mods.length;p.mods.push([type,ps]);p.rangees.push(rangee);}
    function fil(a,s,b,e){p.cables.push([r[a],s,r[b],e]);}
    var hp={len:8,sync:1,hold:0,ref:33,trans:0,oct:2,glide:psy?35:140};
    var racines=[33,29,36,31,33,29,36,31],qualites=[2,3,0,4,2,3,0,4],durees=[1,1,2,1,2,2,1,2];
    for(var i=1;i<=8;i++){hp["root"+i]=racines[i-1];hp["type"+i]=qualites[i-1];hp["inv"+i]=[0,1,0,1,0,1,0,1][i-1];hp["bars"+i]=durees[i-1];}
    mod("harmonie","harmonie8",hp,0);
    mod("transposeBasse","mix4",{a:1,b:1,c:0,d:0},1);
    mod("transposeMelodie","mix4",{a:1,b:1,c:0,d:0},1);
    p.cables=p.cables.filter(function(c){return !(c[2]===r.basse&&c[3]==="voct")&&!(c[2]===r.oscMelodie&&c[3]==="voct")&&c[2]!==r.fx&&c[0]!==r.fx;});
    fil("scenes","change","harmonie","in");
    [["seqBasse","transposeBasse","basse"],["seqMelodie","transposeMelodie","oscMelodie"]].forEach(function(l){
      fil(l[0],"cv",l[1],"a");fil("harmonie","shift",l[1],"b");fil(l[1],"out",l[2],"voct");
    });
    /* Réutiliser l'emplacement du ZAP pour la première voix évite de garder
       un module non câblé. Les 52 montages sources ne changent pas. */
    r.nappe1=r.fx;p.mods[r.nappe1]=["vco",{oct:.5,fin:.5,fm:0}];p.rangees[r.nappe1]=1;
    [2,3,4].forEach(function(i){mod("nappe"+i,"vco",{oct:.5,fin:.5,fm:0},1);});
    mod("mixNappe","mix4",{a:.16,b:.16,c:.16,d:.16},1);
    mod("filtreNappe","vcf",{cut:psy?.30:.25,q:.08,mod:.10},1);
    for(var i=1;i<=4;i++){fil("harmonie","v"+i,"nappe"+i,"voct");fil("nappe"+i,"tri","mixNappe","abcd"[i-1]);}
    fil("mixNappe","out","filtreNappe","in");fil("filtreNappe","out","groupeCD","in2");fil("modulation","tri","filtreNappe","cv");
    var basse=p.mods[r.seqBasse][1],melodie=p.mods[r.seqMelodie][1];basse.scale=0;melodie.scale=0;
    for(var i=1;i<=32;i++){
      basse["n"+i]=33+[0,0,0,7,0,12,7,0][(i-1)%8];
      melodie["n"+i]=57+[0,7,12,7,19,12,7,0,12,19,7,0,24,19,12,7][(i-1)%16];
    }
    /* D désigne désormais la nappe, pas les zaps. */
    p.mods[r.mixGeneral][1].d=psy?.30:.38;
    var sc=p.mods[r.scenes][1];[35,55,75,100,80,60,100,85].forEach(function(x,i){sc["d"+(i+1)]=x;});
    var macros=EUR_PERFORMANCE.vide();
    ["BATTERIE","BASSE","MÉLODIE","NAPPE"].forEach(function(n,i){var k="abcd"[i];macros.commandes[i]={nom:n,valeur:1,
      cibles:[{index:r.mixGeneral,type:"mix4",param:k,min:0,max:p.mods[r.mixGeneral][1][k]}]};});
    function macro(i,nom,liens){macros.commandes[i]={nom:nom,valeur:0,cibles:liens.map(function(l){var idx=r[l[0]],x=p.mods[idx],k=EUR_CAT[x[0]].kns.find(function(k){return k[0]===l[1];});
      return {index:idx,type:x[0],param:l[1],min:x[1][l[1]]===undefined?k[4]:x[1][l[1]],max:l[2]};})};}
    macro(4,"COULEUR BASSE",[["basse","cut",.48],["basse","drive",.32]]);
    macro(5,"OUVERTURE NAPPE",[["filtreNappe","cut",.55]]);
    macro(6,"ÉCHOS",[["echoMelodie","mix",.45],["echoFX","mix",.55]]);
    macro(7,"BRILLANCE LEAD",[["filtreMelodie","cut",.56],["oscMelodie","harm",.25]]);p.performance=macros;
    /* Le DnB gagne B sans altérer le rythme A. Le Psy conserve ses B de v286. */
    if(!p.variations)p.variations={};
    p.mods.forEach(function(x,i){if((x[0]!=="drum32"&&x[0]!=="break32")||p.variations[i])return;
      var m={type:x[0],p:{}};EUR_CAT[x[0]].kns.forEach(function(k){m.p[k[0]]=x[1][k[0]]===undefined?k[4]:x[1][k[0]];});
      EUR_VARIATIONS.preparerB(m);m.variation.graine=287;EUR_VARIATIONS.generer(m);m.variation.periode=4;p.variations[i]=EUR_VARIATIONS.copier(m,m.variation);
    });
    return p;
  }
  EUR_MONT_FAM.push(["harmonie","HARMONIES"]);
  [fabriquer(false),fabriquer(true)].forEach(function(p){if(p)EUR_MONTAGES.push(p);});
})();
