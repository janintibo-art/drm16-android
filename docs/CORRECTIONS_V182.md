# v182 — Choix persistant du dossier de documents Android

Base : v181, commit `146bd4cab17634c75b877909896759b08bd03421`.

## Problème

Quand `getExternalFilesDir(DIRECTORY_DOCUMENTS)` rendait `null`, le pont
ouvrait le dossier interne `documents`. Un suivi de récupération resté dans
l'ancien dossier externe pouvait alors sembler absent. La v181 distinguait
les erreurs de lecture, mais ne conservait pas le choix de dossier.

## Correction

`DossierDocuments.java` choisit et mémorise l'emplacement dans un fichier
privé, hors des documents exportables. Le repère est écrit avec synchronisation,
remplacement sécurisé et relecture. Une sauvegarde `.bak` orpheline est récupérée.
Le pont de `MainActivity.java` passe par ce choix pour toutes les opérations sur
les documents, y compris les écritures par morceaux.

- Dossier externe mémorisé : chemin externe absent, différent ou illisible =
  erreur ; aucun repli interne.
- Dossier interne mémorisé : il reste utilisé même si l'externe réapparaît.
- Dossier mémorisé disparu : le sélecteur ne le recrée pas vide.
- Repère vide, invalide, trop volumineux ou inaccessible : refus du choix.
- Le retour du stockage permet de réessayer par le mécanisme de reprise existant.

## Reprise des anciennes installations sans repère

Il faut pouvoir examiner l'emplacement externe avant de choisir. S'il est
indisponible, les opérations documents sont refusées, y compris au premier
lancement d'une installation neuve. Ce choix évite de considérer un ancien
stockage inaccessible comme vide.

Si seul l'interne contient des documents, il est conservé. Sinon, l'externe
est choisi lorsque l'interne est vide et l'externe accessible. Les fichiers
techniques, notamment les suivis `.bak`, comptent comme du contenu.

**Si les deux emplacements contiennent des données, aucun choix automatique
n'est effectué.** Le démarrage peut être bloqué par le contrôle de reprise.
Une résolution accompagnée du conflit est alors nécessaire : cette version
n'ajoute pas d'écran de fusion ni de sélection manuelle. Ne pas supprimer les
documents ou réinstaller pour contourner le blocage. Aucun fichier utilisateur
n'est déplacé ou effacé par cette migration.

## Vérifications effectuées

- `bash outils/controles.sh` : tous les contrôles passent.
- Compilation Java de contrôle : 57 fichiers avec signatures Android simulées.
- 29 contrôles supplémentaires : choix initial, redémarrage, perte et retour
  de l'externe, changement de chemin, dossier illisible, sauvegarde du repère,
  repère corrompu, migration interne, conflit entre les anciens dossiers,
  lectures et écritures via le vrai pont Java.
- Les régressions JavaScript, fichiers/MIDI Java, 11 tests MIDI Rust et
  15 tests fichiers Rust existants passent.
- `git diff --check` : aucune erreur.

Ces contrôles ne constituent pas une compilation APK ni un essai sur Samsung.
Le workflow APK exécutera ses tests navigateur et la compilation après l'envoi
du patch. Aucun EXE Windows v182 n'a été compilé ici.

## Périmètre et limites

Le moteur musical, le HTML et le format des projets sont inchangés. Les versions
Android et bureau passent à 182. Le stockage Windows reste inchangé.

Ce correctif couvre le choix du dossier et le retour `null` d'Android. Il ne
garantit pas la récupération d'un support physiquement endommagé ni d'un dossier
effacé ou recréé par le système. Les limites de durabilité et d'écritures par
plusieurs instances signalées en v180 restent applicables.

Livraison : uniquement les fichiers modifiés ou ajoutés, sous `drm16_android/`.
