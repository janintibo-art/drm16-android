# v288 — STUTTER LIVE : capture stéréo et répétitions au tempo

## Base et périmètre

Base : v287, commit `f243c60508725ac97281602dcf81f0802ef56d29`.
L'empreinte Git de la page de départ est `1f4d93f4ff060fcc224f4483299b0fcf9dcfc481`,
identique au fichier du dépôt vérifié avant les modifications.

Un nouveau module et deux nouveaux montages : **113 types / 56 montages**.
Les définitions des **112 anciens modules**, fonctions comprises, et les données
des **54 anciens montages** ont été comparées entre les deux pages : identiques.
La configuration des anciens montages n'est pas remplacée par les deux exemples.

## Utilisation

**EURORACK → RACK ▾ → MONTAGES → CAPTURE LIVE**. Choisir un emplacement vide pour
conserver le travail actuel, charger un exemple, puis START. Laisser tourner
quatre mesures pour entendre sa répétition automatique.

| Montage | Tempo | Modules | Câbles | Répétition préparée |
| --- | ---: | ---: | ---: | --- |
| Jungle · Répétitions live | 168 BPM | 26 | 41 | Fragment 1/16 sur les 4 derniers pas de chaque quatrième mesure, dose 75 % |
| Breakcore · Arrêts sur fragment | 202 BPM | 26 | 41 | Fragment 1/32 sur les 8 derniers pas de chaque quatrième mesure, dose 85 % |

Batterie, basse, mélodie, effets, scènes et variations A/B sont déjà câblés.
STUTTER LIVE est inséré **avant le VCA de groupe de la batterie** : les scènes
conservent leur contrôle sur le niveau de cette partie. La basse, la mélodie
et les autres effets ne traversent pas la capture. Les séquenceurs avancent
normalement pendant la répétition : la sortie retrouve le rythme actuel,
non le pas qui jouait au début de l'effet.

La huitième commande PERFORMANCE devient **DOSE STUTTER** dans ces deux copies
seulement. Les autres commandes conservent leurs affectations.

## Le nouveau module

Toucher son écran pour ouvrir FOCUS.

- **LONGUEUR DU FRAGMENT** : 1/4, 1/8, 1/16, 1/32 ou 1/64 de ronde.
  Le fragment capturé est celui situé **juste avant** l'appui, pas le son à venir.
- **DURÉE DE LA RÉPÉTITION** : 1 à 16 pas de double-croche. RÉPÉTER retourne
  automatiquement au son direct après cette durée.
- **TENIR · MAINTENIR** : garde la répétition seulement pendant l'appui.
  Relâcher le doigt, la souris, Espace ou Entrée libère l'effet.
- **LIBÉRER** : revient au son direct sans arrêter les machines. AUTO reste
  programmé : le bouton n'interdit pas les prochaines captures automatiques.
- **AUTO** : OFF ou fin de chaque deuxième, quatrième ou huitième mesure.
  Il faut une horloge à seize impulsions par mesure sur CLK. Les exemples
  utilisent la même horloge pour leurs scènes, séquences et répétitions.
- **DOSE** : mélange du direct et de la répétition, modifiable pendant l'effet.
  Seule la dose peut être affectée à une commande PERFORMANCE, pas les actions
  de capture ni les changements de longueur.
- **ADOUCIR LES JOINTS** : petite fenêtre de 0,5 à 5 ms aux raccords de boucle.

L'interface affiche PRÊT, RÉPÈTE, TENU ou RÉARMEMENT. Les deux canaux audio sont
conservés. Cet afficheur est un état de fonctionnement, pas une forme d'onde.

## Câblage personnel

- Source audio vers **IN STÉRÉO**, **OUT STÉRÉO** vers le mixeur ou l'effet suivant.
- **CLK** reçoit une impulsion par double-croche pour l'avancement du mode AUTO.
- **CAPTURE** déclenche une répétition limitée à la durée choisie.
- **LIBÉRER** revient au direct ; **RST** réarme aussi le compteur de mesures.

