import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";

// Wire up the auth token so every generated React Query hook
// automatically sends Authorization: Bearer <token>
setAuthTokenGetter(() => localStorage.getItem("creatools_token"));

createRoot(document.getElementById("root")!).render(<App />);
