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
La version actuelle est la **58**.

**Langue.** Tout est en français : le code, les commentaires, l'interface, la documentation. Les commits
sont sans accents (Termux).

---

## 2. Ce que contient le projet

La notice est découpée en **onglets `.doc`** dans `#note-corps` ; la barre de navigation est construite
toute seule à partir de leur `data-titre`. L'Eurorack en occupe trois : `note-eur` (les principes),
`note-eurmod` (les 56 fiches), `note-eurpat` (six patchs et le glossaire).

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
**Machine d'archive** (n'importe laquelle des 470 boîtes d'archive.org) · **Eurorack** (56 modules :
4 horloges, 5 séquenceurs, 7 oscillateurs, 8 filtres, 4 modulations, 10 utilitaires, 10 traitements,
8 percussions).

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

**Trouvé en relisant le code de l'Eurorack (v58), pas encore corrigé**

- **QUANT ne se met jamais à jour.** Il n'a que deux prises, IN et OUT, et son `recevoir` n'est appelé que
  si une *porte* arrive sur IN. Or une sortie CV de séquenceur ne propage pas de porte : seules les sorties
  de déclenchement le font. Le module est donc inerte dans son usage normal. Correctif : lui ajouter une
  entrée `clk` séparée, comme PLUCK qui a TRIG *et* V/OCT.
- **REVERB : le potard SIZE ne fait rien.** `m.maj` ne lit que `m.p.mix` ; la queue de convolution est
  fixée à deux secondes à la construction. Correctif : refabriquer le buffer dans `maj`, ou retirer le potard.
- **Pas de tempo sur la façade du rack.** `eur-bar` n'a que START : le tempo se règle depuis la DRM16 ou la
  TR-808. Un potard TEMPO dans la barre (via `knobEm`, comme `tr8-k-tempo`) réglerait le problème.
- **S & H ne prélève rien** : il tire au sort. Le nom est trompeur mais le comportement est documenté tel quel.

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
