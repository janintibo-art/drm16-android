// Bibliothèque partagée : décodages asynchrones, suppression et usages Kaoss.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const source = fs.readFileSync(path.join(__dirname, '../page/js/280-electribe-es-1.js'), 'utf8');
const begin = source.indexOf('var ES_CHARGES'), end = source.indexOf('function poserEch(');
assert(begin >= 0 && end > begin, 'bloc de chargement des échantillons présent');
const production = source.slice(begin, end);

function setup() {
  const c = {ES:{buf:{}, inv:{}, noms:{}, slots:[]}, SX:{slots:[]}, S:{modele:'kp'},
    KP:{banques:[{ech:'u1',on:true},{ech:'b3',on:true},{ech:'u1',on:false},{ech:'u2',on:true}],
      tranches:[{original:1},{original:2},{original:3},{original:4}]},
    saved:{}, loads:[], stopped:[], removed:[], ledUpdates:0, kpUpdates:0, bibUpdates:0,
    visible:true, ids:'u1', encoded:'AQID', throwDecode:false, atobCalls:0,
    memLire(k){ return c.saved[k]; },
    majLedsEs(){ c.ledUpdates++; }, majKp(){ c.kpUpdates++; }, majBibUI(){ c.bibUpdates++; },
    panneauVisible(){ return c.visible ? 'bib' : null; },
    document:{getElementById(){return {classList:{contains(){return c.visible;}}};}},
    arreterBanqueKp(k){ c.stopped.push(k); c.KP.banques[k].on=false; },
    audioInit(){ throw Error('Un chargement ne doit pas réveiller le moteur'); },
    banqueKp(){ throw Error('Un chargement ne doit pas déclencher une banque'); },
    atob(s){
      c.atobCalls++;
      if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s)) throw Error('base64 invalide');
      return Buffer.from(s, 'base64').toString('binary');
    },
    HOST:{echListe(){return c.ids;}, echCharger(){return c.encoded;}, echSupprimer(id){c.removed.push(id);}},
  };
  function context() {
    const ctx={decodeAudioData(ab, ok, fail){
      assert(ab.byteLength > 0);
      if(c.throwDecode) throw Error('décodage refusé');
      const request={ctx,ok,fail,catcher:null};c.loads.push(request);
      return {catch(fn){request.catcher=fn;}};
    }};
    return ctx;
  }
  c.ctx=context();vm.createContext(c);vm.runInContext(production,c);
  return {c,context};
}

// Deux appels rapprochés ne décodent qu'une fois. Le son restauré apparaît
// dans les façades déjà ouvertes sans déclencher de voix.
{
  const {c}=setup();c.chargerEchs();c.chargerEchs();
  assert.equal(c.loads.length,1);assert.equal(c.atobCalls,1);
  const buffer={name:'restauré'};c.loads[0].ok(buffer);
  assert.strictEqual(c.ES.buf.u1,buffer);assert.equal(c.ES.noms.u1,'mic');
  assert(c.ledUpdates>0&&c.kpUpdates>0&&c.bibUpdates>0);
  assert.deepStrictEqual(c.stopped,[]);assert(c.KP.banques[0].on);
  c.chargerEchs();assert.equal(c.loads.length,1);
  c.visible=false;c.S.modele='es1';const before=[c.kpUpdates,c.bibUpdates];
  c.actualiserEchs();assert.deepStrictEqual([c.kpUpdates,c.bibUpdates],before);
}

// Changer de contexte pendant un décodage autorise une nouvelle requête.
// L'ancienne réussite ou erreur ne publie rien et ne déverrouille pas la nouvelle.
for(const completion of ['ok','fail']) {
  const {c,context}=setup();c.chargerEchs();const old=c.loads[0];
  c.ctx=context();c.chargerEchs();const current=c.loads[1];
  assert.equal(c.loads.length,2);old[completion]({name:'périmé'});
  assert(!c.ES.buf.u1);c.chargerEchs();assert.equal(c.loads.length,2);
  const buffer={name:'courant'};current.ok(buffer);assert.strictEqual(c.ES.buf.u1,buffer);
  old.ok({name:'encore périmé'});assert.strictEqual(c.ES.buf.u1,buffer);
}

