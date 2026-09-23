#!/usr/bin/env python3
"""v284 : commandes PERFORMANCE, édition, mémoire et cycle de vie sur le vrai rack.
--contenu : page en mémoire et stockage temporaire. Les rendus audio sont hors
ligne, pas une écoute sur appareil. Aucun son personnel ni fichier réel utilisé.
"""
import argparse, importlib.util, json
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
def charger(n):
 s=importlib.util.spec_from_file_location(n,Path(__file__).with_name(n+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
G=charger('test-graphique');RV=charger('test-rave')
FORMATS=[(320,568),(360,640),(393,851),(640,360),(880,400),(1280,800),(1920,1080)]
IDS=['perf-jungle','perf-psy']
PREPARER='''()=>{eurMonter(EUR_MONTAGES.find(p=>p.id==='perf-jungle'));window.M=EUR_PERFORMANCE;
 window.mixer=EUR.mods.find(m=>m.id===M.courant().commandes[0].cibles[0].id);window.basse=EUR.mods.find(m=>m.type==='bassrave');
 window.paramsAvant=JSON.stringify(EUR.mods.map(m=>m.p));window.cablesAvant=JSON.stringify(EUR.cables);window.busAvant=EUR.bus;window.modsAvant=EUR.mods;
 window.zoomAvant=JSON.stringify(ZOOM);window.pourcentAvant=M.courant().commandes.map(c=>c.valeur);
}'''
TAILLES='''()=>{const root=document.querySelector('#eur-performance'),z=root.querySelector('.ep-zone'),r=root.getBoundingClientRect(),fermer=root.querySelector('#ep-fermer').getBoundingClientRect();
 const bad=[...root.querySelectorAll('button,input,select,[role=slider]')].filter(e=>e.getClientRects().length).map(e=>({id:e.id,t:e.textContent.slice(0,20),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(x=>x.w<43.9||x.h<43.9);
 return {bad,overflow:z.scrollWidth-z.clientWidth,root:r.toJSON(),fermer:fermer.toJSON(),modal:root.getAttribute('aria-modal')};}'''
AUDIO=RV.AUDIO.replace('async ({id,sr})=>','async ({id,sr,course})=>').replace('batirAudio();eurMonter(p);','''batirAudio();eurMonter(p);
 for(let i=4;i<8;i++)EUR_PERFORMANCE.regler(i,course);''')
# Contrôle quantitatif : quatre groupes à zéro ne doivent pas produire un
# signal. L'audio est préparé APRÈS l'affectation des niveaux, pas à une date
# musicale promise. Les macros de ce lot sont des réglages immédiats.
SILENCE=AUDIO.replace('for(let i=4;i<8;i++)EUR_PERFORMANCE.regler(i,course);','for(let i=0;i<4;i++)EUR_PERFORMANCE.regler(i,0);')

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path);ap.add_argument('--sans-audio',action='store_true');a=ap.parse_args()
 total=0;err=[];rendus=[];mesures=[]
 def v(c,m):
  nonlocal total
  total+=1
  if not c:err.append(m);print('FAUX '+m,flush=True)
 with sync_playwright() as p:
  opt={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
  if a.chromium:opt['executable_path']=a.chromium;opt['args'].append('--no-sandbox')
  b=p.chromium.launch(**opt)
  def ouvrir(w,h):
   c=b.new_context(viewport={'width':w,'height':h},has_touch=w<1000);pg=c.new_page();pg.set_default_timeout(6000);er=[];pg.on('pageerror',lambda e:er.append(str(e)))
   f=R/'app/src/main/assets/drm16.html'
   if a.contenu:pg.evaluate(G.STOCKAGE);pg.set_content(f.read_text(encoding='utf-8'),wait_until='domcontentloaded')
   else:pg.goto(f.as_uri(),wait_until='domcontentloaded')
   pg.evaluate(G.OUVRIR,'eur');return c,pg,er
  for w,h in FORMATS:
   c,pg,er=ouvrir(w,h);tag=f'{w}x{h}';accord={'oui':False};pg.on('dialog',lambda d:d.accept() if accord['oui'] else d.dismiss())
   v(pg.evaluate('EUR_MONTAGES.length===63&&Object.keys(EUR_CAT).length===117'),tag+' catalogue 117 modules / 63 montages')
   pg.evaluate('EUR.montFam="performance";eurMontages()')
   v(pg.locator('[data-famille=performance]').count()==6,tag+' six cartes dans la famille PERFORMANCE')
   pg.evaluate('window.vieuxRack=JSON.stringify(rackCourant())');pg.locator('[data-montage=perf-jungle]').click()
   v(pg.evaluate('JSON.stringify(rackCourant())===vieuxRack'),tag+' refus de remplacement conserve le rack')
   accord['oui']=True;pg.locator('[data-montage=perf-jungle]').click()
   v(pg.evaluate('!!EUR.performance&&!S.run'),tag+' chargement de macros sans lecture automatique')
   pg.evaluate(PREPARER);pg.locator('#eur-performance-ouvrir').click()
   v(pg.evaluate('EUR_PERF_UI.actif()&&panneauVisible()==="eur-performance"'),tag+' vrai bouton accessible et panneau actif')
   v(pg.evaluate('EUR.bus===busAvant&&EUR.mods===modsAvant&&JSON.stringify(EUR.cables)===cablesAvant&&JSON.stringify(EUR.mods.map(m=>m.p))===paramsAvant'),tag+' ouverture sans modification du son ou du graphe')
   v(pg.locator('.ep-carte').count()==8,tag+' huit commandes')
   v(pg.evaluate('EUR_PERFORMANCE.courant().commandes.every(c=>c.cibles.length>0&&!EUR_PERFORMANCE.ecart(c))'),tag+' cibles et courses cohérentes au chargement')
   v(pg.locator('#scene').get_attribute('inert') is not None,tag+' fond rendu inerte')
   sizes=pg.evaluate(TAILLES);mesures.append({'format':tag,**sizes})
   v(not sizes['bad'],tag+' commandes 44 px '+str(sizes['bad']));v(sizes['overflow']<=1,tag+' aucun débordement horizontal')
   v(sizes['fermer']['y']>=0 and sizes['fermer']['bottom']<=h,tag+' retour toujours dans l’écran')
   pg.locator('.ep-dial').nth(0).press('Home');v(pg.evaluate('mixer.p.a===0'),tag+' Home coupe la batterie par le vrai MIX4')
   pg.locator('.ep-dial').nth(0).press('End');v(pg.evaluate('mixer.p.a===.64'),tag+' End retrouve la borne haute')
   pg.locator('.ep-dial').nth(0).press('ArrowDown');v(pg.evaluate('Math.abs(mixer.p.a-.64*.99)<1e-8'),tag+' clavier : cran normal')
   pg.locator('.ep-dial').nth(0).press('Shift+ArrowDown');v(pg.evaluate('Math.abs(mixer.p.a-.64*.989)<1e-8'),tag+' clavier : cran fin')
   pg.locator('.ep-carte').nth(0).locator('.ep-crans button').nth(0).click();v(pg.evaluate('Math.abs(M.courant().commandes[0].valeur-.979)<1e-8'),tag+' bouton moins')
   pg.locator('.ep-carte').nth(0).locator('.ep-crans button').nth(1).click();v(pg.evaluate('Math.abs(M.courant().commandes[0].valeur-.989)<1e-8'),tag+' bouton plus')
   dial=pg.locator('.ep-dial').nth(4);dial.scroll_into_view_if_needed();dial.hover();pg.mouse.wheel(0,-100)
   pg.wait_for_function('EUR_PERFORMANCE.courant().commandes[4].valeur>0')
   v(pg.evaluate('Math.abs(basse.p.cut-(.14+.44*.01))<1e-8 && Math.abs(basse.p.drive-(.18+.25*.01))<1e-8'),tag+' molette agit sur plusieurs réglages')
   dial.press('Home');dial.scroll_into_view_if_needed();box=dial.bounding_box();pg.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);pg.mouse.down();pg.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2-40,steps=5);pg.mouse.up()
   v(pg.evaluate('Math.abs(M.courant().commandes[4].valeur-.2)<.002'),tag+' glissement de 40 px = 20 %')
   v(pg.evaluate('EUR.bus===busAvant&&JSON.stringify(EUR.cables)===cablesAvant'),tag+' commandes ne reconstruisent pas le rack')
   # Annulation d'un geste réel à la perte de focus ; les mouvements ultérieurs
   # ne doivent pas continuer à modifier la commande.
   other=pg.locator('.ep-dial').nth(5);other.scroll_into_view_if_needed();bb=other.bounding_box();xx=bb['x']+bb['width']/2;yy=bb['y']+bb['height']/2
   pg.mouse.move(xx,yy);pg.mouse.down();pg.mouse.move(xx,yy-8);pg.evaluate('window.dispatchEvent(new Event("blur"))');old=pg.evaluate('M.courant().commandes[5].valeur');pg.mouse.move(xx,yy-40);pg.mouse.up()
   v(pg.evaluate('M.courant().commandes[5].valeur')==old,tag+' perte de focus libère la commande')
   if w<1000:
    other.scroll_into_view_if_needed();bb=other.bounding_box();xx=bb['x']+bb['width']/2;yy=bb['y']+bb['height']/2
    old=pg.evaluate('M.courant().commandes[5].valeur');cdp=c.new_cdp_session(pg)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':xx,'y':yy,'id':1}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':xx,'y':yy-20,'id':1}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    v(abs(pg.evaluate('M.courant().commandes[5].valeur')-old-.1)<.003,tag+' glissement tactile réel')
    z=pg.evaluate('JSON.stringify([ZOOM.z,ZOOM.tx,ZOOM.ty])')
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':xx-20,'y':yy,'id':1},{'x':xx+20,'y':yy,'id':2}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':xx-30,'y':yy+5,'id':1},{'x':xx+30,'y':yy+5,'id':2}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach()
    v(pg.evaluate('JSON.stringify([ZOOM.z,ZOOM.tx,ZOOM.ty])')==z,tag+' multitouch ne déplace pas le rack derrière')
   pg.evaluate('basse.p.sub=.417;window.avantMemoire=JSON.stringify(EUR.mods.map(m=>m.p))');pg.locator('#ep-memoriser').click()
   v(pg.locator('#ep-rappeler').is_enabled(),tag+' point de retour créé')
   v(pg.evaluate('JSON.stringify(EUR.mods.map(m=>m.p))===avantMemoire'),tag+' mémoriser ne change pas les paramètres')
   pg.evaluate('M.regler(4,.95);basse.p.sub=.231;EUR_PERF_UI.actualiser()');accord['oui']=False;pg.locator('#ep-rappeler').click()
   v(pg.evaluate('M.courant().commandes[4].valeur===.95'),tag+' rappel refusé sans effet')
   accord['oui']=True;pg.locator('#ep-rappeler').click()
   v(pg.evaluate('Math.abs(M.courant().commandes[4].valeur-.2)<.002&&basse.p.sub===.231'),tag+' rappel restaure seulement les cibles')
   v(pg.evaluate('EUR.bus===busAvant'),tag+' rappel sans reconstruction audio')
   # Ne pas écraser les réglages du rack lors d'une réouverture du panneau.
   pg.locator('#ep-fermer').click();pg.evaluate('basse.p.cut=.27;basse.maj()');pg.locator('#eur-performance-ouvrir').click()
   v('REPRISE' in pg.locator('.ep-carte').nth(4).inner_text(),tag+' réglage manuel divergent signalé')
   v(pg.evaluate('basse.p.cut===.27'),tag+' réouverture n’écrase pas le réglage manuel')
   # Configuration réelle, y compris saisie erronée et conflit de cible.
   pg.locator('.ep-configurer').nth(0).click();pg.locator('#ep-nom').fill('<b>Batterie & moi</b>');pg.locator('#ep-nom').press('Tab')
   v(pg.evaluate('M.courant().commandes[0].nom==="<b>Batterie & moi</b>"'),tag+' nom personnalisé enregistré')
   v(pg.evaluate('!document.querySelector(".ep-carte h3 b")'),tag+' nom rendu en texte, pas interprété comme HTML')
   pg.locator('.ep-cible button').first.click();pg.locator('#ep-min').fill('invalide')
   v(pg.locator('#ep-valider').is_disabled() and pg.locator('#ep-min').get_attribute('aria-invalid')=='true',tag+' saisie invalide refusée')
   pg.locator('#ep-min').fill('80');pg.locator('#ep-max').fill('20,5');pg.evaluate('window.sonAvant=JSON.stringify(EUR.mods.map(m=>m.p))');pg.locator('#ep-valider').click()
   v(pg.evaluate('M.courant().commandes[0].cibles[0].min===.8 && M.courant().commandes[0].cibles[0].max===.205'),tag+' bornes inversées et virgule')
   v(pg.evaluate('JSON.stringify(EUR.mods.map(m=>m.p))===sonAvant&&!M.courant().memoire'),tag+' nouvelle affectation silencieuse, ancien retour invalidé')
   pg.locator('#ep-ajouter').click();mixid=pg.evaluate('String(mixer.id)');pg.select_option('#ep-module',mixid);pg.select_option('#ep-param','b');pg.locator('#ep-valider').click()
   v('déjà' in pg.locator('#ep-erreur').inner_text(),tag+' conflit entre commandes expliqué')
   pg.locator('#ep-annuler').click();v(not pg.locator('.ep-affectation').is_visible(),tag+' annulation de l’édition')
   # Ajouter trois paramètres encore libres : le quatrième est la limite.
   for key in ['niv','sub','env']:
    pg.locator('#ep-ajouter').click();pg.select_option('#ep-module',pg.evaluate('String(basse.id)'));pg.select_option('#ep-param',key)
    pg.locator('#ep-min').fill('0');pg.locator('#ep-max').fill('70');pg.locator('#ep-valider').click()
   v(pg.evaluate('M.courant().commandes[0].cibles.length===4'),tag+' quatre cibles réelles')
   v(pg.locator('#ep-ajouter').is_disabled(),tag+' ajout désactivé à quatre cibles')
   sizes=pg.evaluate(TAILLES);v(not sizes['bad'] and sizes['overflow']<=1,tag+' configuration utilisable au format '+str(sizes['bad']))
   if a.captures:
    a.captures.mkdir(parents=True,exist_ok=True);pg.screenshot(path=str(a.captures/(tag+'-config.png')))
   pg.locator('.ep-cible').last.locator('button').nth(1).click();v(pg.evaluate('M.courant().commandes[0].cibles.length===3'),tag+' retrait d’une cible')
   pg.locator('#ep-retour-commandes').click();pg.locator('.ep-dial').first.press('Home');v(pg.evaluate('mixer.p.a===.8&&basse.p.niv===0&&basse.p.sub===0'),tag+' course 0 sur cibles inversées et directes')
   pg.locator('.ep-dial').first.press('End');v(pg.evaluate('Math.abs(mixer.p.a-.205)<1e-8&&basse.p.niv===.7&&basse.p.sub===.7'),tag+' course 100 sur cibles inversées et directes')
   # Mémoire, changement de rack, export du projet et absence de cibles fantômes.
   pg.locator('#ep-memoriser').click();pg.evaluate('window.sauve=JSON.stringify(rackCourant());memEur();writeMem()')
   v(pg.evaluate('JSON.stringify(JSON.parse(localStorage.getItem(MEM+".eur")).racks[EUR.cur].performance)===JSON.stringify(rackCourant().performance)'),tag+' macros et mémoire dans le stockage réel de l’application')
   v(pg.evaluate('projetContenu().doc.memoire[MEM+".eur"].includes("performance")'),tag+' projet .drm16 inclut les macros')
   pg.evaluate('poserRack(JSON.parse(sauve));eurBatir();eurDessiner()');v(not pg.locator('#eur-performance').is_visible(),tag+' changement de rack ferme le panneau')
   pg.locator('#eur-performance-ouvrir').click();v(pg.evaluate('M.courant().memoire!==null&&M.courant().commandes[0].cibles.length===3'),tag+' restauration des affectations et mémoire')
   pg.evaluate('M.regler(0,.2);M.rappeler();EUR_PERF_UI.actualiser()');v(pg.evaluate('M.courant().commandes[0].valeur===1'),tag+' point de retour relu et utilisable')
   # Transitions avec FOCUS : aucun inert résiduel ne doit bloquer l'autre vue.
   pg.evaluate('EUR_FOCUS.ouvrir(EUR.mods.find(m=>m.type==="bassrave").id)');v(pg.locator('#eur-focus').is_visible() and not pg.locator('#eur-performance').is_visible(),tag+' PERFORMANCE vers FOCUS')
   v(pg.evaluate('!document.querySelector("#eur-focus").inert'),tag+' Focus non inerte')
   pg.evaluate('EUR_PERF_UI.ouvrir()');v(pg.locator('#eur-performance').is_visible() and not pg.locator('#eur-focus').is_visible(),tag+' FOCUS vers PERFORMANCE')
   v(pg.evaluate('!document.querySelector("#eur-performance").inert'),tag+' Performance non inerte')
   pg.locator('#ep-fermer').click();v(pg.evaluate('!document.querySelector("#scene").inert&&!document.body.classList.contains("note-ouverte")'),tag+' fond rétabli sans verrou')
   pg.evaluate('changerRack(1)');v(pg.evaluate('!EUR.performance'),tag+' autre rack indépendant')
   pg.evaluate('changerRack(0)');v(pg.evaluate('M.courant().commandes[0].nom==="<b>Batterie & moi</b>"'),tag+' premier rack conservé')
   pg.evaluate('eurMonter(EUR_MONTAGES.find(p=>p.id==="perf-psy"))');pg.locator('#eur-performance-ouvrir').click()
   v(pg.evaluate('M.courant().commandes[7].nom==="MONTÉE"&&!M.courant().memoire'),tag+' second montage indépendant')
   v(pg.evaluate('M.courant().commandes.every(c=>!M.ecart(c))'),tag+' second montage : huit courses cohérentes')
   if a.captures:
    pg.screenshot(path=str(a.captures/(tag+'-macros.png')))
   pg.locator('#ep-play').click();pg.wait_for_function('S.run&&EUR.mods.find(m=>m.type==="melo32").melo32.pos>=0')
   v(pg.evaluate('S.run'),tag+' lecture depuis PERFORMANCE')
   playing=pg.evaluate('''()=>{const b=EUR.bus,seq=EUR.mods.find(m=>m.type==='melo32'),state=seq.melo32;M.memoriser();M.regler(4,.5);M.rappeler();return EUR.bus===b&&seq.melo32===state&&S.run;}''')
   v(playing,tag+' jouer et rappeler sans recréer le séquenceur ni arrêter la lecture')
   pg.locator('#ep-play').click();v(pg.evaluate('!S.run'),tag+' STOP depuis PERFORMANCE')
   pg.locator('#ep-fermer').focus();pg.keyboard.press('Shift+Tab');v(pg.evaluate('document.activeElement.closest("#eur-performance")!==null'),tag+' boucle Tab reste dans la vue')
   pg.keyboard.press('Escape');v(pg.evaluate('!EUR_PERF_UI.actif()'),tag+' Échap ferme la vue')
   pg.evaluate('eurMonter(EUR_MONTAGES.find(p=>p.id==="rave-jungle"))');pg.locator('#eur-performance-ouvrir').click()
   v(pg.evaluate('!EUR.performance'),tag+' ancien montage sans configuration imposée')
   v(pg.locator('.ep-dial[aria-disabled=true]').count()==8,tag+' anciennes façades : huit emplacements libres')
   v(pg.locator('#ep-memoriser').is_disabled(),tag+' aucune fausse mémoire sans cibles')
   pg.evaluate('allerMachine("16")');pg.wait_for_function('!EUR_PERF_UI.actif()')
   v(pg.evaluate('!document.querySelector("#scene").inert'),tag+' changement de machine libère le fond')
   v(not er,tag+' aucune erreur JavaScript '+str(er));c.close();print('Contrôlé '+tag,flush=True)
  if not a.sans_audio:
   for id in IDS:
    for sr in [44100,48000]:
     # Les deux courses extrêmes et le rappel des scènes utilisent de vrais
     # noeuds Web Audio. Les 13 mesures contrôlent aussi le retour à l'intro.
     for course in [0,1]:
      c,pg,er=ouvrir(1280,800);pg.set_default_timeout(90000);r=pg.evaluate(AUDIO,{'id':id,'sr':sr,'course':course});r['course']=course;rendus.append(r)
      for x in r['stats']:v(x['bad']==0 and x['rms']>.00001 and x['peak']<4,f'{id}/{sr}/{course} canal {x["c"]} actif et fini')
      v(all(x['peak']<.99 for x in r['stats'][:2]),f'{id}/{sr}/{course} sortie sans dépassement')
      v(all(x['ok'] for x in r['cv']),f'{id}/{sr}/{course} niveaux des scènes conservés')
      v(len(r['journal'])==13 and r['journal'][-1]['scene']==0,f'{id}/{sr}/{course} arrangement puis retour')
      v(all(x['peak']<.0001 for x in r['clean']),f'{id}/{sr}/{course} STOP basse')
      v(not er,f'{id}/{sr}/{course} aucune exception {er}');c.close();print(f'Audio {id} {sr} Hz / course {course}',flush=True)
     x,y=rendus[-2:];v(any(abs(x['stats'][i]['rms']-y['stats'][i]['rms'])>.0001 for i in range(2)),f'{id}/{sr} le son change réellement entre les bornes')
    c,pg,er=ouvrir(1280,800);pg.set_default_timeout(90000);s=pg.evaluate(SILENCE,{'id':id,'sr':48000,'course':0});rendus.append({'silence':True,**s})
    v(all(x['peak']<1e-6 for x in s['stats'][:2]),id+' quatre niveaux nuls = sortie silencieuse');v(not er,id+' silence sans exception');c.close()
  b.close()
 report={'verifications':total,'formats':FORMATS,'mesures':mesures,'rendus':rendus,'erreurs':err,'stockage_simule':a.contenu}
 if a.rapport:a.rapport.parent.mkdir(parents=True,exist_ok=True);a.rapport.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(str(total)+' vérifications ; '+str(len(err))+' erreur(s).',flush=True)
 raise SystemExit(bool(err))
if __name__=='__main__':main()
