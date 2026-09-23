#!/usr/bin/env python3
"""v295 : POLY 4 — synthé autonome à quatre voix, clavier tactile d'une
octave, quatre mémoires d'accord. Catalogue, façade (clavier, mémoires,
réglages), deux montages et vrais rendus audio en OfflineAudioContext
(tenue, relâchement, vol de voix à la cinquième note).
"""
import argparse, importlib.util, json
from pathlib import Path
from playwright.sync_api import sync_playwright
R = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('graphique', Path(__file__).with_name('test-graphique.py'))
G = importlib.util.module_from_spec(spec)
spec.loader.exec_module(G)
FORMATS = [(393, 851), (880, 400), (360, 640)]

FACADE = r'''() => {
 const root=document.querySelector('#eur-focus');
 return {
   touches: root.querySelectorAll('.p4-touche').length,
   noires: root.querySelectorAll('.p4-touche.p4-noire').length,
   mem: root.querySelectorAll('.p4-mem').length,
   reglages: root.querySelectorAll('.p4-reglages select').length,
   memoriser: !!root.querySelector('.p4-memoriser'),
   octaves: root.querySelectorAll('.p4-oct').length
 };
}'''

AUDIO = r'''async ({sr}) => {
 stop(); if (ctx && ctx.close && !ctx.startRendering) await ctx.close();
 ctx = new OfflineAudioContext(1, Math.ceil(sr * 1.2), sr);
 const m = {type:'poly4', p:{osc:0, det:20, cut:65, res:20, att:8, chu:220, niv:80}};
 m.io = EUR_CAT.poly4.creer(m);
 m.io.s.out.connect(ctx.destination);
 m.poly4.presser(0.05, 60);
 m.poly4.presser(0.05, 64);
 m.poly4.presser(0.05, 67);
 m.poly4.relacher(0.6, 60);
 m.poly4.relacher(0.6, 64);
 m.poly4.relacher(0.6, 67);
 const buf = await ctx.startRendering();
 const d = buf.getChannelData(0);
 function rms(a, b) { let s = 0, n = 0; for (let i = Math.floor(a*sr); i < Math.floor(b*sr) && i < d.length; i++) { s += d[i]*d[i]; n++; } return n ? Math.sqrt(s/n) : 0; }
 return {
   avant: rms(0, 0.04),
   tenu: rms(0.3, 0.55),
   apres: rms(1.0, 1.15),
   bad: d.some(x => !Number.isFinite(x))
 };
}'''

VOLDEVOIX = r'''async ({sr}) => {
 stop(); if (ctx && ctx.close && !ctx.startRendering) await ctx.close();
 ctx = new OfflineAudioContext(1, Math.ceil(sr * 0.3), sr);
 const m = {type:'poly4', p:{osc:0, det:20, cut:65, res:20, att:5, chu:220, niv:80}};
 m.io = EUR_CAT.poly4.creer(m);
 m.io.s.out.connect(ctx.destination);
 const notes = [60, 62, 64, 65, 67];
 const actifs = [];
 notes.forEach((n, i) => { m.poly4.presser(0.01 * (i + 1), n); actifs.push(m.poly4.voixActives()); });
 const tenues = m.poly4.tenues().slice().sort((a,b)=>a-b);
 return {actifs, maxVoix: Math.max(...actifs), tenues, attendu: notes.slice().sort((a,b)=>a-b)};
}'''

