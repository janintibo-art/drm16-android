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
c.MACHINE=c.MACHINE_DBI;
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
function gainNode(){return {gain:{cancel:[],target:[],setValueAtTime(v,t){this.value=v;},cancelScheduledValues(t){this.cancel.push(t);},setTargetAtTime(v,t){this.target.push(t);}},connect(){}};}
c.ctx={createGain:gainNode,createBiquadFilter(){return {frequency:{},connect(){}};}};
c.sortieDbi=()=>({});c.pasVoie=x=>x;c.mv=(name,v)=>v;c.trMetal=()=>({connect(){}});c.trEnv=()=>{};
c.midiNoteA=()=>{};c.MIDI={canal:1};c.DBI.ohGain=null;
const ouvertures=[];
for(const t of [0,.025,.05,.075]){vraieVoixDbi(t,6,false,false);ouvertures.push(c.DBI.ohGain);}
vraieVoixDbi(.1,5,false,false);
[.025,.05,.075,.1].forEach((t,i)=>assert.deepStrictEqual(ouvertures[i].gain.target,[t]));
c.DBI.ohGain=null;c.DBI.hats=[];vraieVoixDbi(1,6,false,false);const simultanee=c.DBI.ohGain;vraieVoixDbi(1,5,false,false);
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

// SONG déterministe : motifs impairs/pairs, répétitions et aucune mutation de cur.
c.saved=null;c.chargerDbi();c.S.run=true;c.MACHINE=c.MACHINE_DBI;c.cache=false;
c.DBI.cur=5;c.DBI.song=true;c.DBI.chaine=[0,1,0];c.DBI.poly=false;c.DBI.swing=.7;c.DBI.random=0;
c.DBI.motifs[0].last=3;c.DBI.motifs[1].last=4;
c.DBI.motifs.forEach(m=>m.pistes.forEach(p=>{p.pas=0;p.pasPlus=[0,0,0];}));
c.DBI.motifs[0].pistes[0].pas=7;c.DBI.motifs[1].pistes[0].pas=15;
c.DBI.motifs[0].pistes[0].p.niv=.2;c.DBI.motifs[1].pistes[0].p.niv=.8;
const songHits=[];c.voixDbi=(t,k,a,col,m)=>{songHits.push({t,m:c.DBI.motifs.indexOf(m),niv:m.pistes[k].p.niv});};
assert.equal(c.longueurDbi(),10);c.queue=[];
for(let i=0;i<10;i++)c.scheduleDbi(i,i*.1);
assert.deepStrictEqual(songHits.map(h=>h.m),[0,0,0,1,1,1,1,0,0,0]);assert.equal(c.DBI.cur,5);
assert.deepStrictEqual(songHits.map(h=>h.niv),[.2,.2,.2,.8,.8,.8,.8,.2,.2,.2]);
assert(Math.abs(songHits[3].t-.335)<1e-9); // Swing de l'horloge, pas du pas local zéro.
let songNow=.31;c.maintenantAudio=()=>songNow;c.beatDbi(3);assert.equal(c.DBI.songHeard,0);
songNow=.34;c.beatDbi(3);assert.equal(c.DBI.songHeard,1);assert.equal(c.DBI.pos,0);assert.equal(c.DBI.horlogePos,3);
assert.equal(elements['dbi-song'].textContent,'SONG 2/3');
// La boucle reprend la dernière adresse entendue, puis SONG suit son horloge.
assert(c.commencerLooperDbi(1,55));assert.equal(c.pasLooperDbi(8),3);c.relacherLooperDbi(55);assert.equal(c.pasLooperDbi(8),8);
const avantSong=JSON.stringify(c.DBI.motifs);c.DBI.rec=true;
// Garder une voix test qui accepte aussi les pads (motif implicite).
c.voixDbi=()=>{};c.frapperDbi(0,true);elements['dbi-erase'].listeners.click();elements['dbi-poly'].listeners.click();
assert.equal(JSON.stringify(c.DBI.motifs),avantSong);assert.equal(c.DBI.poly,false);
c.memDbi();c.saved=JSON.parse(JSON.stringify(c.memoire.dbi));c.S.run=false;c.chargerDbi();
assert(c.DBI.song);assert.equal(c.DBI.chaine.join(','),'0,1,0');assert.equal(c.DBI.cur,5);
// L'export hors ligne parcourt le même cycle sans modifier le curseur entendu.
c.cache=true;const exportHits=[];c.voixDbi=(t,k,a,col,m)=>exportHits.push(c.DBI.motifs.indexOf(m));
for(let i=0;i<c.longueurDbi();i++)c.scheduleDbi(i,i*.1);
assert.deepStrictEqual(exportHits,[0,0,0,1,1,1,1,0,0,0]);assert.equal(c.DBI.loopEvents.length,0);
// Voie secondaire du SET : pas d'indice SONG dans la file d'une autre machine.
c.cache=false;c.S.run=true;c.MACHINE={};c.queue=[];c.scheduleDbi(7,2);assert.equal(c.queue.length,0);assert.equal(c.DBI.loopEvents.length,1);
c.arretDbi();assert.equal(c.DBI.loopEvents.length,0);assert.equal(c.DBI.songHeard,-1);
c.MACHINE=c.MACHINE_DBI;c.S.run=false;
c.window.prompt=()=> '1 1 2';c.configSongDbi();assert.equal(c.DBI.chaine.join(','),'0,0,1');
c.S.run=true;songNow=4;c.scheduleDbi(3,3);c.beatDbi(3);assert.equal(elements['dbi-song'].textContent,'SONG 2/3');
c.S.run=false;c.window.prompt=()=> '17 2';c.configSongDbi();assert.equal(c.DBI.chaine.join(','),'0,0,1');
c.window.prompt=()=> '1 '.repeat(17);c.configSongDbi();assert.equal(c.DBI.chaine.join(','),'0,0,1');
c.saved={...c.saved,chaine:[999],song:true};c.chargerDbi();assert.equal(c.DBI.song,false);
c.saved={motifs:c.saved.motifs};c.chargerDbi();assert.equal(c.DBI.song,false);assert.equal(c.DBI.chaine.join(','),'0,1');
console.log('SONG : longueurs 3/4, cycle10, swing global, timbres, affichage entendu, Looper, REC protégé, export, SET, sauvegarde et migration OK.');

