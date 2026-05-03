"use client";

import NotesList from "@/app/components/NotesList";

export default function NotesSection({ goalId }: { goalId: number }) {
  return <NotesList entityId={goalId} entityType="Goal" />;
}
