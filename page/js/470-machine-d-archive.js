/* ===================== MACHINE D'ARCHIVE =====================
   Une machine générique de seize pistes, dont les sons viennent de la
   collection : n'importe laquelle des 470 boîtes à rythmes devient jouable
   avec ses enregistrements d'origine. */
var ARCM_ROLES = [
  {n:"KICK",  re:/\b(bd|kick|bass ?drum|kik|bdrum)\b|^bd|kick/i},
  {n:"SNARE", re:/\b(sd|snare|sn|snr)\b|^sd|snare/i},
  {n:"RIM",   re:/rim|sidestick|x-?stick/i},
  {n:"CLAP",  re:/clap|\bcp\b|hand/i},
  {n:"CH",    re:/closed|\bch\b|chh|hh ?cl|hihat ?c/i},
  {n:"OH",    re:/open|\boh\b|ohh|hh ?op/i},
  {n:"HAT",   re:/hat|\bhh\b/i},
  {n:"TOM 1", re:/tom ?-?1|lo ?tom|low ?tom|\blt\b/i},
  {n:"TOM 2", re:/tom ?-?2|mid ?tom|\bmt\b/i},
  {n:"TOM 3", re:/tom ?-?3|hi ?tom|high ?tom|\bht\b/i},
  {n:"CRASH", re:/crash|\bcc\b/i},
  {n:"RIDE",  re:/ride|\brc\b|\brd\b/i},
  {n:"COWB",  re:/cowbell|\bcb\b|cow/i},
  {n:"CLAVE", re:/clave|\bcl\b|stick/i},
  {n:"PERC",  re:/conga|bongo|timbale|agogo|block|tamb|shaker|maraca|cabasa|guiro|perc/i},
  {n:"FX",    re:/./}
];
function pisteArcm(){
  return {ech:"", nom:"", pas:0, acc:0, niv:0.8, pan:0, tune:0.5, dec:0.8, debut:0, filt:1,
          /* ajoutés en v90 : de quoi travailler le son sans quitter la machine */
          fin:1,        /* point de fin, pour découper avec DEBUT              */
          reso:0,       /* résonance du filtre                                  */
          ftype:0,      /* passe-bas, passe-bande, passe-haut                    */
          drive:0,      /* saturation                                            */
          envoi:0,      /* départ vers écho et réverbération                     */
          rev:false};   /* lecture à l'envers                                    */
}
function motifArcm(){
  var m = {pistes:[], last:16};
  for(var i=0;i<16;i++) m.pistes.push(pisteArcm());
  return m;
}
/* Huit motifs ne suffisaient pas pour construire un morceau : on refaisait
   tout dans un seul, avec tous les sons dedans. Cent vingt-huit, rangés en
   huit banques de seize, permettent d'écrire des boucles courtes et de les
   enchaîner — c'est ainsi qu'on travaille sur une Electribe. */
var ARCM_BANQUES = 8, ARCM_PAR_BANQUE = 16, ARCM_MOTIFS = ARCM_BANQUES * ARCM_PAR_BANQUE;
var ARCM = {nom:"", motifs:[], cur:0, sel:0, accent:false, rec:false, pos:-1,
            noeuds:[], kits:[], banque:0, suivant:-1,
            chaine:[], chainePos:0, song:false,
            swing:0, echo:0.35, verb:0.4, fx:null, inv:null, courbes:null};
for(var amz=0; amz<ARCM_MOTIFS; amz++) ARCM.motifs.push(motifArcm());
/* Un motif vide n'a rien à faire dans la mémoire : sur cent vingt-huit, la
   plupart le resteront. On ne garde que ceux qui ont du contenu. */
function motifArcmVide(m){
  for(var i=0;i<m.pistes.length;i++){
    var P = m.pistes[i];
    if(P.pas || P.acc || P.ech) return false;   /* les réglages seuls ne comptent pas */
  }
  return true;
}
function motifArcmCur(){ return ARCM.motifs[ARCM.cur]; }
function pisteArcmSel(){ return motifArcmCur().pistes[ARCM.sel]; }

/* Un départ d'effets commun : c'est ce qui manque le plus à un sampler sec.
   Chaque piste y envoie ce qu'elle veut, l'écho et la réverbération sont
   partagés — comme sur une vraie console, et pour la même raison : seize
   réverbérations séparées coûteraient seize fois plus cher pour un résultat
   moins cohérent. */
