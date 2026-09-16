/* ================= le set : plusieurs machines à la fois =================
   Jusqu'ici une seule machine jouait, et sa sortie allait droit au mélange
   général. Pour en faire tourner plusieurs ensemble il faut d'abord une voie
   par machine — c'est exactement ce qu'on fait avec une vraie table : chaque
   appareil a sa tranche, son niveau, sa panoramique, son coupe-son.

   ATTENTION : dix-sept MOTEURS, pas vingt-cinq machines. La TR-808 et la 909
   partagent le même moteur et la même mémoire de motifs ; on peut jouer l'une
   ou l'autre, pas les deux. Même chose pour les deux MPC et les variantes
   d'Electribe. C'est une limite réelle, pas un oubli. */
var SET_VOIES = [
  ["ehx","DRM16 · DRM32"], ["em","EM-1"],   ["er","ER-1"],  ["ea","EA-1"],
  ["es","ES-1"],           ["mx","EMX-1"],  ["sx","ESX-1"], ["mpc","MPC"],
  ["tr","TR · RD-6"],      ["dmx","DMX"],   ["vlc","VOLCA"],["cr","CR-5000"],
  ["dbi","DRUMBRUTE"],     ["t1k","TR-1000"],["arcm","ARCHIVE"], ["td3","TD-3"],
  ["ko","K.O!"],           ["stk","SMPLTREK"], ["mc","MC-101"], ["kp","KAOSS"], ["eur","EURORACK"]
];
var SET = {on:false, actives:{}, niv:{}, pan:{}, mute:{}, solo:"", bus:{},
           trim:{}, lo:{}, md:{}, hi:{}};
SET_VOIES.forEach(function(v){
  var k = v[0];
  SET.niv[k] = 0.8; SET.pan[k] = 0; SET.mute[k] = false;
  SET.trim[k] = 1;                       /* gain d'entrée au repos */
  SET.lo[k] = 0.5; SET.md[k] = 0.5; SET.hi[k] = 0.5;   /* égaliseur à plat */
});

/* Calibrage des voies (v149, phase B2). Décibels ajoutés au gain d'entrée de
   chaque voie pour que la voix la plus forte de chaque machine culmine vers
   −8 dBFS : mesuré par outils/banc-son.py (docs/mesures-son.md), chaque voix
   seule à pleine vélocité. La voie TR prend la valeur du modèle actif. Le
   réglage GAIN de la table reste libre par-dessus. Machines sans voix
   isolables (Eurorack, KAOSS PAD, archive) : pas de correction, leur niveau
   dépend du montage ou des sons chargés. La TD-3 est réglée sur son motif. */
var CALIBRAGE_DB = {
  ehx:-1.8, em:+3.8, er:-4.0, ea:+2.2, es:-1.4, mx:+1.4, sx:-1.6, mpc:-5.2,
  tr808:-2.9, tr909:-4.9, tr707:-3.7, rd6:-2.1, dmx:-2.9, dbi:-2.2, vlc:-4.9,
  cr:-1.2, t1k:-6.7, ko:-3.1, mc:-0.9, stk:-3.8, td3:+0.8
};
function calibrageVoie(id){
  var k = id === "tr" && typeof TR !== "undefined" && TR ? TR.m : id;
  return Math.pow(10, (CALIBRAGE_DB[k] || 0) / 20);
}

/* La voie d'une machine. Le contexte audio peut être remplacé — export hors
   ligne, relance après une coupure — alors on le retient : un nœud fabriqué
   dans un contexte mort ne se rebranche nulle part. */
var pasSet = 0;
/* Le moteur d'une voie. Il n'existe qu'une fois la machine construite : on ne
   peut pas faire jouer une machine qu'on n'a jamais ouverte, ses nœuds audio
   n'existent pas encore. preparerSet() s'en charge. */
