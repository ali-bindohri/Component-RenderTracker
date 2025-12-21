let storedHighlightColor = "#58a6ff";

// Helper to inject the tracker script
function starTracker(componentName, trackMode, highlightColor) {
  const existingScript = document.getElementById("react-render-message");
  if (existingScript) {
    // If we just picked a component, maybe we want to restart?
    // For now, respect the "already active" check but maybe clean up first?
    // Let's alert for now to be safe.
    window.alert(
      "Tracking is already active! Reload or close the message box to start a new session."
    );
    return;
  }

  setTimeout(() => {
    // Inject Tracker Logic
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/inject.js");
    script.id = "react-render-counter";
    script.dataset.componentName = componentName;
    script.dataset.trackMode = trackMode;
    script.dataset.highlightColor = highlightColor || "#58a6ff";
    document.body.appendChild(script);
  }, 0);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "START_TRACKING") {
    starTracker(
      message.componentName,
      message.trackMode,
      message.highlightColor
    );
  }

  if (message.type === "ACTIVATE_PICKER") {
    storedHighlightColor = message.highlightColor || "#58a6ff";
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/picker.js");
    script.onload = () => script.remove();
    document.body.appendChild(script);
  }
});

// Listen for messages from injected picker script
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type && event.data.type === "REACT_TRACKER_COMPONENT_PICKED") {
    const name = event.data.name;
    // Auto-start tracking!
    // We assume "specific" mode because we just picked a specific component.
    starTracker(name, "specific", storedHighlightColor);
  }
});
