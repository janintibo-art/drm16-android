/* ===================== ARTURIA DRUMBRUTE IMPACT =====================
   Huit voix analogiques, et une chose qu'aucune autre machine d'ici ne fait :
   la polyrythmie. Chaque piste garde sa propre longueur, et les motifs se
   décalent les uns par rapport aux autres au lieu de tourner ensemble.
   Le bouton COLOR ouvre une seconde couche de réglages sur les mêmes potards. */
var DBI_VOIX = [
  {id:"kick",  nom:"KICK",     kns:[["dec","DECAY"],["pit","PITCH"],["niv","LEVEL"]],
                               col:[["drive","DRIVE"]]},
  {id:"snr1",  nom:"SNARE 1",  kns:[["dec","DECAY"],["ton","TONE/SNAP"],["niv","LEVEL"]],
                               col:[["body","BODY"]]},
  {id:"snr2",  nom:"SNARE 2",  kns:[["dec","DECAY"],["ton","TONE"],["niv","LEVEL"]],
                               col:[["clap","CLAP"]]},
  {id:"tom",   nom:"TOM HI/LO",kns:[["pit","PITCH"],["niv","LEVEL"]],
                               col:[["dec","DECAY"]], type:["HI","LOW"]},
  {id:"cym",   nom:"CYM/COW",  kns:[["dec","CYM DEC"],["niv","LEVEL"]],
                               col:[["ton","CYM TONE"]], type:["CYM","COW"]},
  {id:"chh",   nom:"CLOSED HAT",kns:[["ton","HATS TONE"],["niv","LEVEL"]],
                               col:[["dec","CH DECAY"]]},
  {id:"ohh",   nom:"OPEN HAT", kns:[["dec","OH DECAY"],["niv","LEVEL"]],
                               col:[["harm","HARMONICS"]]},
  {id:"fm",    nom:"FM DRUM",  kns:[["mpit","MOD PITCH"],["fmamt","FM AMT"],["dec","DECAY"],
                                    ["pit","CARRIER"],["niv","LEVEL"]],
                               col:[["penv","PITCH ENV"]]}
];
var DBI_MIDI = [36, 38, 40, 45, 49, 42, 46, 39];
function pisteDbi(i){
  return {pas:0, acc:0, len:16,
          p:{dec:0.5, pit:0.5, ton:0.5, niv:0.8, drive:0, body:0.3, clap:0,
             harm:0.3, mpit:0.5, fmamt:0.4, penv:0.3},
          type:0};
}
function motifDbi(n){
  var m = {pistes:[], last:16};
  for(var i=0;i<8;i++) m.pistes.push(pisteDbi(i));
  if(n === 0){
    m.pistes[0].pas = 0x1111; m.pistes[1].pas = 0x0440;
    m.pistes[5].pas = 0x5555; m.pistes[0].acc = 0x0001;
  } else if(n === 1){
    m.pistes[0].pas = 0x0421; m.pistes[2].pas = 0x0110;
    m.pistes[5].pas = 0xFFFF; m.pistes[6].pas = 0x4000;
    m.pistes[7].pas = 0x0080;
  }
  return m;
}
var DBI = {motifs:[], cur:0, sel:0, color:false, poly:false, roller:false, rec:false,
           swing:0, random:0, drive:0.25, dist:false, accent:false,
           pos:-1, noeuds:{}, ohGain:null, distNode:null};
for(var dbz=0; dbz<16; dbz++) DBI.motifs.push(motifDbi(dbz < 2 ? dbz : 9));

function motifDbiCur(){ return DBI.motifs[DBI.cur]; }
function pisteDbiSel(){ return motifDbiCur().pistes[DBI.sel]; }

