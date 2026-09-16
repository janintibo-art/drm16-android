/* ================= projet .drm16 (v145) =================
   Un fichier unique qui contient TOUT l'état de l'application : réglages,
   motifs de chaque machine, set, prises MIDI, noms de la bibliothèque… (toutes
   les clés « drm.reglages* » du stockage de la page), plus les échantillons de
   l'utilisateur. Le même fichier s'ouvre sur Android et sur ordinateur.

   Format (JSON, UTF-8) :
     { "format": "drm16-projet", "version": 1, "date": "…", "plateforme": "…",
       "memoire": { "<clé>": "<valeur telle que stockée>" , … },
       "sons":    { "<nom>": "<WAV en Base64>", … } }

   Ouvrir un projet REMPLACE l'état courant ; l'état courant est d'abord
   enregistré en « avant-ouverture-….drm16 », puis la page est rechargée.
   Plafond : 16 Mo, le même dans les deux ponts (Java et Rust). */
var PROJET_FORMAT = "drm16-projet";
var PROJET_VERSION = 1;
var PROJET_MAX = 16 * 1024 * 1024;

function projetHorodatage(){
  var d = new Date();
  function z(n){ return ("0" + n).slice(-2); }
  return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + "-" + z(d.getHours()) + z(d.getMinutes()) + z(d.getSeconds());
}

/* L'état complet, prêt à écrire. sautes : les sons laissés de côté faute de place. */
function projetContenu(){
  writeMem();
  var memoireProjet = {};
  for(var i=0;i<localStorage.length;i++){
    var k = localStorage.key(i);
    if(k === MEM || k.indexOf(MEM + ".") === 0) memoireProjet[k] = localStorage.getItem(k);
  }
  var total = JSON.stringify(memoireProjet).length, sons = {}, sautes = [];
  if(HOST.echListe && HOST.echCharger){
    var noms = "";
    try{ noms = HOST.echListe() || ""; }catch(e){}
    noms.split("\n").forEach(function(n){
      if(!n) return;
      var b = "";
      try{ b = HOST.echCharger(n) || ""; }catch(e){}
      if(!b) return;
      if(total + b.length > PROJET_MAX - 65536){ sautes.push(n); return; }
      sons[n] = b; total += b.length + n.length + 8;
    });
  }
  return {
    doc: {format:PROJET_FORMAT, version:PROJET_VERSION, date:new Date().toISOString(),
          plateforme:HOST.plateforme, memoire:memoireProjet, sons:sons},
    sautes: sautes
  };
}

/* Enregistre le projet dans les documents ; rend le nom écrit, ou "" */
function projetEnregistrer(prefixe, silencieux){
  if(!HOST.fichierSauver){ if(!silencieux) signal("ÉCRITURE IMPOSSIBLE ICI"); return ""; }
  var c = projetContenu();
  var octets = new TextEncoder().encode(JSON.stringify(c.doc));
  if(octets.length > PROJET_MAX){ if(!silencieux) signal("PROJET TROP GROS"); return ""; }
  var nom = (prefixe || "projet") + "-" + projetHorodatage() + ".drm16";
  var chemin = ecrireDocument(HOST, nom, octets);
  if(!chemin){ if(!silencieux) signal("ÉCRITURE REFUSÉE"); return ""; }
  if(!silencieux){
    signal("PROJET ENREGISTRÉ · " + octetsTexte(octets.length) +
           (c.sautes.length ? " · " + c.sautes.length + " SON(S) LAISSÉ(S) DE CÔTÉ, PLACE INSUFFISANTE" : ""));
  }
  return nom;
}

/* Rend le projet validé, ou un texte qui dit ce qui ne va pas */
function projetValider(texte){
  var d;
  try{ d = JSON.parse(texte); }catch(e){ return "FICHIER ILLISIBLE"; }
  if(!d || typeof d !== "object" || d.format !== PROJET_FORMAT) return "CE N'EST PAS UN PROJET DRM16";
  if(typeof d.version !== "number" || d.version < 1) return "PROJET ABÎMÉ";
  if(d.version > PROJET_VERSION) return "PROJET D'UNE VERSION PLUS RÉCENTE · METTEZ L'APPLICATION À JOUR";
  var m = d.memoire;
  if(!m || typeof m !== "object" || typeof m[MEM] !== "string") return "PROJET INCOMPLET";
  for(var k in m){
    if(!Object.prototype.hasOwnProperty.call(m, k)) continue;
    if(k !== MEM && k.indexOf(MEM + ".") !== 0) return "PROJET ABÎMÉ (CLÉ INCONNUE)";
    if(typeof m[k] !== "string") return "PROJET ABÎMÉ (VALEUR)";
    try{ JSON.parse(m[k]); }catch(e){ return "PROJET ABÎMÉ (VALEUR ILLISIBLE)"; }
  }
  var s = d.sons || {};
  if(typeof s !== "object") return "PROJET ABÎMÉ (SONS)";
  for(var n in s){
    if(!Object.prototype.hasOwnProperty.call(s, n)) continue;
    if(!/^[A-Za-z0-9_.-]{1,64}$/.test(n)) return "PROJET ABÎMÉ (NOM DE SON)";
    if(typeof s[n] !== "string" || s[n].indexOf("UklGR") !== 0) return "PROJET ABÎMÉ (SON « " + n + " »)";
  }
  d.sons = s;
  return d;
}

