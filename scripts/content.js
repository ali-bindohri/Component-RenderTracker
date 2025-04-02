chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "START_TRACKING") {
    const existingScript = document.getElementById("react-render-counter");
    if (existingScript) {
      const userChoice = window.confirm(
        "Tracking is already active! Do you want to reset and track a new component?"
      );
      if (!userChoice) return;

      existingScript.remove();
      const existingCounter = document.getElementById("react-render-ui");
      if (existingCounter) existingCounter.remove(); // Remove counter UI as well
    }

    setTimeout(() => {
      // Inject new script
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("scripts/inject.js");
      script.dataset.componentName = message.componentName;
      script.id = "react-render-counter";
      document.body.appendChild(script);
    }, 0);
  }
});
