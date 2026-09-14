#!/usr/bin/env bash
# Compile le Syro de Korg en WebAssembly. Utilisé par le workflow, utilisable
# à la main si emsdk est installé.
set -e
cd "$(dirname "$0")"

[ -d volcasample ] || git clone --depth 1 https://github.com/korginc/volcasample volcasample

# On ne suppose pas la disposition du dépôt de Korg : on cherche l'en-tête
# public et on compile ce qui l'entoure. Si Korg réorganise, ça tient encore.
ENTETE=$(find volcasample -name korg_syro_volcasample.h | head -1)
[ -n "$ENTETE" ] || { echo "En-tête Syro introuvable dans le dépôt de Korg."; exit 1; }
SRC=$(dirname "$ENTETE")
echo "Sources Syro : $SRC"
ls "$SRC"/*.c

mkdir -p ../app/src/main/assets/syro

emcc -O2 \
  -I"$SRC" \
  "$SRC"/*.c syro_wrap.c \
  -o ../app/src/main/assets/syro/syro.js \
  -sMODULARIZE=1 \
  -sEXPORT_NAME=SyroModule \
  -sENVIRONMENT=web \
  -sALLOW_MEMORY_GROWTH=1 \
  -sEXPORTED_FUNCTIONS='["_volcagain_render","_volcagain_free","_volcagain_version","_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["getValue","setValue","HEAP16","HEAPU8","UTF8ToString"]'

ls -lh ../app/src/main/assets/syro/
