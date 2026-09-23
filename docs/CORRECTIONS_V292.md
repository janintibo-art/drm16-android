# v292 — PERFORMANCE MOUVANTE : mémoires A/B, transition glissée, geste rejoué

Base vérifiée : v291 (117 modules, 63 montages).
Livraison : un correctif incrémental à appliquer sur la v291, sous `drm16_android/`.
La page de la version Android est aussi la source préparée pour l'exécutable Windows.

## Ce qui change dans PERFORMANCE

Le panneau **PERFORMANCE** (v284) avait un seul point de retour (MÉMORISER /
REVENIR). Ce lot en fait deux, indépendants, et ajoute deux façons de faire
bouger les huit commandes toutes seules, sans les tenir :

- **Points de retour A et B** : `MÉMORISER A/B` capture les réglages
  actuels des paramètres affectés ; `REVENIR A/B` les restaure, chacun
  séparément. Les anciens racks à un seul point de retour sont relus comme
  point A, sans perte.
- **TRANSITION** : une durée choisie (0,5 s à 8 s) puis `GLISSER VERS A` ou
  `GLISSER VERS B` fait glisser progressivement les huit commandes de leur
  position actuelle vers celles du point choisi, pendant que la lecture
  continue. `ARRÊTER LA TRANSITION` l'interrompt où elle en est.
- **GESTE** : `ENREGISTRER UN GESTE` capture les mouvements réels des
  commandes pendant qu'on les tourne (jusqu'à 16 secondes) ; `REJOUER LE
  GESTE` les rejoue ensuite en boucle, comme si quelqu'un continuait à les
  tourner. `EFFACER LE GESTE` supprime l'enregistrement.

Ces trois usages sont exclusifs entre eux : démarrer un enregistrement
arrête toute transition ou lecture de geste en cours, et réciproquement.

## Pourquoi les commandes bougent en temps réel, pas en temps musical

TRANSITION et GESTE utilisent l'horloge murale (`performance.now()`), pas
l'horloge audio du transport (`ctx.currentTime`) : c'est plus simple, ne
dépend pas d'une lecture en cours, et évite tout risque sur le calcul des
pas et des impulsions CLK, qui reste inchangé. La conséquence, assumée et
écrite dans la notice intégrée : **une transition ou un geste en cours
n'est pas capturé dans un export hors ligne (geler un son, exporter un
WAV)**, exactement comme une main réelle qui tourne un bouton pendant la
lecture ne l'est pas non plus. Ce n'est donc pas un export « pilotable »,
mais un geste de scène.

Les deux boucles d'animation (`transitionner`/TRANS et `jouerGeste`/LECTURE
dans `466-performance-eurorack.js`, l'affichage correspondant dans
`467-performance-interface.js`) réutilisent la fonction `regler()`
existante à chaque image : aucune nouvelle écriture de paramètre audio
n'a été ajoutée, tout repasse par le chemin déjà éprouvé (anti-clic
`enLissant`, bornage, persistance).

## Le geste survit à un changement de cibles, pas les mémoires A/B

Les mémoires A/B enregistrent des **valeurs** de paramètres liées à la
signature des cibles affectées ; changer une affectation les invalide,
comme avant. Le geste, lui, n'enregistre que des **positions de commande**
(0 à 1) rejouées via `regler()` : il reste valable même si les cibles sont
réaffectées ensuite, choix documenté dans le code.

## Pourquoi les limites (16 s, 400 événements, un cran minimum)

Toute la structure PERFORMANCE, geste compris, est sérialisée dans le
stockage local à chaque `regler()`, y compris en usage normal. Un geste
long et dense alourdirait donc chaque simple touche de commande, pas
seulement l'enregistrement. D'où : 16 secondes maximum, 400 événements
maximum, un événement au plus toutes les 50 ms — quelques kilo-octets au
pire, sans notion perceptible pour l'oreille.

## Compatibilité et préservation

Le catalogue reste à **117 modules et 63 montages**, identiques. Les
versions Android/Windows deviennent 292 et 292.0.0. Un rack ou projet .drm16
sans `memoireA`/`memoireB`/`geste` enregistrés se relit normalement (l'ancien
champ `memoire` devient le point A ; aucun geste ni point B par défaut).
Les deux montages « AUX COMMANDES » existants (jungle, psy) restent
compatibles sans modification : ils ne fixent que les huit commandes de
départ, jamais les mémoires ni le geste.

## Validation effectuée

- `outils/test-performance-eurorack.cjs` mis à jour pour le renommage
  `memoire`→`memoireA` et complété de treize nouveaux scénarios (migration
  de l'ancien format, indépendance A/B, transition, geste, exclusions
  mutuelles, survie du geste à un changement de cibles) : **42 scénarios,
  tous passés**.
- `outils/test-performance-eurorack.py` mis à jour pour les nouveaux
  identifiants (`#ep-memoriser-a`/`#ep-rappeler-a` à la place de
  `#ep-memoriser`/`#ep-rappeler`) et complété d'un bloc dédié au point B, à
  la transition (démarrage, arrêt, valeur d'arrivée) et au geste
  (enregistrement, lecture, arrêt, effacement) : **646 vérifications, 0
  erreur**, y compris les rendus audio réels (`perf-jungle`, `perf-psy`,
  44,1/48 kHz, deux courses).
- Les autres tests navigateur appelant `EUR_PERFORMANCE.memoriser()`/
  `.rappeler()` sans lettre (kick/basse, couleurs, harmonie 8, stutter
  live, variations rythmiques) ont été vérifiés : ils utilisent l'appel
  sans argument, qui vise toujours le point A par défaut — **aucun
  changement nécessaire**, confirmé par leur relecture.
- `bash outils/controles.sh` : façades, assemblage exact des 235 sources,
  identifiants HTML uniques, syntaxe JavaScript, compilation Java de
  contrôle, tests Java et Rust historiques — **tous passés**.
- **Deux passages complets de `outils/test-navigateur.py`** (25 machines,
  trois formats d'écran) : **0 FAUX** les deux fois.

Environnement : Chromium sous Linux, Node, page chargée en mémoire. La
compilation Gradle Android, la compilation Tauri Windows/WebView2 et les
essais d'écoute/performance sur le téléphone restent à valider après
l'envoi. La totalité de `controles.sh` n'est pas exécutée localement : elle
inclut aussi les contrôles natifs Java/Rust et d'autres outils du dépôt,
exécutés par GitHub.

## Fichiers livrés (9)

- `page/js/466-performance-eurorack.js` : mémoires A/B, TRANSITION, GESTE
  (enregistrement, lecture en boucle), migration de l'ancien format.
- `page/js/467-performance-interface.js` : nouveaux boutons et champs,
  boucle d'affichage bornée pendant une transition ou une lecture de geste.
- `page/css/410-performance-eurorack.css` : mise en page des nouveaux
  contrôles, y compris la grille du format paysage téléphone.
- `page/html/460-note-eur.html` : notice intégrée mise à jour.
- `app/src/main/assets/drm16.html` : résultat assemblé (235 sources).
- `outils/test-performance-eurorack.cjs` et `test-performance-eurorack.py` :
  renommage et nouveaux scénarios/vérifications.
- Trois fichiers de version, `REPRENDRE.md`, et ce document.
