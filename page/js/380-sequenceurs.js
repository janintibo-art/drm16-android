/* ================= séquenceurs ================= */
seq8: {nom:"SEQ 8", hp:92, res:"Huit pas de hauteur et de porte", fam:"seq",
  kns:[["n1","1",0,1,0.25],["n2","2",0,1,0.4],["n3","3",0,1,0.25],["n4","4",0,1,0.58],
       ["n5","5",0,1,0.25],["n6","6",0,1,0.33],["n7","7",0,1,0.5],["n8","8",0,1,0.17]],
  jacks:[["clk","CLK",0],["rst","RST",0],["cv","CV",1],["gate","GATE",1]],
  creer:function(m){
    var cv = eurConst(0), gate = eurConst(0);
    m.pos = -1;
    m.recevoir = function(t, entree){
      /* Sans remise à zéro, deux séquenceurs de longueurs différentes ne
         peuvent plus jamais se réaligner une fois lancés. */
      if(entree === "rst"){ m.pos = -1; return null; }
      m.pos = (m.pos + 1) % 8;
      var demi = Math.round(m.p["n" + (m.pos + 1)] * 24) / 12;
      cv.offset.setValueAtTime(demi, t);
      eurPorte(gate, t, 0.05);
      return ["gate"];
    };
    return {e:{clk:eurGain(1), rst:eurGain(1)}, s:{cv:cv, gate:gate}};
  }},

seq16: {nom:"SEQ 16", hp:120, res:"Seize pas, longueur réglable", fam:"seq",
  kns:(function(){
    var l = [];
    for(var i=1;i<=16;i++) l.push(["n" + i, String(i), 0, 1, (i % 4 === 1) ? 0.25 : 0.4]);
    l.push(["lg","LEN",0,1,1]);
    return l;
  })(),
  jacks:[["clk","CLK",0],["rst","RST",0],["cv","CV",1],["gate","GATE",1]],
  creer:function(m){
    var cv = eurConst(0), gate = eurConst(0);
    m.pos = -1;
    m.recevoir = function(t, entree){
      if(entree === "rst"){ m.pos = -1; return null; }
      var L = 2 + Math.round(m.p.lg * 14);
      m.pos = (m.pos + 1) % L;
      cv.offset.setValueAtTime(Math.round(m.p["n" + (m.pos + 1)] * 24) / 12, t);
      eurPorte(gate, t, 0.05);
      return ["gate"];
    };
    return {e:{clk:eurGain(1), rst:eurGain(1)}, s:{cv:cv, gate:gate}};
  }},

trig4: {nom:"TRIG 4", hp:84, sombre:true, res:"Quatre pistes de déclenchement", fam:"seq",
  kns:[["a","A",0,1,0.55],["b","B",0,1,0.3],["c","C",0,1,0.4],["d","D",0,1,0.2]],
  jacks:[["clk","CLK",0],["rst","RST",0],["ta","A",1],["tb","B",1],["tc","C",1],["td","D",1]],
  creer:function(m){
    var o = {ta:eurConst(0), tb:eurConst(0), tc:eurConst(0), td:eurConst(0)};
    var motifs = {ta:0x1111, tb:0x0440, tc:0x5555, td:0x0100};
    m.pos = -1;
    m.recevoir = function(t, entree){
      if(entree === "rst"){ m.pos = -1; return null; }
      m.pos = (m.pos + 1) % 16;
      var f = [];
      [["ta","a"],["tb","b"],["tc","c"],["td","d"]].forEach(function(x){
        /* le potard décale le motif : un seul réglage, mais il change tout */
        var mot = motifs[x[0]], dec = Math.round(m.p[x[1]] * 15);
        var bit = ((mot >> ((m.pos + dec) % 16)) & 1);
        if(bit){ eurPorte(o[x[0]], t); f.push(x[0]); }
      });
      return f;
    };
    return {e:{clk:eurGain(1), rst:eurGain(1)}, s:o};
  }},

