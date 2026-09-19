/* ================= SmplTrek : dix pistes =================
   Ce n'est pas une boîte à rythmes de plus. Les vingt-six machines précédentes
   ont toutes le même modèle : un motif qui contient tout, sons compris. Ici les
   PISTES persistent — leur son, leur niveau, leur timbre — et les MOTIFS ne
   contiennent que les pas. On change de motif sans perdre son mixage, ce qui
   est exactement ce qu'on attend d'une station multipiste.

   Et un écran qui montre la forme d'onde de la piste choisie : sur une machine
   à échantillons, voir où le son commence et finit vaut tous les réglages. */

var STK_PISTES = 10, STK_MOTIFS = 8;

function pisteStk(i){
  return {ech:"b" + (i % 24), type:"shots", note:0, slice:false, tranche:0, niv:0.8, pan:0, tune:0.5, dec:0.85, filt:1, muet:false};
}
function motifStk(){
  var m = {pas:[], tranches:[], notes:[], last:16};
  for(var i=0;i<STK_PISTES;i++){ m.pas.push(0); m.tranches.push(Array(16).fill(-1)); m.notes.push(Array(16).fill(0)); }
  return m;
}
var STK = {pistes:[], motifs:[], cur:0, sel:0, solo:-1, rec:false, pos:-1,
           noeuds:null, chaine:[], chaineSel:-1, chainePos:0, song:false, onde:null, ondePour:"",
           clavierMidi:false, quantifie:false, attente:null, depart:null, contexte:null, copie:null,
           chaineDeparts:[], chaineProgramme:-1, chaineContexte:null, chaineTemps:0};
for(var sz=0; sz<STK_PISTES; sz++) STK.pistes.push(pisteStk(sz));
for(var sz2=0; sz2<STK_MOTIFS; sz2++) STK.motifs.push(motifStk());

function motifStkCur(){ return STK.motifs[STK.cur]; }
function pisteStkSel(){ return STK.pistes[STK.sel]; }

/* v187 : l'affichage reste sur le motif entendu jusqu'au départ audio.
   Une demande non programmée est annulable, un départ déjà programmé est verrouillé. */
function viderAttenteStk(){ STK.attente = null; STK.depart = null; STK.contexte = null; }
function viderLectureChaineStk(){
  STK.chaineDeparts = []; STK.chaineProgramme = -1; STK.chaineContexte = null; STK.chaineTemps = 0;
}
function validerDepartStk(){
  if(STK.contexte && STK.contexte !== ctx) viderAttenteStk();
  if(STK.chaineContexte && STK.chaineContexte !== ctx) viderLectureChaineStk();
  if(!ctx || ctx.startRendering) return false;
  var change = false, d = STK.depart;
  if(d && maintenantAudio() >= d.t){
    STK.cur = d.motif; STK.depart = null; STK.contexte = null; change = true;
  }
  while(STK.chaineDeparts.length && maintenantAudio() >= STK.chaineDeparts[0].t){
    var c = STK.chaineDeparts.shift(); STK.cur = c.motif; STK.chainePos = c.position; change = true;
  }
  return change;
}
function suivreMotifsStk(){ if(validerDepartStk()){ memStk(); majStk(); } }
function lectureMotifsStk(){
  return S.run && ctx && !ctx.startRendering &&
    (MACHINE === MACHINE_STK || (typeof SET !== "undefined" && SET.on && SET.actives.stk));
}
function commandeMotifsStk(){
  suivreMotifsStk();
  if(STK.song && S.run){ signal("ARRÊTEZ PLAY POUR QUITTER LA CHAÎNE"); return false; }
  if(STK.depart){ signal("DÉPART IMMINENT"); return false; }
  return true;
}
function choisirMotifStk(k){
  if(!Number.isInteger(k) || k < 0 || k >= STK_MOTIFS) return false;
  if(!commandeMotifsStk()) return false;
  STK.song = false;
  if(STK.quantifie && lectureMotifsStk()){
    if(STK.motifs[k].last !== motifStkCur().last){
      signal("ARRÊTEZ PLAY POUR CHANGER LA LONGUEUR DU MOTIF"); return false;
    }
    STK.attente = STK.cur === k || STK.attente === k ? null : k;
    STK.contexte = STK.attente === null ? null : ctx;
  } else { viderAttenteStk(); STK.cur = k; memStk(); }
  STK.song = false; majStk(); return true;
}
function modeMotifsStk(){
  if(STK.song) return false;
  if(!commandeMotifsStk()) return false;
  STK.quantifie = !STK.quantifie; viderAttenteStk(); memStk(); majStk(); return true;
}
function annulerMotifStk(){
  if(!commandeMotifsStk()) return false;
  viderAttenteStk(); majStk(); return true;
}
function copieMotifStk(m){
  return {last:m.last, pas:m.pas.slice(), tranches:m.tranches.map(function(t){ return t.slice(); }), notes:m.notes.map(function(n){ return n.slice(); })};
}
function copierMotifStk(){
  suivreMotifsStk();
  STK.copie = {origine:STK.cur, motif:copieMotifStk(motifStkCur())};
  majStk(); signal("MOTIF " + (STK.cur + 1) + " COPIÉ · DIX PISTES");
}
function collerMotifStk(){
  if(!STK.copie){ signal("COPIEZ D'ABORD UN MOTIF"); return false; }
  if(S.run){ signal("ARRÊTEZ PLAY POUR COLLER UN MOTIF"); return false; }
  if(motifStkCur().pas.some(function(p){ return p !== 0; }) &&
    !window.confirm("Remplacer les dix pistes du motif " + (STK.cur + 1) + " par la copie ? Les sons et le mixage restent inchangés.")) return false;
  STK.motifs[STK.cur] = copieMotifStk(STK.copie.motif);
  memStk(); majStk(); signal("MOTIF COLLÉ · DIX PISTES"); return true;
}

/* v188 : chaîne de motifs de même longueur, bouclée, éditable à l'arrêt. */
function chaineValideStk(){
  if(!STK.chaine.length) return false;
  var premier = STK.motifs[STK.chaine[0]];
  return !!premier && STK.chaine.every(function(k){ return STK.motifs[k] && STK.motifs[k].last === premier.last; });
}
function ajouterChaineStk(){
  if(S.run){ signal("ARRÊTEZ PLAY POUR MODIFIER LA CHAÎNE"); return false; }
  if(STK.chaine.length >= 256){ signal("CHAÎNE PLEINE · 256 ENTRÉES"); return false; }
  if(STK.chaine.length && STK.motifs[STK.chaine[0]].last !== motifStkCur().last){
    signal("LES MOTIFS DE LA CHAÎNE DOIVENT AVOIR LA MÊME LONGUEUR"); return false;
  }
  STK.chaine.push(STK.cur); finirEditionChaineStk(); return true;
}
function retirerChaineStk(){
  if(S.run || !STK.chaine.length) return false;
  STK.chaine.pop(); finirEditionChaineStk(); return true;
}
function viderChaineStk(){
  if(S.run || !STK.chaine.length) return false;
  if(!window.confirm("Vider la chaîne ? Les motifs et leurs notes sont conservés.")) return false;
  STK.chaine = []; finirEditionChaineStk(); return true;
}
/* v191 : la sélection d'édition est distincte du motif et de la lecture. */
function selectionChaineStkValide(){
  return Number.isInteger(STK.chaineSel) && STK.chaineSel >= 0 && STK.chaineSel < STK.chaine.length;
}
function choisirEntreeChaineStk(k){
  if(S.run || !Number.isInteger(k) || k < 0 || k >= STK.chaine.length) return false;
  STK.chaineSel = STK.chaineSel === k ? -1 : k;
  majStk(); return true;
}
function finirEditionChaineStk(){
  STK.chaineSel = Math.min(STK.chaineSel, STK.chaine.length - 1);
  if(!STK.chaine.length) STK.song = false;
  STK.chainePos = 0; viderLectureChaineStk(); memStk(); majStk();
}
function deplacerEntreeChaineStk(sens){
  if(S.run || !selectionChaineStkValide() || (sens !== -1 && sens !== 1)) return false;
  var k = STK.chaineSel, autre = k + sens;
  if(autre < 0 || autre >= STK.chaine.length) return false;
  var motif = STK.chaine[k]; STK.chaine[k] = STK.chaine[autre]; STK.chaine[autre] = motif;
  STK.chaineSel = autre; finirEditionChaineStk(); return true;
}
function dupliquerEntreeChaineStk(){
  if(S.run || !selectionChaineStkValide()) return false;
  if(STK.chaine.length >= 256){ signal("CHAÎNE PLEINE · 256 ENTRÉES"); return false; }
  var k = STK.chaineSel;
  STK.chaine.splice(k + 1, 0, STK.chaine[k]); STK.chaineSel = k + 1;
  finirEditionChaineStk(); return true;
}
function supprimerEntreeChaineStk(){
  if(S.run || !selectionChaineStkValide()) return false;
  STK.chaine.splice(STK.chaineSel, 1); finirEditionChaineStk(); return true;
}
function modeChaineStk(){
  if(S.run){ signal("ARRÊTEZ PLAY POUR CHANGER DE MODE"); return false; }
  if(!STK.song && !chaineValideStk()){
    signal("AJOUTEZ DES MOTIFS DE MÊME LONGUEUR À LA CHAÎNE"); return false;
  }
  viderAttenteStk(); viderLectureChaineStk();
  STK.song = !STK.song;
  if(STK.song){ STK.cur = STK.chaine[0]; STK.chainePos = 0; }
  memStk(); majStk(); return true;
}
function preparerChaineStk(){
  if(!STK.song) return true;
  if(!chaineValideStk()){
    signal("CHAÎNE INVALIDE · VÉRIFIEZ LA LONGUEUR DES MOTIFS"); return false;
  }
  viderAttenteStk(); viderLectureChaineStk(); STK.cur = STK.chaine[0]; STK.chainePos = 0;
  memStk(); if(S.modele === "stk") majStk(); return true;
}

/* v189 : hauteur relative au sample, une valeur par pas. La hauteur réelle
   dépend du son importé ; zéro signifie sa vitesse d'origine (TUNE au centre). */
function noteInstrumentStk(v){
  return Number.isInteger(v) && v >= -12 && v <= 12 ? v : 0;
}
function nomHauteurStk(v){ return v === 0 ? "ORIGINE" : (v > 0 ? "+" : "") + v + " DEMI-TONS"; }
function modeInstrumentStk(){
  if(S.run){ signal("ARRÊTEZ PLAY POUR CHANGER DE TYPE"); return false; }
  var P = pisteStkSel(); P.type = P.type === "instrument" ? "shots" : "instrument";
  memStk(); majStk(); return true;
}
function choisirNoteStk(v){
  if(!Number.isInteger(v) || v < -12 || v > 12) return false;
  pisteStkSel().note = v; memStk(); majStk(); return true;
}
function ecouterInstrumentStk(){
  audioInit(); banqueEs();
  if(!ctx || !passeStk(STK.sel)) return false;
  var P = pisteStkSel();
  if(!ES.buf[P.ech]){ signal("SON INDISPONIBLE"); return false; }
  voixStk(maintenantAudio() + 0.005, STK.sel, false, P.slice ? P.tranche : -1, P.note);
  return true;
}

