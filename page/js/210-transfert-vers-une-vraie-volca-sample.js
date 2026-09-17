/* ================= transfert vers une vraie volca sample =================
   La volca ne reçoit pas de fichiers : elle reçoit du SON par sa prise SYNC IN.
   Le format, le Syro, est du C fourni par Korg, compilé ici en WebAssembly.
   Le module n'est chargé qu'au premier transfert — c'est un demi-mégaoctet qui
   n'a rien à faire au démarrage — et s'il est absent, on le dit au lieu de
   planter : la compilation WebAssembly peut échouer sans casser l'application. */
var SYRO = {mod:null, chargement:null, dispo:null};

function syroCharger(){
  if(SYRO.mod) return Promise.resolve(SYRO.mod);
  if(SYRO.chargement) return SYRO.chargement;
  SYRO.chargement = new Promise(function(ok, non){
    var sc = document.createElement("script");
    sc.src = "syro/syro.js";
    sc.onload = function(){
      if(typeof SyroModule !== "function"){ non(new Error("module introuvable")); return; }
      SyroModule().then(function(m){
        /* Un module qui se charge mais à qui il manque une fonction est pire
           qu'un module absent : on s'en aperçoit au milieu d'un transfert.
           On vérifie tout de suite. */
        var manque = [];
        if(typeof m.ccall !== "function") manque.push("ccall");
        if(typeof m.setValue !== "function") manque.push("setValue");
        if(typeof m.getValue !== "function") manque.push("getValue");
        if(!m.HEAPU8 || !m.HEAP16) manque.push("mémoire");
        if(typeof m._malloc !== "function") manque.push("malloc");
        if(manque.length){ non(new Error("module incomplet : " + manque.join(", "))); return; }
        SYRO.mod = m; SYRO.dispo = true; ok(m);
      }, non);
    };
    sc.onerror = function(){ SYRO.dispo = false; non(new Error("syro.js absent")); };
    document.head.appendChild(sc);
  });
  return SYRO.chargement;
}

/* Un tampon audio de l'application vers du PCM 16 bits mono, ce qu'attend la
   volca. On mélange les canaux et on applique le gain demandé, en écrêtant
   proprement : c'est là que se joue la reprise de niveau. */
function syroPcm(buf, gain){
  var n = buf.length, src = buf.getChannelData(0);
  var src2 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  var pcm = new Int16Array(n);
  var pic = 0, i, v;
  for(i=0;i<n;i++){
    v = src2 ? (src[i] + src2[i]) * 0.5 : src[i];
    if(Math.abs(v) > pic) pic = Math.abs(v);
  }
  /* gain 0..1 du potard : 0,5 laisse tel quel, 1 normalise à -0,2 dB */
  var k = 1;
  if(pic > 0.000001){
    var vise = Math.pow(10, -0.2 / 20);
    k = 1 + (vise / pic - 1) * Math.max(0, Math.min(1, (gain - 0.5) * 2));
    if(gain < 0.5) k = 0.2 + gain * 1.6;
  }
  for(i=0;i<n;i++){
    v = (src2 ? (src[i] + src2[i]) * 0.5 : src[i]) * k;
    if(v > 1) v = 1; else if(v < -1) v = -1;
    pcm[i] = Math.round(v * 32767);
  }
  return pcm;
}

/* Fabrique le flux de transfert. La structure doit correspondre EXACTEMENT à
   VGData dans syro_wrap.c : six entiers de quatre octets puis un pointeur. */
var SYRO_TAILLE = 28;
function syroRendre(m, pcm, fs, slot, compresse){
  var octets = pcm.length * 2;
  var pData = m._malloc(octets);
  m.HEAPU8.set(new Uint8Array(pcm.buffer, pcm.byteOffset, octets), pData);

  var it = m._malloc(SYRO_TAILLE);
  m.setValue(it +  0, 0,          "i32");   /* type : échantillon        */
  m.setValue(it +  4, slot,       "i32");   /* emplacement 0..99         */
  m.setValue(it +  8, 16,         "i32");   /* qualité                   */
  m.setValue(it + 12, compresse ? 1 : 0, "i32");
  m.setValue(it + 16, fs,         "i32");   /* fréquence                 */
  m.setValue(it + 20, octets,     "i32");   /* taille en octets          */
  m.setValue(it + 24, pData,      "i32");   /* pointeur vers le PCM      */

  var pOut = m._malloc(4), pTrames = m._malloc(4);
  var r = m.ccall("volcagain_render", "number",
                  ["number","number","number","number"], [it, 1, pOut, pTrames]);
  var res = null;
  if(r === 0){
    var adr = m.getValue(pOut, "i32"), trames = m.getValue(pTrames, "i32");
    /* on copie AVANT de libérer : la mémoire du module est réutilisée aussitôt */
    var brut = new Int16Array(m.HEAP16.buffer, adr, trames * 2).slice();
    m.ccall("volcagain_free", null, ["number"], [adr]);
    res = {data:brut, trames:trames};
  }
  m._free(pOut); m._free(pTrames); m._free(it); m._free(pData);
  if(!res) throw new Error("le Syro a refusé (code " + r + ")");
  return res;
}

