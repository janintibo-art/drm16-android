# v287 — HARMONIE 8 et montages à progressions d’accords

## Base et périmètre

Base vérifiée : v286, commit `2bbff074a534dc927a7b54c79ee9880810d7bef0`.
La page assemblée de départ a la même empreinte Git que le fichier du dépôt :
`6470c04c50b769a2e3872d8d73d19c0e4a18b5ad`.

Un nouveau module et deux nouveaux montages. Catalogue : **112 types / 54 montages**.
Les définitions (fonctions comprises) des 111 modules et les données des 52
anciens montages ont été comparées entre les deux pages : elles sont identiques.

## Ce que permet HARMONIE 8

Huit accords, chacun avec fondamentale MIDI (24 à 60), qualité, renversement et
durée de 1 à 16 mesures. Les qualités : majeur, mineur, mineur 7, majeur 7,
septième, sus 2, sus 4 et diminué 7. Les triades doublent la fondamentale ; les
renversements déplacent les voix vers le haut, sans unisson entre deux sorties.

Les sorties VOIX 1–4 sont des CV de notes, pas de l’audio. Les exemples utilisent
quatre VCO existants, à 55 Hz pour 0 V. Leur octave (0 à +2) et le glissé (0–250 ms)
sont communs. FOND émet la fondamentale sans le renversement de la nappe. TRANS
émet l’intervalle en volts depuis RÉFÉRENCE (LA1 par défaut) ; la transposition
globale de -12 à +12 demi-tons agit sur ces sorties.

Deux modes, à choisir en fonction du câble :

- MESURES : CLOCK OUT → CLK / SCÈNE. Seize impulsions font une mesure.
- SCÈNES : SCÈNES 8 SCÈNE → CLK / SCÈNE. Chaque changement avance d’un accord ;
  les durées locales sont conservées mais ignorées dans ce mode.

Dans les nouveaux exemples, huit accords suivent huit scènes. Des longueurs de
boucle différentes entre les deux modules les feront évoluer indépendamment :
ce n’est pas une liaison cachée entre leurs mémoires.

TENIR maintient l’accord mais laisse passer les impulsions. Choisir une case ne
fait pas sauter la lecture. L’édition est appliquée à la prochaine frontière de
mesure ou impulsion SCÈNE. Changer le mode réarme le premier accord au prochain
front. Réduire la longueur ne supprime pas les accords restants. Copier vers le
suivant demande confirmation, y compris pour la copie de 8 vers 1.

STOP/RST annulent les changements à venir et gardent la hauteur déjà entendue,
y compris au milieu d’un glissé. Le premier accord revient au prochain CLK.
ACCORD et CYCLE sont des impulsions ; CLK OUT retransmet l’entrée, donc en mode
SCÈNES il ne produit pas une horloge à seize pas par mesure.

## Deux montages à essayer

**EURORACK → RACK → MONTAGES → HARMONIES**. Choisir un emplacement vide pour
conserver le travail actuel, puis START. Toucher HARMONIE 8 pour éditer les accords.

| Montage | Tempo | Modules | Câbles |
| --- | ---: | ---: | ---: |
| DnB · Accords nocturnes | 174 BPM | 33 | 53 |
| Psy · Harmonie en mouvement | 146 BPM | 33 | 53 |

LA mineur 7 → FA majeur 7 → DO majeur → SOL septième, deux fois sur douze mesures.
Les groupes sont A batterie, B basse, C mélodie, D nappe. Le DnB utilise le break
synthétisé original, remplaçable par une boucle personnelle. Le Psy conserve
KICK LAB et DUCK TRIG. Le kick du Psy ne suit pas la transposition harmonique.

PERFORMANCE regroupe les quatre niveaux, couleur de basse, ouverture de nappe,
échos et brillance du lead. Les fills A/B continuent toutes les quatre mesures.

## Limites musicales importantes

TRANS est une **transposition parallèle**, pas un quantificateur harmonique.
Les deux MIX 4 dédiés additionnent CV de MÉLO 32 et TRANS, avec A = B = 1.
Les exemples écrivent seulement fondamentales, quintes et octaves, qui restent
compatibles avec les quatre accords choisis. Des notes ajoutées manuellement ne
seront PAS automatiquement corrigées si elles deviennent étrangères à un accord.

Les notes d’une nappe changent réellement de tierce/septième selon la qualité.
L’octave et le renversement de la nappe ne déplacent pas la basse. En revanche,
un changement de TRANS peut déplacer la queue d’une note encore tenue ; c’est le
comportement d’un CV continu branché sur V/OCT, pas une nouvelle note MIDI.

