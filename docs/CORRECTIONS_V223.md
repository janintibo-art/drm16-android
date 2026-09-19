# v223 — Liste nommée des motifs EM-1

CHOISIR LE MOTIF affiche les 16 numéros et leurs noms. À l'arrêt, la sélection ouvre directement le motif souhaité, conserve les modifications du motif quitté et mémorise le nouveau choix. La page affichée s'adapte à la longueur du nouveau motif et la sélection de pas est réinitialisée.

La liste suit les renommages et les changements de motif par les autres commandes. Elle est bloquée pendant PLAY et un rendu, mais permet de consulter les motifs en protection en écriture. En mode Song, elle ne remplace pas les références des positions de l'arrangement.

## Fichiers

Moteur, façade, CSS et notice EM-1 ; tests Node et navigateur ; HTML assemblé et versions Android/bureau.

## Validation

- Tests Node réussis : sélection directe, modifications conservées, adaptation de page, choix sauvegardé, références Song préservées, indices invalides et protection pendant PLAY/rendu.
- Contrôles communs 0 à 7 réussis, dont JavaScript, compilation/tests Java et archive PC.
- Test navigateur existant étendu à la liste, aux noms, au rechargement et au verrouillage pendant PLAY. Syntaxe Python vérifiée. Non exécuté localement car Chromium est bloqué par le sandbox.
- Rust non vérifié : rustc absent. APK non compilé localement.

Appliquer après la v222 et attendre sa compilation réussie avant l'envoi.
