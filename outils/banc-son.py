#!/usr/bin/env python3
# Banc de mesure du son (phase B, v148).
#
# Pour régler les niveaux sans se fier à l'oreille ni au haut-parleur d'un
# téléphone : chaque voix de chaque machine est rendue hors ligne, SEULE, à
# pleine vélocité, et mesurée À L'ENTRÉE de la chaîne de sortie (avant le
# limiteur et l'écrêteur, qui masqueraient les vrais niveaux). Puis toutes les
# voix d'une machine ensemble, au même instant : le pire cas pour la marge.
# Enfin le motif de démonstration de la machine, s'il en a un, sur 2 mesures.
#
# Résultats : docs/mesures-son.md (lisible) et docs/mesures-son.json (pour
# comparer avant/après une correction : --comparer ancien.json).
#
#   pip install playwright==1.56.0 && python -m playwright install chromium
#   python3 outils/banc-son.py [--comparer docs/mesures-son.json] [machine ...]
import asyncio, json, math, os, sys, time
from playwright.async_api import async_playwright

PAGE = "file://" + os.path.abspath("app/src/main/assets/drm16.html")
SR = 44100

# Comment déclencher une voix : k est le numéro de voix (0 à 15 essayés).
VOIX = {
    "16": "V[CLE[k]](T, 1)", "32": "V[CLE[k]](T, 1)",
    "em1": "voixSynth(T, k, 60, 1)",
    "er1": "voixEr(T, k, 1)", "er2": "voixEr(T, k, 1)",
    "ea1": "voixEa(T, k, 48, 1, 0.3)", "ea2": "voixEa(T, k, 48, 1, 0.3)",
    "es1": "jouerEs(T, k, 1, 0)", "es2": "jouerEs(T, k, 1, 0)",
    "emx": "voixMxDrum(T, k, 1)",
    "esx": "voixSx(T, k, 1, 0)",
    "mpc3000": "jouerPad(T, k, 1)", "mpc2000": "jouerPad(T, k, 1)",
    "tr808": "voixTr(T, k, true)", "tr909": "voixTr(T, k, true)",
    "tr707": "voixTr(T, k, true)", "rd6": "voixTr(T, k, true)",
    "dmx": "voixDmx(T, k, 1)", "dbi": "voixDbi(T, k, true)",
    "vlc": "voixVlc(T, k, 0)", "cr5": "voixCr(T, CLE[k], true)",
    "t1k": "voixT1k(T, k, true)", "ko": "voixKo(T, k, 1)",
    "mc": "voixMc(T, k, 48, 1)", "stk": "voixStk(T, k, true)",
}
# Nom lisible d'une voix, quand la machine le connaît.
NOMS = {m: "TR.def.instr[k] && TR.def.instr[k].id" for m in ("tr808", "tr909", "tr707", "rd6")}
NOMS.update({"16": "CLE[k]", "32": "CLE[k]", "cr5": "CLE[k]"})

# Machines sans voix isolables : seul leur motif est mesuré.
MOTIF_SEUL = ["td3", "eur", "kp", "arcm"]

