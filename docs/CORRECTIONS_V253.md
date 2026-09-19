# v253 — Bibliothèque : essayer un son dans le morceau

Deuxième chantier de la bibliothèque. Choisir un son à l'oreille, c'est
l'entendre à sa place, dans le motif qui tourne — pas seul avec ÉCOUTER.

## Utilisation

Rayon **SONS** :

1. Lancer le motif (sur la machine, ou avec **▶ LECTURE** de la barre d'essai).
2. Choisir la partie dans « Affecter à ».
3. **ESSAYER** sur un son : il prend la place tout de suite, **la lecture
   continue**. En essayer un autre, puis un autre.
4. Une barre en haut de la bibliothèque montre le son à l'essai, la partie et
   le son d'avant, avec **▶ LECTURE / ■ ARRÊT**, **GARDER** et **ANNULER**. La
   ligne du son essayé est entourée.

- **GARDER** valide le son ; ensuite, « REMETTRE LES SONS D'AVANT » du rayon
  MACHINES peut encore revenir au son d'origine.
- **ANNULER** remet le son d'origine, en mémoire aussi.
- **AFFECTER** sur la même partie pendant un essai garde ce son-là.
- Fermer la bibliothèque, rouvrir une machine, rappeler un kit annulent
  l'essai d'abord. Essayer sur une autre partie annule l'essai précédent.
- Si la machine visée n'est pas affichée, le premier ESSAYER l'ouvre (ce qui
  arrête la lecture, comme toujours) ; ▶ LECTURE relance.

Rayon **MACHINES** : chaque partie à échantillon a **ESSAYER D'AUTRES SONS**,
qui ouvre le rayon SONS avec la partie visée et le filtre sur la catégorie du
son actuel. **CHANGER…** n'arrête plus la lecture.

**AFFECTER et ESSAYER servent quatorze machines** : aux dix d'avant s'ajoutent
la volca sample, la TR-1000, la machine d'archive et le PO-33.

TR-1000 : l'échantillon est une seconde couche, mêlée au son analogique par
**MIX** ; à zéro on ne l'entend pas. La barre d'essai et le rayon MACHINES le
signalent.

## Fonctionnement

- `page/js/633-essai-des-sons.js` (nouveau) : `ESSAI` retient la machine, la
  partie, le son d'origine et l'**objet même** de la partie (le motif, le
  programme MPC) : s'il change entre-temps, le son revient au bon endroit.
  KAOSS PAD, MC-101, SmplTrek et PO-33 repassent par leurs fonctions
  d'affectation, qui relancent proprement la banque ou la piste. Une piste
  Looper de la MC-101 refuse l'essai.
- `page/js/660-choix-du-modele.js` : `allerMachine` annule un essai en cours
  avant de recharger une machine (sinon sa mémoire garderait le son d'essai).
- `page/js/630-bibliotheque.js` : `bibAffecter(id, silencieux)` — l'essai ne
  refait pas la liste ; quatre machines de plus ; le rayon garde sa place
  quand il est refait (plus de retour en haut après une affectation) ; bouton
  ESSAYER ; fermer annule l'essai.
- `page/js/632-kits-de-sons.js` : CHANGER passe par AFFECTER pour toutes les
  machines (plus de réouverture, donc plus d'arrêt) ; ESSAYER D'AUTRES SONS ;
  un geste de kit annule d'abord un essai.
- `page/html/280-bib.html`, `page/css/190-kits-de-sons.css` : la barre, aux
  couleurs du panneau, boutons de 40 px.

## Validation locale

- bloc **43** de `outils/test-navigateur.py`, vrais boutons, lecture en cours :
  trois essais de suite sans arrêt (le séquenceur avance), ANNULER (mémoire
  comprise), GARDER, AFFECTER pendant l'essai, fermeture, réouverture, barre
  lecture/arrêt, MPC3000 (deux essais pendant la lecture), volca, KAOSS PAD,
  TR-1000, PO-33, et ESSAYER D'AUTRES SONS depuis le rayon MACHINES ;
- écoute vérifiée : pendant l'essai, le moteur joue bien le tampon essayé
  (ES-1, volca ; MPC au tour suivant du motif) ;
- tests existants de la bibliothèque et des kits inchangés, sauf le faux
  `bibAffecter` de `test-kits.cjs`, qui rend maintenant `true` comme le vrai.

Non vérifié ici : la compilation Android et le téléphone.
