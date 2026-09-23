# v284 — PERFORMANCE Eurorack

Base : v283, commit `a8728a41a03022e9875d0fe07e4322b9e91789c4`.
Versions livrées : Android 284 ; Windows 284.0.0.

## But du lot

Jouer sur les réglages d'un rack complet sans chercher les petits potards dans
les deux rangées de modules. Ce lot ajoute une vue de commandes assignables,
pas un nouveau synthétiseur, ni un enregistreur d'automations.

## Utilisation

Dans EURORACK, ouvrir RACK > MONTAGES > PERFORMANCE. Deux exemples prêts à jouer :

| Montage | Tempo | Modules | Commandes 5 à 8 |
| --- | --- | --- | --- |
| JUNGLE · AUX COMMANDES | 168 BPM | 25 | Couleur basse, brillance, échos, break sombre |
| PSY · AUX COMMANDES | 146 BPM | 24 | Couleur basse, brillance, échos, montée |

Ce sont des variantes indépendantes des montages Jungle et Psytrance existants,
avec les commandes déjà affectées ; leurs séquences de départ sont conservées.
Les quatre premières commandes règlent batterie, basse, mélodie et effets.
Les huit scènes continuent d'organiser ces groupes sur douze mesures.

Choisir un rack vide pour ne pas remplacer son travail. Un remplacement reste
soumis à la confirmation existante. Appuyer sur START, puis PERFORMANCE, ou
ouvrir PERFORMANCE et utiliser JOUER. MÉMORISER garde un point de retour avant
de tourner les commandes. REVENIR le rappelle après confirmation, sans arrêter
ni remettre au début la lecture. RETOUR AU RACK ferme uniquement cette vue.

Le panneau s'ouvre également sur les anciens racks : les huit commandes sont
alors libres. Une ouverture sans affectation ne crée pas de réglages imposés.

## Affectations

Chaque rack possède huit commandes nommables (24 caractères), chacune pouvant
piloter quatre paramètres sur un ou plusieurs modules. CONFIGURER / AFFECTER
puis AJOUTER UNE CIBLE donne accès au module, au potard et aux deux bornes.
Les bornes sont exprimées en pourcentage de la course native du potard ; une
prévisualisation montre les valeurs correspondantes. Virgule et point acceptés,
trois décimales maximum. Une entrée incorrecte n'est pas appliquée.

Des bornes inversées font descendre le réglage quand la commande monte. Des
bornes identiques imposent une valeur fixe. Valider une affectation ne change
pas le son : le prochain mouvement applique le mapping. Une cible ne peut pas
appartenir à deux commandes différentes ; le conflit est expliqué à l'écran.

Les cibles autorisées sont les potards déclarés des modules compatibles. Les
pas, les notes individuelles, les durées de scènes et le transport restent dans
leurs éditeurs. Pour les éditeurs spécialisés : probabilités des quatre pistes
DRUM 32, transposition/glissé MÉLO 32, fondu SCÈNES 8, timbre/hauteur/niveau
BREAK 32. Les valeurs discrètes sont arrondies comme dans leurs éditeurs.

Les cibles utilisent l'identifiant et le type du module, pas sa position dans
la liste. Déplacer les modules ne déplace donc pas les affectations vers un autre
son. Supprimer un module nettoie les références devenues invalides.

## Gestes et affichage

Glissement vertical : 200 pixels pour la course entière. Déplacement latéral :
ralentissement progressif. Maj sur PC : précision multipliée par dix. Les boutons
− / + avancent de 1 % ; les flèches et la molette également, ou 0,1 % avec Maj.
Début / Fin vont aux bornes, Page précédente / suivante avancent de 10 %.

Les chiffres sont une course de commande, pas des décibels ni un VU-mètre. Les
valeurs des véritables potards sont indiquées sous chaque commande. Quand un
potard natif a été changé ailleurs, REPRISE AU PROCHAIN GESTE signale l'écart.
Rouvrir le panneau ne réapplique jamais silencieusement une position de macro.

Le panneau défile ; il n'est pas réduit avec le zoom du rack. Les commandes de
navigation et de transport passent à gauche dans les paysages de téléphone.
Le bouton de retour reste accessible. Les cibles du panneau contrôlées dans les
sept formats font au moins 44 pixels de côté.

La ligne d'accès native a été réorganisée : plein écran, RACK, PATCH, FOCUS et
PERFORMANCE se trouvent sous START / TEMPO / l'afficheur. Les boutons existants
sont déplacés sans duplication, avec leurs écouteurs d'origine. Cela évite qu'un
accès du rack se retrouve sous MENU ou NOTICE dans les formats paysage testés.

