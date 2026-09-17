#!/usr/bin/env python3
"""Régression v177 : le WAV MIDI garde toutes les machines, puis le jeu reprend.

Le vrai exporteur, les vrais instruments et Chromium rendent le son. Seul le
pont Android (écriture de fichiers et sortie MIDI) est simulé. Les sons choisis
sont déterministes et assez faibles pour comparer le mélange aux voix seules.

    python3 outils/test-export-midi.py
    python3 outils/test-export-midi.py --racine /chemin/vers/une/version

Dépendance identique au test navigateur : playwright==1.56.0 et Chromium.
"""
import argparse
import asyncio
import json
import mimetypes
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

from playwright.async_api import async_playwright


PONT = r"""
window.__exports = [];
window.__sortiesMidi = [];
window.__ech = {};
window.DRM16 = {
  fichierSauver(nom, base64) {
    const octets = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    __exports.push({nom, octets});
    return '/documents/' + nom;
  },
  fichierListe() { return ''; },
  echListe() { return Object.keys(__ech).join('\n'); },
  echCharger(nom) { return __ech[nom] || ''; },
  midiDispo() { return true; },
  midiListe() { return 'Synthé du test'; },
  midiAppareils() { return 'Synthé du test\t9'; },
  midiOuvertId() { return 9; },
  midiEnvoyer(...args) { __sortiesMidi.push(args); },
  midiHorloge() {},
  midiTempo() {}
};
"""


PREPARER = r"""() => {
  audioInit(); allerMachine('mc');
  S.vol = 0.2; master.gain.value = S.vol;
  SET.on = false; MIDI.sync = false; MIDI.out = true; MIDI.ouvert = 9;
  MC.sel = 1; MC.note = 0;
  Object.assign(MC.pistes[1], {type:'synth', onde:'sine', niv:0.35, dec:0.3, cut:0.3, oct:0});
  memMc(); writeMem();
  ENR.canaux = {0:'mc', 1:'16'}; ENR.muet = {}; ENR.solo = '';
  window.__rendus = {};
  window.__ctxJeu = ctx; window.__masterJeu = master;
  window.__memoMc = JSON.stringify(memoire.mc);
  window.__mesure = function(a, debut, fin, sr) {
    let somme = 0, pic = 0, n = 0;
    for (let i = Math.floor(debut * sr); i < Math.min(a.length, Math.floor(fin * sr)); i++) {
      somme += a[i] * a[i]; pic = Math.max(pic, Math.abs(a[i])); n++;
    }
    return {rms:Math.sqrt(somme / Math.max(n, 1)), pic};
  };
}"""


RENDRE = r"""async ({nom, evts, perturber}) => {
  const avant = __exports.length, midiAvant = __sortiesMidi.length;
  ENR.prises = [{nom, machine:'mc', duree:2300, evts}];
  exporterPriseWav(0);
  let protection = null;
  if (perturber) {
    const occupe = WAVX.occupe && document.body.inert;
    const vus = JSON.stringify(ENR.vus);
    MIDI.in = true;
    window.__drmStop();
    window.__midi(0xFA, 0, 0); window.__midi(0x90, 37, 127);
    const clavier = new KeyboardEvent('keydown', {key:' ', code:'Space', bubbles:true, cancelable:true});
    document.dispatchEvent(clavier);
    protection = occupe && !S.run && JSON.stringify(ENR.vus) === vus && clavier.defaultPrevented;
  }
  const limite = performance.now() + 20000;
  while (WAVX.occupe && performance.now() < limite)
    await new Promise(r => setTimeout(r, 10));
  if (WAVX.occupe) throw new Error('Le rendu reste occupé après 20 secondes');
  if (__exports.length !== avant + 1) throw new Error('Le rendu ne produit pas exactement un fichier WAV');
  const fichier = __exports[avant], octets = fichier.octets;
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  const texte = (debut, fin) => String.fromCharCode(...octets.subarray(debut, fin));
  const sr = vue.getUint32(24, true), canaux = vue.getUint16(22, true);
  if (texte(0, 4) !== 'RIFF' || texte(8, 12) !== 'WAVE' || texte(36, 40) !== 'data' ||
      sr !== 44100 || canaux !== 2 || vue.getUint16(34, true) !== 16 ||
      vue.getUint32(40, true) !== octets.length - 44 ||
      octets.length !== 44 + Math.ceil(5.3 * sr) * 4)
    throw new Error('Le fichier exporté ne respecte pas le WAV stéréo PCM16 attendu');
  const a = new Float32Array((octets.length - 44) / 4), droite = new Float32Array(a.length);
  let picStereo = 0;
  for (let i = 0; i < a.length; i++) {
    a[i] = vue.getInt16(44 + 4 * i, true) / 32768;
    droite[i] = vue.getInt16(46 + 4 * i, true) / 32768;
    picStereo = Math.max(picStereo, Math.abs(a[i]), Math.abs(droite[i]));
  }
  __rendus[nom] = a;
  return {nom, fenetres:[0, 1, 2].map(t => __mesure(a, t + 0.04, t + 0.7, sr)),
    droite:[0, 1, 2].map(t => __mesure(droite, t + 0.04, t + 0.7, sr)),
    vivant:ctx === __ctxJeu && master === __masterJeu && !ctx.startRendering,
    machine:S.modele, memoire:JSON.stringify(memoire.mc) === __memoMc,
    midi:__sortiesMidi.length - midiAvant, picStereo, protection, interfaceActive:!document.body.inert};
}"""


