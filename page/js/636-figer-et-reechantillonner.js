/* ================= figer une machine, rééchantillonner (v255) =================
   FIGER EN ÉCHANTILLONS : chaque voix d'une machine de synthèse (TR-808,
   EM-1, DrumBrute…) est rendue seule, hors ligne, avec ses réglages actuels,
   et devient un son de la bibliothèque. Un kit 808 à votre goût peut ainsi
   passer sur les pads d'une MPC, d'une volca ou du KAOSS PAD.

   Une voix par rendu : deux voix d'un même rendu pourraient se couper (le
   charley fermé étouffe l'ouvert). Le kit est normalisé d'un bloc, crête la
   plus forte à −1 dB : l'équilibre entre les voix reste celui de la machine.

   RÉÉCHANTILLONNER : l'export WAV (onglet Général) rend la machine affichée
   — ses mesures, ou un passage de son morceau enchaîné — et le résultat va
   dans la bibliothèque au lieu d'un fichier. La queue (réverbération, cymbales) est
   repliée sur le début : la boucle reboucle sans coupure. */

/* comment faire sonner la voix k, son nom, combien il y en a */
var FIGER = {
  "16":{nb:function(){ return FIGER.clesEhx().length; }, jouer:function(T, k){ V[FIGER.clesEhx()[k]](T, 1); },
        nom:function(k){ return FIGER.clesEhx()[k].toUpperCase(); }, court:"DRM16"},
  "32":{nb:function(){ return FIGER.clesEhx().length; }, jouer:function(T, k){ V[FIGER.clesEhx()[k]](T, 1); },
        nom:function(k){ return FIGER.clesEhx()[k].toUpperCase(); }, court:"DRM32"},
  em1:{nb:function(){ return EM_PARTS.length; }, jouer:function(T, k){ voixSynth(T, k, 60, 1); },
       nom:function(k){ return EM_PARTS[k].nom; }, court:"EM-1", saute:function(k){ return !!EM_PARTS[k].accent; }},
  er1:{nb:function(){ return ER_PARTS.length; }, jouer:function(T, k){ voixEr(T, k, 1); },
       nom:function(k){ var p = ER_PARTS[k]; return (p.t === "perc" ? "PERC " : p.t === "bruit" ? "BRUIT " : "") + p.n.toUpperCase(); }, court:"ER-1",
       saute:function(k){ return ER_PARTS[k].t === "accent"; }},
  ea1:{nb:function(){ return 2; }, jouer:function(T, k){ voixEa(T, k, 48, 1, 0.3); },
       nom:function(k){ return "SYNTH " + (k + 1); }, court:"EA-1"},
  emx:{nb:function(){ return 9; }, jouer:function(T, k){ voixMxDrum(T, k, 1); },
       nom:function(k){ return "DRUM " + MX_DRUMS[k]; }, court:"EMX-1"},
  tr808:{nb:function(){ return TR.def.instr.length; }, jouer:function(T, k){ voixTr(T, k, false); },
         nom:function(k){ var p = TR.def.instr[k]; return p.nom || p.id; }, court:"TR-808",
         saute:function(k){ return TR.def.instr[k].id === "AC"; }},
  dmx:{nb:function(){ return DMX_TOUCHES.length; }, jouer:function(T, k){ voixDmx(T, k, 1); },
       nom:function(k){ return DMX_TOUCHES[k].nom; }, court:"DMX"},
  dbi:{nb:function(){ return DBI_VOIX.length; }, jouer:function(T, k){ voixDbi(T, k, false); },
       nom:function(k){ return DBI_VOIX[k].nom; }, court:"DBI"},
  cr5:{nb:function(){ return FIGER.clesCr().length; }, jouer:function(T, k){ voixCr(T, FIGER.clesCr()[k], false); },
       nom:function(k){ return FIGER.clesCr()[k].toUpperCase(); }, court:"CR-5000"},
  t1k:{nb:function(){ return T1K_INSTR.length; }, jouer:function(T, k){ voixT1k(T, k, false); },
       nom:function(k){ return T1K_INSTR[k].nom; }, court:"TR-1000"},
  clesEhx:function(){ return Object.keys(V).filter(function(x){ return x !== "sw"; }); },
  clesCr:function(){ return Object.keys(CR_GROUPES); }
};
/* nom court de chaque machine, pour nommer les sons fabriqués */
var MACHINES_COURT = {es1:"ES-1", es2:"ES-1 MKII", esx:"ESX-1", mpc3000:"MPC3000", mpc2000:"MPC2000", vlc:"VOLCA",
  ko:"PO-33", kp:"KAOSS", mc:"MC-101", stk:"SMPLTREK", arcm:"ARCHIVE", td3:"TD-3", eur:"EURORACK"};
