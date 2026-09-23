#!/usr/bin/env python3
"""v291 : CYCLES LIBRES — un réglage PAS/MESURE commun à SCÈNES 8, HARMONIE 8
et au FILL de DRUM 32 / BREAK 32, pour suivre un cycle qui n'est pas du 4/4
(7/8, 9/8, 5/4 ou un compte libre de 4 à 32). La logique pure est déjà
vérifiée par outils/test-scenes8.cjs, test-harmonie8.cjs et
test-variations-rythmiques.cjs ; ce test-ci porte sur le vrai navigateur, le
catalogue exact et le comportement par défaut (16 pas) inchangé.
"""
import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright
R = Path(__file__).resolve().parents[1]
FORMATS = [(393, 851), (880, 400), (360, 640)]

SCENES8 = r'''(pasmes) => {
 if (ctx && ctx.close && !ctx.startRendering) ctx.close();
 ctx = new OfflineAudioContext(2, 44100, 44100);
 const m = {id:1, type:'scenes8', p:{pasmes}};
 Object.assign(m.p, {len:2, bars1:1, bars2:1, fade:0});
 m.io = EUR_CAT.scenes8.creer(m);
 const fronts = [];
 for (let i = 0; i < pasmes + 2; i++) fronts.push(m.recevoir(1 + i * .05, 'in'));
 return {pasmes: m.p.pasmes, avantDernier: fronts[pasmes - 1], dernier: fronts[pasmes], scene: m.scenes8.scene};
}'''

HARMONIE8 = r'''(pasmes) => {
 if (ctx && ctx.close && !ctx.startRendering) ctx.close();
 ctx = new OfflineAudioContext(2, 44100, 44100);
 const m = {id:1, type:'harmonie8', p:{pasmes}};
 Object.assign(m.p, {len:2, sync:0});
 m.io = EUR_CAT.harmonie8.creer(m);
 const fronts = [];
 for (let i = 0; i < pasmes + 2; i++) fronts.push(m.recevoir(1 + i * .05, 'in'));
 return {pasmes: m.p.pasmes, avantDernier: fronts[pasmes - 1], dernier: fronts[pasmes], pos: m.harmonie8.pos};
}'''

VARIATIONS = r'''(pasmes) => {
 if (ctx && ctx.close && !ctx.startRendering) ctx.close();
 ctx = new OfflineAudioContext(2, 44100, 44100);
 const m = {id:1, type:'drum32', p:{}};
 EUR_CAT.drum32.kns.forEach(k => m.p[k[0]] = k[4]);
 m.io = EUR_CAT.drum32.creer(m);
 EUR_VARIATIONS.preparerB(m);
 const accepte = EUR_VARIATIONS.pasmes(m, pasmes);
 S.run = true;
 EUR_VARIATIONS.fill(m);
 const lectures = [];
 for (let i = 0; i < pasmes * 2 + 2; i++) { m.recevoir(1 + i * .05, 'clk'); lectures.push(m._rv.lecture); }
 S.run = false;
 return {accepte, pasmes: m.variation.pasmes, lectures};
}'''

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
            v(pg.evaluate("Object.keys(EUR_CAT).length===123 && new Set(EUR_ORDRE).size===123 && EUR_MONTAGES.length===74"),
              tag + ' catalogue inchangé : 123 modules / 74 montages (CYCLES LIBRES ne crée pas de module)')
            v(pg.evaluate("typeof EUR_CYCLE==='object' && EUR_CYCLE.presets.length===4 && EUR_CYCLE.val(2)===4 && EUR_CYCLE.val(99)===32 && EUR_CYCLE.val(undefined)===16 && EUR_CYCLE.val(14)===14"),
              tag + ' EUR_CYCLE : presets et bornage 4–32, défaut 16')
            v(pg.evaluate("(k=>k && k[2]===4 && k[3]===32 && k[4]===16)(EUR_CAT.scenes8.kns.find(k=>k[0]==='pasmes'))"),
              tag + ' SCÈNES 8 : réglage PAS/MESURE présent, 4 à 32, défaut 16')
            v(pg.evaluate("(k=>k && k[2]===4 && k[3]===32 && k[4]===16)(EUR_CAT.harmonie8.kns.find(k=>k[0]==='pasmes'))"),
              tag + ' HARMONIE 8 : réglage PAS/MESURE présent, 4 à 32, défaut 16')
            v(pg.evaluate("typeof EUR_VARIATIONS.pasmes==='function'"),
              tag + ' VARIATIONS : fonction pasmes exposée pour le FILL de DRUM 32 / BREAK 32')
            v(not err, tag + ' aucune erreur JavaScript ' + str(err))
            print('Contrôlé ' + tag, flush=True); c.close()
        c = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = c.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(f.as_uri(), wait_until='domcontentloaded'); pg.wait_for_timeout(80)
        for pasmes, nom in [(16, '4/4'), (14, '7/8'), (18, '9/8'), (20, '5/4'), (11, 'libre')]:
            d = pg.evaluate(SCENES8, pasmes)
            v(d['pasmes'] == pasmes and 'bar' not in d['avantDernier'] and 'bar' in d['dernier'],
              f'SCÈNES 8, {nom} ({pasmes} pas) : mesure exactement au {pasmes}e CLK, ' + str(d))
            d = pg.evaluate(HARMONIE8, pasmes)
            v(d['pasmes'] == pasmes and 'change' not in d['avantDernier'] and 'change' in d['dernier'] and d['pos'] == 1,
              f'HARMONIE 8, {nom} ({pasmes} pas) : accord suivant exactement au {pasmes}e CLK, ' + str(d))
            d = pg.evaluate(VARIATIONS, pasmes)
            attendu = [1 if i < pasmes else 0 for i in range(pasmes * 2 + 2)]
            v(d['accepte'] and d['pasmes'] == pasmes and d['lectures'] == attendu,
              f'DRUM 32 FILL, {nom} ({pasmes} pas) : une mesure de fill exactement, ' + str(d))
        v(not err, 'intégration sans erreur JavaScript ' + str(err))
        c.close(); browser.close()
    report = {'version': 291, 'verifications': total, 'erreurs': erreurs, 'formats': FORMATS}
    if a.rapport:
        a.rapport.parent.mkdir(parents=True, exist_ok=True)
        a.rapport.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'CYCLES LIBRES : {total} vérifications, {len(erreurs)} erreur(s).', flush=True)
    raise SystemExit(bool(erreurs))

if __name__ == '__main__':
    main()
