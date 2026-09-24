# Corrections v301 — publication GitHub verrouillée

La v301 est une version de fiabilisation de la chaîne GitHub. Elle ne change ni le moteur audio, ni les machines,
ni l'Eurorack. Son but est qu'une version publiée soit au moins aussi contrôlée qu'un APK ordinaire et qu'une
mauvaise signature Android ne puisse jamais devenir une Release par accident.

## 1. Une Release sans clé stable est désormais impossible

Jusqu'à la v300, `app/build.gradle` gardait volontairement un repli vers la clé Android de debug lorsque
`KEYSTORE_FILE` n'était pas présent. Ce comportement reste utile pour une compilation locale ou un build de
contrôle, mais `publication.yml` pouvait lui aussi profiter de ce repli si le secret GitHub de signature avait
disparu.

En v301, le workflow Publication exige avant les tests les quatre secrets :

- `KEYSTORE_BASE64` ;
- `KEYSTORE_PASSWORD` ;
- `KEY_ALIAS` ;
- `KEY_PASSWORD`.

S'il en manque un seul, la publication s'arrête immédiatement. Le magasin Base64 doit en plus se décoder en un
fichier non vide, puis `keytool` vérifie réellement le mot de passe et l'alias avant de lancer les tests.

Après `assembleRelease`, `apksigner verify --print-certs` contrôle encore l'APK réellement produit. Une identité
contenant `Android Debug` fait échouer le workflow. Le rapport de signature est conservé dans
`app/build/reports/signature-publication.txt` en cas de diagnostic.

## 2. Les numéros de version doivent être cohérents

Avant toute publication, le workflow compare :

- `versionCode` Android ;
- `versionName` Android ;
- la version Tauri/Windows ;
- le nom du tag lors d'un déclenchement par tag.

Pour la v301, les valeurs attendues sont `301`, `301` et `301.0.0`, avec le tag `v301`. Une divergence arrête la
publication avant toute compilation coûteuse.

Un lancement manuel (`workflow_dispatch`) est désormais accepté uniquement depuis `main`, et crée toujours la
Release `vNN` correspondant à `versionName`. Cela évite de publier accidentellement une branche sous son nom de
branche.

## 3. La Publication passe la même batterie navigateur que l'APK

Le workflow Publication ne lançait que `test-navigateur.py` et `test-export-midi.py`, alors que le workflow APK
avait accumulé de nombreux contrôles spécialisés depuis les versions récentes.

La v301 aligne Publication sur la liste actuelle du workflow APK : graphisme, façades, Eurorack Focus, menu,
outils Studio, retours musicaux, gestes, automations, écrans Performance, SmplTrek, mixage, éditeur de sons,
DRUM 32, MÉLO 32, SCÈNES 8, styles rave, BREAK 32, PERFORMANCE, variations, atelier kick/basse, HARMONIE 8,
STUTTER LIVE, FREEZE GRANULAIRE, CYCLES LIBRES, VOIX MUTANTES, POLY 4, LOOPER, DIALOGUE, ACCORDAGES et rayon
CC0 GitHub.

Le délai maximal du poste Linux de Publication passe donc de 30 à 45 minutes pour ne pas transformer cette
validation plus complète en faux échec de durée.

Le workflow Windows conserve sa stratégie différente : `controles.sh` sur Linux, puis compilation Rust et essai
de la véritable application WebView2 sous Windows. Ces contrôles natifs complètent les tests navigateur au lieu
de les dupliquer.

## Version

- Android : `versionCode 301`, `versionName '301'`.
- Tauri/Windows : `301.0.0`.