/* Joue le flux à plein niveau et sans le moindre traitement : la volca écoute
   un signal codé, tout égaliseur ou compresseur le rendrait illisible. On
   court-circuite donc entièrement le mélange général. */
function syroJouer(res, fs){
  var b = ctx.createBuffer(2, res.trames, fs);
  var g = b.getChannelData(0), d = b.getChannelData(1);
  for(var i=0;i<res.trames;i++){
    g[i] = res.data[i*2] / 32768;
    d[i] = res.data[i*2+1] / 32768;
  }
  var src = ctx.createBufferSource();
  src.buffer = b;
  src.connect(ctx.destination);        /* pas par master : aucun traitement */
  src.start();
  return {src:src, duree:res.trames / fs};
}

/* ---------- un seul panneau plein écran à la fois ----------
   Ils sont sept maintenant, tous en position fixe et au même plan. Deux
   ouverts en même temps se superposent, et refermer l'un enlevait la classe
   « note-ouverte » alors que l'autre était encore là : les boutons du haut
   réapparaissaient par-dessus. On passe donc par ces trois fonctions. */
var PANNEAUX = ["note", "bib", "pr", "enr", "table", "studio", "nexus", "syro"];
function panneauVisible(){
  for(var i=0;i<PANNEAUX.length;i++){
    var e = document.getElementById(PANNEAUX[i]);
    if(e && e.classList.contains("show")) return PANNEAUX[i];
  }
  return "";
}
function fermerAutresPanneaux(sauf){
  PANNEAUX.forEach(function(id){
    if(id === sauf) return;
    var e = document.getElementById(id);
    if(e) e.classList.remove("show");
  });
}
/* La classe du corps suit l'état réel, au lieu d'être posée et retirée à
   l'aveugle par chaque panneau. */
function majNoteOuverte(){
  document.body.classList.toggle("note-ouverte", !!panneauVisible());
}

/* ---------- les deux projets invités ----------
   Chacun vit dans son propre document, chargé à la PREMIÈRE ouverture
   seulement : ce sont un demi-mégaoctet et cinq mégaoctets d'échantillons,
   il n'y a aucune raison de les lire au démarrage de l'application.

   Deux moteurs audio qui jouent en même temps se disputeraient la sortie et
   feraient décrocher les deux : on arrête donc celui d'ici avant d'ouvrir. */
/* Les deux projets invités sont des fichiers SÉPARÉS, posés à côté du nôtre
   dans l'application. Le fichier drm16.html ouvert seul — depuis les
   téléchargements, sur un ordinateur, n'importe où hors de l'application — est
   autonome mais n'a personne à côté de lui : le cadre afficherait une page
   d'erreur, ce qui ne dit rien à personne. On le dit clairement à la place. */
function invitesDisponibles(){
  /* Trois cas où ils sont là : l'application Android, l'exécutable de bureau
     (qui sert ses fichiers par son propre protocole), et un vrai serveur.
     Un fichier ouvert seul — file:// ou content:// — n'a personne à côté. */
  if(location.href.indexOf("android_asset") >= 0) return true;
  var p = location.protocol;
  return p === "http:" || p === "https:" || p === "tauri:";
}
function ouvrirInvite(nom, source){
  var panneau = document.getElementById(nom), cadre = document.getElementById(nom + "-cadre");
  var mot = document.getElementById(nom + "-absent");
  if(!invitesDisponibles()){
    if(mot) mot.style.display = "block";
    cadre.style.display = "none";
    fermerAutresPanneaux(nom);
    panneau.classList.add("show");
    majNoteOuverte();
    return;
  }
  if(mot) mot.style.display = "none";
  cadre.style.display = "block";
  stop();
  if(!cadre.getAttribute("src")) cadre.setAttribute("src", source);
  fermerAutresPanneaux(nom);
  panneau.classList.add("show");
  majNoteOuverte();
  if(nom === "nexus") setTimeout(ajusterNexus, 60);
}
/* On refait ici le travail que le navigateur fait pour une page entière quand
   elle déclare une largeur de fenêtre : dessiner à 1180 px, puis réduire. */
