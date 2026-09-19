# v233 — Test d'export : une vraie valeur de SCALE

Le run GitHub de la v232 a échoué à l'étape **Test dans un navigateur**, sur deux
contrôles de `outils/test-export-midi.py` :

```text
FAUX  tr909 : TR808 secondaire, motif, tempo et égaliseur restaurés
FAUX  tr808 : TR808 secondaire, motif, tempo et égaliseur restaurés
```

## Cause

Ce test règle la TR-808 avec `TR.pat.scale = 8`, fait un export, puis vérifie que
l'état de la TR est retrouvé à l'identique. La valeur 8 n'existe pas sur la
machine : SCALE ne propose que 16, 32, 12 et 24. Avant la v232, SCALE n'avait
aucun effet et n'importe quelle valeur faisait l'aller-retour. Depuis la v232,
une valeur inconnue relue dans la mémoire devient 16 (`echelleTr`), ce qui est
voulu : une sauvegarde abîmée ne doit pas donner une grille impossible. L'état
après l'export était donc « SCALE 16 » au lieu de « SCALE 8 ».

Ce n'était pas une régression de l'application. Tous les autres contrôles du run
passaient, dont le rejeu du SET après l'export.

## Correction

`outils/test-export-midi.py` : le test utilise `TR.pat.scale = 24`, une vraie
valeur autre que celle par défaut. Il vérifie donc toujours que SCALE est
conservé après un export, et en plus qu'une TR secondaire en triolet est bien
restaurée.

L'application ne change pas.

## Validation locale

- `python3 outils/test-export-midi.py` dans Chromium : les deux contrôles
  « TR808 secondaire… restaurés » passent, **aucun échec** ;
- `bash outils/controles.sh` : inchangé depuis la v232, tous les contrôles passent.

Version : Android `233`, Windows/Tauri `233.0.0`. Appliquer par-dessus la v232.
