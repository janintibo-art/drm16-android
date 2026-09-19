#!/usr/bin/env node
/* Tests sans reseau ni cle personnelle : contrat API, erreurs, annulation,
   credits, persistence et protection contre les ecrasements. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const racine = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(racine, 'page/js/625-freesound.js'), 'utf8');
const bibliotheque = fs.readFileSync(path.join(racine, 'page/js/630-bibliotheque.js'), 'utf8');
const cle = 'a'.repeat(40);
function contexte(){
  const memoire = new Map(), appels = [], fichiers = new Set();
  const c = {console, URL, URLSearchParams, TextDecoder, TextEncoder, Uint8Array, ArrayBuffer,
    setTimeout:()=>0, clearTimeout:()=>{},
    atob:s=>Buffer.from(s,'base64').toString('binary'), btoa:s=>Buffer.from(s,'binary').toString('base64'),
    document:{getElementById:()=>({classList:{contains:()=>true}}), addEventListener:()=>{}},
    localStorage:{getItem:k=>memoire.has(k)?memoire.get(k):null, setItem:(k,v)=>memoire.set(k,String(v)), removeItem:k=>memoire.delete(k)},
    navigator:{}, MEM:'drm.reglages', PROJET_EN_COURS:false,
    BIB:{onglet:4,noms:{},freesound:{},preset:'punch'}, ES:{buf:{},noms:{}},
    HOST:{netCharger:()=>{},echListe:()=>Array.from(fichiers).join('\n'),echSupprimer:id=>fichiers.delete(id)},
    H:{inter:()=>{}}, signal:()=>{},
    sauverEch:(id)=>{fichiers.add(id);return true;},
    texteDeB64:s=>Buffer.from(s,'base64').toString('utf8'),
    netCharger:async(url,max)=>{appels.push({url,max}); return Buffer.from(JSON.stringify(c.fixture)).toString('base64');},
    fixture:{count:1,next:null,results:[{id:123, name:'Kick.wav',username:'Musicien',license:'https://creativecommons.org/publicdomain/zero/1.0/',duration:0.5,
      previews:{'preview-hq-mp3':'https://cdn.freesound.org/previews/0/123_1-hq.mp3'}}]}
  };
  vm.createContext(c); vm.runInContext(source,c); vm.runInContext(bibliotheque,c);
  c.majBibUI=()=>{};c.FSOUND.cle=cle;c.FSOUND.initialise=true;
  return {c,memoire,appels,fichiers};
}
let nombre=0;
async function test(nom,fn){await fn();nombre++;console.log('OK '+nom);}
(async()=>{
  await test('adresse officielle et parametres encodes',()=>{
    const {c}=contexte(),u=new URL(c.fsonAdresseRecherche({query:'kick &token=autre',licence:'Creative Commons 0',duree:30,tri:'downloads_desc'},2,cle));
    assert.equal(u.origin,'https://freesound.org');assert.equal(u.pathname,'/apiv2/search/');
    assert.equal(u.searchParams.get('query'),'kick &token=autre');assert.equal(u.searchParams.get('token'),cle);
    assert.equal(u.searchParams.get('filter'),'duration:[0 TO 30] license:"Creative Commons 0"');
    assert.equal(u.searchParams.get('page'),'2');assert.equal(u.searchParams.get('page_size'),'20');
  });
  await test('cle mal formee refusee',()=>{const {c}=contexte();assert.throws(()=>c.fsonAdresseRecherche({},1,'incorrecte'));assert.equal(c.fsonCleValide(cle+'\n'),false);});
  await test('filtres fermes et page bornee',()=>{
    const {c}=contexte(),u=new URL(c.fsonAdresseRecherche({duree:999,tri:'injection',licence:'intrus'},-1,cle));
    assert.equal(u.searchParams.get('filter'),'duration:[0 TO 8]');assert.equal(u.searchParams.get('sort'),'score');assert.equal(u.searchParams.get('page'),'1');
  });
  await test('apercus HTTPS sur les seuls hotes Freesound',()=>{
    const {c}=contexte();assert(c.fsonApercu('https://cdn.freesound.org/previews/1/123-hq.mp3'));
    ['http://cdn.freesound.org/previews/1/a.mp3','https://evil.test/previews/a.mp3','https://cdn.freesound.org.evil.test/previews/a.mp3',
     'https://freesound.org@evil.test/previews/a.mp3','https://cdn.freesound.org/previews/a.mp3?token=secret',
     'https://cdn.freesound.org/previews/a.mp3#secret','https://cdn.freesound.org:8443/previews/a.mp3',
     'https://cdn.freesound.org/private/a.mp3'].forEach(u=>assert.equal(c.fsonApercu(u),''));
  });
  await test('sons invalides ou trop longs refuses',()=>{const {c}=contexte();assert.equal(c.fsonResultat({id:-1,duration:1}),null);assert.equal(c.fsonResultat({id:1,duration:61}),null);assert.equal(c.fsonResultat({id:1,duration:NaN}),null);});
  await test('licences CC0, CC BY et CC BY-NC distinguees',()=>{const {c}=contexte();assert.equal(c.fsonLicence('Creative Commons 0'),'CC0');assert.equal(c.fsonLicence('https://creativecommons.org/licenses/by/4.0/'),'CC BY');assert.equal(c.fsonLicence('Attribution NonCommercial'),'CC BY-NC');});
  await test('cle memorisee hors du perimetre exportable des projets',()=>{
    const {c,memoire}=contexte();assert(c.fsonDefinirCle(cle,true));assert.equal(memoire.get(c.FSOUND.prive),cle);
    assert.notEqual(c.FSOUND.prive,c.MEM);assert(!c.FSOUND.prive.startsWith(c.MEM+'.'));
    assert(c.fsonDefinirCle(cle,false));assert.equal(memoire.has(c.FSOUND.prive),false);
  });
  await test('cle rechargement puis oubli',()=>{
    const {c,memoire}=contexte();memoire.set(c.FSOUND.prive,cle);c.FSOUND.initialise=false;c.FSOUND.cle='';c.fsonInitialiser();
    assert.equal(c.FSOUND.cle,cle);c.fsonOublierCle();assert.equal(c.FSOUND.cle,'');assert.equal(memoire.has(c.FSOUND.prive),false);
  });
  await test('erreurs sans fuite de cle ou adresse',()=>{const {c}=contexte();['reponse 403 '+cle,'erreur inconnue https://freesound.org/?token='+cle].forEach(e=>{const s=c.fsonErreur(e);assert(!s.includes(cle));assert(!s.includes('token='));});});
  await test('limitation des requetes signalee',()=>{const {c}=contexte();assert(c.fsonErreur('reponse 429').includes('minute'));assert(c.FSOUND.temporisation>Date.now());});
  await test('recherche avec metadonnees en une seule requete',async()=>{
    const {c,appels}=contexte();assert.equal(await c.fsonChercher(1),true);assert.equal(appels.length,1);assert.equal(c.FSOUND.resultats[0].auteur,'Musicien');assert.equal(c.FSOUND.requete,null);assert(!JSON.stringify(c.FSOUND.resultats).includes(cle));
  });
  await test('URL next fournie par le serveur jamais suivie',async()=>{
    const {c,appels}=contexte();c.fixture.next='https://evil.test/?token=volee';await c.fsonChercher(1);await c.fsonChercher(2,true);
    assert.equal(new URL(appels[1].url).origin,'https://freesound.org');assert.equal(new URL(appels[1].url).searchParams.get('page'),'2');
  });
  await test('reponse illisible sans faux resultat',async()=>{const {c}=contexte();c.netCharger=async()=>Buffer.from('pas json').toString('base64');assert.equal(await c.fsonChercher(1),false);assert(c.FSOUND.message.includes('illisible'));assert.equal(c.FSOUND.requete,null);});
  await test('erreur reseau recuperable',async()=>{const {c}=contexte();c.netCharger=async()=>{throw new Error('reponse 403 '+cle);};assert.equal(await c.fsonChercher(1),false);assert(c.FSOUND.message.includes('Clé refusée'));assert(!c.FSOUND.message.includes(cle));assert.equal(c.FSOUND.requete,null);});
  await test('annulation ignore une reponse tardive',async()=>{
    const {c}=contexte();let finir;c.netCharger=()=>new Promise(ok=>{finir=ok;});const p=c.fsonChercher(1);
    c.fsonAnnuler();finir(Buffer.from(JSON.stringify(c.fixture)).toString('base64'));assert.equal(await p,false);assert.equal(c.FSOUND.resultats.length,0);assert.equal(c.FSOUND.requete,null);
  });
  await test('une seule requete active a la fois',async()=>{
    const {c}=contexte();let finir,n=0;c.netCharger=()=>{n++;return new Promise(ok=>{finir=ok;});};const p=c.fsonChercher(1);assert.equal(await c.fsonChercher(2),false);assert.equal(n,1);finir(Buffer.from(JSON.stringify(c.fixture)).toString('base64'));await p;
  });
  await test('ouverture de projet bloque la recherche',async()=>{const {c,appels}=contexte();c.PROJET_EN_COURS=true;assert.equal(await c.fsonChercher(1),false);assert.equal(appels.length,0);});
  await test('import conserve son, auteur, licence et transformation',()=>{
    const {c,memoire,fichiers}=contexte(),f=c.fsonResultat(c.fixture.results[0]),buf={duration:.5};
    assert.equal(c.fsonGarder(f,buf),true);assert.equal(c.ES.buf.ufs123,buf);assert(fichiers.has('ufs123'));
    const b=JSON.parse(memoire.get(c.MEM+'.bib'));assert.equal(b.freesound.ufs123.auteur,'Musicien');assert.equal(b.freesound.ufs123.licence,f.licence);
    assert(b.freesound.ufs123.conversion.includes('mono 32 kHz'));assert(!memoire.get(c.MEM+'.bib').includes(cle));
    c.BIB.freesound={};c.bibLire();assert.equal(c.BIB.freesound.ufs123.auteur,'Musicien');
  });
  await test('un doublon ne remplace pas un son retravaille',()=>{
    const {c}=contexte(),f=c.fsonResultat(c.fixture.results[0]);const original={duration:.5},travaille={duration:.2};
    c.fsonGarder(f,original);c.ES.buf.ufs123=travaille;assert.equal(c.fsonGarder(f,original),false);assert.equal(c.ES.buf.ufs123,travaille);
  });
  await test('echec ecriture audio ne pretend pas avoir importe',()=>{
    const {c}=contexte(),f=c.fsonResultat(c.fixture.results[0]);c.sauverEch=()=>false;
    assert.throws(()=>c.fsonGarder(f,{duration:.5}),/FSON_SAUVE/);assert.equal(c.ES.buf.ufs123,undefined);assert.equal(c.BIB.freesound.ufs123,undefined);
  });
  await test('echec credits annule import et retire le fichier',()=>{
    const {c,fichiers}=contexte(),f=c.fsonResultat(c.fixture.results[0]);c.localStorage.setItem=()=>{throw new Error('quota');};
    assert.throws(()=>c.fsonGarder(f,{duration:.5}),/FSON_CREDITS/);assert.equal(c.ES.buf.ufs123,undefined);assert(!fichiers.has('ufs123'));assert.equal(c.BIB.freesound.ufs123,undefined);
  });
  await test('credits corrompus ignores et adresses reconstruites',()=>{
    const {c}=contexte(),x=c.fsonCreditsValides({ufs123:{id:123,nom:'Son',auteur:'Test',licence:'CC0',url:'https://evil.test'},autre:{id:2},ufs4:{id:5}});
    assert.deepEqual(Object.keys(x),['ufs123']);assert.equal(x.ufs123.url,'https://freesound.org/s/123/');
  });
  await test('reimport autorise apres suppression hors de la bibliotheque',()=>{
    const {c,fichiers}=contexte(),f=c.fsonResultat(c.fixture.results[0]);
    c.fsonGarder(f,{duration:.5});delete c.ES.buf.ufs123;fichiers.delete('ufs123');
    assert.equal(c.fsonDejaImporte(f),false);assert.equal(c.fsonGarder(f,{duration:.5}),true);
  });
  await test('fichier persistant non decode protege contre le remplacement',()=>{
    const {c}=contexte(),f=c.fsonResultat(c.fixture.results[0]);
    c.fsonGarder(f,{duration:.5});delete c.ES.buf.ufs123;
    assert.equal(c.fsonDejaImporte(f),true);assert.equal(c.fsonGarder(f,{duration:.3}),false);
  });
  console.log(nombre+' tests Freesound valides (API simulee, aucun appel externe).');
})().catch(e=>{console.error(e);process.exitCode=1;});
