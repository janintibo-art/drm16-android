/* v273 — Focus mixage. Les éléments INPUT et leurs écouteurs natifs restent
   dans leur tranche : ni copie de commandes, ni nouveau nœud audio.
   Les boutons ± émettent un unique input natif, seulement si la valeur change.
   Ouvrir, parcourir ou fermer le Focus ne modifie aucun réglage du SET. */
var TABLE_FOCUS = (function(){
  "use strict";
  var table=document.getElementById("table"), piste=document.getElementById("table-voies");
  var voies=Object.create(null), selection="", retour=null, position=null, changements=0;
  var noms={trim:"GAIN",hi:"AIGU",md:"MÉDIUM",lo:"GRAVE",pan:"PANORAMIQUE",niv:"NIVEAU"};
  var nav=document.createElement("nav");nav.id="tf-nav";nav.hidden=true;
  nav.setAttribute("aria-label","Focus de la table de mixage");
  nav.innerHTML='<span class="tf-surtitre">RÉGLAGE D’UNE VOIE</span>'+
    '<button type="button" id="tf-precedent" aria-label="Voie précédente">‹</button>'+
    '<label class="tf-navigation"><span class="tf-sr">Voie à agrandir</span><select id="tf-choix"></select></label>'+
    '<button type="button" id="tf-suivant" aria-label="Voie suivante">›</button>'+
    '<button type="button" id="tf-retour">RETOUR TABLE</button>'+
    '<p id="tf-etat" role="status" aria-live="polite"></p>';
  table.insertBefore(nav,piste);
  var choix=nav.querySelector("select"), etat=nav.querySelector("#tf-etat");
  SET_VOIES.forEach(function(v){var o=document.createElement("option");o.value=v[0];o.textContent=v[1];choix.appendChild(o);});
  function texte(e,t){if(e.textContent!==t)e.textContent=t;}
  function nombre(v){var n=Math.abs(v)<.05?0:v;return n.toFixed(1).replace(".",",").replace("-","−");}
  function valeur(q,v){
    if(!Number.isFinite(v))return "—";
    if(q==="pan")return Math.abs(v)<.005?"CENTRE":(v<0?"G ":"D ")+Math.round(Math.abs(v)*100)+" %";
    var db=q==="trim"||q==="niv"?(v>0?20*Math.log10(v):-Infinity):dbEq(v);
    return db===-Infinity?"−∞ dB":(db>.05?"+":"")+nombre(db)+" dB";
  }
  function changer(id,q,sens){
    var v=voies[id], f=v&&v.champs[q];
    if(!f || !selection || selection!==id || !table.classList.contains("show") || f.input.disabled)return false;
    var r=f.input, avant=Number(r.value), pas=Number(r.step)||1;
    var suivant=Math.min(Number(r.max),Math.max(Number(r.min),Math.round((avant+sens*pas)*1e8)/1e8));
    if(suivant===avant)return false;
    r.value=String(suivant);
    r.dispatchEvent(new Event("input",{bubbles:true}));
    return true;
  }
  function boutonPas(id,q,sens){
    var b=document.createElement("button");b.type="button";b.className="tf-pas";
    b.textContent=sens<0?"−":"+";b.dataset.sens=String(sens);
    b.setAttribute("aria-label",(sens<0?"Diminuer ":"Augmenter ")+noms[q]+" — "+voies[id].nom);
    b.addEventListener("click",function(e){
      /* Empêcher le gestionnaire de boutons de la tranche de traiter cette
         commande comme JOUER/COUPE/SOLO et de mémoriser une seconde fois. */
      e.stopPropagation();changer(id,q,sens);
    });
    return b;
  }
  function champ(col,id,q){
    var r=col.querySelector('input[data-a="'+q+'"]');if(!r)return;
    var boite=document.createElement("div");boite.className="tf-champ tf-"+q;
    var lab,ligne=document.createElement("div");ligne.className="tf-reglage";
    if(q==="niv"){
      var bas=col.querySelector(".bas");boite.className="tf-volume";bas.before(boite);
      lab=document.createElement("label");lab.textContent=noms[q];boite.appendChild(lab);boite.appendChild(bas);
      boite.appendChild(ligne); // ± sous le fader ; on ne déplace pas le curseur pivoté.
    }else{
      lab=r.previousElementSibling;lab.before(boite);boite.appendChild(lab);boite.appendChild(ligne);
    }
    r.id=r.id||("tf-"+id+"-"+q);lab.htmlFor=r.id;
    r.setAttribute("aria-label",voies[id].nom+" : "+noms[q]);
    var out=document.createElement("output");out.className="tf-val";out.setAttribute("for",r.id);
    // Un OUTPUT a un statut live implicite : ne pas annoncer 126 valeurs au chargement.
    out.setAttribute("aria-live","off");lab.appendChild(out);
    var moins=boutonPas(id,q,-1),plus=boutonPas(id,q,1);
    ligne.appendChild(moins);if(q!=="niv")ligne.appendChild(r);ligne.appendChild(plus);
    voies[id].champs[q]={input:r,sortie:out,moins:moins,plus:plus};
  }
  function equiper(){
    SET_VOIES.forEach(function(v){
      var id=v[0],col=piste.querySelector('.voie[data-v="'+id+'"]');
      if(!col || (voies[id] && voies[id].col===col))return;
      var data=voies[id]={col:col,nom:v[1],champs:Object.create(null)};
      col.querySelector('[data-a="on"]').parentElement.classList.add("tf-active");
      col.querySelector('[data-a="mute"]').parentElement.classList.add("tf-mutes");
      var entree=document.createElement("button");entree.type="button";entree.className="tf-ouvrir";
      entree.textContent="FOCUS";entree.setAttribute("aria-label","Agrandir la voie "+v[1]);
      entree.setAttribute("aria-expanded","false");entree.setAttribute("aria-controls","tf-nav");
      entree.addEventListener("click",function(e){e.stopPropagation();ouvrir(id,entree);});
      col.querySelector("b").after(entree);data.entree=entree;
      Object.keys(noms).forEach(function(q){champ(col,id,q);});
      var aide=document.createElement("p");aide.className="tf-aide";
      aide.textContent="± : un cran du réglage. GAIN : variation relative au calibrage de la machine. NIVEAU : position du fader en dB. Les vumètres mesurent le son ; les chiffres des curseurs décrivent les réglages.";
      col.appendChild(aide);
    });
  }
  function actualiser(){
    changements++;
    Object.keys(voies).forEach(function(id){
      var v=voies[id];
      Object.keys(v.champs).forEach(function(q){
        var f=v.champs[q],n=Number(f.input.value),t=valeur(q,n);
        texte(f.sortie,t);
        if(f.input.getAttribute("aria-valuetext")!==t)f.input.setAttribute("aria-valuetext",t);
        f.moins.disabled=f.input.disabled||n<=Number(f.input.min);
        f.plus.disabled=f.input.disabled||n>=Number(f.input.max);
      });
      ["on","mute","solo"].forEach(function(a){
        var b=v.col.querySelector('[data-a="'+a+'"]');
        var actif=a==="on"?!!SET.actives[id]:a==="mute"?!!SET.mute[id]:SET.solo===id;
        b.setAttribute("aria-pressed",String(actif));
      });
    });
    if(selection){
      var id=selection,t=SET.mute[id]?"COUPE":SET.solo&&SET.solo!==id?"COUPÉE PAR SOLO":SET.solo===id?"SOLO":"VOIE NON COUPÉE";
      texte(etat,t+(SET.actives[id]?" · DANS LE SET":" · HORS DU SET"));
      etat.dataset.coupe=SET.mute[id]||!!(SET.solo&&SET.solo!==id)?"1":"0";
    }
  }
  function reveillerMesures(){if(typeof RETOURS_MUSICAUX!=="undefined")RETOURS_MUSICAUX.reveiller();}
  function ouvrir(id,origine){
    equiper();var v=voies[id];if(!v || !table.classList.contains("show"))return false;
    if(!selection){position={x:piste.scrollLeft,y:piste.scrollTop};retour=origine||v.entree;}
    selection=id;choix.value=id;nav.hidden=false;table.classList.add("tf-focus");
    Object.keys(voies).forEach(function(k){voies[k].col.classList.toggle("tf-cible",k===id);voies[k].entree.setAttribute("aria-expanded",String(k===id));});
    piste.scrollLeft=0;piste.scrollTop=0;actualiser();reveillerMesures();
    // Le bouton de la tranche devient masqué : placer le clavier dans la navigation.
    if(origine)choix.focus({preventScroll:true});
    return true;
  }
  function fermer(rendreFocus){
    if(!selection)return false;
    selection="";table.classList.remove("tf-focus");nav.hidden=true;
    Object.keys(voies).forEach(function(id){voies[id].col.classList.remove("tf-cible");voies[id].entree.setAttribute("aria-expanded","false");});
    if(position){piste.scrollLeft=position.x;piste.scrollTop=position.y;}
    if(rendreFocus!==false&&retour&&retour.isConnected&&table.classList.contains("show"))retour.focus({preventScroll:true});
    position=null;retour=null;reveillerMesures();return true;
  }
  function voisin(delta){var i=SET_VOIES.findIndex(function(v){return v[0]===selection;});if(i<0)return;ouvrir(SET_VOIES[(i+delta+SET_VOIES.length)%SET_VOIES.length][0]);}
  nav.querySelector("#tf-precedent").addEventListener("click",function(){voisin(-1);});
  nav.querySelector("#tf-suivant").addEventListener("click",function(){voisin(1);});
  nav.querySelector("#tf-retour").addEventListener("click",function(){fermer();});
  choix.addEventListener("change",function(){ouvrir(choix.value);});
  piste.addEventListener("input",actualiser);
  // La synchronisation native rétablit notamment les valeurs après une ouverture
  // de projet. Transmettre exactement ses arguments, son résultat et ses erreurs.
  var majNative=majTable;
  majTable=function(){var r=majNative.apply(this,arguments);equiper();actualiser();return r;};
  var fermerNative=fermerTable;
  fermerTable=function(){fermer(false);return fermerNative.apply(this,arguments);};
  new MutationObserver(function(){equiper();actualiser();}).observe(piste,{childList:true});
  new MutationObserver(function(){if(!table.classList.contains("show"))fermer(false);}).observe(table,{attributes:true,attributeFilter:["class"]});
  document.addEventListener("keydown",function(e){
    if(e.key!=="Escape"||e.defaultPrevented||!selection||!table.classList.contains("show"))return;
    e.preventDefault();e.stopPropagation();fermer();
  },true);
  equiper();actualiser();
  return {ouvrir:ouvrir,fermer:fermer,valeur:valeur,inspecter:function(){
    return {version:273,selection:selection,equipees:Object.keys(voies).length,actualisations:changements};
  }};
})();