COMPARER = r"""({mix, parties}) => {
  const a = __rendus[mix], refs = parties.map(n => __rendus[n]);
  let erreur = 0, energie = 0;
  for (let i = 0; i < a.length; i++) {
    const attendu = refs.reduce((v, p) => v + p[i], 0);
    erreur += (a[i] - attendu) ** 2; energie += attendu ** 2;
  }
  return Math.sqrt(erreur / Math.max(energie, 1e-20));
}"""


MESURER_JEU = r"""async secondaire => {
  await ctx.resume();
  const analyse = ctx.createAnalyser(); analyse.fftSize = 2048;
  master.connect(analyse);
  const valeurs = new Float32Array(analyse.fftSize);
  let pic = 0;
  try {
    if (secondaire) start(); else entreeNote(37, 0.75, 0);
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 20));
      analyse.getFloatTimeDomainData(valeurs);
      for (const v of valeurs) pic = Math.max(pic, Math.abs(v));
    }
    return {pic, etat:ctx.state, occupe:WAVX.occupe};
  } finally {
    if (secondaire) stop();
    master.disconnect(analyse); analyse.disconnect();
  }
}"""


async def servir(context, racine):
    assets = (racine / 'app/src/main/assets').resolve()

    async def repondre(route):
        chemin = (assets / unquote(urlsplit(route.request.url).path).lstrip('/')).resolve()
        if not chemin.is_relative_to(assets) or not chemin.is_file():
            await route.fulfill(status=404, body='')
            return
        contenu = mimetypes.guess_type(chemin.name)[0] or 'application/octet-stream'
        await route.fulfill(status=200, body=chemin.read_bytes(), content_type=contenu)

    await context.route(re.compile(r'^http://drm16\.localhost/'), repondre)


