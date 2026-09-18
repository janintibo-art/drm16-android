const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../page/js/250-electribe-em-1.js'),'utf8');
function f(n){let i=src.indexOf('function '+n+'(');assert(i>=0,n);return src.slice(i,src.indexOf('\n}',i)+2);}
const c={S:{run:false},EM:{page:0,sel:0,mode:0,pos:-1,mute:[],solo:[],rec:false,shift:false,kb:false,pset:false},MOT:null,cache:false,queue:[],notes:[],H:{cran(){}},MIDI:{base:36,canal:1,canalSy:2},lcd(){},memEm(){},protege(){},majBascules(){},majKnobsPartie(){},majMotionLeds(){},ouvrirPas:()=>0,stepDur:()=>.125,attenuerVoie(){},sortiePartie(){},jouerTimbre(...x){c.notes.push(x);},voixSynth(...x){c.notes.push(x);},midiNoteA(){},motFxValeur:()=>null};
vm.createContext(c);
vm.runInContext(src.slice(src.indexOf('var ONDES ='),src.indexOf('function nomNote('))+src.slice(src.indexOf('function ligneVide('),src.indexOf('function poser(')),c);
vm.runInContext(['serialiser','deserialiser','motionAu','enregMotion','scheduleEm','velAccent','choisirLongueurEm','choisirPageEm','majPagesEm','majTouches','beatEm','fonctionShift','ecrireVol'].map(f).join('\n'),c);
vm.runInContext(src.slice(src.indexOf('var EM_PARTS ='),src.indexOf('var ONDES =')),c);
const copie=x=>JSON.parse(JSON.stringify(x));
c.EM.pat=c.motifVide();c.EM.egTime=()=>.3;
assert.equal(c.ligneVide().length,16,'autres machines inchangées');assert(c.EM.pat.st.every(x=>x.length===64));assert(c.EM.pat.nt.every(x=>x.length===64));
const vieux=c.deserialiser({len:16,st:['1000000000000001'],nt:['48,49'],onde:Array(12).fill(0)});assert.equal(vieux.st[0][15],1);assert(vieux.st[0].slice(16).every(x=>x===0));assert.equal(vieux.nt[0][0],48);assert.equal(vieux.nt[0][63],36);
for(const v of [0,65,-1,3.5,'64'])assert.equal(c.deserialiser({len:v}).len,16);
function element(){const cls=new Set();return {textContent:'',value:'',disabled:false,options:Array.from({length:4},()=>({})),classList:{toggle(k,on){on?cls.add(k):cls.delete(k);},remove(...ks){ks.forEach(k=>cls.delete(k));},contains:k=>cls.has(k)}};}
const dom={};for(const id of ['em-page','em-longueur','em-position'])dom[id]=element();c.document={getElementById:id=>dom[id]};c.keysEls=Array.from({length:16},element);c.beatsEls=Array.from({length:16},element);
assert(c.choisirLongueurEm(64));assert(c.choisirPageEm(3));assert.equal(c.keysEls[0].textContent,'49');assert.equal(c.keysEls[15].textContent,'64');
c.EM.pat.st[0][63]=1;c.EM.pat.nt[0][63]=72;c.majTouches();assert(c.keysEls[15].classList.contains('act'));c.beatEm(63);assert(c.keysEls[15].classList.contains('cur'));assert.equal(dom['em-position'].textContent,'LECTURE 64 / 64');
assert(c.choisirPageEm(0));assert(!c.keysEls[15].classList.contains('cur'));assert.equal(c.EM.pos,63);
c.S.run=true;assert(!c.choisirLongueurEm(16));c.S.run=false;c.EM.protect=true;assert(!c.choisirLongueurEm(16));c.EM.protect=false;
assert(c.choisirLongueurEm(16));assert.equal(c.EM.pat.st[0][63],1);assert(!c.choisirPageEm(3));assert(c.choisirLongueurEm(64));
for(const mode of ['kb','pset','shift']){c.EM[mode]=true;assert(!c.choisirPageEm(1));c.EM[mode]=false;}c.EM.mode=2;assert(!c.choisirPageEm(1));c.EM.mode=0;
// Réelles fonctions de lecture, aux limites entre pages et au dernier pas.
c.EM.pat=c.motifVide();c.EM.pat.len=64;for(const i of [15,16,31,32,47,48,63]){c.EM.pat.st[8][i]=1;c.EM.pat.nt[8][i]=60+i%12;}
for(let i=0;i<64;i++)c.scheduleEm(i,2+i*.125);assert.equal(c.notes.length,7);assert.equal(c.notes[6][2],63);assert.equal(c.queue[63].i,63);
c.EM.pat.mot[0]={mode:1,p:'lvl',v:null};c.EM.rec=true;c.S.run=true;c.EM.pos=63;c.enregMotion('lvl',.2);assert.equal(c.EM.pat.mot[0].v.length,64);assert.equal(c.motionAu(0,63).v,.2);
c.ctx={};c.busEffets=()=>{};c.maintenantAudio=()=>2;c.EM.note=70;c.EM.pos=16;c.ecrireVol(8);assert.equal(c.EM.pat.st[8][17],1);assert.equal(c.EM.pat.nt[8][17],70);c.EM.pos=63;c.ecrireVol(8);assert.equal(c.EM.pat.nt[8][0],70);
c.S.run=false;c.EM.pat.len=32;c.EM.pat.st[0][31]=1;c.EM.pat.st[0][63]=1;c.fonctionShift(4);assert.equal(c.EM.pat.st[0][0],1);assert.equal(c.EM.pat.st[0][31],0);assert.equal(c.EM.pat.st[0][63],1);
const r=c.deserialiser(JSON.parse(JSON.stringify(c.serialiser(c.EM.pat))));assert.deepStrictEqual(copie(r),copie(c.EM.pat));
vm.runInContext(fs.readFileSync(path.join(__dirname,'../page/js/040-mouvement-des-effets.js'),'utf8'),c);let m={mode:1,p:'e1',v:null};c.motFxEcrire(m,'e1',.4,true,63,64);assert.equal(m.v.length,64);m={mode:1,p:'e1',v:null};c.motFxEcrire(m,'e1',.4,true,15);assert.equal(m.v.length,16);
console.log('EM-1 v218 : migration, 64 cellules, pages, lecture inter-pages, REC, Motion, longueur protégée, notes masquées, rotation et mémoire OK.');
