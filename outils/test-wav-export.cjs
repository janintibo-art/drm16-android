/* v239 — format des WAV rendus : 16 bits avec dither TPDF (défaut) ou 24 bits.
   Les vraies fonctions de page/js/550-… et 650-… sont exécutées sur un tampon
   audio simulé. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const lire = nom => fs.readFileSync(path.join(__dirname, '..', nom), 'utf8');
function fonction(source, nom) {
  const m = source.match(new RegExp('\\nfunction ' + nom + '\\([^]*?\\n\\}'));
  assert(m, 'fonction réelle présente : ' + nom);
  return m[0];
}
const EXPORT = lire('page/js/550-export-audio.js');
const KORG = lire('page/js/650-transfert-exclusif-vers-une-vraie-korg.js');
const signaux = [];
const c = vm.createContext({Math, memoire: {}, signal: s => signaux.push(s)});
vm.runInContext([
  fonction(EXPORT, 'bitsExport'), fonction(EXPORT, 'octetsTrameExport'), fonction(EXPORT, 'wavStereo'),
  'var MAX_EXPORT_AUDIO = 64 * 1024 * 1024;',
  fonction(KORG, 'tailleWavStereo'), fonction(KORG, 'refusWavTropLong')
].join('\n'), c);

function tampon(g, d, sr = 44100) {
  return {length: g.length, numberOfChannels: 2, sampleRate: sr,
          getChannelData: k => Float32Array.from(k ? d : g)};
}
const lireTexte = (v, o, n) => String.fromCharCode(...Array.from({length: n}, (_, i) => v.getUint8(o + i)));
function entete(ab) {
  const v = new DataView(ab);
  return {riff: lireTexte(v, 0, 4), wave: lireTexte(v, 8, 4), taille: v.getUint32(4, true),
          canaux: v.getUint16(22, true), sr: v.getUint32(24, true), debit: v.getUint32(28, true),
          bloc: v.getUint16(32, true), bits: v.getUint16(34, true), data: v.getUint32(40, true)};
}
const lire24 = (v, o) => { let x = v.getUint8(o) | (v.getUint8(o + 1) << 8) | (v.getUint8(o + 2) << 16); return x & 0x800000 ? x - 0x1000000 : x; };

/* 1. par défaut : 16 bits, en-tête cohérent, même taille qu'avant */
{
  const ab = c.wavStereo(tampon([0, 0.5, -0.5, 1], [0, -1, 0.25, 0]));
  const e = entete(ab);
  assert.deepEqual(e, {riff: 'RIFF', wave: 'WAVE', taille: 36 + 16, canaux: 2, sr: 44100, debit: 44100 * 4,
                       bloc: 4, bits: 16, data: 16});
  assert.equal(ab.byteLength, 44 + 4 * 4);
  assert.equal(c.tailleWavStereo(1, 44100), 44 + 44100 * 4, 'taille prévue en 16 bits');
}
/* 2. 16 bits : silence exact, crêtes bornées, arrondi juste en moyenne */
{
  const n = 20000, g = new Array(n).fill(0), d = new Array(n).fill(0.3);
  g[5] = 1e-6; g[6] = 1.5; g[7] = -1.5; g[8] = NaN;
  const v = new DataView(c.wavStereo(tampon(g, d)));
  assert.equal(v.getInt16(44, true), 0, 'zéro reste zéro');
  assert.equal(v.getInt16(44 + 5 * 4, true), 0, 'sous un demi-pas : zéro, pas de souffle ajouté');
  assert(v.getInt16(44 + 6 * 4, true) >= 32766 && v.getInt16(44 + 7 * 4, true) <= -32766, 'saturation bornée');
  assert.equal(v.getInt16(44 + 8 * 4, true), 0, 'NaN : zéro');
  let s = 0, valeurs = new Set();
  for (let i = 0; i < n; i++) { const x = v.getInt16(46 + i * 4, true); s += x; valeurs.add(x); }
  const moy = s / n;
  assert(Math.abs(moy - 0.3 * 32767) < 0.05, 'moyenne juste : ' + moy);
  assert(valeurs.size >= 2 && valeurs.size <= 3, 'dither d’au plus ±1 pas : ' + [...valeurs]);
}
/* 3. le dither rend une valeur entre deux pas fidèlement ; la troncature l'aurait perdue */
{
  const n = 40000, x = 0.4 / 32767;                     /* 0,4 pas : sous le demi-pas → zéro */
  const y = 1.4 / 32767;                                 /* 1,4 pas */
  const v = new DataView(c.wavStereo(tampon(new Array(n).fill(x), new Array(n).fill(y))));
  let sg = 0, sd = 0;
  for (let i = 0; i < n; i++) { sg += v.getInt16(44 + i * 4, true); sd += v.getInt16(46 + i * 4, true); }
  assert.equal(sg, 0, '0,4 pas : silence');
  assert(Math.abs(sd / n - 1.4) < 0.03, '1,4 pas rendu en moyenne (troncature : 1) : ' + sd / n);
}
/* 4. 24 bits : en-tête, valeurs exactes, sans dither */
{
  c.memoire.wav24 = true;
  const g = [0, 0.5, -0.5, 1, -1, 1 / 8388607], d = [0.25, -0.25, 0, 2, -2, -1 / 8388607];
  const ab = c.wavStereo(tampon(g, d));
  const e = entete(ab);
  assert.deepEqual(e, {riff: 'RIFF', wave: 'WAVE', taille: 36 + 36, canaux: 2, sr: 44100, debit: 44100 * 6,
                       bloc: 6, bits: 24, data: 36});
  const v = new DataView(ab);
  const lus = g.map((_, i) => [lire24(v, 44 + i * 6), lire24(v, 47 + i * 6)]);
  assert.deepEqual(lus, [[0, 2097152], [4194304, -2097152], [-4194303, 0], [8388607, 8388607],
                         [-8388607, -8388607], [1, -1]]);
  assert.equal(c.tailleWavStereo(1, 44100), 44 + 44100 * 6, 'taille prévue en 24 bits');
}
/* 5. plafond de durée : un tiers de moins en 24 bits */
{
  c.memoire.wav24 = false;
  assert.equal(c.refusWavTropLong(300, 44100), false, '5 min en 16 bits : accepté');
  c.memoire.wav24 = true;
  assert.equal(c.refusWavTropLong(300, 44100), true, '5 min en 24 bits : refusé');
  assert.match(signaux[signaux.length - 1], /4 MIN 13 AU PLUS/);
  c.memoire.wav24 = false;
}
/* 6. format imposé : 16 ou 24, quel que soit le réglage */
{
  c.memoire.wav24 = true;
  assert.equal(entete(c.wavStereo(tampon([0], [0]), 16)).bits, 16);
  c.memoire.wav24 = false;
  assert.equal(entete(c.wavStereo(tampon([0], [0]), 24)).bits, 24);
}
console.log('test-wav-export : 16 bits + dither, silence exact, moyenne fidèle, 24 bits exact, tailles, plafond : OK');
