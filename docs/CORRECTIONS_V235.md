# v235 — Tests navigateur stables au rechargement

En préparant la v234, le test navigateur complet a échoué en local sur le bloc
**31. EM-1 : 64 pas** :

```text
FAUX  longueur et pas 64 restaurés
FAUX  em_64_pas a planté : Locator.select_option: Timeout 30000ms exceeded.
```

Le même bloc échouait aussi sur la v230 d'origine, deux fois sur cinq. Ce n'était
donc pas une régression.

## Cause

C'est le défaut déjà corrigé en v151 pour le bloc 10. Le test enregistre, recharge
la page puis relit le stockage local. Or une page ouverte en `file://` perd
parfois ce stockage au rechargement dans Chromium : l'EM-1 revenait alors à 16
pas. Les tests écrits depuis la v151 servent la page sur `http://tauri.localhost/`
(`servir_page`), mais quatre tests rechargeaient encore une page en `file://` :

- 9. Latence et machine retrouvée au redémarrage (`reglages`) ;
- 31. EM-1 : 64 pas (`em_64_pas`) ;
- 33. EM-1 : édition du Song (`em_song_edition`) ;
- EM-1 : noms des motifs (`em_noms_motifs`).

## Correction

`outils/test-navigateur.py` :

- `nouvelle_page(…, http=True)` ouvre la page dans un contexte servi par
  `servir_page`, avec le même pont simulé ;
- les trois tests EM-1 l'utilisent, et `reglages` sert sa page de la même façon.

L'application ne change pas.

## Validation locale

- les quatre tests enchaînés **cinq fois** : **0 échec**, alors que `em_64_pas`
  échouait 2 à 3 fois sur 5 avant ;
- `python3 outils/test-navigateur.py` complet : **tout est bon** ;
- `drm16.html` identique aux sources `page/`.

Version : Android `235`, Windows/Tauri `235.0.0`. Appliquer après la v234.