function moteurSet(id){
  var T = {ehx:MACHINE_EHX, em:MACHINE_EM, er:MACHINE_ER, ea:MACHINE_EA,
           es:MACHINE_ES, mx:MACHINE_MX, sx:MACHINE_SX, mpc:MACHINE_MPC,
           tr:MACHINE_TR, dmx:MACHINE_DMX, vlc:MACHINE_VLC, cr:MACHINE_CR,
           dbi:MACHINE_DBI, t1k:MACHINE_T1K, arcm:MACHINE_ARCM,
           ko:MACHINE_KO,   stk:MACHINE_STK, mc:MACHINE_MC, kp:MACHINE_KP,
           td3:MACHINE_TD3, eur:MACHINE_EUR};
  return T[id] || null;
}
/* Chaque machine construit ses nœuds audio la première fois qu'on la joue.
   Dans un set, on ne passe pas par leur façade : il faut donc les réveiller
   une par une avant de lancer, sinon la première mesure est muette. */
function preparerSet(){
  audioInit();
  if(!ctx) return;
  var reveil = {em:function(){ busEffets(); }, er:function(){ busEffets(); },
                ea:function(){ busEffets(); }, es:function(){ busEffets(); },
                mx:function(){ mxAudio(); },   sx:function(){ sxAudio(); },
                td3:function(){ batirTd3(); }, t1k:function(){ if(typeof bâtirT1k === "function") bâtirT1k(); },
                eur:function(){ if(!EUR.bus) eurBatir(); }};
  SET_VOIES.forEach(function(v){
    if(!SET.actives[v[0]]) return;
    busSet(v[0]);
    try{ if(reveil[v[0]]) reveil[v[0]](); }catch(e){}
  });
  majToutesVoiesSet();
}
/* Une vraie tranche de console, dans l'ordre où le signal la traverse :
   entrée → gain d'entrée → grave → médium → aigu → fader → panoramique →
   mesure → mélange général.

   Le gain d'entrée n'est pas un doublon du fader : c'est lui qui règle le
   niveau AVANT l'égaliseur et la mesure. Trop bas, on pousse le fader et on
   monte le souffle ; trop haut, on sature avant même d'avoir touché au fader.
   C'est la première chose qu'on règle sur une console, et la raison pour
   laquelle les deux existent. */
function busSet(id){
  if(!ctx) return null;
  var b = SET.bus[id];
  if(b && b.ctx === ctx) return b.e;

  /* v124 : plus d'atténuation de charge ici. Posée sur la voie, elle touchait
     aussi les queues des sons déjà lancés (pompage) et restait basse après STOP.
     Elle vit maintenant sur les voix du pas : voir pasVoie. */
  var e = ctx.createGain();                         /* entrée et gain d'entrée */
  var lo = ctx.createBiquadFilter(); lo.type = "lowshelf";  lo.frequency.value = 180;
  var md = ctx.createBiquadFilter(); md.type = "peaking";   md.frequency.value = 1100; md.Q.value = 0.9;
  var hi = ctx.createBiquadFilter(); hi.type = "highshelf"; hi.frequency.value = 4200;
  var g = ctx.createGain();                         /* fader */
  var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  var an = ctx.createAnalyser(); an.fftSize = 256;

  e.connect(lo); lo.connect(md); md.connect(hi); hi.connect(g);
  if(p){ g.connect(p); p.connect(an); } else g.connect(an);
  an.connect(master);

  SET.bus[id] = {e:e, lo:lo, md:md, hi:hi, g:g, p:p, an:an, ctx:ctx,
                 tampon:new Uint8Array(an.frequencyBinCount), niveau:0};
  majVoieSet(id);
  return e;
}
function majVoieSet(id){
  var b = SET.bus[id];
  if(!b || b.ctx !== ctx) return;
  /* Le solo n'est pas un bouton de plus : c'est un coupe-son sur toutes les
     AUTRES voies. C'est ainsi qu'il marche sur une table, et c'est pour cela
     qu'on ne peut pas en avoir deux à la fois. */
  var passe = !SET.mute[id] && (!SET.solo || SET.solo === id);
  b.e.gain.value = SET.trim[id] * calibrageVoie(id);
  b.g.gain.value = passe ? SET.niv[id] : 0;
  if(b.p) b.p.pan.value = SET.pan[id];
  /* Les trois bandes vont de −26 à +6 dB, comme sur une table de mixage :
     on coupe franchement, on remonte avec mesure. */
  b.lo.gain.value = dbEq(SET.lo[id]);
  b.md.gain.value = dbEq(SET.md[id]);
  b.hi.gain.value = dbEq(SET.hi[id]);
}
/* Combien atténuer un pas qui porte n frappes.

   1/n garderait la crête rigoureusement constante — mais alors un pas chargé
   sonnerait AUSSI FORT qu'un pas à une seule frappe, ce qui est faux : un
   roulement complet est plus fort. 1/√n conserve la puissance, ce qui vaut pour
   des sources indépendantes, pas pour des attaques simultanées.

   L'exposant 0,75 tient entre les deux : la somme continue de monter avec le
   nombre de frappes — +1,5 dB à chaque doublement — mais plafonne juste sous le
   seuil du limiteur, qui n'a donc plus rien à rattraper. */
