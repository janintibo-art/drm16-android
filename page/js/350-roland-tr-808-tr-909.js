/* ===================== ROLAND TR-808 / TR-909 =====================
   Un seul moteur : le séquenceur, les motifs, les variations et l'interface sont
   communs ; chaque modèle apporte sa liste d'instruments et ses voix. */
var TR_TPQ = 4;

/* ---------- utilitaires de synthèse ---------- */
function trSortie(k){
  if(!TR.noeuds[k]){
    var g = ctx.createGain();
    g.connect(sortieRd6());
    TR.noeuds[k] = g;
  }
  return TR.noeuds[k];
}
/* La RD-6 passe par une distorsion et un réglage de timbre, les deux autres
   vont droit au maître. Le nœud est construit dans les deux cas : c'est le
   même chemin, avec ou sans effet. */
function sortieRd6(){
  if(!TR.bus){
    var e = ctx.createGain();
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass";
    var sec = ctx.createGain(), hum = ctx.createGain();
    var d = ctx.createWaveShaper();
    var n = 1024, c = new Float32Array(n);
    for(var i=0;i<n;i++){ var x = i * 2 / n - 1; c[i] = Math.tanh(x * 4); }
    d.curve = c; d.oversample = "2x";
    /* Une boîte à rythmes peut poser seize frappes sur le MÊME pas, et leurs
       attaques coïncident exactement. Les crêtes s'additionnent alors en
       amplitude : seize voix font seize fois la tension d'une seule, soit
       +24 dB. Le limiteur de sortie voyait donc un dépassement énorme, plongeait
       de quinze décibels, et remontait en quatre-vingt-dix millisecondes — d'où
       le son qui se coupe et revient dès qu'un motif se charge.

       La correction est commune à toutes les machines : voir attenuerVoie. */
    e.connect(lp);
    lp.connect(sec); sec.connect(busSet("tr") || master);
    lp.connect(d); d.connect(hum); hum.connect(busSet("tr") || master);
    TR.bus = {e:e, lp:lp, sec:sec, hum:hum};
    majBusTr();
  }
  return TR.bus.e;
}
function majBusTr(){
  if(!TR.bus) return;
  var rd = (TR.m === "rd6");
  TR.bus.lp.frequency.value = rd ? (300 * Math.pow(60, TR.tone)) : 20000;
  var d = (rd && TR.dist) ? TR.drive : 0;
  TR.bus.sec.gain.value = 1 - d * 0.8;
  TR.bus.hum.gain.value = d * 0.85;
}
function trEnv(g, t, pic, dec, atk){
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(pic, t + (atk || 0.002));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
}
function trBruit(t, dur){
  var s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.playbackRate.value = 0.9 + Math.random()*0.2;
  s.start(t); s.stop(t + dur + 0.02);
  return s;
}
var TR_METAL = [1, 1.342, 1.2312, 1.6532, 1.9523, 2.1523];
/* Le banc métallique des charleys et cymbales : six carrés à des rapports qui
   ne tombent sur aucun harmonique. Six OscillatorNode par frappe, c'est ce qui
   faisait décrocher le moteur sur un motif dense — un réglage CR-5000 avec
   charley aux doubles-croches, cymbale et charley ouvert en crée soixante-douze
   par seconde, et un carré à bande limitée coûte cher.

   On rend le banc une fois pour toutes dans un tampon, en additif : même
   contenu, même niveau (RMS mesuré à 2,41 contre 2,45 pour six carrés), mais
   une seule source par frappe au lieu de six. La hauteur se retrouve en jouant
   le tampon plus ou moins vite, et un départ pris au hasard dans le tampon rend
   la variation d'une frappe à l'autre que donnaient les oscillateurs libres. */
var METAL_BASE = 880, METAL_DUREE = 2;
var metalBuf = null;
function construireMetal(){
  var n = Math.floor(ctx.sampleRate * METAL_DUREE);
  var b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  var k = 4 / Math.PI;
  TR_METAL.forEach(function(r){
    var f = METAL_BASE * r;
    /* Treize harmoniques : au-delà on gagne moins d'un demi-décibel au-dessus
       de 8,2 kHz, la seule bande que le passe-haut du charley laisse passer. */
    for(var h=1; h<=13; h+=2){
      var fh = f * h;
      if(fh > ctx.sampleRate * 0.45) break;
      var a = k / h, w = 2 * Math.PI * fh / ctx.sampleRate;
      /* On fait tourner un vecteur au lieu d'appeler Math.sin à chaque
         échantillon : deux fois plus rapide, pour un écart de 5·10⁻⁷. */
      var cw = Math.cos(w), sw = Math.sin(w), cr = 1, ci = 0, nr;
      for(var i=0;i<n;i++){
        d[i] += a * ci;
        nr = cr * cw - ci * sw; ci = cr * sw + ci * cw; cr = nr;
      }
    }
  });
  metalBuf = b;
}
function trMetal(t, dur, base, gain){
  var som = ctx.createGain();
  som.gain.value = gain === undefined ? 0.38 : gain;
  if(!metalBuf) construireMetal();
  var s = ctx.createBufferSource();
  s.buffer = metalBuf;
  s.playbackRate.value = base / METAL_BASE;
  s.loop = true;
  s.connect(som);
  /* départ au hasard dans les quatre premiers dixièmes : la suite du tampon
     couvre largement la plus longue cymbale, on ne boucle jamais en pratique */
  s.start(t, Math.random() * 0.4);
  s.stop(t + dur + 0.02);
  return som;
}

