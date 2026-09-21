# v272 — Repères des quinze effets du KAOSS PAD

## Base et périmètre

Base vérifiée : **v271 « Correction : test unisson et retours de frappe »**, commit
`19d51d43fd9070fcf096f730042317cf31291657`.
Le lancement APK `35564526656` (numéro 268) est terminé avec succès sur GitHub.
Ce lot ajoute les repères d'effets qui n'étaient pas présents dans ce correctif.
Il ne remplace pas la correction d'unisson et ne remet aucun ancien test en place.

La page HTML utilisée porte le SHA Git
`ad7054537f2736d9ec632926ff28bb8d4bc8925b`, identique à celui lu dans ce commit.
Les SHA Git de l'ordre, du fichier Kaoss, du workflow et des trois fichiers de
version ont également été comparés avant modification : sept correspondances.

## 1. Ce qui change à l'écran

Deux petites cartes, directement dans le pavé, nomment les axes X/Y et affichent
leurs valeurs : fréquence, résonance, temps, réinjection, vitesse, résolution,
niveau ou longueur de boucle selon l'effet sélectionné. FX DEPTH entre dans le
calcul là où le moteur l'utilise réellement. Il ne constitue pas un bypass commun
à tous les effets : les repères respectent le comportement existant.

La ligne RÉGLAGES indique qu'il s'agit de valeurs cibles. AU TOUCHER correspond
à un pavé relâché, CIBLES FX à un geste/HOLD/rejeu. MUTE et AUDIO EN PAUSE sont
prioritaires. Cela ne prétend pas qu'une banque produit un son audible.

Les grandes surfaces reçoivent un schéma discret adapté à l'effet : courbe de
filtre, répétitions, saturation, quantification, répartition des bandes ou longueur
de boucle. **Ce sont des illustrations des paramètres, pas un oscilloscope, un
spectre, une réponse fréquentielle exacte ou une mesure du signal de sortie.**

Sur les pavés étroits ou bas, le schéma disparaît et les chiffres restent visibles.
Les dimensions du pavé et la disposition de la façade ne changent pas. Les
trajectoires, le compteur de points et les états de la v266 restent présents.
Le point de contact est placé devant les nouvelles cartes pour rester repérable.

Le dessin suit les mises à jour natives : déplacements du doigt, PAD MOTION,
changement d'effet, FX DEPTH, mémoires et tempo. Les nouvelles couches ne sont
pas des boutons et ne capturent aucun geste. Une description textuelle complète
est ajoutée au pavé ; elle ne provoque pas d'annonces continues du lecteur d'écran.

## 2. Unités et limites de lecture

| Effet | Axe X | Axe Y |
| --- | --- | --- |
| Passe-bas | Coupure en Hz/kHz | Résonance Q |
| Passe-haut | Coupure en Hz/kHz | Résonance Q |
| Écho | Retard en ms | Réinjection, FX DEPTH compris |
| Hachoir | Fréquence du hachage | Profondeur, FX DEPTH compris |
| Modulation en anneau | Fréquence de modulation | Proportion de son modulé |
| Réduction | Intervalle de quantification de l'amplitude | Proportion de son réduit |
| Réverbération | Brillance du filtrage, en Hz/kHz | Gain du retour FX ajouté au sec |
| Vitesse | Rapport de vitesse des banques | Constante de temps du glissement |
| Passe-bande | Fréquence centrale | Sélectivité Q |
| Flanger | Fréquence de modulation | Réinjection |
| Phaser | Fréquence de modulation | Excursion relative des filtres |
| Distorsion | Coefficient de la courbe de saturation | Filtrage du timbre |
| Isolateur | Bande ou mélange de deux bandes | Niveau cible, pondéré par bande |
| Panoramique auto | Fréquence de modulation | Profondeur gauche/droite |
| Looper | Fraction de mesure | Mélange cible après capture |

Précisions importantes :

- La résolution « PAS 1/n » est l'intervalle entre deux amplitudes quantifiées,
  pas un nombre de bits ni un pas du séquenceur.
- Le retour de réverbération peut atteindre 120 %. C'est un gain ajouté au son
  sec, pas un pourcentage normalisé de mélange sec/mouillé. Le libellé natif
  devient « X la brillance, Y le retour FX » : les formules audio ne changent pas.
