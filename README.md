# Boîtes à rythmes autonomes pour Android

**[Télécharger l'application](../../releases/latest)** — Android 7 minimum, hors ligne, sans compte.
Pour publier une nouvelle version, voir [PUBLIER.md](PUBLIER.md).

Le [bilan du grand check-up v176](docs/CHECKUP_V176.md) décrit les corrections, les tests réalisés et les défauts restant à traiter.
La [v177 corrige l'export WAV des prises MIDI avec plusieurs machines](docs/CORRECTIONS_V177.md), avec conservation des notes et vérification du retour au jeu.
La [v178 ordonne les connexions MIDI de la version Windows](docs/CORRECTIONS_V178.md), avec tests des ouvertures lentes, fermetures et changements d'appareil.
La [v179 protège les sauvegardes de projet](docs/CORRECTIONS_V179.md) contre les noms identiques et vérifie leur contenu après écriture.
La [v180 reprend les ouvertures de projet interrompues](docs/CORRECTIONS_V180.md) avant de démarrer les machines, avec maintien du secours en cas de restauration impossible.
La [v181 distingue les erreurs de stockage des fichiers absents](docs/CORRECTIONS_V181.md), pour refuser les secours incomplets et garder les reprises invérifiables bloquées.

### Ce que produit chaque envoi

| Quand | Ce qu'on obtient | Où |
|---|---|---|
| À chaque `git push` | l'**APK**, le **ZIP PC complet** (`drm16-pc.zip`) et le HTML seul | Actions → APK → Artifacts |
| À la demande | l'**exécutable Windows** | Actions → Exécutable Windows → Run workflow |
| Sur une étiquette `vNN` | une **version publiée** : APK signé, ZIP PC, HTML et exécutable | Releases |

Pour le navigateur, décompressez entièrement `drm16-pc.zip`, puis ouvrez `drm16.html`.
L'archive garde Studio, Nexus et leurs sons, ainsi que Syro lorsqu'il a été compilé.
Sa notice explique le lancement local si le navigateur bloque les sons des modules depuis le disque.
Le HTML seul reste disponible pour compatibilité, sans ces fichiers supplémentaires.
L'installeur Windows offre le MIDI externe et la bibliothèque native de fichiers ; la version
navigateur n'a pas ces fonctions natives ni les téléchargements archive.org, et exporte les WAV
par téléchargement. La conservation des motifs dépend de la mémoire locale et de l'adresse utilisée.
L'exécutable demande dix à quinze minutes de compilation Rust, d'où son lancement à la demande.

> Projet personnel, sans lien avec Roland, Akai, Korg, Arturia, Behringer, Oberheim ni aucun autre
> fabricant. Les noms d'appareils servent à dire de quoi le son s'inspire ; aucun échantillon ni aucun
> circuit d'origine n'est utilisé — tout est synthétisé.

Recréation des Electro-Harmonix DRM-16 (model 01) et DRM-32 (model 03), et des Korg Electribe EM-1, ER-1,
EA-1, ES-1, de leurs versions mkII, de l'EMX-1 et de l'ESX-1, en application Android.
**Vingt-quatre machines et un rack eurorack**, un menu au lancement, plus une bibliothèque, un enregistreur MIDI et un éditeur
en rouleau. Un menu au lancement choisit l'appareil ; on en change ensuite par la notice,
derrière MODEL sur les Electro-Harmonix, derrière la référence EM-1 sur l'Electribe.

## Electribe EM-1

Séquenceur à pas, une autre famille de machine que les deux précédentes.

- **10 parties jouables** : huit percussions (grosse caisse, caisse claire, clap, tom, charley fermé,
  charley ouvert, crash, cowbell) et deux parties de synthé à deux oscillateurs, plus **deux pistes
  d'accent**, une pour les percussions, une pour le synthé.
- **64 pas**, seize motifs en mémoire, WRITE pour enregistrer, ERASE pour vider une partie,
  SHIFT + touche 3 pour le swing.
- **Par partie** : niveau, panoramique, hauteur, enveloppe courte, roulement de quatre coups, envoi d'effet.
- **Filtre de synthé** : coupure, résonance, intensité d'enveloppe, saturation.
- **Effets** : les onze de la façade — pitch shifter, ring modulator, phaser, flanger/chorus, réverbération,
  compresseur, distorsion, decimator, résonateur, filtre et delay modulé — plus un délai indépendant réglable
  en temps et en profondeur (DELAY EDIT).
- **KEYBOARD** transforme les seize touches en clavier pour la partie de synthé choisie, dans l'une des six
  gammes (chromatique, majeure, mineure, dorienne, pentatonique, blues), avec changement d'octave par ◀ et ▶.
  Toucher un pas le sélectionne pour lui donner sa hauteur.
- **SHIFT** donne accès aux fonctions imprimées sous les touches : longueur du motif (1 à 64 pas), gamme,
  swing, type de roulement, décalage, copie et échange de partie, copie de son, effacement de partie,
  duplication et effacement de motif, protection en écriture.
- **REC** arme l'enregistrement au vol : pendant la lecture, toucher une partie écrit un pas.
- La molette règle le paramètre allumé : motif, tempo, forme d'onde, hauteur.

- **MOTION SEQ** enregistre le mouvement d'un bouton sur les seize pas d'une partie, en Smooth (glissé)
  ou Trig Hold (tenu) : niveau, panoramique, hauteur, temps d'enveloppe et les quatre boutons du filtre.
- **SONG** enchaîne les motifs : jusqu'à 64 positions sur quatre pages, éditables aux touches et à la molette.

Le bend range reste de côté.

## Electribe ER-1

Quatre percussions synthétisées, deux parties de bruit à la place des entrées audio, deux charleys qui se
coupent l'un l'autre, une crash, un hand clap et une piste d'accent — onze parties.

- **Oscillateur** : sinus ou triangle, avec profondeur, vitesse et forme de modulation (sinus, carré, triangle,
  montée, chute, aléatoire). La chute de hauteur donne la grosse caisse, la modulation rapide les métalliques.
  **RING MOD** multiplie les parties 1 et 2, ou 3 et 4.
- **Ampli** : décroissance, niveau, panoramique et le **LOW BOOST** propre à l'ER-1 (renfort des graves par
  filtre en plateau).
- **Delay** avec profondeur, temps, et un mode synchronisé au tempo.
- **Motion Seq**, mode **Song**, fonctions **SHIFT** imprimées sous les touches, seize motifs en mémoire.

Les deux parties AUDIO IN sont des percussions de bruit filtré : le téléphone n'a pas d'entrée ligne.

## Electribe EA-1

Deux parties de synthé, chacune avec sa séquence de seize pas, ses notes et son propre son.

- **Oscillateur** : deux oscillateurs (dent de scie, carré, triangle), équilibre entre les deux, désaccord du
  second, portamento, et **OSC MOD** — modulation en anneau, synchronisation approchée (l'oscillateur 2 est
  découpé par une dent de scie à la fréquence du premier, faute de vraie synchronisation dans Web Audio)
  et décimation.
- **Filtre** résonant avec enveloppe, **distorsion** et niveau, **effet** délai synchronisé au tempo ou
  chorus/flanger.
- **Clavier** sur les seize touches, les deux dernières devenant REST et TIE ; la liaison tient la note sur le
  pas suivant. **Gate Time** règle la longueur des notes.
- Motion Seq, mode Song, fonctions SHIFT, seize motifs en mémoire.

L'entrée audio de l'appareil d'origine n'a pas d'équivalent : le téléphone n'a pas d'entrée ligne.

## Choix des sons sur les Electribe

- **EM-1** : la rangée **Wave** de l'afficheur choisit le timbre de la partie — forme d'onde pour les deux
  synthés, et pour les huit percussions l'un des **vingt-neuf timbres** de la bibliothèque (grosses caisses,
  caisses claires, rimshot, clap, toms, conga, charleys, crash, ride, cowbell, clave, wood block, shaker,
  tambourin, zap, laser, bruit, blip, space drum). Tous sont synthétisés, aucun échantillon.
- **ER-1** : la rangée **Sound** charge l'un des seize sons préréglés dans la partie choisie.
- **EA-1** : la rangée **Sound**, à la place de Step Rec. (non implémenté), charge l'un des quatorze sons
  préréglés dans la partie choisie.

Un préréglage n'est qu'un point de départ : les boutons restent libres, et le choix est enregistré avec le motif.

## Electribe ES-1

Échantillonneur : neuf parties tenant chacune un son, plus une piste d'accent.

**Trois sources d'échantillons**, toutes vers la partie choisie.

1. **SAMPLING** — enregistrement au micro du téléphone, six secondes au maximum. Permission `RECORD_AUDIO`
   demandée au premier essai côté Android, et `WebChromeClient.onPermissionRequest` accorde la capture audio
   à la page. Passe par `MediaRecorder` puis `decodeAudioData`.
2. **IMPORT** — un `<input type="file">` que `WebChromeClient.onShowFileChooser` relie au sélecteur du système ;
   n'importe quel format lisible par le téléphone est décodé.
3. **Banque interne** — quatorze sons calculés point par point au lancement (grosse caisse, caisse claire,
   clap, charleys, tom, cowbell, rim, zap, blip, bruit, stab, basse, voix). Aucun fichier audio dans l'APK.

Les sons enregistrés sont ramenés en mono 32 kHz, normalisés, encodés en WAV et écrits dans le dossier privé
de l'application par le pont Java (`echSauver` / `echCharger` / `echListe` / `echSupprimer`) : ils reviennent au
lancement suivant. La mémoire du navigateur n'aurait pas tenu la charge.

Par partie : **PITCH/SPEED** (vitesse de lecture), **FILTER**, **LEVEL**, **PAN**, **REVERSE**, **ROLL**,
**EFFECT**, et **SLICE** qui découpe le son en seize tranches jouées une par pas. Les onze effets et le délai
sont communs aux Electribe, avec **BPM SYNC**. SHIFT donne aussi **Normalize**, **Truncate**, **Time Slice** et
**Delete Sample**. Le lecteur de carte SmartMedia n'a pas d'équivalent.

