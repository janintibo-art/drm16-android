/* ================= retour haptique ================= */
var VIB = !!(window.navigator && navigator.vibrate);
function buzz(motif){
  if(!S.haptic || !VIB) return;
  try{ navigator.vibrate(motif); }catch(e){}
}
var H = {
  cran:  function(){ buzz(7); },
  inter: function(){ buzz(16); },
  start: function(){ buzz(24); },
  stop:  function(){ buzz([12,55,12]); }
};

function applyBass(){
  if(!panBd || !panMix) return;
  panBd.pan.value  = S.bass ?  1   : 0;
  panMix.pan.value = S.bass ? -0.6 : 0;
}

