# DRM16 — v262 — Module Focus Eurorack

Date : 20 septembre 2026.
Base : v261, commit `65a0be184ef3cd09a0e0641edf1d18896b1f3adc` du dépôt `janintibo-art/drm16-android`.
Livraison : correctif incrémental, à appliquer après la v261 ; ce n'est pas une archive autonome du projet.

## Ce que ce lot apporte

Le rack entier reste utile pour suivre les connexions, mais ses modules et leurs légendes sont petits sur téléphone. Agrandir toute la façade oblige aussi à déplacer le rack pour atteindre d'autres commandes.

Le nouveau panneau **MODULE FOCUS** présente un module à la fois, avec de grands potards, leurs valeurs et de grandes prises. Le rack reste visible et assombri à l'arrière-plan. Le Focus utilise les objets et paramètres existants : ouvrir, parcourir et fermer cette vue ne recrée pas le graphe audio et ne change pas les câbles.

Le panneau reprend le caractère clair ou sombre de chaque module, avec une façade texturée, des boutons en relief et un afficheur contrasté. L'habillage est réalisé en CSS : aucun fichier image, téléchargement ou animation permanente n'est ajouté.

## Utilisation

1. Dans l'Eurorack, sélectionner un module puis toucher **FOCUS**. On peut aussi toucher rapidement deux fois son titre. Au clavier, Entrée ou Espace sur le titre ouvre le panneau.
2. Glisser un potard verticalement pour le régler. Déporter le doigt sur le côté réduit la vitesse du réglage pour gagner en précision. Au clavier : flèches, Début et Fin ; Maj rend les variations plus fines. La molette fonctionne également.
3. La valeur apparaît sous le potard et dans l'afficheur. Les paramètres compris entre 0 et 1 sont indiqués en pourcentage de leur course : ce ne sont pas des fréquences en Hz ou des durées en secondes. Les autres paramètres affichent leur valeur numérique.
4. Utiliser les flèches ou le sélecteur pour passer à un autre module. Les numéros de module et de rangée permettent de retrouver sa place dans le rack.
5. Pour câbler, toucher une sortie, choisir le module de destination, puis toucher une entrée. La sortie en attente est repérée en ambre et les prises déjà reliées sont bleutées. Le bouton **ANNULER LA LIAISON** abandonne une sortie en attente.
6. Les règles existantes du rack sont conservées : sans sortie en attente, toucher une entrée déjà reliée retire son câble ; une nouvelle liaison remplace celle qui occupait cette entrée.
7. **RETOUR AU RACK**, Échap ou un appui sur le fond assombri ferme le panneau. Le zoom et le défilement du rack sont conservés. La commande de lecture du Focus utilise le transport existant.

L'ouverture et la fermeture du Focus n'arrêtent pas une lecture en cours. En revanche, une action volontaire sur un réglage, une prise ou le transport conserve naturellement son effet habituel sur le son.

## Présentation et protection des gestes

- En portrait, navigation, afficheur et commandes sont empilés. Seul l'intérieur du panneau défile pour les modules denses.
- En paysage bas et large, navigation, valeur et transport passent dans une colonne à gauche ; le module occupe la partie droite. Le bouton de retour reste accessible.
- Les commandes du panneau ont des cibles d'au moins 44 × 44 pixels CSS dans les quatre formats contrôlés. Cette taille concerne le Focus, pas l'ensemble des petites commandes du rack historique.
- Le Focus ne transmet pas ses gestes au zoom global. Le double appui sur le titre d'un module ne remet plus le zoom à plat.
- Le reste de l'interface est temporairement désactivé pendant l'ouverture. La navigation au clavier reste dans le panneau ; les attributs d'accessibilité antérieurs sont restaurés à la fermeture.
- Un glissement interrompu, un changement d'application ou une perte de focus libère le potard. Supprimer le module, charger un autre rack — même avec les mêmes identifiants —, changer de machine ou ouvrir un autre panneau ferme la vue devenue obsolète.

## Fichiers livrés — 11 fichiers uniquement

