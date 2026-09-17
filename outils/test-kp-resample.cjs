// Kaoss : capture de la vraie sortie, durée bornée et courses asynchrones.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const production=fs.readFileSync(path.join(__dirname,'../page/js/570-korg-kaoss-pad.js'),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function buffer(channels,length,rate){
  const data=Array.from({length:channels},()=>new Float32Array(length));
  return {length,numberOfChannels:channels,sampleRate:rate,duration:length/rate,
    getChannelData(k){return data[k];},copyFromChannel(out,k,start){out.set(data[k].subarray(start,start+out.length));}};
}
function setup(options={}){
  const timers=new Map(),events={document:{},window:{}},destinations=[],recorders=[];
  let nextTimer=0;
  const c={signals:[],writes:[],decodes:[],blobTypes:[],updates:0,bibWrites:0,now:1000,
    S:{modele:'kp',run:false,bg:true},ES:{buf:{},noms:{},inv:{}},BIB:{noms:{},preset:'punch'},
    signal(message){c.signals.push(message);},audioInit(){},banqueEs(){},bibLire(){},
    bibEcrire(){c.bibWrites++;},actualiserEchs(){c.updates++;},majKp(){c.updates++;},majPriseKp(){c.updates++;},
    sauverEch(id,b){c.writes.push({id,buffer:b});return options.persist!==false;},
    performance:{now(){return c.now;}},
    setTimeout(fn,delay){const id=++nextTimer;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);},
    setInterval(fn,delay){const id=++nextTimer;timers.set(id,{fn,delay,interval:true});return id;},clearInterval(id){timers.delete(id);},
    navigator:{mediaDevices:{getUserMedia(){throw Error('La capture interne ne doit jamais demander le micro');}}},
    document:{hidden:false,addEventListener(name,fn){events.document[name]=fn;},getElementById(){return null;}},
    window:{addEventListener(name,fn){events.window[name]=fn;}},
    debrancherTout(nodes){for(const key in nodes){const n=nodes[key];if(n&&n.connections)n.disconnect();}},
  };
  class AudioNode{
    constructor(){this.connections=[];this.disconnects=[];}
    connect(target){this.connections.push(target);return target;}
    disconnect(target){this.disconnects.push(target);this.connections=target?this.connections.filter(x=>x!==target):[];}
  }
  function context(){
    const ctx={state:options.suspended?'suspended':'running',sampleRate:48000,currentTime:1,
      createBuffer:buffer,
      createMediaStreamDestination(){
        if(options.failDestination)throw Error('destination refusée');
        const dest=new AudioNode(),track={stops:0,stop(){this.stops++;}};
        dest.stream={getTracks(){return [track];},getAudioTracks(){return [track];}};dest.track=track;
        destinations.push(dest);return dest;
      },
      resume(){
        if(options.resumeFailure)return Promise.reject(Error('reprise refusée'));
        if(options.resumeDeferred)return options.resumeDeferred.promise.then(()=>{ctx.state='running';});
        ctx.state='running';return Promise.resolve();
      },
      decodeAudioData(ab,ok,fail){
        if(options.throwDecode)throw Error('décodeur indisponible');
        const d=deferred();c.decodes.push({ctx,ok,fail,promise:d.promise,
          succeed(b){if(ok)ok(b);d.resolve(b);},
          reject(){const e=Error('audio invalide');if(fail)fail(e);d.reject(e);}});
        return d.promise;
      },
    };
    return ctx;
  }
  c.ctx=context();
  class Recorder{
    constructor(stream){
      if(options.failConstructor)throw Error('format indisponible');
      this.stream=stream;this.state='inactive';this.mimeType='audio/webm;codecs=opus';this.stops=0;recorders.push(this);
    }
    start(){if(options.failStart)throw Error('capture refusée');this.state='recording';}
    stop(){this.stops++;if(options.failStop)throw Error('arrêt refusé');this.state='inactive';}
    complete(empty=false){
      this.state='inactive';if(this.ondataavailable)this.ondataavailable({data:{size:empty?0:12}});
      if(this.onstop)this.onstop();
    }
  }
  c.MediaRecorder=Recorder;c.window.MediaRecorder=Recorder;
  c.Blob=class{
    constructor(chunks,settings){this.size=chunks.reduce((n,x)=>n+x.size,0);c.blobTypes.push(settings&&settings.type);}
    arrayBuffer(){
      if(options.blobFailure)return Promise.reject(Error('contenu illisible'));
      return options.blobDeferred?options.blobDeferred.promise:Promise.resolve(new ArrayBuffer(this.size));
    }
  };
  vm.createContext(c);vm.runInContext(production,c);
  const output=new AudioNode(),monitor=new AudioNode();output.connect(monitor);c.KP.noeuds={ctx:c.ctx,out:output};
  const fireTimer=(predicate)=>{
    const found=[...timers].find(([,t])=>predicate(t));assert(found,'minuteur attendu');
    if(!found[1].interval)timers.delete(found[0]);found[1].fn();
  };
  return {c,timers,events,destinations,recorders,output,monitor,context,fireTimer,
    async start(){c.demarrerPriseKp();await flush();return recorders.at(-1);},
    async finish(mr){c.terminerPriseKp();mr.complete();await flush();return c.decodes.at(-1);},
  };
}
function installCaptureUi(c){
  const source=fs.readFileSync(path.join(__dirname,'../page/js/590-smpltrek-dix-pistes.js'),'utf8');
  const controls={};
  for(const id of ['kp-resample','kp-annuler-prise','kp-prise-etat']){
    const classes=new Set();controls[id]={textContent:'',disabled:false,attributes:{},listeners:{},
      classList:{toggle(name,on){on?classes.add(name):classes.delete(name);},contains(name){return classes.has(name);}},
      setAttribute(name,value){this.attributes[name]=value;},addEventListener(name,fn){this.listeners[name]=fn;}};
  }
  c.document.getElementById=id=>controls[id];c.H={inter(){}};
  const start=source.indexOf('function majPriseKp('),end=source.indexOf('function majTranchesKp(',start);
  const events=source.indexOf('document.getElementById("kp-resample").addEventListener');
  const after=source.indexOf('document.getElementById("kp-selection").addEventListener',events);
  assert(start>=0&&end>start&&events>=0&&after>events,'vraie façade de capture présente');
  vm.runInContext(source.slice(start,end),c);vm.runInContext(source.slice(events,after),c);c.majPriseKp();
  return controls;
}

