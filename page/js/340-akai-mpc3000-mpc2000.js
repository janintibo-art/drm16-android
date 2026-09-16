/* ===================== AKAI MPC3000 / MPC2000 =====================
   Autre logique que les Electribe : on ne pose pas des pas, on joue sur les pads
   et la machine enregistre au vol, avec correction de timing au moment voulu. */
var MPC_BANQUES = ["A","B","C","D"];
var MPC_NOMS3000 = ["KICK","KICK (ALT)","SNARE","SNARE (ALT)","HIHAT FOOT","HIHAT CLOSED",
                    "HIHAT LOOSE","HIHAT OPEN","TOM 1","TOM 2","TOM 3","TOM 4",
                    "RIDE 1","RIDE 2","CRASH 1","CRASH 2"];
var MPC_Q = [0, 8, 12, 16, 24, 32];          /* division par mesure : libre, 1/8, triolet, 1/16, ... */
var MPC_QNOM = ["OFF","1/8","1/8T","1/16","1/16T","1/32"];
var MPC_TPQ = 96;                             /* tics par noire, comme la MPC3000 */

function padMpc(i){
  var defauts = [0,14,1,15,3,3,4,4,5,21,21,7,20,19,19,17];
  var p = {ech:"b" + (defauts[i % 16] || 0), niv:0.8, pan:0, tune:0, dec:1, filt:1,
           coupe:-1, debut:0, envers:false, velNiv:0.7, note:35 + (i % 16)};
  /* les charleys se coupent entre eux, comme sur l'appareil */
  if((i % 16) >= 4 && (i % 16) <= 7) p.coupe = 0;
  return p;
}
function pisteMpc(i){
  /* piste 1 : les pads internes. Les suivantes envoient en MIDI. */
  return {type:(i === 0 ? 0 : 1), canal:0, nom:(i === 0 ? "DRUMS" : ("TRACK " + (i+1))),
          mute:false, solo:false, evts:[]};
}
function seqMpc(){
  var s = {mesures:2, q:3, swing:0, nom:"SEQ 1", bpm:0, pistes:[]};
  for(var i=0;i<99;i++) s.pistes.push(pisteMpc(i));
  return s;                                        /* bpm 0 : suit le tempo général */
}
function pisteCourante(){
  var s = MPC.seq;
  if(!s.pistes) s.pistes = [pisteMpc(0)];
  if(!s.pistes[MPC.piste]) s.pistes[MPC.piste] = pisteMpc(MPC.piste);
  return s.pistes[MPC.piste];
}
function evtsMpc(){ return pisteCourante().evts; }
var MPC = {
  v:3000, banque:0, sel:0, pads:[], seq:null, seqs:[], seqCur:0,
  rec:false, over:false, plein:false, niv16:false, repet:false, apres:0,
  pos:-1, tStep:0, dernier:null, annule:null, tenu:{}, ecrase:false, param:0,
  mode:0, evtSel:0, type16:0, compte:false, attente:false, amorce:0,
  chanson:[], chPos:0, chTour:0, presse:null, piste:0
};
var MPC_T16 = ["VELOCITY","TUNE","START","DECAY"];
(function initMpc(){
  for(var i=0;i<64;i++) MPC.pads.push(padMpc(i));
  for(var s=0;s<8;s++) MPC.seqs.push(seqMpc());
  MPC.seqs.forEach(function(x,i){ x.nom = "SEQ " + (i+1); });
  MPC.seq = MPC.seqs[0];
})();

/* --- son d'un pad --- */
function sortieMpc(k){
  if(!MPC.noeuds) MPC.noeuds = [];
  if(!MPC.noeuds[k]){
    var g = ctx.createGain(), pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if(pn){ g.connect(pn); pn.connect(busSet("mpc") || master); } else g.connect(busSet("mpc") || master);
    MPC.noeuds[k] = {g:g, p:pn};
  }
  return MPC.noeuds[k];
}
function jouerPad(t, k, vel){
  banqueEs();
  var p = MPC.pads[k];
  if(!p) return;
  var buf = ES.buf[p.ech];
  if(!buf) return;
  if(p.coupe >= 0){                          /* groupe de coupure : le charley ferme l'ouvert */
    for(var j=0;j<64;j++){
      if(j !== k && MPC.pads[j].coupe === p.coupe && MPC.voix && MPC.voix[j]){
        try{ MPC.voix[j].gain.cancelScheduledValues(t);
             MPC.voix[j].gain.setTargetAtTime(0.0001, t, 0.004); }catch(e){}
      }
    }
  }
  var n = sortieMpc(k);
  n.g.gain.setValueAtTime(mv("niv", p.niv), t);
  if(n.p) n.p.pan.setValueAtTime(mv("pan", p.pan), t);
  var src = ctx.createBufferSource();
  var variation = MPC.apres * 0.5;
  src.playbackRate.value = Math.pow(2, (p.tune + variation) * 1.2);
  poserTampon(src, p.envers ? inverse(p.ech) : buf, src.playbackRate.value);
  var f = ctx.createBiquadFilter(); f.type = "lowpass";
  f.frequency.value = Math.min(18000, 150 * Math.pow(110, p.filt));
  var g = ctx.createGain();
  var dep = (p.debut || 0) * buf.duration * 0.9;
  var duree = Math.max(0.03, ((buf.duration - dep) / src.playbackRate.value) * Math.max(0.05, p.dec));
  var amp = vel * (1 - p.velNiv) + vel * vel * p.velNiv;   /* la force agit sur le niveau */
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(amp, t + 0.003);
  g.gain.setValueAtTime(amp, t + Math.max(0.006, duree - 0.02));
  g.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.01, duree));
  src.connect(f); f.connect(g); g.connect(pasVoie(n.g));
  src.start(t, Math.min(dep, Math.max(0, buf.duration - 0.02)));
  src.stop(t + duree + 0.05);
  if(!MPC.voix) MPC.voix = [];
  MPC.voix[k] = g;
  midiNoteA(p.note, t, vel, MIDI.canal, duree);
}

