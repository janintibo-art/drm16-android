# v201 — diagnostic audio lisible et compteurs réinitialisables

ÉTAT DU SON ouvre désormais une fenêtre persistante et défilable : le relevé
ne disparaît plus pendant sa lecture ou une capture. ACTUALISER relit les valeurs.
COMPTEURS À ZÉRO remet uniquement les statistiques à zéro, sans redémarrer le
contexte audio ni modifier les morceaux, sons ou réglages.

L'ancien deuxième appui en moins de quatre secondes relançait le moteur. Ce
raccourci a été supprimé. RELANCER LE MOTEUR est désormais un bouton distinct.
Le bouton de consultation dans la notice ouvre la même fenêtre.
Le relevé ne démarre pas lui-même un contexte audio absent.

Pour comparer : remettre les compteurs à zéro, fermer la fenêtre, jouer quelques
minutes au premier plan, puis rouvrir ÉTAT DU SON et faire une capture. Préciser
si des coupures ont réellement été entendues. Les compteurs sont volatils et
n'identifient pas à eux seuls la cause des incidents.

## Fichiers

- page/html/320-menu.html : fenêtre et actions.
- page/css/010-base.css : mise en page mobile et défilement.
- page/js/190-reglages-de-la-notice.js : lecture et remise à zéro.
- page/js/210-transfert-vers-une-vraie-volca-sample.js : accès menu sans relance implicite.
- page/html/340-note-general.html : notice mise à jour.
- app/src/main/assets/drm16.html : assemblage.
- outils/test-diagnostic-audio.py : test navigateur.
- Versions Android/bureau : 201.

## Validation

Contrôles du projet réussis. Test navigateur : consultation répétée sans relance,
actualisation, conservation du contexte et de la mémoire lors du reset, remise
à zéro de tous les compteurs, relance uniquement par son bouton, fermeture.
Captures à 393×851, 360×640 et 880×400 ; disposition mobile inspectée.
La compilation APK est effectuée sur GitHub Actions.

Archive différentielle après v200. Attendre la fin de sa compilation avant envoi.
