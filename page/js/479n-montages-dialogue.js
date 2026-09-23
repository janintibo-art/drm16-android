/* ================= deux montages DIALOGUE — v297 =================
   DIALOGUE improvise une phrase sur CV 1/GATE 1 (la question), puis la
   rejoue décalée sur CV 2/GATE 2 (la réponse) : chaque voix va vers son
   propre oscillateur WAVE (MODEL), son enveloppe et son VCA, mélangées
   avant l'étage commun de rythme et d'espace. */
(function montagesDialogue(){
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
  function seq8notes(vals){ var p = {}; vals.forEach(function(v, i){ p["n" + (i + 1)] = v; }); return p; }

  var MONT = [];

  /* ---------- Duo · Question et réponse ---------- */
  MONT.push(fabriquer({id:"dialogue-duo", nom:"DUO · QUESTION ET RÉPONSE", fam:"dialogue", bpm:96,
    res:"Un kick et un charleston discrets sous DIALOGUE : la voix 1 improvise une phrase, la voix 2 lui répond décalée d'une quarte, une réverbe enveloppe l'ensemble."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("div", "clkdiv");
      mod("euclHat", "euclid", {pas:0.55, coups:0.35, dec:0});
      mod("kick", "kick", {tune:0.3, dec:0.4, niv:0.75});
      mod("hat", "hat", {tune:0.5, dec:0.12, niv:0.3});
      mod("dialogue", "dialogue", {root:9, scale:1, longueur:8, decalage:5, densite:75, miroir:0, glisse:40}, 1);
      mod("voz1", "wave", {oct:0.55, modele:0.2, harm:0.3}, 1);
      mod("env1", "ad", {a:0.005, d:0.14});
      mod("vca1", "vca", {gain:0.8}, 1);
      mod("voz2", "wave", {oct:0.42, modele:0.5, harm:0.15}, 1);
      mod("env2", "ad", {a:0.01, d:0.22});
      mod("vca2", "vca", {gain:0.7}, 1);
      mod("mixDrums", "mix4", {a:0.75, b:0.3, c:0, d:0}, 1);
      mod("mixVoix", "mix4", {a:0.85, b:0.7, c:0, d:0}, 1);
      mod("mixMain", "mix4", {a:0.75, b:0.8, c:0, d:0}, 1);
      mod("verb", "verb", {taille:0.55, mix:0.32}, 1);
      mod("limiteur", "limit", {seuil:0.62, rap:0.55}, 1);
      mod("sortie", "out", {niv:0.72}, 1);

      fil("clock", "out", "div", "in");
      fil("div", "d4", "kick", "trig");
      fil("clock", "out", "euclHat", "in"); fil("euclHat", "out", "hat", "trig");
      fil("clock", "out", "dialogue", "clk");
      fil("dialogue", "cv1", "voz1", "voct"); fil("dialogue", "gate1", "env1", "trig");
      fil("env1", "out", "vca1", "cv"); fil("voz1", "out", "vca1", "in");
      fil("dialogue", "cv2", "voz2", "voct"); fil("dialogue", "gate2", "env2", "trig");
      fil("env2", "out", "vca2", "cv"); fil("voz2", "out", "vca2", "in");
      fil("kick", "out", "mixDrums", "a"); fil("hat", "out", "mixDrums", "b");
      fil("vca1", "out", "mixVoix", "a"); fil("vca2", "out", "mixVoix", "b");
      fil("mixDrums", "out", "mixMain", "a"); fil("mixVoix", "out", "mixMain", "b");
      fil("mixMain", "out", "verb", "in"); fil("verb", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "PERCUSSIONS", [["mixMain","a",0]]);
      macro(1, "VOIX", [["mixMain","b",0]]);
      macro(2, "QUESTION SEULE", [["mixVoix","b",0]]);
      macro(3, "DÉCALAGE", [["dialogue","decalage",-5]]);
      macro(4, "MIROIR", [["dialogue","miroir",1]]);
      macro(5, "LONGUEUR", [["dialogue","longueur",16]]);
      macro(6, "DENSITÉ", [["dialogue","densite",35]]);
      macro(7, "RÉVERBE", [["verb","mix",0.65]]);
    }));

  /* ---------- Psy · Échange rapide ---------- */
  MONT.push(fabriquer({id:"dialogue-psy", nom:"PSY · ÉCHANGE RAPIDE", fam:"dialogue", bpm:144,
    res:"Une ligne de basse roulante sous DIALOGUE, réglé plus dense et plus court : la question et la réponse s'enchaînent vite, écho et réverbe pour l'espace."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("euclKick", "euclid", {pas:0.42, coups:0.3, dec:0});
      mod("euclHat", "euclid", {pas:0.6, coups:0.55, dec:0.15});
      mod("kick", "kick", {tune:0.34, dec:0.32, niv:0.85});
      mod("hat", "hat", {tune:0.58, dec:0.08, niv:0.4});
      mod("seqBasse", "seq8", seq8notes([0.18,0.18,0.18,0.24,0.18,0.18,0.3,0.18]));
      mod("basse", "bassrave", {mode:0.25, oct:0, dec:110, cut:0.24, env:0.35, det:0.12, sub:0.4, drive:0.15, niv:0.5}, 1);
      mod("dialogue", "dialogue", {root:9, scale:4, longueur:4, decalage:7, densite:85, miroir:1, glisse:15}, 1);
      mod("voz1", "wave", {oct:0.62, modele:0.55, harm:0.4}, 1);
      mod("env1", "ad", {a:0.002, d:0.08});
      mod("vca1", "vca", {gain:0.75}, 1);
      mod("voz2", "wave", {oct:0.5, modele:0.7, harm:0.3}, 1);
      mod("env2", "ad", {a:0.002, d:0.1});
      mod("vca2", "vca", {gain:0.7}, 1);
      mod("mixDrums", "mix4", {a:0.8, b:0.35, c:0.55, d:0}, 1);
      mod("mixVoix", "mix4", {a:0.8, b:0.75, c:0, d:0}, 1);
      mod("mixMain", "mix4", {a:0.75, b:0.75, c:0, d:0}, 1);
      mod("echo", "delay", {time:0.2, fb:0.3, mix:0.2}, 1);
      mod("verb", "verb", {taille:0.35, mix:0.2}, 1);
      mod("limiteur", "limit", {seuil:0.65, rap:0.6}, 1);
      mod("sortie", "out", {niv:0.72}, 1);

      fil("clock", "out", "euclKick", "in"); fil("euclKick", "out", "kick", "trig");
      fil("clock", "out", "euclHat", "in"); fil("euclHat", "out", "hat", "trig");
      fil("clock", "out", "seqBasse", "clk");
      fil("seqBasse", "cv", "basse", "voct"); fil("seqBasse", "gate", "basse", "trig");
      fil("clock", "out", "dialogue", "clk");
      fil("dialogue", "cv1", "voz1", "voct"); fil("dialogue", "gate1", "env1", "trig");
      fil("env1", "out", "vca1", "cv"); fil("voz1", "out", "vca1", "in");
      fil("dialogue", "cv2", "voz2", "voct"); fil("dialogue", "gate2", "env2", "trig");
      fil("env2", "out", "vca2", "cv"); fil("voz2", "out", "vca2", "in");
      fil("kick", "out", "mixDrums", "a"); fil("hat", "out", "mixDrums", "b"); fil("basse", "out", "mixDrums", "c");
      fil("vca1", "out", "mixVoix", "a"); fil("vca2", "out", "mixVoix", "b");
      fil("mixDrums", "out", "mixMain", "a"); fil("mixVoix", "out", "mixMain", "b");
      fil("mixMain", "out", "echo", "in"); fil("echo", "out", "verb", "in");
      fil("verb", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "PERCUSSIONS + BASSE", [["mixMain","a",0]]);
      macro(1, "VOIX", [["mixMain","b",0]]);
      macro(2, "BASSE SEULE", [["mixDrums","c",0]]);
      macro(3, "LONGUEUR", [["dialogue","longueur",16]]);
      macro(4, "MIROIR", [["dialogue","miroir",0]]);
      macro(5, "DÉCALAGE", [["dialogue","decalage",-7]]);
      macro(6, "ÉCHO", [["echo","mix",0.55]]);
      macro(7, "RÉVERBE", [["verb","mix",0.5]]);
    }));

  MONT.forEach(function(P){ EUR_MONTAGES.push(P); });
  EUR_MONT_FAM.push(["dialogue", "DIALOGUE"]);
})();
