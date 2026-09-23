# Corrections v295 — POLY 4

Nouveau lot Eurorack, proposé après la v294 : « POLY 4 (synthé autonome à quatre voix, clavier
tactile, accords mémorisables) ». Un nouveau module joué au doigt, plus deux montages qui l'utilisent.

## `page/js/479i-poly4.js` (nouveau)

**POLY 4** est un synthé autonome à quatre voix, joué au doigt sur un clavier tactile d'une octave
(DO à DO) plutôt que câblé : sa seule prise est OUT, rien à séquencer pour l'entendre — un instrument
de scène plutôt qu'un module du rack. Quatre voix persistantes (deux VCO légèrement désaccordés par
voix → filtre passe-bas → enveloppe tenue) sont allouées à la volée : une note déjà tenue est reprise,
sinon une voix libre, sinon la plus ancienne est volée (vol de voix classique d'un synthé
polyphonique). L'enveloppe tient son palier tant que la touche reste pressée, au lieu de redescendre
seule — même principe d'historique que `EUR_RAVE.enveloppe` (nécessaire pour un rendu hors ligne
correct, où tout est programmé d'avance), adapté pour tenir plutôt que décroître automatiquement.
Réglages : OSCILLATEUR (dent de scie / carré / triangle), DÉSACCORD, FILTRE, RÉSONANCE, ATTAQUE ms,
CHUTE ms (sert aussi de temps de relâchement), NIVEAU — tous accessibles par des menus dans la façade
dédiée, comme sur SCÈNES 8.

Quatre pastilles **MÉMOIRE** capturent l'accord tenu au clavier (bouton MÉMORISER puis une pastille) et
le rejouent ensuite d'une seule pression, sans repasser par les touches. Comme TENIR sur SCÈNES 8, ce
sont des gestes de jeu, pas des réglages : ils ne sont pas enregistrés dans le projet. OCTAVE − / +
décale le clavier de deux octaves dans chaque sens. Catalogue : 119 → 120 types de modules.

## `page/css/470-poly4.css` (nouveau)

Styles de la façade POLY 4 : clavier en `flex-wrap` (treize touches, cinq noires, jamais de
débordement horizontal même à 393 px de large), grille de quatre mémoires, réglages en `<select>`,
toutes les cibles tactiles à 44 px minimum.

## `page/js/479j-montages-poly4.js` (nouveau)

Deux montages : **NAPPE · ACCORDS AU DOIGT** (86 bpm, chute longue, écho puis réverbe) et **CLUB ·
ACCORDS COURTS** (124 bpm, chute brève, piqués sur la grille), chacun avec un fond rythmique déjà
séquencé (kick, hi-hat, basse) sous POLY 4 — POLY 4 lui-même n'a pas d'entrée à câbler, il se joue
pendant que le montage tourne. Catalogue : 66 → 68 montages.

## `page/html/460-note-eur.html` et `page/html/470-note-eurmod.html`

Nouvelle section POLY 4 ; les deux mentions historiques du catalogue restantes (VOIX MUTANTES) sont
maintenant qualifiées comme des instantanés d'alors (« comptait alors »), pour éviter toute
contradiction avec les décomptes suivants.

## `outils/test-poly4.py` (nouveau)

Nouveau test dédié : catalogue (120/68), descripteur du module (une seule sortie, sept réglages),
façade (treize touches dont cinq noires, quatre mémoires, MÉMORISER, deux boutons d'octave, sept
réglages), structure des deux montages, puis rendus réels en `OfflineAudioContext` à 44100 et
48000 Hz : un accord de trois notes tenu puis relâché (silencieux avant, audible pendant, quasi
silencieux après), et le vol de voix à la cinquième note pressée (jamais plus de quatre voix actives
en même temps, mais les cinq notes restent bien tenues au clavier). 37 vérifications, 0 erreur.

## `outils/test-eurorack-focus.py`

Décompte du catalogue 119→120, ajout d'une branche dédiée pour la façade POLY 4 dans le contrôle
générique des 120 types (comme pour SCÈNES 8, HARMONIE 8, etc.), et correction de trois occurrences
non liées de « 119 » qu'un remplacement global aurait sinon touchées à tort.

## Quatorze fichiers de test existants

Mise à jour du décompte du catalogue (119→120 types, 66→68 montages), dans les assertions et les
messages : `test-atelier-kick-basse.py`, `test-break32-bibliotheque.py`, `test-couleurs-eurorack.py`,
`test-cycles-libres.py`, `test-drum32.py`, `test-freeze-granulaire.py`, `test-harmonie8.py`,
`test-melo32.py`, `test-performance-eurorack.py`, `test-rave.py`, `test-scenes8.py`,
`test-stutter-live.py`, `test-variations-rythmiques.py`, `test-ensembles-eurorack.py`,
`test-voix-mutantes.py`. Dans `test-stutter-live.py`, deux valeurs de BPM (120) sans rapport avec le
catalogue avaient été touchées par erreur lors d'un premier remplacement global puis corrigées avant
la livraison.

## `.github/workflows/android.yml`

Ajout de `python outils/test-poly4.py --rapport app/build/reports/poly4.json` dans l'étape « Test dans
un navigateur », juste après `test-voix-mutantes.py`.

## Validation

`bash outils/controles.sh` propre ; deux passes complètes de `outils/test-navigateur.py` (0 FAUX) ;
`outils/test-eurorack-focus.py` : 480 ouvertures catalogue, 0 erreur (cibles tactiles 44 px comprises) ;
toutes les suites Eurorack concernées passent à 0 erreur ; `outils/test-poly4.py` : 37 vérifications,
0 erreur.
