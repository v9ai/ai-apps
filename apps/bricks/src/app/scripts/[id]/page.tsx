import { notFound } from "next/navigation";
import { getScriptBySlug } from "@/lib/scripts";
import { ScriptEditor } from "./script-editor";
import { ExampleLessonView } from "./example-lesson-view";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (/^\d+$/.test(id)) {
    return <ScriptEditor id={id} />;
  }

  const script = getScriptBySlug(id);
  if (!script) notFound();

  return <ExampleLessonView script={script} slug={id} />;
}
