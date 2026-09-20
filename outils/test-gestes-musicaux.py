#!/usr/bin/env python3
"""v266 : trajectoires Kaoss et bagues MOTION de la volca sample.
Vrais événements de pointeur et vrai navigateur ; données musicales synthétiques.
Les pas sont avancés explicitement : aucun test ne dépend d'un son téléchargé.
--contenu emploie un stockage temporaire simulé, comme les autres tests graphiques.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parents[1]
FORMATS = [(393, 851), (880, 400), (360, 640), (1280, 800), (320, 568)]
spec = importlib.util.spec_from_file_location('graphique', RACINE / 'outils/test-graphique.py')
graphique = importlib.util.module_from_spec(spec)
spec.loader.exec_module(graphique)
KP_DONNEES = 'JSON.stringify({programme:programmeKp(),x:KP.x,y:KP.y,tenu:KP.tenu,touche:KP.touche,enregistre:KP.enregistre,rejoue:KP.rejoue,mpos:KP.mpos})'
VLC_DONNEES = 'JSON.stringify({partie:partieVlcSel(),cur:VLC.cur,sel:VLC.sel,pos:VLC.pos,rec:VLC.rec,recPas:VLC.recPas,song:VLC.song})'
AIGUILLES = 'Array.from(document.querySelectorAll("#vlc-kns .bt>i"),e=>e.getAttribute("style"))'


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium')
    ap.add_argument('--contenu', action='store_true')
    ap.add_argument('--rapport', type=Path)
    ap.add_argument('--captures', type=Path)
    args = ap.parse_args()
    if args.captures:
        args.captures.mkdir(parents=True, exist_ok=True)
    erreurs, observations, total = [], [], 0

    def verifier(ok, nom):
        nonlocal total
        total += 1
        if not ok:
            erreurs.append(nom)
            print('FAUX : ' + nom, flush=True)

    with sync_playwright() as p:
        options = {'headless': True, 'args': ['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:
            options['executable_path'] = args.chromium
            options['args'].append('--no-sandbox')
        nav = p.chromium.launch(**options)
        for indice, (w, h) in enumerate(FORMATS):
            contexte = nav.new_context(viewport={'width': w, 'height': h}, has_touch=True)
            pg = contexte.new_page()
            pg.set_default_timeout(7000)
            js = []
            pg.on('pageerror', lambda e: js.append(str(e)))
            fichier = RACINE / 'app/src/main/assets/drm16.html'
            if args.contenu:
                pg.evaluate(graphique.STOCKAGE)
                pg.set_content(fichier.read_text(encoding='utf-8'), wait_until='domcontentloaded')
            else:
                pg.goto(fichier.as_uri(), wait_until='domcontentloaded')
            pg.wait_for_timeout(650)
            prefixe = f'{w}x{h}'

            def etat():
                return pg.evaluate('GESTES_MUSICAUX.inspecter()')

            def agir(code):
                pg.evaluate(code)
                pg.wait_for_timeout(130)

            def capture(nom):
                if args.captures:
                    pg.screenshot(path=str(args.captures / f'{nom}-{prefixe}.png'))

            def repos(nom):
                pg.wait_for_timeout(700)
                a = etat()
                pg.wait_for_timeout(200)
                b = etat()
                verifier(not b['anime'] and a['frames'] == b['frames'], prefixe + ' ' + nom)

            verifier(etat()['version'] == 266, prefixe + ' initialisation')
            verifier(pg.evaluate('MACHINE_KP.schedule===scheduleKp && MACHINE_VLC.schedule===scheduleVlc'),
                     prefixe + ' moteurs schedule non remplacés')
            pg.evaluate(graphique.OUVRIR, 'kp')
            pg.wait_for_timeout(230)
            verifier(etat()['kpVisible'], prefixe + ' Kaoss visible')
            verifier(pg.locator('#gm-kp-canvas').count() == 1, prefixe + ' un seul canvas')
            verifier(pg.locator('#kp-trace').evaluate('(e)=>getComputedStyle(e).display==="none" && e.children.length===0'),
                     prefixe + ' anciennes pastilles remplacées, pas de DOM doublé')
            info = pg.evaluate('''()=>{const p=document.getElementById('kp-pav'),c=document.getElementById('gm-kp-canvas'),r=p.getBoundingClientRect(),z=c.getBoundingClientRect();return {cw:c.width,ch:c.height,w:p.clientWidth,h:p.clientHeight,align:Math.abs(z.x-r.x-parseFloat(getComputedStyle(p).borderLeftWidth))<2,
              bloque:[c,...p.querySelectorAll('.gm-kp-haut,.gm-kp-bas')].some(e=>getComputedStyle(e).pointerEvents!=="none"),doc:document.documentElement.scrollWidth};}''')
            verifier(not info['bloque'], prefixe + ' décor transparent aux gestes')
            verifier(info['cw'] == info['w'] and info['ch'] == info['h'] and info['align'],
                     prefixe + ' géométrie locale du pavé')
            verifier(info['doc'] <= w + 1, prefixe + ' pas de débordement horizontal Kaoss')
            verifier(pg.locator('#kp-pav').get_attribute('aria-describedby').find('gm-kp-description') >= 0,
                     prefixe + ' description non interactive présente')
            repos('pavé arrêté : aucun raf permanent')

            # Vrais événements : le module ne remplace pas les écouteurs du pavé.
            pg.locator('#kp-pav').scroll_into_view_if_needed()
            r = pg.locator('#kp-pav').bounding_box()
            pg.mouse.move(r['x'] + r['width'] * .25, r['y'] + r['height'] * .7)
            pg.mouse.down()
            pg.wait_for_timeout(80)
            for x, y in ((.4, .4), (.55, .65), (.75, .3)):
                pg.mouse.move(r['x'] + r['width'] * x, r['y'] + r['height'] * y)
                pg.wait_for_timeout(60)
            a = etat()
            xy = pg.evaluate('({x:KP.x,y:KP.y,t:KP.touche})')
            verifier(xy['t'] and abs(xy['x'] - .75) < .015 and abs(xy['y'] - .7) < .015,
                     prefixe + ' coordonnées natives et Y ascendant')
            verifier(a['etat'] == 'direct' and 2 <= a['trace'] <= 32, prefixe + ' trace directe bornée')
            verifier('75' in pg.locator('#gm-kp-xy').inner_text(), prefixe + ' retour numérique X')
            pg.mouse.up()
            pg.wait_for_timeout(700)
            verifier(not pg.evaluate('KP.touche') and etat()['trace'] == 0, prefixe + ' fin du geste et disparition de la trace')

            # HOLD reste un état de la machine, pas une simulation de notre vue.
            pg.locator('#kp-hold').click()
            pg.wait_for_timeout(140)
            verifier(pg.evaluate('KP.tenu') and etat()['etat'] == 'hold', prefixe + ' HOLD conservé')
            sauvegarde = pg.evaluate(KP_DONNEES)
            for _ in range(3):
                agir('GESTES_MUSICAUX.reveiller()')
            verifier(sauvegarde == pg.evaluate(KP_DONNEES), prefixe + ' dessin sans écriture Kaoss')
            repos('HOLD immobile : aucun raf permanent')

            agir('KP.motion=[[.1,.2],[.8,.3],[.6,.85],[.25,.7]];KP.rejoue=false;KP.enregistre=false;majKp()')
            verifier(etat()['points'] == 4, prefixe + ' quatre points mémorisés')
            capture('kaoss-hold')
            pg.locator('#kp-rejoue').click()
            pg.wait_for_timeout(140)
            verifier(etat()['etat'] == 'pret' and pg.evaluate('KP.rejoue'), prefixe + ' rejeu armé distinct de lecture')
            agir('S.run=true;KP.mpos=0;scheduleKp(0,ctx.currentTime);MACHINE_KP.beat(0)')
            verifier(etat()['etat'] == 'lecture' and pg.locator('#gm-kp-compte').inner_text() == 'PT 1 / 4',
                     prefixe + ' premier point relu sans décalage')
            verifier(pg.evaluate('KP.x===.1 && KP.y===.2 && KP.mpos===1'), prefixe + ' coordonnées du moteur conservées')
            agir('scheduleKp(1,ctx.currentTime);scheduleKp(2,ctx.currentTime);scheduleKp(3,ctx.currentTime);MACHINE_KP.beat(3)')
            verifier(pg.locator('#gm-kp-compte').inner_text() == 'PT 4 / 4', prefixe + ' dernier point, index bouclé')
            agir('scheduleKp(4,ctx.currentTime);MACHINE_KP.beat(4)')
            verifier(pg.locator('#gm-kp-compte').inner_text() == 'PT 1 / 4', prefixe + ' rebouclage visuel')
            sauvegarde = pg.evaluate(KP_DONNEES)
            pg.wait_for_timeout(180)
            verifier(sauvegarde == pg.evaluate(KP_DONNEES), prefixe + ' la vue ne fait pas avancer le rejeu')
            capture('kaoss-rejeu')
            agir('S.run=false;majKp()')
            verifier(etat()['etat'] == 'pret', prefixe + ' arrêt conservant le geste')
            pg.locator('#kp-effacer').click()
            pg.wait_for_timeout(150)
            verifier(etat()['points'] == 0 and pg.evaluate('KP.motion.length===0 && !KP.rejoue'), prefixe + ' effacement natif')
            pg.locator('#kp-motion').click()
            pg.wait_for_timeout(140)
            verifier(etat()['etat'] == 'arme' and pg.evaluate('KP.enregistre'), prefixe + ' enregistrement armé')
            agir('S.run=true;KP.x=.25;KP.y=.8;scheduleKp(0,ctx.currentTime);MACHINE_KP.beat(0)')
            verifier(etat()['etat'] == 'rec' and pg.evaluate('KP.motion.length===1 && KP.motion[0][0]===.25 && KP.motion[0][1]===.8'),
                     prefixe + ' enregistrement réel du pas')
            pg.locator('#kp-motion').click()
            pg.wait_for_timeout(140)
            verifier(not pg.evaluate('KP.enregistre') and etat()['points'] == 1, prefixe + ' arrêt enregistrement sans effacement')
            agir('S.run=false;KP.tenu=false;majKp()')

            if indice == 0:
                # Caps, mouvement réduit, perte du pointeur, cycle de vie et zoom.
                pg.locator('#kp-pav').scroll_into_view_if_needed()
                r = pg.locator('#kp-pav').bounding_box()
                pg.mouse.move(r['x'] + r['width'] * .5, r['y'] + r['height'] * .5)
                pg.mouse.down()
                pg.wait_for_timeout(90)
                agir('document.getElementById("kp-pav").dispatchEvent(new PointerEvent("pointercancel",{pointerId:1,bubbles:true}))')
                verifier(not pg.evaluate('KP.touche'), 'pointeur annulé : fin du contact natif')
                pg.mouse.up()
                agir('KP.motion=Array.from({length:270},(_,i)=>[i/270,.5]);majKp()')
                verifier(etat()['points'] == 256 and pg.evaluate('KP.motion.length') == 270,
                         'sécurité : vue bornée sans réécrire les données')
                agir('KP.motion=[[.2,.2],null,[NaN,.8],[.8,.8]];majTraceKp()')
                verifier(etat()['points'] == 4, 'sécurité : données invalides sans exception')
                agir('KP.motion=[[.1,.2],[.8,.9]];KP.rejoue=true;S.run=true;KP.mpos=1;majKp()')
                pg.emulate_media(reduced_motion='reduce')
                pg.wait_for_timeout(250)
                verifier(etat()['reduit'] and etat()['trace'] == 0 and etat()['points'] == 2,
                         'mouvement réduit : trajectoire conservée sans traînée')
                a = etat()['frames']
                pg.wait_for_timeout(1050)
                delta = etat()['frames'] - a
                verifier(1 <= delta <= 12, 'mouvement réduit : cadence <=10/s, tolérance 2, observé ' + str(delta))
                pg.emulate_media(reduced_motion='no-preference')
                pg.wait_for_timeout(120)
                a = etat()['frames']
                pg.wait_for_timeout(1050)
                delta = etat()['frames'] - a
                verifier(1 <= delta <= 34, 'performance : cadence <=30/s, tolérance 4, observé ' + str(delta))

                for ouvrir, fermer, nom in [
                    ('ouvrirMenu()', 'menu.classList.add("hide");document.body.classList.remove("menu-ouvert")', 'menu'),
                    ('ouvrirTable()', 'fermerTable()', 'table'),
                    ('document.body.inert=true', 'document.body.inert=false', 'écran inert'),
                    ('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))',
                     'delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))', 'arrière-plan'),
                    ('window.dispatchEvent(new Event("pagehide"))', 'window.dispatchEvent(new Event("pageshow"))', 'page masquée')]:
                    agir(ouvrir)
                    a = etat()
                    pg.wait_for_timeout(180)
                    b = etat()
                    verifier(not b['anime'] and not b['kpVisible'] and a['frames'] == b['frames'], 'cycle : arrêt sous ' + nom)
                    agir(fermer + ';GESTES_MUSICAUX.reveiller()')
                    verifier(etat()['kpVisible'], 'cycle : retour après ' + nom)
                agir('window.gmVraiCtx=ctx;ctx=new OfflineAudioContext(2,256,48000);GESTES_MUSICAUX.reveiller()')
                verifier(not etat()['anime'] and not etat()['kpVisible'], 'export hors ligne : vue arrêtée')
                agir('ctx=gmVraiCtx;GESTES_MUSICAUX.reveiller()')
                verifier(etat()['kpVisible'], 'export : retour à la vue réelle')
                agir('S.run=true;KP.rejoue=true;ctx.suspend()')
                pg.wait_for_timeout(650)
                verifier(not etat()['anime'] and etat()['etat'] == 'pret', 'contexte suspendu : pas de rejeu simulé')
                agir('ctx.resume()')
                verifier(etat()['anime'] and etat()['etat'] == 'lecture', 'contexte repris : affichage réveillé')
                agir('S.run=false;KP.rejoue=false;KP.motion=[];majKp()')
                avant = pg.locator('#gm-kp-canvas').evaluate('(e)=>({w:e.width,h:e.height})')
                agir('ZOOM.z=1.35;fit()')
                apres = pg.locator('#gm-kp-canvas').evaluate('(e)=>({w:e.width,h:e.height})')
                verifier(avant == apres, 'zoom : résolution locale inchangée')
                agir('ZOOM.z=1;ZOOM.tx=0;ZOOM.ty=0;fit()')
                pg.set_viewport_size({'width': 880, 'height': 400})
                pg.wait_for_timeout(220)
                verifier(pg.locator('#gm-kp-canvas').evaluate('(e)=>e.width===document.getElementById("kp-pav").clientWidth'),
                         'rotation : canvas redimensionné')
                pg.set_viewport_size({'width': w, 'height': h})
                pg.wait_for_timeout(220)

            pg.evaluate(graphique.OUVRIR, 'vlc')
            pg.wait_for_timeout(200)
            verifier(etat()['vlcVisible'] and not etat()['kpVisible'], prefixe + ' changement de machine')
            verifier(pg.locator('#gm-vlc-info').count() == 1 and pg.locator('#unit-vlc .gm-anneau').count() == 11,
                     prefixe + ' onze bagues, un bandeau')
            verifier(pg.locator('#unit-vlc .gm-anneau').evaluate_all('(es)=>es.every(e=>getComputedStyle(e).pointerEvents==="none")'),
                     prefixe + ' bagues non interactives')
            verifier(pg.locator('#gm-vlc-info').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1 && e.getBoundingClientRect().x>=0 && e.getBoundingClientRect().right<=innerWidth+1'),
                     prefixe + ' bandeau sans débordement')
            aiguilles = pg.evaluate(AIGUILLES)
            agir('''const P=partieVlcSel();P.mot={};P.f.motion=true;P.f.mute=false;
              VLC_PARAMS.forEach((p,i)=>{P.mot[p[0]]=Array(16).fill(-1);P.mot[p[0]][3]=i*12;});
              S.run=true;VLC.rec=false;VLC.recPas=false;VLC.song=false;MACHINE_VLC.beat(3);majVlc()''')
            a = etat()['volca']
            verifier(len(a) == 11 and all(v['stocke'] and v['visible'] and v['valeur'] == i * 12 for i, v in enumerate(a)),
                     prefixe + ' onze valeurs programmées du pas affiché')
            verifier(pg.locator('#gm-vlc-etat').inner_text() == 'PAS 04', prefixe + ' numéro de pas humain')
            verifier(pg.evaluate(AIGUILLES) == aiguilles, prefixe + ' aiguilles manuelles inchangées')
            sauvegarde = pg.evaluate(VLC_DONNEES)
            for _ in range(3):
                agir('GESTES_MUSICAUX.reveiller()')
            verifier(sauvegarde == pg.evaluate(VLC_DONNEES), prefixe + ' dessin sans écriture volca')
            capture('volca-lecture')
            repos('volca : pas de raf permanent entre deux pas')
            agir('MACHINE_VLC.beat(4)')
            verifier(all(v['valeur'] is None and v['etat'] == 'vide' for v in etat()['volca']), prefixe + ' -1 : aucune fausse valeur automatisée')
            verifier(pg.locator('.gm-anneau[data-valeur]').count() == 0, prefixe + ' point masqué sur pas vide')
            agir('MACHINE_VLC.beat(3);partieVlcSel().f.mute=true;majVlc();GESTES_MUSICAUX.reveiller()')
            verifier(pg.locator('#gm-vlc-etat').inner_text() == 'MUTE' and pg.locator('.gm-anneau[data-valeur]').count() == 0,
                     prefixe + ' MUTE sans faux point de lecture')
            agir('partieVlcSel().f.mute=false;S.run=false;MACHINE_VLC.arret();majVlc();GESTES_MUSICAUX.reveiller()')
            verifier(pg.locator('#gm-vlc-etat').inner_text() == 'STOP' and all(v['valeur'] is None for v in etat()['volca']), prefixe + ' arrêt sans perte de mouvements')
            pg.locator('#vlc-rec').click()
            pg.wait_for_timeout(140)
            verifier(pg.evaluate('VLC.recPas && !VLC.rec') and pg.locator('#gm-vlc-etat').inner_text() == 'STOP',
                     prefixe + ' REC PAS distinct de REC MOTION')
            agir('VLC.recPas=false;partieVlcSel().mot={};partieVlcSel().f.motion=false;majVlc();GESTES_MUSICAUX.reveiller()')
            pg.locator('#vlc-motion').click()
            pg.wait_for_timeout(140)
            verifier(pg.evaluate('VLC.rec') and pg.locator('#gm-vlc-etat').inner_text() == 'ARMÉ', prefixe + ' armement MOTION')
            agir('S.run=true;MACHINE_VLC.beat(5)')
            verifier(pg.locator('#gm-vlc-etat').inner_text() == 'REC', prefixe + ' enregistrement MOTION en cours')
            avant = pg.evaluate('partieVlcSel().par.pan')
            bouton = pg.locator('#vlc-k-pan .bt')
            bouton.scroll_into_view_if_needed()
            r = bouton.bounding_box()
            pg.mouse.move(r['x'] + r['width'] / 2, r['y'] + r['height'] / 2)
            pg.mouse.down()
            pg.mouse.move(r['x'] + r['width'] / 2, r['y'] + r['height'] / 2 - 28, steps=5)
            pg.wait_for_timeout(180)
            v = pg.evaluate('({manuel:partieVlcSel().par.pan,mouvement:partieVlcSel().mot.pan,style:document.querySelector("#vlc-k-pan .bt>i").getAttribute("style")})')
            verifier(v['manuel'] != avant and v['mouvement'] and v['mouvement'][5] == v['manuel'], prefixe + ' vrai geste enregistré par le moteur natif')
            verifier(next(e for e in etat()['volca'] if e['nom'] == 'pan')['valeur'] == v['manuel'], prefixe + ' bague suit la donnée enregistrée pendant le geste')
            pg.mouse.up()
            pg.wait_for_timeout(140)
            capture('volca-enregistrement')
            pg.locator('#vlc-motion').click()
            pg.wait_for_timeout(140)
            verifier(not pg.evaluate('VLC.rec'), prefixe + ' fin REC conservée')
            pg.locator('#vlc-parts .vlcb').nth(1).click()
            pg.wait_for_timeout(160)
            verifier(pg.evaluate('VLC.sel') == 1 and not any(v['visible'] for v in etat()['volca']), prefixe + ' partie sans mouvement : pas de bague résiduelle')
            agir('S.run=false;MACHINE_VLC.arret();GESTES_MUSICAUX.reveiller()')
            agir('VLC.sel=0;majVlc()')
            verifier(any(v['stocke'] for v in etat()['volca']), prefixe + ' sélection sans clic : bagues actualisées')
            agir('partieVlcSel().f.mute=true;majVlc()')
            verifier(pg.locator('#gm-vlc-etat').inner_text() == 'MUTE', prefixe + ' MUTE sans clic : état actualisé')
            agir('partieVlcSel().f.mute=false;VLC.sel=1;majVlc()')
            verifier(not any(v['stocke'] for v in etat()['volca']), prefixe + ' nouvelle partie sans clic : données non périmées')
            capture('volca-sans-mouvement')
            observations.append({'format': prefixe, 'kaoss': info, 'volca': etat()})
            pg.evaluate(graphique.OUVRIR, 'ko')
            pg.wait_for_timeout(200)
            repos('autre machine : vue arrêtée')
            for _ in range(2):
                pg.evaluate(graphique.OUVRIR, 'kp')
                pg.wait_for_timeout(100)
                pg.evaluate(graphique.OUVRIR, 'vlc')
                pg.wait_for_timeout(100)
            verifier(pg.locator('#gm-kp-canvas').count() == 1 and pg.locator('.gm-anneau').count() == 11,
                     prefixe + ' aucun doublon après réouvertures')
            verifier(not js, prefixe + ' aucune erreur JavaScript : ' + str(js))
            print('Contrôlé : ' + prefixe, flush=True)
            contexte.close()

        # Haute densité : même tracé local, surface limitée (pas de bitmap géant).
        contexte = nav.new_context(viewport={'width': 393, 'height': 851}, device_scale_factor=3)
        pg = contexte.new_page()
        if args.contenu:
            pg.evaluate(graphique.STOCKAGE)
            pg.set_content(fichier.read_text(encoding='utf-8'), wait_until='domcontentloaded')
        else:
            pg.goto(fichier.as_uri(), wait_until='domcontentloaded')
        pg.wait_for_timeout(650)
        pg.evaluate(graphique.OUVRIR, 'kp')
        pg.wait_for_timeout(220)
        verifier(pg.evaluate('GESTES_MUSICAUX.inspecter().densite===2 && document.getElementById("gm-kp-canvas").width===2*document.getElementById("kp-pav").clientWidth'),
                 'densité 3 : rendu plafonné à 2 sans changement de coordonnées')
        contexte.close()
        nav.close()
    rapport = {'version': 266, 'verifications': total, 'formats': FORMATS, 'erreurs': erreurs,
               'observations': observations, 'stockage_simule': args.contenu}
    if args.rapport:
        args.rapport.write_text(json.dumps(rapport, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{total} vérifications ; {len(erreurs)} erreur(s).', flush=True)
    return bool(erreurs)


if __name__ == '__main__':
    raise SystemExit(main())
