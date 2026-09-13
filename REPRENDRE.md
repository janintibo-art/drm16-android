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
La version actuelle est la **62**.

**Langue.** Tout est en français : le code, les commentaires, l'interface, la documentation. Les commits
sont sans accents (Termux).

---

## 2. Ce que contient le projet

La notice est découpée en **onglets `.doc`** dans `#note-corps` ; la barre de navigation est construite
toute seule à partir de leur `data-titre`. L'Eurorack en occupe trois : `note-eur` (les principes),
`note-eurmod` (les 64 fiches), `note-eurpat` (huit patchs et le glossaire).

Une seule page HTML porte toute l'application : `app/src/main/assets/drm16.html`, environ **890 ko**.
Le Java ne sert que de pont vers Android.

| Fichier | Rôle |
|---|---|
| `app/src/main/assets/drm16.html` | interface, audio, séquenceurs, tout |
| `.../java/fr/tibo/drm16/MainActivity.java` | WebView, pont JS, micro, fichiers, réseau |
| `.../java/fr/tibo/drm16/Midi.java` | API MIDI Android, SysEx |
| `.../java/fr/tibo/drm16/PlaybackService.java` | service de premier plan |
| `app/src/main/AndroidManifest.xml` | permissions |
| `.github/workflows/android.yml` | compilation |

### Les vingt-cinq machines

**Electro-Harmonix** DRM16, DRM32 · **Korg** Electribe EM-1, ER-1, EA-1, ES-1, ER-1 mkII, ES-1 mkII,
EA-1 mkII, EMX-1, ESX-1, volca sample · **Akai** MPC3000, MPC2000 · **Roland** TR-808, TR-909, TR-707,
CR-5000, TR-1000 · **Oberheim** DMX · **Arturia** DrumBrute Impact · **Behringer** RD-6, TD-3 ·
**Machine d'archive** (n'importe laquelle des 470 boîtes d'archive.org) · **Eurorack** (64 modules :
7 horloges, 5 séquenceurs, 7 oscillateurs, 8 filtres, 4 modulations, 10 utilitaires, 12 traitements,
11 percussions).

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

**Contrôle systématique avant livraison** : les vingt-cinq machines dans trois formats d'écran
(393×851, 880×400, 360×640), lecture effective, aucune erreur de page, aucun débordement.

---

## 5. Ce qui reste à faire

**Décidé, pas encore fait**

- **Bluetooth MIDI** dans le pont Java — reconnexion automatique et témoin de signal, d'après *fabkorg*.
  Impossible à essayer sans matériel.

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

   **Reste à faire** : les oscillateurs de l'ancien graphe sont débranchés mais jamais arrêtés. C'est
   silencieux, mais ça consomme. Il faudrait que `creer` retourne aussi la liste de ses sources pour
   pouvoir les `stop()`. Même remarque pour la TD-3, dont `construireTd3` empile des chaînes muettes.

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
