# v273 — Focus de la table de mixage

## Base vérifiée

Cette mise à jour part de la **v272**, commit
`61879b2eca40215ee85435a73d5653b55b417396`.
Le lancement APK `35579703593` (numéro 269), intitulé
« v272 Graphisme : reperes des quinze effets Kaoss », est terminé avec succès
sur GitHub lors de la vérification.

La page assemblée de l'archive v272 a été comparée à l'objet Git de ce commit :
SHA Git `15ede114047afaa1c22c864cc04ee2a5e9dd02c5`, identique.
Le workflow Android et `app/build.gradle` correspondent aussi aux SHA lus dans
l'arbre Git. Les correctifs d'unisson de la v271 et les repères Kaoss de la v272
restent intégralement présents.

## Pourquoi ce lot

La vue générale du mixeur garde des tranches étroites pour montrer plusieurs
machines ensemble. Elle n'offre pas la même précision qu'une vue consacrée à
une seule voie, notamment pour le gain, les trois bandes d'égalisation et le
panoramique. Ce lot ajoute cette vue de travail, sans redessiner les façades des
machines ni remplacer leurs moteurs.

## Utilisation

Dans **TABLE DE MIXAGE**, toucher **FOCUS** sous le nom d'une voie.
La tranche choisie occupe la zone de travail ; les vingt autres sont simplement
masquées. Elles ne sont ni coupées ni retirées du SET.

Les flèches et le sélecteur permettent de parcourir les **21 voies**. Les
variantes qui partagent déjà une voie restent regroupées : ce n'est pas l'ajout
de 21 moteurs ou de 21 pistes de notes indépendantes.

Les boutons **− / +** ajustent chaque contrôle d'un cran natif. Le curseur lui-même
reste utilisable directement. Une limite atteinte désactive le bouton concerné.
Le bouton JOUER de la tranche conserve sa fonction native d'inclusion dans le SET ;
la commande LECTURE générale conserve le transport. Le statut distingue COUPE,
SOLO, coupure par le SOLO d'une autre voie et présence dans le SET.

**RETOUR TABLE** retrouve la console et son défilement initial sans arrêter la
lecture. Les commandes générales masquées dans le Focus — TOUT COUPER, VOIR LES
MACHINES et le bandeau de mesure de sortie — sont retrouvées dans la vue générale.
SET, LECTURE, CONSEILS et FERMER restent accessibles pendant le Focus.

En paysage compact, la navigation et le transport se placent à gauche. Les
réglages défilent dans la zone de droite. En portrait, la tranche défile
verticalement, sans être réduite pour tenir toute sa hauteur dans l'écran.
Les commandes atteignent au moins **44 × 44 pixels CSS** dans les sept formats
vérifiés. Les libellés fonctionnels contrôlés font au moins 10,5 pixels.

Sur ordinateur, le premier Échap quitte le Focus, le second ferme la table.
OUVRIR conserve l'accès natif à la façade de la voie sélectionnée.

## Ce que signifient les chiffres

| Contrôle | Affichage | Sens |
| --- | --- | --- |
| GAIN | Décibels, de −∞ à environ +6,0 | Variation du gain d'entrée relativement au calibrage de la machine ; pas le niveau mesuré à l'entrée. |
| AIGU / MÉDIUM / GRAVE | Décibels, de −26 à +6 | Valeur de la fonction native `dbEq`. Le milieu reste 0 dB. |
| PANORAMIQUE | CENTRE, G ou D et pourcentage | Position du panoramique entre gauche et droite. |
| NIVEAU | Décibels, de −∞ à 0 | Gain du fader ; 80 % de course vaut environ −1,9 dB. |

Les chiffres décrivent les réglages. Ils ne sont pas des mesures dBFS du son.
Le vumètre stéréo de la voie, conservé à côté du fader, continue d'utiliser le
signal réel via le gestionnaire de mesure de la v265.

Les crans ne valent pas tous le même nombre de décibels : on conserve le pas et
la courbe du curseur natif (0,02 pour gain/panoramique ; 0,01 pour EQ/niveau).

## Fonctionnement et protections

- Les **126 éléments INPUT existants** sont conservés, avec leurs écouteurs et
  leurs bornes. Aucun contrôle audio n'est cloné.
- Les nouveaux boutons ± déclenchent un seul événement `input`, traité par
  l'écouteur natif. Une valeur inchangée ne déclenche aucun événement.
- Leur clic ne remonte pas au gestionnaire des boutons JOUER/COUPE/SOLO : cela
  évite une deuxième mise à jour ou une deuxième mémorisation.
- Ouvrir, parcourir et quitter le Focus ne modifie ni les valeurs du SET, ni
  la sélection de machine, ni le tempo ou l'état du transport.
- Les fonctions d'interface `majTable` et `fermerTable` sont accompagnées par
  des wrappers qui transmettent leurs arguments, leur résultat et leurs erreurs.
  Les calculs audio natifs ne sont pas remplacés.
- Le module Focus ne construit aucun nœud audio ni analyseur et n'ajoute ni
  image ni police. Il réutilise le gestionnaire de vumètres existant, réveillé
  quand la disposition change.
- Il n'y a ni minuterie ni boucle d'animation dans le nouveau module. Les valeurs
  sont mises à jour à partir des événements des contrôles et de la synchronisation
  native de la table.
