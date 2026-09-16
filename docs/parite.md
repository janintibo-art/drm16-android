# Parité Android / Windows

Tenue à jour à chaque version touchant le pont (v147). La colonne « Vérifié par » dit **où** la
parité est prouvée ; ce qui n'est vérifié qu'à la main est marqué comme tel.

Contrôle automatique : `verifier-hote.py` échoue si une fonction du pont Android n'est pas servie par
`bureau/src-tauri/src/hote.rs`, sauf les exceptions listées ici (`EXCEPTIONS_BUREAU`).

## Fonctions du pont

| Fonction | Android (Java) | Windows (Rust) | Vérifié par |
|---|---|---|---|
| `fichierSauver` `fichierOuvrir` `fichierAjouter` `fichierFermer` | `MainActivity` | `fichiers.rs` | autotest exe (3 Mo en morceaux) · test navigateur 4 |
| `fichierListe` `fichierCharger` `fichierSupprimer` `fichierDossier` | `MainActivity` | `fichiers.rs` | autotest exe |
| `echSauver` `echCharger` `echListe` `echSupprimer` `echDossier` | `MainActivity` | `fichiers.rs` | autotest exe |
| remplacement sans perte, `.bak` | `Fichiers.java` | `fichiers.rs` | `TestFichiers` (JDK) · Rust relu à la main |
| plafonds 8 / 64 / 32 / 16 Mo | `MainActivity` | `fichiers.rs` | autotest exe (projet 16 Mo) · lecture du code |
| `netCharger` → `__net` | `MainActivity` | `reseau.rs` | autotest exe (http refusé, archive.org, plafond) |
| `midiDispo` `midiListe` `midiAppareils` `midiOuvertId` | `Midi.java` | `midi.rs` | autotest exe |
| `midiOuvrir` `midiOuvrirId` `midiFermer` → `__midiEtat` | `Midi.java` (fil UI) | `midi.rs` (fil à part) | test navigateur 5 et 8 · exe : **refus du système transmis** (pas de carte son sur l'exécuteur) |
| `midiEnvoyer` `midiSysex` (règles d'envoi) | `MidiOctets.java` | `midi.rs` (`longueur`, `sysex_complet`) | `TestMidi` (JDK) · tests Rust du module (non lancés en CI) |
| `midiHorloge` `midiTempo` | `Midi.java` | `midi.rs` + `timeBeginPeriod(1)` | **à la main, avec une vraie carte** |
| réception `__midi` `__midiSysex` | `Midi.java` | `midi.rs` | **à la main, avec une vraie carte** |
| branchement à chaud | `DeviceCallback` | relecture toutes les 1,5 s | test navigateur 5 (simulé) · **à la main** |
| `playing` (écran allumé pendant la lecture) | `MainActivity` | sans objet (rendu `null`) | — |
| **`micro`** (autorisation) | `MainActivity` | **exception** : WebView2 fournit `getUserMedia`, Windows demande l'autorisation | autotest exe (API présentes) · **enregistrement à la main** |

## Propre à une plateforme

| Fonction | Android | Windows |
|---|---|---|
| plein écran (F11) | non | `pleinEcran` → `fenetre.rs` |
| lecture en arrière-plan, notification | `PlaybackService` | sans objet (la fenêtre reste ouverte) |
| retour haptique | oui | sans objet |
| clavier, molette, glisser-déposer | inactifs sans clavier ni souris | test navigateur 11 · **glisser-déposer à la main** |
| transfert volca (Syro) | oui | oui (`preparer.sh`) |

## Sécurité

| Point | Android | Windows |
|---|---|---|
| pages distantes | bloquées (`shouldOverrideUrlLoading`, `shouldInterceptRequest`) | politique de sécurité : aucune connexion hors `self` et `drm16` |
| liens externes | bloqués, **signalés** (v147) | bloqués, **signalés** (v147) |
| téléchargements | https seulement, par le pont | https seulement, par le pont |
| politique de sécurité (CSP) | sans objet (WebView sur fichiers locaux) | `tauri.conf.json` — vérifiée par le test navigateur 8 (page servie comme par Tauri) |
| capacités Tauri | — | **aucune** : la page n'utilise pas l'IPC de Tauri, seulement le protocole `drm16` |

`'unsafe-inline'` est nécessaire (script unique de la page, gestionnaires `onclick` du studio) et
`'unsafe-eval'` sert aux extensions du studio (`new Function`). Tauri n'ajoute donc pas d'empreintes
aux directives `script-src` et `style-src` (`dangerousDisableAssetCspModification`), sans quoi
`'unsafe-inline'` serait ignoré.

## Reste à essayer sur un vrai PC

Carte USB-MIDI (ouverture, jeu, horloge, SysEx), micro, glisser-déposer d'un fichier réel, F11,
ouverture d'un projet venu d'Android.