- GLISS. τ donne la constante de temps employée par le moteur, de 4 à 164 ms,
  et non la durée totale nécessaire pour atteindre la nouvelle vitesse.
- Pour l'isolateur, le dessin montre les gains pondérés des trois bandes. Le
  niveau de la carte Y est la cible avant cette pondération.
- Le looper montre la longueur visée au tempo actuel. Son schéma ne certifie
  ni une capture terminée, ni un contenu audio, ni une boucle déjà audible.
- Les valeurs d'un effet relâché décrivent ce qui sera demandé au prochain
  toucher. Elles ne suivent pas l'évolution sonore d'une queue FX RELEASE.

## 3. Fonctionnement et consommation

Le nouveau module lit les états et observe les changements de l'affichage natif.
Il ne remplace aucune fonction de traitement audio, de programmation des notes,
de mouvement ou de mémoire. Il n'ajoute aucun analyseur ni nœud audio.

Un événement demande au plus une mise à jour en attente. Les dessins sont limités
à environ 30 par seconde, ou 10 avec la préférence de réduction des mouvements.
Aucune nouvelle image n'est demandée après le dessin tant qu'aucun événement
n'arrive : pas de boucle permanente en HOLD immobile ou à l'arrêt.

La vue se met au repos sous le menu, les notices, les outils, en arrière-plan,
en mode ensemble, lorsque le pavé est hors écran ou pendant un rendu hors ligne.
Le canvas est unique et sa densité est plafonnée à 2. Si le contexte 2D n'est pas
disponible, les chiffres et leurs descriptions restent utilisables.

## 4. Fichiers livrés — 11 fichiers uniquement

| Fichier | Modification |
| --- | --- |
| `page/css/310-reperes-effets-kaoss.css` | Cartes XY, disposition compacte, contraste, ordre des couches et schéma. |
| `page/js/740-reperes-effets-kaoss.js` | Calcul des repères, schémas et cycle de rafraîchissement en lecture seule. |
| `page/js/570-korg-kaoss-pad.js` | Une seule chaîne de légende corrigée pour la réverbération. |
| `page/ordre.txt` | Les deux nouvelles sources placées après celles de la v270. |
| `app/src/main/assets/drm16.html` | Page distribuée actualisée avec ces deux sources et la légende corrigée. |
| `outils/test-reperes-kaoss.py` | Vérifications graphiques, interactions, repos, repli et comparaisons numériques. |
| `.github/workflows/android.yml` | Nouveau test bloquant et rapport `app/build/reports/reperes-kaoss.json`. |
| `app/build.gradle` | versionCode 272 et versionName '272'. |
| `bureau/src-tauri/Cargo.toml` | Version 272.0.0. |
| `bureau/src-tauri/tauri.conf.json` | Version 272.0.0. |
| `docs/CORRECTIONS_V272.md` | Ce compte rendu. |

Le ZIP ne contient aucun fichier inchangé, aucun son, aucune bibliothèque ajoutée,
aucune dépendance à installer séparément et aucune nouvelle ressource réseau.
Le dossier racine est `drm16_android/`, pour le script de mise à jour habituel.

## 5. Vérifications exécutées

### Nouveau test

**750 vérifications, zéro erreur**, sur sept formats : 320 × 568, 360 × 640,
393 × 851, 640 × 360, 760 × 400, 880 × 400 et 1024 × 768. Densité 2 sur 393 × 851.

Le test contrôle les quinze effets dans chaque format, les textes non tronqués,
la présence unique des couches, les dimensions comparées à la page sans ces
couches, les appuis sous les cartes, les coordonnées, HOLD, PAD MOTION, le rappel
de mémoire, FX DEPTH, MUTE, les pauses, le masquage, le retour d'arrière-plan,
la préférence de réduction des mouvements et le repli sans canvas.

**900 combinaisons de réglages et 2 500 comparaisons numériques, zéro différence
hors de la tolérance de lecture des AudioParam.** Les cas parcourent les quinze
effets, cinq positions X, quatre positions Y et trois profondeurs. Des cas
supplémentaires vérifient les frontières de sélection et cinq tempos du looper.