/* --- séquenceur --- */
function ticsMpc(){ return MPC.seq.mesures * 4 * MPC_TPQ; }
function pasMpc(){ return MPC.seq.mesures * 16; }
function ticParPas(){ return MPC_TPQ / 4; }
function scheduleMpc(i, t){
  var CHARGE_N = ouvrirPas();
  if(MPC.amorce > 0){                       /* décompte avant enregistrement */
    MPC.tStep = t;
    if(i % 4 === 0) clicMetroMpc(t, i === 0);
    if(!cache) queue.push({i:i, t:t});
    return;
  }
  if(MPC.attente) return;                   /* on attend la première frappe */
  var seq = MPC.seq, tp = ticParPas();
  var deb = i * tp, fin = deb + tp;
  if(seq.swing && i % 2 === 1) t += stepDur() * seq.swing * 0.55;
  MPC.tStep = t;
  var duree = stepDur();
  var pistes = seq.pistes || [], k, solo = false;
  for(k=0;k<pistes.length;k++) if(pistes[k] && pistes[k].solo) solo = true;
  for(k=0;k<pistes.length;k++){
    var pi = pistes[k];
    if(!pi || !pi.evts.length) continue;
    if(pi.mute) continue;
    if(solo && !pi.solo) continue;
    for(var j=0;j<pi.evts.length;j++){
      var e = pi.evts[j];
      if(e.tic < deb || e.tic >= fin) continue;
      var quand = t + ((e.tic - deb) / tp) * duree;
      if(pi.type === 0) CHARGE_N++, jouerPad(quand, e.n, e.vel);
      else midiNoteA(e.n, quand, e.vel, pi.canal, duree * 0.9);
    }
  }
  if(!cache) queue.push({i:i, t:t});
  attenuerVoie("mpc", CHARGE_N, t);
}
function beatMpc(i){
  MPC.pos = i;
  if(MPC.seq.bpm && Math.abs(MPC.seq.bpm - S.bpm) >= 1) S.bpm = MPC.seq.bpm;
  majLcdMpc();
}
function arretMpc(){
  MPC.pos = -1;
  var b = document.getElementById("mpc-play");
  if(b) b.classList.remove("on");
  majLcdMpc();
}
function clicMetroMpc(t, fort){
  if(!ctx || !master) return;
  var o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "square"; o.frequency.setValueAtTime(fort ? 1760 : 1100, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(fort ? 0.22 : 0.12, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.05);
}
function boucleMpc(){
  if(MPC.amorce > 0){                       /* fin d'une mesure de décompte */
    MPC.amorce--;
    majLcdMpc();
    return;
  }
  if(MPC.mode !== 2 || !MPC.chanson.length) return;
  MPC.chTour++;
  var pas = MPC.chanson[MPC.chPos];
  if(!pas || MPC.chTour >= (pas.tours || 1)){
    MPC.chTour = 0;
    MPC.chPos = (MPC.chPos + 1) % MPC.chanson.length;
    var suiv = MPC.chanson[MPC.chPos];
    if(suiv){
      MPC.seqCur = suiv.seq;
      MPC.seq = MPC.seqs[MPC.seqCur];
      majLcdMpc(); majPadsMpc();
    }
  }
}
var MACHINE_MPC = {schedule:scheduleMpc, beat:beatMpc, arret:arretMpc, boucle:boucleMpc,
                   longueur:function(){ return pasMpc(); }};

/* position en tics, au moment précis de la frappe */
function ticCourant(){
  if(MPC.pos < 0 || !ctx) return 0;
  var tp = ticParPas();
  var frac = (maintenantAudio() - MPC.tStep) / stepDur();
  frac = Math.max(0, Math.min(0.999, frac));
  return (MPC.pos * tp + frac * tp) % ticsMpc();
}
function caleMpc(tic){
  var d = MPC_Q[MPC.seq.q];
  if(!d) return Math.round(tic);
  var pas = (MPC_TPQ * 4) / d;               /* tics par division */
  return Math.round(tic / pas) * pas % ticsMpc();
}
function frapperPad(k, vel){
  audioInit();
  if(!ctx) return;
  var pi = pisteCourante();
  if(pi.type === 0) jouerPad(maintenantAudio() + 0.005, k, vel);
  else midiNoteA(MPC.pads[k].note, maintenantAudio() + 0.005, vel, pi.canal, 0.25);
  MPC.sel = k;
  if(MPC.attente){                          /* WAIT FOR KEY : la première frappe lance tout */
    MPC.attente = false;
    step = 0;
    majLcdMpc();
  }
  majPadsMpc(); majLcdMpc();
  if(MPC.amorce > 0) return;                /* pendant le décompte on joue sans enregistrer */
  if(S.run && (MPC.rec || MPC.over)){
    MPC.annule = {p:MPC.piste, l:pi.evts.slice()};
    pi.evts.push({tic:caleMpc(ticCourant()), n:(pi.type === 0 ? k : MPC.pads[k].note), vel:vel});
    pi.evts.sort(function(a,b){ return a.tic - b.tic; });
    memMpc();
  }
}

/* --- afficheur --- */
function padNom(k){
  if(MPC.v === 3000) return MPC_NOMS3000[k % 16];
  return "PAD " + ((k % 16) + 1);
}
function ticTexte(t){
  var m = Math.floor(t / (MPC_TPQ*4)) + 1;
  var b = Math.floor((t % (MPC_TPQ*4)) / MPC_TPQ) + 1;
  var r = Math.round(t % MPC_TPQ);
  return m + "." + b + "." + ("00" + r).slice(-2);
}
function majLcdMpc(){
  var l1 = document.getElementById("mpc-l1");
  if(!l1) return;
  var seq = MPC.seq, p = MPC.pads[MPC.sel];
  var l2 = document.getElementById("mpc-l2"), l3 = document.getElementById("mpc-l3"),
      l4 = document.getElementById("mpc-l4");
  var pi = pisteCourante();
  if(MPC.mode === 1){                       /* pas à pas */
    var ev = pi.evts, e = ev[MPC.evtSel];
    l1.textContent = "Step Edit  Trk " + (MPC.piste + 1);
    l2.textContent = "Event " + (ev.length ? (MPC.evtSel + 1) : 0) + "/" + ev.length;
    l3.textContent = e ? ("Pos:" + ticTexte(e.tic) + "  Vel:" + Math.round(e.vel * 127)) : "Piste vide";
    l4.textContent = e ? (pi.type === 0
        ? ("Pad " + MPC_BANQUES[Math.floor(e.n/16)] + ((e.n%16)+1) + " " + padNom(e.n))
        : ("Note " + nomNote(e.n) + "  Ch" + (pi.canal + 1)))
      : "Jouez sur les pads pour remplir";
    return;
  }
  if(MPC.mode === 3){                       /* pistes */
    l1.textContent = "Tracks     " + seq.nom;
    l2.textContent = "Trk:" + ("0" + (MPC.piste + 1)).slice(-2) + "/99  " + pi.nom;
    l3.textContent = (pi.type === 0 ? "DRUM  pads internes" : ("MIDI  canal " + (pi.canal + 1))) +
                     "   Ev:" + pi.evts.length;
    l4.textContent = (pi.mute ? "MUTE " : "") + (pi.solo ? "SOLO " : "") +
                     "SOFT: type / mute / solo / canal";
    return;
  }
  if(MPC.mode === 2){                       /* chanson */
    var pas = MPC.chanson[MPC.chPos];
    l1.textContent = "Song       " + MPC.chanson.length + " pas";
    l2.textContent = "Step " + (MPC.chanson.length ? (MPC.chPos + 1) : 0) + "/" + MPC.chanson.length +
                     "   Tour " + (MPC.chTour + 1);
    l3.textContent = pas ? (MPC.seqs[pas.seq].nom + "  x" + (pas.tours || 1)) : "Ajoutez des pas";
    l4.textContent = "1-8 ajoute une sequence   ERASE retire";
    return;
  }
  var mesure = (MPC.pos >= 0) ? Math.floor(MPC.pos / 16) + 1 : 1;
  var temps = (MPC.pos >= 0) ? (Math.floor((MPC.pos % 16) / 4) + 1) : 1;
  l1.textContent = (MPC.amorce > 0 ? "Count In" :
                    MPC.attente ? "Wait Key" :
                    S.run ? (MPC.rec ? "Record  " : MPC.over ? "Overdub " : "Play    ") : "Main    ")
                 + " " + seq.nom;
  l2.textContent = "Bar:" + mesure + "." + temps + "   Bars:" + seq.mesures + "   BPM:" + S.bpm;
  l3.textContent = "T.C.:" + MPC_QNOM[seq.q] + "  Sw:" + Math.round(seq.swing * 100) +
                   "%  Trk" + (MPC.piste + 1) + ":" + (pi.type === 0 ? "DRM" : ("C" + (pi.canal + 1))) +
                   " Ev:" + pi.evts.length;
  l4.textContent = "Pad " + MPC_BANQUES[MPC.banque] + ((MPC.sel % 16) + 1) + " " + padNom(MPC.sel) +
    "  " + nomEch(p.ech) + (p.envers ? " REV" : "") + (p.coupe >= 0 ? (" G" + (p.coupe+1)) : "");
}
function majPadsMpc(){
  var els = document.querySelectorAll("#mpc-pads .mpc-pad");
  for(var i=0;i<els.length;i++){
    var k = MPC.banque * 16 + i;
    var p = MPC.pads[k];
    els[i].querySelector("i").textContent = padNom(k);
    els[i].querySelector("em").textContent = String(i + 1);
    els[i].classList.toggle("on", k === MPC.sel);
    els[i].classList.toggle("vide", !ES.buf[p.ech]);
  }
  document.getElementById("mpc-banque").textContent = "PAD BANK " + MPC_BANQUES[MPC.banque];
  document.getElementById("mpc-plein").classList.toggle("on", MPC.plein);
  document.getElementById("mpc-16niv").classList.toggle("on", MPC.niv16);
  document.getElementById("mpc-repet").classList.toggle("on", MPC.repet);
  document.getElementById("mpc-rec").classList.toggle("on", MPC.rec);
  document.getElementById("mpc-over").classList.toggle("on", MPC.over);
  document.getElementById("mpc-efface").classList.toggle("on", MPC.ecrase);
  document.getElementById("mpc-timing").textContent = "T.C. " + MPC_QNOM[MPC.seq.q];
  var pe = MPC.pads[MPC.sel];
  document.getElementById("mpc-envers").classList.toggle("on", !!pe.envers);
  document.getElementById("mpc-t16").textContent = "16 LEV : " + MPC_T16[MPC.type16];
  document.getElementById("mpc-seqbpm").textContent =
    MPC.seq.bpm ? ("SEQ BPM " + MPC.seq.bpm) : "SEQ BPM : GÉNÉRAL";
  var libelles = (MPC.mode === 3) ? ["TYPE","MUTE","SOLO","CANAL"] : ["BARS","T.C.","SWING","PARAM"];
  var sfs = document.querySelectorAll("#mpc-soft .mpcb");
  for(var q=0;q<sfs.length;q++) sfs[q].textContent = libelles[q];
  var bt = document.getElementById("mpc-cmd");
  if(bt){
    var bk = bt.querySelector('[data-c="k"]');
    if(bk) bk.classList.toggle("on", MPC.mode === 3);
    var bs = bt.querySelector('[data-c="s"]');
    if(bs) bs.classList.toggle("on", MPC.mode === 2);
    var btt = bt.querySelector('[data-c="t"]');
    if(btt) btt.classList.toggle("on", MPC.mode === 1);
  }
}

/* --- mémoire --- */
function memMpc(){
  memoire["mpc" + MPC.v] = {
    banque:MPC.banque, sel:MPC.sel, seqCur:MPC.seqCur,
    type16:MPC.type16, compte:MPC.compte, chanson:MPC.chanson,
    pads:MPC.pads,
    seqs:MPC.seqs.map(function(s){
      var pl = [];
      (s.pistes || []).forEach(function(p, i){
        var pardefaut = (p.type === (i === 0 ? 0 : 1)) && !p.canal && !p.mute && !p.solo &&
                        p.nom === (i === 0 ? "DRUMS" : ("TRACK " + (i+1)));
        if(!p.evts.length && pardefaut) return;      /* on ne garde que ce qui est occupé */
        pl.push({i:i, type:p.type, canal:p.canal, nom:p.nom, mute:p.mute, solo:p.solo,
                 evts:p.evts.map(function(e){ return [e.tic, e.n, Math.round(e.vel*100)]; })});
      });
      return {mesures:s.mesures, q:s.q, swing:s.swing, nom:s.nom, bpm:s.bpm, pistes:pl};
    })
  };
  sauverMachine("mpc" + MPC.v);
}
function chargerMpc(){
  MPC.pads = []; MPC.seqs = [];
  for(var i=0;i<64;i++) MPC.pads.push(padMpc(i));
  for(var s=0;s<8;s++){ var q = seqMpc(); q.nom = "SEQ " + (s+1); MPC.seqs.push(q); }
  MPC.seqCur = 0; MPC.banque = 0; MPC.sel = 0; MPC.chanson = []; MPC.mode = 0; MPC.piste = 0;
  MPC.chPos = 0; MPC.chTour = 0; MPC.amorce = 0; MPC.attente = false;
  var m = memLire("mpc" + MPC.v);
  if(m){
    if(m.pads && m.pads.length === 64) MPC.pads = m.pads;
    if(m.seqs && m.seqs.length === 8){
      MPC.seqs = m.seqs.map(function(o, i){
        var q = seqMpc();
        q.mesures = o.mesures || 2; q.q = o.q || 3; q.swing = o.swing || 0; q.bpm = o.bpm || 0;
        q.nom = o.nom || ("SEQ " + (i+1));
        if(o.pistes){
          o.pistes.forEach(function(p){
            var d = q.pistes[p.i] || pisteMpc(p.i);
            d.type = p.type; d.canal = p.canal || 0; d.nom = p.nom || d.nom;
            d.mute = !!p.mute; d.solo = !!p.solo;
            d.evts = (p.evts || []).map(function(e){ return {tic:e[0], n:e[1], vel:e[2]/100}; });
            q.pistes[p.i] = d;
          });
        } else if(o.evts){                            /* ancien format : tout sur la piste 1 */
          q.pistes[0].evts = o.evts.map(function(e){ return {tic:e[0], n:e[1], vel:e[2]/100}; });
        }
        return q;
      });
    }
    ["banque","sel","seqCur","type16"].forEach(function(c){ if(typeof m[c] === "number") MPC[c] = m[c]; });
    MPC.compte = !!m.compte;
    MPC.chanson = (m.chanson && m.chanson.length) ? m.chanson : [];
  }
  MPC.seq = MPC.seqs[MPC.seqCur] || MPC.seqs[0];
}

/* --- construction de l'interface --- */
(function construireMpc(){
  var i;
  var pads = document.getElementById("mpc-pads");
  /* rangée du haut = pads 13 à 16, comme sur l'appareil */
  var ordre = [12,13,14,15, 8,9,10,11, 4,5,6,7, 0,1,2,3];
  ordre.forEach(function(idx){
    var b = document.createElement("button");
    b.className = "mpc-pad";
    b.dataset.p = idx;
    b.innerHTML = "<i></i><em></em>";
    pads.appendChild(b);
  });
  function velocite(e, el){
    if(MPC.plein) return 1;
    var r = el.getBoundingClientRect();
    var y = (e.clientY - r.top) / r.height;    /* haut du pad : frappe douce, bas : forte */
    return Math.max(0.25, Math.min(1, 0.35 + y * 0.75));
  }
  pads.addEventListener("pointerdown", function(e){
    var el = e.target.closest(".mpc-pad");
    if(!el) return;
    el.setPointerCapture(e.pointerId);
    var k = MPC.banque * 16 + (+el.dataset.p);
    if(MPC.niv16){                              /* seize niveaux : un seul son, seize valeurs */
      var n = (+el.dataset.p) + 1, f = n / 16;
      var p16 = MPC.pads[MPC.sel], sauve = null;
      if(MPC.type16 === 1){ sauve = p16.tune; p16.tune = (f - 0.5) * 2; }
      else if(MPC.type16 === 2){ sauve = p16.debut; p16.debut = f - 1/16; }
      else if(MPC.type16 === 3){ sauve = p16.dec; p16.dec = Math.max(0.05, f); }
      frapperPad(MPC.sel, MPC.type16 === 0 ? Math.max(0.1, f) : 1);
      if(MPC.type16 === 1) p16.tune = sauve;
      else if(MPC.type16 === 2) p16.debut = sauve;
      else if(MPC.type16 === 3) p16.dec = sauve;
      H.cran();
      return;
    }
    if(MPC.ecrase){                             /* effacement : on retire les frappes de ce pad */
      var pe = pisteCourante();
      MPC.annule = {p:MPC.piste, l:pe.evts.slice()};
      var cible = (pe.type === 0) ? k : MPC.pads[k].note;
      pe.evts = pe.evts.filter(function(ev){ return ev.n !== cible; });
      memMpc(); majLcdMpc(); H.inter();
      return;
    }
    var vel = velocite(e, el);
    frapperPad(k, vel);
    H.cran();
    if(MPC.repet){
      clearInterval(MPC.tenu[k]);
      var d = MPC_Q[MPC.seq.q] || 16;
      var ms = (60000 / S.bpm) * 4 / d;
      MPC.tenu[k] = setInterval(function(){ frapperPad(k, vel); }, Math.max(40, ms));
    }
  });
  function relacher(e){
    var el = e.target.closest ? e.target.closest(".mpc-pad") : null;
    if(!el) return;
    var k = MPC.banque * 16 + (+el.dataset.p);
    clearInterval(MPC.tenu[k]);
    MPC.tenu[k] = null;
  }
  pads.addEventListener("pointerup", relacher);
  pads.addEventListener("pointercancel", relacher);

  var soft = document.getElementById("mpc-soft");
  for(i=0;i<4;i++){
    var b2 = document.createElement("button");
    b2.className = "mpcb";
    b2.textContent = ["BARS","T.C.","SWING","PARAM"][i];
    b2.dataset.s = i;
    soft.appendChild(b2);
  }
  soft.addEventListener("click", function(e){
    var b3 = e.target.closest(".mpcb");
    if(!b3) return;
    var i2 = +b3.dataset.s;
    if(MPC.mode === 3){                       /* page des pistes */
      var pt = pisteCourante();
      if(i2 === 0){ pt.type = pt.type ? 0 : 1; }
      else if(i2 === 1){ pt.mute = !pt.mute; }
      else if(i2 === 2){ pt.solo = !pt.solo; }
      else { pt.canal = (pt.canal + 1) % 16; }
      memMpc(); majLcdMpc(); H.cran();
      return;
    }
    if(i2 === 0){ MPC.seq.mesures = [1,2,4,8][( [1,2,4,8].indexOf(MPC.seq.mesures)+1 )%4]; }
    else if(i2 === 1){ MPC.seq.q = (MPC.seq.q + 1) % MPC_Q.length; }
    else if(i2 === 2){ MPC.seq.swing = +((MPC.seq.swing + 0.1) % 0.7).toFixed(2); }
    else { MPC.param = (MPC.param + 1) % 6; }
    memMpc(); majLcdMpc(); majPadsMpc(); H.cran();
  });

  var num = document.getElementById("mpc-num");
  ["7","8","9","4","5","6","1","2","3","0",".","ENT"].forEach(function(t){
    var b4 = document.createElement("button");
    b4.className = "mpcb"; b4.textContent = t; b4.dataset.n = t;
    num.appendChild(b4);
  });
  num.addEventListener("click", function(e){
    var b5 = e.target.closest(".mpcb");
    if(!b5) return;
    var t = b5.dataset.n;
    if(t >= "1" && t <= "8"){
      if(MPC.mode === 2){                       /* en mode chanson : on ajoute un pas */
        MPC.chanson.push({seq:(+t) - 1, tours:1});
        MPC.chPos = MPC.chanson.length - 1;
      } else {
        memMpc();
        MPC.seqCur = (+t) - 1;
        MPC.seq = MPC.seqs[MPC.seqCur];
        step = 0;
      }
      memMpc(); majLcdMpc(); majPadsMpc();
    }
    H.cran();
  });

  var cmd = document.getElementById("mpc-cmd");
  [["DISK","d"],["PROGRAM","p"],["TRACK","k"],["SONG","s"],["COUNT IN","o"],["WAIT KEY","w"],
   ["NAME","n"],["STEP EDIT","t"],["COPY SEQ","c"]].forEach(function(x){
    var b6 = document.createElement("button");
    b6.className = "mpcb"; b6.textContent = x[0]; b6.dataset.c = x[1];
    cmd.appendChild(b6);
  });
  cmd.addEventListener("click", function(e){
    var b7 = e.target.closest(".mpcb");
    if(!b7) return;
    var c = b7.dataset.c;
    if(c === "d"){ ouvrirBib(); }
    else if(c === "p"){                          /* groupe de coupure du pad choisi */
      var p8 = MPC.pads[MPC.sel];
      p8.coupe = (p8.coupe + 2) % 5 - 1;         /* -1, 0, 1, 2, 3 */
      memMpc(); majLcdMpc();
      signal(p8.coupe < 0 ? "SANS GROUPE DE COUPURE" : ("GROUPE DE COUPURE " + (p8.coupe + 1)));
    }
    else if(c === "k"){
      MPC.mode = (MPC.mode === 3) ? 0 : 3;
      majLcdMpc(); majPadsMpc();
      signal(MPC.mode === 3 ? "PISTES · MOLETTE POUR CHOISIR" : "MODE PRINCIPAL");
    }
    else if(c === "s"){
      MPC.mode = (MPC.mode === 2) ? 0 : 2;
      MPC.chPos = 0; MPC.chTour = 0;
      majLcdMpc(); majPadsMpc();
      signal(MPC.mode === 2 ? "MODE CHANSON" : "MODE PRINCIPAL");
    }
    else if(c === "o"){
      MPC.compte = !MPC.compte;
      signal(MPC.compte ? "DÉCOMPTE D'UNE MESURE AVANT ENREGISTREMENT" : "SANS DÉCOMPTE");
    }
    else if(c === "w"){
      MPC.attenteDemandee = !MPC.attenteDemandee;
      signal(MPC.attenteDemandee ? "DÉPART À LA PREMIÈRE FRAPPE" : "DÉPART IMMÉDIAT");
    }
    else if(c === "n"){
      if(MPC.mode === 3){
        var pk = pisteCourante();
        renommer("Nom de la piste " + (MPC.piste + 1), pk.nom, function(v){
          if(v){ pk.nom = v; memMpc(); majLcdMpc(); }
        });
      } else {
        renommer("Nom de la séquence", MPC.seq.nom, function(v){
          if(v){ MPC.seq.nom = v; memMpc(); majLcdMpc(); }
        });
      }
    }
    else if(c === "t"){
      MPC.mode = (MPC.mode === 1) ? 0 : 1;
      MPC.evtSel = 0;
      majLcdMpc(); majPadsMpc();
      signal(MPC.mode === 1 ? "PAS À PAS : MOLETTE POUR PARCOURIR" : "MODE PRINCIPAL");
    }
    else if(c === "c"){
      var src = MPC.seq;
      renommer("Copier vers quelle séquence ? (1 à 8)", "", function(v){
        var n2 = parseInt(v, 10) - 1;
        if(isNaN(n2) || n2 < 0 || n2 > 7){ signal("NUMÉRO ENTRE 1 ET 8"); return; }
        var d = MPC.seqs[n2];
        d.mesures = src.mesures; d.q = src.q; d.swing = src.swing; d.bpm = src.bpm;
        d.pistes = src.pistes.map(function(pp){
          return {type:pp.type, canal:pp.canal, nom:pp.nom, mute:pp.mute, solo:pp.solo,
                  evts:pp.evts.map(function(e2){ return {tic:e2.tic, n:e2.n, vel:e2.vel}; })};
        });
        memMpc(); signal("COPIÉE VERS " + d.nom);
      });
    }
    H.cran();
  });
})();

/* --- boutons rotatifs --- */
function knobMpc(id, champ, min, max, nom){
  return knobEm(id, {min:min, max:max,
    get:function(){ return MPC.pads[MPC.sel][champ]; },
    set:function(v){
      MPC.pads[MPC.sel][champ] = v;
      majLcdMpc(); memMpc();
    }});
}
var kMpcVol = knobEm("mpc-k-vol", {min:0, max:1, get:function(){ return S.vol; },
  set:function(v){ S.vol = v; if(master) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02); saveSoon(); }});