turing: {nom:"TURING", hp:64, sombre:true, res:"Registre à décalage aléatoire", fam:"seq",
  kns:[["hasard","CHANCE",0,1,0.15],["lg","LEN",0,1,0.5],["amp","RANGE",0,1,0.5]],
  jacks:[["clk","CLK",0],["rst","RST",0],["cv","CV",1],["gate","GATE",1]],
  creer:function(m){
    var cv = eurConst(0), gate = eurConst(0);
    var reg = [];
    for(var i=0;i<16;i++) reg.push(Math.random() > 0.5 ? 1 : 0);
    m.recevoir = function(t, entree){
      /* Ici la remise à zéro ne remet pas un compteur mais tire un registre
         neuf : le TURING n'a pas de début, il n'a qu'un contenu. */
      if(entree === "rst"){
        for(var z=0;z<16;z++) reg[z] = Math.random() > 0.5 ? 1 : 0;
        return null;
      }
      var L = 2 + Math.round(m.p.lg * 14);
      var b = reg[L - 1];
      if(Math.random() < m.p.hasard) b = b ? 0 : 1;
      reg.unshift(b); reg.pop();
      var v = 0;
      for(var i=0;i<8;i++) v = v * 2 + reg[i];
      cv.offset.setValueAtTime(Math.round((v / 255) * 24 * m.p.amp) / 12, t);
      if(reg[0]){ eurPorte(gate, t, 0.05); return ["gate"]; }
      return null;
    };
    return {e:{clk:eurGain(1), rst:eurGain(1)}, s:{cv:cv, gate:gate}};
  }},

steps: {nom:"STEPS", hp:80, sombre:true, res:"Six pas, chacun avec sa tension et sa porte", fam:"seq",
  kns:[["s1","1",0,1,0.8],["s2","2",0,1,0.3],["s3","3",0,1,0.55],
       ["s4","4",0,1,0.15],["s5","5",0,1,0.9],["s6","6",0,1,0.45],
       ["lg","LEN",0,1,1],["portes","GATES",0,1,1]],
  jacks:[["clk","CLK",0],["rst","RST",0],["cv","CV",1],["gate","GATE",1]],
  creer:function(m){
    /* Six pas, c'est peu — et c'est voulu. Contre une horloge en quatre temps,
       une suite de six ne retombe qu'au bout de douze : on obtient une phrase
       qui se décale sans jamais se répéter tout à fait.

       GATES est un masque : chaque pas peut être muet sans perdre sa tension,
       ce qui laisse la mélodie intacte pendant qu'on troue le rythme. */
    var cv = eurConst(0), gate = eurConst(0);
    m.pos = -1;
    m.recevoir = function(t, entree){
      if(entree === "rst"){ m.pos = -1; return null; }
      if(entree !== "clk") return null;
      var L = 2 + Math.round(m.p.lg * 4);
      m.pos = (m.pos + 1) % L;
      var v = m.p["s" + (m.pos + 1)];
      cv.offset.setValueAtTime(v, t);
      /* le masque : les pas au-delà du seuil gardent leur porte */
      var masque = [1, 0, 1, 0, 1, 1];
      var ouvre = m.p.portes > 0.95 ? 1 : (m.p.portes < 0.05 ? 0 : masque[m.pos]);
      if(ouvre){ eurPorte(gate, t); return ["gate"]; }
      return null;
    };
    return {e:{clk:eurGain(1), rst:eurGain(1)}, s:{cv:cv, gate:gate}};
  }},

tape: {nom:"CV LOOP", hp:60, sombre:true, res:"Enregistre une tension, puis la rejoue en boucle", fam:"seq",
  kns:[["lg","LEN",0,1,0.5],["fige","FREEZE",0,1,0]],
  jacks:[["in","IN",0],["clk","CLK",0],["rst","RST",0],["out","OUT",1]],
  creer:function(m){
    /* Le séquenceur qu'on ne programme pas : on lui donne une tension — un
       potard qu'on tourne à la main, un DRIFT, un S & H — il la retient pas à
       pas. FREEZE arrête l'enregistrement, et ce qui passait devient une
       séquence qui tourne. C'est la façon la plus rapide d'attraper un geste. */
    var e = eurGain(1), out = eurConst(0);
    var an = ctx.createAnalyser(); an.fftSize = 32;
    e.connect(an);
    var tampon = new Float32Array(an.fftSize);
    m.mem = []; for(var i=0;i<16;i++) m.mem.push(0);
    m.pos = -1;
    m.recevoir = function(t, entree){
      if(entree === "rst"){ m.pos = -1; return null; }
      if(entree !== "clk") return null;
      var L = 2 + Math.round(m.p.lg * 14);
      m.pos = (m.pos + 1) % L;
      if(m.p.fige < 0.5){
        an.getFloatTimeDomainData(tampon);
        m.mem[m.pos] = tampon[0] || 0;
      }
      out.offset.setValueAtTime(m.mem[m.pos], t);
      return null;
    };
    return {e:{in:e, clk:eurGain(1), rst:eurGain(1)}, s:{out:out}};
  }},

