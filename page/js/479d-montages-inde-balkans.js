/* v289 — quatre compositions originales, pas de reprise d'une chanson.
   Les hauteurs sont en tempérament égal ; aucun raga/maqam complet n'est simulé.
   Le 7/8 emploie des cycles réels de 14 doubles-croches (4+4+6), sans SCÈNES 8
   ni fills automatiques 4/4 qui imposeraient une frontière de 16 pas. */
(function montagesCouleurs(){
  "use strict";
  function fabriquer(style){
    var inde=style<2,transe=style===1,balkan=style===2,dabke=style===3;
    var bpm=[112,144,138,148][style],L=balkan?28:32;
    var P={id:["couleur-inde","couleur-inde-transe","couleur-balkans7","couleur-dabke"][style],
      nom:["INDE · CORDES ET PEAUX","INDE · TRANSE DES CORDES","BALKANS · DANSE EN SEPT","DABKÉ · ANCHES ÉLECTRIQUES"][style],fam:"couleurs",bpm:bpm,
      tonalite:inde?"RÉ · COULEUR PENTATONIQUE":balkan?"RÉ MINEUR HARMONIQUE · 7/8":"RÉ · COULEUR HIJAZ TEMPÉRÉE",
      res:["Cordes pincées, peaux graves/aiguës, basse douce et bourdon alternant ré/la. Quatre parties et scènes.",
        "Fusion électronique : cordes brillantes, peaux rapides, kick régulier, basse et réponse d'anche.",
        "Anches et peaux en 7/8 : groupes 2+2+3 croches. Basse de 14 pas, mélodies de 28 pas. Sans scènes ni fills 4/4.",
        "Danse électronique : anche nasale, notes d'appel, vibrato, percussion grave/aiguë et phrases en réponse. Composition originale."][style],
      mods:[],cables:[],rangees:[],reperes:{},cyclePas:balkan?14:16};
    function mod(k,type,p,r){P.reperes[k]=P.mods.length;P.mods.push([type,p||{}]);P.rangees.push(r===1?1:0);}
    function fil(a,s,b,e){P.cables.push([P.reperes[a],s,P.reperes[b],e]);}
    function notes(seq,longueur,on,slide){
      var p={len:longueur,dir:0,root:2,scale:0,trans:0,glide:55,mute:0};
      for(var i=1;i<=32;i++){
        p["n"+i]=seq[(i-1)%seq.length];p["on"+i]=on.indexOf((i-1)%longueur+1)>=0?1:0;
        p["a"+i]=i%4===1?1:0;p["s"+i]=slide.indexOf((i-1)%longueur+1)>=0?1:0;p["p"+i]=100;
      }return p;
    }
    mod("horloge","clock");
    if(!balkan){
      var sc={len:8,fade:40,hold:0};
      var levels=[[90,50,100,40],[100,100,100,65],[100,100,90,100],[20,0,100,75],[100,100,100,85],[80,100,70,100],[0,0,100,60],[100,100,100,100]];
      for(var i=1;i<=8;i++){sc["bars"+i]=[1,1,2,1,2,2,1,2][i-1];sc["nom"+i]=[0,1,2,3,4,2,3,4][i-1];"abcd".split("").forEach(function(k,j){sc[k+i]=levels[i-1][j];});}
      mod("scenes","scenes8",sc);
    }
    var dp={};"abcd".split("").forEach(function(k){dp[k+"len"]=balkan?14:32;dp[k+"shift"]=0;dp[k+"chance"]=100;dp[k+"mute"]=0;for(var i=1;i<=32;i++)dp[k+i]=0;});
    var rows=balkan?[[1,5,9,12],[3,7,11,13],[1,3,5,7,9,11,13],[1,9]]:
      dabke?[[1,7,9,17,23,25],[3,5,11,13,15,19,21,27,29,31],[2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32],[1,9,17,25]]:
        [[1,7,9,17,23,25],[3,5,11,13,15,19,21,27,29,31],[3,7,11,15,19,23,27,31],transe?[1,5,9,13,17,21,25,29]:[1,17]];
    rows.forEach(function(row,j){row.forEach(function(i){dp["abcd"[j]+i]=1;});});
    if(!balkan){dp.b16=2;dp.b32=transe||dabke?3:2;}
    mod("seqBatterie","drum32",dp);
    mod("peaux","peauxduo",{low:inde?73.42:98,high:inde?293.66:392,dec:inde?310:180,bend:inde?.65:.32,mode:inde?.05:.85,snap:inde?.45:.65,niv:.70});
    mod("hat","shaker",{tune:.60,dec:.08,niv:.28});
    mod("kick","kicklab",{tune:49,dec:transe?110:140,sweep:20,knee:0,fall:15,settle:35,drive:.06,tone:.32,click:.08,clickdec:5,niv:.55});
    mod("mixBatterie","mix4",{a:.9,b:.48,c:transe?.75:.42,d:0});
    var bnotes=balkan?[38,38,38,45,38,38,45,45,38,38,45,45,50,45]:[38,38,38,45,38,38,45,38,38,38,50,45,38,45,38,45];
    mod("seqBasse","melo32",notes(bnotes,balkan?14:32,balkan?[1,5,9,12]:transe?[3,4,7,8,11,12,15,16,19,20,23,24,27,28,31,32]:[1,7,9,15,17,23,25,31],[]),1);
    mod("basse","bassrave",{mode:.06,oct:0,dec:transe?65:160,cut:.17,env:.22,det:.12,sub:.32,drive:.08,niv:.52},1);
    var mel=inde?[62,65,67,69,72,69,67,65,62,67,69,74,72,69,67,65,62,65,67,69,77,74,72,69,67,65,62,65,67,69,65,62]:
      balkan?[62,64,65,69,67,69,70,69,73,74,73,70,69,65,62,65,64,62,65,69,70,73,74,77,74,73,70,69]:
        [62,63,66,67,69,67,66,63,62,66,67,69,70,69,67,66,74,73,70,69,67,66,67,69,66,63,62,63,66,67,66,62];
    var on=Array.from({length:L},function(_,i){return i+1;}).filter(function(i){return balkan?i!==4&&i!==18:transe||dabke?i%8!==0:i%2===1||i===16;});
    mod("seqMelodie","melo32",notes(mel,L,on,inde?[7,23]:[5,6,13,21,22]),1);
    mod("melodie",inde?"cordesreso":"anchelead",inde?{oct:0,fine:0,dec:transe?290:650,buzz:transe?.72:.5,res:.40,tone:.70,niv:.70}:
      {oct:0,fine:0,dec:balkan?160:170,attack:5,mode:balkan?.3:.9,tone:.68,vib:balkan?14:22,rate:6.2,grace:balkan?35:80,niv:.65},1);
    var counter=inde&&!transe?Array.from({length:32},function(_,i){return i<16?50:57;}):inde?[74,77,79,81,79,77,74,72]:balkan?[50,50,57,57,53,53,57,57,50,50,57,57,61,57]:[50,51,54,55,57,55,54,51];
    var con=inde&&!transe?[1,17]:balkan?[1,5,9,15,19,23]:[5,7,13,15,21,23,29,31];
    mod("seqReponse","melo32",notes(counter,L,con,[]),1);
    mod("reponse",transe?"anchelead":"cordesreso",transe?{oct:0,fine:0,dec:190,attack:12,mode:.25,tone:.48,vib:14,rate:5.5,grace:30,niv:.40}:
      {oct:0,fine:0,dec:inde?2200:400,buzz:inde?.12:.54,res:inde?.85:.35,tone:inde?.38:.52,niv:inde?.42:.55},1);
    mod("groupeAB","vca2",{g1:balkan?1:0,g2:balkan?1:0},1);mod("groupeCD","vca2",{g1:balkan?1:0,g2:balkan?1:0},1);
    var time=(60/bpm*.75-.02)/1.2;
    mod("echoMelodie","delay",{time:time,fb:.26,mix:inde?.3:.18},1);mod("panMelodie","pan",{p:.10},1);
    mod("echoReponse","delay",{time:time,fb:.30,mix:.30},1);mod("panReponse","pan",{p:-.25},1);
    mod("mixGeneral","mix4",{a:.67,b:.43,c:.65,d:.48},1);mod("limiteur","limit",{seuil:.55,rap:.8},1);mod("sortie","out",{niv:.70},1);
    if(!balkan)fil("horloge","out","scenes","in");
    ["seqBatterie","seqBasse","seqMelodie","seqReponse"].forEach(function(k){fil(balkan?"horloge":"scenes",balkan?"out":"clk",k,"clk");});
    fil("seqBatterie","ta","peaux","low");fil("seqBatterie","tb","peaux","high");fil("seqBatterie","tc","hat","trig");fil("seqBatterie","td","kick","trig");
    fil("peaux","out","mixBatterie","a");fil("hat","out","mixBatterie","b");fil("kick","out","mixBatterie","c");
    [["seqBasse","basse"],["seqMelodie","melodie"],["seqReponse","reponse"]].forEach(function(pair){fil(pair[0],"cv",pair[1],"voct");fil(pair[0],"gate",pair[1],"trig");});
    fil("mixBatterie","out","groupeAB","in1");fil("basse","out","groupeAB","in2");fil("melodie","out","groupeCD","in1");fil("reponse","out","groupeCD","in2");
    if(!balkan){fil("scenes","a","groupeAB","cv1");fil("scenes","b","groupeAB","cv2");fil("scenes","c","groupeCD","cv1");fil("scenes","d","groupeCD","cv2");}
    fil("groupeAB","o1","mixGeneral","a");fil("groupeAB","o2","mixGeneral","b");
    fil("groupeCD","o1","echoMelodie","in");fil("echoMelodie","out","panMelodie","in");fil("panMelodie","out","mixGeneral","c");
    fil("groupeCD","o2","echoReponse","in");fil("echoReponse","out","panReponse","in");fil("panReponse","out","mixGeneral","d");
    fil("mixGeneral","out","limiteur","in");fil("limiteur","out","sortie","in");
    var macros=EUR_PERFORMANCE.vide();
    ["PERCUSSIONS","BASSE","MÉLODIE",inde&&!transe?"BOURDON":"RÉPONSE"].forEach(function(n,i){macros.commandes[i]={nom:n,valeur:1,cibles:[{index:P.reperes.mixGeneral,type:"mix4",param:"abcd"[i],min:0,max:P.mods[P.reperes.mixGeneral][1]["abcd"[i]]}]};});
    function macro(i,n,liens){macros.commandes[i]={nom:n,valeur:0,cibles:liens.map(function(l){var idx=P.reperes[l[0]],x=P.mods[idx],k=EUR_CAT[x[0]].kns.find(function(k){return k[0]===l[1];});return {index:idx,type:x[0],param:k[0],min:x[1][k[0]]===undefined?k[4]:x[1][k[0]],max:l[2]};})};}
    macro(4,"COULEUR MÉLODIE",[["melodie",inde?"buzz":"mode",1],["melodie","tone",.95]]);
    macro(5,inde?"RÉSONANCE CORDES":"VIBRATO ANCHE",[["melodie",inde?"res":"vib",inde?.85:55]]);
    macro(6,"ÉCHOS",[["echoMelodie","mix",.50],["echoReponse","mix",.48]]);
    macro(7,"PEAUX VIVANTES",[["peaux","bend",.95],["peaux","snap",.9]]);P.performance=macros;
    return P;
  }
  EUR_MONT_FAM.push(["couleurs","INDE / BALKANS / DABKÉ"]);
  [0,1,2,3].forEach(function(i){EUR_MONTAGES.push(fabriquer(i));});
})();
