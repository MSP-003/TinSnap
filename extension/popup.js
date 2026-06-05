document.addEventListener("DOMContentLoaded", function () {
  var enabledCheckbox = document.getElementById("enabled");
  var submittedEl = document.getElementById("submitted");
  var errorsEl = document.getElementById("errors");
  var resetBtn = document.getElementById("reset");

  chrome.storage.local.get(["enabled", "stats"], function (data) {
    enabledCheckbox.checked = data.enabled !== false;
    var stats = data.stats || { submitted: 0, errors: 0 };
    submittedEl.textContent = stats.submitted;
    errorsEl.textContent = stats.errors;
  });

  enabledCheckbox.addEventListener("change", function () {
    chrome.storage.local.set({ enabled: enabledCheckbox.checked });
  });

  resetBtn.addEventListener("click", function () {
    chrome.storage.local.set({ stats: { submitted: 0, errors: 0 } });
    submittedEl.textContent = "0";
    errorsEl.textContent = "0";
  });
});
