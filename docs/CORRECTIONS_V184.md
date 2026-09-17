# v184 — Samples mélodiques dans la MC-101

Base : v183, commit `f5e3f1bc64e70de6b491553285e6a3bfef3a555a`.

## Utilisation

1. Choisir la piste 2, 3 ou 4, puis CHOISIR SON.
2. Dans la bibliothèque, importer un WAV si nécessaire puis toucher AFFECTER.
3. Revenir à la MC-101 : les notes des 16 clips de cette piste jouent le sample.
4. SYNTHÉ rétablit l'oscillateur sans modifier les clips.

La piste 1 conserve son kit rythmique. Les pistes mélodiques gardent leur type
pour préserver le routage MIDI, les copies de clips et les anciennes scènes.
Un champ `ech` facultatif choisit leur source sonore. Les anciennes sauvegardes
sans ce champ continuent d'utiliser les oscillateurs.

La note 0 lit le sample à sa hauteur d'origine ; une note 12 le lit une octave
plus haut. La durée suit la vitesse. FILTRE et NIVEAU restent actifs ; DÉCLIN
règle la portion jouée (100 % à sa valeur maximale). De courtes rampes encadrent
la lecture. Le filtrage des transpositions existant est réutilisé.

Le nom du sample est affiché comme du texte et la piste indique SAMPLE. Un son
absent est signalé dans la façade et produit du silence, sans remplacement
automatique par un synthétiseur. Le bouton ONDE est désactivé en mode sample.

## Import et sauvegarde

L'import utilise le chemin existant de la bibliothèque : au maximum 8 secondes,
mono, 32 kHz, avec le traitement choisi dans la bibliothèque. Ce lot n'ajoute
pas de lecture de longues boucles ni de timestretch.

Les références des samples sont sauvegardées avec les pistes. Les sons personnels
sont rechargés via le pont natif à l'ouverture de la MC-101 et la façade s'actualise
après décodage. Pour un échange Android/Windows, inclure les sons dans le projet
et utiliser une version au moins égale à 184 sur les deux appareils.

La bibliothèque propose MC-101 / Pistes 2, 3, 4. Son inventaire d'utilisation
compte également les samples MC actifs ou sauvegardés avant d'avertir lors d'une
suppression. L'affectation est refusée pendant une ouverture de projet.

## Vérifications

- Suite `outils/controles.sh` : contrôles statiques, JavaScript et régressions,
  compilation Java simulée et tests fichiers/MIDI Java et Rust.
- Régressions MC : affectation, refus, conservation des notes, sauvegarde,
  sample manquant, retour synthé et garde pendant une ouverture de projet.
- Chromium : vrai fichier WAV importé par le champ fichier de la bibliothèque,
  affectation par le bouton AFFECTER, rechargement depuis le pont simulé,
  conservation du clip 16 et mesure du son rendu par le vrai moteur WebAudio.
- Le rendu distingue la hauteur originale (440 Hz) et l'octave (880 Hz), puis
  vérifie le silence si la référence pointe vers un sample absent.
- Les groupes navigateur MC clips, lancements et scènes personnalisées passent.
- Affichage : ouverture du sélecteur aux formats 393 × 851, 360 × 640 et
  880 × 400 sans débordement horizontal ; inspection visuelle portrait.

Ces essais ne remplacent pas la compilation APK de GitHub, ni un essai sur le
téléphone. Aucun EXE Windows v184 n'a été compilé dans cette session.

## Fichiers principaux

Sources MC (`580`, façade `590`), bibliothèque (`630`), chargement et inventaire
des samples (`280`), façade HTML, CSS et notice MC ; HTML réassemblé par le script
officiel. Tests Node et navigateur, versions Android/bureau et ce bilan inclus.

La piste Looper synchronisée reste une étape distincte.
