# DRM16 — boîte à rythmes autonome pour Android

Recréation de l'Electro-Harmonix DRM-16 en application Android.
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
- **Séquenceur** : 16 rythmes (4 styles × 4 colonnes), 16 doubles-croches par mesure,
  ordonnancement par anticipation de 120 ms sur l'horloge audio, donc sans dérive.
  ROCK BOOGIE, MISC SHUFFLE, REGGAE et FUNK III ont leur propre swing.

## Commandes

| Commande | Effet |
|---|---|
| POWER · ON | met sous tension ; débloque aussi le moteur audio d'Android |
| Pédale | départ / arrêt |
| STYLE / COLUMN | choisissent la case de la matrice (la case est aussi tactile) |
| DELETE | retire un timbre : WOOD BLOCK, LONG CYMBAL ou SHORT CYMBAL |
| SPACE DRUM · ON | ajoute les accents de space drum |
| VOLUME / TEMPO | glisser le doigt vers le haut ou le bas sur le bouton (40 à 220 BPM) |
| MODEL 01 | affiche la notice |

La LED clignote sur les temps. Quitter l'application arrête la lecture.

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
