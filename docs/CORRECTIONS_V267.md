# v267 — Automatisations visibles : Electribe et TR-1000

Base : v266, commit `b11c5be46e3264538576660f636947b5bddcb397` du dépôt
`janintibo-art/drm16-android`.
Archive incrémentale : `drm16_android_v267.zip`, à appliquer après la v266.

## Pourquoi ce lot

La v266 a ajouté les trajectoires du Kaoss et les bagues de mouvement de la
volca sample. Ce lot étend les repères aux données déjà enregistrées par les
Electribe et la TR-1000 (identifiant interne T1K). Il ne crée pas une nouvelle
fonction d'enregistrement : les boutons et les formats de MOTION restent natifs.

Une aiguille ou un curseur natif n'était pas une lecture distincte du réglage
programmé sur chaque pas. La v267 ajoute un repère séparé, sans déplacer
l'aiguille ni le curseur. Une petite courbe en bâtons présente les valeurs
mémorisées dans le motif, même à l'arrêt.

## Electribe : partie sélectionnée et effets distingués

Familles concernées : EM-1, ER-1/ER-1 mkII, EA-1/EA-1 mkII, ES-1/ES-1 mkII,
EMX et ESX. Les variantes partagent leur façade native : six familles, neuf
choix de machine dans le menu.

Les 49 potards de partie compatibles reçoivent une bague. La partie native
sélectionnée détermine les données affichées. Un bandeau indique le paramètre,
SMOOTH ou TRIG HOLD, la valeur programmée et le pas courant. Une partie sans
mouvement ne garde pas le repère de celle précédemment sélectionnée.

Une bague pointillée indique une variation mémorisée. Un point et un arc
marquent sa valeur sur le pas affiché : vert clair en lecture, rose pendant
l'enregistrement. L'armement à l'arrêt est distingué de l'enregistrement en
lecture. Les mentions OFF, MUTE / SOLO et ATTENTE évitent de confondre une
mémoire disponible avec une variation actuellement active. Les parties
réservées à l'accent ne présentent pas de fausse valeur de motion sonore.

Les huit commandes d'effet concernées, sur EM-1, ER-1, EMX et ESX, ont leur
propre ligne de lecture, indépendante de la partie. Sur EMX/ESX, la bague ne
s'affiche sur EDIT 1/2 que si l'effet édité correspond au slot enregistré.
Sinon le bandeau conserve les informations de cet effet avec AUTRE ÉDITION.
Sur EM-1, la vue distingue le mode EDIT du mode DELAY des mêmes potards.
EA-1 et ES-1 ne reçoivent pas une fausse piste d'automatisation d'effet.

Les 64 pas de l'EM-1 sont pris en compte. Les autres familles gardent leurs
longueurs natives. Les paramètres bipolaires conservent leur signe ; une valeur
négative valide n'est pas confondue avec une case vide. Les données absentes ou
non finies sont ignorées par le dessin, sans être corrigées dans le motif.

## TR-1000 : les dix instruments, chacun à sa position

Les 50 potards et les dix curseurs de niveau reçoivent un repère : TUNE,
DECAY, C1, C2, A/B et LEVEL pour chaque instrument. Les légendes C1/C2 suivent
les noms physiques propres à l'instrument. Plusieurs paramètres peuvent être
visibles simultanément, contrairement à la motion de partie unique des Electribe.

Le bandeau suit l'instrument sélectionné. En mode PARAM PAS, il suit le
paramètre édité ; autrement il privilégie le dernier réglage touché de cet
instrument, puis un paramètre possédant une variation.

La position est lue dans `T1K.entendu.positions`, déjà calculée par la machine,
et non dans le prochain pas anticipé par l'ordonnanceur. Les longueurs et les
sens avant, arrière et ping-pong propres aux instruments sont donc respectés.
La vue ne consomme pas la file des pas à venir et ne fait pas avancer la lecture.

MOTION OFF conserve les données mais retire les points de lecture. L'armement
REC reste indépendant de cet état. Le FILL et les pas sans réglage reviennent
à BASE pour cet affichage. MUTE et SOLO retirent les points des instruments
écartés, sans supprimer leurs données. Une pastille n'est pas la preuve qu'une
note a réellement été déclenchée : les probabilités, cycles et décalages de
note restent du ressort du moteur, pas de cette vue.

## Lecture des repères et limites

Les nombres sont des pourcentages du paramètre natif, signés lorsque son
échelle est bipolaire. Ce ne sont ni des fréquences en Hz ni des niveaux audio
en dBFS. Le mode SMOOTH reste indiqué mais le dessin n'invente pas une
interpolation temporelle : il présente la valeur programmée du pas affiché.
Le trait vertical du petit graphique repère le transport, y compris quand
une motion est désactivée ; il ne remplace pas son indication ON/OFF.

Les éléments ajoutés n'interceptent pas les pointeurs et n'ajoutent aucun
bouton. Les gestes de rotation, la molette, les curseurs, les captures de
pointeur et les aiguilles restent natifs. Des descriptions complémentaires
sont associées aux commandes sans annonce vocale répétée à chaque pas.

Ce lot n'est pas une refonte de la disposition complète de ces anciennes
façades. Les repères suivent leur zoom existant ; le pincement reste utile
sur téléphone pour lire ou régler précisément les petites commandes.

