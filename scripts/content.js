chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "START_TRACKING") {
    const existingScript = document.getElementById("react-render-counter");
    if (existingScript) {
      const userChoice = window.confirm(
        "Tracking is already active! Do you want to reset?"
      );
      if (!userChoice) return;

      existingScript.remove();
      document.getElementById("react-render-ui")?.remove();
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
