/* v266 — Vue des gestes. N'écrit ni KP/VLC, ni mémoire, ni AudioParam.
   Kaoss : positions DÉJÀ appliquées, sans interpolation sonore ou temporelle.
   Volca : valeurs programmées du pas AFFICHÉ, pas mesure de la sortie audio.
   Le séquenceur, les écouteurs tactiles et les aiguilles manuelles restent intacts. */
var GESTES_MUSICAUX = (function(){
  "use strict";
  var raf=null, frames=0, dessins=0, derniereImage=-Infinity, horsPage=false;
  var reduire=window.matchMedia("(prefers-reduced-motion: reduce)");
  var pav=document.getElementById("kp-pav"), point=document.getElementById("kp-point");
  var canvas=null, g=null, largeur=0, hauteur=0, densite=0, tailleSale=true;
  var trace=[], precedent=null, ancienTour=-1, dernierEtat="", derniereCle="";
  var pointsSauves=[], sourceMotion=null, tailleMotion=-1, dernierPoint=null;
  var kpVisible=false, vlcVisible=false, geomSale=true;
  var modeEl, compteEl, xyEl, sourceEl, description;
  var anneaux=[], infoVlc, detailVlc, etatVlc, partieVlc, dernierParam="";
  var dernierVlc=[], contexte=null;
  var panneaux=["menu","note","bib","enr","pr","table","syro","studio","nexus","audio-diagnostic"]
    .map(function(id){return document.getElementById(id);}).filter(Boolean);

  function texte(e,v){if(e && e.textContent!==v)e.textContent=v;}
  function attr(e,k,v){if(e.getAttribute(k)!==v)e.setAttribute(k,v);}
  function nombre(v){return typeof v==="number" && Number.isFinite(v);}
  function borne(v){return nombre(v)?Math.max(0,Math.min(1,v)):0.5;}
  function masque(){
    if(horsPage || document.hidden || document.body.inert || document.body.classList.contains("ensemble"))return true;
    if(typeof PROJET_DEMARRAGE!=="undefined" && PROJET_DEMARRAGE.bloque)return true;
    if(typeof PROJET_EN_COURS!=="undefined" && PROJET_EN_COURS)return true;
    if(typeof WAVX!=="undefined" && WAVX.occupe)return true;
    if(typeof ENR!=="undefined" && ENR.ondesOccupe)return true;
    if(typeof ctx!=="undefined" && ctx && ctx.startRendering)return true;
    return panneaux.some(function(e){return e.id==="menu"?!e.classList.contains("hide"):e.classList.contains("show");});
  }
  function enVue(e){
    if(!e || !e.getClientRects().length || e.closest("[inert]"))return false;
    var r=e.getBoundingClientRect();
    return r.width>0 && r.height>0 && r.bottom>0 && r.top<innerHeight && r.right>0 && r.left<innerWidth;
  }
  function visible(){
    kpVisible=false;vlcVisible=false;
    if(masque())return false;
    kpVisible=S.modele==="kp" && !!g && enVue(pav);
    vlcVisible=S.modele==="vlc" && enVue(document.getElementById("unit-vlc"));
    return kpVisible || vlcVisible;
  }
  function contexteActuel(){
    var c=typeof ctx!=="undefined" && ctx && !ctx.startRendering?ctx:null;
    if(c!==contexte){
      if(contexte)contexte.removeEventListener("statechange",reveiller);
      contexte=c;if(c)c.addEventListener("statechange",reveiller);
    }
    return c;
  }
  function lecture(){var c=contexteActuel();return !!(S.run && c && c.state==="running");}
  function taille(){
    if(!tailleSale)return;
    tailleSale=false;
    /* Dimensions locales : le pinch-zoom doit agrandir la même géométrie,
       pas changer les coordonnées. Une seule surface, densité limitée à 2. */
    var w=Math.max(1,pav.clientWidth),h=Math.max(1,pav.clientHeight),d=Math.min(2,window.devicePixelRatio||1);
    if(w!==largeur || h!==hauteur || d!==densite){
      largeur=w;hauteur=h;densite=d;canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);
      derniereCle="";
    }
  }
  function memoriserTrace(){
    var a=Array.isArray(KP.motion)?KP.motion:[],n=Math.min(256,a.length),fin=n?a[n-1]:null;
    if(sourceMotion===a && tailleMotion===n && dernierPoint===fin)return;
    sourceMotion=a;tailleMotion=n;dernierPoint=fin;pointsSauves=[];
    for(var i=0;i<n;i++){
      var p=a[i];
      /* Une donnée invalide coupe la ligne, sans relier ses deux voisins. */
      pointsSauves.push(Array.isArray(p) && nombre(p[0]) && nombre(p[1])?[borne(p[0]),borne(p[1])]:null);
    }
    derniereCle="";
  }
  function chemin(points,couleur,epaisseur){
    var ouvert=false;g.beginPath();
    points.forEach(function(p){
      if(!p){ouvert=false;return;}
      var x=p[0]*largeur,y=(1-p[1])*hauteur;
      if(ouvert)g.lineTo(x,y);else g.moveTo(x,y);
      ouvert=true;
    });
    g.strokeStyle=couleur;g.lineWidth=epaisseur;g.lineJoin="round";g.lineCap="round";g.stroke();
  }
  function dessinerKp(t,joue){
    taille();memoriserTrace();
    var x=borne(KP.x),y=borne(KP.y),n=pointsSauves.length;
    var actif2=!!(KP.touche || KP.tenu || KP.rejoue);
    var mouvement=KP.enregistre?(joue?"rec":"arme"):
      KP.touche?"direct":KP.rejoue && n?(joue?"lecture":"pret"):KP.tenu?"hold":"repos";
    var p=KP.rejoue && n && joue?((KP.mpos-1+n)%n):-1;
    if(reduire.matches)trace=[];
    else if(KP.touche || (KP.rejoue && joue && n)){
      /* Pas de trait qui traverse le pavé entre deux gestes ou au rebouclage. */
      if(p>=0 && ancienTour>=0 && p<ancienTour){trace=[];precedent=null;}
      if(!precedent || Math.abs(x-precedent[0])+Math.abs(y-precedent[1])>.001){
        trace.push([x,y,t]);if(trace.length>32)trace.shift();precedent=[x,y];
      }
    }else precedent=null;
    ancienTour=p;
    while(trace.length && t-trace[0][2]>520)trace.shift();
    var noms={rec:"REC PAD",arme:"REC ARMÉ",direct:"DIRECT",lecture:"PAD MOTION",pret:"REJEU PRÊT",hold:"HOLD",repos:"PAVÉ XY"};
    var compte=KP.enregistre?n+" / 256":p>=0?"PT "+(p+1)+" / "+n:n?n+" POINT"+(n>1?"S":""):"AUCUN GESTE";
    attr(pav,"data-gm-etat",mouvement);
    texte(modeEl,noms[mouvement]);texte(compteEl,compte);
    texte(xyEl,"X "+Math.round(x*100)+" · Y "+Math.round(y*100));
    texte(sourceEl,KP.muet?"MUTE":n?"GESTE MÉMORISÉ":"TOUCHER / HOLD");
    var desc=noms[mouvement]+". X "+Math.round(x*100)+", Y "+Math.round(y*100)+". "+compte+(KP.muet?". Sortie muette.":".");
    texte(description,desc);
    var cle=[largeur,hauteur,densite,x,y,mouvement,p,n,KP.fx,KP.muet,actif2,trace.length,
      trace.length?Math.floor(t/34):0].join("/");
    if(cle===derniereCle)return;
    derniereCle=cle;dernierEtat=mouvement;dessins++;
    g.setTransform(densite,0,0,densite,0,0);g.clearRect(0,0,largeur,hauteur);
    /* Guides réagissant aux coordonnées, pas animation décorative autonome. */
    if(actif2){
      g.strokeStyle="#a9b4c12c";g.lineWidth=1;g.beginPath();
      g.moveTo(x*largeur,0);g.lineTo(x*largeur,hauteur);
      g.moveTo(0,(1-y)*hauteur);g.lineTo(largeur,(1-y)*hauteur);g.stroke();
    }
    var col=mouvement==="rec"?"#e89aaa":mouvement==="lecture"?"#97cdb9":"#8796b2";
    if(n){
      chemin(pointsSauves,"#0c1420",4);chemin(pointsSauves,col,1.6);
      var premier=pointsSauves[0],dernier=pointsSauves[n-1];
      if(premier){g.fillStyle=col;g.fillRect(premier[0]*largeur-3,(1-premier[1])*hauteur-3,6,6);}
      if(dernier){g.strokeStyle=col;g.lineWidth=1.5;g.beginPath();g.arc(dernier[0]*largeur,(1-dernier[1])*hauteur,4,0,Math.PI*2);g.stroke();}
      if(p>=0 && pointsSauves[p]){
        var q=pointsSauves[p];g.strokeStyle="#cdf3e3";g.lineWidth=2;g.beginPath();g.arc(q[0]*largeur,(1-q[1])*hauteur,7,0,Math.PI*2);g.stroke();
      }
    }
    for(var i=1;i<trace.length;i++){
      var a=trace[i-1],b=trace[i],alpha=Math.max(0,1-(t-b[2])/520);
      g.globalAlpha=alpha*.85;chemin([a,b],mouvement==="rec"?"#ff9eae":"#d2e1f7",2.6);
    }
    g.globalAlpha=1;
  }

  function creerAnneaux(){
    infoVlc=document.createElement("div");infoVlc.id="gm-vlc-info";infoVlc.setAttribute("aria-live","off");
    infoVlc.innerHTML='<span class="gm-vlc-partie"></span><span id="gm-vlc-detail"></span><span id="gm-vlc-etat"></span><span class="gm-vlc-legende">Bague : valeur du pas · aiguille : réglage manuel</span>';
    var kns=document.getElementById("vlc-kns");kns.parentNode.insertBefore(infoVlc,kns);
    partieVlc=infoVlc.querySelector(".gm-vlc-partie");detailVlc=document.getElementById("gm-vlc-detail");etatVlc=document.getElementById("gm-vlc-etat");
    VLC_PARAMS.forEach(function(p){
      var el=document.getElementById("vlc-k-"+p[0]),bt=el && el.querySelector(".bt");if(!bt)return;
      var anneau=document.createElement("span");anneau.className="gm-anneau";anneau.hidden=true;anneau.setAttribute("aria-hidden","true");
      anneau.innerHTML='<svg viewBox="0 0 100 100" focusable="false"><path class="gm-piste" d="M 21.075 84.472 A 45 45 0 1 1 78.925 84.472"/><path class="gm-arc" pathLength="100" d="M 21.075 84.472 A 45 45 0 1 1 78.925 84.472"/><g class="gm-marqueur"><circle cx="50" cy="5" r="5"/></g></svg>';
      var d=document.createElement("span");d.className="gm-description";d.id="gm-vlc-"+p[0]+"-description";
      el.appendChild(d);bt.appendChild(anneau);
      var decrit=el.getAttribute("aria-describedby");el.setAttribute("aria-describedby",(decrit?decrit+" ":"")+d.id);
      el.addEventListener("pointerdown",function(){dernierParam=p[0];reveiller();},{passive:true});
      el.addEventListener("pointermove",function(e){if(e.buttons || e.pressure>0)reveiller();},{passive:true});
      anneaux.push({nom:p[0],label:p[1],el:el,anneau:anneau,arc:anneau.querySelector(".gm-arc"),description:d});
    });
  }
  function dessinerVlc(joue){
    var P=partieVlcSel(),pas=joue?VLC.pos:-1,rec=!!(VLC.rec && !VLC.song),nb=0,choix=null;
    var etat=rec?(joue?"rec":"arme"):P.f.mute?"muet":joue?"lecture":"stop";
    var resume=[];
    anneaux.forEach(function(a){
      var m=P.mot[a.nom],stocke=Array.isArray(m) && m.slice(0,16).some(function(v){return nombre(v)&&v>=0;});
      if(stocke)nb++;
      /* Pas vide (-1) : la voix utilise la valeur manuelle ; aucun faux point
         d'automatisation n'est donc ajouté sur ce pas. */
      var v=stocke && pas>=0 && pas<16 && nombre(m[pas]) && m[pas]>=0?Math.max(0,Math.min(127,m[pas])):null;
      var e=etat;
      if(joue && !P.f.mute && v===null && !rec)e="vide";
      a.anneau.hidden=!stocke && !rec;
      attr(a.anneau,"data-etat",e);
      if(v!==null && !P.f.mute){
        attr(a.anneau,"data-valeur",String(v));
        a.anneau.style.setProperty("--gm-angle",(-140+280*v/127).toFixed(2)+"deg");
        attr(a.arc,"stroke-dasharray",(100*v/127).toFixed(2)+" 100");
      }else if(a.anneau.hasAttribute("data-valeur"))a.anneau.removeAttribute("data-valeur");
      var desc=!stocke?(rec?"MOTION armé. ":""):"MOTION mémorisé. ";
      desc+=v!==null?"Valeur programmée "+Math.round(v)+" sur 127 au pas "+(pas+1)+".":joue?"Aucune variation sur ce pas.":"Lecture arrêtée.";
      if(P.f.mute)desc+=" Partie muette.";
      texte(a.description,desc);
      if(stocke && (!choix || a.nom===dernierParam))choix={a:a,v:v};
      resume.push({nom:a.nom,stocke:!!stocke,valeur:v,etat:e,visible:!a.anneau.hidden});
    });
    dernierVlc=resume;
    attr(infoVlc,"data-etat",etat);texte(partieVlc,"MOTION · P"+(VLC.sel+1));
    var detail=choix?choix.a.label+" "+(choix.v===null?"—":Math.round(choix.v)+"/127"):rec?"TOURNEZ UN POTARD":"AUCUN MOUVEMENT";
    if(nb>1)detail+=" · "+nb+" PARAM.";
    texte(detailVlc,detail);
    texte(etatVlc,etat==="rec"?"REC":etat==="arme"?"ARMÉ":etat==="muet"?"MUTE":joue?"PAS "+(pas>=0?String(pas+1).padStart(2,"0"):"—"):"STOP");
  }
  function arreter(){if(raf!==null)cancelAnimationFrame(raf);raf=null;}
  function reveiller(){
    geomSale=true;
    if(masque()){arreter();trace=[];precedent=null;kpVisible=vlcVisible=false;return;}
    if(S.modele!=="kp" && S.modele!=="vlc")return;
    if(raf===null)raf=requestAnimationFrame(tour);
  }
  function tour(t){
    raf=null;
    if(geomSale){geomSale=false;if(!visible()){trace=[];precedent=null;return;}}
    if(masque()){arreter();trace=[];precedent=null;kpVisible=vlcVisible=false;return;}
    var periode=reduire.matches?100:1000/30;
    if(t-derniereImage<periode-1){raf=requestAnimationFrame(tour);return;}
    derniereImage=t;frames++;
    var joue=lecture();
    if(kpVisible)dessinerKp(t,joue);
    if(vlcVisible)dessinerVlc(joue);
    /* Pas de polling à l'arrêt, en HOLD immobile ou sur la volca.
       Le beat et les gestes réveillent une seule image lorsque nécessaire. */
    if(kpVisible && ((joue && (KP.enregistre || KP.rejoue)) || trace.length))raf=requestAnimationFrame(tour);
  }
  function redimensionner(){tailleSale=true;reveiller();}
  function visibilite(){arreter();trace=[];precedent=null;ancienTour=-1;derniereCle="";redimensionner();}
  function reveilBeat(machine){
    /* Enveloppe seulement beat(), qui peint le curseur. schedule(), arret(),
       longueur(), paramètres, arguments, this et valeur de retour sont conservés. */
    var avant=machine.beat;
    machine.beat=function(){var r=avant.apply(this,arguments);reveiller();return r;};
  }
  if(pav && point){
    canvas=document.createElement("canvas");canvas.id="gm-kp-canvas";canvas.setAttribute("aria-hidden","true");
    try{g=canvas.getContext("2d");}catch(e){g=null;}
    if(g){
      pav.insertBefore(canvas,point);
      var haut=document.createElement("div");haut.className="gm-kp-haut";haut.innerHTML='<span id="gm-kp-mode"></span><span id="gm-kp-compte"></span>';
      var bas=document.createElement("div");bas.className="gm-kp-bas";bas.innerHTML='<span id="gm-kp-xy"></span><span id="gm-kp-source"></span>';
      description=document.createElement("span");description.id="gm-kp-description";
      pav.appendChild(haut);pav.appendChild(bas);pav.appendChild(description);
      var ancienDesc=pav.getAttribute("aria-describedby");pav.setAttribute("aria-describedby",(ancienDesc?ancienDesc+" ":"")+description.id);
      modeEl=document.getElementById("gm-kp-mode");compteEl=document.getElementById("gm-kp-compte");xyEl=document.getElementById("gm-kp-xy");sourceEl=document.getElementById("gm-kp-source");
      pav.classList.add("gm-equipe");
      /* L'ancienne trace DOM reste en place comme repli sans canvas. Quand le
         canvas fonctionne, plus besoin de fabriquer 128 pastilles invisibles. */
      majTraceKp=function(){sourceMotion=null;reveiller();};
      document.getElementById("kp-trace").textContent="";
      pav.addEventListener("pointerdown",function(){trace=[];precedent=null;ancienTour=-1;reveiller();},{passive:true});
      ["pointermove","pointerup","pointercancel","lostpointercapture"].forEach(function(n){pav.addEventListener(n,reveiller,{passive:true});});
      new MutationObserver(reveiller).observe(point,{attributes:true,attributeFilter:["style"]});
      if(window.ResizeObserver)new ResizeObserver(redimensionner).observe(pav);
    }
  }
  creerAnneaux();reveilBeat(MACHINE_KP);reveilBeat(MACHINE_VLC);
  var observateur=new MutationObserver(reveiller);
  observateur.observe(document.body,{attributes:true,attributeFilter:["class","inert"]});
  panneaux.forEach(function(e){observateur.observe(e,{attributes:true,attributeFilter:["class","hidden"]});});
  ["kp-hold","kp-motion","kp-rejoue","kp-play","kp-mute","vlc-motion","vlc-play","vlc-mute","vlc-rec","vlc-song"].forEach(function(id){
    var e=document.getElementById(id);if(e)observateur.observe(e,{attributes:true,attributeFilter:["class"]});
  });
  /* Une sélection/MUTE arrivant du MIDI ne produit pas de clic. Les classes
     natives et le numéro de motif réveillent aussi la vue, même à l'arrêt. */
  var parts=document.getElementById("vlc-parts"),motif=document.getElementById("vlc-motif");
  if(parts)observateur.observe(parts,{subtree:true,attributes:true,attributeFilter:["class"]});
  if(motif)observateur.observe(motif,{childList:true,characterData:true,subtree:true});
  ["click","pointerup","pointercancel","input","change","keyup","wheel"].forEach(function(n){document.addEventListener(n,reveiller,{passive:true});});
  document.addEventListener("scroll",redimensionner,{passive:true,capture:true});
  window.addEventListener("resize",redimensionner,{passive:true});
  document.addEventListener("visibilitychange",visibilite);
  window.addEventListener("pagehide",function(){horsPage=true;visibilite();});
  window.addEventListener("pageshow",function(){horsPage=false;visibilite();});
  if(reduire.addEventListener)reduire.addEventListener("change",visibilite);else reduire.addListener(visibilite);
  reveiller();
  return {reveiller:reveiller,inspecter:function(){return {version:266,frames:frames,dessins:dessins,anime:raf!==null,reduit:reduire.matches,
    kpVisible:kpVisible,vlcVisible:vlcVisible,trace:trace.length,points:pointsSauves.length,etat:dernierEtat,
    largeur:largeur,hauteur:hauteur,densite:densite,volca:dernierVlc.map(function(v){return Object.assign({},v);})};}};
})();