// Départ/arrêt réels : purge de la DBI secondaire, y compris en attente MIDI.
vm.runInContext(fs.readFileSync(path.join(__dirname,'../page/js/130-decalage-humain.js'),'utf8'),c);
c.SET={on:false};c.SYNC={};c.MIDI={sync:true,ouvert:0};c.timer=null;c.AUDIT={};
c.clearInterval=()=>{};c.draw=()=>{};c.host=()=>{};c.midiHorloge=()=>{};c.midiSilence=()=>{};c.couperSourcesFutures=()=>{};
c.MACHINE={arret(){}};c.DBI.loopEvents=[{i:2,t:100}];c.DBI.songHeard=1;
c.start();assert.equal(c.DBI.loopEvents.length,0);assert.equal(c.DBI.songHeard,-1);assert.equal(c.step,0);assert.equal(c.SYNC.attente,true);
c.DBI.loopEvents=[{i:2,t:100}];c.DBI.songHeard=1;c.stop();assert.equal(c.DBI.loopEvents.length,0);assert.equal(c.DBI.songHeard,-1);assert.equal(c.S.run,false);
console.log('Transport global : départ/STOP purgent aussi la DBI secondaire, attente MIDI comprise.');

// Groove local : zéro est une vraie valeur ; null suit le global.
c.saved=null;c.chargerDbi();c.S.run=false;c.MACHINE=c.MACHINE_DBI;c.cache=false;
c.DBI.swing=.7;c.DBI.random=1;c.DBI.poly=false;c.DBI.song=false;c.DBI.cur=0;
p=c.pisteDbiSel();assert.equal(c.reglageGrooveDbi(p,'swing'),.7);p.swing=0;assert.equal(c.reglageGrooveDbi(p,'swing'),0);
assert.equal(c.texteSwingDbi(.7),'67.5%');
elements['dbi-groove'].listeners.click();c.reglerGrooveDbi('swing',.3);c.reglerGrooveDbi('random',0);
assert.equal(p.swing,.3);assert.equal(p.random,0);assert.equal(c.DBI.swing,.7);assert.equal(c.DBI.random,1);
c.memDbi();c.saved=JSON.parse(JSON.stringify(c.memoire.dbi));c.chargerDbi();p=c.pisteDbiSel();
assert.equal(p.swing,.3);assert.equal(p.random,0);
c.window.prompt=()=> '2';elements['dbi-copy'].listeners.click();p.swing=.2;assert.equal(c.DBI.motifs[1].pistes[0].swing,.3);
elements['dbi-groove-reset'].listeners.click();assert.equal(p.swing,null);assert.equal(p.random,null);
c.saved.motifs.forEach(m=>m.pistes.forEach(p=>{delete p.swing;delete p.random;}));c.chargerDbi();p=c.pisteDbiSel();assert.equal(p.swing,null);assert.equal(p.random,null);
c.DBI.song=true;c.S.run=true;c.DBI.groovePiste=true;c.reglerGrooveDbi('swing',.5);assert.equal(p.swing,null);
c.S.run=false;c.DBI.song=false;
// Deux pistes au même pas impair ont chacune leur retard et leurs répétitions.
c.DBI.motifs[0].last=16;c.DBI.random=0;c.DBI.swing=.7;
c.motifDbiCur().pistes.forEach(p=>{p.pas=0;p.pasPlus=[0,0,0];p.repeats=[];p.random=0;});
const tracks=c.motifDbiCur().pistes;tracks[0].pas=2;tracks[1].pas=2;tracks[0].swing=0;tracks[1].swing=.7;tracks[1].repeats[1]=4;
const grooveHits=[];c.voixDbi=(t,k)=>grooveHits.push([t,k]);c.scheduleDbi(1,1);
assert.equal(grooveHits[0][0],1);assert.equal(grooveHits[0][1],0);
assert(Math.abs(grooveHits[1][0]-1.035)<1e-9);assert(grooveHits.every(x=>x[0]<1.1));
// RANDOM ne modifie jamais les notes stockées et respecte un override nul.
c.Math=Object.create(Math);c.Math.random=()=>0;c.DBI.random=1;tracks[1].random=1;
const rythmeAvant=JSON.stringify(tracks.map(p=>[p.pas,p.pasPlus]));grooveHits.length=0;c.scheduleDbi(1,2);
assert.deepStrictEqual(grooveHits.map(h=>h[1]),[0]);grooveHits.length=0;c.scheduleDbi(2,2.1);assert.deepStrictEqual(grooveHits.map(h=>h[1]),[1]);
assert.equal(JSON.stringify(tracks.map(p=>[p.pas,p.pasPlus])),rythmeAvant);c.Math.random=Math.random;
// Transition SONG : les répétitions utilisent le swing du prochain motif.
c.DBI.song=true;c.DBI.chaine=[0,1];c.DBI.random=0;c.DBI.motifs[0].last=1;c.DBI.motifs[1].last=1;
c.DBI.motifs.forEach(m=>m.pistes.forEach(p=>{p.pas=0;p.random=0;p.repeats=[];}));
let a=c.DBI.motifs[0].pistes[0],b=c.DBI.motifs[1].pistes[0];a.pas=1;b.pas=1;a.swing=0;b.swing=.7;a.repeats[0]=4;
grooveHits.length=0;c.scheduleDbi(0,3);c.scheduleDbi(1,3.1);
assert(Math.abs(grooveHits[3][0]-3.10125)<1e-9);assert(Math.abs(grooveHits[4][0]-3.135)<1e-9);
console.log('Groove : héritage/null, override0, potards, sauvegarde, copie/reset, anciens motifs, SONG protégé, swing par piste et RANDOM non destructif OK.');

