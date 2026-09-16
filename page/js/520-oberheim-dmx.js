/* ===================== OBERHEIM DMX =====================
   Machine à échantillons de 1981 : on ne pose pas des pas, on joue sur ses
   vingt-quatre touches et elle enregistre au vol, avec correction de timing.
   Ses sons sont des enregistrements de vraie batterie en huit bits ; ici ils
   sont synthétisés puis passés dans le même goulot à huit bits, qui fait
   l'essentiel de son caractère. */
var DMX_GRPS = [
  {nom:"BASS",    fader:"bass",  t:[["1","bd",0],["2","bd",1],["3","bd",2]]},
  {nom:"SNARE",   fader:"snare", t:[["1","sd",0],["2","sd",1],["3","sd",2]]},
  {nom:"HI-HAT",  fader:"hat",   t:[["CLOSED","hh",0],["ACCENT","hh",1],["OPEN","hh",2]]},
  {nom:"TOMS",    fader:"toms",  t:[["1","tom",0],["2","tom",1],["3","tom",2]]},
  {nom:"",        fader:"toms",  t:[["4","tom",3],["5","tom",4],["6","tom",5]]},
  {nom:"CYMBAL",  fader:"cym",   t:[["RIDE1","cy",0],["RIDE2","cy",1],["CRASH","cy",2]]},
  {nom:"PERC 1",  fader:"perc1", t:[["TAMB1","p1",0],["TAMB2","p1",1],["RIMSHOT","p1",2]]},
  {nom:"PERC 2",  fader:"perc2", t:[["SHAKER1","p2",0],["SHAKER2","p2",1],["CLAPS","p2",2]]}
];
var DMX_TOUCHES = [];
(function listeDmx(){
  DMX_GRPS.forEach(function(g){
    g.t.forEach(function(t){
      DMX_TOUCHES.push({nom:(g.nom ? g.nom + " " : "TOMS ") + t[0], court:t[0],
                        fam:t[1], var_:t[2], fader:g.fader});
    });
  });
})();
var DMX_MIDI = [36,36,36, 38,38,40, 42,44,46, 41,43,45,47,48,50, 51,59,49, 54,54,37, 70,70,39];
var DMX_TPQ = 96;
var DMX_Q = [0, 8, 12, 16, 24, 32];
var DMX_QNOM = ["OFF","1/8","1/8T","1/16","1/16T","1/32"];

function seqDmx(n){
  return {mesures:2, q:3, swing:0, evts:[], nom:"SEQ " + n};
}
var DMX = {seqs:[], cur:0, rec:false, pos:-1, tStep:0, noeuds:[], annule:null,
           niv:{bass:0.8, snare:0.8, hat:0.75, toms:0.8, cym:0.7, perc1:0.7, perc2:0.7, metro:0},
           tenue:null, ohGain:null};
for(var dz=0; dz<8; dz++) DMX.seqs.push(seqDmx(dz + 1));

