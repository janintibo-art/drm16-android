# v280 — MÉLO 32 : notes, gammes, accents et glissés

## Base et périmètre

Base : v279, commit `4da4ed31586c0ccbfecc513182b9978e43dccd7c`.
Le HTML de base fourni dans l'archive v279 a été comparé au blob du dépôt :
`6f35e4509b550c7d72fcd22586b816724dc3a61c` (identique).

Ce lot ajoute un séquenceur mélodique et deux exemples. Il ne remplace pas
DRUM 32, les SEQ 8/16 ni les 34 montages précédents. Le catalogue atteint
105 modules et 36 montages. Le correctif de diagnostic Windows v278 et le
lancement automatique Windows de la v277 sont conservés.

## Utilisation

Dans EURORACK, ouvrez RACK ▾ → MONTAGES → AVANCÉS. Choisissez un emplacement
vide pour garder votre rack actuel. Le remplacement d'un rack occupé passe
par la confirmation existante. Le chargement ne démarre pas le transport.

- ACID 32 · DIALOGUE : 138 BPM, 26 modules, 35 câbles. Batterie DRUM 32,
  basse acide de 32 pas accentuée et glissée, mélodie indépendante et échos.
- BERLIN 32 · ENTRELACS : 112 BPM, 27 modules, 34 câbles. Batterie discrète,
  basse de 32 pas et mélodie de 24 pas en aller-retour, modulation lente du filtre.

Appuyez sur START. Le premier MÉLO 32 du rack règle la basse, le second la
mélodie. Touchez l'aperçu de l'un des deux pour ouvrir son édition dans FOCUS.
Le MIX 4 général conserve A = batterie, B = basse, C = mélodie.

MÉLO 32 se trouve aussi dans la famille des séquenceurs du catalogue de modules.

## Le module

Deux pages de seize touches affichent 32 pas. Touchez un pas, puis choisissez
sa note. Chaque pas possède cinq paramètres : note MIDI (24 à 84), activité,
accent, glissé et probabilité (0 à 100 %). Les sept réglages communs sont
longueur (1 à 32), sens, tonique, gamme, transposition, durée de glissé et coupure.
Les 167 paramètres sont enregistrés dans `m.p`, comme ceux des anciens modules.

La transposition (−24 à +24 demi-tons) est appliquée AVANT la quantification.
Gammes : chromatique, mineure naturelle, majeure, dorienne, pentatonique mineure.
La note écrite n'est jamais remplacée ; la note calculée est affichée séparément.
La recherche de la note de gamme la plus proche traverse les limites d'octave.
En cas d'égalité, la note inférieure est retenue.

La convention CV est 0 V = LA1/55 Hz ; un volt ajoute une octave. Les oscillateurs
des deux exemples sont réglés en conséquence. Dans un patch personnel, modifier
OCT ou FINE sur l'oscillateur décale le son par rapport à la note indiquée.

Sens : avant, arrière, aller-retour sans redoubler les extrémités, aléatoire.
Changer de sens repart au début du nouveau parcours au prochain CLK. Raccourcir
une séquence ne détruit pas les pas masqués. Une séquence muette continue d'avancer.

Les sorties sont CV, GATE et ACC. ACC émet son impulsion AVANT GATE : dans le
montage Acid, l'entrée ACC du filtre ACID reçoit l'accent avant TRIG. Un accent
non câblé n'a aucun effet sonore. La probabilité supprime ou conserve le pas entier.

Le glissé est un portamento de hauteur, pas une liaison de portes : chaque note
active redéclenche GATE. Sa durée (0–250 ms) est plafonnée à 80 % du dernier
intervalle CLK reçu. Au premier CLK, l'intervalle de référence est la double-croche
du tempo général. Après un silence, la prochaine note repart franchement.
Un silence ne transpose pas la queue de la note précédente ; les enveloppes et
les effets peuvent continuer leur décroissance. Cette version n'ajoute pas de
réglage de durée des portes ni de liaison de notes.

Les dates de CV, de GATE et d'ACC sont programmées dans le contexte audio ;
aucun analyseur n'est interrogé pour deviner une note future. RST et STOP annulent
les événements futurs du module. L'annulation d'un glissé conserve sa portion
déjà programmée et la hauteur courante. Les compteurs graphiques suivent les
dates entendues, pas le moment de préparation des événements.

COPIER CETTE PAGE remplace l'autre page après confirmation (les cinq paramètres
par pas). TOUT EN SILENCE met les 32 pas au repos après confirmation, sans effacer
les notes. Le rack reste enregistré par les fonctions natives existantes.
Les versions antérieures ne connaissent pas le nouveau type `melo32` : ne pas
utiliser une ancienne version pour réenregistrer un rack qui le contient.

## Fichiers livrés (18)

1. `page/js/456-melo32-eurorack.js` : moteur, paramètres, quantification, horloge,
   édition personnalisée et suivi graphique du nouveau module.
