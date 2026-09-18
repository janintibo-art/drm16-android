/* ===================== ROLAND TR-1000 =====================
   Hybride : chaque instrument a une voix analogique (couche A) et une couche
   d'échantillon (couche B), mélangées par un potard. Le curseur MORPH
   interpole entre deux états mémorisés de tout le kit. Les voix analogiques
   passent par le filtre et la saturation d'ANALOG FX ; les deux couches
   partagent les départs de réverbération et de délai. */
var T1K_INSTR = [
  {id:"bd", nom:"BASS DRUM", c1:"ATTACK", c2:"COMP"},
  {id:"sd", nom:"SNARE DRUM", c1:"SNAPPY", c2:"NOISE"},
  {id:"lt", nom:"LOW TOM",   c1:"BEND",   c2:"NOISE"},
  {id:"ht", nom:"HIGH TOM",  c1:"BEND",   c2:"NOISE"},
  {id:"rs", nom:"RIM SHOT",  c1:"BODY",   c2:"TONE"},
  {id:"hc", nom:"HAND CLAP", c1:"SPREAD", c2:"ROOM"},
  {id:"ch", nom:"CLOSED HH", c1:"TONE",   c2:"METAL"},
  {id:"oh", nom:"OPEN HH",   c1:"TONE",   c2:"METAL"},
  {id:"cc", nom:"CRASH CYM", c1:"TONE",   c2:"METAL"},
  {id:"rc", nom:"RIDE CYM",  c1:"TONE",   c2:"METAL"}
];
var T1K_MIDI = [36, 38, 41, 48, 37, 39, 42, 46, 49, 51];
function instrT1k(i){
  return {tune:0.5, dec:0.5, c1:0.5, c2:0.4, niv:0.8, mix:0, ech:"b" + (i % 24), pech:0.5};
}
function motifT1k(n){
  var m = {longueurs:Array(10).fill(0), motionActive:true, reglages:[], solo:-1, muet:Array(10).fill(false), pas:[], acc:[], sub:[], prob:[], cycle:[], retard:[], direction:Array(10).fill("avant"), last:16, instr:[]};
  for(var k=0;k<10;k++){
    m.pas.push(0); m.acc.push(0);
    m.reglages.push(Array(16).fill(null)); m.retard.push(Array(16).fill(0)); m.cycle.push(Array(16).fill("1:1")); m.sub.push([]); m.prob.push(Array(16).fill(100));
    for(var s=0;s<16;s++) m.sub[k].push(1);
    m.instr.push(instrT1k(k));
  }
  if(n === 0){ m.pas[0] = 0x1111; m.pas[1] = 0x0440; m.pas[6] = 0x5555; m.acc[0] = 0x0001; }
  else if(n === 1){ m.pas[0] = 0x0521; m.pas[1] = 0x0440; m.pas[6] = 0xFFFF;
                    m.pas[7] = 0x4000; m.sub[6][10] = 3; }
  return m;
}
var T1K = {copie:null, motifs:[], cur:0, banq:0, sel:0, pos:-1, noeuds:{}, rec:false,
           morph:0, mA:null, mB:null, sub:false, accent:false, proba:false, probValeur:100, cycles:false, cycleValeur:"1:1", decalage:false, retardValeur:0, motionRec:false, params:false, paramNom:"tune", paramValeur:null, layer:0,
           afx:{on:false, filt:0.8, drive:0.25},
           mfx:{rev:0.25, revT:0.4, dly:0.2, dlyT:0.35, fb:0.3},
           fill:false, ohGain:null, tour:-1, departs:[], entendu:null, contexteLecture:null};
for(var t1z=0; t1z<128; t1z++) T1K.motifs.push(motifT1k(t1z < 2 ? t1z : 9));
function motifT1kCur(){ return T1K.motifs[T1K.banq * 16 + T1K.cur]; }
function instrT1kSel(){ return motifT1kCur().instr[T1K.sel]; }

/* v194 : une décision par pas ; tous ses sous-pas suivent cette décision. */
function probabiliteT1k(v){
  return typeof v === "number" && isFinite(v) ? Math.round(Math.max(0, Math.min(100, v))) : 100;
}
/* v197 : A:B = jouer au tour A de chaque groupe de B tours du motif. */
function retardT1k(v){ return [0,1,2,4,8].indexOf(v) >= 0 ? v : 0; }
function texteRetardT1k(v){ return v ? "+" + v + "/16" : "0"; }
function cycleT1k(v){ return typeof v === "string" && /^(1:1|[12]:2|[123]:3|[1234]:4)$/.test(v) ? v : "1:1"; }
function passeCycleT1k(v, tour){
  var c = cycleT1k(v).split(":");
  return tour % (+c[1]) === (+c[0]) - 1;
}
function passeProbabiliteT1k(v){
  var p = probabiliteT1k(v);
  return p >= 100 || (p > 0 && Math.random() * 100 < p);
}
function poserProbabiliteT1k(k, i, v){
  if(!Number.isInteger(k) || k < 0 || k >= 10 || !Number.isInteger(i) || i < 0 || i >= 16) return false;
  motifT1kCur().prob[k][i] = probabiliteT1k(v);
  return true;
}

/* v195 : huit banques réelles ; chaque motif possède ses propres listes. */
function borneT1k(v, min, max, repli){
  return typeof v === "number" && isFinite(v) ? Math.max(min, Math.min(max, v)) : repli;
}
var T1K_PARAMS = ["tune","dec","c1","c2","niv","mix"];
function lireReglagesT1k(o){
  if(!o || typeof o !== "object" || Array.isArray(o)) return null;
  var r = {}, n = 0;
  T1K_PARAMS.forEach(function(k){
    if(typeof o[k] === "number" && isFinite(o[k])){ r[k] = Math.max(0, Math.min(1, o[k])); n++; }
  });
  return n ? r : null;
}
function poserReglageT1k(k, j, nom, valeur){
  if(!Number.isInteger(k) || k < 0 || k >= 10 || !Number.isInteger(j) || j < 0 || j >= 16 || T1K_PARAMS.indexOf(nom) < 0) return false;
  if(valeur !== null && (typeof valeur !== "number" || !isFinite(valeur))) return false;
  var m = motifT1kCur(), r = lireReglagesT1k(m.reglages[k][j]) || {};
  if(valeur === null) delete r[nom]; else r[nom] = Math.max(0, Math.min(1, valeur));
  m.reglages[k][j] = lireReglagesT1k(r); return true;
}
function valeurPasT1k(k, nom, reglages){
  return reglages && typeof reglages[nom] === "number" ? reglages[nom] : valT1k(k, nom);
}

