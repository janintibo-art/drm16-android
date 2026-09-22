# DRM16 — v275 — Afficher les machines depuis la table de mixage

## Symptôme corrigé

Sur PC, le parcours MENU → OUTILS → TABLE DE MIXAGE → VOIR LES MACHINES
annonçait « 5 MACHINES À L'ÉCRAN », mais laissait le menu visible, sans les
façades sélectionnées. Le correctif concerne la vue d'ensemble commune à la
version Windows, à l'APK et à la page pour navigateur.

Base de travail : v274, commit GitHub
`80b8ae28646d5e57bf77b9f10a6b9f50c2cb7daa`. L'assemblage HTML de l'archive
v274 a été comparé à l'empreinte Git du fichier du dépôt : correspondance
exacte (`6d1fefb5e5bf0706a1452e1329f18026bac2972d`). Le fichier source de la
transition vers cette vue a également été vérifié par son empreinte Git.

## Causes

1. `ouvrirEnsemble()` fermait la table, mais pas le menu depuis lequel elle
   avait été ouverte. Le menu restait donc au-dessus des machines.
2. La vue effaçait les classes du mode solo en supposant que cela rendrait
   toutes les façades visibles. En réalité, les feuilles de style des
   machines les masquent par défaut. Retirer les classes ne les affichait
   pas : il fallait une règle explicite pour les façades sélectionnées.
3. La scène ne disposait pas d'une zone de défilement correctement bornée
   dans la fenêtre. Les tailles et transformations du mode solo pouvaient
   aussi être réappliquées lors d'un redimensionnement.
4. Certaines machines construisent leurs boutons à leur première ouverture
   individuelle. Afficher leur cadre sans cette préparation donnait une
   façade partiellement vide : notamment les instruments et potards de la
   TR, les pads du PO-33 et les pads/pistes du SmplTrek.

Le défaut initial a été reproduit dans Chromium à partir de l'assemblage
v274, en cliquant réellement dans le menu et la table. Le test n'efface pas
le menu à la place de l'application.

## Changements

### Transition et commandes existantes

`page/js/210-transfert-vers-une-vraie-volca-sample.js`

- Ferme explicitement le menu lors de l'entrée dans la vue d'ensemble.
- Conserve le refus d'une sélection vide, avec la table toujours ouverte.
- Prépare les commandes natives manquantes de TR, PO-33, SmplTrek et MC-101.
  Les façades déjà construites ne sont pas reconstruites. La TR charge son
  état par son chargeur habituel seulement si aucun motif n'est encore en
  mémoire vive. Aucun appel aux fonctions d'activation de machine ou à STOP
  n'est ajouté par cette préparation.
- Remet le défilement de la scène en haut à gauche à l'ouverture.
- Rend le focus au bouton visible « REVENIR À LA TABLE ».
- Remplace le message ambigu par « N MACHINES DANS LA VUE », avec le
  singulier lorsque seule une machine est sélectionnée. Ce compteur
  représente les machines présentes dans la scène, pas la promesse qu'elles
  tiennent toutes simultanément dans la fenêtre.

`page/js/220-mise-a-l-echelle.js`

- `fit()` ne réapplique plus le zoom de la dernière machine solo lorsque la
  vue d'ensemble est active. Le redimensionnement solo reprend normalement
  après la sortie.

### Présentation de la scène

`page/css/340-vue-ensemble.css` — nouveau fichier.

- Toutes les règles sont limitées à `body.ensemble`.
- Affiche explicitement les façades choisies et masque les autres.
- Dispose les machines côte à côte lorsque la largeur le permet, puis sur
  les lignes suivantes. Les commandes restent à leur taille naturelle.
- Réserve une zone défilante horizontalement et verticalement entre les
  commandes du haut et le bouton de retour. Les grandes façades ne sont pas
  réduites en miniatures pour tenter de tout faire tenir sur téléphone.
- Évite de conserver les limites de hauteur et transformations du mode solo.
- Préserve une hauteur utilisable pour le pavé Kaoss.
- Rend la barre de défilement de cette scène visible lorsqu'elle est
  nécessaire. Le retour à la table reste hors de cette zone défilante.

Les éléments DOM existants sont réutilisés : aucune copie de machine,
aucun doublon de boutons ni remplacement des gestionnaires des commandes.

### Intégration et version

- `page/ordre.txt` : ajoute la nouvelle feuille de style après celle de
  l'éditeur de sons.
- `app/src/main/assets/drm16.html` : assemblage actualisé. La substitution
  inverse des trois fragments modifiés restitue exactement l'assemblage
  v274 ; les autres fragments sont inchangés.
- `.github/workflows/android.yml` : ajoute le nouveau test navigateur et
  son rapport `app/build/reports/vue-ensemble.json` au workflow existant.
