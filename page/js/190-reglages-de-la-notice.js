/* ================= réglages de la notice ================= */
function releveAudio(){
  if(!ctx) return "MOTEUR AUDIO PAS ENCORE DÉMARRÉ";
  var min = AUDIT.tJeu / 60000;
  return Math.round(ctx.sampleRate/100)/10 + " kHz · " + ctx.state +
         " · SORTIE " + Math.round((ctx.baseLatency || 0) * 1000) + " ms" +
         " · " + Math.round(min * 10) / 10 + " MIN DE JEU" +
         " · PIC " + AUDIT.pic + " SOURCES DONT " + AUDIT.picAvenir + " À VENIR" +
         " · PAUSE MAX " + AUDIT.pause + " ms" +
         (AUDIT.trous ? " (" + AUDIT.trous + " AU-DESSUS DE 150)" : " (AUCUN TROU)") +
         " · " + AUDIT.decroche + " DÉCROCHAGES" +
         (min > 0.2 ? " (" + (Math.round(AUDIT.decroche / min * 10) / 10) + " PAR MIN)" : "") +
         (AUDIT.relances ? " · " + AUDIT.relances + " RELANCES" : "");
}
/* ---------- latence de sortie (v144) ----------
   Le compromis entre réactivité et sûreté. « Sûre » (grand tampon) reste le
   choix d'Android, où les coupures étaient le premier souci ; sur ordinateur,
   « moyenne » est un meilleur départ pour jouer aux pads. Changer relance le
   moteur audio, comme le bouton RELANCER. */
var LATENCES = [["interactive", "COURTE"], ["balanced", "MOYENNE"], ["playback", "SÛRE"]];
function latenceChoisie(){
  for(var i=0;i<LATENCES.length;i++) if(LATENCES[i][0] === memoire.latence) return memoire.latence;
  return HOST.plateforme === "android" ? "playback" : "balanced";
}
function nomLatence(v){
  for(var i=0;i<LATENCES.length;i++) if(LATENCES[i][0] === v) return LATENCES[i][1];
  return v;
}
function majLatence(){
  var b = document.getElementById("b-latence");
  if(b) b.textContent = "LATENCE : " + nomLatence(latenceChoisie());
}
document.getElementById("b-latence").addEventListener("click", function(){
  var k = 0, v = latenceChoisie();
  for(var i=0;i<LATENCES.length;i++) if(LATENCES[i][0] === v) k = i;
  memoire.latence = LATENCES[(k + 1) % LATENCES.length][0];
  writeMem();
  majLatence();
  if(ctx && !ctx.startRendering) refaireAudio();
  var ms = ctx ? Math.round(((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000) : 0;
  signal("LATENCE " + nomLatence(latenceChoisie()) + (ms ? " · SORTIE " + ms + " ms" : ""));
  H.inter();
});
majLatence();

document.getElementById("b-audio-etat").addEventListener("click", function(){
  signal(releveAudio());
});
document.getElementById("b-audio-relance").addEventListener("click", function(){
  refaireAudio();
});
document.getElementById("b-panique").addEventListener("click", function(){
  stop();
  midiPanique();
  if(master && ctx){
    var now = maintenantAudio();
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(0.0001, now, 0.008);
    master.gain.setValueAtTime(0.0001, now+0.25);
    master.gain.linearRampToValueAtTime(S.vol, now+0.35);
  }
  couperSourcesFutures();
  reveillerAudio();
  signal("TOUT COUPÉ");
  H.stop();
});

