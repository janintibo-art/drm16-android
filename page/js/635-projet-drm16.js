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
  if(writeMem() === false) throw new Error("mémoire courante non enregistrée");
  var memoireProjet = {};
  for(var i=0;i<localStorage.length;i++){
    var k = localStorage.key(i);
    if(k === MEM || k.indexOf(MEM + ".") === 0) memoireProjet[k] = localStorage.getItem(k);
  }
  var total = JSON.stringify(memoireProjet).length, sons = {}, sautes = [], erreurs = [];
  if(HOST.echListe && HOST.echCharger){
    var noms = "";
    try{ noms = HOST.echListe() || ""; }catch(e){ erreurs.push("liste des sons"); }
    noms.split("\n").forEach(function(n){
      if(!n) return;
      var b = "";
      try{ b = HOST.echCharger(n) || ""; }catch(e){}
      if(!b){ erreurs.push(n); return; }
      if(total + b.length > PROJET_MAX - 65536){ sautes.push(n); return; }
      sons[n] = b; total += b.length + n.length + 8;
    });
  }
  return {
    doc: {format:PROJET_FORMAT, version:PROJET_VERSION, date:new Date().toISOString(),
          plateforme:HOST.plateforme, memoire:memoireProjet, sons:sons},
    sautes: sautes, erreurs: erreurs
  };
}

/* v179 : plusieurs sauvegardes dans la même seconde gardent chacune leur
   fichier. Lire tous les noms, sans filtre d'extension : sous Windows,
   PROJET-….DRM16 et projet-….drm16 désignent le même fichier. */
function projetNomDisponible(prefixe){
  var liste = HOST.fichierListe("");
  if(typeof liste !== "string") throw new Error("liste des documents illisible");
  var occupes = Object.create(null);
  liste.split("\n").forEach(function(ligne){
    var n = ligne.split("\t")[0];
    if(n) occupes[n.toLowerCase()] = true;
  });
  /* La même normalisation que les ponts, avant la recherche de collision. */
  var base = String(prefixe || "projet").replace(/[^A-Za-z0-9_.-]/g, "_") + "-" + projetHorodatage();
  var nom = base + ".drm16", numero = 2;
  while(occupes[nom.toLowerCase()]) nom = base + "-" + (numero++) + ".drm16";
  return nom;
}

/* Le chemin renvoyé par une écriture ne suffit pas à prouver que le secours
   sera lisible. Comparer ses octets UTF-8, sans interpréter ni réécrire le JSON.
   Ne pas fabriquer une seconde chaîne Base64 de tout le projet en mémoire. */
function projetDocumentVerifie(nom, octets){
  try{
    var b64 = HOST.fichierCharger(nom);
    if(typeof b64 !== "string" || !b64) return false;
    var lu = atob(b64);
    if(lu.length !== octets.length) return false;
    for(var i=0;i<octets.length;i++) if(lu.charCodeAt(i) !== octets[i]) return false;
    return true;
  }catch(e){ return false; }
}

/* Enregistre et relit le projet ; rend le nom vérifié, ou "". Un fichier
   invérifiable reste conservé : il peut encore servir à une récupération. */
function projetEnregistrer(prefixe, silencieux, contenu){
  if(!HOST.fichierSauver){ if(!silencieux) signal("ÉCRITURE IMPOSSIBLE ICI"); return ""; }
  if(!HOST.fichierListe || !HOST.fichierCharger){
    if(!silencieux) signal("SAUVEGARDE IMPOSSIBLE ICI · VÉRIFICATION DES FICHIERS INDISPONIBLE");
    return "";
  }
  var c, octets, nom;
  try{
    c = contenu || projetContenu();
    octets = new TextEncoder().encode(JSON.stringify(c.doc));
  }catch(e){ if(!silencieux) signal("LECTURE DU PROJET IMPOSSIBLE"); return ""; }
  if(octets.length > PROJET_MAX){ if(!silencieux) signal("PROJET TROP GROS"); return ""; }
  try{ nom = projetNomDisponible(prefixe); }
  catch(e){ if(!silencieux) signal("SAUVEGARDE ANNULÉE · LISTE DES DOCUMENTS ILLISIBLE"); return ""; }
  var chemin = ecrireDocument(HOST, nom, octets);
  if(!chemin){ if(!silencieux) signal("ÉCRITURE REFUSÉE"); return ""; }
  if(!projetDocumentVerifie(nom, octets)){
    if(!silencieux) signal("SAUVEGARDE NON VÉRIFIÉE · " + nom);
    return "";
  }
  if(!silencieux){
    signal("PROJET ENREGISTRÉ · " + octetsTexte(octets.length) +
           (c.sautes.length ? " · " + c.sautes.length + " SON(S) LAISSÉ(S) DE CÔTÉ, PLACE INSUFFISANTE" : "") +
           (c.erreurs.length ? " · " + c.erreurs.length + " SON(S) ILLISIBLE(S)" : ""));
  }
  return nom;
}

