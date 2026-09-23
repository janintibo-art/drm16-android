/* ================= COULEURS INDE / BALKANS / DABKÉ — v289 =================
   Synthèse originale, sans échantillons ni imitation d'un enregistrement.
   CORDE RÉSO et ANCHE LEAD : voix monophoniques, référence 55 Hz à 0 V ;
   V/OCT reste un signal audio, donc les glissés de MÉLO 32 sont conservés.
   PEAUX DUO : deux peaux indépendantes, modes résonants + attaque bruitée.
   Les réglages de timbre s'appliquent à la prochaine note/frappe. NIVEAU agit
   immédiatement (même chemin lissé que les potards natifs). Tout est numérique
   dans m.p ; aucun format de sauvegarde ni ancien module n'est remplacé. */
var EUR_COULEURS=(function(){
  "use strict";
  var B=EUR_RAVE.borne;
  var descriptions={
    cordesreso:{nom:"CORDE RÉSO",hp:128,sombre:false,fam:"couleurs",
      res:"Corde pincée électronique : harmoniques bourdonnantes et résonance. V/OCT 0 V = 55 Hz. Timbre à la prochaine note ; NIVEAU immédiat.",
      kns:[["oct","OCTAVE",-2,2,0],["fine","ACCORD cents",-100,100,0],["dec","CHUTE ms",60,2200,450],
        ["buzz","BOURDONNEMENT",0,1,.48],["res","RÉSONANCE",0,1,.35],["tone","BRILLANCE",0,1,.6],["niv","NIVEAU",0,1,.65]],
      jacks:[["trig","TRIG",0],["voct","V/OCT",0],["rst","RST",0],["out","OUT",1]]},
    anchelead:{nom:"ANCHE LEAD",hp:144,sombre:true,fam:"couleurs",
      res:"Anche électronique : doux vers nasal, vibrato et appel glissé. Évocation clarinette/zurna, pas une reproduction acoustique. V/OCT 0 V = 55 Hz.",
      kns:[["oct","OCTAVE",-2,2,0],["fine","ACCORD cents",-100,100,0],["dec","DURÉE ms",70,1800,280],
        ["attack","ATTAQUE ms",2,100,9],["mode","DOUX → NASAL",0,1,.65],["tone","BRILLANCE",0,1,.58],
        ["vib","VIBRATO cents",0,70,16],["rate","VIBRATO Hz",3,10,6],["grace","APPEL cents",0,200,35],["niv","NIVEAU",0,1,.55]],
      jacks:[["trig","TRIG",0],["voct","V/OCT",0],["rst","RST",0],["out","OUT",1]]},
    peauxduo:{nom:"PEAUX DUO",hp:128,sombre:false,fam:"couleurs",
      res:"Deux percussions modales : grave courbé et frappe aiguë. Couleur tabla vers doum électronique ; GRAVE/AIGU indépendants. OUT additionne les deux peaux.",
      kns:[["low","GRAVE Hz",55,180,82],["high","AIGU Hz",150,520,294],["dec","CHUTE ms",60,700,260],
        ["bend","COURBE GRAVE",0,1,.4],["mode","TABLA → DOUM",0,1,.15],["snap","FRAPPE",0,1,.45],["niv","NIVEAU",0,1,.65]],
      jacks:[["low","GRAVE",0],["high","AIGU",0],["rst","RST",0],["lowout","BAS",1],["highout","HAUT",1],["out","OUT",1]]}
  };
  function valeurs(type,raw){
    var p={},d=descriptions[type];if(!d)return p;
    d.kns.forEach(function(k){p[k[0]]=B(raw&&raw[k[0]],k[2],k[3],k[4]);});
    return p;
  }
  function normaliser(m){var p=valeurs(m.type,m.p);if(!m.p)m.p={};Object.keys(p).forEach(function(k){m.p[k]=p[k];});}
  /* Le cache est attaché au contexte : pas de rétention des anciens graphes.
     Le timbre du PeriodicWave est quantifié sur 32 positions ; l'oscillateur
     Web Audio élimine les harmoniques au-delà de Nyquist. */
  var ondes=new WeakMap(),bruits=new Map();
  function coefficients(type,x){
    x=B(x,0,1,0);var a=new Float32Array(49),b=new Float32Array(49),somme=0;
    for(var i=1;i<b.length;i++){
      b[i]=type==="cordesreso"?Math.pow(i,-(1.8-.7*x))*(i%2?.85:1):
        Math.pow(i,-1.25)*(i%2?1:x*.82);
      somme+=Math.abs(b[i]);
    }
    for(var j=1;j<b.length;j++)b[j]/=somme;return {real:a,imag:b};
  }
  function onde(type,x){
    var cache=ondes.get(ctx);if(!cache){cache=new Map();ondes.set(ctx,cache);}
    var n=Math.round(B(x,0,1,0)*32),key=type+":"+n;
    if(!cache.has(key)){var c=coefficients(type,n/32);cache.set(key,ctx.createPeriodicWave(c.real,c.imag,{disableNormalization:true}));}
    return cache.get(key);
  }
  function bruit(){
    var sr=ctx.sampleRate;if(bruits.has(sr))return bruits.get(sr);
    var b=ctx.createBuffer(1,Math.ceil(sr*.028),sr),d=b.getChannelData(0),seed=289,last=0;
    for(var i=0;i<d.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;var x=seed/2147483648-1;d[i]=(x-last)*.35;last=x;}
    if(bruits.size>=3)bruits.delete(bruits.keys().next().value);bruits.set(sr,b);return b;
  }
  function enveloppe(g,t,attack,d,peak){
    g.gain.setValueAtTime(0,t);if(peak<=0)return;g.gain.linearRampToValueAtTime(peak,t+attack);
    g.gain.exponentialRampToValueAtTime(.00001,t+attack+d);g.gain.setValueAtTime(0,t+attack+d+.002);
  }
  /* Le panier reçoit un groupe complet, pas uniquement son premier oscillateur.
     La source finissant la dernière nettoie aussi les connexions V/OCT entrantes.
     Aucun callback d'interface, aucune mesure/analyse pour décider une note. */
  function groupe(pool,t,d,voct){
    pool.couper(t);
    var gain=eurGain(1),src=[],noeuds=[gain],pitched=[],fin=t+d+.008;
    /* Point explicite au départ : sinon une future linearRamp du choke peut
       partir de t=0 et atténuer toute la voix avant son relâchement. */
    gain.gain.setValueAtTime(1,t);gain.gain.linearRampToValueAtTime(1,fin);
    return {gain:gain,src:src,noeuds:noeuds,fin:fin,
      hauteur:function(o){if(voct){voct.connect(o.detune);pitched.push(o);}},
      jouer:function(){
        var sentinelle=src[0];
        var source={stop:function(at){src.forEach(function(o){try{o.stop(at);}catch(ignore){}});}};
        Object.defineProperty(source,"onended",{set:function(f){sentinelle.onended=function(){
          if(voct)pitched.forEach(function(o){try{voct.disconnect(o.detune);}catch(ignore){}});f();
        };}});
        src.forEach(function(o){o.start(t);o.stop(fin);});pool.ajouter(source,gain,t,fin,noeuds);
      }};
  }
  function base(m){
    normaliser(m);var out=eurGain(m.p.niv),pools=[],ferme=false,barriere=0,dates={};
    m.maj=function(){normaliser(m);out.gain.value=m.p.niv;};
    function arreter(t){pools.forEach(function(p){p.couper(t);});dates={};barriere=t;}
    m.arreter=function(){if(!ferme)arreter(maintenantAudio());};
    m.couleurs={sources:function(){return pools.reduce(function(n,p){return n+p.nombre();},0);},ferme:function(){return ferme;}};
    return {out:out,pool:function(){var p=EUR_RAVE.panier();pools.push(p);return p;},
      accepter:function(t,e,ports){
        if(ferme||!Number.isFinite(t)||t<0||t<barriere)return false;
        if(e==="rst"){arreter(t);return false;}
        if(ports.indexOf(e)<0||(dates[e]!==undefined&&t<=dates[e]+.0000001))return false;
        dates[e]=t;return true;
      },detruire:function(){ferme=true;pools.forEach(function(p){p.detruire();});out.disconnect();}};
  }
  function corde(m){
    var c=base(m),pool=c.pool(),voct=eurGain(1200);
    m.recevoir=function(t,e){
      if(!c.accepter(t,e,["trig"]))return null;var p=valeurs(m.type,m.p),d=p.dec/1000;
      var g=groupe(pool,t,d*1.5,voct),mix=eurGain(1),lp=ctx.createBiquadFilter(),hp=ctx.createBiquadFilter();
      lp.type="lowpass";lp.Q.value=.55;lp.frequency.value=Math.min(ctx.sampleRate*.4,650*Math.pow(14,p.tone));
      hp.type="highpass";hp.frequency.value=35;hp.Q.value=.6;
      mix.connect(lp);lp.connect(hp);hp.connect(g.gain);g.gain.connect(c.out);g.noeuds.push(mix,lp,hp);
      [1,2,3].forEach(function(r,i){
        var o=ctx.createOscillator(),a=eurGain(0);o.frequency.value=55*Math.pow(2,p.oct)*r;o.detune.value=p.fine;
        if(i===0)o.setPeriodicWave(onde(m.type,p.buzz));else o.type="sine";
        g.hauteur(o);o.connect(a);a.connect(mix);g.src.push(o);g.noeuds.push(o,a);
        enveloppe(a,t,.002,i===0?d:d*1.45,i===0?.70:p.res*(i===1?.14:.09));
      });g.jouer();return null;
    };
    return {e:{trig:eurGain(1),rst:eurGain(1),voct:voct},s:{out:c.out},detruire:function(){c.detruire();voct.disconnect();}};
  }
  function anche(m){
    var c=base(m),pool=c.pool(),voct=eurGain(1200);
    m.recevoir=function(t,e){
      if(!c.accepter(t,e,["trig"]))return null;var p=valeurs(m.type,m.p),d=p.dec/1000,a=Math.min(p.attack/1000,d*.3);
      var g=groupe(pool,t,a+d,voct),o=ctx.createOscillator(),vib=ctx.createOscillator(),vg=eurGain(0),lp=ctx.createBiquadFilter(),amp=eurGain(0);
      o.frequency.value=55*Math.pow(2,p.oct);o.setPeriodicWave(onde(m.type,p.mode));g.hauteur(o);
      o.detune.setValueAtTime(p.fine-p.grace,t);o.detune.linearRampToValueAtTime(p.fine,t+Math.min(.045,d*.35));
      vib.type="sine";vib.frequency.value=p.rate;vg.gain.setValueAtTime(0,t);vg.gain.linearRampToValueAtTime(p.vib,t+Math.min(.07,d*.4));vib.connect(vg);vg.connect(o.detune);
      lp.type="lowpass";lp.Q.value=.55;lp.frequency.value=Math.min(ctx.sampleRate*.4,800*Math.pow(12,p.tone));
      o.connect(lp);lp.connect(amp);amp.connect(g.gain);g.gain.connect(c.out);
      amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(.65,t+a);
      amp.gain.linearRampToValueAtTime(.48,t+a+d*.65);amp.gain.linearRampToValueAtTime(0,t+a+d);
      g.src.push(o,vib);g.noeuds.push(o,vib,vg,lp,amp);g.jouer();return null;
    };
    return {e:{trig:eurGain(1),rst:eurGain(1),voct:voct},s:{out:c.out},detruire:function(){c.detruire();voct.disconnect();}};
  }
  function peaux(m){
    var c=base(m),pools={low:c.pool(),high:c.pool()},low=eurGain(.5),high=eurGain(.5),masterMaj=m.maj;
    /* Chaque peau est calibrée à 0,5 : une frappe double garde de la marge.
       Les sorties séparées sont après NIVEAU, comme OUT ; ne pas brancher OUT
       et les deux sorties dans le même mixeur sauf pour doubler volontairement. */
    low.connect(c.out);high.connect(c.out);
    var lowout=eurGain(m.p.niv),highout=eurGain(m.p.niv);low.connect(lowout);high.connect(highout);
    m.maj=function(){masterMaj();lowout.gain.value=m.p.niv;highout.gain.value=m.p.niv;};
    m.recevoir=function(t,e){
      if(!c.accepter(t,e,["low","high"]))return null;var p=valeurs(m.type,m.p),grave=e==="low",d=p.dec/1000*(grave?1:.60),f=grave?p.low:p.high;
      var g=groupe(pools[e],t,d,null),hp=ctx.createBiquadFilter();hp.type="highpass";hp.Q.value=.5;hp.frequency.value=35;hp.connect(g.gain);g.gain.connect(grave?low:high);g.noeuds.push(hp);
      [1,2-p.mode*.5,3-p.mode*.8].forEach(function(r,i){
        var o=ctx.createOscillator(),a=eurGain(0);o.type="sine";
        o.frequency.setValueAtTime(f*r*(1+(grave?.34:.025)*p.bend),t);o.frequency.exponentialRampToValueAtTime(f*r,t+.02+d*.2);
        o.connect(a);a.connect(hp);g.src.push(o);g.noeuds.push(o,a);enveloppe(a,t,.0015,d/(1+i*.6),[.46,.23,.12][i]);
      });
      var n=ctx.createBufferSource(),ng=eurGain(0);n.buffer=bruit();n.connect(ng);ng.connect(hp);g.src.push(n);g.noeuds.push(n,ng);
      enveloppe(ng,t,.0006,grave?.010:.017,p.snap*(grave?.22:.40));g.jouer();return null;
    };
    return {e:{low:eurGain(1),high:eurGain(1),rst:eurGain(1)},s:{lowout:lowout,highout:highout,out:c.out},detruire:function(){c.detruire();[low,high,lowout,highout].forEach(function(n){n.disconnect();});}};
  }
  descriptions.cordesreso.creer=corde;descriptions.anchelead.creer=anche;descriptions.peauxduo.creer=peaux;
  Object.keys(descriptions).forEach(function(k){EUR_CAT[k]=descriptions[k];EUR_ORDRE.push(k);});
  EUR_FAM.push(["couleurs","CORDES / ANCHES / PEAUX"]);
  return {valeurs:valeurs,normaliser:normaliser,coefficients:coefficients,types:Object.keys(descriptions)};
})();
