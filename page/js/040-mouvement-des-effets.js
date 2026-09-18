/* ================= mouvement des effets =================
   Enregistre EDIT 1 ou EDIT 2 sur les seize pas. C'est devenu possible sans heurt
   depuis que les effets se règlent en place au lieu d'être reconstruits. */
function motFxVide(){ return {mode:0, p:"e1", v:null, slot:0}; }
function motFxValeur(m, i, L){
  if(!m || !m.mode || !m.v) return null;
  var v = m.v[i % (L||16)];
  return (typeof v === "number") ? v : null;
}
function motFxEcrire(m, champ, val, enCours, pos, longueur){
  if(!m || !m.mode) return;
  if(!enCours || pos < 0){ m.p = champ; return; }
  if(m.p !== champ || !m.v){
    m.p = champ; m.v = [];
    for(var i=0;i<(longueur || 16);i++) m.v.push(val);
  }
  m.v[pos] = val;
}

