"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { getSession, getSessionMessages, endSession } from "../../lib/api";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import dynamic from "next/dynamic";
import VideoCall from "../../components/VideoCall";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

interface ChatMessage {
  sessionId: string;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
}

interface SessionData {
  id: string;
  mentorId: number;
  studentId: number | null;
  status: "ACTIVE" | "COMPLETED";
  startTime: string;
  endTime: string | null;
}

export default function SessionRoomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { user, isLoading } = useAuth();

  const [session, setSession] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [code, setCode] = useState("// Start coding here...\n");
  const [language, setLanguage] = useState("javascript");
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "video">("chat");

  const stompClient = useRef<Client | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  // Fetch session data and chat history
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [sessionRes, messagesRes] = await Promise.all([
          getSession(sessionId),
          getSessionMessages(sessionId),
        ]);
        setSession(sessionRes.data);
        setMessages(messagesRes.data);
      } catch {
        router.push("/dashboard");
      }
    };
    fetchData();
  }, [sessionId, user, router]);

  // STOMP connection for chat + code
  useEffect(() => {
    if (!user) return;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      connectHeaders: {
        Authorization: `Bearer ${user.token}`,
      },
      onConnect: () => {
        setConnected(true);

        // Chat subscription
        client.subscribe(`/topic/session/${sessionId}`, (message) => {
          const chatMsg: ChatMessage = JSON.parse(message.body);
          setMessages((prev) => [...prev, chatMsg]);
        });

        // Code sync subscription
        client.subscribe(
          `/topic/session/${sessionId}/code`,
          (message) => {
            const codeUpdate = JSON.parse(message.body);
            if (codeUpdate.senderId !== user.id) {
              isRemoteUpdate.current = true;
              setCode(codeUpdate.content);
              if (codeUpdate.language) setLanguage(codeUpdate.language);
            }
          }
        );
      },
      onStompError: (frame) => {
        console.error("STOMP error:", frame);
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
    };
  }, [sessionId, user]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendChatMessage = () => {
    if (!chatInput.trim() || !stompClient.current?.connected || !user) return;
    stompClient.current.publish({
      destination: `/app/chat/${sessionId}`,
      body: JSON.stringify({
        sessionId,
        senderId: user.id,
        senderName: user.username,
        content: chatInput.trim(),
      }),
    });
    setChatInput("");
  };

  const handleCodeChange = (value: string | undefined) => {
    if (!value || isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    setCode(value);
    if (stompClient.current?.connected && user) {
      stompClient.current.publish({
        destination: `/app/code/${sessionId}`,
        body: JSON.stringify({
          sessionId,
          senderId: user.id,
          content: value,
          language,
        }),
      });
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession(sessionId);
      router.push("/dashboard");
    } catch {
      console.error("Failed to end session");
    }
  };

  if (isLoading || !user || !session) return null;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
      }}
    >
      {/* Header Bar */}
      <header
        style={{
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
          >
            ←
          </button>
          <span
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            MentorConnect
          </span>
          <span
            style={{
              padding: "4px 10px",
              background:
                session.status === "ACTIVE"
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(107,107,138,0.15)",
              color:
                session.status === "ACTIVE"
                  ? "var(--success)"
                  : "var(--text-muted)",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            {session.status}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              padding: "4px 10px",
              background: "var(--bg-card)",
              borderRadius: "6px",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontFamily: "monospace",
            }}
          >
            ID: {sessionId.substring(0, 8)}...
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(sessionId)}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            📋 Copy ID
          </button>
          {session.status === "ACTIVE" && (
            <button
              onClick={handleEndSession}
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "var(--danger)",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              End Session
            </button>
          )}
        </div>
      </header>

      {/* Main Area */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          overflow: "hidden",
        }}
      >
        {/* Code Editor Panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--border)",
          }}
        >
          {/* Language Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 16px",
              background: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              Language:
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "0.8rem",
                outline: "none",
              }}
            >
              {[
                "javascript",
                "typescript",
                "python",
                "java",
                "cpp",
                "c",
                "html",
                "css",
                "json",
              ].map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: connected ? "var(--success)" : "var(--danger)",
                }}
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                }}
              >
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
          {/* Monaco Editor */}
          <div style={{ flex: 1 }}>
            <MonacoEditor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            />
          </div>
        </div>

        {/* Right Sidebar: Chat / Video */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-secondary)",
          }}
        >
          {/* Tab Switch */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {(["chat", "video"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background:
                    activeTab === tab
                      ? "var(--bg-card)"
                      : "transparent",
                  border: "none",
                  borderBottom:
                    activeTab === tab
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                  color:
                    activeTab === tab
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {tab === "chat" ? "💬 Chat" : "🎥 Video"}
              </button>
            ))}
          </div>

          {/* Chat Panel */}
          {activeTab === "chat" && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {messages.length === 0 && (
                  <p
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      marginTop: "40px",
                      fontSize: "0.9rem",
                    }}
                  >
                    No messages yet. Say hello! 👋
                  </p>
                )}
                {messages.map((msg, i) => {
                  const isOwn = msg.senderId === user.id;
                  return (
                    <div
                      key={i}
                      style={{
                        maxWidth: "85%",
                        alignSelf: isOwn ? "flex-end" : "flex-start",
                      }}
                    >
                      {!isOwn && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--accent)",
                            fontWeight: 600,
                            marginBottom: "2px",
                            display: "block",
                          }}
                        >
                          {msg.senderName}
                        </span>
                      )}
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: isOwn
                            ? "12px 12px 4px 12px"
                            : "12px 12px 12px 4px",
                          background: isOwn
                            ? "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))"
                            : "var(--bg-card)",
                          color: "var(--text-primary)",
                          fontSize: "0.9rem",
                          lineHeight: 1.5,
                        }}
                      >
                        {msg.content}
                      </div>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                          textAlign: isOwn ? "right" : "left",
                          display: "block",
                          marginTop: "2px",
                        }}
                      >
                        {msg.timestamp
                          ? new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div
                style={{
                  padding: "12px 16px",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  gap: "10px",
                }}
              >
                <input
                  className="input-field"
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                  style={{ flex: 1, padding: "10px 14px" }}
                />
                <button
                  className="btn-primary"
                  onClick={sendChatMessage}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    fontSize: "0.85rem",
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Video Panel */}
          {activeTab === "video" && (
            <div style={{ flex: 1, overflow: "auto" }}>
              <VideoCall
                sessionId={sessionId}
                token={user.token}
                userId={user.id}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
