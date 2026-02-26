import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { App } from "./App.jsx";
import { WalletProvider } from "./wallet";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
);