function nomCourtMachine(m){ return FIGER[m] && FIGER[m].court ? FIGER[m].court : (MACHINES_COURT[m] || String(m).toUpperCase()); }
FIGER.er2 = {nb:FIGER.er1.nb, jouer:FIGER.er1.jouer, nom:FIGER.er1.nom, saute:FIGER.er1.saute, court:"ER-1 MKII"};
FIGER.ea2 = {nb:FIGER.ea1.nb, jouer:FIGER.ea1.jouer, nom:FIGER.ea1.nom, court:"EA-1 MKII"};
FIGER.tr909 = {nb:FIGER.tr808.nb, jouer:FIGER.tr808.jouer, nom:FIGER.tr808.nom, saute:FIGER.tr808.saute, court:"TR-909"};
FIGER.tr707 = {nb:FIGER.tr808.nb, jouer:FIGER.tr808.jouer, nom:FIGER.tr808.nom, saute:FIGER.tr808.saute, court:"TR-707"};
FIGER.rd6 = {nb:FIGER.tr808.nb, jouer:FIGER.tr808.jouer, nom:FIGER.tr808.nom, saute:FIGER.tr808.saute, court:"RD-6"};
var FIGER_DUREE = 3, FIGER_TAUX = 44100, FIGER_T = 0.02;
function peutFiger(m){ return !!FIGER[m] && typeof FIGER[m].jouer === "function"; }

/* ---------- traitement des rendus : purs, vérifiables à part ---------- */
/* garder la voix : à partir de son départ, jusqu'à −60 dB sous SA crête, plus
   10 ms de fondu. Un seuil fixe couperait tôt les voix faibles : la cymbale de
   la 808, qui sort à −22 dBFS, perdait ainsi la moitié de sa queue. */
function figerRogner(ch, sr, t0){
  var debut = Math.round(t0 * sr), n = ch[0].length, fin = debut, i, k, crete = 0;
  for(k=0;k<ch.length;k++) for(i=debut;i<n;i++){ var v = Math.abs(ch[k][i]); if(v > crete) crete = v; }
  if(crete < 1e-5) return null;                       /* silencieux : pas une voix */
  var seuil = crete * 0.001;
  for(i=n-1;i>=debut;i--){
    var a = 0;
    for(k=0;k<ch.length;k++) a = Math.max(a, Math.abs(ch[k][i]));
    if(a > seuil){ fin = i + 1; break; }
  }
  if(fin <= debut) return null;                       /* silencieux : pas une voix */
  var f = Math.round(sr * 0.01);
  fin = Math.min(n, fin + f);
  var r = ch.map(function(c){ return new Float32Array(c.subarray(debut, fin)); });
  var l = r[0].length, m = Math.min(f, l);
  r.forEach(function(c){ for(var j=0;j<m;j++) c[l - 1 - j] *= j / m; });
  return r;
}
/* deux canaux identiques : un seul suffit */
function figerMono(ch){
  if(ch.length < 2) return ch;
  var a = ch[0], b = ch[1];
  for(var i=0;i<a.length;i++) if(Math.abs(a[i] - b[i]) > 1e-4) return ch;
  return [a];
}
/* normaliser le kit d'un bloc : crête la plus forte à −1 dB */
function figerNormaliser(voix){
  var m = 0;
  voix.forEach(function(v){ v.ch.forEach(function(c){ for(var i=0;i<c.length;i++){ var a = Math.abs(c[i]); if(a > m) m = a; } }); });
  if(m < 1e-6) return 1;
  var g = Math.pow(10, -1 / 20) / m;
  voix.forEach(function(v){ v.ch.forEach(function(c){ for(var i=0;i<c.length;i++) c[i] *= g; }); });
  return g;
}
/* une boucle : exactement la durée musicale, la queue repliée sur le début */
function reechBoucle(ch, sr, t0, dureeMusicale){
  var debut = Math.round(t0 * sr), L = Math.max(1, Math.round(dureeMusicale * sr));
  return ch.map(function(c){
    var r = new Float32Array(L);
    for(var i=0;i<L && debut + i < c.length;i++) r[i] = c[debut + i];
    for(var j=debut + L;j<c.length;j++) r[(j - debut) % L] += c[j];
    for(var q=0;q<L;q++) r[q] = Math.max(-1, Math.min(1, r[q]));
    return r;
  });
}

