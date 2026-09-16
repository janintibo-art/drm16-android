/* ================= bandeau de signalement ================= */
var signalEl = null, signalTmr = null;
function signal(txt){
  if(!signalEl){
    signalEl = document.createElement("div");
    signalEl.id = "signal";
    document.body.appendChild(signalEl);
  }
  signalEl.textContent = txt;
  signalEl.classList.add("vu");
  clearTimeout(signalTmr);
  signalTmr = setTimeout(function(){ signalEl.classList.remove("vu"); }, 3500);
}
window.__drmSignal = signal;