function attenuationPas(n){
  return n <= 1 ? 1 : Math.pow(n, -0.75);
}

/* Appelée par un ordonnanceur APRÈS avoir programmé ses voix. C'est possible
   parce que tout se programme à l'avance : au moment où l'on compte, le son
   n'a pas encore joué. Aucun pré-comptage n'est donc nécessaire, et les
   conditions les plus tordues — hasard, longueurs de piste séparées — sont
   traitées sans effort. */
/* v124 — l'atténuation porte sur les voix DU PAS, jamais sur la voie.

   Un ordonnanceur ouvre le pas (ouvrirPas), ses voix se branchent par
   pasVoie(dest) au lieu de dest, puis attenuerVoie règle d'un coup les gains
   créés pour CE pas. Conséquences :
   - une cymbale lancée au pas précédent garde son niveau : plus de pompage ;
   - une frappe à la main hors séquence ne passe par aucun gain de pas : elle
     sort toujours à plein niveau, même juste après un STOP ;
   - rien ne dépend de l'existence de la voie : le premier pas est traité
     comme les autres.
   Les noeuds de pas sont neufs, rien n'y passe encore : on peut poser la valeur
   directement, sans rampe ni risque de clic.

   Un ordonnanceur qui sort avant attenuerVoie laisse le pas ouvert : il est
   refermé à la fin de la tâche en cours, pour ne jamais capter une frappe
   manuelle arrivée ensuite. */
var PAS = null;
function ouvrirPas(){
  var p = PAS = {d:[], n:[]};
  Promise.resolve().then(function(){ if(PAS === p) PAS = null; });
  return 0;
}
function pasVoie(dest){
  if(!PAS || !dest || !ctx || dest.__pas) return dest;
  var i = PAS.d.indexOf(dest);
  if(i >= 0) return PAS.n[i];
  var g = ctx.createGain();
  g.__pas = true;
  g.connect(dest);
  PAS.d.push(dest); PAS.n.push(g);
  return g;
}
/* Appelée par un ordonnanceur APRÈS avoir programmé ses voix. id et t sont
   gardés pour la lisibilité des appels. */
function attenuerVoie(id, n, t){
  var p = PAS; PAS = null;
  if(!p) return;
  var a = attenuationPas(n);
  if(a >= 1) return;
  for(var i=0;i<p.n.length;i++) p.n[i].gain.value = a;
}

/* 0 → −26 dB, 0,5 → 0 dB, 1 → +6 dB */
function dbEq(v){ return v < 0.5 ? (v / 0.5 - 1) * 26 : (v - 0.5) / 0.5 * 6; }

/* Le niveau de chaque voie, lu pour les bargraphes. Une valeur de crête
   lissée à la descente : un indicateur qui retombe instantanément ne se lit
   pas, l'œil n'a pas le temps. */
function lireNiveauxSet(){
  SET_VOIES.forEach(function(v){
    var b = SET.bus[v[0]];
    if(!b || b.ctx !== ctx) return;
    b.an.getByteTimeDomainData(b.tampon);
    var pic = 0;
    for(var i=0;i<b.tampon.length;i++){
      var d = Math.abs(b.tampon[i] - 128) / 128;
      if(d > pic) pic = d;
    }
    b.niveau = pic > b.niveau ? pic : b.niveau * 0.82 + pic * 0.18;
  });
}
function majToutesVoiesSet(){ SET_VOIES.forEach(function(v){ majVoieSet(v[0]); }); }

