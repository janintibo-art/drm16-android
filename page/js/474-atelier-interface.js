/* v286 : atelier tactile dans le Focus. Dessins des réglages uniquement, sans
   animation ni analyseur. La courbe ne prétend pas mesurer le son ou le CV. */
var EUR_KICKBASS_UI=(function(){
  "use strict";
  var K=EUR_KICKBASS,vues=[];
  function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!==undefined)e.textContent=txt;return e;}
  function fmt(v){return String(Math.round(v*100)/100).replace(".",",");}
  function pas(k){return k[0]==="tune"||k[0]==="sweep"||k[0]==="knee"?.1:k[3]<=4?.01:1;}
  function bouton(p,txt,fn,c){var b=el("button",c,txt);b.type="button";b.addEventListener("click",function(e){e.stopPropagation();fn();});p.appendChild(b);return b;}
  var sons=[
    ["PSY COURT",{tune:55,dec:105,sweep:29,knee:0,fall:12,settle:22,drive:.04,tone:.4,click:.2,clickdec:4}],
    ["GABBER LONG",{tune:49,dec:280,sweep:20,knee:5,fall:14,settle:100,drive:.77,tone:.55,click:.3,clickdec:7}],
    ["UPTEMPO SEC",{tune:62,dec:88,sweep:42,knee:8,fall:6,settle:30,drive:.9,tone:.76,click:.48,clickdec:3}]
  ];
  var baisses=[
    ["DISCRET",{depth:6,attack:4,hold:8,release:90,shape:1}],
    ["PSY SERRÉ",{depth:22,attack:2,hold:15,release:95,shape:1.8}],
    ["POMPAGE LONG",{depth:28,attack:3,hold:35,release:320,shape:2.2}]
  ];
  function tracer(canvas,m){
    var kick=m.type==="kicklab",p=kick?K.profilKick(m.p):K.profilDuck(m.p),g=canvas.getContext("2d");if(!g)return;
    var w=canvas.width,h=canvas.height,x0=16,y0=12,w2=w-32,h2=h-24;
    g.clearRect(0,0,w,h);g.fillStyle="#0b1118";g.fillRect(0,0,w,h);
    g.strokeStyle="#253443";g.lineWidth=1;
    for(var i=0;i<=4;i++){g.beginPath();g.moveTo(x0+i*w2/4,y0);g.lineTo(x0+i*w2/4,h-y0);g.stroke();g.beginPath();g.moveTo(x0,y0+i*h2/4);g.lineTo(w-x0,y0+i*h2/4);g.stroke();}
    var max=kick?Math.max.apply(null,p.points.map(function(x){return x[1];}))*1.1:1;
    function y(v){return y0+h2*(1-(kick?Math.log(Math.max(15,v)/15)/Math.log(max/15):v));}
    g.strokeStyle=kick?"#f3bc73":"#67d9d0";g.lineWidth=3;g.beginPath();
    if(kick){
      /* Le DSP fait des rampes exponentielles en Hz : sur notre axe logarithmique
         les sommets sont reliés par des droites. */
      p.points.forEach(function(a,i){var x=x0+a[0]/p.duree*w2;if(i)g.lineTo(x,y(a[1]));else g.moveTo(x,y(a[1]));});
    }else p.points.forEach(function(a,i){var x=x0+a[0]/p.duree*w2;if(i)g.lineTo(x,y(a[1]));else g.moveTo(x,y(a[1]));});
    g.stroke();
    if(kick){g.fillStyle="#ffe3b5";p.points.forEach(function(a){g.beginPath();g.arc(x0+a[0]/p.duree*w2,y(a[1]),4,0,Math.PI*2);g.fill();});}
  }
  function rafraichir(m){vues=vues.filter(function(v){return v.el.isConnected && EUR.mods.indexOf(v.m)>=0;});vues.forEach(function(v){if(v.m===m)v.maj();});}
  function interfaceModule(parent,m,grand){
    var kick=m.type==="kicklab",root=el("section","kb-atelier "+(grand?"kb-grand":"kb-mini")+(kick?" kb-kick":" kb-duck"));
    root.dataset.module=m.id;parent.appendChild(root);var champs={},message=null,destruction=false;
    function valide(){return !destruction && root.isConnected && EUR.mods.indexOf(m)>=0;}
    var titre=el("p","kb-sur",kick?"COURBE DE HAUTEUR":"GAIN APRÈS LE KICK");root.appendChild(titre);
    var cadre=grand?el("div","kb-dessin"):bouton(root,"",function(){if(valide())EUR_FOCUS.ouvrir(m.id);},"kb-dessin kb-ouvrir");
    if(grand)root.appendChild(cadre);else cadre.setAttribute("aria-label","Ouvrir l'atelier "+EUR_CAT[m.type].nom);
    var canvas=el("canvas","kb-courbe");canvas.width=grand?640:280;canvas.height=grand?180:150;canvas.setAttribute("aria-hidden","true");cadre.appendChild(canvas);
    var resume=el("output","kb-resume");root.appendChild(resume);
    function mettre(k,v){
      if(!valide()||!Number.isFinite(v))return;
      v=Math.round(Math.max(k[2],Math.min(k[3],v))*100)/100;
      enLissant(function(){m.p[k[0]]=v;if(m.maj)m.maj();});memEur();rafraichir(m);
    }
    if(grand){
      root.appendChild(el("p","kb-explication",kick?
        "Courbe calculée avant V/OCT, pas une mesure sonore. Les deux temps se raccourcissent si la queue est trop courte. Les changements s'appliquent aux prochaines frappes.":
        "Courbe de gain programmée, pas un VU-mètre. Réglez la baisse puis le retour de la basse : les nouveaux réglages s'appliquent au prochain TRIG. 0 dB = aucun effet."));
      var presets=el("div","kb-presets");root.appendChild(presets);
      (kick?sons:baisses).forEach(function(x){bouton(presets,x[0],function(){
        if(!valide()||!window.confirm("Appliquer « "+x[0]+" » ? Les réglages de ce module seront remplacés"+(kick?", sauf son niveau":"")+". Les câbles restent en place."))return;
        enLissant(function(){Object.keys(x[1]).forEach(function(k){m.p[k]=x[1][k];});if(m.maj)m.maj();});memEur();rafraichir(m);
      },"kb-preset");});
      var controles=el("div","kb-controles");root.appendChild(controles);
      K.parametres(m.type).forEach(function(k){
        var l=el("div","kb-reglage"),label=el("span","kb-label",k[1]);l.appendChild(label);controles.appendChild(l);
        var slider=el("input","kb-range");slider.type="range";slider.min=k[2];slider.max=k[3];slider.step=pas(k);slider.dataset.param=k[0];slider.setAttribute("aria-label",EUR_CAT[m.type].nom+" "+k[1]);
        slider.addEventListener("input",function(){mettre(k,+slider.value);});l.appendChild(slider);
        var precision=el("div","kb-precision");l.appendChild(precision);
        var moins=bouton(precision,"−",function(){mettre(k,m.p[k[0]]-pas(k));},"kb-moins");moins.setAttribute("aria-label","Diminuer "+k[1]);
        var nombre=el("input","kb-nombre");nombre.type="text";nombre.inputMode="decimal";nombre.dataset.nombre=k[0];nombre.setAttribute("aria-label","Valeur précise "+k[1]);
        nombre.addEventListener("change",function(){
          var t=nombre.value.trim().replace(",",".");
          if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(t)||!Number.isFinite(Number(t))){nombre.setAttribute("aria-invalid","true");message.textContent="Saisie incorrecte : le réglage précédent est conservé.";return;}
          nombre.removeAttribute("aria-invalid");message.textContent="";mettre(k,Number(t));nombre.value=fmt(m.p[k[0]]);
        });precision.appendChild(nombre);
        var plus=bouton(precision,"+",function(){mettre(k,m.p[k[0]]+pas(k));},"kb-plus");plus.setAttribute("aria-label","Augmenter "+k[1]);
        champs[k[0]]={slider:slider,nombre:nombre};
      });
      message=el("p","kb-message");message.setAttribute("role","status");root.appendChild(message);
      root.appendChild(el("p","kb-cablage",kick?
        "CÂBLAGE : séquenceur → TRIG ; OUT → mixeur ; HIT → TRIG de DUCK TRIG. Pour un kick mélodique : MÉLO 32 CV → V/OCT, GATE → TRIG, FOND = 55 Hz. Le CV reste continu : la queue suit aussi les changements de hauteur.":
        "CÂBLAGE : sortie de basse → IN ; OUT → mixeur ou VCA de groupe ; HIT de KICK LAB (ou porte du séquenceur) → TRIG. GAIN CV sort de 0 à 1 V pour un autre VCA réglé à gain 0. IN/OUT conservent la stéréo. STOP/RST annulent les baisses futures et rétablissent le gain en 3 ms."));
    }
    function maj(){
      var p=K.valeurs(m.type,m.p);Object.keys(champs).forEach(function(k){
        var c=champs[k];c.slider.value=p[k];c.slider.setAttribute("aria-valuetext",fmt(p[k]));
        if(document.activeElement!==c.nombre){c.nombre.value=fmt(p[k]);c.nombre.removeAttribute("aria-invalid");}
      });
      if(kick){var profil=K.profilKick(p);resume.textContent=fmt(p.tune)+" Hz · "+fmt(p.dec)+" ms"+(grand?" · descente réelle "+fmt(profil.points[1][0]*1000)+" + "+fmt((profil.points[2][0]-profil.points[1][0])*1000)+" ms":"");}
      else resume.textContent="−"+fmt(p.depth)+" dB · retour "+fmt(p.release)+" ms";
      tracer(canvas,m);
    }
    /* eurDessiner remplace ses miniatures sans appeler detruire : purger les
       vues détachées à chaque nouvelle inscription, pas seulement au réglage. */
    var v={el:root,m:m,maj:maj};vues=vues.filter(function(x){return x.el.isConnected && EUR.mods.indexOf(x.m)>=0;});vues.push(v);maj();
    return {rafraichir:maj,detruire:function(){destruction=true;vues=vues.filter(function(x){return x!==v;});}};
  }
  ["kicklab","ducktrig"].forEach(function(type){EUR_CAT[type].interface=interfaceModule;EUR_CAT[type].focusLabel="SCULPTEZ LE KICK ET LA PLACE DE LA BASSE";EUR_CAT[type].focusValeur="ATELIER";});
  return {rafraichir:rafraichir};
})();