var kMpcGain = knobEm("mpc-k-gain", {min:0, max:1, get:function(){ return MPC.gain || 0.5; },
  set:function(v){ MPC.gain = v; }});
var kMpcNiv  = knobMpc("mpc-k-niv", "niv", 0, 1, "LEVEL");
var kMpcPan  = knobMpc("mpc-k-pan", "pan", -1, 1, "PAN");
var kMpcTune = knobMpc("mpc-k-tune", "tune", -1, 1, "TUNE");
var kMpcDec  = knobMpc("mpc-k-dec", "dec", 0.05, 1, "DECAY");
var kMpcFilt = knobMpc("mpc-k-filt", "filt", 0, 1, "FILTER");
var kMpcDebut = knobMpc("mpc-k-debut", "debut", 0, 1, "START");
var kMpcVelNiv = knobMpc("mpc-k-velniv", "velNiv", 0, 1, "VEL>LEV");
function majKnobsMpc(){
  [kMpcNiv, kMpcPan, kMpcTune, kMpcDec, kMpcFilt, kMpcDebut, kMpcVelNiv, kMpcVol]
    .forEach(function(k){ k.maj(); });
}

/* --- molette : choisit le son du pad, ou le réglage courant --- */
(function rouleMpc(){
  var el = document.getElementById("mpc-roue"), st = {drag:false, y0:0, a:0};
  el.addEventListener("pointerdown", function(e){
    st.drag = true; st.y0 = e.clientY; el.setPointerCapture(e.pointerId); e.preventDefault();
  });
  el.addEventListener("pointermove", function(e){
    if(!st.drag || PINCE) return;
    var d = st.y0 - e.clientY;
    if(Math.abs(d) < 11) return;
    st.y0 = e.clientY;
    pasMpcRoue(d > 0 ? 1 : -1);
    st.a += (d > 0 ? 14 : -14);
    el.style.transform = "rotate(" + st.a + "deg)";
  });
  el.addEventListener("pointerup", function(){ st.drag = false; memMpc(); });
  el.addEventListener("pointercancel", function(){ st.drag = false; });
  function pasMpcRoue(d){
    banqueEs();
    if(MPC.mode === 1){                       /* pas à pas : on parcourt les événements */
      var pl = pisteCourante(), n = pl.evts.length;
      if(!n){ majLcdMpc(); return; }
      MPC.evtSel = (MPC.evtSel + d + n) % n;
      var e = pl.evts[MPC.evtSel];
      if(ctx && pl.type === 0) jouerPad(maintenantAudio() + 0.01, e.n, e.vel);
      majLcdMpc(); H.cran();
      return;
    }
    if(MPC.mode === 3){                       /* pistes : on parcourt les 99 */
      MPC.piste = (MPC.piste + d + 99) % 99;
      MPC.evtSel = 0;
      majLcdMpc(); H.cran();
      return;
    }
    if(MPC.mode === 2){                       /* chanson : nombre de tours du pas */
      var pas = MPC.chanson[MPC.chPos];
      if(pas){ pas.tours = Math.max(1, Math.min(64, (pas.tours || 1) + d)); memMpc(); }
      majLcdMpc(); H.cran();
      return;
    }
    var l = listeEch(), p = MPC.pads[MPC.sel];
    if(MPC.param === 1){ S.bpm = Math.max(30, Math.min(300, S.bpm + d)); }
    else if(MPC.param === 2){ MPC.seq.mesures = Math.max(1, Math.min(16, MPC.seq.mesures + d)); }
    else {
      var i = l.indexOf(p.ech);
      i = ((i < 0 ? 0 : i) + d + l.length) % l.length;
      p.ech = l[i];
      delete ES.inv[l[i]];
      jouerPad(ctx ? maintenantAudio() + 0.01 : 0, MPC.sel, 0.9);
      majPadsMpc();
    }
    majLcdMpc(); H.cran();
  }
  MPC.pas = pasMpcRoue;
  /* en pas à pas, les touches − et + décalent l'événement choisi */
  document.getElementById("mpc-moins").addEventListener("click", function(){
    if(MPC.mode === 1) return nudgeMpc(-1);
    pasMpcRoue(-1);
  });
  document.getElementById("mpc-plus").addEventListener("click", function(){
    if(MPC.mode === 1) return nudgeMpc(1);
    pasMpcRoue(1);
  });
  function nudgeMpc(d){
    var pn = pisteCourante(), e = pn.evts[MPC.evtSel];
    if(!e) return;
    MPC.annule = {p:MPC.piste, l:pn.evts.map(function(x){ return {tic:x.tic, n:x.n, vel:x.vel}; })};
    e.tic = (e.tic + d * (MPC_TPQ / 8) + ticsMpc()) % ticsMpc();
    pn.evts.sort(function(a,b){ return a.tic - b.tic; });
    MPC.evtSel = pn.evts.indexOf(e);
    memMpc(); majLcdMpc(); H.cran();
  }
})();

