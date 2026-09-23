# Corrections v297 — DIALOGUE

Nouveau lot Eurorack, choisi après la v296 (ordre laissé libre par l'utilisateur) parmi les deux
éléments restants de la feuille de route (DIALOGUE, ACCORDAGES ET ORNEMENTS) :
« DIALOGUE (deux mélodies qui se répondent) ». Un nouveau module génératif à deux voix, plus deux
montages qui l'utilisent.

## `page/js/479m-dialogue.js` (nouveau)

**DIALOGUE** fait jouer deux voix qui se répondent, comme une question et sa réponse. Pendant les
LONGUEUR premiers pas d'un cycle (4 à 16 pas, réglable), la voix 1 improvise une phrase, note par
note, avec une chance DENSITÉ à chaque pas et une note choisie au hasard dans la GAMME autour de la
TONIQUE — puis mémorisée. Pendant les LONGUEUR pas suivants, la voix 2 rejoue exactement cette phrase,
décalée de DÉCALAGE demi-tons et requantifiée dans la même gamme ; MIROIR la relit à l'envers,
dernière note d'abord, comme une réponse en écho retourné plutôt qu'en simple copie. Chaque voix se
tait pendant la phrase de l'autre — un vrai dialogue question puis réponse, pas un duo simultané.
Réutilise `EUR_MELO32.quantifier` plutôt que de redéfinir une table de gammes : même convention de
tonique (0 = DO, 9 = LA par défaut) et les mêmes cinq gammes que MÉLO 32 et HARMONIE 8, pour rester
cohérent d'un module à l'autre du rack. Réglages : TONIQUE, GAMME, LONGUEUR, DÉCALAGE st, DENSITÉ,
MIROIR, GLISSÉ ms — sept réglages, tous accessibles par des menus dans la façade dédiée. Jacks : CLK,
RST en entrée ; CV 1, GATE 1 (question), CV 2, GATE 2 (réponse) en sortie — chaque voix va vers son
propre oscillateur, comme MÉLO 32. Catalogue : 121 → 122 types de modules.

## `page/css/490-dialogue.css` (nouveau)

Styles de la façade : sept réglages en `<select>`, disposés en grille (deux colonnes en mobile,
quatre à partir de 1000 px), toutes les cibles tactiles à 44 px minimum — même patron que POLY 4 et
LOOPER DE RACK.

## `page/js/479n-montages-dialogue.js` (nouveau)

Deux montages : **DUO · QUESTION ET RÉPONSE** (96 bpm, kick et charleston discrets, DÉCALAGE +5,
réverbe) et **PSY · ÉCHANGE RAPIDE** (144 bpm, basse roulante, LONGUEUR 4 et MIROIR actif pour un
dialogue plus dense et plus court, écho puis réverbe). Chaque voix de DIALOGUE alimente son propre
oscillateur WAVE (MODEL), enveloppe et VCA, mélangés avant l'étage commun de rythme et d'espace.
Catalogue : 70 → 72 montages.

## `page/html/460-note-eur.html` et `page/html/470-note-eurmod.html`

Nouvelle section DIALOGUE ; la mention historique du catalogue à 121/70 (LOOPER DE RACK) est
maintenant qualifiée comme un instantané d'alors (« comptait alors »), pour éviter toute contradiction
avec les décomptes suivants.

## `outils/test-dialogue.py` (nouveau)

Nouveau test dédié : catalogue (122/72), descripteur du module (six prises, sept réglages), façade
(sept réglages), structure des deux montages, puis rendus réels en `OfflineAudioContext` à quatre
voies séparées (CV 1, GATE 1, CV 2, GATE 2 sur quatre canaux d'un même contexte, échantillonnées 3 ms
après chaque pas de CLK — lire `ports.cv.offset.value` en JS « logique » sans passer par un vrai rendu
ne reflète pas ce qui sera réellement produit, même piège que documenté pour LOOPER DE RACK et POLY
4) : DENSITÉ 100 % joue une note à chaque pas de question et la porte 1 se déclenche en conséquence ;
DÉCALAGE +5 en gamme chromatique fait que chaque note de réponse (CV 2) vaut exactement la note de
question correspondante + 5 demi-tons, porte 1 muette pendant la réponse et porte 2 muette pendant la
question ; MIROIR fait rejouer la question à l'envers ; DENSITÉ 0 % ne déclenche aucune porte ni
n'enregistre aucune note ; RST remet position et mémoire à zéro. 38 vérifications, 0 erreur.

## `outils/test-eurorack-focus.py`

Décompte du catalogue 121→122 (trois occurrences), ajout d'une branche dédiée pour la façade DIALOGUE
dans le contrôle générique des 122 types (sept réglages, comme POLY 4 et LOOPER DE RACK).

## Seize fichiers de test existants

Mise à jour du décompte du catalogue (121→122 types, 70→72 montages), dans les assertions et les
messages, avec des motifs `sed` ciblés (même discipline que pour la v296) : `test-atelier-kick-
basse.py`, `test-break32-bibliotheque.py`, `test-couleurs-eurorack.py`, `test-cycles-libres.py`,
`test-drum32.py`, `test-ensembles-eurorack.py`, `test-freeze-granulaire.py`, `test-harmonie8.py`,
`test-melo32.py`, `test-performance-eurorack.py`, `test-rave.py`, `test-scenes8.py`,
`test-stutter-live.py`, `test-variations-rythmiques.py`, `test-voix-mutantes.py`, `test-poly4.py`,
`test-looper.py`. Une occurrence isolée avait de nouveau échappé au premier passage ciblé (comparaison
Python `==121` dans `test-ensembles-eurorack.py`, même schéma que la straggler corrigée en v296),
repérée cette fois par une recherche systématique de `\b121\b` restant dans tous les fichiers de test
plutôt qu'à l'exécution, et corrigée avant tout lancement des suites.

## `.github/workflows/android.yml`

Ajout de `python outils/test-dialogue.py --rapport app/build/reports/dialogue.json` dans l'étape
« Test dans un navigateur », juste après `test-looper.py`.

## Validation

`bash outils/controles.sh` propre ; deux passes complètes de `outils/test-navigateur.py` (0 FAUX) ;
`outils/test-eurorack-focus.py` : 488 ouvertures catalogue, 0 erreur (cibles tactiles 44 px comprises) ;
les seize suites Eurorack concernées passent à 0 erreur ; `outils/test-dialogue.py` :
38 vérifications, 0 erreur.
