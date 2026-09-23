# v289 — Cordes, anches et peaux : Inde, Balkans, dabké

Base vérifiée : commit `c234b0d516770a87a256a5d8047972cab515493e` (v288).
Livraison : un correctif incrémental à appliquer sur la v288, sous `drm16_android/`.
La page de la version Android est aussi la source préparée pour l’exécutable Windows.

## Trois nouveaux modules, aucun ancien remplacé

**CORDE RÉSO** : voix pincée monophonique, onde harmonique bourdonnante et deux
harmoniques résonantes. OCTAVE continu de −2 à +2 ; ACCORD ±100 cents ; CHUTE de
60 à 2200 ms, RÉSONANCE, BOURDONNEMENT, BRILLANCE et NIVEAU. Les harmoniques peuvent
résonner environ 1,5 fois la durée de chute. La note suivante atténue la queue
précédente sur quelques millisecondes.

**ANCHE LEAD** : voix monophonique passant de douce à nasale. Durée de 70 à
1800 ms, attaque de 2 à 100 ms, vibrato de 0 à 70 cents à 3–10 Hz, note d’appel
jusqu’à 200 cents sous la hauteur cible. L’appel rejoint la note dans les premières
millisecondes. OCTAVE, ACCORD, BRILLANCE et NIVEAU restent indépendants.

**PEAUX DUO** : deux synthèses modales déclenchées séparément par GRAVE et AIGU.
Fondamentales 55–180 Hz et 150–520 Hz ; chute, courbe du grave, modes de résonance
TABLA → DOUM et attaque bruitée. Le même instant peut jouer les deux peaux. BAS
et HAUT donnent leurs signaux séparés ; OUT est leur somme, tous après NIVEAU.
Ne pas additionner ces trois sorties vers le même bus, sauf doublage volontaire.
Les deux peaux sont calibrées pour garder de la marge lors d’une frappe simultanée.

Pour CORDE RÉSO et ANCHE LEAD, 0 V correspond à 55 Hz : MÉLO 32 CV → V/OCT et
GATE → TRIG. La hauteur CV et les glissés restent continus. Les autres changements
de timbre et de durée s’appliquent à la prochaine note ; NIVEAU est immédiat.
Les paramètres sont numériques dans `m.p`. STOP/RST/suppression/recâblage coupent
les voix. Pas de mesure audio ni de nouvelle boucle de rafraîchissement pour les
piloter ; les trois voix réutilisent le Focus natif.

## Quatre compositions originales

| Montage | Tempo | Modules | Câbles | Organisation |
|---|---:|---:|---:|---|
| INDE · CORDES ET PEAUX | 112 | 22 | 36 | Mélodie pincée, basse douce, peaux et bourdon ré/la. |
| INDE · TRANSE DES CORDES | 144 | 22 | 36 | Cordes brillantes, kick électronique, basse et réponse d’anche. |
| BALKANS · DANSE EN SEPT | 138 | 21 | 31 | 7/8, groupé 2+2+3 croches, anches et peaux. |
| DABKÉ · ANCHES ÉLECTRIQUES | 148 | 22 | 36 | Anche nasale avec appels, percussions, basse et réponses pincées. |

Accès : **EURORACK → RACK ▾ → MONTAGES → INDE / BALKANS / DABKÉ**.
Choisir un rack vide, charger, puis START. Les trois nouveaux modules se trouvent
sous **CORDES / ANCHES / PEAUX** dans le catalogue de modules.

Les huit commandes PERFORMANCE sont déjà affectées : les quatre niveaux
PERCUSSIONS / BASSE / MÉLODIE / BOURDON ou RÉPONSE, puis COULEUR MÉLODIE,
RÉSONANCE CORDES ou VIBRATO ANCHE, ÉCHOS et PEAUX VIVANTES. MÉMORISER puis REVENIR
fonctionnent sur ces paramètres sans remplacer les notes.

Les deux exemples indiens et le dabké ont huit scènes sur douze mesures.
Le montage balkanique joue réellement un cycle de **14 doubles-croches** (4+4+6)
avec les pistes de batterie et basse longues de 14 pas, et deux mélodies longues
de 28 pas. Il n’utilise ni SCÈNES 8 ni fills automatiques 4/4. Le compteur global
reste en 4/4 : les longueurs des modules définissent ici le cycle de danse. Les
fills automatiques existants comptent 16 CLK et ne doivent pas être activés en
pensant qu’ils suivent automatiquement le 7/8.

## Portée musicale et limites

Ce sont des **couleurs synthétiques**, pas des échantillons de tabla, sitar,
clarinette ou zurna, ni des modèles physiques complets. Les phrases sont nouvelles,
en tempérament égal, avec les MÉLO 32 en CHROMATIQUE afin de garder les intervalles
écrits. L’accord fin des voix n’est pas un moteur de raga ou de maqam microtonal.
Aucune prise de son, voix ou mélodie de chanson d’Omar Souleyman n’est incluse.
Sa référence est traitée ici comme une couleur dabké électronique syrienne,
distincte des deux autres familles demandées.

Référence culturelle consultée : fiche officielle Domino, Omar Souleyman :
https://www.dominomusic.com/artists/omar-souleyman
La fiche présente l’artiste syrien et son association du shaabi, du dabké et de
son approche contemporaine. Les modèles audio et les compositions sont notre
implémentation originale ; ils ne proviennent pas de cette page.

