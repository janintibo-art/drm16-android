# v239 — Export WAV : dither en 16 bits, option 24 bits

Le plan qualité sonore (phase 3, point 13) demandait « Export 24 bits + dither ».
Jusqu'ici, tous les rendus WAV (motif, Song de l'EM-1, prise MIDI, chaîne du
SmplTrek) étaient écrits en 16 bits par **simple troncature** : chaque
échantillon perdait sa partie fractionnaire, ce qui hache les fins de notes et
les queues de réverbération très faibles en petites marches.

## Ce qui change

Un nouveau bouton, **EXPORT WAV**, dans l'onglet Général à côté de SATURATIONS :

- **16 BITS + DITHER** (par défaut) : même format et même taille qu'avant, lu
  partout. Chaque échantillon est arrondi avec un **dither triangulaire (TPDF)**
  d'un pas de quantification. Le bruit ajouté est inaudible et reste constant ;
  en moyenne, un niveau situé entre deux pas est rendu fidèlement au lieu d'être
  perdu. Un échantillon plus faible qu'un demi-pas reste à **zéro exact** : un
  silence numérique reste un vrai silence, sans souffle ;
- **24 BITS** : 256 fois plus fin, sans dither (bruit de quantification à
  −144 dBFS), pour retravailler le son dans un logiciel. Les fichiers sont 1,5
  fois plus gros, donc la durée maximale d'un rendu baisse d'un tiers (le
  plafond de 64 Mo ne change pas).

## Fichier par fichier

- `page/js/550-export-audio.js` : `wavStereo(buf, bits, hasard)` écrit du
  16 bits avec dither ou du 24 bits. `bitsExport()` lit le réglage et
  `octetsTrameExport()` donne 4 ou 6 octets par instant stéréo. Ces deux
  fonctions sont placées après `wavStereo`, parce que `test-em-song.cjs` et
  `test-transport.cjs` chargent le fichier à partir d'elle ;
- `page/js/650-transfert-exclusif-vers-une-vraie-korg.js` :
  `tailleWavStereo` et le refus des rendus trop longs suivent le format choisi ;
- `page/js/190-reglages-de-la-notice.js` : bouton `b-wav24` ;
- `page/js/030-memoire.js` : `memoire.wav24` est lu et écrit (liste fermée des
  clés globales) ;
- `page/html/340-note-general.html` : bouton et explication.

Les quatre exports passent tous par `wavStereo` et suivent donc le réglage.
L'export vers une carte ES-1 (`wavDe`, mono 16 bits pour la machine réelle)
n'est pas modifié.

## Validation locale

- nouveau test `outils/test-wav-export.cjs`, ajouté à `outils/controles.sh`. Il
  vérifie : l'en-tête et la taille en 16 bits, identiques à avant ; le silence
  exact et NaN à zéro ; la saturation bornée ; une moyenne juste à 0,05 pas
  près ; un dither d'au plus ±1 pas ; 1,4 pas rendu en moyenne là où la
  troncature donnait 1 ; les valeurs 24 bits exactes ; les tailles ; un rendu
  de 5 min refusé en 24 bits avec « 4 MIN 13 AU PLUS » ; le format imposé ;
- essai réel dans Chromium : export d'une TR-808 en 16 puis en 24 bits. Les
  deux fichiers se relisent avec `decodeAudioData`, la durée est identique
  (4,5 s), la crête aussi (0,32), la taille est exactement celle prévue, et le
  réglage est retrouvé dans la mémoire ;
- `bash outils/controles.sh` : **tous les contrôles passent** ;
- `test-navigateur.py`, `test-export-midi.py` et `test-export-stk.py` :
  **tout est bon**.

À essayer sur le téléphone : onglet Général, EXPORT WAV sur 24 BITS, rendre un
motif, puis ouvrir le fichier dans un lecteur ou un éditeur audio.

Version : Android `239`, Windows/Tauri `239.0.0`. Appliquer après la v238.
