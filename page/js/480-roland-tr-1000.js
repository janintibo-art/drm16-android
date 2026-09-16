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
  var m = {pas:[], acc:[], sub:[], last:16, instr:[]};
  for(var k=0;k<10;k++){
    m.pas.push(0); m.acc.push(0);
    m.sub.push([]);
    for(var s=0;s<16;s++) m.sub[k].push(1);
    m.instr.push(instrT1k(k));
  }
  if(n === 0){ m.pas[0] = 0x1111; m.pas[1] = 0x0440; m.pas[6] = 0x5555; m.acc[0] = 0x0001; }
  else if(n === 1){ m.pas[0] = 0x0521; m.pas[1] = 0x0440; m.pas[6] = 0xFFFF;
                    m.pas[7] = 0x4000; m.sub[6][10] = 3; }
  return m;
}
var T1K = {motifs:[], cur:0, banq:0, sel:0, pos:-1, noeuds:{}, rec:false,
           morph:0, mA:null, mB:null, sub:false, accent:false, layer:0,
           afx:{on:false, filt:0.8, drive:0.25},
           mfx:{rev:0.25, revT:0.4, dly:0.2, dlyT:0.35, fb:0.3},
           fill:false, ohGain:null};
for(var t1z=0; t1z<16; t1z++) T1K.motifs.push(motifT1k(t1z < 2 ? t1z : 9));
function motifT1kCur(){ return T1K.motifs[T1K.cur]; }
function instrT1kSel(){ return motifT1kCur().instr[T1K.sel]; }

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
function voixT1k(t, k, acc){
  bâtirT1k();
  var V = T1K_INSTR[k], n = T1K.noeuds;
  var niv = mv("niv", valT1k(k, "niv")) * (acc ? 1 : 0.66);
  var mixAB = valT1k(k, "mix");
  var tune = valT1k(k, "tune"), dec = valT1k(k, "dec");
  var c1 = valT1k(k, "c1"), c2 = valT1k(k, "c2");

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
      src.playbackRate.value = Math.pow(2, (valT1k(k, "pech") - 0.5) * 2);
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
    var j = pasLePlusProche(T1K.pos, m.last || 16);
    if(j >= 0){
      m.pas[k] |= (1 << j);
      if(acc) m.acc[k] |= (1 << j);
      majT1k(); memT1k();
    }
  }
}