async def echantillons(page, verifier):
    print('Échantillon personnel : chargement à froid et fichiers illisibles', flush=True)
    await page.evaluate(r"""() => {
      ENR.canaux = {0:'mc', 1:'16', 2:'stk'}; ENR.muet = {}; ENR.solo = '';
      SET.solo = ''; SET.on = false; majToutesVoiesSet();
      allerMachine('stk');
      STK.pistes[0].ech = 'u-test'; STK.pistes[0].niv = 0.8;
      STK.pistes[0].tune = 0.5; STK.pistes[0].filt = 1; STK.pistes[0].dec = 1;
      memStk(); writeMem(); allerMachine('mc');
      const buf = ctx.createBuffer(1, 13230, 44100), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = 0.6 * Math.sin(2 * Math.PI * 330 * i / 44100);
      __ech['u-test'] = b64De(wavDe(buf));
      delete ES.buf['u-test'];
      window.__decodeVrai = ctx.decodeAudioData;
      window.__decodeLances = 0; window.__decodeTermines = 0;
      window.__decodeSurContexteJeu = true;
      ctx.decodeAudioData = function(ab, succes, echec) {
        const origine = this;
        __decodeLances++; __decodeSurContexteJeu = __decodeSurContexteJeu && origine === __ctxJeu;
        // Retarder uniquement le début du vrai décodeur Chromium, pour que
        // le rendu doive attendre un chargement réellement asynchrone.
        return new Promise((resolve, reject) => setTimeout(() => {
          __decodeVrai.call(origine, ab).then(buf => {
            __decodeTermines++; if (succes) succes(buf); resolve(buf);
          }, erreur => {
            __decodeTermines++; if (echec) echec(erreur); reject(erreur);
          });
        }, 50));
      };
    }""")
    try:
        rendu = await page.evaluate(RENDRE, {'nom': 'sample_personnel',
                                           'evts': [[0, 0x92, 36, 96], [1000, 0x91, 41, 96]]})
        decode = await page.evaluate("() => ({lances:__decodeLances, termines:__decodeTermines, contexte:__decodeSurContexteJeu, charge:!!ES.buf['u-test']})")
        verifier(decode == {'lances': 1, 'termines': 1, 'contexte': True, 'charge': True},
                 'le WAV personnel est décodé une fois sur le contexte de jeu avant le rendu (%s)' % decode)
        verifier(rendu['fenetres'][0]['rms'] > 0.003 and rendu['fenetres'][1]['rms'] > 0.003,
                 'STK et DRM16 sont toutes deux audibles après chargement à froid')
        verifier(rendu['vivant'] and rendu['machine'] == 'mc' and rendu['interfaceActive'],
                 'le chargement du son personnel restitue le contexte de jeu et l’interface')

        for mode in ['introuvable', 'illisible']:
            erreur = await page.evaluate(r"""async mode => {
              delete ES.buf['u-test'];
              __ech['u-test'] = mode === 'introuvable' ? '' : btoa('ceci ne contient pas un fichier audio');
              ENR.prises = [{nom:mode, machine:'stk', duree:2300,
                evts:[[0, 0x92, 36, 96], [1000, 0x91, 41, 96]]}];
              const avant = __exports.length;
              await exporterPriseWav(0);
              // L'activation STK peut avoir retenté le fichier corrompu.
              // Laisser ce vrai décodeur finir, puis vérifier qu'aucun rappel
              // tardif ne publie de WAV ou ne conserve un chargement bloqué.
              const limite = performance.now() + 2000;
              while (Object.keys(ES_CHARGES).length && performance.now() < limite)
                await new Promise(resolve => setTimeout(resolve, 10));
              return {publies:__exports.length - avant, message:document.getElementById('signal').textContent,
                occupe:WAVX.occupe, inerte:document.body.inert, modele:S.modele,
                contexte:ctx === __ctxJeu && master === __masterJeu && !ctx.startRendering,
                chargements:Object.keys(ES_CHARGES).length};
            }""", mode)
            verifier(erreur['publies'] == 0 and 'SON INTROUVABLE OU ILLISIBLE' in erreur['message'] and
                     'u-test' in erreur['message'],
                     'son %s : aucun WAV incomplet publié et erreur explicite (%s)' % (mode, erreur['message']))
            verifier(not erreur['occupe'] and not erreur['inerte'] and erreur['contexte'] and
                     erreur['modele'] == 'mc' and erreur['chargements'] == 0,
                     'son %s : contexte de jeu et interface restaurés après l’échec (%s)' % (mode, erreur))
    finally:
        await page.evaluate("() => { __ctxJeu.decodeAudioData = __decodeVrai; __ech = {}; }")


