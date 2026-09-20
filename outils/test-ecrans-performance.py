#!/usr/bin/env python3
"""v268 : écrans PO-33/MC-101 en lecture seule, Chromium et données synthétiques.
Les cases sont un aperçu AVANT effets, pas une mesure audio. --contenu remplace
uniquement localStorage pour un chargement hors origine. Aucun son téléchargé.
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
FORMATS = [(393, 851), (880, 400), (360, 640), (1280, 800), (320, 568), (640, 360), (760, 400)]
ATTENDRE = '()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'
DONNEES = '''()=>JSON.stringify({motifs:KO.motifs,sons:KO.sons,sel:KO.sel,chroma:KO.chroma,
chromaSource:KO.chromaSource,chaine:KO.chaine,pistes:MC.pistes,attente:MC.attente,
depart:MC.depart?{t:MC.depart.t,clips:MC.depart.clips}:null,memoire:memoire})'''
KO_INIT = '''S.run=false;KO_MODE="son";KO.cur=0;KO.sel=0;KO.chroma=false;KO.chromaSource=1;
KO.rec=false;KO.pos=-1;KO.fx=15;KO.fxTenu=false;KO.song=false;KO.chaine=[];KO.chainePos=0;
KO_ECH.prise=null;KO.motifs[0]=motifKo();KO.motifs[0].pas[0]=0x1111;
KO.motifs[0].pas[1]=0x0002;KO.motifs[0].fx[0]=0;KO.motifs[0].fx[4]=14;
KO.motifs[0].fx[15]=15;KO.motifs[0].plocks[8]={pitch:0};majKo();'''
MC_INIT = '''S.run=false;MC.sel=0;MC.pos=-1;MC.scatOn=false;MC.scatType=0;MC.scatProf=.5;
MC.attente=[null,null,null,null];MC.depart=null;MC.pistes.forEach(P=>{P.looper=false;P.muet=false});
MC.pistes[0].clip=0;MC.pistes[0].type="drum";MC.pistes[0].ech=null;
MC.pistes[0].clips[0]=[0,-1,2,-1,1,-1,2,-1,0,-1,2,-1,1,3,2,3];majMc();'''


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium')
    ap.add_argument('--contenu', action='store_true')
    ap.add_argument('--rapport', type=Path)
    ap.add_argument('--captures', type=Path)
    args = ap.parse_args()
    erreurs, total = [], 0
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
    sources = []
    for ancien, nouveau in [('css/270-automations-machines.css', 'css/280-ecrans-performance.css'),
                            ('js/700-automations-machines.js', 'js/710-ecrans-performance.js')]:
        source = (RACINE / 'page' / nouveau).read_text(encoding='utf-8')
        sources.append(source)
        verifier(html.count(source) == 1, 'source unique : ' + nouveau)
        verifier(ancien + '\n' + nouveau + '\n' in ordre, 'ordre : ' + nouveau)
        verifier((RACINE / 'page' / ancien).read_text(encoding='utf-8') + source in html, 'concaténation : ' + nouveau)
    verifier(not any(x in sources[1] for x in ['setInterval(', 'setTimeout(', 'createAnalyser(', 'createGain(', 'Math.random(']),
             'sans minuterie, nœud audio ou tirage aléatoire')
    precedent = html.replace(sources[0], '').replace(sources[1], '')
    comparisons = []
    with sync_playwright() as p:
        opts = {'headless': True, 'args': ['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:
            opts.update(executable_path=args.chromium)
            opts['args'].append('--no-sandbox')
        nav = p.chromium.launch(**opts)
        for w, h in FORMATS:
            contexte = nav.new_context(viewport={'width': w, 'height': h}, has_touch=True)
            pg = contexte.new_page()
            pg.set_default_timeout(8000)
            erreurs_js = []
            pg.on('pageerror', lambda e: erreurs_js.append(str(e)))
            if args.contenu:
                pg.evaluate(graphique.STOCKAGE)
                pg.set_content(html, wait_until='domcontentloaded')
            else:
                pg.goto((RACINE / 'app/src/main/assets/drm16.html').as_uri(), wait_until='domcontentloaded')
            pg.wait_for_timeout(650)
            pg.evaluate('audioInit();ctx.resume()')
            pg.wait_for_function('ctx && ctx.state==="running"')
            fmt = f'{w}x{h}'

            def agir(code):
                pg.evaluate(code)
                pg.evaluate(ATTENDRE)

            def etat():
                return pg.evaluate('ECRANS_PERFORMANCE.inspecter()')

            def resume():
                return etat()['resume']

            def ouvrir(m):
                pg.evaluate('S.run=false;KO_ECH.prise=null;MC.depart=null')
                pg.evaluate(graphique.OUVRIR, m)
                pg.evaluate('document.getElementById("unit-"+S.modele).scrollTop=0;ECRANS_PERFORMANCE.reveiller()')
                pg.evaluate(ATTENDRE)

            def dessin():
                agir('ECRANS_PERFORMANCE.reveiller()')

            for m in ['ko', 'mc']:
                ouvrir(m)
                verifier(etat()['visible'] and resume()['modele'] == m, fmt+' '+m+' visible')
                verifier(pg.locator('#ep-ecran-'+m).count() == 1 and pg.locator('#ep-ecran-'+m+' .ep-case').count() == 16,
                         fmt+' '+m+' un écran et 16 cases')
                verifier(pg.locator('#ep-ecran-'+m).evaluate('''e=>{
                    let r=e.getBoundingClientRect(),u=e.closest('[id^="unit-"]').getBoundingClientRect();
                    return e.scrollWidth<=e.clientWidth+1 && r.left>=u.left-1 && r.right<=u.right+1;
                }'''), fmt+' '+m+' écran sans débordement')
                verifier(pg.locator('#ep-ecran-'+m+' *').evaluate_all('es=>es.every(e=>getComputedStyle(e).pointerEvents==="none")'),
                         fmt+' '+m+' repères sans interception des gestes')
                verifier(pg.locator('#ep-ecran-'+m+' button,#ep-ecran-'+m+' input').count() == 0 and
                         pg.locator('#ep-ecran-'+m).get_attribute('aria-live') == 'off', fmt+' '+m+' sans commande ni annonces à chaque pas')
                verifier(pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),fmt+' '+m+' page sans débordement')
                if w >= 760 and h <= 540:
                    verifier(pg.locator('#'+m+'-pads button').evaluate_all('''es=>es.length===16 && es.every(e=>{
                        let r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.width>=43.9&&r.height>=43.9;
                    })'''), fmt+' '+m+' 16 pads visibles et au moins 44 px')

            ouvrir('ko')
            agir(KO_INIT+'ECRANS_PERFORMANCE.reveiller()')
            verifier(resume()['mode'] == 'SOUND' and sum(resume()['notes']) == 4, fmt+' KO notes de la source sélectionnée')
            verifier(resume()['pas'] == -1 and resume()['transport'] == 'stop',fmt+' KO STOP sans faux pas courant')
            verifier(sum(resume()['fx']) == 2 and resume()['fx'][0] and resume()['fx'][4] and not resume()['fx'][15],fmt+' KO FX 0 et 14, neutre 15 exclu')
            verifier(resume()['locks'][8],fmt+' KO lock de valeur zéro conservé')
            agir('KO_MODE="ptn";majKo()')
            verifier(resume()['mode'] == 'PATTERN' and sum(resume()['notes']) == 5,fmt+' KO PATTERN agrège les sources')
            agir('KO_MODE="son";KO.chroma=true;KO.chromaSource=1;majKo()')
            verifier(resume()['mode'] == 'CHROMA' and resume()['selection'] == 1 and sum(resume()['notes']) == 1,fmt+' KO CHROMA utilise sa source')
            agir('KO.chroma=false;KO_MODE="fx";majKo()')
            verifier(resume()['mode'] == 'FX',fmt+' KO mode FX explicite')
            agir('KO_MODE="son";S.run=true;MACHINE_KO.beat(0)')
            verifier(resume()['pas'] == 0 and resume()['fxIndex'] == 0 and resume()['transport'] == 'play',fmt+' KO suit beat et FX mémorisé zéro')
            agir('MACHINE_KO.beat(4)')
            verifier(resume()['fxIndex'] == 14,fmt+' KO FX mémorisé 14')
            agir('KO.fxTenu=true;KO.fx=15;ECRANS_PERFORMANCE.reveiller()')
            verifier(resume()['fxLive'] and resume()['fxIndex'] == -1 and 'NEUTRE' in pg.locator('#ep-ecran-ko .ep-info').inner_text(),fmt+' KO maintien neutre prioritaire')
            agir('KO.fx=3;ECRANS_PERFORMANCE.reveiller()')
            verifier(resume()['fxIndex'] == 3,fmt+' KO effet tenu prioritaire')
            agir('KO.fxTenu=false;S.run=false;KO.rec=true;majKo()')
            verifier(resume()['transport'] == 'arme' and resume()['pas'] == -1,fmt+' KO enregistrement armé distinct')
            agir('S.run=true;MACHINE_KO.beat(1)')
            verifier(resume()['transport'] == 'rec',fmt+' KO enregistrement des pas en lecture')
            agir('S.run=false;KO.rec=false;KO_ECH.prise={};ECRANS_PERFORMANCE.reveiller()')
            verifier(resume()['transport'] == 'micro',fmt+' KO prise micro distincte')
            agir('KO_ECH.prise=null;KO.song=true;KO.chaine=[0,3,2];KO.chainePos=1;ECRANS_PERFORMANCE.reveiller()')
            verifier('CHAÎNE 2/3' in resume()['chaine'],fmt+' KO position dans la chaîne')
            agir('KO.motifs[0].last=8;S.run=true;MACHINE_KO.beat(7)')
            verifier(resume()['last'] == 8 and pg.locator('#ep-ecran-ko .ep-inactif').count() == 8 and pg.locator('#ep-ecran-ko .ep-lock').count() == 0,
                     fmt+' KO longueur et marques hors motif')
            avant = pg.evaluate(DONNEES)
            dessin()
            verifier(pg.evaluate(DONNEES) == avant,fmt+' KO dessin sans écriture de données')
            # Les seize noms natifs, longs ou courts, restent hors des commandes.
            agir('S.run=false;KO_MODE="fx";KO.motifs[0].last=16')
            for i in range(16):
                agir(f'KO.fx={i};majKo()')
                verifier(pg.locator('.ko-lcd').evaluate('e=>e.scrollWidth<=e.clientWidth+1'),fmt+f' KO nom FX {i} sans débordement')
            agir(KO_INIT+'ECRANS_PERFORMANCE.reveiller()')
            pg.locator('#ko-ptn').click();pg.evaluate(ATTENDRE)
            verifier(resume()['mode'] == 'PATTERN',fmt+' KO vrai clic PATTERN transmis')
            pg.locator('#ko-son').click();pg.locator('#ko-rec').click();pg.evaluate(ATTENDRE)
            verifier(resume()['transport'] == 'arme',fmt+' KO vrai clic RECORD transmis')
            agir('KO.rec=false;majKo()')
            pg.locator('#ko-chroma').click();pg.evaluate(ATTENDRE)
            verifier(resume()['mode'] == 'CHROMA',fmt+' KO vrai clic CHROMA transmis')
            if args.captures:
                agir(KO_INIT+'S.run=true;MACHINE_KO.beat(4)')
                pg.screenshot(path=str(args.captures/f'ko-{fmt}.png'))

            ouvrir('mc')
            agir(MC_INIT+'ECRANS_PERFORMANCE.reveiller()')
            verifier(resume()['notes'][0] and not resume()['notes'][1] and resume()['mode'] == 'RYTHME',fmt+' MC note zéro valide et silence distinct')
            verifier(resume()['etatZone'] == 'off' and not any(resume()['zone']),fmt+' MC SCATTER OFF sans zone')
            agir('MC.scatOn=true;ECRANS_PERFORMANCE.reveiller()')
            verifier(resume()['etatZone'] == 'arme' and sum(resume()['zone']) == 8,fmt+' MC zone armée à STOP')
            for prof, seuil in [(0,16),(.02,16),(.25,12),(.5,8),(.74,4),(1,0)]:
                agir(f'MC.scatProf={prof};S.run=true;MACHINE_MC.beat(15)')
                verifier(resume()['seuil'] == seuil and sum(resume()['zone']) == 16-seuil,fmt+f' MC seuil exact profondeur {prof}')
                verifier(resume()['etatZone'] == ('vide' if seuil==16 else 'active'),fmt+f' MC état profondeur {prof}')
            agir('MC.scatProf=.5;MACHINE_MC.beat(7)')
            verifier(resume()['etatZone'] == 'hors-zone',fmt+' MC avant le seuil')
            agir('MACHINE_MC.beat(8)')
            verifier(resume()['etatZone'] == 'active' and pg.locator('#ep-ecran-mc .ep-zone-active').count()==1,fmt+' MC seuil inclus')
            for i in range(8):
                agir(f'MC.scatType={i};majMc()')
                verifier(pg.locator('#mc-val').evaluate('''e=>{
                    let r=e.getBoundingClientRect(),b=document.getElementById('mc-scat').getBoundingClientRect();
                    return r.right<=b.left-2 && e.scrollWidth<=e.clientWidth+1;
                }'''),fmt+f' MC SCATTER {i} sans chevauchement du titre')
                avant = pg.evaluate(DONNEES)
                pg.evaluate('()=>{window.epRandomOrig=Math.random;window.epRandomCalls=0;Math.random=function(){epRandomCalls++;return epRandomOrig()}}')
                dessin()
                appels = pg.evaluate('epRandomCalls')
                pg.evaluate('()=>{Math.random=epRandomOrig;delete window.epRandomOrig}')
                verifier(appels == 0 and pg.evaluate(DONNEES) == avant,fmt+f' MC SCATTER {i} aucun tirage ni écriture au dessin')
            agir('MC.pistes[0].muet=true;majMc()')
            verifier(resume()['etatZone']=='muet' and not any(resume()['zone']),fmt+' MC piste muette sans zone active')
            agir('MC.pistes[0].muet=false;MC.pistes[0].type="synth";MC.pistes[0].ech=null;majMc()')
            verifier(resume()['mode']=='SYNTHÉ',fmt+' MC source synthé')
            agir('MC.pistes[0].ech="test-afficheur.wav";majMc()')
            verifier(resume()['mode']=='SAMPLE',fmt+' MC source échantillon')
            agir('MC.pistes[0].looper=true;majMc()')
            verifier(resume()['mode']=='LOOPER' and resume()['etatZone']=='looper' and not any(resume()['notes']) and not any(resume()['zone']),fmt+' MC boucle exclue des notes et de SCATTER')
            agir(MC_INIT+'MC.pistes[0].clip=2;MC.attente=[0,null,null,null];ECRANS_PERFORMANCE.reveiller()')
            verifier(resume()['clip']==2 and resume()['attente']==0,fmt+' MC attente vers clip zéro sans changement anticipé')
            agir('MC.depart={t:ctx.currentTime+100,ctx:ctx,clips:[1,0,0,0]};ECRANS_PERFORMANCE.reveiller()')
            verifier(resume()['clip']==2 and resume()['attente']==1,fmt+' MC départ imminent prioritaire sans validation')
            avant = pg.evaluate(DONNEES);dessin()
            verifier(pg.evaluate(DONNEES)==avant,fmt+' MC affichage ne valide pas le départ')
            agir(MC_INIT+'ECRANS_PERFORMANCE.reveiller()')
            pg.locator('#mc-scat').click();pg.evaluate(ATTENDRE)
            verifier(resume()['etatZone']=='arme',fmt+' MC vraie touche SCATTER transmise')
            pg.locator('#mc-scat-prof').evaluate('e=>{e.value="1";e.dispatchEvent(new Event("input",{bubbles:true}))}');pg.evaluate(ATTENDRE)
            verifier(resume()['profondeur']==1 and sum(resume()['zone'])==16,fmt+' MC curseur natif de profondeur transmis')
            old = pg.evaluate('MC.pistes[0].clips[0][1]')
            pg.locator('#mc-pads button').nth(1).click();pg.evaluate(ATTENDRE)
            verifier(old==-1 and pg.evaluate('MC.pistes[0].clips[0][1]')>=0,fmt+' MC pad natif écrit toujours une note')
            # Le défilement automatique de Playwright peut masquer l'écran : retour réel en haut.
            agir('document.getElementById("unit-mc").scrollTop=0;ECRANS_PERFORMANCE.reveiller()')
            verifier(resume()['notes'][1],fmt+' MC aperçu mis à jour après édition')
            if args.captures:
                agir('MC.scatProf=.5;S.run=true;MACHINE_MC.beat(9)')
                pg.screenshot(path=str(args.captures/f'mc-{fmt}.png'))

            for m in ['ko','mc']:
                ouvrir(m)
                agir((KO_INIT if m=='ko' else MC_INIT)+'ECRANS_PERFORMANCE.reveiller()')
                pg.wait_for_timeout(150)
                n = etat()['frames'];pg.wait_for_timeout(180)
                verifier(etat()['frames']==n and not etat()['enAttente'],fmt+' '+m+' aucun dessin continu à STOP')
                for overlay in ['menu','bib','note','enr','pr','table','syro','studio','nexus']:
                    agir(f'document.getElementById("{overlay}").classList.'+('remove("hide")' if overlay=='menu' else 'add("show")')+';ECRANS_PERFORMANCE.reveiller()')
                    n = etat()['frames'];dessin()
                    verifier(not etat()['visible'] and not etat()['enAttente'] and etat()['frames']==n,fmt+' '+m+' suspendu sous '+overlay)
                    agir(f'document.getElementById("{overlay}").classList.'+('add("hide")' if overlay=='menu' else 'remove("show")')+';ECRANS_PERFORMANCE.reveiller()')
                agir('document.body.classList.add("ensemble");ECRANS_PERFORMANCE.reveiller()')
                verifier(not etat()['visible'],fmt+' '+m+' suspendu en ensemble')
                agir('document.body.classList.remove("ensemble");ECRANS_PERFORMANCE.reveiller()')
                agir('window.dispatchEvent(new Event("pagehide"))')
                verifier(not etat()['visible'] and not etat()['enAttente'],fmt+' '+m+' suspendu pagehide')
                agir('window.dispatchEvent(new Event("pageshow"))')
                verifier(etat()['visible'],fmt+' '+m+' reprise pageshow')
                agir('Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))')
                verifier(not etat()['visible'] and not etat()['enAttente'],fmt+' '+m+' suspendu document masqué')
                agir('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))')
                verifier(etat()['visible'],fmt+' '+m+' reprise après masquage')
                agir(f'S.run=true;MACHINE_{m.upper()}.beat(3)')
                pg.evaluate('ctx.suspend()');pg.wait_for_function('ctx.state==="suspended"');dessin()
                verifier(resume()['pas']==-1 and resume()['transport']=='pause',fmt+' '+m+' audio suspendu sans faux pas actif')
                pg.evaluate('ctx.resume()');pg.wait_for_function('ctx.state==="running"');dessin()
                verifier(resume()['pas']==3,fmt+' '+m+' reprise audio')
                agir('window.epCtx=ctx;ctx=new OfflineAudioContext(2,480,48000);ECRANS_PERFORMANCE.reveiller()')
                verifier(not etat()['visible'] and not etat()['enAttente'],fmt+' '+m+' aucun dessin pendant rendu hors ligne')
                agir('ctx=epCtx;delete window.epCtx;ECRANS_PERFORMANCE.reveiller()')
                pg.emulate_media(reduced_motion='reduce');dessin()
                verifier(pg.locator('#ep-ecran-'+m+' *').evaluate_all('es=>es.every(e=>getComputedStyle(e).animationName==="none")'),fmt+' '+m+' aucune animation avec mouvement réduit')
                if h<=851 and w<=960:
                    agir(f'document.getElementById("unit-{m}").scrollTop=100000;ECRANS_PERFORMANCE.reveiller()')
                    hors_ecran = pg.locator('.'+m+'-lcd').evaluate('''e=>{
                        let r=e.getBoundingClientRect(),u=e.closest('[id^="unit-"]').getBoundingClientRect();
                        return r.bottom<=Math.max(0,u.top)||r.top>=Math.min(innerHeight,u.bottom);
                    }''')
                    verifier(etat()['visible'] != hors_ecran and not etat()['enAttente'],fmt+' '+m+' dessin limité à la portion visible après défilement')
                    agir(f'document.getElementById("unit-{m}").scrollTop=0;ECRANS_PERFORMANCE.reveiller()')
            verifier(pg.evaluate('MACHINE_MC.schedule===scheduleMc && MACHINE_KO.schedule===scheduleKo'),fmt+' schedule natifs préservés')
            verifier(not erreurs_js,fmt+' sans erreur JavaScript : '+str(erreurs_js))
            print(fmt+' terminé',flush=True)
            contexte.close()

        # Même scénario de séquençage sur la page précédente et la nouvelle.
        # Remplace uniquement les voix par un journal dans CE test, jamais dans l'application.
        scenario = '''()=>{
          MC.sel=0;MC.depart=null;MC.attente=[null,null,null,null];MC.scatOn=true;MC.scatProf=.5;
          MC.pistes.forEach((P,k)=>{P.looper=false;P.muet=false;P.type="drum";P.clip=0;
            P.clips[0]=Array.from({length:16},(_,i)=>(i+k)%5===0?-1:(i+k)%4)});
          S.run=true;let seed=12345,draws=0,calls=[],rng=Math.random,voice=voixMc;
          Math.random=()=>{draws++;seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
          voixMc=(t,k,n,v)=>calls.push([Number(t.toFixed(7)),k,n,v]);
          try{for(let type=0;type<8;type++){MC.scatType=type;
            for(let i=0;i<16;i++){MACHINE_MC.schedule(i,100+type*4+i*.125);MACHINE_MC.beat(i)}}}
          finally{Math.random=rng;voixMc=voice;S.run=false}
          return {draws,calls,clips:MC.pistes.map(P=>P.clips),attente:MC.attente};
        }'''
        for contenu in [precedent,html]:
            c=nav.new_context(viewport={'width':880,'height':400})
            pg=c.new_page();pg.evaluate(graphique.STOCKAGE);pg.set_content(contenu,wait_until='domcontentloaded')
            pg.wait_for_timeout(550);pg.evaluate('audioInit();ctx.resume()');pg.wait_for_function('ctx.state==="running"')
            pg.evaluate(graphique.OUVRIR,'mc');pg.evaluate(ATTENDRE)
            comparisons.append(pg.evaluate(scenario));c.close()
        verifier(comparisons[0]==comparisons[1],'SCATTER : journal des voix, tirages et clips identiques à la page précédente')
        verifier(comparisons[1]['draws']==8 and len(comparisons[1]['calls'])>0,'scénario comparatif exerce le hasard et les voix des huit effets')
        nav.close()
    bilan={'version':268,'formats':FORMATS,'verifications':total,'erreurs':erreurs,
           'stockage_simule':args.contenu,'comparaison_stockage_simule':True,
           'comparaison_scatter':{'identique':comparisons[0]==comparisons[1],
                                  'tirages':comparisons[1]['draws'],'voix_planifiees':len(comparisons[1]['calls'])}}
    if args.rapport:
        args.rapport.parent.mkdir(parents=True,exist_ok=True)
        args.rapport.write_text(json.dumps(bilan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Écrans de performance : {total} vérifications, {len(erreurs)} erreurs.')
    raise SystemExit(1 if erreurs else 0)


if __name__=='__main__':
    main()
