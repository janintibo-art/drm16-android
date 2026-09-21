#!/usr/bin/env python3
"""v272 : valeurs XY Kaoss, schémas et gestes non interceptés.
Par défaut : page locale et Chromium de Playwright (GitHub).
--contenu : chargement en mémoire et stockage temporaire, sans données personnelles.
"""
import argparse
import importlib.util
import json
import math
from pathlib import Path
from playwright.sync_api import sync_playwright
RACINE=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('graphique',RACINE/'outils/test-graphique.py')
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
FORMATS=[(320,568),(360,640),(393,851),(640,360),(760,400),(880,400),(1024,768)]
NOMS=['filtre','haut','delai','grain','ring','crush','verb','pitch','bande','flanger','phaser','dist','isol','pan','boucle']
NUMERIQUE=r'''async()=>{
 audioInit();await ctx.resume();KP.tenu=true;KP.touche=false;KP.rejoue=false;KP.release=false;
 const n=noeudsKp(),origL=lisseKp,origV=vitesseKp,origB=boucleKp;
 // Geler le rendu : on compare les réglages demandés, pas une valeur que
 // le thread audio pourrait remplacer par celle de son dernier quantum.
 await ctx.suspend();
 const cibles=new Map();let vitesse=null,boucle=null;
 lisseKp=function(p,v){cibles.set(p,v);return origL.apply(this,arguments)};
 vitesseKp=function(r,t){vitesse=[r,t];return origV.apply(this,arguments)};
 boucleKp=function(n,x,m){boucle=[longueurBoucleKp(x),m];return origB.apply(this,arguments)};
 let mesures=0,comparaisons=0,fautes=[];
 function proche(a,b,label){comparaisons++;if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>1e-5*Math.max(1,Math.abs(b)))fautes.push({label,attendu:b,recu:a});}
 try{
 for(let fx=0;fx<15;fx++)for(const x of [0,.23,.5,.79,1])for(const y of [0,.5,.8,1])for(const p of [0,.4,1]){
  KP.fx=fx;KP.x=x;KP.y=y;KP.prof=p;S.bpm=120;cibles.clear();vitesse=null;boucle=null;appliquerKp();
  const m=REPERES_KAOSS.calculer(fx,x,y,p,S.bpm);let a,b;
  switch(m.nom){
   case 'filtre':case 'haut':case 'bande':a=n.f.frequency.value;b=n.f.Q.value;break;
   case 'delai':a=n.d.delayTime.value;b=n.fb.gain.value;proche(m.extra.retour,n.dmix.gain.value,'retour écho');break;
   case 'grain':a=n.lfo.frequency.value;b=n.lprof.gain.value;break;
   case 'ring':a=cibles.get(n.ring.frequency);b=cibles.get(n.rwet.gain);break;
   case 'crush':{
    // Le pas de la courbe native donne l'intervalle de quantification, sans
    // recopier dans le test la formule qui convertit X en résolution.
    const courbe=n.crush.curve,unique=[...new Set(courbe)].sort((a,b)=>a-b);
    a=unique[1]-unique[0];b=cibles.get(n.cw.gain);break;
   }
   case 'verb':a=n.f.frequency.value;b=n.vmix.gain.value;break;
   case 'pitch':a=vitesse[0];b=vitesse[1];break;
   case 'flanger':a=n.lfo2.frequency.value;b=n.ffb.gain.value;proche(m.extra.balayage,n.flfo.gain.value,'flanger balayage');break;
   case 'phaser':a=n.lfo2.frequency.value;b=n.phLfo[0].gain.value/n.phBases[0];
    n.phLfo.forEach((g,i)=>proche(m.axes[1].valeur*m.extra.bases[i],g.gain.value,'phaser bande '+i));break;
   case 'dist':a=n.distK;b=n.dton.frequency.value;break;
   case 'isol':a=x;b=n.iso.reduce((s,q)=>s+q.gain.value,0);
    n.iso.forEach((q,i)=>proche(m.extra.bandes[i],q.gain.value,'isolateur bande '+i));break;
   case 'pan':a=n.lfo2.frequency.value;b=n.plfo.gain.value*2;break;
   case 'boucle':a=boucle[0];b=boucle[1];proche(m.extra.duree,Math.min(7.9,longueurBoucleKp(x)*stepDur()),'durée boucle');break;
  }
  const label=`${m.nom} x=${x} y=${y} p=${p}`;
  proche(m.axes[0].valeur,a,label+' X');proche(m.axes[1].valeur,b,label+' Y');mesures++;
 }
 for(const bpm of [40,73,120,173,220])for(const x of [0,.1999,.2,.3999,.4,.5999,.6,.7999,.8,1]){
  S.bpm=bpm;const m=REPERES_KAOSS.calculer(14,x,.5,.8,bpm);
  proche(m.axes[0].valeur,longueurBoucleKp(x),'frontière boucle');
  proche(m.extra.duree,Math.min(7.9,longueurBoucleKp(x)*stepDur()),'tempo boucle');
 }
 }finally{lisseKp=origL;vitesseKp=origV;boucleKp=origB;KP.tenu=false;KP.fx=0;KP.x=.5;KP.y=.5;KP.prof=.8;S.bpm=120;arretKp();}
 return {mesures,comparaisons,fautes};
}'''
DONNEES='''()=>JSON.stringify({kp:programmeKp(),motion:KP.motion,mpos:KP.mpos,banques:KP.banques,mems:KP.mems,memoire,
 sons:Object.keys(ES.buf),transport:{bpm:S.bpm,run:S.run},ls:Object.fromEntries(Array.from({length:localStorage.length},(_,i)=>{const k=localStorage.key(i);return [k,localStorage.getItem(k)]}))})'''
