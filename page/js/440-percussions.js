/* ================= percussions ================= */
ram: {nom:"BATTERING RAM", hp:72, res:"Grosse caisse : chute, saturation, clic", fam:"perc",
  kns:[["pitch","PITCH",0,1,0.35],["dec","DECAY",0,1,0.5],["drive","DRIVE",0,1,0.45],
       ["type","DRIVE TYPE",0,1,0],["clic","CLICK",0,1,0.4],["hpf","HPF",0,1,0.2]],
  jacks:[["trig","TRIG",0],["out","OUT",1],["env","ENVLP",1]],
  creer:function(m){
    /* Ce qui fait une grosse caisse de module, ce n'est pas la sinusoïde
       plongeante — tout le monde l'a — mais le CLIC : un bruit très court à
       l'attaque. Sans lui, la caisse disparaît dès qu'un autre son joue ;
       avec lui, elle traverse n'importe quel mélange, même très bas.

       La sortie ENVLP rend l'enveloppe : de quoi faire plonger autre chose au
       même moment, ce qui est la façon d'obtenir un vrai ducking. */
    var out = eurGain(1), env = eurConst(0);
    var sat = ctx.createWaveShaper();
    var hp = ctx.createBiquadFilter(); hp.type = "highpass";
    var som = eurGain(1);
    som.connect(sat); sat.connect(hp); hp.connect(out);
    m.maj = function(){
      hp.frequency.value = 20 + m.p.hpf * 90;
      var n = 1025, c = new Float32Array(n);
      var k = 1 + m.p.drive * 40;
      var dur = Math.min(2, Math.round(m.p.type * 2));
      for(var i=0;i<n;i++){
        var x = i * 2 / (n - 1) - 1;
        /* trois caractères : doux, franc, en escalier */
        c[i] = dur === 0 ? Math.tanh(x * k) / Math.tanh(k)
             : dur === 1 ? Math.max(-1, Math.min(1, x * k))
             : Math.round(Math.tanh(x * k) * 12) / 12;
      }
      sat.curve = c; sat.oversample = "2x";
    };
    m.maj();
    m.recevoir = function(t, entree){
      if(entree !== "trig") return null;
      var f0 = 34 + m.p.pitch * 46, d = 0.12 + m.p.dec * 0.95;
      var o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(f0 * 9, t);
      o.frequency.exponentialRampToValueAtTime(f0, t + 0.045);
      var g = eurGain(0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(1, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(som);
      o.start(t); o.stop(t + d + 0.05);
      if(m.p.clic > 0.02){
        var b = eurBruit();
        var bp = ctx.createBiquadFilter();
        bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 0.8;
        var gc = eurGain(0);
        gc.gain.setValueAtTime(m.p.clic * 0.8, t);
        gc.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
        b.connect(bp); bp.connect(gc); gc.connect(som);
        b.stop(t + 0.05);
      }
      env.offset.cancelScheduledValues(t);
      env.offset.setValueAtTime(1, t);
      env.offset.linearRampToValueAtTime(0, t + d);
      return null;
    };
    return {e:{trig:eurGain(1)}, s:{out:out, env:env}};
  }},

squid: {nom:"SQUID SALMPLE", hp:96, res:"Huit lecteurs d'échantillons, une entrée chacun", fam:"perc",
  kns:[["banque","BANK",0,1,0],["qual","QUALITY",0,1,1],["dec","ENV",0,1,0.85],
       ["rev","REVERSE",0,1,0],["tune","V/OCT",0,1,0.5],["niv","LEVEL",0,1,0.8]],
  jacks:[["t1","1",0],["t2","2",0],["t3","3",0],["t4","4",0],
         ["t5","5",0],["t6","6",0],["t7","7",0],["t8","8",0],
         ["oi","1+2",1],["op","3+4",1],["mix","MIX",1]],
  creer:function(m){
    /* Huit canaux, huit entrées : c'est tout le module. Là où un sampler
       ordinaire demande de choisir un son puis de le déclencher, ici chaque
       prise EST un son. On câble huit sorties d'horloge divisée dessus et on a
       un rythme entier sans toucher à un seul réglage.

       BANK décale les huit ensemble dans la banque : un seul potard change tout
       le kit, ce qui est la façon dont on s'en sert vraiment. */
    var mix = eurGain(1), oi = eurGain(1), op = eurGain(1);
    var forme = ctx.createWaveShaper();
    var apres = eurGain(1);
    forme.connect(apres); apres.connect(mix);
    m.maj = function(){
      /* QUALITY à fond : pas de courbe du tout, le son passe intact. En
         dessous, un escalier de moins en moins fin — c'est une réduction de
         résolution, pas une saturation. */
      if(m.p.qual > 0.97){ forme.curve = null; }
      else {
        var marches = Math.max(2, Math.round(2 + m.p.qual * 60));
        var n = 1025, c = new Float32Array(n);
        for(var i=0;i<n;i++){
          var x = i * 2 / (n - 1) - 1;
          c[i] = Math.round(x * marches) / marches;
        }
        forme.curve = c; forme.oversample = "none";
      }
      apres.gain.value = m.p.niv;
    };
    m.maj();
    m.recevoir = function(t, entree){
      var k = {t1:0, t2:1, t3:2, t4:3, t5:4, t6:5, t7:6, t8:7}[entree];
      if(k === undefined) return null;
      banqueEs();
      var dec = Math.round(m.p.banque * (ES_BANQUE.length - 8));
      var id = "b" + ((dec + k) % ES_BANQUE.length);
      var buf = ES.buf[id];
      if(!buf) return null;
      var src = ctx.createBufferSource();
      /* à l'envers : le tampon retourné, gardé en cache par le même mécanisme
         que la machine d'archive */
      src.buffer = (m.p.rev > 0.5) ? bufArcmInverse(id, buf) : buf;
      src.playbackRate.value = Math.pow(2, (m.p.tune - 0.5) * 2);
      var g = eurGain(0);
      var d = Math.max(0.03, (buf.duration / src.playbackRate.value) * Math.max(0.04, m.p.dec));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.9, t + 0.002);
      g.gain.setValueAtTime(0.9, t + Math.max(0.005, d - 0.02));
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      src.connect(g);
      g.connect(forme);
      /* les sorties par paires, comme sur la machine : de quoi traiter deux
         canaux à part sans perdre le mélange */
      g.connect(k < 2 ? oi : (k < 4 ? op : mix));
      src.start(t); src.stop(t + d + 0.05);
      return null;
    };
    var e = {};
    ["t1","t2","t3","t4","t5","t6","t7","t8"].forEach(function(q){ e[q] = eurGain(1); });
    return {e:e, s:{oi:oi, op:op, mix:mix}};
  }},

mutant: {nom:"MUTANT HIHATS", hp:64, res:"Charley 808 saturé, ouvert et fermé exclusifs", fam:"perc",
  kns:[["drive","DRIVE",0,1,0.4],["cut","CUTOFF",0,1,0.6],
       ["dec","DECAY",0,1,0.3],["niv","LEVEL",0,1,0.8]],
  jacks:[["cl","CLOSED",0],["op","OPEN",0],["out","OUT",1]],
  creer:function(m){
    /* Le charley d'une 808 : six carrés désaccordés passés au passe-haut.
       Ce qui fait ce module, c'est l'EXCLUSIVITÉ — le fermé coupe l'ouvert,
       net, comme une vraie pédale de charley. Sans cela on entend deux
       charleys superposés, ce qu'aucun batteur ne peut produire. */
    var out = eurGain(1), sat = ctx.createWaveShaper();
    var hp = ctx.createBiquadFilter(); hp.type = "highpass";
    sat.connect(hp); hp.connect(out);
    m.ouvert = null;
    m.maj = function(){
      hp.frequency.value = 3000 + m.p.cut * 9000;
      var n = 1025, c = new Float32Array(n), k = 1 + m.p.drive * 40;
      for(var i=0;i<n;i++){
        var x = i * 2 / (n - 1) - 1;
        c[i] = Math.tanh(x * k) / Math.tanh(k);
      }
      sat.curve = c; sat.oversample = "2x";
    };
    m.maj();
    m.recevoir = function(t, entree){
      if(entree !== "cl" && entree !== "op") return null;
      var ferme = (entree === "cl");
      if(m.ouvert){
        /* on coupe l'ouvert en cours, quelle que soit la touche : deux
           charleys ne sonnent jamais ensemble */
        try{
          m.ouvert.gain.cancelScheduledValues(t);
          m.ouvert.gain.setTargetAtTime(0.0001, t, 0.004);
        }catch(e){}
        m.ouvert = null;
      }
      var d = ferme ? (0.015 + m.p.dec * 0.07) : (0.12 + m.p.dec * 0.7);
      var g = eurGain(0);
      var src = trMetal(t, d, 880, 1);
      src.connect(g); g.connect(sat);
      g.gain.setValueAtTime(m.p.niv, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      if(!ferme) m.ouvert = g;
      return null;
    };
    return {e:{cl:eurGain(1), op:eurGain(1)}, s:{out:out}};
  }},

tekkick: {nom:"TEK KICK", hp:64, res:"Grosse caisse saturée jusqu'à devenir un son tenu", fam:"perc",
  kns:[["tune","TUNE",0,1,0.35],["dec","DECAY",0,1,0.5],["drive","DRIVE",0,1,0.7],["niv","LEVEL",0,1,0.85]],
  jacks:[["trig","TRIG",0],["out","OUT",1]],
  creer:function(m){
    /* La grosse caisse de la hardtek n'est pas une percussion écrêtée : c'est
       une note. On pousse une sinusoïde plongeante dans une saturation franche
       jusqu'à ce qu'elle devienne carrée, puis on coupe le grave excédentaire
       pour qu'il reste de la place. Plus DRIVE monte, plus la hauteur s'entend. */
    var out = eurGain(1);
    var forme = ctx.createWaveShaper();
    var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 34;
    var som = eurGain(1);
    som.connect(forme); forme.connect(hp); hp.connect(out);
    m.maj = function(){
      var n = 1025, c = new Float32Array(n), k = 1 + m.p.drive * 60;
      for(var i=0;i<n;i++){
        var x = i * 2 / (n - 1) - 1;
        c[i] = Math.tanh(x * k) / Math.tanh(k);
      }
      forme.curve = c; forme.oversample = "2x";
      hp.frequency.value = 28 + m.p.drive * 26;
    };
    m.maj();
    m.recevoir = function(t, entree){
      if(entree !== "trig") return null;
      var f0 = 38 + m.p.tune * 40, d = 0.12 + m.p.dec * 0.85;
      var o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(f0 * 7, t);
      o.frequency.exponentialRampToValueAtTime(f0, t + 0.055);
      var g = eurGain(0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(m.p.niv * 1.2, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(som);
      o.start(t); o.stop(t + d + 0.05);
      return null;
    };
    return {e:{trig:eurGain(1)}, s:{out:out}};
  }},

tribal: {nom:"TRIBAL", hp:64, res:"Conga, bongo, djembé, tabla", fam:"perc",
  kns:[["type","TYPE",0,1,0],["tune","TUNE",0,1,0.5],["dec","DECAY",0,1,0.45],["niv","LEVEL",0,1,0.8]],
  jacks:[["trig","TRIG",0],["out","OUT",1]],
  creer:function(m){
    /* Quatre peaux, un seul module. Ce qui les sépare n'est pas la hauteur mais
       la façon dont le son meurt : la conga résonne, le bongo claque, le djembé
       a une gifle de bruit sur l'attaque, et le tabla plie sa hauteur en
       descendant — c'est ce pliage qui lui donne sa voix parlante. */
    var out = eurGain(1);
    var REC = [
      {f:190, d:1.0, bruit:0.10, pli:1.00, ton:0.35},   /* conga  */
      {f:330, d:0.55, bruit:0.14, pli:1.00, ton:0.55},  /* bongo  */
      {f:150, d:0.75, bruit:0.34, pli:1.00, ton:0.30},  /* djembé */
      {f:260, d:0.85, bruit:0.08, pli:0.55, ton:0.60}   /* tabla  */
    ];
    m.recevoir = function(t, entree){
      if(entree !== "trig") return null;
      var r = REC[Math.min(3, Math.round(m.p.type * 3))];
      var f0 = r.f * (0.6 + m.p.tune * 0.9);
      var d = (0.08 + m.p.dec * 0.6) * r.d;
      var o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(f0 * 1.35, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f0 * r.pli), t + d * 0.5);
      var g = eurGain(0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(m.p.niv, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + d + 0.05);
      /* la gifle : du bruit très court, passé haut */
      var n = eurBruit();
      var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
      bp.frequency.value = 1400 + r.ton * 3200; bp.Q.value = 0.9;
      var gn = eurGain(0);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.linearRampToValueAtTime(m.p.niv * r.bruit * 2, t + 0.002);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      n.connect(bp); bp.connect(gn); gn.connect(out);
      n.stop(t + 0.1);
      return null;
    };
    return {e:{trig:eurGain(1)}, s:{out:out}};
  }},

zap: {nom:"ZAP", hp:60, res:"Le sifflement qui plonge, marque du psychédélique", fam:"perc",
  kns:[["tune","TUNE",0,1,0.6],["dec","DECAY",0,1,0.35],["fm","FM",0,1,0.4],["niv","LEVEL",0,1,0.7]],
  jacks:[["trig","TRIG",0],["out","OUT",1]],
  creer:function(m){
    /* Une chute de plusieurs octaves en un dixième de seconde, avec une seconde
       sinusoïde qui module la première. Sans FM c'est un sifflet ; avec, ça
       devient métallique et ça déchire — le « zap » des disques goa. */
    var out = eurGain(1);
    m.recevoir = function(t, entree){
      if(entree !== "trig") return null;
      var f0 = 400 + m.p.tune * 3600, d = 0.05 + m.p.dec * 0.55;
      var o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f0 * 0.02), t + d);
      var mo = ctx.createOscillator(); mo.type = "sine";
      mo.frequency.setValueAtTime(f0 * 1.7, t);
      mo.frequency.exponentialRampToValueAtTime(Math.max(30, f0 * 0.05), t + d);
      var mg = eurGain(m.p.fm * 1800);
      mo.connect(mg); mg.connect(o.frequency);
      var g = eurGain(0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(m.p.niv, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + d + 0.05);
      mo.start(t); mo.stop(t + d + 0.05);
      return null;
    };
    return {e:{trig:eurGain(1)}, s:{out:out}};
  }},

drum: {nom:"DRUM", hp:72, sombre:true, res:"Voix de percussion réglable", fam:"perc",
  kns:[["tune","TUNE",0,1,0.3],["dec","DECAY",0,1,0.35],["drive","DRIVE",0,1,0.2],["bruit","NOISE",0,1,0.15]],
  jacks:[["trig","TRIG",0],["out","OUT",1]],
  creer:function(m){
    var out = eurGain(1);
    m.recevoir = function(t){
      var f0 = 35 + m.p.tune * 190, dec = 0.04 + m.p.dec * 0.9;
      var o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(f0 * 4.5, t);
      o.frequency.exponentialRampToValueAtTime(f0, t + 0.03);
      var sh = ctx.createWaveShaper();
      var dr = 1 + m.p.drive * 8;
      sh.curve = eurCourbe(function(x){ return Math.tanh(x * dr) / Math.tanh(dr); });
      var g = eurGain(0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.9, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(sh); sh.connect(g); g.connect(out);
      o.start(t); o.stop(t + dec + 0.05);
      if(m.p.bruit > 0.02){
        var nb = eurBruit(), hp = ctx.createBiquadFilter(), gn = eurGain(0);
        hp.type = "highpass"; hp.frequency.value = 1400;
        gn.gain.setValueAtTime(0.0001, t);
        gn.gain.linearRampToValueAtTime(m.p.bruit * 0.8, t + 0.001);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.02 + m.p.bruit * 0.2);
        nb.connect(hp); hp.connect(gn); gn.connect(out);
        nb.stop(t + 0.4);
      }
      return null;
    };
    return {e:{trig:eurGain(1)}, s:{out:out}};
  }},

kick: eurPerc("KICK", "Grosse caisse", function(m, out, t){
  var f0 = 32 + m.p.tune * 50, dec = 0.08 + m.p.dec * 0.9;
  var o = ctx.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(f0 * 5, t);
  o.frequency.exponentialRampToValueAtTime(f0, t + 0.03);
  var g = eurGain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(m.p.niv * 1.3, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + 0.05);
}),

snare: eurPerc("SNARE", "Caisse claire", function(m, out, t){
  var dec = 0.05 + m.p.dec * 0.35;
  var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
  bp.frequency.value = 1200 + m.p.tune * 3200; bp.Q.value = 0.8;
  var n = eurBruit(), g = eurGain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(m.p.niv * 1.2, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  n.connect(bp); bp.connect(g); g.connect(out); n.stop(t + dec + 0.1);
  var o = ctx.createOscillator(); o.type = "triangle";
  o.frequency.value = 150 + m.p.tune * 200;
  var g2 = eurGain(0);
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.linearRampToValueAtTime(m.p.niv * 0.5, t + 0.001);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + dec * 0.5);
  o.connect(g2); g2.connect(out); o.start(t); o.stop(t + dec);
}),

hat: eurPerc("HAT", "Charley", function(m, out, t){
  var dec = 0.02 + m.p.dec * 0.5;
  var som = eurGain(0.3);
  [1, 1.342, 1.2312, 1.6532, 1.9523, 2.1523].forEach(function(r){
    var o = ctx.createOscillator(); o.type = "square";
    o.frequency.value = (600 + m.p.tune * 900) * r;
    o.connect(som); o.start(t); o.stop(t + dec + 0.02);
  });
  var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
  var g = eurGain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(m.p.niv * 1.3, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  som.connect(hp); hp.connect(g); g.connect(out);
}),

clap: eurPerc("CLAP", "Claquement de mains", function(m, out, t){
  var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
  bp.frequency.value = 900 + m.p.tune * 1400; bp.Q.value = 1.4;
  var n = eurBruit(), g = eurGain(0);
  n.connect(bp); bp.connect(g); g.connect(out);
  g.gain.setValueAtTime(0.0001, t);
  [0, 0.009, 0.018].forEach(function(o){
    g.gain.setValueAtTime(m.p.niv * 1.6, t + o);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o + 0.008);
  });
  g.gain.setValueAtTime(m.p.niv * 1.1, t + 0.028);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + m.p.dec * 0.4);
  n.stop(t + 0.6);
}),

tom: eurPerc("TOM", "Tom accordable", function(m, out, t){
  var f0 = 70 + m.p.tune * 190, dec = 0.1 + m.p.dec * 0.7;
  var o = ctx.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(f0 * 2, t);
  o.frequency.exponentialRampToValueAtTime(f0, t + 0.05);
  var g = eurGain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(m.p.niv * 1.2, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + 0.05);
}),

cym: eurPerc("CYMBAL", "Cymbale", function(m, out, t){
  var dec = 0.3 + m.p.dec * 2.2;
  var som = eurGain(0.24);
  [1, 1.342, 1.2312, 1.6532, 1.9523, 2.1523].forEach(function(r){
    var o = ctx.createOscillator(); o.type = "square";
    o.frequency.value = (200 + m.p.tune * 420) * r;
    o.connect(som); o.start(t); o.stop(t + dec + 0.02);
  });
  var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000;
  var g = eurGain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(m.p.niv * 1.1, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  som.connect(hp); hp.connect(g); g.connect(out);
}),

rim: eurPerc("RIM", "Rim shot", function(m, out, t){
  var o = ctx.createOscillator(); o.type = "square";
  o.frequency.value = 320 + m.p.tune * 600;
  var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
  bp.frequency.value = 1800; bp.Q.value = 4;
  var n = eurBruit();
  var g = eurGain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(m.p.niv * 1.2, t + 0.0006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.015 + m.p.dec * 0.06);
  o.connect(g); n.connect(bp); bp.connect(g); g.connect(out);
  o.start(t); o.stop(t + 0.08); n.stop(t + 0.08);
}),

cowbell: eurPerc("COWBELL", "Cloche à vache", function(m, out, t){
  /* deux carrés dans un rapport qui ne tombe sur aucun harmonique : c'est
     exactement la recette de la 808, et c'est pour ça que ça sonne creux */
  var dec = 0.12 + m.p.dec * 0.7;
  var f0 = 480 + m.p.tune * 380;
  var som = eurGain(0.4);
  [1, 1.4816].forEach(function(r){
    var o = ctx.createOscillator(); o.type = "square";
    o.frequency.value = f0 * r;
    o.connect(som); o.start(t); o.stop(t + dec + 0.02);
  });
  var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
  bp.frequency.value = f0 * 1.2; bp.Q.value = 2.2;
  var g = eurGain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(m.p.niv * 1.1, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  som.connect(bp); bp.connect(g); g.connect(out);
}),

shaker: eurPerc("SHAKER", "Maracas", function(m, out, t){
  var dec = 0.03 + m.p.dec * 0.18;
  var n = eurBruit();
  var hp = ctx.createBiquadFilter(); hp.type = "highpass";
  hp.frequency.value = 4000 + m.p.tune * 5000;
  var g = eurGain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(m.p.niv * 0.9, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  n.connect(hp); hp.connect(g); g.connect(out);
  n.stop(t + dec + 0.05);
}),

claves: eurPerc("CLAVES", "Claves", function(m, out, t){
  var f = 1100 + m.p.tune * 1600;
  var o = ctx.createOscillator(); o.type = "sine";
  o.frequency.value = f;
  var g = eurGain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(m.p.niv * 1.3, t + 0.0008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02 + m.p.dec * 0.12);
  o.connect(g); g.connect(out);
  o.start(t); o.stop(t + 0.2);
})
};
var EUR_FAM = [["horloge","HORLOGES"],["seq","SÉQUENCEURS"],["osc","OSCILLATEURS"],
               ["filtre","FILTRES"],["mod","MODULATION"],["util","UTILITAIRES"],
               ["effet","TRAITEMENTS"],["perc","PERCUSSIONS"]];
var EUR_ORDRE = Object.keys(EUR_CAT);

/* ---------- construction du rack ---------- */
function eurAjouter(type, silencieux){
  var d = EUR_CAT[type];
  if(!d) return null;
  var m = {id:EUR.prochain++, type:type, p:{}, r:0};
  d.kns.forEach(function(k){ m.p[k[0]] = k[4]; });
  EUR.mods.push(m);
  if(!silencieux){ eurBatir(); eurDessiner(); memEur(); }
  return m;
}
function eurRetirer(i){
  if(i < 0 || i >= EUR.mods.length) return;
  var id = EUR.mods[i].id;
  EUR.cables = EUR.cables.filter(function(c){ return c.de[0] !== id && c.vers[0] !== id; });
  EUR.mods.splice(i, 1);
  EUR.sel = Math.min(EUR.sel, EUR.mods.length - 1);
  eurBatir(); eurDessiner(); memEur();
}
/* Tout est reconstruit à chaque changement de câblage : c'est plus court et
   plus sûr que de démonter un branchement au milieu d'un graphe audio. */
function eurBatir(){
  audioInit();
  /* Chaque module fabrique des oscillateurs qui tournent en permanence, et
     rien ne les referme : le module OUTPUT était branché droit sur le mélange
     général. Un rack reconstruit s'ajoutait donc au précédent, et continuait
     de sonner par-dessus la machine suivante — le son paraissait couper alors
     qu'il était simplement recouvert. Tout passe maintenant par un bus qu'on
     débranche d'un coup. */
  if(EUR.bus){ try{ EUR.bus.disconnect(); }catch(e){} }
  /* Débrancher rendait le silence, mais les oscillateurs du rack précédent
     continuaient d'être calculés : un rack chargé, reconstruit à chaque ajout
     de module, finissait par coûter plus cher que tout le reste. On les arrête
     pour de bon avant d'en fabriquer d'autres. */
  if(EUR.sources) EUR.sources.forEach(function(n){ try{ n.stop(); }catch(e){} });
  EUR.bus = eurGain(document.body.classList.contains("eur") ? 1 : 0);
  EUR.bus.connect(busSet("eur") || master);
  EUR.noeuds = [];
  COLLECTE = [];
  try{
    EUR.mods.forEach(function(m){
      var d = EUR_CAT[m.type];
      m.io = d.creer(m);
      EUR.noeuds.push(m.io);
    });
  } finally {
    /* quoi qu'il arrive, le panier se referme : sinon toutes les percussions
       jouées ensuite s'y accumuleraient sans fin */
    EUR.sources = COLLECTE;
    COLLECTE = null;
  }
  EUR.cables.forEach(function(c){
    var a = eurMod(c.de[0]), b = eurMod(c.vers[0]);
    if(!a || !b) return;
    var s = a.io.s[c.de[1]], e = b.io.e[c.vers[1]];
    if(!s || !e) return;
    try{ s.connect(e); }catch(err){}
  });
  /* quelques modules se comportent autrement selon qu'on leur a branché
     quelque chose ou non : ils l'apprennent une fois le câblage posé */
  EUR.mods.forEach(function(m){
    if(!m.brancher) return;
    m.brancher(EUR.cables.some(function(c){
      return c.vers[0] === m.id && c.vers[1] === "in";
    }));
  });
}
function eurMod(id){
  for(var i=0;i<EUR.mods.length;i++) if(EUR.mods[i].id === id) return EUR.mods[i];
  return null;
}
/* ---------- l'horloge fait avancer ce qui écoute ---------- */
/* Les portes se propagent de proche en proche. Un module qui en reçoit une
   peut en émettre à son tour : c'est ce qui permet d'enchaîner horloge,
   diviseur, générateur euclidien puis séquenceur. La file est bornée pour
   qu'un câblage en boucle ne fasse pas tourner l'application indéfiniment.

   Chaque élément de la file porte SON PROPRE INSTANT. Sans cela, un module
   qui décale ses impulsions (BURST, CLK MULT, TRIG DLY) voyait bien sa
   tension partir en avance dans le câble, mais le module d'en face était
   réveillé une seule fois, au temps du pas : un roulement de huit coups ne
   donnait qu'un seul coup de caisse. Une sortie peut donc être annoncée
   soit par son nom, soit par le couple [nom, instant]. */
function scheduleEur(i, t){
  var file = [];
  EUR.mods.forEach(function(m){
    if(!m.tic) return;
    var f = m.tic(t, i);
    if(f) f.forEach(function(o){ file.push(eurSortie(m.id, o, t)); });
  });
  var garde = 0;
  function vider(){
    while(file.length && garde++ < 900){
      var x = file.shift();
      for(var k=0;k<EUR.cables.length;k++){
        var c = EUR.cables[k];
        if(c.de[0] !== x[0] || c.de[1] !== x[1]) continue;
        var d = eurMod(c.vers[0]);
        if(!d || !d.recevoir) continue;
        var sorties = d.recevoir(x[2], c.vers[1]);
        if(sorties) sorties.forEach(function(o){ file.push(eurSortie(d.id, o, x[2])); });
      }
    }
  }
  vider();
  /* Second tour, pour les modules qui ne peuvent conclure qu'une fois TOUTES
     les portes du pas arrivées. La logique combinatoire en est : évaluer dès
     l'arrivée de A laisserait l'ordre des câbles décider du résultat, et une
     sortie déjà partie ne se rattrape pas. */
  EUR.mods.forEach(function(m){
    if(!m.finPas) return;
    var f = m.finPas(t);
    if(f) f.forEach(function(o){ file.push(eurSortie(m.id, o, t)); });
  });
  if(file.length) vider();
  if(!cache) queue.push({i:i, t:t});
}
function eurSortie(id, o, t){
  return (typeof o === "string") ? [id, o, t] : [id, o[0], o[1]];
}
function beatEur(i){ EUR.pos = i; }
function arretEur(){
  var b = document.getElementById("eur-play");
  if(b) b.classList.remove("on");
}
function boucleEur(){ }
var MACHINE_EUR = {schedule:scheduleEur, beat:beatEur, arret:arretEur, boucle:boucleEur,
                   longueur:function(){ return 16; }};

/* ---------- dessin du rack ---------- */
var EUR_KNOBS = [];
function eurDessiner(){
  var p = document.getElementById("eur-piste");
  if(!p) return;
  p.innerHTML = "";
  EUR_KNOBS = [];
  var rangees = [document.createElement("div"), document.createElement("div")];
  rangees.forEach(function(r){ r.className = "eur-rangee"; p.appendChild(r); });
  EUR.mods.forEach(function(m, i){
    var d = EUR_CAT[m.type];
    var e = document.createElement("div");
    e.className = "eur-mod" + (d.sombre ? " sombre" : "") + (i === EUR.sel ? " choisi" : "");
    e.style.width = d.hp + "px";
    e.dataset.i = i;
    var h = "<b>" + d.nom + "</b>";
    /* deux colonnes dès que la pile deviendrait plus haute que l'écran */
    var deuxCol = d.kns.length > 6;
    if(deuxCol) h += '<div class="eur-kns2" style="grid-template-rows:repeat(' +
                     Math.ceil(d.kns.length / 2) + ',auto)">';
    d.kns.forEach(function(k){
      /* la poignée est le bloc entier, étiquette comprise : le bouton seul fait
         vingt-six pixels, et bien moins une fois le rack mis à l'échelle */
      h += '<div class="eur-kn" id="eur-k-' + m.id + '-' + k[0] + '"><div class="bt"><i></i></div>' +
           '<em>' + k[1] + '</em></div>';
    });
    if(deuxCol) h += "</div>";
    h += '<div class="eur-jacks">';
    d.jacks.forEach(function(j){
      h += '<div class="eur-j' + (j[2] ? " sortie" : "") + '" data-m="' + m.id + '" data-j="' + j[0] +
           '" data-s="' + j[2] + '"><i></i><span>' + j[1] + '</span></div>';
    });
    h += "</div>";
    e.innerHTML = h;
    rangees[m.r === 1 ? 1 : 0].appendChild(e);
  });
  EUR.mods.forEach(function(m){
    var d = EUR_CAT[m.type];
    d.kns.forEach(function(k){
      var id = "eur-k-" + m.id + "-" + k[0];
      if(!document.getElementById(id)) return;
      EUR_KNOBS.push(knobEm(id, {min:k[2], max:k[3],
        get:function(){ return m.p[k[0]]; },
        set:function(v){
          m.p[k[0]] = v;
          if(m.maj) m.maj();
          lcdEur(String(Math.round(v * 100)), EUR_CAT[m.type].nom + " " + k[1], true);
          memEur();
        },
        tap:function(){
          lcdEur(String(Math.round(m.p[k[0]] * 100)), EUR_CAT[m.type].nom + " " + k[1], true);
          H.cran();
        }}));
    });
  });
  EUR_KNOBS.forEach(function(k){ k.maj(); });
  eurCables();
  majLcdEur();
  if(window.eurMajBarre) setTimeout(window.eurMajBarre, 30);
}
/* les câbles sont dessinés par-dessus, en courbes molles comme de vrais fils */
function eurCables(){
  var svg = document.getElementById("eur-cables"), rack = document.getElementById("eur-rack");
  if(!svg || !rack) return;
  var piste = document.getElementById("eur-piste");
  var L = piste.scrollWidth, H = piste.offsetHeight + 44;
  svg.setAttribute("width", L);
  svg.setAttribute("height", H);
  svg.style.width = L + "px";
  svg.style.height = H + "px";
  /* Le rack est mis à l'échelle par fit() : les rectangles renvoyés par le
     navigateur sont en pixels d'écran, alors que le dessin se fait dans le
     repère du rack. Sans cette division, les câbles sont décalés et rapetissés
     dès que la machine ne tient pas en entier dans la fenêtre. */
  var rp = piste.getBoundingClientRect();
  var ech = rp.width / (piste.offsetWidth || 1) || 1;
  var teintes = ["#e05a3a","#3ad0e0","#e0c03a","#8fe05a","#c85ae0","#5a8fe0"];
  var h = "";
  EUR.cables.forEach(function(c, n){
    var a = document.querySelector('.eur-j[data-m="' + c.de[0] + '"][data-j="' + c.de[1] + '"] i');
    var b = document.querySelector('.eur-j[data-m="' + c.vers[0] + '"][data-j="' + c.vers[1] + '"] i');
    if(!a || !b) return;
    var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    var x1 = (ra.left - rp.left + ra.width / 2) / ech, y1 = (ra.top - rp.top + ra.height / 2) / ech;
    var x2 = (rb.left - rp.left + rb.width / 2) / ech, y2 = (rb.top - rp.top + rb.height / 2) / ech;
    /* un câble pend : la courbe descend, mais pas plus bas que le rack */
    var creux = Math.min(34, Math.max(14, Math.abs(x2 - x1) * 0.22));
    h += '<path d="M' + x1 + ',' + y1 + ' C' + x1 + ',' + (y1 + creux) + ' ' +
         x2 + ',' + (y2 + creux) + ' ' + x2 + ',' + y2 + '" fill="none" stroke="' +
         teintes[n % teintes.length] + '" stroke-width="2.6" stroke-linecap="round" opacity=".92"/>';
  });
  svg.innerHTML = h;
}
var eurTmr = null;
function lcdEur(a, b, fugace){
  var x = document.getElementById("eur-val"), y = document.getElementById("eur-lab");
  if(!x) return;
  x.textContent = a; y.textContent = b;
  clearTimeout(eurTmr);
  if(fugace) eurTmr = setTimeout(majLcdEur, 1400);
}
function majLcdEur(){
  if(!EUR.mods.length){ lcdEur("RACK VIDE", "AJOUTEZ UN MODULE"); return; }
  if(EUR.attente){
    lcdEur("RELIER : " + EUR.attente.j.toUpperCase(), "TOUCHEZ UNE ENTRÉE");
    return;
  }
  lcdEur(EUR.mods.length + " MODULES · " + EUR.cables.length + " CÂBLES",
         EUR.sel >= 0 && EUR.mods[EUR.sel] ? EUR_CAT[EUR.mods[EUR.sel].type].res : "TOUCHEZ UNE SORTIE PUIS UNE ENTRÉE");
}

/* ---------- câblage au doigt : une sortie, puis une entrée ---------- */
(function gestesEur(){
  var piste = document.getElementById("eur-piste");
  piste.addEventListener("click", function(e){
    var j = e.target.closest(".eur-j");
    if(j){
      var id = +j.dataset.m, nom = j.dataset.j, sortie = j.dataset.s === "1";
      if(sortie){
        EUR.attente = {m:id, j:nom};
        document.querySelectorAll(".eur-j").forEach(function(x){ x.classList.remove("attente"); });
        j.classList.add("attente");
        majLcdEur(); H.cran();
      } else if(EUR.attente){
        /* une entrée n'accepte qu'un câble : on remplace le précédent */
        EUR.cables = EUR.cables.filter(function(c){
          return !(c.vers[0] === id && c.vers[1] === nom);
        });
        EUR.cables.push({de:[EUR.attente.m, EUR.attente.j], vers:[id, nom]});
        EUR.attente = null;
        eurBatir(); eurDessiner(); memEur(); H.inter();
      } else {
        /* toucher une entrée déjà câblée retire son câble */
        var av = EUR.cables.length;
        EUR.cables = EUR.cables.filter(function(c){
          return !(c.vers[0] === id && c.vers[1] === nom);
        });
        if(EUR.cables.length !== av){ eurBatir(); eurDessiner(); memEur(); H.inter(); }
      }
      return;
    }
    var mod = e.target.closest(".eur-mod");
    if(mod){ EUR.sel = +mod.dataset.i; eurDessiner(); H.cran(); }
  });
  document.getElementById("eur-rack").addEventListener("scroll", eurCables);
  window.addEventListener("resize", function(){ if(S.modele === "eur") eurCables(); });
})();

/* ---------- catalogue ---------- */
function eurCatalogue(){
  var c = document.getElementById("eur-cat");
  if(c.style.display !== "none" && c.dataset.vue === "mod"){ montrerCat(c, false); return; }
  c.innerHTML = ""; c.dataset.vue = "mod";
  /* cent trois modules en vrac seraient illisibles : on les range par
     familles, et l'onglet choisi décide de ce qu'on voit */
  var onglets = document.createElement("div");
  onglets.className = "eur-fam";
  EUR_FAM.forEach(function(f){
    var b = document.createElement("button");
    b.textContent = f[1];
    b.className = (EUR.famille === f[0] || (!EUR.famille && f === EUR_FAM[0])) ? "on" : "";
    b.addEventListener("click", function(){ EUR.famille = f[0]; montrerCat(c, false); eurCatalogue(); });
    onglets.appendChild(b);
  });
  c.appendChild(onglets);
  var fam = EUR.famille || EUR_FAM[0][0];
  var n = 0;
  EUR_ORDRE.forEach(function(t){
    var d = EUR_CAT[t];
    if((d.fam || "util") !== fam) return;
    n++;
    var b = document.createElement("button");
    b.innerHTML = d.nom + "<span>" + d.res + "</span>";
    b.addEventListener("click", function(){
      eurAjouter(t);
      signal(d.nom + " AJOUTÉ");
      H.inter();
    });
    c.appendChild(b);
  });
  montrerCat(c, true);
}
/* Huit racks au lieu d'un. Un vrai modulaire ne garde rien : on photographie
   son patch avant de le défaire. Ici RACK AU SORT et VIDER effaçaient le
   travail en cours sans retour possible, ce qui décourageait d'essayer. */
function rackCourant(){
  return {prochain:EUR.prochain, sel:EUR.sel, nom:EUR.nom || "",
    mods:EUR.mods.map(function(m){ return {id:m.id, type:m.type, p:m.p, r:m.r || 0}; }),
    cables:EUR.cables};
}
/* Un rack sans nom se présente par son numéro. Dès qu'il porte un nom, c'est
   le nom qui s'affiche : huit numéros ne disent rien, huit noms disent tout. */
function nomRack(n, o){
  return (o && o.nom) ? o.nom : ("RACK " + (n + 1));
}
function memEur(){
  var m = memoire.eur;
  if(!m || !m.racks) m = memoire.eur = {cur:EUR.cur, racks:[]};
  m.cur = EUR.cur;
  m.racks[EUR.cur] = rackCourant();
  sauverMachine("eur");
}
/* Les sauvegardes d'avant la v68 sont un rack seul : on le reprend en premier
   emplacement au lieu de le perdre. */
function memEurNormalise(){
  var m = memLire("eur");
  if(!m) return {cur:0, racks:[]};
  if(m.racks) return m;
  var n = {cur:0, racks:[m.mods ? m : null]};
  memoire.eur = n;
  return n;
}
function poserRack(o){
  EUR.mods = []; EUR.cables = []; EUR.sel = -1; EUR.prochain = 1; EUR.attente = null;
  if(o && o.mods){
    o.mods.forEach(function(x){
      if(!EUR_CAT[x.type]) return;
      var y = {id:x.id, type:x.type, p:{}, r:(x.r === 1 ? 1 : 0)};
      EUR_CAT[x.type].kns.forEach(function(k){
        y.p[k[0]] = (x.p && typeof x.p[k[0]] === "number") ? x.p[k[0]] : k[4];
      });
      EUR.mods.push(y);
    });
    EUR.cables = (o.cables || []).filter(function(c){ return c && c.de && c.vers; });
    if(typeof o.prochain === "number") EUR.prochain = o.prochain;
    if(typeof o.sel === "number") EUR.sel = o.sel;
  }
  EUR.nom = (o && typeof o.nom === "string") ? o.nom : "";
}
function changerRack(n){
  memEur();                                   /* on garde celui qu'on quitte */
  EUR.cur = ((n % EUR_RACKS) + EUR_RACKS) % EUR_RACKS;
  poserRack(memEurNormalise().racks[EUR.cur]);
  eurBatir(); eurDessiner(); memEur();
  majRackEur();
  lcdEur(EUR.nom || ("RACK " + (EUR.cur + 1)),
         EUR.mods.length ? (EUR.mods.length + " MODULES") : "VIDE", true);
}
function majRackEur(){
  var b = document.getElementById("eur-ptn");
  if(b) b.textContent = EUR.nom || ("RACK " + (EUR.cur + 1));
}
/* Nommer sert à deux choses : retrouver un montage, et savoir ce qu'on va
   écraser. Le nom vide remet le numéro. */
function nommerRack(){
  var n = window.prompt("Nom du rack " + (EUR.cur + 1) + " :", EUR.nom || "");
  if(n === null) return;
  EUR.nom = n.trim().slice(0, 22);
  memEur(); majRackEur();
  lcdEur(EUR.nom || ("RACK " + (EUR.cur + 1)), EUR.nom ? "RACK NOMMÉ" : "NOM EFFACÉ", true);
}
/* La liste des huit, pour choisir sans les faire défiler un par un. */
function listeRacks(){
  var c = document.getElementById("eur-cat");
  if(c.style.display !== "none" && c.dataset.vue === "rack"){ montrerCat(c, false); return; }
  c.innerHTML = ""; c.dataset.vue = "rack";
  var m = memEurNormalise();
  for(var i=0;i<EUR_RACKS;i++){
    (function(n){
      var o = (n === EUR.cur) ? rackCourant() : m.racks[n];
      var b = document.createElement("button");
      var nb = (o && o.mods) ? o.mods.length : 0;
      /* v132 : le nom d'un rack est saisi par l'utilisateur */
      b.textContent = nomRack(n, o);
      var sp = document.createElement("span");
      sp.textContent =
        (nb ? (nb + " modules" + ((o.cables || []).length ? " · " + o.cables.length + " câbles" : ""))
            : "vide") +
        (n === EUR.cur ? " · EN COURS" : "");
      b.appendChild(sp);
      if(n === EUR.cur) b.className = "on";
      b.addEventListener("click", function(){
        montrerCat(c, false);
        if(n !== EUR.cur) changerRack(n);
        H.inter();
      });
      c.appendChild(b);
    })(i);
  }
  montrerCat(c, true);
}
function chargerEur(){
  var m = memEurNormalise();
  EUR.cur = (typeof m.cur === "number" && m.cur >= 0 && m.cur < EUR_RACKS) ? m.cur : 0;
  poserRack(m.racks[EUR.cur]);
  majRackEur();
}
function eurExemple(){
  EUR.mods = []; EUR.cables = []; EUR.prochain = 1;
  var h = eurAjouter("clock", true), s = eurAjouter("seq8", true), o = eurAjouter("vco", true),
      f = eurAjouter("vcf", true), en = eurAjouter("adsr", true), a = eurAjouter("vca", true),
      d = eurAjouter("delay", true), so = eurAjouter("out", true);
  EUR.cables = [
    {de:[h.id,"out"], vers:[s.id,"clk"]},
    {de:[s.id,"cv"], vers:[o.id,"voct"]},
    {de:[s.id,"gate"], vers:[en.id,"gate"]},
    {de:[o.id,"saw"], vers:[f.id,"in"]},
    {de:[f.id,"out"], vers:[a.id,"in"]},
    {de:[en.id,"out"], vers:[a.id,"cv"]},
    {de:[en.id,"out"], vers:[f.id,"cv"]},
    {de:[a.id,"out"], vers:[d.id,"in"]},
    {de:[d.id,"out"], vers:[so.id,"in"]}
  ];
  EUR.sel = -1;
  eurBatir(); eurDessiner(); memEur();
  signal("PATCH D'EXEMPLE : SÉQUENCE FILTRÉE ET ÉCHO");
}

document.getElementById("eur-play").addEventListener("click", function(){
  audioInit(); eurBatir();
  if(S.run){ stop(); H.stop(); } else { step = 0; start(); H.start(); }
  this.classList.toggle("on", S.run);
});
document.getElementById("eur-ajout").addEventListener("click", function(){ eurCatalogue(); H.cran(); });
document.getElementById("eur-suppr").addEventListener("click", function(){
  if(EUR.sel < 0){ signal("CHOISISSEZ UN MODULE"); return; }
  eurRetirer(EUR.sel);
  signal("MODULE RETIRÉ");
});
document.getElementById("eur-rangee").addEventListener("click", function(){
  if(EUR.sel < 0){ signal("CHOISISSEZ UN MODULE"); return; }
  var m = EUR.mods[EUR.sel];
  m.r = (m.r === 1) ? 0 : 1;
  eurDessiner(); memEur(); H.inter();
  signal(EUR_CAT[m.type].nom + " : RANGÉE " + (m.r + 1));
});
document.getElementById("eur-decable").addEventListener("click", function(){
  EUR.cables = []; EUR.attente = null;
  eurBatir(); eurDessiner(); memEur(); H.inter();
  signal("TOUS LES CÂBLES RETIRÉS");
});
document.getElementById("eur-exemple").addEventListener("click", function(){ eurExemple(); H.inter(); });
document.getElementById("eur-hasard").addEventListener("click", function(){ eurHasard(); H.inter(); });
/* Un rack tiré au sort, mais pas n'importe comment : une horloge, une source
   de rythme, deux ou trois voix, un traitement et une sortie. Sans cette
   ossature on obtient un tas de modules qui ne sonne pas. */
