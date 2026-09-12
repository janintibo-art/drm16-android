#!/bin/sh
# Premier envoi : cree le depot GitHub, pousse le projet, suit la compilation.
set -e

DOSSIER="$HOME/drm16_android"
DEPOT="drm16-android"

cd "$DOSSIER"

git config --get user.email >/dev/null 2>&1 || git config user.email "drm16@termux.local"
git config --get user.name  >/dev/null 2>&1 || git config user.name  "DRM16"

if [ ! -d .git ]; then
  git init
  git checkout -b main 2>/dev/null || git branch -M main
fi

git add -A
git commit -m "DRM16 autonome : panneau et moteur audio embarques" || echo "Rien de nouveau a valider."

if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin main
else
  gh repo create "$DEPOT" --public --source=. --remote=origin --push
fi

UTILISATEUR=$(gh api user --jq .login)
echo ""
echo "Depot : $UTILISATEUR/$DEPOT"
echo "Compilation lancee, suivi en direct :"
echo ""

sleep 10
gh run watch
