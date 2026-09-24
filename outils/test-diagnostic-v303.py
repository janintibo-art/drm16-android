#!/usr/bin/env python3
"""Contrôles statiques du diagnostic intégré v303.

Le vrai chargement de la page reste couvert par test-navigateur.py. Ce test
vérifie surtout que les garde-fous du diagnostic ne disparaissent pas lors
d'une modification future : fichier temporaire unique et supprimé, réseau
facultatif, micro arrêté, rapport copiable et aucun innerHTML pour les détails.
"""
from pathlib import Path

R = Path(__file__).resolve().parents[1]
JS = (R / "page/js/190-reglages-de-la-notice.js").read_text(encoding="utf-8")
CSS = (R / "page/css/240-outils-studio.css").read_text(encoding="utf-8")
HTML = (R / "app/src/main/assets/drm16.html").read_text(encoding="utf-8")

checks = []
def ok(cond, msg):
    checks.append(bool(cond))
    print(("  ok   " if cond else "  FAUX ") + msg)

marque = JS.find("diagnostic général DRM16 (v303)")
bloc = JS[marque:] if marque >= 0 else ""
ok(marque >= 0, "bloc diagnostic v303 présent")
ok('DIAG303 = {' in bloc and 'version:"303"' in bloc, "version du rapport = 303")
for ident in ["diag-version", "diag-plateforme", "diag-local", "diag-js", "diag-audio",
              "diag-stockage", "diag-reseau", "diag-midi", "diag-micro"]:
    ok(ident in bloc, f"ligne {ident} présente")
for fonction in ["diagTestStockage", "diagTestReseau", "diagTestMicro", "diagTestTout",
                 "diagRapport", "diagCopierRapport"]:
    ok(("function " + fonction + "(") in bloc, f"fonction {fonction} présente")
ok('drm16_diag_v303_' in bloc and 'fichierSupprimer(nom)' in bloc,
   "stockage : fichier temporaire unique puis suppression")
ok('fichierCharger(nom) !== b64' in bloc, "stockage : relecture vérifiée octet pour octet")
ok('https://archive.org/robots.txt' in bloc and 'facultatif' in bloc,
   "réseau HTTPS testé mais explicitement facultatif")
ok('getUserMedia({audio:true})' in bloc and 'getTracks().forEach' in bloc and 't.stop()' in bloc,
   "micro : capture stoppée après le test")
ok('midiAppareils' in bloc and 'midiOuvrir' not in bloc and 'midiOuvrirId' not in bloc,
   "MIDI : inventaire seulement, aucun changement de connexion")
ok('COPIER RAPPORT' in bloc and 'navigator.clipboard.writeText' in bloc,
   "rapport copiable avec repli")
ok('innerHTML' not in bloc, "aucune donnée du diagnostic injectée via innerHTML")
ok('DIAGNOSTIC DRM16' in bloc and 'AUDIO · STOCKAGE · RÉSEAU · MIDI · MICRO' in bloc,
   "tuile ÉTAT DU SON transformée en DIAGNOSTIC DRM16")
ok('diag-grille' in CSS and 'diag-ligne' in CSS and 'diag-actions' in CSS,
   "mise en page mobile du diagnostic présente")
ok('diagnostic général DRM16 (v303)' in HTML and 'diag-grille' in HTML,
   "drm16.html embarque bien le diagnostic v303")

fautes = len(checks) - sum(checks)
print("TOUT EST BON" if fautes == 0 else f"{fautes} FAUTE(S)")
raise SystemExit(1 if fautes else 0)