// Hat futur programmé avant fermeture plus tôt : ni silence prématuré ni fuite.
let tempsHat=0;c.maintenantAudio=()=>tempsHat;c.DBI.hats=[];c.DBI.hatsCtx=null;c.contexteHatsDbi();
const hg=[gainNode(),gainNode(),gainNode(),gainNode()];
[0,.03375,.0675,.10125].forEach((t,i)=>c.enregistrerHatDbi(t,false,hg[i]));c.enregistrerHatDbi(.1,true,null);
assert.deepStrictEqual(hg[0].gain.target,[.03375]);assert.deepStrictEqual(hg[1].gain.target,[.0675]);
assert.equal(c.DBI.hats.find(h=>h.g===hg[2]).coupe,.1);assert.equal(c.DBI.hats.find(h=>h.g===hg[3]).coupe,Infinity);
assert.equal(hg[3].gain.target.length,0);
c.DBI.hats=[];c.enregistrerHatDbi(.3,true,null);const avantFermeture=gainNode();c.enregistrerHatDbi(.2,false,avantFermeture);
assert.deepStrictEqual(avantFermeture.gain.target,[.3]);
c.DBI.hats=[];c.enregistrerHatDbi(1,true,null);const memeTemps=gainNode();c.enregistrerHatDbi(1,false,memeTemps);assert.deepStrictEqual(memeTemps.gain.target,[1]);
// STOP supprime les futurs événements annulés et leurs futures coupures.
c.DBI.hats=[];const tenue=gainNode();c.enregistrerHatDbi(.1,false,tenue);c.enregistrerHatDbi(.3,true,null);
tempsHat=.15;c.arreterHatsDbi();assert.equal(c.DBI.hats.length,1);assert.equal(c.DBI.hats[0].coupe,Infinity);assert.equal(tenue.gain.value,1);
const apresStop=gainNode();c.enregistrerHatDbi(.16,false,apresStop);assert.equal(apresStop.gain.target.length,0);
c.DBI.noeuds={};c.contexteHatsDbi();assert.equal(c.DBI.hats.length,0);
c.enregistrerHatDbi(.2,false,gainNode());c.ctx={};c.contexteHatsDbi();assert.equal(c.DBI.hats.length,0);
console.log('Charleys avec swings distincts : ordre inversé, priorité fermé, coupure minimale, STOP/pad et reconstruction du contexte OK.');

// STOP est aussi appelé au chargement, avant la création du contexte audio.
c.ctx=null;c.maintenantAudio=()=>{throw new Error('horloge sans contexte');};
c.arretDbi();assert.equal(c.DBI.hats.length,0);
console.log('STOP avant initialisation audio OK.');
