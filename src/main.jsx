import React from "react";
import ReactDOM from "react-dom/client";
import AuthGate from "./AuthGate";
import FlashcardApp from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>{(user) => <FlashcardApp user={user} />}</AuthGate>
  </React.StrictMode>
);
