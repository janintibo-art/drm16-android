/* ================= oscillateurs ================= */
vco: {nom:"VCO", hp:72, res:"Oscillateur à quatre formes", fam:"osc",
  kns:[["oct","OCT",0,1,0.5],["fin","FINE",0,1,0.5],["fm","FM",0,1,0]],
  jacks:[["voct","V/OCT",0],["fmin","FM",0],["saw","SAW",1],["sqr","SQR",1],["tri","TRI",1],["sub","SUB",1]],
  creer:function(m){
    var base = 55;
    function osc(type, mult){
      var o = ctx.createOscillator();
      o.type = type; o.frequency.value = base * mult; o.start();
      return o;
    }
    var saw = osc("sawtooth",1), sqr = osc("square",1), tri = osc("triangle",1), sub = osc("square",0.5);
    var voct = eurGain(1200), fm = eurGain(0);
    [saw,sqr,tri,sub].forEach(function(o){ voct.connect(o.detune); fm.connect(o.detune); });
    m.maj = function(){
      var demi = (m.p.oct - 0.5) * 48 + (m.p.fin - 0.5) * 2;
      [saw,sqr,tri].forEach(function(o){ o.frequency.value = base * Math.pow(2, demi/12); });
      sub.frequency.value = base * Math.pow(2, demi/12) / 2;
      fm.gain.value = m.p.fm * 2400;
    };
    m.maj();
    return {e:{voct:voct, fmin:fm}, s:{saw:saw, sqr:sqr, tri:tri, sub:sub}};
  }},

wave: {nom:"MODEL", hp:76, res:"Oscillateur à modèles", fam:"osc",
  kns:[["oct","OCT",0,1,0.5],["modele","MODEL",0,1,0],["harm","HARMO",0,1,0.4]],
  jacks:[["voct","V/OCT",0],["out","OUT",1],["aux","AUX",1]],
  creer:function(m){
    var base = 55, out = eurGain(0.5), aux = eurGain(0.5);
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.start(); o2.start();
    var g2 = eurGain(0.5);
    var fold = ctx.createWaveShaper();
    fold.oversample = "4x";   /* v153 : le repliement d'onde crée beaucoup d'harmoniques aiguës */
    var voct = eurGain(1200);
    voct.connect(o1.detune); voct.connect(o2.detune);
    o1.connect(fold); fold.connect(out);
    o2.connect(g2); g2.connect(aux);
    m.maj = function(){
      var demi = (m.p.oct - 0.5) * 48;
      var f = base * Math.pow(2, demi / 12);
      o1.frequency.value = f;
      /* le potard MODEL parcourt quatre timbres : sinus, dent, carré, et un
         repli d'onde qui enrichit à mesure qu'on tourne */
      var mo = Math.min(3, Math.floor(m.p.modele * 4));
      o1.type = ["sine","sawtooth","square","triangle"][mo];
      o2.type = "sine";
      o2.frequency.value = f * (1 + Math.round(m.p.harm * 6));
      g2.gain.value = m.p.harm * 0.6;
      var pli = 1 + m.p.harm * 4;
      fold.curve = eurCourbe(function(x){ return Math.sin(x * pli * Math.PI) * 0.8; });
    };
    m.maj();
    return {e:{voct:voct}, s:{out:out, aux:aux}};
  }},

fm2: {nom:"FM 2OP", hp:72, res:"Deux opérateurs en modulation", fam:"osc",
  kns:[["oct","OCT",0,1,0.5],["rap","RATIO",0,1,0.25],["idx","INDEX",0,1,0.35]],
  jacks:[["voct","V/OCT",0],["idxin","IDX",0],["out","OUT",1]],
  creer:function(m){
    var base = 55;
    var por = ctx.createOscillator(), mod = ctx.createOscillator();
    por.start(); mod.start();
    var gi = eurGain(0), idxin = eurGain(600);
    mod.connect(gi); gi.connect(por.frequency);
    idxin.connect(gi.gain);
    var voct = eurGain(1200);
    voct.connect(por.detune); voct.connect(mod.detune);
    var out = eurGain(0.6);
    por.connect(out);
    m.maj = function(){
      var f = base * Math.pow(2, (m.p.oct - 0.5) * 48 / 12);
      por.frequency.value = f;
      mod.frequency.value = f * [0.5,1,1.5,2,3,4,5,7][Math.min(7, Math.round(m.p.rap * 7))];
      gi.gain.value = m.p.idx * 1400;
    };
    m.maj();
    return {e:{voct:voct, idxin:idxin}, s:{out:out}};
  }},

