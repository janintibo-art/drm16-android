# v192 — SmplTrek : mixage WAV de la chaîne

Base : v191, commit a9fee4d47844f45f3e55c7439f27d4d51bc8b9d5.

## Fonction

CHAÎNE EN WAV · UN PASSAGE rend la liste entière dans l’ordre, une fois,
avec ses répétitions. Le mode CHAÎNE peut rester désactivé. L’export arrête
la lecture et ne la relance pas. L’export de motif existant reste indépendant.

WAV stéréo PCM16 à 44,1 kHz, tempo courant fixe, dix pistes du SmplTrek selon
MUTE/SOLO, avec hauteurs Instrument, tranches, TUNE, DECAY, filtre, niveaux et
panoramiques. La voie STK de la table garde gain, égalisation et panoramique.
La chaîne maîtresse hors ligne utilise les mêmes réglages subsoniques,
compensation, limiteur et garde finale que le moteur live.

La durée inclut le dernier motif entier et toute queue de sample plus longue,
transposition et DECAY compris. 50 ms de départ et 250 ms de marge finale.
Les autres machines du SET ne sont pas rendues. Aucun stem séparé, changement
de tempo en cours de morceau ni timestretch n’est ajouté.

## Fiabilité

Les samples personnels sont chargés et décodés avant la programmation audio.
Un sample nécessaire absent ou illisible annule le rendu au lieu de livrer
un mixage incomplet. Les pistes non jouées n’imposent pas leurs samples.
Chaînes vides, longueurs incompatibles, absence de notes et sortie coupée
sont refusées. Limite existante de 64 Mio vérifiée avant allocation du WAV.

Le contexte hors ligne utilise ses propres bus et sa propre sortie. Il ne
reconstruit pas les autres machines. Le contexte réel, les bus, le motif,
la chaîne et la sélection sont conservés. L’interface et le clavier sont
bloqués pendant le calcul ; l’entrée MIDI ne perturbe pas un rendu en cours.
Un finally restitue le contexte et l’interface après réussite ou erreur.
Une écriture refusée permet un nouvel essai. Le chemin du WAV apparaît sous
le bouton d’export ; le choix du dossier reste géré par le pont existant.

## Fichiers

- Nouveau `page/js/595-mixage-chaine-smpltrek.js` : plan, durée, rendu et erreurs.
- `page/js/550-export-audio.js` : chaîne maîtresse isolée alignée sur le live.
- Façade, style et notice SmplTrek ; `page/ordre.txt` et page assemblée.
- Versions Android/Windows : 192 ; tests Node et nouveau test export Chromium.

## Vérifications

`bash outils/controles.sh` : tous les contrôles passent.
Node : ordre des répétitions, hauteurs/tranches, MUTE/SOLO, erreurs de chaîne,
absence de sample et calcul d’une queue longue ; état de la machine conservé.

`python3 outils/test-export-stk.py` rend de vrais fichiers WAV et mesure leur
PCM : répétitions à 220 Hz, note Instrument à 1760 Hz, séparation gauche/droite,
durée, chargement à froid, tranche transposée et queue longue audible.
Le jeu live produit encore du son après les exports. Tests d’échec : sample
absent, rendu rejeté, écriture refusée puis nouvel export réussi ; entrée
MIDI bloquée pendant le calcul. Chaînes vides, invalides et trop longues
refusées sans fichier. Aucun message d’erreur JavaScript.

Régressions Chromium : édition de chaîne, sauvegarde, répétitions et vrai
transport STOP/PLAY. Affichage téléphone 360×640 inspecté. Aucun matériel
USB ni APK testé localement ; l’APK sera compilé par GitHub Actions.
L’archive contient uniquement les fichiers modifiés sous `drm16_android/`.
