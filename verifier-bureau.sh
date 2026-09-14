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
for f in bureau/src-tauri/Cargo.toml bureau/src-tauri/build.rs bureau/src-tauri/src/main.rs \
         bureau/src-tauri/tauri.conf.json bureau/src-tauri/icons/icon.ico; do
  [ -f "$f" ] && echo "  ok   $f" || { echo "  MANQUE $f"; ok=0; }
done

echo "--- le HTML n'est-il copié qu'à un seul endroit ? ---"
n=$(grep -c "app/src/main/assets/drm16.html" .github/workflows/publication.yml || true)
echo "  cité $n fois dans le workflow de publication (attendu : 2, l'autonome et la fenêtre)"

echo
[ "$ok" = 1 ] && echo "Tout est en place." || { echo "Des points à régler ci-dessus."; exit 1; }
