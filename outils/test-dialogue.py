#!/usr/bin/env python3
"""v297 : DIALOGUE — deux voix qui se répondent, une question improvisée puis
sa réponse décalée (et, en option, retournée). Catalogue, façade, deux
montages et vrais rendus audio en OfflineAudioContext : alternance question/
réponse, décalage de hauteur, mode MIROIR, densité.
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
   reglages: root.querySelectorAll('.dlg-reglages select').length
 };
}'''

STRUCTURE = r'''() => EUR_MONTAGES.filter(p => ['dialogue-duo','dialogue-psy'].includes(p.id)).map(P => {
 const erreurs = [];
 P.mods.forEach((x, i) => { if (!EUR_CAT[x[0]]) erreurs.push('type inconnu ' + x[0] + ' au rang ' + i); });
 P.cables.forEach(c => { if (c[0] < 0 || c[0] >= P.mods.length || c[2] < 0 || c[2] >= P.mods.length) erreurs.push('câble hors rang ' + JSON.stringify(c)); });
 const aDialogue = P.mods.some(x => x[0] === 'dialogue');
 const clkDialogue = P.cables.some(([a,s,b,e]) => P.mods[b] && P.mods[b][0] === 'dialogue' && e === 'clk');
 const versVoix1 = P.cables.some(([a,s,b,e]) => P.mods[a] && P.mods[a][0] === 'dialogue' && s === 'cv1');
 const versVoix2 = P.cables.some(([a,s,b,e]) => P.mods[a] && P.mods[a][0] === 'dialogue' && s === 'cv2');
 const perf = P.performance && P.performance.commandes && P.performance.commandes.length === 8;
 return {id: P.id, bpm: P.bpm, mods: P.mods.length, cables: P.cables.length, erreurs, aDialogue, clkDialogue, versVoix1, versVoix2, perf};
})'''

# Lire ports.cv.offset.value en JS "logique", sans passer par un vrai rendu,
# ne reflète pas ce que l'automatisation produira réellement (même piège que
# documenté pour LOOPER DE RACK et POLY 4) : chaque scénario ci-dessous rend
# donc réellement les quatre sorties (CV 1, GATE 1, CV 2, GATE 2) sur quatre
# voies séparées d'un même OfflineAudioContext, puis échantillonne chaque
# voie 3 ms après chaque pas de CLK — largement dans le palier de la porte
# (12 ms) et après toute automatisation instantanée (pas de glissé ici).
INIT = r'''() => {
 window._dlgRendu = async function(sr, p, pas) {
   stop(); if (ctx && ctx.close && !ctx.startRendering) await ctx.close();
   S.bpm = 120;
   const dt = 60 / S.bpm / 4;
   ctx = new OfflineAudioContext(4, Math.ceil((dt * (pas + 2)) * sr), sr);
   const m = {type:'dialogue', p: Object.assign({root:9, scale:1, longueur:8, decalage:5, densite:100, miroir:0, glisse:0}, p || {})};
   m.io = EUR_CAT.dialogue.creer(m);
   const fusion = ctx.createChannelMerger(4);
   m.io.s.cv1.connect(fusion, 0, 0); m.io.s.gate1.connect(fusion, 0, 1);
   m.io.s.cv2.connect(fusion, 0, 2); m.io.s.gate2.connect(fusion, 0, 3);
   fusion.connect(ctx.destination);
   for (let i = 0; i < pas; i++) m.recevoir(i * dt, 'clk');
   const notes = m.dialogue.notes.slice();
   const buf = await ctx.startRendering();
   const bad = [0,1,2,3].some(c => buf.getChannelData(c).some(x => !Number.isFinite(x)));
   function echantillon(t, c){
     const idx = Math.min(buf.length - 1, Math.max(0, Math.round(t * sr)));
     return buf.getChannelData(c)[idx];
   }
   const cv1 = [], gate1 = [], cv2 = [], gate2 = [];
   for (let i = 0; i < pas; i++) {
     const t = i * dt + 0.003;
     cv1.push(echantillon(t, 0)); gate1.push(echantillon(t, 1));
     cv2.push(echantillon(t, 2)); gate2.push(echantillon(t, 3));
   }
   return {notes, cv1, gate1, cv2, gate2, bad};
 };
}'''

RST = r'''() => {
 stop(); if (ctx && ctx.close && !ctx.startRendering) ctx.close();
 S.bpm = 120;
 const dt = 60 / S.bpm / 4;
 ctx = new OfflineAudioContext(1, Math.ceil(dt * 10 * 44100), 44100);
 const m = {type:'dialogue', p:{root:9, scale:1, longueur:4, decalage:0, densite:100, miroir:0, glisse:0}};
 m.io = EUR_CAT.dialogue.creer(m);
 for (let i = 0; i < 6; i++) m.recevoir(i * dt, 'clk');
 const avant = {pos: m.dialogue.pos, notes: m.dialogue.notes.length};
 m.recevoir(6 * dt, 'rst');
 const apres = {pos: m.dialogue.pos, notes: m.dialogue.notes.length};
 return {avant, apres};
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
            pg.evaluate(G.OUVRIR, 'eur')
            tag = f'{w}x{h}'
            v(pg.evaluate("Object.keys(EUR_CAT).length===123 && new Set(EUR_ORDRE).size===123 && EUR_MONTAGES.length===74"),
              tag + ' catalogue 123 modules / 74 montages')
            v(pg.evaluate("!!EUR_CAT.dialogue && EUR_CAT.dialogue.jacks.length===6 && EUR_CAT.dialogue.kns.length===7"),
              tag + ' module DIALOGUE : six prises, sept réglages')
            pg.evaluate("EUR.mods=[];EUR.cables=[];EUR.attente=null;const m=eurAjouter('dialogue',true);eurDessiner();EUR_FOCUS.ouvrir(m.id);")
            fa = pg.evaluate(FACADE)
            v(fa['reglages'] == 7, tag + ' sept réglages accessibles (autant que de potards) ' + str(fa))
            pg.evaluate("EUR_FOCUS.fermer(false)")
            for s in pg.evaluate(STRUCTURE):
                v(not s['erreurs'] and s['aDialogue'] and s['clkDialogue'] and s['versVoix1'] and s['versVoix2'] and s['perf']
                  and s['mods'] > 8 and s['cables'] > 8, tag + ' montage ' + str(s))
            v(not err, tag + ' aucune erreur JavaScript ' + str(err))
            print('Contrôlé ' + tag, flush=True); c.close()
        c = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = c.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(f.as_uri(), wait_until='domcontentloaded'); pg.wait_for_timeout(80)
        pg.set_default_timeout(60000)
        pg.evaluate(INIT)

        def note_de(cv):
            return round(cv * 12 + 33)

        # DENSITÉ 100 : la question doit jouer une note à chaque pas (rien
        # laissé au hasard) — les huit CV de question doivent correspondre
        # exactement aux notes mémorisées, et les huit portes se déclenchent.
        d1 = pg.evaluate("({sr}) => window._dlgRendu(sr, {longueur:8, densite:100, decalage:0, miroir:0, glisse:0}, 8)", {'sr': 44100})
        v(not d1['bad'], 'DENSITÉ 100 : rendu sans NaN ' + str(d1))
        v(all(n is not None for n in d1['notes']), 'DENSITÉ 100 : huit notes mémorisées ' + str(d1))
        v(all(g > 0.5 for g in d1['gate1']), 'DENSITÉ 100 : la porte 1 se déclenche à chaque pas ' + str(d1))
        v([note_de(c) for c in d1['cv1']] == d1['notes'], 'DENSITÉ 100 : CV 1 correspond aux notes mémorisées ' + str(d1))

        # DÉCALAGE +5, gamme chromatique (pas de requantification) : chaque
        # note de réponse (CV 2, deuxième moitié du cycle) doit valoir
        # exactement la note de question correspondante + 5 demi-tons.
        d2 = pg.evaluate("({sr}) => window._dlgRendu(sr, {longueur:8, densite:100, decalage:5, miroir:0, glisse:0, scale:0}, 16)", {'sr': 44100})
        q2 = d2['notes']; rep2 = [note_de(c) for c in d2['cv2'][8:16]]
        v(not d2['bad'], 'DÉCALAGE : rendu sans NaN ' + str(d2))
        v(all(r == q + 5 for q, r in zip(q2, rep2)), 'DÉCALAGE +5 : chaque note de réponse vaut la question +5 demi-tons ' + str({'q':q2,'rep':rep2}))
        v(all(g < 0.001 for g in d2['gate1'][8:16]), 'DÉCALAGE : la porte 1 reste basse pendant la réponse ' + str(d2))
        v(all(g < 0.001 for g in d2['gate2'][0:8]), 'DÉCALAGE : la porte 2 reste basse pendant la question ' + str(d2))

        # MIROIR : la réponse doit rejouer la question à l'envers (dernière
        # note d'abord), décalage nul pour isoler l'effet du miroir seul.
        d3 = pg.evaluate("({sr}) => window._dlgRendu(sr, {longueur:8, densite:100, decalage:0, miroir:1, glisse:0, scale:0}, 16)", {'sr': 44100})
        q3 = d3['notes']; rep3 = [note_de(c) for c in d3['cv2'][8:16]]
        v(not d3['bad'], 'MIROIR : rendu sans NaN ' + str(d3))
        v(rep3 == list(reversed(q3)), 'MIROIR : la réponse rejoue la question à l\'envers ' + str({'q':q3,'rep':rep3}))

        # DENSITÉ 0 : aucune note, donc aucune porte ne se déclenche sur
        # toute la durée du cycle (question ET réponse).
        d4 = pg.evaluate("({sr}) => window._dlgRendu(sr, {longueur:4, densite:0, decalage:0, miroir:0, glisse:0}, 8)", {'sr': 44100})
        v(not d4['bad'], 'DENSITÉ 0 : rendu sans NaN ' + str(d4))
        v(all(n is None for n in d4['notes']), 'DENSITÉ 0 : aucune note mémorisée ' + str(d4))
        v(all(g < 0.001 for g in d4['gate1'] + d4['gate2']), 'DENSITÉ 0 : aucune porte ne se déclenche ' + str(d4))

        for sr in [44100, 48000]:
            d = pg.evaluate("({sr}) => window._dlgRendu(sr, {longueur:4, densite:100, decalage:0, miroir:0, glisse:0}, 16)", {'sr': sr})
            v(not d['bad'], str(sr) + ' Hz DIALOGUE : rendu sans NaN ' + str(d))
            v(len(d['notes']) == 4, str(sr) + ' Hz DIALOGUE : quatre notes de question mémorisées ' + str(d))

        r = pg.evaluate(RST)
        v(r['avant']['pos'] >= 0, 'avant RST : position avancée ' + str(r))
        v(r['apres']['pos'] == -1 and r['apres']['notes'] == 0, 'RST : position et notes remises à zéro ' + str(r))

        v(not err, 'signaux sans erreur JavaScript ' + str(err))
        c.close(); browser.close()
    report = {'version': 297, 'verifications': total, 'erreurs': erreurs, 'formats': FORMATS}
    if a.rapport:
        a.rapport.parent.mkdir(parents=True, exist_ok=True)
        a.rapport.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'DIALOGUE : {total} vérifications, {len(erreurs)} erreur(s).', flush=True)
    raise SystemExit(bool(erreurs))

if __name__ == '__main__':
    main()
