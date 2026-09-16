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
    L += ["", "Moteur seul, rien ne jouant : crête %s dBFS (bruit de démarrage des filtres, inaudible)." % f(tout.get("_moteur", {}).get("crete"))]
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
