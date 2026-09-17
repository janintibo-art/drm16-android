// Régression DrumBrute : 64 pas indépendants, migration et édition.
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const elements = {};
function element() { return {listeners:{}, children:[], dataset:{}, style:{}, textContent:'',
  classList:{toggle(){},remove(){}},setPointerCapture(){},setAttribute(){},appendChild(n){this.children.push(n);},
  addEventListener(type, fn){this.listeners[type]=fn;}}; }
const c = {document:{getElementById(id){return elements[id] || (elements[id]=element());},
  createElement:element,querySelectorAll(){return [];},body:element(),listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}},
  knobEm(){return {maj(){}};},setTimeout(){},clearTimeout(){},window:{listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}},
  memoire:{},memLire(){return c.saved;},sauverMachine(){},
  S:{run:false},H:{cran(){},inter(){}},signal(){},audioInit(){},ctx:{},
  maintenantAudio(){return 0;},pasLePlusProche(i,n){return i%n;},
  ouvrirPas(){return 0;},attenuerVoie(){},stepDur(){return .1;},cache:false,queue:[]};
vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../page/js/490-arturia-drumbrute-impact.js'),'utf8'),c);
const vraieVoixDbi=c.voixDbi;
let p = c.pisteDbi(0);
for (let i=0;i<64;i++) {
  c.ecrirePasDbi(p,'pas',i,true);
  for(let j=0;j<64;j++) assert.equal(c.lirePasDbi(p,'pas',j),i===j,`collision ${i}/${j}`);
  c.ecrirePasDbi(p,'pas',i,false);
}
c.DBI.motifs[0].last=64;
p=c.pisteDbiSel(); p.pas=0; p.acc=0;
const positions=[0,15,16,31,32,47,48,63];
positions.forEach(i=>{c.ecrirePasDbi(p,'pas',i,true);c.ecrirePasDbi(p,'acc',i,true);});
const hits=[];c.voixDbi=(t,k,a)=>{if(k===0) hits.push([Math.round(t*10),a]);};
for(let i=0;i<64;i++) c.scheduleDbi(i,i/10);
assert.deepStrictEqual(hits,positions.map(i=>[i,true]));
c.memDbi();c.saved=JSON.parse(JSON.stringify(c.memoire.dbi));c.chargerDbi();
p=c.pisteDbiSel();positions.forEach(i=>assert(c.lirePasDbi(p,'pas',i)&&c.lirePasDbi(p,'acc',i)));
c.window.prompt=()=> '16';c.choisirLongueurDbi(false);assert(c.lirePasDbi(p,'pas',63));
c.window.prompt=()=> '64';c.choisirLongueurDbi(false);assert.equal(c.longueurDbi(),64);
c.window.prompt=()=> '65';c.choisirLongueurDbi(false);assert.equal(c.longueurDbi(),64);
elements['dbi-page-3'].listeners.click();assert.equal(c.dbiPas[15].textContent,'64');
elements['dbi-erase'].listeners.click();for(let i=0;i<64;i++) assert(!c.lirePasDbi(p,'pas',i)&&!c.lirePasDbi(p,'acc',i));
c.S.run=true;c.DBI.rec=true;c.DBI.pos=63;c.frapperDbi(0,true);
assert(c.lirePasDbi(p,'pas',63)&&c.lirePasDbi(p,'acc',63));assert(!c.lirePasDbi(p,'pas',15));
c.S.run=false;c.window.prompt=()=> '2';elements['dbi-copy'].listeners.click();
c.ecrirePasDbi(p,'pas',63,false);assert(c.lirePasDbi(c.DBI.motifs[1].pistes[0],'pas',63));
c.saved.motifs.forEach(m=>m.pistes.forEach(p=>{delete p.pasPlus;delete p.accPlus;}));
c.saved.motifs[0].pistes[0].pas=0x8001;c.chargerDbi();p=c.pisteDbiSel();
assert(c.lirePasDbi(p,'pas',0)&&c.lirePasDbi(p,'pas',15));
for(let i=16;i<64;i++) assert(!c.lirePasDbi(p,'pas',i));
console.log('DrumBrute : 64 pas sans collision, accents, lecture, sauvegarde, migration, pages, longueurs, REC, COPY et ERASE OK.');

