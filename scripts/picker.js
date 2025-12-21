(function () {
  let highlightedNode = null;
  let originalStyles = null;
  const overlayBox = document.createElement("div");

  // Style for the name tooltip
  overlayBox.style.cssText = `
    position: fixed;
    background: #0969da;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-family: sans-serif;
    pointer-events: none;
    z-index: 1000000;
    display: none;
  `;
  document.body.appendChild(overlayBox);

  function getReactComponentName(domNode) {
    let target = domNode;
    // Find the internal React key
    const key = Object.keys(target).find((k) => k.startsWith("__reactFiber$"));

    if (!key) return null; // Not a React root descendent?

    let fiber = target[key];

    // Traverse up fiber tree to find a named component
    while (fiber) {
      const type = fiber.type;
      if (type && (type.displayName || type.name)) {
        return type.displayName || type.name;
      }
      fiber = fiber.return;
    }
    return null;
  }

  function handleMouseOver(e) {
    e.stopPropagation();
    const target = e.target;
    const name = getReactComponentName(target);

    if (name) {
      if (highlightedNode && highlightedNode !== target) {
        resetHighlight();
      }

      highlightedNode = target;
      originalStyles = {
        outline: target.style.outline,
        cursor: target.style.cursor,
      };

      target.style.outline = "2px dashed #0969da";
      target.style.cursor = "crosshair";

      // Show tooltip
      const rect = target.getBoundingClientRect();
      overlayBox.textContent = name;
      overlayBox.style.display = "block";
      overlayBox.style.top = Math.max(0, rect.top - 30) + "px";
      overlayBox.style.left = rect.left + "px";
    }
  }

  function handleMouseOut(e) {
    if (highlightedNode) {
      resetHighlight();
    }
  }

  function resetHighlight() {
    if (highlightedNode && originalStyles) {
      highlightedNode.style.outline = originalStyles.outline;
      highlightedNode.style.cursor = originalStyles.cursor;
      highlightedNode = null;
      originalStyles = null;
      overlayBox.style.display = "none";
    }
  }

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (highlightedNode) {
      const name = getReactComponentName(highlightedNode);
      if (name) {
        window.postMessage(
          { type: "REACT_TRACKER_COMPONENT_PICKED", name },
          "*"
        );
        cleanup();
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      cleanup();
    }
  }

  function cleanup() {
    resetHighlight();
    overlayBox.remove();
    document.removeEventListener("mouseover", handleMouseOver, true);
    document.removeEventListener("mouseout", handleMouseOut, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);
  }

  // Attach generic listeners with capture to ensure we get them first
  document.addEventListener("mouseover", handleMouseOver, true);
  document.addEventListener("mouseout", handleMouseOut, true);
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKeyDown, true);
})();
