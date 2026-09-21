# v270 — Retours de frappe : PO-33, MC-101 et SmplTrek

Base : v269, commit `22ac19525cf76bc14b7a4887e557ea764b352b43`.
Le workflow APK de cette base est terminé avec succès (run 35524335286).
Ce lot poursuit la partie graphique ; il ne remplace pas les fonctions musicales.

## Appui, sélection et déclenchement : trois informations distinctes

Une pression sur un bouton dispose d'un petit retour d'enfoncement. Un point
clair indépendant signale le départ programmé d'une voix. Il n'est pas déduit
uniquement du pas courant, ni du changement de sélection. Les couleurs et les
légendes natives de sélection, de programmation et de sourdine restent en place.

- **PO-33** : en mode SOUND, le point apparaît sur le son effectivement
  déclenché. En CHROMA, il suit la touche correspondant à la note de la source
  sélectionnée. Il ne transforme pas les cases PATTERN ou FX en faux témoins
  de son. Une note hors des seize touches CHROMA n'allume pas une mauvaise
  touche. Les deux voix d'un unisson donnent un seul départ visuel ; les
  répétitions de l'effet sont reçues aux dates où elles ont été programmées.
- **MC-101** : le point apparaît sur le bouton de la piste concernée, sans
  déplacer la sélection et sans faire passer un pad de séquence pour une
  note audible. Les sons percussifs, synthétiques et les échantillons utilisent
  le même repère. Les répétitions SCATTER suivent les départs natifs. En LOOPER,
  le point signale le début de la boucle, pas chacun des seize pas.
- **SmplTrek** : les dix boutons de piste reçoivent le repère, pour les
  déclenchements natifs de sons, de tranches et de notes instrument/MIDI.
  L'onde, son curseur et les seize pas de la v269 restent en place.

Ce point signifie « une voix interne a été programmée à cette date ». **Ce
n'est pas un VU-mètre ni une garantie qu'un son est audible à la sortie** :
le niveau du mixeur, une protection ou une coupure en aval peuvent rendre la
sortie silencieuse. Inversement, une sélection de son ou un déplacement dans
un motif ne suffit pas à créer ce témoin. Les filtres MUTE, SOLO et SCATTER
sont appliqués par les chemins musicaux existants, avant les notifications.

Les repères utilisent l'horloge du contexte audio. Un départ futur attend sa
date ; un signal devenu trop ancien est ignoré. Cela ne compense pas la latence
du haut-parleur, du casque, de la WebView ou du Bluetooth. L'affichage graphique
est rafraîchi au plus environ 33 fois par seconde, pas à la fréquence audio.

## Commandes et consommation graphique

Le point de 7 × 7 px est un élément absolu, non interactif et masqué aux outils
d'accessibilité. Il ne modifie ni la taille du bouton ni son texte. Aucun
bouton supplémentaire n'est introduit dans les groupes de 16 sons, 4 pistes
et 10 pistes. Les façades, le zoom et les dispositions portrait/paysage ne sont
pas redessinés dans ce lot.

L'indication de pression est nettoyée au relâchement, à l'annulation du geste,
à la sortie du bouton et à la perte de focus. Le clavier garde son contour de
focus. Le pincement natif reste prioritaire : le module ne capture pas le
pointeur et n'annule aucun événement. La préférence système de réduction des
mouvements supprime l'enfoncement et remplace le fondu par un point fixe bref.

Le point s'éteint en environ 160 ms. Des départs très rapprochés prolongent un
point déjà allumé plutôt que d'ajouter plusieurs éléments. Une seule file,
plafonnée à 128 événements, contient les départs futurs ; un seul minuteur
attend le prochain départ et une seule boucle d'animation traite les témoins
actifs. Aucun intervalle permanent n'est ajouté. Le calcul de géométrie des
boutons est fait lors du dessin, pas dans le rappel de programmation audio.

STOP, les panneaux masqués, le menu, le défilement, la suspension audio et la
mise en arrière-plan retirent les témoins et les départs en attente. Le retour
n'affiche pas de vieilles frappes. Le module ne conserve pas de références aux
nœuds audio ; aucun analyseur, tampon sonore, gain ou oscillateur n'est créé.

## Fichiers livrés — 13 fichiers uniquement

| Fichier | Modification |
| --- | --- |
| `page/css/300-retours-frappe.css` | Point de départ non interactif, pression et réduction des mouvements. |
| `page/js/730-retours-frappe.js` | File de départs en lecture seule, mapping des touches/pistes, dessin et nettoyage. |
| `page/js/560-pocket-operator-k-o.js` | 7 lignes ajoutées : notification après la programmation native et nettoyage à STOP. |
| `page/js/580-roland-mc-101.js` | 21 lignes ajoutées : notifications des voix et débuts de boucle, nettoyage à STOP. |
| `page/js/590-smpltrek-dix-pistes.js` | 8 lignes ajoutées : notification après la programmation native et nettoyage à STOP. |
| `page/ordre.txt` | Ajout des deux nouvelles sources après celles de v269. |
| `app/src/main/assets/drm16.html` | Page distribuée intégrant les sources dans le même ordre. |
| `outils/test-retours-frappe.py` | Nouvelle suite navigateur dédiée aux appuis et aux départs. |
| `.github/workflows/android.yml` | Exécution de la nouvelle suite après les tests graphiques existants. |
| `app/build.gradle` | versionCode et versionName : 270. |
| `bureau/src-tauri/Cargo.toml` | Version : 270.0.0. |
| `bureau/src-tauri/tauri.conf.json` | Version : 270.0.0. |
| `docs/CORRECTIONS_V270.md` | Ce compte rendu. |

