#!/usr/bin/env python3
"""v276 : ensembles Eurorack, câblage natif, sauvegarde et rendu de chaque partie.

Aucune ressource distante, aucun fichier personnel. Les essais sonores rendent
quatre mesures en OfflineAudioContext et mesurent séparément le mix, les cinq
voix et les tensions des deux séquenceurs. Ce n'est pas une écoute humaine.
--contenu utilise un stockage temporaire simulé ; sans cette option, file://.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('graphique', Path(__file__).with_name('test-graphique.py'))
G = importlib.util.module_from_spec(spec)
spec.loader.exec_module(G)
FORMATS = [(320,568),(393,851),(880,400),(1280,800),(1920,1080)]

AUDIO = r"""async (options) => {
  const id=options.id;
  stop();
  const P=EUR_MONTAGES.find(p=>p.id===id);
  const sr=options.rate || 48000, debut=.12, dureePas=60/P.bpm/4, nPas=64, duree=debut+nPas*dureePas+1.3;
  if(ctx && ctx.close && !ctx.startRendering) await ctx.close();
  ctx=new OfflineAudioContext(12,Math.ceil(duree*sr),sr);
  batirAudio();
  eurMonter(P);
  EUR.bus.disconnect();
  const merge=ctx.createChannelMerger(12);merge.connect(ctx.destination);
  const module=role=>EUR.mods[P.reperes[role]];
  const stereo=(node,c)=>{const s=ctx.createChannelSplitter(2);node.connect(s);s.connect(merge,0,c);s.connect(merge,1,c+1);};
  stereo(EUR.bus,0);
  module('kick').io.s.out.connect(merge,0,2);
  module('caisse').io.s.out.connect(merge,0,3);
  module('hat').io.s.out.connect(merge,0,4);
  module(P.reperes.distBasse===undefined?'vcaBasse':'distBasse').io.s.out.connect(merge,0,5);
  stereo(module('panMelodie').io.s.out,6);
  module('seqBasse').io.s.cv.connect(merge,0,8);
  module('seqMelodie').io.s.cv.connect(merge,0,9);
  module('envBasse').io.s.out.connect(merge,0,10);
  module('envMelodie').io.s.out.connect(merge,0,11);
  const evenements={};
  for(const role of ['kick','caisse','hat','envBasse','envMelodie']){
    const m=module(role), old=m.recevoir;evenements[role]=[];
    m.recevoir=function(t,e){evenements[role].push(t);return old.call(this,t,e);};
  }
  cache=true;
  for(let i=0;i<nPas;i++) scheduleEur(i%16,debut+i*dureePas);
  cache=false;
  const rendu=await ctx.startRendering();
  const stats=[];
  for(let c=0;c<8;c++){
    const x=rendu.getChannelData(c);let peak=0,sum=0,nonFini=0;
    const a=Math.floor(debut*sr),b=Math.floor((debut+nPas*dureePas)*sr);
    for(let k=a;k<b;k++){let v=x[k];if(!Number.isFinite(v)){nonFini++;continue;}peak=Math.max(peak,Math.abs(v));sum+=v*v;}
    stats.push({canal:c,peak,rms:Math.sqrt(sum/(b-a)),nonFini});
  }
  const notes=[];
  for(const [role,c] of [['seqBasse',8],['seqMelodie',9]]){
    const con=P.cables.find(c=>c[2]===P.reperes[role]&&c[3]==='clk');
    const div={out:1,out2:2,out4:4}[con[1]];
    const data=rendu.getChannelData(c), m=module(role);
    for(let i=0;i<nPas;i+=div){
      const attendu=Math.round(m.p['n'+((i/div)%16+1)]*24)/12;
      const valeur=data[Math.round((debut+i*dureePas+.01)*sr)];
      notes.push({role,pas:i,attendu,valeur,ok:Math.abs(attendu-valeur)<1e-5});
    }
  }
  return {id,sampleRate:sr,stats,notes,evenements,debut,dureePas,nPas,modules:P.mods.length,cables:P.cables.length};
}
"""

STRUCTURE = """() => EUR_MONTAGES.filter(p=>p.fam==='ensemble').map(p=>{
  const erreurs=[], entrees=new Set(), roles=p.reperes;
  p.mods.forEach(([type,params],i)=>{
    const d=EUR_CAT[type];if(!d){erreurs.push('module '+type);return;}
    Object.entries(params).forEach(([k,v])=>{
      const knob=d.kns.find(x=>x[0]===k);
      if(!knob||!Number.isFinite(v)||v<knob[2]||v>knob[3]) erreurs.push('paramètre '+i+' '+k);
    });
  });
  p.cables.forEach(([a,s,b,e])=>{
    const x=p.mods[a]&&EUR_CAT[p.mods[a][0]], y=p.mods[b]&&EUR_CAT[p.mods[b][0]];
    if(!x||!y||!x.jacks.some(j=>j[0]===s&&j[2])||!y.jacks.some(j=>j[0]===e&&!j[2])) erreurs.push('prise');
    const cle=b+':'+e;if(entrees.has(cle)) erreurs.push('entrée double '+cle);entrees.add(cle);
  });
  for(const role of ['seqBasse','seqMelodie']) for(let i=1;i<=16;i++){
    const v=p.mods[roles[role]][1]['n'+i]*24;
    if(Math.abs(v-Math.round(v))>1e-8||![0,2,3,5,7,8,10].includes(Math.round(v)%12)) erreurs.push('gamme');
  }
  return {id:p.id,erreurs,modules:p.mods.length,cables:p.cables.length,
    horloges:p.mods.filter(m=>m[0]==='clock').length,seq:p.mods.filter(m=>m[0]==='seq16').length,
    mix:p.mods.filter(m=>m[0]==='mix4').length,rangees:p.rangees.length===p.mods.length&&p.rangees.every(x=>x===0||x===1)};
})"""

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium')
    ap.add_argument('--contenu',action='store_true')
    ap.add_argument('--rapport',type=Path)
    ap.add_argument('--captures',type=Path)
    args=ap.parse_args()
    fautes=[]; controles=0; structures=[]; rendus=[]
    def verifie(ok,texte):
        nonlocal controles
        controles+=1
        if not ok:
            fautes.append(texte); print('FAUX : '+texte,flush=True)
    if args.captures:args.captures.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as p:
        opts={'headless':True,'args':['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:
            opts['executable_path']=args.chromium;opts['args'].append('--no-sandbox')
        nav=p.chromium.launch(**opts)
        def page(l,h):
            ctx=nav.new_context(viewport={'width':l,'height':h},has_touch=l<1000)
            pg=ctx.new_page();erreurs=[]
            pg.on('pageerror',lambda e:erreurs.append(str(e)))
            fichier=RACINE/'app/src/main/assets/drm16.html'
            if args.contenu:
                pg.evaluate(G.STOCKAGE);pg.set_content(fichier.read_text(encoding='utf-8'),wait_until='domcontentloaded')
            else:pg.goto(fichier.as_uri(),wait_until='domcontentloaded')
            pg.wait_for_timeout(450);pg.evaluate(G.OUVRIR,'eur')
            return ctx,pg,erreurs
        for l,h in FORMATS:
            c,pg,erreurs=page(l,h);nom=f'{l}x{h}'
            decision={'accepter':False};pg.on('dialog',lambda d:d.accept() if decision['accepter'] else d.dismiss())
            if not structures:
                structures=pg.evaluate(STRUCTURE)
                verifie(len(structures)==8,'huit ensembles')
                verifie(pg.evaluate('["kick4","euclide","breakbeat","acide","generatif","cloche","ambiant","derive","souffle","voix","ducking","casse","dub","detroit","jungle","drone","berlin","industriel","lofi","phases","acide303","hardtek","tribe","psy"].every(id=>EUR_MONTAGES.filter(p=>p.id===id).length===1)'),'24 anciens montages conservés')
                verifie(pg.evaluate('Object.keys(EUR_CAT).length')==113,'113 modules : catalogue historique et extensions')
                for st in structures:
                    verifie(not st['erreurs'],st['id']+' structure '+str(st['erreurs']))
                    verifie(st['horloges']==1 and st['seq']==2 and st['mix']==2 and st['rangees'],st['id']+' structure musicale et rangées')
            pg.evaluate("""() => {
              window.temoinPatch=JSON.stringify(rackCourant());
              for(let i=1;i<8;i++) {const r=JSON.parse(temoinPatch);r.nom='TÉMOIN '+i;memoire.eur.racks[i]=r;}
              window.temoinAutres=JSON.stringify(memoire.eur.racks.slice(1));
              window.temoinModeles=JSON.stringify(EUR_MONTAGES.filter(p=>p.fam==='ensemble'));
              window.temoinBus=EUR.bus;
            }""")
            pg.locator('#eur-t-rack').click();pg.locator('#eur-mont').click()
            verifie(pg.locator('#eur-cat [data-famille="ensemble"]').count()==8,nom+' cartes de la famille par défaut')
            verifie(pg.locator('.eur-ensemble-meta').count()==8,nom+' tempo, gamme et modules visibles')
            verifie(pg.locator('.eur-ensembles-aide').count()==1,nom+' guide des deux mixeurs')
            # Annuler un vrai dialogue ne doit pas toucher les modules/audio.
            pg.locator('[data-montage="ens-techno"]').click()
            verifie(pg.evaluate('JSON.stringify(rackCourant())===temoinPatch && EUR.bus===temoinBus'),nom+' annulation sans remplacement ni reconstruction audio')
            decision['accepter']=True
            pg.locator('[data-montage="ens-techno"]').click();pg.wait_for_timeout(100)
            verifie(pg.evaluate('EUR.nom==="TECHNO MÉLODIQUE" && EUR.mods.length===24 && EUR.cables.length===31 && S.bpm===128 && !S.run'),nom+' chargement complet, tempo, sans autoplay')
            verifie(pg.evaluate('JSON.stringify(memoire.eur.racks.slice(1))===temoinAutres'),nom+' sept autres racks intacts')
            verifie(pg.evaluate('document.querySelectorAll("#eur-piste .eur-mod").length')==24,nom+' toutes les façades construites')
            verifie(pg.evaluate('document.querySelectorAll("#eur-cables path").length')==31,nom+' tous les câbles dessinés')
            # Le premier MIX 4 appartient à la batterie, celui du bas au mix général.
            verifie(pg.evaluate('EUR.mods.filter(m=>m.type==="mix4").map(m=>m.r).join(",")==="0,1"'),nom+' deux mixeurs sur les bonnes rangées')
            pg.locator('#eur-play').click();pg.wait_for_timeout(120)
            verifie(pg.evaluate('S.run && EUR.mods.filter(m=>m.type==="seq16").every(m=>m.pos>=0)'),nom+' START lance les deux phrases')
            pg.evaluate("""() => {
              window.mix=EUR.mods.filter(m=>m.type==='mix4')[1];
              window.busAvant=EUR.bus;window.sourcesAvant=EUR.sources.slice();
              EUR_FOCUS.ouvrir(mix.id);
            }""")
            potard=pg.locator('.ef-kn[data-param="b"]');potard.press('Home')
            # Le Focus lisse les AudioParam natifs : attendre leur cible réelle.
            pg.wait_for_function('Math.abs(mix.io.e.b.gain.value)<1e-5',timeout=3000)
            verifie(pg.evaluate('mix.p.b===0 && Math.abs(mix.io.e.b.gain.value)<1e-5'),nom+' basse coupée depuis le potard natif en Focus')
            potard.press('ArrowUp')
            pg.wait_for_function('Math.abs(mix.io.e.b.gain.value-.01)<1e-5',timeout=3000)
            verifie(pg.evaluate('Math.abs(mix.p.b-.01)<1e-8 && Math.abs(mix.io.e.b.gain.value-.01)<1e-5'),nom+' retour de la basse via la même commande')
            verifie(pg.evaluate('EUR.bus===busAvant && EUR.sources.every((x,i)=>x===sourcesAvant[i]) && S.run'),nom+' réglage sans recréer ou arrêter le son')
            verifie(pg.evaluate('memoire.eur.racks[EUR.cur].mods.find(m=>m.id===mix.id).p.b===mix.p.b'),nom+' valeur de mix sauvegardée')
            pg.evaluate("""() => {
              window.basse=EUR.mods.filter(m=>m.type==='seq16')[0];
              window.notesMelodie=JSON.stringify(EUR.mods.filter(m=>m.type==='seq16')[1].p);
              EUR_FOCUS.ouvrir(basse.id);
            }""")
            pg.locator('.ef-kn[data-param="n1"]').press('ArrowUp')
            verifie(pg.evaluate('basse.p.n1===.01 && JSON.stringify(EUR.mods.filter(m=>m.type==="seq16")[1].p)===notesMelodie'),nom+' notes basse/mélodie indépendantes')
            pg.locator('#eur-focus-fermer').click();pg.evaluate('stop()')
            pg.evaluate("""() => {
              window.sauve=JSON.stringify(rackCourant());
              changerRack(1);changerRack(0);
            }""")
            verifie(pg.evaluate('JSON.stringify(rackCourant())===sauve'),nom+' changement de rack et rechargement fidèles')
            pg.evaluate('poserRack(JSON.parse(sauve));eurBatir();eurDessiner();memEur()')
            verifie(pg.evaluate('JSON.stringify(rackCourant())===sauve && JSON.stringify(memoire.eur.racks.slice(1))===temoinAutres'),nom+' sérialisation JSON native, sans toucher aux autres racks')
            verifie(pg.evaluate('JSON.stringify(EUR_MONTAGES.filter(p=>p.fam==="ensemble"))===temoinModeles'),nom+' modèles non altérés par les réglages personnels')
            # Chargement pendant la lecture : même chemin que l'interface, arrêt sûr.
            pg.locator('#eur-play').click()
            pg.evaluate('eurMonter(EUR_MONTAGES.find(p=>p.id==="ens-acid"))')
            verifie(pg.evaluate('!S.run && EUR.mods.length===26 && EUR.cables.length===33'),nom+' chargement Acid après STOP')
            pg.evaluate('eurMontages()');pg.locator('[data-montage="ens-tribe"]').click()
            verifie(pg.evaluate('EUR.nom==="TRIBE HARMONIQUE"'),nom+' dernière carte atteignable avec défilement')
            if args.captures:pg.screenshot(path=str(args.captures/(nom+'.png')))
            verifie(not erreurs,nom+' erreurs JavaScript '+str(erreurs))
            print('Interface contrôlée : '+nom,flush=True)
            c.close()
        # Un contexte/page séparé par rendu : aucune dépendance à la lecture précédente.
        for st in structures:
            c,pg,erreurs=page(1280,800)
            rendu=pg.evaluate(AUDIO,{'id':st['id']})
            rendus.append(rendu)
            for stat in rendu['stats']:
                verifie(stat['nonFini']==0 and stat['rms']>0.0005 and stat['peak']>0.002,st['id']+' signal non nul et fini canal '+str(stat['canal'])+' '+str(stat))
            verifie(max(s['peak'] for s in rendu['stats'][:2])<.98,st['id']+' mix sans écrêtage avant protections globales')
            for n in rendu['notes']:verifie(n['ok'],st['id']+' CV exacte '+str(n))
            P=pg.evaluate('id=>EUR_MONTAGES.find(p=>p.id===id)',st['id'])
            for role,rhythm in [('kick','rythmeKick'),('caisse','rythmeCaisse'),('hat','rythmeHat')]:
                params=P['mods'][P['reperes'][rhythm]][1]
                coups=round(params['coups']*16);decalage=round(params['dec']*16)
                attendus=[]
                # Même répartition euclidienne, calcul indépendant sur les pas entiers.
                for step in range(64):
                    k=(step-decalage)%16
                    if (k*coups)//16!=((k-1)*coups)//16:attendus.append(rendu['debut']+step*rendu['dureePas'])
                vrais=rendu['evenements'][role]
                verifie(len(vrais)==len(attendus) and all(abs(a-b)<1e-8 for a,b in zip(vrais,attendus)),st['id']+' quatre mesures exactes '+role)
            for role,seq in [('envBasse','seqBasse'),('envMelodie','seqMelodie')]:
                cable=next(c for c in P['cables'] if c[2]==P['reperes'][seq] and c[3]=='clk')
                div={'out':1,'out2':2,'out4':4}[cable[1]]
                attendus=[rendu['debut']+i*rendu['dureePas'] for i in range(0,64,div)]
                vrais=rendu['evenements'][role]
                verifie(len(vrais)==len(attendus) and all(abs(a-b)<1e-8 for a,b in zip(vrais,attendus)),st['id']+' horloge commune '+role)
            verifie(not erreurs,st['id']+' rendu sans erreur JavaScript '+str(erreurs))
            print('Son contrôlé : '+st['id']+' · pic mix '+format(max(s['peak'] for s in rendu['stats'][:2]),'.4f'),flush=True)
            c.close()
        nav.close()
    rapport={'version':276,'verifications':controles,'formats':FORMATS,'structure':structures,'rendus':rendus,'erreurs':fautes,'stockage_simule':args.contenu}
    if args.rapport:
        args.rapport.parent.mkdir(parents=True,exist_ok=True)
        args.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{controles} vérifications ; {len(fautes)} erreur(s).',flush=True)
    return bool(fautes)

if __name__=='__main__':
    raise SystemExit(main())
