/* ================= Korg KAOSS PAD =================
   Une machine qu'on ne règle pas : on la touche. Un carré, deux axes, et
   l'effet suit le doigt. Aucun potard ne fait ce que fait ce pavé — parce
   qu'on y change DEUX choses à la fois, d'un seul geste, à la vitesse de la
   main.

   Sa vraie signature est le PAD MOTION : le trajet du doigt est enregistré,
   puis rejoué en boucle. Le geste devient une modulation qu'on ne saurait pas
   écrire, et qui tourne toute seule pendant qu'on fait autre chose. */

var KP_EFFETS = [
  ["filtre",  "PASSE-BAS RÉSONANT",   "X la coupure, Y la résonance"],
  ["haut",    "PASSE-HAUT",           "X la coupure, Y la résonance"],
  ["delai",   "ÉCHO",                 "X le temps, Y la réinjection"],
  ["grain",   "HACHOIR",              "X la vitesse, Y la profondeur"],
  ["ring",    "MODULATION EN ANNEAU", "X la fréquence, Y le mélange"],
  ["crush",   "RÉDUCTION",            "X la résolution, Y le mélange"],
  ["verb",    "RÉVERBÉRATION",        "X la taille, Y le mélange"],
  ["pitch",   "VITESSE",              "X la vitesse, Y le glissement"]
];

/* Quatre banques d'échantillons, comme sur la machine : ce sont ELLES qui
   font le son. Le pavé ne fait que le traiter. Sans cela on ouvre la machine
   et rien ne sort — ce qui était le cas de ma première version. */
var KP = {fx:0, x:0.5, y:0.5, tenu:false, touche:false,
          motion:[], enregistre:false, rejoue:false, mpos:0,
          prof:0.8, noeuds:null, muet:false,
          banques:[{ech:"b0", mode:"loop", slice:false, tranche:0, on:false},
                   {ech:"b3", mode:"loop", slice:false, tranche:0, on:false},
                   {ech:"b6", mode:"loop", slice:false, tranche:0, on:false},
                   {ech:"b9", mode:"loop", slice:false, tranche:0, on:false}],
          sel:0, sources:[null, null, null, null], vitesse:1, taps:[], tranches:[],
          prise:null, priseEtat:"SORTIE + EFFETS · 8 S MAX"};

/* v171 : capture du mélange après les effets et MUTE, avant le bus du set.
   Le flux vient du graphe audio : aucune entrée micro, aucun retour vers le
   graphe, aucune banque remplacée. Une prise possède ses ressources et son
   contexte jusqu'au bout ; les événements d'une prise annulée sont ignorés. */
