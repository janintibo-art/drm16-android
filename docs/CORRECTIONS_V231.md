# v231 — Enregistrement des effets dans les motifs du PO-33 K.O!

La v231 complète les seize effets live de la v229 : lorsque le mode d’écriture
de la façade — bouton **RECORD** — est actif et que le motif joue, maintenir le
bouton **FX** écrit l'effet sélectionné sur chaque pas traversé. Le comportement
audio suit le guide du PO-33 physique, où ce mode est nommé WRITE : les pads 1
à 15 enregistrent leur effet, tandis que le pad 16 **SANS EFFET** efface
l'automatisation sur la plage tenue.

## Lecture et priorité

Chaque motif possède maintenant deux tableaux de seize valeurs :

- `fx` contient l'effet écrit sur chaque pas (`-1` lorsqu'il n'y en a pas) ;
- `fxOrigines` conserve le premier pas du geste pour que BOUCLE, 6/8 et
  REDÉMARRAGE restent cohérents, même si l'appui traverse la fin du motif.

À la lecture, l'effet écrit est appliqué automatiquement. Un effet maintenu en
direct garde la priorité. Maintenir **SANS EFFET** permet donc d'entendre
provisoirement le motif sans son automatisation ; avec **RECORD** actif sur
cette façade, cette même action l'efface sur les pas traversés.

## Sauvegarde et compatibilité

Les effets écrits sont intégrés à la sauvegarde du PO-33 et aux projets. Les
anciennes sauvegardes ne contiennent pas ces tableaux : elles sont migrées vers
seize pas neutres sans modifier les sons, notes CHROMA, Parameter Locks, swing
ou motifs existants. L'effacement complet d'un motif remet également à zéro
les effets et leurs origines.

La sauvegarde n'est effectuée qu'au relâchement de FX ou à l'arrêt du transport,
afin d'éviter une écriture de stockage à chaque double croche.

## Validation locale

- test Node des effets écrits, de leur origine, de la priorité live et du pad
  SANS EFFET ;
- test de migration des anciennes sauvegardes ;
- test navigateur du geste RECORD + FX sur plusieurs pas et de l'effacement ;
- contrôle de la remise à zéro avec l'effacement complet du motif ;
- syntaxe JavaScript et cohérence exacte entre les sources `page/` et le HTML
  Android assemblé ;
- numéros Android et Windows alignés sur 231.

Le workflow GitHub effectue ensuite le contrôle complet dans Chromium, les
mesures sonores et la compilation de l'APK.

Appliquer après validation verte de la v230.
