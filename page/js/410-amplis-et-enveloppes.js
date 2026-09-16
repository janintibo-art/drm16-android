/* ================= amplis et enveloppes ================= */
vca: {nom:"VCA", hp:56, sombre:true, res:"Amplificateur commandé", fam:"util",
  kns:[["gain","GAIN",0,1,0]],
  jacks:[["in","IN",0],["cv","CV",0],["out","OUT",1]],
  creer:function(m){
    var g = eurGain(0), cv = eurGain(1);
    cv.connect(g.gain);
    m.maj = function(){ g.gain.value = m.p.gain; };
    m.maj();
    return {e:{in:g, cv:cv}, s:{out:g}};
  }},

vca2: {nom:"DUAL VCA", hp:64, sombre:true, res:"Deux amplis commandés", fam:"util",
  kns:[["g1","GAIN 1",0,1,0],["g2","GAIN 2",0,1,0]],
  jacks:[["in1","IN 1",0],["cv1","CV 1",0],["o1","OUT 1",1],
         ["in2","IN 2",0],["cv2","CV 2",0],["o2","OUT 2",1]],
  creer:function(m){
    var a = eurGain(0), b = eurGain(0), ca = eurGain(1), cb = eurGain(1);
    ca.connect(a.gain); cb.connect(b.gain);
    m.maj = function(){ a.gain.value = m.p.g1; b.gain.value = m.p.g2; };
    m.maj();
    return {e:{in1:a, cv1:ca, in2:b, cv2:cb}, s:{o1:a, o2:b}};
  }},

adsr: {nom:"ENVELOPE", hp:72, res:"Attaque, chute, tenue, retour", fam:"mod",
  kns:[["a","ATK",0,1,0.02],["d","DEC",0,1,0.3],["s","SUS",0,1,0.5],["r","REL",0,1,0.3]],
  jacks:[["gate","GATE",0],["out","OUT",1]],
  creer:function(m){
    var sortie = eurConst(0);
    m.recevoir = function(t){
      var a = 0.002 + m.p.a * 1.2, d = 0.01 + m.p.d * 1.5, s = m.p.s, r = 0.02 + m.p.r * 2;
      sortie.offset.cancelScheduledValues(t);
      sortie.offset.setValueAtTime(0.0001, t);
      sortie.offset.linearRampToValueAtTime(1, t + a);
      sortie.offset.linearRampToValueAtTime(Math.max(0.0001, s), t + a + d);
      sortie.offset.linearRampToValueAtTime(0.0001, t + a + d + r);
      return null;
    };
    return {e:{gate:eurGain(1)}, s:{out:sortie}};
  }},

ad: {nom:"AD", hp:52, res:"Attaque et chute", fam:"mod",
  kns:[["a","ATK",0,1,0.02],["d","DEC",0,1,0.3]],
  jacks:[["trig","TRIG",0],["out","OUT",1]],
  creer:function(m){
    var sortie = eurConst(0);
    m.recevoir = function(t){
      var a = 0.001 + m.p.a * 0.6, d = 0.01 + m.p.d * 2;
      sortie.offset.cancelScheduledValues(t);
      sortie.offset.setValueAtTime(0.0001, t);
      sortie.offset.linearRampToValueAtTime(1, t + a);
      sortie.offset.exponentialRampToValueAtTime(0.0001, t + a + d);
      return null;
    };
    return {e:{trig:eurGain(1)}, s:{out:sortie}};
  }},

