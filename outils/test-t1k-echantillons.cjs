/* v259 — TR-1000 : découpe, inversion et étirement de la couche B
   (page/js/485-tr-1000-echantillons.js), sans page ni son réel. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '..', 'page/js/485-tr-1000-echantillons.js'), 'utf8');

const SR = 32000;
function tampon(d, sr = SR) {
  return {sampleRate: sr, length: d.length, duration: d.length / sr, numberOfChannels: 1, getChannelData: () => d};
}
function sinus(f, dur, sr = SR) {
  const d = new Float32Array(Math.round(dur * sr));
  for (let i = 0; i < d.length; i++) d[i] = 0.5 * Math.sin(2 * Math.PI * f * i / sr);
  return d;
}
function passages(d, a = 0, b = d.length) {
  let z = 0;
  for (let i = a + 1; i < b; i++) if (d[i - 1] < 0 && d[i] >= 0) z++;
  return z;
}
function page() {
  const c = {Math, Object, String, Float32Array, isFinite, S: {bpm: 120}, ES: {buf: {}},
    stepDur() { return 60 / c.S.bpm / 4; },
    ctx: {createBuffer(ch, n, sr) { const d = new Float32Array(n); return {sampleRate: sr, length: n, duration: n / sr,
      numberOfChannels: 1, getChannelData: () => d}; }},
    document: {getElementById() { return null; }}};
  vm.createContext(c);
  vm.runInContext(src, c);
  return c;
}

/* 1. étirement : la durée demandée, la hauteur gardée */
{
  const c = page(), d = sinus(440, 1);
  for (const f of [0.5, 1.5, 2]) {
    const r = c.etirerSonT1k(d, f);
    assert.equal(r.length, Math.round(d.length * f), 'durée × ' + f);
    const hz = passages(r, 2048, r.length - 2048) / ((r.length - 4096) / SR);
    assert(Math.abs(hz - 440) < 6, 'hauteur gardée à × ' + f + ' (' + hz.toFixed(1) + ' Hz)');
    let crete = 0; for (let i = 2048; i < r.length - 2048; i++) crete = Math.max(crete, Math.abs(r[i]));
    assert(crete > 0.4 && crete < 0.6, 'niveau gardé à × ' + f + ' (' + crete.toFixed(3) + ')');
  }
  const court = c.etirerSonT1k(new Float32Array(100).fill(0.3), 2);
  assert.equal(court.length, 200, 'un son trop court est allongé simplement');
}

/* 2. la portion, sans calcul quand rien n'est à calculer */
{
  const c = page(), b = tampon(sinus(100, 1));
  c.ES.buf.u1 = b;
  const I = {ech: 'u1', deb: 0.25, fin: 0.75, rev: false, etir: 0};
  const p = c.partieEchT1k(I);
  assert.equal(p.buf, b, 'sans inversion ni étirement, le son d’origine');
  assert(Math.abs(p.debut - 0.25) < 1e-6 && Math.abs(p.duree - 0.5) < 1e-6, 'départ et durée de la portion');
  const q = c.partieEchT1k({ech: 'u1', deb: 0.5, fin: 0.5, rev: false, etir: 0});
  assert(Math.abs(q.duree - 1) < 1e-6, 'une portion vide revient au son entier');
  assert.equal(c.partieEchT1k({ech: 'absent', deb: 0, fin: 1}), null);
}

/* 3. à l'envers, et le cache */
{
  const c = page(), d = new Float32Array(1000);
  for (let i = 0; i < d.length; i++) d[i] = i / 1000;
  c.ES.buf.u2 = tampon(d);
  const I = {ech: 'u2', deb: 0, fin: 0.5, rev: true, etir: 0};
  const p = c.partieEchT1k(I), r = p.buf.getChannelData(0);
  assert.equal(r.length, 500);
  assert(Math.abs(r[0] - 0.499) < 1e-6 && r[499] === 0, 'la portion jouée à l’envers');
  assert.equal(c.partieEchT1k(I).buf, p.buf, 'calculé une fois, gardé en cache');
  c.ES.buf.u2 = tampon(new Float32Array(1000));
  assert.notEqual(c.partieEchT1k(I).buf, p.buf, 'le son remplacé (éditeur) est recalculé');
}

/* 4. étirée sur des pas : la longueur suit le tempo */
{
  const c = page();
  c.ES.buf.u3 = tampon(sinus(220, 0.6));
  const I = {ech: 'u3', deb: 0, fin: 1, rev: false, etir: 8};
  let p = c.partieEchT1k(I);
  assert(Math.abs(p.duree - 1) < 0.001, '8 pas à 120 BPM : une seconde (' + p.duree + ')');
  c.S.bpm = 96;
  p = c.partieEchT1k(I);
  assert(Math.abs(p.duree - 1.25) < 0.001, '8 pas à 96 BPM : 1,25 s (' + p.duree + ')');
  I.etir = 32; c.S.bpm = 60;
  p = c.partieEchT1k(I);
  assert(Math.abs(p.duree - 2.4) < 0.001, 'au plus quatre fois plus long (' + p.duree + ')');
}

/* 5. découpe : les attaques, sinon des parts égales */
{
  const c = page();
  c.edTranchesAttaques = () => [[0, 100], [100, 5000], [5000, 9000], [9000, 12000]];
  c.edTranchesEgales = (n, k) => Array.from({length: k}, (_, i) => [Math.round(i * n / k), Math.round((i + 1) * n / k)]);
  c.edLongueur = ch => ch[0].length;
  const l = c.tranchesT1k([new Float32Array(12000)], SR, 10);
  assert.deepEqual(JSON.parse(JSON.stringify(l)), [[100, 5000], [5000, 9000], [9000, 12000]], 'une tranche par attaque, les miettes écartées');
  assert.equal(c.tranchesT1k([new Float32Array(12000)], SR, 2).length, 2, 'pas plus de tranches que d’instruments restants');
  c.edTranchesAttaques = () => [[0, 12000]];
  assert.equal(c.tranchesT1k([new Float32Array(12000)], SR, 10).length, 4, 'sans attaques nettes : quatre parts égales');
}
console.log('test-t1k-echantillons : étirement (durée, hauteur, niveau), portion, inversion, cache, tempo, découpe : OK');
