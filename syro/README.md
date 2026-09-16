# Transfert vers une vraie volca sample

La volca ne reçoit pas de fichiers : elle reçoit **du son** par sa prise SYNC IN.
Le format de ce son, le *Syro*, est fourni par Korg sous forme de code C.

## Le code de Korg n'est pas ici, et ne doit pas y être

Sa licence ne permet pas de le redistribuer. Il est **cloné au moment de la
compilation** par le workflow, jamais versionné, jamais commité :

    https://github.com/korginc/volcasample

C'est la même règle que dans le projet MOC'TA BASS, d'où vient `syro_wrap.c`.

## Un code figé

Le dépôt de Korg est pris sur **un commit précis**, inscrit dans `korg-commit.txt`,
et vérifié avant compilation : le même commit DRM16 donne toujours le même Syro.
Tant qu'aucun commit n'y est inscrit, la compilation prend l'état courant et
affiche dans le journal et le résumé du run :

    COMMIT KORG : <commit> (NON FIGE)

C'est ce commit qu'il faut inscrire dans `korg-commit.txt`. Le compilateur
Emscripten est lui aussi figé (3.1.64) dans les workflows.

## Ce que fait `syro_wrap.c`

Le SDK rend **une trame à la fois**. Appeler ça depuis JavaScript ferait des
millions d'allers-retours pour un seul transfert. Cet enrobage boucle en C et
rend le flux complet en un appel :

    volcagain_render(items, count, &sortie, &trames)   /* int16 stéréo entrelacé */
    volcagain_free(p)

## Comment il arrive dans l'application

Le workflow le compile en **WebAssembly** avec Emscripten et dépose
`syro.js` + `syro.wasm` dans `app/src/main/assets/syro/`.

**Si cette compilation échoue, rien ne casse** : l'étape est en
`continue-on-error`, l'APK se construit quand même, et l'application signale
simplement que le transfert n'est pas disponible dans cette version.

## Brancher

1. Câble jack 3,5 mm de la sortie casque vers **SYNC IN** de la volca
2. Volume de l'appareil à fond
3. Aucun égaliseur, aucune normalisation système, pas de Bluetooth
4. Lancer, et ne plus toucher à rien jusqu'à la fin