super: {nom:"SUPERSAW", hp:64, res:"Sept dents désaccordées", fam:"osc",
  kns:[["oct","OCT",0,1,0.5],["det","DETUNE",0,1,0.25]],
  jacks:[["voct","V/OCT",0],["out","OUT",1]],
  creer:function(m){
    var base = 55, out = eurGain(0.16), voct = eurGain(1200), os = [];
    for(var i=0;i<7;i++){
      var o = ctx.createOscillator();
      o.type = "sawtooth"; o.start();
      o.connect(out); voct.connect(o.detune);
      os.push(o);
    }
    m.maj = function(){
      var f = base * Math.pow(2, (m.p.oct - 0.5) * 48 / 12);
      os.forEach(function(o, i){ o.frequency.value = f * (1 + (i - 3) * m.p.det * 0.012); });
    };
    m.maj();
    return {e:{voct:voct}, s:{out:out}};
  }},

pluck: {nom:"PLUCK", hp:64, sombre:true, res:"Corde pincée", fam:"osc",
  kns:[["oct","OCT",0,1,0.5],["ton","DAMP",0,1,0.5],["dec","DECAY",0,1,0.6]],
  jacks:[["trig","TRIG",0],["voct","V/OCT",0],["out","OUT",1]],
  creer:function(m){
    /* une bouffée de bruit dans un délai qui se réinjecte : c'est tout le
       principe de la corde pincée, et ça sonne juste */
    var out = eurGain(1);
    var dl = ctx.createDelay(0.2), fb = eurGain(0.9);
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass";
    dl.connect(lp); lp.connect(fb); fb.connect(dl); dl.connect(out);
    var an = ctx.createAnalyser(); an.fftSize = 32;
    var voct = eurGain(1); voct.connect(an);
    var tampon = new Float32Array(an.fftSize);
    m.maj = function(){
      lp.frequency.value = 500 + m.p.ton * 7000;
      fb.gain.value = 0.86 + m.p.dec * 0.13;
    };
    m.maj();
    m.recevoir = function(t){
      an.getFloatTimeDomainData(tampon);
      var demi = (m.p.oct - 0.5) * 36 + (tampon[0] || 0) * 12;
      var f = 110 * Math.pow(2, demi / 12);
      dl.delayTime.setValueAtTime(Math.min(0.19, 1 / f), t);
      var n = eurBruit(), g = eurGain(0);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.006);
      n.connect(g); g.connect(dl);
      n.stop(t + 0.05);
      return null;
    };
    return {e:{trig:eurGain(1), voct:voct}, s:{out:out}};
  }},

chord: {nom:"CHORD", hp:64, res:"Quatre voix accordées", fam:"osc",
  kns:[["oct","OCT",0,1,0.4],["type","TYPE",0,1,0],["det","SPREAD",0,1,0.2]],
  jacks:[["voct","V/OCT",0],["out","OUT",1]],
  creer:function(m){
    var base = 55, out = eurGain(0.22), voct = eurGain(1200), os = [];
    for(var i=0;i<4;i++){
      var o = ctx.createOscillator();
      o.type = "sawtooth"; o.start(); o.connect(out); voct.connect(o.detune);
      os.push(o);
    }
    var accords = [[0,4,7,12],[0,3,7,10],[0,5,7,12],[0,4,7,11],[0,2,7,9]];
    m.maj = function(){
      var f = base * Math.pow(2, (m.p.oct - 0.5) * 36 / 12);
      var a = accords[Math.min(4, Math.round(m.p.type * 4))];
      os.forEach(function(o, i){
        o.frequency.value = f * Math.pow(2, a[i] / 12) * (1 + (i - 1.5) * m.p.det * 0.006);
      });
    };
    m.maj();
    return {e:{voct:voct}, s:{out:out}};
  }},

