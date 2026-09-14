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
La version actuelle est la **80**.

**Langue.** Tout est en français : le code, les commentaires, l'interface, la documentation. Les commits
sont sans accents (Termux).

---

## 2. Ce que contient le projet

La notice est découpée en **onglets `.doc`** dans `#note-corps` ; la barre de navigation est construite
toute seule à partir de leur `data-titre`. L'Eurorack en occupe trois : `note-eur` (les principes),
`note-eurmod` (les 81 fiches), `note-eurpat` (huit patchs et le glossaire).

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
**Machine d'archive** (n'importe laquelle des 470 boîtes d'archive.org) · **Eurorack** (81 modules, deux rangées :
9 horloges, 7 séquenceurs, 9 oscillateurs, 10 filtres, 9 modulations, 12 utilitaires, 14 traitements,
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
