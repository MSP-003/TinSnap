(function () {
  "use strict";

  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    if (!event.data || !event.data.type) return;

    if (event.data.type === "TINSNAP_START_BATCH") {
      chrome.runtime.sendMessage({
        action: "startBatch",
        urls: event.data.urls,
        delayMs: event.data.delayMs || 4000
      });
    }

    if (event.data.type === "TINSNAP_PAUSE_BATCH") {
      chrome.runtime.sendMessage({ action: "pauseBatch" });
    }

    if (event.data.type === "TINSNAP_RESUME_BATCH") {
      chrome.runtime.sendMessage({ action: "resumeBatch" });
    }

    if (event.data.type === "TINSNAP_SKIP_CURRENT") {
      chrome.runtime.sendMessage({ action: "skipCurrent" });
    }
  });

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg.type === "TINSNAP_CLAIM_DONE" || msg.type === "TINSNAP_BATCH_STATUS") {
      window.postMessage(msg, "*");
    }
  });
})();
