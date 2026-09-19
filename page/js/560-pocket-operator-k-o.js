/* ================= Pocket Operator K.O! =================
   Un échantillonneur de poche : seize emplacements, un séquenceur de seize
   pas, seize motifs qu'on enchaîne. Deux moitiés qui ne se jouent pas pareil —
   les huit premiers emplacements sont MÉLODIQUES (un son joué à des hauteurs
   différentes), les huit derniers sont des PERCUSSIONS (un son par touche).

   Sa vraie signature n'est pas là : ce sont les EFFETS AU POING. On choisit
   l'un des seize effets puis on maintient FX pendant la lecture. La v229 suit
   l'ordre 1–16 de la machine physique pour que les mêmes gestes donnent les
   mêmes familles de transformations en jeu direct. */

/* Ordre officiel des touches 1–16 du PO-33. Le seizième choix ne traite pas le
   son : il sert de position neutre et préparera l'effacement des effets écrits. */
var KO_FX = [
  ["loop16",      "BOUCLE 1/16"], ["loop12",      "BOUCLE 1/12"],
  ["loopShort",   "BOUCLE COURTE"],["loopTiny",   "BOUCLE MINI"],
  ["unison",      "UNISON"],      ["unisonLow",   "UNISON BAS"],
  ["octaveUp",    "+1 OCTAVE"],   ["octaveDown",  "-1 OCTAVE"],
  ["stutter4",    "STUTTER ×4"],  ["stutter3",    "STUTTER ×3"],
  ["scratch",     "SCRATCH"],     ["scratchFast", "SCRATCH RAP."],
  ["six8",        "QUANTIF. 6/8"],["retrigger",   "REDÉMARRAGE"],
  ["reverse",     "REVERSE"],     ["",            "SANS EFFET"]
];
var KO_NOTES = [0, 2, 4, 5, 7, 9, 11, 12];   /* la gamme des huit touches mélodiques */
/* Parameter Locks : une variation par pas, comme sur le PO-33. Les valeurs
   sont MIDI 0–127 ; l'absence de valeur signifie « réglage par défaut ». */
var KO_PLOCKS = [
  ["pitch",  "PITCH",  64],
  ["start",  "START",   0],
  ["length", "LENGTH",127],
  ["tone",   "TONE",  127]
];

function normaliserPlockKo(o){
  if(!o || typeof o !== "object") return null;
  var r = {};
  KO_PLOCKS.forEach(function(x){
    var v = Number(o[x[0]]);
    if(Number.isFinite(v)) r[x[0]] = Math.max(0, Math.min(127, Math.round(v)));
  });
  return Object.keys(r).length ? r : null;
}
function normaliserVerrousKo(a){
  var r = [];
  for(var i=0;i<16;i++) r.push(normaliserPlockKo(a && a[i]));
  return r;
}
function normaliserNotesKo(a){
  var r = [];
  for(var k=0;k<16;k++){
    var row = [], src = a && a[k];
    for(var i=0;i<16;i++){
      var v = src && Number(src[i]);
      row.push(Number.isFinite(v) ? Math.max(-24, Math.min(24, Math.round(v))) : null);
    }
    r.push(row);
  }
  return r;
}
function valeurPlockKo(o, nom, defaut){
  return o && Number.isFinite(o[nom]) ? Math.max(0, Math.min(127, o[nom])) : defaut;
}
/* Le swing est mémorisé de 0 à 1. À l'écran, cela correspond à 50 %
   (croches droites) jusqu'à 75 % (le second pas de chaque paire est retardé
   d'une demi-durée de pas). */
function normaliserSwingKo(v){
  v = Number(v);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
}
function pourcentageSwingKo(v){ return Math.round(50 + normaliserSwingKo(v) * 25); }
function tempsSwingKo(i, t){
  return (i & 1) ? t + stepDur() * 0.5 * normaliserSwingKo(KO.swing) : t;
}

function motifKo(){
  var m = {pas:[], last:16, plocks:[], notes:[]};
  for(var i=0;i<16;i++) m.pas.push(0);       /* un masque de 16 bits par emplacement */
  for(var j=0;j<16;j++) m.plocks.push(null);
  for(var k=0;k<16;k++){
    var row = [];
    for(var n=0;n<16;n++) row.push(null);
    m.notes.push(row);
  }
  return m;
}
var KO = {sons:[], motifs:[], cur:0, sel:0, fx:15, fxTenu:false, fxStep:0,
          rec:false, pos:-1, lockStep:0, chroma:false, chromaSource:0, swing:0,
          noeuds:null, inverse:null, inverseCtx:null,
          chaine:[], chainePos:0, song:false};
