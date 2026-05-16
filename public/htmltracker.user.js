// ==UserScript==
// @name         HTML Tracker Auto Mouse
// @namespace    htmltracker
// @version      1.0
// @description  F5 dan keyin ham sichqoncha rejimi ishlashi uchun
// @match        *://*/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  if (localStorage.getItem("htmltracker") !== "1") return;
  if (window.__htmltrackerMouse) return;

  const s = document.createElement("script");
  s.type = "module";
  s.src = "https://htmltracker.onrender.com/mouse-only.js?" + Date.now();
  (document.documentElement || document.head || document.body).appendChild(s);
})();
