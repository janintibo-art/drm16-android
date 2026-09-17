/* ================= mémoire ================= */
var MEM = "drm.reglages";
var memoire = { modele:"16", vol:0.85, bpm:120, haptic:true, bg:true, bass:false,
                "16":{style:0,col:0,del:0,space:false,bank:0},
                "32":{style:0,col:0,del:0,space:false,bank:0} };
(function charger(){
  try{
    var m = JSON.parse(localStorage.getItem(MEM) || "{}");
    /* v144 : toute machine du menu est retrouvée au redémarrage. La liste écrite
       à la main oubliait K.O!, KAOSS PAD, MC-101 et SmplTrek, qui revenaient
       donc à la DRM16. */
    var modeles = [];
    try{
      document.querySelectorAll(".pick[data-m]").forEach(function(p){ if(p.dataset.m) modeles.push(p.dataset.m); });
    }catch(e){}
    if(["er2","ea2","es2"].concat(modeles).indexOf(m.modele) >= 0) memoire.modele = m.modele;
    if(["interactive","balanced","playback"].indexOf(m.latence) >= 0) memoire.latence = m.latence;
    if(typeof m.satHaute === "boolean") memoire.satHaute = m.satHaute;
    if(typeof m.hum === "number"){ memoire.hum = m.hum; HUM.temps = m.hum; }
    if(typeof m.wav === "number"){ memoire.wav = m.wav; WAVX.mesures = m.wav; }
    if(m.midi) memoire.midi = m.midi;
    /* On ne fait que retenir : SET est déclaré plus bas dans le fichier et
       n'existe pas encore ici. C'est appliquerMemSet(), appelée après sa
       déclaration, qui s'en sert. */
    if(m.set) memoire.set = m.set;
    /* ancien format : les machines vivaient dans le blob global, on les répartit une fois */
    ["em1","er1","er2","ea1","ea2","es1","es2","emx","esx","mpc3000","mpc2000","tr808","tr909","tr707","rd6","td3","eur","dmx","vlc","cr5","dbi","t1k","arcm"].forEach(function(c){
      if(m[c]){
        memoire[c] = m[c];
        try{ localStorage.setItem(MEM + "." + c, JSON.stringify(m[c])); }catch(e){}
      }
    });
    if(typeof m.vol === "number") memoire.vol = Math.min(1, Math.max(0, m.vol));
    if(typeof m.bpm === "number") memoire.bpm = Math.min(220, Math.max(40, m.bpm|0));
    if(typeof m.haptic === "boolean") memoire.haptic = m.haptic;
    if(typeof m.bg === "boolean") memoire.bg = m.bg;
    if(typeof m.metro === "boolean") memoire.metro = m.metro;
    if(typeof m.bass === "boolean") memoire.bass = m.bass;
    ["16","32"].forEach(function(k){
      var r = m[k]; if(!r) return;
      var d = memoire[k];
      if(typeof r.style === "number") d.style = Math.min(3, Math.max(0, r.style|0));
      if(typeof r.col   === "number") d.col   = Math.min(3, Math.max(0, r.col|0));
      if(typeof r.del   === "number") d.del   = Math.min(3, Math.max(0, r.del|0));
      if(typeof r.bank  === "number") d.bank  = r.bank ? 1 : 0;
      d.space = !!r.space;
    });
  }catch(e){}
  S.vol = memoire.vol; S.bpm = memoire.bpm;
  S.haptic = memoire.haptic; S.bg = memoire.bg; S.bass = memoire.bass;
})();
var saveTmr = null, machineTmr = {}, memEchec = false;
/* v145 : vrai pendant l'ouverture d'un projet — l'ancien état ne doit plus
   être écrit, même par le « pagehide » du rechargement */
var PROJET_EN_COURS = false;

/* chaque machine a sa propre clé : écrire un motif ne réécrit plus les onze */
function cleMachine(id){ return MEM + "." + id; }
function memLire(id){
  if(memoire[id] === undefined){
    try{ memoire[id] = JSON.parse(localStorage.getItem(cleMachine(id)) || "null") || undefined; }
    catch(e){ memoire[id] = undefined; }
  }
  return memoire[id];
}
function ecrireMachine(id){
  if(!memoire[id] || PROJET_EN_COURS) return;
  try{
    localStorage.setItem(cleMachine(id), JSON.stringify(memoire[id]));
    memEchec = false;
  }catch(e){
    if(!memEchec){ memEchec = true; signal("MÉMOIRE PLEINE · MOTIFS NON ENREGISTRÉS"); }
  }
}
function sauverMachine(id){
  clearTimeout(machineTmr[id]);
  machineTmr[id] = setTimeout(function(){ ecrireMachine(id); delete machineTmr[id]; }, 250);
}
function viderMachines(){
  for(var id in machineTmr){ clearTimeout(machineTmr[id]); ecrireMachine(id); }
  machineTmr = {};
}
function writeMem(){
  clearTimeout(saveTmr); saveTmr = null;
  if(PROJET_EN_COURS) return;
  /* Un départ MC peut déjà s'entendre avant la prochaine image ou le prochain
     tour du SET. Sauver/exporter maintenant doit conserver ce clip-là. */
  if(typeof MC !== "undefined" && MC) suivreClipsMc();
  viderMachines();
  try{
    memoire.modele = S.modele;
    memoire.vol = S.vol; memoire.bpm = S.bpm;
    memoire.haptic = S.haptic; memoire.bg = S.bg; memoire.bass = S.bass;
    if(S.modele === "16" || S.modele === "32")
      memoire[S.modele] = {style:S.style, col:S.col, del:S.del, space:S.space, bank:S.bank};
    localStorage.setItem(MEM, JSON.stringify({
      modele:memoire.modele, vol:memoire.vol, bpm:memoire.bpm, haptic:memoire.haptic,
      bg:memoire.bg, bass:memoire.bass, midi:memoire.midi, metro:memoire.metro,
      hum:memoire.hum, wav:memoire.wav, set:memoire.set, latence:memoire.latence, satHaute:memoire.satHaute,
      "16":memoire["16"], "32":memoire["32"]
    }));
    memEchec = false;
  }catch(e){
    if(!memEchec){ memEchec = true; signal("MÉMOIRE PLEINE · RÉGLAGES NON ENREGISTRÉS"); }
  }
}
/* toutes les écritures sont différées : la saisie d'un motif ne bloque plus l'affichage */
function save(){ clearTimeout(saveTmr); saveTmr = setTimeout(writeMem, 250); }
function saveSoon(){ clearTimeout(saveTmr); saveTmr = setTimeout(writeMem, 300); }
