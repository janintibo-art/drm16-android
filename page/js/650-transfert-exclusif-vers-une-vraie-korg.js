/* ================= transfert exclusif vers une vraie Korg =================
   Deux formats connus : l'ES-1 (en-tête F0 42 3c 57, motif de 1732 octets) et
   l'electribe de 2015 (F0 42 3g 00 01 23, 16384 octets).
   Dans les deux cas on demande d'abord son motif à la machine et on garde ses octets
   comme gabarit : numéros d'échantillons et réglages inconnus restent les siens. */
var EXC = {gabarit:null, type:null, canal:0, attente:false};
var EXC_TAILLE = {es1:1732, e2015:16384};

function b64VersOctets(b64){
  var bin = atob(b64), o = new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) o[i] = bin.charCodeAt(i);
  return o;
}
/* ---------- écriture des gros documents (v128) ----------
   Un rendu WAV part par morceaux de 768 Ko au lieu d'une seule chaîne Base64 :
   la mémoire n'en contient jamais plus d'un à la fois. Chaque morceau fait un
   multiple de trois octets, pour que ses Base64 se suivent sans remplissage.
   Le plafond est le même que côté Java : un rendu trop long est refusé AVANT
   d'être calculé, au lieu d'être calculé pour rien puis refusé. */
var MAX_EXPORT_AUDIO = 64 * 1024 * 1024;
var MORCEAU_ECRITURE = 3 * 262144;
function tailleWavStereo(secondes, taux){ return 44 + Math.ceil(secondes * taux) * 4; }
function refusWavTropLong(secondes, taux){
  if(tailleWavStereo(secondes, taux) <= MAX_EXPORT_AUDIO) return false;
  var maxS = Math.floor((MAX_EXPORT_AUDIO - 44) / 4 / taux);
  function mn(s){ s = Math.ceil(s); return Math.floor(s / 60) + " MIN " + ("0" + (s % 60)).slice(-2); }
  signal("TROP LONG : " + mn(secondes) + " · " + mn(maxS) + " AU PLUS");
  return true;
}
function ecrireDocument(p, nom, donnees){
  var o = donnees instanceof Uint8Array ? donnees : new Uint8Array(donnees);
  if(p.fichierOuvrir && p.fichierAjouter && p.fichierFermer){
    var j = "";
    try{ j = p.fichierOuvrir(nom) || ""; }catch(e){}
    if(!j) return "";
    var ok = true;
    for(var i=0; i<o.length && ok; i+=MORCEAU_ECRITURE){
      try{ ok = !!p.fichierAjouter(j, octetsVersB64(o.subarray(i, i + MORCEAU_ECRITURE))); }
      catch(e){ ok = false; }
    }
    try{ return p.fichierFermer(j, ok) || ""; }catch(e){ return ""; }
  }
  try{ return p.fichierSauver(nom, octetsVersB64(o)) || ""; }catch(e){ return ""; }
}
function octetsVersB64(o){
  var s = "", pas = 0x8000;
  for(var i=0;i<o.length;i+=pas) s += String.fromCharCode.apply(null, o.subarray(i, i+pas));
  return btoa(s);
}
/* Korg empaquette sept octets de huit bits dans huit octets de sept bits :
   le premier porte les bits de poids fort des sept suivants. */
