# v274 — Éditeur de sons : onde stéréo, zoom et sélection précise

## Base utilisée et état GitHub

La mise à jour part de la **v273**, commit
`8ecb824541ca601db46bbde7860fed0e8337fb1e`, intitulé
« v273 Graphisme : Focus mixage et reglages precis ».

L'envoi après l'incident réseau est confirmé. L'exécution APK **35631047588**,
numéro **270**, est terminée avec succès sur GitHub ; sa dernière mise à jour
indique le 21 septembre 2026 à 17:33:12 UTC. L'étape de compilation de l'APK,
les tests navigateur et les étapes de livraison ont réussi.
Cela concerne la **v273**, pas encore la v274.

La page v273 fournie a été comparée à son objet Git :
`dc234ff7498ca68db7191d312ec03dc0ffa2a9df`, identique.
Le correctif d'unisson de la v271, les repères Kaoss et le Focus mixage restent
présents. Aucune ancienne source de la page n'est remplacée dans ce lot.

## Pourquoi ce lot

L'éditeur de la bibliothèque dessinait seulement le premier canal du son,
sans pouvoir agrandir un détail. Les deux curseurs de sélection permettaient
les réglages existants, mais leur course sur toute la durée ne facilitait pas
un placement très fin sur téléphone.

Ce lot complète l'harmonisation des outils. Il ne redessine pas les façades
et n'ajoute pas de traitement sonore : il améliore la vue de l'éditeur et les
moyens d'utiliser ses bornes existantes.

## Utilisation

Ouvrir **BIBLIOTHÈQUE → SONS**, puis toucher **ÉDITER** sur un son chargé.

### Forme d'onde

Un son mono affiche une seule bande. Un son stéréo affiche **G** et **D**
séparément, avec leurs propres amplitudes. La sélection est éclairée et ses
bornes DÉBUT/FIN sont matérialisées lorsqu'elles sont dans la fenêtre visible.
Les repères de temps indiquent le début et la fin de cette fenêtre.

Pour un son de plus de deux canaux, l'aperçu montre uniquement les deux premiers
et l'annonce explicitement. Tous les canaux restent présents dans les données
et dans les traitements natifs.

L'onde représente **le tampon en cours d'édition**, après les transformations
éventuellement choisies. Ce n'est pas un VU-mètre de sortie, ni un curseur de
lecture, ni une illustration arbitraire.

### Zoom et déplacement de la vue

Les boutons − et + changent le grossissement, jusqu'à environ **×64** selon
la longueur du son. **TOUT VOIR** retrouve toute la durée ; **VOIR SÉLECTION**
recadre autour de la sélection actuelle. Le curseur DÉPLACER LA VUE permet de
parcourir un son agrandi.

Ces commandes ne changent **ni la sélection, ni les échantillons, ni la hauteur,
ni la durée sonore**. Elles ne créent pas d'entrée d'annulation et ne déclenchent
pas de sauvegarde. Quand toute la durée est visible, le panoramique de la vue
et le zoom arrière sont désactivés. Une sélection extrêmement courte n'est pas
agrandie au-delà de la limite de zoom.

Sur l'onde, glisser déplace toujours la borne la plus proche. La position est
maintenant calculée dans la fenêtre agrandie, et non sur toute la durée. Un seul
pointeur possède le geste à la fois ; sa sortie du canvas reste capturée, et
son annulation ou sa perte de capture termine correctement le geste.

### Bornes précises

DÉBUT et FIN ont chacun un champ en secondes, un affichage d'index en
échantillons et des boutons − / +. Trois pas sont disponibles :
**1 ÉCHANTILLON**, **1 ms**, **10 ms**.

Le pas temporel est arrondi à un nombre entier d'échantillons : à 44 100 Hz,
un cran de 1 ms vaut 44 échantillons ; à 48 000 Hz, il en vaut 48.
Les champs acceptent la virgule ou le point décimal et sont arrondis à l'index
le plus proche. Une saisie incorrecte est signalée à côté du champ et ne
modifie pas la sélection. Échap rétablit la valeur du champ.

