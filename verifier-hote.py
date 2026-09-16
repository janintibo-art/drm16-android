#!/usr/bin/env python3
# Verifie la couche HOST (v137).
#  1. window.DRM16 (le pont Android) n'est touche que dans le bloc HOST :
#     tout le reste de la page passe par HOST, ce qui permet a la version de
#     bureau de fournir les memes fonctions autrement.
#  2. La liste FONCTIONS du bloc HOST est exactement celle des fonctions
#     @JavascriptInterface de MainActivity.java : une fonction ajoutee au pont
#     sans etre declaree dans HOST serait invisible pour la page.
#
#   python3 verifier-hote.py
#
import re, sys

s = open('app/src/main/assets/drm16.html', encoding='utf-8').read()
java = open('app/src/main/java/fr/tibo/drm16/MainActivity.java', encoding='utf-8').read()
faute = 0

deb = s.find('/* ================= HÔTE')
fin = s.find('/* ================= FIN HÔTE')
if deb < 0 or fin < deb:
    print("bloc HOST introuvable"); sys.exit(1)
bloc = s[deb:fin]
dehors = s[:deb] + s[fin:]
for m in re.finditer(r'window\.DRM16|(?<![\w"])DRM16\.[a-z]', dehors):
    ligne = s.count('\n', 0, m.start() if m.start() < deb else m.start() + len(bloc)) + 1
    print("  acces direct au pont hors du bloc HOST, ligne ~%d : %s" % (ligne, m.group(0)))
    faute += 1

liste = re.search(r'FONCTIONS\s*=\s*\[(.*?)\]', bloc, re.S)
js = set(re.findall(r'"(\w+)"', liste.group(1))) if liste else set()
pont = set(re.findall(r'@JavascriptInterface\s+public\s+[\w<>\[\]]+\s+(\w+)\s*\(', java))
print("fonctions du pont Android :", len(pont), "· declarees dans HOST :", len(js))
for n in sorted(pont - js):
    print("  %s existe dans MainActivity mais pas dans HOST" % n); faute += 1
for n in sorted(js - pont):
    print("  %s est declaree dans HOST mais n'existe pas dans MainActivity" % n); faute += 1

# 3. Parite (v147) : la coque Rust sert chaque fonction du pont, sauf les
#    exceptions documentees dans docs/parite.md.
EXCEPTIONS_BUREAU = {"micro"}   # WebView2 fournit getUserMedia directement
rust = open('bureau/src-tauri/src/hote.rs', encoding='utf-8').read()
servies = set(re.findall(r'^\s*"(\w+)"\s*=>', rust, re.M))
for n in sorted(pont - EXCEPTIONS_BUREAU - servies):
    print("  %s existe sur Android mais la coque Windows ne la sert pas (hote.rs)" % n); faute += 1
for n in sorted(EXCEPTIONS_BUREAU & servies):
    print("  %s est servie par hote.rs : la retirer des exceptions" % n); faute += 1
print("servies par la coque Windows :", len(servies & pont), "sur", len(pont),
      "· exceptions :", ", ".join(sorted(EXCEPTIONS_BUREAU)))

if faute:
    print("%d probleme(s)" % faute); sys.exit(1)
print("la page ne parle au pont qu'a travers HOST")
