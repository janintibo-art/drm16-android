# v252 — Bibliothèque : retrouver ses sons

Premier des sept chantiers de la bibliothèque (voir la fin de ce fichier).
Avec l'archive et Freesound, le rayon SONS devenait une longue liste plate.

## Utilisation

Rayon **SONS**, sous « Sons » :

- **Recherche** : un nom ou une catégorie, sans se soucier des accents ni des
  majuscules. La liste se met à jour à chaque lettre.
- **Filtres** : catégorie ; origine (banque, tous les vôtres, micro, fichiers,
  archive, Freesound, KAOSS) ; **★ favoris seulement**.
- **Tri** : nom, plus récents, durée, catégorie. Les favoris restent en tête.
- Sous chaque son : l'étoile **☆ / ★**, la **catégorie** (modifiable), et une
  petite **forme d'onde**.
- Le nombre de sons trouvés est affiché ; la liste va par pages de quarante,
  avec **AFFICHER 40 DE PLUS**.

Treize catégories : kick, caisse, clap, charley, cymbale, tom, percu, basse,
mélodique, voix, boucle, FX, autre.

## Comment la catégorie est trouvée

1. **Le nom**, s'il parle : les conventions des banques et des sites
   (« BD1 », « SD-3 », « HH », « CP », « LT », « Crash ride », « Reese bass »,
   « Break 120 », « caisse claire », « charleston »…). Sur les 24 sons de la
   banque interne, les 24 sont bien rangés.
2. Sinon, **l'écoute** : durée utile (jusqu'à −40 dB), part du grave (sous
   150 Hz), part de l'aigu (au-dessus de 4 kHz), passages par zéro (hauteur ou
   bruit), tenue. Sur des sons de synthèse types, les neuf familles franches
   sont reconnues ; sur des sons ambigus (claps, rimshots, effets), c'est une
   supposition — d'où la mention **(auto)**.
3. Le **choix à la main** l'emporte toujours. Renommer un son fait redeviner
   sa catégorie, sauf si elle a été choisie.

La catégorie devinée est gardée : l'analyse n'est faite qu'une fois par son.
Un son pas encore chargé est « autre » jusqu'à ce qu'il le soit.

## Fonctionnement

- `page/js/631-classement-des-sons.js` (nouveau) : noms, analyse, mémoire,
  filtres, tris, pages, favoris, forme d'onde (crêtes calculées une fois par
  son, 48 points par colonne).
- `page/js/630-bibliotheque.js` : le rayon SONS est découpé en
  `bibRendreSons` (en-tête et filtres), `bibRendreListeSons` (refaite seule à
  chaque filtre : la recherche garde la main) et `bibLigneSon`. Catégories et
  favoris vivent dans `BIB.meta`, écrit avec les noms dans `drm.reglages.bib`,
  donc dans les projets ; relus avec prudence (`bibMetaValides`). Supprimer un
  son efface aussi sa fiche.
- L'origine d'un son n'est pas stockée : elle se lit dans ce que l'appli
  retenait déjà (`ES.noms` : mic, fichier, archive, kaoss, freesound). La date
  se lit dans l'identifiant (`u` + horodatage).
- `page/css/190-kits-de-sons.css` : filtres et étoile à 40 px de haut au
  moins. `page/html/340-note-general.html` : la notice.

## Validation locale

- `outils/test-classement.cjs` (nouveau, dans `controles.sh`) : trente noms,
  dix sons synthétiques analysés, ordre manuel > deviné > nom > écoute,
  mémoire abîmée, origines, dates (KAOSS compris), recherche sans accents,
  filtres, quatre tris, favoris, pages ;
- bloc **42** de `outils/test-navigateur.py` avec 324 sons : ouverture en
  35 ms, page de 40 avec formes d'onde, recherche lettre à lettre sans perdre
  le clavier, filtres catégorie et origine, tri récent, page suivante, favori
  en tête, favori et catégorie retrouvés au redémarrage, AFFECTER depuis la
  liste classée ;
- les tests existants de la bibliothèque (`test-kp`, `test-bibliotheque`,
  `test-echantillons`, `test-freesound`) passent sans changement.

Non vérifié ici : la compilation Android et le téléphone.

## Chantiers suivants de la bibliothèque

v253 essayer un son dans le morceau · v254 éditeur de son · v255 figer une
machine en échantillons · v256 kits universels par rôle et kit au hasard ·
v257 kits et packs en fichiers · v258 corbeille, place, inutilisés, doublons.