La fin est **exclue**, comme dans l'éditeur natif : la portion gardée est
[début, fin[. Les bornes ne se croisent pas et conservent au moins deux
échantillons. Sur un son d'un seul échantillon, les curseurs de sélection
non exploitables sont désactivés.

Les curseurs natifs restent disponibles et pilotables au clavier. Les nouveaux
boutons/champs passent par leurs événements `input`, et non par un deuxième
système de sélection. Une valeur inchangée ne déclenche pas d'événement.
La fréquence affichée est exacte en hertz : 44 100 Hz n'est plus résumé à 44 kHz.

### Disposition et commandes existantes

Les boutons natifs **ÉCOUTER LA SÉLECTION**, **TOUT SÉLECTIONNER** et **ANNULER**
sont rapprochés de l'onde. Les traitements, le découpage et l'enregistrement
restent regroupés à leur suite, dans une carte distincte.

En portrait, les cartes défilent verticalement. En paysage à partir de
760 pixels de largeur, l'onde et les bornes se placent à gauche, les traitements
à droite. Les bandeaux deviennent plus compacts quand la hauteur est faible.
Il reste nécessaire de faire défiler les réglages : la page n'est pas réduite
en miniature pour tout faire entrer à l'écran.

Les commandes contrôlées font au moins **44 × 44 pixels CSS** dans les sept
formats testés ; ce n'est pas une mesure physique en millimètres sur le Samsung.

## Ce qui ne change pas

Les moteurs, les calculs de transformation du son, le routage, les séquences,
le transport, le MIDI, Freesound et les formats de projet/sauvegarde ne sont
pas modifiés. La mise à jour ne remplace aucun son personnel.

ROGNER, RETIRER, les fondus, NORMALISER, les gains, INVERSER, HAUTEUR, DÉCOUPER,
ANNULER, ENREGISTRER COMME NOUVEAU SON et REMPLACER L'ORIGINAL continuent d'utiliser
leurs fonctions natives, leurs confirmations et leurs protections.
Choisir délibérément un traitement ou enregistrer reste naturellement une
opération d'édition, comme auparavant.

L'écoute conserve notamment son minimum natif de **5 ms** pour une sélection
très courte. Le dessin et les transformations, eux, utilisent les indices de
sélection exacts. Ce lot ne change pas ce comportement audio.

## Fonctionnement et performance

- Les contrôles, boutons et canvas natifs sont déplacés dans les cartes, pas
  clonés. Leurs écouteurs et les confirmations des opérations sont conservés.
- Le renderer et les gestes de l'onde sont adaptés à la fenêtre affichée ; les
  wrappers d'interface transmettent les arguments et les résultats natifs.
- Les résumés min/max parcourent les vrais échantillons. Une impulsion isolée
  n'est pas sautée par un pas de sous-échantillonnage. Les signaux décalés par
  rapport à zéro conservent également leurs extrema.
- Le cache contient seulement deux flottants par bloc de 256 échantillons,
  sur deux canaux au plus. Pour le signal stéréo de 96 000 échantillons du test,
  le cache de pics occupe **6 000 octets**, hors objets de gestion.
- Le cache est invalidé lors d'un changement des tableaux de canaux, y compris
  lorsque la longueur et le nom du son restent identiques. Une longueur modifiée
  recadre la vue pour éviter les accès hors tampon.
- Le canvas tient compte de sa taille réelle ; sa densité de dessin est plafonnée
  à deux fois la taille CSS.
- Les mises à jour de dessin sont regroupées dans une seule demande de trame.
  **Pas de minuterie ni de boucle d'animation permanente.** Au repos, il n'y a
  plus de dessin. Masquer la bibliothèque ou l'application annule la demande
  éventuelle et libère le cache de pics ; le retour le reconstruit au besoin.
- Aucun analyseur, nœud audio, fichier image ou fichier de police n'est ajouté.

## Fichiers livrés — 10 fichiers seulement

| Fichier | Changement |
| --- | --- |
| `page/css/330-editeur-sons.css` | Cartes de l'atelier, dispositions portrait/paysage, commandes et champs lisibles. |
| `page/js/760-editeur-sons.js` | Onde mono/stéréo, pics exacts, cadrage, bornes précises et cycle de vie. |
| `page/ordre.txt` | Ajout des deux fragments après ceux du Focus mixage. |
| `app/src/main/assets/drm16.html` | Page assemblée incluant les deux fragments. |
| `outils/test-editeur-sons.py` | Test graphique et fonctionnel du nouvel atelier. |
| `.github/workflows/android.yml` | Ajout du test et du rapport `app/build/reports/editeur-sons.json`. |
| `app/build.gradle` | Version Android 274. |
| `bureau/src-tauri/Cargo.toml` | Version bureau 274.0.0. |
| `bureau/src-tauri/tauri.conf.json` | Version bureau 274.0.0. |
| `docs/CORRECTIONS_V274.md` | Ce compte rendu. |

## Vérifications effectuées

### Nouvel atelier

**447 vérifications réussies, 0 erreur** avec `--contenu`, dans les formats
320×568, 360×640, 393×851, 640×360, 760×400, 880×400 et 1024×768.

Les vérifications couvrent les dimensions, les noms accessibles, les champs,
les unités, les limites, la saisie incorrecte, le clavier, le déplacement réel
sur le canvas zoomé, la capture et l'annulation du pointeur, la rotation,
le mono/stéréo/multicanal, les sons très courts, l'invalidation du cache,
le repos et l'arrière-plan. Elles vérifient également l'identité des contrôles
natifs, les événements, les données non modifiées par le zoom, le rognage,
l'annulation et les arguments de démarrage de l'écoute native.

Le test compare les pics de 64 fenêtres à un calcul indépendant dans chaque
format, en plus des impulsions isolées et de l'indépendance gauche/droite.
Des captures portrait et paysage ont été examinées.

### Assemblage et syntaxe

Les deux nouvelles sources sont présentes une seule fois dans la page, juste
après les fragments déclarés dans le manifeste. Les retirer restitue **octet
pour octet** la page v273 dont le SHA Git a été vérifié. Le manifeste initial
est également contrôlé contre son SHA Git.

Les trois blocs JavaScript de la page assemblée passent `node --check`.
Le test Python, le YAML du workflow et la configuration JSON sont valides.
Aucun ancien contrôle n'est retiré ou désactivé dans le workflow.

Le contrôle complet `outils/assembler.py --verifier` reste exécuté sur GitHub,
avec toutes les sources du dépôt. Ici, la validation d'assemblage est celle de
l'ajout incrémental à la page de référence vérifiée, pas une compilation du dépôt
Android complet.

### Suites graphiques précédentes

Les **13 suites précédentes** ont été relancées et réussissent.

| Suite | Résultat du journal |
| --- | --- |
| `graphique` | 12 façades/formats contrôlés ; 0 erreur(s). |
| `facades` | 16 cas façade/format ; 0 erreur(s). |
| `eurorack-focus` | 4 formats et 412 ouvertures catalogue ; 0 erreur(s). |
| `menu-machines` | 5 formats, 359 vérifications, 0 erreur(s). |
| `outils-studio` | 6 formats, 1086 vérifications, 0 erreur(s). |
| `retours-musicaux` | 158 vérifications ; 0 erreur(s). |
| `gestes-musicaux` | 298 vérifications ; 0 erreur(s). |
| `automations-machines` | 1164 vérifications ; 50 façades/formats ; 0 erreur(s). |
| `ecrans-performance` | Écrans de performance : 949 vérifications, 0 erreurs. |
| `onde-smpltrek` | 537 vérifications ; 0 erreur(s). |
| `retours-frappe` | 725 vérifications ; 0 erreur(s). |
| `reperes-kaoss` | 750 vérifications ; 0 erreur(s). 900 réglages ; 2500 comparaisons numériques. |
| `focus-mixage` | 1365 vérifications ; 0 erreur(s). |

### Limites des essais

Essais dans Chromium du conteneur, page chargée en mémoire et stockage temporaire
simulé (`--contenu`). Aucune donnée réelle du téléphone n'est utilisée.
La tentative en navigation `file://` est bloquée par l'environnement avec
`ERR_BLOCKED_BY_ADMINISTRATOR` avant le chargement de l'application ; ce mode
n'est donc pas validé ici. Le test garde le mode fichier normal pour GitHub.

Ces vérifications ne remplacent ni la compilation Gradle/APK, ni une vérification
au doigt sur le Samsung. Aucune compilation Android ou Windows de la **v274**
n'a été exécutée ici ; la compilation et l'essai sur téléphone restent à faire.
Le succès GitHub cité au début de ce document est celui de la **v273**.

## Livraison

Archive `drm16_android_v274.zip`, dossier racine `drm16_android/`, uniquement les
fichiers nouveaux ou modifiés. Appliquer sur la v273 avec le script habituel.
Ce n'est pas un export complet du projet.