/* ---------- TR-808 : tout est analogique ---------- */
var TR808_INSTR = [
  {id:"AC", nom:"ACCENT",    grp:"TOTAL ACCENT", kns:[["niv","LEVEL"]]},
  {id:"BD", nom:"BASS DRUM", grp:"BASS DRUM",    kns:[["niv","LEVEL"],["ton","TONE"],["dec","DECAY"]]},
  {id:"SD", nom:"SNARE",     grp:"SNARE DRUM",   kns:[["niv","LEVEL"],["ton","TONE"],["snap","SNAPPY"]]},
  {id:"LT", nom:"LOW TOM",   grp:"LOW TOM/CONGA",kns:[["niv","LEVEL"],["acc","TUNING"]]},
  {id:"MT", nom:"MID TOM",   grp:"MID TOM/CONGA",kns:[["niv","LEVEL"],["acc","TUNING"]]},
  {id:"HT", nom:"HI TOM",    grp:"HI TOM/CONGA", kns:[["niv","LEVEL"],["acc","TUNING"]]},
  {id:"RS", nom:"RIM SHOT",  grp:"RIM/CLAVES",   kns:[["niv","LEVEL"]]},
  {id:"CP", nom:"HAND CLAP", grp:"CLAP/MARACAS", kns:[["niv","LEVEL"]]},
  {id:"CB", nom:"COWBELL",   grp:"COWBELL",      kns:[["niv","LEVEL"]]},
  {id:"CY", nom:"CYMBAL",    grp:"CYMBAL",       kns:[["niv","LEVEL"],["ton","TONE"],["dec","DECAY"]]},
  {id:"OH", nom:"OPEN HAT",  grp:"HI HAT",       kns:[["niv","LEVEL"],["dec","OH DECAY"]]},
  {id:"CH", nom:"CLOSED HAT",grp:"",             kns:[["niv","LEVEL"],["dec","CH DECAY"]]}
];
var TR808_MIDI = [0, 36, 38, 41, 45, 48, 37, 39, 56, 49, 46, 42];
function voix808(t, k, acc){
  var s = TR.pat.son[k], id = TR808_INSTR[k].id;
  var dest = trSortie(k);
  var niv = mv("niv", s.niv) * (acc ? 1 : 0.62) * (0.35 + TR.pat.son[0].niv * 0.9);
  var g = ctx.createGain();
  g.connect(pasVoie(dest));
  dest.gain.setValueAtTime(1, t);

  if(id === "BD"){
    var dec = 0.09 + s.dec * 1.1;
    var o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(48 * 4.2, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.045);
    trEnv(g, t, niv * 1.05, dec, 0.002);
    o.connect(g); o.start(t); o.stop(t + dec + 0.05);
    var cl = ctx.createGain();
    var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1200;
    var n = trBruit(t, 0.02);
    trEnv(cl, t, niv * s.ton * 0.6, 0.02, 0.001);
    n.connect(hp); hp.connect(cl); cl.connect(pasVoie(dest));
  }
  else if(id === "SD"){
    var dur = 0.12 + s.snap * 0.1;
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = "triangle"; o2.type = "triangle";
    o1.frequency.value = 175 + s.ton * 90;
    o2.frequency.value = 330 + s.ton * 120;
    var gc = ctx.createGain();
    trEnv(gc, t, niv * 0.55, 0.1, 0.001);
    o1.connect(gc); o2.connect(gc); gc.connect(pasVoie(dest));
    o1.start(t); o2.start(t); o1.stop(t + 0.15); o2.stop(t + 0.15);
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = 1800 + s.ton * 1400; bp.Q.value = 0.8;
    var nb = trBruit(t, dur);
    trEnv(g, t, niv * (0.4 + s.snap * 1.2), dur, 0.001);
    nb.connect(bp); bp.connect(g);
  }
  else if(id === "LT" || id === "MT" || id === "HT"){
    var base = {LT:80, MT:120, HT:175}[id];
    var f = base * Math.pow(2, (s.acc - 0.5) * 1.2);
    var dt = 0.35 + (1 - s.acc) * 0.25;
    var ot = ctx.createOscillator(); ot.type = "sine";
    ot.frequency.setValueAtTime(f * 2.1, t);
    ot.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    trEnv(g, t, niv * 1.2, dt, 0.002);
    ot.connect(g); ot.start(t); ot.stop(t + dt + 0.05);
    var nc = trBruit(t, 0.012);
    var gc2 = ctx.createGain();
    trEnv(gc2, t, niv * 0.18, 0.012, 0.001);
    nc.connect(gc2); gc2.connect(pasVoie(dest));
  }
  else if(id === "RS"){
    var orf = ctx.createOscillator(); orf.type = "triangle"; orf.frequency.value = 1700;
    var bpr = ctx.createBiquadFilter(); bpr.type = "bandpass";
    bpr.frequency.value = 1700; bpr.Q.value = 4;
    var nr = trBruit(t, 0.03);
    trEnv(g, t, niv * 0.9, 0.032, 0.0008);
    orf.connect(g); nr.connect(bpr); bpr.connect(g);
    orf.start(t); orf.stop(t + 0.05);
  }
  else if(id === "CP"){
    var bpc = ctx.createBiquadFilter(); bpc.type = "bandpass";
    bpc.frequency.value = 1000; bpc.Q.value = 1.2;
    var nc2 = trBruit(t, 0.35);
    nc2.connect(bpc); bpc.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.0105, 0.021].forEach(function(o2){
      g.gain.setValueAtTime(niv * 1.7, t + o2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o2 + 0.009);
    });
    g.gain.setValueAtTime(niv * 1.3, t + 0.031);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.31);
  }
  else if(id === "CB"){
    var som = ctx.createGain(); som.gain.value = 0.4;
    [540, 800].forEach(function(f2){
      var oc = ctx.createOscillator(); oc.type = "square"; oc.frequency.value = f2;
      oc.connect(som); oc.start(t); oc.stop(t + 0.45);
    });
    var bpb = ctx.createBiquadFilter(); bpb.type = "bandpass";
    bpb.frequency.value = 2640; bpb.Q.value = 1.1;
    trEnv(g, t, niv * 1.5, 0.35, 0.001);
    som.connect(bpb); bpb.connect(g);
  }
  else if(id === "CY" || id === "OH" || id === "CH"){
    var long = (id === "CY") ? (0.7 + s.dec * 1.6)
             : (id === "OH") ? (0.12 + s.dec * 0.7)
             : (0.02 + s.dec * 0.09);
    var m = trMetal(t, long, id === "CY" ? 300 : 800);
    var hpm = ctx.createBiquadFilter(); hpm.type = "highpass";
    hpm.frequency.value = (id === "CY") ? (2500 + s.ton * 5000) : 7500;
    var bpm2 = ctx.createBiquadFilter(); bpm2.type = "bandpass";
    bpm2.frequency.value = (id === "CY") ? (4000 + s.ton * 3000) : 10000;
    bpm2.Q.value = 0.6;
    trEnv(g, t, niv * (id === "CH" ? 1.5 : 1.2), long, 0.001);
    m.connect(hpm); hpm.connect(bpm2); bpm2.connect(g);
    if(id === "CH" && TR.ohGain){
      try{ TR.ohGain.gain.cancelScheduledValues(t);
           TR.ohGain.gain.setTargetAtTime(0.0001, t, 0.004); }catch(e){}
    }
    if(id === "OH") TR.ohGain = g;
  }
}

