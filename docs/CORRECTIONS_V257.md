# v257 — Bibliothèque : packs et kits en fichiers, import en lot, crédits

Sixième chantier de la bibliothèque : faire voyager ses sons et ses kits.

## Utilisation

- **EXPORTER LA LISTE EN PACK** (rayon SONS, sous les filtres) : vos sons de la
  liste filtrée, dans un fichier `pack-…-date.drmpack` écrit dans Documents.
- **EXPORTER** (rayon MACHINES, sur un kit rangé) : le kit, ses réglages et ses
  sons, dans `kit-machine-nom-date.drmpack`.
- Rayon **SAUVEGARDES**, nouvelle section **Packs et kits** : la liste des
  `.drmpack` de Documents avec **IMPORTER** et **SUPPRIMER** ;
  **IMPORTER UN PACK OU UN KIT…** va chercher un pack ailleurs (téléchargements,
  pièce jointe) ; **CRÉDITS DES SONS** écrit `credits-sons-drm16-date.txt`.
- **IMPORTER DES FICHIERS** (rayon SONS) accepte plusieurs sons d'un coup.

Un pack emporte, pour chaque son : le WAV, le nom, la catégorie, le favori,
le crédit. À l'import :
- un son **déjà présent** (mêmes échantillons) n'est pas copié une deuxième
  fois, et un kit se branche sur celui qu'on a ;
- les sons de la **banque interne** ne voyagent pas : ils existent partout ;
- un kit arrive sous le nom « NOM (IMPORTÉ) », ses parties pointant sur les
  sons importés ;
- les sons importés ont l'origine **PACKS** dans les filtres.

Seize mégaoctets par pack : le plafond des projets.

## Fonctionnement

- `page/js/638-packs-et-credits.js` (nouveau) : format `drm16-pack` v1 (JSON),
  empreinte d'un son (FNV-1a sur les échantillons en 16 bits) pour les
  doublons, `packImporter` (décodage un son après l'autre, écriture vérifiée,
  kits remappés, bilan), crédits, import en lot, section du rayon SAUVEGARDES.
- **Plafond des `.drmpack`** : le projet veut qu'un document écrit et relu ait
  le même plafond dans les deux sens. Un pack emporte des sons comme un
  projet : 16 Mo, dans le pont Android (`MainActivity.java`, écriture et
  lecture), dans la version ordinateur (`bureau/src-tauri/src/fichiers.rs`) et
  dans le pont simulé des tests. Sans cela, un pack de 10 Mo s'écrivait mais
  ne se relisait pas.
- **Plusieurs fichiers d'un coup sur Android** : le sélecteur rend un choix
  multiple dans le `ClipData`, que `FileChooserParams.parseResult` ignore ; la
  page ne recevait qu'un fichier, ou aucun. `fichiersChoisis` lit le ClipData
  (`MainActivity.java` ; classes simulées `ClipData`, `Intent.getClipData`,
  `Activity.RESULT_OK` ajoutées pour la compilation de contrôle).
- `importerSonFichier` (210) rend une promesse et garantit un identifiant
  unique (deux imports dans la même milliseconde) ; en cas d'échec, le message
  nomme le fichier.
- **Correction : `wavDe` mélange les canaux.** Il n'écrivait que le canal
  gauche : un son stéréo (une boucle rééchantillonnée en v255, par exemple)
  revenait après redémarrage avec son seul canal gauche.
- `631` : crédit gardé dans la fiche du son, origine PACKS, bouton
  d'export ; `632` : EXPORTER sur les kits ; `630` : IMPORTER DES FICHIERS,
  section des packs ; `280-bib.html` : `multiple`.

## Validation locale

- bloc **47** de `outils/test-navigateur.py` : export de la liste (trois sons,
  catégories, favori, crédit), réimport après suppression (tout revient,
  écrit), réimport du même pack sans doublon, export d'un kit puis import (le
  kit retrouve son son, la banque reste la banque, il se rappelle), fichier de
  crédits, trois fichiers choisis d'un coup, `wavDe` en mono mélangé ;
- `test-echantillons.cjs` : le message d'échec d'import attendu nomme le
  fichier ;
- compilation Java de contrôle et tests Rust des fichiers : passent.

Non vérifié ici : la compilation Android, le choix de plusieurs fichiers sur
le vrai sélecteur du téléphone, et le téléphone.
