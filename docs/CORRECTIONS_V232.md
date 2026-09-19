# v232 — SCALE de la TR change vraiment la durée des pas

Sur les TR-808, TR-909, TR-707 et la RD-6, le bouton **SCALE** changeait
seulement son libellé : la lecture restait en doubles croches. La notice le
reconnaissait (« SCALE change l'affichage mais la lecture reste en doubles
croches »). L'analyse de fidélité v122 le classait comme prioritaire : une
commande affichée doit faire ce qu'elle annonce.

## Cause

L'horloge commune appelle `scheduleTr(i, t)` une fois par double croche, et
`scheduleTr` jouait simplement le pas `i`. La valeur `TR.pat.scale` était
enregistrée et affichée, mais aucune fonction de lecture ne la lisait.

## Correction

`page/js/350-roland-tr-808-tr-909.js` :

- la TR tient son propre compteur (`TR.hN`, `TR.hK`, `TR.hIdx`) et place dans
  chaque tic de l'horloge commune les pas qui y tombent. Le pas k tombe au
  tic 16·k/SCALE, avec un calcul en entiers, donc sans dérive :
  - **16** : double croche, un pas par tic (le comportement d'avant) ;
  - **32** : triple croche, deux pas par tic ;
  - **12** : croche de triolet, trois pas pour quatre tics ;
  - **24** : double croche de triolet, trois pas pour deux tics ;
- l'atténuation de charge (`ouvrirPas` / `attenuerVoie`) reste dans
  `scheduleTr` et s'applique à chaque pas, à son propre instant ;
- SHUFFLE décale les pas impairs d'une fraction du pas de la TR, et non plus
  d'une double croche ;
- changer SCALE pendant la lecture : la nouvelle grille part du tic suivant et
  la position dans le motif continue ;
- START, ou une remise à zéro de l'horloge MIDI, repart du premier pas ;
- le curseur est lu dans une file propre à la TR (`TR.file`) : il reste juste
  quand la TR est secondaire dans le SET, où le rang compte en tics ;
- une frappe en PATTERN WRITE se rattache au pas le plus proche selon la
  vraie durée du pas ;
- `longueur()` renvoie la durée du motif en tics de l'horloge commune, ce qui
  règle la durée du rendu WAV et le SET ;
- une valeur SCALE inconnue dans une ancienne sauvegarde est lue comme 16.

`page/js/140-affichage-du-temps.js` : `pasLePlusProche(pos, L, duree)` accepte
une durée de pas facultative. Sans elle, rien ne change pour les autres
machines.

`page/html/520-note-808.html` : la notice explique SCALE et retire la mention
de la limitation.

## Pas modifié

Le format des motifs est le même. Toutes les sauvegardes en SCALE 16, la
valeur par défaut, jouent exactement comme avant. Les sons, les variations
A/B, le FLAM, LAST STEP et les autres machines ne changent pas. La v231
(effets écrits du PO-33) est conservée.

À savoir : avec LAST STEP 16 et un SCALE en triolet, le motif ne dure pas un
nombre entier de mesures (16 pas de triolet = 1 mesure 1/3). C'est le
comportement de la machine d'origine. Réglez LAST STEP sur 12 pour tomber
juste. Le rendu WAV arrondit alors au tic supérieur.

## Validation locale

- nouveau test `outils/test-tr-scale.cjs`, ajouté à `outils/controles.sh` :
  vraies fonctions de la page, les quatre SCALE, 3 000 mesures sans dérive,
  shuffle, changement pendant la lecture, START, rendu hors ligne, longueur en
  tics, curseur de la TR secondaire, rattachement d'une frappe ;
- `bash outils/controles.sh` complet : **tous les contrôles passent** (charge
  et atténuation, syntaxe, tests Node, Java simulé, bureau, MIDI et fichiers
  Rust) ;
- `drm16.html` réassemblé, identique aux sources `page/`.

Le test navigateur complet et l'APK sont faits par GitHub Actions. À essayer sur
le téléphone : TR-909, SCALE 32 puis 12, en écoutant que les pas accélèrent
puis passent en triolet.

Version : Android `232`, Windows/Tauri `232.0.0`. Appliquer après la v231.
