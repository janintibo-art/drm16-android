# Boîtes à rythmes autonomes pour Android

Recréation des Electro-Harmonix DRM-16 (model 01), DRM-32 (model 03) et des Korg Electribe EM-1 et ER-1
en application Android. Un menu au lancement choisit l'appareil ; on en change ensuite par la notice,
derrière MODEL sur les Electro-Harmonix, derrière la référence EM-1 sur l'Electribe.

## Electribe EM-1

Séquenceur à pas, une autre famille de machine que les deux précédentes.

- **10 parties jouables** : huit percussions (grosse caisse, caisse claire, clap, tom, charley fermé,
  charley ouvert, crash, cowbell) et deux parties de synthé à deux oscillateurs, plus **deux pistes
  d'accent**, une pour les percussions, une pour le synthé.
- **16 pas**, seize motifs en mémoire, WRITE pour enregistrer, ERASE pour vider une partie,
  SHIFT + touche 3 pour le swing.
- **Par partie** : niveau, panoramique, hauteur, enveloppe courte, roulement de quatre coups, envoi d'effet.
- **Filtre de synthé** : coupure, résonance, intensité d'enveloppe, saturation.
- **Effets** : les onze de la façade — pitch shifter, ring modulator, phaser, flanger/chorus, réverbération,
  compresseur, distorsion, decimator, résonateur, filtre et delay modulé — plus un délai indépendant réglable
  en temps et en profondeur (DELAY EDIT).
- **KEYBOARD** transforme les seize touches en clavier pour la partie de synthé choisie, dans l'une des six
  gammes (chromatique, majeure, mineure, dorienne, pentatonique, blues), avec changement d'octave par ◀ et ▶.
  Toucher un pas le sélectionne pour lui donner sa hauteur.
- **SHIFT** donne accès aux fonctions imprimées sous les touches : longueur du motif (1 à 16 pas), gamme,
  swing, type de roulement, décalage, copie et échange de partie, copie de son, effacement de partie,
  duplication et effacement de motif, protection en écriture.
- **REC** arme l'enregistrement au vol : pendant la lecture, toucher une partie écrit un pas.
- La molette règle le paramètre allumé : motif, tempo, forme d'onde, hauteur.

- **MOTION SEQ** enregistre le mouvement d'un bouton sur les seize pas d'une partie, en Smooth (glissé)
  ou Trig Hold (tenu) : niveau, panoramique, hauteur, temps d'enveloppe et les quatre boutons du filtre.
- **SONG** enchaîne les motifs : seize positions, éditables aux touches et à la molette.

Restent de côté le mode STEP EDIT et le bend range.

## Electribe ER-1

Quatre percussions synthétisées, deux parties de bruit à la place des entrées audio, deux charleys qui se
coupent l'un l'autre, une crash, un hand clap et une piste d'accent — onze parties.

- **Oscillateur** : sinus ou triangle, avec profondeur, vitesse et forme de modulation (sinus, carré, triangle,
  montée, chute, aléatoire). La chute de hauteur donne la grosse caisse, la modulation rapide les métalliques.
  **RING MOD** multiplie les parties 1 et 2, ou 3 et 4.
- **Ampli** : décroissance, niveau, panoramique et le **LOW BOOST** propre à l'ER-1 (renfort des graves par
  filtre en plateau).
- **Delay** avec profondeur, temps, et un mode synchronisé au tempo.
- **Motion Seq**, mode **Song**, fonctions **SHIFT** imprimées sous les touches, seize motifs en mémoire.

Les deux parties AUDIO IN sont des percussions de bruit filtré : le téléphone n'a pas d'entrée ligne.

## MIDI

Le MIDI passe par l'API MIDI d'Android (`android.media.midi`, classe `Midi.java`) plutôt que par le Web MIDI,
dont le support en WebView n'est pas garanti. Il fonctionne donc avec une carte USB-C vers MIDI.

- **Sortie** : chaque coup part en note — percussions sur le canal réglable (canal 10 par défaut, notes General
  MIDI), notes du synthé de l'Electribe sur les canaux 1 et 2. Les notes sont postées à l'heure du pas, pas à
  l'heure où l'ordonnanceur les écrit.
- **Horloge** : les 24 impulsions par noire sont produites par un fil Java dédié, cadencé au `nanoTime`, avec
  les messages de départ et d'arrêt. La page ne fait que donner le tempo, ce qui évite la gigue des minuteurs
  JavaScript.
- **Entrée** : les notes déclenchent les timbres correspondants ; sur l'Electribe elles s'enregistrent au vol
  si REC est armé, et les notes hors canal de percussions jouent les parties de synthé. Les messages de départ
  et d'arrêt pilotent le transport.
- Les réglages sont dans la notice, et le bouton **GLOBAL** de l'Electribe y mène directement.

La permission n'est pas nécessaire : Android ouvre les ports MIDI sans demande d'accès USB. Le manifeste
déclare `android.software.midi` en option, l'application reste installable sans.
**Aucun accès réseau, aucun échantillon téléchargé** : la permission `INTERNET` n'est pas
demandée et la WebView bloque toute requête qui ne vient pas de `file:///android_asset/`.
L'application fonctionne en mode avion.

