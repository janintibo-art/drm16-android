const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'../page/js/560-pocket-operator-k-o.js'),'utf8');
const c={
  ctx:null,cache:false,queue:[],notes:[],memoire:{},
  ouvrirPas:()=>0,stepDur:()=>.125,attenuerVoie(){},audioInit(){},banqueEs(){},
  sauverMachine(){},memLire:()=>null,document:{querySelectorAll:()=>[]},
  debrancherTout(){},majKo(){},master:{},busSet:()=>null
};
vm.createContext(c);vm.runInContext(src,c);
const propre=x=>JSON.parse(JSON.stringify(x));
assert.equal(c.KO_FX.length,16);
assert.deepStrictEqual(propre(c.KO_FX.map(x=>x[0])),[
  'loop16','loop12','loopShort','loopTiny','unison','unisonLow','octaveUp','octaveDown',
  'stutter4','stutter3','scratch','scratchFast','six8','retrigger','reverse',''
]);
assert.equal(c.KO.fx,15);assert.equal(c.KO_PLOCKS.length,4);
const m=c.motifKo();assert.equal(m.pas.length,16);assert.equal(m.plocks.length,16);assert(m.plocks.every(x=>x===null));
assert.equal(m.notes.length,16);assert(m.notes.every(row=>row.length===16&&row.every(x=>x===null)));
assert.deepStrictEqual(propre(m.fx),Array(16).fill(-1));assert.deepStrictEqual(propre(m.fxOrigines),Array(16).fill(-1));
assert.deepStrictEqual(propre(c.normaliserEffetsKo([0,14,15,-2,3.6])),[0,14,-1,-1,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]);
assert.deepStrictEqual(propre(c.normaliserOriginesFxKo([5,99,4],c.normaliserEffetsKo([0,14,15]))),[5,15,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]);
assert.deepStrictEqual(propre(c.normaliserPlockKo({pitch:999,start:-4,tone:33,autre:12})),{pitch:127,start:0,tone:33});
assert.deepStrictEqual(propre(c.normaliserVerrousKo([{length:12},null,{tone:500}])),[{length:12},null,{tone:127},null,null,null,null,null,null,null,null,null,null,null,null,null]);
const bornes=Array.from({length:16},()=>Array(16).fill(null));bornes[0][0]=24;bornes[0][1]=-24;bornes[0][2]=4;
assert.deepStrictEqual(propre(c.normaliserNotesKo([[30,-30,3.6]])),bornes);
assert.equal(c.valeurPlockKo({pitch:80},'pitch',64),80);assert.equal(c.valeurPlockKo(null,'pitch',64),64);
assert.equal(c.normaliserSwingKo(-2),0);assert.equal(c.normaliserSwingKo(2),1);assert.equal(c.normaliserSwingKo('x'),0);
assert.equal(c.pourcentageSwingKo(0),50);assert.equal(c.pourcentageSwingKo(.5),63);assert.equal(c.pourcentageSwingKo(1),75);
c.KO.swing=.8;assert.equal(c.tempsSwingKo(0,2),2);assert(Math.abs(c.tempsSwingKo(1,2)-2.05)<1e-9);

c.KO.motifs[0]=c.motifKo();c.KO.cur=0;c.KO.motifs[0].pas[0]=3;
c.KO.motifs[0].notes[0][0]=5;c.KO.motifs[0].notes[0][1]=-3;c.KO.motifs[0].plocks[0]={pitch:80,tone:90};
c.motifKoCur=()=>c.KO.motifs[c.KO.cur];
c.voixKo=(t,k,v,p,n,o)=>c.notes.push({t,k,v,p,n,o:o||{}});
function reset(){c.notes=[];c.queue=[];}

c.KO.fxTenu=false;c.scheduleKo(0,2);assert.equal(c.notes.length,1);assert.equal(c.notes[0].t,2);assert.equal(c.notes[0].p,0);assert.equal(c.notes[0].n,5);
reset();c.scheduleKo(1,2);assert.equal(c.notes.length,1);assert(Math.abs(c.notes[0].t-2.05)<1e-9);assert.equal(c.notes[0].p,1);assert.equal(c.notes[0].n,-3);
/* Un effet écrit se relit sans maintenir FX et garde l'origine du geste. */
c.KO.motifs[0].fx[1]=0;c.KO.motifs[0].fxOrigines[1]=0;
reset();c.scheduleKo(1,2);assert.equal(c.notes.length,1);assert.equal(c.notes[0].p,0);assert.equal(c.notes[0].n,5);
/* Une origine absente retombe sur le début de la plage, jamais sur le pas 16. */
c.KO.motifs[0].fxOrigines[1]=-1;assert.equal(c.origineFxKo(1,c.KO.motifs[0],0),1);c.KO.motifs[0].fxOrigines[1]=0;
/* Le pad 16 tenu neutralise temporairement un effet sauvegardé. */
reset();c.KO.fxTenu=true;c.KO.fx=15;c.scheduleKo(1,2);assert.equal(c.notes.length,1);assert.equal(c.notes[0].p,1);assert.equal(c.notes[0].n,-3);
c.KO.fxTenu=false;c.KO.motifs[0].fx[1]=-1;c.KO.motifs[0].fxOrigines[1]=-1;