// Les erreurs de décodage, synchrones comme asynchrones, permettent un nouvel essai.
{
  const {c}=setup();c.chargerEchs();const first=c.loads[0];first.fail(Error('endommagé'));
  if(first.catcher) first.catcher(Error('promesse rejetée'));
  assert(!c.ES.buf.u1);c.chargerEchs();assert.equal(c.loads.length,2);
  c.loads[1].ok({name:'récupéré'});assert(c.ES.buf.u1);
}
{
  const {c}=setup();c.throwDecode=true;assert.doesNotThrow(()=>c.chargerEchs());
  assert.equal(c.loads.length,0);c.throwDecode=false;c.chargerEchs();assert.equal(c.loads.length,1);
}
{
  const {c}=setup();c.encoded='%%%';assert.doesNotThrow(()=>c.chargerEchs());
  assert.equal(c.loads.length,0);c.encoded='AQID';c.chargerEchs();assert.equal(c.loads.length,1);
}

// Un tampon déjà remplacé par un traitement ou un import garde la priorité.
{
  const {c}=setup();c.chargerEchs();const treated={name:'traité'};
  c.ES.buf.u1=treated;c.ES.noms.u1='fichier';c.loads[0].ok({name:'ancien sur disque'});
  assert.strictEqual(c.ES.buf.u1,treated);assert.equal(c.ES.noms.u1,'fichier');
}

// Supprimer invalide le décodage en vol et libère uniquement les banques
// et les copies de tranches concernées, même si une autre machine est affichée.
{
  const {c}=setup();c.S.modele='es1';c.chargerEchs();const pending=c.loads[0];
  c.ES.inv.u1={};c.ES.noms.u1='mic';const unaffected=[c.KP.tranches[1],c.KP.tranches[3]];
  c.supprimerEch('u1');assert.deepStrictEqual(c.removed,['u1']);assert.deepStrictEqual(c.stopped,[0,2]);
  assert(!c.ES.buf.u1&&!c.ES.inv.u1&&!c.ES.noms.u1);
  assert(!c.KP.tranches[0]&&!c.KP.tranches[2]);
  assert.strictEqual(c.KP.tranches[1],unaffected[0]);assert.strictEqual(c.KP.tranches[3],unaffected[1]);
  assert(c.KP.banques[1].on&&c.KP.banques[3].on);
  pending.ok({name:'supprimé'});assert(!c.ES.buf.u1);assert(!c.ES.noms.u1);
  assert(c.ledUpdates>0&&c.bibUpdates>0);
}

// Le décompte choisit l'état Kaoss actif OU sauvegardé, jamais les deux,
// et conserve le décompte existant des motifs Electribe.
{
  const {c}=setup();
  const motif={son:[{ech:'u1'},{ech:'b0'}]};
  c.saved.kp={banques:[{ech:'u1'},{ech:'u1'},{ech:'u1'},{ech:'b3'}]};
  c.saved.es1={slots:[motif]};c.saved.esx={slots:[motif,motif]};
  assert.equal(c.usagesEch('u1'),5); // Deux banques actives + trois usages mémorisés.
  c.S.modele='es1';c.ES.slots=[motif,motif];
  assert.equal(c.usagesEch('u1'),7); // Trois banques sauvegardées + quatre usages Electribe.
  delete c.saved.kp;assert.equal(c.usagesEch('u1'),4);
  assert.equal(c.usagesEch('inconnu'),0);
}
console.log('Échantillons : chargements dédupliqués, contexte périmé, erreurs récupérables, tampon traité conservé, rafraîchissement sans lecture, suppression sans résurrection et usages Kaoss OK.');

