import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { attachClientErrorLogger } from "./lib/clientErrorLogger";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

attachClientErrorLogger();

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