function ajusterNexus(){
  var boite = document.getElementById("nexus-boite"), cadre = document.getElementById("nexus-cadre");
  if(!boite || !cadre) return;
  var L = 1180, dispo = boite.clientWidth, h = boite.clientHeight;
  if(!dispo || !h) return;
  var e = dispo / L;
  cadre.style.width  = L + "px";
  /* la hauteur en pixels de cadre qu'il faut pour remplir la boîte une fois réduite */
  cadre.style.height = Math.round(h / e) + "px";
  cadre.style.transform = "scale(" + e.toFixed(4) + ")";
}
window.addEventListener("resize", function(){
  if(document.getElementById("nexus").classList.contains("show")) ajusterNexus();
});
function fermerInvite(nom){
  var panneau = document.getElementById(nom), cadre = document.getElementById(nom + "-cadre");
  panneau.classList.remove("show");
  majNoteOuverte();
  if(!invitesDisponibles()) return;
  /* On coupe le son de l'invité en le rechargeant : sans cela il continuerait
     de jouer derrière, et on chercherait longtemps d'où vient ce rythme. */
  try{ cadre.contentWindow.location.reload(); }catch(e){ cadre.removeAttribute("src"); }
  reveillerAudio();
}
/* ---------- voir plusieurs machines à la fois ----------
   Les façades sont filles directes du corps, sans conteneur : on les regroupe
   une fois pour toutes dans #scene, ce qui donne une boîte à ranger en
   rangées. Déplacer des nœuds ne perd aucun écouteur, et aucun sélecteur du
   fichier n'utilise « enfant direct du corps » — vérifié avant de le faire. */
var ENS = {actif:false, retour:""};
(function faireScene(){
  var sc = document.createElement("div");
  sc.id = "scene";
  var prem = document.getElementById("unit");
  if(!prem || !prem.parentNode) return;
  prem.parentNode.insertBefore(sc, prem);
  var l = document.querySelectorAll('[id^="unit"]');
  for(var i=0;i<l.length;i++) sc.appendChild(l[i]);
})();

function unitesEns(){ 
  var sc = document.getElementById("scene");
  return sc ? sc.children : [];
}
/* Quelle façade appartient à quelle voie : l'inverse de allerVoie. */
function uniteDeVoie(id){
  var T = {ehx:"unit",      em:"unit-em1",  er:"unit-er1",  ea:"unit-ea1",
           es:"unit-es1",    mx:"unit-emx",  sx:"unit-esx",  mpc:"unit-mpc",
           tr:"unit-tr808",  dmx:"unit-dmx", vlc:"unit-vlc", cr:"unit-cr5",
           dbi:"unit-dbi",   t1k:"unit-t1k", arcm:"unit-arcm", ko:"unit-ko",
           stk:"unit-stk",   mc:"unit-mc",   kp:"unit-kp",
           td3:"unit-td3",   eur:"unit-eur"};
  return T[id] ? document.getElementById(T[id]) : null;
}
function ouvrirEnsemble(){
  var choisies = SET_VOIES.filter(function(v){ return SET.actives[v[0]]; });
  if(!choisies.length){ signal("CHOISISSEZ D'ABORD DES MACHINES"); return; }
  preparerSet();
  ENS.retour = S.modele;
  fermerTable();
  /* Sans classe de machine sur le corps, plus rien n'est caché : on repart de
     là et on masque nommément ce qu'on ne veut pas voir. */
  poserMachine();
  var garder = {};
  choisies.forEach(function(v){
    var u = uniteDeVoie(v[0]);
    if(u) garder[u.id] = 1;
  });
  var l = unitesEns();
  for(var i=0;i<l.length;i++) l[i].classList.toggle("ens-cache", !garder[l[i].id]);
  ENS.actif = true;
  document.body.classList.add("ensemble");
  signal(choisies.length + " MACHINES À L'ÉCRAN");
}
function fermerEnsemble(){
  if(!ENS.actif) return;
  remettreVueAPlat();
  try{ allerMachine(ENS.retour || "16"); }catch(e){}
  ouvrirTable();
}
document.getElementById("ens-sortir").addEventListener("click", function(){ fermerEnsemble(); H.cran(); });