Les durées du fragment et de la répétition suivent le tempo général. Une horloge
personnelle divisée ou décalée sur CLK change les frontières comptées par AUTO ;
elle ne remplace pas le tempo général utilisé pour la durée audio.

Le module passe le son direct sans délai au repos. Il remplit en parallèle une
ligne de retard. Pendant la capture, l'écriture est coupée et la boucle se
recircule à gain unitaire. Après libération, une durée de fragment est requise
pour ne plus capturer de résidu de l'ancienne boucle. Les captures trop tôt ou
superposées sont refusées et signalées, au lieu d'empiler les voix.

Les changements de longueur ou de tempo sont différés pendant une capture,
y compris quand son début a déjà été programmé dans l'avance de l'ordonnanceur.
La longueur, la durée et l'adoucissement sont fixés au départ ; la dose reste libre.

## Arrêt, sauvegardes et limites

STOP/RST annulent les répétitions à venir et réarment le compteur. La suppression
du module ou la reconstruction du rack détruisent sa boucle de retour et ses
sources. Un appui TENIR est libéré en quittant le Focus, à l'annulation du geste,
à la perte de focus de la fenêtre ou au passage de la page en arrière-plan.
Les répétitions limitées et AUTO ne dépendent pas d'une animation d'interface.

Les cinq réglages numériques sont conservés par les sauvegardes de racks et
les projets `.drm16` existants. **Le son capturé est temporaire** : ni ce son,
ni le compteur, ni un appui TENIR ne sont rechargés avec le rack.

Ce premier lot ne fait ni lecture inversée, ni transposition, ni étirement
temporel. Il ne remplace pas BREAK 32 et ne modifie aucun fichier sonore.
Aucun enregistrement au microphone, fichier téléchargé, AudioWorklet distant ou
permission supplémentaire. Pas de changement de CSP ou d'API MIDI native.

## Réalisation audio

Le graphe utilise uniquement des nœuds Web Audio synchrones, y compris dans les
rendus OfflineAudioContext. La ligne interne compense le quantum de retour de
la boucle de Chromium ; un délai externe le remet après cette boucle. Ce point
est vérifié par comparaison avec les échantillons attendus, pas seulement par
une vérification de la valeur de delayTime. Le contexte de l'application utilise
le quantum standard de 128 échantillons ; renderQuantumSize est lu si exposé.

Les fenêtres de raccord sont mises en cache (quatre au maximum), les historiques
sont bornés, le feedback ne dépasse jamais un et les nœuds sont déconnectés à la
destruction. Ces choix ne remplacent pas un essai de charge réel sur téléphone.

## Fichiers principaux

- `page/js/479-stutter-live.js` : capture, répétition stéréo, horloge, AUTO et cycle de vie.
- `page/js/479a-stutter-interface.js` : façade, Focus, souris, clavier et gestes annulés.
- `page/js/479b-montages-stutter.js` : deux copies câblées et macro de dose.
- `page/css/450-stutter-live.css` : habillage et commandes tactiles dans le Focus.
- `page/js/466-performance-eurorack.js` : autorisation de la dose parmi les cibles.
- `page/html/460-note-eur.html` : notice intégrée.
- `page/ordre.txt` et `app/src/main/assets/drm16.html` : ajout des sources dans l'assemblage.
- `outils/test-stutter-live.cjs` et `outils/test-stutter-live.py` : contrôles du nouveau lot.
- `outils/controles.sh` et `.github/workflows/android.yml` : nouveaux contrôles bloquants.
- Onze suites Python historiques : totaux de catalogue et contrôle Focus du nouveau module.
  Le contrôle des 24 montages originaux utilise maintenant leurs identifiants explicites,
  plutôt qu'un filtre négatif qui comptait à tort les nouvelles familles harmoniques
  et de capture parmi les montages originaux. Aucun scénario n'est supprimé.
- `app/build.gradle`, `bureau/src-tauri/Cargo.toml`, `bureau/src-tauri/tauri.conf.json` : 288 / 288.0.0.
- Ce document et `docs/TESTS_V288.json` : périmètre et résultats détaillés.

## Livraison et compilation