function lireMotifT1k(o){
  var r = motifT1k(9);
  o = o && typeof o === "object" ? o : {};
  for(var z=0;z<10;z++) r.muet[z] = Array.isArray(o.muet) && o.muet[z] === true;
  r.motionActive = o.motionActive !== false;
  r.solo = Number.isInteger(o.solo) && o.solo >= 0 && o.solo < 10 ? o.solo : -1;
  r.last = Math.floor(borneT1k(o.last, 1, 16, 16));
  for(var k=0;k<10;k++){
    ["pas","acc"].forEach(function(c){
      var v = Array.isArray(o[c]) ? o[c][k] : 0;
      r[c][k] = Number.isInteger(v) ? v & 65535 : 0;
    });
    for(var j=0;j<16;j++){
      var prob = Array.isArray(o.prob) && Array.isArray(o.prob[k]) ? o.prob[k][j] : undefined;
      var sub = Array.isArray(o.sub) && Array.isArray(o.sub[k]) ? o.sub[k][j] : undefined;
      r.prob[k][j] = probabiliteT1k(prob);
      r.cycle[k][j] = cycleT1k(Array.isArray(o.cycle) && Array.isArray(o.cycle[k]) ? o.cycle[k][j] : undefined);
      r.reglages[k][j] = lireReglagesT1k(Array.isArray(o.reglages) && Array.isArray(o.reglages[k]) ? o.reglages[k][j] : null);
      r.retard[k][j] = retardT1k(Array.isArray(o.retard) && Array.isArray(o.retard[k]) ? o.retard[k][j] : undefined);
      r.sub[k][j] = Math.floor(borneT1k(sub, 1, 4, 1));
    }
    r.longueurs[k] = longueurPisteT1k(Array.isArray(o.longueurs) ? o.longueurs[k] : 0);
    r.direction[k] = directionT1k(Array.isArray(o.direction) ? o.direction[k] : undefined);
    var I = Array.isArray(o.instr) ? o.instr[k] : null;
    if(I && typeof I === "object"){
      ["tune","dec","c1","c2","niv","mix","pech"].forEach(function(n){ r.instr[k][n] = borneT1k(I[n], 0, 1, r.instr[k][n]); });
      if(typeof I.ech === "string" && I.ech.length && I.ech.length <= 128) r.instr[k].ech = I.ech;
    }
  }
  return r;
}
function choisirMotifT1k(banque, motif){
  if(!Number.isInteger(banque) || banque < 0 || banque >= 8 || !Number.isInteger(motif) || motif < 0 || motif >= 16) return false;
  if(S.run){ signal("ARRÊTEZ PLAY POUR CHANGER DE MOTIF OU DE BANQUE"); majT1k(); return false; }
  T1K.banq = banque; T1K.cur = motif; resetLectureT1k();
  memT1k(); majT1k(); majKnobsT1k(); return true;
}
/* v196 : directions par instrument ; le curseur suit l'heure audio. */
function directionT1k(v){ return v === "arriere" || v === "pingpong" ? v : "avant"; }
/* 0 suit LAST ; 1..16 définit un cycle indépendant, continu entre les tours. */
function longueurPisteT1k(v){ return Number.isInteger(v) && v >= 1 && v <= 16 ? v : 0; }
function longueurInstrumentT1k(m, k){ return longueurPisteT1k(m.longueurs[k]) || m.last; }
function choisirLongueurT1k(v){
  if(S.run){ signal("ARRÊTEZ PLAY POUR CHANGER LA LONGUEUR"); majT1k(); return false; }
  motifT1kCur().longueurs[T1K.sel] = longueurPisteT1k(v);
  resetLectureT1k(); memT1k(); majT1k(); return true;
}
function pasDirectionT1k(direction, absolu, longueur){
  if(longueur <= 1) return 0;
  if(direction === "arriere") return longueur - 1 - (absolu % longueur);
  if(direction === "pingpong"){
    var p = absolu % (2 * longueur - 2);
    return p < longueur ? p : 2 * longueur - 2 - p;
  }
  return absolu % longueur;
}
function resetLectureT1k(){
  T1K.tour = -1; T1K.departs = []; T1K.entendu = null; T1K.contexteLecture = null; T1K.pos = -1;
  if(typeof t1kPas !== "undefined") t1kPas.forEach(function(b){ b.classList.remove("cur"); });
}
function validerLectureT1k(){
  if(!ctx || ctx.startRendering) return;
  while(T1K.departs.length && T1K.departs[0].t <= maintenantAudio()){
    T1K.entendu = T1K.departs.shift(); T1K.pos = T1K.entendu.i;
  }
}
function curseurT1k(){
  validerLectureT1k();
  var position = T1K.entendu ? T1K.entendu.positions[T1K.sel] : -1;
  t1kPas.forEach(function(b, i){ b.classList.toggle("cur", i === position); });
}
function pasEnregistreT1k(k){
  validerLectureT1k();
  var e = T1K.entendu, m = motifT1kCur();
  if(!e) return pasLePlusProche(T1K.pos, longueurInstrumentT1k(m, k));
  var avance = (maintenantAudio() - e.t) / stepDur() > .5 ? 1 : 0;
  return e.fill ? (e.i + avance) % m.last : pasDirectionT1k(m.direction[k], e.absolu + avance, longueurInstrumentT1k(m, k));
}
function choisirDirectionT1k(v){
  if(S.run){ signal("ARRÊTEZ PLAY POUR CHANGER LE SENS"); majT1k(); return false; }
  motifT1kCur().direction[T1K.sel] = directionT1k(v);
  resetLectureT1k(); memT1k(); majT1k(); return true;
}
/* ---------- chaîne de sortie ---------- */
function bâtirT1k(){
  if(T1K.noeuds.mix) return;
  var mixA = ctx.createGain();                 /* bus analogique */
  var filt = ctx.createBiquadFilter(); filt.type = "lowpass";
  var sat = ctx.createWaveShaper();
  var n = 1025, c = new Float32Array(n);
  for(var i=0;i<n;i++){ var x = i*2/(n-1)-1; c[i] = Math.tanh(x*2.6); }
  sat.curve = c; sat.oversample = saturationDeVoie(sat);
  var secA = ctx.createGain(), humA = ctx.createGain();
  var mix = ctx.createGain();
  mixA.connect(secA); secA.connect(mix);
  mixA.connect(filt); filt.connect(sat); sat.connect(humA); humA.connect(mix);
  /* réverbération et délai, communs aux deux couches */
  var rev = ctx.createConvolver(), revIn = ctx.createGain();
  var nr = Math.floor(ctx.sampleRate * 1.6), br = ctx.createBuffer(2, nr, ctx.sampleRate);
  for(var k=0;k<2;k++){
    var d = br.getChannelData(k);
    for(var j=0;j<nr;j++) d[j] = (Math.random()*2-1) * Math.pow(1 - j/nr, 2.4);
  }
  rev.buffer = br;
  revIn.connect(rev); rev.connect(mix);
  var dly = ctx.createDelay(2), dlyIn2 = ctx.createGain(), fb = ctx.createGain();
  dlyIn2.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(mix);
  mix.connect(busSet("t1k") || master);
  T1K.noeuds = {mixA:mixA, mix:mix, filt:filt, secA:secA, humA:humA,
                revIn:revIn, dlyIn:dlyIn2, dly:dly, fb:fb};
  majFxT1k();
}
function majFxT1k(){
  var n = T1K.noeuds;
  if(!n.mix) return;
  var a = T1K.afx;
  n.filt.frequency.value = 180 * Math.pow(110, a.filt);
  n.secA.gain.value = a.on ? (1 - a.drive * 0.75) : 1;
  n.humA.gain.value = a.on ? a.drive * 1.1 : 0;
  n.revIn.gain.value = T1K.mfx.rev;
  n.dlyIn.gain.value = T1K.mfx.dly;
  n.dly.delayTime.value = 0.04 + T1K.mfx.dlyT * 0.6;
  n.fb.gain.value = T1K.mfx.fb * 0.75;
}
/* la valeur effective d'un réglage tient compte du morphing */
function valT1k(k, nom){
  var I = motifT1kCur().instr[k];
  /* dès que les deux états sont posés, le curseur commande : à zéro on entend A,
     à fond on entend B. Repressez SET A ou SET B pour rendre la main aux potards. */
  if(T1K.mA && T1K.mB){
    var a = T1K.mA[k] ? T1K.mA[k][nom] : I[nom];
    var b = T1K.mB[k] ? T1K.mB[k][nom] : I[nom];
    if(typeof a === "number" && typeof b === "number") return a + (b - a) * T1K.morph;
  }
  return I[nom];
}
function voixT1k(t, k, acc, reglages){
  bâtirT1k();
  var V = T1K_INSTR[k], n = T1K.noeuds;
  var niv = mv("niv", valeurPasT1k(k, "niv", reglages)) * (acc ? 1 : 0.66);
  var mixAB = valeurPasT1k(k, "mix", reglages);
  var tune = valeurPasT1k(k, "tune", reglages), dec = valeurPasT1k(k, "dec", reglages);
  var c1 = valeurPasT1k(k, "c1", reglages), c2 = valeurPasT1k(k, "c2", reglages);

  /* ---- couche A : la voix analogique ---- */
  if(mixAB < 0.98){
    var gA = ctx.createGain();
    gA.connect(pasVoie(n.mixA));
    gA.connect(pasVoie(n.revIn)); gA.connect(pasVoie(n.dlyIn));
    var na = niv * (1 - mixAB);
    if(V.id === "bd"){
      var f0 = 34 + tune * 40, d1 = 0.1 + dec * 1.1;
      var o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(f0 * (3 + c1 * 4), t);
      o.frequency.exponentialRampToValueAtTime(f0, t + 0.02 + (1 - c1) * 0.04);
      trEnv(gA, t, na * 1.2 * (1 + c2 * 0.3), d1, 0.001);
      o.connect(gA); o.start(t); o.stop(t + d1 + 0.05);
    }
    else if(V.id === "sd"){
      var ds = 0.06 + dec * 0.35;
      var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
      bp.frequency.value = 1400 + c2 * 3600; bp.Q.value = 0.7;
      var nb = trBruit(t, ds);
      trEnv(gA, t, na * (0.5 + c1 * 1.1), ds, 0.0008);
      nb.connect(bp); bp.connect(gA);
      var o1 = ctx.createOscillator(); o1.type = "triangle";
      o1.frequency.value = 150 + tune * 190;
      var gc = ctx.createGain();
      trEnv(gc, t, na * 0.55, ds * 0.45, 0.0008);
      o1.connect(gc); gc.connect(pasVoie(n.mixA)); o1.start(t); o1.stop(t + ds);
    }
    else if(V.id === "lt" || V.id === "ht"){
      var base = (V.id === "lt" ? 70 : 140) * Math.pow(2, (tune - 0.5) * 1.3);
      var dt = 0.15 + dec * 0.8;
      var ot = ctx.createOscillator(); ot.type = "sine";
      ot.frequency.setValueAtTime(base * (1.6 + c1 * 2), t);
      ot.frequency.exponentialRampToValueAtTime(base, t + 0.04 + c1 * 0.06);
      trEnv(gA, t, na * 1.15, dt, 0.0015);
      ot.connect(gA); ot.start(t); ot.stop(t + dt + 0.05);
      if(c2 > 0.02){
        var nt = trBruit(t, 0.08), gnt = ctx.createGain();
        var bt2 = ctx.createBiquadFilter(); bt2.type = "bandpass"; bt2.frequency.value = base * 3.4;
        trEnv(gnt, t, na * c2 * 0.5, 0.075, 0.001);
        nt.connect(bt2); bt2.connect(gnt); gnt.connect(pasVoie(n.mixA));
      }
    }
    else if(V.id === "rs"){
      var orf = ctx.createOscillator(); orf.type = "square";
      orf.frequency.value = 320 + tune * 420;
      var br2 = ctx.createBiquadFilter(); br2.type = "bandpass";
      br2.frequency.value = 1600 + c2 * 2400; br2.Q.value = 3;
      var nr2 = trBruit(t, 0.025);
      trEnv(gA, t, na * (0.8 + c1 * 0.7), 0.02 + dec * 0.05, 0.0006);
      orf.connect(gA); nr2.connect(br2); br2.connect(gA);
      orf.start(t); orf.stop(t + 0.06);
    }
    else if(V.id === "hc"){
      var bc = ctx.createBiquadFilter(); bc.type = "bandpass";
      bc.frequency.value = 900 + tune * 1400; bc.Q.value = 1.4;
      var nc = trBruit(t, 0.4);
      nc.connect(bc); bc.connect(gA);
      var ecart = 0.006 + c1 * 0.016;
      gA.gain.setValueAtTime(0.0001, t);
      [0, ecart, ecart*2].forEach(function(o2){
        gA.gain.setValueAtTime(na * 1.6, t + o2);
        gA.gain.exponentialRampToValueAtTime(0.0001, t + o2 + 0.008);
      });
      gA.gain.setValueAtTime(na * (0.7 + c2 * 0.8), t + ecart*3);
      gA.gain.exponentialRampToValueAtTime(0.0001, t + ecart*3 + 0.1 + c2 * 0.4);
    }
    else {                                     /* métaux */
      var dh = (V.id === "ch") ? (0.015 + dec * 0.12)
             : (V.id === "oh") ? (0.08 + dec * 0.9)
             : (V.id === "cc") ? (0.5 + dec * 2.4) : (0.3 + dec * 1.5);
      var bm = (V.id === "cc" ? 300 : V.id === "rc" ? 480 : 760) * (0.7 + tune * 0.7);
      var m2 = trMetal(t, dh, bm, 0.3 + c2 * 0.3);
      var hp = ctx.createBiquadFilter(); hp.type = "highpass";
      hp.frequency.value = (V.id === "cc" || V.id === "rc") ? (2600 + c1 * 4200) : (6500 + c1 * 5000);
      trEnv(gA, t, na * 1.25, dh, 0.0008);
      m2.connect(hp); hp.connect(gA);
      if(V.id === "ch" && T1K.ohGain){
        try{ T1K.ohGain.gain.cancelScheduledValues(t);
             T1K.ohGain.gain.setTargetAtTime(0.0001, t, 0.004); }catch(e){}
      }
      if(V.id === "oh") T1K.ohGain = gA;
    }
  }

  /* ---- couche B : l'échantillon ---- */
  if(mixAB > 0.02){
    banqueEs();
    var buf = ES.buf[motifT1kCur().instr[k].ech];
    if(buf){
      var src = ctx.createBufferSource();
      src.playbackRate.value = Math.pow(2, (valeurPasT1k(k, "pech", reglages) - 0.5) * 2);
      poserTampon(src, buf, src.playbackRate.value);
      var gB = ctx.createGain();
      var nb2 = niv * mixAB;
      var db = Math.max(0.03, buf.duration / src.playbackRate.value * (0.2 + dec * 0.8));
      gB.gain.setValueAtTime(0.0001, t);
      gB.gain.linearRampToValueAtTime(nb2 * 1.1, t + 0.002);
      gB.gain.exponentialRampToValueAtTime(0.0001, t + db);
      src.connect(gB);
      gB.connect(pasVoie(T1K.noeuds.mix));
      gB.connect(pasVoie(T1K.noeuds.revIn)); gB.connect(pasVoie(T1K.noeuds.dlyIn));
      src.start(t); src.stop(t + db + 0.05);
    }
  }
  midiNoteA(T1K_MIDI[k], t, acc ? 1 : 0.7, MIDI.canal, 0.12);
}
function frapperT1k(k, acc){
  audioInit();
  if(!ctx) return;
  voixT1k(maintenantAudio() + 0.005, k, acc);
  if(S.run && T1K.rec){
    var m = motifT1kCur();
    var j = pasEnregistreT1k(k);
    if(j >= 0){
      if(!(m.pas[k] & (1 << j))){ m.prob[k][j] = 100; m.cycle[k][j] = "1:1"; m.retard[k][j] = 0; }
      m.pas[k] |= (1 << j);
      if(acc) m.acc[k] |= (1 << j);
      majT1k(); memT1k();
    }
  }
}

