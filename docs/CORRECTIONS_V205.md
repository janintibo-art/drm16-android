# v205 — enregistrement des gestes TR-1000

MOTION REC arme l'enregistrement des gestes, indépendamment de REC des notes.
Pendant PLAY, les potards TUNE, DECAY, C1, C2, A/B et le fader LEVEL inscrivent
leur valeur sur le pas le plus proche de la position audio entendue. Le sens de
lecture de l'instrument est respecté. Le réglage de base suit également le geste.

Les pas ne sont ni activés ni effacés. La dernière valeur d'un même paramètre
sur un même pas remplace la précédente ; les autres variations restent intactes.
Un potard immobile n'écrit pas les pas suivants : il s'agit de gestes quantifiés,
sans interpolation continue. Les notes déjà programmées peuvent ne prendre en
compte la nouvelle variation qu'au passage suivant.

Pas d'enregistrement avant le premier pas entendu, pendant FILL ou en rendu WAV.
STOP désarme le mode, y compris avec la TR-1000 secondaire d'un SET. L'armement
n'est pas sauvegardé ; les variations le sont, à travers les données de v204.
PARAM PAS et BASE permettent de corriger ou retirer un geste. Les effets globaux
et le morphing ne font pas partie des paramètres enregistrés dans cette étape.

## Fichiers

page/js/480-roland-tr-1000.js : armement, gestes des potards/faders et garde-fous.
page/js/130-decalage-humain.js : désarmement à STOP.
page/html/140-unit-t1k.html : bouton MOTION REC.
page/html/430-note-t1k.html : notice.
app/src/main/assets/drm16.html : page régénérée.
outils/test-t1k.cjs, outils/test-transport.cjs et outils/test-t1k-navigateur.py : tests.
Versions Android/bureau : 205.

## Validation

Contrôles du projet réussis. Tests Node : écriture sur le pas entendu en arrière,
quantification au pas voisin, paramètres multiples, garde-fous et sauvegarde.
Test du STOP avec TR-1000 secondaire. Tests navigateur avec véritables gestes
sur TUNE et LEVEL : notes intactes, REC notes désactivé, désarmement par STOP,
valeurs conservées après rechargement. Régressions WAV et autres réglages réussies.
Disposition mobile inspectée. Compilation APK par GitHub Actions.

Archive différentielle après v204. Attendre la fin de sa compilation avant envoi.
