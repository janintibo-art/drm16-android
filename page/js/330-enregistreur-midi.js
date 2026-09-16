/* ================= enregistreur MIDI =================
   On branche la Korg sur l'entrée MIDI : ses notes jouent les parties de la machine
   affichée, et tout ce qui arrive est daté et gardé. La relecture repasse par le même
   chemin, donc le son sort du téléphone comme au moment du jeu. */

function enrCharger(){
  try{
    var b = JSON.parse(localStorage.getItem(MEM + ".midirec") || "null");
    if(b && b.length) ENR.prises = b;
    var c = JSON.parse(localStorage.getItem(MEM + ".midicanaux") || "{}");
    if(c && typeof c === "object") ENR.canaux = c;
  }catch(e){}
}
function enrEcrire(){
  try{ localStorage.setItem(MEM + ".midicanaux", JSON.stringify(ENR.canaux)); }catch(e){}
  try{ localStorage.setItem(MEM + ".midirec", JSON.stringify(ENR.prises)); }
  catch(e){ signal("MÉMOIRE PLEINE · PRISE NON GARDÉE"); }
}
function enrDemarrer(){
  if(ENR.lecture) enrArreterLecture();
  ENR.evts = [];
  ENR.tics = []; ENR.tempo = 0;
  ENR.vierge = ENR.attente;      /* on attend la première note si l'option est mise */
  ENR.depart = performance.now();
  ENR.actif = true;
  majEnrUI();
  signal("ENREGISTREMENT EN COURS");
  H.start();
}
function enrArreter(){
  if(!ENR.actif) return;
  ENR.actif = false;
  var duree = Math.round(performance.now() - ENR.depart);
  if(ENR.evts.length){
    var d = new Date();
    ENR.prises.unshift({
      nom: "Prise " + (ENR.prises.length + 1),
      date: d.getDate() + "/" + (d.getMonth()+1) + " " + ("0"+d.getHours()).slice(-2) + "h" + ("0"+d.getMinutes()).slice(-2),
      bpm: ENR.tempo || S.bpm,       /* le tempo de la machine, pas celui d'ici */
      tempoMesure: !!ENR.tempo,
      machine: S.modele,
      duree: duree,
      evts: ENR.evts
    });
    if(ENR.prises.length > 24) ENR.prises.length = 24;
    enrEcrire();
    signal(ENR.evts.length + " ÉVÉNEMENTS GARDÉS");
  } else {
    signal("RIEN N'EST ARRIVÉ · VÉRIFIEZ L'ENTRÉE MIDI");
  }
  /* La vue se vidait à l'arrêt : les événements partaient dans la prise et le
     tampon était effacé. On garde donc la dernière prise à l'écran. */
  if(ENR.prises.length) montrerPriseEnr(0);
  ENR.evts = [];
  majEnrUI();
  H.stop();
}
/* appelé par la réception MIDI, avant tout traitement */
/* ---------- le tempo réel, mesuré sur l'horloge de la machine ----------
   La prise gardait S.bpm, le tempo de l'application. Or c'est la machine
   branchée qui mène : le fichier .mid annonçait donc un tempo faux, et rien ne
   tombait sur la grille dans un séquenceur. L'horloge MIDI arrivait déjà — on
   la jetait. Vingt-quatre tics par noire, il suffit de les compter. */
function enrHorloge(){
  var t = performance.now();
  ENR.tics.push(t);
  /* On garde quatre noires : assez pour être stable, assez court pour suivre
     un tempo qui bouge. */
  if(ENR.tics.length > 97) ENR.tics.shift();
  if(ENR.tics.length < 25) return;
  var n = ENR.tics.length - 1;
  var parTic = (ENR.tics[n] - ENR.tics[0]) / n;
  var bpm = 60000 / (parTic * 24);
  if(bpm > 20 && bpm < 400) ENR.tempo = Math.round(bpm * 10) / 10;
}

/* Une piste coupée ne sonne pas ET n'entre pas dans la prise : c'est ce qu'on
   veut quand une source parasite le live sans qu'on puisse la débrancher.
   Le solo est un coupe-son sur toutes les autres, comme sur une table. */
function passeEnr(canal, note){
  var cle = ENR.decoupe === "canal" ? ("c" + canal) : (canal + ":" + note);
  if(ENR.solo) return ENR.solo === cle;
  return !ENR.muet[cle];
}

