#!/usr/bin/env python3
"""v282 : six racks RAVE, édition BREAK 32, nettoyage des voix et vrais rendus audio.
--contenu charge la page en mémoire et utilise un stockage éphémère.
"""
import argparse,importlib.util,json
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('g',Path(__file__).with_name('test-graphique.py'));G=importlib.util.module_from_spec(s);s.loader.exec_module(G)
FORMATS=[(320,568),(360,640),(393,851),(640,360),(880,400),(1280,800),(1920,1080)]
IDS=['rave-jungle','rave-dnb','rave-uptempo','rave-breakcore','rave-gabber','rave-psy']
STRUCTURE='''()=>EUR_MONTAGES.filter(p=>p.fam==='rave').map(p=>{
 const err=[],keys=new Set(),entrees=new Set();
 p.mods.forEach(([type,ps],i)=>{const d=EUR_CAT[type];if(!d){err.push(type);return;}for(const[k,v]of Object.entries(ps)){const q=d.kns.find(q=>q[0]===k);if(!q||!Number.isFinite(v)||v<q[2]||v>q[3])err.push(i+':'+k);}});
 p.cables.forEach(([a,s,b,e])=>{const d=EUR_CAT[p.mods[a]?.[0]],f=EUR_CAT[p.mods[b]?.[0]];if(!d?.jacks.some(j=>j[0]===s&&j[2])||!f?.jacks.some(j=>j[0]===e&&!j[2]))err.push('prise');const k=[a,s,b,e].join(':');if(keys.has(k))err.push('câble double');keys.add(k);if(entrees.has(b+':'+e))err.push('entrée double');entrees.add(b+':'+e);});
 return {id:p.id,erreurs:err,modules:p.mods.length,cables:p.cables.length,horloges:p.mods.filter(x=>x[0]==='clock').length,melos:p.mods.filter(x=>x[0]==='melo32').length,scenes:p.mods.filter(x=>x[0]==='scenes8').length,rangees:p.rangees.length===p.mods.length};
})'''
AUDIO=r'''async ({id,sr})=>{
 stop();const p=EUR_MONTAGES.find(p=>p.id===id),dt=60/p.bpm/4,start=.1,n=208,fin=start+n*dt;
 if(ctx&&ctx.close&&!ctx.startRendering)await ctx.close();
 ctx=new OfflineAudioContext(11,Math.ceil((fin+1.8)*sr),sr);batirAudio();eurMonter(p);
 EUR.bus.disconnect();const merge=ctx.createChannelMerger(11);merge.connect(ctx.destination);
 const split=ctx.createChannelSplitter(2);EUR.bus.connect(split);split.connect(merge,0,0);split.connect(merge,1,1);
 const m=k=>EUR.mods[p.reperes[k]],sc=m('scenes');
 ['mixBatterie','basse','vcaMelodie','fx','kick'].forEach((k,i)=>m(k).io.s.out.connect(merge,0,2+i));
 ['a','b','c','d'].forEach((k,i)=>sc.io.s[k].connect(merge,0,7+i));
 const journal=[],native=sc.recevoir;sc.recevoir=function(t,e){const f=native(t,e);if(e==='in'&&f?.includes('bar'))journal.push({t,scene:sc.scenes8.scene,niveaux:[...sc.scenes8.niveaux]});return f;};
 let seed=282,old=Math.random;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 cache=true;try{for(let i=0;i<n;i++){OFF_T=start+i*dt;scheduleEur(i%16,OFF_T);purgerSources();}OFF_T=fin;arretEur();}finally{OFF_T=-1;cache=false;Math.random=old;}
 const b=await ctx.startRendering(),stats=[];
 for(let c=0;c<7;c++){const d=b.getChannelData(c);let peak=0,sum=0,dc=0,bad=0;for(const x of d){if(!Number.isFinite(x)){bad++;continue;}peak=Math.max(peak,Math.abs(x));sum+=x*x;dc+=x;}stats.push({c,peak,rms:Math.sqrt(sum/d.length),dc:dc/d.length,bad});}
 const cv=[];for(const e of journal)for(let j=0;j<4;j++){const t=e.t+sc.p.fade/1000+.003,lu=b.getChannelData(7+j)[Math.round(t*sr)];cv.push({scene:e.scene,voie:j,ok:Math.abs(lu-e.niveaux[j]/100)<.002});}
 const clean=['basse'].map(k=>{const c=3,d=b.getChannelData(c);let peak=0;for(let i=Math.ceil((fin+.05)*sr);i<d.length;i++)peak=Math.max(peak,Math.abs(d[i]));return {k,peak};});
 const hist=EUR.mods.filter(m=>m.break32).map(m=>m.break32.dates.length);
 return {id,sr,stats,journal,cv,clean,hist};
}'''

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path);ap.add_argument('--sans-audio',action='store_true');a=ap.parse_args()
 total=0;err=[];rendus=[];structures=[]
 def v(c,m):
  nonlocal total
  total+=1
  if not c:err.append(m);print('FAUX '+m,flush=True)
 with sync_playwright() as p:
  opt={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
  if a.chromium:opt['executable_path']=a.chromium;opt['args'].append('--no-sandbox')
  b=p.chromium.launch(**opt)
  def ouvrir(w,h):
   c=b.new_context(viewport={'width':w,'height':h},has_touch=w<1000);pg=c.new_page();er=[];pg.on('pageerror',lambda e:er.append(str(e)))
   f=R/'app/src/main/assets/drm16.html'
   if a.contenu:pg.evaluate(G.STOCKAGE);pg.set_content(f.read_text(encoding='utf-8'),wait_until='domcontentloaded')
   else:pg.goto(f.as_uri(),wait_until='domcontentloaded')
   pg.wait_for_timeout(100);pg.evaluate(G.OUVRIR,'eur');return c,pg,er
  for w,h in FORMATS:
   c,pg,er=ouvrir(w,h);tag=f'{w}x{h}';accord={'oui':False};pg.on('dialog',lambda d:d.accept() if accord['oui'] else d.dismiss())
   v(pg.evaluate('Object.keys(EUR_CAT).length===117 && new Set(EUR_ORDRE).size===117'),tag+' 117 modules uniques')
   v(pg.evaluate('EUR_MONTAGES.length===63 && EUR_MONTAGES.filter(p=>p.fam==="rave").length===6'),tag+' 63 montages dont six RAVE')
   st=pg.evaluate(STRUCTURE);structures=st
   for x in st:v(not x['erreurs'] and x['horloges']==1 and x['melos']==2 and x['scenes']==1 and x['rangees'],tag+' câblage '+str(x))
   pg.evaluate('window.rackAvant=JSON.stringify(rackCourant());EUR.montFam="rave";eurMontages()')
   v(pg.locator('[data-famille="rave"]').count()==6,tag+' six cartes dans le vrai catalogue')
   pg.locator('[data-montage="rave-jungle"]').click();v(pg.evaluate('JSON.stringify(rackCourant())===rackAvant'),tag+' refus de remplacer conserve le rack')
   accord['oui']=True;pg.locator('[data-montage="rave-jungle"]').click();pg.wait_for_timeout(50)
   v(pg.evaluate('!S.run && EUR.mods.some(m=>m.type==="break32")'),tag+' chargement sans lecture automatique')
   pg.evaluate('window.br=EUR.mods.find(m=>m.type==="break32");window.avant=JSON.stringify(br.p);window.busAvant=EUR.bus;window.cablesAvant=JSON.stringify(EUR.cables)')
   pg.locator('.br32-mini .br32-pas').first.click();v(pg.evaluate('EUR_FOCUS.actif()===br.id'),tag+' vrai clic ouvre FOCUS')
   v(pg.evaluate('EUR.bus===busAvant && JSON.stringify(br.p)===avant && JSON.stringify(EUR.cables)===cablesAvant'),tag+' Focus ne modifie ni paramètres ni graphe')
   sizes=pg.evaluate('''()=>{const r=document.querySelector('#eur-focus'),z=r.querySelector('.ef-zone');return {deb:z.scrollWidth-z.clientWidth,bad:[...r.querySelectorAll('button,select,[role="slider"]')].filter(e=>e.getClientRects().length).map(e=>({t:e.textContent.slice(0,22),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(x=>x.w<43.9||x.h<43.9)};}''')
   v(sizes['deb']<=1,tag+' aucun débordement horizontal');v(not sizes['bad'],tag+' cibles tactiles 44 px '+str(sizes['bad']))
   pg.locator('.br32-editeur [data-page="1"]').click();pg.locator('.br32-editeur [data-pas="23"]').click()
   for k,val in [('n','13'),('r','4'),('v','1'),('p','37')]:pg.select_option('.br32-editeur [data-champ="'+k+'"]',val)
   v(pg.evaluate('br.p.n23===13&&br.p.r23===4&&br.p.v23===1&&br.p.p23===37&&br.p.n1===1'),tag+' bonne tranche et bon pas')
   pg.select_option('.br32-editeur [data-champ="len"]','8');v(pg.evaluate('br.p.n23===13 && br.p.r23===4'),tag+' raccourcir conserve les données')
   v('hors' in pg.locator('.br32-editeur [data-pas="23"]').get_attribute('class'),tag+' pas hors boucle visibles')
   pg.select_option('.br32-editeur [data-champ="len"]','32');pg.select_option('.br32-editeur [data-champ="pitch"]','-5')
   pg.select_option('.br32-editeur [data-champ="niv"]','42');v(pg.evaluate('br.p.pitch===-5&&br.p.niv===.42'),tag+' transposition et niveau')
   pg.locator('.br32-mute').click();v(pg.evaluate('br.p.mute===1'),tag+' mute');pg.locator('.br32-mute').click();v(pg.evaluate('br.p.mute===0'),tag+' reprise')
   pg.evaluate('window.copieAvant=JSON.stringify(br.p)');accord['oui']=False;pg.locator('.br32-copier').click();v(pg.evaluate('JSON.stringify(br.p)===copieAvant'),tag+' copie refusée')
   accord['oui']=True;pg.locator('.br32-copier').click();v(pg.evaluate('["n","r","v","p"].every(k=>br.p[k+7]===br.p[k+23])'),tag+' copie vers la bonne page')
   accord['oui']=False;pg.locator('.br32-vider').click();v(pg.evaluate('br.p.n23===13'),tag+' effacement refusé')
   accord['oui']=True;pg.locator('.br32-vider').click();v(pg.evaluate('br.p.n23===0&&br.p.n7===13&&br.p.r23===4'),tag+' seule la page demandée vidée')
   if a.captures:a.captures.mkdir(parents=True,exist_ok=True);pg.screenshot(path=str(a.captures/(tag+'.png')))
   pg.evaluate('window.sauve=JSON.stringify(rackCourant());poserRack(JSON.parse(sauve));eurBatir();eurDessiner();window.br=EUR.mods.find(m=>m.type==="break32")')
   v(pg.evaluate('br.p.n23===0&&br.p.n7===13&&br.p.pitch===-5'),tag+' aller-retour rack')
   pg.evaluate('EUR_FOCUS.ouvrir(br.id)');pg.locator('#ef-transport').click();pg.wait_for_timeout(350)
   v(pg.evaluate('S.run&&br.break32.dernier!==null'),tag+' lecture déclenche le nouveau module')
   pg.locator('#ef-transport').click();v(pg.evaluate('!S.run&&br.break32.pos===-1&&br.break32.dates.length===0'),tag+' STOP réinitialise le module')
   pg.evaluate('window.pourDetruire=br.raveVoix;br.recevoir(ctx.currentTime+.05,"clk");eurBatir()')
   v(pg.evaluate('!pourDetruire.actif()&&pourDetruire.nombre()===0'),tag+' recâblage libère les anciennes voix')
   for type in ['corekick','bassrave']:
    pg.evaluate('type=>{EUR_FOCUS.fermer(false);const m=eurAjouter(type);EUR_FOCUS.ouvrir(m.id);}',type)
    v(pg.evaluate('type=>document.querySelectorAll("#eur-focus [role=slider]").length===EUR_CAT[type].kns.length',type),tag+' potards Focus '+type)
   # Un remplacement en cours de lecture doit arrêter le précédent rack.
   pg.evaluate('start();eurMonter(EUR_MONTAGES.find(p=>p.id==="rave-psy"))');v(pg.evaluate('!S.run&&S.bpm===146'),tag+' remplacement arrête et change le tempo')
   v(not er,tag+' aucune erreur JavaScript '+str(er));c.close();print('Contrôlé '+tag,flush=True)
  if not a.sans_audio:
   for id in IDS:
    for sr in [44100,48000]:
     c,pg,er=ouvrir(1280,800);pg.set_default_timeout(90000);r=pg.evaluate(AUDIO,{'id':id,'sr':sr});rendus.append(r)
     for x in r['stats']:
      v(x['bad']==0 and x['rms']>.00001 and x['peak']<4,f'{id}/{sr} canal {x["c"]} actif et fini {x}')
     v(all(x['peak']<.99 for x in r['stats'][:2]),f'{id}/{sr} sortie sans dépassement')
     v(all(x['ok'] for x in r['cv']),f'{id}/{sr} niveaux de scènes effectifs')
     v(len(r['journal'])==13 and r['journal'][-1]['scene']==0,f'{id}/{sr} arrangement 12 mesures puis retour')
     v(all(x['peak']<.0001 for x in r['clean']),f'{id}/{sr} STOP basse {r["clean"]}')
     v(all(x==0 for x in r['hist']),f'{id}/{sr} aucun historique hors ligne')
     v(not er,f'{id}/{sr} aucune exception '+str(er));print('Audio '+id+' '+str(sr)+' Hz '+str(r['stats'][:2]),flush=True);c.close()
  b.close()
 report={'verifications':total,'erreurs':err,'structures':structures,'rendus':rendus}
 if a.rapport:a.rapport.parent.mkdir(parents=True,exist_ok=True);a.rapport.write_text(json.dumps(report,indent=2,ensure_ascii=False))
 print(f'RAVE : {total} vérifications, {len(err)} erreur(s).',flush=True)
 if err:raise SystemExit(1)
if __name__=='__main__':main()