/* ---------- la table de mixage ---------- */
function construireTable(){
  var c = document.getElementById("table-voies");
  if(c.childNodes.length) return;
  SET_VOIES.forEach(function(v){
    var id = v[0];
    var d = document.createElement("div");
    d.className = "voie"; d.dataset.v = id;
    /* L'ordre de haut en bas suit celui du signal : c'est ce qui rend une
       console lisible sans mode d'emploi. */
    d.innerHTML = "<b>" + v[1] + "</b>" +
      '<div class="btns"><button data-a="on">JOUER</button></div>' +
      '<label>GAIN</label><input type="range" min="0" max="2" step="0.02" data-a="trim">' +
      '<div class="eq">' +
        '<label>AIGU</label><input type="range" min="0" max="1" step="0.01" data-a="hi">' +
        '<label>MÉDIUM</label><input type="range" min="0" max="1" step="0.01" data-a="md">' +
        '<label>GRAVE</label><input type="range" min="0" max="1" step="0.01" data-a="lo">' +
      '</div>' +
      '<label>PANORAMIQUE</label><input type="range" min="-1" max="1" step="0.02" data-a="pan">' +
      '<div class="bas"><div class="mes"><i data-m="1"></i></div>' +
        '<div class="fad"><input type="range" min="0" max="1" step="0.01" data-a="niv"></div></div>' +
      '<div class="btns"><button data-a="mute" class="coupe">COUPE</button>' +
      '<button data-a="solo">SOLO</button></div>' +
      '<button data-a="voir" class="ouvrir">OUVRIR</button>';
    c.appendChild(d);
    d.addEventListener("click", function(e){
      var b = e.target.closest("button"); if(!b) return;
      var a = b.dataset.a;
      if(a === "on"){
        SET.actives[id] = !SET.actives[id];
        if(SET.actives[id] && S.run) preparerSet();
      }
      else if(a === "mute"){ SET.mute[id] = !SET.mute[id]; }
      else if(a === "solo"){ SET.solo = (SET.solo === id) ? "" : id; }
      else if(a === "voir"){ fermerTable(); allerVoie(id); return; }
      majToutesVoiesSet(); majTable(); memSet(); H.cran();
    });
    ["niv","pan","trim","lo","md","hi"].forEach(function(q){
      var r = d.querySelector('input[data-a="' + q + '"]');
      r.addEventListener("input", function(){
        SET[q][id] = parseFloat(r.value);
        majVoieSet(id); memSet();
      });
    });
  });
}
/* Ouvrir la façade d'une voie : on retrouve la machine du menu qui lui
   correspond, puisqu'une voie peut en servir plusieurs. */
function allerVoie(id){
  var T = {ehx:"16", em:"em1", er:"er1", ea:"ea1", es:"es1", mx:"emx", sx:"esx",
           mpc:"mpc3000", tr:"tr808", dmx:"dmx", vlc:"vlc", cr:"cr5", dbi:"dbi",
           t1k:"t1k", arcm:"arcm", ko:"ko", stk:"stk", mc:"mc", kp:"kp", td3:"td3", eur:"eur"};
  if(!T[id]) return;
  /* La table s'ouvre DEPUIS le menu, qui reste derrière : sans cette fermeture
     on refermait la table et on retombait sur le menu au lieu de la façade.
     allerMachine n'a jamais fermé le menu, c'est la tuile qui s'en chargeait. */
  document.body.classList.remove("menu-ouvert");
  menu.classList.add("hide");
  allerMachine(T[id]);
}
function majTable(){
  construireTable();
  var n = 0;
  SET_VOIES.forEach(function(v){
    var id = v[0];
    var d = document.querySelector('.voie[data-v="' + id + '"]');
    if(!d) return;
    if(SET.actives[id]) n++;
    d.classList.toggle("jouee", !!SET.actives[id]);
    d.querySelector('[data-a="on"]').classList.toggle("on", !!SET.actives[id]);
    d.querySelector('[data-a="mute"]').classList.toggle("on", !!SET.mute[id]);
    d.querySelector('[data-a="solo"]').classList.toggle("on", SET.solo === id);
    ["niv","pan","trim","lo","md","hi"].forEach(function(q){
      var r = d.querySelector('[data-a="' + q + '"]');
      if(r) r.value = SET[q][id];
    });
  });
  document.getElementById("table-on").classList.toggle("on", SET.on);
  document.getElementById("table-on").textContent = SET.on ? "SET : EN MARCHE" : "SET : ARRÊT";
  document.getElementById("table-play").classList.toggle("on", S.run);
  document.getElementById("table-etat").textContent = n
    ? (n + " MACHINE" + (n > 1 ? "S" : "") + " DANS LE SET" +
       (SET.solo ? " · SOLO SUR UNE VOIE" : ""))
    : "AUCUNE MACHINE CHOISIE";
}
/* Appelée une fois SET déclaré, avec ce que charger() a mis de côté. */
function appliquerMemSet(){
  var m = memoire.set;
  if(!m) return;
  SET.on = !!m.on;
  SET.solo = m.solo || "";
  ["actives","niv","pan","mute","trim","lo","md","hi"].forEach(function(q){
    if(!m[q]) return;
    SET_VOIES.forEach(function(v){
      if(m[q][v[0]] !== undefined) SET[q][v[0]] = m[q][v[0]];
    });
  });
}
appliquerMemSet();
/* Les bargraphes, tant que la table est ouverte. On ne redessine que la
   hauteur : toucher au DOM plus que nécessaire ferait ramer la page. */
