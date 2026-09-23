/* v283 : deux points de départ pour les boucles personnelles, jouables aussi
   avec le break d'usine. Aucune source privée n'est imposée dans un préréglage. */
(function montagesBreaksPersonnels(){
  "use strict";
  [
    {id:"atelier-jungle",base:"rave-jungle",nom:"JUNGLE · MON BREAK",bpm:170,
      res:"Atelier boucle personnelle : ouvrez BREAK 32 dans FOCUS, puis BIBLIOTHÈQUE ou IMPORTER WAV. Basse et mélodie indépendantes.",
      seq:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,1,2,3,4,5,6,11,8,9,10,7,12,13,5,15,13]},
    {id:"atelier-breakcore",base:"rave-breakcore",nom:"BREAKCORE · MON DÉCOUPAGE",bpm:198,
      res:"Atelier découpage : chargez votre boucle dans BREAK 32, ajustez ses repères, puis jouez les inversions et roulements. CORE KICK et scènes câblés.",
      seq:[1,2,5,5,9,11,13,13,8,7,11,5,13,14,16,13,1,3,5,9,11,11,13,7,8,8,3,5,13,16,5,13]}
  ].forEach(function(g){
    var ancien=EUR_MONTAGES.find(function(p){return p.id===g.base;});if(!ancien)return;
    var p=JSON.parse(JSON.stringify(ancien));p.id=g.id;p.nom=g.nom;p.bpm=g.bpm;p.fam="avance";p.res=g.res;
    var b=p.mods[p.reperes.break][1];b.pitch=0;
    for(var i=1;i<=32;i++){
      b["n"+i]=g.seq[i-1];b["p"+i]=100;
      b["r"+i]=g.id==="atelier-jungle"?([30,32].indexOf(i)>=0?2:1):([4,8,16,24,32].indexOf(i)>=0?4:i%3===0?2:1);
      b["v"+i]=[15,31].indexOf(i)>=0?1:0;
    }
    EUR_MONTAGES.push(p);
  });
})();
