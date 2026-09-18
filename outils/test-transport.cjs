/* Régressions du transport commun, de la réception MIDI et du rendu des prises. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const lire = fichier => fs.readFileSync(path.join(__dirname, '..', fichier), 'utf8');
function fonction(fichier, nom) {
  const source = lire(fichier);
  const match = source.match(new RegExp('function ' + nom + '\\([^]*?\\n\\}'));
  assert(match, 'fonction réelle présente : ' + nom);
  return match[0];
}
const MIDI_SOURCE = 'page/js/310-midi.js';
function fixture(longueur = 16, secondaire = 12) {
  const frappes = [], curseurs = [], appels = [];
  const c = vm.createContext({
    console, maintenant:0, ctx:{currentTime:0}, S:{run:false, bpm:120, modele:'16', bg:true},
    HUM:{temps:0}, MIDI:{sync:false, ouvert:0}, SYNC:{ticks:0, dernier:0, attente:false},
    performance:{now:()=>0}, queue:[], cache:false, pasSet:0, step:0, nextT:0, timer:null,
    SOURCES:[], AUDIT:{tDernier:0, tJeu:0, pause:0, trous:0, tours:0, pic:0, picAvenir:0},
    METRO:false, ENS:{actif:true}, SET:{on:true, actives:{principal:true, autre:true}},
    SET_VOIES:[['principal'], ['autre']],
    document:{getElementById:()=>({classList:{add(){}, remove(){}}})},
    requestAnimationFrame(){}, clearInterval(){appels.push('clear');},
    setInterval(){appels.push('timer');return 7;},
    host(on){appels.push('host:'+on);}, signal(){}, majPlayEm(){},
    midiHorloge(){}, midiSuivreTempo(){}, purgerSources(){}, surveillerAudio(){},
    preparerSet(){appels.push('preparer');},
    couperSourcesFutures(){appels.push('couper');}, midiSilence(){appels.push('silence');},
    reveillerAudio(){}, writeMem(){}, scheduleEhx(){},
    MACHINE_MC:{arret(){appels.push('arretMC');}}, MACHINE_DBI:{arret(){appels.push('arretDBI');}}
  });
  c.window=c;
  c.maintenantAudio=()=>c.maintenant;
  c.audioInit=()=>{if(!c.ctx)c.ctx={currentTime:0};};
  c.stepDur=()=>60/c.S.bpm/4;
  c.look=()=>c.cache?1.2:.22;
  c.periode=()=>c.cache?150:45;
  function moteur(nom, L) {
    return {
      schedule(i,t){frappes.push([nom,i,t]);if(!c.cache)c.queue.push({i,t});},
      beat(i){curseurs.push([nom,i]);},
      boucle(){appels.push('boucle:'+nom);},
      arret(){appels.push('arret:'+nom);}, longueur:()=>L
    };
  }
  const principal=moteur('principal',longueur), autre=moteur('autre',secondaire);
  c.moteurSet=id=>id==='principal'?principal:autre;
  vm.runInContext(lire('page/js/130-decalage-humain.js'),c);
  vm.runInContext(lire('page/js/140-affichage-du-temps.js'),c);
  c.MACHINE=principal;
  vm.runInContext(fonction(MIDI_SOURCE,'ticExterne')+'\n'+fonction(MIDI_SOURCE,'departEsclave'),c);
  return {c,frappes,curseurs,appels};
}

// Le premier pas interne joue les deux machines, sans doubler le curseur.
{
  const {c,frappes,curseurs}=fixture();c.start();
  assert.deepEqual(frappes,[['principal',0,.12],['autre',0,.12]]);
  assert.equal(c.queue.length,1);assert.equal(c.queue[0].pasSet,0);
  c.maintenant=.2;c.tick();assert.equal(c.pasSet,3);
  c.maintenant=.25;c.draw();
  assert.deepEqual(curseurs,[['principal',1],['autre',1]],'le curseur secondaire suit le son entendu, pas le travail en avance');
  assert.equal(c.T_PAS,.245);
  c.stop();const n=frappes.length;c.tick();assert.equal(frappes.length,n);assert.equal(c.queue.length,0);
}
// Longueurs 12/16 ET 16/12 : aucun saut du curseur principal à la boucle secondaire.
for(const [L1,L2] of [[12,16],[16,12]]) {
  const {c,frappes,curseurs}=fixture(L1,L2);c.S.run=true;
  for(let i=0;i<19;i++)c.programmerPas(i%L1,i*.125);
  assert.equal(c.queue.length,19);
  assert.deepEqual(frappes.filter(x=>x[0]==='autre').map(x=>x[1]),Array.from({length:19},(_,i)=>i%L2));
  c.maintenant=1.5;c.draw();
  assert.deepEqual(curseurs,[['principal',12%L1],['autre',12%L2]]);
  assert.equal(c.queue[0].pasSet,13);
}
// Une machine secondaire qui décale son événement ne contamine pas la file.
{
  const {c}=fixture();const autre=c.moteurSet('autre');
  autre.schedule=(i,t)=>c.queue.push({i:99,t:t+.4});c.programmerPas(0,1);
  assert.equal(c.queue.length,1);assert.equal(c.queue[0].i,0);
  c.SET.actives.autre=false;c.programmerPas(1,1.125);assert.equal(c.queue.length,2);
}
// MIDI Start prépare également les voies du SET, à froid, et chaque sixième tic les avance.
{
  const {c,frappes,appels}=fixture(12,16);c.MIDI.sync=true;c.ctx=null;
  c.departEsclave(true);assert(c.ctx);assert(c.S.run);assert.equal(c.step,0);assert.equal(c.pasSet,0);
  assert(appels.includes('preparer'));assert(!appels.includes('timer'));
  for(let i=0;i<97;i++)c.ticExterne();
  assert.equal(frappes.length,34);assert.equal(c.pasSet,17);assert.equal(c.step,5);
  assert.deepEqual(frappes.filter(x=>x[0]==='principal').map(x=>x[1]),Array.from({length:17},(_,i)=>i%12));
  assert.deepEqual(frappes.filter(x=>x[0]==='autre').map(x=>x[1]),Array.from({length:17},(_,i)=>i%16));
  assert.equal(appels.filter(x=>x==='boucle:principal').length,1);
  assert.equal(appels.filter(x=>x==='boucle:autre').length,1);
  const n=frappes.length;c.tick();assert.equal(frappes.length,n,'aucun doublage par un ancien timer interne');
  c.stop();assert.equal(c.queue.length,0);c.ticExterne();assert.equal(frappes.length,n);
  c.departEsclave(false);assert.equal(c.step,5);assert.equal(c.pasSet,17);
  c.ticExterne();assert.deepEqual(frappes.slice(-2).map(x=>x.slice(0,2)),[['principal',5],['autre',1]]);
  c.departEsclave(true);assert.equal(c.step,0);assert.equal(c.pasSet,0);assert.equal(c.queue.length,0);
  c.ticExterne();assert.deepEqual(frappes.slice(-2).map(x=>x.slice(0,2)),[['principal',0],['autre',0]]);
}
// La vraie réaction à l'écran caché / affiché ne crée pas une horloge interne en MIDI.
{
  const source=lire('page/js/210-transfert-vers-une-vraie-volca-sample.js');
  const begin=source.indexOf('document.addEventListener("visibilitychange", function(){');
  const end=source.indexOf('\n});',begin)+4;assert(begin>=0&&end>begin);
  for(const sync of [false,true]) {
    const {c,appels}=fixture();c.MIDI.sync=sync;c.S.run=true;c.nextT=.12;
    let callback;c.document.addEventListener=(type,fn)=>{callback=fn;};
    vm.runInContext(source.slice(begin,end),c);
    for(const hidden of [true,false]){c.document.hidden=hidden;callback();}
    assert.equal(appels.filter(x=>x==='timer').length,sync?0:2);
    if(sync)assert.equal(c.timer,null);
  }
}
console.log('Transport : SET interne/MIDI, longueurs 12/16, curseurs horodatés, Start/Continue/Stop et retour écran OK.');

// Le canal commande la machine, même quand la façade EM-1 est affichée.
{
  const hits=[];
  const c=vm.createContext({ctx:{},S:{modele:'em1',run:false},ENR:{canaux:{0:'mc'}},MIDI:{canal:9,base:36},
    audioInit(){},maintenantAudio:()=>1,GM_INV:{36:'bd'},EM:{rec:false},
    EM_PARTS:Array.from({length:10},()=>({synth:true})),busEffets(){},
    voixSynth:()=>hits.push(['em1']),V:{bd:()=>hits.push(['16'])},
    MC_PISTES:4,MC:{sel:1,note:1,pistes:[{type:'drum'},{type:'synth'},{type:'drum'},{type:'synth'}]},
    MC_GAMME:[0,2,4,5,7,9,11,12,14,16,17,19,21,23,24,26],
    voixMc:(t,k,n)=>hits.push(['mc',k,n])});
  vm.runInContext(['entreeNote','routageMidi','rangMidi'].map(n=>fonction(MIDI_SOURCE,n)).join('\n'),c);
  c.entreeNote(36,1,0);assert.deepEqual(hits.pop(),['mc',0,1],'la piste drum MIDI joue la caisse choisie, pas le charley de la gamme');
  c.entreeNote(37,1,0);assert.deepEqual(hits.pop(),['mc',1,2],'la piste synth conserve la gamme');
  c.S.modele='mc';c.ENR.canaux[0]='em1';c.entreeNote(36,1,0);assert.deepEqual(hits.pop(),['em1']);
  delete c.ENR.canaux[0];c.entreeNote(38,1,0);assert.deepEqual(hits.pop(),['mc',2,1],'le type de la piste ciblée prévaut sur la sélection');
  c.ENR.canaux[0]='em1';c.entreeNote(36,1,0,'mc');assert.deepEqual(hits.pop(),['mc',0,1],'la destination figée de l’export prévaut sur un routage changé entre deux rendus');
}
console.log('Entrée MIDI : affectation EM-1 dans les deux sens, notes MC drum/synth et piste ciblée OK.');

// Une entrée physique ne doit pas relancer le transport ou ajouter une note
// pendant que les variables globales désignent un contexte de rendu.
{
  const source=lire(MIDI_SOURCE), debut=source.indexOf('window.__midi = function(a,b,c){');
  const fin=source.indexOf('\n};',debut)+3, appels=[];
  assert(debut>=0 && fin>debut);
  const c=vm.createContext({WAVX:{occupe:false},ENR:{ondesOccupe:false},MIDI:{in:true,sync:true},S:{run:true},
    enrNoter:()=>appels.push('enregistrer'),ticExterne:()=>appels.push('tic'),
    departEsclave:()=>appels.push('depart'),stop:()=>appels.push('stop'),majPlayEm(){},
    passeEnr:()=>true,entreeNote:()=>appels.push('note')});
  c.window=c;vm.runInContext(source.slice(debut,fin),c);
  for(const garde of ['wav','ondes']) {
    c.WAVX.occupe=garde==='wav';c.ENR.ondesOccupe=garde==='ondes';
    for(const statut of [0x90,0xF8,0xFA,0xFB,0xFC])c.__midi(statut,36,100);
    assert.deepEqual(appels,[],garde+': ni note, ni horloge, ni stop pendant le calcul');
  }
  c.WAVX.occupe=false;c.ENR.ondesOccupe=false;c.__midi(0x90,36,100);
  assert.deepEqual(appels,['enregistrer','note'],'la réception MIDI reprend après le calcul');
}

// Le vrai minuteur de mémoire ne doit pas persister la machine temporaire
// d’un export, puis la sauvegarde doit reprendre avec la machine rendue.
{
  const valeurs=new Map(), timers=new Map();let id=0;
  const c=vm.createContext({S:{modele:'16'},HUM:{},WAVX:{occupe:false},
    document:{querySelectorAll:()=>[]},signal(){},
    setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout(i){timers.delete(i);},
    localStorage:{getItem:k=>valeurs.get(k)||null,setItem:(k,v)=>valeurs.set(k,v)}});
  vm.runInContext(lire('page/js/030-memoire.js'),c);
  c.S.modele='mc';assert.equal(c.writeMem(),true);
  const avant=valeurs.get('drm.reglages');
  c.WAVX.occupe=true;c.S.modele='tr909';c.save();
  timers.get(c.saveTmr)();assert.equal(valeurs.get('drm.reglages'),avant);
  c.S.modele='mc';c.WAVX.occupe=false;c.save();timers.get(c.saveTmr)();
  assert.equal(JSON.parse(valeurs.get('drm.reglages')).modele,'mc');
}
console.log('Rendu : MIDI physique suspendu puis rétabli ; aucune machine temporaire enregistrée par le minuteur.');

// Le cache de rendu ne traverse ni un nouveau contexte, ni un changement de façade.
{
  const appels=[];const c=vm.createContext({ctx:{},S:{modele:'16'},RENDU_MACHINE:'',RENDU_CTX:null});
  c.allerMachine=m=>{appels.push(m);c.S.modele=m;};
  vm.runInContext(fonction('page/js/600-rendre-une-prise-midi-en-wav.js','allerMachineRendu'),c);
  c.allerMachineRendu('mc');c.allerMachineRendu('mc');assert.equal(appels.length,1);
  c.ctx={};c.allerMachineRendu('mc');assert.equal(appels.length,2);
  c.S.modele='tr808';c.allerMachineRendu('mc');assert.equal(appels.length,3);assert.equal(c.S.modele,'mc');
  c.allerMachine=()=>{throw Error('construction refusée');};assert.throws(()=>c.allerMachineRendu('tr808'));
  c.allerMachine=m=>{appels.push(m);c.S.modele=m;};c.allerMachineRendu('tr808');assert.equal(appels.length,4);
}
console.log('Rendu MIDI : cache lié au contexte et à la machine active, reprise après échec OK.');

// Le rendu hors ligne ne doit jamais envoyer ses notes au matériel connecté.
{
  const timers=[];const c=vm.createContext({ctx:{},MIDI:{out:true},midiPret:()=>true,
    maintenantAudio:()=>0,setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;},
    midiAttente:[],midiOuvertes:[],midiBrut(){},retirer(){}});
  vm.runInContext(fonction(MIDI_SOURCE,'midiNoteA'),c);
  c.midiNoteA(36,.05,1,9);assert.equal(timers.length,1);
  c.ctx={startRendering(){}};c.midiNoteA(36,.05,1,9);assert.equal(timers.length,1);
}

// Nœuds factices qui gardent leurs connexions : les vraies fonctions de rendu
// doivent retrouver la tranche de console sur laquelle les sorties vivent.
class Noeud {
  constructor(ctx) {
    this.ctx=ctx;this.dest=[];this.frequencyBinCount=128;
    for(const k of ['gain','frequency','Q','pan','threshold','knee','ratio','attack','release'])this[k]={value:0};
  }
  connect(n){this.dest.push(n);}disconnect(){this.dest=[];}start(){}stop(){}
}
class Contexte {
  constructor(){this.sampleRate=100;this.currentTime=0;this.destination=new Noeud(this);}
  createGain(){return new Noeud(this);}createDynamicsCompressor(){return new Noeud(this);}
  createWaveShaper(){return new Noeud(this);}createBiquadFilter(){return new Noeud(this);}
  createStereoPanner(){return new Noeud(this);}createAnalyser(){return new Noeud(this);}
  createBufferSource(){return new Noeud(this);}
  createBuffer(ch,n,sr){
    const canaux=Array.from({length:ch},()=>new Float32Array(n));
    return {length:n,sampleRate:sr,numberOfChannels:ch,getChannelData:k=>canaux[k]};
  }
}
async function verifierBusRendu() {
  let refuser=false, panne='', creations=0, rendus=0;
  const signaux=[], ecritures=[], claviers=new Set();
  class HorsLigne extends Contexte {
    constructor(ch,n,sr){
      super();creations++;
      if(panne==='creation' && creations===1)throw Error('contexte refusé');
      this.ch=ch;this.n=n;this.sampleRate=sr;
    }
    startRendering(){
      rendus++;
      return refuser || (panne==='rendu2' && rendus===2)?Promise.reject(Error('rendu refusé')):
        Promise.resolve(this.createBuffer(this.ch,this.n,this.sampleRate));
    }
  }
  const c=vm.createContext({console,ctx:new Contexte(),window:{OfflineAudioContext:HorsLigne},
    S:{vol:.8,run:false,modele:'16'},PR:{lecture:false},WAVX:{occupe:false,mesures:1},HOST:{fichierSauver(){}},
    audioInit(){},writeMem(){},refusWavTropLong:()=>false,signal:s=>signaux.push(s),H:{inter(){}},stepDur:()=>.125,
    cache:false,applyBass(){},pisterSources(){},construireMetal(){},
    document:{body:{inert:false},getElementById:()=>null,
      addEventListener:(type,fn)=>claviers.add(fn),removeEventListener:(type,fn)=>claviers.delete(fn)},
    ecrireDocument(p,nom,ab){
      if(panne==='ecriture')return '';
      if(panne==='exceptionEcriture')throw Error('disque inaccessible');
      ecritures.push({nom,ab});return '/documents/'+nom;
    },MACHINE:{schedule(){}},enLissant:f=>f(),majEnrUI(){},save(){},
    metalBuf:{original:true},SOURCES:[],COLLECTE:null,queue:[],OFF_T:-1,
    TD3:{noeuds:null},EUR:{bus:null,sources:null,noeuds:[]},TR:{m:'tr808'},ER:{v:1},EA:{v:1},ES:{v:1},MPC:{v:3000},
    banqueEs(){},chargerEchs(){},ES_CHARGES:{},
    ENR:{lecture:null,actif:false,canaux:{},prises:[{duree:1000,nom:'prise',machine:'16',evts:[[0,144,36,100]]}],
      affiche:{nom:'prise',duree:1000,evts:[[0,144,36,100],[500,145,36,100]]},decoupe:'canal'},
    entreeNote(){},passeEnr:()=>true,pistesDe:()=>[{c:0,n:-1,cle:'0'},{c:1,n:-1,cle:'1'}]});
  c.allerMachine=m=>{c.S.modele=m;};
  c.stop=()=>{c.S.run=false;c.queue=[];};
  vm.runInContext(lire('page/js/150-le-set-plusieurs-machines-a-la-fois.js'),c);
  vm.runInContext(fonction('page/js/110-moteur-audio.js','razNoeudsMachines')+'\n'+
    fonction('page/js/110-moteur-audio.js','batirAudio')+'\nvar COMPENSATION_SORTIE_DB=2.5;',c);
  for(const file of ['550-export-audio.js','600-rendre-une-prise-midi-en-wav.js','610-formes-d-onde-par-piste.js'])
    vm.runInContext(lire('page/js/'+file),c);
  c.batirAudio();const bus=c.SET.bus, tranche=bus.ehx, sortie=c.outBd, contexte=c.ctx;
  for(const [operation,echec] of [['motif',false],['prise',false],['ondes',false],['motif',true],['prise',true],['ondes',true]]) {
    refuser=echec;c.SET.mute.ehx=false;c.majVoieSet('ehx');assert.equal(tranche.g.gain.value,.8);
    if(operation==='motif')c.exporterWav();else if(operation==='prise')c.exporterPriseWav(0);else c.ondesEnr();
    assert.notEqual(c.SET.bus,bus,'le rendu utilise ses propres tranches');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(c.ctx,contexte);assert.equal(c.outBd,sortie);assert.equal(c.SET.bus,bus);
    assert.equal(c.SET.bus.ehx,tranche);assert.equal(c.WAVX.occupe,false);assert(!c.ENR.ondesOccupe);
    c.SET.mute.ehx=true;c.majVoieSet('ehx');assert.equal(tranche.g.gain.value,0,operation+' : mute touche encore le bus entendu');
    c.SET.pan.ehx=.7;c.majVoieSet('ehx');assert.equal(tranche.p.pan.value,.7);
  }
  console.log('Exports : motif, prise et formes d’onde restaurent leurs bus, même sur échec ; MIDI externe silencieux hors ligne OK.');

  // Chaque échec arrive dans la vraie chaîne de promesses du rendu des prises.
  // Deux machines imposent deux rendus de voix, puis le rendu du mélange.
  c.ENR.canaux={0:'mc',1:'16'};
  c.ENR.prises[0].evts=[[0,144,37,100],[500,145,36,100]];
  const encoder=c.wavStereo, originalMetal=c.metalBuf, originalSources=c.SOURCES;
  for(const cas of ['creation','rendu2','conversion','ecriture','exceptionEcriture','']) {
    refuser=false;panne=cas;creations=0;rendus=0;signaux.length=0;ecritures.length=0;
    c.wavStereo=cas==='conversion'?()=>{throw Error('conversion refusée');}:encoder;
    const operation=c.exporterPriseWav(0);
    assert(c.WAVX.occupe,'export verrouillé avant tout passage asynchrone');
    assert(c.document.body.inert,'interface protégée pendant le rendu');
    assert.equal(claviers.size,1);
    await operation;
    assert.equal(c.WAVX.occupe,false,cas+': rendu déverrouillé');
    assert.equal(c.document.body.inert,false,cas+': interface rendue');
    assert.equal(claviers.size,0,cas+': interception clavier retirée');
    assert.equal(c.ctx,contexte);assert.equal(c.master.ctx,contexte);
    assert.equal(c.outBd,sortie);assert.equal(c.SET.bus,bus);
    assert.equal(c.metalBuf,originalMetal);assert.equal(c.SOURCES,originalSources);
    assert.equal(c.OFF_T,-1);assert.equal(c.S.modele,'16');
    if(cas){
      assert.equal(ecritures.length,0,cas+': aucun fichier de succès');
      assert(!signaux.some(s=>s.includes('CRÊTE')),cas+': aucun faux succès');
      assert(signaux.at(-1).includes(cas==='ecriture'?'ÉCRITURE REFUSÉE':'RENDU ÉCHOUÉ'));
      if(cas==='rendu2')assert.equal(rendus,2,'la panne survient après le premier stem réussi');
    }else{
      assert.equal(rendus,3,'les deux machines sont rendues avant leur mélange final');
      assert.equal(ecritures.length,1);assert(signaux.at(-1).includes('2 notes'));
      const wav=new DataView(ecritures[0].ab);
      assert.equal(wav.getUint32(24,true),44100);
      assert.equal(wav.getUint32(40,true),Math.ceil(44100*4)*4,'durée et stéréo préservées');
    }
  }
  console.log('Rendu multitimbral : refus de contexte, panne du deuxième rendu, conversion et écriture récupérés sans faux succès ; export suivant possible.');
}

verifierBusRendu().catch(err=>{console.error(err);process.exitCode=1;});

// v190 : START/CONTINUE MIDI prépare aussi la chaîne SmplTrek arrêtée.
{
 const {c}=fixture();let prepares=0,arrets=0;
 c.STK={song:true};c.MACHINE_STK={arret(){arrets++;}};c.MACHINE=c.MACHINE_STK;
 c.preparerChaineStk=()=>{prepares++;return true;};c.step=9;c.pasSet=41;
 c.departEsclave(false);assert.equal(prepares,1);assert.equal(arrets,1);
 assert(c.S.run);assert.equal(c.step,0);assert.equal(c.pasSet,0);
 c.S.run=false;c.preparerChaineStk=()=>false;c.departEsclave(false);assert(!c.S.run,'chaîne invalide non démarrée par MIDI');
}
// v196 : la phase TR-1000 est remise à zéro même en machine secondaire du SET.
{
 const {c}=fixture();let resets=0;c.resetLectureT1k=()=>{resets++;};
 c.start();assert.equal(resets,1);c.stop();assert.equal(resets,2);
 c.departEsclave(false);assert.equal(resets,3);c.departEsclave(false);assert.equal(resets,3,'CONTINUE pendant lecture ne réinitialise pas la phase');
}

// v200 : un retard modéré ne doit pas rabattre plusieurs pas au même instant.
for(const bpm of [120,300]){
 const {c,frappes}=fixture();c.S.bpm=bpm;c.ctx.state='running';c.AUDIT.decroche=0;c.start();
 const n=frappes.length,prochain=c.step;c.maintenant=c.nextT+.25;c.tick();
 const suite=frappes.slice(n).filter(x=>x[0]==='principal');assert(suite.length);
 assert.equal(suite[0][1],prochain);assert(Math.abs(suite[0][2]-c.maintenant-.08)<1e-9);
 for(let i=1;i<suite.length;i++)assert(Math.abs(suite[i][2]-suite[i-1][2]-c.stepDur())<1e-9);
 assert.equal(c.AUDIT.decroche,1);
 const nb=frappes.length,position=c.step,prochaineDate=c.nextT;c.ctx.state='suspended';c.maintenant+=.5;c.tick();
 assert.equal(frappes.length,nb);assert.equal(c.step,position);assert.equal(c.nextT,prochaineDate);assert.equal(c.AUDIT.tDernier,0);
 c.ctx.state='running';c.tick();assert(frappes.length>nb);assert.equal(c.AUDIT.decroche,2);
}
{
 const {c}=fixture();c.ctx.state='running';c.AUDIT.decroche=0;c.start();c.maintenant=c.nextT+.01;c.tick();assert.equal(c.AUDIT.decroche,0,'tolérance pour un petit retard');
}
console.log('Transport v200 : reprise sans rafale, suspension, reprise et tolérance OK.');
{
 const {c}=fixture();c.T1K={motionRec:true};c.stop();assert.equal(c.T1K.motionRec,false,'STOP désarme aussi la TR-1000 secondaire');
}
