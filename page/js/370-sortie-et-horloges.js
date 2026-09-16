/* ================= sortie et horloges ================= */
out: {nom:"OUTPUT", hp:52, res:"Sortie vers le casque", fam:"util",
  kns:[["niv","LEVEL",0,1,0.7]],
  jacks:[["in","IN",0],["in2","IN 2",0]],
  creer:function(m){
    var g = eurGain(m.p.niv);
    g.connect(EUR.bus || master);
    m.maj = function(){ g.gain.value = m.p.niv * m.p.niv; };
    m.maj();
    return {e:{in:g, in2:g}, s:{}};
  }},

clock: {nom:"CLOCK", hp:56, sombre:true, res:"Horloge maîtresse", fam:"horloge",
  kns:[],
  jacks:[["out","OUT",1],["out2","/2",1],["out4","/4",1]],
  creer:function(m){
    var o1 = eurConst(0), o2 = eurConst(0), o4 = eurConst(0);
    m.tic = function(t, i){
      var f = ["out"];
      eurPorte(o1, t);
      if(i % 2 === 0){ eurPorte(o2, t); f.push("out2"); }
      if(i % 4 === 0){ eurPorte(o4, t); f.push("out4"); }
      return f;
    };
    return {e:{}, s:{out:o1, out2:o2, out4:o4}};
  }},

clkdiv: {nom:"CLK DIV", hp:52, sombre:true, res:"Divise une horloge en cinq", fam:"horloge",
  kns:[],
  jacks:[["in","IN",0],["d2","/2",1],["d3","/3",1],["d4","/4",1],["d8","/8",1],["d16","/16",1]],
  creer:function(m){
    var o = {}, n = 0;
    ["d2","d3","d4","d8","d16"].forEach(function(k){ o[k] = eurConst(0); });
    m.recevoir = function(t){
      n++;
      var f = [];
      [["d2",2],["d3",3],["d4",4],["d8",8],["d16",16]].forEach(function(x){
        if(n % x[1] === 0){ eurPorte(o[x[0]], t); f.push(x[0]); }
      });
      return f;
    };
    return {e:{in:eurGain(1)}, s:o};
  }},

euclid: {nom:"EUCLID", hp:64, sombre:true, res:"Rythme euclidien", fam:"horloge",
  kns:[["pas","STEPS",0,1,0.5],["coups","FILL",0,1,0.3],["dec","SHIFT",0,1,0]],
  jacks:[["in","IN",0],["out","OUT",1],["inv","INV",1]],
  creer:function(m){
    var o = eurConst(0), inv = eurConst(0), n = -1;
    /* les coups sont répartis aussi régulièrement que possible : c'est tout
       l'algorithme, et c'est ce qui donne ces rythmes qu'on retrouve partout */
    m.recevoir = function(t){
      n++;
      var L = 2 + Math.round(m.p.pas * 14);
      var k = Math.round(m.p.coups * L);
      var d = Math.round(m.p.dec * L);
      var i = ((n - d) % L + L) % L;
      var frappe = k > 0 && (Math.floor(i * k / L) !== Math.floor((i - 1) * k / L) || i === 0 && k > 0);
      if(frappe){ eurPorte(o, t); return ["out"]; }
      eurPorte(inv, t);
      return ["inv"];
    };
    return {e:{in:eurGain(1)}, s:{out:o, inv:inv}};
  }},

burst: {nom:"BURST", hp:52, sombre:true, res:"Roulement de deux à huit coups", fam:"horloge",
  kns:[["n","COUNT",0,1,0.3],["esp","SPACE",0,1,0.4]],
  jacks:[["in","IN",0],["out","OUT",1]],
  creer:function(m){
    var o = eurConst(0);
    m.recevoir = function(t){
      var n = 2 + Math.round(m.p.n * 6), e = 0.01 + m.p.esp * 0.1, f = [];
      for(var i=0;i<n;i++){ eurPorte(o, t + i * e); f.push(["out", t + i * e]); }
      return f;
    };
    return {e:{in:eurGain(1)}, s:{out:o}};
  }},

