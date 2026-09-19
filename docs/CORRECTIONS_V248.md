# v248 — Freesound dans la bibliothèque

Mise à jour préparée le 19 septembre 2026 à partir de la **v247**, commit
`72be647392d0296adf746a751f43d4031ca19f2f` de `janintibo-art/drm16-android`.
La v247 et sa compilation GitHub ont été vérifiées avant préparation.
**Ce ZIP est un correctif de sources, pas un APK déjà compilé.**

## Utilisation

Après installation de l'APK v248, ouvrir **BIBLIOTHÈQUE → FREESOUND**. Sur un
petit écran, la barre des rayons défile horizontalement : Freesound est à droite.

La première utilisation nécessite une clé API personnelle. Créer un compte
Freesound puis une clé pour cette application à cette adresse :

https://freesound.org/apiv2/apply/

Copier la valeur **Client secret / API key**, pas le Client ID ni le mot de passe.
Dans Freesound, décrire simplement l'usage personnel de la bibliothèque de sons
DRM16. Coller la clé dans le champ prévu dans l'application, puis **UTILISER LA CLÉ**.
Le bouton **COPIER L'ADRESSE** permet de récupérer l'adresse de création de clé.
L'application ne charge pas le site distant dans sa WebView.

Le réglage **Retenir la clé sur cet appareil** est facultatif. Sans lui, la clé
reste en mémoire pendant la session et devra être ressaisie après fermeture ou
rechargement. Avec lui, elle est enregistrée localement, hors des projets exportés.
Ce stockage local n'est pas chiffré : ce n'est pas un coffre-fort. **Ne pas envoyer
la clé dans une conversation, un ZIP ou GitHub.** Aucune clé personnelle n'est livrée.

Rechercher un mot, par exemple `kick`, `snare`, `bass` ou `loop`. Les filtres
permettent de sélectionner la licence, une durée maximale de 8, 30 ou 60 secondes,
et le tri. La durée de recherche par défaut est de 8 secondes pour les sons courts.
Vingt résultats sont demandés par page.

**ÉCOUTER** lance une préécoute ; **ARRÊTER** l'interrompt. **IMPORTER L'APERÇU**
enregistre le son dans la banque commune, avec ses crédits. **MES SONS IMPORTÉS**
revient au rayon **SONS**, où l'on peut renommer, traiter et affecter le son à une
machine compatible avec les échantillons importés, à l'aide des commandes existantes.

Les détails **Crédits Freesound** conservent le titre d'origine, l'auteur, la licence,
l'adresse du son et la conversion réalisée. Le bouton de copie facilite la
conservation de ces informations avec les créations partagées. Les filtres ne
changent pas la licence d'un son : consulter celle-ci avant de réutiliser le son.

## Qualité et limites de ce premier accès

L'import utilise **l'aperçu MP3 HQ fourni par Freesound**, pas le fichier original.
Il est converti en **WAV mono 32 kHz**, avec la normalisation existante du projet,
et une durée maximale de 60 secondes. Cette conversion est explicitement indiquée
à l'écran et dans les crédits. La conversion WAV ne restitue pas la qualité perdue
par la compression MP3. Aucun téléchargement intégral de pack n'est prévu.

Le téléchargement du fichier original par l'API exige une authentification
**OAuth2** distincte, non implémentée dans cette version. L'accès présent couvre
la recherche, la préécoute et l'import des aperçus. Il utilise le pont HTTPS
existant de l'APK et de la coque de bureau ; le simple HTML autonome sans pont
n'a pas cet accès réseau et affiche une explication.

Une connexion Internet est nécessaire pour chercher ou récupérer un nouveau son.
Un aperçu importé et sauvegardé est ensuite un son local. Le fonctionnement des
autres machines et des autres rayons n'exige pas de clé Freesound.

## Protections ajoutées

La recherche utilise l'adresse officielle `/apiv2/search/`, une liste fermée de
filtres et tous les champs nécessaires dans une seule requête, au format JSON.
Le paramètre `token`, officiellement pris en charge, est envoyé uniquement à
l'hôte fixe `freesound.org` en HTTPS. Aucun lien de pagination fourni par le
serveur n'est suivi directement. Les adresses d'aperçus sont limitées aux hôtes
Freesound prévus, sans clé dans leur adresse. Les messages d'erreur n'affichent
ni la clé ni une adresse de requête contenant la clé.