for(var kz=0; kz<16; kz++) KO.sons.push("b" + (kz % 24));
for(var kz2=0; kz2<16; kz2++) KO.motifs.push(motifKo());

function motifKoCur(){ return KO.motifs[KO.cur]; }

/* La chaîne de sortie, avec ce qu'il faut pour les effets au poing. Elle est
   bâtie une fois et gardée : refaire ces nœuds à chaque frappe coûterait cher
   pour rien. */
function noeudsKo(){
  if(KO.noeuds && KO.noeuds.ctx === ctx) return KO.noeuds;
  var e = eurGain(1);
  var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 20000;
  var sat = ctx.createWaveShaper();
  var g = eurGain(1);
  var d = ctx.createDelay(0.6), fb = eurGain(0), mix = eurGain(0);
  e.connect(f); f.connect(sat); sat.connect(g);
  g.connect(d); d.connect(fb); fb.connect(d); d.connect(mix);
  var out = eurGain(1);
  g.connect(out); mix.connect(out);
  out.connect(busSet("ko") || master);
  KO.noeuds = {ctx:ctx, e:e, f:f, sat:sat, g:g, d:d, fb:fb, mix:mix, out:out};
  appliquerFxKo();
  return KO.noeuds;
}

/* Les effets v229 sont des transformations de lecture : la chaîne globale
   reste neutre et les variations sont créées au moment d'ordonner les voix.
   On remet néanmoins tous les nœuds à zéro à chaque prise/relâchement afin
   qu'une ancienne session v228 ne puisse laisser un filtre ou un délai actif. */
function appliquerFxKo(){
  var n = KO.noeuds;
  if(!n || n.ctx !== ctx) return;
  n.f.type = "lowpass"; n.f.frequency.value = 20000; n.f.Q.value = 0.7;
  n.sat.curve = null; n.sat.oversample = "none";
  n.g.gain.value = 1;
  n.fb.gain.value = 0; n.mix.gain.value = 0;
}

function nomFxKo(){
  if(!KO.fxTenu) return "";
  var i = Math.max(0, Math.min(KO_FX.length - 1, KO.fx|0));
  return KO_FX[i][0];
}
function moduloKo(v, n){ return ((v % n) + n) % n; }

/* Les BufferSource Web Audio ne savent pas lire avec une vitesse négative.
   REVERSE et la phase retour du SCRATCH utilisent donc une copie retournée,
   construite une seule fois par tampon et par contexte audio. */
function tamponInverseKo(buf){
  if(!ctx || !buf) return buf;
  if(KO.inverseCtx !== ctx || !KO.inverse){ KO.inverseCtx = ctx; KO.inverse = new WeakMap(); }
  var deja = KO.inverse.get(buf);
  if(deja) return deja;
  var r = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
  for(var c=0;c<buf.numberOfChannels;c++){
    var a = buf.getChannelData(c), b = r.getChannelData(c);
    for(var i=0,n=buf.length;i<n;i++) b[i] = a[n - 1 - i];
  }
  KO.inverse.set(buf, r);
  return r;
}

