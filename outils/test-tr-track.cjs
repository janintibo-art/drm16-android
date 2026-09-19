/* v238 — TRACK des TR (808, 909, 707, RD-6) : chaîne de motifs. Le vrai
   fichier page/js/350-… est exécuté dans une page simulée ; les boutons et
   les touches de pas passent par leurs vrais gestionnaires. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const lire = nom => fs.readFileSync(path.join(__dirname, '..', nom), 'utf8');
const copie = o => JSON.parse(JSON.stringify(o));

function element(id) {
  return {id, dataset: {}, style: {}, childNodes: [], children: [], listeners: {}, textContent: '',
    innerHTML: '', childElementCount: 0, className: '',
    classList: {c: new Set(), add(x) { this.c.add(x); }, remove(x) { this.c.delete(x); },
      toggle(x, on) { if (on === undefined ? !this.c.has(x) : on) this.c.add(x); else this.c.delete(x); },
      contains(x) { return this.c.has(x); }},
    addEventListener(n, f) { this.listeners[n] = f; }, appendChild(n) { this.childNodes.push(n); return n; },
    querySelector() { return element(); }, querySelectorAll() { return []; },
    closest() { return null; }, get lastChild() { return this.childNodes[this.childNodes.length - 1] || element(); }};
}
function tr() {
  const elements = {}, voix = [];
  const c = {memoire: {}, S: {modele: 'tr808', run: false, bpm: 120, vol: 0.8}, ctx: {currentTime: 0},
    cache: false, pasSet: 0, queue: [], step: 0, maintenant: 0, H: {inter() {}, cran() {}, start() {}, stop() {}},
    stocke: {}, MIDI: {canal: 0}, master: null,
    document: {getElementById(n) { return elements[n] || (elements[n] = element(n)); },
      createElement: () => element(), querySelectorAll() { return []; },
      body: {classList: {add() {}, remove() {}}}},
    memLire(n) { return c.stocke[n]; }, sauverMachine(n) { c.stocke[n] = copie(c.memoire[n]); },
    setTimeout() {}, clearTimeout() {}, signal() {}, audioInit() {}, saveSoon() {},
    knobEm() { return {maj() {}}; }, midiNoteA() {}, ouvrirPas: () => 0, attenuerVoie() {},
    ligneVide: () => Array(16).fill(0), window: {}};
  c.maintenantAudio = () => c.maintenant;
  c.stepDur = () => 60 / c.S.bpm / 4;
  vm.createContext(c);
  vm.runInContext(lire('page/js/350-roland-tr-808-tr-909.js'), c);
  c.TR.def = c.TR_MODELES.tr808;
  c.voixTr = (t, k) => voix.push({t, k});
  c.chargerTr(); c.remettreHorlogeTr();
  /* motif n (0 à 3) : instrument n+1 sur le pas 0 en variation A,
     instrument n+5 en variation B ; motifs de fill 13 à 16 : instruments 2 à 5 */
  const vider = p => ['A', 'B'].forEach(v => p[v].forEach(l => l.fill(0)));
  c.TR.slots.forEach(vider);
  [0, 1, 2, 3].forEach(n => { c.TR.slots[n].A[n + 1][0] = 1; c.TR.slots[n].B[n + 5][0] = 1; });
  [12, 13, 14, 15].forEach((s, n) => { c.TR.slots[s].A[2 + n][0] = 1; });
  c.TR.pat = c.TR.slots[0];
  c.majTr();                     /* comme activerTr : la façade écrit ses libellés */
  const cliquer = id => elements[id].listeners.click.call(elements[id], {target: element()});
  /* touche de pas i : le gestionnaire cherche le bouton par closest() */
  const touche = i => { const b = element(); b.dataset.i = i;
    elements['tr8-pas'].listeners.click.call(elements['tr8-pas'], {target: {closest: () => b}}); };
  const mesures = n => { for (let x = 0; x < 16 * n; x++) { c.scheduleTr(c.pasSet, c.pasSet * 0.125); c.pasSet++; } };
  /* instrument joué sur le pas 0 de chaque mesure */
  const premiers = () => voix.filter(v => Math.abs((v.t / 0.125) % 16) < 1e-9).map(v => v.k);
  return {c, voix, elements, cliquer, touche, mesures, premiers};
}

