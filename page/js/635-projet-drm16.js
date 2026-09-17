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
  var total = JSON.stringify(memoireProjet).length, sons = Object.create(null), sautes = [], erreurs = [];
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

/* Le journal reste présent jusqu'à la vérification au démarrage suivant.
   Les callbacks tardifs restent bloqués, même si la restauration a échoué. */
function projetAttendreReprise(secours, erreur, recharger){
  PROJET_EN_COURS = true;
  PROJET_REPRISE = {restauree:false, secours:secours, erreur:erreur, recharger:recharger};
  projetArreterJeu();
  projetBloquerReprise();
}

function projetArreterJeu(){
  /* Les banques Kaoss et le looper peuvent jouer avec S.run déjà faux. */
  stop();
  if(typeof ENR !== "undefined"){
    if(ENR.actif) enrArreter();
    if(ENR.lecture !== null) enrArreterLecture();
  }
  if(typeof PR !== "undefined" && PR.lecture) prArreter();
}

/* v180 : deux copies vérifiées et un journal natif précèdent les mutations.
   « avant » restaure l'ancien état ; « apres » termine le nouveau. */
function projetOuvrir(texte, nom){
  if(PROJET_EN_COURS){ signal("OUVERTURE DÉJÀ EN COURS"); return false; }
  var d = projetValider(texte);
  if(typeof d === "string"){ signal(d); return false; }
  var noms = Object.keys(d.sons), nbSons = noms.length;
  if(!HOST.fichierSauver || !HOST.fichierCharger || !HOST.fichierListe || !HOST.fichierSupprimer){
    signal("OUVERTURE IMPOSSIBLE ICI · SUIVI DES FICHIERS INDISPONIBLE"); return false;
  }
  try{ projetVerifierPontSons(noms); }
  catch(e){ signal("OUVERTURE IMPOSSIBLE ICI · ÉCRITURE DES SONS INDISPONIBLE"); return false; }
  try{
    if(projetLireJournal()){
      projetAttendreReprise("", "Une ouverture précédente doit être terminée.", false);
      return false;
    }
  }catch(e){
    projetAttendreReprise("", e.message, false);
    return false;
  }
  if(!window.confirm("Ouvrir le projet « " + (nom || "sans nom") + " » ?\n\n" +
                     "Il remplace tout : réglages, motifs, set, prises" +
                     (nbSons ? ", et " + nbSons + " son(s) de la bibliothèque" : "") + ".\n" +
                     "L'état actuel est d'abord enregistré en « avant-ouverture »."))
    return false;
  projetArreterJeu();
  var avant, secours, cible;
  try{ avant = projetContenu(); }catch(e){ signal("OUVERTURE ANNULÉE · SAUVEGARDE DE L'ÉTAT ACTUEL IMPOSSIBLE"); return false; }
  if(avant.sautes.length || avant.erreurs.length){
    signal("OUVERTURE ANNULÉE · SAUVEGARDE DE SECOURS INCOMPLÈTE"); return false;
  }
  if(typeof projetValider(JSON.stringify(avant.doc)) === "string"){
    signal("OUVERTURE ANNULÉE · L'ÉTAT ACTUEL NE PEUT PAS ÊTRE RESTAURÉ"); return false;
  }
  try{ projetVerifierNomsSons(avant.doc,noms); }
  catch(e){ signal("OUVERTURE ANNULÉE · NOMS DE SONS AMBIGUS · " + e.message); return false; }
  secours = projetEnregistrer("avant-ouverture", true, avant);
  if(!secours){ signal("OUVERTURE ANNULÉE · SAUVEGARDE DE SECOURS IMPOSSIBLE OU NON VÉRIFIÉE"); return false; }
  cible = projetEnregistrer("ouverture-verifiee", true, {doc:d, sautes:[], erreurs:[]});
  if(!cible){ signal("OUVERTURE ANNULÉE · COPIE DU PROJET NON VÉRIFIÉE"); return false; }
  var j = {version:1, phase:"avant", avant:projetReference(secours,avant.doc),
    apres:projetReference(cible,d), sons:noms};
  PROJET_EN_COURS = true;
  var commence = false, commit = false;
  try{
    projetEcrireJournal(j);
    commence = true;
    /* Tester d'abord la mémoire évite de toucher aux sons en cas de quota. */
    projetPoserMemoire(d.memoire);
    noms.forEach(function(n){
      if(!HOST.echSauver(n,d.sons[n]) || !projetSonEgale(d,n)) throw new Error("Son non écrit : " + n);
    });
    if(!projetEtatEgale(d,noms)) throw new Error("Le projet écrit ne correspond pas au fichier.");
    commit = true;
    j.phase = "apres";
    projetEcrireJournal(j);
  }catch(e){
    if(commence){
      try{
        /* Une écriture du commit peut avoir réussi malgré un retour d'erreur.
           Ne restaurer l'ancien qu'après avoir revérifié la phase « avant ». */
        if(commit){ j.phase = "avant"; projetEcrireJournal(j); }
        projetRestaurerEtat(avant.doc,noms);
      }catch(err){
        signal("OUVERTURE ANNULÉE · RESTAURATION À TERMINER · " + secours);
        projetAttendreReprise(secours, err.message, false);
        return false;
      }
      signal("OUVERTURE ANNULÉE · ÉTAT PRÉCÉDENT RESTAURÉ");
      projetAttendreReprise(secours, "", true);
    }else{
      /* Le journal peut exister même si sa relecture a échoué. Ne pas laisser
         de nouvelles modifications déborder la copie de secours. */
      signal("OUVERTURE ANNULÉE · SUIVI NON VÉRIFIÉ");
      projetAttendreReprise(secours, e.message, false);
    }
    return false;
  }
  signal("PROJET OUVERT");
  projetAttendreReprise(secours, "", true);
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
