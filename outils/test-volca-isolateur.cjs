/* v241 — isolateur BASS/TREBLE de la volca sample : au centre, la somme des
   deux bandes doit être plate. On lit le Q réellement écrit dans
   page/js/510-… et on calcule la réponse avec les formules de la Web Audio
   API, où le Q des passe-bas / passe-haut est en DÉCIBELS :
   alpha = sin(w0) / (2 · 10^(Q/20)). */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '..', 'page/js/510-korg-volca-sample.js'), 'utf8');

const corps = src.slice(src.indexOf('function sortieGeneraleVlc('), src.indexOf('function reverbVlc('));
const lp = corps.match(/f\.type = "lowpass"; f\.frequency\.value = (\d+); f\.Q\.value = ([^;]+);/);
const hp = corps.match(/f\.type = "highpass"; f\.frequency\.value = (\d+); f\.Q\.value = ([^;]+);/);
assert(lp && hp, 'filtres de l’isolateur trouvés');
const qDecl = corps.match(/var (qButterworth) = ([^;]+);/);
const Q = expr => Function('Math', (qDecl ? 'var ' + qDecl[1] + ' = ' + qDecl[2] + ';' : '') + 'return ' + expr + ';')(Math);
const qLp = Q(lp[2]), qHp = Q(hp[2]), fc = +lp[1];
assert.equal(+hp[1], fc, 'même fréquence de séparation');

/* réponse complexe d'un biquad RBJ (convention Web Audio, Q en dB) */
function biquad(type, f0, qDb, f, sr = 48000) {
  const w0 = 2 * Math.PI * f0 / sr, alpha = Math.sin(w0) / (2 * Math.pow(10, qDb / 20)), c = Math.cos(w0);
  const b = type === 'lowpass' ? [(1 - c) / 2, 1 - c, (1 - c) / 2] : [(1 + c) / 2, -(1 + c), (1 + c) / 2];
  const a = [1 + alpha, -2 * c, 1 - alpha];
  const w = 2 * Math.PI * f / sr;
  const ev = k => [k[0] + k[1] * Math.cos(-w) + k[2] * Math.cos(-2 * w), k[1] * Math.sin(-w) + k[2] * Math.sin(-2 * w)];
  const [nr, ni] = ev(b), [dr, di] = ev(a), den = dr * dr + di * di;
  return [(nr * dr + ni * di) / den, (ni * dr - nr * di) / den];
}
const mul = (x, y) => [x[0] * y[0] - x[1] * y[1], x[0] * y[1] + x[1] * y[0]];

let pire = 0;
for (const f of [50, 100, 250, 500, 700, 850, 1000, 1200, 1500, 2000, 4000, 8000, 15000]) {
  const bas = mul(biquad('lowpass', fc, qLp, f), biquad('lowpass', fc, qLp, f));
  const haut = mul(biquad('highpass', fc, qHp, f), biquad('highpass', fc, qHp, f));
  const s = [bas[0] + haut[0], bas[1] + haut[1]];
  const db = 10 * Math.log10(s[0] * s[0] + s[1] * s[1]);
  pire = Math.max(pire, Math.abs(db));
  assert(Math.abs(db) < 0.05, 'somme plate à ' + f + ' Hz : ' + db.toFixed(2) + ' dB');
}
/* l'ancien réglage (Q = 0,7071 dB) aurait échoué : le test sait voir le défaut */
{
  const bas = mul(biquad('lowpass', fc, 0.7071, fc), biquad('lowpass', fc, 0.7071, fc));
  const haut = mul(biquad('highpass', fc, 0.7071, fc), biquad('highpass', fc, 0.7071, fc));
  const s = [bas[0] + haut[0], bas[1] + haut[1]];
  assert(10 * Math.log10(s[0] * s[0] + s[1] * s[1]) > 6, 'l’ancien Q donnait plus de +6 dB à la séparation');
}
console.log('test-volca-isolateur : Q ' + qLp.toFixed(3) + ' dB, somme plate à ' + pire.toFixed(3) + ' dB près de 50 Hz à 15 kHz : OK');
