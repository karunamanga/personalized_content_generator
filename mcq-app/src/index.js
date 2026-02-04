import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter } from "react-router-dom";

// Get Clerk Key
const clerkKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProvider
        publishableKey={clerkKey}
        navigate={(to) => window.location.href = to}
      >
        <App />
      </ClerkProvider>
    </BrowserRouter>
  </React.StrictMode>
);