/* ---------- TR-909 : peaux analogiques, métaux échantillonnés ---------- */
var TR909_INSTR = [
  {id:"AC", nom:"ACCENT",    grp:"TOTAL ACCENT", kns:[["niv","LEVEL"]]},
  {id:"BD", nom:"BASS DRUM", grp:"BASS DRUM",    kns:[["niv","LEVEL"],["acc","TUNE"],["ton","ATTACK"],["dec","DECAY"]]},
  {id:"SD", nom:"SNARE",     grp:"SNARE DRUM",   kns:[["niv","LEVEL"],["acc","TUNE"],["ton","TONE"],["snap","SNAPPY"]]},
  {id:"LT", nom:"LOW TOM",   grp:"LOW TOM",      kns:[["niv","LEVEL"],["acc","TUNE"],["dec","DECAY"]]},
  {id:"MT", nom:"MID TOM",   grp:"MID TOM",      kns:[["niv","LEVEL"],["acc","TUNE"],["dec","DECAY"]]},
  {id:"HT", nom:"HI TOM",    grp:"HI TOM",       kns:[["niv","LEVEL"],["acc","TUNE"],["dec","DECAY"]]},
  {id:"RS", nom:"RIM SHOT",  grp:"RIM SHOT",     kns:[["niv","LEVEL"]]},
  {id:"CP", nom:"HAND CLAP", grp:"HAND CLAP",    kns:[["niv","LEVEL"]]},
  {id:"CH", nom:"CLOSED HAT",grp:"HI HAT",       kns:[["niv","LEVEL"],["dec","CH DECAY"]]},
  {id:"OH", nom:"OPEN HAT",  grp:"",             kns:[["dec","OH DECAY"]]},
  {id:"CR", nom:"CRASH",     grp:"CYMBAL",       kns:[["niv","LEVEL"],["acc","CRASH TUNE"]]},
  {id:"RD", nom:"RIDE",      grp:"",             kns:[["niv","RIDE LEVEL"],["ton","RIDE TUNE"]]}
];
var TR909_MIDI = [0, 36, 38, 41, 45, 48, 37, 39, 42, 46, 49, 51];
function voix909(t, k, acc){
  var s = TR.pat.son[k], id = TR909_INSTR[k].id;
  var dest = trSortie(k);
  var niv = mv("niv", s.niv) * (acc ? 1 : 0.6) * (0.35 + TR.pat.son[0].niv * 0.9);
  var g = ctx.createGain();
  g.connect(pasVoie(dest));
  dest.gain.setValueAtTime(1, t);

  if(id === "BD"){
    /* plus serrée et plus claquante que la 808 : l'attaque est un bouton à part */
    var f0 = 44 + s.acc * 34;
    var dec = 0.12 + s.dec * 0.75;
    var o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(f0 * 5.5, t);
    o.frequency.exponentialRampToValueAtTime(f0, t + 0.028);
    trEnv(g, t, niv * 1.15, dec, 0.001);
    o.connect(g); o.start(t); o.stop(t + dec + 0.05);
    var cl = ctx.createGain();
    var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2200;
    var n = trBruit(t, 0.015);
    trEnv(cl, t, niv * (0.15 + s.ton * 1.1), 0.012, 0.0006);
    n.connect(hp); hp.connect(cl); cl.connect(pasVoie(dest));
  }
  else if(id === "SD"){
    var f1 = (185 + s.acc * 120);
    var dur = 0.09 + s.snap * 0.14;
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = "triangle"; o2.type = "triangle";
    o1.frequency.value = f1; o2.frequency.value = f1 * 1.9;
    var gc = ctx.createGain();
    trEnv(gc, t, niv * 0.5, 0.07, 0.0008);
    o1.connect(gc); o2.connect(gc); gc.connect(pasVoie(dest));
    o1.start(t); o2.start(t); o1.stop(t + 0.12); o2.stop(t + 0.12);
    var hp2 = ctx.createBiquadFilter(); hp2.type = "highpass";
    hp2.frequency.value = 1200 + s.ton * 3500;
    var nb = trBruit(t, dur);
    trEnv(g, t, niv * (0.35 + s.snap * 0.95), dur, 0.0008);
    nb.connect(hp2); hp2.connect(g);
  }
  else if(id === "LT" || id === "MT" || id === "HT"){
    var base = {LT:75, MT:105, HT:150}[id];
    var f = base * Math.pow(2, (s.acc - 0.5) * 1.4);
    var dt = 0.2 + s.dec * 0.85;
    var ot = ctx.createOscillator(); ot.type = "sine";
    ot.frequency.setValueAtTime(f * 2.6, t);
    ot.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    trEnv(g, t, niv * 1.1, dt, 0.0015);
    ot.connect(g); ot.start(t); ot.stop(t + dt + 0.05);
    /* la 909 a des toms bruités, pas seulement sinus */
    var nb2 = trBruit(t, dt * 0.6);
    var bp3 = ctx.createBiquadFilter(); bp3.type = "bandpass";
    bp3.frequency.value = f * 3; bp3.Q.value = 1.4;
    var gn = ctx.createGain();
    trEnv(gn, t, niv * 0.28, dt * 0.6, 0.001);
    nb2.connect(bp3); bp3.connect(gn); gn.connect(pasVoie(dest));
  }
  else if(id === "RS"){
    var orf = ctx.createOscillator(); orf.type = "square"; orf.frequency.value = 420;
    var bpr = ctx.createBiquadFilter(); bpr.type = "bandpass";
    bpr.frequency.value = 2200; bpr.Q.value = 3;
    var nr = trBruit(t, 0.025);
    trEnv(g, t, niv * 1.1, 0.026, 0.0006);
    orf.connect(g); nr.connect(bpr); bpr.connect(g);
    orf.start(t); orf.stop(t + 0.04);
  }
  else if(id === "CP"){
    var bpc = ctx.createBiquadFilter(); bpc.type = "bandpass";
    bpc.frequency.value = 1400; bpc.Q.value = 1.6;
    var nc2 = trBruit(t, 0.3);
    nc2.connect(bpc); bpc.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.008, 0.016, 0.024].forEach(function(o2){
      g.gain.setValueAtTime(niv * 1.6, t + o2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o2 + 0.007);
    });
    g.gain.setValueAtTime(niv * 1.1, t + 0.033);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  }
  else {
    /* métaux : bruit et grappe métallique, réduits à six bits comme les échantillons d'origine */
    var kn = TR.pat.son, dec909, base909, hpf;
    if(id === "CH"){ dec909 = 0.025 + kn[8].dec * 0.1; base909 = 900; hpf = 8000; }
    else if(id === "OH"){ dec909 = 0.15 + kn[9].dec * 0.85; base909 = 900; hpf = 7500; }
    else if(id === "CR"){ dec909 = 1.4 + s.acc * 1.4; base909 = 320 * (0.7 + s.acc * 0.8); hpf = 3200; }
    else { dec909 = 0.6 + s.ton * 1.0; base909 = 520 * (0.7 + s.ton * 0.8); hpf = 4200; }
    var m = trMetal(t, dec909, base909, 0.3);
    var nm = trBruit(t, dec909);
    var gn2 = ctx.createGain(); gn2.gain.value = (id === "CR" || id === "RD") ? 0.5 : 0.25;
    nm.connect(gn2);
    var som2 = ctx.createGain(); som2.gain.value = 1;
    m.connect(som2); gn2.connect(som2);
    var bits = ctx.createWaveShaper();
    bits.curve = courbeBits(6);                 /* le grain six bits de la 909 */
    var hp3 = ctx.createBiquadFilter(); hp3.type = "highpass"; hp3.frequency.value = hpf;
    var niv2 = (id === "OH") ? mv("niv", kn[8].niv) * (acc ? 1 : 0.6) * (0.35 + kn[0].niv * 0.9) : niv;
    trEnv(g, t, niv2 * 1.1, dec909, 0.0008);
    som2.connect(bits); bits.connect(hp3); hp3.connect(g);
    if(id === "CH" && TR.ohGain){
      try{ TR.ohGain.gain.cancelScheduledValues(t);
           TR.ohGain.gain.setTargetAtTime(0.0001, t, 0.004); }catch(e){}
    }
    if(id === "OH") TR.ohGain = g;
  }
}

