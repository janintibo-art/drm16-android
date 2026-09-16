"use strict";   /* doit rester la toute première instruction du script (v139) */
/* ================= HÔTE (v137) =================
   La page ne parle plus directement au pont Android : elle parle à HOST, qui
   porte les MÊMES noms de fonctions. Sur Android, chaque fonction délègue à
   window.DRM16. Une fonction que la plateforme n'offre pas n'existe tout
   simplement pas dans HOST : les tests « if(!p || !p.fichierSauver) » de la page
   gardent donc leur sens, et « ÉCRITURE IMPOSSIBLE ICI » s'affiche là où il faut.

   HOST.plateforme : "android", "bureau" (Tauri) ou "navigateur" (le fichier
   ouvert tel quel). HOST.a(nom) dit si une fonction est offerte.

   Version de bureau (v139) : la page attend ses réponses sur place, comme avec
   le pont Android. Chaque fonction de BUREAU envoie donc une requête
   XMLHttpRequest SYNCHRONE au protocole drm16 que sert la coque Rust
   (bureau/src-tauri/src/hote.rs) : les arguments en JSON, la valeur rendue dans
   {"r": …}. Les fonctions pas encore écrites côté Rust ne sont pas déclarées :
   elles restent absentes, comme dans un navigateur.

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
    var BUREAU = [
      "playing", "fichierSauver", "fichierOuvrir", "fichierAjouter", "fichierFermer",
      "fichierListe", "fichierCharger", "fichierSupprimer", "fichierDossier",
      "echDossier", "echSauver", "echCharger", "echListe", "echSupprimer"
    ];
    /* Tauri sert un protocole maison en http://<nom>.localhost/ sous Windows */
    var base = /Windows|Android/.test(navigator.userAgent) ? "http://drm16.localhost/" : "drm16://localhost/";
    var natif = function(nom, args){
      var x = new XMLHttpRequest();
      x.open("POST", base + nom, false);
      x.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");   /* requête simple : pas de pré-vol */
      x.send(JSON.stringify(Array.prototype.slice.call(args)));
      if(x.status !== 200) throw new Error("hôte " + nom + " : " + x.status);
      return JSON.parse(x.responseText).r;
    };
    BUREAU.forEach(function(n){
      h[n] = function(){ return natif(n, arguments); };
    });
    installerAutotest(h, natif);
  }
  h.a = function(n){ return typeof h[n] === "function"; };
  try{ document.documentElement.setAttribute("data-hote", h.plateforme); }catch(e){}
  return h;

  /* Essai automatique de la version de bureau, lancé par GitHub Actions
     (variable DRM16_AUTOTEST) : la vraie page, dans le vrai WebView2, contre la
     vraie coque Rust. Le rapport est rendu à la coque, qui quitte avec le code
     0 ou 1. Sans cette variable, rien de ceci ne s'exécute. */
  function installerAutotest(h, natif){
    var actif = false;
    try{ actif = !!natif("autotest", []); }catch(e){ return; }
    if(!actif) return;
    var erreurs = [];
    window.addEventListener("error", function(e){ erreurs.push(String(e.message)); });
    window.addEventListener("load", function(){ setTimeout(lancer, 2500); });
    function lancer(){
      var l = [], ok = true;
      function t(c, m){ l.push((c ? "ok    " : "FAUX  ") + m); if(!c) ok = false; }
      try{
        t(typeof allerMachine === "function", "la page est chargée");
        var b64 = btoa("DRM16 autotest");
        var chemin = h.fichierSauver("autotest.syx", b64);
        t(!!chemin, "fichierSauver : " + chemin);
        t(h.fichierCharger("autotest.syx") === b64, "fichierCharger relit à l'octet près");
        t(/(^|\n)autotest\.syx\t14\t\d+/.test(h.fichierListe(".syx")), "fichierListe : nom, taille, date");
        var j = h.fichierOuvrir("autotest.wav");
        t(!!j && h.fichierAjouter(j, btoa("RIFF")) === true && h.fichierAjouter(j, btoa("WAVE")) === true, "écriture par morceaux");
        t(!!h.fichierFermer(j, true) && h.fichierCharger("autotest.wav") === btoa("RIFFWAVE"), "morceaux reconstitués");
        var o = new Uint8Array(3000000);
        for(var i=0;i<o.length;i++) o[i] = (i * 7919) & 255;
        t(!!ecrireDocument(h, "autotest-gros.wav", o), "3 Mo écrits en morceaux");
        t(h.fichierCharger("autotest-gros.wav") === octetsVersB64(o), "3 Mo relus à l'octet près");
        t(h.fichierSupprimer("autotest.syx") && h.fichierSupprimer("autotest.wav") && h.fichierSupprimer("autotest-gros.wav"), "fichierSupprimer");
        t(h.fichierListe("").indexOf("autotest") < 0, "plus rien de listé");
        t(h.fichierCharger("..") === "" && h.fichierCharger("../x") === "", "noms dangereux sans effet");
        t(h.echSauver("essai auto", btoa("abc")) === true && h.echCharger("essai auto") === btoa("abc"), "échantillon aller-retour");
        t(h.echListe().split("\n").indexOf("essai_auto") >= 0, "echListe");
        h.echSupprimer("essai auto");
        t(h.echListe().split("\n").indexOf("essai_auto") < 0, "echSupprimer");
        t(!!h.fichierDossier() && !!h.echDossier(), "dossiers : " + h.fichierDossier() + " · " + h.echDossier());
        var rates = [];
        ["16","em1","er1","esx","mpc3000","tr909","eur","kp","mc","stk","ko"].forEach(function(m){
          try{ allerMachine(m); }catch(e){ rates.push(m + " (" + e.message + ")"); }
        });
        t(!rates.length, "machines ouvertes " + rates.join(", "));
        var inconnu = false;
        try{ natif("inexistante", []); }catch(e){ inconnu = true; }
        t(inconnu, "une fonction inconnue est refusée");
        t(HOST.plateforme === "bureau" && !HOST.a("midiEnvoyer"), "plateforme bureau, MIDI pas encore offert");
      }catch(e){ t(false, "exception : " + e.message); }
      t(!erreurs.length, "aucune erreur JavaScript " + erreurs.slice(0, 3).join(" | "));
      try{ natif("autotestFin", [ok, l.join("\n")]); }catch(e){}
    }
  }
})();
/* ================= FIN HÔTE ================= */
