chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "START_TRACKING") {
    const existingScript = document.getElementById("react-render-message");
    if (existingScript) {
      window.alert(
        "Tracking is already active! close the message box to start again."
      );
      return;
    }

    setTimeout(() => {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("scripts/inject.js");
      script.id = "react-render-counter";
      script.dataset.componentName = message.componentName;
      script.dataset.trackMode = message.trackMode;
      document.body.appendChild(script);
    }, 0);
  }
});
