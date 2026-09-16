#!/usr/bin/env python3
# Verifie qu'aucun identifiant HTML n'est pose deux fois dans la page.
#
# Deux elements du meme id : getElementById ne rend que le premier, et le
# second bouton ne fait rien — sans aucune erreur. On ne regarde que le HTML
# ecrit en dur (hors <script> et <style>) : les id fabriques par le script
# sont numerotes et verifies par ailleurs, a l'execution.
#
#   python3 verifier-ids.py
#
import re, sys
from collections import Counter

s = open('app/src/main/assets/drm16.html', encoding='utf-8').read()
html = re.sub(r'<script[^>]*>.*?</script>', '', s, flags=re.S)
html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.S)
html = re.sub(r'<!--.*?-->', '', html, flags=re.S)
ids = re.findall(r'\sid\s*=\s*["\']([^"\']+)["\']', html)
c = Counter(ids)
doubles = sorted(k for k, v in c.items() if v > 1)
print("identifiants en dur :", len(ids), "· distincts :", len(c))
if doubles:
    for k in doubles: print("  %s pose %d fois" % (k, c[k]))
    sys.exit(1)
print("aucun identifiant en double")