quant: {nom:"QUANT", hp:56, res:"Quantifie vers une gamme", fam:"seq",
  kns:[["gamme","SCALE",0,1,0],["oct","OCT",0,1,0.5]],
  jacks:[["in","IN",0],["clk","CLK",0],["out","OUT",1]],
  creer:function(m){
    /* on ne peut pas quantifier un signal continu sans processeur dédié :
       on quantifie donc la valeur au moment du passage, ce qui suffit pour
       une sortie de séquenceur qui ne change qu'aux pas.
       Il faut pour cela une entrée CLK à part : une sortie CV ne propage
       aucune porte, et sans elle le module restait muet pour toujours. */
    var out = eurConst(0), e = eurGain(1);
    var an = ctx.createAnalyser(); an.fftSize = 32;
    e.connect(an);
    var tampon = new Float32Array(an.fftSize);
    var gammes = [[0,2,4,5,7,9,11],[0,2,3,5,7,8,10],[0,2,4,7,9],[0,3,5,6,7,10],[0,1,2,3,4,5,6,7,8,9,10,11]];
    m.recevoir = function(t, entree){
      if(entree !== "clk") return null;
      an.getFloatTimeDomainData(tampon);
      var v = tampon[0] || 0;
      var g = gammes[Math.min(4, Math.round(m.p.gamme * 4))];
      var demi = v * 12, oct = Math.floor(demi / 12), r = ((demi % 12) + 12) % 12;
      var meilleur = g[0], ecart = 99;
      g.forEach(function(x){ if(Math.abs(x - r) < ecart){ ecart = Math.abs(x - r); meilleur = x; } });
      out.offset.setValueAtTime(oct + meilleur / 12 + Math.round((m.p.oct - 0.5) * 4), t);
      return null;
    };
    return {e:{in:e, clk:eurGain(1)}, s:{out:out}};
  }},

arp: {nom:"ARP", hp:56, sombre:true, res:"Égrène un accord, note à note", fam:"seq",
  kns:[["type","TYPE",0,1,0],["mode","MODE",0,1,0],["oct","OCT",0,1,0.5]],
  jacks:[["clk","CLK",0],["rst","RST",0],["cv","CV",1],["gate","GATE",1]],
  creer:function(m){
    var ACC = [[0,4,7,12],[0,3,7,10],[0,5,7,12],[0,4,7,11],[0,2,7,9]];
    var out = eurConst(0), g = eurConst(0);
    m.i = 0; m.sens = 1;
    m.recevoir = function(t, entree){
      if(entree === "rst"){ m.i = 0; m.sens = 1; return null; }
      if(entree !== "clk") return null;
      var acc = ACC[Math.min(4, Math.round(m.p.type * 4))];
      var mode = Math.min(3, Math.round(m.p.mode * 3));
      if(mode === 0) m.i = (m.i + 1) % acc.length;                    /* montant */
      else if(mode === 1) m.i = (m.i - 1 + acc.length) % acc.length;  /* descendant */
      else if(mode === 2){                                            /* aller-retour */
        m.i += m.sens;
        if(m.i >= acc.length - 1){ m.i = acc.length - 1; m.sens = -1; }
        else if(m.i <= 0){ m.i = 0; m.sens = 1; }
      } else m.i = Math.floor(Math.random() * acc.length);            /* au hasard */
      out.offset.setValueAtTime(acc[m.i] / 12 + Math.round((m.p.oct - 0.5) * 4), t);
      eurPorte(g, t);
      return ["gate"];
    };
    return {e:{clk:eurGain(1), rst:eurGain(1)}, s:{cv:out, gate:g}};
  }},

