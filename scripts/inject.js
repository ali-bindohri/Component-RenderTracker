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
  max-height: 150px;
  overflow: auto;
`;
document.body.prepend(counter);

//? Global store for tracking render counts per instance
const renderCounts = {};

//? global hook object to track component tree updates
const devTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

//? Get component name from script tag
const componentName = document.currentScript.dataset.componentName;

//? Wait for React DevTools hook
const checkReact = setInterval(() => {
  if (devTools) {
    clearInterval(checkReact);
    startTracking();
    return;
  }
  counter.textContent = "⚠️ React DevTools not found!";
  counter.style.background = "#ff0000";
}, 100);

function startTracking() {
  counter.innerHTML = `Counter tracker for <b>${componentName}</b> is ready. Please start rendering!`;

  const originalOnCommitFiberRoot = devTools.onCommitFiberRoot;

  devTools.onCommitFiberRoot = (...args) => {
    originalOnCommitFiberRoot?.(...args);

    //? New: Only check when components actually update
    const fiberRoot = args[1];
    checkForUpdates(fiberRoot.current);
  };
}

function checkForUpdates(fiber) {
  if (!fiber) return;

  const name = fiber.type?.displayName || fiber.type?.name;

  if (name === componentName) {
    //? Generate a unique ID for each instance
    const instanceKey =
      fiber.stateNode?._debugOwner?._debugID ||
      fiber.alternate?._debugID ||
      Math.random().toString(36).slice(2);

    if (!renderCounts[instanceKey]) {
      renderCounts[instanceKey] = {
        count: 0,
        prevProps: null,
        prevState: null,
      };
    }

    const instance = renderCounts[instanceKey];
    const currentProps = fiber.memoizedProps;
    const currentState = fiber.memoizedState;

    if (
      !shallowEqual(instance.prevProps, currentProps) ||
      !shallowEqual(instance.prevState, currentState)
    ) {
      instance.count++;
      instance.prevProps = currentProps;
      instance.prevState = currentState;
    }

    updateUI();
  }

  checkForUpdates(fiber.child);
  checkForUpdates(fiber.sibling);
}

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

function updateUI() {
  counter.innerHTML = Object.entries(renderCounts)
    .map(
      ([_, instance], index) =>
        `${componentName} ${index + 1}: ${instance.count} renders`
    )
    .join("<br>");
}
