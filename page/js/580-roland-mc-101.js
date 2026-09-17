/* ================= Roland MC-101 =================
   Quatre pistes, des clips qu'on enchaîne, et surtout le SCATTER : un
   malaxeur de motif qui agit EN DIRECT sans rien modifier. On le laisse
   tourner, on tourne le bouton, et la mesure se déforme — puis on le coupe et
   tout revient. C'est ce qui distingue cette machine d'un séquenceur : elle
   n'écrit pas ce qu'elle fait.

   Le SCATTER n'est donc pas un effet audio : il change QUEL pas est joué.
   C'est pour cela qu'il s'entend même sur une seule caisse claire. */

var MC_PISTES = 4, MC_CLIPS = 4;

var MC_SCATTER = [
  ["répétition", "chaque groupe de quatre pas rejoue le premier"],
  ["à l'envers",  "la mesure se lit de la fin vers le début"],
  ["hachoir",     "un pas sur deux est avalé"],
  ["roulement",   "chaque pas devient quatre coups serrés"],
  ["moitié",      "la mesure est jouée deux fois moins vite"],
  ["saut",        "on lit huit pas plus loin"],
  ["gel",         "le premier pas se répète sans fin"],
  ["au hasard",   "les pas sont tirés au sort dans la mesure"]
];
/* Les notes des seize pads : deux octaves d'une gamme majeure, comme les pads
   colorés de la machine. -1 veut dire silence dans un clip. */
var MC_GAMME = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26];

function clipMc(){
  var c = [];
  for(var i=0;i<16;i++) c.push(-1);      /* -1 : pas vide */
  return c;
}
function pisteMc(i){
  var p = {type:(i === 0 ? "drum" : "synth"), onde:(i % 2 ? "sawtooth" : "square"),
           cut:0.6, dec:0.4, niv:0.8, muet:false, oct:0, clip:0, clips:[]};
  for(var c=0;c<MC_CLIPS;c++) p.clips.push(clipMc());
  return p;
}
var MC = {pistes:[], sel:0, pos:-1, noeuds:null,
          scatOn:false, scatType:0, scatProf:0.5, note:0, copie:null};
for(var mz=0; mz<MC_PISTES; mz++) MC.pistes.push(pisteMc(mz));

function pisteMcSel(){ return MC.pistes[MC.sel]; }
function clipMcCur(i){ var p = MC.pistes[i]; return p.clips[p.clip]; }

/* v173 : seize pas indépendants par clip, y compris après une copie ou une
   restauration. Une sauvegarde partielle ne peut créer ni trou ni note NaN. */
function nombreMc(v, min, max, repli, entier){
  if(typeof v !== "number" || !isFinite(v)) return repli;
  v = Math.max(min, Math.min(max, v));
  return entier ? Math.floor(v) : v;
}
function lireClipMc(pas, type){
  var copie = clipMc();
  if(!Array.isArray(pas)) return copie;
  for(var i=0;i<16;i++){
    var n = pas[i];
    if(typeof n !== "number" || !isFinite(n) || Math.floor(n) !== n || n < 0 || n > 127) continue;
    copie[i] = type === "drum" ? n % 4 : n;
  }
  return copie;
}
function choisirClipMc(k){
  if(typeof k !== "number" || Math.floor(k) !== k || k < 0 || k >= MC_CLIPS){
    signal("CLIP INVALIDE"); return false;
  }
  var P = pisteMcSel();
  if(P.clip === k) return true;
  P.clip = k;
  memMc(); majMc();
  return true;
}
function copierClipMc(){
  var P = pisteMcSel();
  MC.copie = {type:P.type, piste:MC.sel, clip:P.clip, pas:lireClipMc(clipMcCur(MC.sel), P.type)};
  majClipsMc();
  signal("PISTE " + (MC.sel + 1) + " · CLIP " + (P.clip + 1) + " COPIÉ");
}
function collerClipMc(){
  var copie = MC.copie, P = pisteMcSel();
  if(!copie){ signal("COPIEZ D'ABORD UN CLIP"); return false; }
  if(copie.type !== P.type){
    signal("COPIE " + (copie.type === "drum" ? "RYTHMIQUE" : "MÉLODIQUE") + " · CHOISISSEZ UNE PISTE DU MÊME TYPE");
    return false;
  }
  var cible = clipMcCur(MC.sel);
  if(cible.some(function(n){ return n >= 0; }) &&
     !window.confirm("Remplacer le clip " + (P.clip + 1) + " de la piste " + (MC.sel + 1) + " par la copie ?")) return false;
  /* Une nouvelle liste à CHAQUE collage : ni la source ni le presse-papiers
     ne doivent partager les futures modifications de la destination. */
  P.clips[P.clip] = lireClipMc(copie.pas, P.type);
  memMc(); majMc();
  signal("COPIE COLLÉE · PISTE " + (MC.sel + 1) + " · CLIP " + (P.clip + 1));
  return true;
}

