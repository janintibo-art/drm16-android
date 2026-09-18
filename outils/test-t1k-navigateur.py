#!/usr/bin/env python3
"""v194 : édition mobile, sauvegarde et vrais WAV des probabilités TR-1000."""
import asyncio
from pathlib import Path
import runpy
from playwright.async_api import async_playwright
BASE=runpy.run_path(str(Path(__file__).with_name('test-export-midi.py')))

async def main():
    async with async_playwright() as p:
        nav=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        co=await nav.new_context(viewport={'width':393,'height':851})
        await co.add_init_script(BASE['PONT']);await BASE['servir'](co,Path(__file__).resolve().parents[1])
        pg=await co.new_page();erreurs=[];pg.on('pageerror',lambda e:erreurs.append(str(e)))
        try:
            await pg.goto('http://drm16.localhost/drm16.html');await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            await pg.evaluate('T1K.motifs[0].pas.fill(0);T1K.motifs[0].acc.fill(0);majT1k()')
            await pg.locator('#t1k-pas button').nth(0).click()
            await pg.locator('#t1k-proba').click();await pg.locator('#t1k-proba-valeur').select_option('25')
            await pg.locator('#t1k-pas button').nth(0).click();await pg.locator('#t1k-pas button').nth(1).click()
            assert await pg.evaluate('T1K.motifs[0].prob[0][0]===25 && T1K.motifs[0].prob[0][1]===25 && T1K.motifs[0].pas[0]===1')
            assert '25%' in await pg.locator('#t1k-pas button').nth(0).inner_text()
            await pg.locator('#t1k-sub').click()
            assert await pg.evaluate('T1K.sub&&!T1K.proba&&!T1K.accent')
            await pg.locator('#t1k-pas button').nth(0).click()
            assert await pg.evaluate('T1K.motifs[0].sub[0][0]===2&&T1K.motifs[0].prob[0][0]===25')
            await pg.locator('#t1k-accent').click()
            assert await pg.evaluate('T1K.accent&&!T1K.sub&&!T1K.proba')
            await pg.locator('#t1k-proba').click()
            assert await pg.evaluate('T1K.proba&&!T1K.accent&&!T1K.sub')
            await pg.locator('.t1k-pad[data-p="1"]').click()
            assert await pg.evaluate('T1K.sel===1&&T1K.motifs[0].prob[1][0]===100')
            await pg.locator('#t1k-proba-valeur').select_option('75');await pg.locator('#t1k-pas button').nth(0).click()
            await pg.evaluate('memT1k();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.evaluate('T1K.motifs[0].prob[0][0]===25&&T1K.motifs[0].prob[1][0]===75&&!T1K.proba')
            await pg.locator('#t1k-proba').click()
            for w,h in ((393,851),(360,640),(880,400)):
                await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
                await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('t1k-v194-%sx%s.png'%(w,h))))
            print('OK : peinture des probabilités, pas conservés, modes exclusifs, instruments indépendants et sauvegarde',flush=True)
            await pg.evaluate('''() => {
              T1K.cur=0;let m=motifT1kCur();m.pas.fill(0);m.acc.fill(0);m.pas[0]=1;m.acc[0]=1;m.sub[0][0]=4;m.last=4;
              Object.assign(m.instr[0],{mix:0,niv:.3,dec:.1});T1K.mA=null;T1K.mB=null;T1K.mfx.rev=0;T1K.mfx.dly=0;T1K.afx.on=false;
              S.bpm=120;S.vol=.3;WAVX.mesures=1;MIDI.out=true;MIDI.ouvert=9;
              window.__ctxVrai=ctx;window.__masterVrai=master;
            }''')
            rendre='''async ({prob,hasard}) => {
              motifT1kCur().prob[0][0]=prob;memT1k();writeMem();
              let n=__exports.length,rng=Math.random,nb=__sortiesMidi.length;
              Math.random=()=>hasard;
              try{
                exporterWav();let limite=performance.now()+20000;
                while(WAVX.occupe&&performance.now()<limite)await new Promise(r=>setTimeout(r,10));
                if(__exports.length!==n+1)throw Error('WAV absent');
                let o=__exports[n].octets,v=new DataView(o.buffer),pic=0;
                for(let i=44;i<o.length;i+=2)pic=Math.max(pic,Math.abs(v.getInt16(i,true))/32768);
                return {pic:pic,contexte:ctx===__ctxVrai&&master===__masterVrai,prob:motifT1kCur().prob[0][0],midi:__sortiesMidi.slice(nb).filter(e=>(e[0]&240)===144).length};
              }finally{Math.random=rng;}
            }'''
            for prob,hasard,joue in ((0,.1,False),(100,.999,True),(50,.49,True),(50,.5,False)):
                r=await pg.evaluate(rendre,{'prob':prob,'hasard':hasard})
                assert (r['pic']>.001 if joue else r['pic']<.0001) and r['contexte'] and r['prob']==prob and r['midi']==0,r
            print('OK : vrais WAV à 0/100%, tirages 50% acceptés/refusés, contexte restauré et aucune note MIDI pendant export',flush=True)
            await pg.evaluate('''() => {
              window.__voixT=voixT1k;window.__tirs=[];voixT1k=function(t,k,a){__tirs.push([t,k,a]);return __voixT(t,k,a);};
              motifT1kCur().prob[0][0]=0;
              frapperT1k(0,true);if(__tirs.length!==1)throw Error('frappe directe filtrée');
              __tirs=[];scheduleT1k(0,maintenantAudio()+.05);if(__tirs.length)throw Error('pas zéro joué');
              motifT1kCur().prob[0][0]=100;__tirs=[];scheduleT1k(0,maintenantAudio()+.05);
              if(__tirs.length!==4)throw Error('sous-pas manquants');
              voixT1k=__voixT;
            }''')
            print('OK : frappe directe audible malgré 0% et quatre sous-pas à 100%',flush=True)
            # v195 : accès direct, indépendance, sauvegarde et migration.
            await pg.locator('#t1k-banque').select_option('1')
            assert await pg.evaluate('T1K.banq===1&&motifT1kCur().pas.every(p=>p===0)')
            await pg.locator('.t1k-pad[data-p="0"]').click()
            await pg.locator('#t1k-pas button').nth(2).click()
            await pg.evaluate('motifT1kCur().prob[0][2]=25;motifT1kCur().sub[0][2]=3;motifT1kCur().instr[0].niv=.17;memT1k()')
            await pg.locator('#t1k-banque').select_option('0')
            assert await pg.evaluate('T1K.banq===0&&motifT1kCur().pas[0]===1&&motifT1kCur().instr[0].niv===.3')
            await pg.locator('#t1k-banque').select_option('1')
            assert await pg.evaluate('motifT1kCur().pas[0]===4&&motifT1kCur().prob[0][2]===25&&motifT1kCur().sub[0][2]===3')
            await pg.evaluate('writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.evaluate('T1K.banq===1&&T1K.cur===0&&motifT1kCur().pas[0]===4&&motifT1kCur().instr[0].niv===.17')
            await pg.evaluate('''async () => {
              motifT1kCur().prob[0][2]=100;memT1k();writeMem();let n=__exports.length;
              exporterWav();let limite=performance.now()+20000;while(WAVX.occupe&&performance.now()<limite)await new Promise(r=>setTimeout(r,10));
              if(__exports.length!==n+1||T1K.banq!==1||T1K.cur!==0)throw Error('export banque B');
              let o=__exports[n].octets,v=new DataView(o.buffer);
              function pic(debut,fin){let p=0;for(let i=Math.floor(debut*44100);i<Math.floor(fin*44100);i++)p=Math.max(p,Math.abs(v.getInt16(44+4*i,true))/32768);return p;}
              if(pic(.05,.10)>.0001||pic(.32,.35)<.001)throw Error('export joue une autre banque');
            }''')
            print('OK : WAV de B1 joue son pas 3, pas le pas 1 de A1, et restaure la banque B',flush=True)
            await pg.locator('#t1k-start').click()
            assert await pg.locator('#t1k-banque').is_disabled() and await pg.locator('#t1k-ptn').is_disabled()
            assert await pg.evaluate('!choisirMotifT1k(2,0)&&T1K.banq===1')
            await pg.locator('#t1k-stop').click()
            await pg.evaluate('choisirMotifT1k(0,15)');await pg.locator('#t1k-ptn').click()
            assert await pg.evaluate('T1K.banq===1&&T1K.cur===0')
            await pg.evaluate('choisirMotifT1k(7,15)');await pg.locator('#t1k-ptn').click()
            assert await pg.evaluate('T1K.banq===0&&T1K.cur===0')
            await pg.evaluate('''() => {
              let anciens=Array.from({length:16},()=>motifT1k(9));anciens[3].pas[2]=17;anciens[3].prob[2][4]=25;
              memoire.t1k={cur:3,banq:5,sel:2,motifs:anciens};chargerT1k();majT1k();majKnobsT1k();memT1k();writeMem();
            }''')
            await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.evaluate('T1K.motifs.length===128&&T1K.banq===5&&T1K.cur===3&&motifT1kCur().pas[2]===17&&T1K.motifs[3].prob[2][4]===25')
            for w,h in ((393,851),(360,640),(880,400)):
                await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
                await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('t1k-v195-%sx%s.png'%(w,h))))
            print('OK : banques indépendantes, sélection sauvegardée, limites A16/B1 et H16/A1, blocage PLAY et migration des anciens projets',flush=True)
            # v196 : sens, curseur à l'heure audio, sauvegarde et vraies ondes.
            await pg.evaluate('''() => {
              choisirMotifT1k(0,0);T1K.sel=0;let m=motifT1kCur();m.last=4;m.pas.fill(0);m.acc.fill(0);m.pas[0]=1;m.acc[0]=1;
              m.sub[0].fill(1);m.prob[0].fill(100);Object.assign(m.instr[0],{mix:0,niv:.3,dec:0});
              T1K.mA=null;T1K.mB=null;T1K.mfx.rev=0;T1K.mfx.dly=0;T1K.afx.on=false;S.vol=.3;S.bpm=120;WAVX.mesures=3;majT1k();
            }''')
            await pg.locator('#t1k-direction').select_option('arriere')
            assert await pg.evaluate('motifT1kCur().direction[0]==="arriere"&&motifT1kCur().direction[1]==="avant"')
            rendu_direction='''async direction => {
              choisirDirectionT1k(direction);memT1k();writeMem();let n=__exports.length;
              exporterWav();let limite=performance.now()+20000;while(WAVX.occupe&&performance.now()<limite)await new Promise(r=>setTimeout(r,10));
              if(__exports.length!==n+1)throw Error('export direction');
              let o=__exports[n].octets,v=new DataView(o.buffer),pics=[];
              for(let p=0;p<12;p++){let pic=0;for(let i=Math.floor((.065+p*.125)*44100);i<Math.floor((.09+p*.125)*44100);i++)pic=Math.max(pic,Math.abs(v.getInt16(44+4*i,true))/32768);pics.push(pic);}
              return {pics:pics,direction:motifT1kCur().direction[0]};
            }'''
            for direction,attendus in [('arriere',[3,7,11]),('pingpong',[0,6])]:
                r=await pg.evaluate(rendu_direction,direction)
                assert r['direction']==direction and [i for i,x in enumerate(r['pics']) if x>.001]==attendus,r
            await pg.evaluate('memT1k();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.evaluate('motifT1kCur().direction[0]==="pingpong"')
            await pg.evaluate('''() => {
              window.__lus=[];window.__beatVrai=MACHINE_T1K.beat;
              MACHINE_T1K.beat=function(i){__beatVrai(i);let e=T1K.entendu,b=document.querySelector('#t1k-pas .cur');if(e)__lus.push([e.absolu,e.positions[0],b?+b.dataset.i:-1]);};
            }''')
            await pg.locator('#t1k-start').click()
            assert await pg.locator('#t1k-direction').is_disabled() and await pg.locator('#t1k-last').is_disabled()
            await pg.wait_for_function('__lus.length && __lus[__lus.length-1][0]>=7')
            r=await pg.evaluate('__lus')
            assert r[0][0]==0 and all(v[1]==v[2]==([0,1,2,3,2,1][v[0]%6]) for v in r),r
            await pg.locator('#t1k-stop').click()
            assert await pg.evaluate('T1K.entendu===null&&T1K.departs.length===0&&T1K.tour===-1')
            await pg.evaluate('__lus=[]');await pg.locator('#t1k-start').click();await pg.wait_for_function('__lus.length>0')
            assert await pg.evaluate('__lus[0][0]===0&&__lus[0][1]===0')
            await pg.locator('#t1k-stop').click();await pg.evaluate('MACHINE_T1K.beat=__beatVrai')
            for w,h in ((393,851),(360,640),(880,400)):
                await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
                await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('t1k-v196-%sx%s.png'%(w,h))))
            print('OK : sens indépendants, WAV arrière/aller-retour, sauvegarde, curseur entendu et reset STOP/START',flush=True)
            # v197 : peinture, mémoire, cycle déterministe et vrai WAV.
            await pg.evaluate('choisirMotifT1k(0,0);T1K.sel=0;majT1k()')
            await pg.locator('#t1k-cycle').click()
            await pg.locator('#t1k-cycle-valeur').select_option('2:4')
            await pg.locator('#t1k-pas button').nth(0).click()
            await pg.locator('#t1k-pas button').nth(1).click()
            assert await pg.evaluate("T1K.cycles&&!T1K.proba&&!T1K.sub&&!T1K.accent&&motifT1kCur().pas[0]===1&&motifT1kCur().cycle[0][1]==='2:4'&&motifT1kCur().cycle[1][0]==='1:1'")
            assert '2:4' in await pg.locator('#t1k-pas button').nth(0).inner_text()
            await pg.locator('#t1k-proba').click()
            assert await pg.evaluate('!T1K.cycles&&T1K.proba')
            await pg.evaluate('memT1k();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.evaluate("motifT1kCur().cycle[0][0]==='2:4'&&!T1K.cycles")
            await pg.evaluate('WAVX.mesures=3')
            for direction,attendus in [('avant',[4]),('arriere',[7]),('pingpong',[6])]:
                r=await pg.evaluate(rendu_direction,direction)
                assert [i for i,x in enumerate(r['pics']) if x>.001]==attendus,r
            await pg.locator('#t1k-cycle').click()
            for w,h in ((393,851),(360,640),(880,400)):
                await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
                await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('t1k-v197-%sx%s.png'%(w,h))))
            print('OK : cycles par pas, édition exclusive, mémoire et vrais WAV dans les trois directions',flush=True)
            # v198 : édition et mesure de la position du signal dans les vrais WAV.
            await pg.locator('#t1k-decalage').click()
            await pg.locator('#t1k-retard-valeur').select_option('8')
            await pg.locator('#t1k-pas button').nth(0).click()
            assert await pg.evaluate("T1K.decalage&&!T1K.cycles&&!T1K.proba&&motifT1kCur().retard[0][0]===8&&motifT1kCur().retard[1][0]===0&&motifT1kCur().pas[0]===1")
            assert '+8/16' in await pg.locator('#t1k-pas button').nth(0).inner_text()
            await pg.evaluate('memT1k();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.evaluate('motifT1kCur().retard[0][0]===8&&!T1K.decalage')
            positions=[]
            for retard in [0,8]:
                positions.append(await pg.evaluate("""async retard => {
                  let m=motifT1kCur();m.direction[0]='avant';m.cycle[0].fill('1:1');m.retard[0][0]=retard;m.sub[0].fill(1);WAVX.mesures=1;
                  memT1k();writeMem();let n=__exports.length;exporterWav();let limite=performance.now()+20000;
                  while(WAVX.occupe&&performance.now()<limite)await new Promise(r=>setTimeout(r,10));
                  if(__exports.length!==n+1)throw Error('WAV retard absent');
                  let o=__exports[n].octets,v=new DataView(o.buffer);
                  for(let i=0;44+4*i<o.length;i++)if(Math.abs(v.getInt16(44+4*i,true))>33)return i/44100;
                  throw Error('WAV retard silencieux');
                }""",retard))
            assert abs(positions[1]-positions[0]-.0625)<.001,positions
            await pg.locator('#t1k-decalage').click()
            for w,h in ((393,851),(360,640),(880,400)):
                await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
                await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('t1k-v198-%sx%s.png'%(w,h))))
            print('OK : retard édité, sauvegardé et mesuré à 62,5 ms dans le vrai WAV',flush=True)
            # v199 : vrais boutons et confirmations, copie indépendante entre banques.
            await pg.locator('#t1k-copier').click()
            attendu=await pg.evaluate('JSON.stringify(motifT1kCur())')
            await pg.locator('#t1k-banque').select_option('7')
            await pg.evaluate('choisirMotifT1k(7,15)')
            avant=await pg.evaluate('JSON.stringify(motifT1kCur())')
            pg.once('dialog',lambda d:d.dismiss())
            await pg.locator('#t1k-coller').click()
            assert await pg.evaluate('JSON.stringify(motifT1kCur())')==avant
            pg.once('dialog',lambda d:d.accept())
            await pg.locator('#t1k-coller').click()
            assert await pg.evaluate('JSON.stringify(motifT1kCur())')==attendu
            await pg.evaluate('motifT1kCur().retard[0][0]=0;memT1k();writeMem()')
            assert await pg.evaluate('T1K.motifs[0].retard[0][0]===8&&T1K.copie.motif.retard[0][0]===8')
            await pg.locator('#t1k-start').click()
            assert await pg.locator('#t1k-copier').is_disabled() and await pg.locator('#t1k-coller').is_disabled()
            await pg.locator('#t1k-stop').click()
            await pg.evaluate('writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.evaluate('T1K.banq===7&&T1K.cur===15&&motifT1kCur().retard[0][0]===0&&T1K.copie===null')
            assert await pg.locator('#t1k-coller').is_disabled()
            for w,h in ((393,851),(360,640),(880,400)):
                await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
                await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('t1k-v199-%sx%s.png'%(w,h))))
            print('OK : boutons copier/coller, confirmations, destination H16, indépendance et sauvegarde',flush=True)
            assert not erreurs,erreurs
            print('TR-1000 navigateur : tout est bon.',flush=True)
        finally:
            await co.close();await nav.close()

if __name__=='__main__': asyncio.run(main())
