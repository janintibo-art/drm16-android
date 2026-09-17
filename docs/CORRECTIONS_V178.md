# v178 — Connexions MIDI de la version Windows

Cette livraison poursuit le check-up v176 après la réparation des exports MIDI
en v177. Elle traite les commandes concurrentes de la coque native de bureau.

## Défaut

Chaque demande d'ouverture et de fermeture créait son propre thread. Une
connexion A lente pouvait terminer après une fermeture, ou remplacer une
connexion B demandée ensuite. La surveillance des débranchements pouvait
également fermer un appareil pendant une ouverture en cours.

## Correction

Une file commune reçoit les demandes dans leur ordre d'arrivée. Un seul worker
effectue les ouvertures, fermetures et relevés de branchement. La page peut
continuer à répondre pendant qu'un pilote attend. Les événements suivent cet
ordre : si A est déjà en cours d'ouverture, A peut être annoncée ouverte avant
la fermeture ou l'ouverture de B demandée ensuite ; l'état final respecte les
commandes reçues.

Chaque relevé vérifie également la présence de l'appareil ouvert. Un appareil
listé puis ouvert et retiré entre deux relevés est ainsi détecté, même s'il
n'apparaissait dans aucun des deux inventaires périodiques.

L'horloge passe par cette file pour ses départs et arrêts. Un départ reçu après
la fermeture est ignoré. Les impulsions de l'horloge restent sur leur thread
rapide, avec une vérification de génération au moment d'envoyer : un ancien
thread ne peut plus envoyer sur une nouvelle connexion.
Le tempo est mis à jour dès la demande : un ancien départ d'horloge en attente
d'un pilote ne peut pas écraser un réglage de tempo plus récent.

La fermeture des ports reste hors du verrou d'état, car le pilote peut attendre
la fin de son callback d'entrée. L'envoi des notes et du SysEx ne passe pas par
la file de connexion.

## Fichiers principaux

- `bureau/src-tauri/src/midi_commandes.rs` : file et traitement des commandes,
  partagés entre la production et les tests.
- `bureau/src-tauri/src/midi.rs` : opérations natives, surveillance et horloge.
- `bureau/src-tauri/src/hote.rs` et `main.rs` : raccordement de la file au pont.
- `outils/rust/test-midi-bureau.rs` : tests du vrai module MIDI avec ports et
  fenêtre simulés ; les pilotes Windows et Tauri n'y sont pas chargés.
- `outils/test-midi-bureau.py`, `outils/controles.sh` et les trois workflows :
  compilation et exécution bloquantes de ces tests, sans dépendances Cargo.

## Vérifications

Validation locale du 17 septembre 2026 :

- `bash outils/controles.sh` réussit jusqu'au message final, y compris les
  régressions JavaScript, la compilation Java simulée (54 fichiers), les tests
  fichiers/MIDI Android, l'assemblage exact de la page et l'intégrité du ZIP PC.
- `outils/test-midi-bureau.py` compile les modules Rust avec les interfaces
  simulées, d'abord sans `cfg(test)`, puis en mode test. Rust 1.75 : **11 tests
  réussis**, soit neuf tests de file, les règles d'envoi MIDI et un test
  d'intégration comportant les onze scénarios ci-dessous.
- Les trois workflows YAML, les versions Android/bureau et les espaces de fin
  de ligne ont été contrôlés.

| Scénario d'intégration | Résultat |
|---|---|
| A lente, puis fermeture | État final fermé, aucun port restant |
| A lente, puis B | État final B |
| A, fermeture, B | Événements et opérations dans cet ordre |
| Refus du pilote A, puis B | Échec A puis succès B, file toujours utilisable |
| Retrait A quand B est ouvert | B reste ouvert |
| Retrait B ouvert | Les deux ports B sont fermés |
| B branché, listé, ouvert puis retiré entre deux relevés | Une seule perte signalée, ports fermés |
| START, fermeture, START tardif | Horloge arrêtée |
| Ancienne impulsion après nouveau START sur B | Impulsion périmée refusée |
| START 125 en attente, puis tempo 150 | Tempo final 150 |
| Fermeture attendant un callback réentrant | Callback terminé, verrou d'état disponible |

Les canaux imposent l'ordre des opérations dans ces scénarios. La surveillance
du test d'intégration est déclenchée explicitement pour ne pas dépendre de la
vitesse du poste ; la minuterie périodique est vérifiée dans les tests de file.
Les tests dans un navigateur et le banc de mesures audio n'ont pas été relancés :
aucune source de page ni aucun asset audio ne change dans cette livraison.

## Limites

Un pilote bloqué indéfiniment bloque le traitement de la file : cette correction
ne force pas l'annulation d'un appel natif en cours. Les tests avec ports simulés
ne remplacent ni une compilation complète Tauri sous Windows ni un essai avec
une interface MIDI réelle. Le workflow « Exécutable Windows » conserve sa
compilation et l'autotest WebView2 ; un simple résultat vert du workflow APK
ne valide pas ces deux étapes Windows.

L'archive contient uniquement les fichiers nouveaux ou modifiés depuis la v177,
sous `drm16_android/`. Les versions Android et bureau passent à 178. Aucun
changement de moteur audio, de sauvegarde ou de façade n'est inclus.
