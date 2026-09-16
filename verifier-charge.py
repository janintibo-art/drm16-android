#!/usr/bin/env python3
# Verifie qu'aucune machine ne peut lancer beaucoup de voix sur un meme pas
# sans atténuer sa voie de mixage.
#
# Le defaut, trouve en v122 sur la TR-707 : une boite a rythmes pose jusqu'a
# seize frappes sur le MEME pas, attaques simultanees. Les cretes s'additionnent
# alors en amplitude — seize voix font seize fois la tension d'une seule, soit
# +24 dB. Le limiteur de sortie plongeait de quinze decibels et remontait en
# quatre-vingt-dix millisecondes : le son se coupait et revenait des qu'un motif
# se chargeait.
#
# La correction est attenuerVoie(id, n, t), appelee APRES la programmation des
# voix — ce qui est possible parce que tout se programme a l'avance.
#
#   python3 verifier-charge.py
#
import re, sys

s = open('app/src/main/assets/drm16.html', encoding='utf-8').read()
js = "\n".join(re.findall(r'<script[^>]*>(.*?)</script>', s, re.S))

def corps(nom):
    i = js.index("\nfunction %s(" % nom)
    k = js.index('{', i); p = 0
    while True:
        if js[k] == '{': p += 1
        elif js[k] == '}':
            p -= 1
            if p == 0: break
        k += 1
    return js[i:k + 1]

VOIX = re.compile(r'\b(voix\w+|frapper\w+|jouer\w+)\s*\(')
noms = sorted(set(re.findall(r'schedule:(\w+)', js)))
print("ordonnanceurs declares :", len(noms))

faute = 0
print("\n%-15s %-8s %-9s %s" % ("ordonnanceur", "voix", "attenue", "verdict"))
for n in noms:
    try:
        c = corps(n)
    except ValueError:
        print("%-15s %-8s %-9s %s" % (n, "?", "?", "INTROUVABLE")); faute += 1; continue

    appels = len(VOIX.findall(c))
    boucle = bool(re.search(r'for\s*\(', c))
    att = 'attenuerVoie(' in c

    if appels == 0:
        verdict = "pas de voix, rien a faire"
    elif not boucle:
        verdict = "une seule voix par pas, rien a faire"
    elif att:
        verdict = "ok"
    else:
        verdict = "A CORRIGER : boucle de voix sans attenuation"; faute += 1
    print("%-15s %-8s %-9s %s" % (n, appels, "oui" if att else "non", verdict))

# l'attenuation doit etre posee APRES le dernier appel de voix : avant, elle
# compterait les voix du pas precedent
print()
for n in noms:
    c = corps(n)
    if 'attenuerVoie(' not in c: continue
    dern = max([m.end() for m in VOIX.finditer(c)] or [0])
    if c.index('attenuerVoie(') < dern:
        print("  %s : attenuation posee AVANT les voix" % n); faute += 1

# l'operateur virgule a une priorite tres basse : un compteur insere apres un
# && ou un ? ferait sauter la condition
for m in re.finditer(r'CHARGE_N\+\+, ', js):
    avant = js[max(0, m.start() - 40):m.start()].rstrip()
    if avant.endswith(("&&", "||", "?", ":")):
        print("  compteur apres un operateur logique :", repr(avant[-40:])); faute += 1

print()
if faute:
    print("%d probleme(s)" % faute); sys.exit(1)
print("aucune machine ne peut saturer sa voie sans l'attenuer")