/* ---------- séquenceur, avec sous-pas ---------- */
var T1K_FILL = [0x8888, 0x2222, 0x0F00, 0x00F0, 0, 0x1010, 0xAAAA, 0x0100, 0x0001, 0];
function scheduleT1k(i, t){
  var m = motifT1kCur();
  if(i < 0 || i >= m.last) return;
  if(T1K.contexteLecture !== ctx){ resetLectureT1k(); T1K.contexteLecture = ctx; }
  validerLectureT1k();
  if(i === 0) T1K.tour++;
  if(T1K.tour < 0) T1K.tour = 0;
  var absolu = T1K.tour * m.last + i, positions = [], CHARGE_N = ouvrirPas();
  var pas = T1K.fill ? T1K_FILL : m.pas;
  for(var k=0;k<10;k++){
    var j = T1K.fill ? i : pasDirectionT1k(m.direction[k], absolu, longueurInstrumentT1k(m, k)); positions.push(j);
    if(m.solo >= 0 ? k !== m.solo : m.muet[k]) continue;
    if(!(pas[k] & (1 << j))) continue;
    if(!T1K.fill && !passeCycleT1k(m.cycle[k][j], T1K.tour)) continue;
    if(!T1K.fill && !passeProbabiliteT1k(m.prob[k][j])) continue;
    var acc = !!(m.acc[k] & (1 << j));
    var sub = T1K.fill ? 1 : (m.sub[k][j] || 1);
    var duree = stepDur(), retard = T1K.fill ? 0 : duree * retardT1k(m.retard[k][j]) / 16;
    for(var r=0;r<sub;r++) CHARGE_N++, voixT1k(t + retard + (duree * r / sub), k, acc && r === 0, (T1K.fill || !m.motionActive) ? null : m.reglages[k][j]);
  }
  if(ctx && !ctx.startRendering){
    T1K.departs.push({i:i,t:t,absolu:absolu,positions:positions,fill:T1K.fill});
    T1K.departs.sort(function(a,b){return a.t-b.t;});
  }
  if(!cache) queue.push({i:i, t:t});
  attenuerVoie("t1k", CHARGE_N, t);
}
var t1kPas = [];
function beatT1k(i){
  document.getElementById("t1k-effacer-vars").disabled = S.run;
  document.getElementById("t1k-copier").disabled = S.run;
  document.getElementById("t1k-coller").disabled = S.run || !T1K.copie;
  curseurT1k();
  document.getElementById("t1k-direction").disabled = S.run;
  document.getElementById("t1k-longueur").disabled = S.run;
  document.getElementById("t1k-last").disabled = S.run;
  document.getElementById("t1k-banque").disabled = S.run;
  document.getElementById("t1k-ptn").disabled = S.run;
}
function arretT1k(){
  T1K.motionRec = false;
  resetLectureT1k();
  T1K.pos = -1; T1K.fill = false;
  for(var j=0;j<16;j++) t1kPas[j].classList.remove("cur");
  var b = document.getElementById("t1k-start");
  if(b) b.classList.remove("on");
  majT1k();
}
function boucleT1k(){
  if(T1K.fill){ T1K.fill = false; majT1k(); }
}
var MACHINE_T1K = {schedule:scheduleT1k, beat:beatT1k, arret:arretT1k, boucle:boucleT1k,
                   longueur:function(){ return motifT1kCur().last; }};

