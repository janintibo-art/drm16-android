# v254 — Bibliothèque : éditeur de son

Troisième chantier de la bibliothèque. Jusqu'ici, on ne pouvait que TRAITER
un son avec un préréglage.

## Utilisation

Rayon **SONS** → **ÉDITER** sur un son. L'éditeur prend la place de la liste.

- **Sélection** : sur la forme d'onde, au doigt (la borne DÉBUT ou FIN la plus
  proche suit), ou avec les curseurs. **▶ ÉCOUTER LA SÉLECTION**, **TOUT
  SÉLECTIONNER**. La durée et la sélection s'affichent en secondes.
- **Gestes sur la sélection** : ROGNER (garder la sélection), RETIRER, FONDU
  D'ENTRÉE, FONDU DE SORTIE (courbe à puissance constante), NORMALISER (crête
  à −0,3 dB), −3 dB, +3 dB (borné à ±1), INVERSER.
- **Hauteur**, sur tout le son : −12, −1, +1, +12 demi-tons, par
  rééchantillonnage comme un échantillonneur (plus haut = plus court).
- **Découper en sons** : 2, 4, 8 ou 16 tranches égales, ou **sur les
  attaques** (seize au plus, 60 ms au moins entre deux). Chaque tranche devient
  un son « NOM T1 », « NOM T2 »…, avec 2 ms de fondu à chaque bord contre les
  clics.
- **ANNULER** : douze pas, sélection comprise.
- **ENREGISTRER COMME NOUVEAU SON** : une copie « NOM (ÉDITÉ) », origine
  **ÉDITÉS** dans les filtres ; l'éditeur continue sur la copie.
- **REMPLACER L'ORIGINAL** : seulement pour vos sons, après confirmation, qui
  dit combien de parties s'en servent. Elles entendent aussitôt la version
  éditée.
- **FERMER L'ÉDITEUR** demande confirmation s'il reste des changements non
  enregistrés.

L'original ne change jamais sans REMPLACER.

## Fonctionnement

- `page/js/634-editeur-de-son.js` (nouveau). Les calculs (`edRogner`,
  `edRetirer`, `edFondu`, `edNormaliser`, `edGain`, `edInverser`, `edHauteur`,
  `edTranchesEgales`, `edAttaques`, `edExtraire`) travaillent sur des tableaux
  de canaux et rendent de nouveaux tableaux : l'original reste intact, la pile
  d'annulation garde les anciens. Mono et stéréo.
- `edPoserTampon` remplace le tampon d'un son **partout** : machines, sons
  inversés en cache, tranches du KAOSS PAD (qui gardaient l'ancien son),
  forme d'onde du SmplTrek. **TRAITER** passe maintenant par là aussi : avant,
  une banque KAOSS en SLICE pouvait continuer à jouer l'ancien son traité.
- `page/js/630-bibliotheque.js` : bouton ÉDITER ; le rayon SONS affiche
  l'éditeur quand il est ouvert. Correction du défilement ajouté en v253 :
  changer de vue (liste, éditeur, autre rayon) repart du haut ; seule la même
  vue refaite garde sa place. Sans cela, l'éditeur s'ouvrait défilé, sa forme
  d'onde hors de l'écran.
- `page/js/631-classement-des-sons.js` : origine « ÉDITÉS ».
- `page/css/190-kits-de-sons.css`, `page/html/340-note-general.html`.

## Validation locale

- `outils/test-editeur.cjs` (nouveau, dans `controles.sh`) : chaque calcul
  (valeurs exactes, deux canaux, original intact), fondus à puissance
  constante, bornes du gain, hauteur ±12, attaques sur quatre coups et sur un
  silence, pile de douze, sélection rendue par ANNULER, copie, refus de
  remplacer la banque, confirmation refusée, caches KAOSS et SmplTrek, noms et
  identifiants des tranches ;
- bloc **44** de `outils/test-navigateur.py` : ouverture, sélection au doigt
  (à 2 % près), ROGNER, +1 demi-ton, NORMALISER, ANNULER pas à pas, copie
  écrite par le pont, REMPLACER entendu par la partie qui s'en sert, fermeture
  protégée, découpe d'une boucle en quatre sons de 0,25 s.

Non vérifié ici : la compilation Android et le téléphone.
