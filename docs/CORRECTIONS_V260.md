# v260 — Graphisme : premier lot de confort mobile

Base de travail : v259, commit `39983ce8f05084272354b899ee92e60b960f0d1a`.
Date : 20 septembre 2026.

Cette mise à jour commence la feuille de route graphique de l'analyse v122.
Elle ne constitue pas la refonte graphique complète. Le périmètre est volontairement
limité aux quatre façades récentes : PO-33 K.O!, MC-101, SmplTrek et KAOSS PAD.

## Ce qui posait problème

L'ajout des fonctions entre les v122 et v259 a allongé les façades. La fonction `fit()`
réduisait ensuite toute la machine pour la faire tenir dans l'écran. Le texte et les
cibles tactiles devenaient eux aussi plus petits. Certains réglages secondaires
précédaient les pads, ce qui repoussait la zone de jeu vers le bas.

Un autre défaut a été constaté sur le KAOSS PAD : sa classe de corps affichait le
Kaoss sans masquer la façade DRM par défaut. Deux machines pouvaient donc se
présenter côte à côte. Un simple contrôle de largeur du document ne le détectait pas.

## Changements visibles

### Une façade lisible plutôt qu'une miniature

Sur une fenêtre de largeur inférieure ou égale à 960 pixels, ou de hauteur inférieure
ou égale à 540 pixels, ces quatre façades ne sont plus réduites automatiquement en
hauteur. L'échelle de base reste à 1. Leur contenu défile à l'intérieur de la façade.
Le zoom manuel reste disponible ; les valeurs de taille ci-dessous concernent le zoom
normal. Les réglages supplémentaires ne sont ni supprimés ni masqués derrière de
nouveaux boutons.

Une bande supérieure est réservée à MENU et NOTICE, pour éviter qu'ils recouvrent
le nom de la machine. Un rappel de `fit()` après un changement de son ne remet pas
le défilement à zéro.

### Commandes et lisibilité

Les boutons, sélecteurs, curseurs et poignées de potards concernés ont une taille
réelle minimale de 44 × 44 pixels. Les textes de ces commandes sont d'au moins
11 pixels. Les libellés et informations secondaires ciblés sont éclaircis et agrandis.
Les poignées de potards incluent leur étiquette sans modifier leur diamètre visuel.
Les couleurs d'état propres aux machines restent pilotées par le code existant.

Cette passe n'affirme pas que tous les textes de toute l'application sont désormais
à 11 pixels : les autres machines, certaines inscriptions décoratives et le texte
dessiné dans les canvas restent à examiner séparément.

### PO-33 K.O!

Les six commandes supérieures passent sur deux rangées de trois. FX, PLAY et WRITE
sont placés avant les pads. Les seize pads restent disposés en 4 × 4, avec une hauteur
minimale de 60 pixels. Swing et Parameter Locks restent accessibles plus bas.

### MC-101

Les quatre potards, le transport et les pads sont remontés juste après les pistes.
Clips, scènes, copie et choix de son restent présents après la zone de jeu. Les pas
s'affichent par rangées de quatre sur un petit écran, ou de huit à partir de 480 pixels.

### SmplTrek

L'écran utilise la largeur disponible, dans la limite de sa largeur d'origine. Les
potards passent dessous sur téléphone. Les pistes et les pads sont remontés avant
les fonctions d'importation, d'instrument, de MIDI et de chaîne. Les pistes sont
regroupées par cinq ; les pas, par quatre ou huit selon la largeur.

### KAOSS PAD

Le pavé tactile reste séparé du défilement des réglages. En portrait, ceux-ci défilent
au-dessus du pavé ; en paysage à partir de 640 pixels de largeur, ils sont à gauche
et le pavé à droite. Les mémoires ont de vraies cibles tactiles. La façade DRM
indésirable est masquée seulement lorsque le Kaoss est la machine active.

## Fichiers de la mise à jour

- `page/css/200-confort-mobile.css` : nouvelle feuille de style, limitée à ces façades.
- `page/js/220-mise-a-l-echelle.js` : branche de mise en page mobile dans `fit()` et nettoyage des classes lors du changement de machine.
- `page/html/190-unit-mc.html`, `200-unit-stk.html`, `210-unit-ko.html` : ordre des commandes ; aucun identifiant retiré ou ajouté.
- `page/ordre.txt` : enregistrement de la nouvelle feuille de style avant la fermeture du bloc de styles.
- `app/src/main/assets/drm16.html` : page assemblée correspondant aux sources modifiées.
- `app/build.gradle` : version Android 260 ; réglages de signature inchangés.
- `bureau/src-tauri/Cargo.toml` et `bureau/src-tauri/tauri.conf.json` : numérotation 260.0.0 ; dépendances et sécurité inchangées.
- `outils/test-graphique.py` : contrôle de géométrie, de défilement, d'accès aux commandes et de sortie du mode confort.
- `.github/workflows/android.yml` : ajout de ce contrôle après les tests navigateur/MIDI existants.
- `docs/CORRECTIONS_V260.md` : cette note et la suite de la feuille de route.

