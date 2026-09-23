/* v281 : quatre parties et un arrangement de douze mesures. Aucun modèle ancien
   n'est muté. Les CV de SCÈNES 8 commandent deux DUAL VCA à gain de repos nul.
   La mélodie et la nappe sont coupées AVANT leurs effets pour garder les queues. */
(function montagesScenes8(){
  "use strict";
  function fabriquer(ambient){
    var base=EUR_MONTAGES.find(function(p){return p.id==="av-berlin-melo32";});if(!base)return;
    var P=JSON.parse(JSON.stringify(base));
    P.id=ambient?"av-ambient-scenes8":"av-progressive-scenes8";
    P.nom=ambient?"AMBIENT 8 · MARÉES":"PROGRESSIVE 8 · CONSTRUCTION";
    P.bpm=ambient?92:124;P.tonalite="LA MINEUR";
    P.res=ambient?"Nappe d'accords, basse douce, mélodie et batterie espacée : huit scènes font respirer douze mesures.":
      "Batterie, basse, mélodie et nappe entrent progressivement ; break et reprise sur un cycle de douze mesures.";
    function idx(k){return P.reperes[k];}
    function mod(k,type,p,r){P.reperes[k]=P.mods.length;P.mods.push([type,p||{}]);P.rangees.push(r||0);}
    function fil(a,s,b,e){P.cables.push([idx(a),s,idx(b),e]);}
    var ps={len:8,fade:ambient?750:40,hold:0},bars=[1,1,2,2,1,2,1,2],labels=[0,1,1,2,3,4,2,5];
    var valeurs=ambient?[[0,0,35,100],[0,70,50,100],[45,90,65,80],[65,100,90,80],[0,0,70,100],[55,85,100,85],[35,65,50,100],[0,0,20,100]]:
      [[65,0,0,75],[90,100,0,50],[100,100,65,35],[100,100,100,55],[0,0,85,100],[100,100,100,75],[100,100,45,20],[0,0,15,90]];
    for(var i=1;i<=8;i++){ps["bars"+i]=bars[i-1];ps["nom"+i]=labels[i-1];"abcd".split("").forEach(function(k,j){ps[k+i]=valeurs[i-1][j];});}
    mod("scenes","scenes8",ps,0);
    mod("groupeAB","vca2",{g1:0,g2:0},0);
    mod("groupeCD","vca2",{g1:0,g2:0},1);
    mod("accordNappe","chord",{oct:5/6,type:.25,det:ambient?.17:.09},1);
    mod("filtreNappe","vcf",{cut:ambient?.30:.35,q:.05,mod:.09},1);
    mod("reverbNappe","verb",{taille:.58,mix:ambient?.40:.26},1);
    /* Les trois liaisons audio d'origine sont remplacées, pas doublées. */
    P.cables=P.cables.filter(function(c){return !(
      (c[2]===idx("mixGeneral") && (c[3]==="a"||c[3]==="b")) ||
      (c[0]===idx("vcaMelodie")&&c[2]===idx("echoMelodie")&&c[3]==="in"));});
    fil("horloge","out","scenes","in");
    fil("mixBatterie","out","groupeAB","in1");fil("scenes","a","groupeAB","cv1");fil("groupeAB","o1","mixGeneral","a");
    fil("vcaBasse","out","groupeAB","in2");fil("scenes","b","groupeAB","cv2");fil("groupeAB","o2","mixGeneral","b");
    fil("vcaMelodie","out","groupeCD","in1");fil("scenes","c","groupeCD","cv1");fil("groupeCD","o1","echoMelodie","in");
    fil("accordNappe","out","filtreNappe","in");fil("modulation","tri","filtreNappe","cv");
    fil("filtreNappe","out","groupeCD","in2");fil("scenes","d","groupeCD","cv2");
    fil("groupeCD","o2","reverbNappe","in");fil("reverbNappe","out","mixGeneral","d");
    var dr=P.mods[idx("seqBatterie")][1];
    for(var n=1;n<=32;n++){
      dr["a"+n]=ambient?(n===1||n===19?1:0):(n%4===1?1:0);
      dr["b"+n]=(n===9||n===25)?1:0;
      dr["c"+n]=ambient?(n%8===7?1:0):(n%4===3?1:0);
      dr["d"+n]=(n===15||n===31)?1:0;
    }
    if(!ambient){dr.b32=2;dr.c32=2;dr.d31=3;}
    for(var k of ["a","b","c","d"]){dr[k+"len"]=32;dr[k+"chance"]=100;dr[k+"shift"]=0;dr[k+"mute"]=0;}
    var pb=P.mods[idx("seqBasse")][1],pm=P.mods[idx("seqMelodie")][1];
    pb.len=32;pb.dir=0;pm.len=32;pm.dir=0;
    /* Toutes les notes restent en la mineur ; la nappe est un accord de LA m7
       tenu. Les silences et les durées rendent les deux exemples différents. */
    for(var n=1;n<=32;n++){pb["on"+n]=ambient?(n%4===1?1:0):(n%8===0?0:1);pm["on"+n]=ambient?(n%4!==0?1:0):(n%8===4?0:1);}
    P.cables.forEach(function(c){
      if(c[0]===idx("horloge")&&c[2]===idx("seqBasse"))c[1]=ambient?"out4":"out2";
      if(c[0]===idx("horloge")&&c[2]===idx("seqMelodie"))c[1]="out2";
    });
    P.mods[idx("mixGeneral")][1]={a:ambient?.42:.58,b:.47,c:ambient?.28:.31,d:ambient?.25:.18};
    P.mods[idx("envBasse")][1]={a:.006,d:ambient?.30:.12};
    P.mods[idx("envMelodie")][1]={a:ambient?.10:.018,d:ambient?.30:.13};
    P.mods[idx("filtreBasse")][1]={cut:ambient?.21:.30,q:.18,mod:.14};
    P.mods[idx("echoMelodie")][1]={time:((60/P.bpm)*.75-.02)/1.2,fb:ambient?.40:.30,mix:.27};
    P.mods[idx("echoPerc")][1].time=((60/P.bpm)*.75-.02)/1.2;
    return P;
  }
  [fabriquer(false),fabriquer(true)].forEach(function(p){if(p)EUR_MONTAGES.push(p);});
})();
