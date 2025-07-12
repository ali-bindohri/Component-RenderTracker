# React Render Counter Extension 🔄

A Chrome extension to track and visually highlight React component re-renders using the React DevTools hook.

---

## 🧠 Features

- ✅ Track specific component re-renders by name
- 🌐 Track **all** re-renders across the app
- 🎯 Highlights only components that re-render (not all on first render)
- ✨ Comfortable blue highlight with auto-clear
- 🔘 Message UI with close button to stop tracking anytime

---

## 🚀 How It Works

The extension injects a script into the current tab, hooking into `__REACT_DEVTOOLS_GLOBAL_HOOK__` and listening to fiber tree updates. It uses `flags` and `subtreeFlags` to detect **actual re-renders** and highlights the affected DOM nodes.

---

## 🔧 Setup

1. Clone this repo:
   ```bash
   git clone git@github.com:ali-bindohri/Component-RenderTracker.git
   ```