Ce lot ne remplace pas automatiquement les phrases A/B en changeant de scène et
n’enregistre pas les mouvements de PERFORMANCE. Ces évolutions restent séparées.
Les racks sont plus chargés que les petits exemples : leur confort et leur charge
sur le téléphone et le PC doivent encore être évalués en usage réel.

## Sauvegardes et compatibilité

Les 39 réglages sont numériques dans `m.p`, donc conservés par les sauvegardes
de racks/projets existantes. Aucun nouveau format ni référence de fichier audio.
Aucun changement aux sons personnels, découpes BREAK 32, commandes MIDI natives,
Freesound, moteurs des anciennes machines, configuration Tauri ou déclenchement
Windows automatique. Un changement de câblage reconstruit le rack, comme avant.

## Fichiers

- `page/js/476-harmonie8-eurorack.js` : notes, progression, dates audio et nettoyage.
- `page/js/477-harmonie-interface.js` : huit cases, éditeur Focus et contrôles.
- `page/js/478-montages-harmonie.js` : deux copies câblées, transpositions et macros.
- `page/css/440-harmonie8.css` : façade, Focus portrait/paysage et commandes 44 px.
- `page/html/460-note-eur.html` : notice d’utilisation intégrée.
- `page/ordre.txt` et `app/src/main/assets/drm16.html` : assemblage des quatre sources.
- `outils/test-harmonie8.cjs`, `outils/test-harmonie8.py` : moteur, UI, fichiers et audio.
- `outils/controles.sh` et `.github/workflows/android.yml` : nouveaux contrôles bloquants.
- Dix suites Python existantes : totaux du catalogue 112/54 ; le test Focus reçoit
  aussi le contrôle des huit cases et dix champs de HARMONIE 8. Aucun test retiré.
- `app/build.gradle`, `bureau/src-tauri/Cargo.toml`, `tauri.conf.json` : 287 / 287.0.0.
- Ce document et `docs/TESTS_V287.json` : périmètre et résultats.

## Vérifications exécutées

- 28 scénarios Node, 17 565 assertions : accords, renversements, durées, modes,
  maintien, changement de longueur, dates invalides, STOP/RST, glissés, nettoyage
  et historiques bornés.
- 591 contrôles Chromium du nouveau lot : sept formats (320×568 à 1920×1080),
  sélection, édition, confirmation, persistance, projets, suppression de module,
  macros et quatre rendus de treize mesures à 44,1 et 48 kHz.
- Dans ces rendus, les quatre fréquences des VCO sont mesurées après chaque accord,
  les six CV sont comparés aux valeurs attendues et les deux CV transposés sont
  contrôlés dans le signal réel. Les quatre groupes produisent un son non nul,
  sans valeurs non finies ; les sorties restent sous le seuil vérifié.
- Neuf suites Node précédentes passent, dont les 35 scénarios MIDI v278.
- Focus complet : quatre formats et 448 ouvertures de modules. Atelier UI :
  231 contrôles. PERFORMANCE UI : 472 contrôles. Zéro erreur dans ces suites.
- Source/page : retrait des quatre ajouts et restauration de la seule notice
  retrouvent la page v286 authentifiée octet pour octet. Versions et YAML contrôlés.

Les tests utilisent Node et Chromium Linux, avec stockage temporaire simulé.
L’intégralité de `controles.sh` n’a pas été exécutée ici (checkout local partiel).
Des suites historiques longues (Atelier intégrale, Variations navigateur) ont été
interrompues par la limite de temps du conteneur ; elles ne sont pas déclarées
réussies. Les scénarios Node correspondants passent ; Atelier UI a ensuite été
exécuté séparément et passe. Les rapports distinguent précisément ces périmètres.

La compilation APK/Windows, l’essai WebView2 et l’écoute sur les appareils restent
à valider sur GitHub et chez l’utilisateur. Les rendus hors ligne ne valent pas
une écoute humaine ni une mesure des performances du Samsung.

## Livraison

Une archive de sources modifiées, sous `drm16_android/`, pour le script habituel.
Après l’envoi sur main, APK et Exécutable Windows sont déclenchés automatiquement.
Une fois Windows réussi, récupérer `drm16-windows` puis `DRM16-installeur.exe`.
L’archive de correction n’est pas elle-même un installateur Windows.
