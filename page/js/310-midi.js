/* ===================== MIDI ===================== */
var MIDI = {dispo:false, liste:[], ouvert:-1, out:true, in:true, clock:false,
            canal:9, canalSy:0, base:36, sync:false,
            /* v131 : identifiants Android, appareil en cours d'ouverture, et nom du
               dernier appareil choisi pour le rouvrir quand il revient */
            appareils:[], ouvertId:-1, attenteId:-1, dernier:""};
/* pilotage des vraies machines : déclaré tôt, la notice s'en sert au chargement */
var TELE = {actif:false, dernier:{}, tmr:{}};
/* horloge reçue de l'extérieur : l'application devient esclave */
var SYNC = {ticks:0, dernier:0, bpmEst:120, attente:false};
(function chargerMidi(){
  var m = memoire.midi;
  if(!m) return;
  if(typeof m.out === "boolean") MIDI.out = m.out;
  if(typeof m.in === "boolean") MIDI.in = m.in;
  if(typeof m.clock === "boolean") MIDI.clock = m.clock;
  if(typeof m.canal === "number") MIDI.canal = Math.max(0, Math.min(15, m.canal|0));
  if(typeof m.canalSy === "number") MIDI.canalSy = Math.max(0, Math.min(15, m.canalSy|0));
  if(typeof m.base === "number") MIDI.base = Math.max(0, Math.min(96, m.base|0));
  if(typeof m.sync === "boolean") MIDI.sync = m.sync;
  if(typeof m.tele === "boolean") TELE.actif = m.tele;
  if(typeof m.dernier === "string") MIDI.dernier = m.dernier.slice(0, 120);
})();
function memMidi(){
  memoire.midi = {out:MIDI.out, in:MIDI.in, clock:MIDI.clock, canal:MIDI.canal,
                  canalSy:MIDI.canalSy, base:MIDI.base, sync:MIDI.sync, tele:TELE.actif,
                  dernier:MIDI.dernier};
  writeMem();
}
var GM = {bd:36, sd:38, cp:39, lt:45, hh:42, oh:46, rd:51, cy:49, wb:76, cb:56, sp:41};
var GM_INV = {};
for(var gk in GM) GM_INV[GM[gk]] = gk;

function pont(){ return HOST.midiEnvoyer ? HOST : null; }
function midiPret(){ return MIDI.dispo && MIDI.ouvert >= 0 && pont(); }
function midiBrut(a,b,c){
  var p = pont(); if(!p) return;
  try{ p.midiEnvoyer(a,b,c); }catch(e){}
}
/* une note posée à l'heure du pas, l'ordonnanceur travaillant en avance */
var midiAttente = [], midiOuvertes = [];
function midiNoteA(note, t, vel, canal, duree){
  if(ctx && ctx.startRendering) return;   /* un rendu WAV ne joue pas le matériel branché */
  if(!midiPret() || !MIDI.out || note === undefined) return;
  var d = Math.max(0, (t - maintenantAudio())*1000);
  var ms = Math.max(40, Math.min(4000, (duree !== undefined ? duree*1000 : 90)));
  var id = setTimeout(function(){
    retirer(midiAttente, id);
    midiBrut(0x90|canal, note, Math.max(1, Math.min(127, Math.round(vel*100)+27)));
    var cle = {c:canal, n:note};
    midiOuvertes.push(cle);
    var id2 = setTimeout(function(){
      retirer(midiAttente, id2); retirer(midiOuvertes, cle);
      midiBrut(0x80|canal, note, 0);
    }, ms);
    midiAttente.push(id2);
  }, d);
  midiAttente.push(id);
}
function retirer(tab, v){ var i = tab.indexOf(v); if(i >= 0) tab.splice(i, 1); }
/* Stop : plus aucun départ à venir, et on referme ce qui est ouvert */
function midiSilence(){
  midiAttente.forEach(function(id){ clearTimeout(id); });
  midiAttente = [];
  midiOuvertes.forEach(function(k){ midiBrut(0x80|k.c, k.n, 0); });
  midiOuvertes = [];
}
function midiPanique(){
  midiSilence();
  for(var c=0;c<16;c++){ midiBrut(0xB0|c, 123, 0); midiBrut(0xB0|c, 120, 0); }
}
function midiVoix(voix, t, vel){ midiNoteA(GM[voix], t, vel, MIDI.canal); }