Les gestes du panneau sont isolés du pincement du rack. Perte de focus,
annulation de pointeur ou passage en arrière-plan terminent une rotation en
cours ; aucun geste ancien n'est rejoué au retour. Pas de boucle d'animation
continue, ni d'animation de valeur pendant le repos. Tab reste dans le dialogue ;
Échap le ferme. Le passage entre FOCUS et PERFORMANCE restaure correctement les
attributs de l'arrière-plan pour ne pas laisser le panneau suivant inerte.

## Mémoire et compatibilité

Un champ optionnel `performance` est ajouté à la sérialisation du rack. Il contient
les huit commandes, les bornes, les cibles et, s'il a été créé, le point de retour.
La version interne de ces données est 1. La version globale des projets .drm16
n'est pas changée. Les anciens racks sans ce champ restent lisibles.

MÉMORISER capture les valeurs réelles des seuls paramètres affectés, pas les notes,
les échantillons, les câbles, les positions des modules ni la position de lecture.
REVENIR ne touche pas aux paramètres non affectés. Changer les affectations ou
leurs bornes invalide le point de retour ; renommer une commande le conserve.
Les huit racks conservent des configurations indépendantes. Les données se
retrouvent dans le projet .drm16 via le stockage de l'application.

La normalisation refuse les références incohérentes, les paramètres absents,
les valeurs non finies et les doublons. Elle borne les courses et les tailles
à huit commandes / quatre cibles. Une mémoire incohérente est ignorée. Les noms
sont affichés avec textContent, jamais injectés comme du HTML.

## Périmètre qui reste inchangé

Les 109 définitions de modules et les 46 anciens montages ont été comparés à la
v283 : ils restent identiques. Le catalogue passe à 48 montages, sans nouveau
module sonore. Aucun changement dans les ponts Java/Rust, les commandes MIDI
natives, Freesound, les fichiers sonores, le découpage WAV ou les traitements
sonores existants. La fabrication automatique Windows introduite en v277 est
conservée, son workflow n'est pas modifié par ce lot.

Les macros utilisent les mêmes paramètres et méthodes de mise à jour que les
potards natifs, avec leur mécanisme de lissage. Elles ne construisent pas un
second rack audio et ne réinitialisent pas ses séquenceurs. En cas d'exception
d'une mise à jour, les valeurs écrites sont remises à leur état antérieur et
un message interrompt la commande ; aucune fausse réussite n'est mémorisée.

## Ce qui n'est pas encore présent

Pas d'enregistrement des mouvements, de modulation MIDI des macros, de variation
A/B, de FILL, de BREAK ou de REPRISE calés à la mesure. Ce lot agit immédiatement.
Les effets temporels continuent de suivre leurs réglages natifs : cette vue ne
transforme pas un délai libre en délai synchronisé. Les tranches personnelles
BREAK 32 conservent les possibilités et limites de la v283, sans time-stretch.

## Vérifications réellement effectuées

- 33 scénarios Node du nouveau moteur : tous réussis. Validation, doublons,
  courses inversées et fixes, arrondis, mémoire exacte, suppression des modules,
  chargement JSON et interruption d'une mise à jour native en erreur.
- 576 vérifications du nouveau test navigateur : toutes réussies. Sept formats :
  320×568, 360×640, 393×851, 640×360, 880×400, 1280×800 et 1920×1080. Gestes souris,
  clavier, molette et tactiles simulés par Chromium ; vraies commandes de l'interface,
  contraintes 44 px, édition des bornes, conflit entre cibles, retour mémorisé,
  sauvegarde dans le stockage de l'application et inclusion dans un projet .drm16.
- Huit rendus OfflineAudioContext : les deux montages sur treize mesures, à
  44 100 et 48 000 Hz, avec les commandes de timbre à chacune de leurs deux bornes.
  Deux rendus supplémentaires à 48 000 Hz vérifient la sortie silencieuse lorsque
  les quatre groupes sont coupés. Signaux finis, différentes parties actives,
  évolution des scènes et arrêt de la basse vérifiés. Le son change entre les
  deux courses testées sans dépassement de la sortie.
- Les six suites Node antérieures sélectionnées passent : autotest MIDI Windows,
  DRUM 32, MÉLO 32, SCÈNES 8, RAVE et bibliothèque BREAK 32.
