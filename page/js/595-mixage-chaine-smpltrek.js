/* v192 : un passage de la chaîne, sans changer de motif ni de contexte live.
   L'export de motif du menu reste indépendant de cet arrangement. */
var STK_EXPORT_PISTE = false; /* choix de session, indépendant de MUTE et SOLO */
function planMixageStk(pisteDemandee){
  if(pisteDemandee !== undefined && (!Number.isInteger(pisteDemandee) || pisteDemandee < 0 || pisteDemandee >= STK_PISTES))
    throw new Error("PISTE D'EXPORT INVALIDE");
  if(!chaineValideStk()) throw new Error("CHAÎNE VIDE OU LONGUEURS DIFFÉRENTES");
  var duree = stepDur(), pas = [], position = 0, notes = 0;
  STK.chaine.forEach(function(k){
    var m = STK.motifs[k];
    for(var i=0;i<m.last;i++){
      var p = {t:0.05 + position * duree, accent:i % 4 === 0, charge:0, notes:[]};
      for(var piste=0;piste<STK_PISTES;piste++){
        if(!(m.pas[piste] & (1 << i)) || !passeStk(piste)) continue;
        p.charge++;
        if(pisteDemandee !== undefined && piste !== pisteDemandee) continue;
        p.notes.push({piste:piste, tranche:m.tranches[piste][i], hauteur:m.notes[piste][i]}); notes++;
      }
      if(p.notes.length) pas.push(p);
      position++;
    }
  });
  if(!notes) throw new Error(pisteDemandee === undefined ? "AUCUNE NOTE AUDIBLE DANS LA CHAÎNE" : "PISTE " + (pisteDemandee + 1) + " · AUCUNE NOTE AUDIBLE DANS LA CHAÎNE");
  return {piste:pisteDemandee, pas:pas, notes:notes, duree:0.05 + position * duree, entrees:STK.chaine.length};
}
function dureeMixageStk(plan){
  var fin = plan.duree;
  plan.pas.forEach(function(p){
    p.notes.forEach(function(n){
      var piste = STK.pistes[n.piste], buf = ES.buf[piste.ech];
      if(!buf) throw new Error("SON INTROUVABLE OU ILLISIBLE · " + piste.ech);
      var tranche = piste.slice ? numeroTrancheStk(n.tranche) : -1;
      var bornes = bornesTrancheStk(buf, tranche);
      var hauteur = piste.type === "instrument" ? noteInstrumentStk(n.hauteur) : 0;
      var vitesse = Math.pow(2, (piste.tune - .5) * 2 + hauteur / 12);
      var temps = (bornes.fin - bornes.debut) / buf.sampleRate / vitesse * Math.max(.05, piste.dec);
      if(tranche < 0) temps = Math.max(.03, temps) + .05;
      fin = Math.max(fin, p.t + temps);
    });
  });
  return fin + .25; /* relâchement du limiteur après la dernière voix */
}
async function exporterChaineStk(pisteDemandee){
  if(WAVX.occupe || ENR.ondesOccupe || PROJET_EN_COURS) return;
  if(S.modele !== "stk") return;
  if(ENR.actif){ signal("ARRÊTEZ L'ENREGISTREMENT AVANT LE RENDU"); return; }
  if(!HOST || !HOST.fichierSauver){ signal("ÉCRITURE IMPOSSIBLE ICI"); return; }
  if(SET.mute.stk || (SET.solo && SET.solo !== "stk") || SET.niv.stk <= 0 || S.vol <= 0){
    signal("RENDU ANNULÉ · SORTIE SMPLTREK COUPÉE"); return;
  }
  var plan;
  try{ plan = planMixageStk(pisteDemandee); }catch(e){ signal(e.message); return; }
  if(refusWavTropLong(plan.duree + .25, 44100)) return;
  audioInit();
  if(!ctx){ signal("AUDIO INDISPONIBLE"); return; }
  if(ENR.lecture !== null) enrArreterLecture();
  if(PR.lecture) prArreter();
  stop();
  if(writeMem() === false){ signal("RENDU ANNULÉ · MÉMOIRE NON ENREGISTRÉE"); return; }
  var avant = {ctx:ctx, master:master, bus:SET.bus, noeuds:STK.noeuds, pas:PAS,
               cache:cache, inerte:document.body.inert};
  function bloquerClavier(e){ e.preventDefault(); e.stopImmediatePropagation(); }
  WAVX.occupe = true; document.body.inert = true;
  document.addEventListener("keydown", bloquerClavier, true);
  signal("CHARGEMENT DES SONS DE LA CHAÎNE…");
  var ab = null, message = "", nom = "";
  try{
    banqueEs(); chargerEchs();
    var debut = Date.now();
    while(Object.keys(ES_CHARGES).length){
      if(Date.now() - debut > 15000) throw new Error("CHARGEMENT DES SONS TROP LONG");
      await new Promise(function(resolve){ setTimeout(resolve, 20); });
    }
    var total = dureeMixageStk(plan); /* vérifie les samples réellement joués */
    if(refusWavTropLong(total, 44100)) return;
    var off = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, Math.ceil(total * 44100), 44100);
    ctx = off; master = chaineMaitresseHorsLigne(off); SET.bus = {}; STK.noeuds = null; PAS = null; cache = true;
    signal((plan.piste === undefined ? "MIXAGE" : "PISTE " + (plan.piste + 1)) + " DE LA CHAÎNE · " + plan.entrees + " ENTRÉES…");
    plan.pas.forEach(function(p){
      ouvrirPas();
      p.notes.forEach(function(n){ voixStk(p.t, n.piste, p.accent, n.tranche, n.hauteur); });
      /* Une piste isolée garde l'atténuation du pas dans le mixage. */
      attenuerVoie("stk", p.charge, p.t);
    });
    var rendu = await off.startRendering();
    ab = wavStereo(rendu);
    nom = "drm-stk-" + (plan.piste === undefined ? "" : "piste" + ("0" + (plan.piste + 1)).slice(-2) + "-") + "chaine-" + plan.entrees + "ent-" + Date.now().toString(36) + ".wav";
  }catch(e){ message = "RENDU ÉCHOUÉ · " + (e && e.message ? e.message.slice(0,100) : "ERREUR AUDIO"); }
  finally{
    ctx = avant.ctx; master = avant.master; SET.bus = avant.bus; STK.noeuds = avant.noeuds;
    PAS = avant.pas; cache = avant.cache; WAVX.occupe = false; document.body.inert = avant.inerte;
    document.removeEventListener("keydown", bloquerClavier, true);
    majStk();
  }
  if(!ab){ if(message) signal(message); return; }
  try{
    var chemin = ecrireDocument(HOST, nom, ab);
    if(!chemin){ signal("ÉCRITURE REFUSÉE"); return; }
    document.getElementById("stk-export-chemin").textContent = (plan.piste === undefined ? "Dernier mixage : " : "Dernière piste " + (plan.piste + 1) + " : ") + chemin;
    signal(nom + " · " + Math.round(ab.byteLength / 1024) + " ko · " + plan.notes + " NOTES");
    H.inter(); fit();
  }catch(e){ signal("ÉCRITURE ÉCHOUÉE"); }
}
function majExportStk(){
  var mode = document.getElementById("stk-export-mode"), bouton = document.getElementById("stk-export-chaine");
  mode.textContent = STK_EXPORT_PISTE ? "EXPORT : PISTE " + (STK.sel + 1) : "EXPORT : MIXAGE";
  mode.setAttribute("aria-pressed", String(STK_EXPORT_PISTE)); mode.disabled = WAVX.occupe;
  mode.classList.toggle("on", STK_EXPORT_PISTE);
  bouton.textContent = STK_EXPORT_PISTE ? "PISTE " + (STK.sel + 1) + " EN WAV · CHAÎNE" : "CHAÎNE EN WAV · UN PASSAGE";
  bouton.disabled = !STK.chaine.length || WAVX.occupe;
}
document.getElementById("stk-export-mode").addEventListener("click", function(){
  if(WAVX.occupe) return;
  STK_EXPORT_PISTE = !STK_EXPORT_PISTE; majExportStk();
});
document.getElementById("stk-export-chaine").addEventListener("click", function(){
  exporterChaineStk(STK_EXPORT_PISTE ? STK.sel : undefined);
});
