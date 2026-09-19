/* v236 — FILL et AUTO FILL des TR (808, 909, 707, RD-6). Le vrai fichier
   page/js/350-… est exécuté dans une page simulée ; les boutons passent par
   leurs vrais gestionnaires, la lecture par le vrai scheduleTr. */
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
  /* motif courant : instrument 1 sur le pas 0 ; motifs de fill 13 à 16 :
     instrument 2 (13), 3 (14), 4 (15), 5 (16) sur le pas 0 */
  const vider = p => ['A', 'B'].forEach(v => p[v].forEach(l => l.fill(0)));
  c.TR.slots.forEach(vider);
  c.TR.slots[0].A[1][0] = 1;
  [12, 13, 14, 15].forEach((s, n) => { c.TR.slots[s].A[2 + n][0] = 1; });
  c.TR.pat = c.TR.slots[0];
  c.majTr();                     /* comme activerTr : la façade écrit ses libellés */
  const cliquer = id => elements[id].listeners.click.call(elements[id], {target: element()});
  const mesures = n => { for (let x = 0; x < 16 * n; x++) { c.scheduleTr(c.pasSet, c.pasSet * 0.125); c.pasSet++; } };
  /* instrument joué sur le pas 0 de chaque mesure */
  const premiers = () => voix.filter(v => Math.abs((v.t / 0.125) % 16) < 1e-9).map(v => v.k);
  return {c, voix, elements, cliquer, mesures, premiers};
}

/* 1. sans FILL : le motif courant à chaque mesure, comme avant */
{
  const f = tr();
  f.mesures(4);
  assert.deepEqual(f.premiers(), [1, 1, 1, 1]);
}
/* 2. FILL en lecture : la mesure suivante joue le motif de fill, puis on revient */
{
  const f = tr();
  f.c.S.run = true;
  f.mesures(1);
  f.cliquer('tr8-fill');
  assert.equal(f.c.TR.fillArme, true, 'FILL demandé');
  assert(f.elements['tr8-fill'].classList.contains('on'), 'FILL éclairé dès la demande');
  f.mesures(3);
  assert.deepEqual(f.premiers(), [1, 5, 1, 1], 'une seule mesure de fill (motif 16), puis le motif courant');
}
/* 3. à l'arrêt, FILL choisit le motif de fill parmi 13 à 16 */
{
  const f = tr();
  assert.equal(f.elements['tr8-fill'].textContent, 'FILL 16');
  f.cliquer('tr8-fill');
  assert.equal(f.c.TR.fillSlot, 12);
  assert.equal(f.elements['tr8-fill'].textContent, 'FILL 13');
  assert.equal(f.c.TR.fillArme, false, 'à l’arrêt, pas de fill en attente');
  f.cliquer('tr8-fill'); f.cliquer('tr8-fill'); f.cliquer('tr8-fill');
  assert.equal(f.c.TR.fillSlot, 15, 'retour à 16 après 13, 14, 15');
  f.cliquer('tr8-fill');
  f.c.S.run = true; f.mesures(1); f.cliquer('tr8-fill'); f.mesures(2);
  assert.deepEqual(f.premiers(), [1, 2, 1], 'le motif 13 choisi sert de fill');
}
/* 4. AUTO FILL : la dernière mesure de chaque groupe */
{
  const f = tr();
  const libelles = [];
  for (let n = 0; n < 5; n++) { f.cliquer('tr8-autofill'); libelles.push(f.elements['tr8-autofill'].textContent); }
  assert.deepEqual(libelles, ['AUTO FILL 2', 'AUTO FILL 4', 'AUTO FILL 8', 'AUTO FILL 16', 'AUTO FILL OFF']);
  f.cliquer('tr8-autofill'); f.cliquer('tr8-autofill');                   /* 4 */
  f.mesures(8);
  assert.deepEqual(f.premiers(), [1, 1, 1, 5, 1, 1, 1, 5], 'AUTO FILL 4 : mesures 4 et 8');
}
/* 5. motif de fill plus court (LAST STEP 8) : il dure 8 pas, puis on revient */
{
  const f = tr();
  f.c.TR.slots[15].last = 8;
  f.c.TR.autoFill = 2;
  for (let x = 0; x < 16 + 8 + 16; x++) { f.c.scheduleTr(f.c.pasSet, f.c.pasSet * 0.125); f.c.pasSet++; }
  assert.deepEqual(f.voix.map(v => [v.k, v.t / 0.125]), [[1, 0], [5, 16], [1, 24]], 'fill de 8 pas, reprise au pas 24');
}
/* 6. START remet le compte des mesures et oublie un fill demandé */
{
  const f = tr();
  f.c.TR.autoFill = 2; f.mesures(1);
  f.c.TR.fillArme = true;
  f.c.pasSet = 0; f.mesures(2);
  assert.deepEqual(f.premiers(), [1, 1, 5], 'après START, fill à la 2e mesure, pas avant');
}
/* 7. mémoire : motif de fill et AUTO FILL gardés, valeurs abîmées ignorées */
{
  const f = tr();
  f.c.TR.fillSlot = 13; f.c.TR.autoFill = 8; f.c.memTr();
  assert.equal(f.c.stocke.tr808.fillSlot, 13);
  f.c.TR.fillSlot = 15; f.c.TR.autoFill = 0; f.c.chargerTr();
  assert.equal(f.c.TR.fillSlot, 13); assert.equal(f.c.TR.autoFill, 8);
  f.c.stocke.tr808.fillSlot = 3; f.c.stocke.tr808.autoFill = 5; f.c.chargerTr();
  assert.equal(f.c.TR.fillSlot, 15); assert.equal(f.c.TR.autoFill, 0);
  delete f.c.stocke.tr808.fillSlot; delete f.c.stocke.tr808.autoFill; f.c.chargerTr();
  assert.equal(f.c.TR.fillSlot, 15, 'ancienne sauvegarde : fill sur le motif 16, AUTO FILL OFF');
}
/* 8. rendu hors ligne : même musique, pas de curseur */
{
  const f = tr();
  f.c.cache = true; f.c.TR.autoFill = 2; f.mesures(2);
  assert.deepEqual(f.premiers(), [1, 5]);
  assert.equal(f.c.TR.file.length, 0);
}
console.log('test-tr-fill : FILL en lecture, choix du motif, AUTO FILL, longueur, START, mémoire : OK');
