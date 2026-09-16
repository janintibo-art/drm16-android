# Reprendre le projet

Ce fichier sert à redémarrer une conversation sans rien réexpliquer. Il dit **comment on travaille**,
**ce qui existe**, **les pièges déjà rencontrés** et **ce qui reste à faire**.

---

## 1. La façon de travailler

**Pas de PC.** Tout se fait depuis un téléphone Samsung avec Termux. Aucune compilation locale : le code
part sur GitHub, et **GitHub Actions fabrique l'APK**.

Trois commandes, toujours les mêmes :

```bash
bash ~/memo-depot/mise-a-jour.sh drm16_android "message de commit"
bash ~/drm16_android/suivi.sh          # gh run watch
bash ~/drm16_android/recup-apk.sh      # télécharge l'APK dans Téléchargements
```

Un quatrième script, à garder sous la main quand une compilation échoue :

```bash
bash ~/pourquoi.sh                     # dit quelle étape a échoué, sans navigateur
```

**Noms des dépôts** — attention, ils diffèrent : dossier local `drm16_android` (tiret bas),
dépôt GitHub `drm16-android` (trait d'union).

**Livraison.** Chaque version est livrée en **archive zip contenant uniquement les fichiers modifiés**,
à décompresser par-dessus le dossier local. La numérotation suit `versionCode` dans `app/build.gradle`.
La version actuelle est la **140**.

**Langue.** Tout est en français : le code, les commentaires, l'interface, la documentation. Les commits
sont sans accents (Termux).

---

## 2. Ce que contient le projet

**Chiffres au 140** — à revérifier plutôt qu'à croire, les contrôles ci-dessus les recalculent :
30 tuiles au menu, 21 moteurs de machine, 21 voies de mixage, 103 modules Eurorack, 27 onglets de notice,
fichier HTML de 1,25 Mo.


La notice est découpée en **onglets `.doc`** dans `#note-corps` ; la barre de navigation est construite
toute seule à partir de leur `data-titre`. L'Eurorack en occupe trois : `note-eur` (les principes),
`note-eurmod` (les 103 fiches, avec sommaire cliquable), `note-eurpat` (huit patchs et le glossaire).

Une seule page HTML porte toute l'application : `app/src/main/assets/drm16.html`, environ **1,25 Mo**.
Le Java ne sert que de pont vers Android.

| Fichier | Rôle |
|---|---|
| `page/` | **les sources de la page**, découpées par thème — c'est ICI qu'on modifie (v138) |
| `app/src/main/assets/drm16.html` | la page **assemblée** par `outils/assembler.py` — ne jamais la modifier directement |
| `.../java/fr/tibo/drm16/MainActivity.java` | WebView, pont JS, micro, fichiers, réseau |
| `.../java/fr/tibo/drm16/Midi.java` | API MIDI Android, SysEx |
| `.../java/fr/tibo/drm16/PlaybackService.java` | service de premier plan |
| `.../java/fr/tibo/drm16/Fichiers.java` | remplacement sûr des fichiers, sans dépendance Android |
| `.../java/fr/tibo/drm16/MidiOctets.java` | règles d'envoi MIDI (longueurs, SysEx complet), sans dépendance Android |
| `app/src/main/AndroidManifest.xml` | permissions |
| `.github/workflows/android.yml` | compilation |

### Les trente machines

**Electro-Harmonix** DRM16, DRM32 · **Korg** Electribe EM-1, ER-1, EA-1, ES-1, ER-1 mkII, ES-1 mkII,
EA-1 mkII, EMX-1, ESX-1, volca sample · **Akai** MPC3000, MPC2000 · **Roland** TR-808, TR-909, TR-707,
CR-5000, TR-1000 · **Oberheim** DMX · **Arturia** DrumBrute Impact · **Behringer** RD-6, TD-3 ·
**Machine d'archive** (n'importe laquelle des 470 boîtes d'archive.org) · **Eurorack** (103 modules, deux rangées :
9 horloges, 8 séquenceurs, 14 oscillateurs, 11 filtres, 12 modulations, 14 utilitaires, 18 traitements,
17 percussions). · **Teenage Engineering** PO-33 K.O! · **Sonicware** SmplTrek · **Roland** MC-101 · **Korg** KAOSS PAD

### Les outils

Bibliothèque (sons, prises MIDI, sauvegardes SysEx, collection archive.org), enregistreur MIDI, éditeur en
rouleau, traitement du son, égalisation de kit, optimisation mémoire, export WAV, export .mid format 1,
export vers carte ES-1, motifs volca au format Korg, décalage humain, tirage au sort des sons.

---

## 3. Conventions du code

- **Une machine = un objet d'état** (`TR`, `MPC`, `DMX`, `VLC`, `EUR`…), une fonction `activerXxx()`,
  un objet `MACHINE_XXX = {schedule, beat, arret, boucle, longueur}`.
- `allerMachine(id)` est le point d'entrée unique pour changer de machine.
- **Mémoire** : `memXxx()` écrit dans `memoire`, `sauverMachine(id)` enregistre, `memLire(id)` relit.
  `writeMem()` force l'écriture immédiate ; il retient une **liste fermée de clés globales** — une nouvelle
  clé doit y être ajoutée, sinon elle est perdue au redémarrage.
- **Habillage** : la classe du corps porte l'identifiant (`tr8`, `rd6`, `eur`…), le châssis a une classe
  **différente** (`rtr`, `korgv`, `dmxb`…).
- **Sons partagés** : `ES.buf` est la banque commune à tous les échantillonneurs.

---

## 4. Les pièges déjà rencontrés

Quatre erreurs se sont répétées. Des garde-fous existent maintenant, il faut s'en servir.

**Collision de classes corps/châssis.** Donner le même nom à la classe du corps et à celle du châssis rend
la page noire **sans aucune erreur JavaScript**. Fait trois fois. Un contrôle au chargement parcourt la
liste des classes de corps et signale toute collision.

**Déclaration après usage.** Un objet déclaré après le code qui le lit au démarrage arrête le script net.
Fait quatre fois. Le même contrôle vérifie maintenant la **présence de dix-neuf objets attendus** une
seconde après le démarrage.

**Bloc de modification annulé.** Un script qui applique dix remplacements et échoue sur le dernier perd
les neuf premiers. Fait trois fois dans la même journée. **Appliquer chaque modification séparément, avec
écriture immédiate**, et afficher laquelle a échoué.

**Java sans compilateur.** Les contrôles d'accolades ne voient pas un objet inexistant — `ui.post()` copié
depuis `Midi.java` alors que `MainActivity` n'a pas de champ `ui`. Utiliser `verif-java.py`, qui repère
tout identifiant employé comme objet sans être déclaré ni importé.

**Contrôles automatiques (v134)** : `bash outils/controles.sh` enchaîne façades, charge, HTML extérieur,
identifiants en double, syntaxe JavaScript, compilation Java de contrôle et tests Java. GitHub Actions le lance
**avant** toute compilation, dans les deux workflows. Dans Termux : `pkg install python nodejs openjdk-17`.

**Contrôle systématique avant livraison** : les vingt-cinq machines dans trois formats d'écran
(393×851, 880×400, 360×640), lecture effective, aucune erreur de page, aucun débordement.

---

## 5. Ce qui reste à faire

**Décidé, pas encore fait**

- **Bluetooth MIDI** dans le pont Java — reconnexion automatique et témoin de signal, d'après *fabkorg*.
  Impossible à essayer sans matériel.

**W4 : réseau sous Windows — v140**

*Constat v139* : le Rust compile, et l'essai automatique a tourné sur l'exécuteur Windows — **20 contrôles
sur 20**, dans le vrai WebView2. L'étape « Essai automatique de l'application » devient donc **bloquante**
(`windows.yml`, `publication.yml`).

*Téléchargement* — **`bureau/src-tauri/src/reseau.rs`**, traduction de `netCharger` :
- https seulement, y compris l'adresse finale après redirections (5 au plus) ; 15 s de connexion, 30 s sans
  données ; plafond demandé par la page, borné à 16 Mo (4 Mo par défaut) ; « trop gros » dès l'annonce
  `Content-Length`, puis à la lecture.
- Client **`ureq` 2** (bloquant, TLS intégré), sur un **fil à part** : l'appel synchrone de la page rend la
  main aussitôt.
- Le résultat revient par **le même rappel qu'Android** : `window.__net(jeton, erreur, base64)`, envoyé par
  `eval` à toutes les fenêtres. `APPLI` (le `AppHandle`) est posé dans `setup` (`main.rs`).
- Côté page : `netCharger` ajouté à la liste `BUREAU` — la collection archive.org fonctionne sous Windows.

*Autotest* : trois essais réseau, attendus avant le rapport — `http://` refusé, `https://archive.org/robots.txt`
téléchargé, plafond de 10 octets refusé. **Il faut donc Internet sur l'exécuteur** (c'est le cas sur GitHub).
Test navigateur, bloc 8 : la coque simulée rend aussi les téléchargements par `__net`.

**W3 : fichiers et échantillons sous Windows — v139**

*Le problème de fond.* La page appelle le pont Android **de façon synchrone** (« `chemin = p.fichierSauver(…)` »),
alors que les commandes Tauri sont asynchrones. Plutôt que de réécrire des dizaines d'appels, la version de
bureau garde le synchrone :
- **Côté page** (`page/js/010-hote.js`) : pour chaque fonction de la liste `BUREAU`, HOST envoie une
  **requête XMLHttpRequest synchrone** `POST http://drm16.localhost/<fonction>` (sous Windows ; `drm16://`
  ailleurs), arguments en JSON, en `text/plain` pour éviter toute requête préalable. Réponse : `{"r": …}`.
  Les fonctions pas encore écrites côté Rust (MIDI, réseau, micro) restent absentes.
- **Côté Rust** (`bureau/src-tauri/src/`) : `main.rs` enregistre le protocole `drm16` ; **`hote.rs`** le sert
  (aiguillage par nom, 404 pour une fonction inconnue, `Access-Control-Allow-Origin: *` car la page vient de
  `http://tauri.localhost`) ; **`fichiers.rs`** traduit fidèlement `MainActivity`/`Fichiers.java` : mêmes
  plafonds (8 / 64 / 32 Mo), mêmes formats de liste, écriture par morceaux (4 au plus, 768 Ko), remplacement
  sans perte (`rename` remplace sous Windows, repli par `.bak`), orphelins récupérés, noms techniques cachés.
  Dépendances ajoutées : `serde_json`, `base64 0.22`, `dirs 5`.
- **Emplacements** : documents dans **Documents\DRM16**, échantillons dans **%APPDATA%\DRM16\ech**.
  `DRM16_DOSSIER` les remplace par un dossier d'essai.
- `propre()` refuse désormais « . » et « .. » (Rust, et Java par la même occasion).

*Essai automatique de la vraie application.* Avec la variable `DRM16_AUTOTEST`, la page se teste elle-même au
démarrage (18 contrôles : aller-retour de fichiers, liste, morceaux, 3 Mo, suppression, noms dangereux,
échantillons, machines ouvertes, fonction inconnue refusée, aucune erreur JS) et rend son rapport à la coque,
qui quitte avec 0 ou 1. Étape « Essai automatique de l'application » dans `windows.yml` et `publication.yml`,
rapport dans le résumé du run — **non bloquante** tant qu'on n'a pas vu l'exécuteur Windows ouvrir une fenêtre.

*Test navigateur, bloc 8* : la même page, avec un agent « Windows » et une **coque simulée en Python** qui
imite `hote.rs`/`fichiers.rs` : plateforme `bureau`, 14 fonctions, autotest entièrement vert.

*Correction au passage* : depuis la v137, le bloc HOST placé avant `"use strict"` avait **désactivé le mode
strict** de tout le script. `"use strict"` est de nouveau la première instruction (en tête de
`010-hote.js`) ; tous les tests passent en mode strict.

*Limite* : le Rust n'est pas compilé ici — c'est le run « Exécutable Windows » qui le dira.

**Les sources de la page sont découpées — v138**

`drm16.html` (27 751 lignes) est désormais **assemblé** à partir de **144 sources** rangées dans `page/` :
- `page/html/` — en-tête, une façade par fichier (`unit-em1.html`…), menus, outils, et la notice découpée par
  onglet (`note-kp.html`…) ;
- `page/css/` — la base, puis une feuille par famille de machines (les plus récentes — K.O!, MC-101,
  SmplTrek, KAOSS PAD — sont encore dans `170-eurorack.css`, à séparer quand on y touchera) ;
- `page/js/` — `010-hote.js` en tête, puis un fichier par machine ou par grand thème (MIDI, enregistreur,
  Eurorack en neuf fichiers, bibliothèque…). Le plus long : `250-electribe-em-1.js`, 1 252 lignes.
- `page/ordre.txt` — l'ordre d'assemblage. Les numéros des noms (010, 020…) ne servent qu'à la lecture ;
  **c'est `ordre.txt` qui fait foi**. Pour insérer un fichier : le créer, l'ajouter à sa place dans `ordre.txt`.

**`outils/assembler.py`** recolle les sources **octet pour octet**, sans rien transformer : le découpage de la
v138 redonne exactement le `drm16.html` de la v137 (vérifié par `cmp`). `--verifier` échoue si `drm16.html`
ne correspond pas aux sources et **indique le fichier et la ligne** de la première différence ; il refuse aussi
une source absente de `ordre.txt` ou un fichier sans retour à la ligne final. C'est l'**étape 0** de
`outils/controles.sh`.

**Règle** : on modifie `page/`, on lance `python3 outils/assembler.py`, et on livre les sources modifiées
**avec** `drm16.html`. Le fichier assemblé reste dans le dépôt : l'APK, l'exécutable Windows et le test
navigateur s'en servent tel quel. Rien ne change dans les commandes de mise à jour.

**W2 : la couche HOST — v137**

La page ne touche plus `window.DRM16` : elle passe par **`HOST`**, déclaré **en tête du script** (bloc
`HÔTE … FIN HÔTE`).
- `HOST` porte **les mêmes noms** que le pont Android (liste `FONCTIONS`, 27 noms). Sur Android, chaque
  fonction délègue à `window.DRM16`. **Une fonction que la plateforme n'offre pas n'existe pas dans HOST** :
  tous les tests existants `if(!p || !p.fichierSauver)` gardent leur sens (« ÉCRITURE IMPOSSIBLE ICI »).
- `HOST.plateforme` : `android`, `bureau` (Tauri détecté ; ses fonctions arriveront en W3 à W5) ou
  `navigateur`. `HOST.a(nom)` dit si une fonction existe. `<html data-hote="…">` pour le style (W6).
- 22 accès remplacés : 20 `window.DRM16` → `HOST`, plus `DRM16.playing` et `pont()` (MIDI).
- Les rappels de Java vers la page (`__midi`, `__midiEtat`, `__midiSysex`, `__net`) ne changent pas : la
  version de bureau appellera les mêmes.
- **`verifier-hote.py`** (étape 3 bis des contrôles) : aucun accès au pont hors du bloc, et `FONCTIONS` égale
  exactement la liste des `@JavascriptInterface` de `MainActivity.java`. **Règle** : une fonction ajoutée au
  pont s'ajoute à `FONCTIONS`, sinon le contrôle échoue. Vu échouer (nom mal orthographié).
- Test navigateur, bloc 7 : sans pont → `navigateur`, aucune fonction, message d'impossibilité ; avec le pont
  simulé → `android`, seules ses fonctions, appel aller-retour.

Aucun changement de comportement sur Android.

**Phase W — version Windows. W1 : une page préparée une seule fois, Syro compris — v136**

*Défauts.* La page de l'exécutable était copiée à la main dans **deux** workflows (PowerShell), sans le Syro :
celui-ci n'est compilé que sous Linux, et le poste Windows repartait du dépôt. L'installation d'Emscripten
était recopiée trois fois. Cargo restait en 0.1.0, Tauri en 1.0.0 dans le dépôt, et les textes annonçaient
« vingt-cinq machines, quatre-vingt-neuf modules ».

*Correction.*
- **`bureau/preparer.sh`**, seul fabricant de `bureau/dist` : copie de **tous** les assets, `drm16.html` →
  `index.html`, vérification de `index.html`, `studio/`, `nexus/` (bloquant) et de `syro/syro.js`
  (avertissement, ou bloquant avec `EXIGER_SYRO=1`), puis version de l'application recopiée dans
  `tauri.conf.json` et `Cargo.toml` (`136` → `136.0.0`). Résumé du run : version et présence du Syro.
  `bureau/dist/` est ignoré par git.
- **`outils/installer-emscripten.sh`** (à sourcer) : la version 3.1.64 n'est plus écrite qu'ici.
- **`windows.yml` en deux postes** : `preparer` (Linux : contrôles, Syro, `preparer.sh`, artefact
  `bureau-prepare` = `dist/` + les deux fichiers de version) puis `exe` (Windows : `download-artifact@v8`
  sous `bureau/`, vérification de la page reçue, Tauri). **`publication.yml`** : même principe, la page est
  préparée par le poste `publier` juste après le Syro.
- Descriptions sans chiffres qui vieillissent (installeur, notes de version). Cargo et Tauri en 136.0.0 dans
  le dépôt. Taille minimale de fenêtre **gardée à 380×520** : la page est conçue et testée pour 360 px.
- **`verifier-bureau.sh`** revu : coque complète, plus aucune copie manuelle vers `bureau/dist`, les deux
  workflows appellent `preparer.sh`. Ajouté en **étape 7 de `outils/controles.sh`**. Vu échouer sur l'ancien
  `windows.yml`.
- Versions relevées en ligne : `download-artifact` **v8**, `Swatinem/rust-cache` **v2** (2.9.2, inchangé),
  `tauri-cli` : la dernière est une 3.0 alpha — on **reste en Tauri 2** (`^2.0`).

*Vérifié ici* : `preparer.sh` sur une copie (99 fichiers, 7 Mo ; versions recopiées ; Syro exigé absent →
échec ; `nexus` manquant → échec), YAML des trois workflows, tous les contrôles. **Non vérifié** : la
compilation Windows elle-même (pas de Rust ici) — lancer « Exécutable Windows » depuis l'onglet Actions.

**Suite de la phase W** : W2 couche `HOST` · W3 fichiers et échantillons · W4 réseau · W5 MIDI ·
W6 micro, latence, `body.desktop` · W7 format `.drm16` · W8 confort PC · W9 sécurité et matrice de parité.

**Test dans un vrai navigateur, actions à jour — v135 (fin de la phase A)**

*`outils/test-navigateur.py`* — Chromium sans écran (Playwright 1.56.0, figé), lancé par `android.yml` et
`publication.yml` juste après `controles.sh`. Six blocs, chacun reprenant un contrôle fait à la main :
1. chargement sans erreur, puis les **29 machines** du menu ouvertes, jouées 0,35 s et arrêtées, dans les
   **trois formats** 393×851, 880×400, 360×640 — aucune erreur de page, aucun débordement en largeur ;
2. atténuation par voix du pas sur 15 machines (v124) ;
3. Kaoss Pad mesuré par rendu hors ligne : anneau, vitesse 220/440/880 Hz, réduction, geste (v125-v127) ;
4. écriture par morceaux, export WAV exact, refus avant rendu (v128) ;
5. MIDI avec un pont simulé : attente, ouverture, débranchement, reconnexion, nom en texte (v131) ;
6. nom piégé affiché tel quel, sans exécution (v132).
**Vu échouer** sur la v123 : 11 contrôles en échec, exactement les défauts corrigés depuis.
Le pont Android simulé (`PONT` dans le script) est la référence pour tester d'autres fonctions du pont.
Localement : `pip install playwright==1.56.0 && python -m playwright install --with-deps chromium`.

*Actions GitHub* (versions relevées en ligne le 16/09/2026) : `checkout` v4 → **v7**, `setup-java` v4 → **v6**,
`upload-artifact` v4 → **v7**, `gradle/actions/setup-gradle` v4 → **v6**, `setup-python` **v7** (nouveau).
`Swatinem/rust-cache@v2` et `dtolnay/rust-toolchain@stable` (Windows) : à revoir en phase W.
Durée maximale du poste Android et de la publication : 25 → 30 min.

