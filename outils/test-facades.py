#!/usr/bin/env python3
"""Régressions v261 : matières, états, disposition des sélections et gestes Kaoss.

Complète test-graphique.py, qui garde les contrôles de géométrie v260.
Aucune sauvegarde de l'utilisateur : chaque fenêtre utilise un contexte jetable.
--contenu simule également localStorage pour un environnement sans accès file://.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('graphique_v260', RACINE/'outils/test-graphique.py')
G = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(G)
FORMATS = G.FORMATS + [(1180, 860)]
STYLE = """e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {
 couleur:s.color,fond:s.backgroundColor,image:s.backgroundImage,ombre:s.boxShadow,
 affichage:s.display,opacite:s.opacity,transition:s.transitionDuration,
 transformation:s.transform,largeur:r.width,hauteur:r.height};}"""
ETATS = """([sel,etats])=>{
 const e=document.querySelector(sel),avant=e.className,resultat={};
 try{for(const [nom,classes] of Object.entries(etats)){
  e.className=classes;const s=getComputedStyle(e);
  resultat[nom]={fond:s.backgroundColor,couleur:s.color,ombre:s.boxShadow,affichage:s.display};
 }}finally{e.className=avant}return resultat;
}"""

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium')
    ap.add_argument('--contenu', action='store_true')
    ap.add_argument('--rapport', type=Path)
    ap.add_argument('--captures', type=Path)
    args = ap.parse_args()
    erreurs, resultats = [], []
    def verifier(condition, message):
        if not condition:
            erreurs.append(message)
            print('FAUX : '+message, flush=True)
    def style(pg, sel):
        return pg.locator(sel).first.evaluate(STYLE)
    html = (RACINE/'app/src/main/assets/drm16.html').read_text(encoding='utf-8')
    css = (RACINE/'page/css/210-facades-matieres.css').read_text(encoding='utf-8')
    verifier(html.count(css) == 1, 'source CSS présente une seule fois dans la page assemblée')
    verifier('css/210-facades-matieres.css' in (RACINE/'page/ordre.txt').read_text(), 'source enregistrée dans le manifeste')
    verifier('@keyframes' not in css and 'url(' not in css, 'aucune animation autonome ni ressource externe ajoutée')
    if args.captures:
        args.captures.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        options = {'headless': True, 'args': ['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:
            options['executable_path'] = args.chromium
            options['args'].append('--no-sandbox')
        nav = p.chromium.launch(**options)
        for largeur, hauteur in FORMATS:
            contexte = nav.new_context(viewport={'width':largeur, 'height':hauteur}, has_touch=True)
            pg = contexte.new_page()
            fautes_js = []
            pg.on('pageerror', lambda e: fautes_js.append(str(e)))
            if args.contenu:
                pg.evaluate(G.STOCKAGE)
                pg.set_content(html, wait_until='domcontentloaded')
            else:
                pg.goto((RACINE/'app/src/main/assets/drm16.html').as_uri(), wait_until='domcontentloaded')
            pg.wait_for_timeout(1100)
            for m in G.MACHINES:
                prefixe = f'{largeur}x{hauteur} {m}'
                pg.evaluate(G.OUVRIR, m)
                pg.wait_for_timeout(100)
                chassis = style(pg, '#unit-'+m)
                verifier(chassis['image'] != 'none', prefixe+' : matière présente')
                verifier(pg.evaluate("m=>getComputedStyle(document.getElementById('unit-'+m),'::before').pointerEvents==='none'",m), prefixe+' : vis non interactive')
                if args.captures:
                    pg.screenshot(path=str(args.captures/f'{m}-{largeur}x{hauteur}.png'))
                if m in ('ko', 'mc', 'stk'):
                    selecteur = {'ko':'#ko-pads .kb','mc':'#mc-trks .mt','stk':'#stk-trks .st'}[m]
                    avant = pg.locator(selecteur).evaluate_all("es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))")
                    pg.locator(selecteur).nth(1).click(timeout=4000)
                    verifier(pg.locator(selecteur).nth(1).evaluate("e=>e.classList.contains('sel')&&getComputedStyle(e).display==='block'"), prefixe+' : sélection sur deux lignes, sans flex parasite')
                    apres = pg.locator(selecteur).evaluate_all("es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))")
                    verifier(all(abs(a['w']-b['w'])<.5 and abs(a['h']-b['h'])<.5 for a,b in zip(avant,apres)), prefixe+' : taille inchangée au changement de sélection')
                    if m != 'ko':
                        pg.locator(selecteur).nth(1).click(timeout=4000)
                        verifier(pg.locator(selecteur).nth(1).evaluate("e=>e.classList.contains('muet')&&getComputedStyle(e,'::after').pointerEvents==='none'"), prefixe+' : indicateur MUTE')
                        pg.locator(selecteur).nth(1).click(timeout=4000)
                    if m == 'mc':
                        teintes=pg.locator(selecteur).evaluate_all("es=>es.map(e=>getComputedStyle(e).getPropertyValue('--face-piste').trim())")
                        verifier(len(set(teintes)) == 4, prefixe+' : quatre repères de piste distincts')
                    pad={'ko':'#ko-pads .kb','mc':'#mc-pads .mb','stk':'#stk-pads .sb'}[m]
                    cl={'ko':'kb','mc':'mb','stk':'sb'}[m]
                    etats=pg.evaluate(ETATS,[pad,{'repos':cl,'programme':cl+' on','courant':cl+' on cur sel'}])
                    verifier(etats['repos']['fond']!=etats['programme']['fond'], prefixe+' : pas programmé distinct')
                    verifier(etats['courant']['fond']=='rgb(242, 241, 232)' and etats['courant']['couleur']=='rgb(24, 32, 26)', prefixe+' : pas courant prioritaire et lisible')
                    if m in ('mc','stk'):
                        sel={'mc':'#mc-clips button','stk':'#stk-pads .sb'}[m]
                        cl2='sb attente' if m=='stk' else 'attente'
                        attente=pg.evaluate(ETATS,[sel,{'attente':cl2}])['attente']
                        verifier(attente['fond']=='rgb(66, 53, 29)' and attente['couleur']=='rgb(255, 225, 164)', prefixe+' : attente ambre lisible')
                    if m=='ko':
                        pg.locator('#ko-rec').click(timeout=4000)
                        verifier(style(pg,'#ko-rec')['fond']=='rgb(183, 30, 61)', prefixe+' : RECORD rouge')
                        pg.locator('#ko-rec').click(timeout=4000)
                # Le bouton réel démarre et arrête ; pas seulement une classe simulée.
                pg.locator('#'+m+'-play').click(timeout=4000)
                pg.wait_for_timeout(150)
                verifier(pg.evaluate('S.run') and style(pg,'#'+m+'-play')['fond']=='rgb(117, 219, 165)', prefixe+' : PLAY réel vert')
                pg.locator('#'+m+'-play').click(timeout=4000)
                verifier(not pg.evaluate('S.run'), prefixe+' : arrêt accessible')
                if m=='kp':
                    pg.locator('#kp-write').click(timeout=4000)
                    verifier(pg.locator('#kp-mem button.arme').count()==8, prefixe+' : huit mémoires armées')
                    verifier(style(pg,'#kp-mem button.arme')['couleur']=='rgb(37, 21, 3)', prefixe+' : texte lisible sur armement ambre')
                    pg.locator('#kp-mem button').nth(1).click(timeout=4000)
                    verifier(pg.locator('#kp-mem button.plein').count()>=1, prefixe+' : mémoire enregistrée dans le stockage temporaire')
                    verifier('127, 211, 165' in style(pg,'#kp-mem button.plein')['ombre'], prefixe+' : témoin mémoire pleine conservé')
                    pg.locator('#kp-hold').click(timeout=4000)
                    pav=pg.locator('#kp-pav');pav.scroll_into_view_if_needed()
                    r=pav.bounding_box()
                    pg.mouse.move(r['x']+r['width']*.25,r['y']+r['height']*.65)
                    pg.mouse.down()
                    pg.mouse.move(r['x']+r['width']*.75,r['y']+r['height']*.2,steps=8)
                    pg.mouse.up()
                    xy=pg.evaluate('({x:KP.x,y:KP.y,tenu:KP.tenu,touche:KP.touche})')
                    verifier(abs(xy['x']-.75)<.02 and abs(xy['y']-.8)<.02 and xy['tenu'] and not xy['touche'], prefixe+' : geste X/Y et HOLD conservés')
                    verifier(pg.locator('#kp-point').is_visible(), prefixe+' : point HOLD visible')
                    pg.locator('#kp-hold').click(timeout=4000)
                    verifier(not pg.locator('#kp-point').is_visible(), prefixe+' : point masqué après fin de HOLD')
                    verifier(pg.evaluate("()=>['kp-point','kp-trace'].every(id=>getComputedStyle(document.getElementById(id)).pointerEvents==='none')"), prefixe+' : aucun décor ne bloque le pavé')
                # Respect de la préférence de mouvement réduit, aussi sur mobile.
                pg.emulate_media(reduced_motion='reduce')
                bouton=pg.locator('#'+m+'-play');bouton.scroll_into_view_if_needed()
                r=bouton.bounding_box();pg.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);pg.mouse.down()
                pg.wait_for_timeout(100)
                verifier(style(pg,'#'+m+'-play')['transformation']=='none', prefixe+' : mouvement réduit')
                pg.mouse.up();pg.evaluate('stop()');pg.emulate_media(reduced_motion='no-preference')
                resultats.append({'format':[largeur,hauteur],'machine':m,'chassis':chassis})
                print('Contrôlé : '+prefixe, flush=True)
            pg.evaluate(G.OUVRIR,'16')
            verifier(pg.evaluate("getComputedStyle(actif).getPropertyValue('--face-accent').trim()===''"),f'{largeur} : aucune matière récente appliquée à la DRM')
            verifier(not fautes_js,f'{largeur} : erreurs JavaScript {fautes_js}')
            contexte.close()
        nav.close()
    rapport={'cas':resultats,'erreurs':erreurs,'stockage_simule':args.contenu}
    if args.rapport:
        args.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{len(resultats)} cas façade/format ; {len(erreurs)} erreur(s).')
    return bool(erreurs)

if __name__=='__main__':
    raise SystemExit(main())
