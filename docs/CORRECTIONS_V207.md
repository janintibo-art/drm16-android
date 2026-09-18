# v207 — longueurs indépendantes par instrument TR-1000

Le sélecteur PAS propose SUIVRE LAST ou 1 à 16 pas pour l'instrument sélectionné.
Le cycle individuel continue entre les tours du transport. On peut donc combiner
par exemple des longueurs de 3, 7 et 16 pas. Les pas hors longueur sont grisés,
mais restent conservés. Le réglage se change à l'arrêt.

Chaque direction utilise la longueur propre à l'instrument. Les accents, sous-pas,
probabilités et variations restent attachés au pas source. REC et MOTION REC
suivent ce même pas. STOP/START repart au début de tous les cycles.
Les longueurs sont sauvegardées et copiées indépendamment avec le motif ;
les anciens projets restent sur SUIVRE LAST.

LAST définit toujours le tour général : conditions A:B, durée de FILL et nombre
de tours exportés utilisent cette longueur. FILL conserve son rythme général.
Un WAV court ne couvre donc pas nécessairement le cycle complet de chaque piste.

## Fichiers

page/js/480-roland-tr-1000.js : données, positions de lecture/enregistrement, mémoire.
page/html/140-unit-t1k.html : sélecteur PAS.
page/html/430-note-t1k.html : notice.
app/src/main/assets/drm16.html : assemblage.
outils/test-t1k.cjs et outils/test-t1k-navigateur.py : validation.
Versions Android/bureau : 207.

## Validation

Contrôles du projet réussis. Tests Node : cycles 3 et 7 sur transport 4, trois
sens, REC/MOTION, protection PLAY, mémoire, migration et valeurs invalides.
Tests navigateur et vrais WAV sur douze pas de transport : source 1 entendue
aux positions 0/3/6/9 en avant, 2/5/8/11 en arrière et 0/4/8 en aller-retour
pour un instrument long de trois pas. Sauvegarde, grisage, protection PLAY et
retour SUIVRE LAST vérifiés. Affichage mobile inspecté.
Compilation APK par GitHub Actions.

Archive différentielle après v206. Attendre sa compilation avant envoi.
