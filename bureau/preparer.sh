#!/usr/bin/env bash
# Prepare la version Windows (v136) : fabrique bureau/dist a partir des assets
# Android et met les numeros de version de Tauri et de Cargo au niveau de
# l'application. C'est le SEUL endroit qui fait ce travail : les deux workflows
# Windows l'appellent, et plus aucune copie du HTML n'est tenue a la main.
#
#   bash bureau/preparer.sh            (le Syro est souhaite : avertissement s'il manque)
#   EXIGER_SYRO=1 bash bureau/preparer.sh   (le Syro est obligatoire)
set -e
cd "$(dirname "$0")/.."
SRC=app/src/main/assets
DIST=bureau/dist
CONF=bureau/src-tauri/tauri.conf.json
CARGO=bureau/src-tauri/Cargo.toml

echo "::group::1. bureau/dist"
rm -rf "$DIST"
mkdir -p "$DIST"
cp -R "$SRC"/. "$DIST"/
mv "$DIST/drm16.html" "$DIST/index.html"
manque=0
for f in index.html studio/index.html nexus/index.html; do
  if [ -f "$DIST/$f" ]; then echo "  ok     $f"; else echo "  MANQUE $f"; manque=1; fi
done
[ "$manque" = 0 ] || { echo "Fichiers indispensables absents."; exit 1; }
if [ -f "$DIST/syro/syro.js" ]; then
  echo "  ok     syro/syro.js ($(du -h "$DIST/syro/syro.js" | cut -f1))"
  ETAT_SYRO="present"
elif [ "${EXIGER_SYRO:-0}" = 1 ]; then
  echo "  MANQUE syro/syro.js (exige)"; exit 1
else
  echo "::warning::syro/syro.js absent : l'executable n'aura pas le transfert volca."
  ETAT_SYRO="absent"
fi
echo "  $(find "$DIST" -type f | wc -l) fichiers, $(du -sh "$DIST" | cut -f1)"
echo "::endgroup::"

echo "::group::2. Numeros de version"
V=$(sed -n "s/.*versionName[[:space:]]*'\([^']*\)'.*/\1/p" app/build.gradle | head -1)
[ -n "$V" ] || { echo "versionName introuvable dans app/build.gradle"; exit 1; }
# Windows exige trois nombres : 136 devient 136.0.0.
python3 - "$V.0.0" "$CONF" "$CARGO" <<'PY'
import json, re, sys
v, conf, cargo = sys.argv[1:]
d = json.load(open(conf, encoding='utf-8'))
d['version'] = v
json.dump(d, open(conf, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
open(conf, 'a', encoding='utf-8').write('\n')
t = open(cargo, encoding='utf-8').read()
t2 = re.sub(r'(?m)^version\s*=\s*"[^"]*"', 'version = "%s"' % v, t, count=1)
open(cargo, 'w', encoding='utf-8').write(t2)
print("  tauri.conf.json et Cargo.toml :", v)
PY
echo "::endgroup::"

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  echo "**Version Windows** : $V.0.0 — transfert volca $ETAT_SYRO." >> "$GITHUB_STEP_SUMMARY"
fi
