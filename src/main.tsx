import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import '@rainbow-me/rainbowkit/styles.css';
import { BrowserRouter } from "react-router-dom";

import { TempoDevtools } from "tempo-devtools";
TempoDevtools.init();

const basename = import.meta.env.BASE_URL;

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode> // Temporarily commented out to prevent double initialization warnings in dev
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  // </React.StrictMode>,
);