/* ---------- TR-707 : tout est échantillonné, douze bits ---------- */
var TR707_INSTR = [
  {id:"AC", nom:"ACCENT",    grp:"ACCENT",    kns:[["niv","LEVEL"]]},
  {id:"B1", nom:"BASS DRUM 1",grp:"BASS DRUM",kns:[["niv","LEVEL"]]},
  {id:"B2", nom:"BASS DRUM 2",grp:"",         kns:[["niv","LEVEL"]]},
  {id:"S1", nom:"SNARE 1",   grp:"SNARE DRUM",kns:[["niv","LEVEL"]]},
  {id:"S2", nom:"SNARE 2",   grp:"",          kns:[["niv","LEVEL"]]},
  {id:"LT", nom:"LOW TOM",   grp:"TOMS",      kns:[["niv","LEVEL"]]},
  {id:"MT", nom:"MID TOM",   grp:"",          kns:[["niv","LEVEL"]]},
  {id:"HT", nom:"HI TOM",    grp:"",          kns:[["niv","LEVEL"]]},
  {id:"RS", nom:"RIM SHOT",  grp:"RIM/COWBELL",kns:[["niv","LEVEL"]]},
  {id:"CB", nom:"COWBELL",   grp:"",          kns:[["niv","LEVEL"]]},
  {id:"CP", nom:"HAND CLAP", grp:"CLAP/TAMB", kns:[["niv","LEVEL"]]},
  {id:"TB", nom:"TAMBOURINE",grp:"",          kns:[["niv","LEVEL"]]},
  {id:"CH", nom:"CLOSED HH", grp:"HI HAT",    kns:[["niv","LEVEL"]]},
  {id:"OH", nom:"OPEN HH",   grp:"",          kns:[["niv","LEVEL"]]},
  {id:"CR", nom:"CRASH",     grp:"CYMBALS",   kns:[["niv","LEVEL"]]},
  {id:"RD", nom:"RIDE",      grp:"",          kns:[["niv","LEVEL"]]}
];
var TR707_MIDI = [0, 36, 35, 38, 40, 41, 45, 48, 37, 56, 39, 54, 42, 46, 49, 51];
/* la couleur de la 707 vient de ses échantillons courts en douze bits, filtrés
   par le convertisseur de 1985 : on passe donc chaque voix par le même goulot */
function pcm707(t, dur){
  var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 9500;
  var bits = ctx.createWaveShaper(); bits.curve = courbeBits(12);
  lp.connect(bits);
  return {entree:lp, sortie:bits};
}
function voix707(t, k, acc){
  var s = TR.pat.son[k], id = TR707_INSTR[k].id;
  var dest = trSortie(k);
  var niv = mv("niv", s.niv) * (acc ? 1 : 0.6) * (0.35 + TR.pat.son[0].niv * 0.9);
  var g = ctx.createGain();
  var ch = pcm707(t);
  ch.sortie.connect(g);
  g.connect(pasVoie(dest));
  dest.gain.setValueAtTime(1, t);
  var e = ch.entree;

  if(id === "B1" || id === "B2"){
    var f0 = (id === "B1") ? 52 : 44;
    var dec = (id === "B1") ? 0.22 : 0.34;
    var o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(f0 * 3.4, t);
    o.frequency.exponentialRampToValueAtTime(f0, t + 0.035);
    trEnv(g, t, niv * 1.15, dec, 0.001);
    o.connect(e); o.start(t); o.stop(t + dec + 0.05);
    var nk = trBruit(t, 0.012), gk = ctx.createGain();
    var hk = ctx.createBiquadFilter(); hk.type = "highpass"; hk.frequency.value = 1800;
    trEnv(gk, t, niv * 0.5, 0.011, 0.0006);
    nk.connect(hk); hk.connect(gk); gk.connect(pasVoie(dest));
  }
  else if(id === "S1" || id === "S2"){
    var dur = (id === "S1") ? 0.13 : 0.19;
    var ft = (id === "S1") ? 210 : 180;
    var o1 = ctx.createOscillator(); o1.type = "triangle"; o1.frequency.value = ft;
    var o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = ft * 1.85;
    var gt = ctx.createGain();
    trEnv(gt, t, niv * 0.45, 0.07, 0.0008);
    o1.connect(gt); o2.connect(gt); gt.connect(e);
    o1.start(t); o2.start(t); o1.stop(t + 0.12); o2.stop(t + 0.12);
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = (id === "S1") ? 2400 : 1700; bp.Q.value = 0.7;
    var nb = trBruit(t, dur);
    trEnv(g, t, niv * 1.1, dur, 0.0008);
    nb.connect(bp); bp.connect(e);
  }
  else if(id === "LT" || id === "MT" || id === "HT"){
    var base = {LT:85, MT:125, HT:175}[id];
    var dt = 0.3;
    var ot = ctx.createOscillator(); ot.type = "sine";
    ot.frequency.setValueAtTime(base * 1.9, t);
    ot.frequency.exponentialRampToValueAtTime(base, t + 0.05);
    trEnv(g, t, niv * 1.1, dt, 0.0015);
    ot.connect(e); ot.start(t); ot.stop(t + dt + 0.05);
    var nt = trBruit(t, 0.09), gnt = ctx.createGain();
    var bpt = ctx.createBiquadFilter(); bpt.type = "bandpass";
    bpt.frequency.value = base * 4; bpt.Q.value = 1.2;
    trEnv(gnt, t, niv * 0.3, 0.085, 0.001);
    nt.connect(bpt); bpt.connect(gnt); gnt.connect(e);
  }
  else if(id === "RS"){
    var orf = ctx.createOscillator(); orf.type = "square"; orf.frequency.value = 500;
    var bpr = ctx.createBiquadFilter(); bpr.type = "bandpass";
    bpr.frequency.value = 2000; bpr.Q.value = 3.5;
    var nr = trBruit(t, 0.022);
    trEnv(g, t, niv * 1.1, 0.024, 0.0006);
    orf.connect(e); nr.connect(bpr); bpr.connect(e);
    orf.start(t); orf.stop(t + 0.04);
  }
  else if(id === "CB"){
    var som = ctx.createGain(); som.gain.value = 0.4;
    [560, 840].forEach(function(f2){
      var oc = ctx.createOscillator(); oc.type = "square"; oc.frequency.value = f2;
      oc.connect(som); oc.start(t); oc.stop(t + 0.3);
    });
    var bpb = ctx.createBiquadFilter(); bpb.type = "bandpass";
    bpb.frequency.value = 2700; bpb.Q.value = 1.3;
    trEnv(g, t, niv * 1.4, 0.24, 0.001);
    som.connect(bpb); bpb.connect(e);
  }
  else if(id === "CP"){
    var bpc = ctx.createBiquadFilter(); bpc.type = "bandpass";
    bpc.frequency.value = 1200; bpc.Q.value = 1.4;
    var nc2 = trBruit(t, 0.26);
    nc2.connect(bpc); bpc.connect(e);
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.009, 0.018].forEach(function(o2){
      g.gain.setValueAtTime(niv * 1.6, t + o2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o2 + 0.008);
    });
    g.gain.setValueAtTime(niv * 1.1, t + 0.027);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  }
  else if(id === "TB"){
    var mt2 = trMetal(t, 0.2, 1400, 0.16);
    var nt2 = trBruit(t, 0.2), gt2 = ctx.createGain(); gt2.gain.value = 0.5;
    var hpt = ctx.createBiquadFilter(); hpt.type = "highpass"; hpt.frequency.value = 5500;
    nt2.connect(gt2);
    trEnv(g, t, niv * 1.2, 0.18, 0.0008);
    mt2.connect(hpt); gt2.connect(hpt); hpt.connect(e);
  }
  else {
    var dec707 = {CH:0.055, OH:0.42, CR:1.5, RD:0.9}[id];
    var base707 = {CH:900, OH:900, CR:340, RD:560}[id];
    var hpf = {CH:8200, OH:7600, CR:3400, RD:4600}[id];
    var m = trMetal(t, dec707, base707, 0.3);
    var nm = trBruit(t, dec707), gn = ctx.createGain();
    gn.gain.value = (id === "CR" || id === "RD") ? 0.45 : 0.3;
    nm.connect(gn);
    var hp3 = ctx.createBiquadFilter(); hp3.type = "highpass"; hp3.frequency.value = hpf;
    trEnv(g, t, niv * 1.15, dec707, 0.0008);
    m.connect(hp3); gn.connect(hp3); hp3.connect(e);
    if(id === "CH" && TR.ohGain){
      try{ TR.ohGain.gain.cancelScheduledValues(t);
           TR.ohGain.gain.setTargetAtTime(0.0001, t, 0.004); }catch(e2){}
    }
    if(id === "OH") TR.ohGain = g;
  }
}
function TR707_USINE(n){
  if(n === 0) return {1:"x.......x.......", 3:"....x.......x...", 12:"x.x.x.x.x.x.x.x.", 0:"x.......x......."};
  if(n === 1) return {1:"x..x..x...x.....", 3:"....x.......x...", 12:"xxxxxxxxxxxxxxxx",
                      13:"..........x.....", 11:"..x...x...x...x."};
  if(n === 2) return {2:"x.......x.......", 4:"....x.......x...", 15:"x.x.x.x.x.x.x.x.",
                      9:"....x.......x...", 0:"x...x...x...x..."};
  return {};
}

