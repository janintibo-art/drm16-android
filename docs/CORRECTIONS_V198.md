# v198 — TR-1000 : retard par pas

La v198 ajoute un retard déterministe par pas, indépendant pour chacun des dix
instruments et des 128 motifs. Valeurs proposées : 0, +1/16, +2/16, +4/16,
+8/16 de la durée d'un pas. À 120 BPM, +8/16 correspond à 62,5 ms.

## Utilisation

Choisir l'instrument, activer RETARD, choisir une valeur puis toucher les pas.
L'édition conserve les pas actifs. Désactiver RETARD pour écrire normalement.
Une bordure verte repère les pas actifs décalés. La valeur figure dans la grille
en mode RETARD. Les modes RETARD, CYCLE, PROBABILITÉ, SUB STEP et ACCENT sont exclusifs.

## Lecture et sauvegarde

- Le retard suit le pas source dans les trois directions de lecture.
- Cycles et probabilités décident d'abord si le coup est joué.
- Le coup et tous ses sous-pas sont retardés ensemble, sans changer leur espacement.
  Un dernier sous-pas peut donc dépasser la limite du pas suivant.
- Les timestamps audio et MIDI utilisent le même retard ; les WAV aussi.
- FILL et frappes directes restent indépendants de ce réglage.
- REC crée les nouveaux pas sans retard et conserve les réglages des pas existants.
- Les anciens projets chargent des retards nuls. Les valeurs inconnues sont
  normalisées à zéro. Les tableaux sauvegardés ne partagent pas leurs références.
- Le curseur continue de montrer la position du séquenceur, pas chaque frappe retardée.
- Seuls les retards sont proposés : les avances avant la grille restent à réaliser.

## Fichiers modifiés

`page/js/480-roland-tr-1000.js` : données, lecture, édition et mémoire.
`page/html/140-unit-t1k.html` et `page/css/140-roland-tr-1000.css` : commandes et repères.
`page/html/430-note-t1k.html` : notice.
`app/src/main/assets/drm16.html` : page générée.
`outils/test-t1k.cjs` et `outils/test-t1k-navigateur.py` : validation.
Versions Android et bureau mises à 198.

## Vérifications

Contrôles automatiques du projet réussis.
Tests du séquenceur : retard des quatre sous-pas, direction arrière, sauvegarde,
migration, validation des valeurs et indépendance de FILL réussis.
Tests navigateur : édition, indépendance des instruments, rechargement et vrais
exports WAV réussis. Le décalage mesuré entre les deux WAV est de 62,5 ms,
avec une tolérance de 1 ms. Affichage mobile inspecté.
La compilation APK reste effectuée par GitHub Actions.

Archive différentielle à appliquer après la v197.
