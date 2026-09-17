# v185 — MC-101 : premier mode Looper

Base : v184, commit 3033316d2f77be3b99492da201bd0d31582db657.

## Utilisation

À l'arrêt, sélectionner la piste 2, 3 ou 4, activer LOOPER, choisir un clip,
puis CHOISIR SON et AFFECTER dans la bibliothèque. PLAY lit le son entier sur
une mesure de seize pas et le répète. Chaque piste possède seize références
de boucle indépendantes. La piste 1 conserve son kit rythmique.

Le lancement des boucles attend la prochaine mesure, même en DIRECT. Les
scènes sont également quantifiées lorsqu'une piste est en mode Looper.
STOP termine les sources avec un bref fondu. Une sourdine coupe la boucle ;
la réactivation attend la prochaine mesure. Si l'horloge cesse de fournir
des pas, la source termine à la fin du dernier pas programmé.

Le filtre et le niveau restent actifs. NOTE, DÉCLIN, les pads et SCATTER
ne modifient pas les boucles. Affectation, collage, effacement et changement
de mode sont protégés pendant PLAY. Les clips de notes et leur sample restent
conservés séparément. Désactiver LOOPER les retrouve ; les références de boucle
restent mémorisées. SYNTHÉ quitte Looper et retire la source sample mélodique.

COPIER/COLLER transfère la référence de boucle entre clips Looper. EFFACER
retire cette référence sans supprimer le son. La bibliothèque compte aussi
les références de boucle avant la suppression d'un sample.

## Limites explicites

- Une seule mesure par boucle ; pas de détection automatique de sa longueur.
- Calage par vitesse de lecture : tempo et hauteur sont liés, sans timestretch.
- Pas d'enregistrement de boucle dans ce mode.
- Import existant : maximum huit secondes, mono 32 kHz.
- Son absent : silence et indication dans l'interface.
- Inclure les samples personnels lors du partage du projet ; ouvrir avec v185
  ou une version ultérieure pour préserver le mode Looper.
- Les essais navigateur ne remplacent pas un essai sur le téléphone Samsung.

## Vérifications effectuées

- `bash outils/controles.sh` : tous les contrôles passent.
- Tests MC Node : migration, copie, références invalides, conservation des notes
  et refus des modifications pendant la lecture.
- Chromium : tests ciblés Looper, samples, clips, lancements et scènes réussis,
  sans erreur de page.
- Rendu Web Audio réel : une sinusoïde de 440 Hz sur une seconde devient
  220 Hz sur une mesure de deux secondes, et reste à 440 Hz sur une seconde.
- Silence mesuré après la fin programmée, la sourdine et l'arrêt de l'horloge.
- STOP vérifié avec l'événement réel de fin de source ; changement de clip
  quantifié testé avec le vrai transport ; restauration après rechargement.
- Captures aux formats 393 × 851, 360 × 640 et 880 × 400.

L'APK v185 n'a pas été compilé localement : le workflow GitHub le fera après
application du ZIP et envoi par le script Termux. Le ZIP ne contient que les
fichiers modifiés ou nouveaux, sous `drm16_android/`.