/* v190 : une résolution unique pour le jeu MIDI et le contrôle des sons à l'export. */
function cibleMidiStk(note, canal){
  if(!Number.isInteger(note) || note < 0 || note > 127) return null;
  var clavier = STK.clavierMidi && canal === MIDI.canalSy, k, hauteur;
  if(clavier){
    k = STK.sel;
    if(STK.pistes[k].type !== "instrument") return null;
    hauteur = note - MIDI.base;
    if(hauteur < -12 || hauteur > 12) return null;
  } else {
    k = note - MIDI.base;
    if(k < 0 || k >= STK_PISTES) k = STK.sel;
    hauteur = STK.pistes[k].type === "instrument" ? STK.pistes[k].note : 0;
  }
  var P = STK.pistes[k];
  return {piste:k, hauteur:hauteur, tranche:P.slice ? P.tranche : -1, clavier:!!clavier};
}
function jouerMidiStk(note, vel, canal){
  var cible = cibleMidiStk(note, canal);
  if(!cible || !passeStk(cible.piste) || !(vel > 0)) return false;
  voixStk(maintenantAudio() + 0.005, cible.piste, true, cible.tranche, cible.hauteur, Math.min(1,vel));
  return true;
}
function modeMidiStk(){
  if(S.run){ signal("ARRÊTEZ PLAY POUR CHANGER LE ROUTAGE MIDI"); return false; }
  if(!STK.clavierMidi && pisteStkSel().type !== "instrument"){
    signal("CHOISISSEZ UNE PISTE INSTRUMENT"); return false;
  }
  STK.clavierMidi = !STK.clavierMidi; memStk(); majStk(); return true;
}

/* v186 : huit tranches égales, sans création ni modification du fichier source.
   -1 dans un pas conserve le son entier des anciens projets. */
function numeroTrancheStk(v){
  return Number.isInteger(v) && v >= 0 && v < 8 ? v : -1;
}
function bornesTrancheStk(buf, v){
  var n = numeroTrancheStk(v);
  return n < 0 ? {debut:0, fin:buf.length} :
    {debut:Math.floor(buf.length * n / 8), fin:Math.floor(buf.length * (n + 1) / 8)};
}
function affecterSonStk(k, id){
  if(typeof PROJET_EN_COURS !== "undefined" && PROJET_EN_COURS) return false;
  if(!Number.isInteger(k) || k < 0 || k >= STK_PISTES || typeof id !== "string") return false;
  banqueEs();
  if(!ES.buf[id]){ signal("SON INDISPONIBLE"); return false; }
  if(S.modele !== "stk") chargerStk();
  STK.pistes[k].ech = id; STK.ondePour = ""; memStk();
  if(S.modele === "stk") majStk();
  return true;
}

function noeudsStk(){
  if(STK.noeuds && STK.noeuds.ctx === ctx) return STK.noeuds;
  var e = eurGain(1);
  e.connect(busSet("stk") || master);
  STK.noeuds = {ctx:ctx, e:e};
  return STK.noeuds;
}

/* Une piste coupée ne sonne pas ; le solo coupe toutes les autres. */
function passeStk(i){
  if(STK.solo >= 0) return STK.solo === i;
  return !STK.pistes[i].muet;
}

function voixStk(t, i, acc, tranche, note, velocite){
  audioInit(); if(!ctx) return;
  banqueEs();
  var P = STK.pistes[i];
  var buf = ES.buf[P.ech];
  if(!buf) return;
  var partie = P.slice ? numeroTrancheStk(tranche === undefined ? P.tranche : tranche) : -1;
  var bornes = bornesTrancheStk(buf, partie);
  if(bornes.fin <= bornes.debut) return;
  var n = noeudsStk();
  var src = ctx.createBufferSource();
  var hauteur = P.type === "instrument" ? noteInstrumentStk(note === undefined ? P.note : note) : 0;
  src.playbackRate.value = Math.pow(2, (P.tune - 0.5) * 2 + hauteur / 12);
  poserTampon(src, buf, src.playbackRate.value);
  var f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = Math.min(19000, 160 * Math.pow(115, P.filt));
  var g = ctx.createGain();
  var pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if(pan) pan.pan.value = P.pan;
  var portion = (bornes.fin - bornes.debut) / buf.sampleRate;
  var duree = partie < 0 ? Math.max(0.03, (buf.duration / src.playbackRate.value) * Math.max(0.05, P.dec))
    : portion / src.playbackRate.value * Math.max(0.05, P.dec);
  var pic = P.niv * (typeof velocite === "number" ? Math.max(0,Math.min(1,velocite)) : (acc ? 1 : 0.72));
  g.gain.setValueAtTime(0.0001, t);
  var attaque = Math.min(0.002, duree * 0.1);
  g.gain.linearRampToValueAtTime(Math.max(0.0001, pic), t + attaque);
  g.gain.setValueAtTime(Math.max(0.0001, pic), t + Math.max(attaque, duree - Math.min(0.02, duree * 0.2)));
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  src.connect(f); f.connect(g);
  if(pan){ g.connect(pan); pan.connect(pasVoie(n.e)); } else g.connect(pasVoie(n.e));
  if(partie < 0){ src.start(t); src.stop(t + duree + 0.05); }
  else {
    // La durée de start est exprimée dans le tampon, avant transposition.
    src.start(t, bornes.debut / buf.sampleRate, portion * Math.max(0.05, P.dec));
    src.stop(t + duree);
  }
}

function scheduleStk(i, t){
  var direct = ctx && !ctx.startRendering;
  if(direct){
    suivreMotifsStk();
    if(STK.song && lectureMotifsStk() && STK.chaine.length){
      if(i === 0){
        STK.chaineProgramme = (STK.chaineProgramme + 1) % STK.chaine.length;
        STK.chaineContexte = ctx; STK.chaineTemps = Math.max(t, STK.chaineTemps);
        STK.chaineDeparts.push({t:STK.chaineTemps, motif:STK.chaine[STK.chaineProgramme], position:STK.chaineProgramme});
      }
      t = Math.max(t, STK.chaineTemps);
    }
    if(i === 0 && lectureMotifsStk() && !STK.song && !STK.depart && STK.attente !== null){
      STK.depart = {t:t, motif:STK.attente}; STK.attente = null; majStk();
    }
    if(STK.depart) t = Math.max(t, STK.depart.t);
  }
  var CHARGE_N = ouvrirPas();
  var numero = direct && STK.song && STK.chaineProgramme >= 0 ? STK.chaine[STK.chaineProgramme]
    : direct && STK.depart ? STK.depart.motif : STK.cur;
  var m = STK.motifs[numero];
  if(i >= m.last) return;
  for(var k=0;k<STK_PISTES;k++){
    if(!(m.pas[k] & (1 << i))) continue;
    if(!passeStk(k)) continue;
    CHARGE_N++, voixStk(t, k, (i % 4) === 0, m.tranches[k][i], m.notes[k][i]);
  }
  if(!cache) queue.push({i:i, t:t});
  attenuerVoie("stk", CHARGE_N, t);
}
function beatStk(i){
  suivreMotifsStk();
  STK.pos = i;
  var b = document.querySelectorAll("#stk-pads .sb");
  for(var j=0;j<b.length;j++) b[j].classList.toggle("cur", j === i && (typeof STK_MODE === "undefined" || STK_MODE !== "ptn"));
}
function arretStk(){
  var entendu = validerDepartStk(); viderAttenteStk(); viderLectureChaineStk();
  if(entendu) memStk();
  if(STK.noeuds && STK.noeuds.ctx === ctx){
    try{ debrancherTout(STK.noeuds); }catch(e){}
  }
  STK.noeuds = null; beatStk(-1);
  if(S.modele === "stk") majStk();
}
var MACHINE_STK = {schedule:scheduleStk, beat:beatStk, arret:arretStk,
                   longueur:function(){ return motifStkCur().last; }};

function memStk(){
  if(validerDepartStk()) majStk();
  memoire.stk = {clavierMidi:STK.clavierMidi, song:STK.song, quantifie:STK.quantifie, cur:STK.cur, sel:STK.sel, chaine:STK.chaine.slice(),
    pistes:STK.pistes.map(function(P){
      return {ech:P.ech, type:P.type, note:P.note, slice:P.slice, tranche:P.tranche, niv:P.niv, pan:P.pan, tune:P.tune, dec:P.dec, filt:P.filt, muet:P.muet};
    }),
    motifs:STK.motifs.map(function(m){ return {pas:m.pas.slice(), tranches:m.tranches.map(function(t){ return t.slice(); }), notes:m.notes.map(function(n){ return n.slice(); }), last:m.last}; })};
  sauverMachine("stk");
}
function nombreStk(v, min, max, repli){
  return typeof v === "number" && isFinite(v) ? Math.max(min, Math.min(max, v)) : repli;
}
function chargerStk(){
  viderAttenteStk(); viderLectureChaineStk(); STK.song = false; STK.chainePos = 0; STK.chaineSel = -1;
  var m = memLire("stk");
  if(!m || typeof m !== "object" || Array.isArray(m)) return;
  STK.clavierMidi = m.clavierMidi === true;
  STK.quantifie = m.quantifie === true;
  STK.cur = Math.floor(nombreStk(m.cur, 0, STK_MOTIFS - 1, 0));
  STK.sel = Math.floor(nombreStk(m.sel, 0, STK_PISTES - 1, 0));
  STK.chaine = Array.isArray(m.chaine) ? m.chaine.filter(function(x){ return Number.isInteger(x) && x >= 0 && x < STK_MOTIFS; }).slice(0,256) : [];
  for(var i=0;i<STK_PISTES;i++){
    var P = pisteStk(i), o = Array.isArray(m.pistes) ? m.pistes[i] : null;
    if(o && typeof o === "object"){
      if(typeof o.ech === "string" && /^[bu][a-zA-Z0-9_-]{1,100}$/.test(o.ech)) P.ech = o.ech;
      P.type = o.type === "instrument" ? "instrument" : "shots"; P.note = noteInstrumentStk(o.note);
      P.slice = o.slice === true; P.tranche = Math.max(0, numeroTrancheStk(o.tranche));
      ["niv","tune","dec","filt"].forEach(function(k){ P[k] = nombreStk(o[k], 0, 1, P[k]); });
      P.pan = nombreStk(o.pan, -1, 1, P.pan); P.muet = o.muet === true;
    }
    STK.pistes[i] = P;
  }
  for(var j=0;j<STK_MOTIFS;j++){
    var motif = motifStk(), ancien = Array.isArray(m.motifs) ? m.motifs[j] : null;
    if(ancien && typeof ancien === "object"){
      motif.last = Math.floor(nombreStk(ancien.last, 1, 16, 16));
      for(var k=0;k<STK_PISTES;k++){
        var bits = Array.isArray(ancien.pas) ? ancien.pas[k] : 0;
        motif.pas[k] = Number.isInteger(bits) ? bits & 65535 : 0;
        var tr = Array.isArray(ancien.tranches) ? ancien.tranches[k] : null;
        if(Array.isArray(tr)) for(var n=0;n<16;n++) motif.tranches[k][n] = numeroTrancheStk(tr[n]);
        var nt = Array.isArray(ancien.notes) ? ancien.notes[k] : null;
        if(Array.isArray(nt)) for(var p=0;p<16;p++) motif.notes[k][p] = noteInstrumentStk(nt[p]);
      }
    }
    STK.motifs[j] = motif;
  }
  STK.song = m.song === true && chaineValideStk();
}

