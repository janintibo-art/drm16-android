# DRM16 v279 — Eurorack : DRUM 32 et deux montages avancés

Base : v278, commit GitHub `b5aef53fb89101383317775d4c4313342b56f39f`.
Versions : Android 279 ; Windows 279.0.0.

## 1. Ce lot

Un nouveau séquenceur de batterie **DRUM 32**, accompagné de deux montages
complets. Le catalogue passe de 103 à 104 types de modules et de 32 à 34
montages. Les anciens modules et les anciens montages restent disponibles.
Le correctif Windows v278 et le déclenchement automatique de sa compilation
sont conservés : ce lot ne modifie ni `windows.yml`, ni les commandes MIDI
natives, ni le lanceur d'essai Windows.

Le TRIG 4 existant fait tourner quatre motifs fixes en décalant leurs pas.
DRUM 32 est un module distinct : chacune de ses 128 cases est programmable.
Il ne remplace ni TRIG 4 ni les séquenceurs de notes existants.

## 2. Prise en main

### Essayer un montage complet

Ouvrir **EURORACK → RACK ▾ → MONTAGES → AVANCÉS**, choisir un montage,
puis appuyer sur **START**.

- **TECHNO 32 · VARIATIONS — 128 BPM** : kick, caisse claire, charley,
  percussion additionnelle, basse et mélodie. Des roulements concluent les
  deux mesures. La quatrième percussion suit un cycle de 24 pas avec une
  probabilité de 75 % ; son écho et le mouvement stéréo de la mélodie apportent
  des variations.
- **TRIBAL 32 · CYCLES — 150 BPM** : quatre pistes de batterie aux longueurs
  respectives de 32, 15, 16 et 7 pas, basse rapide, mélodie, percussion en écho
  et modulation lente du panoramique mélodique.

Chaque montage comporte **26 modules et 34 câbles**. Une seule horloge les
synchronise ; il s'agit de synthèse et de modules câblés, pas de boucles audio
préenregistrées. Les deux SEQ 16 restent les commandes des notes de basse et
de mélodie. Le mixeur de batterie reçoit A = kick, B = caisse/tom, C = charley,
D = percussion avec écho. Le mixeur général conserve A = batterie, B = basse,
C = mélodie.

Le chargement remplace le rack sélectionné, après la confirmation existante
s'il contient déjà des modules. Les sept autres emplacements ne sont pas
remplacés. Sauvegarder son montage ou choisir un emplacement vide avant
l'essai. Annuler la confirmation ne change pas le rack courant.

### Programmer DRUM 32

On peut aussi l'ajouter depuis **MODULES → SÉQUENCEURS → DRUM 32**.
Sur sa façade, toucher l'une des quatre lignes ouvre son édition en **FOCUS**.

1. Choisir la piste A, B, C ou D.
2. Choisir la page **PAS 1–16** ou **PAS 17–32**.
3. Choisir **FRAPPES PAR PAS** : 1 coup, ×2, ×3 ou ×4.
4. Toucher une case pour y poser ce nombre de coups. Toucher à nouveau une
   case portant la même valeur la remet en silence.
5. Régler séparément la longueur, le décalage, la probabilité ou la coupure
   de cette piste.

Les pas au-delà de la longueur sont estompés mais restent mémorisés. Agrandir
à nouveau la longueur les retrouve. Le décalage change le point de lecture,
pas le contenu des cases. Une piste muette continue d'avancer pour revenir
au même endroit rythmique lorsqu'on la réactive.

**COPIER CETTE PAGE** copie ses seize pas sur l'autre page de la même piste,
après confirmation. **VIDER LA PISTE** efface ses 32 cases, après confirmation,
sans toucher aux trois autres pistes. Les autres réglages ne sont pas effacés.

Les prises natives restent disponibles en bas du Focus : **CLK** avance les
quatre pistes, **RST** les remet au début, les sorties **A–D** déclenchent
les instruments raccordés. Le module ne produit pas de son à lui seul.

## 3. Précisions de fonctionnement

### Temps et roulements