function boucleTable(){
  var p = document.getElementById("table");
  if(!p || !p.classList.contains("show")){ SET.anim = null; return; }
  lireNiveauxSet();
  SET_VOIES.forEach(function(v){
    var b = SET.bus[v[0]];
    var e = document.querySelector('.voie[data-v="' + v[0] + '"] .mes i');
    if(!e) return;
    var n = (b && b.ctx === ctx) ? b.niveau : 0;
    e.style.height = Math.round(Math.min(1, n) * 100) + "%";
  });
  SET.anim = requestAnimationFrame(boucleTable);
}
function memSet(){
  memoire.set = {on:SET.on, actives:SET.actives, niv:SET.niv, pan:SET.pan,
                 mute:SET.mute, solo:SET.solo,
                 trim:SET.trim, lo:SET.lo, md:SET.md, hi:SET.hi};
  saveSoon();
}
function ouvrirTable(){
  audioInit();
  majTable();
  fermerAutresPanneaux("table");
  document.getElementById("table").classList.add("show");
  majNoteOuverte();
  if(!SET.anim) SET.anim = requestAnimationFrame(boucleTable);
}
function fermerTable(){
  document.getElementById("table").classList.remove("show");
  majNoteOuverte();
}
/* ---------- le panneau de transfert ---------- */
function syroEtat(t){ var e = document.getElementById("syro-etat"); if(e) e.textContent = t; }
function ouvrirSyro(){
  audioInit(); banqueEs(); chargerEchs();
  var sel = document.getElementById("syro-son");
  sel.innerHTML = "";
  var l = [];
  for(var k in ES.buf) if(ES.buf[k]) l.push(k);
  l.sort();
  l.forEach(function(id){
    var o = document.createElement("option");
    o.value = id; o.textContent = nomEch(id) + "  (" + id + ")";
    sel.appendChild(o);
  });
  fermerAutresPanneaux("syro");
  document.getElementById("syro").classList.add("show");
  majNoteOuverte();
  /* On tente le chargement tout de suite : mieux vaut annoncer l'absence
     maintenant que devant un bouton qui ne répond pas. */
  syroCharger().then(function(){
    document.getElementById("syro-absent").style.display = "none";
    document.getElementById("syro-outils").style.display = "block";
  }, function(e){
    var mot = document.getElementById("syro-absent");
    mot.textContent = "Le transfert n'est pas disponible dans cette version : " +
      (e && e.message ? e.message : "module absent") +
      ". Tout le reste fonctionne normalement.";
    mot.style.display = "block";
    document.getElementById("syro-outils").style.display = "none";
  });
}
function fermerSyro(){
  document.getElementById("syro").classList.remove("show");
  majNoteOuverte();
}
document.getElementById("syro-fermer").addEventListener("click", function(){ fermerSyro(); H.cran(); });
document.getElementById("syro-aide").addEventListener("click", function(){ ouvrirNotice("note-outils"); });
document.getElementById("syro-compresse").addEventListener("click", function(){
  this.classList.toggle("on");
  this.textContent = this.classList.contains("on") ? "COMPRESSÉ : OUI" : "COMPRESSÉ : NON";
  H.cran();
});
document.getElementById("syro-gain").addEventListener("input", function(){
  var v = parseFloat(this.value);
  document.getElementById("syro-gain-txt").textContent =
    v > 0.98 ? "remonté au maximum" :
    v > 0.52 ? "remonté en partie" :
    v > 0.48 ? "tel quel" : "baissé";
});
document.getElementById("syro-envoyer").addEventListener("click", function(){
  var b = this;
  if(b.disabled) return;
  var id = document.getElementById("syro-son").value;
  var buf = ES.buf[id];
  if(!buf){ syroEtat("Ce son n'est pas chargé."); return; }
  var slot = Math.max(0, Math.min(99, parseInt(document.getElementById("syro-slot").value, 10) || 0));
  var gain = parseFloat(document.getElementById("syro-gain").value);
  var comp = document.getElementById("syro-compresse").classList.contains("on");
  b.disabled = true;
  syroEtat("Préparation du son…");
  syroCharger().then(function(m){
    var pcm = syroPcm(buf, gain);
    syroEtat("Codage du transfert… cela peut prendre quelques secondes.");
    /* On laisse l'écran se rafraîchir avant de bloquer : le codage se fait
       d'un bloc et fige l'affichage le temps qu'il dure. */
    setTimeout(function(){
      try{
        var res = syroRendre(m, pcm, Math.round(buf.sampleRate), slot, comp);
        var j = syroJouer(res, ctx.sampleRate);
        var fin = Math.ceil(j.duree);
        syroEtat("Transfert en cours vers l'emplacement " + slot + " · " + fin +
                 " secondes. Ne touchez plus à rien.");
        setTimeout(function(){
          syroEtat("Terminé. La volca redémarre, le son est dans l'emplacement " + slot + ".");
          b.disabled = false;
        }, j.duree * 1000 + 800);
      }catch(e){
        syroEtat("Échec : " + e.message);
        b.disabled = false;
      }
    }, 60);
  }, function(){
    syroEtat("Le module Syro n'est pas disponible dans cette version.");
    b.disabled = false;
  });
  H.inter();
});