function fxArcm(){
  if(ARCM.fx) return ARCM.fx;
  var e = ctx.createGain();
  var d = ctx.createDelay(1.5), fb = ctx.createGain();
  d.delayTime.value = 0.28; fb.gain.value = 0.35;
  var c = ctx.createConvolver(), n = Math.floor(ctx.sampleRate * 1.6);
  var b = ctx.createBuffer(2, n, ctx.sampleRate);
  for(var ch=0; ch<2; ch++){
    var q = b.getChannelData(ch);
    for(var i=0;i<n;i++) q[i] = (Math.random()*2-1) * Math.pow(1 - i/n, 2.6);
  }
  c.buffer = b;
  var gd = ctx.createGain(), gv = ctx.createGain();
  gd.gain.value = 0.5; gv.gain.value = 0.4;
  e.connect(d); d.connect(fb); fb.connect(d); d.connect(gd); gd.connect(busSet("arcm") || master);
  e.connect(c); c.connect(gv); gv.connect(busSet("arcm") || master);
  ARCM.fx = {e:e, d:d, fb:fb, gd:gd, gv:gv};
  return ARCM.fx;
}
/* Un tampon lu à l'envers : on le fabrique une fois et on le garde. */
function bufArcmInverse(nom, buf){
  if(!ARCM.inv) ARCM.inv = {};
  if(ARCM.inv[nom]) return ARCM.inv[nom];
  var r = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
  for(var c=0; c<buf.numberOfChannels; c++){
    var src = buf.getChannelData(c), dst = r.getChannelData(c), n = buf.length;
    for(var i=0;i<n;i++) dst[i] = src[n - 1 - i];
  }
  ARCM.inv[nom] = r;
  return r;
}
/* Les courbes de saturation sont chères à construire : on les range par
   crans, huit suffisent pour que le potard paraisse continu. */
