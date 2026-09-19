/* v237 — 99 séquences sur la MPC3000 / MPC2000, choisies au pavé par numéro
   puis ENT. Le vrai fichier page/js/340-… est exécuté dans une page simulée ;
   les clics passent par les vrais gestionnaires. */
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

/* 1. 99 séquences, noms par défaut */
{
  const {c} = mpc();
  assert.equal(c.MPC.seqs.length, 99);
  assert.equal(c.MPC.seqs[98].nom, 'SEQ 99');
  c.chargerMpc();
  assert.equal(c.MPC.seqs.length, 99, 'aussi après chargement sans sauvegarde');
}
/* 2. numéro puis ENT : on change de séquence, pas avant */
{
  const f = mpc(), c = f.c;
  f.taper('4');
  assert.equal(c.MPC.seqCur, 0, 'un chiffre seul ne change rien');
  assert.equal(c.MPC.saisie, '4');
  f.taper('2');
  assert.match(f.elements['mpc-l4'].textContent, /Seq: 42_/, 'la saisie est affichée');
  f.taper('ENT');
  assert.equal(c.MPC.seqCur, 41);
  assert.equal(c.MPC.seq, c.MPC.seqs[41]);
  assert.equal(c.MPC.saisie, '');
  assert.equal(c.step, 0, 'lecture reprise au début de la séquence');
  f.taper('7', 'ENT');
  assert.equal(c.MPC.seqCur, 6, 'un seul chiffre + ENT');
  f.taper('9', '9', 'ENT');
  assert.equal(c.MPC.seqCur, 98, 'séquence 99');
}
/* 3. saisies refusées ou effacées */
{
  const f = mpc(), c = f.c;
  f.taper('0', 'ENT');
  assert.equal(c.MPC.seqCur, 0);
  assert(f.signaux.some(s => /1 À 99/.test(s)), 'numéro invalide signalé');
  f.taper('3', '.', 'ENT');
  assert.equal(c.MPC.seqCur, 0, '« . » efface la saisie');
  f.taper('1', '2', '5', 'ENT');
  assert.equal(c.MPC.seqCur, 4, 'un troisième chiffre recommence la saisie');
  f.taper('0', '8', 'ENT');
  assert.equal(c.MPC.seqCur, 7, '« 08 » = séquence 8');
}
/* 4. mode chanson : numéro + ENT ajoute un pas */
{
  const f = mpc(), c = f.c;
  f.cliquer('mpc-cmd', {c: 's'});
  assert.equal(c.MPC.mode, 2);
  f.taper('1', '5', 'ENT'); f.taper('3', 'ENT');
  assert.deepEqual(copie(c.MPC.chanson), [{seq: 14, tours: 1}, {seq: 2, tours: 1}]);
  assert.equal(c.MPC.seqCur, 0, 'en chanson, la séquence courante ne change pas');
}
/* 5. mémoire : les 99 séquences, ancienne sauvegarde à 8, données abîmées */
{
  const f = mpc(), c = f.c;
  c.MPC.seqs[60].nom = 'REFRAIN'; c.MPC.seqs[60].pistes[0].evts = [{tic: 24, n: 3, vel: 0.8}];
  f.taper('6', '1', 'ENT');
  c.memMpc();
  assert.equal(c.stocke.mpc3000.seqs.length, 99);
  c.chargerMpc();
  assert.equal(c.MPC.seqCur, 60);
  assert.equal(c.MPC.seq.nom, 'REFRAIN');
  assert.deepEqual(copie(c.MPC.seq.pistes[0].evts), [{tic: 24, n: 3, vel: 0.8}]);

  const ancien = copie(c.stocke.mpc3000);
  ancien.seqs = ancien.seqs.slice(0, 8); ancien.seqs[7].nom = 'FIN'; ancien.seqCur = 7;
  ancien.chanson = [{seq: 7, tours: 2}, {seq: 120, tours: 1}, null];
  c.stocke.mpc3000 = ancien; c.chargerMpc();
  assert.equal(c.MPC.seqs.length, 99, 'ancienne sauvegarde à 8 : complétée à 99');
  assert.equal(c.MPC.seqs[7].nom, 'FIN');
  assert.equal(c.MPC.seqs[8].nom, 'SEQ 9');
  assert.equal(c.MPC.seqCur, 7);
  assert.deepEqual(copie(c.MPC.chanson), [{seq: 7, tours: 2}], 'pas de chanson invalides retirés');

  c.stocke.mpc3000.seqCur = 150; c.chargerMpc();
  assert.equal(c.MPC.seqCur, 0, 'séquence courante hors bornes : la première');
}
/* 6. COPY SEQ accepte 1 à 99 */
{
  const f = mpc(), c = f.c;
  c.renommer = (q, d, fn) => fn('77');
  c.MPC.seq.pistes[0].evts = [{tic: 0, n: 1, vel: 1}];
  f.cliquer('mpc-cmd', {c: 'c'});
  assert.deepEqual(copie(c.MPC.seqs[76].pistes[0].evts), [{tic: 0, n: 1, vel: 1}], 'copie vers la séquence 77');
}
/* 7. la MPC2000 a les mêmes 99 séquences, dans sa propre mémoire */
{
  const f = mpc(2000), c = f.c;
  f.taper('3', '3', 'ENT'); c.memMpc();
  assert.equal(c.stocke.mpc2000.seqCur, 32);
}
console.log('test-mpc-99 : 99 séquences, numéro + ENT, chanson, mémoire, anciennes sauvegardes, copie : OK');