/* v199 : instantané indépendant ; le collage confirme toujours sa destination. */
function copierMotifT1k(){
  if(S.run){ signal("ARRÊTEZ PLAY POUR COPIER UN MOTIF"); return false; }
  T1K.copie = {nom:"ABCDEFGH".charAt(T1K.banq) + (T1K.cur + 1), motif:lireMotifT1k(motifT1kCur())};
  majT1k(); signal("MOTIF " + T1K.copie.nom + " COPIÉ · CHOISISSEZ LA DESTINATION PUIS COLLER");
  return true;
}
function collerMotifT1k(){
  if(S.run || !T1K.copie){ signal(S.run ? "ARRÊTEZ PLAY POUR COLLER" : "COPIEZ D'ABORD UN MOTIF"); return false; }
  var destination = T1K.banq * 16 + T1K.cur;
  var nom = "ABCDEFGH".charAt(T1K.banq) + (T1K.cur + 1);
  if(!window.confirm("Remplacer le motif " + nom + " par la copie de " + T1K.copie.nom +
      " ? Ses pas et réglages d'instruments seront remplacés.")) return false;
  T1K.motifs[destination] = lireMotifT1k(T1K.copie.motif);
  resetLectureT1k(); memT1k(); majT1k(); majKnobsT1k();
  signal("COPIE DE " + T1K.copie.nom + " COLLÉE EN " + nom);
  return true;
}

/* v202 : couper la séquence sans effacer les notes ni bloquer les pads directs. */
function basculerMuetT1k(){
  var m = motifT1kCur();
  if(m.solo >= 0){ signal("QUITTEZ SOLO POUR MODIFIER LES MUTES"); return; }
  m.muet[T1K.sel] = !m.muet[T1K.sel];
  memT1k(); majT1k();
  signal(T1K_INSTR[T1K.sel].nom + (m.muet[T1K.sel] ? " · SÉQUENCE MUETTE" : " · SÉQUENCE RÉACTIVÉE"));
}

/* v203 : SOLO masque les mutes sans les modifier. */
function basculerSoloT1k(){
  var m = motifT1kCur();
  m.solo = m.solo === T1K.sel ? -1 : T1K.sel;
  memT1k(); majT1k();
  signal(m.solo < 0 ? "SOLO DÉSACTIVÉ · MUTES RÉTABLIS" : "SOLO · " + T1K_INSTR[m.solo].nom);
}

/* v205 : les gestes écrivent dans le pas entendu, jamais celui anticipé. */
function enregistrerGesteT1k(k, nom, valeur){
  if(!T1K.motionRec || !S.run || !ctx || ctx.startRendering || T1K.fill) return false;
  validerLectureT1k();
  if(!T1K.entendu || T1K.entendu.fill) return false;
  var j = pasEnregistreT1k(k);
  if(j < 0 || !poserReglageT1k(k, j, nom, valeur)) return false;
  return true;
}

