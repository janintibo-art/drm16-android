#!/usr/bin/env bash
# Tous les controles automatiques, dans l'ordre. S'arrete au premier echec.
# Lances par GitHub Actions AVANT la compilation de l'APK ; utilisables aussi
# dans Termux si python, node, Rust et un JDK sont installes :
#     pkg install python nodejs rust openjdk-17
#     bash ~/drm16_android/outils/controles.sh
set -e
cd "$(dirname "$0")/.."

etape(){ echo; echo "::group::$1"; }
fin(){ echo "::endgroup::"; }

etape "0. drm16.html correspond exactement aux sources de page/"
python3 outils/assembler.py --verifier
fin

etape "1. Facades : chaque machine montre la sienne"
python3 verifier-facades.py
fin

etape "2. Charge : aucune voie ne sature"
python3 verifier-charge.py
fin

etape "3. Aucun nom exterieur interprete comme du HTML"
python3 verifier-html.py
fin

etape "3 bis. La page ne parle au pont Android qu'a travers HOST"
python3 verifier-hote.py
fin

etape "4. Aucun identifiant HTML en double"
python3 verifier-ids.py
fin

etape "4 bis. Courbes de mise en forme centrees sur zero"
python3 outils/verifier-courbes.py
fin

etape "5. Syntaxe JavaScript"
python3 outils/verifier-js.py
node outils/test-dbi.cjs
node outils/test-kp.cjs
node outils/test-kp-resample.cjs
node outils/test-kp-release.cjs
node outils/test-mc.cjs
node outils/test-smpltrek.cjs
node outils/test-t1k.cjs
node outils/test-em-ondes.cjs
node outils/test-em-64.cjs
node outils/test-em-song.cjs
node outils/test-em-song-edition.cjs
node outils/test-ko.cjs
node outils/test-tr-scale.cjs
node outils/test-tr-fill.cjs
node outils/test-tr-track.cjs
node outils/test-mpc-99.cjs
node outils/test-mpc-programmes.cjs
node outils/test-wav-export.cjs
node outils/test-effets-voie.cjs
node outils/test-volca-isolateur.cjs
node outils/test-dmx-song.cjs
node outils/test-echantillons.cjs
node outils/test-transport.cjs
node outils/test-restauration-machines.cjs
node outils/test-projet.cjs
node outils/test-reprise-projet.cjs
node outils/test-bibliotheque.cjs
node outils/test-freesound.cjs
node outils/test-kits.cjs
node outils/test-classement.cjs
node outils/test-editeur.cjs
node outils/test-memoire.cjs
fin

etape "6. Java : compilation de controle et tests"
SORTIE="$(mktemp -d)"
java outils/java/Verif.java "$SORTIE" outils/java/android-simule app/src/main/java outils/java/tests
java -cp "$SORTIE" fr.tibo.drm16.TestFichiers
java -cp "$SORTIE" fr.tibo.drm16.TestLectures
java -cp "$SORTIE" fr.tibo.drm16.TestDossierDocuments
java -cp "$SORTIE" fr.tibo.drm16.TestMidi
java -cp "$SORTIE" fr.tibo.drm16.TestMidiOuverture
rm -rf "$SORTIE"
fin

etape "7. Version de bureau : coque complete, page fabriquee par preparer.sh"
bash verifier-bureau.sh
python3 outils/paquet-pc.py --verifier
fin

etape "8. MIDI bureau : commandes concurrentes et ports simules"
python3 outils/test-midi-bureau.py
fin

etape "9. Fichiers bureau : lectures, listes et recuperations refusees"
python3 outils/test-fichiers-bureau.py
fin

echo
echo "Tous les controles sont passes."
