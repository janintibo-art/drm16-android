/* ================= Pocket Operator K.O! =================
   Un échantillonneur de poche : seize emplacements, un séquenceur de seize
   pas, seize motifs qu'on enchaîne. Deux moitiés qui ne se jouent pas pareil —
   les huit premiers emplacements sont MÉLODIQUES (le même son à des hauteurs
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

function motifKo(){
  var m = {pas:[], last:16};
  for(var i=0;i<16;i++) m.pas.push(0);       /* un masque de 16 bits par emplacement */
  return m;
}
var KO = {sons:[], motifs:[], cur:0, sel:0, fx:0, fxTenu:false,
          rec:false, pos:-1, noeuds:null, chaine:[], chainePos:0, song:false};
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
  var src = ctx.createBufferSource();
  /* Les huit premiers emplacements montent la gamme : c'est le même son, joué
     plus ou moins vite. Les huit derniers gardent leur hauteur. */
  src.playbackRate.value = (k < 8) ? Math.pow(2, KO_NOTES[k] / 12) : 1;
  poserTampon(src, buf, src.playbackRate.value);
  var g = ctx.createGain();
  var pic = 0.8 * (vel === undefined ? 1 : vel);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(pic, t + 0.002);
  var d = Math.min(buf.duration / src.playbackRate.value, 1.6);
  g.gain.setValueAtTime(pic, t + Math.max(0.01, d - 0.03));
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(g); g.connect(pasVoie(n.e));
  src.start(t); src.stop(t + d + 0.05);
}

function scheduleKo(i, t){
  var CHARGE_N = ouvrirPas();
  var m = motifKoCur();
  if(i >= m.last) return;
  var nom = KO.fxTenu ? KO_FX[KO.fx][0] : "";
  for(var k=0;k<16;k++){
    if(!(m.pas[k] & (1 << i))) continue;
    /* HACHOIR : une frappe sur deux est avalée. ROULEMENT : chaque frappe en
       vaut quatre, serrées. Deux effets d'ordonnancement, pas de traitement. */
    if(nom === "gate" && (i % 2)) continue;
    if(nom === "roll"){
      for(var r=0;r<4;r++) CHARGE_N++, voixKo(t + r * stepDur() / 4, k, 1 - r * 0.15);
    } else CHARGE_N++, voixKo(t, k, 1);
  }
  if(!cache) queue.push({i:i, t:t});
  attenuerVoie("ko", CHARGE_N, t);
}

function beatKo(i){
  KO.pos = i;
  var b = document.querySelectorAll("#ko-pads .kb");
  for(var j=0;j<b.length;j++) b[j].classList.toggle("cur", j === i);
}
function arretKo(){
  if(KO.noeuds && KO.noeuds.ctx === ctx){
    try{ debrancherTout(KO.noeuds); }catch(e){}
  }
  KO.noeuds = null;
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
  memoire.ko = {sons:KO.sons, cur:KO.cur, sel:KO.sel, chaine:KO.chaine,
                motifs:KO.motifs.map(function(m){ return {pas:m.pas, last:m.last}; })};
  sauverMachine("ko");
}
function chargerKo(){
  var m = memLire("ko");
  if(!m) return;
  if(m.sons && m.sons.length === 16) KO.sons = m.sons.slice();
  if(typeof m.cur === "number") KO.cur = Math.max(0, Math.min(15, m.cur));
  if(typeof m.sel === "number") KO.sel = Math.max(0, Math.min(15, m.sel));
  if(m.chaine) KO.chaine = m.chaine.filter(function(x){ return x >= 0 && x < 16; });
  if(m.motifs) m.motifs.forEach(function(o, i){
    if(i >= 16 || !o) return;
    if(o.pas && o.pas.length === 16) KO.motifs[i].pas = o.pas.slice();
    KO.motifs[i].last = o.last || 16;
  });
}

