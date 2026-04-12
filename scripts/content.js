// Content script — acts as a bridge between the page and the extension.
// Listens for picker results from the page (window.postMessage)
// and forwards them to the background service worker.

let storedHighlightColor = "#58a6ff";

// Listen for highlight color updates from the popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SET_PICKER_COLOR") {
    storedHighlightColor = message.highlightColor || "#58a6ff";
  }
});

// Listen for messages from injected picker script (runs in page's main world)
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type && event.data.type === "REACT_TRACKER_COMPONENT_PICKED") {
    const name = event.data.name;
    // Tell background to inject the tracker for the picked component
    chrome.runtime.sendMessage({
      type: "PICKED_COMPONENT",
      componentName: name,
      highlightColor: storedHighlightColor,
    });
  }
});
