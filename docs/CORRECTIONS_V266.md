# v266 — Trajectoires Kaoss et mouvements visibles sur la volca sample

Base : v265, commit GitHub `57783133f44e54c6d701effdbf1c8efbe1f4e867`.
Archive incrémentale : `drm16_android_v266.zip`, à appliquer après la v265.

## Pourquoi ce lot

Le Kaoss avait un point de contact et des pastilles pour son geste enregistré,
mais pas de courte trace du déplacement direct ni de repère explicite dans la
trajectoire relue. Sur la volca sample, les potards gardaient leur aiguille de
réglage manuel : les valeurs différentes programmées par MOTION n'avaient pas
leur propre lecture graphique.

La v266 ajoute des vues de ces données existantes. Elle ne crée pas un nouveau
séquenceur, ne change pas l'effet produit par le pavé et n'étend pas le format
d'enregistrement. Les autres familles de machines ne reçoivent pas encore de
bagues d'automatisation dans ce lot.

## Kaoss : suivre le doigt et le geste mémorisé

Un calque canvas transparent aux gestes est ajouté à l'intérieur du pavé. Le
pavé natif, ses écouteurs de pointeur et son point de contact sont conservés.

Pendant un déplacement direct, une courte traînée s'estompe en environ une
demi-seconde. Elle est limitée à 32 positions observées à l'écran. Elle ne
remplit pas `KP.motion` et n'augmente donc ni la mémoire du geste ni la fréquence
d'enregistrement de la machine.

La trajectoire enregistrée utilise les points de `KP.motion`, dans leur ordre.
Un carré marque son début, un cercle sa fin et un anneau le point du rejeu. Le
compteur affiche par exemple `PT 1 / 4`. Le premier point et le retour au début
suivent l'index utilisé par le moteur natif ; la vue ne fait pas avancer cet
index. Des guides X/Y et les coordonnées en pourcentage facilitent la lecture.

Le bandeau distingue :

- `DIRECT` : contact sur le pavé ;
- `HOLD` : position maintenue ;
- `REC ARMÉ` / `REC PAD` : enregistrement préparé / transport en lecture ;
- `REJEU PRÊT` / `PAD MOTION` : rejeu préparé / transport en lecture.

Le nombre de points reste visible à l'arrêt. `MUTE` est indiqué lorsque la
sortie est coupée. HOLD, PAD MOTION, REJOUER, EFFACER et PLAY restent les boutons
natifs, avec leur fonctionnement antérieur. Le calque n'ajoute aucune cible
tactile sur le pavé et ne déplace pas ses commandes.

Les positions sont dessinées dans les dimensions locales du pavé : zoomer la
façade ne change pas la géométrie du geste. La surface de rendu est limitée à
une densité de 2, même sur un écran de densité supérieure. Un changement de
taille met à jour la surface sans recréer de canvas supplémentaire.

Le tracé mémorisé est borné à 256 points pour l'affichage. Une entrée invalide
interrompt la ligne au lieu de produire une exception ou de relier ses voisins.
La vue ne corrige ni ne réécrit les données sources. Si un contexte canvas 2D
n'est pas disponible, l'ancienne trace en pastilles reste utilisable.

## Volca sample : une bague indépendante de l'aiguille

Les onze commandes de `VLC_PARAMS` reçoivent un repère : LEVEL, PAN, SPEED,
A.ATK, A.DEC, P.INT, P.ATK, P.DEC, START, LENGTH et HI CUT.

**L'aiguille orange reste le réglage manuel. La bague indique la valeur
programmée sur le pas affiché.** Elle n'est pas une mesure audio, ni une
interpolation continue entre deux pas. L'échelle affichée est celle des
paramètres natifs, de 0 à 127.

La bague est verte en lecture, rose pendant un enregistrement MOTION et
pointillée lorsqu'un mouvement est mémorisé sans valeur de lecture active.
Un pas vide (`-1`) n'invente pas de point automatisé : la machine utilise alors
son réglage manuel. Sur une partie muette, le point de lecture est masqué.

