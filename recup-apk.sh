#!/bin/sh
# Recupere l'APK de la derniere compilation reussie dans le dossier Telechargements.
set -e

CIBLE="$HOME/storage/downloads/drm16-apk"

cd "$HOME/drm16_android"

rm -rf "$CIBLE"
mkdir -p "$CIBLE"
gh run download -n drm16-apk -D "$CIBLE"

echo ""
echo "APK dans Telechargements/drm16-apk :"
ls -1 "$CIBLE"
echo ""
echo "Ouvrir le fichier depuis le gestionnaire de fichiers pour l'installer."