La comparaison exécute `appliquerKp()` et relève les réglages natifs : AudioParam,
cibles des fonctions de lissage, courbe de quantification, vitesse ou looper.
Le contexte est suspendu pendant cette lecture pour éviter qu'un quantum du
thread audio ne remplace une valeur entre l'écriture et la mesure. Les fonctions
d'observation sont rétablies dans un bloc `finally`. Il s'agit d'un test des
paramètres demandés, **pas d'une comparaison de fichiers WAV ni d'un test d'écoute**.

Le rapport d'échec donne les assertions et les valeurs numériques concernées.
Il est écrit également en cas d'exception interceptée ; une interruption brutale
avant l'exécution de `finally` peut empêcher cette écriture.

### Non-régressions

Les **onze suites graphiques précédentes** ont été réexécutées avec succès, sans modification de leurs tests.

| Suite | Bilan de cette exécution |
| --- | --- |
| `test-graphique.py` | 12 façades/formats contrôlés ; 0 erreur(s). |
| `test-facades.py` | 16 cas façade/format ; 0 erreur(s). |
| `test-eurorack-focus.py` | 4 formats et 412 ouvertures catalogue ; 0 erreur(s). |
| `test-menu-machines.py` | 5 formats, 359 vérifications, 0 erreur(s). |
| `test-outils-studio.py` | 6 formats, 1086 vérifications, 0 erreur(s). |
| `test-retours-musicaux.py` | 158 vérifications ; 0 erreur(s). |
| `test-gestes-musicaux.py` | 298 vérifications ; 0 erreur(s). |
| `test-automations-machines.py` | 1164 vérifications ; 50 façades/formats ; 0 erreur(s). |
| `test-ecrans-performance.py` | Écrans de performance : 949 vérifications, 0 erreurs. |
| `test-onde-smpltrek.py` | 537 vérifications ; 0 erreur(s). |
| `test-retours-frappe.py` | 725 vérifications ; 0 erreur(s). |


### Structure et intégrité

En retirant seulement les deux nouveaux blocs de la page et en rétablissant la
chaîne de légende, le HTML de la v271 est retrouvé **octet pour octet**. Dans le
fichier Kaoss, tout autre caractère est inchangé. Le module de frappe corrigé en
v271 et son test restent également identiques.

L'ordre ne contient que les deux ajouts attendus, chacun une fois. Les sources
nouvelles et les blocs JavaScript du HTML passent la vérification syntaxique Node.
Le test Python, le workflow YAML, le JSON Tauri et le TOML Cargo sont valides.
Les trois versions Android/PC concordent. Aucun ancien test n'est retiré, rendu
non bloquant ou modifié dans cette mise à jour.

La vérification complète de `outils/assembler.py` sur tous les fichiers du dépôt
reste effectuée par GitHub. Ici, l'intégrité de l'assemblage est contrôlée par
la comparaison exacte avec la page de base vérifiée et les deux insertions.

## 6. Inchangé et limites

Les traitements audio, les sons, les motifs, les formats de sauvegarde, les
fonctions MIDI, Freesound, la bibliothèque et les kits ne changent pas.
Il n'est pas nécessaire de désinstaller l'application ni d'effacer ses données.

Environnement : Python 3.13.5, Playwright 1.57.0, Chromium 144.0.7559.96 built on Debian GNU/Linux 13 (trixie), Node v22.16.0.

Une tentative de navigation directe vers le fichier local est bloquée par la politique
du navigateur de cet environnement (`ERR_BLOCKED_BY_ADMINISTRATOR`). Elle n'a
pas exécuté les essais fonctionnels. Le mode local habituel de GitHub n'est pas
modifié ; les résultats ci-dessus proviennent des exécutions `--contenu`.

La page est chargée en mémoire avec stockage temporaire simulé (`--contenu`).
Aucune donnée personnelle n'est utilisée. Les chiffres de tests correspondent
aux exécutions dans cet environnement, pas à un test matériel Samsung.

**L'APK v272 et la version Windows n'ont pas été compilés ici.** GitHub doit
réexécuter ses contrôles complets et construire l'APK après application du ZIP.
Le rendu réel au doigt sur le Samsung reste à vérifier, notamment les mouvements
au bord du pavé et le retour depuis la bibliothèque.
