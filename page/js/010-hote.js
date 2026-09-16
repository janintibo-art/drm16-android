/* ================= HÔTE (v137) =================
   La page ne parle plus directement au pont Android : elle parle à HOST, qui
   porte les MÊMES noms de fonctions. Sur Android, chaque fonction délègue à
   window.DRM16. Une fonction que la plateforme n'offre pas n'existe tout
   simplement pas dans HOST : les tests « if(!p || !p.fichierSauver) » de la page
   gardent donc leur sens, et « ÉCRITURE IMPOSSIBLE ICI » s'affiche là où il faut.

   HOST.plateforme : "android", "bureau" (Tauri, services natifs à venir en W3 à
   W5) ou "navigateur" (le fichier ouvert tel quel). HOST.a(nom) dit si une
   fonction est offerte.

   Règle : window.DRM16 n'apparaît NULLE PART ailleurs que dans ce bloc
   (vérifié par verifier-hote.py, qui compare aussi la liste ci-dessous aux
   fonctions @JavascriptInterface de MainActivity.java). */
var HOST = (function(){
  var FONCTIONS = [
    "playing", "midiDispo", "midiListe", "midiOuvrir", "midiAppareils", "midiOuvertId",
    "midiOuvrirId", "midiFermer", "midiEnvoyer", "midiHorloge", "midiSysex", "midiTempo",
    "micro", "fichierSauver", "fichierOuvrir", "fichierAjouter", "fichierFermer", "netCharger",
    "fichierListe", "fichierCharger", "fichierSupprimer", "fichierDossier", "echDossier", "echSauver",
    "echCharger", "echListe", "echSupprimer"
  ];
  var h = {plateforme:"navigateur", fonctions:FONCTIONS};
  var android = window.DRM16;
  if(android){
    h.plateforme = "android";
    FONCTIONS.forEach(function(n){
      if(typeof android[n] !== "function") return;
      h[n] = function(){ return android[n].apply(android, arguments); };
    });
  } else if(window.__TAURI_INTERNALS__ || window.__TAURI__){
    h.plateforme = "bureau";
  }
  h.a = function(n){ return typeof h[n] === "function"; };
  try{ document.documentElement.setAttribute("data-hote", h.plateforme); }catch(e){}
  return h;
})();
/* ================= FIN HÔTE ================= */
"use strict";
