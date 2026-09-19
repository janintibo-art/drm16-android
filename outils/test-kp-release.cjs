/* v242 — FX RELEASE du KAOSS PAD. Les vraies fonctions de page/js/570-… sont
   exécutées sur des nœuds simulés : on regarde l'envoi vers l'écho et la
   réverbération, leurs retours, et la fin programmée de la queue. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '..', 'page/js/570-korg-kaoss-pad.js'), 'utf8');
function fonction(nom) {
  const m = src.match(new RegExp('\\nfunction ' + nom + '\\([^]*?\\n\\}'));
  assert(m, 'fonction réelle présente : ' + nom);
  return m[0];
}
function param(v) {
  const p = {value: v, cible: v,
    cancelScheduledValues() {}, cancelAndHoldAtTime() {},
    setTargetAtTime(x) { p.cible = x; p.value = x; }};
  return p;
}
function fixture() {
  const minuteries = [];
  const n = {ctx: null, f: {type: 'lowpass', frequency: param(20000), Q: param(0.7)}, crush: {curve: null, oversample: 'none'},
    d: {delayTime: param(0.25)}, fb: {gain: param(0)}, dmix: {gain: param(0)}, vmix: {gain: param(0)},
    ring: {frequency: param(200)}, rgain: {gain: param(1)}, rmix: {gain: param(0)}, rwet: {gain: param(0)},
    sec: {gain: param(1)}, cw: {gain: param(1)}, brut: {gain: param(0)}, denv: {gain: param(1)}, venv: {gain: param(1)},
    hache: {gain: param(1)}, lfo: {frequency: param(8)}, lprof: {gain: param(0)}, out: {gain: param(1)}};
  const ctx = {currentTime: 0};
  n.ctx = ctx;
  const c = vm.createContext({Math, ctx,
    setTimeout(f, ms) { const m = {f, ms, annulee: false}; minuteries.push(m); return m; },
    clearTimeout(m) { if (m) m.annulee = true; },
    KP: {fx: 0, x: 0.5, y: 0.5, tenu: false, touche: false, rejoue: false, prof: 0.8, muet: false,
         sources: [null, null, null, null], vitesse: 1, noeuds: n, release: false, dernierActif: null, queueTmr: null}});
  vm.runInContext([src.match(/\nvar KP_EFFETS = \[[^]*?\];/)[0], fonction('lisseKp'), fonction('vitesseKp'),
                   fonction('dureeQueueKp'), fonction('appliquerKp')].join('\n'), c);
  const jouer = (fx, x, y) => { c.KP.fx = fx; c.KP.x = x; c.KP.y = y; c.KP.touche = true; c.appliquerKp(); };
  const lever = () => { c.KP.touche = false; c.appliquerKp(); };
  return {c, n, minuteries, jouer, lever};
}
const ECHO = 2, REVERB = 6, FILTRE = 0;

/* 1. sans FX RELEASE : tout s'arrête avec le doigt, comme avant */
{
  const f = fixture();
  f.jouer(ECHO, 0.3, 0.75);
  assert(f.n.dmix.gain.value > 0 && f.n.fb.gain.value > 0, 'écho actif sous le doigt');
  f.lever();
  assert.equal(f.n.dmix.gain.value, 0); assert.equal(f.n.fb.gain.value, 0);
  assert.equal(f.minuteries.length, 0, 'aucune queue programmée');
}
/* 2. FX RELEASE, écho : envoi fermé, retours gardés, fin programmée */
{
  const f = fixture(); f.c.KP.release = true;
  f.jouer(ECHO, 0.3, 0.75);
  const fb = f.n.fb.gain.value, mix = f.n.dmix.gain.value, temps = f.n.d.delayTime.value;
  f.lever();
  assert.equal(f.n.denv.gain.value, 0, 'plus rien n’entre dans l’écho');
  assert.equal(f.n.dmix.gain.value, mix, 'le retour de l’écho reste ouvert');
  assert.equal(f.n.fb.gain.value, fb, 'les répétitions continuent');
  assert.equal(f.minuteries.length, 1);
  const attendu = temps * Math.log(0.001) / Math.log(fb) + 0.1;
  assert(Math.abs(f.minuteries[0].ms - attendu * 1000) < 1, 'fin quand l’écho tombe à −60 dB');
  f.minuteries[0].f();
  assert.equal(f.n.dmix.gain.value, 0, 'fin de queue : effet neutre');
  assert.equal(f.n.denv.gain.value, 1, 'envoi rouvert pour la prochaine fois');
  assert.equal(f.c.KP.dernierActif, null);
}
/* 3. FX RELEASE, réverbération : 2 s de queue */
{
  const f = fixture(); f.c.KP.release = true;
  f.jouer(REVERB, 0.5, 0.8);
  const mix = f.n.vmix.gain.value;
  f.lever();
  assert.equal(f.n.venv.gain.value, 0);
  assert.equal(f.n.vmix.gain.value, mix);
  assert.equal(f.minuteries[0].ms, 2000);
}
/* 4. retoucher pendant la queue : la queue est annulée, l'effet reprend */
{
  const f = fixture(); f.c.KP.release = true;
  f.jouer(ECHO, 0.3, 0.75); f.lever();
  f.jouer(ECHO, 0.6, 0.5);
  assert(f.minuteries[0].annulee, 'fin de queue annulée');
  assert.equal(f.n.denv.gain.value, 1);
  assert(Math.abs(f.n.d.delayTime.value - (0.02 + 0.6 * 0.7)) < 1e-9, 'nouveau réglage appliqué');
}
/* 5. changer d'effet pendant la queue : arrêt net */
{
  const f = fixture(); f.c.KP.release = true;
  f.jouer(ECHO, 0.3, 0.75); f.lever();
  f.c.KP.fx = FILTRE; f.c.appliquerKp();
  assert(f.minuteries[0].annulee);
  assert.equal(f.n.dmix.gain.value, 0);
  assert.equal(f.n.denv.gain.value, 1);
}
/* 6. effets sans queue : FX RELEASE ne change rien */
{
  const f = fixture(); f.c.KP.release = true;
  f.jouer(FILTRE, 0.2, 0.9); f.lever();
  assert.equal(f.minuteries.length, 0);
  assert.equal(f.n.f.frequency.value, 20000, 'filtre remis à neutre');
}
/* 7. HOLD : le doigt levé ne lance pas de queue, l'effet reste */
{
  const f = fixture(); f.c.KP.release = true; f.c.KP.tenu = true;
  f.jouer(ECHO, 0.3, 0.75); f.lever();
  assert.equal(f.minuteries.length, 0);
  assert.equal(f.n.denv.gain.value, 1);
  assert(f.n.dmix.gain.value > 0);
}
/* 8. durée de queue bornée */
{
  const f = fixture();
  assert.equal(f.c.dureeQueueKp('delai', 0.72, 0.95), 12, 'longue réinjection : 12 s au plus');
  assert.equal(f.c.dureeQueueKp('delai', 0.02, 0), 0.3, 'écho sans réinjection : 0,3 s au moins');
  assert.equal(f.c.dureeQueueKp('verb', 0.5, 0.5), 2);
}
/* 9. mémoire : FX RELEASE gardé, ancienne sauvegarde éteinte */
{
  const mem = src.slice(src.indexOf('function memKp('), src.indexOf('function chargerKp('));
  assert(/release:!!KP\.release/.test(mem), 'memKp enregistre FX RELEASE');
  const ch = fonction('chargerKp');
  assert(/KP\.release = false;[^]*if\(!m\) return;[^]*KP\.release = m\.release === true;/.test(ch),
         'chargerKp : éteint par défaut, allumé seulement par une vraie sauvegarde');
}
console.log('test-kp-release : écho et réverbération finissent de sonner, arrêt net sans RELEASE, retouche, HOLD, bornes, mémoire : OK');
