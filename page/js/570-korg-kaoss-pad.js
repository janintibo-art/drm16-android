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
          banques:[{ech:"b0", on:false}, {ech:"b3", on:false},
                   {ech:"b6", on:false}, {ech:"b9", on:false}],
          sel:0, sources:[null, null, null, null], vitesse:1};

/* Une banque en boucle. On relance la source à chaque fois : un BufferSource
   ne se rallume pas une fois arrêté, c'est la règle de Web Audio. */
function banqueKp(k, allumer){
  audioInit(); if(!ctx) return;
  banqueEs();
  var n = noeudsKp();
  if(KP.sources[k]){
    try{ KP.sources[k].stop(); }catch(e){}
    KP.sources[k] = null;
  }
  KP.banques[k].on = !!allumer;
  if(!allumer) return;
  var buf = ES.buf[KP.banques[k].ech];
  if(!buf) return;
  var src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  src.playbackRate.value = KP.vitesse;         /* une banque rallumée suit le pavé */
  var g = eurGain(0.55);
  src.connect(g); g.connect(n.e);
  src.start();
  KP.sources[k] = src;
}
function toutArreterKp(){
  for(var k=0;k<4;k++) banqueKp(k, false);
}

function noeudsKp(){
  if(KP.noeuds && KP.noeuds.ctx === ctx) return KP.noeuds;
  var e = eurGain(1);
  /* La chaîne complète est bâtie une fois ; chaque effet n'utilise que ce dont
     il a besoin, les autres nœuds restant neutres. Reconstruire le graphe à
     chaque changement d'effet ferait un trou dans le son. */
  var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 20000;
  var crush = ctx.createWaveShaper();
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
    var q = 1024, c = new Float32Array(q);
    for(var i=0;i<q;i++){
      var v = i * 2 / q - 1;
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
function beatKp(i){ KP.pos = i; }
function arretKp(){
  toutArreterKp();
  if(KP.noeuds && KP.noeuds.ctx === ctx){
    try{ debrancherTout(KP.noeuds); }catch(e){}
  }
  KP.noeuds = null;
}
var MACHINE_KP = {schedule:scheduleKp, beat:beatKp, arret:arretKp,
                  longueur:function(){ return 16; }};

function memKp(){
  memoire.kp = {fx:KP.fx, prof:KP.prof, motion:KP.motion, sel:KP.sel,
                banques:KP.banques.map(function(b){ return {ech:b.ech}; })};
  sauverMachine("kp");
}
function chargerKp(){
  var m = memLire("kp");
  if(!m) return;
  if(typeof m.fx === "number") KP.fx = Math.max(0, Math.min(KP_EFFETS.length - 1, m.fx));
  if(typeof m.prof === "number") KP.prof = m.prof;
  if(m.motion && m.motion.length) KP.motion = m.motion;
  if(typeof m.sel === "number") KP.sel = Math.max(0, Math.min(3, m.sel));
  if(m.banques) m.banques.forEach(function(o, i){
    if(i < 4 && o && o.ech) KP.banques[i].ech = o.ech;
  });
}

