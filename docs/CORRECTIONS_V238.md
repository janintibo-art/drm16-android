# v238 — TRACK des TR : enchaîner les motifs

L'analyse de fidélité v122 demandait, pour la TR-808 « Rhythm Track /
arrangement de morceau », pour la 909 « Track mode / arrangement », pour la 707
« Song/Track mode » et pour la RD-6 « Song/chain de patterns ». Rien ne
permettait d'enchaîner les motifs, et la notice disait « Pas de mode chanson ».
Les TR-808, TR-909, TR-707 et la RD-6 ont maintenant un bouton **TRACK**.

## Utilisation

- **TRACK** allume le mode. Les **touches de pas** ajoutent alors une mesure du
  motif correspondant (1 à 16) au bout de la chaîne, avec la variation A ou B
  affichée à ce moment-là. **CLEAR** retire la dernière mesure.
- **START** joue la chaîne mesure après mesure, chaque motif avec sa propre
  longueur LAST STEP, et la reprend au bout. L'afficheur indique `TRACK 3/8`,
  et les touches de pas montrent le motif joué.
- **FILL** et **AUTO FILL** (v236) marchent par-dessus. La chaîne avance aussi
  pendant une mesure de fill.
- Éteindre TRACK ramène à l'édition normale des motifs. La chaîne est gardée.

## Fonctionnement

`page/js/350-roland-tr-808-tr-909.js` :

- `debutTourTr()`, appelée au début de chaque mesure (v236), passe à l'entrée
  suivante de la chaîne quand TRACK est allumé : motif courant, variation,
  façade ;
- la variation est relue à chaque pas, ce qui permet à une entrée B de suivre
  une entrée A ;
- `ajouterChaineTr()` ajoute une mesure, 64 au plus ;
- START ou une remise à zéro MIDI repartent de la première mesure.

`page/html/230-unit-tr808.html` : bouton `tr8-track`.
`page/html/520-note-808.html` : la notice décrit TRACK, et « Pas de mode
chanson » est retiré.

## Mémoire et compatibilité

La chaîne est gardée par machine (`memoire.tr808.chaine` = `[[motif, B ?], …]`),
donc aussi dans les projets. Comme la MPC et la DMX, la machine rouvre hors
TRACK. Les entrées abîmées sont ignorées. Les anciennes sauvegardes ouvrent une
chaîne vide. Rien ne change tant que TRACK reste éteint.

Limites : la chaîne se joue en boucle, sans arrêt en fin de morceau. Si des
motifs enchaînés ont des SCALE différents, la nouvelle grille s'applique au tic
suivant. Le rendu WAV joue la chaîne, mais sa durée reste celle du motif
courant.

## Validation locale

- nouveau test `outils/test-tr-track.cjs`, ajouté à `outils/controles.sh`. Il
  exécute le vrai fichier de la TR, ses vrais boutons et ses touches de pas, et
  vérifie : ajout et retrait sans toucher aux motifs ; lecture 1, 3, 2B puis
  reprise ; motifs de 8 et 16 pas ; AUTO FILL par-dessus ; START ; TRACK
  coupé ; mémoire et données abîmées ; limite de 64 ;
- `test-tr-scale.cjs` et `test-tr-fill.cjs` passent toujours ;
- `bash outils/controles.sh` : **tous les contrôles passent** ;
- `python3 outils/test-navigateur.py` (29 machines, trois formats, sans
  débordement avec le bouton de plus) : **tout est bon** ;
- `python3 outils/test-export-midi.py` : **tout est bon**.

À essayer sur le téléphone : TR-909, TRACK, touches 1, 1, 2, 3, START.

Version : Android `238`, Windows/Tauri `238.0.0`. Appliquer après la v237.
