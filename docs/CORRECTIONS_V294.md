# Corrections v294 — VOIX MUTANTES

Nouveau lot Eurorack, proposé après la v293 : « VOIX MUTANTES (voyelles synthétiques puis vocodeur) ».
Deux nouveaux modules qui se complètent sans dépendre l'un de l'autre, plus trois montages prêts à charger.

## `page/js/479g-voix-mutantes.js` (nouveau)

**VOYELLE** — un VCO classique (comme les autres oscillateurs du rack), toujours actif, dont le timbre passe
par deux filtres passe-bande accordés sur des formants de voyelle. La table des cinq voyelles (A, E, I, O, U)
est reprise telle quelle du filtre FORMANT existant (`400-filtres.js`) et du mode FORMANT de l'EMX-1
(`290-electribe-emx-1.js`), mais l'interpolation entre voyelles est ici continue (fonction `formant(v)`,
`v` de 0 à 4) plutôt qu'à arrondi discret. Réglages : OCTAVE, VOYELLE (position dans la table), TIMBRE (coupure
du filtre en amont des formants), MUTATION (profondeur d'un LFO lent qui fait glisser la voyelle toute seule),
RÉSONANCE (Q des deux formants), NIVEAU. Prises : V/OCT (entrée), VOYELLE CV (entrée, s'ajoute à MUTATION),
OUT. VOYELLE n'a pas d'enveloppe intégrée : comme les autres VCO du rack, on la gate avec un VCA/ENV du
montage.

**VOCODEUR** — un banc de huit bandes fixes (220 à 5500 Hz). MOD (l'analyse) et POR (la porteuse) sont deux
entrées audio ordinaires ; sans rien câblé sur POR, un oscillateur interne (réglages OSC INTERNE, NOTE) sert
de porteuse, comme sur un vrai vocodeur de table — les deux sources se cumulent, elles ne sont pas exclusives.
Chaque bande : un passe-bande sur MOD, un redressement (`WaveShaperNode`, courbe `|x|`) puis un lissage
(passe-bas dont la coupure dépend de VITESSE), qui pilote directement le gain d'un passe-bande jumeau sur la
porteuse — aucun `AudioWorklet`, aucune analyse FFT, uniquement des `BiquadFilterNode` et un `WaveShaperNode`,
dans le même esprit que les autres traitements (`430-traitements.js`). DÉCALAGE FORMANTS transpose les bandes
de la porteuse par rapport à celles de l'analyse (voix qui change de taille, classique sur un vocodeur de
scène). MIX mélange voix vocodée et signal MOD sec ; NIVEAU règle le volume final.

Les deux se combinent naturellement : brancher OUT de VOYELLE sur MOD de VOCODEUR fait chanter des voyelles
à travers le vocodeur — exactement le sujet de ce lot.

Catalogue : 117 → 119 types de modules.

## `page/js/479h-montages-voix-mutantes.js` (nouveau)

Trois montages prêts à charger, chacun avec un bloc PERFORMANCE à huit macros :
- **voix-robot** (118 bpm) : rythme kick/hi-hat, séquenceur pilotant VOYELLE (gatée par une enveloppe), le
  tout traversant VOCODEUR avec sa porteuse interne — la voix robot classique.
- **voix-psy** (145 bpm) : ligne de basse rave, VOYELLE en drone lent (enveloppe longue, déclenchée toutes
  les 16 divisions d'horloge) qui mute toute seule via MUTATION, à travers VOCODEUR puis une réverbe.
- **voix-dub** (76 bpm) : kick et rim clap épars, VOYELLE en nappe longue à travers VOCODEUR puis BBD et
  spring, dans l'esprit dub du reste du rack.

Catalogue : 63 → 66 montages.

## `page/ordre.txt`

Ajout des deux nouveaux fichiers source, entre `479f-montages-freeze.js` et `460-behringer-td-3.js`.

## `page/html/460-note-eur.html` et `page/html/470-note-eurmod.html`

Nouvelle section VOIX MUTANTES documentant les deux modules et les trois montages ; deux mentions historiques
du décompte du catalogue (« 117 types de modules et 63 montages ») précisées en « à ce stade » pour rester
exactes après ce lot.

## `outils/test-voix-mutantes.py` (nouveau)

Nouveau test dédié : catalogue (119/66), descripteurs des deux modules (prises, réglages), mathématique de
`formant()` (bornes et interpolation, sans audio), structure des trois montages (câblage valide, VOYELLE→MOD
de VOCODEUR présent, bloc PERFORMANCE à huit macros), puis rendus réels en `OfflineAudioContext` à 44100 et
48000 Hz : VOYELLE toujours active (RMS non nul, pas de NaN), VOCODEUR testé sur trois scénarios contrastés
(porteuse seule sans MOD quasi silencieuse, un vrai MOD fait ressortir la porteuse, sans porteuse le résultat
reste quasi silencieux même avec un MOD réel). 45 vérifications, 0 erreur.

## Treize fichiers de test existants + deux de plus

Mise à jour du décompte du catalogue (117→119 types, 63→66 montages), dans les assertions et les messages :
`test-atelier-kick-basse.py`, `test-break32-bibliotheque.py`, `test-couleurs-eurorack.py`,
`test-cycles-libres.py`, `test-drum32.py`, `test-freeze-granulaire.py`, `test-harmonie8.py`, `test-melo32.py`,
`test-performance-eurorack.py`, `test-rave.py`, `test-scenes8.py`, `test-stutter-live.py`,
`test-variations-rythmiques.py`, `test-ensembles-eurorack.py`, `test-eurorack-focus.py`.

## `.github/workflows/android.yml`

Ajout de `python outils/test-voix-mutantes.py --rapport app/build/reports/voix-mutantes.json` dans l'étape
« Test dans un navigateur », juste après `test-cycles-libres.py`.

## Validation

`bash outils/controles.sh` propre ; deux passes complètes de `outils/test-navigateur.py` (0 FAUX) ; toutes
les suites Eurorack concernées passent à 0 erreur ; `outils/test-voix-mutantes.py` : 45 vérifications,
0 erreur.