lfo: {nom:"LFO", hp:56, sombre:true, res:"Oscillateur lent", fam:"mod",
  kns:[["rate","RATE",0,1,0.35],["amt","AMT",0,1,0.5]],
  jacks:[["sine","SINE",1],["sqr","SQR",1],["tri","TRI",1]],
  creer:function(m){
    var s = ctx.createOscillator(), q = ctx.createOscillator(), r = ctx.createOscillator();
    s.type = "sine"; q.type = "square"; r.type = "triangle";
    s.start(); q.start(); r.start();
    var gs = eurGain(0.5), gq = eurGain(0.5), gr = eurGain(0.5);
    s.connect(gs); q.connect(gq); r.connect(gr);
    m.maj = function(){
      var f = 0.05 * Math.pow(400, m.p.rate);
      [s,q,r].forEach(function(o){ o.frequency.value = f; });
      [gs,gq,gr].forEach(function(g){ g.gain.value = m.p.amt; });
    };
    m.maj();
    return {e:{}, s:{sine:gs, sqr:gq, tri:gr}};
  }},

envfol: {nom:"ENV FOL", hp:56, sombre:true, res:"Transforme un son en tension", fam:"mod",
  kns:[["gain","GAIN",0,1,0.5],["lag","LAG",0,1,0.3]],
  jacks:[["in","IN",0],["out","OUT",1]],
  creer:function(m){
    /* Le suiveur d'enveloppe fait le chemin inverse de tout le reste du rack :
       il rend une commande à partir d'un son. On redresse le signal — une
       courbe en V qui renvoie la valeur absolue — puis on lisse. Frapper une
       grosse caisse peut alors ouvrir un filtre : c'est le ducking, et c'est
       tout ce qui manquait pour faire respirer un patch. */
    var e = eurGain(1), red = ctx.createWaveShaper();
    var n = 1025, c = new Float32Array(n);
    for(var i=0;i<n;i++) c[i] = Math.abs(i * 2 / (n - 1) - 1);
    red.curve = c; red.oversample = "2x";
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass";
    var g = eurGain(1);
    e.connect(red); red.connect(lp); lp.connect(g);
    m.maj = function(){
      lp.frequency.value = 40 * Math.pow(0.02, m.p.lag);   /* de 40 Hz à 0,8 Hz */
      g.gain.value = m.p.gain * 4;
    };
    m.maj();
    return {e:{in:e}, s:{out:g}};
  }},

drift: {nom:"DRIFT", hp:52, sombre:true, res:"Tension qui erre sans se répéter", fam:"mod",
  kns:[["rate","RATE",0,1,0.3],["amt","AMT",0,1,0.5]],
  jacks:[["out","OUT",1],["out2","OUT 2",1]],
  creer:function(m){
    /* Du bruit relu très lentement : une tension qui erre sans jamais repasser
       au même endroit. Un LFO finit toujours par se répéter, celui-ci non.

       On ralentit la LECTURE du bruit plutôt que de le filtrer très bas : un
       passe-bas réglé à un dixième de hertz demanderait au filtre une précision
       qu'il n'a pas à quarante-huit kilohertz. Ici le filtre reste à trente
       hertz, il ne sert qu'à adoucir les marches de l'interpolation.

       Les deux sorties lisent à des vitesses légèrement différentes : elles se
       désolidarisent au bout de quelques secondes et ne se retrouvent plus. */
    var a = eurBruit(), b = eurBruit();
    var fa = ctx.createBiquadFilter(), fb = ctx.createBiquadFilter();
    fa.type = "lowpass"; fb.type = "lowpass";
    fa.frequency.value = 30; fb.frequency.value = 30;
    var ga = eurGain(0), gb = eurGain(0);
    a.connect(fa); fa.connect(ga);
    b.connect(fb); fb.connect(gb);
    m.maj = function(){
      /* de 0,0006 — la boucle dure près d'une heure — à 0,05 */
      var v = 0.0006 * Math.pow(90, m.p.rate);
      a.playbackRate.value = v;
      b.playbackRate.value = v * 1.23;
      ga.gain.value = m.p.amt * 0.9;
      gb.gain.value = m.p.amt * 0.9;
    };
    m.maj();
    return {e:{}, s:{out:ga, out2:gb}};
  }},