Les notifications sont protégées par des vérifications et des `try/catch`.
Elles viennent après les opérations musicales existantes ; elles sont exclues
avant appel durant un rendu hors ligne. Le code natif est uniquement complété :
aucune ligne antérieure des trois sources musicales n'est supprimée ou remplacée.
Les formules, connexions, paramètres et opérations start/stop restent identiques.

Les sons, motifs, formats de sauvegarde, messages MIDI, Freesound, kits de
machines, Studio Tibo et Nexus ne sont pas modifiés. Aucune dépendance ni
ressource externe n'est ajoutée. L'ajout ne mesure pas le son et n'exporte
pas d'animation dans les fichiers audio.

## Vérifications exécutées

### Nouvelle suite

**642 vérifications, zéro erreur**, sur sept formats : 320 × 568, 360 × 640,
393 × 851 (densité 2), 640 × 360, 760 × 400, 880 × 400 et 1024 × 768.

La suite contrôle les départs futurs, les points et leur extinction, les
légendes et positions inchangées, l'absence de doublons après rafraîchissement,
le relâchement hors bouton, les appuis clavier, STOP, les panneaux, le retour
d'arrière-plan, la suspension audio et la réduction des mouvements. Elle
compare aussi les données musicales avant et après le dessin.

Des scénarios dédiés couvrent les échantillons absents, SOUND/PATTERN/FX/CHROMA,
l'unisson et les répétitions FX, les répétitions et suppressions SCATTER,
les voix synthétiques et échantillonnées, les débuts de boucle LOOPER,
MUTE/SOLO, les tranches, le chemin MIDI SmplTrek, le plafond de la file et les
signaux périmés. Le test provoque une exception graphique pour vérifier que
le déclenchement natif SmplTrek ne la propage pas. Un contexte portant une
méthode startRendering vérifie l'exclusion avant appel ; il ne s'agit pas
d'une comparaison de deux exports audio.

La plupart des cas utilisent une horloge contrôlée pour tester les limites.
Un essai supplémentaire utilise la vraie horloge AudioContext, depuis un
départ futur jusqu'à l'extinction et au repos. Les captures de téléphone en
portrait et en paysage ont également été inspectées visuellement.

Les minima tactiles de 44 px sont contrôlés dans les formats mobiles du lot.
Sur la tablette 1024 × 768, PO-33 et MC-101 conservent leur mise à l'échelle
v269, qui peut donner des commandes plus petites : ce lot ne prétend pas la
corriger. Une comparaison séparée avec v269 retrouve exactement les mêmes
mesures de dimensions, d'échelle et de cibles pour KO, MC, SmplTrek et Kaoss
dans ce format. Les premières assertions du nouveau test généralisaient à
tort les minima mobiles à ces deux façades sur tablette ; elles ont été
corrigées, sans modifier leur géométrie.

### Suites précédentes

Les dix suites graphiques précédentes se terminent toutes avec un code de
sortie 0 et aucun échec :

| Suite | Résultat |
| --- | --- |
| `test-graphique.py` | 12 couples façade/format ; aucun échec. |
| `test-facades.py` | 16 cas ; aucun échec. |
| `test-eurorack-focus.py` | 4 formats, 412 ouvertures des 103 types de modules ; aucun échec. |
| `test-menu-machines.py` | 359 vérifications ; aucun échec. |
| `test-outils-studio.py` | 1 086 vérifications ; aucun échec. |
| `test-retours-musicaux.py` | 158 vérifications ; aucun échec. |
| `test-gestes-musicaux.py` | 298 vérifications ; aucun échec. |
| `test-automations-machines.py` | 1 164 vérifications ; aucun échec. |
| `test-ecrans-performance.py` | 949 vérifications ; aucun échec. |
| `test-onde-smpltrek.py` | 537 vérifications ; aucun échec. |

### Structure

Les trois blocs JavaScript de la page assemblée et les quatre sources JS
modifiées ou ajoutées passent `node --check`. Le fichier de test Python et
le workflow YAML sont syntaxiquement valides. Les versions Android/PC sont
cohérentes ; les 184 entrées du manifeste des sources sont uniques.

La page v269 utilisée correspond exactement au blob GitHub
`335d2541a7a91a92406c56ee8b03ed0e9253e4f4`. En retirant les deux ajouts et en
rétablissant les trois sources musicales, on retrouve cette page v269 octet
pour octet. Les ajouts sont présents une seule fois, immédiatement après les
sources prévues. Cette validation du delta ne remplace pas le contrôle
d'assemblage sur le dépôt complet, exécuté par GitHub.

## Limites et contrôle sur appareil

Ces essais ont été réalisés dans Chromium avec la page chargée en mémoire et
un stockage temporaire simulé (`--contenu`). Aucune sauvegarde personnelle
n'a été utilisée. Le dépôt complet n'est pas compilé dans cet environnement :
GitHub exécutera ses contrôles, dont l'assemblage et le nouveau test navigateur
sans cette option, lors de l'envoi du correctif.

**Ni la compilation APK v270 ni une manipulation sur le Samsung n'ont été
réalisées ici.** Aucune comparaison de rendu audio v269/v270 n'est revendiquée.
Les contrôles sur le code natif portent sur le maintien des opérations existantes
et sur les scénarios de déclenchement décrits ci-dessus.

Sur le téléphone, contrôler la lisibilité des points, le relâchement du doigt,
quelques répétitions FX/SCATTER, STOP, l'ouverture de la bibliothèque et le
retour dans l'application. Un point n'a pas vocation à être visible sur une
touche située hors de l'écran ; les boutons natifs restent inchangés.
