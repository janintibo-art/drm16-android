const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'../page/js/250-electribe-em-1.js'),'utf8');
function f(n){const i=src.indexOf('function '+n+'(');assert(i>=0);return src.slice(i,src.indexOf('\n}',i)+2);}
let accepte=false;const c={EM:{mode:2,ssel:1,spos:2,cur:7,pat:{nom:'courant'},slots:Array.from({length:16},(_,i)=>({nom:i})),song:[0,0,2,7]},S:{run:false},WAVX:{occupe:false},window:{confirm:()=>accepte},majTouches(){},majBascules(){},majMotionLeds(){},majKnobsPartie(){},memEm(){c.sauve=c.EM.song.slice();},H:{inter(){}},lcd(){},signal(){}};
vm.createContext(c);vm.runInContext(['editionSongPossibleEm','editerSongEm','preparerSongEm'].map(f).join('\n'),c);
const copie=x=>JSON.parse(JSON.stringify(x)),motifs=copie(c.EM.slots),pat=c.EM.pat;
assert(c.editerSongEm('droite'));assert.deepStrictEqual(copie(c.EM.song),[0,2,0,7]);assert.equal(c.EM.ssel,2);
assert(c.editerSongEm('gauche'));assert(c.editerSongEm('dupliquer'));assert.deepStrictEqual(copie(c.EM.song),[0,0,0,2,7]);assert.equal(c.EM.ssel,2);
assert(!c.editerSongEm('supprimer'));accepte=true;assert(c.editerSongEm('supprimer'));assert.deepStrictEqual(copie(c.EM.song),[0,0,2,7]);assert.deepStrictEqual(copie(c.sauve),[0,0,2,7]);assert.deepStrictEqual(copie(c.EM.slots),motifs);assert.strictEqual(c.EM.pat,pat);assert.equal(c.EM.cur,7);
c.EM.ssel=0;assert(!c.editerSongEm('gauche'));c.EM.ssel=3;assert(!c.editerSongEm('droite'));assert(!c.editerSongEm('invalide'));
for(const objet of [c.S,c.EM,c.WAVX]){const champ=objet===c.S?'run':objet===c.EM?'protect':'occupe';objet[champ]=true;assert(!c.editerSongEm('supprimer'));objet[champ]=false;}
c.EM.mode=0;assert(!c.editerSongEm('dupliquer'));c.EM.mode=2;c.EM.song=Array(16).fill(0);assert(!c.editerSongEm('dupliquer'));
c.EM.song=[7];c.EM.ssel=0;assert(c.editerSongEm('supprimer'));assert.equal(c.EM.song.length,0);assert(!c.preparerSongEm());
c.EM.song=[2,0];assert(c.preparerSongEm());assert.equal(c.EM.cur,2);assert.equal(c.EM.spos,0);assert.strictEqual(c.EM.slots[7],pat);assert.strictEqual(c.EM.pat,c.EM.slots[2]);
console.log('EM-1 v220 : déplacements des occurrences, duplication, retrait confirmé, limites, protections, sauvegarde, motifs préservés et départ Song OK.');
