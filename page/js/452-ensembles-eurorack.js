/* ================= Ensembles Eurorack — v276 =================
   Huit vrais patchs : batterie + basse + mélodie, pas des boucles audio.
   Exclusivement les modules natifs et leurs prises publiques. La sauvegarde
   reste {type,p,r,cables} ; aucun champ nouveau à importer ou à convertir.

   Une seule CLOCK pilote toutes les parties. Les valeurs de SEQ 16 sont
   des demi-tons / 24 (sa conversion native) : les deux phrases sont écrites
   en la mineur, sans quantification par lecture d'un analyseur en avance.
   Les subdivisions /2 et /4 de CLOCK commencent au premier pas, contrairement
   à un diviseur qui attend plusieurs impulsions avant sa première sortie.

   Rangée haute : horloge, batterie et basse.
   Rangée basse : mélodie, effets, MIX 4 général, LIMIT, OUTPUT.
   Les descriptions/repères sont des données du catalogue, pas du rack sauvé. */
(function ajouterEnsemblesEur(){
  "use strict";
  var definitions = [
    {id:"ens-techno", nom:"TECHNO MÉLODIQUE", bpm:128,
     res:"Kick droit, clap et charley décalé ; basse ronde et réponse mélodique sur quatre mesures.",
     kick:[4,0,.36,.32], caisse:"clap", hat:[4,2,.10],
     basse:[0,0,7,0,0,3,0,7,5,5,12,5,3,3,10,7], bclk:"out2", bcut:.29, bq:.24, bdec:.072,
     melodie:[12,7,3,7,10,7,3,0,8,5,0,5,10,7,3,7], mclk:"out4", voix:"wave", couleur:.28,
     mcut:.57, mdec:.19, echo:.75, feed:.34, reverb:.22},
    {id:"ens-acid", nom:"ACID & ARPÈGE", bpm:138,
     res:"Kick sec, basse résonante avec glissando et saturation ; arpège cristallin à l'octave supérieure.",
     kick:[4,0,.34,.22], caisse:"clap", hat:[8,1,.06],
     basse:[0,0,7,0,3,0,10,7,0,12,0,7,5,3,0,10], bclk:"out", bcut:.19, bq:.58, bdec:.037, acide:true,
     melodie:[0,7,12,15,12,7,3,7,5,12,17,12,10,7,3,7], mclk:"out2", voix:"fm2", couleur:.075,
     mcut:.65, mdec:.09, echo:.75, feed:.3, reverb:.17},
    {id:"ens-house", nom:"HOUSE NOCTURNE", bpm:122,
     res:"Quatre au sol et charley sur les contretemps ; basse rebondissante, motif doux et écho court.",
     kick:[4,0,.4,.28], caisse:"clap", hat:[4,2,.16],
     basse:[0,7,0,12,3,7,3,10,5,12,5,7,3,10,7,3], bclk:"out2", bcut:.32, bq:.18, bdec:.09, bonde:"tri",
     melodie:[7,12,15,12,3,7,10,7,5,8,12,8,3,7,10,7], mclk:"out2", voix:"wave", couleur:.06,
     mcut:.66, mdec:.11, echo:.5, feed:.22, reverb:.2},
    {id:"ens-dub", nom:"DUB PROFOND", bpm:110,
     res:"Kick syncopé, rim et charley ; basse espacée et mélodie dont les échos remplissent les silences.",
     kick:[3,0,.38,.4], caisse:"rim", hat:[4,2,.08],
     basse:[0,0,7,0,3,3,10,3,5,5,12,5,3,3,7,0], bclk:"out4", bcut:.21, bq:.14, bdec:.19, bonde:"tri",
     melodie:[12,7,3,0,10,7,3,7,12,8,5,0,10,7,3,0], mclk:"out4", voix:"fm2", couleur:.055,
     mcut:.57, mdec:.15, echo:.75, feed:.56, reverb:.28},
    {id:"ens-break", nom:"BREAK MÉLODIQUE", bpm:164,
     res:"Grosse caisse à trois frappes par mesure, caisse claire régulière ; basse roulante et thème lumineux.",
     kick:[3,0,.32,.19], caisse:"snare", hat:[8,1,.05],
     basse:[0,0,7,0,3,0,10,7,5,5,12,5,3,3,7,0], bclk:"out2", bcut:.27, bq:.21, bdec:.057,
     melodie:[12,10,7,3,7,10,15,12,8,12,17,12,10,7,3,7], mclk:"out4", voix:"wave", couleur:.31,
     mcut:.62, mdec:.13, echo:.75, feed:.29, reverb:.21},
    {id:"ens-electro", nom:"ÉLECTRO MINUIT", bpm:118,
     res:"Kick décalé, snare et charley serré ; basse carrée filtrée et petite phrase FM métallique.",
     kick:[3,2,.44,.23], caisse:"snare", hat:[8,0,.06],
     basse:[0,12,0,7,3,0,10,7,5,12,5,0,3,10,7,0], bclk:"out2", bcut:.3, bq:.3, bdec:.075, bonde:"sqr",
     melodie:[0,12,7,3,10,7,15,12,5,17,12,8,10,7,3,0], mclk:"out2", voix:"fm2", couleur:.11,
     mcut:.66, mdec:.085, echo:.5, feed:.28, reverb:.16},
    {id:"ens-down", nom:"DOWNTEMPO", bpm:90,
     res:"Batterie lente et mate ; basse triangulaire profonde, notes de cloche et espace stéréo.",
     kick:[3,0,.35,.4], caisse:"snare", hat:[8,1,.07],
     basse:[0,0,7,0,3,3,10,3,5,5,12,5,3,3,7,0], bclk:"out4", bcut:.22, bq:.13, bdec:.24, bonde:"tri",
     melodie:[12,7,3,7,10,7,3,0,8,12,5,0,10,7,3,7], mclk:"out4", voix:"fm2", couleur:.05,
     mcut:.67, mdec:.23, echo:.75, feed:.32, reverb:.3},
    {id:"ens-tribe", nom:"TRIBE HARMONIQUE", bpm:150,
     res:"Kick droit, percussions euclidiennes à cinq frappes ; basse rapide et mélodie répétitive filtrée.",
     kick:[4,0,.3,.26], caisse:"tom", caisseCoups:5, caisseDec:3, hat:[8,1,.075],
     basse:[0,0,7,0,0,3,0,7,5,5,12,5,3,3,10,7], bclk:"out", bcut:.24, bq:.35, bdec:.032,
     melodie:[0,3,7,12,7,3,10,7,5,8,12,17,12,8,10,7], mclk:"out2", voix:"wave", couleur:.4,
     mcut:.48, mdec:.08, echo:.75, feed:.37, reverb:.18}
  ];

  function fabriquer(d){
    var P = {id:d.id, nom:d.nom, fam:"ensemble", bpm:d.bpm, res:d.res,
             tonalite:"LA MINEUR", mods:[], cables:[], rangees:[], reperes:{}};
    function mod(cle, type, p, rangee){
      var i = P.mods.length;
      P.mods.push([type, p || {}]); P.rangees.push(rangee || 0); P.reperes[cle] = i;
      return i;
    }
    function fil(a, sortie, b, entree){ P.cables.push([P.reperes[a], sortie, P.reperes[b], entree]); }
    function notes(l){
      var p = {lg:1};
      for(var i=0;i<16;i++) p["n"+(i+1)] = l[i] / 24;
      return p;
    }
    function rythme(cle, coups, dec){ mod(cle, "euclid", {pas:1,coups:coups/16,dec:dec/16}); }
    mod("horloge", "clock");
    rythme("rythmeKick", d.kick[0], d.kick[1]);
    rythme("rythmeCaisse", d.caisseCoups || 2, d.caisseDec === undefined ? 4 : d.caisseDec);
    rythme("rythmeHat", d.hat[0], d.hat[1]);
    mod("kick", "kick", {tune:d.kick[2],dec:d.kick[3],niv:.88});
    mod("caisse", d.caisse, {tune:d.caisse === "tom" ? .48 : .42,dec:.3,niv:.68});
    mod("hat", "hat", {tune:.52,dec:d.hat[2],niv:.44});
    mod("mixBatterie", "mix4", {a:.85,b:.66,c:.4,d:0});
    mod("seqBasse", "seq16", notes(d.basse));
    if(d.acide) mod("glisse", "slew", {t:.025});
    mod("oscBasse", "vco", {oct:.5,fin:.5,fm:0});
    mod("filtreBasse", "vcf", {cut:d.bcut,q:d.bq,mod:d.acide ? .72 : .28});
    mod("envBasse", "ad", {a:.002,d:d.bdec});
    mod("vcaBasse", "vca", {gain:0});
    if(d.acide) mod("distBasse", "dist", {drv:.18,mix:.28});

    mod("seqMelodie", "seq16", notes(d.melodie), 1);
    mod("oscMelodie", d.voix, d.voix === "fm2" ? {oct:1,rap:3/7,idx:d.couleur} :
        {oct:1,modele:d.couleur,harm:.18}, 1);
    mod("filtreMelodie", "vcf", {cut:d.mcut,q:.14,mod:.2}, 1);
    mod("envMelodie", "ad", {a:.006,d:d.mdec}, 1);
    mod("vcaMelodie", "vca", {gain:0}, 1);
    /* Calé au tempo INITIAL du montage. ECHO reste le module natif en temps
       absolu : si le tempo change ensuite, TIME reste volontairement libre. */
    mod("echoMelodie", "delay", {time:((60/d.bpm)*d.echo-.02)/1.2,fb:d.feed,mix:.26}, 1);
    mod("reverbMelodie", "verb", {taille:.45,mix:d.reverb}, 1);
    mod("panMelodie", "pan", {p:.12}, 1);
    mod("mixGeneral", "mix4", {a:.68,b:d.bonde === "tri" ? .46 : .32,c:d.voix === "fm2" ? .37 : .5,d:0}, 1);
    mod("limiteur", "limit", {seuil:.85,rap:.72}, 1);
    mod("sortie", "out", {niv:.84}, 1);

    ["rythmeKick","rythmeCaisse","rythmeHat"].forEach(function(c){ fil("horloge","out",c,"in"); });
    fil("rythmeKick","out","kick","trig"); fil("rythmeCaisse","out","caisse","trig");
    fil("rythmeHat","out","hat","trig");
    fil("kick","out","mixBatterie","a"); fil("caisse","out","mixBatterie","b");
    fil("hat","out","mixBatterie","c");
    fil("horloge",d.bclk,"seqBasse","clk");
    if(d.acide){ fil("seqBasse","cv","glisse","in"); fil("glisse","out","oscBasse","voct"); }
    else fil("seqBasse","cv","oscBasse","voct");
    fil("seqBasse","gate","envBasse","trig");
    fil("oscBasse",d.bonde || "saw","filtreBasse","in");
    fil("envBasse","out","filtreBasse","cv"); fil("filtreBasse","out","vcaBasse","in");
    fil("envBasse","out","vcaBasse","cv");
    if(d.acide){ fil("vcaBasse","out","distBasse","in"); fil("distBasse","out","mixGeneral","b"); }
    else fil("vcaBasse","out","mixGeneral","b");
    fil("horloge",d.mclk,"seqMelodie","clk"); fil("seqMelodie","cv","oscMelodie","voct");
    fil("seqMelodie","gate","envMelodie","trig"); fil("oscMelodie","out","filtreMelodie","in");
    fil("envMelodie","out","filtreMelodie","cv"); fil("filtreMelodie","out","vcaMelodie","in");
    fil("envMelodie","out","vcaMelodie","cv"); fil("vcaMelodie","out","echoMelodie","in");
    fil("echoMelodie","out","reverbMelodie","in"); fil("reverbMelodie","out","panMelodie","in");
    fil("panMelodie","out","mixGeneral","c"); fil("mixBatterie","out","mixGeneral","a");
    fil("mixGeneral","out","limiteur","in"); fil("limiteur","out","sortie","in");
    return P;
  }
  EUR_MONT_FAM.unshift(["ensemble", "ENSEMBLES"]);
  definitions.forEach(function(d){ EUR_MONTAGES.push(fabriquer(d)); });
})();
