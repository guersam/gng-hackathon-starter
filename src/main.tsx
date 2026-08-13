import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/gothic-a1/korean-400.css";
import "@fontsource/gothic-a1/korean-700.css";
import "@fontsource/gothic-a1/korean-900.css";
import "@fontsource/gothic-a1/latin-400.css";
import "@fontsource/gothic-a1/latin-700.css";
import "@fontsource/gothic-a1/latin-900.css";
import App from "./ui/App";
import { HandoffLab } from "../games/handoff-lab/src/HandoffLab";
import { WorkshopGame } from "../games/workshop-game/src/WorkshopGame";
import "./ui/styles.css";

const surface = location.pathname === "/handoff" ? <HandoffLab /> : location.pathname === "/workshop" ? <WorkshopGame /> : <App />;
createRoot(document.getElementById("root")!).render(<StrictMode>{surface}</StrictMode>);
