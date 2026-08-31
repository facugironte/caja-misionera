"use strict";

if (session) {
  var persistedState = loadState(session.tipo, session.identificador);
  if (validPersistedState(persistedState)) state[session.tipo] = persistedState;
}

var nav = {
  screen: session ? (state[session.tipo].setupDone ? "menu" : "setup") : "login",
  stand: session ? session.tipo : null,
  cart: [], payMethod: null, loginTipo: null, closingPuesto: false, cajaMovimientosExpanded: false, stockExpanded: {}
};
var root = document.getElementById("app");
var toastEl = document.getElementById("toast");
var toastTimer = null;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
}

function render() {
  saveState();
  document.body.dataset.stand = nav.screen === "login" ? (nav.loginTipo || "") : (nav.stand || "");
  if (nav.screen === "login") return renderLogin();
  if (nav.screen === "menu") return renderMenu();
  if (nav.screen === "setup") return renderSetup();
  if (nav.screen === "vender") return renderVender();
  if (nav.screen === "caja") return renderCaja();
  if (nav.screen === "seteoStock") return renderSeteoStock();
}

function bindBack(fn) {
  var b = document.getElementById("backBtn");
  if (b) b.addEventListener("click", fn);
}

function switchPuesto() {
  localStorage.removeItem(SESSION_KEY);
  session = null;
  nav.stand = null;
  nav.screen = "login";
  nav.loginTipo = null;
  nav.closingPuesto = false;
  render();
}