/* ---------- le goulot à huit bits ---------- */
function dmxGoulot(){
  var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 10500;
  var bits = ctx.createWaveShaper(); bits.curve = courbeBits(8);
  lp.connect(bits);
  return {entree:lp, sortie:bits};
}
function dmxSortie(fam){
  if(!DMX.noeuds[fam]){
    var g = ctx.createGain();
    g.connect(busSet("dmx") || master);
    DMX.noeuds[fam] = g;
  }
  return DMX.noeuds[fam];
}
function voixDmx(t, k, vel){
  var T = DMX_TOUCHES[k];
  if(!T) return;
  var dest = dmxSortie(T.fader);
  dest.gain.setValueAtTime(1, t);
  var niv = mv("niv", DMX.niv[T.fader]) * (vel === undefined ? 1 : vel);
  var g = ctx.createGain();
  var ch = dmxGoulot();
  ch.sortie.connect(g);
  g.connect(pasVoie(dest));
  var e = ch.entree, v = T.var_;

  if(T.fam === "bd"){
    /* trois variations : la DMX les accorde différemment */
    var f0 = [48, 55, 42][v], dec = [0.28, 0.22, 0.36][v];
    var o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(f0 * 3.2, t);
    o.frequency.exponentialRampToValueAtTime(f0, t + 0.032);
    trEnv(g, t, niv * 1.2, dec, 0.001);
    o.connect(e); o.start(t); o.stop(t + dec + 0.05);
    var nk = trBruit(t, 0.014), gk = ctx.createGain();
    var hk = ctx.createBiquadFilter(); hk.type = "highpass"; hk.frequency.value = 1600;
    trEnv(gk, t, niv * 0.42, 0.013, 0.0006);
    nk.connect(hk); hk.connect(gk); gk.connect(e);
  }
  else if(T.fam === "sd"){
    var dur = [0.16, 0.13, 0.22][v], ft = [190, 230, 165][v];
    var o1 = ctx.createOscillator(); o1.type = "triangle"; o1.frequency.value = ft;
    var o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = ft * 1.7;
    var gt = ctx.createGain();
    trEnv(gt, t, niv * 0.5, 0.08, 0.0008);
    o1.connect(gt); o2.connect(gt); gt.connect(e);
    o1.start(t); o2.start(t); o1.stop(t + 0.14); o2.stop(t + 0.14);
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = 2100 + v * 500; bp.Q.value = 0.6;
    var nb = trBruit(t, dur);
    trEnv(g, t, niv * 1.25, dur, 0.0008);
    nb.connect(bp); bp.connect(e);
  }
  else if(T.fam === "hh"){
    var dh = [0.05, 0.07, 0.42][v];
    var m = trMetal(t, dh, 950, 0.3);
    var nh = trBruit(t, dh), gh = ctx.createGain(); gh.gain.value = 0.35;
    nh.connect(gh);
    var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 8000;
    trEnv(g, t, niv * (v === 1 ? 1.5 : 1.15), dh, 0.0008);
    m.connect(hp); gh.connect(hp); hp.connect(e);
    if(v < 2 && DMX.ohGain){
      try{ DMX.ohGain.gain.cancelScheduledValues(t);
           DMX.ohGain.gain.setTargetAtTime(0.0001, t, 0.004); }catch(x){}
    }
    if(v === 2) DMX.ohGain = g;
  }
  else if(T.fam === "tom"){
    var base = [170, 140, 118, 98, 82, 68][v], dt = 0.3 + v * 0.05;
    var ot = ctx.createOscillator(); ot.type = "sine";
    ot.frequency.setValueAtTime(base * 1.7, t);
    ot.frequency.exponentialRampToValueAtTime(base, t + 0.055);
    trEnv(g, t, niv * 1.15, dt, 0.0015);
    ot.connect(e); ot.start(t); ot.stop(t + dt + 0.05);
    var nt = trBruit(t, 0.1), gnt = ctx.createGain();
    var bpt = ctx.createBiquadFilter(); bpt.type = "bandpass";
    bpt.frequency.value = base * 3.2; bpt.Q.value = 1.1;
    trEnv(gnt, t, niv * 0.3, 0.095, 0.001);
    nt.connect(bpt); bpt.connect(e);
  }
  else if(T.fam === "cy"){
    var dc = [1.0, 1.3, 2.2][v], bc = [520, 470, 330][v], hc = [4600, 4200, 3000][v];
    var mc = trMetal(t, dc, bc, 0.28);
    var nc = trBruit(t, dc), gc = ctx.createGain(); gc.gain.value = 0.42;
    nc.connect(gc);
    var hpc = ctx.createBiquadFilter(); hpc.type = "highpass"; hpc.frequency.value = hc;
    trEnv(g, t, niv * 1.1, dc, 0.001);
    mc.connect(hpc); gc.connect(hpc); hpc.connect(e);
  }
  else if(T.fam === "p1"){
    if(v === 2){                                  /* rimshot */
      var orf = ctx.createOscillator(); orf.type = "square"; orf.frequency.value = 480;
      var bpr = ctx.createBiquadFilter(); bpr.type = "bandpass";
      bpr.frequency.value = 2300; bpr.Q.value = 3;
      var nr = trBruit(t, 0.024);
      trEnv(g, t, niv * 1.2, 0.026, 0.0006);
      orf.connect(e); nr.connect(bpr); bpr.connect(e);
      orf.start(t); orf.stop(t + 0.04);
    } else {                                      /* tambourins */
      var dm = [0.22, 0.13][v];
      var mt = trMetal(t, dm, 1500, 0.14);
      var nt2 = trBruit(t, dm), gt2 = ctx.createGain(); gt2.gain.value = 0.55;
      nt2.connect(gt2);
      var hpt = ctx.createBiquadFilter(); hpt.type = "highpass"; hpt.frequency.value = 5200;
      trEnv(g, t, niv * 1.2, dm, 0.0008);
      mt.connect(hpt); gt2.connect(hpt); hpt.connect(e);
    }
  }
  else {                                          /* perc 2 : shakers et claps */
    if(v === 2){
      var bpk = ctx.createBiquadFilter(); bpk.type = "bandpass";
      bpk.frequency.value = 1300; bpk.Q.value = 1.5;
      var nk2 = trBruit(t, 0.3);
      nk2.connect(bpk); bpk.connect(e);
      g.gain.setValueAtTime(0.0001, t);
      [0, 0.009, 0.018, 0.027].forEach(function(o3){
        g.gain.setValueAtTime(niv * 3.2, t + o3);
        g.gain.exponentialRampToValueAtTime(0.0001, t + o3 + 0.007);
      });
      g.gain.setValueAtTime(niv * 2.2, t + 0.036);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    } else {
      var ds = [0.09, 0.06][v];
      var ns = trBruit(t, ds);
      var hps = ctx.createBiquadFilter(); hps.type = "highpass"; hps.frequency.value = 6000;
      trEnv(g, t, niv * 1.25, ds, 0.003);
      ns.connect(hps); hps.connect(e);
    }
  }
  midiNoteA(DMX_MIDI[k] || 36, t, vel === undefined ? 1 : vel, MIDI.canal, 0.12);
}

