/* ================= mise à l'échelle ================= */
function fit(){
  var u = actif, large = (u === unit) ? "1040px" : "1120px";
  u.style.transform = "none";
  u.style.flex = "";
  u.style.width = "100%";
  u.style.maxWidth = large;
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

