# Boîtes à rythmes autonomes pour Android

Recréation des Electro-Harmonix DRM-16 (model 01) et DRM-32 (model 03), et des Korg Electribe EM-1, ER-1,
EA-1, ES-1, de leurs versions mkII, de l'EMX-1 et de l'ESX-1, en application Android.
**Onze machines**, un menu au lancement. Un menu au lancement choisit l'appareil ; on en change ensuite par la notice,
derrière MODEL sur les Electro-Harmonix, derrière la référence EM-1 sur l'Electribe.

## Electribe EM-1

Séquenceur à pas, une autre famille de machine que les deux précédentes.

- **10 parties jouables** : huit percussions (grosse caisse, caisse claire, clap, tom, charley fermé,
  charley ouvert, crash, cowbell) et deux parties de synthé à deux oscillateurs, plus **deux pistes
  d'accent**, une pour les percussions, une pour le synthé.
- **16 pas**, seize motifs en mémoire, WRITE pour enregistrer, ERASE pour vider une partie,
  SHIFT + touche 3 pour le swing.
- **Par partie** : niveau, panoramique, hauteur, enveloppe courte, roulement de quatre coups, envoi d'effet.
- **Filtre de synthé** : coupure, résonance, intensité d'enveloppe, saturation.
- **Effets** : les onze de la façade — pitch shifter, ring modulator, phaser, flanger/chorus, réverbération,
  compresseur, distorsion, decimator, résonateur, filtre et delay modulé — plus un délai indépendant réglable
  en temps et en profondeur (DELAY EDIT).
- **KEYBOARD** transforme les seize touches en clavier pour la partie de synthé choisie, dans l'une des six
  gammes (chromatique, majeure, mineure, dorienne, pentatonique, blues), avec changement d'octave par ◀ et ▶.
  Toucher un pas le sélectionne pour lui donner sa hauteur.
- **SHIFT** donne accès aux fonctions imprimées sous les touches : longueur du motif (1 à 16 pas), gamme,
  swing, type de roulement, décalage, copie et échange de partie, copie de son, effacement de partie,
  duplication et effacement de motif, protection en écriture.
- **REC** arme l'enregistrement au vol : pendant la lecture, toucher une partie écrit un pas.
- La molette règle le paramètre allumé : motif, tempo, forme d'onde, hauteur.

- **MOTION SEQ** enregistre le mouvement d'un bouton sur les seize pas d'une partie, en Smooth (glissé)
  ou Trig Hold (tenu) : niveau, panoramique, hauteur, temps d'enveloppe et les quatre boutons du filtre.
- **SONG** enchaîne les motifs : seize positions, éditables aux touches et à la molette.

Restent de côté le mode STEP EDIT et le bend range.

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

## Zoom

Deux doigts qui s'écartent agrandissent la façade, jusqu'à quatre fois ; deux doigts la déplacent ensuite.
Un seul doigt reste réservé aux commandes : le zoom n'est pris en compte qu'à partir de deux points de
contact, et tout geste en cours sur un bouton est gelé pendant le pincement, pour qu'un doigt posé sur un
réglage ne le fasse pas bouger. Pincer jusqu'au bout remet à plat, changer de machine aussi.

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
