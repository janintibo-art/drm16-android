# v194 — TR-1000 : probabilité par pas

Base : v193, commit fbb34a28cfe78a21aaad96d3aae5bca863cfaaf3.

## Fonction

Choisir un instrument, activer PROBABILITÉ, choisir 0–100 % par paliers de 5,
puis toucher les pas. Le mode applique le pourcentage sans activer ni effacer
les pas. Le numéro et le pourcentage sont affichés sur deux rangées de huit
touches ; un trait violet indique un pas actif dont la probabilité est réduite.
SUB STEP, ACCENT et PROBABILITÉ sont des modes d’édition mutuellement exclusifs.
Fermer l’édition ne désactive pas les probabilités enregistrées.

100 % conserve le comportement précédent ; 0 % ne déclenche jamais. Les valeurs
intermédiaires donnent une chance indépendante à chaque passage. Un tirage
unique commande tous les sous-pas d’un instrument à cet emplacement ; les
accents et l’espacement des roulements sont conservés. Les voix refusées ne
comptent pas dans l’atténuation de charge et n’émettent pas de notes MIDI.

Les frappes directes et l’entrée MIDI ne passent pas par le tirage. REC crée
les nouveaux pas à 100 % et conserve la probabilité d’un pas déjà actif.
FILL reste indépendant des probabilités du motif. Ces choix d’interface et
l’interaction avec les sous-pas sont l’adaptation mobile de ce lot.

## Sauvegarde et exports

Une matrice indépendante de 10×16 valeurs est ajoutée à chaque motif. Les
anciens projets et valeurs absentes utilisent 100 %. Les valeurs numériques
sont arrondies et bornées ; les types invalides reviennent à 100 %.
Les matrices sont copiées à la sauvegarde et à la restauration, sans alias.
Le mode d’édition est temporaire et revient à OFF au chargement.

L’export WAV du motif effectue ses propres tirages. Deux exports peuvent
différer, et ne reproduisent pas nécessairement le dernier passage live.
Une prise MIDI contient déjà les notes jouées et se relit sans second tirage.
Aucune graine d’aléatoire, probabilité globale, condition de cycle ni direction
de lecture n’est ajoutée dans cette version.

## Vérifications

Tous les contrôles de `bash outils/controles.sh` passent. Le nouveau test Node
`outils/test-t1k.cjs` fait partie de ces contrôles : 0/100 %, frontière à 50 %,
un tirage par roulement, accents, FILL, REC, migration et absence d’alias.

`python3 outils/test-t1k-navigateur.py` vérifie les vrais boutons, l’édition
sans suppression de pas, les modes exclusifs, l’indépendance des instruments
et le rechargement. Il rend de vrais WAV : silence à 0 %, audio à 100 %,
tirages 50 % acceptés/refusés, contexte audio restauré et absence de Note On
MIDI pendant l’export. Quatre sous-pas sont joués à 100 % et une frappe
directe reste déclenchée à 0 %. Aucune erreur JavaScript.
Captures 393×851, 360×640 et 880×400 ; affichage téléphone inspecté.

## Périmètre et suite

Source fonctionnelle : la page officielle Roland, section « Dynamic pattern
control », confirme les probabilités par pas :
https://www.roland.com/global/products/tr-1000/
L’interface et les paliers ci-dessus sont ceux de notre application, sans
prétendre reproduire toutes les options du matériel.

La lecture du code a aussi confirmé une limite préexistante : les lettres
A–H parcourent les mêmes seize motifs, elles ne constituent pas huit banques
indépendantes. La notice est corrigée pour ne plus annoncer 128 motifs.
L’extension réelle des banques reste à traiter, avec migration des projets.

Fichiers : moteur, façade, style et notice TR-1000 ; tests Node/navigateur et
commande de contrôle ; page assemblée ; versions Android/Windows : 194.
APK à compiler sur GitHub Actions après application du ZIP. Seuls les fichiers
modifiés sont inclus sous `drm16_android/`.