function priseCouranteKp(r){
  return KP.prise === r && r.ctx === ctx && S.modele === "kp";
}
function debrancherPriseKp(r){
  if(!r.branche) return;
  r.branche = false;
  try{ r.sortie.disconnect(r.destination); }catch(e){}
}
function libererPriseKp(r){
  clearTimeout(r.limite); clearTimeout(r.attente); clearInterval(r.horloge);
  debrancherPriseKp(r);
  if(r.mr) r.mr.ondataavailable = r.mr.onstop = r.mr.onerror = null;
  if(r.destination){
    r.destination.stream.getTracks().forEach(function(t){ try{ t.stop(); }catch(e){} });
    try{ r.destination.disconnect(); }catch(e){}
    r.destination = null;
  }
}
function annulerPriseKp(message){
  var r = KP.prise;
  if(!r) return;
  KP.prise = null;                              /* invalider AVANT de provoquer onstop */
  if(r.mr){
    r.mr.ondataavailable = r.mr.onstop = r.mr.onerror = null;
    try{ if(r.mr.state !== "inactive") r.mr.stop(); }catch(e){}
  }
  libererPriseKp(r); r.morceaux = [];
  KP.priseEtat = message || "PRISE ANNULÉE";
  majPriseKp(); signal(KP.priseEtat);
}
function copierPriseKp(buf, contexte){
  var n = Math.min(buf.length, Math.floor(buf.sampleRate * 8));
  if(n < 1 || !buf.numberOfChannels) throw new Error("prise vide");
  /* Le stockage WAV commun est mono. Garder la fréquence décodée et le
     niveau, sans normalisation ni preset : le timbre vient déjà du pavé. */
  var out = contexte.createBuffer(1, n, buf.sampleRate), q = out.getChannelData(0);
  var a = buf.getChannelData(0), b = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  for(var i=0;i<n;i++){
    var v = b ? (a[i] + b[i]) * 0.5 : a[i];
    q[i] = isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
  }
  return out;
}
function terminerPriseKp(){
  var r = KP.prise;
  if(!r || r.phase !== "enregistrement") return;
  if(!priseCouranteKp(r)){ annulerPriseKp(); return; }
  r.phase = "conversion";
  clearTimeout(r.limite); clearInterval(r.horloge);
  debrancherPriseKp(r);                         /* ne jamais couper la sortie vers l'écoute */
  majPriseKp();
  r.attente = setTimeout(function(){
    if(KP.prise === r) annulerPriseKp("PRISE IMPOSSIBLE · DÉLAI DÉPASSÉ");
  }, 15000);
  try{ r.mr.stop(); }
  catch(e){ annulerPriseKp("ARRÊT DE LA PRISE IMPOSSIBLE"); }
}
function demarrerPriseKp(){
  if(KP.prise) return;
  if(S.modele !== "kp" || document.hidden) return;
  /* La reprise d'un contexte existant est attendue et rattrapée ci-dessous.
     audioInit() le reprendrait aussi, sans suivre sa promesse de reprise. */
  try{ if(!ctx) audioInit(); }
  catch(e){ signal("AUDIO INDISPONIBLE"); return; }
  if(!ctx || ctx.startRendering || !ctx.createMediaStreamDestination || !window.MediaRecorder){
    signal("RESAMPLE INDISPONIBLE SUR CET APPAREIL"); return;
  }
  var r = {ctx:ctx, sortie:null, destination:null, mr:null, morceaux:[], octets:0,
           phase:"preparation", branche:false};
  /* Construire le graphe avant de publier la prise : le remplacement d'un
     ancien contexte peut appeler arretKp(). */
  try{ r.sortie = noeudsKp().out; }
  catch(e){ signal("AUDIO INDISPONIBLE"); return; }
  KP.prise = r; majPriseKp();
  function echec(message){ if(KP.prise === r) annulerPriseKp(message); }
  function lancer(){
    if(!priseCouranteKp(r)){ echec("PRISE ANNULÉE"); return; }
    if(r.ctx.state !== "running"){ echec("AUDIO EN PAUSE · RÉESSAYEZ"); return; }
    clearTimeout(r.attente);
    try{
      r.destination = r.ctx.createMediaStreamDestination();
      r.mr = new window.MediaRecorder(r.destination.stream);
      r.mr.ondataavailable = function(ev){
        if(!priseCouranteKp(r) || !ev.data || !ev.data.size) return;
        r.octets += ev.data.size;
        if(r.octets > 8 * 1024 * 1024){ echec("PRISE TROP VOLUMINEUSE"); return; }
        r.morceaux.push(ev.data);
      };
      r.mr.onerror = function(){ echec("ENREGISTREMENT IMPOSSIBLE"); };
      r.mr.onstop = function(){
        if(!priseCouranteKp(r)){ echec("PRISE ANNULÉE"); return; }
        /* Seul STOP REC (ou sa limite de huit secondes) valide la prise.
           Une fin de flux inattendue ne crée pas un son partiel silencieux. */
        if(r.phase !== "conversion"){ echec("PRISE INTERROMPUE"); return; }
        var type = r.mr.mimeType;
        libererPriseKp(r);
        if(!r.morceaux.length){ echec("PRISE VIDE · RÉESSAYEZ"); return; }
        r.attente = setTimeout(function(){ echec("DÉCODAGE TROP LONG · RÉESSAYEZ"); }, 15000);
        Promise.resolve().then(function(){
          if(!priseCouranteKp(r)) return null;
          var blob = new Blob(r.morceaux, {type:type}); r.morceaux = [];
          return blob.arrayBuffer();
        }).then(function(ab){
          if(!ab || !priseCouranteKp(r)) return null;
          return new Promise(function(res, rej){
            var decode = r.ctx.decodeAudioData(ab, res, rej);
            if(decode && decode.catch) decode.catch(rej);
          });
        }).then(function(buf){
          if(!buf || !priseCouranteKp(r)) return;
          var court = copierPriseKp(buf, r.ctx), base = "u" + Date.now().toString(36) + "kp", id = base, k = 1;
          while(ES.buf[id] || BIB.noms[id]) id = base + (k++);
          ES.buf[id] = court; ES.noms[id] = "kaoss";
          BIB.noms[id] = "KAOSS " + new Date().toLocaleTimeString();
          bibEcrire();
          var garde = sauverEch(id, court);
          libererPriseKp(r); KP.prise = null;
          KP.priseEtat = garde ? "PRISE AJOUTÉE · BIBLIO" : "PRISE POUR CETTE SESSION · ÉCHEC D'ÉCRITURE";
          actualiserEchs(); majPriseKp(); signal(KP.priseEtat);
        }).catch(function(){ echec("PRISE ILLISIBLE · RÉESSAYEZ"); });
      };
      r.sortie.connect(r.destination); r.branche = true;
      r.mr.start(250);
      r.phase = "enregistrement"; r.debut = performance.now();
      r.limite = setTimeout(function(){ if(KP.prise === r) terminerPriseKp(); }, 8000);
      r.horloge = setInterval(function(){
        if(!priseCouranteKp(r) || r.ctx.state !== "running") echec("PRISE INTERROMPUE");
        else majPriseKp();
      }, 200);
      majPriseKp(); signal("RESAMPLE · JOUEZ, PUIS STOP REC");
    }catch(e){ echec("ENREGISTREMENT IMPOSSIBLE"); }
  }
  if(r.ctx.state === "running") lancer();
  else{
    r.attente = setTimeout(function(){ echec("AUDIO EN PAUSE · RÉESSAYEZ"); }, 5000);
    try{ Promise.resolve(r.ctx.resume()).then(lancer, function(){ echec("AUDIO INDISPONIBLE"); }); }
    catch(e){ echec("AUDIO INDISPONIBLE"); }
  }
}