/* ---------- la façade du KAOSS PAD ---------- */
function majPriseKp(){
  var bt = document.getElementById("kp-resample"), et = document.getElementById("kp-prise-etat");
  if(!bt || !et) return;
  var r = KP.prise, rec = r && r.phase === "enregistrement";
  bt.textContent = rec ? "STOP REC" : (r ? "PATIENTER…" : "RESAMPLE");
  bt.disabled = !!r && !rec;
  bt.classList.toggle("on", !!rec);
  bt.setAttribute("aria-pressed", String(!!rec));
  document.getElementById("kp-annuler-prise").disabled = !r;
  var texte = !r ? KP.priseEtat : (rec
    ? "REC · " + Math.min(8, Math.floor((performance.now() - r.debut) / 1000)) + " / 8 S"
    : (r.phase === "preparation" ? "PRÉPARATION AUDIO…" : "CONVERSION DE LA PRISE…"));
  if(et.textContent !== texte) et.textContent = texte;
  et.title = texte;
}
function majTranchesKp(){
  var b = KP.banques[KP.sel], grille = document.getElementById("kp-tranches");
  if(!grille) return;
  var etaitCache = grille.hidden;
  var bt = document.getElementById("kp-slice"), index = numeroTrancheKp(b.tranche);
  bt.textContent = b.slice ? "SLICE : OUI" : "SLICE : NON";
  bt.classList.toggle("on", b.slice);
  bt.setAttribute("aria-pressed", String(b.slice));
  document.getElementById("kp-tranche-etat").textContent = "BANQUE " + "ABCD"[KP.sel] + " · " +
    (b.slice ? "TRANCHE " + (index + 1) + "/8" : "SON ENTIER");
  grille.hidden = !b.slice;
  grille.setAttribute("aria-label", "Tranches de la banque " + "ABCD"[KP.sel]);
  if(!grille.childNodes.length){
    for(var i=0;i<8;i++) (function(j){
      var p = document.createElement("button"); p.textContent = String(j + 1);
      p.addEventListener("click", function(){
        frapperTrancheKp(KP.sel, j); majKp(); memKp(); H.inter();
      });
      grille.appendChild(p);
    })(i);
  }
  var buf = ES.buf[b.ech];
  for(var k=0;k<8;k++){
    var bouton = grille.childNodes[k], bornes = buf ? bornesTrancheKp(buf, k) : null;
    bouton.disabled = !!bornes && bornes.fin <= bornes.debut;
    bouton.classList.toggle("on", k === index);
    bouton.setAttribute("aria-pressed", String(k === index));
    bouton.setAttribute("aria-label", "Jouer la tranche " + (k + 1) + " de la banque " + "ABCD"[KP.sel]);
  }
  if(etaitCache !== grille.hidden && S.modele === "kp") fit();
}
function majTempoKp(){
  var e = document.getElementById("kp-tempo");
  if(!e) return;
  var ext = tempoExterneKp(), texte = Math.round(S.bpm) + " BPM" + (ext ? " · MIDI" : "");
  if(e.textContent !== texte) e.textContent = texte;
  ["kp-tap", "kp-tempo-moins", "kp-tempo-plus"].forEach(function(id){
    var b = document.getElementById(id);
    b.disabled = !!ext;
    b.title = ext ? "Tempo piloté par l'horloge MIDI suivie" : "Tempo commun : 40 à 220 BPM";
  });
}
function majPavKp(){
  var pav = document.getElementById("kp-pav"), pt = document.getElementById("kp-point");
  if(!pav || !pt) return;
  pav.classList.toggle("vu", KP.touche || KP.tenu || KP.rejoue);
  pt.style.left = (KP.x * 100) + "%";
  pt.style.top = ((1 - KP.y) * 100) + "%";     /* Y monte vers le haut, comme un graphe */
}
function majTraceKp(){
  var t = document.getElementById("kp-trace");
  if(!t) return;
  if(!KP.motion.length){ t.innerHTML = ""; return; }
  /* On ne dessine qu'un point sur deux au-delà de soixante : au-delà la trace
     devient une tache et ne dit plus rien. */
  var pas = KP.motion.length > 60 ? 2 : 1, h = "";
  for(var i=0;i<KP.motion.length;i+=pas){
    var m = KP.motion[i];
    /* v132 : le geste vient de la mémoire ; on n'écrit que des nombres */
    var gx = Math.max(0, Math.min(1, +m[0] || 0)), gy = Math.max(0, Math.min(1, +m[1] || 0));
    h += '<span style="left:' + (gx*100) + '%;top:' + ((1-gy)*100) + '%"></span>';
  }
  t.innerHTML = h;
}
function majKp(){
  var b = document.getElementById("kp-banques");
  if(!b) return;
  if(!b.childNodes.length){
    ["A","B","C","D"].forEach(function(n, k){
      var e = document.createElement("button");
      e.innerHTML = n + "<em></em>";
      e.addEventListener("click", function(){
        KP.sel = k;
        frapperBanqueKp(k);
        majKp(); memKp(); H.inter();
      });
      b.appendChild(e);
    });
  }
  var bs = b.childNodes;
  for(var i=0;i<4;i++){
    bs[i].classList.toggle("on", KP.banques[i].on);
    bs[i].style.boxShadow = (KP.sel === i) ? "inset 0 0 0 2px #e8344a" : "none";
    var mode = KP.banques[i].mode === "one" ? "ONE SHOT" : "LOOP";
    bs[i].querySelector("em").textContent = mode + " · " +
      (KP.banques[i].slice ? "S" + (numeroTrancheKp(KP.banques[i].tranche) + 1) + " · " : "") +
      nomEch(KP.banques[i].ech);
    bs[i].setAttribute("aria-pressed", String(KP.banques[i].on));
    bs[i].setAttribute("aria-label", "Banque " + "ABCD"[i] + " · " + mode + " · " + nomEch(KP.banques[i].ech) +
      (KP.banques[i].slice ? " · tranche " + (numeroTrancheKp(KP.banques[i].tranche) + 1) + "/8" : " · son entier"));
  }
  document.getElementById("kp-selection").textContent = "BANQUE " + "ABCD"[KP.sel];
  var bm = document.getElementById("kp-mode");
  bm.textContent = KP.banques[KP.sel].mode === "one" ? "ONE SHOT" : "LOOP";
  bm.classList.toggle("on", KP.banques[KP.sel].mode === "one");
  bm.setAttribute("aria-label", "Mode banque " + "ABCD"[KP.sel] + " : " + bm.textContent + ", toucher pour changer");
  document.getElementById("kp-stop-banque").textContent = "STOP " + "ABCD"[KP.sel];
  var son = KP.banques[KP.sel].ech, etatSon = "";
  if(!ES.buf[son]) etatSon = typeof ES_CHARGES !== "undefined" && ES_CHARGES[son]
    ? " · chargement…" : " · indisponible";
  document.getElementById("kp-son-nom").textContent = nomEch(son) + etatSon;
  var v = document.getElementById("kp-val"), l = document.getElementById("kp-lab");
  if(v){ v.textContent = KP_EFFETS[KP.fx][1]; l.textContent = KP_EFFETS[KP.fx][2]; }
  [["kp-hold", KP.tenu], ["kp-motion", KP.enregistre], ["kp-rejoue", KP.rejoue],
   ["kp-mute", KP.muet], ["kp-play", S.run]].forEach(function(x){
    var e = document.getElementById(x[0]);
    if(e) e.classList.toggle("on", !!x[1]);
  });
  var joue = KP.banques.some(function(x){ return x.on; });
  var et = document.getElementById("kp-etat");
  if(et && !joue) et.textContent = "Allumez une banque A à D : c'est elle qui fait le son.";
  else if(et) et.textContent = KP.enregistre
    ? "Le geste s'enregistre pendant la lecture. Retouchez PAD MOTION pour arrêter."
    : (KP.rejoue ? "Le geste tourne en boucle, calé sur le tempo."
    : (KP.tenu ? "HOLD : l'effet reste où le doigt l'a laissé."
               : "Touchez le pavé : l'effet suit le doigt."));
  majPavKp(); majTraceKp(); majTempoKp(); majTranchesKp(); majPriseKp();
}
function activerKp(){
  stop();
  KP.taps = [];
  audioInit(); banqueEs(); chargerEchs();
  bibLire();
  chargerKp();
  poserMachine("kp");
  actif = document.getElementById("unit-kp");
  MACHINE = MACHINE_KP;
  S.modele = "kp";
  if(ctx) noeudsKp();
  document.getElementById("kp-prof").value = KP.prof;
  majKp();
  save(); fit();
}
(function pavKp(){
  var pav = document.getElementById("kp-pav");
  var prise = null;
  function poser(e){
    var r = pav.getBoundingClientRect();
    KP.x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    KP.y = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
    appliquerKp(); majPavKp();
    var l = document.getElementById("kp-lab");
    if(l) l.textContent = "X " + Math.round(KP.x*100) + "  ·  Y " + Math.round(KP.y*100);
  }
  pav.addEventListener("pointerdown", function(e){
    audioInit(); noeudsKp();
    prise = e.pointerId; pav.setPointerCapture(e.pointerId);
    KP.touche = true; KP.rejoue = false;
    poser(e); majKp(); H.cran();
    e.preventDefault(); e.stopPropagation();
  });
  pav.addEventListener("pointermove", function(e){
    if(prise !== e.pointerId) return;
    poser(e);
    e.preventDefault(); e.stopPropagation();
  });
  function lacher(e){
    if(prise !== e.pointerId) return;
    prise = null; KP.touche = false;
    /* Sans HOLD, l'effet meurt en même temps que le doigt : c'est ce qui rend
       cette machine vivante plutôt que réglable. */
    appliquerKp(); majKp();
  }
  pav.addEventListener("pointerup", lacher);
  pav.addEventListener("pointercancel", lacher);
})();
document.getElementById("kp-hold").addEventListener("click", function(){
  KP.tenu = !KP.tenu; appliquerKp(); majKp(); H.inter();
});
document.getElementById("kp-motion").addEventListener("click", function(){
  if(KP.enregistre) terminerGesteKp();
  else { KP.enregistre = true; KP.motion = []; KP.rejoue = false; }
  appliquerKp();
  majKp(); H.inter();
});
document.getElementById("kp-rejoue").addEventListener("click", function(){
  if(!KP.motion.length){ signal("AUCUN GESTE ENREGISTRÉ"); return; }
  terminerGesteKp();
  KP.rejoue = !KP.rejoue; KP.enregistre = false;
  if(KP.rejoue) KP.mpos = 0;          /* chaque relecture repart du début du geste */
  appliquerKp(); majKp(); H.inter();
});
document.getElementById("kp-mute").addEventListener("click", function(){
  KP.muet = !KP.muet; appliquerKp(); majKp(); H.inter();
});
document.getElementById("kp-play").addEventListener("click", function(){
  if(S.run) stop(); else start();
  majKp(); H.start();
});
document.getElementById("kp-tap").addEventListener("click", function(){
  tapTempoKp(); H.cran();
});
document.getElementById("kp-tempo-moins").addEventListener("click", function(){
  ajusterTempoKp(-1); H.cran();
});
document.getElementById("kp-tempo-plus").addEventListener("click", function(){
  ajusterTempoKp(1); H.cran();
});
document.getElementById("kp-son").addEventListener("click", function(){
  /* Le son suivant de la banque, pour la banque choisie. Si elle joue, on
     relance sa boucle aussitôt pour l'entendre sans avoir à la rallumer. */
  banqueEs();
  var B = KP.banques[KP.sel];
  var i = /^b\d+$/.test(B.ech) ? +B.ech.slice(1) : -1;
  affecterSonKp(KP.sel, "b" + ((i + 1) % ES_BANQUE.length));
  H.cran();
});
document.getElementById("kp-bib").addEventListener("click", function(){
  BIB.onglet = 0; BIB.cible = {machine:"kp", partie:KP.sel};
  ouvrirBib(); H.inter();
});
document.getElementById("kp-resample").addEventListener("click", function(){
  if(KP.prise) terminerPriseKp(); else demarrerPriseKp();
  H.inter();
});
document.getElementById("kp-annuler-prise").addEventListener("click", function(){
  annulerPriseKp(); H.inter();
});
window.addEventListener("pagehide", function(){ annulerPriseKp(); });
document.addEventListener("visibilitychange", function(){
  if(document.hidden) annulerPriseKp();
});
document.getElementById("kp-selection").addEventListener("click", function(){
  KP.sel = (KP.sel + 1) % 4;                    /* choisir sans déclencher ni couper */
  majKp(); memKp(); H.cran();
});
document.getElementById("kp-mode").addEventListener("click", function(){
  modeBanqueKp(KP.sel, KP.banques[KP.sel].mode === "one" ? "loop" : "one");
  majKp(); memKp(); H.inter();
});
document.getElementById("kp-slice").addEventListener("click", function(){
  decouperBanqueKp(KP.sel, !KP.banques[KP.sel].slice);
  majKp(); memKp(); H.inter();
});
document.getElementById("kp-stop-banque").addEventListener("click", function(){
  arreterBanqueKp(KP.sel); majKp(); H.inter();
});
document.getElementById("kp-stop-tout").addEventListener("click", function(){
  toutArreterKp(); majKp(); H.inter();
});
document.getElementById("kp-fx").addEventListener("click", function(){
  KP.fx = (KP.fx + 1) % KP_EFFETS.length;
  appliquerKp(); majKp(); memKp(); H.cran();
});
document.getElementById("kp-effacer").addEventListener("click", function(){
  KP.motion = []; KP.rejoue = false; KP.enregistre = false; KP.mpos = 0;
  appliquerKp(); memKp(); majKp(); H.inter();
});
document.getElementById("kp-prof").addEventListener("input", function(){
  KP.prof = parseFloat(this.value);
  appliquerKp(); memKp();
});

