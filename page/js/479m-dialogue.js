/* ================= DIALOGUE — v297 =================
   Deux voix qui se répondent, comme une question et sa réponse. Pendant les
   LONGUEUR premiers pas d'un cycle (la « question »), la voix 1 improvise
   une phrase, note par note, avec une chance DENSITÉ à chaque pas et une
   note choisie au hasard dans la GAMME autour de la TONIQUE — puis mémorisée.
   Pendant les LONGUEUR pas suivants (la « réponse »), la voix 2 rejoue
   exactement cette phrase, décalée de DÉCALAGE demi-tons et requantifiée
   dans la même gamme ; MIROIR la relit à l'envers (dernière note d'abord),
   comme une phrase qui répond en écho retourné plutôt qu'en simple copie.
   Silence pendant la phrase de l'autre voix : ce n'est pas un duo simultané
   mais un vrai dialogue, question puis réponse, pas encore de chevauchement.

   Réutilise EUR_MELO32.quantifier/noteNom plutôt que de redéfinir une gamme
   et une table de notes : même convention de tonique (0 = DO, 9 = LA par
   défaut) et les mêmes cinq gammes que MÉLO 32 et HARMONIE 8, pour rester
   cohérent d'un module à l'autre du rack. Convention CV : (note-33)/12 —
   0 V = LA1 (55 Hz) — la même que partout ailleurs dans le rack. */