2. `page/js/457-montages-melo32.js` : deux montages, clonés sans mutation des modèles v279.
3. `page/css/370-melo32-eurorack.css` : façades et éditeur adaptatif.
4. `page/js/455-eurorack-focus.js` : bandeau personnalisable selon le module ;
   le bandeau et l'édition DRUM 32 restent inchangés.
5. `page/html/460-note-eur.html` : notice intégrée.
6. `page/ordre.txt` : insertion des trois nouvelles sources dans l'assemblage.
7. `app/src/main/assets/drm16.html` : page réassemblée, base inchangée ailleurs.
8. `outils/test-melo32.cjs` : tests déterministes du moteur et des paramètres.
9. `outils/test-melo32.py` : parcours réels dans Chromium et rendus hors ligne.
10. `outils/test-drum32.py` : comptes de catalogue actualisés ; les tests des
    deux montages DRUM 32 restent explicitement ciblés et conservés.
11. `outils/test-ensembles-eurorack.py` : total du catalogue actualisé ; les huit
    ensembles v276 sont toujours testés intégralement.
12. `outils/test-eurorack-focus.py` : contrôle des 105 types, dont la nouvelle
    interface personnalisée ; contrôles DRUM 32 conservés.
13. `outils/controles.sh` : nouveau test Node exécuté aussi dans la préparation Windows.
14. `.github/workflows/android.yml` : nouveau test navigateur et rapport JSON
    dans `app/build/reports/melo32.json`.
15. `app/build.gradle` : version 280.
16. `bureau/src-tauri/Cargo.toml` : version 280.0.0.
17. `bureau/src-tauri/tauri.conf.json` : version 280.0.0.
18. `docs/CORRECTIONS_V280.md` : ce document.

## Vérifications réellement exécutées

Environnement : Node, Chromium local avec Playwright, page chargée en mémoire,
stockage temporaire simulé. Aucun fichier utilisateur ni périphérique réel utilisé.

- MÉLO 32 : 31 scénarios Node, 33 351 assertions réussies. Comprend la
  quantification exhaustive (12 toniques × 5 gammes × 128 notes), les longueurs,
  quatre parcours, silences/probabilités, accents, glissés interrompus, STOP,
  RST, isolation des instances et aller-retour JSON.
- Éditeur MÉLO 32 et nouveaux montages : 1 171 vérifications, zéro erreur,
  dans sept formats : 320×568, 360×640, 393×851, 640×360, 880×400, 1280×800,
  1920×1080. Cibles FOCUS contrôlées à 44×44 px minimum, sans débordement horizontal.
- Quatre rendus réels OfflineAudioContext (deux exemples, à 44 100 et 48 000 Hz),
  chacun sur huit mesures. Contrôle séparé des six voix, de la stéréo, des tensions
  de hauteur, des impulsions et des glissés ; contrôle de la réception des accents
  par ACID et du déclenchement des enveloppes seulement sur les notes actives.
  Les 768 valeurs CV échantillonnées concordent. Aucun échantillon non fini.
  Plus haute crête mesurée à la sortie du rack : 0,737 environ, sur ce signal
  d'essai ; ce n'est pas une garantie pour tous les réglages possibles.
- DRUM 32 : 24 scénarios Node, 3 687 assertions ; 322 vérifications navigateur,
  y compris les quatre rendus de ses deux montages historiques.
- Focus Eurorack : quatre formats, 420 ouvertures de catalogue, zéro erreur.
- Huit ensembles v276 : 724 vérifications, cinq formats et leurs huit rendus,
  zéro erreur.
- Confort mobile : 12 cas façade/format, zéro erreur.
- Vue multimachines : 480 vérifications, sept formats, zéro erreur.
- Autotest MIDI Windows v278 : 35 scénarios simulés réussis ; source et HTML concordants.
- Syntaxe JavaScript de la page et des nouveaux scripts contrôlée avec Node.
  Cohérence des insertions dans l'assemblage et des numéros de version contrôlée.

La compilation APK, la compilation Rust/Tauri et l'autotest sur le vrai exécuteur
Windows ne sont pas exécutés ici. Ils restent à valider dans GitHub Actions après
l'envoi de ce lot. L'écoute, la charge et le confort sur les appareils de
l'utilisateur restent à vérifier. Les contrôles CI non mentionnés ci-dessus
n'ont pas été réexécutés dans cet environnement.

## Non modifié

Recettes sonores des 104 modules préexistants, commandes MIDI natives, test de
connexion Windows, moteurs des autres machines, sons personnels, Freesound,
formats de sauvegarde. La fabrication Windows automatique et ses contrôles
bloquants restent activés ; ce lot ne prétend pas résoudre un nouvel incident
Windows qui n'aurait pas encore été diagnostiqué.

## Suite

Poursuivre par les utilitaires de variation et la lisibilité des grands racks,
puis de nouveaux ensembles ambient, breakbeat et progressifs, en s'appuyant sur
les modules déjà présents plutôt qu'en les dupliquant.