// Les vrais points d'entrée import/micro doivent conserver un avertissement
// d'écriture en dernière position ; le tampon reste utilisable pour la session.
const importsSource=fs.readFileSync(path.join(__dirname,'../page/js/210-transfert-vers-une-vraie-volca-sample.js'),'utf8');
const importBegin=importsSource.indexOf('function importerSonFichier(');
const importEnd=importsSource.indexOf('document.getElementById("menu-pr")',importBegin);
assert(importBegin>=0&&importEnd>importBegin);
const librarySource=fs.readFileSync(path.join(__dirname,'../page/js/630-bibliotheque.js'),'utf8');
const microBegin=librarySource.indexOf('function bibMicro(');
const microEnd=librarySource.indexOf('/* ---------- égaliser le kit',microBegin);
assert(microBegin>=0&&microEnd>microBegin);
async function verifierEcritureImportEtMicro(){
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  for(const kind of ['import','micro']) for(const persisted of [false,true,'decode-failure','opening']){
    const buffer={name:'son décodé'},c={
      PROJET_EN_COURS:false,ES:{buf:{},noms:{}},ES_REC:{mr:null},BIB:{preset:'aucun',noms:{}},
      signals:[],writes:[],refreshes:0,trackStops:0,
      audioInit(){},banqueEs(){},bibEcrire(){},majBibUI(){c.refreshes++;},
      signal(s){c.signals.push(s);},
      reduireEch(b,sr,seconds){assert.strictEqual(b,buffer);assert.equal(sr,32000);assert.equal(seconds,8);return b;},
      traiterSon(b){return {buffer:b,rapport:null};},
      sauverEch(id,b){c.writes.push({id,buffer:b});if(!persisted)c.signal('ÉCHEC D’ÉCRITURE');return persisted;},
      ctx:{decodeAudioData(ab,ok,fail){
        if(persisted==='decode-failure'){
          const error=Error('audio endommagé');fail(error);
          return Promise.reject(error); // Le navigateur rejette aussi sa promesse native.
        }
        if(persisted==='opening')c.PROJET_EN_COURS=true;
        ok(buffer);return Promise.resolve(buffer);
      }},
      HOST:{micro(){return true;}},
      navigator:{mediaDevices:{getUserMedia(){return Promise.resolve({getTracks(){return [{stop(){c.trackStops++;}}];}});}}},
      setTimeout(){return 1;},clearTimeout(){},
      Blob:class {arrayBuffer(){return Promise.resolve(new ArrayBuffer(1));}},
    };
    c.MediaRecorder=class {
      start(){this.started=true;}
      stop(){if(this.ondataavailable)this.ondataavailable({data:{size:1}});this.onstop();}
    };
    c.window={MediaRecorder:c.MediaRecorder};vm.createContext(c);
    vm.runInContext(importsSource.slice(importBegin,importEnd),c);
    vm.runInContext(librarySource.slice(microBegin,microEnd),c);
    if(kind==='import'){
      c.importerSonFichier({name:'Ma prise.wav',size:12,arrayBuffer(){return Promise.resolve(new ArrayBuffer(1));}});
    }else{
      c.bibMicro();await flush();assert(c.ES_REC.mr&&c.ES_REC.mr.started);
      c.bibMicro(); // Le second appui arrête et publie l'enregistrement.
    }
    await flush();
    if(kind==='micro'){assert.equal(c.ES_REC.mr,null);assert.equal(c.trackStops,1);}
    if(persisted==='opening'){
      assert.equal(c.writes.length,0);assert.equal(Object.keys(c.ES.buf).length,0);assert.equal(Object.keys(c.BIB.noms).length,0);
      continue;
    }
    if(persisted==='decode-failure'){
      assert.equal(c.writes.length,0);assert.equal(Object.keys(c.ES.buf).length,0);assert.equal(c.refreshes,0);
      assert.equal(c.signals.at(-1),kind==='import'?'FICHIER ILLISIBLE · Ma prise.wav':'DÉCODAGE IMPOSSIBLE');   /* v257 : le nom du fichier, utile en lot */
      continue;
    }
    assert.equal(c.writes.length,1);const write=c.writes[0];
    assert.strictEqual(write.buffer,buffer);assert.strictEqual(c.ES.buf[write.id],buffer);
    assert.equal(c.ES.noms[write.id],kind==='import'?'fichier':'mic');assert.equal(c.refreshes,1);
    const last=c.signals.at(-1).toUpperCase();
    if(persisted){
      assert(!last.includes('ÉCHEC'));assert(last.startsWith(kind==='import'?'IMPORTÉ':'SON AJOUTÉ'));
    }else{
      assert(last.includes('ÉCHEC')&&last.includes('SESSION'),kind+' : échec durable conservé dans le dernier message');
    }
    if(kind==='import') assert.equal(c.BIB.noms[write.id],'Ma prise');
  }
  console.log('Import/micro : succès durable ou échec d’écriture explicite, tampon conservé pour la session, double rejet de décodage rattrapé, micro arrêté et libéré OK.');
}
verifierEcritureImportEtMicro().catch(error=>{console.error(error);process.exitCode=1;});

