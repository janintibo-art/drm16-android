#!/usr/bin/env bash
# Compile le Syro de Korg en WebAssembly.
# Chaque etape s'annonce : si ca echoue, le journal dit ou.
set -e
cd "$(dirname "$0")"

echo "::group::1. Outils"
emcc --version | head -1
echo "::endgroup::"

# SINGLE_FILE : le .wasm est embarque dans le .js en base64, au lieu d'etre
# un fichier a cote. C'est indispensable ici : la glu Emscripten va chercher
# son .wasm avec fetch(), et fetch() NE PREND PAS EN CHARGE le protocole
# file:// dans Chromium — quelle que soit l'autorisation accordee au WebView.
# D'ou le « Failed to fetch » du premier essai reussi. Sans fichier a chercher,
# plus de requete du tout.

echo "::group::2. Code de Korg"
# Jamais versionne : sa licence ne permet pas de le redistribuer.
[ -d volcasample ] || git clone --depth 1 https://github.com/korginc/volcasample volcasample
find volcasample -name '*.c' -o -name '*.h' | sort
echo "::endgroup::"

echo "::group::3. Reperage des sources"
# On ne suppose pas la disposition du depot : on cherche l'en-tete public et on
# compile ce qui l'entoure. Si Korg reorganise, ca tient encore.
ENTETE=$(find volcasample -name korg_syro_volcasample.h | head -1)
[ -n "$ENTETE" ] || { echo "En-tete Syro introuvable."; exit 1; }
SRC=$(dirname "$ENTETE")
echo "Dossier des sources : $SRC"

# Le depot de Korg contient un programme d'exemple avec son propre main().
# Compile avec le reste, Emscripten l'executerait au chargement du module et
# le ferait sortir aussitot. On ecarte donc tout fichier qui a un main.
SOURCES=""
for f in "$SRC"/*.c; do
  if grep -qE '^[[:space:]]*(int|void)[[:space:]]+main[[:space:]]*\(' "$f"; then
    echo "  ecarte (contient main) : $(basename "$f")"
  else
    echo "  retenu                 : $(basename "$f")"
    SOURCES="$SOURCES $f"
  fi
done
[ -n "$SOURCES" ] || { echo "Aucune source Syro retenue."; exit 1; }
echo "::endgroup::"

echo "::group::4. Compilation"
mkdir -p ../app/src/main/assets/syro
emcc -O2 \
  -I"$SRC" \
  $SOURCES syro_wrap.c \
  -o ../app/src/main/assets/syro/syro.js \
  -sMODULARIZE=1 \
  -sEXPORT_NAME=SyroModule \
  -sENVIRONMENT=web \
  -sALLOW_MEMORY_GROWTH=1 \
  -sSINGLE_FILE=1 \
  -sEXPORTED_FUNCTIONS='["_volcagain_render","_volcagain_free","_volcagain_version","_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","setValue","UTF8ToString","HEAP16","HEAPU8"]'
echo "::endgroup::"

echo "::group::5. Resultat"
ls -lh ../app/src/main/assets/syro/
# Un module qui ne contient pas nos fonctions ne servirait a rien.
grep -q "volcagain_render" ../app/src/main/assets/syro/syro.js \
  && echo "volcagain_render present dans la glu." \
  || { echo "volcagain_render ABSENT : exportation ratee."; exit 1; }
# Et un module qui irait chercher un fichier a cote echouerait sous file://.
if [ -f ../app/src/main/assets/syro/syro.wasm ]; then
  echo "syro.wasm existe encore : SINGLE_FILE n'a pas pris, le chargement echouera."
  exit 1
fi
grep -q "application/octet-stream;base64" ../app/src/main/assets/syro/syro.js \
  && echo "Le wasm est bien embarque dans le js." \
  || echo "Attention : pas de wasm embarque detecte."
echo "::endgroup::"