/* v206 : comparaison sans suppression et effacement ciblé confirmé. */
function basculerMotionT1k(){
  var m = motifT1kCur(); m.motionActive = !m.motionActive;
  memT1k(); majT1k();
  signal(m.motionActive ? "VARIATIONS ACTIVÉES" : "VARIATIONS SUSPENDUES · RÉGLAGES DE BASE");
}
function effacerVariationsT1k(){
  if(S.run){ signal("ARRÊTEZ PLAY POUR EFFACER LES VARIATIONS"); return false; }
  var m = motifT1kCur(), k = T1K.sel;
  if(!m.reglages[k].some(function(r){return r !== null;})){ signal("AUCUNE VARIATION SUR CET INSTRUMENT"); return false; }
  if(!window.confirm("Effacer toutes les variations de " + T1K_INSTR[k].nom +
      " dans le motif " + "ABCDEFGH".charAt(T1K.banq) + (T1K.cur + 1) +
      " ? Les notes et les réglages de base sont conservés.")) return false;
  m.reglages[k] = Array(16).fill(null);
  T1K.motionRec = false;
  memT1k(); majT1k(); signal("VARIATIONS EFFACÉES · " + T1K_INSTR[k].nom);
  return true;
}

/* ---------- interface ---------- */
var T1K_KNOBS = [];
(function construireT1k(){
  var g = document.getElementById("t1k-instr");
  T1K_INSTR.forEach(function(V, k){
    var d = document.createElement("div");
    d.className = "t1k-i";
    var h = '<b>' + V.nom + '</b>';
    [["tune","TUNE"],["c1",V.c1],["dec","DECAY"],["c2",V.c2],["mix","A / B"]].forEach(function(kn){
      h += '<div class="t1k-kn" id="t1k-k-' + k + '-' + kn[0] + '"><div class="bt"><i></i></div>' +
           '<em>' + kn[1] + '</em></div>';
    });
    h += '<div class="t1k-f" data-f="' + k + '"><b></b></div>';
    h += '<button class="t1k-pad" data-p="' + k + '">' + V.id.toUpperCase() + '</button>';
    d.innerHTML = h;
    g.appendChild(d);
  });
  g.addEventListener("click", function(e){
    var pad = e.target.closest(".t1k-pad");
    if(!pad) return;
    audioInit();
    T1K.sel = +pad.dataset.p;
    frapperT1k(T1K.sel, T1K.accent);
    majT1k(); majKnobsT1k(); H.cran();
  });
  /* curseurs de niveau */
  var tenu = null;
  function poser(e, rail){
    var r = rail.getBoundingClientRect();
    var y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    var k = +rail.dataset.f;
    motifT1kCur().instr[k].niv = 1 - y;
    enregistrerGesteT1k(k, "niv", 1 - y);
    rail.querySelector("b").style.top = Math.round(y * (r.height - 13)) + "px";
    lcdT1k(String(Math.round((1 - y) * 100)), T1K_INSTR[k].nom + " LEVEL", true);
  }
  g.addEventListener("pointerdown", function(e){
    var rail = e.target.closest(".t1k-f");
    if(!rail) return;
    tenu = rail; rail.setPointerCapture(e.pointerId); e.preventDefault();
    poser(e, rail);
  });
  g.addEventListener("pointermove", function(e){ if(tenu && !PINCE) poser(e, tenu); });
  function fin(){ if(tenu){ tenu = null; memT1k(); } }
  g.addEventListener("pointerup", fin);
  g.addEventListener("pointercancel", fin);

  var pas = document.getElementById("t1k-pas");
  for(var i=0;i<16;i++){
    var b = document.createElement("button");
    b.dataset.i = i;
    b.textContent = String(i + 1);
    var pv = document.createElement("small"); pv.className = "t1k-prob-val"; b.appendChild(pv);
    pas.appendChild(b);
    t1kPas.push(b);
  }
  pas.addEventListener("click", function(e){
    var b2 = e.target.closest("button");
    if(!b2) return;
    var i2 = +b2.dataset.i, m = motifT1kCur(), k = T1K.sel;
    if(T1K.params){
      poserReglageT1k(k, i2, T1K.paramNom, T1K.paramValeur);
      signal("PAS " + (i2 + 1) + " · " + T1K.paramNom.toUpperCase() + " · " + (T1K.paramValeur === null ? "BASE" : Math.round(T1K.paramValeur * 100) + "%"));
    } else if(T1K.decalage){
      m.retard[k][i2] = retardT1k(T1K.retardValeur);
      signal("PAS " + (i2 + 1) + " · RETARD " + texteRetardT1k(m.retard[k][i2]) + " DE PAS" + ((m.pas[k] & (1 << i2)) ? "" : " · PAS NON ACTIVÉ"));
    } else if(T1K.cycles){
      m.cycle[k][i2] = cycleT1k(T1K.cycleValeur);
      signal("PAS " + (i2 + 1) + " · CYCLE " + m.cycle[k][i2] + ((m.pas[k] & (1 << i2)) ? "" : " · PAS NON ACTIVÉ"));
    } else if(T1K.proba){
      poserProbabiliteT1k(k, i2, T1K.probValeur);
      signal("PAS " + (i2 + 1) + " · PROBABILITÉ " + m.prob[k][i2] + "%" + ((m.pas[k] & (1 << i2)) ? "" : " · PAS NON ACTIVÉ"));
    } else if(T1K.sub){
      m.sub[k][i2] = (m.sub[k][i2] % 4) + 1;    /* 1 à 4 sous-pas */
      lcdT1k("x" + m.sub[k][i2], "SUB STEP " + (i2 + 1), true);
    } else if(T1K.accent){
      m.acc[k] ^= (1 << i2);
    } else {
      m.pas[k] ^= (1 << i2);
      if(!S.run && (m.pas[k] & (1 << i2))){
        audioInit();
        voixT1k(maintenantAudio() + 0.01, k, !!(m.acc[k] & (1 << i2)));
      }
    }
    majT1k(); memT1k(); H.cran();
  });

  /* curseur de morphing */
  var mo = document.getElementById("t1k-morph"), tm = false;
  function poserM(e){
    var r = mo.getBoundingClientRect();
    T1K.morph = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    mo.querySelector("b").style.left = Math.round(T1K.morph * (r.width - 14)) + "px";
    lcdT1k(Math.round(T1K.morph * 100) + "%", (T1K.mA && T1K.mB) ? "MORPH A>B" : "MORPH · SET A ET B", true);
  }
  mo.addEventListener("pointerdown", function(e){ tm = true; mo.setPointerCapture(e.pointerId); poserM(e); e.preventDefault(); });
  mo.addEventListener("pointermove", function(e){ if(tm && !PINCE) poserM(e); });
  mo.addEventListener("pointerup", function(){ tm = false; memT1k(); });
  mo.addEventListener("pointercancel", function(){ tm = false; });
})();

