# v290 — FREEZE GRANULAIRE : capturer un son et le transformer

Base vérifiée : v289 (116 modules, 60 montages).
Livraison : un correctif incrémental à appliquer sur la v289, sous `drm16_android/`.
La page de la version Android est aussi la source préparée pour l'exécutable Windows.

## Un nouveau module, aucun ancien remplacé

Le module GRAIN (dans TRAITEMENTS, inchangé) approche une texture granulaire avec
un délai dont le temps saute sans cesse : ce n'est pas un vrai lecteur de petits
fragments sonores. **FREEZE GRANULAIRE** en est un : il capture réellement le
signal reçu sur IN, puis en rejoue de petits grains à une position, une taille et
une hauteur choisies.

**CAPTURE** (0,2 à 4 s) fixe la durée figée à chaque impulsion sur **CAPTURER**.
Chaque impulsion sur **GRAIN** rejoue ensuite un fragment du tampon (**TAILLE**,
10 à 300 ms) : **POSITION** choisit où dans ce tampon, **SPRAY** disperse ce point
au hasard, **HAUTEUR** transpose jusqu'à deux octaves, **NIVEAU** règle le volume.
**RST** vide le tampon : GRAIN ne rejoue plus rien tant qu'une nouvelle capture
n'a pas abouti.

CAPTURER et GRAIN sont des entrées de porte, au même titre que TRIG sur une
percussion : elles ne réagissent qu'aux instants transmis par l'horloge, un
diviseur ou un générateur euclidien qu'on y branche — donc à la résolution du pas
global. Brancher une source rapide sur GRAIN donne un nuage plus dense ; il n'y a
pas de nuage continu plus fin que cette grille.

### Une capture sans MediaRecorder ni AudioWorklet

La capture écrit directement dans un `AudioBuffer` via un `ScriptProcessorNode`,
échantillon par échantillon, aux instants exacts de `ev.playbackTime`. Un
`MediaRecorder` est asynchrone et n'existe pas dans un rendu `OfflineAudioContext`
(un export WAV ou un « figer une machine » qui traverserait un rack avec ce
module doit rester correct) ; un `AudioWorklet` demande un fichier séparé,
fragile dans la WebView Android — la même leçon déjà tirée pour le limiteur à
anticipation (voir REPRENDRE.md, B3).

Un piège du même genre que celui du KAOSS PAD en v259 : `scheduleEur` appelle
`recevoir()` **à l'avance**, avant que le moteur audio ait réellement rendu
l'instant demandé — c'est le principe même du calcul en avance, et c'est encore
plus visible dans un rendu hors ligne, où rien n'a encore joué au moment où tous
les événements sont programmés. La décision de jouer un grain se fonde donc
uniquement sur les instants **programmés** (l'instant du grain doit être au moins
celui de la fin de la capture programmée), jamais sur un indicateur mis à jour
par le vrai traitement audio — sans quoi un grain demandé juste après une capture
la refuserait à tort, en direct comme hors ligne. Trouvé et corrigé pendant la
validation de ce lot (voir « Validation effectuée »).

## Trois montages

| Montage | Tempo | Description |
|---|---:|---|
| PSY · CORDES SUSPENDUES | 145 | Une corde pincée continue sa phrase pendant qu'une commande PERFORMANCE la transforme en nappe granulaire flottante, kick et basse psy dessous. |
| JUNGLE · NUAGE DE VOIX | 172 | Une anche imite une voix nasale, capturée puis dispersée en grains, au-dessus d'un roulement de batterie jungle. |
| DUB · MÉMOIRE DES ANCHES | 78 | Une phrase d'anche est capturée puis reparaît par bribes éparses, comme un souvenir, sous un rythme dub clairsemé, écho à seaux et ressort. |

Chacun affecte une des huit commandes PERFORMANCE à faire glisser le mélange de
la phrase reconnaissable vers sa version granulaire (ex. « CORDE → NUAGE »),
plus la taille des grains, la position, le spray, la hauteur et les échos/la
réverbération. MÉMORISER puis REVENIR fonctionnent normalement dessus.

