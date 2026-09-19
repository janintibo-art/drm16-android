# v255 — Bibliothèque : figer une machine, rééchantillonner

Quatrième chantier de la bibliothèque : fabriquer des sons avec la DRM16
elle-même.

## Utilisation

**Figer une machine en échantillons** — rayon SONS, **FIGER LA MACHINE
AFFICHÉE** ; ou rayon MACHINES, **FIGER EN ÉCHANTILLONS**. Chaque voix de la
machine, avec ses réglages du moment, devient un son : « TR-808 BASS DRUM »,
« TR-808 SNARE »… Le rayon SONS les montre aussitôt. Les catégories suivent
le nom (la grosse caisse va en KICK).

Seize machines : DRM16, DRM32, EM-1, ER-1, ER-1 mkII, EA-1, EA-1 mkII, EMX-1
(Drums), TR-808, TR-909, TR-707, RD-6, DMX (24 voix), DrumBrute, CR-5000,
TR-1000. Les accents ne sont pas des sons : ils sont écartés. Les machines qui
jouent déjà des échantillons n'ont pas le bouton.

**Rééchantillonner** — rayon SONS, **RÉÉCHANTILLONNER (N MES.)** ; ou onglet
Général, **VERS LA BIBLIOTHÈQUE** à côté d'EXPORTER EN WAV. Le rendu est celui
de l'export WAV (mesures choisies, ou un passage du morceau enchaîné), rangé
dans la bibliothèque comme **boucle** : « ES-1 2 MES 120 BPM ». Trente secondes
au plus.

Nouvelles origines dans les filtres : **FIGÉS**, **RÉÉCHANTILLONNÉS**.

## Fonctionnement

- `page/js/636-figer-et-reechantillonner.js` (nouveau).
  - Figer : une voix par rendu hors ligne (deux voix d'un même rendu
    pourraient s'étouffer, comme les charleys), avec la même prise en charge
    du contexte audio que le rendu d'une prise MIDI (600) : sauvegarde de tout
    l'état, retour garanti, mode morceau rallumé. Le son est pris avant la
    chaîne générale (limiteur, écrêteur), comme le banc de son.
  - Chaque voix s'arrête à **−60 dB sous sa propre crête**, plus 10 ms de
    fondu. Un seuil fixe à −60 dBFS coupait tôt les voix faibles : la cymbale
    de la 808 (−22 dBFS) perdait la moitié de sa queue (0,75 s au lieu de
    1,23 s).
  - Le kit est normalisé **d'un bloc** : la voix la plus forte à −1 dB, les
    autres gardent leur rapport. Deux canaux identiques deviennent un seul.
  - Rééchantillonner : `exporterWav(songEm, versBib)` — avec `versBib`, le rendu
    va dans `reechVersBibliotheque`, qui coupe à la durée musicale exacte et
    replie la queue sur le début.
- `page/js/550-export-audio.js` : le second argument, et l'écriture vérifiée
  par `echSauver` au lieu de `fichierSauver` dans ce cas.
- Boutons : `630` (rayon SONS), `632` (rayon MACHINES),
  `340-note-general.html` (VERS LA BIBLIOTHÈQUE). Origines : `631`.

## Défaut évité en cours de route

La fonction s'appelait d'abord `reechantillonner`, nom déjà pris par celle qui
change le taux d'un son (530), dont se sert OPTIMISER LA MÉMOIRE : elle
l'aurait écrasée. `test-bibliotheque.cjs` l'a vu ; elle s'appelle
`reechantillonnerMachine`. Un contrôle de tout `page/js` ne trouve plus aucun
nom de fonction en double.

## Validation locale

- `outils/test-figer.cjs` (nouveau, dans `controles.sh`) : coupe au départ et
  à −60 dB sous la crête (voix forte et voix faible), voix muette écartée,
  mono, kit normalisé d'un bloc, boucle exacte et queue repliée, machines
  prises en charge, accents écartés, noms courts ;
- bloc **45** de `outils/test-navigateur.py` : TR-808 figée par le vrai bouton
  (11 sons écrits, cymbale de 1,22 s, crête du kit à −1 dB, grosse caisse en
  KICK, contexte et machine rendus, lecture normale ensuite), ES-1
  rééchantillonnée (4,000 s pour deux mesures à 120 BPM, BOUCLE) ;
- les seize machines figées tour à tour : aucune erreur, 0,1 à 1,8 s chacune
  dans le navigateur.

Non vérifié ici : la compilation Android et le téléphone.
