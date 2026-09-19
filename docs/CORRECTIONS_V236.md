# v236 — FILL et AUTO FILL des TR

L'analyse de fidélité v122 notait pour les TR-808, 909 et 707 : « Intro/Fill et
Auto Fill plus fidèles ». Rien n'existait : impossible de jouer un break sans
changer de motif à la main au bon moment. Les TR-808, TR-909, TR-707 et la RD-6
(même moteur) ont maintenant deux boutons.

## Utilisation

- **FILL** pendant la lecture : la mesure suivante joue le motif de fill, une
  seule fois, puis la machine revient au motif courant. Le bouton reste allumé
  tant que le fill est attendu ou joué.
- **FILL** à l'arrêt : choisit le motif de fill parmi les motifs **13 à 16**
  (16 par défaut). Le libellé indique `FILL 16`.
- **AUTO FILL** : OFF, 2, 4, 8, 16. Le fill remplace la dernière mesure de
  chaque groupe, comptée depuis START.

Le fill joue la **variation A** du motif de fill et sa propre longueur
**LAST STEP** : un break de 8 pas dure 8 pas. La grille **SCALE** reste celle du
motif courant.

## Fonctionnement

`page/js/350-roland-tr-808-tr-909.js` :

- `debutTourTr()` est appelé au début de chaque mesure du motif joué. Elle
  décide si cette mesure est un fill (FILL demandé, ou numéro de mesure
  multiple de AUTO FILL) ;
- `motifJoueTr()` renvoie le motif à jouer (courant ou fill). `scheduleTr` le
  lit pas par pas. La fin de mesure est détectée sur la longueur du motif qui
  joue réellement, donc un fill plus court ou plus long que le motif courant
  s'enchaîne sans décalage ;
- START ou une remise à zéro MIDI remettent le compte des mesures à zéro et
  oublient un fill demandé ;
- l'atténuation de charge (`ouvrirPas` / `attenuerVoie`) ne change pas.

`page/html/230-unit-tr808.html` : boutons `tr8-fill` et `tr8-autofill`, après
SHUFFLE.

`page/html/520-note-808.html` : la notice décrit FILL et AUTO FILL.

## Mémoire et compatibilité

Le motif de fill et AUTO FILL sont gardés par machine (`memoire.tr808`,
`tr909`…), donc aussi dans les projets. Une valeur abîmée revient au défaut
(motif 16, AUTO FILL OFF). Les anciennes sauvegardes ouvrent avec ces défauts :
rien ne change tant qu'on n'appuie pas sur FILL.

Limites : une frappe en PATTERN WRITE pendant un fill s'inscrit dans le motif
courant, au pas du fill. Le rendu WAV suit AUTO FILL, mais sa durée reste celle
du motif courant.

## Validation locale

- nouveau test `outils/test-tr-fill.cjs`, ajouté à `outils/controles.sh`. Il
  exécute le vrai fichier de la TR et ses vrais boutons et vérifie : sans fill,
  inchangé ; FILL en lecture sur une seule mesure ; choix 13 à 16 à l'arrêt ;
  AUTO FILL 4 aux mesures 4 et 8 ; fill de 8 pas ; START ; mémoire avec valeurs
  abîmées et ancienne sauvegarde ; rendu hors ligne ;
- `test-tr-scale.cjs` mis à jour, il charge les deux nouvelles fonctions ;
- `bash outils/controles.sh` : **tous les contrôles passent** ;
- `python3 outils/test-navigateur.py` complet (29 machines, trois formats, sans
  débordement) : **tout est bon** ;
- `python3 outils/test-export-midi.py` (TR secondaire, export) : **tout est bon**.

À essayer sur le téléphone : TR-808, programmer un break dans le motif 16,
revenir au motif 1, START, puis FILL. Ensuite AUTO FILL 4.

Version : Android `236`, Windows/Tauri `236.0.0`. Appliquer après la v235.
