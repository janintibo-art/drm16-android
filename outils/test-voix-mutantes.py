#!/usr/bin/env python3
"""v294 : VOIX MUTANTES — VOYELLE (VCO à formants) et VOCODEUR (banc de huit
bandes), catalogue, trois montages et vrais rendus audio en
OfflineAudioContext. L'interpolation des formants (pure, sans audio) est
vérifiée par EUR_VOIXMUT.formant ; le reste porte sur les vrais nœuds Web
Audio (BiquadFilterNode, WaveShaperNode), en direct comme hors ligne.
"""
import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright
R = Path(__file__).resolve().parents[1]
FORMATS = [(393, 851), (880, 400), (360, 640)]

FORMANTS = r'''() => {
 const V = EUR_VOIXMUT;
 return {
   a: V.formant(0), u: V.formant(4),
   milieu: V.formant(0.5),
   borneBasse: V.formant(-3), borneHaute: V.formant(9),
   table: V.voyelles.length, bandes: V.bandes.length
 };
}'''

VOYELLE_AUDIO = r'''async ({sr}) => {
 stop(); if (ctx && ctx.close && !ctx.startRendering) await ctx.close();
 ctx = new OfflineAudioContext(1, Math.ceil(sr * 0.3), sr);
 const m = {type:'voyelle', p:{oct:0, voy:0, timbre:60, mut:0, res:45, niv:80}};
 m.io = EUR_CAT.voyelle.creer(m);
 m.io.s.out.connect(ctx.destination);
 const outA = await ctx.startRendering();
 let rmsA = 0; const dA = outA.getChannelData(0);
 for (const x of dA) rmsA += x * x; rmsA = Math.sqrt(rmsA / dA.length);
 return {sr, rmsA, bad: dA.some(x => !Number.isFinite(x))};
}'''

VOCODEUR_AUDIO = r'''async ({sr}) => {
 stop(); if (ctx && ctx.close && !ctx.startRendering) await ctx.close();
 async function rendre(oscNiv, modNiv, freqMod) {
   if (ctx && ctx.close && !ctx.startRendering) await ctx.close();
   ctx = new OfflineAudioContext(1, Math.ceil(sr * 0.4), sr);
   const m = {type:'vocodeur', p:{osc:oscNiv, note:45, decal:0, vit:15, mix:100, niv:90}};
   m.io = EUR_CAT.vocodeur.creer(m);
   m.io.s.out.connect(ctx.destination);
   if (modNiv > 0) {
     const o = ctx.createOscillator(), g = ctx.createGain();
     o.type = 'sawtooth'; o.frequency.value = freqMod; g.gain.value = modNiv;
     o.connect(g); g.connect(m.io.e.mod); o.start();
   }
   const b = await ctx.startRendering();
   let rms = 0; const d = b.getChannelData(0);
   for (const x of d) rms += x * x; rms = Math.sqrt(rms / d.length);
   const bad = d.some(x => !Number.isFinite(x)), peak = d.reduce((a,x)=>Math.max(a,Math.abs(x)),0);
   return {rms, bad, peak};
 }
 const silence = await rendre(100, 0, 0);
 const module = await rendre(100, 0.6, 552);
 const sansPorteuse = await rendre(0, 0.6, 552);
 return {sr, silence, module, sansPorteuse};
}'''

