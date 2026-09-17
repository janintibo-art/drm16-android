/* v180 : définitions disponibles avant de démarrer les machines. */
var MEM = "drm.reglages";
var PROJET_FORMAT = "drm16-projet";
var PROJET_VERSION = 1;
var PROJET_MAX = 16 * 1024 * 1024;
var PROJET_JOURNAL = "drm16-ouverture.json";
var PROJET_EN_COURS = false;
var PROJET_REPRISE = {restauree:false, recharger:false, secours:"", erreur:""};

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
  var nomsSons = Object.create(null);
  for(var n in s){
    if(!Object.prototype.hasOwnProperty.call(s, n)) continue;
    if(!/^[A-Za-z0-9_.-]{1,64}$/.test(n) || n === "." || n === "..") return "PROJET ABÎMÉ (NOM DE SON)";
    if(nomsSons[n.toLowerCase()]) return "PROJET ABÎMÉ (NOMS DE SONS AMBIGUS)";
    nomsSons[n.toLowerCase()] = true;
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
  cles.forEach(function(k){
    if(!Object.prototype.hasOwnProperty.call(m,k)) localStorage.removeItem(k);
  });
  Object.keys(m).forEach(function(k){
    if(localStorage.getItem(k) !== m[k]) localStorage.setItem(k, m[k]);
  });
}

/* CRC32 + taille détectent un secours remplacé/altéré accidentellement.
   Ce contrôle d'intégrité n'est pas une signature de sécurité. */
