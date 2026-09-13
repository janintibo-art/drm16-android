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
La version actuelle est la **66**.

**Langue.** Tout est en français : le code, les commentaires, l'interface, la documentation. Les commits
sont sans accents (Termux).

---

## 2. Ce que contient le projet

La notice est découpée en **onglets `.doc`** dans `#note-corps` ; la barre de navigation est construite
toute seule à partir de leur `data-titre`. L'Eurorack en occupe trois : `note-eur` (les principes),
`note-eurmod` (les 67 fiches), `note-eurpat` (huit patchs et le glossaire).

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
**Machine d'archive** (n'importe laquelle des 470 boîtes d'archive.org) · **Eurorack** (67 modules :
7 horloges, 5 séquenceurs, 7 oscillateurs, 8 filtres, 7 modulations, 10 utilitaires, 12 traitements,
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
