# v250 — Grand check-up des v231 à v247, compilation de la v249 réparée

Le bilan complet est dans [CHECKUP_V250.md](CHECKUP_V250.md).

## Fichiers modifiés

- `page/js/660-choix-du-modele.js` : `morceauxActifs()`, `rallumerMorceaux()`,
  `rouvrirMachine()` ;
- `page/js/110-moteur-audio.js` (relance du moteur),
  `page/js/210-transfert-vers-une-vraie-volca-sample.js` (enregistreur,
  bibliothèque, pads, fin de la vue à plusieurs machines),
  `page/js/540-hasard-sur-les-sons.js` (tirage au sort) : `rouvrirMachine()` ;
- `page/js/600-rendre-une-prise-midi-en-wav.js`,
  `page/js/610-formes-d-onde-par-piste.js` : modes relevés avant le rendu,
  rallumés après ; `page/js/550-export-audio.js` : même chemin ;
- `page/js/340-akai-mpc3000-mpc2000.js` : programmes écrits allégés, relus
  dans les deux formes ; `page/js/280-electribe-es-1.js` : le compte de la
  bibliothèque lit le programme 1 dans `pads` ;
- `page/js/480-roland-tr-1000.js` : `ecrireMotifT1k()`, `motifVideT1k()`,
  motif vide écrit `null` ;
- `page/html/340-note-general.html`, `page/html/400-note-stk.html` : format
  WAV et mode morceau ;
- `outils/test-kp.cjs` : charge Freesound (625) avant la bibliothèque (630) ;
  c'est ce qui arrêtait la compilation de la v249 ;
- tests : `outils/test-navigateur.py` (bloc 40), `outils/test-mpc-programmes.cjs`,
  `outils/test-t1k.cjs`.

## Validation locale (sur la v249 + ces changements)

- `bash outils/controles.sh` : tous les contrôles passent ;
- `outils/test-navigateur.py` : deux passages complets, 352 vérifications, 0 FAUX
  (bloc 40 compris) ;
- exports MIDI et SmplTrek, TR-1000 navigateur, diagnostic audio, fichiers
  bureau : 0 FAUX ;
- audit des clics : 0 changement brusque sur 21 machines.

Non vérifié ici : la compilation Android et le téléphone.