/* ---------- Behringer RD-6 : la 606 remise en circuit ----------
   Huit voix analogiques et un seul potard par instrument, son niveau : c'est
   tout ce qu'avait la TR-606, et la RD-6 n'en ajoute pas. Ce qu'elle ajoute,
   c'est une distorsion, un réglage de timbre général, et un clap emprunté à
   la BR-110 qui prend la place de la cymbale. */
var RD6_INSTR = [
  {id:"AC", nom:"ACCENT",    grp:"ACCENT",      kns:[["niv","LEVEL"]]},
  {id:"BD", nom:"BASS DRUM", grp:"BASS DRUM",   kns:[["niv","LEVEL"]]},
  {id:"SD", nom:"SNARE",     grp:"SNARE DRUM",  kns:[["niv","LEVEL"]]},
  {id:"LT", nom:"LOW TOM",   grp:"L.H. TOM",    kns:[["niv","LEVEL"]]},
  {id:"HT", nom:"HI TOM",    grp:"",            kns:[["niv","LEVEL"]]},
  {id:"CY", nom:"CYM / CLAP",grp:"CYMBAL/CLAP", kns:[["niv","LEVEL"]]},
  {id:"OH", nom:"OPEN HAT",  grp:"O.C. HI HAT", kns:[["niv","LEVEL"]]},
  {id:"CH", nom:"CLOSED HAT",grp:"",            kns:[["niv","LEVEL"]]}
];
var RD6_MIDI = [0, 36, 38, 43, 50, 49, 46, 42];
function voix606(t, k, acc){
  var s = TR.pat.son[k], id = RD6_INSTR[k].id;
  var dest = trSortie(k);
  var niv = mv("niv", s.niv) * (acc ? 1 : 0.6) * (0.35 + TR.pat.son[0].niv * 0.9);
  var g = ctx.createGain();
  g.connect(pasVoie(dest));
  dest.gain.setValueAtTime(1, t);

  if(id === "BD"){
    /* la 606 frappe court et sec : la chute de hauteur est plus rapide que sur la 808 */
    var o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(54, t + 0.022);
    trEnv(g, t, niv * 1.15, 0.24, 0.001);
    o.connect(g); o.start(t); o.stop(t + 0.3);
    var nk = trBruit(t, 0.01), gk = ctx.createGain();
    var hk = ctx.createBiquadFilter(); hk.type = "highpass"; hk.frequency.value = 2000;
    trEnv(gk, t, niv * 0.35, 0.009, 0.0005);
    nk.connect(hk); hk.connect(gk); gk.connect(pasVoie(dest));
  }
  else if(id === "SD"){
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = 2400; bp.Q.value = 0.8;
    var nb = trBruit(t, 0.1);
    trEnv(g, t, niv * 1.2, 0.1, 0.0008);
    nb.connect(bp); bp.connect(g);
    var o1 = ctx.createOscillator(); o1.type = "triangle"; o1.frequency.value = 238;
    var o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = 476;
    var gc = ctx.createGain();
    trEnv(gc, t, niv * 0.4, 0.05, 0.0008);
    o1.connect(gc); o2.connect(gc); gc.connect(pasVoie(dest));
    o1.start(t); o2.start(t); o1.stop(t + 0.08); o2.stop(t + 0.08);
  }
  else if(id === "LT" || id === "HT"){
    var base = (id === "LT") ? 105 : 165;
    var ot = ctx.createOscillator(); ot.type = "sine";
    ot.frequency.setValueAtTime(base * 1.8, t);
    ot.frequency.exponentialRampToValueAtTime(base, t + 0.04);
    trEnv(g, t, niv * 1.1, 0.22, 0.0015);
    ot.connect(g); ot.start(t); ot.stop(t + 0.3);
  }
  else if(id === "CY"){
    if(TR.clap){                               /* le clap de la BR-110 */
      var bc = ctx.createBiquadFilter(); bc.type = "bandpass";
      bc.frequency.value = 1150; bc.Q.value = 1.5;
      var nc = trBruit(t, 0.3);
      nc.connect(bc); bc.connect(g);
      g.gain.setValueAtTime(0.0001, t);
      [0, 0.009, 0.018].forEach(function(o3){
        g.gain.setValueAtTime(niv * 1.7, t + o3);
        g.gain.exponentialRampToValueAtTime(0.0001, t + o3 + 0.008);
      });
      g.gain.setValueAtTime(niv * 1.2, t + 0.028);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    } else {
      var m = trMetal(t, 1.1, 340, 0.36);
      var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 4200;
      trEnv(g, t, niv * 1.1, 1.1, 0.001);
      m.connect(hp); hp.connect(g);
    }
  }
  else {                                       /* charleys : la 606 les fait très brillants */
    var dh = (id === "CH") ? 0.045 : 0.32;
    var mh = trMetal(t, dh, 1000, 0.4);
    var hh = ctx.createBiquadFilter(); hh.type = "highpass"; hh.frequency.value = 9000;
    trEnv(g, t, niv * (id === "CH" ? 2.1 : 1.6), dh, 0.0008);
    mh.connect(hh); hh.connect(g);
    if(id === "CH" && TR.ohGain){
      try{ TR.ohGain.gain.cancelScheduledValues(t);
           TR.ohGain.gain.setTargetAtTime(0.0001, t, 0.004); }catch(e){}
    }
    if(id === "OH") TR.ohGain = g;
  }
}
function RD6_USINE(n){
  if(n === 0) return {1:"x.......x.......", 2:"....x.......x...", 7:"x.x.x.x.x.x.x.x.", 0:"x.......x......."};
  if(n === 1) return {1:"x..x..x...x.....", 2:"....x.......x...", 7:"xxxxxxxxxxxxxxxx",
                      6:"..........x.....", 5:"............x..."};
  if(n === 2) return {1:"x...x...x...x...", 2:"....x.......x...", 7:"x.x.x.x.x.x.x.x.",
                      3:"..........x.x...", 0:"x...x...x...x..."};
  return {};
}

