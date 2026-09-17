# v195 — TR-1000 : huit banques indépendantes

Base : v194, commit c5d211998300a5c2e57b53742b88ea7c9558cf1a.

## Problème corrigé

Les lettres A–H changeaient, mais les seize motifs restaient partagés. Modifier
B1 changeait donc A1, C1, etc. La machine dispose maintenant de 128 emplacements
réels : huit banques de seize motifs, consultées par banque × 16 + numéro.

Un sélecteur BANQUE permet d’atteindre directement A–H sans parcourir tous les
motifs. Le bouton PTN conserve le défilement, y compris A16 → B1 et H16 → A1.
Le choix direct d’une banque conserve le numéro du motif. Les changements
sont réservés à l’arrêt pour éviter de mêler les anciens départs audio déjà
programmés aux paramètres du nouveau motif.

Pas, accents, sous-pas, probabilités et instruments sont indépendants entre
les banques. Les effets et les instantanés MORPH restent communs à la machine.
La sélection complète est sauvegardée après son changement.

## Migration

Un ancien projet à seize motifs est recopié dans chacune des huit banques,
avec des tableaux et instruments distincts. Cela conserve ce que l’utilisateur
retrouvait sous chaque lettre, y compris la banque sélectionnée au chargement.
Les modifications suivantes restent propres à leur emplacement.

Les nouveaux projets ont les démos en A1/A2 ; les autres emplacements sont
vides. Un projet à 128 motifs recharge ses propres banques sans duplication.
La restauration borne les indices, longueurs et valeurs des motifs ; les
listes manquantes retrouvent les valeurs par défaut. Les tableaux de pas,
accents, sous-pas et probabilités sont copiés à la sauvegarde pour éviter les
modifications indirectes d’un instantané mémoire.

Les anciennes versions ne savent pas lire ce format à 128 motifs : utiliser
v195 ou plus récent pour rouvrir et partager les projets ainsi enregistrés.

## Vérifications

`bash outils/controles.sh` : contrôles réussis, dont tests TR-1000 intégrés.
Node : migration des seize motifs dans les huit banques sans alias, notes,
sous-pas, probabilités, instruments, instantanés mémoire, indices invalides,
128 emplacements restaurés et protection pendant PLAY.

Chromium : choix des banques, modification de B1 sans toucher A1, sauvegarde
et rechargement sur B1, passages A16/B1 et H16/A1, commandes bloquées pendant
PLAY, migration d’un ancien projet ouvert en F4. Le vrai WAV de B1 contient
son pas 3 et non le pas 1 de A1 ; le contexte retrouve B1 après le rendu.
Les régressions v194 (probabilités, édition, vrais WAV 0/50/100 %) restent
réussies. Aucune erreur de page ; captures 393×851, 360×640 et 880×400.

Fichiers : moteur TR-1000, façade, style, notice, tests Node et navigateur,
page générée et versions Android/Windows 195. L’archive ne contient que les
fichiers modifiés sous `drm16_android/`. Compilation APK via GitHub Actions.
