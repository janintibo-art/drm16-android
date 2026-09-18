# v215 — Doubler une séquence TR-1000

DOUBLER SÉQ répète la phrase de l'instrument sélectionné dans les cellules suivantes et double sa longueur propre : 1 à 2, 3 à 6, 4 à 8 ou 8 à 16 pas. L'opération exige l'arrêt du transport et une confirmation. Une longueur supérieure à 8 est refusée sans modification.

La longueur source est la longueur propre de l'instrument, ou LAST si elle n'est pas définie. Notes, accents, sous-pas, probabilités, cycles, retards et variations sont copiés, y compris les cellules sans note. Les variations copiées sont indépendantes de leur source.

Les cellules de la seconde moitié sont remplacées, celles au-delà de la nouvelle longueur sont préservées. LAST, les autres pistes, la direction, le timbre de base, MUTE et SOLO restent inchangés. Les conditions de cycle restent liées aux tours du transport commun. MOTION REC est désarmé.

ANNULER restaure le motif entier précédent, y compris les cellules remplacées et la longueur, avec la confirmation et la limite à un état précédemment introduites.

## Validation

- Tests Node TR-1000 réussis : doublement de longueurs 1/3/8, toutes les données des cellules, copies indépendantes, préservation hors longueur, LAST, refus au-delà de 8, confirmation, annulation, sauvegarde et protection PLAY.
- Contrôles communs 0 à 7 réussis, dont assemblage, JavaScript, compilation/tests Java et archive PC.
- Rust non vérifié localement : rustc absent.
- Test navigateur étendu, non exécuté localement car Chromium est bloqué par le sandbox.
- APK non compilé localement ; validation à suivre dans GitHub Actions.

Appliquer après la v214. Attendre sa compilation réussie avant l'envoi pour éviter l'annulation du build précédent.
