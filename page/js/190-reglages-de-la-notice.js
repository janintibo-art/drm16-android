/* ================= réglages de la notice ================= */
function releveAudio(){
  if(!ctx) return "MOTEUR AUDIO PAS ENCORE DÉMARRÉ";
  var min = AUDIT.tJeu / 60000;
  return Math.round(ctx.sampleRate/100)/10 + " kHz · " + ctx.state +
         " · SORTIE " + Math.round((ctx.baseLatency || 0) * 1000) + " ms" +
         " · " + Math.round(min * 10) / 10 + " MIN DE JEU" +
         " · PIC " + AUDIT.pic + " SOURCES DONT " + AUDIT.picAvenir + " À VENIR" +
         " · PAUSE MAX " + AUDIT.pause + " ms" +
         (AUDIT.trous ? " (" + AUDIT.trous + " AU-DESSUS DE 150)" : " (AUCUN TROU)") +
         " · " + AUDIT.decroche + " RECALAGES" +
         (min > 0.2 ? " (" + (Math.round(AUDIT.decroche / min * 10) / 10) + " PAR MIN)" : "") +
         (AUDIT.relances ? " · " + AUDIT.relances + " RELANCES" : "");
}
/* ---------- latence de sortie (v144) ----------
   Le compromis entre réactivité et sûreté. « Sûre » (grand tampon) reste le
   choix d'Android, où les coupures étaient le premier souci ; sur ordinateur,
   « moyenne » est un meilleur départ pour jouer aux pads. Changer relance le
   moteur audio, comme le bouton RELANCER. */
