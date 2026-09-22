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
    /* tout le pont Android, sauf le micro (W6) */
    var BUREAU = FONCTIONS.filter(function(n){ return n !== "micro"; });
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
    /* et ce qui n'existe que sur ordinateur (hors pont Android) */
    BUREAU.concat(["pleinEcran"]).forEach(function(n){
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
    window.addEventListener("unhandledrejection", function(e){ erreurs.push("promesse : " + String(e.reason)); });
    window.addEventListener("load", function(){ setTimeout(lancer, 2500); });
    function lancer(){
      if(typeof PROJET_DEMARRAGE !== "undefined" && PROJET_DEMARRAGE.bloque){
        try{ natif("autotestFin", [false, "La reprise du projet bloque le démarrage."]); }catch(e){}
        return;
      }
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
        t(HOST.plateforme === "bureau" && HOST.a("midiEnvoyer") && !HOST.a("micro"), "plateforme bureau : tout le pont sauf le micro");
        t(h.midiDispo() === true && typeof h.midiAppareils() === "string", "MIDI disponible, liste : " + JSON.stringify(h.midiListe()));
        /* micro (v144) : WebView2 le fournit directement, Windows demande l'autorisation au premier usage */
        t(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && !!window.MediaRecorder,
          "micro : API d'enregistrement présentes");
        audioInit();
        t(!!ctx && latenceChoisie() === "balanced", "audio : moteur démarré, latence " + latenceChoisie() +
          (ctx ? " · " + ctx.sampleRate + " Hz · sortie " + Math.round(((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000) + " ms" : ""));
        t(getComputedStyle(document.querySelector("button")).cursor === "pointer", "souris : curseur de bouton");
        t(HOST.a("pleinEcran") && typeof boutonLectureVisible === "function", "clavier : raccourcis et plein écran branchés");
        /* projet .drm16 (v145) : écrit, relu et reconnu — sans l'ouvrir, qui rechargerait la page */
        var projet = projetEnregistrer("autotest", true);
        var relu = projet ? projetValider(texteDeB64(h.fichierCharger(projet))) : null;
        t(!!projet && relu && typeof relu === "object" && relu.format === "drm16-projet",
          "projet .drm16 écrit et relu : " + (projet || "rien") + (typeof relu === "string" ? " (" + relu + ")" : ""));
        if(projet) h.fichierSupprimer(projet);
      }catch(e){ t(false, "exception : " + e.message); }
      /* MIDI AUTOTEST v278 — début (testé aussi avec une horloge simulée).
         Un port énuméré n'est pas forcément ouvrable. Un refus EXPLICITE du
         pilote est non concluant ; une absence de réponse reste un échec.
         Ces attentes ne sont exécutées que si DRM16_AUTOTEST est actif. */
      function pause(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
      function maintenantMidi(){ return performance.now(); }
      function attendreQue(cond, ms){
        var debut = maintenantMidi();
        return new Promise(function(resolve, reject){
          (function boucle(){
            try{
              var fini = !!cond();
              if(fini || maintenantMidi() - debut >= ms){ resolve(fini); return; }
              setTimeout(boucle, Math.min(50, ms - (maintenantMidi() - debut)));
            }catch(e){ reject(e); }
          })();
        });
      }
      function essaiMidi(){
        var debut = maintenantMidi(), phase = "inventaire", nom = "", id = -1;
        var recus = [], issue = null, erreurRappel = "", avant = window.__midiEtat;
        var branche = false, ouvertureDemandee = false, fermetureConfirmee = false;
        var DELAI_OUVERTURE = 30000, DELAI_FERMETURE = 10000;
        function message(e){ return e && e.message ? e.message : String(e); }
        function noter(e){
          if(recus.length < 64) recus.push({
            ms:Math.round(maintenantMidi() - debut), phase:phase,
            evt:e && e.evt, nom:e && e.nom, ouvert:e && e.ouvert,
            erreur:e && e.erreur
          });
          /* Le vrai gestionnaire de la page reste celui qui change MIDI.
             Une erreur de ce gestionnaire doit faire échouer le test. */
          try{ avant(e); }catch(ex){ erreurRappel = message(ex); }
          if(!e) return;
          if(phase === "ouverture" && e.nom === nom &&
             (e.evt === "ouvert" || e.evt === "echec")) issue = e;
          if((phase === "fermeture" || phase === "preparation") &&
             e.evt === "ferme") issue = e;
        }
        function diagnostic(){
          var natif;
          try{ natif = h.midiOuvertId(); }catch(e){ natif = "erreur : " + message(e); }
          var page = typeof MIDI !== "undefined" ? MIDI.ouvertId : "absent";
          return "après " + Math.round(maintenantMidi() - debut) + " ms ; demandé=" + id +
            " ; page=" + page + " ; Rust=" + natif + " ; événements=" + JSON.stringify(recus);
        }
        function verifierRappel(){
          if(erreurRappel) throw new Error("gestionnaire __midiEtat : " + erreurRappel);
        }
        function fermerConfirme(preparation){
          phase = preparation ? "preparation" : "fermeture";
          issue = null;
          h.midiHorloge(false, 0);
          h.midiFermer();
          return attendreQue(function(){ return !!issue || !!erreurRappel; }, DELAI_FERMETURE).then(function(recu){
            verifierRappel();
            var ferme = recu && issue && issue.ouvert === -1 && MIDI.ouvertId === -1 && h.midiOuvertId() === -1;
            t(!!ferme, "MIDI : " + (preparation ? "connexion précédente fermée" : "horloge arrêtée et fermeture confirmée") +
              (ferme ? " par la page et Rust" : " — " + diagnostic()));
            if(!ferme) throw new Error("fermeture sans confirmation cohérente en 10 secondes");
            if(!preparation) fermetureConfirmee = true;
          });
        }
        function nettoyer(){
          /* Même si l'ouverture répond trop tard, la fermeture est enfilée
             derrière elle. Cela n'est PAS présenté comme une confirmation. */
          if(ouvertureDemandee && !fermetureConfirmee){
            try{ h.midiHorloge(false, 0); }catch(e){ t(false, "MIDI : arrêt de sécurité : " + message(e)); }
            try{ h.midiFermer(); }catch(e){ t(false, "MIDI : fermeture de sécurité : " + message(e)); }
          }
          if(branche){
            if(window.__midiEtat === noter) window.__midiEtat = avant;
            else t(false, "MIDI : le gestionnaire d'événements a été remplacé pendant le test");
          }
          l.push("INFO  MIDI : " + diagnostic());
        }
        return Promise.resolve().then(function(){
          var texte = h.midiAppareils();
          if(typeof texte !== "string") throw new Error("inventaire MIDI invalide");
          var liste = texte.split("\n").filter(function(s){ return s.trim().length > 0; });
          if(!liste.length){
            l.push("INFO  MIDI : NON CONCLUANT — aucun appareil ; ouverture et envoi non testés");
            return;
          }
          var c = liste[0].split("\t");
          if(c.length !== 2 || !c[0].trim() || !/^[1-9][0-9]*$/.test(c[1])) throw new Error("identifiant MIDI invalide");
          nom = c[0]; id = Number(c[1]);
          if(!Number.isSafeInteger(id)) throw new Error("identifiant MIDI hors limites");
          if(typeof avant !== "function" || typeof MIDI === "undefined") throw new Error("réception MIDI absente de la page");
          window.__midiEtat = noter; branche = true;
          var natifAvant = h.midiOuvertId();
          /* Un état restauré ne doit pas faire réussir une ouverture jamais
             confirmée. On ferme d'abord une connexion réellement existante. */
          return (natifAvant !== -1 ? fermerConfirme(true) : Promise.resolve()).then(function(){
            if(MIDI.ouvertId !== -1 || h.midiOuvertId() !== -1) throw new Error("état initial MIDI incohérent");
            phase = "ouverture"; issue = null; ouvertureDemandee = true;
            h.midiOuvrirId(id);
            return attendreQue(function(){ return !!issue || !!erreurRappel; }, DELAI_OUVERTURE);
          }).then(function(recu){
            verifierRappel();
            if(!recu) throw new Error("aucune réponse d'ouverture en 30 secondes — " + diagnostic());
            var natif = h.midiOuvertId();
            if(issue.evt === "echec"){
              if(typeof issue.erreur !== "string" || !issue.erreur.trim() || issue.ouvert !== -1 ||
                 MIDI.ouvertId !== -1 || natif !== -1) throw new Error("refus MIDI incomplet ou incohérent — " + diagnostic());
              l.push("INFO  MIDI : NON CONCLUANT — « " + nom + " » refusé par le système (" + issue.erreur +
                ") ; refus reçu, ouverture et envoi non validés");
              return;
            }
            var ouvert = issue.ouvert === id && MIDI.ouvertId === id && natif === id;
            t(ouvert, "MIDI : « " + nom + " » ouvert, événement reçu et état Rust/page concordant");
            if(!ouvert) throw new Error("confirmation d'ouverture incohérente — " + diagnostic());
            phase = "envoi";
            h.midiEnvoyer(0x90, 60, 1); h.midiEnvoyer(0x80, 60, 0);
            h.midiEnvoyer(0xF0, 0, 0); h.midiEnvoyer(0x42, 0, 0);
            t(true, "MIDI : note envoyée, F0 seul et octet de donnée ignorés sans erreur");
            t(h.midiSysex(btoa("\xF0\x7E\x7F\x06\x01\xF7")) === true, "MIDI : exclusif complet envoyé");
            t(h.midiSysex(btoa("\xF0\x7E\x7F")) === false, "MIDI : exclusif incomplet refusé");
            h.midiTempo(130);
            h.midiHorloge(true, 130);
            return pause(400).then(function(){ return fermerConfirme(false); });
          });
        }).catch(function(e){ t(false, "MIDI : " + message(e)); }).then(nettoyer);
      }
      /* MIDI AUTOTEST v278 — fin. */
      /* réseau (v140) : la réponse revient plus tard, par window.__net */
      function attendre(url, max){
        return netCharger(url, max).then(function(b64){ return {ok:true, taille:atob(b64).length}; },
                                         function(e){ return {ok:false, erreur:String(e)}; });
      }
      function terminer(){
        t(!erreurs.length, "aucune erreur JavaScript " + erreurs.slice(0, 3).join(" | "));
        try{ natif("autotestFin", [ok, l.join("\n")]); }catch(e){}
      }
      Promise.all([
        attendre("http://archive.org/robots.txt", 0),
        attendre("https://archive.org/robots.txt", 0),
        attendre("https://archive.org/robots.txt", 10)
      ]).then(function(r){
        t(!r[0].ok && /https/.test(r[0].erreur), "réseau : http refusé (" + r[0].erreur + ")");
        t(r[1].ok && r[1].taille > 10, "réseau : archive.org répond (" + (r[1].ok ? r[1].taille + " octets" : r[1].erreur) + ")");
        t(!r[2].ok && /trop gros/.test(r[2].erreur), "réseau : plafond respecté (" + r[2].erreur + ")");
      }, function(e){ t(false, "réseau : " + e); }).then(essaiMidi).then(terminer, function(e){
        t(false, "exception asynchrone : " + (e && e.message ? e.message : String(e)));
        terminer();
      });
    }
  }
})();
/* ================= FIN HÔTE ================= */
