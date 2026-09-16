/* ================= traitements ================= */
delay: eurEffet("ECHO", 72, "Délai à réinjection",
  [["time","TIME",0,1,0.3],["fb","FEED",0,1,0.35],["mix","MIX",0,1,0.4]],
  function(m, e, out){
    var d = ctx.createDelay(2), fb = eurGain(0), sec = eurGain(1), hum = eurGain(0);
    e.connect(sec); sec.connect(out);
    e.connect(d); d.connect(fb); fb.connect(d); d.connect(hum); hum.connect(out);
    m.maj = function(){
      d.delayTime.value = 0.02 + m.p.time * 1.2;
      fb.gain.value = m.p.fb * 0.85;
      sec.gain.value = 1 - m.p.mix * 0.6;
      hum.gain.value = m.p.mix;
    };
    m.maj();
  }),

verb: eurEffet("REVERB", 64, "Réverbération",
  [["taille","SIZE",0,1,0.5],["mix","MIX",0,1,0.35]],
  function(m, e, out){
    /* SIZE ne faisait rien : la queue était fixée à deux secondes une fois
       pour toutes. Refabriquer le tampon à chaque tour de potard coûterait
       trop cher, alors on en prépare quatre et on bascule. */
    var c = ctx.createConvolver(), sec = eurGain(1), hum = eurGain(0);
    var durees = [0.35, 0.9, 1.8, 3.2], tampons = [];
    durees.forEach(function(sec2){
      var n = Math.floor(ctx.sampleRate * sec2);
      var b = ctx.createBuffer(2, n, ctx.sampleRate);
      for(var k=0;k<2;k++){
        var d = b.getChannelData(k);
        for(var i=0;i<n;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/n, 2.5);
      }
      tampons.push(b);
    });
    var courant = -1;
    e.connect(sec); sec.connect(out);
    e.connect(c); c.connect(hum); hum.connect(out);
    m.maj = function(){
      var n = Math.min(3, Math.floor(m.p.taille * 4));
      if(n !== courant){ courant = n; c.buffer = tampons[n]; }
      sec.gain.value = 1 - m.p.mix * 0.7;
      hum.gain.value = m.p.mix * 1.4;
    };
    m.maj();
  }),

fold: eurEffet("FOLD", 56, "Replie l'onde sur elle-même",
  [["amt","FOLD",0,1,0.3],["sym","SYM",-1,1,0]],
  function(m, e, out){
    var pre = eurGain(1), sh = ctx.createWaveShaper(), off = eurConst(0);
    e.connect(pre); off.connect(pre); pre.connect(sh); sh.connect(out);
    m.maj = function(){
      var p = 1 + m.p.amt * 7;
      sh.curve = eurCourbe(function(x){ return Math.sin(x * p * Math.PI) * 0.85; });
      off.offset.value = m.p.sym * 0.5;
    };
    m.maj();
  }),

dist: eurEffet("DRIVE", 56, "Saturation",
  [["drv","DRIVE",0,1,0.4],["mix","MIX",0,1,1]],
  function(m, e, out){
    var sh = ctx.createWaveShaper(), sec = eurGain(0), hum = eurGain(1);
    sh.oversample = "2x";
    e.connect(sec); sec.connect(out);
    e.connect(sh); sh.connect(hum); hum.connect(out);
    m.maj = function(){
      var d = 1 + m.p.drv * 20;
      sh.curve = eurCourbe(function(x){ return Math.tanh(x * d) / Math.tanh(d); });
      sec.gain.value = 1 - m.p.mix; hum.gain.value = m.p.mix;
    };
    m.maj();
  }),

bits: eurEffet("BITS", 52, "Réduction de définition",
  [["b","BITS",0,1,0.5]],
  function(m, e, out){
    var sh = ctx.createWaveShaper();
    sh.oversample = "none";                      /* voulu : BITS replie, c'est son rôle */
    e.connect(sh); sh.connect(out);
    m.maj = function(){
      var n = Math.max(2, Math.round(2 + (1 - m.p.b) * 12));
      var pas = Math.pow(2, n) / 2;
      sh.curve = eurCourbe(function(x){ return Math.round(x * pas) / pas; });
    };
    m.maj();
  }),

