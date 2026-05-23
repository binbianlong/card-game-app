import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import "./style.css";

createRoot(document.querySelector<HTMLDivElement>("#app")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