/* v169 : huit portions contiguës, sans arrondir leur durée en secondes.
   On conserve l'original et une seule copie de tranche par banque. Un tampon
   découpé finit naturellement, même si l'effet VITESSE change pendant le son. */
function numeroTrancheKp(i){
  return typeof i === "number" && isFinite(i) ? Math.max(0, Math.min(7, Math.floor(i))) : 0;
}
function bornesTrancheKp(buf, i){
  i = numeroTrancheKp(i);
  return {debut:Math.floor(buf.length * i / 8), fin:Math.floor(buf.length * (i + 1) / 8)};
}
function tamponBanqueKp(k, buf){
  var b = KP.banques[k];
  if(!b.slice){ KP.tranches[k] = null; return buf; }
  var i = numeroTrancheKp(b.tranche), p = bornesTrancheKp(buf, i);
  if(p.fin <= p.debut){ KP.tranches[k] = null; signal("TRANCHE VIDE · SON TROP COURT"); return null; }
  var ancien = KP.tranches[k];
  var coupe = ancien && ancien.original === buf && ancien.ctx === ctx && ancien.index === i
    ? ancien.tampon : ctx.createBuffer(buf.numberOfChannels, p.fin - p.debut, buf.sampleRate);
  /* NORMALIZE peut modifier l'original sans changer son identité. On recopie
     à chaque frappe, en réutilisant le tampon si ses bornes n'ont pas changé. */
  /* Un fondu d'au plus 1 ms à chaque bord limite les clics de découpe. Les
     portions minuscules gardent leurs données ; le son entier reste intact. */
  var fondu = Math.min(Math.floor(buf.sampleRate * 0.001), Math.floor(coupe.length / 4));
  for(var ch=0;ch<buf.numberOfChannels;ch++){
    var q = coupe.getChannelData(ch);
    buf.copyFromChannel(q, ch, p.debut);
    if(fondu > 1) for(var j=0;j<fondu;j++){
      var v = j / (fondu - 1);
      q[j] *= v; q[q.length - 1 - j] *= v;
    }
  }
  KP.tranches[k] = {original:buf, ctx:ctx, index:i, tampon:coupe};
  return coupe;
}
function decouperBanqueKp(k, actif){
  var b = KP.banques[k];
  if(!b) return;
  b.slice = !!actif; KP.tranches[k] = null;
  if(b.on) banqueKp(k, true);
}
function frapperTrancheKp(k, i){
  var b = KP.banques[k];
  if(!b) return;
  b.slice = true; b.tranche = numeroTrancheKp(i);
  banqueKp(k, true);                            /* un pad numéroté relance, même en LOOP */
}