function enrNoter(a,b,c){
  /* On relève les canaux même à l'arrêt : c'est ce qui permet de voir arriver
     les sources avant d'appuyer sur ENREGISTRER, et de les aiguiller. */
  if(a === 0xF8){ if(ENR.actif) enrHorloge(); return; }
  if(a >= 0xF8) return;                       /* autres messages temps réel : inutiles ici */
  if((a & 0xF0) === 0x90 && c > 0){
    /* Une Electribe envoie TOUS ses sons sur un seul canal et ne les distingue
       que par le numéro de note. Compter par canal ne donnerait donc qu'une
       seule piste pour toute la machine : on relève le couple canal + note. */
    var ca = a & 0x0F;
    ENR.vus[ca + ":" + b] = (ENR.vus[ca + ":" + b] || 0) + 1;
    ENR.canauxVus[ca] = (ENR.canauxVus[ca] || 0) + 1;
  }
  if(!ENR.actif) return;
  if((a & 0xF0) === 0x90 && c > 0 && !passeEnr(a & 0x0F, b)) return;
  /* Départ à la première note : entre le doigt sur ENREGISTRER et le premier
     coup il y a toujours deux ou trois secondes de vide. On date la prise
     depuis la note, pas depuis le bouton. */
  if(ENR.vierge && (a & 0xF0) === 0x90 && c > 0){
    ENR.vierge = false;
    ENR.depart = performance.now();
  }
  if(ENR.vierge) return;
  ENR.compteur++;
  if(ENR.evts.length > 20000) return;
  ENR.evts.push([Math.round(performance.now() - ENR.depart), a, b, c]);
}
function enrJouer(i){
  var p = ENR.prises[i];
  if(!p) return;
  enrArreterLecture();
  ENR.lecture = i;
  var etait = MIDI.in;
  MIDI.in = true;
  p.evts.forEach(function(e){
    ENR.tmr.push(setTimeout(function(){
      var sauve = ENR.actif; ENR.actif = false;   /* on ne réenregistre pas la relecture */
      try{ window.__midi(e[1], e[2], e[3]); }catch(err){}
      ENR.actif = sauve;
    }, e[0]));
  });
  ENR.tmr.push(setTimeout(function(){
    if(ENR.boucle && ENR.lecture === i){
      /* On relance la même prise : c'est ce qui permet de jouer par-dessus
         une boucle de huit mesures sans y revenir à la main. */
      MIDI.in = etait;
      enrJouer(i);
      return;
    }
    ENR.lecture = null; MIDI.in = etait; majEnrUI();
  }, p.duree + 200));
  majEnrUI();
  signal("RELECTURE DE " + p.nom);
}
function enrArreterLecture(){
  ENR.tmr.forEach(function(t){ clearTimeout(t); });
  ENR.tmr = [];
  if(ENR.lecture !== null){ ENR.lecture = null; midiSilence(); majEnrUI(); }
}
/* « Prise 3 » ne dit rien trois jours plus tard. */
function enrNommer(i){
  var p = ENR.prises[i];
  if(!p) return;
  var n = window.prompt("Nom de la prise :", p.nom);
  if(n === null) return;
  p.nom = n.trim().slice(0, 40) || p.nom;
  enrEcrire(); majEnrUI(); H.cran();
}
function enrSupprimer(i){
  ENR.prises.splice(i, 1);
  enrEcrire(); majEnrUI(); H.inter();
}

/* ---------- fichier MIDI de type 0 ---------- */
function varlen(n){
  var o = [n & 0x7F];
  n >>= 7;
  while(n > 0){ o.unshift((n & 0x7F) | 0x80); n >>= 7; }
  return o;
}
function nomMeta(nom){
  var o = [0x00, 0xFF, 0x03], t = [];
  for(var i=0;i<nom.length && i<40;i++) t.push(nom.charCodeAt(i) & 0x7F);
  return o.concat(varlen(t.length), t);
}
function mtrk(corps){
  var n = corps.length;
  return [0x4D,0x54,0x72,0x6B, (n>>24)&0xFF, (n>>16)&0xFF, (n>>8)&0xFF, n&0xFF].concat(corps);
}
/* Type 1, une piste par son, chacune nommée : un séquenceur les ouvre déjà
   triées au lieu d'un unique tas à démêler. L'idée vient de fabkorg. */