/* ---------- sortie, avec la distorsion de l'appareil ---------- */
function sortieDbi(){
  if(!DBI.noeuds.out){
    var g = ctx.createGain();
    var d = ctx.createWaveShaper();
    var n = 1025, c = new Float32Array(n);
    for(var i=0;i<n;i++){
      var x = i * 2 / (n - 1) - 1;
      c[i] = Math.tanh(x * 3.2);
    }
    d.curve = c; d.oversample = saturationDeVoie(d);
    var sec = ctx.createGain(), hum = ctx.createGain();
    g.connect(sec); sec.connect(busSet("dbi") || master);
    g.connect(d); d.connect(hum); hum.connect(busSet("dbi") || master);
    DBI.noeuds.out = g; DBI.noeuds.sec = sec; DBI.noeuds.hum = hum;
    majDistDbi();
  }
  return DBI.noeuds.out;
}
function majDistDbi(){
  if(!DBI.noeuds.sec) return;
  var m = DBI.dist ? DBI.drive : 0;
  DBI.noeuds.sec.gain.value = 1 - m * 0.8;
  DBI.noeuds.hum.gain.value = m * 0.9;
}
function voixDbi(t, k, acc){
  var V = DBI_VOIX[k], P = motifDbiCur().pistes[k];
  var dest = pasVoie(sortieDbi());
  var niv = mv("niv", P.p.niv) * (acc ? 1 : 0.68);
  var g = ctx.createGain();
  g.connect(dest);
  var p = P.p;

  if(V.id === "kick"){
    var f0 = 36 + p.pit * 46, dec = 0.12 + p.dec * 1.0;
    var o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(f0 * 5, t);
    o.frequency.exponentialRampToValueAtTime(f0, t + 0.03);
    var sh = ctx.createWaveShaper();
    var n2 = 513, c2 = new Float32Array(n2), dr = 1 + p.drive * 6;
    for(var i=0;i<n2;i++){ var x2 = i*2/(n2-1)-1; c2[i] = Math.tanh(x2*dr)/Math.tanh(dr); }
    sh.curve = c2; sh.oversample = "2x";   /* v153 */
    trEnv(g, t, niv * 1.15, dec, 0.001);
    o.connect(sh); sh.connect(g); o.start(t); o.stop(t + dec + 0.05);
  }
  else if(V.id === "snr1" || V.id === "snr2"){
    var d2 = 0.06 + p.dec * 0.3;
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = 1300 + p.ton * 3400; bp.Q.value = 0.7;
    var nb = trBruit(t, d2);
    trEnv(g, t, niv * 1.15, d2, 0.0008);
    nb.connect(bp); bp.connect(g);
    var corps = (V.id === "snr1") ? p.body : 0.25;
    if(corps > 0.02){
      var o1 = ctx.createOscillator(); o1.type = "triangle";
      o1.frequency.value = (V.id === "snr1" ? 200 : 250) * (0.8 + p.ton * 0.5);
      var gc = ctx.createGain();
      trEnv(gc, t, niv * corps * 0.9, d2 * 0.5, 0.0008);
      o1.connect(gc); gc.connect(dest); o1.start(t); o1.stop(t + d2);
    }
    if(V.id === "snr2" && p.clap > 0.02){      /* la couche COLOR de la caisse 2 est un clap */
      var bc = ctx.createBiquadFilter(); bc.type = "bandpass";
      bc.frequency.value = 1100; bc.Q.value = 1.5;
      var nc = trBruit(t, 0.25), gcl = ctx.createGain();
      nc.connect(bc); bc.connect(gcl); gcl.connect(dest);
      gcl.gain.setValueAtTime(0.0001, t);
      [0, 0.009, 0.018].forEach(function(o3){
        gcl.gain.setValueAtTime(niv * p.clap * 1.6, t + o3);
        gcl.gain.exponentialRampToValueAtTime(0.0001, t + o3 + 0.008);
      });
      gcl.gain.setValueAtTime(niv * p.clap, t + 0.028);
      gcl.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    }
  }
  else if(V.id === "tom"){
    var base = (P.type ? 78 : 145) * Math.pow(2, (p.pit - 0.5) * 1.2);
    var dt = 0.16 + p.dec * 0.7;
    var ot = ctx.createOscillator(); ot.type = "sine";
    ot.frequency.setValueAtTime(base * 2.2, t);
    ot.frequency.exponentialRampToValueAtTime(base, t + 0.05);
    trEnv(g, t, niv * 1.15, dt, 0.0015);
    ot.connect(g); ot.start(t); ot.stop(t + dt + 0.05);
  }
  else if(V.id === "cym"){
    if(P.type){                                 /* cowbell */
      var som = ctx.createGain(); som.gain.value = 0.4;
      [540, 800].forEach(function(f){
        var ob = ctx.createOscillator(); ob.type = "square"; ob.frequency.value = f;
        ob.connect(som); ob.start(t); ob.stop(t + 0.3);
      });
      var bb = ctx.createBiquadFilter(); bb.type = "bandpass"; bb.frequency.value = 2600; bb.Q.value = 1.2;
      trEnv(g, t, niv * 1.4, 0.22, 0.001);
      som.connect(bb); bb.connect(g);
    } else {
      var dc = 0.35 + p.dec * 2.2;
      var mc = trMetal(t, dc, 300 + p.ton * 380, 0.34);
      var hc = ctx.createBiquadFilter(); hc.type = "highpass";
      hc.frequency.value = 2600 + p.ton * 4200;
      trEnv(g, t, niv * 1.1, dc, 0.001);
      mc.connect(hc); hc.connect(g);
    }
  }
  else if(V.id === "chh" || V.id === "ohh"){
    var dh = (V.id === "chh") ? (0.018 + p.dec * 0.1) : (0.1 + p.dec * 1.0);
    var harm = (V.id === "ohh") ? p.harm : 0.35;
    var mh = trMetal(t, dh, 700 + harm * 700, 0.34);
    var hh2 = ctx.createBiquadFilter(); hh2.type = "highpass";
    hh2.frequency.value = 6000 + (V.id === "chh" ? p.ton : 0.5) * 5000;
    trEnv(g, t, niv * 1.35, dh, 0.0008);
    mh.connect(hh2); hh2.connect(g);
    if(V.id === "chh" && DBI.ohGain){
      try{ DBI.ohGain.gain.cancelScheduledValues(t);
           DBI.ohGain.gain.setTargetAtTime(0.0001, t, 0.004); }catch(e){}
    }
    if(V.id === "ohh") DBI.ohGain = g;
  }
  else {                                        /* FM DRUM : une vraie modulation de fréquence */
    var porteuse = 40 * Math.pow(2, p.pit * 3.2);
    var modulante = 40 * Math.pow(2, p.mpit * 3.6);
    var df = 0.08 + p.dec * 0.9;
    var oc2 = ctx.createOscillator(); oc2.type = "sine";
    var om = ctx.createOscillator(); om.type = "sine";
    om.frequency.value = modulante;
    var gm = ctx.createGain();
    gm.gain.setValueAtTime(modulante * p.fmamt * 9, t);
    gm.gain.exponentialRampToValueAtTime(Math.max(1, modulante * p.fmamt * 0.4), t + df * 0.6);
    om.connect(gm); gm.connect(oc2.frequency);
    oc2.frequency.setValueAtTime(porteuse * (1 + p.penv * 3), t);
    oc2.frequency.exponentialRampToValueAtTime(porteuse, t + 0.02 + p.penv * 0.12);
    trEnv(g, t, niv * 1.1, df, 0.001);
    oc2.connect(g);
    om.start(t); oc2.start(t);
    om.stop(t + df + 0.05); oc2.stop(t + df + 0.05);
  }
  midiNoteA(DBI_MIDI[k], t, acc ? 1 : 0.7, MIDI.canal, 0.12);
}
function frapperDbi(k, acc){
  audioInit();
  if(!ctx) return;
  voixDbi(maintenantAudio() + 0.005, k, acc);
  if(S.run && DBI.rec){
    var P = motifDbiCur().pistes[k];
    var j = pasLePlusProche(DBI.pos, P.len || 16);
    if(j >= 0){
      P.pas |= (1 << j);
      if(acc) P.acc |= (1 << j);
      majDbi(); memDbi();
    }
  }
}

