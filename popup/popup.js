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

  // Inject content script if needed (mostly ensured by manifest, but to be safe/lazy load)
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["scripts/content.js"],
  });

  const highlightColor = document.getElementById("highlightColor").value; // Capture current color
  chrome.tabs.sendMessage(tab.id, { type: "ACTIVATE_PICKER", highlightColor });
  window.close(); // Optional: close popup to let user pick, or stay open?
  // UX decision: User needs to click on page, so popup will close anyway.
});

// Listen for picked component message (if we keep popup open, but usually popup closes)
// Actually, since popup closes when user clicks webpage, we can't receive the message here easily.
// Ideally:
// 1. User clicks Pick.
// 2. Popup closes.
// 3. Page enters pick mode.
// 4. User clicks component.
// 5. Component Name is saved to storage OR simply alerted?
// WAIT: If popup closes, we lose context.
// Better UX:
// The user picks a component. The NAME is copied to clipboard OR stored in chrome.storage.local.
// Next time popup opens, we autofill from storage or clipboard?
// OR: We just assume the user remembers it?
// BETTER: The picker copies to clipboard.
// EVEN BETTER: We re-open the popup? (Hard)
// LET'S DO: Copy to Clipboard and Show a Toast on the Page.

document.getElementById("startBtn").addEventListener("click", async () => {
  const componentName = document.getElementById("componentName").value;
  const trackMode = document.querySelector(
    'input[name="trackMode"]:checked'
  ).value;
  const highlightColor = document.getElementById("highlightColor").value;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["scripts/content.js"],
  });

  chrome.tabs.sendMessage(tab.id, {
    type: "START_TRACKING",
    componentName,
    trackMode,
    highlightColor,
  });
});
