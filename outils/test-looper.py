#!/usr/bin/env python3
"""v296 : LOOPER DE RACK — quatre pistes qui captent une phrase sur IN puis
la bouclent (RECORD, MUET, CLEAR). Catalogue, façade, deux montages et vrais
rendus audio en OfflineAudioContext : capture réelle au prochain temps fort,
lecture bouclée, muet et effacement.
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
   pistes: root.querySelectorAll('.lpr-piste').length,
   rec: root.querySelectorAll('.lpr-rec').length,
   muet: root.querySelectorAll('.lpr-muet').length,
   clear: root.querySelectorAll('.lpr-clear').length,
   reglages: root.querySelectorAll('.lpr-reglages select').length
 };
}'''

# L'API m.looper.* (armer/muet/effacer) agit comme un potard ou un bouton
# pressé en direct : elle prend effet aussitôt, à l'instant de l'appel. Dans
# un rendu OfflineAudioContext, TOUS les recevoir()/armer()/muet() d'une
# passe s'exécutent en code JS "logique" avant qu'un seul échantillon soit
# réellement rendu — donc un muet(true) appelé "après" la capture dans le
# texte du script prend en réalité effet dès le tout début du rendu, pas au
# temps musical où il semble se produire. Chaque scénario ci-dessous se
# rend donc dans son propre OfflineAudioContext, avec l'état voulu déjà en
# place avant le rendu, plutôt que d'enchaîner plusieurs états dans un même
# rendu (même limite que documentée pour les enveloppes, voir POLY 4).
# creerScene/rmsDe sont injectées une fois en page (INIT) pour éviter de
# dupliquer ce code dans chaque bloc évalué séparément.
INIT = r'''() => {
 window._lprScene = async function(sr) {
   stop(); if (ctx && ctx.close && !ctx.startRendering) await ctx.close();
   S.bpm = 120;
   const dt = 60 / S.bpm / 4, bar = dt * 16;
   ctx = new OfflineAudioContext(1, Math.ceil((bar * 3 + 1) * sr), sr);
   const m = {type:'looper', p:{mes:1, fondu:10, niv:100, niv1:100, niv2:100, niv3:100, niv4:100}};
   m.io = EUR_CAT.looper.creer(m);
   const osc = ctx.createOscillator(), og = ctx.createGain();
   osc.type = 'sawtooth'; osc.frequency.value = 220; og.gain.value = 0.5;
   osc.connect(og); og.connect(m.io.e.in); osc.start();
   m.io.s.out.connect(ctx.destination);
   return {m, dt, bar};
 };
 window._lprRms = function(d, sr, a, b) {
   let s = 0, n = 0;
   for (let i = Math.floor(a*sr); i < Math.floor(b*sr) && i < d.length; i++) { s += d[i]*d[i]; n++; }
   return n ? Math.sqrt(s/n) : 0;
 };
}'''

AUDIO = r'''async ({sr}) => {
 const {m, dt, bar} = await window._lprScene(sr);
 m.looper.armer(0);
 for (let i = 0; i < 40; i++) m.recevoir(i * dt, 'clk');
 const buf = await ctx.startRendering();
 const d = buf.getChannelData(0);
 return {
   avantCapture: window._lprRms(d, sr, 0, bar * 0.5),
   pendantCapture: window._lprRms(d, sr, bar * 0.1, bar * 0.9),
   boucle1: window._lprRms(d, sr, bar * 1.1, bar * 1.9),
   boucle2: window._lprRms(d, sr, bar * 2.1, bar * 2.9),
   bad: d.some(x => !Number.isFinite(x)),
   etatFinal: m.looper.etat(0)
 };
}'''

MUET = r'''async ({sr}) => {
 const A = await window._lprScene(sr);
 A.m.looper.armer(0);
 for (let i = 0; i < 40; i++) A.m.recevoir(i * A.dt, 'clk');
 A.m.looper.muet(0, true);
 const bufA = await ctx.startRendering();
 const dA = bufA.getChannelData(0);
 const B = await window._lprScene(sr);
 B.m.looper.armer(0);
 for (let i = 0; i < 40; i++) B.m.recevoir(i * B.dt, 'clk');
 B.m.looper.muet(0, true);
 B.m.looper.muet(0, false);
 const bufB = await ctx.startRendering();
 const dB = bufB.getChannelData(0);
 return {
   pendantMuet: window._lprRms(dA, sr, A.bar * 1.1, A.bar * 1.9),
   badMuet: dA.some(x => !Number.isFinite(x)),
   pendantDemuet: window._lprRms(dB, sr, B.bar * 1.1, B.bar * 1.9),
   badDemuet: dB.some(x => !Number.isFinite(x))
 };
}'''

EFFACER = r'''async ({sr}) => {
 const {m, dt, bar} = await window._lprScene(sr);
 m.looper.armer(0);
 for (let i = 0; i < 40; i++) m.recevoir(i * dt, 'clk');
 m.looper.effacer(0);
 const buf = await ctx.startRendering();
 const d = buf.getChannelData(0);
 return {
   apresEffacement: window._lprRms(d, sr, bar * 1.1, bar * 2.9),
   bad: d.some(x => !Number.isFinite(x)),
   etat: m.looper.etat(0)
 };
}'''

STRUCTURE = r'''() => EUR_MONTAGES.filter(p => ['looper-boucle','looper-dub'].includes(p.id)).map(P => {
 const erreurs = [];
 P.mods.forEach((x, i) => { if (!EUR_CAT[x[0]]) erreurs.push('type inconnu ' + x[0] + ' au rang ' + i); });
 P.cables.forEach(c => { if (c[0] < 0 || c[0] >= P.mods.length || c[2] < 0 || c[2] >= P.mods.length) erreurs.push('câble hors rang ' + JSON.stringify(c)); });
 const aLooper = P.mods.some(x => x[0] === 'looper');
 const versLooper = P.cables.some(([a,s,b,e]) => P.mods[b] && P.mods[b][0] === 'looper' && e === 'in');
 const clkLooper = P.cables.some(([a,s,b,e]) => P.mods[b] && P.mods[b][0] === 'looper' && e === 'clk');
 const perf = P.performance && P.performance.commandes && P.performance.commandes.length === 8;
 return {id: P.id, bpm: P.bpm, mods: P.mods.length, cables: P.cables.length, erreurs, aLooper, versLooper, clkLooper, perf};
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
            v(pg.evaluate("Object.keys(EUR_CAT).length===123 && new Set(EUR_ORDRE).size===123 && EUR_MONTAGES.length===74"),
              tag + ' catalogue 123 modules / 74 montages')
            v(pg.evaluate("!!EUR_CAT.looper && EUR_CAT.looper.jacks.length===4 && EUR_CAT.looper.kns.length===7"),
              tag + ' module LOOPER : quatre prises, sept réglages')
            pg.evaluate("EUR.mods=[];EUR.cables=[];EUR.attente=null;const m=eurAjouter('looper',true);eurDessiner();EUR_FOCUS.ouvrir(m.id);")
            fa = pg.evaluate(FACADE)
            v(fa['pistes'] == 4, tag + ' quatre pistes ' + str(fa))
            v(fa['rec'] == 4 and fa['muet'] == 4 and fa['clear'] == 4, tag + ' RECORD, MUET, CLEAR sur chaque piste ' + str(fa))
            v(fa['reglages'] == 7, tag + ' sept réglages accessibles (autant que de potards) ' + str(fa))
            pg.evaluate("EUR_FOCUS.fermer(false)")
            for s in pg.evaluate(STRUCTURE):
                v(not s['erreurs'] and s['aLooper'] and s['versLooper'] and s['clkLooper'] and s['perf']
                  and s['mods'] > 8 and s['cables'] > 8, tag + ' montage ' + str(s))
            v(not err, tag + ' aucune erreur JavaScript ' + str(err))
            print('Contrôlé ' + tag, flush=True); c.close()
        c = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = c.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(f.as_uri(), wait_until='domcontentloaded'); pg.wait_for_timeout(80)
        pg.set_default_timeout(60000)
        pg.evaluate(INIT)
        for sr in [44100, 48000]:
            d = pg.evaluate(AUDIO, {'sr': sr})
            v(not d['bad'], str(sr) + ' Hz LOOPER : rendu sans NaN ' + str(d))
            v(d['avantCapture'] < 0.02, str(sr) + ' Hz LOOPER : silencieux avant le premier temps fort ' + str(d))
            v(d['pendantCapture'] < 0.02, str(sr) + ' Hz LOOPER : silencieux pendant la capture, pas de retour direct ' + str(d))
            v(d['boucle1'] > 0.05 and d['boucle2'] > 0.05, str(sr) + ' Hz LOOPER : la phrase captée boucle deux fois ' + str(d))
            v(abs(d['boucle1'] - d['boucle2']) < 0.02, str(sr) + ' Hz LOOPER : les deux tours de boucle se ressemblent ' + str(d))
            v(d['etatFinal']['lecture'] and not d['etatFinal']['enregistre'], str(sr) + ' Hz LOOPER : piste en lecture à la fin ' + str(d))
            dm = pg.evaluate(MUET, {'sr': sr})
            v(not dm['badMuet'] and not dm['badDemuet'], str(sr) + ' Hz LOOPER : MUET sans NaN ' + str(dm))
            v(dm['pendantMuet'] < 0.01, str(sr) + ' Hz LOOPER : silencieux pendant MUET ' + str(dm))
            v(dm['pendantDemuet'] > 0.05, str(sr) + ' Hz LOOPER : de nouveau audible après démuet ' + str(dm))
            de = pg.evaluate(EFFACER, {'sr': sr})
            v(not de['bad'], str(sr) + ' Hz LOOPER : CLEAR sans NaN ' + str(de))
            v(de['apresEffacement'] < 0.01, str(sr) + ' Hz LOOPER : silencieux après CLEAR ' + str(de))
            v(not de['etat']['lecture'] and de['etat']['longueur'] == 0, str(sr) + ' Hz LOOPER : piste vidée après CLEAR ' + str(de))
        v(not err, 'signaux sans erreur JavaScript ' + str(err))
        c.close(); browser.close()
    report = {'version': 296, 'verifications': total, 'erreurs': erreurs, 'formats': FORMATS}
    if a.rapport:
        a.rapport.parent.mkdir(parents=True, exist_ok=True)
        a.rapport.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'LOOPER DE RACK : {total} vérifications, {len(erreurs)} erreur(s).', flush=True)
    raise SystemExit(bool(erreurs))

if __name__ == '__main__':
    main()
