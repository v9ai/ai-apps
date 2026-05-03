"use client";

import { AuthGate } from "@/app/components/AuthGate";
import { ChatInterface } from "./chat-interface";

export default function ChatPage() {
  return (
    <AuthGate
      pageName="Health Chat"
      description="Ask about your blood markers and clinical context. Sign in to chat."
    >
      <ChatInterface />
    </AuthGate>
  );
}
