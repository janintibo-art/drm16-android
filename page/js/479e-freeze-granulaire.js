/* ================= FREEZE GRANULAIRE — v290 =================
   Le module GRAIN (430) reste inchangé : un délai modulé, pas un vrai
   lecteur de fragments. Celui-ci capture réellement le signal d'entrée dans
   un tampon, puis en rejoue de petits grains à une position, une taille et
   une hauteur réglables.

   Aucun MediaRecorder, aucun AudioWorklet : la capture écrit directement
   dans un AudioBuffer via un ScriptProcessorNode, échantillon par
   échantillon, aux instants exacts de ev.playbackTime — ce qui reste correct
   à la fois en direct et dans un rendu OfflineAudioContext (export WAV,
   figer une machine). Un MediaRecorder est asynchrone et n'existe pas dans
   un rendu hors ligne ; un AudioWorklet demande un fichier séparé, fragile
   dans la WebView Android (leçon déjà tirée pour le limiteur, doc B3).

   CAPTURER et GRAIN sont des entrées de porte, au même titre que TRIG sur
   les percussions : elles ne réagissent qu'aux instants transmis par
   scheduleEur (horloge, diviseur, générateur euclidien…), donc à la
   résolution du pas global — pas de nuage continu plus dense que la grille.
   RST vide le tampon : GRAIN ne rejoue plus rien tant qu'une nouvelle
   capture n'a pas abouti.

   scheduleEur appelle recevoir() à l'avance, avant que le moteur audio ait
   réellement rendu l'instant t (c'est le principe même du look-ahead, et
   c'est encore plus net dans un rendu OfflineAudioContext, où rien n'a
   encore joué au moment où tous les événements sont programmés). gel.pret
   — mis à jour dans onaudioprocess — ne reflète donc que ce qui a déjà été
   RÉELLEMENT rendu, pas ce qui SERA rendu à l'instant t d'un futur GRAIN.
   La décision de jouer un grain se fonde uniquement sur les instants
   programmés (t ≥ fin de capture programmée) : l'ordre chronologique du
   rendu garantit qu'à cet instant-là, le tampon aura bien été écrit.
   gel.pret ne sert qu'à l'affichage (Focus, à venir). */
var EUR_FREEZE = (function(){
  "use strict";
  var MAXDUR = 4;
  var kns = [["dur","CAPTURE s",0.2,4,1.5],["pos","POSITION",0,1,0.3],["spray","SPRAY",0,1,0.25],
    ["taille","GRAIN ms",10,300,80],["haut","HAUTEUR st",-24,24,0],["niv","NIVEAU",0,1,0.7]];
  function borne(v,a,b,d){ return typeof v === "number" && Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d; }
  function valeurs(raw){
    var p = {};
    kns.forEach(function(k){ p[k[0]] = borne(raw && raw[k[0]], k[2], k[3], k[4]); });
    return p;
  }
  function normaliser(m){
    var p = valeurs(m.p);
    if(!m.p) m.p = {};
    Object.keys(p).forEach(function(k){ m.p[k] = p[k]; });
    return p;
  }
  /* position et durée d'un grain : pur, vérifiable à part du contexte audio */
  function grainOffset(pos, spray, longueur, dureeGrain, hasard){
    var libre = Math.max(0, longueur - dureeGrain);
    if(libre <= 0) return 0;
    var jit = (hasard * 2 - 1) * spray * longueur * 0.5;
    return Math.max(0, Math.min(libre, pos * libre + jit));
  }
  function creer(m){
    normaliser(m);
    var sr = ctx.sampleRate, n = Math.ceil(MAXDUR * sr) + 2048;
    var buf = ctx.createBuffer(2, n, sr);
    var gel = {longueur:0, pret:false, debut:0, fin:0};
    var entree = eurGain(1), out = eurGain(1), zero = eurGain(0);
    var sp = ctx.createScriptProcessor(1024, 2, 2);
    entree.connect(sp);
    /* Un ScriptProcessorNode ne se met à jour que s'il tient à la sortie :
       un gain à zéro le relie sans rien ajouter au son, exact en direct
       comme hors ligne (0 + x = x, sans perte de précision, même leçon que
       le contournement du KAOSS PAD en v259). */
    sp.connect(zero); zero.connect(ctx.destination);
    var chL = buf.getChannelData(0), chR = buf.getChannelData(1);
    sp.onaudioprocess = function(ev){
      if(gel.fin <= gel.debut) return;
      var t0 = ev.playbackTime, ib = ev.inputBuffer, len = ib.length;
      if(t0 >= gel.fin){ gel.pret = true; return; }
      var l = ib.getChannelData(0), r = ib.numberOfChannels > 1 ? ib.getChannelData(1) : l;
      for(var i=0;i<len;i++){
        var tt = t0 + i / sr;
        if(tt < gel.debut || tt >= gel.fin) continue;
        var idx = Math.round((tt - gel.debut) * sr);
        if(idx < 0 || idx >= n) continue;
        chL[idx] = l[i]; chR[idx] = r[i];
      }
    };
    m.gel = gel;
    m.recevoir = function(t, e){
      if(e === "capt"){
        normaliser(m);
        gel.debut = t; gel.fin = t + m.p.dur; gel.longueur = m.p.dur; gel.pret = false;
        return null;
      }
      if(e === "rst"){ gel.fin = gel.debut; gel.pret = false; gel.longueur = 0; return null; }
      if(e !== "trig") return null;
      /* pas gel.pret : décision fondée sur les instants programmés, pas sur
         ce qui a déjà été rendu (voir la note en tête de fichier) */
      if(gel.fin <= gel.debut || gel.longueur <= 0 || t < gel.fin) return null;
      normaliser(m);
      var dureeS = Math.min(m.p.taille / 1000, gel.longueur);
      if(dureeS <= 0) return null;
      var off = grainOffset(m.p.pos, m.p.spray, gel.longueur, dureeS, Math.random());
      var src = ctx.createBufferSource();
      src.buffer = buf; src.playbackRate.value = Math.pow(2, m.p.haut / 12);
      var g = eurGain(0);
      var att = Math.min(dureeS * 0.4, 0.015), fin = t + dureeS;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(m.p.niv, t + att);
      g.gain.linearRampToValueAtTime(0, fin);
      src.connect(g); g.connect(out);
      src.start(t, off, dureeS);
      src.stop(fin + 0.05);
      return null;
    };
    m.maj = function(){ normaliser(m); };
    return {e:{in:entree, capt:eurGain(1), trig:eurGain(1), rst:eurGain(1)}, s:{out:out},
      detruire:function(){
        try{ sp.disconnect(); }catch(ignore){}
        try{ zero.disconnect(); }catch(ignore){}
        sp.onaudioprocess = null;
        [entree, out].forEach(function(nd){ try{ nd.disconnect(); }catch(ignore){} });
      }};
  }
  EUR_CAT.freeze = {nom:"FREEZE GRANULAIRE", hp:176, sombre:false, fam:"effet",
    res:"Capture quelques secondes du signal entrant et en rejoue de petits grains, à une autre hauteur, position ou taille. CAPTURER fige, GRAIN déclenche un grain, RST vide le tampon.",
    kns:kns, jacks:[["in","IN",0],["capt","CAPTURER",0],["trig","GRAIN",0],["rst","RST",0],["out","OUT",1]], creer:creer};
  EUR_ORDRE.push("freeze");
  return {valeurs:valeurs, normaliser:normaliser, grainOffset:grainOffset, maxdur:MAXDUR};
})();