## Compatibilité et préservation

Comparaison des données et des fonctions du catalogue avant/après : les **113
anciens modules et 56 anciens montages restent identiques**. Total après ajout :
**116 modules et 60 montages**. Les versions Android/Windows deviennent 289 et
289.0.0. Les huit racks, les projets .drm16 et les affectations PERFORMANCE
réutilisent leurs formats existants. Aucun fichier sonore personnel, découpage
BREAK 32, réglage MIDI natif ou accès Freesound n’est modifié. Les déclencheurs
automatiques APK et Windows de `main` sont conservés ; la compilation Windows
n’a pas besoin d’être lancée à la main.

## Validation effectuée

- Nouveau test Node : **13 scénarios, 9736 assertions**, sans erreur.
  Paramètres, prises, limites, doublons de déclenchement, destruction, indépendance
  des instances et nombre de voix suivies pendant une longue séquence.
- Nouveau test navigateur : **547 vérifications**, sans erreur,
  dont sept formats d’écran, clavier/molette/glissement, cibles tactiles,
  sauvegarde/rechargement, macros, suppression et catalogue.
- **68 essais de signaux Web Audio** : deux fréquences
  d’échantillonnage, silence, limites, rafales, STOP/RST, annulation d’une note
  anticipée, somme des peaux, hauteurs V/OCT et stabilité de notes répétées.
  Le plateau de gain de chaque nouvelle voix est programmé explicitement :
  la prochaine coupure ne doit pas provoquer une baisse sur toute la note.
- **8 rendus audio hors ligne** des quatre montages, sur treize mesures/cycles,
  à 44,1 et 48 kHz. Contrôle des huit signaux (sortie gauche/droite et six sources),
  du passage des notes, du 7/8, des scènes, des limites et de STOP.
- **11 suites Node historiques** et **5 suites navigateur historiques** passent.
  Ces cinq suites sont : Focus Eurorack, PERFORMANCE, variations rythmiques,
  BREAK 32 bibliothèque et STUTTER LIVE. Leurs contrôles audio hors ligne ne
  sont pas relancés ici, sauf les contrôles propres au Focus ; ce sont leurs
  parcours d’interface et de sauvegarde qui sont vérifiés dans ce lot.
- Syntaxe de la page JavaScript assemblée, unicité des identifiants HTML,
  assemblage exact des 232 sources, YAML, JSON/TOML et numéros de version vérifiés.

Environnement : Chromium sous Linux, Node, page chargée en mémoire avec un
stockage temporaire simulé ; **les nœuds Web Audio ne sont pas remplacés par une simulation dans les rendus**.
La compilation Gradle Android, la compilation Tauri Windows/WebView2 et les
essais d’écoute/performance sur les appareils restent à valider après l’envoi.
La totalité de `controles.sh` n’est pas exécutée localement : elle inclut aussi
les contrôles natifs Java/Rust et d’autres outils du dépôt qui seront exécutés
par GitHub. Aucune assertion historique n’est désactivée : seuls les nombres
attendus de modules/montages sont actualisés dans douze tests de catalogue.
Le nouveau test complet est ajouté au workflow Android, le test Node aux
contrôles partagés avec Windows. Détails : `docs/TESTS_V289.json`.

## Fichiers livrés (28)

- `page/js/479c-voix-inde-balkans.js` : trois nouvelles voix et gestion de leurs sources.
- `page/js/479d-montages-inde-balkans.js` : quatre compositions et leurs macros.
- `page/css/460-couleurs-eurorack.css` : cartes de cette famille de montages.
- `page/js/450-montages-tout-faits.js` : branchement de la famille et informations.
- `page/html/460-note-eur.html` : notice intégrée et limites musicales.
- `page/ordre.txt` et `app/src/main/assets/drm16.html` : sources et résultat assemblé.
- `outils/test-couleurs-eurorack.cjs` et `.py` : nouveaux contrôles.
- `outils/controles.sh` et `.github/workflows/android.yml` : exécution dans GitHub.
- Douze fichiers de tests historiques : compteurs de catalogue mis à jour uniquement.
- Trois fichiers de version, et les deux documents de ce lot.

Liste exacte :

- `.github/workflows/android.yml`
- `app/build.gradle`
- `app/src/main/assets/drm16.html`
- `bureau/src-tauri/Cargo.toml`
- `bureau/src-tauri/tauri.conf.json`
- `docs/CORRECTIONS_V289.md`
- `docs/TESTS_V289.json`
- `outils/controles.sh`
- `outils/test-atelier-kick-basse.py`
- `outils/test-break32-bibliotheque.py`
- `outils/test-couleurs-eurorack.cjs`
- `outils/test-couleurs-eurorack.py`
- `outils/test-drum32.py`
- `outils/test-ensembles-eurorack.py`
- `outils/test-eurorack-focus.py`
- `outils/test-harmonie8.py`
- `outils/test-melo32.py`
- `outils/test-performance-eurorack.py`
- `outils/test-rave.py`
- `outils/test-scenes8.py`
- `outils/test-stutter-live.py`
- `outils/test-variations-rythmiques.py`
- `page/css/460-couleurs-eurorack.css`
- `page/html/460-note-eur.html`
- `page/js/450-montages-tout-faits.js`
- `page/js/479c-voix-inde-balkans.js`
- `page/js/479d-montages-inde-balkans.js`
- `page/ordre.txt`
