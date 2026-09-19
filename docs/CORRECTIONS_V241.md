# v241 — volca sample : l'isolateur gonflait le son de +7 dB autour de 1 kHz

Le check-up v176 signalait déjà que la volca « diffère de l'ancienne référence
`mesures-son.json` », sans en trouver la cause. Remesurée en v240, sa voix la
plus forte sortait à **−3,3 dBFS** au lieu de −8,0. Le son était donc jusqu'à
5 dB trop fort, et ce n'était pas uniforme : surtout les parties 7 à 10.

## Cause

L'isolateur BASS/TREBLE (`sortieGeneraleVlc`) partage le son en deux bandes à
1 kHz avec des filtres Linkwitz-Riley d'ordre 4. Avec les deux potards au
centre, la somme doit être **plate**. Les quatre filtres étaient réglés à
`Q = 0.7071`. Or, dans la Web Audio API, **le Q des passe-bas et passe-haut
s'exprime en décibels**, piège déjà noté en v150 pour le filtre subsonique.
0,7071 dB vaut 1,085 en valeur linéaire : les filtres étaient trop pointus, et
la somme montait au lieu de rester plate.

Réponse mesurée dans Chromium sur les vrais filtres, isolateur au centre :

| Fréquence | 100 Hz | 500 Hz | 800 Hz | **1 kHz** | 1,25 kHz | 2 kHz | 5 kHz |
|---|---:|---:|---:|---:|---:|---:|---:|
| v240 | +0,1 | +2,7 | +6,4 | **+7,4** | +6,4 | +2,7 | +0,4 dB |
| v241 | 0,0 | 0,0 | 0,0 | **0,0** | 0,0 | 0,0 | 0,0 dB |

Les sons riches autour de 1 kHz (cowbell, rim, zap, blip : parties 7 à 10)
étaient les plus gonflés.

## Correction

`page/js/510-korg-volca-sample.js` : le Q de Butterworth est écrit en décibels,
`20·log10(√½) = −3,01 dB`. BASS et TREBLE gardent leur course : seule la
position centrale redevient neutre, comme sur la machine.

## Résultat au banc de mesure

Niveau efficace (RMS, 300 premières ms) des dix parties, en dB :

| Partie | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| référence (v149) | −25,6 | −30,3 | −30,8 | −39,0 | −29,6 | −26,7 | −30,8 | −35,1 | −29,2 | −30,8 |
| v240 | −25,4 | −29,6 | −30,5 | −38,8 | −29,2 | −26,2 | **−26,1** | **−31,7** | **−24,0** | **−27,4** |
| v241 | −25,6 | −30,3 | −30,8 | −39,0 | −29,6 | −26,7 | −30,8 | −35,1 | −29,2 | −30,8 |

Le volume réel revient **exactement** à la référence, à 0,1 dB près.

Les **crêtes** des parties 7 à 9 restent de 1,6 à 3,3 dB au-dessus de la
référence (voix la plus forte : −6,5 dBFS). Ce n'est pas du volume : un
isolateur à deux bandes décale la phase autour de sa fréquence de séparation,
ce qui rend plus pointues les ondes carrées de ces sons, pour une énergie
identique. L'isolateur n'existait pas en v149. Le calibrage de la volca
(−4,9 dB) n'est donc pas modifié, et toutes les voix jouées ensemble restent
sous −11 dBFS.

La référence `docs/mesures-son.*` n'est pas réécrite.

## Validation locale

- nouveau test `outils/test-volca-isolateur.cjs`, ajouté à
  `outils/controles.sh`. Il lit le Q réellement écrit dans la source et calcule
  la somme des deux bandes avec les formules exactes de l'API (Q en dB), de
  50 Hz à 15 kHz : **plate à 0,000 dB près**. Il vérifie aussi que l'ancien
  réglage donnait plus de +6 dB. Lancé sur la v240, il échoue bien ;
- mesure réelle de la réponse dans Chromium (premier tableau) et banc de
  mesure (second tableau) ;
- `bash outils/controles.sh` : **tous les contrôles passent** ;
- `test-navigateur.py` : **tout est bon**.

À écouter sur le téléphone : volca sample, motif avec le cowbell ou le rim. Le
son doit être moins agressif, et BASS et TREBLE au centre ne doivent plus
colorer le son.

Version : Android `241`, Windows/Tauri `241.0.0`. Appliquer après la v240.
