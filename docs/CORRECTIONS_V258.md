# v258 — Bibliothèque : corbeille, place occupée, sons sans emploi, doublons

Septième et dernier chantier annoncé de la bibliothèque : ranger ce qui traîne,
sans jamais perdre un son par erreur.

## Utilisation

- **METTRE À LA CORBEILLE** (rayon SONS, à la place de SUPPRIMER) : le son
  disparaît de partout où l'on choisit un son — listes, cycles de la machine
  (les boutons NEXT/PREV du panneau), exports, crédits, tirage au hasard — mais
  reste jouable là où il sert déjà. Après **trente jours**, il s'efface tout
  seul à l'ouverture de la bibliothèque.
- Rayon **SAUVEGARDES**, nouvelle section **Nettoyage** :
  - **Place occupée** : la mémoire prise par vos sons, et à part celle de la
    corbeille ;
  - **sons sans emploi** : ceux qui ne servent dans aucun motif, programme, kit
    rangé ni prise, avec **VOIR LES SONS SANS EMPLOI** vers le rayon SONS ;
  - **doublons** : deux sons aux mêmes échantillons — on garde celui qui sert
    le plus (à égalité, le plus ancien) et on met les autres à la corbeille en
    un geste ;
  - **corbeille** : chaque son, le temps qui lui reste, **RESTAURER** ou
    **SUPPRIMER DÉFINITIVEMENT**, et **VIDER LA CORBEILLE**.
- Rayon SONS : une case **sans emploi seulement**, à côté de ★ favoris ; et
  **METTRE LA LISTE À LA CORBEILLE**, qui prend toute la liste filtrée (une
  catégorie, une recherche, sans emploi…) d'un coup.

## Fonctionnement

- `page/js/639-corbeille-et-nettoyage.js` (nouveau) : mémoire de la corbeille
  (`BIB.corbeille`, un identifiant → la date de mise), `bibMettreCorbeille`,
  `bibRestaurer`, `bibSupprimerDefinitif`, `bibViderCorbeille`,
  `bibPurgerCorbeille` (silencieuse, à l'ouverture) ; place occupée
  (`bibPlaceOccupee`, taille réelle après `wavDe` : toujours mono, 16 bits) ;
  sons sans emploi (`bibSansEmploi`, `bibMettreListeCorbeille`) ; doublons
  (`bibDoublonsDe`, pure, et `bibDoublonsActuels`, qui réutilise l'empreinte du
  pack v257) ; le panneau `nettoyageRendre`, dans le rayon SAUVEGARDES.
- **Le bon endroit pour cacher un son à la corbeille : `listeEch()`**
  (`280-electribe-es-1.js`). Toute la bibliothèque part de cette seule liste —
  le rayon SONS, les listes CHANGER des kits, le tirage au hasard, l'export
  carte ES-1, les crédits, les boutons NEXT/PREV du panneau de chaque machine.
  Un son à la corbeille en est simplement retiré (protégé par
  `typeof bibEnCorbeille === "function"`, pour les tests qui chargent ce
  fichier seul) ; `ES.buf[id]` n'est pas touché, donc le son reste chargé et
  jouable où un motif le référence déjà.
- `630-bibliotheque.js` : `bibLire`/`bibEcrire` gardent `BIB.corbeille` (validé
  par `bibCorbeilleValide`) ; SUPPRIMER (rayon SONS) devient METTRE À LA
  CORBEILLE ; `ouvrirBib` purge silencieusement ; SAUVEGARDES affiche le
  panneau Nettoyage.
- `631-classement-des-sons.js` : filtre `sansemploi` dans `bibFiltre`/
  `bibClasserSons` ; case à cocher ; boutons METTRE LA LISTE À LA CORBEILLE et
  NETTOYAGE (raccourci vers SAUVEGARDES) sous les filtres.

## Validation locale

- `outils/test-corbeille.cjs` (nouveau, dans `controles.sh`) : validation de
  la mémoire de la corbeille (identifiants et dates plausibles seulement) ; le
  choix d'un doublon à garder (celui qui sert le plus, puis le plus ancien) et
  le regroupement sans mélange de plusieurs empreintes ;
- bloc **48** de `outils/test-navigateur.py` : METTRE À LA CORBEILLE retire un
  son du rayon SONS ; le panneau Nettoyage affiche la place occupée, un
  doublon et un compte de sons sans emploi ; RESTAURER le remet ; VOIR LES
  SONS SANS EMPLOI bascule sur SONS avec le bon filtre ; un doublon mis à la
  corbeille (celui qui ne sert pas), l'autre gardé ; SUPPRIMER DÉFINITIVEMENT
  efface le son et son fichier, sans toucher à celui qui sert ; VIDER LA
  CORBEILLE ; un son de plus de trente jours est effacé en silence à
  l'ouverture ; METTRE LA LISTE À LA CORBEILLE sur une liste filtrée.

Non vérifié ici : la compilation Android et le téléphone.
