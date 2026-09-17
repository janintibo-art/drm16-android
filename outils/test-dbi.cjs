// Régression DrumBrute : 64 pas indépendants, migration et édition.
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const elements = {};
function element() { return {listeners:{}, children:[], dataset:{}, style:{}, textContent:'',
  classList:{toggle(){},remove(){}},setAttribute(){},appendChild(n){this.children.push(n);},
  addEventListener(type, fn){this.listeners[type]=fn;}}; }
const c = {document:{getElementById(id){return elements[id] || (elements[id]=element());},
  createElement:element,querySelectorAll(){return [];},body:element()},
  knobEm(){return {maj(){}};},setTimeout(){},clearTimeout(){},window:{},
  memoire:{},memLire(){return c.saved;},sauverMachine(){},
  S:{run:false},H:{cran(){},inter(){}},signal(){},audioInit(){},ctx:{},
  maintenantAudio(){return 0;},pasLePlusProche(i,n){return i%n;},
  ouvrirPas(){return 0;},attenuerVoie(){},stepDur(){return .1;},cache:false,queue:[]};
vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../page/js/490-arturia-drumbrute-impact.js'),'utf8'),c);
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
