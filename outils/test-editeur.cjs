/* v254 — éditeur de son (page/js/634-editeur-de-son.js) : les calculs sur des
   tableaux de canaux, la pile d'annulation, le remplacement protégé et la
   mise à jour des caches du KAOSS PAD. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '..', 'page/js/634-editeur-de-son.js'), 'utf8');

function page() {
  const signaux = [], ecrits = [];
  const c = {Math, Float32Array, Date, JSON, signaux, ecrits, confirmer: true,
    window: {confirm: () => c.confirmer}, signal: s => signaux.push(s),
    ES: {buf: {}, inv: {}, noms: {}}, BIB: {noms: {}}, bibEcrire() {}, nomBib: id => c.BIB.noms[id] || id,
    sauverEch(id, b) { ecrits.push(id); return true; }, majBibUI() {}, usagesEch: () => 0,
    KP: {banques: [{ech: 'u1'}, {ech: 'b3'}], tranches: ['T0', 'T1']}, arreterBanqueKp() {},
    STK: {ondePour: 'x'}};
  vm.createContext(c);
  vm.runInContext(src, c);
  c.majEditeur = () => {}; c.edArreterEcoute = () => {};
  c.ctx = {createBuffer: (n, l, sr) => { const d = Array.from({length: n}, () => new Float32Array(l)); return {numberOfChannels: n, length: l, sampleRate: sr, getChannelData: k => d[k]}; }};
  return c;
}
const rampe = n => [Float32Array.from({length: n}, (_, i) => i / n)];
const arr = ch => Array.from(ch[0]);
const proche = (a, b, e = 1e-6) => Math.abs(a - b) < e;

/* 1. rogner, retirer, inverser */
{
  const c = page(), ch = [Float32Array.from([0, 1, 2, 3, 4, 5]), Float32Array.from([6, 7, 8, 9, 10, 11])];
  assert.deepEqual(arr(c.edRogner(ch, 2, 4)), [2, 3]);
  assert.deepEqual(Array.from(c.edRogner(ch, 2, 4)[1]), [8, 9], 'les deux canaux');
  assert.deepEqual(arr(c.edRetirer(ch, 1, 3)), [0, 3, 4, 5]);
  assert.deepEqual(arr(c.edInverser(ch, 1, 5)), [0, 4, 3, 2, 1, 5]);
  assert.deepEqual(arr(ch), [0, 1, 2, 3, 4, 5], 'l’original n’est jamais modifié');
}
/* 2. fondus, gain, normalisation */
{
  const c = page(), un = [new Float32Array(100).fill(1)];
  const e = c.edFondu(un, 0, 100, false), s = c.edFondu(un, 0, 100, true);
  assert.equal(e[0][0], 0); assert(proche(e[0][99], 1)); assert(proche(s[0][0], 1)); assert(proche(s[0][99], 0));
  assert(proche(e[0][50] ** 2 + s[0][50] ** 2, 1, 1e-3), 'puissance constante au milieu');
  const f = c.edFondu(un, 20, 40, true);
  assert.equal(f[0][10], 1); assert(proche(f[0][39], 0)); assert.equal(f[0][60], 1, 'hors sélection : intact');
  const n = c.edNormaliser([Float32Array.from([0, .25, -.5, .1])], 0, 4);
  assert(proche(Math.max(...arr(n).map(Math.abs)), Math.pow(10, -0.3 / 20)), 'crête à −0,3 dB');
  assert.equal(c.edNormaliser([new Float32Array(10)], 0, 10), null, 'silence : rien à normaliser');
  const g = c.edGain([Float32Array.from([.8, -.9, .1])], 0, 3, 2);
  assert.deepEqual(arr(g).map(x => +x.toFixed(3)), [1, -1, .2], 'borné à ±1');
}
/* 3. hauteur par rééchantillonnage */
{
  const c = page(), ch = rampe(1200);
  assert.equal(c.edHauteur(ch, 12)[0].length, 600, 'une octave plus haut : deux fois plus court');
  assert.equal(c.edHauteur(ch, -12)[0].length, 2400);
  assert.equal(c.edHauteur(ch, 7)[0].length, Math.round(1200 / Math.pow(2, 7 / 12)));
  const h = c.edHauteur(ch, 12)[0];
  assert(proche(h[100], ch[0][200], 1e-6), 'lecture deux fois plus rapide');
}
/* 4. tranches égales et sur les attaques */
{
  const c = page();
  assert.equal(JSON.stringify(c.edTranchesEgales(10, 4)), '[[0,3],[3,5],[5,8],[8,10]]');
  const sr = 8000, d = new Float32Array(sr);
  for (const t0 of [0, .25, .5, .75]) for (let i = 0; i < 400; i++) d[Math.round(t0 * sr) + i] = Math.sin(i / 3) * Math.exp(-i / 80);
  const a = Array.from(c.edAttaques([d], sr));
  assert.equal(a.length, 4, 'quatre coups, quatre attaques : ' + a);
  a.forEach((x, i) => assert(Math.abs(x - i * 2000) <= 80, 'attaque ' + i + ' à ' + x));
  const t = JSON.parse(JSON.stringify(c.edTranchesAttaques([d], sr)));
  assert.equal(t.length, 4); assert.equal(t[3][1], sr, 'la dernière tranche va jusqu’au bout');
  assert.deepEqual(Array.from(c.edAttaques([new Float32Array(800)], sr)), [], 'silence : aucune attaque');
  const x = c.edExtraire([new Float32Array(800).fill(.5)], 100, 500, sr);
  assert.equal(x[0].length, 400); assert.equal(x[0][0], 0); assert(proche(x[0][399], 0)); assert.equal(x[0][200], .5, 'fondus de 2 ms aux bords seulement');
}
/* 5. gestes, pile d'annulation, sélection */
{
  const c = page();
  c.ED = {id: 'u1', nom: 'SON', sr: 8000, ch: rampe(1000), pile: [], modifie: false, a: 100, b: 300};
  vm.runInContext('ED = this.ED', c);
  assert(c.edGeste('ROGNÉ', c.edRogner));
  vm.runInContext('this.lu = ED', c);
  assert.equal(c.lu.ch[0].length, 200); assert.equal(c.lu.a, 0); assert.equal(c.lu.b, 200, 'sélection = tout le son rogné');
  assert(c.edGeste('INVERSÉ', c.edInverser, true));
  assert(c.lu.modifie); assert.equal(c.lu.pile.length, 2);
  assert(c.edAnnuler()); assert(c.edAnnuler());
  assert.equal(c.lu.ch[0].length, 1000); assert.equal(c.lu.a, 100); assert.equal(c.lu.b, 300, 'annuler remet aussi la sélection');
  assert(!c.lu.modifie); assert(!c.edAnnuler());
  for (let i = 0; i < 20; i++) c.edGeste('GAIN', (ch, a, b) => c.edGain(ch, a, b, .9), true);
  assert.equal(c.lu.pile.length, 12, 'douze pas d’annulation au plus');
  c.lu.a = 10; c.lu.b = 11;
  assert(!c.edGeste('ROGNÉ', c.edRogner)); assert.match(c.signaux.at(-1), /TROP COURTE/);
}
/* 6. enregistrer : copie, remplacement protégé, caches du KAOSS */
{
  const c = page();
  vm.runInContext('ED = {id:"b4", nom:"CLAP", sr:8000, ch:[new Float32Array(100)], pile:[1], modifie:true, a:0, b:100}', c);
  assert(!c.edRemplacer()); assert.match(c.signaux.at(-1), /BANQUE NE SE REMPLACE PAS/);
  const id = c.edEnregistrerCopie();
  assert.match(id, /^u[0-9a-z]{8}/); assert.equal(c.BIB.noms[id], 'CLAP (ÉDITÉ)'); assert.equal(c.ES.noms[id], 'edition');
  assert.deepEqual(c.ecrits, [id]);
  vm.runInContext('this.lu = ED', c);
  assert.equal(c.lu.id, id, 'l’éditeur continue sur la copie'); assert(!c.lu.modifie);
  vm.runInContext('ED = {id:"u1", nom:"BOUCLE", sr:8000, ch:[new Float32Array(100)], pile:[1], modifie:true, a:0, b:100}', c);
  c.confirmer = false;
  assert(!c.edRemplacer(), 'refus de la confirmation : rien ne change');
  c.confirmer = true;
  assert(c.edRemplacer());
  assert.equal(c.ES.buf.u1.length, 100); assert.deepEqual(c.KP.tranches, [null, 'T1'], 'tranches KAOSS du son remplacé oubliées');
  assert.equal(c.STK.ondePour, '');
  vm.runInContext("ED.ch = [new Float32Array(8000).fill(.3)]", c);
  const ids = c.edDecouper("egales", 4);
  assert.equal(ids.length, 4); assert.equal(ids.map(i => c.BIB.noms[i]).join(), 'BOUCLE T1,BOUCLE T2,BOUCLE T3,BOUCLE T4');
  assert.equal(new Set(ids).size, 4, 'identifiants distincts même dans la même milliseconde');
}
console.log('test-editeur : rogner, retirer, inverser, fondus, gain, normaliser, hauteur, tranches, attaques, annulation, copie, remplacement, caches : OK');