Un bandeau au-dessus des potards affiche la partie sélectionnée, le paramètre,
sa valeur programmée et l'état `STOP`, `ARMÉ`, `REC`, `MUTE` ou `PAS nn`. Une
légende rappelle la différence entre la bague et l'aiguille. Quand plusieurs
paramètres sont automatisés, le bandeau privilégie le dernier potard touché
parmi ceux possédant un mouvement et indique leur nombre.

Les gestes des potards sont toujours traités par le code natif. Le nouveau
calque ne remplace ni leurs valeurs, ni leur aiguille, ni leur capture du
pointeur. Les mouvements enregistrés restent attachés à leur partie et à leur
motif. Le passage à une partie sans mouvement retire les anciens repères.

`REC PAS`, qui enregistre les déclenchements, n'est pas confondu avec `MOTION`,
qui enregistre les paramètres. Une mise à jour de la sélection, du motif ou de
MUTE par le code natif, sans clic, réveille aussi l'affichage. Cela évite une
information périmée après une commande extérieure.

## Animation et consommation

Il n'y a qu'une boucle de dessin pour ces deux vues. Sa cadence est plafonnée
à environ 30 images/s. Elle n'effectue pas de boucle permanente sur la volca
entre deux pas, sur le Kaoss arrêté ou en HOLD immobile après extinction de la
traînée. Les gestes, les rafraîchissements des commandes et les appels visuels
`beat()` réveillent l'affichage au besoin.

Le menu, les panneaux d'outils observés, une page masquée, une vue inactive,
une opération de rendu hors ligne ou une page rendue inerte interrompent la
vue. La reprise prend en compte le contexte audio et ne simule pas une lecture
lorsque celui-ci est suspendu.

Avec la préférence système de réduction des mouvements, la traînée temporaire
est retirée et la cadence maximale descend à environ 10 images/s. Les points
mémorisés, l'état et les valeurs utiles restent lisibles.

## Fichiers livrés — 10 fichiers

| Fichier | Changement |
| --- | --- |
| `page/css/260-gestes-et-mouvements.css` | Calque Kaoss, états, bagues et bandeau volca ; aucune image externe. |
| `page/js/690-gestes-et-mouvements.js` | Lecture des données existantes, dessin et cycle de vie des vues. |
| `page/ordre.txt` | Ajout des deux fragments après ceux de la v265. |
| `app/src/main/assets/drm16.html` | Page assemblée incluant les deux nouveaux fragments. |
| `outils/test-gestes-musicaux.py` | Contrôles navigateur des gestes, états, valeurs et comportements de la vue. |
| `.github/workflows/android.yml` | Exécution du nouveau test avec les tests navigateur précédents. |
| `app/build.gradle` | `versionCode 266` et `versionName '266'`. |
| `bureau/src-tauri/Cargo.toml` | Version bureau `266.0.0`. |
| `bureau/src-tauri/tauri.conf.json` | Version bureau `266.0.0`. |
| `docs/CORRECTIONS_V266.md` | Ce compte rendu et les limites de validation. |

## Ce qui ne change pas

Les fragments audio, les sons, les motifs, les formats de sauvegarde,
l'import/export, le MIDI, les kits des machines et Freesound ne sont pas
modifiés. Il n'y a aucun nouveau fichier image, son ou service réseau.

Le nouveau JavaScript enveloppe seulement `MACHINE_KP.beat()` et
`MACHINE_VLC.beat()`, qui mettent à jour les repères visuels. Chaque enveloppe
appelle l'original avec les mêmes arguments et le même `this`, puis retourne
sa valeur. Les fonctions `schedule()`, `arret()` et les fonctions audio ne sont
pas remplacées. `majTraceKp()`, qui dessinait les anciennes pastilles, est
redirigée vers la nouvelle vue uniquement si le canvas fonctionne.

La vue n'écrit pas dans `KP`, `VLC`, les paramètres Web Audio ou les sauvegardes.
Les contrôles natifs, eux, continuent naturellement à enregistrer les actions
de l'utilisateur comme auparavant.

