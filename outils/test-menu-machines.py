#!/usr/bin/env python3
"""Catalogue v263 : filtres, recherche, accès existants et affichage responsive.

Chromium Playwright par défaut ; --chromium pour un exécutable déjà installé.
--contenu : page injectée avec un stockage temporaire simulé, sans disque utilisateur.
Aucun test n'utilise les sauvegardes réelles de l'application.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parents[1]
FORMATS = [(393, 851), (880, 400), (360, 640), (1280, 800), (393, 400)]
MACHINES = ['16','32','em1','er1','ea1','es1','ea2','er2','es2','emx','esx','arcm',
            't1k','dbi','cr5','vlc','dmx','eur','td3','rd6','tr808','tr909','tr707',
            'mpc3000','mpc2000','kp','mc','stk','ko']
OUTILS = {'menu-bib':'#bib.show','menu-pr':'#pr.show','menu-enr':'#enr.show',
          'menu-notices':'#note.show','menu-syro':'#syro.show','menu-table':'#table.show',
          'menu-studio':'#studio.show','menu-nexus':'#nexus.show',
          'menu-audio':'#audio-diagnostic[open]'}
# Réutilise exactement l'environnement déjà utilisé par les tests v260.
spec = importlib.util.spec_from_file_location('test_graphique', RACINE/'outils/test-graphique.py')
graphique = importlib.util.module_from_spec(spec)
spec.loader.exec_module(graphique)
MESURES = r"""() => {
 const boutons=[...menu.querySelectorAll('button,input')].filter(e=>e.getClientRects().length);
 const mesures=boutons.map(e=>{const r=e.getBoundingClientRect();return {
  id:e.id||e.dataset.m,largeur:r.width,hauteur:r.height,police:parseFloat(getComputedStyle(e).fontSize)};});
 const textes=[...menu.querySelectorAll('.catalogue-identite,.catalogue-description,.catalogue-apercu')]
  .filter(e=>e.getClientRects().length).filter(e=>e.scrollWidth>e.clientWidth+1);
 const entete=menu.querySelector('.catalogue-entete').getBoundingClientRect();
 return {largeur:innerWidth,hauteur:innerHeight,document:document.documentElement.scrollWidth,
  menu:menu.scrollWidth,client:menu.clientWidth,entete:entete.toJSON(),
  cibles:mesures,petites:mesures.filter(r=>r.largeur<43.9||r.hauteur<43.9||r.police<10.5),
  textesDebordants:textes.map(e=>e.className),
  visibles:[...menu.querySelectorAll('.pick:not([hidden])')].map(e=>e.dataset.m||e.id)};
}"""

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium')
    ap.add_argument('--contenu',action='store_true')
    ap.add_argument('--rapport',type=Path)
    ap.add_argument('--captures',type=Path)
    args=ap.parse_args()
    if args.captures:
        args.captures.mkdir(parents=True,exist_ok=True)
    fautes, observations = [], []
    assertions = 0
    def verifier(ok,message):
        nonlocal assertions
        assertions += 1
        if not ok:
            fautes.append(message)
            print('FAUX : '+message,flush=True)
    with sync_playwright() as p:
        options={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:
            options['executable_path']=args.chromium
            options['args'].append('--no-sandbox')
        nav=p.chromium.launch(**options)
        for largeur,hauteur in FORMATS:
            contexte=nav.new_context(viewport={'width':largeur,'height':hauteur},has_touch=True)
            pg=contexte.new_page()
            erreurs=[]
            pg.on('pageerror',lambda e:erreurs.append(str(e)))
            fichier=RACINE/'app/src/main/assets/drm16.html'
            if args.contenu:
                pg.evaluate(graphique.STOCKAGE)
                pg.set_content(fichier.read_text(encoding='utf-8'),wait_until='domcontentloaded')
            else:
                pg.goto(fichier.as_uri(),wait_until='domcontentloaded')
            pg.wait_for_timeout(1100)
            prefixe=f'{largeur}x{hauteur}'
            verifier(pg.locator('#menu.menu-studio').count()==1,prefixe+' catalogue initialisé')
            def visibles():
                return pg.evaluate("[...menu.querySelectorAll('.pick:not([hidden])')].map(e=>e.dataset.m||e.id)")
            verifier(visibles()==MACHINES,prefixe+' 29 machines présentes, aucun outil mélangé')
            verifier(pg.evaluate("document.querySelectorAll('#menu .catalogue-mini').length")==38,prefixe+' 38 silhouettes locales')
            verifier(pg.evaluate("document.activeElement.id")!='catalogue-recherche',prefixe+' aucun clavier imposé au démarrage')
            verifier(pg.evaluate("document.querySelector('#menu .pick[data-m=eur] .catalogue-description').textContent.startsWith(String(Object.keys(EUR_CAT).length))"),prefixe+' nombre de modules calculé')
            for vue in ['machines','outils']:
                pg.locator('#catalogue-'+vue).click()
                mesure=pg.evaluate(MESURES);mesure['vue']=vue;observations.append(mesure)
                verifier(mesure['document']<=largeur+1 and mesure['menu']<=mesure['client']+1,prefixe+' '+vue+' aucun débordement horizontal')
                verifier(not mesure['petites'],prefixe+' '+vue+' cibles >=44px : '+str(mesure['petites']))
                verifier(not mesure['textesDebordants'],prefixe+' '+vue+' aucun texte débordant : '+str(mesure['textesDebordants']))
                verifier(mesure['entete']['bottom']<hauteur-110,prefixe+' '+vue+' place disponible sous l’entête')
                if args.captures:
                    pg.screenshot(path=str(args.captures/f'{vue}-{largeur}x{hauteur}.png'))
            verifier(visibles()==list(OUTILS),prefixe+' neuf outils accessibles')
            pg.locator('#catalogue-machines').click()
            pg.evaluate("window.__catalogueAncien=allerMachine;window.__catalogueAppels=[];allerMachine=function(id){__catalogueAppels.push(id);return __catalogueAncien(id);};void 0")
            modeles = MACHINES if (largeur,hauteur)==FORMATS[0] else ["16","kp","mc","eur","ko"]
            for m in modeles:
                pg.locator(f'#menu .pick[data-m="{m}"]').click(timeout=5000)
                verifier(pg.evaluate('String(S.modele)')==m,prefixe+' clic '+m+' bon modèle')
                verifier(pg.locator('#menu').evaluate("e=>e.classList.contains('hide')"),prefixe+' clic '+m+' ferme le menu')
                pg.evaluate('ouvrirMenu()')
                pg.wait_for_timeout(25)
                verifier(pg.locator(f'#menu .pick[data-m="{m}"][aria-current="true"]').count()==1,prefixe+' badge '+m)
            verifier(pg.evaluate('__catalogueAppels')==modeles,prefixe+' un seul aiguillage par clic')
            pg.evaluate('allerMachine=__catalogueAncien;delete window.__catalogueAncien;delete window.__catalogueAppels')
            pg.evaluate("window.__catalogueAudio={};['allerMachine','audioInit','stop','save'].forEach(n=>{const f=window[n];__catalogueAudio[n]={f:f,n:0};window[n]=function(){__catalogueAudio[n].n++;return f.apply(this,arguments);};})")
            for famille in ['DRUM','SAMPLER','SYNTH','GROOVEBOX','FX']:
                pg.locator('#catalogue-filtre-'+famille.lower()).click()
                verifier(pg.evaluate("f=>[...menu.querySelectorAll('.pick:not([hidden])')].every(e=>e.dataset.m&&e.dataset.catalogueCategories.split(' ').includes(f))",famille),prefixe+' filtre '+famille)
                verifier(len(visibles())>0,prefixe+' filtre non vide '+famille)
            verifier(visibles()==['kp'],prefixe+' FX donne Kaoss Pad')
            pg.locator('#catalogue-filtre-tout').click()
            for texte,attendus in [('tr 808',['tr808']),('KORG kaoss',['kp']),('électro harmonix',['16','32']),('PO-33',['ko']),('SONICWARE',['stk'])]:
                pg.locator('#catalogue-recherche').fill(texte)
                verifier(visibles()==attendus,prefixe+' recherche '+texte)
            pg.locator('#catalogue-recherche').fill('introuvable-v263')
            verifier(visibles()==[] and pg.locator('.catalogue-vide').is_visible(),prefixe+' aucun résultat explicite')
            pg.locator('#catalogue-retablir').click()
            verifier(visibles()==MACHINES,prefixe+' rétablir la liste')
            verifier(pg.evaluate("Object.values(__catalogueAudio).every(o=>o.n===0)"),prefixe+' filtres sans appel audio/sauvegarde')
            pg.evaluate("Object.keys(__catalogueAudio).forEach(n=>window[n]=__catalogueAudio[n].f);delete window.__catalogueAudio")
            pg.locator('#catalogue-outils').click()
            pg.locator('#catalogue-recherche').fill('bibliotheque')
            verifier(visibles()==['menu-bib'],prefixe+' recherche outil sans accent')
            pg.locator('#catalogue-effacer').click()
            verifier(visibles()==list(OUTILS),prefixe+' effacement recherche')
            # Pour les deux pages invitées : vérifier le conteneur, pas leur contenu.
            services = OUTILS if (largeur,hauteur)==FORMATS[0] else {k:OUTILS[k] for k in ["menu-bib","menu-notices"]}
            for identifiant,cible in services.items():
                pg.locator('#'+identifiant).click(timeout=5000)
                verifier(pg.locator(cible).is_visible(),prefixe+' accès outil '+identifiant)
                if identifiant=='menu-audio':
                    pg.locator('#audio-fermer').click()
                pg.evaluate('ouvrirMenu()');pg.wait_for_timeout(25)
                pg.locator('#catalogue-outils').click()
            pg.locator('#catalogue-machines').click()
            pg.locator('#catalogue-filtre-fx').click()
            pg.locator('#menu .pick[data-m="kp"]').focus()
            pg.keyboard.press('Enter')
            verifier(pg.evaluate('S.modele')=='kp' and pg.locator('#menu').evaluate("e=>e.classList.contains('hide')"),prefixe+' activation clavier conservée')
            pg.evaluate('ouvrirMenu()');pg.wait_for_timeout(25)
            pg.emulate_media(reduced_motion='reduce')
            verifier(pg.locator('#menu .pick[data-m="kp"]').evaluate("e=>getComputedStyle(e).transitionDuration")=='0s',prefixe+' réduction animations')
            verifier(not erreurs,prefixe+' erreurs JavaScript : '+str(erreurs))
            print('Contrôlé : '+prefixe,flush=True)
            contexte.close()
        nav.close()
    rapport={'formats':FORMATS,'assertions':assertions,'erreurs':fautes,'mesures':observations,'contenu_simule':args.contenu}
    if args.rapport:
        args.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{len(FORMATS)} formats, {assertions} vérifications, {len(fautes)} erreur(s).')
    return bool(fautes)

if __name__=='__main__':
    raise SystemExit(main())
