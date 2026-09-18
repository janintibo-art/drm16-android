# v209 — noms des motifs TR-1000 et correction Rust bureau

## Noms

NOM DU MOTIF accepte un nom court. Valider avec Entrée ou quitter le champ.
La liste PTN affiche ensuite le numéro et le nom. Les emplacements restent
indépendants, la sélection se sauvegarde comme auparavant. Le nom est repris
par COPIER/COLLER ; vider le champ ne change aucune note ni aucun réglage sonore.
Le changement est bloqué pendant PLAY. Les anciens motifs restent sans nom.

Les textes sont normalisés et limités à 24 caractères côté données. L'interface
les affiche avec textContent, jamais comme du HTML. Les espaces répétés sont
réduits et les caractères de contrôle retirés.

## Correction de la version PC

Une substitution trop large des numéros de version depuis v203 avait transformé
l'édition du langage Rust (2021) en 2031, puis 2041, etc. Cette valeur est rétablie
à 2021, indépendamment de la version de l'application 209. verifier-bureau.sh
vérifie maintenant explicitement cette valeur avant la compilation.

## Fichiers

page/js/480-roland-tr-1000.js : noms, mémoire, copie et liste PTN.
page/html/140-unit-t1k.html et page/css/140-roland-tr-1000.css : champ de saisie.
page/html/430-note-t1k.html : notice.
app/src/main/assets/drm16.html : assemblage.
outils/test-t1k.cjs et outils/test-t1k-navigateur.py : tests des noms.
verifier-bureau.sh et bureau/src-tauri/Cargo.toml : édition Rust corrigée et contrôlée.
Versions Android/bureau : 209.

## Validation et limites

Tests Node réussis : nommage, conservation des notes, banques indépendantes,
Unicode, longueur, protection PLAY, mémoire, copie et anciens projets.
Assemblage, contrôles HTML/JavaScript, tests Java et vérification de la coque PC
réussis. Le contrôle global s'arrête avant les tests Rust : rustc est absent.
La compilation Rust complète reste donc à vérifier sur GitHub Actions.
Le test navigateur actualisé est livré, mais non exécuté localement : le lancement
de Chromium est bloqué par l'environnement (restriction socket, constatée en v208).

Archive différentielle après v208. Attendre sa compilation avant envoi.