Une archive de fichiers modifiés sous `drm16_android/`, destinée au script habituel.
Les déclencheurs Windows et APK sont conservés : l'envoi sur main lancera les deux
compilations. Le ZIP de correction ne contient pas d'exécutable déjà compilé.
Après réussite du workflow Windows, récupérer `drm16-windows`, puis lancer son
`DRM16-installeur.exe` sur le PC.

## Vérifications exécutées

- **30 scénarios Node** du nouveau module : bornes, cinq divisions, captures,
  maintien, durée, réarmement, AUTO, doublons CLK, dates invalides, STOP/RST,
  annulation de captures futures, changements différés, deux instances et destruction.
- **272 vérifications Chromium** du nouveau lot, sans erreur, dans sept formats :
  320×568, 360×640, 393×851, 640×360, 880×400, 1280×800 et 1920×1080.
  Clics, maintien, relâchement hors bouton, clavier, annulation tactile, fermeture
  du Focus, perte de focus, paramètres sauvegardés, projets, macros et suppression.
- **51 essais de vrais signaux Web Audio**, à 44,1 / 48 / 96 kHz. Comparaison des
  deux canaux avec le fragment attendu, aux cinq divisions et à différents
  décalages d'échantillons ; doses 0 / 0,6 / 1 ; maintien, silence, STOP, capture
  annulée avant son départ et nouveau son après réarmement. Erreur PCM maximale
  de capture : 2,98 × 10⁻⁸. Le passage direct comparé est identique.
- **Quatre rendus de treize mesures**, les deux montages à 44,1 et 48 kHz :
  voix présentes, échantillons finis, niveaux de scène, trois captures AUTO,
  retour au direct et arrêt. Les crêtes de sortie de ces essais restent sous 0,26.
- **Dix suites Node précédentes** exécutées avec succès, dont les 35 scénarios
  simulés du contrôle MIDI Windows.
- **Onze suites navigateur historiques**, sans erreur : Focus (quatre formats,
  452 ouvertures couvrant les 113 types), DRUM 32 (322 contrôles), MÉLO 32 (1 171),
  SCÈNES 8 (726), anciens ensembles (724), bibliothèque BREAK 32 (308), RAVE (231),
  PERFORMANCE (472), variations (196), atelier kick/basse (231), HARMONIE 8 (203).
  Les six dernières suites à option --sans-audio ont été exécutées sans leurs
  rendus : bibliothèque BREAK, RAVE, PERFORMANCE, variations, atelier et HARMONIE.
  DRUM 32, MÉLO 32 et SCÈNES 8 incluent chacun quatre rendus ; les ensembles en
  incluent huit. Les rapports précisent ces périmètres, sans présenter un test
  d'interface comme un rendu audio.
- Syntaxe des trois scripts de la page, 1 087 identifiants HTML uniques, YAML,
  versions et correspondance des sources disponibles dans l'assemblage vérifiés.

Le banc audio du nouveau lot garde la tolérance historique de 10⁻⁴ pour la queue
exponentielle de BASS RAVE après STOP. Une première exécution employait par erreur
10⁻⁵ ; la mesure était de l'ordre de 1 à 2 × 10⁻⁵. Ce seuil concerne seulement la
queue de cette ancienne voix, pas la précision de capture STUTTER. Aucun ancien
contrôle ni traitement sonore n'a été assoupli ou changé pour cette correction.

Les essais utilisent Node et Chromium Linux, avec stockage local temporaire
simulé. L'assembleur officiel et l'intégralité de controles.sh n'ont pas été
exécutés dans le checkout partiel. La page de base a été authentifiée et les
sources modifiées remplacées, puis les nouvelles sources insérées dans l'ordre.
Une première tentative PERFORMANCE intégrale a été interrompue par la limite
de temps ; sa relance --sans-audio a ensuite réussi et elle seule est comptée.

**La compilation APK/Windows, l'essai réel du WebView2, l'écoute et les performances
sur les appareils restent à valider.** Les rendus hors ligne ne remplacent pas
une écoute musicale ni un essai des commandes sur le téléphone.
