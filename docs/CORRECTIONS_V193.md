# v193 — SmplTrek : export d’une piste séparée

Base : v192, commit 846dd583f1e38e56ff84855b5c9250fa924c5ee9.

## Utilisation

Le bouton EXPORT : MIXAGE passe en EXPORT : PISTE. Choisir TRK 1 à TRK 10,
puis lancer le WAV. La cible affichée suit la piste sélectionnée et se fige
au lancement du rendu. Le choix est temporaire ; au redémarrage, MIXAGE est
le mode par défaut. L’export complet de la v192 reste accessible.

Un fichier est produit par action, pour toute la chaîne dans son ordre.
Le nom inclut piste01 à piste10. Répéter l’opération pour les pistes voulues.
L’export n’utilise pas le bouton SOLO et ne modifie pas les sourdines. Les
règles MUTE/SOLO existantes restent respectées : piste non audible ou sans
pas refusée. Un sample absent sur une autre piste ne bloque pas le rendu.

Les WAV stéréo gardent leur origine temporelle commune, les silences de la
chaîne, les notes Instrument, les tranches, les panoramiques et les queues
de sons. Ces queues peuvent donner des durées totales différentes. Pour
assembler plusieurs fichiers, les aligner au début et conserver les mêmes
motifs, tempo, MUTE/SOLO et réglages entre les exports.

## Niveaux et limites

L’atténuation de chaque pas est calculée avec le nombre de pistes audibles
du mixage, avant de ne retenir que la piste à exporter. Une piste isolée
n’est donc pas artificiellement amplifiée lorsque d’autres jouaient avec elle.
La table STK et la sortie générale sont appliquées à chaque WAV, comme pour
le mixage. Ce ne sont pas des pistes brutes ; leur somme n’est pas garantie
identique au mixage complet lorsque le limiteur ou l’écrêteur travaille.

Pas d’export automatique des dix pistes en une seule action. Les garde-fous
v192 restent actifs : chargement à froid, durée maximale, verrouillage de
l’interface, restauration après erreur et reprise du son après rendu.

## Fichiers

- `page/js/595-mixage-chaine-smpltrek.js` : cible, filtrage des voix, atténuation,
  noms de fichiers et choix d’export.
- Façade, style et notice SmplTrek ; mise à jour de l’affichage de la cible.
- Page embarquée régénérée ; versions Android et Windows : 193.
- Tests SmplTrek Node et tests de vrais exports Chromium complétés.

## Vérifications

Tous les contrôles de `bash outils/controles.sh` passent.
Tests Node : filtrage par piste, charge du mixage conservée, indices invalides,
MUTE/SOLO, piste vide et absence de sample non requis.

`python3 outils/test-export-stk.py` : vrais fichiers WAV de deux pistes
simultanées, canaux gauche/droite isolés, niveaux comparés au mixage complet,
silences aux bons emplacements, cible affichée et noms de fichiers vérifiés.
Le choix de piste et le mixage sont conservés après export ; une piste muette
ou vide ne produit pas de fichier. Absence du sample d’une autre piste tolérée.

Toute la suite v192 d’export reste réussie : chargement à froid, erreur sample,
panne de rendu, écriture refusée, nouvel essai, transposition, tranches, queue
longue et jeu live audible ensuite. Aucune erreur JavaScript. Captures aux
formats 360×640, 393×851 et 880×400 ; affichage téléphone inspecté.
La page correspond aux sources et `git diff --check` passe.

APK à compiler par GitHub Actions après application. Le ZIP contient
uniquement les fichiers modifiés sous `drm16_android/`.