/* horloge : le fil Java tient la cadence, on lui donne le tempo */
var bpmEnvoye = 0;
var horlogeTmr = null;
function midiHorloge(on, avance){
  var p = pont(); if(!p || !MIDI.dispo || MIDI.ouvert < 0) return;
  if(MIDI.sync) return;              /* en esclave, on n'envoie pas d'horloge */
  clearTimeout(horlogeTmr); horlogeTmr = null;
  if(on && !MIDI.clock) return;      /* seul le démarrage dépend de l'option */
  /* le premier son est programmé un peu dans le futur : l'horloge part au même instant */
  if(on && avance > 0.002){
    horlogeTmr = setTimeout(function(){
      horlogeTmr = null;
      try{ p.midiHorloge(true, S.bpm); }catch(e){}
      bpmEnvoye = S.bpm;
    }, Math.round(avance*1000));
    return;
  }
  try{ p.midiHorloge(!!on, S.bpm); }catch(e){}
  bpmEnvoye = S.bpm;
}
function midiSuivreTempo(){
  if(!MIDI.clock || !midiPret() || S.bpm === bpmEnvoye) return;
  bpmEnvoye = S.bpm;
  try{ pont().midiTempo(S.bpm); }catch(e){}
}

/* un pas tous les six tics : vingt-quatre tics par noire, seize pas par mesure */
function ticExterne(){
  var now = performance.now();
  if(SYNC.dernier){
    var dt = now - SYNC.dernier;
    if(dt > 1 && dt < 250){
      var bpm = 60000/(dt*24);
      SYNC.bpmEst = SYNC.bpmEst*0.85 + bpm*0.15;
      var arr = Math.round(SYNC.bpmEst);
      if(arr >= 20 && arr <= 300 && Math.abs(arr - S.bpm) >= 1){
        S.bpm = arr;
        if(S.modele === "kp" && typeof KP !== "undefined" && KP) majTempoKp();
      }
    }
  }
  SYNC.dernier = now;
  if(!S.run || !ctx) return;
  if(SYNC.ticks % 6 === 0){
    if(SYNC.attente){ SYNC.attente = false; signal("HORLOGE REÇUE"); }
    var t = maintenantAudio() + 0.03;      /* petite avance : elle absorbe la gigue du pont */
    programmerPas(step, Math.max(maintenantAudio() + 0.005, t + decalageHumain()));
    if(METRO && step % 4 === 0) clicMetro(t, step === 0);
    step = (step+1) % (MACHINE.longueur ? MACHINE.longueur() : 16);
    if(step === 0 && MACHINE.boucle) MACHINE.boucle();
  }
  SYNC.ticks++;
}
function departEsclave(remise){
  audioInit();
  if(!ctx) return;
  if(remise){ stop(); step = 0; pasSet = 0; }
  if(!S.run){
    if(typeof MACHINE_MC !== "undefined" && MACHINE_MC) MACHINE_MC.arret();
    if(typeof MACHINE_DBI !== "undefined" && MACHINE_DBI) MACHINE_DBI.arret();
    if(SET.on) preparerSet();
  }
  clearInterval(timer); timer = null;
  SYNC.ticks = 0; SYNC.dernier = 0; SYNC.attente = false;
  if(!S.run){ S.run = true; queue = []; draw(); host(true); majPlayEm(); }
}

