# Corrections v298 — ACCORDAGES ET ORNEMENTS

Dernier lot Eurorack de la feuille de route (« ACCORDAGES ET ORNEMENTS », le seul élément restant après
LOOPER DE RACK et DIALOGUE, ordre laissé libre par l'utilisateur). Un nouveau module génératif à
accordage réglable, plus deux montages qui l'utilisent.

## `page/js/479o-accordages.js` (nouveau)

**ACCORDAGES ET ORNEMENTS** fait monter un arpège à travers les degrés d'une gamme personnalisée.
GAMME choisit entre trois tempéraments fixes calculés en cents (ÉGAL 12, JUSTE, PYTHAGORICIEN) ou une
gamme IMPORTÉE depuis un vrai fichier Scala (.scl), lue par le bouton dédié de la façade. RACINE et
OCTAVE fixent le point de départ (même convention 1 V/octave, 0 V = LA1, que partout ailleurs dans le
rack), LONGUEUR le nombre de degrés parcourus avant de reboucler. ORNEMENT ajoute, à chaque pas, une
appoggiature (la note voisine du dessous sonne brièvement avant la note principale), un mordant (la
note voisine du dessus s'intercale avant et après) ou un trille (alternance rapide avec la note voisine
du dessus, sur toute la durée du pas) — les écarts utilisés sont ceux, réels, de la gamme active, pas
des demi-tons fixes : un trille en gamme JUSTE ne sonne pas comme un trille en gamme PYTHAGORICIENNE,
et c'est voulu, pour que les deux moitiés du nom du module (ACCORDAGES et ORNEMENTS) restent
réellement couplées. VITESSE règle le tempo des notes d'ornement, GLISSÉ le temps de portamento entre
deux notes principales consécutives.

Conçu comme MÉLO 32, HARMONIE 8 et DIALOGUE : un générateur programmé en JavaScript qui calcule un CV
exact au moment de chaque CLK, pas un traitement audio-fréquence du signal entrant. Ce choix n'est pas
arbitraire : un accordeur/requantifieur à l'échelle audio (une WaveShaperNode, comme utilisée ailleurs
dans le rack pour des courbes de distorsion) devrait pré/post-mettre à l'échelle le CV entrant dans une
plage de tension fixe, avec pour conséquence un compromis brutal entre résolution fine (de l'ordre du
cent) et étendue utile en octaves sur les 1025 points de la courbe — impraticable pour couvrir les
quatre octaves et plus déjà utilisées par d'autres modules du rack sans mistuning audible. Le moteur
Eurorack traite d'ailleurs déjà le V/OCT comme des cents continus (`voct.connect(o.detune)` via un gain
de 1200), pas des demi-tons discrétisés : aucune modification du moteur n'était nécessaire pour un
module qui calcule des cents fractionnaires exacts.

Le lecteur de fichier Scala (`analyserScala`) suit le format réel : lignes `!` ignorées comme
commentaires, description ignorée, nombre de degrés annoncé, puis un degré par ligne — en cents
décimaux (`150.0`), en rapport (`3/2`, converti en cents via `1200·log2(n/d)`) ou en entier (même
conversion). Le dernier degré, conventionnellement la période, est retiré de la liste des degrés et
conservé à part ; les périodes autres que l'octave (1200 ¢) sont acceptées mais pas particulièrement
mises en valeur — une simplification assumée, documentée dans le fichier. La gamme importée n'est pas
enregistrée avec le projet (comme les mémoires d'accords de POLY 4 ou les scènes de TENIR/SCÈNES 8) :
c'est un geste de séance, pas un réglage sauvegardé.

Façade dédiée avec sept `<select>` (RACINE, OCTAVE, GAMME, LONGUEUR, ORNEMENT, VITESSE, GLISSÉ) et, en
dessous, une zone d'import : un bouton IMPORTER UN FICHIER .SCL, un champ fichier caché (pas de filtre
`accept`, pour ne pas risquer de masquer le fichier sur Android) et un texte d'état qui affiche le nom
de la gamme, son nombre de degrés et sa période une fois l'import réussi, ou un message d'échec clair
sinon — même patron que l'ouverture de projet externe (`projetOuvrirFichierExterne`), mais avec un
identifiant de champ par instance de module plutôt qu'un champ global unique. Jacks : CLK, RST en
entrée ; CV, GATE en sortie. Catalogue : 122 → 123 types de modules.

## `page/css/491-accordages.css` (nouveau)

Styles de la façade : sept réglages en `<select>` sur une grille (deux colonnes en mobile, quatre à
partir de 1000 px), zone d'import séparée par une bordure, toutes les cibles tactiles à 44 px minimum —
même patron que DIALOGUE et LOOPER DE RACK.

## `page/js/479p-montages-accordages.js` (nouveau)

