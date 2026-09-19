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
import asyncio, base64, json, os, re, sys
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
window.__J = {};
/* fichiers et sons gardés d'un chargement à l'autre (le bloc 10 recharge la page) */
function __enc(o){ var b = ''; for(var i=0;i<o.length;i++) b += String.fromCharCode(o[i]); return btoa(b); }
window.__F = {}; window.__E = {};
try{ var __P = JSON.parse(localStorage.getItem('__pont') || '{}');
  Object.keys(__P.f || {}).forEach(function(n){ __F[n] = __dec(__P.f[n]); }); __E = __P.e || {}; }catch(e){}
function __garder(){ if(window.__pontSansPersistance) return; var f = {}; Object.keys(__F).forEach(function(n){ f[n] = __enc(__F[n]); });
  try{ localStorage.setItem('__pont', JSON.stringify({f:f, e:__E})); }catch(e){} }
window.__M = {devs:[{nom:'volca sample',id:7},{nom:'ES-1 <USB>',id:9}], ouvert:-1, journal:[]};
function __dec(b){ var s=atob(b), o=new Uint8Array(s.length); for(var i=0;i<s.length;i++) o[i]=s.charCodeAt(i); return o; }
function __etat(evt, nom){ setTimeout(function(){ window.__midiEtat && __midiEtat({evt:evt, nom:nom, ouvert:__M.ouvert, appareils:__M.devs.slice()}); }, 20); }
window.__brancher = function(d){ __M.devs.push(d); __etat('ajout', d.nom); };
window.__debrancher = function(id){ var d=__M.devs.filter(x=>x.id===id)[0]; __M.devs=__M.devs.filter(x=>x.id!==id);
  if(__M.ouvert===id){ __M.ouvert=-1; __etat('perdu', d.nom); } else __etat('retrait', d.nom); };
window.DRM16 = {
  fichierSauver:function(n,b){ __F[n]=__dec(b); __garder(); return '/doc/'+n; },
  fichierListe:function(ext){ return Object.keys(__F).filter(n=>n.endsWith(ext)).map(n=>n+'\t'+__F[n].length+'\t'+Date.now()).join('\n'); },
  fichierCharger:function(n){ return __F[n] ? __enc(__F[n]) : ''; },
  fichierSupprimer:function(n){ var a = !!__F[n]; delete __F[n]; __garder(); return a; },
  echSauver:function(n,b){ __E[n]=b; __garder(); return true; },
  echCharger:function(n){ return __E[n] || ''; },
  echListe:function(){ return Object.keys(__E).sort().join('\n'); },
  echSupprimer:function(n){ delete __E[n]; __garder(); },
  fichierOuvrir:function(n){ var j='j'+Math.random(); __J[j]={n:n,p:[],t:0,max:/\.wav$/i.test(n)?64*1048576:/\.drm16$/i.test(n)?16*1048576:8*1048576}; return j; },
  fichierAjouter:function(j,b){ var e=__J[j]; if(!e||b.length>1100000) return false; var o=__dec(b);
    if(e.t+o.length>e.max){ delete __J[j]; return false; } e.p.push(o); e.t+=o.length; return true; },
  fichierFermer:function(j,v){ var e=__J[j]; delete __J[j]; if(!e||!v) return ''; var o=new Uint8Array(e.t),k=0;
    e.p.forEach(function(x){o.set(x,k);k+=x.length;}); __F[e.n]=o; __garder(); __F[e.n].morceaux=e.p.length; return '/doc/'+e.n; },
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

async def servir_page(ctx, csp=None):
    """Sert app/src/main/assets sur http://tauri.localhost/ (comme Tauri), avec
    ou sans politique de sécurité. Une vraie origine http garde un stockage
    local stable d'un rechargement à l'autre ; en file://, Chromium le perd
    parfois (vu : bloc 10 en échec trois fois sur dix)."""
    racine = os.path.abspath("app/src/main/assets")
    types = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png",
             ".wav": "audio/wav", ".json": "application/json", ".css": "text/css"}
    async def page(route, req):
        chemin = req.url.split("//", 1)[1].split("/", 1)[1].split("?")[0] or "drm16.html"
        f = os.path.normpath(os.path.join(racine, chemin))
        if not f.startswith(racine) or not os.path.isfile(f):
            await route.fulfill(status=404, body=""); return
        entetes = {"Content-Type": types.get(os.path.splitext(f)[1], "application/octet-stream")}
        if csp: entetes["Content-Security-Policy"] = csp
        await route.fulfill(status=200, body=open(f, "rb").read(), headers=entetes)
    await ctx.route(re.compile(r'^http://tauri\.localhost/'), page)
    return "http://tauri.localhost/drm16.html"

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
           ("ko","voixKo(T,0,1)"),("mc","voixMc(T,0,36,1)"),("stk","voixStk(T,0,true)"),
           ("dmx","voixDmx(T,0,1)"),("cr5","voixCr(T,Object.keys(CR_GROUPES)[0],true)"),
           ("16","outBd = pasVoie(outBd); V.bd(T, 1)")]
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

async def kaoss_resample(nav):
    print("\n3b. Kaoss RESAMPLE : vrai enregistrement, WAV sauvegardé et limite de huit secondes (v171)")
    pg, err = await nouvelle_page(nav, pont=True)
    try:
        pret = await pg.evaluate("""() => {
          audioInit(); document.querySelector('.pick[data-m=kp]').click();
          if (!window.MediaRecorder || !ctx.createMediaStreamDestination)
            return {disponible:false};
          KP.fx = 0; KP.touche = false; KP.tenu = false; KP.rejoue = false; KP.muet = false;
          appliquerKp();
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.value = 440; g.gain.value = 0.2;
          o.connect(g); g.connect(noeudsKp().e); o.start();
          window.__kpEssai = {osc:o, gain:g, banques:JSON.stringify(KP.banques)};
          return {disponible:true, avant:Object.keys(__E)};
        }""")
        if not pret["disponible"]:
            raise RuntimeError("Chromium ne fournit pas MediaRecorder et MediaStreamAudioDestinationNode")
        bouton = pg.locator("#kp-resample")
        ok(await bouton.is_visible() and (await bouton.text_content()).strip() == "RESAMPLE",
           "la commande RESAMPLE est visible sur la façade")
        avant = pret["avant"]
        for automatique in (False, True):
            await bouton.click()
            await pg.wait_for_function("() => KP.prise && KP.prise.phase === 'enregistrement'", timeout=5000)
            ok((await bouton.text_content()).strip() == "STOP REC" and await bouton.is_enabled(),
               "STOP REC est disponible pendant la prise " + ("automatique" if automatique else "courte"))
            if not automatique:
                # Laisser passer du vrai son, sans simuler les événements du recorder.
                await pg.wait_for_function(
                    "() => KP.prise && performance.now() - KP.prise.debut >= 500", timeout=5000)
                await bouton.click()
            # La seconde prise atteint réellement le minuteur de huit secondes.
            await pg.wait_for_function("() => KP.prise === null", timeout=20000)
            r = await pg.evaluate("""(avant) => {
              var ajoutes = Object.keys(__E).filter(id => avant.indexOf(id) < 0);
              if (ajoutes.length !== 1) return {nombre:ajoutes.length, etat:KP.priseEtat};
              /* Les fonctions privées du pont ne sont pas dans la portée de
                 evaluate(). Décoder ici les octets sauvegardés par HOST. */
              var id = ajoutes[0], brut = atob(__E[id]);
              var bytes = new Uint8Array(brut.length);
              for (var j = 0; j < brut.length; j++) bytes[j] = brut.charCodeAt(j);
              var v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
              var taux = v.getUint32(24, true), canaux = v.getUint16(22, true);
              var n = v.getUint32(40, true) / 2, somme = 0;
              for (var i = 0; i < n; i++) { var x = v.getInt16(44 + i * 2, true) / 32768; somme += x * x; }
              var b = ES.buf[id];
              return {nombre:1, id:id, nom:BIB.noms[id],
                riff:String.fromCharCode.apply(null, bytes.subarray(0, 4)),
                wave:String.fromCharCode.apply(null, bytes.subarray(8, 12)),
                format:v.getUint16(20, true), bits:v.getUint16(34, true), canaux:canaux,
                taux:taux, tauxContexte:ctx.sampleRate, duree:n / taux, rms:Math.sqrt(somme / n),
                taille:bytes.length === 44 + n * 2,
                tampon:!!b && b.numberOfChannels === 1 && b.length === n && b.sampleRate === taux,
                intact:JSON.stringify(KP.banques) === __kpEssai.banques && KP.sources.every(s => s === null)};
            }""", avant)
            if r["nombre"] != 1:
                raise RuntimeError("RESAMPLE n'a pas sauvegardé exactement un son : " + str(r))
            ok(r["riff"] == "RIFF" and r["wave"] == "WAVE" and r["format"] == 1
               and r["bits"] == 16 and r["canaux"] == 1 and r["taille"] and r["tampon"],
               "la prise traverse MediaRecorder, le décodeur et HOST vers un vrai WAV mono 16 bits")
            ok(r["rms"] > 0.02 and r["taux"] == r["tauxContexte"],
               "le WAV contient le son du graphe, à la fréquence du contexte (RMS %.3f)" % r["rms"])
            ok(0 < r["duree"] <= 8 and (not automatique or r["duree"] >= 7.5),
               "durée sauvegardée %.3f s, %s" % (r["duree"],
                   "arrêt automatique à huit secondes" if automatique else "arrêt par STOP REC"))
            ok(r["intact"] and r["nom"].startswith("KAOSS "),
               "la bibliothèque reçoit la prise sans affecter ni lancer une banque")
            ok((await bouton.text_content()).strip() == "RESAMPLE" and await bouton.is_enabled(),
               "RESAMPLE redevient disponible après la conversion")
            avant.append(r["id"])
        ok(not err, "aucune erreur de page pendant les deux captures %s" % err[:1])
    finally:
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

# Imitation de la coque Rust (bureau/src-tauri/src/hote.rs et fichiers.rs), pour
# essayer le côté page de la version de bureau sans Windows.
class CoqueSimulee:
    def __init__(self):
        self.docs, self.ech, self.ecr, self.rapport = {}, {}, {}, {}
        self.reseau = []   # téléchargements demandés, rendus plus tard par window.__net
        self.midi_ouvert, self.evenements, self.midi_envois = -1, [], []   # état MIDI simulé (v141)
    @staticmethod
    def propre(n):
        p = re.sub(r'[^A-Za-z0-9_.-]', '_', n)
        return 'x' if p in ('', '.', '..') else p
    def appeler(self, nom, a):
        P = self.propre
        if nom == 'autotest': return True
        if nom == 'autotestFin': self.rapport.update(ok=a[0], texte=a[1]); return None
        if nom == 'playing': return None
        if nom == 'fichierSauver': self.docs[P(a[0])] = base64.b64decode(a[1]); return 'C:/DRM16/' + P(a[0])
        if nom == 'fichierOuvrir': j = 'j%d' % len(self.ecr); self.ecr[j] = (P(a[0]), bytearray()); return j
        if nom == 'fichierAjouter':
            if a[0] not in self.ecr or len(a[1]) > 1100000: return False
            self.ecr[a[0]][1].extend(base64.b64decode(a[1])); return True
        if nom == 'fichierFermer':
            e = self.ecr.pop(a[0], None)
            if not e or not a[1]: return ''
            self.docs[e[0]] = bytes(e[1]); return 'C:/DRM16/' + e[0]
        if nom == 'fichierListe':
            return '\n'.join('%s\t%d\t1700000000000' % (n, len(v)) for n, v in sorted(self.docs.items()) if n.endswith(a[0]))
        if nom == 'fichierCharger': n = P(a[0]); return base64.b64encode(self.docs[n]).decode() if n in self.docs else ''
        if nom == 'fichierSupprimer': return self.docs.pop(P(a[0]), None) is not None
        if nom == 'fichierDossier': return 'C:/DRM16'
        if nom == 'echDossier': return 'C:/AppData/DRM16/ech'
        if nom == 'echSauver': self.ech[P(a[0])] = a[1]; return True
        if nom == 'echCharger': return self.ech.get(P(a[0]), '')
        if nom == 'echListe': return '\n'.join(sorted(self.ech))
        if nom == 'echSupprimer': self.ech.pop(P(a[0]), None); return None
        if nom == 'netCharger': self.reseau.append(tuple(a)); return None
        # MIDI : un appareil simulé, « Synthé test », identifiant 1
        if nom == 'midiDispo': return True
        if nom == 'midiListe': return 'Synthé test'
        if nom == 'midiAppareils': return 'Synthé test\t1'
        if nom == 'midiOuvertId': return self.midi_ouvert
        if nom in ('midiOuvrir', 'midiOuvrirId'):
            self.midi_ouvert = 1; self.evenements.append(('ouvert', 'Synthé test')); return None
        if nom == 'midiFermer':
            if self.midi_ouvert >= 0: self.midi_ouvert = -1; self.evenements.append(('ferme', ''))
            return None
        if nom == 'midiEnvoyer': self.midi_envois.append(tuple(a)); return None
        if nom == 'midiSysex':
            m = base64.b64decode(a[0]); return self.midi_ouvert >= 0 and len(m) >= 3 and m[0] == 0xF0 and m[-1] == 0xF7
        if nom in ('midiHorloge', 'midiTempo', 'pleinEcran'): return None
        raise KeyError(nom)
    @staticmethod
    def telecharger(url, max_):
        # mêmes règles que reseau.rs, avec une réponse fixe de 120 octets
        if not url.lower().startswith('https://'): return ('https seulement', '')
        corps = b'U' * 120
        if max_ and len(corps) > max_: return ('trop gros : 120', '')
        return ('', base64.b64encode(corps).decode())

async def bureau(nav):
    print("\n8. Version de bureau, côté page : HOST par requêtes synchrones, réseau, MIDI et autotest (v139-v141)")
    coque = CoqueSimulee()
    appels = []
    ctx = await nav.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Edg/130")
    async def servir(route, req):
        try:
            nom = req.url.rsplit('/', 1)[-1]
            appels.append(nom)
            r = coque.appeler(nom, json.loads(req.post_data or '[]'))
            await route.fulfill(status=200, body=json.dumps({'r': r}),
                                headers={'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'})
        except KeyError:
            await route.fulfill(status=404, body='{}', headers={'Access-Control-Allow-Origin': '*'})
    await ctx.route(re.compile(r'^http://drm16\.localhost/'), servir)
    # v147 : la page est servie comme par Tauri — origine http://tauri.localhost et
    # MÊME politique de sécurité (lue dans tauri.conf.json) — pour qu'un blocage
    # se voie ici plutôt que sur un PC.
    conf = json.load(open("bureau/src-tauri/tauri.conf.json", encoding="utf-8"))
    adresse = await servir_page(ctx, conf["app"]["security"]["csp"])
    await ctx.add_init_script("window.__TAURI_INTERNALS__ = {};")
    pg = await ctx.new_page()
    err, refus = [], []
    pg.on("pageerror", lambda e: err.append(str(e)))
    pg.on("console", lambda m: refus.append(m.text) if "Content Security Policy" in m.text else None)
    await pg.goto(adresse)
    for _ in range(80):
        if coque.rapport: break
        while coque.reseau:
            url, jeton, max_ = coque.reseau.pop(0)
            erreur_net, b64 = coque.telecharger(url, max_)
            await pg.evaluate("(a) => window.__net(a[0], a[1], a[2])", [jeton, erreur_net, b64])
        while coque.evenements:
            evt, nom = coque.evenements.pop(0)
            await pg.evaluate("(e) => window.__midiEtat(e)", {"evt": evt, "nom": nom, "ouvert": coque.midi_ouvert,
                                                              "appareils": [{"nom": "Synthé test", "id": 1}]})
        await pg.wait_for_timeout(250)
    r = await pg.evaluate("() => ({p: HOST.plateforme, n: Object.keys(HOST).filter(k => typeof HOST[k] === 'function').length})")
    ok(r["p"] == "bureau" and r["n"] == 28, "plateforme bureau, 26 fonctions du pont + plein écran + HOST.a (%s)" % r)
    ok(coque.rapport.get("ok") is True, "l'autotest de la page passe contre la coque simulée")
    for ligne in str(coque.rapport.get("texte", "")).split("\n"):
        if "MIDI" in ligne: print("      " + ligne)
    if not coque.rapport.get("ok") or err:
        print("    " + str(coque.rapport.get("texte", "aucun rapport")).replace("\n", "\n    "))
        print("    erreurs :", err)
    # les deux pages invitées, sous la même politique
    for invite in ("studio", "nexus"):
        await pg.evaluate("(n) => { fermerAutresPanneaux(''); ouvrirMenu(); document.getElementById('menu-' + n).click(); }", invite)
        await pg.wait_for_timeout(2500)
        charge = await pg.evaluate("""(n) => { var f = document.querySelector('#' + n + ' iframe');
          try { return !!f && f.contentDocument.body.children.length > 0; } catch(e) { return false; } }""", invite)
        ok(charge, "page invitée « %s » chargée sous la politique de sécurité" % invite)
        await pg.evaluate("(n) => document.getElementById(n + '-fermer').click()", invite)
    ok(not refus, "aucun blocage par la politique de sécurité %s" % refus[:2])
    ok(not err, "aucune erreur de page %s" % err[:1])
    # v180 : l'autotest natif reste actif, mais ne doit écrire aucun de ses
    # fichiers ni échantillons si la reprise empêche de démarrer l'application.
    coque.docs['drm16-ouverture.json'] = b'{suivi interrompu'
    docs_avant, sons_avant = dict(coque.docs), dict(coque.ech)
    await pg.evaluate("() => { PROJET_EN_COURS = true; }")
    await ctx.add_init_script(r"""
window.__bureauV180Ecritures = [];
var poser = Storage.prototype.setItem, retirer = Storage.prototype.removeItem;
Storage.prototype.setItem = function(k,v){
  if(this === localStorage && (k === 'drm.reglages' || k.indexOf('drm.reglages.') === 0))
    __bureauV180Ecritures.push('poser ' + k);
  return poser.call(this,k,v);
};
Storage.prototype.removeItem = function(k){
  if(this === localStorage && (k === 'drm.reglages' || k.indexOf('drm.reglages.') === 0))
    __bureauV180Ecritures.push('retirer ' + k);
  return retirer.call(this,k);
};
""")
    coque.rapport.clear(); appels.clear()
    await pg.reload()
    await pg.locator('#projet-reprise-reessayer').wait_for(state='visible')
    for _ in range(40):
        if coque.rapport: break
        await pg.wait_for_timeout(250)
    r = await pg.evaluate("""() => ({application:typeof S, ecritures:__bureauV180Ecritures,
      bloque:PROJET_DEMARRAGE.bloque, plateforme:HOST.plateforme})""")
    mutations = {'fichierSauver', 'fichierOuvrir', 'fichierAjouter', 'fichierFermer',
                 'fichierSupprimer', 'echSauver', 'echSupprimer'}
    ok(coque.rapport.get('ok') is False and 'reprise' in coque.rapport.get('texte', '').lower() and
       appels.count('autotestFin') == 1 and not mutations.intersection(appels) and
       coque.docs == docs_avant and coque.ech == sons_avant,
       "reprise bloquée : l'autotest bureau rend son refus sans écrire de fichier ni de son")
    ok(r['application'] == 'undefined' and r['bloque'] and r['plateforme'] == 'bureau' and
       not r['ecritures'] and not err and not refus,
       "reprise bloquée avec autotest : aucune machine, migration ou erreur de page")
    await ctx.close()

