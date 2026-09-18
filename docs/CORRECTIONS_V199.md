# v199 — TR-1000 : copier et coller les motifs

## Utilisation

Arrêter PLAY, sélectionner la source, appuyer sur COPIER, choisir la destination
avec BANQUE et PTN, puis COLLER. Une confirmation indique les deux motifs.
Annuler ne change rien. La copie peut être collée plusieurs fois, y compris vers
une autre banque. La destination reste sélectionnée après collage.

## Contenu de la copie

Les dix instruments, leurs paramètres et références de sons, LAST, pas, accents,
sous-pas, probabilités, directions, cycles et retards sont copiés indépendamment.
La source peut être modifiée après COPIER sans changer l'instantané.
Les sons audio restent référencés et ne sont pas dupliqués.
Les effets, le morphing A/B, le tempo et le volume restent globaux.

Le presse-papiers est temporaire et vidé au rechargement de la machine ou du projet.
Les motifs collés sont sauvegardés normalement. Copier/coller est bloqué durant PLAY.

## Fichiers

- page/js/480-roland-tr-1000.js : copie indépendante, confirmation, sauvegarde et boutons.
- page/html/140-unit-t1k.html : COPIER et COLLER.
- page/html/430-note-t1k.html : notice.
- app/src/main/assets/drm16.html : page régénérée.
- outils/test-t1k.cjs et outils/test-t1k-navigateur.py : vérifications.
- Versions Android et bureau : 199.

## Validation

Contrôles automatiques du projet réussis. Tests Node : copie complète, annulation,
indépendance des sources/destinations et collages répétés, blocage PLAY, sauvegarde.
Tests navigateur : vrais boutons, dialogues acceptés/annulés, copie A1 vers H16,
indépendance, boutons désactivés en lecture, rechargement avec copie temporaire vide.
Régressions des probabilités, banques, directions, cycles, retards et WAV réussies.
Affichage mobile inspecté. L'APK sera compilé par GitHub Actions.

Archive différentielle à appliquer après v198.