/* v176 : le préfixe Base64 de RIFF ne prouve pas qu'il s'agit d'un WAV.
   On contrôle le conteneur et ses limites avant de remplacer un son existant.
   Les chunks supplémentaires et tous les codecs WAV restent acceptés. */
function projetWavValide(b64){
  try{
    /* Parcours linéaire : une regex à groupes répétés épuise la pile sur un
       vrai fichier de plusieurs Mo, pourtant inférieur au plafond projet. */
    if(typeof b64 !== "string" || !b64.length || b64.length%4) return false;
    var finBase64 = b64.length;
    while(finBase64 && b64.charAt(finBase64-1) === "=") finBase64--;
    if(b64.length-finBase64 > 2) return false;
    for(var j=0;j<finBase64;j++){
      var c = b64.charCodeAt(j);
      if(!((c>=65 && c<=90) || (c>=97 && c<=122) || (c>=48 && c<=57) || c===43 || c===47)) return false;
    }
    var s = atob(b64), n = s.length;
    if(n < 44 || s.slice(0,4) !== "RIFF" || s.slice(8,12) !== "WAVE") return false;
    function u32(i){ return (s.charCodeAt(i) + s.charCodeAt(i+1)*256 + s.charCodeAt(i+2)*65536 + s.charCodeAt(i+3)*16777216); }
    function u16(i){ return s.charCodeAt(i) + s.charCodeAt(i+1)*256; }
    var fin = u32(4) + 8, fmt = false, data = false;
    if(fin !== n) return false;
    for(var p=12;p<fin;){
      if(p+8 > fin) return false;
      var genre = s.slice(p,p+4), taille = u32(p+4), debut = p+8;
      if(debut+taille > fin) return false;
      if(genre === "fmt "){
        if(taille < 16 || !u16(debut) || !u16(debut+2) || !u32(debut+4) || !u16(debut+12)) return false;
        fmt = true;
      }
      if(genre === "data") data = taille > 0;
      p = debut + taille + (taille%2);
      if(p > fin) return false;
    }
    return fmt && data;
  }catch(e){ return false; }
}

/* Rend le projet validé, ou un texte qui dit ce qui ne va pas */
function projetValider(texte){
  var d;
  try{ d = JSON.parse(texte); }catch(e){ return "FICHIER ILLISIBLE"; }
  if(!d || typeof d !== "object" || d.format !== PROJET_FORMAT) return "CE N'EST PAS UN PROJET DRM16";
  if(typeof d.version !== "number" || d.version < 1) return "PROJET ABÎMÉ";
  if(d.version > PROJET_VERSION) return "PROJET D'UNE VERSION PLUS RÉCENTE · METTEZ L'APPLICATION À JOUR";
  var m = d.memoire;
  if(!m || typeof m !== "object" || Array.isArray(m) || typeof m[MEM] !== "string") return "PROJET INCOMPLET";
  for(var k in m){
    if(!Object.prototype.hasOwnProperty.call(m, k)) continue;
    if(k !== MEM && k.indexOf(MEM + ".") !== 0) return "PROJET ABÎMÉ (CLÉ INCONNUE)";
    if(typeof m[k] !== "string") return "PROJET ABÎMÉ (VALEUR)";
    try{
      var valeur = JSON.parse(m[k]);
      if(k === MEM && (!valeur || typeof valeur !== "object" || Array.isArray(valeur))) return "PROJET ABÎMÉ (RÉGLAGES)";
    }catch(e){ return "PROJET ABÎMÉ (VALEUR ILLISIBLE)"; }
  }
  var s = d.sons || {};
  if(typeof s !== "object" || Array.isArray(s)) return "PROJET ABÎMÉ (SONS)";
  for(var n in s){
    if(!Object.prototype.hasOwnProperty.call(s, n)) continue;
    if(!/^[A-Za-z0-9_.-]{1,64}$/.test(n) || n === "." || n === "..") return "PROJET ABÎMÉ (NOM DE SON)";
    if(!projetWavValide(s[n])) return "PROJET ABÎMÉ (SON « " + n + " »)";
  }
  d.sons = s;
  return d;
}

