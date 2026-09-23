#!/usr/bin/env python3
"""v298 : ACCORDAGES ET ORNEMENTS — un arpège qui monte à travers les degrés
d'une gamme personnalisée (tempéraments fixes ou fichier Scala .scl importé),
avec appoggiature, mordant ou trille calculés sur l'accordage réel. Catalogue,
façade, import d'un fichier .scl réel, deux montages et vrais rendus audio en
OfflineAudioContext : degrés justes, écarts d'ornements, RST.
"""
import argparse, importlib.util, json, tempfile
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
   reglages: root.querySelectorAll('.acc-reglages select').length,
   importer: !!root.querySelector('.acc-importer'),
   etat: !!root.querySelector('.acc-etat')
 };
}'''

STRUCTURE = r'''() => EUR_MONTAGES.filter(p => ['accordage-juste','accordage-pytha'].includes(p.id)).map(P => {
 const erreurs = [];
 P.mods.forEach((x, i) => { if (!EUR_CAT[x[0]]) erreurs.push('type inconnu ' + x[0] + ' au rang ' + i); });
 P.cables.forEach(c => { if (c[0] < 0 || c[0] >= P.mods.length || c[2] < 0 || c[2] >= P.mods.length) erreurs.push('câble hors rang ' + JSON.stringify(c)); });
 const aAccordage = P.mods.some(x => x[0] === 'accordage');
 const clkAccordage = P.cables.some(([a,s,b,e]) => P.mods[b] && P.mods[b][0] === 'accordage' && e === 'clk');
 const versVoix = P.cables.some(([a,s,b,e]) => P.mods[a] && P.mods[a][0] === 'accordage' && s === 'cv');
 const perf = P.performance && P.performance.commandes && P.performance.commandes.length === 8;
 return {id: P.id, bpm: P.bpm, mods: P.mods.length, cables: P.cables.length, erreurs, aAccordage, clkAccordage, versVoix, perf};
})'''

# Lire ports.cv.offset.value en JS "logique", sans passer par un vrai rendu,
# ne reflète pas ce que l'automatisation produira réellement (même piège que
# documenté pour LOOPER DE RACK et DIALOGUE) : chaque scénario ci-dessous rend
# donc réellement CV et GATE sur deux voies séparées d'un même
# OfflineAudioContext, puis échantillonne à des instants précis calculés à
# partir du pas de CLK et, pour les ornements, de la VITESSE réglée.
INIT = r'''() => {
 window._accRendu = async function(sr, p, pas, temps) {
   stop(); if (ctx && ctx.close && !ctx.startRendering) await ctx.close();
   S.bpm = 120;
   const dt = 60 / S.bpm / 4;
   ctx = new OfflineAudioContext(2, Math.ceil((dt * (pas + 3)) * sr), sr);
   const m = {type:'accordage', p: Object.assign({racine:0, octave:0, gamme:0, longueur:8, ornement:0, vitesse:40, glisse:0}, p || {})};
   m.io = EUR_CAT.accordage.creer(m);
   const fusion = ctx.createChannelMerger(2);
   m.io.s.cv.connect(fusion, 0, 0); m.io.s.gate.connect(fusion, 0, 1);
   fusion.connect(ctx.destination);
   for (let i = 0; i < pas; i++) m.recevoir(i * dt, 'clk');
   const buf = await ctx.startRendering();
   const bad = [0,1].some(c => buf.getChannelData(c).some(x => !Number.isFinite(x)));
   function ech(t, c){
     const idx = Math.min(buf.length - 1, Math.max(0, Math.round(t * sr)));
     return buf.getChannelData(c)[idx];
   }
   const cv = (temps || []).map(t => ech(t, 0));
   const gate = (temps || []).map(t => ech(t, 1));
   return {dt, cv, gate, bad};
 };
 window._accGammes = function(){ return EUR_ACCORDAGES.GAMMES_FIXES; };
}'''

RST = r'''() => {
 stop(); if (ctx && ctx.close && !ctx.startRendering) ctx.close();
 S.bpm = 120;
 const dt = 60 / S.bpm / 4;
 ctx = new OfflineAudioContext(1, Math.ceil(dt * 10 * 44100), 44100);
 const m = {type:'accordage', p:{racine:0, octave:0, gamme:0, longueur:4, ornement:0, vitesse:40, glisse:0}};
 m.io = EUR_CAT.accordage.creer(m);
 for (let i = 0; i < 6; i++) m.recevoir(i * dt, 'clk');
 const avant = {pos: m.accordage.pos, jouee: m.accordage.jouee};
 m.recevoir(6 * dt, 'rst');
 const apres = {pos: m.accordage.pos, jouee: m.accordage.jouee};
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
            v(pg.evaluate("!!EUR_CAT.accordage && EUR_CAT.accordage.jacks.length===4 && EUR_CAT.accordage.kns.length===7"),
              tag + ' module ACCORDAGES ET ORNEMENTS : quatre prises, sept réglages')
            pg.evaluate("EUR.mods=[];EUR.cables=[];EUR.attente=null;const m=eurAjouter('accordage');EUR_FOCUS.ouvrir(m.id);")
            fa = pg.evaluate(FACADE)
            v(fa['reglages'] == 7, tag + ' sept réglages accessibles (autant que de potards) ' + str(fa))
            v(fa['importer'] and fa['etat'], tag + ' bouton d\'import et état de la gamme présents ' + str(fa))
            pg.evaluate("EUR_FOCUS.fermer(false)")
            for s in pg.evaluate(STRUCTURE):
                v(not s['erreurs'] and s['aAccordage'] and s['clkAccordage'] and s['versVoix'] and s['perf']
                  and s['mods'] > 5 and s['cables'] > 5, tag + ' montage ' + str(s))
            v(not err, tag + ' aucune erreur JavaScript ' + str(err))
            print('Contrôlé ' + tag, flush=True); c.close()

        # ---- Import d'un vrai fichier .scl, via la façade du module posé dans le rack ----
        c = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = c.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(f.as_uri(), wait_until='domcontentloaded'); pg.wait_for_timeout(80)
        pg.evaluate(G.OUVRIR, 'eur')
        pg.evaluate("EUR.mods=[];EUR.cables=[];EUR.attente=null;const m=eurAjouter('accordage');EUR_FOCUS.ouvrir(m.id);")
        with tempfile.TemporaryDirectory() as td:
            scl = Path(td) / 'exemple.scl'
            scl.write_text(
                "! exemple.scl\n!\nGamme d'essai, cinq degres\n 5\n!\n150.0\n350.0\n600.0\n850.0\n2/1\n",
                encoding='utf-8')
            pg.locator('#eur-focus input[type=file]').set_input_files(str(scl))
            pg.wait_for_timeout(150)
        etat = pg.evaluate("document.querySelector('#eur-focus .acc-etat').textContent")
        v('IMPORTÉE' in etat and '5 degrés' in etat, 'import .scl : cinq degrés reconnus ' + etat)
        v('1200' in etat, 'import .scl : période à 1200 ¢ reconnue ' + etat)
        gval = pg.evaluate("document.querySelector('#eur-focus .acc-reglages select[data-champ=gamme]').value")
        v(gval == '3', 'import .scl : la gamme bascule automatiquement sur IMPORTÉE ' + str(gval))

        with tempfile.TemporaryDirectory() as td:
            mauvais = Path(td) / 'invalide.scl'
            mauvais.write_text("! pas assez de lignes\n", encoding='utf-8')
            pg.locator('#eur-focus input[type=file]').set_input_files(str(mauvais))
            pg.wait_for_timeout(150)
        etatMauvais = pg.evaluate("document.querySelector('#eur-focus .acc-etat').textContent")
        v('ÉCHOUÉ' in etatMauvais, 'import .scl invalide : message d\'échec clair ' + etatMauvais)
        pg.evaluate("EUR_FOCUS.fermer(false)")
        v(not err, 'import .scl : aucune erreur JavaScript ' + str(err))
        c.close()

        # ---- Rendus audio réels ----
        c = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = c.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(f.as_uri(), wait_until='domcontentloaded'); pg.wait_for_timeout(80)
        pg.set_default_timeout(60000)
        pg.evaluate(INIT)
        DT = 0.125  # 60/120/4, bpm fixé à 120 dans _accRendu

        def presque(a, b, eps=0.002):
            return abs(a - b) < eps

        # ÉGAL 12, racine DO (0), octave 0, aucun ornement : chaque pas i vaut
        # (racine-9)*100 + i*100 cents, soit ((0-9)*100 + i*100)/1200 en volts —
        # même convention 1 V/octave que partout ailleurs dans le rack.
        temps1 = [i * DT + 0.003 for i in range(8)]
        d1 = pg.evaluate("({sr, temps}) => window._accRendu(sr, {racine:0, octave:0, gamme:0, longueur:8, ornement:0, vitesse:40, glisse:0}, 8, temps)",
                          {'sr': 44100, 'temps': temps1})
        attendu1 = [((0 - 9) * 100 + i * 100) / 1200 for i in range(8)]
        v(not d1['bad'], 'ÉGAL 12 : rendu sans NaN ' + str(d1['bad']))
        v(all(presque(o, e) for o, e in zip(d1['cv'], attendu1)),
          'ÉGAL 12 : huit pas exactement sur la gamme tempérée ' + str({'obtenu': d1['cv'], 'attendu': attendu1}))
        v(all(g > 0.5 for g in d1['gate']), 'ÉGAL 12 : la porte se déclenche à chaque pas ' + str(d1['gate']))

        # JUSTE et PYTHAGORICIEN : les degrés réels de la gamme (lus dans le
        # module lui-même, pas redupliqués ici) doivent se retrouver, cents pour
        # cents, dans les CV rendus — sur les sept degrés du tempérament, sans
        # dépasser l'octave.
        gammes = pg.evaluate("() => window._accGammes()")
        for idx, nom in [(1, 'JUSTE'), (2, 'PYTHAGORICIEN')]:
            degres = gammes[idx]['degres']
            temps = [i * DT + 0.003 for i in range(len(degres))]
            d = pg.evaluate(
                "({sr, temps, gamme, longueur}) => window._accRendu(sr, {racine:0, octave:0, gamme, longueur, ornement:0, vitesse:40, glisse:0}, longueur, temps)",
                {'sr': 44100, 'temps': temps, 'gamme': idx, 'longueur': len(degres)})
            attendu = [((0 - 9) * 100 + c) / 1200 for c in degres]
            v(not d['bad'], nom + ' : rendu sans NaN ' + str(d['bad']))
            v(all(presque(o, e) for o, e in zip(d['cv'], attendu)),
              nom + ' : les degrés rendus correspondent aux cents de la gamme ' + str({'obtenu': d['cv'], 'attendu': attendu}))

        # ORNEMENT = APPOGGIATURE (pas 1, ÉGAL 12) : la note voisine du dessous
        # sonne brièvement avant la note principale, avec porte fermée entre les
        # deux — écarts et minutage déjà vérifiés à la main sur cette même config.
        t0 = 1 * DT
        d2 = pg.evaluate("({sr, temps}) => window._accRendu(sr, {racine:0, octave:0, gamme:0, longueur:8, ornement:1, vitesse:40, glisse:0}, 2, temps)",
                          {'sr': 44100, 'temps': [t0, t0 + 0.003, t0 + 0.02, t0 + 0.045, t0 + 0.06]})
        principal2 = ((0 - 9) * 100 + 1 * 100) / 1200
        bas2 = ((0 - 9) * 100 + 1 * 100 - 100) / 1200
        v(not d2['bad'], 'APPOGGIATURE : rendu sans NaN ' + str(d2['bad']))
        v(presque(d2['cv'][0], bas2) and presque(d2['cv'][1], bas2), 'APPOGGIATURE : la note voisine sonne en premier ' + str(d2))
        v(d2['gate'][2] < 0.5, 'APPOGGIATURE : la porte retombe entre les deux notes ' + str(d2['gate']))
        v(presque(d2['cv'][3], principal2) and d2['gate'][3] > 0.5, 'APPOGGIATURE : la note principale sonne ensuite ' + str(d2))

        # ORNEMENT = TRILLE (pas 0, ÉGAL 12) : alternance principale/voisine du
        # dessus, au rythme de VITESSE, pendant toute la durée du pas.
        principal3 = ((0 - 9) * 100 + 0) / 1200
        haut3 = ((0 - 9) * 100 + 100) / 1200
        d3 = pg.evaluate("({sr, temps}) => window._accRendu(sr, {racine:0, octave:0, gamme:0, longueur:8, ornement:3, vitesse:40, glisse:0}, 1, temps)",
                          {'sr': 44100, 'temps': [0.003, 0.043, 0.083]})
        v(not d3['bad'], 'TRILLE : rendu sans NaN ' + str(d3['bad']))
        v(presque(d3['cv'][0], principal3) and presque(d3['cv'][1], haut3) and presque(d3['cv'][2], principal3),
          'TRILLE : alternance principale / voisine du dessus ' + str(d3))

        # OCTAVE : monter d'une octave ajoute exactement 1200 cents (1 V) au CV,
        # à réglages par ailleurs identiques.
        d4a = pg.evaluate("({sr, temps}) => window._accRendu(sr, {racine:0, octave:0, gamme:0, longueur:8, ornement:0, vitesse:40, glisse:0}, 1, temps)", {'sr': 44100, 'temps': [0.003]})
        d4b = pg.evaluate("({sr, temps}) => window._accRendu(sr, {racine:0, octave:1, gamme:0, longueur:8, ornement:0, vitesse:40, glisse:0}, 1, temps)", {'sr': 44100, 'temps': [0.003]})
        v(presque(d4b['cv'][0] - d4a['cv'][0], 1.0), 'OCTAVE : +1 ajoute exactement 1 V au CV ' + str({'a':d4a['cv'],'b':d4b['cv']}))

        for sr in [44100, 48000]:
            d = pg.evaluate("({sr, temps}) => window._accRendu(sr, {racine:9, octave:-1, gamme:0, longueur:5, ornement:2, vitesse:30, glisse:0}, 4, temps)",
                             {'sr': sr, 'temps': [i * DT + 0.003 for i in range(4)]})
            v(not d['bad'], str(sr) + ' Hz ACCORDAGES ET ORNEMENTS : rendu sans NaN ' + str(d['bad']))

        r = pg.evaluate(RST)
        v(r['avant']['pos'] >= 0, 'avant RST : position avancée ' + str(r))
        v(r['apres']['pos'] == -1 and r['apres']['jouee'] == False, 'RST : position remise à zéro, mémoire de glissé effacée ' + str(r))

        v(not err, 'signaux sans erreur JavaScript ' + str(err))

        report = {'version': 298, 'verifications': total, 'erreurs': erreurs, 'formats': FORMATS}
        if a.rapport:
            a.rapport.parent.mkdir(parents=True, exist_ok=True)
            a.rapport.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        c.close(); browser.close()
    print(f'ACCORDAGES ET ORNEMENTS : {total} vérifications, {len(erreurs)} erreur(s).', flush=True)
    raise SystemExit(bool(erreurs))

if __name__ == '__main__':
    main()
