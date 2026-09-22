#!/usr/bin/env node
/* v278 : exerce le code réel du test Windows, avec des réponses natives et
 * une horloge simulées. Aucun matériel, package npm ou délai réel requis. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'page/js/010-hote.js'), 'utf8');
const start = source.indexOf('      /* MIDI AUTOTEST v278 — début');
const end = source.indexOf('      /* MIDI AUTOTEST v278 — fin. */', start);
assert(start >= 0 && end > start, 'bloc réel du test MIDI introuvable');
const block = source.slice(start, end);
new vm.Script(source, {filename:'010-hote.js'});
const html = fs.readFileSync(path.join(root, 'app/src/main/assets/drm16.html'), 'utf8');
assert(html.includes(source), 'la page assemblée ne contient pas la source testée');

class Horloge {
  constructor(){ this.now = 0; this.ids = 0; this.timers = new Map(); }
  setTimeout(fn, ms = 0){
    const id = ++this.ids;
    this.timers.set(id, {at:this.now + Math.max(0, Number(ms)), fn});
    return id;
  }
  clearTimeout(id){ this.timers.delete(id); }
  next(){
    const entry = [...this.timers.entries()].sort((a,b) => a[1].at-b[1].at || a[0]-b[0])[0];
    if(!entry) return false;
    this.timers.delete(entry[0]); this.now = entry[1].at; entry[1].fn(); return true;
  }
  async finish(promise){
    let finished = false, error;
    Promise.resolve(promise).then(() => {finished = true;}, e => {finished = true; error = e;});
    for(let turns = 0; turns < 5000; turns++){
      for(let i = 0; i < 20; i++) await Promise.resolve();
      if(finished){ if(error) throw error; return; }
      assert(this.next(), 'promesse suspendue sans minuteur');
    }
    throw new Error('test ne termine pas après 5000 réveils');
  }
}

async function scenario(options = {}){
  const clock = new Horloge(), checks = [], lines = [], calls = [];
  const name = 'Port de test', id = 1;
  let nativeId = options.initialId ?? -1;
  let throwState = false;
  const midi = {ouvertId:options.initialId ?? -1};
  const win = {};
  const original = function(event){
    if(options.handlerThrows && event?.evt === 'ouvert') throw new Error('rappel cassé');
    if(!options.freezePage && event && ['ouvert','ferme','echec'].includes(event.evt)) midi.ouvertId = event.ouvert;
  };
  win.__midiEtat = options.noHandler ? undefined : original;
  function emit(event){ if(typeof win.__midiEtat === 'function') win.__midiEtat(event); }
  function later(ms, fn){ clock.setTimeout(fn, ms); }
  const host = {
    midiAppareils(){
      if(options.listThrows) throw new Error('inventaire cassé');
      return Object.hasOwn(options, 'list') ? options.list : name + '\t' + id;
    },
    midiOuvertId(){ if(throwState) throw new Error('lecture état cassée'); return nativeId; },
    midiOuvrirId(requested){
      calls.push(['ouvrir',requested]);
      if(options.openThrows) throw new Error('commande ouverture cassée');
      if(options.silent) return;
      later(options.openDelay ?? 10, function(){
        if(options.refused){
          emit({evt:'echec',nom:options.otherName ? 'Autre port' : name,ouvert:options.refusalId ?? -1,
            erreur:options.reason ?? 'pilote occupé'});
          return;
        }
        nativeId = options.nativeId ?? requested;
        if(options.stateThrowsAfterOpen) throwState = true;
        if(options.stateOnly){ midi.ouvertId = requested; return; }
        if(options.nativeOnly) return;
        const event = {evt:'ouvert',nom:options.otherName ? 'Autre port' : name,
          ouvert:options.eventId ?? requested,erreur:''};
        if(options.eventDelay) later(options.eventDelay, () => emit(event));
        else emit(event);
      });
    },
    midiEnvoyer(...args){
      calls.push(['envoyer',...args]);
      if(options.sendThrows) throw new Error('envoi cassé');
    },
    midiSysex(base64){
      calls.push(['sysex',base64]);
      if(options.sysexThrows) throw new Error('exclusif cassé');
      return options.badSysex ? true : Buffer.from(base64,'base64').at(-1) === 0xF7;
    },
    midiTempo(bpm){ calls.push(['tempo',bpm]); },
    midiHorloge(on,bpm){
      calls.push(['horloge',on,bpm]);
      if(options.stopThrows && !on) throw new Error('arrêt cassé');
    },
    midiFermer(){
      calls.push(['fermer']);
      if(options.closeThrows) throw new Error('fermeture cassée');
      if(options.neverCloses) return;
      const wasOpen = nativeId !== -1;
      later(options.closeDelay ?? 10, () => {
        nativeId = options.closeNativeId ?? -1;
        if(wasOpen && !options.noCloseEvent) emit({evt:'ferme',nom:'',ouvert:-1,erreur:''});
      });
    }
  };
  const context = vm.createContext({
    h:host, MIDI:midi, window:win, performance:{now:() => clock.now},
    setTimeout:clock.setTimeout.bind(clock), clearTimeout:clock.clearTimeout.bind(clock),
    btoa:s => Buffer.from(s,'binary').toString('base64'),
    l:lines, t:(passed,message) => checks.push({passed:!!passed,message})
  });
  vm.runInContext(block + '\nthis.lancerTest = essaiMidi;',context);
  await clock.finish(context.lancerTest());
  assert.equal(win.__midiEtat, options.noHandler ? undefined : original, 'gestionnaire natif non restauré');
  return {checks,lines,calls,clock,midi,nativeId,win};
}
function passed(s){ assert.equal(s.checks.filter(c => !c.passed).length,0,JSON.stringify(s.checks)); }
function failed(s,pattern){
  assert(s.checks.some(c => !c.passed && pattern.test(c.message)), JSON.stringify(s.checks));
}
function noSend(s){ assert(!s.calls.some(c => c[0] === 'envoyer' || c[0] === 'sysex')); }
function closeAsked(s){ assert(s.calls.some(c => c[0] === 'fermer'),'fermeture de sécurité absente'); }