## Les versions mkII

Plutôt que de dupliquer trois modules, chaque Electribe accepte une version : même code, même façade,
habillage et différences propres. Chaque version garde **ses seize motifs et ses sons, séparément**.

- **EA-1 mkII** (turquoise) : l'OSC MOD gagne la position **CROSS**, la modulation croisée — l'oscillateur 2
  module la fréquence du premier, d'autant plus fort que l'équilibre penche vers lui.
- **ER-1 mkII** (brun) : les deux parties AUDIO IN deviennent des parties **PCM** jouant la banque de
  quatorze sons, avec vitesse de lecture et décroissance.
- **ES-1 mkII** (champagne) : la liste d'effets remplace Resonator et Filter par **ISOLATOR** (trois bandes,
  EDIT 1 choisit celle qui reste au premier plan, EDIT 2 la profondeur de la coupe) et **RESO. FILT.**
  Les sons enregistrés restent communs aux deux versions, seules les affectations diffèrent.

**PART MUTE** et **SOLO** ont été ajoutés aux deux ES-1, comme sur la sérigraphie.

## Electribe EMX-1

La plus grosse des machines : quatorze parties jouables, trois effets simultanés, un synthé à modèles
d'oscillateurs et le Valve Force.

- **Neuf parties de percussion** lisant la banque, portée pour l'occasion à **vingt-quatre sons** calculés
  au lancement, avec vitesse de lecture, niveau, panoramique, enveloppe et roulement.
- **Cinq parties de synthé** avec **quinze modèles d'oscillateur** : modulation croisée, synchronisation,
  anneau, unisson, accord, double oscillateur, forme d'onde, VPM à deux opérateurs, mise en forme d'onde,
  additif (onde périodique construite harmonique par harmonique), peigne, formants, bruit, PCM+peigne,
  PCM+mise en forme. OSC EDIT 1 et 2 règlent les deux paramètres propres à chaque modèle.
- **Filtre** à quatre types (LPF, HPF, BPF, BPF+) avec enveloppe et saturation.
- **Modulation** assignable : oscillateur lent vers la hauteur, les réglages d'oscillateur, la coupure,
  le volume ou le panoramique, cinq formes, synchronisation au tempo.
- **Trois effets** en parallèle ou en série (FX CHAIN) ; chaque partie choisit le sien.
- **Valve Force** : le TUBE GAIN pousse le mélange dans une saturation **dissymétrique**, qui engendre des
  harmoniques paires — la couleur des lampes. Les deux lampes de la fenêtre s'allument avec le réglage.
- **Arpégiateur** au ruban, clavier sur les seize touches, six gammes, mode Song, Motion Seq, mute et solo.

Pour l'occasion, le constructeur d'effets a été rendu réutilisable : le même code sert maintenant à l'effet
unique des autres Electribe et aux trois chaînes de l'EMX-1.

## Electribe ESX-1

L'EMX-1 avec l'échantillonnage. Quatorze parties : neuf parties de percussion, deux parties **KEYBOARD**
qui lisent leur son à la hauteur des notes, deux parties **STRETCH**, une piste d'accent.

- **Sources d'échantillons** : les trois de l'ES-1, et la mémoire est partagée avec elle — micro (huit
  secondes), import de fichier, banque de vingt-quatre sons.
- **STRETCH** découpe l'échantillon en autant de tranches qu'il y a de pas et en joue une par pas : la boucle
  suit le tempo **sans que la hauteur bouge**, puisque c'est la position qui avance et non la vitesse de
  lecture. **SLICE** fait la même chose sur une partie de percussion.
- Par partie : hauteur, point de départ, niveau, panoramique, enveloppe, lecture à l'envers, roulement,
  filtre à quatre types, modulation assignable à la hauteur, la coupure, le volume ou le panoramique.
- **Seize effets** — les treize précédents plus talking mod, égaliseur trois bandes et grain shifter —
  sur trois chaînes simultanées, en parallèle ou en série, plus le Valve Force.

Les trois nouveaux effets profitent aussi à l'EMX-1.

## Corrections de fiabilité (version 21)

Suite à un audit externe, vérifié point par point avec un pont Android simulé qui enregistre
tous les appels reçus.

**Mémoire.** `writeMem()` sérialisait les onze machines à chaque pas allumé : 281 ko, 5,2 ms par
écriture. Chaque machine a maintenant sa propre clé, et toutes les écritures sont différées de
250 ms. Mesuré : **vingt pas allumés coûtent 2,2 ms au total** au lieu de 104. L'ancien format
est repris et réparti automatiquement au premier lancement. Un dépassement de quota, jusque-là
avalé en silence, affiche désormais un bandeau.

**Arrêt.** Stop annulait le séquenceur mais laissait partir ce qui était déjà programmé.
Toute source audio retient maintenant son heure de départ — les méthodes de création du contexte
sont enveloppées une fois pour toutes — et Stop annule celles qui n'ont pas commencé. Mesuré :
crête après arrêt **0,498 → 0,007**. Les départs de notes MIDI en attente sont annulés et les
notes ouvertes refermées par un Note Off. Un bouton **PANIQUE** dans la notice coupe tout,
envoie All Notes Off sur les seize canaux et rétablit le volume.

**MIDI.** L'arrêt de l'horloge était filtré par la même condition que son démarrage : il ne
partait jamais. Les réglages (canal, entrée, sortie, horloge) n'étaient pas relus au lancement.
Les deux sont corrigés. La durée des notes sortantes suit désormais la durée demandée.

**Échantillons.** Le résultat de l'écriture est vérifié et signalé ; l'écriture côté Java passe
par un fichier temporaire puis un remplacement, pour ne pas détruire l'existant en cas d'échec.
Le minuteur d'une prise ne peut plus arrêter la suivante. La destination est figée au départ de
la capture ou de l'import. Protect est respecté. Avant une suppression, les utilisations du son
sont comptées sur les trois échantillonneurs : s'il sert ailleurs, il est seulement détaché de
la partie courante. Import limité à 40 Mo avec message clair.

**Android.** `setAllowContentAccess` passe à `true`, sans quoi les URI du sélecteur de fichiers
ne sont pas lisibles. Le résultat de la demande de priorité audio est contrôlé : en cas de refus,
la page est arrêtée et prévenue au lieu de jouer par-dessus.

## Fin de l'audit (version 22)

**Un seul fil d'horloge, garanti.** `horlogeArret()` remettait le drapeau à false et oubliait le fil
sans attendre sa sortie de boucle : un redémarrage rapide pouvait en laisser deux tourner. Chaque session
porte maintenant son numéro, l'ancien fil est réveillé par `unpark` au lieu d'attendre sa période, et
joint avec une limite de 60 ms.

**Départ audio et horloge alignés.** Le premier pas est programmé 120 ms dans le futur, l'horloge partait
aussitôt. Elle est maintenant retardée de la même avance — et le calcul prend l'heure du premier pas avant
que l'ordonnanceur ne la fasse avancer, sinon le décalage s'inversait. Mesuré sur quatre départs :
**de −1 à −4 ms**, contre 120 auparavant.

**Durée réelle des notes sortantes.** Le Note Off partait systématiquement 90 ms après le Note On.
Il suit désormais la durée demandée à la voix, liaisons comprises. Mesuré sur l'EA-1 avec une liaison :
244, 78, 118, 79 ms au lieu de 90 partout.

**Entrée MIDI routée par machine.** Les notes n'étaient traitées que pour l'EM-1 ; ailleurs elles
déclenchaient les voix génériques de la DRM16. Chaque machine reçoit maintenant sur ses propres parties :
notes 36 à 44 pour les percussions, canal séparé pour les parties mélodiques, et l'enregistrement au vol
fonctionne partout.

## Constructeur d'effets : mise à jour en place (version 25)

Mesuré : tourner un bouton d'effet reconstruisait tout le graphe audio, soixante fois par seconde.
Pour la réverbération, chaque reconstruction régénérait une réponse impulsionnelle de deux secondes —
**39,9 ms par mouvement, soit 2392 ms de calcul par seconde de geste**. L'application gelait et le son
décrochait.

Chaque effet expose maintenant une fonction `maj` qui applique EDIT 1 et EDIT 2 **aux nœuds déjà en place**,
par `setTargetAtTime` : plus de reconstruction, plus de coupure du son pendant le réglage. Le graphe n'est
refait que si le type d'effet change — ou si `maj` renvoie `false`, ce que fait le pitch shifter quand sa
hauteur arrondie a réellement bougé.

Trois mesures complémentaires : les réponses impulsionnelles sont mises en cache par pas de 125 ms, leur
fabrication passe d'une puissance par échantillon à une multiplication avec un canal droit obtenu par
décalage, et la pose d'une réponse sur le convolueur — qui oblige Chromium à refaire ses tables — attend
130 ms que le doigt s'arrête.

| effet | avant | après |
|---|---|---|
| Réverbération | 2392 ms/s | 0,6 ms/s |
| Distorsion | 42 ms/s | 2,6 ms/s |
| Phaser | 29 ms/s | 0,3 ms/s |
| Pire cas des seize | 2392 ms/s | 61 ms/s |

## Options ajoutées (version 26)

- **MUTE et SOLO** sur l'EM-1 et l'ER-1, qui ne les avaient pas. Vérifié au rendu : couper la grosse caisse
  fait passer le niveau efficace d'un motif de 0,1446 à 0,0254.
- **Métronome**, réglable dans l'onglet GÉNÉRAL de la notice. Il marque les temps, plus fort sur le premier
  (crête 0,187 contre 0,109), passe directement au mélange — ni effets, ni niveaux de parties — et n'est
  pas envoyé en MIDI. Gardé en mémoire.
