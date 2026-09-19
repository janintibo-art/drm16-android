const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'../page/js/250-electribe-em-1.js'),'utf8');
function f(n){const i=src.indexOf('function '+n+'(');assert(i>=0);return src.slice(i,src.indexOf('\n}',i)+2);}
let accepte=false;const c={EM:{mode:2,ssel:1,spos:2,songPage:0,cur:7,pat:{nom:'courant'},slots:Array.from({length:16},(_,i)=>({nom:i})),song:[0,0,2,7]},S:{run:false},WAVX:{occupe:false},window:{confirm:()=>accepte},majTouches(){},majBascules(){},majMotionLeds(){},majKnobsPartie(){},memEm(){c.sauve=c.EM.song.slice();},H:{inter(){},cran(){}},lcd(){},signal(){},protege(){}};
vm.createContext(c);vm.runInContext(['editionSongPossibleEm','editerSongEm','preparerSongEm','memoriserSongEm','annulationSongPossibleEm','annulerSongEm'].map(f).join('\n'),c);
const copie=x=>JSON.parse(JSON.stringify(x)),motifs=copie(c.EM.slots),pat=c.EM.pat;
assert(c.editerSongEm('droite'));assert.deepStrictEqual(copie(c.EM.song),[0,2,0,7]);assert.equal(c.EM.ssel,2);
assert(c.editerSongEm('gauche'));assert(c.editerSongEm('dupliquer'));assert.deepStrictEqual(copie(c.EM.song),[0,0,0,2,7]);assert.equal(c.EM.ssel,2);
assert(!c.editerSongEm('supprimer'));accepte=true;assert(c.editerSongEm('supprimer'));assert.deepStrictEqual(copie(c.EM.song),[0,0,2,7]);assert.deepStrictEqual(copie(c.sauve),[0,0,2,7]);assert.deepStrictEqual(copie(c.EM.slots),motifs);assert.strictEqual(c.EM.pat,pat);assert.equal(c.EM.cur,7);
c.EM.ssel=0;assert(!c.editerSongEm('gauche'));c.EM.ssel=3;assert(!c.editerSongEm('droite'));assert(!c.editerSongEm('invalide'));
for(const objet of [c.S,c.EM,c.WAVX]){const champ=objet===c.S?'run':objet===c.EM?'protect':'occupe';objet[champ]=true;assert(!c.editerSongEm('supprimer'));objet[champ]=false;}
c.EM.mode=0;assert(!c.editerSongEm('dupliquer'));c.EM.mode=2;c.EM.song=Array(64).fill(0);assert(!c.editerSongEm('dupliquer'));
c.EM.song=[7];c.EM.ssel=0;assert(c.editerSongEm('supprimer'));assert.equal(c.EM.song.length,0);assert(!c.preparerSongEm());
c.EM.song=[2,0];assert(c.preparerSongEm());assert.equal(c.EM.cur,2);assert.equal(c.EM.spos,0);assert.strictEqual(c.EM.slots[7],pat);assert.strictEqual(c.EM.pat,c.EM.slots[2]);
console.log('EM-1 v220 : déplacements des occurrences, duplication, retrait confirmé, limites, protections, sauvegarde, motifs préservés et départ Song OK.');