Accès : **EURORACK → RACK ▾ → MONTAGES → TEXTURES**. Le module se trouve sous
**TRAITEMENTS** dans le catalogue.

## Compatibilité et préservation

Comparaison du catalogue avant/après : les **116 anciens modules et 60 anciens
montages restent identiques**. Total après ajout : **117 modules et 63
montages**. Les versions Android/Windows deviennent 290 et 290.0.0. Les huit
racks, les projets .drm16 et les affectations PERFORMANCE réutilisent leurs
formats existants. Aucun fichier sonore personnel, réglage MIDI natif ou accès
Freesound n'est modifié.

## Validation effectuée

- Nouveau test Node (`outils/test-freeze-granulaire.cjs`) : **11 scénarios,
  115 assertions**, sans erreur. Catalogue, jacks, `valeurs`/`normaliser`
  (NaN, infinis, hors bornes), `grainOffset` pur, GRAIN refusé avant toute
  capture, capture puis grain effectivement programmé et borné à sa durée, RST,
  recapture qui remplace l'ancienne fenêtre, HAUTEUR/NIVEAU appliqués au bon
  grain, destruction qui coupe le `ScriptProcessorNode`.
- Nouveau test navigateur (`outils/test-freeze-granulaire.py`) : **22
  vérifications**, sans erreur, dont trois formats d'écran, catalogue exact,
  jacks/réglages du module, structure des trois montages (types de modules
  valides, câbles dans les rangs, une commande PERFORMANCE sur huit affectée),
  et un **vrai rendu `OfflineAudioContext`** à 44,1 / 48 / 96 kHz : silence
  avant et après le grain, enveloppe d'attaque/chute exacte comparée
  échantillon par échantillon à la formule programmée. C'est ce rendu qui a
  révélé le piège décrit plus haut (recevoir appelé en avance) ; corrigé avant
  cette livraison.
- `bash outils/controles.sh` : façades, assemblage exact des 234 sources,
  identifiants HTML uniques, syntaxe JavaScript, compilation Java de contrôle,
  tests Java et Rust historiques — **tous passés**.
- **Deux passages complets de `outils/test-navigateur.py`** (25 machines,
  trois formats d'écran) : **0 FAUX** les deux fois.
- Treize anciens tests de catalogue Eurorack mis à jour (116→117 modules,
  60→63 montages) : aucune assertion historique désactivée, seuls les nombres
  attendus sont actualisés.

Environnement : Chromium sous Linux, Node, page chargée en mémoire. La
compilation Gradle Android, la compilation Tauri Windows/WebView2 et les
essais d'écoute/performance sur le téléphone restent à valider après l'envoi.
La totalité de `controles.sh` n'est pas exécutée localement : elle inclut aussi
les contrôles natifs Java/Rust et d'autres outils du dépôt, exécutés par
GitHub. Le nouveau test navigateur est ajouté au workflow Android ; le test
Node aux contrôles partagés avec Windows.

## Fichiers livrés (28)

- `page/js/479e-freeze-granulaire.js` : le nouveau module.
- `page/js/479f-montages-freeze.js` : les trois montages et leurs macros.
- `page/html/460-note-eur.html` : notice intégrée.
- `page/html/470-note-eurmod.html` : fiche du module dans le catalogue.
- `page/ordre.txt` et `app/src/main/assets/drm16.html` : sources et résultat assemblé.
- `outils/test-freeze-granulaire.cjs` et `.py` : nouveaux contrôles.
- `outils/controles.sh` et `.github/workflows/android.yml` : exécution dans GitHub.
- Treize fichiers de tests historiques : compteurs de catalogue mis à jour uniquement
  (`test-ensembles-eurorack.py`, `test-scenes8.py`, `test-break32-bibliotheque.py`,
  `test-eurorack-focus.py`, `test-variations-rythmiques.py`, `test-melo32.py`,
  `test-performance-eurorack.py`, `test-atelier-kick-basse.py`, `test-rave.py`,
  `test-drum32.py`, `test-harmonie8.py`, `test-couleurs-eurorack.py`,
  `test-stutter-live.py`).
- Trois fichiers de version, `REPRENDRE.md`, et les deux documents de ce lot.
