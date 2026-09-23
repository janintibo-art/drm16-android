# Corrections v296 — LOOPER DE RACK

Nouveau lot Eurorack, choisi après la v295 (ordre laissé libre par l'utilisateur) parmi les trois
éléments restants de la feuille de route (LOOPER DE RACK, DIALOGUE, ACCORDAGES ET ORNEMENTS) :
« LOOPER DE RACK (quatre pistes, phrases conservées) ». Un nouveau module qui capture réellement le
signal d'entrée, plus deux montages qui l'utilisent.

## `page/js/479k-looper-rack.js` (nouveau)

**LOOPER DE RACK** capture une phrase reçue sur IN puis la boucle, sur quatre pistes indépendantes.
RECORD arme une piste : la capture démarre au prochain temps fort (seizième CLK, comme partout
ailleurs dans le rack) et dure le nombre de MESURES réglé, puis boucle automatiquement — pas de
second geste pour arrêter, une prise à durée fixe plutôt qu'un pédalier à deux appuis. MUET coupe une
piste sans effacer sa phrase (on peut la retrouver intacte en la rallumant) ; CLEAR la vide vraiment.
Chaque piste ne retient qu'une seule prise à la fois : ré-armer RECORD remplace la phrase en cours dès
que la nouvelle est captée (pas d'overdub dans ce premier lot). Capacité fixe de 8 s par piste (mono).

Même technique que FREEZE GRANULAIRE : aucun MediaRecorder, aucun AudioWorklet — la capture écrit
directement dans un `AudioBuffer` via un `ScriptProcessorNode`, échantillon par échantillon, aux
instants exacts de `ev.playbackTime`. Un fondu (FONDU ms) est appliqué aux deux bords du fragment
capté, calculé échantillon par échantillon pendant l'écriture elle-même plutôt qu'en une passe séparée
après coup : dans un rendu `OfflineAudioContext`, tous les `recevoir()` d'une passe s'exécutent en
code JS avant qu'un seul échantillon soit réellement rendu, donc une passe de fondu « après coup »
s'exécuterait elle aussi trop tôt, sur un tampon encore vide (piège découvert et corrigé pendant les
premiers essais du module — voir plus bas). Réglages : MESURES (1 à 4), FONDU ms, NIVEAU (sortie
générale) et NIVEAU 1 à 4 (une piste chacun) — sept réglages, tous accessibles par des menus dans la
façade dédiée. Catalogue : 120 → 121 types de modules.

**Piège trouvé pendant les tests, corrigé avant livraison :** la première version conditionnait
l'écriture des échantillons à un drapeau `enregistre`, mis à `false` de façon synchrone dès que le
code JS « logique » décidait que la capture était finie — mais dans un rendu hors ligne, tous les
`recevoir()` s'exécutent avant qu'un seul échantillon audio réel ne soit rendu, donc ce drapeau était
déjà à `false` avant même que le `ScriptProcessorNode` ait eu la moindre chance d'écrire quoi que ce
soit : capture totalement silencieuse. Correction, dans le même esprit que la note d'en-tête de FREEZE
GRANULAIRE : l'écriture ne dépend plus que des bornes temporelles (début/fin de capture, fixées au
moment de l'armement), jamais d'un drapeau muté en avance de phase.

## `page/css/480-looper-rack.css` (nouveau)

Styles de la façade : grille des quatre pistes (une colonne en mobile, deux à partir de 1000 px),
boutons RECORD/MUET/CLEAR par piste sur trois colonnes, cibles tactiles à 44 px minimum, état visuel
distinct pour REC (rouge) et MUET (ambre).

## `page/js/479l-montages-looper.js` (nouveau)

Deux montages : **BOUCLE · CAPTURE ET RELANCE** (112 bpm, écho puis limiteur) et **DUB · CAPTURE
CHAMBRÉE** (78 bpm, bucket-brigade puis réverbe à ressort), chacun avec un fond rythmique séquencé
(percussions, basse, mélodie via l'oscillateur MODEL) routé vers l'entrée du LOOPER, son horloge reliée
à CLK. Huit macros PERFORMANCE par montage, dont deux ciblant directement NIVEAU 1 / NIVEAU 2 du
looper. Catalogue : 68 → 70 montages.

**Erreur trouvée et corrigée avant tout test :** une première version des montages utilisait un
oscillateur `vco` mal configuré (paramètres et prise de sortie inexistants pour ce type de module,
repérés en relisant directement `page/js/390-oscillateurs.js`) ; corrigée en passant à l'oscillateur
`wave` (MODEL), qui possède bien une prise `out` et les réglages utilisés.

## `page/html/460-note-eur.html` et `page/html/470-note-eurmod.html`

Nouvelle section LOOPER DE RACK ; la mention historique du catalogue à 120/68 (POLY 4) est maintenant
qualifiée comme un instantané d'alors (« comptait alors »), pour éviter toute contradiction avec les
décomptes suivants.

## `outils/test-looper.py` (nouveau)

Nouveau test dédié : catalogue (121/70), descripteur du module (quatre prises, sept réglages), façade
(quatre pistes, RECORD/MUET/CLEAR sur chacune, sept réglages), structure des deux montages, puis
rendus réels en `OfflineAudioContext` à 44100 et 48000 Hz avec un vrai oscillateur en entrée : capture
silencieuse avant le premier temps fort, aucun retour direct pendant la capture elle-même (le module
ne fait pas de monitoring en direct, seulement de la capture), la phrase captée qui boucle deux fois
de façon quasi identique, MUET qui coupe le son (et le redonne une fois désactivé, testé dans un rendu
séparé — voir note ci-dessous), et CLEAR qui vide la piste. 49 vérifications, 0 erreur.

**Limite de conception assumée dans le test lui-même :** l'API `m.looper.*` (armer/muet/effacer) agit
comme un geste en direct, pris en compte à l'instant de l'appel — mais dans un rendu hors ligne, tous
ces appels s'exécutent avant qu'un seul échantillon ne soit réellement rendu, donc un `muet(true)`
appelé « après » la capture dans le texte du script prend en réalité effet dès le tout début du rendu,
pas au temps musical où il semble se produire (même limite que documentée pour les enveloppes tenues
de POLY 4). Le test rend donc chaque scénario MUET/démuet dans son propre `OfflineAudioContext`, avec
l'état voulu déjà en place avant le rendu, plutôt que d'enchaîner plusieurs états dans un même rendu.

## `outils/test-eurorack-focus.py`

Décompte du catalogue 120→121, ajout d'une branche dédiée pour la façade LOOPER DE RACK dans le
contrôle générique des 121 types (quatre pistes, sept réglages, RECORD/MUET/CLEAR par piste).

## Quinze fichiers de test existants

Mise à jour du décompte du catalogue (120→121 types, 68→70 montages), dans les assertions et les
messages, cette fois avec des motifs `sed` ciblés (leçon tirée de la v295) plutôt qu'un remplacement
global du nombre : `test-atelier-kick-basse.py`, `test-break32-bibliotheque.py`,
`test-couleurs-eurorack.py`, `test-cycles-libres.py`, `test-drum32.py`, `test-ensembles-eurorack.py`,
`test-freeze-granulaire.py`, `test-harmonie8.py`, `test-melo32.py`, `test-performance-eurorack.py`,
`test-rave.py`, `test-scenes8.py`, `test-stutter-live.py`, `test-variations-rythmiques.py`,
`test-poly4.py`. Une occurrence isolée avait échappé au premier passage ciblé (comparaison Python
`==120` dans `test-ensembles-eurorack.py`, repérée seulement à l'exécution du test et corrigée à la
main) ; une autre (comparaison JavaScript collée sans espaces dans `test-stutter-live.py`) n'a été
repérée qu'à l'exécution finale de la suite complète et corrigée de la même façon.

## `.github/workflows/android.yml`

Ajout de `python outils/test-looper.py --rapport app/build/reports/looper.json` dans l'étape « Test
dans un navigateur », juste après `test-poly4.py`.

## Validation

`bash outils/controles.sh` propre ; deux passes complètes de `outils/test-navigateur.py` (0 FAUX) ;
`outils/test-eurorack-focus.py` : 484 ouvertures catalogue, 0 erreur (cibles tactiles 44 px comprises) ;
les quinze suites Eurorack concernées passent à 0 erreur ; `outils/test-looper.py` :
49 vérifications, 0 erreur.
