# v188 — SmplTrek : chaîne automatique de motifs

Base : v187, commit 6da4bf64d8b4fdf393900982d3f02d82cf1160c7.

## Utilisation

À l'arrêt, choisir un motif puis toucher + MOTIF. Répéter pour composer une
liste, par exemple 1 → 1 → 3 → 4. Activer CHAÎNE puis PLAY : chaque entrée joue
un tour complet de son motif, puis la liste recommence depuis le début.

RETIRER FIN enlève la dernière entrée. VIDER demande confirmation et ne supprime
aucun motif. Jusqu'à 256 entrées sont conservées, répétitions comprises ; la
liste peut défiler horizontalement.

STOP conserve le motif entendu, coupe le son et retire les départs programmés.
Chaque nouveau PLAY repart de la première entrée. Le mode CHAÎNE et sa liste
sont sauvegardés ; aucune lecture ne démarre automatiquement au rechargement.
Choisir un motif manuellement à l'arrêt quitte CHAÎNE sans effacer sa liste.

## Fonctionnement

Le curseur affiché suit l'heure audio entendue, pas la position déjà préparée
par l'ordonnanceur. Plusieurs transitions peuvent être préparées en avance sans
perdre les répétitions ou afficher trop tôt un autre motif. La chaîne utilise
le transport commun ; le SmplTrek peut aussi être secondaire dans le SET.

L'édition de chaîne et le choix manuel des motifs sont protégés pendant PLAY.
DIRECT / FIN MOTIF reste destiné au jeu manuel. Les copies et les tranches de
v186/v187 restent disponibles ; la chaîne ne remplace pas les sons ni le mixage.

## Limites

- Tous les motifs de la chaîne doivent avoir la même longueur. Une incohérence
  introduite par un collage est vérifiée avant le démarrage.
- Lecture en boucle jusqu'à STOP ; pas encore de fin automatique ni de répétitions
  par compteur séparé. Pour répéter un motif, l'ajouter plusieurs fois.
- Édition par ajout en fin, retrait en fin ou vidage ; pas de déplacement d'entrée.
- Pas d'export du morceau complet ajouté par cette version.
- Utiliser v188 ou plus récent pour retrouver le mode de lecture de chaîne.

## Fichiers modifiés

- `page/js/590-smpltrek-dix-pistes.js` : édition, lecture et sauvegarde de chaîne,
  file de départs audio et position entendue. L'ancien changement immédiat de
  chaîne, non exposé dans l'interface, est remplacé par cet ordonnancement.
- `page/js/130-decalage-humain.js` : préparation au premier motif et vérification
  des longueurs avant le démarrage global.
- `page/html/200-unit-stk.html`, `page/css/090-roland-tr-808.css` : commandes et états.
- `page/html/400-note-stk.html` : notice intégrée.
- `app/src/main/assets/drm16.html` : assemblage régénéré.
- Versions Android/Windows : 188 ; tests Node et navigateur complétés.

## Vérifications

Tous les contrôles de `bash outils/controles.sh` passent.

Tests Node : chaîne vide, répétitions, limite de taille, longueurs incohérentes,
plusieurs motifs programmés en avance, affichage validé à l'heure audio,
STOP/PLAY, nouveau contexte audio, copie de la sauvegarde, retrait et vidage sans
perte des motifs, protection des modifications pendant PLAY.

Chromium avec le vrai transport : création par les boutons de 1 → 1 → 3 → 8,
ordre des voix 1, 1, 3, 8, 1, position entendue, commandes désactivées en lecture,
arrêt et redémarrage à la première entrée, sauvegarde et rechargement, retrait et
vidage après confirmation. Aucune erreur de page.
Les tests de lancement/copie v187 et d'import/découpage v186 passent également.
Affichage inspecté sur écran de téléphone ; captures aussi réalisées en paysage.

L'APK v188 reste à compiler par GitHub Actions après application de l'archive.
Le ZIP contient uniquement les fichiers modifiés sous `drm16_android/`.