ring: {nom:"RING", hp:52, sombre:true, res:"Modulation en anneau", fam:"effet",
  kns:[["f","FREQ",0,1,0.35],["mix","MIX",0,1,1]],
  jacks:[["in","IN",0],["mod","MOD",0],["out","OUT",1]],
  creer:function(m){
    var e = eurGain(1), out = eurGain(1);
    var anneau = eurGain(0);
    var o = ctx.createOscillator(); o.type = "sine"; o.start();
    var interne = eurGain(1);
    o.connect(interne); interne.connect(anneau.gain);
    var modin = eurGain(1);
    modin.connect(anneau.gain);
    e.connect(anneau);
    var sec = eurGain(0);
    e.connect(sec); sec.connect(out); anneau.connect(out);
    m.maj = function(){
      o.frequency.value = 20 * Math.pow(120, m.p.f);
      sec.gain.value = 1 - m.p.mix;
    };
    m.maj();
    return {e:{in:e, mod:modin}, s:{out:out}};
  }},

chorus: eurEffet("CHORUS", 56, "Épaissit par désaccord",
  [["rate","RATE",0,1,0.3],["prof","DEPTH",0,1,0.4]],
  function(m, e, out){
    var d = ctx.createDelay(0.05), lfo = ctx.createOscillator(), amp = eurGain(0.002);
    lfo.type = "sine"; lfo.start();
    lfo.connect(amp); amp.connect(d.delayTime);
    d.delayTime.value = 0.012;
    e.connect(out); e.connect(d); d.connect(out);
    m.maj = function(){
      lfo.frequency.value = 0.1 + m.p.rate * 6;
      amp.gain.value = m.p.prof * 0.006;
    };
    m.maj();
  }),

phaser: eurEffet("PHASER", 56, "Balaye des creux dans le spectre",
  [["rate","RATE",0,1,0.25],["prof","DEPTH",0,1,0.5]],
  function(m, e, out){
    var lfo = ctx.createOscillator(), amp = eurGain(600);
    lfo.type = "sine"; lfo.start(); lfo.connect(amp);
    var prec = e;
    for(var i=0;i<4;i++){
      var ap = ctx.createBiquadFilter();
      ap.type = "allpass";
      ap.frequency.value = 400 + i * 500;
      amp.connect(ap.detune);
      prec.connect(ap);
      prec = ap;
    }
    e.connect(out); prec.connect(out);
    m.maj = function(){ lfo.frequency.value = 0.05 + m.p.rate * 4; amp.gain.value = m.p.prof * 1800; };
    m.maj();
  }),

grain: eurEffet("GRAIN", 64, "Texture par nuage de grains",
  [["taille","SIZE",0,1,0.4],["dens","DENSITY",0,1,0.5],["mix","MIX",0,1,0.6]],
  function(m, e, out){
    /* un délai court dont le temps saute sans cesse : ce n'est pas un vrai
       granulateur, mais le nuage y ressemble beaucoup */
    var d = ctx.createDelay(1), sec = eurGain(1), hum = eurGain(0);
    var lfo = ctx.createOscillator(); lfo.type = "square"; lfo.start();
    var amp = eurGain(0.05);
    lfo.connect(amp); amp.connect(d.delayTime);
    d.delayTime.value = 0.08;
    e.connect(sec); sec.connect(out);
    e.connect(d); d.connect(hum); hum.connect(out);
    m.maj = function(){
      d.delayTime.value = 0.01 + m.p.taille * 0.3;
      lfo.frequency.value = 1 + m.p.dens * 28;
      amp.gain.value = m.p.taille * 0.06;
      sec.gain.value = 1 - m.p.mix * 0.8; hum.gain.value = m.p.mix * 1.2;
    };
    m.maj();
  }),

