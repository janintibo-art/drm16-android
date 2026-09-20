# v269 — SmplTrek : forme d'onde et position de lecture

Base : v268, commit `5c419454d7299752b6d6c6362e6d6bfc1318432b`.
Ce lot continue la partie graphique. Il ne remplace pas les fonctions musicales
et ne crée pas de nouveaux gestes d'édition du son.

## Ce qui change à l'écran

L'ancien petit canvas donne maintenant un afficheur structuré : piste choisie,
type SHOTS ou INST, nom de l'échantillon, durée, onde et état STOP / PLAY /
ÉCOUTE / AUDIO PAUSE. Les formes mono et stéréo sont distinguées. En stéréo,
les canaux gauche et droit sont dessinés séparément : ils ne s'annulent pas
quand leurs phases sont opposées.

La zone jaune représente le choix actuel : son entier ou une des huit tranches,
avec sa durée utile selon DECAY. La portion effectivement jouée et le trait
clair de lecture sont distincts de ce choix. Changer de tranche pendant une
note ne déplace donc pas artificiellement le curseur de cette note.

Le curseur utilise le départ programmé et l'horloge audio, pas une animation
CSS de durée arbitraire ni le numéro du pas. Il prend en compte le TUNE,
la hauteur des notes instrument/MIDI, la durée de la tranche et DECAY. Un
départ futur ne s'affiche pas en avance. Si un départ arrive en retard, le
curseur part du début réellement joué et conserve la fin absolue programmée.
Les anciens pas qui jouent le son entier restent représentés comme tels,
même lorsque le choix courant est en mode SLICE.

Pour des notes superposées, l'écran suit la dernière voix démarrée encore
active et indique le nombre de voix actives. Si cette voix finit avant une
précédente plus longue, le trait reprend la précédente. Ce n'est pas un
oscilloscope de la somme des voix. STOP oublie aussi les départs futurs.

Les seize petits repères sont un aperçu non interactif des notes programmées
sur la piste choisie. Le pas courant reste alimenté par le rappel natif du
séquenceur. La longueur du motif, MUTE, SOLO, la chaîne et un changement de
motif en attente ou imminent sont affichés séparément. Le changement de motif
n'est jamais validé par le code de dessin.

## Confort et coût du dessin

En paysage à partir de 760 px de large et jusqu'à 540 px de haut, l'afficheur
et les potards restent à gauche ; les commandes, les dix pistes et les seize
pads restent à droite. Les pads sont répartis en deux rangées de huit. Le
châssis peut utiliser jusqu'à 1040 px : conserver la limite précédente de
680 px dans le calcul de mise à l'échelle aurait coupé les dernières touches.
En portrait et sur tablette, le texte reste à l'échelle 1, avec défilement
interne et une largeur maximale de 680 px. Les autres machines conservent
leurs règles de mise à l'échelle.

Les contrôles natifs restent les seuls éléments interactifs. L'afficheur ne
capture pas les gestes ; il n'ajoute ni bouton invisible ni annonce vocale
continue à chaque déplacement du curseur. Il ne recouvre pas MENU ou NOTICE.

Les minima et maxima sont calculés sur les échantillons de chaque canal, sans
moyenne entre gauche et droite. Le travail est fractionné avec un budget de
65 536 valeurs par frame et au plus 320 colonnes par canal. Le cache est lié
au véritable AudioBuffer : remplacer le son sous le même identifiant ne
réutilise pas une ancienne onde. Le canvas est adapté à la densité de pixels
(plafonnée à 2) et n'est pas redessiné pour chaque déplacement du curseur.

Il n'y a ni setInterval ni setTimeout dans le nouvel afficheur. Une fois
l'aperçu terminé, aucun dessin continu n'est demandé à l'arrêt. Le suivi est
limité à environ 30 images/s pendant les voix, réduit à environ 8 images/s
lorsque la préférence de réduction des mouvements est active. Le dessin se
met au repos sous les panneaux, hors écran après défilement, en arrière-plan
et lorsque le contexte audio est suspendu. À la reprise, la position est
relue depuis l'horloge du moteur. La file visuelle est bornée à 64 voix par
piste, sans conserver de références aux nœuds audio.

## Fichiers livrés — 12 fichiers uniquement

| Fichier | Modification |
| --- | --- |
| `page/css/290-onde-smpltrek.css` | Nouveau cadre d'écran, onde, repères et disposition paysage. |
| `page/js/720-onde-smpltrek.js` | Nouvel afficheur en lecture seule, cache de l'onde, suivi de voix et gestion du repos. |
| `page/js/590-smpltrek-dix-pistes.js` | 14 lignes ajoutées : notification graphique après la programmation d'une voix, nettoyage visuel à l'arrêt et délégation du dessin. Les autres fonctions de ce fichier sont inchangées. |
| `page/js/220-mise-a-l-echelle.js` | Largeur paysage SmplTrek adaptée et confort conservé sur tablette. |
| `page/ordre.txt` | Ajout des deux sources graphiques après celles de v268. |
| `app/src/main/assets/drm16.html` | Page distribuée, avec les modifications des sources intégrées dans le même ordre. |
| `outils/test-onde-smpltrek.py` | Nouvelle suite graphique et fonctionnelle. |
| `.github/workflows/android.yml` | Exécution de la nouvelle suite avec les tests navigateur existants. |
| `app/build.gradle` | versionCode et versionName : 269. |
| `bureau/src-tauri/Cargo.toml` | Version : 269.0.0. |
| `bureau/src-tauri/tauri.conf.json` | Version : 269.0.0. |
| `docs/CORRECTIONS_V269.md` | Ce compte rendu. |

