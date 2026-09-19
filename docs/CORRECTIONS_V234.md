# v234 — Mode SONG de l'Oberheim DMX

Le bouton **SONG** de la DMX affichait « NOT ON DMX ». L'analyse de fidélité v122
demandait « un Song mode simple mais réellement utilisable ». Il enchaîne
maintenant les huit séquences.

## Utilisation

- **SONG** : passe en mode song, et revient aux séquences au second appui.
- **Touches 1 à 8** (en mode song) : ajoutent la séquence à la fin du song,
  jusqu'à 64 pas.
- **< et >** : choisissent le pas du song à modifier.
- **LENGTH** : nombre de répétitions de ce pas : 1, 2, 3, 4 ou 8.
- **ERASE** : retire ce pas. **EDIT** : annule la dernière modification du song.
- **PLAY** : joue le song depuis le début et le reprend quand il est fini.
- Afficheur : `S2/5 SEQ3 X2` à l'arrêt (pas 2 sur 5, séquence 3, deux fois),
  `S2/5 SEQ3 1.3` en lecture.

En mode song, les autres commandes (QUANTIZE, SWING, COPY, RECORD) agissent
comme avant sur la séquence courante. On peut enregistrer pendant le song : les
frappes vont dans la séquence qui joue.

## Fonctionnement

`page/js/520-oberheim-dmx.js` :

- les séquences n'ont pas toutes la même longueur (LENGTH 1, 2, 4 ou 8
  mesures). En song, la DMX garde donc sa propre position (`DMX.chI`) au lieu
  du pas de l'horloge commune, et passe au pas suivant du song à la fin de
  chaque séquence (`avancerSongDmx`). Le changement de séquence tombe
  exactement à la fin de la précédente, y compris quand la DMX est secondaire
  dans le SET ;
- PLAY, ou une remise à zéro de l'horloge MIDI, repart du premier pas du song ;
- l'atténuation de charge (`ouvrirPas` / `attenuerVoie`) ne change pas ;
- un pas retiré pendant la lecture ne laisse jamais la lecture sur un pas qui
  n'existe plus ;
- **STEP** répond toujours NOT ON DMX.

## Mémoire et compatibilité

Le song est sauvegardé dans `memoire.dmx.song` sous la forme `[[séquence,
répétitions], …]`, donc aussi dans les projets `.drm16`. Au chargement, les pas
abîmés sont ignorés et une répétition inconnue est lue comme 1. Les anciennes
sauvegardes n'ont pas de song et ouvrent un song vide. Les séquences, les
niveaux et les quantifications ne changent pas.

Comme la MPC, la DMX rouvre en mode séquence : le song est gardé mais pas
relancé. Le rendu WAV joue la séquence choisie. Rendre un song entier en WAV
reste à faire, pour la MPC comme pour la DMX.

`page/html/510-note-dmx.html` : la notice décrit le song.

## Validation locale

- nouveau test `outils/test-dmx-song.cjs`, ajouté à `outils/controles.sh` : le
  vrai fichier de la DMX et ses vrais boutons, l'édition (ajout, choix, LENGTH,
  ERASE, EDIT, limite de 64), la lecture de séquences de 16 et 32 pas, les
  répétitions, la reprise au bout du song, PLAY qui repart du début, le mode
  séquence inchangé, la mémoire avec des données abîmées ;
- `test-restauration-machines.cjs` (QUANTIZE OFF et UNDO de la DMX) passe
  toujours ;
- `bash outils/controles.sh` complet : **tous les contrôles passent** ;
- `drm16.html` réassemblé, identique aux sources `page/`.

À essayer sur le téléphone : SONG, taper 1 puis 2, LENGTH sur le premier pas,
PLAY.

Version : Android `234`, Windows/Tauri `234.0.0`. Appliquer après la v233.
