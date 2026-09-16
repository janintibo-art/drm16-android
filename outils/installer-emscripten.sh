#!/usr/bin/env bash
# Installe Emscripten a une version FIGEE et le rend utilisable dans le shell
# courant. A SOURCER, pas a executer :
#     source outils/installer-emscripten.sh
# Utilise par les trois workflows qui compilent le Syro (v136) : la version ne
# se change plus qu'ici.
EMSDK_VERSION="3.1.64"
EMSDK_DIR="${RUNNER_TEMP:-$HOME/.cache}/emsdk"
echo "::group::Installer Emscripten $EMSDK_VERSION"
if [ ! -d "$EMSDK_DIR" ]; then
  git clone -q --depth 1 https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
fi
( cd "$EMSDK_DIR" && ./emsdk install "$EMSDK_VERSION" && ./emsdk activate "$EMSDK_VERSION" )
# shellcheck disable=SC1091
source "$EMSDK_DIR/emsdk_env.sh" > /dev/null
echo "::endgroup::"
