import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MacbookPro } from "./screens/MacbookPro";

createRoot(document.getElementById("app")).render(
  <StrictMode>
    <MacbookPro />
  </StrictMode>,
);
ni