/* v231 — SCALE de la TR (808, 909, 707, RD-6) : la durée d'un pas change
   vraiment. On exécute les VRAIES fonctions de page/js/350-… dans un contexte
   simulé : horloge commune en doubles croches, un appel à scheduleTr par tic. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'page/js/350-roland-tr-808-tr-909.js'), 'utf8');
const AFFICHAGE = fs.readFileSync(path.join(__dirname, '..', 'page/js/140-affichage-du-temps.js'), 'utf8');
function fonction(source, nom) {
  const m = source.match(new RegExp('\\nfunction ' + nom + '\\([^]*?\\n\\}'));
  assert(m, 'fonction réelle présente : ' + nom);
  return m[0];
}
const machine = SOURCE.match(/\nvar MACHINE_TR = \{[^]*?\}\};/);
assert(machine, 'MACHINE_TR présent');

const EPS = 1e-9;

function fixture(options = {}) {
  const voix = [], attenues = [], pasCurseur = [];
  const ligne = () => Array(16).fill(0);
  const pat = {A: [], B: [], son: [], last: options.last || 16, scale: options.scale || 16};
  for (let k = 0; k < 4; k++) { pat.A.push(ligne()); pat.B.push(ligne()); }
  /* instrument 1 sur tous les pas, pour compter chaque pas joué */
  pat.A[1].fill(1);
  const c = vm.createContext({
    Math, console,
    S: {bpm: 120}, cache: !!options.cache, pasSet: 0, queue: [], maintenant: 0,
    ctx: {currentTime: 0},
    TR: {pat, var2: false, shuffle: options.shuffle || 0, flam: false, pos: -1,
         def: {instr: [{}, {}, {}, {}]}, hN: 0, hK: 0, hIdx: 0, hS: 16, file: []},
    trPas: Array.from({length: 16}, (_, j) => ({classList: {toggle: (cl, on) => { if (on) pasCurseur.push(j); }, remove() {}}})),
    ouvrirPas: () => 0,
    voixTr: (t, k, acc) => voix.push({t, k, acc}),
    attenuerVoie: (id, n, t) => attenues.push({id, n, t}),
    document: {getElementById: () => null}
  });
  c.stepDur = () => 60 / c.S.bpm / 4;
  c.maintenantAudio = () => c.maintenant;
  vm.runInContext([
    'var T_PAS = 0;',
    fonction(SOURCE, 'echelleTr'), fonction(SOURCE, 'dureePasTr'),
    fonction(SOURCE, 'remettreHorlogeTr'), fonction(SOURCE, 'scheduleTr'),
    fonction(SOURCE, 'beatTr'), fonction(SOURCE, 'arretTr'), fonction(SOURCE, 'boucleTr'),
    fonction(AFFICHAGE, 'pasLePlusProche'),
    machine[0]
  ].join('\n'), c);
  /* un tic de l'horloge commune, exactement comme programmerPas */
  c.tic = () => { const n = c.pasSet; c.scheduleTr(n, 1 + n * c.stepDur()); c.pasSet++; };
  return {c, voix, attenues, pasCurseur};
}
function jouer(opts, tics) {
  const f = fixture(opts);
  for (let n = 0; n < tics; n++) f.c.tic();
  return f;
}
const D = 60 / 120 / 4;   /* une double croche à 120 BPM */