STRUCTURE = r'''() => EUR_MONTAGES.filter(p => ['poly4-nappe','poly4-club'].includes(p.id)).map(P => {
 const erreurs = [];
 P.mods.forEach((x, i) => { if (!EUR_CAT[x[0]]) erreurs.push('type inconnu ' + x[0] + ' au rang ' + i); });
 P.cables.forEach(c => { if (c[0] < 0 || c[0] >= P.mods.length || c[2] < 0 || c[2] >= P.mods.length) erreurs.push('câble hors rang ' + JSON.stringify(c)); });
 const aPoly4 = P.mods.some(x => x[0] === 'poly4');
 const poly4VersSortie = P.cables.some(([a]) => P.mods[a] && P.mods[a][0] === 'poly4');
 const perf = P.performance && P.performance.commandes && P.performance.commandes.length === 8;
 return {id: P.id, bpm: P.bpm, mods: P.mods.length, cables: P.cables.length, erreurs, aPoly4, poly4VersSortie, perf};
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
            pg.evaluate(G.OUVRIR, 'eur')
            tag = f'{w}x{h}'
            v(pg.evaluate("Object.keys(EUR_CAT).length===122 && new Set(EUR_ORDRE).size===122 && EUR_MONTAGES.length===72"),
              tag + ' catalogue 122 modules / 72 montages')
            v(pg.evaluate("!!EUR_CAT.poly4 && EUR_CAT.poly4.jacks.length===1 && EUR_CAT.poly4.jacks[0][0]==='out' && EUR_CAT.poly4.kns.length===7"),
              tag + ' module POLY 4 : une sortie, sept réglages')
            pg.evaluate("EUR.mods=[];EUR.cables=[];EUR.attente=null;const m=eurAjouter('poly4',true);eurDessiner();EUR_FOCUS.ouvrir(m.id);")
            fa = pg.evaluate(FACADE)
            v(fa['touches'] == 13 and fa['noires'] == 5, tag + ' clavier : treize touches dont cinq noires ' + str(fa))
            v(fa['mem'] == 4 and fa['memoriser'] and fa['octaves'] == 2, tag + ' quatre mémoires, MÉMORISER, deux boutons octave ' + str(fa))
            v(fa['reglages'] == 7, tag + ' sept réglages accessibles (autant que de potards) ' + str(fa))
            pg.evaluate("EUR_FOCUS.fermer(false)")
            for s in pg.evaluate(STRUCTURE):
                v(not s['erreurs'] and s['aPoly4'] and s['poly4VersSortie'] and s['perf']
                  and s['mods'] > 8 and s['cables'] > 8, tag + ' montage ' + str(s))
            v(not err, tag + ' aucune erreur JavaScript ' + str(err))
            print('Contrôlé ' + tag, flush=True); c.close()
        c = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = c.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(f.as_uri(), wait_until='domcontentloaded'); pg.wait_for_timeout(80)
        pg.set_default_timeout(60000)
        for sr in [44100, 48000]:
            d = pg.evaluate(AUDIO, {'sr': sr})
            v(not d['bad'], str(sr) + ' Hz POLY 4 : rendu sans NaN ' + str(d))
            v(d['avant'] < 0.02, str(sr) + ' Hz POLY 4 : silencieux avant la première pression ' + str(d))
            v(d['tenu'] > 0.05, str(sr) + ' Hz POLY 4 : un accord tenu de trois notes est audible ' + str(d))
            v(d['apres'] < d['tenu'] * 0.1, str(sr) + ' Hz POLY 4 : quasi silencieux bien après le relâchement ' + str(d))
            vv = pg.evaluate(VOLDEVOIX, {'sr': sr})
            v(vv['maxVoix'] <= 4, str(sr) + ' Hz POLY 4 : jamais plus de quatre voix actives ' + str(vv))
            v(vv['tenues'] == vv['attendu'], str(sr) + ' Hz POLY 4 : cinq notes tenues au clavier malgré le vol de voix ' + str(vv))
        v(not err, 'signaux sans erreur JavaScript ' + str(err))
        c.close(); browser.close()
    report = {'version': 295, 'verifications': total, 'erreurs': erreurs, 'formats': FORMATS}
    if a.rapport:
        a.rapport.parent.mkdir(parents=True, exist_ok=True)
        a.rapport.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'POLY 4 : {total} vérifications, {len(erreurs)} erreur(s).', flush=True)
    raise SystemExit(bool(erreurs))

if __name__ == '__main__':
    main()