Les trois points ajoutés au fichier natif sont protégés par des vérifications
et try/catch. Le témoin de voix est appelé après les start/stop existants et
ne reçoit aucun AudioNode. Il est exclu des rendus hors ligne. Les formules
des voix, leurs connexions, leur programmation start/stop et les arguments
musicaux ne changent pas. L'ancien dessin reste présent en repli si le module
graphique n'est pas disponible. L'enveloppe du rappel beat appelle toujours
le rappel natif avec ses arguments et conserve sa valeur de retour.

Les sons, motifs, formats de sauvegarde, MIDI, Freesound, kits de machines,
Studio Tibo et Nexus ne sont pas modifiés. Aucun asset audio ou graphique
externe et aucune dépendance ne sont ajoutés.

## Vérifications exécutées

### Nouvelle suite

**537 vérifications, zéro erreur**, sur sept formats : 320×568, 360×640,
393×851 (densité 2), 640×360, 760×400, 880×400 et 1024×768.

Contrôles réalisés : absence de débordement, commandes au moins 44×44 px dans
ces formats, totalité des seize pads visible dans les deux paysages larges,
onde stéréo en opposition de phase, absence de son, remplacement du tampon
sous le même nom, cache, départs futurs et retardés, huit tranches, TUNE et
hauteur instrument, DECAY, son entier historique, superpositions, MUTE/SOLO,
chemin MIDI natif, arrêt, motif en attente, pas courant, vrais clics sur les
pistes/pads/tranches, panneaux masqués, défilement, pagehide/pageshow,
suspension/reprise audio, réduction des mouvements et absence de modification
des données musicales pendant le dessin. Les dates sont contrôlées pour les
cas limites ; un essai séparé suit également une note avec la vraie horloge
AudioContext, du départ futur à la fin et au repos.

Les captures portrait et paysage ont aussi été inspectées visuellement.

### Neuf suites précédentes relancées

Toutes se terminent avec un code de sortie 0 et aucun échec :

| Suite | Résultat |
| --- | --- |
| `test-graphique.py` | 12 couples façade/format, aucun échec. |
| `test-facades.py` | 16 cas, aucun échec. |
| `test-eurorack-focus.py` | Les quatre formats et les parcours du catalogue passent. |
| `test-menu-machines.py` | 359 vérifications, aucun échec. |
| `test-outils-studio.py` | 1 086 vérifications, aucun échec. |
| `test-retours-musicaux.py` | 158 vérifications, aucun échec. |
| `test-gestes-musicaux.py` | 298 vérifications, aucun échec. |
| `test-automations-machines.py` | 1 164 vérifications, aucun échec. |
| `test-ecrans-performance.py` | 949 vérifications, aucun échec. |

### Structure et son

Les trois blocs JavaScript de la page assemblée et les trois sources JS
modifiées passent `node --check`. Le test Python et le workflow YAML sont
syntaxiquement valides. Les versions Android/PC sont cohérentes et l'ordre
des sources ne contient pas de doublon.

La page v268 utilisée correspond exactement au blob GitHub
`dec0848f2d0001fef271eee917bff150a0f5bf2c`. En retirant les deux ajouts et en
rétablissant les deux sources natives modifiées, on retrouve cette page
v268 octet pour octet. Les sources ajoutées sont présentes une seule fois,
immédiatement après les sources v268 prévues. Cette validation du delta
ne remplace pas l'exécution des contrôles du dépôt complet par GitHub.

Une comparaison de rendu hors ligne a porté sur cinq scénarios : shots,
huit tranches, instrument transposé, notes superposées et séquence dix pistes.
Pour chaque version, chaque scénario rend 96 000 valeurs Float32 (deux canaux,
une seconde à 48 kHz). Les voix SmplTrek et leur voie de mixage sont utilisées,
avec sortie de référence isolée, sans la chaîne générale de protection.
L'écart absolu maximal observé entre v268 et v269 est de **5,96×10⁻⁸**,
sous la tolérance fixée à 10⁻⁶. Il n'est pas nul dans tous les cas. Le nombre
de tirages aléatoires est identique et le nouvel afficheur reçoit zéro appel
de voix durant ces exports.

Un premier essai incluant toute la chaîne générale n'a pas fourni d'égalité
bit à bit : l'écart maximal v268/v269 était de 1,22×10⁻⁵. Deux rendus du témoin
v268 lui-même différaient aussi (maximum 1,56×10⁻⁵). La cause de cette
variabilité n'a pas été établie ici ; cet essai n'est donc pas présenté comme
une preuve d'identité de toute la sortie. La comparaison isolée ci-dessus et
le maintien exact des opérations audio natives sont les contrôles retenus.

## Limites et vérification sur appareil

Ces essais ont été exécutés dans Chromium avec la page chargée en mémoire
et un stockage temporaire simulé (`--contenu`). Ils n'utilisent aucune
sauvegarde personnelle. GitHub exécutera la suite sans cette option sur le
dépôt complet. Ni la compilation APK de v269 ni une manipulation sur le
Samsung n'ont été réalisées ici.

La forme d'onde représente l'échantillon original avant filtre et niveau :
elle n'est pas une mesure de la sortie. Le curseur suit sa durée utile selon
l'enveloppe, pas la très faible queue technique après la fin de l'enveloppe.
Il est lié à l'horloge du moteur et ne compense pas la latence du haut-parleur,
d'un casque ou du Bluetooth. Une seule voix est suivie à la fois, pas une
courbe séparée pour chaque voix superposée.

Sur le téléphone, vérifier la lisibilité de l'onde, le passage portrait /
paysage, la sélection des huit tranches, une note MIDI transposée, STOP et
le retour depuis la bibliothèque. Le fonctionnement au doigt et les
particularités de la WebView Android restent à confirmer.