function courbeArcm(d){
  if(!ARCM.courbes) ARCM.courbes = {};
  var cran = Math.max(0, Math.min(8, Math.round(d * 8)));
  if(ARCM.courbes[cran]) return ARCM.courbes[cran];
  var n = 1025, c = new Float32Array(n), k = 1 + cran * 7;
  for(var i=0;i<n;i++){
    var x = i * 2 / (n - 1) - 1;
    c[i] = Math.tanh(x * k) / Math.tanh(k);
  }
  ARCM.courbes[cran] = c;
  return c;
}
function sortieArcm(k){
  if(!ARCM.noeuds[k]){
    var g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if(p){ g.connect(p); p.connect(busSet("arcm") || master); } else g.connect(busSet("arcm") || master);
    ARCM.noeuds[k] = {g:g, p:p};
  }
  return ARCM.noeuds[k];
}
function voixArcm(t, k, acc){
  var P = motifArcmCur().pistes[k];
  if(!P || !P.ech) return;
  banqueEs();
  var buf = ES.buf[P.ech];
  if(!buf) return;
  var n = sortieArcm(k);
  n.g.gain.setValueAtTime(1, t);
  if(n.p) n.p.pan.setValueAtTime(P.pan, t);
  var src = ctx.createBufferSource();
  /* à l'envers : le tampon retourné, le reste du calcul ne change pas */
  src.playbackRate.value = Math.pow(2, (P.tune - 0.5) * 2);
  poserTampon(src, P.rev ? bufArcmInverse(P.ech, buf) : buf, src.playbackRate.value);
  var f = ctx.createBiquadFilter();
  /* trois filtres en un seul potard : le type change tout plus qu'une coupure */
  var ty = Math.min(2, Math.round((P.ftype || 0) * 2));
  f.type = ty === 0 ? "lowpass" : (ty === 1 ? "bandpass" : "highpass");
  f.frequency.value = Math.min(19000, 160 * Math.pow(115, P.filt));
  f.Q.value = 0.7 + (P.reso || 0) * 18;
  var g = ctx.createGain();
  /* DEBUT et FIN découpent le tampon : c'est ce qui permet de ne garder qu'un
     morceau d'un son, sans passer par un éditeur. */
  var fin = (typeof P.fin === "number") ? P.fin : 1;
  var dep = P.debut * buf.duration * 0.9;
  var stop = Math.max(dep + 0.02, fin * buf.duration);
  var dispo = Math.max(0.02, stop - dep);
  var duree = Math.max(0.03, (dispo / src.playbackRate.value) * Math.max(0.05, P.dec));
  var pic = mv("niv", P.niv) * (acc ? 1 : 0.68);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(pic, t + 0.002);
  g.gain.setValueAtTime(pic, t + Math.max(0.005, duree - 0.02));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.02, duree));
  var apres = g;
  if(P.drive > 0.02){
    var sat = ctx.createWaveShaper();
    sat.curve = courbeArcm(P.drive); sat.oversample = "2x";
    var rattrape = ctx.createGain();
    rattrape.gain.value = 1 - P.drive * 0.45;   /* saturer remonte le niveau */
    g.connect(sat); sat.connect(rattrape);
    apres = rattrape;
  }
  src.connect(f); f.connect(g);
  apres.connect(pasVoie(n.g));
  if(P.envoi > 0.02){
    var env = ctx.createGain();
    env.gain.value = P.envoi * 0.9;
    apres.connect(env); env.connect(pasVoie(fxArcm().e));
  }
  src.start(t, Math.min(dep, Math.max(0, buf.duration - 0.01)));
  src.stop(t + duree + 0.05);
  midiNoteA(MIDI.base + k, t, acc ? 1 : 0.7, MIDI.canal, duree);
}
function frapperArcm(k, acc){
  audioInit();
  if(!ctx) return;
  voixArcm(maintenantAudio() + 0.005, k, acc);
  if(S.run && ARCM.rec){
    var m = motifArcmCur();
    var j = pasLePlusProche(ARCM.pos, m.last || 16);
    if(j >= 0){
      m.pistes[k].pas |= (1 << j);
      if(acc) m.pistes[k].acc |= (1 << j);
      majArcm(); memArcm();
    }
  }
}
function scheduleArcm(i, t){
  var CHARGE_N = ouvrirPas();
  var m = motifArcmCur();
  if(i >= m.last) return;
  /* Le swing retarde un pas sur deux. Sans lui, un motif écrit à la grille
     reste raide quoi qu'on y mette. */
  var dt = (i % 2 === 1) ? ARCM.swing * 0.42 * stepDur() : 0;
  for(var k=0;k<16;k++){
    if(m.pistes[k].pas & (1 << i)) CHARGE_N++, voixArcm(t + dt, k, !!(m.pistes[k].acc & (1 << i)));
  }
  if(!cache) queue.push({i:i, t:t});
  attenuerVoie("arcm", CHARGE_N, t);
}
var arcmPas = [];
function beatArcm(i){
  ARCM.pos = i;
  for(var j=0;j<16;j++) arcmPas[j].classList.toggle("cur", j === i);
}
function arretArcm(){
  ARCM.pos = -1;
  for(var j=0;j<16;j++) arcmPas[j].classList.remove("cur");
  var b = document.getElementById("arcm-play");
  if(b) b.classList.remove("on");
}
function boucleArcm(){
  /* Comme sur une Electribe : on choisit le motif suivant pendant que ça joue,
     et il prend la main à la fin de la mesure, pas au milieu. */
  if(ARCM.song && ARCM.chaine.length){
    ARCM.chainePos = (ARCM.chainePos + 1) % ARCM.chaine.length;
    ARCM.suivant = ARCM.chaine[ARCM.chainePos];
  }
  if(ARCM.suivant >= 0 && ARCM.suivant !== ARCM.cur){
    ARCM.cur = ARCM.suivant;
    majArcm(); majKnobsArcm();
  }
  ARCM.suivant = -1;
  majGrilleArcm();
}
var MACHINE_ARCM = {schedule:scheduleArcm, beat:beatArcm, arret:arretArcm, boucle:boucleArcm,
                    longueur:function(){ return motifArcmCur().last; }};