// COLOR reste indépendant des notes et des accents, y compris au pas 64.
c.DBI.motifs[0].last=64; c.DBI.page=3; p=c.pisteDbiSel();
const original=JSON.stringify(p.p);
elements['dbi-color-steps'].listeners.click();assert(c.DBI.colorSteps);
const event={target:{closest(){return {dataset:{i:'15'}};}}};
elements['dbi-pas'].listeners.click(event);
assert(c.lirePasDbi(p,'col',63));assert(!c.lirePasDbi(p,'pas',63));
for(let i=0;i<63;i++) assert(!c.lirePasDbi(p,'col',i));
const notesBefore=p.pas, accentsBefore=p.acc;
assert.equal(p.pas,notesBefore);assert.equal(p.acc,accentsBefore);
for(let k=0;k<8;k++){
  const track=c.motifDbiCur().pistes[k], before=JSON.stringify(track.p);
  const clean=c.parametresCouleurDbi(track,k,false), colored=c.parametresCouleurDbi(track,k,true);
  c.DBI_VOIX[k].col.forEach(kn=>assert(colored[kn[0]]>clean[kn[0]]));
  assert.equal(colored.niv,clean.niv);assert.equal(JSON.stringify(track.p),before);
}
p.colorPar.drive=.9;assert.equal(c.parametresCouleurDbi(p,0,true).drive,.9);
assert.equal(JSON.stringify(p.p),original);
c.ecrirePasDbi(p,'pas',63,true);c.ecrirePasDbi(p,'acc',63,true);
const colors=[];c.voixDbi=(t,k,a,col)=>{if(k===0) colors.push([a,col]);};
c.DBI.roller=true;c.scheduleDbi(63,1);assert.deepStrictEqual(colors,[[true,true],[false,true]]);
c.DBI.roller=false;c.memDbi();c.saved=JSON.parse(JSON.stringify(c.memoire.dbi));
c.chargerDbi();p=c.pisteDbiSel();assert(c.lirePasDbi(p,'col',63));assert.equal(p.colorPar.drive,.9);
assert.equal(c.DBI.colorSteps,false);
c.window.prompt=()=> '2';elements['dbi-copy'].listeners.click();
p.colorPar.drive=.2;c.ecrirePasDbi(p,'col',63,false);
assert.equal(c.DBI.motifs[1].pistes[0].colorPar.drive,.9);
assert(c.lirePasDbi(c.DBI.motifs[1].pistes[0],'col',63));
c.S.run=true;c.DBI.rec=true;c.DBI.pos=63;c.DBI.colorSteps=true;c.frapperDbi(0,true);
assert(c.lirePasDbi(p,'col',63));c.DBI.colorSteps=false;c.frapperDbi(0,false);assert(!c.lirePasDbi(p,'col',63));
c.S.run=false;[0,15,16,31,32,47,48,63].forEach(i=>c.ecrirePasDbi(p,'col',i,true));
elements['dbi-erase'].listeners.click();for(let i=0;i<64;i++) assert(!c.lirePasDbi(p,'col',i));
c.saved.motifs.forEach(m=>m.pistes.forEach(p=>{delete p.col;delete p.colPlus;delete p.colorPar;}));
c.chargerDbi();p=c.pisteDbiSel();for(let i=0;i<64;i++) assert(!c.lirePasDbi(p,'col',i));
assert.deepStrictEqual(JSON.parse(JSON.stringify(c.parametresCouleurDbi(p,0,false))),JSON.parse(original));
console.log('COLOR : indépendance, pas 64, paramètres sans mutation, roller, REC, sauvegarde, migration, copie et effacement OK.');

