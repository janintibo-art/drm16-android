/* ================= confort sur ordinateur (v146) =================
   Clavier, glisser-déposer et plein écran. Rien de tout cela ne gêne le
   téléphone : sans clavier ni souris, ces écouteurs ne se déclenchent jamais.

   Raccourcis (jamais pendant une saisie dans un champ) :
     Espace       lecture / arrêt de la machine affichée (le même bouton qu'à l'écran)
     Échap        ferme le panneau ouvert (notice, bibliothèque, table…)
     F11          plein écran
     Ctrl+S       enregistre le projet .drm16
     Ctrl+O       ouvre un projet (choix du fichier)
   Glisser-déposer : un projet .drm16 s'ouvre, un fichier son rejoint la
   bibliothèque. */

function champDeSaisie(t){
  return !!t && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName || ""));
}
function visible(el){
  return !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
}
/* Le bouton de lecture de ce qui est à l'écran : chaque machine a le sien
   (em-play, tr8-start, fsw pour la DRM16…), la table de mixage aussi. */
function boutonLectureVisible(){
  var p = panneauVisible();
  if(p && p !== "table") return null;
  if(!p && !menu.classList.contains("hide")) return null;
  var l = document.querySelectorAll(p === "table" ? "#table-play" : "#fsw,[id$='-play'],[id$='-start']");
  for(var i=0;i<l.length;i++) if(visible(l[i]) && !l[i].closest("#table")) return l[i];
  return p === "table" && l[0] && visible(l[0]) ? l[0] : null;
}
function basculerPleinEcran(){
  if(HOST.pleinEcran){ try{ HOST.pleinEcran(); }catch(e){} return; }
  try{
    if(document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }catch(e){}
}
document.addEventListener("keydown", function(e){
  if(champDeSaisie(e.target) || e.defaultPrevented) return;
  var ctrl = e.ctrlKey || e.metaKey, touche = (e.key || "").toLowerCase();
  if(e.key === " " && !ctrl && !e.altKey){
    var b = boutonLectureVisible();
    if(b){ e.preventDefault(); b.click(); }
    return;
  }
  if(e.key === "Escape"){
    var p = panneauVisible(), f = p && document.getElementById(p + "-fermer");
    if(f){ e.preventDefault(); f.click(); }
    return;
  }
  if(e.key === "F11"){ e.preventDefault(); basculerPleinEcran(); return; }
  if(ctrl && !e.altKey && touche === "s"){
    e.preventDefault();
    if(projetEnregistrer("projet") && panneauVisible() === "bib") majBibUI();
    return;
  }
  if(ctrl && !e.altKey && touche === "o"){ e.preventDefault(); projetOuvrirFichierExterne(); }
});

/* ---------- glisser-déposer ---------- */
function glisseDesFichiers(e){
  var t = e.dataTransfer && e.dataTransfer.types;
  return !!t && Array.prototype.indexOf.call(t, "Files") >= 0;
}
var DEPOT = {profondeur:0};
document.addEventListener("dragenter", function(e){
  if(!glisseDesFichiers(e)) return;
  DEPOT.profondeur++;
  document.body.classList.add("depot");
});
document.addEventListener("dragleave", function(e){
  if(!glisseDesFichiers(e)) return;
  DEPOT.profondeur = Math.max(0, DEPOT.profondeur - 1);
  if(!DEPOT.profondeur) document.body.classList.remove("depot");
});
document.addEventListener("dragover", function(e){
  if(!glisseDesFichiers(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
});
document.addEventListener("drop", function(e){
  if(!glisseDesFichiers(e)) return;
  e.preventDefault();
  DEPOT.profondeur = 0;
  document.body.classList.remove("depot");
  var fs = Array.prototype.slice.call(e.dataTransfer.files || []);
  var projet = fs.filter(function(f){ return /\.drm16$/i.test(f.name); })[0];
  if(projet){                         /* un projet remplace tout : il passe seul */
    if(projet.size > PROJET_MAX){ signal("PROJET TROP GROS"); return; }
    var r = new FileReader();
    r.onload = function(){ projetOuvrir(String(r.result), projet.name); };
    r.onerror = function(){ signal("LECTURE IMPOSSIBLE"); };
    r.readAsText(projet, "utf-8");
    return;
  }
  var inconnus = [];
  fs.forEach(function(f){
    if(/^audio\//.test(f.type) || /\.(wav|wave|aif|aiff|mp3|ogg|oga|flac|m4a)$/i.test(f.name)) importerSonFichier(f);
    else inconnus.push(f.name);
  });
  if(inconnus.length) signal("FICHIER NON RECONNU : " + inconnus.join(", ").toUpperCase());
});

/* ---------- liens externes (v147) ----------
   L'application ne va jamais sur Internet d'elle-même : sur Android, la
   WebView bloque déjà toute adresse extérieure (shouldOverrideUrlLoading). On
   fait pareil partout — ordinateur compris, où un lien aurait ouvert une page
   distante dans la fenêtre — et on le dit, au lieu d'un appui sans effet.
   Les pages invitées (studio, nexus) sont surveillées aussi. */
function lienExterne(e){
  var a = e.target && e.target.closest && e.target.closest("a[href]");
  if(!a) return;
  var h = a.getAttribute("href") || "";
  if(!/^(https?:)?\/\//i.test(h)) return;
  e.preventDefault();
  var hote = h.replace(/^(https?:)?\/\//i, "").split(/[\/?#]/)[0];
  signal("LIEN EXTERNE NON OUVERT · " + hote.toUpperCase());
}
document.addEventListener("click", lienExterne, true);
document.addEventListener("load", function(e){
  var f = e.target;
  if(!f || f.tagName !== "IFRAME") return;
  try{ f.contentDocument.addEventListener("click", lienExterne, true); }catch(err){}
}, true);