async def liens(nav):
    print("\n12. Liens externes bloqués et signalés, comme sur Android (v147)")
    ctx = await nav.new_context()
    pg = await ctx.new_page()
    err = []
    pg.on("pageerror", lambda e: err.append(str(e)))
    await pg.goto(PAGE); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("""() => { var m = [], sg = signal; signal = function(t){ m.push(t); };
      var a = document.createElement('a'); a.href = 'https://exemple.org/page'; a.textContent = 'x';
      document.body.appendChild(a);
      var ev = new MouseEvent('click', {bubbles: true, cancelable: true});
      a.dispatchEvent(ev); a.remove();
      var b = document.createElement('a'); b.href = '#interne'; document.body.appendChild(b);
      var ev2 = new MouseEvent('click', {bubbles: true, cancelable: true});
      b.dispatchEvent(ev2); b.remove();
      signal = sg; return {bloque: ev.defaultPrevented, interne: !ev2.defaultPrevented, url: location.href, m: m}; }""")
    ok(r["bloque"] and r["m"] == ["LIEN EXTERNE NON OUVERT · EXEMPLE.ORG"], "lien externe bloqué et signalé (%s)" % r["m"])
    ok(r["interne"], "un lien interne n'est pas touché")
    ok(not err, "aucune erreur de page %s" % err[:1])
    await ctx.close()

async def chaine(nav):
    print("\n13. Chaîne de sortie : plafond, subsonique, linéarité (v150)")
    pg = await nav.new_page()
    err = []
    pg.on("pageerror", lambda e: err.append(str(e)))
    await pg.goto(PAGE); await pg.wait_for_timeout(1200)
    src = open("outils/banc-son.py", encoding="utf-8").read()   # même mesure que le banc
    js = src.split('CHAINE = r"""', 1)[1].split('"""', 1)[0]
    r = await pg.evaluate(js)
    g = dict((a, b) for a, b in r["grave"])
    lin = dict((a, b) for a, b, _ in r["courbe"])
    ok(r["plafond"] <= -0.1, "rien ne dépasse −0,1 dBFS, même une rafale à +12 dBFS (%.2f)" % r["plafond"])
    ok(g[15] - g[100] <= -10 and abs(g[50] - g[100]) < 0.5, "subsonique : 15 Hz ≤ −10 dB, 50 Hz à plat (%.1f, %.1f)" % (g[15] - g[100], g[50] - g[100]))
    ok(abs((lin[-12] - lin[-24]) - 12) < 0.1, "linéaire sous le seuil du limiteur")
    ok(not err, "aucune erreur de page %s" % err[:1])
    await pg.close()

async def lissage(nav):
    print("\n14. Réglages sans clic : potards et table lissés, nœuds neufs posés tels quels (v152)")
    pg = await nav.new_page()
    err = []
    pg.on("pageerror", lambda e: err.append(str(e)))
    await pg.goto(PAGE); await pg.wait_for_timeout(1200)
    r = await pg.evaluate("""async () => {
      audioInit(); await ctx.resume();
      var g = ctx.createGain(); g.gain.value = 1; g.connect(master);
      await new Promise(r => setTimeout(r, 100));
      var neuf = null;
      enLissant(function(){ g.gain.value = 0; var n = ctx.createGain(); n.gain.value = 0.3; neuf = n.gain.value; });
      var tout_de_suite = g.gain.value;
      await new Promise(r => setTimeout(r, 150));
      var ensuite = g.gain.value;
      g.gain.value = 0.7; var direct = g.gain.value;
      return {etat: ctx.state, tout_de_suite: tout_de_suite, ensuite: ensuite, neuf: neuf, direct: direct}; }""")
    ok(r["etat"] == "running", "moteur audio en marche (%s)" % r["etat"])
    ok(r["tout_de_suite"] > 0.5 and r["ensuite"] < 0.01, "un gain existant rejoint sa cible en douceur (%.2f puis %.3f)" % (r["tout_de_suite"], r["ensuite"]))
    ok(abs(r["neuf"] - 0.3) < 1e-6, "un nœud né pendant le geste est posé tel quel")
    ok(abs(r["direct"] - 0.7) < 1e-6, "hors geste, une valeur se pose directement")
    r = await pg.evaluate("""async () => { var m = []; allerMachine('tr909'); busSet('tr'); var b = SET.bus.tr;
      var avant = b.g.gain.value; SET.mute.tr = true; majVoieSet('tr'); var juste = b.g.gain.value;
      await new Promise(r => setTimeout(r, 150)); var apres = b.g.gain.value; SET.mute.tr = false; majVoieSet('tr', true);
      return {avant: avant, juste: juste, apres: apres}; }""")
    ok(r["juste"] > 0.3 and r["apres"] < 0.01, "coupe-son de la table en fondu (%.2f → %.3f)" % (r["juste"], r["apres"]))
    ok(not err, "aucune erreur de page %s" % err[:1])
    await pg.close()

async def vitesse(nav):
    print("\n15. Échantillons lus vite : plus de sifflement replié, calcul en tâche de fond (v155)")
    pg = await nav.new_page()
    err = []
    pg.on("pageerror", lambda e: err.append(str(e)))
    await pg.goto(PAGE); await pg.wait_for_timeout(1200)
    js = open("outils/banc-son.py", encoding="utf-8").read().split('VITESSE = r"""', 1)[1].split('"""', 1)[0]
    r = await pg.evaluate(js)
    for x in r:
        if x["filtre"]:
            ok(x["replie"] < -60 and abs(x["utile"] + 0.45) < 0.2,
               "vitesse %g : repliement %.0f dB, son utile intact (%.2f dB)" % (x["vitesse"], x["replie"], x["utile"]))
    r = await pg.evaluate("""async () => { audioInit(); var b = ctx.createBuffer(2, 88200, 44100);
      for (var c = 0; c < 2; c++){ var d = b.getChannelData(c); for (var i = 0; i < d.length; i++) d[i] = Math.sin(i * 0.3) * 0.5; }
      var N = niveauPourVitesse(b, 3.2), s = ctx.createBufferSource(); poserTampon(s, b, 3.2);
      var premier = s.buffer === b, t0 = performance.now(), der = t0, pause = 0;
      var iv = setInterval(function(){ var n = performance.now(); pause = Math.max(pause, n - der); der = n; }, 5);
      while (true){ await new Promise(r => setTimeout(r, 20)); var l = MIPMAPS.get(b); if (l[N] && l[N] !== "calcul") break; if (performance.now() - t0 > 8000) break; }
      clearInterval(iv);
      var s2 = ctx.createBufferSource(); poserTampon(s2, b, 3.2);
      var s3 = ctx.createBufferSource(); poserTampon(s3, b, 1);
      return {premier: premier, ensuite: s2.buffer !== b && s2.buffer.length === b.length, lent: s3.buffer === b, pause: pause}; }""")
    ok(r["premier"] and r["ensuite"], "la première frappe part tout de suite, les suivantes avec le tampon filtré")
    ok(r["lent"], "à vitesse normale, le tampon d'origine")
    ok(r["pause"] < 80, "calcul en tâche de fond sans bloquer la page (pause la plus longue %.0f ms)" % r["pause"])
    ok(not err, "aucune erreur de page %s" % err[:1])
    await pg.close()

async def reglages(nav):
    print("\n9. Latence réglable et machine retrouvée au redémarrage (v144)")
    ctx = await nav.new_context(viewport={"width": 393, "height": 851})
    pg = await ctx.new_page()
    err = []
    pg.on("pageerror", lambda e: err.append(str(e)))
    await pg.goto(PAGE); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("""() => { audioInit(); var avant = latenceChoisie(), bouton = document.getElementById('b-latence').textContent;
      document.getElementById('b-latence').click();
      return {avant: avant, bouton: bouton, apres: latenceChoisie(), texte: document.getElementById('b-latence').textContent, ctx: !!ctx}; }""")
    ok(r["avant"] == "balanced" and r["bouton"] == "LATENCE : MOYENNE", "hors Android, latence moyenne par défaut (%s)" % r["bouton"])
    ok(r["apres"] == "playback" and r["texte"] == "LATENCE : SÛRE" and r["ctx"], "un appui passe à SÛRE et relance le moteur")
    r = await pg.evaluate("""() => { audioInit(); allerMachine('tr909'); sortieRd6(); var avant = SAT_VOIES.map(n => n.oversample).join();
      document.getElementById('b-satq').click();
      var apres = SAT_VOIES.filter(n => n.context === ctx).map(n => n.oversample).join();
      document.getElementById('b-satq').click();
      return {avant: avant, apres: apres, texte: document.getElementById('b-satq').textContent}; }""")
    ok(r["avant"] == "2x" and r["apres"] == "4x" and r["texte"] == "SATURATIONS : ÉCONOMES",
       "saturations de voie : 2x par défaut, 4x à la demande, appliqué tout de suite (%s → %s)" % (r["avant"], r["apres"]))
    await pg.evaluate("() => { allerMachine('kp'); writeMem(); }")
    await pg.reload(); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("() => ({modele: S.modele, latence: latenceChoisie()})")
    ok(r["modele"] == "kp", "le KAOSS PAD est retrouvé au redémarrage (%s)" % r["modele"])
    ok(r["latence"] == "playback", "la latence choisie est retrouvée au redémarrage")
    ok(not err, "aucune erreur de page %s" % err[:1])
    await ctx.close()

async def projet(nav):
    print("\n10. Projet .drm16 : enregistrer, ouvrir, refuser un fichier abîmé (v145)")
    ctx = await nav.new_context(viewport={"width": 393, "height": 851})
    await ctx.add_init_script(PONT)
    adresse = await servir_page(ctx)          # origine http : stockage stable au rechargement
    pg = await ctx.new_page()
    err = []
    pg.on("pageerror", lambda e: err.append(str(e)))
    await pg.goto(adresse); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("""() => {
      audioInit(); allerMachine('kp'); S.bpm = 133; memKp(); writeMem();
      HOST.echSauver('u-essai', b64De(wavDe(ctx.createBuffer(1, 3200, 32000))));
      var nom = projetEnregistrer('projet');
      var doc = JSON.parse(new TextDecoder().decode(__F[nom]));
      /* on change tout, puis on ouvre le projet */
      allerMachine('tr909'); S.bpm = 90; writeMem(); HOST.echSupprimer('u-essai');
      window.confirm = function(){ return true; };
      var liste = document.createElement('div'); BIB.onglet = 2; projetRendre(liste);
      return {nom: nom, format: doc.format, cles: Object.keys(doc.memoire).length, son: !!doc.sons['u-essai'],
              lignes: liste.querySelectorAll('.bib-ligne').length}; }""")
    ok(r["nom"].startswith("projet-") and r["format"] == "drm16-projet" and r["cles"] >= 2 and r["son"],
       "projet enregistré : %d clés de mémoire et le son de l'utilisateur" % r["cles"])
    ok(r["lignes"] == 1, "le projet apparaît dans le rayon SAUVEGARDES")
    async with pg.expect_navigation():
        await pg.evaluate("(n) => projetOuvrirDocument(n)", r["nom"])
    await pg.wait_for_load_state("load")
    try:   # sous charge, la page rechargée peut mettre un peu plus longtemps à se remettre en place
        await pg.wait_for_function("() => typeof S !== 'undefined' && S.modele === 'kp'", timeout=10000)
    except Exception:
        pass
    await pg.wait_for_timeout(300)
    r2 = await pg.evaluate("""() => ({modele: S.modele, bpm: S.bpm, son: HOST.echListe().split('\\n').indexOf('u-essai') >= 0,
      securite: Object.keys(__F).some(n => n.indexOf('avant-ouverture-') === 0)})""")
    ok(r2["modele"] == "kp" and r2["bpm"] == 133, "après ouverture : KAOSS PAD et 133 BPM retrouvés (%s, %s)" % (r2["modele"], r2["bpm"]))
    ok(r2["son"], "après ouverture : le son de l'utilisateur est revenu")
    ok(r2["securite"], "l'état remplacé a d'abord été enregistré en « avant-ouverture »")
    r3 = await pg.evaluate("""() => { var m = []; var sg = signal; signal = function(t){ m.push(t); };
      var cas = ['pas du json', '{}', JSON.stringify({format:'drm16-projet', version:9, memoire:{}}),
                 JSON.stringify({format:'drm16-projet', version:1, memoire:{'drm.reglages':'{}', 'autre':'1'}}),
                 JSON.stringify({format:'drm16-projet', version:1, memoire:{'drm.reglages':'{}'}, sons:{'../x':'UklGR'}})];
      var ouverts = cas.map(c => projetOuvrir(c, 'essai'));
      signal = sg; return {ouverts: ouverts, messages: m, bpm: S.bpm}; }""")
    ok(not any(r3["ouverts"]) and len(r3["messages"]) == 5 and r3["bpm"] == 133,
       "5 fichiers abîmés refusés sans rien toucher : " + " / ".join(r3["messages"]))
    r4 = await pg.evaluate("""async () => { HOST.echSauver('u-abime', btoa('RIFF----pas un son')); audioInit(); chargerEchs();
      await new Promise(r => setTimeout(r, 500)); HOST.echSupprimer('u-abime'); return true; }""")
    ok(not err, "aucune erreur de page, même avec un son abîmé dans la bibliothèque %s" % err[:1])
    await ctx.close()