/* v170 : une affectation depuis la bibliothèque vise une banque précise.
   Un son encore absent ne doit ni remplacer son réglage ni couper sa voix. */
function affecterSonKp(k, id){
  if(typeof k !== "number" || k !== Math.floor(k) || k < 0 || k > 3){
    signal("BANQUE KAOSS INVALIDE"); return false;
  }
  if(typeof id !== "string" || !Object.prototype.hasOwnProperty.call(ES.buf, id) || !ES.buf[id]){
    signal("SON NON CHARGÉ · RÉESSAYEZ APRÈS LE CHARGEMENT"); return false;
  }
  if(S.modele !== "kp") activerKp();
  var b = KP.banques[k];
  b.ech = id; KP.sel = k; KP.tranches[k] = null;
  if(b.on) banqueKp(k, true);
  majKp(); memKp();
  return true;
}

/* v168 : le tempo reste celui du séquenceur commun. On ne touche ni au
   transport ni à la vitesse des échantillons, qui appartient à l'effet VITESSE.
   Même plage que le tempo global mémorisé : 40 à 220 BPM. */
function tempoExterneKp(){
  return typeof MIDI !== "undefined" && MIDI.sync;
}
function reglerTempoKp(bpm){
  if(tempoExterneKp()){
    KP.taps = []; majTempoKp();
    signal("TEMPO PILOTÉ PAR MIDI · CHOISIR HORLOGE INTERNE POUR RÉGLER");
    return false;
  }
  if(typeof bpm !== "number" || !isFinite(bpm)) return false;
  S.bpm = Math.max(40, Math.min(220, Math.round(bpm)));
  kTempo.set(S.bpm);
  saveSoon(); majTempoKp();
  return true;
}
function ajusterTempoKp(delta){
  KP.taps = [];
  if(reglerTempoKp(S.bpm + delta)) signal(S.bpm + " BPM");
}
function tapTempoKp(){
  if(tempoExterneKp()){ reglerTempoKp(S.bpm); return; }
  var now = performance.now(), ts = KP.taps;
  if(!isFinite(now)) return;
  if(ts.length){
    var dt = now - ts[ts.length - 1];
    if(dt >= 0 && dt < 120) return;            /* double événement / appui parasite */
    if(dt <= 0 || dt > 2200) ts = KP.taps = [];
    else if(dt < 60000 / 220 - 1 || dt > 1501){
      KP.taps = [now];                         /* ne pas polluer la moyenne suivante */
      signal("TAP · CADENCE ENTRE 40 ET 220 BPM");
      return;
    }
  }
  ts.push(now);
  if(ts.length > 5) ts.shift();                 /* moyenne des quatre derniers intervalles */
  if(ts.length < 2){ signal("TAP · ENCORE UNE FOIS"); return; }
  var bpm = 60000 * (ts.length - 1) / (now - ts[0]);
  if(reglerTempoKp(bpm)) signal(S.bpm + " BPM · TAP");
}

/* v167 : LOOP bascule marche/arrêt ; ONE SHOT repart à chaque frappe.
   Une fin de source peut arriver après la frappe suivante : elle ne doit
   jamais éteindre la nouvelle voix. Le gain est libéré avec sa source. */
