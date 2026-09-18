#!/usr/bin/env python3
"""Diagnostic : consultation sans effet sur le moteur, reset et relance explicite."""
import asyncio,runpy
from pathlib import Path
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
            await pg.evaluate('audioInit();window.__avantCtx=ctx;window.__relances=0;window.__relancerVrai=refaireAudio;refaireAudio=function(){__relances++;window.__pile=new Error().stack};void 0')
            for _ in range(2):
                await pg.locator('#menu-audio').click()
                assert await pg.locator('#audio-diagnostic').is_visible()
                await pg.locator('#audio-fermer').click()
            assert await pg.evaluate('ctx===__avantCtx&&__relances===0'),await pg.evaluate('({same:ctx===__avantCtx,relances:__relances,state:ctx&&ctx.state,pile:window.__pile})')
            await pg.evaluate('audioInit();window.__avantCtx=ctx;window.__memo=JSON.stringify(memoire);Object.assign(AUDIT,{pause:3614,trous:2,decroche:2,relances:1,tJeu:300000,pic:124,picAvenir:23})')
            await pg.locator('#menu-audio').click()
            texte=await pg.locator('#audio-releve').inner_text();assert '3614 ms' in texte and '2 RECALAGES' in texte
            await pg.locator('#audio-actualiser').click();assert await pg.evaluate('__relances===0')
            for w,h in [(393,851),(360,640),(880,400)]:
                await pg.set_viewport_size({'width':w,'height':h})
                await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/f'audio-v201-{w}x{h}.png'))
            await pg.locator('#audio-reset').click()
            assert await pg.evaluate('Object.values(AUDIT).every(v=>v===0)&&ctx===__avantCtx&&JSON.stringify(memoire)===__memo&&__relances===0')
            assert '0 RECALAGES' in await pg.locator('#audio-releve').inner_text()
            await pg.locator('#audio-relancer').click();assert await pg.evaluate('__relances===1')
            await pg.locator('#audio-fermer').click()
            await pg.evaluate('refaireAudio=__relancerVrai;void 0')
            assert not erreurs,erreurs
            print('Diagnostic audio : affichage, double consultation sans relance, reset isolé, actualisation et relance explicite OK.')
        finally:await co.close();await nav.close()
if __name__=='__main__':asyncio.run(main())
