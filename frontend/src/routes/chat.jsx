import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Plus, Paperclip, Mic, ArrowUp, FileText, X, Stethoscope, Trash2,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AuthGuard } from "@/components/auth-guard";
import { useUser } from "@clerk/clerk-react";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — MedsysAI" },
      {
        name: "description",
        content:
          "Chat with your MedsysAI medical assistant. Ask questions, upload reports, and get structured guidance.",
      },
    ],
  }),
  component: () => <AuthGuard><ChatPage /></AuthGuard>,
});

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Date grouping helper
// ---------------------------------------------------------------------------
function groupSessions(sessions) {
  const groups = { Today: [], Yesterday: [], "Previous 7 Days": [], Older: [] };
  const now = new Date();
  for (const s of sessions) {
    const d = new Date(s.updated_at);
    const diffDays = Math.floor((now - d) / 86_400_000);
    if (diffDays < 1) groups.Today.push(s);
    else if (diffDays < 2) groups.Yesterday.push(s);
    else if (diffDays <= 7) groups["Previous 7 Days"].push(s);
    else groups.Older.push(s);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Typing dots
// ---------------------------------------------------------------------------
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-5 py-3.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown components — styled to match the clinical theme
// ---------------------------------------------------------------------------
const mdComponents = {
  h1: ({ children }) => <h1 className="text-lg font-semibold text-foreground mt-3 mb-1.5">{children}</h1>,
  h2: ({ children }) => <h2 className="text-[15px] font-semibold text-foreground mt-3 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-[14px] font-semibold text-foreground mt-2 mb-1">{children}</h3>,
  p:  ({ children }) => <p className="text-[15px] leading-relaxed mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-2 text-[15px]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-2 text-[15px]">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
  code: ({ inline, children }) =>
    inline ? (
      <code className="px-1.5 py-0.5 rounded-md bg-primary-soft text-primary text-[13px] font-mono">{children}</code>
    ) : (
      <pre className="mt-2 mb-2 rounded-lg bg-muted p-3 overflow-x-auto">
        <code className="text-[13px] font-mono text-foreground">{children}</code>
      </pre>
    ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary pl-3 my-2 text-muted-foreground italic">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">{children}</a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-[14px] border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-border px-3 py-1.5 bg-muted font-semibold text-left">{children}</th>,
  td: ({ children }) => <td className="border border-border px-3 py-1.5">{children}</td>,
};

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------
function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-5 py-3.5",
          isUser
            ? "bg-primary-soft text-foreground rounded-br-md text-[15px] leading-relaxed whitespace-pre-wrap"
            : "bg-muted/50 text-foreground rounded-bl-md"
        )}
      >
        {isUser ? (
          message.content
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function ChatPage() {
  const { user } = useUser();

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // ── Load sessions on mount ───────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/sessions?user_id=${user.id}`);
      const data = await res.json();
      setSessions(data);
      return data;
    } catch {
      return [];
    } finally {
      setLoadingSessions(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions().then((data) => {
      if (data?.length && !activeSessionId) {
        setActiveSessionId(data[0].session_id);
      }
    });
  }, [fetchSessions]);

  // ── Load messages when active session changes ────────────────────────────
  useEffect(() => {
    if (!activeSessionId) return;
    setLoadingMessages(true);
    setMessages([]);
    fetch(`${API_BASE}/api/sessions/${activeSessionId}/messages`)
      .then((r) => r.json())
      .then((data) => setMessages(data))
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, [activeSessionId]);

  // ── Create new session ───────────────────────────────────────────────────
  async function startNewChat() {
    if (isStreaming || !user) return;
    const res = await fetch(`${API_BASE}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, title: "New chat" }),
    });
    const session = await res.json();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.session_id);
    setMessages([]);
    inputRef.current?.focus();
  }

  // ── Delete session ───────────────────────────────────────────────────────
  async function deleteSession(e, sessionId) {
    e.stopPropagation();
    await fetch(`${API_BASE}/api/sessions/${sessionId}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    if (activeSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.session_id !== sessionId);
      setActiveSessionId(remaining[0]?.session_id ?? null);
      setMessages([]);
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming || !user) return;

    // Auto-create session if none active
    let sessionId = activeSessionId;
    if (!sessionId) {
      const res = await fetch(`${API_BASE}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, title: text.slice(0, 60) }),
      });
      const session = await res.json();
      sessionId = session.session_id;
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(sessionId);
    }

    // Optimistic UI: add user message immediately
    const userMsg = { role: "user", content: text, session_id: sessionId };
    const assistantMsg = { role: "assistant", content: "", session_id: sessionId };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: user.id,
          content: text,
          // send previous messages as history (exclude the optimistic ones we just added)
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const token = line.slice(6);
          if (token === "[DONE]") break;
          if (token.startsWith("[ERROR]")) {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: "⚠️ " + token.slice(8),
              };
              return updated;
            });
            break;
          }
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + token };
            return updated;
          });
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: "⚠️ Could not reach the server. Make sure the backend is running.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
      // Refresh sidebar so title updates after first message
      fetchSessions();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Grouped sessions for sidebar ─────────────────────────────────────────
  const grouped = groupSessions(sessions);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="grid grid-cols-[280px_1fr] gap-6 h-[calc(100vh-5rem)]">

        {/* ── History sidebar ─────────────────────────────────────────── */}
        <aside className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <Button
              className="w-full justify-start gap-2 h-9"
              variant="outline"
              onClick={startNewChat}
              disabled={isStreaming}
            >
              <Plus className="h-4 w-4" />
              New chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {loadingSessions ? (
              <div className="space-y-2 pt-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground text-center">
                No history yet.
                <br />
                Start a conversation below.
              </p>
            ) : (
              Object.entries(grouped).map(([group, items]) =>
                items.length === 0 ? null : (
                  <div key={group}>
                    <h3 className="px-2 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {group}
                    </h3>
                    <ul className="space-y-0.5">
                      {items.map((s) => (
                        <li key={s.session_id}>
                          <button
                            onClick={() => setActiveSessionId(s.session_id)}
                            className={cn(
                              "group w-full flex items-center justify-between gap-1 px-2.5 py-2 rounded-md text-sm truncate transition-colors text-left",
                              s.session_id === activeSessionId
                                ? "bg-primary-soft text-primary font-medium"
                                : "text-foreground/80 hover:bg-muted"
                            )}
                          >
                            <span className="truncate flex-1">{s.title}</span>
                            <span
                              onClick={(e) => deleteSession(e, s.session_id)}
                              className="opacity-0 group-hover:opacity-100 grid place-items-center h-5 w-5 rounded hover:text-destructive transition-all shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )
            )}
          </div>
        </aside>

        {/* ── Conversation panel ──────────────────────────────────────── */}
        <section className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <header className="flex items-center gap-3 px-6 h-14 border-b border-border shrink-0">
            <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary-soft text-primary">
              <Stethoscope className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Medical Assistant</div>
              <div className="text-xs text-muted-foreground">
                {isStreaming ? "Typing…" : activeSessionId ? sessions.find(s => s.session_id === activeSessionId)?.title ?? "Chat" : "Powered by Groq"}
              </div>
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {loadingMessages ? (
              <div className="space-y-4 pt-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                    <div className="h-10 w-48 rounded-2xl bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 && !isStreaming ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="grid place-items-center h-14 w-14 rounded-2xl bg-primary-soft text-primary">
                  <Stethoscope className="h-7 w-7" strokeWidth={1.5} />
                </div>
                <h2 className="text-lg font-semibold text-foreground">How can I help you today?</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Describe your symptoms, ask about medications, or upload a lab report to get started.
                </p>
              </div>
            ) : (
              messages.map((m, i) => <MessageBubble key={i} message={m} />)
            )}

            {isStreaming && messages[messages.length - 1]?.content === "" && <TypingDots />}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-border p-4 shrink-0">
            {attachment && (
              <div className="mb-3">
                <Card className="inline-flex items-center gap-2 pl-3 pr-1 py-1.5 shadow-none">
                  <FileText className="h-4 w-4 text-primary" strokeWidth={1.75} />
                  <span className="text-sm text-foreground">{attachment}</span>
                  <button
                    onClick={() => setAttachment(null)}
                    className="grid place-items-center h-6 w-6 rounded-md hover:bg-muted text-muted-foreground"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Card>
              </div>
            )}

            <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary/50 transition-colors">
              <button
                className="grid place-items-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Attach file"
              >
                <Paperclip className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>

              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your symptoms or ask a question…"
                className="flex-1 border-0 shadow-none focus-visible:ring-0 px-1 h-9 text-[15px] bg-transparent"
                disabled={isStreaming}
              />

              <button
                className="grid place-items-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Voice input"
              >
                <Mic className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>

              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className={cn(
                  "grid place-items-center h-9 w-9 rounded-md transition-colors",
                  input.trim() && !isStreaming
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                aria-label="Send message"
              >
                <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
