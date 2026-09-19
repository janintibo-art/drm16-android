# v225 — Song EM-1 sur 64 positions

Le Song de l'EM-1 accepte maintenant jusqu'à 64 positions, au lieu de 16. Le séquenceur affiche quatre pages de 16 positions : 1–16, 17–32, 33–48 et 49–64. Quand une page est pleine, la première touche de la page suivante ajoute la position suivante avec le motif courant. Les positions vides restent inactives et la 65e position est refusée.

La page suit automatiquement la position entendue pendant la lecture. Les déplacements, duplications, retraits, changements de motif, annulation et export WAV utilisent la même limite de 64 positions. Les Songs existants sont relus sans changement et la mémoire borne les données importées à cette limite.

## Fichiers

Moteur, façade, CSS et notice EM-1 ; tests Node d'édition/export Song et test navigateur ; HTML assemblé et versions Android/bureau.

## Validation

- Tests Node réussis : quatre pages, ajout inter-pages, sélection de la position 64, refus de la 65e, limite de duplication et export au-delà de 64 refusé.
- Syntaxe JavaScript et Python vérifiée, diff contrôlé.
- Contrôles communs 0 à 7 réussis, dont JavaScript, compilation/tests Java et archive PC. Le contrôle MIDI bureau s'arrête à l'étape 8 car `rustc` n'est pas installé dans cet environnement ; l'APK n'est pas compilé localement.
- Test navigateur ajouté pour les quatre pages et l'ajout de la position 17 ; son exécution dépend de Chromium dans GitHub Actions.

Appliquer après la v224 et attendre que sa compilation soit verte avant l'envoi.
