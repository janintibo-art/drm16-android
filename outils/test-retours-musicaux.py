#!/usr/bin/env python3
"""v265 : niveaux stéréo numériques, passivité et cycle de vie de l'affichage.
Signaux synthétiques, vrais nœuds Web Audio, aucun appareil ni fichier personnel.
--contenu : stockage temporaire simulé, comme les contrôles graphiques précédents.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
RACINE=Path(__file__).resolve().parents[1]
FORMATS=[(393,851),(880,400),(360,640),(1280,800),(320,568)]
spec=importlib.util.spec_from_file_location('graphique',RACINE/'outils/test-graphique.py')
graphique=importlib.util.module_from_spec(spec);spec.loader.exec_module(graphique)
SIGNAL=r'''o=>{
 if(window.rmTestSource){try{rmTestSource.stop();}catch(e){}rmTestSource.disconnect();}
 const c=ctx,b=c.createBuffer(o.mono?1:2,c.sampleRate,c.sampleRate);
 for(let ch=0;ch<b.numberOfChannels;ch++){
   const a=b.getChannelData(ch),gain=ch?o.d:o.g;
   for(let i=0;i<a.length;i++)a[i]=gain*Math.sin(2*Math.PI*440*i/c.sampleRate);
 }
 const s=c.createBufferSource();s.buffer=b;s.loop=true;
 s.connect(o.voie?SET.bus[o.voie].g:c.__drmMesure.sortie);s.start();window.rmTestSource=s;
 RETOURS_MUSICAUX.reveiller();
}'''
STOP=r'''()=>{if(window.rmTestSource){try{rmTestSource.stop();}catch(e){}rmTestSource.disconnect();rmTestSource=null;}}'''

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true')
    ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path)
    args=ap.parse_args()
    if args.captures:args.captures.mkdir(parents=True,exist_ok=True)
    erreurs=[];mesures=[];total=0
    def verifier(ok,description):
        nonlocal total
        total+=1
        if not ok:erreurs.append(description);print('FAUX : '+description,flush=True)
    with sync_playwright() as p:
        options={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:options['executable_path']=args.chromium;options['args'].append('--no-sandbox')
        nav=p.chromium.launch(**options)
        for indice,(w,h) in enumerate(FORMATS):
            contexte=nav.new_context(viewport={'width':w,'height':h},has_touch=True)
            pg=contexte.new_page();pg.set_default_timeout(6000)
            js=[];pg.on('pageerror',lambda e:js.append(str(e)))
            fichier=RACINE/'app/src/main/assets/drm16.html'
            if args.contenu:
                pg.evaluate(graphique.STOCKAGE)
                pg.set_content(fichier.read_text(encoding='utf-8'),wait_until='domcontentloaded')
            else:pg.goto(fichier.as_uri(),wait_until='domcontentloaded')
            pg.wait_for_timeout(600);prefixe=f'{w}x{h}'
            def etat():return pg.evaluate('RETOURS_MUSICAUX.inspecter()')
            verifier(etat()['version']==265,prefixe+' initialisation')
            for machine in ('ko','mc','stk','kp'):
                pg.evaluate(graphique.OUVRIR,machine);pg.wait_for_timeout(150)
                a=pg.evaluate('''()=>{const m=document.getElementById('rm-compact'),r=m.getBoundingClientRect(),b=document.getElementById('retour').getBoundingClientRect();return {mobile:document.body.classList.contains('ui-mobile'),affiche:!!m.getClientRects().length,x:r.x,right:r.right,h:r.height,menu:b.x,doc:document.documentElement.scrollWidth};}''')
                verifier(a['affiche']==a['mobile'],prefixe+' '+machine+' bande réservée seulement')
                if a['mobile']:verifier(a['x']>=0 and a['right']<=a['menu']-7 and a['h']==44,prefixe+' '+machine+' pas de superposition MENU')
                verifier(a['doc']<=w+1,prefixe+' '+machine+' pas de débordement')
            pg.evaluate(graphique.OUVRIR,'ko');pg.wait_for_timeout(150)
            if indice==0:
                pg.evaluate(SIGNAL,{'g':.22,'d':.055});pg.wait_for_timeout(300)
                s=etat();mesures.append({'cas':'sortie G/D','etat':s})
                verifier(s['sortie'] and abs(s['sortie'][0]['pic']-.22)<.005 and abs(s['sortie'][1]['pic']-.055)<.005,'audio : G/D indépendants')
                verifier(s['lecteurs']==1,'audio : une paire pour la sortie')
                pg.evaluate(SIGNAL,{'g':.2,'d':-.2});pg.wait_for_timeout(220)
                verifier(all(.19<x['pic']<.21 for x in etat()['sortie']),'audio : antiphase non annulée')
                pg.evaluate(SIGNAL,{'g':.2,'mono':True});pg.wait_for_timeout(220)
                verifier(all(.19<x['pic']<.21 for x in etat()['sortie']),'audio : mono correctement dupliqué')
                if args.captures:pg.screenshot(path=str(args.captures/'sortie-active-portrait.png'))
                pg.evaluate(STOP);pg.wait_for_timeout(350);s=etat()
                verifier(all(x['pic']<.0001 for x in s['sortie']),'audio : zéro au silence')
                verifier(all(x['crete']>x['barre']+3 for x in s['sortie']),'audio : maintien de crête et descente distincts')
                avant=s['lectures'];pg.wait_for_timeout(1000);delta=etat()['lectures']-avant
                verifier(15<=delta<=34,'performance : lectures <=30/s, tolérance 4, observé '+str(delta))
                pg.evaluate('window.__midi(0xB0,1,32)');pg.wait_for_timeout(40)
                verifier(pg.locator('#rm-compact .rm-midi').get_attribute('data-on')=='1','MIDI : message de canal')
                pg.wait_for_timeout(260)
                verifier(pg.locator('#rm-compact .rm-midi').get_attribute('data-on')=='0','MIDI : extinction')
                pg.evaluate('window.__midi(0xF8,0,0)');pg.wait_for_timeout(40)
                verifier(pg.locator('#rm-compact .rm-midi').get_attribute('data-on')=='0','MIDI : pas de faux voyant sur horloge')
                pg.evaluate('S.run=true;T_PAS+=.125;RETOURS_MUSICAUX.reveiller()');pg.wait_for_timeout(60)
                verifier(pg.locator('#rm-compact .rm-transport').get_attribute('data-etat')=='play','transport : PLAY')
                pg.evaluate('S.run=false;KO.rec=true;RETOURS_MUSICAUX.reveiller()');pg.wait_for_timeout(60)
                verifier(pg.locator('#rm-compact .rm-transport').inner_text()=='ARMÉ','transport : armement distinct')
                pg.evaluate('KO.rec=false;RETOURS_MUSICAUX.reveiller()')
            pg.evaluate('ouvrirTable()');pg.wait_for_timeout(250)
            verifier(pg.locator('#rm-console').is_visible(),prefixe+' sortie générale dans table')
            verifier(pg.locator('.rm-canal').count()==21,prefixe+' 21 voies équipées')
            verifier(not pg.locator('#rm-compact').is_visible(),prefixe+' compact masqué sous table')
            a=pg.evaluate('''()=>{const p=document.getElementById('rm-console'),r=p.getBoundingClientRect(),b=document.getElementById('rm-reset').getBoundingClientRect();return {w:p.scrollWidth,c:p.clientWidth,x:r.x,right:r.right,bottom:r.bottom,bw:b.width,bh:b.height};}''')
            verifier(a['w']<=a['c']+1 and a['x']>=0 and a['right']<=w+1 and a['bottom']<h,prefixe+' console dans fenêtre')
            verifier(a['bw']>=44 and a['bh']>=44,prefixe+' cible RAZ >=44px')
            verifier(pg.locator('#rm-reset').evaluate('(e)=>e.scrollWidth<=e.clientWidth && getComputedStyle(e).whiteSpace==="nowrap"'),prefixe+' libellé RAZ sans mot coupé')
            pg.evaluate('SET_VOIES.forEach(v=>busSet(v[0]))')
            pg.locator('.voie[data-v="ehx"] .rm-canal').scroll_into_view_if_needed();pg.wait_for_timeout(300)
            s=etat();verifier(s['lecteurs']<=1+len(s['visibles']) and s['lecteurs']<22,prefixe+' seules mesures visibles connectées')
            if args.captures:pg.screenshot(path=str(args.captures/f'table-{prefixe}.png'))
            if indice==0:
                pg.evaluate('SET.pan.ehx=-1;SET.niv.ehx=.7;SET.mute.ehx=false;SET.solo="";majVoieSet("ehx")')
                pg.evaluate(SIGNAL,{'g':.4,'mono':True,'voie':'ehx'});pg.wait_for_timeout(300)
                s=etat();v=s['voies'].get('ehx');mesures.append({'cas':'panoramique gauche','etat':s})
                verifier(v and v[0]['pic']>.25 and v[1]['pic']<.0001,'voie : panoramique gauche après fader')
                pg.evaluate('SET.pan.ehx=1;majVoieSet("ehx")');pg.wait_for_timeout(250)
                v=etat()['voies'].get('ehx');verifier(v and v[1]['pic']>.25 and v[0]['pic']<.0001,'voie : panoramique droite')
                pg.evaluate('SET.pan.ehx=0;SET.niv.ehx=1;majVoieSet("ehx")')
                pg.evaluate(SIGNAL,{'g':.2,'d':-.2,'voie':'ehx'});pg.wait_for_timeout(250)
                v=etat()['voies'].get('ehx');verifier(v and all(.19<x['pic']<.21 for x in v),'voie : antiphase conservée')
                pg.evaluate('SET.mute.ehx=true;majVoieSet("ehx")');pg.wait_for_timeout(250)
                v=etat()['voies'].get('ehx');verifier(v and all(x['pic']<.0001 for x in v),'voie : COUPE pris en compte')
                pg.evaluate('SET.mute.ehx=false;SET.solo="em";majToutesVoiesSet()');pg.wait_for_timeout(250)
                v=etat()['voies'].get('ehx');verifier(v and all(x['pic']<.0001 for x in v),'voie : SOLO d’une autre voie pris en compte')
                pg.evaluate('SET.solo="";majToutesVoiesSet();master.gain.value=1')
                pg.evaluate(SIGNAL,{'g':1.8,'d':1.8,'voie':'ehx'});pg.wait_for_timeout(650)
                s=etat();mesures.append({'cas':'surcharge','etat':s})
                verifier(pg.locator('.voie[data-v="ehx"] .rm-canal').evaluate('(e)=>e.classList.contains("rm-surcharge")'),'voie : CLIP >=0 dBFS')
                verifier(s['sortie'] and all(x['pic']<=.981 for x in s['sortie']),'audio : garde de sortie inchangée')
                verifier(pg.locator('#rm-console').evaluate('(e)=>e.classList.contains("rm-limite")'),'audio : voyant de réduction du limiteur')
                if args.captures:pg.screenshot(path=str(args.captures/'table-surcharge.png'))
                pg.evaluate(STOP);pg.wait_for_timeout(100)
                verifier(pg.locator('.voie[data-v="ehx"] .rm-canal').evaluate('(e)=>e.classList.contains("rm-surcharge")'),'voie : maintien bref de surcharge')
                reglage='({vol:master.gain.value,niv:SET.niv.ehx,pan:SET.pan.ehx,mute:SET.mute.ehx,solo:SET.solo})'
                avant=pg.evaluate(reglage);pg.locator('#rm-reset').click();pg.wait_for_timeout(200)
                verifier(avant==pg.evaluate(reglage),'RAZ : aucun changement audio')
                verifier(not pg.locator('.voie[data-v="ehx"] .rm-canal').evaluate('(e)=>e.classList.contains("rm-surcharge")'),'RAZ : alerte effacée au silence')
                pg.evaluate('window.rmCtxVrai=ctx;ctx=new OfflineAudioContext(2,512,48000);window.rmOffAnalyses=0;ctx.createAnalyser=()=>{rmOffAnalyses++;throw Error("analyseur dans un rendu");};RETOURS_MUSICAUX.reveiller()');pg.wait_for_timeout(120)
                verifier(etat()['lecteurs']==0 and pg.evaluate('rmOffAnalyses')==0,'export : aucun analyseur hors ligne')
                pg.evaluate('ctx=rmCtxVrai;RETOURS_MUSICAUX.reveiller()');pg.wait_for_timeout(200)
                verifier(etat()['lecteurs']>=1,'export : reprise des mesures')
                pg.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))');pg.wait_for_timeout(180)
                s=etat();pg.wait_for_timeout(240);s2=etat()
                verifier(s['lecteurs']==0 and not s['anime'] and s['frames']==s2['frames'],'arrière-plan : lecteurs et RAF arrêtés')
                pg.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))');pg.wait_for_timeout(200)
                verifier(etat()['lecteurs']>=1,'premier plan : reprise')
                pg.evaluate('ctx.suspend()');pg.wait_for_timeout(150)
                verifier(etat()['lecteurs']==0 and not etat()['anime'],'contexte suspendu : arrêt')
                pg.evaluate('ctx.resume()');pg.wait_for_timeout(200)
                verifier(etat()['lecteurs']>=1,'contexte repris : statechange')
                pg.evaluate('window.rmAncienCtx=ctx;refaireAudio();RETOURS_MUSICAUX.reveiller()');pg.wait_for_timeout(350)
                verifier(pg.evaluate('ctx!==rmAncienCtx && ctx.__drmMesure.sortie.context===ctx') and etat()['lecteurs']>=1,'relance : aucun lecteur sur vieux contexte')
                pg.emulate_media(reduced_motion='reduce');pg.wait_for_timeout(150)
                verifier(etat()['reduit'],'mouvements réduits reconnus');pg.emulate_media(reduced_motion='no-preference')
            pg.locator('.voie[data-v="eur"] .rm-canal').scroll_into_view_if_needed();pg.wait_for_timeout(250)
            s=etat();verifier('eur' in s['visibles'] and 'ehx' not in s['voies'],prefixe+' défilement : voie invisible débranchée')
            verifier(s['lecteurs']<=len(s['visibles'])+1,prefixe+' pas d’accumulation')
            pg.evaluate('fermerTable();ouvrirMenu()');pg.wait_for_timeout(200)
            s=etat();pg.wait_for_timeout(200);s2=etat()
            verifier(s['lecteurs']==0 and not s['anime'] and s['frames']==s2['frames'],prefixe+' menu : pas de mesure cachée')
            for _ in range(3):
                pg.evaluate('ouvrirTable()');pg.wait_for_timeout(60);pg.evaluate('fermerTable()');pg.wait_for_timeout(60)
            verifier(pg.locator('#rm-console').count()==1 and pg.locator('.rm-canal').count()==21,prefixe+' pas de doublon après réouvertures')
            verifier(etat()['lecteurs']==0,prefixe+' pas de fuite après réouvertures')
            verifier(not js,prefixe+' aucune erreur JavaScript : '+str(js))
            print('Contrôlé : '+prefixe,flush=True);contexte.close()
        nav.close()
    rapport={'version':265,'verifications':total,'formats':FORMATS,'erreurs':erreurs,'mesures_audio':mesures,'stockage_simule':args.contenu}
    if args.rapport:args.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{total} vérifications ; {len(erreurs)} erreur(s).',flush=True)
    return bool(erreurs)
if __name__=='__main__':raise SystemExit(main())