function noeudsMc(){
  if(MC.noeuds && MC.noeuds.ctx === ctx) return MC.noeuds;
  var e = eurGain(1);
  e.connect(busSet("mc") || master);
  MC.noeuds = {ctx:ctx, e:e};
  return MC.noeuds;
}

/* Une voix par piste. La première est percussive — la note choisit
   l'instrument —, les trois autres sont mélodiques. */
function voixMc(t, i, note, vel){
  audioInit(); if(!ctx) return;
  var P = MC.pistes[i], n = noeudsMc();
  var g = ctx.createGain();
  var pic = P.niv * (vel === undefined ? 1 : vel);
  g.connect(pasVoie(n.e));

  if(P.type === "drum"){
    var quoi = note % 4;                       /* 0 grosse, 1 caisse, 2 charley, 3 clap */
    var d = 0.06 + P.dec * (quoi === 0 ? 0.5 : 0.25);
    if(quoi === 0){
      var o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.06);
      g.gain.setValueAtTime(pic, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); o.start(t); o.stop(t + d + 0.02);
    } else {
      var b = eurBruit();
      var f = ctx.createBiquadFilter();
      f.type = (quoi === 2) ? "highpass" : "bandpass";
      f.frequency.value = quoi === 2 ? 7000 : (quoi === 1 ? 1900 : 1200);
      f.Q.value = quoi === 3 ? 1.2 : 0.8;
      if(quoi === 2) d = 0.02 + P.dec * 0.12;
      g.gain.setValueAtTime(pic * 0.8, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      b.connect(f); f.connect(g); b.stop(t + d + 0.05);
    }
    return;
  }

  var hz = 110 * Math.pow(2, (note + P.oct * 12) / 12);
  var o2 = ctx.createOscillator();
  o2.type = P.onde;
  o2.frequency.value = hz;
  var f2 = ctx.createBiquadFilter();
  f2.type = "lowpass"; f2.Q.value = 6;
  var haut = Math.min(14000, hz * 2 + P.cut * 7000);
  var d2 = 0.05 + P.dec * 0.9;
  f2.frequency.setValueAtTime(haut, t);
  f2.frequency.exponentialRampToValueAtTime(Math.max(90, hz * 1.1), t + d2 * 0.8);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(pic * 0.45, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d2);
  o2.connect(f2); f2.connect(g);
  o2.start(t); o2.stop(t + d2 + 0.05);
}

/* Le SCATTER : quel pas jouer, et combien de fois. Il ne touche pas au motif —
   c'est ce qui permet de le couper et de tout retrouver intact. */