# Rendu hors ligne dans la page ; mesure faite en JavaScript (plus rapide que de
# rapatrier les échantillons). Rend null si la voix n'existe pas.
RENDU = r"""
async ([m, appel, ks, duree, motif, nomExpr]) => {
  __graine(20260916);                  /* même hasard à chaque rendu : mesures reproductibles */
  audioInit();
  var off = new OfflineAudioContext(2, Math.ceil(44100 * duree), 44100);
  ctx = off; batirAudio(); cache = true;
  master.gain.value = 1;
  master.disconnect(); master.connect(off.destination);   /* avant limiteur et écrêteur */
  allerMachine(m);
  var CLE = m === "16" || m === "32" ? Object.keys(V).filter(function(x){ return x !== "sw"; })
          : m === "cr5" ? Object.keys(CR_GROUPES) : [];
  var T = 0.05, joues = 0;
  try {
    if (motif) {
      var pas = MACHINE.longueur ? MACHINE.longueur() : 16, d = stepDur();
      for (var b = 0; b < 2; b++) {
        for (var s = 0; s < pas; s++) MACHINE.schedule(s, T + (b * pas + s) * d);
        if (MACHINE.boucle) MACHINE.boucle();
      }
      joues = 1;
    } else {
      /* plusieurs voix au même instant : comme dans un pas de séquence, avec
         l'atténuation de charge de l'application (ouvrirPas / attenuerVoie) */
      var bd0 = outBd, mix0 = outMix;
      if (ks.length > 1) {
        ouvrirPas();
        if (m === "16" || m === "32") { outBd = pasVoie(bd0); outMix = pasVoie(mix0); }   /* comme scheduleEhx */
      }
      ks.forEach(function(k){
        if ((m === "16" || m === "32" || m === "cr5") && k >= CLE.length) return;
        eval(appel); joues++;
      });
      if (ks.length > 1) attenuerVoie(m, joues, T);
      outBd = bd0; outMix = mix0;
    }
  } catch (e) { return {erreur: String(e.message || e)}; }
  if (!joues) return null;
  var r = await off.startRendering();
  var g = r.getChannelData(0), dr = r.getChannelData(1), n = g.length;
  var crete = 0, somme = 0, dc = 0, ecretes = 0, dernier = 0, debut = Math.floor(T * 44100);
  var fin300 = Math.min(n, debut + Math.floor(0.3 * 44100)), s300 = 0;
  for (var i = 0; i < n; i++) {
    var a = Math.max(Math.abs(g[i]), Math.abs(dr[i]));
    if (a > crete) crete = a;
    if (a >= 0.999) ecretes++;
    if (a > 0.001) dernier = i;
    var mo = (g[i] + dr[i]) / 2;
    somme += mo * mo; dc += mo;
    if (i >= debut && i < fin300) s300 += mo * mo;
  }
  function db(x){ return x > 0 ? 20 * Math.log10(x) : -120; }
  return {crete: db(crete), rms: db(Math.sqrt(somme / n)), rms300: db(Math.sqrt(s300 / Math.max(1, fin300 - debut))),
          dc: dc / n, ecretes: ecretes, duree: Math.max(0, (dernier - debut) / 44100),
          nom: (function(){ if(!nomExpr || ks.length !== 1) return null; var k = ks[0];
                            try { return String(eval(nomExpr)); } catch(e) { return null; } })(),
          silence: crete < 0.001};           /* sous −60 dBFS : rien d'audible */
}
"""

