/* ================= métronome ================= */
/* Pendant un rendu hors ligne, le contexte n'a pas d'horloge qui avance :
   maintenantAudio() resterait à zéro et toutes les notes se superposeraient au
   premier instant. OFF_T porte alors l'instant voulu, et vaut -1 le reste du
   temps — c'est-à-dire toujours, sauf pendant la boucle synchrone du rendu. */
var OFF_T = -1;
function maintenantAudio(){ return OFF_T >= 0 ? OFF_T : ctx.currentTime; }

var METRO = false;
function clicMetro(t, fort){
  if(!METRO || !ctx || !master) return;
  var o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(fort ? 1760 : 1100, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(fort ? 0.22 : 0.13, t+0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t+0.035);
  var pb = ctx.createBiquadFilter(); pb.type="bandpass";
  pb.frequency.value = fort ? 1760 : 1100; pb.Q.value = 3;
  o.connect(pb); pb.connect(g); g.connect(master);
  o.start(t); o.stop(t+0.05);
}

