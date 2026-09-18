#!/data/data/com.termux/files/usr/bin/bash
# Contrôle de cohérence entre la version Android et la version de bureau.
# Les deux partagent LE MÊME fichier HTML : rien ne doit pouvoir les séparer.
set -e
cd "$(dirname "$0")"
ok=1

echo "--- le HTML est-il autonome ? ---"
if grep -qoE '(src|href)="(https?:)?//' app/src/main/assets/drm16.html; then
  echo "  ATTENTION : référence externe trouvée, elle manquera hors ligne :"
  grep -oE '(src|href)="(https?:)?//[^"]*"' app/src/main/assets/drm16.html | sort -u | head
  ok=0
else
  echo "  aucune dépendance externe."
fi

echo "--- la coque de bureau est-elle complète ? ---"
for f in bureau/preparer.sh bureau/src-tauri/Cargo.toml bureau/src-tauri/build.rs bureau/src-tauri/src/main.rs \
         bureau/src-tauri/tauri.conf.json bureau/src-tauri/icons/icon.ico; do
  [ -f "$f" ] && echo "  ok   $f" || { echo "  MANQUE $f"; ok=0; }
done

# L'édition du langage Rust n'est pas le numéro de version de l'application.
if grep -qE '^edition[[:space:]]*=[[:space:]]*"2021"[[:space:]]*(#.*)?$' bureau/src-tauri/Cargo.toml; then
  echo "  ok   édition Rust 2021"
else
  echo "  ERREUR : bureau/src-tauri/Cargo.toml doit garder edition = \"2021\""
  ok=0
fi

echo "--- bureau/dist n'est-il fabriqué que par preparer.sh ? ---"
# v136 : plus aucun workflow ne copie le HTML à la main vers bureau/dist.
if grep -n "bureau/dist/index.html" .github/workflows/*.yml | grep -qi "copy-item\|cp "; then
  echo "  ATTENTION : une copie manuelle subsiste :"
  grep -n "bureau/dist/index.html" .github/workflows/*.yml | grep -i "copy-item\|cp "
  ok=0
else
  echo "  oui."
fi
for w in windows publication; do
  if grep -q "bureau/preparer.sh" ".github/workflows/$w.yml"; then echo "  ok   $w.yml appelle preparer.sh"
  else echo "  MANQUE : $w.yml n'appelle pas preparer.sh"; ok=0; fi
done

echo
[ "$ok" = 1 ] && echo "Tout est en place." || { echo "Des points à régler ci-dessus."; exit 1; }
