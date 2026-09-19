/* ================= Freesound (v248) =================
   Recherche officielle, apercus MP3 et import dans la banque commune.
   La cle n'appartient JAMAIS a MEM : un projet partage ne doit pas l'emporter.
   Le pont HTTPS existant sert Android et la coque de bureau, sans page distante.
   Documentation verifiee le 19/09/2026 : /docs/api/resources_apiv2.html. */
var FSOUND = {cle:"", retenue:false, initialise:false, query:"kick", licence:"", duree:8,
  tri:"score", resultats:[], total:0, page:0, suivant:false, recherche:null,
  requete:null, source:null, gain:null, cache:null, lecture:0, message:"", infos:null,
  limite:60, prive:"drm.freesound.cle.v1", temporisation:0};

function fsonCleValide(cle){ return typeof cle === "string" && /^[A-Za-z0-9]{20,128}$/.test(cle); }
function fsonInitialiser(){
  if(FSOUND.initialise) return;
  FSOUND.initialise = true;
  try{
    var cle = localStorage.getItem(FSOUND.prive) || "";
    if(fsonCleValide(cle)){ FSOUND.cle = cle; FSOUND.retenue = true; }
  }catch(e){}
}
function fsonDefinirCle(cle, retenir){
  cle = String(cle || "").trim();
  if(!fsonCleValide(cle)) return false;
  fsonAnnuler();
  FSOUND.cle = cle; FSOUND.retenue = false;
  /* Enlever d'abord l'ancienne cle : ne pas conserver une autre cle par erreur. */
  try{
    localStorage.removeItem(FSOUND.prive);
    if(retenir){ localStorage.setItem(FSOUND.prive, cle); FSOUND.retenue = true; }
  }catch(e){}
  FSOUND.message = retenir && !FSOUND.retenue
    ? "Clé utilisable pour cette session, mais stockage refusé."
    : "Clé configurée. Lance une recherche pour la vérifier auprès de Freesound.";
  return true;
}
function fsonOublierCle(){
  fsonAnnuler(); FSOUND.cle = ""; FSOUND.retenue = false;
  FSOUND.resultats = []; FSOUND.page = 0; FSOUND.cache = null;
  try{ localStorage.removeItem(FSOUND.prive); FSOUND.message = "Clé retirée de cet appareil."; }
  catch(e){ FSOUND.message = "Clé retirée de la session, mais le stockage n'a pas pu être effacé."; }
  fsonMaj();
}
function fsonParametres(o){
  o = o || {};
  return {query:String(o.query || "").trim().slice(0, 160),
    licence:["", "Creative Commons 0", "Attribution", "Attribution NonCommercial"].indexOf(o.licence) >= 0 ? o.licence : "",
    duree:[8, 30, 60].indexOf(+o.duree) >= 0 ? +o.duree : 8,
    tri:["score", "downloads_desc", "created_desc", "duration_asc"].indexOf(o.tri) >= 0 ? o.tri : "score"};
}
function fsonAdresseRecherche(o, page, cle){
  if(!fsonCleValide(cle)) throw new Error("FSON_CLE");
  o = fsonParametres(o);
  var filtre = "duration:[0 TO " + o.duree + "]";
  if(o.licence) filtre += ' license:"' + o.licence + '"';
  var p = new URLSearchParams();
  p.set("query", o.query); p.set("filter", filtre); p.set("sort", o.tri); p.set("format", "json");
  p.set("fields", "id,name,username,license,duration,previews,url");
  p.set("page_size", "20"); p.set("page", String(Math.max(1, Math.min(100000, Math.floor(+page) || 1))));
  /* Le pont commun ne prend pas d'entetes. Le parametre token est une methode
     officielle, envoyee UNIQUEMENT a cet hote fixe en HTTPS. Jamais de journal
     de cette adresse, et jamais de reprise des liens next fournis par l'API. */
  p.set("token", cle);
  return "https://freesound.org/apiv2/search/?" + p.toString();
}
function fsonApercu(url){
  try{
    var u = new URL(String(url || ""));
    if(u.protocol !== "https:" || u.username || u.password || u.port || u.search || u.hash) return "";
    if(["cdn.freesound.org", "freesound.org", "www.freesound.org"].indexOf(u.hostname) < 0) return "";
    if(!/^\/(?:data\/)?previews\/[\w./-]+\.mp3$/.test(u.pathname)) return "";
    return u.href;
  }catch(e){ return ""; }
}
function fsonPageSon(id){ return "https://freesound.org/s/" + id + "/"; }
function fsonResultat(o){
  if(!o || !Number.isSafeInteger(+o.id) || +o.id <= 0) return null;
  var duree = Number(o.duration);
  if(!isFinite(duree) || duree <= 0 || duree > FSOUND.limite) return null;
  var p = o.previews || {};
  /* Ne pas substituer silencieusement l'apercu basse qualite. */
  return {id:+o.id, nom:String(o.name || "Son " + o.id).slice(0, 240),
    auteur:String(o.username || "Auteur non indiqué").slice(0, 100),
    licence:String(o.license || "Licence non indiquée").slice(0, 240),
    duree:duree, apercu:fsonApercu(p["preview-hq-mp3"]), url:fsonPageSon(+o.id)};
}
function fsonLicence(licence){
  var s = String(licence || ""), v = s.toLowerCase();
  if(v.indexOf("zero/") >= 0 || v === "creative commons 0") return "CC0";
  if(v.indexOf("by-nc/") >= 0 || v === "attribution noncommercial") return "CC BY-NC";
  if(v.indexOf("licenses/by/") >= 0 || v === "attribution") return "CC BY";
  return s || "Licence non indiquée";
}
function fsonCreditsValides(o){
  var r = Object.create(null);
  if(!o || typeof o !== "object" || Array.isArray(o)) return r;
  Object.keys(o).forEach(function(k){
    var v = o[k];
    if(!/^ufs\d+$/.test(k) || !v || !Number.isSafeInteger(+v.id) || +v.id <= 0 || k !== "ufs" + (+v.id)) return;
    r[k] = {id:+v.id, nom:String(v.nom || "Son " + v.id).slice(0, 240),
      auteur:String(v.auteur || "Auteur non indiqué").slice(0, 100),
      licence:String(v.licence || "Licence non indiquée").slice(0, 240),
      url:fsonPageSon(+v.id), conversion:String(v.conversion || "Aperçu Freesound importé").slice(0, 300)};
  });
  return r;
}
function fsonVisible(){
  var b = document.getElementById("bib");
  return !!(b && b.classList.contains("show") && BIB.onglet === 4);
}
function fsonMaj(){ if(fsonVisible()) majBibUI(); }
function fsonArreter(){
  var src = FSOUND.source, gain = FSOUND.gain;
  FSOUND.source = null; FSOUND.gain = null; FSOUND.lecture = 0;
  if(src){ src.onended = null; try{ src.stop(); }catch(e){} try{ src.disconnect(); }catch(e){} }
  if(gain) try{ gain.disconnect(); }catch(e){}
}
function fsonAnnuler(){
  if(FSOUND.requete) FSOUND.requete.annulee = true;
  fsonArreter(); FSOUND.cache = null;
}
function fsonValide(r){
  return FSOUND.requete === r && !r.annulee && fsonVisible() && !PROJET_EN_COURS;
}
function fsonErreur(e){
  /* Ne jamais exposer e.message : un transport peut y inclure l'URL et la cle. */
  var t = String(e && e.message ? e.message : e);
  if(/\b(401|403)\b|FSON_CLE/.test(t)) return "Clé refusée. Vérifie la clé API Freesound (pas le mot de passe ni le Client ID).";
  if(/\b429\b/.test(t)){
    FSOUND.temporisation = Date.now() + 60000;
    setTimeout(function(){ fsonMaj(); }, 60100);
    return "Limite de requêtes Freesound atteinte. Réessaie dans une minute.";
  }
  if(/FSON_JSON/.test(t)) return "Réponse Freesound illisible. Réessaie plus tard.";
  if(/FSON_FORMAT/.test(t)) return "Cet aperçu ne peut pas être décodé sur cet appareil.";
  if(/FSON_LONG|trop gros|too large|size limit/i.test(t)) return "Son trop long ou fichier trop volumineux (60 s et 8 Mo maximum).";
  if(/FSON_SAUVE/.test(t)) return "Écriture du son refusée. Aucun import annoncé comme sauvegardé.";
  if(/FSON_CREDITS/.test(t)) return "Stockage des crédits refusé. Import annulé ; vérifie l'espace disponible.";
  if(/FSON_PONT/.test(t)) return "Freesound utilise le pont réseau de l'APK ou de la version Windows, absent dans ce simple fichier HTML.";
  if(/d.lai|timeout|timed out/i.test(t)) return "Le téléchargement a dépassé le délai. Vérifie la connexion et réessaie.";
  if(/\b404\b/.test(t)) return "Ce son ou cet aperçu n'est plus disponible.";
  return "Freesound indisponible. Vérifie la connexion et réessaie.";
}
function fsonDebut(message){
  if(FSOUND.requete || PROJET_EN_COURS || !fsonVisible()) return null;
  if(!HOST || typeof HOST.netCharger !== "function"){
    FSOUND.message = fsonErreur("FSON_PONT"); fsonMaj(); return null;
  }
  var r = {annulee:false}; FSOUND.requete = r;
  FSOUND.message = message; fsonArreter(); fsonMaj();
  return r;
}
function fsonFin(r){
  if(FSOUND.requete === r){ FSOUND.requete = null; fsonMaj(); }
}
function fsonChercher(page, pagination){
  fsonInitialiser();
  if(!FSOUND.cle){ FSOUND.message = "Renseigne d'abord ta clé API Freesound."; fsonMaj(); return Promise.resolve(false); }
  if(Date.now() < FSOUND.temporisation){ FSOUND.message = "Patiente avant une nouvelle recherche (limite Freesound)."; fsonMaj(); return Promise.resolve(false); }
  var o = fsonParametres(pagination && FSOUND.recherche ? FSOUND.recherche : FSOUND);
  page = Math.max(1, Math.floor(+page) || 1);
  var r = fsonDebut("Recherche en cours…");
  if(!r) return Promise.resolve(false);
  return netCharger(fsonAdresseRecherche(o, page, FSOUND.cle), 2 * 1024 * 1024).then(function(b64){
    if(!fsonValide(r)) return false;
    var j;
    try{ j = JSON.parse(texteDeB64(b64)); }catch(e){ throw new Error("FSON_JSON"); }
    if(!j || !Array.isArray(j.results) || !Number.isSafeInteger(+j.count) || +j.count < 0) throw new Error("FSON_JSON");
    FSOUND.resultats = j.results.slice(0, 20).map(fsonResultat).filter(function(x){ return !!x; });
    FSOUND.total = +j.count; FSOUND.page = page; FSOUND.suivant = !!j.next;
    FSOUND.recherche = o; FSOUND.cache = null; FSOUND.infos = null;
    FSOUND.message = j.count ? "Résultats chargés. Choisis ÉCOUTER ou IMPORTER L'APERÇU." : "Aucun son trouvé. Essaie un autre mot ou élargis les filtres.";
    return true;
  }).catch(function(e){
    if(fsonValide(r)) FSOUND.message = fsonErreur(e);
    return false;
  }).then(function(ok){ fsonFin(r); return ok; });
}
function fsonDejaImporte(f){
  var id = "ufs" + f.id;
  if(ES.buf[id]) return true;
  if(!BIB.freesound || !BIB.freesound[id]) return false;
  /* Un effacement depuis une machine peut laisser les credits en bibliotheque.
     Ne pas bloquer le reimport d'un fichier reellement efface. En cas d'erreur
     de lecture, rester prudent et ne rien ecraser. */
  try{
    if(HOST && HOST.echListe){
      var l = HOST.echListe();
      if(typeof l === "string") return l.split("\n").indexOf(id) >= 0;
    }
  }catch(e){}
  return true;
}
function fsonGarder(f, buf){
  if(PROJET_EN_COURS) return false;
  var id = "ufs" + f.id;
  /* Ne jamais ecraser un son deja importe puis retravaille par l'utilisateur. */
  var liste = "";
  if(HOST && HOST.echListe){
    try{ liste = HOST.echListe(); }catch(e){ throw new Error("FSON_SAUVE"); }
    if(liste === null || liste === undefined) throw new Error("FSON_SAUVE");
  }
  if(ES.buf[id] || String(liste).split("\n").indexOf(id) >= 0 || fsonDejaImporte(f)){
    FSOUND.message = "Ce son est déjà dans SONS. Il n'a pas été remplacé."; return false;
  }
  if(!sauverEch(id, buf)) throw new Error("FSON_SAUVE");
  if(!BIB.freesound) BIB.freesound = Object.create(null);
  var ancienNom = BIB.noms[id], anciensCredits = BIB.freesound[id];
  BIB.noms[id] = f.nom.replace(/\.[^.]+$/, "").slice(0, 28);
  BIB.freesound[id] = {id:f.id, nom:f.nom, auteur:f.auteur, licence:f.licence, url:f.url,
    conversion:"Aperçu MP3 HQ Freesound, converti en WAV mono 32 kHz et normalisé à l'import ; 60 s maximum."};
  if(!bibEcrire()){
    if(ancienNom === undefined) delete BIB.noms[id]; else BIB.noms[id] = ancienNom;
    if(anciensCredits === undefined) delete BIB.freesound[id]; else BIB.freesound[id] = anciensCredits;
    try{ if(HOST.echSupprimer) HOST.echSupprimer(id); }catch(e){}
    throw new Error("FSON_CREDITS");
  }
  ES.buf[id] = buf; ES.noms[id] = "freesound";
  FSOUND.message = "Import sauvegardé : " + BIB.noms[id] + ". Retrouve-le dans SONS pour l'affecter à une machine.";
  H.inter(); return true;
}
function fsonSon(f, importer){
  if(!f || !f.apercu || FSOUND.requete || PROJET_EN_COURS || !fsonVisible()) return Promise.resolve(false);
  if(importer && fsonDejaImporte(f)){
    FSOUND.message = "Déjà importé. Retrouve ce son dans SONS."; fsonMaj(); return Promise.resolve(false);
  }
  /* Initialisation dans le geste de l'utilisateur, avant toute attente reseau. */
  try{ audioInit(); banqueEs(); }
  catch(e){ FSOUND.message = "Initialisation audio impossible sur cet appareil."; fsonMaj(); return Promise.resolve(false); }
  var contexte = ctx, r = fsonDebut(importer ? "Import de l'aperçu…" : "Chargement de l'aperçu…");
  if(!r) return Promise.resolve(false);
  var cache = FSOUND.cache;
  var obtenir = cache && cache.id === f.id && cache.ctx === contexte
    ? Promise.resolve(cache.buf)
    : netCharger(f.apercu, 8 * 1024 * 1024).then(function(b64){
        if(!fsonValide(r)) return null;
        var o = b64VersOctets(b64);
        return new Promise(function(ok, rej){
          var termine = false;
          function fini(b){ if(!termine){ termine = true; ok(b); } }
          function rate(){ if(!termine){ termine = true; rej(new Error("FSON_FORMAT")); } }
          try{
            var promesse = contexte.decodeAudioData(o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength), fini, rate);
            if(promesse && promesse.then) promesse.then(fini, rate);
          }catch(e){ rate(); }
        });
      });
  return obtenir.then(function(buf){
    if(!buf || !fsonValide(r) || ctx !== contexte) return false;
    if(!isFinite(buf.duration) || buf.duration <= 0 || buf.duration > FSOUND.limite + 0.1) throw new Error("FSON_LONG");
    FSOUND.cache = {id:f.id, ctx:contexte, buf:buf};
    if(importer) return fsonGarder(f, reduireEch(buf, 32000, FSOUND.limite));
    var src = contexte.createBufferSource(), gain = contexte.createGain();
    src.buffer = buf; gain.gain.value = 0.8; src.connect(gain); gain.connect(master);
    FSOUND.source = src; FSOUND.gain = gain; FSOUND.lecture = f.id;
    src.onended = function(){
      try{ src.disconnect(); gain.disconnect(); }catch(e){}
      if(FSOUND.source === src){ FSOUND.source = null; FSOUND.gain = null; FSOUND.lecture = 0; fsonMaj(); }
    };
    src.start(); FSOUND.message = "Écoute de l'aperçu : " + f.nom; return true;
  }).catch(function(e){
    if(fsonValide(r)){ fsonArreter(); FSOUND.message = fsonErreur(e); }
    return false;
  }).then(function(ok){ fsonFin(r); return ok; });
}
function fsonTexteCredits(f){
  return f.nom + "\nAuteur : " + f.auteur + "\nSource : Freesound\n" + fsonPageSon(f.id) +
    "\nLicence : " + f.licence + "\n" + (f.conversion || "Aperçu MP3 HQ. Le fichier original nécessite une connexion Freesound distincte.");
}
function fsonCopier(texte, champ){
  function secours(){
    champ.focus(); champ.select();
    try{ if(document.execCommand("copy")){ signal("TEXTE COPIÉ"); return; } }catch(e){}
    signal("TEXTE SÉLECTIONNÉ · COPIEZ-LE");
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texte).then(function(){ signal("TEXTE COPIÉ"); }, secours);
  } else secours();
}
function fsonAfficherCredits(parent, f){
  var d = document.createElement("details"); d.className = "fson-credits";
  var s = document.createElement("summary"); s.textContent = "Crédits Freesound · " + fsonLicence(f.licence); d.appendChild(s);
  var t = document.createElement("textarea"); t.readOnly = true; t.rows = 6;
  t.setAttribute("aria-label", "Crédits et adresse du son"); t.value = fsonTexteCredits(f); d.appendChild(t);
  boutonBib(d, "COPIER LES CRÉDITS", function(){ fsonCopier(t.value, t); });
  parent.appendChild(d);
}
function bibRendreFreesound(corps){
  fsonInitialiser();
  var racine = document.createElement("div"); racine.className = "fson"; corps.appendChild(racine);
  var occupe = !!FSOUND.requete;
  function texte(parent, tag, contenu){ var e = document.createElement(tag); e.textContent = contenu; parent.appendChild(e); return e; }
  texte(racine, "h3", "Freesound · banque de sons en ligne");
  texte(racine, "p", "Recherche, écoute et import des aperçus MP3 HQ. Les imports sont conservés en mono 32 kHz, jusqu'à 60 secondes, dans SONS. Ce ne sont pas les fichiers originaux.");
  var reg = document.createElement("details"); reg.className = "fson-reglages"; reg.open = !FSOUND.cle; racine.appendChild(reg);
  texte(reg, "summary", FSOUND.cle ? "Clé API configurée · réglages" : "Configurer ma clé API Freesound");
  texte(reg, "p", "Crée un compte Freesound, puis une clé API personnelle à l'adresse ci-dessous. Utilise « Client secret / API key », jamais ton mot de passe. Ne partage pas cette clé.");
  var adresse = document.createElement("input"); adresse.readOnly = true; adresse.value = "https://freesound.org/apiv2/apply/";
  adresse.setAttribute("aria-label", "Adresse pour obtenir une clé Freesound"); reg.appendChild(adresse);
  boutonBib(reg, "COPIER L'ADRESSE", function(){ fsonCopier(adresse.value, adresse); });
  var labelCle = texte(reg, "label", "Clé API personnelle"); labelCle.htmlFor = "fson-cle";
  var cle = document.createElement("input"); cle.id = "fson-cle"; cle.type = "password"; cle.autocomplete = "off";
  cle.spellcheck = false; cle.maxLength = 128; cle.placeholder = FSOUND.cle ? "Nouvelle clé (l'actuelle reste masquée)" : "Coller la clé API ici"; reg.appendChild(cle);
  var garder = document.createElement("label"); garder.className = "fson-cocher";
  var caseG = document.createElement("input"); caseG.type = "checkbox"; caseG.checked = FSOUND.retenue; garder.appendChild(caseG);
  garder.appendChild(document.createTextNode("Retenir la clé sur cet appareil")); reg.appendChild(garder);
  texte(reg, "p", "Sans cette case, la clé reste uniquement en mémoire jusqu'à la fermeture ou au rechargement. Elle n'est jamais incluse dans les projets .drm16. Le stockage local n'est pas un coffre-fort chiffré.");
  var ac = document.createElement("div"); ac.className = "bib-actions"; reg.appendChild(ac);
  boutonBib(ac, "UTILISER LA CLÉ", function(){
    if(!fsonDefinirCle(cle.value || FSOUND.cle, caseG.checked)) FSOUND.message = "La clé semble incomplète. Copie la valeur de Client secret / API key.";
    cle.value = ""; fsonMaj();
  }).disabled = occupe;
  if(FSOUND.cle) boutonBib(ac, "OUBLIER LA CLÉ", fsonOublierCle);

  var form = document.createElement("form"); form.className = "fson-recherche"; racine.appendChild(form);
  var lab = texte(form, "label", "Rechercher un son"); lab.htmlFor = "fson-query";
  var q = document.createElement("input"); q.type = "search"; q.id = "fson-query"; q.maxLength = 160;
  q.value = FSOUND.query; q.placeholder = "kick, snare, bass, loop…"; q.disabled = occupe;
  q.addEventListener("input", function(){ FSOUND.query = q.value; }); form.appendChild(q);
  var filtres = document.createElement("div"); filtres.className = "fson-filtres"; form.appendChild(filtres);
  function select(nom, titre, options){
    var l = texte(filtres, "label", titre), s = document.createElement("select"); s.id = "fson-" + nom; l.htmlFor = s.id;
    options.forEach(function(v){ var o = document.createElement("option"); o.value = v[0]; o.textContent = v[1]; s.appendChild(o); });
    s.value = FSOUND[nom]; s.disabled = occupe; s.addEventListener("change", function(){ FSOUND[nom] = s.value; }); l.appendChild(s);
  }
  select("licence", "Licence", [["", "Toutes les licences"], ["Creative Commons 0", "CC0"], ["Attribution", "CC BY"], ["Attribution NonCommercial", "CC BY-NC"]]);
  select("duree", "Durée maximale", [[8, "8 s · sons courts"], [30, "30 s · boucles"], [60, "60 s"]]);
  select("tri", "Trier", [["score", "Pertinence"], ["downloads_desc", "Plus téléchargés"], ["created_desc", "Plus récents"], ["duration_asc", "Plus courts"]]);
  var lancer = document.createElement("button"); lancer.type = "submit"; lancer.textContent = occupe ? "CHARGEMENT…" : "RECHERCHER";
  lancer.disabled = occupe || !FSOUND.cle || Date.now() < FSOUND.temporisation; form.appendChild(lancer);
  form.addEventListener("submit", function(e){ e.preventDefault(); fsonChercher(1, false); });
  var statut = texte(racine, "p", FSOUND.message || "Configure ta clé, puis lance une recherche. Aucune requête automatique n'est envoyée à l'ouverture.");
  statut.className = "fson-statut"; statut.setAttribute("role", "status"); statut.setAttribute("aria-live", "polite");
  if(occupe) boutonBib(racine, FSOUND.requete.annulee ? "ANNULATION EN COURS…" : "ANNULER", function(){
    fsonAnnuler(); FSOUND.message = "Requête annulée : son résultat sera ignoré. Le téléchargement en cours doit se terminer avant un nouvel essai."; fsonMaj();
  }).disabled = FSOUND.requete.annulee;
  if(FSOUND.source) boutonBib(racine, "ARRÊTER L'ÉCOUTE", function(){ fsonArreter(); fsonMaj(); });
  if(FSOUND.page){
    texte(racine, "h3", FSOUND.total + " résultats · page " + FSOUND.page);
    texte(racine, "p", "Recherche : " + (FSOUND.recherche.query || "tous les sons") + " · " + FSOUND.recherche.duree + " s maximum. Chaque son conserve sa propre licence.");
  }
  FSOUND.resultats.forEach(function(f){
    var li = ligneBib(f.nom, f.auteur + " · " + f.duree.toFixed(2) + " s · " + fsonLicence(f.licence));
    var a = document.createElement("div"); a.className = "bib-actions"; li.appendChild(a);
    boutonBib(a, FSOUND.lecture === f.id ? "ARRÊTER" : "ÉCOUTER", function(){
      if(FSOUND.lecture === f.id){ fsonArreter(); fsonMaj(); } else fsonSon(f, false);
    }).disabled = occupe || !f.apercu;
    boutonBib(a, fsonDejaImporte(f) ? "DÉJÀ IMPORTÉ" : "IMPORTER L'APERÇU", function(){ fsonSon(f, true); }, false).disabled = occupe || !f.apercu || fsonDejaImporte(f);
    if(!f.apercu) texte(li, "p", "Aperçu MP3 HQ indisponible pour ce son.");
    fsonAfficherCredits(li, f); racine.appendChild(li);
  });
  if(FSOUND.page){
    var pages = document.createElement("div"); pages.className = "bib-actions"; racine.appendChild(pages);
    boutonBib(pages, "◀ PRÉCÉDENTE", function(){ fsonChercher(FSOUND.page - 1, true); }).disabled = occupe || FSOUND.page <= 1;
    boutonBib(pages, "SUIVANTE ▶", function(){ fsonChercher(FSOUND.page + 1, true); }).disabled = occupe || !FSOUND.suivant;
  }
  var retour = document.createElement("div"); retour.className = "bib-actions"; racine.appendChild(retour);
  boutonBib(retour, "MES SONS IMPORTÉS", function(){ BIB.onglet = 0; majBibUI(); });
}
/* Fermeture par une autre machine/panneau : stopper aussi, sans modifier les
   autres lecteurs. Les resultats tardifs ne declenchent ni son ni import. */
(function(){
  var b = document.getElementById("bib");
  if(b && typeof MutationObserver !== "undefined") new MutationObserver(function(){
    if(!b.classList.contains("show")) fsonAnnuler();
  }).observe(b, {attributes:true, attributeFilter:["class"]});
  document.addEventListener("visibilitychange", function(){ if(document.hidden) fsonAnnuler(); });
})();