document.getElementById("menu-syro").addEventListener("click", function(){ ouvrirSyro(); H.inter(); });
document.getElementById("menu-table").addEventListener("click", function(){ ouvrirTable(); H.inter(); });
document.getElementById("table-fermer").addEventListener("click", function(){ fermerTable(); H.cran(); });
document.getElementById("table-aide").addEventListener("click", function(){
  fermerTable(); ouvrirNotice("note-table");
});
document.getElementById("table-on").addEventListener("click", function(){
  SET.on = !SET.on;
  if(SET.on) preparerSet();
  majTable(); memSet(); H.inter();
  signal(SET.on ? "SET EN MARCHE · LES MACHINES CHOISIES JOUENT ENSEMBLE"
                : "SET ARRÊTÉ · SEULE LA MACHINE AFFICHÉE JOUE");
});
document.getElementById("table-play").addEventListener("click", function(){
  if(S.run) stop(); else start();
  majTable(); H.start();
});
document.getElementById("table-ensemble").addEventListener("click", function(){
  ouvrirEnsemble(); H.inter();
});
document.getElementById("table-rien").addEventListener("click", function(){
  SET_VOIES.forEach(function(v){ SET.actives[v[0]] = false; });
  SET.solo = "";
  majToutesVoiesSet(); majTable(); memSet(); H.inter();
});

document.getElementById("menu-studio").addEventListener("click", function(){
  ouvrirInvite("studio", "studio/index.html"); H.inter();
});
document.getElementById("menu-nexus").addEventListener("click", function(){
  ouvrirInvite("nexus", "nexus/index.html"); H.inter();
});
document.getElementById("studio-fermer").addEventListener("click", function(){ fermerInvite("studio"); H.cran(); });
document.getElementById("nexus-fermer").addEventListener("click", function(){ fermerInvite("nexus"); H.cran(); });

document.getElementById("menu-notices").addEventListener("click", function(){ ouvrirNotice("note-general"); H.inter(); });
/* Le relevé était au fond de l'onglet GÉNÉRAL de la notice : personne ne l'y
   trouve. Ici il est à portée, et un second appui relance le moteur. */
