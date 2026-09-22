#!/usr/bin/env python3
"""v275 : parcours réel MENU → TABLE → VOIR LES MACHINES, souris et petits écrans.

Par défaut : page locale et stockage vierge d'un contexte Chromium isolé.
--contenu : page en mémoire avec le stockage de test de test-graphique.py.
--html : permet notamment de vérifier que la v274 reproduit le défaut.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parents[1]
FORMATS = [(1180, 860), (1440, 900), (1920, 1080), (2560, 1440),
           (393, 851), (880, 400), (360, 640)]
ETAT = """()=>JSON.stringify({on:SET.on,actives:SET.actives,niv:SET.niv,pan:SET.pan,
 mute:SET.mute,solo:SET.solo,trim:SET.trim,lo:SET.lo,md:SET.md,hi:SET.hi,
 modele:S.modele,run:S.run,bpm:S.bpm})"""
MESURE = """()=>{
 const sc=document.getElementById('scene'),r=sc.getBoundingClientRect();
 return {ensemble:ENS.actif,classe:document.body.classList.contains('ensemble'),
  menu:getComputedStyle(menu).display,menuOuvert:document.body.classList.contains('menu-ouvert'),
  panneau:panneauVisible(),noteOuverte:document.body.classList.contains('note-ouverte'),
  ids:[...unitesEns()].filter(e=>e.getClientRects().length && getComputedStyle(e).display!=='none').map(e=>e.id),
  nonChoisies:[...unitesEns()].filter(e=>e.classList.contains('ens-cache') && e.getClientRects().length).map(e=>e.id),
  scene:{x:r.x,y:r.y,w:r.width,h:r.height,top:sc.scrollTop,left:sc.scrollLeft,
   cw:sc.clientWidth,ch:sc.clientHeight,sw:sc.scrollWidth,sh:sc.scrollHeight,
   ox:getComputedStyle(sc).overflowX,oy:getComputedStyle(sc).overflowY},
  document:document.documentElement.scrollWidth,largeur:innerWidth,hauteur:innerHeight,
  zooms:[...unitesEns()].filter(e=>e.getClientRects().length).map(e=>getComputedStyle(e).transform),
  originaux:window.__ensOriginaux.every(e=>e.isConnected && document.getElementById(e.id)===e)};
}"""
HIT = """id=>{
 const e=document.getElementById(id),r=e.getBoundingClientRect(),sc=document.getElementById('scene').getBoundingClientRect();
 const x=(Math.max(r.left,sc.left)+Math.min(r.right,sc.right))/2;
 const y=(Math.max(r.top,sc.top)+Math.min(r.bottom,sc.bottom))/2;
 const t=document.elementFromPoint(x,y);
 return r.width>0 && r.height>0 && x>=0 && x<innerWidth && y>=sc.top && y<sc.bottom && t && (e===t || e.contains(t));
}"""

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium')
    ap.add_argument('--contenu', action='store_true')
    ap.add_argument('--html', type=Path)
    ap.add_argument('--format', help='par exemple 1440x900')
    ap.add_argument('--rapport', type=Path)
    ap.add_argument('--captures', type=Path)
    args = ap.parse_args()
    fichier = args.html or RACINE/'app/src/main/assets/drm16.html'
    html = fichier.read_text(encoding='utf-8')
    erreurs, details = [], []
    total = 0

    def verifier(ok, message):
        nonlocal total
        total += 1
        if not ok:
            erreurs.append(message)
            print('FAUX : '+message, flush=True)

    # Un assemblage utilisant par erreur l'ancien fichier ne doit pas passer.
    if not args.html:
        for nom in ('js/210-transfert-vers-une-vraie-volca-sample.js',
                    'js/220-mise-a-l-echelle.js', 'css/340-vue-ensemble.css'):
            verifier(html.count((RACINE/'page'/nom).read_text(encoding='utf-8')) == 1,
                     'source assemblée une seule fois : '+nom)
        verifier('css/330-editeur-sons.css\ncss/340-vue-ensemble.css\n' in
                 (RACINE/'page/ordre.txt').read_text(encoding='utf-8'), 'ordre du correctif CSS')
    if args.captures:
        args.captures.mkdir(parents=True, exist_ok=True)
    formats = [tuple(map(int, args.format.split('x')))] if args.format else FORMATS
    with sync_playwright() as p:
        options = {'headless': True, 'args': ['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:
            options.update(executable_path=args.chromium)
            options['args'].append('--no-sandbox')
        navigateur = p.chromium.launch(**options)
        for w, h in formats:
            contexte = navigateur.new_context(viewport={'width': w, 'height': h}, has_touch=w<1000)
            page = contexte.new_page()
            page.set_default_timeout(8000)
            fautes_page = []
            page.on('pageerror', lambda err: fautes_page.append(str(err)))
            prefixe = f'{w}x{h} '
            def v(ok, message):
                verifier(ok, prefixe+message)
            try:
                if args.contenu:
                    spec = importlib.util.spec_from_file_location('g', RACINE/'outils/test-graphique.py')
                    g = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(g)
                    page.evaluate(g.STOCKAGE)
                    page.set_content(html, wait_until='domcontentloaded')
                else:
                    page.goto(fichier.resolve().as_uri(), wait_until='domcontentloaded')
                page.wait_for_function("document.body.classList.contains('pret') && typeof TABLE_FOCUS==='object'")
                # Pas de menu masqué par le test : on emprunte le chemin de l'utilisateur.
                page.locator('#catalogue-outils').click()
                page.locator('#menu-table').click()
                page.wait_for_function("panneauVisible()==='table'")
                page.evaluate("window.__ensOriginaux=[...document.querySelectorAll('#scene [id]')]")
                v(page.locator('#menu').is_visible(), 'le menu existe encore derrière la table, précondition du défaut')
                page.locator('#table-rien').click()
                page.locator('#table-ensemble').click()
                v(page.evaluate("!ENS.actif && panneauVisible()==='table'"), 'sélection vide : reste dans la table')
                v('CHOISISSEZ' in page.locator('#signal').text_content(), 'sélection vide : consigne, pas de fausse réussite')
                cinq = ['ehx', 'em', 'tr', 'ko', 'mc']
                for id in cinq:
                    page.locator(f'.voie[data-v="{id}"] [data-a="on"]').click()
                etat = page.evaluate(ETAT)
                page.locator('#table-ensemble').click()
                m = page.evaluate(MESURE)
                details.append({'format': [w,h], 'cinq': m})
                ids = ['unit', 'unit-em1', 'unit-tr808', 'unit-ko', 'unit-mc']
                v(m['menu']=='none' and not m['menuOuvert'], 'VOIR ferme vraiment le menu')
                v(m['panneau']=='' and not m['noteOuverte'], 'aucun outil ne reste devant les machines')
                v(m['ensemble'] and m['classe'], 'mode ensemble actif')
                v(set(m['ids'])==set(ids), 'les cinq façades sélectionnées sont affichées, pas seulement le message')
                v(not m['nonChoisies'], 'les seize autres façades sont masquées')
                if m['menu']!='none' or set(m['ids'])!=set(ids):
                    # Sur une ancienne version, ne pas laisser les clics suivants
                    # expirer derrière le menu : ce résultat est déjà une régression.
                    continue
                v(m['originaux'], 'les commandes sont les nœuds d’origine, non des clones')
                v(page.evaluate(ETAT)==etat, 'ouvrir la vue ne change ni sélection, ni niveaux, ni transport')
                v(m['document']<=w, 'le document ne déborde pas de la fenêtre')
                sc=m['scene']
                v(0<=sc['x'] and sc['x']+sc['w']<=w+1 and 44<=sc['y'] and sc['y']+sc['h']<=h-44,
                  'scène bornée entre navigation et retour')
                v(sc['ox'] in ['auto','scroll'] and sc['oy'] in ['auto','scroll'], 'défilement horizontal et vertical disponible')
                v(sc['top']==0 and sc['left']==0, 'ouverture en haut et à gauche')
                v(all(t=='none' for t in m['zooms']), 'aucun agrandissement solo sur les façades du set')
                v(page.evaluate("document.activeElement.id==='ens-sortir'"), 'focus rendu à un bouton visible')
                for id in ids:
                    page.locator('#'+id).scroll_into_view_if_needed()
                    v(page.evaluate(HIT,id), id+' atteignable après défilement, sans menu devant')
                v(page.locator('#ko-pads button').count()==16, 'PO-33 jamais ouvert : seize pads construits')
                v(page.evaluate("document.querySelectorAll('#tr8-sel button').length===TR.def.instr.length && TR_KNOBS.length===TR.def.instr.reduce((n,i)=>n+i.kns.length,0)"),
                  'TR jamais ouverte : tous les instruments et potards sont construits')
                page.locator('#ko-pads button[data-k="3"]').click()
                v(page.evaluate('KO.sel===3'), 'un pad PO-33 répond à un vrai clic dans la scène')
                page.locator('#ko-swing').scroll_into_view_if_needed()
                # Vrai contrôle natif, déplacé dans la scène : la molette
                # de sélection, les traitements audio, les handlers ne sont pas remplacés.
                v(page.locator('#ko-swing').is_visible(), 'réglage PO-33 présent dans la façade')
                swing = page.evaluate('KO.swing')
                page.locator('#ko-swing').press('ArrowRight')
                v(abs(page.evaluate('KO.swing')-swing-0.01)<1e-7, 'le curseur natif reçoit le réglage clavier')
                page.locator('#ko-swing').press('ArrowLeft')
                v(abs(page.evaluate('KO.swing')-swing)<1e-7, 'le réglage clavier est réversible')
                avant_styles = page.evaluate("[...unitesEns()].map(e=>e.getAttribute('style'))")
                page.evaluate('fit()')
                v(page.evaluate("[...unitesEns()].map(e=>e.getAttribute('style'))")==avant_styles,
                  'fit() laisse la scène à sa taille naturelle')
                page.set_viewport_size({'width': max(400,w-137), 'height':max(360,h-63)})
                v(set(page.evaluate(MESURE)['ids'])==set(ids), 'redimensionner garde les cinq façades')
                page.set_viewport_size({'width':w,'height':h})
                page.evaluate("document.getElementById('scene').scrollTop=0;document.getElementById('scene').scrollLeft=0")
                if args.captures:
                    page.screenshot(path=str(args.captures/f'ensemble-{w}x{h}.png'))
                page.locator('#ens-sortir').click()
                v(page.evaluate("!ENS.actif && !document.body.classList.contains('ensemble') && panneauVisible()==='table'"),
                  'REVENIR À LA TABLE quitte correctement la vue')
                v(page.evaluate("!document.querySelector('.ens-cache')"), 'sortie : tous les masques temporaires sont retirés')
                v(page.locator('#menu').is_hidden(), 'retour à la table sans rouvrir le menu')
                v(page.evaluate("S.modele==='16'"), 'retour à la bonne machine solo')
                page.locator('#table-rien').click()
                page.locator('.voie[data-v="kp"] [data-a="on"]').click()
                page.locator('#table-ensemble').click()
                v(page.evaluate(MESURE)['ids']==['unit-kp'], 'une seule sélection : uniquement Kaoss, sans DRM parasite')
                v('1 MACHINE DANS LA VUE'==page.locator('#signal').text_content(), 'compteur au singulier')
                v(page.locator('#kp-pav').bounding_box()['height']>=200, 'pavé Kaoss conserve une hauteur utilisable')
                page.locator('#ens-sortir').click()
                # Toutes les voies, y compris celles jamais ouvertes par une tuile.
                page.evaluate("SET_VOIES.forEach(v=>SET.actives[v[0]]=true);majTable()")
                page.locator('#table-ensemble').click()
                tous = page.evaluate('SET_VOIES.map(v=>uniteDeVoie(v[0]).id)')
                m=page.evaluate(MESURE)
                v(len(tous)==21 and set(m['ids'])==set(tous), 'les 21 façades sont affichables simultanément')
                v(page.locator('#stk-pads button').count()==16 and page.locator('#stk-trks button').count()==10,
                  'SmplTrek jamais ouvert : seize pads et dix pistes construits')
                v(page.locator('#mc-pads button').count()==16 and page.locator('#mc-trks button').count()==4,
                  'MC-101 : seize pads et quatre pistes disponibles')
                for id in tous:
                    page.locator('#'+id).scroll_into_view_if_needed()
                    v(page.evaluate(HIT,id), 'toutes les voies : '+id+' reste atteignable')
                v(page.evaluate(MESURE)['originaux'], 'les nœuds natifs sont conservés après plusieurs ouvertures')
                # Quitter par MENU doit aussi nettoyer les styles de scène.
                page.locator('#retour').click()
                v(page.evaluate("!ENS.actif && !document.body.classList.contains('ensemble') && menu.classList.contains('hide')===false"),
                  'MENU ferme la vue ensemble')
                page.locator('#catalogue-machines').click()
                page.locator('.pick[data-m="mc"]').click()
                v(page.evaluate("[...unitesEns()].filter(e=>e.getClientRects().length).map(e=>e.id)")==['unit-mc'],
                  'choisir MC-101 après le set affiche uniquement MC-101')
                v(page.evaluate("getComputedStyle(document.getElementById('scene')).display==='contents'"),
                  'la scène redevient transparente pour le mode solo')
                v(page.evaluate("getComputedStyle(actif).transform!=='none'"), 'le zoom solo fonctionne de nouveau')
                # Le retour d’une autre façade doit être restauré, pas toujours DRM16.
                page.locator('#retour').click()
                page.locator('#catalogue-outils').click()
                page.locator('#menu-table').click()
                page.locator('#table-rien').click()
                page.locator('.voie[data-v="ko"] [data-a="on"]').click()
                page.locator('#table-ensemble').click()
                v(page.evaluate(MESURE)['ids']==['unit-ko'], 'entrée depuis MC : seule la voie PO-33 choisie apparaît')
                page.locator('#ens-sortir').click()
                v(page.evaluate("S.modele==='mc' && actif.id==='unit-mc'"), 'sortie : la MC-101 précédente est restaurée')
            except Exception as exc:
                v(False, 'exception du parcours : '+str(exc))
            finally:
                v(not fautes_page, 'aucune erreur JavaScript : '+str(fautes_page))
                contexte.close()
                print('Contrôlé : '+prefixe, flush=True)
        navigateur.close()
    rapport={'verifications':total,'erreurs':erreurs,'formats':formats,'details':details,
             'mode':'contenu / stockage simulé' if args.contenu else 'page locale / stockage Chromium isolé'}
    if args.rapport:
        args.rapport.parent.mkdir(parents=True,exist_ok=True)
        args.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Vue ensemble : {total} vérifications ; {len(erreurs)} erreur(s).',flush=True)
    raise SystemExit(bool(erreurs))

if __name__=='__main__':
    main()
