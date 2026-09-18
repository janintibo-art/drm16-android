# v204 — paramètres par pas sur la TR-1000

PARAM PAS permet de choisir TUNE, DECAY, C1, C2, LEVEL ou A/B, puis une valeur
normalisée de 0 à 100 % par incréments de 5 %. Toucher un pas applique uniquement
ce paramètre. BASE efface sa variation, sans toucher aux autres paramètres du pas.
L'édition ne change pas les notes actives et est exclusive avec les autres modes.

Les variations s'appliquent au coup et à ses sous-pas, suivent le pas source dans
les trois directions, et passent par les conditions/probabilités/mute/solo existants.
Elles sont prioritaires sur le morphing pour le paramètre concerné ; le pas suivant
sans variation retrouve ses réglages habituels. Les potards de base ne changent pas.
Les macros générales existantes continuent de s'appliquer à leur emplacement habituel.

Ces données sont sauvegardées par instrument et motif et copiées indépendamment.
Les anciens projets ne reçoivent aucune variation. Les valeurs invalides sont
normalisées ou ignorées. Les vrais exports WAV utilisent les paramètres par pas.
FILL et les frappes directes gardent leurs valeurs de base. Ces paramètres de synthèse
ne sont pas traduits en messages de contrôleurs MIDI. Il ne s'agit pas encore de
l'enregistrement continu des gestes : cette étape apporte l'édition pas à pas.

## Fichiers

- page/js/480-roland-tr-1000.js : données, lecture, édition, mémoire et validation.
- page/html/140-unit-t1k.html : commandes PARAM PAS, paramètre et valeur.
- page/html/430-note-t1k.html : notice.
- app/src/main/assets/drm16.html : assemblage.
- outils/test-t1k.cjs et outils/test-t1k-navigateur.py : vérifications.
- Versions Android/bureau : 204.

## Validation

Contrôles du projet réussis. Tests Node : pas source en arrière, sous-pas,
priorité sur morphing, retour à la base, mémoire sans alias, copie et migration.
Tests navigateur : édition ciblée, modes exclusifs, sauvegarde et vrais WAV LEVEL
0 % silencieux / 100 % audible, puis retour BASE conservant TUNE à 75 %.
Affichage mobile inspecté. Compilation APK par GitHub Actions.

Archive différentielle après v203. Attendre sa compilation avant envoi.
