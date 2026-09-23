#!/usr/bin/env python3
"""v299 : rayon CC0 GITHUB de la bibliothèque — trois kits (quarante-huit
sons) du dépôt github.com/Boochi44/free-drum-samples, tous en licence CC0,
servis un par un. Vérifie le catalogue embarqué (URLs, noms, catégories),
la façade (septième onglet, liste des kits, liste des sons, bouton retour)
et le classement (origine, filtre, crédit) — sans dépendre du réseau, qui
n'est joignable que depuis le vrai pont natif (Android/bureau), absent de
ce bac à sable, comme pour la collection archive.org déjà en place.
"""
import argparse, importlib.util, json, re
from pathlib import Path
from playwright.sync_api import sync_playwright
R = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('graphique', Path(__file__).with_name('test-graphique.py'))
G = importlib.util.module_from_spec(spec)
spec.loader.exec_module(G)
FORMATS = [(393, 851), (880, 400), (360, 640)]

CATALOGUE = r'''() => {
 const types = {};
 const urls = new Set();
 const erreurs = [];
 CC0G_KITS.forEach(k => {
  if (k.sons.length !== 16) erreurs.push('kit ' + k.id + ' : ' + k.sons.length + ' sons (attendu 16)');
  const noms = new Set();
  k.sons.forEach(s => {
   types[s.type] = (types[s.type] || 0) + 1;
   if (noms.has(s.nom)) erreurs.push('nom en double dans ' + k.id + ' : ' + s.nom);
   noms.add(s.nom);
   if (urls.has(s.url)) erreurs.push('URL en double : ' + s.url);
   urls.add(s.url);
   if (!/^https:\/\/raw\.githubusercontent\.com\/Boochi44\/free-drum-samples\/main\/drum-samples\//.test(s.url)) erreurs.push('URL inattendue : ' + s.url);
   if (!CC0G_CATEGORIE[s.type]) erreurs.push('type sans catégorie : ' + s.type);
  });
 });
 return {kits: CC0G_KITS.length, total: [...urls].length, types, erreurs};
}'''

OUVRIR_BIB = "()=>{menu.classList.add('hide');document.body.classList.remove('menu-ouvert');ouvrirBib();}"

FACADE = r'''() => {
 const boutons = [...document.querySelectorAll('#bib-nav button')];
 return {n: boutons.length, dernier: boutons[boutons.length - 1].textContent};
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

            cat = pg.evaluate(CATALOGUE)
            v(cat['kits'] == 3, tag + ' trois kits ' + str(cat))
            v(cat['total'] == 48, tag + ' quarante-huit sons au total ' + str(cat))
            v(not cat['erreurs'], tag + ' catalogue sans doublon ni URL suspecte ' + str(cat['erreurs']))
            v(set(cat['types'].keys()) == {'kick', '808', 'snare', 'clap', 'hi-hat', 'open-hat', 'perc', 'fx'},
              tag + ' huit types de sons couverts ' + str(cat['types']))

            pg.evaluate(OUVRIR_BIB)
            fa = pg.evaluate(FACADE)
            v(fa['n'] == 7, tag + ' sept onglets dans la bibliothèque ' + str(fa))
            v(fa['dernier'] == 'CC0 GITHUB', tag + ' le septième onglet est CC0 GITHUB ' + str(fa))

            pg.evaluate("() => { BIB.onglet = 6; majBibUI(); }")
            lignes = pg.evaluate("() => document.querySelectorAll('#bib-corps .bib-ligne').length")
            v(lignes == 3, tag + ' liste des trois kits au premier niveau ' + str(lignes))

            pg.evaluate("() => { CC0G.kit = CC0G_KITS[0]; majBibUI(); }")
            lignes2 = pg.evaluate("() => document.querySelectorAll('#bib-corps .bib-ligne').length")
            v(lignes2 == 16, tag + ' seize sons dans le premier kit ouvert ' + str(lignes2))
            boutonsSon = pg.evaluate(
                "() => { const l = document.querySelectorAll('#bib-corps .bib-ligne')[0]; "
                "return [...l.querySelectorAll('button')].map(b => b.textContent); }")
            v(boutonsSon == ['ÉCOUTER', 'IMPORTER'], tag + ' chaque son a ÉCOUTER et IMPORTER ' + str(boutonsSon))

            pg.evaluate("() => document.querySelector('#bib-corps .bib-actions button').click()")
            v(pg.evaluate("() => CC0G.kit === null"), tag + ' ◀ revient à la liste des kits')
            lignes3 = pg.evaluate("() => document.querySelectorAll('#bib-corps .bib-ligne').length")
            v(lignes3 == 3, tag + ' retour à la liste des trois kits ' + str(lignes3))

            v(not err, tag + ' aucune erreur JavaScript ' + str(err))
            print('Contrôlé ' + tag, flush=True); c.close()

        # ---- origine, filtre et crédit, sans passer par le réseau ----
        c = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg = c.new_page(); err = []; pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(f.as_uri(), wait_until='domcontentloaded'); pg.wait_for_timeout(80)

        v(pg.evaluate("BIB_ORIGINES.some(o => o[0] === 'cc0github' && o[1] === 'CC0 GITHUB')"),
          "l'origine CC0 GITHUB figure dans le filtre de la bibliothèque")

        r = pg.evaluate(
            "() => { ES.noms.utestcc0 = 'cc0github'; "
            "BIB.noms.utestcc0 = 'Hard Trap Hard Kick 1'; "
            "return {origine: bibOrigine('utestcc0'), credit: creditSon('utestcc0')}; }")
        v(r['origine'] == 'cc0github', "bibOrigine reconnaît un son cc0github " + str(r))
        v('Boochi44/free-drum-samples' in r['credit'] and 'CC0 1.0' in r['credit'],
          "creditSon mentionne la source et la licence " + str(r))

        r2 = pg.evaluate(
            "() => { ES.noms.utestcc0b = 'cc0github'; "
            "bibMeta('utestcc0b').c = CC0G_CATEGORIE.kick; "
            "return bibCategorie({id:'utestcc0b', nom:'Hard Kick 1'}); }")
        v(r2 == 'kick', "un son importé du kit prend la catégorie de son type " + str(r2))

        v(not err, 'signaux sans erreur JavaScript ' + str(err))
        c.close()

        report = {'version': 299, 'verifications': total, 'erreurs': erreurs, 'formats': FORMATS}
        if a.rapport:
            a.rapport.parent.mkdir(parents=True, exist_ok=True)
            a.rapport.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        browser.close()
    print(f'CC0 GITHUB : {total} vérifications, {len(erreurs)} erreur(s).', flush=True)
    raise SystemExit(bool(erreurs))

if __name__ == '__main__':
    main()
