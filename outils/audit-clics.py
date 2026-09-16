#!/usr/bin/env python3
# Audit des changements brusques (phase B4, v152).
#
# Un paramètre audio posé d'un coup (param.value = x) sur un nœud qui sonne déjà
# fait un saut dans le signal : un clic, ou un « grésillement de fermeture
# éclair » quand on tourne un potard. Ce relevé joue chaque machine, tourne
# chacun de ses potards à la molette, touche la table de mixage, puis liste
# les endroits du code qui ont posé une valeur d'un coup sur un nœud âgé de
# plus de 50 ms (un nœud neuf ne sonne pas encore : le poser est sans risque).
#
#   python3 outils/audit-clics.py [machine ...]
import asyncio, os, re, sys
from collections import Counter
from playwright.async_api import async_playwright

PAGE = "file://" + os.path.abspath("app/src/main/assets/drm16.html")
MACHINES = ("16 em1 er1 ea1 es1 emx esx mpc3000 tr909 dmx dbi vlc cr5 t1k td3 eur kp mc stk ko arcm").split()

ESPION = r"""
(function(){
  var naissance = new WeakMap(), releve = [];
  window.__sauts = releve;
  var proto = window.AudioNode && AudioNode.prototype;
  var usines = ["createGain","createBiquadFilter","createStereoPanner","createDelay","createOscillator",
                "createBufferSource","createConstantSource","createDynamicsCompressor","createWaveShaper"];
  function marquer(n, c){
    try{ Object.keys(Object.getPrototypeOf(n)).forEach(function(){}); }catch(e){}
    for(var k in n){ try{ var p = n[k]; if(p instanceof AudioParam) naissance.set(p, c.currentTime); }catch(e){} }
  }
  [window.AudioContext, window.OfflineAudioContext].forEach(function(C){
    if(!C) return;
    usines.forEach(function(u){
      var f = C.prototype[u] || BaseAudioContext.prototype[u];
      if(!f) return;
      BaseAudioContext.prototype[u] = function(){ var n = f.apply(this, arguments); marquer(n, this); return n; };
    });
  });
  var d = Object.getOwnPropertyDescriptor(AudioParam.prototype, "value");
  Object.defineProperty(AudioParam.prototype, "value", {
    get: d.get,
    set: function(v){
      var t0 = naissance.get(this);
      if(t0 !== undefined && window.ctx && ctx.currentTime - t0 > 0.05 && Math.abs(v - d.get.call(this)) > 1e-4){
        var pile = (new Error()).stack.split("\n").slice(2, 4).join(" < ");
        releve.push(pile);
      }
      d.set.call(this, v);
    }
  });
})();
"""

def lieu(pile, repere):
    # « at nom (file:///…/drm16.html:12345:67) » → fichier source et ligne
    out = []
    for m in re.finditer(r'at (\S+) \(.*?drm16\.html:(\d+):\d+\)', pile):
        out.append("%s %s" % (m.group(1), repere(int(m.group(2)))))
    return " < ".join(out) or pile[:100]

def fabriquer_repere():
    # ligne de drm16.html → fichier de page/ et ligne dans ce fichier
    lignes = []
    n = 0
    for nom in [l.strip() for l in open("page/ordre.txt", encoding="utf-8") if l.strip() and not l.startswith("#")]:
        k = open("page/" + nom, encoding="utf-8").read().count("\n")
        lignes.append((n + 1, n + k, nom)); n += k
    def repere(l):
        for a, b, nom in lignes:
            if a <= l <= b: return "%s:%d" % (nom.split("/")[-1], l - a + 1)
        return "?:%d" % l
    return repere

async def main():
    machines = sys.argv[1:] or MACHINES
    repere = fabriquer_repere()
    total = Counter()
    async with async_playwright() as p:
        nav = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        for m in machines:
            pg = await nav.new_page(viewport={"width": 1180, "height": 860})
            await pg.add_init_script(ESPION)
            await pg.goto(PAGE); await pg.wait_for_timeout(800)
            await pg.evaluate("(m) => { audioInit(); document.querySelector('.pick[data-m=\"' + m + '\"]').click(); }", m)
            await pg.wait_for_timeout(300)
            await pg.evaluate("() => { __sauts.length = 0; start(); }")
            await pg.wait_for_timeout(400)
            # chaque potard visible : quelques crans de molette
            await pg.evaluate("""() => { var l = document.querySelectorAll('.knob, [id*="-k-"]');
              l.forEach(function(k){ if(!k.getClientRects().length) return;
                for(var i=0;i<3;i++) k.dispatchEvent(new WheelEvent('wheel', {deltaY: i % 2 ? 100 : -100, bubbles: true, cancelable: true})); }); }""")
            await pg.wait_for_timeout(300)
            # la table de mixage : coupe-son, niveau, égaliseur de la voie
            await pg.evaluate("""() => { SET_VOIES.forEach(function(v){ var k = v[0]; if(!SET.bus[k]) return;
              SET.mute[k] = true; majVoieSet(k); SET.mute[k] = false; majVoieSet(k);
              SET.niv[k] = 0.5; majVoieSet(k); SET.lo[k] = 0.8; majVoieSet(k); }); }""")
            await pg.wait_for_timeout(200)
            sauts = await pg.evaluate("() => { stop(); return __sauts.slice(); }")
            c = Counter(lieu(s, repere) for s in sauts)
            total.update(c)
            print("%-8s %4d changements brusques, %d endroits" % (m, len(sauts), len(c)))
            await pg.close()
        await nav.close()
    print("\nEndroits, du plus fréquent au moins fréquent :")
    for k, n in total.most_common():
        print("%5d  %s" % (n, k))

asyncio.run(main())
