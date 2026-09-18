# v208 — sélection directe des motifs TR-1000

PTN devient une liste de 1 à 16 : choisir directement le motif dans la banque
courante, sans appuis répétés. BANQUE conserve le numéro sélectionné. Le LCD
continue d'afficher l'adresse complète, par exemple H4. Les sélecteurs sont
bloqués pendant PLAY. Le choix est sauvegardé comme auparavant.

La sélection utilise la fonction existante choisirMotifT1k : aucun format de
sauvegarde ni contenu musical ne change. Pour copier vers un emplacement précis,
utiliser COPIER, choisir BANQUE et PTN, puis COLLER et confirmer.
Le passage automatique A16 vers B1 par appui sur l'ancien bouton est remplacé
par ces deux sélections explicites.

## Fichiers

page/html/140-unit-t1k.html : liste PTN.
page/css/140-roland-tr-1000.css : apparence identique à BANQUE.
page/js/480-roland-tr-1000.js : sélection et affichage synchronisés.
page/html/430-note-t1k.html : notice.
app/src/main/assets/drm16.html : assemblage.
outils/test-t1k-navigateur.py : parcours direct A16/H16/H4/A1 et rechargement.
Versions Android/bureau : 208.

## Validation

Tests Node TR-1000 réussis. Assemblage et contrôles JavaScript réussis.
Le contrôle global s'arrête sur les tests Rust bureau : rustc n'est pas installé
dans l'environnement local actuel. Aucun fichier Rust n'est modifié.
Chromium a été téléchargé, mais son lancement est bloqué par les restrictions
système (socket : Operation not permitted). Le test navigateur n’a donc pas pu
s’exécuter localement. Sa version actualisée est livrée pour les listes et leur sauvegarde.
Compilation APK et contrôles complémentaires sur GitHub Actions.

Archive différentielle après v207. Attendre sa compilation avant envoi.
