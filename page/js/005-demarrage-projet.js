/* v180 : aucune machine ne lit sa mémoire avant la reprise d'une ouverture
   interrompue. Le script inerte est lancé globalement, sans eval ni enveloppe
   de fonction, pour conserver les points d'entrée des ponts et de la page. */
var PROJET_DEMARRAGE = {bloque:false, lance:false, rechargement:null};

function projetBloquerReprise(){
  PROJET_DEMARRAGE.bloque = true;
  PROJET_EN_COURS = true;
  var reprise = typeof PROJET_REPRISE === "object" && PROJET_REPRISE ? PROJET_REPRISE : {};
  var voile = document.getElementById("projet-reprise");
  if(!voile){
    voile = document.createElement("section");
    voile.id = "projet-reprise";
    voile.setAttribute("role", "alertdialog");
    voile.setAttribute("aria-modal", "true");
    voile.setAttribute("aria-labelledby", "projet-reprise-titre");
    voile.setAttribute("aria-describedby", "projet-reprise-texte");
    /* L'écran doit aussi être visible avant la classe body.pret. */
    voile.style.cssText = "position:fixed;inset:0;z-index:2147483647;visibility:visible;" +
      "display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;" +
      "background:#111319;color:#f2f3f5;font:16px/1.55 sans-serif;overflow:auto";
    var carte = document.createElement("div");
    carte.style.cssText = "width:100%;max-width:480px;overflow-wrap:anywhere";
    var titre = document.createElement("h1");
    titre.id = "projet-reprise-titre";
    titre.textContent = "Restauration du projet à terminer";
    titre.style.cssText = "font-size:24px;line-height:1.25;margin:0 0 18px";
    var texte = document.createElement("p");
    texte.id = "projet-reprise-texte";
    texte.textContent = "L'ouverture du projet a été interrompue. La restauration doit être terminée avant de reprendre la musique.";
    var erreur = document.createElement("p");
    erreur.id = "projet-reprise-erreur";
    var secours = document.createElement("p");
    secours.id = "projet-reprise-secours";
    var bouton = document.createElement("button");
    bouton.id = "projet-reprise-reessayer";
    bouton.type = "button";
    bouton.textContent = "Réessayer";
    bouton.style.cssText = "min-height:48px;padding:12px 24px;border:1px solid #75d4c6;" +
      "border-radius:8px;background:#204c47;color:#fff;font:inherit;cursor:pointer;margin-top:12px";
    [titre, texte, erreur, secours, bouton].forEach(function(e){ carte.appendChild(e); });
    voile.appendChild(carte);
    document.body.appendChild(voile);
  }
  document.getElementById("projet-reprise-titre").textContent = reprise.recharger ?
    "Restauration du projet" : "Restauration du projet à terminer";
  document.getElementById("projet-reprise-texte").textContent = reprise.recharger ?
    "Le projet a été remis en place. Vérification après redémarrage…" :
    "L'ouverture du projet a été interrompue. La restauration doit être terminée avant de reprendre la musique.";
  document.getElementById("projet-reprise-erreur").textContent = reprise.recharger ? "" : (reprise.erreur ||
    "La sauvegarde de secours n'est pas disponible pour le moment. Réessayez lorsque son accès est rétabli.");
  document.getElementById("projet-reprise-secours").textContent = reprise.secours ?
    "Sauvegarde de secours : " + reprise.secours : "";
  /* Le bouton du voile reste accessible ; les machines, champs et iframes
     voisins sont inertes. La capture ci-dessous couvre aussi les WebView plus
     anciens et les raccourcis installés avant un échec en cours d'utilisation. */
  document.body.inert = false;
  Array.prototype.forEach.call(document.body.children, function(e){
    if(e !== voile) e.inert = true;
  });
  var reessayer = document.getElementById("projet-reprise-reessayer");
  reessayer.hidden = !!reprise.recharger;
  if(reprise.recharger){
    if(PROJET_DEMARRAGE.rechargement === null)
      PROJET_DEMARRAGE.rechargement = setTimeout(function(){ location.reload(); }, 250);
  } else reessayer.focus();
}

(function(){
  function bloquerAction(e){
    if(!PROJET_DEMARRAGE.bloque) return;
    var voile = document.getElementById("projet-reprise");
    var dedans = voile && voile.contains(e.target);
    var bouton = document.getElementById("projet-reprise-reessayer");
    var reessayer = bouton && (e.target === bouton || bouton.contains(e.target));
    var clavier = e.type.indexOf("key") === 0;
    /* Stopper dès window empêche aussi les écouteurs de document. Le clic du
       seul bouton et son activation clavier sont traités ici, avant cet arrêt. */
    e.stopImmediatePropagation();
    if(clavier || e.type === "click" || !dedans){
      if(!(clavier && e.key === "Tab" && dedans)) e.preventDefault();
    }
    if(reessayer && (e.type === "click" ||
       (e.type === "keydown" && !e.repeat && (e.key === "Enter" || e.key === " ")))) location.reload();
  }
  ["keydown", "keyup", "keypress", "click", "dblclick", "pointerdown", "pointerup", "pointermove",
   "pointercancel", "mousedown", "mouseup", "touchstart", "touchmove", "touchend", "wheel",
   "input", "change", "submit", "dragenter", "dragover", "dragleave", "drop"].forEach(function(n){
    window.addEventListener(n, bloquerAction, {capture:true, passive:false});
  });
  var pret = false;
  try{ pret = projetReprendreOuverture() === true; }
  catch(e){
    if(typeof PROJET_REPRISE === "object" && PROJET_REPRISE)
      PROJET_REPRISE.erreur = "La restauration n'a pas pu être terminée. Réessayez.";
  }
  if(!pret){ projetBloquerReprise(); return; }
  var source = document.getElementById("drm16-application");
  if(!source || PROJET_DEMARRAGE.lance){ projetBloquerReprise(); return; }
  PROJET_DEMARRAGE.lance = true;
  var script = document.createElement("script");
  script.textContent = source.textContent;
  source.parentNode.replaceChild(script, source);
  if(PROJET_REPRISE.restauree && typeof signal === "function")
    signal("OUVERTURE INTERROMPUE · ÉTAT PRÉCÉDENT RESTAURÉ");
})();
