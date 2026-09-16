/* ================= séquenceur ================= */
var step=0, nextT=0, timer=null, queue=[], cache=false;
function look(){ return cache ? 1.2 : 0.22; }
function periode(){ return cache ? 150 : 45; }
var VEL = {X:1.0, x:0.72, o:0.38};
function rythme(){
  var b = MODELE.banques > 1 ? (S.bank ? BANQUE_B : BANQUE_A) : BANQUE_A;
  return b[S.style][S.col];
}
function muted(k){
  if(MODELE.coupe[S.del].indexOf(k) >= 0) return true;
  if(k === "sp" && MODELE.modeDroite === "space" && !S.space) return true;
  return false;
}
function stepDur(){ return 60/S.bpm/4; }
function appliquerMotFxEm(v, champ){
  if(champ === "e1"){ EM.e1 = v; construireFx(); }
  else if(champ === "e2"){ EM.e2 = v; construireFx(); }
  else if(champ === "dTime"){ EM.dTime = 0.03+v*1.1; if(dlyNode) ctp(dlyNode.delayTime, EM.dTime, 0.05); }
  else if(champ === "dDep"){ EM.dDepth = v; if(dlyIn) ctp(dlyIn.gain, v*0.6, 0.05); }
}
function scheduleEhx(i,t){
  var pat = rythme(), sw = pat.sw||0;
  if(sw && i%2===1) t += stepDur()*sw*0.55;
  for(var k in pat){
    if(k==="sw" || !V[k] || muted(k)) continue;
    var ch = pat[k].charAt(i), v = VEL[ch];
    if(v){ V[k](t, v); midiVoix(k, t, v); }
  }
  if(!cache) queue.push({i:i,t:t});
}
