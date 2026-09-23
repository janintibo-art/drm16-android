# DRM16 v286 — Atelier kick / basse

Base : v285, commit `3e17afc8b482582ddc2428dfbb6cc471ea8a9a75`.
Version Android : 286. Version Windows : 286.0.0.

## Objet du lot

Ajouter deux modules spécialisés sans changer CORE KICK, BASS RAVE ni le son
des montages existants. Le catalogue passe de 109 à 111 types de modules et
de 50 à 52 montages. Les 109 définitions historiques, fonctions comprises,
et les données des 50 montages historiques ont été comparées à la v285 :
elles restent identiques.

## KICK LAB

Ce nouveau module de la famille PERCUSSIONS permet de régler la fondamentale,
la durée de la queue, la courbe de hauteur en deux segments, la distorsion du
corps, sa brillance et une attaque bruitée indépendante. Touchez sa courbe pour
ouvrir FOCUS. La courbe représente les réglages de hauteur, pas un oscilloscope.

Réglages : fondamentale 30–100 Hz, queue 40–900 ms, départ 0–48 demi-tons,
coude −12 à +12 demi-tons, descente 2–90 ms, retour vers la fondamentale
2–300 ms, distorsion, brillance, niveau de l’attaque, durée d’attaque 1–25 ms
et niveau de sortie. Les durées effectives de la courbe sont bornées par la
longueur de la queue ; raccourcir celle-ci ne réécrit pas les valeurs saisies.

Les champs acceptent un point ou une virgule. Les boutons −/+ et les curseurs
complètent la saisie. Une valeur invalide est signalée sans modifier le son ;
une valeur numérique hors plage est ramenée à la borne autorisée. Le champ
reflète ensuite cette valeur effective. Les contrôles restent défilables et ne
se réduisent pas sous 44 pixels dans les formats contrôlés.

Trois préréglages sont proposés : PSY COURT, GABBER LONG et UPTEMPO SEC.
Leur application demande confirmation et conserve le niveau de sortie et
les câbles. Ce ne sont pas encore des banques de préréglages personnels nommés :
les réglages personnalisés restent sauvegardés avec le rack ou le projet.

Entrées : TRIG, RST et V/OCT. Sorties : OUT et HIT.
Pour suivre les notes de MÉLO 32, régler FOND sur 55 Hz, relier CV à V/OCT et
GATE à TRIG. Le CV est un signal continu : une variation de note peut aussi
transposer la queue encore active. Il n’y a pas de verrouillage de la hauteur
à la frappe. Chaque frappe acceptée démarre un nouvel oscillateur et coupe
rapidement la précédente. HIT n’émet que pour une frappe dont le niveau est
supérieur à zéro ; ce n’est pas une détection du niveau de sortie du mixeur.

L’attaque est un petit bruit original synthétisé, sans fichier supplémentaire.
Son générateur déterministe ne consomme pas les tirages aléatoires utilisés par
les probabilités des autres séquenceurs.

## DUCK TRIG

Ce nouveau module de la famille TRAITEMENTS fait baisser le volume de la basse
au départ du kick, puis le rétablit. Branchements usuels : basse OUT → DUCK IN,
DUCK OUT → VCA ou mixeur, KICK LAB HIT → DUCK TRIG. Les exemples sont déjà câblés.

Réduction : 0–48 dB ; descente : 1–20 ms ; maintien : 0–160 ms ; retour :
10–800 ms ; forme de remontée : 0,25–4. À 0 dB, le niveau reste inchangé.
Les préréglages DISCRET, PSY SERRÉ et POMPAGE LONG demandent confirmation.
Le graphique décrit l’enveloppe programmée de gain, pas le signal audio.

Le module conserve les deux canaux d’une entrée stéréo et leur applique le
même gain. La sortie GAIN CV donne cette enveloppe de 0 à 1, pour commander
un VCA supplémentaire réglé à gain intrinsèque nul. Un nouveau déclenchement
reprend depuis la valeur réellement programmée au même instant ; les
roulements ne forcent pas un retour à plein niveau entre chaque frappe.

Il ne mesure pas l’amplitude du kick : ce n’est pas un compresseur à seuil,
ni un correcteur de phase, ni un alignement automatique des oscillateurs.
Le redémarrage de phase de BASS RAVE n’est pas ajouté dans ce lot. Les
modifications de courbe s’appliquent aux prochains déclenchements.