GEOMETRIE='''()=>{
 const ids=['kp-pav','kp-point','kp-banques','kp-fx-choix','kp-prof','kp-hold','kp-motion','kp-rejoue'];
 return Object.fromEntries(ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return[id,[r.x,r.y,r.width,r.height]]}));
}'''

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true')
 ap.add_argument('--format');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path);a=ap.parse_args()
 total=0;erreurs=[];details={};formats=[tuple(map(int,a.format.split('x')))] if a.format else FORMATS
 def v(ok,msg):
  nonlocal total
  total+=1
  if not ok:erreurs.append(msg);print('FAUX : '+msg,flush=True)
 html=(RACINE/'app/src/main/assets/drm16.html').read_text();ordre=(RACINE/'page/ordre.txt').read_text()
 sources=[]
 for path,precedent in [('css/310-reperes-effets-kaoss.css','css/300-retours-frappe.css'),('js/740-reperes-effets-kaoss.js','js/730-retours-frappe.js')]:
  s=(RACINE/'page'/path).read_text();sources.append(s)
  v(html.count(s)==1,'source unique '+path);v(precedent+'\n'+path+'\n' in ordre,'ordre '+path)
  v((RACINE/'page'/precedent).read_text()+s in html,'concaténation '+path)
 for interdit in ['createBufferSource(','createGain(','createAnalyser(','Math.random(','localStorage.','setInterval(','preventDefault(','stopPropagation(','setPointerCapture(']:
  v(interdit not in sources[1],'module sans '+interdit)
 if a.captures:a.captures.mkdir(parents=True,exist_ok=True)
 try:
  with sync_playwright() as p:
   opts={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
   if a.chromium:opts['executable_path']=a.chromium;opts['args'].append('--no-sandbox')
   nav=p.chromium.launch(**opts)
   def charger(w,h,contenu=None,sans_canvas=False):
    c=nav.new_context(viewport={'width':w,'height':h},has_touch=True,device_scale_factor=2 if w==393 else 1)
    pg=c.new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    if sans_canvas:
     # Le repli vise seulement le nouveau canvas, les autres restent natifs.
     pg.add_init_script("{const avant=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(){return this.id==='rk-schema'?null:avant.apply(this,arguments)}}")
    if a.contenu or contenu is not None:
     pg.evaluate(g.STOCKAGE)
     if sans_canvas:pg.evaluate("()=>{const avant=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(){return this.id==='rk-schema'?null:avant.apply(this,arguments)}}")
     pg.set_content(contenu or html,wait_until='domcontentloaded')
    else:pg.goto((RACINE/'app/src/main/assets/drm16.html').as_uri(),wait_until='domcontentloaded')
    pg.wait_for_function("typeof allerMachine==='function' && typeof REPERES_KAOSS==='object'" if contenu is None else "typeof allerMachine==='function'")
    pg.evaluate(g.OUVRIR,'kp');return c,pg,errs
   def stable(pg):pg.wait_for_function('''()=>{const e=REPERES_KAOSS.inspecter();return !e.enAttente&&!e.masque&&e.modele&&e.modele.fx===KP.fx&&e.modele.x===KP.x&&e.modele.y===KP.y&&e.modele.prof===KP.prof&&e.modele.bpm===S.bpm}''')
   for w,h in formats:
    c,pg,errs=charger(w,h);stable(pg);prefix=f'{w}x{h} '
    def q(ok,msg):v(ok,prefix+msg)
    geo=pg.evaluate(GEOMETRIE)
    # Vraie disposition précédente (retirer uniquement les deux nouveaux blocs).
    ref=html.replace(sources[0],'').replace(sources[1],'')
    cr,pr,er=charger(w,h,ref);pr.wait_for_timeout(200)
    refgeo=pr.evaluate(GEOMETRIE)
    q(all(abs(x-y)<.1 for k in geo for x,y in zip(geo[k],refgeo[k])),'dimensions et positions natives inchangées')
    q(not er,'référence sans erreur');cr.close()
    m=pg.evaluate(g.MESURER)
    q(m['document']<=w+1 and m['interne']<=1,'aucun débordement')
    if w<=880:q(not m['ciblesIncorrectes'],'cibles natives >=44px / textes >=10,5px')
    q(pg.locator('#rk-valeurs').count()==1 and pg.locator('#rk-schema').count()==1,'une seule couche ajoutée')
    for fx in range(15):
     pg.evaluate('(fx)=>{KP.fx=fx;KP.x=.5;KP.y=.8;KP.prof=.8;KP.tenu=false;KP.touche=false;KP.rejoue=false;majKp()}',fx);stable(pg)
     et=pg.evaluate('REPERES_KAOSS.inspecter()');d=et['modele']
     q(d['nom']==NOMS[fx] and all(math.isfinite(a['valeur']) for a in d['axes']),f'{NOMS[fx]} valeurs finies')
     q(pg.locator('#rk-x-valeur').inner_text()==d['axes'][0]['affiche'] and pg.locator('#rk-y-valeur').inner_text()==d['axes'][1]['affiche'],f'{NOMS[fx]} valeurs dans le DOM')
     q(pg.evaluate("[...document.querySelectorAll('#rk-valeurs *')].every(e=>e.scrollWidth<=e.clientWidth+1)"),f'{NOMS[fx]} libellés non tronqués')
     q(pg.evaluate("[...document.querySelectorAll('#rk-valeurs,#rk-valeurs *,#rk-schema')].every(e=>getComputedStyle(e).pointerEvents==='none')"),f'{NOMS[fx]} décor non interactif')
     q(pg.evaluate("document.getElementById('rk-description').textContent.includes('pas une mesure sonore')"),f'{NOMS[fx]} description sans fausse mesure')
     if fx==6:q('brillance' in pg.locator('#kp-lab').inner_text(),'réverbération : légende corrigée')
    # Valeurs suivies pendant le geste réel, y compris sous les cartes de texte.
    pg.evaluate('KP.fx=0;KP.tenu=false;majKp()');stable(pg)
    r=pg.locator('#kp-pav').bounding_box()
    for x,y in [(.12,.78),(.85,.8),(.5,.5),(.08,.1),(.92,.92)]:
     pg.mouse.move(r['x']+r['width']*x,r['y']+r['height']*(1-y));pg.mouse.down();stable(pg)
     et=pg.evaluate('({x:KP.x,y:KP.y,t:KP.touche,e:REPERES_KAOSS.inspecter()})')
     q(et['t'] and abs(et['x']-x)<.025 and abs(et['y']-y)<.025,'appui atteint le pavé sous les repères')
     q(et['e']['modele']['x']==et['x'] and et['e']['modele']['y']==et['y'],'coordonnées suivies')
     pg.mouse.up();pg.wait_for_function('!KP.touche');stable(pg)
    # HOLD immobile : aucune boucle de peinture entretenue.
    pg.evaluate('KP.tenu=true;majKp()');stable(pg);pg.wait_for_timeout(180);stable(pg)
    avant=pg.evaluate('REPERES_KAOSS.inspecter().frames');pg.wait_for_timeout(180)
    q(pg.evaluate('REPERES_KAOSS.inspecter().frames')==avant,'aucun dessin continu en HOLD')
    q(pg.evaluate('parseInt(getComputedStyle(document.getElementById("kp-point")).zIndex)>parseInt(getComputedStyle(document.getElementById("rk-valeurs")).zIndex)'),'point devant les cartes')
    # Rejeu : lecture des coordonnées appliquées par la fonction native.
    pg.evaluate('KP.tenu=false;KP.motion=[[.1,.2],[.8,.3],[.5,.9]];KP.mpos=0;KP.rejoue=true;majKp();scheduleKp(0,0)');stable(pg)
    q(pg.evaluate('KP.x===.1&&KP.y===.2&&REPERES_KAOSS.inspecter().modele.x===.1'),'premier point de PAD MOTION')
    pg.evaluate('scheduleKp(1,0)');stable(pg)
    q(pg.evaluate('KP.x===.8&&KP.y===.3&&REPERES_KAOSS.inspecter().modele.y===.3'),'point suivant de PAD MOTION')
    pg.evaluate('KP.rejoue=false;KP.fx=13;KP.prof=.2;majKp()');stable(pg)
    pg.locator('#kp-prof').evaluate("e=>{e.value='0.67';e.dispatchEvent(new Event('input',{bubbles:true}))}");stable(pg)
    q(abs(pg.evaluate('REPERES_KAOSS.inspecter().modele.prof')-.67)<1e-8,'FX DEPTH natif suivi')
    pg.evaluate('KP.mems[0]={fx:4,prof:.3,x:.2,y:.9,tenu:true,release:false};toucheMemoireKp(0);majKp()');stable(pg)
    q(pg.evaluate('REPERES_KAOSS.inspecter().modele.nom==="ring"&&REPERES_KAOSS.inspecter().modele.prof===.3'),'rappel mémoire suivi')
    # Dessiner ne doit pas modifier les banques, les mouvements ou la mémoire.
    pg.wait_for_timeout(700);avant=pg.evaluate(DONNEES)
    pg.evaluate('REPERES_KAOSS.reveiller()');stable(pg)
    q(pg.evaluate(DONNEES)==avant,'dessin sans écriture de données musicales')
    pg.evaluate('KP.muet=true;majKp()');stable(pg);q('MUTE' in pg.locator('#rk-legende').inner_text(),'sortie muette signalée')
    pg.evaluate('KP.muet=false;KP.tenu=false;majKp()');stable(pg)
    pg.emulate_media(reduced_motion='reduce');pg.wait_for_function('REPERES_KAOSS.inspecter().reduit');stable(pg)
    q(pg.evaluate('REPERES_KAOSS.inspecter().reduit'),'réduction des mouvements prise en compte')
    pg.emulate_media(reduced_motion='no-preference');pg.wait_for_function('!REPERES_KAOSS.inspecter().reduit');stable(pg)
    if a.captures:
     pg.evaluate('KP.fx=11;KP.x=.65;KP.y=.6;KP.tenu=true;majKp()');stable(pg)
     pg.screenshot(path=str(a.captures/f'kaoss-{w}x{h}.png'))
    q(not errs,'aucune erreur JavaScript '+str(errs));c.close();print(f'Contrôlé : {w}x{h}',flush=True)
   c,pg,errs=charger(880,400);stable(pg)
   for panel in ['menu','note','bib','enr','pr','table','syro','studio','nexus','audio-diagnostic']:
    present=pg.evaluate('(id)=>!!document.getElementById(id)',panel)
    if not present:continue
    pg.evaluate('''id=>{const e=document.getElementById(id);if(id==='menu')e.classList.remove('hide');else e.classList.add('show')}''',panel)
    pg.wait_for_function('REPERES_KAOSS.inspecter().masque&&!REPERES_KAOSS.inspecter().enAttente')
    n=pg.evaluate('REPERES_KAOSS.inspecter().frames');pg.evaluate('KP.x=.77;majPavKp()');pg.wait_for_timeout(140)
    v(pg.evaluate('REPERES_KAOSS.inspecter().frames')==n,'aucun dessin sous '+panel)
    pg.evaluate('''id=>{const e=document.getElementById(id);if(id==='menu')e.classList.add('hide');else e.classList.remove('show')}''',panel);stable(pg)
    v(pg.evaluate('REPERES_KAOSS.inspecter().modele.x')==.77,'retour depuis '+panel)
   for depart,retour in [('pagehide','pageshow')]:
    pg.evaluate('(ev)=>window.dispatchEvent(new Event(ev))',depart);pg.wait_for_function('REPERES_KAOSS.inspecter().masque')
    n=pg.evaluate('REPERES_KAOSS.inspecter().frames');pg.evaluate('KP.x=.22;majPavKp()');pg.wait_for_timeout(120)
    v(pg.evaluate('REPERES_KAOSS.inspecter().frames')==n,'pagehide sans dessin')
    pg.evaluate('(ev)=>window.dispatchEvent(new Event(ev))',retour);stable(pg)
    v(pg.evaluate('REPERES_KAOSS.inspecter().modele.x')==.22,'pageshow actualisé')
   pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
   pg.wait_for_function('REPERES_KAOSS.inspecter().masque&&!REPERES_KAOSS.inspecter().enAttente');v(True,'arrière-plan sans boucle')
   pg.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))");stable(pg)
   pg.evaluate('async()=>{audioInit();await ctx.resume();REPERES_KAOSS.reveiller()}');stable(pg)
   pg.evaluate('async()=>{await ctx.suspend()}');pg.wait_for_function("document.getElementById('rk-legende').textContent.includes('AUDIO EN PAUSE')");stable(pg)
   v('AUDIO EN PAUSE' in pg.locator('#rk-legende').inner_text(),'audio suspendu signalé')
   pg.evaluate('async()=>{await ctx.resume()}');stable(pg)
   pg.evaluate('window.rkContexte=ctx;ctx=new OfflineAudioContext(1,256,8000);REPERES_KAOSS.reveiller()')
   v(pg.evaluate('REPERES_KAOSS.inspecter().masque&&!REPERES_KAOSS.inspecter().enAttente'),'rendu hors ligne exclu')
   pg.evaluate('ctx=rkContexte;REPERES_KAOSS.reveiller()');stable(pg)
   numerique=pg.evaluate(NUMERIQUE);details['numerique']=numerique
   v(not numerique['fautes'],f"formules natives : {numerique['comparaisons']} comparaisons ; {str(numerique['fautes'][:5])}")
   stable(pg)
   v(not errs,'validation numérique sans erreur de page '+str(errs));c.close()
   c,pg,errs=charger(880,400,sans_canvas=True);stable(pg)
   v(pg.locator('#rk-x-valeur').inner_text()!='' and pg.locator('#rk-schema').get_attribute('hidden') is not None,'repli sans canvas : chiffres conservés')
   v(not errs,'repli sans erreur');c.close();nav.close()
 except Exception as e:
  erreurs.append(type(e).__name__+': '+str(e));print('ERREUR : '+str(e),flush=True)
 finally:
  rapport={'version':272,'formats':formats,'verifications':total,'erreurs':erreurs,'details':details,'contenu_simule':a.contenu}
  if a.rapport:
   a.rapport.parent.mkdir(parents=True,exist_ok=True);a.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2))
 print(f'{total} vérifications ; {len(erreurs)} erreur(s).',flush=True)
 if 'numerique' in details:print(f"{details['numerique']['mesures']} réglages ; {details['numerique']['comparaisons']} comparaisons numériques.",flush=True)
 return bool(erreurs)
if __name__=='__main__':raise SystemExit(main())
