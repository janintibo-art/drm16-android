/* ================= export audio =================
   Le motif de la machine affichée est rendu hors ligne, plus vite que le
   temps réel, puis écrit en WAV stéréo. On bascule le contexte audio sur un
   contexte de rendu, on rebâtit la machine dedans — c'est le seul moyen sûr
   d'avoir tous ses nœuds au bon endroit — et on remet tout en place après. */

function chaineMaitresseHorsLigne(off){
  var m = off.createGain();
  m.gain.value = S.vol;
  var lim = off.createDynamicsCompressor();
  lim.threshold.value = -1.2; lim.knee.value = 1.5; lim.ratio.value = 20;
  lim.attack.value = 0.001; lim.release.value = 0.09;
  var sat = off.createWaveShaper();
  var n = 2049, c = new Float32Array(n), seuil = 0.84;
  for(var i=0;i<n;i++){
    var x = i * 2 / (n - 1) - 1, a = Math.abs(x);
    c[i] = (a <= seuil) ? x : (x < 0 ? -1 : 1) * (seuil + (1 - seuil) * Math.tanh((a - seuil) / (1 - seuil)));
  }
  sat.curve = c; sat.oversample = "2x";
  /* v192 : même sortie que batirAudio, sans remplacer ses nœuds live. */
  var hp = off.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 22; hp.Q.value = 20*Math.log10(.5412);
  var hp2 = off.createBiquadFilter(); hp2.type = "highpass"; hp2.frequency.value = 22; hp2.Q.value = 20*Math.log10(1.3066);
  var comp = off.createGain(); comp.gain.value = Math.pow(10, COMPENSATION_SORTIE_DB / 20);
  var garde = off.createWaveShaper(), cg = new Float32Array(1025);
  for(var j=0;j<cg.length;j++){ var y=j*2/(cg.length-1)-1; cg[j]=Math.max(-.98,Math.min(.98,y)); }
  garde.curve = cg; garde.oversample = "none";
  m.connect(hp); hp.connect(hp2); hp2.connect(comp); comp.connect(lim);
  lim.connect(sat); sat.connect(garde); garde.connect(off.destination);
  return m;
}
function wavStereo(buf){
  var n = buf.length, ch = Math.min(2, buf.numberOfChannels);
  var g = buf.getChannelData(0), d = (ch > 1) ? buf.getChannelData(1) : g;
  var ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab), i;
  function txt(o, s){ for(var q=0;q<s.length;q++) v.setUint8(o + q, s.charCodeAt(q)); }
  var sr = buf.sampleRate;
  txt(0, "RIFF"); v.setUint32(4, 36 + n * 4, true); txt(8, "WAVEfmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true);
  v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  txt(36, "data"); v.setUint32(40, n * 4, true);
  for(i=0;i<n;i++){
    var a = Math.max(-1, Math.min(1, g[i])), b = Math.max(-1, Math.min(1, d[i]));
    v.setInt16(44 + i * 4, a < 0 ? a * 0x8000 : a * 0x7FFF, true);
    v.setInt16(46 + i * 4, b < 0 ? b * 0x8000 : b * 0x7FFF, true);
  }
  return ab;
}
function exporterWav(){
  if(WAVX.occupe || ENR.ondesOccupe) return;
  var p = HOST;
  if(!p || !p.fichierSauver){ signal("ÉCRITURE IMPOSSIBLE ICI"); return; }
  if(!MACHINE || !MACHINE.schedule){ signal("AUCUNE MACHINE À RENDRE"); return; }
  if(S.run){ stop(); H.stop(); }
  audioInit();                                 /* sans contexte de départ, rien à remettre en place après */
  if(!ctx){ signal("AUDIO INDISPONIBLE"); return; }
  writeMem();                                  /* les dernières retouches doivent être en mémoire */
  if(refusWavTropLong((MACHINE.longueur ? MACHINE.longueur() : 16) * WAVX.mesures * stepDur() + 2.5, 44100)) return;

  WAVX.occupe = true;
  signal("RENDU EN COURS…");
  var modele = S.modele;
  var pas = MACHINE.longueur ? MACHINE.longueur() : 16;
  var duree = stepDur();
  var total = pas * WAVX.mesures * duree + 2.5;   /* deux secondes et demie pour les queues */
  var taux = 44100;

  /* on met de côté tout ce que le rendu va remplacer — y compris les quatre
     sorties de la DRM16, que batirAudio() refait chez lui et que rien ne
     recrée au retour */
  var ctxVrai = ctx, masterVrai = master, bruitVrai = noiseBuf, cacheVrai = cache;
  var sortiesVraies = {outBd:outBd, outMix:outMix, panBd:panBd, panMix:panMix};
  var busVrais = SET.bus;
  var off;
  try{ off = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, Math.ceil(taux * total), taux); }
  catch(e){ WAVX.occupe = false; signal("RENDU IMPOSSIBLE SUR CET APPAREIL"); return; }

  ctx = off;
  SET.bus = {};                                /* les sorties réelles gardent leurs tranches */
  batirAudio();                                 /* tout est refait dans le contexte de rendu */
  cache = true;                                 /* pas d'animation pendant le rendu */

  /* quoi qu'il arrive, on rend la main : un export raté ne doit pas bloquer les suivants */
  function remettre(){
    WAVX.occupe = false;
    ctx = ctxVrai; master = masterVrai; noiseBuf = bruitVrai; cache = cacheVrai;
    SET.bus = busVrais;
    /* Tout ce que les machines ont rebâti pendant le rendu appartient au
       contexte de rendu. Celles qui ne refont pas leurs bus en s'activant —
       la DRM16, les Electribe, la MPC — rebrancheraient leurs voix dessus,
       l'API refuserait, et plus rien ne sortirait jusqu'au redémarrage.
       On oublie donc ces nœuds comme à l'aller, et on rend à la DRM16 ses
       sorties d'origine, qui sont toujours valables. */
    razNoeudsMachines();
    outBd = sortiesVraies.outBd; outMix = sortiesVraies.outMix;
    panBd = sortiesVraies.panBd; panMix = sortiesVraies.panMix;
    try{ allerMachine(modele); }catch(e){ signal("MACHINE À RECHARGER"); }
  }
  try{
    allerMachine(modele);                       /* la machine se rebâtit dans le contexte de rendu */
    for(var m=0; m<WAVX.mesures; m++){
      for(var s=0; s<pas; s++){
        MACHINE.schedule(s, 0.05 + (m * pas + s) * duree);
      }
      if(MACHINE.boucle) MACHINE.boucle();
    }
  }catch(e){
    remettre();
    signal("RENDU INTERROMPU · " + ((e && e.message) ? e.message.slice(0, 40) : ""));
    return;
  }
  off.startRendering().then(function(rendu){
    var crete = 0, c0 = rendu.getChannelData(0);
    for(var i=0;i<c0.length;i++){ var a = Math.abs(c0[i]); if(a > crete) crete = a; }
    var ab = wavStereo(rendu);
    remettre();
    var nom = "drm-" + modele + "-" + WAVX.mesures + "mes-" + Date.now().toString(36) + ".wav";
    var chemin = "";
    chemin = ecrireDocument(HOST, nom, ab);
    if(chemin){
      signal(nom + " · " + Math.round(ab.byteLength / 1024) + " ko · CRÊTE " +
             (crete > 0 ? (20 * Math.log10(crete)).toFixed(1) : "-∞") + " dB");
      var e2 = document.getElementById("wav-chemin");
      if(e2) e2.textContent = "Dernier rendu : " + chemin;
    } else signal("ÉCRITURE REFUSÉE");
    H.inter();
  }).catch(function(){
    remettre();
    signal("RENDU ÉCHOUÉ");
  });
}
