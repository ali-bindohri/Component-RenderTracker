document.getElementById("startBtn").addEventListener("click", async () => {
  const componentName = document.getElementById("componentName").value;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["scripts/content.js"],
  });

  chrome.tabs.sendMessage(tab.id, {
    type: "START_TRACKING",
    componentName: componentName,
  });
});