const cases = [
  ['ouverture normale, notes, SysEx, horloge, fermeture',async () => {
    const s = await scenario(); passed(s);
    assert.equal(s.checks.length,5); assert.equal(s.nativeId,-1);
    assert.deepEqual(s.calls.filter(c => c[0] === 'envoyer').map(c => c.slice(1)),
      [[0x90,60,1],[0x80,60,0],[0xF0,0,0],[0x42,0,0]]);
  }],
  ['ouverture lente à 8 secondes',async () => { const s=await scenario({openDelay:8000}); passed(s); assert(s.clock.now>=8000); }],
  ['ouverture lente à 24 secondes',async () => { const s=await scenario({openDelay:24000}); passed(s); }],
  ['événement retardé après ouverture native',async () => { const s=await scenario({eventDelay:7500}); passed(s); }],
  ['fermeture lente à 7 secondes',async () => { const s=await scenario({closeDelay:7000}); passed(s); }],
  ['aucune réponse : toujours bloquant après 30 secondes',async () => {
    const s=await scenario({silent:true}); failed(s,/aucune réponse.*30 secondes/); noSend(s); closeAsked(s); assert.equal(s.clock.now,30000);
  }],
  ['réponse dépassant la limite : ne passe pas',async () => {
    const s=await scenario({openDelay:31000}); failed(s,/aucune réponse/); noSend(s); closeAsked(s);
  }],
  ['état page et Rust sans événement : rejet',async () => {
    const s=await scenario({stateOnly:true}); failed(s,/aucune réponse/); noSend(s); closeAsked(s);
  }],
  ['Rust ouvert sans événement : rejet',async () => {
    const s=await scenario({nativeOnly:true}); failed(s,/aucune réponse/); noSend(s);
  }],
  ['événement ouvert mais Rust fermé : rejet',async () => {
    const s=await scenario({nativeId:-1}); failed(s,/incohérente/); noSend(s);
  }],
  ['mauvais identifiant dans événement : rejet',async () => {
    const s=await scenario({eventId:2}); failed(s,/incohérente/); noSend(s);
  }],
  ['événement d’un autre port : ne confirme pas le port demandé',async () => {
    const s=await scenario({otherName:true}); failed(s,/aucune réponse/); noSend(s);
  }],
  ['refus explicite : non concluant, aucun envoi',async () => {
    const s=await scenario({refused:true}); passed(s); noSend(s);
    assert(s.lines.some(l => /NON CONCLUANT.*pilote occupé/.test(l)));
    assert(s.clock.now<1000, 'un refus explicite ne doit pas attendre 30 secondes');
  }],
  ['refus sans raison : rejet',async () => {
    const s=await scenario({refused:true,reason:''}); failed(s,/refus MIDI incomplet/); noSend(s);
  }],
  ['refus avec état contradictoire : rejet',async () => {
    const s=await scenario({refused:true,refusalId:1}); failed(s,/refus MIDI incomplet/); noSend(s);
  }],
  ['refus d’un autre port : pas d’exemption',async () => {
    const s=await scenario({refused:true,otherName:true}); failed(s,/aucune réponse/); noSend(s);
  }],
  ['aucun appareil : explicitement non testé',async () => {
    const s=await scenario({list:''}); passed(s); noSend(s);
    assert(s.lines.some(l => /NON CONCLUANT.*aucun appareil/.test(l)));
    assert(!s.calls.some(c => c[0]==='ouvrir'));
  }],
  ['exception inventaire : pas confondue avec une liste vide',async () => {
    const s=await scenario({listThrows:true}); failed(s,/inventaire cassé/); noSend(s);
  }],
  ['inventaires et identifiants invalides',async () => {
    for(const list of [null,123,'Port','Port\tnan','Port\t-1','Port\t0','Port\t1x','Port\t9007199254740992']){
      const s=await scenario({list}); failed(s,/invalide|hors limites/); noSend(s);
    }
  }],
  ['gestionnaire MIDI absent : rejet',async () => { const s=await scenario({noHandler:true}); failed(s,/réception MIDI absente/); noSend(s); }],
  ['gestionnaire MIDI en erreur : rapport et nettoyage',async () => {
    const s=await scenario({handlerThrows:true}); failed(s,/gestionnaire __midiEtat/); noSend(s); closeAsked(s);
  }],
  ['commande ouverture en erreur : rapport et nettoyage',async () => {
    const s=await scenario({openThrows:true}); failed(s,/commande ouverture cassée/); noSend(s); closeAsked(s);
  }],
  ['état natif inaccessible : rapport sans promesse perdue',async () => {
    const s=await scenario({stateThrowsAfterOpen:true}); failed(s,/lecture état cassée/); closeAsked(s);
  }],
  ['envoi MIDI en erreur : toujours bloquant et fermeture demandée',async () => {
    const s=await scenario({sendThrows:true}); failed(s,/envoi cassé/); closeAsked(s);
  }],
  ['SysEx en erreur : rapport et nettoyage',async () => {
    const s=await scenario({sysexThrows:true}); failed(s,/exclusif cassé/); closeAsked(s);
  }],
  ['SysEx incomplet accepté à tort : rejet',async () => {
    const s=await scenario({badSysex:true}); failed(s,/incomplet refusé/); closeAsked(s);
  }],
  ['fermeture sans événement : rejet',async () => {
    const s=await scenario({noCloseEvent:true}); failed(s,/fermeture/); closeAsked(s);
  }],
  ['fermeture native bloquée : rejet',async () => {
    const s=await scenario({neverCloses:true}); failed(s,/fermeture/); closeAsked(s);
  }],
  ['fermeture annoncée mais Rust encore ouvert : rejet',async () => {
    const s=await scenario({closeNativeId:1}); failed(s,/fermeture/); closeAsked(s);
  }],
  ['erreurs pendant le nettoyage ne cachent pas l’échec initial',async () => {
    const s=await scenario({silent:true,closeThrows:true,stopThrows:true});
    failed(s,/aucune réponse/); failed(s,/arrêt de sécurité/); failed(s,/fermeture de sécurité/);
  }],
  ['ancienne connexion fermée avant le nouvel essai',async () => {
    const s=await scenario({initialId:1}); passed(s);
    assert(s.calls.findIndex(c=>c[0]==='fermer')<s.calls.findIndex(c=>c[0]==='ouvrir'));
  }],
  ['page qui ignore les événements : rejet',async () => {
    const s=await scenario({freezePage:true}); failed(s,/incohérente/); noSend(s);
  }],
  ['journal daté avec nom, identifiant, phase et erreur',async () => {
    const s=await scenario({refused:true,openDelay:8000}); passed(s);
    const journal=s.lines.join('\n');
    for(const term of ['"ms":8000','"phase":"ouverture"','"evt":"echec"','"nom":"Port de test"','"erreur":"pilote occupé"']) assert(journal.includes(term),term);
  }],
  ['hors autotest, aucune écoute ni commande de test installée',async () => {
    const events=[], requests=[];
    function XHR(){ this.status=200; }
    XHR.prototype.open=function(method,url,sync){ this.url=url; assert.equal(sync,false); };
    XHR.prototype.setRequestHeader=function(){};
    XHR.prototype.send=function(body){ requests.push([this.url,body]); this.responseText=JSON.stringify({r:false}); };
    const c=vm.createContext({window:{__TAURI_INTERNALS__:{},addEventListener:n=>events.push(n)},
      navigator:{userAgent:'Windows'},document:{documentElement:{setAttribute(){}}},XMLHttpRequest:XHR});
    vm.runInContext(source,c);
    assert.equal(c.HOST.plateforme,'bureau'); assert.equal(requests.length,1);
    assert(requests[0][0].endsWith('/autotest')); assert.equal(events.length,0);
  }],
  ['plateforme navigateur : aucun appel ni écouteur d’autotest',async () => {
    const events=[]; const c=vm.createContext({window:{addEventListener:n=>events.push(n)},
      document:{documentElement:{setAttribute(){}}}});
    vm.runInContext(source,c); assert.equal(c.HOST.plateforme,'navigateur'); assert.equal(events.length,0);
  }]
];
(async function(){
  let count=0;
  for(const [label,test] of cases){
    try{ await test(); count++; console.log('ok  '+label); }
    catch(e){ console.error('FAUX  '+label+'\n'+e.stack); process.exitCode=1; return; }
  }
  console.log(`Autotest MIDI Windows : ${count} scénarios réussis ; source et page assemblée concordantes.`);
})();