STRUCTURE = r'''() => EUR_MONTAGES.filter(p => ['voix-robot','voix-psy','voix-dub'].includes(p.id)).map(P => {
 const erreurs = [];
 P.mods.forEach((x, i) => { if (!EUR_CAT[x[0]]) erreurs.push('type inconnu ' + x[0] + ' au rang ' + i); });
 P.cables.forEach(c => { if (c[0] < 0 || c[0] >= P.mods.length || c[2] < 0 || c[2] >= P.mods.length) erreurs.push('câble hors rang ' + JSON.stringify(c)); });
 const aVoyelle = P.mods.some(x => x[0] === 'voyelle'), aVocodeur = P.mods.some(x => x[0] === 'vocodeur');
 const voyelleVersVocodeur = P.cables.some(([a,s,b,e]) => EUR_CAT[P.mods[a]?.[0]]?.jacks && P.mods[b]?.[0] === 'vocodeur' && e === 'mod');
 const perf = P.performance && P.performance.commandes && P.performance.commandes.length === 8;
 return {id: P.id, bpm: P.bpm, mods: P.mods.length, cables: P.cables.length, erreurs, aVoyelle, aVocodeur, voyelleVersVocodeur, perf};
})'''

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium'); ap.add_argument('--rapport', type=Path)
    a = ap.parse_args()
    total = 0; erreurs = []
    def v(c, msg):
        nonlocal total
        total += 1
        if not c: erreurs.append(msg); print('FAUX ' + msg, flush=True)
    with sync_playwright() as p:
        opt = {'headless': True, 'args': ['--autoplay-policy=no-user-gesture-required']}
        if a.chromium: opt['executable_path'] = a.chromium; opt['args'].append('--no-sandbox')
        browser = p.chromium.launch(**opt)
        f = R / 'app/src/main/assets/drm16.html'
        for w, h in FORMATS:
            c = browser.new_context(viewport={'width': w, 'height': h}, has_touch=w < 1000)
            pg = c.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
            pg.goto(f.as_uri(), wait_until='domcontentloaded'); pg.wait_for_timeout(80)
            tag = f'{w}x{h}'
            v(pg.evaluate("Object.keys(EUR_CAT).length===119 && new Set(EUR_ORDRE).size===119 && EUR_MONTAGES.length===66"),
              tag + ' catalogue 119 modules / 66 montages')
            v(pg.evaluate("!!EUR_CAT.voyelle && EUR_CAT.voyelle.jacks.map(j=>j[0]).sort().join(',')==='out,voct,voyin' && EUR_CAT.voyelle.kns.length===6"),
              tag + ' module VOYELLE : trois prises, six réglages')
            v(pg.evaluate("!!EUR_CAT.vocodeur && EUR_CAT.vocodeur.jacks.map(j=>j[0]).sort().join(',')==='mod,out,por' && EUR_CAT.vocodeur.kns.length===6"),
              tag + ' module VOCODEUR : trois prises, six réglages')
            fm = pg.evaluate(FORMANTS)
            v(fm['a'][0] == 730 and fm['a'][1] == 1090, tag + ' formant(0) = A ' + str(fm['a']))
            v(fm['u'][0] == 300 and fm['u'][1] == 870, tag + ' formant(4) = U ' + str(fm['u']))
            v(abs(fm['milieu'][0] - 630) < 1e-9 and abs(fm['milieu'][1] - 1465) < 1e-9, tag + ' formant(0.5) interpolé A→E ' + str(fm['milieu']))
            v(fm['borneBasse'] == fm['a'] and fm['borneHaute'] == fm['u'], tag + ' formant() borné à [0,4] ' + str(fm))
            v(fm['table'] == 5 and fm['bandes'] == 8, tag + ' table de cinq voyelles, huit bandes de vocodeur')
            for s in pg.evaluate(STRUCTURE):
                v(not s['erreurs'] and s['aVoyelle'] and s['aVocodeur'] and s['voyelleVersVocodeur'] and s['perf']
                  and s['mods'] > 10 and s['cables'] > 10, tag + ' montage ' + str(s))
            v(not err, tag + ' aucune erreur JavaScript ' + str(err))
            print('Contrôlé ' + tag, flush=True); c.close()
        c = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = c.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(f.as_uri(), wait_until='domcontentloaded'); pg.wait_for_timeout(80)
        pg.set_default_timeout(60000)
        for sr in [44100, 48000]:
            dv = pg.evaluate(VOYELLE_AUDIO, {'sr': sr})
            v(not dv['bad'] and dv['rmsA'] > 0.01, str(sr) + ' Hz VOYELLE : VCO toujours actif, formant A ' + str(dv))
            dc = pg.evaluate(VOCODEUR_AUDIO, {'sr': sr})
            v(not dc['silence']['bad'] and dc['silence']['rms'] < 0.01,
              str(sr) + ' Hz VOCODEUR : porteuse seule sans MOD reste quasi silencieuse ' + str(dc['silence']))
            v(not dc['module']['bad'] and dc['module']['peak'] < 0.99 and dc['module']['rms'] > dc['silence']['rms'] * 3,
              str(sr) + ' Hz VOCODEUR : un MOD réel fait ressortir la porteuse ' + str(dc['module']))
            v(not dc['sansPorteuse']['bad'] and dc['sansPorteuse']['rms'] < dc['module']['rms'] * 0.15,
              str(sr) + ' Hz VOCODEUR : sans porteuse (OSC INTERNE à 0, POR libre) reste quasi silencieux ' + str(dc['sansPorteuse']))
        v(not err, 'signaux sans erreur JavaScript ' + str(err))
        c.close(); browser.close()
    report = {'version': 294, 'verifications': total, 'erreurs': erreurs, 'formats': FORMATS}
    if a.rapport:
        a.rapport.parent.mkdir(parents=True, exist_ok=True)
        a.rapport.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'VOIX MUTANTES : {total} vérifications, {len(erreurs)} erreur(s).', flush=True)
    raise SystemExit(bool(erreurs))

if __name__ == '__main__':
    main()
