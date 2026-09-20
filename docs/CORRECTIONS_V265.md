# v265 — VU-mètres stéréo et retours musicaux

## Base et périmètre

Mise à jour à appliquer après la v264, et non projet complet. Base vérifiée :
commit `296f0b7bc651ea59df875e1f846d386660f98f66` du dépôt
`janintibo-art/drm16-android`, « v264 Graphisme : panneaux outils et confort MIDI ».

Le lot ajoute une visualisation du signal audio réel et de l'activité musicale.
Il ne remplace pas les moteurs de synthèse, les commandes des machines ou leurs
séquenceurs. Aucun son, image, police ou téléchargement supplémentaire.

## Pourquoi ce changement

La table affichait une seule barre par voie à partir de données temporelles
sur 8 bits. Elle ne distinguait pas gauche et droite. Le relevé portait sur
toutes les voies à chaque passage de la boucle, même hors de la zone visible.
Les quatre façades mobiles ne disposaient pas d'un indicateur général commun.

La sortie comprend déjà un limiteur, un écrêteur doux et une garde finale.
Un voyant de dépassement avant ces protections et un témoin de travail du
limiteur ne signifient donc pas la même chose. La v265 les sépare explicitement.

## Ce qui apparaît à l'écran

### Sortie stéréo

La table de mixage reçoit un bandeau SORTIE G / D : deux barres segmentées,
valeurs numériques en dBFS, traits clairs de crête, état du transport, témoin
MIDI et voyant LIM. Le bouton RAZ CRÊTES efface les repères et alertes, sans
toucher au volume, au panoramique, aux états COUPE/SOLO ou à la lecture.

Sur PO-33, MC-101, SmplTrek et Kaoss Pad, lorsque leur présentation mobile est
active, un mini-affichage occupe la bande déjà réservée en haut de l'écran.
Il ne se superpose ni à MENU ni à NOTICE dans les formats contrôlés. Il disparaît
sous les outils, le menu et les présentations plein écran concernées. Ce n'est
pas un nouveau bandeau imposé aux 29 façades : les autres machines disposent
des mesures dans la table de mixage.

### Mesures dans les 21 voies de la table

Les anciennes barres sont masquées, sans suppression de leurs éléments ou des
commandes existantes. Chaque voie reçoit deux colonnes G/D et la valeur de sa
crête maximale. Le prélèvement suit le fader et le panoramique : COUPE et SOLO
sont pris en compte. Une voie non construite ou non mesurable affiche un tiret.

CLIP s'allume lorsqu'une crête mesurée atteint ou dépasse 1 en valeur absolue,
soit 0 dBFS, avant les protections communes. L'alerte reste visible 1,5 seconde.
LIM indique une réduction d'au moins 1 dB du limiteur général, en présence d'un
signal, avec maintien bref de 250 ms. Le bord du mini-affichage devient ambre
quand ce même limiteur travaille. Une zone colorée en haut d'une barre ne
constitue pas à elle seule la preuve d'un écrêtage physique du téléphone.

### Transport, MIDI et pads

Les mentions STOP, PLAY, REC, ARMÉ ou ATTENTE suivent les états existants.
ARMÉ distingue notamment l'enregistrement activé sur le PO-33 à l'arrêt.
Le témoin de lecture suit les pas de l'horloge de l'application. Les pads du
PO-33, MC-101 et SmplTrek reçoivent une brève bordure sur le pas courant, sans
changement de taille, de clic ou de programmation.

Le voyant MIDI reflète les messages de canal qui passent par l'entrée MIDI de
l'application. Cela inclut l'écoute interne des prises empruntant cette entrée :
ce n'est pas une preuve de réception depuis un appareil externe. Les ticks
Clock et l'Active Sensing seuls ne l'allument pas. La fonction MIDI originale
reçoit strictement les mêmes arguments et sa valeur de retour est conservée.

## Mesure et précautions audio

Ce sont des indicateurs de crête numérique d'échantillons, pas des VU analogiques
normalisés, des mesures de loudness ni des true-peaks. L'échelle graphique va de
−60 à 0 dBFS. Les valeurs au-dessous du plancher sont affichées −∞ ; les
valeurs de voie supérieures à 0 dBFS restent lisibles numériquement.

Le master est prélevé après la garde de sortie du moteur DRM et avant le volume
système Android. Les applications invitées et le son physique d'un instrument
MIDI externe ne sont pas mesurés. Ce n'est pas une mesure du haut-parleur.

Chaque lecteur utilise une branche parallèle : adaptation stéréo, séparateur
G/D et deux analyseurs flottants. Cette branche n'est jamais reliée à la
sortie sonore. Un signal mono est dupliqué comme sur une sortie stéréo ; deux
canaux opposés en phase ne sont pas additionnés ni annulés pour la mesure.

La taille de fenêtre part de 2 048 échantillons et augmente aux cadences élevées.
La barre retombe à 24 dB/s ; le repère de crête est conservé 0,9 seconde puis
retombe à 18 dB/s. Comme toute mesure par fenêtres relues dans l'interface,
elle peut manquer une pointe très brève en cas de long blocage du navigateur.
Les protections audio existantes, elles, continuent indépendamment de cet affichage.

Le constructeur audio expose seulement deux références de lecture : la garde
de sortie et le limiteur. Leurs paramètres, leur ordre de connexion et leurs
courbes sont inchangés. Les débranchements visent uniquement la branche de
mesure, jamais l'ensemble des connexions de la source.