/* ---------- séquenceur temps réel ---------- */
function seqDmxCur(){ return DMX.seqs[DMX.cur]; }
function ticsDmx(){ return seqDmxCur().mesures * 4 * DMX_TPQ; }
function pasDmx(){ return seqDmxCur().mesures * 16; }
function scheduleDmx(i, t){
  var s = seqDmxCur(), tp = DMX_TPQ / 4;
  var CHARGE_N = ouvrirPas();
  var deb = i * tp, fin = deb + tp;
  if(s.swing && i % 2 === 1) t += stepDur() * s.swing * 0.5;
  DMX.tStep = t;
  var duree = stepDur();
  s.evts.forEach(function(e){
    if(e.tic >= deb && e.tic < fin){ CHARGE_N++; voixDmx(t + ((e.tic - deb) / tp) * duree, e.k, e.vel); }
  });
  attenuerVoie("dmx", CHARGE_N, t);   /* v149 : la DMX n'avait pas d'atténuation de charge */
  if(DMX.niv.metro > 0.02 && i % 4 === 0) clicDmx(t, i === 0);
  if(!cache) queue.push({i:i, t:t});
}
function clicDmx(t, fort){
  var o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "square"; o.frequency.setValueAtTime(fort ? 1800 : 1200, t);
  var n = mv("niv", DMX.niv.metro);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(n * (fort ? 0.3 : 0.18), t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.05);
}
function beatDmx(i){
  DMX.pos = i;
  majAffDmx();
}
function arretDmx(){
  DMX.pos = -1;
  var b = document.getElementById("dmx-play");
  if(b) b.classList.remove("on");
  majAffDmx();
}
function boucleDmx(){ }
var MACHINE_DMX = {schedule:scheduleDmx, beat:beatDmx, arret:arretDmx, boucle:boucleDmx,
                   longueur:function(){ return pasDmx(); }};
function ticDmx(){
  if(DMX.pos < 0 || !ctx) return 0;
  var tp = DMX_TPQ / 4;
  var f = Math.max(0, Math.min(0.999, (maintenantAudio() - DMX.tStep) / stepDur()));
  return (DMX.pos * tp + f * tp) % ticsDmx();
}
function caleDmx(tic){
  var s = seqDmxCur(), d = DMX_Q[s.q];
  if(!d) return Math.round(tic);
  var pas = (DMX_TPQ * 4) / d;
  return Math.round(tic / pas) * pas % ticsDmx();
}
function frapperDmx(k){
  audioInit();
  if(!ctx) return;
  voixDmx(maintenantAudio() + 0.005, k, 1);
  if(S.run && DMX.rec){
    var s = seqDmxCur();
    DMX.annule = s.evts.slice();
    s.evts.push({tic:caleDmx(ticDmx()), k:k, vel:1});
    s.evts.sort(function(a, b){ return a.tic - b.tic; });
    memDmx();
  }
  majAffDmx();
}

/* ---------- interface ---------- */
var DMX_FADERS = [["bass","BASS"],["snare","SNARE"],["hat","HI-HAT"],["toms","TOMS"],
                  ["cym","CYMBAL"],["perc1","PERC 1"],["perc2","PERC 2"],
                  ["metro","METRONOME"],["vol","VOLUME"]];