clklfo: {nom:"CLK LFO", hp:56, sombre:true, res:"Oscillateur lent calé sur le tempo", fam:"mod",
  kns:[["div","DIV",0,1,0.4],["amt","AMT",0,1,0.5]],
  jacks:[["sine","SINE",1],["tri","TRI",1],["ramp","RAMP",1]],
  creer:function(m){
    /* Un LFO ordinaire dérive par rapport au motif. Celui-ci compte en mesures :
       une, deux, quatre... et reste accroché au tempo, quel qu'il soit. */
    var DIVS = [0.25, 0.5, 1, 2, 4, 8];
    var s = ctx.createOscillator(), t = ctx.createOscillator(), r = ctx.createOscillator();
    s.type = "sine"; t.type = "triangle"; r.type = "sawtooth";
    s.start(); t.start(); r.start();
    var gs = eurGain(0.5), gt = eurGain(0.5), gr = eurGain(0.5);
    s.connect(gs); t.connect(gt); r.connect(gr);
    m.maj = function(){
      var d = DIVS[Math.min(DIVS.length - 1, Math.round(m.p.div * (DIVS.length - 1)))];
      var f = 1 / (stepDur() * 16 * d);
      [s,t,r].forEach(function(o){ o.frequency.value = f; });
      [gs,gt,gr].forEach(function(g){ g.gain.value = m.p.amt; });
    };
    m.maj();
    /* le tempo peut changer pendant que ça tourne : on se recale à chaque pas */
    m.tic = function(){ m.maj(); return null; };
    return {e:{}, s:{sine:gs, tri:gt, ramp:gr}};
  }},

kermit: {nom:"KERMIT", hp:68, sombre:true, res:"Quatre modulations qui se nourrissent l'une l'autre", fam:"mod",
  kns:[["fa","RATE A",0,1,0.3],["fb","RATE B",0,1,0.55],["forme","WAVE",0,1,0],["amp","AMPL",0,1,0.8]],
  jacks:[["a","A",1],["b","B",1],["c","C",1],["d","D",1]],
  creer:function(m){
    /* Deux oscillateurs lents, et deux sorties qui en DÉCOULENT : C est leur
       produit, D leur somme. C'est ce qui fait qu'on n'a pas quatre LFO mais
       une famille — tourner RATE A déplace aussi C et D, et le patch garde une
       cohérence qu'on n'obtient pas avec quatre modules séparés. */
    var oa = ctx.createOscillator(), ob = ctx.createOscillator();
    var ga = eurGain(0.5), gb = eurGain(0.5);
    var gc = eurGain(0), gd = eurGain(0.35);
    oa.connect(ga); ob.connect(gb);
    /* le produit : on module le gain de A par B, ce qui EST une multiplication */
    ga.connect(gc); gb.connect(gc.gain);
    ga.connect(gd); gb.connect(gd);
    oa.start(); ob.start();
    m.maj = function(){
      var F = ["sine","triangle","sawtooth","square"];
      var f = F[Math.min(3, Math.round(m.p.forme * 3))];
      oa.type = f; ob.type = f;
      oa.frequency.value = 0.03 * Math.pow(600, m.p.fa);
      ob.frequency.value = 0.03 * Math.pow(600, m.p.fb);
      ga.gain.value = m.p.amp * 0.5;
      gb.gain.value = m.p.amp * 0.5;
      gd.gain.value = m.p.amp * 0.35;
    };
    m.maj();
    return {e:{}, s:{a:ga, b:gb, c:gc, d:gd}};
  }},

