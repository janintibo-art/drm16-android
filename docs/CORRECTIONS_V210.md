# v210 — annuler un collage ou un effacement TR-1000

COLLER et EFFACER VAR. conservent désormais un instantané indépendant du motif
avant leur action confirmée. ANNULER, à l'arrêt et sur ce même motif, permet de
le restaurer. Le dialogue prévient que le motif entier revient à cet état : les
modifications effectuées depuis sont remplacées elles aussi.

Un seul instantané est conservé. La prochaine action destructive confirmée le
remplace. Refuser un dialogue laisse l'instantané et le motif intacts. Changer de
motif ne déplace pas la restauration : revenir à la destination concernée.
L'instantané est temporaire, non enregistré et vidé au rechargement de la machine
ou du projet, notamment lors d'un export rechargeant la machine. La restauration
elle-même est sauvegardée. Pas de commande REFAIRE dans cette version.

L'état restauré inclut nom, notes, kit, longueurs, directions, accents, sous-pas,
probabilités, cycles, retards, paramètres, état MOTION, mutes et solo.
Les effets et réglages globaux ne sont pas concernés.

## Fichiers

page/js/480-roland-tr-1000.js : instantané, validation de destination, restauration.
page/html/140-unit-t1k.html et page/css/140-roland-tr-1000.css : bouton ANNULER.
page/html/430-note-t1k.html : notice et limites.
app/src/main/assets/drm16.html : assemblage.
outils/test-t1k.cjs et outils/test-t1k-navigateur.py : tests.
Versions Android/bureau : 210 ; édition Rust conservée à 2021.

## Validation

Tests Node réussis : restauration complète du collage et de l'effacement,
confirmation annulée/acceptée, destination, blocage PLAY, mémoire et reset au chargement.
Contrôles HTML/JavaScript, tests Java et vérification de la coque PC réussis.
Le contrôle global s'arrête aux tests Rust : rustc est absent. Le test navigateur
actualisé est livré mais non exécuté ici, Chromium étant bloqué par l'environnement.
Compilation APK et contrôles complémentaires sur GitHub Actions.

Archive différentielle après v209. Attendre sa compilation avant envoi.
