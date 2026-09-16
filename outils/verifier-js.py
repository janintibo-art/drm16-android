#!/usr/bin/env python3
# Verifie la syntaxe de tout le JavaScript de la page avec node --check.
# Une faute de syntaxe arrete le script entier : page noire, sans message.
import re, subprocess, sys, tempfile, os

s = open('app/src/main/assets/drm16.html', encoding='utf-8').read()
blocs = [c for a, c in re.findall(r'<script([^>]*)>(.*?)</script>', s, re.S) if 'src=' not in a]
faute = 0
for i, c in enumerate(blocs):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(c); nom = f.name
    r = subprocess.run(['node', '--check', nom], capture_output=True, text=True)
    os.unlink(nom)
    if r.returncode:
        faute += 1
        # le numero de ligne est celui du bloc : on le ramene a celui du fichier
        debut = s.count('\n', 0, s.index(c)) 
        print("bloc %d (commence ligne %d du fichier) :" % (i + 1, debut + 1))
        print(r.stderr.strip()[:1500])
print("blocs de script verifies :", len(blocs))
if faute: sys.exit(1)
print("syntaxe JavaScript correcte")
