import { createRoot } from "react-dom/client";
import "./style.css";
import "./linkedin-helper";
import "./ashby-helper";
import "./founderio-helper";
import "./wellfound-helper";

console.log("🔵 CONTENT SCRIPT: Loaded successfully");
console.log("🔵 CONTENT SCRIPT: URL:", window.location.href);

const div = document.createElement("div");
div.id = "__root";
document.body.appendChild(div);

const rootContainer = document.querySelector("#__root");
if (!rootContainer) throw new Error("Can't find Content root element");
const root = createRoot(rootContainer);
root.render(
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      fontSize: "14px",
      color: "white",
      backgroundColor: "#10b981",
      zIndex: 999999,
      padding: "4px 12px",
      borderRadius: "4px",
      fontFamily: "sans-serif",
    }}
  >
    ✓ Extension Active
  </div>,
);

console.log("🔵 CONTENT SCRIPT: Initialization complete");
