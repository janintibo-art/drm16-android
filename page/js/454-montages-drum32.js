/* v279 : deux ensembles pour programmer et entendre DRUM 32.
   Les huit modèles v276 sont clonés, jamais modifiés. Quatre percussions,
   basse, mélodie, écho de percussion et déplacement stéréo lent de la mélodie. */
(function montagesDrum32(){
  "use strict";
  function fabriquer(source,id,nom,tribal){
    var base=EUR_MONTAGES.find(function(p){return p.id===source;});
    if(!base) return;
    base=JSON.parse(JSON.stringify(base));
    var omettre=[base.reperes.rythmeKick,base.reperes.rythmeCaisse,base.reperes.rythmeHat];
    var P={id:id,nom:nom,fam:"avance",bpm:base.bpm,tonalite:base.tonalite,
      res:tribal?"Batterie en cycles de 32, 15, 16 et 7 pas ; basse rapide, mélodie et percussion en écho.":
        "Quatre pistes de batterie sur deux mesures, roulement final, basse, mélodie et mouvement stéréo lent.",
      mods:[],cables:[],rangees:[],reperes:{}};
    var map={};
    function ajouter(role,type,p,r){var i=P.mods.length;P.mods.push([type,p||{}]);P.rangees.push(r||0);P.reperes[role]=i;return i;}
    var params={};
    ["a","b","c","d"].forEach(function(c){
      params[c+"len"]=32;params[c+"chance"]=100;params[c+"shift"]=0;params[c+"mute"]=0;
      for(var i=1;i<=32;i++) params[c+i]=0;
    });
    function ligne(c,pas){pas.forEach(function(n){params[c+n]=1;});}
    ligne("a",[1,5,9,13,17,21,25,29]);
    if(tribal){
      params.blen=15;params.clen=16;params.dlen=7;
      ligne("b",[1,4,7,10,13]);ligne("c",[1,3,5,7,9,11,13,15]);ligne("d",[1,4,6]);
      params.b15=2;params.d6=2;
    }else{
      ligne("b",[5,13,21,29]);params.b31=2;params.b32=4;
      ligne("c",[3,7,11,15,19,23,27,31]);params.c32=2;
      ligne("d",[7,15,19,23,27]);params.dlen=24;params.dchance=75;
    }
    base.mods.forEach(function(x,i){
      if(omettre.indexOf(i)>=0) return;
      map[i]=P.mods.length;P.mods.push(x);P.rangees.push(base.rangees[i]);
      if(i===base.reperes.horloge) ajouter("seqBatterie","drum32",params,0);
    });
    Object.keys(base.reperes).forEach(function(k){if(map[base.reperes[k]]!==undefined) P.reperes[k]=map[base.reperes[k]];});
    base.cables.forEach(function(c){
      if(map[c[0]]!==undefined && map[c[2]]!==undefined) P.cables.push([map[c[0]],c[1],map[c[2]],c[3]]);
    });
    ajouter("perc","rim",{tune:tribal?.62:.43,dec:.17,niv:.42},0);
    ajouter("filtrePerc","hpf",{cut:.09,q:.08,mod:0},0);
    ajouter("echoPerc","delay",{time:((60/P.bpm)*.75-.02)/1.2,fb:.26,mix:.22},0);
    ajouter("balancement","lfo",{rate:.08,amt:.16},1);
    function fil(a,s,b,e){P.cables.push([P.reperes[a],s,P.reperes[b],e]);}
    fil("horloge","out","seqBatterie","clk");
    ["kick","caisse","hat","perc"].forEach(function(k,i){fil("seqBatterie","t"+"abcd"[i],k,"trig");});
    fil("perc","out","filtrePerc","in");fil("filtrePerc","out","echoPerc","in");fil("echoPerc","out","mixBatterie","d");
    fil("balancement","sine","panMelodie","cv");
    P.mods[P.reperes.mixBatterie][1].d=.34;
    return P;
  }
  EUR_MONT_FAM.splice(1,0,["avance","AVANCÉS"]);
  [fabriquer("ens-techno","av-techno32","TECHNO 32 · VARIATIONS",false),
   fabriquer("ens-tribe","av-tribal32","TRIBAL 32 · CYCLES",true)].forEach(function(p){if(p) EUR_MONTAGES.push(p);});
})();