- Les douze suites navigateur antérieures sélectionnées passent : confort mobile,
  matières des façades, Focus Eurorack (109 types), menu machines, Focus mixage,
  ensembles Eurorack, DRUM 32, MÉLO 32, SCÈNES 8, RAVE, bibliothèque BREAK 32 et
  vue multimachines. Les ajustements de catalogue ne désactivent aucun contrôle.
- Comparaison v283/v284 des objets de catalogue : 109 définitions de modules et
  46 montages précédents identiques. Deux montages ajoutés. Syntaxe des trois
  scripts de la page assemblée, YAML du workflow, versions et contenu du ZIP contrôlés.

Environnement : Node et Chromium, page chargée en mémoire, stockage temporaire
simulé. Les rendus sont hors ligne et ne constituent pas une écoute humaine.
Pas de compilation APK, ni de compilation ou d'essai réel de WebView2 Windows
réalisé ici. La compilation complète, la charge sur Samsung et les interactions
sur les appareils de l'utilisateur restent à valider via GitHub et après installation.
Les autres contrôles Java/Rust du dépôt restent en place, mais n'ont pas été
réexécutés dans cet environnement partiel de sources.

## Fichiers livrés — 25

| Chemin | Changement |
| --- | --- |
| `.github/workflows/android.yml` | Ajout du test navigateur PERFORMANCE et de son rapport. |
| `app/build.gradle` | Version Android 284. |
| `app/src/main/assets/drm16.html` | Page régénérée par concaténation exacte des 213 sources. |
| `bureau/src-tauri/Cargo.toml` | Version bureau 284.0.0, dépendances inchangées. |
| `bureau/src-tauri/tauri.conf.json` | Version Windows 284.0.0, configuration native inchangée. |
| `docs/CORRECTIONS_V284.md` | La présente notice du lot et ses limites. |
| `outils/controles.sh` | Ajout des scénarios Node PERFORMANCE aux contrôles communs. |
| `outils/test-break32-bibliotheque.py` | Attendu du catalogue porté de 46 à 48 ; contrôles métier conservés. |
| `outils/test-drum32.py` | Attendu du catalogue porté de 46 à 48 ; contrôles métier conservés. |
| `outils/test-ensembles-eurorack.py` | Exclusion de la nouvelle famille du décompte des 24 montages historiques ; essais conservés. |
| `outils/test-melo32.py` | Attendu du catalogue porté de 46 à 48 ; contrôles métier conservés. |
| `outils/test-performance-eurorack.cjs` | 33 scénarios du moteur de commandes et de ses données. |
| `outils/test-performance-eurorack.py` | Interface réelle, mémoire, gestes, fermeture et rendus audio. |
| `outils/test-rave.py` | Attendu du catalogue porté de 46 à 48 ; contrôles métier conservés. |
| `outils/test-scenes8.py` | Attendu du catalogue porté de 46 à 48 ; contrôles métier conservés. |
| `page/css/410-performance-eurorack.css` | Panneau, grandes commandes, adaptation portrait/paysage. |
| `page/html/460-note-eur.html` | Notice intégrée sur les affectations, les mémoires et les limites. |
| `page/js/230-pincement-a-deux-doigts.js` | Isolation du nouveau panneau du zoom du rack. |
| `page/js/440-percussions.js` | Persistance du champ optionnel, nettoyage des cibles et fermeture au changement de rack. Les définitions sonores restent identiques. |
| `page/js/450-montages-tout-faits.js` | Chargement des affectations et nouvelle famille de catalogue ; nettoyage lors du remplacement du rack. |
| `page/js/455-eurorack-focus.js` | Fermeture synchrone de PERFORMANCE avant de protéger le fond du Focus. |
| `page/js/466-performance-eurorack.js` | Moteur : validation, affectations, bornes, réglages et retour mémorisé. |
| `page/js/467-performance-interface.js` | Interface, gestes, choix des cibles et regroupement des accès natifs. |
| `page/js/468-montages-performance.js` | Deux copies indépendantes des montages Jungle et Psy, préaffectées. |
| `page/ordre.txt` | Insertion de la feuille CSS et des trois sources JavaScript. |

## Application de la mise à jour

Archive différentielle : seulement ces 25 fichiers, sous `drm16_android/`.
Elle s'applique après la v283 avec le script habituel de mise à jour. Aucun fichier
à déplacer manuellement. Les workflows APK et Windows restent automatiques à
chaque envoi sur main. Cet envoi contient les sources, pas un exécutable précompilé.
Après réussite du workflow Windows, récupérer `drm16-windows`, puis utiliser
`DRM16-installeur.exe` sur le PC pour installer la nouvelle version.
