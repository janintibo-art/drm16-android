#!/usr/bin/env python3
# Test de la page dans un vrai navigateur (Chromium sans écran), v135.
#
# Ce que la compilation ne voit jamais : une erreur JavaScript au chargement
# (page noire), une machine qui plante en s'ouvrant ou en jouant, un réglage
# audio qui ne fait plus ce qu'il annonce. Chaque bloc ci-dessous reprend un
# contrôle fait à la main lors d'une correction (v124 à v132).
#
#   pip install playwright==1.56.0 && python -m playwright install --with-deps chromium
#   python3 outils/test-navigateur.py
#
import asyncio, os, sys
from playwright.async_api import async_playwright

PAGE = "file://" + os.path.abspath("app/src/main/assets/drm16.html")
MACHINES = ("16 32 em1 er1 ea1 es1 ea2 er2 es2 emx esx arcm t1k dbi cr5 vlc dmx eur "
            "td3 rd6 tr808 tr909 tr707 mpc3000 mpc2000 kp mc stk ko").split()
FORMATS = [(393, 851), (880, 400), (360, 640)]
fautes = []

def ok(cond, msg):
    print(("  ok    " if cond else "  FAUX  ") + msg)
    if not cond: fautes.append(msg)

# Un pont Android simulé : fichiers en mémoire, MIDI piloté par le test.
PONT = r"""
window.__F = {}; window.__J = {};
window.__M = {devs:[{nom:'volca sample',id:7},{nom:'ES-1 <USB>',id:9}], ouvert:-1, journal:[]};
function __dec(b){ var s=atob(b), o=new Uint8Array(s.length); for(var i=0;i<s.length;i++) o[i]=s.charCodeAt(i); return o; }
function __etat(evt, nom){ setTimeout(function(){ window.__midiEtat && __midiEtat({evt:evt, nom:nom, ouvert:__M.ouvert, appareils:__M.devs.slice()}); }, 20); }
window.__brancher = function(d){ __M.devs.push(d); __etat('ajout', d.nom); };
window.__debrancher = function(id){ var d=__M.devs.filter(x=>x.id===id)[0]; __M.devs=__M.devs.filter(x=>x.id!==id);
  if(__M.ouvert===id){ __M.ouvert=-1; __etat('perdu', d.nom); } else __etat('retrait', d.nom); };
window.DRM16 = {
  fichierSauver:function(n,b){ __F[n]=__dec(b); return '/doc/'+n; },
  fichierOuvrir:function(n){ var j='j'+Math.random(); __J[j]={n:n,p:[],t:0,max:/\.wav$/i.test(n)?64*1048576:8*1048576}; return j; },
  fichierAjouter:function(j,b){ var e=__J[j]; if(!e||b.length>1100000) return false; var o=__dec(b);
    if(e.t+o.length>e.max){ delete __J[j]; return false; } e.p.push(o); e.t+=o.length; return true; },
  fichierFermer:function(j,v){ var e=__J[j]; delete __J[j]; if(!e||!v) return ''; var o=new Uint8Array(e.t),k=0;
    e.p.forEach(function(x){o.set(x,k);k+=x.length;}); __F[e.n]=o; __F[e.n].morceaux=e.p.length; return '/doc/'+e.n; },
  midiDispo:function(){return true;}, midiListe:function(){return __M.devs.map(d=>d.nom).join('\n');},
  midiAppareils:function(){return __M.devs.map(d=>d.nom+'\t'+d.id).join('\n');},
  midiOuvertId:function(){return __M.ouvert;},
  midiOuvrirId:function(id){ __M.journal.push('ouvrir '+id); var d=__M.devs.filter(x=>x.id===id)[0];
    setTimeout(function(){ if(!d){ __etat('echec',''); return; } __M.ouvert=id; __etat('ouvert', d.nom); }, 30); },
  midiFermer:function(){ __M.journal.push('fermer'); if(__M.ouvert>=0){ __M.ouvert=-1; __etat('ferme',''); } },
  midiEnvoyer:function(){}, midiHorloge:function(on){ __M.journal.push('horloge '+on); },
  midiTempo:function(){}, midiSysex:function(){ return true; }
};
"""

async def nouvelle_page(nav, pont=False, largeur=393, hauteur=851):
    pg = await nav.new_page(viewport={"width": largeur, "height": hauteur})
    erreurs = []
    pg.on("pageerror", lambda e: erreurs.append(str(e)))
    if pont: await pg.add_init_script(PONT)
    await pg.goto(PAGE)
    await pg.wait_for_timeout(2000)
    return pg, erreurs

