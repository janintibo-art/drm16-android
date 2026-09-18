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
{
 const c=setup();c.majKnobsT1k=()=>{};c.signal=()=>{};
 assert.equal(c.T1K.motifs.length,128);assert.equal(c.T1K.motifs[16].pas[0],0,'nouvelle banque vierge');
 const anciens=Array.from({length:16},()=>copie(c.motifT1k(9)));
 anciens[3].pas[2]=17;anciens[3].acc[2]=16;anciens[3].sub[2][4]=3;anciens[3].prob[2][4]=25;anciens[3].instr[2].niv=.23;
 c.memoire.t1k={cur:3,banq:5,sel:2,motifs:anciens};c.chargerT1k();
 assert.equal(c.T1K.banq,5);assert.equal(c.motifT1kCur().pas[2],17);
 for(let b=0;b<8;b++)assert.deepStrictEqual(copie(c.T1K.motifs[b*16+3]),anciens[3]);
 assert(c.choisirMotifT1k(1,3));let m=c.motifT1kCur();m.pas[2]=1;m.sub[2][4]=4;m.prob[2][4]=75;m.instr[2].niv=.81;
 assert.equal(c.T1K.motifs[3].pas[2],17);assert.equal(c.T1K.motifs[3].sub[2][4],3);assert.equal(c.T1K.motifs[3].prob[2][4],25);assert.equal(c.T1K.motifs[3].instr[2].niv,.23);
 c.memT1k();const saved=copie(c.memoire.t1k);m.pas[2]=0;m.sub[2][4]=1;assert.equal(c.memoire.t1k.motifs[19].pas[2],1);assert.equal(c.memoire.t1k.motifs[19].sub[2][4],4);
 const d=setup(saved);d.chargerT1k();assert.equal(d.T1K.motifs.length,128);assert.equal(d.T1K.banq,1);assert.equal(d.motifT1kCur().prob[2][4],75);
 assert.equal(d.T1K.motifs[3].prob[2][4],25);assert.equal(saved.motifs[19].sub[2][4],4);
 c.S.run=true;assert(!c.choisirMotifT1k(7,15));assert.equal(c.T1K.banq,1);c.S.run=false;
 for(const [b,k] of [[8,0],[-1,0],[0,16],[1.5,0]])assert(!c.choisirMotifT1k(b,k));
 assert(c.choisirMotifT1k(7,15));assert.strictEqual(c.motifT1kCur(),c.T1K.motifs[127]);
 c.memoire.t1k={cur:NaN,banq:Infinity,sel:999,motifs:Array(128).fill(null)};c.chargerT1k();assert.equal(c.T1K.cur,0);assert.equal(c.T1K.banq,0);assert.equal(c.T1K.sel,9);assert(c.T1K.motifs.every(m=>m.prob[0][0]===100));
}
console.log('TR-1000 v195 : 128 motifs, migration des 16 partagés, indépendance, sauvegarde et sélection protégée OK.');
{
 const c=setup();c.majKnobsT1k=()=>{};c.signal=()=>{};
 assert.deepStrictEqual([0,1,2,3,4,5,6,7,8,9].map(i=>c.pasDirectionT1k('pingpong',i,4)),[0,1,2,3,2,1,0,1,2,3]);
 assert.deepStrictEqual([0,1,2,3,4].map(i=>c.pasDirectionT1k('arriere',i,4)),[3,2,1,0,3]);
 assert.equal(c.pasDirectionT1k('pingpong',100,1),0);
 const m=c.motifT1kCur();m.last=4;m.pas.fill(0);m.pas[0]=15;m.direction[0]='arriere';m.acc[0]=8;
 m.sub[0][3]=3;m.prob[0][2]=0;
 c.scheduleT1k(0,2);assert.equal(c.voix.length,3);assert(c.voix[0][2]);assert(!c.voix[1][2]);
 c.scheduleT1k(1,2.12);assert.equal(c.voix.length,3,'probabilité du pas source, pas celle de l’horloge');
 let now=1;c.maintenantAudio=()=>now;c.validerLectureT1k();assert.equal(c.T1K.entendu,null,'pas de curseur avant le son');
 now=2;c.validerLectureT1k();assert.equal(c.T1K.entendu.positions[0],3);
 now=2.07;assert.equal(c.pasEnregistreT1k(0),2,'REC avance dans le sens arrière');
 now=2.12;c.validerLectureT1k();assert.equal(c.T1K.entendu.positions[0],2);
 c.resetLectureT1k();assert.equal(c.T1K.departs.length,0);assert.equal(c.T1K.tour,-1);assert.equal(c.T1K.entendu,null);
 m.direction[0]='pingpong';m.prob[0].fill(100);c.voix=[];c.ctx={startRendering(){}};
 let lus=[];c.voixT1k=(t,k,a)=>{if(k===0)lus.push(c.T1K.tour*4);};
 for(let i=0;i<12;i++)c.scheduleT1k(i%4,3+i*.12);
 assert.equal(c.T1K.departs.length,0,'pas de file visuelle en rendu hors ligne');
 c.memT1k();let saved=copie(c.memoire.t1k);assert.equal(saved.motifs[0].direction[0],'pingpong');
 m.direction[0]='avant';assert.equal(c.memoire.t1k.motifs[0].direction[0],'pingpong');
 const d=setup(saved);d.chargerT1k();assert.equal(d.motifT1kCur().direction[0],'pingpong');
 delete saved.motifs[0].direction;d.memoire.t1k=saved;d.chargerT1k();assert(d.motifT1kCur().direction.every(x=>x==='avant'));
 c.S.run=true;assert(!c.choisirDirectionT1k('arriere'));c.S.run=false;assert(c.choisirDirectionT1k('arriere'));
}
console.log('TR-1000 v196 : directions, pas source, curseur audio, REC, reset et sauvegarde OK.');

