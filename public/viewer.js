(function () {
  var statusDot  = document.getElementById("status-dot");
  var statusText = document.getElementById("status-text");
  var textEl     = document.getElementById("text-content");
  var htmlFrame  = document.getElementById("html-frame");
  var placeholder = document.getElementById("html-placeholder");
  var metaSource = document.getElementById("meta-source");
  var metaTime   = document.getElementById("meta-time");
  var metaUrl    = document.getElementById("meta-url");

  function setStatus(live, message) {
    statusDot.className = "dot" + (live ? " live" : live === false ? " error" : "");
    statusText.textContent = message;
  }

  function formatTime(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
    } catch (_e) {
      return iso;
    }
  }

  function applyState(state) {
    if (!state) return;

    var text = state.text || "";
    if (text) {
      textEl.textContent = text;
      textEl.classList.remove("empty");
    }

    metaSource.textContent = state.source || "—";
    metaTime.textContent   = formatTime(state.updatedAt);
    metaUrl.textContent    = state.url || "—";

    if (state.html) {
      placeholder.hidden = true;
      htmlFrame.hidden = false;
      htmlFrame.srcdoc = state.html;
    }
  }

  fetch("/api/latest")
    .then(function (r) { return r.json(); })
    .then(applyState)
    .catch(function () {});

  var source = new EventSource("/events");

  source.onopen = function () {
    setStatus(true, "Jonli ulanish");
  };

  source.onmessage = function (event) {
    try {
      applyState(JSON.parse(event.data));
    } catch (_e) {}
  };

  source.onerror = function () {
    setStatus(false, "Ulanish uzildi — qayta urinilmoqda...");
  };
})();