**La phase A (analyse complète) est terminée.** Suite : phase W (version Windows), puis B (son), C (fidélité),
D (graphisme). Le découpage des sources de `drm16.html` est prévu pendant W2.

**Contrôles automatiques avant compilation — v134**

`outils/controles.sh`, lancé par `android.yml` et `publication.yml` juste après l'installation de Java,
**avant** Syro et Gradle. S'arrête au premier échec :
1. `verifier-facades.py` 2. `verifier-charge.py` 3. `verifier-html.py`
4. **`verifier-ids.py`** (nouveau) — identifiants posés deux fois dans le HTML écrit en dur (903, aucun doublon)
5. **`outils/verifier-js.py`** (nouveau) — `node --check` de chaque bloc de script, ligne de départ indiquée
6. **Java** : `outils/java/Verif.java` compile toutes les sources de l'application avec des **classes Android
   simulées** (`outils/java/android-simule/`, signatures seulement), puis lance `TestFichiers` et `TestMidi`
   (`outils/java/tests/`). Si le code se met à utiliser une API Android absente des simulations : ajouter sa
   signature là, rien d'autre. `verif-java.py` (contrôle par texte) est dépassé par cette compilation.
Chaque contrôle a été **vu échouer** : faute de syntaxe JS, identifiant en double, sources extérieures (v132),
faute Java (v128), voie non protégée (v124).

**Lint Android** ajouté après la compilation, **informatif** (`continue-on-error`), rapport joint au run
(`rapport-lint`). À lire avant de décider ce qui deviendra bloquant.

**Syro figé** : `syro/korg-commit.txt` porte `b0ed615f18c230a18b378d9ddc6a936971597e4e`, relevé sur le run
de la v133.

**Fait en v135** : test navigateur en CI et actions GitHub à jour.

**Syro : code Korg figé sur un commit — v133**

*Défaut.* `construire.sh` clonait l'état **courant** du dépôt Korg : le même commit DRM16, recompilé plus
tard, pouvait embarquer un Syro différent. (Emscripten, lui, était déjà figé en 3.1.64.)

*Correction.* `syro/korg-commit.txt` porte le commit attendu (première ligne de 40 caractères hexadécimaux,
le reste est commentaire).
- **Commit inscrit** : `git init` + `fetch --depth 1` de **ce commit précis** + vérification `rev-parse`.
  Commit introuvable ou dossier `volcasample` resté sur un autre commit → arrêt avec un message clair
  (l'étape est en `continue-on-error` : l'APK se construit quand même, sans transfert volca).
- **Rien d'inscrit** (état livré en v133) : clonage de l'état courant, sans bloquer, et affichage de
  `COMMIT KORG : <commit> (NON FIGE)` dans le journal, en avertissement et dans le résumé du run.
- `KORG_DEPOT` permet de pointer ailleurs (servi aux essais).

*Vérifié* avec un faux dépôt Korg et un faux `emcc` : sans commit → avertissement et compilation ; commit v1
inscrit alors que le dépôt est passé en v2 → c'est bien **v1** qui est compilé ; dossier resté sur v2 → arrêt ;
commit inexistant → arrêt, dossier nettoyé.

**Fait en v134** : commit relevé sur le premier run et inscrit — `b0ed615f18c230a18b378d9ddc6a936971597e4e`.

**Aucun nom extérieur interprété comme du HTML — v132**

*Relevé.* 74 écritures `innerHTML`, passées une à une. Presque toutes posent des constantes (listes de
paramètres, noms de modules, de montages, de rythmes). **Deux** recevaient une chaîne venue de l'extérieur :
- le nom de l'échantillon sur l'ESX (`majLedsSx`, `nomEch`) — renommé par l'utilisateur ou venu d'archive.org ;
- le nom du rack dans la liste des racks Eurorack (`listeRacks`, `nomRack`) — saisi par l'utilisateur.
**Vérifié que c'était un vrai défaut** : un nom `<img src=x onerror=…>` y **exécutait du code** en v131.

*Correction.*
- `texteApresLed(el, texte)` : la LED `<i></i>` en HTML fixe, puis le texte en nœud texte. Utilisée pour le
  nom et les informations de l'échantillon ESX.
- Liste des racks construite en `textContent` + `<span>` créé.
- Trace du PAD MOTION : les coordonnées lues en mémoire sont converties en nombres bornés avant d'être écrites.
Après correction, le même nom s'affiche tel quel, aucune balise n'est créée, aucun code ne s'exécute.

*`verifier-html.py`* (nouveau) : cherche dans chaque `innerHTML` / `outerHTML` / `insertAdjacentHTML` les
sources extérieures connues (`nomEch`, `nomBib`, `nomRack`, `BIB.noms`, `ES.noms`, `EUR.nom`, noms MIDI,
`ARC.`, prises, `prompt`, `.name`, `KP.motion`…), texte fixe entre guillemets exclu. **Vu échouer** sur la v131
(les deux sites). **Règle** : toute nouvelle donnée nommée par l'utilisateur s'ajoute à `SOURCES`.

**MIDI : branchement à chaud, témoin, reconnexion — v131**