function knobT1k(k, nom, etiq){
  return knobEm("t1k-k-" + k + "-" + nom, {min:0, max:1,
    get:function(){ return motifT1kCur().instr[k][nom]; },
    set:function(v){
      motifT1kCur().instr[k][nom] = v;
      enregistrerGesteT1k(k, nom, v);
      lcdT1k(String(Math.round(v*100)), T1K_INSTR[k].nom + " " + etiq, true);
      memT1k();
    }});
}
T1K_INSTR.forEach(function(V, k){
  [["tune","TUNE"],["c1",V.c1],["dec","DECAY"],["c2",V.c2],["mix","A/B"]].forEach(function(kn){
    T1K_KNOBS.push(knobT1k(k, kn[0], kn[1]));
  });
});
function knobFxT1k(id, obj, nom, etiq, maxi){
  return knobEm(id, {min:0, max:maxi === undefined ? 1 : maxi,
    get:function(){ return obj[nom]; },
    set:function(v){ obj[nom] = v; majFxT1k(); lcdT1k(String(Math.round(v*100)), etiq, true); memT1k(); }});
}
var kT1kFilt = knobFxT1k("t1k-k-filt", T1K.afx, "filt", "ANALOG FILTER");
var kT1kDrive = knobFxT1k("t1k-k-drive", T1K.afx, "drive", "ANALOG DRIVE");
var kT1kRev = knobFxT1k("t1k-k-rev", T1K.mfx, "rev", "REVERB");
var kT1kDly = knobFxT1k("t1k-k-dly", T1K.mfx, "dly", "DELAY");
var kT1kFb = knobFxT1k("t1k-k-fb", T1K.mfx, "fb", "FEEDBACK");
var kT1kVol = knobEm("t1k-k-vol", {min:0, max:1, get:function(){ return S.vol; },
  set:function(v){ S.vol = v; if(master && ctx) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
    lcdT1k(String(Math.round(v*100)), "VOLUME", true); saveSoon(); }});
var kT1kTempo = knobEm("t1k-k-tempo", {min:0, max:1, get:function(){ return (S.bpm - 30) / 270; },
  set:function(v){ S.bpm = Math.round(30 + v*270); lcdT1k(String(S.bpm), "TEMPO", true); saveSoon(); }});
function majKnobsT1k(){
  T1K_KNOBS.forEach(function(k){ k.maj(); });
  [kT1kFilt, kT1kDrive, kT1kRev, kT1kDly, kT1kFb, kT1kVol, kT1kTempo].forEach(function(k){ k.maj(); });
  var rails = document.querySelectorAll(".t1k-f");
  for(var i=0;i<rails.length;i++){
    var h = rails[i].clientHeight || 54;
    rails[i].querySelector("b").style.top =
      Math.round((1 - motifT1kCur().instr[+rails[i].dataset.f].niv) * (h - 13)) + "px";
  }
}

