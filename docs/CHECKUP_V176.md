# Grand check-up DRM16 — v176

Audit du 17 septembre 2026, à partir de la v175. La v176 est une version de maintenance : corrections, tests de régression et paquet PC complet.

**Suivi v177 :** le défaut d'export MIDI avec plusieurs machines décrit dans ce bilan est corrigé. Voir les [corrections et vérifications de la v177](CORRECTIONS_V177.md). Le reste du document conserve les constats du check-up v176.

**Suivi v178 :** les demandes de connexion MIDI Windows sont désormais traitées dans une file commune. Les [corrections et vérifications de la v178](CORRECTIONS_V178.md) distinguent les tests avec ports simulés de la compilation et des essais matériels Windows restant à effectuer.

**Suivi v179 :** les sauvegardes de projet créées dans la même seconde gardent des fichiers distincts et leur contenu est relu après écriture. Le [bilan v179](CORRECTIONS_V179.md) précise cette protection ; la reprise automatique après arrêt brutal pendant une ouverture reste à réaliser.

## Résultat

Les contrôles automatiques initiaux de la v175 passaient, mais ne couvraient pas plusieurs pertes d'état, erreurs de routage et refus d'écriture. Des reproductions ciblées ont permis de corriger ces cas et d'ajouter des tests.

La suite du navigateur passe sur les 29 machines, dans trois formats d'écran. Les contrôles JavaScript, les tests de régression, la compilation Java de contrôle et la vérification du paquet PC passent également. Cela ne remplace pas la compilation Android et les essais sur le téléphone.

**Un défaut confirmé reste à traiter en priorité : l'export WAV d'une prise MIDI utilisant plusieurs machines peut perdre des notes.** Le détail et les limites de cet audit figurent plus bas ; un résultat vert n'est pas une garantie d'absence de défaut.

## Corrections livrées

| Domaine | Défaut reproduit | Correction et vérification |
|---|---|---|
| Ouverture d'un projet | L'état courant pouvait être remplacé après un échec de sauvegarde de secours, ou après une sauvegarde omettant des sons. | L'ouverture est annulée si le secours complet ne peut pas être écrit. Tests de lecture, taille et écriture refusées. |
| Quota de mémoire | Des clés supprimées avant une écriture refusée laissaient un projet partiellement remplacé. | Retour aux anciennes valeurs en cas d'échec ; pas de faux succès ni de rechargement. |
| Sons d'un projet | Un échec après le remplacement d'un premier son pouvait laisser une bibliothèque mélangée. | Restauration des sons touchés et retrait des nouveaux sons. Si cette restauration échoue aussi, le message donne le nom du secours. |
| Sauvegardes différées | Une clé refusée était oubliée ; un export pouvait conserver sa vieille valeur stockée. | La clé reste à réessayer. Le résultat de l'écriture remonte jusqu'au projet, qui refuse un instantané périmé. |
| Fichiers WAV des projets | Un simple préfixe RIFF en Base64 suffisait à accepter un contenu invalide. | Contrôle de l'alphabet, du conteneur RIFF/WAVE, des blocs et de leurs limites. Les blocs supplémentaires restent acceptés. Test d'un vrai WAV de 4 096 044 octets, sans regex susceptible d'épuiser la pile. |
| Imports et enregistrements tardifs | Un résultat asynchrone pouvait publier un son de l'ancien état pendant l'ouverture d'un projet. | Gardes au moment de publier les imports, prises micro, téléchargements archive.org et affectations ES/ESX. |
| KO et SmplTrek | L'ouverture directe après redémarrage pouvait utiliser les valeurs par défaut sans restaurer la machine. | Activation complète : arrêt, audio, chargement et mémorisation. Tests de restauration à froid. |
| MPC et DMX | La quantification OFF, enregistrée avec la valeur 0, revenait à une valeur active. | Restauration explicite de 0 ; test d'enregistrement conservant sa position libre. |
| MPC et DMX | UNDO après un changement de séquence pouvait remplacer le contenu d'une autre séquence. | Historique attaché à sa séquence, refusé sur une autre et invalidé lors du remplacement de la séquence. |
| DrumBrute | Une mémoire malformée pouvait faire échouer l'ouverture. | Bornes et valeurs par défaut pour indices, motifs et paramètres ; tests de données abîmées. |
| Kaoss : gestes | La capture atteignant 256 points, REJOUER ou STOP pouvaient terminer le geste sans le sauver. | Fin de capture commune et sauvegardée. Les gestes restaurés sont contrôlés et copiés sans partage des tableaux. |
| Kaoss : effets et arrêt | Effacer un geste pouvait laisser son effet actif. Un Kaoss secondaire pouvait continuer sa boucle ou sa capture après STOP. | Retour à l'effet neutre selon l'état HOLD/tactile ; arrêt des sources et de la capture du Kaoss secondaire. |
| ES/ESX : égalisation | L'égalisation du kit écrivait le mauvais paramètre de niveau. | Écriture de `lvl`, utilisé par ces moteurs ; conservation de `niv` pour les MPC. |
| Bibliothèque et ER-1 mkII | Les affectations PCM1/PCM2 visaient les mauvaises parties. Les usages MPC/Volca étaient absents de l'avertissement de suppression. | Indices réels de l'ER2 et inventaire des affectations actives ou sauvegardées, sans doublons. |
| Traitement des sons | Une ancienne version inversée d'un son pouvait rester en cache ; un succès pouvait masquer un refus de sauvegarde. | Invalidation du cache inversé et conservation du message d'échec. |
| SET sous horloge MIDI | Seule la machine principale avançait. | Même programmation du SET en horloge interne et externe, avec la longueur propre de chaque machine. Test d'une principale de 12 pas et d'une MC de 16 pas. |
| Curseurs du SET | Des événements secondaires pouvaient déplacer le curseur principal ; la vue d'ensemble pouvait afficher un pas programmé mais pas encore entendu. | File principale isolée et rang absolu attaché à l'instant entendu. |
| Retour au premier plan | Une minuterie interne pouvait reprendre pendant la synchronisation MIDI externe. | Une seule horloge active ; tests START/CONTINUE et reprise de visibilité. |
| Routage MIDI | Une EM-1 ciblée par canal dépendait de la machine affichée ; les percussions MC pouvaient passer par la gamme mélodique. | Routage fondé sur la cible et distinction des pistes rythmiques/mélodiques. |
| Rendus audio | Les bus SET du contexte hors ligne pouvaient remplacer les bus du jeu en direct. Le cache de machine pouvait survivre au contexte. | Bus isolés puis restaurés, y compris après rejet du rendu ; cache lié au contexte et à la machine. Pas d'émission de notes MIDI externes pendant le rendu. |
| Ouverture MIDI Android | L'application pouvait annoncer un appareil ouvert alors qu'aucun port n'avait été obtenu. | Fermeture de la connexion et état d'échec ; neuf cas testés sur la classe Java avec ports simulés. |
| Téléchargement PC | Le HTML seul ne contenait ni les fichiers de Studio/Nexus ni leurs sons. | ZIP complet ajouté aux workflows, avec notice et vérification de chaque fichier. L'ancien HTML reste disponible. |

