# v191 — SmplTrek : édition des entrées de chaîne

Base : v190, commit e246e75f4e23c058d32f6641c81aeac16bee88e2.

## Changement

La chaîne ne permettait que l’ajout et le retrait en fin de liste : corriger
une entrée au milieu obligeait à reconstruire toute la fin de l’arrangement.
Ses numéros sont maintenant des boutons de sélection. Une rangée de commandes
apparaît après sélection : AVANT, APRÈS, DUPLIQUER, RETIRER.

Le déplacement échange l’entrée avec sa voisine. DUPLIQUER ajoute une nouvelle
occurrence du même motif juste après la sélection, sans copier ses notes dans
un autre motif. Chaque répétition est sélectionnable séparément. RETIRER
supprime uniquement l’occurrence ; sons, notes, tranches et motifs restent
intacts. Les anciennes commandes RETIRER FIN et VIDER restent disponibles.

L’édition est réservée à l’arrêt, y compris quand une autre machine joue.
La capacité reste de 256 entrées. Les boutons de déplacement aux extrémités
et la duplication d’une chaîne pleine sont désactivés. Retirer la dernière
entrée désactive CHAÎNE. VIDER conserve sa confirmation.

La sélection d’édition est indépendante du motif courant et du départ de
lecture. Retoucher l’entrée sélectionnée referme les commandes. PLAY repart
au début ; le cadre de sélection et le fond de lecture sont distincts.
Le défilement horizontal suit la sélection déplacée. Les boutons sont conservés
lorsque l’ordre ne change pas, pour éviter de perdre le focus inutilement.

L’ordre est sauvegardé via le format de chaîne existant. La sélection temporaire
est réinitialisée au chargement. Aucun nouveau format de projet n’est requis.

## Fichiers

- `page/js/590-smpltrek-dix-pistes.js` : sélection, opérations, bornes et affichage.
- `page/html/200-unit-stk.html`, `page/css/090-roland-tr-808.css` : boutons et états.
- `page/html/400-note-stk.html` : notice d’édition et distinction répétition/copie.
- `app/src/main/assets/drm16.html` : assemblage régénéré.
- Versions Android/Windows : 191 ; tests SmplTrek et navigateur étendus.

## Vérifications

Tous les contrôles de `bash outils/controles.sh` passent, assemblage compris.
Tests Node : occurrences répétées, déplacements, insertion, suppression,
limite de 256, sélection invalide, conservation des motifs et du mixage,
restauration et refus de toute édition pendant PLAY.

Chromium : vrais boutons, bornes, sauvegarde/rechargement, sélection temporaire,
protection pendant PLAY, départ au début, chaîne vide et absence d’erreurs JS.
Les régressions chaîne (ordre entendu, répétition, STOP/PLAY) et clavier MIDI
v190 passent aussi. Captures 393×851, 360×640 et 880×400 ; format téléphone inspecté.
`git diff --check` ne signale aucun défaut.

L’APK reste à compiler par GitHub Actions après application du ZIP. L’archive
contient seulement les fichiers modifiés sous `drm16_android/`.
