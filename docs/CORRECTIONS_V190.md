# v190 — SmplTrek : clavier MIDI chromatique

Base : v189, commit 47b89d71af4225aba2d3a2002dd45205d569fcdc.

## Utilisation

À l’arrêt, sélectionner une piste INSTRUMENT puis activer MIDI : CLAVIER.
Le canal mélodique joue le sample de la piste sélectionnée, sur une plage
relative de −12 à +12 demi-tons autour de la note de base des réglages MIDI.
La piste, le canal, l’origine et la plage sont affichés. Les touches hors plage
sont ignorées. Aucun détecteur de tonalité n’est ajouté.

Les autres canaux gardent le routage par pistes ; une piste SHOTS sélectionnée
ne répond pas au canal mélodique en mode clavier. Désactiver CLAVIER retrouve
le routage habituel. Le mode est sauvegardé et son changement est verrouillé
pendant PLAY. Les anciens projets démarrent en MIDI : PISTES.

Les notes MIDI utilisent désormais une vélocité continue pour le volume STK.
TUNE s’ajoute à la transposition ; la tranche sélectionnée, DECAY, le filtre,
le niveau, le panoramique, MUTE et SOLO restent actifs. Aucun pas n’est écrit
par le clavier. Note Off, sustain et pitch bend ne changent pas la lecture :
le son continue jusqu’à sa fin ou la limite fixée par DECAY.

## Prises et transport

La relecture et l’export WAV utilisent le même calcul de piste et de hauteur
que l’entrée MIDI. Le contrôle des samples absents vise maintenant la piste
Instrument sélectionnée en mode clavier. Les affectations de canaux de
l’enregistreur restent prioritaires. Une prise ne fige pas les sons ni les
réglages : garder la même sélection de piste et la même configuration MIDI.

Correction du départ sous horloge MIDI externe : START ou CONTINUE depuis
l’arrêt prépare la chaîne STK et repart de sa première entrée, comme PLAY.
Une chaîne invalide empêche le départ. Aucune reprise au milieu n’est ajoutée.

## Vérifications

Contrôles du dépôt et tests Node : résolution des notes/canaux, bornes,
vélocité, MUTE/SOLO, sauvegarde, verrouillage pendant lecture et préparation
de la chaîne au départ MIDI externe.

Chromium : entrée MIDI simulée, sélection de piste, hauteurs, vélocité,
canaux, notes ignorées, absence d’écriture dans les motifs, sauvegarde et
rechargement. Régressions Instrument, chaînes et MIDI commun. Captures aux
formats 393×851, 360×640 et 880×400.

Vrais exports WAV PCM16 : sample de 440 Hz rendu à 220, 440 et 880 Hz ;
rapport de niveaux mesuré 0,2493 pour des vélocités 32 et 127. Sample absent :
erreur explicite sans WAV incomplet. Contexte audio restauré, jeu live audible
après export et aucune sortie MIDI matérielle pendant le rendu. La suite
multimachine d’export reste réussie. Aucun matériel USB n’est testé ici.

Versions Android et Windows : 190. La page embarquée est régénérée depuis
les sources. Le ZIP contient uniquement les fichiers modifiés, sous
`drm16_android/`. L’APK sera compilé par GitHub Actions après application.
