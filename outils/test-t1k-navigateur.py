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
            # v208 : sélection directe à travers les vraies listes.
            await pg.locator('#t1k-banque').select_option('0')
            await pg.locator('#t1k-ptn').select_option('15')
            assert await pg.evaluate('T1K.banq===0&&T1K.cur===15')
            await pg.locator('#t1k-banque').select_option('7')
            assert await pg.evaluate('T1K.banq===7&&T1K.cur===15')
            await pg.locator('#t1k-ptn').select_option('3')
            assert await pg.evaluate('T1K.banq===7&&T1K.cur===3')
            await pg.evaluate('writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.locator('#t1k-ptn').input_value()=='3'
            assert await pg.locator('#t1k-banque').input_value()=='7'
            await pg.locator('#t1k-banque').select_option('0')
            await pg.locator('#t1k-ptn').select_option('0')
            assert await pg.evaluate('T1K.banq===0&&T1K.cur===0&&motifT1kCur().pas[0]===1')
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
            print('OK : banques indépendantes, sélection sauvegardée, sélection directe A16/H16/H4/A1, blocage PLAY et migration des anciens projets',flush=True)
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
            # v202 : vrai mute, persistance et silence dans le WAV.
            await pg.evaluate("choisirMotifT1k(0,0);T1K.sel=0;let m=motifT1kCur();m.pas.fill(0);m.pas[0]=1;m.prob[0].fill(100);m.cycle[0].fill('1:1');m.retard[0].fill(0);m.direction[0]='avant';m.sub[0].fill(1);m.muet.fill(false);WAVX.mesures=1;majT1k()")
            await pg.locator('#t1k-muet').click()
            assert await pg.evaluate('motifT1kCur().muet[0]&&!motifT1kCur().muet[1]&&motifT1kCur().pas[0]===1')
            assert 'OFF' in await pg.locator('.t1k-pad[data-p="0"]').inner_text()
            await pg.evaluate('memT1k();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.evaluate('motifT1kCur().muet[0]')
            async def pic_wav():
                return await pg.evaluate("""async () => {
                  WAVX.mesures=1;memT1k();writeMem();let n=__exports.length;exporterWav();let limite=performance.now()+20000;
                  while(WAVX.occupe&&performance.now()<limite)await new Promise(r=>setTimeout(r,10));
                  if(__exports.length!==n+1)throw Error('WAV mute absent');
                  let o=__exports[n].octets,v=new DataView(o.buffer),pic=0;
                  for(let i=44;i<o.length;i+=2)pic=Math.max(pic,Math.abs(v.getInt16(i,true))/32768);
                  return pic;
                }""")
            assert await pic_wav()<.0001
            await pg.locator('#t1k-start').click()
            assert not await pg.locator('#t1k-muet').is_disabled()
            await pg.locator('#t1k-muet').click()
            assert await pg.evaluate('S.run&&!motifT1kCur().muet[0]')
            await pg.locator('#t1k-stop').click()
            assert await pic_wav()>.001
            await pg.locator('#t1k-muet').click()
            for w,h in ((393,851),(360,640),(880,400)):
                await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
                await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('t1k-v202-%sx%s.png'%(w,h))))
            print('OK : mute conservant les pas, sauvegarde, WAV silencieux/audible et réactivation pendant PLAY',flush=True)
            # v203 : solo prioritaire au mute et restauration exacte.
            await pg.locator('#t1k-solo').click()
            assert await pg.evaluate('motifT1kCur().solo===0&&motifT1kCur().muet[0]')
            assert await pg.locator('#t1k-muet').is_disabled()
            assert 'SOLO' in await pg.locator('.t1k-pad[data-p="0"]').inner_text()
            assert await pic_wav()>.001
            await pg.locator('.t1k-pad[data-p="1"]').click()
            await pg.locator('#t1k-solo').click()
            assert await pg.evaluate('motifT1kCur().solo===1&&motifT1kCur().muet[0]')
            assert await pic_wav()<.0001
            await pg.evaluate('memT1k();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.evaluate('motifT1kCur().solo===1&&motifT1kCur().muet[0]')
            await pg.locator('#t1k-start').click()
            await pg.locator('#t1k-solo').click()
            assert await pg.evaluate('S.run&&motifT1kCur().solo===-1&&motifT1kCur().muet[0]')
            await pg.locator('#t1k-stop').click()
            assert await pic_wav()<.0001
            await pg.locator('.t1k-pad[data-p="0"]').click();await pg.locator('#t1k-solo').click()
            for w,h in ((393,851),(360,640),(880,400)):
                await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
                await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('t1k-v203-%sx%s.png'%(w,h))))
            print('OK : solo, déplacement, sauvegarde, sortie pendant PLAY et vrais WAV respectant les mutes',flush=True)
            # v204 : édition ciblée et impact vérifié sur les vrais WAV.
            await pg.evaluate('let m=motifT1kCur();m.solo=-1;m.muet.fill(false);T1K.sel=0;majT1k()')
            await pg.locator('#t1k-params').click()
            await pg.locator('#t1k-param-nom').select_option('niv')
            await pg.locator('#t1k-param-valeur').select_option('0')
            await pg.locator('#t1k-pas button').nth(0).click()
            assert await pg.evaluate('T1K.params&&!T1K.decalage&&!T1K.cycles&&!T1K.proba&&motifT1kCur().reglages[0][0].niv===0&&motifT1kCur().pas[0]===1&&motifT1kCur().reglages[1][0]===null')
            assert await pic_wav()<.0001
            await pg.locator('#t1k-params').click()
            await pg.locator('#t1k-param-nom').select_option('niv')
            await pg.locator('#t1k-param-valeur').select_option('100')
            await pg.locator('#t1k-pas button').nth(0).click()
            await pg.locator('#t1k-param-nom').select_option('tune')
            await pg.locator('#t1k-param-valeur').select_option('75')
            await pg.locator('#t1k-pas button').nth(0).click()
            assert await pic_wav()>.001
            await pg.evaluate('memT1k();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.evaluate('motifT1kCur().reglages[0][0].niv===1&&motifT1kCur().reglages[0][0].tune===.75&&!T1K.params')
            await pg.locator('#t1k-params').click()
            await pg.locator('#t1k-param-nom').select_option('niv')
            await pg.locator('#t1k-param-valeur').select_option('base')
            await pg.locator('#t1k-pas button').nth(0).click()
            assert await pg.evaluate('motifT1kCur().reglages[0][0].niv===undefined&&motifT1kCur().reglages[0][0].tune===.75')
            await pg.locator('#t1k-param-nom').select_option('tune')
            for w,h in ((393,851),(360,640),(880,400)):
                await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
                await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('t1k-v204-%sx%s.png'%(w,h))))
            print('OK : paramètres par pas, WAV LEVEL 0/100%, mémoire et retour BASE ciblé',flush=True)
            # v205 : véritables gestes de souris sur potard et fader, REC notes désactivé.
            await pg.set_viewport_size({'width':393,'height':851})
            await pg.evaluate("T1K.params=false;T1K.rec=false;let m=motifT1kCur();m.last=16;m.direction[0]='avant';m.reglages[0].fill(null);window.__pasAvant=m.pas.slice();S.bpm=90;majT1k();fit()")
            await pg.locator('#t1k-motion-rec').click()
            assert await pg.evaluate('T1K.motionRec&&!T1K.rec')
            await pg.locator('#t1k-start').click();await pg.wait_for_function('T1K.entendu!==null')
            boite=await pg.locator('#t1k-k-0-tune').bounding_box()
            x=boite['x']+boite['width']/2;y=boite['y']+boite['height']/2
            await pg.mouse.move(x,y);await pg.mouse.down();await pg.mouse.move(x,y-30,steps=10);await pg.mouse.up()
            assert await pg.evaluate('motifT1kCur().reglages[0].some(r=>r&&typeof r.tune==="number")')
            rail=await pg.locator('.t1k-f[data-f="0"]').bounding_box()
            await pg.mouse.click(rail['x']+rail['width']/2,rail['y']+rail['height']*.7)
            assert await pg.evaluate('motifT1kCur().reglages[0].some(r=>r&&typeof r.niv==="number")&&JSON.stringify(motifT1kCur().pas)===JSON.stringify(__pasAvant)')
            await pg.locator('#t1k-stop').click();assert await pg.evaluate('!T1K.motionRec')
            attendu=await pg.evaluate('JSON.stringify(motifT1kCur().reglages[0])')
            await pg.evaluate('memT1k();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.evaluate('JSON.stringify(motifT1kCur().reglages[0])')==attendu
            assert await pg.evaluate('!T1K.motionRec')
            for w,h in ((393,851),(360,640),(880,400)):
                await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
                await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('t1k-v205-%sx%s.png'%(w,h))))
            print('OK : gestes réels TUNE/LEVEL enregistrés sans REC notes, STOP désarme et sauvegarde conservée',flush=True)
            # v206 : ON/OFF audible dans les WAV, effacement confirmé et ciblé.
            await pg.evaluate("let m=motifT1kCur();m.pas.fill(0);m.pas[0]=1;m.muet.fill(false);m.solo=-1;m.motionActive=true;m.direction[0]='avant';m.reglages[0].fill(null);m.reglages[0][0]={niv:0};m.reglages[1][2]={dec:.2};m.instr[0].niv=.3;T1K.sel=0;majT1k()")
            assert await pic_wav()<.0001
            await pg.locator('#t1k-motion-active').click()
            assert await pg.evaluate('!motifT1kCur().motionActive&&motifT1kCur().reglages[0][0].niv===0')
            assert await pic_wav()>.001
            await pg.evaluate('memT1k();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.evaluate('!motifT1kCur().motionActive')
            await pg.locator('#t1k-motion-active').click();assert await pic_wav()<.0001
            pg.once('dialog',lambda d:d.dismiss());await pg.locator('#t1k-effacer-vars').click()
            assert await pg.evaluate('motifT1kCur().reglages[0][0].niv===0')
            pg.once('dialog',lambda d:d.accept());await pg.locator('#t1k-effacer-vars').click()
            assert await pg.evaluate('motifT1kCur().reglages[0].every(v=>v===null)&&motifT1kCur().reglages[1][2].dec===.2&&motifT1kCur().pas[0]===1')
            assert await pic_wav()>.001
            await pg.locator('#t1k-start').click();assert await pg.locator('#t1k-effacer-vars').is_disabled()
            await pg.locator('#t1k-motion-active').click();assert await pg.evaluate('S.run&&!motifT1kCur().motionActive')
            await pg.locator('#t1k-stop').click()
            for w,h in ((393,851),(360,640),(880,400)):
                await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
                await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('t1k-v206-%sx%s.png'%(w,h))))
            print('OK : ON/OFF réel dans les WAV, persistance, effacement annulé/confirmé et protection PLAY',flush=True)
            # v207 : longueur de trois pas continue malgré un tour de quatre pas.
            await pg.evaluate("let m=motifT1kCur();m.last=4;m.pas.fill(0);m.pas[0]=1;m.sub[0].fill(1);m.prob[0].fill(100);m.cycle[0].fill('1:1');m.retard[0].fill(0);m.reglages[0].fill(null);m.solo=-1;m.muet.fill(false);Object.assign(m.instr[0],{mix:0,niv:.3,dec:0});T1K.sel=0;T1K.mA=null;T1K.mB=null;S.bpm=120;WAVX.mesures=3;majT1k()")
            await pg.locator('#t1k-longueur').select_option('3')
            assert await pg.evaluate('motifT1kCur().longueurs[0]===3&&motifT1kCur().longueurs[1]===0')
            assert 'hors' in (await pg.locator('#t1k-pas button').nth(3).get_attribute('class'))
            for direction,attendus in [('avant',[0,3,6,9]),('arriere',[2,5,8,11]),('pingpong',[0,4,8])]:
                r=await pg.evaluate(rendu_direction,direction)
                assert [i for i,x in enumerate(r['pics']) if x>.001]==attendus,r
            await pg.evaluate('memT1k();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
            await pg.locator('.pick[data-m=t1k]').click()
            assert await pg.evaluate('motifT1kCur().longueurs[0]===3')
            await pg.locator('#t1k-start').click();assert await pg.locator('#t1k-longueur').is_disabled()
            await pg.locator('#t1k-stop').click()
            await pg.locator('#t1k-longueur').select_option('0')
            assert await pg.evaluate('longueurInstrumentT1k(motifT1kCur(),0)===4')
            await pg.locator('#t1k-longueur').select_option('3')
            for w,h in ((393,851),(360,640),(880,400)):
                await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
                await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('t1k-v208-%sx%s.png'%(w,h))))
            print('OK : longueur indépendante, vrais WAV des trois directions, sauvegarde, protection PLAY et SUIVRE LAST',flush=True)
            assert not erreurs,erreurs
            print('TR-1000 navigateur : tout est bon.',flush=True)
        finally:
            await co.close();await nav.close()

if __name__=='__main__': asyncio.run(main())
