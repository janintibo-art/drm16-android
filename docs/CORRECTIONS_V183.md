# v183 — MC-101 : seize clips par piste

Base : v182 (`5e31ea54c3dcafab11b3648be989a00c11cc1bce`). Les compilations
Android et Windows de cette base sont réussies sur GitHub.

## Comportement

La MC-101 passe de 4 à 16 clips par piste, soit 64 clips indépendants. Chaque
clip contient toujours 16 pas. Les boutons CLIP 1 à 16 donnent un accès direct.
Le bouton de défilement revient du clip 16 au clip 1.

Les quatre scènes personnalisées sont conservées. Chacune peut désormais
associer n'importe lequel des 16 clips de chacune des quatre pistes. Le mode
DIRECT ou MESURE, l'annulation des demandes et la confirmation avant remplacement
des scènes gardent leur comportement.

## Sauvegardes

Les anciens projets gardent les notes des clips 1 à 4 et les associations de
scènes. Les clips 5 à 16 sont ajoutés vides, sans partage de tableaux entre les
clips. Les nouveaux clips et leurs sélections sont enregistrés dans les mêmes
sauvegardes de machine et de projet.

Une ancienne application v182 ne connaît que quatre clips : pour conserver
tout le contenu des nouvelles sauvegardes, utiliser la v183 ou une version
ultérieure sur les deux appareils lors d'un échange Android/Windows.

## Fichiers

- `page/js/580-roland-mc-101.js` : 16 clips, nombre de scènes distinct,
  validation des indices de scènes indépendante de celle des clips.
- `page/js/590-smpltrek-dix-pistes.js` : façade MC dans ce fichier partagé,
  conservation de quatre boutons de scènes.
- `page/html/390-note-mc.html` : notice et compatibilité des sauvegardes.
- `app/src/main/assets/drm16.html` : réassemblé depuis les sources officielles.
- Tests MC et navigateur adaptés à la nouvelle capacité ; versions Android
  et bureau alignées sur 183.

## Vérifications

La suite `outils/controles.sh` passe, dont les régressions MC existantes et un
scénario supplémentaire : migration d'une sauvegarde à quatre clips, 64 tableaux
indépendants, copie entre clips 15 et 16, scène utilisant le clip 16, restauration,
lancement quantifié réel du moteur et retour au clip 1.

Les essais navigateur ciblent le chargement des machines dans trois formats,
les clips MC (dont le clip 16 après rechargement), les lancements et les scènes.
La façade portrait 393 × 851 a aussi été inspectée visuellement.

Le jeu de données du test navigateur de lancement a été adapté : en étendant
sa boucle à seize clips, il produisait des indices de percussion hors 0–3 et
des notes MIDI supérieures à 127. Ces valeurs étaient correctement normalisées
au rechargement, ce qui invalidait la comparaison du test. Les données sont
maintenant valides sur tous les clips ; aucune validation de production n'a
été assouplie.

La compilation APK de cette version et les essais sur téléphone restent à faire
après application du ZIP. La compilation Windows v182 ne valide pas un EXE v183.

## Suite

Les pistes Looper et l'import de samples/boucles MC ne font pas partie de ce lot.
La synthèse, les effets et le stockage Android de la v182 sont conservés.
