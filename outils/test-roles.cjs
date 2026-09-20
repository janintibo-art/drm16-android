/* v256 — kits par rôle (page/js/637-kits-par-role.js) : le choix d'un son pour
   chaque partie, sans page ni son. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = fs.readFileSync(path.join(__dirname, '..', 'page/js/637-kits-par-role.js'), 'utf8');
const c = {Math, Object, String};
vm.createContext(c);
vm.runInContext(src, c);
const P = (i, role, nom, banque) => ({i, role, nom, banque: !!banque});
const Sx = (id, role, nom, banque) => ({id, role, nom, banque: !!banque});
const choix = (p, s) => JSON.parse(JSON.stringify(c.choisirParRole(p, s))).map(x => x.i + ':' + x.id).join(' ');

/* 1. même rôle d'abord, sans doublon tant qu'il y a de quoi */
{
  const parties = [P(0, 'kick', 'KICK'), P(1, 'caisse', 'SNARE'), P(2, 'charley', 'HAT'), P(3, 'charley', 'OPEN HAT')];
  const sources = [Sx('bd', 'kick', 'TR-808 BASS DRUM'), Sx('sd', 'caisse', 'TR-808 SNARE'),
                   Sx('ch', 'charley', 'TR-808 CLOSED HAT'), Sx('oh', 'charley', 'TR-808 OPEN HAT')];
  assert.equal(choix(parties, sources), '0:bd 1:sd 2:ch 3:oh');
}
/* 2. le nom départage à rôle égal : OPEN va sur OPEN, même si la source est dans l'autre ordre */
{
  const parties = [P(0, 'charley', 'OPEN HAT'), P(1, 'charley', 'CLOSED HAT')];
  const sources = [Sx('ch', 'charley', 'CLOSED HAT'), Sx('oh', 'charley', 'OPEN HAT')];
  assert.equal(choix(parties, sources), '0:oh 1:ch');
  assert.equal(c.ressemblance('KICK 2', 'TR-808 BASS DRUM'), 0, 'les mots génériques ne comptent pas');
  assert.equal(c.ressemblance('RIDE BELL', 'CYMBAL RIDE'), 1);
}
/* 2 bis. deux pads HAT et deux pads OPEN HAT : chacun le sien, quel que soit l'ordre */
{
  const parties = [P(4, 'charley', 'HAT'), P(5, 'charley', 'HAT'), P(6, 'charley', 'OPEN HAT'), P(7, 'charley', 'OPEN HAT')];
  const sources = [Sx('ch', 'charley', 'TR-808 CLOSED HAT'), Sx('oh', 'charley', 'TR-808 OPEN HAT')];
  assert.equal(choix(parties, sources), '4:ch 5:ch 6:oh 7:oh');
}
/* 3. plus de parties que de sons : le même son revient (une MPC a seize kicks possibles) */
{
  const parties = [P(0, 'kick', 'KICK'), P(1, 'kick', 'KICK 2'), P(2, 'kick', 'KICK 3')];
  assert.equal(choix(parties, [Sx('bd', 'kick', 'BD'), Sx('bd2', 'kick', 'BD 2')]), '0:bd 1:bd2 2:bd');
}
/* 4. rôle voisin quand le rôle manque, sinon la partie garde son son */
{
  const parties = [P(0, 'clap', 'CLAP'), P(1, 'voix', 'VOX'), P(2, 'boucle', 'LOOP')];
  const sources = [Sx('sd', 'caisse', 'SNARE'), Sx('pn', 'melodique', 'PIANO')];
  assert.equal(choix(parties, sources), '0:sd 1:pn 2:pn', 'clap ← caisse, voix ← mélodique, boucle ← mélodique');
  assert.equal(choix([P(0, 'autre', 'X')], sources), '', 'aucun rôle voisin : rien ne change');
}
/* 5. une partie de banque seule (EMX-1, ER-1 mkII) ne reçoit que la banque */
{
  const parties = [P(0, 'kick', 'KICK', true)];
  assert.equal(choix(parties, [Sx('u1', 'kick', 'MON KICK'), Sx('b0', 'kick', 'KICK', true)]), '0:b0');
  assert.equal(choix(parties, [Sx('u1', 'kick', 'MON KICK')]), '');
}
/* 5 bis. au hasard : pas de préférence par le nom, et pas le son qu'on a déjà */
{
  const parties = [{i: 0, role: 'charley', nom: 'OPEN HAT', id: 'oh'}];
  const sources = [Sx('oh', 'charley', 'OPEN HAT'), Sx('ch', 'charley', 'CLOSED HAT')];
  assert.equal(choix(parties, sources), '0:oh', 'posé : le nom le plus proche');
  assert.equal(JSON.parse(JSON.stringify(c.choisirParRole(parties, sources, true))).map(x => x.id).join(), 'ch', 'au hasard : un autre son');
  assert.equal(JSON.parse(JSON.stringify(c.choisirParRole(parties, [Sx('oh', 'charley', 'OPEN HAT')], true))).map(x => x.id).join(), 'oh', 'seul candidat : il reste');
}
/* 6. mélange : complet et sans perte */
{
  let k = 0; const suite = [0.9, 0.1, 0.5, 0.3, 0.7];
  const l = c.melanger([1, 2, 3, 4, 5, 6], () => suite[k++ % suite.length]);
  assert.deepEqual(Array.from(l).sort(), [1, 2, 3, 4, 5, 6]);
  assert.notDeepEqual(Array.from(l), [1, 2, 3, 4, 5, 6]);
}
console.log('test-roles : même rôle, nom qui départage, réutilisation, rôles voisins, banque seule, mélange : OK');