function enrFichier(i){
  var p = ENR.prises[i];
  if(!p) return null;
  var div = 480, bpm = p.bpm || 120;
  var parTic = 60000 / (bpm * div);
  var us = Math.round(60000000 / bpm);

  /* piste de tête : tempo seul, comme le veut le format */
  var tete = [0x00, 0xFF, 0x03].concat(varlen(p.nom.length),
             p.nom.split("").map(function(c){ return c.charCodeAt(0) & 0x7F; }));
  tete = tete.concat([0x00, 0xFF, 0x51, 0x03, (us>>16)&0xFF, (us>>8)&0xFF, us&0xFF],
                     [0x00, 0xFF, 0x2F, 0x00]);
  var pistes = [mtrk(tete)];

  /* un groupe par couple canal et note */
  var groupes = {}, ordre = [];
  p.evts.forEach(function(e){
    var st = e[1] & 0xFF;
    if(st < 0x80 || st >= 0xF0) return;
    var cle = (st & 0x0F) + ":" + e[2];
    if(!groupes[cle]){ groupes[cle] = []; ordre.push(cle); }
    groupes[cle].push(e);
  });
  ordre.sort(function(a, b){
    var A = a.split(":"), B = b.split(":");
    return (+A[0] - +B[0]) || (+B[1] - +A[1]);
  });
  ordre.forEach(function(cle){
    var c = cle.split(":"), canal = +c[0], note = +c[1];
    var corps = nomMeta(nomPisteMidi(canal, note));
    var prec = 0;
    groupes[cle].forEach(function(e){
      var tic = Math.round(e[0] / parTic);
      var d = Math.max(0, tic - prec);
      prec = tic;
      var st = e[1] & 0xFF;
      corps = corps.concat(varlen(d), [st, e[2] & 0x7F]);
      var t = st & 0xF0;
      if(t !== 0xC0 && t !== 0xD0) corps.push(e[3] & 0x7F);
    });
    corps = corps.concat([0x00, 0xFF, 0x2F, 0x00]);
    pistes.push(mtrk(corps));
  });

  var nb = pistes.length;
  var entete = [0x4D,0x54,0x68,0x64, 0,0,0,6, 0,1, (nb>>8)&0xFF, nb&0xFF, (div>>8)&0xFF, div&0xFF];
  var tout = entete;
  pistes.forEach(function(t){ tout = tout.concat(t); });
  return new Uint8Array(tout);
}
/* nom de piste : celui de la partie si la note en désigne une, sinon la note */
function nomPisteMidi(canal, note){
  if(canal === MIDI.canal){
    var k = note - MIDI.base, m = S.modele;
    if(k >= 0 && k < 9){
      if(m === "es1" || m === "es2") return ES_PARTS[k].n;
      if(m === "esx") return SX_DRUMS[k];
      if(m === "emx") return "Drum " + MX_DRUMS[k];
      if(m === "er1" || m === "er2") return ER_PARTS[k].n;
      if(m === "em1" && EM_PARTS[k]) return EM_PARTS[k].nom;
    }
  }
  return nomNote(note) + " ch" + (canal + 1);
}
function enrExporter(i){
  var o = enrFichier(i);
  if(!o){ signal("PRISE INTROUVABLE"); return; }
  var p = HOST;
  var nom = "drm-" + (ENR.prises[i].nom.replace(/[^A-Za-z0-9]/g,"") || "prise") + "-" + i + ".mid";
  if(p && p.fichierSauver){
    var chemin = "";
    try{ chemin = p.fichierSauver(nom, octetsVersB64(o)); }catch(e){}
    signal(chemin ? ("ÉCRIT : " + nom) : "ÉCRITURE REFUSÉE");
    if(chemin){
      var e2 = document.getElementById("enr-chemin");
      if(e2) e2.textContent = "Dernier fichier : " + chemin;
    }
    return;
  }
  /* hors Android : téléchargement ordinaire */
  try{
    var a = document.createElement("a");
    a.href = "data:audio/midi;base64," + octetsVersB64(o);
    a.download = nom;
    a.click();
    signal("FICHIER PROPOSÉ AU TÉLÉCHARGEMENT");
  }catch(e){ signal("EXPORT IMPOSSIBLE ICI"); }
}