## Deux montages prêts à jouer

Accès : EURORACK → RACK ▾ → MONTAGES → PERFORMANCE.
Choisir un emplacement vide pour conserver son montage actuel.

| Montage | Tempo | Modules | Contenu |
|---|---:|---:|---|
| PSY · KICK ET BASSE | 146 BPM | 25 | Kick court, basse sur les trois subdivisions suivantes, mélodie et effets. |
| GABBER · KICK ACCORDÉ | 185 BPM | 26 | Kick distordu commandé par un troisième MÉLO 32, basse, mélodie et effets. |

Dans le Gabber, le troisième MÉLO 32 joue LA1, DO2 et SOL1 (notes MIDI 33, 36,
31). Il commande le rythme ET la hauteur du kick : la piste A de DRUM 32 ne
le déclenche plus. Les deux autres MÉLO 32 restent dédiés à la basse et à la
mélodie. Les fills de batterie ne modifient donc pas le rythme du kick de cet
exemple. Les huit scènes de niveau forment une boucle de douze mesures ; un
fill DRUM 32 est préparé toutes les quatre mesures.

Les huit commandes PERFORMANCE sont affectées : BATTERIE, BASSE, MÉLODIE,
EFFETS, CORPS DU KICK, QUEUE DU KICK, PLACE POUR LE KICK, COULEUR BASSE.
MÉMORISER / REVENIR conserve son rôle de point de retour. Les paramètres des
deux nouveaux modules peuvent aussi être affectés dans vos propres racks.

## Sauvegardes et nettoyage

Les réglages numériques utilisent les paramètres ordinaires `m.p` des modules.
Ils suivent les huit racks, les projets `.drm16` et la mémoire PERFORMANCE ;
aucun nouveau conteneur de fichiers audio n’est introduit. Une ancienne version
qui ne connaît pas KICK LAB ou DUCK TRIG ne saura pas reproduire un nouveau
montage utilisant ces modules : conserver les nouvelles versions sur les
appareils entre lesquels on échange ce travail.

STOP, RST, suppression, recâblage et changement de rack nettoient les voix,
y compris les attaques déjà programmées dans le futur. DUCK TRIG annule les
baisses de gain futures et revient à un gain de 1 en trois millisecondes à
l’arrêt. Les petits aperçus sont statiques, sans analyseur audio supplémentaire
ni boucle de dessin permanente. Les vues détachées sont retirées des références
à la reconstruction du rack et au rafraîchissement.

Les sons personnels, les découpes BREAK 32, les commandes MIDI natives,
Freesound, les sauvegardes anciennes et les recettes des anciens modules ne
sont pas modifiés. Le workflow Windows automatique de la v285 est identique.

## Fichiers livrés et rôle

### Application

- `page/js/473-atelier-kick-basse.js` : définitions de KICK LAB et DUCK TRIG,
  courbes, sources audio, nettoyage et fonctions de calcul communes aux tests.
- `page/js/474-atelier-interface.js` : aperçus, ateliers FOCUS, réglages précis,
  préréglages confirmés et rafraîchissement sans animation permanente.
- `page/js/475-montages-atelier.js` : deux montages indépendants et leurs huit
  commandes PERFORMANCE ; aucune mutation des montages copiés.
- `page/css/430-atelier-kick-basse.css` : présentation des deux ateliers et
  disposition adaptative, notamment en petit paysage.
- `page/js/466-performance-eurorack.js` : autorisation explicite d’affecter les
  paramètres des deux nouveaux modules, sans élargir les autres exclusions.
- `page/html/460-note-eur.html` : notice intégrée et décompte à 111 modules.
- `page/ordre.txt` : insertion des quatre nouvelles sources.
- `app/src/main/assets/drm16.html` : page assemblée correspondante.

### Versions

- `app/build.gradle` : versionCode et versionName 286.
- `bureau/src-tauri/Cargo.toml` et `bureau/src-tauri/tauri.conf.json` : 286.0.0.

### Contrôles

- `outils/test-atelier-kick-basse.cjs` : 28 scénarios unitaires.
- `outils/test-atelier-kick-basse.py` : contrôles d’interface et signaux/rendus
  Web Audio natifs ; rapport JSON disponible dans les rapports GitHub.
