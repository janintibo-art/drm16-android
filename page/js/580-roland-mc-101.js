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
   colorés de la machine. 0 veut dire silence. */
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
          scatOn:false, scatType:0, scatProf:0.5, note:0};
for(var mz=0; mz<MC_PISTES; mz++) MC.pistes.push(pisteMc(mz));

function pisteMcSel(){ return MC.pistes[MC.sel]; }
function clipMcCur(i){ var p = MC.pistes[i]; return p.clips[p.clip]; }

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
}
var MACHINE_MC = {schedule:scheduleMc, beat:beatMc, arret:arretMc,
                  longueur:function(){ return 16; }};

function memMc(){
  memoire.mc = {sel:MC.sel, scatType:MC.scatType, scatProf:MC.scatProf, note:MC.note,
    pistes:MC.pistes.map(function(P){
      return {type:P.type, onde:P.onde, cut:P.cut, dec:P.dec, niv:P.niv,
              muet:P.muet, oct:P.oct, clip:P.clip, clips:P.clips};
    })};
  sauverMachine("mc");
}
function chargerMc(){
  var m = memLire("mc");
  if(!m) return;
  if(typeof m.sel === "number") MC.sel = Math.max(0, Math.min(MC_PISTES - 1, m.sel));
  if(typeof m.scatType === "number") MC.scatType = Math.max(0, Math.min(MC_SCATTER.length - 1, m.scatType));
  if(typeof m.scatProf === "number") MC.scatProf = m.scatProf;
  if(typeof m.note === "number") MC.note = m.note;
  if(m.pistes) m.pistes.forEach(function(o, i){
    if(i >= MC_PISTES || !o) return;
    var P = MC.pistes[i];
    for(var q in o) if(q !== "clips" && P[q] !== undefined) P[q] = o[q];
    if(o.clips && o.clips.length === MC_CLIPS) P.clips = o.clips;
  });
}