/* ---------- séquenceur, avec polyrythmie ---------- */
function longueurDbi(){
  var m = motifDbiCur();
  if(!DBI.poly) return m.last;
  /* en polyrythmie on parcourt le plus petit commun multiple, jusqu'à 64 pas,
     pour que le cycle complet se referme au bon endroit */
  var l = 1;
  for(var k=0;k<8;k++){
    var n = m.pistes[k].len || 16;
    l = ppcmDbi(l, n);
    if(l > 64) return 64;
  }
  return Math.max(1, l);
}
function ppcmDbi(a, b){
  var x = a, y = b;
  while(y){ var t = y; y = x % y; x = t; }
  return a / x * b;
}
function scheduleDbi(i, t){
  var CHARGE_N = ouvrirPas();
  var m = motifDbiCur();
  if(DBI.swing && i % 2 === 1) t += stepDur() * DBI.swing * 0.5;
  for(var k=0;k<8;k++){
    var P = m.pistes[k];
    var lg = DBI.poly ? (P.len || 16) : m.last;
    var s = i % lg;
    var joue = !!(P.pas & (1 << s));
    if(DBI.random > 0.01){
      /* le potard RANDOM ôte des coups et en ajoute, comme sur l'appareil */
      if(joue && Math.random() < DBI.random * 0.35) joue = false;
      else if(!joue && Math.random() < DBI.random * 0.12) joue = true;
    }
    if(!joue) continue;
    var acc = !!(P.acc & (1 << s));
    CHARGE_N++, voixDbi(t, k, acc);
    if(DBI.roller && k === DBI.sel){
      CHARGE_N++, voixDbi(t + stepDur() / 2, k, false);     /* roulement sur la piste choisie */
    }
  }
  if(!cache) queue.push({i:i, t:t});
  attenuerVoie("dbi", CHARGE_N, t);
}
var dbiPas = [];
function beatDbi(i){
  DBI.pos = i;
  var lg = DBI.poly ? (pisteDbiSel().len || 16) : motifDbiCur().last;
  for(var j=0;j<16;j++) dbiPas[j].classList.toggle("cur", j === (i % lg));
}
function arretDbi(){
  DBI.pos = -1;
  for(var j=0;j<16;j++) dbiPas[j].classList.remove("cur");
  var b = document.getElementById("dbi-play");
  if(b) b.classList.remove("on");
}
function boucleDbi(){ }
var MACHINE_DBI = {schedule:scheduleDbi, beat:beatDbi, arret:arretDbi, boucle:boucleDbi,
                   longueur:longueurDbi};