## Ce qui a été vérifié

### Contrôles du dépôt

`bash outils/controles.sh` vérifie désormais aussi les nouveaux tests de mémoire, projet, bibliothèque, restauration et transport, le cas MIDI sans port et l'intégrité du paquet PC.

- Assemblage exact de `drm16.html` à partir des 147 sources de `page/`.
- Façades, atténuation des voix, traitement des noms extérieurs, passage par HOST, identifiants HTML et courbes audio.
- Syntaxe JavaScript et régressions des machines, échantillons, sauvegardes et exports.
- Compilation Java de contrôle : 54 fichiers avec les classes Android simulées ; tests fichiers et MIDI.
- Préparation de la coque de bureau et archive PC contenant les 99 assets présents, plus sa notice. Une archive tronquée est refusée.
- Espaces/fin de lignes contrôlés avec `git diff --check` ; syntaxe Python et structure YAML des workflows vérifiées.

La compilation Java simulée contrôle le code et les scénarios exercés ; elle ne produit pas un APK et n'émule pas tout Android.

### Navigateur réel

Chromium Headless Shell 141, piloté par Playwright 1.56.0 : 19 groupes de tests couvrent les 29 machines dans les formats 393×851, 880×400 et 360×640, l'absence de débordement horizontal, les effets, les fichiers, les ponts simulés, le MIDI, les projets et les scènes MC.

L'enregistrement Kaoss traverse réellement MediaRecorder, le décodeur et la production WAV. La prise courte et l'arrêt automatique à huit secondes donnent un son non silencieux. Le test des projets a été relancé après la dernière correction de validation WAV.

Deux anciens tests MC échouaient après rechargement parce que le menu de démarrage interceptait leurs clics. Ils choisissent désormais la tuile MC après avoir vérifié la restauration, comme le ferait l'utilisateur. Le code de production n'a pas été modifié pour masquer cet échec de test.

Le navigateur teste aussi le plafond de sortie, le filtre subsonique, le lissage des réglages et le filtrage des sons lus rapidement. Les mesures de repliement obtenues sont d'environ −84 dB à vitesse ×2 et −105 dB à vitesse ×3, avec le son utile conservé à environ −0,45 dB.