/* Le stockage de la page ne fournit pas de transaction. On garde donc une
   copie exacte des anciennes valeurs et un fichier de secours complet avant
   toute écriture, puis on restaure ces valeurs si une seule écriture échoue. */
function projetPoserMemoire(m){
  var cles = [];
  for(var i=0;i<localStorage.length;i++){
    var k = localStorage.key(i);
    if(k === MEM || k.indexOf(MEM + ".") === 0) cles.push(k);
  }
  cles.forEach(function(k){ localStorage.removeItem(k); });
  Object.keys(m).forEach(function(k){ localStorage.setItem(k, m[k]); });
}

/* Remplace tout l'état par celui du projet, puis recharge la page. */
function projetOuvrir(texte, nom){
  if(PROJET_EN_COURS){ signal("OUVERTURE DÉJÀ EN COURS"); return false; }
  var d = projetValider(texte);
  if(typeof d === "string"){ signal(d); return false; }
  var nbSons = Object.keys(d.sons).length;
  if(nbSons && (!HOST.echSauver || !HOST.echCharger || !HOST.echSupprimer)){
    signal("OUVERTURE IMPOSSIBLE ICI · ÉCRITURE DES SONS INDISPONIBLE"); return false;
  }
  if(!window.confirm("Ouvrir le projet « " + (nom || "sans nom") + " » ?\n\n" +
                     "Il remplace tout : réglages, motifs, set, prises" +
                     (nbSons ? ", et " + nbSons + " son(s) de la bibliothèque" : "") + ".\n" +
                     "L'état actuel est d'abord enregistré en « avant-ouverture »."))
    return false;
  if(S.run) stop();
  var avant, secours;
  try{ avant = projetContenu(); }catch(e){ signal("OUVERTURE ANNULÉE · SAUVEGARDE DE L'ÉTAT ACTUEL IMPOSSIBLE"); return false; }
  if(avant.sautes.length || avant.erreurs.length){
    signal("OUVERTURE ANNULÉE · SAUVEGARDE DE SECOURS INCOMPLÈTE"); return false;
  }
  secours = projetEnregistrer("avant-ouverture", true, avant);
  if(!secours){ signal("OUVERTURE ANNULÉE · SAUVEGARDE DE SECOURS IMPOSSIBLE OU NON VÉRIFIÉE"); return false; }
  PROJET_EN_COURS = true;
  var touches = [];
  try{
    /* Tester d'abord la mémoire évite de toucher aux sons en cas de quota. */
    projetPoserMemoire(d.memoire);
    Object.keys(d.sons).forEach(function(n){
      touches.push(n);
      if(!HOST.echSauver(n, d.sons[n])) throw new Error("son non écrit");
    });
  }catch(e){
    var restaure = true;
    try{ projetPoserMemoire(avant.doc.memoire); }catch(err){ restaure = false; }
    touches.forEach(function(n){
      var ancien = Object.prototype.hasOwnProperty.call(avant.doc.sons,n) ? avant.doc.sons[n] : "";
      try{
        if((HOST.echCharger(n) || "") !== ancien){
          if(ancien) HOST.echSauver(n, ancien); else HOST.echSupprimer(n);
          if((HOST.echCharger(n) || "") !== ancien) restaure = false;
        }
      }catch(err){ restaure = false; }
    });
    PROJET_EN_COURS = false;
    signal(restaure ? "OUVERTURE ANNULÉE · ÉCRITURE REFUSÉE, ÉTAT PRÉCÉDENT CONSERVÉ"
                    : "OUVERTURE ANNULÉE · RESTAURATION INCOMPLÈTE, SECOURS : " + secours);
    return false;
  }
  signal("PROJET OUVERT");
  /* Laisser au WebView le temps de ranger le stockage avant le rechargement. */
  setTimeout(function(){ location.reload(); }, 1000);
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
