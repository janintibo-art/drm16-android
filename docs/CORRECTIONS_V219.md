# v219 — Export du Song EM-1 en WAV

Le bouton SONG EN WAV · UN PASSAGE exporte la chaîne entière à partir de sa première position. Chaque entrée conserve la longueur de son motif (1 à 64 pas), son contenu et ses sons. Les répétitions et les silences sont conservés. Le tempo, les niveaux, MUTE et SOLO courants s'appliquent. Le nombre de répétitions du menu WAV est ignoré pour cet export dédié.

Le calcul de durée additionne toutes les longueurs avant l'allocation audio. La limite habituelle de taille s'applique. Une chaîne vide ou comportant une référence invalide est refusée. Les motifs sont copiés indépendamment pour le rendu, y compris les données Motion.

La lecture est arrêtée avant le rendu. Les commandes sont bloquées pendant l'opération. Le contexte audio et la sélection d'édition (motif, page, pas sélectionné, positions Song) sont restaurés après succès ou échec. Le transport ne redémarre pas automatiquement. Le fichier porte le préfixe drm-em1-song et le nombre d'entrées.

Le menu WAV habituel reste disponible. Sa préparation audio est désormais également protégée en cas d'exception et un échec explicite de sauvegarde mémoire interrompt le rendu.

## Fichiers

- page/js/550-export-audio.js : plan du Song, durée, rendu et restauration.
- Façade, CSS et notice EM-1 ; bouton raccordé dans page/js/250-electribe-em-1.js.
- outils/test-em-song.cjs, contrôles communs et test navigateur GitHub.
- HTML assemblé et versions Android/bureau : 219.

## Vérifications

- Tests Node des fonctions réelles avec moteur de rendu simulé : ordre et temps d'une chaîne 4/32/4/64, répétitions, copies indépendantes, durée, un passage, garde-fous et export standard.
- Restauration contrôlée sur succès, refus d'allocation, erreur de préparation, erreur de programmation et rejet/sortie synchrone du rendu.
- Contrôles communs 0 à 7 réussis, dont JavaScript, compilation/tests Java et archive PC. Syntaxe Python vérifiée.
- Test navigateur ajouté au contrôle GitHub : véritable WAV d'une chaîne 4+32+8, dernière note audible et état restauré. Non exécuté localement : Chromium bloqué par le sandbox.
- Rust non vérifié localement : rustc absent. APK non compilé localement. Résultat du test audio et compilation à suivre sur GitHub.

Appliquer après la v218. Si sa compilation est encore en cours, attendre qu'elle soit verte avant l'envoi.