/* ---------- interface ---------- */
var DBI_KNOBS = [];
(function construireDbi(){
  var v = document.getElementById("dbi-voix");
  DBI_VOIX.forEach(function(V, k){
    var d = document.createElement("div");
    d.className = "dbi-v";
    var h = '<b>' + V.nom + '</b>';
    V.kns.concat(V.col).forEach(function(kn){
      var estCol = V.col.indexOf(kn) >= 0;
      h += '<div class="dbi-kn" data-col="' + (estCol ? 1 : 0) +
           '" id="dbi-k-' + k + '-' + kn[0] + '">' +
           '<div class="bt"><i></i></div><em>' + kn[1] + '</em></div>';
    });
    if(V.type) h += '<button class="dbi-type" data-t="' + k + '" style="width:100%;padding:6px 2px;font-size:7px">TYPE</button>';
    h += '<button class="dbi-pad" data-p="' + k + '">' + V.nom + '</button>';
    d.innerHTML = h;
    v.appendChild(d);
  });
  v.addEventListener("click", function(e){
    var pad = e.target.closest(".dbi-pad");
    if(pad){
      audioInit();
      DBI.sel = +pad.dataset.p;
      frapperDbi(DBI.sel, DBI.accent);
      majDbi(); majKnobsDbi(); H.cran();
      return;
    }
    var ty = e.target.closest(".dbi-type");
    if(ty){
      var P = motifDbiCur().pistes[+ty.dataset.t];
      P.type = P.type ? 0 : 1;
      majDbi(); memDbi(); H.cran();
    }
  });

  var pas = document.getElementById("dbi-pas");
  for(var i=0;i<16;i++){
    var b = document.createElement("button");
    b.dataset.i = i;
    pas.appendChild(b);
    dbiPas.push(b);
  }
  pas.addEventListener("click", function(e){
    var b2 = e.target.closest("button");
    if(!b2) return;
    var i2 = +b2.dataset.i, P = pisteDbiSel();
    if(DBI.accent) P.acc ^= (1 << i2);
    else {
      P.pas ^= (1 << i2);
      if(!S.run && (P.pas & (1 << i2))){
        audioInit();
        voixDbi(maintenantAudio() + 0.01, DBI.sel, !!(P.acc & (1 << i2)));
      }
    }
    majDbi(); memDbi(); H.cran();
  });
})();