/* ---------- le rendu : même prise en charge du contexte que le rendu d'une prise (600) ---------- */
function figerMachine(m){
  m = m || S.modele;
  if(!peutFiger(m)){ signal("CETTE MACHINE JOUE DÉJÀ DES ÉCHANTILLONS"); return Promise.resolve([]); }
  if(WAVX.occupe || ENR.ondesOccupe){ signal("UN RENDU EST DÉJÀ EN COURS"); return Promise.resolve([]); }
  if(typeof PROJET_EN_COURS !== "undefined" && PROJET_EN_COURS) return Promise.resolve([]);
  audioInit();
  if(!ctx){ signal("AUDIO INDISPONIBLE"); return Promise.resolve([]); }
  if(typeof ESSAI !== "undefined" && ESSAI) annulerEssai();
  if(S.modele !== m) allerMachine(m);
  if(S.run){ stop(); H.stop(); }
  if(typeof memMachineCourante === "function") memMachineCourante();
  if(writeMem() === false){ signal("RENDU ANNULÉ · MÉMOIRE NON ENREGISTRÉE"); return Promise.resolve([]); }
  var D = FIGER[m], total = D.nb(), noms = [];
  for(var k=0;k<total;k++){ try{ noms.push(String(D.nom(k) || ("VOIX " + (k + 1)))); }catch(e){ noms.push("VOIX " + (k + 1)); } }
  var morceaux = typeof morceauxActifs === "function" ? morceauxActifs() : [];
  var ctxVrai = ctx, masterVrai = master, bruitVrai = noiseBuf, cacheVrai = cache;
  var metalVrai = metalBuf, sourcesVraies = SOURCES, collecteVraie = COLLECTE;
  var sortiesVraies = {outBd:outBd, outMix:outMix, panBd:panBd, panMix:panMix};
  var busVrais = SET.bus;
  var td3Vrai = TD3.noeuds, eurVrai = {bus:EUR.bus, sources:EUR.sources, noeuds:EUR.noeuds};
  var inerteAvant = document.body.inert, termine = false;
  WAVX.occupe = true;
  document.body.inert = true;
  signal("FIGER " + D.court + " · " + total + " VOIX…");
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
    try{ allerMachine(m); if(typeof rallumerMorceaux === "function") rallumerMorceaux(morceaux); }
    finally{ WAVX.occupe = false; document.body.inert = inerteAvant; }
  }
  async function rendre(){
    var voix = [];
    for(var k=0;k<total;k++){
      if(D.saute && D.saute(k)) continue;              /* un accent n'est pas un son */
      var off = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, Math.ceil(FIGER_TAUX * FIGER_DUREE), FIGER_TAUX);
      ctx = off; OFF_T = -1; SOURCES = []; COLLECTE = null; queue = []; SET.bus = {};
      TD3.noeuds = null; EUR.bus = null; EUR.sources = null; EUR.noeuds = [];
      batirAudio(); cache = true;
      RENDU_MACHINE = "";
      allerMachineRendu(m);
      /* avant la chaîne générale (limiteur, écrêteur), comme le banc de son */
      master.disconnect(); master.gain.value = 1; master.connect(off.destination);
      try{ D.jouer(FIGER_T, k); }catch(e){ continue; }
      var r = await off.startRendering();
      var ch = [];
      for(var c=0;c<r.numberOfChannels;c++) ch.push(new Float32Array(r.getChannelData(c)));
      ch = figerRogner(ch, FIGER_TAUX, FIGER_T);
      if(ch) voix.push({k:k, nom:noms[k], ch:figerMono(ch)});
      off = null; r = null;
    }
    return voix;
  }
  return rendre().then(function(voix){
    remettre();
    if(!voix.length){ signal("AUCUNE VOIX N'A SONNÉ"); return []; }
    figerNormaliser(voix);
    var ids = [], base = Date.now();
    voix.forEach(function(v, i){
      var id = "u" + (base + i).toString(36) + "fg";
      var b = ctx.createBuffer(v.ch.length, v.ch[0].length, FIGER_TAUX);
      v.ch.forEach(function(c, q){ b.getChannelData(q).set(c); });
      ES.buf[id] = b; ES.noms[id] = "fige";
      BIB.noms[id] = (D.court + " " + v.nom).slice(0, 28);
      if(sauverEch(id, b)) ids.push(id);
    });
    bibEcrire();
    signal(ids.length + " SONS FIGÉS · " + D.court + (ids.length < voix.length ? " · " + (voix.length - ids.length) + " NON ÉCRITS" : ""));
    figerMontrer(D.court);
    H.inter();
    return ids;
  }).catch(function(e){
    try{ remettre(); }catch(x){}
    signal("RENDU ÉCHOUÉ · " + ((e && e.message) ? e.message.slice(0, 50) : "ERREUR AUDIO"));
    return [];
  });
}
/* montrer le résultat dans le rayon SONS */
function figerMontrer(texte){
  var b = document.getElementById("bib");
  if(!b || !b.classList.contains("show") || typeof bibFiltre !== "function") return;
  var f = bibFiltre();
  f.q = texte; f.cat = ""; f.orig = "tout"; f.fav = false; f.n = BIB_PAGE;
  BIB.onglet = 0;
  majBibUI();
}

