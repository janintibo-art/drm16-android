/* ================= Module Focus Eurorack — v262 =================
   Vue de commande uniquement : aucun clone de module audio, aucun eurBatir
   à l'ouverture/fermeture. Les paramètres restent dans les objets EUR.mods ;
   les jacks délèguent au câblage existant. Pas de boucle d'animation au repos. */
var EUR_FOCUS = (function(){
  var piste = document.getElementById("eur-piste"), rack = document.getElementById("eur-rack");
  var mod = null, controles = [], caches = [], retour = null, dernier = null;
  var root = document.createElement("div");
  root.id = "eur-focus";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "ef-titre");
  root.innerHTML = '<section class="ef-panneau">' +
    '<header class="ef-tete"><div class="ef-identite"><span class="ef-sur">EURORACK / MODULE FOCUS</span>' +
    '<h2 id="ef-titre"></h2><div id="ef-detail" class="ef-detail"></div></div>' +
    '<button type="button" id="eur-focus-fermer" aria-label="Fermer le Focus et revenir au rack">RETOUR<br>AU RACK</button></header>' +
    '<nav class="ef-nav" aria-label="Parcourir les modules">' +
    '<button type="button" id="ef-precedent" aria-label="Module précédent">‹</button>' +
    '<label class="ef-navigation"><span>MODULE DU RACK</span><select id="ef-choix"></select></label>' +
    '<button type="button" id="ef-suivant" aria-label="Module suivant">›</button></nav>' +
    '<div class="ef-lcd"><span id="ef-lab">TOUCHEZ UN RÉGLAGE</span><output id="ef-val">—</output></div>' +
    '<div class="ef-zone"><div class="ef-module"><div class="ef-module-titre"></div><p class="ef-description"></p>' +
    '<div class="ef-knobs"></div><div class="ef-jacks"></div></div>' +
    '<div class="ef-infos"><p id="ef-patch" role="status" aria-live="polite"></p>' +
    '<button type="button" id="ef-annuler" hidden>ANNULER LA LIAISON</button>' +
    '<p class="ef-aide">Glissez un potard verticalement. Écartez le doigt sur le côté pour affiner. ' +
    'Les valeurs en % indiquent la course du réglage, pas des Hz ou des secondes.<br>' +
    'Câblage : touchez une sortie, changez de module, puis touchez une entrée. ' +
    'Sans sortie en attente, toucher une entrée reliée retire son câble.</p></div></div>' +
    '<footer class="ef-pied"><span>Le patch continue de jouer.</span>' +
    '<button type="button" id="ef-transport">▶ JOUER</button></footer></section>';
  document.body.appendChild(root);
  function q(s){ return root.querySelector(s); }
  var zone=q(".ef-zone"), face=q(".ef-module"), choix=q("#ef-choix");
  var entree = document.createElement("button");
  entree.id = "eur-focus-ouvrir"; entree.type = "button"; entree.textContent = "FOCUS";
  entree.title = "Agrandir le module sélectionné ; double-tap possible sur son titre";
  entree.setAttribute("aria-haspopup", "dialog"); entree.setAttribute("aria-controls", root.id);
  document.querySelector("#unit-eur .eur-ligne").appendChild(entree);
  PANNEAUX.push(root.id);

  function valide(){ return !!mod && S.modele === "eur" && EUR.mods.indexOf(mod) >= 0; }
  function valeur(k,v){
    if(k[2] === 0 && k[3] === 1) return String(Math.round(v*1000)/10).replace(".",",") + " %";
    return String(Math.round(v*1000)/1000).replace(".",",");
  }
  function selectionner(){
    EUR.sel = EUR.mods.indexOf(mod);
    piste.querySelectorAll(".eur-mod").forEach(function(e){
      e.classList.toggle("choisi", +e.dataset.i === EUR.sel);
    });
  }
  function proteger(){
    caches = [];
    Array.prototype.forEach.call(document.body.children, function(e){
      if(e === root || /^(SCRIPT|STYLE|LINK)$/.test(e.tagName)) return;
      caches.push({e:e, inert:e.getAttribute("inert"), aria:e.getAttribute("aria-hidden")});
      e.setAttribute("inert", ""); e.setAttribute("aria-hidden", "true");
    });
  }
  function liberer(){
    caches.forEach(function(c){
      if(c.inert === null) c.e.removeAttribute("inert"); else c.e.setAttribute("inert",c.inert);
      if(c.aria === null) c.e.removeAttribute("aria-hidden"); else c.e.setAttribute("aria-hidden",c.aria);
    });
    caches = [];
  }
  function lacher(){ controles.forEach(function(c){ c.fin(); }); }
  function fermer(rendreFocus){
    if(!mod) return;
    lacher(); mod = null; controles = []; dernier = null;
    root.classList.remove("show");
    liberer(); majNoteOuverte();
    /* Les petits potards ont leur propre cache de valeur : le resynchroniser
       sans redessiner le rack, sans changer scrollLeft et sans toucher au son. */
    EUR_KNOBS.forEach(function(k){ k.maj(); });
    if(rendreFocus !== false && S.modele === "eur" && !panneauVisible() && !document.body.classList.contains("menu-ouvert")){
      var e = retour && retour.isConnected && retour !== document.body ? retour : entree;
      e.focus({preventScroll:true});
    }
    retour = null;
  }
  function ouvrir(id){
    var m = eurMod(+id);
    if(!m || S.modele !== "eur" || document.body.classList.contains("menu-ouvert")) return false;
    var premier = !mod;
    if(premier){
      retour = document.activeElement;
      fermerAutresPanneaux(root.id);
    }
    lacher(); mod = m;
    selectionner(); dessiner();
    if(premier){
      root.classList.add("show"); majNoteOuverte();
      /* Déplacer le focus avant de masquer sémantiquement son ancien parent. */
      q("#eur-focus-fermer").focus({preventScroll:true}); proteger();
    }
    return true;
  }
  function majListe(){
    var ancien = mod ? String(mod.id) : "";
    choix.textContent = "";
    EUR.mods.forEach(function(m,i){
      var o = document.createElement("option"); o.value = m.id;
      o.textContent = (i+1) + " · " + EUR_CAT[m.type].nom + " · R" + (m.r === 1 ? 2 : 1);
      choix.appendChild(o);
    });
    choix.value = ancien;
    var i = EUR.mods.indexOf(mod);
    q("#ef-precedent").disabled = i <= 0;
    q("#ef-suivant").disabled = i < 0 || i >= EUR.mods.length-1;
    if(mod) q("#ef-detail").textContent = "MODULE " + (i+1) + " / " + EUR.mods.length + " · RANGÉE " + (mod.r === 1 ? 2 : 1);
  }
  function lire(c,affiche){
    var v = c.m.p[c.k[0]], k = c.k, t = valeur(k,v);
    c.el.setAttribute("aria-valuenow", String(v)); c.el.setAttribute("aria-valuetext",t);
    c.el.querySelector("output").textContent = t;
    c.el.querySelector("i").style.transform = "rotate("+(-140+280*(v-k[2])/(k[3]-k[2]))+"deg)";
    if(affiche){ q("#ef-lab").textContent = EUR_CAT[c.m.type].nom + " · " + k[1]; q("#ef-val").textContent=t; }
  }
  function regler(c,v){
    if(!valide() || c.m !== mod){ fermer(false); return; }
    v = Math.max(c.k[2], Math.min(c.k[3],v));
    if(!Number.isFinite(v)) return;
    enLissant(function(){ c.m.p[c.k[0]]=v; if(c.m.maj) c.m.maj(); });
    lire(c,true);
    var original = document.getElementById("eur-k-"+c.m.id+"-"+c.k[0]);
    if(original){
      var pin = original.querySelector("i");
      if(pin) pin.style.transform="rotate("+(-140+280*(v-c.k[2])/(c.k[3]-c.k[2]))+"deg)";
    }
    memEur();
  }
  function boutonRotatif(m,k){
    var e=document.createElement("div"); e.className="ef-kn";
    e.dataset.param=k[0]; e.tabIndex=0;
    e.setAttribute("role","slider"); e.setAttribute("aria-orientation","vertical");
    e.setAttribute("aria-label",EUR_CAT[m.type].nom+" "+k[1]);
    e.setAttribute("aria-valuemin",String(k[2])); e.setAttribute("aria-valuemax",String(k[3]));
    e.innerHTML='<div class="ef-dial" aria-hidden="true"><i></i></div><span></span><output aria-hidden="true"></output>';
    e.querySelector("span").textContent=k[1];
    q(".ef-knobs").appendChild(e);
    var c={el:e,m:m,k:k,drag:null,fin:function(){
      var d=c.drag; c.drag=null; e.classList.remove("ef-reglage");
      if(d && e.hasPointerCapture(d.id)) e.releasePointerCapture(d.id);
    }};
    e.addEventListener("pointerdown",function(ev){
      if(!ev.isPrimary || ev.button !== 0 || !valide()) return;
      c.drag={id:ev.pointerId,x:ev.clientX,y:ev.clientY};
      e.setPointerCapture(ev.pointerId); e.classList.add("ef-reglage");
      e.focus({preventScroll:true}); lire(c,true); ev.preventDefault();
    });
    e.addEventListener("pointermove",function(ev){
      var d=c.drag;
      if(!d || d.id!==ev.pointerId) return;
      var delta=d.y-ev.clientY; d.y=ev.clientY;
      var finesse=1+Math.min(9,Math.abs(ev.clientX-d.x)/26);
      if(ev.shiftKey) finesse=10;
      if(delta) regler(c,c.m.p[k[0]]+delta*(k[3]-k[2])/(190*finesse));
      ev.preventDefault();
    });
    ["pointerup","pointercancel","lostpointercapture"].forEach(function(type){
      e.addEventListener(type,function(ev){ if(c.drag && c.drag.id===ev.pointerId) c.fin(); });
    });
    e.addEventListener("wheel",function(ev){
      ev.preventDefault();
      var d=ev.deltaY*(ev.deltaMode===1?33:ev.deltaMode===2?100:1);
      if(d) regler(c,c.m.p[k[0]]-d/100*(k[3]-k[2])/(ev.shiftKey?400:40));
    },{passive:false});
    e.addEventListener("keydown",function(ev){
      var v=c.m.p[k[0]], pas=(k[3]-k[2])/(ev.shiftKey?1000:100);
      if(ev.key==="ArrowUp" || ev.key==="ArrowRight") v+=pas;
      else if(ev.key==="ArrowDown" || ev.key==="ArrowLeft") v-=pas;
      else if(ev.key==="Home") v=k[2];
      else if(ev.key==="End") v=k[3];
      else return;
      ev.preventDefault(); regler(c,v);
    });
    e.addEventListener("focus",function(){ lire(c,true); });
    controles.push(c); lire(c,false);
  }
  function priseOriginale(m,j){
    return piste.querySelector('.eur-j[data-m="'+m+'"][data-j="'+j+'"]');
  }
  function majJacks(){
    if(!valide()) return;
    q(".ef-jacks").querySelectorAll("button").forEach(function(e){
      var nom=e.dataset.j, sortie=e.dataset.s==="1";
      var n=EUR.cables.filter(function(c){ var p=sortie?c.de:c.vers; return p[0]===mod.id && p[1]===nom; }).length;
      var attend=!!EUR.attente && EUR.attente.m===mod.id && EUR.attente.j===nom && sortie;
      e.classList.toggle("ef-connecte",n>0); e.classList.toggle("ef-attente",attend);
      e.setAttribute("aria-pressed",String(attend));
      var info=(sortie?"SORTIE":"ENTRÉE") + (attend?" · CHOISIE":n?" · "+n+" LIEN"+(n>1?"S":""):" · LIBRE");
      e.querySelector("small").textContent=info;
      e.setAttribute("aria-label",e.querySelector("span").textContent+" · "+info);
    });
    q("#ef-annuler").hidden=!EUR.attente;
    if(EUR.attente){
      var source=eurMod(EUR.attente.m);
      q("#ef-patch").textContent="SORTIE "+EUR.attente.j.toUpperCase()+" · "+(source?EUR_CAT[source.type].nom:"MODULE")+
        " choisie. Touchez une entrée ; le sélecteur ci-dessus permet de changer de module.";
    } else q("#ef-patch").textContent=EUR.cables.length+" câble"+(EUR.cables.length>1?"s":"")+" dans le rack. Les prises bleutées sont reliées.";
  }
  function majTransport(){
    q("#ef-transport").textContent=S.run?"■ ARRÊTER":"▶ JOUER";
    q("#ef-transport").classList.toggle("ef-joue",S.run);
    q("#ef-transport").setAttribute("aria-pressed",String(S.run));
    q(".ef-pied span").textContent=S.run?"LECTURE EN COURS":"TRANSPORT ARRÊTÉ";
  }
  function dessiner(){
    controles=[]; q(".ef-knobs").textContent=""; q(".ef-jacks").textContent="";
    var d=EUR_CAT[mod.type]; face.classList.toggle("ef-sombre",!!d.sombre);
    q("#ef-titre").textContent=d.nom; q(".ef-module-titre").textContent=d.nom;
    q(".ef-description").textContent=d.res || "";
    q("#ef-lab").textContent="TOUCHEZ UN RÉGLAGE"; q("#ef-val").textContent="—";
    d.kns.forEach(function(k){ boutonRotatif(mod,k); });
    d.jacks.forEach(function(j){
      var e=document.createElement("button"); e.type="button";
      e.className="ef-jack"+(j[2]?" ef-sortie":"");e.dataset.j=j[0];e.dataset.s=j[2];
      e.innerHTML='<i aria-hidden="true"></i><span></span><small></small>';
      e.querySelector("span").textContent=j[1];
      e.addEventListener("click",function(){
        if(!valide()){ fermer(false); return; }
        var prise=priseOriginale(mod.id,j[0]);
        /* HTMLElement.click() reste possible sur le rack inert : aucun nouvel
           algorithme de câblage, ni copie de EUR.cables, dans cette vue. */
        if(prise) prise.click();
        majJacks();
      });
      q(".ef-jacks").appendChild(e);
    });
    majListe(); majJacks(); majTransport(); zone.scrollTop=0;
  }
  function rafraichir(){
    entree.disabled=EUR.mods.length===0;
    piste.querySelectorAll(".eur-mod>b").forEach(function(e){
      e.title="Double-tap pour agrandir ce module";e.tabIndex=0;
      e.setAttribute("role","button");e.setAttribute("aria-haspopup","dialog");
      e.setAttribute("aria-label",e.textContent+" : double-tap ou Entrée pour le Focus");
    });
    if(!mod) return;
    if(!valide()){ fermer(false); return; }
    selectionner(); majListe(); majJacks(); majTransport();
    controles.forEach(function(c){ lire(c,false); });
  }
  function parcourir(sens){
    if(!valide()){ fermer(false); return; }
    var m=EUR.mods[EUR.mods.indexOf(mod)+sens];
    if(m) ouvrir(m.id);
  }
  entree.addEventListener("click",function(){
    var m=EUR.mods[EUR.sel] || EUR.mods[0];
    if(m) ouvrir(m.id);
  });
  q("#eur-focus-fermer").addEventListener("click",function(){ fermer(); });
  q("#ef-precedent").addEventListener("click",function(){ parcourir(-1); });
  q("#ef-suivant").addEventListener("click",function(){ parcourir(1); });
  choix.addEventListener("change",function(){ ouvrir(+choix.value); });
  q("#ef-annuler").addEventListener("click",function(){
    EUR.attente=null;
    piste.querySelectorAll(".eur-j.attente").forEach(function(e){ e.classList.remove("attente"); });
    majLcdEur(); majJacks();
  });
  q("#ef-transport").addEventListener("click",function(){ document.getElementById("eur-play").click();majTransport(); });
  /* Les deux clics peuvent viser DEUX éléments DOM différents : le premier
     sélectionne et redessine déjà le rack. On retient donc l'identité du module,
     pas celle du titre. Les potards et les jacks gardent leurs propres gestes. */
  piste.addEventListener("click",function(e){
    if(e.target.closest(".eur-kn,.eur-j")) return;
    var bloc=e.target.closest(".eur-mod");
    if(!bloc) return;
    var m=EUR.mods[+bloc.dataset.i], maintenant=Date.now();
    if(m && dernier && dernier.m===m && maintenant-dernier.t<360){
      e.preventDefault(); e.stopImmediatePropagation(); dernier=null; ouvrir(m.id);
    } else dernier=m?{m:m,t:maintenant}:null;
  },true);
  piste.addEventListener("keydown",function(e){
    if(e.key!=="Enter" && e.key!==" ") return;
    if(!e.target.matches(".eur-mod>b")) return;
    var m=EUR.mods[+e.target.parentElement.dataset.i];
    if(m){ e.preventDefault(); e.stopPropagation(); ouvrir(m.id); }
  });
  root.addEventListener("keydown",function(e){
    /* Ne pas lancer le transport derrière un bouton pressé avec Espace. */
    e.stopPropagation();
    if(e.key==="Escape"){e.preventDefault();fermer();return;}
    if(e.key!=="Tab") return;
    var fs=Array.prototype.filter.call(root.querySelectorAll('button,select,[tabindex="0"]'),function(x){
      return !x.disabled && !x.hidden && x.getClientRects().length>0;
    });
    if(!fs.length) return;
    var i=fs.indexOf(document.activeElement);
    if(e.shiftKey && i<=0){e.preventDefault();fs[fs.length-1].focus();}
    else if(!e.shiftKey && (i===fs.length-1 || i<0)){e.preventDefault();fs[0].focus();}
  });
  root.addEventListener("click",function(e){ if(e.target===root) fermer(); });
  new MutationObserver(rafraichir).observe(piste,{childList:true});
  new MutationObserver(function(){ if(mod) majTransport(); }).observe(document.getElementById("eur-play"),{attributes:true,attributeFilter:["class"]});
  /* Menu, autre panneau, remplacement du projet/rack : aucune vue obsolète ne
     doit continuer à écrire dans un module qui n'existe plus. */
  new MutationObserver(function(){
    if(mod && (!root.classList.contains("show") || !valide() || document.body.classList.contains("menu-ouvert"))) fermer(false);
  }).observe(document.body,{attributes:true,attributeFilter:["class"]});
  new MutationObserver(function(){ if(mod && !root.classList.contains("show")) fermer(false); })
    .observe(root,{attributes:true,attributeFilter:["class"]});
  document.addEventListener("visibilitychange",function(){ if(document.hidden) lacher(); });
  window.addEventListener("blur",lacher);
  rafraichir();
  return {ouvrir:ouvrir,fermer:fermer,actif:function(){return mod?mod.id:null;}};
})();