- **Niveau d'accent réglable** sur les cinq machines qui ont une piste d'accent : le bouton LEVEL de cette
  piste fixe la force des coups accentués au lieu de les pousser au maximum. La valeur par défaut redonne
  exactement le comportement précédent.

## Retour au menu et bandeau flottant (version 57)

Deux défauts signalés, et le second en cachait un troisième bien plus ancien.

**Il n'y avait aucun moyen de revenir au menu.** La notice était accessible, pas le choix des machines :
`ouvrirMenu()` existait, mais rien ne l'appelait. Un bouton **☰ MENU** a été ajouté. Posé d'abord en haut
à gauche, il couvrait l'interrupteur de la DRM16 et rendait la machine impossible à allumer — il est
maintenant à côté de NOTICE, dans un coin où aucune machine n'a de commande. Vérifié machine par machine :
le bouton est accessible partout et le retour fonctionne depuis les vingt-cinq.

**Le décalage de l'eurorack venait de deux causes.** D'abord les câbles : `fit()` met la machine à
l'échelle, mais je dessinais en pixels d'écran dans un repère mis à l'échelle. Divisé par l'échelle, l'écart
entre le départ d'un câble et le centre de son jack est maintenant de **zéro pixel** à toutes les tailles
d'écran testées.

**Ensuite, la vraie cause du décalage du panneau** : `#signal`, le bandeau de messages, **n'avait aucune
règle de style**. Créé en JavaScript et ajouté au corps de page, il restait un bloc ordinaire dans une mise
en page centrée — et poussait la machine de trente-neuf pixels vers la gauche. Sur toutes les machines,
depuis toujours.

Ce texte flottant à droite des panneaux, je l'ai vu dans chacune de mes captures d'écran et je l'ai pris
pour un affichage normal sans jamais le vérifier. Le bandeau flotte maintenant en bas de l'écran, hors du
flux, avec un fondu. Les vingt-cinq machines sont centrées au pixel près.

## Eurorack : cinquante-six modules (version 56)

Quatre fois plus de modules, en huit familles : quatre horloges, cinq séquenceurs, sept oscillateurs, huit
filtres, quatre modulateurs, dix utilitaires, dix traitements, huit percussions.

**Un meilleur modèle de propagation, d'abord.** L'ancien code ne savait déclencher que depuis une horloge
ou la porte d'un séquenceur : un diviseur n'aurait jamais pu alimenter un générateur euclidien. Les portes
se propagent maintenant **de proche en proche** — un module qui en reçoit une peut en émettre à son tour —
avec une file bornée à quatre cents relais pour qu'un câblage en boucle ne fasse pas tourner l'application
indéfiniment. Vérifié : deux diviseurs qui se renvoient la balle traitent seize pas sans blocage, et la
chaîne horloge → diviseur /2 → euclidien → grosse caisse donne bien quatre coups sur vingt-quatre pas.

**Des fabriques plutôt que des copies.** Les filtres, les percussions et les traitements ne diffèrent souvent
que par trois valeurs. Trois fabriques — `eurFiltre`, `eurPerc`, `eurEffet` — les produisent, au lieu de
quarante fois le même code avec une faute de frappe quelque part.

**Quelques modules qui méritent un mot** : EUCLID répartit ses coups aussi régulièrement que possible, ce
qui donne ces rythmes qu'on retrouve dans toutes les musiques ; TURING est un registre à décalage dont on
règle la probabilité de mutation ; PLUCK est une corde pincée — une bouffée de bruit dans un délai qui se
réinjecte ; SVF sort simultanément passe-bas, passe-bande et passe-haut.

Les cinquante-six ont été construits et rendus un par un : **aucune erreur**. Trois ne produisent rien, et
c'est normal — un VCA fermé est silencieux, un quantificateur sort une tension continue.

**RACK AU SORT** monte un ensemble cohérent : horloge, source de rythme, deux ou trois voix, traitement,
mélangeur, sortie. Sans cette ossature, un tirage au sort ne sonne pas.

## Eurorack (version 55)

Un onglet d'une autre nature : **rien n'est câblé d'avance**. On pose des modules dans un rack et on les
relie soi-même. Quatorze modules pour commencer — CLOCK, SEQ 8, VCO, NOISE, VCF, VCA, ENVELOPE, LFO,
S & H, MIX 4, ECHO, REVERB, DRUM, OUTPUT.

**Le modèle de signal.** Tout circule en audio, y compris les commandes, comme sur un vrai modulaire.
Les entrées de hauteur sont branchées sur le **désaccord** des oscillateurs, exprimé en cents : cela donne
la réponse exponentielle du 1 V/octave sans aucun calcul. Le séquenceur sort des tensions quantifiées au
demi-ton.

**Le câblage au doigt.** Toucher une sortie l'arme, toucher une entrée pose le câble ; retoucher une entrée
câblée le retire. Une entrée n'accepte qu'un fil, une sortie en alimente plusieurs. Pas de glisser-déposer :
sur un téléphone, deux touchers valent mieux qu'un geste tenu.

**Reconstruction complète à chaque changement.** Plutôt que de démonter un branchement au milieu d'un
graphe audio vivant, tout le rack est rebâti. C'est plus court et cela évite les nœuds orphelins.

**Deux corrections d'affichage**, trouvées à l'image : les câbles plongeaient sous le rack — courbe réduite
et place ménagée en bas — puis passaient **derrière** les modules. Ils passent maintenant devant, comme en
vrai, sans capter le doigt : vérifié qu'un jack reste touchable sous un câble.

Le patch d'exemple monte une chaîne complète en neuf câbles et sonne à 0,786 de crête. Le rack est gardé en
mémoire, et l'export WAV fonctionne comme pour les autres machines.

## Behringer TD-3 (version 54)

Vingt-quatrième machine, et la première vraiment mélodique après l'EA-1. La 303 remise en circuit, avec ce
qui fait tout son caractère : un filtre résonant à **quatre pôles** balayé par une enveloppe, un accent qui
pousse le volume **et** le filtre, et un glissando qui enchaîne deux notes sans réattaquer.

**Une architecture différente de toutes les autres.** Les vingt-trois machines précédentes créent leurs
nœuds à chaque coup. Impossible ici : on ne peut pas glisser d'un oscillateur à un autre. La TD-3 garde
donc **une voix permanente** — oscillateur, deux filtres en série, ampli — dont on automatise la fréquence
et les enveloppes. Vérifié : lors d'un glissando, le niveau ne retombe qu'à 0,209 contre 1,062 avant, au
lieu de repartir de zéro comme une réattaque.

**Une correction de niveau.** La machine dépassait la pleine échelle — jusqu'à 1,43 avec accent. Un filtre
résonant amplifie sa bande ; le gain est maintenant rendu en fonction de la résonance, comme le fait le
circuit. Mesuré avec la chaîne maîtresse : de 0,37 à 0,78 selon les réglages, aucune saturation.

Trente-deux motifs en quatre groupes de huit, clavier de treize touches, marques d'accent, glissando et
tenue par pas, tirage d'une ligne en gamme mineure, distorsion, choix de l'onde, cinq teintes.

## Behringer RD-6 (version 53)

Vingt-troisième machine, et la moins coûteuse de toutes : le moteur TR généralisé à la version 39 l'a
accueillie sans rien changer à sa mécanique. Huit voix, **un seul potard par instrument — son niveau**.
C'est fidèle : la TR-606 n'avait rien d'autre.

**Les voix.** Grosse caisse tombant de 190 à 54 Hz en vingt-deux millisecondes, trois fois plus vite que
celle de la 808 : c'est son claquement sec. Charleys filtrés au-dessus de 9 kHz. Les huit mesurées, aucune
muette.

**Ce que la RD-6 ajoute à la 606**, et qui a demandé un bus de sortie propre : DIST et DRIVE passent toute
la machine dans une saturation — niveau efficace d'une grosse caisse de 0,052 à 0,088 —, TONE ferme le haut
du spectre, et le sélecteur CY/CP remplace la cymbale par le clap de la BR-110 : 0,65 s de cymbale contre
0,13 s de clap. Le bouton COULEUR fait défiler les **six teintes du commerce**, vérifiées distinctes.

**Une leçon de méthode.** Trois de mes blocs de modification ont échoué sur leur dernière ligne, annulant
au passage tout ce qui précédait — d'où une façade sans ses boutons et des couleurs sans feuille de style.
J'applique désormais **chaque modification séparément, avec écriture immédiate** : un échec ne fait plus
perdre que lui-même, et le journal dit lequel.

## Décalage humain et tirage au sort (version 52)

Deux idées reprises du manuel de **SEQ-16**, dans l'onglet Général de la notice.

**Le décalage humain** déplace chaque pas d'un peu de hasard — 0, 4, 8, 15, 25 ou 40 ms. Le tirage se fait
une fois par pas : tous les instruments d'un même pas bougent ensemble, comme une main qui arrive un peu
tôt. Mesuré : réglé à 40 ms, l'écart maximum observé est de 19,9 ms et l'écart moyen de 10,3 ms, ce qui est
la bonne répartition pour un tirage centré. Un coup ne recule jamais avant l'instant présent — vérifié sur
quarante cycles d'ordonnancement, l'avance minimale reste de 11,4 ms.

**Le tirage au sort des sons** rebat les réglages de la machine affichée **sans toucher au motif** :
on garde son rythme et on cherche un autre son. Les champs sont donnés machine par machine — un niveau
n'est pas un accord, et il ne faut pas mettre le volume à zéro par surprise. Les champs bipolaires restent
centrés. Vérifié sur neuf machines : sons changés, motif intact à chaque fois. La DMX et la CR-5000 le
disent au lieu de faire semblant.

**Une bévue attrapée au test** : le tirage ne changeait rien, parce que je rechargeais la machine depuis
la mémoire juste après — la mémoire écrasait le tirage. Il fallait garder d'abord, recharger ensuite.

