//? Injected script to track React component re-renders and highlight updated DOM nodes
(function () {
  //? Performance utilities and memory
  const rafQueue = [];
  const idleQueue = [];
  const fiberMemory = new Map(); // Store fiber snapshots
  const MAX_STORED_RENDERS = 100;
  let rafScheduled = false;
  let idleScheduled = false;

  //? Get component name and tracking mode from script tag dataset
  const componentName = document.currentScript.dataset.componentName;
  const trackMode = document.currentScript.dataset.trackMode;
  const highlightColorHex =
    document.currentScript.dataset.highlightColor || "#58a6ff";
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
    color: ${highlightColorHex};
    padding: 10px 14px;
    font-family: sans-serif;
    font-size: 13px;
    border-radius: 6px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: move;
    user-select: none;
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
    font-family: inherit;
  `;

  //? Draggable Logic
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  messageBox.onmousedown = (e) => {
    if (e.target === close) return; // Don't drag if clicking close
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = messageBox.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    // Switch to top/left positioning for dragging
    messageBox.style.bottom = "auto";
    messageBox.style.right = "auto";
    messageBox.style.left = initialLeft + "px";
    messageBox.style.top = initialTop + "px";
  };

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    messageBox.style.left = initialLeft + dx + "px";
    messageBox.style.top = initialTop + dy + "px";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

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
    fiberMemory.clear();
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
      messageBox.style.background = "#2d0a0a"; // Darker red for better contrast on dark bg
      messageBox.style.color = "#ff6b6b";
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

  //? Helper: Serialize value for comparison and display
  function serializeValue(value) {
    if (typeof value === "function") return `ƒ ${value.name || "anonymous"}`;
    // Basic check for React elements
    if (value && typeof value === "object" && value.$$typeof)
      return `<${
        value.type?.displayName || value.type?.name || "Component"
      } />`;
    try {
      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) return `Array(${value.length})`;
        return "Object"; // Simplify for now
      }
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  //? Helper: Shallow clone for snapshot
  function shallowClone(obj) {
    if (typeof obj !== "object" || obj === null) return obj;
    if (Array.isArray(obj)) return [...obj];
    return { ...obj };
  }

  //? Capture current fiber state
  function captureFiberSnapshot(fiber) {
    return {
      props: shallowClone(fiber.memoizedProps),
      state: shallowClone(fiber.memoizedState),
      context: fiber.dependencies ? shallowClone(fiber.dependencies) : null,
      timestamp: Date.now(),
    };
  }

  //? Change Detection Functions
  function detectPropsChanges(prev, current) {
    const changes = [];
    const allKeys = new Set([
      ...Object.keys(prev || {}),
      ...Object.keys(current || {}),
    ]);

    for (const key of allKeys) {
      // Ignore children and internal props
      if (key === "children" || key.startsWith("_")) continue;

      if (!Object.is(prev?.[key], current?.[key])) {
        changes.push({
          key,
          prev: serializeValue(prev?.[key]),
          current: serializeValue(current?.[key]),
        });
      }
    }
    return changes;
  }

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

      // Get previous snapshot
      const prevSnapshot = fiberMemory.get(key);
      const currentSnapshot = captureFiberSnapshot(fiber);

      // Analyze reason
      let reasons = [];
      if (prevSnapshot) {
        const propsChanges = detectPropsChanges(
          prevSnapshot.props,
          currentSnapshot.props
        );
        if (propsChanges.length > 0) {
          reasons.push({ type: "props", changes: propsChanges });
        }

        // Simple state check (memoizedState changes)
        if (prevSnapshot.state !== currentSnapshot.state) {
          // If props didn't change but we re-rendered, and state logic is complex,
          // we might assume state unless we can prove otherwise.
          // Ideally we'd compare hooks deeper. For now, mark as state/hooks.
          reasons.push({ type: "state", changes: [] });
        }

        // Parent force update fallback
        if (reasons.length === 0) {
          reasons.push({ type: "parent", changes: [] });
        }
      } else {
        reasons.push({ type: "mount", changes: [] });
      }

      // Update memory
      fiberMemory.set(key, currentSnapshot);

      // Clean up old memory
      if (fiberMemory.size > MAX_STORED_RENDERS) {
        const firstKey = fiberMemory.keys().next().value;
        fiberMemory.delete(firstKey);
      }

      if (!renderCounts[key]) {
        renderCounts[key] = { count: 0, name };
      }
      renderCounts[key].count++;

      // Schedule UI updates
      scheduleHighlight(fiber);
    }

    //? Recursively check child and sibling fibers
    if (hasUpdatedDescendants && fiber.child) {
      trackUpdatedFibers(fiber.child);
    }

    if (fiber.sibling) {
      trackUpdatedFibers(fiber.sibling);
    }
  }

  //? Schedule Highlight via RAF
  function scheduleHighlight(fiber) {
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
      rafQueue.push(domNode);
      if (!rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(processHighlightQueue);
      }
    }
  }

  //? Process Highlight Queue
  function processHighlightQueue() {
    rafScheduled = false;
    while (rafQueue.length > 0) {
      const domNode = rafQueue.shift();
      highlightComponent(domNode);
    }
  }

  //? Highlight the DOM node for a fiber
  function highlightComponent(domNode) {
    //? If already highlighted, clear previous timer and restore style
    if (highlightTimers.has(domNode)) {
      clearTimeout(highlightTimers.get(domNode));
      highlightTimers.delete(domNode);
      restoreStyle(domNode);
    }

    //? Save original styles for restoration
    if (!originalStyles.has(domNode)) {
      originalStyles.set(domNode, {
        border: domNode.style.border,
        boxShadow: domNode.style.boxShadow,
        // We do not save/restore outline as we use it for highlighting
        outline: domNode.style.outline,
      });
    }

    //? Helper to convert hex to rgba
    const hexToRgba = (hex, alpha) => {
      let r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    //? Apply highlight styles (using outline to avoid layout shifts)
    domNode.style.outline = `2px solid ${hexToRgba(highlightColorHex, 0.8)}`;
    domNode.style.boxShadow = `0 0 0 4px ${hexToRgba(highlightColorHex, 0.3)}`;
    domNode.dataset.renderHighlight = "true";

    //? Remove highlight after timeout
    const timer = setTimeout(() => {
      restoreStyle(domNode);
      highlightTimers.delete(domNode);
    }, 1000);

    highlightTimers.set(domNode, timer);
  }

  //? Restore original styles to DOM node
  function restoreStyle(domNode) {
    const original = originalStyles.get(domNode);
    if (!original) return;

    domNode.style.outline = original.outline || "";
    domNode.style.boxShadow = original.boxShadow || "";
    delete domNode.dataset.renderHighlight;
  }
})();
