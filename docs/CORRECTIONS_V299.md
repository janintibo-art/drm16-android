# Corrections v299 — bibliothèque : rayon CC0 GITHUB

Suite à la demande d'ajouter d'autres bibliothèques de sons libres de droits. Quatre pistes avaient été
évaluées : une seule s'est révélée réellement intégrable au système d'import fichier-par-fichier déjà en
place (Freesound, archive.org). Les trois autres ont été écartées après vérification technique et
licence, avec l'accord de l'utilisateur.

## Ce qui a été écarté, et pourquoi

- **99Sounds, packs SampleRadar/MusicRadar, Cymatics, bundle GDC de Sonniss** : leur licence « royalty-
  free » interdit explicitement de redistribuer les fichiers « en tant que fichiers autonomes ou
  bibliothèque de sons » — c'est pourtant exactement ce que fait le rayon SONS de la bibliothèque. Aucun
  de ces sites n'a été retenu.
- **University of Iowa Electronic Music Studios** : licence tout à fait correcte, mais les fichiers sont
  en <b>.aif</b> (AIFF). Vérifié directement dans un navigateur Chromium (le moteur de DRM16 sur Android
  et sur bureau) : `decodeAudioData` échoue systématiquement sur ce format — `EncodingError: Unable to
  decode audio data`. Sans conversion préalable, les sons resteraient muets dans l'application. Écarté.
- **WaivOps (Patchbanks)** : licence CC BY 4.0 correcte, mais les jeux de sons ne sont pas servis fichier
  par fichier — chaque style est une seule archive de plusieurs gigaoctets sur Zenodo. Incompatible avec
  le principe « rien n'est téléchargé en bloc » du système actuel, et ce sont surtout des boucles
  complètes, pas des sons isolés. Écarté.
- **OpenGameArt** : pas de catalogue unique à interroger, chaque son est une page séparée avec sa propre
  licence à vérifier une par une. Laissé de côté pour cette version, faute d'un moyen fiable de
  l'intégrer comme une source plutôt qu'une sélection au cas par cas.

## `page/js/640-cc0-github.js` (nouveau)

**CC0G_KITS** : catalogue de trois kits (HARD TRAP, BOUNCE, SOULFUL VINTAGE), seize sons chacun, quarante-
huit au total — recopiés le 23/09/2026 depuis le fichier `beatpacks-config.ts` du dépôt
`github.com/Boochi44/free-drum-samples`, entièrement sous licence <b>CC0 1.0</b> (domaine public
assimilé, sans attribution obligatoire). Chaque son porte déjà son type (kick, 808, snare, clap,
hi-hat, open-hat, perc, fx), servi un par un depuis `raw.githubusercontent.com`, jamais téléchargé en
bloc — même principe que la collection archive.org déjà en place.

**`cc0gSon(kit, s, importer)`** : écoute ou import, même patron que `arcSon` de la collection archive.org
(`netCharger` → `decodeAudioData` → réduction à 32 kHz → `traiterSon` selon le préréglage choisi →
écriture dans la banque). **`CC0G_CATEGORIE`** fait correspondre le type du son à une catégorie de la
bibliothèque (kick→kick, 808→basse, snare→caisse, clap→clap, hi-hat/open-hat→charley, perc→percu,
fx→fx) : un son importé de ce rayon est classé tout de suite, sans attendre la devinette par le nom ou
par l'écoute.

**`bibRendreCc0Github(corps)`** : septième rayon de la bibliothèque. Liste des trois kits, puis, un kit
ouvert, ses seize sons avec ÉCOUTER et IMPORTER, et un bouton ◀ pour revenir. Même patron visuel
(`ligneBib`/`boutonBib`) que les rayons ARCHIVE et FREESOUND — aucun CSS nouveau nécessaire.

## `page/html/280-bib.html`

Septième bouton « CC0 GITHUB » ajouté à `#bib-nav`, après MACHINES. Aucune autre modification : le
sélecteur d'onglet (`210-transfert-vers-une-vraie-volca-sample.js`) associe déjà chaque bouton à son
index par position dans le DOM.

## `page/js/630-bibliotheque.js`

Branche `else if(BIB.onglet === 6) bibRendreCc0Github(corps);` ajoutée au aiguillage des rayons.

## `page/js/631-classement-des-sons.js`

Origine `cc0github` ajoutée à `BIB_ORIGINES` (filtre « CC0 GITHUB ») et à `bibOrigine(id)`.

## `page/js/638-packs-et-credits.js`

`creditSon(id)` : nouvelle branche pour l'origine `cc0github`, citant le dépôt et la licence CC0 1.0.
Commentaire d'en-tête mis à jour.

## `page/html/340-note-general.html`

« Six rayons » → « Sept rayons » ; mention CC0 GitHub dans la liste des filtres par origine et dans le
paragraphe CRÉDITS DES SONS ; nouvelle section « Les packs CC0 (GitHub) », qui explique le choix de ce
dépôt précis (licence explicitement pensée pour la redistribution, contrairement à la plupart des sites
« gratuits ») et les trois kits disponibles.

## `outils/test-cc0-github.py` (nouveau)

Nouveau test dédié, sans dépendre du réseau (seul le vrai pont natif Android/bureau peut joindre
`raw.githubusercontent.com` ; comme pour la collection archive.org, ce test ne l'exerce pas) : intégrité
du catalogue embarqué (trois kits, seize sons chacun, quarante-huit URLs uniques, toutes sous le préfixe
GitHub attendu, huit types tous rattachés à une catégorie), façade (sept onglets, le septième nommé
CC0 GITHUB, liste des trois kits, seize sons avec ÉCOUTER/IMPORTER dans un kit ouvert, retour ◀),
`bibOrigine`/`creditSon`/`bibCategorie` pour l'origine `cc0github`. 41 vérifications, 0 erreur.

## `outils/test-outils-studio.py`

« six rayons conservés » → « sept rayons conservés », boucle de vérification par onglet étendue à sept
(l'onglet MACHINES reste au même index, cinq, donc les autres vérifications de ce fichier n'ont pas
changé).

## `.github/workflows/android.yml`

Ajout de `python outils/test-cc0-github.py --rapport app/build/reports/cc0-github.json` dans l'étape
« Test dans un navigateur ».

## Validation

`bash outils/controles.sh` propre ; deux passes complètes de `outils/test-navigateur.py` (0 FAUX) ;
`outils/test-outils-studio.py` : 1122 vérifications, 0 erreur, y compris les sept rayons de la
bibliothèque sur six formats ; `outils/test-cc0-github.py` : 41 vérifications, 0 erreur. Aucun décompte
du catalogue Eurorack n'est concerné : la bibliothèque est un système entièrement séparé.