kamien: {nom:"KAMIENIEC", hp:76, res:"Rotateur de phase résonant, deux sorties opposées", fam:"effet",
  kns:[["poles","MODE",0,1,0.5],["reso","RESO",0,1,0.4],
       ["rate","LFO RATE",0,1,0.25],["depth","DEPTH",0,1,0.6],["mix","MIX",0,1,0.7]],
  jacks:[["in","IN",0],["mod","EXT MOD",0],["a","A",1],["b","B",1],["lfo","LFO",1]],
  creer:function(m){
    /* Un phaser ne filtre pas : il fait TOURNER la phase. Douze cellules
       passe-tout laissent tout passer mais décalent chaque fréquence
       différemment ; c'est en réadditionnant au signal d'origine que les
       creux apparaissent.

       D'où les deux sorties : A additionne, B soustrait. Elles sont
       complémentaires — ce qui creuse sur A bosse sur B. En stéréo, c'est
       l'image la plus large qu'on puisse obtenir d'un seul module. */
    var e = eurGain(1), cellules = [];
    var pre = e;
    for(var i=0;i<12;i++){
      var ap = ctx.createBiquadFilter();
      ap.type = "allpass"; ap.frequency.value = 500; ap.Q.value = 1;
      pre.connect(ap); pre = ap;
      cellules.push(ap);
    }
    var fin = pre;
    var fb = eurGain(0);
    fin.connect(fb); fb.connect(e);              /* la résonance */

    var sec = eurGain(1), humA = eurGain(0), humB = eurGain(0);
    var a = eurGain(1), b = eurGain(1);
    e.connect(sec); sec.connect(a); sec.connect(b);
    fin.connect(humA); humA.connect(a);
    fin.connect(humB); humB.connect(b);          /* humB sera négatif */

    var lfo = ctx.createOscillator(); lfo.type = "triangle";
    var prof = eurGain(0), sortieLfo = eurGain(0.5);
    lfo.connect(prof); lfo.connect(sortieLfo);
    var modExt = eurGain(1200);
    cellules.forEach(function(c){ prof.connect(c.frequency); modExt.connect(c.detune); });
    lfo.start();

    m.maj = function(){
      /* MODE choisit combien de cellules travaillent : deux, quatre, six ou
         douze. Moins de cellules, moins de creux — un léger balancement au
         lieu d'un tourbillon. */
      var actives = [2, 4, 6, 12][Math.min(3, Math.round(m.p.poles * 3))];
      cellules.forEach(function(c, i){
        c.frequency.value = i < actives ? (300 + i * 90) : 20000;
      });
      fb.gain.value = m.p.reso * 0.75;
      lfo.frequency.value = 0.02 * Math.pow(400, m.p.rate);
      prof.gain.value = m.p.depth * 1600;
      sec.gain.value = 1 - m.p.mix * 0.5;
      humA.gain.value = m.p.mix;
      humB.gain.value = -m.p.mix;                /* l'opposé, d'où B */
    };
    m.maj();
    return {e:{in:e, mod:modExt}, s:{a:a, b:b, lfo:sortieLfo}};
  }},