# La chaîne de sortie elle-même (v150) : courbe entrée → sortie, subsonique,
# pompage, et plafond absolu sur une rafale de coups à +12 dBFS.
CHAINE = r"""
async () => {
  function db(x){ return x>0 ? 20*Math.log10(x) : -120; }
  async function passe(fabriquer, duree){
    audioInit();
    var off = new OfflineAudioContext(2, Math.ceil(44100*duree), 44100);
    ctx = off; batirAudio(); master.gain.value = 1;
    fabriquer(off, master);
    var r = await off.startRendering();
    return [r.getChannelData(0), r.getChannelData(1)];
  }
  function crete(c, a, b){ var m=0; for(var i=a;i<b;i++) m=Math.max(m,Math.abs(c[0][i]),Math.abs(c[1][i])); return m; }
  function rms(c, a, b){ var s=0; for(var i=a;i<b;i++) s+=c[0][i]*c[0][i]; return Math.sqrt(s/(b-a)); }
  var R = {};
  // 1. sinus 1 kHz à différents niveaux : courbe entrée → sortie
  R.courbe = [];
  for (var lv of [-24,-12,-6,-3,0,3,6,12]) {
    var c = await passe(function(off, m){ var o=off.createOscillator(); o.frequency.value=1000; var g=off.createGain(); g.gain.value=Math.pow(10,lv/20); o.connect(g); g.connect(m); o.start(); }, 1);
    R.courbe.push([lv, db(crete(c, 22050, 44100)), db(rms(c,22050,44100)*Math.SQRT2)]);
  }
  // 2. pompage : nappe à -12 dBFS + coup de grosse caisse à +6 dBFS à 0,5 s
  var c = await passe(function(off, m){
    var o=off.createOscillator(); o.frequency.value=440; var g=off.createGain(); g.gain.value=Math.pow(10,-12/20); o.connect(g); g.connect(m); o.start();
    var k=off.createOscillator(); k.frequency.setValueAtTime(90,0.5); var gk=off.createGain();
    gk.gain.setValueAtTime(0,0); gk.gain.setValueAtTime(2,0.5); gk.gain.exponentialRampToValueAtTime(0.001,0.8); k.connect(gk); gk.connect(m); k.start(0.5); k.stop(0.85);
  }, 2);
  var avant = rms(c, 0.2*44100, 0.45*44100);
  var creux = 1;
  for (var t=0.9; t<1.6; t+=0.02){ creux = Math.min(creux, rms(c, Math.floor(t*44100), Math.floor((t+0.02)*44100)) / avant); }
  var retour = null;
  for (var t=0.85; t<1.9; t+=0.01){ if (rms(c, Math.floor(t*44100), Math.floor((t+0.01)*44100))/avant > 0.94){ retour = t-0.85; break; } }
  R.pompage = {creux_db: db(creux), retour_ms: retour===null ? null : Math.round(retour*1000), crete_coup: db(crete(c, 0.5*44100, 0.9*44100))};
  // 3. subsonique : 15 Hz et 40 Hz à -6 dBFS
  R.grave = [];
  for (var f of [10, 15, 22, 30, 50, 100]) {
    var c = await passe(function(off, m){ var o=off.createOscillator(); o.frequency.value=f; var g=off.createGain(); g.gain.value=0.1; o.connect(g); g.connect(m); o.start(); }, 2);
    R.grave.push([f, db(rms(c, 44100, 88200)*Math.SQRT2)]);
  }
  // 4. rafale de coups à +12 dBFS : plafond absolu
  var c = await passe(function(off, m){
    for (var i=0;i<8;i++){ var n=off.createOscillator(); n.type='square'; n.frequency.value=120+i*37; var g=off.createGain();
      g.gain.setValueAtTime(4, 0.1+i*0.05); g.gain.exponentialRampToValueAtTime(0.001, 0.4+i*0.05); n.connect(g); g.connect(m); n.start(0.1+i*0.05); n.stop(0.5+i*0.05);} }, 1);
  R.plafond = db(crete(c, 0, 44100));
  return R;
}
"""

# Repliement (v153) : part d'énergie qui n'est PAS sur les harmoniques de la
# note — des oscillateurs de l'API, puis d'une saturation forte selon son
# suréchantillonnage. Fréquences choisies pour tomber juste sur la fenêtre.
REPLIEMENT = r"""
async () => {
  async function mesure(fab, f){
    var sr = 44100, off = new OfflineAudioContext(1, sr, sr);
    var src = fab(off, f), g = off.createGain(); g.gain.value = 0.5; src.connect(g); g.connect(off.destination);
    var d = (await off.startRendering()).getChannelData(0).subarray(4410), tot = 0;
    for (var i = 0; i < d.length; i++) tot += d[i] * d[i];
    tot /= d.length;
    function p(fr){ var re = 0, im = 0; for (var i = 0; i < d.length; i++){ var a = 2 * Math.PI * fr * i / sr; re += d[i] * Math.cos(a); im += d[i] * Math.sin(a); }
      var A = 2 * Math.hypot(re, im) / d.length; return A * A / 2; }
    var h = 0; for (var k = 1; k * f < sr / 2; k++) h += p(k * f);
    return 10 * Math.log10(Math.max(tot - h, 1e-12) / tot);
  }
  var R = {osc: [], sat: []};
  for (var t of ["sawtooth", "square", "triangle"]) for (var f of [440, 1760])
    R.osc.push([t, f, await mesure(function(off, f){ var o = off.createOscillator(); o.type = t; o.frequency.value = f; o.start(); return o; }, f)]);
  for (var os of ["none", "2x", "4x"]) for (var f of [440, 1760])
    R.sat.push([os, f, await mesure(function(off, f){ var o = off.createOscillator(); o.frequency.value = f; o.start();
      var w = off.createWaveShaper(), c = new Float32Array(1025);
      for (var i = 0; i < 1025; i++){ var x = i * 2 / 1024 - 1; c[i] = Math.tanh(x * 20) / Math.tanh(20); }
      w.curve = c; w.oversample = os; o.connect(w); return w; }, f)]);
  return R;
}
"""

