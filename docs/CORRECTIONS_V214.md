# v214 — Effacement ciblé d'une séquence TR-1000

EFFACER SÉQ vide les 16 cellules de l'instrument sélectionné, uniquement à l'arrêt et après confirmation. Les cellules au-delà de la longueur active sont incluses, comme les réglages attachés à des cellules sans note.

Notes et accents sont supprimés. Sous-pas, probabilités, cycles, retards et variations retrouvent leurs valeurs par défaut : 1, 100 %, 1:1, 0 et aucune variation.

Les autres instruments, les réglages sonores de base, la longueur, la direction, MUTE et SOLO sont préservés. MOTION REC est désarmé après l'effacement. ANNULER restaure le motif entier précédent après confirmation, selon le fonctionnement existant à un niveau. Une séquence déjà entièrement vide ne remplace pas l'annulation disponible et ne demande pas de confirmation.

## Validation

- Tests Node TR-1000 réussis : effacement complet de la seule piste sélectionnée, cellules hors longueur et sans note, confirmation refusée, protection PLAY, annulation, séquence déjà vide et sauvegarde.
- Contrôles communs 0 à 7 réussis, dont assemblage HTML, JavaScript, compilation/tests Java et archive PC.
- Contrôle Rust non exécuté : rustc absent localement.
- Test navigateur enrichi, non exécuté localement car Chromium est bloqué par le sandbox.
- APK non compilé localement ; validation à suivre dans GitHub Actions.

Appliquer après la v213. Attendre sa compilation réussie avant l'envoi pour éviter l'annulation du build précédent.
