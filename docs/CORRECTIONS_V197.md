# v197 — TR-1000 : cycles par pas

## Ajout

Chaque pas de chaque instrument et motif peut jouer à un tour précis d'un groupe
répété de 2, 3 ou 4 tours. Exemple : 2:4 joue aux tours 2, 6, 10…
TOUS (1:1) désactive cette condition. Les anciens projets restent sur TOUS.

Choisir l'instrument, activer CYCLE, choisir la valeur puis toucher les pas.
Cette édition n'active ni n'efface les pas. Une bordure dorée repère les pas actifs
ayant une condition ; les valeurs apparaissent dans la grille en mode CYCLE.
CYCLE, PROBABILITÉ, ACCENT et SUB STEP sont des modes d'édition exclusifs.

## Comportement

- Un tour = LAST pas du transport, quel que soit le sens de lecture.
  En aller-retour, il ne s'agit pas nécessairement d'un trajet complet.
- La condition du pas source est évaluée avant sa probabilité. Un tour refusé
  ne consomme aucun tirage aléatoire et ne produit aucune voix ni note MIDI.
- Tous les sous-pas suivent la même décision. Accents et directions sont conservés.
- STOP/START remet le compteur au premier tour via la remise à zéro de v196.
- FILL et les frappes directes restent indépendants des conditions.
- REC sur un nouveau pas remet sa condition à TOUS ; sur un pas existant la conserve.
- Les réglages sont sauvegardés par instrument et motif, avec copies indépendantes
  et normalisation des valeurs anciennes ou invalides.
- Le WAV utilise les mêmes conditions : prévoir assez de mesures pour entendre
  un pas différé. Une prise MIDI rejoue les notes déjà enregistrées.

## Fichiers

- `page/js/480-roland-tr-1000.js` : données, moteur, mémoire et édition.
- `page/html/140-unit-t1k.html`, `page/css/140-roland-tr-1000.css` : commandes et repères.
- `page/html/430-note-t1k.html` : notice d'utilisation.
- `app/src/main/assets/drm16.html` : page régénérée.
- Versions Android et bureau : 197.
- Tests TR-1000 Node et navigateur étendus.

## Validation

`bash outils/controles.sh` : succès.
`python3 -u outils/test-t1k-navigateur.py` : succès, y compris vrais WAV :
condition 2:4 avec LAST 4, trois tours, source 1 audible seulement au pas global
4 (avant), 7 (arrière), 6 (aller-retour), indices à partir de zéro.
Édition mobile, exclusivité des modes, sauvegarde/rechargement et migration testés.
Capture mobile vérifiée. Compilation APK à suivre sur GitHub Actions.

Cette étape ajoute les cycles ; motion recording, micro-timing et mode chanson
restent des évolutions ultérieures. Archive différentielle à appliquer après v196.
