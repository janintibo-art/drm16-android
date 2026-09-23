#!/usr/bin/env python3
"""v290 : FREEZE GRANULAIRE — capture réelle (ScriptProcessorNode, pas de
MediaRecorder ni d'AudioWorklet), lecture de grains, catalogue et trois
montages. La logique pure (valeurs, grainOffset) est déjà vérifiée par
outils/test-freeze-granulaire.cjs ; ce test-ci porte sur les vrais nœuds
Web Audio, en direct et dans un rendu OfflineAudioContext.
"""
import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright
R = Path(__file__).resolve().parents[1]
FORMATS = [(393, 851), (880, 400), (360, 640)]
IDS = ['freeze-psy', 'freeze-jungle', 'freeze-dub']

CAPTURE = r'''async ({sr}) => {
 stop(); if (ctx && ctx.close && !ctx.startRendering) await ctx.close();
 ctx = new OfflineAudioContext(2, Math.ceil(sr * 2.5), sr);
 const m = {type:'freeze', p:{dur:0.3, pos:0, spray:0, taille:50, haut:0, niv:0.8}};
 m.io = EUR_CAT.freeze.creer(m);
 m.io.s.out.connect(ctx.destination);
 /* un plateau constant, capturé tout entier : l'enveloppe du grain (rampe
    connue, calculée à l'identique côté test) devient la seule inconnue,
    sans dépendre de la phase d'un signal qui varie. */
 const NIV = 0.4;
 const buf = ctx.createBuffer(2, Math.ceil(sr * 2.5), sr);
 for (let i = 0; i < buf.length; i++) { buf.getChannelData(0)[i] = NIV; buf.getChannelData(1)[i] = -NIV; }
 const src = ctx.createBufferSource(); src.buffer = buf; src.connect(m.io.e.in); src.start();
 m.recevoir(0.2, 'capt');                 /* capture de 0,2 s à 0,5 s */
 const avantGel = m.gel.pret;
 m.recevoir(1.0, 'trig');                 /* un grain, position 0 → début du fragment capturé */
 const out = await ctx.startRendering();
 const dureeS = 0.05, att = Math.min(dureeS * 0.4, 0.015);
 function attendu(tau) {
   if (tau < 0 || tau > dureeS) return 0;
   if (tau < att) return (tau / att) * 0.8;
   return 0.8 * (1 - (tau - att) / (dureeS - att));
 }
 let avant = 0, apres = 0, ecart = 0;
 for (let i = 0; i < out.length; i++) {
   const t = i / sr, y = out.getChannelData(0)[i], tau = t - 1.0;
   if (t < 1.0) avant = Math.max(avant, Math.abs(y));
   else if (t > 1.2) apres = Math.max(apres, Math.abs(y));
   else if (tau >= 0 && tau <= dureeS) ecart = Math.max(ecart, Math.abs(y - attendu(tau) * NIV));
 }
 return {sr, avantGel, pretApres: m.gel.pret, avant, apres, ecart};
}'''

STRUCTURE = r'''() => EUR_MONTAGES.filter(p => ['freeze-psy','freeze-jungle','freeze-dub'].includes(p.id)).map(P => {
 const erreurs = [];
 P.mods.forEach((x, i) => { if (!EUR_CAT[x[0]]) erreurs.push('type inconnu ' + x[0] + ' au rang ' + i); });
 P.cables.forEach(c => { if (c[0] < 0 || c[0] >= P.mods.length || c[2] < 0 || c[2] >= P.mods.length) erreurs.push('câble hors rang ' + JSON.stringify(c)); });
 const aUnFreeze = P.mods.some(x => x[0] === 'freeze');
 const perf = P.performance && P.performance.commandes && P.performance.commandes.length === 8;
 return {id: P.id, bpm: P.bpm, mods: P.mods.length, cables: P.cables.length, erreurs, aUnFreeze, perf};
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
            v(pg.evaluate("Object.keys(EUR_CAT).length===120 && new Set(EUR_ORDRE).size===120 && EUR_MONTAGES.length===68"),
              tag + ' catalogue 120 modules / 68 montages')
            v(pg.evaluate("!!EUR_CAT.freeze && EUR_CAT.freeze.jacks.map(j=>j[0]).sort().join(',')==='capt,in,out,rst,trig' && EUR_CAT.freeze.kns.length===6"),
              tag + ' module FREEZE GRANULAIRE : cinq prises, six réglages')
            for s in pg.evaluate(STRUCTURE):
                v(not s['erreurs'] and s['aUnFreeze'] and s['perf'] and s['mods'] > 10 and s['cables'] > 10,
                  tag + ' montage ' + str(s))
            v(not err, tag + ' aucune erreur JavaScript ' + str(err))
            print('Contrôlé ' + tag, flush=True); c.close()
        c = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = c.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(f.as_uri(), wait_until='domcontentloaded'); pg.wait_for_timeout(80)
        pg.set_default_timeout(60000)
        for sr in [44100, 48000, 96000]:
            d = pg.evaluate(CAPTURE, {'sr': sr})
            v(not d['avantGel'] and d['pretApres'] and d['avant'] < 1e-9 and d['apres'] < 1e-9 and
              d['ecart'] < 0.003, 'capture puis grain, ' + str(sr) + ' Hz : ' + str(d))
        v(not err, 'signaux sans erreur JavaScript ' + str(err))
        c.close(); browser.close()
    report = {'version': 290, 'verifications': total, 'erreurs': erreurs, 'formats': FORMATS}
    if a.rapport:
        a.rapport.parent.mkdir(parents=True, exist_ok=True)
        a.rapport.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'FREEZE GRANULAIRE : {total} vérifications, {len(erreurs)} erreur(s).', flush=True)
    raise SystemExit(bool(erreurs))

if __name__ == '__main__':
    main()