var t1kTmr = null;
function lcdT1k(v, l, fugace){
  var a = document.getElementById("t1k-val"), b = document.getElementById("t1k-lab");
  if(!a) return;
  a.textContent = v; b.textContent = l;
  clearTimeout(t1kTmr);
  if(fugace) t1kTmr = setTimeout(majLcdT1k, 1300);
}
function majLcdT1k(){
  var I = instrT1kSel();
  lcdT1k(T1K_INSTR[T1K.sel].nom, "PTN " + "ABCDEFGH".charAt(T1K.banq) + (T1K.cur + 1) +
    " · " + (I.mix < 0.02 ? "ANALOG" : I.mix > 0.98 ? "SAMPLE" : "A+B"));
}
function majT1k(){
  document.getElementById("t1k-longueur").value = String(motifT1kCur().longueurs[T1K.sel]);
  var motion = motifT1kCur().motionActive;
  document.getElementById("t1k-motion-active").textContent = motion ? "MOTION ON" : "MOTION OFF";
  document.getElementById("t1k-motion-active").setAttribute("aria-pressed", String(motion));
  document.getElementById("t1k-motion-active").classList.toggle("on", motion);
  document.getElementById("t1k-effacer-vars").disabled = S.run;
  document.getElementById("t1k-motion-rec").classList.toggle("on", T1K.motionRec);
  document.getElementById("t1k-motion-rec").setAttribute("aria-pressed", String(T1K.motionRec));
  document.getElementById("t1k-copier").disabled = S.run;
  document.getElementById("t1k-coller").disabled = S.run || !T1K.copie;
  document.getElementById("t1k-direction").value = motifT1kCur().direction[T1K.sel];
  document.getElementById("t1k-direction").disabled = S.run;
  document.getElementById("t1k-longueur").disabled = S.run;
  document.getElementById("t1k-last").disabled = S.run;
  curseurT1k();
  document.getElementById("t1k-banque").value = String(T1K.banq);
  document.getElementById("t1k-banque").disabled = S.run;
  document.getElementById("t1k-ptn").disabled = S.run;
  var m = motifT1kCur(), i;
  for(i=0;i<16;i++){
    t1kPas[i].classList.toggle("act", T1K.accent ? !!(m.acc[T1K.sel] & (1 << i))
                                                 : !!(m.pas[T1K.sel] & (1 << i)));
    t1kPas[i].classList.toggle("sub", (m.sub[T1K.sel][i] || 1) > 1);
    t1kPas[i].classList.toggle("hors", i >= longueurInstrumentT1k(m, T1K.sel));
    var proba = probabiliteT1k(m.prob[T1K.sel][i]);
    t1kPas[i].querySelector(".t1k-prob-val").textContent = T1K.params ? (m.reglages[T1K.sel][i] && typeof m.reglages[T1K.sel][i][T1K.paramNom] === "number" ? Math.round(m.reglages[T1K.sel][i][T1K.paramNom] * 100) + "%" : "BASE") : T1K.decalage ? texteRetardT1k(m.retard[T1K.sel][i]) : T1K.cycles ? m.cycle[T1K.sel][i] : proba + "%";
    t1kPas[i].classList.toggle("retarde", m.retard[T1K.sel][i] > 0 && !!(m.pas[T1K.sel] & (1 << i)));
    t1kPas[i].classList.toggle("cyclique", m.cycle[T1K.sel][i] !== "1:1" && !!(m.pas[T1K.sel] & (1 << i)));
    t1kPas[i].classList.toggle("aleatoire", proba < 100 && !!(m.pas[T1K.sel] & (1 << i)));
    t1kPas[i].setAttribute("aria-label", "Pas " + (i + 1) + " · " + ((m.pas[T1K.sel] & (1 << i)) ? "actif" : "inactif") + " · probabilité " + proba + "% · cycle " + m.cycle[T1K.sel][i] + " · retard " + texteRetardT1k(m.retard[T1K.sel][i]) + " de pas");
  }
  var pads = document.querySelectorAll(".t1k-pad");
  for(i=0;i<pads.length;i++){
    pads[i].classList.toggle("sel", i === T1K.sel);
    pads[i].classList.toggle("muet", m.solo >= 0 ? i !== m.solo : m.muet[i]);
    pads[i].classList.toggle("solo", i === m.solo);
    pads[i].textContent = T1K_INSTR[i].id.toUpperCase() + (i === m.solo ? " · SOLO" : m.solo >= 0 || m.muet[i] ? " · OFF" : "");
    pads[i].setAttribute("aria-label", T1K_INSTR[i].nom + (i === m.solo ? " · solo" : m.solo >= 0 || m.muet[i] ? " · séquence muette" : " · séquence active"));
  }
  document.getElementById("t1k-solo").classList.toggle("on", m.solo >= 0);
  document.getElementById("t1k-solo").setAttribute("aria-pressed", String(m.solo >= 0));
  document.getElementById("t1k-solo").textContent = m.solo === T1K.sel ? "QUITTER SOLO" : "SOLO " + T1K_INSTR[T1K.sel].id.toUpperCase();
  document.getElementById("t1k-muet").disabled = m.solo >= 0;
  document.getElementById("t1k-muet").classList.toggle("on", m.muet[T1K.sel]);
  document.getElementById("t1k-muet").setAttribute("aria-pressed", String(m.muet[T1K.sel]));
  document.getElementById("t1k-muet").textContent = m.muet[T1K.sel] ? "RÉACTIVER " + T1K_INSTR[T1K.sel].id.toUpperCase() : "MUTE " + T1K_INSTR[T1K.sel].id.toUpperCase();
  var grille = document.getElementById("t1k-pas"), change = grille.classList.contains("proba") !== (T1K.proba || T1K.cycles || T1K.decalage || T1K.params);
  grille.classList.toggle("proba", T1K.proba || T1K.cycles || T1K.decalage || T1K.params);
  document.getElementById("t1k-cycle").classList.toggle("on", T1K.cycles);
  document.getElementById("t1k-cycle").setAttribute("aria-pressed", String(T1K.cycles));
  document.getElementById("t1k-cycle-valeur").disabled = !T1K.cycles;
  document.getElementById("t1k-cycle-valeur").value = T1K.cycleValeur;
  document.getElementById("t1k-decalage").classList.toggle("on", T1K.decalage);
  document.getElementById("t1k-decalage").setAttribute("aria-pressed", String(T1K.decalage));
  document.getElementById("t1k-retard-valeur").disabled = !T1K.decalage;
  document.getElementById("t1k-retard-valeur").value = String(T1K.retardValeur);
  document.getElementById("t1k-params").classList.toggle("on", T1K.params);
  document.getElementById("t1k-params").setAttribute("aria-pressed", String(T1K.params));
  document.getElementById("t1k-param-nom").disabled = !T1K.params;
  document.getElementById("t1k-param-valeur").disabled = !T1K.params;
  document.getElementById("t1k-param-nom").value = T1K.paramNom;
  document.getElementById("t1k-param-valeur").value = T1K.paramValeur === null ? "base" : String(Math.round(T1K.paramValeur * 100));
  var bp = document.getElementById("t1k-proba"); bp.classList.toggle("on", T1K.proba); bp.setAttribute("aria-pressed", String(T1K.proba));
  document.getElementById("t1k-proba-valeur").disabled = !T1K.proba;
  document.getElementById("t1k-proba-valeur").value = String(T1K.probValeur);
  document.getElementById("t1k-proba-aide").textContent = T1K.params ? "CHOISIR PARAMÈTRE ET VALEUR · TOUCHER LES PAS · BASE POUR EFFACER" : T1K.decalage ? "RETARD EN FRACTION DE PAS · CHOISIR PUIS TOUCHER LES PAS" : T1K.cycles ? "A:B = TOUR A SUR B · CHOISIR PUIS TOUCHER LES PAS" : T1K.proba ? "CHOISIR UN % PUIS TOUCHER LES PAS · " + T1K_INSTR[T1K.sel].nom : "PROBABILITÉ : VARIER LES COUPS À CHAQUE TOUR";
  if(change && S.modele === "t1k") fit();
  document.getElementById("t1k-sub").classList.toggle("on", T1K.sub);
  document.getElementById("t1k-accent").classList.toggle("on", T1K.accent);
  document.getElementById("t1k-rec").classList.toggle("on", T1K.rec);
  document.getElementById("t1k-afx").classList.toggle("on", T1K.afx.on);
  document.getElementById("t1k-fill").classList.toggle("on", T1K.fill);
  document.getElementById("t1k-last").textContent = "LAST " + m.last;
  document.getElementById("t1k-ptn").value = String(T1K.cur);
  document.getElementById("t1k-ma").classList.toggle("on", !!T1K.mA);
  document.getElementById("t1k-mb").classList.toggle("on", !!T1K.mB);
  majLcdT1k();
}
function copieInstrT1k(){
  return motifT1kCur().instr.map(function(I){
    return {tune:I.tune, dec:I.dec, c1:I.c1, c2:I.c2, niv:I.niv, mix:I.mix, pech:I.pech};
  });
}
function memT1k(){
  memoire.t1k = {banques:8, cur:T1K.cur, banq:T1K.banq, sel:T1K.sel, morph:T1K.morph,
    mA:T1K.mA, mB:T1K.mB, afx:T1K.afx, mfx:T1K.mfx,
    motifs:T1K.motifs.map(function(m){
      return {longueurs:m.longueurs.slice(), motionActive:m.motionActive, reglages:m.reglages.map(function(p){return p.map(lireReglagesT1k);}), solo:m.solo, muet:m.muet.slice(), last:m.last, direction:m.direction.slice(), pas:m.pas.slice(), acc:m.acc.slice(), sub:m.sub.map(function(p){return p.slice();}), prob:m.prob.map(function(p){return p.slice();}), cycle:m.cycle.map(function(p){return p.slice();}), retard:m.retard.map(function(p){return p.slice();}),
              instr:m.instr.map(function(I){
                return {tune:I.tune, dec:I.dec, c1:I.c1, c2:I.c2, niv:I.niv, mix:I.mix,
                        ech:I.ech, pech:I.pech};
              })};
    })};
  sauverMachine("t1k");
}
function chargerT1k(){
  T1K.motionRec = false;
  T1K.copie = null;
  resetLectureT1k();
  T1K.motifs = [];
  for(var i=0;i<128;i++) T1K.motifs.push(motifT1k(i < 2 ? i : 9));
  T1K.cur = 0; T1K.banq = 0; T1K.sel = 0; T1K.sub = false; T1K.accent = false; T1K.proba = false; T1K.probValeur = 100; T1K.cycles = false; T1K.cycleValeur = "1:1"; T1K.decalage = false; T1K.retardValeur = 0; T1K.params = false; T1K.paramNom = "tune"; T1K.paramValeur = null;
  var m = memLire("t1k");
  if(m){
    if(Array.isArray(m.motifs) && (m.motifs.length === 16 || m.motifs.length === 128)){
      var anciens = m.motifs.length === 16;
      for(var k=0;k<128;k++) T1K.motifs[k] = lireMotifT1k(m.motifs[anciens ? k % 16 : k]);
    }
    T1K.cur = Math.floor(borneT1k(m.cur, 0, 15, 0));
    T1K.banq = Math.floor(borneT1k(m.banq, 0, 7, 0));
    T1K.sel = Math.floor(borneT1k(m.sel, 0, 9, 0));
    T1K.morph = borneT1k(m.morph, 0, 1, 0);
    if(m.mA) T1K.mA = m.mA;
    if(m.mB) T1K.mB = m.mB;
    if(m.afx) for(var a in T1K.afx) if(m.afx[a] !== undefined) T1K.afx[a] = m.afx[a];
    if(m.mfx) for(var f in T1K.mfx) if(typeof m.mfx[f] === "number") T1K.mfx[f] = m.mfx[f];
  }
}