- Les curseurs disposent de noms accessibles et de valeurs textuelles. Les sorties
  chiffrées ne déclenchent pas 126 annonces de lecteur d'écran au chargement.
- Fermer la table ou ouvrir un autre panneau nettoie l'état du Focus. Une fermeture
  suivie d'une réouverture dans la même tâche est également traitée.

Les sons, les motifs, le routage, les traitements et protections audio, les formats
de projet et de sauvegarde, les fonctions MIDI, Freesound, Studio Tibo et Nexus ne
sont pas modifiés. Ajuster un contrôle reste naturellement un changement de mixage,
enregistré par le mécanisme natif existant.

## Fichiers livrés — 10 fichiers nouveaux ou modifiés seulement

| Fichier | Changement |
| --- | --- |
| `page/css/320-focus-mixage.css` | Vue Focus, dispositions portrait/paysage, tailles des contrôles et valeurs visibles. |
| `page/js/750-focus-mixage.js` | Navigation, réutilisation des INPUT, boutons de précision, valeurs et cycle de vie. |
| `page/ordre.txt` | Ajout des deux fragments après les modules graphiques de la v272. |
| `app/src/main/assets/drm16.html` | Page assemblée incluant les deux fragments. |
| `outils/test-focus-mixage.py` | Tests graphiques et fonctionnels du Focus. |
| `.github/workflows/android.yml` | Exécution du test et rapport `app/build/reports/focus-mixage.json`. |
| `app/build.gradle` | Version Android 273. |
| `bureau/src-tauri/Cargo.toml` | Version bureau 273.0.0. |
| `bureau/src-tauri/tauri.conf.json` | Version bureau 273.0.0. |
| `docs/CORRECTIONS_V273.md` | Ce compte rendu. |

## Vérifications effectuées

Le test du Focus réalise **1 365 vérifications sans erreur** dans les formats
320×568, 360×640, 393×851, 640×360, 760×400, 880×400 et 1024×768.
Il parcourt les 21 voies dans chaque format, soit 147 présentations contrôlées.

Il vérifie notamment l'absence de débordement, les dimensions et noms des
commandes, l'identité des 126 INPUT, l'absence de modification du SET pendant
la navigation, l'unicité des événements et des sauvegardes, les bornes, les unités,
les appuis sur les curseurs, le fader au clavier, la rotation d'écran, COUPE/SOLO,
le vumètre avec un signal audio d'essai, la conservation du transport et du
scroll, les deux niveaux d'Échap, la fermeture et le retour à la façade.
Le compteur de mises à jour confirme aussi l'absence de rafraîchissement continu
au repos. Des captures portrait et paysage ont été examinées.

Les trois blocs JavaScript de la page assemblée passent `node --check`.
Le nouveau test Python est syntaxiquement valide et le YAML du workflow est
analysé sans erreur. Le nouveau workflow ajoute une suite sans en retirer aucune.

Contrôle d'assemblage : les deux nouvelles sources figurent une seule fois dans
la page, immédiatement après les sources indiquées dans le manifeste. Retirer
ces deux fragments restitue exactement la page v272 vérifiée sur GitHub.
Le contrôle complet `outils/assembler.py --verifier` reste exécuté par le workflow
sur le dépôt complet.

Les **12 suites graphiques précédentes passent également sans erreur** sur la
page v273, sans désactivation de contrôle :

| Suite | Résultat obtenu |
| --- | --- |
| Confort mobile | 12 cas façade/format, 0 erreur. |
| Matières des façades | 16 cas façade/format, 0 erreur. |
| Focus Eurorack | 4 formats, 412 ouvertures couvrant 103 types, 0 erreur. |
| Menu machines | 359 vérifications, 0 erreur. |
| Outils studio | 1 086 vérifications, 0 erreur. |
| Retours musicaux | 158 vérifications, 0 erreur. |
| Gestes musicaux | 298 vérifications, 0 erreur. |
| Automatisations des machines | 1 164 vérifications, 0 erreur. |
| Écrans de performance | 949 vérifications, 0 erreur. |
| Onde SmplTrek | 537 vérifications, 0 erreur. |
| Retours de frappe | 725 vérifications, 0 erreur ; correctif unisson conservé. |
| Repères Kaoss | 750 vérifications et 2 500 comparaisons numériques sur 900 réglages, 0 erreur. |

Ces résultats concernent les suites graphiques exécutées dans cet environnement ;
ils ne remplacent pas la compilation complète et les autres contrôles du dépôt.


### Limites des essais

Essais dans Chromium du conteneur, avec `--contenu` : page chargée en mémoire et
stockage temporaire simulé, sans accès aux données personnelles du téléphone.
La tentative de navigation directe en `file://` est bloquée par la politique du
navigateur de cet environnement (`ERR_BLOCKED_BY_ADMINISTRATOR`) ; ce mode n'a donc
pas pu être validé ici. Le test conserve son mode fichier normal pour GitHub.

Aucune compilation Gradle/APK ni compilation Windows n'a été effectuée ici.
La compilation v273 sur GitHub et l'essai tactile sur le Samsung restent à faire.
Les dimensions CSS mesurées ne constituent pas une mesure physique en millimètres
sur le téléphone.

## Livraison

Archive `drm16_android_v273.zip`, dossier racine `drm16_android/`, chemins directs.
Ce n'est pas le projet complet : appliquer sur la v272 avec le script habituel.
Aucune décompression ou copie manuelle de source n'est nécessaire.
