// Exerce les vraies fonctions d'onde, de mémoire et de voix, avec des nœuds audio simulés.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../page/js/250-electribe-em-1.js'),'utf8');
function fonction(n){const i=src.indexOf('function '+n+'(');assert(i>=0);return src.slice(i,src.indexOf('\n}',i)+2);}
const c={};vm.createContext(c);
vm.runInContext(src.slice(src.indexOf('var ONDES ='),src.indexOf('function nomNote(')),c);
vm.runInContext('function ligneVide(){return Array(16).fill(0);}\n'+['motifVide','serialiser','deserialiser','voixSynth'].map(fonction).join('\n'),c);
function contexte(){return {waves:[],osc:[],createPeriodicWave(re,im){const w={re:Array.from(re),im:Array.from(im)};this.waves.push(w);return w;},createOscillator(){const o={frequency:{},detune:{},connect(){},start(t){this.debut=t;},stop(t){this.fin=t;},setPeriodicWave(w){this.wave=w;}};this.osc.push(o);return o;},createBiquadFilter(){return {frequency:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},Q:{},connect(){}};},createWaveShaper(){return {connect(){}};},createGain(){return {connect(){}};}};}
c.ctx=contexte();
for(let i=0;i<4;i++){const o=c.ctx.createOscillator();c.appliquerOndeEm(o,i);assert.equal(o.type,['sawtooth','square','triangle','sine'][i]);}
assert.equal(c.ctx.waves.length,0);
for(let i=4;i<8;i++){const o=c.ctx.createOscillator();c.appliquerOndeEm(o,i);assert(o.wave);assert.equal(o.wave.re[0],0);assert.equal(o.wave.im[0],0);assert([...o.wave.re,...o.wave.im].every(Number.isFinite));assert(o.wave.im.some(x=>x!==0));const p=c.ctx.createOscillator();c.appliquerOndeEm(p,i);assert.strictEqual(p.wave,o.wave);}
assert.equal(c.ctx.waves.length,4);assert.notDeepStrictEqual(c.ctx.waves[0],c.ctx.waves[1]);assert.notDeepStrictEqual(c.ctx.waves[2],c.ctx.waves[3]);
const ancien=c.ctx;c.ctx=contexte();const o=c.ctx.createOscillator();c.appliquerOndeEm(o,4);assert.notStrictEqual(o.wave,ancien.waves[0]);assert.equal(c.ctx.waves.length,1);
for(const invalide of [-1,8,NaN,Infinity,null,'4',2.5]){const x=c.ctx.createOscillator();c.appliquerOndeEm(x,invalide);assert.equal(x.type,'sawtooth');}
assert.equal(c.changerOndeEm(0,-1),7);assert.equal(c.changerOndeEm(7,1),0);
for(let i=0;i<8;i++){const p=c.motifVide();p.onde[8]=i;p.onde[9]=7-i;const r=c.deserialiser(JSON.parse(JSON.stringify(c.serialiser(p))));assert.equal(r.onde[8],i);assert.equal(r.onde[9],7-i);}
assert.equal(c.deserialiser({onde:[99]}).onde[0],0);assert.equal(c.deserialiser({}).onde[9],1);
c.EM={pat:c.motifVide(),cut:.5,res:.1,egi:.2,drv:.1,egT:.35};c.mv=(n,v)=>v;c.pasVoie=x=>x;c.sortiePartie=()=>({});c.courbeDist=()=>new Float32Array([0,1]);c.env=()=>{};c.stepDur=()=>.125;
for(let i=0;i<8;i++){c.ctx=contexte();c.EM.pat.onde[8]=i;c.voixSynth(2,8,69,.7);assert.equal(c.ctx.osc.length,2);assert.equal(c.ctx.osc[0].frequency.value,440);assert.equal(c.ctx.osc[1].frequency.value,220);for(const x of c.ctx.osc){assert.equal(x.debut,2);assert(x.fin>2);if(i<4)assert.equal(x.type,c.TYPES_ONDE[i]);else assert(x.wave);}}
console.log('EM-1 v217 : 8 formes, anciens indices, cache par contexte, données finies sans DC, mémoire, sélection et deux oscillateurs OK.');