coral: {nom:"CORAL", hp:92, res:"Une voix entière : oscillateur, filtre, deux enveloppes", fam:"osc",
  kns:[["oct","OCT",0,1,0.45],["harm","HARM",0,1,0.4],["timbre","TIMBRE",0,1,0.2],
       ["morph","MORPH",0,1,0.3],["cut","FILTER",0,1,0.6],["fenv","F.ENV",0,1,0.5],
       ["reso","F.RESO",0,1,0.3],["atk","ATTACK",0,1,0.02],["dec","DECAY",0,1,0.45]],
  jacks:[["trig","TRIG",0],["voct","V/OCT",0],["l","L",1],["r","R",1]],
  creer:function(m){
    /* Une voix complète dans un seul module : c'est l'inverse de la philosophie
       du modulaire, et c'est parfois exactement ce qu'il faut. Tout est déjà
       câblé à l'intérieur — une impulsion dans TRIG suffit à produire une note
       entière, filtre et enveloppes compris.

       MORPH désaccorde deux copies et les écarte en stéréo : c'est de là que
       vient la largeur, pas d'un effet ajouté après. */
    var base = 55, voct = eurGain(1200);
    var som = eurGain(0.3);
    var oscs = [];
    [-1, 0, 1].forEach(function(d){
      var o = ctx.createOscillator();
      o.type = "sawtooth";
      voct.connect(o.detune);
      var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      var g = eurGain(d === 0 ? 0.6 : 0.3);
      o.connect(g);
      if(p){ g.connect(p); p.connect(som); } else g.connect(som);
      o.start();
      oscs.push({o:o, g:g, p:p, d:d});
    });
    var bruit = eurBruit(), gb = eurGain(0);
    bruit.connect(gb); gb.connect(som);

    var f = ctx.createBiquadFilter(); f.type = "lowpass";
    var vca = eurGain(0.0001);
    som.connect(f); f.connect(vca);
    var l = eurGain(1), r = eurGain(1);
    vca.connect(l); vca.connect(r);

    m.hz = base;
    m.maj = function(){
      m.hz = base * Math.pow(2, (m.p.oct - 0.5) * 4);
      oscs.forEach(function(x){
        /* HARM transpose les deux copies par intervalles justes : quinte et
           octave, pas un désaccord au hasard. */
        var mult = x.d === 0 ? 1 : (x.d < 0 ? 1 + m.p.harm * 0.5 : 1 + m.p.harm);
        x.o.frequency.value = m.hz * mult * (1 + x.d * m.p.morph * 0.012);
        if(x.p) x.p.pan.value = x.d * m.p.morph;
      });
      gb.gain.value = m.p.timbre * 0.25;
      f.Q.value = 0.7 + m.p.reso * 16;
    };
    m.maj();
    m.recevoir = function(t, entree){
      if(entree !== "trig") return null;
      var a = 0.002 + m.p.atk * 0.5, d = 0.05 + m.p.dec * 1.6;
      vca.gain.cancelScheduledValues(t);
      vca.gain.setValueAtTime(0.0001, t);
      vca.gain.linearRampToValueAtTime(0.7, t + a);
      vca.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
      var bas = 120 + m.p.cut * 5000;
      var haut = Math.min(16000, bas + m.p.fenv * 9000);
      f.frequency.cancelScheduledValues(t);
      f.frequency.setValueAtTime(haut, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(60, bas), t + a + d * 0.8);
      return null;
    };
    return {e:{trig:eurGain(1), voct:voct}, s:{l:l, r:r}};
  }},

vco112: {nom:"VCO 112", hp:80, res:"Deux oscillateurs, et une vraie synchronisation dure", fam:"osc",
  kns:[["oct","OCT",0,1,0.45],["fin","FINE",0,1,0.5],
       ["rap","SYNC RATIO",0,1,0.25],["pw","WIDTH",0,1,0.5],["mix","MIX 1·2",0,1,0.5]],
  jacks:[["voct","V/OCT",0],["o1","VCO 1",1],["o2","VCO 2",1],["mix","MIX",1]],
  creer:function(m){
    /* VCO 1 est le maître, VCO 2 le suit. SYNC RATIO ne désaccorde pas VCO 2 :
       il change le nombre de tours qu'il fait à l'intérieur d'un tour du
       maître. Les deux restent donc TOUJOURS à la même hauteur fondamentale,
       et c'est le timbre qui bouge — voilà ce qu'on entend d'une
       synchronisation, et pourquoi elle n'est jamais fausse. */
    var base = 55, voct = eurGain(1200);
    var o1 = ctx.createOscillator();
    o1.type = "sawtooth";
    voct.connect(o1.detune);
    o1.start();
    var g1 = eurGain(0.35);
    o1.connect(g1);

    var src = ctx.createBufferSource();
    src.loop = true;
    src.buffer = bufSyncEur(1);
    var g2 = eurGain(0.35);
    src.connect(g2);
    src.start();
    /* le lecteur n'a pas d'entrée de hauteur : on le détune comme un
       oscillateur, ce que playbackRate ne permet pas, d'où le calcul direct */
    var mix = eurGain(0.5);
    g1.connect(mix); g2.connect(mix);

    m.maj = function(){
      var hz = base * Math.pow(2, (m.p.oct - 0.5) * 4) * Math.pow(2, (m.p.fin - 0.5) / 6);
      o1.frequency.value = hz;
      src.playbackRate.value = hz / 55;
      var r = 1 + m.p.rap * 7;                  /* de 1 à 8 tours */
      src.buffer = bufSyncEur(r);
      g1.gain.value = 0.35 * (1 - m.p.mix);
      g2.gain.value = 0.35 * m.p.mix;
    };
    m.maj();
    return {e:{voct:voct}, s:{o1:g1, o2:g2, mix:mix}};
  }},

