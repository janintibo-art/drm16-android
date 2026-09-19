# v230 — Correctif du contrôle de charge audio

La compilation GitHub de la v229 s'arrêtait avant les tests navigateur et avant
la création de l'APK, à l'étape **Charge : aucune voie ne sature**.

Le message était :

```text
scheduleKo -> jouerVoixFxKo : voix branchee sans pasVoie
```

## Cause

Il ne s'agissait pas d'une voix réellement mal branchée. La nouvelle fonction
`jouerVoixFxKo()` de la v229 est un routeur : elle choisit unison, octave,
reverse ou lecture normale, puis délègue toujours la création des noeuds audio à
`voixKo()`.

`voixKo()` se branche déjà correctement avec `pasVoie(n.e)`, et le nombre réel
de voix est renvoyé à `scheduleKo()` afin que `attenuerVoie()` protège le mixage.
Le contrôle statique connaissait les anciens routeurs de la TR, mais pas encore
ce nouveau routeur du PO-33 ; il produisait donc un faux positif.

## Correction

`verifier-charge.py` déclare maintenant explicitement la délégation :

```text
jouerVoixFxKo -> voixKo
```

La protection audio n'est ni désactivée ni contournée. Le contrôle continue à
vérifier la fonction qui crée réellement les voix et confirme que son branchement
passe par `pasVoie`.

## Version

- Android : `versionCode 230`, `versionName 230` ;
- Windows/Tauri : `230.0.0`.

Aucun motif, sample, réglage, Parameter Lock, note CHROMA, swing ou effet de la
v229 n'est modifié.

## Validation locale

- reproduction du défaut avec le contrôle de la v229 ;
- contrôle de charge relancé avec la correction : **0 problème** ;
- test Node du PO-33 v229 : **réussi** ;
- compilation syntaxique Python : **réussie** ;
- cohérence des trois numéros de version : **réussie**.

Après application de cette archive, il faut créer un nouveau commit v230. Relancer
simplement l'ancien job v229 ne peut pas corriger son contenu.
