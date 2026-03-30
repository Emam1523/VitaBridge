import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // 
import { AuthenticationProvider } from "./context/AuthenticationContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthenticationProvider>
      <App />
    </AuthenticationProvider>
  </React.StrictMode>
);
