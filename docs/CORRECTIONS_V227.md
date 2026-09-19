# v227 — Clavier chromatique du PO-33 K.O!

Le PO-33 garde son fonctionnement habituel en mode SOUND : les huit premiers
emplacements sont mélodiques et les huit derniers restent des percussions. Le
bouton **CHROMA** ajoute un clavier de seize demi-tons pour le son mélodique
choisi, de -7 à +8 demi-tons. Il suffit de sélectionner un des huit premiers
sons, puis d'activer CHROMA.

Avec RECORD, une frappe CHROMA mémorise la hauteur sur le pas courant. Pendant
la lecture, elle se place sur le pas le plus proche ; à l'arrêt, elle utilise le
pas choisi dans PARAMETER LOCK. Retoucher la même hauteur efface l'événement,
et choisir une autre hauteur le remplace. Les notes sont jouées avec les
Parameter Locks existants du pas, les effets ROULEMENT et HACHOIR restant
compatibles.

Les anciens motifs sont migrés avec une matrice de notes vide : leur lecture
reste identique. Le clavier CHROMA et sa source sont sauvegardés avec la machine.
WRITE efface aussi les hauteurs mémorisées avec le motif.

## Fichiers

Moteur et façade PO-33, style et notice, tests Node/navigateur, restauration,
HTML assemblé et versions Android/bureau.

## Validation

- Test Node : clavier CHROMA, bornes de notes, sauvegarde/migration, Parameter
  Locks et ROULEMENT.
- Syntaxe JavaScript/Python, assemblage exact et contrôles communs 0 à 7.
- Test navigateur ajouté pour l'écriture et l'effacement d'une hauteur CHROMA
  ainsi que la protection des Parameter Locks pendant PLAY ; son exécution
  complète dépend de Chromium dans GitHub Actions.
- Le contrôle MIDI bureau reste dépendant de `rustc`, absent de l'environnement
  local.

Appliquer après validation verte de la v226.
