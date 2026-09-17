#!/usr/bin/env bash
# Tous les controles automatiques, dans l'ordre. S'arrete au premier echec.
# Lances par GitHub Actions AVANT la compilation de l'APK ; utilisables aussi
# dans Termux si python, node et un JDK sont installes :
#     pkg install python nodejs openjdk-17
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
fin

etape "6. Java : compilation de controle et tests"
SORTIE="$(mktemp -d)"
java outils/java/Verif.java "$SORTIE" outils/java/android-simule app/src/main/java outils/java/tests
java -cp "$SORTIE" fr.tibo.drm16.TestFichiers
java -cp "$SORTIE" fr.tibo.drm16.TestMidi
rm -rf "$SORTIE"
fin

etape "7. Version de bureau : coque complete, page fabriquee par preparer.sh"
bash verifier-bureau.sh
fin

echo
echo "Tous les controles sont passes."
