# v278 — Contrôle MIDI Windows : attente bornée, vérifications et rapports

## Périmètre de ce premier lot

On stabilise d'abord la validation de l'installateur Windows. Les nouveaux
modules et montages Eurorack seront traités ensuite, par petits lots.

Base vérifiée : v277, commit `f6b88a353069122ba0a031b65a6ad4d000158150`.
Exécution Windows examinée : `35737313360`, tâche `106778410722`.

## Ce que l'échec permet réellement de conclure

La compilation de `drm16.exe` et la création de l'installateur v277 ont réussi.
C'est l'essai de la vraie application dans WebView2 qui a renvoyé le code 1,
empêchant ensuite la mise à disposition de l'installateur.

Le port « Microsoft GS Wavetable Synth » était énuméré. Le test n'a reçu aucun
événement de connexion dans sa fenêtre de six secondes ; l'identifiant ouvert
côté Rust était encore `-1`. Le journal ne permet pas de distinguer avec
certitude une ouverture lente, un pilote bloqué ou un autre défaut natif.
Il ne faut donc pas qualifier sans réserve cet échec de « faux négatif ».

Un refus explicite du système était déjà distingué d'un succès dans le test
précédent. Cette possibilité est conservée, sans exception spéciale accordée
au nom Microsoft GS Wavetable Synth. Aucune réponse reste un échec.

## Changements

### 1. Attente et cohérence des confirmations

Le test attend jusqu'à 30 secondes pour l'ouverture et 10 secondes pour la
fermeture, avec une horloge monotone. Ces délais n'existent que dans le mode
`DRM16_AUTOTEST` ; ils ne ralentissent pas l'utilisation normale.

Une ouverture valide exige désormais :

- un événement `ouvert` pour le nom et l'identifiant demandés ;
- le même identifiant dans l'état de la page ;
- le même identifiant dans l'état natif Rust.

Un état ancien, un événement relatif à un autre port, un identifiant erroné
ou la seule présence d'un appareil dans la liste ne suffisent pas.
Une connexion déjà ouverte est fermée avant l'essai d'une nouvelle ouverture.
La fermeture après l'horloge est également confirmée par un événement et par
les deux états.

### 2. Erreurs toujours bloquantes et nettoyage

L'inventaire MIDI qui lève une exception n'est plus assimilé à une liste vide.
Les exceptions d'ouverture, d'envoi, de SysEx ou du gestionnaire d'événements
produisent un rapport d'échec au lieu de laisser une promesse sans suivi.
Un refus sans raison ou avec des états contradictoires est refusé.
Les contrôles de note, SysEx complet/incomplet et horloge sont conservés.

L'absence de périphérique, ou son refus explicite et cohérent par le système,
reste une situation NON CONCLUANTE : l'ouverture et l'envoi ne sont pas
présentés comme validés. Ce n'est pas une preuve de fonctionnement matériel.

Le gestionnaire d'événements d'origine est restauré après l'essai. Après une
ouverture demandée mais non suivie d'une fermeture confirmée, un arrêt et une
fermeture de sécurité sont demandés. La file native existante les ordonne
après l'ouverture : l'enfilage n'est pas présenté comme une fermeture prouvée.

### 3. Diagnostic conservé dans GitHub Actions

Le journal MIDI ajoute les temps écoulés, le nom du port, son identifiant,
la phase du test, les événements reçus et l'erreur transmise par le pilote.

Le lanceur PowerShell cible explicitement `drm16.exe`, retire l'ancien rapport,
attend au plus deux minutes et exige un rapport non vide ainsi qu'un code de
sortie zéro. Un rapport contenant une ligne `FAUX` reste bloquant, même si le
processus renvoyait zéro par erreur. Un test non terminé reste bloquant.

Le workflow Windows joint un nouvel artifact `rapport-autotest-windows` quand
les fichiers existent, que l'essai réussisse ou échoue. Il contient :

- `autotest.txt`, lorsqu'il a été écrit par l'application ;
- `autotest-lancement.txt`, avec le lancement, le délai, le code de sortie ou
  la raison de l'échec du lanceur.

Le déclenchement automatique sur chaque push à `main`, le lancement manuel,
les groupes de concurrence de la v277, les contrôles Rust et la compilation
Tauri sont conservés. Le fichier `drm16-windows/DRM16-installeur.exe` ne sera
mis à disposition qu'après un essai réussi. Aucun `continue-on-error` n'a été
ajouté sur ce test.

Le workflow de publication n'est pas modifié : il utilise la même page et
bénéficie du nouveau test MIDI, mais garde son lanceur historique. L'artifact
supplémentaire concerne ici le workflow « Exécutable Windows ».

