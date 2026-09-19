# v246 — MPC : huit programmes de pads, un par séquence

L'analyse de fidélité v122 demandait pour les MPC3000 et MPC2000 « plusieurs
programmes de pads ». Il n'y avait qu'un seul jeu de 64 pads pour toutes les
séquences : impossible de changer de kit entre deux parties d'un morceau.

## Utilisation

- Un **programme** est un jeu complet de 64 pads : sons, niveau, panoramique,
  accord, décroissance, filtre, point de départ, REVERSE, groupes de coupure,
  notes MIDI.
- **Huit programmes** par MPC. Le bouton **PROGRAM 1** à **8**, à côté de SEQ
  BPM, choisit celui de la séquence courante.
- Changer de séquence (pavé + ENT, chanson, ouverture) change de programme :
  un morceau peut passer d'un kit à un autre, chanson et rendu WAV du morceau
  compris.
- Régler un pad ou lui affecter un son depuis la bibliothèque ne touche que le
  programme affiché. COPY SEQ recopie aussi le programme choisi.

## Fonctionnement

`page/js/340-akai-mpc3000-mpc2000.js` :

- `MPC.progs` : 8 × `{nom, pads[64]}` ; `seq.prog` : le programme de chaque
  séquence ;
- `MPC.pads` reste **le programme de la séquence courante**. Tout le code qui
  lit ou règle un pad (lecture, potards, bibliothèque, MIDI, hasard, prise MIDI
  en WAV) ne change pas ;
- `appliquerProgMpc()` est appelée aux quatre endroits où la séquence change :
  pavé, chanson (`boucleMpc`), chargement, reprise du morceau pour le rendu
  (v244).

`page/js/280-electribe-es-1.js` : l'avertissement de la bibliothèque (« ce son
est utilisé par… ») compte maintenant les sons de **tous** les programmes, sans
compter deux fois le programme courant. Sans cela, on aurait pu supprimer un
son encore utilisé par un programme qu'on n'affichait pas.

`page/html/100-unit-mpc.html` : bouton `mpc-prog`.
`page/html/530-note-mpc.html` : section « Programmes ».

## Mémoire et compatibilité

`memoire.mpc3000` / `mpc2000` gardent `pads` (le programme 1, pour les anciennes
lectures) et ajoutent `progs` (les huit) et `prog` dans chaque séquence. Donc
aussi dans les projets.

Une **ancienne sauvegarde** n'a que `pads` : ce jeu devient le programme 1, sans
rien perdre, et les programmes 2 à 8 partent du kit de départ. Un programme
abîmé repart du kit, et un numéro hors bornes revient au programme 1.

## Validation locale

- nouveau test `outils/test-mpc-programmes.cjs`, ajouté à
  `outils/controles.sh`. Il exécute le vrai fichier de la MPC et ses vrais
  boutons, et vérifie : 8 programmes indépendants ; PROGRAM sur la séquence
  courante ; réglage limité au programme affiché ; changement au pavé ;
  chanson ; reprise du morceau ; mémoire ; ancienne sauvegarde ; programme
  abîmé ; COPY SEQ ; décompte de la bibliothèque, y compris sur une ancienne
  sauvegarde ;
- essai réel dans Chromium : une chanson séquence 1 (programme 1) puis
  séquence 2 (programme 2, autre son accordé +12). Les coups relevés à la
  lecture donnent programme 1, programme 2, puis programme 1 ;
- `test-mpc-99`, `test-restauration-machines`, `test-echantillons`,
  `test-bibliotheque`, `test-projet` et `test-memoire` passent toujours ;
- `bash outils/controles.sh` : **tous les contrôles passent** ;
- `test-navigateur.py` et `test-export-midi.py` : **tout est bon**.

À essayer sur le téléphone : MPC3000, séquence 2 (2 ENT), PROGRAM 2, changer le
son de quelques pads depuis la bibliothèque, puis revenir à la séquence 1 : ses
pads n'ont pas changé.

Version : Android `246`, Windows/Tauri `246.0.0`. Appliquer après la v245.
