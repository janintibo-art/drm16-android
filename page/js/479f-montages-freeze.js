/* ================= trois montages FREEZE GRANULAIRE — v290 =================
   Le module capture une phrase, un bouton PERFORMANCE fait glisser le mélange
   de la phrase reconnaissable vers le nuage de grains qu'elle devient. */
(function montagesFreeze(){
  "use strict";
  function fabriquer(P, faire){
    P.mods = []; P.cables = []; P.rangees = []; var reperes = {};
    var commandes = EUR_PERFORMANCE.vide().commandes;
    function mod(k, type, p, r){ reperes[k] = P.mods.length; P.mods.push([type, p || {}]); P.rangees.push(r === 1 ? 1 : 0); }
    function fil(a, s, b, e){ P.cables.push([reperes[a], s, reperes[b], e]); }
    function macro(i, nom, liens){
      commandes[i] = {nom:nom, valeur:0, cibles:liens.map(function(l){
        var idx = reperes[l[0]], type = P.mods[idx][0], p = P.mods[idx][1];
        var kdef = EUR_CAT[type].kns.find(function(k){ return k[0] === l[1]; });
        var depart = p[l[1]] !== undefined ? p[l[1]] : kdef[4];
        return {index:idx, type:type, param:l[1], min:depart, max:l[2]};
      })};
    }
    faire(mod, fil, macro);
    P.performance = {version:1, commandes:commandes, memoire:null};
    return P;
  }
  function seq8notes(vals){ var p = {}; vals.forEach(function(v, i){ p["n" + (i + 1)] = v; }); return p; }

  var MONT = [];

  /* ---------- Psy · Cordes suspendues ---------- */
  MONT.push(fabriquer({id:"freeze-psy", nom:"PSY · CORDES SUSPENDUES", fam:"etrange", bpm:145,
    res:"Une corde pincée continue sa phrase pendant qu'un bouton la transforme en nappe granulaire flottante, kick et basse psy dessous."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("div", "clkdiv");
      mod("euclHat", "euclid", {pas:0.7, coups:0.42, dec:0});
      mod("euclGrain", "euclid", {pas:0.3, coups:0.6, dec:0.2});
      mod("kick", "kick", {tune:0.3, dec:0.35, niv:0.9});
      mod("hat", "hat", {tune:0.55, dec:0.1, niv:0.4});
      mod("seqCorde", "seq8", seq8notes([0.5,0.58,0.67,0.58,0.75,0.67,0.58,0.5]));
      mod("corde", "cordesreso", {oct:0, fine:0, dec:900, buzz:0.5, res:0.55, tone:0.6, niv:0.65}, 1);
      mod("freeze", "freeze", {dur:2, pos:0.3, spray:0.3, taille:120, haut:0, niv:0.6}, 1);
      mod("seqBasse", "seq8", seq8notes([0.2,0.2,0.28,0.2,0.2,0.2,0.28,0.24]), 1);
      mod("basse", "bassrave", {mode:0.1, oct:0, dec:130, cut:0.2, env:0.25, det:0.1, sub:0.35, drive:0.1, niv:0.5}, 1);
      mod("mixDrums", "mix4", {a:0.9, b:0.45, c:0, d:0}, 1);
      mod("mixMain", "mix4", {a:0.8, b:0.5, c:0.45, d:0.55}, 1);
      mod("verb", "verb", {taille:0.4, mix:0.2}, 1);
      mod("limiteur", "limit", {seuil:0.6, rap:0.6}, 1);
      mod("sortie", "out", {niv:0.72}, 1);

      fil("clock", "out", "div", "in");
      fil("div", "d4", "kick", "trig");
      fil("clock", "out", "euclHat", "in");
      fil("euclHat", "out", "hat", "trig");
      fil("kick", "out", "mixDrums", "a"); fil("hat", "out", "mixDrums", "b");
      fil("clock", "out", "seqCorde", "clk");
      fil("seqCorde", "cv", "corde", "voct"); fil("seqCorde", "gate", "corde", "trig");
      fil("corde", "out", "freeze", "in");
      fil("div", "d16", "freeze", "capt");
      fil("clock", "out", "euclGrain", "in");
      fil("euclGrain", "out", "freeze", "trig");
      fil("clock", "out", "seqBasse", "clk");
      fil("seqBasse", "cv", "basse", "voct"); fil("seqBasse", "gate", "basse", "trig");
      fil("mixDrums", "out", "mixMain", "a"); fil("corde", "out", "mixMain", "b");
      fil("freeze", "out", "mixMain", "c"); fil("basse", "out", "mixMain", "d");
      fil("mixMain", "out", "verb", "in"); fil("verb", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "PERCUSSIONS", [["mixMain","a",0]]);
      macro(1, "BASSE", [["mixMain","d",0]]);
      macro(2, "CORDE → NUAGE", [["mixMain","b",0], ["mixMain","c",0.85]]);
      macro(3, "TAILLE DES GRAINS", [["freeze","taille",260]]);
      macro(4, "POSITION", [["freeze","pos",1]]);
      macro(5, "SPRAY", [["freeze","spray",1]]);
      macro(6, "HAUTEUR", [["freeze","haut",-12]]);
      macro(7, "NAPPE", [["verb","mix",0.7]]);
    }));

  /* ---------- Jungle · Nuage de voix ---------- */
  MONT.push(fabriquer({id:"freeze-jungle", nom:"JUNGLE · NUAGE DE VOIX", fam:"etrange", bpm:172,
    res:"Une anche imite une voix nasale capturée puis dispersée en grains, au-dessus d'un roulement de batterie jungle."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("div", "clkdiv");
      mod("euclA", "euclid", {pas:0.55, coups:0.55, dec:0});
      mod("euclB", "euclid", {pas:0.85, coups:0.35, dec:0.4});
      mod("euclGrain", "euclid", {pas:0.25, coups:0.65, dec:0.1});
      mod("kick", "kick", {tune:0.28, dec:0.3, niv:0.92});
      mod("clap", "clap", {tune:0.5, dec:0.35, niv:0.55});
      mod("hat", "hat", {tune:0.6, dec:0.08, niv:0.35});
      mod("seqVoix", "seq8", seq8notes([0.55,0.55,0.63,0.55,0.7,0.63,0.55,0.5]));
      mod("voix", "anchelead", {oct:0, fine:0, dec:170, attack:6, mode:0.85, tone:0.62, vib:18, rate:6.4, grace:60, niv:0.55}, 1);
      mod("freeze", "freeze", {dur:1.6, pos:0.4, spray:0.55, taille:70, haut:5, niv:0.7}, 1);
      mod("mixDrums", "mix4", {a:0.92, b:0.5, c:0.35, d:0}, 1);
      mod("mixMain", "mix4", {a:0.85, b:0.15, c:0.6, d:0}, 1);
      mod("echo", "delay", {time:0.3, fb:0.4, mix:0.32}, 1);
      mod("limiteur", "limit", {seuil:0.58, rap:0.7}, 1);
      mod("sortie", "out", {niv:0.72}, 1);

      fil("clock", "out", "div", "in");
      fil("clock", "out", "euclA", "in"); fil("euclA", "out", "kick", "trig");
      fil("div", "d2", "euclB", "in"); fil("euclB", "out", "clap", "trig");
      fil("div", "d4", "hat", "trig");
      fil("kick", "out", "mixDrums", "a"); fil("clap", "out", "mixDrums", "b"); fil("hat", "out", "mixDrums", "c");
      fil("clock", "out", "seqVoix", "clk");
      fil("seqVoix", "cv", "voix", "voct"); fil("seqVoix", "gate", "voix", "trig");
      fil("voix", "out", "freeze", "in");
      fil("div", "d8", "freeze", "capt");
      fil("clock", "out", "euclGrain", "in"); fil("euclGrain", "out", "freeze", "trig");
      fil("mixDrums", "out", "mixMain", "a"); fil("voix", "out", "mixMain", "b"); fil("freeze", "out", "mixMain", "c");
      fil("mixMain", "out", "echo", "in"); fil("echo", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "PERCUSSIONS", [["mixMain","a",0]]);
      macro(1, "VOIX SÈCHE", [["mixMain","b",0]]);
      macro(2, "NUAGE DE VOIX", [["mixMain","c",0.9]]);
      macro(3, "TAILLE DES GRAINS", [["freeze","taille",250]]);
      macro(4, "SPRAY", [["freeze","spray",1]]);
      macro(5, "HAUTEUR", [["freeze","haut",-24]]);
      macro(6, "ÉCHOS", [["echo","mix",0.6]]);
      macro(7, "POSITION", [["freeze","pos",1]]);
    }));

  /* ---------- Dub · Mémoire des anches ---------- */
  MONT.push(fabriquer({id:"freeze-dub", nom:"DUB · MÉMOIRE DES ANCHES", fam:"etrange", bpm:78,
    res:"Une phrase d'anche est capturée puis reparaît par bribes éparses, comme un souvenir, sous un rythme dub clairsemé."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("div", "clkdiv");
      mod("euclKick", "euclid", {pas:0.5, coups:0.22, dec:0});
      mod("euclRim", "euclid", {pas:0.65, coups:0.28, dec:0.5});
      mod("euclGrain", "euclid", {pas:0.35, coups:0.22, dec:0.15});
      mod("kick", "kick", {tune:0.32, dec:0.5, niv:0.85});
      mod("rim", "rim", {tune:0.55, dec:0.3, niv:0.5});
      mod("seqAnche", "seq8", seq8notes([0.45,0.5,0.58,0.45,0.63,0.58,0.5,0.45]));
      mod("anche", "anchelead", {oct:0, fine:0, dec:520, attack:14, mode:0.35, tone:0.5, vib:10, rate:4.5, grace:25, niv:0.6}, 1);
      mod("freeze", "freeze", {dur:3.5, pos:0.35, spray:0.7, taille:240, haut:-7, niv:0.65}, 1);
      mod("mixDrums", "mix4", {a:0.85, b:0.4, c:0, d:0}, 1);
      mod("mixMain", "mix4", {a:0.8, b:0.35, c:0.55, d:0}, 1);
      mod("echo", "bbd", {time:0.45, fb:0.55, mix:0.4}, 1);
      mod("spring", "spring", {ten:0.4, mix:0.3}, 1);
      mod("limiteur", "limit", {seuil:0.62, rap:0.55}, 1);
      mod("sortie", "out", {niv:0.7}, 1);

      fil("clock", "out", "div", "in");
      fil("clock", "out", "euclKick", "in"); fil("euclKick", "out", "kick", "trig");
      fil("div", "d3", "euclRim", "in"); fil("euclRim", "out", "rim", "trig");
      fil("kick", "out", "mixDrums", "a"); fil("rim", "out", "mixDrums", "b");
      fil("clock", "out", "seqAnche", "clk");
      fil("seqAnche", "cv", "anche", "voct"); fil("seqAnche", "gate", "anche", "trig");
      fil("anche", "out", "freeze", "in");
      fil("div", "d8", "freeze", "capt");
      fil("clock", "out", "euclGrain", "in"); fil("euclGrain", "out", "freeze", "trig");
      fil("mixDrums", "out", "mixMain", "a"); fil("anche", "out", "mixMain", "b"); fil("freeze", "out", "mixMain", "c");
      fil("mixMain", "out", "echo", "in"); fil("echo", "out", "spring", "in");
      fil("spring", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "PERCUSSIONS", [["mixMain","a",0]]);
      macro(1, "ANCHE SÈCHE", [["mixMain","b",0]]);
      macro(2, "MÉMOIRE", [["mixMain","c",0.9]]);
      macro(3, "SPRAY", [["freeze","spray",1]]);
      macro(4, "TAILLE DES GRAINS", [["freeze","taille",300]]);
      macro(5, "HAUTEUR", [["freeze","haut",-24]]);
      macro(6, "ÉCHOS", [["echo","mix",0.7]]);
      macro(7, "RESSORT", [["spring","mix",0.65]]);
    }));

  MONT.forEach(function(P){ EUR_MONTAGES.push(P); });
})();