Un pas stocke un nombre entier de 0 à 4, pas une vélocité. Les répétitions
subdivisent le temps entre deux impulsions. Une probabilité est tirée une
seule fois par pas actif : l'ensemble de ses répétitions passe ou est retiré.
À 0 % et 100 %, aucun tirage n'est consommé. Un silence ne consomme pas de
hasard. Les anciens séquenceurs ne sont pas modifiés.

Les impulsions sortantes sont programmées sur l'horloge audio et transmises
au système de câbles existant avec leurs dates. Aucun temporisateur de
l'interface ne pilote les frappes. Au premier CLK, le module utilise la durée
d'une double croche au tempo global ; ensuite, il utilise l'intervalle entre
les deux dernières impulsions reçues. Une nouvelle division ou un changement
brusque de vitesse ne peut donc pas être prédit dès le premier pas. Pour les
montages fournis, CLK reste régulier. Les impulsions à la même date ou en
arrière sont ignorées pour éviter une cascade dans un câblage en boucle.

STOP annule les portes du module, remet ses compteurs à zéro et retire ses
repères de lecture. Ce nettoyage est aussi effectué lorsque le rack est une
machine secondaire dans la table de mixage. Les sons déjà déclenchés gardent
les comportements d'arrêt des instruments existants : DRUM 32 n'ajoute pas
un nouveau coupe-son général.

### Affichage et sauvegarde

La façade miniature donne un aperçu des quatre pistes. Le Focus fournit une
édition adaptée à l'écran : seize cases par page, toutes les pistes restent
accessibles. Les boutons conservent des cibles d'au moins 44 × 44 pixels dans
les sept formats testés. La zone du Focus revient en haut à son ouverture.
Les prises et commandes de transport natives ne sont pas dupliquées.

Le pas lumineux suit le temps audio et non l'avance de programmation. Une
seule boucle graphique est utilisée pour les vues visibles ; elle se met au
repos lorsque l'application est masquée ou la lecture arrêtée. L'historique
graphique est borné à 128 pas et n'est pas accumulé dans les rendus hors ligne.

Les 144 paramètres numériques sont stockés dans le même `m.p` que les autres
modules. Les huit racks et les projets utilisent leurs mécanismes de
sauvegarde existants. Les nouveaux montages contenant DRUM 32 nécessitent
**v279 ou ultérieure** pour retrouver ce module ; aucune compatibilité de ce
nouveau module avec un ancien exécutable n'est annoncée.

## 4. Fichiers livrés (20)

| Fichier | Changement |
| --- | --- |
| `page/js/453-drum32-eurorack.js` | Nouveau moteur de séquenceur, paramètres et interfaces mini/Focus. |
| `page/css/360-drum32-eurorack.css` | Habillage et adaptation aux écrans du nouveau module. |
| `page/js/454-montages-drum32.js` | Deux nouveaux montages, obtenus par copie des modèles existants sans les modifier. |
| `page/js/440-percussions.js` | Raccordements génériques pour une interface de module personnalisée et son arrêt facultatif. |
| `page/js/455-eurorack-focus.js` | Accueil de l'éditeur personnalisé ; nettoyage de ses vues ; retour en haut du panneau. |
| `page/js/130-decalage-humain.js` | Nettoyage Eurorack à STOP, également comme machine secondaire dans un SET. |
| `page/js/450-montages-tout-faits.js` | Présentation et chargement de la famille AVANCÉS avec les protections existantes. |
| `page/html/460-note-eur.html` | Notice DRUM 32 intégrée ; compte du catalogue et descriptions du rack actualisés. |
| `page/ordre.txt` | Ajout des trois nouvelles sources dans l'ordre d'assemblage. |
| `app/src/main/assets/drm16.html` | Page assemblée contenant les sources nouvelles et modifiées. |
| `outils/test-drum32.cjs` | 24 scénarios déterministes du séquenceur et de ses impulsions. |
| `outils/test-drum32.py` | Tests réels d'interface Chromium et rendus audio hors ligne des deux montages. |
| `outils/test-eurorack-focus.py` | 104 modules contrôlés ; contrôle spécifique de l'éditeur plutôt que de 144 faux potards. |
| `outils/test-ensembles-eurorack.py` | Compte de catalogue adapté sans retirer les essais des huit ensembles précédents. |
| `outils/controles.sh` | Nouveau test Node dans les contrôles avant compilation. |
| `.github/workflows/android.yml` | Nouveau test navigateur et rapport JSON joint en cas d'échec. |
| `app/build.gradle` | Version Android 279. |
| `bureau/src-tauri/Cargo.toml` | Version Windows 279.0.0. |
| `bureau/src-tauri/tauri.conf.json` | Version Windows 279.0.0. |
| `docs/CORRECTIONS_V279.md` | Ce récapitulatif. |