/* ---------- la façade de la MC-101 ---------- */
function nomNoteMc(n){
  var N = ["DO","DO#","RÉ","RÉ#","MI","FA","FA#","SOL","SOL#","LA","LA#","SI"];
  return N[((n % 12) + 12) % 12] + (n >= 12 ? "+" : "");
}
function majClipsMc(){
  var zone = document.getElementById("mc-clips");
  if(!zone) return;
  if(!zone.childNodes.length){
    for(var i=0;i<MC_CLIPS;i++) (function(k){
      var bt = document.createElement("button"); bt.type = "button";
      bt.innerHTML = "CLIP " + (k + 1) + "<em></em>";
      bt.addEventListener("click", function(){ choisirClipMc(k); H.cran(); });
      zone.appendChild(bt);
    })(i);
  }
  var P = pisteMcSel();
  zone.setAttribute("aria-label", "Clips de la piste " + (MC.sel + 1));
  for(var j=0;j<MC_CLIPS;j++){
    var nb = P.looper ? (P.boucles[j] ? 1 : 0) : P.clips[j].filter(function(n){ return n >= 0; }).length;
    var b = zone.childNodes[j];
    var prochain = MC.depart ? MC.depart.clips[MC.sel] : MC.attente[MC.sel];
    var enAttente = prochain === j && P.clip !== j;
    b.classList.toggle("sel", P.clip === j); b.classList.toggle("plein", nb > 0);
    b.classList.toggle("attente", enAttente); b.disabled = !!MC.depart;
    b.querySelector("em").textContent = enAttente ? (MC.depart ? "IMMINENT" : "EN ATTENTE") : (nb ? (P.looper ? "BOUCLE" : nb + "/16 PAS") : "VIDE");
    b.setAttribute("aria-pressed", String(P.clip === j));
    b.setAttribute("aria-label", "Clip " + (j + 1) + " de la piste " + (MC.sel + 1) + " · " + (P.looper ? (nb ? "boucle" : "vide") : nb + " pas actifs") + (enAttente ? " · en attente" : ""));
  }
  var scenes = document.getElementById("mc-scenes");
  if(!scenes.childNodes.length){
    for(var s=0;s<MC_SCENES;s++) (function(k){
      var bt = document.createElement("button"); bt.type = "button";
      bt.innerHTML = "SCÈNE " + (k + 1) + "<em></em>";
      bt.addEventListener("click", function(){
        if(MC.memoScene) memoriserSceneMc(k); else choisirSceneMc(k);
        H.cran();
      });
      scenes.appendChild(bt);
    })(s);
  }
  var demandes = [];
  for(var p=0;p<MC_PISTES;p++){
    var suite = MC.depart ? MC.depart.clips[p] : MC.attente[p];
    if(suite !== null && suite !== MC.pistes[p].clip) demandes.push("P" + (p + 1) + " → C" + (suite + 1));
  }
  for(var n=0;n<MC_SCENES;n++){
    var combinaison = MC.scenes[n];
    var choisi = MC.pistes.every(function(piste, k){ return piste.clip === combinaison[k]; });
    var prevu = demandes.length > 0 && MC.pistes.every(function(piste, k){
      var futur = MC.depart ? MC.depart.clips[k] : MC.attente[k];
      return (futur === null ? piste.clip : futur) === combinaison[k];
    });
    var scene = scenes.childNodes[n];
    scene.classList.toggle("sel", choisi); scene.classList.toggle("attente", prevu);
    scene.classList.toggle("ecriture", MC.memoScene);
    scene.disabled = !!MC.depart; scene.setAttribute("aria-pressed", String(choisi));
    scene.querySelector("em").textContent = resumeSceneMc(combinaison);
    scene.setAttribute("aria-label", (MC.memoScene ? "Mémoriser dans la scène " : "Scène ") + (n + 1) + " : " +
      combinaison.map(function(k, p){ return "piste " + (p + 1) + " clip " + (k + 1); }).join(", "));
  }
  var memoriser = document.getElementById("mc-memoriser-scene");
  memoriser.disabled = !!MC.depart || demandes.length > 0;
  memoriser.classList.toggle("on", MC.memoScene);
  memoriser.setAttribute("aria-pressed", String(MC.memoScene));
  document.getElementById("mc-retablir-scenes").disabled = !!MC.depart || demandes.length > 0 || !scenesPersonnaliseesMc();
  document.getElementById("mc-scenes-etat").textContent = MC.memoScene
    ? "À MÉMORISER · " + resumeSceneMc(MC.pistes.map(function(P){ return P.clip; }))
    : "CLIPS DES PISTES 1 · 2 · 3 · 4";
  var mode = document.getElementById("mc-quantifie");
  mode.textContent = MC.quantifie ? "MESURE" : P.looper ? "MESURE · LOOP" : "DIRECT";
  mode.classList.toggle("on", MC.quantifie); mode.disabled = !!MC.depart;
  mode.setAttribute("aria-pressed", String(MC.quantifie));
  document.getElementById("mc-annuler").disabled = !!MC.depart || (!demandes.length && !MC.memoScene);
  document.getElementById("mc-clip").disabled = !!MC.depart;
  document.getElementById("mc-lancement-etat").textContent = MC.depart ? "DÉPART IMMINENT · " + demandes.join(" / ")
    : demandes.length ? "PROCHAINE MESURE · " + demandes.join(" / ")
    : MC.memoScene ? "TOUCHEZ LA SCÈNE À MÉMORISER"
    : P.looper ? "BOUCLES ET SCÈNES AU DÉBUT DE LA MESURE" : MC.quantifie ? "CLIPS ET SCÈNES AU DÉBUT DE LA MESURE" : "CLIPS ET SCÈNES EN DIRECT";
  document.getElementById("mc-sample").disabled = P.type !== "synth" || (P.looper && S.run);
  document.getElementById("mc-synthe").disabled = (!P.ech && !P.looper) || (P.looper && S.run);
  document.getElementById("mc-onde").disabled = P.type !== "synth" || !!P.ech || P.looper;
  var source = P.looper ? P.boucles[P.clip] : P.ech;
  document.getElementById("mc-source").textContent = P.type === "drum" ? "KIT RYTHMIQUE" :
    source ? (ES.buf[source] ? nomBib(source) : "SON ABSENT · " + source) : P.looper ? "CLIP SANS BOUCLE" : "SYNTHÉ";
  var loop = document.getElementById("mc-looper");
  loop.textContent = P.looper ? "LOOPER : OUI" : "LOOPER : NON";
  loop.disabled = P.type !== "synth" || S.run; loop.setAttribute("aria-pressed", String(P.looper));
  var copie = MC.copie, coller = document.getElementById("mc-coller");
  coller.disabled = !copie || copie.type !== P.type || !!copie.looper !== P.looper || (P.looper && S.run);
  coller.title = !copie ? "Copiez d'abord un clip" : (copie.type !== P.type
    ? "Choisissez une piste du même type que la copie" : "Coller les seize pas dans le clip choisi");
  document.getElementById("mc-copie-etat").textContent = !copie ? "AUCUNE COPIE"
    : "COPIE P" + (copie.piste + 1) + " / C" + (copie.clip + 1) + " · " + (copie.looper ? "BOUCLE" : copie.type === "drum" ? "RYTHME" : "MÉLODIE");
}
function majMc(){
  if(validerDepartMc()) memMc();
  var dp = document.getElementById("mc-pads");
  if(!dp) return;
  if(!dp.childNodes.length){
    for(var i=0;i<16;i++) (function(k){
      var b = document.createElement("button");
      b.className = "mb"; b.textContent = String(k + 1);
      b.addEventListener("click", function(){ padMc(k); });
      dp.appendChild(b);
    })(i);
    var dt = document.getElementById("mc-trks");
    for(var t=0;t<MC_PISTES;t++) (function(k){
      var b = document.createElement("button");
      b.className = "mt";
      b.innerHTML = "<b>" + (k + 1) + "</b><em></em>";
      b.addEventListener("click", function(){
        if(MC.sel === k) MC.pistes[k].muet = !MC.pistes[k].muet;
        else MC.sel = k;
        majMc(); majKnobsMc(); memMc(); H.cran();
      });
      dt.appendChild(b);
    })(t);
  }
  var P = pisteMcSel(), clip = clipMcCur(MC.sel), bs = dp.childNodes;
  for(var k2=0;k2<16;k2++){
    bs[k2].disabled = P.looper;
    bs[k2].classList.toggle("on", !P.looper && clip[k2] >= 0);
    bs[k2].classList.toggle("cur", S.run && MC.pos === k2);
    bs[k2].textContent = !P.looper && clip[k2] >= 0
      ? (P.type === "drum" ? ["GC","CC","CH","CL"][clip[k2] % 4] : nomNoteMc(clip[k2]))
      : String(k2 + 1);
  }
  var ts = document.getElementById("mc-trks").childNodes;
  for(var t2=0;t2<MC_PISTES;t2++){
    ts[t2].classList.toggle("sel", t2 === MC.sel);
    ts[t2].classList.toggle("muet", MC.pistes[t2].muet);
    ts[t2].querySelector("em").textContent =
      MC.pistes[t2].type === "drum" ? "RYTHME" : MC.pistes[t2].looper ? "LOOPER" : MC.pistes[t2].ech ? "SAMPLE" : MC.pistes[t2].onde.slice(0, 4).toUpperCase();
  }
  var c = document.getElementById("mc-clip");
  if(c) c.textContent = "CLIP " + (P.clip + 1);
  var sc = document.getElementById("mc-scat");
  if(sc) sc.classList.toggle("on", MC.scatOn);
  var sn = document.getElementById("mc-scat-nom");
  if(sn) sn.textContent = MC_SCATTER[MC.scatType][0];
  var pl = document.getElementById("mc-play");
  if(pl) pl.classList.toggle("on", S.run);
  var lv = document.getElementById("mc-val"), ll = document.getElementById("mc-lab");
  if(lv){
    lv.textContent = MC.scatOn ? MC_SCATTER[MC.scatType][0].toUpperCase()
      : (P.type === "drum" ? ["GROSSE","CAISSE","CHARLEY","CLAP"][MC.note % 4]
                           : nomNoteMc(MC_GAMME[MC.note % 16]));
    ll.textContent = MC.scatOn ? "SCATTER" : ("PISTE " + (MC.sel + 1));
  }
  var e = document.getElementById("mc-etat");
  if(e) e.textContent = P.looper ? "Boucle d’une mesure · tempo et hauteur liés · SCATTER inactif" : MC.scatOn
    ? MC_SCATTER[MC.scatType][1] + " · le motif n'est pas modifié"
    : "Le potard NOTE choisit ce qu'on écrit ; les pads posent ou retirent.";
  majClipsMc();
}
function padMc(k){
  if(pisteMcSel().looper) return;
  audioInit();
  suivreClipsMc();
  var P = pisteMcSel(), clip = clipMcCur(MC.sel);
  var note = P.type === "drum" ? (MC.note % 4) : MC_GAMME[MC.note % 16];
  if(clip[k] === note) clip[k] = -1;          /* retoucher le même retire */
  else { clip[k] = note; voixMc(maintenantAudio() + 0.005, MC.sel, note, 1); }
  memMc(); majMc(); H.cran();
}
function knobMc(nom, etiq, min, max, get, set){
  return knobEm("mc-k-" + nom, {min:min, max:max,
    get:get || function(){ return pisteMcSel()[nom]; },
    set:function(v){
      if(pisteMcSel().looper && (nom === "note" || nom === "dec")) return;
      if(set) set(v); else pisteMcSel()[nom] = v;
      var e = document.getElementById("mc-etat");
      if(e) e.textContent = etiq + " " + Math.round(v * 100);
      majMc(); memMc();
    }});
}
var kMcCut  = knobMc("cut",  "FILTRE", 0, 1);
var kMcDec  = knobMc("dec",  "DÉCLIN", 0, 1);
var kMcNiv  = knobMc("niv",  "NIVEAU", 0, 1);
var kMcNote = knobMc("note", "NOTE", 0, 15,
  function(){ return MC.note; }, function(v){ MC.note = Math.round(v); });
