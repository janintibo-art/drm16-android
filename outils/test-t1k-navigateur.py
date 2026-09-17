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
            assert not erreurs,erreurs
            print('TR-1000 navigateur : tout est bon.',flush=True)
        finally:
            await co.close();await nav.close()

if __name__=='__main__': asyncio.run(main())