async def chargement_et_machines(nav):
    print("\n1. Chargement, puis chaque machine ouverte et jouée, dans trois formats d'écran")
    for (l, h) in FORMATS:
        pg, err = await nouvelle_page(nav, largeur=l, hauteur=h)
        ok(not err, "%dx%d : chargement sans erreur %s" % (l, h, err[:1]))
        rates, debord = [], []
        for m in MACHINES:
            avant = len(err)
            r = await pg.evaluate("""async (m) => {
              try { audioInit(); allerMachine(m); start(); } catch(e) { return 'ERR ' + e.message; }
              await new Promise(r => setTimeout(r, 350));
              try { stop(); } catch(e) { return 'ERR stop ' + e.message; }
              return document.documentElement.scrollWidth > window.innerWidth + 2 ? 'DEBORDE' : '';
            }""", m)
            if r.startswith("ERR") or len(err) > avant: rates.append("%s (%s)" % (m, r or err[-1][:60]))
            elif r == "DEBORDE": debord.append(m)
        ok(not rates, "%dx%d : %d machines sans erreur %s" % (l, h, len(MACHINES), rates[:3]))
        ok(not debord, "%dx%d : aucune machine ne déborde en largeur %s" % (l, h, debord[:5]))
        await pg.close()

async def attenuation(nav):
    print("\n2. Atténuation par voix du pas (v124)")
    pg, err = await nouvelle_page(nav)
    cas = [("em1","voixSynth(T,0,60,1)"),("er1","voixEr(T,0,1)"),("ea1","voixEa(T,0,48,1,0.2)"),
           ("es1","jouerEs(T,0,0.8,0)"),("emx","voixMxDrum(T,0,1)"),("esx","voixSx(T,0,0.8,0)"),
           ("mpc3000","jouerPad(T,0,1)"),("tr909","voixTr(T,1,true)"),("rd6","voixTr(T,1,true)"),
           ("t1k","voixT1k(T,0,true)"),("dbi","voixDbi(T,0,true)"),("vlc","voixVlc(T,0,0)"),
           ("ko","voixKo(T,0,1)"),("mc","voixMc(T,0,36,1)"),("stk","voixStk(T,0,true)")]
    mauvais = []
    for m, appel in cas:
        r = await pg.evaluate("""([m, appel]) => { try {
            audioInit(); allerMachine(m); var T = maintenantAudio() + 0.2;
            ouvrirPas(); eval(appel); var p = PAS, nb = p.n.length;
            attenuerVoie('x', 8, T);
            var bons = nb > 0 && p.n.every(g => Math.abs(g.gain.value - 0.21) < 0.01);
            return bons && PAS === null && pasVoie(master) === master; } catch(e) { return false; } }""", [m, appel])
        if not r: mauvais.append(m)
    ok(not mauvais, "voix de %d machines branchées sur le gain du pas %s" % (len(cas), mauvais))
    r = await pg.evaluate("async () => { ouvrirPas(); await Promise.resolve(); await Promise.resolve(); return PAS === null; }")
    ok(r, "un pas resté ouvert se referme à la fin de la tâche")
    ok(not err, "aucune erreur de page")
    await pg.close()

