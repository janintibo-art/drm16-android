/* v258 — corbeille et nettoyage (page/js/639-corbeille-et-nettoyage.js) :
   les fonctions pures, sans page ni son : validation de la mémoire, et le
   choix d'un doublon à garder. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '..', 'page/js/639-corbeille-et-nettoyage.js'), 'utf8');
const c = {Math, Object, String, JSON};
vm.createContext(c);
vm.runInContext(src, c);
/* les objets et tableaux fabriqués dans le contexte isolé ont un autre prototype */
const j = (x) => JSON.parse(JSON.stringify(x));

/* 1. bibCorbeilleValide : identifiants et dates plausibles seulement */
{
  const r = c.bibCorbeilleValide({u1: 1700000000000, u2: "hier", "*/mal": 1700000000000, u3: -5, u4: 1700000000001});
  assert.deepEqual(j(r), {u1: 1700000000000, u4: 1700000000001});
  assert.deepEqual(j(c.bibCorbeilleValide(null)), {});
  assert.deepEqual(j(c.bibCorbeilleValide("rien")), {});
}

/* 2. bibDoublonsDe : pas de doublon, une seule empreinte */
{
  const sons = [{id: 'a', empreinte: 'x', usages: 0, date: 1}, {id: 'b', empreinte: 'y', usages: 0, date: 2}];
  assert.deepEqual(j(c.bibDoublonsDe(sons)), []);
}

/* 3. à empreinte égale : celui qui sert le plus est gardé */
{
  const sons = [
    {id: 'a', empreinte: 'x', usages: 0, date: 10},
    {id: 'b', empreinte: 'x', usages: 3, date: 20},
    {id: 'c', empreinte: 'x', usages: 1, date: 5},
  ];
  const g = j(c.bibDoublonsDe(sons));
  assert.equal(g.length, 1);
  assert.equal(g[0].garder, 'b');
  assert.deepEqual(g[0].autres.sort(), ['a', 'c']);
}

/* 4. même emploi (souvent zéro) : le plus ancien est gardé */
{
  const sons = [
    {id: 'recent', empreinte: 'x', usages: 0, date: 2000},
    {id: 'ancien', empreinte: 'x', usages: 0, date: 1000},
  ];
  assert.equal(j(c.bibDoublonsDe(sons))[0].garder, 'ancien');
}

/* 5. deux groupes de doublons à la fois, sans se mélanger */
{
  const sons = [
    {id: 'a1', empreinte: 'a', usages: 0, date: 1}, {id: 'a2', empreinte: 'a', usages: 0, date: 2},
    {id: 'b1', empreinte: 'b', usages: 0, date: 1}, {id: 'b2', empreinte: 'b', usages: 0, date: 2}, {id: 'b3', empreinte: 'b', usages: 0, date: 3},
    {id: 'c1', empreinte: 'c', usages: 0, date: 1},
  ];
  const g = j(c.bibDoublonsDe(sons)).sort((x, y) => x.garder.localeCompare(y.garder));
  assert.equal(g.length, 2);
  assert.equal(g[0].garder, 'a1'); assert.deepEqual(g[0].autres, ['a2']);
  assert.equal(g[1].garder, 'b1'); assert.deepEqual(g[1].autres, ['b2', 'b3']);
}

console.log('test-corbeille : mémoire validée, doublons groupés, le plus utile puis le plus ancien gardé : OK');
