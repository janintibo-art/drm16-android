#!/usr/bin/env python3
"""v289 : quatre montages, Focus et vrais signaux Web Audio (sans simulation du DSP).
--contenu charge la page en mémoire avec un stockage temporaire, sans disque natif.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
R = Path(__file__).resolve().parents[1]
def charger(n):
    s=importlib.util.spec_from_file_location(n,Path(__file__).with_name(n+'.py'))
    m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
G=charger('test-graphique');RV=charger('test-rave')
FORMATS=[(320,568),(360,640),(393,851),(640,360),(880,400),(1280,800),(1920,1080)]
IDS=['couleur-inde','couleur-inde-transe','couleur-balkans7','couleur-dabke']
TYPES=['cordesreso','anchelead','peauxduo']
STRUCTURE=RV.STRUCTURE.replace("p.fam==='rave'","p.fam==='couleurs'")
TAILLES=r'''()=>{const z=document.querySelector('#eur-focus .ef-zone');return {deb:z.scrollWidth-z.clientWidth,bad:[...document.querySelectorAll('#eur-focus button,#eur-focus select,#eur-focus [role=slider]')].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9;}).map(e=>e.outerHTML.slice(0,90))};}'''
AUDIO=r'''async ({id,sr})=>{
 stop();const p=EUR_MONTAGES.find(p=>p.id===id),dt=60/p.bpm/4,start=.1,n=p.cyclePas*13,fin=start+n*dt;
 if(ctx&&ctx.close&&!ctx.startRendering)await ctx.close();
 ctx=new OfflineAudioContext(12,Math.ceil((fin+1.8)*sr),sr);batirAudio();eurMonter(p);
 EUR.bus.disconnect();const merge=ctx.createChannelMerger(12);merge.connect(ctx.destination);
 const split=ctx.createChannelSplitter(2);EUR.bus.connect(split);split.connect(merge,0,0);split.connect(merge,1,1);
 const m=k=>EUR.mods[p.reperes[k]],sc=p.reperes.scenes!==undefined?m('scenes'):null;
 const stems=['mixBatterie','basse','melodie','reponse','peaux','kick'];stems.forEach((k,i)=>m(k).io.s.out.connect(merge,0,2+i));
 if(sc)['a','b','c','d'].forEach((k,i)=>sc.io.s[k].connect(merge,0,8+i));
 const journal=[],events=[];
 if(sc){const native=sc.recevoir;sc.recevoir=function(t,e){const f=native(t,e);if(e==='in'&&f?.includes('bar'))journal.push({t,scene:sc.scenes8.scene,niveaux:[...sc.scenes8.niveaux]});return f;};}
 const lead=m('melodie'),orig=lead.recevoir;lead.recevoir=function(t,e){if(e==='trig')events.push(t);return orig(t,e);};
 let seed=289,old=Math.random;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 cache=true;try{for(let i=0;i<n;i++){OFF_T=start+i*dt;scheduleEur(i%16,OFF_T);purgerSources();}OFF_T=fin;arretEur();}finally{OFF_T=-1;cache=false;Math.random=old;}
 const b=await ctx.startRendering(),stats=[];
 for(let c=0;c<8;c++){const d=b.getChannelData(c);let peak=0,sum=0,dc=0,bad=0;for(const x of d){if(!Number.isFinite(x)){bad++;continue;}peak=Math.max(peak,Math.abs(x));sum+=x*x;dc+=x;}stats.push({c,nom:c<2?'sortie '+c:stems[c-2],peak,rms:Math.sqrt(sum/d.length),dc:dc/d.length,bad});}
 const cv=[];for(const e of journal)for(let j=0;j<4;j++){const t=e.t+sc.p.fade/1000+.003,lu=b.getChannelData(8+j)[Math.round(t*sr)];cv.push({scene:e.scene,voie:j,ok:Math.abs(lu-e.niveaux[j]/100)<.002});}
 const clean=['basse','melodie','reponse','peaux'].map(k=>{const c=2+stems.indexOf(k),d=b.getChannelData(c);let peak=0;for(let i=Math.ceil((fin+.05)*sr);i<d.length;i++)peak=Math.max(peak,Math.abs(d[i]));return {k,peak};});
 const wanted=[];for(let i=0;i<n;i++){const seq=m('seqMelodie'),s=i%seq.p.len+1;if(seq.p['on'+s])wanted.push(start+i*dt);}
 return {id,sr,steps:n,stats,journal,cv,clean,events:events.length,expected:wanted.length,timing:events.length===wanted.length&&events.every((t,i)=>Math.abs(t-wanted[i])<1e-7),sources:[...new Set(EUR.mods.filter(m=>m.couleurs).map(m=>m.couleurs.sources()))]};
}'''
SIGNAL=r'''async ({type,sr,kind,cv})=>{
 stop();if(ctx&&ctx.close&&!ctx.startRendering)await ctx.close();ctx=new OfflineAudioContext(3,Math.ceil(sr*2),sr);
 let p={dec:650,niv:.8,buzz:.4,mode:.6,res:.8,vib:0,grace:0,attack:4,tone:.8};
 if(kind==='max')p=Object.fromEntries(EUR_CAT[type].kns.map(k=>[k[0],k[3]]));
 if(kind==='min')p=Object.fromEntries(EUR_CAT[type].kns.map(k=>[k[0],k[2]]));
 if(kind==='mute')p.niv=0;
 const m={type,p};m.io=EUR_CAT[type].creer(m);const merge=ctx.createChannelMerger(3);merge.connect(ctx.destination);m.io.s.out.connect(merge,0,0);
 if(type==='peauxduo'){m.io.s.lowout.connect(merge,0,1);m.io.s.highout.connect(merge,0,2);}
 else{const v=ctx.createConstantSource();v.offset.value=cv;v.connect(m.io.e.voct);v.start();}
 const port=type==='peauxduo'?'low':'trig';
 if(kind!=='silence'){
  if(kind==='rapid'){for(let i=0;i<100;i++){m.recevoir(.1+i*.01,port);if(type==='peauxduo')m.recevoir(.1+i*.01,'high');}}
  else{m.recevoir(.1,port);if(type==='peauxduo')m.recevoir(.1,'high');}
 }
 if(kind==='stop'||kind==='rst'){m.recevoir(.4,port);if(type==='peauxduo')m.recevoir(.4,'high');if(kind==='stop'){OFF_T=.32;m.arreter();OFF_T=-1;}else m.recevoir(.32,'rst');}
 if(kind==='gain'){m.io.s.out.gain.setValueAtTime(0,.32);}
 const b=await ctx.startRendering(),y=b.getChannelData(0);let peak=0,power=0,bad=0,late=0,sumError=0;
 for(let i=0;i<y.length;i++){const x=y[i];if(!Number.isFinite(x))bad++;peak=Math.max(peak,Math.abs(x));power+=x*x;if(i>sr*.37)late=Math.max(late,Math.abs(x));if(type==='peauxduo'&&kind!=='gain')sumError=Math.max(sumError,Math.abs(x-b.getChannelData(1)[i]-b.getChannelData(2)[i]));}
 let pitch=null;
 if(kind==='pitch'){
  const f=55*Math.pow(2,cv),from=Math.ceil(.17*sr),to=Math.ceil(.37*sr),scores=[];
  // Analyse locale autour du fondamental attendu, pas de détecteur simulé.
  for(let k=-5;k<=5;k++){const freq=f+k;let re=0,im=0;for(let i=from;i<to;i++){const win=.5-.5*Math.cos(2*Math.PI*(i-from)/(to-from-1)),a=2*Math.PI*freq*i/sr;re+=y[i]*win*Math.cos(a);im+=y[i]*win*Math.sin(a);}scores.push([freq,re*re+im*im]);}
  scores.sort((a,b)=>b[1]-a[1]);pitch={expected:f,measured:scores[0][0],power:scores[0][1]};
 }
 return {type,sr,kind,cv,peak,rms:Math.sqrt(power/y.length),bad,late,sumError,pitch,remaining:m.couleurs.sources()};
}'''

REPEATS=r"""async ({type,sr})=>{
 stop();if(ctx&&ctx.close&&!ctx.startRendering)await ctx.close();ctx=new OfflineAudioContext(1,sr*2,sr);
 const m={type,p:{dec:650,res:.4,vib:0,grace:0}},port=type==='peauxduo'?'low':'trig';m.io=EUR_CAT[type].creer(m);m.io.s.out.connect(ctx.destination);
 if(type!=='peauxduo'){const cv=eurConst(2);cv.connect(m.io.e.voct);}
 for(let i=0;i<8;i++)m.recevoir(.1+i*.2,port);
 const b=await ctx.startRendering(),d=b.getChannelData(0),energy=[];
 for(let i=0;i<8;i++){let sum=0,n=0;for(let j=Math.ceil((.11+i*.2)*sr);j<Math.ceil((.28+i*.2)*sr);j++){sum+=d[j]*d[j];n++;}energy.push(Math.sqrt(sum/n));}
 return {type,sr,kind:'notes_successives',energy,ratio:Math.min(...energy)/Math.max(...energy)};
}"""

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium');ap.add_argument('--contenu',action='store_true');ap.add_argument('--rapport',type=Path);ap.add_argument('--captures',type=Path)
    ap.add_argument('--sans-audio',action='store_true');ap.add_argument('--audio-seulement',action='store_true');a=ap.parse_args()
    total=0;erreurs=[];rendus=[];signaux=[]
    def v(c,msg):
        nonlocal total
        total+=1
        if not c:erreurs.append(msg);print('FAUX '+msg,flush=True)
    with sync_playwright() as pw:
        opt={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
        if a.chromium:opt['executable_path']=a.chromium;opt['args'].append('--no-sandbox')
        browser=pw.chromium.launch(**opt)
        def ouvrir(w,h):
            context=browser.new_context(viewport={'width':w,'height':h},has_touch=w<1000)
            pg=context.new_page();err=[];pg.on('pageerror',lambda e:err.append(str(e)));pg.set_default_timeout(90000)
            f=R/'app/src/main/assets/drm16.html'
            if a.contenu:pg.evaluate(G.STOCKAGE);pg.set_content(f.read_text(encoding='utf-8'),wait_until='domcontentloaded')
            else:pg.goto(f.as_uri(),wait_until='domcontentloaded')
            pg.wait_for_timeout(90);pg.evaluate(G.OUVRIR,'eur');return context,pg,err
        for w,h in ([] if a.audio_seulement else FORMATS):
            context,pg,err=ouvrir(w,h);tag=f'{w}x{h}';accept={'oui':False}
            pg.on('dialog',lambda d:d.accept() if accept['oui'] else d.dismiss())
            v(pg.evaluate('Object.keys(EUR_CAT).length===122&&new Set(EUR_ORDRE).size===122&&EUR_MONTAGES.length===72'),tag+' catalogue exact')
            for s in pg.evaluate(STRUCTURE):
                b=s['id']=='couleur-balkans7'
                v(not s['erreurs'] and s['modules']==(21 if b else 22) and s['cables']==(31 if b else 36) and s['horloges']==1 and s['melos']==3 and s['scenes']==(0 if b else 1) and s['rangees'],tag+' structure '+str(s))
            pg.evaluate('window.before=JSON.stringify(rackCourant());window.oldPresets=JSON.stringify(EUR_MONTAGES);EUR.montFam="couleurs";eurMontages()')
            v(pg.locator('[data-famille="couleurs"]').count()==4,tag+' quatre cartes')
            pg.locator('[data-montage="couleur-dabke"]').click();v(pg.evaluate('JSON.stringify(rackCourant())===before'),tag+' refus remplacement conservé')
            accept['oui']=True;pg.locator('[data-montage="couleur-dabke"]').click()
            v(pg.evaluate('!S.run&&S.bpm===148&&EUR.mods.some(m=>m.type==="anchelead")'),tag+' montage correct et arrêt')
            for type in TYPES:
                pg.evaluate('type=>{window.m=EUR.mods.find(m=>m.type===type);window.params=JSON.stringify(m.p);window.graph=EUR.bus;window.cables=JSON.stringify(EUR.cables);EUR_FOCUS.ouvrir(m.id);}',type)
                v(pg.evaluate('EUR_FOCUS.actif()===m.id&&EUR.bus===graph&&JSON.stringify(m.p)===params&&JSON.stringify(EUR.cables)===cables'),tag+' '+type+' Focus sans modification')
                v(pg.locator('#eur-focus .ef-kn').count()==pg.evaluate('EUR_CAT[m.type].kns.length'),tag+' '+type+' tous les réglages')
                size=pg.evaluate(TAILLES);v(size['deb']<=1 and not size['bad'],tag+' '+type+' géométrie '+str(size))
                key='snap' if type=='peauxduo' else 'tone'
                knob=pg.locator(f'#eur-focus .ef-kn[data-param="{key}"]');knob.scroll_into_view_if_needed();knob.focus()
                before=pg.evaluate('(k)=>m.p[k]',key);pg.keyboard.press('ArrowUp')
                v(pg.evaluate('(k)=>m.p[k]',key)>before,tag+' '+type+' clavier')
                before=pg.evaluate('(k)=>m.p[k]',key);knob.hover();pg.mouse.wheel(0,100)
                pg.wait_for_timeout(60);v(pg.evaluate('(k)=>m.p[k]',key)<before,tag+' '+type+' molette')
                box=knob.bounding_box();pg.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);pg.mouse.down();pg.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2-15,steps=5);pg.mouse.up()
                v(pg.evaluate('(k)=>m.p[k]',key)>before-.02,tag+' '+type+' glissement natif')
                if type!='peauxduo':
                    oct=pg.locator('#eur-focus .ef-kn[data-param="oct"]');oct.scroll_into_view_if_needed();oct.focus();pg.keyboard.press('ArrowUp');v(pg.evaluate('m.p.oct>0'),tag+' '+type+' octave sans blocage sur un cran arrondi')
                pg.evaluate('window.savedParams=JSON.stringify(m.p);memEur();window.saved=JSON.parse(JSON.stringify(rackCourant()));window.typeSaved=m.type;poserRack(saved);eurBatir();eurDessiner();window.m=EUR.mods.find(m=>m.type===typeSaved);EUR_FOCUS.ouvrir(m.id)')
                v(pg.evaluate('JSON.stringify(m.p)===savedParams'),tag+' '+type+' rack restauré')
                v(pg.evaluate('memEur();JSON.parse(projetContenu().doc.memoire[MEM+".eur"]).racks[EUR.cur].mods.some(x=>x.type===m.type&&JSON.stringify(x.p)===JSON.stringify(m.p))'),tag+' '+type+' projet conservé')
                pg.locator('#ef-transport').click();pg.wait_for_timeout(140);v(pg.evaluate('S.run'),tag+' '+type+' vrai transport démarré')
                pg.locator('#ef-transport').click();v(pg.evaluate('!S.run'),tag+' '+type+' STOP')
                if a.captures and type=='anchelead':
                    a.captures.mkdir(parents=True,exist_ok=True);pg.screenshot(path=str(a.captures/(tag+'.png')))
            pg.evaluate('EUR_PERF_UI.ouvrir();EUR_PERFORMANCE.memoriser();window.lead=EUR.mods.find(m=>m.type==="anchelead");window.original=lead.p.mode;EUR_PERFORMANCE.regler(4,1)')
            v(pg.evaluate('lead.p.mode===1&&lead.p.tone===.95'),tag+' macro COULEUR agit')
            pg.evaluate('EUR_PERFORMANCE.regler(5,1);EUR_PERFORMANCE.regler(7,1)')
            v(pg.evaluate('lead.p.vib===55&&EUR.mods.find(m=>m.type==="peauxduo").p.bend===.95'),tag+' macros ANCHE et PEAUX')
            pg.evaluate('EUR_PERFORMANCE.rappeler();EUR_PERF_UI.fermer(false)');v(pg.evaluate('lead.p.mode===original'),tag+' retour paramètres exact')
            for id in IDS:
                pg.evaluate('(id)=>eurMonter(EUR_MONTAGES.find(p=>p.id===id))',id)
                v(pg.evaluate('JSON.stringify(EUR_MONTAGES)===oldPresets'),tag+' chargement sans mutation catalogue '+id)
            pg.evaluate('window.m=EUR.mods.find(m=>m.type==="anchelead");window.old=m;EUR_FOCUS.ouvrir(m.id);eurRetirer(EUR.mods.indexOf(m))')
            v(pg.evaluate('EUR_FOCUS.actif()===null&&old.couleurs.ferme()&&old.couleurs.sources()===0'),tag+' suppression sûre')
            pg.evaluate('old.recevoir(2,"trig")');v(pg.evaluate('old.couleurs.sources()===0'),tag+' ancien objet inactif')
            v(not err,tag+' aucune erreur JavaScript '+str(err));print('Contrôlé '+tag,flush=True);context.close()
        if not a.sans_audio:
            context,pg,err=ouvrir(1280,800)
            for sr in [44100,48000]:
                for type in TYPES:
                    for kind in ['silence','normal','mute','min','max','rapid','stop','rst','gain']:
                        d=pg.evaluate(SIGNAL,{'type':type,'sr':sr,'kind':kind,'cv':2});signaux.append(d)
                        v(d['bad']==0 and d['peak']<1.01 and d['sumError']<1e-6,'signal borné '+str(d))
                        if kind in ['silence','mute','min']:v(d['peak']<1e-7,'silence '+str(d))
                        else:v(d['rms']>1e-6,'signal audible '+str(d))
                        if kind in ['stop','rst','gain']:v(d['late']<1e-6,'arrêt sans voix future '+str(d))
                for type in ['cordesreso','anchelead']:
                    for cv in [2,3]:
                        d=pg.evaluate(SIGNAL,{'type':type,'sr':sr,'kind':'pitch','cv':cv});signaux.append(d)
                        v(d['bad']==0 and abs(d['pitch']['expected']-d['pitch']['measured'])<=1 and d['pitch']['power']>1,'hauteur V/OCT '+str(d))
            for sr in [44100,48000]:
                for type in TYPES:
                    d=pg.evaluate(REPEATS,{'type':type,'sr':sr});signaux.append(d)
                    v(d['ratio']>.97 and min(d['energy'])>1e-5,'notes répétées sans baisse prématurée '+str(d))
            v(not err,'signaux sans erreur JavaScript '+str(err));context.close()
            for id in IDS:
                for sr in [44100,48000]:
                    context,pg,err=ouvrir(1280,800);d=pg.evaluate(AUDIO,{'id':id,'sr':sr});rendus.append(d)
                    v(all(s['bad']==0 and s['rms']>1e-6 for s in d['stats']),id+' huit signaux actifs et finis')
                    v(all(s['peak']<1.01 for s in d['stats'][:2]),id+' sortie sans dépassement')
                    v(d['timing'],id+' notes exactes et cycle '+str(d['steps']))
                    v(all(s['peak']<.0001 for s in d['clean']),id+' nettoyage STOP '+str(d['clean']))
                    v(all(x['ok'] for x in d['cv']),id+' niveaux de scènes exacts')
                    v(len(d['journal'])==(0 if id=='couleur-balkans7' else 13),id+' longueur de cycle de scènes')
                    v(not err,id+' aucune erreur JavaScript '+str(err));print('Rendu '+id+' '+str(sr),flush=True);context.close()
        browser.close()
    report={'version':289,'verifications':total,'erreurs':erreurs,'formats':FORMATS,'signaux':signaux,'rendus':rendus,'stockage_simule':a.contenu}
    if a.rapport:a.rapport.parent.mkdir(parents=True,exist_ok=True);a.rapport.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Couleurs Eurorack : {total} vérifications, {len(erreurs)} erreur(s).',flush=True)
    raise SystemExit(bool(erreurs))
if __name__=='__main__':main()
