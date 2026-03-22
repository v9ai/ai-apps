import { getAllScripts } from "@/lib/scripts";
import { ScriptViewer } from "@/components/script-viewer";

export const metadata = {
  title: "Pybricks Scripts — Bricks",
  description: "Browse and visualize all Pybricks MicroPython scripts",
};

export default function ScriptsPage() {
  const scripts = getAllScripts();
  return <ScriptViewer scripts={scripts} />;
}
