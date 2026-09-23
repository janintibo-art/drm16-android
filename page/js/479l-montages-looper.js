/* ================= deux montages LOOPER DE RACK — v296 =================
   Une ligne mélodique alimente l'entrée IN du LOOPER : RECORD (au doigt,
   dans la façade) capture ce qu'elle joue à ce moment-là, au prochain temps
   fort, et le boucle. Les quatre pistes restent vides tant qu'on n'a pas
   armé RECORD une fois sur scène — les deux montages tournent déjà, prêts
   à être joués et bouclés en direct. */
(function montagesLooper(){
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

  /* ---------- Boucle · Phrase captée en direct ---------- */
  MONT.push(fabriquer({id:"looper-boucle", nom:"BOUCLE · PHRASE CAPTÉE EN DIRECT", fam:"looper", bpm:112,
    res:"Un fond batterie/basse tourne pendant qu'une petite mélodie joue sur VCO ; armer RECORD sur une piste du LOOPER en capture un passage et le boucle, en direct."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("div", "clkdiv");
      mod("euclHat", "euclid", {pas:0.6, coups:0.4, dec:0});
      mod("kick", "kick", {tune:0.32, dec:0.42, niv:0.9});
      mod("hat", "hat", {tune:0.55, dec:0.1, niv:0.4});
      mod("seqBasse", "seq8", seq8notes([0.2,0.2,0.28,0.2,0.2,0.2,0.32,0.24]));
      mod("basse", "bassrave", {mode:0.2, oct:0, dec:140, cut:0.2, env:0.3, det:0.1, sub:0.4, drive:0.1, niv:0.55}, 1);
      mod("seqMelo", "seq8", seq8notes([0.55,0.6,0.62,0.6,0.67,0.62,0.6,0.58]));
      mod("melo", "wave", {oct:0.5, modele:0.15, harm:0.3}, 1);
      mod("env", "ad", {a:0.01, d:0.18});
      mod("vca", "vca", {gain:0.85}, 1);
      mod("looper", "looper", {mes:2, fondu:10, niv:80, niv1:80, niv2:80, niv3:80, niv4:80}, 1);
      mod("mixDrums", "mix4", {a:0.85, b:0.4, c:0, d:0}, 1);
      mod("mixMain", "mix4", {a:0.85, b:0.55, c:0.7, d:0}, 1);
      mod("echo", "delay", {time:0.28, fb:0.32, mix:0.22}, 1);
      mod("limiteur", "limit", {seuil:0.6, rap:0.6}, 1);
      mod("sortie", "out", {niv:0.72}, 1);

      fil("clock", "out", "div", "in");
      fil("div", "d4", "kick", "trig");
      fil("clock", "out", "euclHat", "in"); fil("euclHat", "out", "hat", "trig");
      fil("clock", "out", "seqBasse", "clk");
      fil("seqBasse", "cv", "basse", "voct"); fil("seqBasse", "gate", "basse", "trig");
      fil("clock", "out", "seqMelo", "clk");
      fil("seqMelo", "cv", "melo", "voct"); fil("seqMelo", "gate", "env", "trig");
      fil("env", "out", "vca", "cv"); fil("melo", "out", "vca", "in");
      fil("vca", "out", "looper", "in"); fil("clock", "out", "looper", "clk");
      fil("kick", "out", "mixDrums", "a"); fil("hat", "out", "mixDrums", "b");
      fil("mixDrums", "out", "mixMain", "a"); fil("basse", "out", "mixMain", "b");
      fil("looper", "out", "mixMain", "c");
      fil("mixMain", "out", "echo", "in"); fil("echo", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "PERCUSSIONS", [["mixMain","a",0]]);
      macro(1, "BASSE", [["mixMain","b",0]]);
      macro(2, "LOOPER", [["mixMain","c",0.95]]);
      macro(3, "NIVEAU LOOPER", [["looper","niv",100]]);
      macro(4, "PISTE 1", [["looper","niv1",0]]);
      macro(5, "PISTE 2", [["looper","niv2",0]]);
      macro(6, "ÉCHOS", [["echo","mix",0.6]]);
      macro(7, "MÉLODIE SÈCHE", [["mixMain","c",0]]);
    }));

  /* ---------- Dub · Couches accumulées ---------- */
  MONT.push(fabriquer({id:"looper-dub", nom:"DUB · COUCHES ACCUMULÉES", fam:"looper", bpm:78,
    res:"Kick et rim clap épars, basse dub lente : le LOOPER capte des passages de la mélodie au fil du set pour empiler des couches qui reviennent, échos et ressort en dessous."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("div", "clkdiv");
      mod("euclKick", "euclid", {pas:0.5, coups:0.22, dec:0});
      mod("euclRim", "euclid", {pas:0.65, coups:0.28, dec:0.5});
      mod("kick", "kick", {tune:0.3, dec:0.5, niv:0.85});
      mod("rim", "rim", {tune:0.55, dec:0.3, niv:0.5});
      mod("seqBasse", "seq8", seq8notes([0.16,0.16,0.16,0.16,0.24,0.24,0.16,0.16]));
      mod("basse", "bassrave", {mode:0.1, oct:-1, dec:220, cut:0.16, env:0.2, det:0.08, sub:0.42, drive:0.06, niv:0.5}, 1);
      mod("seqMelo", "seq8", seq8notes([0.45,0.5,0.55,0.5,0.6,0.55,0.5,0.48]));
      mod("melo", "wave", {oct:0.65, modele:0.4, harm:0.25}, 1);
      mod("env", "ad", {a:0.02, d:0.5});
      mod("vca", "vca", {gain:0.8}, 1);
      mod("looper", "looper", {mes:4, fondu:20, niv:75, niv1:75, niv2:75, niv3:75, niv4:75}, 1);
      mod("mixDrums", "mix4", {a:0.8, b:0.4, c:0, d:0}, 1);
      mod("mixMain", "mix4", {a:0.8, b:0.55, c:0.65, d:0}, 1);
      mod("echo", "bbd", {time:0.42, fb:0.5, mix:0.4}, 1);
      mod("spring", "spring", {ten:0.4, mix:0.3}, 1);
      mod("limiteur", "limit", {seuil:0.62, rap:0.55}, 1);
      mod("sortie", "out", {niv:0.7}, 1);

      fil("clock", "out", "div", "in");
      fil("clock", "out", "euclKick", "in"); fil("euclKick", "out", "kick", "trig");
      fil("div", "d3", "euclRim", "in"); fil("euclRim", "out", "rim", "trig");
      fil("clock", "out", "seqBasse", "clk");
      fil("seqBasse", "cv", "basse", "voct"); fil("seqBasse", "gate", "basse", "trig");
      fil("clock", "out", "seqMelo", "clk");
      fil("seqMelo", "cv", "melo", "voct"); fil("seqMelo", "gate", "env", "trig");
      fil("env", "out", "vca", "cv"); fil("melo", "out", "vca", "in");
      fil("vca", "out", "looper", "in"); fil("clock", "out", "looper", "clk");
      fil("kick", "out", "mixDrums", "a"); fil("rim", "out", "mixDrums", "b");
      fil("mixDrums", "out", "mixMain", "a"); fil("basse", "out", "mixMain", "b");
      fil("looper", "out", "mixMain", "c");
      fil("mixMain", "out", "echo", "in"); fil("echo", "out", "spring", "in");
      fil("spring", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "PERCUSSIONS", [["mixMain","a",0]]);
      macro(1, "BASSE", [["mixMain","b",0]]);
      macro(2, "LOOPER", [["mixMain","c",0.95]]);
      macro(3, "NIVEAU LOOPER", [["looper","niv",100]]);
      macro(4, "PISTE 1", [["looper","niv1",0]]);
      macro(5, "PISTE 2", [["looper","niv2",0]]);
      macro(6, "ÉCHOS", [["echo","mix",0.7]]);
      macro(7, "RESSORT", [["spring","mix",0.65]]);
    }));

  MONT.forEach(function(P){ EUR_MONTAGES.push(P); });
  EUR_MONT_FAM.push(["looper", "LOOPER DE RACK"]);
})();