/* ---------- interface ---------- */
function dureeTexte(ms){
  var s = Math.round(ms/1000);
  return Math.floor(s/60) + ":" + ("0"+(s%60)).slice(-2);
}
/* Une couleur par canal, prise sur le cercle chromatique : seize teintes
   également écartées, qu'on distingue sans les apprendre. */
function couleurCanal(c){ return "hsl(" + ((c * 137) % 360) + ",70%,58%)"; }

/* La liste des machines, partagée entre le menu « machine par défaut » et
   l'aiguillage des canaux : une seule liste à tenir. Remplie à l'ouverture. */
var MACHINES_ENR = [];

/* Les noms des sons courants. Une boîte à rythmes qui suit la convention
   générale se lit ainsi sans rien configurer. */
var NOMS_SON = {bd:"Grosse caisse", sd:"Caisse claire", cp:"Clap", lt:"Tom",
                hh:"Charley", oh:"Charley ouvert", rd:"Ride", cy:"Crash",
                wb:"Wood block", cb:"Cowbell", sp:"Clave"};
function nomSonEnr(note){
  var g = GM_INV[note];
  if(g && NOMS_SON[g]) return NOMS_SON[g];
  return "Note " + note;
}

/* Le nom d'un son en tenant compte de la MACHINE qui le joue. Une EMX envoie
   tous ses sons sur un canal et ne les distingue que par la note : c'est la
   table de la machine visée qui sait dire « BD » plutôt que « Note 36 ».
   Se rabat sur le nom General MIDI, puis sur le numéro. */
function nomSonPiste(canal, note){
  var m = ENR.canaux[canal] || S.modele;
  /* Les Electribe : une base et neuf rangs, avec leurs vrais noms de partie. */
  try{
    var k = note - MIDI.base;
    if(k >= 0 && k < 9){
      if(m === "es1" || m === "es2") return ES_PARTS[k].n;
      if(m === "esx") return SX_DRUMS[k];
      if(m === "emx") return MX_DRUMS[k];
      if(m === "er1" || m === "er2") return ER_PARTS[k].n;
      if(m === "em1" && EM_PARTS[k]) return EM_PARTS[k].nom;
    }
  }catch(e){}
  /* Les autres ont une table de notes : on y cherche le rang, puis son nom. */
  try{
    var r = routageMidi(m);
    if(r && r.notes){
      var i = r.notes.indexOf(note);
      if(i >= 0){
        if(m === "tr808" || m === "tr909" || m === "tr707" || m === "rd6")
          return (TR.def.instr[i] && TR.def.instr[i].nom) || ("Voix " + (i + 1));
        if(m === "t1k" && T1K_INSTR[i]) return T1K_INSTR[i].nom || ("Voix " + (i + 1));
        return "Voix " + (i + 1);
      }
    }
  }catch(e){}
  try{ return nomSonEnr(note); }catch(e){}
  return "Note " + note;
}

/* Les canaux effectivement reçus. Sert à l'aiguillage, pas à l'affichage. */
function canauxEnr(){
  var l = [];
  for(var c=0;c<16;c++) if(ENR.canauxVus[c]) l.push(c);
  return l;
}

/* Les pistes à afficher. Par SON : un couple canal + note, c'est ce qu'il faut
   pour une EMX ou une ER-1, qui envoient tout sur un canal. Par CANAL : une
   bande par source, utile quand plusieurs machines jouent ensemble. */
function pistesEnr(){
  if(!ENR.actif && ENR.affiche) return pistesDe(ENR.affiche.evts);
  var l = [];
  if(ENR.decoupe === "canal"){
    canauxEnr().forEach(function(c){
      l.push({cle:"c" + c, c:c, n:-1, nom:"CANAL " + (c + 1)});
    });
    return l;
  }
  for(var k in ENR.vus){
    var p = k.split(":"), c = +p[0], n = +p[1];
    l.push({cle:k, c:c, n:n, nom:nomSonPiste(c, n)});
  }
  l.sort(function(a, b){ return (a.c - b.c) || (a.n - b.n); });
  return l;
}
/* À quelle piste appartient un événement. */
function pisteDeEnr(pistes, canal, note){
  for(var i=0;i<pistes.length;i++){
    var p = pistes[i];
    if(p.c !== canal) continue;
    if(p.n < 0 || p.n === note) return i;
  }
  return -1;
}