abacus: {nom:"ABACUS", hp:76, sombre:true, res:"Quatre enveloppes, et leur somme", fam:"mod",
  kns:[["r","RISE",0,1,0.12],["f","FALL",0,1,0.45],["courbe","CURVE",0,1,0.5],["niv","LEVEL",0,1,0.9]],
  jacks:[["t1","TRIG 1",0],["t2","TRIG 2",0],["t3","TRIG 3",0],["t4","TRIG 4",0],
         ["o1","1",1],["o2","2",1],["o3","3",1],["o4","4",1],["sum","SUM",1]],
  creer:function(m){
    /* Quatre générateurs de fonction qui partagent leurs réglages, plus une
       sortie SOMME. C'est cette somme qui fait l'intérêt du module : quatre
       enveloppes déclenchées à des instants différents s'additionnent en une
       forme qu'on ne saurait pas dessiner à la main. */
    var o = [], som = eurGain(0.25);
    for(var i=0;i<4;i++){
      var c = eurConst(0);
      c.connect(som);
      o.push(c);
    }
    m.recevoir = function(t, entree){
      var k = {t1:0, t2:1, t3:2, t4:3}[entree];
      if(k === undefined) return null;
      var r = 0.003 + m.p.r * 1.1, fa = 0.01 + m.p.f * 2.2;
      var c2 = o[k].offset;
      c2.cancelScheduledValues(t);
      c2.setValueAtTime(0, t);
      /* CURVE au-dessus du milieu : la descente devient exponentielle, donc
         percussive. En dessous : linéaire, donc plane. */
      c2.linearRampToValueAtTime(m.p.niv, t + r);
      if(m.p.courbe > 0.5){
        c2.setTargetAtTime(0, t + r, fa * (1.05 - m.p.courbe) * 0.9 + 0.01);
        c2.setValueAtTime(0, t + r + fa);
      } else c2.linearRampToValueAtTime(0, t + r + fa);
      return null;
    };
    return {e:{t1:eurGain(1), t2:eurGain(1), t3:eurGain(1), t4:eurGain(1)},
            s:{o1:o[0], o2:o[1], o3:o[2], o4:o[3], sum:som}};
  }},

fonc: {nom:"FUNCTION", hp:60, sombre:true, res:"Montée, descente, et fin de cycle", fam:"mod",
  kns:[["r","RISE",0,1,0.15],["f","FALL",0,1,0.4],["niv","LEVEL",0,1,0.9]],
  jacks:[["trig","TRIG",0],["out","OUT",1],["eoc","EOC",1]],
  creer:function(m){
    /* Le générateur de fonction, cœur du Maths de Make Noise. Ce n'est ni une
       enveloppe ni un LFO : c'est les deux, selon ce qu'on en fait.

       EOC annonce la fin du cycle. Reliez EOC à son propre TRIG et la fonction
       se relance toute seule : elle devient un LFO dont on règle séparément la
       montée et la descente. C'est le patch qu'on fait le jour où on comprend
       le module. */
    var out = eurConst(0), eoc = eurConst(0);
    m.tStep = 0;
    m.tic = function(t){ m.tStep = t; return null; };
    m.recevoir = function(t, entree){
      if(entree !== "trig") return null;
      var r = 0.003 + m.p.r * 1.2, fa = 0.01 + m.p.f * 2.4;
      out.offset.cancelScheduledValues(t);
      out.offset.setValueAtTime(0, t);
      out.offset.linearRampToValueAtTime(m.p.niv, t + r);
      out.offset.linearRampToValueAtTime(0, t + r + fa);
      var fin = t + r + fa;
      eurPorte(eoc, fin);
      /* Sans cette borne, une boucle EOC → TRIG se relancerait des centaines de
         fois d'affilée et programmerait des minutes de son en un seul pas. On
         ne va jamais plus loin qu'un pas et demi devant. */
      if(fin - m.tStep > stepDur() * 1.5) return null;
      return [["eoc", fin]];
    };
    return {e:{trig:eurGain(1)}, s:{out:out, eoc:eoc}};
  }},

