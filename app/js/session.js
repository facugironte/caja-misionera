"use strict";

var SESSION_KEY = "cajaMisioneraSession";
var session = null;
try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) { session = null; }
if (session && !STANDS[session.tipo]) session = null;

function saveSession() { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }

function puestoToken() {
  if (!session) return "";
  return session.tipo + ":" + slugify(session.identificador);
}
