"use strict";

document.getElementById("syncBadge").addEventListener("click", function () {
  showToast("Reintentando sincronización...");
  flushQueue();
});
updateSyncBadge();
flushQueue();
render();