async def projet_sauvegarde(nav):
    print("\n10b. Projet .drm16 : copies distinctes, relecture et secours vérifié (v179)")
    ctx = await nav.new_context(viewport={"width": 393, "height": 851})
    await ctx.add_init_script(PONT)
    adresse = await servir_page(ctx)
    pg = await ctx.new_page()
    err = []
    pg.on("pageerror", lambda e: err.append(str(e)))
    try:
        await pg.goto(adresse)
        await pg.wait_for_function("() => document.body.classList.contains('pret')")
        r = await pg.evaluate("""() => {
          audioInit(); allerMachine('kp'); S.bpm = 127; memKp(); writeMem();
          projetHorodatage = function(){ return '20420102-030405'; };
          var existant = 'PROJET-20420102-030405.DRM16';
          var intact = new TextEncoder().encode('première sauvegarde déjà présente');
          __F[existant] = intact;
          var cle = MEM + '.essai-v179';
          localStorage.setItem(cle, JSON.stringify({nom:'Été à Lyon 🎶 — prise une'}));
          var un = projetEnregistrer('projet');
          var octetsUn = un ? HOST.fichierCharger(un) : '';
          S.bpm = 149;
          localStorage.setItem(cle, JSON.stringify({nom:'Deuxième prise — forêt 🌲'}));
          var deux = projetEnregistrer('projet');
          var docUn = un ? JSON.parse(texteDeB64(HOST.fichierCharger(un))) : null;
          var docDeux = deux ? JSON.parse(texteDeB64(HOST.fichierCharger(deux))) : null;
          return {un:un, deux:deux,
            distincts:!!un && !!deux && un.toLowerCase() !== deux.toLowerCase() &&
              un.toLowerCase() !== existant.toLowerCase() && deux.toLowerCase() !== existant.toLowerCase(),
            intact:octetsVersB64(__F[existant]) === octetsVersB64(intact) && HOST.fichierCharger(un) === octetsUn,
            noms:[docUn && JSON.parse(docUn.memoire[cle]).nom, docDeux && JSON.parse(docDeux.memoire[cle]).nom],
            tempos:[docUn && JSON.parse(docUn.memoire[MEM]).bpm, docDeux && JSON.parse(docDeux.memoire[MEM]).bpm]};
        }""")
        ok(r["distincts"] and r["intact"],
           "deux sauvegardes à la même seconde conservent toutes les copies, même avec un nom en majuscules")
        ok(r["noms"] == ["Été à Lyon 🎶 — prise une", "Deuxième prise — forêt 🌲"] and r["tempos"] == [127, 149],
           "les deux projets relus gardent leurs propres réglages et leurs noms UTF-8")

        r = await pg.evaluate("""() => {
          var sonAvant = b64De(wavDe(ctx.createBuffer(1, 320, 32000)));
          var sonApres = b64De(wavDe(ctx.createBuffer(1, 640, 32000)));
          HOST.echSauver('u-protege', sonAvant); writeMem();
          function memoireRangee(){
            var m = {}; Object.keys(localStorage).sort().forEach(function(k){
              if(k === MEM || k.indexOf(MEM + '.') === 0) m[k] = localStorage.getItem(k);
            }); return JSON.stringify(m);
          }
          var avant = memoireRangee(), sonsAvant = JSON.stringify(__E);
          var d = projetContenu().doc;
          d.memoire[MEM] = JSON.stringify({modele:'tr909', bpm:80});
          d.sons = {'u-protege':sonApres, 'u-nouveau':sonApres};
          window.confirm = function(){ return true; };
          var lire = HOST.fichierCharger, fermer = HOST.fichierFermer;
          var poser = projetPoserMemoire, sauverSon = HOST.echSauver, sg = signal;
          var relus = 0, ecrits = 0, mutations = 0, sonsEcrits = 0, messages = [];
          HOST.fichierCharger = function(n){ var b = lire(n);
            if(n.indexOf('avant-ouverture-') === 0){ relus++; return b.slice(0, -8); }
            return b;
          };
          HOST.fichierFermer = function(j, v){ var chemin = fermer(j, v); if(chemin) ecrits++; return chemin; };
          projetPoserMemoire = function(m){ mutations++; return poser(m); };
          HOST.echSauver = function(n,b){ sonsEcrits++; return sauverSon(n,b); };
          signal = function(t){ messages.push(t); };
          window.__projetV179SansRecharge = true;
          var ouvert;
          try{ ouvert = projetOuvrir(JSON.stringify(d), 'Projet entrant'); }
          finally { HOST.fichierCharger = lire; HOST.fichierFermer = fermer;
            projetPoserMemoire = poser; HOST.echSauver = sauverSon; signal = sg; }
          return {ouvert:ouvert, ecrits:ecrits, relus:relus, mutations:mutations, sonsEcrits:sonsEcrits,
            memoire:avant === memoireRangee(), sons:sonsAvant === JSON.stringify(__E),
            modele:S.modele, bpm:S.bpm, enCours:PROJET_EN_COURS, messages:messages};
        }""")
        ok(not r["ouvert"] and r["ecrits"] == 1 and r["relus"] >= 1 and
           any("OUVERTURE ANNULÉE" in m for m in r["messages"]),
           "un secours annoncé écrit mais tronqué à la relecture annule l'ouverture")
        ok(r["mutations"] == 0 and r["sonsEcrits"] == 0 and r["memoire"] and r["sons"] and
           r["modele"] == "kp" and r["bpm"] == 149 and not r["enCours"],
           "aucun réglage ni échantillon n'est remplacé lorsque le secours est illisible")
        await pg.wait_for_timeout(1300)
        ok(await pg.evaluate("() => window.__projetV179SansRecharge === true"),
           "l'annulation ne recharge pas la page")

        r = await pg.evaluate("""() => {
          /* Le pont réel stocke les fichiers sur disque. Pour ce gros projet,
             garder sa copie en localStorage dépasserait le quota du seul mock. */
          window.__pontSansPersistance = true; __F = {}; __E = {};
          var son = b64De(wavDe(ctx.createBuffer(1, 3500000, 32000)));
          HOST.echSauver('u-long', son);
          var nom = projetEnregistrer('grand-projet');
          var relu = nom ? HOST.fichierCharger(nom) : '';
          var doc = relu ? projetValider(texteDeB64(relu)) : null;
          return {nom:nom, taille:nom ? __F[nom].length : 0, morceaux:nom ? __F[nom].morceaux : 0,
            valide:!!doc && typeof doc === 'object', son:!!doc && doc.sons && doc.sons['u-long'] === son};
        }""")
        ok(r["nom"] and 8 * 1048576 < r["taille"] < 16 * 1048576 and r["morceaux"] > 1 and
           r["valide"] and r["son"],
           "un vrai projet de %.1f Mo avec WAV valide est écrit par morceaux et relu intégralement" % (r["taille"] / 1048576))
        ok(not err, "aucune erreur de page %s" % err[:1])
    finally:
        await ctx.close()

async def projet_reprise(nav):
    print("\n10c. Projet .drm16 : reprise avant les machines, suivi persistant et nouvel essai (v180)")
    instrumentation = r"""
window.__v180Demarrage = +(sessionStorage.getItem('__v180Demarrage') || 0) + 1;
sessionStorage.setItem('__v180Demarrage', String(__v180Demarrage));
window.__v180Ecritures = [];
var __v180Poser = Storage.prototype.setItem, __v180Retirer = Storage.prototype.removeItem;
Storage.prototype.setItem = function(k,v){
  if(this === localStorage && (k === 'drm.reglages' || k.indexOf('drm.reglages.') === 0))
    __v180Ecritures.push('poser ' + k);
  return __v180Poser.call(this,k,v);
};
Storage.prototype.removeItem = function(k){
  if(this === localStorage && (k === 'drm.reglages' || k.indexOf('drm.reglages.') === 0))
    __v180Ecritures.push('retirer ' + k);
  return __v180Retirer.call(this,k);
};
window.addEventListener('pagehide', function(){
  var sorties = JSON.parse(sessionStorage.getItem('__v180Sorties') || '[]');
  sorties.push({demarrage:__v180Demarrage, application:typeof S !== 'undefined',
    suivi:!!__F['drm16-ouverture.json'],
    bloque:typeof PROJET_DEMARRAGE !== 'undefined' && PROJET_DEMARRAGE.bloque,
    ecritures:__v180Ecritures.slice()});
  sessionStorage.setItem('__v180Sorties', JSON.stringify(sorties));
});
"""
    preparer = r"""(phase) => {
      audioInit(); allerMachine('kp'); S.bpm = 117; memKp(); writeMem();
      var ancien = b64De(wavDe(ctx.createBuffer(1, 320, 32000)));
      var nouveau = b64De(wavDe(ctx.createBuffer(1, 640, 32000)));
      var exterieur = b64De(wavDe(ctx.createBuffer(1, 960, 32000)));
      HOST.echSauver('u-reprise', ancien);
      HOST.echSauver('u-exterieur', exterieur);
      localStorage.setItem('exterieur-v180', 'à conserver');
      localStorage.setItem(MEM + '.reprise-v180', JSON.stringify({etat:'avant'}));
      var avant = projetContenu().doc;
      var apres = JSON.parse(JSON.stringify(avant));
      var reglages = JSON.parse(apres.memoire[MEM]);
      reglages.modele = 'tr909'; reglages.bpm = 163;
      apres.memoire[MEM] = JSON.stringify(reglages);
      apres.memoire[MEM + '.reprise-v180'] = JSON.stringify({etat:'apres'});
      apres.memoire[MEM + '.nouveau-v180'] = JSON.stringify({nouveau:true});
      apres.sons = {'u-reprise':nouveau, 'u-nouveau-v180':nouveau};
      function sauver(prefixe, doc){
        var nom = projetEnregistrer(prefixe, true, {doc:doc, sautes:[], erreurs:[]});
        if(!nom) throw new Error('Préparation du secours impossible');
        return nom;
      }
      var nomAvant = sauver('avant-ouverture-browser', avant);
      var nomApres = sauver('ouverture-verifiee-browser', apres);
      var suivi = {version:1, phase:phase, avant:projetReference(nomAvant,avant),
        apres:projetReference(nomApres,apres), sons:Object.keys(apres.sons)};
      projetEcrireJournal(suivi);
      PROJET_EN_COURS = true; // comme pendant l'ouverture, bloquer les sauvegardes de pagehide
      /* État interrompu : sons déjà remplacés, mémoire seulement en partie. */
      var partiel = JSON.parse(JSON.stringify(apres.memoire));
      reglages.bpm = 80; partiel[MEM] = JSON.stringify(reglages);
      delete partiel[MEM + '.reprise-v180'];
      projetPoserMemoire(partiel);
      HOST.echSauver('u-reprise', nouveau);
      HOST.echSauver('u-nouveau-v180', nouveau);
      return {avant:ancien, apres:nouveau, exterieur:exterieur,
        nomAvant:nomAvant, copieAvant:HOST.fichierCharger(nomAvant)};
    }"""
    relever = r"""() => ({
      modele:S.modele, bpm:S.bpm, suivi:!!__F[PROJET_JOURNAL],
      etat:JSON.parse(localStorage.getItem(MEM + '.reprise-v180')).etat,
      nouveau:localStorage.getItem(MEM + '.nouveau-v180'),
      son:HOST.echCharger('u-reprise'), ajout:HOST.echCharger('u-nouveau-v180'),
      exterieur:HOST.echCharger('u-exterieur'), autre:localStorage.getItem('exterieur-v180'),
      demarrage:__v180Demarrage,
      sorties:JSON.parse(sessionStorage.getItem('__v180Sorties') || '[]')
    })"""
    for phase in ('avant', 'apres', 'secours-abime'):
        ctx = await nav.new_context(viewport={"width":393, "height":851})
        await ctx.add_init_script(PONT + instrumentation)
        adresse = await servir_page(ctx)
        pg = await ctx.new_page()
        err = []
        pg.on('pageerror', lambda e: err.append(str(e)))
        try:
            await pg.goto(adresse)
            await pg.wait_for_function("() => document.body.classList.contains('pret')")
            donnees = await pg.evaluate(preparer, 'apres' if phase == 'apres' else 'avant')
            if phase == 'secours-abime':
                await pg.evaluate("""(n) => {
                  var o = __F[n].slice(); o[o.length-1] ^= 1;
                  DRM16.fichierSauver(n, octetsVersB64(o));
                }""", donnees['nomAvant'])
            await pg.reload(wait_until='domcontentloaded')
            if phase == 'secours-abime':
                await pg.locator('#projet-reprise-reessayer').wait_for(state='visible')
                r = await pg.evaluate("""() => ({
                  application:typeof S, memoire:localStorage.getItem('drm.reglages'),
                  ecritures:__v180Ecritures.slice(), suivi:!!__F[PROJET_JOURNAL],
                  erreur:document.getElementById('projet-reprise-erreur').textContent,
                  secours:document.getElementById('projet-reprise-secours').textContent,
                  defilement:document.documentElement.scrollWidth <= innerWidth,
                  focus:document.activeElement.id, bloque:PROJET_DEMARRAGE.bloque
                })""")
                ok(r['application'] == 'undefined' and not r['ecritures'] and r['suivi'] and r['bloque'] and
                   json.loads(r['memoire'])['bpm'] == 80,
                   "un secours abîmé bloque avant toute initialisation ou migration de machine")
                ok(donnees['nomAvant'] in r['erreur'] and donnees['nomAvant'] in r['secours'] and
                   r['focus'] == 'projet-reprise-reessayer' and r['defilement'],
                   "le secours à rétablir et Réessayer restent lisibles et accessibles sur téléphone")
                await pg.keyboard.press('Control+s')
                await pg.keyboard.press('Escape')
                await pg.keyboard.press('Space')
                await pg.wait_for_timeout(300)
                ok(await pg.evaluate("() => typeof S === 'undefined' && __v180Ecritures.length === 0 && !!__F[PROJET_JOURNAL]"),
                   "les raccourcis ne lancent aucune machine et ne modifient pas l'état bloqué")
                await pg.evaluate("(d) => DRM16.fichierSauver(d.nomAvant, d.copieAvant)", donnees)
                async with pg.expect_navigation():
                    await pg.locator('#projet-reprise-reessayer').click()
            await pg.wait_for_function("""() => typeof S !== 'undefined' &&
              document.body.classList.contains('pret') && !__F['drm16-ouverture.json']""", timeout=15000)
            r = await pg.evaluate(relever)
            apres = phase == 'apres'
            ok(r['modele'] == ('tr909' if apres else 'kp') and r['bpm'] == (163 if apres else 117) and
               r['etat'] == ('apres' if apres else 'avant') and bool(r['nouveau']) == apres and
               r['son'] == donnees['apres' if apres else 'avant'] and
               r['ajout'] == (donnees['apres'] if apres else ''),
               "%s : réglages, son remplacé et son ajouté retrouvent un état cohérent" % phase)
            ok(r['exterieur'] == donnees['exterieur'] and r['autre'] == 'à conserver',
               "%s : le son extérieur à l'ouverture et le stockage voisin restent intacts" % phase)
            ok(not r['suivi'] and r['demarrage'] >= 3 and
               any(not s['application'] and s['suivi'] and s['bloque'] and s['ecritures'] for s in r['sorties']),
               "%s : le suivi survit à la restauration puis disparaît après vérification au redémarrage" % phase)
            ok(not err, "%s : aucune erreur de page %s" % (phase, err[:1]))
        finally:
            await ctx.close()