riser: {nom:"RISER", hp:64, sombre:true, res:"La montée qui annonce la cassure", fam:"mod",
  kns:[["mes","BARS",0,1,0.3],["etendue","RANGE",0,1,0.6],["niv","LEVEL",0,1,0.6]],
  jacks:[["trig","TRIG",0],["out","OUT",1],["cv","CV",1]],
  creer:function(m){
    /* Une bande de bruit qui monte sur une à huit mesures. La sortie CV suit la
       même montée : envoyez-la dans une coupure de filtre ou dans une hauteur
       et tout le patch monte avec. C'est le geste qui structure la hardtek
       comme le psychédélique — on annonce longtemps avant de casser. */
    var n = eurBruit();
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 2.5;
    bp.frequency.value = 200;
    var g = eurGain(0.0001), cv = eurConst(0);
    n.connect(bp); bp.connect(g);
    m.recevoir = function(t, entree){
      if(entree !== "trig") return null;
      var mes = 1 + Math.round(m.p.mes * 7);
      var d = stepDur() * 16 * mes;
      var haut = 300 + m.p.etendue * 7000;
      bp.frequency.cancelScheduledValues(t);
      bp.frequency.setValueAtTime(180, t);
      bp.frequency.exponentialRampToValueAtTime(haut, t + d);
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, m.p.niv), t + d);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.12);
      cv.offset.cancelScheduledValues(t);
      cv.offset.setValueAtTime(0, t);
      cv.offset.linearRampToValueAtTime(1, t + d);
      cv.offset.linearRampToValueAtTime(0, t + d + 0.12);
      return null;
    };
    return {e:{trig:eurGain(1)}, s:{out:g, cv:cv}};
  }},

rungler: {nom:"RUNGLER", hp:56, sombre:true, res:"Chaos qui se répète sans jamais boucler", fam:"mod",
  kns:[["chaos","CHAOS",0,1,0.6],["amp","RANGE",0,1,0.5]],
  jacks:[["clk","CLK",0],["cv","CV",1],["gate","GATE",1]],
  creer:function(m){
    /* Le cœur du Benjolin de Rob Hordijk. Ce n'est pas du hasard : c'est une
       suite déterministe qui frôle la répétition sans jamais s'y installer.
       À CHAOS bas elle tourne en boucle courte, à CHAOS haut elle part ;
       entre les deux, elle fait de la musique. */
    var out = eurConst(0), g = eurConst(0);
    m.x = 0.41; m.reg = 0;
    m.recevoir = function(t, entree){
      if(entree !== "clk") return null;
      var r = 3.5 + m.p.chaos * 0.4999;          /* suite logistique */
      m.x = r * m.x * (1 - m.x);
      if(m.x < 1e-6 || m.x > 1 - 1e-6) m.x = 0.41;   /* on ne se laisse pas piéger sur un point fixe */
      var bit = (m.x > 0.5) ? 1 : 0;
      m.reg = ((m.reg << 1) | bit) & 255;
      out.offset.setValueAtTime(((m.reg & 7) / 7 - 0.5) * 2 * m.p.amp, t);
      if(bit){ eurPorte(g, t); return ["gate"]; }
      return null;
    };
    return {e:{clk:eurGain(1)}, s:{cv:out, gate:g}};
  }},

sh: {nom:"S & H", hp:56, sombre:true, res:"Prélève et bloque une tension", fam:"mod",
  kns:[["amt","AMT",0,1,0.6],["lisse","SLEW",0,1,0]],
  jacks:[["in","IN",0],["trig","TRIG",0],["out","OUT",1]],
  creer:function(m){
    /* le vrai module prélève ce qu'on lui donne ; sans câble dans IN, il
       tire au sort, ce qui est l'usage le plus courant de toute façon */
    var sortie = eurConst(0), e = eurGain(1);
    var an = ctx.createAnalyser(); an.fftSize = 32;
    e.connect(an);
    var tampon = new Float32Array(an.fftSize), branche = false;
    m.brancher = function(oui){ branche = oui; };
    m.recevoir = function(t, entree){
      if(entree !== "trig") return null;
      var v;
      if(branche){
        an.getFloatTimeDomainData(tampon);
        v = (tampon[0] || 0) * m.p.amt;
      } else v = (Math.random() * 2 - 1) * m.p.amt;
      if(m.p.lisse > 0.02) sortie.offset.setTargetAtTime(v, t, 0.01 + m.p.lisse * 0.3);
      else sortie.offset.setValueAtTime(v, t);
      return null;
    };
    return {e:{in:e, trig:eurGain(1)}, s:{out:sortie}};
  }},