/* ---------- charger une machine de la collection ---------- */
function rangerArcm(fichiers){
  /* on devine le rôle de chaque son d'après son nom de fichier, pour que la
     grosse caisse tombe sur la première piste et le charley au bon endroit */
  var pris = {}, sortie = [];
  ARCM_ROLES.forEach(function(r, i){
    if(i === ARCM_ROLES.length - 1) return;
    for(var j=0;j<fichiers.length;j++){
      if(pris[j]) continue;
      if(r.re.test(fichiers[j].nom)){ sortie[i] = {f:fichiers[j], role:true}; pris[j] = 1; break; }
    }
  });
  for(var i=0;i<16;i++){
    if(sortie[i]) continue;
    for(var j=0;j<fichiers.length;j++){
      if(pris[j]) continue;
      sortie[i] = {f:fichiers[j], role:false}; pris[j] = 1; break;
    }
  }
  return sortie;
}
function arcmCharger(m){
  if(ARC.occupe) return;
  ARC.occupe = true;
  majArcUI();
  signal("LECTURE DU CONTENU DE " + m.nom.toUpperCase());
  var url = ARC.base + "/" + encodeURIComponent(m.zip) + "/";
  netCharger(url, 2 * 1024 * 1024).then(function(b64){
    var html = texteDeB64(b64);
    var prefixe = "/download/drum-machines-collection/" + encodeURIComponent(m.zip) + "/";
    var vus = {}, l = [];
    function ajoute(interne){
      if(!interne || vus[interne]) return;
      vus[interne] = 1;
      l.push({interne:interne, nom:decodeURIComponent(interne).split("/").pop()});
    }
    var re = /href="([^"]+)"/gi, x;
    while((x = re.exec(html))){
      if(!/\.(wav|aif|aiff)$/i.test(x[1])) continue;
      if(x[1].indexOf(prefixe) >= 0) ajoute(x[1].slice(x[1].indexOf(prefixe) + prefixe.length));
    }
    if(!l.length){
      re = /href="([^"]+)"/gi;
      while((x = re.exec(html))){
        if(!/\.(wav|aif|aiff)$/i.test(x[1])) continue;
        if(/^https?:/i.test(x[1]) || x[1].charAt(0) === "/") continue;
        ajoute(x[1].replace(/^\.\//, ""));
      }
    }
    if(!l.length) throw "aucun son lisible";
    var choisis = rangerArcm(l);
    return arcmSuite(m, choisis, 0, motifArcm());
  }).catch(function(e){
    ARC.occupe = false;
    majArcUI();
    signal("CHARGEMENT IMPOSSIBLE · " + String(e).toUpperCase());
  });
}
/* les sons sont pris un par un : on voit l'avancement et une panne isolée
   n'emporte pas tout le kit */
function arcmSuite(m, choisis, i, motif){
  if(i >= 16){
    ARC.occupe = false;
    ARCM.nom = m.nom;
    ARCM.motifs = [];
    for(var z=0; z<8; z++) ARCM.motifs.push(z === 0 ? motif : motifArcm());
    ARCM.cur = 0; ARCM.sel = 0;
    var p = motif.pistes[0];
    if(p.ech){ p.pas = 0x1111; }
    if(motif.pistes[1].ech) motif.pistes[1].pas = 0x0440;
    if(motif.pistes[4].ech) motif.pistes[4].pas = 0x5555;
    memArcm();
    fermerBib();
    activerArcm();
    signal(m.nom.toUpperCase() + " CHARGÉE · " +
           motif.pistes.filter(function(q){ return q.ech; }).length + " SONS");
    H.inter();
    return;
  }
  var ch = choisis[i];
  if(!ch) return arcmSuite(m, choisis, i + 1, motif);
  var f = ch.f;
  signal("CHARGEMENT " + (i + 1) + "/16 · " + f.nom);
  var url = ARC.base + "/" + encodeURIComponent(m.zip) + "/" + f.interne;
  return netCharger(url, 2 * 1024 * 1024).then(function(b64){
    var o = b64VersOctets(b64);
    return new Promise(function(ok, rej){
      ctx.decodeAudioData(o.buffer.slice(0), ok, function(){ rej("format refusé"); });
    });
  }).then(function(buf){
    var court = reduireEch(buf, 32000, 6);
    var id = "a" + Date.now().toString(36) + i;
    ES.buf[id] = court;
    ES.noms[id] = "archive";
    BIB.noms[id] = (m.nom.split(" ")[0] + " " + f.nom.replace(/\.[^.]+$/, "")).slice(0, 28);
    sauverEch(id, court);
    motif.pistes[i].ech = id;
    /* le nom du rôle seulement si le son a bien été reconnu ; sinon celui du
       fichier, pour ne pas afficher COWB au-dessus d'un shaker */
    motif.pistes[i].nom = ch.role ? ARCM_ROLES[i].n
                                  : f.nom.replace(/\.[^.]+$/, "").replace(/^.*[_\- ]/, "").slice(0, 8);
    return arcmSuite(m, choisis, i + 1, motif);
  }).catch(function(){
    /* ce son-là n'a pas voulu : on passe au suivant sans perdre le reste */
    return arcmSuite(m, choisis, i + 1, motif);
  });
}