/* Les pistes à montrer. Par SON : un couple canal + note par piste, ce qui
   donne une ligne par son de la machine branchée. Par CANAL : une ligne par
   canal, utile quand plusieurs appareils jouent ensemble.
   On borne à trente-deux : au-delà les bandes seraient plus fines qu'un
   trait, et un appareil déréglé pourrait en inventer cent vingt-huit. */
function voiesEnr(){
  var l = [], k;
  if(ENR.decoupe === "canal"){
    canauxEnr().forEach(function(c){ l.push({c:c, note:-1, cle:"c" + c}); });
    return l;
  }
  for(k in ENR.vus){
    var p = k.split(":");
    l.push({c:+p[0], note:+p[1], cle:k, n:ENR.vus[k]});
  }
  /* triées par hauteur : on retrouve les graves en bas, comme sur un clavier */
  l.sort(function(a, b){ return (a.c - b.c) || (a.note - b.note); });
  if(l.length > 32) l.length = 32;
  return l;
}
function titreVoie(v){
  if(v.note < 0) return "CANAL " + (v.c + 1);
  var plusieurs = canauxEnr().length > 1;
  return nomSonEnr(v.note) + (plusieurs ? "  ·  c" + (v.c + 1) : "");
}
function couleurVoie(v){
  return couleurCanal(v.note < 0 ? v.c : (v.note % 16));
}

/* La vue. Pendant l'enregistrement elle défile sur une fenêtre de huit
   secondes ; à l'arrêt elle montre la prise entière. Chaque note est un trait,
   sa hauteur donne sa position dans la bande, sa vélocité son opacité. */
var ENR_H = 34, ENR_REGLE = 22;      /* hauteur d'une piste, hauteur de la règle */

/* Les en-têtes de pistes, à gauche, alignés sur le dessin. */
function majTetesEnr(pistes){
  var d = document.getElementById("enr-tetes");
  if(!d) return;
  var sig = pistes.map(function(p){ return p.cle; }).join(",") + "|" + ENR.solo +
            "|" + Object.keys(ENR.muet).join(",");
  if(d.dataset.sig === sig) return;
  d.dataset.sig = sig;
  d.innerHTML = '<div class="enr-espace"></div>';
  pistes.forEach(function(p){
    var r = document.createElement("div");
    r.className = "enr-tt";
    var pa = document.createElement("i");
    pa.style.background = couleurCanal(p.n < 0 ? p.c : p.n);
    var t = document.createElement("b");
    t.textContent = p.nom;
    t.title = p.nom + " · canal " + (p.c + 1);
    var bm = document.createElement("button");
    bm.className = "coupe" + (ENR.muet[p.cle] ? " on" : "");
    bm.textContent = "M";
    bm.addEventListener("click", function(){
      if(ENR.muet[p.cle]) delete ENR.muet[p.cle]; else ENR.muet[p.cle] = 1;
      d.dataset.sig = ""; majTetesEnr(pistesEnr()); H.cran();
    });
    var bs = document.createElement("button");
    bs.className = (ENR.solo === p.cle ? "on" : "");
    bs.textContent = "S";
    bs.addEventListener("click", function(){
      ENR.solo = (ENR.solo === p.cle) ? "" : p.cle;
      d.dataset.sig = ""; majTetesEnr(pistesEnr()); H.cran();
    });
    r.appendChild(pa); r.appendChild(t); r.appendChild(bm); r.appendChild(bs);
    d.appendChild(r);
  });
}

/* Ce que la vue montre : le tampon en cours d'enregistrement, ou la prise
   choisie. Sans cela on ne pouvait rien revoir une fois l'enregistrement
   terminé. */
