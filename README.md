# Boîtes à rythmes autonomes pour Android

Recréation des Electro-Harmonix DRM-16 (model 01), DRM-32 (model 03) et de la Korg Electribe EM-1
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
- **Effets** : ring modulator, phaser, flanger/chorus, réverbération, compresseur, distorsion, résonateur,
  filtre et delay modulé, plus un délai indépendant réglable en temps et en profondeur (DELAY EDIT).
  Pitch shifter et decimator ne sont pas encore faits.
- **REC** arme l'enregistrement au vol : pendant la lecture, toucher une partie écrit un pas.
- La molette règle le paramètre allumé : motif, tempo, forme d'onde, hauteur.

Restent à faire : Motion Seq, le clavier, le mode Song et les fonctions imprimées sous les touches.
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
