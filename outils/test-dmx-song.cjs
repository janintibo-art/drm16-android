/* v233 — SONG de l'Oberheim DMX. Le vrai fichier page/js/520-… est exécuté
   dans une page simulée ; les clics passent par les vrais gestionnaires. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const lire = nom => fs.readFileSync(path.join(__dirname, '..', nom), 'utf8');
const copie = o => JSON.parse(JSON.stringify(o));

function element() {
  return {dataset: {}, style: {}, childNodes: [], listeners: {}, textContent: '',
    classList: {add() {}, remove() {}, toggle() {}},
    addEventListener(n, f) { this.listeners[n] = f; }, appendChild(n) { this.childNodes.push(n); },
    querySelector() { return element(); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return {top: 0, height: 100}; }, setPointerCapture() {},
    closest() { return this; }};
}
function dmx() {
  const elements = {}, frappes = [], affiches = [];
  const c = {memoire: {}, S: {modele: 'dmx', run: false, bpm: 120}, ctx: {}, cache: false,
    pasSet: 0, queue: [], step: 0, H: {inter() {}, cran() {}}, stocke: {},
    document: {getElementById(n) { return elements[n] || (elements[n] = element()); },
      createElement: element, querySelector() { return element(); }, querySelectorAll() { return []; }},
    memLire(n) { return c.stocke[n]; }, sauverMachine(n) { c.stocke[n] = copie(c.memoire[n]); },
    setTimeout() {}, clearTimeout() {}, signal() {}, audioInit() {}, maintenantAudio() { return 1; },
    stepDur() { return 0.125; }, ouvrirPas() { return 0; }, attenuerVoie() {}, mv(a, v) { return v; }};
  vm.createContext(c);
  vm.runInContext(lire('page/js/520-oberheim-dmx.js'), c);
  c.voixDmx = (t, k) => frappes.push({t, k, seq: c.DMX.cur});
  c.affDmx = s => affiches.push(s);
  const cliquer = (n, data) => {
    const cible = element(); cible.dataset = data;
    assert(elements[n] && elements[n].listeners.click, n + ' câblé dans la vraie source');
    elements[n].listeners.click.call(elements[n], {target: cible});
  };
  /* un tic de l'horloge commune, comme programmerPas */
  const tic = () => { c.scheduleDmx(c.step, c.pasSet * 0.125); c.pasSet++; };
  return {c, frappes, affiches, cmd: x => cliquer('dmx-cmd', {c: x}), num: x => cliquer('dmx-num', {n: x}), tic};
}