function evtsAffiches(){
  if(ENR.actif) return ENR.evts;
  if(ENR.affiche) return ENR.affiche.evts;
  return ENR.evts;
}
function montrerPriseEnr(i){
  var p = ENR.prises[i];
  if(!p) return;
  ENR.affiche = {evts:p.evts, duree:p.duree, nom:p.nom, idx:i};
  ENR.ondes = null; ENR.ondesPour = "";     /* les ondes ne valent que pour une prise */
  var d = document.getElementById("enr-tetes");
  if(d) d.dataset.sig = "";
  majEnrUI();
}
/* Les pistes tirées d'une liste d'événements, pour une prise déjà faite. */
function pistesDe(evts){
  var vus = {}, l = [];
  evts.forEach(function(e){
    if((e[1] & 0xF0) !== 0x90 || e[3] === 0) return;
    vus[(e[1] & 0x0F) + ":" + e[2]] = 1;
  });
  if(ENR.decoupe === "canal"){
    var can = {};
    for(var k in vus) can[k.split(":")[0]] = 1;
    Object.keys(can).forEach(function(c){
      l.push({cle:"c" + c, c:+c, n:-1, nom:"CANAL " + (+c + 1)});
    });
  } else {
    for(var k2 in vus){
      var q = k2.split(":");
      l.push({cle:k2, c:+q[0], n:+q[1], nom:nomSonPiste(+q[0], +q[1])});
    }
  }
  l.sort(function(a, b){ return (a.c - b.c) || (a.n - b.n); });
  return l;
}

function dessinerEnr(){
  var cv = document.getElementById("enr-vue");
  var boite = document.getElementById("enr-corps");
  if(!cv || !boite) return;

  var pistes = pistesEnr();
  majTetesEnr(pistes);

  /* Le canevas prend la largeur restante et la hauteur des pistes : c'est la
     boîte qui défile, pas le dessin qui se comprime. */
  var L = Math.max(200, boite.clientWidth - 132);
  var H = ENR_REGLE + Math.max(1, pistes.length) * ENR_H;
  if(cv.width !== L) cv.width = L;
  if(cv.height !== H) cv.height = H;
  cv.style.width = L + "px"; cv.style.height = H + "px";

  var g = cv.getContext("2d");
  g.fillStyle = "#0a0a0c"; g.fillRect(0, 0, L, H);

  if(!pistes.length){
    g.fillStyle = "#4a4a52";
    g.font = "14px 'Roboto Condensed',Arial";
    g.fillText("En attente de MIDI…", 14, H / 2);
    return;
  }

  var FEN = 8000;
  var maintenant = ENR.actif ? performance.now() - ENR.depart : 0;
  var evts = evtsAffiches(), t0, t1;
  if(ENR.actif){ t1 = Math.max(FEN, maintenant); t0 = t1 - FEN; }
  else {
    var fin = evts.length ? evts[evts.length - 1][0] : FEN;
    t0 = 0; t1 = Math.max(FEN, fin);
  }
  var duree = Math.max(1, t1 - t0);

  /* Les bandes, une par piste. */
  pistes.forEach(function(p, i){
    var y = ENR_REGLE + i * ENR_H;
    g.fillStyle = (i % 2) ? "#101014" : "#0c0c10";
    g.fillRect(0, y, L, ENR_H);
    g.fillStyle = "#1c1c22";
    g.fillRect(0, y + ENR_H - 1, L, 1);
  });

  /* La règle : une graduation par seconde, chiffrée toutes les cinq. */
  g.fillStyle = "#141418"; g.fillRect(0, 0, L, ENR_REGLE);
  g.fillStyle = "#26262d"; g.fillRect(0, ENR_REGLE - 1, L, 1);
  var s0 = Math.floor(t0 / 1000), s1 = Math.ceil(t1 / 1000);
  var pas = Math.max(1, Math.round((s1 - s0) / 16));
  g.font = "10px 'Roboto Condensed',Arial";
  for(var sec = s0; sec <= s1; sec += pas){
    var x = ((sec * 1000 - t0) / duree) * L;
    if(x < 0 || x > L) continue;
    g.fillStyle = "#2a2a33";
    g.fillRect(x, ENR_REGLE, 1, H - ENR_REGLE);   /* la grille descend sur les pistes */
    g.fillStyle = "#7a7780";
    g.fillText(sec + "s", x + 3, 14);
  }

  /* Les formes d'onde, quand elles ont été calculées pour cette prise. */
  var ondes = (!ENR.actif && ENR.affiche && ENR.ondes &&
               ENR.ondesPour === (ENR.affiche.nom + "/" + ENR.decoupe)) ? ENR.ondes : null;
  if(ondes){
    var dureeTotale = Math.max(1, ENR.affiche.duree + 2000);
    pistes.forEach(function(p, i){
      var env = ondes[p.cle];
      if(!env) return;
      var y0 = ENR_REGLE + i * ENR_H, mi = y0 + ENR_H / 2, demi = ENR_H / 2 - 3;
      g.fillStyle = couleurCanal(p.n < 0 ? p.c : p.n);
      g.globalAlpha = 0.85;
      for(var c=0;c<env.length;c++){
        /* chaque colonne d'enveloppe couvre une tranche de la prise : on la
           place selon la fenêtre affichée, qui peut être plus courte */
        var tms = (c / env.length) * dureeTotale;
        if(tms < t0 || tms > t1) continue;
        var xx = ((tms - t0) / duree) * L;
        var hh = Math.max(1, env[c] * demi);
        g.fillRect(xx, mi - hh, Math.max(1, L / env.length + 0.5), hh * 2);
      }
      g.globalAlpha = 1;
    });
  }

  /* Les notes. */
  for(var q=0;q<evts.length;q++){
    var e = evts[q];
    if(e[0] < t0 || e[0] > t1) continue;
    if((e[1] & 0xF0) !== 0x90 || e[3] === 0) continue;
    var rang = pisteDeEnr(pistes, e[1] & 0x0F, e[2]);
    if(rang < 0) continue;
    var x2 = ((e[0] - t0) / duree) * L;
    var ht = Math.max(4, (e[3] / 127) * (ENR_H - 8));
    g.globalAlpha = (ondes ? 0.25 : 0.5 + (e[3] / 127) * 0.5);
    g.fillStyle = couleurCanal(pistes[rang].n < 0 ? pistes[rang].c : pistes[rang].n);
    g.fillRect(x2, ENR_REGLE + rang * ENR_H + ENR_H - 4 - ht, 3, ht);
  }
  g.globalAlpha = 1;

  if(ENR.actif){
    var xt = ((maintenant - t0) / duree) * L;
    g.fillStyle = "#ff6a3d";
    g.fillRect(xt - 1, 0, 2, H);
  }
}
function boucleEnr(){
  var p = document.getElementById("enr");
  if(!p || !p.classList.contains("show")){ ENR.dessin = null; return; }
  dessinerEnr();
  ENR.dessin = requestAnimationFrame(boucleEnr);
}
window.addEventListener("resize", function(){
  if(document.getElementById("enr").classList.contains("show")) dessinerEnr();
});
function demarrerVueEnr(){
  if(ENR.dessin) return;
  ENR.dessin = requestAnimationFrame(boucleEnr);
}