var EUR_DIALOGUE = (function(){
  "use strict";
  var kns = [["root","TONIQUE",0,11,9],["scale","GAMME",0,4,1],["longueur","LONGUEUR",4,16,8],
    ["decalage","DÉCALAGE st",-12,12,5],["densite","DENSITÉ",0,100,75],["miroir","MIROIR",0,1,0],
    ["glisse","GLISSÉ ms",0,250,40]];
  function entier(v,min,max,def){ return Number.isFinite(v) ? Math.max(min,Math.min(max,Math.round(v))) : def; }
  function normaliser(m){ if(!m.p) m.p = {}; kns.forEach(function(k){ m.p[k[0]] = entier(m.p[k[0]], k[2], k[3], k[4]); }); }

  function creer(m){
    normaliser(m);
    var portsA = {cv:eurConst(0), gate:eurConst(0)}, portsB = {cv:eurConst(0), gate:eurConst(0)};
    var d = m.dialogue = {pos:-1, notes:[], rampeA:null, rampeB:null, jA:false, jB:false, phase:"question"};
    function valeur(r,t){ return !r ? 0 : t>=r.fin ? r.b : t<=r.t ? r.a : r.a+(r.b-r.a)*(t-r.t)/(r.fin-r.t); }
    function fermer(g,t){ g.offset.cancelScheduledValues(t); g.offset.setValueAtTime(0,t); }
    function annulerCv(cv,rampe,t){
      var v = valeur(rampe,t);
      cv.offset.cancelScheduledValues(t); cv.offset.setValueAtTime(v,t);
    }
    function jouer(ports,rampeKey,jKey,note,t,glisse){
      if(note===null || note===undefined){ fermer(ports.gate,t); d[jKey]=false; return; }
      var b=(note-33)/12, a=valeur(d[rampeKey],t), g=d[jKey]?glisse:0;
      ports.cv.offset.cancelScheduledValues(t);
      ports.cv.offset.setValueAtTime(g?a:b,t);
      if(g) ports.cv.offset.linearRampToValueAtTime(b,t+g);
      d[rampeKey] = {t:t, fin:t+g, a:g?a:b, b:b};
      eurPorte(ports.gate,t,Math.min(.012,stepDur()*.45));
      d[jKey] = true;
    }
    function reset(t){
      fermer(portsA.gate,t); fermer(portsB.gate,t);
      annulerCv(portsA.cv,d.rampeA,t); annulerCv(portsB.cv,d.rampeB,t);
      d.rampeA=null; d.rampeB=null; d.pos=-1; d.notes=[]; d.jA=false; d.jB=false; d.phase="question";
    }
    m.arreter = function(){ reset(ctx ? maintenantAudio() : 0); };
    m.recevoir = function(t,e){
      if(!Number.isFinite(t) || t<0) return null;
      if(e==="rst"){ reset(t); return null; }
      if(e!=="clk") return null;
      normaliser(m);
      var L = entier(m.p.longueur,4,16,8), cycle = L*2;
      d.pos = (d.pos+1) % cycle;
      var enQuestion = d.pos < L, i = enQuestion ? d.pos : d.pos - L;
      d.phase = enQuestion ? "question" : "reponse";
      var glisse = Math.min(entier(m.p.glisse,0,250,40)/1000, stepDur()*.8);
      if(enQuestion){
        if(i===0) d.notes = [];
        var actif = Math.random()*100 < entier(m.p.densite,0,100,75), note = null;
        if(actif){
          var brut = entier(m.p.root,0,11,9) + 12 + Math.floor(Math.random()*13);
          note = EUR_MELO32.quantifier(brut, m.p.root, m.p.scale);
        }
        d.notes[i] = note;
        jouer(portsA,"rampeA","jA",note,t,glisse);
        fermer(portsB.gate,t);
      }else{
        var idx = m.p.miroir>=.5 ? (L-1-i) : i, brut2 = d.notes[idx];
        var note2 = (brut2===null || brut2===undefined) ? null :
          EUR_MELO32.quantifier(brut2 + entier(m.p.decalage,-12,12,5), m.p.root, m.p.scale);
        jouer(portsB,"rampeB","jB",note2,t,glisse);
        fermer(portsA.gate,t);
      }
      return null;
    };
    return {e:{clk:eurGain(1),rst:eurGain(1)}, s:{cv1:portsA.cv,gate1:portsA.gate,cv2:portsB.cv,gate2:portsB.gate}};
  }

  /* ---------- Façade : sept réglages, comme POLY 4 et LOOPER DE RACK ---------- */
  function el(tag,classe,txt){ var e=document.createElement(tag); if(classe) e.className=classe; if(txt!==undefined) e.textContent=txt; return e; }
  function bouton(p,t,cl){ var b=el("button",cl,t); b.type="button"; p.appendChild(b); return b; }
  function interfaceModule(parent,m,grand){
    var root = el("div","dlg "+(grand?"dlg-editeur":"dlg-mini")); parent.appendChild(root); root.dataset.module = m.id;
    function valide(){ return EUR.mods.indexOf(m)>=0; }
    if(!grand){
      root.appendChild(el("p","dlg-intro","DIALOGUE"));
      var ouvrir = bouton(root,"OUVRIR LE DIALOGUE","dlg-ouvrir");
      ouvrir.addEventListener("click",function(e){ e.stopPropagation(); if(valide() && typeof EUR_FOCUS!=="undefined") EUR_FOCUS.ouvrir(m.id); });
      return {rafraichir:function(){}, detruire:function(){}};
    }
    function modifier(k,v){ if(!valide()) return; m.p[k]=v; memEur(); }
    function options(a,b,pas,fn){ var r=[]; for(var i=a;i<=b;i+=pas) r.push([i, fn?fn(i):String(i)]); return r; }
    function select(p,k,t,l){
      var lab=el("label",""), s=el("select","");
      lab.appendChild(el("span","",t)); s.dataset.champ=k; s.setAttribute("aria-label",t);
      l.forEach(function(x){ var o=el("option","",x[1]); o.value=x[0]; s.appendChild(o); });
      s.addEventListener("change",function(){ modifier(k,+s.value); }); lab.appendChild(s); p.appendChild(lab); return s;
    }
    var noms = ["DO","DO♯","RÉ","RÉ♯","MI","FA","FA♯","SOL","SOL♯","LA","LA♯","SI"];
    var gammesNoms = ["CHROMATIQUE","MINEURE","MAJEURE","DORIENNE","PENTA MINEURE"];
    root.appendChild(el("p","dlg-intro","UNE PHRASE, PUIS SA RÉPONSE"));
    var reglages = el("div","dlg-reglages"); root.appendChild(reglages);
    var champs = {};
    champs.root = select(reglages,"root","TONIQUE", noms.map(function(n,i){ return [i,n]; }));
    champs.scale = select(reglages,"scale","GAMME", gammesNoms.map(function(n,i){ return [i,n]; }));
    champs.longueur = select(reglages,"longueur","LONGUEUR", options(4,16,4,function(n){ return n+" pas"; }));
    champs.decalage = select(reglages,"decalage","DÉCALAGE", options(-12,12,1,function(n){ return (n>0?"+":"")+n+" st"; }));
    champs.densite = select(reglages,"densite","DENSITÉ", options(0,100,5,function(n){ return n+" %"; }));
    champs.miroir = select(reglages,"miroir","MIROIR", [[0,"NON"],[1,"OUI"]]);
    champs.glisse = select(reglages,"glisse","GLISSÉ", options(0,250,10,function(n){ return n+" ms"; }));
    function rafraichir(){
      if(!valide()) return;
      Object.keys(champs).forEach(function(k){ champs[k].value = m.p[k]; });
    }
    rafraichir();
    return {rafraichir:rafraichir, detruire:function(){}};
  }

  EUR_CAT.dialogue = {nom:"DIALOGUE", hp:220, sombre:false, fam:"seq",
    res:"Deux voix qui se répondent : la question improvise une phrase, la réponse la reprend décalée (et, en option, retournée).",
    kns:kns, jacks:[["clk","CLK",0],["rst","RST",0],["cv1","CV 1",1],["gate1","GATE 1",1],["cv2","CV 2",1],["gate2","GATE 2",1]],
    creer:creer, interface:interfaceModule,
    focusLabel:"UNE PHRASE, PUIS SA RÉPONSE", focusValeur:"DIALOGUE"};
  EUR_ORDRE.push("dialogue");
})();