var PROJET_CRC = null;
function projetEmpreinte(octets){
  if(!PROJET_CRC){
    PROJET_CRC = [];
    for(var n=0;n<256;n++){
      var c = n;
      for(var k=0;k<8;k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      PROJET_CRC[n] = c;
    }
  }
  var crc = -1;
  for(var i=0;i<octets.length;i++) crc = PROJET_CRC[(crc ^ octets[i]) & 255] ^ (crc >>> 8);
  return ("00000000" + ((crc ^ -1) >>> 0).toString(16)).slice(-8);
}
function projetReference(nom, doc){
  var o = new TextEncoder().encode(JSON.stringify(doc));
  return {nom:nom, taille:o.length, crc:projetEmpreinte(o)};
}
function projetOctetsNatifs(nom){
  var b64 = HOST.fichierCharger(nom);
  if(typeof b64 !== "string" || !b64) throw new Error("Fichier absent ou illisible : " + nom);
  var b = atob(b64), o = new Uint8Array(b.length);
  for(var i=0;i<b.length;i++) o[i] = b.charCodeAt(i);
  return o;
}
function projetNomsNatifs(){
  var l = HOST.fichierListe("");
  if(typeof l !== "string") throw new Error("La liste des documents est illisible.");
  return l.split("\n").map(function(n){ return n.split("\t")[0].toLowerCase(); });
}
function projetRefValide(r){
  return r && typeof r === "object" && typeof r.nom === "string" &&
    /^[A-Za-z0-9_.-]{1,190}\.drm16$/.test(r.nom) &&
    Number.isInteger(r.taille) && r.taille > 0 && r.taille <= PROJET_MAX &&
    typeof r.crc === "string" && /^[0-9a-f]{8}$/.test(r.crc);
}
function projetIntegriteJournal(j){
  return projetEmpreinte(new TextEncoder().encode(JSON.stringify({version:j.version,
    phase:j.phase, avant:j.avant, apres:j.apres, sons:j.sons})));
}
function projetJournalValider(j){
  if(!j || j.version !== 1 || (j.phase !== "avant" && j.phase !== "apres") ||
     !projetRefValide(j.avant) || !projetRefValide(j.apres) ||
     j.avant.nom.toLowerCase() === j.apres.nom.toLowerCase() || !Array.isArray(j.sons))
    throw new Error("Le suivi de l'ouverture est illisible ou incompatible.");
  var vus = Object.create(null);
  j.sons.forEach(function(n){
    if(typeof n !== "string" || !/^[A-Za-z0-9_.-]{1,64}$/.test(n) || n === "." || n === ".." || vus[n])
      throw new Error("Le suivi des sons de l'ouverture est abîmé.");
    vus[n] = true;
  });
  if(typeof j.integrite !== "string" || j.integrite !== projetIntegriteJournal(j))
    throw new Error("Le suivi de l'ouverture a été modifié ou est incomplet.");
  return j;
}
function projetLireJournal(){
  var b64 = HOST.fichierCharger(PROJET_JOURNAL);
  if(typeof b64 !== "string") throw new Error("Le suivi de l'ouverture ne peut pas être lu.");
  if(!b64){
    if(projetNomsNatifs().indexOf(PROJET_JOURNAL) >= 0)
      throw new Error("Le suivi de l'ouverture existe mais ne peut pas être lu.");
    return null;
  }
  var b = atob(b64);
  if(b.length > 8 * 1024 * 1024) throw new Error("Le suivi de l'ouverture est trop volumineux.");
  var o = new Uint8Array(b.length);
  for(var i=0;i<b.length;i++) o[i] = b.charCodeAt(i);
  return projetJournalValider(JSON.parse(new TextDecoder("utf-8", {fatal:true}).decode(o)));
}
function projetEcrireJournal(j){
  j.integrite = projetIntegriteJournal(j);
  projetJournalValider(j);
  var o = new TextEncoder().encode(JSON.stringify(j));
  if(o.length > 8 * 1024 * 1024) throw new Error("Le suivi de l'ouverture est trop volumineux.");
  var parties = [];
  for(var i=0;i<o.length;i+=32768) parties.push(String.fromCharCode.apply(null,o.subarray(i,i+32768)));
  if(!HOST.fichierSauver(PROJET_JOURNAL,btoa(parties.join("")))) throw new Error("Le suivi de l'ouverture n'a pas été enregistré.");
  var lu = projetOctetsNatifs(PROJET_JOURNAL);
  if(lu.length !== o.length) throw new Error("Le suivi de l'ouverture n'a pas pu être vérifié.");
  for(var k=0;k<o.length;k++) if(lu[k] !== o[k]) throw new Error("Le suivi de l'ouverture n'a pas pu être vérifié.");
}
function projetChargerReference(r){
  var o = projetOctetsNatifs(r.nom);
  if(o.length !== r.taille || projetEmpreinte(o) !== r.crc)
    throw new Error("Le fichier a été modifié ou est incomplet : " + r.nom);
  var d = projetValider(new TextDecoder("utf-8", {fatal:true}).decode(o));
  if(typeof d === "string") throw new Error("Le fichier ne peut pas être restauré : " + r.nom);
  return d;
}
function projetMemoireEgale(m){
  var n = 0;
  for(var i=0;i<localStorage.length;i++){
    var k = localStorage.key(i);
    if(k !== MEM && k.indexOf(MEM + ".") !== 0) continue;
    n++;
    if(!Object.prototype.hasOwnProperty.call(m,k) || localStorage.getItem(k) !== m[k]) return false;
  }
  return n === Object.keys(m).length;
}
function projetVerifierPontSons(noms){
  if(noms.length && (!HOST.echSauver || !HOST.echCharger || !HOST.echSupprimer || !HOST.echListe))
    throw new Error("La restauration des sons est indisponible.");
}
/* Windows peut désigner le même fichier par Kick et kick. La sauvegarde
   portable doit identifier sans ambiguïté le son à conserver ou à retirer. */
function projetVerifierNomsSons(d,noms){
  var vus = Object.create(null);
  Object.keys(d.sons).concat(noms).forEach(function(n){
    var cle = n.toLowerCase();
    if(vus[cle] && vus[cle] !== n) throw new Error("Deux noms désignent peut-être le même son : " + vus[cle] + " / " + n);
    vus[cle] = n;
  });
}
function projetSonEgale(d,n){
  var ancien = Object.prototype.hasOwnProperty.call(d.sons,n) ? d.sons[n] : "";
  var lu = HOST.echCharger(n);
  if(typeof lu !== "string") throw new Error("Lecture du son impossible : " + n);
  if(!ancien){
    var liste = HOST.echListe();
    if(typeof liste !== "string") throw new Error("La liste des sons est illisible.");
    return !lu && liste.split("\n").indexOf(n) < 0;
  }
  if(lu === ancien) return true;
  try{ return !!lu && atob(lu) === atob(ancien); }catch(e){ return false; }
}
function projetEtatEgale(d,noms){
  projetVerifierPontSons(noms);
  return projetMemoireEgale(d.memoire) && noms.every(function(n){ return projetSonEgale(d,n); });
}
function projetRestaurerEtat(d,noms){
  projetVerifierPontSons(noms);
  noms.forEach(function(n){
    if(projetSonEgale(d,n)) return;
    if(Object.prototype.hasOwnProperty.call(d.sons,n)){
      if(!HOST.echSauver(n,d.sons[n])) throw new Error("Restauration du son refusée : " + n);
    }else HOST.echSupprimer(n);
    if(!projetSonEgale(d,n)) throw new Error("Le son n'a pas pu être restauré : " + n);
  });
  projetPoserMemoire(d.memoire);
  if(!projetEtatEgale(d,noms)) throw new Error("Les réglages n'ont pas pu être restaurés.");
}
function projetEffacerJournal(j){
  if(JSON.stringify(projetLireJournal()) !== JSON.stringify(j))
    throw new Error("Le suivi de l'ouverture a changé. Réessayez.");
  if(!HOST.fichierSupprimer || !HOST.fichierSupprimer(PROJET_JOURNAL))
    throw new Error("La restauration n'a pas pu être terminée. Réessayez.");
  /* v181 : un retour natif null n'est pas une absence. La même lecture
     vérifiée qu'au démarrage doit confirmer la disparition du suivi. */
  if(projetLireJournal() !== null)
    throw new Error("La restauration reste en attente. Réessayez.");
}
/* Aucun code de machine n'a encore été exécuté à cet instant. Si la reprise
   a écrit des valeurs, le journal reste jusqu'au chargement suivant, où
   l'état est revérifié avant de supprimer le suivi et de lancer l'application. */
function projetReprendreOuverture(){
  PROJET_REPRISE = {restauree:false, recharger:false, secours:"", erreur:""};
  if(!HOST.fichierCharger || !HOST.fichierListe) return true;
  try{
    var j = projetLireJournal();
    if(!j) return true;
    PROJET_REPRISE.secours = j.avant.nom;
    var d = projetChargerReference(j.phase === "avant" ? j.avant : j.apres);
    projetVerifierNomsSons(d,j.sons);
    if(j.phase === "apres" && JSON.stringify(Object.keys(d.sons).sort()) !== JSON.stringify(j.sons.slice().sort()))
      throw new Error("Le suivi des sons est incomplet.");
    if(!projetEtatEgale(d,j.sons)){
      projetRestaurerEtat(d,j.sons);
      PROJET_REPRISE.recharger = true;
      return false;
    }
    projetEffacerJournal(j);
    PROJET_REPRISE.restauree = j.phase === "avant";
    return true;
  }catch(e){
    PROJET_REPRISE.erreur = e && e.message ? e.message : "La restauration du projet est impossible pour le moment.";
    return false;
  }
}