## Les 10 fichiers livrés

1. `page/js/010-hote.js` : contrôle MIDI et finalisation du rapport ; partie
   normale du pont HOST inchangée.
2. `app/src/main/assets/drm16.html` : remplacement exact de cette source dans
   la page assemblée ; le reste du fichier est inchangé.
3. `outils/test-autotest-midi.cjs` : 35 scénarios sur le code réel du test,
   avec horloge et réponses natives simulées, sans dépendance npm.
4. `outils/controles.sh` : ajout de ce test aux contrôles communs, avant les
   compilations APK et Windows ; les autres commandes restent identiques.
5. `outils/essai-windows.ps1` : lanceur de la vraie application et diagnostic.
6. `.github/workflows/windows.yml` : appel du lanceur et artifact des rapports.
7. `app/build.gradle` : version Android 278.
8. `bureau/src-tauri/Cargo.toml` : version Windows 278.0.0.
9. `bureau/src-tauri/tauri.conf.json` : version Windows 278.0.0.
10. `docs/CORRECTIONS_V278.md` : ce relevé et l'ordre de la suite.

## Vérifications réellement effectuées avant livraison

- Test Node : les 35 scénarios passent. Ils incluent ouvertures à 8 et 24
  secondes, événement retardé, fermeture lente, absence de réponse, état
  périmé, mauvais port, mauvais identifiant, refus avec/sans raison,
  exceptions, erreurs d'envoi et restauration du gestionnaire.
- Reprise du code v277 avec le même port simulé : une ouverture à 10 ms passe,
  la même réponse à 8 secondes échoue à 6 050 ms, sans demande de fermeture.
  Le nouveau code accepte la réponse à 8 secondes et confirme la fermeture.
  Cela reproduit un cas de lenteur, pas la cause matérielle du runner GitHub.
- Suite existante `test-ensembles-eurorack.py` : 724 vérifications, zéro erreur,
  dans cinq formats de 320 x 568 à 1920 x 1080. Les huit ensembles ont aussi
  été rendus en audio hors ligne. Ces contrôles utilisent Chromium et un
  stockage temporaire simulé ; ils ne constituent pas une écoute humaine.
- Syntaxe Node des trois scripts de la page assemblée, syntaxe Bash du
  fichier de contrôles, lecture du YAML et cohérence des versions vérifiées.
- Comparaison inverse : remplacer le nouveau bloc HOST par l'ancien restitue
  exactement toute la page v277. Le pont utilisé hors autotest est identique.
- Le nouveau test est inactif hors mode autotest sur Windows et en mode
  navigateur ; ces deux parcours ont été contrôlés.

Non exécutés ici : PowerShell sous Windows, compilation Rust/Tauri, compilation
APK et essai MIDI matériel. Leur validation reste à faire sur GitHub et sur le
PC. Si le pilote reste muet au-delà de 30 secondes, la compilation sera toujours
signalée en échec : le nouveau rapport devra alors servir à poursuivre le
diagnostic, sans publier un exécutable faussement validé.

## Éléments non modifiés

Aucun traitement audio, commande MIDI native Rust, module Eurorack, montage,
motif, format de sauvegarde, son personnel, accès Freesound ou interface de
jeu n'a été changé. Les huit ensembles de la v276 sont conservés.

## Suite Eurorack : éviter les doublons

L'inventaire exécuté sur cette base retrouve 103 types de modules et 32
montages. Plusieurs idées de la proposition précédente existent déjà :
`QUANT`, `CLK DIV`, `CLK MULT`, `S & H`, `LOGIC`, `ATTENUV`, `SWITCH`,
`TRIG 4`, `SEQ 16`, `ECHO` et `REVERB` notamment.

L'ordre proposé après la validation Windows est donc : enrichir d'abord les
séquenceurs et les possibilités de variation réellement manquantes ; ajouter
ensuite des montages complets avec batterie, basse, mélodie et accompagnement ;
puis améliorer le pilotage des parties et la lisibilité des grands racks.
Le détail des nouveaux modules sera établi à partir de leurs fonctions
existantes, plutôt que d'ajouter des copies portant seulement un autre nom.

## Application

Cette archive est un correctif de sources pour la v277, pas un installateur.
Le script habituel Termux l'applique et l'envoie. Une nouvelle compilation APK
et une nouvelle compilation Windows démarrent automatiquement. Pour le PC,
après succès du workflow Windows, récupérer le nouvel artifact `drm16-windows`,
extraire son ZIP et lancer `DRM16-installeur.exe` avec l'application fermée.