## Vérifications effectuées avant livraison

Le HTML v259 utilisé a été récupéré dans l'artefact GitHub du commit de base. Son
empreinte Git a été comparée à celle du fichier du dépôt. Les sources modifiées ont
également été retrouvées et contrôlées par leur empreinte Git avant modification.

Contrôles effectués dans Chromium, avec la page chargée en mémoire et un stockage
local temporaire simulé dans l'environnement de travail :

- Ouverture, démarrage et arrêt des 29 entrées du test navigateur, dans les formats
  393 × 851, 880 × 400 et 360 × 640, sans erreur JavaScript ni débordement horizontal
  constaté. L'exécution a été répartie en plusieurs passages.
- Test graphique final : les quatre façades dans les trois formats, soit 12 cas,
  sans échec. Échelle de base 1, une seule façade visible, commandes mesurées à au
  moins 44 × 44 pixels, aucun débordement horizontal interne, bande supérieure
  dégagée et défilement conservé lors d'un rappel de `fit()`.
- Accès par clic non forcé aux commandes situées plus bas : Parameter Lock du PO-33,
  copie MC-101, mode MIDI SmplTrek, HOLD du Kaoss.
- Contrôle de transition vers le mode ensemble, retour à une machine, plein écran
  Eurorack et retour, passage vers une fenêtre 1180 × 860 puis retour au téléphone.
  Ces contrôles de transition ne constituent pas une validation exhaustive du jeu
  simultané dans le mode ensemble.
- Syntaxe JavaScript vérifiée par Node ; liste des identifiants HTML conservée.
- Comparaison des scripts : en dehors de `fit()`, leur contenu est strictement
  identique à la v259. Les sources livrées sont présentes dans le manifeste et
  reproduites dans le HTML assemblé.
- Captures de contrôle inspectées pour la lisibilité et la disposition.

La compilation Android complète, la suite historique complète des tests et le
contrôle sur un vrai Samsung ne sont pas déclarés réalisés ici. GitHub Actions
exécutera les contrôles existants et le nouveau test avant de fabriquer l'APK.
Il faut encore apprécier le défilement au doigt et le confort des gestes sur
le téléphone réel. Aucun résultat d'écoute ou de latence audio n'est revendiqué.

Commande de maintenance du test : `python outils/test-graphique.py`.
Les options `--contenu` et `--chromium CHEMIN` servent uniquement aux environnements
de contrôle qui ne peuvent pas naviguer vers un fichier local.

## Ce qui n'a pas été touché

Aucun changement dans la synthèse sonore, l'ordonnanceur audio, les effets, les
échantillons, les banques, les motifs, les fonctions MIDI, Freesound, la bibliothèque,
les fichiers de projet ou leur format. Aucun changement Java/Rust fonctionnel, de
permissions Android, d'identifiant d'application ni de signature. Aucun nouveau
fichier image, police ou téléchargement n'est nécessaire.

Les façades anciennes gardent leur mise en page et leur adaptation antérieures.
Sur un grand écran, les trois changements d'ordre HTML restent présents, mais le
mode de confort mobile n'est pas activé.

## Suite du chantier graphique

1. **Lisibilité restante** : examiner les façades anciennes machine par machine ;
   ne pas appliquer aveuglément un agrandissement global qui casserait les panneaux.
2. **États des commandes** : harmoniser sélection, activation, lecture, attente et
   indisponibilité, tout en conservant l'identité des machines.
3. **Habillage des quatre façades récentes** : matières, reliefs et afficheurs plus
   cohérents avec leur personnalité ; cette v260 traite d'abord leur utilisation.
4. **Eurorack** : travail sur MODULE FOCUS, puis lisibilité et repères de câblage.
5. **Menu et outils** : navigation, présentation des machines et cohérence visuelle.
6. **Retours visuels** : VU-mètres, lecture et animations utiles, sans multiplier les
   effets coûteux pendant la production audio.

La version à reprendre après application de cette archive est **260**. Le fichier
historique `REPRENDRE.md` n'est pas réécrit par cette petite mise à jour et peut encore
mentionner 259 : se reporter à `app/build.gradle` et à la présente note pour l'état
courant. La prochaine livraison devra être fondée sur le commit réellement publié
après application et validation de la v260.
