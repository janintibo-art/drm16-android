# v196 — TR-1000 : directions par instrument

Base : v195, commit 9a576798241763c17839e1b6a29e5f3b2f4fed5e.

## Fonction

SENS ajoute AVANT, ARRIÈRE et ALLER-RETOUR pour l’instrument sélectionné.
Le choix est propre à chaque instrument de chaque motif, dans ses 128
emplacements. Les anciens projets et valeurs inconnues utilisent AVANT.

L’aller-retour ne répète pas les extrémités : avec LAST 4, il parcourt
1-2-3-4-3-2 puis recommence. Sa période est donc de 2 × LAST − 2 pas, avec
un cas particulier pour LAST 1. Les autres instruments peuvent garder leur
propre sens ; l’horloge du transport ne change pas.

Les accents, probabilités et sous-pas sont lus à l’emplacement réellement
parcouru. FILL reste le remplissage en avant existant et fait avancer le
parcours du motif. Les frappes manuelles et l’entrée MIDI restent immédiates.
Le mode REC utilise le parcours de l’instrument frappé pour placer le pas
le plus proche, y compris dans le sens arrière ou après un rebond.

## Transport et affichage

Les départs visuels sont datés avec l’heure audio. Le curseur affiche le pas
entendu pour l’instrument sélectionné, même quand l’ordonnanceur a déjà
préparé plusieurs pas suivants. Les événements échus sont consommés aussi
quand TR-1000 est secondaire dans le SET. Pas de file visuelle hors ligne.

STOP vide la phase et les départs. START réinitialise la phase ; le départ
MIDI depuis l’arrêt la réinitialise également (CONTINUE garde le numéro de
pas de l’horloge commune). Un CONTINUE pendant lecture ne réinitialise pas.
Les contrôles du sens et de LAST sont réservés à l’arrêt, comme les banques
et les motifs, afin de conserver des départs audio cohérents.

L’export WAV applique les directions. Son nombre de mesures reste défini
par les tours du transport ; il ne garantit pas un nombre entier de cycles
aller-retour. Les prises MIDI rejouent leurs notes, sans réappliquer le sens.

## Vérifications

Tous les contrôles de `bash outils/controles.sh` passent.
Node : parcours avant/arrière/aller-retour, LAST 1, probabilité et accent du
pas source, sous-pas groupés, curseur différé jusqu’à l’heure audio, REC
arrière, phases remises à zéro, sauvegarde et migration. Transport commun :
reset même en machine secondaire, START/STOP et CONTINUE MIDI.

Chromium : réglages indépendants, sauvegarde, directions dans de vrais WAV.
Sur trois mesures de quatre pas, une note écrite au pas 1 apparaît aux instants
3/7/11 en arrière, et 0/6 en aller-retour (indices d’horloge à partir de zéro).
Le curseur entendu suit l’aller-retour ; STOP/START reprend sa première phase.
Les tests probabilités, banques et exports des versions précédentes passent.
Aucune erreur JavaScript ; captures téléphone et paysage.

Fichiers : moteur/interface/notice TR-1000, reset dans le transport commun et
l’entrée MIDI, tests TR-1000 et transport, page assemblée et versions 196.
Pas de lecture aléatoire ni de conditions de cycle dans ce lot. Le ZIP contient
les seuls fichiers modifiés sous `drm16_android/`. APK compilé via GitHub Actions.