document.getElementById("menu-audio").addEventListener("click", function(){
  audioInit();
  signal(releveAudio());
  H.inter();
  var b = this;
  if(b.dataset.arme === "1"){
    b.dataset.arme = "";
    refaireAudio();
    return;
  }
  b.dataset.arme = "1";
  b.querySelector("span").textContent = "APPUYEZ ENCORE POUR RELANCER LE MOTEUR";
  clearTimeout(b.tmr);
  b.tmr = setTimeout(function(){
    b.dataset.arme = "";
    b.querySelector("span").textContent = "DÉCROCHAGES · SOURCES · RELANCER LE MOTEUR";
  }, 4000);
});
document.getElementById("enr-ondes").addEventListener("click", function(){ ondesEnr(); H.inter(); });
document.getElementById("enr-aide").addEventListener("click", function(){
  fermerEnr(); ouvrirNotice("note-enr");
});
document.getElementById("enr-fermer").addEventListener("click", function(){ fermerEnr(); H.cran(); });
document.getElementById("pr-fermer").addEventListener("click", function(){ fermerPr(); H.cran(); });
document.getElementById("bib-fermer").addEventListener("click", function(){ fermerBib(); H.cran(); });
document.getElementById("menu-bib").addEventListener("click", function(){
  document.body.classList.remove("menu-ouvert");
  menu.classList.add("hide");
  allerMachine(memoire.modele || "es1");
  ouvrirBib();
  H.inter();
});
(function navBib(){
  var bs = document.querySelectorAll("#bib-nav button");
  for(var i=0;i<bs.length;i++){
    (function(n){ bs[n].addEventListener("click", function(){ BIB.onglet = n; majBibUI(); H.cran(); }); })(i);
  }
})();
document.getElementById("bib-fichier").addEventListener("change", function(){
  var f = this.files && this.files[0];
  this.value = "";
  if(f) importerSonFichier(f);
});
/* Un fichier son choisi ou déposé (v146 : aussi par glisser-déposer) */
function importerSonFichier(f){
  if(f.size > 40*1024*1024){ signal("FICHIER TROP GROS · 40 Mo AU PLUS"); return; }
  audioInit(); banqueEs();
  f.arrayBuffer().then(function(ab){
    return new Promise(function(res,rej){
      var decode = ctx.decodeAudioData(ab,res,rej);
      if(decode && decode.catch) decode.catch(rej);
    });
  }).then(function(buf){
    var court = reduireEch(buf, 32000, 8);
    var r = traiterSon(court, BIB.preset || "punch", 0);
    court = r.buffer;
    var id = "u" + Date.now().toString(36);
    ES.buf[id] = court; ES.noms[id] = "fichier";
    BIB.noms[id] = f.name.replace(/\.[^.]+$/, "").slice(0, 28);
    bibEcrire();
    var garde = sauverEch(id, court); majBibUI();
    signal(garde ? "IMPORTÉ : " + BIB.noms[id]
                 : "IMPORTÉ POUR CETTE SESSION · ÉCHEC D'ÉCRITURE");
  }).catch(function(){ signal("FICHIER ILLISIBLE"); });
}
document.getElementById("menu-pr").addEventListener("click", function(){
  document.body.classList.remove("menu-ouvert");
  menu.classList.add("hide");
  allerMachine(memoire.modele || "em1");
  ouvrirPr();
  H.inter();
});
(function machinePr(){
  var NOMS = [["16","DRM16"],["32","DRM32"],["em1","Electribe EM-1"],["er1","Electribe ER-1"],
    ["er2","ER-1 mkII"],["ea1","Electribe EA-1"],["ea2","EA-1 mkII"],["es1","Electribe ES-1"],
    ["es2","ES-1 mkII"],["emx","Electribe EMX-1"],["esx","Electribe ESX-1"],["mpc3000","Akai MPC3000"],["mpc2000","Akai MPC2000"],["tr808","Roland TR-808"],["tr909","Roland TR-909"],["tr707","Roland TR-707"],["dmx","Oberheim DMX"],["vlc","Korg volca sample"],["cr5","Roland CR-5000"],["dbi","DrumBrute Impact"],["t1k","Roland TR-1000"],["arcm","Machine d'archive"],["rd6","Behringer RD-6"],["td3","Behringer TD-3"],["eur","Eurorack"]];
  var sel = document.getElementById("pr-machine");
  NOMS.forEach(function(m){
    var o = document.createElement("option");
    o.value = m[0]; o.textContent = "Son et motif : " + m[1];
    sel.appendChild(o);
  });
  sel.addEventListener("change", function(){
    allerMachine(this.value);
    prPistes(); prDessiner(); majPrUI();
  });
  PR.selMachine = sel;
})();
document.getElementById("pr-prise").addEventListener("change", function(){
  prArreter(); prExtraire(+this.value); prDessiner(); majPrUI();
});
document.getElementById("pr-jouer").addEventListener("click", function(){
  if(PR.lecture) prArreter(); else prJouer();
});
document.getElementById("pr-grille").addEventListener("click", function(){
  var v = [4,2,3,0];
  PR.grille = v[(v.indexOf(PR.grille) + 1) % v.length];
  majPrUI(); H.cran();
});
document.getElementById("pr-zmoins").addEventListener("click", function(){
  PR.zoom = Math.max(0.02, PR.zoom/1.5); prDessiner(); H.cran();
});
document.getElementById("pr-zplus").addEventListener("click", function(){
  PR.zoom = Math.min(1.2, PR.zoom*1.5); prDessiner(); H.cran();
});
(function outilsPr(){
  var bs = document.querySelectorAll("#pr-outils button");
  for(var i=0;i<bs.length;i++){
    (function(b){ b.addEventListener("click", function(){ prAgir(b.dataset.pr); }); })(bs[i]);
  }
})();
document.getElementById("pr-garder").addEventListener("click", function(){ prGarder(); });
document.getElementById("pr-motif").addEventListener("click", function(){ prVersMotif(); });
document.getElementById("pr-mid").addEventListener("click", function(){
  if(PR.prise < 0){ signal("AUCUNE PRISE CHOISIE"); return; }
  prGarder(); enrExporter(PR.prise);
});
document.getElementById("enr-rec").addEventListener("click", function(){
  if(ENR.actif) enrArreter(); else enrDemarrer();
});
(function menuEnregistreur(){
  var NOMS = [["16","DRM16"],["32","DRM32"],["em1","Electribe EM-1"],["er1","Electribe ER-1"],
    ["er2","ER-1 mkII"],["ea1","Electribe EA-1"],["ea2","EA-1 mkII"],["es1","Electribe ES-1"],
    ["es2","ES-1 mkII"],["emx","Electribe EMX-1"],["esx","Electribe ESX-1"],["mpc3000","Akai MPC3000"],["mpc2000","Akai MPC2000"],["tr808","Roland TR-808"],["tr909","Roland TR-909"],["tr707","Roland TR-707"],["dmx","Oberheim DMX"],["vlc","Korg volca sample"],["cr5","Roland CR-5000"],["dbi","DrumBrute Impact"],["t1k","Roland TR-1000"],["arcm","Machine d'archive"],["rd6","Behringer RD-6"],["td3","Behringer TD-3"],["eur","Eurorack"]];
  MACHINES_ENR = NOMS;
  var sel = document.getElementById("enr-machine");
  NOMS.forEach(function(m){
    var o = document.createElement("option");
    o.value = m[0]; o.textContent = m[1];
    sel.appendChild(o);
  });
  sel.addEventListener("change", function(){ allerMachine(this.value); majEnrUI(); });
  document.getElementById("menu-enr").addEventListener("click", function(){
    document.body.classList.remove("menu-ouvert");
    menu.classList.add("hide");
    var m = memoire.modele || "em1";
    allerMachine(m);
    sel.value = m;
    enrCharger();
    ouvrirEnr();
    H.inter();
  });
})();

