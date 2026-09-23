/* ================= deux montages POLY 4 — v295 =================
   POLY 4 n'a qu'une sortie OUT : rien à séquencer, il se joue au doigt
   pendant que le reste du montage tourne. Les deux exemples montrent deux
   réglages différents (nappe lente, accords courts) au-dessus d'un fond
   rythmique classique du rack. */
(function montagesPoly4(){
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

  /* ---------- Nappe · Accords tenus au doigt ---------- */
  MONT.push(fabriquer({id:"poly4-nappe", nom:"NAPPE · ACCORDS AU DOIGT", fam:"poly4", bpm:86,
    res:"Un fond lent (kick doux, shaker épars, basse séquencée) sous POLY 4 : à jouer au doigt, ses accords traversent un écho puis une réverbe."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("div", "clkdiv");
      mod("euclHat", "euclid", {pas:0.55, coups:0.3, dec:0.25});
      mod("kick", "kick", {tune:0.3, dec:0.5, niv:0.75});
      mod("hat", "hat", {tune:0.5, dec:0.12, niv:0.32});
      mod("seqBasse", "seq8", seq8notes([0.18,0.18,0.18,0.18,0.26,0.26,0.18,0.18]));
      mod("basse", "bassrave", {mode:0.1, oct:-1, dec:220, cut:0.18, env:0.2, det:0.08, sub:0.42, drive:0.06, niv:0.5}, 1);
      mod("poly4", "poly4", {osc:2, det:35, cut:45, res:10, att:180, chu:900, niv:70}, 1);
      mod("echo", "delay", {time:0.42, fb:0.38, mix:0.3}, 1);
      mod("verb", "verb", {taille:0.7, mix:0.35}, 1);
      mod("mixDrums", "mix4", {a:0.75, b:0.35, c:0, d:0}, 1);
      mod("mixMain", "mix4", {a:0.8, b:0.5, c:0.65, d:0}, 1);
      mod("limiteur", "limit", {seuil:0.6, rap:0.6}, 1);
      mod("sortie", "out", {niv:0.72}, 1);

      fil("clock", "out", "div", "in");
      fil("div", "d8", "kick", "trig");
      fil("clock", "out", "euclHat", "in"); fil("euclHat", "out", "hat", "trig");
      fil("clock", "out", "seqBasse", "clk");
      fil("seqBasse", "cv", "basse", "voct"); fil("seqBasse", "gate", "basse", "trig");
      fil("kick", "out", "mixDrums", "a"); fil("hat", "out", "mixDrums", "b");
      fil("poly4", "out", "echo", "in"); fil("echo", "out", "verb", "in");
      fil("mixDrums", "out", "mixMain", "a"); fil("basse", "out", "mixMain", "b");
      fil("verb", "out", "mixMain", "c");
      fil("mixMain", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "PERCUSSIONS", [["mixMain","a",0]]);
      macro(1, "BASSE", [["mixMain","b",0]]);
      macro(2, "POLY 4", [["mixMain","c",0.95]]);
      macro(3, "FILTRE POLY4", [["poly4","cut",90]]);
      macro(4, "CHUTE POLY4", [["poly4","chu",2000]]);
      macro(5, "DÉSACCORD", [["poly4","det",90]]);
      macro(6, "ÉCHOS", [["echo","mix",0.65]]);
      macro(7, "NAPPE", [["verb","mix",0.8]]);
    }));

  /* ---------- Club · Accords courts ---------- */
  MONT.push(fabriquer({id:"poly4-club", nom:"CLUB · ACCORDS COURTS", fam:"poly4", bpm:124,
    res:"Kick en quatre temps et basse séquencée : POLY 4 réglé court y ajoute des accords joués au doigt, en piqués sur la grille."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("div", "clkdiv");
      mod("euclHat", "euclid", {pas:0.72, coups:0.55, dec:0});
      mod("kick", "kick", {tune:0.34, dec:0.4, niv:0.95});
      mod("hat", "hat", {tune:0.62, dec:0.08, niv:0.45});
      mod("seqBasse", "seq8", seq8notes([0.22,0.22,0.3,0.22,0.22,0.3,0.22,0.22]));
      mod("basse", "bassrave", {mode:0.85, oct:0, dec:95, cut:0.3, env:0.7, det:0.4, sub:0.3, drive:0.25, niv:0.62}, 1);
      mod("poly4", "poly4", {osc:0, det:15, cut:68, res:30, att:5, chu:140, niv:65}, 1);
      mod("echo", "bbd", {time:0.18, fb:0.28, mix:0.22}, 1);
      mod("mixDrums", "mix4", {a:0.9, b:0.45, c:0, d:0}, 1);
      mod("mixMain", "mix4", {a:0.85, b:0.55, c:0.6, d:0}, 1);
      mod("limiteur", "limit", {seuil:0.55, rap:0.68}, 1);
      mod("sortie", "out", {niv:0.72}, 1);

      fil("clock", "out", "div", "in");
      fil("div", "d4", "kick", "trig");
      fil("clock", "out", "euclHat", "in"); fil("euclHat", "out", "hat", "trig");
      fil("clock", "out", "seqBasse", "clk");
      fil("seqBasse", "cv", "basse", "voct"); fil("seqBasse", "gate", "basse", "trig");
      fil("kick", "out", "mixDrums", "a"); fil("hat", "out", "mixDrums", "b");
      fil("poly4", "out", "echo", "in");
      fil("mixDrums", "out", "mixMain", "a"); fil("basse", "out", "mixMain", "b");
      fil("echo", "out", "mixMain", "c");
      fil("mixMain", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "PERCUSSIONS", [["mixMain","a",0]]);
      macro(1, "BASSE", [["mixMain","b",0]]);
      macro(2, "ACCORDS POLY4", [["mixMain","c",0.9]]);
      macro(3, "FILTRE POLY4", [["poly4","cut",100]]);
      macro(4, "NIVEAU POLY4", [["poly4","niv",100]]);
      macro(5, "ATTAQUE POLY4", [["poly4","att",250]]);
      macro(6, "DÉSACCORD", [["poly4","det",70]]);
      macro(7, "STABS", [["echo","mix",0.55]]);
    }));

  MONT.forEach(function(P){ EUR_MONTAGES.push(P); });
  EUR_MONT_FAM.push(["seq", "POLY 4"]);
})();
