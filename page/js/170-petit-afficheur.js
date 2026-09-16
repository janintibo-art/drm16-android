/* ================= petit afficheur ================= */
var readEl = document.getElementById("read"), readTmr=null;
function say(txt){
  readEl.textContent = txt; readEl.classList.add("show");
  clearTimeout(readTmr); readTmr = setTimeout(function(){ readEl.classList.remove("show"); },1100);
}