var bMetro = document.getElementById("b-metro");
function labelMetro(){ bMetro.textContent = "MÉTRONOME : " + (METRO ? "ACTIVÉ" : "COUPÉ"); }
bMetro.addEventListener("click", function(){
  METRO = !METRO; labelMetro(); memoire.metro = METRO; save(); H.cran();
});
if(memoire.metro) METRO = true;
labelMetro();

var bHaptic = document.getElementById("b-haptic");
function labelHaptic(){
  bHaptic.textContent = "RETOUR HAPTIQUE : " + (S.haptic ? "ACTIVÉ" : "DÉSACTIVÉ");
}
if(VIB){
  bHaptic.addEventListener("click", function(){
    S.haptic = !S.haptic;
    labelHaptic(); save();
    if(S.haptic) H.inter();
  });
  labelHaptic();
} else {
  bHaptic.textContent = "RETOUR HAPTIQUE INDISPONIBLE";
  bHaptic.disabled = true;
}

var bBg = document.getElementById("b-bg");
function labelBg(){
  bBg.textContent = "LECTURE EN ARRIÈRE-PLAN : " + (S.bg ? "ACTIVÉE" : "DÉSACTIVÉE");
}
bBg.addEventListener("click", function(){
  S.bg = !S.bg;
  labelBg(); save(); H.cran();
});
labelBg();

var note = document.getElementById("note");
document.getElementById("b-modele").addEventListener("click", function(){
  fermerNotice();
  ouvrirMenu();
});
document.querySelector(".model").addEventListener("click", function(){ ouvrirNotice(); });

document.addEventListener("visibilitychange", function(){
  cache = document.hidden;
  AUDIT.tDernier = 0;        /* le passage d'un état à l'autre n'est pas un trou */
  if(cache){
    writeMem();
    if(!S.bg){ stop(); return; }
  } else {
    queue = [];
    reveillerAudio();
  }
  if(S.run){
    clearInterval(timer);
    timer = setInterval(tick, periode());
    tick();
    if(!cache) draw();
  }
});
window.addEventListener("pagehide", writeMem);

/* Garde-fou : trois fois j'ai donné le même nom à la classe posée sur le corps
   et à celle du châssis. La règle du châssis s'appliquait alors au corps, qui
   passait en display:none — écran noir, sans la moindre erreur JavaScript.
   Ce contrôle le dit tout de suite au lieu de laisser chercher. */
(function collisionsDeClasses(){
  var corps = ["m32","em1","er1","ea1","es1","emx","esx","mk2","mpc","mpc2",
               "tr8","tr9","tr7","rd6","td3","c1","c2","c3","c4","c5","t1","t2","t3","t4","eur","dmx","vlc","cr5","dbi","t1k","arcm","menu-ouvert","note-ouverte"];
  var mauvaises = corps.filter(function(c){
    var e = document.querySelector("." + c);
    return e && e !== document.body;
  });
  if(mauvaises.length){
    console.error("Collision de classes corps/châssis : " + mauvaises.join(", "));
    setTimeout(function(){ signal("COLLISION DE CLASSES : " + mauvaises.join(", ")); }, 900);
  }
  /* Second contrôle : tout ce que le script attend doit exister à la fin du
     chargement. Un objet déclaré trop tard arrête tout sans un mot ; autant
     que la page le dise. */
  setTimeout(function(){
    var requis = ["S","HUM","WAVX","BIB","ENR","PR","TELE","EXC","ARC","ARCM",
                  "TR_MODELES","MACHINE_TR","MACHINE_MPC","MACHINE_DMX","MACHINE_VLC",
                  "MACHINE_CR","MACHINE_DBI","MACHINE_T1K","MACHINE_ARCM"];
    var absents = requis.filter(function(n){
      try{ return typeof window[n] === "undefined"; }catch(e){ return true; }
    });
    if(absents.length){
      console.error("Définitions manquantes : " + absents.join(", "));
      signal("DÉFINITIONS MANQUANTES : " + absents.slice(0, 3).join(", "));
    }
  }, 1200);
})();
