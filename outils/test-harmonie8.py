#!/usr/bin/env python3
"""v287 : HARMONIE 8, Focus, sauvegardes et progressions CV/audio réelles.
Le mode --contenu n'utilise qu'un stockage éphémère dans Chromium.
"""
import argparse,importlib.util,json,math
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('g',Path(__file__).with_name('test-graphique.py'));G=importlib.util.module_from_spec(s);s.loader.exec_module(G)
FORMATS=[(320,568),(360,640),(393,851),(640,360),(880,400),(1280,800),(1920,1080)]
IDS=['harmonie-dnb','harmonie-psy']
STRUCTURE=r'''()=>EUR_MONTAGES.filter(p=>p.fam==='harmonie').map(p=>{
 const erreurs=[],vus=new Set(),entrees=new Set();
 p.mods.forEach(([type,ps],i)=>{const d=EUR_CAT[type];if(!d){erreurs.push(type);return;}for(const[k,v]of Object.entries(ps)){const q=d.kns.find(q=>q[0]===k);if(!q||!Number.isFinite(v)||v<q[2]||v>q[3])erreurs.push(i+':'+k);}});
 p.cables.forEach(([a,s,b,e])=>{const d=EUR_CAT[p.mods[a]?.[0]],f=EUR_CAT[p.mods[b]?.[0]];if(!d?.jacks.some(j=>j[0]===s&&j[2])||!f?.jacks.some(j=>j[0]===e&&!j[2]))erreurs.push('prise');const k=[a,s,b,e].join(':');if(vus.has(k))erreurs.push('câble double');vus.add(k);if(entrees.has(b+':'+e))erreurs.push('entrée double');entrees.add(b+':'+e);});
 return {id:p.id,erreurs,modules:p.mods.length,cables:p.cables.length,rangees:p.rangees.length,clock:p.mods.filter(x=>x[0]==='clock').length,macros:p.performance.commandes.length};
})'''
TAILLES=r'''()=>{const r=document.querySelector('#eur-focus'),z=r.querySelector('.ef-zone');return {deb:z.scrollWidth-z.clientWidth,bad:[...r.querySelectorAll('button,select,[role="slider"]')].filter(e=>e.getClientRects().length).map(e=>({t:e.textContent.slice(0,22),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(x=>x.w<43.9||x.h<43.9)};}'''
AUDIO=r'''async ({id,sr})=>{
 stop();const p=EUR_MONTAGES.find(p=>p.id===id),dt=60/p.bpm/4,start=.1,n=208,fin=start+n*dt;
 if(ctx&&ctx.close&&!ctx.startRendering)await ctx.close();
 ctx=new OfflineAudioContext(18,Math.ceil((fin+1.8)*sr),sr);batirAudio();eurMonter(p);
 const m=k=>EUR.mods[p.reperes[k]],h=m('harmonie'),sc=m('scenes'),merge=ctx.createChannelMerger(18);merge.connect(ctx.destination);EUR.bus.disconnect();
 const split=ctx.createChannelSplitter(2);EUR.bus.connect(split);split.connect(merge,0,0);split.connect(merge,1,1);
 ['mixBatterie','basse','vcaMelodie','mixNappe'].forEach((k,i)=>m(k).io.s.out.connect(merge,0,2+i));
 ['v1','v2','v3','v4','root','shift'].forEach((k,i)=>h.io.s[k].connect(merge,0,6+i));
 for(let i=1;i<=4;i++)m('nappe'+i).io.s.tri.connect(merge,0,11+i);
 m('transposeBasse').io.s.out.connect(merge,0,16);m('transposeMelodie').io.s.out.connect(merge,0,17);
 const accords=[],notes=[],original=h.recevoir;
 h.recevoir=function(t,e){const f=original(t,e);if(e==='in'&&f?.includes('change'))accords.push({t,pos:h.harmonie8.pos,scene:sc.scenes8.scene,notes:[...h.harmonie8.accord.notes],root:h.harmonie8.accord.root,shift:h.harmonie8.accord.shift});return f;};
 ['seqBasse','seqMelodie'].forEach((k,j)=>{const seq=m(k),fn=seq.recevoir;seq.recevoir=function(t,e){const f=fn(t,e);if(f?.includes('gate'))notes.push({t,c:16+j,expected:(EUR_MELO32.noteJouee(seq,seq.melo32.pos+1)-33)/12+h.harmonie8.valeur('shift',t)});return f;};});
 let seed=287,old=Math.random;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 cache=true;try{for(let i=0;i<n;i++){OFF_T=start+i*dt;scheduleEur(i%16,OFF_T);purgerSources();}OFF_T=fin;arretEur();}finally{OFF_T=-1;cache=false;Math.random=old;}
 const b=await ctx.startRendering(),stats=[];
 for(let c=0;c<6;c++){const d=b.getChannelData(c);let peak=0,sum=0,bad=0;for(const x of d){if(!Number.isFinite(x)){bad++;continue;}peak=Math.max(peak,Math.abs(x));sum+=x*x;}stats.push({c,peak,rms:Math.sqrt(sum/d.length),bad});}
 const cv=[],frequences=[];
 for(const a of accords){
   const sample=Math.round((a.t+.30)*sr);for(let j=0;j<6;j++){const want=j<4?(a.notes[j]-33)/12:j===4?a.root:a.shift;cv.push({pos:a.pos,j,lu:b.getChannelData(6+j)[sample],want});}
   for(let j=0;j<4;j++){
     const d=b.getChannelData(12+j),xs=[];let prev=d[sample];
     for(let i=sample+1;i<sample+Math.round(sr*.25);i++){if(prev<=0&&d[i]>0)xs.push(i-1-prev/(d[i]-prev));prev=d[i];}
     frequences.push({pos:a.pos,j,attendue:55*2**((a.notes[j]-33)/12),mesuree:xs.length>2?sr*(xs.length-1)/(xs.at(-1)-xs[0]):0});
   }
 }
 let erreurNotes=0;for(const a of notes){const x=b.getChannelData(a.c)[Math.round((a.t+.002)*sr)];erreurNotes=Math.max(erreurNotes,Math.abs(x-a.expected));}
 return {id,sr,stats,accords,cv,frequences,erreurNotes,notes:notes.length,historique:h.harmonie8.historique(),file:h.harmonie8.dates.length};
}'''

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path);ap.add_argument('--sans-audio',action='store_true');ap.add_argument('--audio-seulement',action='store_true');a=ap.parse_args()
 total=0;erreurs=[];rendus=[]
 def v(c,msg):
  nonlocal total
  total+=1
  if not c:erreurs.append(msg);print('FAUX '+msg,flush=True)
 with sync_playwright() as p:
  opt={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
  if a.chromium:opt['executable_path']=a.chromium;opt['args'].append('--no-sandbox')
  browser=p.chromium.launch(**opt)
  def ouvrir(w,h):
   c=browser.new_context(viewport={'width':w,'height':h},has_touch=w<1000);pg=c.new_page();err=[];pg.on('pageerror',lambda e:err.append(str(e)))
   f=R/'app/src/main/assets/drm16.html'
   if a.contenu:pg.evaluate(G.STOCKAGE);pg.set_content(f.read_text(encoding='utf-8'),wait_until='domcontentloaded')
   else:pg.goto(f.as_uri(),wait_until='domcontentloaded')
   pg.wait_for_timeout(60);pg.evaluate(G.OUVRIR,'eur');return c,pg,err
  for w,h in ([] if a.audio_seulement else FORMATS):
   c,pg,err=ouvrir(w,h);tag=f'{w}x{h}';accept={'oui':False};pg.on('dialog',lambda d:d.accept() if accept['oui'] else d.dismiss())
   v(pg.evaluate('Object.keys(EUR_CAT).length===113&&new Set(EUR_ORDRE).size===113&&EUR_MONTAGES.length===56'),tag+' catalogue exact')
   for st in pg.evaluate(STRUCTURE):v(not st['erreurs'] and st['modules']==33 and st['cables']==53 and st['rangees']==33 and st['clock']==1 and st['macros']==8,tag+' structure '+str(st))
   pg.evaluate('window.avant=JSON.stringify(rackCourant());EUR.montFam="harmonie";eurMontages()');v(pg.locator('[data-famille="harmonie"]').count()==2,tag+' deux cartes HARMONIES')
   pg.locator('[data-montage="harmonie-dnb"]').click();v(pg.evaluate('JSON.stringify(rackCourant())===avant'),tag+' refus remplacement conserve rack')
   accept['oui']=True;pg.locator('[data-montage="harmonie-dnb"]').click();pg.evaluate('window.hm=EUR.mods.find(m=>m.type==="harmonie8");window.ps=JSON.stringify(hm.p);window.graphe=EUR.bus;window.cab=JSON.stringify(EUR.cables)')
   pg.locator('.hr8-mini .hr8-case').first.click();v(pg.evaluate('EUR_FOCUS.actif()===hm.id'),tag+' vrai clic ouvre Focus')
   v(pg.evaluate('JSON.stringify(hm.p)===ps&&EUR.bus===graphe&&JSON.stringify(EUR.cables)===cab'),tag+' ouverture sans modifier son ni cables')
   v(pg.locator('#eur-focus .hr8-case').count()==8 and pg.locator('#eur-focus .hr8-grand select').count()==10,tag+' huit accords dix champs')
   tailles=pg.evaluate(TAILLES);v(not tailles['bad'] and tailles['deb']<=1,tag+' cibles 44 px sans débordement '+str(tailles))
   pg.locator('#eur-focus [data-accord="7"]').click();pg.locator('#eur-focus [data-champ=root]').select_option('38');pg.locator('#eur-focus [data-champ=type]').select_option('5');pg.locator('#eur-focus [data-champ=inv]').select_option('2')
   v(pg.evaluate('hm.p.root8===38&&hm.p.type8===5&&hm.p.inv8===2'),tag+' édition accord distinct')
   pg.locator('#eur-focus [data-champ=len]').select_option('4');v(pg.evaluate('hm.p.root8===38&&hm.p.type8===5'),tag+' accords hors boucle conservés')
   v(pg.locator('#eur-focus [data-champ=bars]').is_disabled(),tag+' durée ignorée en suivi scènes')
   pg.locator('#eur-focus [data-champ=sync]').select_option('0');pg.locator('#eur-focus [data-champ=bars]').select_option('3');v(pg.evaluate('hm.p.bars8===3&&hm.p.sync===0'),tag+' durée manuelle disponible')
   pg.locator('#eur-focus [data-champ=sync]').select_option('1');pg.locator('#eur-focus [data-champ=len]').select_option('8')
   pg.evaluate('window.p1=JSON.stringify(hm.p)');accept['oui']=False;pg.locator('#eur-focus .hr8-copier').click();v(pg.evaluate('JSON.stringify(hm.p)===p1'),tag+' copie refusée intacte')
   accept['oui']=True;pg.locator('#eur-focus .hr8-copier').click();v(pg.evaluate('hm.p.root1===38&&hm.p.type1===5&&hm.p.inv1===2&&hm.p.bars1===3'),tag+' copie dernière vers première')
   pg.locator('#eur-focus .hr8-hold').click();v(pg.evaluate('hm.p.hold===1'),tag+' TENIR armé')
   pg.evaluate('memEur();window.sauve=JSON.parse(JSON.stringify(rackCourant()));poserRack(sauve);eurBatir();eurDessiner();window.hm=EUR.mods.find(m=>m.type==="harmonie8");EUR_FOCUS.ouvrir(hm.id)')
   v(pg.evaluate('hm.p.hold===1&&hm.p.root8===38&&hm.p.type8===5&&hm.p.bars8===3'),tag+' aller-retour JSON du rack')
   v(pg.evaluate('memEur();JSON.parse(projetContenu().doc.memoire[MEM+".eur"]).racks[EUR.cur].mods.some(m=>m.type==="harmonie8"&&m.p.root8===38)'),tag+' accords dans projet .drm16')
   pg.evaluate('window.depart=EUR.cur;changerRack((depart+1)%8);changerRack(depart);window.hm=EUR.mods.find(m=>m.type==="harmonie8");EUR_FOCUS.ouvrir(hm.id)')
   v(pg.evaluate('hm.p.root8===38&&hm.p.hold===1'),tag+' racks indépendants')
   pg.locator('#ef-transport').click();pg.wait_for_timeout(220);v(pg.evaluate('S.run&&hm.harmonie8.pos===0'),tag+' transport réel joue premier accord')
   pg.locator('#eur-focus [data-accord="5"]').click();v(pg.evaluate('hm.harmonie8.pos===0&&S.run'),tag+' sélection ne saute pas la lecture')
   pg.locator('#ef-transport').click();v(pg.evaluate('!S.run&&hm.harmonie8.pos===-1&&hm.harmonie8.dates.length===0'),tag+' STOP réarme et nettoie affichage')
   pg.evaluate('EUR_PERF_UI.ouvrir();EUR_PERFORMANCE.memoriser();EUR_PERFORMANCE.regler(5,1)');v(pg.evaluate('EUR.mods.some(m=>m.type==="vcf"&&m.p.cut===.55)'),tag+' macro ouvre filtre de nappe')
   pg.evaluate('EUR_PERFORMANCE.rappeler();EUR_FOCUS.ouvrir(hm.id)');v(pg.evaluate('EUR.mods[EUR_MONTAGES.find(p=>p.id==="harmonie-dnb").reperes.filtreNappe].p.cut===.25'),tag+' retour macro exact')
   pg.evaluate('window.ancienneVue=document.querySelector("#eur-focus .hr8-grand");window.ancien=hm;eurRetirer(EUR.mods.indexOf(hm))');pg.wait_for_timeout(40)
   v(pg.evaluate('EUR_FOCUS.actif()===null'),tag+' suppression ferme Focus')
   pg.evaluate('ancienneVue.querySelector(".hr8-hold").click()');v(pg.evaluate('ancien.p.hold===1'),tag+' commandes périmées inertes')
   pg.evaluate('eurMonter(EUR_MONTAGES.find(p=>p.id==="harmonie-psy"));window.hm=EUR.mods.find(m=>m.type==="harmonie8");EUR_FOCUS.ouvrir(hm.id)')
   v(pg.evaluate('EUR.mods.some(m=>m.type==="kicklab")&&EUR.mods.some(m=>m.type==="ducktrig")'),tag+' atelier présent dans Psy')
   pg.emulate_media(reduced_motion='reduce');v(pg.evaluate('getComputedStyle(document.querySelector(".hr8-case")).animationName==="none"'),tag+' pas d’animation permanente')
   if a.captures:a.captures.mkdir(parents=True,exist_ok=True);pg.screenshot(path=str(a.captures/(tag+'.png')))
   v(not err,tag+' aucune erreur JS '+str(err));print('Contrôlé '+tag,flush=True);c.close()
  if not a.sans_audio:
   for id in IDS:
    for sr in [44100,48000]:
     c,pg,err=ouvrir(1280,800);pg.set_default_timeout(90000);d=pg.evaluate(AUDIO,{'id':id,'sr':sr});rendus.append(d)
     v(all(x['bad']==0 and x['rms']>.0001 for x in d['stats']),id+' six signaux audibles et finis')
     v(all(x['peak']<1.01 for x in d['stats'][:2]),id+' sortie bornée')
     v([x['pos'] for x in d['accords']]==list(range(8))+[0],id+' huit accords puis boucle')
     v(all(x['pos']==x['scene'] for x in d['accords']),id+' progression synchronisée aux scènes')
     for x in d['cv']:v(abs(x['lu']-x['want'])<.0001,id+' CV '+str(x))
     for x in d['frequences']:v(abs(x['mesuree']-x['attendue'])<.5,id+' VCO réellement accordé '+str(x))
     v(d['notes']>100 and d['erreurNotes']<.0002,id+' vraies additions CV des deux MÉLO32')
     v(d['historique']==6 and d['file']==0,id+' historique offline borné')
     v(not err,id+' audio sans erreur JS '+str(err));print('Rendu '+id+' '+str(sr),flush=True);c.close()
  browser.close()
 report={'version':287,'verifications':total,'erreurs':erreurs,'formats':FORMATS,'rendus':rendus,'stockage_simule':a.contenu}
 if a.rapport:a.rapport.parent.mkdir(parents=True,exist_ok=True);a.rapport.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(f'HARMONIE 8 : {total} vérifications, {len(erreurs)} erreur(s).',flush=True);raise SystemExit(bool(erreurs))
if __name__=='__main__':main()
