# v206 — comparer et effacer les variations TR-1000

MOTION ON/OFF active ou suspend les variations par pas du motif sans les effacer.
OFF laisse jouer les réglages de base et le morphing. Le choix est sauvegardé,
copié avec le motif et respecté dans les WAV. Les anciens projets restent sur ON.
La bascule est possible pendant PLAY ; les notes déjà programmées ne sont pas
modifiées rétroactivement. MOTION REC peut écrire même quand la lecture des
variations est suspendue : remettre ON pour entendre le résultat.

EFFACER VAR. est disponible à l'arrêt. Une confirmation nomme l'instrument et
le motif. Elle efface uniquement ses six paramètres par pas, conserve les notes,
les réglages de base et les autres instruments, puis désarme MOTION REC.
L'annulation ne change rien. BASE reste disponible pour un effacement plus précis.

## Fichiers

page/js/480-roland-tr-1000.js : activation, lecture, mémoire et effacement.
page/html/140-unit-t1k.html : boutons.
page/html/430-note-t1k.html : notice.
app/src/main/assets/drm16.html : assemblage.
outils/test-t1k.cjs et outils/test-t1k-navigateur.py : tests.
Versions Android/bureau : 206.

## Validation

Contrôles du projet réussis. Tests Node : suspension réversible, effacement ciblé,
confirmation, protection PLAY, conservation des notes et du kit, mémoire et migration.
Tests navigateur : vrais WAV ON silencieux/OFF audible pour un pas avec LEVEL 0,
rechargement, annulation/confirmation et bascule en lecture. Affichage mobile inspecté.
Compilation APK par GitHub Actions.

Archive différentielle après v205. Attendre sa compilation avant envoi.