function majKnobsMc(){ [kMcCut, kMcDec, kMcNiv, kMcNote].forEach(function(k){ k.maj(); }); }

function activerMc(){
  stop();
  audioInit(); banqueEs(); chargerEchs();
  chargerMc();
  poserMachine("mc");
  actif = document.getElementById("unit-mc");
  MACHINE = MACHINE_MC;
  S.modele = "mc";
  if(ctx) noeudsMc();
  document.getElementById("mc-scat-prof").value = MC.scatProf;
  majMc(); majKnobsMc();
  save(); fit();
}
document.getElementById("mc-play").addEventListener("click", function(){
  if(S.run) stop(); else start();
  majMc(); H.start();
});
document.getElementById("mc-scat").addEventListener("click", function(){
  MC.scatOn = !MC.scatOn;
  majMc(); memMc(); H.inter();
});
document.getElementById("mc-scat-type").addEventListener("click", function(){
  MC.scatType = (MC.scatType + 1) % MC_SCATTER.length;
  majMc(); memMc(); H.cran();
});
document.getElementById("mc-scat-prof").addEventListener("input", function(){
  MC.scatProf = parseFloat(this.value);
  memMc();
});
document.getElementById("mc-clip").addEventListener("click", function(){
  suivreClipsMc();
  var prochain = MC.attente[MC.sel];
  choisirClipMc(((prochain === null ? pisteMcSel().clip : prochain) + 1) % MC_CLIPS); H.cran();
});
document.getElementById("mc-quantifie").addEventListener("click", function(){
  modeClipsMc(!MC.quantifie); H.inter();
});
document.getElementById("mc-annuler").addEventListener("click", function(){
  annulerClipsMc(); H.inter();
});
document.getElementById("mc-memoriser-scene").addEventListener("click", function(){
  armerSceneMc(); H.inter();
});
document.getElementById("mc-retablir-scenes").addEventListener("click", function(){
  retablirScenesMc(); H.inter();
});
document.getElementById("mc-copier").addEventListener("click", function(){
  copierClipMc(); H.inter();
});
document.getElementById("mc-coller").addEventListener("click", function(){
  collerClipMc(); H.inter();
});
document.getElementById("mc-looper").addEventListener("click", modeLooperMc);
document.getElementById("mc-sample").addEventListener("click", function(){
  if(pisteMcSel().type !== "synth") return;
  BIB.onglet = 0; BIB.cible = {machine:"mc", partie:MC.sel - 1};
  ouvrirBib(); H.inter();
});
document.getElementById("mc-synthe").addEventListener("click", retirerSonMc);
document.getElementById("mc-onde").addEventListener("click", function(){
  var P = pisteMcSel();
  if(P.type === "drum"){ signal("PISTE RYTHMIQUE · FORME D'ONDE FIXE"); return; }
  var O = ["sawtooth","square","triangle","sine"];
  P.onde = O[(O.indexOf(P.onde) + 1) % O.length];
  majMc(); memMc(); H.cran();
});
document.getElementById("mc-clear").addEventListener("click", function(){
  suivreClipsMc();
  if(pisteMcSel().looper){
    if(S.run){ signal("ARRÊTEZ PLAY POUR EFFACER UNE BOUCLE"); return; }
    if(window.confirm("Retirer la boucle de ce clip sans supprimer le son ?")){
      pisteMcSel().boucles[pisteMcSel().clip] = ""; memMc(); majMc();
    }
    return;
  }
  if(!window.confirm("Effacer le clip " + (pisteMcSel().clip + 1) +
                     " de la piste " + (MC.sel + 1) + " ?")) return;
  var c = clipMcCur(MC.sel);
  for(var i=0;i<16;i++) c[i] = -1;
  memMc(); majMc(); H.inter();
});

/* ---------- la façade de la SmplTrek ---------- */
var STK_MODE = "pas";       /* ce qu'écrivent les seize pads : pas ou motif */

/* L'écran : la forme d'onde de la piste choisie, et ses seize pas dessous.
   L'enveloppe se calcule directement sur le tampon — le son existe déjà, il
   n'y a rien à rendre. C'est ce qui rend cet écran gratuit, là où celui de
   l'enregistreur demandait un rendu par piste. */
function dessinerStk(){
  var cv = document.getElementById("stk-ecran");
  if(!cv) return;
  var g = cv.getContext("2d"), L = cv.width, H = cv.height;
  g.fillStyle = "#0a0a06"; g.fillRect(0, 0, L, H);
  var P = pisteStkSel(), buf = ES.buf[P.ech];
  var hOnde = H - 34;

  g.fillStyle = "#e8e04a";
  g.font = "600 11px 'Roboto Condensed',Arial";
  g.fillText("PISTE " + (STK.sel + 1) + "  ·  " + nomBib(P.ech), 8, 14);

  if(buf){
    if(STK.ondePour !== P.ech){
      STK.onde = enveloppeBuf(buf, 170);
      STK.ondePour = P.ech;
    }
    var env = STK.onde, mi = 22 + (hOnde - 22) / 2, demi = (hOnde - 26) / 2;
    g.fillStyle = "#c8c03a";
    for(var c=0;c<env.length;c++){
      var x = 8 + (c / env.length) * (L - 16);
      var h = Math.max(1, env[c] * demi);
      g.fillRect(x, mi - h, Math.max(1, (L - 16) / env.length - 0.5), h * 2);
    }
    g.fillStyle = "#4a4a28";
    g.fillRect(8, mi, L - 16, 1);
    if(P.slice){
      var largeur = (L - 16) / 8;
      g.fillStyle = "rgba(232,224,74,0.22)";
      g.fillRect(8 + P.tranche * largeur, 20, largeur, hOnde - 20);
      g.fillStyle = "#f6f6a0";
      for(var tr=0;tr<8;tr++){
        g.fillRect(8 + tr * largeur, 20, 1, hOnde - 20);
        g.fillText(String(tr + 1), 11 + tr * largeur, 32);
      }
    }
  } else {
    g.fillStyle = "#6a6a4a";
    g.fillText("aucun son", 8, 60);
  }

  /* Les seize pas, en bas de l'écran : on voit le motif sans quitter le son. */
  var m = motifStkCur(), y = H - 24;
  for(var i=0;i<16;i++){
    var xx = 8 + i * ((L - 16) / 16);
    var w = (L - 16) / 16 - 2;
    var actif2 = !!(m.pas[STK.sel] & (1 << i));
    g.fillStyle = (i === STK.pos) ? "#f6f6f0" : (actif2 ? "#e8e04a" : "#26261c");
    g.fillRect(xx, y, w, 16);
  }
}
/* L'enveloppe d'un tampon déjà chargé : crête par tranche. */
function enveloppeBuf(buf, cols){
  var d = buf.getChannelData(0), n = d.length, e = new Float32Array(cols);
  var par = n / cols;
  for(var i=0;i<cols;i++){
    var a = Math.floor(i * par), b = Math.min(n, Math.floor((i + 1) * par)), mx = 0;
    for(var j=a;j<b;j++){ var v = d[j] < 0 ? -d[j] : d[j]; if(v > mx) mx = v; }
    e[i] = mx;
  }
  return e;
}

