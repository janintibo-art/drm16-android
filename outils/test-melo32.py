#!/usr/bin/env python3
"""v280 : édition MÉLO 32, sauvegardes et rendus audio des deux nouveaux ensembles.
--contenu : page en mémoire, stockage éphémère. Aucune écoute humaine simulée.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
RACINE=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('graphique',Path(__file__).with_name('test-graphique.py'))
G=importlib.util.module_from_spec(spec);spec.loader.exec_module(G)
FORMATS=[(320,568),(360,640),(393,851),(640,360),(880,400),(1280,800),(1920,1080)]
STRUCTURE=r'''()=>EUR_MONTAGES.filter(p=>['av-acid-melo32','av-berlin-melo32'].includes(p.id)).map(p=>{
 const erreurs=[],entrees=new Set();
 p.mods.forEach(([type,ps],i)=>{const d=EUR_CAT[type];if(!d){erreurs.push(type);return;}for(const [k,v] of Object.entries(ps)){const q=d.kns.find(kp=>kp[0]===k);if(!q||!Number.isFinite(v)||v<q[2]||v>q[3])erreurs.push(i+':'+k);}});
 p.cables.forEach(([a,s,b,e])=>{const d=EUR_CAT[p.mods[a]?.[0]],f=EUR_CAT[p.mods[b]?.[0]];if(!d?.jacks.some(j=>j[0]===s&&j[2])||!f?.jacks.some(j=>j[0]===e&&!j[2]))erreurs.push('prise');const k=b+':'+e;if(entrees.has(k))erreurs.push('entrée double '+k);entrees.add(k);});
 return {id:p.id,erreurs,modules:p.mods.length,cables:p.cables.length,melos:p.mods.filter(x=>x[0]==='melo32').length,drums:p.mods.filter(x=>x[0]==='drum32').length,horloges:p.mods.filter(x=>x[0]==='clock').length};
})'''
AUDIO=r'''async ({id,rate})=>{
 stop();const p=EUR_MONTAGES.find(x=>x.id===id),debut=.1,dt=60/p.bpm/4,n=128;
 if(ctx&&ctx.close&&!ctx.startRendering)await ctx.close();
 ctx=new OfflineAudioContext(14,Math.ceil((debut+n*dt+1.5)*rate),rate);batirAudio();eurMonter(p);
 EUR.bus.disconnect();const merge=ctx.createChannelMerger(14);merge.connect(ctx.destination);
 const split=ctx.createChannelSplitter(2);EUR.bus.connect(split);split.connect(merge,0,0);split.connect(merge,1,1);
 const mod=k=>EUR.mods[p.reperes[k]];
 for(const [r,c] of [['kick',2],['caisse',3],['hat',4],['perc',5],['vcaBasse',6],['vcaMelodie',7]])mod(r).io.s.out.connect(merge,0,c);
 const notes={},portes={},accents={},env={},traitement=[];
 for(const [role,c] of [['seqBasse',8],['seqMelodie',11]]){
  const m=mod(role),native=m.recevoir;notes[role]=[];portes[role]=[];accents[role]=[];
  m.io.s.cv.connect(merge,0,c);m.io.s.gate.connect(merge,0,c+1);m.io.s.acc.connect(merge,0,c+2);
  m.recevoir=function(t,e){const f=native.call(this,t,e);if(e==='clk' && f){
   const i=m.melo32.pos+1,actif=f.includes('gate'),q=EUR_MELO32.noteJouee(m,i),r=m.melo32.rampe;
   notes[role].push({t,i,actif,attendu:q,rampe:actif&&r?{...r}:null});
   if(actif)portes[role].push(t);if(f.includes('acc'))accents[role].push(t);
  }return f;};
 }
 for(const r of ['envBasse','envMelodie']){const m=mod(r),native=m.recevoir;env[r]=[];m.recevoir=function(t,e){env[r].push(t);return native.call(this,t,e);};}
 if(id==='av-acid-melo32'){const m=mod('filtreBasse'),native=m.recevoir;m.recevoir=function(t,e){if(e==='trig')traitement.push({t,accent:m.accent});return native.call(this,t,e);};}
 let seed=317;const rnd=Math.random;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 cache=true;try{for(let i=0;i<n;i++)scheduleEur(i%16,debut+i*dt);}finally{cache=false;Math.random=rnd;}
 const b=await ctx.startRendering(),stats=[],cv=[],gates=[],slides=[];
 for(let c=0;c<8;c++){let sum=0,peak=0,nonFini=0;for(const x of b.getChannelData(c)){if(!Number.isFinite(x))nonFini++;else{sum+=x*x;peak=Math.max(peak,Math.abs(x));}}stats.push({canal:c,rms:Math.sqrt(sum/b.length),peak,nonFini});}
 for(const [role,c] of [['seqBasse',8],['seqMelodie',11]]){
  const clock=p.cables.find(x=>x[2]===p.reperes[role]&&x[3]==='clk'),pas=dt*({out:1,out2:2,out4:4}[clock[1]]);
  let derniere=0;const x=b.getChannelData(c);
  for(const e of notes[role]){
   if(e.actif)derniere=(e.attendu-33)/12;
   const reel=x[Math.round((e.t+pas*.9)*rate)];cv.push({role,pas:e.i,t:e.t,attendu:derniere,reel,ok:Math.abs(reel-derniere)<1e-5});
   if(e.actif&&e.rampe.fin>e.t && Math.abs(e.rampe.b-e.rampe.a)>1e-5){const r=e.rampe,tm=(r.t+r.fin)/2,lu=x[Math.round(tm*rate)],att=(r.a+r.b)/2;slides.push({role,t:tm,lu,att,ok:Math.abs(lu-att)<.002});}
  }
  for(const [cle,canal] of [['gate',c+1],['acc',c+2]]){
   const sig=b.getChannelData(canal),lues=[];for(let i=1;i<sig.length;i++)if(sig[i]>.5&&sig[i-1]<=.5)lues.push(i/rate);
   const prevues=cle==='gate'?portes[role]:accents[role];gates.push({role,sortie:cle,prevues:prevues.length,lues:lues.length,ok:prevues.length===lues.length&&prevues.every((t,i)=>Math.abs(t-lues[i])<2/rate)});
  }
 }
 return {id,rate,stats,cv,gates,slides,portes,env,traitement,accents,histoire:[mod('seqBasse').melo32.dates.length,mod('seqMelodie').melo32.dates.length]};
}'''
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path);args=ap.parse_args()
    erreurs=[];compte=0;rendus=[]
    def v(ok,nom):
        nonlocal compte
        compte+=1
        if not ok:erreurs.append(nom);print('FAUX : '+nom,flush=True)
    with sync_playwright() as p:
        opts={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:opts['executable_path']=args.chromium;opts['args'].append('--no-sandbox')
        nav=p.chromium.launch(**opts)
        def ouvrir(w,h):
            c=nav.new_context(viewport={'width':w,'height':h},has_touch=w<1000);pg=c.new_page();fautes=[];pg.on('pageerror',lambda e:fautes.append(str(e)))
            f=RACINE/'app/src/main/assets/drm16.html'
            if args.contenu:pg.evaluate(G.STOCKAGE);pg.set_content(f.read_text(encoding='utf-8'),wait_until='domcontentloaded')
            else:pg.goto(f.as_uri(),wait_until='domcontentloaded')
            pg.wait_for_timeout(150);pg.evaluate(G.OUVRIR,'eur');return c,pg,fautes
        for w,h in FORMATS:
            c,pg,fautes=ouvrir(w,h);nom=f'{w}x{h}';decision={'oui':False};pg.on('dialog',lambda d:d.accept() if decision['oui'] else d.dismiss())
            v(pg.evaluate('Object.keys(EUR_CAT).length===109 && EUR_ORDRE.filter(x=>x==="melo32").length===1'),nom+' catalogue unique 106')
            v(pg.evaluate('EUR_MONTAGES.length===50 && EUR_MONTAGES.filter(p=>p.fam==="avance").length===8'),nom+' 50 montages dont huit avancés')
            pg.evaluate('window.rackAvant=JSON.stringify(rackCourant());window.modelesAvant=JSON.stringify(EUR_MONTAGES);EUR.montFam="avance";eurMontages();')
            pg.locator('[data-montage="av-acid-melo32"]').click();v(pg.evaluate('JSON.stringify(rackCourant())===rackAvant'),nom+' confirmation refusée')
            decision['oui']=True;pg.locator('[data-montage="av-acid-melo32"]').click()
            v(pg.evaluate('!S.run && EUR.mods.length===26 && EUR.mods.filter(m=>m.type==="melo32").length===2'),nom+' chargement sans autoplay')
            pg.evaluate('window.mm=EUR.mods.find(m=>m.type==="melo32");window.mm2=EUR.mods.filter(m=>m.type==="melo32")[1];window.busAvant=EUR.bus;window.pAvant=JSON.stringify(mm.p);window.cAvant=JSON.stringify(EUR.cables);')
            pg.locator('.ml32-apercu').first.click(timeout=5000)
            v(pg.evaluate('EUR_FOCUS.actif()===mm.id && document.querySelector("#ef-val").textContent==="32 NOTES"'),nom+' vrai appui ouvre le bon éditeur')
            v(pg.evaluate('EUR.bus===busAvant && JSON.stringify(mm.p)===pAvant && JSON.stringify(EUR.cables)===cAvant'),nom+' Focus ne reconstruit pas le son')
            v(pg.locator('.ml32-editeur .ml32-pas').count()==16,nom+' seize touches lisibles')
            taille=pg.evaluate('''()=>{const r=document.querySelector('#eur-focus'),z=r.querySelector('.ef-zone');return {deb:z.scrollWidth-z.clientWidth,bad:[...r.querySelectorAll('button,select')].filter(e=>e.getClientRects().length).map(e=>({t:e.textContent.slice(0,22),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(e=>e.w<43.9||e.h<43.9)};}''')
            v(taille['deb']<=1,nom+' sans débordement horizontal');v(not taille['bad'],nom+' cibles 44 pixels '+str(taille['bad']))
            if args.captures:args.captures.mkdir(parents=True,exist_ok=True);pg.screenshot(path=str(args.captures/(nom+'.png')))
            pg.locator('.ml32-editeur [data-page="1"]').click();pg.locator('.ml32-pas[data-pas="17"]').click();pg.select_option('.ml32-editeur [data-champ="note"]','60')
            pg.select_option('.ml32-editeur [data-champ="prob"]','37');v(pg.evaluate('mm.p.n17===60 && mm.p.p17===37 && mm2.p.n17!==60'),nom+' note et probabilité dans la bonne instance')
            pg.locator('.ml32-s').click();v(pg.evaluate('mm.p.s17===1'),nom+' glissé par pas')
            pg.locator('.ml32-on').click();v(pg.evaluate('mm.p.on17===0 && mm.p.n17===60'),nom+' silence conserve la hauteur')
            pg.locator('.ml32-on').click();pg.locator('.ml32-a').click();v(pg.evaluate('mm.p.on17===1 && mm.p.a17===0'),nom+' réactivation et accent indépendant')
            for k,n in [('root','0'),('scale','2'),('trans','1'),('dir','2'),('len','8'),('glide','100')]:pg.select_option('.ml32-editeur [data-champ="'+k+'"]',n)
            v(pg.evaluate('mm.p.n17===60 && EUR_MELO32.noteJouee(mm,17)===60 && mm.p.len===8 && mm.p.dir===2'),nom+' transposition puis gamme sans perte de note')
            v('hors' in pg.locator('.ml32-pas[data-pas="17"]').get_attribute('class'),nom+' pas hors longueur identifié')
            v('DO4 → DO4' in pg.locator('.ml32-calcule').inner_text(),nom+' note écrite et note jouée distinguées')
            pg.locator('.ml32-mute').click();v(pg.evaluate('mm.p.mute===1 && mm2.p.mute===0'),nom+' coupure indépendante');pg.locator('.ml32-mute').click()
            pg.evaluate('window.avantCopie=JSON.stringify(mm.p)');decision['oui']=False;pg.locator('.ml32-copier').click();v(pg.evaluate('JSON.stringify(mm.p)===avantCopie'),nom+' copie annulée')
            decision['oui']=True;pg.locator('.ml32-copier').click();v(pg.evaluate('Array.from({length:16},(_,i)=>["n","on","a","s","p"].every(k=>mm.p[k+(i+1)]===mm.p[k+(i+17)])).every(Boolean)'),nom+' copie des cinq réglages de chaque pas')
            pg.evaluate('window.avantSilence=JSON.stringify(mm.p)');decision['oui']=False;pg.locator('.ml32-silences').click();v(pg.evaluate('JSON.stringify(mm.p)===avantSilence'),nom+' silence global annulé')
            decision['oui']=True;pg.locator('.ml32-silences').click();v(pg.evaluate('Array.from({length:32},(_,i)=>mm.p["on"+(i+1)]===0).every(Boolean) && mm.p.n17===60 && mm.p.p17===37'),nom+' silence global conserve les notes')
            pg.select_option('.ml32-editeur [data-champ="len"]','32');pg.select_option('.ml32-editeur [data-champ="dir"]','0');pg.locator('.ml32-on').click()
            pg.locator('#ef-transport').click();pg.wait_for_timeout(350);v(pg.evaluate('S.run && mm.melo32.dernier!==null'),nom+' transport réel fait avancer le module')
            pg.evaluate('window.busLecture=EUR.bus');pg.select_option('.ml32-editeur [data-champ="note"]','62');v(pg.evaluate('S.run && EUR.bus===busLecture && mm.p.n17===62'),nom+' édition à chaud sans rebuild')
            pg.locator('#ef-transport').click();pg.wait_for_timeout(80);v(pg.evaluate('!S.run && mm.melo32.dernier===null && mm.melo32.dates.length===0'),nom+' STOP nettoie les événements')
            v(pg.locator('.ml32-editeur .courant').count()==0,nom+' témoin éteint à STOP')
            pg.locator('.ef-jack[data-j="cv"]').click();v(pg.evaluate('EUR.attente.m===mm.id && EUR.attente.j==="cv"'),nom+' sortie CV câblable');pg.locator('#ef-annuler').click()
            pg.locator('#eur-focus-fermer').click();v(pg.evaluate('!document.querySelector("[inert]")'),nom+' Focus libère le rack')
            pg.evaluate('memEur();window.sauve=JSON.stringify(rackCourant());changerRack(1);changerRack(0);');v(pg.evaluate('JSON.stringify(rackCourant())===sauve'),nom+' sauvegarde complète dans un autre rack')
            pg.evaluate('window.mm=EUR.mods.find(m=>m.type==="melo32");EUR_FOCUS.ouvrir(mm.id);eurRetirer(EUR.mods.indexOf(mm));');pg.wait_for_timeout(50);v(pg.evaluate('EUR_FOCUS.actif()===null'),nom+' suppression ferme le Focus obsolète')
            pg.evaluate('eurMonter(EUR_MONTAGES.find(p=>p.id==="av-berlin-melo32"));window.mm=EUR.mods.filter(m=>m.type==="melo32")[1];EUR_FOCUS.ouvrir(mm.id);')
            v(pg.evaluate('mm.p.len===24 && mm.p.dir===2 && EUR.mods.length===27'),nom+' Berlin 24 pas aller-retour')
            pg.emulate_media(reduced_motion='reduce');v(pg.locator('.ml32-pas').count()==16,nom+' édition avec réduction des mouvements')
            v(pg.evaluate('JSON.stringify(EUR_MONTAGES)===modelesAvant'),nom+' modèles intacts après les éditions')
            v(not fautes,nom+' sans erreur JavaScript '+str(fautes));c.close();print('Contrôlé : '+nom,flush=True)
        c,pg,fautes=ouvrir(1280,800);structures=pg.evaluate(STRUCTURE);v(len(structures)==2,'deux nouveaux ensembles trouvés')
        for s in structures:
            v(not s['erreurs'],s['id']+' prises/paramètres '+str(s['erreurs']));v(s['melos']==2 and s['drums']==1 and s['horloges']==1,s['id']+' horloge, DRUM32 et deux MÉLO32')
        for rate in [44100,48000]:
            for s in structures:
                a=pg.evaluate(AUDIO,{'id':s['id'],'rate':rate});rendus.append(a);n=s['id']+' '+str(rate)+' Hz'
                v(a['histoire']==[0,0],n+' sans historique graphique hors ligne')
                for st in a['stats']:v(st['nonFini']==0 and st['rms']>1e-6,n+' canal audible et fini '+str(st))
                v(max(st['peak'] for st in a['stats'][:2])<1,n+' sortie < 1')
                for ev in a['cv']:v(ev['ok'],n+' note CV '+str(ev))
                for ev in a['gates']:v(ev['ok'],n+' impulsions '+str(ev))
                v(bool(a['slides']),n+' glissés réellement produits')
                for ev in a['slides']:v(ev['ok'],n+' rampe audio '+str(ev))
                for x,y in [('seqBasse','envBasse'),('seqMelodie','envMelodie')]:v(a['portes'][x]==a['env'][y],n+' seuls les pas actifs déclenchent '+y)
                if a['id']=='av-acid-melo32':v(all(e['accent']==(e['t'] in a['accents']['seqBasse']) for e in a['traitement']),n+' accents reçus par ACID avant TRIG')
                print('Rendu : '+n,flush=True)
        v(not fautes,'rendus sans erreur JavaScript '+str(fautes));c.close();nav.close()
    rapport={'verifications':compte,'erreurs':erreurs,'formats':FORMATS,'structures':structures,'rendus':rendus}
    if args.rapport:args.rapport.parent.mkdir(parents=True,exist_ok=True);args.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'MÉLO 32 : {compte} vérifications, {len(erreurs)} erreur(s).',flush=True)
    raise SystemExit(bool(erreurs))
if __name__=='__main__':main()
