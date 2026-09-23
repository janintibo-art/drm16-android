/* v282 : six compositions originales pour les styles demandés. Les tempos
   sont des choix pour ces exemples, pas des frontières de genre. Chaque rack
   est indépendant ; aucun des 38 anciens modèles n'est muté. */
(function montagesRave(){
  "use strict";
  var genres=[
    {id:"jungle",nom:"JUNGLE · FRAGMENTS",bpm:168,break:true,
      res:"Break découpé, ghosts, tranches retournées en fin de phrase, basse profonde et mélodie espacée."},
    {id:"dnb",nom:"DRUM & BASS · DOUBLE NUIT",bpm:174,break:true,
      res:"Batterie syncopée, break resserré, basse Reese désaccordée et motif mélodique en réponse."},
    {id:"uptempo",nom:"UPTEMPO · IMPACT",bpm:220,core:true,
      res:"Kicks courts très distordus, roulements de fin de phrase, basse à contretemps et stabs rapides."},
    {id:"breakcore",nom:"BREAKCORE · FRACTURES",bpm:202,core:true,break:true,
      res:"Découpes discontinues, répétitions ×2 à ×4, inversions, kick hardcore et mélodie en cycles de 15 pas."},
    {id:"gabber",nom:"GABBER · BÉTON",bpm:185,core:true,
      res:"Kick à queue distordue, caisse claire droite, charleys, basse courte et thème rave mineur."},
    {id:"psy",nom:"PSYTRANCE · SPIRALES",bpm:146,
      res:"Kick droit, trois notes de basse entre les kicks, arpège en la mineur, filtre modulé et zaps en écho."}
  ];
  function fabriquer(g){
    var P={id:"rave-"+g.id,nom:g.nom,fam:"rave",bpm:g.bpm,tonalite:"LA MINEUR",res:g.res,
      mods:[],cables:[],rangees:[],reperes:{}};
    function mod(k,type,p,r){P.reperes[k]=P.mods.length;P.mods.push([type,p||{}]);P.rangees.push(r||0);}
    function fil(a,s,b,e){P.cables.push([P.reperes[a],s,P.reperes[b],e]);}
    var psy=g.id==="psy",jungle=g.id==="jungle",dnb=g.id==="dnb",bc=g.id==="breakcore",up=g.id==="uptempo";
    var dp={};"abcd".split("").forEach(function(k){dp[k+"len"]=32;dp[k+"chance"]=100;dp[k+"shift"]=0;dp[k+"mute"]=0;for(var i=1;i<=32;i++)dp[k+i]=0;});
    function ligne(k,pas){pas.forEach(function(i){dp[k+i]=1;});}
    ligne("a",jungle?[1,11,17,27]:dnb?[1,7,17,23]:bc?[1,8,11,17,22,27,31]:[1,5,9,13,17,21,25,29]);
    ligne("b",g.break?[5,21]:[5,13,21,29]);
    ligne("c",[3,7,11,15,19,23,27,31]);ligne("d",psy?[7,15,23,30]:[15,31]);
    if(up){dp.a31=2;dp.a32=3;dp.b32=4;}if(bc){dp.a16=2;dp.b30=3;dp.c32=4;dp.dchance=70;}
    if(dnb){dp.b13=1;dp.b29=1;dp.c32=2;}
    var sc={len:8,fade:g.core?10:40,hold:0},bars=[1,1,2,1,2,2,1,2],roles=[0,1,2,3,4,2,3,4];
    var niveaux=[[100,75,0,0],[100,100,50,20],[100,100,100,55],[0,0,85,65],[100,100,100,60],[100,100,65,40],[55,0,90,100],[100,100,100,65]];
    for(var i=1;i<=8;i++){sc["bars"+i]=bars[i-1];sc["nom"+i]=roles[i-1];"abcd".split("").forEach(function(k,j){sc[k+i]=niveaux[i-1][j];});}
    mod("horloge","clock");mod("scenes","scenes8",sc);mod("seqBatterie","drum32",dp);
    if(g.break){
      var bp={len:32,pitch:bc?2:dnb?1:0,tone:dnb?.68:.84,niv:bc?.56:.67,mute:0};
      var seq=bc?[1,5,5,9,13,3,7,13,8,8,11,5,0,16,13,13,1,1,5,5,11,7,13,13,8,5,16,3,13,13,0,5]:
        dnb?[1,2,3,4,5,6,1,8,9,10,11,12,13,14,15,16,1,2,3,4,5,6,8,8,9,10,11,12,13,14,5,16]:
          [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,1,2,3,4,5,7,6,8,9,10,11,5,13,14,16,13];
      for(var i=1;i<=32;i++){bp["n"+i]=seq[i-1];bp["r"+i]=bc?([3,4,11,16,20,24,29,32].indexOf(i)>=0?4:i%3===0?2:1):[30,32].indexOf(i)>=0?2:1;
        bp["v"+i]=[bc?7:28,bc?23:31].indexOf(i)>=0?1:0;bp["p"+i]=100;}
      mod("break","break32",bp);
    }
    mod("kick",g.core?"corekick":"kick",g.core?{tune:up?63:48,dec:up?105:bc?115:185,punch:up?.85:.65,drive:up?.87:.72,type:up?.95:bc?.4:.1,tone:up?.65:.44,niv:.69}:
      {tune:psy?.19:.27,dec:psy?.08:.15,niv:.61});
    mod("caisse","snare",{tune:bc?.65:.4,dec:.18,niv:g.break?.22:.46});mod("hat","hat",{tune:.6,dec:.04,niv:g.break?.2:.34});
    mod("fx","zap",{tune:psy?.66:.47,dec:.15,fm:psy?.65:.4,niv:.35});
    mod("mixBatterie","mix4",{a:g.break?.4:.70,b:.36,c:.4,d:g.break?.70:0});
    var pb={len:32,dir:0,root:9,scale:1,trans:0,glide:50,mute:0},pm={len:bc?15:32,dir:0,root:9,scale:1,trans:0,glide:45,mute:0};
    var basse=[0,0,0,0,0,0,0,7,0,0,0,0,3,3,7,7,5,5,5,5,5,5,5,12,3,3,3,3,7,7,7,7];
    var notes=[0,7,3,12,10,7,3,0,5,12,8,17,10,7,3,7];
    for(var i=1;i<=32;i++){
      pb["n"+i]=33+basse[i-1];pb["on"+i]=psy?(i%4!==1?1:0):g.core?(i%4===3?1:0):[1,4,7,11,15,17,20,23,27,30].indexOf(i)>=0?1:0;
      pb["a"+i]=i%8===3?1:0;pb["s"+i]=0;pb["p"+i]=100;
      pm["n"+i]=57+notes[(i-1)%16];pm["on"+i]=psy?(i%4!==1?1:0):bc?(i%3!==0?1:0):(i%4===3||i%8===0?1:0);
      pm["a"+i]=i%4===3?1:0;pm["s"+i]=0;pm["p"+i]=100;
    }
    mod("seqBasse","melo32",pb,1);
    mod("basse","bassrave",{mode:dnb?1:jungle?.12:bc?.75:0,oct:0,dec:psy?52:up?38:g.core?55:jungle?270:330,
      cut:psy?.24:dnb?.34:jungle?.14:.26,env:psy?.60:.25,det:.52,sub:psy?.18:.50,drive:g.core?.35:.18,niv:.67},1);
    mod("seqMelodie","melo32",pm,1);mod("oscMelodie","wave",{oct:.5,modele:g.core?.3:psy?.08:.02,harm:g.core?.24:.10},1);
    mod("filtreMelodie","vcf",{cut:g.core?.41:.33,q:psy?.25:.1,mod:.17},1);
    mod("envMelodie","ad",{a:.002,d:psy?.037:g.core?.045:.10},1);mod("vcaMelodie","vca",{gain:0},1);
    mod("groupeAB","vca2",{g1:0,g2:0},1);mod("groupeCD","vca2",{g1:0,g2:0},1);
    var t=((60/g.bpm)*.75-.02)/1.2;
    mod("echoMelodie","delay",{time:t,fb:psy?.35:.23,mix:.22},1);mod("panMelodie","pan",{p:.08},1);
    mod("modulation","lfo",{rate:psy?.14:.05,amt:.15},1);mod("echoFX","delay",{time:t,fb:.27,mix:.30},1);
    mod("mixGeneral","mix4",{a:.64,b:g.core?.32:.56,c:g.core?.29:.31,d:.27},1);
    mod("limiteur","limit",{seuil:.58,rap:.82},1);mod("sortie","out",{niv:.65},1);
    fil("horloge","out","scenes","in");["seqBatterie","seqBasse","seqMelodie"].forEach(function(k){fil("scenes","clk",k,"clk");});
    if(g.break){fil("scenes","clk","break","clk");fil("break","out","mixBatterie","d");}
    ["kick","caisse","hat","fx"].forEach(function(k,i){fil("seqBatterie","t"+"abcd"[i],k,"trig");});
    ["kick","caisse","hat"].forEach(function(k,i){fil(k,"out","mixBatterie","abcd"[i]);});
    fil("seqBasse","cv","basse","voct");fil("seqBasse","gate","basse","trig");
    fil("seqMelodie","cv","oscMelodie","voct");fil("seqMelodie","gate","envMelodie","trig");
    fil("oscMelodie","out","filtreMelodie","in");fil("modulation","tri","filtreMelodie","cv");
    fil("filtreMelodie","out","vcaMelodie","in");fil("envMelodie","out","vcaMelodie","cv");
    fil("mixBatterie","out","groupeAB","in1");fil("basse","out","groupeAB","in2");
    fil("vcaMelodie","out","groupeCD","in1");fil("fx","out","groupeCD","in2");
    fil("scenes","a","groupeAB","cv1");fil("scenes","b","groupeAB","cv2");fil("scenes","c","groupeCD","cv1");fil("scenes","d","groupeCD","cv2");
    fil("groupeAB","o1","mixGeneral","a");fil("groupeAB","o2","mixGeneral","b");
    fil("groupeCD","o1","echoMelodie","in");fil("echoMelodie","out","panMelodie","in");fil("modulation","sine","panMelodie","cv");fil("panMelodie","out","mixGeneral","c");
    fil("groupeCD","o2","echoFX","in");fil("echoFX","out","mixGeneral","d");
    fil("mixGeneral","out","limiteur","in");fil("limiteur","out","sortie","in");return P;
  }
  EUR_MONT_FAM.splice(2,0,["rave","JUNGLE / HARD / PSY"]);
  genres.forEach(function(g){EUR_MONTAGES.push(fabriquer(g));});
})();
