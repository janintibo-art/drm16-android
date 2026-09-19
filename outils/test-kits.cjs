/* v251 — kits de sons des machines (page/js/632-kits-de-sons.js). Le vrai
   fichier est exécuté avec une ES-1 et une TR simulées : ranger, rappeler dans
   le motif ou partout, remettre les sons d'avant (aller et retour), kits abîmés,
   limites, usages des échantillons. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '..', 'page/js/632-kits-de-sons.js'), 'utf8');
const copie = o => JSON.parse(JSON.stringify(o));

function page() {
  const stock = new Map(), signaux = [], ouvertures = [];
  const sonEs = e => ({ech: e, pitch: 0, filt: 1, lvl: 0.8, pan: 0, rev: false, roll: false, fx: false, slice: false});
  const motifEs = () => ({son: Array.from({length: 10}, (_, k) => sonEs('b' + k)), st: []});
  const c = {
    MEM: 'drm.reglages', PROJET_EN_COURS: false, JSON, Math, Date,
    localStorage: {getItem: k => stock.has(k) ? stock.get(k) : null, setItem: (k, v) => stock.set(k, String(v))},
    signal: s => signaux.push(s), writeMem() {}, S: {modele: 'es1'},
    ES_PARTS: Array.from({length: 10}, (_, k) => ({n: String(k + 1)})),
    ES: {cur: 0, slots: Array.from({length: 16}, motifEs)},
    TR: {cur: 0, slots: [0, 1].map(() => ({son: [{niv: .8, ton: .5}, {niv: .7, ton: .5}]})), tone: .5, drive: .2, dist: false,
         def: {instr: [{id: 'BD', nom: 'BASS DRUM'}, {id: 'SD', nom: 'SNARE'}]}},
    BIB: {cible: {machine: 'es1', partie: 0}}, nomBib: id => 'SON ' + id,
    bibAffecter(id) { c.ES.pat.son[c.BIB.cible.partie].ech = id; },
    allerMachine(m) { c.S.modele = m; ouvertures.push(m); }, rouvrirMachine(m) { ouvertures.push('r:' + m); },
    memEs() {}, memTr() {}
  };
  c.ES.pat = c.ES.slots[0]; c.TR.pat = c.TR.slots[0];
  c.window = c;
  vm.createContext(c);
  vm.runInContext(src, c);
  return {c, stock, signaux, ouvertures};
}

/* 1. ranger, changer, remettre (aller et retour), rappeler */
{
  const {c, signaux} = page();
  assert(c.kitsRanger('es1', 'ORIGINE', -1));
  assert(c.kitsChangerSon('es1', 0, 'u-kick'));
  assert.equal(c.ES.pat.son[0].ech, 'u-kick');
  assert(c.kitsRemettre('es1'));
  assert.equal(c.ES.pat.son[0].ech, 'b0', 'sons d’avant remis');
  assert(c.kitsRemettre('es1'));
  assert.equal(c.ES.pat.son[0].ech, 'u-kick', 'second appui : on revient, pour comparer');
  c.ES.pat.son[3].lvl = 0.1;
  assert(c.kitsRappeler('es1', 0, false));
  assert.equal(c.ES.pat.son[0].ech, 'b0'); assert.equal(c.ES.pat.son[3].lvl, 0.8, 'tous les réglages du kit reviennent');
  assert.match(signaux[signaux.length - 1], /ORIGINE RAPPELÉ · MOTIF 1/);
  assert(!c.kitsChangerSon('es1', 9, 'b1'), 'l’accent n’a pas de son');
}
/* 2. motif affiché ou tous les motifs, et retour arrière sur tous */
{
  const {c} = page();
  c.ES.pat.son[1].ech = 'u-snare'; c.kitsRanger('es1', 'K', -1);
  c.ES.slots[5].son[1].ech = 'b9';
  c.kitsRappeler('es1', 0, false);
  assert.equal(c.ES.slots[5].son[1].ech, 'b9', 'motif affiché seulement');
  c.kitsRappeler('es1', 0, true);
  assert(c.ES.slots.every(p => p.son[1].ech === 'u-snare'), 'rappelé dans les seize motifs');
  c.kitsRemettre('es1');
  assert.equal(c.ES.slots[5].son[1].ech, 'b9', 'retour arrière motif par motif');
  assert.equal(c.ES.slots[0].son[1].ech, 'u-snare');
}
/* 3. kit abîmé ou d'une autre forme : rien ne casse, rien de faux ne passe */
{
  const {c, stock} = page();
  c.kitsRanger('es1', 'A', -1);
  const t = JSON.parse(stock.get('drm.reglages.kits'));
  t.machines.es1.kits[0].parties[0] = {ech: 42, lvl: 'fort', pan: NaN, rev: 1, inconnu: 3, pitch: {x: 1}};
  t.machines.es1.kits[0].parties[1] = null;
  t.machines.es1.kits.push({nom: 'COURT', parties: [{ech: 'b1'}]}, 'n’importe quoi', {nom: 'SANS'});
  stock.set('drm.reglages.kits', JSON.stringify(t));
  const avant = copie(c.ES.pat.son);
  c.ES.pat.son[0].lvl = 0.3;
  assert(c.kitsRappeler('es1', 0, false));
  assert.equal(c.ES.pat.son[0].ech, 'b0'); assert.equal(c.ES.pat.son[0].lvl, 0.3); assert.equal(c.ES.pat.son[0].rev, false);
  assert.equal(c.ES.pat.son[0].pitch, 0); assert.equal(c.ES.pat.son[0].inconnu, undefined);
  assert.deepEqual(copie(c.ES.pat.son[1]), avant[1]);
  assert(!c.kitsRappeler('es1', 1, false), 'kit d’une autre taille refusé');
  assert.equal(c.kitsDe(c.kitsLireTout(), 'es1').kits.length, 2, 'les entrées illisibles sont écartées');
  stock.set('drm.reglages.kits', '{pas du json');
  assert.equal(c.kitsDe(c.kitsLireTout(), 'es1').kits.length, 0, 'mémoire illisible : aucun kit, pas d’erreur');
}
/* 4. TR : réglages de timbre communs gardés avec le kit */
{
  const {c} = page();
  c.S.modele = 'tr808';
  c.kitsRanger('tr808', 'SEC', -1);
  c.TR.pat.son[1].ton = 0.9; c.TR.tone = 0.1; c.TR.dist = true;
  c.kitsRappeler('tr808', 0, false);
  assert.equal(c.TR.pat.son[1].ton, 0.5); assert.equal(c.TR.tone, 0.5); assert.equal(c.TR.dist, false);
}
/* 5. limite, projets, usages des échantillons */
{
  const {c, signaux} = page();
  for (let n = 0; n < 16; n++) assert(c.kitsRanger('es1', 'K' + n, -1));
  assert(!c.kitsRanger('es1', 'DE TROP', -1));
  assert.match(signaux[signaux.length - 1], /16 KITS AU PLUS/);
  c.kitsRanger('es1', '', 3);
  assert.equal(c.kitsDe(c.kitsLireTout(), 'es1').kits[3].nom, 'K3', 'REMPLACER garde le nom');
  c.ES.pat.son[2].ech = 'u-x'; c.kitsRanger('es1', '', 0);
  assert.equal(c.kitsUsagesEch('u-x'), 1, 'un son rangé dans un kit compte comme usage');
  c.PROJET_EN_COURS = true;
  assert(!c.kitsRanger('es1', '', 1), 'pendant l’ouverture d’un projet, rien n’est écrit');
}
/* 6. une autre machine est ouverte avant d'agir, et la façade est rouverte */
{
  const {c, ouvertures} = page();
  c.S.modele = 'tr808';
  c.kitsRanger('es1', 'X', -1);
  assert.deepEqual(ouvertures, ['es1']);
  c.kitsRappeler('es1', 0, false);
  assert.equal(ouvertures[ouvertures.length - 1], 'r:es1', 'rouvrirMachine : façade à jour, mode morceau gardé');
}
console.log('test-kits : ranger, changer, remettre aller-retour, motif ou partout, kits abîmés, TR, limites, usages : OK');