/* ---------- interface ---------- */
(function construireArcm(){
  var sel = document.getElementById("arcm-sel");
  for(var i=0;i<16;i++){
    var b = document.createElement("button");
    b.dataset.k = i;
    sel.appendChild(b);
  }
  sel.addEventListener("click", function(e){
    var b2 = e.target.closest("button");
    if(!b2) return;
    ARCM.sel = +b2.dataset.k;
    frapperArcm(ARCM.sel, ARCM.accent);
    majArcm(); majKnobsArcm(); H.cran();
  });
  var pas = document.getElementById("arcm-pas");
  for(var j=0;j<16;j++){
    var b3 = document.createElement("button");
    b3.dataset.i = j;
    pas.appendChild(b3);
    arcmPas.push(b3);
  }
  pas.addEventListener("click", function(e){
    var b4 = e.target.closest("button");
    if(!b4) return;
    var i2 = +b4.dataset.i, P = pisteArcmSel();
    if(ARCM.accent) P.acc ^= (1 << i2);
    else {
      P.pas ^= (1 << i2);
      if(!S.run && (P.pas & (1 << i2))){
        audioInit();
        voixArcm(maintenantAudio() + 0.01, ARCM.sel, !!(P.acc & (1 << i2)));
      }
    }
    majArcm(); memArcm(); H.cran();
  });
})();

function knobArcm(nom, etiq, min, max){
  return knobEm("arcm-k-" + nom, {min:min, max:max,
    get:function(){ return pisteArcmSel()[nom]; },
    set:function(v){
      pisteArcmSel()[nom] = v;
      lcdArcm(String(Math.round(v * 100)), etiq, true);
      memArcm();
    }});
}
/* Trois potards ne règlent pas la piste mais la machine entière : ils ont
   donc leur propre fabrique, sans quoi ils suivraient la piste choisie. */
function knobArcmGlobal(nom, etiq, appliquer){
  return knobEm("arcm-k-" + nom, {min:0, max:1,
    get:function(){ return ARCM[nom]; },
    set:function(v){
      ARCM[nom] = v;
      if(appliquer) appliquer(v);
      lcdArcm(String(Math.round(v * 100)), etiq, true);
      memArcm();
    }});
}
var kArcmNiv = knobArcm("niv", "LEVEL", 0, 1);
var kArcmPan = knobArcm("pan", "PAN", -1, 1);
var kArcmTune = knobArcm("tune", "TUNE", 0, 1);
var kArcmDec = knobArcm("dec", "DECAY", 0.05, 1);
var kArcmFin = knobArcm("fin", "END", 0.05, 1);
var kArcmReso = knobArcm("reso", "RESO", 0, 1);
var kArcmFtype = knobArcm("ftype", "TYPE", 0, 1);
var kArcmDrive = knobArcm("drive", "DRIVE", 0, 1);
var kArcmEnvoi = knobArcm("envoi", "SEND", 0, 1);
var kArcmSwing = knobArcmGlobal("swing", "SWING");
var kArcmEcho = knobArcmGlobal("echo", "ECHO", function(v){
  if(ARCM.fx){ ARCM.fx.gd.gain.value = v; ARCM.fx.fb.gain.value = 0.15 + v * 0.45; }
});
var kArcmVerb = knobArcmGlobal("verb", "REVERB", function(v){
  if(ARCM.fx) ARCM.fx.gv.gain.value = v;
});
var kArcmDebut = knobArcm("debut", "START", 0, 1);
var kArcmFilt = knobArcm("filt", "FILTER", 0, 1);
var kArcmVol = knobEm("arcm-k-vol", {min:0, max:1, get:function(){ return S.vol; },
  set:function(v){ S.vol = v; if(master && ctx) master.gain.setTargetAtTime(v, maintenantAudio(), 0.02);
    lcdArcm(String(Math.round(v*100)), "VOLUME", true); saveSoon(); }});