/* ---------- descripteurs ---------- */
var TR_MODELES = {
  tr808: {nom:"TR-808", sous:"RHYTHM COMPOSER", instr:TR808_INSTR, voix:voix808, midi:TR808_MIDI,
          usine:function(n){ return TR808_USINE(n); }},
  tr909: {nom:"TR-909", sous:"RHYTHM COMPOSER", instr:TR909_INSTR, voix:voix909, midi:TR909_MIDI,
          usine:function(n){ return TR909_USINE(n); }},
  tr707: {nom:"TR-707", sous:"RHYTHM COMPOSER", instr:TR707_INSTR, voix:voix707, midi:TR707_MIDI,
          usine:function(n){ return TR707_USINE(n); }},
  rd6:   {nom:"RD-6", sous:"ANALOG DRUM MACHINE", instr:RD6_INSTR, voix:voix606, midi:RD6_MIDI,
          usine:function(n){ return RD6_USINE(n); }, marque:"Behringer"}
};
function TR808_USINE(n){
  if(n === 0) return {1:"x.......x.......", 2:"....x.......x...", 11:"x.x.x.x.x.x.x.x.", 0:"x.......x......."};
  if(n === 1) return {1:"x.....x...x.....", 2:"....x.......x...", 11:"xxxxxxxxxxxxxxxx",
                      10:"..........x.....", 7:"....x.......x..."};
  if(n === 2) return {1:"x..x..x...x.x...", 2:"....x.......x...", 8:"..x...x...x...x.", 9:"x..............."};
  return {};
}
function TR909_USINE(n){
  if(n === 0) return {1:"x.......x.......", 2:"....x.......x...", 8:"x.x.x.x.x.x.x.x.", 0:"x.......x......."};
  if(n === 1) return {1:"x...x...x...x...", 2:"....x.......x...", 8:"xxxxxxxxxxxxxxxx",
                      9:"..............x.", 0:"....x.......x..."};
  if(n === 2) return {1:"x.....x.x.......", 2:"....x.......x...", 7:"....x.......x...",
                      9:"..x...x...x...x.", 10:"x..............."};
  return {};
}
function sonTr(k){
  var d = {niv:0.8, ton:0.5, dec:0.5, snap:0.5, acc:0.5};
  if(k === 0) d.niv = 0.7;
  return d;
}
function motifTr(n){
  var inst = TR.def.instr;
  var p = {A:[], B:[], son:[], last:16, scale:16};
  for(var k=0;k<inst.length;k++){
    p.A.push(ligneVide()); p.B.push(ligneVide());
    p.son.push(sonTr(k));
  }
  var u = TR.def.usine(n);
  for(var key in u){
    u[key].split("").forEach(function(c, i){ if(c !== "." && c !== " ") p.A[+key][i] = 1; });
  }
  return p;
}
var TR = {m:"tr808", def:null, pat:null, slots:[], cur:0, var2:false, sel:1,
          ecrit:true, pos:-1, noeuds:[], ohGain:null, flam:false, shuffle:0,
          bus:null, dist:false, drive:0.45, tone:0.75, clap:false, couleur:0};

/* ---------- séquenceur ---------- */
function voixTr(t, k, acc){
  TR.def.voix(t, k, acc);
  var n = TR.def.midi[k];
  if(n) midiNoteA(n, t, acc ? 1 : 0.7, MIDI.canal, 0.15);
}
/* Frapper une voix à la main ou par MIDI : on la joue, et si la machine est en
   écriture pendant la lecture, on l'inscrit au pas le plus proche. La ligne 0
   est l'accent, elle ne se frappe pas. */
function frapperTr(k, acc){
  audioInit();
  if(!ctx || k < 1) return;
  voixTr(maintenantAudio() + 0.005, k, acc);
  if(S.run && TR.ecrit && TR.pat){
    var j = pasLePlusProche(TR.pos, TR.pat.last || 16);
    if(j >= 0){
      var v = TR.var2 ? "B" : "A";
      TR.pat[v][k][j] = 1;
      if(acc) TR.pat[v][0][j] = 1;
      majTr(); memTr();
    }
  }
}
function scheduleTr(i, t){
  var p = TR.pat, v = TR.var2 ? "B" : "A";
  if(i >= (p.last || 16)) return;
  if(TR.shuffle && i % 2 === 1) t += stepDur() * TR.shuffle * 0.5;
  var acc = !!p[v][0][i];
  var n = ouvrirPas(), k;
  for(k=1;k<TR.def.instr.length;k++){
    if(!p[v][k][i]) continue;
    voixTr(t, k, acc); n++;
    if(TR.flam){ voixTr(t + 0.028, k, false); n++; }   /* le flam de la 909 */
  }
  attenuerVoie("tr", n, t);
  if(!cache) queue.push({i:i, t:t});
}
var trPas = [];
function beatTr(i){
  TR.pos = i;
  for(var j=0;j<16;j++) trPas[j].classList.toggle("cur", j === i);
}
function arretTr(){
  TR.pos = -1;
  for(var j=0;j<16;j++) trPas[j].classList.remove("cur");
  var b = document.getElementById("tr8-start");
  if(b) b.classList.remove("on");
}
function boucleTr(){ }
var MACHINE_TR = {schedule:scheduleTr, beat:beatTr, arret:arretTr, boucle:boucleTr,
                  longueur:function(){ return TR.pat.last || 16; }};