function arreterBanqueKp(k){
  var b = KP.banques[k];
  if(!b) return;
  var src = KP.sources[k];
  KP.sources[k] = null; b.on = false;
  if(src){
    try{ src.stop(); }catch(e){}
    if(src.libererKp) src.libererKp();
  }
}
function banqueKp(k, allumer){
  var b = KP.banques[k];
  if(!b) return;
  arreterBanqueKp(k);
  /* Arrêter ne doit pas réveiller ni reconstruire le moteur audio. */
  if(!allumer) return;
  audioInit(); if(!ctx) return;
  banqueEs();
  var buf = ES.buf[b.ech];
  if(!buf){ signal("SON INDISPONIBLE · BANQUE " + "ABCD"[k]); return; }
  var n = noeudsKp();
  try{ buf = tamponBanqueKp(k, buf); }
  catch(e){ KP.tranches[k] = null; signal("DÉCOUPE IMPOSSIBLE · BANQUE " + "ABCD"[k]); return; }
  if(!buf) return;
  var src = ctx.createBufferSource();
  src.buffer = buf; src.loop = b.mode !== "one";
  src.playbackRate.value = KP.vitesse;         /* une banque rallumée suit le pavé */
  var g = eurGain(0.55);
  var libere = false;
  src.libererKp = function(){
    if(libere) return;
    libere = true;
    try{ src.disconnect(); }catch(e){}
    try{ g.disconnect(); }catch(e){}
    /* Les banques se jouent aussi séquenceur arrêté : sa purge ne tourne
       alors pas. Ne pas retenir les anciennes copies de tranches dans SOURCES. */
    if(typeof SOURCES !== "undefined") SOURCES = SOURCES.filter(function(s){ return s.n !== src; });
  };
  src.onended = function(){
    src.libererKp();
    if(KP.sources[k] !== src) return;
    KP.sources[k] = null; b.on = false;
    majKp();
  };
  src.connect(g); g.connect(n.e);
  KP.sources[k] = src; b.on = true;
  try{ src.start(); }
  catch(e){ arreterBanqueKp(k); signal("LECTURE IMPOSSIBLE · BANQUE " + "ABCD"[k]); }
}
function frapperBanqueKp(k){
  var b = KP.banques[k];
  if(b) banqueKp(k, b.mode === "one" || !b.on);
}
function modeBanqueKp(k, mode){
  var b = KP.banques[k];
  if(!b) return;
  b.mode = mode === "one" ? "one" : "loop";
  if(b.on) banqueKp(k, true);                  /* nouveau mode, départ au début */
}
function toutArreterKp(){
  for(var k=0;k<4;k++) arreterBanqueKp(k);
}

function noeudsKp(){
  if(KP.noeuds && KP.noeuds.ctx === ctx) return KP.noeuds;
  if(KP.noeuds) arretKp();                     /* ancien contexte : aucune voix conservée */
  var e = eurGain(1);
  /* La chaîne complète est bâtie une fois ; chaque effet n'utilise que ce dont
     il a besoin, les autres nœuds restant neutres. Reconstruire le graphe à
     chaque changement d'effet ferait un trou dans le son. */
  var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 20000;
  var crush = ctx.createWaveShaper();
  crush.oversample = "none";                   /* voulu : RÉDUCTION replie, c'est son effet */
  var d = ctx.createDelay(1.2), fb = eurGain(0), dmix = eurGain(0);
  var conv = ctx.createConvolver(), vmix = eurGain(0);
  var n = Math.floor(ctx.sampleRate * 1.8), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for(var ch=0; ch<2; ch++){
    var q = b.getChannelData(ch);
    for(var i=0;i<n;i++) q[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.8);
  }
  conv.buffer = b;
  /* Modulation en anneau (v125) : le signal traverse rmix, dont le GAIN est
     l'oscillateur lui-même — base 0, amplitude ±1. La sortie vaut donc
     signal × sinus : il ne reste que la somme et la différence des fréquences.
     Jusqu'en v124, rgain valait 0 : le gain de rmix restait constant et
     l'« anneau » n'était qu'une seconde copie du son sec. */
  var ring = ctx.createOscillator(); ring.type = "sine"; ring.frequency.value = 200;
  var rgain = eurGain(1), rmix = eurGain(0), rwet = eurGain(0);
  var sec = eurGain(1);                        /* le son sec, dosé contre l'anneau */
  var hache = eurGain(1);
  /* RÉDUCTION (v127) : deux chemins en parallèle vers le hachoir, le son réduit
     (cw) et le son intact (brut), pour que Y soit un vrai mélange. Au repos,
     cw = 1 et brut = 0 : c'est exactement l'ancien chemin en série, la courbe
     vide laissant tout passer. Aucun des deux chemins n'ajoute de retard :
     pas d'effet de peigne quand on les mélange. */
  var cw = eurGain(1), brut = eurGain(0);
  var lfo = ctx.createOscillator(); lfo.type = "square"; lfo.frequency.value = 8;
  var lprof = eurGain(0);
  lfo.connect(lprof); lprof.connect(hache.gain);
  ring.connect(rgain);
  var out = eurGain(1);

  e.connect(f); f.connect(crush); crush.connect(cw); cw.connect(hache);
  f.connect(brut); brut.connect(hache);
  hache.connect(sec); sec.connect(out);
  hache.connect(d); d.connect(fb); fb.connect(d); d.connect(dmix); dmix.connect(out);
  hache.connect(conv); conv.connect(vmix); vmix.connect(out);
  rgain.connect(rmix.gain); hache.connect(rmix); rmix.connect(rwet); rwet.connect(out);
  out.connect(busSet("kp") || master);
  ring.start(); lfo.start();

  KP.noeuds = {ctx:ctx, e:e, f:f, crush:crush, d:d, fb:fb, dmix:dmix,
               vmix:vmix, ring:ring, rgain:rgain, rmix:rmix, rwet:rwet, sec:sec,
               cw:cw, brut:brut,
               hache:hache, lfo:lfo, lprof:lprof, out:out};
  appliquerKp();
  return KP.noeuds;
}