/* ---------- séquenceur, avec sous-pas ---------- */
var T1K_FILL = [0x8888, 0x2222, 0x0F00, 0x00F0, 0, 0x1010, 0xAAAA, 0x0100, 0x0001, 0];
function scheduleT1k(i, t){
  var CHARGE_N = ouvrirPas();
  var m = motifT1kCur();
  if(i >= m.last) return;
  var pas = T1K.fill ? T1K_FILL : m.pas;
  for(var k=0;k<10;k++){
    if(!(pas[k] & (1 << i))) continue;
    var acc = !!(m.acc[k] & (1 << i));
    var sub = T1K.fill ? 1 : (m.sub[k][i] || 1);
    for(var r=0;r<sub;r++) CHARGE_N++, voixT1k(t + (stepDur() * r / sub), k, acc && r === 0);
  }
  if(!cache) queue.push({i:i, t:t});
  attenuerVoie("t1k", CHARGE_N, t);
}
var t1kPas = [];
function beatT1k(i){
  T1K.pos = i;
  for(var j=0;j<16;j++) t1kPas[j].classList.toggle("cur", j === i);
}
function arretT1k(){
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
    pas.appendChild(b);
    t1kPas.push(b);
  }
  pas.addEventListener("click", function(e){
    var b2 = e.target.closest("button");
    if(!b2) return;
    var i2 = +b2.dataset.i, m = motifT1kCur(), k = T1K.sel;
    if(T1K.sub){
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
  var m = motifT1kCur(), i;
  for(i=0;i<16;i++){
    t1kPas[i].classList.toggle("act", T1K.accent ? !!(m.acc[T1K.sel] & (1 << i))
                                                 : !!(m.pas[T1K.sel] & (1 << i)));
    t1kPas[i].classList.toggle("sub", (m.sub[T1K.sel][i] || 1) > 1);
    t1kPas[i].classList.toggle("hors", i >= m.last);
  }
  var pads = document.querySelectorAll(".t1k-pad");
  for(i=0;i<pads.length;i++) pads[i].classList.toggle("sel", i === T1K.sel);
  document.getElementById("t1k-sub").classList.toggle("on", T1K.sub);
  document.getElementById("t1k-accent").classList.toggle("on", T1K.accent);
  document.getElementById("t1k-rec").classList.toggle("on", T1K.rec);
  document.getElementById("t1k-afx").classList.toggle("on", T1K.afx.on);
  document.getElementById("t1k-fill").classList.toggle("on", T1K.fill);
  document.getElementById("t1k-last").textContent = "LAST " + m.last;
  document.getElementById("t1k-ptn").textContent = "PTN " + "ABCDEFGH".charAt(T1K.banq) + (T1K.cur + 1);
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
  memoire.t1k = {cur:T1K.cur, banq:T1K.banq, sel:T1K.sel, morph:T1K.morph,
    mA:T1K.mA, mB:T1K.mB, afx:T1K.afx, mfx:T1K.mfx,
    motifs:T1K.motifs.map(function(m){
      return {last:m.last, pas:m.pas, acc:m.acc, sub:m.sub,
              instr:m.instr.map(function(I){
                return {tune:I.tune, dec:I.dec, c1:I.c1, c2:I.c2, niv:I.niv, mix:I.mix,
                        ech:I.ech, pech:I.pech};
              })};
    })};
  sauverMachine("t1k");
}
function chargerT1k(){
  T1K.motifs = [];
  for(var i=0;i<16;i++) T1K.motifs.push(motifT1k(i < 2 ? i : 9));
  T1K.cur = 0; T1K.sel = 0; T1K.sub = false; T1K.accent = false;
  var m = memLire("t1k");
  if(m){
    if(m.motifs && m.motifs.length === 16){
      T1K.motifs = m.motifs.map(function(o){
        var r = motifT1k(9);
        r.last = o.last || 16;
        if(o.pas) r.pas = o.pas;
        if(o.acc) r.acc = o.acc;
        if(o.sub) r.sub = o.sub;
        (o.instr || []).forEach(function(I, k){
          if(k >= 10) return;
          for(var q in I) if(r.instr[k][q] !== undefined) r.instr[k][q] = I[q];
        });
        return r;
      });
    }
    ["cur","banq","sel","morph"].forEach(function(c){ if(typeof m[c] === "number") T1K[c] = m[c]; });
    if(m.mA) T1K.mA = m.mA;
    if(m.mB) T1K.mB = m.mB;
    if(m.afx) for(var a in T1K.afx) if(m.afx[a] !== undefined) T1K.afx[a] = m.afx[a];
    if(m.mfx) for(var f in T1K.mfx) if(typeof m.mfx[f] === "number") T1K.mfx[f] = m.mfx[f];
  }
}

document.getElementById("t1k-start").addEventListener("click", function(){
  audioInit();
  if(S.run){ stop(); H.stop(); } else { step = 0; start(); H.start(); }
  this.classList.toggle("on", S.run);
});
document.getElementById("t1k-stop").addEventListener("click", function(){
  stop(); H.stop();
  document.getElementById("t1k-start").classList.remove("on");
});
document.getElementById("t1k-sub").addEventListener("click", function(){
  T1K.sub = !T1K.sub; if(T1K.sub) T1K.accent = false;
  majT1k(); H.inter();
  signal(T1K.sub ? "LES TOUCHES RÈGLENT LES SOUS-PAS" : "LES TOUCHES POSENT LES PAS");
});
document.getElementById("t1k-accent").addEventListener("click", function(){
  T1K.accent = !T1K.accent; if(T1K.accent) T1K.sub = false;
  majT1k(); H.inter();
});
document.getElementById("t1k-afx").addEventListener("click", function(){
  T1K.afx.on = !T1K.afx.on; majFxT1k(); majT1k(); memT1k(); H.inter();
});
document.getElementById("t1k-fill").addEventListener("click", function(){
  audioInit();
  T1K.fill = true; majT1k(); H.inter();
  if(!S.run){ step = 0; start(); H.start(); document.getElementById("t1k-start").classList.add("on"); }
});
document.getElementById("t1k-last").addEventListener("click", function(){
  var m = motifT1kCur(), v = [16, 12, 8, 4];
  m.last = v[(v.indexOf(m.last) + 1) % v.length];
  majT1k(); memT1k(); H.cran();
});
document.getElementById("t1k-ptn").addEventListener("click", function(){
  memT1k();
  T1K.cur = (T1K.cur + 1) % 16;
  if(T1K.cur === 0) T1K.banq = (T1K.banq + 1) % 8;
  majT1k(); majKnobsT1k(); H.inter();
});
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

