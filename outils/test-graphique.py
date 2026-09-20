#!/usr/bin/env python3
"""Régressions graphiques v260, sans modifier les sons ou les sauvegardes réelles.

Par défaut : Chromium de Playwright et page assemblée locale (GitHub Actions).
--chromium CHEMIN : Chromium déjà installé.
--contenu : environnement sans navigation locale ; stockage temporaire simulé.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parents[1]
FORMATS = [(393, 851), (880, 400), (360, 640)]
MACHINES = ['ko', 'mc', 'stk', 'kp']
STOCKAGE = """() => {
 const s=Object.create(null);
 Object.defineProperty(window,'localStorage',{value:{
 getItem:k=>Object.prototype.hasOwnProperty.call(s,k)?s[k]:null,
 setItem:(k,v)=>{s[k]=String(v)},removeItem:k=>{delete s[k]},
 clear:()=>{Object.keys(s).forEach(k=>delete s[k])},
 key:i=>Object.keys(s)[i]??null,get length(){return Object.keys(s).length}
 }});
}"""
OUVRIR = """m=>{ZOOM.z=1;ZOOM.tx=ZOOM.ty=0;allerMachine(m);
 menu.classList.add('hide');document.body.classList.remove('menu-ouvert');fit();}"""
MESURER = """()=>{
 const cadre=actif.getBoundingClientRect();
 const cibles=[...actif.querySelectorAll('button,select,input[type="range"],.mc-kn,.stk-kn')]
 .filter(e=>e.offsetWidth>0).map(e=>{const r=e.getBoundingClientRect();
 return {id:e.id,largeur:r.width,hauteur:r.height,police:parseFloat(getComputedStyle(e).fontSize)};});
 return {machine:S.modele,echelle:ZOOM.base,document:document.documentElement.scrollWidth,
 largeur:innerWidth,hauteur:innerHeight,cadre:cadre.toJSON(),
 interne:actif.scrollWidth-actif.clientWidth,
 visibles:[...document.querySelectorAll('#scene>[id^="unit"]')]
 .filter(e=>getComputedStyle(e).display!=='none'&&e.offsetWidth>0).map(e=>e.id),
 cibles,ciblesIncorrectes:cibles.filter(e=>e.largeur<43.9||e.hauteur<43.9||e.police<10.5)};
}"""

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium')
    ap.add_argument('--contenu', action='store_true')
    ap.add_argument('--rapport', type=Path)
    args = ap.parse_args()
    fichier = RACINE/'app/src/main/assets/drm16.html'
    fautes, mesures = [], []
    def verifier(condition, message):
        if not condition:
            fautes.append(message)
            print('FAUX : '+message, flush=True)
    with sync_playwright() as p:
        options = {'headless': True, 'args': ['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:
            options['executable_path'] = args.chromium
            options['args'].append('--no-sandbox')
        nav = p.chromium.launch(**options)
        for largeur, hauteur in FORMATS:
            contexte = nav.new_context(viewport={'width':largeur,'height':hauteur},has_touch=True)
            pg = contexte.new_page()
            erreurs = []
            pg.on('pageerror', lambda e: erreurs.append(str(e)))
            if args.contenu:
                pg.evaluate(STOCKAGE)
                pg.set_content(fichier.read_text(encoding='utf-8'), wait_until='domcontentloaded')
            else:
                pg.goto(fichier.as_uri(), wait_until='domcontentloaded')
            pg.wait_for_timeout(1100)
            for m in MACHINES:
                pg.evaluate(OUVRIR,m)
                pg.wait_for_timeout(100)
                mesure = pg.evaluate(MESURER)
                mesures.append(mesure)
                prefixe=f'{largeur}x{hauteur} {m}'
                verifier(mesure['visibles']==['unit-'+m],prefixe+' : une seule façade')
                verifier(mesure['echelle']==1,prefixe+' : échelle 1')
                verifier(mesure['document']<=largeur+2,prefixe+' : aucun débordement document')
                verifier(mesure['interne']<=1,prefixe+' : aucun débordement dans la façade')
                verifier(not mesure['ciblesIncorrectes'],prefixe+' : cibles >=44px et texte >=10,5px : '+str(mesure['ciblesIncorrectes']))
                r=mesure['cadre']
                verifier(r['y']>=55 and r['bottom']<=hauteur+1,prefixe+' : bande supérieure dégagée et façade dans la fenêtre')
                # Un défilement interne n'est pas remis à zéro par un rappel de fit.
                resultat=pg.evaluate("""()=>{
                  const e=S.modele==='kp'?actif.querySelector('.kp-reglages'):actif;
                  e.scrollTop=e.scrollHeight;const avant=e.scrollTop;fit();
                  return {avant,apres:e.scrollTop};
                }""")
                verifier(resultat['avant']>0 and abs(resultat['avant']-resultat['apres'])<=2,prefixe+' : réglages atteignables et position conservée')
                # Clic réel d'une commande située après les pads : l'auto-scroll
                # doit atteindre l'élément, sans forcer le clic dans Playwright.
                cible={'ko':'#ko-lock-param','mc':'#mc-copier','stk':'#stk-midi','kp':'#kp-hold'}[m]
                if pg.locator(cible).count():
                    pg.locator(cible).click(timeout=4000)
                pg.evaluate('stop()')
                print('Contrôlé : '+prefixe,flush=True)
            # Revenir à une ancienne machine retire tous les styles contextuels.
            pg.evaluate(OUVRIR,'16')
            verifier(pg.evaluate("!document.body.classList.contains('ui-mobile') && !document.querySelector('.ui-confort')"),f'{largeur} : sortie du mode confort')
            verifier(not erreurs,f'{largeur} : erreurs JavaScript {erreurs}')
            contexte.close()
        nav.close()
    rapport={'formats':FORMATS,'mesures':mesures,'erreurs':fautes,'contenu_simule':args.contenu}
    if args.rapport:
        args.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{len(mesures)} façades/formats contrôlés ; {len(fautes)} erreur(s).')
    return bool(fautes)

if __name__=='__main__':
    raise SystemExit(main())
