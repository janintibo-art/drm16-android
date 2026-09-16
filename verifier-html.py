#!/usr/bin/env python3
# Verifie qu'aucune chaine venue de l'exterieur n'est injectee comme du HTML.
#
# Les noms d'echantillons, de racks, de prises, d'appareils MIDI, de fichiers et
# tout ce qu'on saisit dans une boite de dialogue peuvent contenir < > & : poses
# par innerHTML, ils cassent l'affichage ou sont interpretes comme balises.
# Regle : ces chaines passent par textContent, createTextNode ou texteApresLed.
#
# Ce controle cherche, dans chaque affectation innerHTML / outerHTML /
# insertAdjacentHTML, les sources exterieures connues. Toute nouvelle source
# (un nouveau champ nomme par l'utilisateur) doit etre ajoutee a SOURCES.
#
#   python3 verifier-html.py
#
import re, sys

s = open('app/src/main/assets/drm16.html', encoding='utf-8').read()
js = "\n".join(re.findall(r'<script[^>]*>(.*?)</script>', s, re.S))

SOURCES = [
    r'nomEch\s*\(', r'nomBib\s*\(', r'nomRack\s*\(', r'BIB\.noms', r'ES\.noms',
    r'EUR\.nom\b', r'MIDI\.(?:liste|appareils|dernier)', r'\bARC\.', r'\bprises?\b',
    r'\bprompt\s*\(', r'\.name\b', r'\bfichier\w*\s*\(', r'KP\.motion',
]
motif = re.compile('|'.join(SOURCES))

faute = 0
n = 0
for m in re.finditer(r'(?:innerHTML|outerHTML)\s*\+?=|insertAdjacentHTML\s*\(', js):
    n += 1
    fin = js.find(';', m.end())
    expr = js[m.end():fin if fin > 0 else m.end() + 400]
    # le texte fixe entre guillemets ne compte pas : seuls les identifiants
    code = re.sub(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'', '""', expr)
    t = motif.search(code)
    if t:
        ligne = js.count('\n', 0, m.start()) + 1
        print("  ligne %d du script : %r dans %s" % (ligne, t.group(0), expr.strip()[:90]))
        faute += 1

print("affectations HTML examinees :", n)
if faute:
    print("%d source(s) exterieure(s) posee(s) en HTML" % faute); sys.exit(1)
print("aucune chaine exterieure n'est interpretee comme du HTML")
