/* v280 : deux nouveaux ensembles, sans changer les 34 exemples précédents.
   VCO/MODEL accordés à 55 Hz pour que les notes de MÉLO 32 correspondent au son.
   La batterie garde DRUM 32. Les séquenceurs de basse et de mélodie sont séparés. */
(function montagesMelo32(){
  "use strict";
  function fabrique(berlin){
    var origine=EUR_MONTAGES.find(function(p){return p.id==="av-techno32";});if(!origine)return;
    var P=JSON.parse(JSON.stringify(origine));
    P.id=berlin?"av-berlin-melo32":"av-acid-melo32";
    P.nom=berlin?"BERLIN 32 · ENTRELACS":"ACID 32 · DIALOGUE";
    P.bpm=berlin?112:138;P.tonalite="LA MINEUR";
    P.res=berlin?"Basse de 32 pas et mélodie de 24 pas en aller-retour, batterie discrète et filtre lentement modulé.":
      "Batterie sur deux mesures, basse acide de 32 notes avec accents et glissés, réponse mélodique sur quatre mesures.";
    function idx(k){return P.reperes[k];}
    function fil(a,s,b,e){P.cables.push([idx(a),s,idx(b),e]);}
    function notes(l,base,melodie){
      var p={len:berlin && melodie?24:32,dir:berlin && melodie?2:0,root:9,scale:1,trans:0,glide:berlin?100:55,mute:0};
      for(var i=1;i<=32;i++){
        p["n"+i]=base+l[(i-1)%l.length];p["on"+i]=1;p["a"+i]=(i%8===1||i%8===7)?1:0;
        p["s"+i]=(!melodie && (berlin?(i%8===3||i%8===7):(i%8===4||i%8===0)))?1:0;p["p"+i]=100;
      }
      (melodie?[4,8,12,16,20,28]:berlin?[4,12,20,28]:[6,14,22,30]).forEach(function(i){p["on"+i]=0;});
      return p;
    }
    P.mods[idx("seqBasse")]=["melo32",notes([0,0,7,12,3,0,10,7,5,5,12,17,3,10,7,0,0,7,12,7,3,0,15,10,5,12,17,12,3,7,10,7],33,false)];
    P.mods[idx("seqMelodie")]=["melo32",notes([0,7,3,12,10,7,3,0,5,12,8,17,10,7,3,7,12,7,15,10,8,5,12,7,10,15,7,3,5,8,10,7],57,true)];
    P.mods[idx("oscMelodie")]=["wave",{oct:.5,modele:berlin?.04:.29,harm:.12}];
    P.mods[idx("oscBasse")][1]={oct:.5,fin:.5,fm:0};
    P.cables.forEach(function(c){
      if(c[0]===idx("horloge") && c[2]===idx("seqBasse"))c[1]=berlin?"out2":"out";
      if(c[0]===idx("horloge") && c[2]===idx("seqMelodie"))c[1]=berlin?"out":"out2";
      if(berlin && c[0]===idx("oscBasse") && c[1]==="saw")c[1]="tri";
    });
    if(!berlin){
      P.mods[idx("filtreBasse")]=["acid",{cut:.19,q:.50,env:.38,dec:.14}];
      P.cables=P.cables.filter(function(c){return !(c[2]===idx("filtreBasse") && c[3]==="cv");});
      fil("seqBasse","acc","filtreBasse","acc");fil("seqBasse","gate","filtreBasse","trig");
      P.mods[idx("envBasse")][1]={a:.002,d:.042};
    }else{
      var i=P.mods.length;P.mods.push(["clklfo",{div:.85,amt:.14}]);P.rangees.push(1);P.reperes.modulation=i;
      P.cables=P.cables.filter(function(c){return !(c[2]===idx("filtreMelodie") && c[3]==="cv");});
      fil("modulation","tri","filtreMelodie","cv");
      P.mods[idx("envBasse")][1]={a:.005,d:.16};P.mods[idx("envMelodie")][1]={a:.012,d:.11};
      var dr=P.mods[idx("seqBatterie")][1];
      for(var n=1;n<=32;n++){dr["a"+n]=(n===1||n===17)?1:0;dr["b"+n]=(n===9||n===25)?1:0;dr["c"+n]=n%4===3?1:0;dr["d"+n]=(n===15||n===31)?1:0;}
      dr.dlen=32;dr.dchance=100;
    }
    P.mods[idx("mixGeneral")][1]={a:berlin?.52:.62,b:berlin?.56:.33,c:.34,d:0};
    P.mods[idx("echoMelodie")][1]={time:((60/P.bpm)*.75-.02)/1.2,fb:berlin?.40:.32,mix:.27};
    P.mods[idx("echoPerc")][1].time=((60/P.bpm)*.75-.02)/1.2;
    return P;
  }
  [fabrique(false),fabrique(true)].forEach(function(p){if(p)EUR_MONTAGES.push(p);});
})();