tgate: {nom:"TRANCE GATE", hp:64, sombre:true, res:"Hache le son en croches et en doubles", fam:"util",
  kns:[["mot","PATTERN",0,1,0],["prof","DEPTH",0,1,1],["forme","SHAPE",0,1,0.25]],
  jacks:[["in","IN",0],["clk","CLK",0],["out","OUT",1]],
  creer:function(m){
    /* Une nappe tenue passée là-dedans devient un rythme. Huit motifs de seize
       pas, du plus simple au plus syncopé. SHAPE arrondit les bords : à zéro ça
       claque, à fond ça respire. */
    var e = eurGain(1), g = eurGain(1);
    e.connect(g);
    var MOTIFS = [0xAAAA, 0xCCCC, 0xEEEE, 0xA6A6, 0xB6B6, 0xDBDB, 0xF0F0, 0xACAC];
    m.pos = -1;
    m.recevoir = function(t, entree){
      if(entree === "rst"){ m.pos = -1; return null; }
      if(entree !== "clk") return null;
      m.pos = (m.pos + 1) % 16;
      var mot = MOTIFS[Math.min(7, Math.round(m.p.mot * 7))];
      var bit = (mot >> (15 - m.pos)) & 1;
      var bas = 1 - m.p.prof;
      var lissage = 0.0008 + m.p.forme * 0.05;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(bit ? 1 : bas, t, lissage);
      return null;
    };
    return {e:{in:e, clk:eurGain(1), rst:eurGain(1)}, s:{out:g}};
  }},

head: {nom:"HEAD", hp:84, sombre:true, res:"Quatre voies avec départ d'effets séparé", fam:"util",
  kns:[["n1","1",0,1,0.7],["n2","2",0,1,0.7],["n3","3",0,1,0.7],["n4","4",0,1,0.7],
       ["a1","AUX 1",0,1,0],["a2","AUX 2",0,1,0],["a3","AUX 3",0,1,0],["a4","AUX 4",0,1,0],
       ["main","MAIN",0,1,0.8]],
  jacks:[["i1","IN 1",0],["i2","IN 2",0],["i3","IN 3",0],["i4","IN 4",0],
         ["aux","AUX OUT",1],["out","MAIN",1]],
  creer:function(m){
    /* Un mélangeur ordinaire additionne. Celui-ci a un DÉPART séparé : chaque
       voie envoie ce qu'elle veut vers AUX OUT, en plus de son niveau normal.
       On branche une réverbération dessus, et les quatre voies la partagent
       dans des proportions différentes.

       C'est ce qui manque à MIX 4 : sans départ, il faut une réverbération par
       voie — quatre fois plus cher pour un résultat moins tenu. C'est le même
       raisonnement que la table de mixage de l'application. */
    var e = {}, out = eurGain(0.8), aux = eurGain(1);
    var voies = [];
    for(var i=1;i<=4;i++){
      var ent = eurGain(1), gn = eurGain(0.7), ga = eurGain(0);
      ent.connect(gn); gn.connect(out);
      ent.connect(ga); ga.connect(aux);
      e["i" + i] = ent;
      voies.push({n:gn, a:ga, i:i});
    }
    m.maj = function(){
      voies.forEach(function(v){
        v.n.gain.value = m.p["n" + v.i];
        /* le départ est pris APRÈS le niveau de voie : baisser une voie baisse
           aussi ce qu'elle envoie à l'effet, comme sur une console en
           post-fader — sinon un son coupé continuerait de résonner */
        v.a.gain.value = m.p["a" + v.i] * m.p["n" + v.i];
      });
      out.gain.value = m.p.main;
    };
    m.maj();
    return {e:e, s:{aux:aux, out:out}};
  }},