function knobDbi(k, nom, etiq){
  return knobEm("dbi-k-" + k + "-" + nom, {min:0, max:1,
    get:function(){ return motifDbiCur().pistes[k].p[nom]; },
    set:function(v){
      motifDbiCur().pistes[k].p[nom] = v;
      lcdDbi(String(Math.round(v * 100)), DBI_VOIX[k].nom + " " + etiq, true);
      memDbi();
    }});
}
DBI_VOIX.forEach(function(V, k){
  V.kns.concat(V.col).forEach(function(kn){ DBI_KNOBS.push(knobDbi(k, kn[0], kn[1])); });
});
var kDbiSwing = knobEm("dbi-k-swing", {min:0, max:0.7, get:function(){ return DBI.swing; },
  set:function(v){ DBI.swing = v; lcdDbi(String(Math.round(50 + v*35)) + "%", "SWING", true); memDbi(); }});
var kDbiRand = knobEm("dbi-k-random", {min:0, max:1, get:function(){ return DBI.random; },
  set:function(v){ DBI.random = v; lcdDbi(String(Math.round(v*100)), "RANDOM", true); memDbi(); }});
var kDbiDrive = knobEm("dbi-k-drive", {min:0, max:1, get:function(){ return DBI.drive; },
  set:function(v){ DBI.drive = v; majDistDbi(); lcdDbi(String(Math.round(v*100)), "DISTORTION", true); memDbi(); }});
var kDbiVol = knobEm("dbi-k-vol", {min:0, max:1, get:function(){ return S.vol; },
  set:function(v){ S.vol = v; if(master && ctx) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
    lcdDbi(String(Math.round(v*100)), "MASTER", true); saveSoon(); }});
var kDbiTempo = knobEm("dbi-k-tempo", {min:0, max:1, get:function(){ return (S.bpm - 30) / 270; },
  set:function(v){ S.bpm = Math.round(30 + v * 270); lcdDbi(String(S.bpm), "RATE", true); saveSoon(); }});
function majKnobsDbi(){
  DBI_KNOBS.forEach(function(k){ k.maj(); });
  kDbiSwing.maj(); kDbiRand.maj(); kDbiDrive.maj(); kDbiVol.maj(); kDbiTempo.maj();
}