/* réception */
window.__midi = function(a,b,c){
  if(WAVX.occupe || ENR.ondesOccupe) return;  /* le matériel ne modifie pas un rendu en cours */
  enrNoter(a,b,c);
  if(!MIDI.in) return;
  if(a === 0xF8){ if(MIDI.sync) ticExterne(); return; }
  if(a === 0xFA){ if(MIDI.sync){ departEsclave(true); } else if(!S.run){ start(); majPlayEm(); } return; }
  if(a === 0xFB){ if(MIDI.sync) departEsclave(false); else if(!S.run){ start(); majPlayEm(); } return; }
  if(a === 0xFC || a === 0xFF){ if(S.run){ stop(); majPlayEm(); } return; }
  var t = a & 0xF0;
  if(t !== 0x90 || c === 0) return;
  if(!passeEnr(a & 0x0F, b)) return;     /* piste coupée : ni son, ni prise */
  entreeNote(b, c/127, a & 0x0F);
};
function majPlayEm(){
  var pb = document.getElementById("em-play");
  if(pb) pb.classList.toggle("on", S.run && S.modele === "em1");
}
/* ---------- entrée MIDI : à quelle voix va une note ? ----------
   Dix machines n'étaient pas branchées : une note reçue tombait dans le cas
   par défaut d'entreeNote et jouait les voix de la DRM16, quelle que soit la
   machine à l'écran.

   Plutôt que d'inventer un plan de notes par machine, on retourne celui
   qu'elles publient déjà pour SORTIR : TR808_MIDI, DBI_MIDI, T1K_MIDI,
   DMX_MIDI, CR_MIDI, et MIDI.base + rang pour les autres. Une DRM16 branchée
   sur une TR-808 tombe donc juste toute seule, et il n'y a qu'une table à
   tenir par machine au lieu de deux.

   Une note hors table joue la voix choisie à l'écran : un clavier quelconque
   reste utilisable sans rien régler. */
function routageMidi(m){
  if(m === "tr808" || m === "tr909" || m === "tr707" || m === "rd6")
    return {notes:TR.def.midi, defaut:function(){ return Math.max(1, TR.sel); },
            jouer:function(k, vel){ frapperTr(k, vel > 0.8); }};

  if(m === "mpc3000" || m === "mpc2000")
    return {notes:MPC.pads.map(function(p){ return p ? p.note : -1; }),
            defaut:function(){ return MPC.sel; },
            jouer:function(k, vel){ frapperPad(k, vel); }};   /* joue ET enregistre */

  if(m === "dmx")
    return {notes:DMX_MIDI, defaut:function(){ return DMX.sel || 0; },
            jouer:function(k){ frapperDmx(k); }};             /* joue ET enregistre */

  if(m === "dbi")
    return {notes:DBI_MIDI, defaut:function(){ return DBI.sel; },
            jouer:function(k, vel){ frapperDbi(k, vel > 0.8); }};

  if(m === "t1k")
    return {notes:T1K_MIDI, defaut:function(){ return T1K.sel; },
            jouer:function(k, vel){ frapperT1k(k, vel > 0.8); }};

  if(m === "cr5"){
    var ids = [], notes = [];
    for(var id in CR_MIDI) if(Object.prototype.hasOwnProperty.call(CR_MIDI, id)){
      ids.push(id); notes.push(CR_MIDI[id]);
    }
    return {notes:notes, defaut:function(){ return 0; },
            jouer:function(k, vel){ voixCr(maintenantAudio() + 0.01, ids[k], vel > 0.8); }};
  }

  /* Le K.O! : seize emplacements d'affilée à partir de la note de base.
     « base » est le NOMBRE de voix, pas un numéro de note — rangMidi fait
     note − MIDI.base et vérifie que le rang tombe dedans. */
  if(m === "mc")
    return {base:MC_PISTES, defaut:function(){ return MC.sel; },
            jouer:function(k, vel){
              var note = MC.pistes[k].type === "drum" ? MC.note % 4 : MC_GAMME[MC.note % 16];
              voixMc(maintenantAudio() + 0.005, k, note, vel);
            }};

  if(m === "stk")
    return {base:STK_PISTES, defaut:function(){ return STK.sel; },
            jouer:function(k, vel){ voixStk(maintenantAudio() + 0.005, k, vel > 0.8); }};

  if(m === "ko")
    return {base:16, defaut:function(){ return KO.sel; },
            jouer:function(k, vel){ voixKo(maintenantAudio() + 0.005, k, vel); }};

  if(m === "arcm")
    return {base:motifArcmCur().pistes.length, defaut:function(){ return ARCM.sel; },
            jouer:function(k, vel){ frapperArcm(k, vel > 0.8); }};

  if(m === "vlc")
    return {base:motifVlcCur().parties.length, defaut:function(){ return VLC.sel; },
            jouer:function(k){ frapperVlc(k); }};

  return null;
}

