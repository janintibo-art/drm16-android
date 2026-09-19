/* ================= Pocket Operator K.O! =================
   Un échantillonneur de poche : seize emplacements, un séquenceur de seize
   pas, seize motifs qu'on enchaîne. Deux moitiés qui ne se jouent pas pareil —
   les huit premiers emplacements sont MÉLODIQUES (un son joué à des hauteurs
   différentes), les huit derniers sont des PERCUSSIONS (un son par touche).

   Sa vraie signature n'est pas là : ce sont les EFFETS AU POING. On maintient
   FX et on frappe un numéro ; l'effet dure tant qu'on tient. Rien ne s'écrit,
   rien ne se règle — c'est un geste, pas un réglage. C'est ce qui fait qu'on
   joue de cette machine au lieu de la programmer. */

var KO_FX = [
  ["", "AUCUN"],
  ["lp",   "PASSE-BAS"],      ["hp",  "PASSE-HAUT"],
  ["crush","BIT CRUSH"],      ["gate","HACHOIR"],
  ["echo", "ÉCHO"],           ["sat", "SATURATION"],
  ["stop", "COUPURE"],        ["roll","ROULEMENT"]
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
var KO = {sons:[], motifs:[], cur:0, sel:0, fx:0, fxTenu:false,
          rec:false, pos:-1, lockStep:0, chroma:false, chromaSource:0, swing:0,
          noeuds:null, chaine:[], chainePos:0, song:false};
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

/* Un effet au poing ne se règle pas : il s'applique ou non. On pose donc les
   valeurs d'un coup, sans transition — c'est ce qui fait qu'on l'entend. */
function appliquerFxKo(){
  var n = KO.noeuds;
  if(!n || n.ctx !== ctx) return;
  var nom = KO.fxTenu ? KO_FX[KO.fx][0] : "";
  n.f.type = "lowpass"; n.f.frequency.value = 20000; n.f.Q.value = 0.7;
  n.sat.curve = null;
  n.g.gain.value = 1;
  n.fb.gain.value = 0; n.mix.gain.value = 0;
  if(nom === "lp"){ n.f.frequency.value = 420; n.f.Q.value = 6; }
  else if(nom === "hp"){ n.f.type = "highpass"; n.f.frequency.value = 900; n.f.Q.value = 4; }
  else if(nom === "crush"){ n.sat.curve = courbeCrushKo(); n.sat.oversample = "none"; }
  else if(nom === "sat"){ n.sat.curve = courbeArcm(0.85); n.sat.oversample = "2x"; n.g.gain.value = 0.55; }
  else if(nom === "echo"){ n.d.delayTime.value = stepDur() * 1.5; n.fb.gain.value = 0.55; n.mix.gain.value = 0.7; }
  else if(nom === "stop"){ n.g.gain.value = 0; }
  /* HACHOIR et ROULEMENT n'agissent pas sur le son mais sur l'ordonnancement :
     ils sont traités dans scheduleKo. */
}
/* Un escalier à seize marches : c'est la réduction de résolution, pas une
   saturation. Le son devient granuleux au lieu de devenir gros. */
var KO_CRUSH = null;
function courbeCrushKo(){
  if(KO_CRUSH) return KO_CRUSH;
  var n = 1025, c = new Float32Array(n), marches = 16;
  for(var i=0;i<n;i++){
    var x = i * 2 / (n - 1) - 1;
    c[i] = Math.round(x * marches) / marches;
  }
  KO_CRUSH = c;
  return c;
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
  var verrou = pas >= 0 ? normaliserPlockKo(motifKoCur().plocks && motifKoCur().plocks[pas]) : null;
  var src = ctx.createBufferSource();
  /* En mode normal, les huit emplacements mélodiques gardent leur gamme
     prédéfinie. Une note fournie par le mode CHROMA remplace cette base et
     permet de jouer le même échantillon sur seize demi-tons voisins. */
  var base = note === null ? ((k < 8) ? KO_NOTES[k] : 0) : note;
  var vitesse = Math.pow(2, base / 12);
  if(verrou) vitesse *= Math.pow(2, (valeurPlockKo(verrou, "pitch", 64) - 64) / 12);
  vitesse = Math.max(0.03125, Math.min(16, vitesse));
  src.playbackRate.value = vitesse;
  poserTampon(src, buf, vitesse);
  var g = ctx.createGain();
  var pic = 0.8 * (vel === undefined ? 1 : vel);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(pic, t + 0.002);
  var debut = verrou ? valeurPlockKo(verrou, "start", 0) / 127 * buf.duration * 0.95 : 0;
  var portion = verrou ? 0.05 + valeurPlockKo(verrou, "length", 127) / 127 * 0.95 : 1;
  var d = Math.min(Math.max(0.01, (buf.duration - debut) / vitesse), 1.6) * portion;
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
  src.start(t, Math.min(debut, Math.max(0, buf.duration - 0.01))); src.stop(t + d + 0.05);
}

function scheduleKo(i, t){
  var CHARGE_N = ouvrirPas();
  var m = motifKoCur();
  if(i >= m.last) return;
  /* Le temps décalé sert à la fois aux voix et au témoin de lecture. */
  t = tempsSwingKo(i, t);
  var nom = KO.fxTenu ? KO_FX[KO.fx][0] : "";
  for(var k=0;k<16;k++){
    if(!(m.pas[k] & (1 << i))) continue;
    /* HACHOIR : une frappe sur deux est avalée. ROULEMENT : chaque frappe en
       vaut quatre, serrées. Deux effets d'ordonnancement, pas de traitement. */
    if(nom === "gate" && (i % 2)) continue;
    var note = m.notes && m.notes[k] ? m.notes[k][i] : null;
    if(nom === "roll"){
      for(var r=0;r<4;r++) CHARGE_N++, voixKo(t + r * stepDur() / 4, k, 1 - r * 0.15, i, note);
    } else CHARGE_N++, voixKo(t, k, 1, i, note);
  }
  if(!cache) queue.push({i:i, t:t});
  attenuerVoie("ko", CHARGE_N, t);
}

function beatKo(i){
  KO.pos = i;
  KO.lockStep = Math.max(0, Math.min(15, i|0));
  var b = document.querySelectorAll("#ko-pads .kb");
  for(var j=0;j<b.length;j++) b[j].classList.toggle("cur", j === i);
  if(typeof majKoPlock === "function") majKoPlock();
}
function arretKo(){
  if(KO.noeuds && KO.noeuds.ctx === ctx){
    try{ debrancherTout(KO.noeuds); }catch(e){}
  }
  KO.noeuds = null; KO.pos = -1; KO.lockStep = 0;
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
