/* ================= mise à l'échelle ================= */
function fit(){
  /* v275 : un resize (ou un rappel différé) ne doit pas redimensionner la
     dernière façade solo au milieu de la scène. La vue d'ensemble défile à
     taille naturelle ; sa feuille de style disparaît dès qu'on la quitte. */
  if(typeof ENS !== "undefined" && ENS && ENS.actif) return;
  var u = actif, large = (u === unit) ? "1040px" : "1120px";
  u.style.transform = "none";
  u.style.flex = "";
  u.style.width = "100%";
  u.style.maxWidth = large;
  /* v260 : ces façades se recomposent au lieu de rétrécir leurs commandes.
     Le défilement reste interne : les panneaux, le menu et les autres machines
     gardent leur mise en page. Ne pas remettre scrollTop à zéro ici : fit()
     est aussi rappelé après un changement de son ou de tranche. */
  /* v269 : SmplTrek conserve ses textes et son défilement aussi sur tablette. */
  var recentes = {"unit-ko":520, "unit-mc":680, "unit-stk":(window.innerWidth >= 760 && window.innerHeight <= 540 ? 1040 : 680), "unit-kp":1120};
  var confort = !!recentes[u.id] && (u.id === "unit-stk" || window.innerWidth <= 960 || window.innerHeight <= 540);
  document.querySelectorAll(".ui-confort").forEach(function(el){
    if(el !== u){ el.classList.remove("ui-confort"); el.style.removeProperty("--ui-hauteur"); }
  });
  document.body.classList.toggle("ui-mobile", confort);
  u.classList.toggle("ui-confort", confort);
  if(confort){
    u.style.maxWidth = recentes[u.id] + "px";
    u.style.flex = "0 1 auto";
    u.style.setProperty("--ui-hauteur", Math.max(160, window.innerHeight - 66) + "px");
    if(!u.offsetHeight) return;
    ZOOM.base = 1;
    appliquerZoom();
    return;
  }
  u.style.removeProperty("--ui-hauteur");
  var aw = window.innerWidth - 4, ah = window.innerHeight - 4;
  if(!u.offsetHeight) return;
  var s = Math.min(1, ah/u.offsetHeight);
  /* La largeur ne comptait que si la hauteur ne tenait pas. Une façade plus
     large que l'écran mais assez courte n'était donc jamais réduite : tout ce
     qui dépassait à droite restait hors d'atteinte — les pads de la MPC.
     `scrollWidth` révèle ce débordement, que `offsetWidth` cache puisqu'il ne
     rend que la largeur du bloc, pas celle de son contenu. */
  var deborde = u.scrollWidth > u.offsetWidth + 1;
  if(s < 0.995 || deborde){
    u.style.maxWidth = "none";
    u.style.flex = "0 0 auto";
    /* on rend à la façade sa largeur naturelle avant de la réduire */
    u.style.width = Math.max(u.scrollWidth, Math.floor(aw/s)) + "px";
    if(u.scrollWidth > u.offsetWidth + 1) u.style.width = u.scrollWidth + "px";
    s = Math.min(aw/u.offsetWidth, ah/u.offsetHeight);
  }
  ZOOM.base = s;
  appliquerZoom();
}

