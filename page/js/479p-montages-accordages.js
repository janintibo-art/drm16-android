/* ================= deux montages ACCORDAGES ET ORNEMENTS — v298 =================
   ACCORDAGES ET ORNEMENTS fait monter un arpège à travers les degrés d'une
   gamme (tempérament fixe ou fichier Scala importé), en CV/GATE vers un seul
   oscillateur WAVE, enveloppe et VCA — comme MÉLO 32, mais avec un accordage
   réglable et des ornements calculés sur les écarts réels de cette gamme. */
(function montagesAccordages(){
  "use strict";
  function fabriquer(P, faire){
    P.mods = []; P.cables = []; P.rangees = []; var reperes = {};
    var perf = EUR_PERFORMANCE.vide();
    function mod(k, type, p, r){ reperes[k] = P.mods.length; P.mods.push([type, p || {}]); P.rangees.push(r === 1 ? 1 : 0); }
    function fil(a, s, b, e){ P.cables.push([reperes[a], s, reperes[b], e]); }
    function macro(i, nom, liens){
      perf.commandes[i] = {nom:nom, valeur:0, cibles:liens.map(function(l){
        var idx = reperes[l[0]], type = P.mods[idx][0], p = P.mods[idx][1];
        var kdef = EUR_CAT[type].kns.find(function(k){ return k[0] === l[1]; });
        var depart = p[l[1]] !== undefined ? p[l[1]] : kdef[4];
        return {index:idx, type:type, param:l[1], min:depart, max:l[2]};
      })};
    }
    faire(mod, fil, macro);
    P.performance = perf;
    return P;
  }

  var MONT = [];

  /* ---------- Juste · Arpège méditatif ---------- */
  MONT.push(fabriquer({id:"accordage-juste", nom:"JUSTE · ARPÈGE MÉDITATIF", fam:"accordage", bpm:72,
    res:"ACCORDAGES ET ORNEMENTS monte un arpège dans la gamme JUSTE, avec une appoggiature à chaque pas, sous un charleston discret et une réverbe ample."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("div", "clkdiv");
      mod("euclHat", "euclid", {pas:0.6, coups:0.3, dec:0.1});
      mod("hat", "hat", {tune:0.5, dec:0.16, niv:0.22});
      mod("accordage", "accordage", {racine:0, octave:0, gamme:1, longueur:7, ornement:1, vitesse:55, glisse:20}, 1);
      mod("voix", "wave", {oct:0.5, modele:0.25, harm:0.3}, 1);
      mod("env", "ad", {a:0.01, d:0.32});
      mod("vca", "vca", {gain:0.8}, 1);
      mod("mix", "mix4", {a:0.85, b:0.2, c:0, d:0}, 1);
      mod("verb", "verb", {taille:0.7, mix:0.45}, 1);
      mod("limiteur", "limit", {seuil:0.6, rap:0.5}, 1);
      mod("sortie", "out", {niv:0.7}, 1);

      fil("clock", "out", "div", "in");
      fil("div", "d4", "euclHat", "in"); fil("euclHat", "out", "hat", "trig");
      fil("clock", "out", "accordage", "clk");
      fil("accordage", "cv", "voix", "voct"); fil("accordage", "gate", "env", "trig");
      fil("env", "out", "vca", "cv"); fil("voix", "out", "vca", "in");
      fil("vca", "out", "mix", "a"); fil("hat", "out", "mix", "b");
      fil("mix", "out", "verb", "in"); fil("verb", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "ARPÈGE", [["mix","a",0]]);
      macro(1, "CHARLESTON", [["mix","b",0]]);
      macro(2, "OCTAVE", [["accordage","octave",1]]);
      macro(3, "LONGUEUR", [["accordage","longueur",16]]);
      macro(4, "ORNEMENT", [["accordage","ornement",3]]);
      macro(5, "SANS ORNEMENT", [["accordage","ornement",0]]);
      macro(6, "VITESSE", [["accordage","vitesse",15]]);
      macro(7, "RÉVERBE", [["verb","mix",0.75]]);
    }));

  /* ---------- Pythagoricien · Transe ---------- */
  MONT.push(fabriquer({id:"accordage-pytha", nom:"PYTHAGORICIEN · TRANSE", fam:"accordage", bpm:132,
    res:"Un kick et une charleston roulants sous ACCORDAGES ET ORNEMENTS, réglé en gamme PYTHAGORICIENNE avec un trille sur chaque pas, écho puis réverbe pour l'espace."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("euclKick", "euclid", {pas:0.4, coups:0.3, dec:0});
      mod("euclHat", "euclid", {pas:0.62, coups:0.6, dec:0.2});
      mod("kick", "kick", {tune:0.32, dec:0.34, niv:0.85});
      mod("hat", "hat", {tune:0.55, dec:0.08, niv:0.35});
      mod("accordage", "accordage", {racine:9, octave:0, gamme:2, longueur:5, ornement:3, vitesse:40, glisse:0}, 1);
      mod("voix", "wave", {oct:0.58, modele:0.6, harm:0.4}, 1);
      mod("env", "ad", {a:0.002, d:0.1});
      mod("vca", "vca", {gain:0.75}, 1);
      mod("mixDrums", "mix4", {a:0.8, b:0.35, c:0, d:0}, 1);
      mod("mixMain", "mix4", {a:0.75, b:0.8, c:0, d:0}, 1);
      mod("echo", "delay", {time:0.18, fb:0.32, mix:0.22}, 1);
      mod("verb", "verb", {taille:0.4, mix:0.22}, 1);
      mod("limiteur", "limit", {seuil:0.65, rap:0.6}, 1);
      mod("sortie", "out", {niv:0.72}, 1);

      fil("clock", "out", "euclKick", "in"); fil("euclKick", "out", "kick", "trig");
      fil("clock", "out", "euclHat", "in"); fil("euclHat", "out", "hat", "trig");
      fil("clock", "out", "accordage", "clk");
      fil("accordage", "cv", "voix", "voct"); fil("accordage", "gate", "env", "trig");
      fil("env", "out", "vca", "cv"); fil("voix", "out", "vca", "in");
      fil("kick", "out", "mixDrums", "a"); fil("hat", "out", "mixDrums", "b");
      fil("mixDrums", "out", "mixMain", "a"); fil("vca", "out", "mixMain", "b");
      fil("mixMain", "out", "echo", "in"); fil("echo", "out", "verb", "in");
      fil("verb", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "PERCUSSIONS", [["mixMain","a",0]]);
      macro(1, "ARPÈGE", [["mixMain","b",0]]);
      macro(2, "LONGUEUR", [["accordage","longueur",16]]);
      macro(3, "ORNEMENT", [["accordage","ornement",0]]);
      macro(4, "MORDANT", [["accordage","ornement",2]]);
      macro(5, "OCTAVE", [["accordage","octave",-1]]);
      macro(6, "ÉCHO", [["echo","mix",0.5]]);
      macro(7, "RÉVERBE", [["verb","mix",0.5]]);
    }));

  MONT.forEach(function(P){ EUR_MONTAGES.push(P); });
  EUR_MONT_FAM.push(["accordage", "ACCORDAGES"]);
})();