**Et la même erreur pour la quatrième fois** : `HUM` et `WAVX` déclarés après le code qui les lit au
démarrage, script arrêté net. Le garde-fou du chargement contrôle maintenant aussi la **présence des
définitions attendues** — dix-neuf objets vérifiés une seconde après le démarrage — et le dit à l'écran au
lieu de laisser une page muette.

## Export audio (version 51)

Le manque le plus criant est comblé : le motif de la machine affichée se rend **hors ligne, plus vite que
le temps réel**, avec toute sa chaîne d'effets et le limiteur, et s'écrit en **WAV stéréo seize bits
44,1 kHz** dans le dossier Documents. De une à seize mesures, plus deux secondes et demie pour laisser
mourir les réverbérations.

**Trois obstacles, tous dus au même malentendu** — on ne peut pas simplement remplacer le contexte audio :

1. `audioInit()` sortait immédiatement si un contexte existait déjà. Les nœuds communs — délai, sorties,
   panoramiques — restaient donc dans l'ancien contexte. La construction est maintenant séparée de la
   création : `batirAudio()` rebâtit tout dans le contexte courant, quel qu'il soit.
2. Les machines gardent leurs nœuds en cache et refusent de les rebâtir tant qu'ils existent —
   `busEffets()` commence par `if(fxIn) return`. `razNoeudsMachines()` oublie tous ces champs avant
   reconstruction, par nom : `noeuds`, `entrees`, `sorties`, `regFx`, `voix`, `tubeIn`, `reverb`…
3. `ctx.resume()` était appelé sur un contexte de rendu, qui n'a pas à être repris.

Vérifié sur les **dix-sept machines à motif**, une par une : fichier RIFF/WAVE, deux canaux, 44100 Hz,
seize bits, durée juste, crêtes de 0,50 à 0,97, aucune saturation, et la machine correctement rechargée
après coup. Vérifié aussi que le son continue de fonctionner normalement après un export — c'était le
risque principal.

## Correction de compilation (version 50)

Les compilations #47 et #48 ont échoué, et c'était une **vraie erreur de ma part** dans le Java de la
version 48 : j'avais copié `ui.post(...)` depuis `Midi.java`, qui possède son propre gestionnaire de fil
principal. `MainActivity` n'en a pas — elle a `runOnUiThread()`. L'application ne compilait plus.

**Le contrôle qui manquait.** Mes vérifications Java portaient sur l'équilibre des accolades, des
parenthèses et des chaînes : elles ne pouvaient pas voir un objet inexistant. `verif-java.py` repère
maintenant tout identifiant utilisé comme objet — `x.methode()` — sans être déclaré dans le fichier, ni
importé, ni connu. Vérifié dans les deux sens : le contrôle signale bien `ui` sur la version fautive, et
ne dit rien sur la version corrigée.

Un faux positif a été corrigé au passage — les types qualifiés dans une boucle `for (A.B p : liste)`
n'étaient pas reconnus. Un contrôle qui crie au loup finit ignoré.

## Machine d'archive (version 49)

Vingt-deuxième machine, et celle qui en vaut quatre cent soixante-dix : elle n'imite personne, elle prend
les sons de **n'importe quelle boîte à rythmes de la collection** et en fait une machine jouable. Seize
pistes, seize pas, huit motifs, six réglages par piste — niveau, panoramique, accord, décroissance, point
de départ, filtre.

**Le rangement des pistes.** Les sons sont répartis d'après leur nom de fichier, par une liste
d'expressions : grosse caisse, caisse claire, rim shot, clap, charleys, toms, cymbales, cowbell, claves,
percussions. Vérifié sur une DMX simulée : BD1 → KICK, SD2 → SNARE, RIMSHOT → RIM, CLAPS → CLAP,
HIHAT-CLOSED → CH, HIHAT-OPEN → OH, TOM1/2/3 aux trois toms, CRASH et RIDE aux cymbales.

**Une piste rangée par reconnaissance porte son rôle ; une piste remplie faute de mieux porte le nom du
fichier.** Le premier essai affichait COWB au-dessus d'un shaker — un nom de rôle sur un son qui n'y
correspond pas. Corrigé : sur une LM-1 simulée, les pistes non reconnues affichent maintenant CABASA, LO
et HI, leurs vrais noms.

Le chargement prend les seize sons l'un après l'autre : l'avancement est visible, et un son qui refuse de
se décoder ne fait pas perdre les quinze autres. Les sons rejoignent aussi la bibliothèque sous le nom de
leur machine, donc restent disponibles pour les échantillonneurs et les MPC.

## La collection archive.org (version 48)

Quatrième rayon de la bibliothèque : la **collection de boîtes à rythmes de l'Internet Archive**,
470 machines et 48 000 échantillons en accès libre.

**La découverte qui rend la chose faisable.** La collection n'est pas 48 000 fichiers mais **470 archives
ZIP**, 3,8 Go en tout — certaines de 273 Mo. Télécharger une archive entière pour un son était hors de
question. Mais le dépôt sert les fichiers **un par un depuis l'intérieur des ZIP** :
`/download/<item>/<machine>.zip/<chemin interne>`. Rien n'est donc téléchargé en entier, ni décompressé :
on récupère le son écouté ou importé, quelques dizaines de kilooctets.

- **Java** : permission INTERNET, téléchargement sur un fil séparé avec deux plafonds — la taille annoncée
  et la taille réellement lue —, délais de connexion et de lecture, HTTPS seulement, et un rappel vers la
  page quand c'est fini.
- **Liste des machines** par l'API de métadonnées, gardée en mémoire, avec recherche.
- **Contenu d'une machine** par sa page d'archive. Le lecteur de liens accepte **deux formes** : chemin
  complet et lien relatif — je n'ai pas pu voir le vrai HTML depuis ici, et une seule forme aurait été un
  pari.
- **Import** : le son passe par le traitement choisi et le rééchantillonnage à 32 kHz, et prend le nom de
  sa machine.

Vérifié sur un dépôt simulé : liste filtrée des .zip, recherche, contenu d'une machine avec les fichiers
non sonores écartés, URL de son exacte, téléchargement, décodage et import nommé « Oberheim BD1 ». Sans
pont réseau, le rayon le dit au lieu de rester muet.

On y trouve les vraies machines dont l'application propose des recréations — DRM-15, DRM-16, DRM-32, les
Electribe, les MPC, les TR-808, 909 et 707, la DMX, la volca sample. De quoi comparer ma synthèse aux
enregistrements d'origine.

## Roland TR-1000 (version 47)

Dernière des sept, et la plus fournie. **Deux couches par instrument** : une voix analogique avec ses TUNE,
DECAY et deux réglages propres, et une couche d'échantillon prise dans la bibliothèque, mélangées par un
potard A/B. Dix instruments, cinquante potards, dix curseurs de niveau.

**Le morphing.** SET A mémorise l'état de tous les potards, SET B un second, et le curseur MORPH interpole
chaque réglage. Vérifié : avec A à 0,2 et B à 0,9, le curseur donne 0,2 — 0,375 — 0,55 — 0,725 — 0,9.
Represser SET A ou SET B rend la main aux potards.

**Les sous-pas.** SUB STEP change ce que font les seize touches : chacune règle le nombre de coups de son
pas, de un à quatre. Mesuré sur un pas de 125 ms avec quatre sous-pas : déclenchements à 1,000, 1,031,
1,063 et 1,094 s.

**ANALOG FX ne touche que la couche analogique** — filtre passe-bas et saturation —, comme sur l'appareil
où le circuit l'est réellement. Réverbération et délai reçoivent les deux couches.

Les dix voix mesurées, aucune muette. Une mesure avec ANALOG FX engagé : crête 0,942, aucun échantillon
saturé.

**Un écart assumé** : les six potards assignables C1 à C6 de la vraie machine sont remplacés par les
réglages fixes de chaque instrument. Sans écran de menu, des potards sans affectation visible n'auraient
rien voulu dire.

## Arturia DrumBrute Impact (version 46)

Septième machine, et la seule de l'application qui fasse de la **polyrythmie**. Chaque piste garde sa
propre longueur : seize pas, douze, sept, et elles ne se retrouvent qu'au bout de leur plus petit commun
multiple. L'ordonnanceur calcule ce cycle et le plafonne à 64 pas. Mesuré : trois pistes de 16, 12 et 7
donnent un cycle de 64, et 16/12/12 en donnent un de 48.

**La couche COLOR** remplace les potards par une seconde série de huit réglages — saturation de la grosse
caisse, corps de la caisse 1, clap sur la caisse 2, chute du tom, timbre de cymbale, chute du charley
fermé, harmoniques de l'ouvert, enveloppe de hauteur du FM. Vingt-deux potards en mode normal, huit en
mode couleur, et le repère passe à l'orange.

**La FM DRUM est une vraie modulation de fréquence** : porteuse, modulante, intensité décroissante. Le TOM
et la CYM/COW ont deux personnalités chacun.

**Le potard RANDOM** ôte des coups et en ajoute, différemment à chaque tour : seize pas posés tombent entre
sept et treize au maximum. **DISTORTION** passe la sortie dans une saturation — niveau efficace de 0,082 à
0,131 sur une grosse caisse.

Les huit voix mesurées, aucune muette, de 0,04 s pour le charley fermé à 0,84 s pour la cymbale.

## Roland CR-5000 CompuRhythm (version 45)

Sixième machine de la liste, et une **boîte à présélections** : on ne programme rien, on choisit un des
vingt-quatre rythmes — trois banques de huit — et on le sculpte. Même famille que les DRM16 et DRM32, mais
avec de quoi intervenir sur ce qui joue.

**L'arrangeur** est son idée maîtresse : six touches qui **ajoutent un instrument par-dessus** le rythme.
Mesuré sur ROCK 1 en comptant les déclenchements : douze coups par mesure, vingt-huit avec HH-16,
trente-six en ajoutant la conga.

