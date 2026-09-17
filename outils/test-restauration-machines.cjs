// Régressions de restauration : ouvrir directement une machine doit retrouver
// sa mémoire sans dépendre d'une visite préalable de la machine ARCHIVE.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const lire = nom => fs.readFileSync(path.join(__dirname, '..', nom), 'utf8');
const copie = o => JSON.parse(JSON.stringify(o));
const facade = lire('page/js/590-smpltrek-dix-pistes.js');
function fonction(source, nom) {
  const debut = source.indexOf('function ' + nom + '(');
  assert(debut >= 0, nom + ' existe dans la source');
  const fin = source.indexOf('\n}', debut);
  assert(fin >= 0, nom + ' se termine');
  return source.slice(debut, fin + 2);
}
function contexte(id, sauvegarde, sansAudio = false) {
  const c = {S:{modele:'16', run:true}, ctx:sansAudio ? null : {}, master:{}, cache:false,
    memoire:{}, stocke:{[id]:copie(sauvegarde)}, queue:[], frappes:[], actions:[],
    document:{getElementById(nom){return {id:nom};},querySelectorAll(){return [];}},
    audioInit(){c.actions.push('audio');},banqueEs(){},chargerEchs(){},
    memLire(nom){c.actions.push('lire:' + nom);return c.memoire[nom] || c.stocke[nom];},
    sauverMachine(nom){c.stocke[nom]=copie(c.memoire[nom]);},
    save(){c.actions.push('save:' + c.S.modele);},
    stop(){c.actions.push('stop:' + c.S.modele);c.S.run=false;c.queue=[];
      if(c.MACHINE && c.MACHINE.arret)c.MACHINE.arret();},
    poserMachine(nom){c.actions.push('poser:' + nom);},fit(){},
    ouvrirPas(){return 0;},attenuerVoie(){},stepDur(){return .125;},
    debrancherTout(){},
    noeudsStk(){assert(c.ctx,'pas de construction audio sans contexte');},
    noeudsKo(){assert(c.ctx,'pas de construction audio sans contexte');},
    majStk(){c.actions.push('afficher:stk');},majKnobsStk(){},
    majKo(){c.actions.push('afficher:ko');},
  };
  vm.createContext(c);
  if(id === 'stk') {
    vm.runInContext(facade.slice(0,facade.indexOf('/* ---------- la façade du KAOSS PAD')),c);
    vm.runInContext(fonction(facade,'activerStk'),c);
    c.voixStk=(...args)=>c.frappes.push(args);
  } else {
    vm.runInContext(lire('page/js/560-pocket-operator-k-o.js'),c);
    vm.runInContext(fonction(facade,'activerKo'),c);
    c.voixKo=(...args)=>c.frappes.push(args);
  }
  c.noeudsStk=c.noeudsKo=()=>assert(c.ctx,'pas de construction audio sans contexte');
  return c;
}
function exemple(id) {
  const pistes = id === 'stk' ? 10 : 16, motifs = id === 'stk' ? 8 : 16;
  const s={cur:2,sel:3,chaine:[2,4],motifs:Array.from({length:motifs},(_,i)=>({
    last:16,pas:Array.from({length:pistes},(_,k)=>i===2&&k===3 ? (1<<5) : 0)
  }))};
  if(id === 'stk')s.pistes=Array.from({length:pistes},(_,i)=>({
    ech:'b'+(i+4),niv:.67,pan:-.2,tune:.35,dec:.61,filt:.75,muet:i===5
  }));
  else s.sons=Array.from({length:16},(_,i)=>'b'+(i+4));
  return s;
}
for(const id of ['ko','stk']) {
  const sauvegarde=exemple(id),c=contexte(id,sauvegarde),suffixe=id==='ko'?'Ko':'Stk';
  let ancienneArretee=false;
  c.MACHINE={arret(){ancienneArretee=true;assert.equal(c.S.modele,'16');}};
  c['activer'+suffixe]();
  assert(ancienneArretee,id+' arrête la machine précédente avant le changement');
  assert(!c.S.run);assert.equal(c.S.modele,id);
  assert.strictEqual(c.MACHINE,c['MACHINE_'+id.toUpperCase()]);
  assert.equal(c.actions[0],'stop:16');
  assert(c.actions.indexOf('lire:'+id)<c.actions.indexOf('afficher:'+id),'restauration avant affichage');
  assert(c.actions.includes('save:'+id),'le dernier modèle ouvert est mémorisé');
  const etat=c[id.toUpperCase()];
  assert.equal(etat.cur,2);assert.equal(etat.sel,3);
  assert.deepStrictEqual(copie(etat.motifs),sauvegarde.motifs);
  assert.deepStrictEqual(copie(etat.chaine),sauvegarde.chaine);
  assert.deepStrictEqual(copie(etat[id==='stk'?'pistes':'sons']),sauvegarde[id==='stk'?'pistes':'sons']);
  assert.equal(c.frappes.length,0,'ouvrir ne joue aucune note');
  c['schedule'+suffixe](5,1);
  assert.deepStrictEqual(c.frappes.map(f=>f[1]),[3],'la lecture utilise le motif restauré');
  etat.motifs[2].pas[3] |= (1<<6);
  c['mem'+suffixe]();
  const reprise=contexte(id,c.stocke[id]);reprise['activer'+suffixe]();
  assert.equal(reprise[id.toUpperCase()].motifs[2].pas[3],(1<<5)|(1<<6),'édition puis nouvelle session');
  const sansAudio=contexte(id,sauvegarde,true);
  sansAudio['activer'+suffixe]();
  assert.equal(sansAudio[id.toUpperCase()].cur,2,'la mémoire revient même sans WebAudio');
  console.log('ok '+id+' : ouverture directe, transport arrêté, motif et sons restaurés, édition conservée');
}