function voixKo(t, k, vel){
  audioInit(); if(!ctx) return;
  banqueEs();
  var n = noeudsKo();
  var buf = ES.buf[KO.sons[k]];
  if(!buf) return;
  var pas = arguments.length > 3 ? arguments[3] : -1;
  var note = arguments.length > 4 && Number.isFinite(arguments[4])
    ? Math.max(-24, Math.min(24, Math.round(arguments[4]))) : null;
  var options = arguments.length > 5 && arguments[5] ? arguments[5] : {};
  var verrou = pas >= 0 ? normaliserPlockKo(motifKoCur().plocks && motifKoCur().plocks[pas]) : null;
  var src = ctx.createBufferSource();
  /* En mode normal, les huit emplacements mélodiques gardent leur gamme
     prédéfinie. CHROMA fournit sa propre hauteur ; les effets d'octave ajoutent
     ensuite leur transposition sans altérer la note mémorisée. */
  var base = note === null ? ((k < 8) ? KO_NOTES[k] : 0) : note;
  base += Number.isFinite(options.transpose) ? options.transpose : 0;
  var vitesse = Math.pow(2, base / 12);
  if(verrou) vitesse *= Math.pow(2, (valeurPlockKo(verrou, "pitch", 64) - 64) / 12);
  vitesse = Math.max(0.03125, Math.min(16, vitesse));
  src.playbackRate.value = vitesse;
  if(src.detune && Number.isFinite(options.detune)) src.detune.value = options.detune;
  var tampon = options.reverse ? tamponInverseKo(buf) : buf;
  poserTampon(src, tampon, vitesse);
  var g = ctx.createGain();
  var pic = 0.8 * Math.max(0, Math.min(1.5, vel === undefined ? 1 : vel));
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(pic, t + 0.002);
  var debut = verrou ? valeurPlockKo(verrou, "start", 0) / 127 * tampon.duration * 0.95 : 0;
  var portion = verrou ? 0.05 + valeurPlockKo(verrou, "length", 127) / 127 * 0.95 : 1;
  var d = Math.min(Math.max(0.01, (tampon.duration - debut) / vitesse), 1.6) * portion;
  if(Number.isFinite(options.maxDuration)) d = Math.min(d, Math.max(0.012, options.maxDuration));
  d = Math.max(0.012, d);
  g.gain.setValueAtTime(pic, t + Math.max(0.01, d - 0.03));
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  var filtre = null;
  if(verrou && Number.isFinite(verrou.tone)){
    filtre = ctx.createBiquadFilter(); filtre.type = "lowpass";
    filtre.frequency.value = 180 * Math.pow(100, valeurPlockKo(verrou, "tone", 127) / 127);
    filtre.Q.value = 0.7;
    src.connect(filtre); filtre.connect(g);
  }else src.connect(g);
  g.connect(pasVoie(n.e));
  src.start(t, Math.min(debut, Math.max(0, tampon.duration - 0.01))); src.stop(t + d + 0.05);
}

/* Déclenche une frappe avec la variante de timbre demandée. La valeur renvoyée
   est le nombre réel de voix, utilisé par la protection contre la saturation. */
function jouerVoixFxKo(nom, t, k, pas, note, vel, duree){
  var d = Number.isFinite(duree) ? {maxDuration:duree} : {};
  if(nom === "unison"){
    voixKo(t,k,vel*.62,pas,note,{detune:-11,maxDuration:d.maxDuration});
    voixKo(t,k,vel*.62,pas,note,{detune:11,maxDuration:d.maxDuration});
    return 2;
  }
  if(nom === "unisonLow"){
    voixKo(t,k,vel*.78,pas,note,{maxDuration:d.maxDuration});
    voixKo(t,k,vel*.48,pas,note,{transpose:-12,maxDuration:d.maxDuration});
    return 2;
  }
  if(nom === "octaveUp") d.transpose = 12;
  else if(nom === "octaveDown") d.transpose = -12;
  else if(nom === "reverse") d.reverse = true;
  voixKo(t,k,vel,pas,note,d);
  return 1;
}

/* Transforme un pas de transport en un petit plan de lecture. Les boucles
   figent le pas capturé au moment où FX est enfoncé ; les stutters répètent le
   pas courant. QUANTIF. 6/8 répartit trois impulsions sur quatre doubles
   croches, et REDÉMARRAGE repart du début du motif sans déplacer le transport. */
function planFxKo(i, t, m, nom){
  var plan = {source:i, temps:[t], vitesses:[1], duree:null};
  var d = stepDur(), phase;
  if(nom === "loop16") plan.source = moduloKo(KO.fxStep, m.last);
  else if(nom === "loop12"){
    plan.source = moduloKo(KO.fxStep, m.last);
    phase = moduloKo(i - KO.fxStep, 4);
    if(phase === 3) plan.temps = [];
    else plan.temps = [t + phase * d / 3];
    plan.duree = d * 1.2;
  }else if(nom === "loopShort" || nom === "loopTiny"){
    plan.source = moduloKo(KO.fxStep, m.last);
    var n = nom === "loopShort" ? 2 : 4;
    plan.temps = []; plan.vitesses = []; plan.duree = d / n * .9;
    for(var r=0;r<n;r++){ plan.temps.push(t + r*d/n); plan.vitesses.push(1-r*.08); }
  }else if(nom === "stutter4" || nom === "stutter3"){
    var q = nom === "stutter4" ? 4 : 3;
    plan.temps = []; plan.vitesses = []; plan.duree = d / q * .82;
    for(var s=0;s<q;s++){ plan.temps.push(t + s*d/q); plan.vitesses.push(1-s*.14); }
  }else if(nom === "six8"){
    phase = moduloKo(i - KO.fxStep, 4);
    if(phase === 3) plan.temps = [];
    else plan.temps = [t + phase*d/3];
  }else if(nom === "retrigger") plan.source = moduloKo(i - KO.fxStep, m.last);
  return plan;
}