/* La liste des canaux reçus, chacun avec sa machine. */
function majCanauxEnr(){
  var d = document.getElementById("enr-canaux");
  if(!d) return;
  var cans = canauxEnr();
  if(!cans.length){
    d.innerHTML = '<p style="opacity:.7">Aucun canal reçu pour le moment. Jouez sur une machine branchée.</p>';
    return;
  }
  /* On ne refait la liste que si elle a changé : sinon on écraserait le choix
     en cours pendant qu'on déroule un menu. */
  var signature = cans.join(",");
  if(d.dataset.sig === signature) return;
  d.dataset.sig = signature;
  d.innerHTML = "";
  cans.forEach(function(c){
    var r = document.createElement("div");
    r.className = "enr-canal";
    var pastille = document.createElement("i");
    pastille.style.background = couleurCanal(c);
    var t = document.createElement("b");
    t.textContent = "CANAL " + (c + 1);
    var sel = document.createElement("select");
    var o0 = document.createElement("option");
    o0.value = ""; o0.textContent = "— machine par défaut —";
    sel.appendChild(o0);
    MACHINES_ENR.forEach(function(m){
      var o = document.createElement("option");
      o.value = m[0]; o.textContent = m[1];
      sel.appendChild(o);
    });
    sel.value = ENR.canaux[c] || "";
    sel.addEventListener("change", function(){
      if(sel.value) ENR.canaux[c] = sel.value; else delete ENR.canaux[c];
      enrEcrire();
    });
    r.appendChild(pastille); r.appendChild(t); r.appendChild(sel);
    d.appendChild(r);
  });
}
/* La liste des pistes, avec coupe-son et solo. Reconstruite seulement quand
   elle change : sinon on écraserait un appui en cours. */