**Breaks** : INTRO/FILL IN sur la mesure en cours — dix-sept coups au lieu de douze, mesuré — et AUTO FILL
toutes les deux à seize mesures. CRASH à la volée, SHUFFLE sur les temps pairs.

Les vingt-quatre rythmes sont écrits un par un : WALTZ, SWING 1 et 2, S.ROCK, TANGO, HABANERA, ENKA, BD-4,
les six ROCK, DISCO, FOX TROT, SAMBA 1 et 2, MERENGUE, MAMBO, CHACHA, RHUMBA, BEGUINE, BOSSANOVA. Les
ternaires tournent en **douze pas** au lieu de seize, l'afficheur le rappelle.

Dix voix de 1980, plus simples que celles de la 808. Six mesures mesurées avec la chaîne maîtresse :
crêtes de 0,775 à 0,999, rien au-dessus de la pleine échelle.

**Deux écarts assumés**, dits dans la notice : INTRO/FILL IN et AUTO FILL sont des potards sur l'appareil,
ici des touches qui font défiler les valeurs ; et le bouton REGISTER, qui mémorise les réglages de
l'arrangeur, est devenu le sélecteur d'AUTO FILL.

## Korg volca sample (version 44)

Dix parties, seize pas, dix motifs. Chaque partie a son échantillon, ses **onze potards** — ceux du format
Korg, ni plus ni moins — et ses cinq interrupteurs : mouvements, boucle, réverbération, lecture inversée,
coupure. Les mouvements s'enregistrent potard par potard, pas par pas.

**Motifs au format Korg.** EXPORT écrit le motif courant en **2624 octets** : en-tête PTST, code d'appareil
0x33B8, dix parties de 256 octets, pied PTED, petit-boutiste. IMPORT relit un fichier du dossier Documents,
qu'il vienne d'ici, du librarian officiel ou d'un preset d'usine.

Le format et sa lecture viennent de **MOC'TA BASS**, y compris la réserve de son auteur : l'échelle exacte
des valeurs de mouvement n'est pas documentée par Korg, c'est une interprétation.

Aller-retour vérifié à l'octet près : pas `0x1111`, vitesse 90, coupe-haut 64, réverbération et lecture
inversée actives, mouvement de niveau relu, et la partie 4 retrouvée avec son `0x4444`.

**La même bévue pour la troisième fois** : classe du corps et classe du châssis portant le même nom, écran
noir sans erreur JavaScript. J'ai donc ajouté un **garde-fou au chargement** qui parcourt la liste des
classes de corps et signale toute collision, dans la console et à l'écran. Je ne la referai plus sans le
savoir.

## Oberheim DMX (version 43)

Quatrième machine de la liste, et la première d'une autre famille : pas de pas à allumer, on joue sur ses
**vingt-quatre touches** et elle enregistre au vol, calé par QUANTIZE. La logique de 1981, celle que les
MPC reprendront.

**Trois variations par instrument**, sa signature : BASS 1, 2 et 3 sont le même son accordé autrement —
48, 55 et 42 Hz, avec des décroissances de 0,28, 0,22 et 0,36 s. Pareil pour la caisse claire, les charleys
et les cymbales. Les six toms descendent de 170 à 68 Hz.

**Le grain huit bits.** Ses sons sont des enregistrements de vraie batterie en huit bits. Ici toutes les
voix passent par le même goulot : passe-bas à 10,5 kHz et quantification sur huit bits — bien plus dur que
les douze bits de la TR-707, et c'est ce qui fait l'essentiel de son caractère.

Façade fidèle : rayures bleues sur fond gris, joues de bois, afficheur rouge, neuf curseurs — un par
famille plus métronome et volume —, clavier numérique et les quatre rangées de commandes.

Les vingt-quatre voix mesurées, aucune muette, de 0,02 s pour le rimshot à 1,31 s pour la crash.
Deux mesures avec la chaîne maîtresse : crête 0,964, aucun échantillon saturé.

## Deux exports (version 42)

**Vers la carte de l'ES-1.** La bibliothèque écrit tous les sons en WAV 32 kHz, seize bits, mono, nommés
`00.WAV` à `99.WAV`, plus un `names.txt` rappelant à quoi correspond chaque numéro. Ce sont les contraintes
exactes relevées dans **KorgManager** : au-delà de cent fichiers ou à un autre taux, la machine refuse la
carte avec Er.4. Les sons d'une autre fréquence sont rééchantillonnés à l'écriture, vers le haut comme vers
le bas. Vérifié sur la banque entière : vingt-quatre fichiers, en-tête RIFF/WAVE, un canal, 32000 Hz,
seize bits.

**Fichier MIDI de type 1.** L'export passe du format 0 — tout dans une seule piste — au **format 1, une
piste par son**, chacune nommée. L'idée vient de **fabkorg**, dont le mode ER-1 sépare les sons par numéro
de note. Une piste de tête porte le tempo, comme le veut le format.

Vérifié sur une prise mêlant percussions et mélodie : cinq pistes, nommées « Ma prise », « C4 ch1 »,
« B », « 3/ST. », « 1/ST. » — les noms de parties de la machine quand la note en désigne une, le nom de
note et le canal sinon.

## Traitement du son (version 41)

Chaîne reprise de **MOC'TA BASS** (janintibo-art), transposée en traitement hors ligne dans la page :
offset continu, passe-haut à deux pôles, coupe des silences, porte de bruit, accentuation de l'attaque,
compression, saturation, mise à niveau en **LUFS** avec pondération K, fondus, et limiteur à anticipation.
Six préréglages — doux, punch, max, loop, sub, voix.

Deux règles de son auteur, gardées telles quelles parce qu'elles sont justes :

- la **saturation passe avant la mise à niveau**, sinon elle déplace le niveau qu'on vient de caler ;
- le **gain supplémentaire déplace la cible** au lieu de s'ajouter après, sinon le limiteur le reprend.

Mesuré sur un coup de grosse caisse à −50 LUFS avec offset continu et souffle : **+32 dB** en *doux*,
**+40 dB** en *max*, crête finale à −0,19 dB pour un plafond à −0,2, aucun dépassement sur les trois
préréglages. L'offset de 0,15 tombe à 3·10⁻⁵.

Le traitement s'applique aux sons enregistrés au micro et importés, et à la demande par son.

**Égaliser le kit.** Aligne le niveau perçu des parties de la machine affichée. La méthode vient du même
projet — mesurer, corriger, recommencer, parce que la réponse au gain n'est pas linéaire — avec une
différence assumée : là-bas le levier est le fichier, ici c'est un bouton de niveau. Aligner sur le plus
faible descendrait tout le kit de dix-sept décibels dès qu'un son est très en dessous ; on vise donc la
médiane, et l'application dit combien de sons n'ont pas pu l'atteindre.

Mesuré : sur des sons déjà traités, écart de 3,24 → **0,15 dB**. Sur des sons bruts d'écart 28 dB, quatre
sons signalés comme trop faibles, avec l'invitation à les traiter.

**Optimiser la mémoire.** Repère les sons sans aigu et abaisse leur taux : une grosse caisse à 70 Hz
descend à 8 kHz, les trois quarts de sa place rendus. Un son à 6 kHz ou du bruit restent à 32 kHz.

## Roland TR-707 (version 40)

Troisième des sept, et la première qui n'aura presque rien coûté : le moteur TR généralisé à la version
précédente a suffi. Quinze instruments, un seul réglage chacun — son niveau. C'est fidèle : la 707 n'a que
des curseurs de niveau, ses sons étant des échantillons figés.

**Le goulot commun.** Toutes ses voix passent par le même passage obligé : passe-bas à 9,5 kHz et
quantification sur douze bits, qui reproduit le convertisseur de 1985. C'est ce traitement appliqué
uniformément, plus que le détail de chaque voix, qui donne à la 707 son grain sec et un peu terne.

**L'écran à points** est reproduit sous les touches : une ligne par instrument, une colonne par pas,
l'instrument choisi entouré. On y lit le motif entier d'un coup d'œil — aucune autre machine de
l'application ne le permet.

Relevés des quinze voix, toutes audibles, de 0,01 s pour le rim shot à 0,92 s pour la crash.
Trois mesures avec la chaîne maîtresse : crêtes 0,93, 0,85 et 0,96, aucun échantillon saturé.

## Roland TR-909 (version 39)

Deuxième des sept. Avant de l'écrire, le module TR-808 a été **généralisé** : séquenceur, motifs,
variations, écriture, mémoire et interface sont maintenant communs, et chaque modèle n'apporte que sa liste
d'instruments et ses voix. La façade se reconstruit au changement de machine. La TR-707 en profitera.

**Les peaux** restent analogiques mais plus serrées que sur la 808 : la grosse caisse a son ATTACK séparé
du TONE et une chute de hauteur trois fois plus rapide, les toms ont une part de bruit en passe-bande, la
caisse claire passe en passe-haut réglable au lieu du passe-bande.

**Les métaux** sont échantillonnés en six bits sur l'appareil d'origine. Ici ils sont synthétisés puis
passés dans un **quantificateur à six bits** — c'est ce grain, et non la forme d'onde, qui fait reconnaître
un charley de 909.

**FLAM** double chaque coup 28 ms plus tard, vérifié au comptage : `[1.000, 1.028]`. **SHUFFLE** retarde
les pas impairs, mesuré à +18,8 ms pour 30 % sur un pas de 125 ms.

Relevés des onze voix : grosse caisse 70 Hz, toms 90 / 125 / 180 Hz, métaux entre 8,3 et 9,8 kHz.
Une mesure complète avec la chaîne maîtresse : crête 0,956 et 0,993 selon le motif, aucun échantillon saturé.

## Roland TR-808 (version 38)

Première des sept machines de la nouvelle liste. **Aucun échantillon** : les douze voix sont refaites
d'après les circuits d'origine.

