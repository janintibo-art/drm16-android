#!/usr/bin/env python3
"""v286 : interface tactile/souris, sauvegardes et vrais signaux hors ligne.
--contenu utilise une page en mémoire et un stockage temporaire simulé.
Aucune simulation des nœuds Web Audio dans les tests de signal.
"""
import argparse, importlib.util, json
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
def charger(n):
 s=importlib.util.spec_from_file_location(n,Path(__file__).with_name(n+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
G=charger('test-graphique');RAVE=charger('test-rave')
FORMATS=[(320,568),(360,640),(393,851),(640,360),(880,400),(1280,800),(1920,1080)]
TAILLES='''()=>{const z=document.querySelector('#eur-focus .ef-zone');return {deb:z.scrollWidth-z.clientWidth,bad:[...z.querySelectorAll('button,input,select')].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9;}).map(e=>e.outerHTML.slice(0,100))};}'''
STRUCTURE='''()=>EUR_MONTAGES.filter(p=>['atelier-psy','atelier-gabber'].includes(p.id)).map(p=>{
 const erreurs=[],prises=new Set();p.cables.forEach(([a,o,b,i])=>{if(!EUR_CAT[p.mods[a]?.[0]]?.jacks.some(j=>j[0]===o&&j[2]===1)||!EUR_CAT[p.mods[b]?.[0]]?.jacks.some(j=>j[0]===i&&j[2]===0))erreurs.push('prise');if(prises.has(b+':'+i))erreurs.push('entrée double');prises.add(b+':'+i);});
 const d=p.performance.commandes;d.forEach(c=>c.cibles.forEach(t=>{if(p.mods[t.index]?.[0]!==t.type||!EUR_PERFORMANCE.parametres({type:t.type}).some(k=>k[0]===t.param))erreurs.push('macro');}));
 return {id:p.id,erreurs,modules:p.mods.length,cables:p.cables.length,macros:d.length,rangees:p.rangees.length,clock:p.mods.filter(m=>m[0]==='clock').length};})'''
DUCK=r'''async ({sr,fallback})=>{
 stop();if(ctx&&ctx.close&&!ctx.startRendering)await ctx.close();ctx=new OfflineAudioContext(3,Math.ceil(sr*.65),sr);
 const m={type:'ducktrig',p:{depth:20,attack:5,hold:30,release:160,shape:1.7}},orig=AudioParam.prototype.cancelAndHoldAtTime;
 if(fallback)AudioParam.prototype.cancelAndHoldAtTime=undefined;
 try{
 m.io=EUR_CAT.ducktrig.creer(m);
 const l=eurConst(.25),r=eurConst(-.6),st=ctx.createChannelMerger(2),split=ctx.createChannelSplitter(2),all=ctx.createChannelMerger(3);
 l.connect(st,0,0);r.connect(st,0,1);st.connect(m.io.e.in);m.io.s.out.connect(split);split.connect(all,0,0);split.connect(all,1,1);m.io.s.env.connect(all,0,2);all.connect(ctx.destination);
 const history=[];function expected(t){for(let i=history.length-1;i>=0;i--)if(history[i].t<=t)return EUR_KICKBASS.lirePoints(history[i].pts,t-history[i].t);return 1;}
 for(const t of [.1,.18,.28]){const pts=EUR_KICKBASS.profilDuck(m.p,expected(t)).points;history.push({t,pts});m.recevoir(t,'trig');}
 const v=expected(.21);while(history.length&&history.at(-1).t>=.21)history.pop();history.push({t:.21,pts:[[0,v],[.003,1]]});OFF_T=.21;try{m.arreter();}finally{OFF_T=-1;}
 const b=await ctx.startRendering(),stats={maxSignal:0,maxEnv:0,maxStereo:0,restored:0};
 for(let i=0;i<b.length;i++){const t=i/sr,g=expected(t),a=b.getChannelData(0)[i],c=b.getChannelData(1)[i],env=b.getChannelData(2)[i];stats.maxSignal=Math.max(stats.maxSignal,Math.abs(a-.25*g),Math.abs(c+.6*g));stats.maxEnv=Math.max(stats.maxEnv,Math.abs(env-g));stats.maxStereo=Math.max(stats.maxStereo,Math.abs(a/.25-c/-.6));if(t>.215)stats.restored=Math.max(stats.restored,Math.abs(env-1));}
 return {sr,fallback,...stats};
 }finally{if(fallback)AudioParam.prototype.cancelAndHoldAtTime=orig;}
}'''
KICK=r'''async ({sr,cv})=>{
 stop();if(ctx&&ctx.close&&!ctx.startRendering)await ctx.close();ctx=new OfflineAudioContext(1,sr,sr);
 const m={type:'kicklab',p:{tune:55,dec:800,sweep:0,knee:0,fall:2,settle:2,drive:0,tone:1,click:0,clickdec:1,niv:.5}};m.io=EUR_CAT.kicklab.creer(m);m.io.s.out.connect(ctx.destination);const trans=eurConst(cv);trans.connect(m.io.e.voct);m.recevoir(.05,'trig');
 const b=await ctx.startRendering(),d=b.getChannelData(0),z=[];let peak=0,bad=0;
 for(let i=0;i<d.length;i++){if(!Number.isFinite(d[i]))bad++;peak=Math.max(peak,Math.abs(d[i]));if(i>sr*.15&&i<sr*.5&&d[i-1]<=0&&d[i]>0)z.push((i-d[i]/(d[i]-d[i-1]))/sr);}
 return {sr,cv,f:z.length>1?(z.length-1)/(z.at(-1)-z[0]):0,peak,bad};
}'''
SILENCE=r'''async ({sr})=>{
 stop();if(ctx&&ctx.close&&!ctx.startRendering)await ctx.close();ctx=new OfflineAudioContext(1,sr,sr);
 const m={type:'kicklab',p:{click:1,clickdec:25,dec:900,niv:.8}};m.io=EUR_CAT.kicklab.creer(m);m.io.s.out.connect(ctx.destination);
 m.recevoir(.1,'trig');m.recevoir(.4,'trig');OFF_T=.3;try{m.arreter();}finally{OFF_T=-1;}
 const b=await ctx.startRendering(),d=b.getChannelData(0);let silence=0,peak=0;for(let i=0;i<d.length;i++){peak=Math.max(peak,Math.abs(d[i]));if(i>sr*.31)silence=Math.max(silence,Math.abs(d[i]));}return {sr,silence,peak};
}'''
# RAVE's real audio harness covers stereo output, 5 stems and scene CV.
AUDIO=RAVE.AUDIO.replace("const journal=[],native=sc.recevoir;", "const notesKick=[];if(p.reperes.seqKick!==undefined){const s=m('seqKick'),fn=s.recevoir;s.recevoir=function(t,e){const f=fn(t,e);if(f&&f.includes('gate'))notesKick.push(EUR_MELO32.noteJouee(s,s.melo32.pos+1));return f;};}const journal=[],native=sc.recevoir;")
AUDIO=AUDIO.replace('return {id,sr,stats,journal,cv,clean,hist};','return {id,sr,stats,journal,cv,clean,hist,notesKick};')

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path);ap.add_argument('--sans-audio',action='store_true');ap.add_argument('--audio-seulement',action='store_true');a=ap.parse_args()
 total=0;erreurs=[];rendus=[];signaux=[]
 def v(ok,msg):
  nonlocal total
  total+=1
  if not ok:erreurs.append(msg);print('FAUX '+msg,flush=True)
 with sync_playwright() as p:
  opt={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
  if a.chromium:opt['executable_path']=a.chromium;opt['args'].append('--no-sandbox')
  browser=p.chromium.launch(**opt)
  def ouvrir(w,h):
   c=browser.new_context(viewport={'width':w,'height':h},has_touch=w<1000);pg=c.new_page();err=[];pg.on('pageerror',lambda e:err.append(str(e)))
   f=R/'app/src/main/assets/drm16.html'
   if a.contenu:pg.evaluate(G.STOCKAGE);pg.set_content(f.read_text(encoding='utf-8'),wait_until='domcontentloaded')
   else:pg.goto(f.as_uri(),wait_until='domcontentloaded')
   pg.wait_for_timeout(50);pg.evaluate(G.OUVRIR,'eur');return c,pg,err
  for w,h in ([] if a.audio_seulement else FORMATS):
   c,pg,err=ouvrir(w,h);tag=f'{w}x{h}';accepter={'oui':True};pg.on('dialog',lambda d:d.accept() if accepter['oui'] else d.dismiss())
   v(pg.evaluate('Object.keys(EUR_CAT).length===117&&new Set(EUR_ORDRE).size===117&&EUR_MONTAGES.length===63'),tag+' catalogue exact')
   for s in pg.evaluate(STRUCTURE):v(not s['erreurs'] and s['clock']==1 and s['macros']==8 and s['modules']==s['rangees'],tag+' câblage et affectations '+str(s))
   pg.evaluate('EUR.montFam="performance";eurMontages()');pg.locator('[data-montage="atelier-psy"]').click()
   pg.evaluate('window.k=EUR.mods.find(m=>m.type==="kicklab");window.d=EUR.mods.find(m=>m.type==="ducktrig");window.sonAvant=JSON.stringify(k.p);window.busAvant=EUR.bus;window.cablesAvant=JSON.stringify(EUR.cables)')
   pg.locator('.kb-kick .kb-ouvrir').click();v(pg.evaluate('EUR_FOCUS.actif()===k.id'),tag+' clic réel sur courbe ouvre atelier')
   v(pg.evaluate('JSON.stringify(k.p)===sonAvant&&EUR.bus===busAvant&&JSON.stringify(EUR.cables)===cablesAvant'),tag+' ouverture sans changer le son ou graphe')
   for type in ['kicklab','ducktrig']:
    pg.evaluate('type=>EUR_FOCUS.ouvrir(EUR.mods.find(m=>m.type===type).id)',type)
    v(pg.locator('#eur-focus .kb-range').count()==(11 if type=='kicklab' else 5),tag+' paramètres '+type)
    size=pg.evaluate(TAILLES);v(size['deb']<=1 and not size['bad'],tag+' cibles 44 px sans débordement '+type+' '+str(size))
   pg.evaluate('EUR_FOCUS.ouvrir(k.id)');champ=pg.locator('#eur-focus [data-nombre=tune]');champ.fill('62,5');champ.press('Tab');v(pg.evaluate('k.p.tune===62.5'),tag+' saisie virgule')
   champ.fill('pas un nombre');champ.press('Tab');v(pg.evaluate('k.p.tune===62.5'),tag+' saisie incorrecte ne change rien');v(champ.get_attribute('aria-invalid')=='true',tag+' saisie invalide signalée')
   champ.fill('55');champ.press('Tab');champ.fill('200');champ.press('Tab');v(pg.evaluate('k.p.tune===100'),tag+' limites de saisie');champ.fill('55');champ.press('Tab')
   slider=pg.locator('#eur-focus [data-param=tune]');slider.focus();slider.press('ArrowRight');v(pg.evaluate('k.p.tune>55&&k.p.tune<56'),tag+' clavier sur curseur natif')
   pg.locator('#eur-focus .kb-reglage').first.locator('.kb-plus').click();v(pg.evaluate('k.p.tune>55.1'),tag+' pas fin +')
   # The real pointer also changes the range without altering pan/zoom behind it.
   pg.evaluate('window.zoomAvant=JSON.stringify(ZOOM)');slider.scroll_into_view_if_needed();box=slider.bounding_box();pg.mouse.click(box['x']+box['width']*.75,box['y']+box['height']/2)
   v(pg.evaluate('k.p.tune>65&&k.p.tune<95'),tag+' réglage par la souris');v(pg.evaluate('JSON.stringify(ZOOM)===zoomAvant'),tag+' rack immobile derrière atelier')
   pg.evaluate('window.avantPreset=JSON.stringify(k.p)');accepter['oui']=False;pg.locator('#eur-focus .kb-preset',has_text='GABBER LONG').click();v(pg.evaluate('JSON.stringify(k.p)===avantPreset'),tag+' preset refusé sans changement')
   accepter['oui']=True;pg.evaluate('window.nivAvant=k.p.niv');pg.locator('#eur-focus .kb-preset',has_text='GABBER LONG').click();v(pg.evaluate('k.p.dec===280&&k.p.drive===.77&&k.p.niv===nivAvant&&JSON.stringify(EUR.cables)===cablesAvant'),tag+' preset garde niveau et câbles')
   pg.evaluate('EUR_FOCUS.ouvrir(d.id)');pg.locator('#eur-focus [data-nombre=depth]').fill('24');pg.locator('#eur-focus [data-nombre=depth]').press('Tab');v(pg.evaluate('d.p.depth===24'),tag+' réduction précise')
   pg.evaluate('memEur();window.sauve=JSON.parse(JSON.stringify(rackCourant()));poserRack(sauve);eurBatir();eurDessiner();window.k=EUR.mods.find(m=>m.type==="kicklab");window.d=EUR.mods.find(m=>m.type==="ducktrig")');pg.wait_for_timeout(30)
   v(pg.evaluate('k.p.dec===280&&d.p.depth===24'),tag+' aller-retour sauvegarde')
   v(pg.evaluate('memEur();JSON.parse(projetContenu().doc.memoire[MEM+".eur"]).racks[EUR.cur].mods.some(m=>m.type==="ducktrig"&&m.p.depth===24)'),tag+' paramètres inclus dans projet')
   pg.evaluate('window.rackDepart=EUR.cur;changerRack((EUR.cur+1)%8);changerRack(rackDepart);window.k=EUR.mods.find(m=>m.type==="kicklab");window.d=EUR.mods.find(m=>m.type==="ducktrig");EUR_PERF_UI.ouvrir()')
   v(pg.evaluate('k.p.dec===280&&d.p.depth===24'),tag+' huit racks indépendants')
   pg.evaluate('EUR_PERFORMANCE.memoriser();EUR_PERFORMANCE.regler(4,1);EUR_PERFORMANCE.regler(6,1)');v(pg.evaluate('k.p.drive===.4&&d.p.depth===32&&d.p.release===155'),tag+' macros pilotent les nouveaux modules')
   pg.evaluate('EUR_PERFORMANCE.rappeler()');v(pg.evaluate('k.p.drive===.77&&d.p.depth===24'),tag+' point de retour exact')
   pg.evaluate('EUR_FOCUS.ouvrir(d.id)');pg.locator('#ef-transport').click();pg.wait_for_timeout(350);v(pg.evaluate('S.run&&d.kbDuck.historique()>0'),tag+' vrai transport déclenche le duck');pg.locator('#ef-transport').click();v(pg.evaluate('!S.run&&Math.abs(d.kbDuck.valeur(maintenantAudio()+.02)-1)<.0001'),tag+' STOP restaure le gain')
   pg.evaluate('window.vieuxPool=k.raveVoix;eurBatir()');v(pg.evaluate('!vieuxPool.actif()&&vieuxPool.nombre()===0&&k.raveVoix!==vieuxPool&&k.raveVoix.actif()'),tag+' reconstruction libère ancien panier')
   # Removal must close the stale editor and must not allow stale controls to write.
   pg.evaluate('EUR_FOCUS.ouvrir(d.id);window.ancienneVue=document.querySelector("#eur-focus .kb-grand");window.ancienD=d;eurRetirer(EUR.mods.indexOf(d))');pg.wait_for_timeout(40)
   v(pg.evaluate('EUR_FOCUS.actif()===null'),tag+' suppression ferme Focus')
   before=pg.evaluate('ancienD.p.depth');pg.evaluate('ancienneVue.querySelector(".kb-plus").click()');v(pg.evaluate('ancienD.p.depth')==before,tag+' vue périmée inerte')
   pg.evaluate('eurMonter(EUR_MONTAGES.find(p=>p.id==="atelier-gabber"));EUR_FOCUS.ouvrir(EUR.mods.find(m=>m.type==="ducktrig").id)')
   v(pg.evaluate('EUR.mods.filter(m=>m.type==="melo32").length===3'),tag+' séquenceur kick séparé dans Gabber')
   pg.emulate_media(reduced_motion='reduce');v(pg.evaluate('getComputedStyle(document.querySelector(".kb-courbe")).animationName==="none"'),tag+' aucun mouvement permanent')
   if a.captures:a.captures.mkdir(parents=True,exist_ok=True);pg.screenshot(path=str(a.captures/(tag+'.png')))
   v(not err,tag+' pas d’erreur JS '+str(err));c.close();print('Contrôlé '+tag,flush=True)
  if not a.sans_audio:
   for sr in [44100,48000]:
    for fallback in [False,True]:
     c,pg,err=ouvrir(1280,800);q=pg.evaluate(DUCK,{'sr':sr,'fallback':fallback});signaux.append(q)
     v(q['maxSignal']<.003 and q['maxEnv']<.003 and q['maxStereo']<.0001 and q['restored']<.0001 and not err,'duck réel '+str(q)+str(err));c.close()
    for cv in [-1,0,1]:
     c,pg,err=ouvrir(1280,800);q=pg.evaluate(KICK,{'sr':sr,'cv':cv});signaux.append(q);v(q['bad']==0 and abs(q['f']-55*2**cv)<.4 and 0<q['peak']<1 and not err,'V/OCT audio '+str(q));c.close()
    c,pg,err=ouvrir(1280,800);q=pg.evaluate(SILENCE,{'sr':sr});signaux.append(q);v(q['peak']>0 and q['silence']<.00001 and not err,'STOP réel '+str(q));c.close()
   for id in ['atelier-psy','atelier-gabber']:
    for sr in [44100,48000]:
     c,pg,err=ouvrir(1280,800);pg.set_default_timeout(90000);d=pg.evaluate(AUDIO,{'id':id,'sr':sr});rendus.append(d)
     v(all(s['bad']==0 and s['rms']>0 for s in d['stats']),id+' voix finies et actives')
     v(all(s['peak']<=1.01 for s in d['stats'][:2]),id+' sortie bornée')
     v(all(s['ok'] for s in d['cv']),id+' scènes réellement appliquées')
     v(len(d['journal'])==13 and d['journal'][-1]['scene']==0,id+' boucle complète 12 mesures')
     if id=='atelier-gabber':v(set(d['notesKick'])=={31,33,36},id+' kick suit trois hauteurs écrites')
     v(not err,id+' audio sans exception '+str(err));print('Rendu '+id+' '+str(sr),flush=True);c.close()
  browser.close()
 report={'verifications':total,'erreurs':erreurs,'formats':FORMATS,'signaux':signaux,'rendus':rendus}
 if a.rapport:a.rapport.parent.mkdir(parents=True,exist_ok=True);a.rapport.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(f'ATELIER : {total} vérifications, {len(erreurs)} erreur(s).',flush=True);raise SystemExit(bool(erreurs))
if __name__=='__main__':main()