// Step Repeat : frontières, swing, accents et coloration de chaque frappe.
c.chargerDbi();c.DBI.cur=0;c.DBI.sel=0;c.DBI.random=0;c.DBI.poly=false;c.DBI.roller=false;
c.DBI.motifs[0].last=64;p=c.pisteDbiSel();
p.pas=0;p.pasPlus=[0,0,0];p.acc=0;p.accPlus=[0,0,0];p.col=0;p.colPlus=[0,0,0];
let repeatsHeard=[];c.voixDbi=(t,k,acc,col)=>{if(k===0) repeatsHeard.push({t,acc,col});};
for(const i of [0,15,16,31,32,47,48,63]){
  c.ecrirePasDbi(p,'pas',i,true);c.ecrirePasDbi(p,'acc',i,true);c.ecrirePasDbi(p,'col',i,true);
  for(const swing of [0,.7]) for(let n=1;n<=4;n++){
    c.DBI.swing=swing;p.repeats[i]=n;repeatsHeard=[];c.scheduleDbi(i,10);
    assert.equal(repeatsHeard.length,n);
    const start=10+(i%2 ? .1*swing*.5 : 0),next=10.1+((i+1)%64%2 ? .1*swing*.5 : 0);
    repeatsHeard.forEach((h,j)=>{assert(Math.abs(h.t-(start+j*(next-start)/n))<1e-9);assert(h.t<next);assert(h.acc&&h.col);});
  }
}
// ROLLER ne double pas un Step Repeat ; une case silencieuse reste silencieuse.
c.DBI.roller=true;repeatsHeard=[];c.scheduleDbi(63,10);assert.equal(repeatsHeard.length,4);
c.ecrirePasDbi(p,'pas',63,false);repeatsHeard=[];c.scheduleDbi(63,10);assert.equal(repeatsHeard.length,0);
c.DBI.roller=false;c.DBI.page=3;c.DBI.repeatEdit=false;
const beforeNotes=JSON.stringify([p.pas,p.pasPlus,p.acc,p.accPlus,p.col,p.colPlus]);
elements['dbi-repeat'].listeners.click();
for(const expected of [1,2,3,4]){elements['dbi-pas'].listeners.click(event);assert.equal(c.repetitionsDbi(p,63),expected);}
assert.equal(JSON.stringify([p.pas,p.pasPlus,p.acc,p.accPlus,p.col,p.colPlus]),beforeNotes);
assert.equal(c.dbiPas[15].textContent,'64 ×4');
c.memDbi();c.saved=JSON.parse(JSON.stringify(c.memoire.dbi));c.chargerDbi();p=c.pisteDbiSel();assert.equal(c.repetitionsDbi(p,63),4);
c.window.prompt=()=> '2';elements['dbi-copy'].listeners.click();p.repeats[63]=2;
assert.equal(c.repetitionsDbi(c.DBI.motifs[1].pistes[0],63),4);
elements['dbi-erase'].listeners.click();for(let i=0;i<64;i++) assert.equal(c.repetitionsDbi(p,i),1);
// Anciennes sauvegardes et données invalides donnent une frappe.
c.saved.motifs.forEach(m=>m.pistes.forEach(p=>delete p.repeats));c.chargerDbi();p=c.pisteDbiSel();
for(let i=0;i<64;i++) assert.equal(c.repetitionsDbi(p,i),1);
p.repeats=[0,-1,5,Infinity,null,2.5,'4'];for(let i=0;i<7;i++) assert.equal(c.repetitionsDbi(p,i),1);
// Dernier pas pair d'un motif impair : pas de swing fictif au retour à zéro.
c.DBI.swing=.7;c.DBI.motifs[0].last=13;assert.equal(c.dureePasDbi(12),.1);
console.log('Step Repeat : 1–4 frappes, timing avec swing, frontières, COLOR/accents, ROLLER, silence, édition, sauvegarde, copie, effacement et migration OK.');

