/* ================= affichage du temps ================= */
var led = document.getElementById("led-power");
/* L'instant audio auquel le pas affiché a commencé. Une frappe tombe presque
   toujours un peu APRÈS le temps qu'elle vise : sans cet instant, on ne peut
   pas savoir si elle appartient au pas courant ou au suivant. */
var T_PAS = 0;
function draw(){
  if(!S.run) return;
  var now = ctx ? maintenantAudio() : 0, cur=-1;
  while(queue.length && queue[0].t <= now){ var e = queue.shift(); cur = e.i; T_PAS = e.t; }
  if(cur>=0){
    MACHINE.beat(cur);
    /* En vue d'ensemble, toutes les machines du set sont à l'écran : leurs
       curseurs de pas doivent avancer, pas seulement celui de la machine
       « courante ». */
    if(ENS.actif) SET_VOIES.forEach(function(v){
      var M = moteurSet(v[0]);
      if(!M || M === MACHINE || !SET.actives[v[0]] || !M.beat) return;
      var L = M.longueur ? M.longueur() : 16;
      try{ M.beat(((pasSet - 1) % L + L) % L); }catch(e){}
    });
  }
  requestAnimationFrame(draw);
}
/* Le pas auquel rattacher une frappe : le courant si on est dans sa première
   moitié, le suivant sinon. C'est ce que fait l'oreille. */
function pasLePlusProche(pos, L){
  if(pos < 0 || !ctx || !L) return -1;
  var f = (maintenantAudio() - T_PAS) / stepDur();
  var p = pos + (f > 0.5 ? 1 : 0);
  return ((p % L) + L) % L;
}
function beatEhx(i){
  if(i%4===0) led.classList.add("beat");
  else if(i%4===1) led.classList.remove("beat");
}
function arretEhx(){ led.classList.remove("beat"); }
var MACHINE_EHX = {schedule:scheduleEhx, beat:beatEhx, arret:arretEhx};
var MACHINE = MACHINE_EHX;

