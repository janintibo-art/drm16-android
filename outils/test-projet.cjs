// Les vrais points d'entrée du projet : sauvegarde de secours et restauration.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const js=n=>fs.readFileSync(path.join(__dirname,'../page/js/',n),'utf8');
const production=js('635-projet-drm16.js'),es=js('280-electribe-es-1.js');
const encode={};vm.createContext(encode);
vm.runInContext(es.slice(es.indexOf('function wavDe('),es.indexOf('function b64De(')),encode);
function wav(note=.25){return Buffer.from(encode.wavDe({length:4,sampleRate:32000,getChannelData:()=>[note,0,-note,0]})).toString('base64');}
const oldWav=wav(.25),newWav=wav(.75);
function documentProjet(sons={}) {return JSON.stringify({format:'drm16-projet',version:1,
  memoire:{'drm.reglages':'{"bpm":90}','drm.reglages.es1':'{"motif":"nouveau"}'},sons});}
function setup(){
  const values=new Map([['drm.reglages','{"bpm":133}'],['drm.reglages.es1','{"motif":"ancien"}'],['autre.appli','garder']]);
  const sounds=new Map([['u-existant',oldWav]]),files=new Map();
  const before=[...values],beforeSounds=[...sounds];
  const c={MEM:'drm.reglages',S:{run:false},PROJET_EN_COURS:false,TextEncoder,Date,
    messages:[],timers:[],attempts:[],backupFail:false,storageFail:false,soundFail:'',unreadable:'',listFail:false,
    window:{confirm:()=>true},writeMem(){},octetsTexte:n=>String(n),signal(s){c.messages.push(s)},
    stop(){c.S.run=false},location:{reload(){c.reloaded=true}},setTimeout(fn){c.timers.push(fn)},
    atob:s=>Buffer.from(s,'base64').toString('binary'),
    localStorage:{get length(){return values.size},key:i=>[...values.keys()][i],getItem:k=>values.get(k)||null,
      removeItem:k=>values.delete(k),setItem(k,v){if(c.storageFail&&v.includes('nouveau'))throw Error('QuotaExceededError');values.set(k,v)}},
    HOST:{plateforme:'test',fichierSauver(){},
      echListe(){if(c.listFail)throw Error('lecture impossible');return [...sounds.keys()].join('\n')},
      echCharger:n=>c.unreadable===n?'':sounds.get(n)||'',
      echSauver(n,b){c.attempts.push(n);if(c.soundFail===n)return false;sounds.set(n,b);return true},
      echSupprimer:n=>sounds.delete(n)},
    ecrireDocument(h,n,bytes){if(c.backupFail)return '';files.set(n,new TextDecoder().decode(bytes));return n}
  };
  vm.createContext(c);vm.runInContext(production,c);
  return {c,values,sounds,files,before,beforeSounds};
}
function unchanged(t){assert.deepStrictEqual([...t.values].sort(),[...t.before].sort());assert.deepStrictEqual([...t.sounds].sort(),[...t.beforeSounds].sort());
  assert.equal(t.c.PROJET_EN_COURS,false);assert.equal(t.c.timers.length,0);assert(!t.c.messages.includes('PROJET OUVERT'));}