Une seule opération Freesound est active à la fois. Une annulation ignore le
résultat tardif ; le pont existant ne permet pas d'interrompre immédiatement le
transfert natif, donc l'interface attend la fin ou le délai du transfert avant
une nouvelle requête. Fermer la bibliothèque, changer de rayon ou masquer
l'application arrête la préécoute et invalide les résultats en attente.
Un projet en cours d'ouverture ne reçoit pas d'import tardif.

Un son possède un identifiant stable `ufs<identifiant Freesound>`. Il n'écrase
pas une copie déjà présente et éventuellement retravaillée. La liste native
protège également un son enregistré mais pas encore décodé. Après suppression
réelle, le réimport est possible, même si d'anciens crédits subsistent.

Les crédits sont enregistrés dans `drm.reglages.bib` avec les noms. La clé est
séparée sous `drm.freesound.cle.v1`, hors du préfixe exporté par les projets.
L'import n'est annoncé comme sauvegardé qu'après réussite de l'écriture audio
et des crédits. En cas d'échec des crédits, le code tente de retirer le nouveau
fichier audio et conserve un message d'échec. Les titres et auteurs distants sont
affichés comme du texte, jamais exécutés comme du HTML.

## Fichiers du correctif

| Fichier | Changement |
|---|---|
| `page/html/280-bib.html` | Cinquième rayon Freesound. |
| `page/css/180-freesound.css` | Mise en page adaptative et commandes tactiles. |
| `page/js/625-freesound.js` | Recherche, clé, préécoute, import et crédits. |
| `page/js/630-bibliotheque.js` | Aiguillage du rayon, persistance des crédits et arrêt à la fermeture. |
| `page/ordre.txt` | Ajout des deux nouvelles sources dans l'ordre d'assemblage. |
| `app/src/main/assets/drm16.html` | Page assemblée correspondante. |
| `app/build.gradle` | Version Android 248. |
| `bureau/src-tauri/tauri.conf.json` | Version de bureau 248.0.0. |
| `outils/test-freesound.cjs` | 24 tests unitaires, sans accès réseau ni clé personnelle. |
| `outils/controles.sh` | Ajout de ces tests dans les contrôles précédant la compilation. |
| `docs/CORRECTIONS_V248.md` | Ce guide. |
| `docs/TESTS_V248.md` | Résultats et limites des vérifications. |

Aucune modification des sources des machines, du moteur audio, du pont Java,
du pont Rust, des motifs ou des réglages existants. Les ajouts MPC v246 et KAOSS
PAD v247 sont conservés. Ne pas appliquer ce correctif sur une version ultérieure
sans comparaison des fichiers ; il a été préparé pour la v247 précisée ci-dessus.

## Installation dans le dépôt — livraison corrigée v249

L'archive initiale v248 n'avait pas le dossier racine `drm16_android/`
attendu par le script Termux. Ne plus utiliser cette première archive.
La livraison v249 reprend les mêmes fichiers fonctionnels, place chaque
fichier sous `drm16_android/` et augmente les versions Android et bureau.
Voir `docs/CORRECTIONS_V249.md` pour le détail de cette correction de livraison.
Les descriptions et résultats v248 ci-dessus restent ceux du lot d'origine.

Télécharger `drm16_android_v249.zip` dans Téléchargements, sans le décompresser
manuellement. Le script choisit la dernière archive du projet, la décompresse
dans le dossier personnel Termux, puis commite et pousse les modifications.
La seconde commande suit la compilation GitHub.

```bash
bash ~/memo-depot/mise-a-jour.sh drm16_android "v249 Correction archive Termux et ajout Freesound"
```

```bash
gh run watch -R janintibo-art/drm16-android
```

## Références officielles consultées

- Authentification et création de clé : https://freesound.org/docs/api/authentication.html
- Recherche, paramètres et champs des résultats : https://freesound.org/docs/api/resources_apiv2.html
- Distinction aperçus / originaux et erreurs API : https://freesound.org/docs/api/overview.html