function sept_vers_huit(src){
  var n = src.length, sorties = [], i, j;
  for(i=0;i<n;i+=7){
    var reste = Math.min(7, n-i);      /* le dernier groupe n'est pas complété */
    var hauts = 0, bloc = [];
    for(j=0;j<reste;j++){
      var v = src[i+j];
      if(v & 0x80) hauts |= (1 << j);
      bloc.push(v & 0x7F);
    }
    sorties.push(hauts);
    for(j=0;j<reste;j++) sorties.push(bloc[j]);
  }
  return sorties;
}
function huit_vers_sept(src, deb, fin){
  var out = [], i, j;
  for(i=deb; i<fin; i+=8){
    var hauts = src[i];
    for(j=1;j<8 && i+j<fin;j++){
      out.push((src[i+j] & 0x7F) | ((hauts & (1<<(j-1))) ? 0x80 : 0));
    }
  }
  return out;
}
function excEnvoyerBrut(octets){
  var p = HOST;
  if(!p || !p.midiSysex){ signal("PONT MIDI INDISPONIBLE"); return false; }
  if(MIDI.ouvert < 0){ signal("AUCUN APPAREIL MIDI OUVERT"); return false; }
  var parti;
  try{ parti = p.midiSysex(octetsVersB64(new Uint8Array(octets))); }
  catch(e){ signal("ENVOI EXCLUSIF REFUSÉ"); return false; }
  if(parti === false){ signal("ENVOI EXCLUSIF REFUSÉ"); return false; }   /* v130 : le pont le dit */
  return true;
}
/* on ignore quelle machine est branchée : on demande aux deux */
function excDemanderMotif(){
  if(S.run) stop();                     /* l'ES-1 n'accepte rien pendant la lecture */
  EXC.attente = true;
  /* on ignore le canal global de la machine : on demande sur les seize,
     un appareil dont l'identifiant ne correspond pas laisse simplement passer */
  var ok = false;
  for(var n=0;n<16;n++){
    var c = 0x30 | n;
    ok = excEnvoyerBrut([0xF0,0x42,c,0x57,0x10,0xF7]) || ok;
    excEnvoyerBrut([0xF0,0x42,c,0x00,0x01,0x23,0x10,0xF7]);
  }
  if(ok){
    signal("DEMANDE ENVOYÉE À LA MACHINE");
    setTimeout(function(){
      if(EXC.attente){ EXC.attente = false; signal("AUCUNE RÉPONSE · VÉRIFIEZ LE CÂBLE ET LE CANAL"); }
    }, 4000);
  }
}
window.__midiSysex = function(b64){
  var o;
  try{ o = b64VersOctets(b64); }catch(e){ return; }
  if(o.length < 6 || o[0] !== 0xF0 || o[1] !== 0x42) return;
  EXC.canal = o[2] & 0x0F;
  var type = null, fonction = 0, deb = 0;
  if(o[3] === 0x57){ type = "es1"; fonction = o[4]; deb = 5; }
  else if(o[3] === 0x00 && o[4] === 0x01 && o[5] === 0x23){ type = "e2015"; fonction = o[6]; deb = 7; }
  else return;
  if(fonction === 0x23){ signal("MACHINE : DONNÉES ACCEPTÉES"); return; }
  if(fonction === 0x24 || fonction === 0x26){ signal("MACHINE : DONNÉES REFUSÉES"); return; }
  if(fonction === 0x21){ signal("MACHINE : MOTIF ÉCRIT"); return; }
  if(fonction === 0x22){ signal("MACHINE : ÉCRITURE REFUSÉE"); return; }
  if(fonction === 0x4C || fonction === 0x57 || fonction === 0x51){
    if(EXC.attenteSauve){ bibRecevoirSauvegarde(o, type, fonction); return; }
  }
  if(fonction !== 0x40) return;
  if(EXC.attenteSauve){ bibRecevoirSauvegarde(o, type, fonction); return; }
  var brut = huit_vers_sept(o, deb, o.length - 1);
  var attendu = EXC_TAILLE[type];
  if(brut.length < attendu){ signal("MOTIF REÇU TROP COURT : " + brut.length); return; }
  EXC.gabarit = new Uint8Array(brut.slice(0, attendu));
  EXC.type = type;
  EXC.attente = false;
  majExcUI();
  signal("MOTIF LU DE " + (type === "es1" ? "L'ES-1" : "L'ELECTRIBE") + " · " + attendu + " OCTETS");
};

/* ---------- écriture au format ES-1 ---------- */
/* mes effets vers ceux de l'ES-1 : reverb, flg/cho, phaser, ring, pitch, comp,
   dist, deci, isolator, filtre résonant, wah */
var EXC_FX_ES1 = [4,3,2,1,0,5,6,7,9,9,1,8,9,2,5,7];
function excSept(v){ return Math.max(0, Math.min(127, Math.round(v*127))); }
function excBipolaire(v){ return Math.max(0, Math.min(127, Math.round((v+1)/2*127))); }

