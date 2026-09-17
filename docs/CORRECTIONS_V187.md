# v187 — SmplTrek : lancement et copie des motifs

Base : v186, commit f869cdd5f771fd04c0f9abef165625ee210f5b00.

## Changements

Les motifs SmplTrek changeaient immédiatement, sans choix de lancement à la
frontière, et ne pouvaient pas être dupliqués. La v187 ajoute :

- DIRECT / FIN MOTIF : conserver le changement immédiat ou attendre le prochain
  début de motif disponible (une mesure pour les motifs standards de seize pas).
- Une demande visible sur les pads du mode MOTIF, annulable avec ANNULER,
  un second appui sur le motif demandé ou un appui sur le motif courant.
- DÉPART IMMINENT lorsque le prochain départ est déjà programmé dans l'audio.
  La sélection reste sur le motif réellement entendu jusqu'à cet instant.
- STOP annule les demandes et débranche le son, y compris lorsque SmplTrek joue
  comme machine secondaire du SET. Le prochain démarrage repart sans demande.
- COPIER MOTIF / COLLER MOTIF : duplication des pas, tranches et longueur des dix
  pistes, avec confirmation si la destination est remplie. Collage à l'arrêt.

Les sons, filtres, niveaux, sourdines, solo et autres réglages des pistes ne sont
pas copiés : les motifs partagent toujours les mêmes dix pistes. Le presse-papiers
est un instantané indépendant ; les collages ne partagent aucune liste mutable.

Le mode de lancement et le motif entendu sont conservés dans les sauvegardes.
Les demandes et le presse-papiers sont temporaires. Les anciens projets gardent
DIRECT par défaut. Le curseur des pas n'obscurcit plus la sélection en mode MOTIF.

## Limites

Si un ancien projet contient des motifs de longueurs différentes, le passage
entre ces longueurs en mode FIN MOTIF exige STOP. Les huit motifs standards de
seize pas ne sont pas concernés. Aucun éditeur de longueur n'est ajouté ici.

La copie concerne le motif entier. EFFACER conserve son rôle sur la seule piste
sélectionnée. Ce lot n'ajoute pas de nouvelle chaîne automatique ni de scènes
indépendantes du modèle de motifs existant. Le découpage de la v186 est conservé.

## Fichiers

- `page/js/590-smpltrek-dix-pistes.js` : état du lancement, validation à l'heure
  audio, copie, mémoire, sélection des motifs et interface.
- `page/js/130-decalage-humain.js` : nettoyage SmplTrek au départ et à l'arrêt
  global, même lorsqu'une autre machine est sélectionnée dans le SET.
- `page/html/200-unit-stk.html`, `page/css/090-roland-tr-808.css` : commandes,
  états et repère du motif en attente.
- `page/html/400-note-stk.html` : notice intégrée.
- `app/src/main/assets/drm16.html` : assemblage régénéré.
- Versions Android et Windows : 187.
- Tests SmplTrek et navigateur étendus.

## Vérifications effectuées

Tous les contrôles de `bash outils/controles.sh` passent.

Les tests Node couvrent : demandes annulables, changement différé, verrouillage
avant départ, validation à l'heure audio même sans animation, rafales de temps
MIDI simulées, contexte audio remplacé, SET, arrêt avant/après la frontière,
longueurs incompatibles, copies indépendantes, refus de remplacement, conservation
du mixage et restauration.

Les tests Chromium utilisent le vrai transport : copie par les boutons,
changement quantifié et relevé des horaires des voix, annulation, STOP,
restauration du mode et des tranches, puis arrêt d'une demande du SmplTrek
secondaire dans le SET. Aucun message d'erreur de page.
Les tests de découpe/import SmplTrek et de Looper MC-101 restent réussis.
Affichage inspecté sur petit écran téléphone ; captures également en paysage.

L'APK v187 reste à compiler par GitHub Actions après application du ZIP.
Le ZIP contient uniquement les fichiers modifiés sous `drm16_android/`.