/* 1. SONG remplace « NOT ON DMX » ; les touches 1 à 8 construisent le song */
{
  const f = dmx(), c = f.c;
  f.cmd('g');
  assert.equal(c.DMX.songOn, true, 'SONG passe en mode song');
  assert(!f.affiches.includes('NOT ON DMX'), 'plus de NOT ON DMX sur SONG');
  f.num('1'); f.num('3'); f.num('1');
  assert.deepEqual(copie(c.DMX.song), [{seq: 0, tours: 1}, {seq: 2, tours: 1}, {seq: 0, tours: 1}]);
  assert.equal(c.DMX.chSel, 2);
  f.num('<'); f.cmd('l'); f.cmd('l');
  assert.equal(c.DMX.song[1].tours, 3, 'LENGTH règle les répétitions du pas choisi');
  f.cmd('x');
  assert.deepEqual(copie(c.DMX.song), [{seq: 0, tours: 1}, {seq: 0, tours: 1}], 'ERASE retire le pas');
  f.cmd('e');
  assert.deepEqual(copie(c.DMX.song)[1], {seq: 2, tours: 3}, 'EDIT annule le retrait');
  assert.equal(c.DMX.seqs[0].evts.length, 0, 'les séquences ne sont pas touchées');
  f.cmd('p');
  assert(f.affiches.includes('NOT ON DMX'), 'STEP reste NOT ON DMX');
  f.cmd('g');
  assert.equal(c.DMX.songOn, false, 'SONG ramène aux séquences');
  f.num('5');
  assert.equal(c.DMX.cur, 4, 'hors song, les touches choisissent la séquence');
}
/* 2. lecture : séquences de longueurs différentes, répétitions, reprise */
{
  const f = dmx(), c = f.c;
  c.DMX.seqs[0].mesures = 1; c.DMX.seqs[0].evts = [{tic: 0, k: 0, vel: 1}];     /* 16 pas */
  c.DMX.seqs[1].mesures = 2; c.DMX.seqs[1].evts = [{tic: 0, k: 3, vel: 1}];     /* 32 pas */
  f.cmd('g'); f.num('1'); f.num('2'); f.num('<'); f.cmd('l');                    /* SEQ1 x2, SEQ2 x1 */
  c.S.run = true; c.pasSet = 0;
  for (let n = 0; n < 16 * 2 + 32 + 16; n++) f.tic();
  assert.deepEqual(f.frappes.map(x => [x.k, x.seq]), [[0, 0], [0, 0], [3, 1], [0, 0]],
                   'SEQ1 deux fois, SEQ2 une fois, puis le song reprend');
  assert.deepEqual(f.frappes.map(x => x.t), [0, 16 * 0.125, 32 * 0.125, 64 * 0.125],
                   'chaque séquence garde sa propre longueur');
  assert.equal(c.queue[16].i, 0, 'le curseur repart à zéro au changement de séquence');
}
/* 3. PLAY (rang à zéro) repart du début du song ; hors song rien ne change */
{
  const f = dmx(), c = f.c;
  c.DMX.seqs[2].evts = [{tic: 0, k: 5, vel: 1}];
  f.cmd('g'); f.num('3'); f.num('3');
  c.DMX.chPos = 1; c.DMX.chI = 7; c.DMX.cur = 0;
  c.pasSet = 0; f.tic();
  assert.deepEqual(f.frappes.map(x => x.seq), [2], 'PLAY : premier pas du song');
  f.cmd('g');
  const g = dmx(); g.c.DMX.seqs[0].evts = [{tic: 24, k: 1, vel: 1}];
  g.c.step = 1; g.tic();
  assert.deepEqual(g.frappes.map(x => x.k), [1], 'hors song : le pas de l’horloge commune');
}
/* 4. mémoire : song gardé, machine rouverte en mode séquence, données abîmées ignorées */
{
  const f = dmx(), c = f.c;
  f.cmd('g'); f.num('2'); f.cmd('l'); f.num('8');
  c.memDmx();
  assert.deepEqual(c.stocke.dmx.song, [[1, 2], [7, 1]]);
  c.stocke.dmx.song.push([9, 1], 'x', [3, 5], [2.5, 1]);
  c.chargerDmx();
  assert.equal(c.DMX.songOn, false, 'rouvre en mode séquence');
  assert.deepEqual(copie(c.DMX.song), [{seq: 1, tours: 2}, {seq: 7, tours: 1}, {seq: 3, tours: 1}],
                   'pas invalides ignorés, répétitions inconnues lues comme 1');
  const vide = dmx(); vide.c.stocke.dmx = {cur: 2}; vide.c.chargerDmx();
  assert.deepEqual(copie(vide.c.DMX.song), [], 'ancienne sauvegarde sans song');
}
/* 5. song plein, retrait du pas en cours de lecture */
{
  const f = dmx(), c = f.c;
  f.cmd('g');
  for (let n = 0; n < 70; n++) f.num('1');
  assert.equal(c.DMX.song.length, 64, 'song limité à 64 pas');
  assert(f.affiches.includes('SONG FULL'));
  c.DMX.chPos = 63; c.DMX.chSel = 63; f.cmd('x');
  assert.equal(c.DMX.chPos, 0, 'la lecture reste sur un pas qui existe');
}
console.log('test-dmx-song : édition, lecture, répétitions, reprise, mémoire : OK');