function majTranchesStk(){
  var P = pisteStkSel(), grille = document.getElementById("stk-tranches");
  var cacheAvant = grille.hidden;
  grille.hidden = !P.slice;
  if(!grille.childNodes.length) for(var i=0;i<8;i++) (function(k){
    var b = document.createElement("button"); b.textContent = "TR " + (k + 1);
    b.addEventListener("click", function(){
      pisteStkSel().tranche = k;
      audioInit();
      if(ctx && passeStk(STK.sel)) voixStk(maintenantAudio() + 0.005, STK.sel, false, k);
      memStk(); majStk(); H.inter();
    });
    grille.appendChild(b);
  })(i);
  var buf = ES.buf[P.ech];
  for(var j=0;j<8;j++){
    var bt = grille.childNodes[j], bornes = buf ? bornesTrancheStk(buf,j) : null;
    bt.disabled = !bornes || bornes.fin <= bornes.debut;
    bt.classList.toggle("on", j === P.tranche);
    bt.setAttribute("aria-pressed", String(j === P.tranche));
    bt.setAttribute("aria-label", "Écouter et choisir la tranche " + (j + 1));
  }
  var mode = document.getElementById("stk-slice");
  mode.textContent = P.slice ? "SLICE : OUI" : "SLICE : NON";
  mode.setAttribute("aria-pressed", String(P.slice)); mode.classList.toggle("on", P.slice);
  document.getElementById("stk-source").textContent = buf ? nomBib(P.ech) : "SON ABSENT · " + P.ech;
  if(cacheAvant !== grille.hidden && S.modele === "stk") fit();
}
function majMidiStk(){
  var b = document.getElementById("stk-midi"), info = document.getElementById("stk-midi-info");
  if(!b || !info) return;
  b.textContent = STK.clavierMidi ? "MIDI : CLAVIER" : "MIDI : PISTES";
  b.classList.toggle("on", STK.clavierMidi); b.setAttribute("aria-pressed", String(STK.clavierMidi)); b.disabled = S.run;
  info.textContent = STK.clavierMidi ? (pisteStkSel().type !== "instrument" ? "CHOISISSEZ UNE PISTE INSTRUMENT" :
    "PISTE " + (STK.sel + 1) + " · CANAL " + (MIDI.canalSy + 1) + " · ORIGINE " + MIDI.base +
    " · NOTES " + Math.max(0,MIDI.base - 12) + "–" + Math.min(127,MIDI.base + 12)) : "UNE TOUCHE PAR PISTE · BASE " + MIDI.base;
}
function majInstrumentStk(){
  var P = pisteStkSel(), actif = P.type === "instrument";
  var mode = document.getElementById("stk-instrument"), choix = document.getElementById("stk-note");
  mode.textContent = actif ? "TYPE : INSTRUMENT" : "TYPE : SHOTS";
  mode.setAttribute("aria-pressed", String(actif)); mode.classList.toggle("on", actif); mode.disabled = S.run;
  if(!choix.options.length) for(var n=-12;n<=12;n++){
    var option = document.createElement("option"); option.value = String(n); option.textContent = nomHauteurStk(n); choix.appendChild(option);
  }
  choix.value = String(P.note); choix.disabled = !actif;
  document.getElementById("stk-ecouter").disabled = !ES.buf[P.ech] || !passeStk(STK.sel);
}
function majChaineStk(){
  if(typeof majExportStk === "function") majExportStk();
  var bt = document.getElementById("stk-chaine");
  bt.textContent = STK.song ? "CHAÎNE : OUI" : "CHAÎNE : NON";
  bt.classList.toggle("on", STK.song); bt.disabled = S.run || (!STK.song && !STK.chaine.length);
  bt.setAttribute("aria-pressed", String(STK.song));
  document.getElementById("stk-chaine-ajout").disabled = S.run || STK.chaine.length >= 256;
  document.getElementById("stk-chaine-ajout").textContent = "+ MOTIF " + (STK.cur + 1);
  document.getElementById("stk-chaine-retirer").disabled = S.run || !STK.chaine.length;
  document.getElementById("stk-chaine-vider").disabled = S.run || !STK.chaine.length;
  var liste = document.getElementById("stk-chaine-liste");
  var cle = STK.chaine.join(",");
  if(liste.dataset.chaine !== cle){
    var defilement = liste.scrollLeft; liste.textContent = ""; liste.dataset.chaine = cle;
    if(!STK.chaine.length) liste.textContent = "CHAÎNE VIDE · CHOISISSEZ UN MOTIF PUIS + MOTIF";
    STK.chaine.forEach(function(motif, k){
      if(k) liste.appendChild(document.createTextNode(" → "));
      var b = document.createElement("button"); b.textContent = String(motif + 1);
      b.setAttribute("aria-label", "Entrée " + (k + 1) + " : motif " + (motif + 1));
      b.addEventListener("click", function(){ choisirEntreeChaineStk(k); });
      liste.appendChild(b);
    });
    liste.scrollLeft = defilement;
  }
  var boutons = liste.querySelectorAll("button");
  boutons.forEach(function(b, k){
    b.disabled = S.run;
    b.classList.toggle("selection", k === STK.chaineSel);
    b.classList.toggle("lecture", STK.song && S.run && k === STK.chainePos);
    b.setAttribute("aria-pressed", String(k === STK.chaineSel));
  });
  if(liste.dataset.selection !== String(STK.chaineSel)){
    liste.dataset.selection = String(STK.chaineSel);
    var selection = boutons[STK.chaineSel];
    if(selection){
      var gauche = selection.getBoundingClientRect().left - liste.getBoundingClientRect().left;
      if(gauche < 0) liste.scrollLeft += gauche;
      else if(gauche + selection.offsetWidth > liste.clientWidth) liste.scrollLeft += gauche + selection.offsetWidth - liste.clientWidth;
    }
  }
  var edition = document.getElementById("stk-chaine-edition"), cacheAvant = edition.hidden;
  edition.hidden = !selectionChaineStkValide();
  document.getElementById("stk-chaine-gauche").disabled = S.run || STK.chaineSel <= 0;
  document.getElementById("stk-chaine-droite").disabled = S.run || STK.chaineSel >= STK.chaine.length - 1;
  document.getElementById("stk-chaine-dupliquer").disabled = S.run || STK.chaine.length >= 256;
  document.getElementById("stk-chaine-supprimer").disabled = S.run;
  document.getElementById("stk-chaine-selection").textContent = selectionChaineStkValide()
    ? "ÉDITION " + (STK.chaineSel + 1) + "/" + STK.chaine.length + " · MOTIF " + (STK.chaine[STK.chaineSel] + 1) : "";
  if(cacheAvant !== edition.hidden && S.modele === "stk") fit();
  var etat = document.getElementById("stk-chaine-etat");
  etat.textContent = STK.song ? (S.run ? "LECTURE " + (STK.chainePos + 1) + "/" + STK.chaine.length + " · MOTIF " + (STK.cur + 1)
    : "PRÊT · PLAY REPART DU DÉBUT") : STK.chaine.length + "/256 ENTRÉES · BOUCLE";
}
function majStk(){
  if(validerDepartStk()) memStk();
  var dp = document.getElementById("stk-pads");
  if(!dp) return;
  if(!dp.childNodes.length){
    for(var i=0;i<16;i++) (function(k){
      var b = document.createElement("button");
      b.className = "sb"; b.textContent = String(k + 1);
      b.addEventListener("click", function(){ padStk(k); });
      dp.appendChild(b);
    })(i);
    var dt = document.getElementById("stk-trks");
    for(var t=0;t<STK_PISTES;t++) (function(k){
      var b = document.createElement("button");
      b.className = "st";
      b.innerHTML = '<i></i><b>TRK ' + (k + 1) + '</b><em></em>';
      b.addEventListener("click", function(){
        if(STK.sel === k){ STK.pistes[k].muet = !STK.pistes[k].muet; }
        else STK.sel = k;
        STK.ondePour = "";
        majStk(); majKnobsStk(); memStk(); H.cran();
      });
      dt.appendChild(b);
    })(t);
  }
  var m = motifStkCur(), bs = dp.childNodes;
  for(var k2=0;k2<16;k2++){
    bs[k2].classList.toggle("on",
      STK_MODE === "ptn" ? (k2 === STK.cur) : !!(m.pas[STK.sel] & (1 << k2)));
    bs[k2].classList.toggle("cur", STK_MODE !== "ptn" && k2 === STK.pos);
    var tr = m.tranches[STK.sel][k2], actifPas = !!(m.pas[STK.sel] & (1 << k2));
    var hauteur = m.notes[STK.sel][k2], instr = pisteStkSel().type === "instrument";
    bs[k2].textContent = STK_MODE === "ptn" ? (k2 < STK_MOTIFS ? String(k2 + 1) : "·") :
      String(k2 + 1) + (pisteStkSel().slice && actifPas ? (tr >= 0 ? " T" + (tr + 1) : " ENT") : "") +
      (instr && actifPas ? " [" + (hauteur > 0 ? "+" : "") + hauteur + "]" : "");
    var suivant = STK.depart ? STK.depart.motif : STK.attente;
    bs[k2].classList.toggle("attente", STK_MODE === "ptn" && k2 === suivant);
    if(STK_MODE === "ptn" && k2 === suivant) bs[k2].textContent += " →";
    bs[k2].disabled = STK_MODE === "ptn" ? k2 >= STK_MOTIFS || !!STK.depart || (STK.song && S.run) : k2 >= m.last;
    bs[k2].setAttribute("aria-label", STK_MODE === "ptn" ? "Motif " + (k2 + 1) :
      "Pas " + (k2 + 1) + (actifPas ? (pisteStkSel().slice && tr >= 0 ? " · tranche " + (tr + 1) : " · son entier") + (instr ? " · " + nomHauteurStk(hauteur) : "") : " · vide"));
  }
  var ts = document.getElementById("stk-trks").childNodes;
  for(var t2=0;t2<STK_PISTES;t2++){
    var P = STK.pistes[t2];
    ts[t2].classList.toggle("sel", t2 === STK.sel);
    ts[t2].classList.toggle("muet", !passeStk(t2));
    ts[t2].querySelector("i").style.background = couleurCanal(t2);
    ts[t2].querySelector("em").textContent = (P.type === "instrument" ? "INST · " : "") + nomBib(P.ech);
  }
  var qm = document.getElementById("stk-quantifie");
  qm.textContent = STK.quantifie ? "FIN MOTIF" : "DIRECT";
  qm.classList.toggle("on", STK.quantifie); qm.disabled = !!STK.depart || STK.song;
  qm.setAttribute("aria-pressed", String(STK.quantifie));
  document.getElementById("stk-annuler").disabled = STK.attente === null || !!STK.depart;
  document.getElementById("stk-lancement-etat").textContent = STK.song ? "MOTIFS PILOTÉS PAR LA CHAÎNE" : STK.depart ? "DÉPART IMMINENT · MOTIF " + (STK.depart.motif + 1)
    : STK.attente !== null ? "EN ATTENTE · MOTIF " + (STK.attente + 1)
    : STK.quantifie ? "CHANGEMENT À LA FIN DU MOTIF" : "CHANGEMENT EN DIRECT";
  document.getElementById("stk-coller").disabled = !STK.copie || S.run;
  document.getElementById("stk-copie-etat").textContent = STK.copie ? "COPIE MOTIF " + (STK.copie.origine + 1) + " · 10 PISTES" : "AUCUNE COPIE";
  var bp = document.getElementById("stk-ptn");
  if(bp){ bp.textContent = "MOTIF " + (STK.cur + 1); bp.classList.toggle("on", STK_MODE === "ptn"); }
  var bs2 = document.getElementById("stk-solo");
  if(bs2) bs2.classList.toggle("on", STK.solo === STK.sel);
  var pl = document.getElementById("stk-play");
  if(pl) pl.classList.toggle("on", S.run);
  var et = document.getElementById("stk-etat");
  if(et) et.textContent = STK_MODE === "ptn"
    ? "Les pads choisissent le motif. Touchez MOTIF pour revenir aux pas."
    : pisteStkSel().type === "instrument" ? "Choisissez la hauteur puis un pas. Même note et tranche : retirer ; autre choix : remplacer."
    : pisteStkSel().slice ? "Choisissez TR 1–8, puis un pas : écrire, remplacer ou retirer cette tranche."
    : "Les pads écrivent les pas de la piste " + (STK.sel + 1) +
      ". Retoucher une piste choisie la coupe.";
  majMidiStk(); majInstrumentStk(); majChaineStk(); majTranchesStk(); dessinerStk();
}
function padStk(k){
  if(!Number.isInteger(k) || k < 0 || k >= 16) return;
  audioInit();
  if(STK_MODE === "ptn"){
    if(k < STK_MOTIFS){ choisirMotifStk(k); H.inter(); }
    return;
  }
  suivreMotifsStk();
  var m = motifStkCur(), P = pisteStkSel();
  if(!Number.isInteger(k) || k < 0 || k >= m.last) return;
  var tranche = P.slice ? P.tranche : -1;
  var hauteur = P.type === "instrument" ? P.note : 0;
  var retirer = !!(m.pas[STK.sel] & (1 << k)) && (!P.slice || m.tranches[STK.sel][k] === tranche) &&
    (P.type !== "instrument" || m.notes[STK.sel][k] === hauteur);
  if(retirer){ m.pas[STK.sel] &= ~(1 << k); m.tranches[STK.sel][k] = -1; m.notes[STK.sel][k] = 0; }
  else { m.pas[STK.sel] |= (1 << k); m.tranches[STK.sel][k] = tranche; m.notes[STK.sel][k] = hauteur; }
  if(!retirer && ctx && passeStk(STK.sel)) voixStk(maintenantAudio() + 0.005, STK.sel, false, tranche, hauteur);
  memStk(); majStk(); H.cran();
}
function knobStk(nom, etiq, min, max){
  return knobEm("stk-k-" + nom, {min:min, max:max,
    get:function(){ return pisteStkSel()[nom]; },
    set:function(v){
      pisteStkSel()[nom] = v;
      var e = document.getElementById("stk-etat");
      if(e) e.textContent = etiq + " " + Math.round(v * 100) + " · piste " + (STK.sel + 1);
      memStk();
    }});
}
var kStkTune = knobStk("tune", "TUNE", 0, 1);
var kStkDec  = knobStk("dec",  "DECAY", 0.05, 1);
var kStkFilt = knobStk("filt", "FILTER", 0.05, 1);
var kStkNiv  = knobStk("niv",  "LEVEL", 0, 1);
var kStkPan  = knobStk("pan",  "PAN", -1, 1);
function majKnobsStk(){
  [kStkTune, kStkDec, kStkFilt, kStkNiv, kStkPan].forEach(function(k){ k.maj(); });
}
function activerStk(){
  stop();
  audioInit(); banqueEs(); chargerEchs();
  chargerStk();
  poserMachine("stk");
  actif = document.getElementById("unit-stk");
  MACHINE = MACHINE_STK;
  S.modele = "stk";
  if(ctx) noeudsStk();
  STK_MODE = "pas"; STK.ondePour = "";
  majStk(); majKnobsStk();
  save(); fit();
}
document.getElementById("stk-play").addEventListener("click", function(){
  if(S.run) stop(); else start();
  majStk(); H.start();
});
document.getElementById("stk-midi").addEventListener("click", modeMidiStk);
document.getElementById("stk-instrument").addEventListener("click", modeInstrumentStk);
document.getElementById("stk-note").addEventListener("change", function(){ choisirNoteStk(Number(this.value)); });
document.getElementById("stk-ecouter").addEventListener("click", ecouterInstrumentStk);
document.getElementById("stk-chaine").addEventListener("click", modeChaineStk);
document.getElementById("stk-chaine-ajout").addEventListener("click", ajouterChaineStk);
document.getElementById("stk-chaine-retirer").addEventListener("click", retirerChaineStk);
document.getElementById("stk-chaine-vider").addEventListener("click", viderChaineStk);
document.getElementById("stk-chaine-gauche").addEventListener("click", function(){ deplacerEntreeChaineStk(-1); });
document.getElementById("stk-chaine-droite").addEventListener("click", function(){ deplacerEntreeChaineStk(1); });
document.getElementById("stk-chaine-dupliquer").addEventListener("click", dupliquerEntreeChaineStk);
document.getElementById("stk-chaine-supprimer").addEventListener("click", supprimerEntreeChaineStk);
document.getElementById("stk-quantifie").addEventListener("click", modeMotifsStk);
document.getElementById("stk-annuler").addEventListener("click", annulerMotifStk);
document.getElementById("stk-copier").addEventListener("click", copierMotifStk);
document.getElementById("stk-coller").addEventListener("click", collerMotifStk);
document.getElementById("stk-ptn").addEventListener("click", function(){
  STK_MODE = (STK_MODE === "ptn") ? "pas" : "ptn";
  majStk(); H.cran();
});
document.getElementById("stk-solo").addEventListener("click", function(){
  STK.solo = (STK.solo === STK.sel) ? -1 : STK.sel;
  majStk(); memStk(); H.inter();
});
document.getElementById("stk-slice").addEventListener("click", function(){
  pisteStkSel().slice = !pisteStkSel().slice; memStk(); majStk(); H.inter();
});
document.getElementById("stk-import").addEventListener("click", function(){
  BIB.cible = {machine:"stk", partie:STK.sel}; ouvrirBib();
});
document.getElementById("stk-son").addEventListener("click", function(){
  /* Le son suivant de la banque pour la piste choisie. */
  var P = pisteStkSel();
  var i = ES_BANQUE.indexOf(nomEch(P.ech));
  P.ech = "b" + (((i < 0 ? 0 : i) + 1) % ES_BANQUE.length);
  STK.ondePour = "";
  memStk(); majStk(); H.cran();
});
document.getElementById("stk-clear").addEventListener("click", function(){
  if(!window.confirm("Effacer les pas de la piste " + (STK.sel + 1) + " ?")) return;
  motifStkCur().pas[STK.sel] = 0; motifStkCur().tranches[STK.sel].fill(-1); motifStkCur().notes[STK.sel].fill(0);
  memStk(); majStk(); H.inter();
});

