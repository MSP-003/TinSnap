var batchState = {
  urls: [],
  currentIndex: 0,
  status: "idle",
  tabId: null,
  callerTabId: null,
  delayMs: 4000,
  timeoutId: null
};

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
  if (msg.action === "startBatch") {
    startBatch(msg.urls, msg.delayMs, sender.tab ? sender.tab.id : null);
  }

  if (msg.action === "pauseBatch") {
    pauseBatch();
  }

  if (msg.action === "resumeBatch") {
    resumeBatch();
  }

  if (msg.action === "skipCurrent") {
    skipCurrent();
  }

  if (msg.action === "claimResult") {
    handleClaimResult(msg.outcome, msg.code);
  }

  if (msg.action === "getStats") {
    chrome.storage.local.get("stats", function (data) {
      sendResponse(data.stats || { submitted: 0, errors: 0 });
    });
    return true;
  }

  if (msg.action === "getBatchStatus") {
    sendResponse({
      status: batchState.status,
      currentIndex: batchState.currentIndex,
      total: batchState.urls.length
    });
    return true;
  }
});

function notifyCaller(message) {
  if (batchState.callerTabId) {
    chrome.tabs.sendMessage(batchState.callerTabId, message).catch(function () {});
  }
}

function startBatch(urls, delayMs, callerTabId) {
  if (!urls || urls.length === 0) return;

  batchState.urls = urls;
  batchState.currentIndex = 0;
  batchState.status = "running";
  batchState.delayMs = delayMs || 4000;
  batchState.callerTabId = callerTabId;

  console.log("[TinSnap BG] Batch started:", urls.length, "URLs");

  notifyCaller({
    type: "TINSNAP_BATCH_STATUS",
    status: "running",
    currentIndex: 0,
    total: urls.length
  });

  openCurrentUrl();
}

function pauseBatch() {
  if (batchState.status !== "running") return;
  batchState.status = "paused";
  clearBatchTimeout();
  console.log("[TinSnap BG] Batch paused at index", batchState.currentIndex);

  notifyCaller({
    type: "TINSNAP_BATCH_STATUS",
    status: "paused",
    currentIndex: batchState.currentIndex,
    total: batchState.urls.length
  });
}

function resumeBatch() {
  if (batchState.status !== "paused") return;
  batchState.status = "running";
  console.log("[TinSnap BG] Batch resumed at index", batchState.currentIndex);

  notifyCaller({
    type: "TINSNAP_BATCH_STATUS",
    status: "running",
    currentIndex: batchState.currentIndex,
    total: batchState.urls.length
  });

  openCurrentUrl();
}

function skipCurrent() {
  handleClaimResult("skipped", null);
}

function handleClaimResult(outcome, code) {
  if (batchState.status !== "running") return;

  clearBatchTimeout();

  console.log("[TinSnap BG] Claim result:", outcome, "code:", code, "index:", batchState.currentIndex);

  chrome.storage.local.get("stats", function (data) {
    var stats = data.stats || { submitted: 0, errors: 0 };
    if (outcome === "claimed") {
      stats.submitted++;
    } else if (outcome === "already_claimed" || outcome === "failed" || outcome === "timeout") {
      stats.errors++;
    }
    chrome.storage.local.set({ stats: stats });
  });

  notifyCaller({
    type: "TINSNAP_CLAIM_DONE",
    code: code,
    outcome: outcome,
    index: batchState.currentIndex,
    success: outcome === "claimed"
  });

  batchState.currentIndex++;

  if (batchState.currentIndex >= batchState.urls.length) {
    console.log("[TinSnap BG] Batch complete!");
    batchState.status = "complete";

    notifyCaller({
      type: "TINSNAP_BATCH_STATUS",
      status: "complete",
      currentIndex: batchState.currentIndex,
      total: batchState.urls.length
    });

    setTimeout(function () {
      if (batchState.tabId) {
        chrome.tabs.remove(batchState.tabId).catch(function () {});
        batchState.tabId = null;
      }
    }, 1000);
    return;
  }

  notifyCaller({
    type: "TINSNAP_BATCH_STATUS",
    status: "running",
    currentIndex: batchState.currentIndex,
    total: batchState.urls.length
  });

  setTimeout(function () {
    if (batchState.status === "running") {
      openCurrentUrl();
    }
  }, batchState.delayMs);
}

function openCurrentUrl() {
  if (batchState.currentIndex >= batchState.urls.length) return;

  var url = batchState.urls[batchState.currentIndex];
  console.log("[TinSnap BG] Opening URL", batchState.currentIndex + 1, "of", batchState.urls.length, ":", url);

  if (batchState.tabId) {
    chrome.tabs.get(batchState.tabId, function (tab) {
      if (chrome.runtime.lastError || !tab) {
        createNewTab(url);
      } else {
        chrome.tabs.update(batchState.tabId, { url: url });
        startClaimTimeout();
      }
    });
  } else {
    createNewTab(url);
  }
}

function createNewTab(url) {
  chrome.tabs.create({ url: url, active: false }, function (tab) {
    if (tab) {
      batchState.tabId = tab.id;
      startClaimTimeout();
    }
  });
}

function startClaimTimeout() {
  clearBatchTimeout();
  batchState.timeoutId = setTimeout(function () {
    if (batchState.status === "running") {
      console.log("[TinSnap BG] Claim timeout at index", batchState.currentIndex);
      handleClaimResult("timeout", null);
    }
  }, 30000);
}

function clearBatchTimeout() {
  if (batchState.timeoutId) {
    clearTimeout(batchState.timeoutId);
    batchState.timeoutId = null;
  }
}

chrome.tabs.onRemoved.addListener(function (tabId) {
  if (tabId === batchState.tabId) {
    console.log("[TinSnap BG] Claim tab was closed externally");
    batchState.tabId = null;

    if (batchState.status === "running") {
      handleClaimResult("skipped", null);
    }
  }
  if (tabId === batchState.callerTabId) {
    console.log("[TinSnap BG] Caller tab closed, stopping batch");
    batchState.status = "idle";
    clearBatchTimeout();
    if (batchState.tabId) {
      chrome.tabs.remove(batchState.tabId).catch(function () {});
      batchState.tabId = null;
    }
  }
});