# Échantillon lu vite (v155) : tampon à 32 kHz contenant 4 kHz (utile) et
# 12 kHz (qui, lu deux fois plus vite, dépasse la limite et se replie à 20,1 kHz),
# lu tel quel puis par poserTampon.
VITESSE = r"""
async () => {
  audioInit();
  var R = [];
  for (var r of [2, 3]) for (var filtre of [false, true]) {
    var off = new OfflineAudioContext(1, 44100, 44100);
    var b = off.createBuffer(1, 32000 * 2, 32000), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = 0.3 * Math.sin(2 * Math.PI * 4000 * i / 32000) + 0.3 * Math.sin(2 * Math.PI * 12000 * i / 32000);
    var vrai = ctx; ctx = off;
    var s = off.createBufferSource(); s.playbackRate.value = r;
    if (filtre) poserTampon(s, b, r); else s.buffer = b;
    ctx = vrai;
    s.connect(off.destination); s.start();
    var o = (await off.startRendering()).getChannelData(0).subarray(2205, 2205 + 8820);
    function amp(f){ var re = 0, im = 0; for (var i = 0; i < o.length; i++){ var a = 2 * Math.PI * f * i / 44100; re += o[i] * Math.cos(a); im += o[i] * Math.sin(a); }
      return 20 * Math.log10(Math.max(1e-9, 2 * Math.hypot(re, im) / o.length) / 0.3); }
    var utile = 4000 * r, replie = Math.abs(44100 - 12000 * r * 44100 / 44100);
    replie = 12000 * r > 22050 ? 44100 - 12000 * r : null;
    R.push({vitesse: r, filtre: filtre, utile: amp(utile), replie: replie ? amp(replie) : null, f_replie: replie});
  }
  return R;
}
"""

async def mesurer(nav, m):
    res = {"voix": [], "ensemble": None, "motif": None, "erreurs": []}
    # une seule page par machine : chaque rendu refait son propre contexte hors ligne
    pg = await nav.new_page()
    # hasard à graine fixe (bruits, variations) : deux passages donnent les mêmes chiffres
    await pg.add_init_script("""
      window.__graine = function(g){ var a = g >>> 0;
        Math.random = function(){ a = (a + 0x6D2B79F5) >>> 0; var t = a;
          t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
      __graine(1);""")
    err = []
    pg.on("pageerror", lambda e: err.append(str(e)))
    await pg.goto(PAGE)
    await pg.wait_for_timeout(700)
    async def rendre(appel, ks, duree, motif=False):
        try:
            r = await pg.evaluate(RENDU, [m, appel, ks, duree, motif, NOMS.get(m)])
        except Exception as e:
            r = {"erreur": str(e).splitlines()[0][:120]}
        while err:
            res["erreurs"].append(err.pop(0)[:120])
        return r
    if m in VOIX:
        for k in range(16):
            r = await rendre(VOIX[m], [k], 2.5)
            if r is None or (isinstance(r, dict) and r.get("erreur")) or r["silence"]:
                continue
            r["k"] = k
            res["voix"].append(r)
        if res["voix"]:
            res["ensemble"] = await rendre(VOIX[m], [v["k"] for v in res["voix"]], 2.5)
    # le motif : durée = 2 mesures + 2 s de queue
    try:
        duree = await pg.evaluate("(m) => { audioInit(); allerMachine(m); return 2 * (MACHINE.longueur ? MACHINE.longueur() : 16) * stepDur() + 2.1; }", m)
    except Exception:
        duree = 10
    r = await rendre("", [], min(duree, 30), True)
    if r and not r.get("erreur") and not r["silence"]:
        res["motif"] = r
    elif r and r.get("erreur"):
        res["erreurs"].append("motif : " + r["erreur"])
    await pg.close()
    return res