async def kaoss(nav):
    print("\n3. Kaoss Pad : anneau, vitesse, réduction, geste (v125 à v127)")
    pg, err = await nouvelle_page(nav)
    rendu = """async ([fx, x, y, source]) => {
      audioInit(); var vrai = [ctx, master];
      var off = new OfflineAudioContext(1, 44100, 44100); ctx = off; master = off.destination; KP.noeuds = null;
      KP.fx = KP_EFFETS.findIndex(e => e[0] === fx); KP.x = x; KP.y = y; KP.prof = 1;
      KP.touche = true; KP.tenu = false; KP.rejoue = false; KP.muet = false; KP.vitesse = 1;
      var n = noeudsKp(), freq = 1000;
      if (source === 'banque') {
        var buf = off.createBuffer(1, 44100, 44100), d = buf.getChannelData(0);
        for (var i = 0; i < 44100; i++) d[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / 44100);
        banqueEs(); ES.buf['__t'] = buf; KP.banques[0].ech = '__t'; banqueKp(0, true);
      } else {
        var o = off.createOscillator(); o.frequency.value = freq;
        var g = off.createGain(); g.gain.value = 0.5; o.connect(g); g.connect(n.e); o.start();
      }
      appliquerKp();
      var b = await off.startRendering(); ctx = vrai[0]; master = vrai[1];
      KP.noeuds = null; KP.sources = [null, null, null, null];
      var s = b.getChannelData(0).subarray(22050);
      function amp(f) { var re = 0, im = 0; for (var i = 0; i < s.length; i++) { var a = 2 * Math.PI * f * i / 44100;
        re += s[i] * Math.cos(a); im += s[i] * Math.sin(a); } return 2 * Math.hypot(re, im) / s.length; }
      var z = 0, crete = 0, niveaux = new Set();
      for (var i = 1; i < s.length; i++) { if (s[i-1] < 0 && s[i] >= 0) z++; crete = Math.max(crete, Math.abs(s[i])); niveaux.add(s[i].toFixed(4)); }
      var fr = 20 * Math.pow(180, x);
      return {sec: amp(freq), somme: amp(freq + fr), diff: amp(freq - fr), passages: z * 2, crete: crete, niveaux: niveaux.size};
    }"""
    a = await pg.evaluate(rendu, ["ring", 0.5, 1, "osc"])
    ok(a["sec"] < 0.01 and a["somme"] > 0.15 and a["diff"] > 0.15, "anneau : le son sec disparaît, somme et différence apparaissent")
    ok(a["crete"] <= 0.41, "anneau : la crête ne dépasse pas celle du son sec")
    for x, attendu in [(0, 220), (0.5, 440), (1, 880)]:
        v = await pg.evaluate(rendu, ["pitch", x, 0, "banque"])
        ok(abs(v["passages"] - attendu) <= 4, "vitesse X=%s : %d Hz (attendu %d)" % (x, v["passages"], attendu))
    c0 = await pg.evaluate(rendu, ["crush", 1, 0, "osc"])
    c1 = await pg.evaluate(rendu, ["crush", 1, 1, "osc"])
    ok(c0["niveaux"] > 500 and c1["niveaux"] < 200, "réduction : Y en bas intact, Y en haut réduit")
    r = await pg.evaluate("""() => { KP.motion = [[0.1,0.9],[0.2,0.8],[0.3,0.7]]; KP.enregistre = false;
      document.getElementById('kp-rejoue').click(); var l = [];
      for (var i = 0; i < 4; i++) { scheduleKp(i, 0); l.push(KP.x); }
      KP.rejoue = false; return l.join(','); }""")
    ok(r == "0.1,0.2,0.3,0.1", "geste rejoué depuis le premier point (%s)" % r)
    ok(not err, "aucune erreur de page")
    await pg.close()

async def fichiers(nav):
    print("\n4. Écriture par morceaux et refus des rendus trop longs (v128)")
    pg, err = await nouvelle_page(nav, pont=True)
    r = await pg.evaluate("""() => {
      var o = new Uint8Array(2500001); for (var i = 0; i < o.length; i++) o[i] = (i * 7919) & 255;
      var c = ecrireDocument(DRM16, 'x.wav', o.buffer), f = __F['x.wav'], meme = f && f.length === o.length;
      for (var i = 0; meme && i < o.length; i++) if (f[i] !== o[i]) meme = false;
      return {chemin: c, meme: meme, morceaux: f ? f.morceaux : 0}; }""")
    ok(r["chemin"] == "/doc/x.wav" and r["meme"] and r["morceaux"] == 4, "2,5 Mo en 4 morceaux, reconstitués à l'octet près")
    r = await pg.evaluate("""async () => {
      audioInit(); allerMachine('tr909'); S.bpm = 120; WAVX.mesures = 2;
      exporterWav(); for (var k = 0; k < 100 && WAVX.occupe; k++) await new Promise(r => setTimeout(r, 100));
      var n = Object.keys(__F).filter(k => /^drm-tr909/.test(k))[0];
      var bon = n && __F[n].length === tailleWavStereo(16 * 2 * stepDur() + 2.5, 44100);
      var msg = []; var sg = signal; signal = function(m) { msg.push(m); };
      S.bpm = 40; WAVX.mesures = 16; var lon = MACHINE.longueur; MACHINE.longueur = function() { return 64; };
      var avant = Object.keys(__F).length; exporterWav();
      MACHINE.longueur = lon; signal = sg; S.bpm = 120; WAVX.mesures = 2;
      return {bon: !!bon, refus: msg.join('|'), rien: Object.keys(__F).length === avant && !WAVX.occupe}; }""")
    ok(r["bon"], "export WAV de 2 mesures à la taille exacte")
    ok(r["rien"] and r["refus"].startswith("TROP LONG"), "boucle trop longue refusée avant rendu (%s)" % r["refus"])
    ok(not err, "aucune erreur de page")
    await pg.close()

