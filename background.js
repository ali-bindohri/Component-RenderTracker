// Background service worker for React Render Tracker
// Handles script injection using the MV3-approved chrome.scripting API

chrome.runtime.onMessage.addListener((message, sender) => {
  // Get the tab ID from the message or from the sender (content script)
  const tabId = message.tabId || sender?.tab?.id;

  if (message.type === "INJECT_TRACKER" && tabId) {
    injectTracker(tabId, message.componentName, message.trackMode, message.highlightColor);
  }

  if (message.type === "INJECT_PICKER" && tabId) {
    // Also tell the content script the current color for later use
    chrome.tabs.sendMessage(tabId, {
      type: "SET_PICKER_COLOR",
      highlightColor: message.highlightColor,
    });
    injectPicker(tabId, message.highlightColor);
  }

  if (message.type === "PICKED_COMPONENT" && sender?.tab?.id) {
    // User picked a component via the picker — inject tracker for it
    injectTracker(
      sender.tab.id,
      message.componentName,
      "specific",
      message.highlightColor
    );
  }
});

// Inject the render tracker into the page's main world
async function injectTracker(tabId, componentName, trackMode, highlightColor) {
  try {
    // First, set the config on the page's window object
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [{ componentName, trackMode, highlightColor: highlightColor || "#58a6ff" }],
      func: (config) => {
        window.__RENDER_TRACKER_CONFIG__ = config;
      },
    });

    // Then inject the tracker script
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      files: ["scripts/inject.js"],
    });
  } catch (err) {
    console.error("React Render Tracker: Failed to inject tracker", err);
  }
}

// Inject the component picker into the page's main world
async function injectPicker(tabId, highlightColor) {
  try {
    // Set picker config
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [highlightColor || "#58a6ff"],
      func: (color) => {
        window.__RENDER_TRACKER_PICKER_COLOR__ = color;
      },
    });

    // Inject picker script
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      files: ["scripts/picker.js"],
    });
  } catch (err) {
    console.error("React Render Tracker: Failed to inject picker", err);
  }
}