def f(x):
    return "—" if x is None else ("%+.1f" % x)

def rapport(tout, ancien):
    L = ["# Mesures du son", "",
         "Produit par `outils/banc-son.py` le %s. Niveaux en **dBFS**, mesurés **à l'entrée de la chaîne de sortie**" % time.strftime("%d/%m/%Y"),
         "(avant la compensation, le limiteur et l'écrêteur ; volume général à 1). **Toutes ensemble** : toutes les voix dans un",
         "même pas, avec l'atténuation de charge de l'application. **Crête** : maximum atteint ; **attaque** : niveau efficace",
         "des 300 premières ms ; **écrêtés** : échantillons à pleine échelle ; **Δ** : écart avec la mesure précédente.", "",
         "Cible (v149) : la voix la plus forte de chaque machine à **−8 dBFS** ; la compensation de sortie (+2,5 dB) rend le volume d'avant.", "",
         "## Vue d'ensemble", "",
         "| Machine | Voix | Crête la plus haute | Crête la plus basse | Écart | Toutes ensemble | Motif (crête / efficace) |",
         "|---|---|---|---|---|---|---|"]
    for m, r in tout.items():
        if m.startswith("_"):
            continue
        v = r["voix"]
        hi = max((x["crete"] for x in v), default=None)
        lo = min((x["crete"] for x in v), default=None)
        ens = r["ensemble"]["crete"] if r["ensemble"] and "crete" in r["ensemble"] else None
        mo = r["motif"]
        alerte = " ⚠" if ens is not None and ens > 0 else ""
        L.append("| %s | %d | %s | %s | %s | %s%s | %s |" % (
            m, len(v), f(hi), f(lo), "—" if hi is None else "%.1f dB" % (hi - lo), f(ens), alerte,
            "vide" if not mo else "%s / %s" % (f(mo["crete"]), f(mo["rms"]))))
    ch = tout.get("_chaine")
    if ch:
        L += ["", "## Chaîne de sortie", "",
              "Sinus 1 kHz à l'entrée de la chaîne (après le volume général) → crête en sortie :", "",
              "| Entrée | " + " | ".join("%+d" % a for a, _, _ in ch["courbe"]) + " |",
              "|---|" + "---|" * len(ch["courbe"]),
              "| Sortie | " + " | ".join("%+.2f" % b for _, b, _ in ch["courbe"]) + " |", ""]
        g = dict((a, b) for a, b in ch["grave"])
        L += ["Grave, relatif à 100 Hz : " + " · ".join("%d Hz %+.1f dB" % (a, g[a] - g[100]) for a in sorted(g)) + ".", "",
              "Plafond absolu (rafale de coups à +12 dBFS) : **%+.2f dBFS**. Nappe à −12 dBFS après un coup à +6 dBFS : creux de %.2f dB." %
              (ch["plafond"], ch["pompage"]["creux_db"])]
    rp = tout.get("_repliement")
    if rp:
        L += ["", "## Repliement", "",
              "Part d'énergie hors des harmoniques de la note (plus c'est bas, mieux c'est).", "",
              "| Source | 440 Hz | 1 760 Hz |", "|---|---|---|"]
        for tab, nom in (("osc", "oscillateur %s"), ("sat", "saturation forte, suréchantillonnage %s")):
            vus = []
            for a, _, _ in rp[tab]:
                if a in vus: continue
                vus.append(a)
                v = dict((f, x) for b, f, x in rp[tab] if b == a)
                L.append("| %s | %.0f dB | %.0f dB |" % (nom % a, v[440], v[1760]))
    vt = tout.get("_vitesse")
    if vt:
        L += ["", "## Échantillon lu vite", "",
              "Tampon à 32 kHz : 4 kHz (à garder) et 12 kHz (qui dépasse la limite une fois accéléré et revient en sifflement).", "",
              "| Vitesse | Tampon | 4 kHz accéléré | 12 kHz replié |", "|---|---|---|---|"]
        for x in vt:
            L.append("| %g | %s | %+.1f dB | %s |" % (x["vitesse"], "filtré (poserTampon)" if x["filtre"] else "tel quel",
                     x["utile"], "—" if x["replie"] is None else "%+.1f dB à %d Hz" % (x["replie"], x["f_replie"])))
    L += ["", "Moteur seul, rien ne jouant : crête %s dBFS (−120 = silence parfait ; −65,7 avant la v152, décalage de l'écrêteur)." % f(tout.get("_moteur", {}).get("crete"))]
    L += ["", "## Détail par voix", ""]
    for m, r in tout.items():
        if m.startswith("_") or not r["voix"]:
            continue
        L += ["### " + m, "", "| Voix | Crête | Attaque | Durée | Écrêtés | Δ crête |", "|---|---|---|---|---|---|"]
        prec = {str(x["k"]): x for x in (ancien.get(m, {}).get("voix", []) if ancien else [])}
        for x in r["voix"]:
            p = prec.get(str(x["k"]))
            L.append("| %s | %s | %s | %.2f s | %d | %s |" % (
                x["nom"] or x["k"], f(x["crete"]), f(x["rms300"]), x["duree"], x["ecretes"],
                "—" if not p else "%+.1f" % (x["crete"] - p["crete"])))
        if r["erreurs"]:
            L.append("")
            L.append("Erreurs : " + " · ".join(r["erreurs"][:3]))
        L.append("")
    return "\n".join(L) + "\n"