// Parcours nominal : un fichier de secours complet précède le remplacement.
{
 const t=setup(),{c}=t;
 assert.equal(c.projetOuvrir(documentProjet({'u-existant':newWav,'u-nouveau':newWav}),'test'),true);
 assert.equal(t.values.get('drm.reglages'),' {"bpm":90}'.trim());assert.equal(t.values.get('autre.appli'),'garder');
 assert.equal(t.sounds.get('u-existant'),newWav);assert.equal(t.sounds.get('u-nouveau'),newWav);
 assert.equal(t.files.size,1);const old=JSON.parse([...t.files.values()][0]);
 assert.equal(old.memoire['drm.reglages.es1'],'{"motif":"ancien"}');assert.equal(old.sons['u-existant'],oldWav);
 assert.equal(c.messages.at(-1),'PROJET OUVERT');assert.equal(c.PROJET_EN_COURS,true);
 assert.equal(c.timers.length,1);c.timers[0]();assert(c.reloaded);
 const attempts=c.attempts.length;assert.equal(c.projetOuvrir(documentProjet(),'second'),false);assert.equal(c.attempts.length,attempts);
}
// Un flush en échec ne permet pas de sauvegarder une ancienne version du
// motif puis d'ouvrir un autre projet en perdant les dernières modifications.
{
 const t=setup();t.c.writeMem=()=>false;
 assert.equal(t.c.projetOuvrir(documentProjet(),'test'),false);unchanged(t);assert.equal(t.files.size,0);
 assert.equal(t.c.projetEnregistrer('projet'), '');assert.equal(t.files.size,0);
}
// Pas de sauvegarde ou sauvegarde incomplète : aucune donnée n'est remplacée.
for(const failure of ['backupFail','unreadable','listFail','oversize']){
 const t=setup();
 if(failure==='unreadable')t.c.unreadable='u-existant';
 else if(failure==='oversize')t.c.PROJET_MAX=65540;
 else t.c[failure]=true;
 assert.equal(t.c.projetOuvrir(documentProjet(),'test'),false,failure);unchanged(t);
 assert.equal(t.c.attempts.length,0);
}
// Refus utilisateur : pas de sauvegarde ni de mutation.
{
 const t=setup();t.c.window.confirm=()=>false;
 assert.equal(t.c.projetOuvrir(documentProjet(),'test'),false);unchanged(t);assert.equal(t.files.size,0);
}
// Quota après une première clé écrite : restaurer toutes les anciennes clés,
// préserver les autres applis, ne pas toucher aux fichiers de sons.
{
 const t=setup();t.c.storageFail=true;
 assert.equal(t.c.projetOuvrir(documentProjet({'u-existant':newWav}),'test'),false);unchanged(t);
 assert.equal(t.c.attempts.length,0);assert.equal(t.files.size,1);
 assert(t.c.messages.at(-1).includes('ÉTAT PRÉCÉDENT CONSERVÉ'));
}
// Un son refuse l'écriture après deux réussites : remettre l'original et
// retirer le nouveau fichier, puis restaurer les réglages précédents.
{
 const t=setup();t.c.soundFail='u-refuse';
 assert.equal(t.c.projetOuvrir(documentProjet({'u-existant':newWav,'u-nouveau':newWav,'u-refuse':newWav}),'test'),false);
 unchanged(t);assert.equal(t.files.size,1);assert(t.c.attempts.includes('u-existant'));
}
// Si le système refuse aussi la restauration, indiquer le vrai fichier de
// secours ; ne jamais annoncer une réussite ni recharger la page.
{
 const t=setup();let changed=false;
 t.c.HOST.echSauver=(n,b)=>{if(n==='u-refuse')return false;if(n==='u-existant'&&changed)return false;changed=true;t.sounds.set(n,b);return true;};
 assert.equal(t.c.projetOuvrir(documentProjet({'u-existant':newWav,'u-refuse':newWav}),'test'),false);
 assert(t.c.messages.at(-1).includes('RESTAURATION INCOMPLÈTE, SECOURS : avant-ouverture-'));
 assert.equal(t.c.timers.length,0);assert.equal(t.c.PROJET_EN_COURS,false);assert.equal(t.files.size,1);
}
// Le validateur accepte le vrai WAV de l'application, y compris les chunks
// supplémentaires, et refuse les signatures tronquées et les tailles fausses.
{
 const {c}=setup();assert(c.projetWavValide(newWav));
 const original=Buffer.from(newWav,'base64'),extra=Buffer.alloc(original.length+10);
 original.copy(extra,0,0,12);extra.write('JUNK',12);extra.writeUInt32LE(1,16);extra[20]=10;
 original.copy(extra,22,12);extra.writeUInt32LE(extra.length-8,4);assert(c.projetWavValide(extra.toString('base64')));
 const wrongSize=Buffer.from(original);wrongSize.writeUInt32LE(90000,40);
 for(const value of ['UklGR!!!!','UklGR',Buffer.from('RIFF----pas un son').toString('base64'),wrongSize.toString('base64')]){
   const t=setup();assert.equal(t.c.projetOuvrir(documentProjet({'u-existant':value}),'abîmé'),false);unchanged(t);assert.equal(t.files.size,0);
 }
 for(const name of ['.','..','../x']){assert.equal(typeof c.projetValider(documentProjet({[name]:newWav})),'string');}
 for(const wrong of ['null','[]','3']){const d=JSON.parse(documentProjet());d.memoire['drm.reglages']=wrong;assert.equal(typeof c.projetValider(JSON.stringify(d)),'string');}
}
console.log('Projets : succès avec secours complet, quota et sons refusés restaurés, secours indisponible sans mutation, restauration impossible signalée, WAV réel/chunks/son abîmé et double ouverture OK.');

// Un WAV personnel de 4 Mo reste sous le plafond d'un projet. La validation
// doit fonctionner sans regex récursive, même si le mock atob est permissif.
{
 const {c}=setup(),samples=new Float32Array(2048000);
 const big=Buffer.from(encode.wavDe({length:samples.length,sampleRate:32000,getChannelData:()=>samples}));
 assert.equal(big.length,4096044);
 const b64=big.toString('base64'),doc=documentProjet({'u-long':b64});
 assert(Buffer.byteLength(doc)<c.PROJET_MAX);
 assert.doesNotThrow(()=>assert.equal(c.projetWavValide(b64),true));
 assert.equal(typeof c.projetValider(doc),'object');
 // Ni caractères étrangers, ni remplissage interne ou excessif, ni quartet tronqué.
 for(const bad of [b64.slice(0,20)+'='+b64.slice(21),b64+'=',b64.slice(0,-4)+'====',b64.slice(0,-1),b64.slice(0,20)+'!'+b64.slice(21)]){
   assert.doesNotThrow(()=>assert.equal(c.projetWavValide(bad),false));
 }
 console.log('Projets : vrai WAV de4 Mo accepté sans débordement de pile ; alphabet, padding et longueur Base64 invalides refusés OK.');
}
