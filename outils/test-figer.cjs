/* v255 — figer une machine et rééchantillonner (page/js/636-…) : les
   traitements des rendus, sur des tableaux de canaux. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '..', 'page/js/636-figer-et-reechantillonner.js'), 'utf8');
const c = {Math, Float32Array, Object, document: {getElementById: () => null}};
vm.createContext(c);
vm.runInContext(src, c);
const proche = (a, b, e = 1e-6) => Math.abs(a - b) < e;

/* 1. rogner une voix : départ exact, fin à −60 dBFS, 10 ms de fondu */
{
  const sr = 1000, d = new Float32Array(3000);
  for (let i = 20; i < 1500; i++) d[i] = 0.5 * Math.exp(-(i - 20) / 100);
  const r = c.figerRogner([d, d], sr, 0.02);
  assert.equal(r.length, 2);
  assert.equal(r[0][0], 0.5, 'la voix commence à son départ');
  const fin = Math.ceil(100 * Math.log(1000)) + 1 + 10;
  assert(Math.abs(r[0].length - fin) <= 2, 'fin à −60 dB sous la crête, plus 10 ms : ' + r[0].length + ' / ' + fin);
  const faible = new Float32Array(3000);
  for (let i = 20; i < 3000; i++) faible[i] = 0.02 * Math.exp(-(i - 20) / 100);
  assert(Math.abs(c.figerRogner([faible], sr, 0.02)[0].length - fin) <= 2, 'une voix faible garde toute sa queue');
  assert.equal(r[0][r[0].length - 1], 0, 'fondu jusqu’à zéro');
  assert.equal(c.figerRogner([new Float32Array(3000)], sr, 0.02), null, 'une voix muette n’est pas gardée');
  const tard = new Float32Array(3000); tard[2500] = 0.1;
  assert.equal(c.figerRogner([tard], sr, 0.02)[0].length, 2500 - 20 + 1 + 10);
  assert.equal(c.nomCourtMachine('es1'), 'ES-1'); assert.equal(c.nomCourtMachine('tr909'), 'TR-909'); assert.equal(c.nomCourtMachine('zz'), 'ZZ');
}
/* 2. mono si les deux canaux sont identiques */
{
  const a = Float32Array.from([0, .1, .2]), b = Float32Array.from([0, .1, .2]), d = Float32Array.from([0, .1, .3]);
  assert.equal(c.figerMono([a, b]).length, 1);
  assert.equal(c.figerMono([a, d]).length, 2);
  assert.equal(c.figerMono([a]).length, 1);
}
/* 3. le kit normalisé d'un bloc : l'équilibre reste */
{
  const v = [{ch: [Float32Array.from([.2, -.4])]}, {ch: [Float32Array.from([.1])]}];
  const g = c.figerNormaliser(v);
  assert(proche(Math.abs(v[0].ch[0][1]), Math.pow(10, -1 / 20)), 'crête la plus forte à −1 dB');
  assert(proche(v[1].ch[0][0] / v[0].ch[0][1], .1 / -.4), 'rapport entre voix gardé');
  assert(proche(g, Math.pow(10, -1 / 20) / .4));
  assert.equal(c.figerNormaliser([{ch: [new Float32Array(4)]}]), 1, 'silence : rien à faire');
}
/* 4. boucle : longueur musicale exacte, queue repliée sur le début */
{
  const sr = 100, d = new Float32Array(400);
  d[5] = .5;                   /* premier temps, au départ du rendu (t0 = 0,05 s) */
  d[5 + 200] = .3;              /* au-delà de deux secondes : la queue */
  d[5 + 250] = .2;
  const r = c.reechBoucle([d], sr, 0.05, 2);
  assert.equal(r[0].length, 200, 'deux secondes exactement');
  assert(proche(r[0][0], .5 + .3), 'la queue retombe sur le début de la boucle');
  assert(proche(r[0][50], .2));
  const plein = new Float32Array(400).fill(.8);
  assert.equal(Math.max(...c.reechBoucle([plein], sr, 0.05, 2)[0]), 1, 'borné à 1');
  assert.equal(c.reechBoucle([new Float32Array(10)], sr, 0, 2)[0].length, 200, 'rendu plus court : complété de silence');
}
/* 5. machines prises en charge */
{
  for (const m of ['16', '32', 'em1', 'er1', 'er2', 'ea1', 'ea2', 'emx', 'tr808', 'tr909', 'tr707', 'rd6', 'dmx', 'dbi', 'cr5', 't1k'])
    assert(c.peutFiger(m), m);
  for (const m of ['es1', 'mpc3000', 'vlc', 'kp', 'stk', 'ko', 'mc', 'arcm', 'clesEhx', 'clesCr', 'x'])
    assert(!c.peutFiger(m), m + ' : joue déjà des échantillons, ou n’est pas une machine');
}
/* 6. les accents ne sont pas des sons */
{
  vm.runInContext('var TR = {def:{instr:[{id:"AC"},{id:"BD"}]}}; var EM_PARTS = [{nom:"BD"},{nom:"ACC", accent:true}]; var ER_PARTS = [{t:"perc", n:"1"},{t:"accent", n:"Acc"}];', c);
  for (const m of ['tr808', 'tr909', 'tr707', 'rd6']) { assert(c.FIGER[m].saute(0), m); assert(!c.FIGER[m].saute(1)); }
  assert(c.FIGER.em1.saute(1) && !c.FIGER.em1.saute(0)); assert(c.FIGER.er1.saute(1) && c.FIGER.er2.saute(1) && !c.FIGER.er2.saute(0));
}
console.log('test-figer : rogner une voix, mono, kit normalisé d’un bloc, boucle repliée, machines : OK');
