/* v285 — Édition A/B séparée de la lecture. Les états sont des événements
   horodatés, jamais des mesures du son. Un rAF attend seulement une transition
   audio déjà programmée et visible ; aucun dessin permanent entre les mesures. */
var EUR_VAR_UI=(function(){
  "use strict";
  var M=EUR_VARIATIONS,vues=[],raf=0;
  function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!==undefined)e.textContent=txt;return e;}
  function bouton(p,t,cls,fn){var b=el("button",cls,t);b.type="button";b.addEventListener("click",function(e){e.stopPropagation();fn();});p.appendChild(b);return b;}
  function valide(m){return EUR.mods.indexOf(m)>=0;}
  function enregistrer(m){memEur();if(m.type==="drum32")EUR_DRUM32.rafraichir(m);else EUR_BREAK32.rafraichir(m);reveiller();}
  function visible(v){
    if(!v.actif||document.hidden||!v.el.isConnected||!v.el.getClientRects().length||document.body.classList.contains("menu-ouvert"))return false;
    if(v.m&&!valide(v.m))return false;
    if(v.el.closest("#eur-performance"))return document.getElementById("eur-performance").classList.contains("show");
    if(v.el.closest("#eur-focus"))return document.getElementById("eur-focus").classList.contains("show");
    return !panneauVisible()&&(S.modele==="eur"||(typeof ENS!=="undefined"&&ENS.actif));
  }
  function phraseEtat(m,now){
    var d=M.lireEtat(m,now),e=d.entendu,t;
    if(!S.run)t="DÉPART "+(d.initial?"B":"A");
    else if(e)t=(e.fill?"FILL B":"LECTURE "+(e.banque?"B":"A"))+" · MESURE "+e.mesure;
    else t="ATTENTE CLK";
    if(d.futur&&(!e||d.futur.banque!==e.banque||d.futur.fill!==e.fill))t+=" · "+(d.futur.fill?"FILL B":d.futur.banque?"B":"A")+" PROGRAMMÉ";
    if(d.attente!==null)t+=" · "+(d.attente?"B":"A")+" À LA MESURE SUIVANTE";
    if(d.fillAttente)t+=" · FILL EN ATTENTE";
    return t;
  }
  function peindre(){
    raf=0;vues=vues.filter(function(v){return v.actif&&v.el.isConnected&&(!v.m||valide(v.m));});
    var now=ctx?maintenantAudio():0,encore=false;
    vues.forEach(function(v){if(!visible(v))return;v.temps(now);
      var ms=v.m?[v.m]:EUR.mods.filter(M.compatible);
      if(S.run&&ctx&&ctx.state==="running"&&ms.some(function(m){return m._rv&&m._rv.dates.length;}))encore=true;
    });
    if(encore)raf=requestAnimationFrame(peindre);
  }
  function reveiller(){if(!raf&&vues.some(visible))raf=requestAnimationFrame(peindre);}
  function interfaceModule(parent,m,grand){
    var root=el("section",grand?"rv-panel":"rv-mini"),etat=el("p","rv-etat"),titre=el("p","rv-edition");parent.appendChild(root);
    root.dataset.module=m.id;root.appendChild(titre);root.appendChild(etat);
    var edA,edB,jA,jB,f,ann,auto,pasmes,verrous=[],forts;
    function agir(fn){if(!valide(m))return;fn();enregistrer(m);}
    if(grand){
      var ed=el("div","rv-deux");root.insertBefore(ed,etat);
      edA=bouton(ed,"ÉDITER A","rv-editer-a",function(){agir(function(){M.editer(m,0);});});
      edB=bouton(ed,"ÉDITER B","rv-editer-b",function(){agir(function(){M.editer(m,1);});});
      var lecture=el("div","rv-deux");root.appendChild(lecture);
      jA=bouton(lecture,"JOUER A","rv-jouer-a",function(){agir(function(){M.choisir(m,0);});});
      jB=bouton(lecture,"JOUER B","rv-jouer-b",function(){agir(function(){M.choisir(m,1);});});
      f=bouton(lecture,"FILL · 1 MESURE","rv-fill",function(){agir(function(){M.fill(m);});});
      ann=bouton(lecture,"ANNULER ATTENTE","rv-annuler",function(){agir(function(){M.annuler(m);});});
      var label=el("label","rv-auto","FILL AUTOMATIQUE (PHRASE B)");auto=el("select");auto.setAttribute("aria-label","Fill automatique");
      [[0,"ARRÊT"],[2,"Toutes les 2 mesures"],[4,"Toutes les 4 mesures"],[8,"Toutes les 8 mesures"]].forEach(function(x){var o=el("option","",x[1]);o.value=x[0];auto.appendChild(o);});
      auto.addEventListener("change",function(){agir(function(){M.periode(m,+auto.value);});});label.appendChild(auto);
      var labelCycle=el("label","rv-cycle","PAS PAR MESURE (CYCLES LIBRES)");pasmes=el("select");pasmes.setAttribute("aria-label","Pas par mesure");
      EUR_CYCLE.presets.forEach(function(x){var o=el("option","",x[1]);o.value=x[0];pasmes.appendChild(o);});
      pasmes.addEventListener("change",function(){agir(function(){if(m.variation)M.pasmes(m,+pasmes.value);});});labelCycle.appendChild(pasmes);
      var outils=el("details","rv-outils");outils.appendChild(el("summary","","PRÉPARER B / RÉGLER LES FILLS"));root.appendChild(outils);outils.appendChild(label);outils.appendChild(labelCycle);
      var ac=el("div","rv-deux");outils.appendChild(ac);
      bouton(ac,"COPIER A → B","rv-copier",function(){agir(function(){
        if(m.variation&&!window.confirm("Remplacer toute la phrase B par A ? A et le son chargé restent intacts."))return;
        M.preparerB(m);M.editer(m,1);
      });});
      bouton(ac,"GÉNÉRER B","rv-generer",function(){agir(function(){
        if(m.variation&&!window.confirm("Recréer B à partir de A avec de nouveaux roulements ? La précédente B sera remplacée. A reste intacte."))return;
        M.generer(m);M.editer(m,1);
      });});
      var locks=el("div","rv-verrous");outils.appendChild(locks);
      function verrou(txt,cls,fn){var l=el("label",""),i=el("input",cls);i.type="checkbox";i.setAttribute("aria-label",txt);l.appendChild(i);l.appendChild(el("span","",txt));locks.appendChild(l);
        i.addEventListener("change",function(){agir(function(){if(m.variation)fn(i.checked);});});return i;}
      if(m.type==="drum32")["A","B","C","D"].forEach(function(c,i){verrous.push(verrou("PRÉSERVER PISTE "+c,"rv-verrou",function(v){m.variation.verrous[i]=v?1:0;}));});
      else forts=verrou("PRÉSERVER LES TEMPS FORTS","rv-forts",function(v){m.variation.forts=v?1:0;});
      outils.appendChild(el("p","rv-aide",m.type==="drum32"?"La génération repart toujours de A. Par défaut, les pistes A et B (kick et caisse des exemples) sont protégées ; C et D varient. Les verrous ne bloquent pas l’édition manuelle.":"La génération repart toujours de A. La protection conserve les pas 1, 5, 9, 13, 17, 21, 25 et 29. Elle ne reconnaît pas les instruments de votre boucle. Aucun changement du fichier ni des repères de découpe."));
      outils.appendChild(el("p","rv-aide","ÉDITER choisit les données affichées en dessous, sans changer la lecture. JOUER A/B change la phrase au prochain début de mesure. FILL utilise B pendant une mesure puis revient à la phrase choisie. Les séquences ne repartent pas du pas 1. Longueur, mute et timbre sont communs. 1 mesure = PAS PAR MESURE impulsions CLK (16 par défaut ; 14, 18, 20 ou un compte libre pour suivre 7/8, 9/8, 5/4 ou un autre cycle) ; utilisez CLOCK OUT pour les exemples."));
    }
    function temps(now){var t=phraseEtat(m,now);if(etat.textContent!==t)etat.textContent=t;
      if(f)f.disabled=!S.run||!m.variation;
      if(ann){var s=m._rv;ann.disabled=!s||(s.attente===null&&!s.demandeFill);}
    }
    function maj(){
      titre.textContent=grand?"ÉDITION "+(m._rvEdition===1&&m.variation?"B · VARIATION":"A · ORIGINALE"):"APERÇU "+(m._rvEdition===1&&m.variation?"B":"A")+" · VARIATIONS";
      root.dataset.edition=m._rvEdition===1&&m.variation?"b":"a";
      if(grand){
        edA.setAttribute("aria-pressed",String(m._rvEdition!==1));edB.setAttribute("aria-pressed",String(m._rvEdition===1));edB.disabled=!m.variation;jB.disabled=!m.variation;auto.disabled=!m.variation;
        auto.value=m.variation?m.variation.periode:0;
        pasmes.disabled=!m.variation;
        var pv=m.variation?EUR_CYCLE.val(m.variation.pasmes):16;
        if(!Array.from(pasmes.options).some(function(o){return +o.value===pv;})){var oc=el("option","",pv+" pas · LIBRE");oc.value=pv;pasmes.appendChild(oc);}
        pasmes.value=pv;
        verrous.forEach(function(e,i){e.disabled=!m.variation;e.checked=m.variation?!!m.variation.verrous[i]:i<2;});
        if(forts){forts.disabled=!m.variation;forts.checked=!m.variation||!!m.variation.forts;}
      }
      temps(ctx?maintenantAudio():0);reveiller();
    }
    vues=vues.filter(function(v){return v.actif&&v.el.isConnected&&(!v.m||valide(v.m));});
    var vue={el:root,m:m,actif:true,temps:temps};vues.push(vue);
    return {maj:maj,detruire:function(){vue.actif=false;}};
  }
  /* Un accès aux fills sans quitter les huit macros. Aucun maintien au doigt :
     les demandes durent une seule mesure et ne restent pas coincées au relâchement. */
  var perf=document.getElementById("eur-performance"),zone=perf&&perf.querySelector(".ep-zone"),live,rows=[],ensemble;
  function batirLive(){
    if(!zone)return;var mods=EUR.mods.filter(M.compatible);
    if(rows.length===mods.length&&rows.every(function(r,i){return r.m===mods[i];}))return;
    rows=[];live.textContent="";live.hidden=!mods.length;if(!mods.length)return;
    live.appendChild(el("h3","","VARIATIONS DE BATTERIE"));
    ensemble=bouton(live,"FILL TOUS · 1 MESURE","rv-fill-tous",function(){
      if(!perf.classList.contains("show")||S.modele!=="eur")return;
      mods.forEach(function(m){if(valide(m))M.fill(m);});reveiller();
    });
    var details=el("details","rv-outils");details.appendChild(el("summary","","PHRASES A/B ET ÉDITION DES SÉQUENCEURS"));live.appendChild(details);
    mods.forEach(function(m){var ligne=el("div","rv-live-ligne"),nom=el("strong","",EUR_CAT[m.type].nom+" #"+m.id),e=el("p","rv-etat");ligne.appendChild(nom);ligne.appendChild(e);
      var commandes=el("div","rv-deux");ligne.appendChild(commandes);
      var a=bouton(commandes,"JOUER A","rv-live-a",function(){if(valide(m)){M.choisir(m,0);reveiller();}});
      var b=bouton(commandes,"JOUER B","rv-live-b",function(){if(valide(m)){M.choisir(m,1);reveiller();}});
      var ann=bouton(commandes,"ANNULER ATTENTE","rv-live-annuler",function(){if(valide(m)){M.annuler(m);reveiller();}});
      bouton(commandes,"ÉDITER / PRÉPARER B","rv-live-editer",function(){if(valide(m))EUR_FOCUS.ouvrir(m.id);});
      details.appendChild(ligne);rows.push({m:m,etat:e,a:a,b:b,ann:ann});
    });
    details.appendChild(el("p","rv-aide","FILL TOUS agit sur les DRUM 32 / BREAK 32 possédant une phrase B. Chaque séquenceur attend sa prochaine mesure (PAS PAR MESURE CLK, 16 par défaut) ; une même horloge et un même reset les gardent ensemble. Les scènes continuent d’agir sur les niveaux."));
  }
  if(zone){
    live=el("section","rv-live");live.hidden=true;zone.insertBefore(live,zone.querySelector(".ep-cartes"));
    vues.push({el:live,actif:true,temps:function(now){
      rows.forEach(function(r){var t=r.m.variation?phraseEtat(r.m,now):"B NON PRÉPARÉE · OUVREZ L’ÉDITEUR";if(r.etat.textContent!==t)r.etat.textContent=t;
        r.b.disabled=!r.m.variation;var s=r.m._rv;r.ann.disabled=!s||(s.attente===null&&!s.demandeFill);});
      if(ensemble)ensemble.disabled=!S.run||!rows.some(function(r){return !!r.m.variation;});
    }});
    new MutationObserver(function(){if(perf.classList.contains("show")){batirLive();reveiller();}}).observe(perf,{attributes:true,attributeFilter:["class"]});
  }
  var piste=document.getElementById("eur-piste");if(piste&&perf)new MutationObserver(function(){if(perf.classList.contains("show")){batirLive();reveiller();}}).observe(piste,{childList:true});
  new MutationObserver(reveiller).observe(document.body,{attributes:true,attributeFilter:["class"]});
  var play=document.getElementById("eur-play");if(play)new MutationObserver(reveiller).observe(play,{attributes:true,attributeFilter:["class"]});
  var focus=document.getElementById("eur-focus");if(focus)new MutationObserver(reveiller).observe(focus,{attributes:true,attributeFilter:["class"]});
  document.addEventListener("visibilitychange",reveiller);
  return {interface:interfaceModule,reveiller:reveiller};
})();