ensemble: {nom:"ENSEMBLE", hp:92, res:"Seize oscillateurs accordés sur une gamme", fam:"osc",
  kns:[["oct","ROOT",0,1,0.4],["spread","SPREAD",0,1,0.4],["gamme","SCALE",0,1,0.3],
       ["bal","BALANCE",0,1,0.5],["det","DETUNE",0,1,0.2],["warp","WARP",0,1,0.3],
       ["stereo","STEREO",0,1,0.7]],
  jacks:[["voct","V/OCT",0],["a","OUT A",1],["b","OUT B",1]],
  creer:function(m){
    /* Seize oscillateurs, mais pas un accord plaqué : ils sont répartis sur les
       degrés d'une GAMME, et SPREAD décide combien on en monte. À zéro ils
       jouent tous la fondamentale — c'est un unisson épais ; à fond ils
       couvrent trois octaves de la gamme choisie.

       C'est la différence avec un simple désaccord : ici les hauteurs restent
       justes entre elles, quel que soit le réglage. */
    var N = 16, base = 55, voct = eurGain(1200);
    var GAMMES = [
      [0,4,7,12,16,19,24,28],            /* accord majeur */
      [0,3,7,10,12,15,19,22],            /* mineur septième */
      [0,2,4,7,9,12,14,16],              /* pentatonique */
      [0,7,12,19,24,31,36,43]            /* quintes : le plus ouvert */
    ];
    var a = eurGain(0.18), b = eurGain(0.18);
    var voix = [];
    for(var i=0;i<N;i++){
      var o = ctx.createOscillator();
      o.type = "sawtooth";
      voct.connect(o.detune);
      var g = eurGain(0.5);
      var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      o.connect(g);
      if(p){ g.connect(p); p.connect(a); p.connect(b); }
      else { g.connect(a); g.connect(b); }
      o.start();
      voix.push({o:o, g:g, p:p, i:i});
    }
    m.maj = function(){
      var hz = base * Math.pow(2, (m.p.oct - 0.5) * 4);
      var G = GAMMES[Math.min(3, Math.round(m.p.gamme * 3))];
      var haut = Math.max(1, Math.round(m.p.spread * (G.length - 1)));
      voix.forEach(function(v){
        var deg = G[Math.round((v.i / (N - 1)) * haut) % G.length];
        var oct = Math.floor(((v.i / (N - 1)) * haut) / G.length);
        var f = hz * Math.pow(2, (deg + oct * 12) / 12);
        /* le désaccord s'étale de part et d'autre : les voix paires montent,
           les impaires descendent, l'ensemble reste centré */
        f *= 1 + ((v.i % 2) ? -1 : 1) * m.p.det * 0.02 * (1 + v.i / N);
        v.o.frequency.value = f;
        v.o.type = m.p.warp > 0.66 ? "square" : (m.p.warp > 0.33 ? "sawtooth" : "triangle");
        /* BALANCE : au milieu tout le monde joue, aux extrêmes on ne garde
           qu'une moitié de l'essaim */
        var poids = (v.i % 2) ? m.p.bal : (1 - m.p.bal);
        v.g.gain.value = 0.18 + poids * 0.7;
        if(v.p) v.p.pan.value = ((v.i / (N - 1)) * 2 - 1) * m.p.stereo;
      });
    };
    m.maj();
    return {e:{voct:voct}, s:{a:a, b:b}};
  }},