- `app/build.gradle` : version Android 275.
- `bureau/src-tauri/Cargo.toml` et `bureau/src-tauri/tauri.conf.json` :
  version Windows 275.0.0.
- `outils/test-vue-ensemble.py` : nouveau test de non-régression.
- `docs/CORRECTIONS_V275.md` : le présent document.

Total de la livraison : **11 fichiers**, sous la racine `drm16_android/`.

## Vérifications effectuées

### Parcours dédié

**480 vérifications, 0 erreur**, dans sept formats :

- PC à la souris : 1180×860, 1440×900, 1920×1080 et 2560×1440.
- Petits écrans : 393×851, 880×400 et 360×640.

Le parcours couvre la sélection vide, cinq machines, Kaoss seul, les
21 façades, le défilement jusqu'à chacune, le redimensionnement, le retour à
la table, la sortie par MENU et le retour au mode solo de la machine
précédente. Il contrôle également la construction des pads/pistes manquants,
un vrai clic sur un pad PO-33, le réglage clavier de son curseur SWING,
l'absence de clones et les erreurs JavaScript.

Le test vérifie que l'entrée dans la vue ne change pas les valeurs de la
table, ses sélections, le modèle solo mémorisé, le tempo ni l'indicateur de
transport. Cela ne constitue pas une mesure du rendu audio de toutes les
machines jouées ensemble.

### Contre-test sur la v274

Le même parcours dirigé vers le HTML v274 échoue sur les deux points
attendus : le menu n'est pas réellement fermé et les cinq façades ne sont
pas réellement affichées. Il ne suffit donc plus d'afficher le message de
confirmation pour que le contrôle passe.

### Contrôles de source

- Vérification syntaxique JavaScript des deux fichiers modifiés.
- Compilation syntaxique du nouveau test Python.
- Analyse syntaxique de la nouvelle feuille de style.
- Présence unique de chaque fragment modifié dans le HTML et vérification
  de l'ordre CSS.
- Comparaison inverse avec le HTML v274 vérifié, pour contrôler que les
  autres fragments de l'application n'ont pas été altérés.

### Suites complémentaires relancées sur la version finale

| Suite | Contrôles | Erreurs |
| --- | ---: | ---: |
| Confort mobile | 12 cas façade/format | 0 |
| Matières et commandes des façades | 16 cas façade/format | 0 |
| Menu des machines et outils | 359 vérifications | 0 |
| Focus de la table de mixage | 1 365 vérifications | 0 |

Ces suites et les 480 contrôles de la vue d'ensemble ont été exécutés sur
l'assemblage final livré, y compris la préparation des commandes manquantes.
Il ne s'agit pas d'un compte rendu de compilation Android ou Windows.

## Ce qui n'est pas changé et limites de ces essais

Aucun traitement de synthèse, calcul de mixage, réglage des protections
sonores, format de sauvegarde, pont MIDI ou accès Freesound n'est modifié.
Aucun fichier de sons personnels n'est inclus ni supprimé. Les chemins et
l'identifiant d'application Windows sont conservés.

Les essais ont été faits dans Chromium, avec la page chargée en mémoire et
un stockage temporaire simulé et isolé. Ils ne sont pas une compilation ni
un essai de l'exécutable Windows installé, de WebView2 ou de l'APK. La
compilation sur GitHub et l'essai sur les appareils restent nécessaires.
Les éléments qui ne sont pas visibles en même temps dans la fenêtre se
retrouvent en faisant défiler la scène.

## Appliquer le correctif et obtenir le nouvel installateur Windows

L'archive est un correctif de sources, **pas un installateur Windows**. Le
script habituel `mise-a-jour.sh` applique le ZIP, crée le commit et envoie
les fichiers dans le dépôt. La compilation APK part au push.

Pour corriger l'application déjà installée sur le PC, il faut ensuite
fabriquer et installer la version Windows mise à jour :

1. Une fois la v275 envoyée et les contrôles réussis, ouvrir GitHub → Actions
   → **Exécutable Windows**.
2. Lancer **Run workflow** sur la branche **main**. Il s'agit d'une nouvelle
   exécution ; relancer simplement un ancien run ne choisit pas la nouvelle
   version des sources.
3. À la réussite, télécharger l'artefact **drm16-windows**, extraire son ZIP
   et lancer **DRM16-installeur.exe** sur le PC.

Le workflow Windows existant reste à la demande ; il n'est pas remplacé ni
rendu automatique par cette correction. L'artefact **drm16-pc-complet** est
toujours la version pour navigateur, pas l'installateur.

À vérifier sur PC : MENU → OUTILS → TABLE DE MIXAGE, choisir cinq voies puis
VOIR LES MACHINES. Le menu doit disparaître, les façades choisies doivent
être présentes dans la scène et REVENIR À LA TABLE doit rester accessible.
