// Logic to toggle input visibility based on mode
const radios = document.querySelectorAll('input[name="trackMode"]');
const inputGroup = document.getElementById("nameInputGroup");
const input = document.getElementById("componentName");
const colorInput = document.getElementById("highlightColor");
const colorLabel = document.getElementById("colorLabel");
const pickBtn = document.getElementById("pickBtn");

// Toggle input state
radios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "all") {
      inputGroup.style.opacity = "0.5";
      input.disabled = true;
    } else {
      inputGroup.style.opacity = "1";
      input.disabled = false;
    }
  });
});

// Update color label
colorInput.addEventListener("input", (e) => {
  colorLabel.textContent = e.target.value;
});

// Handle Pick Button
pickBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const highlightColor = document.getElementById("highlightColor").value;

  // Inject content script first (for the message bridge)
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["scripts/content.js"],
  });

  // Ask background to inject picker into main world
  chrome.runtime.sendMessage({
    type: "INJECT_PICKER",
    tabId: tab.id,
    highlightColor,
  });

  window.close();
});

document.getElementById("startBtn").addEventListener("click", async () => {
  const componentName = document.getElementById("componentName").value;
  const trackMode = document.querySelector(
    'input[name="trackMode"]:checked'
  ).value;
  const highlightColor = document.getElementById("highlightColor").value;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Inject content script first (for the message bridge)
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["scripts/content.js"],
  });

  // Ask background to inject tracker into main world
  chrome.runtime.sendMessage({
    type: "INJECT_TRACKER",
    tabId: tab.id,
    componentName,
    trackMode,
    highlightColor,
  });
});
