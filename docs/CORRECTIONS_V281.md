# v281 — SCÈNES 8 : des arrangements à quatre parties

## Base et périmètre

Base : v280, commit `e14732ec89c4ac3059cd849de6fbf3b06b7e7612`.
La page de base a été comparée à son empreinte de blob Git :
`0c812abb1bdcad97ee0ec4a8a3d333e39c75c51a` (identique).

Ce lot ajoute un module de niveaux CV programmés et deux montages complets.
Il organise les entrées, les breaks et les reprises sans arrêter les séquenceurs
de batterie, de basse ou de mélodie. Le catalogue atteint 106 modules et
38 montages, dont six dans AVANCÉS. Les 105 modules et les 36 montages antérieurs
ont été comparés entre les pages v280 et v281 : leurs définitions sont identiques.

Le correctif de diagnostic MIDI v278 et la fabrication automatique Windows
introduite en v277 restent en place. Le workflow `windows.yml` n'est pas modifié.

## Utilisation immédiate

Ouvrir EURORACK → RACK ▾ → MONTAGES → AVANCÉS. Choisir un emplacement vide pour
conserver le montage actuel. Un remplacement de rack occupé reste soumis à la
confirmation existante. Le chargement ne lance pas la lecture : appuyer sur START.

| Montage | Tempo | Contenu |
| --- | --- | --- |
| PROGRESSIVE 8 · CONSTRUCTION | 124 BPM | Batterie, entrée de la basse, arrivée de la mélodie, break et reprise. |
| AMBIENT 8 · MARÉES | 92 BPM | Nappe et mélodie d'abord, puis basse douce et batterie espacée. |

Chaque exemple comporte 33 modules, 47 câbles, une seule horloge, un DRUM 32,
deux MÉLO 32 et huit scènes sur une boucle de douze mesures. Les durées sont
1, 1, 2, 2, 1, 2, 1 et 2 mesures. Laisser évoluer la lecture : toutes les parties
ne sont pas ouvertes en même temps dès le départ.

SCÈNES 8 se trouve vers la fin de la première rangée. Toucher une de ses cases
ouvre cette scène dans FOCUS. Dans les deux exemples :

- A commande la batterie entière ; DRUM 32 conserve ses quatre pistes séparées.
- B commande la basse, dont les notes restent dans le premier MÉLO 32.
- C commande la mélodie, écrite dans le second MÉLO 32.
- D commande une nappe en accord de la mineur 7 tenu.

La nappe utilise CHORD, un filtre et une réverbération déjà présents dans le
catalogue. Ce n'est pas une progression d'accords : ses notes restent celles de
la mineur 7, tandis que son niveau évolue. Le réglage du CHORD donne une fondamentale
de 110 Hz, avec tierce mineure, quinte et septième mineure.

Le MIX 4 général règle toujours A = batterie, B = basse, C = mélodie, D = nappe.
Ses gains se multiplient par les niveaux des scènes. Une partie réglée à zéro
sur le MIX 4 ne réapparaît donc pas simplement en remontant sa scène.

## SCÈNES 8

### Édition et sauvegarde

Le module contient huit scènes. Chaque scène a un rôle (INTRO, MONTÉE, PLEIN,
BREAK, REPRISE, SORTIE ou LIBRE), une durée de 1 à 16 mesures et quatre niveaux
de 0 à 100 %. Le rôle est une étiquette de repérage : seul le câblage et les
niveaux déterminent l'action sonore.

La longueur de boucle est réglable de une à huit scènes. Raccourcir la boucle
ne supprime pas les scènes hors boucle, qui restent éditables. Sélectionner une
case sert à l'éditer, sans déplacer la lecture. Les réglages sont relus au début
de la mesure suivante ; une scène non encore atteinte conserve ses nouveaux
réglages pour son passage. Aucun arrêt/rechargement du moteur n'est requis.

TENIR répète la dernière mesure de la scène au lieu de passer à la suivante.
Le relâchement permet d'avancer au prochain début de mesure lorsque la durée
prévue est déjà écoulée. Les autres séquenceurs et CLK OUT continuent d'avancer.

COPIER VERS LA SUIVANTE remplace, après confirmation, les six paramètres de la
scène suivante (la scène 8 copie vers la scène 1). SCÈNE À ZÉRO met seulement ses
quatre niveaux à zéro, après confirmation : la durée et le rôle restent intacts.