async def clavier_stk(page, verifier):
    print('SmplTrek chromatique : vrais WAV MIDI et sample sélectionné', flush=True)
    await page.evaluate(r"""() => {
      allerMachine('stk'); STK.sel=3; STK.clavierMidi=true; STK.solo=-1;
      MIDI.base=60; MIDI.canalSy=0;
      Object.assign(STK.pistes[3],{type:'instrument',ech:'u-clavier',muet:false,niv:.3,tune:.5,filt:1,dec:1,pan:0,slice:false});
      const b=ctx.createBuffer(1,17640,44100),d=b.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=.6*Math.sin(2*Math.PI*440*i/44100);
      ES.buf['u-clavier']=b;__ech['u-clavier']=b64De(wavDe(b));
      memStk();writeMem();allerMachine('mc');ENR.canaux={0:'stk'};ENR.muet={};ENR.solo='';
    }""")
    rendu=await page.evaluate(RENDRE,{'nom':'clavier_stk','evts':[[0,0x90,48,127],[1000,0x90,60,127],[2000,0x90,72,127]]})
    hz=await page.evaluate("[0,1,2].map(t=>{let n=0,a=__rendus.clavier_stk;for(let i=Math.floor((t+.08)*44100);i<Math.floor((t+.18)*44100);i++)if(a[i-1]<=0&&a[i]>0)n++;return n*10;})")
    verifier(all(abs(a-b)<25 for a,b in zip(hz,[220,440,880])),'WAV exporté : trois hauteurs mesurées %s Hz'%hz)
    verifier(all(f['rms']>.001 for f in rendu['fenetres']) and rendu['vivant'] and rendu['interfaceActive'] and rendu['midi']==0,'trois notes audibles, contexte restauré et aucune sortie MIDI matérielle pendant export')
    await page.evaluate(RENDRE,{'nom':'vel_stk','evts':[[0,0x90,60,32],[1000,0x90,60,127]]})
    ratio=await page.evaluate('__mesure(__rendus.vel_stk,.08,.18,44100).rms/__mesure(__rendus.vel_stk,1.08,1.18,44100).rms')
    verifier(abs(ratio-32/127)<.03,'vélocité continue dans le WAV : rapport %.4f'%ratio)
    erreur=await page.evaluate(r"""async () => {
      delete ES.buf['u-clavier'];__ech['u-clavier']='';
      ENR.prises=[{nom:'absent',machine:'stk',duree:2300,evts:[[0,0x90,60,127]]}];
      const n=__exports.length;await exporterPriseWav(0);
      return {n:__exports.length-n,msg:document.getElementById('signal').textContent,actif:!WAVX.occupe&&!document.body.inert};
    }""")
    verifier(erreur['n']==0 and 'u-clavier' in erreur['msg'] and erreur['actif'],'sample manquant : erreur sur la piste Instrument sélectionnée et aucun WAV incomplet')
    await page.evaluate("ENR.canaux={0:'mc',1:'16'};MIDI.base=36")


