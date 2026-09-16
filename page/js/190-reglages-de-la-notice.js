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

