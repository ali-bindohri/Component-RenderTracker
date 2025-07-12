//? Injected script to track React component re-renders and highlight updated DOM nodes
(function () {
  //? Get component name and tracking mode from script tag dataset
  const componentName = document.currentScript.dataset.componentName;
  const trackMode = document.currentScript.dataset.trackMode;
  const isTrackingAll = trackMode === "all";

  //? Store render counts and highlight timers/styles
  const renderCounts = {};
  const highlightTimers = new Map();
  const originalStyles = new Map();

  //? Access React DevTools global hook
  const devTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const originalOnCommit = devTools?.onCommitFiberRoot;

  //? Remove any existing message box and close button
  const scriptTag = document.currentScript;
  const existingBox = document.getElementById("react-render-message");
  const existingClose = document.getElementById("react-render-close");
  if (existingBox || existingClose) {
    existingBox?.remove();
    existingClose?.remove();
  }

  //? Create message box UI
  const messageBox = document.createElement("div");
  messageBox.id = "react-render-message";
  messageBox.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #0d1117;
    color: #58a6ff;
    padding: 10px 14px;
    font-family: sans-serif;
    font-size: 13px;
    border-radius: 6px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  const text = document.createElement("span");
  text.textContent = "Tracking React re-renders...";

  //? Create close button for message box
  const close = document.createElement("button");
  close.textContent = "✖";
  close.id = "react-render-close";
  close.style.cssText = `
    background: transparent;
    border: none;
    color: #999;
    font-size: 14px;
    cursor: pointer;
  `;

  //? Close button handler: remove UI, restore styles, cleanup
  close.onclick = () => {
    messageBox.remove();
    devTools.onCommitFiberRoot = originalOnCommit;

    //? Clear highlights
    for (const [node, timer] of highlightTimers.entries()) {
      clearTimeout(timer);
      restoreStyle(node);
    }

    highlightTimers.clear();
    originalStyles.clear();
    close.remove();
    scriptTag?.remove();
  };

  messageBox.appendChild(text);
  messageBox.appendChild(close);
  document.body.appendChild(messageBox);

  //? Check for React DevTools, then start tracking
  const checkReact = setInterval(() => {
    if (!devTools) {
      messageBox.textContent = "⚠️ React DevTools not found!";
      messageBox.style.background = "#ff0000";
      return;
    }
    clearInterval(checkReact);
    startTracking();
  }, 100);

  //? Set up tracking by patching onCommitFiberRoot
  function startTracking() {
    devTools.onCommitFiberRoot = (...args) => {
      originalOnCommit?.(...args);
      const fiberRoot = args[1];
      trackUpdatedFibers(fiberRoot.current);
    };
  }

  const UpdateFlag = 1; //? React update flag

  //? Recursively track updated fibers and highlight them
  function trackUpdatedFibers(fiber) {
    if (!fiber) return;

    const isUpdated = (fiber.flags & UpdateFlag) !== 0;
    const hasUpdatedDescendants = (fiber.subtreeFlags & UpdateFlag) !== 0;

    const name = fiber.type?.displayName || fiber.type?.name;

    //? Determine if this fiber should be tracked
    const shouldTrack =
      isUpdated &&
      (isTrackingAll || (trackMode === "specific" && name === componentName));

    if (shouldTrack) {
      //? Use _debugID if available, else random key
      const key = fiber._debugID || Math.random().toString(36).slice(2);
      if (!renderCounts[key]) {
        renderCounts[key] = { count: 0, name };
      }

      renderCounts[key].count++;
      highlightComponent(fiber);
    }

    //? Recursively check child and sibling fibers
    if (hasUpdatedDescendants && fiber.child) {
      trackUpdatedFibers(fiber.child);
    }

    if (fiber.sibling) {
      trackUpdatedFibers(fiber.sibling);
    }
  }

  //? Highlight the DOM node for a fiber
  function highlightComponent(fiber) {
    let domNode = fiber.stateNode;

    //? If no DOM node, try to find one in child fibers
    if (!domNode || !(domNode instanceof HTMLElement)) {
      let next = fiber.child;
      while (next && !next.stateNode) {
        next = next.child || next.sibling;
      }
      domNode = next?.stateNode || null;
    }

    if (domNode && domNode instanceof HTMLElement) {
      //? If already highlighted, clear previous timer and restore style
      if (highlightTimers.has(domNode)) {
        clearTimeout(highlightTimers.get(domNode));
        highlightTimers.delete(domNode);
        restoreStyle(domNode);
      }

      //? Save original styles for restoration
      if (!originalStyles.has(domNode)) {
        originalStyles.set(domNode, {
          backgroundColor: domNode.style.backgroundColor,
          boxShadow: domNode.style.boxShadow,
          zIndex: domNode.style.zIndex,
          transition: domNode.style.transition,
        });
      }

      //? Apply highlight styles
      domNode.style.transition = "background-color 0.3s, box-shadow 0.3s";
      domNode.style.backgroundColor = "rgba(88, 166, 255, 0.15)";
      domNode.style.boxShadow = "0 0 8px rgba(88, 166, 255, 0.6)";
      domNode.style.zIndex = "999999";

      //? Remove highlight after timeout
      const timer = setTimeout(() => {
        restoreStyle(domNode);
        highlightTimers.delete(domNode);
      }, 600);

      highlightTimers.set(domNode, timer);
    }
  }

  //? Restore original styles to DOM node
  function restoreStyle(domNode) {
    const original = originalStyles.get(domNode);
    if (!original) return;

    domNode.style.backgroundColor = original.backgroundColor || "";
    domNode.style.boxShadow = original.boxShadow || "";
    domNode.style.zIndex = original.zIndex || "";
    domNode.style.transition = original.transition || "";
  }
})();
