"use client";

import { useState, useRef, useEffect } from "react";
import { Topbar } from "@/components/topbar";
import ReactMarkdown from "react-markdown";

const ANALYZER_URL = process.env.NEXT_PUBLIC_ANALYZER_URL ?? "http://localhost:8005";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const S = {
  glass: {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
  } as React.CSSProperties,
  input: {
    flex: 1,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid var(--gray-4)",
    color: "var(--gray-12)",
    padding: "12px 16px",
    borderRadius: 10,
    fontSize: 13,
    outline: "none",
    transition: "border-color 0.2s",
    resize: "none" as const,
    lineHeight: 1.5,
    minHeight: 44,
    maxHeight: 120,
  } as React.CSSProperties,
  sendBtn: {
    background: "linear-gradient(135deg, var(--accent-9), #ec4899)",
    border: "none",
    borderRadius: 10,
    padding: "12px 20px",
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
    transition: "opacity 0.15s",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  } as React.CSSProperties,
};

/* ------------------------------------------------------------------ */
/*  Suggested Prompts                                                  */
/* ------------------------------------------------------------------ */

const SUGGESTIONS = [
  "What's the best yield in my portfolio?",
  "Compare my top 2 listings",
  "Which zones are appreciating fastest?",
  "What should I buy under \u20AC50K?",
];

/* ------------------------------------------------------------------ */
/*  Message Bubble                                                     */
/* ------------------------------------------------------------------ */

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: "75%",
          padding: "12px 16px",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          background: isUser
            ? "linear-gradient(135deg, var(--accent-9), #7c3aed)"
            : "rgba(255,255,255,0.04)",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.06)",
          color: isUser ? "#fff" : "var(--gray-12)",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        {isUser ? (
          <span>{msg.content}</span>
        ) : (
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.6,
            }}
            className="advisor-markdown"
          >
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Dots                                                       */
/* ------------------------------------------------------------------ */

function LoadingDots() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderRadius: "16px 16px 16px 4px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          gap: 6,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--gray-7)",
              animation: `dotPulse 1.4s ${i * 0.2}s infinite ease-in-out`,
            }}
          />
        ))}
        <style>{`
          @keyframes dotPulse {
            0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Context Panel                                                      */
/* ------------------------------------------------------------------ */

function ContextPanel({
  urls,
  onAdd,
  onRemove,
}: {
  urls: string[];
  onAdd: (url: string) => void;
  onRemove: (url: string) => void;
}) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const url = input.trim();
    if (url && !urls.includes(url)) {
      onAdd(url);
      setInput("");
    }
  };

  return (
    <div
      style={{
        ...S.glass,
        padding: "14px 16px",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "var(--gray-7)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 8,
        }}
      >
        Context Listings
      </div>
      {urls.map((u) => (
        <div
          key={u}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
            fontSize: 11,
          }}
        >
          <span
            style={{
              flex: 1,
              color: "var(--accent-11)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {u}
          </span>
          <button
            onClick={() => onRemove(u)}
            style={{
              background: "none",
              border: "none",
              color: "var(--gray-7)",
              cursor: "pointer",
              fontSize: 12,
              padding: "0 2px",
            }}
          >
            {"\u2715"}
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste listing URL"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--gray-4)",
            color: "var(--gray-12)",
            padding: "6px 10px",
            borderRadius: 5,
            fontSize: 11,
            outline: "none",
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 5,
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--gray-11)",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Content                                                       */
/* ------------------------------------------------------------------ */

export function AdvisorContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [contextUrls, setContextUrls] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: Message = {
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${ANALYZER_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: msg,
          context_urls: contextUrls,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.session_id) setSessionId(data.session_id);

      const assistantMsg: Message = {
        role: "assistant",
        content: data.message.content,
        timestamp: data.message.timestamp,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I could not process your request. Make sure the backend is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Topbar />

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 20px 24px",
          display: "flex",
          gap: 20,
          height: "calc(100vh - 64px)",
        }}
      >
        {/* Main chat area */}
        <div style={{ flex: "1 1 0", display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Header */}
          <div style={{ marginBottom: 16 }}>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "var(--gray-12)",
                margin: "0 0 4px",
              }}
            >
              AI Investment Advisor
            </h1>
            <p style={{ fontSize: 13, color: "var(--gray-8)", margin: 0 }}>
              Ask questions about your portfolio, compare listings, or get investment advice.
            </p>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              paddingRight: 8,
              marginBottom: 16,
            }}
          >
            {messages.length === 0 && !loading && (
              <div style={{ padding: "40px 0", textAlign: "center" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background:
                      "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.12))",
                    border: "1px solid rgba(99,102,241,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                    fontSize: 26,
                  }}
                >
                  {"\u{1F4AC}"}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--gray-8)",
                    marginBottom: 24,
                    lineHeight: 1.5,
                  }}
                >
                  Start a conversation or try one of these:
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8,
                        padding: "8px 14px",
                        fontSize: 12,
                        color: "var(--gray-11)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent-7)";
                        e.currentTarget.style.background = "rgba(99,102,241,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {loading && <LoadingDots />}
          </div>

          {/* Input bar */}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              padding: "12px 0 0",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about listings, zones, or your portfolio..."
              rows={1}
              style={S.input}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-7)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--gray-4)")}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                ...S.sendBtn,
                opacity: loading || !input.trim() ? 0.5 : 1,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>

        {/* Context sidebar (desktop) */}
        <div
          style={{
            flex: "0 0 280px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ContextPanel
            urls={contextUrls}
            onAdd={(url) => setContextUrls((prev) => [...prev, url])}
            onRemove={(url) => setContextUrls((prev) => prev.filter((u) => u !== url))}
          />

          {sessionId && (
            <div
              style={{
                ...S.glass,
                padding: "10px 14px",
                fontSize: 10,
                color: "var(--gray-7)",
              }}
            >
              Session: {sessionId.slice(0, 8)}...
            </div>
          )}
        </div>
      </div>

      {/* Markdown styling for advisor responses */}
      <style>{`
        .advisor-markdown p { margin: 0 0 8px; }
        .advisor-markdown p:last-child { margin-bottom: 0; }
        .advisor-markdown ul, .advisor-markdown ol { margin: 4px 0 8px 16px; padding: 0; }
        .advisor-markdown li { margin-bottom: 2px; }
        .advisor-markdown code {
          background: rgba(255,255,255,0.06);
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 12px;
        }
        .advisor-markdown pre {
          background: rgba(0,0,0,0.3);
          padding: 12px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 8px 0;
        }
        .advisor-markdown strong { color: var(--gray-12); }
        .advisor-markdown h1, .advisor-markdown h2, .advisor-markdown h3 {
          color: var(--gray-12);
          margin: 12px 0 6px;
          font-size: 14px;
          font-weight: 700;
        }
        .advisor-markdown table {
          border-collapse: collapse;
          width: 100%;
          margin: 8px 0;
          font-size: 12px;
        }
        .advisor-markdown th, .advisor-markdown td {
          border: 1px solid rgba(255,255,255,0.08);
          padding: 6px 8px;
          text-align: left;
        }
        .advisor-markdown th {
          background: rgba(255,255,255,0.04);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