/* ---------- la façade du K.O! ---------- */
var KO_MODE = "son";        /* ce que règlent les pads : son, motif, tempo */
function noteChromaKo(k){ return (k|0) - 7; }
function actifChromaKo(m, k){
  var source = Math.max(0, Math.min(7, KO.chromaSource|0));
  var row = m.notes && m.notes[source], note = noteChromaKo(k);
  if(!row) return false;
  for(var i=0;i<16;i++) if((m.pas[source] & (1 << i)) && row[i] === note) return true;
  return false;
}
function majKoSwing(){
  var curseur = document.getElementById("ko-swing"), valeur = document.getElementById("ko-swing-val");
  if(!curseur || !valeur) return;
  var v = normaliserSwingKo(KO.swing), texte = pourcentageSwingKo(v) + "%";
  curseur.value = String(Math.round(v * 100));
  curseur.setAttribute("aria-valuetext", texte);
  valeur.textContent = texte;
}

function textePlockKo(nom, valeur, actif){
  if(!actif) return "AUCUN";
  var v = Math.max(0, Math.min(127, Number(valeur) || 0));
  if(nom === "pitch"){
    var demi = (v - 64) / 12, signe = demi > 0 ? "+" : "";
    return signe + demi.toFixed(1) + " st";
  }
  if(nom === "start") return Math.round(v * 100 / 127) + "%";
  if(nom === "length") return Math.round((5 + v * 95 / 127)) + "%";
  return Math.round(v * 100 / 127) + "%";
}
function plockKoCourant(){
  var m = motifKoCur(), p = Math.max(0, Math.min(15, KO.lockStep|0));
  if(!m.plocks) m.plocks = normaliserVerrousKo();
  return m.plocks[p] || null;
}
function majKoPlock(){
  var param = document.getElementById("ko-lock-param"), pas = document.getElementById("ko-lock-step");
  var valeur = document.getElementById("ko-lock-value"), texte = document.getElementById("ko-lock-value-label");
  var etat = document.getElementById("ko-lock-status");
  if(!param || !pas || !valeur || !texte || !etat) return;
  var m = motifKoCur(), step = Math.max(0, Math.min(15, KO.lockStep|0)), verrou = m.plocks && m.plocks[step];
  var nom = param.value, meta = KO_PLOCKS.filter(function(x){ return x[0] === nom; })[0] || KO_PLOCKS[0];
  var actif = !!(verrou && Number.isFinite(verrou[nom]));
  var v = actif ? verrou[nom] : meta[2];
  pas.value = String(step); valeur.value = String(v); texte.textContent = textePlockKo(nom, v, actif);
  etat.textContent = "PAS " + (step + 1) + " · " + (actif ? meta[1] + " " + textePlockKo(nom, v, true) : "AUCUN");
  var bloque = KO_MODE !== "son" || S.run;
  param.disabled = bloque; pas.disabled = bloque; valeur.disabled = bloque;
  document.getElementById("ko-lock-apply").disabled = bloque;
  document.getElementById("ko-lock-clear").disabled = bloque || !actif;
}
function ecrirePlockKo(){
  if(KO_MODE !== "son" || S.run) return false;
  var param = document.getElementById("ko-lock-param"), valeur = document.getElementById("ko-lock-value");
  if(!param || !valeur) return false;
  var m = motifKoCur(), step = Math.max(0, Math.min(15, KO.lockStep|0));
  var nom = param.value, ok = KO_PLOCKS.some(function(x){ return x[0] === nom; });
  if(!ok) return false;
  if(!m.plocks) m.plocks = normaliserVerrousKo();
  var verrou = normaliserPlockKo(m.plocks[step]) || {};
  verrou[nom] = Math.max(0, Math.min(127, Math.round(+valeur.value)));
  m.plocks[step] = verrou; memKo(); majKo(); H.inter(); return true;
}
function effacerPlockKo(){
  if(KO_MODE !== "son" || S.run) return false;
  var param = document.getElementById("ko-lock-param"), m = motifKoCur(), step = Math.max(0, Math.min(15, KO.lockStep|0));
  if(!param || !m.plocks || !m.plocks[step]) return false;
  delete m.plocks[step][param.value];
  m.plocks[step] = normaliserPlockKo(m.plocks[step]);
  memKo(); majKo(); H.inter(); return true;
}

