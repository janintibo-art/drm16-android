# v283 — BREAK 32 : boucles personnelles et découpage visuel

Base : v282, commit `e04c57d0d8613fb65327d02098bd4b0b9a00aba9`.
Cette livraison est un patch de sources pour `drm16_android`, pas un APK ni un EXE déjà compilé.
Les déclenchements automatiques Android et Windows de la v277 restent en place.

## Utilisation

Ouvrir EURORACK, puis le Focus d'un BREAK 32 en touchant son aperçu.
Dans **BOUCLE & DÉCOUPAGE** :

- **BIBLIOTHÈQUE** permet de chercher un son déjà disponible, puis **CHARGER CE SON** l'affecte uniquement à ce module.
- **IMPORTER WAV** ouvre le sélecteur de fichiers. Un identifiant distinct est créé dans la bibliothèque ; le fichier d'origine n'est pas écrasé.
- **8 / 16 / 32 TRANCHES**, puis **DÉCOUPE ÉGALE** ou **DÉTECTER ATTAQUES**, remplacent les repères après confirmation. La détection propose des changements d'énergie ; elle ne reconnaît ni les instruments ni le BPM.
- Toucher une tranche ou la sélectionner dans la liste. Glisser une borne de début/fin, ou saisir ses temps en millisecondes. Le point et la virgule sont acceptés. Une limite ne peut pas croiser la suivante.
- **ÉCOUTER TRANCHE**, **ÉCOUTER INVERSÉE**, **STOP ÉCOUTE** : contrôle du résultat, à niveau réduit dans la voie Eurorack, indépendamment des scènes du montage.
- **ZOOM + / −**, **TOUT VOIR**, **VOIR TRANCHE** et le curseur de déplacement changent uniquement la vue (zoom jusqu'à ×32).
- **ANNULER DÉCOUPE** conserve jusqu'à douze modifications de repères pendant cette ouverture du Focus. Ce n'est pas un historique général de tous les paramètres.
- **BREAK ORIGINAL** rétablit la banque synthétisée. Il ne supprime ni le son importé ni les 32 pas.

Le séquenceur reste sous l'atelier : les pages PAS 1–16 et PAS 17–32 éditent la tranche déclenchée, ses répétitions, son sens et sa probabilité. Sélectionner une tranche dans l'atelier ne réécrit pas les notes du séquenceur.
Un numéro au-delà de la découpe disponible reste écrit, mais silencieux (ex. tranche 24 dans un découpage à 8 tranches).

## Deux montages d'exemple

**RACK → MONTAGES → AVANCÉS** :

| Montage | Tempo de départ | Fonction |
| --- | ---: | --- |
| JUNGLE · MON BREAK | 170 BPM | Batterie recomposée, basse, mélodie, effets et scènes ; accueillir une boucle personnelle dans BREAK 32. |
| BREAKCORE · MON DÉCOUPAGE | 198 BPM | Découpes, inversions et répétitions plus rapides, avec CORE KICK, basse, mélodie et scènes déjà reliés. |

Ils démarrent avec le break synthétisé de l'application pour être jouables sans télécharger de son. Aucun WAV privé ou commercial n'est inclus.
Les 44 anciens montages restent identiques ; le catalogue en compte désormais 46. Le nombre de modules reste 109 : BREAK 32 est enrichi, il n'est pas dupliqué.
Utiliser un rack vide avant de charger un exemple pour conserver le montage courant.

## Formats et limites explicites

- Import : WAV RIFF PCM 8/16/24/32 bits ou float 32 bits, mono/stéréo, entre 8 et 192 kHz, **30 secondes et 20 Mio maximum**. Le conteneur est contrôlé avant le décodage.
- Les nouveaux imports sont convertis en **mono PCM 16 bits** par la bibliothèque actuelle. Le mélange des deux canaux n'est pas normalisé automatiquement. Le fichier source choisi sur le disque ne change pas.
- WAV compressés, WAV extensibles et RF64 : refusés dans ce lot. Il ne s'agit pas d'un importeur audio multiformat.
- Le décodeur adapte la fréquence d'échantillonnage au contexte audio. Une sélection existante dans la bibliothèque utilise son tampon déjà décodé (mono ou stéréo).
- **Pas de time-stretch.** L'horloge fixe les départs ; les tranches trop courtes finissent avant le pas suivant, les longues sont coupées. Transposer modifie simultanément la hauteur et la vitesse.
- Les écoutes ne mesurent pas le volume réel du fichier : elles passent volontairement à niveau réduit. Les gains et silences de la voie du mixeur restent applicables.
- Sans pont natif (version navigateur), ou si l'écriture est refusée, le son peut être utilisé pendant la session, mais le message **SESSION SEULEMENT** signale qu'il n'est pas enregistré. Ne pas considérer ce son comme sauvegardé.

## Conservation et cycle de vie

Les repères sont non destructifs et stockés sous `breakSample` dans la description du module : identifiant de bibliothèque, nom indicatif, nombre de tranches, positions normalisées, durée indicative. Les anciennes sauvegardes sans ce champ conservent le break synthétisé. Une ancienne application ne comprend pas cette nouvelle association : utiliser la v283 ou suivante pour rouvrir ces racks.

Le format enveloppe du projet `.drm16` reste en version 1. Le projet reprend les métadonnées du rack et les sons réellement enregistrés par le pont natif. Son plafond existant de 16 Mio n'a pas changé : surveiller les messages de sons laissés de côté ou illisibles. Un son resté seulement en mémoire n'est pas inclus comme fichier natif.

Une source manquante, illisible, hors limite ou pas encore décodée ne joue pas un autre break à sa place. Le module affiche son état. Une fois le fichier décodé, il peut jouer aux prochains départs d'horloge ; aucune note n'est déclenchée automatiquement par le chargement.

Les usages de la boucle sont comptés dans le rack courant et les sept autres emplacements pour le nettoyage de bibliothèque. Le lien n'est pas une copie audio : supprimer définitivement le son empêchera sa lecture. Les autres usages du son restent intacts.

La lecture normale réutilise le tampon complet avec offset/durée. Seules les tranches inversées sont copiées à la demande ; leurs caches sont invalidés lorsque le son ou ses repères changent. STOP, fermeture du Focus, passage en arrière-plan et destruction du graphe nettoient les écoutes. Les imports devenus obsolètes après changement de rack, de source, de projet, de contexte audio ou fermeture du Focus n'affectent pas un autre module.

## Fichiers modifiés et ajoutés (24)

| Fichier | Changement |
| --- | --- |
| `page/js/464-break32-bibliotheque.js` | Nouveau : validation WAV, import, affectation, métadonnées, détection, caches, atelier de découpage et audition. |
| `page/css/400-break32-bibliotheque.css` | Nouveau : atelier responsive, champs et commandes tactiles, onde, focus clavier et erreurs de saisie. |
| `page/js/465-montages-breaks-personnels.js` | Nouveau : les deux exemples, dérivés par copie indépendante des presets RAVE, sans modifier leurs données. |
| `page/js/462-break32-eurorack.js` | Lecture des nouvelles tranches, numéros 0–32, source dans le Focus, silence hors plage et arrêt des auditions. Banque synthétique et sons précédents conservés. |
| `page/js/440-percussions.js` | Enregistrement et restauration du champ optionnel `breakSample` dans les racks. |
| `page/js/280-electribe-es-1.js` | Deux raccordements de bibliothèque : mise à jour des sources BREAK 32 après chargement/remplacement, et comptage des usages. Aucune recette sonore Electribe modifiée. |
| `page/js/450-montages-tout-faits.js` | Déclenche le chargement asynchrone des sons de bibliothèque à l'ouverture de l'Eurorack. |
| `page/html/460-note-eur.html` | Notice intégrée, limites et parcours des deux nouveaux exemples. |
| `page/ordre.txt` | Ajout des trois nouvelles sources dans l'ordre d'assemblage. |
| `app/src/main/assets/drm16.html` | Page réassemblée depuis les 209 sources, sans modification directe. |
| `outils/test-break32-bibliotheque.cjs` | Nouveau : 30 scénarios de données, WAV, sources, ordonnanceur et imports asynchrones. |
| `outils/test-break32-bibliotheque.py` | Nouveau : parcours en sept formats, vrai décodeur, pont de fichiers simulé et rendus audio. |
| `outils/test-rave.cjs` | La limite écrite des numéros de tranches passe de 16 à 32 ; contrôle du silence hors plage dans le nouveau test. |
| `outils/test-rave.py` | Comptage des 46 montages ; les six cartes RAVE restent contrôlées. |
| `outils/test-drum32.py` | Comptages actualisés (46 presets, huit avancés). |
| `outils/test-melo32.py` | Comptages actualisés. |
| `outils/test-scenes8.py` | Comptages actualisés. |
| `outils/test-eurorack-focus.py` | Distingue les huit champs du séquenceur des sélecteurs supplémentaires de la source ; vérifie aussi la présence de l'atelier. |
| `outils/controles.sh` | Ajoute le nouveau test Node à la chaîne existante. |
| `.github/workflows/android.yml` | Ajoute le test navigateur et son rapport `break32-bibliotheque.json`. |
| `app/build.gradle` | Version Android 283. |
| `bureau/src-tauri/Cargo.toml` | Version bureau 283.0.0. |
| `bureau/src-tauri/tauri.conf.json` | Version bureau 283.0.0. |
| `docs/CORRECTIONS_V283.md` | Ce document. |

## Vérifications réellement exécutées avant livraison

**Nouveau lot :** 30 scénarios Node passent ; 360 vérifications navigateur passent dans les formats 320×568, 360×640, 393×851, 640×360, 880×400, 1280×800 et 1920×1080.
Les contrôles portent notamment sur les bornes et leurs annulations, le zoom non destructif, les fichiers mal formés, les sons absents, les deux canaux du fichier importé puis le mélange mono, la conservation des pas, les usages, le projet, la recharge du WAV, les refus d'écriture, la fermeture pendant un décodage et les commandes de 44 pixels minimum.

Les deux nouveaux montages ont été rendus chacun sur **treize mesures à 44,1 et 48 kHz** (quatre rendus), avec une boucle de contrôle affectée comme source personnelle et redécoupée en 32 tranches. Contrôles des voix, sorties finies, niveaux de scènes, reprise de boucle et STOP. Il s'agit de contrôles numériques, pas d'une écoute subjective sur enceintes.

**Régressions :** onze suites navigateur précédentes passent : confort mobile, façades, Focus Eurorack (436 ouvertures), menu, ensembles Eurorack, DRUM 32, MÉLO 32, SCÈNES 8, RAVE, Focus mixage et éditeur de sons. Les cinq suites Node précédentes disponibles (DRUM 32, MÉLO 32, SCÈNES 8, RAVE et autotest MIDI Windows) passent aussi. Aucun test n'est désactivé.

Comparaison des catalogues exécutés v282/v283 : les données des **44 anciens montages** sont identiques ; les définitions des **108 autres modules** sont identiques. Seul BREAK 32 est enrichi.

Les tests locaux utilisent Node et Chromium sous Linux, avec la page chargée en mémoire et un stockage/pont de fichiers simulé. La navigation `file://` est bloquée par l'environnement de contrôle ; elle n'a pas été validée ici. **Les compilations APK/Tauri Windows, le sélecteur de fichiers réel et les essais sur Samsung/Windows restent à vérifier par GitHub puis sur les appareils.** Les tests Rust/Java et la chaîne complète `controles.sh` n'ont pas été exécutés localement dans ce lot ; les contrôles existants restent lancés par les workflows.

Aucun changement aux commandes MIDI natives, à Freesound, aux réglages du mixeur, aux sources de Studio/Nexus, aux pilotes Android/Windows ni au déclenchement automatique du workflow Windows.