/* ---------- quelle machine est affichée ----------
   Le CSS choisit l'unité visible d'après une classe posée sur <body>. Il ne
   doit donc y en avoir qu'une à la fois.

   Ces listes étaient recopiées à la main dans chacune des dix-sept fonctions
   d'activation, et celles écrites avant l'arrivée des dernières machines ne
   les effaçaient pas : en quittant l'Eurorack pour la TR-808, la classe "eur"
   restait, le rack continuait de s'afficher par-dessus alors que les commandes
   pilotaient la TR — d'où l'impression de retomber sur la machine précédente,
   et le son qui semble couper puisqu'on joue une autre machine que celle qu'on
   voit. On efface maintenant tout, depuis un seul endroit. */
var CLASSES_MACHINE = ["m32","em1","er1","ea1","es1","emx","esx","mk2","mpc","mpc2",
                       "tr8","tr9","tr7","rd6","td3","eur","dmx","vlc","cr5","dbi",
                       "t1k","arcm","ko","stk","mc","kp",
                       "c1","c2","c3","c4","c5","t1","t2","t3","t4"];
/* Les modes d'affichage — plein écran, vue d'ensemble — ne survivent pas à un
   changement de machine. Le mode d'ensemble était le seul qu'on pouvait
   quitter par le bouton MENU sans le refermer : la classe restait posée, la
   scène restait en rangées, et toutes les façades restaient visibles derrière
   celle qu'on venait de choisir.

   Un seul endroit remet tout à plat, appelé par poserMachine ET par
   l'ouverture du menu : toute vue ajoutée plus tard doit passer par ici. */
function remettreVueAPlat(){
  var d = document.body.classList;
  d.remove("plein");
  d.remove("ensemble");
  if(typeof ENS !== "undefined" && ENS){
    ENS.actif = false;
    var l = document.getElementById("scene");
    if(l) for(var i=0;i<l.children.length;i++) l.children[i].classList.remove("ens-cache");
  }
}
function poserMachine(){
  var d = document.body.classList, i;
  remettreVueAPlat();
  for(i=0;i<CLASSES_MACHINE.length;i++) d.remove(CLASSES_MACHINE[i]);
  for(i=0;i<arguments.length;i++) if(arguments[i]) d.add(arguments[i]);
  /* le rack garde des oscillateurs en marche : on ferme son bus dès qu'on
     regarde ailleurs, et on le rouvre en y revenant */
  if(typeof EUR !== "undefined" && EUR && EUR.bus)
    EUR.bus.gain.value = d.contains("eur") ? 1 : 0;
}

/* ---------- oublier un nœud, c'est d'abord le débrancher ----------
   Chaque machine garde ses bus dans un objet (TR.bus, DBI.noeuds, TD3.noeuds…)
   qu'elle remettait à zéro à chaque activation avant d'en reconstruire un neuf.
   Les anciens restaient branchés sur master : muets, mais toujours calculés —
   des saturations suréchantillonnées, un convolveur pour la volca, un
   oscillateur qui tourne pour la TD-3 — et il s'en ajoutait un jeu complet à
   chaque passage par le menu. Sur un téléphone, au bout d'une vingtaine de
   changements de machine, le moteur audio n'a plus le temps et décroche.
   On descend dans l'objet, on débranche chaque nœud et on arrête chaque source. */
function debrancherTout(x, prof){
  prof = prof || 0;
  if(!x || prof > 3) return;
  if(typeof x.disconnect === "function" && typeof x.connect === "function"){
    try{ x.disconnect(); }catch(e){}
    if(typeof x.stop === "function"){ try{ x.stop(); }catch(e){} }
    return;
  }
  var t = Object.prototype.toString.call(x);
  if(t === "[object Array]"){
    for(var i=0;i<x.length;i++) debrancherTout(x[i], prof + 1);
  } else if(t === "[object Object]"){
    for(var k in x) if(Object.prototype.hasOwnProperty.call(x, k)) debrancherTout(x[k], prof + 1);
  }
}

