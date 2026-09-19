# v251 — Bibliothèque : les sons de chaque machine, et des kits

On pouvait affecter un son de la bibliothèque à une partie, mais pas voir d'un
coup ce que joue chaque machine, ni garder un jeu de sons pour y revenir.

## Utilisation

Bibliothèque → nouveau rayon **MACHINES**.

- **Répertoire par machine** : la liste en haut ouvre la machine choisie.
  Chaque partie ou pad montre son son. Une partie qui joue un échantillon a
  **ÉCOUTER** et **CHANGER…** (toute la bibliothèque ; la banque interne
  seulement pour les Drums de l'EMX-1 et les parties PCM de l'ER-1 mkII). Un
  emplacement vide (machine d'archive, MC-101) peut aussi recevoir un son. Les
  parties de synthèse indiquent leurs réglages, la DMX et la CR-5000 leurs
  niveaux.
- **Kits** : **RANGER CE KIT** garde sous un nom tous les réglages de sons —
  échantillons, niveaux, accord, filtres, timbres, et pour les TR la
  distorsion et le timbre commun — jamais les motifs. Seize kits par machine.
  Chaque kit : **RAPPELER**, **REMPLACER** (par les sons actuels, même nom),
  **RENOMMER**, **SUPPRIMER**.
- **Retour arrière** : avant chaque CHANGER ou RAPPELER, les sons en place sont
  gardés. **REMETTRE LES SONS D'AVANT** y revient ; un second appui refait le
  changement. On compare ainsi deux kits d'un doigt. Ce retour est gardé en
  mémoire.
- **Motif ou partout** : sur les machines dont les sons appartiennent au motif
  (Electribe, TR et RD-6, DrumBrute, TR-1000, volca, machine d'archive), un kit
  se rappelle dans le motif affiché, ou dans **tous les motifs** si la case est
  cochée ; le retour arrière vaut alors motif par motif. Sur la TR-1000, les
  motifs vides restent vides (la mémoire allégée en v250 le reste aussi). Sur
  la MPC, le kit est celui du **programme** de la séquence affichée.

Vingt-cinq machines ont leur répertoire : ES-1, ES-1 mkII, ESX-1, EMX-1, EM-1,
ER-1, ER-1 mkII, EA-1, EA-1 mkII, TR-808, TR-909, TR-707, RD-6, DrumBrute,
TR-1000, volca sample, machine d'archive, MPC3000, MPC2000, DMX, CR-5000,
PO-33, KAOSS PAD, MC-101, SmplTrek. Pas le DRM16/32, la TD-3 ni l'Eurorack.

## Fonctionnement

- `page/js/632-kits-de-sons.js` (nouveau) : une entrée par machine dans
  `KITS_MACHINES` — où sont ses sons, lesquels, les noms des parties, les
  emplacements d'échantillon. `kitsRanger`, `kitsRappeler`, `kitsRemettre`,
  `kitsChangerSon`, et le rendu du rayon `bibRendreMachines`.
- Relecture prudente : `kitsFusion` ne recopie une valeur que si elle a le
  type de celle qu'elle remplace ; un kit d'une autre taille est refusé ; une
  mémoire illisible donne une liste vide. Un kit abîmé ne peut rien casser.
- Changer un son passe par `bibAffecter` pour les dix machines qu'il servait
  déjà (mêmes règles, mêmes messages) ; ailleurs, la partie est écrite puis la
  machine enregistrée.
- Rappeler et remettre enregistrent la machine puis la rouvrent par
  `rouvrirMachine` (v250) : la façade se met à jour d'un bloc, le mode morceau
  reste allumé. Comme le tirage au sort des sons, cela arrête la lecture. La
  DrumBrute refuse pendant un SONG en lecture, comme pour le tirage au sort.
- Mémoire : `drm.reglages.kits`, donc emportée par les projets `.drm16`.
  Écriture refusée pendant l'ouverture d'un projet ; mémoire pleine signalée.
- `page/js/280-electribe-es-1.js` : `usagesEch` compte aussi les sons rangés
  dans les kits — les supprimer demande confirmation.
- `page/js/630-bibliotheque.js`, `page/html/280-bib.html` : sixième rayon.
  `page/css/190-kits-de-sons.css` : case et liste à 40 px de haut.
  `page/ordre.txt` : les deux nouvelles sources.
- `page/html/340-note-general.html` : la notice (« Six rayons »).

## Validation locale

- `outils/test-kits.cjs` (nouveau, dans `controles.sh`) : ranger, changer,
  remettre aller-retour, rappel dans le motif ou partout avec retour motif par
  motif, kits abîmés (types faux, NaN, taille, JSON illisible), réglages de
  timbre des TR, limite de seize, REMPLACER, usages, écriture bloquée pendant
  un projet ;
- bloc **41** de `outils/test-navigateur.py`, avec les vrais boutons et les
  vraies fenêtres de saisie : ES-1 (CHANGER, REMETTRE deux fois, tous les
  motifs, retour motif par motif, redémarrage), MPC3000 (programme), TR-1000
  partout (motifs vides restés vides), et le répertoire des 25 machines ;
- aller-retour ranger → modifier → rappeler → remettre sur chaque machine :
  valeurs retrouvées, aucune erreur de page.

Non vérifié ici : la compilation Android et le téléphone.
