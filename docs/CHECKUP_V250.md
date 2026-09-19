# Grand check-up DRM16 — v250

Audit du 19 septembre 2026, mené sur la v247 puis reporté sur la v249. Il porte sur les seize versions
v231 à v247 (PO-33 WRITE, SCALE / FILL / TRACK des TR, SONG de la DMX, 99
séquences et 8 programmes MPC, export 16 bits avec dither ou 24 bits, effets
Electribe dans leur voie, isolateur volca, FX RELEASE et mémoires du KAOSS PAD,
chaîne TR-1000, rendu WAV d'un morceau) et surtout sur **leurs rencontres** :
chaque sujet a été testé seul à sa sortie, pas avec les autres.

Les v248 et v249 (Freesound dans la bibliothèque, livraison corrigée) sont
arrivées pendant l'audit. Elles n'en font pas partie, sauf leur compilation
GitHub, qui échouait : voir plus bas.

La v250 est une version de maintenance : trois corrections, deux notices
remises à jour, un test réparé, deux tests nouveaux. Aucune fonction nouvelle.

## Résultat

Toutes les suites passent sur la v247 avant correction : contrôles, tests
Node, compilation Java de contrôle, bureau, Rust, navigateur (trois passages),
exports MIDI et SmplTrek, TR-1000, diagnostic audio, fichiers bureau. Le banc
de son et l'audit des clics aussi.

Le check-up a pourtant trouvé **deux défauts** que les tests ne voyaient pas,
parce qu'ils naissent entre deux sujets, et **un gaspillage** de mémoire qui
datait d'avant.

## Corrections livrées

| Domaine | Défaut reproduit sur la v247 | Correction |
|---|---|---|
| Mode morceau (TRACK, SONG, chanson MPC, chaîne TR-1000) | Ouvrir l'**enregistreur**, la **bibliothèque** ou les **pads** depuis le menu, fermer la vue à plusieurs machines, **tirer les sons au sort** ou une **relance du moteur audio** rouvrent la machine affichée : son mode morceau s'éteignait. Enregistrer une prise d'un morceau TRACK était donc impossible sans le rallumer à la main. | Nouvelle `rouvrirMachine()` (660) : relève les modes allumés, rouvre, les rallume et met la façade à jour. Choisir une machine dans le menu reste un vrai choix et éteint toujours son mode, comme la MPC. |
| Rendu WAV d'une prise MIDI (et formes d'onde) | Chaque machine rendue est rouverte : une prise jouée par la DMX éteignait son SONG, même quand la DMX n'était pas affichée (SET). | Les modes de toutes les machines sont relevés avant le rendu et rallumés après (600, 610). L'export WAV du morceau (550) passe par le même chemin et met maintenant aussi la façade à jour. |
| Mémoire | Depuis la v246, les 8 programmes de chaque MPC étaient écrits en entier, et le programme 1 deux fois : 73 ko par MPC au lieu de 14. Et, depuis la v195, les 128 motifs de la TR-1000 l'étaient tous, vides compris : **540 ko réécrits à chaque retouche** d'un pas. | MPC : programme 1 seulement dans `pads`, programme d'usine réduit à son nom. TR-1000 : motif vide écrit `null`. Les deux relisent les anciennes sauvegardes complètes. Stockage total d'une installation de test : **808 ko → 162 ko**. |
| Notices | L'onglet Général et la notice SmplTrek disaient encore « WAV seize bits ». | Seize ou vingt-quatre bits selon le réglage EXPORT WAV (v239). Une phrase dit quand le mode morceau s'éteint. |

Reproduction : un script de page arme TRACK (TR-808), SONG (DMX), CHAÎNE
(TR-1000) et chanson (MPC), puis déclenche chaque réouverture. Sur la v247 :
`1111 → 1110` pour les cinq gestes, `1111 → 1010` pour le rendu d'une prise
jouée par la DMX. Sur la v250 : `1111` partout, et `1110` quand on choisit la
MPC dans le menu.

## Compilation de la v249

La compilation GitHub de la v249 s'arrêtait dans `outils/test-kp.cjs` :
`ReferenceError: fsonAnnuler is not defined`. La bibliothèque (630) appelle
maintenant quatre fonctions de Freesound (625). Dans la page, 625 est
assemblé avant 630 ; mais `test-kp.cjs` chargeait la vraie bibliothèque
seule. Le test charge maintenant 625 avant 630, comme `test-freesound.cjs`.
Les deux autres tests qui chargent 630 (`test-bibliotheque.cjs`,
`test-echantillons.cjs`) n'utilisent pas les chemins Freesound et passent.
Aucune source de la page n'a été touchée pour cela.

## Vérifié sans défaut

- **Scénario croisé** : SET avec TR TRACK, DMX SONG, chaîne TR-1000 et chanson
  MPC (programmes différents par séquence) comme machine principale. Horloge
  interne : TR `1,2,1,2,1`, DMX `0,3,0,3,0`, TR-1000 `0,1,0,1,0`, programmes
  MPC `0,1,0,1,0`. Départ en esclave d'une horloge MIDI : premières entrées
  justes pour les quatre. Aucune erreur de page.
- **Projets** `.drm16` : ils emportent toutes les clés de mémoire, donc les
  données nouvelles (TRACK, SONG, chaîne, programmes, mémoires KAOSS, réglage
  24 bits) sans rien ajouter.
- **Banc de son** (29 machines) comparé à la référence : seuls bougent l'EM-1
  (−0,8 dB, recalage voulu de la v240) et les crêtes de la volca (isolateur
  v241, RMS inchangé). Aucun écrêtage, aucune voix muette. L'ensemble
  DrumBrute varie de 0,7 dB en crête et 0,1 dB en RMS : aucune des versions
  auditées ne touche la DrumBrute, c'est l'écart ordinaire de ce rendu.
- **Audit des clics** : 0 changement brusque sur les 21 machines mesurées.
- **Repliement** (`_vitesse`) : identique à la référence.

## Tests ajoutés

- bloc **40** de `outils/test-navigateur.py` : les six réouvertures techniques
  gardent les quatre modes ; le choix dans le menu les éteint toujours ; la
  façade TR-1000 affiche CHAÎNE ON. Ce bloc échoue 7 fois sur la v247 ;
- `outils/test-mpc-programmes.cjs` : forme allégée, nom gardé sans pads,
  programmes d'usine indépendants, sauvegarde v247 complète relue, bibliothèque
  qui compte le programme 1 lu dans `pads` ;
- `outils/test-t1k.cjs` : motifs vides `null`, aller-retour exact, motif
  revenu au vide réécrit `null`, sauvegarde v247 complète relue puis allégée.
  Les cinq tests de migration existants acceptent les motifs `null`.

## Limites

- Tout a été vérifié dans Chromium, pas sur le téléphone. Le gain de temps à
  chaque retouche TR-1000 (540 ko de moins à écrire) est déduit de la taille,
  pas mesuré sur l'appareil.
- Le bloc 14 du test navigateur reste fragile quand la machine est chargée
  (voir `REPRENDRE.md`).