// Hat ouvert/fermé : l'ordre des appels doit suivre celui des sons.
c.DBI.motifs[0].last=16;c.DBI.swing=0;c.DBI.roller=false;c.DBI.poly=false;
c.motifDbiCur().pistes.forEach(p=>{p.pas=0;p.pasPlus=[0,0,0];p.repeats=[];});
const hats=c.motifDbiCur().pistes;hats[5].pas=1;hats[6].pas=1;hats[5].repeats[0]=4;hats[6].repeats[0]=2;
const ordreHats=[];c.voixDbi=(t,k)=>ordreHats.push([k,Math.round(t*1000)]);
c.scheduleDbi(0,0);
assert.deepStrictEqual(ordreHats,[[6,0],[5,0],[5,25],[6,50],[5,50],[5,75]]);
// Chaque OH est coupée par la suivante ou par la fermeture finale.
function gainNode(){return {gain:{cancel:[],target:[],cancelScheduledValues(t){this.cancel.push(t);},setTargetAtTime(v,t){this.target.push(t);}},connect(){}};}
c.ctx={createGain:gainNode,createBiquadFilter(){return {frequency:{},connect(){}};}};
c.sortieDbi=()=>({});c.pasVoie=x=>x;c.mv=(name,v)=>v;c.trMetal=()=>({connect(){}});c.trEnv=()=>{};
c.midiNoteA=()=>{};c.MIDI={canal:1};c.DBI.ohGain=null;
const ouvertures=[];
for(const t of [0,.025,.05,.075]){vraieVoixDbi(t,6,false,false);ouvertures.push(c.DBI.ohGain);}
vraieVoixDbi(.1,5,false,false);
[.025,.05,.075,.1].forEach((t,i)=>assert.deepStrictEqual(ouvertures[i].gain.target,[t]));
c.DBI.ohGain=null;vraieVoixDbi(1,6,false,false);const simultanee=c.DBI.ohGain;vraieVoixDbi(1,5,false,false);
assert.deepStrictEqual(simultanee.gain.target,[1]);
console.log('Hats répétés : programmation chronologique et coupure de chaque ouverture OK.');

