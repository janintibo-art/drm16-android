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
  if(WAVX.occupe || ENR.ondesOccupe){ signal("UN RENDU EST DÉJÀ EN COURS"); return; }
  if(ENR.actif){ signal("ARRÊTEZ L'ENREGISTREMENT AVANT LE RENDU"); return; }
  audioInit();
  if(!ctx){ signal("AUDIO INDISPONIBLE"); return; }
  var pont = HOST;
  if(!pont || !pont.fichierSauver){ signal("ÉCRITURE IMPOSSIBLE ICI"); return; }
  if(refusWavTropLong(prise.duree / 1000 + 3, 44100)) return;

  var modele = S.modele;
  var total = prise.duree / 1000 + 3;            /* trois secondes pour les queues */
  var taux = 44100, longueur = Math.ceil(taux * total);
  /* Une activation de machine arrête les voix de la précédente. Chaque
     machine finit donc son propre rendu AVANT l'activation de la suivante.
     L'ordre et le routage sont figés avant les passages asynchrones. */
  var groupes = [], joues = 0;
  prise.evts.forEach(function(e){
    if((e[1] & 0xF0) !== 0x90 || e[3] === 0 || !passeEnr(e[1] & 15, e[2])) return;
    var mach = ENR.canaux[e[1] & 15] || prise.machine || modele;
    var g = groupes.filter(function(x){ return x.machine === mach; })[0];
    if(!g){ g = {machine:mach, notes:[]}; groupes.push(g); }
    g.notes.push(e.slice()); joues++;
  });
  if(!joues){ signal("AUCUNE NOTE À RENDRE"); return; }
  groupes.forEach(function(g){ g.notes.sort(function(a,b){ return a[0]-b[0]; }); });
  if(ENR.lecture !== null) enrArreterLecture();
  if(PR.lecture) prArreter();
  stop();
  if(writeMem() === false){ signal("RENDU ANNULÉ · MÉMOIRE NON ENREGISTRÉE"); return; }

  var ctxVrai = ctx, masterVrai = master, bruitVrai = noiseBuf, cacheVrai = cache;
  var metalVrai = metalBuf, sourcesVraies = SOURCES, collecteVraie = COLLECTE;
  var sortiesVraies = {outBd:outBd, outMix:outMix, panBd:panBd, panMix:panMix};
  var busVrais = SET.bus;
  var td3Vrai = TD3.noeuds, eurVrai = {bus:EUR.bus, sources:EUR.sources, noeuds:EUR.noeuds};
  var variantes = [[TR,"m",TR.m,["tr808","tr909","tr707","rd6"]],
                   [ER,"v","er"+ER.v,["er1","er2"]], [EA,"v","ea"+EA.v,["ea1","ea2"]],
                   [ES,"v","es"+ES.v,["es1","es2"]], [MPC,"v","mpc"+MPC.v,["mpc3000","mpc2000"]]];
  var valeursVariantes = variantes.map(function(v){ return v[0][v[1]]; });
  var inerteAvant = document.body.inert, termine = false;
  function bloquerClavier(e){ e.preventDefault(); e.stopImmediatePropagation(); }
  WAVX.occupe = true;
  document.body.inert = true;
  document.addEventListener("keydown", bloquerClavier, true);
  signal("RENDU DE LA PRISE…");

  function remettre(){
    if(termine) return;
    termine = true; OFF_T = -1;
    ctx = ctxVrai; master = masterVrai; noiseBuf = bruitVrai; cache = cacheVrai;
    metalBuf = metalVrai; SET.bus = busVrais;
    SOURCES = sourcesVraies; COLLECTE = collecteVraie; queue = [];
    razNoeudsMachines();
    TD3.noeuds = td3Vrai;
    EUR.bus = eurVrai.bus; EUR.sources = eurVrai.sources; EUR.noeuds = eurVrai.noeuds;
    outBd = sortiesVraies.outBd; outMix = sortiesVraies.outMix;
    panBd = sortiesVraies.panBd; panMix = sortiesVraies.panMix;
    try{
      /* Les variantes partagent leur moteur : rétablir aussi une TR808
         secondaire après le rendu d'une TR909, même si la façade est MC. */
      variantes.forEach(function(v, k){
        if(v[0][v[1]] !== valeursVariantes[k] || groupes.some(function(g){ return v[3].indexOf(g.machine) >= 0; }))
          allerMachine(v[2]);
      });
      allerMachine(modele);
    }finally{
      WAVX.occupe = false;
      document.body.inert = inerteAvant;
      document.removeEventListener("keydown", bloquerClavier, true);
      save();
    }
  }

  function contexteRendu(){
    var off = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, longueur, taux);
    ctx = off; OFF_T = -1; SOURCES = []; COLLECTE = null; queue = []; SET.bus = {};
    TD3.noeuds = null; EUR.bus = null; EUR.sources = null; EUR.noeuds = [];
    batirAudio(); cache = true;
    return off;
  }
  async function rendre(){
    /* Les sons personnels se décodent sur le contexte réel avant de passer
       hors ligne. Un démarrage à froid ne doit pas programmer des voix vides. */
    banqueEs(); chargerEchs();
    var debut = Date.now();
    while(Object.keys(ES_CHARGES).length){
      if(Date.now()-debut > 15000) throw new Error("CHARGEMENT DES SONS TROP LONG");
      await new Promise(function(resolve){ setTimeout(resolve, 20); });
    }
    var melange = ctxVrai.createBuffer(2, longueur, taux);
    for(var k=0;k<groupes.length;k++){
      var g = groupes[k], off = contexteRendu();
      signal("RENDU DE LA PRISE · " + (k+1) + "/" + groupes.length);
      allerMachineRendu(g.machine);
      /* Les tranches et effets restent actifs ; la chaîne générale sera
         appliquée une seule fois au mélange, pas une fois par machine. */
      master.disconnect(); master.gain.value = 1; master.connect(off.destination);
      g.notes.forEach(function(e){
        OFF_T = 0.05 + e[0]/1000;
        verifierSonNotePrise(g.machine, e[2], e[1]&15);
        entreeNote(e[2], e[3]/127, e[1]&15, g.machine);
      });
      OFF_T = -1;
      var part = await off.startRendering();
      for(var ch=0;ch<2;ch++){
        var cible = melange.getChannelData(ch), son = part.getChannelData(ch);
        for(var j=0;j<longueur;j++) cible[j] += son[j];
      }
      part = null; son = null; cible = null; off = null; SOURCES = [];
    }
    var final = contexteRendu(), source = final.createBufferSource();
    source.buffer = melange; source.connect(master); source.start(0);
    melange = null;
    return await final.startRendering();
  }
  return rendre().then(function(rendu){
    var crete = 0;
    for(var ch=0;ch<rendu.numberOfChannels;ch++){
      var c = rendu.getChannelData(ch);
      for(var q=0;q<c.length;q++) crete = Math.max(crete, Math.abs(c[q]));
    }
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
  }).catch(function(e){
    try{ remettre(); }catch(err){}
    signal("RENDU ÉCHOUÉ · " + ((e && e.message) ? e.message.slice(0, 60) : "ERREUR AUDIO"));
  });
}
/* Les lecteurs d'échantillons ignorent normalement un emplacement absent.
   Pour un export, un fichier utilisé mais illisible doit arrêter le rendu,
   au lieu de livrer un WAV qui omet silencieusement cette voix. Vérification
   juste avant la note : la sélection de repli MPC suit les notes précédentes. */
