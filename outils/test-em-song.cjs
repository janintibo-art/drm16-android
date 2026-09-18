const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const em=fs.readFileSync(path.join(__dirname,'../page/js/250-electribe-em-1.js'),'utf8');
const ex=fs.readFileSync(path.join(__dirname,'../page/js/550-export-audio.js'),'utf8');
function f(src,n){let i=src.indexOf('function '+n+'(');assert(i>=0);return src.slice(i,src.indexOf('\n}',i)+2);}
function setup(){
 const dom={body:{inert:false},addEventListener(){},removeEventListener(){},getElementById:()=>({})};
 const c={S:{modele:'em1',run:false},WAVX:{occupe:false,mesures:9},ENR:{ondesOccupe:false,actif:false,lecture:null},PR:{lecture:false},PROJET_EN_COURS:false,HOST:{fichierSauver(){}},SET:{bus:{}},ctx:{live:true},master:{},noiseBuf:{},cache:false,outBd:{},outMix:{},panBd:{},panMix:{},document:dom,H:{inter(){},stop(){}},appels:[],messages:[],fichiers:[],audioInit(){},memEm(){},writeMem:()=>true,stepDur:()=>.125,refusWavTropLong:()=>false,signal(x){c.messages.push(x);},batirAudio(){if(c.echec==='preparer')throw Error('préparer');},razNoeudsMachines(){c.EM.noeuds=[];},majTouches(){},majBascules(){},majMotionLeds(){},majKnobsPartie(){},majLcd(){},ecrireDocument(h,n,ab){c.fichiers.push({n,ab});return '/doc/'+n;},stop(){c.S.run=false;},enrArreterLecture(){},prArreter(){}};
 vm.createContext(c);
 vm.runInContext(em.slice(em.indexOf('var ONDES ='),em.indexOf('function nomNote('))+em.slice(em.indexOf('function ligneVide('),em.indexOf('function poser('))+f(em,'serialiser')+'\n'+f(em,'deserialiser'),c);
 c.EM={cur:2,pat:c.motifVide(),slots:Array.from({length:16},()=>c.motifVide()),song:[0,1,0,2],page:3,pasSel:63,spos:2,ssel:1,mode:2,noeuds:[]};c.EM.slots[0].len=4;c.EM.slots[1].len=32;c.EM.pat.len=64;
 c.MACHINE={longueur:()=>c.EM.pat.len,schedule(i,t){if(c.echec==='schedule')throw Error('schedule');c.appels.push([c.EM.cur,i,t]);},boucle(){c.boucles=(c.boucles||0)+1;}};
 c.allerMachine=()=>{c.EM.cur=0;c.EM.pat=c.EM.slots[0];c.EM.page=0;c.EM.pasSel=-1;};
 c.window={OfflineAudioContext:class{constructor(ch,n,sr){if(c.echec==='allocation')throw Error('allocation');c.n=n;this.length=n;this.sampleRate=sr;}startRendering(){if(c.echec==='render-sync')throw Error('render-sync');if(c.echec==='render')return Promise.reject(Error('render'));return Promise.resolve({length:8,numberOfChannels:2,sampleRate:44100,getChannelData:()=>new Float32Array(8)});}}};
 vm.runInContext(ex.slice(ex.indexOf('function wavStereo(')),c);return c;
}
const copie=x=>JSON.parse(JSON.stringify(x));
async function vider(){for(let i=0;i<8;i++)await Promise.resolve();}
(async()=>{
 let c=setup(),plan=c.planSongEm();assert.equal(plan.pas,104);assert.deepStrictEqual(copie(plan.entrees.map(e=>e.debut)),[0,4,36,40]);assert.deepStrictEqual(copie(plan.entrees.map(e=>e.motif.len)),[4,32,4,64]);
 plan.entrees[0].motif.st[0][0]=1;assert.equal(c.EM.slots[0].st[0][0],0);assert.equal(plan.entrees[2].motif.st[0][0],0);
 for(const song of [[],[16],[-1],[.5],['1'],Array(257).fill(0)]){c.EM.song=song;assert.throws(()=>c.planSongEm());}
 c=setup();const avant=copie(c.EM),ctx=c.ctx,bus=c.SET.bus;c.exporterWav(true);assert(c.document.body.inert);assert(c.WAVX.occupe);await vider();
 assert.equal(c.appels.length,104);assert.deepStrictEqual(c.appels[4],[1,0,.55]);assert.deepStrictEqual(c.appels[36],[0,0,4.55]);assert.deepStrictEqual(c.appels[103],[2,63,12.925]);assert.equal(c.n,Math.ceil((104*.125+2.5)*44100));assert(!c.boucles);assert.equal(c.fichiers.length,1);assert(c.fichiers[0].n.startsWith('drm-em1-song-4ent-'));assert.deepStrictEqual(copie(c.EM),avant);assert.strictEqual(c.ctx,ctx);assert.strictEqual(c.SET.bus,bus);assert(!c.WAVX.occupe&&!c.document.body.inert);
 for(const echec of ['allocation','preparer','schedule','render','render-sync']){c=setup();const a=copie(c.EM),live=c.ctx;c.echec=echec;c.exporterWav(true);await vider();assert.deepStrictEqual(copie(c.EM),a,echec);assert.strictEqual(c.ctx,live,echec);assert(!c.WAVX.occupe&&!c.document.body.inert,echec);assert.equal(c.fichiers.length,0,echec);}
 c=setup();c.refusWavTropLong=()=>true;c.exporterWav(true);assert.equal(c.appels.length,0);assert(!c.WAVX.occupe);assert.equal(c.EM.cur,2);
 c=setup();c.ENR.actif=true;c.exporterWav(true);assert.equal(c.appels.length,0);
 c=setup();c.WAVX.mesures=2;c.exporterWav();await vider();assert.equal(c.appels.length,128);assert.equal(c.boucles,2);assert(c.fichiers[0].n.startsWith('drm-em1-2mes-'));
 console.log('EM-1 v219 : Song 4/32/4/64, répétitions, copie indépendante, durée, un passage, restauration sur succès/échecs et export habituel OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
