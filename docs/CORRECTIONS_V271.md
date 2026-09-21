# v271 — Correction du test unisson et des retours de frappe

Base : v270, commit `2a89bbe8caea7bf465c201f6205d6f9772b04735`.
Workflow APK concerné : run `35561555111`, numéro 267 ; job `106215252077`.
Le journal GitHub et les captures signalent :

> FAUX : KO unisson : deux voix, une frappe
> 642 vérifications ; 1 erreur(s).

Il s'agit d'un correctif ciblé. Aucun nouvel habillage de façade n'est ajouté
avant de rétablir une compilation réussie sur GitHub.

## 1. Pourquoi le contrôle de la v270 pouvait échouer

Le test appelait l'unisson dans une première tâche JavaScript, puis lisait
la longueur de la file des départs visuels dans une seconde tâche.
Le navigateur pouvait dessiner entre les deux : le départ quittait alors
normalement la file et son point était allumé. Exiger encore `file == 1`
après ce dessin donnait un faux échec.

Reproduction effectuée sur la page exacte de la v270 :

| Moment de lecture | Voix natives | Départs en attente | Points actifs | Départs traités |
| --- | --- | --- | --- | --- |
| Dans la tâche qui déclenche l'unisson | 2 | 1 | 0 | 0 |
| Après le dessin | 2 déjà programmées | 0 | 1 | 1 |

Sur 30 répétitions de l'ancien relevé en deux appels, une lecture a trouvé
la file déjà vide, alors que le point était correctement affiché. Ce nombre
est un résultat de reproduction, pas une estimation de fréquence en usage.
Le contrôle confondait « en attente de dessin » avec « déjà dessiné ».

La v271 contrôle les deux moments séparément : action et relevé de la file
dans la même tâche ; puis attente du dessin et contrôle du point réellement
présent. Elle vérifie aussi le résultat après deux images d'animation.
Le test n'est ni retiré ni rendu non bloquant.

## 2. Un second défaut visuel corrigé

La détection des doublons comparait les dates après leur ajustement à
`currentTime`. Si l'horloge audio avançait entre les notifications des deux
voix d'un unisson, leurs dates ajustées devenaient différentes : deux départs
visuels étaient conservés. À l'inverse, deux vrais départs distincts reçus
légèrement en retard pouvaient être ramenés à la même date et fusionnés.

Chaque événement conserve désormais `dateSource`, sa date audio d'origine.
La détection compare cette date, la machine, la partie, la note et le mode
d'affichage. La date ajustée existante reste utilisée pour dessiner.
Ainsi les deux notifications du même unisson ne produisent qu'un départ
visuel ; deux départs proches mais distincts ne sont plus fusionnés à tort.

Le seuil existant de comparaison de 0,1 ms est conservé. Les répétitions FX,
SCATTER, les notes différentes et les pistes différentes restent distinctes.
Les rafales très rapprochées peuvent prolonger un même point : le nombre
d'événements traités ne signifie pas un clignotement visible par événement.

Les deux voix sonores de l'unisson ne sont pas supprimées. Le fichier modifié
ne crée aucun nœud audio et ne change aucune formule ni programmation audio.
Le voyant reste une indication de déclenchement interne, pas un VU-mètre
ni une garantie de son audible après les réglages du mixeur.

## 3. Fichiers livrés — 8 fichiers uniquement

| Fichier | Modification |
| --- | --- |
| `page/js/730-retours-frappe.js` | Date source conservée pour reconnaître les doublons visuels ; version interne 271. |
| `app/src/main/assets/drm16.html` | Seul le module précédent est remplacé dans la page distribuée. |
| `outils/test-retours-frappe.py` | Relevés atomiques, contrôles après dessin, huit cas d'unisson, douze cas de dates/notes/parties et rapport détaillé. |
| `.github/workflows/android.yml` | Écrit le rapport du test dans `app/build/reports/retours-frappe.json`. |
| `app/build.gradle` | versionCode et versionName : 271. |
| `bureau/src-tauri/Cargo.toml` | Version : 271.0.0. |
| `bureau/src-tauri/tauri.conf.json` | Version : 271.0.0. |
| `docs/CORRECTIONS_V271.md` | Ce compte rendu. |

L'étape « Rapports en cas d'échec » existante recueille déjà le dossier
`app/build/reports/`. Le rapport comprend les huit relevés d'unisson et les
assertions échouées lorsque la suite arrive à son bilan. Il n'est pas garanti
en cas d'interruption brutale du processus avant l'écriture de ce bilan.
Aucune étape de test n'est désactivée et aucune dépendance n'est modifiée.

## 4. Vérifications exécutées

### Suite retours de frappe

**725 vérifications, zéro erreur**, sur sept formats : 320 × 568, 360 × 640,
393 × 851, 640 × 360, 760 × 400, 880 × 400 et 1024 × 768.
La densité est de 2 pour le format 393 × 851.

Les huit nouveaux cas combinent UNISON / UNISON BAS, départ immédiat / futur
et horloge stable / avance de 3 ms entre les notifications. Ils vérifient le
retour de deux voix natives, deux notifications, un seul départ visuel,
l'absence d'allumage anticipé, un seul point, l'extinction et le repos.
Les données musicales et la mémoire simulée sont comparées avant et après.

