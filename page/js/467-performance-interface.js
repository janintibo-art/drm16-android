/* v284 : panneau PERFORMANCE. Aucun clone de façade, aucune boucle RAF.
   Les sliders pilotent les données communes du rack ; leurs valeurs sont des
   courses de macro (0–100 %), ni des dB ni une mesure de la sortie audio. */
var EUR_PERF_UI=(function(){
  "use strict";
  var M=EUR_PERFORMANCE,ouvert=false,rack=null,retour=null,caches=[],edition=-1,indexCible=-1,cartes=[];
  var root=document.createElement("div");root.id="eur-performance";root.setAttribute("role","dialog");
  root.setAttribute("aria-modal","true");root.setAttribute("aria-labelledby","ep-titre");
  root.innerHTML='<section class="ep-panneau"><header class="ep-tete"><div><span class="ep-sur">EURORACK / JEU EN DIRECT</span>'+
    '<h2 id="ep-titre">PERFORMANCE</h2><p id="ep-rack"></p></div><button id="ep-fermer" type="button">RETOUR AU RACK</button></header>'+
    '<div class="ep-outils"><button id="ep-play" type="button">▶ JOUER</button><button id="ep-memoriser" type="button">MÉMORISER</button>'+
    '<button id="ep-rappeler" type="button">REVENIR</button><span id="ep-memoire"></span></div>'+
    '<div class="ep-zone"><p class="ep-intro">Huit commandes, jusqu’à quatre réglages par commande. Les pourcentages indiquent la course, pas le volume mesuré.</p>'+
    '<p id="ep-message" role="status" aria-live="polite"></p><div class="ep-cartes"></div>'+
    '<section class="ep-config" hidden><div class="ep-config-tete"><h3 id="ep-config-titre"></h3><button id="ep-retour-commandes" type="button">LES 8 COMMANDES</button></div>'+
    '<label class="ep-champ">NOM DE LA COMMANDE<input id="ep-nom" type="text" maxlength="24" autocomplete="off"></label>'+
    '<p class="ep-aide">Affecter ou retirer une cible ne change pas le son. Le prochain déplacement applique la course à toutes ses cibles. Un réglage ne peut appartenir qu’à une commande.</p>'+
    '<div class="ep-cibles"></div><button id="ep-ajouter" type="button">AJOUTER UNE CIBLE</button>'+
    '<form class="ep-affectation" hidden><h4 id="ep-affectation-titre">NOUVELLE CIBLE</h4>'+
    '<label class="ep-champ">MODULE<select id="ep-module"></select></label><label class="ep-champ">RÉGLAGE<select id="ep-param"></select></label>'+
    '<div class="ep-bornes"><label class="ep-champ">À 0 % : COURSE DU RÉGLAGE (%)<input id="ep-min" type="text" inputmode="decimal" value="0" autocomplete="off"></label>'+
    '<label class="ep-champ">À 100 % : COURSE DU RÉGLAGE (%)<input id="ep-max" type="text" inputmode="decimal" value="100" autocomplete="off"></label></div>'+
    '<p id="ep-apercu"></p><p class="ep-aide">De 0 à 100. Inversez les bornes pour qu’un réglage descende quand la commande monte. Les notes et les pas se modifient toujours dans leur séquenceur.</p>'+
    '<div class="ep-actions"><button id="ep-valider" type="submit">VALIDER LA CIBLE</button><button id="ep-annuler" type="button">ANNULER</button></div>'+
    '<p id="ep-erreur" role="alert"></p></form></section></div>'+
    '<footer class="ep-pied">Réglages immédiats · MÉMORISER ne capture que les paramètres affectés, pas le motif ni la position de lecture.</footer></section>';
  document.body.appendChild(root);PANNEAUX.push(root.id);
  function q(s){return root.querySelector(s);}
  function element(tag,cls,texte){var e=document.createElement(tag);if(cls)e.className=cls;if(texte!==undefined)e.textContent=texte;return e;}
  function bouton(texte,cls,fn){var e=element("button",cls,texte);e.type="button";e.addEventListener("click",fn);return e;}
  var entree=bouton("PERFORMANCE","",ouvrir);entree.id="eur-performance-ouvrir";entree.setAttribute("aria-haspopup","dialog");entree.setAttribute("aria-controls",root.id);
  /* Une ligne séparée à gauche : ni RACK, ni FOCUS, ni PERFORMANCE ne
     doivent se retrouver sous les boutons fixes MENU / NOTICE en paysage. */
  var lanceur=element("div","ep-lanceur"),barre=document.querySelector("#unit-eur .eur-bar");
  ["eur-plein","eur-t-rack","eur-t-patch","eur-focus-ouvrir"].forEach(function(id){var e=document.getElementById(id);if(e)lanceur.appendChild(e);});
  lanceur.appendChild(entree);barre.insertBefore(lanceur,barre.querySelector(".eur-grp"));
  function valide(){return ouvert && rack===EUR.mods && S.modele==="eur" && !document.body.classList.contains("menu-ouvert");}
  function message(t){q("#ep-message").textContent=t;}
  function agir(fn){if(!valide()){fermer(false);return false;}try{return fn();}catch(e){message("Réglage interrompu : "+String(e.message||e));return false;}}
  function format(k,v){var t=String(Math.round(v*1000)/1000).replace(".",",");if(k[2]===0&&k[3]===1)return String(Math.round(v*1000)/10).replace(".",",")+" %";return t+(/\bHz\b/.test(k[1])?" Hz":/\bms\b/.test(k[1])?" ms":"");}
  function proteger(){
    caches=[];Array.prototype.forEach.call(document.body.children,function(e){
      if(e===root||/^(SCRIPT|STYLE|LINK)$/.test(e.tagName))return;
      caches.push({e:e,inert:e.getAttribute("inert"),aria:e.getAttribute("aria-hidden")});e.setAttribute("inert","");e.setAttribute("aria-hidden","true");
    });
  }
  function lacher(){cartes.forEach(function(c){var d=c.drag;c.drag=null;c.dial.classList.remove("ep-tourne");if(d&&c.dial.hasPointerCapture(d.id))c.dial.releasePointerCapture(d.id);});}
  function fermer(focus){
    if(!ouvert)return;ouvert=false;lacher();rack=null;edition=-1;root.classList.remove("show");
    caches.forEach(function(c){if(c.inert===null)c.e.removeAttribute("inert");else c.e.setAttribute("inert",c.inert);
      if(c.aria===null)c.e.removeAttribute("aria-hidden");else c.e.setAttribute("aria-hidden",c.aria);});caches=[];
    majNoteOuverte();EUR_KNOBS.forEach(function(k){k.maj();});
    if(focus!==false && S.modele==="eur" && !panneauVisible() && !document.body.classList.contains("menu-ouvert")){
      var b=retour&&retour.isConnected&&retour!==document.body?retour:entree;b.focus({preventScroll:true});
    }
    retour=null;
  }
  function ouvrir(){
    if(S.modele!=="eur"||document.body.classList.contains("menu-ouvert"))return false;
    if(ouvert)return true;
    if(typeof EUR_FOCUS!=="undefined")EUR_FOCUS.fermer(false);
    retour=document.activeElement;fermerAutresPanneaux(root.id);ouvert=true;rack=EUR.mods;edition=-1;
    q(".ep-cartes").hidden=false;q(".ep-config").hidden=true;q(".ep-affectation").hidden=true;
    message("");maj();root.classList.add("show");majNoteOuverte();q("#ep-fermer").focus({preventScroll:true});proteger();q(".ep-zone").scrollTop=0;return true;
  }
  function mettre(i,v){agir(function(){M.regler(i,v);maj();});}
  for(var i=0;i<8;i++)(function(n){
    var e=element("article","ep-carte"),titre=element("h3"),dial=element("div","ep-dial"),aiguille=element("i"),valeur=element("output"),sous=element("p","ep-carte-cibles"),etat=element("span","ep-etat");
    e.dataset.macro=n;dial.tabIndex=0;dial.setAttribute("role","slider");dial.setAttribute("aria-orientation","vertical");
    dial.setAttribute("aria-valuemin","0");dial.setAttribute("aria-valuemax","100");
    var dessin=element("div","ep-disque");dessin.setAttribute("aria-hidden","true");dessin.appendChild(aiguille);dial.appendChild(dessin);valeur.setAttribute("aria-hidden","true");dial.appendChild(valeur);
    var actions=element("div","ep-crans"),moins=bouton("−","",function(){mettre(n,M.courant().commandes[n].valeur-.01);}),plus=bouton("+","",function(){mettre(n,M.courant().commandes[n].valeur+.01);});
    moins.setAttribute("aria-label","Diminuer la commande "+(n+1));plus.setAttribute("aria-label","Augmenter la commande "+(n+1));actions.appendChild(moins);actions.appendChild(plus);
    var config=bouton("AFFECTER","ep-configurer",function(){configurer(n);});config.setAttribute("aria-label","Affecter la commande "+(n+1));
    [titre,dial,actions,etat,sous,config].forEach(function(x){e.appendChild(x);});q(".ep-cartes").appendChild(e);
    var c={el:e,titre:titre,dial:dial,pin:aiguille,out:valeur,sous:sous,etat:etat,moins:moins,plus:plus,config:config,drag:null};cartes.push(c);
    dial.addEventListener("pointerdown",function(ev){
      if(!valide()||ev.button!==0||!ev.isPrimary||!M.courant().commandes[n].cibles.length)return;
      c.drag={id:ev.pointerId,y:ev.clientY,x:ev.clientX};dial.setPointerCapture(ev.pointerId);dial.focus({preventScroll:true});dial.classList.add("ep-tourne");ev.preventDefault();
    });
    dial.addEventListener("pointermove",function(ev){
      var d=c.drag;if(!d||d.id!==ev.pointerId)return;var dy=d.y-ev.clientY;d.y=ev.clientY;
      var finesse=ev.shiftKey?10:1+Math.min(9,Math.abs(ev.clientX-d.x)/30);
      if(dy)mettre(n,M.courant().commandes[n].valeur+dy/(200*finesse));ev.preventDefault();
    });
    ["pointerup","pointercancel","lostpointercapture"].forEach(function(t){dial.addEventListener(t,function(ev){if(c.drag&&c.drag.id===ev.pointerId){c.drag=null;dial.classList.remove("ep-tourne");if(dial.hasPointerCapture(ev.pointerId))dial.releasePointerCapture(ev.pointerId);}});});
    dial.addEventListener("wheel",function(ev){if(!valide()||!M.courant().commandes[n].cibles.length)return;ev.preventDefault();if(ev.deltaY)mettre(n,M.courant().commandes[n].valeur+(ev.deltaY<0?1:-1)*(ev.shiftKey?.001:.01));},{passive:false});
    dial.addEventListener("keydown",function(ev){
      var v=M.courant().commandes[n].valeur,p=ev.shiftKey?.001:.01;
      if(ev.key==="ArrowUp"||ev.key==="ArrowRight")v+=p;else if(ev.key==="ArrowDown"||ev.key==="ArrowLeft")v-=p;
      else if(ev.key==="PageUp")v+=.1;else if(ev.key==="PageDown")v-=.1;else if(ev.key==="Home")v=0;else if(ev.key==="End")v=1;else return;
      ev.preventDefault();mettre(n,v);
    });
  })(i);
  function maj(){
    if(!ouvert)return;if(!valide()){fermer(false);return;}
    var d=M.courant(),nb=0;
    cartes.forEach(function(c,i){
      var x=d.commandes[i],v=Math.round(x.valeur*1000)/10,actif=!!x.cibles.length;nb+=x.cibles.length;
      c.titre.textContent=(i+1)+" · "+x.nom;c.dial.setAttribute("aria-label",x.nom);c.dial.setAttribute("aria-valuenow",String(v));c.dial.setAttribute("aria-valuetext",v+" % de course");
      c.dial.setAttribute("aria-disabled",String(!actif));c.dial.tabIndex=actif?0:-1;c.out.textContent=actif?String(v).replace(".",",")+" %":"—";
      c.pin.style.transform="rotate("+(-135+270*x.valeur)+"deg)";c.moins.disabled=!actif;c.plus.disabled=!actif;
      c.el.classList.toggle("ep-inactive",!actif);var ecart=actif&&M.ecart(x);c.el.classList.toggle("ep-ecart",ecart);
      c.etat.textContent=ecart?"REPRISE AU PROCHAIN GESTE":actif?x.cibles.length+" RÉGLAGE"+(x.cibles.length>1?"S":""):"NON AFFECTÉE";
      c.sous.textContent=actif?x.cibles.map(function(t){var m=eurMod(t.id),k=m&&M.descripteur(m,t.param);return k?EUR_CAT[m.type].nom+" #"+m.id+" · "+k[1]+" : "+format(k,m.p[t.param]):"CIBLE ABSENTE";}).join(" / "):"Choisissez un module et un réglage.";
      c.config.textContent=actif?"CONFIGURER":"AFFECTER";
    });
    q("#ep-rack").textContent=(EUR.nom||("RACK "+(EUR.cur+1)))+" · "+EUR.mods.length+" modules";
    q("#ep-play").textContent=S.run?"■ ARRÊTER":"▶ JOUER";q("#ep-play").classList.toggle("on",!!S.run);
    q("#ep-memoriser").disabled=!nb;q("#ep-rappeler").disabled=!d.memoire;
    q("#ep-memoire").textContent=d.memoire?"POINT DE RETOUR PRÊT":"AUCUN POINT DE RETOUR";
  }
  function configurer(n){
    agir(function(){edition=n;q(".ep-cartes").hidden=true;q(".ep-config").hidden=false;q(".ep-affectation").hidden=true;
      q("#ep-config-titre").textContent="COMMANDE "+(n+1);q("#ep-nom").value=M.courant().commandes[n].nom;
      afficherCibles();q(".ep-zone").scrollTop=0;q("#ep-nom").focus({preventScroll:true});});
  }
  function afficherCibles(){
    var c=M.courant().commandes[edition],box=q(".ep-cibles");box.textContent="";
    c.cibles.forEach(function(t,j){
      var row=element("div","ep-cible"),m=eurMod(t.id),k=m&&M.descripteur(m,t.param);
      if(!k)return;
      row.appendChild(element("p","",EUR_CAT[m.type].nom+" #"+m.id+" · "+k[1]+" : "+format(k,t.min)+" → "+format(k,t.max)));
      row.appendChild(bouton("MODIFIER","",function(){formulaire(j);}));
      row.appendChild(bouton("RETIRER","",function(){agir(function(){M.retirer(edition,j);q(".ep-affectation").hidden=true;afficherCibles();maj();message("Affectation retirée. Le son reste inchangé ; le point de retour est effacé.");});}));box.appendChild(row);
    });
    q("#ep-ajouter").disabled=c.cibles.length>=4;
  }
  function option(sel,val,t){var o=element("option","",t);o.value=String(val);sel.appendChild(o);}
  function parametres(){
    var m=eurMod(+q("#ep-module").value),s=q("#ep-param");s.textContent="";
    if(m)M.parametres(m).forEach(function(k){option(s,k[0],k[1]);});
    q("#ep-min").value="0";q("#ep-max").value="100";apercu();
  }
  function formulaire(j){
    agir(function(){
      indexCible=j;var s=q("#ep-module");s.textContent="";
      EUR.mods.forEach(function(m,i){if(M.parametres(m).length)option(s,m.id,(i+1)+" · "+EUR_CAT[m.type].nom+" #"+m.id+" · R"+(m.r+1));});
      var t=j>=0?M.courant().commandes[edition].cibles[j]:null;if(t)s.value=String(t.id);parametres();
      if(t){q("#ep-param").value=t.param;var m=eurMod(t.id),k=M.descripteur(m,t.param);
        q("#ep-min").value=String(Math.round((t.min-k[2])/(k[3]-k[2])*100000)/1000);q("#ep-max").value=String(Math.round((t.max-k[2])/(k[3]-k[2])*100000)/1000);}
      q("#ep-affectation-titre").textContent=t?"MODIFIER LA CIBLE":"NOUVELLE CIBLE";q("#ep-erreur").textContent="";
      q(".ep-affectation").hidden=false;apercu();q("#ep-module").focus();
    });
  }
  function pourcent(sel){var s=q(sel).value.trim(),v=Number(s.replace(",","."));return /^\d{1,3}([.,]\d{1,3})?$/.test(s)&&Number.isFinite(v)&&v>=0&&v<=100?v:null;}
  function apercu(){
    var m=eurMod(+q("#ep-module").value),k=m&&M.descripteur(m,q("#ep-param").value),a=pourcent("#ep-min"),b=pourcent("#ep-max");
    q("#ep-min").setAttribute("aria-invalid",String(a===null));q("#ep-max").setAttribute("aria-invalid",String(b===null));
    q("#ep-valider").disabled=!k||a===null||b===null;
    q("#ep-apercu").textContent=!k?"Aucun réglage disponible dans ce rack.":a===null||b===null?"Saisissez deux pourcentages entre 0 et 100.":
      "0 % → "+format(k,k[2]+(k[3]-k[2])*a/100)+" · 100 % → "+format(k,k[2]+(k[3]-k[2])*b/100)+" · Actuel : "+format(k,m.p[k[0]]);
  }
  q(".ep-affectation").addEventListener("submit",function(ev){ev.preventDefault();agir(function(){
    var m=eurMod(+q("#ep-module").value),k=m&&M.descripteur(m,q("#ep-param").value),a=pourcent("#ep-min"),b=pourcent("#ep-max");
    if(!k||a===null||b===null){apercu();return;}
    var erreur=M.affecter(edition,{id:m.id,type:m.type,param:k[0],min:k[2]+(k[3]-k[2])*a/100,max:k[2]+(k[3]-k[2])*b/100},indexCible);
    q("#ep-erreur").textContent=erreur;if(erreur)return;
    q(".ep-affectation").hidden=true;afficherCibles();maj();message("Cible affectée sans changer le son. Mémorisez vos réglages avant de jouer.");q("#ep-retour-commandes").focus({preventScroll:true});
  });});
  q("#ep-nom").addEventListener("change",function(){agir(function(){M.nommer(edition,q("#ep-nom").value);q("#ep-nom").value=M.courant().commandes[edition].nom;maj();});});
  q("#ep-module").addEventListener("change",parametres);q("#ep-param").addEventListener("change",function(){q("#ep-min").value="0";q("#ep-max").value="100";apercu();});
  ["#ep-min","#ep-max"].forEach(function(s){q(s).addEventListener("input",apercu);});
  q("#ep-ajouter").addEventListener("click",function(){formulaire(-1);});q("#ep-annuler").addEventListener("click",function(){q(".ep-affectation").hidden=true;});
  q("#ep-retour-commandes").addEventListener("click",function(){var n=edition;edition=-1;q(".ep-config").hidden=true;q(".ep-cartes").hidden=false;maj();q(".ep-zone").scrollTop=0;if(n>=0)cartes[n].config.focus({preventScroll:true});});
  q("#ep-fermer").addEventListener("click",function(){fermer();});
  q("#ep-play").addEventListener("click",function(){agir(function(){document.getElementById("eur-play").click();maj();});});
  q("#ep-memoriser").addEventListener("click",function(){agir(function(){
    if(M.courant().memoire&&!window.confirm("Remplacer le point de retour par les réglages actuels des paramètres affectés ?"))return;
    if(M.memoriser()){message("Point de retour mémorisé avec le rack. Les sons et les séquences ne sont pas copiés.");maj();}
  });});
  q("#ep-rappeler").addEventListener("click",function(){agir(function(){
    if(!M.courant().memoire||!window.confirm("Revenir aux réglages mémorisés ? Seuls les paramètres affectés seront rétablis, sans relancer le morceau."))return;
    if(M.rappeler()){message("Réglages mémorisés rétablis. La lecture continue au même endroit.");maj();}
  });});
  root.addEventListener("keydown",function(ev){
    ev.stopPropagation();if(ev.key==="Escape"){ev.preventDefault();fermer();return;}if(ev.key!=="Tab")return;
    var fs=Array.prototype.filter.call(root.querySelectorAll('button,input,select,[tabindex="0"]'),function(x){return !x.disabled&&x.getClientRects().length>0;});
    var i=fs.indexOf(document.activeElement);if(!fs.length)return;
    if(ev.shiftKey&&i<=0){ev.preventDefault();fs[fs.length-1].focus();}else if(!ev.shiftKey&&(i<0||i===fs.length-1)){ev.preventDefault();fs[0].focus();}
  });
  ["pointerdown","pointermove","pointerup","pointercancel"].forEach(function(t){root.addEventListener(t,function(e){e.stopPropagation();});});
  new MutationObserver(function(){if(ouvert&&(!root.classList.contains("show")||!valide()))fermer(false);}).observe(document.body,{attributes:true,attributeFilter:["class"]});
  new MutationObserver(function(){if(ouvert&&!root.classList.contains("show"))fermer(false);}).observe(root,{attributes:true,attributeFilter:["class"]});
  new MutationObserver(function(){if(ouvert){if(!valide())fermer(false);else{M.nettoyer();maj();if(edition>=0){q(".ep-affectation").hidden=true;afficherCibles();}}}}).observe(document.getElementById("eur-piste"),{childList:true});
  new MutationObserver(maj).observe(document.getElementById("eur-play"),{attributes:true,attributeFilter:["class"]});
  window.addEventListener("blur",lacher);document.addEventListener("visibilitychange",function(){if(document.hidden)lacher();});
  return {ouvrir:ouvrir,fermer:fermer,actualiser:maj,actif:function(){return ouvert;}};
})();