var dbiTmr = null;
function lcdDbi(v, l, fugace){
  var a = document.getElementById("dbi-val"), b = document.getElementById("dbi-lab");
  if(!a) return;
  a.textContent = v; b.textContent = l;
  clearTimeout(dbiTmr);
  if(fugace) dbiTmr = setTimeout(majLcdDbi, 1300);
}
function majLcdDbi(){
  var P = pisteDbiSel();
  lcdDbi(DBI_VOIX[DBI.sel].nom, DBI.poly ? ("LEN " + (P.len || 16) + " · POLY") : ("PTN " + (DBI.cur + 1)));
}
function majDbi(){
  var P = pisteDbiSel(), m = motifDbiCur(), i;
  var lg = DBI.poly ? (P.len || 16) : m.last;
  for(i=0;i<16;i++){
    dbiPas[i].classList.toggle("act", DBI.accent ? !!(P.acc & (1 << i)) : !!(P.pas & (1 << i)));
    dbiPas[i].classList.toggle("hors", i >= lg);
  }
  var pads = document.querySelectorAll(".dbi-pad");
  for(i=0;i<pads.length;i++) pads[i].classList.toggle("sel", i === DBI.sel);
  document.body.classList.toggle("dbi-col", DBI.color);
  var kns = document.querySelectorAll(".dbi-kn[data-col]");
  for(i=0;i<kns.length;i++){
    var estCol = kns[i].dataset.col === "1";
    kns[i].style.display = (estCol === DBI.color) ? "" : "none";
  }
  var tys = document.querySelectorAll(".dbi-type");
  for(i=0;i<tys.length;i++){
    var V = DBI_VOIX[+tys[i].dataset.t];
    tys[i].textContent = V.type[motifDbiCur().pistes[+tys[i].dataset.t].type];
  }
  document.getElementById("dbi-color").classList.toggle("on", DBI.color);
  document.getElementById("dbi-poly").classList.toggle("on", DBI.poly);
  document.getElementById("dbi-roller").classList.toggle("on", DBI.roller);
  document.getElementById("dbi-accent").classList.toggle("on", DBI.accent);
  document.getElementById("dbi-dist").classList.toggle("on", DBI.dist);
  document.getElementById("dbi-rec").classList.toggle("on", DBI.rec);
  document.getElementById("dbi-last").textContent = "LAST STEP " + m.last;
  document.getElementById("dbi-len").textContent = "TRACK LEN " + (P.len || 16);
  document.getElementById("dbi-ptn").textContent = "PTN " + (DBI.cur + 1);
  majLcdDbi();
}
function memDbi(){
  memoire.dbi = {cur:DBI.cur, sel:DBI.sel, swing:DBI.swing, random:DBI.random,
    drive:DBI.drive, dist:DBI.dist, poly:DBI.poly,
    motifs:DBI.motifs.map(function(m){
      return {last:m.last, pistes:m.pistes.map(function(P){
        return {pas:P.pas, acc:P.acc, len:P.len, type:P.type, p:P.p};
      })};
    })};
  sauverMachine("dbi");
}
function chargerDbi(){
  DBI.motifs = [];
  for(var i=0;i<16;i++) DBI.motifs.push(motifDbi(i < 2 ? i : 9));
  DBI.cur = 0; DBI.sel = 0; DBI.color = false; DBI.accent = false;
  var m = memLire("dbi");
  if(m){
    if(m.motifs && m.motifs.length === 16){
      DBI.motifs = m.motifs.map(function(o){
        var r = motifDbi(9);
        r.last = o.last || 16;
        (o.pistes || []).forEach(function(P, k){
          if(k >= 8) return;
          var d = r.pistes[k];
          d.pas = P.pas || 0; d.acc = P.acc || 0; d.len = P.len || 16; d.type = P.type || 0;
          if(P.p) for(var q in P.p) if(d.p[q] !== undefined) d.p[q] = P.p[q];
        });
        return r;
      });
    }
    ["cur","sel","swing","random","drive"].forEach(function(c){
      if(typeof m[c] === "number") DBI[c] = m[c];
    });
    DBI.dist = !!m.dist; DBI.poly = !!m.poly;
  }
}