// MPC / DMX : les vrais gestionnaires des commandes permettent de vérifier
// la quantification mémorisée et l'isolation d'UNDO entre les séquences.
function element() {
  const e={dataset:{},style:{},childNodes:[],listeners:{},textContent:'',
    classList:{add(){},remove(){},toggle(){}},
    addEventListener(n,f){this.listeners[n]=f;},appendChild(n){this.childNodes.push(n);},
    querySelector(){return element();},querySelectorAll(){return [];},
    getBoundingClientRect(){return {top:0,height:100};},setPointerCapture(){},
    closest(){return this;}};
  return e;
}
function sequenceur(id) {
  const elements={},c={memoire:{},S:{modele:id,run:false,bpm:120},ctx:{},
    H:{inter(){},cran(){}},stocke:{},signals:[],
    document:{getElementById(n){return elements[n]||(elements[n]=element());},
      createElement:element,querySelector(){return element();},querySelectorAll(){return [];}},
    memLire(n){return c.stocke[n];},sauverMachine(n){c.stocke[n]=copie(c.memoire[n]);},
    knobEm(){return {maj(){}};},setTimeout(){},clearTimeout(){},
    signal(s){c.signals.push(s);},audioInit(){},banqueEs(){},maintenantAudio(){return 1;},
    stepDur(){return .125;},
  };
  vm.createContext(c);
  vm.runInContext(lire(id==='mpc'?'page/js/340-akai-mpc3000-mpc2000.js':'page/js/520-oberheim-dmx.js'),c);
  c.majLcdMpc=c.majPadsMpc=c.majAffDmx=()=>{};
  c.affDmx=s=>c.signals.push(s);
  c.jouerPad=c.voixDmx=()=>{};
  return {c,cliquer(n,data={}){const cible=element();cible.dataset=data;
    assert(elements[n]&&elements[n].listeners.click,n+' câblé dans la vraie source');
    elements[n].listeners.click.call(elements[n],{target:cible});}};
}
for(const modele of [3000,2000]) {
  const f=sequenceur('mpc'),c=f.c;c.MPC.v=modele;
  c.MPC.seq.q=0;c.MPC.seq.pistes[0].evts=[{tic:13,n:4,vel:.8}];c.memMpc();c.chargerMpc();
  assert.equal(c.MPC.seq.q,0,'MPC'+modele+' : TIMING CORRECT OFF reste OFF après rechargement');
  assert.equal(c.caleMpc(13),13,'sans quantification, une frappe hors grille garde son instant');
  console.log('ok MPC'+modele+' : quantification OFF conservée');
}
{
  const f=sequenceur('dmx'),c=f.c;c.DMX.seqs[0].q=0;c.memDmx();c.chargerDmx();
  assert.equal(c.DMX.seqs[0].q,0,'DMX : QUANTIZE OFF reste OFF après rechargement');
  assert.equal(c.caleDmx(13),13);
  console.log('ok DMX : quantification OFF conservée');
}
{
  const f=sequenceur('mpc'),c=f.c,ancien=[{tic:13,n:4,vel:.8}],autre=[{tic:20,n:9,vel:.7}];
  c.MPC.seq.pistes[0].evts=copie(ancien);c.MPC.seqs[1].pistes[0].evts=copie(autre);
  c.MPC.mode=1;c.MPC.evtSel=0;f.cliquer('mpc-efface');
  assert.equal(c.MPC.seq.pistes[0].evts.length,0);
  f.cliquer('mpc-num',{n:'2'});f.cliquer('mpc-annule');
  assert.deepStrictEqual(copie(c.MPC.seq.pistes[0].evts),autre,'UNDO ne remplace pas une autre séquence');
  f.cliquer('mpc-num',{n:'1'});f.cliquer('mpc-annule');
  assert.deepStrictEqual(copie(c.MPC.seq.pistes[0].evts),ancien,'UNDO retrouve la séquence éditée');
  f.cliquer('mpc-annule');assert.equal(c.MPC.seq.pistes[0].evts.length,0,'second appui rétablit la suppression');
  c.chargerMpc();assert.equal(c.MPC.annule,null,'recharger un modèle vide son historique de session');
  console.log('ok MPC : UNDO isolé par séquence, aller-retour et remise à zéro');
}
{
  const f=sequenceur('dmx'),c=f.c,ancien=[{tic:13,k:4,vel:1}],autre=[{tic:20,k:9,vel:1}];
  c.DMX.seqs[0].evts=copie(ancien);c.DMX.seqs[1].evts=copie(autre);
  f.cliquer('dmx-cmd',{c:'x'});assert.equal(c.DMX.seqs[0].evts.length,0);
  f.cliquer('dmx-num',{n:'2'});f.cliquer('dmx-cmd',{c:'e'});
  assert.deepStrictEqual(copie(c.DMX.seqs[1].evts),autre,'EDIT/UNDO ne remplace pas une autre séquence');
  f.cliquer('dmx-num',{n:'1'});f.cliquer('dmx-cmd',{c:'e'});
  assert.deepStrictEqual(copie(c.DMX.seqs[0].evts),ancien);
  f.cliquer('dmx-cmd',{c:'e'});assert.equal(c.DMX.seqs[0].evts.length,0);
  c.chargerDmx();assert.equal(c.DMX.annule,null,'rechargement sans ancien historique');
  console.log('ok DMX : UNDO isolé par séquence, aller-retour et remise à zéro');
}
