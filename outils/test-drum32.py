#!/usr/bin/env python3
"""v279 : édition DRUM 32, sauvegardes, câblage, STOP et rendus audio des deux montages.

--contenu : page en mémoire et stockage éphémère, sans fichiers personnels.
Les sorties audio sont rendues hors ligne ; aucun test ne simule une écoute humaine.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('graphique', Path(__file__).with_name('test-graphique.py'))
G = importlib.util.module_from_spec(spec)
spec.loader.exec_module(G)
FORMATS = [(320,568),(360,640),(393,851),(640,360),(880,400),(1280,800),(1920,1080)]

AUDIO = r"""async ({id,rate})=>{
 stop(); const p=EUR_MONTAGES.find(p=>p.id===id);
 if(ctx && ctx.close && !ctx.startRendering) await ctx.close();
 const t0=.1,dt=60/p.bpm/4,n=128,seconds=t0+n*dt+1;
 ctx=new OfflineAudioContext(12,Math.ceil(seconds*rate),rate);batirAudio();eurMonter(p);
 const merge=ctx.createChannelMerger(12);merge.connect(ctx.destination);EUR.bus.disconnect();
 const split=ctx.createChannelSplitter(2);EUR.bus.connect(split);split.connect(merge,0,0);split.connect(merge,1,1);
 const module=k=>EUR.mods[p.reperes[k]],seq=module('seqBatterie');
 for(const [role,c] of [['kick',2],['caisse',3],['hat',4],['perc',5],['vcaBasse',6],['vcaMelodie',7]]) module(role).io.s.out.connect(merge,0,c);
 ['a','b','c','d'].forEach((k,i)=>seq.io.s['t'+k].connect(merge,0,8+i));
 const plan={ta:[],tb:[],tc:[],td:[]},joue={ta:[],tb:[],tc:[],td:[]};
 const orig=seq.recevoir;
 seq.recevoir=function(t,e){const f=orig.call(this,t,e);for(const o of f||[])plan[o[0]].push(o[1]);return f;};
 for(const [j,k] of [['ta','kick'],['tb','caisse'],['tc','hat'],['td','perc']]){
  const m=module(k),r=m.recevoir;m.recevoir=function(t,e){joue[j].push(t);return r.call(this,t,e);};
 }
 // Le hasard reste déterministe, y compris dans les recettes de percussion.
 let graine=7219;const ancien=Math.random;Math.random=()=>{graine=(Math.imul(graine,1664525)+1013904223)>>>0;return graine/4294967296;};
 try{cache=true;for(let i=0;i<n;i++)scheduleEur(i%16,t0+i*dt);}finally{cache=false;Math.random=ancien;}
 const rendu=await ctx.startRendering();const stats=[];
 for(let c=0;c<8;c++){let peak=0,somme=0,nonFini=0;const x=rendu.getChannelData(c);for(let i=0;i<x.length;i++){if(!Number.isFinite(x[i]))nonFini++;else{peak=Math.max(peak,Math.abs(x[i]));somme+=x[i]*x[i];}}stats.push({canal:c,peak,rms:Math.sqrt(somme/x.length),nonFini});}
 const portes=[];
 for(let v=0;v<4;v++){
  const x=rendu.getChannelData(8+v),dates=plan['t'+'abcd'[v]],montantes=[];
  for(let i=1;i<x.length;i++)if(x[i]>.5 && x[i-1]<=.5)montantes.push(i/rate);
  portes.push({voie:v,prevues:dates.length,lues:montantes.length,ok:dates.length===montantes.length&&dates.every((t,i)=>Math.abs(t-montantes[i])<=2/rate)});
 }
 return {id,rate,nPas:n,stats,portes,plan,joue,historique:seq.drum32.dates.length};
}"""

STRUCTURE = r"""()=>EUR_MONTAGES.filter(p=>['av-techno32','av-tribal32'].includes(p.id)).map(p=>{
 const erreurs=[],dest=new Set();
 p.mods.forEach(([t,params],i)=>{const d=EUR_CAT[t];if(!d){erreurs.push('module '+t);return;}Object.entries(params).forEach(([k,v])=>{const p=d.kns.find(x=>x[0]===k);if(!p||!Number.isFinite(v)||v<p[2]||v>p[3])erreurs.push('param '+i+' '+k);});});
 p.cables.forEach(([a,s,b,e])=>{let x=EUR_CAT[p.mods[a][0]],y=EUR_CAT[p.mods[b][0]];if(!x.jacks.some(j=>j[0]===s&&j[2])||!y.jacks.some(j=>j[0]===e&&!j[2]))erreurs.push('prise');let key=b+':'+e;if(dest.has(key))erreurs.push('double entrée '+key);dest.add(key);});
 return {id:p.id,erreurs,mods:p.mods.length,cables:p.cables.length,horloges:p.mods.filter(x=>x[0]==='clock').length,drum:p.mods.filter(x=>x[0]==='drum32').length};
})"""

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true')
    ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path)
    args=ap.parse_args();erreurs=[];compte=0;rendus=[]
    def v(ok,nom):
        nonlocal compte
        compte+=1
        if not ok:erreurs.append(nom);print('FAUX : '+nom,flush=True)
    with sync_playwright() as p:
        opts={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:opts['executable_path']=args.chromium;opts['args'].append('--no-sandbox')
        nav=p.chromium.launch(**opts)
        def ouvrir(w,h):
            contexte=nav.new_context(viewport={'width':w,'height':h},has_touch=w<1000)
            pg=contexte.new_page();fautes=[];pg.on('pageerror',lambda e:fautes.append(str(e)))
            f=RACINE/'app/src/main/assets/drm16.html'
            if args.contenu:pg.evaluate(G.STOCKAGE);pg.set_content(f.read_text(encoding='utf-8'),wait_until='domcontentloaded')
            else:pg.goto(f.as_uri(),wait_until='domcontentloaded')
            pg.wait_for_timeout(120);pg.evaluate(G.OUVRIR,'eur');return contexte,pg,fautes
        for w,h in FORMATS:
            c,pg,fautes=ouvrir(w,h);nom=f'{w}x{h}'
            accepter={'oui':False};pg.on('dialog',lambda d:d.accept() if accepter['oui'] else d.dismiss())
            v(pg.evaluate('Object.keys(EUR_CAT).length===119 && EUR_ORDRE.filter(x=>x==="drum32").length===1'),nom+' catalogue 119 modules sans doublon')
            v(pg.evaluate('EUR_MONTAGES.length===66 && EUR_MONTAGES.filter(p=>p.fam==="ensemble").length===8'),nom+' 66 montages dont huit ensembles')
            pg.evaluate('window.ancienPatch=JSON.stringify(rackCourant());window.anciens=JSON.stringify(EUR_MONTAGES.filter(p=>p.fam!=="avance")); EUR.montFam="avance";eurMontages()')
            v(pg.locator('#eur-cat button[data-famille="avance"]').count()==8,nom+' huit cartes avancées')
            pg.locator('[data-montage="av-techno32"]').click()
            v(pg.evaluate('JSON.stringify(rackCourant())===ancienPatch'),nom+' confirmation refusée conserve le rack')
            accepter['oui']=True;pg.locator('[data-montage="av-techno32"]').click();pg.wait_for_timeout(80)
            v(pg.evaluate('EUR.mods.length===26 && EUR.cables.length===34 && !S.run'),nom+' montage entier chargé sans autoplay')
            v(pg.locator('.dr32-mini .dr32-resume').count()==4,nom+' aperçu des quatre pistes')
            pg.evaluate('window.dm=EUR.mods.find(m=>m.type==="drum32"); window.busTemoin=EUR.bus;window.cablesTemoin=JSON.stringify(EUR.cables);window.paramTemoin=JSON.stringify(dm.p)')
            pg.locator('.dr32-mini .dr32-resume[data-voie="1"]').click(timeout=5000)
            v(pg.evaluate('EUR_FOCUS.actif()===dm.id && dm.drum32Voie===1'),nom+' appui réel ouvre la bonne piste')
            v(pg.evaluate('EUR.bus===busTemoin && JSON.stringify(dm.p)===paramTemoin && JSON.stringify(EUR.cables)===cablesTemoin'),nom+' ouverture sans changement audio')
            v(pg.locator('.dr32-editeur .dr32-pas').count()==16,nom+' seize pas éditables par page')
            sizes=pg.evaluate('''()=>{let r=document.querySelector('#eur-focus'),z=r.querySelector('.ef-zone');return {deborde:z.scrollWidth-z.clientWidth,mauvais:[...r.querySelectorAll('button,select')].filter(e=>!e.hidden&&e.getClientRects().length).map(e=>({text:e.textContent.slice(0,30),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(e=>e.w<43.9||e.h<43.9)};}''')
            v(sizes['deborde']<=1,nom+' pas de débordement horizontal')
            v(not sizes['mauvais'],nom+' cibles 44 pixels '+str(sizes['mauvais']))
            pg.locator('.dr32-editeur [data-page="1"]').click();pg.select_option('.dr32-editeur [data-champ="outil"]','4')
            pg.locator('.dr32-editeur .dr32-pas[data-pas="17"]').click()
            v(pg.evaluate('dm.p.b17===4'),nom+' création de quatre frappes')
            pg.locator('.dr32-editeur .dr32-pas[data-pas="17"]').click()
            v(pg.evaluate('dm.p.b17===0'),nom+' second appui efface le pas')
            pg.select_option('.dr32-editeur [data-champ="outil"]','3');pg.locator('.dr32-editeur .dr32-pas[data-pas="18"]').click()
            v(pg.evaluate('dm.p.b18===3'),nom+' édition dans la seconde mesure')
            for champ,val in [('len','7'),('shift','3'),('chance','35')]:pg.select_option('.dr32-editeur [data-champ="'+champ+'"]',val)
            v(pg.evaluate('dm.p.blen===7 && dm.p.bshift===3 && dm.p.bchance===35 && dm.p.alen===32'),nom+' réglages indépendants')
            v('hors' in pg.locator('.dr32-pas[data-pas="18"]').get_attribute('class') and pg.evaluate('dm.p.b18===3'),nom+' notes hors longueur conservées')
            pg.locator('.dr32-mute').click();v(pg.evaluate('dm.p.bmute===1 && dm.p.amute===0'),nom+' mute indépendant')
            pg.locator('.dr32-mute').click()
            pg.select_option('.dr32-editeur [data-champ="len"]','32');pg.select_option('.dr32-editeur [data-champ="shift"]','0');pg.select_option('.dr32-editeur [data-champ="chance"]','100')
            pg.evaluate('window.avantCopie=JSON.stringify(dm.p)');accepter['oui']=False;pg.locator('.dr32-copier').click()
            v(pg.evaluate('JSON.stringify(dm.p)===avantCopie'),nom+' copie annulée')
            accepter['oui']=True;pg.locator('.dr32-copier').click();v(pg.evaluate('Array.from({length:16},(_,i)=>dm.p["b"+(i+1)]===dm.p["b"+(i+17)]).every(Boolean)'),nom+' copie de page exacte')
            pg.evaluate('window.avantVide=JSON.stringify(dm.p)');accepter['oui']=False;pg.locator('.dr32-vider').click();v(pg.evaluate('JSON.stringify(dm.p)===avantVide'),nom+' effacement annulé')
            accepter['oui']=True;pg.locator('.dr32-vider').click()
            v(pg.evaluate('Array.from({length:32},(_,i)=>dm.p["b"+(i+1)]===0).every(Boolean) && dm.p.a1===1 && dm.p.c3===1'),nom+' efface une seule piste')
            pg.locator('.dr32-editeur [data-page="0"]').click();pg.select_option('.dr32-editeur [data-champ="outil"]','2');pg.locator('.dr32-pas[data-pas="1"]').click()
            pg.locator('#ef-transport').click();pg.wait_for_timeout(350)
            v(pg.evaluate('S.run && dm.drum32.dernier!==null'),nom+' vrai transport avance DRUM 32')
            pg.evaluate('window.graphEnLecture=EUR.bus');pg.locator('.dr32-pas[data-pas="2"]').click()
            v(pg.evaluate('S.run && EUR.bus===graphEnLecture && dm.p.b2===2'),nom+' édition à chaud sans reconstruction')
            pg.locator('#ef-transport').click();pg.wait_for_timeout(80)
            v(pg.evaluate('!S.run && dm.drum32.dernier===null && dm.drum32.dates.length===0'),nom+' STOP efface les départs en attente')
            v(pg.locator('.dr32-editeur .courant').count()==0,nom+' aucun pas joué affiché à STOP')
            pg.locator('#eur-focus-fermer').click();v(pg.evaluate('EUR_FOCUS.actif()===null && !document.querySelector("[inert]")'),nom+' retour libère le rack')
            # Enregistrement dans les huit racks : ni les données ni les fils ne disparaissent.
            pg.evaluate('memEur();window.sauve=JSON.stringify(rackCourant());changerRack(1);changerRack(0);')
            v(pg.evaluate('JSON.stringify(rackCourant())===sauve'),nom+' aller-retour dans un autre emplacement')
            pg.evaluate('window.dm=EUR.mods.find(m=>m.type==="drum32");EUR_FOCUS.ouvrir(dm.id);')
            pg.locator('.ef-jack[data-j="ta"]').click();v(pg.evaluate('EUR.attente.m===dm.id && EUR.attente.j==="ta"'),nom+' sortie A câblable depuis Focus')
            pg.locator('#ef-annuler').click();v(pg.evaluate('EUR.attente===null'),nom+' annule le câble sans modifier le motif')
            pg.evaluate('window.stub=0;dm.arreter=()=>stub++;MACHINE=MACHINE_EHX;stop();MACHINE=MACHINE_EUR;')
            v(pg.evaluate('stub===1'),nom+' arrêt du rack lorsque la machine principale est différente')
            pg.evaluate('eurRetirer(EUR.mods.indexOf(dm));');pg.wait_for_timeout(60)
            v(pg.evaluate('EUR_FOCUS.actif()===null'),nom+' suppression ferme la vue obsolète')
            v(pg.evaluate('JSON.stringify(EUR_MONTAGES.filter(p=>p.fam!=="avance"))===anciens'),nom+' modèles historiques jamais modifiés')
            pg.evaluate('eurMonter(EUR_MONTAGES.find(p=>p.id==="av-tribal32"));window.dm=EUR.mods.find(m=>m.type==="drum32");EUR_FOCUS.ouvrir(dm.id)')
            v(pg.evaluate('dm.p.alen===32 && dm.p.blen===15 && dm.p.clen===16 && dm.p.dlen===7'),nom+' cycles indépendants du montage tribal')
            if args.captures:
                args.captures.mkdir(parents=True,exist_ok=True);pg.screenshot(path=str(args.captures/(nom+'.png')))
            pg.emulate_media(reduced_motion='reduce');v(pg.locator('.dr32-editeur .dr32-pas').count()==16,nom+' réduction des mouvements conserve l’édition')
            v(not fautes,nom+' aucune erreur JavaScript '+str(fautes));c.close();print('Contrôlé : '+nom,flush=True)
        c,pg,fautes=ouvrir(1280,800)
        structures=pg.evaluate(STRUCTURE)
        for s in structures:
            v(not s['erreurs'],s['id']+' toutes les prises et paramètres valides '+str(s['erreurs']))
            v(s['mods']==26 and s['horloges']==1 and s['drum']==1,s['id']+' structure des 26 modules')
        for rate in [44100,48000]:
            for s in structures:
                rendu=pg.evaluate(AUDIO,{'id':s['id'],'rate':rate});rendus.append(rendu);n=s['id']+' '+str(rate)+'Hz'
                v(rendu['historique']==0,n+' rendu sans historique graphique')
                for stat in rendu['stats']:
                    v(stat['nonFini']==0 and stat['rms']>1e-6,n+' canal '+str(stat['canal'])+' audible et fini '+str(stat))
                for port in rendu['portes']:v(port['ok'],n+' impulsions audio '+str(port))
                for k in ['ta','tb','tc','td']:v(rendu['plan'][k]==rendu['joue'][k],n+' propagation de toutes les répétitions '+k)
                v(max(x['peak'] for x in rendu['stats'][:2])<1,n+' sortie du rack sans dépassement de 1')
                print('Rendu : '+n,flush=True)
        v(not fautes,'rendu aucune erreur JavaScript '+str(fautes));c.close();nav.close()
    rapport={'verifications':compte,'erreurs':erreurs,'formats':FORMATS,'structures':structures,'rendus':rendus}
    if args.rapport:args.rapport.parent.mkdir(parents=True,exist_ok=True);args.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'DRUM 32 : {compte} vérifications, {len(erreurs)} erreur(s).',flush=True)
    raise SystemExit(bool(erreurs))
if __name__=='__main__':main()
