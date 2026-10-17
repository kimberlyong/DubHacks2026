import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { SproutProvider } from "./sprout/SproutContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SproutProvider>
      <App />
    </SproutProvider>
  </React.StrictMode>,
);
