// Un quota temporaire ne doit ni perdre la clé à sauver, ni valider un export périmé.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync(path.join(__dirname,'../page/js/030-memoire.js'),'utf8');
function setup(){
 const values=new Map(),timers=new Map();let sequence=0;
 const c={S:{modele:'es1',vol:.8,bpm:120},HUM:{},WAVX:{},messages:[],refused:new Set(),
   document:{querySelectorAll:()=>[]},signal:s=>c.messages.push(s),
   setTimeout(fn){const id=++sequence;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)},
   localStorage:{getItem:k=>values.get(k)||null,setItem(k,v){if(c.refused.has(k))throw Error('QuotaExceededError');values.set(k,v)}}};
 vm.createContext(c);vm.runInContext(code,c);
 return {c,values,timers,run(id){const fn=timers.get(id);assert(fn);timers.delete(id);fn()}};
}
{
 const t=setup(),{c}=t;c.memoire.es1={motif:'nouveau'};c.sauverMachine('es1');
 c.refused.add('drm.reglages.es1');t.run(c.machineTmr.es1);
 assert.equal(c.machineTmr.es1,null);assert(!t.values.has('drm.reglages.es1'));
 // La clé reste en attente après son minuteur et après un flush en échec.
 assert.equal(c.writeMem(),false);assert(Object.hasOwn(c.machineTmr,'es1'));
 assert(c.memEchec);assert(t.values.has('drm.reglages'),'une autre clé peut réussir sans masquer cet échec');
 c.refused.clear();assert.equal(c.writeMem(),true);
 assert.equal(JSON.parse(t.values.get('drm.reglages.es1')).motif,'nouveau');
 assert(!Object.hasOwn(c.machineTmr,'es1'));assert.equal(c.memEchec,false);
}
{
 const t=setup(),{c}=t;c.memoire.es1={motif:'a'};c.memoire.esx={motif:'b'};
 c.sauverMachine('es1');c.sauverMachine('esx');c.refused.add('drm.reglages.es1');
 assert.equal(c.viderMachines(),false);assert(Object.hasOwn(c.machineTmr,'es1'));assert(!Object.hasOwn(c.machineTmr,'esx'));
 assert.equal(JSON.parse(t.values.get('drm.reglages.esx')).motif,'b');
 c.memoire.es1={motif:'corrigé entre-temps'};c.refused.clear();assert(c.viderMachines());
 assert.equal(JSON.parse(t.values.get('drm.reglages.es1')).motif,'corrigé entre-temps');
}
{
 const t=setup(),{c}=t;c.refused.add('drm.reglages');assert.equal(c.writeMem(),false);
 c.refused.clear();assert.equal(c.writeMem(),true);assert.equal(c.memEchec,false);
}
{
 const t=setup(),{c}=t;c.memoire.es1={motif:'ancien'};c.sauverMachine('es1');c.PROJET_EN_COURS=true;
 assert.equal(c.writeMem(),false);assert.equal(c.ecrireMachine('es1'),false);assert.equal(t.values.size,0);
}
console.log('Mémoire : quota remonté, clés refusées conservées puis retentées, échecs partiels signalés et projet en cours protégé OK.');