plasma: eurEffet("PLASMA", 68, "Distorsion à tube : ça ne sature pas, ça casse",
  [["volt","VOLTAGE",0,1,0.55],["niv","IN LVL",0,1,0.6],
   ["oct","OCTAVE",0,1,0],["bass","BASS",0,1,0.5],["treb","TREBLE",0,1,0.5],["mix","DRY/WET",0,1,0.8]],
  function(m, e, out){
    /* Le signal traverse un tube à décharge : il n'y a pas de transition douce
       entre « pas de son » et « arc électrique ». D'où une courbe très raide au
       centre, presque un interrupteur — c'est ce qui distingue ce module d'une
       saturation ordinaire, qui arrondit.

       L'octave supérieure vient d'un redressement : replier les alternances
       négatives double la fréquence apparente. C'est gratuit et c'est exact. */
    var ent = eurGain(1), forme = ctx.createWaveShaper();
    var red = ctx.createWaveShaper(), gOct = eurGain(0);
    red.oversample = "2x";                     /* v153 : le redresseur crée des harmoniques aiguës */
    var bs = ctx.createBiquadFilter(); bs.type = "lowshelf";  bs.frequency.value = 200;
    var tr = ctx.createBiquadFilter(); tr.type = "highshelf"; tr.frequency.value = 3000;
    var sec = eurGain(1), hum = eurGain(0), som = eurGain(1);

    /* redresseur : |x|, donc une octave au-dessus */
    var n = 1025, c = new Float32Array(n);
    for(var i=0;i<n;i++){ var x = i * 2 / (n - 1) - 1; c[i] = Math.abs(x) * 2 - 1; }
    red.curve = c;

    e.connect(ent);
    ent.connect(forme); ent.connect(red); red.connect(gOct); gOct.connect(forme);
    forme.connect(bs); bs.connect(tr); tr.connect(hum); hum.connect(som);
    e.connect(sec); sec.connect(som); som.connect(out);

    m.maj = function(){
      ent.gain.value = 0.2 + m.p.niv * 2.4;
      var k = 2 + m.p.volt * 60;
      var q = 1025, cc = new Float32Array(q);
      for(var j=0;j<q;j++){
        var xx = j * 2 / (q - 1) - 1;
        /* tanh d'un gain énorme : la pente au centre devient verticale */
        cc[j] = Math.tanh(xx * k);
      }
      forme.curve = cc; forme.oversample = "4x";
      gOct.gain.value = m.p.oct * 0.9;
      bs.gain.value = (m.p.bass - 0.5) * 24;
      tr.gain.value = (m.p.treb - 0.5) * 24;
      sec.gain.value = 1 - m.p.mix;
      /* on rattrape : casser le signal le rend beaucoup plus fort */
      hum.gain.value = m.p.mix * (0.5 - m.p.volt * 0.28);
    };
    m.maj();
  }),

plexi: eurEffet("PLEXIPHON", 72, "Un buisson de résonances accordées",
  [["taille","SIZE",0,1,0.45],["dec","DECAY",0,1,0.6],
   ["coul","COLOR",0,1,0.5],["diff","DIFFUSE",0,1,0.4],["mix","MIX",0,1,0.5]],
  function(m, e, out){
    /* Six retards très courts, de longueurs premières entre elles, rebouclés.
       Chacun sonne une hauteur ; ensemble ils font un corps. SIZE les allonge
       tous à la fois, ce qui descend l'accord d'un bloc.

       Deux passe-tout en entrée étalent l'attaque : sans eux on entend six
       échos distincts au lieu d'une matière. C'est toute la différence entre
       un délai multiple et un résonateur. */
    var sec = eurGain(1), hum = eurGain(0), som = eurGain(0.22);
    var amort = ctx.createBiquadFilter(); amort.type = "lowpass";
    var tetes = [], ap = [];
    var pre = e;
    for(var a=0;a<2;a++){
      var d0 = ctx.createDelay(0.05), g0 = eurGain(0), inv = eurGain(1);
      d0.delayTime.value = 0.0043 + a * 0.0071;
      pre.connect(d0); d0.connect(g0); g0.connect(d0);
      d0.connect(inv);
      ap.push({d:d0, g:g0});
      pre = inv;
    }
    var RAP = [1, 1.19, 1.41, 1.67, 1.93, 2.31];
    RAP.forEach(function(r){
      var dl = ctx.createDelay(0.4), fb = eurGain(0);
      pre.connect(dl); dl.connect(amort); amort.connect(fb); fb.connect(dl);
      dl.connect(som);
      tetes.push({d:dl, fb:fb, r:r});
    });
    e.connect(sec); sec.connect(out);
    som.connect(hum); hum.connect(out);
    m.maj = function(){
      var base = 0.004 + m.p.taille * 0.075;
      tetes.forEach(function(t){
        t.d.delayTime.value = base * t.r;
        /* jamais au-delà de 0,92 : au-dessus la boucle ne s'éteint plus */
        t.fb.gain.value = 0.35 + m.p.dec * 0.57;
      });
      amort.frequency.value = 420 + m.p.coul * 11000;
      ap.forEach(function(x){ x.g.gain.value = m.p.diff * 0.62; });
      sec.gain.value = 1 - m.p.mix * 0.8;
      hum.gain.value = m.p.mix * 1.1;
    };
    m.maj();
  }),

