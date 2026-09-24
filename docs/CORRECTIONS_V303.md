# Corrections v303 — diagnostic intégré DRM16

La v303 transforme l'ancien panneau **ÉTAT DU SON** en un **DIAGNOSTIC DRM16** utilisable directement sur le téléphone ou dans l'application Windows. Le moteur audio et les machines ne sont pas modifiés : cette version ajoute uniquement des observations et des tests à la demande.

## Ce que montre le panneau

Le panneau conserve le relevé audio détaillé existant : fréquence d'échantillonnage, état du contexte, latence de sortie, temps de jeu, pic de sources, pause maximale de l'ordonnanceur, recalages et relances du moteur.

Il ajoute trois groupes :

- **SYSTÈME** : version DRM16, plateforme (Android / bureau / navigateur), mémoire locale et erreurs JavaScript capturées depuis l'ouverture ;
- **APPLICATION** : état du moteur audio, test du stockage natif et test HTTPS ;
- **MATÉRIEL** : disponibilité MIDI et test du microphone.

Les lignes utilisent cinq états lisibles : **OK**, **INFO**, **À TESTER**, **À VÉRIFIER** et **ERREUR**. Le résumé ne traite jamais l'absence de réseau, de MIDI ou de micro comme un défaut essentiel : DRM16 doit rester utilisable hors ligne et sans périphérique.

## Test de stockage sans risque

Le bouton STOCKAGE fabrique un nom temporaire unique du type `drm16_diag_v303_....tmp`, écrit quelques octets par le même pont que les projets, les relit à l'identique, puis supprime le fichier.

- aucun fichier utilisateur existant n'est ciblé ;
- le contenu relu doit être identique au contenu écrit ;
- la suppression doit réussir ;
- en cas d'erreur après création, une seconde tentative de suppression est faite dans le nettoyage.

La mémoire locale du WebView (`localStorage`) est testée séparément avec une clé éphémère immédiatement effacée.

## Réseau

Le test RÉSEAU utilise le pont HTTPS déjà employé par la collection archive.org et demande uniquement `https://archive.org/robots.txt`, plafonné à 256 ko. Un échec est affiché **À VÉRIFIER**, pas **ERREUR**, parce qu'un téléphone peut volontairement être hors ligne.

## MIDI

Le diagnostic ne change jamais la connexion MIDI. Il demande seulement :

- si l'API MIDI est disponible ;
- combien d'appareils sont actuellement détectés ;
- si une connexion est déjà ouverte.

Aucun `midiOuvrir`, `midiOuvrirId` ou envoi de note n'est déclenché par ce panneau.

## Microphone

Le test MICRO est lancé uniquement après une action explicite de l'utilisateur (`MICRO` ou `TESTER TOUT`). Sur Android, le pont natif demande l'autorisation si nécessaire. Une fois le flux ouvert, toutes les pistes sont immédiatement arrêtées : aucun enregistrement n'est conservé.

## Copier le rapport

**COPIER RAPPORT** produit un texte compact contenant les états du diagnostic et le relevé audio. Il n'inclut pas les chemins absolus des dossiers ni le contenu des projets. Le presse-papiers moderne est utilisé en priorité, avec un repli pour les WebView qui ne l'autorisent pas.

Le but est de pouvoir coller directement ce rapport dans une discussion de dépannage sans devoir chercher chaque information à la main.

## Tests automatiques

`outils/test-diagnostic-v303.py` vérifie notamment :

- la présence de toutes les lignes et fonctions du diagnostic ;
- l'unicité et la suppression du fichier temporaire ;
- la relecture du stockage ;
- le caractère facultatif du réseau ;
- l'arrêt immédiat des pistes micro ;
- l'absence d'ouverture MIDI ;
- l'absence de `innerHTML` dans le bloc de diagnostic ;
- la présence du diagnostic dans le `drm16.html` assemblé.

`outils/controles.sh` lance ce contrôle avec les vérifications JavaScript existantes. Le chargement réel de la page reste couvert par `outils/test-navigateur.py` dans GitHub Actions.

## Version

- Android : `versionCode 303`, `versionName '303'`.
- Tauri / Windows : `303.0.0`.
