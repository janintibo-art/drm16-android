#!/usr/bin/env python3
# Verifie qu'une classe de machine sur <body> ne montre QUE sa propre facade.
#
# Ce controle existe parce que le mecanisme d'affichage est le plus fragile du
# fichier : une facade est visible par defaut et cachee par la classe des
# AUTRES machines. Ajouter une machine sans completer ces listes fait
# apparaitre plusieurs facades a la fois.
#
# Il a attrape un second defaut, plus vicieux : une insertion de style ancree
# sur « .dmxb{ » etait tombee A L'INTERIEUR de « body.dmx .dmxb{ », coupant la
# regle en deux et rendant la DMX visible en permanence.
#
#   python3 verifier-facades.py
#
import re
s=open('app/src/main/assets/drm16.html',encoding='utf-8').read()
css=re.sub(r'/\*.*?\*/','',s[:s.index('</style>')],flags=re.S)
# Les @media imbriquent des accolades : on les deplie avant d'analyser a plat.
out=[]; i=0
while True:
    m=re.search(r'@media[^{]*\{', css[i:])
    if not m: out.append(css[i:]); break
    deb=i+m.start(); ouvre=i+m.end()
    out.append(css[i:deb])
    prof=1; k=ouvre
    while k<len(css) and prof:
        if css[k]=='{': prof+=1
        elif css[k]=='}': prof-=1
        k+=1
    out.append(css[ouvre:k-1])          # le contenu, sans l'enveloppe
    i=k
css="".join(out)

regles=[]
for m in re.finditer(r'([^{}]+)\{([^}]*)\}', css):
    corps=m.group(2).replace(" ","").replace("\n","")
    val=None
    for d in corps.split(";"):
        if d.startswith("display:"): val=d.split(":",1)[1]
    if val is None: continue
    for part in m.group(1).split(","):
        regles.append((" ".join(part.split()), val, m.start()))

classes=["em1","er1","ea1","es1","emx","esx","mpc","tr8","td3","eur","dmx","vlc",
         "cr5","dbi","t1k","arcm","ko","stk"]
montre={}
for q,val,pos in regles:
    m2=re.fullmatch(r'body\.(\w+) ([#.][\w-]+)', q)
    if m2 and val=="block" and m2.group(1) in classes: montre.setdefault(m2.group(1), m2.group(2))
facades=sorted(set(montre.values()))
def spec(q): return (q.count('#'), len(re.findall(r'\.[\w-]+', q)))
def visible(cl, fac):
    best=None
    for q,val,pos in regles:
        if q!=fac and q!="body.%s %s"%(cl,fac): continue
        cand=(spec(q),pos,val)
        if best is None or cand[0]>best[0] or (cand[0]==best[0] and cand[1]>best[1]): best=cand
    return best[2] if best else "block"
print("facades :", len(facades), "| machines testees :", len(classes))
faux=0
for cl in classes:
    vues=[f for f in facades if visible(cl,f)!="none"]
    att=montre.get(cl)
    if not att: continue
    if vues!=[att]:
        print("  body.%-5s montre %s  (attendu %s)"%(cl," ".join(vues) or "RIEN",att)); faux+=1
print("  ", "chaque machine montre la sienne, et elle seule" if not faux else "%d fautives"%faux)
