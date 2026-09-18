# v217 — Palette synthé EM-1

Le point « enrichir la palette sonore » de l'analyse v122 progresse : les pistes SYNTH 1 et SYNTH 2 disposent de huit formes, sélectionnées avec WAVE et VALUE.

Les formes existantes SAW, SQR, TRI et SIN conservent leurs indices. Les nouveaux choix sont P25 (impulsion à 25 %), P12 (impulsion à 12,5 %), ORG (harmoniques 1/2/4/8) et ODD (harmoniques 1/3/5/7). Ces timbres synthétiques supplémentaires ne reproduisent pas les échantillons de la machine originale.

Les nouvelles formes utilisent PeriodicWave avec composante continue nulle et normalisation standard du navigateur. Un cache par contexte audio évite les créations répétées tout en séparant lecture et rendu hors ligne. Les deux oscillateurs, filtre, enveloppe et sous-oscillateur désaccordé sont conservés. Les choix suivent la sauvegarde du motif et la copie de son existante ; les indices invalides reviennent à SAW.

## Fichiers principaux

- page/js/250-electribe-em-1.js : nouvelles formes, sélection, voix et validation de mémoire.
- page/html/550-note-em.html : notice.
- outils/test-em-ondes.cjs et outils/controles.sh : régressions intégrées.
- HTML assemblé et versions Android/bureau actualisés.

## Validation

- Tests Node des fonctions réelles avec nœuds audio simulés : huit formes, anciens indices, coefficients finis sans composante continue, cache par contexte, sélection circulaire, mémoire et affectation aux deux oscillateurs.
- Contrôles communs 0 à 7 réussis, dont JavaScript, compilation/tests Java et archive PC.
- Rendu sonore réel et écoute non vérifiés localement. Navigateur non exécuté : Chromium bloqué par le sandbox.
- Rust non vérifié : rustc absent. APK non compilé localement ; validation à suivre dans GitHub Actions.

Appliquer après la v216. Attendre sa compilation réussie si elle est encore en cours.
