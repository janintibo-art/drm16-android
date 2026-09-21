#!/usr/bin/env python3
"""v273 : Focus des 21 voies, contrôles natifs, précision et mesures.
Page locale par défaut (GitHub). --contenu : page en mémoire, stockage isolé.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
RACINE=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('graphique',RACINE/'outils/test-graphique.py')
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
FORMATS=[(320,568),(360,640),(393,851),(640,360),(760,400),(880,400),(1024,768)]
DONNEES="""()=>JSON.stringify({on:SET.on,actives:SET.actives,niv:SET.niv,pan:SET.pan,mute:SET.mute,solo:SET.solo,trim:SET.trim,lo:SET.lo,md:SET.md,hi:SET.hi,modele:S.modele,run:S.run,bpm:S.bpm})"""
MESURER="""()=>{
 const col=document.querySelector('#table .tf-cible'),piste=document.getElementById('table-voies');
 const els=[...document.querySelectorAll('#tf-nav button,#tf-nav select,#table .tf-cible button,#table .tf-cible input')].filter(e=>e.getClientRects().length);
 return {colonnes:[...piste.querySelectorAll('.voie')].filter(e=>e.getClientRects().length).map(e=>e.dataset.v),
  largeur:document.documentElement.scrollWidth,debord:piste.scrollWidth-piste.clientWidth,
  interne:col.scrollWidth-col.clientWidth,
  tropPetits:els.map(e=>({id:e.id,classe:e.className,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(e=>e.w<43.9||e.h<43.9),
  textes:[...col.querySelectorAll('label,output,button')].filter(e=>e.getClientRects().length).every(e=>parseFloat(getComputedStyle(e).fontSize)>=10.5),
  originaux:window.__tfOriginaux.every(e=>e.isConnected&&document.querySelector('#table input#'+e.id)===e),
  unSeulJeu:document.querySelectorAll('#table .voie input').length===126,
  noms:els.every(e=>e.tagName==='SELECT'?!!e.labels.length:!!(e.getAttribute('aria-label')||e.textContent||e.labels&&e.labels.length))};
}"""
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true')
 ap.add_argument('--format');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path);a=ap.parse_args()
 total=0;erreurs=[];details=[]
 def v(ok,msg):
  nonlocal total
  total+=1
  if not ok:erreurs.append(msg);print('FAUX : '+msg,flush=True)
 html=(RACINE/'app/src/main/assets/drm16.html').read_text();ordre=(RACINE/'page/ordre.txt').read_text()
 for prev,new in [('css/310-reperes-effets-kaoss.css','css/320-focus-mixage.css'),('js/740-reperes-effets-kaoss.js','js/750-focus-mixage.js')]:
  s=(RACINE/'page'/new).read_text()
  v(html.count(s)==1,'source unique '+new);v(prev+'\n'+new+'\n' in ordre,'ordre '+new)
  v((RACINE/'page'/prev).read_text()+s in html,'source assemblée '+new)
 js=(RACINE/'page/js/750-focus-mixage.js').read_text()
 for interdit in ['createGain(', 'createAnalyser(', 'createBufferSource(', 'setInterval(', 'requestAnimationFrame(', 'localStorage.', 'Math.random(', 'cloneNode(']:
  v(interdit not in js,'Focus sans '+interdit)
 formats=[tuple(map(int,a.format.split('x')))] if a.format else FORMATS
 if a.captures:a.captures.mkdir(parents=True,exist_ok=True)
 try:
  with sync_playwright() as p:
   opts={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
   if a.chromium:opts['executable_path']=a.chromium;opts['args'].append('--no-sandbox')
   browser=p.chromium.launch(**opts)
   for w,h in formats:
    context=browser.new_context(viewport={'width':w,'height':h},has_touch=True)
    page=context.new_page();page.set_default_timeout(7000);errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
    if a.contenu:page.evaluate(g.STOCKAGE);page.set_content(html,wait_until='domcontentloaded')
    else:page.goto((RACINE/'app/src/main/assets/drm16.html').as_uri(),wait_until='domcontentloaded')
    page.wait_for_function("typeof TABLE_FOCUS==='object'")
    page.evaluate("()=>{menu.classList.add('hide');document.body.classList.remove('menu-ouvert');ouvrirTable()}")
    page.wait_for_function('TABLE_FOCUS.inspecter().equipees===21')
    prefix=f'{w}x{h} '
    def q(ok,msg):v(ok,prefix+msg)
    page.evaluate("""()=>{window.__tfOriginaux=[...document.querySelectorAll('#table .voie input')];window.__tfAppels={memo:0,audio:0,inputs:0};
     const m=memSet,v=majVoieSet;memSet=function(){__tfAppels.memo++;return m.apply(this,arguments)};
     majVoieSet=function(){if(!arguments[1])__tfAppels.audio++;return v.apply(this,arguments)};
     document.getElementById("table-voies").addEventListener("input",()=>__tfAppels.inputs++,true);}""")
    initial=page.evaluate(DONNEES)
    page.locator('.voie[data-v="ehx"] .tf-ouvrir').click()
    q(page.evaluate('TABLE_FOCUS.inspecter().selection')=='ehx','ouverture par le bouton réel')
    q(page.evaluate('document.activeElement.id')=='tf-choix','clavier placé dans le sélecteur visible')
    ids=page.evaluate('SET_VOIES.map(v=>v[0])')
    for id in ids:
     page.locator('#tf-choix').select_option(id)
     mesure=page.evaluate(MESURER)
     q(mesure['colonnes']==[id],id+' une seule tranche affichée')
     q(mesure['largeur']<=w and mesure['debord']<=1 and mesure['interne']<=1,id+' sans débordement horizontal')
     q(not mesure['tropPetits'],id+' commandes >=44 px : '+str(mesure['tropPetits']))
     q(mesure['textes'],id+' textes >=10,5 px')
     q(mesure['originaux'] and mesure['unSeulJeu'],id+' mêmes 126 INPUT et écouteurs natifs')
     q(mesure['noms'],id+' commandes nommées')
    page.locator('#tf-suivant').click();q(page.evaluate('TABLE_FOCUS.inspecter().selection')=='ehx','suivante après la dernière')
    page.locator('#tf-precedent').click();q(page.evaluate('TABLE_FOCUS.inspecter().selection')=='eur','précédente avant la première')
    q(not page.evaluate("TABLE_FOCUS.ouvrir('inconnue')"),'voie inconnue refusée')
    q(page.evaluate(DONNEES)==initial,'parcourir les voies ne change ni SET ni transport')
    q(page.evaluate('__tfAppels')=={'memo':0,'audio':0,'inputs':0},'ouverture et navigation sans appel audio ou sauvegarde')
    page.locator('#tf-choix').select_option('ehx')
    # Le lissage natif rappelle majVoieSet(id,true) : compter seulement
    # son entrée externe, en plus de l’événement et de la sauvegarde.
    # Chaque bouton ± doit appeler l'écouteur INPUT natif exactement une fois.
    for param in ['trim','hi','md','lo','pan','niv']:
     boite='.tf-volume' if param=='niv' else '.tf-'+param
     plus=page.locator('.tf-cible '+boite+' .tf-pas[data-sens="1"]')
     moins=page.locator('.tf-cible '+boite+' .tf-pas[data-sens="-1"]')
     avant=page.evaluate('(q)=>SET[q].ehx',param)
     page.evaluate('__tfAppels={memo:0,audio:0,inputs:0}')
     plus.click();apres=page.evaluate('(q)=>SET[q].ehx',param)
     step=float(page.locator('.tf-cible input[data-a="'+param+'"]').get_attribute('step'))
     q(abs(apres-avant-step)<1e-7,param+' plus un cran')
     q(page.evaluate('__tfAppels')=={'memo':1,'audio':1,'inputs':1},param+' un seul événement natif')
     moins.click();q(abs(page.evaluate('(q)=>SET[q].ehx',param)-avant)<1e-7,param+' moins réversible')
     q(page.evaluate('(q)=>{const r=document.querySelector(".tf-cible input[data-a="+q+"]");return r.getAttribute("aria-valuetext")===TABLE_FOCUS.valeur(q,SET[q].ehx)}',param),param+' valeur accessible actualisée')
     # Une mise à jour externe, via majTable, doit rafraîchir valeurs et bornes.
     for borne in ['min','max']:
      page.evaluate('([q,b])=>{const r=document.querySelector(".tf-cible input[data-a="+q+"]");SET[q].ehx=Number(r[b]);majTable()}',[param,borne])
      q((moins if borne=='min' else plus).is_disabled(),param+' bouton désactivé à '+borne)
     page.evaluate('([q,n])=>{SET[q].ehx=n;majTable()}',[param,avant])
    # Vérifier les valeurs aux frontières, en particulier EQ asymétrique.
    vals=page.evaluate("""()=>[TABLE_FOCUS.valeur('trim',0),TABLE_FOCUS.valeur('trim',1),TABLE_FOCUS.valeur('trim',2),TABLE_FOCUS.valeur('hi',0),TABLE_FOCUS.valeur('md',.5),TABLE_FOCUS.valeur('lo',1),TABLE_FOCUS.valeur('pan',-1),TABLE_FOCUS.valeur('pan',0),TABLE_FOCUS.valeur('pan',1),TABLE_FOCUS.valeur('niv',.8)]""")
    q(vals==['−∞ dB','0,0 dB','+6,0 dB','−26,0 dB','0,0 dB','+6,0 dB','G 100 %','CENTRE','D 100 %','−1,9 dB'],'unités des six réglages')
    # Le fader natif reste pilotable au clavier ; pas seulement les boutons ajoutés.
    fader=page.locator('.tf-cible input[data-a=niv]');fader.focus();old=float(fader.input_value());page.keyboard.press('ArrowRight')
    q(abs(float(fader.input_value())-old-.01)<1e-7,'fader natif au clavier')
    q(abs(page.evaluate('SET.niv.ehx')-float(fader.input_value()))<1e-7,'fader natif transmis au moteur')
    # De vrais appuis atteignent encore le rail et le fader pivoté.
    for param,val in [('trim',1),('niv',.5)]:
     page.evaluate('([q,v])=>{SET[q].ehx=v;majTable()}',[param,val])
     rail=page.locator('.tf-cible input[data-a="'+param+'"]');rail.scroll_into_view_if_needed();rect=rail.bounding_box()
     x=rect['x']+rect['width']*(.5 if param=='niv' else .85)
     y=rect['y']+rect['height']*(.15 if param=='niv' else .5)
     page.mouse.click(x,y)
     q(float(rail.input_value())>val,param+' appui réel sur le curseur')
     q(abs(page.evaluate('(q)=>SET[q].ehx',param)-float(rail.input_value()))<1e-7,param+' appui transmis au réglage natif')
    # Rotation pendant le Focus : mêmes commandes et aucune modification du SET.
    avant_rotation=page.evaluate(DONNEES)
    page.set_viewport_size({'width':h,'height':w})
    m=page.evaluate(MESURER)
    q(m['debord']<=1 and m['interne']<=1 and not m['tropPetits'],'rotation sans débordement ni petites cibles')
    q(page.evaluate(DONNEES)==avant_rotation and m['originaux'],'rotation conserve réglages et INPUT')
    page.set_viewport_size({'width':w,'height':h})
    mute=page.locator('.tf-cible [data-a=mute]');solo=page.locator('.tf-cible [data-a=solo]')
    mute.click();q(page.evaluate('SET.mute.ehx') and 'COUPE' in page.locator('#tf-etat').inner_text(),'COUPE native et statut')
    mute.click();solo.click();q(page.evaluate('SET.solo')=='ehx' and 'SOLO' in page.locator('#tf-etat').inner_text(),'SOLO natif et statut')
    page.locator('#tf-choix').select_option('em');q('COUPÉE PAR SOLO' in page.locator('#tf-etat').inner_text(),'voie masquée par le solo signalée')
    page.locator('#tf-choix').select_option('ehx');page.locator('.tf-cible [data-a=solo]').click()
    # Les mesures v265 retrouvent la tranche visible dans le même conteneur.
    page.evaluate("""async()=>{audioInit();await ctx.resume();const g=ctx.createGain();g.gain.value=.03;
      const o=ctx.createOscillator();o.connect(g);g.connect(busSet('ehx'));o.start();window.__tfSon=o;RETOURS_MUSICAUX.reveiller();}""")
    page.locator('.tf-cible .rm-canal').scroll_into_view_if_needed()
    page.wait_for_function("RETOURS_MUSICAUX.inspecter().visibles.includes('ehx') && RETOURS_MUSICAUX.inspecter().voies.ehx && RETOURS_MUSICAUX.inspecter().voies.ehx.some(v=>v.pic>0)")
    q(page.evaluate('RETOURS_MUSICAUX.inspecter().visibles')==['ehx'],'seule la voie affichée est mesurée')
    page.evaluate('__tfSon.stop()')
    # Aucune minuterie d'affichage ajoutée au Focus.
    compteur=page.evaluate('TABLE_FOCUS.inspecter().actualisations');page.wait_for_timeout(220)
    q(page.evaluate('TABLE_FOCUS.inspecter().actualisations')==compteur,'aucune mise à jour continue au repos')
    # Transport natif conservé en Focus, puis lors de sa fermeture.
    page.locator('#table-play').click();q(page.evaluate('S.run'),'lecture native accessible')
    page.locator('#tf-retour').click();q(page.evaluate('S.run'),'revenir à la console ne coupe pas la lecture')
    page.locator('#table-play').click();q(not page.evaluate('S.run'),'arrêt natif accessible')
    page.evaluate("()=>{const e=document.getElementById('table-voies');e.scrollLeft=900;e.scrollTop=60}")
    scroll=page.evaluate("()=>{const e=document.getElementById('table-voies');return [e.scrollLeft,e.scrollTop]}")
    page.evaluate("TABLE_FOCUS.ouvrir('eur')");page.locator('#tf-retour').click()
    apres=page.evaluate("()=>{const e=document.getElementById('table-voies');return [e.scrollLeft,e.scrollTop]}")
    q(all(abs(x-y)<=1 for x,y in zip(scroll,apres)),'position de défilement restaurée')
    page.locator('.voie[data-v=eur] .tf-ouvrir').click();page.keyboard.press('Escape')
    q(page.locator('#table').is_visible() and not page.evaluate('TABLE_FOCUS.inspecter().selection'),'Échap quitte le Focus avant la table')
    page.keyboard.press('Escape');q(not page.locator('#table').is_visible(),'second Échap ferme la table')
    page.evaluate("()=>{ouvrirTable();TABLE_FOCUS.ouvrir('ehx');fermerTable();ouvrirTable()}")
    q(not page.evaluate('TABLE_FOCUS.inspecter().selection'),'fermeture/réouverture immédiate sans état résiduel')
    page.evaluate("TABLE_FOCUS.ouvrir('em')")
    if a.captures:page.screenshot(path=str(a.captures/f'focus-mixage-{w}x{h}.png'))
    page.locator('.tf-cible [data-a=voir]').click()
    q(page.evaluate('S.modele')=='em1' and not page.locator('#table').is_visible(),'ouvrir la façade native depuis le Focus')
    page.wait_for_function("TABLE_FOCUS.inspecter().selection===''")
    page.evaluate("()=>{ouvrirTable();TABLE_FOCUS.ouvrir('ehx');fermerAutresPanneaux('note')}")
    page.wait_for_function("TABLE_FOCUS.inspecter().selection===''")
    q(not page.evaluate("document.getElementById('table').classList.contains('tf-focus')"),'autre panneau nettoie le Focus')
    q(not errs,'aucune erreur JavaScript '+str(errs))
    details.append({'format':[w,h],'voies':len(ids),'erreurs_js':errs});print('Contrôlé : '+prefix,flush=True)
    context.close()
   browser.close()
 except Exception as e:
  v(False,'exception '+str(e))
 rapport={'version':273,'formats':formats,'verifications':total,'erreurs':erreurs,'details':details,'contenu_simule':a.contenu}
 if a.rapport:a.rapport.parent.mkdir(parents=True,exist_ok=True);a.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2))
 print(f'{total} vérifications ; {len(erreurs)} erreur(s).')
 return bool(erreurs)
if __name__=='__main__':raise SystemExit(main())
