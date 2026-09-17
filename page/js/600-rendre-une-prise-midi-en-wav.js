/* ================= rendre une prise MIDI en WAV =================
   Une prise exportée en .mid contient des NOTES : il faut la même application
   pour la réentendre. En WAV, on repart avec le SON — le téléphone devient
   vraiment autonome pour enregistrer un live.

   On rejoue les événements dans un contexte hors ligne, exactement comme
   l'export du séquenceur. La différence : au lieu d'un motif qui se répète,
   on déroule la liste des événements datés, chacun sur la machine à laquelle
   son canal est aiguillé. */
function exporterPriseWav(i){
  var prise = ENR.prises[i];
  if(!prise || !prise.evts.length){ signal("PRISE VIDE"); return; }
  if(WAVX.occupe){ signal("UN RENDU EST DÉJÀ EN COURS"); return; }
  audioInit();
  if(!ctx){ signal("AUDIO INDISPONIBLE"); return; }
  var pont = HOST;
  if(!pont || !pont.fichierSauver){ signal("ÉCRITURE IMPOSSIBLE ICI"); return; }
  if(refusWavTropLong(prise.duree / 1000 + 3, 44100)) return;

  WAVX.occupe = true;
  signal("RENDU DE LA PRISE…");
  var modele = S.modele;
  var total = prise.duree / 1000 + 3;            /* trois secondes pour les queues */
  var taux = 44100;

  var ctxVrai = ctx, masterVrai = master, bruitVrai = noiseBuf, cacheVrai = cache;
  var sortiesVraies = {outBd:outBd, outMix:outMix, panBd:panBd, panMix:panMix};
  var busVrais = SET.bus;
  var off;
  try{ off = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, Math.ceil(taux * total), taux); }
  catch(e){ WAVX.occupe = false; signal("RENDU IMPOSSIBLE SUR CET APPAREIL"); return; }

  ctx = off;
  SET.bus = {};
  batirAudio();
  cache = true;

  function remettre(){
    WAVX.occupe = false;
    ctx = ctxVrai; master = masterVrai; noiseBuf = bruitVrai; cache = cacheVrai;
    SET.bus = busVrais;
    razNoeudsMachines();
    outBd = sortiesVraies.outBd; outMix = sortiesVraies.outMix;
    panBd = sortiesVraies.panBd; panMix = sortiesVraies.panMix;
    try{ allerMachine(modele); }catch(e){ signal("MACHINE À RECHARGER"); }
  }

  /* Le rendu hors ligne n'a pas d'horloge qui avance : entreeNote joue à
     maintenantAudio(), qui reste à zéro. On décale donc la référence nous-mêmes,
     en déplaçant temporairement l'instant de chaque note. */
  var joues = 0, sautes = 0;
  try{
    prise.evts.forEach(function(e){
      if((e[1] & 0xF0) !== 0x90 || e[3] === 0) return;
      var canal = e[1] & 0x0F;
      if(!passeEnr(canal, e[2])){ sautes++; return; }
      var mach = ENR.canaux[canal] || prise.machine || modele;
      OFF_T = 0.05 + e[0] / 1000;                /* l'instant de cette note */
      try{
        allerMachineRendu(mach);
        entreeNote(e[2], e[3] / 127, canal);
        joues++;
      }catch(err){ sautes++; }
    });
  }catch(e){
    OFF_T = -1; remettre();
    signal("RENDU INTERROMPU · " + ((e && e.message) ? e.message.slice(0, 40) : ""));
    return;
  }
  OFF_T = -1;
  if(!joues){ remettre(); signal("AUCUNE NOTE À RENDRE"); return; }

  off.startRendering().then(function(rendu){
    var crete = 0, c0 = rendu.getChannelData(0);
    for(var q=0;q<c0.length;q++){ var a = Math.abs(c0[q]); if(a > crete) crete = a; }
    var ab = wavStereo(rendu);
    remettre();
    var nom = "drm-" + (prise.nom.replace(/[^A-Za-z0-9]/g, "") || "prise") + "-" +
              Date.now().toString(36) + ".wav";
    var chemin = "";
    chemin = ecrireDocument(pont, nom, ab);
    if(chemin){
      signal(nom + " · " + Math.round(ab.byteLength / 1024) + " ko · " + joues + " notes · CRÊTE " +
             (crete > 0 ? (20 * Math.log10(crete)).toFixed(1) : "-∞") + " dB");
      var e2 = document.getElementById("enr-chemin");
      if(e2) e2.textContent = "Dernier fichier : " + chemin;
    } else signal("ÉCRITURE REFUSÉE");
    majEnrUI();
    H.inter();
  }).catch(function(){
    remettre();
    signal("RENDU ÉCHOUÉ");
  });
}
/* Changer de machine pendant un rendu sans toucher à l'affichage : allerMachine
   reconstruit des façades, ce qui n'a aucun sens hors ligne et coûte cher quand
   un live alterne entre deux machines à chaque note. On ne rebâtit donc que si
   la machine change vraiment. */
var RENDU_MACHINE = "", RENDU_CTX = null;
function allerMachineRendu(m){
  if(m === RENDU_MACHINE && ctx === RENDU_CTX && S.modele === m) return;
  allerMachine(m);
  RENDU_MACHINE = m; RENDU_CTX = ctx;
}