// Une seule annulation, y compris après retrait de la dernière position.
c.EM.mode=2;c.EM.song=[2,0,2];c.EM.ssel=1;const original=c.EM.song.slice();
assert(c.editerSongEm('dupliquer'));const dernier=c.EM.annulationSong;assert.deepStrictEqual(copie(dernier.song),original);
accepte=false;assert(!c.annulerSongEm());assert.strictEqual(c.EM.annulationSong,dernier);accepte=true;
for(const objet of [c.S,c.EM,c.WAVX]){const champ=objet===c.S?'run':objet===c.EM?'protect':'occupe';objet[champ]=true;assert(!c.annulerSongEm());objet[champ]=false;}
c.EM.mode=0;assert(!c.annulerSongEm());c.EM.mode=2;assert(c.annulerSongEm());assert.deepStrictEqual(copie(c.EM.song),original);assert.equal(c.EM.ssel,1);assert.equal(c.EM.annulationSong,null);assert(!c.annulerSongEm());
c.EM.song=[7];c.EM.ssel=0;assert(c.editerSongEm('supprimer'));assert.equal(c.EM.song.length,0);assert(c.annulerSongEm());assert.deepStrictEqual(copie(c.EM.song),[7]);
c.memoriserSongEm('effacement');c.EM.song=[];assert(c.annulerSongEm());assert.deepStrictEqual(copie(c.EM.song),[7]);
c.EM.song=[0,2,7];c.EM.ssel=0;assert(c.editerSongEm('droite'));const intermediaire=c.EM.song.slice();assert(c.editerSongEm('dupliquer'));assert(c.annulerSongEm());assert.deepStrictEqual(copie(c.EM.song),intermediaire);
c.EM.slots[2].nom='nouveau son';c.EM.ssel=1;assert(c.editerSongEm('supprimer'));assert(c.annulerSongEm());assert.equal(c.EM.slots[2].nom,'nouveau son');
c.memoriserSongEm('test');c.memLire=()=>null;vm.runInContext(f('chargerEm'),c);c.chargerEm();assert.equal(c.EM.annulationSong,null);
console.log('EM-1 v221 : annulation confirmée, vide, état précédent unique, protections, motifs préservés et mémoire temporaire OK.');

vm.runInContext(f('remplacerMotifSongEm'),c);c.EM.song=[0,0,2];c.EM.ssel=1;c.EM.mode=2;c.EM.protect=false;c.S.run=false;c.WAVX.occupe=false;const courant=c.EM.pat,numero=c.EM.cur;
assert(c.remplacerMotifSongEm(15));assert.deepStrictEqual(copie(c.EM.song),[0,15,2]);assert.strictEqual(c.EM.pat,courant);assert.equal(c.EM.cur,numero);const annulation=c.EM.annulationSong;assert(c.remplacerMotifSongEm(15));assert.strictEqual(c.EM.annulationSong,annulation);
assert(c.annulerSongEm());assert.deepStrictEqual(copie(c.EM.song),[0,0,2]);
for(const k of [-1,16,1.5,'2'])assert(!c.remplacerMotifSongEm(k));
for(const objet of [c.S,c.EM,c.WAVX]){let cle=objet===c.S?'run':objet===c.EM?'protect':'occupe';objet[cle]=true;assert(!c.remplacerMotifSongEm(7));objet[cle]=false;}
c.EM.song=[];assert(!c.remplacerMotifSongEm(7));
console.log('EM-1 v224 : affectation ciblée, motif courant préservé, annulation, sélection identique et protections OK.');

// v225 : pagination du Song, ajout inter-pages et limite exacte à 64 positions.
vm.runInContext(f('toucheSong')+'\n'+f('choisirPageSongEm'),c);
c.EM.mode=2;c.EM.protect=false;c.S.run=false;c.WAVX.occupe=false;c.EM.cur=7;c.EM.song=Array(16).fill(0);c.EM.songPage=0;c.EM.ssel=15;
assert(c.choisirPageSongEm(1));assert.equal(c.EM.songPage,1);assert(!c.choisirPageSongEm(2));
c.toucheSong(16);assert.equal(c.EM.song.length,17);assert.equal(c.EM.ssel,16);assert.equal(c.EM.songPage,1);assert.equal(c.EM.song[16],7);
const longueur=c.EM.song.length;assert(!c.toucheSong(18));assert.equal(c.EM.song.length,longueur);
c.EM.song=Array(64).fill(0);c.EM.songPage=3;c.EM.ssel=63;assert(c.choisirPageSongEm(3));assert(!c.choisirPageSongEm(4));assert(!c.toucheSong(64));assert.equal(c.EM.song.length,64);assert.equal(c.EM.ssel,63);
c.EM.song=Array(48).fill(0);assert(c.choisirPageSongEm(3));assert.equal(c.EM.songPage,3);assert(c.choisirPageSongEm(2));assert.equal(c.EM.songPage,2);
c.EM.song=Array(16).fill(0);c.EM.songPage=0;c.EM.ssel=15;c.memoriserSongEm('test page');c.EM.song=Array(17).fill(0);c.EM.songPage=1;c.EM.ssel=16;assert(c.annulerSongEm());assert.equal(c.EM.song.length,16);assert.equal(c.EM.songPage,0);assert.equal(c.EM.ssel,15);
console.log('EM-1 v225 : quatre pages Song, ajout de la position suivante et plafond de 64 positions OK.');