Douze autres cas vérifient, sur PO-33, MC-101 et SmplTrek, un doublon avec
avance de l'horloge, deux dates originales distinctes reçues en retard,
deux notes différentes et deux parties différentes.

Les contrôles précédents restent présents : appui/relâchement, géométrie,
CHROMA, échantillon absent, MUTE/SOLO, répétitions FX/SCATTER, LOOPER, MIDI
SmplTrek, STOP, masquage, suspension, arrière-plan, réduction des mouvements,
plafond de 128 départs et exclusion des rendus hors ligne. Un cas de départ
MC-101 utilise la véritable horloge AudioContext, sans propriété simulée.

Une première exécution limitée au format 880 × 400 s'était également terminée
avec 215 vérifications et zéro erreur.

### Contre-épreuve sur l'ancien code

La nouvelle suite a été exécutée sur la page et le module v270 non corrigés,
dans une copie de validation séparée, au format 880 × 400 : **18 assertions
échouent sur 215**, dans les cas attendus d'horloge avancée et de dates
confondues. La même suite sur le code corrigé donne zéro erreur.
Les contrôles renforcés détectent donc le défaut, au lieu de le masquer.
Cette contre-épreuve volontairement en échec n'est pas incluse dans le ZIP.

### Onze suites graphiques, toutes exécutées avec succès

| Suite | Bilan de l'exécution |
| --- | --- |
| `test-retours-frappe.py` | 725 vérifications ; 0 erreur(s). |
| `test-graphique.py` | 12 façades/formats contrôlés ; 0 erreur(s). |
| `test-facades.py` | 16 cas façade/format ; 0 erreur(s). |
| `test-eurorack-focus.py` | 4 formats et 412 ouvertures catalogue ; 0 erreur(s). |
| `test-menu-machines.py` | 5 formats, 359 vérifications, 0 erreur(s). |
| `test-outils-studio.py` | 6 formats, 1086 vérifications, 0 erreur(s). |
| `test-retours-musicaux.py` | 158 vérifications ; 0 erreur(s). |
| `test-gestes-musicaux.py` | 298 vérifications ; 0 erreur(s). |
| `test-automations-machines.py` | 1164 vérifications ; 50 façades/formats ; 0 erreur(s). |
| `test-ecrans-performance.py` | Écrans de performance : 949 vérifications, 0 erreurs. |
| `test-onde-smpltrek.py` | 537 vérifications ; 0 erreur(s). |

Les dix suites antérieures ne sont pas modifiées dans ce correctif.
La capture PO-33 paysage 880 × 400 a également été inspectée : le témoin reste
sur le bouton, sans déplacer ses textes ni ses commandes.

### Structure et intégrité

Les SHA Git des quatre fichiers de base relus depuis GitHub correspondent à
ceux des fichiers utilisés pour la correction : module, page HTML, test et
workflow. En remplaçant le nouveau module dans la page par son contenu v270,
on retrouve le HTML v270 **octet pour octet**. Tous les autres scripts,
styles, sons intégrés et structures de cette page sont donc inchangés.

Le module modifié et les trois blocs JavaScript de la page passent le contrôle
de syntaxe Node. Le test Python, le workflow YAML, le JSON Tauri et le TOML
Cargo sont valides. Les versions Android/PC concordent. L'ordre des sources
reste inchangé ; le module est présent exactement une fois dans la page.
Cette vérification précise du remplacement ne remplace pas l'exécution de
l'assembleur sur le dépôt complet, qui reste un contrôle GitHub.

## 5. Ce qui reste inchangé et limites des essais

Aucun fichier musical PO-33, MC-101 ou SmplTrek n'est modifié. Les moteurs
audio, sons, motifs, formats de sauvegarde, fonctions MIDI, Freesound, kits,
Studio Tibo et Nexus restent inchangés. Il n'y a ni nouvelle ressource externe
ni nouvel effet audio. Les améliorations graphiques des v260 à v270 sont
conservées.

Environnement de validation : Python 3.13.5,
Playwright 1.57.0, Chromium 144.0.7559.96 built on Debian GNU/Linux 13 (trixie),
Node v22.16.0.
La page est chargée en mémoire avec stockage temporaire simulé (`--contenu`).
La plupart des assertions de temps emploient une horloge contrôlée.
Aucune sauvegarde personnelle n'a été utilisée ou modifiée.

GitHub conserve son mode de chargement local habituel, Python 3.12 et sa
version Playwright 1.56.0. Les environnements ne sont donc pas identiques.
**L'APK v271 n'a pas été compilé ici et le Samsung n'a pas été testé.**
Aucune comparaison audio binaire des exports v270/v271 n'est revendiquée.
Les contrôles Java/Rust et fonctionnels du dépôt complet restent également
à réexécuter par le workflow GitHub après l'envoi de cette mise à jour.

Après une compilation réussie, vérifier sur le téléphone l'unisson et les
répétitions, puis STOP et le retour depuis la bibliothèque. Il n'est pas
nécessaire de désinstaller l'application ni d'effacer les données.