async def projet_stockage_illisible(nav):
    print("\n10d. Projet .drm16 : stockage illisible distinct d'un stockage vide (v181)")
    instrumentation = r"""
window.__v181Ecritures = [];
window.__v181JournalRetire = false;
window.__v181Etat = function(){
  var m = {}, f = {};
  Object.keys(localStorage).sort().forEach(function(k){
    if(k === 'drm.reglages' || k.indexOf('drm.reglages.') === 0) m[k] = localStorage.getItem(k);
  });
  Object.keys(__F).sort().forEach(function(n){ f[n] = __enc(__F[n]); });
  return {memoire:JSON.stringify(m), sons:JSON.stringify(__E), fichiers:JSON.stringify(f)};
};
function __v181Panne(){ return sessionStorage.getItem('__v181Panne') || ''; }
var __v181Poser = Storage.prototype.setItem, __v181Retirer = Storage.prototype.removeItem;
Storage.prototype.setItem = function(k,v){
  if(this === localStorage && (k === 'drm.reglages' || k.indexOf('drm.reglages.') === 0))
    __v181Ecritures.push('memoire ' + k);
  return __v181Poser.call(this,k,v);
};
Storage.prototype.removeItem = function(k){
  if(this === localStorage && (k === 'drm.reglages' || k.indexOf('drm.reglages.') === 0))
    __v181Ecritures.push('memoire ' + k);
  return __v181Retirer.call(this,k);
};
['fichierSauver','fichierSupprimer','echSauver','echSupprimer'].forEach(function(n){
  var original = DRM16[n];
  DRM16[n] = function(){
    __v181Ecritures.push(n + ' ' + arguments[0]);
    var r = original.apply(DRM16,arguments);
    if(n === 'fichierSupprimer' && arguments[0] === 'drm16-ouverture.json')
      __v181JournalRetire = true;
    return r;
  };
});
var __v181Lire = DRM16.fichierCharger, __v181Liste = DRM16.fichierListe;
var __v181Son = DRM16.echCharger, __v181Sons = DRM16.echListe;
DRM16.fichierCharger = function(n){
  if(n === 'drm16-ouverture.json' && (__v181Panne() === 'journal-lecture' ||
     (__v181Panne() === 'apres-suppression' && __v181JournalRetire))) return null;
  return __v181Lire(n);
};
DRM16.fichierListe = function(ext){
  if(__v181Panne() === 'documents-liste') return null;
  if(__v181Panne() === 'apres-suppression' && __v181JournalRetire) return '';
  return __v181Liste(ext);
};
DRM16.echCharger = function(n){
  if(__v181Panne() === 'son-lecture' && n === 'u-stockage') return null;
  return __v181Son(n);
};
DRM16.echListe = function(){ return __v181Panne() === 'sons-liste' ? null : __v181Sons(); };
"""
    preparer = r"""(phase) => {
      audioInit(); allerMachine('kp'); S.bpm = 119; memKp(); writeMem();
      var ancien = b64De(wavDe(ctx.createBuffer(1, 320, 32000)));
      var nouveau = b64De(wavDe(ctx.createBuffer(1, 640, 32000)));
      HOST.echSauver('u-stockage', ancien);
      var avant = projetContenu().doc;
      var apres = JSON.parse(JSON.stringify(avant));
      var reglages = JSON.parse(apres.memoire[MEM]); reglages.bpm = 157;
      apres.memoire[MEM] = JSON.stringify(reglages);
      apres.sons = {'u-stockage':nouveau, 'u-ajout-v181':nouveau};
      if(phase){
        var a = projetEnregistrer('avant-ouverture-stockage', true, {doc:avant,sautes:[],erreurs:[]});
        var b = projetEnregistrer('ouverture-verifiee-stockage', true, {doc:apres,sautes:[],erreurs:[]});
        if(!a || !b) throw new Error('Préparation des copies impossible');
        projetEcrireJournal({version:1,phase:phase,avant:projetReference(a,avant),
          apres:projetReference(b,apres),sons:Object.keys(apres.sons)});
        if(phase === 'apres'){
          projetPoserMemoire(apres.memoire);
          Object.keys(apres.sons).forEach(function(n){ HOST.echSauver(n,apres.sons[n]); });
        }
      }
      PROJET_EN_COURS = true; // pagehide ne doit pas écraser l'état préparé
      return __v181Etat();
    }"""
    cas = [('journal-lecture', ''), ('documents-liste', ''),
           ('son-lecture', 'avant'), ('son-lecture', 'apres'),
           ('sons-liste', 'avant'), ('apres-suppression', 'apres')]
    for panne, phase in cas:
        ctx = await nav.new_context(viewport={"width":393, "height":851})
        await ctx.add_init_script(PONT + instrumentation)
        adresse = await servir_page(ctx)
        pg = await ctx.new_page()
        err = []
        pg.on('pageerror', lambda e: err.append(str(e)))
        nom = panne + (' / ' + phase if phase else '')
        try:
            await pg.goto(adresse)
            await pg.wait_for_function("() => document.body.classList.contains('pret')")
            avant = await pg.evaluate(preparer, phase)
            await pg.evaluate("p => sessionStorage.setItem('__v181Panne',p)", panne)
            await pg.reload(wait_until='domcontentloaded')
            await pg.locator('#projet-reprise-reessayer').wait_for(state='visible')
            r = await pg.evaluate("""() => ({etat:__v181Etat(), application:typeof S,
              ecritures:__v181Ecritures.slice(), suivi:!!__F[PROJET_JOURNAL],
              bloque:PROJET_DEMARRAGE.bloque,
              erreur:document.getElementById('projet-reprise-erreur').textContent,
              lecture:HOST.fichierCharger(PROJET_JOURNAL), liste:HOST.fichierListe(''),
              son:HOST.echCharger('u-stockage'), sons:HOST.echListe()})""")
            ecritures = ['fichierSupprimer drm16-ouverture.json'] if panne == 'apres-suppression' else []
            ok(r['application'] == 'undefined' and r['bloque'] and bool(r['erreur']) and
               r['ecritures'] == ecritures and r['etat']['memoire'] == avant['memoire'] and
               r['etat']['sons'] == avant['sons'],
               "%s : refus visible avant les machines, sans modifier réglages ni sons" % nom)
            if panne == 'apres-suppression':
                attendu = json.loads(avant['fichiers']); del attendu['drm16-ouverture.json']
                ok(r['lecture'] is None and r['liste'] == '' and not r['suivi'] and
                   json.loads(r['etat']['fichiers']) == attendu,
                   "après suppression : une relecture en échec reste bloquante même avec une liste vide")
            else:
                retour = {'journal-lecture':'lecture', 'documents-liste':'liste',
                          'son-lecture':'son', 'sons-liste':'sons'}[panne]
                ok(r[retour] is None and r['etat']['fichiers'] == avant['fichiers'] and
                   r['suivi'] == bool(phase),
                   "%s : HOST transmet null et garde le suivi et ses copies intacts" % nom)
            await pg.evaluate("() => sessionStorage.removeItem('__v181Panne')")
            async with pg.expect_navigation():
                await pg.locator('#projet-reprise-reessayer').click()
            await pg.wait_for_function("""() => typeof S !== 'undefined' &&
              document.body.classList.contains('pret') && !__F['drm16-ouverture.json']""", timeout=15000)
            ok(await pg.evaluate("() => S.bpm") == (157 if phase == 'apres' else 119) and not err,
               "%s : Réessayer reprend normalement après le retour du stockage, sans erreur de page" % nom)
        finally:
            await ctx.close()

    ctx = await nav.new_context(viewport={"width":393, "height":851})
    await ctx.add_init_script(PONT + instrumentation)
    adresse = await servir_page(ctx)
    pg = await ctx.new_page()
    err = []
    pg.on('pageerror', lambda e: err.append(str(e)))
    try:
        await pg.goto(adresse)
        await pg.wait_for_function("() => document.body.classList.contains('pret')")
        r = await pg.evaluate("""() => {
          audioInit(); allerMachine('kp'); S.bpm = 119; memKp(); writeMem();
          HOST.echSauver('u-stockage', b64De(wavDe(ctx.createBuffer(1,320,32000))));
          var entrant = projetContenu().doc;
          entrant.memoire[MEM] = JSON.stringify({modele:'tr909',bpm:157});
          var avant = __v181Etat(), messages = [], original = signal;
          window.confirm = function(){ return true; };
          sessionStorage.setItem('__v181Panne','sons-liste');
          signal = function(t){ messages.push(t); };
          var ouvert;
          try{ ouvert = projetOuvrir(JSON.stringify(entrant),'Projet entrant'); }
          finally{ signal = original; sessionStorage.removeItem('__v181Panne'); }
          return {ouvert:ouvert, avant:avant, apres:__v181Etat(), messages:messages,
            bpm:S.bpm, enCours:PROJET_EN_COURS};
        }""")
        ok(not r['ouvert'] and not r['enCours'] and r['bpm'] == 119 and r['avant'] == r['apres'] and
           any('OUVERTURE ANNULÉE' in m and 'SECOURS INCOMPLÈTE' in m for m in r['messages']),
           "ouvrir avec une liste de sons illisible annule explicitement avant toute copie ou remplacement")
        ok(not err, "aucune erreur de page lors du refus d'ouverture %s" % err[:1])
    finally:
        await ctx.close()

async def confort(nav):
    print("\n11. Confort sur ordinateur : clavier, molette, glisser-déposer (v146)")
    ctx = await nav.new_context(viewport={"width": 1180, "height": 860})
    await ctx.add_init_script(PONT)
    pg = await ctx.new_page()
    err = []
    pg.on("pageerror", lambda e: err.append(str(e)))
    await pg.goto(PAGE); await pg.wait_for_timeout(1500)
    # comme un vrai choix au menu : la tuile referme le menu
    await pg.evaluate("() => { audioInit(); document.querySelector('.pick[data-m=er1]').click(); }")
    await pg.wait_for_timeout(300)
    await pg.keyboard.press(" ")
    lance = await pg.evaluate("() => S.run")
    await pg.keyboard.press(" ")
    arrete = await pg.evaluate("() => !S.run")
    ok(lance and arrete, "Espace lance puis arrête la machine affichée")
    await pg.evaluate("() => { var i = document.createElement('input'); i.id = '__saisie'; document.body.appendChild(i); i.focus(); }")
    await pg.keyboard.press(" ")
    ok(not await pg.evaluate("() => S.run"), "Espace dans un champ de saisie ne lance rien")
    await pg.evaluate("() => { document.getElementById('__saisie').remove(); ouvrirNotice(); }")
    await pg.keyboard.press("Escape")
    ok(await pg.evaluate("() => panneauVisible() === ''"), "Échap ferme la notice")
    await pg.keyboard.press("Control+s")
    ok(await pg.evaluate("() => Object.keys(__F).some(n => /^projet-.*\\.drm16$/.test(n))"), "Ctrl+S enregistre un projet")
    await pg.evaluate("() => { ER.pat.son[ER.sel].pitch = 0.5; majKnobsEr(); }")
    await pg.hover("#er-k-pitch")
    await pg.mouse.wheel(0, -100)
    haut = await pg.evaluate("() => ER.pat.son[ER.sel].pitch")
    await pg.mouse.wheel(0, 100); await pg.mouse.wheel(0, 100)
    bas = await pg.evaluate("() => ER.pat.son[ER.sel].pitch")
    ok(abs(haut - 0.525) < 1e-6 and abs(bas - 0.475) < 1e-6, "molette sur un potard : +1/40 puis −2/40 (%.3f, %.3f)" % (haut, bas))
    await pg.evaluate("() => { ER.pat.son[ER.sel].modT = 1; majKnobsEr(); }")
    await pg.hover("#er-k-modt")
    await pg.mouse.wheel(0, -40); await pg.mouse.wheel(0, -40)
    un = await pg.evaluate("() => ER.pat.son[ER.sel].modT")
    await pg.mouse.wheel(0, -40)
    deux = await pg.evaluate("() => ER.pat.son[ER.sel].modT")
    ok(un == 1 and deux == 2, "sélecteur à positions : un cran entier de molette pour changer (%s, %s)" % (un, deux))
    r = await pg.evaluate("""async () => {
      audioInit(); banqueEs();
      var avant = Object.keys(ES.buf).length, msg = [], sg = signal; signal = function(t){ msg.push(t); };
      var ab = wavDe(ctx.createBuffer(1, 8000, 32000));
      var dt = new DataTransfer();
      dt.items.add(new File([ab], 'caisse claire.wav', {type: 'audio/wav'}));
      dt.items.add(new File(['bonjour'], 'notes.txt', {type: 'text/plain'}));
      var cible = document.body;
      cible.dispatchEvent(new DragEvent('dragenter', {dataTransfer: dt, bubbles: true}));
      var cadre = document.body.classList.contains('depot');
      cible.dispatchEvent(new DragEvent('drop', {dataTransfer: dt, bubbles: true, cancelable: true}));
      await new Promise(r => setTimeout(r, 800));
      signal = sg;
      return {cadre: cadre, apres: !document.body.classList.contains('depot'),
              ajout: Object.keys(ES.buf).length - avant, msg: msg,
              nom: Object.keys(BIB.noms).map(k => BIB.noms[k]).indexOf('caisse claire') >= 0}; }""")
    ok(r["cadre"] and r["apres"], "le cadre « DÉPOSEZ ICI » apparaît puis disparaît")
    ok(r["ajout"] == 1 and r["nom"], "un fichier son déposé rejoint la bibliothèque")
    ok(any("NON RECONNU : NOTES.TXT" in m for m in r["msg"]), "un fichier inconnu est signalé (%s)" % r["msg"])
    ok(not err, "aucune erreur de page %s" % err[:1])
    await ctx.close()

async def mc_clips(nav):
    print("\n16. MC-101 : clips, copie indépendante et mémoire au redémarrage (v173)")
    ctx = await nav.new_context(viewport={"width": 393, "height": 851})
    adresse = await servir_page(ctx)
    pg = await ctx.new_page()
    err = []
    pg.on("pageerror", lambda e: err.append(str(e)))
    try:
        await pg.goto(adresse)
        await pg.wait_for_function("() => document.body.classList.contains('pret')")
        await pg.evaluate("() => document.querySelector('.pick[data-m=mc]').click()")
        clips = pg.locator("#mc-clips > button")
        pistes = pg.locator("#mc-trks > button")
        pads = pg.locator("#mc-pads > button")
        ok(await clips.count() == 16 and await pg.locator("#mc-coller").is_disabled(),
           "seize clips accessibles et COLLER désactivé avant une copie")

        await pistes.nth(1).click()
        await pads.nth(0).click()
        await pads.nth(4).click()
        await pg.locator("#mc-copier").click()
        await clips.nth(2).click()
        ok((await clips.nth(2).locator("em").text_content()) == "VIDE" and
           await pg.locator("#mc-coller").is_enabled(), "clip 3 vide prêt à recevoir la copie")
        await pg.locator("#mc-coller").click()
        r = await pg.evaluate("""() => {
          var p = MC.pistes[1];
          return {copie:JSON.stringify(p.clips[0]) === JSON.stringify(p.clips[2]),
            independant:p.clips[0] !== p.clips[2] && p.clips[2] !== MC.copie.pas,
            affichage:document.querySelectorAll('#mc-pads > .on').length,
            actif:document.querySelector('#mc-clips').children[2].getAttribute('aria-pressed')};
        }""")
        ok(r["copie"] and r["independant"] and r["affichage"] == 2 and r["actif"] == "true",
           "les deux pas copiés apparaissent dans un clip indépendant et sélectionné")
        await pads.nth(4).click()
        r = await pg.evaluate("""() => ({source:MC.pistes[1].clips[0][4],
          cible:MC.pistes[1].clips[2][4], copie:MC.copie.pas[4]})""")
        ok(r == {"source": 0, "cible": -1, "copie": 0},
           "modifier le collage laisse le clip source et la copie intacts")

        await pistes.nth(2).click()
        await clips.nth(15).click()
        await pg.locator("#mc-coller").click()
        await pads.nth(7).click()
        await pistes.nth(1).click()
        r = await pg.evaluate("""() => ({clips:MC.pistes.map(p => p.clip),
          propre:MC.pistes[2].clips[15][7] === 0 && MC.pistes[1].clips[0][7] === -1 &&
            MC.pistes[1].clips[2][7] === -1 && MC.copie.pas[7] === -1,
          selection:document.querySelector('#mc-clips').children[2].classList.contains('sel'),
          pas:document.querySelectorAll('#mc-pads > .on').length})""")
        ok(r["clips"] == [0, 2, 15, 0] and r["propre"] and r["selection"] and r["pas"] == 1,
           "chaque piste garde son clip choisi et ses propres modifications")

        # Des valeurs non initiales rendent visible une restauration oubliée.
        # Le relevé lit l'état vivant : relire seulement memoire.mc masquerait le bug.
        await pg.evaluate("""() => {
          var p = MC.pistes[1]; p.cut = 0.23; p.dec = 0.67; p.niv = 0.42;
          p.onde = 'triangle'; p.oct = 1; MC.pistes[2].muet = true;
          MC.note = 7; MC.scatType = 4; MC.scatProf = 0.72;
          memMc(); writeMem();
        }""")
        relever = """() => ({sel:MC.sel, note:MC.note, scatType:MC.scatType, scatProf:MC.scatProf,
          pistes:MC.pistes.map(p => ({type:p.type, onde:p.onde, cut:p.cut, dec:p.dec,
            niv:p.niv, muet:p.muet, oct:p.oct, clip:p.clip, clips:p.clips}))})"""
        attendu = await pg.evaluate(relever)
        await pg.reload()
        await pg.wait_for_function("() => document.body.classList.contains('pret') && S.modele === 'mc'")
        retrouve = await pg.evaluate(relever)
        ok(retrouve == attendu, "réouverture directe sur MC : pistes, clips, notes et réglages restaurés")
        r = await pg.evaluate("""() => ({vide:MC.copie === null,
          disabled:document.getElementById('mc-coller').disabled,
          texte:document.getElementById('mc-copie-etat').textContent,
          selection:document.querySelector('#mc-clips').children[2].getAttribute('aria-pressed'),
          profondeur:Number(document.getElementById('mc-scat-prof').value),
          distinct:new Set(MC.pistes.flatMap(p => p.clips)).size === 64})""")
        ok(r["vide"] and r["disabled"] and r["texte"] == "AUCUNE COPIE",
           "le presse-papiers reste temporaire et COLLER se désactive au redémarrage")
        ok(r["selection"] == "true" and abs(r["profondeur"] - 0.72) < 1e-6 and r["distinct"],
           "façade restaurée et soixante-quatre clips toujours indépendants")
        ok(not err, "aucune erreur de page %s" % err[:1])
    finally:
        await ctx.close()