piston: {nom:"PISTON HONDA", hp:76, res:"Table d'ondes à trois axes", fam:"osc",
  kns:[["oct","OCT",0,1,0.45],["x","X",0,1,0.3],["y","Y",0,1,0.4],["z","Z",0,1,0.2],["b","OSC B",0,1,0.35]],
  jacks:[["voct","V/OCT",0],["a","A",1],["b","B",1],["mix","MIX",1]],
  creer:function(m){
    /* Une table d'ondes à trois dimensions : X règle la pente des harmoniques,
       Y la balance entre rangs pairs et impairs, Z décale les partiels hors de
       l'harmonique — c'est lui qui fait sortir la table du domaine musical.
       Deux oscillateurs y puisent, B légèrement plus haut, et MIX les additionne. */
    var base = 55, N = 20;
    var voct = eurGain(1200);
    var oa = ctx.createOscillator(), ob = ctx.createOscillator();
    voct.connect(oa.detune); voct.connect(ob.detune);
    var ga = eurGain(0.4), gb = eurGain(0.4), mix = eurGain(0.5);
    oa.connect(ga); ob.connect(gb);
    ga.connect(mix); gb.connect(mix);
    oa.start(); ob.start();
    m.maj = function(){
      var re = new Float32Array(N + 1), im = new Float32Array(N + 1);
      var pente = 0.3 + m.p.x * 3;
      for(var h=1; h<=N; h++){
        var amp = Math.pow(h, -pente);
        amp *= (h % 2 === 0) ? m.p.y * 2 : (1 - m.p.y) * 2;
        /* Z déphase les rangs : l'onde perd sa symétrie sans changer de spectre */
        im[h] = amp * Math.sin(h * m.p.z * 3.1);
        re[h] = amp * Math.cos(h * m.p.z * 3.1);
      }
      try{
        var w = ctx.createPeriodicWave(re, im);
        oa.setPeriodicWave(w); ob.setPeriodicWave(w);
      }catch(e){}
      var hz = base * Math.pow(2, (m.p.oct - 0.5) * 4);
      oa.frequency.value = hz;
      ob.frequency.value = hz * (1 + (m.p.b - 0.5) * 0.04);   /* B bat contre A */
    };
    m.maj();
    return {e:{voct:voct}, s:{a:ga, b:gb, mix:mix}};
  }},

harmo: {nom:"HARMONIC", hp:64, res:"Banc de vingt-quatre harmoniques", fam:"osc",
  kns:[["oct","OCT",0,1,0.5],["tilt","TILT",0,1,0.45],["par","EVEN/ODD",0,1,0.5]],
  jacks:[["voct","V/OCT",0],["out","OUT",1]],
  creer:function(m){
    /* La synthèse additive, celle des orgues à tirettes et du Odessa : au lieu
       de partir d'une onde riche et de retirer au filtre, on empile les
       harmoniques une par une. TILT règle la pente de l'empilement — à plat
       c'est criard, en pente c'est presque un sinus. EVEN/ODD bascule entre
       les rangs pairs et impairs : tout à gauche on n'a que les impairs, et un
       carré ne contient rien d'autre — d'où la couleur de clarinette. */
    var base = 55, N = 24;
    var o = ctx.createOscillator(), voct = eurGain(1200);
    voct.connect(o.detune);
    o.start();
    var g = eurGain(0.5);
    o.connect(g);
    m.maj = function(){
      var re = new Float32Array(N + 1), im = new Float32Array(N + 1);
      var pente = 0.2 + m.p.tilt * 3.2;
      for(var h=1; h<=N; h++){
        var a = Math.pow(h, -pente);
        /* le curseur au milieu laisse les deux rangs à parts égales */
        a *= (h % 2 === 0) ? m.p.par * 2 : (1 - m.p.par) * 2;
        re[h] = a;
      }
      try{ o.setPeriodicWave(ctx.createPeriodicWave(re, im)); }catch(e){}
      o.frequency.value = base * Math.pow(2, (m.p.oct - 0.5) * 4);
    };
    m.maj();
    return {e:{voct:voct}, s:{out:g}};
  }},

