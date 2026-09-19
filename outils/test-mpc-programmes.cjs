/* v246 — programmes de pads de la MPC : 8 jeux de 64 pads, un par séquence.
   Le vrai fichier page/js/340-… est exécuté dans une page simulée ; les clics
   passent par les vrais gestionnaires. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const lire = nom => fs.readFileSync(path.join(__dirname, '..', nom), 'utf8');
const copie = o => JSON.parse(JSON.stringify(o));

function element(id) {
  return {id, dataset: {}, style: {}, childNodes: [], listeners: {}, textContent: '',
    classList: {add() {}, remove() {}, toggle() {}},
    addEventListener(n, f) { this.listeners[n] = f; }, appendChild(n) { this.childNodes.push(n); },
    querySelector() { return element(); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return {top: 0, height: 100}; }, setPointerCapture() {},
    closest() { return this; }};
}
function mpc(v = 3000) {
  const elements = {}, signaux = [];
  const c = {memoire: {}, S: {modele: 'mpc' + v, run: false, bpm: 120}, ctx: {}, step: 5,
    H: {inter() {}, cran() {}}, stocke: {}, ES: {buf: {}},
    document: {getElementById(n) { return elements[n] || (elements[n] = element(n)); },
      createElement: () => element(), querySelector() { return element(); }, querySelectorAll() { return []; }},
    memLire(n) { return c.stocke[n]; }, sauverMachine(n) { c.stocke[n] = copie(c.memoire[n]); },
    knobEm() { return {maj() {}}; }, setTimeout() {}, clearTimeout() {},
    signal(s) { signaux.push(s); }, audioInit() {}, banqueEs() {}, maintenantAudio() { return 1; },
    stepDur() { return 0.125; }, nomEch() { return ''; }, listeEch() { return []; }};
  vm.createContext(c);
  vm.runInContext(lire('page/js/340-akai-mpc3000-mpc2000.js'), c);
  c.MPC.v = v;
  const cliquer = (n, data) => {
    const cible = element(); cible.dataset = data;
    assert(elements[n] && elements[n].listeners.click, n + ' câblé dans la vraie source');
    elements[n].listeners.click.call(elements[n], {target: cible});
  };
  const taper = (...touches) => touches.forEach(t => cliquer('mpc-num', {n: t}));
  return {c, signaux, elements, cliquer, taper};
}

const ES_SRC = lire('page/js/280-electribe-es-1.js');
/* 1. 8 programmes ; la séquence 1 joue le programme 1 */
{
  const {c} = mpc();
  assert.equal(c.MPC.progs.length, 8);
  assert.equal(c.MPC.pads, c.MPC.progs[0].pads, 'MPC.pads = programme de la séquence');
  assert.notEqual(c.MPC.progs[0].pads, c.MPC.progs[1].pads, 'programmes indépendants');
}
/* 2. PROGRAM change le programme de la séquence courante ; régler un pad ne touche que lui */
{
  const f = mpc(), c = f.c;
  f.cliquer('mpc-prog', {});
  assert.equal(c.MPC.seq.prog, 1); assert.equal(c.MPC.prog, 1);
  assert.equal(c.MPC.pads, c.MPC.progs[1].pads);
  assert.equal(f.elements['mpc-prog'].textContent, 'PROGRAM 2');
  c.MPC.pads[0].ech = 'u-caisse'; c.MPC.pads[0].tune = 5;
  assert.equal(c.MPC.progs[0].pads[0].ech, 'b0', 'le programme 1 n’a pas bougé');
  for (let k = 0; k < 7; k++) f.cliquer('mpc-prog', {});
  assert.equal(c.MPC.seq.prog, 0, 'après 8, retour au programme 1');
}
/* 3. changer de séquence change de programme */
{
  const f = mpc(), c = f.c;
  c.MPC.seqs[4].prog = 3; c.MPC.progs[3].pads[2].ech = 'u-quatre';
  f.taper('5', 'ENT');
  assert.equal(c.MPC.prog, 3);
  assert.equal(c.MPC.pads[2].ech, 'u-quatre');
  f.taper('1', 'ENT');
  assert.equal(c.MPC.prog, 0);
  assert.equal(c.MPC.pads[2].ech, 'b1');
}
/* 4. la chanson bascule le programme avec la séquence */
{
  const f = mpc(), c = f.c;
  c.MPC.seqs[1].prog = 2;
  c.MPC.chanson = [{seq: 0, tours: 1}, {seq: 1, tours: 1}]; c.MPC.mode = 2; c.MPC.chPos = 0; c.MPC.chTour = 0;
  c.boucleMpc();
  assert.equal(c.MPC.seqCur, 1); assert.equal(c.MPC.prog, 2);
  assert.equal(c.MPC.pads, c.MPC.progs[2].pads);
  c.MPC.mode = 0; c.MPC.chanson = [{seq: 1, tours: 1}];
  c.MPC.mode = 2; c.reprendreChaineMpc();
  assert.equal(c.MPC.prog, 2, 'rendu du morceau : programme de la première séquence');
}
/* 5. mémoire : 8 programmes et le programme de chaque séquence */
{
  const f = mpc(), c = f.c;
  c.MPC.progs[6].pads[9].ech = 'u-sept'; c.MPC.seqs[0].prog = 6;
  c.appliquerProgMpc(); c.memMpc();
  const m = c.stocke.mpc3000;
  assert.equal(m.progs.length, 8);
  assert.deepStrictEqual(m.pads, m.progs[0].pads, 'pads = programme 1 pour les anciennes lectures');
  c.chargerMpc();
  assert.equal(c.MPC.prog, 6); assert.equal(c.MPC.pads[9].ech, 'u-sept');
  /* ancienne sauvegarde : pads seul → programme 1 ; données abîmées ignorées */
  const ancien = JSON.parse(JSON.stringify(m)); delete ancien.progs;
  ancien.pads[0].ech = 'u-ancien'; ancien.seqs[0].prog = 42;
  c.stocke.mpc3000 = ancien; c.chargerMpc();
  assert.equal(c.MPC.progs[0].pads[0].ech, 'u-ancien');
  assert.equal(c.MPC.progs[6].pads[9].ech, 'b21', 'les autres programmes repartent du kit');
  assert.equal(c.MPC.seq.prog, 0, 'programme hors bornes : le premier');
  const abime = JSON.parse(JSON.stringify(m)); abime.progs[2] = {pads: [1, 2]}; abime.progs[3] = null;
  c.stocke.mpc3000 = abime; c.chargerMpc();
  assert.equal(c.MPC.progs[2].pads.length, 64, 'programme abîmé : kit d’usine');
}
/* 6. COPY SEQ copie aussi le programme */
{
  const f = mpc(), c = f.c;
  c.renommer = (q, d, fn) => fn('9');
  c.MPC.seq.prog = 4;
  f.cliquer('mpc-cmd', {c: 'c'});
  assert.equal(c.MPC.seqs[8].prog, 4);
}
/* 7. la bibliothèque compte les sons de tous les programmes */
{
  const usages = ES_SRC.slice(ES_SRC.indexOf('["mpc3000","mpc2000"].forEach'), ES_SRC.indexOf('var v = S.modele === "vlc"'));
  const c = vm.createContext({S: {modele: 'mpc3000'}, memLire: () => null, n: 0, id: 'u-x',
    MPC: {progs: [{pads: [{ech: 'u-x'}]}, {pads: [{ech: 'u-x'}, {ech: 'b1'}]}], pads: [{ech: 'u-x'}]}});
  vm.runInContext('var n = 0, id = "u-x";' + usages + '; resultat = n;', c);
  assert.equal(c.resultat, 2, 'un usage par programme, sans compter deux fois le programme courant');
  const c2 = vm.createContext({S: {modele: 'es1'}, memLire: k => k === 'mpc3000' ? {pads: [{ech: 'u-x'}, {ech: 'u-x'}]} : null});
  vm.runInContext('var n = 0, id = "u-x";' + usages + '; resultat = n;', c2);
  assert.equal(c2.resultat, 2, 'ancienne sauvegarde sans programmes : pads comptés');
}
console.log('test-mpc-programmes : 8 programmes, un par séquence, pavé, chanson, rendu, mémoire, copie, bibliothèque : OK');
