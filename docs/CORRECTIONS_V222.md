# v222 — Noms des motifs EM-1

Le champ NOM DU MOTIF COURANT permet de nommer les motifs avec jusqu'à 24 caractères Unicode. Le numéro du motif courant est affiché dans le libellé. Entrée ou la sortie du champ valide la saisie ; vider le champ retire le nom. Les espaces successifs sont normalisés.

Le nom apparaît sur l'afficheur lorsque PATTERN est sélectionné. En mode Song, la ligne POSITION affiche le numéro et le nom du motif référencé par la position sélectionnée. Cette sélection peut différer du motif courant : le champ reste explicitement lié au motif courant.

Les noms sont sauvegardés avec les motifs et suivent leur copie complète. Les anciennes sauvegardes restent compatibles, avec des noms initialement vides. Aucun contenu saisi n'est interprété comme du HTML. Le renommage est bloqué pendant PLAY, un rendu ou la protection en écriture. Une saisie en cours n'est pas reportée sur un autre motif si la sélection change.

## Fichiers

Moteur, façade, CSS et notice EM-1 ; tests Node 64 pas et test navigateur GitHub ; HTML assemblé et versions Android/bureau.

## Validation

- Tests Node réussis : noms, espaces, accents, limite Unicode, sauvegarde, migration des anciens motifs, effacement, protections et notes préservées.
- Contrôles communs 0 à 7 réussis, dont JavaScript, compilation/tests Java et archive PC.
- Test navigateur ajouté pour le champ, sa validation, la sauvegarde, le nom de la position Song et la protection PLAY. Syntaxe Python vérifiée. Non exécuté localement car Chromium est bloqué par le sandbox.
- Rust non vérifié : rustc absent. APK non compilé localement.

Appliquer après la v221. Si sa compilation est encore en cours, attendre qu'elle soit verte avant l'envoi.
