// v194 : vrais séquenceur et sauvegarde TR-1000, voix remplacées par un journal.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'../page/js/480-roland-tr-1000.js'),'utf8');
const copie=x=>JSON.parse(JSON.stringify(x));
function fonction(n){let i=source.indexOf('function '+n+'(');assert(i>=0);return source.slice(i,source.indexOf('\n}',i)+2);}
function setup(m){
 const c={S:{modele:'t1k',run:false},ctx:{},memoire:{t1k:m},cache:false,queue:[],voix:[],tirages:0,hasard:.49,charge:-1,
 Math:Object.create(Math),stepDur:()=>.12,ouvrirPas:()=>0,attenuerVoie(id,n){c.charge=n;},memLire(){return c.memoire.t1k;},sauverMachine(){},
 audioInit(){},maintenantAudio:()=>1,pasLePlusProche:()=>0,majT1k(){}};
 c.Math.random=()=>{c.tirages++;return c.hasard;};vm.createContext(c);
 vm.runInContext(source.slice(0,source.indexOf('/* ---------- interface ---------- */')),c);
 vm.runInContext(fonction('memT1k')+'\n'+fonction('chargerT1k'),c);
 c.voixT1k=(...x)=>c.voix.push(x);return c;
}
{
 const c=setup();const m=c.T1K.motifs[0];m.pas.fill(0);m.pas[0]=1;m.acc[0]=1;m.sub[0][0]=4;
 assert(m.prob.every(r=>r.every(x=>x===100)));
 c.scheduleT1k(0,2);assert.equal(c.voix.length,4);assert.equal(c.tirages,0);assert.equal(c.charge,4);
 assert.deepStrictEqual(copie(c.voix.map(x=>x[0])),[2,2.03,2.06,2.09]);
 assert.deepStrictEqual(copie(c.voix.map(x=>x[2])),[true,false,false,false]);
 c.voix=[];m.prob[0][0]=0;c.scheduleT1k(0,3);assert.equal(c.voix.length,0);assert.equal(c.tirages,0);assert.equal(c.charge,0);
 m.prob[0][0]=50;c.scheduleT1k(0,4);assert.equal(c.voix.length,4);assert.equal(c.tirages,1,'un seul tirage pour le roulement entier');
 c.voix=[];c.hasard=.5;c.scheduleT1k(0,5);assert.equal(c.voix.length,0);assert.equal(c.tirages,2);
 c.cache=true;c.hasard=.1;c.scheduleT1k(0,6);assert.equal(c.voix.length,4,'même règle en rendu hors ligne');
 c.voix=[];c.T1K.fill=true;m.prob.forEach(r=>r.fill(0));c.scheduleT1k(3,7);assert(c.voix.some(x=>x[1]===0),'FILL reste indépendant des probabilités du motif');
 c.voix=[];c.T1K.fill=false;c.S.run=true;c.T1K.rec=true;c.T1K.pos=0;
 c.frapperT1k(0,true);assert.equal(c.voix.length,1,'frappe directe toujours audible');assert.equal(m.prob[0][0],0,'REC sur un pas existant conserve sa probabilité');
 c.frapperT1k(1,false);assert.equal(m.prob[1][0],100,'nouveau pas REC toujours à 100%');
}
{
 const c=setup();c.T1K.motifs[2].prob[3][4]=25;c.memT1k();const saved=copie(c.memoire.t1k);
 c.T1K.motifs[2].prob[3][4]=0;assert.equal(c.memoire.t1k.motifs[2].prob[3][4],25,'snapshot sans alias');
 const d=setup(saved);d.chargerT1k();assert.equal(d.T1K.motifs[2].prob[3][4],25);
 d.T1K.motifs[2].prob[3][4]=75;assert.equal(saved.motifs[2].prob[3][4],25,'chargement sans alias');
 const old=copie(saved);old.motifs.forEach(m=>delete m.prob);d.memoire.t1k=old;d.chargerT1k();assert(d.T1K.motifs.every(m=>m.prob.every(r=>r.every(v=>v===100))),'migration à 100%');
 old.motifs[0].prob=[[0,25,-5,200,null,'50',NaN,50.4]];d.chargerT1k();
 assert.deepStrictEqual(copie(d.T1K.motifs[0].prob[0].slice(0,8)),[0,25,0,100,100,100,100,50]);
 assert.equal(d.T1K.motifs[0].prob[1][0],100);assert.equal(d.T1K.motifs[1].prob[0][0],100);
 assert(!d.poserProbabiliteT1k(10,0,50));assert(!d.poserProbabiliteT1k(0,16,50));assert(!d.poserProbabiliteT1k(.5,0,50));
 assert(d.poserProbabiliteT1k(0,0,75));assert.equal(d.T1K.motifs[0].prob[0][0],75);
}
console.log('TR-1000 v194 : probabilité, tirage unique, sous-pas, accent, FILL, REC, mémoire et migration OK.');
