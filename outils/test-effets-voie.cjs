/* v240 — le bus d'effet et de délai des Electribe (EM-1, ER-1, EA-1, ES-1)
   passe par la voie de table de l'Electribe affichée, plus jamais directement
   par le mélange général. Les vraies fonctions de page/js/250-… sont
   exécutées sur un graphe audio simulé qui relève chaque branchement. */
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
const EM = lire('page/js/250-electribe-em-1.js');

function contexte() {
  let n = 0;
  const liens = [];
  const noeud = (type, ctx) => {
    const x = {type, id: type + (n++), context: ctx, gain: {value: 1}, delayTime: {value: 0},
      connect(d) { liens.push([x, d]); return d; },
      disconnect() { for (let i = liens.length - 1; i >= 0; i--) if (liens[i][0] === x) liens.splice(i, 1); }};
    return x;
  };
  const ctx = {createGain() { return noeud('gain', ctx); }, createDelay() { return noeud('delay', ctx); }};
  const master = noeud('master', ctx);
  const bus = {};
  const c = vm.createContext({ctx, master, construireFx() {},
    busSet: id => bus[id] || (bus[id] = noeud('voie-' + id, ctx))});
  vm.runInContext([
    EM.match(/\nvar fxIn=null[^\n]*/)[0], EM.match(/\nvar fxRetour = null[^\n]*/)[0],
    fonction(EM, 'sortieEffets'), fonction(EM, 'busEffets'), fonction(EM, 'routerEffets')
  ].join('\n'), c);
  const vers = x => liens.filter(l => l[0] === x).map(l => l[1]);
  return {c, ctx, master, bus, liens, vers};
}

/* 1. par défaut, le retour d'effet va dans la voie EM, rien ne va au mélange */
{
  const t = contexte(), c = t.c;
  c.busEffets();
  assert.deepEqual(t.vers(c.fxRetour), [t.bus.em], 'retour → voie EM');
  assert(t.vers(c.fxOut).includes(c.fxRetour), 'effet → retour');
  assert(t.vers(c.dlyNode).includes(c.fxRetour), 'délai → retour');
  assert.equal(t.liens.filter(l => l[1] === t.master).length, 0, 'aucun branchement direct au mélange général');
}
/* 2. ouvrir une autre Electribe déplace le retour sur sa voie */
{
  const t = contexte(), c = t.c;
  c.busEffets();
  for (const id of ['es', 'er', 'ea', 'em']) {
    c.routerEffets(id);
    assert.deepEqual(t.vers(c.fxRetour), [t.bus[id]], 'retour → voie ' + id + ', et elle seule');
  }
  assert(t.vers(c.fxOut).includes(c.fxRetour) && t.vers(c.dlyNode).includes(c.fxRetour), 'effet et délai restent branchés');
}
/* 3. choix de voie fait avant la création du bus (ouverture à froid) */
{
  const t = contexte(), c = t.c;
  c.routerEffets('es');
  assert.equal(c.fxRetour, null);
  c.busEffets();
  assert.deepEqual(t.vers(c.fxRetour), [t.bus.es], 'bus créé directement sur la voie ES');
}
/* 4. retour d'un ancien contexte (après un rendu) : pas de branchement croisé */
{
  const t = contexte(), c = t.c;
  c.busEffets();
  const ancien = c.fxRetour;
  c.ctx = {createGain() {}, createDelay() {}};
  c.routerEffets('er');
  assert.equal(c.FX_VOIE, 'er');
  assert.deepEqual(t.vers(ancien), [t.bus.em], 'le nœud de l’ancien contexte n’est pas rebranché');
}
/* 5. contrôle des sources : plus de fxOut / dlyNode vers master, activations routées */
{
  for (const [f, id] of [['250-electribe-em-1.js', 'em'], ['260-electribe-er-1.js', 'er'],
                         ['270-electribe-ea-1.js', 'ea'], ['280-electribe-es-1.js', 'es']]) {
    const s = lire('page/js/' + f);
    assert(!/\b(fxOut|dlyNode|fxRetour)\.connect\(master\)/.test(s), f + ' : aucun effet vers master');
    assert(new RegExp('function activer\\w*\\([^)]*\\)\\{\\n  stop\\(\\);\\n  routerEffets\\("' + id + '"\\);').test(s),
           f + ' : l’activation prend le bus pour la voie ' + id);
  }
  assert(/fxRetour = null/.test(fonction(lire('page/js/110-moteur-audio.js'), 'razNoeudsMachines')),
         'razNoeudsMachines oublie aussi le retour');
}
console.log('test-effets-voie : effets Electribe dans leur voie, changement de machine, ouverture à froid, rendu : OK');