function scheduleKo(i, t){
  var CHARGE_N = ouvrirPas();
  var m = motifKoCur();
  if(i >= m.last) return;
  var nom = nomFxKo();
  /* Le 6/8 et la boucle 1/12 imposent leur propre grille ternaire. Les autres
     effets conservent le swing choisi par l'utilisateur. */
  if(nom !== "six8" && nom !== "loop12") t = tempsSwingKo(i, t);
  var plan = planFxKo(i, t, m, nom);
  var source = moduloKo(plan.source, m.last);
  for(var k=0;k<16;k++){
    if(!(m.pas[k] & (1 << source))) continue;
    var note = m.notes && m.notes[k] ? m.notes[k][source] : null;
    if(nom === "scratch" || nom === "scratchFast"){
      var coups = nom === "scratch" ? 2 : 4;
      for(var sc=0;sc<coups;sc++){
        var rev = !!(sc & 1), trans = rev ? -5 : 7;
        CHARGE_N++;
        voixKo(t + sc*stepDur()/(coups*2), k, 1-sc*.13, source, note,
          {reverse:rev, transpose:trans, maxDuration:stepDur()/(coups*1.25)});
      }
      continue;
    }
    for(var r=0;r<plan.temps.length;r++){
      CHARGE_N += jouerVoixFxKo(nom, plan.temps[r], k, source, note,
        plan.vitesses[r] === undefined ? 1 : plan.vitesses[r], plan.duree);
    }
  }
  var temoin = plan.temps.length ? plan.temps[0] : t;
  if(!cache) queue.push({i:i, t:temoin});
  attenuerVoie("ko", CHARGE_N, temoin);
}

function beatKo(i){
  KO.pos = i;
  KO.lockStep = Math.max(0, Math.min(15, i|0));
  var b = document.querySelectorAll("#ko-pads .kb");
  for(var j=0;j<b.length;j++) b[j].classList.toggle("cur", j === i);
  if(typeof majKoPlock === "function") majKoPlock();
}
function arretKo(){
  KO.fxTenu = false;
  if(KO.noeuds && KO.noeuds.ctx === ctx){
    try{ appliquerFxKo(); debrancherTout(KO.noeuds); }catch(e){}
  }
  KO.noeuds = null; KO.pos = -1; KO.lockStep = 0; KO.fxStep = 0;
}
function boucleKo(){
  if(KO.song && KO.chaine.length){
    KO.chainePos = (KO.chainePos + 1) % KO.chaine.length;
    KO.cur = KO.chaine[KO.chainePos];
    majKo();
  }
}
var MACHINE_KO = {schedule:scheduleKo, beat:beatKo, arret:arretKo, boucle:boucleKo,
                  longueur:function(){ return motifKoCur().last; }};

function memKo(){
  memoire.ko = {sons:KO.sons, cur:KO.cur, sel:KO.sel, chroma:!!KO.chroma,
                chromaSource:Math.max(0, Math.min(7, KO.chromaSource|0)),
                swing:normaliserSwingKo(KO.swing), chaine:KO.chaine,
                motifs:KO.motifs.map(function(m){ return {pas:m.pas, last:m.last,
                  plocks:normaliserVerrousKo(m.plocks), notes:normaliserNotesKo(m.notes)}; })};
  sauverMachine("ko");
}
function chargerKo(){
  KO.lockStep = 0;
  KO.chroma = false; KO.chromaSource = 0; KO.swing = 0;
  var m = memLire("ko");
  if(!m) return;
  if(m.sons && m.sons.length === 16) KO.sons = m.sons.slice();
  if(typeof m.cur === "number") KO.cur = Math.max(0, Math.min(15, m.cur));
  if(typeof m.sel === "number") KO.sel = Math.max(0, Math.min(15, m.sel));
  if(typeof m.chroma === "boolean") KO.chroma = m.chroma;
  if(typeof m.chromaSource === "number") KO.chromaSource = Math.max(0, Math.min(7, m.chromaSource|0));
  if(typeof m.swing === "number") KO.swing = normaliserSwingKo(m.swing);
  if(m.chaine) KO.chaine = m.chaine.filter(function(x){ return x >= 0 && x < 16; });
  if(m.motifs) m.motifs.forEach(function(o, i){
    if(i >= 16 || !o) return;
    if(o.pas && o.pas.length === 16) KO.motifs[i].pas = o.pas.slice();
    KO.motifs[i].plocks = normaliserVerrousKo(o.plocks);
    KO.motifs[i].notes = normaliserNotesKo(o.notes);
    KO.motifs[i].last = o.last || 16;
  });
}
