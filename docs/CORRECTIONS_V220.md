# v220 — Réorganiser le Song EM-1

En mode SONG, sélectionner une position avec les touches puis utiliser les nouvelles commandes :

- ← POSITION / POSITION → déplacent cette occurrence d'un motif.
- DUPLIQUER insère une référence identique après la sélection, jusqu'à 16 positions.
- RETIRER enlève la position après confirmation et conserve le motif. ERASE en mode SONG utilise également cette confirmation.

Les commandes refusent les changements pendant PLAY, un rendu ou la protection en écriture. Le changement de référence par la molette et l'ajout par les touches sont également protégés pendant la lecture. Retirer la dernière position laisse un Song vide, auquel on peut ajouter le motif courant via la première touche.

Le départ du transport prépare maintenant le Song EM-1 depuis sa première position, y compris lorsque l'EM-1 est une machine active du SET. Un Song vide ou invalide empêche ce départ. La réorganisation est sauvegardée et ne modifie pas les motifs.

## Fichiers

Façade, CSS, notice et moteur EM-1 ; préparation du transport commun ; tests Node et navigateur ; HTML assemblé et versions Android/bureau.

## Validation

- Tests Node réussis : déplacement de la bonne occurrence parmi des répétitions, duplication, retrait refusé/confirmé, limites, protections, sauvegarde, motifs conservés et préparation du départ Song.
- Contrôles communs 0 à 7 réussis, dont JavaScript, compilation/tests Java et archive PC.
- Test navigateur ajouté au contrôle GitHub : boutons, confirmation, rechargement et protection pendant la lecture. Syntaxe Python vérifiée ; test non exécuté localement, Chromium étant bloqué par le sandbox.
- Rust non vérifié localement : rustc absent. APK non compilé localement.

Appliquer après la v219. Attendre sa compilation réussie avant l'envoi.
