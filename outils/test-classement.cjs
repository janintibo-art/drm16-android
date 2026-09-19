/* v252 — classement des sons de la bibliothèque (page/js/631-classement-des-sons.js) :
   catégorie par le nom puis par l'analyse, choix manuel prioritaire, mémoire
   validée, origines, dates, recherche, filtres, tris, favoris et pages. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '..', 'page/js/631-classement-des-sons.js'), 'utf8');

function page() {
  const c = {Math, JSON, Object, String, Float32Array, WeakMap, ecritures: 0,
    ES: {buf: {}, noms: {}}, BIB: {noms: {}}, bibEcrire() { c.ecritures++; return true; }};
  vm.createContext(c);
  vm.runInContext(src, c);
  return c;
}
const SR = 32000;
function tampon(dur, f) {
  const d = new Float32Array(Math.floor(SR * dur));
  for (let i = 0; i < d.length; i++) d[i] = f(i / SR);
  return {sampleRate: SR, length: d.length, duration: dur, getChannelData: () => d};
}
let graine = 1;
const bruit = () => { graine = (graine * 16807) % 2147483647; return graine / 1073741823.5 - 1; };
function aigu(dur, dec) { let pr = 0; return tampon(dur, t => { const n = bruit(), h = n - pr; pr = n; return h * Math.exp(-t * dec); }); }

/* 1. par le nom : les conventions des banques et des sites */
{
  const c = page();
  const attendu = {
    'Oberheim BD1': 'kick', 'KICK 2': 'kick', 'Bass Drum long': 'kick', '808 Snare': 'caisse', 'SD-3': 'caisse',
    'hihat_closed': 'charley', 'OPEN HAT': 'charley', 'HH 01': 'charley', 'Crash Ride 2': 'cymbale', 'CP-02': 'clap',
    'Handclap': 'clap', 'LT1': 'tom', 'Floor tom': 'tom', 'Conga low': 'percu', 'COWBELL': 'percu', 'Rimshot': 'percu',
    'Reese bass': 'basse', 'Piano C3': 'melodique', 'Vox chop': 'voix', 'CHOIR': 'voix', 'Break 120': 'boucle',
    'Drum loop 90': 'boucle', 'Laser zap': 'fx', 'Caisse claire': 'caisse', 'Grosse caisse': 'kick', 'Charleston ouvert': 'charley',
    'Mic 07': null, 'FICHIER X3A': null, 'Chocolat': null, 'Tomate': null
  };
  for (const [nom, cat] of Object.entries(attendu)) assert.equal(c.bibCategorieNom(nom), cat, nom);
}
/* 2. par l'écoute, quand le nom ne dit rien */
{
  const c = page();
  const cas = {
    kick: tampon(.5, t => Math.sin(2 * Math.PI * (50 + 120 * Math.exp(-t * 30)) * t) * Math.exp(-t * 7)),
    tom: tampon(.6, t => Math.sin(2 * Math.PI * (130 + 40 * Math.exp(-t * 20)) * t) * Math.exp(-t * 6)),
    charley: aigu(.12, 40), cymbale: aigu(1.4, 2.5),
    caisse: tampon(.3, t => (bruit() * .8 + Math.sin(2 * Math.PI * 190 * t) * .3) * Math.exp(-t * 14)),
    basse: tampon(1.2, t => Math.sin(2 * Math.PI * 55 * t) * .8 * Math.min(1, t * 50)),
    boucle: tampon(3, t => ((t * 4) % 1 < .1 ? bruit() : 0) * .8 + Math.sin(2 * Math.PI * 330 * t) * .2),
    melodique: tampon(1, t => (Math.sin(2 * Math.PI * 440 * t) + .5 * Math.sin(2 * Math.PI * 660 * t)) * .4 * Math.exp(-t * 1.5)),
    percu: tampon(.08, t => Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t * 60)),
    autre: tampon(.5, () => 0)
  };
  for (const [cat, b] of Object.entries(cas)) assert.equal(c.bibCategorieSon(b), cat, 'analyse : ' + cat);
  assert.equal(c.bibCategorieSon(null), null);
}
/* 3. ordre de décision et mémoire : manuel > deviné > nom > écoute */
{
  const c = page();
  c.ES.buf.u1 = tampon(.12, () => bruit());
  const s = {id: 'u1', nom: 'Mic 01'};
  const auto = c.bibCategorie(s);
  assert.equal(c.BIB.meta.u1.a, auto, 'deviné une fois, gardé');
  c.ES.buf.u1 = null;
  assert.equal(c.bibCategorie(s), auto, 'relu sans réanalyse');
  c.bibChoisirCategorie('u1', 'voix');
  assert.equal(c.bibCategorie(s), 'voix', 'le choix manuel l’emporte');
  c.bibChoisirCategorie('u1', '');
  assert.equal(c.bibCategorie(s), auto);
  assert.equal(c.bibCategorie({id: 'u2', nom: 'Mic 02'}), 'autre', 'son pas encore chargé : autre, rien de gardé');
  assert.equal(c.BIB.meta.u2 && c.BIB.meta.u2.a, undefined);
  const lu = c.bibMetaValides({u1: {c: 'kick', a: 'nimporte', f: true, x: 3}, 'b<1>': {c: 'kick'}, u3: 'texte',
                               u4: {c: '__proto__'}, u5: {}});
  assert.equal(JSON.stringify(lu), '{"u1":{"c":"kick","f":1}}', 'mémoire relue avec prudence');
  assert.equal(JSON.stringify(c.bibMetaValides(null)), '{}');
}
/* 4. origines et dates */
{
  const c = page();
  c.ES.noms = {u1: 'archive', u2: 'fichier', u3: 'kaoss', u4: 'mic', ufs42: 'freesound'};
  assert.deepEqual(['b3', 'u1', 'u2', 'u3', 'u4', 'ufs42', 'u9'].map(c.bibOrigine),
                   ['banque', 'archive', 'fichier', 'kaoss', 'mic', 'freesound', 'mic']);
  const t = Date.UTC(2026, 8, 19);
  assert.equal(c.bibDate('u' + t.toString(36)), t, 'date lue dans l’identifiant');
  assert.equal(c.bibDate('u' + t.toString(36) + 'kp'), t);
  assert.equal(c.bibDate('ufs123'), 0); assert.equal(c.bibDate('b4'), 0); assert.equal(c.bibDate('uzz'), 0);
}
/* 5. recherche, filtres, tris, favoris, pages */
{
  const c = page();
  const t0 = Date.UTC(2026, 0, 1);
  const liste = () => [
    {id: 'b0', nom: 'KICK', duree: .5, propre: false}, {id: 'b1', nom: 'SNARE', duree: .3, propre: false},
    {id: 'u' + (t0 + 1000).toString(36), nom: 'Oberheim BD1', duree: .4, propre: true},
    {id: 'u' + (t0 + 9000).toString(36), nom: 'Crash Ride', duree: 2, propre: true},
    {id: 'ufs7', nom: 'Hé chérie vox', duree: 1, propre: true}];
  c.ES.noms = {ufs7: 'freesound'};
  let r = c.bibClasserSons(liste());
  assert.equal(r.total, 5); assert.equal(r.tous, 5);
  assert.deepEqual(r.l.map(s => s.nom), ['Crash Ride', 'Hé chérie vox', 'KICK', 'Oberheim BD1', 'SNARE'], 'tri par nom, sans casse');
  assert(c.ecritures > 0, 'catégories devinées gardées');
  const f = c.bibFiltre();
  f.q = 'CHERIE'; r = c.bibClasserSons(liste());
  assert.deepEqual(r.l.map(s => s.id), ['ufs7'], 'recherche sans accents ni casse');
  f.q = 'kick'; r = c.bibClasserSons(liste());
  assert.deepEqual(r.l.map(s => s.nom), ['KICK', 'Oberheim BD1'], 'la recherche trouve aussi la catégorie');
  f.q = ''; f.cat = 'kick'; f.orig = 'vous'; r = c.bibClasserSons(liste());
  assert.deepEqual(r.l.map(s => s.nom), ['Oberheim BD1']);
  f.cat = ''; f.orig = 'freesound'; r = c.bibClasserSons(liste());
  assert.deepEqual(r.l.map(s => s.id), ['ufs7']);
  f.orig = 'banque'; r = c.bibClasserSons(liste());
  assert.equal(r.total, 2);
  f.orig = 'tout'; f.tri = 'recent'; r = c.bibClasserSons(liste());
  assert.equal(r.l[0].nom, 'Crash Ride', 'plus récents d’abord');
  f.tri = 'duree'; r = c.bibClasserSons(liste());
  assert.deepEqual(r.l.map(s => s.duree), [.3, .4, .5, 1, 2]);
  f.tri = 'cat'; r = c.bibClasserSons(liste());
  assert.deepEqual(r.l.map(s => s.cat), ['kick', 'kick', 'caisse', 'cymbale', 'voix']);
  assert(c.bibBasculerFavori('b1'));
  f.tri = 'nom'; r = c.bibClasserSons(liste());
  assert.equal(r.l[0].nom, 'SNARE', 'favoris en tête');
  f.fav = true; r = c.bibClasserSons(liste());
  assert.deepEqual(r.l.map(s => s.nom), ['SNARE']);
  assert(!c.bibBasculerFavori('b1'));
  assert.equal(c.BIB.meta.b1.f, undefined);
  f.fav = false; f.n = 2; r = c.bibClasserSons(liste());
  assert.equal(r.l.length, 2); assert.equal(r.total, 5, 'une page de deux, cinq en tout');
}
console.log('test-classement : noms, écoute, manuel prioritaire, mémoire validée, origines, dates, recherche, filtres, tris, favoris, pages : OK');
