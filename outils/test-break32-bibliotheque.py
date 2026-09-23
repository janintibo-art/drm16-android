#!/usr/bin/env python3
"""v283 : import WAV, bibliothèque, découpage, sauvegarde et lecture de BREAK 32.
Fichiers artificiels uniquement. Pont disque simulé, vrai décodeur Chromium et
rendus OfflineAudioContext. --contenu utilise un stockage temporaire simulé.
"""
import argparse, importlib.util, io, json, math, struct, wave
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
def charger(n):
 s=importlib.util.spec_from_file_location(n,Path(__file__).with_name(n+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
G=charger('test-graphique');RV=charger('test-rave')
FORMATS=[(320,568),(360,640),(393,851),(640,360),(880,400),(1280,800),(1920,1080)]
PONT='''()=>{window.disqueEch=Object.create(null);HOST.echSauver=(id,b64)=>{disqueEch[id]=b64;return true;};HOST.echListe=()=>Object.keys(disqueEch).join('\\n');HOST.echCharger=id=>disqueEch[id]||'';HOST.echSupprimer=id=>{delete disqueEch[id];};}'''
PREPARER='''()=>{eurMonter(EUR_MONTAGES.find(p=>p.id==='atelier-jungle'));window.br=EUR.mods.find(m=>m.type==='break32');EUR_FOCUS.ouvrir(br.id);window.avantPas=JSON.stringify(br.p);window.avantCables=JSON.stringify(EUR.cables);window.avantBus=EUR.bus;}'''
AUDIO=RV.AUDIO.replace('batirAudio();eurMonter(p);', '''batirAudio();eurMonter(p);
 const bank=EUR_BREAK32.banque(),loop=ctx.createBuffer(1,bank.avant[0].length*16,sr);
 bank.avant.forEach((b,i)=>loop.getChannelData(0).set(b.getChannelData(0),i*b.length));
 ES.buf.uAudioTest=loop;BIB.noms.uAudioTest='Boucle de contrôle';const br=EUR.mods.find(m=>m.type==='break32');
 if(!EUR_BREAK_SAMPLES.affecter(br,'uAudioTest'))throw Error('source non affectée');
 if(!EUR_BREAK_SAMPLES.appliquer(br,EUR_BREAK_SAMPLES.egales(32),32))throw Error('repères non affectés');''')
def fichier():
 b=io.BytesIO();rate=48000
 with wave.open(b,'wb') as w:
  w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate)
  a=bytearray();attacks=[0,.2,.45,.7,1,1.23,1.61,1.8,2,2.27,2.49,2.75,3,3.2,3.51,3.75]
  for i in range(rate*4):
   t=i/rate;env=max((math.exp(-(t-k)/.04) for k in attacks if 0<=t-k<.2),default=0)
   l=.5*env*math.sin(2*math.pi*110*t);r=.3*env*math.sin(2*math.pi*220*t)
   a.extend(struct.pack('<hh',round(l*32767),round(r*32767)))
  w.writeframes(a)
 return b.getvalue()

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path);ap.add_argument('--sans-audio',action='store_true');a=ap.parse_args()
 total=0;err=[];rendus=[];data=fichier()
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
   pg.evaluate(G.OUVRIR,'eur');pg.evaluate(PONT);return c,pg,er
  for w,h in FORMATS:
   c,pg,er=ouvrir(w,h);tag=f'{w}x{h}';accord={'oui':True};pg.on('dialog',lambda d:d.accept() if accord['oui'] else d.dismiss())
   pg.evaluate(PREPARER)
   v(pg.evaluate('EUR_MONTAGES.length===66&&Object.keys(EUR_CAT).length===119'),tag+' catalogue 119 modules / 66 montages')
   v(pg.locator('.brs-source').is_visible(),tag+' atelier dans le Focus')
   v('BREAK ORIGINAL' in pg.locator('.brs-statut').inner_text(),tag+' source d’origine explicite')
   v(not pg.locator('.brs-atelier').is_visible(),tag+' édition de fichier masquée sans fichier')
   pg.locator('.brs-source input[type=file]').set_input_files({'name':'Ma boucle.wav','mimeType':'audio/wav','buffer':data})
   pg.wait_for_function('!!br.breakSample&&!!ES.buf[br.breakSample.ech]');pg.wait_for_function('document.querySelector(".brs-message").textContent.includes("WAV ajouté")')
   v('stéréo mélangée en mono' in pg.locator('.brs-message').inner_text(),tag+' information sur mono explicite')
   v(pg.evaluate('JSON.stringify(br.p)===avantPas&&EUR.bus===avantBus&&JSON.stringify(EUR.cables)===avantCables'),tag+' notes, câbles et graphe conservés')
   pg.evaluate('window.importId=br.breakSample.ech;window.bufImport=ES.buf[importId];window.copieAudio=bufImport.getChannelData(0).slice()')
   v(pg.evaluate('bufImport.numberOfChannels===1&&Math.abs(bufImport.duration-4)<.001&&disqueEch[importId].length>1000'),tag+' fichier de quatre secondes décodé et enregistré')
   v(pg.evaluate('nomBib(importId)==="Ma boucle"&&usagesEch(importId)>=1'),tag+' source nommée et protégée du nettoyage inutilisé')
   v(pg.evaluate('br.breakSample.nb===16&&br.breakSample.coupes.length===17'),tag+' première découpe régulière16')
   geometry=pg.evaluate('''()=>{const z=document.querySelector('#eur-focus .ef-zone');return {overflow:z.scrollWidth-z.clientWidth,bad:[...document.querySelectorAll('#eur-focus button,#eur-focus select,#eur-focus input:not([type=file])')].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9;}).map(e=>e.textContent.slice(0,30))};}''')
   v(geometry['overflow']<=1,tag+' aucune largeur débordante');v(not geometry['bad'],tag+' commandes 44 px '+str(geometry['bad']))
   pg.locator('.brs-nombre').select_option('8');pg.locator('.brs-egales').click();v(pg.evaluate('br.breakSample.nb===8&&br.breakSample.coupes[1]===.125'),tag+' grille huit')
   pg.evaluate('br.p.n1=24;EUR_BREAK32.rafraichir(br)')
   v('HORS DÉCOUPE' in pg.locator('.br32-editeur [data-champ=n] option[value="24"]').inner_text(),tag+' numéro hors découpe signalé')
   pg.locator('.brs-nombre').select_option('32');pg.locator('.brs-egales').click();v(pg.evaluate('br.breakSample.nb===32&&br.p.n1===24'),tag+' retour32 conserve les pas')
   pg.locator('.brs-tranche').select_option('2')
   pg.locator('.brs-source input[data-borne="0"]').fill('140,5');pg.locator('.brs-source input[data-borne="0"]').press('Tab')
   v(pg.evaluate('Math.abs(br.breakSample.coupes[1]*4-.1405)<.0001'),tag+' borne avec virgule')
   pg.evaluate('window.cutsAvant=JSON.stringify(br.breakSample.coupes)')
   pg.locator('.brs-source input[data-borne="0"]').fill('9999');pg.locator('.brs-source input[data-borne="0"]').press('Tab')
   v(pg.evaluate('JSON.stringify(br.breakSample.coupes)===cutsAvant'),tag+' croisement refusé')
   v(pg.locator('.brs-source input[data-borne="0"]').get_attribute('aria-invalid')=='true',tag+' champ invalide signalé')
   pg.locator('.brs-source input[data-borne="0"]').fill('nimporte');pg.locator('.brs-source input[data-borne="0"]').press('Tab')
   v(pg.evaluate('JSON.stringify(br.breakSample.coupes)===cutsAvant'),tag+' texte incorrect refusé')
   pg.locator('.brs-source input[data-borne="0"]').fill('141.5');pg.locator('.brs-source input[data-borne="0"]').press('Tab');pg.locator('.brs-annuler').click()
   v(pg.evaluate('JSON.stringify(br.breakSample.coupes)===cutsAvant'),tag+' annulation restitue les repères')
   pg.locator('.brs-nombre').select_option('16');pg.locator('.brs-attaques').click();v(pg.evaluate('br.breakSample.nb===16&&br.breakSample.coupes.length===17&&br.breakSample.coupes.every((x,i,a)=>!i||x>a[i-1])'),tag+' découpe attaques ordonnée')
   pg.evaluate('window.cutsAvant=JSON.stringify(br.breakSample.coupes)')
   accord['oui']=False;pg.locator('.brs-nombre').select_option('8');pg.locator('.brs-egales').click();v(pg.evaluate('JSON.stringify(br.breakSample.coupes)===cutsAvant'),tag+' refus redécoupage conserve source');accord['oui']=True
   for txt in ['ZOOM +','ZOOM +','VOIR TRANCHE','TOUT VOIR']:pg.get_by_role('button',name=txt,exact=True).click()
   v(pg.evaluate('JSON.stringify(br.breakSample.coupes)===cutsAvant'),tag+' zoom ne modifie pas les bornes')
   pg.locator('.brs-tranche').select_option('2');pg.locator('.brs-onde').scroll_into_view_if_needed()
   r=pg.locator('.brs-onde').bounding_box();cut=pg.evaluate('br.breakSample.coupes[1]')
   x=r['x']+cut*r['width'];y=r['y']+70;pg.mouse.move(x,y);pg.mouse.down();pg.mouse.move(x+3,y,steps=3);pg.mouse.up()
   v(pg.evaluate('JSON.stringify(br.breakSample.coupes)!==cutsAvant'),tag+' glissement de borne effectif')
   pg.locator('.brs-annuler').click();v(pg.evaluate('JSON.stringify(br.breakSample.coupes)===cutsAvant'),tag+' glissement annulable')
   pg.locator('.brs-onde').scroll_into_view_if_needed();r=pg.locator('.brs-onde').bounding_box();cut=pg.evaluate('br.breakSample.coupes[1]');x=r['x']+cut*r['width'];y=r['y']+70
   pg.mouse.move(x,y);pg.mouse.down();pg.mouse.move(x+2,y,steps=2);pg.locator('.brs-onde').dispatch_event('pointercancel',{'pointerId':1});pg.mouse.up()
   v(pg.evaluate('JSON.stringify(br.breakSample.coupes)===cutsAvant'),tag+' geste annulé rétablit le découpage')
   pg.evaluate('()=>{window.createBS=ctx.createBufferSource.bind(ctx);window.ecoutes=[];ctx.createBufferSource=function(){const s=createBS(),stop=s.stop.bind(s);s.stop=function(t){s.stopControle=t===undefined?0:t;return stop(t);};ecoutes.push(s);return s;};}')
   pg.locator('.brs-ecouter').click();v(pg.evaluate('ecoutes.length===1&&ecoutes[0].buffer===ES.buf[importId]'),tag+' audition source réelle')
   pg.locator('.brs-stop').click();v(pg.evaluate('ecoutes[0].stopControle===0'),tag+' arrêt audition')
   pg.get_by_role('button',name='ÉCOUTER INVERSÉE',exact=True).click();v(pg.evaluate('ecoutes.at(-1).buffer!==ES.buf[importId]&&ecoutes.at(-1).buffer.length<ES.buf[importId].length'),tag+' audition de vraie tranche inversée')
   pg.evaluate('br.arreter()');v(pg.evaluate('ecoutes.at(-1).stopControle===0'),tag+' STOP du module coupe aussi audition')
   v(pg.evaluate('copieAudio.every((x,i)=>x===ES.buf[importId].getChannelData(0)[i])'),tag+' source non modifiée par édition et audition')
   if a.captures:
    a.captures.mkdir(parents=True,exist_ok=True);pg.locator('.brs-statut').scroll_into_view_if_needed();pg.screenshot(path=str(a.captures/(tag+'.png')))
   pg.evaluate('window.rackSauve=JSON.stringify(rackCourant());EUR_FOCUS.fermer(false);poserRack(JSON.parse(rackSauve));eurBatir();eurDessiner();window.br=EUR.mods.find(m=>m.type==="break32");EUR_FOCUS.ouvrir(br.id)')
   v(pg.evaluate('br.breakSample.ech===importId&&JSON.stringify(br.breakSample.coupes)===cutsAvant'),tag+' repères restaurés avec le rack')
   pg.evaluate('delete ES.buf[importId];EUR_BREAK_SAMPLES.actualiser()')
   v('SON MANQUANT' in pg.locator('.brs-statut').inner_text(),tag+' source manquante explicitement silencieuse')
   pg.evaluate('chargerEchs()');pg.wait_for_function('!!ES.buf[importId]')
   v('Ma boucle' in pg.locator('.brs-statut').inner_text(),tag+' recharge depuis le stockage natif simulé')
   v(pg.evaluate('Math.abs(ES.buf[importId].duration-4)<.001&&br.breakSample.ech===importId&&JSON.stringify(br.breakSample.coupes)===cutsAvant'),tag+' durée et repères conservés au rechargement')
   v(pg.evaluate('(()=>{const p=projetContenu();return !!p.doc.sons[importId]&&JSON.stringify(p.doc.memoire).includes(importId)&&typeof projetValider(JSON.stringify(p.doc))!=="string";})()'),tag+' projet contient référence, repères et WAV enregistré')
   pg.evaluate('ES.buf.uAutre=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);ES.noms.uAutre="fichier";BIB.noms.uAutre="Deuxième boucle";ES.buf.uLong=ctx.createBuffer(1,ctx.sampleRate*31,ctx.sampleRate);BIB.noms.uLong="Trop long";')
   pg.get_by_role('button',name='BIBLIOTHÈQUE',exact=True).click();v(pg.locator('.brs-liste option[value=uLong]').count()==0,tag+' source trop longue filtrée')
   pg.locator('.brs-bibli input[type=search]').fill('Deuxième');v(pg.locator('.brs-liste option').count()==1,tag+' recherche bibliothèque')
   accord['oui']=False;pg.locator('.brs-charger').click();v(pg.evaluate('br.breakSample.ech===importId'),tag+' refus remplacement de source');accord['oui']=True
   pg.locator('.brs-charger').click();v(pg.evaluate('br.breakSample.ech==="uAutre"&&br.p.n1===24&&!!ES.buf[importId]'),tag+' nouvelle source ne supprime ni boucle précédente ni pas')
   pg.get_by_role('button',name='BREAK ORIGINAL',exact=True).click();v(pg.evaluate('!br.breakSample&&br.p.n1===24&&!!ES.buf[importId]'),tag+' retour usine conserve écriture et bibliothèque')
   pg.locator('.brs-source input[type=file]').set_input_files({'name':'Casse.wav','mimeType':'audio/wav','buffer':b'invalide'*10});pg.wait_for_function('document.querySelector(".brs-message").textContent.includes("WAV")')
   v(pg.evaluate('!br.breakSample'),tag+' WAV mal formé sans affectation')
   pg.evaluate('HOST.echSauver=()=>false');pg.locator('.brs-source input[type=file]').set_input_files({'name':'Session.wav','mimeType':'audio/wav','buffer':data});pg.wait_for_function('document.querySelector(".brs-message").textContent.includes("SESSION SEULEMENT")')
   v(pg.evaluate('!!br.breakSample&&!disqueEch[br.breakSample.ech]'),tag+' import non enregistré honnêtement signalé')
   pg.evaluate('window.sourceAvant=JSON.stringify(br.breakSample);window.decodeNative=ctx.decodeAudioData.bind(ctx);ctx.decodeAudioData=(ab,yes)=>{window.livrerRetard=yes;};')
   pg.locator('.brs-source input[type=file]').set_input_files({'name':'Retard.wav','mimeType':'audio/wav','buffer':data});pg.wait_for_function('typeof livrerRetard==="function"')
   pg.evaluate('()=>{EUR_FOCUS.fermer(false);livrerRetard(ES.buf[importId]);ctx.decodeAudioData=decodeNative;}');pg.wait_for_timeout(20)
   v(pg.evaluate('JSON.stringify(br.breakSample)===sourceAvant'),tag+' import tardif annulé à la fermeture')
   v(not er,tag+' aucune erreur JavaScript '+str(er));c.close();print('Contrôlé '+tag,flush=True)
  if not a.sans_audio:
   for id in ['atelier-jungle','atelier-breakcore']:
    for sr in [44100,48000]:
     c,pg,er=ouvrir(1280,800);pg.set_default_timeout(90000);r=pg.evaluate(AUDIO,{'id':id,'sr':sr});rendus.append(r)
     for x in r['stats']:v(x['bad']==0 and x['rms']>.00001 and x['peak']<4,f'{id}/{sr} canal {x["c"]} actif et fini')
     v(all(x['peak']<.99 for x in r['stats'][:2]),f'{id}/{sr} sortie sans dépassement')
     v(all(x['ok'] for x in r['cv']),f'{id}/{sr} niveaux de scènes effectifs')
     v(len(r['journal'])==13 and r['journal'][-1]['scene']==0,f'{id}/{sr} boucle complète puis reprise')
     v(all(x['peak']<.0001 for x in r['clean']),f'{id}/{sr} STOP propre')
     v(all(x==0 for x in r['hist']),f'{id}/{sr} pas d’historique graphique hors ligne')
     v(not er,f'{id}/{sr} aucune erreur '+str(er));c.close();print('Audio '+id+' '+str(sr)+' Hz',flush=True)
  b.close()
 rapport={'verifications':total,'erreurs':err,'rendus':rendus,'formats':FORMATS}
 if a.rapport:a.rapport.parent.mkdir(parents=True,exist_ok=True);a.rapport.write_text(json.dumps(rapport,indent=2,ensure_ascii=False))
 print(f'BREAK BIBLIOTHÈQUE : {total} vérifications, {len(err)} erreur(s).',flush=True)
 if err:raise SystemExit(1)
if __name__=='__main__':main()