function verifierControleWavNavigateur(){
  // add_init_script et evaluate ont des portées distinctes : seul ce que le
  // pont publie sur window peut être utilisé par le contrôle du WAV.
  const navigateur=fs.readFileSync(path.join(__dirname,'test-navigateur.py'),'utf8');
  const pont=navigateur.match(/^PONT = r"""([\s\S]*?)"""/m);
  const controle=navigateur.match(/pg\.evaluate\("""(\(avant\) => \{\s*var ajoutes =[\s\S]*?)""", avant\)/);
  assert(pont&&controle,'vrai pont et vrai contrôle WAV du test navigateur présents');
  const stockage=new Map(),c={
    atob(s){return Buffer.from(s,'base64').toString('binary');},
    btoa(s){return Buffer.from(s,'binary').toString('base64');},
    localStorage:{getItem(k){return stockage.get(k)||null;},setItem(k,v){stockage.set(k,v);}},
    ctx:{sampleRate:48000},ES:{buf:{}},BIB:{noms:{}},
    KP:{banques:[{ech:'b0',mode:'loop',on:false}],sources:[null,null,null,null]},
  };
  c.window=c;c.__kpEssai={banques:JSON.stringify(c.KP.banques)};
  vm.createContext(c);vm.runInContext('(function(){'+pont[1]+'\n})();',c);
  assert.equal(vm.runInContext('typeof __dec',c),'undefined','le décodeur privé ne fuit pas dans evaluate');
  const echantillons=fs.readFileSync(path.join(__dirname,'../page/js/280-electribe-es-1.js'),'utf8');
  const debut=echantillons.indexOf('function wavDe('),fin=echantillons.indexOf('function b64De(',debut);
  assert(debut>=0&&fin>debut,'vrai encodeur WAV présent');
  vm.runInContext(echantillons.slice(debut,fin),c);
  const son=buffer(1,4800,48000),d=son.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=.2*Math.sin(2*Math.PI*440*i/48000);
  const wav=Buffer.from(c.wavDe(son)).toString('base64');
  c.DRM16.echSauver('prise-precedente',wav);
  const avant=Object.keys(c.__E),id='prise-kaoss';
  c.ES.buf[id]=son;c.BIB.noms[id]='KAOSS ESSAI';
  assert(c.DRM16.echSauver(id,wav));
  const resultat=vm.runInContext('('+controle[1]+')',c)(avant);
  assert.equal(resultat.nombre,1);assert.equal(resultat.id,id);assert.equal(resultat.nom,'KAOSS ESSAI');
  assert.equal(resultat.riff,'RIFF');assert.equal(resultat.wave,'WAVE');
  assert.equal(resultat.format,1);assert.equal(resultat.bits,16);assert.equal(resultat.canaux,1);
  assert.equal(resultat.taux,48000);assert.equal(resultat.tauxContexte,48000);assert.equal(resultat.duree,.1);
  assert(Math.abs(resultat.rms-.2/Math.sqrt(2))<.00003,'le contrôle mesure les vrais échantillons PCM');
  assert(resultat.taille&&resultat.tampon&&resultat.intact,'taille, tampon mémoire et banques inchangées');
  assert.equal(JSON.parse(stockage.get('__pont')).e[id],wav,'WAV conservé par le vrai pont');
  console.log('Kaoss navigateur : contrôle réel du WAV avec décodeur du pont privé, en-tête, RMS, taille et banques intactes OK.');
}

