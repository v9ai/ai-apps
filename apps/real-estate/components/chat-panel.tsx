"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const ANALYZER_URL = process.env.NEXT_PUBLIC_ANALYZER_URL ?? "http://localhost:8005";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  contextUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ contextUrl, isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${ANALYZER_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: msg,
          context_urls: contextUrl ? [contextUrl] : [],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.session_id) setSessionId(data.session_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message.content },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to get response. Is the backend running?" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        maxWidth: "100vw",
        background: "rgba(12, 12, 14, 0.97)",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        backdropFilter: "blur(20px)",
        boxShadow: "-4px 0 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--gray-12)",
          }}
        >
          AI Advisor
        </span>
        {contextUrl && (
          <span
            style={{
              fontSize: 9,
              color: "var(--accent-11)",
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {contextUrl}
          </span>
        )}
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--gray-8)",
            cursor: "pointer",
            fontSize: 16,
            padding: "0 4px",
          }}
        >
          {"\u2715"}
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 18px",
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--gray-7)", fontSize: 12 }}>
            Ask about this listing or your portfolio...
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius:
                  msg.role === "user"
                    ? "12px 12px 4px 12px"
                    : "12px 12px 12px 4px",
                background:
                  msg.role === "user"
                    ? "linear-gradient(135deg, var(--accent-9), #7c3aed)"
                    : "rgba(255,255,255,0.04)",
                border:
                  msg.role === "user"
                    ? "none"
                    : "1px solid rgba(255,255,255,0.06)",
                color: msg.role === "user" ? "#fff" : "var(--gray-12)",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {msg.role === "user" ? (
                msg.content
              ) : (
                <div className="chat-panel-md">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
            <div
              style={{
                padding: "12px 18px",
                borderRadius: "12px 12px 12px 4px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                gap: 5,
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--gray-7)",
                    animation: `cpDot 1.4s ${i * 0.2}s infinite ease-in-out`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 18px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask a question..."
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--gray-4)",
            color: "var(--gray-12)",
            padding: "10px 12px",
            borderRadius: 8,
            fontSize: 12,
            outline: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-7)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--gray-4)")}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            background: "linear-gradient(135deg, var(--accent-9), #ec4899)",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
            cursor: loading ? "wait" : "pointer",
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >
          {loading ? "..." : "\u2192"}
        </button>
      </div>

      <style>{`
        @keyframes cpDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        .chat-panel-md p { margin: 0 0 6px; }
        .chat-panel-md p:last-child { margin-bottom: 0; }
        .chat-panel-md ul, .chat-panel-md ol { margin: 2px 0 6px 14px; padding: 0; }
        .chat-panel-md li { margin-bottom: 1px; }
        .chat-panel-md strong { color: var(--gray-12); }
        .chat-panel-md code {
          background: rgba(255,255,255,0.06);
          padding: 1px 3px;
          border-radius: 3px;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating toggle button                                             */
/* ------------------------------------------------------------------ */

export function ChatToggle({
  contextUrl,
}: {
  contextUrl?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent-9), #ec4899)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          color: "#fff",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          zIndex: 999,
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? "\u2715" : "\u{1F4AC}"}
      </button>

      {/* Panel */}
      <ChatPanel
        contextUrl={contextUrl}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
