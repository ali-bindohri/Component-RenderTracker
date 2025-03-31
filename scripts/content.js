chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "START_TRACKING") {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/inject.js");
    script.dataset.componentName = message.componentName;
    document.body.appendChild(script);
  }
});