function excEcrireEs1(d){
  var p = ES.pat, i, k;
  /* tempo : neuf bits d'entier décalés de sept, quatre bits de décimale */
  var val = (Math.max(20, Math.min(300, Math.round(S.bpm))) << 7);
  d[0] = (val >> 8) & 0xFF;
  d[1] = val & 0xFF;
  d[2] = (d[2] & 0xCC) | 0;                                   /* longueur : une mesure */
  d[3] = Math.max(0, Math.min(25, Math.round((p.sw||0) * 50)));
  d[4] = EXC_FX_ES1[EM.fxType] || 0;
  d[5] = excSept(EM.e1);
  d[6] = excSept(EM.e2);
  d[8] = excSept(ES.dDep);
  d[9] = excSept(ES.dTime);
  d[10] = (d[10] & 0xFC) | (ES.bpmSync ? 2 : 0);
  d[11] = (d[11] & 0x80) | (excSept(velAccent(p.son[9].lvl)) & 0x7F);

  for(k=0;k<9;k++){
    var b = 268 + 128*k, son = p.son[k];
    d[b+1] = excSept(son.filt);
    d[b+2] = excSept(son.lvl);
    d[b+3] = excBipolaire(son.pan);
    d[b+4] = excBipolaire(son.pitch);
    d[b+5] = (d[b+5] & 0xC0) | (son.rev ? 4 : 0) | (son.roll ? 2 : 0) | (son.fx ? 1 : 0);
    for(i=0;i<8;i++) d[b+6+i] = 0;                            /* huit octets, un bit par pas */
    for(i=0;i<16 && i<(p.len||16);i++) if(p.st[k][i]) d[b+6+(i>>3)] |= (1 << (i & 7));
    /* mouvement de la partie : type, destination, puis une valeur par pas */
    var m = p.mot[k], dest = {pitch:0, lvl:1, filt:2, pan:3};
    var typ = (m && m.mode && dest[m.p] !== undefined) ? m.mode : 0;
    d[b+14] = typ;
    d[b+15] = typ ? dest[m.p] : 0;
    for(i=0;i<64;i++){
      var v = 0x80;                                           /* bit de poids fort à un : pas de valeur */
      if(typ && i < 16 && m.v && typeof m.v[i] === "number"){
        v = (m.p === "pan" || m.p === "pitch") ? excBipolaire(m.v[i]) : excSept(m.v[i]);
      }
      d[b+16+i] = v;
    }
  }
  for(i=0;i<8;i++) d[1660+i] = 0;                             /* piste d'accent */
  for(i=0;i<16 && i<(p.len||16);i++) if(p.st[9][i]) d[1660+(i>>3)] |= (1 << (i & 7));
  return 9;
}