- **Grosse caisse** : oscillateur accordé à chute de hauteur, TONE dosant le claquement d'attaque et DECAY
  la longueur — mesuré de 0,05 à 0,76 seconde. Fondamentale relevée à 65 Hz.
- **Caisse claire** : deux oscillateurs accordés plus du bruit en passe-bande, TONE déplaçant les deux et
  SNAPPY dosant le bruit.
- **Toms** : chute de hauteur accordée par TUNING. Relevés à 95, 145 et 205 Hz.
- **Métaux** : les **six carrés inharmoniques** de l'appareil (rapports 1 / 1,342 / 1,2312 / 1,6532 /
  1,9523 / 2,1523) en passe-haut et passe-bande. Le charley fermé coupe l'ouvert — vérifié : l'énergie de
  l'ouvert après 250 ms tombe à zéro.
- **Clap** : trois bouffées de bruit espacées de onze millisecondes puis une queue, ce qui fait son grain.
- **Cowbell** : deux carrés à 540 et 800 Hz dans un passe-bande à 2640.

Séquenceur seize pas, seize motifs, variations A et B, piste d'accent avec son niveau, LAST STEP, et mode
écriture ou lecture des motifs. Les réglages de sons sont propres à chaque motif.

Une mesure du motif d'usine : crête 0,93, aucun échantillon saturé.

**La même bévue qu'à l'arrivée des MPC** : classe du corps et classe du châssis portant le même nom, écran
noir sans erreur JavaScript. Le châssis s'appelle `rtr`, que les TR-909 et TR-707 partageront.

## MPC : quatre-vingt-dix-neuf pistes (version 37)

Ce que je croyais hors de portée ne l'était pas. Mesuré avant d'écrire quoi que ce soit :

| | |
|---|---|
| Balayage de l'ordonnanceur, 20 000 événements | **47 µs par pas** |
| Budget disponible par pas à 120 BPM | 125 000 µs |
| Séquence de 99 pistes, 8 remplies | 14 ko |
| Les 99 remplies de 60 notes | 74 ko |

Aucune des trois objections que j'aurais pu invoquer ne tenait. L'interface non plus : une vraie MPC gère
ses 99 pistes avec quatre lignes d'afficheur et une molette, exactement ce que j'ai.

**Ce qui a changé.** Une séquence n'est plus une liste d'événements mais un jeu de 99 pistes, chacune avec
son type — DRUM pour les pads internes, MIDI pour le matériel branché —, son canal, son nom, sa coupure et
son solo. L'ordonnanceur boucle sur les pistes actives ; l'enregistrement, l'effacement, le pas à pas et
l'annulation visent la piste courante. Sur une piste MIDI, frapper un pad envoie la note du pad au lieu de
déclencher son son.

**Le vrai gain** : la MPC devient le séquenceur des Korg. Piste 1 sur les pads internes, piste 2 vers l'ES-1
sur son canal, piste 3 vers l'EMX-1, le tout enregistré au vol avec le Timing Correct.

Vérifié : aiguillage des trois types de piste, coupure d'une piste MIDI, solo qui éteint tout le reste,
enregistrement sur la piste 2 qui laisse la piste 1 intacte, et **reprise automatique des anciennes
sauvegardes**, dont les événements atterrissent sur la piste 1. Une séquence de 99 pistes dont trois sont
occupées pèse 8,3 ko : seules les pistes non vides ou modifiées sont écrites.

## MPC : options complétées (version 36)

- **Réglages de pad** : point de départ dans le son, lecture à l'envers, dosage de la force de frappe sur le
  volume, et **groupes de coupure** — deux pads du même groupe s'arrêtent l'un l'autre, les quatre charleys
  y étant d'office comme sur l'appareil. Vérifié au rendu : point de départ à la moitié, le niveau efficace
  d'un crash passe de 0,097 à 0,024.
- **16 LEVELS** ne fait plus varier que la force : au choix la force, l'accord, le point de départ ou la
  décroissance, comme sur les vraies.
- **STEP EDIT** : l'afficheur passe en revue des événements, la molette les parcourt en les faisant entendre,
  − et + décalent d'une triple croche, ERASE retire, UNDO revient.
- **SONG** : enchaînement des huit séquences avec nombre de tours par pas.
- **COUNT IN** : une mesure de décompte au métronome avant que l'enregistrement ne morde.
  **WAIT KEY** : la séquence attend la première frappe pour partir.
- **Séquences** renommables, copiables d'une place à l'autre, avec **tempo propre** ou tempo général.
- **DISK** ouvre la bibliothèque.

Tout est gardé en mémoire, y compris la chanson et les réglages de pad : vérifié par redémarrage.

## Bibliothèque (version 35)

Une tuile de plus, qui rassemble ce qui était éparpillé — et qui ajoute le filet de sécurité qui manquait.

**Sons.** La banque interne et tous les enregistrements dans une seule liste : écouter, renommer, supprimer,
importer, enregistrer au micro, et **affecter** un son à la partie ou au pad choisi. La machine visée est
chargée automatiquement ; l'affectation marche sur les deux ES-1, l'ESX-1, les deux MPC, et sur l'EMX-1 et
l'ER-1 mkII pour les sons de banque, les seuls qu'elles savent lire.

**Prises MIDI.** Jouer, renommer, exporter en .mid, ou ouvrir directement dans l'éditeur en rouleau.

**Sauvegardes de machine.** Le point important. Une demande envoyée sur les seize canaux réclame à la Korg
branchée **tous ses motifs, toutes ses chansons et ses réglages généraux**, et les écrit en vrais fichiers
`.syx` dans le dossier Documents de l'application. Un bouton les renvoie pour remettre la machine exactement
comme elle était. C'est ce qu'il fallait avoir avant de laisser le transfert de motifs écrire quelque part :
maintenant, tout est réversible.

**Tout est renommable** : sons, prises et sauvegardes. Les noms sont gardés à part et remplacent partout le
nom d'origine, y compris sur les afficheurs des machines.

Trois méthodes Java de plus — lister, relire et supprimer un fichier de Documents — et l'écriture passe
toujours par un fichier temporaire puis un remplacement.

## Akai MPC3000 et MPC2000 (version 34)

Deux machines d'une autre famille, et surtout d'une **autre logique** : on ne pose pas des pas, on joue sur
seize pads et la machine enregistre au vol.

- **Séquenceur temps réel** en quatre-vingt-seize tics par noire, comme l'appareil d'origine. Chaque frappe
  est datée au tic près à partir de l'heure audio, puis calée par le **Timing Correct** au moment de
  l'enregistrement — croche, triolet, double croche, triple, ou rien du tout. Vérifié : huit frappes jouées
  à la main tombent toutes sur des multiples de 24 tics en 1/16.
- **Vélocité par l'endroit de la frappe** : haut du pad doux, bas fort. **FULL LEVEL** force au maximum,
  **16 LEVELS** étale un son sur les seize pads, **NOTE REPEAT** répète à la cadence du Timing Correct.
- **Quatre banques** de seize pads, huit séquences, **UNDO SEQ** qui va et revient, **ERASE** qui retire
  toutes les frappes d'un pad, groupes de coupure pour que le charley fermé arrête l'ouvert.
- Les sons viennent de la **banque commune** et des enregistrements faits dans l'ES-1 ou l'ESX-1 : la même
  mémoire d'échantillons sert aux cinq machines.
- Façades distinctes : champagne et afficheur bleu pour la 3000, grise et afficheur vert pour la 2000, avec
  les pads à gauche sur l'une et à droite sur l'autre, comme sur les vraies.

**Une bévue instructive** : j'avais donné le même nom, `mpc`, à la classe posée sur le `body` pour choisir la
machine et à celle du châssis. La règle du châssis s'appliquait donc au `body` lui-même, qui passait en
`display:none` et se retrouvait à zéro pixel de large — écran noir, sans la moindre erreur JavaScript. Le
châssis s'appelle maintenant `akai`. Toutes les autres machines utilisaient déjà des noms distincts pour les
deux rôles, par chance plus que par méthode.

## Menu défilant (version 33)

À quatorze tuiles, le menu était resserré de version en version pour tenir dans un écran : caractères
réduits, marges rognées. Il défile maintenant, et les tuiles retrouvent une taille confortable — titres à
30 px, sous-titres lisibles, respiration entre les blocs.

Un **voile dégradé** apparaît en bas tant qu'il reste des tuiles plus bas, et disparaît quand on atteint la
fin : sans lui, rien ne dit qu'il y a autre chose sous le bord de l'écran. Il est masqué dès qu'une machine
est ouverte.

Vérifié dans les quatre formats : la dernière tuile est atteignable et cliquable après défilement,
et le voile s'éteint bien en bas de course.

## Travail du MIDI : éditeur en rouleau (version 32)

Nouvelle tuile **TRAVAIL DU MIDI**. Une prise de l'enregistreur y est convertie en notes — les paires
marche/arrêt sont appariées pour retrouver les durées — et affichée en rouleau, **une piste par son**.
Les parties de percussion portent le nom qu'elles ont sur la machine choisie, les notes mélodiques leur
hauteur et leur canal.

- **Édition au doigt** : toucher une case vide ajoute une note et la fait entendre, toucher une note la
  choisit, la faire glisser la déplace en se calant sur la grille ; glisser sur la règle ou la marge fait
  défiler. Les boutons déplacent, allongent, transposent d'une piste, doublent, suppriment.
- **TOUT CALER** aligne toutes les notes sur la grille — double croche, croche, triolet, ou libre.
  Vérifié : 17, 268, 511, 759… deviennent 0, 250, 500, 750.
- **Relecture** avec tête de lecture, par le même chemin que l'enregistreur : le son sort du téléphone.
- **VERS LE MOTIF** reporte les notes dans le motif de la machine choisie, la position dans la mesure
  donnant le pas et la note donnant la partie. De là, le transfert par exclusif les emmène dans la vraie
  Korg. Vérifié sur l'EMX-1 : notes 36, 38 et 42 rangées dans les parties 1, 3 et 6B aux bons pas.
