import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { registrarServiceWorker } from "./lib/pwa";

// Sem internet o app continua abrindo: a casca fica guardada no service worker.
registrarServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
