# v212 — Copier une séquence TR-1000

À l'arrêt, COPIER SÉQ mémorise la séquence de l'instrument sélectionné. COLLER SÉQ la copie après confirmation sur l'instrument choisi, y compris dans une autre banque ou un autre motif.

Les 16 cellules sont copiées avec notes, accents, sous-pas, probabilités, cycles, retards et variations de paramètres. Le sens de lecture est copié. La longueur effective de la source devient la longueur propre de la destination : elle ne change donc pas si LAST diffère.

Le kit, les réglages sonores de base, MUTE, SOLO, le nom et VARIATIONS du motif destination sont préservés. Les variations copiées peuvent modifier le timbre de l'instrument cible. Les autres pistes restent intactes. MOTION REC est désarmé au collage.

ANNULER restaure le motif complet précédent, avec confirmation. Une seule annulation est conservée. Le presse-papiers de séquence est indépendant de celui du motif, temporaire et vidé au rechargement.

## Validation

- Tests Node TR-1000 réussis : copie indépendante, données complètes, changement de banque et d'instrument, longueurs différentes, confirmation refusée, protection PLAY, annulation et sauvegarde.
- Contrôles communs 0 à 7 réussis, dont JavaScript, Java, assemblage HTML et archive PC.
- Rust non vérifié : rustc absent localement.
- Test navigateur étendu aux nouveaux boutons, non exécuté localement car Chromium est bloqué par le sandbox.
- APK non compilé localement ; résultat à vérifier dans GitHub Actions.

Patch à appliquer après la v211. Attendre sa compilation réussie avant d'envoyer cette version pour ne pas annuler son exécution.
