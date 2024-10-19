document.addEventListener("DOMContentLoaded", function () {
  const apiKeyInput = document.getElementById("apiKey");
  const saveButton = document.getElementById("saveButton");

  chrome.storage.sync.get(["apiKey"], function (result) {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });

  saveButton.addEventListener("click", function () {
    const apiKey = apiKeyInput.value;
    chrome.storage.sync.set({ apiKey: apiKey }, function () {
      alert("API key saved!");
    });
  });
});
