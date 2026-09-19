# v247 — KAOSS PAD : huit mémoires de programmes

L'analyse de fidélité v122 demandait pour le KAOSS PAD « Start/Slice et
mémoires de programmes ». Slice existe depuis. Les mémoires manquaient : pour
passer d'un écho réglé à une réverbération réglée en jouant, il fallait tout
refaire à la main.

## Utilisation

Une ligne sous FX RELEASE : **WRITE** et huit touches **1 à 8**.

- **Ranger** : WRITE (il s'allume, les touches aussi), puis un numéro. La
  mémoire garde l'**effet**, **FX DEPTH**, la position **X·Y**, **HOLD** et
  **FX RELEASE**.
- **Rappeler** : un appui sur un numéro. Tout revient d'un coup, même en
  lecture. Avec HOLD mémorisé, l'effet sonne aussitôt au point rangé.
- Une touche soulignée est pleine ; celle du dernier programme rappelé ou
  rangé est allumée. Une mémoire vide ne change rien et le dit.
- Les banques et leurs sons ne font pas partie du programme : ils restent ce
  qu'on joue.

## Fonctionnement

- `page/js/570-korg-kaoss-pad.js` : `KP.mems` (8 × programme ou `null`),
  `programmeKp()`, `lireProgrammeKp()` (valeurs bornées, effet dans la liste)
  et `toucheMemoireKp(n)`. Le rappel passe par `appliquerKp()`, comme un geste
  sur le pavé : lissage des réglages et FX RELEASE (v242) compris ;
- `page/js/590-smpltrek-dix-pistes.js` (façade du KAOSS PAD) : touches créées
  une fois, chacune avec son gestionnaire, voyants et libellés accessibles
  (« Mémoire 2 : ÉCHO »), curseur FX DEPTH remis à la valeur rappelée ;
- `page/html/180-unit-kp.html` : la ligne. `page/css/090-roland-tr-808.css` :
  une ligne de neuf touches de 40 px de haut ;
- `page/html/380-note-kp.html` : la notice.

Les mémoires sont gardées dans `memoire.kp.mems`, donc aussi dans les projets.
Les anciennes sauvegardes ouvrent huit mémoires vides.

## Validation locale

- nouveau bloc **39** de `outils/test-navigateur.py`, avec les vrais boutons :
  mémoire vide sans effet ; deux programmes rangés (2 : ÉCHO avec HOLD et FX
  RELEASE ; 5 : RÉVERBÉRATION) ; WRITE qui retombe ; rappel du 2 avec toutes
  les valeurs, curseur FX DEPTH compris, et l'écho mixé tout de suite ;
  mémoires retrouvées après rechargement. Passé deux fois de suite seul, puis
  dans la suite complète ;
- `test-kp`, `test-kp-resample`, `test-kp-release` et
  `test-restauration-machines` passent toujours ;
- `bash outils/controles.sh` : **tous les contrôles passent** ;
- `test-navigateur.py` (29 machines, trois formats, aucun débordement avec la
  ligne ajoutée) : **tout est bon**.

À essayer sur le téléphone : régler un écho avec HOLD, WRITE puis 1 ; une
réverbération, WRITE puis 2 ; en jouant, passer de 1 à 2.

Version : Android `247`, Windows/Tauri `247.0.0`. Appliquer après la v246.