chance: {nom:"CHANCE", hp:52, sombre:true, res:"Laisse passer une fois sur deux", fam:"horloge",
  kns:[["p","PROB",0,1,0.5]],
  jacks:[["in","IN",0],["out","OUT",1],["alt","ALT",1]],
  creer:function(m){
    /* la porte de Bernoulli : à chaque impulsion, pile ou face. Ce qui ne
       sort pas par OUT sort par ALT, donc rien n'est perdu. */
    var o = eurConst(0), a = eurConst(0);
    m.recevoir = function(t){
      if(Math.random() < m.p.p){ eurPorte(o, t); return ["out"]; }
      eurPorte(a, t); return ["alt"];
    };
    return {e:{in:eurGain(1)}, s:{out:o, alt:a}};
  }},

clkmul: {nom:"CLK MULT", hp:52, sombre:true, res:"Multiplie une horloge par deux, trois, quatre", fam:"horloge",
  kns:[],
  jacks:[["in","IN",0],["m2","x2",1],["m3","x3",1],["m4","x4",1]],
  creer:function(m){
    /* on ne peut pas deviner l'avenir d'une horloge quelconque ; celle du
       rack suit le tempo général, donc la durée d'un pas est connue et les
       sous-divisions se posent d'avance */
    var o = {m2:eurConst(0), m3:eurConst(0), m4:eurConst(0)};
    m.recevoir = function(t){
      var d = stepDur(), f = [];
      [["m2",2],["m3",3],["m4",4]].forEach(function(x){
        for(var i=0;i<x[1];i++){
          var tt = t + i * d / x[1];
          eurPorte(o[x[0]], tt);
          f.push([x[0], tt]);
        }
      });
      return f;
    };
    return {e:{in:eurGain(1)}, s:o};
  }},

trigdly: {nom:"TRIG DLY", hp:52, sombre:true, res:"Repousse l'impulsion", fam:"horloge",
  kns:[["t","TIME",0,1,0.25]],
  jacks:[["in","IN",0],["out","OUT",1],["thru","THRU",1]],
  creer:function(m){
    var o = eurConst(0), th = eurConst(0);
    m.recevoir = function(t){
      var dt = 0.004 + m.p.t * 0.5;
      eurPorte(th, t);
      eurPorte(o, t + dt);
      return ["thru", ["out", t + dt]];
    };
    return {e:{in:eurGain(1)}, s:{out:o, thru:th}};
  }},

swing: {nom:"SWING", hp:52, sombre:true, res:"Retarde un pas sur deux", fam:"horloge",
  kns:[["amt","AMOUNT",0,1,0.3]],
  jacks:[["in","IN",0],["out","OUT",1]],
  creer:function(m){
    /* Le ternaire des boîtes à rythmes : un pas sur deux arrive en retard.
       Rien ne bouge dans la partition, tout change dans la démarche. */
    var o = eurConst(0);
    m.n = 0;
    m.recevoir = function(t){
      var dt = ((m.n++ % 2) === 1) ? m.p.amt * 0.45 * stepDur() : 0;
      eurPorte(o, t + dt);
      return [["out", t + dt]];
    };
    return {e:{in:eurGain(1)}, s:{out:o}};
  }},

logic: {nom:"LOGIC", hp:60, sombre:true, res:"ET, OU, OU exclusif sur deux rythmes", fam:"horloge",
  kns:[],
  jacks:[["a","A",0],["b","B",0],["et","AND",1],["ou","OR",1],["xou","XOR",1]],
  creer:function(m){
    /* Trois rythmes tirés de deux : les coups communs, tous les coups, et ceux
       qui ne tombent que d'un côté. Deux générateurs euclidiens branchés là
       donnent des motifs qu'on n'écrirait jamais à la main.

       L'évaluation se fait en fin de pas et non à l'arrivée d'une porte :
       autrement l'ordre des câbles déciderait du résultat. */
    var o = {et:eurConst(0), ou:eurConst(0), xou:eurConst(0)};
    m.ta = false; m.tb = false;
    m.recevoir = function(t, entree){
      if(entree === "a") m.ta = true;
      else if(entree === "b") m.tb = true;
      return null;
    };
    m.finPas = function(t){
      var a = m.ta, b = m.tb, f = [];
      m.ta = false; m.tb = false;
      if(a && b){ eurPorte(o.et, t); f.push("et"); }
      if(a || b){ eurPorte(o.ou, t); f.push("ou"); }
      if(a !== b){ eurPorte(o.xou, t); f.push("xou"); }
      return f;
    };
    return {e:{a:eurGain(1), b:eurGain(1)}, s:o};
  }},