## Charge graphique et cycle de vie

Un gestionnaire commun remplace la boucle de mesure monochrome de la table.
Les lectures et dessins sont plafonnés à environ 30 par seconde ; avec la
préférence de mouvements réduits, environ 10. La bordure animée des pads est
également supprimée avec cette préférence. Les textes ne sont pas réécrits
à chaque image et les tampons audio sont réutilisés.

Seules la sortie affichée et les colonnes dont les vumètres sont visibles
possèdent des branches de mesure. Un défilement retire les lecteurs devenus
invisibles. La fermeture des panneaux, le masquage du document et la suspension
du contexte arrêtent les mesures. Le retour au premier plan ou un nouveau
contexte audio rétablit les connexions utiles. Aucun analyseur de ce module
n'est créé dans un contexte de rendu audio hors ligne.

## Les 11 fichiers livrés

| Chemin | Changement |
| --- | --- |
| `page/css/250-retours-musicaux.css` | Nouvel habillage des barres, alertes, voyants, mini-affichage et impulsions des pads. Libellé RAZ conservé sur deux lignes même à 320 px. |
| `page/js/680-retours-musicaux.js` | Prélèvement stéréo, calcul des crêtes, dessin, témoins et gestion du cycle de vie. |
| `page/js/110-moteur-audio.js` | Exposition des deux références de lecture et réveil du module, uniquement en contexte temps réel. |
| `page/ordre.txt` | Ajout des deux nouveaux fragments, soit 174 fragments au total. |
| `app/src/main/assets/drm16.html` | Page livrée réassemblée avec ces seuls changements de sources. |
| `outils/test-retours-musicaux.py` | Test navigateur des affichages, de signaux audio synthétiques réels et du cycle de vie. |
| `.github/workflows/android.yml` | Ajout de ce test après celui des outils dans le contrôle GitHub. |
| `app/build.gradle` | Versions Android 265. |
| `bureau/src-tauri/Cargo.toml` | Version bureau 265.0.0. |
| `bureau/src-tauri/tauri.conf.json` | Version bureau 265.0.0. |
| `docs/CORRECTIONS_V265.md` | Présent compte rendu. |

Les sons, motifs, sauvegardes, schémas de projets, Freesound, bibliothèque,
transferts et réglages MIDI ne sont pas modifiés. Aucune nouvelle autorisation
Android et aucune nouvelle dépendance.

## Vérifications effectuées avant livraison

Environnement : Chromium dans le conteneur, avec stockage temporaire simulé,
comme dans les lots graphiques précédents. Aucune donnée personnelle utilisée.

- Test v265 : **157 vérifications**, dans les formats 393 × 851, 880 × 400,
  360 × 640, 1280 × 800 et 320 × 568 ; aucune erreur.
- Contrôle graphique précédent : **12 cas façade/format**, aucune erreur.
- Façades : **16 cas façade/format**, aucune erreur.
- Focus Eurorack : **4 formats et 412 ouvertures du catalogue**, aucune erreur.
- Menu : **359 assertions dans 5 formats**, aucune erreur.
- Outils : **1 086 assertions dans 6 formats**, aucune erreur.

Le nouveau test contrôle notamment la séparation G/D, le mono, l'antiphase,
le silence, la décroissance et le maintien des crêtes, le plafonnement des
lectures, le panoramique, COUPE/SOLO, la surcharge, le limiteur, la remise à
zéro, le voyant MIDI, le transport, les ouvertures répétées, le défilement,
les contextes suspendus/remplacés et l'absence de lecteurs hors ligne.

Exemple mesuré : pour un signal de crête gauche 0,22 et droite 0,055, les
lecteurs ont relevé respectivement environ 0,2199999 et 0,0550000. Les deux
canaux d'un signal en opposition de phase à 0,2 restent visibles séparément.

Une comparaison supplémentaire de la chaîne de sortie en rendu hors ligne
v264/v265 a utilisé un signal stéréo synthétique passant d'un niveau modéré à
un niveau sollicitant les protections : **96 000 échantillons comparés à
48 kHz, zéro différence**, soit une différence maximale de 0. Cela vérifie ce
signal d'essai ; ce n'est pas une preuve d'identité de tous les usages possibles.

La syntaxe des trois scripts intégrés a été vérifiée avec Node. Aucun identifiant
HTML dupliqué n'a été trouvé. Des captures en portrait, petit écran, paysage et
en présence de signal ont été examinées ; un retour à la ligne indésirable de
CRÊTES à 320 px a été corrigé et ajouté au test.

Le fragment audio d'origine a été identifié par son empreinte Git exacte.
L'assemblage a été vérifié par différence : en retirant les deux ajouts et en
rétablissant ce fragment, on retrouve exactement les octets de la page v264.
Le contrôle complet avec toutes les sources du dépôt sera exécuté par GitHub.

**Non effectué ici :** compilation APK/Windows, test sur le Samsung, mesure de
consommation ou de latence physique sur téléphone et essais avec un vrai
périphérique MIDI. Les tests sur signaux synthétiques ne remplacent pas un essai
musical long avec un set dense.

## Suite graphique

Les trajectoires et mouvements Kaoss, ainsi que la visualisation des
automatisations sur les commandes, ne sont pas ajoutés par ce lot. Ils restent
à traiter. La v265 n'est donc pas annoncée comme la fin de toute la refonte.