Deux montages : **JUSTE · ARPÈGE MÉDITATIF** (72 bpm, gamme JUSTE, appoggiature à chaque pas, charleston
discret, réverbe ample) et **PYTHAGORICIEN · TRANSE** (132 bpm, kick et charleston roulants, gamme
PYTHAGORICIENNE, trille sur chaque pas, écho puis réverbe). Dans les deux cas, ACCORDAGES ET ORNEMENTS
alimente un seul oscillateur WAVE (MODÈLE), une enveloppe et un VCA, comme MÉLO 32. Catalogue :
72 → 74 montages.

## `page/html/460-note-eur.html` et `page/html/470-note-eurmod.html`

Nouvelle section ACCORDAGES ET ORNEMENTS ; la mention historique du catalogue à 122/72 (DIALOGUE) est
maintenant qualifiée comme un instantané d'alors (« comptait alors »).

## `outils/test-accordages.py` (nouveau)

Nouveau test dédié : catalogue (123/74), descripteur du module (quatre prises, sept réglages), façade
(sept réglages, bouton d'import et texte d'état présents), structure des deux montages, puis un import
de vrai fichier `.scl` (cinq degrés en cents décimaux et en rapport, période 1200 ¢) via
`Locator.set_input_files` sur le champ caché du module posé dans le rack — technique nouvelle pour ce
projet, aucun test existant ne pilotait jusqu'ici un `<input type="file">` par ce biais — avec
vérification du texte d'état, du basculement automatique de GAMME sur IMPORTÉE, et du message d'échec
sur un fichier `.scl` invalide. Puis de vrais rendus en `OfflineAudioContext` (même piège documenté pour
LOOPER DE RACK et DIALOGUE : lire `ports.cv.offset.value` en JS « logique » sans passer par un vrai
rendu ne reflète pas ce qui sera réellement produit) : ÉGAL 12 sur huit pas correspond exactement aux
demi-tons attendus ; JUSTE et PYTHAGORICIEN correspondent, cent pour cent, aux degrés lus dans le module
lui-même (`EUR_ACCORDAGES.GAMMES_FIXES`, pas redupliqués dans le test) ; APPOGGIATURE fait sonner la
note voisine du dessous avant la principale, porte fermée entre les deux ; TRILLE alterne
principale/voisine du dessus au rythme de VITESSE ; OCTAVE +1 ajoute exactement 1 V au CV ; RST remet
position et mémoire de glissé à zéro. 45 vérifications, 0 erreur.

## `outils/test-eurorack-focus.py`

Décompte du catalogue 122→123 (trois occurrences), ajout d'une branche dédiée pour la façade ACCORDAGES
ET ORNEMENTS dans le contrôle générique des 123 types (sept réglages et bouton d'import, comme DIALOGUE
et POLY 4 avant lui).

## Dix-sept fichiers de test existants

Mise à jour du décompte du catalogue (122→123 types, 72→74 montages), dans les assertions et les
messages, avec des motifs `sed` ciblés (même discipline que pour la v296 et la v297) :
`test-atelier-kick-basse.py`, `test-break32-bibliotheque.py`, `test-couleurs-eurorack.py`,
`test-cycles-libres.py`, `test-drum32.py`, `test-ensembles-eurorack.py`, `test-freeze-granulaire.py`,
`test-harmonie8.py`, `test-melo32.py`, `test-performance-eurorack.py`, `test-rave.py`, `test-scenes8.py`,
`test-stutter-live.py`, `test-variations-rythmiques.py`, `test-voix-mutantes.py`, `test-poly4.py`,
`test-looper.py`, `test-dialogue.py`. La comparaison Python `==122` dans `test-ensembles-eurorack.py`
(même schéma que la straggler corrigée en v296 et en v297) a été recherchée et corrigée avant tout
lancement des suites, cette fois par une vérification systématique de tous les fichiers de test avant le
premier passage `sed`.

## `.github/workflows/android.yml`

Ajout de `python outils/test-accordages.py --rapport app/build/reports/accordages.json` dans l'étape
« Test dans un navigateur », juste après `test-dialogue.py`.

## Validation

`bash outils/controles.sh` propre ; deux passes complètes de `outils/test-navigateur.py` (0 FAUX) ;
`outils/test-eurorack-focus.py` : 492 ouvertures catalogue, 0 erreur (cibles tactiles 44 px comprises) ;
les dix-sept suites Eurorack concernées passent à 0 erreur ; `outils/test-accordages.py` :
45 vérifications, 0 erreur.

## Feuille de route

Avec ACCORDAGES ET ORNEMENTS livré, les trois éléments laissés au choix (LOOPER DE RACK, DIALOGUE,
ACCORDAGES ET ORNEMENTS) sont maintenant tous en place.
