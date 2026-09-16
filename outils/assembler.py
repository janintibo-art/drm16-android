#!/usr/bin/env python3
# Assemble app/src/main/assets/drm16.html a partir des sources de page/ (v138).
#
# Les sources sont decoupees par theme (html/, css/, js/) ; page/ordre.txt dit
# dans quel ordre les recoller. Le resultat est ecrit tel quel, octet pour
# octet : aucun ajout, aucune transformation. drm16.html reste dans le depot,
# car l'APK, l'executable Windows et le test navigateur en ont besoin.
#
#   python3 outils/assembler.py             ecrit drm16.html
#   python3 outils/assembler.py --verifier  echoue si drm16.html ne correspond
#                                           pas exactement aux sources
#
# Regle : on modifie les sources, jamais drm16.html directement.
import os, sys

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PAGE = os.path.join(RACINE, 'page')
CIBLE = os.path.join(RACINE, 'app', 'src', 'main', 'assets', 'drm16.html')

def ordre():
    l = []
    for ligne in open(os.path.join(PAGE, 'ordre.txt'), encoding='utf-8'):
        ligne = ligne.strip()
        if ligne and not ligne.startswith('#'): l.append(ligne)
    return l

def assembler():
    morceaux = []
    for nom in ordre():
        chemin = os.path.join(PAGE, nom)
        if not os.path.isfile(chemin):
            print("absent de page/ :", nom); sys.exit(1)
        t = open(chemin, encoding='utf-8', newline='').read()
        if t and not t.endswith('\n'):
            print("le fichier doit finir par un retour a la ligne :", nom); sys.exit(1)
        morceaux.append((nom, t))
    # une source oubliee dans ordre.txt serait silencieusement perdue
    listes = set(n for n, _ in morceaux)
    for d, _, fs in os.walk(PAGE):
        for f in fs:
            rel = os.path.relpath(os.path.join(d, f), PAGE).replace(os.sep, '/')
            if rel != 'ordre.txt' and rel not in listes:
                print("source absente de ordre.txt :", rel); sys.exit(1)
    return morceaux

morceaux = assembler()
texte = ''.join(t for _, t in morceaux)

if '--verifier' in sys.argv:
    actuel = open(CIBLE, encoding='utf-8', newline='').read()
    if actuel == texte:
        print("drm16.html correspond exactement aux %d sources de page/" % len(morceaux)); sys.exit(0)
    # ou est la premiere difference ?
    k = next((i for i, (a, b) in enumerate(zip(actuel, texte)) if a != b), min(len(actuel), len(texte)))
    pos = 0
    for nom, t in morceaux:
        if k < pos + len(t):
            ligne = t.count('\n', 0, k - pos) + 1
            print("drm16.html differe des sources : %s, ligne %d" % (nom, ligne)); break
        pos += len(t)
    else:
        print("drm16.html differe des sources (en fin de fichier)")
    print("Modifiez page/, puis : python3 outils/assembler.py")
    sys.exit(1)

open(CIBLE, 'w', encoding='utf-8', newline='').write(texte)
print("drm16.html assemble : %d sources, %d lignes" % (len(morceaux), texte.count('\n')))
