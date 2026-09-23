#!/usr/bin/env python3
"""v281 : SCÈNES 8, parcours Focus et rendu audio des quatre groupes.
--contenu : page en mémoire et stockage éphémère, sans fichier utilisateur.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
RACINE=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('g',Path(__file__).with_name('test-graphique.py'))
G=importlib.util.module_from_spec(spec);spec.loader.exec_module(G)
FORMATS=[(320,568),(360,640),(393,851),(640,360),(880,400),(1280,800),(1920,1080)]
STRUCTURE=r'''()=>EUR_MONTAGES.filter(p=>/scenes8$/.test(p.id)).map(p=>{
 const erreurs=[],entrees=new Set();
 p.mods.forEach(([type,ps],i)=>{const d=EUR_CAT[type];if(!d){erreurs.push(type);return;}for(const [k,v] of Object.entries(ps)){const q=d.kns.find(a=>a[0]===k);if(!q||!Number.isFinite(v)||v<q[2]||v>q[3])erreurs.push(i+':'+k);}});
 const accord=p.mods[p.reperes.accordNappe][1];if(Math.abs(55*Math.pow(2,(accord.oct-.5)*3)-110)>.00001||accord.type!==.25)erreurs.push('accord non LA mineur 7');
 p.cables.forEach(([a,s,b,e])=>{const d=EUR_CAT[p.mods[a]?.[0]],f=EUR_CAT[p.mods[b]?.[0]];if(!d?.jacks.some(j=>j[0]===s&&j[2])||!f?.jacks.some(j=>j[0]===e&&!j[2]))erreurs.push('prise');const k=b+':'+e;if(entrees.has(k))erreurs.push('entrée double '+k);entrees.add(k);});
 return {id:p.id,erreurs,modules:p.mods.length,cables:p.cables.length,melos:p.mods.filter(x=>x[0]==='melo32').length,drums:p.mods.filter(x=>x[0]==='drum32').length,horloges:p.mods.filter(x=>x[0]==='clock').length,scenes:p.mods.filter(x=>x[0]==='scenes8').length};
})'''
AUDIO=r'''async ({id,rate})=>{
 stop();const p=EUR_MONTAGES.find(p=>p.id===id),dt=60/p.bpm/4,start=.1,n=208,fin=start+n*dt;
 if(ctx&&ctx.close&&!ctx.startRendering)await ctx.close();
 ctx=new OfflineAudioContext(17,Math.ceil((fin+1.5)*rate),rate);batirAudio();eurMonter(p);
 EUR.bus.disconnect();const merge=ctx.createChannelMerger(17);merge.connect(ctx.destination);
 const stereo=ctx.createChannelSplitter(2);EUR.bus.connect(stereo);stereo.connect(merge,0,0);stereo.connect(merge,1,1);
 const mod=k=>EUR.mods[p.reperes[k]],sc=mod('scenes');
 ['mixBatterie','vcaBasse','vcaMelodie','filtreNappe'].forEach((r,i)=>mod(r).io.s.out.connect(merge,0,2+i));
 [['groupeAB','o1'],['groupeAB','o2'],['groupeCD','o1'],['groupeCD','o2']].forEach(([r,o],i)=>mod(r).io.s[o].connect(merge,0,6+i));
 ['a','b','c','d','clk','bar','change'].forEach((k,i)=>sc.io.s[k].connect(merge,0,10+i));
 const mesures=[],native=sc.recevoir;
 sc.recevoir=function(t,e){const f=native.call(this,t,e);if(e==='in'&&f?.includes('bar'))mesures.push({t,scene:sc.scenes8.scene,pas:sc.scenes8.pas,niveaux:[...sc.scenes8.niveaux],change:f.includes('change')});return f;};
 let seed=281;const rnd=Math.random;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 cache=true;try{for(let i=0;i<n;i++)scheduleEur(i%16,start+i*dt);}finally{cache=false;Math.random=rnd;}
 sc.recevoir(fin,'rst');const b=await ctx.startRendering(),stats=[],cv=[],fades=[],groupes=[],impulsions=[];
 const at=(c,t)=>b.getChannelData(c)[Math.min(b.length-1,Math.max(0,Math.round(t*rate)))];
 for(let c=0;c<10;c++){let peak=0,sum=0,bad=0;for(const x of b.getChannelData(c)){if(!Number.isFinite(x)){bad++;continue;}peak=Math.max(peak,Math.abs(x));sum+=x*x;}stats.push({c,peak,rms:Math.sqrt(sum/b.length),bad});}
 let avant=[0,0,0,0];for(const e of mesures){const cible=e.niveaux.map(x=>x/100);for(let j=0;j<4;j++){
   const t=e.t+sc.p.fade/1000+.002,lu=at(10+j,t);cv.push({scene:e.scene,voie:j,t,attendu:cible[j],lu,ok:Math.abs(lu-cible[j])<.001});
   if(sc.p.fade>0){const t=e.t+sc.p.fade/2000,x=(avant[j]+cible[j])/2,lu=at(10+j,t);fades.push({voie:j,t,attendu:x,lu,ok:Math.abs(x-lu)<.002});}
  }avant=cible;
 }
 for(let j=0;j<4;j++){
  const src=b.getChannelData(2+j),out=b.getChannelData(6+j),controle=b.getChannelData(10+j);let err=0,zero=0;
  for(let k=0;k<b.length;k+=97){err=Math.max(err,Math.abs(out[k]-src[k]*controle[k]));if(controle[k]===0)zero=Math.max(zero,Math.abs(out[k]));}
  groupes.push({voie:j,err,zero,ok:err<.00001&&zero<.00001,fin:at(10+j,fin+.03)});
 }
 for(let c=14;c<17;c++){const x=b.getChannelData(c),ts=[];let on=false;for(let i=0;i<x.length;i++){const now=x[i]>.5;if(now&&!on)ts.push(i/rate);on=now;}impulsions.push({canal:c,dates:ts});}
 return {id,rate,mesures,stats,cv,fades,groupes,impulsions,horloges:n,histoire:sc.scenes8.dates.length};
}'''

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path);args=ap.parse_args()
    compte=0;erreurs=[];rendus=[]
    def v(c,m):
        nonlocal compte
        compte+=1
        if not c:erreurs.append(m);print('FAUX : '+m,flush=True)
    with sync_playwright() as p:
        opts={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:opts['executable_path']=args.chromium;opts['args'].append('--no-sandbox')
        nav=p.chromium.launch(**opts)
        def ouvrir(w,h):
            c=nav.new_context(viewport={'width':w,'height':h},has_touch=w<1000);pg=c.new_page();err=[];pg.on('pageerror',lambda e:err.append(str(e)))
            f=RACINE/'app/src/main/assets/drm16.html'
            if args.contenu:pg.evaluate(G.STOCKAGE);pg.set_content(f.read_text(encoding='utf-8'),wait_until='domcontentloaded')
            else:pg.goto(f.as_uri(),wait_until='domcontentloaded')
            pg.wait_for_timeout(150);pg.evaluate(G.OUVRIR,'eur');return c,pg,err
        for w,h in FORMATS:
            c,pg,err=ouvrir(w,h);nom=f'{w}x{h}';accord={'oui':False};pg.on('dialog',lambda d:d.accept() if accord['oui'] else d.dismiss())
            v(pg.evaluate('Object.keys(EUR_CAT).length===120 && EUR_ORDRE.filter(k=>k==="scenes8").length===1'),nom+' catalogue 120 sans doublon')
            v(pg.evaluate('EUR_MONTAGES.length===68 && EUR_MONTAGES.filter(p=>p.fam==="avance").length===8'),nom+' 68 montages dont huit avancés')
            pg.evaluate('window.modeles=JSON.stringify(EUR_MONTAGES);window.avantRack=JSON.stringify(rackCourant());EUR.montFam="avance";eurMontages()')
            pg.locator('[data-montage="av-progressive-scenes8"]').click();v(pg.evaluate('JSON.stringify(rackCourant())===avantRack'),nom+' refus de remplacer conservé')
            accord['oui']=True;pg.locator('[data-montage="av-progressive-scenes8"]').click()
            v(pg.evaluate('!S.run && EUR.mods.length===33 && EUR.cables.length===47'),nom+' chargement entier sans autoplay')
            pg.evaluate('window.sm=EUR.mods.find(m=>m.type==="scenes8");window.busAvant=EUR.bus;window.cablesAvant=JSON.stringify(EUR.cables);window.paraAvant=JSON.stringify(sm.p)')
            pg.locator('.sc8-mini .sc8-scene').first.click(timeout=5000)
            v(pg.evaluate('EUR_FOCUS.actif()===sm.id && document.querySelector("#ef-val").textContent==="8 SCÈNES"'),nom+' vrai clic ouvre le Focus')
            v(pg.evaluate('EUR.bus===busAvant && JSON.stringify(EUR.cables)===cablesAvant && JSON.stringify(sm.p)===paraAvant'),nom+' ouverture sans modification audio')
            v(pg.locator('.sc8-editeur .sc8-scene').count()==8,nom+' huit scènes éditables')
            sizes=pg.evaluate('''()=>{const r=document.querySelector('#eur-focus'),z=r.querySelector('.ef-zone');return {deb:z.scrollWidth-z.clientWidth,bad:[...r.querySelectorAll('button,select')].filter(e=>e.getClientRects().length).map(e=>({txt:e.textContent.slice(0,30),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(x=>x.w<43.9||x.h<43.9)};}''')
            v(sizes['deb']<=1,nom+' pas de débordement horizontal');v(not sizes['bad'],nom+' toutes cibles >=44 px '+str(sizes['bad']))
            if args.captures:args.captures.mkdir(parents=True,exist_ok=True);pg.screenshot(path=str(args.captures/(nom+'.png')))
            pg.locator('.sc8-editeur [data-scene="6"]').click();pg.select_option('.sc8-editeur [data-champ="bars"]','5');pg.select_option('.sc8-editeur [data-champ="nom"]','6')
            for k,nv in [('a','17'),('b','39'),('c','81'),('d','0')]:pg.select_option('.sc8-editeur [data-champ="'+k+'"]',nv)
            v(pg.evaluate('sm.p.bars7===5 && sm.p.nom7===6 && sm.p.a7===17 && sm.p.b7===39 && sm.p.c7===81 && sm.p.d7===0 && sm.p.a1===65'),nom+' bon réglage dans la bonne scène')
            pg.select_option('.sc8-editeur [data-champ="len"]','2');v(pg.evaluate('sm.p.bars7===5 && sm.p.a7===17'),nom+' réduire la boucle ne supprime pas la scène')
            v('hors' in pg.locator('.sc8-editeur [data-scene="6"]').get_attribute('class'),nom+' scène hors boucle identifiée')
            pg.select_option('.sc8-editeur [data-champ="len"]','8');pg.select_option('.sc8-editeur [data-champ="fade"]','500')
            pg.locator('.sc8-hold').click();v(pg.evaluate('sm.p.hold===1'),nom+' maintenir');pg.locator('.sc8-hold').click();v(pg.evaluate('sm.p.hold===0'),nom+' relâcher')
            pg.evaluate('window.paramsCopie=JSON.stringify(sm.p)');accord['oui']=False;pg.locator('.sc8-copier').click();v(pg.evaluate('JSON.stringify(sm.p)===paramsCopie'),nom+' copie refusée')
            accord['oui']=True;pg.locator('.sc8-copier').click();v(pg.evaluate('["bars","nom","a","b","c","d"].every(k=>sm.p[k+7]===sm.p[k+8])'),nom+' copie des six réglages')
            accord['oui']=False;pg.locator('.sc8-zero').click();v(pg.evaluate('sm.p.a7===17'),nom+' mise à zéro refusée')
            accord['oui']=True;pg.locator('.sc8-zero').click();v(pg.evaluate('sm.p.a7===0 && sm.p.b7===0 && sm.p.c7===0 && sm.p.d7===0 && sm.p.bars7===5 && sm.p.a8===17'),nom+' seuls les quatre niveaux remis à zéro')
            pg.locator('#ef-transport').click();pg.wait_for_timeout(250);v(pg.evaluate('S.run && sm.scenes8.dernier!==null'),nom+' vrai transport avance les scènes')
            pg.evaluate('window.busLecture=EUR.bus')
            pg.locator('.sc8-editeur [data-scene="3"]').click();pg.select_option('.sc8-editeur [data-champ="d"]','52')
            v(pg.evaluate('S.run && EUR.bus===busLecture && sm.p.d4===52 && sm.scenes8.scene===0'),nom+' sélectionner ne saute pas la lecture et ne rebâtit pas le son')
            pg.wait_for_timeout(60);v('courante' in pg.locator('.sc8-editeur [data-scene="0"]').get_attribute('class'),nom+' curseur sur la scène jouée')
            pg.locator('#ef-transport').click();pg.wait_for_timeout(90)
            v(pg.evaluate('!S.run && sm.scenes8.scene===-1 && sm.scenes8.dates.length===0'),nom+' STOP annule l’avance et la file graphique')
            v(pg.locator('.sc8-editeur .courante').count()==0,nom+' extinction à STOP')
            pg.locator('.ef-jack[data-j="a"]').click();v(pg.evaluate('EUR.attente.m===sm.id && EUR.attente.j==="a"'),nom+' CV A câblable');pg.locator('#ef-annuler').click()
            pg.locator('#eur-focus-fermer').click();v(pg.evaluate('!document.querySelector("[inert]")'),nom+' Focus libère le rack')
            pg.evaluate('memEur();window.sauve=JSON.stringify(rackCourant());changerRack(1);changerRack(0)');v(pg.evaluate('JSON.stringify(rackCourant())===sauve'),nom+' sauvegarde paramètres et câbles')
            pg.evaluate('window.sm=EUR.mods.find(m=>m.type==="scenes8");EUR_FOCUS.ouvrir(sm.id);eurRetirer(EUR.mods.indexOf(sm))');pg.wait_for_timeout(60);v(pg.evaluate('EUR_FOCUS.actif()===null'),nom+' suppression invalide le Focus')
            pg.evaluate('eurMonter(EUR_MONTAGES.find(p=>p.id==="av-ambient-scenes8"));window.sm=EUR.mods.find(m=>m.type==="scenes8");EUR_FOCUS.ouvrir(sm.id)')
            v(pg.evaluate('sm.p.fade===750 && sm.p.a1===0 && sm.p.d1===100 && EUR_SCENES8.longueur(sm)===12'),nom+' arrangement ambient distinct')
            pg.emulate_media(reduced_motion='reduce');v(pg.locator('.sc8-editeur .sc8-scene').count()==8,nom+' réduction des mouvements')
            pg.evaluate('ouvrirTable()');pg.wait_for_timeout(60);v(pg.evaluate('EUR_FOCUS.actif()===null'),nom+' fermeture sous un outil')
            v(pg.evaluate('JSON.stringify(EUR_MONTAGES)===modeles'),nom+' modèles jamais modifiés')
            v(not err,nom+' sans erreur JavaScript '+str(err));c.close();print('Contrôlé : '+nom,flush=True)
        c,pg,err=ouvrir(1280,800);structures=pg.evaluate(STRUCTURE);v(len(structures)==2,'deux ensembles de scènes')
        for s in structures:
            v(not s['erreurs'],s['id']+' prises et paramètres '+str(s['erreurs']));v(s['modules']==33 and s['cables']==47 and s['melos']==2 and s['drums']==1 and s['horloges']==1 and s['scenes']==1,s['id']+' structure complète')
        for rate in [44100,48000]:
            for s in structures:
                a=pg.evaluate(AUDIO,{'id':s['id'],'rate':rate});rendus.append(a);nom=s['id']+' '+str(rate)+' Hz'
                v(a['histoire']==0,nom+' pas d’historique graphique hors ligne')
                for st in a['stats']:v(st['bad']==0 and st['rms']>1e-6,nom+' signal audible et fini '+str(st))
                v(max(st['peak'] for st in a['stats'][:2])<1,nom+' crête de sortie <1 sur le test')
                v([e['scene'] for e in a['mesures']]==[0,1,2,2,3,3,4,5,5,6,7,7,0],nom+' huit scènes, durées exactes et bouclage')
                for e in a['cv']:v(e['ok'],nom+' niveau CV '+str(e))
                for e in a['fades']:v(e['ok'],nom+' rampe audio '+str(e))
                for e in a['groupes']:v(e['ok'] and abs(e['fin'])<1e-6,nom+' VCA = source × CV, extinction après RST '+str(e))
                expected=[a['horloges'],len(a['mesures']),sum(e['change'] for e in a['mesures'])]
                for k,e in enumerate(a['impulsions']):v(len(e['dates'])==expected[k],nom+' impulsions audio sans doublon '+str(e['canal']))
                print('Rendu : '+nom,flush=True)
        v(not err,'rendus sans erreur JS '+str(err));c.close();nav.close()
    rapport={'verifications':compte,'erreurs':erreurs,'formats':FORMATS,'structures':structures,'rendus':rendus}
    if args.rapport:args.rapport.parent.mkdir(parents=True,exist_ok=True);args.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'SCÈNES 8 : {compte} vérifications, {len(erreurs)} erreur(s).',flush=True)
    raise SystemExit(bool(erreurs))
if __name__=='__main__':main()
