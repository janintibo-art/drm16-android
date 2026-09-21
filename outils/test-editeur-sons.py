#!/usr/bin/env python3
"""v274 : onde stéréo, cadrage indépendant, bornes et commandes natives.
Page locale par défaut (GitHub). --contenu : page en mémoire, stockage isolé.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('graphique', RACINE/'outils/test-graphique.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
FORMATS = [(320,568),(360,640),(393,851),(640,360),(760,400),(880,400),(1024,768)]
CREER = """([canaux,n,sr])=>{
 const b=ctx.createBuffer(canaux,n,sr);
 for(let k=0;k<canaux;k++){
  const c=b.getChannelData(k);
  for(let i=0;i<n;i++)c[i]=(k?.4:.75)*Math.sin(i*(k?.057:.027))*Math.exp(-(i%12000)/5500);
 }
 ES.buf.uv274=b; BIB.noms.uv274='Batterie · essai '+canaux+' canaux';edOuvrir('uv274');
 return {a:ED.a,b:ED.b,n:edLongueur(ED.ch)};
}"""
ETAT = """()=>JSON.stringify({a:ED.a,b:ED.b,modifie:ED.modifie,pile:ED.pile.length,id:ED.id,
 set:SET.actives,run:S.run,bpm:S.bpm,modele:S.modele})"""


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true')
    ap.add_argument('--format');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path)
    args=ap.parse_args();total=0;erreurs=[];details=[]
    def verifier(ok,msg):
        nonlocal total
        total+=1
        if not ok:erreurs.append(msg);print('FAUX : '+msg,flush=True)
    html=(RACINE/'app/src/main/assets/drm16.html').read_text(encoding='utf-8')
    ordre=(RACINE/'page/ordre.txt').read_text(encoding='utf-8')
    for prev,new in [('css/320-focus-mixage.css','css/330-editeur-sons.css'),('js/750-focus-mixage.js','js/760-editeur-sons.js')]:
        src=(RACINE/'page'/new).read_text(encoding='utf-8')
        verifier(html.count(src)==1,'fragment unique '+new)
        verifier(prev+'\n'+new+'\n' in ordre,'ordre '+new)
        verifier((RACINE/'page'/prev).read_text(encoding='utf-8')+src in html,'assemblage '+new)
    js=(RACINE/'page/js/760-editeur-sons.js').read_text(encoding='utf-8')
    for interdit in ['createGain(', 'createBufferSource(', 'createAnalyser(', 'setInterval(', 'localStorage.', 'Math.random(', 'cloneNode(']:
        verifier(interdit not in js,'vue sans '+interdit)
    formats=[tuple(map(int,args.format.split('x')))] if args.format else FORMATS
    if args.captures:args.captures.mkdir(parents=True,exist_ok=True)
    try:
        with sync_playwright() as p:
            opts={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
            if args.chromium:opts['executable_path']=args.chromium;opts['args'].append('--no-sandbox')
            browser=p.chromium.launch(**opts)
            for w,h in formats:
                ctxb=browser.new_context(viewport={'width':w,'height':h},has_touch=True)
                page=ctxb.new_page();page.set_default_timeout(6000);errs=[]
                page.on('pageerror',lambda e:errs.append(str(e)))
                def v(ok,msg):verifier(ok,str(w)+'x'+str(h)+' : '+msg)
                if args.contenu:
                    page.evaluate(g.STOCKAGE);page.set_content(html,wait_until='domcontentloaded')
                else:page.goto((RACINE/'app/src/main/assets/drm16.html').as_uri(),wait_until='domcontentloaded')
                page.wait_for_timeout(500)
                page.evaluate("""()=>{
                  menu.classList.add('hide');document.body.classList.remove('menu-ouvert');ouvrirBib();
                  const f=edBrancherOnde;edBrancherOnde=function(){
                    window.__evOriginaux=[...document.querySelectorAll('#ed button,#ed select,#ed input,#ed canvas')];return f.apply(this,arguments);
                  };
                }""")
                page.evaluate(CREER,[2,96000,48000]);page.wait_for_function('ED_VUE.inspecter().canaux===2 && !ED_VUE.inspecter().attente')
                page.evaluate('window.__evCanaux=ED.ch;window.__evEch=ES.buf.uv274;window.__evPiles=ED.pile')
                debut=page.evaluate(ETAT)
                mesure=page.evaluate("""()=>{
                 const e=document.getElementById('ed');const c=[...e.querySelectorAll('button,input,select')].filter(e=>e.getClientRects().length);
                 return {document:document.documentElement.scrollWidth,ed:e.scrollWidth-e.clientWidth,
                  petits:c.map(e=>({id:e.id,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(e=>e.w<43.9||e.h<43.9),
                  textes:c.every(e=>parseFloat(getComputedStyle(e).fontSize)>=10.5),
                  noms:c.every(e=>e.getAttribute('aria-label')||e.textContent||e.labels&&e.labels.length),
                  originaux:__evOriginaux.every(e=>e.isConnected),
                  corps:document.querySelectorAll('#ed').length,cv:document.querySelectorAll('#ed-onde').length,
                  grille:getComputedStyle(e).gridTemplateColumns,
                  limite:document.getElementById('ed-b').getAttribute('aria-valuetext')};
                }""")
                details.append({'format':[w,h],'mesure':mesure})
                v(mesure['document']<=w and mesure['ed']<=1,'aucun débordement horizontal')
                v(not mesure['petits'],'cibles >=44 px '+str(mesure['petits']))
                v(mesure['textes'],'textes des commandes >=10,5 px')
                v(mesure['noms'],'commandes nommées')
                v(mesure['originaux'] and mesure['corps']==1 and mesure['cv']==1,'éléments natifs conservés, sans clone')
                v((' ' in mesure['grille'])==(w>=760 and w>h),'deux colonnes en paysage large seulement')
                v('96000 échantillons' in mesure['limite'],'valeur accessible de fin')
                v(page.locator('#ed-onde').get_attribute('aria-label').startswith('Onde stéréo'),'canaux annoncés')
                v(page.locator('#ev-a').input_value()=='0,000000' and page.locator('#ev-b').input_value()=='2,000000','temps initiaux exacts')
                v(page.locator('#ev-zoom-moins').is_disabled() and page.locator('#ev-pan').is_disabled(),'vue complète : zoom arrière et pan désactivés')
                v(page.evaluate('ED_VUE.inspecter().octetsCache')==6000,'cache deux canaux réduit à 6000 octets pour 96000 points')
                n0=page.evaluate('ED_VUE.inspecter().dessins');page.wait_for_timeout(220)
                v(page.evaluate('ED_VUE.inspecter().dessins')==n0,'pas de dessin continu au repos')
                # Zoom et déplacement : ni sélection, ni données, ni mémoire ne changent.
                for _ in range(6):page.locator('#ev-zoom-plus').click()
                v(page.locator('#ev-zoom-plus').is_disabled(),'plafond de zoom x64')
                v(page.evaluate('ED_VUE.inspecter().longueur')==1500,'largeur exacte à x64')
                page.locator('#ev-pan').evaluate("e=>{e.value=e.max;e.dispatchEvent(new Event('input',{bubbles:true}))}")
                v(page.evaluate('ED_VUE.inspecter().debut')==94500,'déplacement jusqu’à la fin du son')
                page.locator('#ev-tout').click()
                v(page.evaluate('ED_VUE.inspecter().longueur')==96000,'TOUT VOIR restaure le cadrage entier')
                v(page.evaluate(ETAT)==debut,'zoom et déplacement sans modifier les données ou la sélection')
                v(page.evaluate('ED.ch===__evCanaux && ES.buf.uv274===__evEch && ED.pile===__evPiles'),'tampons et pile inchangés après cadrage')
                res=page.evaluate("""()=>{
                  const oldMem=writeMem,oldBib=bibEcrire;let mem=0;
                  writeMem=function(){mem++;return oldMem.apply(this,arguments)};bibEcrire=function(){mem++;return oldBib.apply(this,arguments)};
                  try{document.getElementById('ev-zoom-plus').click();document.getElementById('ev-selection').click();document.getElementById('ev-tout').click();return mem;}
                  finally{writeMem=oldMem;bibEcrire=oldBib;}
                }""")
                v(res==0,'commandes de cadrage sans écriture de mémoire')
                # Un bouton ± utilise l’événement du curseur natif une fois seulement.
                page.evaluate("""()=>{window.__evInputs=0;document.getElementById('ed-a').addEventListener('input',()=>__evInputs++);document.getElementById('ed-b').addEventListener('input',()=>__evInputs++);} """)
                page.locator('#ev-a-plus').click();v(page.evaluate('ED.a')==48,'plus 1 ms à 48 kHz')
                v(page.evaluate('__evInputs')==1,'un seul événement natif')
                page.locator('#ev-pas').select_option('sample');page.locator('#ev-a-plus').click()
                v(page.evaluate('ED.a')==49,'plus un échantillon')
                page.locator('#ev-a-moins').click();v(page.evaluate('ED.a')==48,'moins un échantillon réversible')
                page.locator('#ev-pas').select_option('10');page.locator('#ev-b-moins').click()
                v(page.evaluate('ED.b')==95520,'moins 10 ms à 48 kHz')
                # Le clavier natif du range reste utilisable avec le zoom actif.
                page.locator('#ed-a').focus();ancien=page.evaluate('ED.a');page.keyboard.press('ArrowRight')
                v(page.evaluate('ED.a')==ancien+1,'curseur natif au clavier')
                page.locator('#ev-a').fill('0,250');page.locator('#ev-a').press('Enter')
                page.locator('#ev-b').fill('1.75');page.locator('#ev-b').press('Enter')
                v(page.evaluate('[ED.a,ED.b]')==[12000,84000],'saisie décimale avec virgule ou point')
                page.locator('#ev-a').fill('pas un temps');page.locator('#ev-a').press('Enter')
                v(page.locator('#ev-a').get_attribute('aria-invalid')=='true' and page.evaluate('ED.a')==12000,'saisie incorrecte signalée, sans modification')
                page.locator('#ev-a').focus();page.locator('#ev-a').press('Escape')
                v(page.locator('#ev-a').input_value()=='0,250000','Échap restaure la valeur du champ')
                page.locator('#ev-a').fill('999');page.locator('#ev-a').press('Enter')
                v(page.evaluate('[ED.a,ED.b]')==[83998,84000] and page.locator('#ev-a-plus').is_disabled(),'début limité à fin moins deux échantillons')
                page.locator('#ev-b').fill('0');page.locator('#ev-b').press('Enter')
                v(page.evaluate('[ED.a,ED.b]')==[83998,84000] and page.locator('#ev-b-moins').is_disabled(),'fin limitée à début plus deux échantillons')
                page.evaluate('ED.a=12000;ED.b=36000;majEditeur()');initial=page.evaluate(ETAT)
                page.locator('#ev-selection').click()
                v(page.evaluate('[ED_VUE.inspecter().debut,ED_VUE.inspecter().longueur]')==[12000,24000],'VOIR LA SÉLECTION cadre ses bornes')
                v(page.evaluate(ETAT)==initial,'cadrage de sélection sans la modifier')
                # Geste réel dans une vue zoomée ; pointer capture hors du canvas.
                cv=page.locator('#ed-onde');cv.scroll_into_view_if_needed();r=cv.bounding_box()
                page.mouse.move(r['x']+.10*r['width'],r['y']+.40*r['height']);page.mouse.down()
                page.mouse.move(r['x']+.25*r['width'],r['y']+.40*r['height']);page.mouse.up()
                v(abs(page.evaluate('ED.a')-18000)<=100 and page.evaluate('ED.b')==36000,'glisser DÉBUT dans la fenêtre zoomée, pas dans le son entier')
                cv.scroll_into_view_if_needed();r=cv.bounding_box()
                page.mouse.move(r['x']+.9*r['width'],r['y']+.40*r['height']);page.mouse.down()
                page.mouse.move(r['x']+r['width']+20,r['y']+.40*r['height']);page.mouse.up()
                v(page.evaluate('ED.b')==36000,'borne capturée hors du canvas reste dans la fenêtre')
                # Plusieurs pointeurs et annulation : le deuxième ne vole pas le geste.
                res=page.evaluate("""()=>{const c=document.getElementById('ed-onde'),r=c.getBoundingClientRect();
                  function ev(type,id,x,primary){c.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',isPrimary:primary,clientX:r.left+x*r.width,clientY:r.top+40,bubbles:true,cancelable:true}));}
                  ED.a=15000;ED.b=34000;majEditeur();ev('pointerdown',10,.2,true);const a=ED.a;
                  ev('pointerdown',11,.8,false);ev('pointermove',11,.9,false);ev('pointerup',11,.9,false);const secondaire=ED.a===a&&ED.b===34000;
                  ev('pointercancel',10,.2,true);ev('pointermove',10,.5,true);return secondaire&&ED.a===a;
                }""")
                v(res,'pointeur secondaire ignoré et annulation nettoyée')
                # Min/max exacts indépendants G/D, y compris impulsions isolées.
                vals=page.evaluate("""()=>{
                  const n=70001,a=new Float32Array(n),b=new Float32Array(n);a[32769]=.875;a[65535]=-.625;b[32770]=-.75;b[4096]=.5;
                  ED.ch=[a,b];ED.a=0;ED.b=n;majEditeur();return [ED_VUE.cretes(0,0,n),ED_VUE.cretes(1,0,n),ED_VUE.cretes(0,32760,32780),ED_VUE.cretes(1,32760,32780),ED_VUE.cretes(0,0,32768)];
                }""")
                v(vals==[[-.625,.875],[-.75,.5],[0,.875],[-.75,0],[0,0]],'min/max exacts sans manquer les impulsions d’un échantillon')
                v(page.evaluate('ED_VUE.inspecter().longueur')==70001,'nouvelle longueur recadrée sans accès hors tampon')
                page.evaluate('ED.ch=[new Float32Array(70001),new Float32Array(70001)];majEditeur()')
                v(page.evaluate('ED_VUE.cretes(0,0,70001)')==[0,0],'cache invalidé sur un nouveau tampon de même longueur')
                # Une comparaison indépendante parcourt aussi des signaux à décalage continu.
                pics=page.evaluate("""()=>{
                  const a=new Float32Array(8193);for(let i=0;i<a.length;i++)a[i]=.35+Math.sin(i*.017)*.5;
                  ED.ch=[a];ED.a=0;ED.b=a.length;majEditeur();let erreurs=0;
                  for(let j=0;j<64;j++){
                    const d=(j*97)%a.length,f=Math.min(a.length,d+1+j*79);let lo=Infinity,hi=-Infinity;
                    for(let i=d;i<f;i++){lo=Math.min(lo,a[i]);hi=Math.max(hi,a[i])}
                    const p=ED_VUE.cretes(0,d,f);if(p[0]!==lo||p[1]!==hi)erreurs++;
                  }
                  return erreurs;
                }""")
                v(pics==0,'64 fenêtres : extrema identiques au calcul indépendant, y compris décalage continu')
                # Les traitements natifs et l’annulation utilisent les mêmes canaux.
                page.evaluate(CREER,[2,96000,48000])
                page.evaluate('ED.a=12000;ED.b=36000;majEditeur();window.__evAvant=ED.ch;window.__evOriginal=ES.buf.uv274.getChannelData(0)[14000]')
                page.locator('#ev-selection').click();page.locator('#ed-rogner').click()
                v(page.evaluate('edLongueur(ED.ch)')==24000,'rogner natif toujours disponible')
                v(page.evaluate('ED.ch[0][0]===__evAvant[0][12000] && ED.ch[1][23999]===__evAvant[1][35999]'),'rogner conserve les deux canaux attendus')
                v(page.evaluate('ED.modifie && ED.pile.length===1 && ED_VUE.inspecter().longueur===24000'),'modification, pile et cadrage cohérents')
                page.locator('#ed-annuler').click()
                v(page.evaluate('ED.ch===__evAvant && ED.a===12000 && ED.b===36000 && !ED.modifie'),'annulation native restaure les données et la sélection')
                v(page.evaluate('ES.buf.uv274.getChannelData(0)[14000]===__evOriginal'),'pas de changement du tampon original pendant l’édition')
                # Écoute : les arguments de source.start restent ceux de l’éditeur natif.
                ecoute=page.evaluate("""()=>{
                  const c=ctx.createBufferSource.bind(ctx);let trace=null;
                  ctx.createBufferSource=function(){const s=c(),f=s.start.bind(s);s.start=function(){trace=[...arguments];return f(...arguments)};return s};
                  try{edEcouter();return trace;}finally{ctx.createBufferSource=c;edArreterEcoute();}
                }""")
                v(ecoute==[0,.25,.5],'écoute native : départ et durée de la sélection inchangés')
                # Retour sur la vue pour la capture, avant les tests de visibilité.
                page.locator('#ev-tout').click();page.evaluate("document.querySelector('#bib>.note-corps').scrollTop=0")
                page.wait_for_function('!ED_VUE.inspecter().attente')
                if args.captures:page.screenshot(path=str(args.captures/f'editeur-{w}x{h}.png'))
                page.evaluate('fermerBib()');page.wait_for_timeout(80);n0=page.evaluate('ED_VUE.inspecter().dessins')
                page.evaluate('majEditeur();window.dispatchEvent(new Event("resize"))');page.wait_for_timeout(120)
                v(page.evaluate('ED_VUE.inspecter().dessins')==n0 and not page.evaluate('ED_VUE.inspecter().attente'),'éditeur masqué : aucun dessin programmé')
                v(page.evaluate('ED_VUE.inspecter().octetsCache')==0,'cache graphique libéré quand masqué')
                page.evaluate('ouvrirBib()');page.wait_for_function('ED_VUE.inspecter().canaux===2&&!ED_VUE.inspecter().attente')
                v(page.locator('#ev-a').count()==1 and page.locator('#ed-onde').count()==1,'réouverture sans duplication de commandes')
                page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
                n0=page.evaluate('ED_VUE.inspecter().dessins');page.evaluate('majEditeur()');page.wait_for_timeout(100)
                v(page.evaluate('ED_VUE.inspecter().dessins')==n0,'arrière-plan : rendu au repos')
                page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
                page.wait_for_function('ED_VUE.inspecter().canaux===2&&!ED_VUE.inspecter().attente')
                v(page.evaluate('ED_VUE.inspecter().dessins')>n0,'retour au premier plan : onde actualisée')
                page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(100)
                n0=page.evaluate('ED_VUE.inspecter().dessins');page.wait_for_timeout(100)
                v(page.evaluate('ED_VUE.inspecter().dessins')==n0,'réduction des mouvements : pas d’animation permanente')
                # Portrait/paysage : redimensionnement réel et conservation du cadrage.
                avant=page.evaluate('[ED.a,ED.b,ED_VUE.inspecter().debut,ED_VUE.inspecter().longueur]')
                page.set_viewport_size({'width':h,'height':w});page.wait_for_timeout(100)
                v(page.evaluate('[ED.a,ED.b,ED_VUE.inspecter().debut,ED_VUE.inspecter().longueur]')==avant,'rotation conserve sélection et cadrage')
                v(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'pas de débordement après rotation')
                page.set_viewport_size({'width':w,'height':h})
                # Mono et multicanal : l’étiquette correspond à ce qui est dessiné.
                page.evaluate(CREER,[1,48000,48000]);page.wait_for_function('ED_VUE.inspecter().canaux===1&&!ED_VUE.inspecter().attente')
                v(page.locator('#ed-onde').get_attribute('aria-label').startswith('Onde mono'),'aperçu mono identifié')
                page.evaluate(CREER,[4,48000,48000]);page.wait_for_function('ED_VUE.inspecter().canaux===2&&!ED_VUE.inspecter().attente')
                v('deux premiers canaux' in page.locator('#ed-onde').get_attribute('aria-label') and 'sur 4' in page.locator('.ev-aide').inner_text(),'multicanal : limite de l’aperçu explicitement annoncée')
                page.evaluate(CREER,[1,44100,44100]);page.wait_for_function('!ED_VUE.inspecter().attente')
                v('44100 Hz' in page.locator('#ed-info').inner_text(),'fréquence de 44,1 kHz affichée sans arrondi à 44 kHz')
                page.locator('#ev-pas').select_option('1');page.locator('#ev-a-plus').click()
                v(page.evaluate('ED.a')==44,'1 ms arrondi à un nombre entier d’échantillons à 44,1 kHz')
                page.evaluate(CREER,[1,2,48000]);page.wait_for_function('!ED_VUE.inspecter().attente')
                v(page.locator('#ev-a-plus').is_disabled() and page.locator('#ev-b-moins').is_disabled(),'son de deux échantillons : bornes protégées')
                page.evaluate(CREER,[1,1,48000]);page.wait_for_function('!ED_VUE.inspecter().attente')
                v(page.locator('#ed-a').is_disabled() and page.locator('#ed-b').is_disabled(),'son d’un échantillon : curseurs non exploitables désactivés')
                page.evaluate('edFermer(true)')
                v(not page.evaluate('ED_VUE.inspecter().ouverte') and not page.evaluate('document.getElementById("bib").classList.contains("ev-edition")'),'fermer l’éditeur nettoie sa vue')
                v(page.locator('#ed').count()==0,'retour à la liste des sons')
                v(not errs,'aucune erreur de page '+str(errs))
                ctxb.close();print(f'Contrôlé : {w}x{h}',flush=True)
            browser.close()
    except Exception as e:
        verifier(False,'exception '+repr(e))
    rapport={'version':274,'formats':formats,'verifications':total,'erreurs':erreurs,'details':details,'contenu_simule':args.contenu}
    if args.rapport:
        args.rapport.parent.mkdir(parents=True,exist_ok=True)
        args.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Atelier sons : {total} vérifications, {len(erreurs)} erreur(s).',flush=True)
    return bool(erreurs)


if __name__=='__main__':raise SystemExit(main())
