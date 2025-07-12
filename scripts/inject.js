(function () {
  const componentName = document.currentScript.dataset.componentName;
  const trackMode = document.currentScript.dataset.trackMode;
  const isTrackingAll = trackMode === "all";

  const renderCounts = {};
  const highlightTimers = new Map();
  const originalStyles = new Map();

  const devTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

  let counter = null;
  if (!isTrackingAll) {
    counter = document.createElement("div");
    counter.id = "react-render-ui";
    counter.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1a1a1a;
      color: #00ff9d;
      padding: 12px 18px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      max-height: 150px;
      overflow: auto;
    `;
    document.body.prepend(counter);
    counter.innerHTML = `Counter tracker for <b>${componentName}</b> is ready.`;
  }

  const checkReact = setInterval(() => {
    if (!devTools) {
      if (counter) {
        counter.textContent = "⚠️ React DevTools not found!";
        counter.style.background = "#ff0000";
      }
      return;
    }
    clearInterval(checkReact);
    startTracking();
  }, 100);

  function startTracking() {
    const originalOnCommit = devTools.onCommitFiberRoot;

    devTools.onCommitFiberRoot = (...args) => {
      originalOnCommit?.(...args);
      const fiberRoot = args[1];
      trackUpdatedFibers(fiberRoot.current);
    };
  }

  // React fiber flag for Update (value 1)
  const UpdateFlag = 1;

  // Traverses the fiber tree, highlights only updated fibers (with UpdateFlag),
  // and only dives into subtrees marked as updated by subtreeFlags.
  function trackUpdatedFibers(fiber) {
    if (!fiber) return;

    // Check if this fiber updated
    const isUpdated = (fiber.flags & UpdateFlag) !== 0;
    // Check if subtree contains any updated fibers
    const hasUpdatedDescendants = (fiber.subtreeFlags & UpdateFlag) !== 0;

    // Only track if this fiber updated, and matches mode filter
    const name = fiber.type?.displayName || fiber.type?.name;

    const shouldTrack =
      isUpdated &&
      (isTrackingAll || (trackMode === "specific" && name === componentName));

    if (shouldTrack) {
      const key = fiber._debugID || Math.random().toString(36).slice(2);
      if (!renderCounts[key]) {
        renderCounts[key] = { count: 0, name };
      }

      renderCounts[key].count++;
      highlightComponent(fiber);
      if (!isTrackingAll) updateUI();
    }

    // Recurse only into updated subtrees to optimize traversal
    if (hasUpdatedDescendants) {
      if (fiber.child) trackUpdatedFibers(fiber.child);
    }

    // Always check siblings, as they may also have updates
    if (fiber.sibling) trackUpdatedFibers(fiber.sibling);
  }

  function updateUI() {
    if (!counter) return;

    counter.innerHTML = Object.entries(renderCounts)
      .map(
        ([_, instance], index) =>
          `${instance.name || "Unknown"} ${index + 1}: ${
            instance.count
          } renders`
      )
      .join("<br>");
  }

  function highlightComponent(fiber) {
    let domNode = fiber.stateNode;

    // Find a DOM node for this fiber or its descendants
    if (!domNode || !(domNode instanceof HTMLElement)) {
      let next = fiber.child;
      while (next && !next.stateNode) {
        next = next.child || next.sibling;
      }
      domNode = next?.stateNode || null;
    }

    if (domNode && domNode instanceof HTMLElement) {
      // Clear any existing highlight timer & restore style
      if (highlightTimers.has(domNode)) {
        clearTimeout(highlightTimers.get(domNode));
        highlightTimers.delete(domNode);
        restoreStyle(domNode);
      }

      // Save original styles on first highlight
      if (!originalStyles.has(domNode)) {
        originalStyles.set(domNode, {
          backgroundColor: domNode.style.backgroundColor,
          boxShadow: domNode.style.boxShadow,
          zIndex: domNode.style.zIndex,
          transition: domNode.style.transition,
        });
      }

      // Apply highlight style
      domNode.style.transition = "background-color 0.3s, box-shadow 0.3s";
      domNode.style.backgroundColor = "rgba(255, 0, 0, 0.2)";
      domNode.style.boxShadow = "0 0 8px rgba(255, 0, 0, 0.4)";
      domNode.style.zIndex = "999999";

      // Remove highlight after delay
      const timer = setTimeout(() => {
        restoreStyle(domNode);
        highlightTimers.delete(domNode);
      }, 600);

      highlightTimers.set(domNode, timer);
    }
  }

  function restoreStyle(domNode) {
    const original = originalStyles.get(domNode);
    if (!original) return;

    domNode.style.backgroundColor = original.backgroundColor || "";
    domNode.style.boxShadow = original.boxShadow || "";
    domNode.style.zIndex = original.zIndex || "";
    domNode.style.transition = original.transition || "";
  }
})();
