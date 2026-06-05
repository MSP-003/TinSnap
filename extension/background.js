chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(["enabled", "stats"], function (data) {
    if (data.enabled === undefined) {
      chrome.storage.local.set({ enabled: true });
    }
    if (!data.stats) {
      chrome.storage.local.set({ stats: { submitted: 0, errors: 0 } });
    }
  });
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.action === "claimDone") {
    chrome.storage.local.get("stats", function (data) {
      var stats = data.stats || { submitted: 0, errors: 0 };
      stats.submitted++;
      chrome.storage.local.set({ stats: stats });
    });
  }

  if (msg.action === "claimError") {
    chrome.storage.local.get("stats", function (data) {
      var stats = data.stats || { submitted: 0, errors: 0 };
      stats.errors++;
      chrome.storage.local.set({ stats: stats });
    });
  }

  if (msg.action === "getStats") {
    chrome.storage.local.get("stats", function (data) {
      sendResponse(data.stats || { submitted: 0, errors: 0 });
    });
    return true;
  }
});
