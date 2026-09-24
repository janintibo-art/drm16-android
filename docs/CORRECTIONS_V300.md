# Corrections v300 — sécurité des fichiers et sauvegardes

La v300 est une version de consolidation issue du grand check-up de la v299. Elle ne change ni le moteur audio,
ni les machines, ni les montages Eurorack. Elle ferme trois cas limites de stockage, avec la même politique sur
Android et Windows.

## 1. Les noms dangereux ne deviennent plus `x`

Jusqu'à la v299, la fonction de nettoyage des noms remplaçait un nom vide, `.` ou `..` par `x`. Le chemin restait
sans traversée de dossier, mais un vrai fichier nommé `x` (ou `x.wav` dans les échantillons) pouvait alors être
lu, remplacé ou supprimé par une opération qui portait en réalité un nom invalide.

En v300 :

- `null`, chaîne vide, `.` et `..` sont refusés ;
- aucune lecture, écriture, ouverture par morceaux ou suppression n'est lancée ;
- les autres caractères non autorisés continuent d'être transformés en `_`, afin de conserver les noms usuels
  déjà acceptés par DRM16 ;
- Android et Windows appliquent exactement la même règle.

Le nouveau `TestSecuriteV300.java` place volontairement un vrai document `x` et un vrai échantillon `x.wav`,
puis vérifie que les noms dangereux ne peuvent plus les atteindre.

## 2. Une suppression ne peut plus ressusciter par son `.bak`

Le remplacement atomique de DRM16 garde un secours `<fichier>.bak` dans certains cas de panne. Jusqu'à la v299,
la suppression demandait d'abord l'effacement du `.bak`, mais ignorait son éventuel échec avant d'effacer le
fichier principal. Dans un stockage anormal, le fichier principal pouvait donc disparaître tandis que son
ancien `.bak` restait présent ; le mécanisme de récupération aurait alors pu restaurer cet ancien contenu au
prochain accès.

En v300, une suppression suit cette règle stricte :

1. vérifier le `.bak` ;
2. s'il existe, exiger qu'il soit un fichier ordinaire et l'effacer ;
3. si cette étape échoue, **ne pas toucher au fichier principal** ;
4. seulement ensuite supprimer la cible.

`Fichiers.supprimer()` porte cette règle côté Android ; `supprimer_fichier()` fait la même chose côté Rust/Windows.
Le banc Java vérifie le succès normal et simule aussi un secours impossible à supprimer.

## 3. Windows ne sauvegarde plus silencieusement dans TEMP

La coque Windows utilisait auparavant `std::env::temp_dir()` si la bibliothèque `dirs` ne parvenait pas à
retrouver Documents ou le dossier de données de l'utilisateur. Cela évitait un plantage, mais pouvait donner
l'impression qu'un projet avait été sauvegardé durablement alors qu'il se trouvait dans un emplacement temporaire.

En v300 :

- `Documents\\DRM16` reste l'emplacement des documents ;
- le dossier de données DRM16 reste l'emplacement des échantillons ;
- si Windows ne fournit pas l'un de ces emplacements, le chemin rendu est vide et les opérations concernées
  échouent explicitement ;
- aucun fichier n'est créé dans TEMP comme solution de secours.

Le test Rust `test-securite-fichiers-v300.rs` simule précisément l'absence des deux dossiers système et vérifie
que toutes les opérations refusent de continuer.

## Tests ajoutés

- `outils/java/tests/fr/tibo/drm16/TestSecuriteV300.java` : noms dangereux contre de vrais fichiers `x` / `x.wav`.
- extension de `TestFichiers.java` : suppression normale et refus lorsque le secours ne peut pas être effacé.
- `outils/rust/test-securite-fichiers-v300.rs` : mêmes noms dangereux sous Windows, suppression sûre, absence de
  repli vers TEMP.
- `outils/test-securite-fichiers-v300.py` : compilation et exécution séquentielle du banc Rust.
- `outils/controles.sh` lance désormais ces nouveaux contrôles avant toute compilation APK/Windows.

## Version

- Android : `versionCode 300`, `versionName '300'`.
- Tauri/Windows : `300.0.0`.
