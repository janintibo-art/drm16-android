# v177 — Export WAV des prises MIDI avec plusieurs machines

## Correction

Le check-up v176 avait reproduit une perte de notes : une note MC à 0 seconde devenait muette dès qu'une DRM16 jouait sur un autre canal à 1 seconde. Le changement de machine arrêtait ou débranchait des voix déjà programmées, avant leur calcul hors ligne. Aucun message d'erreur ne révélait cette perte.

La v177 regroupe les notes par machine et termine chaque rendu avant de passer au suivant. Elle additionne les sons en stéréo, puis applique une seule fois la chaîne de sortie complète : volume général, filtre subsonique, compensation, limiteur et garde finale. Les effets, niveaux, panoramiques et égaliseurs de chaque machine restent dans leur rendu.

Les variantes restent distinctes : une TR-808 et une TR-909 ne partagent plus leur état pendant le calcul du WAV. La machine affichée et les variantes secondaires de la table sont rétablies au retour.

## Utilisation

Utiliser le bouton WAV de la prise MIDI comme auparavant. Le rendu indique sa progression par machine. Le jeu et les relectures sont arrêtés ; les commandes et les nouvelles notes MIDI restent suspendues pendant le calcul, puis redeviennent disponibles. Si une nouvelle prise est en cours d'enregistrement, il faut la terminer avant son export.

Les sons personnels sont chargés avant le rendu. Une référence à un son absent ou illisible provoque un échec explicite, sans publier de WAV incomplet. Un emplacement volontairement vide reste autorisé.

## Vérifications

Le nouveau test produit 17 exports complets dans Chromium avec le vrai moteur Web Audio et provoque deux échecs de chargement contrôlés. Le pont fichiers/MIDI est simulé ; les instruments, les effets, le décodage des sons et le WAV sont réels.

| Essai | Résultat |
|---|---|
| MC seule puis même note suivie d'une DRM16 | Première note conservée : crête 0,3650 et niveau efficace 0,01944 dans les deux cas. |
| MC → DRM16 → MC | Les trois fenêtres sonores retrouvent le niveau des références séparées. |
| Deux notes simultanées, ordre inversé | Même résultat sonore, indépendant de l'ordre des événements. |
| Mélange à faible niveau | Écart relatif inférieur à 0,2 % avec la somme des WAV séparés, conversion PCM16 comprise. |
| Panoramiques opposées | Chaque machine reste dans le canal attendu. |
| Coupe-son et solo de l'enregistreur | Seules les notes autorisées entrent dans le WAV. |
| Forte charge simultanée | Crête mesurée 0,96298, sous le plafond de −0,1 dBFS. |
| Exports successifs et reprise du jeu | Contexte audio, sorties et réglages rétablis ; son réel mesuré après retour. |
| TR-808 secondaire, exports TR-909 puis TR-808 | Variante, motif de 12 pas, tempo, shuffle et égaliseur conservés ; la table rejoue du son. |
| Clavier, entrée MIDI et arrêt natif pendant le rendu | Pas de modification des voix calculées ; commandes rétablies ensuite. |
| Son personnel chargé à froid | Vrai WAV décodé avec délai imposé de 50 ms ; SmplTrek et DRM16 restent audibles ensemble. |
| Son personnel absent ou illisible | Aucun WAV publié ; erreur explicite, interface et contexte de jeu rétablis. |
| Échecs de création du contexte, deuxième rendu, conversion ou écriture | Aucun faux succès ; état et interface restaurés, export suivant possible. |

La suite complète `outils/controles.sh` et les tests généraux du navigateur vérifient aussi les 29 machines, les sauvegardes, les scènes et la capture Kaoss. Le nouveau test `outils/test-export-midi.py` est désormais lancé dans les workflows APK et Publication, après le test navigateur existant.

## Fichiers concernés

- `page/js/600-rendre-une-prise-midi-en-wav.js` : rendus isolés, mélange final, chargement des sons, restauration et erreurs.
- `page/js/310-midi.js` : cible de note figée pour le rendu et réception MIDI suspendue pendant les calculs.
- `page/js/130-decalage-humain.js` : l'arrêt demandé par Android ne débranche pas un rendu hors ligne.
- `page/js/030-memoire.js` : les activations temporaires ne remplacent pas la machine mémorisée au démarrage.
- `page/js/550-export-audio.js` : refus d'un export concurrent avec le calcul des formes d'onde.
- `outils/test-export-midi.py`, `outils/test-transport.cjs`, `outils/test-mc.cjs` et les deux workflows : régressions et intégration aux contrôles.
- HTML réassemblé, versions Android/bureau portées à 177 et documentation mise à jour.

Le plafond existant de 64 Mio pour le WAV et la queue de trois secondes sont conservés. Le temps de calcul augmente avec le nombre de machines ; les buffers intermédiaires sont traités un par un. Les performances maximales sur le téléphone ne sont pas mesurées ici. La compilation APK reste vérifiée par GitHub Actions après application de cette mise à jour.
