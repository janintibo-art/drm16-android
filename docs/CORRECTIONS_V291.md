# v291 — CYCLES LIBRES : sortir du 4/4 sans changer le transport

Base vérifiée : v290 (117 modules, 63 montages).
Livraison : un correctif incrémental à appliquer sur la v290, sous `drm16_android/`.
La page de la version Android est aussi la source préparée pour l'exécutable Windows.

## Un réglage partagé, pas un nouveau module

**CYCLES LIBRES** ajoute un réglage **PAS/MESURE**, commun à **SCÈNES 8**,
**HARMONIE 8** et au **FILL** automatique de **DRUM 32 / BREAK 32** (voir
« Variations de batterie A/B et FILL »), pour choisir 7/8 (14 pas), 9/8
(18 pas), 5/4 (20 pas) ou un compte libre de 4 à 32, au lieu des 16
impulsions CLK par mesure toujours utilisées jusqu'ici.

La grille d'horloge de l'application reste le **seizième de note partout** :
CYCLES LIBRES ne change ni le tempo ni la résolution des impulsions CLK,
seulement le **nombre d'entre elles qui composent une mesure**, module par
module. Les trois modules partagent le même choix de valeurs ; régler le
même PAS/MESURE sur chacun d'entre eux dans un rack fait suivre les
changements de scène et les fills au même cycle.

Par défaut 16 (4/4), donc **aucun ancien montage ni projet .drm16 ne
change** : les 117 modules et 63 montages restent identiques, y compris le
7/8 d'Inde/Balkans/dabké (v289) qui imitait déjà un cycle impair à la main,
sans SCÈNES 8, en donnant à chaque séquenceur une longueur de motif réelle
de 14 pas. CYCLES LIBRES ne remplace pas cette approche : il ouvre la même
possibilité à SCÈNES 8, HARMONIE 8 et aux fills, sans réécrire de motifs.

### Pourquoi ce n'est pas le transport global qui change

Le compteur de pas partagé (`130-decalage-humain.js`) et sa résolution
(`stepDur()`, un seizième de note) sont **inchangés** : ni l'un ni l'autre
n'est touché par ce lot. SCÈNES 8, HARMONIE 8 et le FILL comptent chacun,
de leur côté, les impulsions CLK qu'ils reçoivent sur leur propre entrée —
ils ne lisent jamais le compteur de pas global. Le « 16 » qui bornait cette
comptabilité interne (`d.pas%16===0`) devient un réglage `PAS/MESURE`, avec
16 pour valeur par défaut : la mécanique de propagation des impulsions
(`scheduleEur`, un pur câblage JavaScript rejoué à chaque pas programmé)
n'est pas modifiée non plus. C'est ce qui rend ce lot beaucoup moins risqué
qu'une modification du transport lui-même : aucun des treize+ montages et
fichiers de test Eurorack existants ne suppose plus rien sur ce compteur
partagé — chacun continue de tourner exactement comme avant.

### Où le régler

- **SCÈNES 8** : PAS PAR MESURE (CYCLES LIBRES), dans le panneau d'édition,
  à côté de SCÈNES DANS LA BOUCLE.
- **HARMONIE 8** : PAS/MESURE, à côté de SUIVI DE L'ENTRÉE ; sans effet en
  mode SCÈNES (SUIVI = 1), qui avance à chaque impulsion.
- **DRUM 32 / BREAK 32** : PAS PAR MESURE (CYCLES LIBRES), dans PRÉPARER B /
  RÉGLER LES FILLS, à côté de FILL AUTOMATIQUE ; n'existe qu'une fois une
  phrase B préparée (comme FILL AUTOMATIQUE et les verrous).

## Compatibilité et préservation

Comparaison du catalogue avant/après : les **117 modules et 63 montages
restent identiques**. Les versions Android/Windows deviennent 291 et
291.0.0. Les huit racks, les projets .drm16 et les affectations PERFORMANCE
réutilisent leurs formats existants ; un projet sans PAS/MESURE enregistré
lit 16 par défaut. Aucun fichier sonore personnel, réglage MIDI natif ou
accès Freesound n'est modifié.