/* ---------- interface, reconstruite à chaque changement de modèle ---------- */
var TR_KNOBS = [];
function construireTr(){
  var barre = document.getElementById("tr8-instr"), sel = document.getElementById("tr8-sel");
  barre.innerHTML = ""; sel.innerHTML = "";
  TR.def.instr.forEach(function(ins, k){
    if(ins.grp){
      var d = document.createElement("div");
      d.className = "tr8-grp";
      var b = document.createElement("b");
      b.textContent = ins.grp;
      d.appendChild(b);
      var r = document.createElement("div");
      r.className = "tr8-kns";
      d.appendChild(r);
      d.dataset.grp = k;
      barre.appendChild(d);
    }
    var groupe = barre.lastChild.querySelector(".tr8-kns");
    ins.kns.forEach(function(kn){
      var w = document.createElement("div");
      w.className = "tr8-kn";
      w.innerHTML = '<div class="bt" id="tr8-k-' + k + '-' + kn[0] + '"><i></i></div><em>' + kn[1] + '</em>';
      groupe.appendChild(w);
    });
    var b2 = document.createElement("button");
    b2.className = "tr8b";
    b2.textContent = ins.id + " " + ins.nom;
    b2.dataset.k = k;
    sel.appendChild(b2);
  });
  /* les boutons rotatifs sont refaits avec la façade */
  TR_KNOBS = [];
  TR.def.instr.forEach(function(ins, k){
    ins.kns.forEach(function(kn){
      var id = "tr8-k-" + k + "-" + kn[0];
      if(!document.getElementById(id)) return;
      TR_KNOBS.push(knobEm(id, {min:0, max:1,
        get:function(){ return TR.pat.son[k][kn[0]]; },
        set:function(v){
          TR.pat.son[k][kn[0]] = v;
          lcdTr(String(Math.round(v * 100)), ins.id + " " + kn[1], true);
          memTr();
        }}));
    });
  });
}
(function socleTr(){
  var pas = document.getElementById("tr8-pas"), nums = document.getElementById("tr8-nums");
  for(var i=0;i<16;i++){
    var b = document.createElement("button");
    b.className = "c" + Math.floor(i / 4);
    b.dataset.i = i;
    pas.appendChild(b);
    trPas.push(b);
    var sp = document.createElement("span");
    sp.textContent = String(i + 1);
    nums.appendChild(sp);
  }
  pas.addEventListener("click", function(e){
    var b2 = e.target.closest("button");
    if(!b2) return;
    var i2 = +b2.dataset.i;
    if(!TR.ecrit){
      memTr();
      TR.cur = i2;
      TR.pat = TR.slots[i2];
      majTr(); H.inter();
      return;
    }
    var v = TR.var2 ? "B" : "A";
    TR.pat[v][TR.sel][i2] = TR.pat[v][TR.sel][i2] ? 0 : 1;
    if(!S.run && TR.pat[v][TR.sel][i2]){
      audioInit();
      voixTr(maintenantAudio() + 0.01, TR.sel, !!TR.pat[v][0][i2]);
    }
    majTr(); memTr(); H.cran();
  });
  document.getElementById("tr8-sel").addEventListener("click", function(e){
    var b3 = e.target.closest(".tr8b");
    if(!b3) return;
    TR.sel = +b3.dataset.k;
    majTr(); H.cran();
  });
})();

var kTrVol = knobEm("tr8-k-vol", {min:0, max:1, get:function(){ return S.vol; },
  set:function(v){ S.vol = v; if(master) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
    lcdTr(String(Math.round(v*100)), "VOLUME", true); saveSoon(); }});
var kTrTone = knobEm("tr8-k-tone", {min:0, max:1, get:function(){ return TR.tone; },
  set:function(v){ TR.tone = v; majBusTr(); lcdTr(String(Math.round(v*100)), "TONE", true); memTr(); }});
var kTrDrive = knobEm("tr8-k-drive", {min:0, max:1, get:function(){ return TR.drive; },
  set:function(v){ TR.drive = v; majBusTr(); lcdTr(String(Math.round(v*100)), "DISTORTION", true); memTr(); }});
var kTrTempo = knobEm("tr8-k-tempo", {min:0, max:1, get:function(){ return (S.bpm - 40) / 260; },
  set:function(v){ S.bpm = Math.round(40 + v * 260); lcdTr(String(S.bpm), "TEMPO", true); saveSoon(); }});
function majKnobsTr(){
  TR_KNOBS.forEach(function(k){ k.maj(); });
  kTrVol.maj(); kTrTempo.maj(); kTrTone.maj(); kTrDrive.maj();
}

var trTmr = null;
function lcdTr(v, l, fugace){
  var a = document.getElementById("tr8-val"), b = document.getElementById("tr8-lab");
  if(!a) return;
  a.textContent = v; b.textContent = l;
  clearTimeout(trTmr);
  if(fugace) trTmr = setTimeout(majLcdTr, 1400);
}
function majLcdTr(){
  lcdTr(("0" + (TR.cur + 1)).slice(-2), "PATTERN " + (TR.var2 ? "B" : "A"));
}
function majTr(){
  var p = TR.pat, v = TR.var2 ? "B" : "A", i;
  for(i=0;i<16;i++){
    trPas[i].classList.toggle("act", TR.ecrit ? !!p[v][TR.sel][i] : (i === TR.cur));
    trPas[i].classList.toggle("hors", i >= (p.last || 16));
  }
  var bs = document.querySelectorAll("#tr8-sel .tr8b");
  for(i=0;i<bs.length;i++) bs[i].classList.toggle("on", +bs[i].dataset.k === TR.sel);
  document.getElementById("tr8-var").textContent = "VARIATION " + (TR.var2 ? "B" : "A");
  document.getElementById("tr8-mode").textContent = TR.ecrit ? "PATTERN WRITE" : "PATTERN PLAY";
  document.getElementById("tr8-mode").classList.toggle("on", TR.ecrit);
  document.getElementById("tr8-last").textContent = "LAST STEP " + (p.last || 16);
  document.getElementById("tr8-scale").textContent = "SCALE " + (p.scale || 16);
  var bf = document.getElementById("tr8-flam");
  if(bf){
    bf.style.display = (TR.m === "tr909") ? "" : "none";
    bf.classList.toggle("on", TR.flam);
    bf.textContent = TR.flam ? "FLAM ON" : "FLAM OFF";
  }
  var mat = document.getElementById("tr8-matrice");
  if(mat){
    mat.style.display = (TR.m === "tr707") ? "grid" : "none";
    if(TR.m === "tr707"){
      if(mat.childElementCount !== 16 * (TR.def.instr.length - 1)){
        mat.innerHTML = "";
        mat.style.gridTemplateColumns = "repeat(16,1fr)";
        for(var q=1;q<TR.def.instr.length;q++)
          for(var w=0;w<16;w++){
            var pt = document.createElement("i");
            pt.dataset.k = q; pt.dataset.w = w;
            mat.appendChild(pt);
          }
      }
      var pts = mat.children;
      for(var z=0;z<pts.length;z++){
        var kk = +pts[z].dataset.k, ww = +pts[z].dataset.w;
        pts[z].classList.toggle("on", !!p[v][kk][ww]);
        pts[z].classList.toggle("ici", kk === TR.sel);
      }
    }
  }
  var rd = (TR.m === "rd6");
  ["tr8-dist","tr8-clap","tr8-couleur","tr8-kn-tone","tr8-kn-drive"].forEach(function(id){
    var e = document.getElementById(id);
    if(e) e.style.display = rd ? "" : "none";
  });
  if(rd){
    var bd = document.getElementById("tr8-dist");
    bd.textContent = TR.dist ? "DIST ON" : "DIST OFF";
    bd.classList.toggle("on", TR.dist);
    var bc = document.getElementById("tr8-clap");
    bc.textContent = TR.clap ? "CP BR110" : "CY RD-6";
    bc.classList.toggle("on", TR.clap);
  }
  var bsh = document.getElementById("tr8-shuffle");
  if(bsh) bsh.textContent = "SHUFFLE " + Math.round(TR.shuffle * 100) + "%";
  majLcdTr();
}