async def mc_lancements(nav):
    print("\n17. MC-101 : lancement des clips et scènes à la mesure (v174)")
    ctx = await nav.new_context(viewport={"width": 393, "height": 851})
    adresse = await servir_page(ctx)
    pg = await ctx.new_page()
    err = []
    pg.on("pageerror", lambda e: err.append(str(e)))
    try:
        await pg.goto(adresse)
        await pg.wait_for_function("() => document.body.classList.contains('pret')")
        await pg.evaluate("() => document.querySelector('.pick[data-m=mc]').click()")
        scenes = pg.locator("#mc-scenes > button")
        ok(await scenes.count() == 4 and not await pg.evaluate("MC.quantifie"),
           "quatre scènes et mode DIRECT par défaut")
        await pg.evaluate("""() => {
          MC.sel = 1;
          MC.pistes.forEach(function(p, i){
            p.cut = 0.2 + i * 0.1; p.niv = 0.4; p.muet = i === 2;
            p.clips.forEach(function(c, k){ c.fill(i === 0 ? k % 4 : (k % 8) * 12 + i); });
          });
          window.__mcAppels = [];
          window.__mcVoix = voixMc;
          voixMc = function(t, p, n, v){ __mcAppels.push({t:t, piste:p, note:n}); return __mcVoix(t,p,n,v); };
          majMc();
        }""")
        reglages = """() => ({sel:MC.sel, pistes:MC.pistes.map(p => ({type:p.type,
          onde:p.onde, cut:p.cut, dec:p.dec, niv:p.niv, muet:p.muet, oct:p.oct, clips:p.clips}))})"""
        attendu = await pg.evaluate(reglages)
        await pg.locator("#mc-quantifie").click()
        await scenes.nth(2).click()
        r = await pg.evaluate("""() => ({mode:MC.quantifie, clips:MC.pistes.map(p => p.clip),
          attente:MC.attente, depart:MC.depart, run:S.run, appels:__mcAppels.length,
          scene:document.querySelector('#mc-scenes').children[2].classList.contains('sel')})""")
        ok(r["mode"] and r["clips"] == [2, 2, 2, 2] and r["scene"] and
           r["attente"] == [None] * 4 and r["depart"] is None and not r["run"] and r["appels"] == 0,
           "à l'arrêt, la scène choisit les quatre clips immédiatement et sans jouer")
        ok(await pg.evaluate(reglages) == attendu, "une scène conserve les notes, réglages, sourdines et piste sélectionnée")
        await pg.evaluate("() => { memMc(); writeMem(); }")
        await pg.reload()
        await pg.wait_for_function("() => document.body.classList.contains('pret') && S.modele === 'mc'")
        r = await pg.evaluate("""() => ({mode:MC.quantifie, clips:MC.pistes.map(p => p.clip),
          texte:document.getElementById('mc-quantifie').textContent,
          attente:MC.attente, depart:MC.depart,
          scene:document.querySelector('#mc-scenes').children[2].classList.contains('sel')})""")
        ok(r["mode"] and "MESURE" in r["texte"] and r["clips"] == [2] * 4 and r["scene"] and
           r["attente"] == [None] * 4 and r["depart"] is None and await pg.evaluate(reglages) == attendu,
           "le mode MESURE et la scène sont restaurés, sans lancement en attente")

        # Le démarrage restaure la machine derrière le menu. Après avoir
        # vérifié cet état, rouvrir sa tuile comme le ferait l'utilisateur.
        await pg.locator(".pick[data-m=mc]").click()
        await pg.evaluate("() => { S.bpm = 90; MIDI.sync = false; HUM.temps = 0; }")
        await pg.locator("#mc-play").click()
        # Une fenêtre au milieu de la mesure, puis des clics dans une seule
        # tâche JS : ni le réseau Playwright ni l'ordonnanceur ne peuvent
        # intercaler une frontière entre la demande et son annulation.
        await pg.wait_for_function("() => S.run && MC.pos >= 2 && MC.pos <= 6 && !MC.depart")
        r = await pg.evaluate("""() => {
          var boutons = document.querySelector('#mc-clips').children;
          boutons[0].click();
          var premier = MC.attente.slice();
          boutons[3].click();
          var second = MC.attente.slice(), marque = boutons[3].classList.contains('attente');
          var actif = document.getElementById('mc-annuler').disabled === false;
          document.getElementById('mc-annuler').click();
          return {premier:premier, second:second, marque:marque, actif:actif,
            apres:MC.attente.slice(), clips:MC.pistes.map(p => p.clip),
            annuler:document.getElementById('mc-annuler').disabled};
        }""")
        ok(r["premier"] == [None, 0, None, None] and r["second"] == [None, 3, None, None] and
           r["marque"] and r["actif"] and r["apres"] == [None] * 4 and r["clips"] == [2] * 4 and r["annuler"],
           "un clip attend la mesure, une seconde demande le remplace et ANNULER garde les clips entendus")

        # Même passage réel du transport pour les quatre pistes, y compris
        # celle en sourdine. Aucune invocation manuelle de schedule/beat.
        await pg.wait_for_function("() => S.run && MC.pos >= 2 && MC.pos <= 6 && !MC.depart")
        r = await pg.evaluate("""() => {
          var scenes = document.querySelector('#mc-scenes').children;
          scenes[0].click(); scenes[1].click();
          return {attente:MC.attente.slice(), clips:MC.pistes.map(p => p.clip)};
        }""")
        ok(r["attente"] == [1] * 4 and r["clips"] == [2] * 4,
           "une nouvelle scène remplace l'attente des quatre pistes sans changer la mesure en cours")
        await pg.wait_for_function("""() => MC.pistes.every(p => p.clip === 1) && !MC.depart &&
          MC.attente.every(c => c === null)""", timeout=12000)
        r = await pg.evaluate("""() => ({run:S.run, scene:document.querySelector('#mc-scenes').children[1].classList.contains('sel'),
          clips:MC.pistes.map(p => p.clip), annuler:document.getElementById('mc-annuler').disabled})""")
        ok(r["run"] and r["scene"] and r["clips"] == [1] * 4 and r["annuler"] and
           await pg.evaluate(reglages) == attendu,
           "le transport lance ensemble les quatre clips et conserve les réglages")

        await pg.wait_for_function("() => S.run && MC.pos >= 2 && MC.pos <= 6 && !MC.depart")
        r = await pg.evaluate("""() => {
          document.querySelector('#mc-scenes').children[0].click();
          var avant = MC.attente.slice();
          document.getElementById('mc-play').click();
          return {avant:avant, attente:MC.attente.slice(), depart:MC.depart,
            run:S.run, clips:MC.pistes.map(p => p.clip), pos:MC.pos};
        }""")
        ok(r["avant"] == [0] * 4 and r["attente"] == [None] * 4 and r["depart"] is None and
           not r["run"] and r["clips"] == [1] * 4 and r["pos"] == -1,
           "STOP annule la scène en attente et conserve la dernière scène entendue")
        await pg.locator("#mc-play").click()
        await pg.wait_for_function("() => S.run && MC.pos >= 4 && MC.pos <= 8")
        ok(await pg.evaluate("() => MC.pistes.every(p => p.clip === 1) && !MC.depart && MC.attente.every(c => c === null)"),
           "la reprise ne relance pas la scène annulée")
        await pg.locator("#mc-play").click()
        ok(not err, "aucune erreur de page %s" % err[:1])
    finally:
        await ctx.close()

async def mc_scenes(nav):
    print("\n18. MC-101 : scènes personnalisées, rappels et restauration (v175)")
    ctx = await nav.new_context(viewport={"width": 393, "height": 851})
    adresse = await servir_page(ctx)
    pg = await ctx.new_page()
    err, dialogues = [], []
    pg.on("pageerror", lambda e: err.append(str(e)))

    async def refuser(dialogue):
        dialogues.append("refus")
        await dialogue.dismiss()

    async def accepter(dialogue):
        dialogues.append("accord")
        await dialogue.accept()

    try:
        await pg.goto(adresse)
        await pg.wait_for_function("() => document.body.classList.contains('pret')")
        await pg.evaluate("() => document.querySelector('.pick[data-m=mc]').click()")
        scenes = pg.locator("#mc-scenes > button")
        pistes = pg.locator("#mc-trks > button")
        clips = pg.locator("#mc-clips > button")
        origine = [[i] * 4 for i in range(4)]
        melange = [0, 1, 2, 3]
        ok(await pg.evaluate("() => MC.scenes") == origine,
           "les quatre scènes d'origine conservent les anciens rappels")
        # La première piste est déjà sélectionnée : la retoucher la mettrait
        # en sourdine. Toutes les notes et sélections passent par la façade.
        await pg.locator("#mc-pads > button").nth(0).click()
        for i in range(1, 4):
            await pistes.nth(i).click()
            await clips.nth(i).click()
            await pg.locator("#mc-pads > button").nth(i * 3).click()
        relever = """() => ({sel:MC.sel, pistes:MC.pistes.map(p => ({type:p.type,
          onde:p.onde, cut:p.cut, dec:p.dec, niv:p.niv, muet:p.muet, oct:p.oct, clips:p.clips}))})"""
        contenu = await pg.evaluate(relever)
        await pg.evaluate("""() => {
          window.__mcSceneVoix = voixMc; window.__mcSceneAppels = 0;
          voixMc = function(t,p,n,v){ __mcSceneAppels++; return __mcSceneVoix(t,p,n,v); };
        }""")

        await pg.locator("#mc-memoriser-scene").click()
        ok(await pg.evaluate("() => MC.memoScene") and await pg.locator("#mc-annuler").is_enabled(),
           "MÉMORISER arme le choix d'une destination et rend ANNULER disponible")
        pg.once("dialog", refuser)
        await scenes.nth(1).click()
        ok(dialogues == ["refus"] and await pg.evaluate("() => MC.scenes") == origine and
           await pg.evaluate("() => MC.pistes.map(p => p.clip)") == melange and
           not await pg.evaluate("() => MC.memoScene"),
           "refuser le remplacement désarme et conserve la scène et les quatre clips courants")
        await pg.locator("#mc-memoriser-scene").click()
        pg.once("dialog", accepter)
        await scenes.nth(1).click()
        personnalisees = [origine[0], melange, origine[2], origine[3]]
        r = await pg.evaluate("""() => ({scenes:MC.scenes, clips:MC.pistes.map(p => p.clip),
          arme:MC.memoScene, run:S.run, appels:__mcSceneAppels})""")
        ok(dialogues == ["refus", "accord"] and r["scenes"] == personnalisees and
           r["clips"] == melange and not r["arme"] and not r["run"] and r["appels"] == 0 and
           await pg.evaluate(relever) == contenu,
           "la scène mémorise la combinaison sans changer les clips, les notes ou jouer un son")
        ok((await scenes.nth(1).locator("em").text_content()).strip() == "1 · 2 · 3 · 4",
           "le bouton affiche le numéro de clip de chacune des quatre pistes")

        await scenes.nth(0).click()
        ok(await pg.evaluate("() => MC.pistes.map(p => p.clip)") == [0] * 4,
           "le rappel d'origine choisit le clip 1 de chaque piste")
        await scenes.nth(1).click()
        ok(await pg.evaluate("() => MC.pistes.map(p => p.clip)") == melange and
           await pg.evaluate("() => __mcSceneAppels") == 0 and await pg.evaluate(relever) == contenu,
           "le rappel DIRECT restitue la combinaison personnalisée sans modifier les motifs")
        await pg.locator("#mc-memoriser-scene").click()
        await pg.locator("#mc-annuler").click()
        ok(not await pg.evaluate("() => MC.memoScene") and
           await pg.evaluate("() => MC.scenes") == personnalisees,
           "ANNULER désarme la mémorisation sans changer les scènes")
        await pg.locator("#mc-memoriser-scene").click()
        await pg.evaluate("() => { memMc(); writeMem(); }")
        await pg.reload()
        await pg.wait_for_function("() => document.body.classList.contains('pret') && S.modele === 'mc'")
        r = await pg.evaluate("""() => ({scenes:MC.scenes, clips:MC.pistes.map(p => p.clip),
          arme:MC.memoScene, independantes:new Set(MC.scenes).size === 4,
          attente:MC.attente, depart:MC.depart})""")
        ok(r["scenes"] == personnalisees and r["clips"] == melange and not r["arme"] and
           r["independantes"] and r["attente"] == [None] * 4 and r["depart"] is None and
           await pg.evaluate(relever) == contenu,
           "au redémarrage les scènes sont restaurées et la mémorisation reste désarmée")

        # La restauration est déjà vérifiée ; fermer le menu de démarrage
        # en choisissant la tuile avant de manipuler la façade restaurée.
        await pg.locator(".pick[data-m=mc]").click()
        await scenes.nth(0).click()
        await pg.locator("#mc-quantifie").click()
        await pg.evaluate("() => { S.bpm = 90; MIDI.sync = false; HUM.temps = 0; }")
        await pg.locator("#mc-play").click()
        await pg.wait_for_function("() => S.run && MC.pos >= 2 && MC.pos <= 6 && !MC.depart")
        r = await pg.evaluate("""() => {
          document.querySelector('#mc-scenes').children[1].click();
          var memoriser = document.getElementById('mc-memoriser-scene');
          var retablir = document.getElementById('mc-retablir-scenes');
          memoriser.click(); retablir.click();
          return {attente:MC.attente.slice(), clips:MC.pistes.map(p => p.clip),
            interdit:memoriser.disabled && retablir.disabled, arme:MC.memoScene, scenes:MC.scenes};
        }""")
        ok(r["attente"] == [None, 1, 2, 3] and r["clips"] == [0] * 4 and r["interdit"] and
           not r["arme"] and r["scenes"] == personnalisees,
           "la scène mixte attend la mesure ; mémoriser et rétablir sont bloqués pendant l'attente")
        await pg.wait_for_function("""() => MC.pistes.every((p,i) => p.clip === i) &&
          !MC.depart && MC.attente.every(c => c === null)""", timeout=12000)
        ok(await pg.evaluate("() => S.run && document.querySelector('#mc-scenes').children[1].classList.contains('sel')") and
           await pg.evaluate(relever) == contenu,
           "le vrai transport rappelle la combinaison mixte à la mesure sans altérer les motifs")
        await pg.locator("#mc-memoriser-scene").click()
        await pg.locator("#mc-play").click()
        ok(await pg.evaluate("() => !S.run && !MC.memoScene") and
           await pg.evaluate("() => MC.pistes.map(p => p.clip)") == melange,
           "STOP annule l'armement et conserve les clips entendus")

        pg.once("dialog", refuser)
        await pg.locator("#mc-retablir-scenes").click()
        ok(dialogues[-1] == "refus" and await pg.evaluate("() => MC.scenes") == personnalisees,
           "refuser la restauration conserve les scènes personnalisées")
        pg.once("dialog", accepter)
        await pg.locator("#mc-retablir-scenes").click()
        ok(dialogues == ["refus", "accord", "refus", "accord"] and
           await pg.evaluate("() => MC.scenes") == origine and
           await pg.evaluate("() => MC.pistes.map(p => p.clip)") == melange and
           not await pg.evaluate("() => S.run") and await pg.evaluate(relever) == contenu,
           "rétablir les quatre scènes d'origine conserve les clips, les notes et le transport arrêté")
        ok(not err, "aucune erreur de page %s" % err[:1])
    finally:
        await ctx.close()

async def mc_samples(nav):
    print("\n23. MC-101 : import WAV, affectation, son réel et sauvegarde (v184)")
    import io, wave, math, struct
    flux = io.BytesIO()
    with wave.open(flux, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(32000)
        w.writeframes(b''.join(struct.pack('<h', int(8000 * math.sin(2*math.pi*440*i/32000))) for i in range(16000)))
    contexte = await nav.new_context(viewport={"width":393,"height":851})
    await contexte.add_init_script(PONT)
    adresse = await servir_page(contexte)
    pg = await contexte.new_page(); erreurs=[]
    pg.on('pageerror',lambda e: erreurs.append(str(e)))
    try:
        await pg.goto(adresse)
        await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=mc]').click()
        ok(await pg.locator('#mc-sample').is_disabled(), 'kit rythmique préservé')
        await pg.locator('#mc-trks button').nth(1).click()
        await pg.locator('#mc-sample').click()
        ok(await pg.evaluate("BIB.cible.machine === 'mc' && BIB.cible.partie === 0"), 'bibliothèque ciblée sur la piste 2')
        await pg.set_input_files('#bib-fichier', {'name':'test-mc.wav','mimeType':'audio/wav','buffer':flux.getvalue()})
        await pg.wait_for_function("Object.keys(BIB.noms).some(k=>BIB.noms[k]==='test-mc')")
        ligne=pg.locator('.bib-ligne').filter(has=pg.locator('b',has_text='test-mc'))
        await ligne.get_by_role('button',name='AFFECTER',exact=True).click()
        idson=await pg.evaluate("MC.pistes[1].ech")
        ok(idson.startswith('u') and await pg.evaluate("usagesEch(MC.pistes[1].ech) === 1"), 'sample affecté et usage inventorié avant suppression')
        await pg.evaluate("() => { MC.pistes[1].clips[15][0]=12; MC.pistes[1].clip=15; memMc(); writeMem(); }")
        await pg.reload()
        await pg.wait_for_function("document.body.classList.contains('pret') && ES.buf[MC.pistes[1].ech]")
        ok(await pg.evaluate("MC.pistes[1].ech") == idson and await pg.evaluate("MC.pistes[1].clips[15][0]") == 12,
           'sample personnel rechargé depuis le pont, référence et clip 16 conservés')
        # Le vrai moteur tourne dans un contexte hors ligne ; mesurer la fréquence
        # permet de distinguer le sample demandé du synthé par défaut.
        r=await pg.evaluate("""async () => {
          async function rendre(note, absent){
            var ancien=ctx, masterAvant=master, noeuds=MC.noeuds, ech=MC.pistes[1].ech;
            var voie=busSet, off=new OfflineAudioContext(1,32000,32000);
            try {
              ctx=off; master=off.destination; MC.noeuds=null; busSet=function(){return null;};
              MC.pistes[1].dec=1; MC.pistes[1].cut=1; MC.pistes[1].oct=0;
              if(absent) MC.pistes[1].ech='uabsent';
              ouvrirPas(); voixMc(0.01,1,note,0.5);
              var b=await off.startRendering(),d=b.getChannelData(0),pic=0,passages=0;
              for(var i=2000;i<5000;i++){pic=Math.max(pic,Math.abs(d[i]));if(d[i-1]<=0&&d[i]>0)passages++;}
              return {pic:pic,hz:passages*32000/3000};
            } finally {ctx=ancien; master=masterAvant; MC.noeuds=noeuds;busSet=voie;MC.pistes[1].ech=ech;}
          }
          return [await rendre(0,false),await rendre(12,false),await rendre(0,true)];
        }""")
        ok(r[0]['pic']>0.001 and abs(r[0]['hz']-440)<20 and abs(r[1]['hz']-880)<25,
           'rendu réel non silencieux : hauteur originale et octave supérieure')
        ok(r[2]['pic']==0, 'sample absent silencieux sans substitution par un oscillateur')
        await pg.locator('.pick[data-m=mc]').click()
        await pg.locator('#mc-synthe').click()
        ok(await pg.evaluate("!MC.pistes[1].ech && MC.pistes[1].clips[15][0]===12"), 'retour au synthé sans effacer le clip')
        ok(not erreurs,'aucune erreur de page : '+str(erreurs))
    finally:
        await contexte.close()