/* 1. SCALE 16 : comportement d'avant — un pas par tic, au début du tic */
{
  const {voix, attenues, c} = jouer({scale: 16}, 32);
  assert.equal(voix.length, 32);
  voix.forEach((v, k) => assert(Math.abs(v.t - (1 + k * D)) < EPS, 'SCALE 16 : pas ' + k + ' au tic'));
  assert.equal(attenues.length, 32, 'une atténuation par pas');
  assert.deepEqual(c.queue.slice(0, 18).map(e => e.i), [...Array(16).keys(), 0, 1], 'boucle sur 16 pas');
}
/* 2. SCALE 32 : deux pas par tic */
{
  const {voix} = jouer({scale: 32}, 16);
  assert.equal(voix.length, 32, 'SCALE 32 : 32 pas en 16 tics');
  voix.forEach((v, k) => assert(Math.abs(v.t - (1 + k * D / 2)) < EPS, 'SCALE 32 : pas ' + k));
}
/* 3. SCALE 12 : trois pas pour quatre tics ; LAST STEP 12 = une mesure */
{
  const {voix, c} = jouer({scale: 12, last: 12}, 16);
  assert.equal(voix.length, 12, 'SCALE 12 : 12 pas dans une mesure');
  voix.forEach((v, k) => assert(Math.abs(v.t - (1 + k * D * 4 / 3)) < EPS, 'SCALE 12 : pas ' + k));
  c.tic();
  assert.equal(c.queue[c.queue.length - 1].i, 0, 'le motif de 12 pas recommence à la mesure suivante');
  assert(Math.abs(voix[12].t - (1 + 16 * D)) < EPS, 'et pile sur le premier temps');
}
/* 4. SCALE 24 : trois pas pour deux tics */
{
  const {voix} = jouer({scale: 24, last: 12}, 8);
  assert.equal(voix.length, 12, 'SCALE 24 : 12 pas en une demi-mesure');
  voix.forEach((v, k) => assert(Math.abs(v.t - (1 + k * D * 2 / 3)) < EPS, 'SCALE 24 : pas ' + k));
}
/* 5. aucune dérive après une longue lecture */
{
  const {voix} = jouer({scale: 12}, 48000);
  assert.equal(voix.length, 36000);
  const k = voix.length - 1;
  assert(Math.abs(voix[k].t - (1 + k * D * 4 / 3)) < 1e-6, 'pas de dérive après 3000 mesures');
}
/* 6. SHUFFLE : décale les pas impairs d'une fraction du pas de la TR */
{
  const {voix} = jouer({scale: 32, shuffle: 0.4}, 2);
  assert(Math.abs(voix[0].t - 1) < EPS);
  assert(Math.abs(voix[1].t - (1 + D / 2 + D / 2 * 0.4 * 0.5)) < EPS, 'shuffle proportionnel au pas de la TR');
}
/* 7. SCALE changé pendant la lecture : la nouvelle grille part du tic courant */
{
  const f = fixture({scale: 16});
  for (let n = 0; n < 3; n++) f.c.tic();
  f.c.TR.pat.scale = 32;
  f.c.tic();
  const derniers = f.voix.slice(-2).map(v => v.t);
  assert(Math.abs(derniers[0] - (1 + 3 * D)) < EPS && Math.abs(derniers[1] - (1 + 3.5 * D)) < EPS,
         'changement de SCALE appliqué dès le tic suivant');
  assert.deepEqual(f.c.queue.slice(-2).map(e => e.i), [3, 4], 'la position dans le motif continue');
}
/* 8. un nouveau START (rang du SET à zéro) repart du premier pas */
{
  const f = jouer({scale: 12}, 7);
  f.c.pasSet = 0; f.c.queue.length = 0;
  f.c.tic();
  assert.deepEqual(f.c.queue.map(e => e.i), [0], 'START : premier pas');
}
/* 9. rendu hors ligne (cache) : rien dans les files d'affichage, même musique */
{
  const {voix, c} = jouer({scale: 24, cache: true}, 8);
  assert.equal(voix.length, 12);
  assert.equal(c.queue.length, 0);
  assert.equal(c.TR.file.length, 0);
}
/* 10. longueur en tics de l'horloge commune (rendu WAV, SET) */
{
  const f = fixture({});
  const L = (last, scale) => { f.c.TR.pat.last = last; f.c.TR.pat.scale = scale; return f.c.MACHINE_TR.longueur(); };
  assert.equal(L(16, 16), 16);
  assert.equal(L(16, 32), 8);
  assert.equal(L(12, 12), 16);
  assert.equal(L(12, 24), 8);
  assert.equal(L(16, 12), 22, 'tour incomplet arrondi au tic supérieur');
  assert.equal(L(16, 8), 16, 'valeur inconnue (ancienne sauvegarde) : 16');
}
/* 11. curseur tiré de la file de la TR, juste même quand elle est secondaire */
{
  const f = jouer({scale: 32}, 2);
  f.c.maintenant = 1 + 1.5 * D + 0.0001;
  f.c.beatTr(999);   /* rang du SET en tics : ignoré */
  assert.equal(f.c.TR.pos, 3, 'curseur sur le pas réellement entendu');
  f.c.beatTr(0);
  assert.equal(f.c.TR.pos, 3, 'aucun pas neuf : le curseur ne bouge pas');
}
/* 12. une frappe en écriture se rattache au pas le plus proche à la bonne échelle */
{
  const f = fixture({scale: 32});
  f.c.T_PAS = 1; f.c.maintenant = 1 + D * 0.3;   /* 0,6 pas de triple croche */
  assert.equal(f.c.pasLePlusProche(5, 16, f.c.dureePasTr()), 6);
  assert.equal(f.c.pasLePlusProche(5, 16), 5, 'sans durée : double croche, comme avant');
}
console.log('test-tr-scale : SCALE 16/32/12/24, shuffle, changement en lecture, rendu, curseur : OK');
