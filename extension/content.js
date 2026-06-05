(function () {
  "use strict";

  var isZYNRewards = window.location.pathname.indexOf("/ZYNRewards") !== -1;
  var isAlreadyClaimed = window.location.pathname.indexOf("/code-already-claimed") !== -1 ||
    window.location.pathname.indexOf("/already-claimed") !== -1;

  if (!isZYNRewards && !isAlreadyClaimed) return;

  var params = new URLSearchParams(window.location.search);
  var serialNumber = params.get("serialNumber");

  if (isAlreadyClaimed) {
    console.log("[TinSnap] Already-claimed page detected.");
    reportResult("already_claimed", serialNumber);
    return;
  }

  if (!serialNumber) {
    console.log("[TinSnap] No serialNumber in URL, skipping.");
    return;
  }

  chrome.storage.local.get("enabled", function (data) {
    if (data.enabled === false) {
      console.log("[TinSnap] Extension disabled.");
      reportResult("skipped", serialNumber);
      return;
    }

    console.log("[TinSnap] Processing code:", serialNumber);
    waitAndProcess(serialNumber);
  });

  function reportResult(outcome, code) {
    console.log("[TinSnap] Reporting result:", outcome, code);
    chrome.runtime.sendMessage({
      action: "claimResult",
      outcome: outcome,
      code: code
    });
  }

  function waitAndProcess(code) {
    var startTime = Date.now();
    var maxWait = 15000;

    setTimeout(function () {
      pollForForm(code, startTime, maxWait);
    }, 2000);
  }

  function pollForForm(code, startTime, maxWait) {
    if (checkAlreadyClaimed()) {
      reportResult("already_claimed", code);
      return;
    }

    var input = findInput();
    var button = input ? findSubmitButton(input) : null;

    if (input && button) {
      console.log("[TinSnap] Found input and button, filling code...");
      fillAndSubmit(input, button, code);
    } else if (Date.now() - startTime < maxWait) {
      setTimeout(function () {
        pollForForm(code, startTime, maxWait);
      }, 500);
    } else {
      console.warn("[TinSnap] Timed out waiting for form elements");
      reportResult("timeout", code);
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
        var el = els[j];
        if (isVisible(el) && !el.disabled && el.type !== "hidden") {
          return el;
        }
      }
    }

    var forms = document.querySelectorAll("form");
    for (var k = 0; k < forms.length; k++) {
      var formInputs = forms[k].querySelectorAll('input[type="text"], input:not([type])');
      for (var m = 0; m < formInputs.length; m++) {
        if (isVisible(formInputs[m]) && !formInputs[m].disabled) {
          return formInputs[m];
        }
      }
    }

    return null;
  }

  function findSubmitButton(input) {
    var container = input.closest("form") || input.closest("div");
    var maxDepth = 5;
    var current = container;

    while (current && maxDepth > 0) {
      var btns = current.querySelectorAll("button, input[type='submit']");
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
      current = current.parentElement;
      maxDepth--;
    }

    var globalBtn = document.querySelector("button.btn--primary") ||
      document.querySelector("button[type='submit']");
    if (globalBtn && isVisible(globalBtn)) return globalBtn;

    return null;
  }

  function isVisible(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    var style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }

  function fillAndSubmit(input, button, code) {
    input.scrollIntoView({ behavior: "instant", block: "center" });

    setTimeout(function () {
      input.focus();

      setTimeout(function () {
        setInputValue(input, code);

        setTimeout(function () {
          button.scrollIntoView({ behavior: "instant", block: "center" });

          setTimeout(function () {
            if (button.disabled) {
              waitForEnabled(button, function () {
                clickAndWait(button, code);
              }, function () {
                reportResult("timeout", code);
              });
            } else {
              clickAndWait(button, code);
            }
          }, 300);
        }, 300);
      }, 200);
    }, 300);
  }

  function setInputValue(input, value) {
    input.focus();

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
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    console.log("[TinSnap] Input value set to:", input.value);
  }

  function waitForEnabled(button, onEnabled, onTimeout) {
    var attempts = 0;
    var maxAttempts = 25;
    var iv = setInterval(function () {
      attempts++;
      if (!button.disabled) {
        clearInterval(iv);
        onEnabled();
      } else if (attempts >= maxAttempts) {
        clearInterval(iv);
        onTimeout();
      }
    }, 200);
  }

  function clickAndWait(button, code) {
    console.log("[TinSnap] Clicking submit...");
    button.click();

    var done = false;
    var phase = "waitDisable";
    var retried = false;

    var checkIv = setInterval(function () {
      if (done) return;

      if (checkAlreadyClaimed()) {
        done = true;
        clearInterval(checkIv);
        reportResult("already_claimed", code);
        return;
      }

      if (checkSuccess()) {
        done = true;
        clearInterval(checkIv);
        reportResult("claimed", code);
        return;
      }

      if (phase === "waitDisable" && button.disabled) {
        phase = "waitReenable";
      } else if (phase === "waitReenable" && !button.disabled) {
        done = true;
        clearInterval(checkIv);
        setTimeout(function () {
          if (checkAlreadyClaimed()) {
            reportResult("already_claimed", code);
          } else {
            reportResult("claimed", code);
          }
        }, 800);
      }
    }, 300);

    setTimeout(function () {
      if (!done && !retried && phase === "waitDisable") {
        retried = true;
        console.log("[TinSnap] Retrying click...");
        button.click();
      }
    }, 2500);

    setTimeout(function () {
      if (!done) {
        done = true;
        clearInterval(checkIv);
        if (checkAlreadyClaimed()) {
          reportResult("already_claimed", code);
        } else if (checkSuccess()) {
          reportResult("claimed", code);
        } else {
          reportResult("claimed", code);
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
