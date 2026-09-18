# v213 — Inversion de séquence TR-1000

INVERSER SÉQ inverse l'ordre des cellules de l'instrument sélectionné, à l'arrêt : sur quatre pas, 1–2–3–4 devient 4–3–2–1.

La longueur propre de la piste, ou LAST, définit la zone inversée. Notes, accents, sous-pas, probabilités, cycles, retards et variations suivent les cellules, même sans note. Les cellules hors de cette longueur, les autres instruments, le sens de lecture et les réglages sonores de base restent inchangés.

MOTION REC est désarmé. ANNULER restaure le motif entier précédent, après confirmation, selon le fonctionnement existant à un niveau. Une seconde inversion remet les cellules dans leur ordre initial. Une longueur de un pas ne modifie rien ni ne remplace l'annulation disponible.

## Validation

- Tests Node TR-1000 réussis : longueurs 3/4/16, toutes les données des pas, cellules hors longueur, autres pistes, double inversion, annulation, longueur LAST, sauvegarde et protection pendant PLAY.
- Contrôles communs 0 à 7 réussis : assemblage, HTML, JavaScript, Java et archive PC.
- Rust non vérifié localement : rustc absent.
- Test navigateur complété mais non exécuté localement, Chromium étant bloqué par le sandbox.
- APK non compilé localement ; validation à suivre dans GitHub Actions.

Patch à appliquer après la v212. Attendre que sa compilation soit verte avant d'envoyer cette version pour éviter l'annulation du build précédent.