function scatterMc(i){
  if(!MC.scatOn) return {pas:i, coups:1};
  /* La profondeur décide combien de pas sont touchés : à faible profondeur,
     seule la fin de la mesure est malmenée, ce qui donne une cassure au lieu
     d'un chaos permanent. */
  var seuil = Math.round((1 - MC.scatProf) * 16);
  if(i < seuil) return {pas:i, coups:1};
  switch(MC.scatType){
    case 0: return {pas:(i & ~3), coups:1};
    case 1: return {pas:15 - i, coups:1};
    case 2: return (i % 2) ? {pas:-1, coups:0} : {pas:i, coups:1};
    case 3: return {pas:i, coups:4};
    case 4: return {pas:i >> 1, coups:1};
    case 5: return {pas:(i + 8) % 16, coups:1};
    case 6: return {pas:seuil, coups:1};
    default: return {pas:Math.floor(Math.random() * 16), coups:1};
  }
}

function scheduleMc(i, t){
  var CHARGE_N = ouvrirPas();
  var s = scatterMc(i);
  if(s.pas < 0) { if(!cache) queue.push({i:i, t:t}); return; }
  for(var k=0;k<MC_PISTES;k++){
    var P = MC.pistes[k];
    if(P.muet) continue;
    var note = clipMcCur(k)[s.pas];
    if(note < 0) continue;
    for(var r=0;r<s.coups;r++)
      CHARGE_N++, voixMc(t + r * stepDur() / s.coups, k, note, 1 - r * 0.18);
  }
  if(!cache) queue.push({i:i, t:t});
  attenuerVoie("mc", CHARGE_N, t);
}
function beatMc(i){
  MC.pos = i;
  var b = document.querySelectorAll("#mc-pads .mb");
  for(var j=0;j<b.length;j++) b[j].classList.toggle("cur", j === i);
}
function arretMc(){
  if(MC.noeuds && MC.noeuds.ctx === ctx){
    try{ debrancherTout(MC.noeuds); }catch(e){}
  }
  MC.noeuds = null;
  beatMc(-1);
}
var MACHINE_MC = {schedule:scheduleMc, beat:beatMc, arret:arretMc,
                  longueur:function(){ return 16; }};

function memMc(){
  memoire.mc = {sel:MC.sel, scatType:MC.scatType, scatProf:MC.scatProf, note:MC.note,
    pistes:MC.pistes.map(function(P){
      return {type:P.type, onde:P.onde, cut:P.cut, dec:P.dec, niv:P.niv,
              muet:P.muet, oct:P.oct, clip:P.clip, clips:P.clips.map(function(c){ return c.slice(); })};
    })};
  sauverMachine("mc");
}
function chargerMc(){
  var m = memLire("mc");
  if(!m || typeof m !== "object" || Array.isArray(m)) return;
  MC.sel = nombreMc(m.sel, 0, MC_PISTES - 1, 0, true);
  MC.scatType = nombreMc(m.scatType, 0, MC_SCATTER.length - 1, 0, true);
  MC.scatProf = nombreMc(m.scatProf, 0, 1, 0.5, false);
  MC.note = nombreMc(m.note, 0, 15, 0, true);
  for(var i=0;i<MC_PISTES;i++){
    var P = pisteMc(i), o = Array.isArray(m.pistes) ? m.pistes[i] : null;
    if(o && typeof o === "object" && !Array.isArray(o)){
      if(o.type === "drum" || o.type === "synth") P.type = o.type;
      if(["sawtooth","square","triangle","sine"].indexOf(o.onde) >= 0) P.onde = o.onde;
      P.cut = nombreMc(o.cut, 0, 1, P.cut, false);
      P.dec = nombreMc(o.dec, 0, 1, P.dec, false);
      P.niv = nombreMc(o.niv, 0, 1, P.niv, false);
      P.oct = nombreMc(o.oct, -4, 4, 0, true);
      P.muet = o.muet === true;
      P.clip = nombreMc(o.clip, 0, MC_CLIPS - 1, 0, true);
      for(var j=0;j<MC_CLIPS;j++)
        P.clips[j] = lireClipMc(Array.isArray(o.clips) ? o.clips[j] : null, P.type);
    }
    MC.pistes[i] = P;
  }
}