trans: {nom:"TRANSPOSE", hp:56, res:"Transpose juste, en octaves et en demi-tons", fam:"util",
  kns:[["oct","OCT",0,1,0.5],["semi","SEMI",0,1,0.5]],
  jacks:[["in","IN",0],["out","OUT",1]],
  creer:function(m){
    /* L'ATTENUV décale aussi, mais au jugé. Ici les crans tombent exactement
       sur l'octave et le demi-ton : deux voix transposées d'une quinte le sont
       vraiment, et le restent. */
    var e = eurGain(1), off = eurConst(0), out = eurGain(1);
    e.connect(out); off.connect(out);
    m.maj = function(){
      off.offset.value = Math.round((m.p.oct - 0.5) * 4) +
                         Math.round((m.p.semi - 0.5) * 24) / 12;
    };
    m.maj();
    return {e:{in:e}, s:{out:out}};
  }},

compare: {nom:"COMPARE", hp:56, sombre:true, res:"Fabrique un rythme à partir d'une tension", fam:"util",
  kns:[["seuil","THRESH",0,1,0.5]],
  jacks:[["in","IN",0],["out","OUT",1],["inv","INV",1]],
  creer:function(m){
    /* Le pont entre les deux moitiés d'un modulaire : d'un côté les tensions
       qui ondulent, de l'autre les impulsions. Envoyez-lui un LFO lent, un
       DRIFT ou un RUNGLER, et vous obtenez un rythme qui suit la forme au lieu
       de suivre une grille. La comparaison se fait à chaque pas — c'est la
       résolution du rack. */
    var e = eurGain(1), o = eurConst(0), inv = eurConst(0);
    var an = ctx.createAnalyser(); an.fftSize = 32;
    e.connect(an);
    var tampon = new Float32Array(an.fftSize);
    m.haut = false;
    m.tic = function(t){
      an.getFloatTimeDomainData(tampon);
      var v = tampon[0] || 0;
      var haut = v > (m.p.seuil - 0.5) * 2;
      if(haut === m.haut) return null;      /* on ne sort qu'aux passages */
      m.haut = haut;
      if(haut){ eurPorte(o, t); return ["out"]; }
      eurPorte(inv, t); return ["inv"];
    };
    return {e:{in:e}, s:{out:o, inv:inv}};
  }},

atten: {nom:"ATTENUV", hp:52, res:"Atténue, inverse, décale", fam:"util",
  kns:[["amt","AMOUNT",-1,1,0.5],["off","OFFSET",-1,1,0]],
  jacks:[["in","IN",0],["out","OUT",1]],
  creer:function(m){
    var g = eurGain(0.5), o = eurConst(0), out = eurGain(1);
    g.connect(out); o.connect(out);
    m.maj = function(){ g.gain.value = m.p.amt; o.offset.value = m.p.off; };
    m.maj();
    return {e:{in:g}, s:{out:out}};
  }},

slew: {nom:"SLEW", hp:52, res:"Adoucit les sauts de tension", fam:"util",
  kns:[["t","TIME",0,1,0.3]],
  jacks:[["in","IN",0],["out","OUT",1]],
  creer:function(m){
    /* un passe-bas très grave sur une commande, c'est exactement un
       limiteur de pente */
    var e = eurGain(1), f = ctx.createBiquadFilter();
    f.type = "lowpass";
    e.connect(f);
    m.maj = function(){ f.frequency.value = 0.4 + (1 - m.p.t) * 60; };
    m.maj();
    return {e:{in:e}, s:{out:f}};
  }},

