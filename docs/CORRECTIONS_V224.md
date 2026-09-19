# v224 — Choisir les motifs du Song EM-1 par leur nom

En mode Song, MOTIF DE CETTE POSITION affiche les seize numéros et noms de motifs. Après avoir sélectionné une position, choisir une entrée remplace uniquement sa référence, sans changer les autres positions ni le motif ouvert dans l'éditeur.

La molette et la nouvelle liste utilisent la même fonction de remplacement. ANNULER SONG restaure la référence précédente. Rechoisir la même entrée conserve l'annulation disponible. La liste est bloquée si le Song est vide, pendant PLAY, un rendu ou la protection en écriture.

## Fichiers

Moteur, façade, CSS et notice EM-1 ; tests Node et navigateur ; HTML assemblé et versions Android/bureau.

## Validation

- Tests Node réussis : affectation ciblée, motif courant conservé, annulation, sélection identique, valeurs invalides et protections.
- Contrôles communs 0 à 7 réussis, dont JavaScript, compilation/tests Java et archive PC.
- Test navigateur étendu à la sélection par nom dans le Song et à son annulation. Syntaxe Python vérifiée. Non exécuté localement car Chromium est bloqué par le sandbox.
- Rust non vérifié : rustc absent. APK non compilé localement.

Appliquer après la v223. Si sa compilation est encore en cours, attendre qu'elle soit verte avant l'envoi.
