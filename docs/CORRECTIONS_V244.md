# v244 — Rendu WAV d'un morceau enchaîné

Les v233 à v243 ont ajouté des modes « morceau » : TRACK des TR et de la RD-6
(v238), SONG de la DMX (v234), chaîne de la TR-1000 (v243). La MPC avait déjà sa
chanson. Chaque fois, il restait la même limite : **EXPORTER EN WAV rendait le
motif courant**, jamais le morceau.

## Ce qui change

Si la machine affichée est en mode morceau (TRACK allumé, SONG, chanson de la
MPC, CHAÎNE ON), **EXPORTER EN WAV** rend **un passage complet du morceau**,
chaque motif avec sa longueur et ses répétitions, au lieu du nombre de mesures
choisi. Le fichier s'appelle `drm-<machine>-morceau-….wav`. Hors mode morceau,
rien ne change.

## Fonctionnement

Chaque machine concernée reçoit deux fonctions, ajoutées à son descripteur :

- `planChaine()` : `null` hors mode morceau, sinon le nombre de tics d'un
  passage complet :
  - TR : somme des longueurs LAST converties par SCALE ; avec AUTO FILL, une
    mesure de fill compte pour la longueur du motif de fill ;
  - DMX et MPC : mesures × 16 × répétitions de chaque pas ;
  - TR-1000 : somme des LAST de la chaîne ;
- `reprendreChaine()` : rallume le mode morceau au début.

`page/js/550-export-audio.js` : `exporterWav` relève `planChaine()` **avant** de
rouvrir la machine dans le contexte de rendu (la réouverture éteint toujours le
mode morceau), le rallume dans le contexte de rendu, puis joue les tics comme
l'horloge du jeu : le pas revient à 0 à la fin du motif courant et
`boucle()` fait avancer la chanson de la MPC et la chaîne de la TR-1000. Au
retour, le mode morceau est rallumé sur la machine en jeu, y compris après un
rendu raté.

Fichiers : `page/js/550-export-audio.js`, `350-roland-tr-808-tr-909.js`,
`520-oberheim-dmx.js`, `340-akai-mpc3000-mpc2000.js`, `480-roland-tr-1000.js`.
Notices : onglet Général, TR, DMX, MPC, TR-1000.

Le plafond de durée d'un rendu (64 Mo) s'applique au morceau entier. Un morceau
trop long est refusé avant le calcul, avec la durée maximale.

## Validation locale

- nouveau bloc **38** de `outils/test-navigateur.py` : vrai export dans
  Chromium pour chaque machine, puis lecture du WAV :
  - TR-808, chaîne 1 (16 pas), 2 (8 pas), 1 : durée de 40 pas, attaques à 0,
    2 et 3 s ;
  - DMX, séquence 1 deux fois puis séquence 2 (2 mesures) : 64 pas, attaques à
    0, 2 et 4 s ;
  - MPC3000, même plan : 64 pas, attaques à 0, 2 et 4 s ;
  - TR-1000, A1 (8), A1, A2 (16) : 32 pas, attaques à 0, 1 et 2 s ;
  - mode morceau rallumé après chaque export, et export habituel inchangé hors
    mode morceau.

  Contre-épreuve : la même détection, placée à des instants sans coup (1 s et
  2,5 s sur la TR), répond bien « non » ;
- `bash outils/controles.sh` : **tous les contrôles passent** ;
- `test-navigateur.py`, `test-export-midi.py` et `test-export-stk.py` :
  **tout est bon**.

À essayer sur le téléphone : TR-909, TRACK avec trois ou quatre motifs, puis
onglet Général, EXPORTER EN WAV.

Version : Android `244`, Windows/Tauri `244.0.0`. Appliquer après la v243.