async def mc_looper(nav):
    from pathlib import Path
    print('\n24. MC-101 : Looper, rendu réel, tempo, arrêt et mémoire (v185)')
    contexte=await nav.new_context(viewport={'width':393,'height':851})
    await contexte.add_init_script(PONT)
    adresse=await servir_page(contexte)
    pg=await contexte.new_page(); erreurs=[]
    pg.on('pageerror',lambda e: erreurs.append(str(e)))
    try:
        await pg.goto(adresse)
        await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=mc]').click()
        await pg.locator('#mc-trks button').nth(1).click()
        await pg.evaluate('''() => {
          audioInit(); var b=ctx.createBuffer(1,32000,32000),d=b.getChannelData(0);
          for(var i=0;i<d.length;i++)d[i]=.3*Math.sin(2*Math.PI*440*i/32000);
          ES.buf.uloop=b; sauverEch('uloop',b);
          MC.pistes[1].clips[0][0]=12; MC.pistes[1].ech='uloop';
        }''')
        await pg.locator('#mc-looper').click()
        ok(await pg.evaluate("affecterSonMc(1,'uloop')"),'affectation au clip Looper')
        await pg.locator('#mc-copier').click()
        await pg.locator('#mc-clips button').nth(15).click()
        await pg.locator('#mc-coller').click()
        ok(await pg.evaluate("MC.pistes[1].boucles[15]==='uloop' && MC.pistes[1].clips[0][0]===12"),'copie de boucle indépendante des notes')
        await pg.evaluate('''() => { memMc(); writeMem(); }''')
        await pg.reload()
        await pg.wait_for_function("document.body.classList.contains('pret') && ES.buf.uloop")
        ok(await pg.evaluate("MC.pistes[1].looper && MC.pistes[1].boucles[15]==='uloop' && usagesEch('uloop')>=3"),'boucles, mode et son personnel restaurés ; références inventoriées')
        await pg.locator('.pick[data-m=mc]').click()
        result=await pg.evaluate('''async () => {
          var avant={ctx:ctx,master:master,n:MC.noeuds,bus:busSet,dur:stepDur};
          async function rendre(dur,nombre,muet){
            var off=new OfflineAudioContext(1,96000,32000);
            ctx=off;master=off.destination;MC.noeuds=null;busSet=function(){return null;};stepDur=function(){return dur;};
            MC.pistes[1].cut=1;MC.pistes[1].niv=.5;MC.pistes[1].muet=false;
            for(var i=0;i<nombre;i++){
              if(muet && i===8)MC.pistes[1].muet=true;
              ouvrirPas();jouerBoucleMc(1,15,i%16,.01+i*dur);
            }
            var d=(await off.startRendering()).getChannelData(0),pic=0,hz=0,fin=0;
            for(var j=2000;j<6000;j++){pic=Math.max(pic,Math.abs(d[j]));if(d[j-1]<=0&&d[j]>0)hz++;}
            for(var j=Math.ceil((.05+(muet?8:nombre)*dur)*32000);j<d.length;j++)fin=Math.max(fin,Math.abs(d[j]));
            return {pic:pic,hz:hz*8,fin:fin};
          }
          try{return [await rendre(.125,16,false),await rendre(.0625,32,false),await rendre(.125,1,false),await rendre(.125,16,true)];}
          finally{ctx=avant.ctx;master=avant.master;MC.noeuds=avant.n;busSet=avant.bus;stepDur=avant.dur;MC.pistes[1].muet=false;}
        }''')
        ok(result[0]['pic']>.01 and abs(result[0]['hz']-220)<12 and abs(result[1]['hz']-440)<12,'rendu audio réel : calage sur la mesure et hauteur liée au tempo')
        ok(all(r['fin']<.00001 for r in result),'silence après fin, arrêt de l’horloge et sourdine')
        await pg.evaluate('''() => { S.bpm=240; MC.pistes[1].clip=0; MC.quantifie=false; start(); majMc(); }''')
        await pg.wait_for_function('MC.pos>=2 && MC.pos<=6')
        await pg.locator('#mc-clips button').nth(15).click()
        ok(await pg.evaluate('MC.pistes[1].clip===0 && MC.attente[1]===15'),'boucle quantifiée même en mode DIRECT')
        await pg.wait_for_function('MC.pistes[1].clip===15')
        ok(await pg.locator('#mc-looper').is_disabled(),'changement de mode verrouillé pendant PLAY')
        await pg.evaluate('''() => { window.__loop=MC.noeuds.boucles[1]; window.__ended=false; __loop.src.onended=function(){__ended=true;}; stop(); }''')
        await pg.wait_for_function('window.__ended && !MC.noeuds')
        ok(True,'STOP termine réellement la source audio')
        await pg.locator('#mc-looper').click()
        ok(await pg.evaluate("!MC.pistes[1].looper && MC.pistes[1].ech==='uloop' && MC.pistes[1].clips[0][0]===12"),'retour aux notes sans perte du sample ni des boucles')
        await pg.locator('#mc-looper').click()
        for w,h in ((393,851),(360,640),(880,400)):
            await pg.set_viewport_size({'width':w,'height':h})
            await pg.evaluate('fit()')
            await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('mc-v185-%sx%s.png'%(w,h))))
        ok(not erreurs,'aucune erreur de page : '+str(erreurs))
    finally:
        await contexte.close()

async def stk_tranches(nav):
    print('\n25. SmplTrek : import, tranches par pas, rendu réel et sauvegarde (v186)')
    from pathlib import Path
    import io,wave,math,struct
    flux=io.BytesIO()
    with wave.open(flux,'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(32000)
        w.writeframes(b''.join(struct.pack('<h',int(8000*math.sin(2*math.pi*(220*(i//8000+1))*i/32000))) for i in range(64000)))
    contexte=await nav.new_context(viewport={'width':393,'height':851})
    await contexte.add_init_script(PONT)
    adresse=await servir_page(contexte);pg=await contexte.new_page();erreurs=[]
    pg.on('pageerror',lambda e:erreurs.append(str(e)))
    try:
        await pg.goto(adresse)
        await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=stk]').click()
        await pg.locator('#stk-import').click()
        ok(await pg.evaluate("BIB.cible.machine==='stk' && BIB.cible.partie===0 && bibParties('stk').length===10"),'bibliothèque : dix destinations SmplTrek')
        await pg.set_input_files('#bib-fichier',{'name':'tranches-stk.wav','mimeType':'audio/wav','buffer':flux.getvalue()})
        await pg.wait_for_function("Object.keys(BIB.noms).some(k=>BIB.noms[k]==='tranches-stk')")
        ligne=pg.locator('.bib-ligne').filter(has=pg.locator('b',has_text='tranches-stk'))
        await ligne.get_by_role('button',name='AFFECTER',exact=True).click()
        await pg.evaluate('writeMem()');await pg.reload()
        await pg.wait_for_function("document.body.classList.contains('pret') && ES.buf[STK.pistes[0].ech]")
        await pg.locator('.pick[data-m=stk]').click()
        ok(await pg.evaluate("STK.pistes[0].ech.startsWith('u') && usagesEch(STK.pistes[0].ech)===1"),'sample importé restauré et utilisation inventoriée')
        await pg.locator('#stk-pads button').nth(3).click()
        await pg.locator('#stk-slice').click()
        ok(await pg.evaluate('STK.motifs[0].tranches[0][3]===-1'),'ancien pas conserve le son entier en activant SLICE')
        await pg.locator('#stk-tranches button').nth(0).click()
        await pg.locator('#stk-pads button').nth(0).click()
        await pg.locator('#stk-tranches button').nth(7).click()
        await pg.locator('#stk-pads button').nth(1).click()
        await pg.locator('#stk-pads button').nth(0).click()
        ok(await pg.evaluate('STK.motifs[0].tranches[0][0]===7 && STK.motifs[0].tranches[0][1]===7'),'autre tranche remplace un pas existant')
        await pg.locator('#stk-pads button').nth(0).click()
        ok(await pg.evaluate('!(STK.motifs[0].pas[0]&1)'),'retoucher la même tranche retire le pas')
        await pg.locator('#stk-tranches button').nth(0).click()
        await pg.locator('#stk-pads button').nth(0).click()
        await pg.evaluate('memStk();writeMem()');await pg.reload()
        await pg.wait_for_function("document.body.classList.contains('pret') && ES.buf[STK.pistes[0].ech]")
        await pg.locator('.pick[data-m=stk]').click()
        ok(await pg.evaluate('STK.pistes[0].slice && STK.motifs[0].tranches[0][0]===0 && STK.motifs[0].tranches[0][1]===7'),'tranches distinctes conservées au redémarrage')
        resultat=await pg.evaluate('''async () => {
          var avant={ctx:ctx,master:master,n:STK.noeuds,bus:busSet},P=STK.pistes[0];
          async function rendre(tr,tune){
            var off=new OfflineAudioContext(1,32000,32000);ctx=off;master=off.destination;STK.noeuds=null;busSet=function(){return null;};
            P.tune=tune;P.dec=1;P.filt=1;P.niv=.5;P.pan=0;
            ouvrirPas();voixStk(.01,0,true,tr);
            var d=(await off.startRendering()).getChannelData(0),hz=0,pic=0,fin=0;
            for(var i=1280;i<3200;i++){pic=Math.max(pic,Math.abs(d[i]));if(d[i-1]<=0&&d[i]>0)hz++;}
            for(var i=Math.ceil((.02+.25/Math.pow(2,(tune-.5)*2))*32000);i<d.length;i++)fin=Math.max(fin,Math.abs(d[i]));
            return {hz:hz*32000/1920,pic:pic,fin:fin};
          }
          try{return [await rendre(0,.5),await rendre(7,.5),await rendre(0,1)];}
          finally{ctx=avant.ctx;master=avant.master;STK.noeuds=avant.n;busSet=avant.bus;P.tune=.5;}
        }''')
        ok(abs(resultat[0]['hz']-220)<25 and abs(resultat[1]['hz']-1760)<25 and abs(resultat[2]['hz']-440)<25 and all(r['pic']>.001 for r in resultat),'audio réel : première et dernière tranches correctes, transposition à l’octave')
        ok(all(r['fin']<.00001 for r in resultat),'aucune lecture au-delà de la tranche, y compris après transposition')
        await pg.locator('#stk-slice').click()
        ok(await pg.evaluate('!STK.pistes[0].slice && STK.motifs[0].tranches[0][1]===7'),'SLICE désactivé conserve les découpes écrites')
        await pg.locator('#stk-slice').click()
        await pg.locator('#stk-play').click()
        await pg.wait_for_function('STK.pos>=2')
        await pg.locator('#stk-play').click()
        ok(await pg.evaluate('!S.run && !STK.noeuds'),'lecture et arrêt du vrai séquenceur')
        for w,h in ((393,851),(360,640),(880,400)):
            await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
            await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('stk-v186-%sx%s.png'%(w,h))))
        ok(not erreurs,'aucune erreur de page : '+str(erreurs))
    finally:
        await contexte.close()

async def stk_motifs(nav):
    print('\n26. SmplTrek : copie et lancement des motifs avec le vrai transport (v187)')
    from pathlib import Path
    contexte=await nav.new_context(viewport={'width':393,'height':851})
    adresse=await servir_page(contexte);pg=await contexte.new_page();erreurs=[]
    pg.on('pageerror',lambda e:erreurs.append(str(e)))
    try:
        await pg.goto(adresse)
        await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=stk]').click()
        await pg.evaluate('''() => {
          STK.pistes[0].slice=true;STK.motifs[0].pas[0]=65535;STK.motifs[0].tranches[0].fill(0);
          STK.motifs[0].pas[9]=16;STK.motifs[0].tranches[9][4]=5;
          window.__mix=JSON.stringify(STK.pistes);majStk();
        }''')
        await pg.locator('#stk-copier').click()
        await pg.locator('#stk-ptn').click()
        await pg.locator('#stk-pads button').nth(7).click()
        await pg.locator('#stk-coller').click()
        ok(await pg.evaluate('STK.motifs[7].pas[9]===16 && STK.motifs[7].tranches[9][4]===5 && JSON.stringify(STK.pistes)===__mix'),'copie des dix pistes et de leurs tranches, mixage conservé')
        await pg.evaluate('STK.motifs[7].tranches[0].fill(7)')
        ok(await pg.evaluate('STK.motifs[0].tranches[0].every(n=>n===0) && STK.copie.motif.tranches[0].every(n=>n===0)'),'édition de la copie sans modifier la source ni le presse-papiers')
        await pg.locator('#stk-pads button').nth(0).click()
        await pg.locator('#stk-quantifie').click()
        await pg.evaluate('''() => {
          window.__voixStk=voixStk;window.__notesStk=[];
          voixStk=function(t,k,a,tr){if(k===0)__notesStk.push({t:t,tr:tr});return __voixStk(t,k,a,tr);};
          S.bpm=180;
        }''')
        await pg.locator('#stk-play').click()
        await pg.wait_for_function('STK.pos>=2 && STK.pos<=5')
        await pg.locator('#stk-pads button').nth(7).click()
        ok(await pg.evaluate('STK.cur===0 && STK.attente===7'),'motif demandé en attente, ancien motif encore sélectionné')
        await pg.locator('#stk-annuler').click()
        ok(await pg.evaluate('STK.cur===0 && STK.attente===null'),'ANNULER garde le motif courant')
        await pg.locator('#stk-pads button').nth(7).click()
        await pg.wait_for_function('STK.depart!==null')
        depart=await pg.evaluate('STK.depart.t')
        ok(await pg.evaluate('STK.cur===0') and await pg.locator('#stk-annuler').is_disabled(),'départ programmé verrouillé avant la frontière audio')
        await pg.wait_for_function('STK.cur===7')
        r=await pg.evaluate('({notes:__notesStk,temps:maintenantAudio(),mix:JSON.stringify(STK.pistes)===__mix})')
        nouvelles=[n for n in r['notes'] if n['tr']==7]
        ok(nouvelles and all(n['t']>=depart for n in nouvelles) and r['temps']>=depart and r['mix'],'tranches du nouveau motif au départ retenu, jamais avant ; réglages inchangés')
        ok(await pg.locator('#stk-coller').is_disabled(),'collage indisponible pendant PLAY')
        await pg.locator('#stk-play').click()
        ok(await pg.evaluate('!S.run && STK.cur===7 && STK.attente===null && STK.depart===null'),'STOP conserve le motif entendu et vide les demandes')
        await pg.evaluate('memStk();writeMem()');await pg.reload()
        await pg.wait_for_function("document.body.classList.contains('pret') && S.modele==='stk'")
        await pg.locator('.pick[data-m=stk]').click()
        ok(await pg.evaluate('STK.quantifie && STK.cur===7 && STK.motifs[7].tranches[0][0]===7 && STK.copie===null && STK.attente===null'),'mode et motifs restaurés, copie et demandes temporaires effacées')
        # Le STOP global annule aussi une demande de la machine secondaire du SET.
        await pg.evaluate('''() => { SET.on=true;SET.actives.stk=true;S.run=true;MACHINE=MACHINE_MC;choisirMotifStk(0); }''')
        ok(await pg.evaluate('STK.attente===0'),'demande quantifiée en machine secondaire du SET')
        await pg.evaluate('stop();SET.on=false;MACHINE=MACHINE_STK;majStk()')
        ok(await pg.evaluate('STK.attente===null && STK.depart===null'),'STOP global nettoie le SmplTrek secondaire')
        for w,h in ((393,851),(360,640),(880,400)):
            await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
            await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('stk-v187-%sx%s.png'%(w,h))))
        ok(not erreurs,'aucune erreur de page : '+str(erreurs))
    finally:
        await contexte.close()

async def stk_chaine(nav):
    print('\n27. SmplTrek : chaîne, répétitions, STOP/PLAY et sauvegarde (v188)')
    from pathlib import Path
    contexte=await nav.new_context(viewport={'width':393,'height':851})
    adresse=await servir_page(contexte);pg=await contexte.new_page();erreurs=[]
    pg.on('pageerror',lambda e:erreurs.append(str(e)))
    try:
        await pg.goto(adresse);await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=stk]').click()
        await pg.evaluate('''() => {
          STK.pistes[0].slice=true;
          STK.motifs.forEach(function(m,k){m.pas[0]=1;m.tranches[0][0]=k;});
          S.bpm=220;majStk();
        }''')
        ok(await pg.locator('#stk-chaine').is_disabled(),'chaîne vide désactivée')
        await pg.locator('#stk-chaine-ajout').click();await pg.locator('#stk-chaine-ajout').click()
        await pg.locator('#stk-ptn').click();await pg.locator('#stk-pads button').nth(2).click()
        await pg.locator('#stk-chaine-ajout').click()
        await pg.locator('#stk-pads button').nth(7).click();await pg.locator('#stk-chaine-ajout').click()
        ok(await pg.evaluate('JSON.stringify(STK.chaine)==="[0,0,2,7]"'),'chaîne 1 → 1 → 3 → 8 créée avec les boutons')
        await pg.locator('#stk-chaine').click()
        await pg.evaluate('''() => {
          window.__originalStk=voixStk;window.__chaineNotes=[];
          voixStk=function(t,k,a,tr){if(k===0)__chaineNotes.push({t:t,tr:tr});return __originalStk(t,k,a,tr);};
        }''')
        await pg.locator('#stk-play').click()
        ok(await pg.locator('#stk-chaine-ajout').is_disabled() and await pg.locator('#stk-pads button').nth(2).is_disabled(),'édition et sélection manuelle verrouillées pendant la chaîne')
        await pg.wait_for_function('STK.chainePos===2 && STK.cur===2')
        ok('LECTURE 3/4' in await pg.locator('#stk-chaine-etat').inner_text(),'position affichée sur le motif réellement entendu')
        await pg.wait_for_function('__chaineNotes.length>=5')
        r=await pg.evaluate('__chaineNotes.slice(0,5)')
        ok([n['tr'] for n in r]==[0,0,2,7,0] and all(r[i+1]['t']>r[i]['t'] for i in range(4)),'vrai transport : répétition, succession et retour au début')
        ok(await pg.evaluate('''() => { suivreMotifsStk();var courant=STK.cur;stop();return STK.cur===courant && STK.chaineDeparts.length===0 && STK.chaineProgramme===-1; }'''),'STOP conserve le motif entendu et vide les départs anticipés')
        await pg.evaluate('__chaineNotes=[]');await pg.locator('#stk-play').click()
        await pg.wait_for_function('__chaineNotes.length>0')
        ok(await pg.evaluate('__chaineNotes[0].tr===0 && STK.chaineProgramme===0'),'nouveau PLAY repart du premier motif')
        await pg.locator('#stk-play').click()
        await pg.evaluate('memStk();writeMem()');await pg.reload()
        await pg.wait_for_function("document.body.classList.contains('pret') && S.modele==='stk'")
        await pg.locator('.pick[data-m=stk]').click()
        ok(await pg.evaluate('STK.song && JSON.stringify(STK.chaine)==="[0,0,2,7]" && !S.run && STK.chaineDeparts.length===0'),'chaîne et mode restaurés sans lecture automatique')
        await pg.locator('#stk-chaine-retirer').click()
        ok(await pg.evaluate('JSON.stringify(STK.chaine)==="[0,0,2]" && STK.motifs[7].pas[0]===1'),'RETIRER FIN conserve les motifs')
        for w,h in ((393,851),(360,640),(880,400)):
            await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
            await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('stk-v188-%sx%s.png'%(w,h))))
        pg.once('dialog',lambda d:d.accept())
        await pg.locator('#stk-chaine-vider').click()
        ok(await pg.evaluate('!STK.song && STK.chaine.length===0 && STK.motifs[2].pas[0]===1'),'VIDER demande confirmation et conserve les notes')
        ok(not erreurs,'aucune erreur de page : '+str(erreurs))
    finally:
        await contexte.close()