## Validation effectuée

- Trois fichiers Node mis à jour (`test-scenes8.cjs` : 34 scénarios,
  `test-harmonie8.cjs` : 30 scénarios, `test-variations-rythmiques.cjs` :
  36 scénarios), avec les nouveaux réglages chargés depuis la page
  assemblée (comme `eurPorte`) : comptages de réglages actualisés (51→52,
  39→40) et scénarios dédiés CYCLES LIBRES (7/8, 9/8, 5/4, compte libre,
  bornage, ignoré en mode SUIVI, fill suivant PAS/MESURE, refus sans
  variation B) — **tous passés**.
- Nouveau test navigateur (`outils/test-cycles-libres.py`) : **34
  vérifications**, sans erreur, dont trois formats d'écran, catalogue
  inchangé (117/63), `EUR_CYCLE` (presets, bornage 4–32, défaut 16),
  réglage PAS/MESURE présent sur SCÈNES 8 et HARMONIE 8, fonction exposée
  pour les fills, puis une **vraie intégration** en `OfflineAudioContext`
  vérifiant, pour 4/4, 7/8, 9/8, 5/4 et un compte libre (11 pas), que la
  mesure/l'accord/le fill basculent exactement au bon nombre de CLK, ni
  avant ni après.
- Deux tests navigateur existants ajustés après ajout du réglage :
  `test-harmonie8.py` (dix champs → onze dans l'éditeur d'accord).
- `bash outils/controles.sh` : façades, assemblage exact des 235 sources,
  identifiants HTML uniques, syntaxe JavaScript, compilation Java de
  contrôle, tests Java et Rust historiques — **tous passés**.
- **Deux passages complets de `outils/test-navigateur.py`** (25 machines,
  trois formats d'écran) : **0 FAUX** les deux fois.
- Tests navigateur existants dédiés relancés en entier après le
  changement : `test-scenes8.py` (726 vérifications), `test-harmonie8.py`
  (591), `test-variations-rythmiques.py` (272) — **tous à 0 erreur**, y
  compris leurs rendus `OfflineAudioContext` réels des montages existants,
  qui confirment le comportement par défaut (16 pas) inchangé.

Environnement : Chromium sous Linux, Node, page chargée en mémoire. La
compilation Gradle Android, la compilation Tauri Windows/WebView2 et les
essais d'écoute/performance sur le téléphone restent à valider après
l'envoi. La totalité de `controles.sh` n'est pas exécutée localement : elle
inclut aussi les contrôles natifs Java/Rust et d'autres outils du dépôt,
exécutés par GitHub. Le nouveau test navigateur est ajouté au workflow
Android.

## Fichiers livrés (14)

- `page/js/457b-cycles-libres.js` : le réglage partagé (`EUR_CYCLE`).
- `page/js/458-scenes8-eurorack.js` : réglage PAS/MESURE, éditeur, affichage.
- `page/js/469-variations-rythmiques.js` et `471-variations-interface.js` :
  PAS/MESURE pour le FILL de DRUM 32 / BREAK 32.
- `page/js/476-harmonie8-eurorack.js` et `477-harmonie-interface.js` :
  PAS/MESURE pour HARMONIE 8.
- `page/html/460-note-eur.html` : notice intégrée.
- `page/ordre.txt` et `app/src/main/assets/drm16.html` : sources et résultat assemblé.
- `outils/test-cycles-libres.py` : nouveau contrôle navigateur.
- `outils/test-scenes8.cjs`, `test-harmonie8.cjs`, `test-variations-rythmiques.cjs` : comptages et scénarios CYCLES LIBRES.
- `outils/test-harmonie8.py` : compte de champs actualisé.
- `.github/workflows/android.yml` : exécution du nouveau test dans GitHub.
- Trois fichiers de version, `REPRENDRE.md`, et les deux documents de ce lot.
