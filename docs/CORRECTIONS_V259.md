# v259 — Fidélité machine : KAOSS PAD, TR-1000, PO-33 K.O!

Premier chantier de la liste *Fidélité* de REPRENDRE.md : sept effets de plus
sur le KAOSS PAD, l'échantillonnage/la découpe/l'étirement de la couche B sur
la TR-1000, et l'échantillonnage au micro sur le PO-33 K.O!. Le point
ER-1/EA-1, EMX/ESX a été passé en revue : les fonctions correspondent déjà
aux vraies machines et les deux seules simplifications restantes (AUDIO IN
simulé en bruit filtré, PCM sans import sur EMX-1/ER-1 mkII) sont volontaires,
fidèles au matériel réel et déjà expliquées dans les notices — rien à
corriger là.

## Utilisation

### KAOSS PAD : sept effets de plus

Le sélecteur FX (roue ou nouveau menu déroulant sous l'afficheur) propose
maintenant quinze effets au lieu de huit : **PASSE-BANDE**, **FLANGER**,
**PHASER**, **DISTORSION**, **ISOLATEUR** (grave/médium/aigu), **PANORAMIQUE
AUTO** et **LOOPER** (boucle de 1/16 à 1 mesure, avec mélange). Comme les huit
premiers, chacun se joue avec X et Y ; la notice FX (onglet KAOSS PAD) décrit
les quinze.

### TR-1000 : échantillonnage, découpe et étirement de la couche B

Chaque instrument a désormais un panneau **ÉCHANTILLON** (couche B) : forme
d'onde avec la portion sélectionnée en surbrillance, sliders **DÉBUT**/**FIN**
pour ne jouer qu'un morceau du son, bouton **À L'ENVERS**, sélecteur
**ÉTIRER** (1 à 32 pas, au tempo, sans changer la hauteur — algorithme
WSOLA), bouton **SAMPLING** (micro, 8 s au plus, posé directement en couche
B) et **DÉCOUPER SUR LES INSTRUMENTS** (partage le son en tranches par
attaque, une par instrument suivant, sans toucher à l'original dans la
bibliothèque).

### PO-33 K.O! : échantillonnage au micro

Nouveau bouton **SAMPLING** dans le bandeau de commandes (à côté de CHROMA) :
une pression enregistre au micro dans l'emplacement choisi en mode SOUND
(mélodique ou percussion, hors CHROMA), une seconde pression arrête ; 8 s au
plus. Le son remplace celui de l'emplacement dans la bibliothèque ; les
Parameter Locks et les autres réglages ne bougent pas.

## Fonctionnement

- `page/js/570-korg-kaoss-pad.js` : `KP_EFFETS` étendu en fin de liste (pour
  garder les numéros de mémoire de programme des huit premiers) ; nouveaux
  étages construits une fois dans `noeudsKp()` et remis à neutre par défaut
  dans `appliquerKp()` — jamais reconstruits au changement d'effet, comme les
  huit premiers. `boucleKp`/`arreterBoucleKp` pour le LOOPER (ligne à retard,
  correction anti-dérive d'un bloc de rendu).
- `page/js/590-smpltrek-dix-pistes.js` : menu déroulant `#kp-fx-choix` pour
  choisir l'effet par son nom, synchronisé avec la roue.
- `page/js/480-roland-tr-1000.js` : `instrT1k` porte `deb`, `fin`, `rev`,
  `etir` ; `voixT1k` passe par `partieEchT1k` pour la couche B.
- `page/js/485-tr-1000-echantillons.js` (nouveau) : `etirerSonT1k` (WSOLA),
  `partieEchT1k` (portion/inversion/étirement, en cache), `samplingT1k`/
  `annulerSamplingT1k`, `tranchesT1k`/`decouperT1k`, et le rendu du panneau
  `majSampleT1k`.
- `page/js/632-kits-de-sons.js` : whitelist des kits étendue à `deb`, `fin`,
  `rev`, `etir`.
- `page/js/560-pocket-operator-k-o.js` / `page/js/565-po-33-echantillons.js`
  (nouveau) : `samplingKo`/`annulerSamplingKo`, sur le même modèle que la
  TR-1000 et l'ES-1, mais sans portion à régler — `KO.sons[k]` ne garde qu'un
  identifiant de son.
- `page/js/280-electribe-es-1.js` : `usagesEch` compte maintenant aussi les
  usages TR-1000 (couche B, tous motifs) et PO-33 (seize emplacements), vifs
  ou sauvegardés — un oubli antérieur à cette version, qui aurait pu laisser
  la corbeille (v258) considérer comme « sans emploi » un son pourtant posé
  sur l'une de ces deux machines.

## Validation locale

- `outils/test-kp.cjs` : mock `createChannelMerger` et `setValueAtTime`
  ajoutés ; six sources FX suivies au lieu de cinq (deux LFO de plus).
- `outils/test-t1k-echantillons.cjs` (nouveau) : étirement (durée, hauteur,
  niveau préservés à ×0,5/1,5/2, repli sur les sons courts), portion (sans
  calcul quand rien n'est à calculer), inversion et cache (invalidé si le son
  d'origine change), étirement suivant le tempo, découpe (attaques filtrées,
  repli en parts égales, limite au nombre d'instruments restants).
- `outils/test-echantillons.cjs` : nouveau bloc pour `usagesEch` — TR-1000 et
  PO-33 comptés séparément du KAOSS, vifs ou sauvegardés, sans double
  comptage.
- bloc **49** de `outils/test-navigateur.py` (`kaoss_effets`) : les sept
  nouveaux effets, un par un, à l'oreille (mesures de spectre/crête).
- bloc **50** (`t1k_echantillons`) : DÉBUT/FIN, À L'ENVERS, ÉTIRER à deux
  tempos, persistance avec le motif, DÉCOUPER SUR LES INSTRUMENTS (quatre
  tranches nommées, original intact), SAMPLING au micro (oscillateur en lieu
  de micro).
- bloc **51** (`po33_echantillons`) : bouton SAMPLING actif seulement en mode
  SOUND hors CHROMA, cliquable pendant la prise même si l'on change de mode
  ou d'emplacement, la prise va bien sur l'emplacement figé au départ.

Non vérifié ici : la compilation Android et le téléphone.
