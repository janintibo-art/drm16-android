# v240 — Les effets des Electribe passent par leur voie de table

Défaut noté en v149 et resté ouvert : « une partie du signal de l'EM-1 rejoint
la sortie sans passer par sa voie. À revoir. » Il était plus large que l'EM-1.

## Cause

L'EM-1, l'ER-1, l'EA-1 et l'ES-1 partagent **un seul bus d'effet et de délai**
(l'ES-1 utilise même le réglage d'effet de l'EM-1). Ce bus envoyait sa sortie
**directement au mélange général** (`fxOut.connect(master)`,
`dlyNode.connect(master)`). Tout ce qui passait par l'effet ou le délai échappait
donc à la voie de la machine : MUTE, SOLO, fader, panoramique, égaliseur,
gain d'entrée et calibrage.

Mesuré dans Chromium sur la v239, en jouant la machine avec l'effet ou le délai
poussé puis en coupant sa voie à la table :

| Machine | voie ouverte | voie **coupée** (v239) | voie coupée (v240) |
|---|---:|---:|---:|
| ES-1 (réverbération + délai) | −10,4 dB | **−13,9 dB** | silence |
| ER-1 (délai) | −7,2 dB | **−6,9 dB** | silence |
| EM-1 (réverbération) | −5,7 dB | silence | silence |

Sur l'ER-1, couper la voie n'enlevait donc presque rien.

## Correction

`page/js/250-electribe-em-1.js` : un nœud `fxRetour` reçoit l'effet et le délai,
et c'est lui qui se branche sur la voie (`busSet(FX_VOIE)`). `routerEffets(id)`
le déplace sur la voie de l'Electribe qu'on ouvre. `activerEm`, `activerEr`,
`activerEa` et `activerEs` l'appellent (`em`, `er`, `ea`, `es`).
`page/js/110-moteur-audio.js` : `razNoeudsMachines` oublie aussi `fxRetour`
(changement de contexte, rendu hors ligne).

Le bus reste unique, comme avant. Dans un SET qui mêle plusieurs Electribe,
l'effet partagé suit la voie de la dernière Electribe ouverte.

## Recalibrage de l'EM-1

Le calibrage v149 de l'EM-1 (+3,8 dB) avait été poussé pour compenser justement
cette part qui contournait la voie (« +2,1 dB mesurés n'ont donné que +1,1 »).
Maintenant que l'effet passe par la voie, sa voix la plus forte montait à
−7,2 dBFS. Le calibrage passe à **+3,0 dB**
(`page/js/150-le-set-plusieurs-machines-a-la-fois.js`). Banc de mesure :

- voix la plus forte : **−8,00 dBFS**, la cible de la phase B, comme avant ;
- toutes les voix ensemble : −4,01 → **−4,73 dBFS** ;
- les 32 autres machines : inchangées. ER-1, EA-1 et ES-1 restent à −8,0 dBFS,
  leur délai étant à zéro dans le banc.

La référence `docs/mesures-son.*` n'est **pas** remplacée. Remesurée en v239,
elle montre un écart ancien sur la **volca sample** : sa voix la plus forte est à
−3,3 dBFS au lieu de −8,0. C'est l'écart déjà signalé par le check-up v176, et
réécrire la référence l'effacerait. Il reste à traiter à part.

## Validation locale

- nouveau test `outils/test-effets-voie.cjs`, ajouté à `outils/controles.sh`.
  Sur un graphe simulé qui relève chaque branchement, il vérifie : retour →
  voie EM et aucun lien vers le mélange général ; passage sur les voies es, er,
  ea, em ; ouverture à froid ; nœud d'un ancien contexte non rebranché ; dans
  les sources, plus aucun `fxOut`/`dlyNode` vers `master`, les quatre
  activations routées, `razNoeudsMachines` complet ;
- essai d'écoute réel dans Chromium (tableau ci-dessus), v239 puis v240 ;
- `bash outils/controles.sh` : **tous les contrôles passent** ;
- `test-navigateur.py` et `test-export-midi.py` : **tout est bon**.

À essayer sur le téléphone : ES-1, délai poussé, lecture, puis couper sa voie
dans la table. Les échos doivent s'arrêter aussi.

Version : Android `240`, Windows/Tauri `240.0.0`. Appliquer après la v239.
