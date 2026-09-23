/* ================= CYCLES LIBRES — v291 =================
   Un réglage commun de pas par mesure, partagé par SCÈNES 8, HARMONIE 8 et
   les fills de DRUM 32 / BREAK 32, pour faire suivre leurs changements de
   scène à un cycle qui n'est pas du 4/4 : 7/8 (14 pas), 9/8 (18 pas), 5/4
   (20 pas) ou un regroupement personnalisé (4 à 32 pas).

   La grille d'horloge du rack reste toujours le seizième de note partout :
   CYCLES LIBRES ne change ni le tempo ni la résolution des impulsions CLK,
   seulement le nombre d'entre elles qui composent UNE mesure, module par
   module. Par défaut 16 (4/4), donc aucun ancien montage ni projet .drm16
   ne change de comportement. Ce fichier ne définit aucun module Eurorack :
   c'est une aide partagée par d'autres fichiers, chargée avant eux. */
var EUR_CYCLE = (function(){
  "use strict";
  var presets = [[16,"4/4 · 16 pas"],[14,"7/8 · 14 pas"],[18,"9/8 · 18 pas"],[20,"5/4 · 20 pas"]];
  function val(v){ return Number.isFinite(v) ? Math.max(4, Math.min(32, Math.round(v))) : 16; }
  /* Remplit un <select> HTML avec les métriques usuelles plus une option
     LIBRE ; la valeur courante, même hors liste, reste affichée fidèlement. */
  function remplirSelect(sel, valeur){
    sel.innerHTML = "";
    presets.forEach(function(p){
      var o = document.createElement("option"); o.value = p[0]; o.textContent = p[1]; sel.appendChild(o);
    });
    var libre = document.createElement("option");
    libre.value = "libre"; libre.textContent = "LIBRE · " + val(valeur) + " pas"; sel.appendChild(libre);
    sel.value = presets.some(function(p){ return p[0] === val(valeur); }) ? String(val(valeur)) : "libre";
  }
  return {presets:presets, val:val, remplirSelect:remplirSelect};
})();