function verifierSonNotePrise(m, note, canal){
  var k, p, id = "";
  if(m === "es1" || m === "es2"){
    k = note >= 36 && note <= 44 ? note-36 : ES.sel;
    if(k > 8) k = ES.sel;
    p = ES.pat.son[k]; id = p && p.ech;
  }else if(m === "esx"){
    k = canal !== MIDI.canal ? 10 + Math.min(1, canal) : (note >= 36 && note <= 44 ? note-36 : SX.sel);
    if(canal === MIDI.canal && k > 8) k = 0;
    p = SX.pat.son[k]; id = p && p.ech;
  }else if(["mpc3000","mpc2000","stk","ko","arcm","vlc","t1k"].indexOf(m) >= 0){
    var r = routageMidi(m); k = rangMidi(r, note); if(k < 0) k = r.defaut();
    if(m === "mpc3000" || m === "mpc2000"){
      if(pisteCourante().type === 0){ p = MPC.pads[k]; id = p && p.ech; }
    }else if(m === "stk"){ p = STK.pistes[k]; id = p && p.ech;
    }else if(m === "ko"){ id = KO.sons[k];
    }else if(m === "arcm"){ p = motifArcmCur().pistes[k]; id = p && p.ech;
    }else if(m === "vlc"){ p = motifVlcCur().parties[k]; if(p && !p.f.mute) id = p.ech;
    }else if(m === "t1k" && valT1k(k,"mix") > 0.02){ p = motifT1kCur().instr[k]; id = p && p.ech; }
  }
  if(id && !ES.buf[id]) throw new Error("SON INTROUVABLE OU ILLISIBLE · " + id);
}
/* Les formes d'onde réutilisent cette activation : éviter une reconstruction
   à chaque note, sans réutiliser le cache d'un ancien contexte audio. */
var RENDU_MACHINE = "", RENDU_CTX = null;
function allerMachineRendu(m){
  if(m === RENDU_MACHINE && ctx === RENDU_CTX && S.modele === m) return;
  allerMachine(m);
  RENDU_MACHINE = m; RENDU_CTX = ctx;
}
