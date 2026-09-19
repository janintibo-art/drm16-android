const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'../page/js/560-pocket-operator-k-o.js'),'utf8');
function f(n){const i=src.indexOf('function '+n+'(');assert(i>=0,n);return src.slice(i,src.indexOf('\n}',i)+2);}
const c={KO_FX:[],KO_NOTES:[],ctx:null,cache:false,queue:[],notes:[],ouvrirPas:()=>0,stepDur:()=>.125,attenuerVoie(){},audioInit(){},banqueEs(){},normaliserPlockKo:null};
vm.createContext(c);
vm.runInContext(src.slice(src.indexOf('var KO_FX ='),src.indexOf('function noeudsKo(')),c);
assert.equal(c.KO_PLOCKS.length,4);
const m=c.motifKo();assert.equal(m.pas.length,16);assert.equal(m.plocks.length,16);assert(m.plocks.every(x=>x===null));
assert.deepStrictEqual(JSON.parse(JSON.stringify(c.normaliserPlockKo({pitch:999,start:-4,tone:33,autre:12}))),{pitch:127,start:0,tone:33});
assert.deepStrictEqual(JSON.parse(JSON.stringify(c.normaliserVerrousKo([{length:12},null,{tone:500}]))),[{length:12},null,{tone:127},null,null,null,null,null,null,null,null,null,null,null,null,null]);
assert.equal(c.valeurPlockKo({pitch:80},'pitch',64),80);assert.equal(c.valeurPlockKo(null,'pitch',64),64);

c.KO.motifs[0].pas[0]=1;c.KO.motifs[0].plocks[0]={pitch:80,tone:90};c.KO.fxTenu=false;c.motifKoCur=()=>c.KO.motifs[c.KO.cur];
c.voixKo=(t,k,v,p)=>c.notes.push({t,k,v,p});vm.runInContext(f('scheduleKo'),c);
c.scheduleKo(0,2);assert.equal(c.notes.length,1);assert.equal(c.notes[0].p,0);assert.equal(c.queue[0].i,0);
c.notes=[];c.KO.fxTenu=true;c.KO.fx=8;c.scheduleKo(0,2);assert.equal(c.notes.length,4);assert(c.notes.every(x=>x.p===0));

c.memoire={};c.sauverMachine=()=>{};vm.runInContext(f('memKo'),c);c.memKo();assert.deepStrictEqual(JSON.parse(JSON.stringify(c.memoire.ko.motifs[0].plocks[0])),{pitch:80,tone:90});
c.memLire=()=>({motifs:[{pas:Array(16).fill(0),plocks:[{start:17},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]}]});vm.runInContext(f('chargerKo'),c);c.chargerKo();assert.equal(c.KO.motifs[0].plocks[0].start,17);assert.equal(c.KO.motifs[0].plocks[1],null);
console.log('PO-33 v226 : Parameter Locks pitch/start/length/tone, migration, sauvegarde, pas courant et ROULEMENT OK.');
