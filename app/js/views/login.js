"use strict";

function renderLogin() {
  var html = "";
  html += h("div", { class: "hero" },
    '<div class="hero-mark">⛺</div>' +
    "<h1>Caja Misionera</h1>" +
    "<p>Kermesse Familiar · Grupo Misionero — Colegio</p>"
  );
  var tipo = nav.loginTipo;
  if (!tipo) {
    html += '<div class="eyebrow" style="padding-left:18px;">¿Qué puesto vas a operar?</div>';
    html += '<div class="stand-cards">';
    Object.keys(STANDS).forEach(function (key) {
      var s = STANDS[key];
      html += h("button", { class: "stand-card c-" + key, "data-stand": key },
        '<div class="mark">' + s.icon + "</div>" +
        "<div><h2>" + s.label + "</h2><p>" + s.sub + "</p></div>" +
        '<span class="chev">›</span>'
      );
    });
    html += "</div>";
    root.innerHTML = html;
    root.querySelectorAll(".stand-card").forEach(function (btn) {
      btn.addEventListener("click", function () {
        nav.loginTipo = btn.getAttribute("data-stand");
        render();
      });
    });
    return;
  }

  var s = STANDS[tipo];
  html += '<div class="eyebrow" style="padding-left:18px;">Identificá tu puesto</div>';
  html += '<div class="set-row" style="margin:0 18px 10px;">' +
    '<div class="head"><span class="icon">' + s.icon + '</span><span class="name">' + s.label + '</span></div>' +
    '<label class="field-label">Identificador del puesto' +
    '<input type="text" id="loginId" placeholder="Ej. ' + s.label + ' 1" maxlength="40"></label>' +
    '<label class="field-label">Nombre del voluntario a cargo' +
    '<input type="text" id="loginVoluntario" placeholder="Tu nombre" maxlength="40"></label>' +
    "</div>";
  html += '<div class="close-corte-wrap">' +
    '<button class="link-btn" id="loginBack">‹ Elegir otro puesto</button>' +
    '<button class="btn-block" id="btnIngresar" style="margin-top:8px;">Ingresar</button>' +
    "</div>";
  root.innerHTML = html;
  document.getElementById("loginBack").addEventListener("click", function () { nav.loginTipo = null; render(); });
  document.getElementById("loginId").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") document.getElementById("loginVoluntario").focus();
  });
  document.getElementById("loginVoluntario").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") document.getElementById("btnIngresar").click();
  });
  document.getElementById("btnIngresar").addEventListener("click", function () {
    var idVal = document.getElementById("loginId").value.trim();
    var volVal = document.getElementById("loginVoluntario").value.trim();
    if (!idVal) { showToast("Ingresá un identificador para el puesto."); return; }
    if (!volVal) { showToast("Ingresá el nombre del voluntario a cargo."); return; }
    session = { tipo: tipo, identificador: idVal, voluntario: volVal, inicio: new Date().toISOString() };
    saveSession();
    var persisted = loadState(tipo, idVal);
    state[tipo] = persisted || freshStandState(tipo);
    nav.stand = tipo;
    nav.screen = state[tipo].setupDone ? "menu" : "setup";
    nav.loginTipo = null;
    render();
    showToast("Puesto identificado: " + idVal + " · " + volVal);
  });
}