/* Le rang de voix visé par une note, ou -1 si la table ne la connaît pas.
   `base` remplace une table pour les machines rangées à partir de MIDI.base. */
function rangMidi(r, note){
  var i;
  if(r.notes){
    for(i=0;i<r.notes.length;i++) if(r.notes[i] === note) return i;
    return -1;
  }
  i = note - MIDI.base;
  return (i >= 0 && i < r.base) ? i : -1;
}

/* chaque machine reçoit les notes sur ses propres parties */
function entreeNote(note, vel, canal, cible){
  audioInit(); if(!ctx) return;
  var voix = GM_INV[note];
  /* Le canal était reçu puis ignoré : tout jouait sur la machine affichée.
     Pour enregistrer un vrai live, chaque source doit garder sa voix — une
     boîte à rythmes sur un canal, une basse sur un autre. */
  var m = cible || ENR.canaux[canal] || S.modele, k, i;

  if(m === "er1" || m === "er2"){
    busEffets();
    k = (note >= 36 && note <= 45) ? note-36 : ER.sel;
    if(k > 9) k = ER.sel;
    if(ER_PARTS[k].t !== "accent") voixEr(maintenantAudio()+0.01, k, vel);
    enregistrerEntree(ER, k, note, false);
    return;
  }
  if(m === "es1" || m === "es2"){
    banqueEs(); busEffets();
    k = (note >= 36 && note <= 44) ? note-36 : ES.sel;
    if(k > 8) k = ES.sel;
    jouerEs(maintenantAudio()+0.01, k, vel, ES.pos >= 0 ? ES.pos : 0);
    enregistrerEntree(ES, k, note, false);
    return;
  }
  if(m === "ea1" || m === "ea2"){
    busEffets();
    k = (canal === 1) ? 1 : 0;
    voixEa(maintenantAudio()+0.01, k, note, vel, 0.4);
    enregistrerEntree(EA, k, note, true);
    return;
  }
  if(m === "emx"){
    mxAudio();
    if(canal !== MIDI.canal){ k = 10 + Math.min(4, canal); voixMxSynth(maintenantAudio()+0.01, k, note, vel, 0.4); }
    else { k = (note >= 36 && note <= 44) ? note-36 : MX.sel; if(k > 8) k = 0; voixMxDrum(maintenantAudio()+0.01, k, vel); }
    enregistrerEntree(MX, k, note, k >= 10);
    return;
  }
  if(m === "esx"){
    sxAudio(); banqueEs();
    if(canal !== MIDI.canal){ k = 10 + Math.min(1, canal); voixSx(maintenantAudio()+0.01, k, vel, 0, note, 0.5); }
    else { k = (note >= 36 && note <= 44) ? note-36 : SX.sel; if(k > 8) k = 0; voixSx(maintenantAudio()+0.01, k, vel, SX.pos >= 0 ? SX.pos : 0); }
    enregistrerEntree(SX, k, note, k >= 10 && k < 12);
    return;
  }
  if(m === "em1"){
    busEffets();
    var k = -1, i;
    if(canal !== MIDI.canal){ k = (canal === 1) ? 9 : 8; }
    else if(voix){ for(i=0;i<10;i++) if(EM_PARTS[i].v === voix){ k = i; break; } }
    if(k < 0) k = 8;
    if(EM_PARTS[k].synth) voixSynth(maintenantAudio()+0.01, k, note, vel);
    else jouerTimbre(EM.pat.tim[k], maintenantAudio()+0.01, vel, sortiePartie(k, maintenantAudio()+0.01));
    if(EM.rec && S.run && EM.pos >= 0 && !EM.protect){
      var j = (EM.pos+1) % (EM.pat.len||16);
      EM.pat.st[k][j] = 1;
      if(EM_PARTS[k].synth) EM.pat.nt[k][j] = note;
      if(k === EM.sel) majTouches();
      memEm();
    }
    return;
  }

  /* la TD-3 est mélodique : la note reçue EST la note jouée, sur deux octaves
     autour du do médian, comme le fait son propre séquenceur */
  if(m === "td3"){
    var demi = note - 36, oc = Math.floor(demi / 12);
    /* la voix de la TD-3 est unique et permanente : si on ne coupe pas le
       glissando, une note reçue partirait de la hauteur du pas précédent */
    TD3.precSlide = false;
    jouerTd3(maintenantAudio() + 0.01, {on:true, note:((demi % 12) + 12) % 12,
                                      oct:Math.max(-1, Math.min(1, oc)),
                                      acc:vel > 0.8, slide:false, tie:false}, 0.35);
    return;
  }

  /* les dix machines à percussion : la table qu'elles utilisent pour sortir */
  var r = routageMidi(m);
  if(r){
    k = rangMidi(r, note);
    if(k < 0) k = r.defaut();
    r.jouer(k, vel);
    return;
  }

  /* l'Eurorack n'a pas de voix fixes : une note n'y veut rien dire */
  if(m === "eur") return;

  /* il ne reste que la DRM16 et la DRM32 */
  if(voix && V[voix]) V[voix](maintenantAudio()+0.01, vel);
};
/* enregistrement au vol, commun à toutes les machines */
function enregistrerEntree(M, k, note, avecNote){
  if(!M.rec || !S.run || M.pos < 0 || M.protect) return;
  var L = (M.pat.len || 16), j = (M.pos + 1) % L;
  M.pat.st[k][j] = 1;
  if(avecNote && M.pat.nt) M.pat.nt[k][j] = note;
  if(k === M.sel){
    if(M === ER) majTouchesEr();
    else if(M === ES) majTouchesEs();
    else if(M === EA) majTouchesEa();
    else if(M === MX) majTouchesMx();
    else if(M === SX) majTouchesSx();
  }
  if(M === ER) memEr();
  else if(M === ES) memEs();
  else if(M === EA) memEa();
  else if(M === MX) memMx();
  else if(M === SX) memSx();
}

