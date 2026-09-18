# v218 — Motifs EM-1 jusqu'à 64 pas

Cette version traite le point « EM-1 : 64 pas » de l'analyse v122.

## Utilisation

Au-dessus des touches, LONGUEUR règle le motif de 1 à 64 pas, à l'arrêt et hors protection. PAGE sélectionne les cellules 1–16, 17–32, 33–48 ou 49–64. Les pages au-delà de la longueur sont indisponibles. Le numéro de lecture reste affiché ; les pages ne défilent pas automatiquement pendant l'édition.

Les anciens motifs conservent leur longueur, leurs notes et les valeurs de leurs seize premiers pas. Les nouvelles cellules sont vides. Réduire la longueur conserve les cellules masquées. STEP EDIT emploie le numéro absolu du pas affiché. Clavier, Pattern Set et Song gardent leurs seize touches de commande.

## Fonctionnement

- Les douze pistes EM-1 stockent 64 pas et 64 notes ; le helper de seize pas partagé par les autres machines est conservé.
- REC, enregistrement à la volée, accents et Motion atteignent les pas 17 à 64.
- Motion FX reçoit une longueur optionnelle de 64 ; les autres machines gardent le défaut de 16.
- Copie et échange de parties transportent les 64 cellules. MOVE DATA tourne dans la longueur active et préserve les cellules masquées.
- SHIFT + Length propose aussi 32, 48 et 64.
- Le transport et l'export WAV communs utilisent déjà la longueur annoncée par la machine. L'export du motif courant peut donc couvrir 64 pas. Cette version ne refond pas l'export de chaînes Song de longueurs différentes.

## Fichiers

- page/js/250-electribe-em-1.js : données, migration, pages, REC, Motion et opérations de partie.
- page/js/040-mouvement-des-effets.js : longueur optionnelle de l'enregistrement Motion FX.
- Façade et CSS EM-1, notice et HTML assemblé.
- Tests Node EM-1, contrôles communs et test navigateur lancé par GitHub Actions.
- Versions Android et bureau : 218.

## Validation réalisée

- Tests Node réussis : migration depuis 16 pas, données 64 cellules, pages et curseur, lecture aux frontières 16/17, 32/33, 48/49 et au pas 64, REC, Motion, refus de changement de longueur pendant PLAY/protection, conservation des pas masqués, rotation et mémoire.
- Régressions des huit formes d'onde EM-1 réussies.
- Contrôles communs 0 à 7 réussis, dont JavaScript, compilation/tests Java et archive PC. Syntaxe Python du test navigateur vérifiée.
- Nouveau test navigateur ajouté au contrôle GitHub : édition du pas 64, sauvegarde, curseur, protection PLAY et vrai WAV de 64 pas avec une note au dernier pas et la forme ODD. Non exécuté localement : Chromium est bloqué par le sandbox. Résultat et rendu visuel à vérifier dans GitHub/sur téléphone.
- Rust non vérifié localement : rustc absent. APK non compilé localement.

Appliquer après la v217 et attendre sa compilation réussie avant l'envoi.
