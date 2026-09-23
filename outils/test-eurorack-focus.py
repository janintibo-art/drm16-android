#!/usr/bin/env python3
"""v262 : Focus Eurorack, gestes réels, câblage et intégrité de la vue/audio.

Par défaut, page file:// et Chromium Playwright pour GitHub Actions.
--chromium CHEMIN et --contenu : Chromium fourni, mémoire temporaire simulée.
Le catalogue complet est contrôlé comme interface ; l'exemple câblé sert aux
contrôles du transport et des références du graphe audio, pas à une écoute humaine.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('graphique', Path(__file__).with_name('test-graphique.py'))
G = importlib.util.module_from_spec(spec)
spec.loader.exec_module(G)
FORMATS = [(393, 851), (880, 400), (360, 640), (1180, 860)]

MESURES = """() => {
 const p=document.querySelector('#eur-focus'),zone=p.querySelector('.ef-zone');
 const c=[...p.querySelectorAll('button,select,[role="slider"]')].filter(e=>e.getClientRects().length);
 const mauvais=c.map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.dataset.param||e.dataset.j,w:r.width,h:r.height};})
 .filter(r=>r.w<43.9||r.h<43.9);
 const f=p.querySelector('.ef-panneau').getBoundingClientRect();
 const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
 return {mauvais,deborde:zone.scrollWidth-zone.clientWidth,fenetre:innerWidth,
 cadre:f.toJSON(),doublons:ids.filter((id,i)=>ids.indexOf(id)!==i),
 nKn:p.querySelectorAll('[role="slider"]').length,nJ:p.querySelectorAll('.ef-jack').length};
}"""


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--chromium')
    ap.add_argument('--contenu', action='store_true')
    ap.add_argument('--rapport', type=Path)
    ap.add_argument('--captures', type=Path)
    args = ap.parse_args()
    if args.captures:
        args.captures.mkdir(parents=True, exist_ok=True)
    erreurs, cas, catalogue = [], [], []
    def verifier(ok, message):
        if not ok:
            erreurs.append(message)
            print('FAUX : '+message, flush=True)
    with sync_playwright() as p:
        options = {'headless':True, 'args':['--autoplay-policy=no-user-gesture-required']}
        if args.chromium:
            options['executable_path'] = args.chromium
            options['args'].append('--no-sandbox')
        nav = p.chromium.launch(**options)
        for largeur, hauteur in FORMATS:
            prefixe = f'{largeur}x{hauteur}'
            ctx = nav.new_context(viewport={'width':largeur,'height':hauteur}, has_touch=True)
            pg = ctx.new_page()
            fautes_js = []
            pg.on('pageerror',lambda e: fautes_js.append(str(e)))
            fichier = RACINE/'app/src/main/assets/drm16.html'
            if args.contenu:
                pg.evaluate(G.STOCKAGE)
                pg.set_content(fichier.read_text(encoding='utf-8'),wait_until='domcontentloaded')
            else:
                pg.goto(fichier.as_uri(),wait_until='domcontentloaded')
            pg.wait_for_timeout(1200)
            pg.evaluate(G.OUVRIR,'eur')
            pg.evaluate('eurExemple()')
            pg.wait_for_timeout(200)
            pg.locator('#eur-play').click()
            pg.evaluate("""() => {
              window.refBus=EUR.bus;window.refSources=EUR.sources.slice();
              window.refPatch=JSON.stringify({mods:EUR.mods.map(m=>({id:m.id,type:m.type,p:m.p,r:m.r})),cables:EUR.cables});
              window.vueRack={x:document.querySelector('#eur-rack').scrollLeft,z:ZOOM.z,tx:ZOOM.tx,ty:ZOOM.ty};
            }""")
            pg.locator('#eur-focus-ouvrir').click()
            verifier(pg.locator('#eur-focus').is_visible(),prefixe+' : bouton Focus')
            verifier(pg.evaluate('S.run && EUR.bus===refBus && EUR.sources.every((s,i)=>s===refSources[i])'),prefixe+' : ouverture sans reconstruire le son')
            pg.locator('#ef-suivant').click()
            pg.locator('#ef-precedent').click()
            pg.locator('#eur-focus-fermer').click()
            verifier(pg.evaluate('EUR.bus===refBus && S.run'),prefixe+' : fermeture sans arrêt')
            verifier(pg.evaluate('refPatch===JSON.stringify({mods:EUR.mods.map(m=>({id:m.id,type:m.type,p:m.p,r:m.r})),cables:EUR.cables})'),prefixe+' : patch inchangé à ouverture/navigation/fermeture')
            verifier(pg.evaluate("document.querySelector('#eur-rack').scrollLeft===vueRack.x && ZOOM.z===vueRack.z && ZOOM.tx===vueRack.tx && ZOOM.ty===vueRack.ty"),prefixe+' : vue du rack conservée')
            verifier(pg.evaluate("!document.querySelector('[inert]')"),prefixe+' : arrière-plan déverrouillé')
            # Double-tap réellement envoyé au titre. La première sélection le redessine.
            pg.evaluate("""() => {
              stop();ZOOM.z=1.35;appliquerZoom();
              const r=document.querySelector('.eur-mod[data-i="0"]>b').getBoundingClientRect();
              ZOOM.tx+=innerWidth/2-r.x-r.width/2;ZOOM.ty+=Math.max(0,75-r.y);
              bornerZoom();appliquerZoom();
            }""")
            titre=pg.locator('.eur-mod[data-i="0"]>b')
            titre.click(timeout=5000)
            titre.click(timeout=5000)
            verifier(pg.evaluate('EUR_FOCUS.actif()===EUR.mods[0].id && ZOOM.z===1.35'),prefixe+' : double-tap sans remise à zéro du zoom')
            pg.evaluate('EUR_FOCUS.ouvrir(EUR.mods[3].id)')
            mesure=pg.evaluate(MESURES)
            verifier(not mesure['mauvais'],prefixe+' : cibles 44 px '+str(mesure['mauvais']))
            verifier(mesure['deborde']<=1 and not mesure['doublons'],prefixe+' : pas de débordement ni identifiant dupliqué')
            verifier(mesure['cadre']['y']>=0 and mesure['cadre']['bottom']<=hauteur+.5,prefixe+' : panneau dans la fenêtre')
            kn=pg.locator('.ef-kn[data-param="cut"]')
            kn.scroll_into_view_if_needed()
            r=kn.bounding_box();v0=pg.evaluate('EUR.mods[3].p.cut')
            x=r['x']+r['width']/2;y=r['y']+min(42,r['height']/2)
            pg.mouse.move(x,y);pg.mouse.down();pg.mouse.move(x,y-38,steps=6);pg.mouse.up()
            v1=pg.evaluate('EUR.mods[3].p.cut')
            verifier(abs(v1-v0-.2)<.002,prefixe+' : vrai glissé du potard')
            verifier(abs(pg.evaluate('memoire.eur.racks[EUR.cur].mods.find(m=>m.id===4).p.cut')-v1)<1e-8,prefixe+' : valeur transmise à la sauvegarde existante')
            verifier(kn.get_attribute('aria-valuetext')==pg.locator('#ef-val').text_content(),prefixe+' : afficheur = valeur réglée')
            verifier(pg.evaluate('EUR.bus===refBus && EUR.sources.every((s,i)=>s===refSources[i])'),prefixe+' : réglage sans recréation du graphe')
            kn.press('ArrowUp');v2=pg.evaluate('EUR.mods[3].p.cut')
            verifier(abs(v2-v1-.01)<.00001,prefixe+' : clavier')
            kn.press('Shift+ArrowUp');v3=pg.evaluate('EUR.mods[3].p.cut')
            verifier(abs(v3-v2-.001)<.00001,prefixe+' : clavier fin')
            kn.press('Home');verifier(pg.evaluate('EUR.mods[3].p.cut===0'),prefixe+' : borne basse')
            kn.press('End');verifier(pg.evaluate('EUR.mods[3].p.cut===1'),prefixe+' : borne haute')
            kn.press('ArrowUp');verifier(pg.evaluate('EUR.mods[3].p.cut===1'),prefixe+' : dépassement borné')
            kn.hover();pg.mouse.wheel(100,100);pg.wait_for_timeout(80)
            verifier(abs(pg.evaluate('EUR.mods[3].p.cut')-.975)<.001,prefixe+' : molette')
            # Annulation d'un geste réel, puis mouvement sans nouvelle prise.
            r=kn.bounding_box();x=r['x']+r['width']/2;y=r['y']+25
            pg.mouse.move(x,y);pg.mouse.down();pg.mouse.move(x,y-5)
            pg.evaluate('window.dispatchEvent(new Event("blur"))')
            avant=pg.evaluate('EUR.mods[3].p.cut');pg.mouse.move(x,y-25);pg.mouse.up()
            verifier(abs(pg.evaluate('EUR.mods[3].p.cut')-avant)<1e-8,prefixe+' : perte de focus termine le geste')
            # Un vrai geste multitactile dans le panneau ne déplace pas le rack.
            avant=pg.evaluate('JSON.stringify([ZOOM.z,ZOOM.tx,ZOOM.ty])')
            r=pg.locator('.ef-zone').bounding_box();yy=r['y']+min(30,r['height']/3)
            cdp=ctx.new_cdp_session(pg)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':35,'y':yy,'id':1},{'x':80,'y':yy,'id':2}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':25,'y':yy+5,'id':1},{'x':120,'y':yy+10,'id':2}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            verifier(pg.evaluate('JSON.stringify([ZOOM.z,ZOOM.tx,ZOOM.ty])')==avant,prefixe+' : multitouch isolé du zoom')
            cdp.detach()
            # Source, navigation, remplacement d'une entrée, puis retrait.
            pg.select_option('#ef-choix',str(3))
            pg.locator('.ef-jack[data-j="saw"]').click()
            verifier(pg.evaluate('EUR.attente.m===3 && EUR.attente.j==="saw" && EUR.cables.length===9'),prefixe+' : sortie en attente')
            pg.select_option('#ef-choix',str(4))
            pg.locator('.ef-jack[data-j="cv"]').click()
            pg.wait_for_timeout(50)
            verifier(pg.evaluate('EUR.attente===null && EUR.cables.length===9 && EUR.cables.some(c=>c.de[0]===3&&c.de[1]==="saw"&&c.vers[0]===4&&c.vers[1]==="cv")'),prefixe+' : vrai câblage depuis le Focus')
            verifier(pg.locator('.ef-jack[data-j="cv"]').get_attribute('class').find('ef-connecte')>=0,prefixe+' : prise reliée visible')
            pg.locator('.ef-jack[data-j="cv"]').click()
            verifier(pg.evaluate('EUR.cables.length===8'),prefixe+' : retrait volontaire d’un câble')
            pg.select_option('#ef-choix',str(3));pg.locator('.ef-jack[data-j="saw"]').click()
            pg.locator('#ef-annuler').click()
            verifier(pg.evaluate('EUR.attente===null && EUR.cables.length===8'),prefixe+' : annulation sans suppression de câble')
            # Le transport intégré utilise le bouton existant et les états réels.
            pg.locator('#ef-transport').click()
            verifier(pg.evaluate('S.run'),prefixe+' : lecture depuis le Focus')
            pg.locator('#ef-transport').click()
            verifier(not pg.evaluate('S.run'),prefixe+' : arrêt depuis le Focus')
            pg.locator('#eur-focus-fermer').focus();pg.keyboard.press('Shift+Tab')
            verifier(pg.evaluate('document.activeElement.id==="ef-transport"'),prefixe+' : tabulation retenue dans le dialogue')
            pg.keyboard.press('Tab')
            verifier(pg.evaluate('document.activeElement.id==="eur-focus-fermer"'),prefixe+' : boucle de tabulation')
            pg.keyboard.press('Escape')
            verifier(not pg.locator('#eur-focus').is_visible(),prefixe+' : Échap')
            pg.evaluate('EUR_FOCUS.ouvrir(3)');pg.keyboard.press('Space')
            verifier(not pg.evaluate('S.run') and not pg.locator('#eur-focus').is_visible(),prefixe+' : Espace sur Retour ne lance pas le son')
            # Le changement de panneau restaure bien les commandes de l’autre vue.
            pg.evaluate('EUR_FOCUS.ouvrir(3);ouvrirNotice("note-eur")');pg.wait_for_timeout(30)
            verifier(pg.evaluate('EUR_FOCUS.actif()===null && !document.querySelector("#note").hasAttribute("inert") && panneauVisible()==="note"'),prefixe+' : passage à la notice')
            pg.evaluate('fermerNotice();EUR_FOCUS.ouvrir(3);allerMachine("16")');pg.wait_for_timeout(30)
            verifier(not pg.locator('#eur-focus').is_visible() and not pg.evaluate('!!document.querySelector("[inert]")'),prefixe+' : sortie vers une autre machine')
            pg.evaluate(G.OUVRIR,'eur');pg.evaluate('eurExemple();EUR_FOCUS.ouvrir(3);eurRetirer(2)');pg.wait_for_timeout(30)
            verifier(pg.evaluate('EUR_FOCUS.actif()===null'),prefixe+' : fermeture si le module disparaît')
            pg.evaluate('eurExemple();EUR_FOCUS.ouvrir(3);poserRack(JSON.parse(JSON.stringify(rackCourant())));eurDessiner()');pg.wait_for_timeout(30)
            verifier(pg.evaluate('EUR_FOCUS.actif()===null'),prefixe+' : un rack rechargé avec les mêmes numéros ferme la vue obsolète')
            # Le dense SEQ16 et tous les types de module : affichage, sans bâtir
            # 109 graphes audio. Aucun état utilisateur réel n’est employé.
            result=pg.evaluate("""() => {
              const r=[];
              Object.keys(EUR_CAT).forEach((type,i)=>{
                EUR_FOCUS.fermer(false);EUR.mods=[];EUR.cables=[];EUR.attente=null;
                const m=eurAjouter(type,true);eurDessiner();EUR_FOCUS.ouvrir(m.id);
                const root=document.querySelector('#eur-focus'),d=EUR_CAT[type],zone=root.querySelector('.ef-zone');
                const bad=[...root.querySelectorAll('button,select,[role="slider"]')].filter(e=>e.getClientRects().length)
                  .filter(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9;});
                r.push({type,kn:(type === "break32" ? root.querySelectorAll(".br32-pas").length===16 && root.querySelectorAll(".br32-editeur select").length===8 : type === "scenes8" ? root.querySelectorAll(".sc8-scene").length===8 && root.querySelectorAll(".sc8-editeur select").length===8 : type === "melo32" ? root.querySelectorAll(".ml32-pas").length===16 && root.querySelectorAll(".ml32-global select").length===6 : d.interface ? root.querySelectorAll('.dr32-pas').length===16 && root.querySelectorAll('.dr32-piste').length===4 && root.querySelectorAll('.dr32-reglages select').length===4 : root.querySelectorAll('[role="slider"]').length===d.kns.length),
                  j:root.querySelectorAll('.ef-jack').length===d.jacks.length,bad:bad.length,
                  deborde:zone.scrollWidth-zone.clientWidth});
              });return r;
            }""")
            verifier(len(result)==109 and all(x['kn'] and x['j'] and x['bad']==0 and x['deborde']<=1 for x in result),prefixe+' : 109 façades complètes et cibles confortables : '+str([x for x in result if not(x['kn'] and x['j']) or x['bad'] or x['deborde']>1]))
            catalogue.append({'format':[largeur,hauteur],'types':len(result)})
            pg.evaluate('EUR_FOCUS.fermer(false);EUR.mods=[];EUR.cables=[];eurAjouter("seq16",true);eurDessiner();EUR_FOCUS.ouvrir(EUR.mods[0].id)')
            bas=pg.locator('.ef-jack').last
            bas.scroll_into_view_if_needed()
            verifier(pg.evaluate('document.querySelector(".ef-zone").scrollTop>0'),prefixe+' : module dense défile sans réduire les commandes')
            verifier(pg.locator('#eur-focus-fermer').bounding_box()['y']>=0,prefixe+' : fermeture toujours atteignable')
            if args.captures:
                pg.screenshot(path=str(args.captures/f'focus-seq16-{largeur}x{hauteur}.png'))
            pg.emulate_media(reduced_motion='reduce')
            verifier(pg.evaluate('getComputedStyle(document.querySelector(".ef-dial")).animationName==="none"'),prefixe+' : aucune animation permanente')
            pg.evaluate('EUR_FOCUS.fermer(false);EUR.mods=[];eurDessiner()');pg.wait_for_timeout(30)
            verifier(pg.locator('#eur-focus-ouvrir').is_disabled(),prefixe+' : rack vide')
            verifier(not fautes_js,prefixe+' : JavaScript '+str(fautes_js))
            cas.append({'format':[largeur,hauteur],'mesure':mesure})
            print('Contrôlé : '+prefixe+' · gestes, audio, câbles, cycle de vie et 109 types',flush=True)
            ctx.close()
        nav.close()
    rapport={'formats':cas,'catalogue':catalogue,'erreurs':erreurs,'stockage_simule':args.contenu}
    if args.rapport:
        args.rapport.write_text(json.dumps(rapport,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{len(cas)} formats et {sum(c["types"] for c in catalogue)} ouvertures catalogue ; {len(erreurs)} erreur(s).',flush=True)
    return bool(erreurs)

if __name__=='__main__':
    raise SystemExit(main())
