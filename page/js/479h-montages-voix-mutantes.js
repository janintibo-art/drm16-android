/* ================= trois montages VOIX MUTANTES — v294 =================
   VOYELLE chante une phrase (gatée par un VCA piloté par une enveloppe AD,
   comme n'importe quel VCO du rack), sa sortie nourrit VOCODEUR en entrée
   MOD — c'est le sujet du lot : "voyelles synthétiques puis vocodeur". */
(function montagesVoixMutantes(){
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

  /* ---------- Robot · Voix de machine ---------- */
  MONT.push(fabriquer({id:"voix-robot", nom:"ROBOT · VOIX DE MACHINE", fam:"voix", bpm:118,
    res:"Une voyelle chantée passe dans un vocodeur à porteuse interne : voix de machine sur un groove électro carré."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("div", "clkdiv");
      mod("euclHat", "euclid", {pas:0.6, coups:0.5, dec:0});
      mod("kick", "kick", {tune:0.3, dec:0.42, niv:0.92});
      mod("hat", "hat", {tune:0.55, dec:0.1, niv:0.4});
      mod("seqVoix", "seq8", seq8notes([0.3,0.3,0.42,0.3,0.5,0.42,0.3,0.25]));
      mod("env", "ad", {a:0.02, d:0.25});
      mod("voyelle", "voyelle", {oct:0, voy:1, timbre:60, mut:25, res:50, niv:70}, 1);
      mod("vca", "vca", {gain:0.9}, 1);
      mod("vocodeur", "vocodeur", {osc:65, note:43, decal:0, vit:18, mix:100, niv:75}, 1);
      mod("mixDrums", "mix4", {a:0.9, b:0.42, c:0, d:0}, 1);
      mod("mixMain", "mix4", {a:0.85, b:0.65, c:0, d:0}, 1);
      mod("echo", "delay", {time:0.24, fb:0.3, mix:0.2}, 1);
      mod("limiteur", "limit", {seuil:0.6, rap:0.6}, 1);
      mod("sortie", "out", {niv:0.72}, 1);

      fil("clock", "out", "div", "in");
      fil("div", "d4", "kick", "trig");
      fil("clock", "out", "euclHat", "in"); fil("euclHat", "out", "hat", "trig");
      fil("kick", "out", "mixDrums", "a"); fil("hat", "out", "mixDrums", "b");
      fil("clock", "out", "seqVoix", "clk");
      fil("seqVoix", "cv", "voyelle", "voct"); fil("seqVoix", "gate", "env", "trig");
      fil("env", "out", "vca", "cv"); fil("voyelle", "out", "vca", "in");
      fil("vca", "out", "vocodeur", "mod");
      fil("mixDrums", "out", "mixMain", "a"); fil("vocodeur", "out", "mixMain", "b");
      fil("mixMain", "out", "echo", "in"); fil("echo", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "PERCUSSIONS", [["mixMain","a",0]]);
      macro(1, "VOIX ROBOT", [["mixMain","b",0.95]]);
      macro(2, "VOYELLE", [["voyelle","voy",4]]);
      macro(3, "FORMANTS", [["vocodeur","decal",12]]);
      macro(4, "MUTATION", [["voyelle","mut",90]]);
      macro(5, "PORTEUSE", [["vocodeur","osc",100]]);
      macro(6, "ÉCHOS", [["echo","mix",0.6]]);
      macro(7, "VITESSE VOCODEUR", [["vocodeur","vit",70]]);
    }));

  /* ---------- Psy · Chœur mutant ---------- */
  MONT.push(fabriquer({id:"voix-psy", nom:"PSY · CHŒUR MUTANT", fam:"voix", bpm:145,
    res:"Une voyelle dérive toute seule (MUTATION) au-dessus d'une basse psy, entendue à la fois sèche et vocodée par une porteuse interne grave."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("div", "clkdiv");
      mod("euclHat", "euclid", {pas:0.7, coups:0.42, dec:0});
      mod("kick", "kick", {tune:0.28, dec:0.35, niv:0.95});
      mod("hat", "hat", {tune:0.58, dec:0.09, niv:0.42});
      mod("seqBasse", "seq8", seq8notes([0.2,0.2,0.28,0.2,0.2,0.2,0.32,0.24]));
      mod("basse", "bassrave", {mode:0.15, oct:0, dec:130, cut:0.22, env:0.28, det:0.12, sub:0.38, drive:0.12, niv:0.55}, 1);
      mod("env", "ad", {a:0.4, d:1.6});
      mod("voyelle", "voyelle", {oct:1, voy:2, timbre:45, mut:70, res:55, niv:62}, 1);
      mod("vca", "vca", {gain:0.85}, 1);
      mod("vocodeur", "vocodeur", {osc:50, note:31, decal:-5, vit:35, mix:65, niv:65}, 1);
      mod("mixDrums", "mix4", {a:0.9, b:0.5, c:0, d:0}, 1);
      mod("mixMain", "mix4", {a:0.85, b:0.5, c:0.6, d:0}, 1);
      mod("verb", "verb", {taille:0.55, mix:0.3}, 1);
      mod("limiteur", "limit", {seuil:0.58, rap:0.65}, 1);
      mod("sortie", "out", {niv:0.7}, 1);

      fil("clock", "out", "div", "in");
      fil("div", "d4", "kick", "trig");
      fil("clock", "out", "euclHat", "in"); fil("euclHat", "out", "hat", "trig");
      fil("clock", "out", "seqBasse", "clk");
      fil("seqBasse", "cv", "basse", "voct"); fil("seqBasse", "gate", "basse", "trig");
      fil("kick", "out", "mixDrums", "a"); fil("hat", "out", "mixDrums", "b");
      fil("div", "d16", "env", "trig");
      fil("env", "out", "vca", "cv"); fil("voyelle", "out", "vca", "in");
      fil("vca", "out", "vocodeur", "mod");
      fil("mixDrums", "out", "mixMain", "a"); fil("basse", "out", "mixMain", "b");
      fil("vocodeur", "out", "mixMain", "c");
      fil("mixMain", "out", "verb", "in"); fil("verb", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "PERCUSSIONS", [["mixMain","a",0]]);
      macro(1, "BASSE", [["mixMain","b",0]]);
      macro(2, "CHŒUR MUTANT", [["mixMain","c",0.9]]);
      macro(3, "MUTATION", [["voyelle","mut",100]]);
      macro(4, "VOYELLE", [["voyelle","voy",4]]);
      macro(5, "FORMANTS", [["vocodeur","decal",-12]]);
      macro(6, "NAPPE", [["verb","mix",0.75]]);
      macro(7, "MIX VOCODEUR", [["vocodeur","mix",100]]);
    }));

  /* ---------- Dub · Talkbox lent ---------- */
  MONT.push(fabriquer({id:"voix-dub", nom:"DUB · TALKBOX LENT", fam:"voix", bpm:76,
    res:"Un talkbox électronique lent : une voyelle tenue traverse un vocodeur à porteuse grave, échos dub et ressort en dessous."},
    function(mod, fil, macro){
      mod("clock", "clock");
      mod("div", "clkdiv");
      mod("euclKick", "euclid", {pas:0.5, coups:0.22, dec:0});
      mod("euclRim", "euclid", {pas:0.65, coups:0.28, dec:0.5});
      mod("kick", "kick", {tune:0.32, dec:0.5, niv:0.85});
      mod("rim", "rim", {tune:0.55, dec:0.3, niv:0.5});
      mod("seqVoix", "seq8", seq8notes([0.35,0.35,0.42,0.35,0.42,0.35,0.3,0.35]));
      mod("env", "ad", {a:0.15, d:2.2});
      mod("voyelle", "voyelle", {oct:-1, voy:3, timbre:35, mut:15, res:60, niv:65}, 1);
      mod("vca", "vca", {gain:0.9}, 1);
      mod("vocodeur", "vocodeur", {osc:70, note:29, decal:2, vit:55, mix:80, niv:68}, 1);
      mod("mixDrums", "mix4", {a:0.85, b:0.4, c:0, d:0}, 1);
      mod("mixMain", "mix4", {a:0.8, b:0.6, c:0, d:0}, 1);
      mod("echo", "bbd", {time:0.4, fb:0.5, mix:0.4}, 1);
      mod("spring", "spring", {ten:0.4, mix:0.3}, 1);
      mod("limiteur", "limit", {seuil:0.62, rap:0.55}, 1);
      mod("sortie", "out", {niv:0.7}, 1);

      fil("clock", "out", "div", "in");
      fil("clock", "out", "euclKick", "in"); fil("euclKick", "out", "kick", "trig");
      fil("div", "d3", "euclRim", "in"); fil("euclRim", "out", "rim", "trig");
      fil("kick", "out", "mixDrums", "a"); fil("rim", "out", "mixDrums", "b");
      fil("clock", "out", "seqVoix", "clk");
      fil("seqVoix", "cv", "voyelle", "voct"); fil("div", "d16", "env", "trig");
      fil("env", "out", "vca", "cv"); fil("voyelle", "out", "vca", "in");
      fil("vca", "out", "vocodeur", "mod");
      fil("mixDrums", "out", "mixMain", "a"); fil("vocodeur", "out", "mixMain", "b");
      fil("mixMain", "out", "echo", "in"); fil("echo", "out", "spring", "in");
      fil("spring", "out", "limiteur", "in"); fil("limiteur", "out", "sortie", "in");

      macro(0, "PERCUSSIONS", [["mixMain","a",0]]);
      macro(1, "TALKBOX", [["mixMain","b",0.95]]);
      macro(2, "VOYELLE", [["voyelle","voy",4]]);
      macro(3, "FORMANTS", [["vocodeur","decal",10]]);
      macro(4, "VITESSE VOCODEUR", [["vocodeur","vit",80]]);
      macro(5, "ÉCHOS", [["echo","mix",0.7]]);
      macro(6, "RESSORT", [["spring","mix",0.65]]);
      macro(7, "MIX VOCODEUR", [["vocodeur","mix",100]]);
    }));

  MONT.forEach(function(P){ EUR_MONTAGES.push(P); });
  EUR_MONT_FAM.push(["voix", "VOIX MUTANTES"]);
})();
