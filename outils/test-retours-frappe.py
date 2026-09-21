#!/usr/bin/env python3
"""v270 : appuis et déclenchements réels PO-33 / MC-101 / SmplTrek.
--contenu utilise un stockage temporaire et injecte la page en mémoire.
Par défaut, navigation locale comme les autres suites GitHub.
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
GROUPES={'ko':'#ko-pads','mc':'#mc-trks','stk':'#stk-trks'}
INIT='''async m=>{
 audioInit();await ctx.resume();window.rfTemps=100;
 Object.defineProperty(ctx,'currentTime',{configurable:true,get:()=>rfTemps});
 const b=ctx.createBuffer(1,8000,8000);b.getChannelData(0).fill(.2);ES.buf.rfTest=b;
 KO_MODE='son';KO.chroma=false;KO.chromaSource=0;KO.rec=false;KO.song=false;KO.fxTenu=false;
 KO.cur=0;KO.sel=0;KO.sons[0]='rfTest';KO.motifs[0]=motifKo();
 MC.pistes=Array.from({length:4},(_,i)=>pisteMc(i));MC.sel=0;MC.scatOn=false;MC.pos=-1;
 MC.attente=[null,null,null,null];MC.depart=null;
 STK.pistes=Array.from({length:10},(_,i)=>pisteStk(i));STK.sel=0;STK.cur=0;STK.solo=-1;STK.song=false;
 STK.attente=null;STK.depart=null;STK.chaine=[];STK.pos=-1;STK_MODE='pas';STK.motifs[0]=motifStk();
 STK.pistes[0].ech='rfTest';STK.pistes[0].dec=1;STK.pistes[0].tune=.5;
 S.run=false;RETOURS_FRAPPE.effacer();
 if(m==='ko')majKo();if(m==='mc')majMc();if(m==='stk')majStk();
}'''
VOIX={ 'ko':'voixKo(rfTemps+DELAI,0,1)', 'mc':'voixMc(rfTemps+DELAI,0,0,1)', 'stk':'voixStk(rfTemps+DELAI,0,false,-1,0)' }
ARRET={'ko':'arretKo()','mc':'arretMc()','stk':'arretStk()'}
MAJ={'ko':'majKo()','mc':'majMc()','stk':'majStk()'}
DONNEES='''()=>JSON.stringify({ko:{sons:KO.sons,motifs:KO.motifs,sel:KO.sel,cur:KO.cur},
mc:{pistes:MC.pistes,sel:MC.sel,attente:MC.attente},stk:{pistes:STK.pistes,motifs:STK.motifs,sel:STK.sel,cur:STK.cur},memoire})'''

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true')
 ap.add_argument('--format');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path);a=ap.parse_args()
 total=0;erreurs=[]
 def v(ok,msg):
  nonlocal total
  total+=1
  if not ok:erreurs.append(msg);print('FAUX : '+msg,flush=True)
 html=(RACINE/'app/src/main/assets/drm16.html').read_text();ordre=(RACINE/'page/ordre.txt').read_text()
 for path,avant in [('css/300-retours-frappe.css','css/290-onde-smpltrek.css'),('js/730-retours-frappe.js','js/720-onde-smpltrek.js')]:
  s=(RACINE/'page'/path).read_text();v(html.count(s)==1,'Source unique '+path)
  v(avant+'\n'+path+'\n' in ordre,'Ordre '+path);v((RACINE/'page'/avant).read_text()+s in html,'Concaténation '+path)
 js=(RACINE/'page/js/730-retours-frappe.js').read_text()
 for interdit in ['createBufferSource(','createGain(','createAnalyser(','Math.random(','localStorage.','setInterval(','preventDefault(','stopPropagation(','setPointerCapture(']:
  v(interdit not in js,'Module sans '+interdit)
 if a.captures:a.captures.mkdir(parents=True,exist_ok=True)
 with sync_playwright() as p:
  opts={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
  if a.chromium:opts['executable_path']=a.chromium;opts['args'].append('--no-sandbox')
  nav=p.chromium.launch(**opts)
  def page(w,h):
   c=nav.new_context(viewport={'width':w,'height':h},has_touch=True,device_scale_factor=2 if w==393 else 1)
   pg=c.new_page();pg.set_default_timeout(6000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
   if a.contenu:pg.evaluate(g.STOCKAGE);pg.set_content(html,wait_until='domcontentloaded')
   else:pg.goto((RACINE/'app/src/main/assets/drm16.html').as_uri(),wait_until='domcontentloaded')
   pg.wait_for_timeout(650);return c,pg,errs
  formats=[tuple(map(int,a.format.split('x')))] if a.format else FORMATS
  for w,h in formats:
   c,pg,errs=page(w,h)
   for m in GROUPES:
    pref=f'{w}x{h} {m} '
    def q(ok,msg):v(ok,pref+msg)
    def etat():return pg.evaluate('RETOURS_FRAPPE.inspecter()')
    def jouer(d=0):pg.evaluate(VOIX[m].replace('DELAI',str(d)))
    def attente():pg.wait_for_timeout(70)
    pg.evaluate(g.OUVRIR,m);pg.evaluate(INIT,m);pg.wait_for_timeout(100)
    mesure=pg.evaluate(g.MESURER)
    if w<=880 or m=='stk':
     q(mesure['echelle']==1 and mesure['interne']<=1 and mesure['document']<=w+1,'confort mobile conservé')
     q(not mesure['ciblesIncorrectes'],'commandes >=44px et texte >=10,5px')
    else:
     # PO/MC sur tablette gardent leur échelle native v269 (hors lot mobile).
     q(mesure['document']<=w+1 and mesure['cadre']['width']<=w+1,'façade tablette sans débordement')
     q(mesure['echelle']>0,'échelle tablette native conservée')
    cible=pg.locator(GROUPES[m]+'>button').first;cible.scroll_into_view_if_needed();attente()
    pg.evaluate('RETOURS_FRAPPE.synchroniser()')
    q(not etat()['masque'] and not etat()['enAttente'],'repos initial')
    rect=cible.bounding_box();text=cible.inner_text()
    jouer(.08);q(etat()['file']==1 and etat()['impacts']==0,'départ futur en attente')
    pg.wait_for_timeout(20);q(etat()['impacts']==0,'pas de frappe anticipée')
    pg.evaluate('rfTemps+=.09');pg.wait_for_timeout(100)
    q(etat()['impacts']==1,'une frappe à la date audio')
    q(cible.locator('.rf-impact').count()==1,'un seul témoin')
    q(cible.locator('.rf-impact').evaluate('e=>getComputedStyle(e).pointerEvents==="none"&&e.getAttribute("aria-hidden")==="true"'),'décoration non interactive')
    q(cible.bounding_box()==rect and cible.inner_text()==text,'géométrie et légendes inchangées')
    q(pg.locator(GROUPES[m]+'>button').count()=={'ko':16,'mc':4,'stk':10}[m],'aucun faux bouton dans le groupe')
    pg.evaluate(MAJ[m]);attente();q(cible.locator('.rf-impact').count()==1,'rafraîchissement natif sans doublon')
    avant=pg.evaluate(DONNEES);pg.evaluate('rfTemps+=.08');attente()
    q(0<float(cible.locator('.rf-impact').evaluate('e=>e.style.opacity'))<1,'extinction progressive')
    q(pg.evaluate(DONNEES)==avant,'dessin sans modification des données')
    pg.evaluate('rfTemps+=.25');attente();q(not etat()['enAttente'] and etat()['impacts']==0,'fin et arrêt de la boucle')
    n=etat()['frames'];pg.wait_for_timeout(100);q(etat()['frames']==n,'aucun dessin au repos')
    # Pression native : souris maintenue puis annulation ; aucune capture ajoutée.
    r=cible.bounding_box();pg.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);pg.mouse.down();pg.wait_for_timeout(80)
    q(cible.get_attribute('data-rf-appui')=='1','appui visible')
    pg.mouse.move(2,2);pg.mouse.up();attente();q(etat()['appuis']==0,'relâchement hors bouton')
    pg.evaluate(ARRET[m]);attente();q(not etat()['enAttente'],'STOP efface les témoins')
    # Le clavier garde son indication propre (sans voler les touches).
    cible.focus();pg.keyboard.down('Space');pg.wait_for_timeout(80)
    q(cible.get_attribute('data-rf-appui')=='1','appui clavier')
    pg.keyboard.up('Space');attente();q(etat()['appuis']==0,'relâchement clavier')
    pg.evaluate(ARRET[m]);pg.evaluate('rfTemps+=1');jouer(.08)
    pg.evaluate("menu.classList.remove('hide');document.body.classList.add('menu-ouvert')");attente()
    q(etat()['masque'] and etat()['file']==0 and not etat()['enAttente'],'menu : arrêt et oubli des départs')
    pg.evaluate("menu.classList.add('hide');document.body.classList.remove('menu-ouvert');rfTemps+=1");attente()
    q(not etat()['enAttente'],'retour sans rejouer un vieux signal')
    cible.scroll_into_view_if_needed();attente();jouer();attente()
    pg.evaluate('window.dispatchEvent(new Event("pagehide"))');attente();q(not etat()['enAttente'] and etat()['masque'],'pagehide')
    pg.evaluate('window.dispatchEvent(new Event("pageshow"))');attente();q(not etat()['enAttente'],'pageshow sans rejeu')
    pg.evaluate('async()=>{audioInit();await ctx.resume();Object.defineProperty(ctx,"currentTime",{configurable:true,get:()=>rfTemps})}')
    jouer(.08);pg.evaluate('async()=>{await ctx.suspend()}');attente()
    q(not etat()['enAttente'] and etat()['file']==0,'suspension audio')
    pg.evaluate('async()=>{await ctx.resume()}');attente();q(not etat()['enAttente'],'reprise audio au repos')
    pg.emulate_media(reduced_motion='reduce');attente();pg.evaluate('rfTemps+=1');jouer();attente()
    pg.evaluate('rfTemps+=.08');attente()
    q(etat()['reduction'] and cible.locator('.rf-impact').evaluate('e=>e.style.opacity==="1"'),'mouvement réduit : point fixe')
    pg.evaluate('rfTemps+=.3');attente();q(not etat()['enAttente'],'mouvement réduit : extinction sans boucle restante')
    pg.emulate_media(reduced_motion='no-preference');attente()
    if a.captures and w in [393,880]:
     pg.evaluate('rfTemps+=1');jouer();attente();pg.screenshot(path=str(a.captures/f'{m}-{w}x{h}.png'))
    pg.evaluate(ARRET[m]);print('Contrôlé : '+pref,flush=True)
   v(not errs,f'{w}x{h} erreurs JavaScript : {errs}');c.close()
  # Scénarios musicaux : un format stable, horloge contrôlée, voies natives.
  c,pg,errs=page(880,400)
  def ouvrir(m):
   pg.evaluate(g.OUVRIR,m);pg.evaluate(INIT,m);pg.wait_for_timeout(150)
   pg.locator(GROUPES[m]+'>button').first.scroll_into_view_if_needed();pg.wait_for_timeout(80)
  def etat():return pg.evaluate('RETOURS_FRAPPE.inspecter()')
  def attendre():pg.wait_for_timeout(100)
  ouvrir('ko')
  pg.evaluate("KO.sons[0]='absent270';voixKo(rfTemps,0,1)");attendre();v(etat()['impacts']==0 and etat()['file']==0,'KO sample absent sans témoin')
  pg.evaluate("KO.sons[0]='rfTest';KO_MODE='ptn';majKo();RETOURS_FRAPPE.synchroniser();voixKo(rfTemps,0,1)");attendre();v(etat()['impacts']==0,'KO PATTERN ne clignote pas comme un son')
  pg.evaluate("KO_MODE='fx';majKo();RETOURS_FRAPPE.synchroniser();voixKo(rfTemps,0,1)");attendre();v(etat()['impacts']==0,'KO FX ne clignote pas comme un son')
  pg.evaluate("KO_MODE='son';KO.chroma=true;KO.chromaSource=0;majKo();RETOURS_FRAPPE.synchroniser();voixKo(rfTemps,0,1,-1,5)");attendre()
  v(pg.locator('#ko-pads>button').nth(12).locator('.rf-impact').evaluate('e=>+e.style.opacity>0'),'KO CHROMA correspond à la note, pas à la source')
  pg.evaluate("RETOURS_FRAPPE.effacer();voixKo(rfTemps,0,1,-1,12)");attendre();v(etat()['impacts']==0,'KO note hors clavier sans faux pad')
  pg.evaluate("KO.chroma=false;majKo();RETOURS_FRAPPE.synchroniser();RETOURS_FRAPPE.effacer();jouerVoixFxKo('unison',rfTemps,0,0,0,1,.1)")
  v(etat()['file']==1,'KO unisson : deux voix, une frappe');attendre()
  pg.evaluate("RETOURS_FRAPPE.effacer();KO.motifs[0].pas[0]=1;KO.fxTenu=true;KO.fx=KO_FX.findIndex(x=>x[0]==='stutter4');scheduleKo(0,rfTemps+.08)")
  v(etat()['file']==4,'KO répétition FX : quatre vrais départs')
  pg.evaluate('arretKo()');v(etat()['file']==0,'KO STOP efface aussi les répétitions futures')
  ouvrir('mc')
  pg.evaluate('MC.pistes[0].clips[0][0]=0;MC.pistes[0].muet=true;scheduleMc(0,rfTemps)');attendre();v(etat()['impacts']==0,'MC piste muette sans départ')
  pg.evaluate('MC.pistes[0].muet=false;MC.scatOn=true;MC.scatProf=1;MC.scatType=3;scheduleMc(0,rfTemps+.08)');v(etat()['file']==4,'MC SCATTER : répétitions natives')
  pg.evaluate('arretMc();MC.scatType=2;MC.scatOn=true;scheduleMc(1,rfTemps)');attendre();v(etat()['impacts']==0,'MC SCATTER : pas supprimé sans flash')
  pg.evaluate("MC.pistes[1].type='synth';MC.pistes[1].ech='absent270';voixMc(rfTemps,1,0,1)");attendre();v(etat()['impacts']==0,'MC sample absent sans flash')
  pg.evaluate("MC.pistes[1].ech='rfTest';voixMc(rfTemps,1,12,1)");attendre();v(etat()['impacts']==1,'MC sample transposé')
  pg.evaluate("RETOURS_FRAPPE.effacer();MC.pistes[1].ech='';voixMc(rfTemps,1,0,1)");attendre();v(etat()['impacts']==1,'MC synthé')
  pg.evaluate("RETOURS_FRAPPE.effacer();MC.pistes[1].looper=true;MC.pistes[1].boucles[0]='rfTest';jouerBoucleMc(1,0,0,rfTemps+.08)");v(etat()['file']==1,'MC LOOPER : départ de boucle')
  pg.evaluate('jouerBoucleMc(1,0,1,rfTemps+.08+stepDur())');v(etat()['file']==1,'MC LOOPER : pas de fausse nouvelle frappe à chaque pas')
  ouvrir('stk')
  pg.evaluate('STK.motifs[0].pas[0]=1;STK.pistes[0].muet=true;scheduleStk(0,rfTemps)');attendre();v(etat()['impacts']==0,'STK MUTE sans départ')
  pg.evaluate('STK.solo=0;scheduleStk(0,rfTemps)');attendre();v(etat()['impacts']==1,'STK SOLO prioritaire comme le moteur')
  pg.evaluate('arretStk();STK.solo=1;scheduleStk(0,rfTemps)');attendre();v(etat()['impacts']==0,'STK autre SOLO sans départ')
  pg.evaluate('STK.solo=-1;STK.pistes[0].muet=false;STK.pistes[0].type="instrument";STK.clavierMidi=true;jouerMidiStk(MIDI.base+12,1,MIDI.canalSy);rfTemps+=.02');attendre()
  v(etat()['impacts']==1,'STK entrée MIDI par le chemin natif')
  pg.evaluate('arretStk();STK.pistes[0].slice=true;voixStk(rfTemps,0,false,7,12)');attendre();v(etat()['impacts']==1,'STK tranche instrument')
  # Le callback ne mesure rien dans la géométrie et n'impacte pas le moteur s'il échoue.
  v(pg.evaluate('''()=>{let old=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=()=>{throw Error('géométrie interdite')};
   try{RETOURS_FRAPPE.programmer('stk',ctx,rfTemps,0,null);return true}finally{Element.prototype.getBoundingClientRect=old}}'''),'aucune géométrie dans le callback audio')
  v(pg.evaluate('''()=>{let old=temoinFrappe;temoinFrappe=()=>{throw Error('test')};try{voixStk(rfTemps,0,false,-1,0);return true}finally{temoinFrappe=old}}'''),'défaillance graphique sans exception musicale')
  pg.evaluate('arretStk();for(let i=0;i<300;i++)RETOURS_FRAPPE.programmer("stk",ctx,rfTemps+.08+i*.001,0,null)')
  v(etat()['file']==128,'file plafonnée à 128 départs');pg.evaluate('arretStk()')
  pg.evaluate('RETOURS_FRAPPE.programmer("stk",ctx,rfTemps-1,0,null)');v(etat()['file']==0,'signal périmé ignoré')
  v(pg.evaluate('''()=>{let old=temoinFrappe,n=0;temoinFrappe=()=>n++;Object.defineProperty(ctx,'startRendering',{configurable:true,value:function(){}});
   try{voixStk(rfTemps,0,false,-1,0);return n===0}finally{delete ctx.startRendering;temoinFrappe=old}}'''),'rendu hors ligne exclu avant appel graphique')
  pg.evaluate('RETOURS_FRAPPE.effacer();document.getElementById("unit-stk").dispatchEvent(new Event("scroll",{bubbles:true}))');v(not etat()['enAttente'],'défilement sans témoin résiduel')
  v(not errs,'Scénarios : erreurs JavaScript '+str(errs));c.close()
  # Vraie horloge, sans propriété currentTime de test.
  c,pg,errs=page(880,400);pg.evaluate(g.OUVRIR,'mc');pg.wait_for_timeout(150)
  pg.evaluate('async()=>{audioInit();await ctx.resume();MC.pistes[0].type="drum";MC.pistes[0].looper=false;voixMc(ctx.currentTime+.15,0,0,1)}')
  v(pg.evaluate('RETOURS_FRAPPE.inspecter().impacts')==0,'horloge réelle : départ futur')
  pg.wait_for_function('RETOURS_FRAPPE.inspecter().impacts===1')
  v(True,'horloge réelle : témoin au départ')
  pg.wait_for_function('!RETOURS_FRAPPE.inspecter().enAttente');v(True,'horloge réelle : extinction et repos')
  v(not errs,'Horloge réelle : aucune erreur');c.close();nav.close()
 rapport={'version':270,'verifications':total,'erreurs':erreurs,'formats':formats,'contenu_simule':a.contenu}
 if a.rapport:a.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2))
 print(f'{total} vérifications ; {len(erreurs)} erreur(s).',flush=True)
 return bool(erreurs)
if __name__=='__main__':raise SystemExit(main())