var LATENCES = [["interactive", "COURTE"], ["balanced", "MOYENNE"], ["playback", "SÛRE"]];
function latenceChoisie(){
  for(var i=0;i<LATENCES.length;i++) if(LATENCES[i][0] === memoire.latence) return memoire.latence;
  return HOST.plateforme === "android" ? "playback" : "balanced";
}
function nomLatence(v){
  for(var i=0;i<LATENCES.length;i++) if(LATENCES[i][0] === v) return LATENCES[i][1];
  return v;
}
function majLatence(){
  var b = document.getElementById("b-latence");
  if(b) b.textContent = "LATENCE : " + nomLatence(latenceChoisie());
}
document.getElementById("b-latence").addEventListener("click", function(){
  var k = 0, v = latenceChoisie();
  for(var i=0;i<LATENCES.length;i++) if(LATENCES[i][0] === v) k = i;
  memoire.latence = LATENCES[(k + 1) % LATENCES.length][0];
  writeMem();
  majLatence();
  if(ctx && !ctx.startRendering) refaireAudio();
  var ms = ctx ? Math.round(((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000) : 0;
  signal("LATENCE " + nomLatence(latenceChoisie()) + (ms ? " · SORTIE " + ms + " ms" : ""));
  H.inter();
});
majLatence();

/* ---------- qualité des saturations de voie (v154, phase B6) ----------
   Les saturations qui traitent TOUT le son d'une machine (TR, TD-3, TR-1000,
   DrumBrute) tournent en 2x : le 4x replie beaucoup moins (−69 dB au lieu de
   −38 à 1,76 kHz, voir docs/mesures-son.md) mais demande environ deux fois plus
   de calcul, en continu. Chacun choisit selon son appareil ; le réglage
   s'applique tout de suite aux saturations déjà construites. */
var SAT_VOIES = [];
function qualiteSaturation(){ return memoire.satHaute ? "4x" : "2x"; }
function saturationDeVoie(noeud){
  SAT_VOIES = SAT_VOIES.filter(function(n){ return n.context === ctx; });
  SAT_VOIES.push(noeud);
  return qualiteSaturation();
}
function majQualiteSat(){
  var b = document.getElementById("b-satq");
  if(b) b.textContent = "SATURATIONS : " + (memoire.satHaute ? "HAUTE QUALITÉ" : "ÉCONOMES");
}
document.getElementById("b-satq").addEventListener("click", function(){
  memoire.satHaute = !memoire.satHaute;
  writeMem();
  SAT_VOIES.forEach(function(n){ if(n.context === ctx) n.oversample = qualiteSaturation(); });
  majQualiteSat();
  signal(memoire.satHaute ? "SATURATIONS EN 4x · PLUS PROPRE, PLUS DE CALCUL" : "SATURATIONS EN 2x · ÉCONOMES");
  H.inter();
});
majQualiteSat();
/* v239 : format des WAV rendus (motif, song EM-1, prise MIDI, chaîne SmplTrek). */
function majBitsWav(){
  var b = document.getElementById("b-wav24");
  if(b) b.textContent = "EXPORT WAV : " + (memoire.wav24 ? "24 BITS" : "16 BITS + DITHER");
}
document.getElementById("b-wav24").addEventListener("click", function(){
  memoire.wav24 = !memoire.wav24;
  writeMem();
  majBitsWav();
  signal(memoire.wav24 ? "EXPORT EN 24 BITS · PLUS FIN, FICHIERS 1,5 FOIS PLUS GROS"
                       : "EXPORT EN 16 BITS AVEC DITHER · LE PLUS COMPATIBLE");
  H.inter();
});
majBitsWav();

document.getElementById("b-audio-etat").addEventListener("click", function(){
  ouvrirEtatAudio();
});
document.getElementById("b-audio-relance").addEventListener("click", function(){
  refaireAudio();
});
document.getElementById("b-panique").addEventListener("click", function(){
  stop();
  midiPanique();
  if(master && ctx){
    var now = maintenantAudio();
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(0.0001, now, 0.008);
    master.gain.setValueAtTime(0.0001, now+0.25);
    master.gain.linearRampToValueAtTime(S.vol, now+0.35);
  }
  couperSourcesFutures();
  reveillerAudio();
  signal("TOUT COUPÉ");
  H.stop();
});


/* v201 : diagnostic stable et remise à zéro indépendante du moteur. */
function actualiserEtatAudio(){
  document.getElementById("audio-releve").textContent = releveAudio().split(" · ").join("\n");
}
function ouvrirEtatAudio(){
  actualiserEtatAudio();
  var d = document.getElementById("audio-diagnostic");
  if(!d.open) d.showModal();
}
function resetAuditAudio(){
  ["decroche","quand","relances","pic","picAvenir","pause","trous","tours","tDernier","tJeu"].forEach(function(k){ AUDIT[k] = 0; });
  actualiserEtatAudio();
}
document.getElementById("audio-actualiser").addEventListener("click", actualiserEtatAudio);
document.getElementById("audio-reset").addEventListener("click", resetAuditAudio);
document.getElementById("audio-relancer").addEventListener("click", function(){ refaireAudio(); actualiserEtatAudio(); });
document.getElementById("audio-fermer").addEventListener("click", function(){ document.getElementById("audio-diagnostic").close(); });

/* ---------- diagnostic général DRM16 (v303) ----------
   Étend le relevé audio existant sans toucher au moteur. Les tests qui écrivent
   utilisent uniquement un petit fichier temporaire à nom unique, relu puis
   supprimé. Réseau, MIDI et micro restent facultatifs : DRM16 doit continuer à
   fonctionner hors ligne et sans matériel branché. */
var DIAG303 = {
  version:"303", stockage:"attente", reseau:"attente", micro:"attente",
  erreurs:[], dernier:"", enCours:false
};
window.addEventListener("error", function(e){
  if(DIAG303.erreurs.length < 12) DIAG303.erreurs.push(String(e && e.message ? e.message : e));
  diagMajRapide();
});
window.addEventListener("unhandledrejection", function(e){
  var r = e && e.reason;
  if(DIAG303.erreurs.length < 12) DIAG303.erreurs.push("promesse : " + String(r && r.message ? r.message : r));
  diagMajRapide();
});
function diagCreer(n, classe, texte){
  var e = document.createElement(n);
  if(classe) e.className = classe;
  if(texte !== undefined) e.textContent = texte;
  return e;
}
function diagLigne(id, nom){
  var l = diagCreer("div", "diag-ligne"); l.id = id; l.dataset.etat = "attente";
  l.appendChild(diagCreer("strong", "diag-nom", nom));
  l.appendChild(diagCreer("span", "diag-etat", "À TESTER"));
  l.appendChild(diagCreer("span", "diag-detail", ""));
  return l;
}
function diagCarte(titre, lignes){
  var s = diagCreer("section", "diag-carte"); s.appendChild(diagCreer("h3", "", titre));
  lignes.forEach(function(l){ s.appendChild(l); }); return s;
}
function diagTexteEtat(etat){
  if(etat === "ok") return "OK";
  if(etat === "fail") return "ERREUR";
  if(etat === "warn") return "À VÉRIFIER";
  if(etat === "info") return "INFO";
  return "À TESTER";
}
function diagPoser(id, etat, detail){
  var l = document.getElementById(id); if(!l) return;
  l.dataset.etat = etat;
  var e = l.querySelector(".diag-etat"), d = l.querySelector(".diag-detail");
  if(e) e.textContent = diagTexteEtat(etat);
  if(d) d.textContent = detail || "";
  diagResume();
}
function diagResume(){
  var r = document.getElementById("diag-resume"); if(!r) return;
  var lignes = document.querySelectorAll("#audio-diagnostic .diag-ligne"), erreurs = 0, avis = 0, attente = 0;
  for(var i=0;i<lignes.length;i++){
    if(lignes[i].dataset.etat === "fail") erreurs++;
    else if(lignes[i].dataset.etat === "warn") avis++;
    else if(lignes[i].dataset.etat === "attente") attente++;
  }
  if(erreurs) { r.dataset.etat = "fail"; r.textContent = erreurs + " problème" + (erreurs>1?"s":"") + " à corriger" + (avis ? " · " + avis + " point" + (avis>1?"s":"") + " à vérifier" : ""); }
  else if(avis) { r.dataset.etat = "warn"; r.textContent = "Aucun défaut essentiel détecté · " + avis + " point" + (avis>1?"s":"") + " à vérifier"; }
  else if(attente) { r.dataset.etat = "info"; r.textContent = "Contrôles rapides terminés · " + attente + " test" + (attente>1?"s":"") + " à lancer"; }
  else { r.dataset.etat = "ok"; r.textContent = "Aucun défaut détecté par les contrôles disponibles"; }
}
function diagTestLocal(){
  try{
    var k = "drm16.diag303." + Date.now();
    localStorage.setItem(k, "ok");
    var bon = localStorage.getItem(k) === "ok";
    localStorage.removeItem(k);
    diagPoser("diag-local", bon ? "ok" : "fail", bon ? "écriture, lecture et suppression possibles" : "valeur relue différente");
  }catch(e){ diagPoser("diag-local", "fail", "mémoire locale refusée : " + (e.message || e)); }
}
function diagMajMidi(){
  try{
    if(!HOST || !HOST.a || !HOST.a("midiDispo")){ diagPoser("diag-midi", "info", "pont MIDI non disponible sur cette plateforme"); return; }
    if(!HOST.midiDispo()){ diagPoser("diag-midi", "info", "API MIDI absente sur cet appareil"); return; }
    var texte = HOST.a("midiAppareils") ? String(HOST.midiAppareils() || "") : String(HOST.midiListe() || "");
    var n = texte.split("\n").filter(function(x){ return x.trim(); }).length;
    var ouvert = HOST.a("midiOuvertId") ? HOST.midiOuvertId() : -1;
    diagPoser("diag-midi", n ? "ok" : "info", n + " appareil" + (n>1?"s":"") + " détecté" + (n>1?"s":"") + (ouvert >= 0 ? " · connexion ouverte" : " · aucun ouvert"));
  }catch(e){ diagPoser("diag-midi", "warn", "inventaire MIDI impossible : " + (e.message || e)); }
}
function diagMajAudio303(){
  if(!ctx){ diagPoser("diag-audio", "info", "moteur pas encore démarré"); return; }
  var ms = Math.round(((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000);
  diagPoser("diag-audio", ctx.state === "closed" ? "fail" : (ctx.state === "running" ? "ok" : "warn"),
    Math.round(ctx.sampleRate/100)/10 + " kHz · " + ctx.state + " · sortie " + ms + " ms" + (S.run ? " · lecture en cours" : " · arrêté"));
}
function diagMajRapide(){
  var plateforme = (window.HOST && HOST.plateforme) ? HOST.plateforme : "inconnue";
  diagPoser("diag-version", "ok", "v" + DIAG303.version);
  diagPoser("diag-plateforme", plateforme === "inconnue" ? "warn" : "ok", plateforme.toUpperCase());
  diagTestLocal();
  diagMajAudio303();
  diagMajMidi();
  diagPoser("diag-js", DIAG303.erreurs.length ? "fail" : "ok", DIAG303.erreurs.length ? DIAG303.erreurs.length + " erreur(s) depuis l'ouverture" : "aucune erreur capturée");
  if(DIAG303.stockage === "attente"){
    if(!HOST || !HOST.a || !HOST.a("fichierSauver")) diagPoser("diag-stockage", "info", "pas de stockage natif dans cette version navigateur");
    else diagPoser("diag-stockage", "attente", "test lecture/écriture non lancé");
  }
  if(DIAG303.reseau === "attente"){
    if(!HOST || !HOST.a || !HOST.a("netCharger")) diagPoser("diag-reseau", "info", "pont réseau natif non disponible");
    else diagPoser("diag-reseau", "attente", "facultatif · non testé");
  }
  if(DIAG303.micro === "attente"){
    var api = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    diagPoser("diag-micro", api ? "attente" : "info", api ? "API présente · autorisation non testée" : "API micro indisponible");
  }
  actualiserEtatAudio();
}
function diagTestStockage(){
  return new Promise(function(resolve){
    if(!HOST || !HOST.a || !HOST.a("fichierSauver") || !HOST.a("fichierCharger") || !HOST.a("fichierSupprimer")){
      DIAG303.stockage = "info"; diagPoser("diag-stockage", "info", "stockage natif absent · mémoire locale testée séparément"); resolve(); return;
    }
    var nom = "drm16_diag_v303_" + Date.now().toString(36) + "_" + Math.floor(Math.random()*1000000) + ".tmp";
    var texte = "DRM16-DIAG-V303-" + Date.now(), b64 = btoa(texte), cree = false;
    try{
      diagPoser("diag-stockage", "attente", "test en cours…");
      var chemin = HOST.fichierSauver(nom, b64); cree = !!chemin;
      if(!cree) throw new Error("écriture refusée");
      if(HOST.fichierCharger(nom) !== b64) throw new Error("relecture différente");
      if(!HOST.fichierSupprimer(nom)) throw new Error("suppression refusée");
      cree = false; DIAG303.stockage = "ok";
      diagPoser("diag-stockage", "ok", "fichier temporaire écrit, relu et supprimé");
    }catch(e){
      DIAG303.stockage = "fail";
      diagPoser("diag-stockage", "fail", String(e && e.message ? e.message : e));
    }finally{
      if(cree){ try{ HOST.fichierSupprimer(nom); }catch(e){} }
      resolve();
    }
  });
}
function diagTestReseau(){
  return new Promise(function(resolve){
    if(!HOST || !HOST.a || !HOST.a("netCharger") || typeof netCharger !== "function"){
      DIAG303.reseau = "info"; diagPoser("diag-reseau", "info", "réseau natif non disponible ici"); resolve(); return;
    }
    diagPoser("diag-reseau", "attente", "connexion HTTPS en cours…");
    netCharger("https://archive.org/robots.txt", 256 * 1024).then(function(b64){
      var n = 0; try{ n = atob(b64 || "").length; }catch(e){}
      if(n <= 0) throw new Error("réponse vide");
      DIAG303.reseau = "ok"; diagPoser("diag-reseau", "ok", "HTTPS répond · " + n + " octets reçus"); resolve();
    }).catch(function(e){
      DIAG303.reseau = "warn"; diagPoser("diag-reseau", "warn", "hors ligne ou accès refusé · " + String(e)); resolve();
    });
  });
}
function diagTestMicro(){
  return new Promise(function(resolve){
    if(!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)){
      DIAG303.micro = "info"; diagPoser("diag-micro", "info", "API micro indisponible"); resolve(); return;
    }
    try{
      if(HOST && HOST.plateforme === "android" && HOST.a && HOST.a("micro") && !HOST.micro()){
        DIAG303.micro = "warn";
        diagPoser("diag-micro", "warn", "autorisation demandée · retouchez TESTER MICRO après votre choix");
        resolve(); return;
      }
    }catch(e){
      DIAG303.micro = "warn"; diagPoser("diag-micro", "warn", "demande d'autorisation impossible"); resolve(); return;
    }
    diagPoser("diag-micro", "attente", "ouverture brève du micro…");
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(flux){
      try{ flux.getTracks().forEach(function(t){ t.stop(); }); }catch(e){}
      DIAG303.micro = "ok"; diagPoser("diag-micro", "ok", "capture ouverte puis arrêtée correctement"); resolve();
    }).catch(function(e){
      DIAG303.micro = "warn"; diagPoser("diag-micro", "warn", "refusé ou indisponible · " + String(e && e.name ? e.name : e)); resolve();
    });
  });
}
function diagTestTout(){
  if(DIAG303.enCours) return;
  DIAG303.enCours = true;
  var b = document.getElementById("diag-tout"); if(b) b.disabled = true;
  diagMajRapide();
  Promise.resolve().then(diagTestStockage).then(diagTestReseau).then(diagTestMicro).then(function(){
    DIAG303.enCours = false; if(b) b.disabled = false; diagMajRapide();
    signal("DIAGNOSTIC TERMINÉ");
  }, function(e){
    DIAG303.enCours = false; if(b) b.disabled = false;
    DIAG303.erreurs.push("diagnostic : " + String(e)); diagMajRapide(); signal("DIAGNOSTIC INTERROMPU");
  });
}
function diagRapport(){
  diagMajRapide();
  var lignes = ["DRM16 — DIAGNOSTIC v" + DIAG303.version, "DATE : " + new Date().toISOString()];
  var r = document.querySelectorAll("#audio-diagnostic .diag-ligne");
  for(var i=0;i<r.length;i++){
    var nom = r[i].querySelector(".diag-nom"), etat = r[i].querySelector(".diag-etat"), detail = r[i].querySelector(".diag-detail");
    lignes.push((nom ? nom.textContent : r[i].id) + " : " + (etat ? etat.textContent : "") + (detail && detail.textContent ? " · " + detail.textContent : ""));
  }
  lignes.push("AUDIO : " + releveAudio());
  if(window.performance && performance.memory){
    lignes.push("MÉMOIRE JS : " + Math.round(performance.memory.usedJSHeapSize/1048576) + " Mo utilisés / " + Math.round(performance.memory.jsHeapSizeLimit/1048576) + " Mo limite");
  }
  if(DIAG303.erreurs.length) lignes.push("ERREURS : " + DIAG303.erreurs.slice(0,3).join(" | "));
  return lignes.join("\n");
}
function diagCopierRapport(){
  var texte = diagRapport();
  function fini(ok){ signal(ok ? "RAPPORT DIAGNOSTIC COPIÉ" : "COPIE DU RAPPORT IMPOSSIBLE"); }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texte).then(function(){ fini(true); }, function(){ diagCopieSecours(texte, fini); });
  } else diagCopieSecours(texte, fini);
}
function diagCopieSecours(texte, rappel){
  var ta = document.createElement("textarea"); ta.value = texte; ta.setAttribute("readonly", "");
  ta.style.position = "fixed"; ta.style.left = "-9999px"; document.body.appendChild(ta); ta.select();
  var ok = false; try{ ok = document.execCommand("copy"); }catch(e){} document.body.removeChild(ta); rappel(ok);
}
(function installerDiagnostic303(){
  var d = document.getElementById("audio-diagnostic"); if(!d || d.dataset.diag303) return;
  d.dataset.diag303 = "1";
  var tuile = document.getElementById("menu-audio");
  if(tuile){
    var tb = tuile.querySelector("b"), ts = tuile.querySelector("span");
    if(tb) tb.textContent = "DIAGNOSTIC DRM16";
    if(ts) ts.textContent = "AUDIO · STOCKAGE · RÉSEAU · MIDI · MICRO";
  }
  var titre = document.getElementById("audio-titre"); if(titre) titre.textContent = "DIAGNOSTIC DRM16";
  var resume = diagCreer("div", "diag-resume", "Contrôles rapides en cours…"); resume.id = "diag-resume";
  var grille = diagCreer("div", "diag-grille");
  grille.appendChild(diagCarte("SYSTÈME", [diagLigne("diag-version","VERSION"), diagLigne("diag-plateforme","PLATEFORME"), diagLigne("diag-local","MÉMOIRE LOCALE"), diagLigne("diag-js","ERREURS JS")]));
  grille.appendChild(diagCarte("APPLICATION", [diagLigne("diag-audio","MOTEUR AUDIO"), diagLigne("diag-stockage","STOCKAGE FICHIERS"), diagLigne("diag-reseau","RÉSEAU HTTPS")]));
  grille.appendChild(diagCarte("MATÉRIEL", [diagLigne("diag-midi","MIDI"), diagLigne("diag-micro","MICRO")]));
  var pre = document.getElementById("audio-releve");
  if(titre && titre.parentNode){ titre.parentNode.insertBefore(resume, titre.nextSibling); resume.parentNode.insertBefore(grille, resume.nextSibling); }
  if(pre) pre.parentNode.insertBefore(diagCreer("h3", "diag-audio-titre", "RELEVÉ AUDIO DÉTAILLÉ"), pre);
  var note = diagCreer("p", "diag-note", "Le réseau, le MIDI et le micro sont facultatifs : un avertissement sur ces lignes n'empêche pas DRM16 de jouer hors ligne. Le test stockage écrit uniquement un petit fichier temporaire puis le supprime.");
  var actions = d.querySelector(".audio-actions"); if(actions) d.insertBefore(note, actions);
  var da = diagCreer("div", "diag-actions");
  [["diag-tout","TESTER TOUT",diagTestTout],["diag-stockage-b","STOCKAGE",diagTestStockage],["diag-reseau-b","RÉSEAU",diagTestReseau],["diag-micro-b","MICRO",diagTestMicro],["diag-copier","COPIER RAPPORT",diagCopierRapport]].forEach(function(x){
    var b = diagCreer("button", "", x[1]); b.id = x[0]; b.type = "button"; b.addEventListener("click", function(){ x[2](); }); da.appendChild(b);
  });
  if(actions) d.insertBefore(da, actions); else d.appendChild(da);
  document.getElementById("audio-actualiser").addEventListener("click", diagMajRapide);
  var ouvrirAvant = ouvrirEtatAudio;
  ouvrirEtatAudio = function(){ diagMajRapide(); ouvrirAvant(); };
  diagMajRapide();
})();