async function run(){
  verifierControleWavNavigateur();
  // La conversion conserve le niveau et la moyenne stéréo, sans le preset
  // de la bibliothèque ; une capture longue ne dépasse jamais huit secondes.
  {
    const {c}=setup(),input=buffer(2,48000*9,48000);
    input.getChannelData(0).fill(.2);input.getChannelData(1).fill(.6);
    const result=c.copierPriseKp(input,c.ctx);
    assert.equal(result.numberOfChannels,1);assert.equal(result.sampleRate,48000);assert.equal(result.length,384000);
    assert(Math.abs(result.getChannelData(0)[16000]-.4)<1e-6,'aucune normalisation automatique');
    assert(Math.abs(input.getChannelData(0)[0]-.2)<1e-6,'original intact');
  }

  // Capture nominale et écriture refusée : le son rejoint la bibliothèque
  // mais aucune banque n'est affectée ni déclenchée automatiquement.
  for(const persisted of [true,false]){
    const f=setup({persist:persisted}),{c}=f,banks=JSON.stringify(c.KP.banques);
    const mr=await f.start();assert(mr&&mr.state==='recording');
    assert(f.output.connections.includes(f.monitor),'la sortie audible reste branchée');
    assert(f.output.connections.includes(f.destinations[0]),'la capture écoute la sortie Kaoss');
    c.demarrerPriseKp();await flush();assert.equal(f.recorders.length,1,'pas de double capture');
    const decode=await f.finish(mr);assert(decode&&decode.ctx===c.ctx);
    assert(f.output.connections.includes(f.monitor),'arrêter la capture ne coupe pas le son');
    assert(!f.output.connections.includes(f.destinations[0]));
    const input=buffer(1,4800,48000);input.getChannelData(0).fill(.25);decode.succeed(input);await flush();
    assert.equal(c.writes.length,1);const saved=c.writes[0];assert.strictEqual(c.ES.buf[saved.id],saved.buffer);
    assert(c.BIB.noms[saved.id]&&/KAOSS/i.test(c.BIB.noms[saved.id]));
    assert.equal(JSON.stringify(c.KP.banques),banks);assert(c.KP.sources.every(x=>x===null));
    assert.equal(c.KP.prise,null);assert.equal(f.destinations[0].track.stops,1);
    assert.equal(c.blobTypes[0],mr.mimeType);
    assert.equal(f.timers.size,0,'tous les minuteurs sont libérés');
    const last=c.signals.at(-1).toUpperCase();
    if(!persisted)assert(last.includes('SESSION')&&last.includes('ÉCHEC'));
    else assert(!last.includes('ÉCHEC'));
  }
  // Annulation en enregistrement, dans la lecture du Blob ou dans le
  // décodeur : les anciennes callbacks ne publient jamais une prise tardive.
  for(const stage of ['recording','blob','decode']){
    const blob=stage==='blob'?deferred():null,f=setup({blobDeferred:blob}),{c}=f;
    const mr=await f.start(),oldData=mr.ondataavailable,oldStop=mr.onstop,oldError=mr.onerror;
    let decode;
    if(stage!=='recording')decode=await f.finish(mr);
    c.annulerPriseKp();assert.equal(c.KP.prise,null);assert.equal(f.destinations[0].track.stops,1);
    assert(f.output.connections.includes(f.monitor));assert.equal(f.timers.size,0);
    const newMr=await f.start(),current=c.KP.prise;
    oldData({data:{size:12}});oldStop();oldError();
    if(blob)blob.resolve(new ArrayBuffer(12));
    if(decode)decode.succeed(buffer(1,4800,48000));
    await flush();assert.equal(c.writes.length,0);assert.strictEqual(c.KP.prise,current);
    assert.equal(newMr.state,'recording');c.annulerPriseKp();
  }

  // STOP global et changement de moteur annulent, même séquenceur arrêté.
  {
    const f=setup(),{c}=f;const mr=await f.start(),late=mr.onstop;
    c.arretKp();late();await flush();assert.equal(c.KP.prise,null);assert.equal(c.writes.length,0);
    assert.equal(f.destinations[0].track.stops,1);assert.equal(f.timers.size,0);
  }
  for(const change of ['context','machine','suspended']){
    const f=setup(),{c}=f;await f.start();
    if(change==='context')c.ctx=f.context();
    if(change==='machine')c.S.modele='es1';
    if(change==='suspended')c.ctx.state='suspended';
    f.fireTimer(t=>t.interval);assert.equal(c.KP.prise,null);assert.equal(c.writes.length,0);
    assert.equal(f.destinations[0].track.stops,1);assert.equal(f.timers.size,0);
  }

  // Pas de demande de permission micro, et aucune ressource conservée quand
  // l'appareil refuse le graphe, l'encodeur, son démarrage ou sa terminaison.
  for(const option of ['failDestination','failConstructor','failStart','failStop','blobFailure','throwDecode']){
    const f=setup({[option]:true}),{c}=f;const mr=await f.start();
    if(['failStop','blobFailure','throwDecode'].includes(option)){
      c.terminerPriseKp();if(option!=='failStop')mr.complete();await flush();
    }
    assert.equal(c.KP.prise,null,option);assert.equal(c.writes.length,0,option);assert.equal(f.timers.size,0,option);
    assert(f.output.connections.includes(f.monitor),option);
    for(const dest of f.destinations)assert.equal(dest.track.stops,1,option);
  }
  for(const failure of ['empty','unexpected-stop','recorder-error','too-large','decode']){
    const f=setup(),{c}=f,mr=await f.start();
    if(failure==='empty'){c.terminerPriseKp();mr.complete(true);}
    if(failure==='unexpected-stop')mr.complete();
    if(failure==='recorder-error')mr.onerror(Error('encodeur interrompu'));
    if(failure==='too-large')mr.ondataavailable({data:{size:9*1024*1024}});
    if(failure==='decode'){const d=await f.finish(mr);d.reject();}
    await flush();assert.equal(c.KP.prise,null,failure);assert.equal(c.writes.length,0,failure);
    assert.equal(f.destinations[0].track.stops,1,failure);assert.equal(f.timers.size,0,failure);
  }

  // Limite d'enregistrement puis garde-fous de terminaison/décodage : un
  // navigateur bloqué rend la commande disponible pour un nouvel essai.
  {
    const f=setup(),{c}=f,mr=await f.start();f.fireTimer(t=>t.delay===8000);
    assert.equal(mr.stops,1);assert.equal(c.KP.prise.phase,'conversion');
    f.fireTimer(t=>t.delay===15000);assert.equal(c.KP.prise,null);assert.equal(f.timers.size,0);
    assert.equal(f.destinations[0].track.stops,1);
  }
  {
    const f=setup(),{c}=f,mr=await f.start(),d=await f.finish(mr);
    f.fireTimer(t=>t.delay===15000);assert.equal(c.KP.prise,null);
    d.succeed(buffer(1,4800,48000));await flush();assert.equal(c.writes.length,0);assert.equal(f.timers.size,0);
  }
  for(const option of ['ready','resumeFailure','cancel','timeout']){
    const pending=deferred(),f=setup({suspended:true,resumeDeferred:pending,resumeFailure:option==='resumeFailure'}),{c}=f;
    await f.start();
    if(option==='ready'){pending.resolve();await flush();assert.equal(f.recorders.length,1);c.annulerPriseKp();}
    if(option==='cancel'){c.annulerPriseKp();pending.resolve();await flush();assert.equal(f.recorders.length,0);}
    if(option==='timeout'){f.fireTimer(t=>t.delay===5000);pending.resolve();await flush();assert.equal(f.recorders.length,0);}
    assert.equal(c.KP.prise,null,option);assert.equal(f.timers.size,0,option);
  }
  // audioInit() reprend aussi un contexte suspendu, sans suivre sa promesse.
  // La capture doit posséder l'unique reprise et rattraper son rejet.
  {
    const f=setup({suspended:true,resumeFailure:true}),{c}=f;
    let initialisations=0,reprises=0;const resume=c.ctx.resume;
    c.ctx.resume=function(){reprises++;return resume.call(this);};
    c.audioInit=function(){initialisations++;c.ctx.resume();};
    await f.start();assert.equal(initialisations,0,'ne pas doubler la reprise via audioInit');
    assert.equal(reprises,1);assert.equal(c.KP.prise,null);assert.equal(f.recorders.length,0);assert.equal(f.timers.size,0);
  }
  {
    const f=setup(),{c}=f,available=c.ctx;let initialisations=0;
    c.ctx=null;c.audioInit=function(){initialisations++;c.ctx=available;};
    const mr=await f.start();assert.equal(initialisations,1,'créer le moteur seulement quand il manque');
    assert(mr&&mr.state==='recording');c.annulerPriseKp();assert.equal(f.timers.size,0);
  }
  for(const unsupported of ['recorder','destination','offline','hidden','machine']){
    const f=setup(),{c}=f;
    if(unsupported==='recorder')delete c.window.MediaRecorder;
    if(unsupported==='destination')delete c.ctx.createMediaStreamDestination;
    if(unsupported==='offline')c.ctx.startRendering=()=>{};
    if(unsupported==='hidden')c.document.hidden=true;
    if(unsupported==='machine')c.S.modele='es1';
    await f.start();assert.equal(c.KP.prise,null);assert.equal(f.recorders.length,0);assert.equal(f.timers.size,0);
  }

  // Les véritables commandes reflètent l'état et annulent la prise quand
  // l'application disparaît, même avec la lecture en arrière-plan activée.
  {
    const f=setup(),{c}=f,ui=installCaptureUi(c),bt=ui['kp-resample'],cancel=ui['kp-annuler-prise'];
    assert.equal(bt.textContent,'RESAMPLE');assert(cancel.disabled);
    bt.listeners.click();await flush();assert.equal(bt.textContent,'STOP REC');assert(!bt.disabled&&!cancel.disabled);
    assert.equal(bt.attributes['aria-pressed'],'true');assert(bt.classList.contains('on'));
    c.now+=2350;f.fireTimer(t=>t.interval);assert(ui['kp-prise-etat'].textContent.includes('2 / 8 S'));
    bt.listeners.click();assert(bt.disabled);assert.equal(bt.attributes['aria-pressed'],'false');
    cancel.listeners.click();assert(!bt.disabled&&cancel.disabled);assert.equal(bt.textContent,'RESAMPLE');
  }
  for(const event of ['pagehide','visibilitychange']){
    const f=setup(),{c}=f;installCaptureUi(c);await f.start();assert(c.S.bg);
    if(event==='visibilitychange'){c.document.hidden=true;f.events.document[event]();}
    else f.events.window[event]();
    assert.equal(c.KP.prise,null);assert.equal(f.destinations[0].track.stops,1);assert.equal(f.timers.size,0);
  }
  console.log('Kaoss RESAMPLE : sortie après effets, écoute conservée, pas de micro ni d’affectation automatique, mono sans normalisation borné à 8 s, sauvegarde, annulations asynchrones, échecs et délais bornés OK.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