var kArcmTempo = knobEm("arcm-k-tempo", {min:0, max:1, get:function(){ return (S.bpm - 40) / 220; },
  set:function(v){ S.bpm = Math.round(40 + v*220); lcdArcm(String(S.bpm), "TEMPO", true); saveSoon(); }});
function majKnobsArcm(){
  [kArcmNiv, kArcmPan, kArcmTune, kArcmDec, kArcmDebut, kArcmFilt,
   kArcmFin, kArcmReso, kArcmFtype, kArcmDrive, kArcmEnvoi,
   kArcmSwing, kArcmEcho, kArcmVerb, kArcmVol, kArcmTempo]
    .forEach(function(k){ k.maj(); });
  var b = document.getElementById("arcm-rev");
  if(b) b.classList.toggle("on", !!pisteArcmSel().rev);
}
var arcmTmr = null;
function lcdArcm(v, l, fugace){
  var a = document.getElementById("arcm-val"), b = document.getElementById("arcm-lab");
  if(!a) return;
  a.textContent = v; b.textContent = l;
  clearTimeout(arcmTmr);
  if(fugace) arcmTmr = setTimeout(majLcdArcm, 1300);
}
function majLcdArcm(){
  var P = pisteArcmSel();
  if(!ARCM.nom){ lcdArcm("VIDE", "CHARGEZ UN KIT DEPUIS LA BIBLIOTHÈQUE"); return; }
  lcdArcm(P.nom || ("PISTE " + (ARCM.sel + 1)), ARCM.nom.slice(0, 22));
}
function majArcm(){
  var m = motifArcmCur(), P = m.pistes[ARCM.sel], i;
  var bs = document.querySelectorAll("#arcm-sel button");
  for(i=0;i<bs.length;i++){
    var Q = m.pistes[i];
    bs[i].textContent = Q.nom || String(i + 1);
    bs[i].classList.toggle("on", i === ARCM.sel);
    bs[i].classList.toggle("vide", !Q.ech);
  }
  for(i=0;i<16;i++){
    arcmPas[i].classList.toggle("act", ARCM.accent ? !!(P.acc & (1 << i)) : !!(P.pas & (1 << i)));
    arcmPas[i].classList.toggle("hors", i >= m.last);
  }
  document.getElementById("arcm-accent").classList.toggle("on", ARCM.accent);
  document.getElementById("arcm-rec").classList.toggle("on", ARCM.rec);
  document.getElementById("arcm-last").textContent = "LAST " + m.last;
  document.getElementById("arcm-ptn").textContent = "PTN " + (ARCM.cur + 1);
  document.getElementById("arcm-notice").textContent = ARCM.nom || "MACHINE D'ARCHIVE";
  majLcdArcm();
}
function memArcm(){
  var pleins = [];
  ARCM.motifs.forEach(function(m, i){
    if(motifArcmVide(m)) return;
    pleins.push({i:i, last:m.last, pistes:m.pistes.map(function(P){
      return {ech:P.ech, nom:P.nom, pas:P.pas, acc:P.acc, niv:P.niv, pan:P.pan,
              tune:P.tune, dec:P.dec, debut:P.debut, filt:P.filt,
              fin:P.fin, reso:P.reso, ftype:P.ftype, drive:P.drive,
              envoi:P.envoi, rev:P.rev};
    })});
  });
  memoire.arcm = {nom:ARCM.nom, cur:ARCM.cur, sel:ARCM.sel, banque:ARCM.banque,
                  v:2, pleins:pleins, chaine:ARCM.chaine,
                  swing:ARCM.swing, echo:ARCM.echo, verb:ARCM.verb};
  sauverMachine("arcm");
}
function chargerArcm(){
  ARCM.motifs = [];
  for(var i=0;i<ARCM_MOTIFS;i++) ARCM.motifs.push(motifArcm());
  ARCM.nom = ""; ARCM.cur = 0; ARCM.sel = 0; ARCM.banque = 0; ARCM.suivant = -1;
  var m = memLire("arcm");
  if(m){
    if(m.nom) ARCM.nom = m.nom;
    function poserMotif(r, o){
      r.last = o.last || 16;
      (o.pistes || []).forEach(function(P, k){
        if(k >= 16) return;
        for(var q in P) if(r.pistes[k][q] !== undefined) r.pistes[k][q] = P[q];
      });
    }
    if(m.pleins){                       /* format à motifs épars, v2 */
      m.pleins.forEach(function(o){
        if(typeof o.i === "number" && o.i < ARCM_MOTIFS) poserMotif(ARCM.motifs[o.i], o);
      });
    } else if(m.motifs){                /* ancien format : huit motifs d'affilée */
      m.motifs.forEach(function(o, i){
        if(i < ARCM_MOTIFS) poserMotif(ARCM.motifs[i], o);
      });
    }
    if(typeof m.banque === "number") ARCM.banque = Math.max(0, Math.min(ARCM_BANQUES - 1, m.banque));
    ["swing","echo","verb"].forEach(function(q){
      if(typeof m[q] === "number") ARCM[q] = m[q];
    });
    if(m.chaine && m.chaine.length)
      ARCM.chaine = m.chaine.filter(function(x){ return typeof x === "number" && x >= 0 && x < ARCM_MOTIFS; });
    if(typeof m.cur === "number") ARCM.cur = m.cur;
    if(typeof m.sel === "number") ARCM.sel = m.sel;
  }
}
document.getElementById("arcm-play").addEventListener("click", function(){
  audioInit(); banqueEs();
  if(S.run){ stop(); H.stop(); } else { step = 0; start(); H.start(); }
  this.classList.toggle("on", S.run);
});
document.getElementById("arcm-accent").addEventListener("click", function(){
  ARCM.accent = !ARCM.accent; majArcm(); H.inter();
});
document.getElementById("arcm-last").addEventListener("click", function(){
  var m = motifArcmCur(), v = [16, 12, 8, 4];
  m.last = v[(v.indexOf(m.last) + 1) % v.length];
  majArcm(); memArcm(); H.cran();
});
/* ---------- grille des motifs et morceau ----------
   Un morceau, ici, est simplement une suite de numéros de motifs. On l'écrit
   en ajoutant les motifs un par un, et la lecture passe au suivant à chaque
   fin de mesure. C'est la façon de faire d'une Electribe, et elle suffit à
   monter un titre entier sans quitter la machine. */