/* ----- réglages MIDI dans la notice ----- */
var bScan = document.getElementById("b-midi-scan");
var boxMidi = document.getElementById("midi-liste");
var bOut = document.getElementById("b-midi-out"), bIn = document.getElementById("b-midi-in");
var bClk = document.getElementById("b-midi-clk"), bCh = document.getElementById("b-midi-ch");
var bHum = document.getElementById("b-hum");
bHum.addEventListener("click", function(){
  var v = [0, 4, 8, 15, 25, 40];
  HUM.temps = v[(v.indexOf(HUM.temps) + 1) % v.length];
  this.textContent = "DÉCALAGE : " + HUM.temps + " ms";
  memoire.hum = HUM.temps; save(); H.cran();
});
document.getElementById("b-hasard").addEventListener("click", function(){ sonsHasard(); });
bHum.textContent = "DÉCALAGE : " + HUM.temps + " ms";

var bWavMes = document.getElementById("b-wav-mes");
bWavMes.addEventListener("click", function(){
  var v = [1, 2, 4, 8, 16];
  WAVX.mesures = v[(v.indexOf(WAVX.mesures) + 1) % v.length];
  this.textContent = "MESURES : " + WAVX.mesures;
  memoire.wav = WAVX.mesures; save(); H.cran();
});
document.getElementById("b-wav").addEventListener("click", function(){ exporterWav(); });
bWavMes.textContent = "MESURES : " + WAVX.mesures;