/* 1. TRACK : les touches ajoutent des mesures, CLEAR retire la dernière */
{
  const f = tr(), c = f.c;
  f.cliquer('tr8-track');
  assert.equal(c.TR.trackOn, true);
  f.touche(0); f.touche(0); f.touche(2);
  c.TR.var2 = true; f.touche(1);
  assert.deepEqual(copie(c.TR.chaine), [{p: 0, b: false}, {p: 0, b: false}, {p: 2, b: false}, {p: 1, b: true}]);
  assert.equal(c.TR.slots[0].A[1].slice(1).every(x => x === 0), true, 'aucun pas écrit dans les motifs');
  f.cliquer('tr8-clear');
  assert.equal(c.TR.chaine.length, 3, 'CLEAR retire la dernière mesure');
  assert.equal(c.TR.slots[0].A[1][0], 1, 'CLEAR en TRACK ne vide aucun instrument');
}
/* 2. lecture : une mesure par entrée, variation comprise, puis la chaîne reprend */
{
  const f = tr(), c = f.c;
  f.cliquer('tr8-track');
  f.touche(0); f.touche(2); c.TR.var2 = true; f.touche(1); c.TR.var2 = false;
  c.S.run = true; f.mesures(5);
  assert.deepEqual(f.premiers(), [1, 3, 6, 1, 3], 'motifs 1, 3, 2B, puis reprise');
  assert.equal(c.TR.cur, 2, 'le motif courant suit la chaîne');
}
/* 3. motifs de longueurs différentes : chacun garde sa longueur */
{
  const f = tr(), c = f.c;
  c.TR.slots[1].last = 8;
  f.cliquer('tr8-track'); f.touche(1); f.touche(0);
  for (let x = 0; x < 8 + 16 + 8; x++) { c.scheduleTr(c.pasSet, c.pasSet * 0.125); c.pasSet++; }
  assert.deepEqual(f.voix.map(v => [v.k, v.t / 0.125]), [[2, 0], [1, 8], [2, 24]]);
}
/* 4. FILL et AUTO FILL par-dessus la chaîne */
{
  const f = tr(), c = f.c;
  f.cliquer('tr8-track'); f.touche(0); f.touche(1);
  c.TR.autoFill = 2; f.mesures(4);
  assert.deepEqual(f.premiers(), [1, 5, 1, 5], 'le fill remplace chaque 2e mesure, la chaîne avance quand même');
}
/* 5. START repart de la première mesure ; TRACK coupé : retour aux motifs */
{
  const f = tr(), c = f.c;
  f.cliquer('tr8-track'); f.touche(0); f.touche(2);
  f.mesures(1);
  c.pasSet = 0; f.mesures(1);
  assert.deepEqual(f.premiers(), [1, 1], 'après START, première mesure de la chaîne');
  f.cliquer('tr8-track');
  assert.equal(c.TR.trackOn, false);
  f.touche(3);
  assert.equal(c.TR.chaine.length, 2, 'hors TRACK, les touches ne touchent plus la chaîne');
}
/* 6. mémoire : chaîne gardée, machine rouverte hors TRACK, données abîmées */
{
  const f = tr(), c = f.c;
  f.cliquer('tr8-track'); f.touche(4); c.TR.var2 = true; f.touche(15);
  assert.deepEqual(c.stocke.tr808.chaine, [[4, 0], [15, 1]]);
  c.stocke.tr808.chaine.push([16, 0], 'x', [2.5, 1], [7, 1]);
  c.chargerTr();
  assert.equal(c.TR.trackOn, false);
  assert.deepEqual(copie(c.TR.chaine), [{p: 4, b: false}, {p: 15, b: true}, {p: 7, b: true}]);
  delete c.stocke.tr808.chaine; c.chargerTr();
  assert.deepEqual(copie(c.TR.chaine), [], 'ancienne sauvegarde : chaîne vide');
}
/* 7. chaîne limitée à 64 mesures */
{
  const f = tr(), c = f.c;
  f.cliquer('tr8-track');
  for (let n = 0; n < 70; n++) f.touche(0);
  assert.equal(c.TR.chaine.length, 64);
}
console.log('test-tr-track : ajout, retrait, lecture, variations, longueurs, fill, START, mémoire : OK');
