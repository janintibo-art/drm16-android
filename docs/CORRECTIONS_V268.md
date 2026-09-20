# v268 — Écrans de jeu : PO-33 et MC-101

Base : v267, commit `c3e623282052d44544bce7f740ba715b6b295203` du dépôt
`janintibo-art/drm16-android`.
Archive incrémentale : `drm16_android_v268.zip`, à appliquer après la v267.

## Pourquoi ce lot

Les façades ont reçu leurs matières et les VU-mètres, mais leurs petits
écrans ne donnaient pas une vue d'ensemble des pas, des effets mémorisés ou
de la zone SCATTER. Un seul nom ou numéro ne permettait pas de distinguer
immédiatement mode de jeu, armement et lecture.

Cette version complète les LCD existants, sans remplacer leurs valeurs
natives ni ajouter une seconde commande de transport. La palette reste
celle de chaque appareil : gris-vert du PO-33, vert sur fond sombre de la
MC-101. Il n'y a pas de clignotement décoratif ni de ressource à télécharger.

## PO-33 : le motif et ses effets en un regard

L'écran distingue les modes SOUND, PATTERN, CHROMA et FX. Il indique le motif,
la source choisie, sa famille mélodie/percussion et le numéro du pas courant.
La ligne de seize cases représente les notes de cette source ; PATTERN
montre leur réunion sur l'ensemble des sons. CHROMA suit sa propre source,
pas une sélection de son sans rapport avec elle.

Sous les cases, un point indique un effet mémorisé et un petit trait vertical
un Parameter Lock. Les valeurs zéro valides sont conservées. Les pas hors de
la longueur du motif sont atténués et leurs marques ne sont pas affichées.
Le seizième choix d'effet, neutre, n'est pas compté comme un effet mémorisé.

La ligne d'information montre l'effet programmé sur le pas de lecture, ou
l'effet tenu en direct lorsqu'il a la priorité. Le maintien neutre est lui
aussi explicite. À l'arrêt, la vue résume le nombre de pas avec FX et locks ;
aucun curseur ne prétend suivre une lecture arrêtée. La chaîne affiche sa
position lorsqu'elle est activée.

STOP, PLAY, REC ARMÉ, REC et MIC REC sont distincts : RECORD arme/enregistre
les événements de jeu ; MIC REC signifie qu'une prise d'échantillon est en
cours. Le nouvel écran ne demande aucune autorisation microphone et ne lance
pas de prise à lui seul.

## MC-101 : clip, source et zone SCATTER

L'écran identifie la piste, le clip et la source : RYTHME, SYNTHÉ, SAMPLE ou
LOOPER. Les seize cases montrent le clip de notes sélectionné, avant SCATTER.
La valeur zéro représente une note valide ; le silence reste une case vide.

Un soulignement indique les pas susceptibles d'être transformés par SCATTER.
Le seuil utilise la même formule que le moteur, `round((1-profondeur)*16)`.
Les mentions OFF, ARMÉ, HORS ZONE, ZONE ACTIVE et ZONE VIDE distinguent
l'activation, la position du transport et la profondeur. Les pistes muettes
n'affichent pas de zone active et les boucles LOOPER signalent explicitement
que SCATTER ne s'applique pas à elles.

La touche SCATTER native reste à droite du titre, dans un espace réservé.
Les noms des huit types d'effet ont été contrôlés, sans recouvrement de cette
touche. La profondeur conserve son curseur natif.

Une demande de clip affiche EN ATTENTE, puis DÉPART IMMINENT lorsqu'un départ
est programmé. Le clip présenté reste celui que la machine considère encore
courant. La vue ne valide ni n'avance un lancement, même lorsque la destination
est le premier clip, d'indice interne zéro.

## Ce que représentent réellement les repères

Les cases sont les données programmées AVANT les effets. Le contour du pas
est une position du transport, pas une preuve qu'un son a été émis. La zone
SCATTER montre où un traitement est possible ; elle n'invente pas le pas
source choisi par un effet aléatoire, un répétiteur ou une inversion.

Le dessin ne rappelle jamais `scatterMc()` et ne consomme aucun tirage
aléatoire. Il ne déclenche aucune voix et ne lit pas la file des événements
à venir. Les VU-mètres de v265 restent les indicateurs du signal audio réel.

## Paysage : préserver la place pour jouer

En paysage d'au moins 760 pixels de large et d'au plus 540 pixels de haut,
l'écran passe à gauche ; modes, transport et seize pads passent à droite.
Les pads sont disposés en deux rangées de huit et leurs cibles restent au
moins de 44 pixels dans les deux formats testés pour cette disposition.
Les réglages secondaires restent accessibles par le défilement interne.

Un paysage plus étroit conserve une façade verticale et un écran compact en
deux colonnes. Le portrait conserve aussi le défilement interne : cette
version ne prétend pas afficher tous les réglages et tous les pads en même
temps sur les petits écrans. Elle ne réduit pas toute la façade en miniature.
MENU, NOTICE et le mini-VU-mètre gardent leur bande réservée.

## Mise au repos et interactions