(function construireDmx(){
  var f = document.getElementById("dmx-faders");
  DMX_FADERS.forEach(function(x){
    var d = document.createElement("div");
    d.className = "dmx-f";
    d.innerHTML = '<div class="rail" data-f="' + x[0] + '"><b></b></div><em>' + x[1] + '</em>';
    f.appendChild(d);
  });
  f.addEventListener("pointerdown", function(e){ glisserDmx(e, true); });
  f.addEventListener("pointermove", function(e){ if(DMX.tenue) glisserDmx(e, false); });
  function fin(){ DMX.tenue = null; memDmx(); }
  f.addEventListener("pointerup", fin);
  f.addEventListener("pointercancel", fin);
  function glisserDmx(e, debut){
    var rail = debut ? e.target.closest(".rail") : DMX.tenue;
    if(!rail) return;
    if(debut){ DMX.tenue = rail; rail.setPointerCapture(e.pointerId); e.preventDefault(); }
    if(PINCE) return;
    var r = rail.getBoundingClientRect();
    var y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    var v = 1 - y;
    var nom = rail.dataset.f;
    if(nom === "vol"){
      S.vol = v;
      if(master && ctx) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
      saveSoon();
    } else DMX.niv[nom] = v;
    rail.querySelector("b").style.top = Math.round(y * (r.height - 18)) + "px";
    affDmx((nom === "vol" ? "VOLUME " : nom.toUpperCase() + " ") + Math.round(v * 100), true);
  }

  var gr = document.getElementById("dmx-grille");
  var n = 0;
  DMX_GRPS.forEach(function(g){
    var col = document.createElement("div");
    col.className = "dmx-col";
    var t = document.createElement("span");
    t.textContent = g.nom;
    col.appendChild(t);
    g.t.forEach(function(){
      var b = document.createElement("button");
      b.className = "dmxk";
      b.dataset.k = n;
      b.innerHTML = '<i></i>' + DMX_TOUCHES[n].court;
      col.appendChild(b);
      n++;
    });
    gr.appendChild(col);
  });
  gr.addEventListener("pointerdown", function(e){
    var b = e.target.closest(".dmxk");
    if(!b) return;
    b.setPointerCapture(e.pointerId);
    frapperDmx(+b.dataset.k);
    H.cran();
  });

  var num = document.getElementById("dmx-num");
  ["7","8","9","4","5","6","1","2","3","<","0",">"].forEach(function(t){
    var b = document.createElement("button");
    b.className = "dmxk"; b.style.padding = "10px 2px"; b.textContent = t; b.dataset.n = t;
    num.appendChild(b);
  });
  num.addEventListener("click", function(e){
    var b = e.target.closest(".dmxk");
    if(!b) return;
    var t = b.dataset.n;
    if(t >= "1" && t <= "8"){ memDmx(); DMX.cur = (+t) - 1; step = 0; }
    else if(t === "<") DMX.cur = (DMX.cur + 7) % 8;
    else if(t === ">") DMX.cur = (DMX.cur + 1) % 8;
    majAffDmx(); H.cran();
  });

  var cmd = document.getElementById("dmx-cmd");
  [["TEMPO","t"],["SIGNATURE","s"],["QUANTIZE","q"],["SWING","w"],
   ["SONG","g"],["EDIT","e"],["STEP","p"],["LENGTH","l"],
   ["RECORD","r"],["ERASE","x"],["COPY","c"],["NOTICE","n"]].forEach(function(x){
    var b = document.createElement("button");
    b.className = "dmxk" + (x[1] === "r" ? " dmx-rec" : "");
    b.style.padding = "12px 3px";
    b.textContent = x[0]; b.dataset.c = x[1];
    if(x[1] === "r") b.id = "dmx-record";
    cmd.appendChild(b);
  });
  cmd.addEventListener("click", function(e){
    var b = e.target.closest(".dmxk");
    if(!b) return;
    var c = b.dataset.c, s = seqDmxCur();
    if(c === "r"){ DMX.rec = !DMX.rec; }
    else if(c === "q"){ s.q = (s.q + 1) % DMX_Q.length; affDmx("QUANT " + DMX_QNOM[s.q], true); }
    else if(c === "w"){ s.swing = +(((s.swing + 0.1) % 0.5).toFixed(2)); affDmx("SWING " + Math.round(s.swing*100), true); }
    else if(c === "l"){ s.mesures = [1,2,4,8][([1,2,4,8].indexOf(s.mesures) + 1) % 4];
                        affDmx("LENGTH " + s.mesures, true); }
    else if(c === "x"){
      DMX.annule = s.evts.slice();
      s.evts = [];
      affDmx("ERASED", true);
    }
    else if(c === "c"){
      var v = window.prompt("Copier la séquence " + (DMX.cur + 1) + " vers laquelle ? (1 à 8)", "");
      var d = parseInt(v, 10) - 1;
      if(!isNaN(d) && d >= 0 && d < 8){
        var dst = DMX.seqs[d];
        dst.mesures = s.mesures; dst.q = s.q; dst.swing = s.swing;
        dst.evts = s.evts.map(function(x2){ return {tic:x2.tic, k:x2.k, vel:x2.vel}; });
        affDmx("COPIED > " + (d + 1), true);
      }
    }
    else if(c === "t"){ affDmx("TEMPO " + S.bpm, true); }
    else if(c === "s"){ affDmx("4/4 FIXED", true); }
    else if(c === "g" || c === "p"){ affDmx("NOT ON DMX", true); }
    else if(c === "e"){
      if(!DMX.annule){ affDmx("NOTHING", true); }
      else { var av = s.evts; s.evts = DMX.annule; DMX.annule = av; affDmx("UNDO", true); }
    }
    else if(c === "n"){ ouvrirNotice(); }
    memDmx(); majAffDmx(); H.inter();
  });

  document.getElementById("dmx-play").addEventListener("click", function(){
    audioInit();
    if(S.run){ stop(); H.stop(); } else { step = 0; start(); H.start(); }
    this.classList.toggle("on", S.run);
    majAffDmx();
  });
  document.getElementById("dmx-notice").addEventListener("click", function(){ ouvrirNotice(); });
})();