subharm: {nom:"SUB HARM", hp:68, res:"Sous-harmoniques : divise au lieu de multiplier", fam:"osc",
  kns:[["oct","OCT",0,1,0.5],["d1","DIV 1",0,1,0.2],["d2","DIV 2",0,1,0.35],["mix","MIX",0,1,0.6]],
  jacks:[["voct","V/OCT",0],["out","OUT",1]],
  creer:function(m){
    /* Le principe du Trautonium et du Subharmonicon : sous une fondamentale on
       range des divisions entières, f/2, f/3, f/5… Ce sont des intervalles
       justes, mais pris à l'envers du monde — on descend au lieu de monter.
       Ça sonne juste sans jamais sonner comme un accord ordinaire. */
    var base = 55;
    var voct = eurGain(1200), som = eurGain(0.4);
    function osc(){
      var o = ctx.createOscillator();
      o.type = "sawtooth";
      voct.connect(o.detune);
      o.start();
      return o;
    }
    var f = osc(), s1 = osc(), s2 = osc();
    var gf = eurGain(0.5), g1 = eurGain(0), g2 = eurGain(0);
    f.connect(gf); s1.connect(g1); s2.connect(g2);
    [gf, g1, g2].forEach(function(x){ x.connect(som); });
    m.maj = function(){
      var hz = base * Math.pow(2, (m.p.oct - 0.5) * 4);
      var n1 = 1 + Math.round(m.p.d1 * 15), n2 = 1 + Math.round(m.p.d2 * 15);
      f.frequency.value = hz;
      s1.frequency.value = hz / n1;
      s2.frequency.value = hz / n2;
      gf.gain.value = 0.55 * (1 - m.p.mix * 0.6);
      g1.gain.value = 0.5 * m.p.mix;
      g2.gain.value = 0.5 * m.p.mix;
    };
    m.maj();
    return {e:{voct:voct}, s:{out:som}};
  }},

hoover: {nom:"HOOVER", hp:68, res:"La nappe qui plonge, des raves de 1991", fam:"osc",
  kns:[["oct","OCT",0,1,0.45],["sweep","SWEEP",0,1,0.5],["det","DETUNE",0,1,0.4]],
  jacks:[["voct","V/OCT",0],["trig","TRIG",0],["out","OUT",1]],
  creer:function(m){
    /* Le « hoover » de l'Alpha Juno : des dents désaccordées, une largeur
       d'impulsion qui bouge, et surtout une plongée de hauteur à chaque note.
       Trente ans plus tard on l'entend encore dans la hardtek. TRIG relance la
       plongée : sans lui, ce n'est qu'une nappe. */
    var base = 55, voct = eurGain(1200), som = eurGain(0.22);
    var oscs = [];
    [-0.06, -0.02, 0, 0.025, 0.07].forEach(function(dec){
      var o = ctx.createOscillator();
      o.type = "sawtooth";
      voct.connect(o.detune);
      o.connect(som); o.start();
      oscs.push({o:o, dec:dec});
    });
    /* un passe-bande large donne le creux caractéristique du timbre */
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = 900; bp.Q.value = 0.8;
    var sec = eurGain(0.5), out = eurGain(1);
    som.connect(bp); bp.connect(out); som.connect(sec); sec.connect(out);
    m.hz = base;
    m.maj = function(){
      m.hz = base * Math.pow(2, (m.p.oct - 0.5) * 4);
      oscs.forEach(function(x){
        x.o.frequency.value = m.hz * (1 + x.dec * m.p.det);
      });
    };
    m.maj();
    m.recevoir = function(t, entree){
      if(entree !== "trig") return null;
      var d = 0.08 + m.p.sweep * 0.5;
      oscs.forEach(function(x){
        var f = m.hz * (1 + x.dec * m.p.det);
        x.o.frequency.cancelScheduledValues(t);
        x.o.frequency.setValueAtTime(f * (1 + m.p.sweep * 0.9), t);
        x.o.frequency.exponentialRampToValueAtTime(Math.max(20, f), t + d);
      });
      bp.frequency.cancelScheduledValues(t);
      bp.frequency.setValueAtTime(2600, t);
      bp.frequency.exponentialRampToValueAtTime(700, t + d);
      return null;
    };
    return {e:{voct:voct, trig:eurGain(1)}, s:{out:out}};
  }},

noise: {nom:"NOISE", hp:44, sombre:true, res:"Bruit blanc et rose", fam:"osc",
  kns:[],
  jacks:[["blanc","WHITE",1],["rose","PINK",1]],
  creer:function(m){
    var b = eurBruit();
    var rose = ctx.createBiquadFilter();
    rose.type = "lowpass"; rose.frequency.value = 900;
    eurBruit().connect(rose);
    return {e:{}, s:{blanc:b, rose:rose}};
  }},