var bTele = document.getElementById("b-tele");
function labelTele(){ bTele.textContent = "PILOTER LA MACHINE : " + (TELE.actif ? "OUI" : "NON"); }
bTele.addEventListener("click", function(){
  TELE.actif = !TELE.actif; labelTele(); memMidi(); H.cran();
  signal(TELE.actif ? "LES BOUTONS PILOTENT LA MACHINE BRANCHÉE" : "PILOTAGE COUPÉ");
});
labelTele();

document.getElementById("b-exc-lire").addEventListener("click", function(){ excDemanderMotif(); H.cran(); });
document.getElementById("b-exc-envoi").addEventListener("click", function(){ excEnvoyerMotif(); H.inter(); });

var bSync = document.getElementById("b-midi-sync"), bChSy = document.getElementById("b-midi-chsy");
var bBase = document.getElementById("b-midi-base");
function majMidiUI(){
  bOut.textContent = "SORTIE : " + (MIDI.out ? "ACTIVE" : "COUPÉE");
  bIn.textContent  = "ENTRÉE : " + (MIDI.in ? "ACTIVE" : "COUPÉE");
  bClk.textContent = "HORLOGE : " + (MIDI.clock ? "ENVOYÉE" : "COUPÉE");
  bCh.textContent   = "CANAL PERCUSSIONS : " + (MIDI.canal+1);
  bChSy.textContent = "CANAL MÉLODIQUE : " + (MIDI.canalSy+1);
  bBase.textContent = "NOTE DE BASE : " + nomNote(MIDI.base) + " (" + MIDI.base + ")";
  bSync.textContent = "HORLOGE : " + (MIDI.sync ? "SUIVIE" : "INTERNE");
  var bs = boxMidi.querySelectorAll("button");
  for(var i=0;i<bs.length;i++) bs[i].classList.toggle("on", i === MIDI.ouvert);
  /* initMidi s'exécute avant la construction de KP au chargement de la page. */
  if(S.modele === "kp" && typeof KP !== "undefined" && KP){
    KP.taps = []; majTempoKp();
  }
}
/* ---- appareils MIDI (v131) ----
   Le pont Java prévient la page de chaque branchement, débranchement,
   ouverture ou échec (__midiEtat) : la liste se tient à jour seule, et
   MIDI.ouvert ne dit plus « ouvert » qu'une fois l'appareil réellement ouvert.
   Un appareil qui revient est rouvert s'il était le dernier choisi. */
