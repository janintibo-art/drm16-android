# v202 — TR-1000 : mute par instrument et par motif

Sélectionner un instrument, puis appuyer sur MUTE. Le pad porte OFF et une
bordure orangée. RÉACTIVER remet sa séquence en lecture, même pendant PLAY.
Aucun pas ni réglage rythmique n'est effacé.

## Comportement

- Dix états indépendants, sauvegardés dans chaque motif.
- COPIER/COLLER inclut ces états et produit des copies indépendantes.
- Le séquenceur, ses sous-pas, FILL, les notes MIDI qu'il émet et le WAV respectent le mute.
- Les pads directs et les notes reçues restent audibles pour jouer par-dessus.
- Les sons déjà lancés et les coups déjà programmés finissent normalement.
  Le changement peut donc prendre le délai d'anticipation du séquenceur.
- Anciens projets : tous les instruments sont actifs. Seul le booléen true est
  chargé comme mute ; les valeurs invalides sont ignorées.

## Fichiers

page/js/480-roland-tr-1000.js : moteur, mémoire, copie et interface.
page/html/140-unit-t1k.html et page/css/140-roland-tr-1000.css : bouton et repères.
page/html/430-note-t1k.html : notice.
app/src/main/assets/drm16.html : page régénérée.
outils/test-t1k.cjs et outils/test-t1k-navigateur.py : validation.
Versions Android et bureau : 202.

## Validation

Tests Node : indépendance, pas conservés, frappe directe, FILL, mémoire sans alias,
migration et réactivation en lecture. Test de copie complète incluant un mute.
Tests navigateur : bouton et repère OFF, rechargement, WAV silencieux puis audible,
réactivation en cours de lecture. Contrôles du projet exécutés avant livraison.
Compilation APK à effectuer par GitHub Actions.

Archive différentielle après v201. Attendre sa compilation avant envoi.