// Looper : horloge conservée, lecture locale et transitions au temps entendu.
c.chargerDbi();c.MACHINE=c.MACHINE_DBI;c.S.run=true;c.cache=false;
c.DBI.motifs[0].last=64;c.DBI.pos=63;c.DBI.swing=0;c.DBI.random=0;
c.voixDbi=()=>{};c.queue=[];
assert(c.commencerLooperDbi(4,7));
[10,11,12,13,14,15].forEach((i,n)=>c.scheduleDbi(i,1+n/10));
assert.deepStrictEqual(Array.from(c.DBI.loopEvents,e=>e.i),[63,0,1,2,63,0]);
assert.deepStrictEqual(Array.from(c.queue,e=>e.i),[10,11,12,13,14,15]);
assert.equal(c.commencerLooperDbi(2,8),false);c.relacherLooperDbi(8);assert(c.DBI.loop);
c.relacherLooperDbi(7);assert.equal(c.DBI.loop,null);
c.scheduleDbi(16,1.6);assert.equal(c.DBI.loopEvents.at(-1).i,16);
let audible=1.51;c.maintenantAudio=()=>audible;c.beatDbi(15);
assert.equal(c.DBI.pos,0);assert.equal(c.DBI.loopEntendu,true);
p=c.pisteDbiSel();p.pas=0;p.pasPlus=[0,0,0];c.DBI.rec=true;
c.frapperDbi(0,true);assert.equal(p.pas,0); // Fin de LOOP encore audible : pas d'écriture.
audible=1.61;c.beatDbi(16);assert.equal(c.DBI.pos,16);assert.equal(c.DBI.loopEntendu,false);
c.frapperDbi(0,true);assert(c.lirePasDbi(p,'pas',16));
// L'export et les anciennes mémoires ne contiennent aucun maintien transitoire.
c.commencerLooperDbi(2,1);const offset=c.DBI.loop.offset;c.cache=true;assert.equal(c.pasLooperDbi(20),20);assert.equal(c.DBI.loop.offset,offset);
c.memDbi();assert(!Object.hasOwn(c.memoire.dbi,'loop'));assert(!Object.hasOwn(c.memoire.dbi,'loopEvents'));
c.cache=false;c.arretDbi();assert.equal(c.DBI.loop,null);assert.equal(c.DBI.loopEvents.length,0);
assert.equal(c.commencerLooperDbi(1,1),false); // Premier pas non encore entendu.
c.DBI.pos=0;c.DBI.motifs[0].last=1;assert(c.commencerLooperDbi(8,1));assert.equal(c.DBI.loop.longueur,1);
assert.equal(c.pasLooperDbi(0),0);c.relacherLooperDbi();
// Vrais gestionnaires UI avec capture, annulation et clavier auto-répété.
const buttonLoop=elements['dbi-loop-2'];const pointer={button:0,pointerId:44,preventDefault(){}};
buttonLoop.listeners.pointerdown(pointer);assert(c.DBI.loop);
buttonLoop.listeners.pointercancel(pointer);assert.equal(c.DBI.loop,null);
buttonLoop.listeners.pointerdown(pointer);buttonLoop.listeners.lostpointercapture(pointer);assert.equal(c.DBI.loop,null);
buttonLoop.listeners.pointerdown(pointer);c.document.hidden=true;c.document.listeners.visibilitychange();assert.equal(c.DBI.loop,null);c.document.hidden=false;
buttonLoop.listeners.pointerdown(pointer);c.window.listeners.blur();assert.equal(c.DBI.loop,null);
buttonLoop.listeners.pointerdown(pointer);c.window.listeners.pagehide();assert.equal(c.DBI.loop,null);
let prevented=0;buttonLoop.listeners.keydown({key:' ',repeat:false,preventDefault(){prevented++;}});assert(c.DBI.loop);
buttonLoop.listeners.keydown({key:' ',repeat:true,preventDefault(){prevented++;}});assert.equal(prevented,2); // Ne doit pas déclencher PLAY/STOP global.
buttonLoop.listeners.keyup({key:' ',preventDefault(){}});assert.equal(c.DBI.loop,null);
c.S.run=false;assert.equal(c.commencerLooperDbi(1,9),false);
c.S.run=true;c.MACHINE={};assert.equal(c.commencerLooperDbi(1,9),false);
c.MACHINE=c.MACHINE_DBI;c.DBI.pos=0;assert(c.commencerLooperDbi(1,9));
c.window.listeners.keydown({key:'Escape'});assert.equal(c.DBI.loop,null);
console.log('Looper : positions 63→0, reprise de l’horloge, curseur/REC entendus, export, STOP, premier pas, capture tactile, annulation, focus et clavier OK.');
// La boucle relit réellement notes, accents, COLOR et Step Repeat du passage.
c.chargerDbi();c.MACHINE=c.MACHINE_DBI;c.S.run=true;c.cache=false;c.DBI.pos=32;c.DBI.motifs[0].last=64;c.DBI.swing=.7;
c.motifDbiCur().pistes.forEach(p=>{p.pas=0;p.pasPlus=[0,0,0];});p=c.pisteDbiSel();
c.ecrirePasDbi(p,'pas',32,true);c.ecrirePasDbi(p,'acc',32,true);c.ecrirePasDbi(p,'col',32,true);p.repeats[32]=4;
const boucleAudio=[];c.voixDbi=(t,k,a,col)=>boucleAudio.push({t,k,a,col});
assert(c.commencerLooperDbi(1,3));c.scheduleDbi(10,2);c.scheduleDbi(11,2.1);
assert.equal(boucleAudio.length,8);assert(boucleAudio.every(v=>v.k===0&&v.a&&v.col));
assert(Math.abs(boucleAudio[4].t-2.135)<1e-9);assert(boucleAudio[3].t<2.135);assert(boucleAudio[7].t<2.2);
c.relacherLooperDbi();c.scheduleDbi(12,2.2);assert.equal(boucleAudio.length,8);
console.log('Looper audio : notes du passage, accent, COLOR, répétitions et swing de l’horloge OK.');
