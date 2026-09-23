# v293 — Correctif : test FOCUS désynchronisé depuis CYCLES LIBRES (v291)

Base vérifiée : v292 (117 modules, 63 montages), dont la compilation avait échoué.
Livraison : un correctif incrémental à appliquer sur la v292, sous `drm16_android/`.

## Ce qui bloquait la compilation

Le run GitHub Actions de la v292 a échoué à l'étape « Test dans un
navigateur », dans `outils/test-eurorack-focus.py` :

```
FAUX : ... 117 façades complètes et cibles confortables :
[{'type': 'scenes8', 'kn': False, ...}, {'type': 'harmonie8', 'kn': False, ...}]
```

Ce test ouvre la vue FOCUS de chacun des 117 types de module et compte les
champs affichés. Pour **SCÈNES 8** et **HARMONIE 8**, ce compte est un
nombre fixe de `<select>` écrit en dur (`.sc8-editeur select`,
`.hr8-grand select`).

**CYCLES LIBRES (v291)** a ajouté un réglage `PAS/MESURE` — un `<select>`
de plus — dans l'éditeur de SCÈNES 8 (`458-scenes8-eurorack.js`) et dans
celui de HARMONIE 8 (`477-harmonie-interface.js`). Le compte attendu dans
`test-eurorack-focus.py` n'avait pas été mis à jour à cette occasion (8→9
pour SCÈNES 8, 10→11 pour HARMONIE 8), alors qu'un test proche,
`test-harmonie8.py`, l'avait bien été. Cette omission a fait échouer la
compilation Android de la v291 et, sans qu'on s'en aperçoive avant l'envoi,
celle de la v292 (PERFORMANCE MOUVANTE) aussi : ni les nouveaux tests dédiés
à PERFORMANCE MOUVANTE ni la compilation de l'APK n'ont pu s'exécuter,
l'étape s'arrêtant à la première erreur rencontrée.

Ce correctif ne touche aucun code applicatif : seul le nombre attendu de
`<select>` dans `test-eurorack-focus.py` est corrigé, pour refléter ce que
CYCLES LIBRES avait déjà changé dans la v291.

## Compatibilité et préservation

Le catalogue reste à **117 modules et 63 montages**, identiques. Les
versions Android/Windows deviennent 293 et 293.0.0. Aucun fichier de
l'application (JS, CSS, HTML) n'est modifié dans ce lot ; seul un fichier
de test l'est.

## Validation effectuée

- `outils/test-eurorack-focus.py` relancé seul : **4 formats et 468
  ouvertures catalogue, 0 erreur** (contre 4 erreurs avant correction).
- `outils/test-scenes8.py` (726 vérifications) et `outils/test-harmonie8.py`
  (591 vérifications) relancés en entier : **0 erreur**, confirmant que le
  réglage PAS/MESURE lui-même fonctionne bien depuis la v291 — seul le
  compte de ce test dédié à FOCUS était resté en retard.
- `outils/test-performance-eurorack.cjs` (42 scénarios) et
  `outils/test-performance-eurorack.py` (646 vérifications, avec rendus
  audio réels) relancés : **0 erreur** — la v292 elle-même (PERFORMANCE
  MOUVANTE) reste entièrement valide, seule la compilation avait été
  bloquée par ce test tiers.
- `bash outils/controles.sh` : façades, assemblage exact des 235 sources,
  identifiants HTML uniques, syntaxe JavaScript, compilation Java de
  contrôle, tests Java et Rust historiques — **tous passés**.
- **Deux passages complets de `outils/test-navigateur.py`** (25 machines,
  trois formats d'écran) : **0 FAUX** les deux fois.

Environnement : Chromium sous Linux, Node, page chargée en mémoire. La
compilation Gradle Android et la compilation Tauri Windows/WebView2
restent à valider après l'envoi, par la vraie exécution GitHub Actions.

## Fichiers livrés (5)

- `outils/test-eurorack-focus.py` : compte de champs `<select>` corrigé
  pour SCÈNES 8 (8→9) et HARMONIE 8 (10→11), PAS/MESURE compris.
- Trois fichiers de version, `REPRENDRE.md`, et ce document.
