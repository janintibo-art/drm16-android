/* ================= retours musicaux (v265) =================
   Crêtes numériques, et non VU analogiques normalisés / true-peak.
   - Sortie : après les protections communes, avant le volume du téléphone.
   - Voies : après fader et panoramique, avant la protection générale.
   - Deux canaux séparés : aucune sommation G+D qui annulerait l'antiphase.
   Les analyseurs sont des branches de lecture SANS liaison à destination.
   La déconnexion vise uniquement notre branche. Aucun gain audio n'est réglé.
   Référence : Web Audio API, AnalyserNode et ChannelSplitterNode (W3C).
*/
function reveillerRetoursMusicaux(){
  if(typeof RETOURS_MUSICAUX === "object" && RETOURS_MUSICAUX) RETOURS_MUSICAUX.reveiller();
}
var RETOURS_MUSICAUX = (function(){
  "use strict";
  var MIN_DB=-60, FFT=2048, MAINTIEN=900, CLIP_MS=1500;
  var raf=0, sale=true, dernierDessin=0, derniereGeometrie=0, frames=0, lectures=0;
  var sortie=null, voies={}, vues={}, visibles=[], compacteVisible=false, consoleVisible=false;
  var contexteEcoute=null, midiJusqua=0, limiteJusqua=0, dernierPas=0, tempsPas=-1000;
  var reduire=window.matchMedia("(prefers-reduced-motion: reduce)");
  var table=document.getElementById("table"), pisteTable=document.getElementById("table-voies");
  var compact=document.createElement("div");
  compact.id="rm-compact";
  compact.title="Sortie du moteur DRM, gauche / droite, après protection. MIDI indique les messages de l'entrée de l'application, y compris l'écoute interne des prises. L'horloge seule ne l'allume pas.";
  compact.innerHTML='<canvas role="img" aria-label="Niveau de sortie gauche et droite"></canvas>'+signaux(true);
  document.body.appendChild(compact);
  var vueCompacte=vue(compact.querySelector("canvas"), false), consoleEl=null, vueConsole=null;
  var transports=[], midis=[];

  function signaux(petit){
    return '<div class="'+(petit?'rm-mini-bas':'rm-signaux')+'">'+
      '<span class="rm-transport" data-etat="stop"><i class="rm-lampe" aria-hidden="true"></i><span>STOP</span></span>'+
      '<span class="rm-midi" data-on="0"><i class="rm-lampe" aria-hidden="true"></i>MIDI</span>'+
      (petit?'':'<span class="rm-limiteur" title="Limiteur général : réduction de gain supérieure à 1 dB"><i class="rm-lampe" aria-hidden="true"></i>LIM</span>')+'</div>';
  }
  function texte(e,s){ if(e && e.textContent!==s) e.textContent=s; }
  function db(p){ return p>0 ? Math.max(MIN_DB,20*Math.log10(p)) : MIN_DB; }
  function ratio(v){ return Math.max(0,Math.min(1,(v-MIN_DB)/-MIN_DB)); }
  function nombre(p){
    if(!Number.isFinite(p) || p<0.001) return "−∞";
    var d=20*Math.log10(p);
    return (d>0?"+":"")+d.toFixed(1).replace("-","−");
  }
  function etat(){return {pic:0,barre:MIN_DB,crete:MIN_DB,jusqua:0};}
  function creer(source){
    if(!source || !source.context || source.context.startRendering) return null;
    var c=source.context, entree=null, split=null, analyses=[],tailleFFT=FFT;
    while(tailleFFT<c.sampleRate/24 && tailleFFT<32768) tailleFFT*=2;
    try{
      /* Un signal mono est dupliqué comme à une sortie stéréo "speakers".
         Le splitter, lui, reste discret : une vraie droite muette reste muette. */
      entree=c.createGain(); entree.channelCount=2;
      entree.channelCountMode="explicit"; entree.channelInterpretation="speakers";
      split=c.createChannelSplitter(2);
      for(var i=0;i<2;i++){
        var a=c.createAnalyser(); a.fftSize=tailleFFT; a.smoothingTimeConstant=0;
        analyses.push(a); split.connect(a,i,0);
      }
      entree.connect(split); source.connect(entree);
      return {source:source,c:c,entree:entree,split:split,analyses:analyses,
        tampons:[new Float32Array(tailleFFT),new Float32Array(tailleFFT)],etats:[etat(),etat()],clip:0};
    }catch(e){
      if(entree){try{source.disconnect(entree);}catch(ignore){} try{entree.disconnect();}catch(ignore){}}
      if(split) try{split.disconnect();}catch(ignore){}
      analyses.forEach(function(a){try{a.disconnect();}catch(ignore){}});
      return null;
    }
  }
  function detacher(r){
    if(!r) return;
    /* Jamais source.disconnect() sans destination : cela couperait le son. */
    try{r.source.disconnect(r.entree);}catch(e){}
    [r.entree,r.split].concat(r.analyses).forEach(function(n){try{n.disconnect();}catch(e){}});
  }
  function lire(r,t,dt){
    try{
      for(var c=0;c<2;c++){
        var a=r.tampons[c],pic=0;
        r.analyses[c].getFloatTimeDomainData(a);
        for(var i=0;i<a.length;i++){
          var x=Math.abs(a[i]); if(Number.isFinite(x) && x>pic) pic=x;
        }
        var s=r.etats[c],d=db(pic); s.pic=pic;
        s.barre=Math.max(d,s.barre-24*dt);
        if(d>=s.crete){s.crete=d;s.jusqua=t+MAINTIEN;}
        else if(t>s.jusqua) s.crete=Math.max(d,s.crete-18*dt);
        if(pic>=1) r.clip=t+CLIP_MS;
      }
      lectures++; return true;
    }catch(e){return false;}
  }
  function vue(canvas,vertical){return {canvas:canvas,vertical:vertical,w:0,h:0,cle:"",dateTexte:0};}
  function taille(v){
    var r=v.canvas.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);
    var w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
    if(w!==v.w || h!==v.h || v.d!==d){
      v.w=w;v.h=h;v.d=d;v.canvas.width=Math.round(w*d);v.canvas.height=Math.round(h*d);v.cle="";
    }
  }
  function dessiner(v,r,t){
    if(!v || v.w<2) return;
    var e=r?r.etats:[etat(),etat()];
    var cle=e.map(function(s){return Math.round(ratio(s.barre)*100)+":"+Math.round(ratio(s.crete)*100);}).join("/");
    if(cle!==v.cle){
      v.cle=cle;
      var g=v.canvas.getContext("2d"),w=v.w,h=v.h;
      g.setTransform(v.d,0,0,v.d,0,0);g.clearRect(0,0,w,h);
      g.fillStyle="#09120e";g.fillRect(0,0,w,h);
      var nb=v.vertical?24:28;
      for(var c=0;c<2;c++){
        var s=e[c],barre=ratio(s.barre),cap=ratio(s.crete);
        for(var k=0;k<nb;k++){
          var niveau=MIN_DB+(k+1)*(-MIN_DB)/nb;
          var allume=barre>k/nb;
          g.fillStyle=allume?(niveau>=-3?"#e99180":niveau>=-9?"#edc66b":"#78d6a2"):
            (niveau>=-9?"#352e1b":"#193528");
          if(v.vertical){
            var hh=(h-17)/nb,ww=(w-18)/2;
            g.fillRect(6+c*(ww+6),h-16-(k+1)*hh,ww,Math.max(1,hh-1));
          }else{
            var x0=13,dx=(w-x0)/nb,y=1+c*(h/2);
            g.fillRect(x0+k*dx,y,Math.max(1,dx-1),Math.max(2,h/2-3));
          }
        }
        if(cap>0){
          g.fillStyle="#f6f3dc";
          if(v.vertical){
            var bw=(w-18)/2;
            g.fillRect(6+c*(bw+6),Math.max(1,(h-17)*(1-cap)),bw,2);
          }else g.fillRect(Math.min(w-2,13+(w-13)*cap),1+c*(h/2),2,Math.max(2,h/2-3));
        }
        g.fillStyle="#b9cabb";g.font="bold 10.5px Arial";
        g.fillText(c?"D":"G",v.vertical?(c?w/2+6:8):1,v.vertical?h-3:10+c*(h/2));
      }
    }
    if(t-v.dateTexte>=250){
      v.dateTexte=t;
      v.canvas.setAttribute("aria-label","Crête numérique gauche "+nombre(e[0].pic)+", droite "+nombre(e[1].pic)+" dBFS");
    }
  }
  function equiperConsole(){
    if(!consoleEl){
      consoleEl=document.createElement("section"); consoleEl.id="rm-console";
      consoleEl.setAttribute("aria-label","Mesure de la sortie générale");
      consoleEl.title="Crêtes numériques G/D en dBFS, après protection, avant le volume Android. Trait clair : maximum maintenu 0,9 s. LIM : le limiteur réduit le gain. Les applications invitées et le son des appareils MIDI externes ne sont pas mesurés.";
      consoleEl.innerHTML='<div class="rm-master"><div class="rm-legende"><b>SORTIE G / D</b><output>−∞ / −∞ dBFS</output></div><canvas role="img" aria-label="Sortie générale"></canvas>'+signaux(false)+'</div><button id="rm-reset" type="button" title="Effacer les repères de crête et les alertes, sans changer le son">RAZ<br>CRÊTES</button>';
      table.insertBefore(consoleEl,pisteTable); vueConsole=vue(consoleEl.querySelector("canvas"),false);
      document.getElementById("rm-reset").addEventListener("click",reinitialiser);
    }
    Array.prototype.forEach.call(pisteTable.querySelectorAll(".voie"),function(col){
      var id=col.dataset.v;if(vues[id]) return;
      var cont=document.createElement("div");cont.className="rm-canal rm-indisponible";
      cont.title="Gauche et droite après fader/panoramique. CLIP : crête mesurée ≥ 0 dBFS avant la protection générale ; repère conservé 1,5 s.";
      cont.innerHTML='<span class="rm-clip">CRÊTE</span><canvas role="img" aria-label="Niveau de la voie"></canvas><output>—</output>';
      var bas=col.querySelector(".bas");bas.insertBefore(cont,bas.querySelector(".fad"));
      col.classList.add("rm-equipee");
      vues[id]={cont:cont,vue:vue(cont.querySelector("canvas"),true),sortie:cont.querySelector("output"),dateTexte:0};
    });
    transports=Array.prototype.slice.call(document.querySelectorAll(".rm-transport"));
    midis=Array.prototype.slice.call(document.querySelectorAll(".rm-midi"));
  }
  function visibleDans(e,limite){
    var r=e.getBoundingClientRect();
    return r.width>0 && r.height>0 && r.right>limite.left && r.left<limite.right && r.bottom>limite.top && r.top<limite.bottom;
  }
  function ecouterContexte(c){
    if(c===contexteEcoute) return;
    if(contexteEcoute) contexteEcoute.removeEventListener("statechange",reveiller);
    contexteEcoute=c;
    if(c) c.addEventListener("statechange",reveiller);
  }
  function supprimerLecteurs(){
    detacher(sortie);sortie=null;
    Object.keys(voies).forEach(function(k){detacher(voies[k]);});voies={};
  }
  function synchroniser(t){
    sale=false;derniereGeometrie=t;
    compacteVisible=compact.getClientRects().length>0;
    consoleVisible=table.classList.contains("show") && !document.body.inert;
    if(consoleVisible) equiperConsole();
    if(!transports.length){transports=[compact.querySelector(".rm-transport")];midis=[compact.querySelector(".rm-midi")];}
    if(compacteVisible) taille(vueCompacte);
    if(consoleVisible) taille(vueConsole);
    var c=typeof ctx!=="undefined" && ctx && !ctx.startRendering ? ctx : null;
    ecouterContexte(c);
    var mesure=c && c.__drmMesure;
    if(!c || c.state!=="running" || (!compacteVisible && !consoleVisible)){
      supprimerLecteurs();visibles=[];return;
    }
    if(!sortie || !mesure || sortie.source!==mesure.sortie){
      detacher(sortie);sortie=mesure?creer(mesure.sortie):null;
    }
    visibles=[];
    if(consoleVisible){
      var bord=pisteTable.getBoundingClientRect();
      Object.keys(vues).forEach(function(id){
        var v=vues[id];
        if(visibleDans(v.cont,bord)){visibles.push(id);taille(v.vue);}
      });
    }
    Object.keys(voies).forEach(function(id){
      var b=SET.bus[id];
      if(visibles.indexOf(id)<0 || !b || b.ctx!==c || voies[id].source!==(b.p||b.g)){
        detacher(voies[id]);delete voies[id];
      }
    });
    visibles.forEach(function(id){
      var b=SET.bus[id];
      if(!voies[id] && b && b.ctx===c){var r=creer(b.p||b.g);if(r) voies[id]=r;}
    });
  }
  function signauxActuels(t){
    if(typeof T_PAS==="number" && T_PAS!==dernierPas){dernierPas=T_PAS;tempsPas=t;}
    var rec=!!(typeof ENR!=="undefined" && ENR.actif) || (S.modele==="ko" && KO.rec);
    var attend=!!(S.run && MIDI.sync && SYNC.attente);
    var mode=rec?"rec":attend?"attente":S.run?"play":"stop";
    var label=rec?(S.run?"REC":"ARMÉ"):attend?"ATTENTE":S.run?"PLAY":"STOP";
    transports.forEach(function(e){
      e.dataset.etat=mode;texte(e.lastElementChild,label);
      var intensite=S.run?(reduire.matches?1:Math.max(.3,1-(t-tempsPas)/200)):.2;
      e.firstElementChild.style.opacity=String(intensite);
    });
    midis.forEach(function(e){e.dataset.on=t<midiJusqua?"1":"0";});
  }
  function viderAffichage(t){
    limiteJusqua=0;compact.classList.remove("rm-limite");
    if(consoleEl) consoleEl.classList.remove("rm-limite");
    if(compacteVisible) dessiner(vueCompacte,null,t);
    if(consoleVisible){
      dessiner(vueConsole,null,t);texte(consoleEl.querySelector("output"),"−∞ / −∞ dBFS");
      Object.keys(vues).forEach(function(id){
        var v=vues[id];v.cont.classList.remove("rm-surcharge");v.cont.classList.add("rm-indisponible");
        texte(v.cont.querySelector(".rm-clip"),"CRÊTE");texte(v.sortie,"—");dessiner(v.vue,null,t);
      });
    }
  }
  function tour(t){
    raf=0;frames++;
    if(document.hidden || document.body.inert){
      supprimerLecteurs();midiJusqua=0;viderAffichage(t);signauxActuels(t);return;
    }
    if(sale || t-derniereGeometrie>200) synchroniser(t);
    if(!compacteVisible && !consoleVisible){supprimerLecteurs();return;}
    var periode=reduire.matches?100:1000/30;
    if(t-dernierDessin<periode-1){raf=requestAnimationFrame(tour);return;}
    var dt=Math.max(0,Math.min(.25,(t-dernierDessin)/1000));dernierDessin=t;
    signauxActuels(t);
    if(!ctx || ctx.startRendering || ctx.state!=="running"){
      supprimerLecteurs();viderAffichage(t);
      if(t<midiJusqua) raf=requestAnimationFrame(tour);
      return;
    }
    if(sortie){
      if(!lire(sortie,t,dt)){detacher(sortie);sortie=null;sale=true;}
      else{
        if(compacteVisible) dessiner(vueCompacte,sortie,t);
        if(consoleVisible){
          dessiner(vueConsole,sortie,t);
          if(t-(vueConsole.dernierNombre||0)>=250){
            vueConsole.dernierNombre=t;
            texte(consoleEl.querySelector("output"),nombre(sortie.etats[0].pic)+" / "+nombre(sortie.etats[1].pic)+" dBFS");
          }
        }
      }
      var mesure=ctx.__drmMesure;
      if(sortie && Math.max(sortie.etats[0].pic,sortie.etats[1].pic)>0.001 &&
         mesure && mesure.limiteur && mesure.limiteur.reduction<=-1) limiteJusqua=t+250;
    }
    compact.classList.toggle("rm-limite",t<limiteJusqua);
    if(consoleEl) consoleEl.classList.toggle("rm-limite",t<limiteJusqua);
    visibles.forEach(function(id){
      var v=vues[id],r=voies[id];
      if(r && !lire(r,t,dt)){detacher(r);delete voies[id];r=null;sale=true;}
      v.cont.classList.toggle("rm-indisponible",!r);
      var clip=!!(r && r.clip>t);
      v.cont.classList.toggle("rm-surcharge",clip);texte(v.cont.querySelector(".rm-clip"),clip?"CLIP":"CRÊTE");
      dessiner(v.vue,r,t);
      if(t-v.dateTexte>=250){v.dateTexte=t;texte(v.sortie,r?nombre(Math.max(r.etats[0].pic,r.etats[1].pic)):"—");}
    });
    /* Pas de minuterie de secours ni de deuxième boucle par voie. */
    if(sortie || visibles.length || t<midiJusqua) raf=requestAnimationFrame(tour);
  }
  function reveiller(){sale=true;if(!raf) raf=requestAnimationFrame(tour);}
  function reinitialiser(){
    [sortie].concat(Object.keys(voies).map(function(k){return voies[k];})).forEach(function(r){
      if(!r) return;r.clip=0;r.etats.forEach(function(s){s.crete=MIN_DB;s.jusqua=0;});
    });
    limiteJusqua=0;reveiller();
  }
  function arreter(){if(raf) cancelAnimationFrame(raf);raf=0;supprimerLecteurs();}
  function visibilite(){
    arreter();sale=true;midiJusqua=0;limiteJusqua=0;tempsPas=-1000;
    viderAffichage(performance.now());signauxActuels(performance.now());
    if(!document.hidden) reveiller();
  }
  new MutationObserver(reveiller).observe(document.body,{attributes:true,attributeFilter:["class","inert"]});
  new MutationObserver(reveiller).observe(table,{attributes:true,attributeFilter:["class"]});
  pisteTable.addEventListener("scroll",reveiller,{passive:true});
  window.addEventListener("resize",reveiller,{passive:true});
  document.addEventListener("visibilitychange",visibilite);
  window.addEventListener("pagehide",arreter);
  window.addEventListener("pageshow",reveiller);
  ["pointerdown","click","keydown","input","change"].forEach(function(n){
    document.addEventListener(n,reveiller,{passive:true});
  });
  if(reduire.addEventListener) reduire.addEventListener("change",reveiller);
  else if(reduire.addListener) reduire.addListener(reveiller);
  /* Entrée MIDI de l'application, pas la preuve d'un périphérique externe.
     On transmet TOUJOURS les mêmes arguments et le même résultat, même entrée
     coupée. Ni les ticks d'horloge ni l'active sensing n'allument le voyant. */
  var reception=window.__midi;
  if(typeof reception==="function") window.__midi=function(a,b,c){
    var resultat=reception.apply(this,arguments);
    if(!document.hidden && !(typeof PROJET_EN_COURS!=="undefined" && PROJET_EN_COURS) &&
       !(WAVX.occupe || ENR.ondesOccupe) && a!==0xF8 && a!==0xFE){
      if(a>=0x80 && a<0xF0) midiJusqua=performance.now()+160;
      reveiller();
    }
    return resultat;
  };
  /* La table précédente mesurait toutes les voies avec son propre RAF, en
     mono et en octets. Le nouveau gestionnaire prend ce seul affichage en
     charge ; les analyseurs traversés par le son restent absolument intacts. */
  if(SET.anim) cancelAnimationFrame(SET.anim);
  SET.anim=null;
  boucleTable=function(){SET.anim=null;reveiller();};
  reveiller();
  return {
    reveiller:reveiller,
    inspecter:function(){
      function chiffres(r){return r?r.etats.map(function(s){return {pic:s.pic,barre:s.barre,crete:s.crete};}):null;}
      var canaux={};Object.keys(voies).forEach(function(k){canaux[k]=chiffres(voies[k]);});
      return {version:265,frames:frames,lectures:lectures,anime:!!raf,reduit:reduire.matches,
        lecteurs:(sortie?1:0)+Object.keys(voies).length,visibles:visibles.slice(),
        sortie:chiffres(sortie),voies:canaux,fft:FFT,plancher:MIN_DB};
    }
  };
})();
