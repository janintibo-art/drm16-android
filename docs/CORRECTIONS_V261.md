# v261 — Graphisme G2 : matières, reliefs et états des quatre façades récentes

Base : v260, commit `1b3520b1261408a0bdc3eb4219cf633c1b444187`.
Date : 20 septembre 2026.

## Périmètre

Cette version poursuit le chantier graphique après le confort mobile de la v260.
Elle habille PO-33 K.O!, MC-101, SmplTrek et KAOSS PAD. Elle ne refait pas les
anciennes façades et ne prétend pas terminer la feuille de route graphique v122.

Toute la modification de l'interface est dans une nouvelle feuille CSS locale.
Aucun JavaScript, identifiant HTML, bouton, action ni fonction audio n'est ajouté
ou retiré. Les améliorations de taille et de défilement de la v260 sont conservées.

## Changements visibles

### PO-33 K.O!

- Fond vert-noir évoquant le circuit imprimé, fines pistes cuivrées et grille discrète.
- Poignée creusée, petite grille de haut-parleur décorative et sérigraphie ivoire.
- Écran LCD avec ombre intérieure et léger reflet ; les valeurs restent celles
  de l'application, sans information ou animation fictive.
- Pads arrondis et biseautés ; contour de sélection orange conservé.
- Réglages Swing et Parameter Lock visuellement encastrés.

La grille et la petite vis ne sont pas des commandes et n'interceptent aucun geste.

### MC-101

- Châssis anthracite à grain horizontal, afficheur vert encastré.
- Quatre repères fixes distincts pour les quatre pistes : rose, ambre, bleu, menthe.
  Le contour de la piste choisie reprend sa couleur. Ces couleurs servent de
  repères visuels ; elles ne changent ni les sons ni le rôle des pistes.
- Potards avec bague et surface moletée ; leurs indicateurs existants continuent
  d'afficher la vraie valeur. Les quatre commandes C1 à C4 gardent leurs fonctions.
- Touches et pads en relief, cadre SCATTER plus visible.
- Texte sombre sur le clip choisi, attente ambre distincte de la lecture.

### SmplTrek

- Coque gris-olive à grain fin, chanfreins et petite vis décorative.
- Écran bordé et encastré, potards moletés, pads de type caoutchouc.
- Piste choisie entourée d'un trait ivoire ; couleurs de piste existantes conservées.
- Séparations entre certains groupes de réglages, sans ajout d'espace au panneau.

La forme d'onde et les dessins de l'écran existaient déjà en v260 : leur contenu
et leur moteur de dessin ne sont pas modifiés par cette livraison. Aucun nouveau
VU-mètre n'est annoncé ou simulé.

### KAOSS PAD

- Caisson vert-noir texturé, commandes biseautées, pavé satiné avec rebord rouge.
- Point de contact plus contrasté et trace de PAD MOTION existante plus visible.
- Le point et les points de trace n'interceptent jamais les événements du pavé.
- Dimensions du rectangle tactile et épaisseur de bordure conservées ; HOLD et
  calcul X/Y ne sont pas modifiés.
- Armement WRITE et mémoires armées en ambre, témoin de mémoire pleine conservé.

Il ne s'agit pas encore d'une nouvelle traînée animée ou d'un nouvel effet visuel
lié au son. La trace reste celle du geste que l'application sait déjà enregistrer.

## Défaut corrigé : le numéro se déplaçait sur une touche sélectionnée

Le style historique `.sel` est aussi utilisé par les sélecteurs de la façade DRM.
Il impose `display:flex`. Sur certaines touches des nouvelles façades, la même
classe pouvait donc placer numéro et nom côte à côte à la sélection, au lieu de
conserver la présentation verticale.

La v261 impose localement une disposition en bloc aux pads PO-33, pistes et clips
MC-101, scènes MC-101 et pistes SmplTrek. Le style des sélecteurs DRM n'est pas changé.
Les tests cliquent réellement sur une autre piste/pad et vérifient le maintien
des dimensions ainsi que la disposition de la sélection.

## États et gestes

- PLAY actif : vert sur les quatre transports.
- RECORD et SAMPLING du PO-33, RESAMPLE et enregistrement PAD MOTION du Kaoss : rouge.
- Attente de lancement MC-101 et SmplTrek : ambre, avec repère inférieur discontinu.
- Pas courant : clair avec texte sombre, même si le pas est aussi programmé.
- MUTE des pistes MC-101 et SmplTrek : atténuation et discret trait rouge discontinu.
- Mémoire Kaoss pleine : son repère inférieur reste présent après l'habillage.
- Appui : bref enfoncement, sans animation autonome. La préférence de mouvement
  réduit annule le déplacement sur les commandes de ces façades.

Les autres modes conservent leurs couleurs existantes. Il n'y a pas de modification
globale de tous les états de toutes les machines.

## Fichiers livrés