{
 const c=setup(),m=c.motifT1kCur();m.last=4;m.pas.fill(0);m.pas[0]=1;m.sub[0][0]=3;m.cycle[0][0]='2:4';m.prob[0][0]=50;
 const tours=[];for(let tour=0;tour<8;tour++){c.voix=[];for(let i=0;i<4;i++)c.scheduleT1k(i,2+tour+i*.12);if(c.voix.length){assert.equal(c.voix.length,3);tours.push(tour+1);}}
 assert.deepStrictEqual(tours,[2,6]);assert.equal(c.tirages,2,'aucun tirage sur les tours refusés');
 c.resetLectureT1k();c.voix=[];c.scheduleT1k(0,20);assert.equal(c.voix.length,0,'reset au premier tour');
 for(const sens of ['arriere','pingpong']){c.resetLectureT1k();m.direction[0]=sens;c.voix=[];for(let i=0;i<32;i++)c.scheduleT1k(i%4,30+i*.12);assert(c.voix.length>0,sens);}
 c.memT1k();m.cycle[0][0]='1:1';assert.equal(c.memoire.t1k.motifs[0].cycle[0][0],'2:4');c.chargerT1k();assert.equal(c.motifT1kCur().cycle[0][0],'2:4');
 const ancien=copie(c.memoire.t1k);ancien.motifs.forEach(m=>delete m.cycle);c.memoire.t1k=ancien;c.chargerT1k();assert(c.T1K.motifs.every(m=>m.cycle.every(r=>r.every(v=>v==='1:1'))));
 for(const v of [null,{},'0:4','5:4','1:8',4])assert.equal(c.cycleT1k(v),'1:1');
 console.log('TR-1000 v197 : cycles, sous-pas, probabilité, reset, directions, mémoire et migration OK.');
}
{
 const c=setup(),m=c.motifT1kCur();m.pas.fill(0);m.pas[0]=1;m.sub[0][0]=4;m.retard[0][0]=8;
 c.scheduleT1k(0,2);assert.deepStrictEqual(copie(c.voix.map(v=>+v[0].toFixed(3))),[2.06,2.09,2.12,2.15]);
 m.direction[0]='arriere';m.last=4;c.resetLectureT1k();c.voix=[];for(let i=0;i<4;i++)c.scheduleT1k(i,3+i*.12);assert.equal(+c.voix[0][0].toFixed(3),3.42);
 c.memT1k();m.retard[0][0]=0;assert.equal(c.memoire.t1k.motifs[0].retard[0][0],8);c.chargerT1k();assert.equal(c.motifT1kCur().retard[0][0],8);
 c.memoire.t1k.motifs.forEach(m=>delete m.retard);c.chargerT1k();assert(c.T1K.motifs.every(m=>m.retard.every(r=>r.every(v=>v===0))));
 for(const v of [-1,3,16,'8',null])assert.equal(c.retardT1k(v),0);
 c.T1K.fill=true;c.motifT1kCur().retard.forEach(r=>r.fill(8));c.voix=[];c.scheduleT1k(3,5);assert(c.voix.length);assert(c.voix.every(v=>v[0]===5));
 console.log('TR-1000 v198 : retard, sous-pas, direction, mémoire, migration et FILL OK.');
}
{
 const c=setup();c.signal=()=>{};c.majKnobsT1k=()=>{};let accepte=false,questions=0;c.window={confirm:()=>{questions++;return accepte;}};
 const m=c.motifT1kCur();m.retard[0][0]=8;m.cycle[0][0]='2:4';m.direction[0]='arriere';m.prob[0][0]=25;m.instr[0].ech='b7';m.muet[3]=true;
 const attendu=copie(m);assert(c.copierMotifT1k());m.pas[0]=0;m.retard[0][0]=0;c.T1K.banq=7;c.T1K.cur=15;
 const avant=copie(c.motifT1kCur());assert(!c.collerMotifT1k());assert.deepStrictEqual(copie(c.motifT1kCur()),avant);
 accepte=true;assert(c.collerMotifT1k());assert.deepStrictEqual(copie(c.motifT1kCur()),attendu);
 c.motifT1kCur().instr[0].ech='b9';c.motifT1kCur().retard[0][0]=0;c.T1K.cur=14;assert(c.collerMotifT1k());assert.deepStrictEqual(copie(c.motifT1kCur()),attendu);
 c.S.run=true;const q=questions;assert(!c.collerMotifT1k());assert(!c.copierMotifT1k());assert.equal(questions,q);
 c.S.run=false;c.memT1k();c.chargerT1k();assert.equal(c.T1K.copie,null);assert.deepStrictEqual(copie(c.T1K.motifs[126]),attendu);assert(!c.collerMotifT1k());
 console.log('TR-1000 v199 : copie complète, annulation, indépendance, répétition, protection PLAY et sauvegarde OK.');
}
{
 const c=setup();c.signal=()=>{};const m=c.motifT1kCur();m.pas.fill(0);m.pas[0]=1;m.pas[1]=1;m.sub[0][0]=4;
 const pas=copie(m.pas);c.basculerMuetT1k();c.scheduleT1k(0,2);assert.deepStrictEqual(copie(c.voix.map(v=>v[1])),[1]);assert.deepStrictEqual(copie(m.pas),pas);
 c.voix=[];c.frapperT1k(0,false);assert.equal(c.voix.length,1,'pad direct audible');
 c.T1K.fill=true;c.voix=[];c.scheduleT1k(3,3);assert(!c.voix.some(v=>v[1]===0));c.T1K.fill=false;
 c.memT1k();m.muet[0]=false;assert.equal(c.memoire.t1k.motifs[0].muet[0],true);c.chargerT1k();assert.equal(c.motifT1kCur().muet[0],true);
 c.S.run=true;c.basculerMuetT1k();assert.equal(c.motifT1kCur().muet[0],false);c.voix=[];c.scheduleT1k(0,4);assert.equal(c.voix.filter(v=>v[1]===0).length,4);
 c.memoire.t1k.motifs.forEach(m=>delete m.muet);c.chargerT1k();assert(c.T1K.motifs.every(m=>m.muet.every(v=>v===false)));
 console.log('TR-1000 v202 : mute indépendant, pads directs, FILL, mémoire, migration et réactivation en lecture OK.');
}
{
 const c=setup();c.signal=()=>{};let m=c.motifT1kCur();m.pas.fill(1);m.muet[0]=true;c.basculerSoloT1k();
 c.scheduleT1k(0,2);assert.deepStrictEqual(copie(c.voix.map(v=>v[1])),[0]);assert(m.muet[0]);
 c.basculerMuetT1k();assert(m.muet[0],'mute protégé pendant solo');
 c.T1K.sel=1;c.basculerSoloT1k();c.voix=[];c.scheduleT1k(0,3);assert.deepStrictEqual(copie(c.voix.map(v=>v[1])),[1]);
 c.memT1k();m.solo=-1;assert.equal(c.memoire.t1k.motifs[0].solo,1);c.chargerT1k();m=c.motifT1kCur();assert.equal(m.solo,1);
 c.S.run=true;c.basculerSoloT1k();assert.equal(m.solo,-1);assert(m.muet[0]);c.voix=[];c.scheduleT1k(0,4);assert.equal(c.voix.length,9);assert(!c.voix.some(v=>v[1]===0));
 for(const valeur of [undefined,null,10,-2,'1',1.5]){const o=copie(m);o.solo=valeur;assert.equal(c.lireMotifT1k(o).solo,-1);}
 m.solo=3;assert.equal(c.lireMotifT1k(m).solo,3,'copie du solo');
 console.log('TR-1000 v203 : solo prioritaire, déplacement, restauration des mutes, mémoire et validation OK.');
}
{
 const c=setup(),m=c.motifT1kCur();m.pas.fill(0);m.pas[0]=1;m.last=4;m.direction[0]='arriere';m.sub[0][0]=3;
 assert(c.poserReglageT1k(0,0,'niv',0));assert(c.poserReglageT1k(0,0,'tune',.75));assert.equal(c.valeurPasT1k(0,'niv',m.reglages[0][0]),0);
 const base=m.instr[0].tune;c.T1K.mA=m.instr.map(x=>({...x,tune:.1}));c.T1K.mB=m.instr.map(x=>({...x,tune:.9}));c.T1K.morph=.5;
 assert.equal(c.valeurPasT1k(0,'tune',m.reglages[0][0]),.75);assert.equal(c.valeurPasT1k(0,'tune',null),.5);assert.equal(m.instr[0].tune,base);
 for(let i=0;i<4;i++)c.scheduleT1k(i,2+i*.12);assert.equal(c.voix.length,3);assert(c.voix.every(v=>v[3].niv===0&&v[3].tune===.75));
 c.memT1k();c.poserReglageT1k(0,0,'niv',null);assert.equal(m.reglages[0][0].tune,.75);assert.equal(c.memoire.t1k.motifs[0].reglages[0][0].niv,0);
 c.chargerT1k();assert.equal(c.motifT1kCur().reglages[0][0].niv,0);const copieMotif=c.lireMotifT1k(c.motifT1kCur());copieMotif.reglages[0][0].tune=0;assert.equal(c.motifT1kCur().reglages[0][0].tune,.75);
 assert(!c.poserReglageT1k(10,0,'niv',.5));assert(!c.poserReglageT1k(0,0,'inconnu',.5));assert(!c.poserReglageT1k(0,0,'niv',NaN));
 assert.deepStrictEqual(copie(c.lireReglagesT1k({tune:2,dec:-1,niv:'1',mix:null})),{tune:1,dec:0});
 c.memoire.t1k.motifs.forEach(m=>delete m.reglages);c.chargerT1k();assert(c.T1K.motifs.every(m=>m.reglages.every(r=>r.every(v=>v===null))));
 console.log('TR-1000 v204 : paramètres source, sous-pas, priorité morph, effacement ciblé, mémoire et migration OK.');
}
{
 const c=setup(),m=c.motifT1kCur();m.last=4;m.direction[0]='arriere';c.T1K.motionRec=true;c.S.run=true;c.maintenantAudio=()=>2;
 assert(!c.enregistrerGesteT1k(0,'tune',.2),'pas encore entendu');c.scheduleT1k(0,2);c.validerLectureT1k();
 assert(c.enregistrerGesteT1k(0,'tune',.2));assert.equal(m.reglages[0][3].tune,.2);
 c.maintenantAudio=()=>2.07;assert(c.enregistrerGesteT1k(0,'tune',.8));assert.equal(m.reglages[0][2].tune,.8);
 assert(c.enregistrerGesteT1k(0,'dec',.4));assert.equal(m.reglages[0][2].dec,.4);
 c.T1K.fill=true;assert(!c.enregistrerGesteT1k(0,'tune',.1));c.T1K.fill=false;
 c.ctx.startRendering=()=>{};assert(!c.enregistrerGesteT1k(0,'tune',.1));delete c.ctx.startRendering;
 c.S.run=false;assert(!c.enregistrerGesteT1k(0,'tune',.1));c.S.run=true;c.T1K.motionRec=false;assert(!c.enregistrerGesteT1k(0,'tune',.1));
 c.memT1k();c.T1K.motionRec=true;c.chargerT1k();assert(!c.T1K.motionRec);assert.equal(c.motifT1kCur().reglages[0][2].tune,.8);
 console.log('TR-1000 v205 : gestes sur pas entendu, quantification arrière, paramètres multiples, garde-fous et mémoire OK.');
}
