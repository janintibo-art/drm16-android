# v186 — SmplTrek : import et huit tranches par sample

Base : v185, commit 9c7498cd18feed252cb18fc4c221718b57045a10.

## Ce qui change

Le SmplTrek jouait seulement un son entier par piste, et ne figurait pas parmi
les destinations de la bibliothèque. Cette version permet d'affecter un sample
personnel à chacune de ses dix pistes et de choisir une tranche sur chaque pas.

- CHOISIR SON ouvre la bibliothèque avec la bonne piste ; SON conserve son rôle
  de sélection du son suivant de la banque interne.
- SLICE partage le son en huit portions de longueur égale, sans modifier le fichier.
- TR 1 à TR 8 choisit et écoute la tranche ; elle est repérée sur la forme d'onde.
- Les seize pads écrivent la tranche choisie dans le motif. Une tranche différente
  remplace celle du pas ; retoucher la même tranche retire ce pas.
- T1 à T8 indique le contenu du pas, ENT indique un son entier.
- Les huit motifs mémorisent chacun les tranches de leurs dix pistes.
- SLICE désactivé fait jouer le son entier mais conserve les choix de tranches.
- Les auditions respectent MUTE et SOLO. STOP retire le curseur de lecture.
- La bibliothèque compte les utilisations des samples SmplTrek avant suppression.

## Compatibilité et limites

Les anciens pas gardent le son entier. Le chargement initialise les nouvelles
matrices sans partager leurs listes entre motifs ni entre pistes. Les valeurs
invalides sont normalisées et les sauvegardes sont des copies indépendantes.
EFFACER retire les pas et leurs tranches uniquement sur la piste du motif courant.

Le découpage est égal : pas de détection d'attaques ni de marqueurs manuels.
TUNE transpose la tranche et modifie sa durée ; aucun timestretch n'est ajouté.
DECAY raccourcit la tranche, dont la limite n'est jamais dépassée par la lecture.
L'import existant reste limité à huit secondes, en mono à 32 kHz.
Le routage MIDI reste par piste ; une note entrante utilise sa tranche sélectionnée.
Un sample absent reste silencieux et l'interface le signale.

Inclure les samples personnels pour partager un projet. Ouvrir avec v186 ou une
version ultérieure afin de conserver les nouveaux champs de découpe.

## Fichiers principaux

- `page/js/590-smpltrek-dix-pistes.js` : moteur, bornes de lecture, pas et mémoire,
  commandes et affichage SmplTrek. La section MC-101 conserve la v185.
- `page/js/630-bibliotheque.js` : destinations SmplTrek et affectation des sons.
- `page/js/280-electribe-es-1.js` : rafraîchissement après chargement et usages.
- `page/html/200-unit-stk.html`, `page/css/090-roland-tr-808.css` : commandes SLICE.
- `page/html/400-note-stk.html` : notice détaillée intégrée.
- `app/src/main/assets/drm16.html` : page régénérée depuis les sources.
- Versions Android/Windows : 186. Tests ajoutés et intégrés à `outils/controles.sh`.

## Vérifications

`bash outils/controles.sh` : tous les contrôles passent.

Tests Node : bornes contiguës, distribution des tranches par le séquenceur,
mute/solo, affectation des samples, restauration des anciens projets, données
malformées et absence de partage des listes entre sauvegardes/pistes/motifs.

Chromium : import d'un vrai WAV, affectation, édition/remplacement/suppression
par les boutons, rechargement avec le sample personnel, lecture et arrêt.
Un rendu Web Audio mesure les premières et dernières tranches d'un sample à
fréquences distinctes (220 et 1760 Hz), puis la transposition de 220 à 440 Hz.
Le silence après la fin de tranche est vérifié dans les trois cas.
Les tests samples et Looper MC-101 passent également sans erreur de page.
Affichage inspecté aux formats téléphone et paysage.

L'APK v186 reste à compiler par GitHub Actions après l'application du patch.
Le ZIP contient seulement les fichiers modifiés/nouveaux sous `drm16_android/`.