async def main(racine):
    fautes = []

    def verifier(condition, message):
        print(('  ok    ' if condition else '  FAUX  ') + message, flush=True)
        if not condition:
            fautes.append(message)

    async with async_playwright() as p:
        navigateur = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        contexte = await navigateur.new_context()
        await contexte.add_init_script(PONT)
        await servir(contexte, racine)
        page = await contexte.new_page()
        erreurs = []
        page.on('pageerror', lambda erreur: erreurs.append(str(erreur)))
        try:
            await page.goto('http://drm16.localhost/drm16.html', wait_until='load')
            await page.evaluate(PREPARER)
            # La note 37 choisit la deuxième piste (synthé) de la MC.
            mc = lambda t: [t, 0x90, 37, 96]
            # La voix spéciale DRM16 (41) contient deux oscillateurs, sans
            # bruit aléatoire : deux vrais exports peuvent être comparés.
            drm = lambda t: [t, 0x91, 41, 96]
            cas = {
                'mc_seule': [mc(0)],
                'drm_seule': [drm(1000)],
                'mc_puis_drm': [mc(0), drm(1000)],
                'mc_deux_notes': [mc(0), mc(2000)],
                'alternance': [mc(0), drm(1000), mc(2000)],
                'drm_debut': [drm(0)],
                'simultane': [mc(0), drm(0)],
                'simultane_inverse': [drm(0), mc(0)],
                'mc_reexportee': [mc(0)],
            }
            resultats = {}
            print('Export WAV MIDI : voix seules, alternées et simultanées', flush=True)
            for nom, evts in cas.items():
                resultat = await page.evaluate(RENDRE, {'nom': nom, 'evts': evts})
                resultats[nom] = resultat
                print('  mesure ' + json.dumps(resultat, ensure_ascii=False), flush=True)
                verifier(resultat['vivant'] and resultat['machine'] == 'mc' and resultat['memoire'],
                         nom + ' : contexte de jeu, machine et réglages restaurés')
                verifier(resultat['midi'] == 0, nom + ' : aucune note envoyée au matériel MIDI')
                verifier(resultat['interfaceActive'], nom + ' : interface déverrouillée après export')

            verifier(resultats['mc_seule']['fenetres'][0]['rms'] > 0.001,
                     'la référence MC contient un vrai son')
            verifier(resultats['drm_seule']['fenetres'][1]['rms'] > 0.001,
                     'la référence DRM16 contient un vrai son')
            for nom, index, reference in [('mc_puis_drm', 0, 'mc_seule'),
                                           ('mc_puis_drm', 1, 'drm_seule'),
                                           ('alternance', 0, 'mc_seule'),
                                           ('alternance', 1, 'drm_seule'),
                                           ('alternance', 2, 'mc_deux_notes')]:
                obtenu = resultats[nom]['fenetres'][index]['rms']
                attendu = resultats[reference]['fenetres'][index]['rms']
                ratio = obtenu / max(attendu, 1e-12)
                verifier(0.95 <= ratio <= 1.05,
                         f'{nom} : note à {index} s préservée (niveau relatif {ratio:.4f})')
            for mix, parties in [('mc_puis_drm', ['mc_seule', 'drm_seule']),
                                  ('alternance', ['mc_deux_notes', 'drm_seule']),
                                  ('simultane', ['mc_seule', 'drm_debut']),
                                  ('simultane_inverse', ['simultane']),
                                  ('mc_reexportee', ['mc_seule'])]:
                ecart = await page.evaluate(COMPARER, {'mix': mix, 'parties': parties})
                verifier(ecart < 0.03,
                         f'{mix} : forme d’onde conforme aux voix attendues (écart relatif {ecart:.5f})')

            print('Filtres de la prise et protection du mélange final', flush=True)
            for nom, muet, solo, reference in [('mc_coupee', {'c0': True}, '', 'drm_debut'),
                                              ('mc_solo', {}, 'c0', 'mc_seule')]:
                await page.evaluate("([muet, solo]) => { ENR.decoupe = 'canal'; ENR.muet = muet; ENR.solo = solo; }",
                                    [muet, solo])
                await page.evaluate(RENDRE, {'nom': nom, 'evts': [mc(0), drm(0)]})
                ecart = await page.evaluate(COMPARER, {'mix': nom, 'parties': [reference]})
                verifier(ecart < 0.03, f'{nom} : filtre de la prise respecté (écart relatif {ecart:.5f})')
            await page.evaluate("() => { ENR.muet = {}; ENR.solo = ''; }")
            protege = await page.evaluate(RENDRE, {'nom': 'rendu_protege', 'evts': [mc(0), drm(1000)], 'perturber': True})
            ecart = await page.evaluate(COMPARER, {'mix': 'rendu_protege', 'parties': ['mc_puis_drm']})
            verifier(protege['protection'] and protege['interfaceActive'] and ecart < 0.03,
                     'clavier, note MIDI et perte de focus Android pendant le rendu n’altèrent pas le WAV')
            await page.evaluate("() => { SET.pan.mc = -1; SET.pan.ehx = 1; }")
            stereo = await page.evaluate(RENDRE, {'nom': 'panoramique', 'evts': [mc(0), drm(1000)]})
            verifier(stereo['fenetres'][0]['rms'] > 0.001 and stereo['droite'][0]['rms'] < 0.0001 and
                     stereo['droite'][1]['rms'] > 0.001 and stereo['fenetres'][1]['rms'] < 0.0001,
                     'la panoramique de chaque machine est conservée dans le WAV stéréo')
            await page.evaluate("() => { SET.pan.mc = 0; SET.pan.ehx = 0; majToutesVoiesSet(); S.vol = 1; master.gain.value = 1; }")
            fort = await page.evaluate(RENDRE, {'nom': 'fort_volume', 'evts': [mc(0), drm(0)] * 32})
            verifier(0.3 < fort['picStereo'] <= 0.989,
                     'le mélange des deux machines reste sous −0,1 dBFS (crête %.5f)' % fort['picStereo'])
            await page.evaluate("() => { S.vol = 0.2; master.gain.value = 0.2; }")

            print('TR secondaire : variantes, réglages et son du SET après export', flush=True)
            await page.evaluate(r"""() => {
              allerMachine('tr808');
              TR.cur = 2; TR.pat = TR.slots[2]; TR.pat.last = 12; TR.pat.scale = 8;
              TR.shuffle = 0.27; TR.pat.son[1].ton = 0.28; TR.pat.son[1].dec = 0.35;
              TR.pat.A.forEach(l => l.fill(0)); TR.pat.A[1][0] = 1;
              memTr(); writeMem();
              SET.on = true; SET.actives.tr = true; SET.solo = 'tr';
              SET.lo.tr = 0.61; SET.md.tr = 0.37; SET.hi.tr = 0.58;
              majToutesVoiesSet();
              S.bpm = 97;
              allerMachine('mc');
              window.__etatTr = () => JSON.stringify({m:TR.m, cur:TR.cur, pat:TR.pat,
                shuffle:TR.shuffle, bpm:S.bpm, memoire:memoire.tr808,
                set:{on:SET.on, actives:SET.actives, solo:SET.solo, pan:SET.pan,
                     niv:SET.niv, lo:SET.lo, md:SET.md, hi:SET.hi}});
              window.__trAvant = __etatTr();
            }""")
            for modele in ['tr909', 'tr808']:
                await page.evaluate("modele => { ENR.canaux[2] = modele; }", modele)
                rendu = await page.evaluate(RENDRE, {'nom': 'variante_' + modele,
                                                     'evts': [mc(0), [1000, 0x92, 36, 96]]})
                verifier(rendu['fenetres'][1]['rms'] > 0.001,
                         modele + ' : la note de la prise produit un vrai son')
                etat = await page.evaluate("() => TR.m === 'tr808' && TR.def === TR_MODELES.tr808 && S.modele === 'mc' && __etatTr() === __trAvant")
                verifier(etat, modele + ' : TR808 secondaire, motif, tempo et égaliseur restaurés')
                try:
                    jeu_set = await page.evaluate(MESURER_JEU, True)
                    verifier(jeu_set['pic'] > 0.001 and jeu_set['etat'] == 'running' and not jeu_set['occupe'],
                             modele + ' : le SET rejoue la TR808 après export (%s)' % jeu_set)
                except Exception as erreur:
                    verifier(False, modele + ' : reprise du SET impossible (%s)' % erreur)
            await page.evaluate("() => { SET.on = false; SET.solo = ''; majToutesVoiesSet(); }")

            await echantillons(page, verifier)
            await clavier_stk(page, verifier)

            # Mesurer la vraie sortie live après les exports, pas seulement
            # l'existence de nœuds ou l'absence d'exception JavaScript.
            jeu = await page.evaluate(MESURER_JEU, False)
            verifier(jeu['pic'] > 0.001 and jeu['etat'] == 'running' and not jeu['occupe'],
                     'le jeu live produit encore du son après les exports (%s)' % jeu)
            verifier(not erreurs, 'aucune erreur JavaScript %s' % erreurs[:2])
        except Exception as erreur:
            verifier(False, '%s: %s' % (type(erreur).__name__, erreur))
        finally:
            await contexte.close()
            await navigateur.close()

    if fautes:
        print('\n%d contrôle(s) en échec.' % len(fautes), flush=True)
        return 1
    print('\nExport MIDI multimachine : tout est bon.', flush=True)
    return 0


if __name__ == '__main__':
    arguments = argparse.ArgumentParser(description=__doc__)
    arguments.add_argument('--racine', type=Path, default=Path(__file__).resolve().parents[1])
    sys.exit(asyncio.run(main(arguments.parse_args().racine)))