document.getElementById("dbi-play").addEventListener("click", function(){
  audioInit();
  if(S.run){ stop(); H.stop(); } else { step = 0; start(); H.start(); }
  this.classList.toggle("on", S.run);
});
document.getElementById("dbi-stop").addEventListener("click", function(){
  stop(); H.stop();
  document.getElementById("dbi-play").classList.remove("on");
});
document.getElementById("dbi-rec").addEventListener("click", function(){
  DBI.rec = !DBI.rec; majDbi(); H.inter();
});
document.getElementById("dbi-color").addEventListener("click", function(){
  DBI.color = !DBI.color; majDbi(); majKnobsDbi(); H.inter();
  signal(DBI.color ? "COULEUR : SECONDE COUCHE DE RÉGLAGES" : "RÉGLAGES PRINCIPAUX");
});
document.getElementById("dbi-poly").addEventListener("click", function(){
  DBI.poly = !DBI.poly;
  majDbi(); memDbi(); H.inter();
  signal(DBI.poly ? ("POLYRYTHMIE · CYCLE DE " + longueurDbi() + " PAS") : "TOUTES LES PISTES ENSEMBLE");
});
document.getElementById("dbi-roller").addEventListener("click", function(){
  DBI.roller = !DBI.roller; majDbi(); H.cran();
});
document.getElementById("dbi-accent").addEventListener("click", function(){
  DBI.accent = !DBI.accent; majDbi(); H.inter();
  signal(DBI.accent ? "LES TOUCHES POSENT LES ACCENTS" : "LES TOUCHES POSENT LES PAS");
});
document.getElementById("dbi-dist").addEventListener("click", function(){
  DBI.dist = !DBI.dist; majDistDbi(); majDbi(); memDbi(); H.inter();
});
document.getElementById("dbi-last").addEventListener("click", function(){
  var m = motifDbiCur(), v = [16, 12, 8, 4];
  m.last = v[(v.indexOf(m.last) + 1) % v.length];
  majDbi(); memDbi(); H.cran();
});
document.getElementById("dbi-len").addEventListener("click", function(){
  var P = pisteDbiSel(), v = [16, 15, 14, 12, 11, 9, 8, 7, 6, 5, 4, 3];
  P.len = v[(v.indexOf(P.len) + 1) % v.length];
  majDbi(); memDbi(); H.cran();
  if(DBI.poly) signal("PISTE SUR " + P.len + " PAS · CYCLE DE " + longueurDbi());
});
document.getElementById("dbi-copy").addEventListener("click", function(){
  var v = window.prompt("Copier le motif " + (DBI.cur + 1) + " vers lequel ? (1 à 16)", "");
  var n = parseInt(v, 10) - 1;
  if(isNaN(n) || n < 0 || n > 15) return;
  DBI.motifs[n] = JSON.parse(JSON.stringify(motifDbiCur()));
  memDbi(); signal("COPIÉ VERS LE MOTIF " + (n + 1)); H.inter();
});
document.getElementById("dbi-erase").addEventListener("click", function(){
  var P = pisteDbiSel();
  P.pas = 0; P.acc = 0;
  majDbi(); memDbi(); H.inter();
  signal("PISTE " + DBI_VOIX[DBI.sel].nom + " VIDÉE");
});
document.getElementById("dbi-ptn").addEventListener("click", function(){
  memDbi();
  DBI.cur = (DBI.cur + 1) % 16;
  majDbi(); majKnobsDbi(); H.inter();
});
document.getElementById("dbi-notice").addEventListener("click", function(){ ouvrirNotice(); });

var unitDbi = document.getElementById("unit-dbi");
function activerDbi(){
  stop();
  S.modele = "dbi";
  MACHINE = MACHINE_DBI;
  poserMachine("dbi");
  audioInit();
  chargerDbi();
  debrancherTout(DBI.noeuds); DBI.noeuds = {}; DBI.ohGain = null;
  majDbi(); majKnobsDbi();
  actif = unitDbi;
  save(); fit(); setTimeout(fit, 120);
}