Les 51 paramètres persistants sont numériques dans `m.p`, comme dans les anciens
modules : trois réglages communs et six par scène. L'interface emploie une sélection
transitoire qui n'est pas ajoutée au format de sauvegarde. Les anciennes versions
ne connaissent pas le type `scenes8` : ne pas y réenregistrer un rack qui le contient.

### Horloge et branchements

Relier OUT du module CLOCK à CLK de SCÈNES 8 : seize impulsions correspondent à
une mesure. Ce réglage suppose les doubles-croches du CLOCK existant. Utiliser une
sortie divisée change proportionnellement la durée réelle ; le module ne détecte
pas automatiquement une autre division ou une autre signature rythmique.

Les sorties A, B, C et D sont des tensions continues de 0 à 1 V, pas des sorties
sonores ni des déclencheurs. Dans les exemples elles commandent les entrées CV de
deux DUAL VCA, dont les gains de repos sont à zéro. Les sources sonores vont dans
les entrées audio de ces VCA, et leurs sorties rejoignent le mixage.

Trois sorties d'impulsions distinctes sont disponibles : CLK OUT pour chaque
impulsion entrante, MESURE toutes les seize impulsions, SCÈNE au début de chaque
scène. Le premier CLK démarre la scène 1. À date identique, l'ordre local de sortie
est SCÈNE, MESURE, puis CLK OUT. Les CV continus ne sont pas annoncés comme des
événements de déclenchement.

Les fondus sont réglables de 0 à 1 000 ms, programmés directement sur les paramètres
audio. Dans PROGRESSIVE le fondu vaut 40 ms ; dans AMBIENT il vaut 750 ms. Les VCA
de mélodie et de nappe sont placés avant leurs effets pour laisser finir les queues
de délai et de réverbération. Les séquences restent en cours sous les groupes fermés.

RST et STOP annulent les impulsions et changements de niveau encore programmés.
Le module ramène ses CV à zéro avec une rampe de cinq millisecondes ; le prochain
CLK repart de la scène 1. Cela ne constitue pas une garantie sur les queues sonores
de l'ensemble du rack, qui dépendent aussi des effets et de l'arrêt général.

### Affichage et fonctionnement interne

Les repères de lecture suivent l'heure audio, pas l'avance de programmation du
séquenceur. Les nouveaux dessins se mettent au repos lorsque la vue est masquée,
que l'audio est suspendu ou que le transport est arrêté. Ils n'interceptent pas
les prises natives et n'imposent pas d'animation du rack en arrière-plan.

L'historique graphique est borné ; en rendu hors ligne il n'est pas alimenté.
L'historique CV en direct conserve seulement le segment utile et les segments
programmés en avance. Les rampes interrompues conservent leur portion antérieure
au point d'interruption. Les dates de CLK dupliquées, rétrogrades ou non finies
sont ignorées. Aucune analyse de signal ne sert à déterminer les scènes.

## Fichiers livrés (18)

1. `page/js/458-scenes8-eurorack.js` : nouveau module, 51 paramètres, niveaux CV,
   changements de scène, arrêt/reset, façade et édition Focus.
2. `page/js/459-montages-scenes8.js` : deux arrangements, créés par copie du montage
   Berlin v280 ; aucune mutation des modèles précédents.
3. `page/css/380-scenes8-eurorack.css` : habillage de la façade et du Focus.
4. `page/html/460-note-eur.html` : notice du module et des exemples, compte du catalogue.
5. `page/ordre.txt` : insertion des trois nouvelles sources.
6. `app/src/main/assets/drm16.html` : page mise à jour avec ces sources et la notice.
7. `outils/test-scenes8.cjs` : contrôles déterministes du moteur et de ses paramètres.
8. `outils/test-scenes8.py` : parcours réels dans Chromium et rendus audio hors ligne.
9. `outils/test-drum32.py` : comptes du catalogue et des cartes AVANCÉS actualisés ;
   les parcours et rendus de DRUM 32 restent conservés.
10. `outils/test-melo32.py` : comptes actualisés, anciens contrôles conservés.
11. `outils/test-ensembles-eurorack.py` : nombre total de modules actualisé.
12. `outils/test-eurorack-focus.py` : contrôle des 106 types, avec le nouvel éditeur.
13. `outils/controles.sh` : nouveau test Node, aussi exécuté pendant la préparation Windows.
14. `.github/workflows/android.yml` : test navigateur ajouté, rapport JSON dans
    `app/build/reports/scenes8.json`, repris par les rapports d'échec existants.
