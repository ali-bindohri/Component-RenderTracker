// Create counter UI
const counter = document.createElement("div");
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
`;
document.body.prepend(counter);

// Get component name from script tag
const componentName = document.currentScript.dataset.componentName;

// Wait for React DevTools hook
const checkReact = setInterval(() => {
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    clearInterval(checkReact);
    startTracking();
    return;
  }
  counter.textContent = "⚠️ React DevTools not found!";
  counter.style.background = "#ff0000";
}, 100);

function startTracking() {
  let renderCount = 0;
  const devTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  let previousProps = null;
  let previousState = null;

  const originalOnCommitFiberRoot = devTools.onCommitFiberRoot;

  devTools.onCommitFiberRoot = (...args) => {
    originalOnCommitFiberRoot?.(...args);

    // New: Only check when components actually update
    const fiberRoot = args[1];
    checkForUpdates(fiberRoot.current);
  };

  function checkForUpdates(fiber) {
    if (!fiber) return;

    const name = fiber.type?.displayName || fiber.type?.name;
    if (name === componentName) {
      const currentProps = fiber.memoizedProps;
      const currentState = fiber.memoizedState;

      if (
        !shallowEqual(previousProps, currentProps) ||
        !shallowEqual(previousState, currentState)
      ) {
        renderCount++;
        counter.textContent = `${componentName}: ${renderCount} renders`;
      }

      previousProps = currentProps;
      previousState = currentState;
    }

    checkForUpdates(fiber.child);
    checkForUpdates(fiber.sibling);
  }

  // Simple shallow comparison
  function shallowEqual(objA, objB) {
    if (objA === objB) return true;
    if (
      typeof objA !== "object" ||
      objA === null ||
      typeof objB !== "object" ||
      objB === null
    ) {
      return false;
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    for (let i = 0; i < keysA.length; i++) {
      if (objA[keysA[i]] !== objB[keysA[i]]) {
        return false;
      }
    }

    return true;
  }

  counter.textContent = `${componentName}: 0 renders`;
}