- **GARDER** réécrit la prise à partir des notes, **.MID** l'exporte.

Le rouleau est dessiné sur un canevas, redimensionné à la densité de l'écran, avec règle de mesures,
alternance des pistes, marge de noms figée et vélocité rendue par l'opacité des blocs.

Deux bévues de même famille attrapées au test : `PR` et `ENR` étaient déclarés dans leurs modules, en fin
de script, alors que le câblage de l'interface s'en sert bien avant — une affectation sur un objet encore
indéfini interrompait tout le chargement. Les deux sont maintenant déclarés en tête.

## Enregistreur MIDI (version 31)

Nouvelle tuile au menu : **ENREGISTREUR MIDI**. On branche la Korg sur l'entrée MIDI, on choisit dans la
page la machine qui fait le son, et on enregistre : ses notes déclenchent les parties de la machine
choisie, **le son sort du téléphone**, et tout ce qui arrive est daté à la milliseconde.

- **Capture** : accrochée à l'entrée du récepteur MIDI, avant tout traitement ; l'horloge et les messages
  temps réel sont écartés, ils n'ont pas de sens dans une prise. Limite de vingt mille événements.
- **Relecture** : les événements repassent par le même chemin, donc même machine, mêmes sons, même rythme.
  L'enregistrement est suspendu pendant la relecture pour ne pas se mordre la queue.
- **Prises** gardées en mémoire avec leur date, leur durée, leur tempo et la machine utilisée ; vingt-quatre
  au plus.
- **Export en fichier .mid** de type 0, division 480, avec l'événement de tempo en tête et la fin de piste
  réglementaire, écrit dans le dossier Documents de l'application par un nouveau pont Java. Vérifié :
  en-tête `MThd`, format 0, une piste, division 480, piste terminée par `FF 2F 00`.

Une bévue attrapée au passage : les deux tuiles de service du menu portent la classe `.pick`, donc le
sélecteur de machine générique se déclenchait aussi, avec un identifiant vide — et plantait la mise en
place du modèle. Les tuiles sans `data-m` sont maintenant ignorées par ce sélecteur.

## Télécommande des vraies machines (version 30)

Avec le réglage **PILOTER LA MACHINE**, tourner un bouton dans l'application envoie le message
correspondant à la Korg branchée : elle suit en direct.

- **ES-1** : NRPN de poids fort 5, sept paramètres par partie (hauteur, niveau, filtre, panoramique,
  envoi d'effet, roulement, lecture inversée), plus le délai, le type et les réglages d'effet et le niveau
  d'accent. D'après sa notice d'implémentation officielle.
- **EMX-1** : percussions en NRPN adressé partie par partie (poids fort 9 à 11, quinze paramètres chacune),
  synthés en contrôleurs continus sur leur propre canal, effets et chaîne en contrôleurs globaux.
  D'après midi.guide, licence CC BY-SA 4.0.
- **ER-1** : NRPN de poids fort 2. Les messages s'appliquent à la partie choisie sur la machine elle-même :
  son implémentation ne permet pas de la désigner à distance, et c'est dit dans la notice.

Le débit est limité à vingt-cinq messages par seconde et par paramètre, la dernière valeur étant toujours
transmise : un doigt qui tourne produit soixante mouvements par seconde, soit cent quatre-vingts messages
NRPN — plus que ne peut en absorber une liaison MIDI à 31250 bauds. Mesuré : soixante mouvements donnent
deux messages.

Vérifié message par message : ES-1 partie 3 niveau → `5/17/127`, panoramique à gauche → `5/19/0`,
délai → `5/96` et `5/97` ; EMX-1 percussion 1 niveau → `9/39`, percussion 7B hauteur → `11/33`,
synthé 1 coupure → CC 74 sur son canal, effet 2 → CC 94 sur le canal global.

## Transfert de motifs par exclusif (version 29)

Deux formats implantés d'après les tableaux d'implémentation MIDI officiels : l'**ES-1**
(en-tête `F0 42 3c 57`, motif de 1732 octets) et l'**electribe de 2015** (`F0 42 3g 00 01 23`,
16384 octets). Le pont Java sait maintenant émettre et recevoir des messages exclusifs de
longueur quelconque, et l'analyseur du flux entrant ne les confond plus avec des notes.

**La méthode n'invente aucun octet.** On demande d'abord son motif courant à la machine — la
demande part sur les seize canaux, inutile de connaître son canal global —, on garde ses octets
comme gabarit, et on ne réécrit que ce dont la place est connue. Les numéros d'échantillons, les
champs réservés et tout ce que la spécification ne détaille pas restent les siens.

Vers un **ES-1**, depuis l'ES-1 de l'application, le transfert porte : la grille des neuf parties
et de l'accent, les niveaux, panoramiques, hauteurs et filtres, les interrupteurs lecture inversée,
roulement et effet, les mouvements de boutons avec leur type et leur destination, le type et les
deux réglages de l'effet, le délai et sa synchronisation, le swing, le niveau d'accent et le tempo.

Vers une **electribe de 2015**, depuis n'importe quelle machine, il porte la grille de pas et les
notes des parties mélodiques, avec la vélocité prise sur les pistes d'accent.

Vérifié par aller-retour complet : codage sept-vers-huit réversible à l'octet près, message ES-1 de
1986 octets pour 1732 utiles, tempo 132 retrouvé exactement, numéros d'échantillons de la machine
intacts, grilles et mouvements à la bonne place.

Le motif part dans la **mémoire d'édition**, jamais dans un emplacement rangé : rien n'est écrasé
tant que l'utilisateur n'appuie pas sur Write sur la machine. La lecture est arrêtée d'office, les
Electribe n'acceptant aucun message exclusif pendant qu'elles tournent.

## Jouer avec une vraie Electribe (version 28)

L'application peut maintenant **mener ou suivre**.

**Suivre.** Le réglage `HORLOGE : SUIVIE` arrête l'ordonnanceur interne : ce sont les tics reçus qui font
avancer le séquenceur, un pas tous les six tics, et le tempo affiché se déduit de leur cadence par moyenne
glissante. Les pas sont programmés 30 ms en avant pour absorber la gigue du pont Java. En esclave,
l'application n'envoie plus d'horloge, pour ne pas se battre avec la machine qui mène.

Vérifié : 96 tics à 20 ms donnent exactement **125 BPM déduits et 16 pas avancés**, le départ et l'arrêt
reçus sont respectés, et aucune horloge n'est émise.

**Mener, et transférer.** Les notes envoyées suivent désormais une **note de base réglable** (24, 36, 48, 60)
et un **canal mélodique** séparé du canal de percussions, pour tomber sur ce qu'attend la machine d'en face.
La méthode est décrite dans la notice : on met la Korg en enregistrement temps réel, on lance la lecture ici,
elle reçoit le départ, l'horloge et les notes, et enregistre le motif au fil de la mesure.

## Mouvement des effets et Step Edit (version 27)

