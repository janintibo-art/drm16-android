/* ================= kits de sons des machines (v251) =================
   Le rayon MACHINES de la bibliothèque : un répertoire par machine, où l'on
   voit le son de chaque partie, où l'on en change, et où l'on range des KITS
   — des instantanés des réglages de sons, sans les motifs — pour les rappeler.

   Avant chaque changement, les sons en place sont gardés : REMETTRE LES SONS
   D'AVANT revient en arrière, et un second appui refait le changement, ce qui
   permet de comparer.

   Où vivent les sons ? Sur la plupart des machines, dans le MOTIF (c'est le cas
   des vraies Electribe et TR) : un kit se rappelle alors dans le motif affiché,
   ou dans tous les motifs. Sur la MPC, dans le PROGRAMME de la séquence
   affichée. Sur le KAOSS PAD, la MC-101, le SmplTrek, le PO-33, la DMX et la
   CR-5000, dans la machine.

   Un kit ne garde que des réglages de sons. À la relecture, chaque valeur doit
   avoir le type de celle qu'elle remplace : un kit abîmé ou d'une autre version
   ne peut rien casser. */

var KITS_MAX = 16;
var KITS = {portee:"motif"};

function kitsCopie(o){ return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
function kitsChamps(o, champs){
  var r = {};
  (champs || Object.keys(o)).forEach(function(c){ if(o && o[c] !== undefined) r[c] = kitsCopie(o[c]); });
  return r;
}
/* recopie une valeur seulement si elle a la forme de celle qu'elle remplace */
function kitsFusion(cible, source, champs){
  if(!cible || !source || typeof source !== "object") return;
  (champs || Object.keys(source)).forEach(function(c){
    if(!(c in source) || !(c in cible)) return;
    var v = source[c], a = cible[c];
    if(c === "ech"){
      if(v === null || (typeof v === "string" && v.length && v.length <= 128)) cible[c] = v;
      return;
    }
    if(typeof v === "number"){ if(typeof a === "number" && isFinite(v)) cible[c] = v; return; }
    if(typeof v === "boolean" || typeof v === "string"){ if(typeof a === typeof v) cible[c] = v; return; }
    if(Array.isArray(v)){ if(Array.isArray(a) && a.length === v.length) cible[c] = kitsCopie(v); return; }
    if(v && typeof v === "object" && a && typeof a === "object" && !Array.isArray(a)) kitsFusion(a, v, null);
  });
}
/* descripteur d'une machine dont les sons sont un tableau d'objets */
function kitsObjets(prendre, champs){
  return {
    lire:function(h){ return prendre(h).map(function(o){ return kitsChamps(o, champs); }); },
    ecrire:function(h, l){
      var a = prendre(h);
      if(!Array.isArray(l) || l.length !== a.length) return false;
      l.forEach(function(x, i){ kitsFusion(a[i], x, champs); });
      return true;
    }
  };
}
function kitsAvec(base, extra){ for(var k in extra) base[k] = extra[k]; return base; }
function kitsMotifs(liste, courant){
  /* le motif affiché, s'il n'est pas (encore) dans la liste, compte aussi */
  var l = liste.slice();
  if(courant && l.indexOf(courant) < 0) l.push(courant);
  return l;
}
var KITS_EM_CHAMPS = ["tim","lvl","pan","pit","amp","fx","onde"];

/* ---------- une entrée par machine ---------- */
var KITS_MACHINES = {
  es1:kitsAvec(kitsObjets(function(h){ return h.son; }, null), {nom:"Electribe ES-1", mem:"memEs",
    courant:function(){ return ES.pat; }, motifs:function(){ return kitsMotifs(ES.slots, ES.pat); },
    ou:function(){ return "motif " + (ES.cur + 1); },
    parties:function(){ return ES_PARTS.map(function(p){ return "Partie " + p.n; }); },
    /* la dixième partie est l'accent : pas de son */
    son:function(i, o){ return i < 9 ? (o.ech || null) : null; }, bib:function(i){ return i < 9 ? i : -1; },
    emplacement:function(i){ return i < 9; }}),
  esx:kitsAvec(kitsObjets(function(h){ return h.son; }, null), {nom:"Electribe ESX-1", mem:"memSx",
    courant:function(){ return SX.pat; }, motifs:function(){ return kitsMotifs(SX.slots, SX.pat); },
    ou:function(){ return "motif " + (SX.cur + 1); },
    parties:function(){ var l = []; for(var i=0;i<SX.pat.son.length;i++) l.push(nomPartieSx(i)); return l; },
    son:function(i, o){ return o.ech || null; }, bib:function(i){ return i; }}),
  emx:kitsAvec(kitsObjets(function(h){ return h.son; }, null), {nom:"Electribe EMX-1", mem:"memMx",
    courant:function(){ return MX.pat; }, motifs:function(){ return kitsMotifs(MX.slots, MX.pat); },
    ou:function(){ return "motif " + (MX.cur + 1); },
    parties:function(){ var l = []; for(var i=0;i<MX.pat.son.length;i++) l.push(i < 10 ? "Drum " + MX_DRUMS[i] : "Synth " + (i - 9)); return l; },
    /* les Drums de l'EMX-1 lisent la banque interne : un numéro de timbre */
    son:function(i, o){ return i < 9 && typeof o.tim === "number" ? "b" + o.tim : null; },
    bib:function(i){ return i < 9 ? i : -1; }, banqueSeule:true}),
  er1:kitsAvec(kitsObjets(function(h){ return h.son; }, null), {nom:"Electribe ER-1", mem:"memEr",
    courant:function(){ return ER.pat; }, motifs:function(){ return kitsMotifs(ER.slots, ER.pat); },
    ou:function(){ return "motif " + (ER.cur + 1); },
    parties:function(){ return ER_PARTS.map(function(p){ return (p.t === "perc" ? "Perc " : p.t === "bruit" ? "Bruit " : "") + p.n; }); },
    son:function(){ return null; }}),
  em1:{nom:"Electribe EM-1", mem:"memEm",
    courant:function(){ return EM.pat; }, motifs:function(){ return kitsMotifs(EM.slots, EM.pat); },
    ou:function(){ return "motif " + (EM.cur + 1); },
    parties:function(){ return EM_PARTS.map(function(p){ return p.nom; }); },
    lire:function(h){
      return h.tim.map(function(_, k){
        var o = {}; KITS_EM_CHAMPS.forEach(function(c){ if(Array.isArray(h[c])) o[c] = kitsCopie(h[c][k]); }); return o;
      });
    },
    ecrire:function(h, l){
      if(!Array.isArray(l) || l.length !== h.tim.length) return false;
      l.forEach(function(x, k){
        if(!x || typeof x !== "object") return;
        KITS_EM_CHAMPS.forEach(function(c){
          if(!Array.isArray(h[c]) || !(c in x)) return;
          var v = x[c], a = h[c][k];
          if(typeof v === typeof a && (typeof v !== "number" || isFinite(v))) h[c][k] = v;
        });
      });
      return true;
    },
    son:function(){ return null; }},
  tr808:null, tr909:null, tr707:null, rd6:null,
  dbi:kitsAvec(kitsObjets(function(h){ return h.pistes.map(function(p){ return p.p; }); }, null), {nom:"DrumBrute Impact", mem:"memDbi",
    courant:function(){ return motifDbiCur(); }, motifs:function(){ return DBI.motifs.slice(); },
    ou:function(){ return "motif " + (indiceMotifDbi() + 1); },
    parties:function(){ return DBI_VOIX.map(function(v){ return v.nom; }); },
    son:function(){ return null; }}),
  t1k:kitsAvec(kitsObjets(function(h){ return h.instr; }, ["tune","dec","c1","c2","niv","mix","ech","pech"]), {nom:"Roland TR-1000", mem:"memT1k",
    courant:function(){ return motifT1kCur(); }, motifs:function(){ return T1K.motifs.slice(); },
    /* un motif vide reste vide : sinon les 128 motifs repartiraient en mémoire */
    utile:function(h){ return h === motifT1kCur() || JSON.stringify(ecrireMotifT1k(h)) !== motifVideT1k(); },
    ou:function(){ return "motif " + "ABCDEFGH".charAt(T1K.banq) + (T1K.cur + 1); },
    parties:function(){ return T1K_INSTR.map(function(p){ return p.nom; }); },
    son:function(i, o){ return o.ech || null; }, bib:function(i){ return i; }}),
  vlc:kitsAvec(kitsObjets(function(h){ return h.parties; }, ["ech","par","f"]), {nom:"Korg volca sample", mem:"memVlc",
    courant:function(){ return motifVlcCur(); }, motifs:function(){ return VLC.motifs.slice(); },
    ou:function(){ return "motif " + (VLC.cur + 1); },
    parties:function(){ var l = []; for(var i=0;i<10;i++) l.push("Partie " + (i + 1)); return l; },
    son:function(i, o){ return o.ech || null; }, bib:function(i){ return i; }}),
  arcm:kitsAvec(kitsObjets(function(h){ return h.pistes; },
      ["ech","nom","niv","pan","tune","dec","debut","filt","fin","reso","ftype","drive","envoi","rev"]), {nom:"Machine d'archive", mem:"memArcm",
    courant:function(){ return motifArcmCur(); }, motifs:function(){ return ARCM.motifs.slice(); },
    ou:function(){ return "motif " + (ARCM.cur + 1); },
    parties:function(){ return motifArcmCur().pistes.map(function(p, i){ return p.nom || ("Piste " + (i + 1)); }); },
    son:function(i, o){ return o.ech || null; }, bib:function(i){ return i; }, emplacement:function(){ return true; }}),
  mpc3000:null, mpc2000:null,
  kp:kitsAvec(kitsObjets(function(){ return KP.banques; }, ["ech","mode","slice","tranche"]), {nom:"Korg KAOSS PAD", mem:"memKp",
    parties:function(){ return ["Banque A", "Banque B", "Banque C", "Banque D"]; },
    son:function(i, o){ return o.ech || null; }, bib:function(i){ return i; }}),
  mc:kitsAvec(kitsObjets(function(){ return MC.pistes; }, ["onde","ech","cut","dec","niv","oct"]), {nom:"Roland MC-101", mem:"memMc",
    parties:function(){ return MC.pistes.map(function(_, i){ return "Piste " + (i + 1); }); },
    son:function(i, o){ return i >= 1 ? (o.ech || null) : null; }, bib:function(i){ return i >= 1 ? i - 1 : -1; },
    emplacement:function(i){ return i >= 1; }}),
  stk:kitsAvec(kitsObjets(function(){ return STK.pistes; }, ["ech","note","slice","tranche","niv","pan","tune","dec","filt"]), {nom:"SmplTrek", mem:"memStk",
    parties:function(){ return STK.pistes.map(function(_, i){ return "Piste " + (i + 1); }); },
    son:function(i, o){ return o.ech || null; }, bib:function(i){ return i; }}),
  ko:{nom:"PO-33 K.O!", mem:"memKo",
    parties:function(){ var l = []; for(var i=0;i<16;i++) l.push("Son " + (i + 1)); return l; },
    lire:function(){ return KO.sons.map(function(id){ return {ech:id}; }); },
    ecrire:function(h, l){
      if(!Array.isArray(l) || l.length !== KO.sons.length) return false;
      l.forEach(function(x, i){ if(x && typeof x.ech === "string" && x.ech.length && x.ech.length <= 128) KO.sons[i] = x.ech; });
      return true;
    },
    son:function(i, o){ return o.ech || null; }, bib:function(i){ return i; }},
  dmx:null, cr5:null
};
/* les TR partagent un moteur : même entrée, plus les réglages de timbre communs */
["tr808","tr909","tr707","rd6"].forEach(function(m){
  KITS_MACHINES[m] = kitsAvec(kitsObjets(function(h){ return h.son; }, null), {nom:m === "rd6" ? "Behringer RD-6" : "Roland " + m.toUpperCase().replace("TR", "TR-"), mem:"memTr",
    courant:function(){ return TR.pat; }, motifs:function(){ return kitsMotifs(TR.slots, TR.pat); },
    ou:function(){ return "motif " + (TR.cur + 1); },
    parties:function(){ return TR.def.instr.map(function(p){ return p.nom || p.id; }); },
    son:function(){ return null; },
    global:{lire:function(){ return kitsChamps(TR, ["dist","drive","tone","clap","couleur"]); },
            ecrire:function(o){ kitsFusion(TR, o, ["dist","drive","tone","clap","couleur"]); }}});
});
KITS_MACHINES.es2 = kitsAvec(kitsAvec({}, KITS_MACHINES.es1), {nom:"Electribe ES-1 mkII"});
KITS_MACHINES.er2 = kitsAvec(kitsAvec({}, KITS_MACHINES.er1), {nom:"Electribe ER-1 mkII",
  /* ses deux parties PCM lisent la banque interne */
  son:function(i, o){ return (i === 4 || i === 5) && typeof o.pcm === "number" ? "b" + o.pcm : null; },
  bib:function(i){ return i === 4 ? 0 : i === 5 ? 1 : -1; }, banqueSeule:true});
KITS_MACHINES.ea1 = kitsAvec(kitsObjets(function(h){ return h.son; }, null), {nom:"Electribe EA-1", mem:"memEa",
  courant:function(){ return EA.pat; }, motifs:function(){ return kitsMotifs(EA.slots, EA.pat); },
  ou:function(){ return "motif " + (EA.cur + 1); },
  parties:function(){ return ["Synth 1", "Synth 2"]; }, son:function(){ return null; }});
KITS_MACHINES.ea2 = kitsAvec(kitsAvec({}, KITS_MACHINES.ea1), {nom:"Electribe EA-1 mkII"});
["mpc3000","mpc2000"].forEach(function(m){
  KITS_MACHINES[m] = kitsAvec(kitsObjets(function(){ return MPC.pads; }, null), {nom:"Akai " + m.toUpperCase(), mem:"memMpc",
    ou:function(){ return MPC.progs[MPC.prog] ? MPC.progs[MPC.prog].nom.toLowerCase() : "programme"; },
    parties:function(){ var l = []; for(var i=0;i<64;i++) l.push("Pad " + MPC_BANQUES[Math.floor(i/16)] + ((i%16)+1)); return l; },
    son:function(i, o){ return o.ech || null; }, bib:function(i){ return i; }});
});
/* DMX et CR-5000 : des niveaux seulement, une ligne par voix */
function kitsNiveaux(nom, mem, objet, noms){
  return {nom:nom, mem:mem,
    parties:function(){ var n = noms ? noms() : {}; return Object.keys(objet()).map(function(k){ return n[k] || k.toUpperCase(); }); },
    lire:function(){ var o = objet(); return Object.keys(o).map(function(k){ return {niv:o[k]}; }); },
    ecrire:function(h, l){
      var o = objet(), ks = Object.keys(o);
      if(!Array.isArray(l) || l.length !== ks.length) return false;
      ks.forEach(function(k, i){ if(l[i] && typeof l[i].niv === "number" && isFinite(l[i].niv)) o[k] = Math.max(0, Math.min(1, l[i].niv)); });
      return true;
    },
    son:function(){ return null; }};
}
KITS_MACHINES.dmx = kitsNiveaux("Oberheim DMX", "memDmx", function(){ return DMX.niv; },
  function(){ var n = {}; DMX_FADERS.forEach(function(f){ n[f[0]] = f[1]; }); return n; });
KITS_MACHINES.cr5 = kitsNiveaux("Roland CR-5000", "memCr", function(){ return CR5.niv; }, null);

var KITS_ORDRE = ["es1","es2","esx","emx","em1","er1","er2","ea1","ea2","tr808","tr909","tr707","rd6",
                  "dbi","t1k","vlc","arcm","mpc3000","mpc2000","dmx","cr5","ko","kp","mc","stk"];

/* ---------- mémoire des kits : drm.reglages.kits, donc aussi dans les projets ---------- */
function kitsLireTout(){
  var o = null;
  try{ o = JSON.parse(localStorage.getItem(MEM + ".kits") || "null"); }catch(e){ o = null; }
  if(!o || typeof o !== "object" || !o.machines || typeof o.machines !== "object") o = {v:1, machines:{}};
  return o;
}
function kitsEcrireTout(o){
  if(typeof PROJET_EN_COURS !== "undefined" && PROJET_EN_COURS) return false;
  try{ localStorage.setItem(MEM + ".kits", JSON.stringify(o)); return true; }
  catch(e){ signal("MÉMOIRE PLEINE · KITS NON GARDÉS"); return false; }
}
function kitsDe(tout, m){
  var d = tout.machines[m];
  if(!d || typeof d !== "object") d = tout.machines[m] = {};
  if(!Array.isArray(d.kits)) d.kits = [];
  d.kits = d.kits.filter(function(k){ return k && typeof k === "object" && Array.isArray(k.parties); });
  return d;
}
/* combien de fois un son sert dans les kits rangés (avertissement avant suppression) */
function kitsUsagesEch(id){
  var n = 0, tout = kitsLireTout();
  Object.keys(tout.machines).forEach(function(m){
    var d = tout.machines[m];
    if(d && Array.isArray(d.kits)) d.kits.forEach(function(k){
      if(k && Array.isArray(k.parties)) k.parties.forEach(function(p){ if(p && p.ech === id) n++; });
    });
  });
  return n;
}

/* ---------- lire et poser les sons de la machine affichée ---------- */
function kitsMotifsCibles(D, tous){
  if(!D.courant) return [null];
  if(!tous) return [D.courant()];
  return D.motifs().filter(function(h){ return h && (!D.utile || D.utile(h)); });
}
function kitsInstantane(m, tous){
  var D = KITS_MACHINES[m];
  var r = {tous:!!tous && !!D.courant};
  if(r.tous){
    var l = D.motifs();
    r.motifs = {};
    kitsMotifsCibles(D, true).forEach(function(h){ r.motifs[l.indexOf(h)] = D.lire(h); });
  } else r.parties = D.lire(D.courant ? D.courant() : null);
  if(D.global) r.global = D.global.lire();
  return r;
}
function kitsPoser(m, inst){
  var D = KITS_MACHINES[m], ok = false;
  if(inst.tous && inst.motifs){
    var l = D.motifs();
    Object.keys(inst.motifs).forEach(function(i){ if(l[i] && D.ecrire(l[i], inst.motifs[i])) ok = true; });
  } else if(Array.isArray(inst.parties)){
    kitsMotifsCibles(D, !!inst.partout).forEach(function(h){ if(D.ecrire(h, inst.parties)) ok = true; });
  }
  if(ok && inst.global && D.global) D.global.ecrire(inst.global);
  return ok;
}
/* enregistrer puis rouvrir la machine : sa façade se remet à jour d'un bloc,
   son mode morceau reste allumé (v250), le motif affiché reste le même */
function kitsEnregistrer(m){
  var D = KITS_MACHINES[m];
  try{ if(typeof window[D.mem] === "function") window[D.mem](); }catch(e){}
  writeMem();
  rouvrirMachine(m);
}
function kitsGarderAvant(m, tous){
  var tout = kitsLireTout(), d = kitsDe(tout, m);
  d.avant = kitsInstantane(m, tous);
  d.avant.date = Date.now();
  kitsEcrireTout(tout);
}
function kitsMachinePrete(m){
  if(!KITS_MACHINES[m]) return false;
  if(S.modele !== m) allerMachine(m);
  return S.modele === m;
}
/* mêmes garde-fous que le tirage au sort des sons */
function kitsModifiable(m){
  if(typeof ESSAI !== "undefined" && ESSAI) annulerEssai();   /* v253 */
  if(!kitsMachinePrete(m)) return false;
  if(m === "dbi" && typeof editionDbiPermise === "function" && !editionDbiPermise()) return false;
  return true;
}

/* ---------- gestes ---------- */
function kitsRanger(m, nom, remplacer){
  if(!kitsMachinePrete(m)) return false;
  var tout = kitsLireTout(), d = kitsDe(tout, m), D = KITS_MACHINES[m];
  var kit = {nom:(nom || "KIT " + (d.kits.length + 1)).slice(0, 28), date:Date.now(),
             parties:D.lire(D.courant ? D.courant() : null)};
  if(D.global) kit.global = D.global.lire();
  if(remplacer >= 0 && d.kits[remplacer]){ kit.nom = d.kits[remplacer].nom; d.kits[remplacer] = kit; }
  else {
    if(d.kits.length >= KITS_MAX){ signal(KITS_MAX + " KITS AU PLUS PAR MACHINE"); return false; }
    d.kits.push(kit);
  }
  if(!kitsEcrireTout(tout)) return false;
  signal("KIT RANGÉ : " + kit.nom);
  return true;
}
function kitsRappeler(m, n, tous){
  if(!kitsModifiable(m)) return false;
  var d = kitsDe(kitsLireTout(), m), kit = d.kits[n], D = KITS_MACHINES[m];
  if(!kit){ signal("KIT INTROUVABLE"); return false; }
  tous = !!tous && !!D.courant;
  kitsGarderAvant(m, tous);
  if(!kitsPoser(m, {parties:kit.parties, global:kit.global, partout:tous})){
    signal("CE KIT NE CORRESPOND PAS À CETTE MACHINE"); return false;
  }
  kitsEnregistrer(m);
  signal("KIT " + kit.nom + " RAPPELÉ" + (tous ? " DANS TOUS LES MOTIFS" : D.courant ? " · " + D.ou().toUpperCase() : ""));
  return true;
}
/* comparer : chaque appui échange les sons en place et ceux d'avant */
function kitsRemettre(m){
  if(!kitsModifiable(m)) return false;
  var tout = kitsLireTout(), d = kitsDe(tout, m);
  if(!d.avant){ signal("RIEN À REMETTRE"); return false; }
  var avant = d.avant, maintenant = kitsInstantane(m, avant.tous);
  if(!kitsPoser(m, avant)){ signal("SONS D'AVANT ILLISIBLES"); return false; }
  maintenant.date = Date.now();
  d.avant = maintenant;
  kitsEcrireTout(tout);
  kitsEnregistrer(m);
  signal("SONS D'AVANT REMIS · ENCORE UNE FOIS POUR REVENIR");
  return true;
}
/* changer le son d'une partie */
function kitsChangerSon(m, i, id){
  if(!kitsModifiable(m)) return false;
  var D = KITS_MACHINES[m];
  if(D.banqueSeule && String(id).charAt(0) !== "b"){ signal("CETTE PARTIE NE LIT QUE LA BANQUE INTERNE"); return false; }
  var h = D.courant ? D.courant() : null, l = D.lire(h);
  if(!l[i] || !kitsEmplacement(D, i, l[i])){ signal("CETTE PARTIE N'A PAS DE SON À CHANGER"); return false; }
  if(!D.bib || D.bib(i) < 0){ signal("CETTE PARTIE N'A PAS DE SON À CHANGER"); return false; }
  kitsGarderAvant(m, false);
  /* v253 : toutes les machines passent par AFFECTER, qui change le son sans
     arrêter la lecture */
  BIB.cible = {machine:m, partie:D.bib(i)};
  return bibAffecter(id) === true;
}
/* v253 : depuis une partie, ouvrir le rayon SONS prêt à essayer d'autres sons
   de la même catégorie */
function kitsVersEssai(m, i, id){
  var D = KITS_MACHINES[m];
  if(!D || !D.bib || D.bib(i) < 0) return;
  BIB.cible = {machine:m, partie:D.bib(i)};
  var f = typeof bibFiltre === "function" ? bibFiltre() : null;
  if(f){
    f.q = ""; f.orig = "tout"; f.fav = false; f.n = BIB_PAGE;
    f.cat = id && typeof bibCategorie === "function" ? bibCategorie({id:id, nom:nomBib(id)}) : "";
  }
  BIB.onglet = 0;
  majBibUI();
  signal("CHOISISSEZ UN SON · ESSAYER LE MET À L'ESSAI SUR " + D.parties()[i].toUpperCase());
}

/* ---------- le rayon ---------- */
function bibRendreMachines(corps){
  var m = KITS_MACHINES[S.modele] ? S.modele : (KITS.machine || "es1");
  KITS.machine = m;
  var D = KITS_MACHINES[m];
  var entete = document.createElement("div");
  var h = document.createElement("h3"); h.textContent = "Machine"; entete.appendChild(h);
  var sel = document.createElement("select"); sel.id = "kits-machine";
  KITS_ORDRE.forEach(function(k){
    var o = document.createElement("option"); o.value = k; o.textContent = KITS_MACHINES[k].nom; sel.appendChild(o);
  });
  sel.value = m;
  sel.addEventListener("change", function(){
    KITS.machine = this.value;
    allerMachine(this.value);       /* un vrai choix de machine, comme au menu */
    majBibUI(); H.inter();
  });
  var r = document.createElement("div"); r.className = "bib-cible"; r.appendChild(sel); entete.appendChild(r);
  if(S.modele !== m){
    var pm = document.createElement("p"); pm.style.opacity = ".75";
    pm.textContent = "La machine affichée n'a pas de sons à ranger ici. Ouvrez-en une :";
    entete.appendChild(pm);
    var ao = document.createElement("div"); ao.className = "bib-actions";
    boutonBib(ao, "OUVRIR " + D.nom.toUpperCase(), function(){ allerMachine(m); majBibUI(); H.inter(); });
    entete.appendChild(ao);
    corps.appendChild(entete); return;
  }
  var tout = kitsLireTout(), d = kitsDe(tout, m);
  var info = document.createElement("p"); info.style.opacity = ".75"; info.style.fontSize = "13px";
  info.textContent = D.courant ? "Les sons de cette machine appartiennent au motif : vous voyez ceux du " + D.ou() + "."
                   : m.indexOf("mpc") === 0 ? "Les sons de la MPC sont dans le programme de la séquence affichée : ici " + D.ou() + "."
                   : "Les sons de cette machine valent pour tous ses motifs.";
  entete.appendChild(info);
  var acts = document.createElement("div"); acts.className = "bib-actions";
  boutonBib(acts, "RANGER CE KIT", function(){
    renommer("Nom du kit", "KIT " + (d.kits.length + 1), function(v){ if(kitsRanger(m, v || "", -1)) majBibUI(); });
  });
  var bAvant = boutonBib(acts, "REMETTRE LES SONS D'AVANT", function(){ if(kitsRemettre(m)) majBibUI(); });
  if(typeof peutFiger === "function" && peutFiger(m))
    boutonBib(acts, "FIGER EN ÉCHANTILLONS", function(){ figerMachine(m); });       /* v255 */
  /* v256 : kit au hasard, par rôle ; copie vers une autre machine */
  if(typeof kitAuHasard === "function" && D.bib){
    boutonBib(acts, "KIT AU HASARD", function(){
      var fav = document.getElementById("kits-hasard-fav");
      if(kitAuHasard(m, !!(fav && fav.checked))) majBibUI();
    }).id = "kits-hasard";
    var lf = document.createElement("label"); lf.className = "kits-tous";
    var cf = document.createElement("input"); cf.type = "checkbox"; cf.id = "kits-hasard-fav"; cf.checked = !!KITS.hasardFav;
    cf.addEventListener("change", function(){ KITS.hasardFav = this.checked; });
    lf.appendChild(cf); lf.appendChild(document.createTextNode(" au hasard parmi les favoris"));
    acts.appendChild(lf);
    var sv = document.createElement("select"); sv.id = "kits-copier"; sv.className = "kits-copier";
    var o0 = document.createElement("option"); o0.value = ""; o0.textContent = "COPIER CE KIT VERS…"; sv.appendChild(o0);
    machinesAEchantillons().forEach(function(x){
      if(x === m) return;
      var o = document.createElement("option"); o.value = x; o.textContent = KITS_MACHINES[x].nom; sv.appendChild(o);
    });
    sv.addEventListener("change", function(){
      if(!this.value) return;
      var v = this.value;
      if(copierKitVers(m, v)){ KITS.machine = v; majBibUI(); }
    });
    acts.appendChild(sv);
  }
  bAvant.id = "kits-avant";
  bAvant.disabled = !d.avant;
  if(D.courant){
    var lab = document.createElement("label"); lab.className = "kits-tous";
    var cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "kits-tous"; cb.checked = KITS.portee === "tous";
    cb.addEventListener("change", function(){ KITS.portee = this.checked ? "tous" : "motif"; });
    lab.appendChild(cb); lab.appendChild(document.createTextNode(" rappeler dans tous les motifs"));
    acts.appendChild(lab);
  }
  entete.appendChild(acts);
  corps.appendChild(entete);

  var hk = document.createElement("h3"); hk.textContent = "Kits rangés (" + d.kits.length + "/" + KITS_MAX + ")";
  corps.appendChild(hk);
  if(!d.kits.length){
    var pv = document.createElement("p"); pv.style.opacity = ".7";
    pv.textContent = "Aucun kit. RANGER CE KIT garde les sons actuels sous un nom.";
    corps.appendChild(pv);
  }
  d.kits.forEach(function(kit, n){
    var ids = kit.parties.filter(function(p){ return p && typeof p.ech === "string"; }).length;
    var l = ligneBib(kit.nom, new Date(kit.date || 0).toLocaleDateString() + (ids ? " · " + ids + " échantillons" : ""));
    l.className += " kits-kit";
    var a = document.createElement("div"); a.className = "bib-actions";
    boutonBib(a, "RAPPELER", function(){ if(kitsRappeler(m, n, KITS.portee === "tous")) majBibUI(); });
    boutonBib(a, "REMPLACER", function(){
      if(!window.confirm("Remplacer « " + kit.nom + " » par les sons actuels ?")) return;
      if(kitsRanger(m, kit.nom, n)) majBibUI();
    });
    if(typeof exporterKit === "function") boutonBib(a, "EXPORTER", function(){ exporterKit(m, n); });   /* v257 */
    boutonBib(a, "RENOMMER", function(){
      renommer("Nom du kit", kit.nom, function(v){
        if(!v) return;
        var t = kitsLireTout(), dd = kitsDe(t, m);
        if(dd.kits[n]){ dd.kits[n].nom = v; kitsEcrireTout(t); majBibUI(); }
      });
    });
    boutonBib(a, "SUPPRIMER", function(){
      if(!window.confirm("Supprimer le kit « " + kit.nom + " » ?")) return;
      var t = kitsLireTout(), dd = kitsDe(t, m);
      dd.kits.splice(n, 1); kitsEcrireTout(t); majBibUI(); H.inter();
    });
    l.appendChild(a);
    corps.appendChild(l);
  });

  var hs = document.createElement("h3"); hs.textContent = "Sons actuels";
  corps.appendChild(hs);
  var noms = D.parties(), l2 = D.lire(D.courant ? D.courant() : null), sons = null;
  l2.forEach(function(o, i){
    var id = D.son(i, o);
    var l = ligneBib(noms[i] || ("Partie " + (i + 1)), kitsResume(D, i, o, id));
    l.className += " kits-partie";
    if(kitsEmplacement(D, i, o)){
      var a = document.createElement("div"); a.className = "bib-actions";
      if(id) boutonBib(a, "ÉCOUTER", function(){ kitsEcouter(id); });
      var s = document.createElement("select"); s.className = "kits-choix";
      var o0 = document.createElement("option"); o0.value = ""; o0.textContent = "CHANGER…"; s.appendChild(o0);
      if(!sons) sons = bibSons();
      sons.forEach(function(x){
        if(D.banqueSeule && x.propre) return;
        var op = document.createElement("option"); op.value = x.id; op.textContent = x.nom; s.appendChild(op);
      });
      s.addEventListener("change", function(){
        if(!this.value) return;
        if(kitsChangerSon(m, i, this.value)) majBibUI();
        H.inter();
      });
      a.appendChild(s);
      boutonBib(a, "ESSAYER D'AUTRES SONS", function(){ kitsVersEssai(m, i, id); });
      l.appendChild(a);
    }
    corps.appendChild(l);
  });
}
/* une partie qui peut recevoir un échantillon, plein ou vide */
function kitsEmplacement(D, i, o){
  if(D.emplacement) return D.emplacement(i, o);
  if(D.bib) return D.bib(i) >= 0;
  return "ech" in o;
}
function kitsResume(D, i, o, id){
  if(id) return nomBib(id) + (D.banqueSeule ? " · banque" : "") +
    (typeof o.mix === "number" && o.mix <= 0.02 ? " · muet tant que MIX est à 0" : "");
  if(kitsEmplacement(D, i, o)) return "vide";
  var ks = Object.keys(o);
  if(ks.length === 1 && ks[0] === "niv") return "niveau " + Math.round(o.niv * 100) + " %";
  return "synthèse · " + ks.length + " réglages";
}
function kitsEcouter(id){
  audioInit(); banqueEs();
  var b = ES.buf[id];
  if(!b){ signal("SON INTROUVABLE"); return; }
  var src = ctx.createBufferSource(); src.buffer = b;
  var g = ctx.createGain(); g.gain.value = 0.8;
  src.connect(g); g.connect(master); src.start();
}
