# v181 — Erreurs de stockage distinctes des fichiers absents

Cette version complète la reprise des projets de la v180. Une lecture ou une
liste refusée par le stockage ne doit pas être interprétée comme un fichier
absent ou une bibliothèque de sons vide.

## Défauts corrigés

Les ponts Android et Windows renvoyaient une chaîne vide aussi bien lorsqu'un
fichier n'existait pas que lorsqu'une lecture échouait. Si la lecture du suivi
et la liste des documents échouaient ensemble, la reprise pouvait croire qu'il
n'y avait aucune ouverture à terminer et laisser démarrer les machines.

La récupération native des fichiers `.bak` ignorait également certains échecs
de renommage. La sauvegarde orpheline était alors masquée dans la liste, alors
que sa restauration n'avait pas réussi.

Deux erreurs de la page ont été reproduites par les tests avant correction :
une liste de sons `null` était traitée comme une liste vide pendant la création
du secours ; une relecture `null` après effacement du suivi pouvait annoncer
la restauration terminée.

## Nouveau comportement

| Situation | Résultat |
|---|---|
| Fichier réellement absent ou dossier réellement vide | Absence acceptée, comportement normal conservé |
| Fichier existant de zéro octet | Lecture vide, mais entrée conservée dans la liste ; un suivi vide reste refusé |
| Lecture, liste ou récupération native impossible | Retour d'erreur distinct ; reprise bloquée avant le démarrage des machines |
| Liste des sons illisible avant ouverture | Secours déclaré incomplet ; aucune copie ni aucun remplacement du projet |
| Vérification refusée après suppression du suivi | Démarrage encore bloqué ; nouvelle tentative possible après rétablissement de l'accès |

Le contrat des quatre fonctions de lecture/liste conserve les formats de succès
et renvoie désormais `null` pour les erreurs. Aucun nouvel appel du pont n'est
nécessaire. Le code Java reste compatible avec Android 7 : il n'utilise pas
`java.nio.file` dans l'application.

Sous Android, l'absence est vérifiée à partir d'un dossier parent lisible ; un
simple résultat négatif de `File.exists()` ne suffit plus. Si Android fournit
un chemin externe mais que son accès ou sa création échoue, l'application ne
se rabat plus silencieusement sur un autre dossier.

Sous Windows, les erreurs de parcours et de métadonnées ne produisent plus de
liste partielle. Les dossiers ordinaires de l'utilisateur restent listables.
La lecture Rust est bornée pendant la lecture, même si le fichier grandit ;
Java refuse également de rendre seulement le préfixe d'un fichier agrandi.
Les plafonds de documents, projets et échantillons restent inchangés.

## Vérifications locales

Le 17 septembre 2026 :

- `bash outils/controles.sh` : assemblage exact des **151 sources**, contrôles
  statiques, régressions JavaScript, compilation Java simulée de **55 fichiers**,
  tests fichiers/MIDI, archive PC et onze tests MIDI Rust.
- **32 nouveaux contrôles Java**, avec les vraies méthodes du pont, de vrais
  fichiers temporaires et des refus déterministes simulés par des objets File :
  absences, fichiers vides, formats, accès refusés, dossier devenu fichier,
  restauration `.bak`, conservation du secours, limites et tailles changeantes.
- **15 tests Rust de fichiers** sous Linux : code de production compilé et
  exécuté sur disque, récupération des sauvegardes, permissions refusées,
  métadonnées invalides, fichiers trop gros et dossiers ordinaires. Les tests
  de permissions s'exécutent sans privilèges ; ils ne dépendent pas du fait
  que le processus principal soit root. Seules les dépendances Base64 et dirs
  sont simulées ; les appels au système de fichiers sont réels.
- **22 groupes navigateur** dans Chromium, dont les 29 machines dans trois
  formats d'écran. Le nouveau groupe injecte des retours natifs `null` à travers
  le vrai HOST : six démarrages/reprises refusés, données conservées, bouton
  Réessayer après retour du stockage, et ouverture refusée sans secours tronqué.
- Les simulations de coupure v180 et les tests de sauvegarde v179 restent verts.

## Limites et suite

La compilation locale Java utilise des classes Android simulées et le banc
Rust n'est pas une compilation Tauri/Windows. GitHub Actions doit encore
compiler les applications ; les refus d'accès restent à essayer dans la
WebView Samsung et sur Windows réels. Ces contrôles ne garantissent pas la
conservation physique du stockage après une panne matérielle.

**Un cas de choix de dossier Android reste distinct :** si Android ne fournit
aucun chemin externe (`getExternalFilesDir() == null`), le repli interne
historique reste actif. Il peut cacher un suivi situé dans un ancien dossier
externe. Résoudre ce cas demande de conserver le choix de dossier et de définir
la reprise des installations existantes ; la v181 ne déplace aucun document.
Cette limite doit être traitée avant de considérer toutes les indisponibilités
externes comme couvertes.

Les copies de secours et le suivi v180 gardent leur format. Une copie détruite
ne peut pas être reconstruite par le bouton Réessayer. Les limitations de
plusieurs instances écrivant simultanément et de durabilité physique restent
celles du bilan v180.

L'archive `drm16_android_v181.zip` contient uniquement les fichiers nouveaux ou
modifiés depuis la v180, sous le dossier `drm16_android/`.