async def midi(nav):
    print("\n5. MIDI : liste vivante, témoin, reconnexion (v131)")
    pg, err = await nouvelle_page(nav, pont=True)
    etat = "() => ({ouvert: MIDI.ouvertId, attente: MIDI.attenteId, temoin: document.getElementById('midi-etat').textContent, n: document.querySelectorAll('#midi-liste button').length})"
    e = await pg.evaluate(etat)
    ok(e["n"] == 2 and e["ouvert"] == -1, "liste prête au démarrage, rien d'ouvert")
    await pg.evaluate("() => document.querySelectorAll('#midi-liste button')[1].click()")
    e = await pg.evaluate(etat)
    ok(e["ouvert"] == -1 and e["attente"] == 9, "ouverture en attente, pas encore « ouvert »")
    await pg.wait_for_timeout(200); e = await pg.evaluate(etat)
    ok(e["ouvert"] == 9 and e["temoin"].startswith("●"), "ouvert après confirmation, témoin allumé")
    await pg.evaluate("() => __debrancher(9)"); await pg.wait_for_timeout(100); e = await pg.evaluate(etat)
    ok(e["ouvert"] == -1 and e["n"] == 1, "débranchement : fermé et retiré de la liste")
    await pg.evaluate("() => __brancher({nom: 'ES-1 <USB>', id: 12})"); await pg.wait_for_timeout(200); e = await pg.evaluate(etat)
    ok(e["ouvert"] == 12, "rebranchement : reconnexion automatique")
    t = await pg.evaluate("() => document.querySelector('#midi-liste').innerHTML.includes('&lt;USB&gt;')")
    ok(t, "nom d'appareil affiché comme du texte")
    ok(not err, "aucune erreur de page")
    await pg.close()

async def html_exterieur(nav):
    print("\n6. Noms extérieurs jamais interprétés comme du HTML (v132)")
    pg, err = await nouvelle_page(nav)
    r = await pg.evaluate("""async () => {
      window.__piege = 0; var nom = '<img src=x onerror="__piege=1">KICK & <b>';
      allerMachine('esx'); banqueEs(); BIB.noms[SX.pat.son[SX.sel].ech] = nom; majLedsSx();
      var a = document.getElementById('sx-ech-nom');
      allerMachine('eur'); EUR.nom = nom; memEur();
      var c = document.getElementById('eur-cat'); c.style.display = 'none'; c.dataset.vue = ''; listeRacks();
      var b = c.querySelector('button.on');
      await new Promise(r => setTimeout(r, 300));
      return {balises: a.querySelectorAll('img,b').length + b.querySelectorAll('img,b').length,
              texte: a.textContent === nom, piege: window.__piege}; }""")
    ok(r["balises"] == 0 and r["texte"] and r["piege"] == 0, "nom piégé affiché tel quel, aucun code exécuté")
    ok(not err, "aucune erreur de page")
    await pg.close()

async def hote(nav):
    print("\n7. Couche HOST : plateforme et fonctions offertes (v137)")
    pg, err = await nouvelle_page(nav)
    r = await pg.evaluate("() => ({p: HOST.plateforme, sauver: HOST.a('fichierSauver'), attr: document.documentElement.dataset.hote})")
    ok(r["p"] == "navigateur" and not r["sauver"] and r["attr"] == "navigateur", "sans pont : plateforme navigateur, aucune fonction native")
    r = await pg.evaluate("""() => { var m = []; var sg = signal; signal = function(t){ m.push(t); };
      allerMachine('vlc'); document.getElementById('vlc-export').click(); signal = sg; return m.join('|'); }""")
    ok(r == "ÉCRITURE IMPOSSIBLE ICI", "sans pont : l'export volca le dit (%s)" % r)
    await pg.close()
    pg, err2 = await nouvelle_page(nav, pont=True)
    r = await pg.evaluate("""() => ({p: HOST.plateforme, sauver: HOST.a('fichierSauver'), micro: HOST.a('micro'),
      ecrit: HOST.fichierSauver('t.mid', btoa('abc')), recu: __F['t.mid'] ? __F['t.mid'].length : 0})""")
    ok(r["p"] == "android" and r["sauver"] and not r["micro"], "avec pont : plateforme android, seules les fonctions du pont existent")
    ok(r["ecrit"] == "/doc/t.mid" and r["recu"] == 3, "avec pont : l'appel traverse HOST et revient")
    ok(not err and not err2, "aucune erreur de page")
    await pg.close()

async def main():
    async with async_playwright() as p:
        nav = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        for t in (chargement_et_machines, attenuation, kaoss, fichiers, midi, html_exterieur, hote):
            try:
                await t(nav)
            except Exception as e:
                ok(False, "%s a planté : %s" % (t.__name__, str(e).splitlines()[0][:200]))
        await nav.close()
    print()
    if fautes:
        print("%d contrôle(s) en échec :" % len(fautes))
        for f in fautes: print("  - " + f)
        sys.exit(1)
    print("Test navigateur : tout est bon.")

asyncio.run(main())
