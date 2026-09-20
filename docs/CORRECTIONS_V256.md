# v256 — Bibliothèque : kits par rôle, kit au hasard, copie de kit

Cinquième chantier de la bibliothèque. Les catégories de la v252 servent ici
de **rôles** : le pad qui joue un kick est « kick ».

## Utilisation

- **POSER LA LISTE SUR LA MACHINE CHOISIE, PAR RÔLE** (rayon SONS, sous les
  filtres) : toute la liste filtrée — par exemple les sons d'une TR-808 figée,
  en cherchant « TR-808 » — va sur la machine choisie dans « Affecter à ».
  Sur une MPC3000 : KICK ← BASS DRUM, SNARE ← SNARE, HAT ← CLOSED HAT, OPEN HAT
  ← OPEN HAT, les toms trouvent un tom.
- **COPIER CE KIT VERS…** (rayon MACHINES) : les sons de la machine affichée
  vont sur une autre machine à échantillons, qui s'ouvre.
- **KIT AU HASARD** (rayon MACHINES) : chaque partie tire un son de son rôle
  dans toute la bibliothèque ; ou seulement parmi les favoris, si la case est
  cochée.

Dans les trois cas, la lecture continue, et **REMETTRE LES SONS D'AVANT**
revient au kit précédent.

## Comment chaque partie choisit

1. Son rôle : la catégorie de son son actuel ; à défaut, son nom.
2. D'abord les parties dont le **nom ressemble** à un son de la source, hors
   mots génériques (HAT, KICK, DRUM, noms de machines…) : un pad « OPEN HAT »
   reçoit « TR-808 OPEN HAT ». Sans ce premier passage, un pad « HAT » placé
   avant prenait le charley ouvert.
3. Puis les autres : un son du même rôle pas encore posé ; sinon le même son
   une deuxième fois (une MPC a bien plus de pads que de kicks) ; sinon un
   **rôle voisin** (caisse ↔ clap, charley ↔ cymbale, tom ↔ percu…) ; sinon la
   partie garde son son.
4. **Au hasard**, pas de préférence par le nom, et une partie ne reçoit pas le
   son qu'elle joue déjà s'il en existe un autre du même rôle. Sans cela,
   chaque partie retrouvait son propre son dans la bibliothèque (« OPEN HAT »
   ressemble à « OPEN HAT ») : seules 3 parties sur 10 changeaient ; ce sont
   maintenant les 10.
5. Les parties qui ne lisent que la banque interne (Drums de l'EMX-1, PCM de
   l'ER-1 mkII) ne reçoivent que la banque.

## Fonctionnement

- `page/js/637-kits-par-role.js` (nouveau) : `rolesParties`,
  `choisirParRole` (pur, sans page), `ressemblance`, `poserParRole` (par
  `bibAffecter`, après l'instantané « avant » des kits), `poserListeSurMachine`,
  `kitAuHasard`, `copierKitVers`.
- `page/js/631-classement-des-sons.js` : `bibClasserSons` rend aussi la liste
  complète filtrée (pas seulement la page affichée) ; le bouton sous les
  filtres.
- `page/js/632-kits-de-sons.js` : KIT AU HASARD, la case des favoris, COPIER
  CE KIT VERS….
- `page/html/340-note-general.html` : la notice.

## Validation locale

- `outils/test-roles.cjs` (nouveau, dans `controles.sh`) : même rôle sans
  doublon, le nom qui départage, deux HAT et deux OPEN HAT quel que soit
  l'ordre, réutilisation, rôles voisins, banque seule, mélange complet ;
- bloc **46** de `outils/test-navigateur.py` : TR-808 figée posée sur une
  MPC3000 pendant la lecture, REMETTRE, kit au hasard sur la volca (chaque
  partie dans son rôle ou un voisin), au hasard parmi un seul favori, copie
  de la volca vers le KAOSS PAD.

La suite complète a d'abord échoué au bloc 41 (v251) : la nouvelle liste
COPIER CE KIT VERS… portait la classe des listes CHANGER des parties, et le
test prenait l'une pour l'autre. Elle a sa propre classe.

Non vérifié ici : la compilation Android et le téléphone.
