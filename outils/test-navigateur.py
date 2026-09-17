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
function __garder(){ var f = {}; Object.keys(__F).forEach(function(n){ f[n] = __enc(__F[n]); });
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
  fichierOuvrir:function(n){ var j='j'+Math.random(); __J[j]={n:n,p:[],t:0,max:/\.wav$/i.test(n)?64*1048576:8*1048576}; return j; },
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
    ctx = await nav.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Edg/130")
    async def servir(route, req):
        try:
            r = coque.appeler(req.url.rsplit('/', 1)[-1], json.loads(req.post_data or '[]'))
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
        ok(await clips.count() == 4 and await pg.locator("#mc-coller").is_disabled(),
           "quatre clips accessibles et COLLER désactivé avant une copie")

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
        await clips.nth(3).click()
        await pg.locator("#mc-coller").click()
        await pads.nth(7).click()
        await pistes.nth(1).click()
        r = await pg.evaluate("""() => ({clips:MC.pistes.map(p => p.clip),
          propre:MC.pistes[2].clips[3][7] === 0 && MC.pistes[1].clips[0][7] === -1 &&
            MC.pistes[1].clips[2][7] === -1 && MC.copie.pas[7] === -1,
          selection:document.querySelector('#mc-clips').children[2].classList.contains('sel'),
          pas:document.querySelectorAll('#mc-pads > .on').length})""")
        ok(r["clips"] == [0, 2, 3, 0] and r["propre"] and r["selection"] and r["pas"] == 1,
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
          distinct:new Set(MC.pistes.flatMap(p => p.clips)).size === 16})""")
        ok(r["vide"] and r["disabled"] and r["texte"] == "AUCUNE COPIE",
           "le presse-papiers reste temporaire et COLLER se désactive au redémarrage")
        ok(r["selection"] == "true" and abs(r["profondeur"] - 0.72) < 1e-6 and r["distinct"],
           "façade restaurée et seize clips toujours indépendants")
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
            p.clips.forEach(function(c, k){ c.fill(i === 0 ? k : k * 12 + i); });
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

async def main():
    async with async_playwright() as p:
        nav = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        for t in (chargement_et_machines, attenuation, kaoss, kaoss_resample, fichiers, midi, html_exterieur, hote, bureau, reglages, projet, confort, liens, chaine, lissage, vitesse, mc_clips, mc_lancements, mc_scenes):
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
