/* ================= décalage humain =================
   Un séquenceur tombe exactement sur la grille ; un batteur non. HUM.temps
   déplace chaque pas d'un peu de hasard, en millisecondes. Le décalage est
   tiré une fois par pas : tous les instruments d'un même pas bougent ensemble,
   comme une main qui arrive un peu tôt ou un peu tard. */
function decalageHumain(){
  if(!HUM.temps) return 0;
  return (Math.random() - 0.5) * (HUM.temps / 1000);
}
/* Horloge interne et MIDI partagent le même SET. Les machines secondaires
   gardent leur longueur, mais seule la principale alimente son curseur.
   Le rang absolu reste attaché à l'instant entendu pour la vue d'ensemble. */
function programmerPas(i, t){
  var debut = queue.length;
  MACHINE.schedule(i, t);
  for(var q=debut;q<queue.length;q++) queue[q].pasSet = pasSet;
  if(SET.on) SET_VOIES.forEach(function(v){
    var M = moteurSet(v[0]);
    if(!M || M === MACHINE || !SET.actives[v[0]]) return;
    var L = M.longueur ? M.longueur() : 16;
    var j = ((pasSet % L) + L) % L;
    var n = queue.length;
    try{
      M.schedule(j, t);
      if(j === L - 1 && M.boucle) M.boucle();
    }finally{ queue.splice(n); }
  });
  pasSet++;
}
function tick(){
  if(!ctx || !S.run || (MIDI.sync && MIDI.ouvert >= 0)) return;
  surveillerAudio();
  if(!ctx) return;                    /* refaireAudio a pu tout remplacer */
  var maintenant = Date.now();
  if(AUDIT.tDernier){
    var trou = maintenant - AUDIT.tDernier;
    AUDIT.tJeu += Math.min(trou, 1000);
    /* On ne mesure la pause QUE devant l'écran. En arrière-plan, Android
       ralentit les minuteries de plusieurs secondes pour économiser la
       batterie : le trou est réel, mais il ne s'entend pas puisque personne
       n'écoute, et il écrasait le maximum. Un relevé de 1713 ms venait de là
       et non d'un blocage. */
    if(!cache){
      if(trou > AUDIT.pause) AUDIT.pause = trou;
      /* un trou de plus de 150 ms assèche le moteur audio : c'est le seuil
         au-delà duquel ça s'entend. On les compte, car un seul accident et
         des hoquets réguliers ne se soignent pas pareil. */
      if(trou > 150) AUDIT.trous++;
    }
  }
  AUDIT.tDernier = maintenant;
  AUDIT.tours++;
  midiSuivreTempo(); purgerSources();
  if(SOURCES.length > AUDIT.pic) AUDIT.pic = SOURCES.length;
  var av = 0;
  for(var q=0;q<SOURCES.length;q++) if(SOURCES[q].t > maintenantAudio()) av++;
  if(av > AUDIT.picAvenir) AUDIT.picAvenir = av;
  if(nextT < maintenantAudio() - 0.4){
    /* l'ordonnanceur a pris trop de retard : on recale. Chaque recalage
       s'entend comme un trou ou un grésillement, on les compte pour pouvoir
       le constater au lieu de le supposer. */
    AUDIT.decroche++; AUDIT.quand = Date.now();
    nextT = maintenantAudio() + 0.08; queue=[];
  }
  while(nextT < maintenantAudio() + look()){
    var dh = decalageHumain();
    /* on ne recule jamais avant l'instant présent : le coup serait perdu */
    var tq = Math.max(maintenantAudio() + 0.005, nextT + dh);
    programmerPas(step, tq);
    if(METRO && step % 4 === 0) clicMetro(nextT, step === 0);
    nextT += stepDur();
    step = (step+1) % (MACHINE.longueur ? MACHINE.longueur() : 16);
    if(step === 0 && MACHINE.boucle) MACHINE.boucle();
  }
}
function start(){
  audioInit();
  if(!ctx) return;
  if(typeof MACHINE_DBI !== "undefined" && MACHINE_DBI) MACHINE_DBI.arret();
  if(typeof MACHINE_MC !== "undefined" && MACHINE_MC) MACHINE_MC.arret();
  if(typeof MACHINE_STK !== "undefined" && MACHINE_STK) MACHINE_STK.arret();
  if(typeof preparerChaineStk === "function" &&
     (MACHINE === MACHINE_STK || (SET.on && SET.actives.stk)) && !preparerChaineStk()){
    S.run = false; return;
  }
  S.run=true; step=0; pasSet=0; queue=[];
  if(SET.on) preparerSet();
  if(MIDI.sync && MIDI.ouvert >= 0){
    /* esclave : ce sont les tics reçus qui avancent le séquenceur */
    clearInterval(timer); timer = null;
    SYNC.ticks = 0; SYNC.dernier = 0; SYNC.attente = true;
    draw(); host(true);
    signal("EN ATTENTE DE L'HORLOGE EXTÉRIEURE");
    return;
  }
  nextT = maintenantAudio() + 0.12;
  var depart = nextT;                 /* tick() fait avancer nextT : on garde l'heure du premier pas */
  clearInterval(timer); timer = setInterval(tick, periode()); tick();
  draw();
  host(true);
  midiHorloge(true, depart - maintenantAudio());
}
function stop(){
  S.run=false; clearInterval(timer); timer=null; queue=[];
  AUDIT.tDernier = 0;                 /* le chrono ne compte que le jeu réel */
  couperSourcesFutures();
  midiSilence();
  if(MACHINE && MACHINE.arret) MACHINE.arret();
  if(typeof MACHINE_DBI !== "undefined" && MACHINE_DBI && MACHINE !== MACHINE_DBI) MACHINE_DBI.arret();
  if(typeof MACHINE_MC !== "undefined" && MACHINE_MC && MACHINE !== MACHINE_MC) MACHINE_MC.arret();
  if(typeof MACHINE_STK !== "undefined" && MACHINE_STK && MACHINE !== MACHINE_STK) MACHINE_STK.arret();
  if(typeof MACHINE_KP !== "undefined" && MACHINE_KP && MACHINE !== MACHINE_KP) MACHINE_KP.arret();
  host(false);
  midiHorloge(false);
}
window.__drmStop = function(){
  /* Le jeu réel est déjà arrêté avant le rendu : une perte de focus Android
     ne doit pas débrancher les voix que le contexte hors ligne calcule. */
  if(!WAVX.occupe && !ENR.ondesOccupe) stop();
};