/* Un dosage qui suit le doigt sans « crépiter » : la valeur rejoint sa cible en
   une douzaine de millisecondes au lieu de sauter. */
function lisseKp(param, v){
  var t = ctx.currentTime;
  if(param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
  else param.cancelScheduledValues(t);
  param.setTargetAtTime(v, t, 0.012);
}

/* VITESSE (v126) : la vraie vitesse de lecture des banques, comme un disque
   qu'on freine ou qu'on accélère — hauteur et tempo changent ensemble. Jusqu'en
   v125 l'effet n'était qu'un délai très court (effet de peigne), sans aucun
   changement de hauteur. tau : le temps de glissement vers la cible. */
function vitesseKp(r, tau){
  KP.vitesse = r;
  var t = ctx.currentTime;
  for(var k=0;k<4;k++){
    var s = KP.sources[k];
    if(!s) continue;
    var pr = s.playbackRate;
    if(pr.cancelAndHoldAtTime) pr.cancelAndHoldAtTime(t);
    else pr.cancelScheduledValues(t);
    pr.setTargetAtTime(r, t, tau);
  }
}

/* Deux axes, un effet : tout tient dans cette fonction. On remet TOUT à neutre
   d'abord, puis on n'active que ce que l'effet courant demande — sans quoi un
   réglage laissé par l'effet précédent continuerait d'agir. */
function appliquerKp(){
  var n = KP.noeuds;
  if(!n || n.ctx !== ctx) return;
  var actif2 = KP.touche || KP.tenu || KP.rejoue;
  var x = KP.x, y = KP.y, p = KP.prof * (actif2 ? 1 : 0);

  n.f.type = "lowpass"; n.f.frequency.value = 20000; n.f.Q.value = 0.7;
  n.crush.curve = null;
  n.fb.gain.value = 0; n.dmix.gain.value = 0;
  n.vmix.gain.value = 0;
  var sec = 1, anneau = 0, reduit = 1, intact = 0;
  n.lprof.gain.value = 0; n.hache.gain.value = 1;
  n.out.gain.value = KP.muet ? 0 : 1;
  var nom = KP_EFFETS[KP.fx][0];
  /* Doigt levé : la vitesse revient à 1 en glissant, comme un plateau relâché.
     Autre effet choisi : retour rapide. */
  if(!actif2 || nom !== "pitch") vitesseKp(1, actif2 ? 0.02 : 0.15);
  if(!actif2){
    lisseKp(n.sec.gain, 1); lisseKp(n.rwet.gain, 0);
    lisseKp(n.cw.gain, 1);  lisseKp(n.brut.gain, 0);
    return;
  }

  if(nom === "filtre"){
    n.f.frequency.value = 80 * Math.pow(220, x);
    n.f.Q.value = 0.7 + y * 22 * p;
  } else if(nom === "haut"){
    n.f.type = "highpass";
    n.f.frequency.value = 40 * Math.pow(300, x);
    n.f.Q.value = 0.7 + y * 20 * p;
  } else if(nom === "delai"){
    n.d.delayTime.value = 0.02 + x * 0.7;
    n.fb.gain.value = y * 0.88 * p;
    n.dmix.gain.value = 0.9 * p;
  } else if(nom === "grain"){
    n.lfo.frequency.value = 1 + x * 28;
    n.lprof.gain.value = y * p;
  } else if(nom === "ring"){
    /* X : 20 Hz (trémolo rugueux) à 3,6 kHz (cloche métallique).
       Y : du sec pur à l'anneau pur. Sec et anneau se partagent l'unité : la
       crête ne dépasse jamais celle du son sec (mesuré). L'anneau pur sonne
       environ 3 dB plus doux, ce qui est le propre de cet effet ; un gain de
       1,2 le compensait mais faisait dépasser la crête de 1,6 dB. */
    lisseKp(n.ring.frequency, 20 * Math.pow(180, x));
    sec = 1 - y * p;
    anneau = y * p;
  } else if(nom === "crush"){
    var m = Math.max(2, Math.round(2 + (1 - x) * 40));
    var q = 1025, c = new Float32Array(q);
    for(var i=0;i<q;i++){
      var v = i * 2 / (q - 1) - 1;
      c[i] = Math.round(v * m) / m;
    }
    n.crush.curve = c; n.crush.oversample = "none";
    /* Y : du son intact (en bas) au son réduit pur (en haut). Jusqu'en v126,
       Y réglait un passe-bas alors que l'écran annonçait « le mélange ». */
    reduit = y * p;
    intact = 1 - y * p;
  } else if(nom === "verb"){
    n.vmix.gain.value = y * 1.2 * p;
    n.f.frequency.value = 500 + x * 15000;
  } else if(nom === "pitch"){
    /* X : 0,5x à gauche, 1x au centre, 2x à droite (± une octave), l'étendue
       dosée par FX DEPTH. Y : glissement, de presque instantané (en bas) à
       une demi-seconde (en haut), pour les effets de disque freiné. */
    vitesseKp(Math.pow(2, (x * 2 - 1) * KP.prof), 0.004 + y * 0.16);
  }
  lisseKp(n.sec.gain, sec);
  lisseKp(n.rwet.gain, anneau);
  lisseKp(n.cw.gain, reduit);
  lisseKp(n.brut.gain, intact);
}

/* Le geste enregistré. On relève la position à chaque pas du séquenceur, ce
   qui lie la boucle au tempo : le trajet se rejoue toujours en mesure. */
function scheduleKp(i, t){
  if(KP.enregistre){
    KP.motion.push([KP.x, KP.y]);
    if(KP.motion.length >= 256) KP.enregistre = false;   /* 256 points au plus */
  } else if(KP.rejoue && KP.motion.length){
    /* v127 : on lit le point COURANT, puis on avance. Avant, l'index avançait
       d'abord : la lecture commençait au deuxième point, et le premier
       n'était entendu qu'au bouclage. */
    var m = KP.motion[KP.mpos % KP.motion.length];
    KP.mpos = (KP.mpos + 1) % KP.motion.length;
    KP.x = m[0]; KP.y = m[1];
    appliquerKp();
    majPavKp();
  }
  if(!cache) queue.push({i:i, t:t});
}
function beatKp(i){ KP.pos = i; majTempoKp(); }
function arretKp(){
  annulerPriseKp();
  KP.taps = [];
  toutArreterKp();
  KP.tranches = [];
  if(KP.noeuds){
    try{ debrancherTout(KP.noeuds); }catch(e){}
  }
  KP.noeuds = null;
  majKp();
}
var MACHINE_KP = {schedule:scheduleKp, beat:beatKp, arret:arretKp,
                  longueur:function(){ return 16; }};

function memKp(){
  memoire.kp = {fx:KP.fx, prof:KP.prof, motion:KP.motion, sel:KP.sel,
                banques:KP.banques.map(function(b){
                  return {ech:b.ech, mode:b.mode, slice:!!b.slice, tranche:numeroTrancheKp(b.tranche)};
                })};
  sauverMachine("kp");
}
function chargerKp(){
  var m = memLire("kp");
  /* Une ancienne sauvegarde conserve le son entier en boucle. */
  KP.tranches = [];
  KP.banques.forEach(function(b){ b.mode = "loop"; b.slice = false; b.tranche = 0; });
  if(!m) return;
  if(typeof m.fx === "number" && isFinite(m.fx)) KP.fx = Math.max(0, Math.min(KP_EFFETS.length - 1, m.fx|0));
  if(typeof m.prof === "number" && isFinite(m.prof)) KP.prof = Math.max(0, Math.min(1, m.prof));
  if(m.motion && m.motion.length) KP.motion = m.motion;
  if(typeof m.sel === "number" && isFinite(m.sel)) KP.sel = Math.max(0, Math.min(3, m.sel|0));
  if(Array.isArray(m.banques)) m.banques.forEach(function(o, i){
    if(i >= 4 || !o) return;
    if(typeof o.ech === "string" && o.ech) KP.banques[i].ech = o.ech;
    KP.banques[i].mode = o.mode === "one" ? "one" : "loop";
    KP.banques[i].slice = o.slice === true;
    KP.banques[i].tranche = numeroTrancheKp(o.tranche);
  });
}