## Vérifications effectuées ici

Environnement : Chromium piloté par Playwright, page assemblée chargée en
mémoire et stockage temporaire simulé. Les gestes de souris/pointeur passent
par les écouteurs réels de la page. Les données musicales du test sont
synthétiques et les pas sont avancés explicitement ; ces essais ne sont pas
une mesure de latence ni une écoute du téléphone.

### Nouveau test

**298 vérifications, aucune erreur**, dans les formats 393×851, 880×400,
360×640, 1280×800 et 320×568, avec un contrôle supplémentaire de densité 3.

Sont notamment vérifiés : coordonnées natives X/Y, fin et annulation du
contact, traînée bornée, HOLD, enregistrement armé puis actif, premier et
dernier point du rejeu, rebouclage, effacement, passivité des dessins, nombre de
canvas, zoom, rotation, réduction des mouvements, arrêt et reprise des vues,
paramètres volca, pas vides, MUTE, REC PAS, véritable mouvement de potard
enregistré, sélection sans clic et absence de doublons après réouverture.

### Non-régression graphique et sonore existante

Les six suites précédentes ont également été exécutées sur la page v266 :

| Suite | Résultat |
| --- | --- |
| Confort mobile | 12 cas façade/format, aucune erreur. |
| Matières des façades | 16 cas façade/format, aucune erreur. |
| Focus Eurorack | 4 formats et 412 ouvertures couvrant 103 types, aucune erreur. |
| Menu machines | 359 vérifications dans 5 formats, aucune erreur. |
| Panneaux d'outils | 1 086 vérifications dans 6 formats, aucune erreur. |
| Retours musicaux v265 | 157 vérifications dans 5 formats, aucune erreur. |

Un scénario comparatif entre v265 et v266 produit les mêmes données pour un
geste Kaoss enregistré puis rejoué et un mouvement PAN volca enregistré au
pointeur. Le texte des fonctions `scheduleKp`, `appliquerKp`, `scheduleVlc` et
`voixVlc` est identique entre ces deux pages. Cette comparaison ne prétend pas
être une comparaison exhaustive de tous les rendus sonores possibles.

Un contrôle complémentaire avec un contexte canvas 2D indisponible confirme
le maintien des pastilles Kaoss natives et du panneau volca, sans erreur JavaScript.

### Assemblage et syntaxe

Le fichier HTML v265 de référence correspond au blob GitHub
`226e7966f994f8b438234c6a723a4210052f1cda`. Après retrait des deux nouveaux
fragments de la page v266, on retrouve cette référence octet pour octet. Les
anciens fragments de la page n'ont donc pas été réécrits au passage.

L'ordre contient désormais 176 fragments. Les scripts intégrés et le nouveau
JavaScript ont passé le contrôle de syntaxe Node ; la page ne contient pas
d'identifiant HTML statique en double. Le test Python a passé la compilation
de syntaxe.

## Validation restant à faire sur GitHub et sur le téléphone

La commande d'assemblage complète `outils/assembler.py --verifier`, les suites
natives Java/Rust/Node du dépôt, la compilation APK et les contrôles Android
seront exécutés dans le workflow GitHub. Ils n'ont pas été relancés localement
avec un dépôt complet pour cette livraison.

La compilation de la v265 était terminée avec succès au moment de préparer ce
lot. Cela ne vaut pas validation de la compilation v266.

Sur le Samsung, le contrôle utile après installation consiste à déplacer le
doigt sur le Kaoss, enregistrer puis relire un geste avec le transport, puis
vérifier une variation MOTION sur la volca sample. Le confort au doigt, la
fluidité réelle du WebView et le comportement après mise en arrière-plan sur
ce téléphone restent à confirmer.

## Suite du chantier graphique

Les trajectoires Kaoss et les premiers repères d'automatisation de la volca
sample sont traités par ce lot. Les bagues et indications adaptées aux autres
familles, notamment Electribe et T1K, restent à traiter séparément. Ce lot
n'annonce donc pas une refonte graphique terminée sur les 29 machines.
