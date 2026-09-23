/* v288 : commandes STUTTER LIVE dans le Focus. Aucun clonage du graphe audio. */
var EUR_STUTTER_UI=(function(){
  "use strict";
  var ST=EUR_STUTTER,vues=[],raf=0,dernier=0;
  function el(tag,cls,texte){var e=document.createElement(tag);if(cls)e.className=cls;if(texte!==undefined)e.textContent=texte;return e;}
  function visible(v){
    if(document.hidden||!v.el.isConnected||EUR.mods.indexOf(v.m)<0||document.body.classList.contains("menu-ouvert"))return false;
    if(v.grand){var f=v.el.closest("#eur-focus");return !!f&&f.classList.contains("show");}
    return !panneauVisible()&&v.el.getClientRects().length>0&&(S.modele==="eur"||(typeof ENS!=="undefined"&&ENS.actif));
  }
  function boucle(ms){raf=0;vues=vues.filter(function(v){return v.el.isConnected&&EUR.mods.indexOf(v.m)>=0;});var l=vues.filter(visible),continuer=false;
    var now=ctx?maintenantAudio():0;
    l.forEach(function(v){var st=v.m.stutter&&v.m.stutter.statut(now);if(ms-dernier>=50)v.temps(st);
      if(st&&(st.actif||!st.pret||S.run&&v.m.p.auto>0))continuer=true;});
    if(ms-dernier>=50)dernier=ms;
    if(l.length&&continuer&&ctx&&ctx.state==="running")raf=requestAnimationFrame(boucle);
  }
  function reveiller(){
    vues.forEach(function(v){if(!visible(v))v.lacher();});
    if(!raf&&vues.some(visible)){dernier=-Infinity;raf=requestAnimationFrame(boucle);}
  }
  function rafraichir(m){vues=vues.filter(function(v){return v.el.isConnected&&EUR.mods.indexOf(v.m)>=0;});vues.forEach(function(v){if(v.m===m)v.maj();});reveiller();}
  function interfaceModule(parent,m,grand){
    var root=el("section","stl "+(grand?"stl-grand":"stl-mini")),champs={},ferme=false,tenu=false,pointeur=null;
    root.dataset.module=m.id;parent.appendChild(root);
    function valide(){return !ferme&&root.isConnected&&EUR.mods.indexOf(m)>=0&&m.stutter&&!m.stutter.statut(maintenantAudio()).ferme;}
    function bouton(p,texte,fn,classe){var b=el("button",classe,texte);b.type="button";b.addEventListener("click",function(e){e.stopPropagation();if(valide())fn();});p.appendChild(b);return b;}
    root.appendChild(el("p","stl-sur","CAPTURE STÉRÉO · RÉPÉTITION"));
    var ecran=grand?el("div","stl-ecran"):bouton(root,"",function(){EUR_FOCUS.ouvrir(m.id);},"stl-ecran stl-ouvrir");
    if(grand)root.appendChild(ecran);else ecran.setAttribute("aria-label","Ouvrir STUTTER LIVE");
    var titre=el("strong","stl-fraction"),statut=el("output","stl-etat"),resume=el("span","stl-resume");ecran.appendChild(titre);ecran.appendChild(statut);ecran.appendChild(resume);
    var grille=el("div","stl-grille");if(grand)root.appendChild(grille);
    var message=el("p","stl-message");message.setAttribute("role","status");
    function modifier(k,v){if(!valide()||!Number.isFinite(v))return;m.p[k]=v;if(m.maj)m.maj();memEur();rafraichir(m);}
    function select(k,label,liste){var lab=el("label","",label),s=el("select","");s.dataset.param=k;s.setAttribute("aria-label",label);
      liste.forEach(function(x){var o=el("option","",x[1]);o.value=x[0];s.appendChild(o);});lab.appendChild(s);grille.appendChild(lab);
      s.addEventListener("change",function(){modifier(k,+s.value);});champs[k]=s;}
    var hold=null;
    function commencer(maintenir){
      if(!valide())return false;
      if(ctx&&ctx.state==="suspended"){ctx.resume().then(reveiller).catch(function(){});message.textContent="Audio relancé : laissez entrer un fragment puis réessayez.";return false;}
      var ok=m.stutter.capturer(maintenantAudio(),maintenir);
      message.textContent=ok?(maintenir?"Répétition tenue : relâchez pour retrouver le son direct.":"Répétition lancée, retour automatique."):"Capture indisponible : répétition en cours ou tampon en réarmement.";
      reveiller();return ok;
    }
    function lacher(){if(!tenu)return;tenu=false;pointeur=null;
      if(m.stutter)m.stutter.relacher(maintenantAudio(),false);if(hold)hold.setAttribute("aria-pressed","false");
      message.textContent="Relâché : retour au son direct.";
    }
    if(grand){
      select("div","LONGUEUR DU FRAGMENT",ST.divisions.map(function(n,i){return [i,"1/"+n+(n===4?" · noire":n===8?" · croche":"")];}));
      select("span","DURÉE DE LA RÉPÉTITION",Array.from({length:16},function(_,i){return [i+1,(i+1)+" pas de double-croche"+(i===15?" · 1 mesure":"")];}));
      select("auto","DÉCLENCHEMENT AUTOMATIQUE",ST.periodes.map(function(n,i){return [i,n?"Fin de chaque "+n+" mesures":"OFF · à la main / CAPTURE"]; }));
      select("edge","ADOUCIR LES JOINTS",[.5,1,2,3,5].map(function(n){return [n,n+" ms"]; }));
      var dose=el("label","stl-dose","DOSE DE RÉPÉTITION"),range=el("input","");range.type="range";range.min=0;range.max=1;range.step=.01;range.dataset.param="mix";range.setAttribute("aria-label","Dose de répétition");
      range.addEventListener("input",function(){modifier("mix",+range.value);});dose.appendChild(range);root.appendChild(dose);champs.mix=range;
      var actions=el("div","stl-actions");root.appendChild(actions);
      bouton(actions,"RÉPÉTER",function(){commencer(false);},"stl-repeat");
      hold=bouton(actions,"TENIR · MAINTENIR",function(){},"stl-hold");hold.setAttribute("aria-pressed","false");
      hold.addEventListener("pointerdown",function(e){if(e.button!==0||tenu||!valide())return;e.preventDefault();e.stopPropagation();
        if(commencer(true)){tenu=true;pointeur=e.pointerId;hold.setAttribute("aria-pressed","true");try{hold.setPointerCapture(e.pointerId);}catch(ignore){}}});
      ["pointerup","pointercancel","lostpointercapture"].forEach(function(n){hold.addEventListener(n,function(e){if(tenu&&(pointeur===null||e.pointerId===pointeur)){e.stopPropagation();lacher();}});});
      hold.addEventListener("keydown",function(e){if(e.key!==" "&&e.key!=="Enter")return;e.preventDefault();e.stopPropagation();if(!e.repeat&&!tenu&&commencer(true)){tenu=true;hold.setAttribute("aria-pressed","true");}});
      hold.addEventListener("keyup",function(e){if(e.key===" "||e.key==="Enter"){e.preventDefault();e.stopPropagation();lacher();}});hold.addEventListener("blur",lacher);
      bouton(actions,"LIBÉRER",function(){lacher();m.stutter.relacher(maintenantAudio(),false);message.textContent="Retour au son direct. AUTO reste réglé comme avant.";},"stl-release");
      root.appendChild(message);
      root.appendChild(el("p","stl-aide","Le module capture le fragment qui PRÉCÈDE l'appui, pas le son à venir. RÉPÉTER revient au direct après la durée choisie. TENIR garde la boucle seulement pendant l'appui. La batterie et les mélodies continuent d'avancer derrière. LIBÉRER ne désactive pas les futures captures AUTO."));
      root.appendChild(el("p","stl-aide","CÂBLAGE : audio → IN ; OUT → mixeur. CLOCK OUT → CLK pour AUTO (16 impulsions par mesure). CAPTURE lance une répétition limitée ; LIBÉRER ou RST la coupe. À la fin, laissez un fragment remplir le tampon avant une nouvelle capture. Les changements de longueur et de tempo s'appliquent hors répétition ; la DOSE agit immédiatement."));
      root.appendChild(el("p","stl-aide","Son direct sans retard au repos. La capture est temporaire et n'est pas enregistrée avec le rack. Pas de lecture inversée ni de transposition dans ce lot. L'afficheur indique un état, pas une forme d'onde. L'appui TENIR est libéré en quittant le Focus, en perdant le focus de la fenêtre ou en passant en arrière-plan."));
    }
    function maj(){var p=ST.valeurs(m.p);Object.keys(champs).forEach(function(k){champs[k].value=p[k];});
      titre.textContent="1/"+ST.divisions[p.div];resume.textContent=Math.round(p.mix*100)+" % · "+(p.auto?"AUTO / "+ST.periodes[p.auto]+" MES.":"MANUEL");
      if(champs.mix)champs.mix.setAttribute("aria-valuetext",Math.round(p.mix*100)+" %");temps(m.stutter&&m.stutter.statut(maintenantAudio()));}
    function temps(s){var texte=!s||s.ferme?"MODULE ARRÊTÉ":ctx&&ctx.state!=="running"?"AUDIO EN PAUSE":s.actif?(s.tenu?"TENU · RELÂCHEZ POUR SORTIR":"RÉPÈTE · "+s.restant.toFixed(1)+" s"):s.pret?"PRÊT · SON DIRECT":"RÉARMEMENT · "+s.attente.toFixed(2)+" s";
      if(statut.textContent!==texte)statut.textContent=texte;root.classList.toggle("stl-active",!!s&&s.actif);
    }
    var v={el:root,m:m,grand:grand,maj:maj,temps:temps,lacher:lacher};vues=vues.filter(function(v){return v.el.isConnected&&EUR.mods.indexOf(v.m)>=0;});vues.push(v);maj();reveiller();
    return {rafraichir:maj,detruire:function(){lacher();ferme=true;vues=vues.filter(function(x){return x!==v;});}};
  }
  EUR_CAT.stutterlive.interface=interfaceModule;EUR_CAT.stutterlive.focusLabel="CAPTURE";EUR_CAT.stutterlive.focusValeur="LIVE";
  new MutationObserver(reveiller).observe(document.body,{attributes:true,attributeFilter:["class"]});
  var play=document.getElementById("eur-play");if(play)new MutationObserver(reveiller).observe(play,{attributes:true,attributeFilter:["class"]});
  document.addEventListener("visibilitychange",reveiller);window.addEventListener("blur",function(){vues.forEach(function(v){v.lacher();});});
  return {rafraichir:rafraichir,reveiller:reveiller};
})();