### Banc audio complet

Les [mesures détaillées de la v176](checkup-v176-mesures-son.md) et leurs [données JSON](checkup-v176-mesures-son.json) sont conservées avec ce bilan. Le banc a mesuré 272 voix sur 29 machines : aucune erreur signalée, aucune voix écrêtée et aucun ensemble mesuré au-dessus de 0 dBFS. Le plafond de la chaîne reste à −0,175 dBFS.

La Volca et la DrumBrute diffèrent de l'ancienne référence `mesures-son.json`, mais une comparaison ciblée avec la v175 confirme que ces différences précèdent ce check-up : leurs niveaux sont identiques entre v175 et v176. Aucun recalibrage n'a été effectué. Le banc utilise les sons et motifs par défaut ; les motifs vides ne donnent naturellement pas de mesure. Il ne mesure ni les performances du téléphone ni les sons importés.

## Défaut confirmé restant : export MIDI avec plusieurs machines

**Priorité haute, reproduction réelle sur la v176.** Dans l'enregistreur MIDI, une prise peut router différents canaux vers différentes machines. Lors de sa conversion en WAV, l'activation de la machine suivante arrête ou débranche des nœuds de la précédente avant le calcul du son hors ligne.

Reproduction : une note de percussion MC à 0 seconde, puis une note DRM16 sur un autre canal à 1 seconde. Mesure de la première partie du WAV, avant l'arrivée de la DRM16 :

| Prise | Crête | Niveau efficace |
|---|---:|---:|
| Note MC seule | 0,3650 | 0,01944 |
| Même note MC puis note DRM16 | 0 | 0 |

Aucune erreur JavaScript n'est signalée : un export peut donc être annoncé réussi tout en perdant du son. Les corrections des bus et du cache ne règlent pas cette suppression du graphe audio. Il faut isoler correctement le cycle de vie des moteurs pendant le rendu, puis vérifier plusieurs combinaisons de machines et leur alternance. Ce point doit passer avant l'ajout de nouvelles fonctions.

Les prises MIDI restent disponibles ; éviter de considérer le WAV de ce cas comme une copie fidèle. Ce diagnostic ne valide pas toutes les variantes d'export avec une seule machine.

## Points à confirmer sur les appareils et dans GitHub Actions

| Point | Observation | Vérification encore nécessaire |
|---|---|---|
| Compilation Android | Aucun SDK Android ni Gradle utilisable ici. | Lancer le workflow APK ; le résultat local n'est pas présenté comme une compilation Android réussie. |
| MIDI Windows | Les ouvertures/fermetures partent sur des tâches concurrentes, sans compteur de génération visible. Une ouverture lente pourrait aboutir après une fermeture ou une nouvelle demande. | Essai sous Windows avec périphériques réels, puis sérialisation ou garde de génération si confirmé. Aucun changement Rust non compilé dans cette livraison. |
| Signature des APK | Le workflow courant produit un APK debug sans restauration explicite d'une clé stable ; la configuration de publication possède un chemin séparé pour sa clé. | Comparer les certificats des APK réellement utilisés avant toute modification. Le check-up ne change aucune clé et ne démontre pas un échec de mise à jour sur le téléphone. |
| Appareil Samsung | Le navigateur local ne reproduit pas toute la WebView Android. | USB MIDI, micro, interruptions audio, verrouillage et lecture prolongée en arrière-plan à vérifier sur l'appareil. |
| Ouverture de projet interrompue | Le stockage de la page et les fichiers natifs ne partagent pas une transaction atomique. | La sauvegarde complète précède les changements et les erreurs retournées déclenchent une restauration, mais tuer l'application au milieu de l'opération reste un cas distinct. |
| Transfert Volca | Le paquet PC conserve Syro lorsqu'il est présent. | Compilation WebAssembly et transfert matériel non réalisés ici. |

## Fichiers et installation

L'archive `drm16_android_v176.zip` contient uniquement les fichiers nouveaux ou modifiés depuis la v175, sous `drm16_android/`. Elle inclut ce bilan, les sources, le HTML réassemblé, les tests, les workflows et les numéros de version Android/bureau.

Les principales corrections sont dans `page/js/030`, `130`, `140`, `210`, `280`, `300`, `310`, `340`, `490`, `520`, `550`, `570`, `580`, `590`, `600`, `610`, `620`, `630` et `635`. Le correctif natif concerne `Midi.java`. Le nouveau constructeur PC est `outils/paquet-pc.py`.

La suite des travaux recommandée est la réparation du rendu des prises MIDI avec plusieurs machines, puis les validations matérielles restantes. Aucun ajout de machine n'est nécessaire pour cette étape.