function pontIds(){ var p = pont(); return (p && p.midiAppareils && p.midiOuvrirId) ? p : null; }
function relireAppareilsMidi(){
  var p = pontIds();
  if(!p) return false;
  var t = "";
  try{ t = p.midiAppareils() || ""; }catch(e){}
  MIDI.appareils = [];
  t.split("\n").forEach(function(l){
    if(!l) return;
    var c = l.split("\t");
    MIDI.appareils.push({nom:c[0], id:parseInt(c[1], 10)});
  });
  try{ MIDI.ouvertId = p.midiOuvertId(); }catch(e){ MIDI.ouvertId = -1; }
  return true;
}
function indexMidi(id){
  for(var i=0;i<MIDI.appareils.length;i++) if(MIDI.appareils[i].id === id) return i;
  return -1;
}
function majTemoinMidi(){
  var e = document.getElementById("midi-etat");
  if(!e) return;
  var att = indexMidi(MIDI.attenteId), ouv = indexMidi(MIDI.ouvertId);
  e.classList.toggle("on", ouv >= 0);
  e.classList.toggle("attente", att >= 0 && ouv < 0);
  e.textContent = ouv >= 0 ? ("● CONNECTÉ : " + MIDI.appareils[ouv].nom)
    : att >= 0 ? ("◌ OUVERTURE DE " + MIDI.appareils[att].nom + "…")
    : (MIDI.appareils.length ? "○ AUCUN APPAREIL OUVERT · TOUCHEZ-EN UN" : "○ AUCUN APPAREIL BRANCHÉ");
}
function dessinerListeMidi(){
  var p = pontIds();
  boxMidi.innerHTML = "";
  MIDI.liste = MIDI.appareils.map(function(a){ return a.nom; });
  MIDI.ouvert = indexMidi(MIDI.ouvertId);
  if(!MIDI.appareils.length){
    boxMidi.textContent = "Aucun appareil MIDI trouvé. Branchez la carte : il apparaîtra ici tout seul.";
  }
  MIDI.appareils.forEach(function(a){
    var b = document.createElement("button");
    b.className = "sec"; b.textContent = a.nom;
    b.addEventListener("click", function(){
      if(a.id === MIDI.ouvertId){                 /* retoucher l'appareil ouvert le ferme */
        MIDI.dernier = ""; memMidi();
        try{ p.midiFermer(); }catch(e){}
      } else {
        MIDI.attenteId = a.id;
        try{ p.midiOuvrirId(a.id); }catch(e){ MIDI.attenteId = -1; }
      }
      majMidiUI(); majTemoinMidi(); H.inter();
    });
    boxMidi.appendChild(b);
  });
  majMidiUI(); majTemoinMidi();
}
function ouvrirDernierMidi(){
  var p = pontIds();
  if(!p || !MIDI.dernier || MIDI.ouvertId >= 0 || MIDI.attenteId >= 0) return;
  for(var i=0;i<MIDI.appareils.length;i++){
    if(MIDI.appareils[i].nom === MIDI.dernier){
      MIDI.attenteId = MIDI.appareils[i].id;
      try{ p.midiOuvrirId(MIDI.attenteId); }catch(e){ MIDI.attenteId = -1; }
      return;
    }
  }
}
window.__midiEtat = function(e){
  if(!e || typeof e !== "object") return;
  MIDI.dispo = true;
  MIDI.appareils = (e.appareils || []).map(function(a){ return {nom:String(a.nom), id:a.id|0}; });
  var etaitOuvert = MIDI.ouvertId >= 0;
  MIDI.ouvertId = (typeof e.ouvert === "number") ? e.ouvert : -1;
  var nom = String(e.nom || "").toUpperCase();
  if(e.evt === "ouvert"){
    MIDI.attenteId = -1;
    var k = indexMidi(MIDI.ouvertId);
    if(k >= 0){ MIDI.dernier = MIDI.appareils[k].nom; memMidi(); }
    signal("MIDI CONNECTÉ : " + nom);
  } else if(e.evt === "echec"){
    MIDI.attenteId = -1;
    signal("MIDI : OUVERTURE IMPOSSIBLE" + (nom ? " · " + nom : "") +
           (e.erreur ? " · " + String(e.erreur).toUpperCase() : ""));   /* v143 : la raison donnée par le système */
  } else if(e.evt === "perdu"){
    MIDI.attenteId = -1;
    signal("MIDI DÉBRANCHÉ : " + nom + " · CONNEXION FERMÉE");
  } else if(e.evt === "ferme"){
    signal("MIDI FERMÉ");
  } else if(e.evt === "ajout"){
    signal("MIDI BRANCHÉ : " + nom);
  } else if(e.evt === "retrait"){
    if(indexMidi(MIDI.attenteId) < 0) MIDI.attenteId = -1;
    signal("MIDI DÉBRANCHÉ : " + nom);
  }
  dessinerListeMidi();
  /* l'horloge ne part qu'une fois l'appareil vraiment ouvert */
  if(e.evt === "ouvert" && S.run) midiHorloge(true);
  if(e.evt === "ajout" || (!etaitOuvert && e.evt === "retrait")) ouvrirDernierMidi();
};

