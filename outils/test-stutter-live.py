#!/usr/bin/env python3
"""v288 : vrais signaux stéréo, capture/relâchement, interface et sauvegardes.
Les signaux utilisent les vrais nœuds Web Audio (aucun AudioWorklet simulé).
--contenu utilise seulement un stockage local temporaire simulé.
"""
import argparse, importlib.util, json
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
def charger(n):
 s=importlib.util.spec_from_file_location(n,Path(__file__).with_name(n+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
G=charger('test-graphique');RV=charger('test-rave')
FORMATS=[(320,568),(360,640),(393,851),(640,360),(880,400),(1280,800),(1920,1080)]
IDS=['stutter-jungle','stutter-breakcore']
STRUCTURE=RV.STRUCTURE.replace('p.fam===\'rave\'', 'p.fam===\'capture\'')
TAILLES='''()=>{const z=document.querySelector('#eur-focus .ef-zone');return {deb:z.scrollWidth-z.clientWidth,bad:[...z.querySelectorAll('button,input,select')].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9;}).map(e=>e.outerHTML.slice(0,100))};}'''
SIGNAL=r'''async ({sr,div,mix,kind,offset})=>{
 stop();if(ctx&&ctx.close&&!ctx.startRendering)await ctx.close();ctx=new OfflineAudioContext(2,sr*3,sr);S.bpm=120;
 const m={type:'stutterlive',p:{div,span:8,mix,auto:0,edge:1}},f=48000+offset,at=f/sr;
 m.io=EUR_CAT.stutterlive.creer(m);m.io.s.out.connect(ctx.destination);
 const buf=ctx.createBuffer(2,sr*3,sr);for(let i=0;i<buf.length;i++){
  buf.getChannelData(0)[i]=kind==='silence'?0:.27*Math.sin(i*.017)+.13*Math.sin(i*.083)+.03*i/buf.length;
  buf.getChannelData(1)[i]=kind==='silence'?0:-.19*Math.sin(i*.011)+.09*Math.cos(i*.043)-.1;
 }
 const source=ctx.createBufferSource();source.buffer=buf;source.connect(m.io.e.in);source.start();
 const n=Math.round(m.stutter.statut(0).longueur*sr),held=kind==='hold',until=held?at+.43:at+1;
 const captured=m.stutter.capturer(at,held);if(held)m.stutter.relacher(until,false);
 if(kind==='stop'){OFF_T=at+.4;m.arreter();OFF_T=-1;}
 if(kind==='future'){OFF_T=at-.05;m.arreter();OFF_T=-1;}
 const end=kind==='stop'?at+.4:kind==='future'?at:until;
 const out=await ctx.startRendering();let error=0,direct=0,peak=0,bad=0,samples=0,changing=0;
 for(let i=0;i<out.length;i++)for(let c=0;c<2;c++){
  const y=out.getChannelData(c)[i],x=buf.getChannelData(c)[i],t=i/sr;if(!Number.isFinite(y))bad++;peak=Math.max(peak,Math.abs(y));
  if(t<at-.001||t>end+.007||kind==='future'||mix===0)direct=Math.max(direct,Math.abs(x-y));
  const phase=(i-f)%n;
  if(kind!=='future'&&t>at+.007&&t<end-.003&&phase>sr*.006&&phase<n-sr*.006){
   const ref=buf.getChannelData(c)[f-n+phase],want=(1-mix)*x+mix*ref;
   error=Math.max(error,Math.abs(y-want));changing=Math.max(changing,Math.abs(y-x));samples++;
  }
 }
 return {sr,div,mix,kind,offset,captured,error,direct,peak,bad,samples,changing,n};
}'''
RECYCLE=r'''async ({sr})=>{
 stop();if(ctx&&ctx.close&&!ctx.startRendering)await ctx.close();ctx=new OfflineAudioContext(1,sr*3,sr);S.bpm=120;
 const m={type:'stutterlive',p:{div:2,span:2,mix:1,auto:0,edge:1}};m.io=EUR_CAT.stutterlive.creer(m);m.io.s.out.connect(ctx.destination);
 const o=ctx.createBufferSource(),b=ctx.createBuffer(1,sr*3,sr),x=b.getChannelData(0);for(let i=0;i<x.length;i++)x[i]=i/sr<1?.2:-.6;o.buffer=b;o.connect(m.io.e.in);o.start();
 const first=m.stutter.capturer(.5,false),rejected=m.stutter.capturer(.78,false),second=m.stutter.capturer(1.5,false),out=await ctx.startRendering();
 let error=0;const y=out.getChannelData(0);for(let i=Math.ceil(sr*1.51);i<sr*1.74;i++){const ph=(i-Math.round(1.5*sr))%Math.round(.125*sr);if(ph>sr*.006&&ph<sr*.119)error=Math.max(error,Math.abs(y[i]+.6));}
 return {sr,first,rejected,second,error};
}'''
AUDIO=RV.AUDIO.replace("const journal=[],native=sc.recevoir;", "const st=m('stutter');const journal=[],native=sc.recevoir;")
AUDIO=AUDIO.replace('return {id,sr,stats,journal,cv,clean,hist};','return {id,sr,stats,journal,cv,clean,hist,stutter:st.stutter.statut(fin+1),captures:st.stutter.historique()};')

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path);ap.add_argument('--sans-audio',action='store_true');ap.add_argument('--audio-seulement',action='store_true');a=ap.parse_args()
 total=0;erreurs=[];signaux=[];rendus=[]
 def v(c,msg):
  nonlocal total
  total+=1
  if not c:erreurs.append(msg);print('FAUX '+msg,flush=True)
 with sync_playwright() as p:
  opt={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
  if a.chromium:opt['executable_path']=a.chromium;opt['args'].append('--no-sandbox')
  browser=p.chromium.launch(**opt)
  def ouvrir(w,h):
   c=browser.new_context(viewport={'width':w,'height':h},has_touch=w<1000);pg=c.new_page();err=[];pg.on('pageerror',lambda e:err.append(str(e)));f=R/'app/src/main/assets/drm16.html'
   if a.contenu:pg.evaluate(G.STOCKAGE);pg.set_content(f.read_text(encoding='utf-8'),wait_until='domcontentloaded')
   else:pg.goto(f.as_uri(),wait_until='domcontentloaded')
   pg.wait_for_timeout(80);pg.evaluate(G.OUVRIR,'eur');return c,pg,err
  for w,h in ([] if a.audio_seulement else FORMATS):
   c,pg,err=ouvrir(w,h);tag=f'{w}x{h}';accept={'oui':False};pg.on('dialog',lambda d:d.accept() if accept['oui'] else d.dismiss())
   v(pg.evaluate('Object.keys(EUR_CAT).length===117&&new Set(EUR_ORDRE).size===117&&EUR_MONTAGES.length===63'),tag+' catalogue exact')
   for s in pg.evaluate(STRUCTURE):v(not s['erreurs'] and s['modules']==26 and s['cables']==41 and s['horloges']==1 and s['rangees'],tag+' structure '+str(s))
   pg.evaluate('window.before=JSON.stringify(rackCourant());EUR.montFam="capture";eurMontages()');v(pg.locator('[data-famille="capture"]').count()==2,tag+' deux cartes CAPTURE LIVE')
   pg.locator('[data-montage="stutter-jungle"]').click();v(pg.evaluate('JSON.stringify(rackCourant())===before'),tag+' refus remplacement conservé');accept['oui']=True;pg.locator('[data-montage="stutter-jungle"]').click()
   pg.evaluate('window.st=EUR.mods.find(m=>m.type==="stutterlive");window.param=JSON.stringify(st.p);window.graph=EUR.bus;window.cables=JSON.stringify(EUR.cables)')
   pg.locator('.stl-mini .stl-ouvrir').click();v(pg.evaluate('EUR_FOCUS.actif()===st.id'),tag+' clic miniature ouvre Focus')
   v(pg.evaluate('EUR.bus===graph&&JSON.stringify(st.p)===param&&JSON.stringify(EUR.cables)===cables'),tag+' Focus ne modifie pas le graphe')
   v(pg.locator('#eur-focus .stl-grand select').count()==4 and pg.locator('#eur-focus .stl-dose input').count()==1,tag+' quatre choix et dose')
   s=pg.evaluate(TAILLES);v(s['deb']<=1 and not s['bad'],tag+' cibles 44 et pas de débordement '+str(s))
   pg.locator('#eur-focus [data-param="div"]').select_option('3');pg.locator('#eur-focus [data-param="span"]').select_option('7');pg.locator('#eur-focus [data-param="auto"]').select_option('0');pg.locator('#eur-focus [data-param="edge"]').select_option('3')
   pg.locator('#eur-focus [data-param="mix"]').fill('0.6');pg.locator('#eur-focus [data-param="mix"]').dispatch_event('input')
   v(pg.evaluate('st.p.div===3&&st.p.span===7&&st.p.auto===0&&st.p.edge===3&&st.p.mix===.6'),tag+' réglages écrits sur bon module')
   pg.evaluate('memEur();window.sauve=JSON.parse(JSON.stringify(rackCourant()));poserRack(sauve);eurBatir();eurDessiner();window.st=EUR.mods.find(m=>m.type==="stutterlive");EUR_FOCUS.ouvrir(st.id)')
   v(pg.evaluate('st.p.div===3&&st.p.span===7&&st.p.auto===0&&st.p.edge===3&&st.p.mix===.6&&st.stutter.historique().length===0'),tag+' paramètres restaurés sans capture')
   v(pg.evaluate('memEur();JSON.parse(projetContenu().doc.memoire[MEM+".eur"]).racks[EUR.cur].mods.some(m=>m.type==="stutterlive"&&m.p.span===7)'),tag+' paramètres dans projet .drm16')
   pg.locator('#ef-transport').click();pg.wait_for_timeout(150);pg.locator('#eur-focus .stl-repeat').click();v(pg.evaluate('S.run&&st.stutter.statut(maintenantAudio()).actif'),tag+' répétition pendant la vraie lecture')
   pg.locator('#eur-focus .stl-release').click();v(pg.evaluate('S.run&&!st.stutter.statut(maintenantAudio()).actif&&st.p.auto===0'),tag+' libérer ne coupe pas transport')
   pg.wait_for_timeout(150)
   # Real mouse events and capture: release outside the button.
   hold=pg.locator('#eur-focus .stl-hold');hold.scroll_into_view_if_needed();box=hold.bounding_box();pg.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);pg.mouse.down()
   v(pg.evaluate('st.stutter.statut(maintenantAudio()).tenu'),tag+' appui souris tient le fragment')
   pg.mouse.move(3,3);pg.mouse.up();v(pg.evaluate('!st.stutter.statut(maintenantAudio()).actif&&S.run'),tag+' sortie du bouton puis relâchement sûr')
   pg.wait_for_timeout(150);hold.focus();pg.keyboard.down('Space');v(pg.evaluate('st.stutter.statut(maintenantAudio()).tenu'),tag+' maintien clavier');pg.keyboard.up('Space');v(pg.evaluate('!st.stutter.statut(maintenantAudio()).actif&&S.run'),tag+' relâchement clavier sans stop')
   pg.wait_for_timeout(150);hold.dispatch_event('pointerdown',{'button':0,'pointerId':77,'pointerType':'touch'});v(pg.evaluate('st.stutter.statut(maintenantAudio()).tenu'),tag+' geste tactile démarre')
   hold.dispatch_event('pointercancel',{'pointerId':77,'pointerType':'touch'});v(pg.evaluate('!st.stutter.statut(maintenantAudio()).actif'),tag+' annulation tactile libère')
   pg.wait_for_timeout(150);hold.dispatch_event('pointerdown',{'button':0,'pointerId':78,'pointerType':'touch'});pg.evaluate('EUR_FOCUS.fermer(false)');v(pg.evaluate('!st.stutter.statut(maintenantAudio()).actif&&S.run'),tag+' quitter Focus libère TENIR')
   pg.evaluate('EUR_FOCUS.ouvrir(st.id)');pg.wait_for_timeout(150);pg.locator('#eur-focus .stl-hold').dispatch_event('pointerdown',{'button':0,'pointerId':79,'pointerType':'touch'});pg.evaluate('window.dispatchEvent(new Event("blur"))');v(pg.evaluate('!st.stutter.statut(maintenantAudio()).actif'),tag+' perte de focus fenêtre libère')
   pg.wait_for_timeout(150);pg.locator('#eur-focus .stl-hold').dispatch_event('pointerdown',{'button':0,'pointerId':80,'pointerType':'touch'});pg.evaluate('stop()');v(pg.evaluate('!S.run&&!st.stutter.statut(maintenantAudio()).actif&&st.stutter.statut(maintenantAudio()).pas===-1'),tag+' STOP réarme compteur et boucle')
   pg.locator('#eur-focus .stl-hold').dispatch_event('pointercancel',{'pointerId':80})
   pg.evaluate('EUR_PERF_UI.ouvrir();EUR_PERFORMANCE.memoriser();EUR_PERFORMANCE.regler(7,.25)');v(pg.evaluate('st.p.mix===.25'),tag+' macro DOSE STUTTER agit sur vrai paramètre')
   pg.evaluate('EUR_PERFORMANCE.rappeler();EUR_FOCUS.ouvrir(st.id)');v(pg.evaluate('st.p.mix===.6'),tag+' retour macro exact')
   if a.captures:a.captures.mkdir(parents=True,exist_ok=True);pg.screenshot(path=str(a.captures/(tag+'.png')))
   pg.evaluate('window.ancienneVue=document.querySelector("#eur-focus .stl-grand");window.ancien=st.stutter;eurRetirer(EUR.mods.indexOf(st))');v(pg.evaluate('EUR_FOCUS.actif()===null&&ancien.statut(maintenantAudio()).ferme&&ancien.sources()===0'),tag+' suppression détruit le feedback et ferme Focus')
   pg.evaluate('ancienneVue.querySelector(".stl-repeat").click()');v(pg.evaluate('ancien.historique().length===0'),tag+' ancien bouton sans effet')
   v(not err,tag+' aucune erreur JavaScript '+str(err));print('Contrôlé '+tag,flush=True);c.close()
  if not a.sans_audio:
   c,pg,err=ouvrir(1280,800);pg.set_default_timeout(90000)
   for sr in [44100,48000,96000]:
    for div in range(5):
     for offset in [0,37]:
      d=pg.evaluate(SIGNAL,{'sr':sr,'div':div,'mix':1,'kind':'normal','offset':offset});signaux.append(d)
      v(d['captured'] and d['samples']>50 and d['error']<.00002 and d['direct']<.000002 and d['bad']==0,'capture PCM alignée '+str(d))
    for kind,mix in [('normal',0),('normal',.6),('hold',1),('stop',1),('future',1),('silence',1)]:
     d=pg.evaluate(SIGNAL,{'sr':sr,'div':2,'mix':mix,'kind':kind,'offset':17});signaux.append(d)
     v(d['captured'] and d['error']<.00002 and d['direct']<.000002 and d['bad']==0 and d['peak']<=.5,'état signal '+str(d))
    d=pg.evaluate(RECYCLE,{'sr':sr});signaux.append(d);v(d['first'] and not d['rejected'] and d['second'] and d['error']<.000002,'nouveau son après réarmement '+str(d))
   v(not err,'signaux sans erreur JavaScript '+str(err));c.close()
   for id in IDS:
    for sr in [44100,48000]:
     c,pg,err=ouvrir(1280,800);pg.set_default_timeout(90000);d=pg.evaluate(AUDIO,{'id':id,'sr':sr});rendus.append(d)
     v(all(x['bad']==0 and x['rms']>.00001 for x in d['stats']),id+' sept signaux actifs et finis')
     v(all(x['peak']<1.01 for x in d['stats'][:2]),id+' sortie bornée')
     v(d['stutter']['captures']==3 and not d['stutter']['actif'],id+' trois captures et STOP')
     v(all(x['ok'] for x in d['cv']),id+' niveaux de scène intacts')
     v(all(x['peak']<.0001 for x in d['clean']),id+' basse arrêtée')
     v(not err,id+' rendu sans erreur JavaScript '+str(err));print('Rendu '+id+' '+str(sr),flush=True);c.close()
  browser.close()
 report={'version':288,'verifications':total,'erreurs':erreurs,'formats':FORMATS,'signaux':signaux,'rendus':rendus,'stockage_simule':a.contenu}
 if a.rapport:a.rapport.parent.mkdir(parents=True,exist_ok=True);a.rapport.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(f'STUTTER LIVE : {total} vérifications, {len(erreurs)} erreur(s).',flush=True);raise SystemExit(bool(erreurs))
if __name__=='__main__':main()
