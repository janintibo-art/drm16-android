# v180 — Reprise des ouvertures de projet interrompues

La v179 protégeait le fichier de secours, mais un arrêt de l'application au
milieu du remplacement pouvait laisser des réglages et des sons provenant de
deux projets différents. La v180 reprend cette opération avant de démarrer les
machines.

## Fonctionnement

Avant toute modification du projet, l'application enregistre et relit deux
copies complètes : `avant-ouverture-….drm16` pour l'état courant et
`ouverture-verifiee-….drm16` pour le projet entrant. Un fichier natif de suivi,
`drm16-ouverture.json`, indique les copies concernées, les sons touchés et
l'étape atteinte. Il est lui aussi relu après écriture.

| Étape enregistrée | Action au démarrage suivant |
|---|---|
| Avant remplacement validé | Rétablir les réglages précédents et les sons touchés ; retirer les sons ajoutés par l'ouverture |
| Nouveau projet entièrement écrit et vérifié | Terminer ou vérifier la mise en place du nouveau projet |
| Suivi, copie ou restauration invérifiable | Arrêter le démarrage et afficher le secours concerné avec « Réessayer » |

Les sons extérieurs à l'ouverture et les clés de stockage d'autres applications
restent intacts. Une restauration ayant écrit des valeurs conserve le suivi et
recharge la page. Ce n'est qu'au démarrage où l'état correspond déjà à la copie
attendue que le suivi est supprimé, puis les machines sont initialisées.
Une nouvelle interruption pendant la restauration peut donc être reprise.

La taille et une empreinte CRC32 contrôlent les copies ; une empreinte contrôle
également le contenu du suivi. Elles détectent une altération accidentelle,
pas une modification malveillante accompagnée de nouvelles empreintes.

## Protections complémentaires

- Les migrations et chargements des machines ne s'exécutent pas avant la
  reprise. Le programme principal reste dans un bloc inerte, puis est lancé
  comme script global pour conserver ses points d'entrée Android et Windows.
- Pendant l'attente, les commandes et les écritures différées restent bloquées.
  Cela couvre aussi les callbacks MIDI, la sauvegarde des prises, le catalogue
  archive.org et la suppression des échantillons.
- Les lectures autonomes sont arrêtées même lorsque le séquenceur principal
  est déjà arrêté : banques Kaoss, looper et lectures MIDI.
- Un échec de restauration garde le suivi, le secours et l'écran de reprise.
  « Réessayer » recharge l'application après rétablissement de l'accès aux
  fichiers. Les raccourcis ne peuvent pas lancer une machine sous cet écran.
- Un retour d'erreur pendant la validation du nouveau projet peut cacher une
  écriture réussie. L'ancien état n'est restauré qu'après réécriture et
  vérification de l'étape précédente ; sinon la reprise décide au redémarrage.
- Les noms de sons différant seulement par la casse, comme `Kick` et `kick`,
  sont refusés avant remplacement. Ils peuvent désigner le même fichier sous
  Windows. Le refus s'applique aussi aux projets importés sur Android pour
  conserver un comportement portable.
- Un son nommé `__proto__` n'est plus omis du secours : le dictionnaire des sons
  est créé sans prototype.
- L'autotest Windows ne commence pas ses écritures si la reprise bloque le
  démarrage.

## Vérifications

Validation locale du 17 septembre 2026 :

- `bash outils/controles.sh` : assemblage exact des **151 sources**, syntaxe des
  trois blocs JavaScript, régressions, compilation Java simulée de 54 fichiers,
  tests fichiers/MIDI, archive PC complète et onze tests Rust avec ports simulés.
- `outils/test-reprise-projet.cjs` : **10 frontières d'interruption de
  l'ouverture et 23 interruptions supplémentaires pendant la restauration**.
  Chaque reprise utilise une nouvelle VM et uniquement les données persistantes
  photographiées à cet instant. Des tests supplémentaires couvrent la
  persistance partielle après validation, les quotas, les faux succès, les
  fichiers absents ou abîmés, les échecs de suppression et de validation, la
  conservation des données extérieures et les reprises sans boucle.
- Régressions ciblées sur les collisions `Kick`/`kick`, les journaux valides mais
  ambigus, le son `__proto__`, l'arrêt du jeu avant le blocage et le vecteur CRC32
  connu `123456789`.
- `outils/test-navigateur.py` : les **21 groupes** passent dans Chromium,
  notamment le chargement et le jeu des 29 machines dans trois formats d'écran.
  La reprise est vérifiée dans la vraie page avec un pont de fichiers simulé :
  ancien ou nouveau projet, absence d'initialisation et de migration avant la
  reprise, maintien puis suppression du suivi, secours abîmé, écran téléphone,
  raccourcis bloqués et nouvelle tentative après réparation.
- Après les derniers correctifs de revue, les groupes navigateur hôte bureau,
  ouverture, sauvegarde et reprise sont revérifiés, dont le refus de l'autotest
  Windows pendant un démarrage bloqué.

## Limites et utilisation des secours

Ces essais valident le protocole et les erreurs simulées. Ils ne remplacent ni
la compilation APK et Tauri/Windows par GitHub Actions, ni une fermeture forcée
sur téléphone et Windows réels. La relecture et le rechargement ne garantissent
pas la persistance physique de chaque écriture après une panne du système,
une coupure électrique ou une défaillance du support.

Les deux copies restent dans les sauvegardes après une ouverture terminée.
Elles prennent de la place et peuvent être supprimées ensuite si elles ne sont
plus utiles. Ne pas déplacer ou modifier les fichiers pendant une reprise.
Si une copie nécessaire est définitivement perdue ou abîmée, « Réessayer » ne
peut pas la reconstruire : il faut rétablir ce fichier pour débloquer la reprise.
L'écran ne propose pas d'abandonner un état partiellement remplacé.

Les limitations des ponts qui confondent parfois une liste vide et une erreur
d'accès restent présentes. Le suivi ne constitue pas non plus un verrou entre
plusieurs instances qui écriraient simultanément dans le même dossier.
Le banc audio complet et les essais sur matériel n'ont pas été relancés pour
cette version ; les contrôles audio inclus dans la suite navigateur passent.

L'archive `drm16_android_v180.zip` contient uniquement les fichiers nouveaux ou
modifiés depuis la v179, sous le dossier `drm16_android/`.