document.getElementById("t1k-start").addEventListener("click", function(){
  audioInit();
  if(S.run){ stop(); H.stop(); } else { step = 0; start(); H.start(); }
  this.classList.toggle("on", S.run); majT1k();
});
document.getElementById("t1k-stop").addEventListener("click", function(){
  stop(); H.stop();
  document.getElementById("t1k-start").classList.remove("on");
});
document.getElementById("t1k-sub").addEventListener("click", function(){
  T1K.sub = !T1K.sub; if(T1K.sub){ T1K.params = false; T1K.decalage = false; T1K.cycles = false; T1K.accent = false; T1K.proba = false; }
  majT1k(); H.inter();
  signal(T1K.sub ? "LES TOUCHES RÈGLENT LES SOUS-PAS" : "LES TOUCHES POSENT LES PAS");
});
document.getElementById("t1k-accent").addEventListener("click", function(){
  T1K.accent = !T1K.accent; if(T1K.accent){ T1K.params = false; T1K.decalage = false; T1K.cycles = false; T1K.sub = false; T1K.proba = false; }
  majT1k(); H.inter();
});
document.getElementById("t1k-direction").addEventListener("change", function(){ choisirDirectionT1k(this.value); });
document.getElementById("t1k-proba").addEventListener("click", function(){
  T1K.proba = !T1K.proba;
  if(T1K.proba){ T1K.params = false; T1K.decalage = false; T1K.cycles = false; T1K.sub = false; T1K.accent = false; }
  majT1k(); H.inter();
});
(function(){
  var liste = document.getElementById("t1k-proba-valeur");
  for(var p=0;p<=100;p+=5){
    var o = document.createElement("option"); o.value = String(p); o.textContent = p + "%"; liste.appendChild(o);
  }
  liste.value = "100";
  liste.addEventListener("change", function(){ T1K.probValeur = probabiliteT1k(+liste.value); });
})();
document.getElementById("t1k-afx").addEventListener("click", function(){
  T1K.afx.on = !T1K.afx.on; majFxT1k(); majT1k(); memT1k(); H.inter();
});
document.getElementById("t1k-fill").addEventListener("click", function(){
  audioInit();
  T1K.fill = true; majT1k(); H.inter();
  if(!S.run){ step = 0; start(); H.start(); document.getElementById("t1k-start").classList.add("on"); }
});
document.getElementById("t1k-last").addEventListener("click", function(){
  if(S.run){ signal("ARRÊTEZ PLAY POUR CHANGER LA LONGUEUR"); return; }
  resetLectureT1k();
  var m = motifT1kCur(), v = [16, 12, 8, 4];
  m.last = v[(v.indexOf(m.last) + 1) % v.length];
  majT1k(); memT1k(); H.cran();
});
document.getElementById("t1k-ptn").addEventListener("change", function(){
  if(choisirMotifT1k(T1K.banq, +this.value)) H.inter();
});
(function(){
  var banque = document.getElementById("t1k-banque");
  for(var k=0;k<8;k++){
    var option = document.createElement("option"); option.value = String(k); option.textContent = "BANQUE " + "ABCDEFGH"[k]; banque.appendChild(option);
  }
  banque.addEventListener("change", function(){ if(choisirMotifT1k(+banque.value, T1K.cur)) H.inter(); });
})();
document.getElementById("t1k-ma").addEventListener("click", function(){
  if(T1K.mA){ T1K.mA = null; signal("ÉTAT A OUBLIÉ · LES POTARDS REPRENNENT LA MAIN"); }
  else { T1K.mA = copieInstrT1k(); signal("ÉTAT A MÉMORISÉ POUR LE MORPHING"); }
  majT1k(); memT1k(); H.inter();
});
document.getElementById("t1k-mb").addEventListener("click", function(){
  if(T1K.mB){ T1K.mB = null; signal("ÉTAT B OUBLIÉ · LES POTARDS REPRENNENT LA MAIN"); }
  else { T1K.mB = copieInstrT1k(); signal("ÉTAT B MÉMORISÉ · LE CURSEUR PASSE DE L'UN À L'AUTRE"); }
  majT1k(); memT1k(); H.inter();
});
document.getElementById("t1k-ech").addEventListener("click", function(){
  audioInit(); banqueEs();
  var l = listeEch(), I = instrT1kSel();
  var i = l.indexOf(I.ech);
  I.ech = l[((i < 0 ? 0 : i) + 1) % l.length];
  if(I.mix < 0.1) I.mix = 0.5;
  voixT1k(maintenantAudio() + 0.01, T1K.sel, true);
  majT1k(); majKnobsT1k(); memT1k(); H.cran();
  signal("COUCHE B : " + nomBib(I.ech));
});
document.getElementById("t1k-rec").addEventListener("click", function(){
  T1K.rec = !T1K.rec; majT1k(); H.inter();
  signal(T1K.rec ? "FRAPPEZ UN INSTRUMENT PENDANT LA LECTURE" : "ENREGISTREMENT COUPÉ");
});
document.getElementById("t1k-notice").addEventListener("click", function(){ ouvrirNotice(); });

var unitT1k = document.getElementById("unit-t1k");
function activerT1k(){
  stop();
  S.modele = "t1k";
  MACHINE = MACHINE_T1K;
  poserMachine("t1k");
  audioInit(); banqueEs(); chargerEchs();
  chargerT1k();
  debrancherTout(T1K.noeuds); T1K.noeuds = {}; T1K.ohGain = null;
  bâtirT1k();
  majT1k(); majKnobsT1k();
  actif = unitT1k;
  save(); fit(); setTimeout(function(){ fit(); majKnobsT1k(); }, 120);
}


/* v197 : peinture des cycles sans activer ni effacer les pas. */
document.getElementById("t1k-cycle").addEventListener("click", function(){
  T1K.cycles = !T1K.cycles;
  if(T1K.cycles){ T1K.params = false; T1K.decalage = false; T1K.proba = false; T1K.sub = false; T1K.accent = false; }
  majT1k(); H.cran();
});
document.getElementById("t1k-cycle-valeur").addEventListener("change", function(e){ T1K.cycleValeur = cycleT1k(e.target.value); });

/* v198 : retard déterministe du coup et de tous ses sous-pas. */
document.getElementById("t1k-decalage").addEventListener("click", function(){
  T1K.decalage = !T1K.decalage;
  if(T1K.decalage){ T1K.params = false; T1K.cycles = false; T1K.proba = false; T1K.sub = false; T1K.accent = false; }
  majT1k(); H.cran();
});
document.getElementById("t1k-retard-valeur").addEventListener("change", function(e){ T1K.retardValeur = retardT1k(+e.target.value); });

document.getElementById("t1k-copier").addEventListener("click", copierMotifT1k);
document.getElementById("t1k-coller").addEventListener("click", collerMotifT1k);

document.getElementById("t1k-muet").addEventListener("click", basculerMuetT1k);

document.getElementById("t1k-solo").addEventListener("click", basculerSoloT1k);

document.getElementById("t1k-params").addEventListener("click", function(){
  T1K.params = !T1K.params;
  if(T1K.params){ T1K.sub = false; T1K.accent = false; T1K.proba = false; T1K.cycles = false; T1K.decalage = false; }
  majT1k(); H.cran();
});
document.getElementById("t1k-param-nom").addEventListener("change", function(e){ T1K.paramNom = e.target.value; majT1k(); });
document.getElementById("t1k-param-valeur").addEventListener("change", function(e){ T1K.paramValeur = e.target.value === "base" ? null : +e.target.value / 100; });

document.getElementById("t1k-motion-rec").addEventListener("click", function(){
  T1K.motionRec = !T1K.motionRec;
  majT1k();
  signal(T1K.motionRec ? "MOTION REC ARMÉ · LANCEZ PLAY ET BOUGEZ LES POTARDS" : "MOTION REC DÉSARMÉ");
});

document.getElementById("t1k-motion-active").addEventListener("click", basculerMotionT1k);
document.getElementById("t1k-effacer-vars").addEventListener("click", effacerVariationsT1k);

document.getElementById("t1k-longueur").addEventListener("change", function(e){ choisirLongueurT1k(+e.target.value); });