async def stk_instrument(nav):
    print('\n28. SmplTrek : instrument, notes, copies et hauteurs audio (v189)')
    from pathlib import Path
    import io,wave,math,struct
    flux=io.BytesIO()
    with wave.open(flux,'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(32000)
        w.writeframes(b''.join(struct.pack('<h',int(8000*math.sin(2*math.pi*440*i/32000))) for i in range(32000)))
    contexte=await nav.new_context(viewport={'width':393,'height':851})
    await contexte.add_init_script(PONT)
    adresse=await servir_page(contexte);pg=await contexte.new_page();erreurs=[]
    pg.on('pageerror',lambda e:erreurs.append(str(e)))
    try:
        await pg.goto(adresse);await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=stk]').click();await pg.locator('#stk-import').click()
        await pg.set_input_files('#bib-fichier',{'name':'instrument.wav','mimeType':'audio/wav','buffer':flux.getvalue()})
        await pg.wait_for_function("Object.keys(BIB.noms).some(k=>BIB.noms[k]==='instrument')")
        ligne=pg.locator('.bib-ligne').filter(has=pg.locator('b',has_text='instrument'))
        await ligne.get_by_role('button',name='AFFECTER',exact=True).click()
        await pg.evaluate('writeMem()');await pg.reload()
        await pg.wait_for_function("document.body.classList.contains('pret') && ES.buf[STK.pistes[0].ech]")
        await pg.locator('.pick[data-m=stk]').click()
        ok(await pg.locator('#stk-note').is_disabled(),'SHOTS par défaut : ancien comportement conservé')
        await pg.locator('#stk-instrument').click()
        for i,n in enumerate(('-12','0','12')):
            await pg.locator('#stk-note').select_option(n);await pg.locator('#stk-pads button').nth(i).click()
        ok(await pg.evaluate('JSON.stringify(STK.motifs[0].notes[0].slice(0,3))==="[-12,0,12]"'),'trois hauteurs écrites par les boutons')
        await pg.locator('#stk-note').select_option('7');await pg.locator('#stk-pads button').nth(2).click()
        ok(await pg.evaluate('STK.motifs[0].notes[0][2]===7 && (STK.motifs[0].pas[0]&4)'),'autre note remplace celle du pas')
        await pg.locator('#stk-pads button').nth(2).click()
        ok(await pg.evaluate('!(STK.motifs[0].pas[0]&4)'),'même note retire le pas')
        await pg.locator('#stk-note').select_option('12');await pg.locator('#stk-pads button').nth(2).click()
        await pg.locator('#stk-copier').click();await pg.locator('#stk-ptn').click()
        await pg.locator('#stk-pads button').nth(7).click();await pg.locator('#stk-coller').click()
        await pg.evaluate('memStk();writeMem()');await pg.reload()
        await pg.wait_for_function("document.body.classList.contains('pret') && ES.buf[STK.pistes[0].ech]")
        await pg.locator('.pick[data-m=stk]').click()
        ok(await pg.evaluate('STK.pistes[0].type==="instrument" && STK.pistes[0].note===12 && JSON.stringify(STK.motifs[7].notes[0].slice(0,3))==="[-12,0,12]"'),'type, hauteur choisie, copie et notes restaurés')
        resultat=await pg.evaluate('''async () => {
          var avant={ctx:ctx,master:master,n:STK.noeuds,bus:busSet},P=STK.pistes[0];
          async function rendre(note,shots,slice){
            var off=new OfflineAudioContext(1,96000,32000);ctx=off;master=off.destination;STK.noeuds=null;busSet=function(){return null;};
            P.type=shots?'shots':'instrument';P.slice=slice;P.tune=.5;P.dec=1;P.filt=1;P.niv=.5;P.pan=0;
            ouvrirPas();voixStk(.01,0,true,slice?7:-1,note);
            var d=(await off.startRendering()).getChannelData(0),hz=0,pic=0,fin=0;
            var debut=slice?640:1600,finMesure=slice?1600:4800;
            for(var i=debut;i<finMesure;i++){pic=Math.max(pic,Math.abs(d[i]));if(d[i-1]<=0&&d[i]>0)hz++;}
            var duree=(slice?.125:1)/Math.pow(2,shots?0:note/12);
            for(var i=Math.ceil((duree+.08)*32000);i<d.length;i++)fin=Math.max(fin,Math.abs(d[i]));
            return {hz:hz*32000/(finMesure-debut),pic:pic,fin:fin};
          }
          try{return [await rendre(-12,false,false),await rendre(0,false,false),await rendre(12,false,false),await rendre(12,true,false),await rendre(12,false,true)];}
          finally{ctx=avant.ctx;master=avant.master;STK.noeuds=avant.n;busSet=avant.bus;P.type='instrument';P.slice=false;}
        }''')
        ok(all(abs(r['hz']-hz)<40 and r['pic']>.001 for r,hz in zip(resultat,(220,440,880,440,880))),'audio réel : octave basse, origine, octave haute, SHOTS et tranche transposée')
        ok(all(r['fin']<.00001 for r in resultat),'aucune lecture après la fin prévue du sample ou de la tranche')
        await pg.locator('#stk-instrument').click()
        ok(await pg.evaluate('STK.pistes[0].type==="shots" && STK.motifs[7].notes[0][2]===12'),'retour SHOTS conserve les notes')
        await pg.locator('#stk-instrument').click();await pg.locator('#stk-play').click()
        ok(await pg.locator('#stk-instrument').is_disabled(),'changement de type verrouillé pendant PLAY')
        await pg.locator('#stk-play').click()
        await pg.locator('#stk-slice').click()
        for w,h in ((393,851),(360,640),(880,400)):
            await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
            await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('stk-v189-%sx%s.png'%(w,h))))
        ok(not erreurs,'aucune erreur de page : '+str(erreurs))
    finally:
        await contexte.close()

async def stk_midi(nav):
    print('\n29. SmplTrek : clavier MIDI chromatique (v190)')
    from pathlib import Path
    contexte=await nav.new_context(viewport={'width':393,'height':851})
    await contexte.add_init_script(PONT)
    adresse=await servir_page(contexte);pg=await contexte.new_page();erreurs=[]
    pg.on('pageerror',lambda e:erreurs.append(str(e)))
    try:
        await pg.goto(adresse);await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=stk]').click()
        await pg.evaluate("STK.sel=3;MIDI.in=true;MIDI.base=36;MIDI.canalSy=0;ENR.canaux={};majStk()")
        await pg.locator('#stk-instrument').click();await pg.locator('#stk-midi').click()
        await pg.evaluate("window.__appels=[];window.__voix=voixStk;voixStk=function(){__appels.push(Array.from(arguments));return __voix.apply(this,arguments);};window.__motifs=JSON.stringify(STK.motifs)")
        await pg.evaluate("__midi(0x90,24,32);__midi(0x90,36,64);__midi(0x90,48,127);__midi(0x90,49,127);__midi(0x90,36,0);__midi(0x80,36,127)")
        a=await pg.evaluate('__appels.map(a=>[a[1],a[4],a[5]])')
        ok(len(a)==3 and [x[:2] for x in a]==[[3,-12],[3,0],[3,12]] and abs(a[0][2]-32/127)<1e-8,'touches reçues : piste sélectionnée, trois hauteurs et vélocité ; hors plage et Note Off ignorés')
        await pg.evaluate("__midi(0x99,36,100)")
        ok(await pg.evaluate('__appels.length===4 && __appels[3][1]===0'),'autre canal : routage par pistes conservé')
        await pg.evaluate("STK.pistes[3].muet=true;__midi(0x90,36,127);STK.pistes[3].muet=false;STK.solo=0;__midi(0x90,36,127);STK.solo=-1;STK.sel=0;__midi(0x90,36,127);STK.sel=3;ENR.canaux[0]='mc';__midi(0x90,36,127);ENR.canaux={}")
        ok(await pg.evaluate('__appels.length===4 && JSON.stringify(STK.motifs)===__motifs'),'mute, solo, piste SHOTS et affectation MC respectés ; aucun pas écrit')
        await pg.evaluate('MIDI.base=60;majMidiUI();memMidi();memStk();writeMem()')
        ok('48–72' in await pg.locator('#stk-midi-info').inner_text(),'plage affichée actualisée avec la note de base')
        await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=stk]').click()
        ok(await pg.evaluate('STK.clavierMidi && STK.sel===3 && STK.pistes[3].type==="instrument" && MIDI.base===60'),'mode clavier, sélection et réglages restaurés')
        await pg.locator('#stk-play').click()
        ok(await pg.locator('#stk-midi').is_disabled(),'mode MIDI verrouillé pendant PLAY')
        await pg.locator('#stk-play').click()
        for w,h in ((393,851),(360,640),(880,400)):
            await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
            await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('stk-v190-%sx%s.png'%(w,h))))
        await pg.locator('#stk-midi').click()
        ok(await pg.evaluate('!STK.clavierMidi && cibleMidiStk(60,0).piste===0'),'désactivation : retour au routage habituel')
        ok(not erreurs,'aucune erreur de page : '+str(erreurs))
    finally:
        await contexte.close()

async def stk_edition_chaine(nav):
    print('\n30. SmplTrek : édition des entrées de chaîne (v191)')
    from pathlib import Path
    contexte=await nav.new_context(viewport={'width':393,'height':851})
    adresse=await servir_page(contexte);pg=await contexte.new_page();erreurs=[]
    pg.on('pageerror',lambda e:erreurs.append(str(e)))
    try:
        await pg.goto(adresse);await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=stk]').click()
        await pg.evaluate("STK.chaine=[0,0,2,7];STK.cur=5;STK.song=true;window.__motifs=JSON.stringify(STK.motifs);majStk()")
        ok(await pg.locator('#stk-chaine-edition').is_hidden(),'commandes masquées sans sélection')
        await pg.locator('#stk-chaine-liste button').nth(1).click()
        ok(await pg.evaluate('STK.chaineSel===1 && STK.cur===5 && STK.song'),'sélection de la deuxième répétition sans changer le motif ni le mode')
        await pg.locator('#stk-chaine-droite').click()
        ok(await pg.evaluate('JSON.stringify(STK.chaine)==="[0,2,0,7]" && STK.chaineSel===2'),'déplacement de la bonne occurrence vers la fin')
        await pg.locator('#stk-chaine-gauche').click();await pg.locator('#stk-chaine-dupliquer').click()
        ok(await pg.evaluate('JSON.stringify(STK.chaine)==="[0,0,0,2,7]" && STK.chaineSel===2'),'duplication insérée après la sélection')
        await pg.locator('#stk-chaine-supprimer').click()
        ok(await pg.evaluate('JSON.stringify(STK.chaine)==="[0,0,2,7]" && JSON.stringify(STK.motifs)===__motifs'),'retrait au milieu sans effacer les motifs')
        await pg.locator('#stk-chaine-liste button').nth(0).click()
        ok(await pg.locator('#stk-chaine-gauche').is_disabled(),'première entrée : déplacement avant désactivé')
        await pg.locator('#stk-chaine-liste button').nth(3).click()
        ok(await pg.locator('#stk-chaine-droite').is_disabled(),'dernière entrée : déplacement après désactivé')
        await pg.locator('#stk-chaine-gauche').click()
        await pg.evaluate('memStk();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=stk]').click()
        ok(await pg.evaluate('JSON.stringify(STK.chaine)==="[0,0,7,2]" && STK.chaineSel===-1 && STK.song'),'ordre sauvegardé et sélection temporaire réinitialisée')
        await pg.locator('#stk-chaine-liste button').nth(2).click();await pg.locator('#stk-play').click()
        ok(await pg.locator('#stk-chaine-liste button').nth(2).is_disabled() and await pg.locator('#stk-chaine-dupliquer').is_disabled(),'édition verrouillée pendant PLAY')
        await pg.wait_for_function("document.querySelector('#stk-chaine-liste .lecture')")
        ok(await pg.evaluate('STK.cur===0'),'PLAY repart au début, indépendamment de la sélection')
        await pg.locator('#stk-play').click()
        for w,h in ((393,851),(360,640),(880,400)):
            await pg.set_viewport_size({'width':w,'height':h});await pg.evaluate('fit()')
            await pg.screenshot(path=str(Path(__file__).resolve().parents[2]/('stk-v191-%sx%s.png'%(w,h))))
        await pg.evaluate('STK.chaine=Array(256).fill(0);STK.chaineSel=255;majStk()')
        ok(await pg.locator('#stk-chaine-dupliquer').is_disabled(),'limite de 256 entrées : duplication désactivée')
        await pg.locator('#stk-chaine-liste button').nth(255).click()
        ok(await pg.locator('#stk-chaine-edition').is_hidden(),'retoucher la sélection referme les commandes')
        await pg.evaluate('STK.chaine=[7];STK.chaineSel=0;majStk()')
        await pg.locator('#stk-chaine-supprimer').click()
        ok(await pg.evaluate('!STK.song && !STK.chaine.length && STK.chaineSel===-1'),'retirer la dernière entrée désactive la chaîne')
        ok(not erreurs,'aucune erreur de page : '+str(erreurs))
    finally:
        await contexte.close()

