# v243 — TR-1000 : chaîne de motifs

L'analyse de fidélité v122 plaçait la TR-1000 en priorité « très haute » et
demandait : « Song/arrangement à ajouter ». La TR-1000 avait 128 motifs en
8 banques, mais aucun moyen de les enchaîner (la notice disait « pas encore de
mode chanson »).

## Utilisation

Un panneau repliable **CHAÎNE DE MOTIFS**, sous « ÉDITER LA SÉQUENCE » :

- à l'arrêt, choisir banque et motif, puis **AJOUTER LE MOTIF**. Un même motif
  peut revenir plusieurs fois, 64 entrées au plus. La liste s'affiche dans
  l'ordre, avec le nom des motifs : `1. A1 (Intro) → 2. A1 → 3. B4`. Le titre
  du panneau résume l'état : `3 MOTIFS · ON`, puis `2/3` pendant la lecture ;
- **RETIRER LE DERNIER** enlève la dernière entrée. **VIDER** efface la chaîne
  après confirmation, jamais les motifs eux-mêmes ;
- **CHAÎNE ON** : START joue un tour de chaque motif, dans l'ordre, chacun avec
  sa longueur LAST, puis reprend au début. CHAÎNE OFF : START joue le motif
  choisi, comme avant.

## Fonctionnement

`page/js/480-roland-tr-1000.js` :

- la TR-1000 interdit de changer de motif pendant PLAY, et beaucoup de ses
  fonctions reposent sur cette règle. La chaîne change donc de motif
  **seulement entre deux tours**, dans `boucleT1k()`, que l'horloge appelle à la
  fin de chaque tour (y compris quand la TR-1000 est secondaire dans le SET) ;
- `entreeChaineT1k(n)` pose banque et motif, et remet le compteur de tours à
  zéro : les cycles A:B (v197) repartent au premier tour de chaque motif ;
- START ou une remise à zéro MIDI repartent de la première entrée ;
- FILL IN TRIG reste disponible et occupe la place d'un tour ;
- pendant PLAY, les boutons de la chaîne sont désactivés, comme les autres
  éditions de la TR-1000 ;
- la liste est écrite en `textContent`, car les noms de motifs viennent de
  l'utilisateur (règle v132).

La chaîne est gardée dans `memoire.t1k.chaine` (`[[banque, motif], …]`), donc
aussi dans les projets. Comme la MPC, la DMX et la TR, la machine rouvre avec
CHAÎNE OFF. Les entrées abîmées sont ignorées, et les anciennes sauvegardes
ouvrent une chaîne vide.

`page/html/140-unit-t1k.html` : le panneau. `page/html/430-note-t1k.html` :
section « Chaîne de motifs », et « pas encore de mode chanson » est retiré.

Limite : le rendu WAV joue le motif choisi, pas la chaîne entière.

## Validation locale

- essai réel dans Chromium à 240 BPM, avec la chaîne A1 (8 pas), A1, A2
  (16 pas) construite par les vrais boutons : coups à 0, 500, 1000, 2000,
  2500 et 3000 ms, soit A1, A1, A2 puis la reprise ; boutons bloqués pendant
  PLAY ; chaîne retrouvée après rechargement, CHAÎNE éteinte ;
- cet essai devient le bloc **37** de `outils/test-navigateur.py` (tolérance
  de 30 ms sur les instants, ordre des motifs exact), passé 5 fois de suite
  seul puis dans la suite complète ;
- `test-t1k.cjs` (v195 à v215) passe toujours ;
- `bash outils/controles.sh` : **tous les contrôles passent** ;
- `test-navigateur.py` et `test-export-midi.py` : **tout est bon**.

À essayer sur le téléphone : TR-1000, ouvrir CHAÎNE DE MOTIFS, ajouter A1, A1,
A2, CHAÎNE ON, START.

Version : Android `243`, Windows/Tauri `243.0.0`. Appliquer après la v242.