function memTr(){
  memoire[TR.m] = {
    cur:TR.cur, sel:TR.sel, var2:TR.var2, flam:TR.flam, shuffle:TR.shuffle,
    dist:TR.dist, drive:TR.drive, tone:TR.tone, clap:TR.clap, couleur:TR.couleur,
    slots:TR.slots.map(function(p){
      return {last:p.last, scale:p.scale, son:p.son,
              A:p.A.map(function(l){ return l.join(""); }),
              B:p.B.map(function(l){ return l.join(""); })};
    })
  };
  sauverMachine(TR.m);
}
function chargerTr(){
  TR.slots = [];
  for(var z=0;z<16;z++) TR.slots.push(motifTr(z < 3 ? z : 9));
  TR.cur = 0; TR.sel = 1; TR.var2 = false; TR.flam = false; TR.shuffle = 0;
  var m = memLire(TR.m);
  if(m){
    if(m.slots && m.slots.length === 16){
      TR.slots = m.slots.map(function(o){
        var p = motifTr(9);
        p.last = o.last || 16; p.scale = o.scale || 16;
        if(o.son && o.son.length === TR.def.instr.length) p.son = o.son;
        ["A","B"].forEach(function(v){
          if(o[v]) o[v].forEach(function(s, k){
            if(k >= p[v].length) return;
            for(var i=0;i<16;i++) p[v][k][i] = s.charAt(i) === "1" ? 1 : 0;
          });
        });
        return p;
      });
    }
    if(typeof m.cur === "number") TR.cur = m.cur;
    if(typeof m.sel === "number") TR.sel = Math.min(m.sel, TR.def.instr.length - 1);
    TR.var2 = !!m.var2; TR.flam = !!m.flam;
    TR.dist = !!m.dist; TR.clap = !!m.clap;
    ["shuffle","drive","tone","couleur"].forEach(function(c){
      if(typeof m[c] === "number") TR[c] = m[c];
    });
  }
  TR.pat = TR.slots[TR.cur];
}

document.getElementById("tr8-start").addEventListener("click", function(){
  audioInit();
  if(S.run){ stop(); H.stop(); } else { step = 0; start(); H.start(); }
  this.classList.toggle("on", S.run);
});
document.getElementById("tr8-stop").addEventListener("click", function(){
  if(S.run){ stop(); H.stop(); }
  else { audioInit(); start(); H.start(); }
  document.getElementById("tr8-start").classList.toggle("on", S.run);
});
document.getElementById("tr8-var").addEventListener("click", function(){
  TR.var2 = !TR.var2; majTr(); memTr(); H.inter();
});
document.getElementById("tr8-mode").addEventListener("click", function(){
  TR.ecrit = !TR.ecrit; majTr(); H.inter();
  signal(TR.ecrit ? "ÉCRITURE : LES TOUCHES POSENT LES PAS"
                  : "LECTURE : LES TOUCHES CHOISISSENT LE MOTIF");
});
document.getElementById("tr8-clear").addEventListener("click", function(){
  var v = TR.var2 ? "B" : "A";
  TR.pat[v][TR.sel] = ligneVide();
  majTr(); memTr(); H.inter();
  lcdTr("CLR", TR.def.instr[TR.sel].id, true);
});
document.getElementById("tr8-last").addEventListener("click", function(){
  var v = [16, 12, 8, 4];
  TR.pat.last = v[(v.indexOf(TR.pat.last) + 1) % v.length];
  majTr(); memTr(); H.cran();
});
document.getElementById("tr8-scale").addEventListener("click", function(){
  var v = [16, 32, 12, 24];
  TR.pat.scale = v[(v.indexOf(TR.pat.scale) + 1) % v.length];
  majTr(); memTr(); H.cran();
  lcdTr(String(TR.pat.scale), "SCALE", true);
});
document.getElementById("tr8-dist").addEventListener("click", function(){
  TR.dist = !TR.dist; majBusTr(); majTr(); memTr(); H.inter();
});
document.getElementById("tr8-clap").addEventListener("click", function(){
  TR.clap = !TR.clap; majTr(); memTr(); H.inter();
  signal(TR.clap ? "CLAP DE LA BR-110" : "CYMBALE DE LA RD-6");
});
document.getElementById("tr8-couleur").addEventListener("click", function(){
  TR.couleur = (TR.couleur + 1) % 6;
  appliquerCouleurRd6(); memTr(); H.cran();
  signal(["BLEU","NOIR","ARGENT","VERT","JAUNE","ROUGE"][TR.couleur]);
});
function appliquerCouleurRd6(){
  document.body.classList.remove("c1","c2","c3","c4","c5");
  if(TR.m === "rd6" && TR.couleur > 0) document.body.classList.add("c" + TR.couleur);
}
document.getElementById("tr8-flam").addEventListener("click", function(){
  TR.flam = !TR.flam; majTr(); memTr(); H.inter();
  signal(TR.flam ? "FLAM : CHAQUE COUP EST DOUBLÉ" : "FLAM COUPÉ");
});
document.getElementById("tr8-shuffle").addEventListener("click", function(){
  var v = [0, 0.12, 0.2, 0.3, 0.4];
  TR.shuffle = v[(v.indexOf(TR.shuffle) + 1) % v.length];
  majTr(); memTr(); H.cran();
});
var trTaps = [];
document.getElementById("tr8-tap").addEventListener("click", function(){
  var now = Date.now();
  if(trTaps.length && now - trTaps[trTaps.length-1] > 2200) trTaps = [];
  trTaps.push(now); if(trTaps.length > 5) trTaps.shift();
  if(trTaps.length < 2){ H.cran(); return; }
  var s = 0;
  for(var i=1;i<trTaps.length;i++) s += trTaps[i] - trTaps[i-1];
  var bpm = Math.round(60000 / (s / (trTaps.length - 1)));
  if(bpm >= 40 && bpm <= 300){ S.bpm = bpm; kTrTempo.maj(); lcdTr(String(bpm), "TEMPO", true); saveSoon(); }
  H.cran();
});
document.getElementById("tr8-notice").addEventListener("click", function(){ ouvrirNotice(); });

var unitTr = document.getElementById("unit-tr808");
function activerTr(modele){
  stop();
  TR.m = TR_MODELES[modele] ? modele : "tr808";
  TR.def = TR_MODELES[TR.m];
  S.modele = TR.m;
  majVoieSet("tr");                   /* v149 : le calibrage suit le modèle */
  MACHINE = MACHINE_TR;
  poserMachine("tr8", TR.m === "tr909" ? "tr9" : null,
                      TR.m === "tr707" ? "tr7" : null,
                      TR.m === "rd6"   ? "rd6" : null);
  audioInit();
  chargerTr();            /* les motifs d'abord : les boutons lisent leurs valeurs à la création */
  construireTr();
  debrancherTout(TR.noeuds); TR.noeuds = []; TR.ohGain = null;
  TR.sel = Math.min(TR.sel, TR.def.instr.length - 1);
  document.getElementById("tr8-notice").textContent = TR.def.nom;
  document.getElementById("tr8-sstitre").textContent = TR.def.sous;
  document.querySelector(".tr8-roland").textContent = TR.def.marque || "Roland";
  debrancherTout(TR.bus); TR.bus = null;
  appliquerCouleurRd6();
  majTr(); majKnobsTr();
  actif = unitTr;
  save(); fit(); setTimeout(fit, 120);
}

