import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

// CssBaseline is applied inside the theme provider (context/DarkMode).
createRoot(document.getElementById("root")).render(<App />);
