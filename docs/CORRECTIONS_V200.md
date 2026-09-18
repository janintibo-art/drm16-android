# v200 — reprise du séquenceur après un retard

## Relevé transmis depuis la v198

48 kHz, contexte running, latence de base affichée 21 ms, environ cinq minutes
comptabilisées, pic de 124 sources dont 23 futures, pause maximale 3614 ms,
deux pauses au-dessus de 150 ms, deux recalages et une relance.
Ces compteurs ne prouvent ni une saturation audio ni la cause de la pause.
La relance peut notamment provenir d'une action manuelle ou du garde-fou.

## Problème identifié dans le code

Le transport interne ne se recalait qu'au-delà de 400 ms de retard. Avant ce
seuil, plusieurs pas échus pouvaient être programmés presque au même instant,
car chaque date passée était ramenée à maintenant + 5 ms : rafale de rattrapage.

## Correction

- Recalage dès que le prochain pas est en retard de plus de 40 ms, ou d'un
  demi-pas si celui-ci est plus court. La tolérance évite de recaler pour 10 ms.
- Reprise au prochain pas non programmé avec une marge de 80 ms. Les pas ne
  sont plus comprimés pour rattraper le temps perdu ; la phase temporelle est
  donc décalée après l'incident. L'ordre des pas et les longueurs du SET restent conservés.
- Pas de nouvelles notes planifiées tant que le contexte n'est pas running.
  Le réveil existant continue de tenter la reprise. La mesure de pause est
  remise à zéro pendant cette suspension explicite.
- Le relevé nomme désormais ces événements RECALAGES : c'est ce que le code
  mesure, pas une détection directe des coupures dans le signal audio.
  Les nombres ne sont donc pas directement comparables aux versions antérieures,
  dont le seuil était de 400 ms.

Cette correction ne supprime pas un blocage Android de plusieurs secondes.
Elle améliore la reprise après un retard. Le transport MIDI esclave n'est pas
modifié ; il reste piloté par les tics externes.

## Fichiers

page/js/130-decalage-humain.js : transport et suspension.
page/js/190-reglages-de-la-notice.js : libellé du compteur.
app/src/main/assets/drm16.html : page régénérée.
outils/test-transport.cjs : régressions de reprise.
Versions Android et bureau : 200.

## Validation

Tests à 120 et 300 BPM avec retard de 250 ms : pas distincts, espacement nominal,
conservation du prochain index et un seul recalage. Suspension : aucune nouvelle
note ni progression ; reprise : recalage. Petit retard de 10 ms toléré.
Contrôles du projet et tests navigateur TR-1000 exécutés avant livraison.
La compilation APK reste à effectuer par GitHub Actions.

Après installation, refaire un essai de quelques minutes au premier plan avec
la même machine et indiquer les éventuelles coupures entendues avec le relevé.
Archive différentielle après v199. Laisser finir sa compilation avant d'envoyer v200.