| Fichier | Rôle |
|---|---|
| `page/css/210-facades-matieres.css` | Nouvelle couche visuelle limitée aux quatre façades ; correction locale de `.sel`. |
| `page/ordre.txt` | Ajout de cette feuille après `200-confort-mobile.css`. |
| `app/src/main/assets/drm16.html` | Page distribuée, avec la nouvelle feuille insérée à l'emplacement du manifeste. |
| `outils/test-facades.py` | Tests des matières, états, sélections, commandes et gestes Kaoss. |
| `.github/workflows/android.yml` | Exécution du nouveau test après le test graphique v260, sans nouvelle dépendance. |
| `app/build.gradle` | Version Android 261 uniquement. |
| `bureau/src-tauri/Cargo.toml` | Version bureau 261.0.0 uniquement. |
| `bureau/src-tauri/tauri.conf.json` | Version bureau 261.0.0 uniquement. |
| `docs/CORRECTIONS_V261.md` | La présente note. |

Les fichiers non modifiés ne sont pas relivrés. Le test graphique v260 reste dans
le dépôt et sert également de base au nouveau test.

## Vérifications réalisées

### Intégrité de la base

La page v260 provient de l'archive fournie dans la conversation. Son empreinte Git
`6789ce017f53553891e1844398e1c24e8dd9be0f` a été comparée à celle retournée par
GitHub pour le commit de base : elle correspond, pour 1 903 686 octets.

Retirer uniquement le texte de la nouvelle feuille CSS de la page v261 redonne
exactement la page v260, octet pour octet. Les scripts et le contenu du body sont
également strictement identiques. La feuille est enregistrée une seule fois dans
le manifeste, juste avant la fermeture du bloc de styles. La concaténation utilisée
respecte celle du script `outils/assembler.py` du dépôt, sans séparateur ajouté.

Les sources historiques complètes n'ont pas toutes été téléchargées ici : le
contrôle d'assemblage intégral du dépôt reste à exécuter par GitHub Actions.

### Contrôles navigateur effectivement passés

Chromium de l'environnement de travail ; page chargée en mémoire avec
`localStorage` temporaire simulé. Aucun projet réel de l'utilisateur n'est utilisé.

1. Test graphique v260 après modification finale : **12 cas, 0 erreur**.
   Formats 393 × 851, 880 × 400 et 360 × 640 ; quatre façades par format.
   Contrôles : une seule façade visible, échelle 1, cibles d'au moins 44 × 44 px,
   textes des commandes d'au moins 10,5 px, débordement, défilement préservé,
   accès aux commandes inférieures et retour vers la DRM.
2. Nouveau test v261 : **16 cas, 0 erreur**.
   Les trois formats ci-dessus et 1180 × 860 ; quatre façades par format.
   Contrôles : matières présentes, décor non interactif, sélection stable,
   distinction des états, couleurs de piste, MUTE, RECORD du PO-33, démarrage et
   arrêt réels via PLAY, armement et écriture d'une mémoire Kaoss temporaire,
   repère de mémoire pleine, mouvement réduit et absence d'erreur JavaScript.
3. Gestes Kaoss dans ces quatre formats : glissement réel du pointeur vers
   X ≈ 0,75 / Y ≈ 0,80, maintien du point avec HOLD puis disparition à son arrêt.
4. Comparaison des scripts et vérification syntaxique par Node ; analyse syntaxique
   de la nouvelle CSS et compilation Python du nouveau test.
5. Captures de contrôle produites pour les 16 cas ; inspection des vues portrait
   et paysage pour les matières, les textes et les dispositions.

Les classes de pas courant et d'attente sont aussi appliquées temporairement par
le test pour vérifier leurs priorités de style. Cela valide leur rendu, pas à lui
seul tous les scénarios de programmation ou de changement de motif.

### Limites de validation

L'environnement bloque la navigation `file://` par une politique administrateur
(`ERR_BLOCKED_BY_ADMINISTRATOR`). L'exécution locale réussie utilise donc l'option
`--contenu`, comme pour la v260. Le mode normal du test, conservé pour GitHub Actions,
utilise la page locale et le stockage du contexte navigateur jetable.

La compilation APK complète, l'exécutable Windows et les tests historiques de
l'ensemble du dépôt ne sont pas déclarés réalisés ici. Le nouveau test et les tests
existants seront exécutés par le workflow après application de l'archive.

L'écoute, la latence et les performances sous charge audio sur un Samsung réel
restent à vérifier. L'absence de nouveau JavaScript ou d'animation autonome ne
constitue pas une mesure de performances sur téléphone.

## Ce qui est inchangé

Moteurs audio, échantillons, synthèse, ordonnanceur, motifs, sauvegardes et formats
de projet, fonctions MIDI, bibliothèque de sons par machine, Freesound, Syro,
permissions Android, signature, identifiant d'application et dépendances.

Aucune image ni police ajoutée ; aucun téléchargement supplémentaire au lancement.
La fonction `fit()`, les dispositions HTML de la v260 et les hitboxes sont inchangées.

## Suite du chantier

Restent notamment : lisibilité des anciennes façades à contrôler séparément,
Eurorack / MODULE FOCUS, présentation du menu et des outils, puis VU-mètres et
retours musicaux utiles. Ne pas considérer ces points comme réalisés par la v261.

Version à reprendre après application : **261**. Le mémo historique `REPRENDRE.md`
n'est pas réécrit dans ce lot ; le numéro courant est dans `app/build.gradle`
et dans la présente note.
