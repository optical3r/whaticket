import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

// CssBaseline is applied inside the theme provider (context/DarkMode).
createRoot(document.getElementById("root")).render(<App />);

// Installable app (PWA). Only in production builds: in development the
// service worker would serve stale files.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
