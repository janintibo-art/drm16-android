#!/usr/bin/env python3
"""v269 : onde SmplTrek, départs, tranches et commandes natives.
--contenu : page injectée avec stockage temporaire dans le bac à sable.
Sans cette option : page locale, comme les autres tests GitHub Actions.
Les positions sont testées avec une horloge contrôlée ; un essai distinct
vérifie le curseur avec la vraie horloge AudioContext.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
RACINE=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('graphique',RACINE/'outils/test-graphique.py')
graphique=importlib.util.module_from_spec(spec);spec.loader.exec_module(graphique)
FORMATS=[(320,568),(360,640),(393,851),(640,360),(760,400),(880,400),(1024,768)]
ATTENDRE='() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'
INIT='''async()=>{
 audioInit();await ctx.resume();window.swTemps=10;
 Object.defineProperty(ctx,'currentTime',{configurable:true,get:()=>swTemps});
 STK.pistes=Array.from({length:10},(_,i)=>pisteStk(i));STK.sel=0;STK.cur=0;STK.solo=-1;STK.song=false;
 STK.attente=null;STK.depart=null;STK.chaine=[];STK.pos=-1;STK_MODE='pas';S.run=false;
 STK.motifs[0]=motifStk();STK.motifs[0].pas[0]=0x1111;
 const b=ctx.createBuffer(2,8000,8000);
 for(let i=0;i<8000;i++){b.getChannelData(0)[i]=.75*Math.sin(i*.07);b.getChannelData(1)[i]=-b.getChannelData(0)[i];}
 ES.buf.uOndeTest=b;BIB.noms.uOndeTest='Onde stéréo — test';
 STK.pistes[0].ech='uOndeTest';STK.pistes[0].dec=1;STK.pistes[0].tune=.5;
 ONDE_STK.effacer();majStk();document.getElementById('unit-stk').scrollTop=0;
}'''
DONNEES='''()=>JSON.stringify({pistes:STK.pistes,motifs:STK.motifs,cur:STK.cur,sel:STK.sel,
solo:STK.solo,chaine:STK.chaine,attente:STK.attente,depart:STK.depart,memoire:memoire})'''

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true')
    ap.add_argument('--format',type=str,help='Format unique LARGEURxHAUTEUR');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path);args=ap.parse_args()
    erreurs,total=[],0
    def verifier(ok,msg):
        nonlocal total
        total+=1
        if not ok:erreurs.append(msg);print('FAUX : '+msg,flush=True)
    if args.captures:args.captures.mkdir(parents=True,exist_ok=True)
    html=(RACINE/'app/src/main/assets/drm16.html').read_text()
    ordre=(RACINE/'page/ordre.txt').read_text()
    for p,avant in [('css/290-onde-smpltrek.css','css/280-ecrans-performance.css'),('js/720-onde-smpltrek.js','js/710-ecrans-performance.js')]:
        s=(RACINE/'page'/p).read_text()
        verifier(html.count(s)==1,'Source présente une fois : '+p)
        verifier(avant+'\n'+p+'\n' in ordre,'Ordre : '+p)
        verifier((RACINE/'page'/avant).read_text()+s in html,'Concaténation : '+p)
    js=(RACINE/'page/js/720-onde-smpltrek.js').read_text()
    verifier(not any(x in js for x in ['createBufferSource(','createAnalyser(','setInterval(','setTimeout(','Math.random(','localStorage.','memStk(','scheduleStk(']),'Afficheur sans graphe audio, minuterie, hasard, mémoire ou programmation')
    with sync_playwright() as p:
        opts={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:opts.update(executable_path=args.chromium);opts['args'].append('--no-sandbox')
        nav=p.chromium.launch(**opts)
        def page(w,h,dpr=1):
            c=nav.new_context(viewport={'width':w,'height':h},has_touch=True,device_scale_factor=dpr)
            pg=c.new_page();pg.set_default_timeout(8000)
            if args.contenu:pg.evaluate(graphique.STOCKAGE);pg.set_content(html,wait_until='domcontentloaded')
            else:pg.goto((RACINE/'app/src/main/assets/drm16.html').as_uri(),wait_until='domcontentloaded')
            pg.wait_for_timeout(650);pg.evaluate(graphique.OUVRIR,'stk');return c,pg
        formats=[tuple(map(int,args.format.split('x')))] if args.format else FORMATS
        for w,h in formats:
            c,pg=page(w,h,2 if w==393 else 1)
            erreurs_js=[];pg.on('pageerror',lambda e:erreurs_js.append(str(e)))
            pg.evaluate(INIT);pg.evaluate(ATTENDRE);pg.wait_for_function('ONDE_STK.inspecter().resume.formePrete')
            fmt=f'{w}x{h}'
            def etat():return pg.evaluate('ONDE_STK.inspecter()')
            def res():return etat()['resume']
            def agir(code):pg.evaluate(code+';ONDE_STK.reveiller()');pg.evaluate(ATTENDRE)
            def v(ok,msg):verifier(ok,fmt+' '+msg)
            mesure=pg.evaluate(graphique.MESURER)
            v(mesure['echelle']==1 and mesure['interne']<=1 and mesure['document']<=w+1,'Échelle 1 et aucun débordement')
            v(not mesure['ciblesIncorrectes'],'Cibles >=44px : '+str(mesure['ciblesIncorrectes']))
            v(mesure['cadre']['top']>=55 and mesure['cadre']['bottom']<=h+1,'Façade dans la fenêtre et bande MENU libre')
            v(pg.locator('#stk-afficheur').count()==1 and pg.locator('#stk-ecran').count()==1 and pg.locator('#stk-afficheur .sw-pas').count()==16,'Un seul écran, 16 pas')
            v(pg.locator('#stk-afficheur *').evaluate_all('es=>es.every(e=>getComputedStyle(e).pointerEvents==="none")'),'Aucune interception tactile')
            v(pg.locator('#stk-afficheur').get_attribute('aria-live')=='off' and pg.locator('#stk-afficheur button,#stk-afficheur input').count()==0,'Sans annonces continues ni commande supplémentaire')
            v(pg.locator('#stk-afficheur').evaluate('e=>e.scrollWidth<=e.clientWidth+1'),'Texte contenu dans l’écran')
            if w>=760 and h<=540:
                v(pg.locator('#stk-pads button').evaluate_all('''es=>es.length===16&&es.every(e=>{let r=e.getBoundingClientRect(),p=e.parentNode.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1&&r.top>=0&&r.bottom<=innerHeight+1&&r.width>=43.9&&r.height>=43.9;})'''),'16 pads entièrement visibles en paysage')
            v(res()['canaux']==2 and res()['formePrete'],'Onde stéréo disponible')
            f=etat()['forme'];v(all(x>.74 for x in f['maximum']) and all(x<-.74 for x in f['minimum']),'Opposition de phase sans annulation des courbes')
            v(pg.locator('#stk-ecran').evaluate('e=>Math.abs(e.width-e.clientWidth*Math.min(2,devicePixelRatio))<=1'),'Canvas haute définition')
            v(res()['curseur'] is None and res()['pas']==-1 and res()['transport']=='stop','STOP sans faux curseur')
            a=etat();pg.wait_for_timeout(180);b=etat();v(a['frames']==b['frames'] and not b['enAttente'],'Au repos sans boucle de dessin')
            before=pg.evaluate(DONNEES);agir('ONDE_STK.reveiller()');v(pg.evaluate(DONNEES)==before,'Dessin sans modification musicale')
            agir('voixStk(10.5,0,false,-1,0)');v(res()['curseur'] is None,'Départ futur non anticipé')
            agir('swTemps=10.75');v(res()['voix']==1 and abs(res()['curseur']-.25)<1e-5,'Quart réel du sample')
            dessins=etat()['dessins'];agir('swTemps=10.85');v(etat()['dessins']==dessins,'Fond non recalculé à chaque déplacement')
            agir('swTemps=11.6');v(res()['curseur'] is None and res()['voix']==0,'Fin naturelle')
            agir('STK.pistes[0].slice=true;STK.pistes[0].dec=1')
            for tr in range(8):
                agir(f'ONDE_STK.effacer();swTemps={20+tr};STK.pistes[0].tranche={tr};voixStk(swTemps+.2,0,false,{tr},0);swTemps+=.23125')
                v(res()['trancheJouee']==tr and abs(res()['curseur']-(tr/8+.03125))<1e-5,f'Tranche {tr+1}, bornes et curseur')
                agir('swTemps+=.2');v(res()['curseur'] is None,f'Tranche {tr+1}, fin sans débordement')
            agir('ONDE_STK.effacer();swTemps=40;STK.pistes[0].type="instrument";STK.pistes[0].tune=1;STK.pistes[0].dec=.5;STK.pistes[0].tranche=1;voixStk(40.2,0,false,6,12);swTemps=40.21')
            v(res()['vitesse']==4 and res()['noteJouee']==12 and res()['trancheJouee']==6,'TUNE et hauteur capturés au départ')
            v(res()['tranche']==1 and abs(res()['curseur']-.79)<1e-5,'Sélection distincte de la tranche jouée')
            agir('STK.pistes[0].tune=.5;STK.pistes[0].dec=1;swTemps=40.211');v(res()['vitesse']==4,'Modification ultérieure sans effet rétroactif')
            agir('swTemps=40.22');v(res()['curseur'] is None,'DECAY à la vitesse jouée')
            agir('ONDE_STK.effacer();swTemps=50;STK.pistes[0].type="shots";voixStk(50.2,0,false,-1,0);swTemps=50.45')
            v(res()['trancheJouee']==-1 and abs(res()['curseur']-.25)<1e-5,'Pas historique son entier malgré SLICE')
            agir('voixStk(50.5,0,false,7,0)');v(res()['trancheJouee']==-1,'Voix future ne masque pas la courante')
            agir('swTemps=50.52');v(res()['voix']==2 and res()['trancheJouee']==7,'Superposition et dernière voix')
            agir('swTemps=50.65');v(res()['voix']==1 and res()['trancheJouee']==-1,'Voix longue toujours active')
            agir('ONDE_STK.effacer();swTemps=60;STK.pistes[0].slice=false;STK.pistes[0].type="instrument";STK.clavierMidi=true;STK.pistes[0].muet=true;STK.solo=-1;jouerMidiStk(MIDI.base+12,1,MIDI.canalSy)')
            v(etat()['stock']==0 and res()['muet'],'MIDI coupé, aucune voix inventée')
            agir('STK.solo=0;jouerMidiStk(MIDI.base+12,1,MIDI.canalSy);swTemps=60.055')
            v(res()['solo'] and res()['vitesse']==2 and res()['noteJouee']==12,'SOLO et chemin MIDI natifs')
            agir('arretStk()');v(etat()['stock']==0 and res()['curseur'] is None,'STOP efface aussi les départs futurs')
            agir('S.run=true;STK.pos=-1;STK.attente=2');v(res()['futur']==2 and res()['motif']==0 and res()['pas']==-1,'Motif en attente sans avance')
            agir('MACHINE_STK.beat(4)');v(res()['pas']==4 and pg.locator('#stk-afficheur .sw-courant').count()==1,'Pas courant au beat natif')
            agir('STK.attente=null;STK.motifs[0].last=8;MACHINE_STK.beat(7)');v(res()['last']==8 and pg.locator('#stk-afficheur .sw-inactif').count()==8,'Longueur de motif')
            agir('S.run=false;MACHINE_STK.beat(-1)');calculs=etat()['calculs']
            agir('ES.buf.uOndeTest=ctx.createBuffer(2,8000,8000);ES.buf.uOndeTest.getChannelData(0).fill(.5);STK.pistes[0].slice=false;majStk()')
            v(etat()['calculs']==calculs+1 and etat()['forme']['maximum']==[.5,0],'Même identifiant remplacé et canal droit silencieux')
            calculs=etat()['calculs'];agir('STK.sel=1;majStk()');agir('STK.sel=0;majStk()');v(etat()['calculs']<=calculs+1,'Cache réutilisé')
            agir('STK.pistes[0].ech="uAbsent";majStk()');v(not res()['disponible'] and res()['curseur'] is None and 'INDISPONIBLE' in pg.locator('.sw-attente').inner_text(),'Son absent sans fausse onde')
            agir('STK.pistes[0].ech="uOndeTest";STK.solo=-1;STK.pistes[0].muet=false;STK.pistes[0].type="shots";STK.motifs[0].last=16;majStk()')
            pg.locator('#stk-trks button').nth(2).click();agir('document.getElementById("unit-stk").scrollTop=0');v(res()['piste']==2,'Vrai clic de sélection de piste')
            pg.locator('#stk-trks button').nth(2).click();agir('document.getElementById("unit-stk").scrollTop=0');v(res()['muet'],'Deuxième clic coupe la piste')
            pg.locator('#stk-trks button').nth(0).click();pg.locator('#stk-ptn').click();pg.evaluate(ATTENDRE);v(pg.evaluate('STK_MODE')=='ptn','Clic MOTIF conservé')
            pg.locator('#stk-ptn').click();avant=pg.evaluate('motifStkCur().pas[0]');pg.locator('#stk-pads button').nth(1).click();pg.evaluate(ATTENDRE)
            v(pg.evaluate('motifStkCur().pas[0]')==avant^2,'Pad natif écrit le bon pas')
            pg.locator('#stk-slice').click();pg.locator('#stk-tranches button').nth(5).click();pg.evaluate(ATTENDRE);v(pg.evaluate('pisteStkSel().slice && pisteStkSel().tranche===5'),'Vrai clic de tranche 6')
            agir('arretStk();document.getElementById("unit-stk").scrollTop=0')
            for panel in ['menu','bib','note','enr','pr','table','syro','studio','nexus']:
                agir(f'window.swPanel=document.getElementById("{panel}");window.swAncienPanel={{classe:swPanel.className,style:swPanel.getAttribute("style"),cache:swPanel.hidden}};swPanel.classList.remove("hide");swPanel.hidden=false;swPanel.style.display="flex"');a=etat();pg.wait_for_timeout(80);b=etat()
                v(not b['visible'] and not b['enAttente'] and a['frames']==b['frames'],f'Repos sous {panel}')
                agir(f'swPanel.className=swAncienPanel.classe;swPanel.hidden=swAncienPanel.cache;if(swAncienPanel.style===null)swPanel.removeAttribute("style");else swPanel.setAttribute("style",swAncienPanel.style)')
            agir('window.dispatchEvent(new Event("pagehide"))');a=etat();pg.wait_for_timeout(80);v(not etat()['enAttente'] and etat()['frames']==a['frames'],'Repos pagehide')
            agir('window.dispatchEvent(new Event("pageshow"))');v(etat()['visible'],'Reprise pageshow')
            agir('document.getElementById("unit-stk").scrollTop=2000');v(not etat()['visible'] and not etat()['enAttente'],'Écran défilé hors de vue au repos')
            agir('document.getElementById("unit-stk").scrollTop=0')
            agir('ONDE_STK.effacer();swTemps=70;STK.pistes[0].slice=false;voixStk(70.2,0,false,-1,0);document.getElementById("bib").style.display="flex";swTemps=70.5')
            agir('document.getElementById("bib").style.display=""');v(abs(res()['curseur']-.3)<1e-5,'Retour de bibliothèque à la bonne position')
            agir('arretStk();swTemps=75;ONDE_STK.programmer(ctx,0,"uOndeTest",ES.buf.uOndeTest,74.8,0,1,1,-1,0);swTemps=75.1')
            v(abs(res()['curseur']-.1)<1e-5,'Départ retardé : démarrage réel sans saut dans le son')
            agir('swTemps=75.81');v(res()['curseur'] is None,'Départ retardé : fin absolue programmée conservée')
            agir('arretStk();swTemps=80;for(let i=0;i<180;i++)ONDE_STK.programmer(ctx,0,"uOndeTest",ES.buf.uOndeTest,81+i*.001,0,1,1,-1,0)');v(etat()['stock']<=64,'File bornée à 64 voix par piste')
            agir('arretStk();swTemps=85;voixStk(85.2,0,false,-1,0);swTemps=85.4')
            pg.evaluate('ctx.suspend()');pg.evaluate(ATTENDRE);a=etat();pg.wait_for_timeout(140)
            v(res()['transport']=='pause' and etat()['frames']==a['frames'] and not etat()['enAttente'],'Contexte suspendu : position figée et dessin au repos')
            pg.evaluate('ctx.resume()');pg.evaluate(ATTENDRE);v(res()['transport']=='ecoute','Reprise du contexte audio')
            agir('arretStk()');pg.emulate_media(reduced_motion='reduce');agir('swTemps=90;voixStk(90.2,0,false,-1,0);swTemps=90.4');v(res()['curseur'] is not None,'Réduction des mouvements garde le curseur utile')
            pg.emulate_media(reduced_motion='no-preference');agir('arretStk()')
            if args.captures:
                agir('STK.pistes[0].slice=true;STK.pistes[0].tranche=3;STK.pos=4;S.run=true;ONDE_STK.reveiller()');pg.screenshot(path=str(args.captures/f'smpltrek-{fmt}.png'))
            v(not erreurs_js,'Sans erreur JavaScript : '+str(erreurs_js));print('Contrôlé : '+fmt,flush=True);c.close()
        c,pg=page(393,851)
        pg.evaluate('''async()=>{audioInit();await ctx.resume();banqueEs();STK.pistes[0].ech="b0";STK.pistes[0].dec=1;STK.pistes[0].tune=.5;ONDE_STK.effacer();window.swVraiT=ctx.currentTime+.2;voixStk(swVraiT,0,false,-1,0);ONDE_STK.reveiller()}''');pg.evaluate(ATTENDRE)
        verifier(pg.evaluate('ONDE_STK.inspecter().resume.curseur===null'),'Vraie horloge, pas de curseur avant la note')
        pg.wait_for_timeout(250)
        verifier(pg.evaluate('''()=>{let s=ONDE_STK.inspecter().resume;return s.curseur!==null&&Math.abs(s.curseur-(ctx.currentTime-swVraiT)/ES.buf.b0.duration)<.12}'''),'Vraie horloge, suivi du moteur')
        pg.wait_for_timeout(500);verifier(pg.evaluate('ONDE_STK.inspecter().resume.curseur===null&&!ONDE_STK.inspecter().enAttente'),'Vraie horloge, fin puis repos')
        c.close();nav.close()
    rapport={'version':269,'formats':formats,'verifications':total,'erreurs':erreurs,'contenu_simule':args.contenu}
    if args.rapport:args.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2))
    print(f'{total} vérifications ; {len(erreurs)} erreur(s).');return bool(erreurs)
if __name__=='__main__':raise SystemExit(main())
