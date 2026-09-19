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
 const old=copie(saved);old.motifs.forEach(m=>m&&delete m.prob);d.memoire.t1k=old;d.chargerT1k();assert(d.T1K.motifs.every(m=>m.prob.every(r=>r.every(v=>v===100))),'migration à 100%');
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
 const ancien=copie(c.memoire.t1k);ancien.motifs.forEach(m=>m&&delete m.cycle);c.memoire.t1k=ancien;c.chargerT1k();assert(c.T1K.motifs.every(m=>m.cycle.every(r=>r.every(v=>v==='1:1'))));
 for(const v of [null,{},'0:4','5:4','1:8',4])assert.equal(c.cycleT1k(v),'1:1');
 console.log('TR-1000 v197 : cycles, sous-pas, probabilité, reset, directions, mémoire et migration OK.');
}
{
 const c=setup(),m=c.motifT1kCur();m.pas.fill(0);m.pas[0]=1;m.sub[0][0]=4;m.retard[0][0]=8;
 c.scheduleT1k(0,2);assert.deepStrictEqual(copie(c.voix.map(v=>+v[0].toFixed(3))),[2.06,2.09,2.12,2.15]);
 m.direction[0]='arriere';m.last=4;c.resetLectureT1k();c.voix=[];for(let i=0;i<4;i++)c.scheduleT1k(i,3+i*.12);assert.equal(+c.voix[0][0].toFixed(3),3.42);
 c.memT1k();m.retard[0][0]=0;assert.equal(c.memoire.t1k.motifs[0].retard[0][0],8);c.chargerT1k();assert.equal(c.motifT1kCur().retard[0][0],8);
 c.memoire.t1k.motifs.forEach(m=>m&&delete m.retard);c.chargerT1k();assert(c.T1K.motifs.every(m=>m.retard.every(r=>r.every(v=>v===0))));
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
 c.memoire.t1k.motifs.forEach(m=>m&&delete m.muet);c.chargerT1k();assert(c.T1K.motifs.every(m=>m.muet.every(v=>v===false)));
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
 c.memoire.t1k.motifs.forEach(m=>m&&delete m.reglages);c.chargerT1k();assert(c.T1K.motifs.every(m=>m.reglages.every(r=>r.every(v=>v===null))));
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
{
 const c=setup();c.signal=()=>{};let ok=false;c.window={confirm:()=>ok};const m=c.motifT1kCur();m.pas.fill(0);m.pas[0]=1;m.reglages[0][0]={niv:0,tune:.7};m.reglages[1][2]={dec:.2};const notes=copie(m.pas),base=copie(m.instr);
 c.basculerMotionT1k();assert(!m.motionActive);c.scheduleT1k(0,2);assert.equal(c.voix[0][3],null);assert.equal(m.reglages[0][0].niv,0);
 c.basculerMotionT1k();c.voix=[];c.scheduleT1k(0,3);assert.equal(c.voix[0][3].niv,0);
 assert(!c.effacerVariationsT1k());assert.equal(m.reglages[0][0].tune,.7);ok=true;c.S.run=true;assert(!c.effacerVariationsT1k());c.S.run=false;c.T1K.motionRec=true;
 assert(c.effacerVariationsT1k());assert(!c.T1K.motionRec);assert(m.reglages[0].every(v=>v===null));assert.equal(m.reglages[1][2].dec,.2);assert.deepStrictEqual(copie(m.pas),notes);assert.deepStrictEqual(copie(m.instr),base);
 c.basculerMotionT1k();c.memT1k();c.chargerT1k();assert(!c.motifT1kCur().motionActive);assert.equal(c.lireMotifT1k({}).motionActive,true);assert.equal(c.lireMotifT1k(c.motifT1kCur()).motionActive,false);
 console.log('TR-1000 v206 : bypass réversible, effacement ciblé et confirmé, protection PLAY, mémoire et migration OK.');
}
{
 const c=setup();c.signal=()=>{};const m=c.motifT1kCur();m.last=4;m.longueurs[0]=3;m.longueurs[1]=7;m.pas.fill(0);
 for(const sens of ['avant','arriere','pingpong']){
   c.resetLectureT1k();m.direction[0]=sens;
   for(let i=0;i<12;i++)c.scheduleT1k(i%4,2+i*.12);
   const p=copie(c.T1K.departs.map(e=>e.positions[0]));
   const attendu=sens==='avant'?[0,1,2,0,1,2,0,1,2,0,1,2]:sens==='arriere'?[2,1,0,2,1,0,2,1,0,2,1,0]:[0,1,2,1,0,1,2,1,0,1,2,1];
   assert.deepStrictEqual(p,attendu);assert.deepStrictEqual(copie(c.T1K.departs.map(e=>e.positions[1])),[0,1,2,3,4,5,6,0,1,2,3,4]);
 }
 m.direction[0]='avant';c.maintenantAudio=()=>2.48;c.resetLectureT1k();for(let i=0;i<5;i++)c.scheduleT1k(i%4,2+i*.12);assert.equal(c.pasEnregistreT1k(0),1);
 c.T1K.motionRec=true;c.S.run=true;assert(c.enregistrerGesteT1k(0,'tune',.7));assert.equal(m.reglages[0][1].tune,.7);
 assert(!c.choisirLongueurT1k(5));assert.equal(m.longueurs[0],3);c.S.run=false;assert(c.choisirLongueurT1k(1));assert.equal(c.longueurInstrumentT1k(m,0),1);
 c.memT1k();m.longueurs[0]=9;assert.equal(c.memoire.t1k.motifs[0].longueurs[0],1);c.chargerT1k();assert.equal(c.motifT1kCur().longueurs[0],1);
 assert.equal(c.lireMotifT1k({last:4}).longueurs[0],0);assert.equal(c.longueurInstrumentT1k(c.lireMotifT1k({last:4}),0),4);
 for(const v of [-1,17,null,'3',3.5])assert.equal(c.longueurPisteT1k(v),0);
 console.log('TR-1000 v207 : longueurs 3/7 sur transport 4, directions, REC/MOTION, protection PLAY, mémoire et migration OK.');
}
{
 const c=setup();c.signal=()=>{};const m=c.motifT1kCur(),notes=copie(m.pas);
 assert(c.renommerMotifT1k('  Intro   été  '));assert.equal(m.nom,'Intro été');assert.deepStrictEqual(copie(m.pas),notes);
 c.T1K.banq=7;c.T1K.cur=15;assert(c.renommerMotifT1k('Break'));assert.equal(c.T1K.motifs[0].nom,'Intro été');
 c.S.run=true;assert(!c.renommerMotifT1k('Interdit'));assert.equal(c.motifT1kCur().nom,'Break');c.S.run=false;
 c.memT1k();c.chargerT1k();assert.equal(c.motifT1kCur().nom,'Break');assert.equal(c.T1K.motifs[0].nom,'Intro été');
 assert.equal(c.lireMotifT1k(c.motifT1kCur()).nom,'Break');assert.equal(c.lireMotifT1k({}).nom,'');assert.equal(c.nomMotifT1k(123),'');
 assert.equal(Array.from(c.nomMotifT1k('🎵'.repeat(30))).length,24);assert.equal(c.nomMotifT1k('<b>Intro</b>'),'<b>Intro</b>');
 assert(c.renommerMotifT1k(''));assert.equal(c.motifT1kCur().nom,'');assert.equal(c.T1K.motifs[0].nom,'Intro été');
 console.log('TR-1000 v209 : noms, banques indépendantes, longueur Unicode, protection PLAY, mémoire et migration OK.');
}
{
 const c=setup();c.signal=()=>{};c.majKnobsT1k=()=>{};let accepte=true;c.window={confirm:()=>accepte};
 const origine=copie(c.motifT1kCur());c.copierMotifT1k();c.T1K.banq=7;c.T1K.cur=15;
 const cible=c.motifT1kCur();cible.nom='Avant';cible.reglages[2][3]={niv:.7};cible.longueurs[2]=3;cible.muet[0]=true;const avant=copie(cible);
 assert(c.collerMotifT1k());assert(c.annulationDisponibleT1k());assert.deepStrictEqual(copie(c.motifT1kCur()),origine);
 c.motifT1kCur().nom='Après';accepte=false;assert(!c.annulerModificationT1k());assert.equal(c.motifT1kCur().nom,'Après');accepte=true;
 c.T1K.cur=14;assert(!c.annulerModificationT1k());c.T1K.cur=15;c.S.run=true;assert(!c.annulerModificationT1k());c.S.run=false;
 assert(c.annulerModificationT1k());assert.deepStrictEqual(copie(c.motifT1kCur()),avant);assert.equal(c.T1K.annulation,null);assert.deepStrictEqual(copie(c.memoire.t1k.motifs[127]),avant);
 c.T1K.sel=2;assert(c.effacerVariationsT1k());assert.equal(c.motifT1kCur().reglages[2][3],null);assert(c.annulerModificationT1k());assert.deepStrictEqual(copie(c.motifT1kCur()),avant);
 assert(c.effacerVariationsT1k());c.memT1k();c.chargerT1k();assert.equal(c.T1K.annulation,null);assert.equal(c.motifT1kCur().reglages[2][3],null);
 console.log('TR-1000 v210 : annuler collage/effacement, confirmation, bonne destination, garde PLAY, restauration complète et mémoire OK.');
}
{
 const c=setup();c.signal=()=>{};c.majKnobsT1k=()=>{};c.window={confirm:()=>true};const m=c.motifT1kCur();
 m.longueurs[0]=3;m.direction[0]='arriere';m.pas[0]=1|256;m.acc[0]=4|256;
 for(let j=0;j<16;j++){m.sub[0][j]=j%4+1;m.prob[0][j]=j*5;m.cycle[0][j]=(j%4+1)+':4';m.retard[0][j]=[0,1,2,4,8][j%5];m.reglages[0][j]={tune:j/16};}
 const avant=copie(m);c.T1K.motionRec=true;assert(c.tournerSequenceT1k(1));assert(!c.T1K.motionRec);
 assert.equal(m.pas[0],2|256);assert.equal(m.acc[0],1|256);
 for(const nom of ['sub','prob','cycle','retard','reglages']){
  for(let j=0;j<3;j++)assert.deepStrictEqual(copie(m[nom][0][(j+1)%3]),avant[nom][0][j]);
  assert.deepStrictEqual(copie(m[nom][0].slice(3)),avant[nom][0].slice(3));
  assert.deepStrictEqual(copie(m[nom].slice(1)),avant[nom].slice(1));
 }
 assert.deepStrictEqual(copie(m.instr),avant.instr);assert.equal(m.direction[0],'arriere');
 assert.deepStrictEqual(copie(c.T1K.annulation.motif),avant);assert.deepStrictEqual(copie(c.memoire.t1k.motifs[0]),copie(m));
 assert(c.tournerSequenceT1k(-1));assert.deepStrictEqual(copie(m),avant);
 assert(c.tournerSequenceT1k(1));assert(c.annulerModificationT1k());assert.deepStrictEqual(copie(c.motifT1kCur()),avant);
 const n=c.motifT1kCur();n.longueurs[0]=16;n.pas[0]=32768;assert(c.tournerSequenceT1k(1));assert.equal(n.pas[0],1);assert(c.tournerSequenceT1k(-1));assert.equal(n.pas[0],32768);
 n.longueurs[0]=1;const annulation=c.T1K.annulation;assert(!c.tournerSequenceT1k(1));assert.strictEqual(c.T1K.annulation,annulation);
 n.longueurs[0]=3;const bloque=copie(n);c.S.run=true;assert(!c.tournerSequenceT1k(1));c.S.run=false;assert(!c.tournerSequenceT1k(0));assert.deepStrictEqual(copie(n),bloque);
 c.memT1k();c.chargerT1k();assert.deepStrictEqual(copie(c.motifT1kCur()),bloque);
 console.log('TR-1000 v211 : rotations, métadonnées, limites 1/3/16, pistes préservées, annulation, mémoire et protection PLAY OK.');
}
{
 const c=setup();c.signal=()=>{};c.majKnobsT1k=()=>{};let accepte=false;c.window={confirm:()=>accepte};
 assert(!c.collerSequenceT1k());const m=c.motifT1kCur();m.last=7;m.longueurs[0]=0;m.pas[0]=32769;m.acc[0]=1;m.reglages[0][0]={tune:.7};m.direction[0]='pingpong';m.sub[0][15]=4;m.prob[0][15]=23;m.cycle[0][15]='2:3';m.retard[0][15]=8;
 const source=copie(m);c.copierMotifT1k();const presseMotif=copie(c.T1K.copie);assert(c.copierSequenceT1k());m.reglages[0][0].tune=.1;m.pas[0]=0;
 c.T1K.banq=7;c.T1K.cur=15;c.T1K.sel=2;const cible=c.motifT1kCur();cible.last=4;cible.muet[2]=true;cible.solo=1;cible.motionActive=false;const avant=copie(cible);
 assert(!c.collerSequenceT1k());assert.deepStrictEqual(copie(cible),avant);assert.equal(c.T1K.annulation,null);
 accepte=true;c.S.run=true;assert(!c.copierSequenceT1k());assert(!c.collerSequenceT1k());c.S.run=false;c.T1K.motionRec=true;assert(c.collerSequenceT1k());assert(!c.T1K.motionRec);
 const attendu=copie(avant);for(const nom of ['pas','acc','sub','prob','cycle','retard','reglages','direction'])attendu[nom][2]=source[nom][0];attendu.longueurs[2]=7;
 assert.deepStrictEqual(copie(cible),attendu);assert.deepStrictEqual(copie(c.T1K.copie),presseMotif);
 cible.reglages[2][0].tune=.2;assert.equal(c.T1K.copieSequence.motif.reglages[0][0].tune,.7);
 assert(c.annulerModificationT1k());assert.deepStrictEqual(copie(c.motifT1kCur()),avant);
 assert(c.collerSequenceT1k());c.memT1k();c.chargerT1k();assert.deepStrictEqual(copie(c.motifT1kCur()),attendu);assert.equal(c.T1K.copieSequence,null);
 console.log('TR-1000 v212 : copie indépendante, toutes les données de séquence, autre banque/instrument, longueur effective, confirmation, annulation, mémoire et protection PLAY OK.');
}
{
 const c=setup();c.signal=()=>{};c.majKnobsT1k=()=>{};c.window={confirm:()=>true};
 for(const L of [3,4,16]){
  const m=c.motifT1kCur();m.longueurs[0]=L;m.direction[0]='pingpong';m.pas[0]=1|(1<<8);m.acc[0]=2|(1<<9);
  for(let j=0;j<16;j++){m.sub[0][j]=j%4+1;m.prob[0][j]=j*5;m.cycle[0][j]=(j%4+1)+':4';m.retard[0][j]=[0,1,2,4,8][j%5];m.reglages[0][j]={tune:j/16};}
  const avant=copie(m),attendu=copie(m),masque=(1<<L)-1;
  for(const nom of ['pas','acc']){attendu[nom][0]=avant[nom][0]&~masque;for(let j=0;j<L;j++)if(avant[nom][0]&(1<<j))attendu[nom][0]|=1<<(L-1-j);}
  for(const nom of ['sub','prob','cycle','retard','reglages'])attendu[nom][0]=avant[nom][0].slice(0,L).reverse().concat(avant[nom][0].slice(L));
  c.T1K.motionRec=true;assert(c.inverserSequenceT1k());assert(!c.T1K.motionRec);assert.deepStrictEqual(copie(m),attendu);assert.deepStrictEqual(copie(c.memoire.t1k.motifs[0]),attendu);
  assert(c.inverserSequenceT1k());assert.deepStrictEqual(copie(m),avant);
  assert(c.annulerModificationT1k());assert.deepStrictEqual(copie(c.motifT1kCur()),attendu);
 }
 let m=c.motifT1kCur();m.longueurs[0]=1;const a=c.T1K.annulation,b=copie(m);assert(!c.inverserSequenceT1k());assert.strictEqual(c.T1K.annulation,a);assert.deepStrictEqual(copie(m),b);
 m.longueurs[0]=0;m.last=4;m.pas[0]=1;c.S.run=true;assert(!c.inverserSequenceT1k());assert.equal(m.pas[0],1);c.S.run=false;assert(c.inverserSequenceT1k());assert.equal(m.pas[0],8);
 const sauvegarde=copie(m);c.chargerT1k();assert.deepStrictEqual(copie(c.motifT1kCur()),sauvegarde);
 console.log('TR-1000 v213 : inversion 3/4/16 pas, métadonnées, double inversion, annulation, LAST, mémoire et protection PLAY OK.');
}
{
 const c=setup();c.signal=()=>{};c.majKnobsT1k=()=>{};let accepte=false,confirmations=0;c.window={confirm:()=>{confirmations++;return accepte;}};
 c.T1K.banq=7;c.T1K.cur=15;c.T1K.sel=2;const m=c.motifT1kCur();m.longueurs[2]=3;m.direction[2]='pingpong';m.muet[2]=true;m.solo=2;m.motionActive=false;m.pas[2]=32769;m.acc[2]=32768;m.sub[2][15]=4;m.prob[2][15]=23;m.cycle[2][15]='2:3';m.retard[2][15]=8;m.reglages[2][15]={tune:.7};const avant=copie(m);
 assert(!c.effacerSequenceT1k());assert.deepStrictEqual(copie(m),avant);assert.equal(c.T1K.annulation,null);
 accepte=true;c.S.run=true;assert(!c.effacerSequenceT1k());assert.equal(confirmations,1);c.S.run=false;c.T1K.motionRec=true;assert(c.effacerSequenceT1k());assert(!c.T1K.motionRec);
 const attendu=copie(avant),vide=c.motifT1k(9);for(const nom of ['pas','acc','sub','prob','cycle','retard','reglages'])attendu[nom][2]=copie(vide[nom][2]);
 assert.deepStrictEqual(copie(m),attendu);assert.deepStrictEqual(copie(c.memoire.t1k.motifs[127]),attendu);
 const annulation=c.T1K.annulation;assert(!c.effacerSequenceT1k());assert.strictEqual(c.T1K.annulation,annulation);assert.equal(confirmations,2);
 assert(c.annulerModificationT1k());assert.deepStrictEqual(copie(c.motifT1kCur()),avant);
 assert(c.effacerSequenceT1k());c.chargerT1k();assert.deepStrictEqual(copie(c.motifT1kCur()),attendu);
 // Des réglages sur une cellule sans note doivent aussi être effacés.
 c.motifT1kCur().reglages[2][15]={niv:.2};assert(c.effacerSequenceT1k());assert.equal(c.motifT1kCur().reglages[2][15],null);
 console.log('TR-1000 v214 : effacement complet ciblé, cellules hors longueur/sans note, confirmation, annulation, mémoire et protection PLAY OK.');
}
{
 const c=setup();c.signal=()=>{};c.majKnobsT1k=()=>{};let accepte=true,confirmations=0;c.window={confirm:()=>{confirmations++;return accepte;}};
 for(const L of [1,3,8]){
  const m=c.motifT1kCur();m.longueurs[0]=L;m.direction[0]='arriere';m.pas[0]=0xfff5;m.acc[0]=0xaaaa;
  for(let j=0;j<16;j++){m.sub[0][j]=j%4+1;m.prob[0][j]=j*5;m.cycle[0][j]=(j%4+1)+':4';m.retard[0][j]=[0,1,2,4,8][j%5];m.reglages[0][j]={tune:j/16};}
  const avant=copie(m),attendu=copie(m);attendu.longueurs[0]=2*L;
  for(const nom of ['pas','acc'])for(let j=0;j<L;j++)attendu[nom][0]=(attendu[nom][0]&~(1<<(j+L)))|(((avant[nom][0]>>j)&1)<<(j+L));
  for(const nom of ['sub','prob','cycle','retard','reglages'])for(let j=0;j<L;j++)attendu[nom][0][j+L]=copie(avant[nom][0][j]);
  c.T1K.motionRec=true;assert(c.doublerSequenceT1k());assert(!c.T1K.motionRec);assert.deepStrictEqual(copie(m),attendu);assert.deepStrictEqual(copie(c.memoire.t1k.motifs[0]),attendu);
  m.reglages[0][L].tune=.9;assert.equal(m.reglages[0][0].tune,0,'copies indépendantes');
  assert(c.annulerModificationT1k());assert.deepStrictEqual(copie(c.motifT1kCur()),avant);
 }
 const m=c.motifT1kCur();m.longueurs[0]=9;let avant=copie(m),n=confirmations;assert(!c.doublerSequenceT1k());assert.equal(confirmations,n);assert.deepStrictEqual(copie(m),avant);
 m.longueurs[0]=0;m.last=4;avant=copie(m);accepte=false;assert(!c.doublerSequenceT1k());assert.deepStrictEqual(copie(m),avant);
 accepte=true;c.S.run=true;n=confirmations;assert(!c.doublerSequenceT1k());assert.equal(confirmations,n);c.S.run=false;assert(c.doublerSequenceT1k());assert.equal(m.last,4);assert.equal(m.longueurs[0],8);
 const sauvegarde=copie(m);c.chargerT1k();assert.deepStrictEqual(copie(c.motifT1kCur()),sauvegarde);
 console.log('TR-1000 v215 : doublement 1/3/8, notes et métadonnées, copies indépendantes, hors longueur préservé, LAST, annulation, mémoire et garde-fous OK.');
}
{
 // v250 : motifs vides écrits null, relus identiques ; ancienne sauvegarde complète relue telle quelle.
 const c=setup();c.chargerT1k();c.memT1k();
 const m1=copie(c.memoire.t1k);
 assert.equal(m1.motifs.length,128);
 const pleins=m1.motifs.map((m,k)=>m?k:-1).filter(k=>k>=0);
 assert.deepStrictEqual(pleins,[0,1],'seuls les deux motifs d’usine sont écrits en entier');
 const avant=copie(c.T1K.motifs);c.memoire.t1k=m1;c.chargerT1k();
 assert.deepStrictEqual(copie(c.T1K.motifs),avant,'aller-retour exact, motifs vides compris');
 const mv=c.T1K.motifs[77];mv.pas[3]=5;mv.nom='PONT';c.memT1k();
 assert.equal(c.memoire.t1k.motifs[77].nom,'PONT','un motif touché est écrit');
 mv.pas[3]=0;mv.nom=c.lireMotifT1k(null).nom;c.memT1k();
 assert.equal(c.memoire.t1k.motifs[77],null,'revenu au vide : de nouveau null');
 const complet=copie(c.memoire.t1k);complet.motifs=c.T1K.motifs.map(x=>copie(c.ecrireMotifT1k(x)));complet.motifs[90].pas[1]=3;
 assert(JSON.stringify(c.memoire.t1k).length*20<JSON.stringify(complet).length,'au moins vingt fois plus léger');
 c.memoire.t1k=complet;c.chargerT1k();assert.equal(c.T1K.motifs[90].pas[1],3,'sauvegarde v247 complète relue');
 c.memT1k();const reste=c.memoire.t1k.motifs.map((m,k)=>m?k:-1).filter(k=>k>=0);assert.equal(reste.join(),'0,1,90','et réécrite allégée : '+reste.slice(0,12));
 console.log('TR-1000 v250 : motifs vides écrits null, aller-retour exact, anciennes sauvegardes complètes relues OK.');
}
