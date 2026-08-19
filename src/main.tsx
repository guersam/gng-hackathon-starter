import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/gothic-a1/korean-400.css";
import "@fontsource/gothic-a1/korean-700.css";
import "@fontsource/gothic-a1/korean-900.css";
import "@fontsource/gothic-a1/latin-400.css";
import "@fontsource/gothic-a1/latin-700.css";
import "@fontsource/gothic-a1/latin-900.css";
import "@experiential/ui-foundation/theme.css";
import "@experiential/ui-foundation/base.css";
import App from "@experiential/game-yoil-genius/ui";
import { HandoffLab } from "@experiential/game-handoff-lab/ui";
import { StarterHome } from "./StarterHome";
import "@experiential/game-yoil-genius/styles.css";
import "@experiential/game-handoff-lab/styles.css";
import "./starter.css";

const surface = location.pathname === "/" ? <StarterHome /> : location.pathname === "/handoff" ? <HandoffLab /> : <App />;
createRoot(document.getElementById("root")!).render(<StrictMode>{surface}</StrictMode>);