| Fichier | Modification |
| --- | --- |
| `page/css/220-eurorack-focus.css` | Nouveau style du panneau, potards et prises agrandis, matières, états et dispositions portrait/paysage. |
| `page/js/455-eurorack-focus.js` | Nouvelle vue Focus, navigation entre modules, affichage et modification des paramètres existants, délégation au câblage et au transport, gestion des gestes et du cycle de vie. |
| `page/js/230-pincement-a-deux-doigts.js` | Exclusion des gestes du Focus du pincement global ; titre du module reconnu comme une commande. Le reste du comportement de zoom est conservé. |
| `page/ordre.txt` | Ajout des deux nouvelles sources dans l'ordre d'assemblage. |
| `app/src/main/assets/drm16.html` | Page assemblée intégrant les nouvelles sources et l'ajustement du pincement. |
| `outils/test-eurorack-focus.py` | Nouveau contrôle navigateur du Focus, des gestes, des références audio, du câblage, des sauvegardes de réglage et des 103 interfaces du catalogue. |
| `.github/workflows/android.yml` | Exécution du nouveau test après les tests graphiques précédents. |
| `app/build.gradle` | Version Android 262. |
| `bureau/src-tauri/Cargo.toml` | Version bureau 262.0.0. |
| `bureau/src-tauri/tauri.conf.json` | Version bureau 262.0.0. |
| `docs/CORRECTIONS_V262.md` | Présent compte rendu et mode d'emploi. |

## Vérifications effectuées avant livraison

### Tests navigateur

Exécution dans Chromium, avec Playwright et un stockage temporaire simulé. La navigation directe `file://` étant bloquée dans l'environnement de préparation, les tests ont été lancés en mode `--contenu`. Le test livré conserve son mode `file://` normal pour GitHub Actions.

| Contrôle | Résultat |
| --- | --- |
| Focus : formats 393 × 851, 880 × 400, 360 × 640 et 1180 × 860 | 4 formats, aucune erreur signalée. |
| Catalogue : 103 types ouverts dans chacun des 4 formats | 412 ouvertures d'interface ; présence des potards et prises, taille des cibles, absence de débordement horizontal contrôlées. |
| Confort mobile v260 : PO-33, MC-101, SmplTrek et Kaoss dans 3 formats | 12 cas, aucune erreur signalée. |
| Matières et états v261 : les mêmes 4 machines dans 4 formats | 16 cas, aucune erreur signalée. |

Le test Focus exerce un exemple réellement câblé avec Web Audio : clics d'ouverture/fermeture et de navigation, double appui, glissement de potard, précision, clavier, molette, interruption d'un geste, gestes multitouch, sauvegarde d'un réglage dans l'état mémorisé, sélection/remplacement/retrait/annulation d'une liaison, transport, changement de panneau et invalidation d'un module. Il vérifie aussi que l'ouverture et la fermeture ne recréent pas les références du graphe audio et conservent la lecture et la vue du rack.

Les 412 ouvertures constituent une couverture **graphique** du catalogue : elles ne signifient pas que les 103 moteurs ont été écoutés ou mesurés individuellement. Les captures portrait et paysage ont également été examinées, notamment celles du filtre et du séquenceur dense.

### Contrôles statiques et assemblage

- Syntaxe des trois blocs JavaScript de la page assemblée vérifiée avec Node ; syntaxe Python du nouveau test vérifiée.
- Règles du contrôle `verifier-html.py` appliquées à la page : 79 affectations HTML examinées, aucune source extérieure connue interprétée comme du HTML.
- Cohérence des trois déclarations de version vérifiée.
- La page v261 utilisée correspond au blob GitHub `665fe1cc748eff1b0162771490b98583ffd635c0`. La source initiale de pincement correspond au blob `de30178d839f182f2ad22cd5cdc67eb7766af20a`.
- L'intégration a été contrôlée par inversion : retirer les deux nouveaux blocs et rétablir le pincement restitue exactement, octet pour octet, la page v261 vérifiée. Les entrées de `page/ordre.txt` suivent ces emplacements.

### Ce qui reste à valider

Le dépôt complet, les contrôles natifs Java/Rust, le vérificateur officiel d'assemblage de toutes les sources et la compilation de l'APK n'ont pas été exécutés dans cet environnement de préparation. Ils restent à exécuter par la chaîne GitHub après application du ZIP. Aucun test tactile sur le Samsung de l'utilisateur ni écoute humaine n'a été effectué ici. Les tests navigateur ci-dessus ne remplacent pas cette validation sur appareil.

## Ce qui n'a pas été modifié

Les définitions et algorithmes des moteurs audio, les échantillons, Freesound, la bibliothèque de sons, les motifs, le MIDI et les formats de sauvegarde ne changent pas. Les réglages effectués dans le Focus utilisent la fonction de mémorisation Eurorack existante ; il n'y a pas de nouveau format ni de migration. Les façades améliorées en v260/v261 sont conservées.

## Suite graphique restant à traiter

Les prochains lots du bilan concernent le menu et les outils, puis les retours visuels musicaux et VU-mètres. Cette v262 ne constitue pas la fin de la refonte graphique globale.
