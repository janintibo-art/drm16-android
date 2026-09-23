#!/usr/bin/env python3
"""v264 — Panneaux d'outils : disposition, cibles et commandes existantes.

Six formats, neuf accès, six rayons de bibliothèque, notices, commandes du
mixage et du MIDI. Aucun compte Freesound, fichier personnel ou périphérique.
Les applications invitées sont contrôlées au niveau de leur châssis seulement.
--contenu emploie le stockage temporaire simulé du test-graphique.py.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parents[1]
FORMATS = [(393,851),(880,400),(360,640),(1280,800),(393,400),(320,568)]
PANNEAUX = [('bib','bib'),('enr','enr'),('pr','pr'),('table','table'),
            ('syro','syro'),('notices','note'),('studio','studio'),
            ('nexus','nexus'),('audio','audio-diagnostic')]
spec = importlib.util.spec_from_file_location('graphique',RACINE/'outils/test-graphique.py')
graphique = importlib.util.module_from_spec(spec)
spec.loader.exec_module(graphique)
MESURES = r'''id => {
 const p=document.getElementById(id),r=p.getBoundingClientRect();
 const cibles=[...p.querySelectorAll('button,select,input:not([type=checkbox]):not([type=file]),summary')]
   .filter(e=>e.getClientRects().length && !e.closest('.enr-tt'))
   .map(e=>{const b=e.getBoundingClientRect();return {id:e.id||e.textContent.slice(0,35),
     w:b.width,h:b.height,police:parseFloat(getComputedStyle(e).fontSize)};});
 const t=p.querySelector('.note-bar>b');
 const fermer=p.querySelector('[id$="-fermer"]');
 const f=fermer?fermer.getBoundingClientRect():null;
 return {id,w:innerWidth,h:innerHeight,rect:r.toJSON(),document:document.documentElement.scrollWidth,
   largeur:p.scrollWidth,client:p.clientWidth,
   petites:cibles.filter(x=>x.w<43.8||x.h<43.8||x.police<10.5),
   titreCoupe:!!t && (t.scrollWidth>t.clientWidth+1 || t.scrollHeight>t.clientHeight+1),
   fermer:f?f.toJSON():null,
   enfants:[...p.children].filter(e=>e.getClientRects().length && getComputedStyle(e).position!=='absolute')
     .map(e=>({id:e.id||e.className,rect:e.getBoundingClientRect().toJSON()}))};
}'''


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium')
    ap.add_argument('--contenu',action='store_true')
    ap.add_argument('--rapport',type=Path)
    ap.add_argument('--captures',type=Path)
    args=ap.parse_args()
    if args.captures:
        args.captures.mkdir(parents=True,exist_ok=True)
    erreurs,mesures=[],[]
    assertions=0
    def verifier(ok,texte):
        nonlocal assertions
        assertions+=1
        if not ok:
            erreurs.append(texte)
            print('FAUX : '+texte,flush=True)
    with sync_playwright() as p:
        opts={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:
            opts['executable_path']=args.chromium
            opts['args'].append('--no-sandbox')
        nav=p.chromium.launch(**opts)
        for w,h in FORMATS:
            ctx=nav.new_context(viewport={'width':w,'height':h},has_touch=True)
            pg=ctx.new_page()
            pg.set_default_timeout(5000)
            erreurs_js=[]
            pg.on('pageerror',lambda e:erreurs_js.append(str(e)))
            fichier=RACINE/'app/src/main/assets/drm16.html'
            if args.contenu:
                pg.evaluate(graphique.STOCKAGE)
                pg.set_content(fichier.read_text(encoding='utf-8'),wait_until='domcontentloaded')
            else:
                pg.goto(fichier.as_uri(),wait_until='domcontentloaded')
            pg.wait_for_timeout(1000)
            prefixe=f'{w}x{h}'
            def ouvrir(acces):
                pg.evaluate('ouvrirMenu()')
                pg.locator('#catalogue-outils').click()
                pg.locator('#menu-'+acces).click(timeout=5000)
                pg.wait_for_timeout(70)
            def mesurer(id,detail=''):
                m=pg.evaluate(MESURES,id);m['detail']=detail;mesures.append(m)
                titre=prefixe+' '+id+' '+detail
                verifier(m['document']<=w+1 and m['largeur']<=m['client']+1,titre+' sans débordement global')
                verifier(not m['petites'],titre+' commandes >=44px / texte >=10,5px '+str(m['petites']))
                verifier(not m['titreCoupe'],titre+' titre entièrement lisible')
                if id!='audio-diagnostic':
                    f=m['fermer']
                    verifier(f and f['x']>=0 and f['right']<=w+1 and f['y']>=0 and f['bottom']<=h+1,titre+' fermeture visible')
                    verifier(all(e['rect']['bottom']<=h+1 for e in m['enfants']),titre+' zones restent dans la fenêtre')
                return m
            for acces,id in PANNEAUX:
                ouvrir(acces)
                verifier(pg.locator('#'+id).is_visible(),prefixe+' ouverture '+id)
                mesurer(id)
                if args.captures:
                    pg.screenshot(path=str(args.captures/f'{id}-{w}x{h}.png'))
                if id=='pr':
                    zone=pg.locator('#pr-zone').bounding_box()
                    verifier(zone['height']>=99,prefixe+' piano roll hauteur >=100px')
                    z=pg.evaluate('PR.zoom')
                    pg.locator('#pr-zplus').click()
                    verifier(abs(pg.evaluate('PR.zoom')-z*1.5)<0.0001,prefixe+' zoom MIDI fonctionnel')
                    pg.locator('#pr-zmoins').click()
                    verifier(abs(pg.evaluate('PR.zoom')-z)<0.0001,prefixe+' zoom MIDI retour')
                    grille=pg.evaluate('PR.grille')
                    pg.locator('#pr-grille').click()
                    verifier(pg.evaluate('PR.grille')!=grille,prefixe+' réglage grille MIDI')
                    # Une vraie note par le canvas : le repère tactile suit toujours le dessin.
                    pg.locator('#pr-canvas').click(position={'x':120,'y':33})
                    verifier(pg.evaluate('PR.notes.length')==1,prefixe+' ajout MIDI par le canvas')
                    pg.locator('#pr-outils [data-pr="supprimer"]').click()
                    verifier(pg.evaluate('PR.notes.length')==0,prefixe+' supprimer atteint au bout du rail')
                elif id=='enr':
                    verifier(pg.locator('#enr-corps').bounding_box()['height']>=99,prefixe+' vue MIDI >=100px')
                    verifier(pg.locator('.enr-bas').bounding_box()['height']>=99,prefixe+' réglages MIDI >=100px')
                    mode=pg.evaluate('ENR.decoupe')
                    pg.locator('#enr-decoupe').click()
                    verifier(pg.evaluate('ENR.decoupe')!=mode,prefixe+' découpe toujours fonctionnelle')
                    pg.locator('#enr-decoupe').click()
                    pg.evaluate('''ENR.affiche={nom:"Fixture v264",duree:600,evts:[[0,144,36,100],[250,128,36,0],[300,144,38,100],[600,128,38,0]]};dessinerEnr()''')
                    verifier(pg.locator('.enr-tt').count()==2,prefixe+' deux pistes MIDI de test')
                    alignement=pg.evaluate('''() => {const cv=document.getElementById('enr-vue').getBoundingClientRect();return [...document.querySelectorAll('.enr-tt')].every((e,i)=>{const r=e.getBoundingClientRect();return r.height===ENR_H&&Math.abs(r.y-cv.y-ENR_REGLE-i*ENR_H)<1;});}''')
                    verifier(alignement,prefixe+' étiquettes alignées sur les 34px du canvas')
                    pg.locator('.enr-tt button.coupe').first.click()
                    verifier(pg.evaluate('Object.keys(ENR.muet).length')==1,prefixe+' coupe MIDI fonctionnelle')
                    pg.locator('.enr-tt button.coupe').first.click()
                    verifier(pg.evaluate('Object.keys(ENR.muet).length')==0,prefixe+' coupe MIDI réversible')
                    pg.evaluate('ENR.affiche=null;ENR.evts=[];dessinerEnr()')
                elif id=='table':
                    verifier(pg.locator('.voie').count()==pg.evaluate('SET_VOIES.length'),prefixe+' toutes les voies présentes')
                    premiere=pg.locator('.voie').first
                    cle=premiere.get_attribute('data-v')
                    premiere.locator('[data-a="mute"]').click()
                    verifier(pg.evaluate('id=>!!SET.mute[id]',cle),prefixe+' coupe table fonctionnelle')
                    premiere.locator('[data-a="mute"]').click()
                    premiere.locator('[data-a="solo"]').click()
                    verifier(pg.evaluate('SET.solo')==cle,prefixe+' solo table fonctionnel')
                    premiere.locator('[data-a="solo"]').click()
                    verifier(pg.evaluate('SET.solo')=='',prefixe+' solo table réversible')
                    # Dernière tranche : vrai clic, sans forcer, malgré les deux axes.
                    dernier=pg.locator('.voie').last
                    id_fin=dernier.get_attribute('data-v')
                    dernier.locator('[data-a="mute"]').click()
                    verifier(pg.evaluate('id=>!!SET.mute[id]',id_fin),prefixe+' dernière voie accessible par défilement')
                    dernier.locator('[data-a="mute"]').click()
                    # Le fader reste vertical et réellement manipulable au clavier.
                    niveau=premiere.locator('[data-a="niv"]')
                    niveau.focus();ancien=float(niveau.input_value())
                    pg.keyboard.press('ArrowLeft')
                    verifier(abs(pg.evaluate('id=>SET.niv[id]',cle)-max(0,ancien-0.01))<0.0001,prefixe+' fader raccordé au mixage')
                elif id=='bib':
                    verifier(pg.locator('#bib-nav button').count()==7,prefixe+' sept rayons conservés')
                    for index in range(7):
                        pg.locator('#bib-nav button').nth(index).click()
                        verifier(pg.evaluate('BIB.onglet')==index,prefixe+' rayon '+str(index)+' sélectionné')
                        mesurer('bib','rayon '+str(index))
                    pg.locator('#bib-nav button').nth(0).click()
                    recherche=pg.locator('#bib-corps input[type=search]').first
                    recherche.fill('aucun-son-test-v264')
                    verifier(pg.locator('.bib-vide').is_visible(),prefixe+' recherche vide explicitée')
                    recherche.fill('')
                    # Les fichiers restent des fixtures locaux, sans appels Freesound distants.
                    pg.locator('#bib-nav button').nth(5).click()
                    pg.locator('#kits-machine').select_option('es1')
                    verifier(pg.evaluate('S.modele')=='es1',prefixe+' rayon machines sélection conservée')
                    mesurer('bib','kit ES-1')
                    pg.locator('#bib-nav button').nth(0).click()
                elif id=='note':
                    for i in range(pg.locator('#note-nav button').count()):
                        pg.locator('#note-nav button').nth(i).click()
                        verifier(pg.locator('#note .doc.vu').count()==1,prefixe+' notice '+str(i)+' unique')
                        # Les tableaux et réglages de chaque notice restent dans leur colonne.
                        deb=pg.locator('#note .note-corps').evaluate('e=>e.scrollWidth-e.clientWidth')
                        verifier(deb<=1,prefixe+' notice '+str(i)+' largeur '+str(deb))
                elif id=='audio-diagnostic':
                    pg.locator('#audio-actualiser').click()
                    verifier(bool(pg.locator('#audio-releve').inner_text().strip()),prefixe+' relevé audio présent')
                fermer='audio-fermer' if id=='audio-diagnostic' else id+'-fermer'
                pg.locator('#'+fermer).click(timeout=5000)
                verifier(not pg.locator('#'+id).is_visible(),prefixe+' fermeture '+id)
            # Ni l'habillage ni le responsive ne fixent l'accent de la machine.
            pg.evaluate("allerMachine('32');ouvrirBib()")
            accent=pg.evaluate("getComputedStyle(document.getElementById('bib')).getPropertyValue('--outil-accent').trim()")
            base=pg.evaluate("getComputedStyle(document.body).getPropertyValue('--accent').trim()")
            verifier(accent==base,prefixe+' accent hérité de la machine')
            pg.locator('#bib-fermer').click()
            verifier(not erreurs_js,prefixe+' erreurs JavaScript '+str(erreurs_js))
            print('Contrôlé : '+prefixe,flush=True)
            ctx.close()
        nav.close()
    rapport={'formats':FORMATS,'assertions':assertions,'erreurs':erreurs,'mesures':mesures,'contenu_simule':args.contenu}
    if args.rapport:
        args.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{len(FORMATS)} formats, {assertions} vérifications, {len(erreurs)} erreur(s).')
    return bool(erreurs)

if __name__=='__main__':
    raise SystemExit(main())