**Motion Seq sur les effets.** Possible sans heurt seulement depuis que les effets se règlent en place :
enregistrer une courbe voulait dire, auparavant, reconstruire le graphe audio à chaque pas. Disponible sur
l'EM-1 (EDIT 1 ou temps de délai selon DELAY EDIT), l'ER-1 (profondeur et temps du délai, par la troisième
position du bouton TYPE), l'EMX-1 et l'ESX-1 (FX EDIT de l'emplacement choisi). La courbe est gardée avec le
motif. Vérifié au rendu : avec un filtre balayé par le mouvement, la brillance du motif passe de 0,008 à 0,06.

**Step Edit** fait enfin quelque chose. Sur l'EM-1, l'EMX-1 et l'ESX-1, les touches y **choisissent** un pas
au lieu de le basculer : un cadre le marque, l'afficheur montre son contenu — la note pour une partie
mélodique — et la molette le modifie. On corrige une mélodie sans risquer d'effacer un pas d'un doigt mal
placé.

## Pattern Set

Les cinq Electribe ont enfin leur **PATTERN SET** : les seize touches deviennent un sélecteur de motifs,
changement immédiat même en pleine lecture, touche allumée sur le motif en cours. Sur l'EMX-1 et l'ESX-1
elles affichent A.1 à D.4, et le même bouton continue de changer de gamme quand le clavier est actif.

## Qualité sonore

Mesures faites au rendu hors ligne, sinus de 220 Hz traversant la chaîne maîtresse.

**Avant** : le limiteur travaillait à −7 dB avec un rapport de 20 et sans coude, suivi d'une saturation
permanente. Résultat : **2,6 % de distorsion à niveau normal, 8,4 % un peu plus fort**, et un gain qui
tombait de 2,07 à 1,03 — tout était écrasé en permanence, d'où un son terne et sans attaques.

**Après** : limiteur à −1,2 dB avec coude, et écrêteur parfaitement droit jusqu'à 0,84 qui n'arrondit que le
sommet. **0,00 % de distorsion jusqu'à pleine échelle**, gain constant, et moins de 1 % quand on pousse
volontairement au-delà. Le niveau par défaut est remonté de 0,72 à 0,85, la marge le permet.

Autres corrections :

- **Banque d'échantillons en 44,1 kHz** au lieu de 22 kHz : la bande passante double, les charleys, crashs
  et shakers retrouvent leur haut du spectre. Les enregistrements au micro passent de 22 à 32 kHz.
- **Tranches sans claquement** : l'ES-1 posait le gain d'un coup au début et à la fin d'une tranche. Une
  attaque et une chute de 3 ms suppriment le clic.
- **Valve Force** : la courbe restait courbée même à gain zéro — l'EMX-1 et l'ESX-1 étaient distordus en
  permanence. Elle est maintenant parfaitement droite à zéro. Et la dissymétrie, qui n'était qu'un facteur
  d'échelle, est devenue un **décalage avant la courbe** : les harmoniques **paires** dominent enfin les
  impaires (17 % contre 8 % à mi-course), ce qui est le comportement d'une lampe.
- Niveaux des voix de l'ES-1 et de l'ESX-1 revus : plus aucun échantillon saturé sur une mesure dense.

## Notices

Huit notices complètes en français, écrites pour **ces** machines : GÉNÉRAL, DRM16 · DRM32, EM-1, ER-1,
EA-1, ES-1, EMX-1, ESX-1. Chacune suit le même plan — prise en main en trois pas, les commandes, les
fonctions SHIFT, et ce qui diffère de l'appareil d'origine.

Les notices officielles Korg ne peuvent pas être intégrées : ce sont des documents sous droit d'auteur, et
l'application n'a de toute façon aucun accès réseau. Elles décriraient d'ailleurs des machines qui diffèrent
de celles-ci sur plusieurs points.

**Accès.** Un bouton **NOTICE** est posé en haut à droite de l'écran, visible sur toutes les machines, et
masqué quand le menu ou la notice sont ouverts. Le menu a aussi son entrée **NOTICES**, qui ouvre le sommaire
sans charger de machine. La référence de l'appareil, en haut à droite de chaque façade, continue d'ouvrir sa
propre notice.

**Lecture.** Fond opaque — l'ancienne notice laissait transparaître la façade et devenait illisible —, barre
de titre fixe avec le bouton FERMER toujours atteignable, et une rangée d'onglets pour passer d'une machine
à l'autre. Les réglages MIDI, haptique, arrière-plan et le bouton PANIQUE sont rassemblés dans l'onglet
GÉNÉRAL.

## Zoom

Deux doigts qui s'écartent agrandissent la façade, jusqu'à quatre fois.

Une fois agrandie, elle se déplace **d'un seul doigt posé sur le fond** : le geste ne démarre que si le
doigt ne touche ni bouton, ni bouton rotatif, ni case, ni molette, ni ruban — `estCommande()` fait le tri
en remontant l'arbre. Un doigt sur une commande règle la commande, comme avant. Deux doigts déplacent
également, où qu'ils soient posés.

**Deux appuis brefs sur le fond** remettent à plat, pincer jusqu'au bout également, changer de machine aussi.
Le déplacement est borné au débordement réel, avec 26 px de marge pour que les bords restent atteignables ;
vérifié à 3,6× : façade poussée à fond, le bord droit revient dans l'écran.

Tout geste en cours sur un bouton est gelé pendant un pincement, pour qu'un doigt déjà posé sur un réglage
ne le fasse pas bouger.

Le zoom vient s'ajouter à la mise à l'échelle automatique : `ZOOM.base` est le facteur calculé pour faire
tenir la façade, `ZOOM.z` celui de l'utilisateur, et le déplacement est borné au débordement réel.

## MIDI

Le MIDI passe par l'API MIDI d'Android (`android.media.midi`, classe `Midi.java`) plutôt que par le Web MIDI,
dont le support en WebView n'est pas garanti. Il fonctionne donc avec une carte USB-C vers MIDI.

- **Sortie** : chaque coup part en note — percussions sur le canal réglable (canal 10 par défaut, notes General
  MIDI), notes du synthé de l'Electribe sur les canaux 1 et 2. Les notes sont postées à l'heure du pas, pas à
  l'heure où l'ordonnanceur les écrit.
- **Horloge** : les 24 impulsions par noire sont produites par un fil Java dédié, cadencé au `nanoTime`, avec
  les messages de départ et d'arrêt. La page ne fait que donner le tempo, ce qui évite la gigue des minuteurs
  JavaScript.
- **Entrée** : les notes déclenchent les timbres correspondants ; sur l'Electribe elles s'enregistrent au vol
  si REC est armé, et les notes hors canal de percussions jouent les parties de synthé. Les messages de départ
  et d'arrêt pilotent le transport.
- Les réglages sont dans la notice, et le bouton **GLOBAL** de l'Electribe y mène directement.

La permission n'est pas nécessaire : Android ouvre les ports MIDI sans demande d'accès USB. Le manifeste
déclare `android.software.midi` en option, l'application reste installable sans.
**Aucun accès réseau, aucun échantillon téléchargé** : la permission `INTERNET` n'est pas
demandée et la WebView bloque toute requête qui ne vient pas de `file:///android_asset/`.
L'application fonctionne en mode avion.

## Ce qui compose l'appareil

Tout tient dans `app/src/main/assets/drm16.html` : le panneau et le moteur audio.

- **Panneau** dessiné en CSS d'après la photo de l'appareil : châssis métal brossé,
  matrice orange, boutons rotatifs, pédale chromée, interrupteurs POWER et SPACE DRUM,
  jacks OUTPUT 1, OUTPUT 2 et BASS OUT (décoratifs).
- **Moteur audio** : neuf timbres *synthétisés en temps réel* par la Web Audio API —
  grosse caisse, caisse claire, clap, charley fermé, charley ouvert, cymbale longue,
  cymbale courte, wood block, space drum. Aucun fichier audio n'est embarqué : tout est
  construit à partir d'oscillateurs, de bruit filtré et d'enveloppes.
- **Séquenceur** : 16 rythmes sur la DRM16, 32 sur la DRM32 (deux sélections de 4 styles × 4 colonnes),
  16 doubles-croches par mesure,
  ordonnancement par anticipation de 120 ms sur l'horloge audio, donc sans dérive.
  ROCK BOOGIE, MISC SHUFFLE, REGGAE et FUNK III ont leur propre swing.

## Commandes

### Ce qui distingue les deux appareils

| | DRM16 | DRM32 |
|---|---|---|
| Interrupteur de droite | SPACE DRUM · ON | SELECTION, passe d'une sélection de 16 rythmes à l'autre |
| Troisième jack | OUTPUT 2 | CLOCK OUT |
| DELETE | standard, wood block, cymbale longue, cymbale courte | standard, space drum, wood block, cymbales |
| MISC IV | SHUFFLE | SWING |
| Panneau | noir et orange, LED bleue | bleu nuit, vert d'eau et jaune, LED rouge |

Sur la DRM32, chaque case de la matrice porte deux rythmes : la moitié allumée indique la sélection en cours.
Les réglages sont mémorisés séparément pour chaque appareil.

| Commande | Effet |
|---|---|
| POWER · ON | met sous tension ; débloque aussi le moteur audio d'Android |
| Pédale | départ / arrêt |
| STYLE / COLUMN | choisissent la case de la matrice (la case est aussi tactile) |
| DELETE | retire un timbre : WOOD BLOCK, LONG CYMBAL ou SHORT CYMBAL |
| SPACE DRUM · ON | ajoute les accents de space drum |
| VOLUME / TEMPO | glisser le doigt vers le haut ou le bas sur le bouton (40 à 220 BPM) |
| MODEL 01 | affiche la notice |

La LED clignote sur les temps. Un appui bref sur TEMPO bat la mesure, une série d'appuis en donne la moyenne.
Toucher le nom d'un timbre dans la liste DELETE le joue seul. Tous les réglages sont retenus d'un lancement
à l'autre, sauf la mise sous tension : l'appareil démarre toujours éteint.

Trois réglages se trouvent derrière MODEL 01 : le retour haptique, la lecture en arrière-plan, et la notice.

## Lecture en arrière-plan

Quand la lecture démarre, la page prévient l'application par `window.DRM16.playing(true)`, qui lance
`PlaybackService`, un service de premier plan. Tant qu'il tourne, le processus reste vivant et la WebView
continue de jouer, application quittée ; une notification permanente ramène au panneau. Le service ne produit
aucun son lui-même. Le focus audio est demandé au démarrage et rendu à l'arrêt : un appel entrant ou une autre
application coupe le rythme au lieu de se superposer.

En arrière-plan, l'anticipation de l'ordonnanceur passe de 0,22 à 1,2 s, par sécurité si le système ralentit
les minuteurs de la page.

Permissions déclarées : `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `POST_NOTIFICATIONS`
(demandée au premier départ sur Android 13 et suivants, uniquement pour afficher la notification) et `VIBRATE`.
Toujours pas d'`INTERNET`.

## Contenu du dépôt

```
drm16_android/
  app/src/main/assets/drm16.html      toute l'application : onze façades, moteur audio, séquenceurs
  app/src/main/java/fr/tibo/drm16/
    MainActivity.java                 WebView, pont JavaScript, micro, fichiers, stockage des échantillons
    Midi.java                         API MIDI d'Android : entrée, sortie, horloge
    PlaybackService.java              service de premier plan pour la lecture en arrière-plan
  app/src/main/AndroidManifest.xml
  app/src/main/res/                   icône de lancement (vectorielle)
  app/build.gradle, build.gradle, settings.gradle, gradle.properties
  .github/workflows/android.yml       compilation de l'APK à chaque envoi
  premier-depot.sh, suivi.sh, recup-apk.sh
```

## Compilation

`.github/workflows/android.yml` compile l'APK de debug à chaque envoi sur `main`, puis
le dépose en artefact nommé `drm16-apk`. Pas de wrapper Gradle dans le dépôt : le
workflow installe Gradle 8.10.2 et JDK 17 lui-même.

Depuis le téléphone :

- `premier-depot.sh` crée le dépôt GitHub, pousse le projet et suit la compilation.
- `recup-apk.sh` télécharge l'APK de la dernière compilation réussie dans
  `Téléchargements/drm16-apk`.

Les mises à jour suivantes passent par `mise-a-jour.sh drm16_android "message"`, avec des
archives nommées `drm16_android_vN.zip`.

Réglages du projet : `compileSdk 34`, `minSdk 24`, `targetSdk 34`, JDK 17,
identifiant `fr.tibo.drm16`. Aucune dépendance externe.

## Remarque

Projet personnel, hommage à l'appareil d'origine. Sans lien avec Electro-Harmonix,
et sans réutilisation de ses sons.