async def em_64_pas(nav):
    print('\n31. EM-1 : 64 pas, pages et export complet (v218)')
    pg, err = await nouvelle_page(nav, pont=True)
    try:
        await pg.locator('.pick[data-m=em1]').click()
        await pg.evaluate('EM.pat=motifVide();EM.pat.st.forEach(r=>r.fill(0));EM.sel=0;EM.page=0;majTouches()')
        await pg.locator('#em-longueur').select_option('64')
        await pg.locator('#em-page').select_option('3')
        await pg.locator('#em-keys button').nth(15).click()
        ok(await pg.evaluate('EM.pat.st[0][63]===1 && EM.pat.st[0][15]===0'),'le bouton 64 écrit le dernier pas, sans toucher le pas 16')
        await pg.locator('#em-longueur').select_option('16')
        ok(await pg.evaluate('EM.page===0 && EM.pat.st[0][63]===1'),'raccourcir conserve les pas masqués et revient à une page valide')
        await pg.locator('#em-longueur').select_option('64')
        await pg.evaluate('memEm();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=em1]').click()
        ok(await pg.evaluate('EM.pat.len===64 && EM.pat.st[0][63]===1'),'longueur et pas 64 restaurés')
        await pg.locator('#em-page').select_option('3')
        await pg.evaluate('beatEm(63)')
        ok('cur' in (await pg.locator('#em-keys button').nth(15).get_attribute('class')),'curseur sur le pas 64')
        await pg.evaluate('S.run=true;majPagesEm()')
        ok(await pg.locator('#em-longueur').is_disabled(),'longueur verrouillée pendant la lecture')
        await pg.evaluate('S.run=false;arretEm()')
        r=await pg.evaluate('''async () => {
          audioInit();EM.mode=0;EM.pat.st.forEach(r=>r.fill(0));EM.pat.st[8][63]=1;EM.pat.nt[8][63]=60;
          EM.pat.onde[8]=7;EM.pat.fx.fill(false);EM.dDepth=0;EM.pat.len=64;S.bpm=120;WAVX.mesures=1;
          memEm();exporterWav();for(let i=0;i<150&&WAVX.occupe;i++)await new Promise(r=>setTimeout(r,100));
          let n=Object.keys(__F).find(n=>/^drm-em1.*\\.wav$/.test(n));if(!n)return {taille:false,avant:1,fin:0};
          let o=__F[n],v=new DataView(o.buffer,o.byteOffset,o.byteLength),avant=0,fin=0;
          for(let j=0;j<44100;j++)avant=Math.max(avant,Math.abs(v.getInt16(44+4*j,true)));
          for(let j=Math.floor(7.93*44100);j<Math.floor(8.02*44100);j++)fin=Math.max(fin,Math.abs(v.getInt16(44+4*j,true)));
          return {taille:o.length===tailleWavStereo(64*stepDur()+2.5,44100),avant,fin};
        }''')
        ok(r['taille'] and r['avant']==0 and r['fin']>10,'vrai WAV : durée de 64 pas et son présent au dernier pas avec la nouvelle onde ODD')
        ok(not err,'aucune erreur de page : '+str(err))
    finally:
        await pg.context.close()

async def em_song_wav(nav):
    print('\n32. EM-1 : export Song de longueurs différentes (v219)')
    pg, err = await nouvelle_page(nav, pont=True)
    try:
        await pg.locator('.pick[data-m=em1]').click()
        await pg.evaluate('''() => {
          audioInit();EM.slots=Array.from({length:16},()=>motifVide());
          [4,32,8].forEach((L,k)=>{let p=EM.slots[k];p.len=L;p.st.forEach(r=>r.fill(0));p.fx.fill(false);p.st[8][L-1]=1;p.nt[8][L-1]=60;p.onde[8]=7;});
          EM.song=[0,1,2];EM.cur=2;EM.pat=EM.slots[2];EM.mode=2;EM.spos=1;EM.ssel=1;EM.page=0;EM.pasSel=6;EM.dDepth=0;
          S.bpm=120;WAVX.mesures=9;memEm();majTouches();window.__emAvant=JSON.stringify({cur:EM.cur,pat:EM.pat,page:EM.page,pasSel:EM.pasSel,spos:EM.spos,ssel:EM.ssel,mode:EM.mode,song:EM.song});window.__ctxAvant=ctx;
        }''')
        await pg.locator('#em-export-song').click()
        await pg.wait_for_function('!WAVX.occupe',timeout=20000)
        r=await pg.evaluate('''() => {
          let n=Object.keys(__F).find(n=>/^drm-em1-song-3ent-/.test(n));if(!n)return {taille:false,fin:0,retour:false};
          let o=__F[n],v=new DataView(o.buffer,o.byteOffset,o.byteLength),fin=0;
          for(let j=Math.floor(5.43*44100);j<Math.floor(5.48*44100);j++)fin=Math.max(fin,Math.abs(v.getInt16(44+4*j,true)));
          return {taille:o.length===tailleWavStereo(44*stepDur()+2.5,44100),fin,retour:ctx===__ctxAvant&&!document.body.inert&&JSON.stringify({cur:EM.cur,pat:EM.pat,page:EM.page,pasSel:EM.pasSel,spos:EM.spos,ssel:EM.ssel,mode:EM.mode,song:EM.song})===__emAvant};
        }''')
        ok(r['taille'] and r['fin']>10,'vrai WAV de 4+32+8 pas, un passage malgré neuf répétitions dans le menu, dernière note présente')
        ok(r['retour'],'contexte audio, motif, sélection, Song et commandes restaurés')
        await pg.evaluate('ecrireVol(8)')
        ok(not err,'aucune erreur de page après export et reprise du jeu : '+str(err))
    finally:
        await pg.context.close()

async def em_song_edition(nav):
    print('\n33. EM-1 : édition des positions Song (v220)')
    pg, err = await nouvelle_page(nav, pont=True)
    try:
        await pg.locator('.pick[data-m=em1]').click()
        await pg.evaluate('EM.song=[0,0,2,7];EM.slots[0].len=64;memEm()')
        await pg.locator('#unit-em1 [data-mode="2"]').click()
        await pg.locator('#em-keys button').nth(1).click()
        await pg.locator('#em-song-droite').click()
        ok(await pg.evaluate('JSON.stringify(EM.song)==="[0,2,0,7]"&&EM.ssel===2'),'déplacement de la bonne répétition')
        await pg.locator('#em-song-gauche').click();await pg.locator('#em-song-dupliquer').click()
        ok(await pg.evaluate('JSON.stringify(EM.song)==="[0,0,0,2,7]"&&EM.ssel===2'),'duplication juste après la sélection')
        pg.once('dialog',lambda d:d.dismiss());await pg.locator('#em-song-annuler').click()
        ok(await pg.evaluate('EM.song.length===5'),'annulation refusée : duplication conservée')
        pg.once('dialog',lambda d:d.accept());await pg.locator('#em-song-annuler').click()
        ok(await pg.evaluate('JSON.stringify(EM.song)==="[0,0,2,7]"&&EM.ssel===1'),'ANNULER SONG restaure ordre et sélection')
        ok(await pg.locator('#em-song-annuler').is_disabled(),'un seul niveau d’annulation')
        await pg.locator('#em-song-dupliquer').click()
        pg.once('dialog',lambda d:d.dismiss());await pg.locator('#em-song-supprimer').click()
        ok(await pg.evaluate('EM.song.length===5'),'retrait refusé sans modification')
        pg.once('dialog',lambda d:d.accept());await pg.locator('#em-song-supprimer').click()
        await pg.evaluate('memEm();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=em1]').click()
        ok(await pg.evaluate('JSON.stringify(EM.song)==="[0,0,2,7]"'),'ordre restauré après rechargement')
        await pg.locator('#unit-em1 [data-mode="2"]').click()
        await pg.locator('#em-keys button').nth(3).click()
        await pg.locator('#em-play').click()
        await pg.wait_for_function('document.getElementById("em-song-dupliquer").disabled')
        ok(await pg.evaluate('EM.cur===0&&EM.spos===0'),'lecture depuis la première position malgré la sélection de la dernière')
        ok(await pg.locator('#em-song-supprimer').is_disabled(),'retrait bloqué pendant PLAY')
        await pg.locator('#em-stop').click()
        ok(not err,'aucune erreur de page : '+str(err))
    finally:
        await pg.context.close()

async def em_song_64(nav):
    print('\n35. EM-1 : Song sur 64 positions et quatre pages (v225)')
    pg, err = await nouvelle_page(nav, pont=True)
    try:
        await pg.locator('.pick[data-m=em1]').click()
        await pg.evaluate('''() => {
          EM.song=Array(16).fill(0);EM.cur=1;EM.mode=2;EM.spos=0;EM.ssel=15;EM.songPage=0;majTouches();
        }''')
        await pg.locator('#em-song-page').select_option('1')
        ok(await pg.evaluate('EM.songPage===1'),'la page 17–32 devient disponible après 16 positions')
        await pg.locator('#em-keys button').nth(0).click()
        ok(await pg.evaluate('EM.song.length===17&&EM.ssel===16&&EM.songPage===1&&EM.song[16]===1'),'la première touche de la page suivante ajoute la position 17')
        await pg.evaluate('EM.song=Array(64).fill(0);EM.songPage=3;EM.ssel=63;majTouches()')
        ok(await pg.locator('#em-song-page').input_value()=='3','la quatrième page affiche 49–64')
        ok(await pg.locator('#em-song-dupliquer').is_disabled(),'la duplication est bloquée à 64 positions')
        await pg.locator('#em-keys button').nth(15).click()
        ok(await pg.evaluate('EM.song.length===64&&EM.ssel===63'),'la position 64 reste sélectionnable sans créer de 65e entrée')
        await pg.locator('#em-song-page').select_option('2')
        ok(await pg.evaluate('EM.songPage===2'),'retour vers une page précédente conservé')
        ok(not err,'aucune erreur de page : '+str(err))
    finally:
        await pg.context.close()

async def em_noms_motifs(nav):
    print('\n34. EM-1 : noms de motifs (v222)')
    pg, err = await nouvelle_page(nav, pont=True)
    try:
        await pg.locator('.pick[data-m=em1]').click()
        await pg.locator('#em-nom-motif').fill('Intro été')
        await pg.locator('#em-nom-motif').press('Enter')
        ok(await pg.evaluate('EM.pat.nom==="Intro été"'),'Entrée valide le nom du motif courant')
        await pg.evaluate('memEm();writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=em1]').click()
        ok(await pg.locator('#em-nom-motif').input_value()=='Intro été','nom restauré après rechargement')
        ok('Intro été' in await pg.locator('#em-motif-liste option:checked').inner_text(),'nom présent dans la liste de motifs')
        await pg.locator('#em-motif-liste').select_option('15')
        await pg.locator('#em-nom-motif').fill('Final');await pg.locator('#em-nom-motif').press('Enter')
        await pg.evaluate('writeMem()');await pg.reload();await pg.wait_for_function("document.body.classList.contains('pret')")
        await pg.locator('.pick[data-m=em1]').click()
        ok(await pg.locator('#em-motif-liste').input_value()=='15' and await pg.locator('#em-nom-motif').input_value()=='Final','sélection du motif 16 et son nom sauvegardés')
        await pg.locator('#em-motif-liste').select_option('0')
        ok(await pg.locator('#em-nom-motif').input_value()=='Intro été','retour au motif initial sans perte du nom')
        await pg.evaluate("EM.song=[EM.cur,1];EM.slots[1].nom='Break';EM.mode=2;EM.ssel=1;majTouches()")
        ok('Break' in await pg.locator('#em-song-selection').inner_text(),'nom du motif de la position Song sélectionnée')
        ok('Break' in await pg.locator('#em-song-motif option:checked').inner_text(),'nom dans la liste de la position Song')
        await pg.locator('#em-song-motif').select_option('15')
        ok(await pg.evaluate('EM.song[1]===15&&EM.cur===0'),'la liste remplace seulement la référence de la position sélectionnée')
        pg.once('dialog',lambda d:d.accept());await pg.locator('#em-song-annuler').click()
        ok(await pg.evaluate('EM.song[1]===1&&EM.cur===0'),'annulation de la référence Song')
        ok(await pg.locator('#em-nom-motif').input_value()=='Intro été','le champ reste lié au motif courant')
        await pg.evaluate('EM.mode=0;majTouches()')
        await pg.locator('#em-play').click()
        await pg.wait_for_function('document.getElementById("em-nom-motif").disabled')
        ok(await pg.locator('#em-nom-motif').is_disabled(),'renommage verrouillé pendant PLAY')
        ok(await pg.locator('#em-motif-liste').is_disabled(),'liste de motifs verrouillée pendant PLAY')
        await pg.locator('#em-stop').click()
        await pg.locator('#em-nom-motif').fill('');await pg.locator('#em-nom-motif').press('Enter')
        ok(await pg.evaluate('EM.pat.nom===""'),'effacement du nom')
        ok(not err,'aucune erreur de page : '+str(err))
    finally:
        await pg.context.close()

async def ko_plocks(nav):
    print('\n36. PO-33 K.O! : Parameter Locks, CHROMA et SWING (v228)')
    pg, err = await nouvelle_page(nav, pont=True)
    try:
        await pg.locator('.pick[data-m=ko]').click()
        await pg.evaluate('''() => {
          KO_MODE='son';KO.cur=0;KO.sel=0;KO.lockStep=2;KO.swing=0;KO.motifs[0]=motifKo();majKo();
        }''')
        await pg.locator('#ko-swing').evaluate('''e => {
          e.value='60';e.dispatchEvent(new Event('input',{bubbles:true}));
          e.dispatchEvent(new Event('change',{bubbles:true}));
        }''')
        ok(await pg.evaluate('Math.abs(KO.swing-.6)<1e-9&&Math.abs(memoire.ko.swing-.6)<1e-9'),'SWING est réglé et sauvegardé')
        ok(await pg.locator('#ko-swing-val').inner_text()=='65%','SWING affiche le rapport musical 50-75 %')
        ok(await pg.evaluate('tempsSwingKo(0,1)===1&&Math.abs(tempsSwingKo(1,1)-(1+stepDur()*.3))<1e-9'),'SWING retarde seulement le second pas de chaque paire')
        await pg.locator('#ko-lock-param').select_option('pitch')
        await pg.locator('#ko-lock-value').fill('80')
        await pg.locator('#ko-lock-apply').click()
        ok(await pg.evaluate('KO.motifs[0].plocks[2].pitch===80'),'PITCH est mémorisé sur le pas choisi')
        await pg.locator('#ko-lock-param').select_option('start')
        await pg.locator('#ko-lock-value').fill('20')
        await pg.locator('#ko-lock-apply').click()
        ok(await pg.evaluate('KO.motifs[0].plocks[2].pitch===80&&KO.motifs[0].plocks[2].start===20'),'plusieurs verrous cohabitent sur le même pas')
        await pg.locator('#ko-lock-param').select_option('pitch');await pg.locator('#ko-lock-clear').click()
        ok(await pg.evaluate('!Object.prototype.hasOwnProperty.call(KO.motifs[0].plocks[2],"pitch")&&KO.motifs[0].plocks[2].start===20'),'EFFACER retire seulement le paramètre choisi')
        await pg.evaluate('''() => { KO.sel=1;KO.chromaSource=1;KO.lockStep=4;KO.rec=false;majKo(); }''')
        await pg.locator('#ko-chroma').click()
        await pg.evaluate('KO.rec=true;majKo()')
        await pg.locator('#ko-pads .kb').nth(9).click()
        ok(await pg.evaluate('KO.chroma&&!!(KO.motifs[0].pas[1]&(1<<4))&&KO.motifs[0].notes[1][4]===2'),'CHROMA mémorise la hauteur du pas')
        await pg.locator('#ko-pads .kb').nth(9).click()
        ok(await pg.evaluate('!(KO.motifs[0].pas[1]&(1<<4))&&KO.motifs[0].notes[1][4]===null'),'retoucher la même hauteur efface le pas')
        await pg.locator('#ko-pads .kb').nth(9).click()
        await pg.evaluate('KO.rec=false;majKo()')
        await pg.locator('#ko-chroma').click()
        await pg.evaluate('KO.rec=true;KO.lockStep=4;majKo()')
        await pg.locator('#ko-pads .kb').nth(1).click();await pg.locator('#ko-pads .kb').nth(1).click()
        ok(await pg.evaluate('!!(KO.motifs[0].pas[1]&(1<<4))&&KO.motifs[0].notes[1][4]===null'),'une écriture SOUND remplace proprement une ancienne hauteur CHROMA')
        pg.once('dialog',lambda d:d.accept());await pg.locator('#ko-write').click()
        ok(await pg.evaluate('KO.motifs[0].pas.every(x=>x===0)&&KO.motifs[0].notes.every(r=>r.every(x=>x===null))'),'WRITE efface aussi les hauteurs CHROMA')
        await pg.evaluate('KO.rec=false;majKo()')
        await pg.locator('#ko-play').click();await pg.wait_for_function('S.run')
        ok(await pg.locator('#ko-lock-apply').is_disabled(),'les verrous sont protégés pendant PLAY')
        ok(not await pg.locator('#ko-swing').is_disabled(),'SWING reste réglable pendant PLAY')
        await pg.locator('#ko-play').click()
        ok(not err,'aucune erreur de page : '+str(err))
    finally:
        await pg.context.close()

async def main():
    async with async_playwright() as p:
        nav = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        for t in (chargement_et_machines, attenuation, kaoss, kaoss_resample, fichiers, midi, html_exterieur, hote, bureau, reglages, projet, projet_sauvegarde, projet_reprise, projet_stockage_illisible, confort, liens, chaine, lissage, vitesse, mc_clips, mc_lancements, mc_scenes, mc_samples, mc_looper, stk_tranches, stk_motifs, stk_chaine, stk_instrument, stk_midi, stk_edition_chaine, em_64_pas, em_song_wav, em_song_edition, em_song_64, em_noms_motifs, ko_plocks):
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