/* Remplace tout l'état par celui du projet, puis recharge la page */
function projetOuvrir(texte, nom){
  var d = projetValider(texte);
  if(typeof d === "string"){ signal(d); return false; }
  var nbSons = Object.keys(d.sons).length;
  if(!window.confirm("Ouvrir le projet « " + (nom || "sans nom") + " » ?\n\n" +
                     "Il remplace tout : réglages, motifs, set, prises" +
                     (nbSons ? ", et " + nbSons + " son(s) de la bibliothèque" : "") + ".\n" +
                     "L'état actuel est d'abord enregistré en « avant-ouverture »."))
    return false;
  if(S.run) stop();
  projetEnregistrer("avant-ouverture", true);
  /* plus aucune écriture de l'ancien état, même au déchargement de la page */
  PROJET_EN_COURS = true;
  var ecrits = 0, rates = 0;
  for(var n in d.sons){
    var ok = false;
    try{ ok = !!(HOST.echSauver && HOST.echSauver(n, d.sons[n])); }catch(e){}
    if(ok) ecrits++; else rates++;
  }
  var anciennes = [];
  for(var i=0;i<localStorage.length;i++){
    var k = localStorage.key(i);
    if(k === MEM || k.indexOf(MEM + ".") === 0) anciennes.push(k);
  }
  anciennes.forEach(function(k){ localStorage.removeItem(k); });
  try{
    for(var c in d.memoire) localStorage.setItem(c, d.memoire[c]);
  }catch(e){
    signal("MÉMOIRE PLEINE · PROJET INCOMPLET");
  }
  signal("PROJET OUVERT" + (rates ? " · " + rates + " SON(S) NON ÉCRIT(S)" : ""));
  /* une seconde avant de recharger (v151) : le temps que le navigateur range ce
     qui vient d'être écrit — prudence, le test l'a vu perdu en file:// */
  setTimeout(function(){ location.reload(); }, rates ? 1500 : 1000);
  return true;
}

function projetOuvrirDocument(nom){
  if(!HOST.fichierCharger){ signal("LECTURE IMPOSSIBLE ICI"); return; }
  var b64 = "";
  try{ b64 = HOST.fichierCharger(nom) || ""; }catch(e){}
  if(!b64){ signal("LECTURE REFUSÉE"); return; }
  projetOuvrir(texteDeB64(b64), BIB.noms["f:" + nom] || nom);
}

/* Un fichier choisi ailleurs : téléchargements, clé USB, pièce jointe… */
function projetOuvrirFichierExterne(){
  var e = document.getElementById("projet-fichier");
  if(!e){
    e = document.createElement("input");
    e.type = "file"; e.id = "projet-fichier"; e.style.display = "none";
    /* aucun filtre : Android ne connaît pas l'extension .drm16 et n'afficherait rien */
    e.addEventListener("change", function(){
      var f = e.files && e.files[0];
      e.value = "";
      if(!f) return;
      if(f.size > PROJET_MAX){ signal("PROJET TROP GROS"); return; }
      var r = new FileReader();
      r.onload = function(){ projetOuvrir(String(r.result), f.name); };
      r.onerror = function(){ signal("LECTURE IMPOSSIBLE"); };
      r.readAsText(f, "utf-8");
    });
    document.body.appendChild(e);
  }
  e.click();
}

/* La section « Projets » en tête du rayon SAUVEGARDES */
function projetRendre(corps){
  var h = document.createElement("h3"); h.textContent = "Projets DRM16";
  corps.appendChild(h);
  var p = document.createElement("p");
  p.textContent = "Un projet garde tout l'état de l'application — réglages, motifs de chaque machine, set, " +
    "prises MIDI et sons de la bibliothèque — dans un seul fichier .drm16, qui s'ouvre aussi bien sur " +
    "Android que sur ordinateur.";
  corps.appendChild(p);
  var acts = document.createElement("div"); acts.className = "bib-actions";
  boutonBib(acts, "ENREGISTRER LE PROJET", function(){ projetEnregistrer("projet"); majBibUI(); }, false);
  boutonBib(acts, "OUVRIR UN FICHIER…", projetOuvrirFichierExterne, false);
  corps.appendChild(acts);
  bibFichiers(".drm16").forEach(function(f){
    var d = new Date(f.date);
    var li = ligneBib(BIB.noms["f:" + f.nom] || f.nom,
      octetsTexte(f.taille) + " · " + d.getDate() + "/" + (d.getMonth()+1) + " " +
      ("0"+d.getHours()).slice(-2) + "h" + ("0"+d.getMinutes()).slice(-2));
    var a = document.createElement("div"); a.className = "bib-actions";
    boutonBib(a, "OUVRIR", function(){ projetOuvrirDocument(f.nom); });
    boutonBib(a, "RENOMMER", function(){
      renommer("Nom du projet", BIB.noms["f:" + f.nom] || f.nom, function(v){
        if(v) BIB.noms["f:" + f.nom] = v; else delete BIB.noms["f:" + f.nom];
        bibEcrire(); majBibUI();
      });
    });
    boutonBib(a, "SUPPRIMER", function(){ bibSupprimerFichier(f.nom); });
    li.appendChild(a);
    corps.appendChild(li);
  });
}