## Ce qui compose l'appareil

Tout tient dans `app/src/main/assets/drm16.html` : le panneau et le moteur audio.

- **Panneau** dessiné en CSS d'après la photo de l'appareil : châssis métal brossé,
  matrice orange, boutons rotatifs, pédale chromée, interrupteurs POWER et SPACE DRUM,
  jacks OUTPUT 1, OUTPUT 2 et BASS OUT (décoratifs).
- **Moteur audio** : neuf timbres *synthétisés en temps réel* par la Web Audio API —
  grosse caisse, caisse claire, clap, charley fermé, charley ouvert, cymbale longue,
  cymbale courte, wood block, space drum. Aucun fichier audio n'est embarqué : tout est
  construit à partir d'oscillateurs, de bruit filtré et d'enveloppes.
- **Séquenceur** : 16 rythmes sur la DRM16, 32 sur la DRM32 (deux sélections de 4 styles × 4 colonnes),
  16 doubles-croches par mesure,
  ordonnancement par anticipation de 120 ms sur l'horloge audio, donc sans dérive.
  ROCK BOOGIE, MISC SHUFFLE, REGGAE et FUNK III ont leur propre swing.

## Commandes

### Ce qui distingue les deux appareils

| | DRM16 | DRM32 |
|---|---|---|
| Interrupteur de droite | SPACE DRUM · ON | SELECTION, passe d'une sélection de 16 rythmes à l'autre |
| Troisième jack | OUTPUT 2 | CLOCK OUT |
| DELETE | standard, wood block, cymbale longue, cymbale courte | standard, space drum, wood block, cymbales |
| MISC IV | SHUFFLE | SWING |
| Panneau | noir et orange, LED bleue | bleu nuit, vert d'eau et jaune, LED rouge |

Sur la DRM32, chaque case de la matrice porte deux rythmes : la moitié allumée indique la sélection en cours.
Les réglages sont mémorisés séparément pour chaque appareil.

| Commande | Effet |
|---|---|
| POWER · ON | met sous tension ; débloque aussi le moteur audio d'Android |
| Pédale | départ / arrêt |
| STYLE / COLUMN | choisissent la case de la matrice (la case est aussi tactile) |
| DELETE | retire un timbre : WOOD BLOCK, LONG CYMBAL ou SHORT CYMBAL |
| SPACE DRUM · ON | ajoute les accents de space drum |
| VOLUME / TEMPO | glisser le doigt vers le haut ou le bas sur le bouton (40 à 220 BPM) |
| MODEL 01 | affiche la notice |

La LED clignote sur les temps. Un appui bref sur TEMPO bat la mesure, une série d'appuis en donne la moyenne.
Toucher le nom d'un timbre dans la liste DELETE le joue seul. Tous les réglages sont retenus d'un lancement
à l'autre, sauf la mise sous tension : l'appareil démarre toujours éteint.

Trois réglages se trouvent derrière MODEL 01 : le retour haptique, la lecture en arrière-plan, et la notice.

## Lecture en arrière-plan

Quand la lecture démarre, la page prévient l'application par `window.DRM16.playing(true)`, qui lance
`PlaybackService`, un service de premier plan. Tant qu'il tourne, le processus reste vivant et la WebView
continue de jouer, application quittée ; une notification permanente ramène au panneau. Le service ne produit
aucun son lui-même. Le focus audio est demandé au démarrage et rendu à l'arrêt : un appel entrant ou une autre
application coupe le rythme au lieu de se superposer.

En arrière-plan, l'anticipation de l'ordonnanceur passe de 0,22 à 1,2 s, par sécurité si le système ralentit
les minuteurs de la page.

Permissions déclarées : `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `POST_NOTIFICATIONS`
(demandée au premier départ sur Android 13 et suivants, uniquement pour afficher la notification) et `VIBRATE`.
Toujours pas d'`INTERNET`.

## Compilation

`.github/workflows/android.yml` compile l'APK de debug à chaque envoi sur `main`, puis
le dépose en artefact nommé `drm16-apk`. Pas de wrapper Gradle dans le dépôt : le
workflow installe Gradle 8.10.2 et JDK 17 lui-même.

Depuis le téléphone :

- `premier-depot.sh` crée le dépôt GitHub, pousse le projet et suit la compilation.
- `recup-apk.sh` télécharge l'APK de la dernière compilation réussie dans
  `Téléchargements/drm16-apk`.

Les mises à jour suivantes passent par `mise-a-jour.sh drm16_android "message"`, avec des
archives nommées `drm16_android_vN.zip`.

Réglages du projet : `compileSdk 34`, `minSdk 24`, `targetSdk 34`, JDK 17,
identifiant `fr.tibo.drm16`. Aucune dépendance externe.

## Remarque

Projet personnel, hommage à l'appareil d'origine. Sans lien avec Electro-Harmonix,
et sans réutilisation de ses sons.