bbd: eurEffet("BBD", 64, "Écho à seaux : chaque reprise s'assombrit",
  [["time","TIME",0,1,0.35],["fb","FEED",0,1,0.45],["mix","MIX",0,1,0.4]],
  function(m, e, out){
    /* Avant les mémoires numériques, un écho se faisait en passant le signal
       de godet en godet. Chaque passage perdait de l'aigu et prenait du
       souffle : les reprises s'enfoncent au lieu de se répéter à l'identique.
       Le passe-bas est DANS la boucle, c'est tout le secret. */
    var d = ctx.createDelay(1.2), fb = eurGain(0);
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600;
    var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 180;
    var sec = eurGain(1), hum = eurGain(0);
    var lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.7; lfo.start();
    var lg = eurGain(0.0014);                 /* le léger tangage des vieux circuits */
    lfo.connect(lg); lg.connect(d.delayTime);
    e.connect(sec); sec.connect(out);
    e.connect(d); d.connect(lp); lp.connect(hp); hp.connect(fb); fb.connect(d);
    hp.connect(hum); hum.connect(out);
    m.maj = function(){
      d.delayTime.value = 0.03 + m.p.time * 0.55;
      fb.gain.value = m.p.fb * 0.85;
      sec.gain.value = 1 - m.p.mix * 0.6;
      hum.gain.value = m.p.mix * 1.1;
    };
    m.maj();
  }),

spring: eurEffet("SPRING", 64, "Réverbération à ressort",
  [["ten","TENSION",0,1,0.5],["mix","MIX",0,1,0.35]],
  function(m, e, out){
    /* Trois ressorts de longueurs premières entre elles, comme dans le bac
       d'un ampli de guitare. On n'entend pas une salle mais un métal : ça
       tinte, ça traîne, et si on frappe fort ça fait « boing ». */
    var sec = eurGain(1), hum = eurGain(0), noeud = eurGain(0.34);
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2;
    var gains = [];
    e.connect(sec); sec.connect(out);
    e.connect(bp);
    [0.0231, 0.0331, 0.0411].forEach(function(dt){
      var dl = ctx.createDelay(0.2); dl.delayTime.value = dt;
      var g = eurGain(0.6);
      bp.connect(dl); dl.connect(g); g.connect(dl); dl.connect(noeud);
      gains.push(g);
    });
    noeud.connect(hum); hum.connect(out);
    m.maj = function(){
      bp.frequency.value = 1200 + m.p.ten * 2600;
      /* jamais au-delà de 0,88 : la boucle doit s'éteindre */
      gains.forEach(function(g){ g.gain.value = 0.55 + m.p.ten * 0.33; });
      sec.gain.value = 1 - m.p.mix * 0.6;
      hum.gain.value = m.p.mix * 0.9;
    };
    m.maj();
  }),

