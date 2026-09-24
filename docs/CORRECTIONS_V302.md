# Corrections v302 — nettoyage Android et documentation technique

La v302 est une version de maintenance sans modification du moteur audio, des machines, des motifs ni de l'Eurorack.
Elle applique les corrections Android sans risque relevées pendant le grand check-up v299 et laisse volontairement
les changements plus sensibles (nouveau targetSdk, comportement grands écrans) pour une version dédiée avec essais.

## 1. Permissions micro : suppression d'un test devenu impossible

DRM16 a `minSdk 24`. Les permissions d'exécution Android existent depuis l'API 23 : le cas
`SDK_INT < M` ne peut donc plus arriver sur un appareil pris en charge.

Dans `MainActivity.java` :

- `micro()` teste directement `RECORD_AUDIO` ;
- la réponse à `onPermissionRequest()` applique la même règle ;
- aucun comportement utilisateur ne change sur Android 7 et plus.

Cela retire deux avertissements `ObsoleteSdkInt` de Lint.

## 2. Notification de lecture : PendingIntent simplifié

`FLAG_IMMUTABLE` existe depuis l'API 23 et DRM16 commence à l'API 24. `PlaybackService` le pose donc directement,
sans branche devenue impossible. Cela retire le troisième avertissement `ObsoleteSdkInt`.

## 3. `hasFragileUserData` retiré

Le manifeste déclarait `android:hasFragileUserData="false"`. La documentation Android donne déjà `false` comme
valeur par défaut. L'attribut est donc supprimé : le comportement reste identique et l'avertissement Lint lié à
son introduction en API 29 disparaît.

## 4. Icône monochrome Android 13+

Deux ressources `mipmap-anydpi-v33` complètent les icônes adaptatives avec `<monochrome>`. Les versions Android
antérieures continuent d'utiliser les ressources `v26` inchangées. Android 13 et versions suivantes peuvent ainsi
utiliser DRM16 avec les icônes thématiques du lanceur.

Le même premier plan que l'icône adaptative est utilisé comme masque monochrome afin de conserver la silhouette
actuelle de DRM16 sans introduire un nouveau dessin dans cette version de maintenance.

## 5. Ce qui reste volontairement inchangé

- `targetSdk 34` : la montée de cible est reportée à une version dédiée, car Android 16/17 modifie notamment le
  comportement sur grands écrans et l'audio d'arrière-plan ; elle doit être testée séparément.
- `screenOrientation="fullSensor"` : DRM16 est utilisé sur téléphone dans toutes les orientations ; le retirer
  modifierait le comportement actuel et n'a donc pas sa place dans une simple version de nettoyage.
- `ic_matrix.xml` : ancienne ressource non utilisée, laissée en place pour éviter une suppression de fichier dans
  les ZIP de mise à jour. Elle pourra être retirée lors d'un nettoyage du dépôt.

## Résultat attendu dans Android Lint

Les trois `ObsoleteSdkInt`, l'avertissement `UnusedAttribute` de `hasFragileUserData` et les deux avertissements
`MonochromeLauncherIcon` doivent disparaître. Restent volontairement les sujets qui nécessitent une décision ou
une suppression de dépôt : ancien targetSdk, orientation et `ic_matrix.xml` inutilisé.

## Version

- Android : `versionCode 302`, `versionName '302'`.
- Tauri/Windows : `302.0.0`.
