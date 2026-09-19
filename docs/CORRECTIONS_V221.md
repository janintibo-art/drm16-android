# v221 — Annuler la dernière édition du Song EM-1

ANNULER SONG restaure, après confirmation, l'arrangement précédent et la position sélectionnée. Il couvre les déplacements, duplications, retraits, ajouts de positions, changements de motif à la molette et SHIFT + Clear Song.

Les notes et les sons des motifs ne sont pas restaurés ni modifiés. Une seule annulation est disponible : la nouvelle édition remplace la précédente. L'annulation est temporaire et disparaît au rechargement de l'EM-1. Elle est également disponible après avoir vidé le Song, mais reste bloquée pendant PLAY, un rendu ou la protection en écriture.

## Fichiers

Moteur, façade et notice EM-1 ; tests Node d'édition Song et test navigateur existant ; HTML assemblé et versions Android/bureau.

## Validation

- Tests Node réussis : confirmation acceptée/refusée, ordre et sélection restaurés, retrait de la dernière position, effacement, dernier état uniquement, protections, contenu des motifs conservé et effacement de l'annulation au rechargement.
- Contrôles communs 0 à 7 réussis, dont JavaScript, compilation/tests Java et archive PC.
- Test navigateur étendu aux confirmations et au bouton ANNULER SONG ; syntaxe Python vérifiée. Non exécuté localement car Chromium est bloqué par le sandbox.
- Rust non vérifié localement : rustc absent. APK non compilé localement.

Appliquer après la v220. Si sa compilation est encore en cours, attendre qu'elle soit verte avant l'envoi.