function majGrilleArcm(){
  var bq = document.getElementById("arcm-banques"), pads = document.getElementById("arcm-pads");
  if(!bq || !pads) return;
  if(!bq.childNodes.length){
    for(var b=0; b<ARCM_BANQUES; b++) (function(n){
      var e = document.createElement("button");
      e.textContent = String.fromCharCode(65 + n);
      e.addEventListener("click", function(){ ARCM.banque = n; majGrilleArcm(); H.cran(); });
      bq.appendChild(e);
    })(b);
    for(var k=0; k<ARCM_PAR_BANQUE; k++) (function(n){
      var e = document.createElement("button");
      e.addEventListener("click", function(){
        var i = ARCM.banque * ARCM_PAR_BANQUE + n;
        if(S.run){
          /* en lecture, on met en file : le motif prend la main à la mesure
             suivante, sinon on couperait la musique au milieu */
          ARCM.suivant = i;
          lcdArcm("MOTIF " + (i + 1), "À LA MESURE SUIVANTE", true);
        } else {
          memArcm(); ARCM.cur = i; ARCM.suivant = -1;
          majArcm(); majKnobsArcm();
        }
        majGrilleArcm(); H.inter();
      });
      pads.appendChild(e);
    })(k);
  }
  var bs = bq.childNodes;
  for(var i=0;i<bs.length;i++) bs[i].classList.toggle("on", i === ARCM.banque);
  var ps = pads.childNodes;
  for(i=0;i<ps.length;i++){
    var idx = ARCM.banque * ARCM_PAR_BANQUE + i;
    ps[i].textContent = String(idx + 1);
    ps[i].classList.toggle("plein", !motifArcmVide(ARCM.motifs[idx]));
    ps[i].classList.toggle("on", idx === ARCM.cur);
    ps[i].classList.toggle("file", idx === ARCM.suivant && idx !== ARCM.cur);
  }
  var t = document.getElementById("arcm-chaine-txt");
  if(t) t.textContent = ARCM.chaine.length
    ? ("MORCEAU : " + ARCM.chaine.map(function(x){ return x + 1; }).join(" · ") +
       (ARCM.song ? "  ▶ " + (ARCM.chainePos + 1) + "/" + ARCM.chaine.length : ""))
    : "MORCEAU VIDE · AJOUTEZ DES MOTIFS";
  var b2 = document.getElementById("arcm-song");
  if(b2) b2.classList.toggle("on", ARCM.song);
}
document.getElementById("arcm-ptn").addEventListener("click", function(){
  var g = document.getElementById("arcm-grille");
  g.classList.toggle("vu");
  majGrilleArcm(); fit(); H.cran();
});
document.getElementById("arcm-rev").addEventListener("click", function(){
  var P = pisteArcmSel();
  P.rev = !P.rev;
  majKnobsArcm(); memArcm(); H.inter();
  lcdArcm(P.rev ? "À L'ENVERS" : "À L'ENDROIT", P.nom || "PISTE " + (ARCM.sel + 1), true);
});
document.getElementById("arcm-song").addEventListener("click", function(){
  if(!ARCM.chaine.length){ signal("LE MORCEAU EST VIDE"); return; }
  ARCM.song = !ARCM.song;
  if(ARCM.song){
    ARCM.chainePos = 0;
    ARCM.suivant = ARCM.chaine[0];
    if(!S.run){ memArcm(); ARCM.cur = ARCM.chaine[0]; ARCM.suivant = -1; majArcm(); majKnobsArcm(); }
  }
  majGrilleArcm(); majArcm(); H.inter();
  signal(ARCM.song ? "MORCEAU EN LECTURE" : "RETOUR AU MOTIF SEUL");
});
document.getElementById("arcm-ajouter").addEventListener("click", function(){
  if(ARCM.chaine.length >= 128){ signal("MORCEAU COMPLET"); return; }
  ARCM.chaine.push(ARCM.cur);
  memArcm(); majGrilleArcm(); H.cran();
});
document.getElementById("arcm-oter").addEventListener("click", function(){
  ARCM.chaine.pop();
  if(ARCM.chainePos >= ARCM.chaine.length) ARCM.chainePos = 0;
  if(!ARCM.chaine.length) ARCM.song = false;
  memArcm(); majGrilleArcm(); H.cran();
});
document.getElementById("arcm-vider-chaine").addEventListener("click", function(){
  if(ARCM.chaine.length && !window.confirm("Vider le morceau ?\n\nLes motifs eux-mêmes sont conservés.")) return;
  ARCM.chaine = []; ARCM.chainePos = 0; ARCM.song = false;
  memArcm(); majGrilleArcm(); H.inter();
});
document.getElementById("arcm-clear").addEventListener("click", function(){
  var P = pisteArcmSel();
  P.pas = 0; P.acc = 0;
  majArcm(); memArcm(); H.inter();
});
document.getElementById("arcm-kits").addEventListener("click", function(){
  signal(ARCM.nom ? ("KIT COURANT : " + ARCM.nom.toUpperCase()) : "AUCUN KIT · PASSEZ PAR LA BIBLIOTHÈQUE");
});
document.getElementById("arcm-bib").addEventListener("click", function(){
  ouvrirBib();
  BIB.onglet = 3;
  majBibUI();
});
document.getElementById("arcm-rec").addEventListener("click", function(){
  ARCM.rec = !ARCM.rec; majArcm(); H.inter();
  signal(ARCM.rec ? "FRAPPEZ UNE PISTE PENDANT LA LECTURE" : "ENREGISTREMENT COUPÉ");
});
document.getElementById("arcm-notice").addEventListener("click", function(){ ouvrirNotice(); });

var unitArcm = document.getElementById("unit-arcm");
function activerArcm(){
  stop();
  S.modele = "arcm";
  MACHINE = MACHINE_ARCM;
  poserMachine("arcm");
  audioInit(); banqueEs(); chargerEchs();
  chargerArcm();
  chargerKo();
  chargerStk();
  chargerMc();
  chargerKp();
  debrancherTout(ARCM.noeuds); ARCM.noeuds = [];
  majArcm(); majKnobsArcm();
  actif = unitArcm;
  save(); fit(); setTimeout(fit, 120);
}

