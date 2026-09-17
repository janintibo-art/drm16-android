# v189 — SmplTrek : pistes Instrument et notes par pas

Base : v188, commit ae20fc0007e81d795c0d67681b689e97146d3b68.

## Nouveautés

Chaque piste peut désormais passer de SHOTS à INSTRUMENT à l'arrêt. SHOTS
conserve la lecture habituelle. INSTRUMENT permet d'écrire une hauteur relative
au sample sur chacun des seize pas, de -12 à +12 demi-tons.

Choisir une hauteur dans la liste, puis toucher un pas. Une autre note remplace
celle du pas ; retoucher la même note et la même tranche l'efface. ÉCOUTER joue
le choix courant sans modifier le motif. Le texte entre crochets sur le pad
indique sa hauteur. INSTRUMENT fonctionne avec le son entier ou avec SLICE.

Les auditions respectent MUTE et SOLO. Le type de piste, la hauteur sélectionnée
et les notes sont conservés dans les sauvegardes. COPIER MOTIF inclut les notes,
avec des listes indépendantes ; EFFACER retire aussi les notes de la piste choisie.

Revenir en SHOTS ignore les hauteurs écrites sans les perdre. Elles reviennent
en réactivant INSTRUMENT. Modifier un pas en SHOTS le retire ou écrit zéro.
Les anciens projets restent en SHOTS avec les notes à zéro.

## Limites et lecture

ORIGINE signifie zéro transposition relative, pas une note détectée dans le son.
TUNE s'ajoute à la hauteur enregistrée. La transposition se fait par vitesse de
lecture : elle change aussi la durée. Aucun timestretch n'est ajouté.
Une hauteur par pas, sans accord ni durée de note séparée ; DECAY conserve son rôle.
Le MIDI reste routé par piste et joue la hauteur sélectionnée sur cette piste :
le nouveau clavier MIDI chromatique ne fait pas partie de ce lot.

Pour préserver les nouveaux champs de notes, ouvrir les projets avec v189 ou
plus récent. Les samples personnels doivent toujours accompagner les projets
partagés. Les chaînes et tranches des versions précédentes sont conservées.

## Fichiers

- `page/js/590-smpltrek-dix-pistes.js` : type et hauteur de piste, matrice de notes
  par motif, lecture transposée, édition, copies, mémoire et commandes.
- `page/html/200-unit-stk.html`, `page/css/090-roland-tr-808.css` : TYPE, choix de
  hauteur et ÉCOUTER.
- `page/html/400-note-stk.html` : notice intégrée.
- `app/src/main/assets/drm16.html` : assemblage régénéré.
- Versions Android/Windows : 189 ; tests restauration, SmplTrek et navigateur.

## Vérifications

Tous les contrôles de `bash outils/controles.sh` passent. La page générée
correspond exactement aux sources et `git diff --check` ne signale aucun défaut.

Tests Node : migration des anciens projets, bornage des notes, sélection du type,
transmission des notes par le séquenceur, copie sans partage des listes, mémoire,
retour SHOTS sans perte et refus de changement de type pendant PLAY.

Tests Chromium : import d'un vrai WAV, trois notes écrites par les boutons,
remplacement/retrait, copie du motif et restauration après rechargement, retour
SHOTS et protection pendant PLAY. Rendu Web Audio réel : 440 Hz transposé à
220/440/880 Hz ; SHOTS conserve 440 Hz malgré une note écrite à +12 ; une tranche
transposée joue à 880 Hz sans dépasser sa fin. Le silence après la lecture est
mesuré. Les tests des chaînes, lancements/copies et tranches restent réussis.
Aucune erreur de page. Affichage inspecté au format téléphone, captures aussi
réalisées en paysage.

L'APK v189 reste à compiler par GitHub Actions après application du ZIP.
L'archive contient uniquement les fichiers modifiés sous `drm16_android/`.
