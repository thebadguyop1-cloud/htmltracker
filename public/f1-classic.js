(function () {
  var SERVER = "https://htmltracker.onrender.com/send-html";
  var HEALTH = "https://htmltracker.onrender.com/health";

  if (window.__htmltrackerSending) {
    alert("Yuborilmoqda, biroz kuting...");
    return;
  }
  window.__htmltrackerSending = true;

  function done() {
    window.__htmltrackerSending = false;
  }

  function sendPage() {
    fetch(SERVER, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html: document.documentElement.outerHTML,
        url: window.location.href,
      }),
    })
      .then(function (r) {
        return r.json().then(function (d) {
          return { ok: r.ok, status: r.status, data: d };
        });
      })
      .then(function (res) {
        done();
        if (res.ok && res.data && res.data.success) {
          alert("Telegramga page.html yuborildi.");
          return;
        }
        var err =
          (res.data && res.data.error && res.data.error.description) ||
          (res.data && res.data.error) ||
          "Server xatosi " + res.status;
        alert("Yuborilmadi: " + err);
      })
      .catch(function (err) {
        done();
        alert(
          "Serverga ulanib bo'lmadi.\n" +
            "Internet yoki render.com bloklangan bo'lishi mumkin.\n" +
            (err.message || err)
        );
      });
  }

  fetch(HEALTH, { mode: "cors", cache: "no-store" })
    .catch(function () {})
    .finally(sendPage);
})();
