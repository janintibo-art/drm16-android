# v242 — FX RELEASE sur le KAOSS PAD

L'analyse de fidélité v122 plaçait le KAOSS PAD en priorité « très haute » et
citait « Auto BPM/Tap Tempo et FX Release ». TAP BPM existe depuis. FX RELEASE
manquait : au lever du doigt, l'**écho** et la **réverbération** étaient coupés
net, sans queue. Sur le KP3, FX RELEASE laisse ces effets finir de sonner.

## Utilisation

Un bouton **FX RELEASE** à côté de HOLD et MUTE :

- **éteint** (par défaut, comportement d'avant) : l'effet s'arrête avec le
  doigt ;
- **allumé**, avec ÉCHO ou RÉVERBÉRATION : au lever du doigt, plus rien
  n'entre dans l'effet, mais ce qui y est déjà finit de sonner. Les répétitions
  de l'écho s'éteignent d'elles-mêmes, la réverbération retombe ;
- les autres effets (filtres, hachoir, anneau, réduction, vitesse) n'ont pas de
  queue et s'arrêtent toujours avec le doigt ;
- retoucher le pavé pendant une queue reprend l'effet aussitôt. Changer
  d'effet pendant une queue l'arrête net. HOLD reste prioritaire.

## Fonctionnement

`page/js/570-korg-kaoss-pad.js` :

- deux **envois** `denv` et `venv` sont placés entre le hachoir et l'écho, et
  entre le hachoir et la réverbération. FX RELEASE ferme l'envoi et laisse
  ouverts le retour et la réinjection, avec les réglages que le doigt avait
  laissés ;
- `dureeQueueKp()` : pour l'écho, le temps que les répétitions tombent à
  −60 dB (réinjection^n = 0,001), entre 0,3 et 12 s. Pour la réverbération,
  2 s (sa réponse dure 1,8 s). À la fin, l'effet revient à neutre et l'envoi se
  rouvre ;
- `appliquerKp()` retient l'effet joué juste avant (`dernierActif`) et annule
  la fin programmée dès qu'on retouche ou qu'on change d'effet.

`page/js/590-smpltrek-dix-pistes.js` (façade du KAOSS PAD) : bouton, voyant et
message. `page/html/180-unit-kp.html` : bouton `kp-release`.
`page/html/380-note-kp.html` : la notice explique FX RELEASE.

FX RELEASE est gardé dans `memoire.kp.release`, donc aussi dans les projets.
Les anciennes sauvegardes ouvrent avec FX RELEASE éteint.

## Validation locale

- essai d'écoute réel dans Chromium (une impulsion courte, effet poussé,
  doigt levé 120 ms après) :

  | | 0 à 0,5 s après le doigt | après la queue |
  |---|---:|---:|
  | écho, FX RELEASE éteint | silence | silence |
  | écho, FX RELEASE allumé | **−5,7 dB** | silence |
  | réverbération éteint | silence | silence |
  | réverbération allumé | **−33 → −42 dB** (retombe) | silence |

  Retoucher pendant la queue : fin annulée, envoi rouvert, écho à nouveau
  mixé ;
- nouveau test `outils/test-kp-release.cjs`, ajouté à `outils/controles.sh`.
  Il vérifie : arrêt net sans RELEASE ; écho avec envoi fermé, retour et
  réinjection gardés, fin au bon moment puis retour à neutre ; réverbération en
  2 s ; retouche ; changement d'effet ; effets sans queue inchangés ; HOLD ;
  bornes de durée ; mémoire ;
- `test-kp.cjs`, `test-kp-resample.cjs` et `test-restauration-machines.cjs`
  passent toujours ;
- `bash outils/controles.sh` : **tous les contrôles passent** ;
- `test-navigateur.py` (29 machines, trois formats, sans débordement avec le
  bouton de plus) : **tout est bon**.

Note : un premier passage du test navigateur a donné un échec sur le bloc 14
(« un gain existant rejoint sa cible en douceur (0.49 puis 0.000) »). Ce bloc ne
touche pas au KAOSS PAD : il lit un gain au moment exact où le moteur audio le
calcule. Relancé seul 15 fois sur la v242 et 15 fois sur la v241, il est passé
à chaque fois, et le passage complet suivant est tout bon. C'est un échec
aléatoire quand la machine est chargée. Si GitHub Actions le rencontre,
relancer le run suffit.

À essayer sur le téléphone : KAOSS PAD, une banque en marche, EFFET sur ÉCHO,
FX RELEASE allumé. Toucher le pavé puis lever le doigt : les échos doivent
continuer et s'éteindre d'eux-mêmes.

Version : Android `242`, Windows/Tauri `242.0.0`. Appliquer après la v241.
