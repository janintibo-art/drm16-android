#!/usr/bin/env python3
"""v285 — Banques A/B, édition native, FILL, mémoire et rendu des vrais montages.
--contenu : stockage temporaire pour les environnements sans navigation locale.
Aucun son ni appareil personnel. Les rendus sont hors ligne, pas une écoute.
"""
import argparse, importlib.util, json
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
def charger(n):
 s=importlib.util.spec_from_file_location(n,Path(__file__).with_name(n+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
G=charger('test-graphique');RV=charger('test-rave')
FORMATS=[(320,568),(360,640),(393,851),(640,360),(880,400),(1280,800),(1920,1080)]
AUDIO=RV.AUDIO.replace(' const journal=[],native=sc.recevoir;', ' const varEvents=[];const journal=[],native=sc.recevoir;')
AUDIO=AUDIO.replace('scheduleEur(i%16,OFF_T);purgerSources();', '''scheduleEur(i%16,OFF_T);if(i%16===0)varEvents.push({i,etats:EUR.mods.filter(EUR_VARIATIONS.compatible).map(m=>({type:m.type,fill:m._rv.fill,banque:m._rv.lecture}))});purgerSources();''')
AUDIO=AUDIO.replace('return {id,sr,stats,journal,cv,clean,hist};','return {id,sr,stats,journal,cv,clean,hist,varEvents,variations:EUR.mods.filter(EUR_VARIATIONS.compatible).map(m=>m._rv.dates.length)};')
TAILLES='''sel=>{const r=document.querySelector(sel),z=r.querySelector('.ef-zone,.ep-zone')||r;return {deb:z.scrollWidth-z.clientWidth,bad:[...r.querySelectorAll('.rv-panel button,.rv-panel select,.rv-panel input,.rv-panel summary,.rv-live button,.rv-live summary')].filter(e=>e.getClientRects().length).map(e=>({t:e.textContent.slice(0,25),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(x=>x.w<43.9||x.h<43.9)}}'''
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path);ap.add_argument('--sans-audio',action='store_true');a=ap.parse_args()
 total=0;err=[];rendus=[]
 def v(c,m):
  nonlocal total
  total+=1
  if not c:err.append(m);print('FAUX '+m,flush=True)
 with sync_playwright() as p:
  opt={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
  if a.chromium:opt['executable_path']=a.chromium;opt['args'].append('--no-sandbox')
  b=p.chromium.launch(**opt)
  def ouvrir(w,h):
   c=b.new_context(viewport={'width':w,'height':h},has_touch=w<1000);pg=c.new_page();pg.set_default_timeout(8000);er=[];pg.on('pageerror',lambda e:er.append(str(e)))
   f=R/'app/src/main/assets/drm16.html'
   if a.contenu:pg.evaluate(G.STOCKAGE);pg.set_content(f.read_text(encoding='utf-8'),wait_until='domcontentloaded')
   else:pg.goto(f.as_uri(),wait_until='domcontentloaded')
   pg.evaluate(G.OUVRIR,'eur');return c,pg,er
  for w,h in FORMATS:
   c,pg,er=ouvrir(w,h);tag=f'{w}x{h}';accord={'oui':True};pg.on('dialog',lambda d:d.accept() if accord['oui'] else d.dismiss())
   v(pg.evaluate('EUR_MONTAGES.length===74&&Object.keys(EUR_CAT).length===123'),tag+' catalogue')
   pg.evaluate('eurMonter(EUR_MONTAGES.find(p=>p.id==="var-jungle"));window.dm=EUR.mods.find(m=>m.type==="drum32");window.br=EUR.mods.find(m=>m.type==="break32");window.V=EUR_VARIATIONS;window.baseA=JSON.stringify(dm.p);window.busAvant=EUR.bus;window.cablesAvant=JSON.stringify(EUR.cables);EUR_FOCUS.ouvrir(dm.id)')
   v(pg.evaluate('!S.run&&!!dm.variation&&!!br.variation'),tag+' deux variantes chargées sans autoplay')
   pg.locator('.dr32-editeur .rv-editer-b').click();pg.select_option('.dr32-editeur [data-champ=outil]','4');pg.locator('.dr32-editeur .dr32-pas[data-pas="1"]').click()
   v(pg.evaluate('dm.variation.b.a1===4&&JSON.stringify(dm.p)===baseA&&dm._rv.lecture===0'),tag+' B éditée sans altérer A ni la lecture')
   pg.locator('.dr32-editeur .rv-editer-a').click();v(pg.locator('.dr32-editeur .dr32-pas[data-pas="1"] .dr32-coups').inner_text()=='●',tag+' retour visuel à A')
   pg.locator('.dr32-editeur .rv-editer-b').click();pg.locator('.dr32-editeur .rv-outils summary').click()
   accord['oui']=False;pg.locator('.dr32-editeur .rv-copier').click();v(pg.evaluate('dm.variation.b.a1===4'),tag+' copie refusée conserve B')
   accord['oui']=True;pg.locator('.dr32-editeur .rv-copier').click();v(pg.evaluate('dm.variation.b.a1===dm.p.a1'),tag+' copie acceptée crée une B indépendante')
   pg.locator('.dr32-editeur .rv-generer').click();v(pg.evaluate('JSON.stringify(dm.p)===baseA&&[...Array(32)].every((_,i)=>dm.variation.b["a"+(i+1)]===dm.p["a"+(i+1)]&&dm.variation.b["b"+(i+1)]===dm.p["b"+(i+1)])'),tag+' génération protège A et les pistes verrouillées')
   pg.select_option('.dr32-editeur .rv-auto select','0');v(pg.evaluate('dm.variation.periode===0'),tag+' fill automatique désactivable')
   sizes=pg.evaluate(TAILLES,'#eur-focus');v(sizes['deb']<=1 and not sizes['bad'],tag+' Focus sans débordement, cibles 44 '+str(sizes))
   if a.captures:
    a.captures.mkdir(parents=True,exist_ok=True);pg.screenshot(path=str(a.captures/(tag+'-drum.png')))
   v(pg.evaluate('EUR.bus===busAvant&&JSON.stringify(EUR.cables)===cablesAvant'),tag+' éditions sans reconstruction audio')
   pg.evaluate('EUR_FOCUS.ouvrir(br.id);window.breakA=JSON.stringify(br.p)')
   pg.locator('.br32-editeur .rv-editer-b').click();pg.locator('.br32-editeur [data-page="1"]').click();pg.locator('.br32-editeur [data-pas="23"]').click()
   for k,val in [('n','13'),('r','4'),('v','1'),('p','37')]:pg.select_option('.br32-editeur [data-champ="'+k+'"]',val)
   v(pg.evaluate('br.variation.b.n23===13&&br.variation.b.r23===4&&br.variation.b.v23===1&&br.variation.b.p23===37&&JSON.stringify(br.p)===breakA'),tag+' tranche, répétition, inversion et probabilité propres à B')
   pg.select_option('.br32-editeur [data-champ=len]','8');v(pg.evaluate('br.p.len===8&&br.variation.b.n23===13'),tag+' longueur commune, pas éloignés conservés')
   pg.select_option('.br32-editeur [data-champ=len]','32')
   pg.locator('.br32-editeur .rv-editer-a').click();v(pg.locator('.br32-editeur [data-champ=n]').input_value()==str(pg.evaluate('br.p.n23')),tag+' édition A retrouvée')
   pg.evaluate('memEur();window.sauve=JSON.parse(JSON.stringify(rackCourant()));poserRack(sauve);eurBatir();eurDessiner();window.dm=EUR.mods.find(m=>m.type==="drum32");window.br=EUR.mods.find(m=>m.type==="break32");')
   v(pg.evaluate('br.variation.b.n23===13&&dm.variation.periode===0&&br.variation!==sauve.mods.find(m=>m.type==="break32").variation'),tag+' sauvegarde et rechargement sans alias')
   v(pg.evaluate('memEur();JSON.parse(projetContenu().doc.memoire[MEM+".eur"]).racks[EUR.cur].mods.find(m=>m.type==="break32").variation.b.n23===13'),tag+' variation incluse dans le projet .drm16')
   pg.evaluate('window.rackDepart=EUR.cur;changerRack((EUR.cur+1)%8);changerRack(rackDepart);window.dm=EUR.mods.find(m=>m.type==="drum32");window.br=EUR.mods.find(m=>m.type==="break32");')
   v(pg.evaluate('br.variation.b.n23===13&&dm.variation.periode===0'),tag+' aller-retour entre emplacements conserve les variantes')
   pg.evaluate('V.periode(br,0);EUR_PERF_UI.ouvrir();S.bpm=320;')
   pg.wait_for_timeout(80);v(pg.locator('.rv-live-ligne').count()==2,tag+' deux séquenceurs dans PERFORMANCE')
   v(pg.locator('.rv-fill-tous').is_disabled(),tag+' aucun fill déclenchable à l’arrêt')
   sizes=pg.evaluate(TAILLES,'#eur-performance');v(sizes['deb']<=1 and not sizes['bad'],tag+' PERFORMANCE sans débordement')
   pg.locator('#ep-play').click();pg.wait_for_function('dm._rv.pas>0&&br._rv.pas>0')
   pg.locator('.rv-fill-tous').click();pg.wait_for_function('dm._rv.fill&&br._rv.fill',timeout=6000)
   v(pg.evaluate('dm._rv.lecture===1&&br._rv.lecture===1'),tag+' FILL TOUS appliqué aux deux vrais séquenceurs')
   pg.wait_for_function('!dm._rv.fill&&!br._rv.fill&&dm._rv.pas>=32',timeout=6000)
   v(pg.evaluate('dm._rv.lecture===0&&br._rv.lecture===0'),tag+' retour automatique à A')
   pg.locator('#ep-play').click();v(pg.evaluate('!S.run&&!dm._rv.demandeFill&&!br._rv.demandeFill'),tag+' STOP nettoie les fills')
   pg.locator('.rv-live .rv-outils summary').click();pg.locator('.rv-live-b').first.click();v(pg.evaluate('dm.variation.initial===1&&dm._rv.lecture===1'),tag+' choix du prochain départ depuis PERFORMANCE')
   pg.locator('.rv-live-a').first.click()
   pg.locator('.rv-live-editer').first.click();v(pg.evaluate('EUR_FOCUS.actif()===dm.id&&!EUR_PERF_UI.actif()&&!document.getElementById("eur-focus").hasAttribute("inert")'),tag+' aller vers FOCUS sans fond inerte parasite')
   pg.evaluate('stop();EUR_FOCUS.fermer(false);eurMonter(EUR_MONTAGES.find(p=>p.id==="perf-jungle"));EUR_FOCUS.ouvrir(EUR.mods.find(m=>m.type==="drum32").id)')
   v(pg.locator('.dr32-editeur .rv-editer-b').is_disabled(),tag+' ancien montage reste sans B')
   v(pg.evaluate('EUR.mods.filter(V.compatible).every(m=>!m.variation)'),tag+' pas de migration destructive au simple affichage')
   pg.locator('.dr32-editeur .rv-outils summary').click();pg.locator('.dr32-editeur .rv-generer').click()
   v(pg.evaluate('!!EUR.mods.find(m=>m.type==="drum32").variation'),tag+' génération disponible aussi sur un ancien rack')
   pg.emulate_media(reduced_motion='reduce');pg.evaluate('EUR_PERF_UI.ouvrir()');pg.wait_for_timeout(40)
   v(not er,tag+' aucune erreur JS '+str(er));print('Contrôlé : '+tag,flush=True);c.close()
  if not a.sans_audio:
   for id in ['var-jungle','var-breakcore']:
    for sr in [44100,48000]:
     c,pg,er=ouvrir(1280,800);pg.set_default_timeout(90000);d=pg.evaluate(AUDIO,{'id':id,'sr':sr});rendus.append(d)
     v(len(d['varEvents'])==13,id+' treize mesures programmées')
     for e in d['varEvents']:
      expected=(e['i']//16+1)%4==0
      v(bool(e['etats']) and all(s['fill']==expected and s['banque']==int(expected) for s in e['etats']),id+' fill mesure '+str(e['i']//16+1))
     v(all(s['bad']==0 and s['rms']>0 for s in d['stats']),id+' sortie et toutes les voix finies et actives')
     v(all(s['peak']<=1.01 for s in d['stats'][:2]),id+' sortie bornée')
     v(all(e['ok'] for e in d['cv']),id+' scènes et niveaux conservés')
     v(all(x==0 for x in d['variations']),id+' pas d’historique hors ligne')
     v(not er,id+' rendu sans erreur JS '+str(er));c.close();print('Rendu : '+id+' '+str(sr),flush=True)
  b.close()
 rapport={'verifications':total,'erreurs':err,'rendus':rendus,'formats':FORMATS}
 if a.rapport:a.rapport.parent.mkdir(parents=True,exist_ok=True);a.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2),encoding='utf-8')
 print(f'{total} vérifications ; {len(err)} erreur(s).');raise SystemExit(bool(err))
if __name__=='__main__':main()
