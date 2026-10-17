import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { MuseProvider } from "./muse/MuseContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MuseProvider>
      <App />
    </MuseProvider>
  </React.StrictMode>,
);