- `outils/controles.sh` : ajout du nouveau test Node, contrôlé aussi lors de la
  préparation Windows. Les anciennes étapes restent présentes.
- `.github/workflows/android.yml` : ajout du nouveau test navigateur complet.
- `outils/test-eurorack-focus.py` : contrôle des interfaces des nouveaux modules
  et passage du catalogue à 111 types.
- `outils/test-performance-eurorack.py` : compte six cartes PERFORMANCE au lieu
  de quatre et catalogue de 52 montages.
- `outils/test-break32-bibliotheque.py`, `outils/test-drum32.py`,
  `outils/test-ensembles-eurorack.py`, `outils/test-melo32.py`,
  `outils/test-rave.py`, `outils/test-scenes8.py`,
  `outils/test-variations-rythmiques.py` : adaptation des totaux historiques de
  catalogue. Aucun scénario comportemental ancien n’est désactivé.
- `docs/CORRECTIONS_V286.md` : ce document.
- `docs/TESTS_V286.json` : résultats, journaux unitaires et mesures enregistrés.

## Vérifications réellement exécutées

Environnement : Node et Chromium Linux, page assemblée chargée en mémoire,
stockage temporaire simulé. Le banc audio utilise le véritable moteur Web Audio
de Chromium ; les nœuds des scénarios unitaires Node sont simulés.

Nouveau test : 28 scénarios Node et 265 vérifications navigateur, dont
231 d’interface et 34 audio. Les portions interface et audio ont été exécutées
séparément. Les formats de l’interface sont 320×568, 360×640, 393×851, 640×360,
880×400, 1280×800 et 1920×1080. Les captures 393×851 et 640×360 ont été inspectées.
Le contrôle a détecté puis validé la correction d’un tassement des champs en
640×360. Il ne remplace pas l’essai au doigt sur un Samsung réel.

Douze essais de signaux à 44,1 et 48 kHz : maintien de la stéréo, comparaison de
l’enveloppe de duck à chaque échantillon, retriggers, variante sans
`cancelAndHoldAtTime`, annulation des événements futurs, hauteur réelle à
27,5 / 55 / 110 Hz et silence après STOP. Les deux montages sont rendus chacun
sur treize mesures aux deux fréquences : quatre rendus complets. Toutes les
sorties contrôlées sont finies et les différentes voix présentes ; les valeurs
de crête et RMS figurent dans le JSON. Il ne s’agit pas d’une écoute humaine.

Régressions Node exécutées : RAVE (27 scénarios), DRUM 32 (24), MÉLO 32 (31),
SCÈNES 8 (31), BREAK bibliothèque (30), PERFORMANCE (33), variations (32),
autotest MIDI Windows simulé (35). Aucun échec.

Cinq suites navigateur ciblées exécutées : Focus Eurorack (444 ouvertures de
modules dans quatre formats), PERFORMANCE (472 vérifications), variations
(196), RAVE (231), bibliothèque BREAK 32 (308). Aucun échec. Les rendus audio
complets facultatifs de ces régressions n’ont pas été relancés ; seuls les
nouveaux montages ont les quatre rendus complets cités ci-dessus.

Contrôles statiques : syntaxe des scripts et du YAML, absence d’identifiants
HTML en double, cohérence des versions, vérification de l’assemblage par
substitutions exactes réversibles depuis le HTML v285 dont le hash Git a été
comparé au dépôt. Les fragments historiques non présents dans les archives
locales ont été conservés octet pour octet. Le script d’assemblage standard
et l’ensemble de `outils/controles.sh` n’ont pas été exécutés ici : ils seront
exécutés dans le dépôt complet par GitHub. Rust/Tauri, Gradle et WebView2 n’ont
pas été compilés/testés dans ce conteneur.

## Mise en service

Le ZIP est un correctif incrémental depuis la v285, pas un APK ni un EXE.
Après son application et son envoi, les deux compilations automatiques
habituelles produiront les versions Android et Windows si leurs contrôles
réussissent. Aucun résultat de compilation v286 n’est annoncé avant cet envoi.
L’installation de la nouvelle version sur vos appareils reste nécessaire.
Sur Windows, le fichier à récupérer reste `drm16-windows`, contenant
`DRM16-installeur.exe`, et non le paquet navigateur `drm16-pc-complet`.
