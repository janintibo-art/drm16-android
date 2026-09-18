# v203 — SOLO sur la TR-1000

Sélectionner un instrument puis SOLO pour écouter uniquement sa séquence.
Le pad sélectionné en solo porte SOLO, les autres OFF. Le solo est prioritaire
sur le mute existant et ne le modifie pas. QUITTER SOLO rétablit exactement les
mutes précédents. Sélectionner un autre instrument puis SOLO déplace l'isolement.
Le bouton MUTE est désactivé pendant le solo afin de préserver ces réglages.

Le solo est mémorisé par motif et copié avec lui. Les anciens projets n'ont pas
de solo. Le réglage s'applique au séquenceur, à FILL, aux notes MIDI qu'il émet
et aux exports WAV. Les pads directs restent audibles. Les sons déjà lancés et
programmés ne sont pas coupés : le changement suit le délai d'anticipation.

## Fichiers

- page/js/480-roland-tr-1000.js : solo, priorité, mémoire, copie et interface.
- page/html/140-unit-t1k.html et page/css/140-roland-tr-1000.css : bouton et repères.
- page/html/430-note-t1k.html : notice.
- app/src/main/assets/drm16.html : assemblage.
- outils/test-t1k.cjs et outils/test-t1k-navigateur.py : tests.
- Versions Android/bureau : 203.

## Validation

Contrôles du projet réussis. Tests Node : priorité sur mute, déplacement,
restauration, mémoire, validation des valeurs et copie.
Tests navigateur : boutons, sauvegarde/rechargement, sortie pendant PLAY et vrais
WAV audibles/silencieux selon solo et mutes. Disposition mobile inspectée.
La compilation APK est effectuée par GitHub Actions.

Archive différentielle après v202.
