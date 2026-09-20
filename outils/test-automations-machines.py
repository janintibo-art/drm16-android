#!/usr/bin/env python3
"""v267 : repères Electribe et TR-1000, données musicales synthétiques.
Vrai Chromium. Pas de téléchargement de sons. --contenu simule localStorage.
L'affichage donne une valeur programmée, pas un résultat des probabilités audio.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('graphique', RACINE / 'outils/test-graphique.py')
graphique = importlib.util.module_from_spec(spec)
spec.loader.exec_module(graphique)
FORMATS = [(393, 851), (880, 400), (360, 640), (1280, 800), (320, 568)]
MODELES = [('em1', 'EM', 'em', 'pit', -1), ('er1', 'ER', 'er', 'pitch', 0),
           ('er2', 'ER', 'er', 'pitch', 0), ('ea1', 'EA', 'ea', 'ofs', -1),
           ('ea2', 'EA', 'ea', 'ofs', -1), ('es1', 'ES', 'es', 'pitch', -1),
           ('es2', 'ES', 'es', 'pitch', -1), ('emx', 'MX', 'mx', 'pitch', -1), ('esx', 'SX', 'sx', 'pitch', -1)]
NATIFS = '''()=>[MACHINE_EM.schedule===scheduleEm,MACHINE_ER.schedule===scheduleEr,
MACHINE_EA.schedule===scheduleEa,MACHINE_ES.schedule===scheduleEs,MACHINE_MX.schedule===scheduleMx,
MACHINE_SX.schedule===scheduleSx,MACHINE_T1K.schedule===scheduleT1k].every(Boolean)'''
DONNEES = '''()=>JSON.stringify({em:EM.pat,er:ER.pat,ea:EA.pat,es:ES.pat,mx:MX.pat,sx:SX.pat,
t1k:motifT1kCur(),entendu:T1K.entendu,departs:T1K.departs,memoire:memoire})'''
AIGUILLES = '''()=>Array.from(document.querySelectorAll('#unit-em1 .bt>i,#unit-er1 .bt>i,#unit-ea1 .bt>i,
#unit-es1 .bt>i,#unit-emx .bt>i,#unit-esx .bt>i,#unit-t1k .bt>i,#unit-t1k .t1k-f>b'),e=>e.getAttribute('style'))'''.replace('\n', '')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium')
    ap.add_argument('--contenu', action='store_true')
    ap.add_argument('--rapport', type=Path)
    ap.add_argument('--captures', type=Path)
    args = ap.parse_args()
    erreurs, total, controles = [], 0, []
    if args.captures:
        args.captures.mkdir(parents=True, exist_ok=True)

    def verifier(ok, nom):
        nonlocal total
        total += 1
        if not ok:
            erreurs.append(nom)
            print('FAUX : ' + nom, flush=True)

    html = (RACINE / 'app/src/main/assets/drm16.html').read_text(encoding='utf-8')
    ordre = (RACINE / 'page/ordre.txt').read_text(encoding='utf-8')
    for ancien, nouveau in [('css/260-gestes-et-mouvements.css', 'css/270-automations-machines.css'),
                            ('js/690-gestes-et-mouvements.js', 'js/700-automations-machines.js')]:
        source = (RACINE / 'page' / nouveau).read_text(encoding='utf-8')
        verifier(html.count(source) == 1, 'source assemblée une seule fois : ' + nouveau)
        verifier(ancien + '\n' + nouveau + '\n' in ordre, 'ordre de source : ' + nouveau)
        verifier((RACINE / 'page' / ancien).read_text(encoding='utf-8') + source in html, 'concaténation sans altération : ' + nouveau)
    js_source = (RACINE / 'page/js/700-automations-machines.js').read_text(encoding='utf-8')
    verifier('setInterval(' not in js_source and 'setTimeout(' not in js_source, 'aucune minuterie ajoutée')
    verifier('createAnalyser(' not in js_source and 'createGain(' not in js_source, 'aucun nœud audio ajouté')

    with sync_playwright() as p:
        options = {'headless': True, 'args': ['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:
            options['executable_path'] = args.chromium
            options['args'].append('--no-sandbox')
        navigateur = p.chromium.launch(**options)
        for indice, (w, h) in enumerate(FORMATS):
            contexte = navigateur.new_context(viewport={'width': w, 'height': h}, has_touch=True)
            pg = contexte.new_page()
            pg.set_default_timeout(7000)
            erreurs_js = []
            pg.on('pageerror', lambda e: erreurs_js.append(str(e)))
            if args.contenu:
                pg.evaluate(graphique.STOCKAGE)
                pg.set_content(html, wait_until='domcontentloaded')
            else:
                pg.goto((RACINE / 'app/src/main/assets/drm16.html').as_uri(), wait_until='domcontentloaded')
            pg.wait_for_timeout(750)
            pg.evaluate('audioInit();ctx.resume()')
            pg.wait_for_function('ctx && ctx.state==="running"')
            fmt = f'{w}x{h}'

            def agir(code):
                pg.evaluate(code)
                pg.wait_for_timeout(95)

            def etat():
                return pg.evaluate('AUTOMATIONS_VISUELLES.inspecter()')

            def resume():
                return etat()['resume']

            def ouvrir(modele):
                pg.evaluate('S.run=false')
                pg.evaluate(graphique.OUVRIR, modele)
                pg.wait_for_timeout(160)

            def capture(nom):
                if args.captures:
                    pg.screenshot(path=str(args.captures / f'{nom}-{fmt}.png'))

            verifier(etat()['version'] == 267 and etat()['reperes'] == 117, fmt + ' 117 repères initialisés une fois')
            verifier(pg.evaluate(NATIFS), fmt + ' tous les schedule restent natifs')
            for modele, state, famille, param, mini in MODELES:
                nom = fmt + ' ' + modele
                ouvrir(modele)
                verifier(etat()['visible'] and resume()['famille'] == famille, nom + ' famille reconnue')
                verifier(pg.locator('#av-info-' + famille).count() == 1, nom + ' un seul bandeau')
                verifier(pg.locator('#av-info-' + famille).evaluate('''e=>{
                    let r=e.getBoundingClientRect(),u=e.parentNode.getBoundingClientRect();
                    return e.scrollWidth<=e.clientWidth+1 && r.left>=u.left-1 && r.right<=u.right+1;
                }'''), nom + ' bandeau dans la façade, sans débordement')
                verifier(pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), nom + ' document sans débordement')
                verifier(pg.locator('.av-repere,.av-info').evaluate_all('es=>es.every(e=>getComputedStyle(e).pointerEvents==="none")'), nom + ' décoration non interactive')
                agir(f'''const q={state};q.sel=0;q.rec=false;q.pos=-1;q.pat.len=16;
                    if(q.mute)q.mute=[];if(q.solo)q.solo=[];
                    q.pat.mot[0]={{mode:1,p:{json.dumps(param)},v:Array(16).fill(null)}};
                    q.pat.mot[0].v[3]={mini};q.pat.mot[0].v[7]=.75;
                    if(q.pat.motFx)q.pat.motFx.mode=0;
                    AUTOMATIONS_VISUELLES.reveiller();''')
                verifier(resume()['stocke'] and resume()['valeur'] is None, nom + ' mémoire visible, aucun point à STOP')
                aiguilles = pg.evaluate(AIGUILLES)
                agir(f'S.run=true;{state}.rec=false;MACHINE_{state}.beat(3)')
                verifier(resume()['valeur'] == mini and resume()['pas'] == 3, nom + ' valeur basse, bipolarité comprise')
                marqueur = '#av-desc-' + famille + '-part-' + param
                commande = pg.locator(marqueur).locator('..')
                verifier(commande.locator('.av-repere').get_attribute('data-valeur') == str(mini), nom + ' marqueur sur la bonne commande')
                verifier(pg.evaluate(AIGUILLES) == aiguilles, nom + ' aiguilles manuelles inchangées')
                avant = pg.evaluate(DONNEES)
                agir('AUTOMATIONS_VISUELLES.reveiller()')
                verifier(pg.evaluate(DONNEES) == avant, nom + ' dessin sans écriture musicale ni mémoire')
                agir(f'MACHINE_{state}.beat(4)')
                verifier(resume()['valeur'] is None and commande.locator('.av-repere').get_attribute('data-valeur') is None, nom + ' trou = BASE, pas de valeur maintenue')
                agir(f'{state}.pat.mot[0].mode=2;MACHINE_{state}.beat(7)')
                verifier(resume()['valeur'] == .75 and 'TRIG HOLD' in pg.locator('#av-part-' + famille).inner_text(), nom + ' TRIG HOLD identifié')
                agir(f'{state}.pat.mot[0].mode=0;AUTOMATIONS_VISUELLES.reveiller()')
                verifier(resume()['valeur'] is None and resume()['stocke'] and resume()['etat'] == 'off', nom + ' OFF conserve les valeurs sans point actif')
                agir(f'S.run=false;{state}.rec=true;{state}.pat.mot[0].mode=1;AUTOMATIONS_VISUELLES.reveiller()')
                verifier(resume()['etat'] == 'arme' and resume()['valeur'] is None, nom + ' armement distinct de REC')
                agir(f'S.run=true;{state}.pos=-1;AUTOMATIONS_VISUELLES.reveiller()')
                verifier('ATTENTE' in pg.locator('#av-part-' + famille).inner_text(), nom + ' attente du premier pas')
                agir(f'MACHINE_{state}.beat(7)')
                verifier(resume()['etat'] == 'rec' and resume()['valeur'] == .75, nom + ' REC et valeur programmée')
                if state != 'EA':
                    agir(f'{state}.rec=false;{state}.mute[0]=true;AUTOMATIONS_VISUELLES.reveiller()')
                    verifier(resume()['etat'] == 'muet' and resume()['valeur'] is None, nom + ' MUTE sans faux point actif')
                    agir(f'{state}.mute[0]=false;{state}.solo[1]=true;AUTOMATIONS_VISUELLES.reveiller()')
                    verifier(resume()['etat'] == 'muet', nom + ' SOLO d’une autre partie')
                    agir(f'{state}.solo=[];AUTOMATIONS_VISUELLES.reveiller()')
                agir(f'{state}.rec=false;{state}.sel=1;{state}.pat.mot[1]=null;AUTOMATIONS_VISUELLES.reveiller()')
                verifier(resume()['partie'] == 1 and not resume()['stocke'] and resume()['valeur'] is None, nom + ' changement de partie sans trace périmée')
                if modele in ('em1', 'er1', 'emx', 'esx'):
                    fp = 'dTime' if state == 'ER' else 'e1'
                    agir(f'''{state}.pat.motFx={{mode:1,p:"{fp}",slot:1,v:Array(16).fill(.625)}};
                       {state}.slot=1;S.run=true;{state}.rec=false;MACHINE_{state}.beat(2);''')
                    verifier(resume()['fx']['valeur'] == .625 and resume()['fx']['correspond'], nom + ' FX indépendant de la partie')
                    if state in ('MX', 'SX'):
                        agir(f'{state}.slot=0;AUTOMATIONS_VISUELLES.reveiller()')
                        verifier(not resume()['fx']['correspond'] and pg.locator('#av-fx-' + famille).inner_text().find('AUTRE ÉDITION') >= 0, nom + ' FX autre slot explicite')
                        verifier(pg.locator(f'#{famille}-k-fx1 .av-repere').get_attribute('data-valeur') is None, nom + ' aucune bague sur le mauvais slot')
                    elif state == 'EM':
                        agir('EM.delayEdit=true;AUTOMATIONS_VISUELLES.reveiller()')
                        verifier(not resume()['fx']['correspond'], nom + ' DELAY et EDIT distingués')
                        agir('EM.delayEdit=false;EM.pat.motFx.mode=0;AUTOMATIONS_VISUELLES.reveiller()')
                pg.wait_for_timeout(220)
                a = etat()['frames']
                pg.wait_for_timeout(160)
                verifier(etat()['frames'] == a and not etat()['anime'], nom + ' aucune animation permanente entre deux beats')
                controles.append(nom)

            if indice == 0:
                # Contrat indépendant : chaque paramètre pris en charge vise son
                # véritable potard natif, pas seulement PITCH sur chaque façade.
                correspondances = [
                    ('em1', 'EM', 'em', 'pit:pit pan:pan lvl:lvl egT:eg cut:cut res:res egi:egi drv:drv'),
                    ('er1', 'ER', 'er', 'pitch:pitch modD:modd modS:mods dec:dec boost:boost pan:pan lvl:lvl'),
                    ('ea1', 'EA', 'ea', 'porta:porta bal:bal ofs:ofs cut:cut res:res egi:egi dec:dec lvl:lvl'),
                    ('es1', 'ES', 'es', 'pitch:pitch filt:filt pan:pan lvl:lvl'),
                    ('emx', 'MX', 'mx', 'pitch:pitch eg:eg o1:o1 o2:o2 cut:cut res:res egi:egi drv:drv mspeed:mspeed mdepth:mdepth pan:pan lvl:lvl'),
                    ('esx', 'SX', 'sx', 'pitch:pitch start:start eg:eg cut:cut res:res egi:egi mspeed:mspeed mdepth:mdepth pan:pan lvl:lvl')]
                for modele, state, famille, params in correspondances:
                    ouvrir(modele)
                    for paire in params.split():
                        param, ident = paire.split(':')
                        agir(f'{state}.sel=0;{state}.rec=false;{state}.pos=1;{state}.pat.mot[0]={{mode:1,p:"{param}",v:Array(16).fill(.375)}};S.run=true;AUTOMATIONS_VISUELLES.reveiller()')
                        verifier(resume()['parametre'] == param and pg.locator(f'#{famille}-k-{ident} .av-repere').get_attribute('data-valeur') == '0.375', 'correspondance potard ' + famille + ' ' + param)

            ouvrir('em1')
            agir('EM.sel=0;EM.pat.len=64;EM.pat.mot[0]={mode:1,p:"pan",v:Array(64).fill(null)};EM.pat.mot[0].v[63]=-.4;S.run=true;MACHINE_EM.beat(63)')
            verifier(resume()['valeur'] == -.4 and resume()['pas'] == 63 and resume()['longueur'] == 64, fmt + ' EM-1 pas 64, sans troncature à 16')
            capture('em1-64pas')
            agir('EM.pat.mot[0].v[63]=NaN;AUTOMATIONS_VISUELLES.reveiller()')
            verifier(resume()['valeur'] is None and pg.locator('#av-part-em .av-courbe').get_attribute('d').find('NaN') < 0, fmt + ' valeur invalide ignorée sans réécrire la donnée')

            ouvrir('t1k')
            verifier(pg.locator('#unit-t1k .av-repere').count() == 60, fmt + ' 50 potards et 10 curseurs TR-1000')
            agir('''let m=motifT1kCur();m.motionActive=true;m.solo=-1;m.muet=Array(10).fill(false);
              T1K.fill=false;T1K.motionRec=false;T1K.sel=0;T1K.params=false;
              for(let k=0;k<10;k++){m.longueurs[k]=0;m.reglages[k]=Array.from({length:16},(_,j)=>j===3?{tune:.1,dec:.2,c1:.3,c2:.4,niv:.5,mix:.6}:null);}
              S.run=true;T1K.entendu={i:3,positions:Array(10).fill(3),fill:false};AUTOMATIONS_VISUELLES.reveiller();''')
            verifier(pg.locator('#unit-t1k .av-repere[data-valeur]').count() == 60, fmt + ' six variations simultanées sur dix instruments')
            for param, val in [('tune', .1), ('dec', .2), ('c1', .3), ('c2', .4), ('niv', .5), ('mix', .6)]:
                agir(f'T1K.params=true;T1K.paramNom="{param}";AUTOMATIONS_VISUELLES.reveiller()')
                verifier(resume()['parametre'] == param and resume()['valeur'] == val, fmt + ' paramètre T1K ' + param)
            avant, aiguilles = pg.evaluate(DONNEES), pg.evaluate(AIGUILLES)
            agir('AUTOMATIONS_VISUELLES.reveiller()')
            verifier(pg.evaluate(DONNEES) == avant and pg.evaluate(AIGUILLES) == aiguilles, fmt + ' TR-1000 données et commandes manuelles inchangées')
            capture('t1k-six-parametres')
            agir('motifT1kCur().motionActive=false;T1K.motionRec=true;AUTOMATIONS_VISUELLES.reveiller()')
            verifier(resume()['etat'] == 'off' and 'REC ARMÉ' in pg.locator('#av-part-t1k').inner_text() and pg.locator('#unit-t1k .av-repere[data-valeur]').count() == 0, fmt + ' OFF et REC restent indépendants')
            agir('motifT1kCur().motionActive=true;T1K.motionRec=false;T1K.fill=true;AUTOMATIONS_VISUELLES.reveiller()')
            verifier(resume()['etat'] == 'fill' and pg.locator('#unit-t1k .av-repere[data-valeur]').count() == 0, fmt + ' FILL utilise BASE sans faux point')
            agir('T1K.fill=false;motifT1kCur().solo=1;AUTOMATIONS_VISUELLES.reveiller()')
            verifier(resume()['etat'] == 'muet' and pg.locator('#unit-t1k .av-repere[data-valeur]').count() == 6, fmt + ' SOLO : seul instrument 2 conserve ses points')
            agir('motifT1kCur().solo=-1;T1K.entendu.positions=Array(10).fill(4);AUTOMATIONS_VISUELLES.reveiller()')
            verifier(pg.locator('#unit-t1k .av-repere[data-valeur]').count() == 0 and resume()['valeur'] is None, fmt + ' BASE sur pas sans réglage')
            # Vrai ordonnanceur : aucun instrument ne sonne ici, mais les positions
            # sont celles de la machine, directions et longueurs indépendantes comprises.
            agir('''S.run=false;resetLectureT1k();let m=motifT1kCur();m.pas=Array(10).fill(0);
               m.last=16;m.longueurs=Array.from({length:10},(_,k)=>k%5+3);
               m.direction=Array.from({length:10},(_,k)=>["avant","arriere","pingpong"][k%3]);
               for(let k=0;k<10;k++)m.reglages[k]=Array.from({length:16},(_,j)=>({tune:j/15}));
               T1K.params=true;T1K.paramNom="tune";S.run=true;''')
            for tic in range(4):
                agir(f'scheduleT1k({tic},ctx.currentTime);MACHINE_T1K.beat({tic})')
            for k in range(10):
                agir(f'T1K.sel={k};AUTOMATIONS_VISUELLES.reveiller()')
                L, mode = k % 5 + 3, k % 3
                pos = 3 % L if mode == 0 else L - 1 - 3 % L if mode == 1 else (3 if 3 < L else 2 * L - 2 - 3)
                verifier(resume()['pas'] == pos and abs(resume()['valeur'] - pos/15) < 1e-8, fmt + f' instrument {k+1} : direction et longueur {L}')
            ancien_pas = resume()['pas']
            agir('scheduleT1k(4,ctx.currentTime+20);MACHINE_T1K.beat(4)')
            verifier(resume()['pas'] == ancien_pas, fmt + ' pas futur anticipé non affiché')
            verifier(pg.evaluate(NATIFS), fmt + ' schedule encore natifs après scénarios')

            if indice == 0:
                for code_ouvrir, code_fermer, nom in [
                    ('ouvrirMenu()', 'menu.classList.add("hide");document.body.classList.remove("menu-ouvert")', 'menu'),
                    ('ouvrirTable()', 'fermerTable()', 'mixeur'),
                    ('document.body.inert=true', 'document.body.inert=false', 'inert'),
                    ('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))', 'delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))', 'arrière-plan'),
                    ('window.dispatchEvent(new Event("pagehide"))', 'window.dispatchEvent(new Event("pageshow"))', 'pagehide'),
                    ('window.avContexte=ctx;ctx=new OfflineAudioContext(2,256,48000)', 'ctx=avContexte', 'export hors ligne')]:
                    agir(code_ouvrir + ';AUTOMATIONS_VISUELLES.reveiller()')
                    a = etat()['frames']
                    agir('AUTOMATIONS_VISUELLES.reveiller()')
                    verifier(not etat()['visible'] and not etat()['anime'] and etat()['frames'] == a, 'masquage ' + nom)
                    agir(code_fermer + ';AUTOMATIONS_VISUELLES.reveiller()')
                    verifier(etat()['visible'], 'retour ' + nom)
                # Le menu natif arrête PLAY : reconstruire un état connu avant le test audio.
                agir('S.run=true;T1K.sel=0;T1K.params=true;T1K.paramNom="tune";motifT1kCur().reglages[0][1]={tune:.4};T1K.entendu={i:1,positions:Array(10).fill(1),fill:false};AUTOMATIONS_VISUELLES.reveiller()')
                agir('ctx.suspend()')
                verifier(resume()['valeur'] is None, 'contexte suspendu : plus de point de lecture')
                agir('ctx.resume()')
                verifier(resume()['valeur'] is not None, 'contexte repris : retour de la valeur du pas')
                pg.emulate_media(reduced_motion='reduce')
                pg.wait_for_timeout(180)
                a = etat()['frames']
                pg.wait_for_timeout(180)
                verifier(etat()['reduit'] and not etat()['anime'] and a == etat()['frames'], 'mouvements réduits : informations conservées sans boucle')
                pg.emulate_media(reduced_motion='no-preference')
                ouvrir('t1k')
                agir('motifT1kCur().reglages[0][1]={tune:.4};ZOOM.z=2;fit();AUTOMATIONS_VISUELLES.reveiller()')
                verifier(pg.locator('#t1k-k-0-tune .av-repere').is_visible(), 'zoom : repère mémorisé visible')
                verifier(pg.locator('#t1k-k-0-tune .av-repere').evaluate('''e=>{
                  let r=e.getBoundingClientRect(),b=e.parentNode.getBoundingClientRect();
                  return Math.abs((r.x+r.width/2)-(b.x+b.width/2))<1;
                }'''), 'zoom : bague centrée sur le potard')
                agir('ZOOM.z=1;ZOOM.tx=ZOOM.ty=0;fit()')

            if indice == 0:
                # Événements réels, SANS réveil manuel de la vue : les événements
                # et les observations DOM doivent suffire après un enregistrement.
                ouvrir('em1')
                agir('EM.sel=0;EM.pat.len=16;EM.pat.pit[0]=0;EM.pat.mot[0]={mode:1,p:"pit",v:null};EM.rec=true;EM.pos=3;S.run=true;kEmPit.maj()')
                r = pg.locator('#em-k-pit .bt').bounding_box()
                x, y = r['x'] + r['width']/2, r['y'] + r['height']/2
                pg.mouse.move(x, y)
                pg.mouse.down()
                pg.mouse.move(x, y-19, steps=4)
                pg.mouse.up()
                pg.wait_for_timeout(160)
                verifier(abs(pg.evaluate('EM.pat.mot[0].v[3]')-.2) < 1e-8, 'geste natif : PITCH enregistré sur le pas 4')
                verifier(resume()['etat'] == 'rec' and abs(resume()['valeur']-.2) < 1e-8, 'geste natif : retour visuel sans réveil manuel')
                pg.mouse.move(x, y)
                pg.mouse.wheel(0, -100)
                pg.wait_for_timeout(150)
                verifier(abs(pg.evaluate('EM.pat.mot[0].v[3]')-.25) < 1e-8 and abs(resume()['valeur']-.25) < 1e-8, 'molette native : réglage et repère cohérents')
                ouvrir('t1k')
                agir('let m=motifT1kCur();m.motionActive=true;m.solo=-1;m.muet=Array(10).fill(false);m.last=16;m.longueurs=Array(10).fill(0);m.direction=Array(10).fill("avant");m.reglages[0]=Array(16).fill(null);m.instr[0].niv=.5;T1K.sel=0;T1K.motionRec=true;T1K.fill=false;T1K.departs=[];T1K.params=false;S.run=true;T1K.entendu={i:3,positions:Array(10).fill(3),fill:false,t:ctx.currentTime+30,absolu:3};majKnobsT1k()')
                r = pg.locator('#t1k-instr .t1k-f[data-f="0"]').bounding_box()
                x = r['x'] + r['width']/2
                pg.mouse.move(x, r['y']+r['height']*.75)
                pg.mouse.down()
                pg.mouse.move(x, r['y']+r['height']*.25, steps=4)
                pg.mouse.up()
                pg.wait_for_timeout(180)
                verifier(abs(pg.evaluate('motifT1kCur().reglages[0][3].niv')-.75) < .005, 'curseur natif TR-1000 : enregistrement sur le pas entendu')
                verifier(resume()['parametre'] == 'niv' and abs(resume()['valeur']-.75) < .005, 'curseur natif TR-1000 : repère sans réveil manuel')

            ouvrir('kp')
            verifier(not etat()['visible'] and not etat()['anime'], fmt + ' autre famille : affichage au repos')
            verifier(pg.locator('.av-info').count() == 7 and pg.locator('.av-repere').count() == 117, fmt + ' pas de doublon après réouvertures')
            verifier(not erreurs_js, fmt + ' erreurs JavaScript : ' + str(erreurs_js))
            controles.append(fmt + ' t1k')
            contexte.close()
            print('Contrôlé : ' + fmt, flush=True)
        navigateur.close()
    rapport = {'version': 267, 'verifications': total, 'formats': FORMATS, 'facades_formats': len(controles),
               'erreurs': erreurs, 'contenu_simule': args.contenu}
    if args.rapport:
        args.rapport.write_text(json.dumps(rapport, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{total} vérifications ; {len(controles)} façades/formats ; {len(erreurs)} erreur(s).')
    return bool(erreurs)


if __name__ == '__main__':
    raise SystemExit(main())