/* ---------- rééchantillonner : l'export WAV, vers la bibliothèque ---------- */
function reechantillonnerMachine(){
  if(typeof ESSAI !== "undefined" && ESSAI) annulerEssai();
  exporterWav(false, true);
}
/* appelé par exporterWav avec le rendu hors ligne, une fois le vrai contexte rendu */
function reechVersBibliotheque(ch, sr, t0, dureeMusicale, quoi){
  if(dureeMusicale > 30){ signal("30 S AU PLUS DANS LA BIBLIOTHÈQUE · RÉDUISEZ LES MESURES"); return null; }
  var r = figerMono(reechBoucle(ch, sr, t0, dureeMusicale));
  var id = "u" + Date.now().toString(36) + "rs";
  var b = ctx.createBuffer(r.length, r[0].length, sr);
  r.forEach(function(c, q){ b.getChannelData(q).set(c); });
  ES.buf[id] = b; ES.noms[id] = "reech";
  BIB.noms[id] = quoi.slice(0, 28);
  if(typeof bibMeta === "function") bibMeta(id).a = "boucle";
  bibEcrire();
  var ok = sauverEch(id, b);
  signal((ok ? "DANS LA BIBLIOTHÈQUE : " : "GARDÉ POUR CETTE SESSION · ÉCHEC D'ÉCRITURE · ") + BIB.noms[id] + " · " + dureeMusicale.toFixed(2) + " S");
  figerMontrer(BIB.noms[id]);
  return id;
}

(function(){
  var b = document.getElementById("b-wav-bib");
  if(b) b.addEventListener("click", function(){ reechantillonnerMachine(); });
})();