async def main():
    args = sys.argv[1:]
    ancien = None
    if "--comparer" in args:
        i = args.index("--comparer")
        ancien = json.load(open(args[i + 1], encoding="utf-8"))
        del args[i:i + 2]
    machines = args or (list(VOIX) + MOTIF_SEUL)
    tout = {}
    async with async_playwright() as p:
        nav = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        for m in machines:
            t0 = time.time()
            tout[m] = await mesurer(nav, m)
            r = tout[m]
            print("%-8s %2d voix  motif:%s  %.0f s" % (m, len(r["voix"]), "oui" if r["motif"] else "non", time.time() - t0))
        # la chaîne de sortie
        pg = await nav.new_page()
        await pg.add_init_script("Math.random = (function(){ var a = 7; return function(){ a = (a * 16807) % 2147483647; return a / 2147483647; }; })();")
        await pg.goto(PAGE); await pg.wait_for_timeout(700)
        tout["_chaine"] = await pg.evaluate(CHAINE)
        tout["_repliement"] = await pg.evaluate(REPLIEMENT)
        tout["_vitesse"] = await pg.evaluate(VITESSE)
        await pg.close()
        # référence : le moteur seul, sans aucune machine qui joue
        pg = await nav.new_page()
        await pg.goto(PAGE); await pg.wait_for_timeout(700)
        tout["_moteur"] = await pg.evaluate("""async () => { audioInit(); var off = new OfflineAudioContext(2, 88200, 44100);
          ctx = off; batirAudio(); master.disconnect(); master.connect(off.destination);
          var r = await off.startRendering(), c = 0;
          for (var k = 0; k < 2; k++) { var d = r.getChannelData(k); for (var i = 0; i < d.length; i++) c = Math.max(c, Math.abs(d[i])); }
          return {crete: c > 0 ? 20 * Math.log10(c) : -120}; }""")
        await pg.close()
        await nav.close()
    os.makedirs("docs", exist_ok=True)
    json.dump(tout, open("docs/mesures-son.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    open("docs/mesures-son.md", "w", encoding="utf-8").write(rapport(tout, ancien))
    print("écrit : docs/mesures-son.md et docs/mesures-son.json")

asyncio.run(main())