// Les MPC et la Volca partagent les mêmes fichiers : leur usage doit aussi
// déclencher la confirmation de suppression, sans compter deux fois l'actif.
{
  const {c}=setup();
  c.saved.mpc3000={pads:[{ech:'u-mpc'},{ech:'u-mpc'}]};
  c.saved.mpc2000={pads:[{ech:'u-mpc'}]};
  c.saved.vlc={motifs:[{parties:[{ech:'u-mpc'},{ech:'b0'}]}]};
  assert.equal(c.usagesEch('u-mpc'),4);
  c.S.modele='mpc3000';c.MPC={pads:[{ech:'u-mpc'}]};
  assert.equal(c.usagesEch('u-mpc'),3);
  c.S.modele='vlc';c.VLC={motifs:[{parties:[{ech:'u-mpc'},{ech:'u-mpc'}]}]};
  assert.equal(c.usagesEch('u-mpc'),5);
  c.saved.es1={slots:[null,{son:null}]};assert.equal(c.usagesEch('u-mpc'),5);
}
console.log('Échantillons : usages MPC3000/MPC2000/Volca actifs ou mémorisés comptés sans doublon OK.');

// Pendant le remplacement d'un projet, une fin de prise ES/ESX et les
// écritures communes des imports ne doivent pas écraser la nouvelle mémoire.
{
  const c={PROJET_EN_COURS:true,HOST:{echSauver(){throw Error('écriture tardive de son');}},
    localStorage:{setItem(){throw Error('écriture tardive des noms');}}};
  vm.createContext(c);
  vm.runInContext(source.slice(source.indexOf('function sauverEch('),source.indexOf('/* v170 :')),c);
  vm.runInContext(source.slice(source.indexOf('function poserEch('),source.indexOf('function echantillonner(')),c);
  const sx=fs.readFileSync(path.join(__dirname,'../page/js/300-electribe-esx-1.js'),'utf8');
  vm.runInContext(sx.slice(sx.indexOf('function poserEchSx('),sx.indexOf('document.getElementById("sx-import")')),c);
  vm.runInContext(librarySource.slice(librarySource.indexOf('function bibEcrire('),librarySource.indexOf('/* le nom donné')),c);
  assert.equal(c.sauverEch('u-tardif',{}),false);c.bibEcrire();c.poserEch(0,{},'mic');c.poserEchSx({},'mic',0);
}
async function verifierImportArchivePendantProjet(){
  const ar=fs.readFileSync(path.join(__dirname,'../page/js/620-la-collection-archive-org.js'),'utf8');
  const fragment=ar.slice(ar.indexOf('function arcSon('),ar.indexOf('/* ---------- interface ---------- */'));
  for(const ouverture of [false,true]){
    const c={PROJET_EN_COURS:false,ARC:{occupe:false,base:'https://example.invalid',machine:{zip:'kit.zip',nom:'kit'}},
      ES:{buf:{},noms:{}},BIB:{noms:{},preset:'aucun'},writes:0,names:0,
      audioInit(){},banqueEs(){},majArcUI(){},signal(){},H:{inter(){}},
      netCharger:()=>Promise.resolve('AQID'),b64VersOctets:()=>new Uint8Array(3),
      ctx:{decodeAudioData(ab,ok){c.PROJET_EN_COURS=ouverture;ok({duration:1,sampleRate:32000})}},
      reduireEch:b=>b,traiterSon:b=>({buffer:b}),bibEcrire(){c.names++},sauverEch(){c.writes++}};
    vm.createContext(c);vm.runInContext(fragment,c);c.arcSon({interne:'test.wav',nom:'test.wav'},true);
    await new Promise(resolve=>setImmediate(resolve));assert.equal(c.ARC.occupe,false);
    assert.equal(c.writes,ouverture?0:1);assert.equal(c.names,ouverture?0:1);
    assert.equal(Object.keys(c.ES.buf).length,ouverture?0:1);
  }
  console.log('Ouverture de projet : import/micro/archive tardifs ignorés, affectations ES/ESX et écritures sons/noms protégées OK.');
}
verifierImportArchivePendantProjet().catch(error=>{console.error(error);process.exitCode=1;});