var dmxTmr = null;
function affDmx(txt, fugace){
  var a = document.getElementById("dmx-aff");
  if(!a) return;
  a.textContent = txt;
  clearTimeout(dmxTmr);
  if(fugace) dmxTmr = setTimeout(majAffDmx, 1300);
}
function majAffDmx(){
  var s = seqDmxCur();
  var mes = (DMX.pos >= 0) ? (Math.floor(DMX.pos / 16) + 1) + "." + (Math.floor((DMX.pos % 16) / 4) + 1) : "";
  affDmx(DMX.rec ? ("REC SEQ " + (DMX.cur + 1) + " " + mes)
       : S.run ? ("PLAY SEQ " + (DMX.cur + 1) + " " + mes)
       : ("SELECT SEQ " + (DMX.cur + 1)));
  var r = document.getElementById("dmx-record");
  if(r) r.classList.toggle("on", DMX.rec);
}
function majFadersDmx(){
  var rails = document.querySelectorAll("#dmx-faders .rail");
  for(var i=0;i<rails.length;i++){
    var nom = rails[i].dataset.f;
    var v = (nom === "vol") ? S.vol : DMX.niv[nom];
    var h = rails[i].clientHeight || 96;
    rails[i].querySelector("b").style.top = Math.round((1 - v) * (h - 18)) + "px";
  }
}
function memDmx(){
  memoire.dmx = {cur:DMX.cur, niv:DMX.niv,
    seqs:DMX.seqs.map(function(s){
      return {mesures:s.mesures, q:s.q, swing:s.swing, nom:s.nom,
              evts:s.evts.map(function(e){ return [e.tic, e.k]; })};
    })};
  sauverMachine("dmx");
}
function chargerDmx(){
  DMX.seqs = [];
  for(var i=0;i<8;i++) DMX.seqs.push(seqDmx(i + 1));
  DMX.cur = 0; DMX.rec = false;
  var m = memLire("dmx");
  if(m){
    if(m.niv) for(var c in DMX.niv) if(typeof m.niv[c] === "number") DMX.niv[c] = m.niv[c];
    if(m.seqs && m.seqs.length === 8){
      DMX.seqs = m.seqs.map(function(o, k){
        var s = seqDmx(k + 1);
        s.mesures = o.mesures || 2; s.q = o.q || 3; s.swing = o.swing || 0;
        s.evts = (o.evts || []).map(function(e){ return {tic:e[0], k:e[1], vel:1}; });
        return s;
      });
    }
    if(typeof m.cur === "number") DMX.cur = m.cur;
  }
}

var unitDmx = document.getElementById("unit-dmx");
function activerDmx(){
  stop();
  S.modele = "dmx";
  MACHINE = MACHINE_DMX;
  poserMachine("dmx");
  audioInit();
  chargerDmx();
  debrancherTout(DMX.noeuds); DMX.noeuds = {}; DMX.ohGain = null;
  majAffDmx();
  actif = unitDmx;
  save(); fit();
  setTimeout(function(){ fit(); majFadersDmx(); }, 120);
}