function chercherMidi(){
  var p = pont();
  if(p && pontIds()){
    try{ MIDI.dispo = !!p.midiDispo(); }catch(e){ MIDI.dispo = false; }
    if(!MIDI.dispo){ boxMidi.innerHTML = ""; boxMidi.textContent = "Ce téléphone ne déclare pas le MIDI."; majTemoinMidi(); return; }
    relireAppareilsMidi();
    dessinerListeMidi();
    ouvrirDernierMidi();
    return;
  }
  /* pont plus ancien, sans identifiants : comportement d'avant */
  boxMidi.innerHTML = "";
  if(!p){ boxMidi.textContent = "Pont indisponible."; return; }
  try{ MIDI.dispo = !!p.midiDispo(); }catch(e){ MIDI.dispo = false; }
  if(!MIDI.dispo){ boxMidi.textContent = "Ce téléphone ne déclare pas le MIDI."; return; }
  var l = "";
  try{ l = p.midiListe() || ""; }catch(e){}
  MIDI.liste = l ? l.split("\n") : [];
  if(!MIDI.liste.length){ boxMidi.textContent = "Aucun appareil MIDI trouvé. Branchez la carte puis recommencez."; return; }
  MIDI.liste.forEach(function(nom, i){
    var b = document.createElement("button");
    b.className = "sec"; b.textContent = nom;
    b.addEventListener("click", function(){
      try{ p.midiOuvrir(i); }catch(e){}
      MIDI.ouvert = i; majMidiUI(); H.inter();
      if(S.run) midiHorloge(true);
    });
    boxMidi.appendChild(b);
  });
  majMidiUI();
}
bScan.addEventListener("click", function(){ chercherMidi(); H.cran(); });
bOut.addEventListener("click", function(){ MIDI.out = !MIDI.out; majMidiUI(); memMidi(); H.cran(); });
bIn.addEventListener("click",  function(){ MIDI.in  = !MIDI.in;  majMidiUI(); memMidi(); H.cran(); });
bClk.addEventListener("click", function(){
  MIDI.clock = !MIDI.clock; majMidiUI(); memMidi(); H.cran();
  if(S.run) midiHorloge(MIDI.clock);
});
bCh.addEventListener("click", function(){ MIDI.canal = (MIDI.canal+1)%16; majMidiUI(); memMidi(); H.cran(); });
bChSy.addEventListener("click", function(){ MIDI.canalSy = (MIDI.canalSy+1)%16; majMidiUI(); memMidi(); H.cran(); });
bBase.addEventListener("click", function(){
  var v = [24,36,48,60];
  MIDI.base = v[(v.indexOf(MIDI.base)+1) % v.length];
  majMidiUI(); memMidi(); H.cran();
});
bSync.addEventListener("click", function(){
  MIDI.sync = !MIDI.sync;
  if(S.run) stop();
  majMidiUI(); memMidi(); H.inter();
  signal(MIDI.sync ? "LE SÉQUENCEUR SUIT L'HORLOGE REÇUE" : "HORLOGE INTERNE");
});
(function initMidi(){
  var p = pont();
  if(p){ try{ MIDI.dispo = !!p.midiDispo(); }catch(e){} }
  /* v131 : la liste est prête dès l'ouverture, et le dernier appareil choisi est
     rouvert s'il est branché. Après un rechargement de la page, l'appareil que
     Java tient encore ouvert est reconnu comme tel. */
  if(MIDI.dispo && pontIds()){ chercherMidi(); return; }
  majMidiUI();
})();
