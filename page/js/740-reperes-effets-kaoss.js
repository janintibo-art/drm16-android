/* v272 — Valeurs XY et schémas de réglage du KAOSS PAD.
   Lecture seule : ni KP, ni mémoire, ni AudioParam ne sont écrits ici.
   Les formules reflètent appliquerKp() ; ce sont des CIBLES au toucher,
   pas des mesures du son ni une réponse fréquentielle calculée du filtre.
   Un dessin sur événement, sans boucle d'animation au repos ou sous un outil. */
var REPERES_KAOSS = (function(){
  "use strict";
  var pav=document.getElementById("kp-pav"), point=document.getElementById("kp-point");
  var raf=null, horsPage=false, masque=true, reduire=window.matchMedia("(prefers-reduced-motion: reduce)");
  var frames=0, dessins=0, derniereImage=-Infinity, derniereCle="", modele=null, contexte=null;
  var largeur=0, hauteur=0, densite=0, compact=false, dessinPossible=false;
  var boite, canvas, g, description, xLabel, xValeur, yLabel, yValeur, legende;
  var panneaux=["menu","note","bib","enr","pr","table","syro","studio","nexus","audio-diagnostic"]
    .map(function(id){return document.getElementById(id);}).filter(Boolean);
  function nombre(v,d){return typeof v==="number" && Number.isFinite(v)?v:d;}
  function borne(v,d){return Math.max(0,Math.min(1,nombre(v,d)));}
  function decimal(v,n){return v.toFixed(n).replace(".",",");}
  function pourcent(v){return Math.round(v*100)+" %";}
  function frequence(v){return v>=1000?decimal(v/1000,2)+" kHz":decimal(v,v<10?2:0)+" Hz";}
  function duree(v){return v>=1?decimal(v,2)+" s":decimal(v*1000,v<.01?1:0)+" ms";}
  function db(v){return (v>0?"+":"")+decimal(Math.abs(v)<.00005?0:v,1)+" dB";}
  function texte(e,t){if(e && e.textContent!==t)e.textContent=t;}
  function attr(e,k,v){if(e && e.getAttribute(k)!==v)e.setAttribute(k,v);}
  function axe(label,valeur,affiche){return {label:label,valeur:valeur,affiche:affiche};}
  function calculer(fx,x,y,prof,bpm){
    fx=Math.max(0,Math.min(14,Math.floor(nombre(fx,0))));
    x=borne(x,.5);y=borne(y,.5);prof=borne(prof,.8);
    bpm=Math.max(1,nombre(bpm,120));
    var nom=KP_EFFETS[fx][0],v=y*prof, a,b,extra={};
    if(nom==="filtre" || nom==="haut" || nom==="bande"){
      var f=nom==="filtre"?80*Math.pow(220,x):nom==="haut"?40*Math.pow(300,x):60*Math.pow(250,x);
      var q=.7+v*(nom==="filtre"?22:nom==="haut"?20:18);
      a=axe(nom==="bande"?"FRÉQUENCE":"COUPURE",f,frequence(f));
      b=axe(nom==="bande"?"SÉLECTIVITÉ":"RÉSONANCE",q,"Q "+decimal(q,1));
    }else if(nom==="delai"){
      a=axe("TEMPS",.02+x*.7,duree(.02+x*.7));b=axe("RÉINJECTION",v*.88,pourcent(v*.88));
      extra.retour=.9*prof;
    }else if(nom==="grain"){
      a=axe("VITESSE",1+x*28,frequence(1+x*28));b=axe("PROFONDEUR",v,pourcent(v));
    }else if(nom==="ring"){
      var r=20*Math.pow(180,x);a=axe("FRÉQUENCE",r,frequence(r));b=axe("MÉLANGE",v,pourcent(v));
    }else if(nom==="crush"){
      var m=Math.max(2,Math.round(2+(1-x)*40));
      a=axe("RÉSOLUTION",1/m,"PAS 1/"+m);b=axe("MÉLANGE",v,pourcent(v));extra.quantification=m;
    }else if(nom==="verb"){
      a=axe("BRILLANCE",500+x*15000,frequence(500+x*15000));
      b=axe("RETOUR FX",v*1.2,pourcent(v*1.2));
    }else if(nom==="pitch"){
      var r2=Math.pow(2,(x*2-1)*prof),tau=.004+y*.16;
      a=axe("VITESSE",r2,"× "+decimal(r2,2));b=axe("GLISS. τ",tau,duree(tau));
    }else if(nom==="flanger"){
      var fl=.05*Math.pow(100,x);a=axe("VITESSE",fl,frequence(fl));b=axe("RÉINJECTION",v*.85,pourcent(v*.85));
      extra.balayage=.0025*prof;
    }else if(nom==="phaser"){
      var ph=.05*Math.pow(160,x);a=axe("VITESSE",ph,frequence(ph));b=axe("BALAYAGE",.7*v,pourcent(.7*v));
      extra.bases=[300,750,1600,3200];
    }else if(nom==="dist"){
      var k=Math.round((1+x*40*prof)*2)/2,f2=800*Math.pow(22,y);
      a=axe("SATURATION",k,"k "+decimal(k,1));b=axe("TIMBRE",f2,frequence(f2));
    }else if(nom==="isol"){
      var gain=(y<.8?-40*(.8-y)/.8:6*(y-.8)/.2)*prof;
      var poids=[Math.max(0,1-x*2),1-Math.abs(x*2-1),Math.max(0,x*2-1)];
      var bande=x===0?"GRAVE":x<.5?"GRAVE/MÉD.":x===.5?"MÉDIUM":x<1?"MÉD./AIGU":"AIGU";
      a=axe("BANDE",x,bande);b=axe("NIVEAU CIBLE",gain,db(gain));
      extra.poids=poids;extra.bandes=poids.map(function(p){return p*gain;});
    }else if(nom==="pan"){
      var pan=.25*Math.pow(48,x);a=axe("VITESSE",pan,frequence(pan));b=axe("PROFONDEUR",v,pourcent(v));
    }else if(nom==="boucle"){
      var L=[1,2,4,8,16][Math.min(4,Math.floor(x*5))];
      a=axe("LONGUEUR",L,L===16?"1 MES.":"1/"+(16/L)+" MES.");b=axe("MÉLANGE",v,pourcent(v));
      extra.duree=Math.min(7.9,L*60/bpm/4);
    }
    return {fx:fx,nom:nom,x:x,y:y,prof:prof,bpm:bpm,axes:[a,b],extra:extra};
  }
  function estMasque(){
    if(!pav || horsPage || document.hidden || document.body.inert || S.modele!=="kp" || document.body.classList.contains("ensemble"))return true;
    if(typeof PROJET_DEMARRAGE!=="undefined" && PROJET_DEMARRAGE.bloque)return true;
    if(typeof PROJET_EN_COURS!=="undefined" && PROJET_EN_COURS)return true;
    if(typeof WAVX!=="undefined" && WAVX.occupe)return true;
    if(typeof ENR!=="undefined" && ENR.ondesOccupe)return true;
    if(typeof ctx!=="undefined" && ctx && ctx.startRendering)return true;
    if(panneaux.some(function(e){return e.id==="menu"?!e.classList.contains("hide"):e.classList.contains("show");}))return true;
    if(!pav.getClientRects().length || pav.closest("[inert]"))return true;
    var r=pav.getBoundingClientRect();return r.width<=0 || r.height<=0 || r.bottom<=0 || r.top>=innerHeight || r.right<=0 || r.left>=innerWidth;
  }
  function arreter(){if(raf!==null)cancelAnimationFrame(raf);raf=null;}
  function reveiller(){
    masque=estMasque();
    if(masque){arreter();return;}
    var c=typeof ctx!=="undefined" && ctx && !ctx.startRendering?ctx:null;
    if(c!==contexte){
      if(contexte)contexte.removeEventListener("statechange",reveiller);
      contexte=c;if(c)c.addEventListener("statechange",reveiller);
    }
    if(raf===null)raf=requestAnimationFrame(tour);
  }
  function chemin(points){
    g.beginPath();points.forEach(function(p,i){if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1]);});g.stroke();
  }
  function schema(m){
    if(!g || !dessinPossible)return;
    var w=largeur,h=hauteur,cy=h*.52;
    g.setTransform(densite,0,0,densite,0,0);g.clearRect(0,0,w,h);
    g.strokeStyle="#718199";g.lineWidth=1;
    chemin([[0,cy],[w,cy]]);
    g.strokeStyle="#304763";g.lineWidth=1.6;g.lineCap="round";g.lineJoin="round";
    var points=[],nom=m.nom;
    if(nom==="isol"){
      var base=h*.25;
      g.strokeStyle="#657891";chemin([[0,base],[w,base]]);
      m.extra.bandes.forEach(function(v,i){
        var bx=w*(.16+i*.33),bh=-v/40*h*.55;
        g.fillStyle="#334f73a0";g.fillRect(bx-w*.09,Math.min(base,base+bh),w*.18,Math.max(2,Math.abs(bh)));
        g.fillStyle="#293d58";g.font="10.5px Arial";g.textAlign="center";g.fillText(["GRAVE","MÉDIUM","AIGU"][i],bx,h-3);
      });
    }else if(nom==="boucle"){
      var L=m.axes[0].valeur;
      for(var i=0;i<16;i++){
        g.fillStyle=i<L?"#344e72bb":"#73829866";g.fillRect(i*w/16+1,h*.12,Math.max(1,w/16-3),h*.38);
      }
      g.fillStyle="#293d58";g.font="11px Arial";g.textAlign="center";g.fillText(duree(m.extra.duree)+" · "+Math.round(m.bpm)+" BPM",w/2,h*.83);
    }else if(nom==="delai" || nom==="verb"){
      for(var j=0;j<8;j++){
        var pos=(j+1)*w/9,amp=(nom==="delai"?Math.pow(m.axes[1].valeur,j):Math.exp(-j*.42))*h*.39;
        chemin([[pos,cy-amp],[pos,cy+amp]]);
      }
    }else{
      for(var i=0;i<=80;i++){
        var u=i/80,y=0;
        if(nom==="filtre" || nom==="haut" || nom==="bande"){
          var z=(u-m.x)*12;
          y=nom==="bande"?Math.exp(-z*z*(.2+m.y*.6)):nom==="filtre"?1/(1+Math.exp(z)):1/(1+Math.exp(-z));
          points.push([u*w,h*(.85-y*.7)]);continue;
        }
        if(nom==="grain")y=Math.sin(u*Math.PI*(2+10*m.x))>=0?1:1-2*m.y*m.prof;
        else if(nom==="dist")y=Math.tanh((u*2-1)*m.axes[0].valeur)/Math.tanh(m.axes[0].valeur);
        else if(nom==="crush")y=Math.round(Math.sin(u*Math.PI*4)*m.extra.quantification)/m.extra.quantification;
        else if(nom==="pan")y=Math.sin(u*Math.PI*2)*(m.y*m.prof);
        else if(nom==="ring")y=Math.sin(u*Math.PI*4)*Math.sin(u*Math.PI*(3+15*m.x));
        else if(nom==="pitch")y=Math.sin(u*Math.PI*6*m.axes[0].valeur);
        else y=Math.sin(u*Math.PI*(nom==="flanger"?12:8))*(.2+.8*m.y*m.prof);
        points.push([u*w,cy-y*h*.36]);
      }
      chemin(points);
    }
  }
  function dessiner(){
    modele=calculer(KP.fx,KP.x,KP.y,KP.prof,S.bpm);
    var w=pav.clientWidth,h=pav.clientHeight;
    compact=w<300 || h<225;attr(pav,"data-rk-compact",compact?"1":"0");
    dessinPossible=!compact && w>=300 && h>=235 && !!g;
    if(canvas)canvas.hidden=!dessinPossible;
    var nw=Math.max(1,w-24),nh=Math.max(1,h-162),nd=Math.min(2,window.devicePixelRatio||1);
    if(nw!==largeur || nh!==hauteur || nd!==densite){
      largeur=nw;hauteur=nh;densite=nd;
      if(canvas){canvas.width=Math.round(nw*nd);canvas.height=Math.round(nh*nd);}
      derniereCle="";
    }
    texte(xLabel,"X · "+modele.axes[0].label);texte(yLabel,"Y · "+modele.axes[1].label);
    texte(xValeur,modele.axes[0].affiche);texte(yValeur,modele.axes[1].affiche);
    var actif=!!(KP.touche || KP.tenu || KP.rejoue),repos=!actif;
    var etat=KP.muet?"MUTE":contexte && contexte.state!=="running"?"AUDIO EN PAUSE":repos?"AU TOUCHER":"CIBLES FX";
    texte(legende,"RÉGLAGES · "+etat+" · "+Math.round(modele.prof*100)+" %");
    var d="Réglages, pas une mesure sonore. "+KP_EFFETS[modele.fx][1]+". X : "+modele.axes[0].label+" "+modele.axes[0].affiche+
      ". Y : "+modele.axes[1].label+" "+modele.axes[1].affiche+". FX DEPTH "+Math.round(modele.prof*100)+" pour cent. "+etat+".";
    if(modele.nom==="pitch")d+=" Le glissement indique la constante de temps tau, pas une durée totale.";
    if(modele.nom==="crush")d+=" Résolution : intervalle de quantification de l'amplitude, pas un nombre de bits.";
    if(modele.nom==="verb")d+=" Retour FX : gain ajouté au son sec, pas une proportion sec-mouillé.";
    if(modele.nom==="isol")d+=" Gains par bande : "+modele.extra.bandes.map(db).join(", ")+".";
    if(modele.nom==="boucle")d+=" Longueur visée : "+duree(modele.extra.duree)+". Schéma des seize doubles croches.";
    texte(description,d);
    var cle=JSON.stringify([modele,largeur,hauteur,densite,dessinPossible]);
    if(cle!==derniereCle){derniereCle=cle;schema(modele);dessins++;}
  }
  function tour(t){
    raf=null;masque=estMasque();if(masque)return;
    var periode=reduire.matches?100:1000/30;
    if(t-derniereImage<periode-1){raf=requestAnimationFrame(tour);return;}
    derniereImage=t;frames++;dessiner();
    /* Aucune relance ici : seul un événement natif commande le dessin suivant. */
  }
  function visibilite(){arreter();derniereCle="";reveiller();}
  if(pav && point){
    boite=document.createElement("div");boite.id="rk-valeurs";boite.setAttribute("aria-hidden","true");
    boite.innerHTML='<div class="rk-axe"><span class="rk-label" id="rk-x-label"></span><b class="rk-valeur" id="rk-x-valeur"></b></div><div class="rk-axe"><span class="rk-label" id="rk-y-label"></span><b class="rk-valeur" id="rk-y-valeur"></b></div><span id="rk-legende"></span>';
    canvas=document.createElement("canvas");canvas.id="rk-schema";canvas.setAttribute("aria-hidden","true");
    try{g=canvas.getContext("2d");}catch(e){g=null;}
    description=document.createElement("span");description.id="rk-description";
    pav.insertBefore(canvas,pav.firstChild);pav.appendChild(boite);pav.appendChild(description);
    xLabel=document.getElementById("rk-x-label");xValeur=document.getElementById("rk-x-valeur");
    yLabel=document.getElementById("rk-y-label");yValeur=document.getElementById("rk-y-valeur");legende=document.getElementById("rk-legende");
    var ancien=pav.getAttribute("aria-describedby");pav.setAttribute("aria-describedby",(ancien?ancien+" ":"")+description.id);
    pav.classList.add("rk-equipe");
    var o=new MutationObserver(reveiller);
    o.observe(point,{attributes:true,attributeFilter:["style"]});
    o.observe(document.body,{attributes:true,attributeFilter:["class","inert"]});
    panneaux.forEach(function(e){o.observe(e,{attributes:true,attributeFilter:["class","hidden"]});});
    ["kp-val","kp-tempo"].forEach(function(id){var e=document.getElementById(id);if(e)o.observe(e,{subtree:true,childList:true,characterData:true});});
    ["kp-hold","kp-rejoue","kp-play","kp-mute"].forEach(function(id){var e=document.getElementById(id);if(e)o.observe(e,{attributes:true,attributeFilter:["class"]});});
    ["click","input","change","pointerup","pointercancel","keyup"].forEach(function(n){
      document.addEventListener(n,reveiller,{passive:true});
    });
    if(window.ResizeObserver)new ResizeObserver(reveiller).observe(pav);
    window.addEventListener("resize",reveiller,{passive:true});
    document.addEventListener("scroll",reveiller,{passive:true,capture:true});
    document.addEventListener("visibilitychange",visibilite);
    window.addEventListener("pagehide",function(){horsPage=true;visibilite();});
    window.addEventListener("pageshow",function(){horsPage=false;visibilite();});
    if(reduire.addEventListener)reduire.addEventListener("change",visibilite);else reduire.addListener(visibilite);
    reveiller();
  }
  return {calculer:calculer,reveiller:reveiller,inspecter:function(){return {version:272,frames:frames,dessins:dessins,
    enAttente:raf!==null,masque:masque,compact:compact,schema:dessinPossible,reduit:reduire.matches,
    largeur:largeur,hauteur:hauteur,densite:densite,modele:modele?JSON.parse(JSON.stringify(modele)):null};}};
})();