Le rafraîchissement est déclenché par les changements natifs et par le rappel
visuel `beat()`. Plusieurs demandes proches sont regroupées dans une seule
image. Il n'y a ni minuterie ni boucle d'animation permanente.

La vue cesse de dessiner lorsqu'elle est masquée par un outil, le menu, la
vue d'ensemble, le chargement d'un projet, l'arrière-plan ou un rendu audio
hors ligne. Elle ne dessine pas un LCD entièrement sorti de sa zone visible
par défilement. Si une portion reste visible, elle peut toujours être mise
à jour. Un contexte audio suspendu n'affiche pas de faux pas en lecture.

Les nouveaux éléments sont non interactifs (`pointer-events: none`). Les
clics, les pads, les curseurs et les fonctions de jeu restent natifs. Les
descriptions d'écran sont accessibles sans annonce vocale à chaque pas.
La réduction des mouvements n'exige aucun effet de substitution : aucun
clignotement ou fondu permanent n'a été ajouté.

## Les dix fichiers livrés

- `page/css/280-ecrans-performance.css` : présentation des deux LCD,
  repères de pas, états et recomposition paysage.
- `page/js/710-ecrans-performance.js` : lecture des données et réveil de
  l'affichage, sans écriture de données musicales.
- `page/ordre.txt` : insertion des nouvelles sources après celles de v267.
- `app/src/main/assets/drm16.html` : page assemblée correspondante.
- `outils/test-ecrans-performance.py` : tests des écrans, des gestes natifs,
  des mises au repos et comparaison des séquences SCATTER.
- `.github/workflows/android.yml` : ajout du test aux contrôles navigateur.
- `app/build.gradle` : version Android 268.
- `bureau/src-tauri/Cargo.toml` : version PC 268.0.0.
- `bureau/src-tauri/tauri.conf.json` : version PC 268.0.0.
- `docs/CORRECTIONS_V268.md` : ce document.

## Vérifications réalisées

Le nouveau test compte **949 vérifications, sans erreur**, sur sept formats :
393 × 851, 880 × 400, 360 × 640, 1280 × 800, 320 × 568, 640 × 360 et
760 × 400. Il couvre les données limites, les seize noms FX du PO-33, les
huit types SCATTER, les titres sans chevauchement et les seize pads visibles
sur les deux formats de paysage large. Les captures ont aussi été examinées.

Les scénarios exercent les boutons PATTERN, SOUND, RECORD et CHROMA, la
touche SCATTER, son curseur de profondeur et un pad MC. Ils contrôlent
l'absence de tirage aléatoire et de modification des motifs au dessin,
les lancements en attente, les pauses audio et le masquage sous neuf panneaux.

Un scénario comparatif exécute les huit types SCATTER sur la page précédente
et la nouvelle, en remplaçant les voix par un journal dans le test seulement.
Les **471 voix planifiées**, les **8 tirages aléatoires** et les données des
clips sont identiques. C'est une comparaison des événements et des données,
pas une mesure de rendu sonore ni un enregistrement micro réel.

Les huit suites graphiques précédentes ont également été relancées et
terminées sans erreur :

- confort mobile : 12 couples machine/format ;
- matières des façades : 16 couples machine/format ;
- Focus Eurorack : quatre formats, 412 ouvertures des 103 types de modules ;
- menu des machines : 359 vérifications ;
- panneaux d'outils : 1 086 vérifications ;
- retours musicaux : 157 vérifications ;
- Kaoss/volca : 298 vérifications ;
- automatisations Electribe/TR-1000 : 1 164 vérifications.

Les trois blocs JavaScript assemblés passent le contrôle syntaxique Node.
Les 1 087 identifiants HTML statiques n'ont aucun doublon. Les 178 sources de
page de la base ont été reconstituées et vérifiées contre les arbres GitHub
immuables de ce commit ; les deux ajouts portent leur nombre à 180.
L'assembleur canonique du dépôt a été exécuté et sa vérification confirme
l'identité entre les sources et la page livrée. Retirer les deux nouvelles
sources de cette page restitue exactement celle de v267, octet par octet.

## Portée de la validation

Les tests de non-régression utilisent Chromium, des données synthétiques et
un stockage temporaire simulé. Le chargement direct `file://` a été tenté,
mais la politique du navigateur de cet environnement le bloque
(`ERR_BLOCKED_BY_ADMINISTRATOR`) : la page a donc été chargée en mémoire
avec l'option de test `--contenu`, comme les suites précédentes. Ils n'utilisent pas les sauvegardes de
l'utilisateur et ne téléchargent pas de sons. La comparaison des voix n'est
pas une validation acoustique de l'appareil.

Aucune compilation APK de v268 ni manipulation sur le Samsung n'a été
réalisée ici. Le workflow GitHub exécutera les contrôles du dépôt complet et
la compilation. Le confort au doigt et les particularités de la WebView
Android restent à vérifier sur le téléphone.

Les moteurs audio, les sons, les formats de sauvegarde, les fonctions MIDI,
Freesound, l'intérieur de Studio Tibo/Nexus et les autres façades ne sont pas
modifiés. Les méthodes `schedule()` restent celles de v267 ; seuls les
rappels visuels `beat()` sont enveloppés, en préservant l'appel natif, ses
arguments et son résultat.