15. `app/build.gradle` : version Android 281.
16. `bureau/src-tauri/Cargo.toml` : version Windows 281.0.0.
17. `bureau/src-tauri/tauri.conf.json` : version Windows 281.0.0.
18. `docs/CORRECTIONS_V281.md` : ce document.

## Vérifications réellement exécutées

Environnement : Node 22, Chromium et Playwright sous Linux. Page chargée en mémoire
avec stockage local temporaire simulé, sans accès à des fichiers utilisateur.

- SCÈNES 8 : 31 scénarios Node, 57 833 assertions, zéro erreur. Longueurs et durées,
  bouclage, TENIR/relâchement, changements à chaud, CV, fondus, arrêt/reset dans le
  look-ahead, isolation des instances, sauvegarde numérique et historiques bornés.
- SCÈNES 8 dans Chromium : 726 vérifications, zéro erreur, dans sept formats :
  320×568, 360×640, 393×851, 640×360, 880×400, 1280×800 et 1920×1080. Vrais clics,
  sélections, confirmations, transport, édition en lecture, changements de rack,
  retrait de module, repos graphique et cibles Focus de 44×44 px au minimum contrôlés.
- Quatre rendus OfflineAudioContext réels : deux exemples à 44 100 et 48 000 Hz,
  chacun sur treize mesures (une boucle de douze mesures puis la reprise). Relevé
  indépendant des quatre sources, des quatre sorties de VCA, des quatre CV, des
  trois sorties d'impulsions et de la sortie stéréo du rack. Les niveaux et milieux
  de rampes concordent avec les scènes programmées ; les sorties VCA suivent
  source × CV avec un écart maximal inférieur à 0,000001 dans les points comparés.
  Les groupes commandés à zéro sont silencieux à ces sorties. Les comptes de
  CLK, de mesures et de changements de scène concordent, sans doublon.
- Les dix canaux audio observés dans chaque rendu sont finis et non silencieux sur
  l'ensemble du morceau. La plus forte crête de sortie mesurée est inférieure à
  0,640 sur ces essais, ce qui ne garantit pas les niveaux après d'autres réglages.
- MÉLO 32 : 31 scénarios Node (33 351 assertions) et 1 171 vérifications navigateur.
- DRUM 32 : 24 scénarios Node (3 687 assertions) et 322 vérifications navigateur.
- Focus Eurorack : quatre formats, 424 ouvertures couvrant 106 types, zéro erreur.
- Huit ensembles historiques v276 : 724 vérifications et leurs rendus, zéro erreur.
- Confort mobile : 12 cas façade/format ; vue multimachines : 480 vérifications ;
  menu : 359 vérifications ; Focus mixage : 1 365 vérifications. Zéro erreur.
- Autotest MIDI Windows v278 : 35 scénarios simulés réussis, sans modification.
- Comparaison dynamique des 36 anciens montages et des 105 anciennes définitions
  de modules entre v280 et v281 : identiques, y compris les fonctions des modules.
- Syntaxe des trois blocs JavaScript assemblés vérifiée par Node ; 1 087 identifiants
  HTML statiques uniques ; YAML, syntaxe shell et cohérence des versions vérifiés.

Pendant la première passe, le test DRUM 32 conservait un compte attendu de quatre
cartes AVANCÉS. Il a été actualisé à six, puis les 322 contrôles ont été réexécutés
sans erreur. Aucun test fonctionnel n'a été désactivé pour faire passer ce lot.

Les fragments disponibles de page/ ont été insérés dans la page de base vérifiée,
à des positions uniques, avec vérification des voisinages et de l'ordre ; les
autres segments restent identiques. L'assembleur intégral du dépôt et les autres
contrôles CI non cités ci-dessus ne sont pas exécutés dans cet environnement :
GitHub vérifie l'égalité complète entre les sources et la page assemblée.

La compilation APK, la compilation Rust/Tauri, l'autotest natif Windows de cette
v281, l'écoute et les performances sur les appareils restent à valider après
l'envoi. Les essais simulés du MIDI ne remplacent pas un test de périphérique réel.

## Éléments préservés

Les recettes audio des anciens modules, les anciens montages, les fonctions MIDI
natives, Freesound, les sons personnels et les formats de fichiers ne changent pas.
DRUM 32, MÉLO 32, la vue multimachines et le Focus de mixage restent disponibles.

Le lancement automatique APK et Windows est conservé sur chaque envoi vers main.
L'archive de correction contient des sources, pas un exécutable précompilé : le
nouvel installateur est produit par GitHub dans `drm16-windows` après ses contrôles.
La fabrication est automatique, mais son installation sur le PC reste manuelle.