/* --- curseur de variation --- */
(function faderMpc(){
  var el = document.getElementById("mpc-fader"), b = el.querySelector("b"), st = {drag:false};
  function poser(e){
    var r = el.getBoundingClientRect();
    var y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    MPC.apres = 1 - y * 2;                       /* haut : aigu, bas : grave */
    b.style.top = Math.round(y * (r.height - 16)) + "px";
    majLcdMpc();
  }
  el.addEventListener("pointerdown", function(e){ st.drag = true; el.setPointerCapture(e.pointerId); poser(e); e.preventDefault(); });
  el.addEventListener("pointermove", function(e){ if(st.drag && !PINCE) poser(e); });
  el.addEventListener("pointerup", function(){ st.drag = false; });
  el.addEventListener("pointercancel", function(){ st.drag = false; });
})();

/* --- boutons --- */
function basculeMpc(id, champ){
  document.getElementById(id).addEventListener("click", function(){
    MPC[champ] = !MPC[champ];
    majPadsMpc(); H.inter();
  });
}
document.getElementById("mpc-envers").addEventListener("click", function(){
  var p = MPC.pads[MPC.sel];
  p.envers = !p.envers;
  delete ES.inv[p.ech];
  majPadsMpc(); majLcdMpc(); memMpc(); H.cran();
});
document.getElementById("mpc-t16").addEventListener("click", function(){
  MPC.type16 = (MPC.type16 + 1) % MPC_T16.length;
  majPadsMpc(); majLcdMpc(); H.cran();
  signal("16 LEVELS : " + MPC_T16[MPC.type16]);
});
document.getElementById("mpc-seqbpm").addEventListener("click", function(){
  MPC.seq.bpm = MPC.seq.bpm ? 0 : S.bpm;
  majPadsMpc(); majLcdMpc(); memMpc(); H.cran();
  signal(MPC.seq.bpm ? ("TEMPO PROPRE À LA SÉQUENCE : " + MPC.seq.bpm) : "LA SÉQUENCE SUIT LE TEMPO GÉNÉRAL");
});
basculeMpc("mpc-plein", "plein");
basculeMpc("mpc-16niv", "niv16");
basculeMpc("mpc-repet", "repet");
document.getElementById("mpc-efface").addEventListener("click", function(){
  if(MPC.mode === 1){                         /* pas à pas : retire l'événement choisi */
    var pz = pisteCourante(), e = pz.evts[MPC.evtSel];
    if(!e){ signal("AUCUN ÉVÉNEMENT"); return; }
    MPC.annule = {p:MPC.piste, l:pz.evts.map(function(x){ return {tic:x.tic, n:x.n, vel:x.vel}; })};
    pz.evts.splice(MPC.evtSel, 1);
    MPC.evtSel = Math.max(0, Math.min(MPC.evtSel, pz.evts.length - 1));
    memMpc(); majLcdMpc(); H.inter();
    return;
  }
  if(MPC.mode === 2){                          /* chanson : retire le pas */
    if(MPC.chanson.length){
      MPC.chanson.splice(MPC.chPos, 1);
      MPC.chPos = Math.max(0, Math.min(MPC.chPos, MPC.chanson.length - 1));
      memMpc(); majLcdMpc();
    }
    H.inter();
    return;
  }
  MPC.ecrase = !MPC.ecrase;
  majPadsMpc(); H.inter();
});
document.getElementById("mpc-banque").addEventListener("click", function(){
  MPC.banque = (MPC.banque + 1) % 4;
  MPC.sel = MPC.banque * 16 + (MPC.sel % 16);
  majPadsMpc(); majLcdMpc(); majKnobsMpc(); memMpc(); H.inter();
});
document.getElementById("mpc-timing").addEventListener("click", function(){
  MPC.seq.q = (MPC.seq.q + 1) % MPC_Q.length;
  majPadsMpc(); majLcdMpc(); memMpc(); H.cran();
  signal("TIMING CORRECT : " + MPC_QNOM[MPC.seq.q]);
});
document.getElementById("mpc-annule").addEventListener("click", function(){
  if(!MPC.annule){ signal("RIEN À ANNULER"); return; }
  var cible = MPC.seq.pistes[MPC.annule.p] || pisteCourante();
  var avant = cible.evts;
  cible.evts = MPC.annule.l;
  MPC.annule = {p:MPC.annule.p, l:avant};
  memMpc(); majLcdMpc(); H.inter();
  signal("SÉQUENCE REVENUE EN ARRIÈRE");
});
document.getElementById("mpc-apres").addEventListener("click", function(){
  MPC.apres = 0;
  document.querySelector("#mpc-fader b").style.top = "47px";
  majLcdMpc(); H.cran();
});
document.getElementById("mpc-play").addEventListener("click", function(){
  audioInit(); banqueEs();
  if(S.run){ stop(); H.stop(); } else { start(); H.start(); }
  this.classList.toggle("on", S.run);
  majPadsMpc(); majLcdMpc();
});
document.getElementById("mpc-playstart").addEventListener("click", function(){
  audioInit(); banqueEs();
  stop(); step = 0;
  MPC.amorce = (MPC.compte && (MPC.rec || MPC.over)) ? 1 : 0;
  MPC.attente = !!MPC.attenteDemandee;
  start(); H.start();
  document.getElementById("mpc-play").classList.add("on");
  majLcdMpc();
});
document.getElementById("mpc-stop").addEventListener("click", function(){
  stop(); H.stop();
  MPC.rec = false; MPC.over = false; MPC.amorce = 0; MPC.attente = false;
  document.getElementById("mpc-play").classList.remove("on");
  majPadsMpc(); majLcdMpc();
});
document.getElementById("mpc-rec").addEventListener("click", function(){
  MPC.rec = !MPC.rec; if(MPC.rec) MPC.over = false;
  majPadsMpc(); majLcdMpc(); H.inter();
});
document.getElementById("mpc-over").addEventListener("click", function(){
  MPC.over = !MPC.over; if(MPC.over) MPC.rec = false;
  majPadsMpc(); majLcdMpc(); H.inter();
});
document.getElementById("mpc-debut").addEventListener("click", function(){ step = 0; majLcdMpc(); H.cran(); });
document.getElementById("mpc-fin").addEventListener("click", function(){ step = pasMpc() - 1; majLcdMpc(); H.cran(); });
document.getElementById("mpc-recul").addEventListener("click", function(){ step = Math.max(0, step - 16); majLcdMpc(); H.cran(); });
document.getElementById("mpc-avance").addEventListener("click", function(){ step = (step + 16) % pasMpc(); majLcdMpc(); H.cran(); });
document.getElementById("mpc-locate").addEventListener("click", function(){
  MPC.param = (MPC.param + 1) % 3;
  signal(["MOLETTE : SON DU PAD","MOLETTE : TEMPO","MOLETTE : NOMBRE DE MESURES"][MPC.param]);
  H.cran();
});
var mpcTaps = [];
document.getElementById("mpc-tap").addEventListener("click", function(){
  var now = Date.now();
  if(mpcTaps.length && now - mpcTaps[mpcTaps.length-1] > 2200) mpcTaps = [];
  mpcTaps.push(now); if(mpcTaps.length > 5) mpcTaps.shift();
  if(mpcTaps.length < 2){ H.cran(); return; }
  var s = 0;
  for(var i=1;i<mpcTaps.length;i++) s += mpcTaps[i] - mpcTaps[i-1];
  var bpm = Math.round(60000 / (s / (mpcTaps.length - 1)));
  if(bpm >= 30 && bpm <= 300){ S.bpm = bpm; majLcdMpc(); saveSoon(); }
  H.cran();
});
document.getElementById("mpc-notice").addEventListener("click", function(){ ouvrirNotice(); });

var unitMpc = document.getElementById("unit-mpc");
function activerMpc(v){
  stop();
  MPC.v = (v === 2000) ? 2000 : 3000;
  S.modele = "mpc" + MPC.v;
  MACHINE = MACHINE_MPC;
  poserMachine("mpc", MPC.v === 2000 ? "mpc2" : null);
  audioInit(); banqueEs(); chargerEchs();
  chargerMpc();
  document.getElementById("mpc-notice").textContent = "MPC" + MPC.v;
  document.getElementById("mpc-sstitre").textContent =
    MPC.v === 3000 ? "MIDI PRODUCTION CENTER" : "MIDI PRODUCTION CENTER";
  majPadsMpc(); majKnobsMpc(); majLcdMpc();
  actif = unitMpc;
  save(); fit(); setTimeout(fit, 120);
}