*Défauts.* La liste n'était relue qu'au bouton CHERCHER ; un appareil débranché restait « ouvert » pour la
page (`MIDI.ouvert` était posé au clic, **sans attendre** l'ouverture réelle) ; l'ouverture se faisait par
**position** dans une liste qui pouvait avoir changé ; l'horloge lancée au clic était aussitôt coupée par le
`fermer()` de l'ouverture ; aucun moyen de fermer un appareil depuis la page.

*Java* (`Midi.java`) :
- `surveiller()` enregistre un `MidiManager.DeviceCallback` (appelé depuis `onCreate`) ; `liberer()` le retire
  et ferme tout (appelé depuis `onDestroy`, à la place de `fermer()`).
- `ouvertId` : l'identifiant Android de l'appareil **réellement** ouvert, remis à −1 par `fermer()`.
- `ouvrirId(id)` ouvre par identifiant ; `ouvrir(i)` reste pour un pont plus ancien.
- `signaler(evt, nom)` envoie à la page l'état complet en JSON, chaînes échappées par `JSONObject.quote` :
  `ajout`, `retrait`, `perdu` (l'appareil ouvert a disparu : il est fermé), `ouvert`, `echec`, `ferme`.
- `fermerSignale()` pour la fermeture demandée par la page.
- Pont : `midiAppareils()` (nom TAB id), `midiOuvertId()`, `midiOuvrirId(id)` ; `midiFermer` prévient la page.
  `MainActivity.etat(json)` appelle `window.__midiEtat`.

*Page* :
- `__midiEtat(e)` tient la liste, `MIDI.ouvertId`, `MIDI.attenteId`, et redessine (`dessinerListeMidi`).
  `MIDI.ouvert` reste l'index dans la liste affichée — tous les `MIDI.ouvert >= 0` existants restent justes,
  et désormais vrais.
- Témoin `#midi-etat` (classe `midi-etat`) : « ● CONNECTÉ : … », « ◌ OUVERTURE DE …… », « ○ AUCUN APPAREIL ».
  Noms posés en `textContent`.
- Retoucher l'appareil ouvert le ferme. L'horloge MIDI part à l'événement `ouvert`, plus au clic.
- **Reconnexion** : `MIDI.dernier` (le nom du dernier appareil ouvert, gardé dans `memoire.midi`) est rouvert
  quand il est rebranché, et au démarrage. Fermer à la main l'efface.
- Au démarrage, la liste est prête sans toucher CHERCHER ; après un rechargement de la page, l'appareil que Java
  tient encore ouvert est reconnu.
- Sans `midiAppareils` (pont ancien, future version PC), `chercherMidi` garde l'ancien comportement.

*Vérifié* avec un pont simulé : ouverture en attente puis confirmée, débranchement de l'appareil ouvert,
rebranchement avec un nouvel identifiant et reconnexion, fermeture au second toucher, autre appareil branché
sans ouverture intempestive, redémarrage avec réouverture, nom contenant `<USB>` affiché tel quel, horloge
partie à l'ouverture, pont ancien. Le Java compile. **Non essayé** sur un vrai appareil : ce sera la
vérification à faire sur le téléphone.

**MIDI : plus de F0 isolé, SysEx vérifié avant envoi — v130**

*Défaut.* L'envoi générique (`midiEnvoyer` → `Midi.envoyer`) acceptait `F0` comme message d'un octet. `F0`
ouvre un message exclusif : l'appareil attend la suite, et peut ignorer ce qui vient ensuite jusqu'à un `F7`
qui n'arrive pas. `F7`, `F4`, `F5`, `F9` et `FD` partaient aussi seuls.

*Correction* — nouvelle classe **`MidiOctets.java`**, sans dépendance Android :
- `longueur(statut)` : 3 ou 2 octets pour les messages de canal, 2 pour `F1`/`F3`, 3 pour `F2`, 1 pour `F6`
  et le temps réel (`F8 FA FB FC FE FF`), **−1 pour tout le reste** — refusé. Comparé à l'ancienne table sur
  les 256 valeurs : seuls `F0 F4 F5 F7 F9 FD` changent.
- `sysexComplet(m)` : une suite d'un ou plusieurs messages `F0 … F7` complets, données sur 7 bits, rien entre
  eux (une sauvegarde de banque en contient souvent plusieurs).
- `Midi.envoyerSysex` refuse tout le reste et **rend un booléen** ; `midiSysex` le transmet à la page
  (il ne rendait rien).
- Page : `excEnvoyerBrut` et `bibRenvoyer` affichent le refus — « FICHIER EXCLUSIF INCOMPLET · RIEN N'EST
  PARTI » ou « AUCUN APPAREIL MIDI OUVERT ». La page n'envoyait jamais `F0` par `midiBrut` : rien d'autre à
  changer. Les demandes Korg sont complètes, et `sept_vers_huit` reste bien sur 7 bits (vérifié).

*Vérifié* : `TestMidi` (JDK) — 12 contrôles, dont message tronqué, statut au milieu, octet après le dernier
`F7`, second message incomplet. Tout le Java compile.

**Remplacement de fichier sans perte possible — v129**

*Défaut.* `ecrireAtomique` **supprimait** l'ancien fichier puis renommait le nouveau à sa place : si le
renommage échouait, les deux versions étaient perdues.

*Correction* — nouvelle classe **`Fichiers.java`**, sans aucune dépendance Android :
- `remplacer(tmp, cible)` tente d'abord `renameTo` seul. Sous Android c'est `rename(2)`, qui **remplace la
  cible de façon atomique** : l'ancien ou le nouveau existe à tout instant. Supprimer d'abord, comme avant,
  était donc inutile en plus d'être dangereux.
- En cas d'échec, repli : l'ancien est **mis de côté en `.bak`** (jamais supprimé), le nouveau prend sa
  place, et seulement alors le `.bak` est effacé. Si le nouveau ne passe pas, l'ancien est remis.
- `lisible(cible)` (dans `fichierCharger`, `echCharger`) et `recupererDossier(d)` (dans `fichierListe`,
  `echListe`) remettent en place un `.bak` orphelin laissé par un arrêt brutal ; un `.bak` périmé est effacé.
- `nomTechnique(n)` cache `.part-…` et `.bak` des listes. Les suppressions effacent aussi le `.bak`.
Toutes les écritures (`fichierSauver`, `echSauver`, écriture par morceaux) passent par là.

*Vérifié avec de vrais fichiers* (JDK, sans Android) : remplacement direct ; premier renommage refusé puis
repli réussi ; nouveau fichier impossible à poser → ancien intact et aucun `.bak` qui traîne ; ancien
impossible à mettre de côté → rien touché ; arrêt brutal simulé → ancien récupéré ; `.bak` périmé effacé.
Le programme de test (`TestFichiers`) rejoindra le dépôt en v134. `MainActivity` compile.

**Stockage : plafonds cohérents et écriture par morceaux — v128**

*Défaut.* `fichierSauver` acceptait 128 Mo, `fichierCharger` n'en relisait que 8 : l'application pouvait
écrire un document qu'elle refusait ensuite de lire. Et un gros rendu voyageait en **une seule chaîne
Base64** : chaîne JS, chaîne Java (UTF-16, deux octets par caractère), octets décodés — plusieurs centaines
de Mo au même moment pour un fichier de 128 Mo.

*Règle adoptée* (`plafondDocument` dans `MainActivity`) :
- tout document que l'application **relit** (`.syx`, `.dat`, `.mid`…) : **8 Mo dans les deux sens** ;
- les **rendus audio** (`.wav`, jamais relus par l'application) : **64 Mo**, soit 6 min 20 s en stéréo
  44,1 kHz 16 bits ;
- échantillons (32 Mo) et réseau (16 Mo) : inchangés, déjà cohérents.
`MAX_DOCUMENT_SAVE_BYTES` a disparu.

*Écriture par morceaux* — trois fonctions du pont : `fichierOuvrir(nom)` → jeton, `fichierAjouter(jeton, b64)`,
`fichierFermer(jeton, valider)` → chemin. Morceaux de 768 Ko (multiple de 3 : les Base64 se suivent sans
remplissage), au plus quatre écritures ouvertes, abandon complet au moindre refus, temporaires `.part-…`
effacés, invisibles dans `fichierListe` et fermés dans `onDestroy`. Le remplacement final passe par
`remplacer(tmp, cible)`, seul endroit à renforcer en v129.

Côté page, `ecrireDocument(p, nom, octets)` choisit les morceaux si le pont les connaît, sinon
`fichierSauver` (pont plus ancien). Utilisée par les trois écritures audio : export de boucle, export de
prise, carte ES-1. Les petits documents restent sur `fichierSauver`.

*Refus avant calcul.* `refusWavTropLong(secondes, taux)` est appelée **avant** le rendu dans `exporterWav`
et `exporterPriseWav` : « TROP LONG : 7 MIN 03 · 6 MIN 20 AU PLUS », au lieu de calculer plusieurs minutes
de son pour finir sur « ÉCRITURE REFUSÉE ».

*Vérifié* : 2,5 Mo transmis en 4 morceaux et reconstitués à l'octet près ; repli sur `fichierSauver` ;
fichier vide ; export TR-909 de 2 mesures à la taille exacte attendue ; boucle de 6 min 27 et prise de
7 min refusées sans rendu.

*Compilation Java de contrôle.* Le Java est désormais **compilé ici avant livraison** : le compilateur du
JDK, avec des classes Android simulées (signatures seulement). Il a été vu échouer sur un `ui.post()`
introduit exprès. Il rejoindra le dépôt avec les contrôles automatiques (v134).

**KAOSS PAD : RÉDUCTION mélange vraiment, PAD MOTION part du premier point — v127**

*RÉDUCTION.* L'écran annonçait « Y le mélange » mais Y réglait un passe-bas : même Y en bas, le son restait
réduit (mesuré : 71 niveaux distincts au lieu d'un sinus lisse). Deux chemins parallèles vers `hache` :
`cw` (après la courbe) et `brut` (son intact). Y va de l'intact pur au réduit pur, dosé par FX DEPTH et
lissé par `lisseKp`. Au repos `cw` = 1 et `brut` = 0 : l'ancien chemin en série, courbe vide. Aucun retard
sur l'un ou l'autre : pas de peigne au mélange. Le passe-bas ne sert plus à cet effet (il gonflait la crête
de 14 % à X = 0).

*PAD MOTION.* `scheduleKp` avançait l'index **avant** de lire : la relecture commençait au deuxième point.
On lit maintenant le point courant, puis on avance. REJOUER repart toujours du premier point (`KP.mpos = 0`),
EFFACER remet l'index à zéro, et l'enregistrement s'arrête à 256 points exactement (257 avant).
Vérifié : un geste de trois points se rejoue 1, 2, 3, 1…, et une relecture relancée repart de 1.

**KAOSS PAD : VITESSE change vraiment la vitesse — v126**

*Défaut.* L'effet n'était qu'un délai de 3 à 53 ms réinjecté : un filtrage en peigne, **aucun changement de
hauteur** (mesuré : un sinus à 440 Hz restait à 440 Hz).

*Correction.* `vitesseKp(r, tau)` agit sur le `playbackRate` des quatre banques, qui sont les seules sources
de la machine. `KP.vitesse` retient la valeur, et `banqueKp` l'applique à une banque rallumée en plein geste.
- **X** : 0,5x à gauche, 1x au centre, 2x à droite — `2^((2x−1)·FX DEPTH)`.
- **Y** : le glissement, de 4 ms (en bas) à 164 ms de constante (en haut). Libellé devenu
  « X la vitesse, Y le glissement » : un mélange sec/traité n'a pas de sens ici, les deux copies se
  décaleraient.
- **Doigt levé** : retour à 1x en glissant (constante 150 ms, environ une demi-seconde) ; **autre effet
  choisi** : retour rapide (20 ms).

Mesuré : 220 / 440 / 880 Hz pour X = 0 / 0,5 / 1, et au relâchement la hauteur redescend de 880 à 440 Hz en
une demi-seconde. Les nœuds de délai ne servent plus qu'à ÉCHO.

**KAOSS PAD : la modulation en anneau est réelle — v125**

*Défaut.* `rgain` valait 0 : l'oscillateur ne modulait rien, le gain de `rmix` restait fixe, et l'effet
ajoutait simplement **une seconde copie du son sec** (mesuré : aucune fréquence somme ou différence, niveau
multiplié par 2,4).

*Correction.* `rgain` vaut 1 en permanence, la base de `rmix` reste à 0 : la sortie est **signal × sinus**.
Un nœud `sec` (entre `hache` et `out`) et un nœud `rwet` (après `rmix`) se partagent l'unité selon Y ;
les autres effets gardent `sec` à 1. Mesuré sur un sinus à 1 kHz, X au milieu (268 Hz) : Y en haut, le
1 kHz disparaît, 732 Hz et 1268 Hz sortent à parts égales, **crête égale au son sec**. Un gain de 1,2 a été
essayé puis écarté : +1,6 dB de crête.

`lisseKp(param, v)` : `cancelAndHoldAtTime` puis `setTargetAtTime` (12 ms) — utilisée pour la fréquence de
l'anneau, `sec` et `rwet`. Le dosage suit le doigt sans crépiter, et le retour au repos se fait en douceur.
Les sept autres effets sont inchangés (niveaux comparés avant/après ; la réverbe varie d'un essai à l'autre,
son impulsion étant tirée au hasard).

**L'atténuation quitte la voie de mixage — v124**

L'analyse de la v122 l'avait classé *critique* : posée sur un gain commun (la tranche de mixage), l'atténuation
de charge touchait **aussi les sons déjà lancés**. Trois défauts : les queues de crash et de ride **pompaient**
à chaque pas ; après STOP, le gain **restait bas** et une frappe à la main sortait trop faible ; le premier pas
dépendait de l'existence de la voie. La v123 avait étendu ce défaut aux quatorze machines.

*Correction.* Le gain est maintenant **propre à chaque pas** :
- `ouvrirPas()` ouvre le pas (il remplace le `0` de `var CHARGE_N = ...`, et le `n` de `scheduleTr`) ;
- les voix se branchent par **`pasVoie(dest)`** au lieu de `dest` : pendant un pas ouvert, cela rend un gain
  neuf, un par destination, branché sur `dest` ; hors pas (frappe à la main, MIDI), cela rend `dest` tel quel ;
- `attenuerVoie(id, n, t)` referme le pas et pose `attenuationPas(n)` sur ses gains. Les nœuds sont neufs,
  rien n'y passe encore : valeur posée directement, sans rampe.
- un ordonnanceur qui sort avant `attenuerVoie` voit son pas refermé à la fin de la tâche (micro-tâche).
- `busSet` ne crée plus de nœud `att` et rend de nouveau `e`.

*Où sont les `pasVoie`* : à la déclaration de `dest` (EM `voixSynth`, ER, EA, ES, EMX, ESX, DrumBrute),
dans `jouerTimbre` (via `outMix`/`outBd`), sur chaque `.connect(dest)` des voix 808/909/707/606 (`dest` y sert
aussi à `dest.gain`, qu'il ne faut pas détourner), et sur les branchements finaux de MPC, archive, TR-1000
(huit), volca, K.O!, MC-101, SmplTrek.

**Règle pour toute nouvelle voix** : brancher sa sortie par `pasVoie(...)`. `verifier-charge.py` le contrôle
désormais (pas ouvert, voix branchées, plus d'atténuation dans `busSet`) — **vu échouer** sur une copie où
`voixKo` n'était plus protégée.

**Le défaut de charge, corrigé sur TOUTES les machines — v123** *(mécanisme remplacé en v124, voir ci-dessus)*

La v122 ne corrigeait que la TR. Un relevé automatique a montré que **treize autres machines** pouvaient
lancer de huit à seize voix sur un même pas sans protection : ARCM et K.O! (16), SmplTrek, MC-101, MPC,
EMX (16), ESX (14), EM-1, ER-1, TR-1000, volca (10), ES-1 (9), DrumBrute (8).

**Le mécanisme est désormais unique et vit dans la voie de mixage**, pas dans les machines :
`busSet(id)` crée un nœud `att` en tête de tranche et **rend celui-ci** au lieu de `e`.
`attenuerVoie(id, n, t)` le règle ; `attenuationPas(n) = n^−0,75`.

**L'idée qui débloque tout** : les ordonnanceurs programment **à l'avance**. On peut donc compter les voix
*pendant* la boucle et poser l'atténuation *après*, avant que le son ne joue. **Aucun pré-comptage n'est
nécessaire**, et les conditions les plus tordues — hasard de la DrumBrute, longueurs de piste séparées —
sont traitées sans effort.

La TR a été **alignée sur ce mécanisme commun** ; son `TR.bus.att` et `attenuationTr` ont disparu. Deux
mécanismes pour le même défaut auraient été un piège de maintenance.

*Précaution prise lors de l'édition en masse des 14 ordonnanceurs* : l'insertion du compteur se fait par
l'opérateur virgule (`CHARGE_N++, voix(...)`), dont la **priorité est très basse**. Placé après un `&&`,
un `||` ou un `?`, il ferait sauter la condition et la voix jouerait toujours. Les 20 sites ont été
vérifiés un par un : aucun n'est dans ce cas, et `verifier-charge.py` le revérifie à chaque passage.

**`verifier-charge.py`** ajouté au dépôt. Il recense les ordonnanceurs depuis `schedule:`, distingue ceux
qui bouclent sur des voix de ceux qui n'en jouent qu'une, contrôle que l'atténuation est posée **après**
les voix, et vérifie la priorité de l'opérateur virgule. **Vu échouer** sur une copie dont on avait retiré
une protection.

**Le son se coupait dès qu'un motif se chargeait — v122**

Signalé sur la TR-707, et ce n'est pas propre à elle.

*Cause.* Une boîte à rythmes pose jusqu'à seize frappes sur le **même pas**, attaques rigoureusement
simultanées. Les crêtes s'additionnent donc **en amplitude**, pas en puissance : seize voix font seize fois
la tension d'une seule, soit **+24 dB**. Le limiteur de sortie (seuil −1,2 dB, rapport 20, retour 90 ms)
voyait ce dépassement, **plongeait de quinze décibels**, puis remontait en moins d'un dixième de seconde
entre un pas chargé et un pas vide. D'où le son qui se coupe et revient.

*Correction — à la source, pas au maître.* `TR.bus.att`, un gain inséré entre le bus des voix et la voie de
mixage, réglé selon le nombre de frappes du pas, dans `scheduleTr`.

**Le choix de l'exposant, `attenuationTr(n) = n^−0,75`** :
- `1/n` garderait la crête rigoureusement constante — mais alors un pas chargé sonnerait **aussi fort**
  qu'un pas à une frappe, ce qui est faux : un roulement complet *est* plus fort.
- `1/√n` conserve la puissance, ce qui vaut pour des sources indépendantes, pas pour des attaques
  simultanées.
- **0,75 tient entre les deux.** Mesuré : la plongée du limiteur passe de **15,6 dB à 2,7 dB** sur huit
  frappes, et chaque doublement du nombre de frappes gagne toujours **+1,5 dB** — la dynamique est
  conservée.

*Deux détails qui comptent* :
- l'atténuation est posée **20 ms avant la frappe** (`t − 0.02`, borné par `maintenantAudio()`), sinon elle
  arriverait après la crête d'attaque, donc trop tard pour servir ;
- **`setTargetAtTime` et non `setValueAtTime`** (5 ms) : un saut net de gain ferait un clic sur les queues
  longues, crash et ride. Et rien n'est posé si la valeur ne change pas.
- Le flam double le nombre de frappes : il est compté.

**À généraliser** : toute machine capable de frapper beaucoup de voix sur un même pas a ce défaut —
DMX, DrumBrute, TR-1000, archive. Le mécanisme est celui-ci, il suffit de le reproduire.

**KAOSS PAD : une source, et tout l'écran — v121**

Deux reproches, le premier étant une **faute de conception de ma part**.

*« Je n'arrive pas à sortir de son. »* Normal : j'en avais fait un **effet sans source**. Et j'avais mal
lu la machine — sur un KP3, **A à D sont des banques d'échantillons**, pas des groupes d'effets. Je les
avais câblées sur le choix de l'effet, ce qui privait la machine de la seule chose qui la fait sonner.
Corrigé : quatre banques qui jouent en boucle, bouton `SON` pour changer l'échantillon de la banque
choisie. La machine se suffit désormais à elle-même.
- `banqueKp(k, allumer)` **relance toujours une source neuve** : un `BufferSource` arrêté ne se rallume
  jamais, c'est la règle de Web Audio. Vérifié, y compris qu'éteindre n'en relance pas une.
- `toutArreterKp()` dans `arretKp` : quitter la machine ne laisse aucune boucle tourner.

*Le pavé était trop petit.* `body.kp .kpb` passe en colonne sur `min-height:82vh`, réglages en haut en
lignes de quatre, **pavé en `flex:1`** — il prend toute la hauteur restante. Point du doigt agrandi à
34 px.

**La leçon** : avant de porter une machine, vérifier **à quoi servent ses commandes sur l'original**. Des
banques d'échantillons transformées en sélecteur d'effet, ce n'est pas une simplification, c'est un
contresens qui rend la machine muette.

**Sommaire des modules, et le KAOSS PAD — v120**

*Sommaire.* L'onglet MODULES EUR. contenait déjà **les 103 fiches** — chacune nommée, expliquée, avec ses
potards et ses prises. Ce qui manquait n'était pas le contenu mais la **carte** : 43 ko d'affilée sur un
téléphone, c'est un mur. Ancre `fm-…` sur chaque fiche et sommaire par famille en tête. Vérifié :
103 liens, 103 ancres, aucun orphelin ni doublon.

*Vingt-neuvième machine : KORG KAOSS PAD.* La seule dont la commande principale est une **surface**.

- Huit effets, tous bâtis **dans un graphe unique** monté une fois : `appliquerKp()` remet tout à neutre
  puis n'active que ce que l'effet courant demande. **Ne pas reconstruire le graphe au changement
  d'effet** — cela ferait un trou dans le son, et c'est justement pendant qu'on joue qu'on en change.
- **Sans HOLD, l'effet meurt avec le doigt** (`KP.touche` tombe à `pointerup`). C'est ce qui rend la
  machine vivante plutôt que réglable ; ce n'est pas un oubli.
- **PAD MOTION** relève la position **dans `scheduleKp`**, donc au rythme du séquenceur : la boucle est
  calée sur le tempo et retombe toujours en mesure, quelle que soit la vitesse du geste d'origine. C'est
  le choix qui fait toute la différence avec un relevé au temps réel.
- L'effet « VITESSE » module le temps d'un délai très court : pas de transposition véritable sans rendu,
  mais c'est ainsi que les premières machines le faisaient.
- **C'est un effet, pas une source** : seule, la machine est silencieuse. Elle se met dans un set avec une
  autre, par la table de mixage. Dit dans la notice.

**Quatre modules, et une vraie synchronisation dure — v119**

99 → 103.

**Le morceau de bravoure : `bufSyncEur`.** La synchronisation dure n'existe pas en Web Audio — aucun
oscillateur ne permet de remettre sa phase à zéro. Mais **une onde synchronisée est périodique** : elle se
répète à la fréquence du maître. On dessine donc **un seul de ses cycles** dans un tampon et on le lit en
boucle. C'est **exact**, pas une approximation, et ça ne coûte qu'un `BufferSource`.
- Cache par crans de 0,05 : 51 tampons au pire, 3 ko chacun.
- **Correction de repliement** (polyBLEP) sur les deux échantillons entourant chaque rupture : sans elle
  une dent de scie brute replie tout son spectre, d'autant plus que le tampon est lu vite. Mesuré :
  l'énergie du haut du spectre passe de 6,7 % à 3,4 % au rapport 4. Le mordant reste.
- `SYNC RATIO` change le **nombre de tours**, pas la hauteur : les deux oscillateurs restent à la même
  fondamentale, seul le timbre bouge. C'est ce qui fait qu'une synchronisation ne sonne jamais faux.

Les trois autres : **ENSEMBLE** (16 oscillateurs répartis sur les degrés d'une gamme, donc justes entre
eux quel que soit SPREAD), **BATTERING RAM** (le clic fait la caisse, plus une sortie d'enveloppe pour le
ducking), **HEAD** (mélangeur à départ d'effets **post-fader**, ce qui manquait à MIX 4).

**Piège rencontré** : la fonction d'aide `bufSyncEur` avait été insérée **à l'intérieur de l'objet
`EUR_CAT`**, où seules des entrées `clé: valeur` sont permises — erreur de syntaxe immédiate. Une fonction
d'aide se pose **avant** `var EUR_CAT = {`, jamais entre deux modules.

**Trois modules de plus — v118**

96 → 99.

- **SQUID SALMPLE** (perc) — **huit entrées, une par canal** : chaque prise *est* un son, on n'en choisit
  aucun. `BANK` décale les huit ensemble dans `ES_BANQUE`. `QUALITY` est une **réduction de résolution**
  (escalier `Math.round(x·n)/n`), pas une saturation — vérifié : 5 paliers au minimum, aucune courbe au
  maximum, le son passant alors intact. `REVERSE` réutilise `bufArcmInverse`, le cache de tampons
  retournés de la machine d'archive.
- **KAMIENIEC** (effet) — douze cellules passe-tout ; **A additionne le déphasé, B le soustrait**
  (`humB.gain = −mix`). Les deux sorties sont complémentaires : ce qui creuse sur A bosse sur B.
  `MODE` n'en active que 2, 4, 6 ou 12 — les inactives sont **poussées à 20 kHz**, donc inertes, plutôt
  que débranchées : pas de reconstruction de graphe sur un tour de potard.
- **CORAL** (osc) — voix complète. `HARM` transpose par intervalles **justes** (quinte, octave) ; `MORPH`
  désaccorde ET écarte en stéréo par `StereoPanner`, la largeur venant de là et non d'un effet.

*Piège du banc, deuxième fois* : `banqueEs`, `ES.buf` et `ES_BANQUE` manquaient au banc d'essai, d'où deux
faux échecs successifs sur SQUID. **Le banc ne connaît que ce qu'on lui donne** — quand un module neuf
échoue sur un symbole qui existe manifestement dans le fichier, compléter le banc avant de douter du code.

**Sept modules Eurorack — v117**

89 → 96. Chacun apporte un mécanisme, pas une variante.

- **PLASMA** (effet) — `tanh` à très fort gain : la pente au centre devient verticale, ça **casse** au lieu
  de saturer. L'**octave** vient d'un redressement (`|x|`), qui double exactement la fréquence apparente —
  gratuit et juste. Rattrapage de niveau décroissant avec le drive.
- **PLEXIPHON** (effet) — six peignes de longueurs premières entre elles **précédés de deux passe-tout**.
  Ce sont eux qui font la différence entre six échos distincts et une matière. Réinjection bornée à 0,92.
- **KERMIT** (mod) — deux LFO, et **C = A×B**, obtenu en branchant B sur le *gain* de A : une vraie
  multiplication, sans nœud dédié. D = A+B. Ce n'est pas quatre LFO mais une famille.
- **ABACUS** (mod) — quatre enveloppes aux réglages partagés, **plus leur somme**. `CURVE` bascule la
  descente entre droite et exponentielle.
- **PISTON HONDA** (osc) — table d'ondes à trois axes ; **Z déphase les partiels** (`re`/`im` de
  `createPeriodicWave`), l'onde perd sa symétrie sans changer de spectre.
- **MUTANT HIHATS** (perc) — réutilise `trMetal` (le banc métallique pré-calculé de la v72). Sa raison
  d'être est l'**exclusivité** : `m.ouvert` garde le gain du charley ouvert en cours, coupé par
  `setTargetAtTime` à la frappe suivante, ouverte ou fermée. Vérifié.
- **STEPS** (seq) — six pas ; **GATES est un masque** qui tait un pas *sans effacer sa tension*. Entre dans
  la liste des modules qui propagent une impulsion, vérifié par la sonde.

*Piège du banc, pas du code* : `trMetal` n'était pas dans le banc d'essai, d'où un faux échec sur MUTANT.
La fonction est bien dans le fichier, et une **déclaration de fonction est hissée** — sa position (64 %)
avant ou après le catalogue (74 %) n'a aucune importance à l'appel. Banc complété.

**Deux corrections signalées — v116**

*1. Du texte brut au milieu de la TR-909.* `<div class="bt"> style="width:44px;height:44px">` — la balise
était **déjà fermée** avant l'attribut, qui s'affichait donc comme du texte. Séquelle de la **v71**, quand
j'ai déplacé les identifiants de potards du `.bt` vers le bloc conteneur : l'attribut de taille est resté
orphelin sur `tr8-k-tempo` et `tr8-k-vol`. Réparé, et vérifié qu'il n'en reste **aucun autre** dans le
fichier (recherche de tout `>` suivi d'un attribut).

*2. La MC-101 s'affichait avec la DRM16.* `body.mc` ne cachait **rien** — la même faute qu'en v114.

**Mais le vrai défaut est dans le contrôle, qui n'a rien vu.** `verifier-facades.py` ne considérait comme
façade que les éléments ayant une règle `body.X … {display:block}`. Or **la DRM16 est visible sans aucune
classe** : `#unit` n'apparaît jamais en `display:block`, il n'était donc pas dans la liste des façades à
tester. Le contrôle vérifiait consciencieusement tout… sauf la seule façade qui manquait.

Corrigé : **toute façade citée dans une règle `body.X …` compte**, qu'elle soit montrée ou cachée.
20 façades au lieu de 19. Et j'ai vérifié que le contrôle **attrape bien le défaut** en le recréant sur une
copie — sans quoi je n'aurais aucune raison de croire qu'il protège de quoi que ce soit.

**Un contrôle qui passe n'a de valeur que si on l'a vu échouer.**

**Vingt-huitième machine : Roland MC-101 — v115**

Quatre pistes (une rythmique, trois mélodiques), quatre clips chacune, et le **SCATTER**.

*Le SCATTER ne modifie rien.* Il change **quel pas est joué**, pas le son : `scatterMc(i)` rend
`{pas, coups}` et `scheduleMc` s'en sert pour lire le clip ailleurs. Le motif reste intact — on coupe et
tout revient. C'est pour cela qu'il s'entend sur une seule caisse claire, là où un effet audio aurait
besoin de matière.

*La profondeur ne règle pas l'intensité mais **combien de pas sont touchés**, en partant de la fin* :
`seuil = (1 − profondeur) × 16`. À faible profondeur, seuls les derniers pas se déforment — on obtient une
**cassure avant le retour** au lieu d'un désordre permanent. C'est ce qui le rend musical, et il ne faut
pas le « simplifier » en un réglage d'intensité.

Les huit types vérifiés au banc sur une mesure témoin, la profondeur sur trois valeurs, et le clip
recontrôlé intact après tous les passages.

*Trois demandes, un verdict par machine* :
- **MC-101** — faite.
- **electribe sampler (2015, rouge)** — à faire. C'est **une autre machine que l'ESX-1** déjà présente :
  seize parties au lieu de neuf, oscillateurs *et* échantillons, pavé tactile X/Y, motion sequencing.
- **TR-909 de la troisième photo** — ce n'est pas la machine mais un **logiciel**. La 909 existe déjà ici
  avec la disposition du matériel, une voix à la fois. Ce qu'apporte la photo est une **vue en grille** :
  toutes les voix visibles, coupe-son et solo par voix, flam, shuffle, variations A/B. À faire comme une
  **vue de la TR existante**, pas comme une machine de plus.

*Contrôle amélioré* : `verifier-facades.py` tire maintenant la liste des classes de `CLASSES_MACHINE` —
une machine ajoutée sans toucher au script est quand même contrôlée. 19 façades, toutes exclusives.

**Deux façades s'affichaient ensemble — v114**

Signalé : la SmplTrek et le K.O! apparaissaient à côté d'une autre machine.

**Deux fautes, la seconde bien pire que la première.**

1. *Listes de masquage incomplètes.* Une façade est visible par défaut et **cachée par la classe des autres
   machines** : `body.arcm` en cache quatorze. Mes deux nouvelles n'en cachaient **aucune**. Corrigé.

2. *Une insertion de style tombée au milieu d'un sélecteur.* J'avais ancré sur **`.dmxb{`**, et
   `s.index` a trouvé l'occurrence **à l'intérieur de `body.dmx .dmxb{display:block}`**. Mes 6 898 octets
   de style se sont glissés entre `body.dmx ` et `.dmxb{`, ce qui a produit deux dégâts : la première
   règle de mon bloc est devenue `body.dmx .stkb{…}`, et surtout **`.dmxb{display:block}` s'est retrouvée
   seule**, rendant la DMX visible en permanence. Règle reconstituée, styles déplacés avant le chapitre.

**C'est la troisième fois qu'une ancre trop courte frappe** (`if(m === "arcm")` en v112, `var NOMS` en
v101). **Ancrer sur une ligne entière, jamais sur un fragment qui peut exister en sous-chaîne.**

*`verifier-facades.py`* ajouté au dépôt : il recompose les règles CSS en dépliant les `@media` — leurs
accolades imbriquées cassent toute analyse à plat — et calcule, par spécificité et ordre source, ce que le
navigateur retiendrait. Il confirme que **chacune des dix-huit machines montre la sienne, et elle seule**.
À relancer après toute nouvelle machine ou tout ajout de style.

*Faux positif écarté* : le compte d'accolades du style est déséquilibré de −1, mais **il l'était déjà en
v108** — ce n'est pas une régression.

**Vingt-septième machine : SmplTrek — v113**

**Modèle de données nouveau dans l'application, et c'est tout l'intérêt.** Les vingt-six autres machines
ont un motif qui contient tout, sons compris. Ici : `STK.pistes[10]` **persistent** (son, tune, decay,
filtre, niveau, pan, coupe) et `STK.motifs[8]` ne portent **que les masques de pas**. On change de motif
sans perdre son mixage — c'est ce qui distingue une station multipiste d'une boîte à rythmes.
Vérifié au banc : changement de motif, réglages de piste intacts.

*L'écran.* `enveloppeBuf(buf, cols)` calcule la crête par tranche **directement sur le tampon** : le son
est déjà chargé, il n'y a **rien à rendre**. 44 100 échantillons en 9 ms. À ne pas confondre avec
`ondesEnr()` de l'enregistreur, qui doit rendre chaque piste hors ligne parce que le son n'existe pas
encore. `STK.ondePour` évite de recalculer tant que l'échantillon ne change pas.

*Gestes* : toucher une piste déjà choisie la **coupe** ; un pas qu'on allume se fait entendre aussitôt ;
un pas sur quatre est accentué, ce qui donne une assise sans écrire de vélocités.

*Contrat rempli*, et le contrôle automatique vérifie maintenant que **les 19 voies de la table ont chacune
un moteur, une façade et une machine** — c'est ce qui a rattrapé l'oubli de `uniteDeVoie`.
`.stk-kn` ajouté à `estCommande`, sans quoi tourner un potard déplacerait la façade.

**Vingt-sixième machine : PO-33 K.O! — v112**

Échantillonneur de poche. Seize emplacements — **huit mélodiques** (le même son sur une gamme majeure, par
`playbackRate`) et **huit percussifs** —, séquenceur de seize pas, seize motifs.

*Sa signature : les effets au poing.* `KO.fxTenu` vit entre `pointerdown` et `pointerup` sur le bouton FX ;
`appliquerFxKo()` pose les valeurs **d'un coup, sans transition** — un effet au poing s'entend ou ne
s'entend pas. Deux des huit (**HACHOIR**, **ROULEMENT**) n'agissent pas sur le son mais dans `scheduleKo` :
ils changent ce qui est joué, pas comment ça sonne. Vérifié au banc.

*Détails :*
- `courbeCrushKo()` est un **escalier** (`Math.round(x·16)/16`), pas une saturation. 33 paliers.
- `noeudsKo()` bâtit la chaîne **une fois** et la garde ; `arretKo` passe par `debrancherTout`.
- L'écriture au vol réutilise `pasLePlusProche`, comme les autres machines.

*Les dix points du contrat d'une machine*, tous remplis : `CLASSES_MACHINE`, tuile `data-m`, façade
`#unit-ko`, `MACHINE_KO`, `allerMachine`, `docDeLaMachine`, `routageMidi`, `SET_VOIES` + `moteurSet`,
`uniteDeVoie` + `allerVoie`, mémoire (`memKo`/`chargerKo` appelée au démarrage).

**Deux pièges rencontrés, à retenir** :
- `if(m === "arcm")` existe dans **`docDeLaMachine` ET `routageMidi`** : une insertion sur cette ancre
  atterrit dans la première. Toujours ancrer sur la ligne complète.
- Dans `routageMidi`, **`base` est le NOMBRE de voix**, pas un numéro de note : `rangMidi` fait
  `note − MIDI.base` et vérifie `< r.base`. J'avais d'abord écrit `base:36`.

**Reste à faire : le Sonicware SmplTrek.** Dix pistes, écran à forme d'onde, mode morceau — c'est une
station portable, pas une boîte. Elle mérite sa propre version et un modèle de données à part : les
machines existantes ont toutes un motif unique par voix, elle a des pistes qui s'enregistrent.

**Une vue restait ouverte derrière le menu — v111**

Signalé : ouvrir une machine depuis la table, revenir au menu, et la machine reste visible en arrière-plan.

Cause : `poserMachine()` retirait `plein` mais **pas `ensemble`**, et `ouvrirMenu()` ne nettoyait rien. Le
mode d'ensemble était donc le seul qu'on pouvait quitter **par le bouton MENU** sans le refermer : la
classe restait posée, `#scene` restait en rangées, et toutes les façades non masquées restaient visibles
derrière celle qu'on venait de choisir. `ENS.actif` restait vrai par-dessus le marché, donc `draw()`
continuait d'animer les curseurs de machines invisibles.

**`remettreVueAPlat()`** est maintenant le seul endroit qui défait une vue : classes `plein` et
`ensemble`, `ENS.actif`, et les `.ens-cache` des façades. Appelée par **`poserMachine()`** et par
**`ouvrirMenu()`**, qui referme aussi tous les panneaux. `fermerEnsemble()` s'en sert également.

**Toute vue d'affichage ajoutée plus tard doit se défaire ici**, pas dans son propre coin — c'est
exactement l'erreur qui a produit ce bug.

Vérifié sur les trois chemins : quitter l'ensemble par MENU puis choisir une machine, passer directement
d'une façade à l'autre depuis l'ensemble, et changer de machine depuis le plein écran.

**Revue extérieure du code natif — v110**

Un audit extérieur a porté sur le **Java**, la partie la moins travaillée jusqu'ici. Presque tout est
retenu. Les défauts trouvés étaient réels et je ne les avais pas vus.

*Lecture et écriture de fichiers.* `in.read(o)` en **un seul appel** ne garantit pas de remplir le
tableau : troncature intermittente possible. `lireFichierComplet(File, max)` boucle et lève sur EOF.
`ecrireAtomique()` centralise `.part` + `sync` + `rename`, avec nettoyage en `finally` — l'ancien code
pouvait laisser des `.part` derrière lui. Plafonds de taille **avant** allocation (`depasseBase64` teste la
longueur de la chaîne, donc avant le décodage).

*Réseau.* `read(...) > 0` terminait la boucle sur un retour 0, pourtant légal : **téléchargement tronqué**.
Corrigé en `!= -1`. Le protocole est revérifié **après** connexion : `HttpURLConnection` suit les
redirections, une redirection https → http passait inaperçue. `reseau.shutdownNow()` et un drapeau
`detruite` dans `onDestroy` : sans eux, un rappel touchait une WebView détruite.

*`evaluateJavascript`* recevait des arguments assemblés à la main ; seul le message d'erreur était nettoyé,
et pas des retours à la ligne. Passé par `JSONObject.quote`.

*`startForegroundService` sur Android 8+* : `startService` depuis l'arrière-plan **lève une exception** avec
`targetSdk 34`. Vérifié avant d'accepter : `PlaybackService` appelle bien `startForeground` dès
`onStartCommand`, et `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` sont déclarées — sans quoi
ce « correctif » aurait introduit un plantage.

*MIDI.* Deux erreurs de norme, exactes : `envoyer` calculait les longueurs par famille, donc **F1 en 3
octets et F6 en 3** au lieu de 2 et 1 ; et le running status **survivait à un System Common**, qui doit
l'annuler. Ajoutés : garde de génération sur `openDevice` (rappel périmé après changement d'appareil),
remise à zéro du parseur à la fermeture, et rejet d'un SysEx trop long au lieu d'en livrer un tronqué.

*Côté page.* `moteurSet` n'utilise plus `eval` mais des références directes (la table est construite à
l'appel, tous les `MACHINE_*` existent alors). Le nom d'une prise passe par `textContent` : il vient d'un
`prompt`, un `<` cassait l'affichage.

**Seul point écarté : `setSafeBrowsingEnabled(false)`, rétabli.** La WebView ne navigue jamais hors de ses
propres ressources — `shouldOverrideUrlLoading` bloque tout le reste — donc SafeBrowsing n'a rien à
vérifier et son initialisation ne fait que retarder le démarrage. **À rétablir si un jour la WebView charge
une page distante.**

*Piste retenue pour plus tard* : découper `drm16.html` en modules sources et regénérer un fichier unique.
Le fichier fait 1,1 Mo et chaque ajout le rend plus difficile à naviguer.

**Voir plusieurs machines à la fois — v108**

L'idée est de l'utilisateur, et elle est bien meilleure que la mienne : **garder les façades à leur
échelle** et les ranger côte à côte. Tout le problème que je croyais insoluble — mettre dix-sept façades à
l'échelle — disparaît.

**Le levier, trouvé en relisant le CSS** : une façade n'est pas montrée par sa classe, elle est **cachée
par la classe des autres machines** (`body.mpc #unit`, `body.mpc .em`…). Sans aucune classe sur le corps,
elles s'affichent donc **toutes**. `ouvrirEnsemble()` appelle `poserMachine()` sans argument, puis masque
nommément celles qu'on ne veut pas (`.ens-cache`). Aucun changement au mécanisme existant.

- Les façades étaient **filles directes du corps**, sans conteneur : `faireScene()` les regroupe une fois
  au démarrage dans `#scene`, qui devient une boîte en `flex-wrap`. Vérifié avant de le faire : **aucun
  sélecteur du fichier n'utilise « enfant direct du corps »**, et déplacer des nœuds ne perd aucun écouteur.
- `#scene{display:contents}` hors mode ensemble : le conteneur est transparent pour la mise en page, rien
  ne change en usage normal.
- `.ens-cache` a besoin de `!important` : plusieurs façades sont montrées par un sélecteur d'identifiant,
  qui l'emporterait sur une classe.
- `draw()` fait avancer le curseur de **toutes** les machines du set, chacune sur `pasSet % sa longueur`.
- `uniteDeVoie()` : les dix-sept voies pointent chacune vers une façade **distincte**, vérifié
  automatiquement — ma première table était devinée et se trompait sur huit identifiants.
- Refus explicite si aucune machine n'est choisie, plutôt qu'un écran vide.

**La table devient une vraie console — v107**

Les tranches n'avaient que niveau et panoramique. Elles ont maintenant la chaîne complète, **dans l'ordre
où le signal la traverse** : entrée → **gain d'entrée** → grave → médium → aigu → **fader** → panoramique →
**mesure** → mélange.

- **Le gain d'entrée n'est pas un doublon du fader.** Il agit **avant** l'égaliseur et la mesure : c'est
  lui qu'on règle d'abord. Le coupe-son fait tomber le fader et **laisse le gain intact** — en rouvrant,
  le réglage est retrouvé. Vérifié.
- Égaliseur trois bandes : `lowshelf` 180 Hz, `peaking` 1100 Hz (Q 0,9), `highshelf` 4200 Hz.
  `dbEq(v)` : **0 → −26 dB, 0,5 → 0 dB, 1 → +6 dB**, la course d'une vraie table — asymétrique à dessein,
  on coupe franchement et on remonte avec mesure. Ne pas la « corriger » en symétrique.
- Bargraphes par `AnalyserNode` après le panoramique, lus en `requestAnimationFrame` tant que la table est
  ouverte. **Le niveau monte instantanément et descend lissé** (`×0,82 + ×0,18`) : un indicateur qui
  retombe d'un coup ne se lit pas.
- Tranches **verticales**, table défilant horizontalement. `busSet` rend désormais **`b.e`** (l'entrée) et
  non plus `b.g` : le routage des 31 sorties passe par `busSet(...)`, il reste donc juste.
- `SET.trim/lo/md/hi` entrent dans la mémoire, avec relecture.

**Reste à faire, demandé** : voir la table **et** les machines actives sur un même écran. Les façades sont
affichées par une classe posée sur `<body>` (`CLASSES_MACHINE` + `poserMachine`) qui n'en autorise
**qu'une seule** ; `fit()` ne met à l'échelle que `actif`, et `draw()` n'anime que `MACHINE`. C'est un
chantier à part entière, à ne pas improviser.

**Formes d'onde par piste — v106**

*Défaut trouvé en chemin* : **la vue se vidait à l'arrêt.** `enrArreter` transférait les événements dans la
prise puis faisait `ENR.evts = []` — le canevas devenait blanc, et la promesse « à l'arrêt elle montre la
prise entière » était fausse depuis le début. `ENR.affiche` porte désormais la prise montrée, posée
automatiquement à l'arrêt et par le bouton **VOIR**. `evtsAffiches()` et `pistesDe(evts)` en découlent.

*Les ondes.* `ondesEnr()` rend **chaque piste séparément** hors ligne et garde son enveloppe.

**L'économie décisive : `ONDE_TAUX = 8000` en MONO**, au lieu de 44 100 en stéréo. Une forme d'onde n'a
besoin que de quelques centaines de colonnes ; le dessin est rigoureusement identique pour **onze fois
moins d'échantillons** — 4,8 M au lieu de 53 M pour dix pistes d'une minute. **Ne pas « améliorer » en
montant la qualité** : on ne verrait aucune différence et le calcul deviendrait intenable sur téléphone.

- Les rendus s'enchaînent **un par un** (`suivante(k)`) : deux contextes hors ligne en parallèle se
  disputeraient les mêmes variables globales de machine.
- `enveloppe()` garde la **crête** de chaque tranche, pas la moyenne — une percussion sèche disparaîtrait
  en moyenne. Vérifié : trois coups espacés retombent aux colonnes 0, 200 et 400 sur 600, crête 0,99.
- `ENR.ondesPour` mémorise `nom + "/" + decoupe` : changer de prise **ou** de découpage invalide les ondes,
  puisque les pistes ne sont plus les mêmes.
- Au-delà de 16 pistes, refus explicite plutôt qu'un calcul interminable.

**Enregistreur : allure de séquenceur — v105**

Deux reproches justes : les explications étaient mêlées aux commandes, et l'affichage ne ressemblait pas à
un séquenceur.

*Séparation.* Tout le texte part dans un onglet de notice **`note-enr`**, ouvert par un bouton **MODE
D'EMPLOI** en haut du panneau — même schéma que la table de mixage. Le panneau ne contient plus que des
commandes : une barre de transport, la vue, puis l'aiguillage et les prises.

*Allure de séquenceur.* `.enr-corps` est une boîte défilante contenant deux colonnes : `.enr-tetes`
(noms + M + S, en `position:sticky` à gauche) et le canevas.

**La clé de l'alignement : `ENR_H = 34` et `ENR_REGLE = 22`, en dur des deux côtés.** La hauteur de piste
est **fixe**, le canevas grandit avec le nombre de pistes (`22 + n × 34`) et c'est la boîte qui défile.
La colonne des noms commence par un `.enr-espace` de 22 px qui laisse passer la règle, ce qui met la
première ligne en face de la première bande. Vérifié : dessin et HTML tombent au même pixel de la piste 0
à la piste 15. **Changer une de ces deux valeurs oblige à changer l'autre.**

- **La limite de seize pistes est levée** : la boîte défile, toutes les pistes reçues sont montrées.
- Règle en secondes, graduation adaptée pour tenir environ seize repères quelle que soit la durée —
  1 s sur huit secondes, 19 s sur cinq minutes.
- `majPistesEnr()` n'est plus qu'un renvoi vers `majTetesEnr()` : l'ancienne liste empilée sous la vue a
  disparu, ses appels restent valables.

**Rendre une prise MIDI en WAV — v104**

Une prise en `.mid` contient des **notes** : il faut la même application pour la réentendre. En `.wav` on
repart avec le **son**. C'est ce qui rend le téléphone vraiment autonome pour enregistrer un live.

`exporterPriseWav(i)` reprend exactement le schéma d'`exporterWav` — contexte hors ligne, `batirAudio()`,
`remettre()` avec `razNoeudsMachines()` et restitution des quatre sorties de la DRM16. La différence : au
lieu d'un motif répété, on déroule les événements datés, chacun sur la machine de son canal.

**La pièce centrale : `maintenantAudio()`.** Un `OfflineAudioContext` n'a **pas d'horloge qui avance** —
`currentTime` reste à zéro jusqu'au rendu. Toutes les notes se seraient superposées au premier instant.
`OFF_T` porte l'instant voulu pendant la boucle de rendu, `-1` le reste du temps.
**Les 108 `ctx.currentTime` du fichier sont passés par cette fonction.** C'est sans danger parce que la
boucle de rendu est **synchrone** : aucun minuteur, aucune animation ne tourne pendant qu'`OFF_T` est posé.
**Le test est `OFF_T >= 0` et non `> 0`** : zéro est un instant valide, sinon la première note serait perdue.

Autres points :
- `allerMachineRendu()` évite de reconstruire une façade à chaque note quand un live reste sur la même
  machine. Sur un live qui alterne à chaque note, la reconstruction revient — accepté.
- Les pistes **coupées ne sont pas rendues** : `passeEnr` est appliqué là aussi.
- Bouton **NOMMER** sur chaque prise.
- Le tempo affiché porte la mention « (mesuré) » quand il vient de l'horloge de la machine.

**Enregistreur : tempo, départ, coupe-son, boucle — v103**

Cinq améliorations, par ordre d'importance.

1. **Tempo réel.** La prise gardait `S.bpm`, le tempo de l'application, alors que c'est la machine branchée
   qui mène : le `.mid` exporté annonçait un tempo faux et rien ne tombait sur la grille. L'horloge MIDI
   arrivait déjà et **on la jetait**. `enrHorloge()` garde les instants des tics (24 par noire, fenêtre de
   quatre noires) et en tire le tempo. Vérifié à 92, 128 et 174 BPM : **écart nul**.
2. **Départ à la première note** (`ENR.attente`, `ENR.vierge`). `ENR.depart` est recalé sur la première
   note reçue ; **seules les notes ouvrent la prise**, pas les contrôleurs — sinon un mouvement de potard
   avant de jouer rouvrirait le vide qu'on voulait couper.
3. **Coupe-son et solo par piste** (`passeEnr`). Une piste coupée **n'entre pas dans la prise** et ne sonne
   pas : le test est appliqué dans `enrNoter` *et* avant `entreeNote`. Le solo coupe les autres.
   **La bascule son/canal remet `solo` et `muet` à zéro** : les clés passent de `"9:36"` à `"c9"`, les
   garder couperait des pistes au hasard.
4. **Relecture en boucle** (`ENR.boucle`) : `enrJouer` se rappelle lui-même en fin de prise.
5. **Avertissement** à 17 000 événements, avant la limite de 20 000 — on pouvait l'atteindre sur un long
   live sans être prévenu.

*Incident à retenir* : le remplacement de la section « Ce qui arrive » de la notice en v102 **a emporté le
canevas et le bouton PISTES**, qui se trouvaient entre deux `<h3>`. Remis. **Découper la notice entre deux
titres est dangereux quand des commandes y sont intercalées** — vérifier les identifiants après coup, ce
que fait déjà le contrôle html/js.

**Une piste par SON — v102**

Correction de cap. La v101 faisait une bande par **canal** ; ce n'est pas ce qu'il fallait. Une Electribe —
EMX, ESX, ER-1 — envoie **tous ses sons sur un seul canal** et ne les distingue que par le **numéro de
note**. Une bande par canal ne montre donc qu'une ligne où tout se mélange.

- `ENR.vus` est indexé `"canal:note"`, `ENR.canauxVus` garde le compte par canal pour l'aiguillage.
- `pistesEnr()` rend une piste par couple canal + note, ou par canal selon `ENR.decoupe`. Bouton
  `enr-decoupe` pour basculer : la vue par canal sert quand plusieurs machines jouent ensemble.
- **Au-delà de 16 bandes**, seules les plus jouées sont affichées — au-delà on ne voit plus rien.

*`nomSonPiste(canal, note)`* nomme le son **d'après la machine visée** : `ES_PARTS`, `SX_DRUMS`,
`MX_DRUMS`, `ER_PARTS`, `EM_PARTS` pour les Electribe (base + rang) ; sinon `routageMidi(m).notes` pour
trouver le rang, puis `TR.def.instr` ou `T1K_INSTR`. Chaque accès est sous `try` : une table absente ne
casse rien, on retombe sur le nom General MIDI puis sur le numéro.

**Piège de nommage** : il existait déjà un `nomSonEnr(note)` à **un seul argument**, qui donne le nom
General MIDI. L'appeler avec deux arguments le faisait lire le canal comme une note. Le nouveau s'appelle
`nomSonPiste` et se rabat sur l'ancien. **Vérifier les signatures avant de réutiliser un nom.**

Vérifié au banc : une EMX sur le canal 10 donne quatre pistes nommées BD, HH C, CLAP, AGOGO ; tous les
événements retrouvent leur piste ; la bascule par canal les regroupe sans en perdre un.

**Enregistreur MIDI multi-sources — v101**

But : enregistrer un live entier avec le téléphone pour seul matériel.

**La capture enregistrait déjà tout.** `enrNoter` garde `[temps, a, b, c]` pour chaque message, tous canaux
confondus. Deux choses manquaient seulement.

1. **`entreeNote(note, vel, canal)` recevait le canal et l'ignorait** : `var m = S.modele`, donc tout jouait
   sur la machine affichée. Devenu `ENR.canaux[canal] || S.modele` — **une ligne**, et chaque source garde
   sa voix. `ENR.canaux` est gardé dans `localStorage` sous `MEM + ".midicanaux"`.
2. **Rien ne s'affichait.** `#enr-vue`, un canevas redessiné en `requestAnimationFrame` tant que le panneau
   est ouvert : une bande par canal **réellement reçu** (`ENR.vus`), le temps de gauche à droite, une note
   = un trait dont la position donne la hauteur et l'opacité la vélocité.
   - Fenêtre glissante de **8 s** pendant l'enregistrement, avec trait de position ; **prise entière** à
     l'arrêt. Vérifié aux trois cas.
   - `ENR.vus` est rempli **même à l'arrêt** : c'est ce qui permet de voir arriver les sources et de les
     aiguiller avant d'appuyer sur ENREGISTRER.
   - `majCanauxEnr()` ne refait la liste **que si la signature des canaux change**, sinon on écraserait un
     menu déroulant ouvert.
   - Couleurs par pas de 137° sur le cercle chromatique : 16 teintes distinctes, vérifié.

*Piège rencontré* : il y a **deux `var NOMS`** dans le fichier — celle du panneau MIDI et celle de
l'enregistreur. Une ancre sur `var NOMS` en touche deux. `MACHINES_ENR` est rempli à partir de celle qui
précède `enr-machine`.

**Chapitre recentré sur le transfert — v100**

L'onglet VOS VRAIES MACHINES décrivait trois applications **qu'on ne peut pas télécharger** : elles ne sont
pas publiées. Décrire un outil sans donner le moyen de l'obtenir n'aide personne.

- Les trois fiches et le « pourquoi ils restent dehors » sont retirés, ainsi que la tuile `menu-outils`
  et sa classe `.pout`.
- **L'identifiant `note-outils` est conservé** : le bouton MODE D'EMPLOI du panneau de transfert
  (`syro-aide`) pointe dessus. Le renommer casserait ce lien.
- L'onglet s'appelle maintenant **VERS UNE VOLCA** et ne traite plus que du transfert : les trois étapes
  de branchement, le réglage de niveau, le mode compressé, et ce que signifie l'indisponibilité.

*À ne pas confondre* : les six mentions de MOC'TA BASS qui restent dans le fichier sont des **crédits**
pour du travail réellement repris — la chaîne de traitement du son, le format des mouvements de potards.
Elles n'ont rien à voir avec le chapitre supprimé et doivent rester.

Si ces trois outils sont publiés un jour, le chapitre peut revenir — avec des liens, cette fois.

**Le Syro compile — reste à le charger — v99**

Deuxième essai : **la compilation a réussi**. L'application disait alors « Failed to fetch », ce qui n'est
pas une erreur de compilation mais de chargement — le module n'arrivait pas à aller chercher son propre
`.wasm`.

**Cause : `fetch()` ne prend pas en charge le protocole `file://` dans Chromium.** Pas partiellement, pas
sous condition — pas du tout, quelle que soit l'autorisation accordée au WebView. `setAllowFileAccessFromFileURLs`
sauve `XMLHttpRequest` — c'est ce qui fait marcher les kits de Nexus — mais pas `fetch`, et la glu
d'Emscripten utilise `fetch`.

Correctif : **`-sSINGLE_FILE=1`**. Le wasm est embarqué en base64 dans le `.js` : plus de fichier à côté,
donc plus de requête du tout. Le script vérifie maintenant les deux choses — que `volcagain_render` est
dans la glu, et qu'aucun `syro.wasm` ne traîne à côté, ce qui signifierait que l'option n'a pas pris.

*Leçon à retenir pour tout ce qu'on ajoutera* : sous `file://`, **XHR oui, fetch non**. Une bibliothèque
tierce qui charge une ressource par `fetch` échouera ici sans autre explication que « Failed to fetch ».

*Rapport de compilation* : `continue-on-error` rend un échec presque invisible — une coche verte avec un
point d'exclamation qu'on ne remarque pas. Une étape écrit désormais en tête du rapport si le transfert
est dans l'APK ou non, avec la taille du module.

**Le Syro, deuxième essai — v98**

Premier essai : la compilation a échoué, et le garde-fou a tenu — l'APK s'est construit, l'application a
annoncé l'indisponibilité. Trois corrections, dont deux trouvées en relisant mon propre code sans même
avoir le journal.

1. **`ccall` n'était pas exporté.** Le code JS l'utilise pour appeler `volcagain_render`. Même avec une
   compilation réussie, l'appel aurait échoué. Ajouté à `EXPORTED_RUNTIME_METHODS`, avec `cwrap`.
2. **Le dépôt de Korg contient un programme d'exemple avec son propre `main()`.** Compilé avec le reste,
   Emscripten l'exécuterait au chargement du module et le ferait sortir aussitôt. Le script **écarte
   maintenant tout fichier contenant un `main`**, et dit lequel dans le journal.
3. **Emscripten est installé à la main** (clone d'`emsdk`, `install`, `activate`, `emsdk_env.sh`) au lieu
   d'une action tierce : une dépendance de moins, et un journal qui dit exactement où ça casse.

*Le script s'annonce par étapes* (`::group::`) : outils, code de Korg avec la liste des fichiers trouvés,
repérage des sources avec le détail retenu/écarté, compilation, puis **vérification que
`volcagain_render` est bien dans la glu** — un module sans nos fonctions ne servirait à rien.

*Côté application*, `syroCharger()` vérifie maintenant que le module est **complet** : `ccall`, `setValue`,
`getValue`, les vues mémoire et `malloc`. Un module qui se charge mais à qui il manque une fonction est
pire qu'un module absent — on s'en apercevrait au milieu d'un transfert. Le message nomme ce qui manque.

**Transfert vers une vraie volca — v97**

La capacité centrale de MOC'TA BASS est venue ici. Ce qui l'a permis : son `syro_wrap.c` est du **C pur**
qui rend le flux complet **en un appel** — écrit à l'origine pour éviter des millions d'allers-retours
depuis Python, et exactement ce qu'il faut pour WebAssembly. Et la volca reçoit du **son**, pas un fichier.

- `syro/syro_wrap.c` repris tel quel, `syro/construire.sh` le compile avec Emscripten.
  **Le SDK de Korg n'est jamais versionné** (sa licence l'interdit) : cloné à la compilation, et
  `syro/volcasample/` comme `app/src/main/assets/syro/` sont dans `.gitignore`.
- Le script **ne suppose pas la disposition du dépôt de Korg** : il cherche `korg_syro_volcasample.h` et
  compile ce qui l'entoure. Si Korg réorganise, ça tient encore.
- Étape ajoutée à `android.yml` et `publication.yml`, **en `continue-on-error`** : si Emscripten ou le
  dépôt fait défaut, l'APK se construit quand même et l'application annonce simplement que le transfert
  n'est pas disponible. **Ne pas retirer ce garde-fou.**

*Côté application* :
- `syroPcm()` mélange en mono et applique le gain. Vérifié : source à −32,8 dB remontée à −0,2 dB,
  **+32,6 dB**, sans écrêtage ; un son déjà fort n'est pas saturé ; le silence ne divise pas par zéro.
- `syroRendre()` — **la structure fait 28 octets** : six entiers de quatre puis un pointeur, dans l'ordre
  exact de `VGData` dans `syro_wrap.c`. Toute modification de l'un doit suivre dans l'autre.
  On **copie le résultat avant de libérer** : la mémoire du module est réutilisée aussitôt.
- `syroJouer()` se branche sur **`ctx.destination`, pas sur `master`** : le signal est codé, le moindre
  égaliseur ou limiteur le rendrait illisible. Ne pas le faire passer par la table de mixage.
- Le module n'est chargé qu'à l'ouverture du panneau, et son absence est annoncée au lieu de planter.

**Non vérifiable ici** : la compilation Emscripten elle-même, faute de réseau et de SDK. Le premier essai
demandera peut-être une correction ; le rapport d'erreur est dans l'onglet Actions.

**Trois outils pour le vrai matériel — v96**

Trois dépôts examinés : **aucun n'est intégrable** comme l'ont été Studio Tibo et Nexus. Ceux-là étaient
des pages web, qu'il suffisait de poser à côté. Ces trois-là sont natifs.

| Projet | Écrit en | Verdict |
|---|---|---|
| **ES-1 Manager** (KorgManager) | Kotlin + exécutable C `es12wav`, USB OTG | pas embarquable — **mais fusionnable** un jour dans le même APK |
| **Fab la grosse basse** (fabkorg) | Kotlin + Jetpack Compose, MIDI USB/BT | pas embarquable, et **fait double emploi** avec l'ENREGISTREUR MIDI |
| **MOC'TA BASS** (volca-gain) | Python / Kivy + SDK SYRO en C | pas embarquable du tout — autre moteur d'exécution, comme tibrecord |

Le point commun : **ils parlent à du matériel branché**. C'est ce qui fait leur intérêt et ce qui les
empêche de vivre dans une page web.

*Ce qui a été fait* : onglet de notice **VOS VRAIES MACHINES** et tuile du menu, qui les présentent à leur
place — à côté des conseils de branchement réel de l'onglet TABLE DE MIXAGE. L'application simule des
machines, ces outils servent celles qu'on possède ; le chapitre dit lequel prendre et quand.

*Si on veut aller plus loin* : seul **ES-1 Manager** vaut une fusion. Dépendances légères (`appcompat`,
`documentfile`, `material`), pas de Compose, et il complète l'export pour carte ES-1 déjà présent ici sans
rien recouvrir. Il faudrait : fusionner son manifeste, renommer son paquet, reprendre le `CMakeLists` et
l'étape du workflow qui clone `es12wav`, puis lancer son activité depuis le pont JS. **À ne tenter que
prêt à itérer** : la compilation Android n'est pas vérifiable ici, et c'est le seul workflow qui marche
aujourd'hui.

**La bande noire de Nexus — v95**

Signalé : en descendant tout en bas du cadre Nexus puis en remontant, une bande noire restait un instant.

Cause : **une transformation CSS ne change pas la place occupée**. `ajusterNexus()` pose le cadre à 1180 px
de large et `h / échelle` de haut, puis le réduit par `transform: scale()`. La hauteur de *mise en page*
reste `h / échelle` — bien plus que la hauteur peinte — et la boîte se croyait donc défilable loin au-delà
du contenu visible. Mesuré : en portrait 412 × 700, **1305 px de vide défilable**.

`#nexus-boite{overflow:hidden}` suffit : le cadre est calculé pour remplir la boîte exactement, il n'y a
rien à faire défiler à ce niveau. Nexus garde son propre défilement intérieur, à l'intérieur du cadre.

**Ne pas appliquer la même chose à `#studio-boite`** : Studio n'est pas transformé, sa hauteur de travail
de 760 px en paysage est réelle, et c'est bien la boîte qui doit défiler.

**Démarrage et panneaux — v94**

*La façade DRM16 apparaissait une seconde au lancement.* Cause mesurée : `#unit` est le **premier** bloc
du corps, à 10,2 % du fichier, et `#menu` arrive à 17,1 % — soixante-dix kilooctets plus loin. Le navigateur
peint la façade dès qu'il l'a lue, bien avant d'atteindre le menu.

`body:not(.pret) > *{visibility:hidden}` masque tout jusqu'à la fin du script, qui pose `pret`.
**`visibility` et non `display`** : les éléments gardent leurs dimensions, et `fit()` mesure des hauteurs
dès le démarrage — avec `display:none` il mesurerait zéro.

*Sept panneaux plein écran, tous au même plan.* Deux ouverts en même temps se superposaient, et refermer
l'un retirait `note-ouverte` alors que l'autre était encore là : les boutons du haut réapparaissaient
par-dessus le panneau resté ouvert.

- `PANNEAUX` liste les sept. `fermerAutresPanneaux(sauf)` est appelée par **les sept ouvertures**, vérifié.
- `majNoteOuverte()` remplace les treize `add`/`remove` à l'aveugle : la classe du corps **suit l'état
  réel** au lieu d'être posée et retirée par chaque panneau pour son propre compte.
- **Tout nouveau panneau plein écran doit entrer dans `PANNEAUX`** et appeler ces deux fonctions.
- Simulé : enchaînements normaux, et le cas à deux panneaux forcés où la classe doit être conservée.

**Deux corrections signalées — v93**

*« Ouvrir la façade » ramenait au menu.* La table s'ouvre **depuis le menu**, qui reste derrière elle.
`allerMachine()` n'a jamais fermé le menu — c'est la tuile `.pick` qui s'en charge. En l'appelant
directement depuis la table, on refermait la table et on retombait sur le menu. `allerVoie()` retire donc
`menu-ouvert` et cache le menu avant d'activer la machine. **Toute nouvelle entrée vers une machine qui ne
part pas d'une tuile doit faire de même.**

*Les deux projets invités « ne fonctionnaient pas ».* Ils fonctionnent — mais les captures montraient une
barre d'adresse Chrome et une URL `content://` : c'était le **fichier `drm16.html` autonome**, ouvert seul
depuis les téléchargements. Les invités sont des fichiers **séparés**, posés à côté du nôtre dans
l'application ; un fichier ouvert seul n'a personne à côté de lui, et le cadre affichait une page d'erreur
qui ne disait rien.

- `invitesDisponibles()` : vrai si l'adresse contient `android_asset` (application), ou si le protocole est
  `http:`, `https:` ou `tauri:` (exécutable de bureau, serveur local). Faux pour `file:` et `content:` —
  un fichier seul. Vérifié sur quatre adresses.
- Message explicatif à la place du cadre, qui dit où sont les invités et comment les retrouver.
- Les deux dossiers `studio/` et `nexus/` sont désormais **copiés dans l'exécutable de bureau** par les
  deux workflows Windows : sans cela, la version PC aurait affiché le message elle aussi.

**Ce que produit chaque envoi — v92**

Constat : seul l'APK sortait à chaque poussée. Le travail `publication.yml` ne se déclenche que sur une
étiquette `v*`, donc la version PC et l'exécutable n'existaient qu'au moment d'une publication — qui
n'arrive pas.

- `android.yml` joint maintenant **`drm16.html`** en plus de l'APK. C'est le fichier tel quel, la copie ne
  coûte rien : il n'y avait aucune raison de le réserver aux publications.
- `windows.yml`, nouveau, **à la demande seulement** (`workflow_dispatch`). Compiler du Rust prend dix à
  quinze minutes ; le faire à chaque virgule corrigée gâcherait le quota. La publication le produit de
  toute façon à chaque version.
- Les trois déclencheurs sont maintenant distincts et sans recouvrement : poussée → APK + HTML ;
  à la demande → exécutable ; étiquette → version publiée complète. Tableau récapitulatif dans le README.

**Table de mixage : plusieurs machines à la fois — v91**

Première étape de la grande évolution demandée. Le socle, pas encore l'écran.

*Une voie par moteur.* `busSet(id)` rend un `gain → panner → master` par machine, `majVoieSet` applique
niveau, panoramique, coupe-son et solo. **Le solo est un coupe-son sur les autres voies**, comme sur une
table — d'où un seul solo à la fois. La voie retient son `ctx` : un nœud fabriqué dans un contexte mort ne
se rebranche nulle part, et le contexte change à l'export et après une relance.

*Routage.* **31 sorties** déplacées de `master` vers `busSet(...)`, dans 19 fonctions. Restent sur `master`,
volontairement : les trois métronomes, les écoutes de bibliothèque, et le **retour d'effets des Electribe**
(`busEffets`) — c'est un retour d'effets partagé, il a sa place hors des tranches, exactement comme sur une
console. Vérifié : 17 voies, toutes reliées au mélange.

*Transport.* `pasSet` est un compteur **qui ne repart jamais à zéro** ; chaque machine du set y prend son
reste (`pasSet % sa longueur`). C'est ce qui permet à un motif de 16 pas de tourner contre un de 12 sans
que l'un impose sa mesure. La machine affichée reste ordonnancée comme avant et est **exclue** du second
tour, sinon elle jouerait deux fois. Vérifié au banc sur 26 pas.

*`preparerSet()`* réveille les machines choisies : chacune construit ses nœuds à la première ouverture de
sa façade, et dans un set on n'y passe pas — sans ce réveil, la première mesure serait muette.

**Limite réelle, à ne pas prendre pour un oubli : dix-sept MOTEURS, pas vingt-cinq machines.** La TR-808 et
la 909 partagent `MACHINE_TR` et la même mémoire de motifs. Les faire jouer ensemble supposerait de
dédoubler leur état, ce qui est un autre chantier.

*Mémoire* : `memoire.set` entre dans la sauvegarde générale. **`SET` est déclaré après `charger()`** :
la relecture ne fait que mettre de côté, et `appliquerMemSet()` — appelée après la déclaration — applique.
Ne pas remettre l'application dans `charger()`, elle planterait au démarrage.

*Notice* : onglet **TABLE DE MIXAGE**, avec les conseils de branchement réel demandés — synchronisation
(MIDI, sync analogique, DIN Sync), ordre gain/fader, panoramique, coupe du grave, effets partagés, écoute
casque, boucles de masse.

**Reste à faire pour la version PC** : plusieurs fenêtres. Tauri sait ouvrir plusieurs fenêtres chargeant
la même page avec un paramètre (`?vue=table`, `?vue=eur`) ; il faudrait alors partager l'état entre
fenêtres, ce que `localStorage` ne fait pas en direct. Chantier à part entière.

**Machine d'archive : le son — v90**

Cinq réglages par piste, un bouton, trois réglages de machine.

- **END** (`fin`) — avec `debut`, découpe le tampon. `voixArcm` calcule `dispo = fin·durée − début`, borné
  à 20 ms minimum pour qu'un réglage absurde ne produise pas une durée nulle.
- **RESO** (`reso`) et **TYPE** (`ftype`) — `Q` de 0,7 à 18,7 ; trois types en un potard, arrondi sur
  trois positions.
- **DRIVE** (`drive`) — `WaveShaper` en `tanh`. **Les courbes sont rangées par crans** (`courbeArcm`,
  neuf crans) : en construire une par note coûterait cher pour rien. Rattrapage de niveau
  `1 − drive·0,45`, saturer fort remontant beaucoup le volume.
- **SEND** (`envoi`) — vers `fxArcm()`, un bus **commun** aux seize pistes : écho à réinjection plus
  convolution. Seize réverbérations séparées coûteraient seize fois plus pour un résultat moins tenu.
- **◀ ENVERS** (`rev`) — tampon retourné, **mis en cache** par `bufArcmInverse` : le retournement est une
  copie complète du son, à ne pas refaire à chaque note.
- **SWING**, **ECHO**, **REVERB** — réglages de machine, d'où `knobArcmGlobal` : la fabrique ordinaire
  `knobArcm` lit et écrit dans la piste choisie, ils suivraient donc la sélection.
  Swing vérifié : à 0,6 les écarts alternent 157 / 94 ms au lieu de 125.

*Points à ne pas défaire* :
- `motifArcmVide` ne regarde que `pas`, `acc` et `ech` : **un motif réglé mais sans note reste vide** et
  n'occupe pas la mémoire. Vérifié.
- `memArcm` énumère les champs un par un. **Tout nouveau réglage de piste doit y être ajouté**, sinon il
  se perd au rechargement sans que rien ne le signale.
- `majKnobsArcm` liste les seize potards à rafraîchir, et remet l'état du bouton ENVERS.

**Invités en paysage, et la machine d'archive — v89**

*Deux défauts de mise en page, deux causes différentes.*
- **NEXUS était coupé** : il déclare `<meta viewport content="width=1180">` et compte sur le navigateur
  pour réduire. **Dans un cadre, cette déclaration est ignorée** — le contenu se dessinait à la largeur du
  cadre et ses blocs à largeur minimale débordaient. `ajusterNexus()` refait le travail à la main : cadre
  posé à 1180 px de large, hauteur calculée, puis `transform: scale()`. Rappelé à l'ouverture et sur
  `resize`. Vérifié sur trois formats, le rendu remplit exactement la boîte.
- **STUDIO ne défilait pas couché** : responsive, il tient debout, mais en paysage son en-tête mange toute
  la hauteur et il ne reste rien à faire défiler. Hauteur de travail de 760 px en paysage, et c'est la
  boîte `.invite-boite` qui défile.

*Machine d'archive : de 8 à 128 motifs, plus un morceau.*
- `ARCM_BANQUES` × `ARCM_PAR_BANQUE` = 8 × 16. Grille `#arcm-grille` ouverte par PTN.
- **Mémoire éparse** : `memArcm` n'enregistre que les motifs non vides (`motifArcmVide`). Mesuré : deux
  motifs remplis sur 128 tiennent en 3 Ko. **Ne pas revenir à un tableau plein** — 128 × 16 pistes
  sérialisées feraient plusieurs centaines de kilo-octets pour presque rien.
- **Trois formats lus** : v2 épars (`pleins`), ancien tableau de 8 (`motifs`), et rien du tout. Testé.
- **Bascule en fin de mesure** : en lecture, toucher un pad remplit `ARCM.suivant` et `boucleArcm()`
  applique le changement au tour suivant. À l'arrêt, chargement immédiat. C'est le comportement d'une
  Electribe et il évite de couper la musique au milieu.
- **Morceau** : `ARCM.chaine` est une suite d'index, `chainePos` avance d'une case par mesure et boucle.
  Un même motif peut y figurer plusieurs fois. Enregistré avec le reste.

**Deux projets invités dans le menu — v88**

Trois dépôts examinés. **Deux sont intégrables, un ne l'est pas.**

- **Studio Tibo** (508 Ko, un seul fichier HTML) — station de production : séquenceur, piano roll, MIDI,
  onze effets, mixeur, automation, export. Complément naturel des machines.
- **Nexus Beat Lab** (292 Ko + 5,2 Mo d'échantillons WAV) — pads et séquenceur avec de **vrais
  échantillons**, ce que DRM16 n'a pas.
- **Tibrecord** — Python / Kivy / buildozer. **Pas intégrable** : autre langage, autre exécution. Il
  faudrait le réécrire en web ou le laisser séparé.

*Méthode : un `<iframe>` par invité, pas une fusion.* Trois applications d'un mégaoctet concaténées dans
une page se marcheraient dessus — styles globaux, variables globales, contexte audio. Chaque invité garde
son document. Vérifié avant de s'engager : aucun des deux n'utilise `window.top`, `parent` ni le plein
écran, et les clés de stockage ne se croisent pas (`drm.reglages` ici, `_tibo_*` et `nbl-*` chez eux).

*Chargement différé* : le `src` du cadre n'est posé qu'à la première ouverture. Cinq mégaoctets
d'échantillons n'ont rien à faire au démarrage.

*Deux pièges côté Android, tous deux silencieux* :
- `setAllowFileAccess(false)` empêchait les requêtes internes de Nexus vers ses `samples/` : **kits muets,
  sans message**. Corrigé par `setAllowFileAccessFromFileURLs(true)`, qui n'ouvre que l'accès d'une page
  `file://` aux autres fichiers `file://` — `setAllowFileAccess` reste à `false`.
- `shouldOverrideUrlLoading` renvoyait `true` pour tout, y compris les **sous-cadres** sur Android récent :
  les cadres seraient restés vides. Exception ajoutée pour `file:///android_asset/`.

*Deux moteurs audio ne jouent jamais ensemble* : `ouvrirInvite` appelle `stop()`, `fermerInvite` recharge
le cadre pour couper le son de l'invité et rappelle `reveillerAudio()`.

Les deux liens de polices Google de Studio Tibo ont été retirés : hors ligne ils ne faisaient que retarder
l'affichage, la page ayant déjà ses polices de secours.

**L'APK passe d'environ 2 Mo à environ 8 Mo**, presque entièrement à cause des échantillons de Nexus.

*Piste pour plus tard* : servir les ressources par `WebViewAssetLoader` sur une origine `https://` donnerait
un contexte sécurisé, donc le **Web MIDI** sur ordinateur. Attention, cela changerait l'origine de la page
principale et **effacerait la mémoire des utilisateurs** — à ne faire que pour les invités.

**Version de bureau — v87**

Le cœur est **un seul fichier HTML de 1 Mo sans aucune dépendance externe** : vérifié, aucun `src` ni
`href` vers l'extérieur. Il tourne donc tel quel sur un ordinateur. Deux formes livrées :

- **`drm16.html`** joint à chaque version : on l'ouvre dans n'importe quel navigateur, sur n'importe quel
  système. Zéro compilation.
- **`DRM16-installeur.exe`** pour Windows, construit par un second poste du workflow (`windows`, `needs:
  publier`) avec **Tauri 2** : une fenêtre et un moteur web, exactement le rôle de `MainActivity.java`
  côté Android. `bureau/src-tauri/`, cible `nsis`, profil release réglé au plus petit (`opt-level="s"`,
  `lto`, `strip`) — le projet tient en 2 Mo sur Android, pas question d'en livrer 150.

*Ce qui manque sur ordinateur, et pourquoi* : le **MIDI** et la **bibliothèque de fichiers** passent
entièrement par `window.DRM16`, le pont natif Android — il n'y a **pas** de repli Web MIDI dans le HTML.
L'export, lui, a déjà son chemin « hors Android » (`<a download>`), il fonctionne donc. Ajouter le MIDI sur
PC voudrait dire écrire un chemin `navigator.requestMIDIAccess` en parallèle du pont : faisable, jamais
commencé.

*Piège de la mémoire* : `localStorage` est bien utilisé (via la variable `MEM`, pas une chaîne littérale —
une recherche naïve ne le trouve pas). Lecture et écriture sont sous `try`, donc un navigateur qui refuse
la mémoire locale à une page `file://` ne casse rien : les motifs ne sont simplement pas conservés.
L'exécutable n'a pas ce défaut, son origine étant `tauri://localhost`.

`verifier-bureau.sh` contrôle l'autonomie du HTML et la présence des cinq fichiers de la coque.

**Le seul morceau que je n'ai pas pu essayer ici** : la compilation Tauri, faute de Rust et de réseau.
Si le poste `windows` échoue, le poste `publier` a déjà fait son travail — l'APK et le HTML sont publiés.

**Catalogue au-dessus du rack — v86**

`#eur-cat` était le dernier bloc de la façade, sous le rack **et** sous la barre de défilement : il fallait
faire défiler la page pour le voir, et le rack le repoussait à mesure qu'il se remplissait. Or on ne s'en
sert qu'au début ou en changeant d'idée. Il passe donc **juste sous les commandes**, avant le rack.

Lisibilité : les libellés étaient à **8 px** et les résumés à **7**, sur une façade elle-même réduite par
`fit()`. Passés à 11 et 9,5 px, colonnes de 148 px au lieu de 96, onglets de famille à 9,5 px, et un cadre
pour distinguer le panneau du rack au-dessous.

**Conséquence à ne pas rater** : le panneau étant maintenant **au-dessus**, l'ouvrir ou le fermer décale
tout ce qui suit — la façade change de hauteur et les câbles ne sont plus en face de leurs prises. Les
douze endroits qui touchaient `c.style.display` passent tous par **`montrerCat(c, vu)`**, qui rappelle
`fit()`, `eurCables()` et `eurMajBarre()` après 40 ms. **Ne jamais écrire `c.style.display` directement** :
vérifié, il n'en reste aucun hors de `montrerCat`.

**La pause ne se mesure qu'à l'écran — v85**

Relevé sur l'appareil, 7,5 min de jeu : `PIC 80 SOURCES DONT 13 À VENIR · PAUSE MAX 1713 ms ·
2 DÉCROCHAGES (0,3 PAR MIN)`.

Les sources sont **saines** : 80 au pic contre 1180 avant la v71, et 13 à venir, ce qui est la valeur
normale pour l'anticipation de 0,22 s. Les décrochages sont rares. Mais 1713 ms de pause ne collait avec
rien de tout cela.

Explication : avec **LECTURE EN ARRIÈRE-PLAN** activée, `stop()` n'est pas appelé au passage en fond,
`periode()` passe à 150 ms et le minuteur continue — mais **Android ralentit volontairement les minuteries
en arrière-plan**, de plusieurs secondes. Le trou était réel et sans aucune conséquence : personne
n'écoutait. Il écrasait le maximum et masquait la vraie valeur.

- La pause n'est plus mesurée que si `!cache`.
- `AUDIT.tDernier = 0` sur chaque `visibilitychange` : le passage d'un état à l'autre n'est pas un trou.
- `AUDIT.trous` compte les franchissements de **150 ms** en avant-plan. **Un accident isolé et des hoquets
  réguliers ne se soignent pas pareil** : le maximum seul ne permettait pas de les distinguer.

**Troisième fois qu'un de mes instruments mesure autre chose que ce qu'il prétend** (sonde de propagation
en v77, liste de sources en v83, minuterie d'arrière-plan ici). Avant de corriger le code sur la foi d'un
relevé, vérifier que le relevé mesure bien ce qu'on croit.

**Publication sur GitHub — v84**

Quatre pièces ajoutées, rien de modifié dans l'application.

- `app/build.gradle` : `signingConfigs.publication` lit la clé dans les **variables d'environnement**,
  jamais dans le dépôt, et **retombe sur la clé de debug** si elles sont absentes — la compilation locale
  et le workflow `android.yml` continuent donc de fonctionner sans rien changer.
- `.github/workflows/publication.yml` : déclenché par une **étiquette `v*`**, pas par une poussée.
  `android.yml` continue de compiler à chaque envoi sans rien publier. Joint **deux fichiers** à la
  version : `drm16-vNN.apk` daté, et `drm16.apk` au nom fixe que vise le bouton de la page.
  `concurrency` avec `cancel-in-progress: false` : une publication ne s'interrompt pas.
- `docs/index.html` : page de téléchargement. **Elle construit ses liens depuis sa propre adresse**, donc
  rien à modifier si le dépôt est renommé, et `releases/latest/download` pointe toujours vers la dernière
  version sans qu'on y retouche. Vérifié sur trois adresses, dont l'ouverture locale où les liens restent
  inertes au lieu de pointer n'importe où.
- `publier.sh` : refuse de poser l'étiquette si des fichiers ne sont pas envoyés (l'étiquette pointerait
  sur un autre code) ou si l'étiquette existe déjà.
- `PUBLIER.md` : les trois réglages à faire une seule fois, et la question des marques.

**Le point qui ne se rattrape pas** : la clé de signature. Android identifie une application par sa
signature ; changer de clé oblige à désinstaller, donc à perdre tous les motifs de l'utilisateur.
`drm16.jks` doit être conservé hors du téléphone. `.gitignore` couvre `*.jks` et `cle-base64.txt`.

**Acide, hardtek, tribe, psychédélique — v83**

Huit modules et quatre montages, un par style demandé. 89 modules, 24 montages.

- **ACID** (filtre) — le point de la version. Sur une 303, filtre, enveloppe et accent sont **un seul
  circuit** : l'accent ouvre plus haut, tient plus longtemps et pousse la résonance. Entrées TRIG et ACC
  séparées ; l'accent ne vaut **que pour la note qui suit** (`m.accent` remis à faux à la consommation).
  Vérifié au banc : 2740 → 4360 Hz, Q 13,2 → 17,4, durée ×1,5, et retour à la normale au coup d'après.
- **HOOVER** (osc) — cinq dents désaccordées, passe-bande creusant le timbre, chute de hauteur sur TRIG.
  Sans câble dans TRIG ce n'est qu'une nappe.
- **TEK KICK** (perc) — sinusoïde plongeante dans une `tanh` normalisée, passe-haut qui monte avec DRIVE.
- **TRIBAL** (perc) — conga, bongo, djembé, tabla. Ce qui les sépare est la **décroissance** et le pli de
  hauteur (`pli` 0,55 pour le tabla), pas la fréquence.
- **ZAP** (perc) — chute de plusieurs octaves avec FM sur la porteuse.
- **TRANCE GATE** (util) — huit motifs de 16 bits, `setTargetAtTime` pour la constante de SHAPE, DEPTH
  fixant le plancher des creux. Entrée `rst` comme les séquenceurs.
- **CLIP** (effet) — écrêtage **franc** (`Math.max/min`), à ne pas confondre avec DIST qui est doux.
  Rattrapage de niveau automatique, sinon écrêter fort double le volume.
- **RISER** (mod) — montée de 1 à 8 mesures calée sur `stepDur()`, avec une sortie **CV** parallèle.
  Vérifié : 2,00 s pour une mesure à 120 BPM, 16,00 s pour huit.

**Le contrôle des montages avait vieilli** : sa liste de sources sonores était écrite à la main et ignorait
les nouveaux modules, d'où un faux « aucune source sonore » sur le montage TRIBE. Elle est maintenant
**dérivée du catalogue** (familles `osc` et `perc`). Même leçon qu'en v77 avec la sonde de propagation :
quand un contrôle se plaint après un ajout, suspecter le contrôle.

**Rack et patch expliqués — v82**

Les deux onglets de la barre portent des mots proches. La notice les distingue maintenant à l'endroit où
ils apparaissent, et pas seulement au glossaire : **le rack est le meuble, le patch est ce qu'on a monté
dedans**. D'où le partage — RACK remplace en bloc (changer de rack, le nommer, y poser un montage, le
vider), PATCH retouche ce qu'on a sous les yeux (ajouter, retirer, déplacer, décâbler).

Entrée `Rack` ajoutée au glossaire, `Patch` précisée. Le glossaire est **alphabétique** : vérifié
automatiquement après insertion, accents neutralisés pour le tri.

Décidé avec l'utilisateur : **la TR-1000 et la DrumBrute gardent leurs rangées de boutons**, elles ne
posent pas de problème à l'usage. Ne pas y appliquer les tiroirs de l'Eurorack.

**Barre du rack réorganisée — v81**

Treize boutons sur trois rangées : on ne trouvait rien. Le classement utile n'est pas thématique mais
**temporel** — douze de ces boutons servent à *monter* le patch, jamais à en *jouer*.

- `.eur-ligne` reste visible en permanence : START, TEMPO, afficheur, `⤢` plein écran, et deux onglets.
- Deux tiroirs `.eur-grp` : **RACK** (quel patch : liste, nommer, montages, au sort, exemple, vider) et
  **PATCH** (le contenu : ajouter, retirer, rangée, décâbler).
- `tiroirEur(nom)` n'en laisse **qu'un seul ouvert** — deux ouverts et on retombe dans le fouillis qu'on
  vient d'enlever. Rouvrir le même le referme. Le panneau `eur-cat` se referme avec eux.
- La hauteur de la barre change en ouvrant un tiroir : `fit()` et `eurCables()` sont rappelés après 40 ms,
  plus `eurMajBarre()`. **Ne pas oublier ces trois-là** si on ajoute un tiroir.
- `fermerTiroirsEur()` est appelée par `activerEur` et par `pleinEcran(true)` : on revient toujours sur la
  ligne de jeu.
- **`eur-notice` supprimé** : il faisait double emploi avec le bouton NOTICE du haut, qui ouvre déjà
  l'onglet de la machine courante via `docDeLaMachine()`.

Vérifié : les quatorze boutons de la barre ont tous leur écouteur, et la simulation des tiroirs confirme
l'exclusivité, la fermeture par rappui et le suivi du catalogue.

**MPC2000 en une colonne, barre du rack — v80**

*La MPC2000 restait large et courte sur un téléphone*, donc réduite à presque rien par `fit()`, avec la
moitié de l'écran vide. La règle qui empile en une colonne **existait pourtant déjà** dans
`@media (max-width:780px)` : `.mpc-corps{grid-template-columns:1fr}`. Mais `body.mpc2 .mpc-corps` compte
**deux classes contre une** et l'emportait, requête média ou non. La MPC3000, elle, s'empilait correctement
— d'où un défaut qui ne touchait qu'un modèle sur deux.

Correctif : reprendre le même poids dans la requête, `.mpc-corps,body.mpc2 .mpc-corps{…}`.
**Règle générale** : une règle de mise en page posée hors requête média avec deux classes ou plus doit être
reprise nommément dans la requête. Un contrôle automatique a passé toutes les propriétés de mise en page
(`grid-template-columns`, `flex-direction`, `display`) en revue : **aucun autre conflit du même genre**.

*Barre de défilement sous le rack.* Le rack défilait déjà au doigt, mais il fallait tomber entre deux
modules. `#eur-barre-h` est une poignée large comme le rack, dont la longueur reflète la part visible
(`clientWidth / scrollWidth`) et la position le défilement. Elle ne s'affiche que si `scrollWidth -
clientWidth > 8`. `window.eurMajBarre()` est rappelée par `eurDessiner` (différée de 30 ms, le temps que la
mise en page soit faite) et par l'événement `scroll` du rack — mais **pas pendant qu'on tient la poignée**,
sinon elle se battrait avec elle-même. Vérifié au banc : la poignée reste dans sa piste aux deux extrémités,
au demi-pixel près.

**Déplacer une façade agrandie — v79**

Signalé : difficile de faire glisser la machine de droite à gauche une fois zoomé. Deux causes.

1. **Le déplacement à un doigt exige de tomber sur du fond** (`estCommande` doit être faux). Sur la MPC ou
   l'Eurorack, presque tout est une commande : il n'y a quasiment rien à saisir.
2. **Le déplacement à deux doigts existait déjà** — `ZOOM.tx` suit le centre des deux points — mais le
   moindre écart involontaire changeait aussi le zoom. On ne pouvait pas déplacer sans redimensionner.

Correctif : **zone morte de 9 % sur l'écartement**. Tant qu'on reste dedans, le geste ne fait que déplacer.
Au-delà, le zoom s'engage et la référence est recalée (`d0 = d`, `z0 = z`) pour qu'il reparte de la valeur
courante sans saut.

**Le piège, trouvé au banc et pas à l'œil** : *les deux doigts ne bougent jamais dans le même événement*.
À chaque `pointermove`, un seul point est à jour, l'autre est resté en arrière — l'écartement mesuré oscille
donc au rythme du geste, et vingt pixels de glissement suffisaient à simuler dix pour cent de pincement.
La zone morte seule ne servait à rien. Le zoom n'est donc évalué **que lorsque les deux doigts ont bougé
depuis la dernière évaluation** (`ZOOM.vus`), le déplacement continuant entre-temps.
**Ne pas simplifier en réévaluant le zoom à chaque message** : le défaut reviendrait aussitôt.

Vérifié au banc : glissement parallèle pur → `z` inchangé à 2,000 et `tx` exact à −120 ; glissement avec
5 % de tremblement → `z` inchangé ; vrai pincement → engagement à 9 %, progression continue.

**Façades trop larges, et plein écran — v78**

*Bug : les pads de la MPC2000 étaient hors d'atteinte.* `fit()` ne tenait compte de la largeur **que si la
hauteur ne tenait pas** : `s = Math.min(1, ah/offsetHeight)`, et la branche qui regarde la largeur n'était
prise que si `s < 0.995`. Une façade plus large que l'écran mais assez courte n'était donc jamais réduite,
et tout ce qui dépassait à droite restait inaccessible.

Le débordement se détecte par **`scrollWidth > offsetWidth`** : `offsetWidth` ne rend que la largeur du
bloc, pas celle de son contenu, donc il ne révèle rien. La branche est maintenant prise si la hauteur
déborde **ou** si la largeur déborde, et la façade reçoit sa largeur naturelle avant d'être réduite.
Une machine qui tenait déjà ne passe pas dans la branche : comportement inchangé pour elle.

*Plein écran.* `body.plein` masque `#retour`, `#aide` et les douze boutons de `.eur-bar`, en gardant
`#eur-play`, le potard de tempo et l'afficheur — sans quoi on ne pourrait plus lancer le séquenceur.
Bouton d'entrée `eur-plein`, sortie par `#sortir-plein` (fixe, en haut à droite, hors de portée du START
qui est à gauche). `poserMachine` retire la classe : **le plein écran ne survit pas à un changement de
machine**, sinon on se retrouverait sans bouton MENU sur une façade qui n'a pas de quoi en sortir.
`pleinEcran()` refait `fit()` et `eurCables()` après 60 ms, la hauteur disponible ayant changé.

**Grand contrôle — v77**

Treize familles de vérifications passées à la machine. **Un bug réel trouvé, sérieux.**

*Corrigé : la BIBLIOTHÈQUE se vidait dès qu'on ouvrait la notice.*
`id="note-bar"` désignait **quatre** éléments et `id="note-corps"` **trois** : les panneaux bibliothèque,
travail du MIDI, enregistreur et notice réutilisaient ces identifiants pour partager le style. Or le corps
de la bibliothèque porte la classe `doc`, et `montrerDoc()` faisait
`document.querySelectorAll("#note-corps .doc")` — un sélecteur d'identifiant en `querySelectorAll` matche
**tous** les éléments concernés, pas le premier. Ouvrir la notice retirait donc la classe `vu` au corps de
la bibliothèque, que **rien ne remettait** : panneau vide jusqu'au redémarrage. Au passage, `construireNav`
lui fabriquait aussi un onglet sans titre.

Correctif en deux temps : `note-bar` et `note-corps` deviennent des **classes** (c'étaient des styles, pas
des identités) dans le HTML et le CSS ; et la notice ne cherche plus que **dans son propre panneau**, via
`noteEl.querySelectorAll(".doc")`. Plus aucun identifiant en double dans le fichier.
**Règle** : un panneau qui réutilise le style `note-corps` ne doit jamais reprendre un identifiant.

*Vérifié sain* — rien à faire :
- 25 tuiles du menu ↔ `allerMachine` ↔ `docDeLaMachine` ↔ routage MIDI : couverture complète.
- 17 objets `MACHINE_*` : contrat respecté.
- `debrancherTout` appelé avant chaque remise à zéro de cache.
- Les 13 conteneurs de potards sont dans `estCommande` ; seuls `tr8-k-tone` et `tr8-k-drive` gardent
  l'identifiant sur le bouton, exception documentée (44 px).
- 81 modules construits, potards aux deux bornes, valeurs finies, prises réelles.
- 20 montages : prises, cohérence musicale, propagation des impulsions.
- Mémoire : 10 clés de machine + `eur`, sans collision. `rackCourant` écrit neuf champs, `poserRack` les
  relit tous.
- Notice : 81 fiches pour 81 modules, et les huit nombres annoncés par famille correspondent au code.

*Piège de méthode rencontré deux fois.* La sonde de propagation appelait `recevoir` sur **toutes** les
entrées, y compris les nouvelles `rst` : elle remettait les compteurs à zéro entre deux essais et masquait
`trig4.tb` et `trig4.td`. Corrigée en excluant `rst`. **Quand un contrôle signale une régression après
l'ajout d'une entrée, suspecter d'abord la sonde.**

**Remise à zéro, et deux modules — v76**

*Manque de fond comblé : aucun séquenceur n'avait de RST.* Deux séquences de longueurs premières entre
elles ne pouvaient plus jamais se réaligner une fois lancées. Entrée `rst` ajoutée à **seq8, seq16, trig4,
turing, arp, switch4** et au nouveau **tape**.

- Convention : `rst` met `m.pos = -1`, donc **la remise à zéro prend effet au pas suivant** — comme sur la
  plupart des séquenceurs matériels, et comme il se doit puisque l'ordre d'arrivée de `clk` et de `rst`
  dans un même pas dépend de l'ordre des câbles.
- Sur **turing**, `rst` ne remet pas un compteur : il **tire un registre neuf**. Ce module n'a pas de
  début, il n'a qu'un contenu. Ne pas « corriger » en y mettant un compteur.
- Sur **switch4**, `rst` ramène l'aiguillage sur la sortie 1 *et* remet les gains tout de suite, sinon la
  voie active resterait fausse jusqu'au prochain clk.
- Tous ces modules prennent désormais `(t, entree)` là où ils prenaient `(t)` : toute évolution doit
  garder le test `if(entree === "rst")` **en premier**.
- Vérifié au banc : deux SEQ 16 en 5 et 7 pas, avec un CLK DIV /16 sur les RST, se retrouvent chaque mesure
  au lieu de tous les 35 pas.

*Deux modules* :
- **CV LOOP** (seq) — enregistre la tension présente sur IN à chaque pas, FREEZE arrête l'enregistrement et
  la boucle tourne. Lecture par analyseur, donc à la résolution du pas.
- **TRANSPOSE** (util) — décalage **calibré** : crans exacts sur l'octave et le demi-ton, là où l'ATTENUV
  décale au jugé. Vérifié : la quinte tombe à 0,5833 V.

**Quatre modules de plus — v75**

- **HARMONIC** (osc) — additif par `createPeriodicWave`, 24 rangs, pente et balance pair/impair. La table
  est refaite à chaque `maj()` : c'est acceptable parce que `maj` n'est appelé que sur un tour de potard.
- **SUB HARM** (osc) — fondamentale plus deux sous-harmoniques entières (1 à 16), façon Trautonium.
- **FUNCTION** (mod) — RISE / FALL séparés, sortie **EOC**. Reliée à son propre TRIG, la fonction cycle.
  **La borne est essentielle** : `if(fin - m.tStep > stepDur() * 1.5) return null`. Sans elle, une boucle
  EOC → TRIG se relancerait des centaines de fois dans un seul pas et programmerait des minutes de son
  d'avance. `m.tic` sert uniquement à retenir l'instant du pas courant. Vérifié à trois durées de cycle :
  jamais plus de deux relances par pas, jamais plus loin que la fin du bloc programmé.
- **COMPARE** (util) — seuil sur une tension, impulsion au franchissement montant (OUT) et descendant
  (INV), rien entre deux. Lecture par analyseur dans `m.tic`, donc à la résolution du pas. C'est le pont
  entre les tensions continues et les impulsions, qui manquait.

**Deux rangées et huit modules rares — v74**

*Deux rangées.* `#eur-piste` passe en colonne et contient deux `.eur-rangee`. Chaque module porte `m.r`
(0 ou 1), enregistré dans le rack. Bouton `RANGÉE` pour déplacer le module choisi ; `repartirRangees()`
coupe la chaîne en deux au-delà de huit modules et est appelée par `eurMonter` et `eurHasard`.
**`eurCables()` n'a pas eu à changer** : il mesure les rectangles réels des prises par rapport à
`#eur-piste`, donc il suit les deux rangées tout seul. La rangée vide a une hauteur nulle, rien ne bouge
pour un petit rack.

*Le moteur gagne un second tour.* `scheduleEur` vide la file, puis appelle `m.finPas(t)` sur les modules
qui en ont un, puis vide à nouveau. **C'est indispensable à la logique combinatoire** : évaluer dès
l'arrivée de A laisserait l'ordre des câbles décider du résultat, et une sortie déjà partie ne se rattrape
pas. Vérifié au banc en inversant l'ordre des câbles — résultat identique.

*Huit modules peu communs* :
- **SWING** (horloge) — retarde un pas sur deux, via la propagation datée.
- **LOGIC** (horloge) — AND / OR / XOR, avec `finPas`.
- **ARP** (seq) — égrène un accord, quatre parcours.
- **LPG** (filtre) — la porte passe-bas de Buchla : filtre et ampli sur la même chute.
- **RESONATE** (filtre) — trois passe-bande très pointus, accordés par `detune` depuis l'entrée V/OCT,
  donc volt par octave exact sans calcul.
- **RUNGLER** (mod) — suite logistique + registre à décalage, façon Benjolin. Garde-fou contre les points
  fixes (`x` remis à 0,41 s'il s'échappe). **Ce n'est pas du hasard** : c'est déterministe et non
  périodique, vérifié sur 64 pas à trois réglages.
- **BBD** (effet) — passe-bas **dans** la boucle de réinjection, plus un léger tangage.
- **SPRING** (effet) — trois délais courts de longueurs premières entre elles, gain de boucle borné à 0,88.

**Un relevé qui mesure vraiment — v73**

Relevé v72 sur l'appareil : `48 SOURCES DONT 0 À VENIR · 5 DÉCROCHAGES`. Les sources sont bien tombées
(1180 → 48 après la purge de la v71 et le tampon métallique de la v72). Mais **« à venir » vaudra toujours
zéro** : le relevé ne se lit que depuis le menu, et `ouvrirMenu()` appelle `stop()`. Défaut de conception de
l'instrument, pas de l'application.

Le relevé donne maintenant des **maxima retenus pendant le jeu**, qui survivent à l'arrêt :

- `AUDIT.pic` / `AUDIT.picAvenir` — maximum de `SOURCES.length` et des sources encore à venir.
- `AUDIT.pause` — **le plus long trou entre deux tours de `tick()`**, en millisecondes. C'est la mesure
  directe de ce qui fabrique les grésillements : quand le fil principal est bloqué, le moteur audio
  s'assèche. Au-delà de ~150 ms, c'est audible. Bien plus fin que le seuil de décrochage à 0,4 s.
- `AUDIT.tJeu` — temps réellement joué (`tDernier` remis à zéro par `stop()`), ce qui permet de donner les
  décrochages **par minute** plutôt qu'en total.

`start()` fixe `nextT = currentTime + 0.12` avant de lancer `tick()` : un départ ne compte donc **pas** de
décrochage. Les cinq relevés étaient de vrais blocages. Prochaine piste à suivre selon `PAUSE MAX` :
écritures `localStorage` synchrones, reconstructions du DOM (`eurDessiner`), ou ramasse-miettes.

**Banc métallique pré-calculé — v72**

Cause trouvée pour le décrochage de la CR-5000 sur motif dense. `trMetal()` créait **six OscillatorNode
carrés par frappe**, et il sert aux charleys, charleys ouverts et cymbales de **toutes** les machines. Un
réglage CR-5000 avec HH-16", CY-4" et OPEN HH en fait cent quarante-quatre par mesure, soit soixante-douze
oscillateurs à bande limitée créés par seconde. Le fil audio ne suivait plus.

Le banc est maintenant rendu **une fois** dans un tampon de 2 s (`construireMetal`, appelé par
`batirAudio`), lu par un seul `BufferSource` dont la vitesse de lecture donne la hauteur
(`playbackRate = base / 880`). Vingt-quatre lecteurs par mesure au lieu de cent quarante-quatre.

Trois points à ne pas défaire :
- **Synthèse additive, pas des carrés naïfs.** Un carré échantillonné bêtement replie tout son spectre ;
  les partiels montent à 1,9 kHz et le charley est passe-haut à 8,2 kHz, on entendrait le repli.
- **Treize harmoniques.** Au-delà on gagne moins d'un demi-décibel au-dessus de 8,2 kHz — mesuré.
- **Rotation de vecteur au lieu de `Math.sin`** par échantillon : 28 ms au lieu de 79, écart 5·10⁻⁷.
  C'est ce qui rend la construction supportable au démarrage sur un téléphone.

Niveau vérifié : RMS 2,41 contre 2,45 pour six carrés, soit 0,15 dB. Le départ est pris au hasard dans les
quatre premiers dixièmes du tampon, ce qui rend la variation d'une frappe à l'autre que donnaient les
oscillateurs libres. `metalBuf` est remis à `null` par `refaireAudio` : il appartient au contexte.

**Racks nommés — v72**

- Le nom entre dans le rack enregistré (`rackCourant().nom`). Les sauvegardes v68–v71 sans nom se
  rechargent sans rien casser : `poserRack` met `""` si le champ manque.
- `eur-ptn` n'enchaîne plus les racks un par un, il ouvre **la liste des huit** (`listeRacks`), avec nom,
  nombre de modules et de câbles. Le panneau `eur-cat` a donc une troisième vue : `dataset.vue` vaut
  `"mod"`, `"mont"` ou `"rack"`.
- La liste montre le rack courant via `rackCourant()` et non la mémoire : sinon les modifications non
  encore enregistrées n'y apparaîtraient pas.
- Les confirmations de VIDER et de MONTAGES nomment ce qu'elles vont écraser.
- Un montage nomme le rack de son propre nom.

**Poignées et grésillements — v71**

*Poignées élargies partout.* Ce qui avait été fait pour l'Eurorack en v66 est étendu aux vingt-cinq
machines : **l'identifiant du potard passe du `.bt` au bloc conteneur**, étiquette comprise. 103 potards
déplacés en statique, plus ceux construits en JS (t1k, dbi, td3, cr, vlc, eur). Tous les conteneurs avaient
déjà `touch-action:none`, rien d'autre à changer. `estCommande()` liste maintenant les onze classes de
conteneur — **sans quoi toucher l'étiquette déplacerait la façade**.
Seule exception : `tr8-k-tone` et `tr8-k-drive`, dont le conteneur porte déjà un identifiant qui sert à les
masquer. Ils font 44 px, c'est déjà le plus gros de l'application.

*Relevé sur l'appareil* : `48 kHz · running · retard 21 ms · 194 puis 1180 SOURCES · 2 DÉCROCHAGES`.
Deux décrochages seulement : **l'ordonnanceur tient**, le goulot est dans le fil audio. Deux mesures :

- `purgerSources` gardait quatre secondes d'historique et ne se déclenchait qu'au-delà de 400 entrées.
  Chaque entrée retient un nœud audio et empêche de le récupérer ; le ramasse-miettes finit par passer, et
  son passage s'entend. Fenêtre ramenée à **1,5 s**, purge à chaque tour. Mesuré au banc à 120 sources/s :
  pic de 470 à 195 entrées, **59 % de moins**. La fenêtre doit rester supérieure à l'anticipation de
  l'ordonnanceur (0,22 s en avant-plan, 1,2 s en arrière-plan) — ne pas descendre sous 1,5 s.
- La saturation du bus général passe de `oversample:"4x"` à `"2x"` : moitié moins de travail sur chaque
  échantillon du mélange. La courbe étant droite jusqu'à 0,84, le suréchantillonnage ne sert qu'aux crêtes.
  **Réversible** si la coloration des crêtes déplaît.

Le relevé sépare désormais le total des sources de celles **à venir** : un gros total avec peu d'à-venir
veut dire que la purge traîne, pas que la machine joue beaucoup.

**Huit genres de plus, et un contrôle qui a servi — v70**

Famille `style` ajoutée : dub, techno de Détroit, jungle, drone, école de Berlin, industriel, lo-fi, phases.
Vingt montages en tout, cinq familles.

**Troisième contrôle, le plus utile : la propagation des impulsions.** Les deux premiers (prises réelles,
cohérence musicale) ne voyaient pas qu'un câble peut être parfaitement légal et pourtant muet. Le montage
JUNGLE partait d'un `switch4` vers quatre `trig` de percussion : or **SWITCH aiguille de l'audio, pas des
impulsions** — son `recevoir` renvoie toujours `null`, le module d'en face n'est jamais réveillé. Quatre
voix muettes, sans la moindre erreur visible.

Le contrôle interroge les modules eux-mêmes : on les construit, on les tic-tac **sur soixante-quatre pas**
et on note les sorties qu'ils annoncent. Soixante-quatre et pas un : un `clkdiv` en /16 ne sort qu'un coup
sur seize, une porte probabiliste ne montre sa seconde sortie qu'au bout de quelques tirages, un `trig4` ne
révèle ses quatre pistes qu'après un tour complet. Avec un seul passage, le contrôle rendait onze faux
positifs.

Sortent une impulsion : `clock`, `clkdiv`, `euclid`, `burst`, `chance`, `clkmul`, `trigdly`, `seq8`,
`seq16`, `trig4`, `turing`. **Aucune autre** — ni `switch4`, ni `mult`, ni une sortie `cv`.

*Relevé audio déplacé* : il était au fond de l'onglet GÉNÉRAL de la notice, introuvable. Tuile
**ÉTAT DU SON** dans le menu, second appui dans les quatre secondes pour relancer le moteur. Le texte est
en commun dans `releveAudio()`.

**Montages tout faits — v69**

Douze patchs prêts à jouer, rangés en quatre genres (`EUR_MONT_FAM`), sous le bouton `MONTAGES`.

- Format déclaratif : `mods` est une liste de `[type, réglages]`, `cables` une liste de
  `[rang de départ, sortie, rang d'arrivée, entrée]`, les rangs renvoyant aux positions dans `mods`.
  `bpm` facultatif. **Écrire en déclaratif est ce qui rend la vérification possible** — voir plus bas.
- `eurMonter(P)` construit, `eurMontages()` affiche le sélecteur. Le panneau `eur-cat` est partagé avec le
  catalogue de modules : `dataset.vue` vaut `"mod"` ou `"mont"`, sans quoi les deux listes se mélangent
  quand on passe de l'un à l'autre.
- Un montage **remplace le rack courant** seulement, après confirmation. Les sept autres sont intacts.

*Vérification automatique des montages* (`/tmp/tmont.js` dans la session, à refaire si on en ajoute) :
chaque montage est contrôlé contre le catalogue réel — type existant, potard existant, valeur entre 0 et 1,
la prise de départ est bien une **sortie** et celle d'arrivée une **entrée**, pas deux câbles sur la même
entrée, pas de module câblé sur lui-même, pas de module orphelin, un OUTPUT présent et alimenté. Puis trois
contrôles musicaux : un chemin existe d'une source sonore jusqu'à l'OUTPUT, aucun VCA fermé sans CV, aucune
voie de MIX 4 câblée mais laissée à zéro. **Refaire passer ce contrôle avant d'ajouter un montage** : ce
sont exactement les trois causes de patch muet listées dans la notice.

**Huit racks — v68**

`RACK AU SORT` et `VIDER` écrasaient le travail en cours sans retour possible, ce qui décourageait
d'essayer quoi que ce soit. Le rack est maintenant l'un de huit, choisis par le bouton `eur-ptn`.

- **Le format de sauvegarde a changé** : `memoire.eur` passe de `{prochain, sel, mods, cables}` à
  `{cur, racks:[…8]}`. `memEurNormalise()` reprend une ancienne sauvegarde comme rack 1 au lieu de la
  perdre — **ne pas retirer cette fonction**, des installations en v67 ou avant existent.
- `poserRack(o)` contient le filtrage qui était dans `chargerEur` (type inconnu écarté, potard manquant
  remis à sa valeur par défaut, câble incomplet écarté). `chargerEur` ne fait plus que choisir l'emplacement.
- `changerRack(n)` enregistre le rack quitté **avant** de charger le suivant. Le passage par `memEur()` est
  ce qui garantit qu'on ne perd rien ; ne pas l'ôter pour « optimiser ».
- `activerEur` ne pose le patch d'exemple que si **aucun** des huit racks n'a de module. Sinon, vider un
  rack puis revenir le remplissait d'office.
- Testé au banc : migration de l'ancien format, aller-retour entre deux racks, bouclage du sélecteur,
  absence totale de sauvegarde, sauvegarde abîmée (type inconnu, potards nuls, câbles tronqués).

**Moteur audio qui meurt en silence — v67**

Signalé : coupure de son, aucune machine ne sonne plus, seul un redémarrage rend le son. Diagnostic : sur
Android, un `AudioContext` peut être suspendu ou cassé par le système (appel entrant, autre application,
écran éteint) et **se dire encore `running` alors que son horloge ne bouge plus**. Changer de machine n'y
pouvait rien, le problème étant en dessous. Rien ne reprenait le contexte : `audioInit` ne fait `resume()`
que sur l'état `suspended`, et `visibilitychange` ne l'appelait pas.

- `reveillerAudio()` — `resume()` si l'état n'est pas `running`. Appelé au retour au premier plan et par
  PANIQUE.
- `surveillerAudio()` — appelé depuis `tick()`. Compare `ctx.currentTime` d'un tour à l'autre ; quatre tours
  sans que l'horloge avance alors que le séquenceur tourne ⇒ `refaireAudio()`.
- `refaireAudio()` — ferme le contexte, remet à zéro `SOURCES`, `COLLECTE`, `queue`, **`TD3.noeuds = null`**
  (et non `{}`, sinon `batirTd3` croit son moteur déjà construit) et `EUR.bus/sources/noeuds`, puis
  `audioInit()` et `allerMachine(S.modele)`. Aussi accessible à la main : bouton RELANCER LE MOTEUR AUDIO.
- `AUDIT.decroche` compte les recalages de l'ordonnanceur dans `tick()` — chacun s'entend comme un
  grésillement. Bouton ÉTAT DU MOTEUR AUDIO dans les réglages : fréquence, état, retard de sortie, sources
  vives, décrochages, relances. **Demander ce relevé avant de chercher une cause aux grésillements.**

*Piste non prise* pour les grésillements : la saturation du bus général est en `oversample:"4x"`, soit
quatre fois le travail sur chaque échantillon du mélange. Passer à `"2x"` diviserait ce coût par deux pour
une différence à peine audible — à faire seulement si le relevé montre beaucoup de décrochages.

**Zoom arrière et modules trop hauts — v67**

- Le pincement était borné à `Math.max(1, …)` : impossible de rétrécir. Plancher descendu à **0,45**, et le
  recalage automatique sur 1 restreint à la bande 0,97–1,04 — sinon tout geste de rétrécissement retombait
  aussitôt à 1.
- Au-delà de six potards, les modules passent sur **deux colonnes** (`.eur-kns2`, `grid-auto-flow:column`
  avec un nombre de rangées calculé). Le SEQ 16 passe de ~606 px à ~350 px de haut.
- `estCommande()` accepte maintenant `.eur-kn` et `.eur-bkn`. **Indispensable depuis la v66** : la poignée
  du potard étant le bloc entier, toucher l'étiquette sous le bouton n'était plus reconnu comme une
  commande et déplaçait la façade.

**Potards et modulation — v66**

*Maniement des potards* (`knobEm`, donc **toutes les machines**, pas seulement l'Eurorack) :

- Le déplacement est maintenant **cumulé d'un événement à l'autre** au lieu d'être mesuré depuis le point
  de départ. C'est ce qui permet de changer de finesse au milieu du geste sans faire sauter la valeur.
  Ne pas revenir à `v0 + d`.
- **S'écarter horizontalement affine**, jusqu'à dix fois : `fin = 1 + min(9, |dx| / 26)`. Un glissé droit
  se comporte exactement comme avant, donc aucune machine ne change de sensation.
- `opt.tap` : toucher sans tourner (moins de 5 px cumulés) appelle ce rappel. Même convention que la
  fonction `knob` de la DRM16, qui l'avait déjà. Facultatif.
- Dans l'Eurorack, **l'identifiant est passé du `.bt` au bloc `.eur-kn` entier**, étiquette comprise : la
  poignée triple de surface sans que rien ne bouge à l'écran. Idem pour `.eur-bkn` (tempo). `knobEm` trouve
  toujours l'aiguille par `querySelector("i")`. Si on redessine le rack, garder l'identifiant sur le bloc.
- L'afficheur du rack montrait **le nom en gros et la valeur en petit**, à l'envers de toutes les autres
  machines. Corrigé.

*Trois modules de modulation* — la famille n'en comptait que 4 sur 64, alors que c'est le cœur d'un
modulaire :

- **ENV FOL** : redresseur (`WaveShaper` en V) puis passe-bas. Le seul module qui produise une commande à
  partir d'un son. Permet le ducking.
- **DRIFT** : bruit relu très lentement (`playbackRate` de 0,0006 à 0,05), passe-bas fixe à 30 Hz.
  **Ne pas remplacer par un passe-bas très bas** : un biquad réglé à 0,08 Hz à 48 kHz n'a pas la précision
  nécessaire. C'est la lecture qu'on ralentit, pas le filtre. Deux sorties à des vitesses différentes.
- **CLK LFO** : fréquence recalculée depuis `stepDur()` à chaque pas via `m.tic`, pour suivre un tempo qui
  change en cours de route.

**Sources permanentes du rack — v65**

Dernier point ouvert depuis la v61. Les modules de l'Eurorack créent leurs oscillateurs dans leur propre
`creer()` sans les exposer : impossible de les retrouver pour les arrêter. On se sert donc du pisteur qui
enveloppe déjà `createOscillator` / `createBufferSource` / `createConstantSource`.

- `COLLECTE` (global, `null` par défaut) : quand c'est un tableau, toute source démarrée y tombe aussi.
- `eurBatir()` arrête `EUR.sources` (le jeu précédent), ouvre le panier, construit, puis le referme dans
  un `finally` et range le résultat dans `EUR.sources`.
- **Le `finally` n'est pas décoratif** : si une exception laissait `COLLECTE` ouvert, toutes les
  percussions jouées ensuite s'y accumuleraient sans fin.
- Mesuré au banc : rack de 15 modules reconstruit 21 fois, 546 sources créées, **26 vivantes** — celles du
  rack courant. Avant, les 546 tournaient toujours.

Ce mécanisme ne sert qu'à l'Eurorack. Les autres machines exposent leurs nœuds dans un cache, que
`debrancherTout` suffit à parcourir.

**Enregistrement à la volée — v64**

Cinq machines savent maintenant écrire une frappe dans leur motif : TR (les quatre modèles), DrumBrute,
TR-1000, machine d'archive, volca. Avec la MPC et la DMX qui le faisaient déjà, et les six Electribe,
cela fait seize machines.

- `T_PAS` (global) retient l'instant audio du pas affiché, capté dans `draw()` en dépilant la file.
  `pasLePlusProche(pos, L)` rend le pas courant si on est dans sa première moitié, le suivant sinon.
  **Ne pas remplacer par `pos + 1`** : une frappe juste en avance sur le temps se retrouverait un pas trop
  loin.
- `frapperTr / frapperDbi / frapperT1k / frapperArcm / frapperVlc`, sur le modèle de `frapperDmx` : jouer,
  puis écrire si la machine est en écriture **et** en lecture. Les boutons d'instrument de l'écran et le
  routage MIDI passent tous par ces fonctions — **ne plus appeler `voixXxx` directement** depuis
  l'interface, sauf pour une simple écoute après changement d'échantillon (`t1k-ech`, `vlc-son`).
- Structures de motif, toutes différentes : TR `pat[v][k][pas] = 1` avec la ligne 0 pour l'accent ;
  DBI `pistes[k].pas` masque de bits ; T1K `pas[k]` masque ; ARCM `pistes[k].pas` masque ; VLC
  `parties[k].pas` masque. Bit *i* = pas *i* dans tous les masques.
- Armement, calqué sur les vraies machines : TR → `TR.ecrit` (PATTERN WRITE, bouton existant) ;
  DBI → `DBI.rec`, **enfin lu** (le bouton existait, s'allumait, et ne servait à rien) ;
  T1K, ARCM → nouveau bouton `● REC` et drapeau `rec` ; VLC → nouveau bouton `● REC PAS` et drapeau
  **`recPas`**. Attention : `VLC.rec` existait déjà et désigne l'enregistrement des *mouvements de
  potards* (bouton MOTION). Deux choses distinctes, deux champs.
- La CR-5000 est volontairement exclue : ses rythmes sont en ROM, c'est le principe de la machine.

**Entrée MIDI des 25 machines — v63**

C'était la lacune relevée par l'audit v62 : `entreeNote` ne connaissait que les Electribe, et sur les dix
autres machines une note reçue tombait dans le cas par défaut et jouait **les voix de la DRM16**.

Principe retenu : **ne pas inventer de plan de notes**. Chaque machine publie déjà la note qu'elle émet
(`TR808_MIDI`, `T1K_MIDI`, `DBI_MIDI`, `DMX_MIDI`, `CR_MIDI`, ou `MIDI.base + rang` pour l'archive et la
volca). On retourne ces tables pour l'entrée. Conséquences : une seule table à tenir par machine au lieu de
deux, et deux machines de l'application branchées l'une sur l'autre tombent juste d'office.

- `routageMidi(m)` renvoie `{notes | base, defaut(), jouer(k, vel)}`, ou `null` si la machine n'est pas
  concernée. `rangMidi(r, note)` donne le rang visé, `-1` si inconnu → on joue la voix choisie à l'écran.
- MPC et DMX passent par `frapperPad` / `frapperDmx`, qui **jouent et enregistrent** déjà. Les autres
  machines n'ont pas de fonction de frappe qui enregistre : l'entrée MIDI y est audition seule.
- La TD-3 est mélodique et traitée à part. `TD3.precSlide = false` avant de jouer, sinon sa voix unique
  et permanente partirait de la hauteur du pas précédent — même précaution que son interface.
- L'Eurorack retourne explicitement sans rien faire : pas de voix fixes.
- **Le cas par défaut est maintenant réservé à `"16"` et `"32"`.** Vérifié : les 23 autres modèles sont
  traités explicitement. Toute machine ajoutée doit entrer dans `routageMidi`, sinon elle jouera la DRM16.

**Reste à faire** : l'enregistrement à la volée sur TR, DBI, T1K, CR5, ARCM, VLC. Chacune a une structure
de motif différente ; il faudrait une fonction de frappe par machine, sur le modèle de `frapperDmx`.
Noter au passage que `DBI.rec` existe, est basculé par un bouton et affiché, mais **n'est lu nulle part** :
fonction commencée et jamais finie.

**Audit v62 — la famille du bug de la v61, passée au peigne**

Le bug de la v61 avait une forme : quelque chose recopié à la main, machine après machine, et devenu
incomplet quand les dernières machines sont arrivées. Sept familles ont été examinées de façon
systématique (extraction du code, pas relecture), et voici le résultat.

*Saines* — rien à faire :
- Tuiles du menu ↔ `allerMachine` ↔ `MODELES` : 25 tuiles, toutes routées.
- Contrat des objets `MACHINE_*` : le moteur garde `boucle` et `longueur` derrière des tests, `MACHINE_EHX`
  peut s'en passer.
- Écouteurs empilés à chaque activation : aucun. Toutes les fabriques `knobEm` s'appellent au premier niveau.
- Potards lisant `S.bpm`/`S.vol` : les 21 sont rafraîchis en entrant (par `.maj()` direct ou par tableau).
- `docDeLaMachine`, `actif = …` : couverture complète.
- Clés de `memoire` : une par machine, sans collision.

*Corrigées* :
- **Bus oubliés sans être débranchés.** `TR`, `DBI`, `T1K`, `TD3`, `VLC`, `DMX`, `CR5`, `ARCM` remettaient
  leurs caches à zéro dans leur `activer*` et reconstruisaient ; les anciens nœuds restaient sur `master`.
  Muets, mais calculés : saturations suréchantillonnées, un convolveur pour la volca, un oscillateur qui
  tourne pour la TD-3 — un jeu de plus par passage dans le menu. Correctif : `debrancherTout(objet)`, qui
  descend dans l'objet, débranche chaque nœud et arrête chaque source, appelé avant chaque remise à zéro.
  **Règle** : ne jamais écrire `X.noeuds = {}` sans `debrancherTout(X.noeuds)` juste avant.
- **Silence après un export WAV.** À l'aller, `batirAudio()` refaisait tous les bus dans le contexte de
  rendu ; au retour, `remettre()` restaurait `ctx` et `master` mais ni `outBd/outMix/panBd/panMix`, ni
  `fxIn/dlyNode`, ni `MX.tubeIn`. Les machines qui ne refont pas leurs bus en s'activant — DRM16, les six
  Electribe, la MPC — rebranchaient leurs voix sur des nœuds du contexte de rendu : l'API refuse, plus un
  son jusqu'au redémarrage. Correctif : `remettre()` appelle `razNoeudsMachines()` comme à l'aller, et rend
  à la DRM16 ses quatre sorties mises de côté.
- **Chaîne de démarrage dupliquée** (24 lignes en bas du fichier, copie de `allerMachine`). Remplacée par
  `allerMachine(memoire.modele)`. Une machine ajoutée à l'une et pas à l'autre aurait planté au démarrage.

*Constatée, non corrigée* — c'est une lacune de fonction, pas un accident :
- **Entrée MIDI sur dix machines.** `entreeNote` ne connaît que les Electribe ; sur TR/RD-6, MPC, DMX,
  volca, CR-5000, DrumBrute, TR-1000, archive, TD-3 et Eurorack, une note MIDI tombe dans le cas par
  défaut et joue **les voix de la DRM16**. Même famille (« on joue une machine qu'on ne voit pas »), mais
  le corriger demande d'écrire le routage MIDI de chaque machine. Le cas par défaut devrait au minimum être
  réservé à `S.modele === "16" || "32"`.
- Les potards de tempo n'ont pas tous la même étendue (TR 40–300, volca 50–250, T1K 30–300…). Un tempo
  réglé hors de l'étendue d'une autre machine y apparaît en butée. Cosmétique.
- `razNoeudsMachines()` ne liste ni `TD3` ni `EUR` ; c'est sans conséquence parce que leurs `activer*`
  rebâtissent tout, mais une machine future qui garderait un cache sans le rebâtir devra y être ajoutée.

**Bug corrigé en v61 — changement de machine**

Symptôme signalé : on choisit une boîte à rythmes, on revient au menu, on en choisit une autre, et on
retombe sur la précédente — souvent, pas toujours — avec parfois le son qui semble couper.

Deux causes, indépendantes.

1. **Les listes de classes étaient recopiées à la main** dans les dix-sept fonctions d'activation. Celles
   écrites avant l'arrivée des dernières machines ne les effaçaient pas : `activerTr` n'enlevait ni `eur`,
   ni `td3`, ni `arcm`, ni `t1k`, ni `dbi`, ni `cr5`, ni `vlc`, ni `dmx` ; `activerMpc` encore moins ;
   `activerTd3` oubliait `eur`. Les deux classes restaient sur `<body>`, les deux unités passaient en
   `display:block`, et **c'est la règle la plus basse dans la feuille de style qui gagnait** — donc la
   machine la plus récemment ajoutée au projet, c'est-à-dire l'ancienne à l'écran. Pendant ce temps `actif`
   et `MACHINE` pointaient bien sur la nouvelle : on jouait une machine qu'on ne voyait pas.
   Mesuré sur les 272 transitions possibles : **18 étaient fautives**, toutes à destination de la MPC,
   des TR/RD-6, ou de la TD-3 depuis l'Eurorack.

   Correctif : `CLASSES_MACHINE` + `poserMachine(...)`, un seul endroit qui efface tout puis pose ce qu'on
   lui donne. **Ne jamais réécrire une liste à la main** : toute machine ajoutée doit voir sa classe entrer
   dans `CLASSES_MACHINE`, et rien d'autre à faire. Les variantes de couleur (`c1`–`c5`, `t1`–`t4`) sont
   effacées aussi, et réappliquées juste après par `appliquerCouleurRd6()` / `appliquerCouleurTd3()`, qui
   sont bien appelées après `poserMachine` — vérifier que ça reste le cas.

2. **Le rack de l'Eurorack ne se débranchait jamais.** Le module OUTPUT était câblé droit sur `master`, et
   `arretEur` ne faisait qu'éteindre le bouton. Ses oscillateurs tournent en permanence : en quittant le
   rack, ils continuaient de sonner par-dessus la machine suivante, et chaque reconstruction en empilait un
   de plus. Correctif : `EUR.bus`, refait à neuf à chaque `eurBatir()` (l'ancien est débranché d'un coup),
   et fermé par `poserMachine` dès que la classe `eur` n'est plus posée.

   *Réglé en v65* (voir ci-dessous). La TD-3 l'est depuis la v62, par `debrancherTout(TD3.noeuds)`.

**Icône, v60**

Le lanceur n'affiche plus la matrice vectorielle mais une image. Le montage :

- `mipmap-{m,h,xh,xxh,xxxh}dpi/ic_drm16.png` — le visuel plein cadre, 48 dp (héritée, API 24-25).
- `…/ic_drm16_round.png` — le même recadré en rond, mais **réduit d'abord à 63 %** pour que le boîtier
  tienne entier dans le cercle ; un simple recadrage rognait les potards.
- `…/ic_drm16_fg.png` — premier plan adaptatif, canevas de 108 dp, visuel à **63 %** centré sur le fond
  `#0E0C0C`. Cette valeur n'est pas arbitraire : à 70 % le masque circulaire mangeait 6 % du boîtier, à
  63 % il n'en mange plus rien. Ne pas l'augmenter sans revérifier.
- `mipmap-anydpi/ic_launcher.xml` est devenu un `<bitmap>` qui renvoie vers le PNG. **C'est indispensable** :
  le qualificatif `anydpi` l'emporte sur toutes les densités, et tant qu'il contenait un vecteur, aucun PNG
  n'était utilisé.
- `mipmap-anydpi-v26/ic_launcher.xml` et `ic_launcher_round.xml` : adaptatif, fond `@drawable/ic_bg`
  (recoloré en `#0E0C0C`), premier plan `@mipmap/ic_drm16_fg`.
- `AndroidManifest.xml` déclare maintenant `android:roundIcon`.

`drawable/ic_matrix.xml` n'est plus référencé. Il est laissé en place, il ne gêne pas.

**Corrigé en v59 — à ne pas refaire**

- **La propagation est maintenant datée.** `scheduleEur` empile `[id, sortie, instant]` au lieu de
  `[id, sortie]`, et `recevoir` reçoit l'instant de *son* impulsion, pas celui du pas. Une sortie s'annonce
  soit par son nom, soit par le couple `["out", t]` — voir `eurSortie()`. C'est ce qui fait que BURST
  déclenche réellement huit coups de caisse au lieu d'un seul, et ce qui rend CLK MULT et TRIG DLY
  possibles. La garde est passée de 400 à 900 étapes.
- **QUANT a une entrée `clk` séparée** : une sortie CV ne propage aucune porte, le module restait inerte.
- **S & H a une entrée `in`** et prélève vraiment ce qu'on lui donne ; sans câble dans IN il tire au sort,
  comme avant. `eurBatir()` prévient les modules via `m.brancher(bool)` une fois le câblage posé — c'est le
  seul mécanisme qui dit à un module si une de ses entrées est occupée.
- **REVERB : SIZE agit.** Quatre tampons de convolution préfabriqués (0,35 / 0,9 / 1,8 / 3,2 s), on bascule
  au lieu de refabriquer à chaque tour de potard.
- **Potard TEMPO dans `eur-bar`** (`eur-k-tempo`, classe `.eur-bkn`), remis à jour par `kEurTempo.maj()`
  dans `activerEur()`.

**Ajouté en v59 — huit modules**

CHANCE, CLK MULT, TRIG DLY (horloges) · EQ 3, PING PONG (traitements) · COWBELL, SHAKER, CLAVES
(percussions). Contrat inchangé : `{nom, hp, sombre, res, fam, kns, jacks, creer}`, avec `m.tic`,
`m.recevoir`, `m.maj`, et désormais `m.brancher` en option.

**Pistes ouvertes**

- Eurorack : plusieurs rangées, largeur en HP qui compte vraiment, sauvegarde de plusieurs racks,
  modules à écran (façon Plaits ou Clouds), enregistrement de mouvements de potards.
- Export WAV par pistes séparées (*stems*), comme le fait SEQ-16.
- Formats SysEx pour EMX-1, ESX-1, ER-1, EA-1 — aucune table d'implémentation trouvée à ce jour.
- MPC : pads multicouches (quatre échantillons par zone de vélocité).
- Envoi Syro vers une vraie volca sample : demanderait le SDK C de Korg compilé en natif, donc **écarté**
  tant que l'application reste une WebView.

---

## 6. Les trois projets de référence

Trois dépôts de l'auteur ont nourri ce travail, et méritent d'être relus avant d'y toucher :

- **MOC'TA BASS** (`volca-gain`) — librarian volca sample. La chaîne de traitement du son en vient, avec
  deux règles conservées telles quelles : la saturation passe **avant** la mise à niveau, et le gain
  supplémentaire **déplace la cible** au lieu de s'ajouter après.
- **KorgManager** — carte SmartMedia de l'ES-1. Contraintes exactes : WAV 32 kHz, 8 ou 16 bits, nommés
  `00` à `99`, cent fichiers au plus.
- **fabkorg** — enregistreur MIDI. L'export en **SMF format 1, une piste par son**, en vient.

Et deux sites : **drum-machine.app** (SEQ-16), dont le manuel public a donné l'export WAV, le décalage
humain et le tirage au sort ; **archive.org/details/drum-machines-collection**, 470 machines dont
l'application sert les fichiers **un par un depuis l'intérieur des ZIP**.