## Au repos, sous les outils et pendant les exports

La vue calcule au plus une image par événement ou rappel de curseur visuel.
Elle n'ajoute ni minuterie ni boucle permanente d'animation, même entre deux
pas de lecture. Les mouvements réduits sont respectés : aucun fondu continu
ni interpolation n'est nécessaire à l'information.

Les dessins cessent sous les panneaux d'outils, le menu, la vue d'ensemble,
pendant le chargement, lorsque la page est masquée ou en contexte de rendu
hors ligne. Un contexte audio suspendu ne garde pas de valeur de lecture
active. Revenir à une autre famille ne multiplie pas les marqueurs.

Les méthodes `schedule()` ne sont pas remplacées. Seul le rappel visuel
`beat()` est enveloppé, en conservant son appel natif, ses arguments et sa
valeur de retour. Aucun nœud audio, AudioParam, moteur de voix, format de
sauvegarde, son, fonction MIDI ou accès Freesound n'est modifié.

## Les dix fichiers livrés

- `page/css/270-automations-machines.css` : bandeaux, graphiques, bagues,
  curseurs de variation, descriptions et états visuels.
- `page/js/700-automations-machines.js` : lecture des données, correspondance
  des commandes et réveil de la vue sur événements natifs.
- `page/ordre.txt` : ordre des deux nouvelles sources, après celles de v266.
- `app/src/main/assets/drm16.html` : page assemblée correspondante.
- `outils/test-automations-machines.py` : nouveau test Chromium, données
  synthétiques et événements de pointeur réels.
- `.github/workflows/android.yml` : ajout de ce test aux contrôles navigateur.
- `app/build.gradle` : version Android 267.
- `bureau/src-tauri/Cargo.toml` : version PC 267.0.0.
- `bureau/src-tauri/tauri.conf.json` : version PC 267.0.0.
- `docs/CORRECTIONS_V267.md` : ce document.

## Vérifications réalisées

Le nouveau test compte **1 164 vérifications**, sans erreur, sur cinq formats :
393 × 851, 880 × 400, 360 × 640, 1280 × 800 et 320 × 568. Cela représente
50 couples façade/format pour les neuf Electribe et la TR-1000.

Il contrôle notamment les 49 correspondances de potards de partie, les
valeurs bipolaires, les 64 pas de l'EM-1, les trous, SMOOTH/TRIG HOLD,
OFF/REC, MUTE/SOLO, le contexte d'édition des effets et les six paramètres
des dix instruments T1K. Les positions de cette dernière sont également
vérifiées avec son ordonnanceur natif, sur des notes volontairement désactivées,
en combinant longueurs différentes et sens avant, arrière et ping-pong.
Un pas planifié dans le futur ne doit pas être affiché avant la position entendue.

Les vérifications incluent l'absence d'écriture musicale par le dessin, les
commandes manuelles inchangées, l'absence de boucle permanente, la suspension
audio, les vues masquées, le zoom et la préférence de mouvements réduits.
Les gestes réels d'un potard EM-1, de la molette et du curseur TR-1000
mettent à jour la vue sans appeler manuellement son réveil.

Une comparaison séparée de ces gestes entre les pages v266 et v267 retrouve
exactement les mêmes valeurs et tableaux de mouvement pour le potard EM-1
et la molette. Le curseur TR-1000 écrit sur le même pas : l'écart du niveau
normalisé est inférieur à 0,000001, dû à l'arrondi des coordonnées de façade.
Cette comparaison n'est pas une mesure de rendu sonore.

Les sept suites précédentes ont également été exécutées à nouveau :

- confort mobile : 12 couples façade/format, zéro erreur ;
- matières des façades : 16 couples façade/format, zéro erreur ;
- Focus Eurorack : quatre formats et 412 ouvertures de modules, zéro erreur ;
- menu : 359 vérifications, zéro erreur ;
- panneaux d'outils : 1 086 vérifications, zéro erreur ;
- retours musicaux : 157 vérifications, zéro erreur ;
- Kaoss / volca : 298 vérifications, zéro erreur.

Enfin, les trois blocs JavaScript assemblés passent le contrôle syntaxique
Node, les 1 087 identifiants HTML statiques ne présentent pas de doublon,
et les sources nouvelles sont présentes une seule fois à leur place.


## Portée de la validation

Les scénarios navigateur utilisent Chromium et un stockage temporaire simulé,
avec des données de test : ils ne manipulent pas les sauvegardes de l'utilisateur.
Aucun essai sur le Samsung ni compilation APK de v267 n'a été réalisé ici.
Le workflow GitHub fera les contrôles du dépôt complet et la compilation.

La page v266 de départ a été identifiée par son SHA de blob GitHub
`8cf38c4197dcaa117265501886fec2c62e2df174`. Les seules insertions dans la page
assemblée sont les deux nouvelles sources, aux frontières inscrites dans
`page/ordre.txt`. Retirer ces deux blocs restitue exactement la page v266.
L'assembleur canonique du dépôt n'a pas été exécuté dans la copie locale
partielle ; sa vérification sur l'ensemble des sources reste celle de GitHub.