/* ---------- écriture au format electribe 2015 ---------- */
function excPartiesCourantes(){
  var m = S.modele, l = [];
  function ajoute(pat, nb, saut, melo){
    for(var k=0;k<nb;k++){
      if(saut.indexOf(k) >= 0) continue;
      l.push({st:pat.st[k], nt:pat.nt ? pat.nt[k] : null, melo:melo.indexOf(k) >= 0});
    }
  }
  if(m === "em1") ajoute(EM.pat, 12, [10,11], [8,9]);
  else if(m === "er1" || m === "er2") ajoute(ER.pat, 11, [10], []);
  else if(m === "ea1" || m === "ea2") ajoute(EA.pat, 2, [], [0,1]);
  else if(m === "es1" || m === "es2") ajoute(ES.pat, 10, [9], []);
  else if(m === "emx") ajoute(MX.pat, 16, [9,15], [10,11,12,13,14]);
  else if(m === "esx") ajoute(SX.pat, 14, [9], [10,11]);
  return l;
}
function excAccents(){
  var m = S.modele;
  if(m === "em1") return {perc:EM.pat.st[10], melo:EM.pat.st[11]};
  if(m === "er1" || m === "er2") return {perc:ER.pat.st[10], melo:null};
  if(m === "es1" || m === "es2") return {perc:ES.pat.st[9], melo:null};
  if(m === "emx") return {perc:MX.pat.st[9], melo:MX.pat.st[15]};
  if(m === "esx") return {perc:SX.pat.st[9], melo:null};
  return {perc:null, melo:null};
}
function excLongueur(){
  var m = S.modele;
  if(m === "em1") return EM.pat.len || 16;
  if(m === "er1" || m === "er2") return ER.pat.len || 16;
  if(m === "ea1" || m === "ea2") return EA.pat.len || 16;
  if(m === "es1" || m === "es2") return ES.pat.len || 16;
  if(m === "emx") return MX.pat.len || 16;
  if(m === "esx") return SX.pat.len || 16;
  return 16;
}
function excEcrire2015(d){
  var parties = excPartiesCourantes(), acc = excAccents(), L = excLongueur();
  var n = Math.min(16, parties.length), k, pas;
  d[37] = 0;                                     /* longueur : une mesure */
  for(k=0;k<16;k++){
    var base = 2048 + 816*k;
    if(base + 816 > d.length) break;
    var p = (k < n) ? parties[k] : null;
    d[base] = 0;                                 /* dernier pas : 16 */
    for(pas=0; pas<64; pas++){
      var o = base + 48 + 12*pas;
      var actif = 0, note = 0, vel = 100;
      if(p && pas < 16 && pas < L && p.st[pas]){
        actif = 1;
        var estAcc = p.melo ? (acc.melo && acc.melo[pas]) : (acc.perc && acc.perc[pas]);
        vel = estAcc ? 127 : 100;
        if(p.melo && p.nt) note = Math.max(0, Math.min(127, p.nt[pas]));
      }
      d[o]   = actif;
      d[o+1] = 48;                               /* durée de porte : la moitié du pas */
      d[o+2] = vel;
      d[o+3] = actif;
      d[o+4] = (p && p.melo && actif) ? (note+1) : 0;
      d[o+5] = 0; d[o+6] = 0; d[o+7] = 0;
    }
  }
  return n;
}

function excEnvoyerMotif(){
  if(!EXC.gabarit){ signal("LISEZ D'ABORD LE MOTIF DE LA MACHINE"); return; }
  if(S.run) stop();
  var d = new Uint8Array(EXC.gabarit), n, corps, m;
  var c = 0x30 | (EXC.canal & 0x0F);
  if(EXC.type === "es1"){
    if(S.modele !== "es1" && S.modele !== "es2"){
      signal("PASSEZ SUR L'ES-1 DE L'APPLICATION POUR ENVOYER VERS UN ES-1");
      return;
    }
    n = excEcrireEs1(d);
    corps = sept_vers_huit(d);
    m = [0xF0,0x42,c,0x57,0x40].concat(corps).concat([0xF7]);
  } else {
    n = excEcrire2015(d);
    corps = sept_vers_huit(d);
    m = [0xF0,0x42,c,0x00,0x01,0x23,0x40].concat(corps).concat([0xF7]);
  }
  if(excEnvoyerBrut(m)){
    signal("MOTIF ENVOYÉ · " + n + " PARTIES · ÉCRIVEZ-LE SUR LA MACHINE");
  }
}
function majExcUI(){
  var b = document.getElementById("b-exc-envoi");
  var e = document.getElementById("exc-etat");
  if(!b || !e) return;
  b.disabled = !EXC.gabarit;
  if(!EXC.gabarit){
    e.textContent = "Aucun gabarit. Lisez d'abord le motif courant de la machine.";
    return;
  }
  e.textContent = (EXC.type === "es1")
    ? "Gabarit ES-1 en mémoire. L'envoi porte la grille de pas, les niveaux, panoramiques, hauteurs, filtres, les interrupteurs de partie, les mouvements, l'effet et le délai. Les numéros d'échantillons restent ceux de la machine."
    : "Gabarit electribe en mémoire. L'envoi ne remplacera que la grille de pas ; sons et réglages restent ceux de la machine.";
}

