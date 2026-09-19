const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'../page/js/560-pocket-operator-k-o.js'),'utf8');
function f(n){const i=src.indexOf('function '+n+'(');assert(i>=0,n);return src.slice(i,src.indexOf('\n}',i)+2);}
const c={KO_FX:[],KO_NOTES:[],ctx:null,cache:false,queue:[],notes:[],ouvrirPas:()=>0,stepDur:()=>.125,attenuerVoie(){},audioInit(){},banqueEs(){},normaliserPlockKo:null};
vm.createContext(c);
vm.runInContext(src.slice(src.indexOf('var KO_FX ='),src.indexOf('function noeudsKo(')),c);
assert.equal(c.KO_PLOCKS.length,4);
const m=c.motifKo();assert.equal(m.pas.length,16);assert.equal(m.plocks.length,16);assert(m.plocks.every(x=>x===null));
assert.equal(m.notes.length,16);assert(m.notes.every(row=>row.length===16&&row.every(x=>x===null)));
assert.deepStrictEqual(JSON.parse(JSON.stringify(c.normaliserPlockKo({pitch:999,start:-4,tone:33,autre:12}))),{pitch:127,start:0,tone:33});
assert.deepStrictEqual(JSON.parse(JSON.stringify(c.normaliserVerrousKo([{length:12},null,{tone:500}]))),[{length:12},null,{tone:127},null,null,null,null,null,null,null,null,null,null,null,null,null]);
const bornes=Array.from({length:16},()=>Array(16).fill(null));bornes[0][0]=24;bornes[0][1]=-24;bornes[0][2]=4;
assert.deepStrictEqual(JSON.parse(JSON.stringify(c.normaliserNotesKo([[30,-30,3.6]]))),bornes);
assert.equal(c.valeurPlockKo({pitch:80},'pitch',64),80);assert.equal(c.valeurPlockKo(null,'pitch',64),64);
assert.equal(c.normaliserSwingKo(-2),0);assert.equal(c.normaliserSwingKo(2),1);assert.equal(c.normaliserSwingKo('x'),0);
assert.equal(c.pourcentageSwingKo(0),50);assert.equal(c.pourcentageSwingKo(.5),63);assert.equal(c.pourcentageSwingKo(1),75);
c.KO.swing=.8;assert.equal(c.tempsSwingKo(0,2),2);assert(Math.abs(c.tempsSwingKo(1,2)-2.05)<1e-9);

c.KO.motifs[0].pas[0]=3;c.KO.motifs[0].notes[0][0]=5;c.KO.motifs[0].notes[0][1]=-3;c.KO.motifs[0].plocks[0]={pitch:80,tone:90};c.KO.fxTenu=false;c.motifKoCur=()=>c.KO.motifs[c.KO.cur];
c.voixKo=(t,k,v,p,n)=>c.notes.push({t,k,v,p,n});vm.runInContext(f('scheduleKo'),c);
c.scheduleKo(0,2);assert.equal(c.notes.length,1);assert.equal(c.notes[0].t,2);assert.equal(c.notes[0].p,0);assert.equal(c.notes[0].n,5);assert.equal(c.queue[0].i,0);assert.equal(c.queue[0].t,2);
c.notes=[];c.queue=[];c.scheduleKo(1,2);assert.equal(c.notes.length,1);assert(Math.abs(c.notes[0].t-2.05)<1e-9);assert.equal(c.notes[0].p,1);assert.equal(c.notes[0].n,-3);assert(Math.abs(c.queue[0].t-2.05)<1e-9);
c.notes=[];c.queue=[];c.KO.fxTenu=true;c.KO.fx=8;c.scheduleKo(1,2);assert.equal(c.notes.length,4);assert(c.notes.every(x=>x.p===1&&x.n===-3));assert(Math.abs(c.notes[0].t-2.05)<1e-9);assert(Math.abs(c.notes[3].t-(2.05+3*.125/4))<1e-9);

c.memoire={};c.sauverMachine=()=>{};vm.runInContext(f('memKo'),c);c.memKo();assert.deepStrictEqual(JSON.parse(JSON.stringify(c.memoire.ko.motifs[0].plocks[0])),{pitch:80,tone:90});assert.equal(c.memoire.ko.swing,.8);
c.memLire=()=>({motifs:[{pas:Array(16).fill(0),plocks:[{start:17},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]}]});vm.runInContext(f('chargerKo'),c);c.chargerKo();assert.equal(c.KO.swing,0);assert.equal(c.KO.motifs[0].plocks[0].start,17);assert.equal(c.KO.motifs[0].plocks[1],null);assert(c.KO.motifs[0].notes.every(row=>row.every(x=>x===null)));
c.memLire=()=>({chroma:true,chromaSource:6,swing:.6,motifs:[{notes:[[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]}]});c.chargerKo();assert.equal(c.KO.chroma,true);assert.equal(c.KO.chromaSource,6);assert.equal(c.KO.swing,.6);assert.equal(c.KO.motifs[0].notes[0][0],2);
console.log('PO-33 v228 : SWING 50-75 %, timing, sauvegarde/migration, CHROMA, Parameter Locks et ROULEMENT OK.');