function lcdKo(val, lab){
  var a = document.getElementById("ko-val"), b = document.getElementById("ko-lab");
  if(a) a.textContent = val;
  if(b) b.textContent = lab;
  var c = document.getElementById("ko-bpm");
  if(c) c.textContent = Math.round(S.bpm);
}
function majKo(){
  var d = document.getElementById("ko-pads");
  if(!d) return;
  if(!d.childNodes.length){
    for(var i=0;i<16;i++) (function(k){
      var b = document.createElement("button");
      b.className = "kb" + (k < 8 ? " mel" : "");
      b.dataset.k = k;
      b.innerHTML = (k + 1) + "<em></em>";
      b.addEventListener("pointerdown", function(e){ padKo(k); e.preventDefault(); });
      d.appendChild(b);
    })(i);
  }
  var m = motifKoCur(), bs = d.childNodes;
  for(var k=0;k<16;k++){
    var b = bs[k];
    var ecrit = KO_MODE === "son" ? (KO.chroma ? actifChromaKo(m, k) : !!m.pas[k]) : false;
    b.classList.toggle("mel", KO.chroma || k < 8);
    b.classList.toggle("on", KO_MODE === "ptn" ? (k === KO.cur)
                            : (KO_MODE === "fx" ? (k < KO_FX.length && k === KO.fx) : ecrit));
    b.classList.toggle("sel", KO_MODE === "son" && (KO.chroma ? k === 7 : k === KO.sel));
    b.querySelector("em").textContent =
      KO_MODE === "son" ? (KO.chroma ? (noteChromaKo(k) > 0 ? "+" : "") + noteChromaKo(k) + " ST" : nomEch(KO.sons[k])) :
      KO_MODE === "ptn" ? ("motif " + (k + 1)) :
      KO_MODE === "fx"  ? (k < KO_FX.length ? KO_FX[k][1] : "") : "";
  }
  ["son","ptn","fx"].forEach(function(q){
    var t = {son:"ko-son", ptn:"ko-ptn", fx:"ko-fx"}[q];
    var e = document.getElementById(t);
    if(e) e.classList.toggle("on", KO_MODE === q);
  });
  var r = document.getElementById("ko-rec");
  if(r) r.classList.toggle("on", KO.rec);
  var p = document.getElementById("ko-play");
  if(p) p.classList.toggle("on", S.run);
  lcdKo(KO_MODE === "ptn" ? ("P" + (KO.cur + 1))
      : KO_MODE === "fx" ? KO_FX[KO.fx][1]
      : KO.chroma ? ("C" + (KO.chromaSource + 1)) : String(KO.sel + 1),
      KO_MODE === "ptn" ? "PATTERN" : KO_MODE === "fx" ? "EFFET" : "SAMPLE");
  var e2 = document.getElementById("ko-etat");
  if(e2) e2.textContent =
    KO_MODE === "fx" ? "Choisissez un effet, puis maintenez FX pendant que ça joue."
    : KO_MODE === "ptn" ? "Touchez un motif pour y aller."
    : KO.chroma ? "CHROMA : source " + (KO.chromaSource + 1) + " · -7 à +8 demi-tons."
    : (KO.rec ? "WRITE actif : les pads écrivent dans le motif."
              : "Les pads jouent. WRITE pour écrire dans le motif.");
  var chroma = document.getElementById("ko-chroma");
  if(chroma){
    chroma.classList.toggle("on", KO.chroma);
    chroma.disabled = KO_MODE !== "son" || S.run;
  }
  majKoSwing();
  majKoPlock();
}
function padKo(k){
  audioInit();
  if(KO_MODE === "ptn"){ KO.cur = k; majKo(); memKo(); H.inter(); return; }
  if(KO_MODE === "fx"){ KO.fx = Math.min(k, KO_FX.length - 1); majKo(); memKo(); H.cran(); return; }
  if(KO.chroma){
    var source = Math.max(0, Math.min(7, KO.chromaSource|0)), note = noteChromaKo(k);
    if(KO.rec){
      var cm = motifKoCur();
      var cpos = S.run ? pasLePlusProche(KO.pos, cm.last) : KO.lockStep;
      if(cpos >= 0){
        KO.lockStep = cpos;
        if(!cm.notes) cm.notes = normaliserNotesKo();
        if(!cm.notes[source]) cm.notes[source] = normaliserNotesKo()[source];
        var actif = !!(cm.pas[source] & (1 << cpos));
        if(actif && cm.notes[source][cpos] === note){
          cm.pas[source] &= ~(1 << cpos); cm.notes[source][cpos] = null;
        }else{
          cm.pas[source] |= (1 << cpos); cm.notes[source][cpos] = note;
        }
      }
      memKo();
    }else if(S.run) KO.lockStep = pasLePlusProche(KO.pos, motifKoCur().last);
    voixKo(maintenantAudio() + 0.005, source, 1, -1, note);
    majKo(); H.inter(); return;
  }
  KO.sel = k;
  if(k < 8) KO.chromaSource = k;
  if(KO.rec){
    /* Écriture au vol : on pose la frappe sur le pas le plus proche, comme sur
       les autres machines. À l'arrêt, le pas choisi dans PARAMETER LOCK sert
       de pas courant. */
    var m = motifKoCur();
    var pos = S.run ? pasLePlusProche(KO.pos, m.last) : KO.lockStep;
    if(pos >= 0){
      KO.lockStep = pos;
      if(!m.notes) m.notes = normaliserNotesKo();
      m.pas[k] ^= (1 << pos);
      /* Une écriture SOUND normale remplace une éventuelle hauteur CHROMA
         restée sur ce même emplacement et ce même pas. */
      if(m.notes[k]) m.notes[k][pos] = null;
    }
    memKo();
  }else if(S.run) KO.lockStep = pasLePlusProche(KO.pos, motifKoCur().last);
  voixKo(maintenantAudio() + 0.005, k, 1);
  majKo();
  H.inter();
}
function activerKo(){
  stop();
  audioInit(); banqueEs(); chargerEchs();
  chargerKo();
  poserMachine("ko");
  actif = document.getElementById("unit-ko");
  MACHINE = MACHINE_KO;
  S.modele = "ko";
  if(ctx) noeudsKo();
  KO_MODE = "son";
  majKo();
  save(); fit();
}
document.getElementById("ko-son").addEventListener("click", function(){ KO_MODE = "son"; majKo(); H.cran(); });
document.getElementById("ko-ptn").addEventListener("click", function(){ KO_MODE = "ptn"; majKo(); H.cran(); });
document.getElementById("ko-fx").addEventListener("click", function(){ KO_MODE = "fx"; majKo(); H.cran(); });
document.getElementById("ko-rec").addEventListener("click", function(){
  KO.rec = !KO.rec; majKo(); H.inter();
});
document.getElementById("ko-play").addEventListener("click", function(){
  if(S.run) stop(); else start();
  majKo(); H.start();
});
document.getElementById("ko-write").addEventListener("click", function(){
  /* Effacer le motif courant : c'est le seul geste destructeur de la machine,
     il demande confirmation. */
  if(!window.confirm("Effacer le motif " + (KO.cur + 1) + " ?")) return;
  var m = motifKoCur();
  for(var i=0;i<16;i++){
    m.pas[i] = 0; m.plocks[i] = null;
    if(m.notes && m.notes[i]) m.notes[i].fill(null);
  }
  memKo(); majKo(); H.inter();
});
document.getElementById("ko-bpm-b").addEventListener("click", function(){
  lcdKo(Math.round(S.bpm), "TEMPO"); H.cran();
});
(function commandeSwingKo(){
  var curseur = document.getElementById("ko-swing"), valeur = document.getElementById("ko-swing-val");
  if(!curseur || !valeur) return;
  function lireSwingKo(sauver){
    KO.swing = normaliserSwingKo(Number(curseur.value) / 100);
    var texte = pourcentageSwingKo(KO.swing) + "%";
    valeur.textContent = texte; curseur.setAttribute("aria-valuetext", texte);
    lcdKo(texte, "SWING");
    if(sauver){ memKo(); H.cran(); }
  }
  curseur.addEventListener("input", function(){ lireSwingKo(false); });
  curseur.addEventListener("change", function(){ lireSwingKo(true); });
})();
document.getElementById("ko-chroma").addEventListener("click", function(){
  if(KO_MODE !== "son" || S.run) return;
  if(!KO.chroma && KO.sel < 8) KO.chromaSource = KO.sel;
  KO.chroma = !KO.chroma;
  if(!KO.chroma) KO.sel = KO.chromaSource;
  memKo(); majKo(); H.cran();
});
(function commandesPlockKo(){
  var param = document.getElementById("ko-lock-param"), pas = document.getElementById("ko-lock-step");
  var valeur = document.getElementById("ko-lock-value"), ecrire = document.getElementById("ko-lock-apply");
  var effacer = document.getElementById("ko-lock-clear");
  if(!param || !pas || !valeur || !ecrire || !effacer) return;
  param.addEventListener("change", majKoPlock);
  pas.addEventListener("change", function(){ KO.lockStep = Math.max(0, Math.min(15, +this.value|0)); majKoPlock(); });
  valeur.addEventListener("input", function(){
    var nom = param.value, actif = !!(plockKoCourant() && Number.isFinite(plockKoCourant()[nom]));
    document.getElementById("ko-lock-value-label").textContent = textePlockKo(nom, +this.value, actif);
  });
  ecrire.addEventListener("click", ecrirePlockKo);
  effacer.addEventListener("click", effacerPlockKo);
})();
/* FX au poing : l'effet vit tant que le doigt est sur le bouton. C'est un
   geste, pas un réglage — le relâcher doit le couper net. */
(function fxTenuKo(){
  var b = document.getElementById("ko-fx");
  function prendre(){ KO.fxTenu = true; appliquerFxKo(); b.classList.add("on"); }
  function lacher(){ if(!KO.fxTenu) return; KO.fxTenu = false; appliquerFxKo(); majKo(); }
  b.addEventListener("pointerdown", function(){ if(KO_MODE === "fx") prendre(); });
  b.addEventListener("pointerup", lacher);
  b.addEventListener("pointercancel", lacher);
  b.addEventListener("pointerleave", lacher);
})();
