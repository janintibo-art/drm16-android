# v237 — 99 séquences sur la MPC3000 et la MPC2000

L'analyse de fidélité v122 notait pour les MPC : « Nombre de séquences
artificiellement réduit ». L'application n'en proposait que 8, choisies par les
touches 1 à 8. La MPC3000 en a 99.

## Utilisation

- **Choisir une séquence** : taper son numéro au pavé (un ou deux chiffres),
  puis **ENT**. La saisie s'affiche sur la dernière ligne de l'écran
  (`Aller a Seq: 42_`). **.** l'efface. Un troisième chiffre recommence la
  saisie. `08` vaut 8.
- **Mode SONG** : numéro + ENT ajoute la séquence au song
  (`Ajouter Seq: 15_`).
- **COPY SEQ** : copie vers une séquence de 1 à 99.

Changement d'habitude : un chiffre seul ne change plus de séquence, il faut
valider par ENT. C'est la façon de faire de la MPC, et le seul moyen d'atteindre
les séquences 10 à 99.

## Fonctionnement

`page/js/340-akai-mpc3000-mpc2000.js` :

- `MPC_NB_SEQ = 99`. Chaque séquence garde ses 99 pistes, son nom, ses mesures,
  son Timing Correct, son swing et son tempo propre ;
- `toucheNumMpc()` gère le pavé : chiffres, `.` et `ENT` ;
- `majLcdMpc()` affiche la saisie en cours sur toutes les pages (principale,
  song, pistes, pas à pas) ;
- l'enregistrement, l'effacement, UNDO SEQ et la lecture ne changent pas : ils
  travaillent sur la séquence courante.

`page/html/530-note-mpc.html` : la notice décrit les 99 séquences et la saisie.

## Mémoire et compatibilité

Les 99 séquences sont sauvegardées (`memoire.mpc3000` / `mpc2000`, donc aussi
dans les projets). Une ancienne sauvegarde à 8 séquences garde ces 8 séquences à
leur place, et les séquences 9 à 99 sont vides. Une séquence courante hors
bornes revient à la première. Les pas de chanson qui visent une séquence
inexistante sont retirés.

## Validation locale

- nouveau test `outils/test-mpc-99.cjs`, ajouté à `outils/controles.sh` : le
  vrai fichier de la MPC et ses vrais boutons, 99 séquences, numéro + ENT (1, 2
  chiffres, 99, 08), saisie refusée ou effacée, mode chanson, mémoire, ancienne
  sauvegarde à 8, données abîmées, COPY SEQ vers 77, MPC2000 ;
- `outils/test-restauration-machines.cjs` : le changement de séquence y passe
  maintenant par ENT, et UNDO reste isolé par séquence ;
- `bash outils/controles.sh` : **tous les contrôles passent** ;
- `python3 outils/test-navigateur.py` complet : **tout est bon** ;
- `python3 outils/test-export-midi.py` : **tout est bon**.

À essayer sur le téléphone : MPC3000, taper 1 2 ENT, enregistrer quelques
frappes, taper 1 ENT, puis 1 2 ENT pour les retrouver.

Version : Android `237`, Windows/Tauri `237.0.0`. Appliquer après la v236.