/* 1 : BOUCLE 1/16 fige le pas capturé. */
reset();c.KO.fxTenu=true;c.KO.fx=0;c.KO.fxStep=0;c.scheduleKo(1,2);assert.equal(c.notes.length,1);assert.equal(c.notes[0].p,0);assert.equal(c.notes[0].n,5);
/* 2 : la boucle ternaire produit trois impulsions sur quatre. */
reset();c.KO.fx=1;c.KO.fxStep=0;c.scheduleKo(1,2);assert.equal(c.notes.length,1);assert(Math.abs(c.notes[0].t-(2+.125/3))<1e-9);
reset();c.scheduleKo(3,2);assert.equal(c.notes.length,0);
/* 3/4 : répétitions courtes, puis 9/10 : stutters. */
reset();c.KO.fx=2;c.scheduleKo(0,2);assert.equal(c.notes.length,2);
reset();c.KO.fx=3;c.scheduleKo(0,2);assert.equal(c.notes.length,4);
reset();c.KO.fx=8;c.scheduleKo(1,2);assert.equal(c.notes.length,4);assert(c.notes.every(x=>x.p===1&&x.n===-3));
reset();c.KO.fx=9;c.scheduleKo(1,2);assert.equal(c.notes.length,3);
/* 5 à 8 : doublage et octaves. */
reset();c.KO.fx=4;c.scheduleKo(0,2);assert.equal(c.notes.length,2);assert.deepStrictEqual(c.notes.map(x=>x.o.detune),[-11,11]);
reset();c.KO.fx=5;c.scheduleKo(0,2);assert.equal(c.notes.length,2);assert.equal(c.notes[1].o.transpose,-12);
reset();c.KO.fx=6;c.scheduleKo(0,2);assert.equal(c.notes.length,1);assert.equal(c.notes[0].o.transpose,12);
reset();c.KO.fx=7;c.scheduleKo(0,2);assert.equal(c.notes[0].o.transpose,-12);
/* 11/12 : alternance avant/arrière ; 13 : grille 6/8 sans swing. */
reset();c.KO.fx=10;c.scheduleKo(0,2);assert.equal(c.notes.length,2);assert.equal(c.notes[1].o.reverse,true);
reset();c.KO.fx=11;c.scheduleKo(0,2);assert.equal(c.notes.length,4);assert.deepStrictEqual(c.notes.map(x=>!!x.o.reverse),[false,true,false,true]);
reset();c.KO.fx=12;c.KO.fxStep=0;c.scheduleKo(1,2);assert.equal(c.notes.length,1);assert(Math.abs(c.notes[0].t-(2+.125/3))<1e-9);
reset();c.scheduleKo(3,2);assert.equal(c.notes.length,0);
/* 14 : redémarrage depuis le pas 1 ; 15 : tampon inversé ; 16 : neutre. */
reset();c.KO.fx=13;c.KO.fxStep=1;c.scheduleKo(1,2);assert.equal(c.notes[0].p,0);assert.equal(c.notes[0].n,5);
reset();c.KO.fx=14;c.scheduleKo(0,2);assert.equal(c.notes[0].o.reverse,true);
reset();c.KO.fx=15;c.scheduleKo(1,2);assert.equal(c.notes.length,1);assert.equal(c.notes[0].p,1);assert(!c.notes[0].o.reverse);
/* WRITE mémorise la plage et son ancre ; SANS EFFET efface seulement les pas traversés. */
c.KO.fxWriteStart=4;c.KO.fx=14;c.KO.fxWriteDirty=false;
assert(c.ecrireFxKoPas(4));assert(c.ecrireFxKoPas(5));
assert.equal(c.KO.motifs[0].fx[4],14);assert.equal(c.KO.motifs[0].fxOrigines[5],4);assert(c.KO.fxWriteDirty);
c.KO.fx=15;assert(c.ecrireFxKoPas(5));assert.equal(c.KO.motifs[0].fx[5],-1);assert.equal(c.KO.motifs[0].fxOrigines[5],-1);

c.memKo();assert.deepStrictEqual(propre(c.memoire.ko.motifs[0].plocks[0]),{pitch:80,tone:90});assert.equal(c.memoire.ko.swing,.8);
assert.equal(c.memoire.ko.motifs[0].fx[4],14);assert.equal(c.memoire.ko.motifs[0].fxOrigines[4],4);
c.memLire=()=>({motifs:[{pas:Array(16).fill(0),plocks:[{start:17},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]}]});
c.chargerKo();assert.equal(c.KO.swing,0);assert.equal(c.KO.motifs[0].plocks[0].start,17);assert.equal(c.KO.motifs[0].plocks[1],null);assert(c.KO.motifs[0].notes.every(row=>row.every(x=>x===null)));
assert(c.KO.motifs[0].fx.every(x=>x===-1));assert(c.KO.motifs[0].fxOrigines.every(x=>x===-1));
c.memLire=()=>({chroma:true,chromaSource:6,swing:.6,motifs:[{notes:[[2],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],fx:[6],fxOrigines:[0]}]});
c.chargerKo();assert.equal(c.KO.chroma,true);assert.equal(c.KO.chromaSource,6);assert.equal(c.KO.swing,.6);assert.equal(c.KO.motifs[0].notes[0][0],2);
assert.equal(c.KO.motifs[0].fx[0],6);assert.equal(c.KO.motifs[0].fxOrigines[0],0);
console.log('PO-33 v231 : effets live et écrits, SWING, CHROMA, Parameter Locks et migrations OK.');
