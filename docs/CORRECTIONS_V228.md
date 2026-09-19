# v228 — Swing du PO-33 K.O!

Le PO-33 dispose maintenant d’un curseur **SWING** directement sous les pads.
La plage va de **50 %** (rythme droit) à **75 %** (groove très marqué). Le
second pas de chaque paire est retardé, sans déplacer le premier ; le témoin de
lecture et les effets d’ordonnancement utilisent le même temps décalé. Le
réglage reste disponible pendant PLAY pour permettre une écoute immédiate.

La valeur est sauvegardée avec la machine. Les anciens projets, qui ne
contiennent pas ce champ, sont migrés automatiquement à 50 %. Le réglage est
normalisé à la lecture pour qu’une sauvegarde invalide ne puisse pas sortir de
la plage prévue.

## Correction liée au clavier CHROMA

Une hauteur CHROMA pouvait rester cachée après une écriture SOUND normale ou
après l’effacement complet du motif. Si le même pas était réutilisé, cette
ancienne hauteur pouvait alors être rejouée. Une écriture SOUND efface désormais
la hauteur CHROMA correspondante, et WRITE nettoie toute la matrice de notes en
plus des pas et des Parameter Locks.

## Fichiers

Moteur et façade PO-33, style, notice, tests Node/navigateur, restauration, HTML
assemblé et versions Android/bureau.

## Validation locale

- Test Node validé : bornes 50–75 %, décalage des pas pairs, témoin de lecture,
  sauvegarde/migration, CHROMA, Parameter Locks et ROULEMENT.
- Restauration validée : anciens projets PO-33 à 50 %, sans régression sur le
  SmplTrek, les MPC et la DMX.
- Test navigateur ciblé validé dans Chromium : curseur, sauvegarde, réglage
  pendant PLAY et nettoyage des anciennes hauteurs CHROMA.
- Syntaxes JavaScript et Python, cohérence entre sources et HTML assemblé
  validées. Le contrôle navigateur complet et la compilation APK restent confiés
  à GitHub Actions après application du correctif.

Appliquer après validation verte de la v227.
