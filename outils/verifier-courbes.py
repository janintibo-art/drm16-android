#!/usr/bin/env python3
# Vérifie que les courbes de mise en forme (WaveShaper) ont un point en zéro (v152).
#
# Une courbe de n points couvre −1…+1 ; l'entrée 0 tombe au milieu. Avec n pair
# et x = i*2/n − 1, aucun point n'est en zéro : la sortie garde un décalage
# continu (mesuré : −66 dBFS sur l'écrêteur de sortie, bien plus sur une
# distorsion à forte pente). La bonne écriture : n impair et x = i*2/(n−1) − 1.
import re, sys

s = open('app/src/main/assets/drm16.html', encoding='utf-8').read()
js = "\n".join(re.findall(r'<script[^>]*>(.*?)</script>', s, re.S))
faute = 0
for m in re.finditer(r'\b(\w+)\s*\*\s*2\s*/\s*(\w+)\s*-\s*1\b', js):
    ligne = js.count('\n', 0, m.start()) + 1
    print("  courbe sans point en zéro, ligne %d du script : %s" % (ligne, m.group(0)))
    faute += 1
for m in re.finditer(r'\b(\w+)\s*=\s*(\d+)\s*,\s*\w+\s*=\s*new Float32Array\(\1\)', js):
    if int(m.group(2)) % 2 == 0 and re.search(r'/\s*\(\s*%s\s*-\s*1\s*\)' % m.group(1), js[m.end():m.end() + 400]):
        print("  courbe de longueur paire (%s), ligne %d" % (m.group(2), js.count('\n', 0, m.start()) + 1))
        faute += 1
# v153 : chaque étage de mise en forme dit s'il est suréchantillonné. La valeur
# par défaut de l'API est "none" : une saturation lisse y replie fortement
# (mesuré : −19 dB de repliement à 1,76 kHz, contre −38 en 2x et −69 en 4x).
# "none" reste permis quand le repliement est voulu (réductions de bits).
n = 0
for m in re.finditer(r'([\w.]+)\s*=\s*ctx\.createWaveShaper\(\)', js):
    n += 1
    nom = m.group(1)
    if not re.search(re.escape(nom) + r'\.oversample\s*=\s*"(none|2x|4x)"', js[m.end():m.end() + 1500]):
        print("  mise en forme sans suréchantillonnage déclaré (%s), ligne %d" % (nom, js.count('\n', 0, m.start()) + 1))
        faute += 1
if faute:
    print("%d courbe(s) à corriger" % faute); sys.exit(1)
print("toutes les courbes de mise en forme passent par zéro ; %d étages, tous déclarés" % n)
