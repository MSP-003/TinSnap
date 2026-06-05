(function () {
  "use strict";

  var isZYNRewards = window.location.pathname.indexOf("/ZYNRewards") !== -1;
  var isAlreadyClaimed = window.location.pathname.indexOf("/code-already-claimed") !== -1 ||
    window.location.pathname.indexOf("/already-claimed") !== -1;

  if (!isZYNRewards && !isAlreadyClaimed) return;

  var params = new URLSearchParams(window.location.search);
  var serialNumber = params.get("serialNumber");
  var queueData = parseQueue();

  if (!queueData && !serialNumber) {
    console.log("[TinSnap] No serialNumber and no queue, skipping.");
    return;
  }

  if (isAlreadyClaimed) {
    console.log("[TinSnap] Already-claimed page detected.");
    finishCode("already_claimed", serialNumber);
    return;
  }

  if (!serialNumber) {
    console.log("[TinSnap] No serialNumber, skipping.");
    return;
  }

  chrome.storage.local.get("enabled", function (data) {
    if (data.enabled === false) {
      console.log("[TinSnap] Extension disabled.");
      finishCode("skipped", serialNumber);
      return;
    }

    console.log("[TinSnap] Processing code:", serialNumber, "| Queue remaining:", queueData ? queueData.codes.length : 0);
    waitAndProcess(serialNumber);
  });

  function parseQueue() {
    var hash = window.location.hash || "";
    var match = hash.match(/tinsnap=([A-Za-z0-9+/=_-]+)/);
    if (!match) return null;
    try {
      var decoded = atob(match[1].replace(/-/g, "+").replace(/_/g, "/"));
      var data = JSON.parse(decoded);
      if (data && Array.isArray(data.codes)) {
        return data;
      }
    } catch (e) {
      console.warn("[TinSnap] Failed to parse queue from hash:", e);
    }
    return null;
  }

  function buildNextUrl(codes, delayMs) {
    if (!codes || codes.length === 0) return null;
    var nextCode = codes[0];
    var remaining = codes.slice(1);
    var payload = JSON.stringify({ codes: remaining, delayMs: delayMs || 3000 });
    var encoded = btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return "https://us.zyn.com/ZYNRewards/?serialNumber=" + encodeURIComponent(nextCode) + "#tinsnap=" + encoded;
  }

  function finishCode(outcome, code) {
    console.log("[TinSnap] Finished:", outcome, code);

    chrome.runtime.sendMessage({
      action: outcome === "claimed" ? "claimDone" : "claimError",
      outcome: outcome,
      code: code
    });

    try {
      if (window.opener) {
        window.opener.postMessage({
          type: "TINSNAP_CLAIM_DONE",
          code: code,
          outcome: outcome,
          success: outcome === "claimed"
        }, "*");
      }
    } catch (e) {}

    advanceToNext();
  }

  function advanceToNext() {
    if (!queueData || !queueData.codes || queueData.codes.length === 0) {
      console.log("[TinSnap] Queue empty, closing tab.");
      try {
        if (window.opener) {
          window.opener.postMessage({ type: "TINSNAP_BATCH_COMPLETE" }, "*");
        }
      } catch (e) {}

      setTimeout(function () {
        window.close();
      }, 800);
      return;
    }

    var delayMs = queueData.delayMs || 3000;
    var nextUrl = buildNextUrl(queueData.codes, delayMs);

    if (!nextUrl) {
      console.log("[TinSnap] No next URL, closing.");
      setTimeout(function () { window.close(); }, 800);
      return;
    }

    console.log("[TinSnap] Navigating to next code in", delayMs, "ms. Remaining:", queueData.codes.length);

    setTimeout(function () {
      window.location.href = nextUrl;
    }, delayMs);
  }

  function waitAndProcess(code) {
    setTimeout(function () {
      pollForForm(code, Date.now(), 18000);
    }, 2000);
  }

  function pollForForm(code, startTime, maxWait) {
    if (checkAlreadyClaimed()) {
      finishCode("already_claimed", code);
      return;
    }

    var input = findInput();
    var button = input ? findSubmitButton(input) : null;

    if (input && button) {
      console.log("[TinSnap] Found form elements, filling...");
      fillAndSubmit(input, button, code);
    } else if (Date.now() - startTime < maxWait) {
      setTimeout(function () {
        pollForForm(code, startTime, maxWait);
      }, 600);
    } else {
      console.warn("[TinSnap] Timed out waiting for form.");
      finishCode("timeout", code);
    }
  }

  function findInput() {
    var selectors = [
      'input[name="serialNumber"]',
      'input[name="code"]',
      'input[placeholder*="code" i]',
      'input[placeholder*="reward" i]',
      'input[placeholder*="serial" i]',
      '#zyn-rewards-select',
      'input[type="text"][maxlength]',
      'input[type="text"]'
    ];

    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < els.length; j++) {
        if (isVisible(els[j]) && !els[j].disabled && els[j].type !== "hidden") {
          return els[j];
        }
      }
    }

    var forms = document.querySelectorAll("form");
    for (var k = 0; k < forms.length; k++) {
      var inputs = forms[k].querySelectorAll('input[type="text"], input:not([type])');
      for (var m = 0; m < inputs.length; m++) {
        if (isVisible(inputs[m]) && !inputs[m].disabled) {
          return inputs[m];
        }
      }
    }
    return null;
  }

  function findSubmitButton(input) {
    var container = input.closest("form") || input.closest("section") || input.parentElement;
    var depth = 0;

    while (container && depth < 6) {
      var btns = container.querySelectorAll("button, input[type='submit']");
      for (var i = 0; i < btns.length; i++) {
        if (isVisible(btns[i]) && !btns[i].disabled) {
          var text = (btns[i].textContent || "").toLowerCase();
          if (text.indexOf("submit") !== -1 || text.indexOf("enter") !== -1 ||
              text.indexOf("redeem") !== -1 || text.indexOf("claim") !== -1 ||
              btns[i].type === "submit" || btns[i].classList.contains("btn--primary")) {
            return btns[i];
          }
        }
      }
      for (var j = 0; j < btns.length; j++) {
        if (isVisible(btns[j]) && !btns[j].disabled) {
          return btns[j];
        }
      }
      container = container.parentElement;
      depth++;
    }

    return document.querySelector("button.btn--primary") ||
      document.querySelector("button[type='submit']") || null;
  }

  function isVisible(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    var style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function fillAndSubmit(input, button, code) {
    input.scrollIntoView({ behavior: "instant", block: "center" });

    setTimeout(function () {
      input.focus();
      setInputValue(input, code);

      setTimeout(function () {
        button.scrollIntoView({ behavior: "instant", block: "center" });

        setTimeout(function () {
          if (button.disabled) {
            waitForEnabled(button, function () {
              clickAndMonitor(button, code);
            }, function () {
              finishCode("timeout", code);
            });
          } else {
            clickAndMonitor(button, code);
          }
        }, 400);
      }, 400);
    }, 400);
  }

  function setInputValue(input, value) {
    var nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, "value"
    );
    if (nativeSetter && nativeSetter.set) {
      nativeSetter.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    if (input.value !== value) {
      input.setAttribute("value", value);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    console.log("[TinSnap] Input set to:", input.value);
  }

  function waitForEnabled(button, onReady, onTimeout) {
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      if (!button.disabled) {
        clearInterval(iv);
        onReady();
      } else if (attempts > 25) {
        clearInterval(iv);
        onTimeout();
      }
    }, 200);
  }

  function clickAndMonitor(button, code) {
    console.log("[TinSnap] Clicking submit...");
    button.click();

    var done = false;
    var phase = "waitDisable";
    var retried = false;

    var iv = setInterval(function () {
      if (done) return;

      if (checkAlreadyClaimed()) {
        done = true;
        clearInterval(iv);
        finishCode("already_claimed", code);
        return;
      }

      if (checkSuccess()) {
        done = true;
        clearInterval(iv);
        finishCode("claimed", code);
        return;
      }

      if (phase === "waitDisable" && button.disabled) {
        phase = "waitReenable";
      } else if (phase === "waitReenable" && !button.disabled) {
        done = true;
        clearInterval(iv);
        setTimeout(function () {
          if (checkAlreadyClaimed()) {
            finishCode("already_claimed", code);
          } else {
            finishCode("claimed", code);
          }
        }, 1000);
      }
    }, 300);

    setTimeout(function () {
      if (!done && !retried && phase === "waitDisable") {
        retried = true;
        button.click();
      }
    }, 2500);

    setTimeout(function () {
      if (!done) {
        done = true;
        clearInterval(iv);
        if (checkAlreadyClaimed()) {
          finishCode("already_claimed", code);
        } else {
          finishCode("claimed", code);
        }
      }
    }, 10000);
  }

  function checkAlreadyClaimed() {
    var text = document.body ? (document.body.innerText || "") : "";
    if (text.indexOf("code has already been claimed") !== -1) return true;
    if (text.indexOf("already been claimed") !== -1) return true;
    if (text.indexOf("already been redeemed") !== -1) return true;
    if (/[Oo]ops/.test(text) && /claimed/i.test(text)) return true;
    if (window.location.pathname.indexOf("already-claimed") !== -1) return true;
    return false;
  }

  function checkSuccess() {
    var text = document.body ? (document.body.innerText || "") : "";
    if (text.indexOf("points have been added") !== -1) return true;
    if (text.indexOf("Points Added") !== -1) return true;
    if (text.indexOf("points added") !== -1) return true;
    if (text.indexOf("Congratulations") !== -1 && text.indexOf("point") !== -1) return true;
    if (text.indexOf("You earned") !== -1) return true;
    if (text.indexOf("Code accepted") !== -1) return true;
    return false;
  }
})();