## 5. Vérifications effectuées

Dans l'environnement de préparation :

- DRUM 32 sous Node : **24 scénarios, 3 687 assertions, zéro erreur**.
  Longueurs 1–32, indépendance des pistes et instances, répétitions et dates,
  probabilités, décalages, silence, MUTE, RST, STOP, reconstruction,
  valeurs invalides, historique borné et conservation des paramètres.
- Interface dans Chromium : **322 vérifications, zéro erreur**, aux formats
  320×568, 360×640, 393×851, 640×360, 880×400, 1280×800 et 1920×1080.
  Appuis réels, pages, confirmations, paramètres conservés, sauvegarde et
  rechargement des racks, câblage Focus, arrêt dans un SET et anciens montages.
- Audio : **quatre rendus hors ligne de huit mesures**, soit chacun des deux
  montages à 44,1 et 48 kHz. Vérification des quatre sorties de déclenchement,
  de la batterie, de la basse, de la mélodie et du mélange. Les fronts mesurés
  correspondent aux dates programmées à deux échantillons près ; toutes les
  répétitions attendues parviennent aux percussions. Les échantillons sont
  finis, les voix non muettes, le pic du mélange est inférieur à 1 sur ces
  signaux d'essai. Ce n'est ni une écoute humaine ni une garantie de marge
  pour tous les réglages que l'utilisateur pourra appliquer.
- Régression Focus Eurorack : **416 ouvertures du catalogue**, soit les
  104 types dans quatre formats, zéro erreur.
- Régression des huit ensembles v276 : **724 vérifications**, rendus audio
  compris, zéro erreur.
- Confort mobile : **12 cas**, zéro erreur.
- Matières/façades : **16 cas**, zéro erreur.
- Vue multimachines : **480 vérifications**, zéro erreur.
- Focus mixage : **1 365 vérifications**, zéro erreur.
- Autotest MIDI de la v278 : **35 scénarios simulés**, tous réussis ; le
  contrôle source et celui de la page assemblée concordent.

Les essais navigateur utilisent une page chargée en mémoire et un stockage
temporaire simulé, sans les sons ni les données personnelles de l'utilisateur.
Les vérifications d'interface ne remplacent pas un essai sur le Samsung ou
l'application Windows installée. Aucun matériel MIDI externe n'a été utilisé.

**Pas de compilation APK ou Windows effectuée dans cet environnement.**
Les étapes natives, l'assemblage complet depuis le dépôt, les tests restants
et les essais Windows réels seront exécutés par GitHub après l'envoi.
Le résultat du build v278 en cours n'est pas préjugé par ce lot.

## 6. Non modifié et suite

Aucun changement aux recettes sonores des 103 anciens modules, aux sons
personnels, aux commandes MIDI natives, à Freesound ou aux formats de projet.
La fabrication Windows reste automatique à chaque mise à jour. Le ZIP est
une mise à jour des sources, pas un installateur : après compilation verte,
l'archive `drm16-windows` fournit le nouvel `DRM16-installeur.exe`.

La suite prévue concerne l'édition mélodique plus évoluée (notes, silences,
variations), puis d'autres montages complets. Ces évolutions ne sont pas
incluses dans la v279 et seront traitées dans des lots séparés.