clip: eurEffet("CLIP", 60, "Écrêtage franc, sans douceur",
  [["drive","DRIVE",0,1,0.5],["ton","TONE",0,1,0.5]],
  function(m, e, out){
    /* DRIVE sature en douceur, celui-ci coupe net. La différence s'entend :
       l'écrêtage franc fabrique des harmoniques impairs en escalier, c'est la
       couleur de la hardtek et du hardkore. TONE ouvre un passe-haut derrière,
       sans quoi tout se noie dans le grave. */
    var forme = ctx.createWaveShaper();
    var hp = ctx.createBiquadFilter(); hp.type = "highpass";
    var comp = eurGain(1);
    e.connect(forme); forme.connect(hp); hp.connect(comp); comp.connect(out);
    m.maj = function(){
      var n = 1025, c = new Float32Array(n), seuil = 1 - m.p.drive * 0.93;
      for(var i=0;i<n;i++){
        var x = i * 2 / (n - 1) - 1;
        c[i] = Math.max(-seuil, Math.min(seuil, x)) / seuil;
      }
      forme.curve = c; forme.oversample = "2x";
      hp.frequency.value = 20 + m.p.ton * 400;
      /* on rattrape le niveau : écrêter fort remonte beaucoup le volume */
      comp.gain.value = 0.35 + (1 - m.p.drive) * 0.5;
    };
    m.maj();
  }),

limit: eurEffet("LIMIT", 52, "Compresseur de crêtes",
  [["seuil","THRESH",0,1,0.6],["rap","RATIO",0,1,0.5]],
  function(m, e, out){
    var c = ctx.createDynamicsCompressor();
    c.attack.value = 0.003; c.release.value = 0.12; c.knee.value = 6;
    e.connect(c); c.connect(out);
    m.maj = function(){
      c.threshold.value = -40 + m.p.seuil * 38;
      c.ratio.value = 1.5 + m.p.rap * 18;
    };
    m.maj();
  }),

eq3: eurEffet("EQ 3", 64, "Grave, médium, aigu",
  [["bas","LOW",0,1,0.5],["mil","MID",0,1,0.5],["haut","HIGH",0,1,0.5]],
  function(m, e, out){
    /* l'égaliseur qui manque toujours dans un rack : trois cloches en série,
       chacune de moins quinze à plus quinze décibels */
    var b = ctx.createBiquadFilter(), md = ctx.createBiquadFilter(), h = ctx.createBiquadFilter();
    b.type = "lowshelf"; b.frequency.value = 180;
    md.type = "peaking"; md.frequency.value = 1100; md.Q.value = 0.9;
    h.type = "highshelf"; h.frequency.value = 4200;
    e.connect(b); b.connect(md); md.connect(h); h.connect(out);
    m.maj = function(){
      b.gain.value = (m.p.bas - 0.5) * 30;
      md.gain.value = (m.p.mil - 0.5) * 30;
      h.gain.value = (m.p.haut - 0.5) * 30;
    };
    m.maj();
  }),

pingpong: eurEffet("PING PONG", 72, "Écho qui rebondit d'une oreille à l'autre",
  [["time","TIME",0,1,0.35],["fb","FEED",0,1,0.4],["mix","MIX",0,1,0.45]],
  function(m, e, out){
    var dg = ctx.createDelay(2), dd = ctx.createDelay(2), fb = eurGain(0);
    var pg = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    var pd = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    var sec = eurGain(1), hum = eurGain(0);
    e.connect(sec); sec.connect(out);
    e.connect(dg);
    /* chaque délai nourrit l'autre : le rebond passe de gauche à droite */
    dg.connect(dd); dd.connect(fb); fb.connect(dg);
    if(pg && pd){
      pg.pan.value = -0.85; pd.pan.value = 0.85;
      dg.connect(pg); dd.connect(pd);
      pg.connect(hum); pd.connect(hum);
    } else { dg.connect(hum); dd.connect(hum); }
    hum.connect(out);
    m.maj = function(){
      var d = 0.05 + m.p.time * 0.7;
      dg.delayTime.value = d; dd.delayTime.value = d;
      fb.gain.value = m.p.fb * 0.82;
      sec.gain.value = 1 - m.p.mix * 0.6;
      hum.gain.value = m.p.mix;
    };
    m.maj();
  }),