/* Les en-têtes remplacent l'ancienne liste de pistes : même rôle, mais alignés
   sur le dessin plutôt qu'empilés en dessous. */
function majPistesEnr(){ majTetesEnr(pistesEnr()); }
document.getElementById("enr-attente").addEventListener("click", function(){
  ENR.attente = !ENR.attente;
  this.textContent = ENR.attente ? "DÉPART : 1re NOTE" : "DÉPART : IMMÉDIAT";
  H.cran();
});
document.getElementById("enr-boucle").addEventListener("click", function(){
  ENR.boucle = !ENR.boucle;
  this.textContent = ENR.boucle ? "BOUCLE : OUI" : "BOUCLE : NON";
  this.classList.toggle("on", ENR.boucle);
  H.cran();
});
document.getElementById("enr-decoupe").addEventListener("click", function(){
  ENR.decoupe = (ENR.decoupe === "son") ? "canal" : "son";
  /* Les identifiants de piste changent de forme : garder les coupe-son
     couperait des pistes au hasard. */
  ENR.solo = ""; ENR.muet = {};
  majPistesEnr();
  this.textContent = (ENR.decoupe === "son") ? "PISTES : PAR SON" : "PISTES : PAR CANAL";
  H.cran();
});
function majEnrUI(){
  var b = document.getElementById("enr-rec");
  if(!b) return;
  b.textContent = ENR.actif ? "■ ARRÊTER" : "● ENREGISTRER";
  b.classList.toggle("on", ENR.actif);
  var etat = document.getElementById("enr-etat");
  majPistesEnr();
  etat.textContent = ENR.actif
    ? ("En cours — " + ENR.evts.length + " événements" +
       (ENR.vierge ? " · en attente de la première note" : "") +
       (ENR.tempo ? " · " + ENR.tempo + " BPM reçus" : "") +
       (ENR.evts.length > 17000 ? " · ATTENTION, limite proche" : ""))
    : (MIDI.ouvert < 0 ? "Aucun appareil MIDI ouvert. Cherchez-le dans la notice, onglet Général."
                       : "Prêt. Jouez sur la Korg : le son sort du téléphone.");
  majCanauxEnr();
  var l = document.getElementById("enr-liste");
  l.innerHTML = "";
  if(!ENR.prises.length){
    l.innerHTML = '<p style="opacity:.7">Aucune prise pour le moment.</p>';
    return;
  }
  ENR.prises.forEach(function(p, i){
    var d = document.createElement("div");
    d.className = "enr-prise" + (ENR.lecture === i ? " joue" : "") +
                  ((ENR.affiche && ENR.affiche.idx === i) ? " vue" : "");
    var titre = document.createElement("b");
    titre.textContent = p.nom;
    var meta = document.createElement("span");
    meta.textContent = p.date + ' · ' + dureeTexte(p.duree) +
                       ' · ' + p.evts.length + ' évén. · ' + p.bpm + ' BPM' +
                       (p.tempoMesure ? ' (mesuré)' : '');
    d.appendChild(titre);
    d.appendChild(meta);
    var barre = document.createElement("div");
    barre.className = "enr-actions";
    [["VOIR", function(){ montrerPriseEnr(i); }],
     ["▶ JOUER", function(){ enrJouer(i); }],
     ["■ STOP", function(){ enrArreterLecture(); }],
     [".MID", function(){ enrExporter(i); }],
     [".WAV", function(){ exporterPriseWav(i); }],
     ["NOMMER", function(){ enrNommer(i); }],
     ["SUPPRIMER", function(){ enrSupprimer(i); }]].forEach(function(x){
      var bb = document.createElement("button");
      bb.className = "sec";
      bb.textContent = x[0];
      bb.addEventListener("click", x[1]);
      barre.appendChild(bb);
    });
    d.appendChild(barre);
    l.appendChild(d);
  });
}
function ouvrirEnr(){
  fermerAutresPanneaux("enr");
  document.getElementById("enr").classList.add("show");
  majNoteOuverte();
  majEnrUI();
  demarrerVueEnr();
}
function fermerEnr(){
  document.getElementById("enr").classList.remove("show");
  majNoteOuverte();
}

